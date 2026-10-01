import type { Router, RouteRecordName } from 'vue-router';
import type { Role } from '@/lib/authStore';

/**
 * Downloads the code of the pages someone is likely to open next, once the
 * browser is idle after the first page has rendered (Sean, 2026-10-01: "make
 * use of the time the loader is showing - load everything we need instead of
 * showing the spinner just for the sake of it").
 *
 * Every page is its own chunk (router/index.ts), fetched the first time it is
 * opened, so the first visit to each page waited on a download with the empty
 * placeholder up. Calling a route's own `() => import(...)` early means the
 * click finds the module already loaded. Code only: each page still loads its
 * own data when it opens, and fetching that here would be a second copy of the
 * same request, out of date by the time the page reads it.
 *
 * Never in the way of the first page: it waits for idle time after the first
 * render (main.ts calls it after the loader has gone), and it is skipped on a
 * connection that asks for less data (Save-Data, 2G), where a page nobody
 * opens is a real cost.
 */
const PAGES: Record<'admin' | 'tenant' | 'public', RouteRecordName[]> = {
  // Overview, Rooms and rates, Tenants, Monthly Income, Monthly Expenses, Repairs, Inquiries.
  admin: ['AdminOverview', 'RoomDirectory', 'TenantManagement', 'IncomeCollections', 'ExpensesLedger', 'MaintenanceDispatch', 'Inquiries'],
  // Overview, Payments, Repairs, My details.
  tenant: ['TenantOverview', 'TenantPayments', 'TenantTickets', 'TenantProfile'],
  // The landing page, the category pages (one chunk for both routes), enquiry, sign-in.
  public: ['PublicGuest', 'CategoryRooms', 'Inquire', 'Login'],
};

const warmed = new Set<unknown>();

function saveData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === '2g' || c?.effectiveType === 'slow-2g';
}

function whenIdle(run: () => void): void {
  // Safari has no requestIdleCallback; the typings say every browser does.
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}

export function warmRoutes(router: Router, role: Role): void {
  if (saveData()) return;
  const names = PAGES[role === 'admin' || role === 'tenant' ? role : 'public'];
  whenIdle(() => {
    for (const record of router.getRoutes()) {
      if (!record.name || !names.includes(record.name)) continue;
      const load = record.components?.default;
      // A lazy route's component is its import function until the router has
      // opened it once; after that the router stores the module itself there.
      if (typeof load !== 'function' || warmed.has(load)) continue;
      warmed.add(load);
      (load as () => Promise<unknown>)().catch(() => {
        // A failed download is retried by the router when the page is opened.
        warmed.delete(load);
      });
    }
  });
}
