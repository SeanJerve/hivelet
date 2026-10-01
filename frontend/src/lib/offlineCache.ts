/**
 * @file lib/offlineCache.ts
 * @description A tenant's own last-loaded figures, kept on their phone so they can see what they
 *   owe without a connection (Sean, 2026-10-01).
 *
 * "The values like the bills of the tenant, the remaining bill, the due amount - show them in
 * offline mode. The only thing they can't do is transact or do actions." The design had said no
 * personal or financial data is stored on the device, and the service worker still never caches
 * `/api/tenant` or `/api/admin` (vite.config.ts: shared phones). This is the narrow exception, and
 * every limit on it is here for the shared phone:
 *
 *   - Only the tenant reads in `TENANT_PATHS`, only for a signed-in TENANT, never an admin read.
 *   - Stored under the tenant's own profile id. A different id reads nothing, and the store is
 *     wiped rather than kept beside the new person's.
 *   - Wiped by `authStore.clearSession`: signing out, a refused or expired session, a moved-out
 *     account. The next person to pick up the phone does not see the previous tenant's money.
 *   - Read back only when the request did not reach the server (`NETWORK_ERROR`, status 0). A
 *     server that answered with an error is still a failure, shown as one.
 *   - Saved only once every read of a page has succeeded, so a saved copy is never half of one
 *     load and half of another.
 *
 * localStorage, not the service worker: the worker cannot tell whose token a response belongs to,
 * and cannot be told to forget one person at sign-out.
 */
import { onBeforeUnmount, onMounted } from 'vue';
import { api, ApiRequestError } from './api';
import { PROPERTY_TIMEZONE } from './propertyDate';

/** The only reads ever kept. `/public/rates` is not personal; it rides along for the water line. */
export type TenantPath =
  | '/tenant/my-rooms'
  | '/tenant/my-bills'
  | '/tenant/my-payments'
  | '/tenant/my-income-records'
  | '/tenant/my-standing'
  | '/public/rates';

const TENANT_PATHS: ReadonlySet<string> = new Set<TenantPath>([
  '/tenant/my-rooms',
  '/tenant/my-bills',
  '/tenant/my-payments',
  '/tenant/my-income-records',
  '/tenant/my-standing',
  '/public/rates',
]);

const STORAGE_KEY = 'hivelet_tenant_offline';

/**
 * One tenant's records are a few kilobytes (a year of receipts is about twelve rows). Anything near
 * this is not a normal tenant read, and is not kept at all rather than kept in part.
 */
const MAX_CHARS = 256 * 1024;

interface Store {
  userId: string;
  entries: Partial<Record<TenantPath, { savedAt: number; data: unknown }>>;
}

/** The fields of `SessionUser` this needs; passed in so this file does not import the auth store. */
interface Owner {
  profileId: string;
  role: string;
}

export type TenantGet = <T>(path: TenantPath) => Promise<T>;

function readStore(): Store | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed.userId === 'string' && parsed.entries ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Wipes the saved figures. With `keepFor`, only if they belong to someone else - called that way
 * when a session is applied, so a new sign-in never sits beside the last person's money.
 */
export function clearTenantOfflineCache(keepFor?: string): void {
  try {
    if (keepFor) {
      const store = readStore();
      if (store && store.userId === keepFor) return;
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: there is nothing stored to clear either.
  }
}

function save(owner: Owner, fresh: Map<TenantPath, unknown>): void {
  // No id, nothing to key it to: kept for nobody rather than for whoever comes next.
  if (owner.role !== 'tenant' || !owner.profileId || fresh.size === 0) return;
  const store = readStore();
  const next: Store =
    store && store.userId === owner.profileId ? store : { userId: owner.profileId, entries: {} };
  const savedAt = Date.now();
  for (const [path, data] of fresh) {
    if (TENANT_PATHS.has(path)) next.entries[path] = { savedAt, data };
  }
  try {
    const json = JSON.stringify(next);
    if (json.length > MAX_CHARS) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Storage full or blocked: the page still works online, it just has nothing for offline.
  }
}

function isNetworkError(err: unknown): boolean {
  return err instanceof ApiRequestError && (err.code === 'NETWORK_ERROR' || err.status === 0) && err.code !== 'TIMEOUT';
}

/**
 * Runs a page's loader against the API, and, if the API could not be reached, once more against
 * what was saved for this same tenant.
 *
 * `run` reads through the `get` it is handed instead of `api.get`. Online, every read is kept and
 * saved together once `run` finishes. Offline, `get` answers from the saved copy, and a read that
 * was never saved fails the whole run, which then throws the original error so the page shows its
 * usual "could not be loaded".
 *
 * Returns when the shown figures were saved: `null` for a live load.
 */
export async function loadWithOfflineCopy(
  owner: Owner | null | undefined,
  run: (get: TenantGet) => Promise<void>,
): Promise<{ savedAt: number | null }> {
  const fresh = new Map<TenantPath, unknown>();
  const live: TenantGet = async <T>(path: TenantPath) => {
    const data = await api.get<T>(path, path !== '/public/rates');
    fresh.set(path, data);
    return data;
  };
  try {
    await run(live);
    if (owner) save(owner, fresh);
    return { savedAt: null };
  } catch (err) {
    if (!owner || owner.role !== 'tenant' || !owner.profileId || !isNetworkError(err)) throw err;
    const store = readStore();
    if (!store) throw err;
    if (store.userId !== owner.profileId) {
      clearTenantOfflineCache();
      throw err;
    }
    let oldest = Infinity;
    const saved: TenantGet = async <T>(path: TenantPath) => {
      const entry = store.entries[path];
      if (!entry) throw err;
      oldest = Math.min(oldest, entry.savedAt);
      return entry.data as T;
    };
    try {
      await run(saved);
    } catch {
      throw err;
    }
    return { savedAt: Number.isFinite(oldest) ? oldest : null };
  }
}

/** "Oct 1, 3:45 PM", on the property's clock like every other date a tenant reads. */
export function savedAtLabel(savedAt: number): string {
  return new Date(savedAt).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: PROPERTY_TIMEZONE,
  });
}

/** Runs `fn` when the browser reports the connection back, while the page is mounted. */
export function onBackOnline(fn: () => unknown): void {
  const handler = () => void fn();
  onMounted(() => window.addEventListener('online', handler));
  onBeforeUnmount(() => window.removeEventListener('online', handler));
}
