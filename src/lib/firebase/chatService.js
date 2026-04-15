import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { ensureAuthenticatedUser, firestore } from './firebase';

const MESSAGES_COLLECTION = 'messages';

function messagesRef() {
  return collection(firestore, MESSAGES_COLLECTION);
}

function normalizeMessage(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    text: String(data.text || '').trim(),
    imageUrl: String(data.imageUrl || '').trim(),
    userId: String(data.userId || '').trim(),
    senderRole: String(data.senderRole || '').trim() || 'customer',
    threadId: String(data.threadId || '').trim(),
    createdAt: data.createdAt || null,
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

export async function sendMessage(text, options = {}) {
  const user = await requireAuthUser();
  const safeText = String(text || '').trim();

  if (!safeText) {
    throw new Error('Mensagem vazia nao pode ser enviada.');
  }

  await addDoc(messagesRef(), {
    text: safeText,
    userId: user.uid,
    createdAt: serverTimestamp(),
    imageUrl: '',
    senderRole: String(options.senderRole || 'customer') || 'customer',
    threadId: String(options.threadId || user.uid) || user.uid,
  });
}

export async function sendMessageWithImage({ text = '', imageUrl = '', threadId = '', senderRole = 'customer' } = {}) {
  const user = await requireAuthUser();
  const safeText = String(text || '').trim();
  const safeImageUrl = String(imageUrl || '').trim();

  if (!safeText && !safeImageUrl) {
    throw new Error('Mensagem sem texto e sem imagem.');
  }

  await addDoc(messagesRef(), {
    text: safeText,
    userId: user.uid,
    createdAt: serverTimestamp(),
    imageUrl: safeImageUrl,
    senderRole: String(senderRole || 'customer') || 'customer',
    threadId: String(threadId || user.uid) || user.uid,
  });
}

export function listenMessages(onChange, onError) {
  return onSnapshot(
    query(messagesRef(), orderBy('createdAt', 'asc')),
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => normalizeMessage(docSnap));
      console.log('MESSAGES:', messages);
      onChange(messages);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function listenMessagesByThread(threadId, onChange, onError) {
  const safeThreadId = String(threadId || '').trim();

  if (!safeThreadId) {
    throw new Error('threadId obrigatorio para escutar mensagens.');
  }

  return onSnapshot(
    query(messagesRef(), where('threadId', '==', safeThreadId), orderBy('createdAt', 'asc')),
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => normalizeMessage(docSnap));
      console.log('MESSAGES:', messages);
      onChange(messages);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}
