/**
 * @file lib/offlineCache.ts
 * @description The essential figures, names and notifications from the last load, kept on the
 *   signed-in person's own device so the installed app still shows them with no connection
 *   (Sean, 2026-10-02). Wiped at sign-out.
 *
 * "Download the basic information, values and names, so that even with no internet we can still
 * see the tenants, the values. Not all the numbers, just the important ones. For tenants: their
 * rent, their balance. For the admin: the current year's figures. Notifications visible offline
 * too." Until today only the tenant Overview and Payments pages kept a copy (localStorage, since
 * 2026-10-01); every admin screen, the tenant's repairs and details, and the bell said "could not
 * be loaded" offline, which is what Sean saw.
 *
 * HOW IT WORKS. `lib/api.ts` hands every GET through here. A read on the allowlist below that
 * reaches the server is saved under the signed-in person's profile id. A read that does NOT reach
 * the server (`NETWORK_ERROR`: no signal, or a read that timed out) is answered from that saved
 * copy instead of throwing, and `savedCopySince` records it, which App.vue turns into one short
 * notice. Pages draw a saved answer exactly as they draw a live one, so no page needed its own
 * offline code. A server that ANSWERED with an error is still that error: only an unreachable
 * server falls back.
 *
 * EVERY LIMIT IS HERE FOR THE SHARED PHONE.
 *   - Only the reads listed for the signed-in role. Never sign-in, sessions, checkout, ticket or
 *     inquiry conversations, photos, or any write. Keys that name a token, hash, secret or password
 *     are dropped before saving (`/admin/inquiries` carries `access_token_hash`).
 *   - Keyed by profile id, and read back only for that same id.
 *   - Wiped by `authStore.clearSession` (sign-out, a refused or expired session, a moved-out
 *     account) and when a different person signs in on the device (`claimOfflineCopy`).
 *   - Never saved for a signed-out visitor or a prospect.
 *   - Capped: one read over 2 M characters, or a store over 4 M, is not kept.
 *
 * IndexedDB, not the service worker: the worker cannot tell whose token a response belongs to and
 * cannot be told to forget one person at sign-out (vite.config.ts, the `api-read-cache` note).
 * IndexedDB, not localStorage: a year of the owner's ledger is about a megabyte, and localStorage
 * is five, shared with everything else on the origin.
 */
import { computed, ref } from 'vue';
import { PROPERTY_TIMEZONE } from './propertyDate';

/** The reads that make the owner's screens: names, units, standing, this year's money, repairs, inquiries. */
const ADMIN_READS: ReadonlySet<string> = new Set([
  '/admin/rooms',
  '/admin/tenants',
  '/admin/income-records',
  '/admin/expense-entries',
  '/admin/expense-categories',
  '/admin/payments',
  '/admin/tickets',
  '/admin/inquiries',
  '/admin/notifications',
  '/auth/me/recent-actions',
  '/public/rates',
]);

/** A tenant's own: rent, balance, receipts, repairs, details, notifications. */
const TENANT_READS: ReadonlySet<string> = new Set([
  '/tenant/my-rooms',
  '/tenant/my-bills',
  '/tenant/my-payments',
  '/tenant/my-income-records',
  '/tenant/my-standing',
  '/tenant/my-tickets',
  '/tenant/my-profile',
  '/tenant/my-notifications',
  '/auth/me/recent-actions',
  '/public/rates',
]);

/**
 * Audit columns no screen reads (checked with a grep of `frontend/src`, 2026-10-02). Dropped from
 * the two big ledgers, about a third of their size, so all years fit rather than only this one:
 * keeping only the current year would let the Overview's year menu and the ledgers' year filter
 * offer last year offline and draw it as zero, which is the "nothing collected" claim this
 * codebase refuses to make out of a missing answer.
 */
const UNREAD_COLUMNS: Record<string, readonly string[]> = {
  '/admin/income-records': ['assignment_id', 'created_at', 'updated_at', 'voided_at', 'voided_by', 'void_reason'],
  '/admin/expense-entries': ['created_by', 'created_at', 'updated_at', 'voided_at', 'voided_by', 'void_reason'],
};

const SECRET_KEY = /token|secret|password|passwd|hash|hmac|api_?key/i;
const MAX_ENTRY_CHARS = 2_000_000;
const MAX_TOTAL_CHARS = 4_000_000;
/** The tenant-only copy this replaces. Removed wherever it is still lying around. */
const LEGACY_KEY = 'hivelet_tenant_offline';

const DB_NAME = 'hivelet-offline';
const STORE = 'reads';
const OWNER_KEY = 'meta:owner';

interface Owner {
  profileId: string;
  role: string;
}

interface SavedRead {
  owner: string;
  path: string;
  savedAt: number;
  body: string;
}

let owner: Owner | null = null;

// ---------------------------------------------------------------------------
// What the app is showing: read by App.vue's notice and by every write button.
// ---------------------------------------------------------------------------

/** The browser's own view of the connection. One copy, so the bar and the buttons agree. */
export const isOffline = ref(typeof navigator !== 'undefined' && navigator.onLine === false);
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => (isOffline.value = false));
  window.addEventListener('offline', () => (isOffline.value = true));
}

/** When the oldest saved copy on screen was saved; `null` while everything shown is live. */
export const savedCopySince = ref<number | null>(null);
export const showingSavedCopy = computed(() => savedCopySince.value !== null);
/**
 * Paying, recording, sending, saving: none can work now, so the buttons for them are hidden or
 * disabled rather than offered and refused.
 */
export const writesUnavailable = computed(() => isOffline.value || showingSavedCopy.value);

/** "Oct 2, 7:34 AM", on the property's clock like every other date here. */
export function savedAtLabel(savedAt: number): string {
  return new Date(savedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: PROPERTY_TIMEZONE,
  });
}

// ---------------------------------------------------------------------------
// Coming back. The first read that reaches the server after one that did not
// reloads what is on screen (lib/live.ts registers the reload), then the notice goes.
// ---------------------------------------------------------------------------

let unreachable = false;
let recovering = false;
let onReconnect: (() => Promise<unknown>) | null = null;

export function setReconnectHandler(fn: () => Promise<unknown>): void {
  onReconnect = fn;
}

export function noteUnreachable(): void {
  unreachable = true;
}

export function noteReachedServer(): void {
  if (!unreachable || recovering) return;
  unreachable = false;
  recovering = true;
  Promise.resolve()
    .then(() => onReconnect?.())
    .catch(() => undefined)
    .finally(() => {
      recovering = false;
      // A read in the reload that fell back again keeps the notice up.
      if (!unreachable) savedCopySince.value = null;
    });
}

// ---------------------------------------------------------------------------
// Whose copy it is.
// ---------------------------------------------------------------------------

/**
 * Who the copy belongs to from now on. A different person than the one stored wipes it first,
 * so a new sign-in never sits beside the last person's figures.
 */
export function claimOfflineCopy(next: Owner): void {
  removeLegacyCopy();
  if (!next.profileId || (next.role !== 'admin' && next.role !== 'tenant')) {
    clearOfflineCopy();
    return;
  }
  const changed = owner?.profileId !== next.profileId;
  owner = { profileId: next.profileId, role: next.role };
  if (!changed) return;
  savedCopySince.value = null;
  sizes = null;
  const id = next.profileId;
  void enqueue(async () => {
    const db = await openDb();
    if (!db) return;
    const stored = await run<string | undefined>(db, 'readonly', (s) => s.get(OWNER_KEY));
    if (stored !== id) {
      await run(db, 'readwrite', (s) => s.clear());
      await run(db, 'readwrite', (s) => s.put(id, OWNER_KEY));
    }
  });
}

/** Signing out, a refused session, a moved-out account: nothing of this person stays. */
export function clearOfflineCopy(): Promise<void> {
  owner = null;
  sizes = null;
  savedCopySince.value = null;
  unreachable = false;
  removeLegacyCopy();
  return enqueue(async () => {
    const db = await openDb();
    if (db) await run(db, 'readwrite', (s) => s.clear());
  });
}

/** The owner's profile id if this read is one kept for them, otherwise null. */
export function offlineOwnerFor(path: string): string | null {
  if (!owner) return null;
  const list = owner.role === 'admin' ? ADMIN_READS : owner.role === 'tenant' ? TENANT_READS : null;
  return list?.has(path) ? owner.profileId : null;
}

// ---------------------------------------------------------------------------
// Saving and reading back.
// ---------------------------------------------------------------------------

/** What every read on the list keeps: the API's `{ data, meta }`. */
export interface Envelope {
  data: unknown;
  meta?: unknown;
}

/** In-memory sizes of what is stored for the current owner, for the cap. Loaded on first save. */
let sizes: Map<string, number> | null = null;

export function saveRead(ownerId: string, path: string, envelope: Envelope): void {
  if (owner?.profileId !== ownerId) return;
  let body: string;
  try {
    body = JSON.stringify(slim(path, envelope));
  } catch {
    return;
  }
  const key = `${ownerId}\n${path}`;
  void enqueue(async () => {
    // Re-checked inside the queue: a sign-out queued its wipe ahead of this.
    if (owner?.profileId !== ownerId) return;
    const db = await openDb();
    if (!db) return;
    if (!sizes) {
      sizes = new Map();
      const all = await run<SavedRead[]>(db, 'readonly', (s) => s.getAll());
      for (const r of all ?? []) if (r && typeof r === 'object' && r.owner === ownerId) sizes.set(r.path, r.body.length);
    }
    let total = body.length;
    for (const [p, n] of sizes) if (p !== path) total += n;
    if (body.length > MAX_ENTRY_CHARS || total > MAX_TOTAL_CHARS) {
      // Not kept rather than kept in part; an older copy would now disagree with the live one.
      sizes.delete(path);
      await run(db, 'readwrite', (s) => s.delete(key));
      return;
    }
    const record: SavedRead = { owner: ownerId, path, savedAt: Date.now(), body };
    await run(db, 'readwrite', (s) => s.put(record, key));
    sizes.set(path, body.length);
  });
}

/** The saved answer for this person and read, if there is one; marks the app as showing it. */
export async function readSaved(ownerId: string, path: string): Promise<Envelope | null> {
  const record = await enqueue(async () => {
    if (owner?.profileId !== ownerId) return undefined;
    const db = await openDb();
    if (!db) return undefined;
    return run<SavedRead | undefined>(db, 'readonly', (s) => s.get(`${ownerId}\n${path}`));
  });
  if (!record || record.owner !== ownerId || owner?.profileId !== ownerId) return null;
  try {
    const envelope = JSON.parse(record.body) as Envelope;
    unreachable = true;
    savedCopySince.value = Math.min(savedCopySince.value ?? Infinity, record.savedAt);
    return envelope;
  } catch {
    return null;
  }
}

/** For the verification scripts and the privacy page's claim: what is stored, and how big. */
export async function offlineCopySummary(): Promise<{ path: string; chars: number; savedAt: number }[]> {
  return enqueue(async () => {
    const db = await openDb();
    if (!db) return [];
    const all = (await run<unknown[]>(db, 'readonly', (s) => s.getAll())) ?? [];
    return all
      .filter((r): r is SavedRead => !!r && typeof r === 'object' && 'body' in (r as object))
      .map((r) => ({ path: r.path, chars: r.body.length, savedAt: r.savedAt }));
  });
}

function slim(path: string, envelope: Envelope): Envelope {
  const drop = UNREAD_COLUMNS[path];
  const rows = (value: unknown): unknown =>
    Array.isArray(value) && drop
      ? value.map((row) => {
          if (!row || typeof row !== 'object') return row;
          const copy = { ...(row as Record<string, unknown>) };
          for (const k of drop) delete copy[k];
          return copy;
        })
      : value;
  const data = envelope.data as any;
  const kept =
    data && !Array.isArray(data) && typeof data === 'object' && Array.isArray(data.data)
      ? { ...data, data: rows(data.data) }
      : rows(data);
  return { data: scrub(kept), meta: scrub(envelope.meta) };
}

/**
 * Drops anything secret-shaped, and photos. A photo is no use offline (it cannot be fetched) and an
 * attached one arrives as a data URL of hundreds of kilobytes; a signed storage URL carries a token.
 */
function scrub(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.length > 1024) return null;
    if (/^https?:\/\//i.test(value) && /[?&](token|sig|signature|x-amz-[a-z-]+)=/i.test(value)) return null;
    return value;
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k)) continue;
      out[k] = scrub(v);
    }
    return out;
  }
  return value;
}

function removeLegacyCopy(): void {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage blocked: nothing was stored there either.
  }
}

// ---------------------------------------------------------------------------
// A small promise wrapper over IndexedDB. Every operation runs in one queue, so
// a wipe queued at sign-out always lands after any save already under way.
// ---------------------------------------------------------------------------

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        // Private mode or storage blocked: the app works online and keeps nothing.
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function run<T = unknown>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = op(tx.objectStore(STORE));
      let result: T | undefined;
      req.onsuccess = () => (result = req.result as T);
      tx.oncomplete = () => resolve(result);
      // A full disk or a quota refusal: the read is simply not kept.
      tx.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}
