/**
 * @file router/index.ts
 * @description Vue Router configuration mapping URL slugs to Hivelet system workspace views.
 * @systemBibleRef Section 4 - User Roles & Authorization Boundaries
 * @rationale Establishes explicit RESTful URL slugs for Public, Tenant, and Admin sub-modules.
 */
import { createRouter, createWebHistory } from 'vue-router';

import BasisArchivedView from '../views/BasisArchivedView.vue';
import AdminOverviewView from '../views/AdminOverviewView.vue';
import RoomDirectoryView from '../views/RoomDirectoryView.vue';
import TenantManagementView from '../views/TenantManagementView.vue';
import InquiriesView from '../views/InquiriesView.vue';
import BillingPaymentsView from '../views/BillingPaymentsView.vue';
import BillingHistoryView from '../views/BillingHistoryView.vue';
import ExpensesLedgerView from '../views/ExpensesLedgerView.vue';
import MaintenanceDispatchView from '../views/MaintenanceDispatchView.vue';
import TenantPortalView from '../views/TenantPortalView.vue';
import PublicGuestView from '../views/PublicGuestView.vue';
import SystemSettingsView from '../views/SystemSettingsView.vue';

const routes = [
  { path: '/', name: 'BasisArchive', component: BasisArchivedView },
  { path: '/basis', redirect: '/' },
  { path: '/basis/public', name: 'BasisPublicGuest', component: PublicGuestView },
  { path: '/basis/tenant', name: 'BasisTenantPortal', component: TenantPortalView },
  { path: '/basis/admin', redirect: '/basis/admin/overview' },
  { path: '/basis/admin/overview', name: 'BasisAdminOverview', component: AdminOverviewView },
  { path: '/basis/admin/directory', name: 'BasisRoomDirectory', component: RoomDirectoryView },
  { path: '/basis/admin/tenants', name: 'BasisTenantManagement', component: TenantManagementView },
  { path: '/basis/admin/inquiries', name: 'BasisInquiries', component: InquiriesView },
  { path: '/basis/admin/billing', name: 'BasisBillingPayments', component: BillingPaymentsView },
  { path: '/basis/admin/billing/history', name: 'BasisBillingHistory', component: BillingHistoryView },
  { path: '/basis/admin/expenses', name: 'BasisExpensesLedger', component: ExpensesLedgerView },
  { path: '/basis/admin/tickets', name: 'BasisMaintenanceDispatch', component: MaintenanceDispatchView },
  { path: '/basis/admin/settings', name: 'BasisSystemSettings', component: SystemSettingsView },
  
  // Legacy alias redirects to basis paths
  { path: '/public', redirect: '/basis/public' },
  { path: '/tenant', redirect: '/basis/tenant' },
  { path: '/admin/:pathMatch(.*)*', redirect: (to: any) => `/basis/admin/${to.params.pathMatch}` },
  
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
