/**
 * @file router/index.ts
 * @description Route table and role-based navigation guards.
 * @systemBibleRef Section 4 - User Roles & Authorization Boundaries
 * @requirements FR-002 Role-Based Access
 *
 * Each private route declares the roles that may render it. The guard is a
 * usability control — it stops a tenant landing on a broken admin screen — and
 * NOT the security control. 04_ARCHITECTURE.md: "The frontend is not a security
 * boundary." Even if a user edited the bundle to reach /admin/billing, every
 * request that page makes is refused by the Express RBAC middleware.
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import {
  currentRole,
  isAuthenticated,
  restoreSession,
  homeRouteForRole,
  type Role,
} from '@/lib/authStore';
import { getStoredToken } from '@/lib/api';

import PublicLandingView from '@/views/PublicLandingView.vue';
import PublicGuestView from '@/views/PublicGuestView.vue';
import CategoryRoomsView from '@/views/CategoryRoomsView.vue';
import LoginView from '@/views/LoginView.vue';
import AdminOverviewView from '@/views/AdminOverviewView.vue';
import RoomDirectoryView from '@/views/RoomDirectoryView.vue';
import TenantManagementView from '@/views/TenantManagementView.vue';
import InquiriesView from '@/views/InquiriesView.vue';
import BillingPaymentsView from '@/views/BillingPaymentsView.vue';
import ExpensesLedgerView from '@/views/ExpensesLedgerView.vue';
import MaintenanceDispatchView from '@/views/MaintenanceDispatchView.vue';
import TenantPortalView from '@/views/TenantPortalView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** Roles permitted to render this route. Omitted = public. */
    roles?: Role[];
    /** Human-readable label used in the redirect notice. */
    label?: string;
  }
}

const routes: RouteRecordRaw[] = [
  // ---- Public (System Bible Section 4 — Public Visitor) --------------------
  { path: '/', name: 'PublicLanding', component: PublicLandingView },
  { path: '/category/:categorySlug', name: 'CategoryRooms', component: CategoryRoomsView },
  { path: '/public', name: 'PublicGuest', component: PublicGuestView },
  { path: '/login', name: 'Login', component: LoginView },

  // ---- Tenant portal (Section 4 — Tenant) ---------------------------------
  {
    path: '/tenant',
    name: 'TenantPortal',
    component: TenantPortalView,
    meta: { roles: ['tenant', 'admin'], label: 'the tenant portal' },
  },

  // ---- Administrator workspace (Section 4 — Administrator) ----------------
  { path: '/admin', redirect: '/admin/overview' },
  {
    path: '/admin/overview',
    name: 'AdminOverview',
    component: AdminOverviewView,
    meta: { roles: ['admin'], label: 'the executive overview' },
  },
  {
    path: '/admin/directory',
    name: 'RoomDirectory',
    component: RoomDirectoryView,
    meta: { roles: ['admin'], label: 'the room directory' },
  },
  {
    path: '/admin/tenants',
    name: 'TenantManagement',
    component: TenantManagementView,
    meta: { roles: ['admin'], label: 'tenant management' },
  },
  {
    path: '/admin/inquiries',
    name: 'Inquiries',
    component: InquiriesView,
    meta: { roles: ['admin'], label: 'the inquiry inbox' },
  },
  {
    path: '/admin/billing',
    name: 'BillingPayments',
    component: BillingPaymentsView,
    // BR-048 — income ledger authorship is the administrator's alone.
    meta: { roles: ['admin'], label: 'billing & collections' },
  },
  {
    path: '/admin/expenses',
    name: 'ExpensesLedger',
    component: ExpensesLedgerView,
    // BR-048 — expense ledger authorship is the administrator's alone.
    meta: { roles: ['admin'], label: 'the expenses ledger' },
  },
  {
    path: '/admin/tickets',
    name: 'MaintenanceDispatch',
    component: MaintenanceDispatchView,
    meta: { roles: ['admin'], label: 'maintenance dispatch' },
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

/**
 * Ensures the stored token has been validated before the first guarded
 * navigation, so a page refresh on /admin does not bounce the administrator to
 * the login screen while the session is still being restored.
 */
let sessionRestored = false;

router.beforeEach(async (to) => {
  if (!sessionRestored) {
    sessionRestored = true;
    if (getStoredToken()) {
      await restoreSession();
    }
  }

  const allowedRoles = to.meta.roles;

  // Public route — always reachable.
  if (!allowedRoles || allowedRoles.length === 0) {
    // A signed-in user has no reason to see the login form again.
    if (to.name === 'Login' && isAuthenticated.value) {
      return homeRouteForRole(currentRole.value);
    }
    return true;
  }

  if (!isAuthenticated.value) {
    return {
      path: '/login',
      query: {
        redirect: to.fullPath,
        reason: `Please sign in to access ${to.meta.label ?? 'this page'}.`,
      },
    };
  }

  if (!allowedRoles.includes(currentRole.value)) {
    // Signed in, but the wrong role. Send them to their own home rather than
    // to the login form — they are authenticated, just not authorized.
    return homeRouteForRole(currentRole.value);
  }

  return true;
});

export default router;
