/**
 * @file lib/live.ts
 * @description Keeps every open page current without a refresh (Sean, 2026-09-30).
 *
 * Changes did not show until people refreshed: Michelle recorded a payment and
 * the tenant's page kept the old figures; a tenant sent a repair and her list
 * sat still. The site runs on Vercel functions, which cannot hold a live
 * connection open, so instead every open page asks GET /api/live/version every
 * few seconds while it is VISIBLE - a fingerprint of everything its person can
 * see (migration 068) - and reloads only when the fingerprint changes. A tab in
 * the background asks nothing, and asks at once when it comes back.
 *
 * What reloads: the shared lists the admin screens read (income, expenses,
 * rooms, tenants, repairs, inquiries), the notifications, and whatever the page
 * on screen registered with useLiveRefresh(). A tenant's session skips the
 * admin lists (their loaders return at once for a non-admin).
 */
import { onBeforeUnmount, onMounted } from 'vue';
import { api, msSinceOwnWrite } from './api';
import { playSound } from './sounds';
import { isAuthenticated, isAdmin } from './authStore';
import {
  fetchIncomeRecords,
  fetchExpenseRecords,
  fetchRooms,
  fetchTenants,
  fetchMaintenanceTickets,
  fetchInquiries,
} from './systemState';
import { fetchNotifications } from './notificationsStore';
import { setReconnectHandler } from './offlineCache';

type Refresher = () => unknown;
type LiveVersion = { version: string | null };

/**
 * Every 2 s while visible (was 5 s; Sean, 2026-10-01: "it should be faster").
 * The check is one small request answered from one SQL function, measured at
 * 22 ms for the landlady and 8 ms for a tenant on the live database, so a change
 * made on one device now shows on another within about 2 to 3 seconds.
 */
const INTERVAL_MS = 2000;
const pageRefreshers = new Set<Refresher>();
let lastVersion: string | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let inFlight = false;
let running = false;

/** A page's own loader, run whenever something it could show has changed. */
export function useLiveRefresh(fn: Refresher): void {
  onMounted(() => pageRefreshers.add(fn));
  onBeforeUnmount(() => pageRefreshers.delete(fn));
}

async function refreshEverything() {
  if (!isAuthenticated.value) return;
  const shared: Refresher[] = [fetchNotifications];
  if (isAdmin.value) {
    shared.push(fetchIncomeRecords, fetchExpenseRecords, fetchRooms, fetchTenants, fetchMaintenanceTickets, fetchInquiries);
  }
  await Promise.allSettled([...shared, ...pageRefreshers].map((fn) => Promise.resolve().then(fn)));
}

/**
 * Back from no connection: the same reload, once, so the saved figures shown meanwhile are
 * replaced by live ones and the "Saved figures from" notice goes (lib/offlineCache.ts; Sean,
 * 2026-10-02). The version check below cannot do it: a page opened offline has no version to
 * compare its first answer with, and if nothing changed on the server meanwhile the version is
 * the same one while the screen still shows the saved copy.
 */
setReconnectHandler(refreshEverything);

async function check() {
  if (inFlight || !isAuthenticated.value || document.visibilityState !== 'visible') return;
  inFlight = true;
  try {
    const res = await api.get<LiveVersion>('/live/version');
    const version = res?.version ?? null;
    if (version && lastVersion && version !== lastVersion) {
      // The ping, for something that came from someone else: a payment, a
      // repair, a reply on a repair or an inquiry, a notification (Sean,
      // 2026-10-01). Not for one's own save, which pinged once already (lib/useToast.ts).
      if (msSinceOwnWrite() > 4000) playSound('notify');
      await refreshEverything();
    }
    if (version) lastVersion = version;
  } catch {
    // Offline, or signing out: the next check tries again. Never a toast.
  } finally {
    inFlight = false;
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') void check();
}

/** Started when someone signs in (App.vue), stopped when they sign out. */
export function startLiveUpdates(): void {
  if (running) return;
  running = true;
  lastVersion = null;
  void check();
  timer = setInterval(check, INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisible);
}

export function stopLiveUpdates(): void {
  running = false;
  lastVersion = null;
  if (timer) clearInterval(timer);
  timer = undefined;
  document.removeEventListener('visibilitychange', onVisible);
}
