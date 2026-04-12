import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
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

async function readTable(table: string) {
  const names = normalizeTableNames(table);
  const all: any[] = [];

  for (const name of names) {
    const snap = await getDocs(collection(firestore, name));
    all.push(...snap.docs.map((d) => ({ id: d.id, ...d.data(), __collection: name })));
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
        const table = normalizeTableNames(this.table)[0];
        for (const row of rows) {
          const payload = {
            ...row,
            created_at: row?.created_at || new Date().toISOString(),
          };
          const ref = await addDoc(collection(firestore, table), payload);
          created.push({ id: ref.id, ...payload });
        }
        if (this.singleMode === 'single') return { data: created[0] || null, error: null };
        return { data: created, error: null };
      }

      const source = await readTable(this.table);
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
          const table = normalizeTableNames(this.table)[0];
          for (const row of rows) {
            const ref = await addDoc(collection(firestore, table), row);
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
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
  removeChannel: () => undefined,
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