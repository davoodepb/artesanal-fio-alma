import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { ensureAuthenticatedUser, firestore } from './firebase';

const MESSAGE_COLLECTIONS = ['mensagens_chat', 'chat_messages', 'chatMessages', 'messages'];
const CONVERSATION_COLLECTIONS = ['conversas_chat', 'chat_conversations'];
const IMAGE_PREFIX = '[image:';
const IMAGE_SUFFIX = ']';

function messagesRef(collectionName) {
  return collection(firestore, collectionName);
}

function conversationsRef(collectionName) {
  return collection(firestore, collectionName);
}

function parseContent(content) {
  const safeContent = String(content || '').trim();
  if (safeContent.startsWith(IMAGE_PREFIX) && safeContent.endsWith(IMAGE_SUFFIX)) {
    const imageUrl = safeContent.slice(IMAGE_PREFIX.length, -IMAGE_SUFFIX.length);
    return { text: '', imageUrl: String(imageUrl || '').trim() };
  }
  return { text: safeContent, imageUrl: '' };
}

function normalizeMessage(docSnap) {
  const data = docSnap.data() || {};
  const content = String(data.content || '').trim();
  const parsed = parseContent(content);
  const fallbackText = String(data.text || '').trim();
  const fallbackImage = String(data.imageUrl || data.image_url || '').trim();

  return {
    id: docSnap.id,
    text: parsed.text || fallbackText,
    imageUrl: parsed.imageUrl || fallbackImage,
    userId: String(data.userId || data.user_id || data.sender_id || '').trim(),
    senderRole: String(data.senderRole || data.sender_role || '').trim() || 'customer',
    threadId: String(data.threadId || data.thread_id || data.conversation_id || '').trim(),
    createdAt: data.createdAt || data.created_at || null,
    conversationId: String(data.conversation_id || data.threadId || '').trim(),
  };
}

async function requireAuthUser() {
  const user = await ensureAuthenticatedUser();
  console.log('AUTH USER:', user);

  if (!user?.uid) {
    throw new Error('Utilizador nao autenticado. Operacao bloqueada.');
  }

  return user;
}

async function findConversation(userId) {
  const safeUserId = String(userId || '').trim();
  if (!safeUserId) return null;

  const fields = ['customer_id', 'customerId', 'userId', 'user_id'];
  for (const collectionName of CONVERSATION_COLLECTIONS) {
    for (const field of fields) {
      try {
        const q = query(conversationsRef(collectionName), where(field, '==', safeUserId), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          return { id: docSnap.id, ...docSnap.data(), __collection: collectionName };
        }
      } catch {
        // Try next field/collection.
      }
    }
  }

  return null;
}

export async function ensureConversationForUser(userId) {
  const authUser = await requireAuthUser();
  const safeUserId = String(userId || authUser.uid).trim();
  if (!safeUserId || safeUserId !== authUser.uid) {
    throw new Error('Utilizador invalido para criar conversa.');
  }

  const existing = await findConversation(safeUserId);
  if (existing) return existing;

  const payload = {
    customer_id: safeUserId,
    customerId: safeUserId,
    userId: safeUserId,
    user_id: safeUserId,
    status: 'active',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const primary = CONVERSATION_COLLECTIONS[0];
  const ref = await addDoc(conversationsRef(primary), payload);
  return { id: ref.id, ...payload, __collection: primary };
}

export async function sendMessage(text, options = {}) {
  const user = await requireAuthUser();
  const safeText = String(text || '').trim();
  const senderRole = String(options.senderRole || 'customer') || 'customer';
  const conversationId = String(options.conversationId || options.threadId || '').trim();

  if (!safeText) {
    throw new Error('Mensagem vazia nao pode ser enviada.');
  }

  if (!conversationId) {
    throw new Error('conversationId obrigatorio para enviar mensagem.');
  }

  const payload = {
    content: safeText,
    text: safeText,
    imageUrl: '',
    userId: user.uid,
    user_id: user.uid,
    sender_id: user.uid,
    senderRole,
    sender_role: senderRole,
    threadId: conversationId,
    conversation_id: conversationId,
    createdAt: serverTimestamp(),
    created_at: serverTimestamp(),
    is_read: senderRole === 'customer' ? false : true,
  };

  await addDoc(messagesRef(MESSAGE_COLLECTIONS[0]), payload);
}

export async function sendMessageWithImage({ text = '', imageUrl = '', conversationId = '', threadId = '', senderRole = 'customer' } = {}) {
  const user = await requireAuthUser();
  const safeText = String(text || '').trim();
  const safeImageUrl = String(imageUrl || '').trim();
  const safeConversationId = String(conversationId || threadId || '').trim();
  const safeSenderRole = String(senderRole || 'customer') || 'customer';

  if (!safeText && !safeImageUrl) {
    throw new Error('Mensagem sem texto e sem imagem.');
  }

  if (!safeConversationId) {
    throw new Error('conversationId obrigatorio para enviar imagem.');
  }

  const content = safeImageUrl
    ? `${IMAGE_PREFIX}${safeImageUrl}${IMAGE_SUFFIX}`
    : safeText;

  const payload = {
    content,
    text: safeText,
    imageUrl: safeImageUrl,
    image_url: safeImageUrl,
    userId: user.uid,
    user_id: user.uid,
    sender_id: user.uid,
    senderRole: safeSenderRole,
    sender_role: safeSenderRole,
    threadId: safeConversationId,
    conversation_id: safeConversationId,
    createdAt: serverTimestamp(),
    created_at: serverTimestamp(),
    is_read: safeSenderRole === 'customer' ? false : true,
  };

  await addDoc(messagesRef(MESSAGE_COLLECTIONS[0]), payload);
}

export function listenMessagesByConversation(conversationId, onChange, onError) {
  const safeConversationId = String(conversationId || '').trim();

  if (!safeConversationId) {
    throw new Error('conversationId obrigatorio para escutar mensagens.');
  }

  let unsubscribe = () => {};
  let disposed = false;

  const tryStart = (index) => {
    if (disposed) return;
    if (index >= MESSAGE_COLLECTIONS.length) {
      if (onError) onError(new Error('Nao foi possivel escutar mensagens do chat.'));
      return;
    }

    const collectionName = MESSAGE_COLLECTIONS[index];
    const isLegacy = collectionName === 'messages';
    const fieldName = isLegacy ? 'threadId' : 'conversation_id';
    const orderField = isLegacy ? 'createdAt' : 'created_at';

    try {
      const q = query(messagesRef(collectionName), where(fieldName, '==', safeConversationId), orderBy(orderField, 'asc'));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messages = snapshot.docs.map((docSnap) => normalizeMessage(docSnap));
          onChange(messages);
        },
        (error) => {
          if (error) {
            tryStart(index + 1);
          }
        }
      );
    } catch (error) {
      tryStart(index + 1);
    }
  };

  tryStart(0);

  return () => {
    disposed = true;
    unsubscribe();
  };
}
