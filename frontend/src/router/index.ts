import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import {
  currentRole,
  isAuthenticated,
  restoreSession,
  homeRouteForRole,
  type Role,
} from '@/lib/authStore';
import { getStoredToken } from '@/lib/api';

/**
 * Every view below used to be a static import, so a first-time visitor to
 * `/public` - the one page that matters most for a first impression - paid
 * for the admin workspace, the tenant portal and everything else in the same
 * 724KB chunk before a single pixel of the page they asked for could render.
 * This app is role-gated (`meta.roles` below): a prospect never runs the
 * admin code, a tenant never runs the admin code, an admin never runs the
 * tenant code. Lazy-loading by route is Vue Router's own documented pattern
 * for exactly this shape - each `() => import(...)` becomes its own chunk,
 * fetched the first time that route is visited rather than on every visit to
 * any route. Nothing about what a view does changes; only when its JavaScript
 * arrives.
 */
const PublicGuestView = () => import('@/views/PublicGuestView.vue');
const InquireView = () => import('@/views/InquireView.vue');
const PrivacyPolicyView = () => import('@/views/PrivacyPolicyView.vue');
const TermsView = () => import('@/views/TermsView.vue');
const CategoryRoomsView = () => import('@/views/CategoryRoomsView.vue');
const LoginView = () => import('@/views/LoginView.vue');
const AdminOverviewView = () => import('@/views/AdminOverviewView.vue');
const RoomDirectoryView = () => import('@/views/RoomDirectoryView.vue');
const TenantManagementView = () => import('@/views/TenantManagementView.vue');
const IncomeCollectionsView = () => import('@/views/IncomeCollectionsView.vue');
const ExpensesLedgerView = () => import('@/views/ExpensesLedgerView.vue');
const MaintenanceDispatchView = () => import('@/views/MaintenanceDispatchView.vue');
const InquiriesView = () => import('@/views/InquiriesView.vue');
const AuditLogsView = () => import('@/views/AuditLogsView.vue');
const TenantOverviewView = () => import('@/views/TenantOverviewView.vue');
const TenantPaymentsView = () => import('@/views/TenantPaymentsView.vue');
const TenantTicketsView = () => import('@/views/TenantTicketsView.vue');
const TenantProfileView = () => import('@/views/TenantProfileView.vue');

declare module 'vue-router' {
  interface RouteMeta {
    roles?: Role[];
    label?: string;
  }
}

const routes: RouteRecordRaw[] = [
  // Public
  { path: '/', name: 'Home', redirect: '/public' },
  { path: '/public', name: 'PublicGuest', component: PublicGuestView },
  { path: '/inquire', name: 'Inquire', component: InquireView },
  { path: '/privacy', name: 'PrivacyPolicy', component: PrivacyPolicyView },
  { path: '/terms', name: 'Terms', component: TermsView },
  { path: '/category/:categorySlug', name: 'CategoryRooms', component: CategoryRoomsView },
  { path: '/category/:categorySlug/units', name: 'CategoryUnits', component: CategoryRoomsView },
  { path: '/login', name: 'Login', component: LoginView },

  // Tenant Portal
  {
    path: '/tenant',
    name: 'TenantOverview',
    component: TenantOverviewView,
    meta: { roles: ['tenant'], label: 'the Tenant Portal' },
  },
  {
    path: '/tenant/payments',
    name: 'TenantPayments',
    component: TenantPaymentsView,
    meta: { roles: ['tenant'], label: 'Tenant Payments' },
  },
  {
    path: '/tenant/tickets',
    name: 'TenantTickets',
    component: TenantTicketsView,
    meta: { roles: ['tenant'], label: 'Tenant Maintenance Tickets' },
  },
  {
    path: '/tenant/profile',
    name: 'TenantProfile',
    component: TenantProfileView,
    meta: { roles: ['tenant'], label: 'Tenant Profile' },
  },

  // Landlady Admin Workspace
  { path: '/admin', redirect: '/admin/overview' },
  {
    path: '/admin/overview',
    name: 'AdminOverview',
    component: AdminOverviewView,
    meta: { roles: ['admin'], label: 'the Executive Overview' },
  },
  {
    path: '/admin/directory',
    name: 'RoomDirectory',
    component: RoomDirectoryView,
    meta: { roles: ['admin'], label: 'the Room & Rate Directory' },
  },
  {
    path: '/admin/tenants',
    name: 'TenantManagement',
    component: TenantManagementView,
    meta: { roles: ['admin'], label: 'Active Tenants' },
  },
  {
    path: '/admin/income',
    name: 'IncomeCollections',
    component: IncomeCollectionsView,
    meta: { roles: ['admin'], label: 'Income & Collections' },
  },
  {
    path: '/admin/expenses',
    name: 'ExpensesLedger',
    component: ExpensesLedgerView,
    meta: { roles: ['admin'], label: 'Monthly Expenses' },
  },
  {
    path: '/admin/tickets',
    name: 'MaintenanceDispatch',
    component: MaintenanceDispatchView,
    meta: { roles: ['admin'], label: 'Maintenance Dispatch' },
  },
  {
    path: '/admin/inquiries',
    name: 'Inquiries',
    component: InquiriesView,
    meta: { roles: ['admin'], label: 'Prospect Inquiries' },
  },
  {
    path: '/admin/audit-logs',
    name: 'AdminAuditLogs',
    component: AuditLogsView,
    meta: { roles: ['admin'], label: 'System Audit Trail' },
  },

  // Legacy basis aliases
  { path: '/basis', redirect: '/admin/overview' },
  { path: '/basis/directory', redirect: '/admin/directory' },
  { path: '/basis/income', redirect: '/admin/income' },

  { path: '/:pathMatch(.*)*', redirect: '/public' },
];

/**
 * Back and Forward return to where the reader was; a link with a `#section`
 * lands on that section; everything else starts at the top.
 *
 * This returned `{ top: 0 }` for every navigation, hash or not, so
 * `/terms#payments` opened at the top of the terms (B-61). `LegalPage.vue`
 * worked around it for its own contents list, but a link from another page
 * had no way in.
 *
 * The offset is the target's own `scroll-margin-top`, because Vue Router
 * scrolls with `window.scrollTo` and would otherwise ignore it. Each page sets
 * that margin to suit its own header (`.legal-prose h2` 6rem under the sticky
 * 64px one, the landing sections `scroll-mt-20`), so there is one number per
 * page, not a second copy here. A hash with no element falls back to the top rather than
 * leaving the reader wherever the previous page was.
 */
function scrollToHash(hash: string, samePage: boolean) {
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape is still worth trying as written.
  }
  const el = document.getElementById(id);
  if (!el) return { top: 0 };
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    el,
    top: margin,
    // A jump within the page glides; arriving from another page does not.
    behavior: samePage && !reduce ? ('smooth' as const) : ('auto' as const),
  };
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return scrollToHash(to.hash, to.path === from.path);
    return { top: 0 };
  },
});

let sessionRestored = false;

router.beforeEach(async (to) => {
  if (!sessionRestored) {
    sessionRestored = true;
    if (getStoredToken()) {
      await restoreSession();
    }
  }

  // A signed-in administrator is kept in the admin workspace, except for the
  // website itself when she ASKS for it - "Visit the website" in the workspace
  // (2026-09-24). It used to bounce her from /public and /category to the
  // dashboard, so she could never see what visitors see. `redirectedFrom`
  // separates a real visit from arriving there by redirect: `/` and the
  // catch-all both redirect to /public, and those still land on her dashboard.
  if (isAuthenticated.value && currentRole.value === 'admin') {
    const website = to.path.startsWith('/public') || to.path.startsWith('/category');
    if (
      to.path === '/' ||
      to.path.startsWith('/tenant') ||
      (website && to.redirectedFrom)
    ) {
      return '/admin/overview';
    }
  }

  const allowedRoles = to.meta.roles;

  if (!allowedRoles || allowedRoles.length === 0) {
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
        reason: `Please sign in to access ${to.meta.label ?? 'this section'}.`,
      },
    };
  }

  if (!allowedRoles.includes(currentRole.value)) {
    return homeRouteForRole(currentRole.value);
  }

  return true;
});

export default router;
