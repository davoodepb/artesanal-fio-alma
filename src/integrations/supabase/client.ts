import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query as firestoreQuery,
  orderBy,
  limit as firestoreLimit,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { firestore, firebaseApp, firebaseAuth, firebaseStorageBucket } from '@/integrations/firebase/client';

const STORAGE_UPLOAD_TIMEOUT_MS = 120_000;

type Filter =
  | { op: 'eq'; column: string; value: any }
  | { op: 'lte'; column: string; value: any }
  | { op: 'gte'; column: string; value: any }
  | { op: 'in'; column: string; value: any[] }
  | { op: 'or'; value: string };

type Order = { column: string; ascending: boolean };

const tableAliases: Record<string, string[]> = {
  categories: ['categorias', 'categories'],
  products: ['produtos', 'products'],
  orders: ['encomendas', 'orders', 'pedidos'],
  order_items: ['itens_encomenda', 'order_items', 'orderItems'],
  profiles: ['perfis', 'profiles'],
  announcements: ['anuncios', 'announcements', 'ads'],
  chat_conversations: ['conversas_chat', 'chat_conversations', 'chatConversations'],
  chat_messages: ['mensagens_chat', 'chat_messages', 'chatMessages'],
  site_settings: ['definicoes_site', 'site_settings'],
  seasonal_themes: ['temas_sazonais', 'seasonal_themes'],
  newsletter_subscribers: ['subscritores_newsletter', 'newsletter_subscribers'],
};

function normalizeTableNames(table: string) {
  return tableAliases[table] || [table];
}

function applyFilters(rows: any[], filters: Filter[]) {
  return rows.filter((row) => {
    return filters.every((f) => {
      const val = row[f.column];
      if (f.op === 'eq') return val === f.value;
      if (f.op === 'lte') return Number(val) <= Number(f.value);
      if (f.op === 'gte') return Number(val) >= Number(f.value);
      if (f.op === 'in') return f.value.includes(val);
      if (f.op === 'or') {
        const parts = String(f.value)
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);

        return parts.some((p) => {
          const m = p.match(/^([a-zA-Z0-9_]+)\.ilike\.%(.*)%$/);
          if (!m) return false;
          const column = m[1];
          const search = String(m[2] || '').toLowerCase();
          return String(row[column] || '').toLowerCase().includes(search);
        });
      }
      return true;
    });
  });
}

function applyOrderAndLimit(rows: any[], ordering: Order[], limitCount?: number) {
  let out = [...rows];
  for (const o of ordering) {
    out = out.sort((a, b) => {
      const av = a[o.column];
      const bv = b[o.column];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return o.ascending ? cmp : -cmp;
    });
  }
  if (typeof limitCount === 'number') {
    out = out.slice(0, limitCount);
  }
  return out;
}

function isFirestoreIndexError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = String((error as { code?: unknown }).code || '');
  const msg = String((error as { message?: unknown }).message || '').toLowerCase();
  return code.includes('failed-precondition') || msg.includes('index');
}

type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

type RealtimeListener = {
  event: RealtimeEventType;
  table: string;
  callback: (payload: { new: any; old: any }) => void;
};

type FirestoreSupabaseChannel = {
  name: string;
  listeners: RealtimeListener[];
  unsubscribers: Array<() => void>;
  on: (
    eventType: 'postgres_changes',
    filter: { event: RealtimeEventType; schema?: string; table: string },
    callback: (payload: { new: any; old: any }) => void
  ) => FirestoreSupabaseChannel;
  subscribe: () => FirestoreSupabaseChannel;
  _start: () => void;
};

async function readTable(table: string, filters: Filter[] = [], ordering: Order[] = [], limitCount?: number) {
  const names = normalizeTableNames(table);
  const all: any[] = [];
  let lastError: unknown = null;

  for (const name of names) {
    try {
      const constraints: any[] = [];

      for (const f of filters) {
        if (f.op === 'eq') constraints.push(where(f.column, '==', f.value));
        if (f.op === 'lte') constraints.push(where(f.column, '<=', f.value));
        if (f.op === 'gte') constraints.push(where(f.column, '>=', f.value));
        if (f.op === 'in' && Array.isArray(f.value) && f.value.length > 0) constraints.push(where(f.column, 'in', f.value));
      }

      for (const o of ordering) {
        constraints.push(orderBy(o.column, o.ascending ? 'asc' : 'desc'));
      }

      if (typeof limitCount === 'number') {
        constraints.push(firestoreLimit(limitCount));
      }

      const q = constraints.length > 0
        ? firestoreQuery(collection(firestore, name), ...constraints)
        : collection(firestore, name);

      const snap = await getDocs(q as any);
      all.push(...snap.docs.map((d) => ({ id: d.id, ...d.data(), __collection: name })));
    } catch (error) {
      // Fallback for missing Firestore composite indexes: read collection and filter client-side.
      if (isFirestoreIndexError(error)) {
        try {
          const rawSnap = await getDocs(collection(firestore, name));
          all.push(...rawSnap.docs.map((d) => ({ id: d.id, ...d.data(), __collection: name })));
          continue;
        } catch (fallbackError) {
          lastError = fallbackError;
          continue;
        }
      }
      lastError = error;
    }
  }

  if (all.length === 0 && lastError) {
    throw lastError;
  }

  return all;
}

class FirestoreSupabaseQuery {
  table: string;
  mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  filters: Filter[] = [];
  ordering: Order[] = [];
  limitCount?: number;
  singleMode: 'single' | 'maybeSingle' | null = null;
  selectOptions: any = {};
  payload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns = '*', options: any = {}) {
    if (this.mode === 'insert' || this.mode === 'update' || this.mode === 'upsert') {
      // Keep write mode to emulate Supabase's insert(...).select(...)
    } else {
      this.mode = 'select';
    }
    this.selectOptions = options;
    return this;
  }

  eq(column: string, value: any) { this.filters.push({ op: 'eq', column, value }); return this; }
  lte(column: string, value: any) { this.filters.push({ op: 'lte', column, value }); return this; }
  gte(column: string, value: any) { this.filters.push({ op: 'gte', column, value }); return this; }
  in(column: string, value: any[]) { this.filters.push({ op: 'in', column, value }); return this; }
  or(value: string) { this.filters.push({ op: 'or', value }); return this; }
  order(column: string, opts: { ascending?: boolean } = {}) {
    this.ordering.push({ column, ascending: opts.ascending !== false });
    return this;
  }
  limit(n: number) { this.limitCount = n; return this; }

  insert(payload: any) { this.mode = 'insert'; this.payload = payload; return this; }
  update(payload: any) { this.mode = 'update'; this.payload = payload; return this; }
  delete() { this.mode = 'delete'; return this; }
  upsert(payload: any) { this.mode = 'upsert'; this.payload = payload; return this; }

  single() { this.singleMode = 'single'; return this; }
  maybeSingle() { this.singleMode = 'maybeSingle'; return this; }

  async execute() {
    try {
      if (this.mode === 'insert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        const created: any[] = [];
        const tableCandidates = normalizeTableNames(this.table);
        for (const row of rows) {
          const payload = {
            ...row,
            created_at: row?.created_at || new Date().toISOString(),
          };
          let ref: any = null;
          let insertErr: unknown = null;

          for (const table of tableCandidates) {
            try {
              ref = await addDoc(collection(firestore, table), payload);
              break;
            } catch (error) {
              insertErr = error;
            }
          }

          if (!ref) throw insertErr || new Error('Insert failed');
          created.push({ id: ref.id, ...payload });
        }
        if (this.singleMode === 'single') return { data: created[0] || null, error: null };
        return { data: created, error: null };
      }

      const serverFilters = this.filters.filter((f) => f.op !== 'or');
      const source = await readTable(this.table, serverFilters, this.ordering, this.limitCount);
      const filtered = applyOrderAndLimit(applyFilters(source, this.filters), this.ordering, this.limitCount);

      if (this.mode === 'update' || this.mode === 'upsert') {
        const updated: any[] = [];
        for (const row of filtered) {
          const col = row.__collection || normalizeTableNames(this.table)[0];
          const dref = doc(firestore, col, row.id);
          await updateDoc(dref, this.payload);
          updated.push({ ...row, ...this.payload });
        }

        if (this.mode === 'upsert' && updated.length === 0 && this.payload) {
          const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
          const created: any[] = [];
          const tableCandidates = normalizeTableNames(this.table);
          for (const row of rows) {
            let ref: any = null;
            let insertErr: unknown = null;

            for (const table of tableCandidates) {
              try {
                ref = await addDoc(collection(firestore, table), row);
                break;
              } catch (error) {
                insertErr = error;
              }
            }

            if (!ref) throw insertErr || new Error('Upsert insert failed');
            created.push({ id: ref.id, ...row });
          }
          if (this.singleMode === 'single') return { data: created[0] || null, error: null };
          return { data: created, error: null };
        }

        if (this.singleMode === 'single') return { data: updated[0] || null, error: null };
        return { data: updated, error: null };
      }

      if (this.mode === 'delete') {
        for (const row of filtered) {
          const col = row.__collection || normalizeTableNames(this.table)[0];
          await deleteDoc(doc(firestore, col, row.id));
        }
        return { data: null, error: null };
      }

      let out = filtered.map((r) => {
        const { __collection, ...clean } = r;
        return clean;
      });

      const count = this.selectOptions?.count === 'exact' ? out.length : null;
      if (this.selectOptions?.head) {
        return { data: null, error: null, count };
      }

      if (this.singleMode === 'single') return { data: out[0] || null, error: out.length ? null : new Error('No rows'), count };
      if (this.singleMode === 'maybeSingle') return { data: out[0] || null, error: null, count };

      return { data: out, error: null, count };
    } catch (error: any) {
      return { data: null, error, count: null };
    }
  }

  then(resolve: any, reject: any) {
    return this.execute().then(resolve, reject);
  }
}

function buildPublicUrl(path: string) {
  const fullPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseStorageBucket}/o/${fullPath}?alt=media`;
}

async function uploadResumableWithTimeout(storage: ReturnType<typeof getStorage>, path: string, file: File, contentType?: string) {
  return new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(
      storageRef(storage, path),
      file,
      { contentType: contentType || file.type || 'application/octet-stream' }
    );

    const timeout = globalThis.setTimeout(() => {
      task.cancel();
      reject(new Error('Upload demorou demasiado tempo. Verifique Firebase Storage.'));
    }, STORAGE_UPLOAD_TIMEOUT_MS);

    task.on(
      'state_changed',
      undefined,
      (error) => {
        globalThis.clearTimeout(timeout);
        reject(error);
      },
      () => {
        globalThis.clearTimeout(timeout);
        resolve();
      }
    );
  });
}

async function ensureAdminForModeration() {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Utilizador não autenticado.');
  }

  const tokenResult = await user.getIdTokenResult();
  if (tokenResult.claims?.admin === true) {
    return;
  }

  const profile = (
    await readTable('profiles', [{ op: 'eq', column: 'user_id', value: user.uid }], [], 1)
  )[0] || null;

  const role = String(profile?.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'owner') {
    throw new Error('Permissão negada para ação administrativa.');
  }
}

function createRealtimeChannel(name: string): FirestoreSupabaseChannel {
  const channel: FirestoreSupabaseChannel = {
    name,
    listeners: [],
    unsubscribers: [],
    on(eventType, filter, callback) {
      if (eventType !== 'postgres_changes') return channel;
      channel.listeners.push({ event: filter.event, table: filter.table, callback });
      return channel;
    },
    subscribe() {
      channel._start();
      return channel;
    },
    _start() {
      for (const listener of channel.listeners) {
        const tableNames = normalizeTableNames(listener.table);
        for (const tableName of tableNames) {
          const docsState = new Map<string, any>();
          let initialized = false;

          const unsubscribe = onSnapshot(
            collection(firestore, tableName),
            (snapshot) => {
              for (const change of snapshot.docChanges()) {
                const id = change.doc.id;
                const incoming = { id, ...change.doc.data() };
                const previous = docsState.get(id) || null;

                if (change.type === 'added') {
                  docsState.set(id, incoming);
                  if (!initialized) continue;
                  if (listener.event === 'INSERT') {
                    listener.callback({ new: incoming, old: null });
                  }
                  continue;
                }

                if (change.type === 'modified') {
                  docsState.set(id, incoming);
                  if (listener.event === 'UPDATE') {
                    listener.callback({ new: incoming, old: previous });
                  }
                  continue;
                }

                if (change.type === 'removed') {
                  docsState.delete(id);
                  if (listener.event === 'DELETE') {
                    listener.callback({ new: null, old: previous });
                  }
                }
              }

              if (!initialized) {
                initialized = true;
              }
            },
            () => {
              // No-op: UI already has polling fallbacks and explicit retry actions.
            }
          );

          channel.unsubscribers.push(unsubscribe);
        }
      }
    },
  };

  return channel;
}

export const supabase: any = {
  from: (table: string) => new FirestoreSupabaseQuery(table),
  rpc: async (name: string, params: any = {}) => {
    try {
      if (name === 'decrement_stock') {
        const { product_id, amount } = params;
        const rows = await readTable('products');
        const target = rows.find((r) => r.id === product_id || r.id === String(product_id));
        if (!target) return { data: null, error: null };
        const col = target.__collection || 'products';
        await updateDoc(doc(firestore, col, target.id), { stock: Math.max(0, Number(target.stock || 0) - Number(amount || 0)) });
      }

      if (name === 'admin_delete_chat_message') {
        await ensureAdminForModeration();
        const { message_id } = params;
        if (!message_id) throw new Error('message_id é obrigatório.');

        const rows = await readTable('chat_messages', [{ op: 'eq', column: 'id', value: message_id }], [], 1);
        const target = rows[0];
        if (!target) return { data: null, error: null };

        const col = target.__collection || normalizeTableNames('chat_messages')[0];
        await deleteDoc(doc(firestore, col, target.id));
      }

      if (name === 'admin_clear_conversation') {
        await ensureAdminForModeration();
        const { conv_id } = params;
        if (!conv_id) throw new Error('conv_id é obrigatório.');

        const messages = await readTable('chat_messages', [{ op: 'eq', column: 'conversation_id', value: conv_id }]);
        await Promise.all(
          messages.map((msg) => {
            const col = msg.__collection || normalizeTableNames('chat_messages')[0];
            return deleteDoc(doc(firestore, col, msg.id));
          })
        );
      }

      if (name === 'admin_close_conversation') {
        await ensureAdminForModeration();
        const { conv_id, new_status } = params;
        if (!conv_id) throw new Error('conv_id é obrigatório.');

        const convs = await readTable('chat_conversations', [{ op: 'eq', column: 'id', value: conv_id }], [], 1);
        const target = convs[0];
        if (!target) return { data: null, error: null };

        const col = target.__collection || normalizeTableNames('chat_conversations')[0];
        await updateDoc(doc(firestore, col, target.id), {
          status: new_status || 'closed',
          updated_at: new Date().toISOString(),
        });
      }

      if (name === 'admin_block_user') {
        await ensureAdminForModeration();
        const { target_user_id, block } = params;
        if (!target_user_id) throw new Error('target_user_id é obrigatório.');

        const profilesByUser = await readTable('profiles', [{ op: 'eq', column: 'user_id', value: target_user_id }], [], 1);
        const byUser = profilesByUser[0];

        if (byUser) {
          const col = byUser.__collection || normalizeTableNames('profiles')[0];
          await updateDoc(doc(firestore, col, byUser.id), {
            blocked: !!block,
            updated_at: new Date().toISOString(),
          });
        } else {
          const tableCandidates = normalizeTableNames('profiles');
          let updated = false;
          for (const table of tableCandidates) {
            try {
              await updateDoc(doc(firestore, table, target_user_id), {
                blocked: !!block,
                updated_at: new Date().toISOString(),
              });
              updated = true;
              break;
            } catch {
              // try next alias
            }
          }

          if (!updated) {
            throw new Error('Perfil do utilizador não encontrado para bloqueio.');
          }
        }
      }

      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },
  channel: (name: string) => createRealtimeChannel(name),
  removeChannel: (channel: FirestoreSupabaseChannel | undefined) => {
    if (!channel?.unsubscribers?.length) return;
    for (const unsubscribe of channel.unsubscribers) {
      try {
        unsubscribe();
      } catch {
        // ignore cleanup failures
      }
    }
    channel.unsubscribers = [];
  },
  functions: { invoke: async () => ({ data: { ok: true }, error: null }) },
  auth: {
    getSession: async () => {
      const user = firebaseAuth.currentUser;
      if (!user) return { data: { session: null }, error: null };
      const access_token = await user.getIdToken();
      return { data: { session: { user: { id: user.uid, email: user.email }, access_token } }, error: null };
    },
    signOut: async () => ({ error: null }),
    verifyOtp: async () => ({ error: null }),
    resend: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (
        path: string,
        file: File,
        options?: { cacheControl?: string; upsert?: boolean; contentType?: string }
      ) => {
        try {
          const storage = getStorage(firebaseApp);
          const full = `${bucket}/${path}`;
          await uploadResumableWithTimeout(storage, full, file, options?.contentType);
          return { data: { path: full }, error: null };
        } catch (error: any) {
          return { data: null, error };
        }
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: buildPublicUrl(`${bucket}/${path}`) },
      }),
      list: async () => ({ data: [], error: null }),
    }),
  },
};