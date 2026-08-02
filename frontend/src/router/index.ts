/**
 * @file router/index.ts
 * @description Vue Router configuration with auth-gated routes. RLS on the database is the real
 *              access boundary (docs/04_ARCHITECTURE.md: "the frontend is not a security boundary");
 *              these guards exist purely for navigation/UX so the wrong portal never even renders.
 */
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import LandingView from '../views/LandingView.vue';
import LoginView from '../views/LoginView.vue';
import RoomsCatalogView from '../views/PublicGuestView.vue';

import AdminOverviewView from '../views/AdminOverviewView.vue';
import RoomDirectoryView from '../views/RoomDirectoryView.vue';
import TenantManagementView from '../views/TenantManagementView.vue';
import InquiriesView from '../views/InquiriesView.vue';
import BillingPaymentsView from '../views/BillingPaymentsView.vue';
import ExpensesLedgerView from '../views/ExpensesLedgerView.vue';
import MaintenanceDispatchView from '../views/MaintenanceDispatchView.vue';
import AuditLogView from '../views/AuditLogView.vue';
import TenantPortalView from '../views/TenantPortalView.vue';

const routes = [
  { path: '/', name: 'Landing', component: LandingView, meta: { public: true } },
  { path: '/rooms', name: 'RoomsCatalog', component: RoomsCatalogView, meta: { public: true } },
  { path: '/login', name: 'Login', component: LoginView, meta: { public: true } },

  { path: '/tenant', name: 'TenantPortal', component: TenantPortalView, meta: { requiresAuth: true, role: 'tenant' } },

  { path: '/admin', redirect: '/admin/overview' },
  { path: '/admin/overview', name: 'AdminOverview', component: AdminOverviewView, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin/directory', name: 'RoomDirectory', component: RoomDirectoryView, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin/tenants', name: 'TenantManagement', component: TenantManagementView, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin/inquiries', name: 'Inquiries', component: InquiriesView, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin/billing', name: 'BillingPayments', component: BillingPaymentsView, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin/expenses', name: 'ExpensesLedger', component: ExpensesLedgerView, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin/tickets', name: 'MaintenanceDispatch', component: MaintenanceDispatchView, meta: { requiresAuth: true, role: 'admin' } },
  { path: '/admin/audit', name: 'SystemAudit', component: AuditLogView, meta: { requiresAuth: true, role: 'admin' } },

  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  if (!authStore.initialized) {
    await authStore.initialize();
  }

  if (to.meta.public) {
    return true;
  }

  if (!authStore.isAuthenticated) {
    return { path: '/login' };
  }

  const requiredRole = to.meta.role as 'admin' | 'tenant' | undefined;
  if (requiredRole === 'admin' && !authStore.isAdmin) {
    return { path: authStore.isTenant ? '/tenant' : '/' };
  }
  if (requiredRole === 'tenant' && !authStore.isTenant) {
    return { path: authStore.isAdmin ? '/admin/overview' : '/' };
  }

  return true;
});

export default router;
