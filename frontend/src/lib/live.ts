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
import { api } from './api';
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

type Refresher = () => unknown;
type LiveVersion = { version: string | null };

const INTERVAL_MS = 5000;
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
  const shared: Refresher[] = [fetchNotifications];
  if (isAdmin.value) {
    shared.push(fetchIncomeRecords, fetchExpenseRecords, fetchRooms, fetchTenants, fetchMaintenanceTickets, fetchInquiries);
  }
  await Promise.allSettled([...shared, ...pageRefreshers].map((fn) => Promise.resolve().then(fn)));
}

async function check() {
  if (inFlight || !isAuthenticated.value || document.visibilityState !== 'visible') return;
  inFlight = true;
  try {
    const res = await api.get<LiveVersion>('/live/version');
    const version = res?.version ?? null;
    if (version && lastVersion && version !== lastVersion) await refreshEverything();
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
