import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
  QueryConstraint,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, UploadMetadata } from 'firebase/storage';
import { firestore, firebaseApp, firebaseAuth, firebaseStorageBucket } from '@/integrations/firebase/client';

/* ──────────────────────────────────────────────────────────
 * Supabase-compatible shim backed by Firebase / Firestore
 * ────────────────────────────────────────────────────────── */

// ── Types ──────────────────────────────────────────────

type Filter =
  | { op: 'eq'; column: string; value: any }
  | { op: 'neq'; column: string; value: any }
  | { op: 'lte'; column: string; value: any }
  | { op: 'gte'; column: string; value: any }
  | { op: 'in'; column: string; value: any[] }
  | { op: 'or'; value: string };

type SortOrder = { column: string; ascending: boolean };

// ── Collection aliases ────────────────────────────────

const tableAliases: Record<string, string[]> = {
  categories: ['categorias', 'categories'],
  products: ['produtos', 'products'],
  orders: ['encomendas', 'orders'],
  order_items: ['itens_encomenda', 'order_items'],
  profiles: ['perfis', 'profiles'],
  reviews: ['reviews'],
  announcements: ['anuncios', 'announcements', 'ads'],
  chat_conversations: ['conversas_chat', 'chat_conversations'],
  chat_messages: ['mensagens_chat', 'chat_messages'],
  site_settings: ['definicoes_site', 'site_settings'],
  seasonal_themes: ['temas_sazonais', 'seasonal_themes'],
  newsletter_subscribers: ['subscritores_newsletter', 'newsletter_subscribers'],
};

function normalizeTableNames(table: string): string[] {
  return tableAliases[table] || [table];
}

// ── Query helpers ────────────────────────────────────

function applyFilters(rows: any[], filters: Filter[]): any[] {
  return rows.filter((row) =>
    filters.every((f) => {
      if (f.op === 'or') {
        const parts = String(f.value).split(',').map((p) => p.trim()).filter(Boolean);
        return parts.some((p) => {
          const m = p.match(/^([a-zA-Z0-9_]+)\.ilike\.%(.*)%$/);
          if (!m) return false;
          return String(row[m[1]] || '').toLowerCase().includes(String(m[2] || '').toLowerCase());
        });
      }
      const val = row[f.column];
      switch (f.op) {
        case 'eq': return val === f.value;
        case 'neq': return val !== f.value;
        case 'lte': return Number(val) <= Number(f.value);
        case 'gte': return Number(val) >= Number(f.value);
        case 'in': return Array.isArray(f.value) && f.value.includes(val);
        default: return true;
      }
    }),
  );
}

function applyOrderAndLimit(rows: any[], ordering: SortOrder[], limitCount?: number): any[] {
  let out = [...rows];
  for (const o of ordering) {
    out.sort((a, b) => {
      const av = a[o.column];
      const bv = b[o.column];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return o.ascending ? cmp : -cmp;
    });
  }
  if (typeof limitCount === 'number') out = out.slice(0, limitCount);
  return out;
}

/**
 * Build Firestore QueryConstraints from the shim filters.
 * Firestore allows at most ONE `in` per query, so we only push the first.
 */
function buildFirestoreConstraints(filters: Filter[]): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  let hasInConstraint = false;
  for (const f of filters) {
    if (f.op === 'eq' && f.column && f.value !== undefined && f.value !== null) {
      constraints.push(where(f.column, '==', f.value));
    } else if (f.op === 'in' && !hasInConstraint && Array.isArray(f.value) && f.value.length > 0 && f.value.length <= 30) {
      constraints.push(where(f.column, 'in', f.value));
      hasInConstraint = true;
    }
  }
  return constraints;
}

async function readTable(table: string, filters: Filter[] = []): Promise<any[]> {
  const names = normalizeTableNames(table);
  const all: any[] = [];
  const constraints = buildFirestoreConstraints(filters);

  for (const name of names) {
    try {
      const colRef = collection(firestore, name);
      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
      const snap = await getDocs(q);
      all.push(...snap.docs.map((d) => ({ id: d.id, ...d.data(), __collection: name })));
    } catch {
      if (constraints.length > 0) {
        try {
          const snap = await getDocs(collection(firestore, name));
          all.push(...snap.docs.map((d) => ({ id: d.id, ...d.data(), __collection: name })));
        } catch { /* skip */ }
      }
    }
  }
  return all;
}

// ── Firestore query builder (Supabase-compatible API) ──

class FirestoreSupabaseQuery {
  table: string;
  mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  filters: Filter[] = [];
  ordering: SortOrder[] = [];
  limitCount?: number;
  singleMode: 'single' | 'maybeSingle' | null = null;
  selectOptions: any = {};
  payload: any = null;
  upsertOptions: { onConflict?: string } = {};

  constructor(table: string) { this.table = table; }

  select(_columns = '*', options: any = {}) {
    if (this.mode !== 'insert' && this.mode !== 'update' && this.mode !== 'upsert') this.mode = 'select';
    this.selectOptions = options;
    return this;
  }

  eq(column: string, value: any) { this.filters.push({ op: 'eq', column, value }); return this; }
  neq(column: string, value: any) { this.filters.push({ op: 'neq', column, value }); return this; }
  lte(column: string, value: any) { this.filters.push({ op: 'lte', column, value }); return this; }
  gte(column: string, value: any) { this.filters.push({ op: 'gte', column, value }); return this; }
  in(column: string, value: any[]) { this.filters.push({ op: 'in', column, value }); return this; }
  or(value: string) { this.filters.push({ op: 'or', value } as any); return this; }
  order(column: string, opts: { ascending?: boolean } = {}) { this.ordering.push({ column, ascending: opts.ascending !== false }); return this; }
  limit(n: number) { this.limitCount = n; return this; }

  insert(payload: any) { this.mode = 'insert'; this.payload = payload; return this; }
  update(payload: any) { this.mode = 'update'; this.payload = payload; return this; }
  delete() { this.mode = 'delete'; return this; }
  upsert(payload: any, options?: { onConflict?: string }) { this.mode = 'upsert'; this.payload = payload; this.upsertOptions = options || {}; return this; }

  single() { this.singleMode = 'single'; return this; }
  maybeSingle() { this.singleMode = 'maybeSingle'; return this; }

  async execute() {
    try {
      if (this.mode === 'insert') {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
        const created: any[] = [];
        const tableName = normalizeTableNames(this.table)[0];
        for (const row of rows) {
          const payload: any = { ...row, created_at: row?.created_at || new Date().toISOString() };
          if ((this.table === 'chat_messages' || this.table === 'mensagens_chat') && payload.is_read === undefined) payload.is_read = false;
          if ((this.table === 'chat_conversations' || this.table === 'conversas_chat') && !payload.updated_at) payload.updated_at = payload.created_at;
          if ((this.table === 'orders' || this.table === 'encomendas') && !payload.updated_at) payload.updated_at = payload.created_at;
          const ref = await addDoc(collection(firestore, tableName), payload);
          created.push({ id: ref.id, ...payload });
        }
        if (this.singleMode === 'single') return { data: created[0] || null, error: null };
        return { data: created, error: null };
      }

      const source = await readTable(this.table, this.filters);

      if (this.mode === 'update' || this.mode === 'upsert') {
        const filtered = applyOrderAndLimit(applyFilters(source, this.filters), this.ordering, this.limitCount);
        const updated: any[] = [];

        if (this.mode === 'upsert' && filtered.length === 0 && this.payload) {
          const conflictColumn = this.upsertOptions.onConflict;
          const payloadRows = Array.isArray(this.payload) ? this.payload : [this.payload];
          for (const row of payloadRows) {
            let existing: any = null;
            if (conflictColumn) {
              const conflictValue = row[conflictColumn];
              if (conflictValue !== undefined) existing = source.find((s) => s[conflictColumn] === conflictValue);
            }
            if (existing) {
              const col = existing.__collection || normalizeTableNames(this.table)[0];
              const { __collection, ...cleanPayload } = { ...row };
              await updateDoc(doc(firestore, col, existing.id), cleanPayload);
              updated.push({ ...existing, ...cleanPayload });
            } else {
              const tableName = normalizeTableNames(this.table)[0];
              const insertPayload: any = { ...row, created_at: row?.created_at || new Date().toISOString() };
              const ref = await addDoc(collection(firestore, tableName), insertPayload);
              updated.push({ id: ref.id, ...insertPayload });
            }
          }
          if (this.singleMode === 'single') return { data: updated[0] || null, error: null };
          return { data: updated, error: null };
        }

        for (const row of filtered) {
          const col = row.__collection || normalizeTableNames(this.table)[0];
          const { __collection, ...cleanPayload } = { ...this.payload };
          await updateDoc(doc(firestore, col, row.id), cleanPayload);
          updated.push({ ...row, ...cleanPayload });
        }
        if (this.singleMode === 'single') return { data: updated[0] || null, error: null };
        return { data: updated, error: null };
      }

      if (this.mode === 'delete') {
        const filtered = applyOrderAndLimit(applyFilters(source, this.filters), this.ordering, this.limitCount);
        for (const row of filtered) {
          const col = row.__collection || normalizeTableNames(this.table)[0];
          await deleteDoc(doc(firestore, col, row.id));
        }
        return { data: null, error: null };
      }

      const filtered = applyFilters(source, this.filters);
      const ordered = applyOrderAndLimit(filtered, this.ordering, this.limitCount);
      const count = this.selectOptions?.count === 'exact' ? ordered.length : null;
      if (this.selectOptions?.head) return { data: null, error: null, count };
      const out = ordered.map((r) => { const { __collection, ...clean } = r; return clean; });
      if (this.singleMode === 'single') return { data: out[0] || null, error: out.length ? null : new Error('No rows'), count };
      if (this.singleMode === 'maybeSingle') return { data: out[0] || null, error: null, count };
      return { data: out, error: null, count };
    } catch (error: any) {
      console.error(`[supabase-shim] ${this.mode} on "${this.table}" failed:`, error);
      return { data: null, error, count: null };
    }
  }

  then(resolve: any, reject: any) { return this.execute().then(resolve, reject); }
}

// ── RPC ──

async function rpcHandler(name: string, params: any = {}) {
  try {
    if (name === 'decrement_stock') {
      const productId = params.p_product_id || params.product_id;
      const quantity = Number(params.p_quantity || params.amount || 0);
      if (!productId) return { data: null, error: { message: 'Product ID is required' } };
      const rows = await readTable('products');
      const target = rows.find((r) => r.id === productId || r.id === String(productId));
      if (!target) return { data: null, error: { message: `Produto não encontrado: ${productId}` } };
      const currentStock = Number(target.stock || 0);
      if (currentStock < quantity) return { data: null, error: { message: `Stock insuficiente para "${target.name || productId}". Disponível: ${currentStock}, pedido: ${quantity}` } };
      const colName = target.__collection || 'products';
      const newStock = currentStock - quantity;
      await updateDoc(doc(firestore, colName, target.id), { stock: newStock });
      return { data: { new_stock: newStock }, error: null };
    }

    if (name === 'increment_stock') {
      const productId = params.p_product_id || params.product_id;
      const quantity = Number(params.p_quantity || params.amount || 0);
      if (!productId) return { data: null, error: { message: 'Product ID is required' } };
      const rows = await readTable('products');
      const target = rows.find((r) => r.id === productId || r.id === String(productId));
      if (!target) return { data: null, error: null };
      const colName = target.__collection || 'products';
      const newStock = Number(target.stock || 0) + quantity;
      await updateDoc(doc(firestore, colName, target.id), { stock: newStock });
      return { data: { new_stock: newStock }, error: null };
    }

    if (name === 'admin_delete_chat_message') {
      const messageId = params.message_id;
      if (!messageId) return { data: null, error: { message: 'message_id required' } };
      const msgs = await readTable('chat_messages');
      const target = msgs.find((m) => m.id === messageId);
      if (target) await deleteDoc(doc(firestore, target.__collection || 'chat_messages', target.id));
      return { data: null, error: null };
    }

    if (name === 'admin_clear_conversation') {
      const convId = params.conv_id;
      if (!convId) return { data: null, error: { message: 'conv_id required' } };
      const msgs = await readTable('chat_messages', [{ op: 'eq', column: 'conversation_id', value: convId }]);
      for (const m of msgs.filter((m) => m.conversation_id === convId))
        await deleteDoc(doc(firestore, m.__collection || 'chat_messages', m.id));
      return { data: null, error: null };
    }

    if (name === 'admin_close_conversation') {
      const convId = params.conv_id;
      const newStatus = params.new_status || 'closed';
      if (!convId) return { data: null, error: { message: 'conv_id required' } };
      const convs = await readTable('chat_conversations');
      const target = convs.find((c) => c.id === convId);
      if (target) await updateDoc(doc(firestore, target.__collection || 'chat_conversations', target.id), { status: newStatus });
      return { data: null, error: null };
    }

    if (name === 'admin_block_user') {
      const targetUserId = params.target_user_id;
      const block = params.block !== false;
      if (!targetUserId) return { data: null, error: { message: 'target_user_id required' } };
      const profiles = await readTable('profiles', [{ op: 'eq', column: 'user_id', value: targetUserId }]);
      const target = profiles.find((p) => p.user_id === targetUserId);
      if (target) await updateDoc(doc(firestore, target.__collection || 'profiles', target.id), { is_blocked: block, blocked_at: block ? new Date().toISOString() : null });
      return { data: null, error: null };
    }

    console.warn(`[supabase-shim] Unknown RPC: "${name}"`);
    return { data: null, error: null };
  } catch (error: any) {
    console.error(`[supabase-shim] RPC "${name}" failed:`, error);
    return { data: null, error };
  }
}

// ── Realtime channels ──

interface ChannelCallback { event: string; schema: string; table: string; filter?: string; callback: (payload: any) => void; }

class FirestoreChannel {
  name: string;
  listeners: ChannelCallback[] = [];
  unsubscribers: Unsubscribe[] = [];
  constructor(name: string) { this.name = name; }
  on(_eventType: string, config: { event: string; schema: string; table: string; filter?: string }, callback: (payload: any) => void) {
    this.listeners.push({ event: config.event, schema: config.schema, table: config.table, filter: config.filter, callback });
    return this;
  }
  subscribe(statusCallback?: (status: string) => void) {
    for (const listener of this.listeners) {
      for (const colName of normalizeTableNames(listener.table)) {
        try {
          const colRef = collection(firestore, colName);
          let isFirst = true;
          const unsub = onSnapshot(colRef, (snapshot) => {
            if (isFirst) { isFirst = false; return; }
            for (const change of snapshot.docChanges()) {
              const docData = { id: change.doc.id, ...change.doc.data() };
              if (listener.filter) {
                const fm = listener.filter.match(/^(\w+)=eq\.(.+)$/);
                if (fm && String(docData[fm[1]]) !== fm[2]) continue;
              }
              let eventType: string;
              switch (change.type) { case 'added': eventType = 'INSERT'; break; case 'modified': eventType = 'UPDATE'; break; case 'removed': eventType = 'DELETE'; break; default: continue; }
              if (listener.event !== '*' && listener.event !== eventType) continue;
              listener.callback({ eventType, new: eventType !== 'DELETE' ? docData : {}, old: eventType === 'DELETE' ? docData : {}, table: listener.table, schema: 'public' });
            }
          });
          this.unsubscribers.push(unsub);
        } catch { /* skip */ }
      }
    }
    if (statusCallback) statusCallback('SUBSCRIBED');
    return this;
  }
  unsubscribe() {
    for (const unsub of this.unsubscribers) { try { unsub(); } catch { /* */ } }
    this.unsubscribers = [];
    this.listeners = [];
  }
}

const activeChannels = new Map<string, FirestoreChannel>();

function buildPublicUrl(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseStorageBucket}/o/${encodeURIComponent(path)}?alt=media`;
}

// ── Main export ──

export const supabase: any = {
  from: (table: string) => new FirestoreSupabaseQuery(table),
  rpc: rpcHandler,
  channel: (name: string) => { const ch = new FirestoreChannel(name); activeChannels.set(name, ch); return ch; },
  removeChannel: (channel: any) => {
    if (channel && typeof channel === 'object' && 'unsubscribe' in channel) {
      channel.unsubscribe();
      for (const [key, val] of activeChannels.entries()) { if (val === channel) { activeChannels.delete(key); break; } }
    }
  },
  functions: { invoke: async (fnName: string, options?: { body?: any }) => {
    console.log(`[supabase-shim] functions.invoke("${fnName}") called (stub)`);
    return { data: { ok: true, emailSent: false }, error: null };
  }},
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
      upload: async (path: string, file: File | Blob, options?: { contentType?: string; cacheControl?: string; upsert?: boolean }) => {
        try {
          const storage = getStorage(firebaseApp);
          const full = `${bucket}/${path}`;
          const metadata: UploadMetadata = {
            contentType: options?.contentType || (file instanceof File ? file.type : undefined) || 'application/octet-stream',
            cacheControl: options?.cacheControl || 'public, max-age=31536000',
          };
          await uploadBytes(storageRef(storage, full), file, metadata);
          return { data: { path: full }, error: null };
        } catch (error: any) {
          console.error(`[storage] Upload failed:`, error);
          return { data: null, error };
        }
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: buildPublicUrl(`${bucket}/${path}`) } }),
      list: async () => ({ data: [], error: null }),
    }),
  },
};