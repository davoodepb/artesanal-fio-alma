import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { ensureAuthenticatedUser, firestore } from './firebase';

const CHAT_COLLECTION_CANDIDATES = ['messages', 'chatMessages', 'chat_messages', 'mensagens_chat'];
const CHAT_CONVERSATION_CANDIDATES = ['chat_conversations', 'chatConversations', 'conversas_chat'];

function isLegacyCollection(collectionName) {
  return collectionName === 'chat_messages' || collectionName === 'mensagens_chat';
}

function getMessagesRef(collectionName = 'messages') {
  return collection(firestore, collectionName);
}

function getConversationRef(collectionName, conversationId) {
  return doc(firestore, collectionName, conversationId);
}

function normalizeText(rawText) {
  return String(rawText || '').trim();
}

function normalizeChatDoc(raw, id) {
  const text = normalizeText(raw?.text) || normalizeText(raw?.content);
  const imageUrl = normalizeText(raw?.imageUrl) || normalizeText(raw?.image_url) || normalizeText(raw?.file_url);
  const userId = normalizeText(raw?.userId) || normalizeText(raw?.user_id) || normalizeText(raw?.sender_id);
  const senderRole = normalizeText(raw?.senderRole) || normalizeText(raw?.sender_role) || 'customer';
  const threadId =
    normalizeText(raw?.threadId) ||
    normalizeText(raw?.thread_id) ||
    normalizeText(raw?.conversation_id) ||
    normalizeText(raw?.customer_id) ||
    userId;
  const targetUserId =
    normalizeText(raw?.targetUserId) ||
    normalizeText(raw?.target_user_id) ||
    normalizeText(raw?.receiver_id) ||
    '';

  return {
    id,
    ...raw,
    text,
    imageUrl,
    userId,
    senderRole,
    threadId,
    targetUserId,
    createdAt: raw?.createdAt || raw?.created_at || raw?.timestamp || null,
  };
}

function isPermissionDenied(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code.includes('permission-denied') || message.includes('permission') || message.includes('insufficient');
}

function canFallback(error) {
  if (isPermissionDenied(error)) return true;
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code.includes('failed-precondition') ||
    code.includes('invalid-argument') ||
    message.includes('index') ||
    message.includes('requires an index')
  );
}

async function ensureConversationForCustomerThread(threadId, authUser) {
  const safeThreadId = normalizeText(threadId);
  if (!safeThreadId || !authUser?.uid || safeThreadId !== authUser.uid) return;

  const payload = {
    customer_id: safeThreadId,
    customerId: safeThreadId,
    status: 'active',
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp(),
    created_at: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await Promise.all(
    CHAT_CONVERSATION_CANDIDATES.map(async (conversationCollection) => {
      try {
        await setDoc(getConversationRef(conversationCollection, safeThreadId), payload, { merge: true });
      } catch {
        // Best effort only: some projects may not expose all aliases.
      }
    })
  );
}

function buildPayloadForCollection(basePayload, collectionName) {
  if (!isLegacyCollection(collectionName)) {
    return {
      text: basePayload.text,
      imageUrl: basePayload.imageUrl,
      userId: basePayload.userId,
      senderRole: basePayload.senderRole,
      threadId: basePayload.threadId,
      targetUserId: basePayload.targetUserId,
      createdAt: serverTimestamp(),
    };
  }

  return {
    content: basePayload.text,
    text: basePayload.text,
    image_url: basePayload.imageUrl,
    imageUrl: basePayload.imageUrl,
    sender_id: basePayload.userId,
    sender_role: basePayload.senderRole,
    conversation_id: basePayload.threadId,
    target_user_id: basePayload.targetUserId,
    user_id: basePayload.userId,
    threadId: basePayload.threadId,
    created_at: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
}

async function addDocWithFallback(basePayload) {
  let lastError = null;

  for (const collectionName of CHAT_COLLECTION_CANDIDATES) {
    try {
      const payload = buildPayloadForCollection(basePayload, collectionName);
      return await addDoc(getMessagesRef(collectionName), payload);
    } catch (error) {
      lastError = error;
      if (!canFallback(error)) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Nao foi possivel gravar mensagem em nenhuma colecao de chat.');
}

/**
 * Envia mensagem de texto para a colecao messages.
 */
export async function sendMessage(text, options = {}) {
  try {
    const user = await ensureAuthenticatedUser();
    const safeText = normalizeText(text);
    const senderRole = normalizeText(options.senderRole || 'customer') || 'customer';
    const threadId = senderRole === 'customer' ? user.uid : normalizeText(options.threadId || user.uid) || user.uid;
    const targetUserId = normalizeText(options.targetUserId || '');

    if (!safeText) {
      throw new Error('Mensagem vazia nao pode ser enviada.');
    }

    await ensureConversationForCustomerThread(threadId, user);

    await addDocWithFallback({
      text: safeText,
      imageUrl: '',
      userId: user.uid,
      senderRole,
      threadId,
      targetUserId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Envia mensagem com imagem opcional associada.
 */
export async function sendMessageWithImage({ text = '', imageUrl = '', threadId = '', senderRole = 'customer', targetUserId = '' } = {}) {
  try {
    const user = await ensureAuthenticatedUser();
    const safeText = normalizeText(text);
    const safeImage = normalizeText(imageUrl);
    const safeSenderRole = normalizeText(senderRole || 'customer') || 'customer';
    const safeThreadId = safeSenderRole === 'customer' ? user.uid : normalizeText(threadId || user.uid) || user.uid;
    const safeTargetUserId = normalizeText(targetUserId);

    if (!safeText && !safeImage) {
      throw new Error('Mensagem sem texto e sem imagem.');
    }

    await ensureConversationForCustomerThread(safeThreadId, user);

    await addDocWithFallback({
      text: safeText,
      imageUrl: safeImage,
      userId: user.uid,
      senderRole: safeSenderRole,
      threadId: safeThreadId,
      targetUserId: safeTargetUserId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
}

function startSnapshotWithAuth(buildQueryForCollection, onChange, onError) {
  let unsubscribe = () => {};
  let disposed = false;

  const startForCollection = (index, authUser) => {
    if (disposed) return;
    if (index >= CHAT_COLLECTION_CANDIDATES.length) {
      if (onError) {
        onError(new Error('Nao foi possivel ler mensagens em nenhuma colecao de chat.'));
      }
      return;
    }

    const currentCollection = CHAT_COLLECTION_CANDIDATES[index];
    const q = buildQueryForCollection(currentCollection, authUser);

    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => ({
          ...normalizeChatDoc(doc.data(), doc.id),
        }));
        onChange(messages);
      },
      (error) => {
        if (canFallback(error)) {
          startForCollection(index + 1, authUser);
          return;
        }

        if (onError) onError(error);
      }
    );
  };

  const boot = async () => {
    try {
      const authUser = await ensureAuthenticatedUser();
      if (disposed) return;

      startForCollection(0, authUser);
    } catch (error) {
      if (onError) onError(error);
    }
  };

  boot();

  return () => {
    disposed = true;
    unsubscribe();
  };
}

/**
 * Listener realtime global para admin.
 */
export function listenMessages(onChange, onError) {
  return startSnapshotWithAuth(
    (collectionName) => {
      if (isLegacyCollection(collectionName)) {
        return query(getMessagesRef(collectionName), orderBy('created_at', 'asc'));
      }

      return query(getMessagesRef(collectionName), orderBy('createdAt', 'asc'));
    },
    onChange,
    onError
  );
}

/**
 * Listener realtime por thread para cliente.
 */
export function listenMessagesByThread(threadId, onChange, onError) {
  const safeThreadId = normalizeText(threadId);
  if (!safeThreadId) {
    throw new Error('threadId obrigatorio para escutar mensagens.');
  }

  return startSnapshotWithAuth(
    (collectionName, authUser) => {
      const authThreadId = normalizeText(authUser?.uid);
      const resolvedThreadId = authThreadId || safeThreadId;

      if (isLegacyCollection(collectionName)) {
        return query(
          getMessagesRef(collectionName),
          where('conversation_id', '==', resolvedThreadId),
          orderBy('created_at', 'asc')
        );
      }

      return query(getMessagesRef(collectionName), where('threadId', '==', safeThreadId), orderBy('createdAt', 'asc'));
    },
    onChange,
    onError
  );
}
