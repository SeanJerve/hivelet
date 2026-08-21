import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import {
  currentRole,
  isAuthenticated,
  restoreSession,
  homeRouteForRole,
  type Role,
} from '@/lib/authStore';
import { getStoredToken } from '@/lib/api';

import PublicGuestView from '@/views/PublicGuestView.vue';
import LoginView from '@/views/LoginView.vue';
import AdminOverviewView from '@/views/AdminOverviewView.vue';
import RoomDirectoryView from '@/views/RoomDirectoryView.vue';
import TenantManagementView from '@/views/TenantManagementView.vue';
import IncomeCollectionsView from '@/views/IncomeCollectionsView.vue';
import ExpensesLedgerView from '@/views/ExpensesLedgerView.vue';
import MaintenanceDispatchView from '@/views/MaintenanceDispatchView.vue';
import InquiriesView from '@/views/InquiriesView.vue';
import TenantPortalView from '@/views/TenantPortalView.vue';

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
  { path: '/login', name: 'Login', component: LoginView },

  // Tenant Portal
  {
    path: '/tenant',
    name: 'TenantPortal',
    component: TenantPortalView,
    meta: { roles: ['tenant', 'admin'], label: 'the Tenant Portal' },
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

  // Legacy basis aliases
  { path: '/basis', redirect: '/admin/overview' },
  { path: '/basis/directory', redirect: '/admin/directory' },
  { path: '/basis/income', redirect: '/admin/income' },

  { path: '/:pathMatch(.*)*', redirect: '/public' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

let sessionRestored = false;

router.beforeEach(async (to) => {
  if (!sessionRestored) {
    sessionRestored = true;
    if (getStoredToken()) {
      await restoreSession();
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
