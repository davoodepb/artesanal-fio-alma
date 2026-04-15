import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ensureAuthenticatedUser, firestore } from './firebase';

const usersRef = collection(firestore, 'users');

function normalizeRole(rawRole) {
  const role = String(rawRole || '').toLowerCase();
  return role === 'admin' ? 'admin' : 'user';
}

export async function ensureUserDocument(user, fallbackRole = 'user') {
  const authUser = user || (await ensureAuthenticatedUser());
  const userRef = doc(firestore, 'users', authUser.uid);
  const snap = await getDoc(userRef);
  const role = normalizeRole((snap.exists() && snap.data()?.role) || fallbackRole);

  const payload = {
    uid: authUser.uid,
    name: authUser.displayName || authUser.email || 'Utilizador',
    email: authUser.email || '',
    role,
    isBlocked: Boolean(snap.exists() ? snap.data()?.isBlocked : false),
    isOnline: true,
    lastSeen: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, payload, { merge: true });
  return payload;
}

export async function updatePresence(isOnline) {
  const authUser = await ensureAuthenticatedUser();
  const userRef = doc(firestore, 'users', authUser.uid);

  await setDoc(
    userRef,
    {
      uid: authUser.uid,
      name: authUser.displayName || authUser.email || 'Utilizador',
      email: authUser.email || '',
      role: 'user',
      isBlocked: false,
      isOnline: Boolean(isOnline),
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getCurrentUserFlags() {
  const authUser = await ensureAuthenticatedUser();
  const userRef = doc(firestore, 'users', authUser.uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : {};

  return {
    uid: authUser.uid,
    role: normalizeRole(data?.role),
    isBlocked: Boolean(data?.isBlocked),
  };
}

export function subscribeCurrentUser(uid, onChange, onError) {
  const userRef = doc(firestore, 'users', uid);
  return onSnapshot(
    userRef,
    (snapshot) => {
      onChange(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export function subscribeUsers(onChange, onError) {
  const q = query(usersRef);
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(users);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export async function fetchUsersByIds(userIds) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const map = {};
  const snapshots = await Promise.all(uniqueIds.map((uid) => getDoc(doc(firestore, 'users', uid))));
  snapshots.forEach((snap) => {
    if (!snap.exists()) return;
    map[snap.id] = { id: snap.id, ...snap.data() };
  });

  return map;
}

export async function setUserBlocked(targetUserId, isBlocked) {
  const authUser = await ensureAuthenticatedUser();
  const tokenResult = await authUser.getIdTokenResult();
  const hardcodedAdminUid = '5efzvBMxHXOBkQMU8VcVLXBX8QS2';
  const adminRef = doc(firestore, 'users', authUser.uid);
  const adminSnap = await getDoc(adminRef);
  const adminData = adminSnap.exists() ? adminSnap.data() : null;
  const isAdminByToken = tokenResult?.claims?.admin === true || authUser.uid === hardcodedAdminUid;
  const isAdminByRole = !!adminData && normalizeRole(adminData.role) === 'admin';

  if (!isAdminByToken && !isAdminByRole) {
    throw new Error('Permissao negada. Apenas admin pode bloquear utilizadores.');
  }

  await setDoc(
    doc(firestore, 'users', targetUserId),
    {
      uid: targetUserId,
      role: 'user',
      isBlocked: Boolean(isBlocked),
      isOnline: false,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function listUsersOnce() {
  const snap = await getDocs(usersRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
