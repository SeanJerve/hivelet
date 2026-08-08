/**
 * @file router/index.ts
 * @description Vue Router configuration mapping URL slugs to Hivelet system workspace views.
 * @systemBibleRef Section 4 - User Roles & Authorization Boundaries
 * @rationale Establishes explicit RESTful URL slugs for Public, Tenant, and Admin sub-modules.
 */
import { createRouter, createWebHistory } from 'vue-router';

import PublicLandingView from '@/views/PublicLandingView.vue';
import AdminOverviewView from '@/views/AdminOverviewView.vue';
import RoomDirectoryView from '@/views/RoomDirectoryView.vue';
import TenantManagementView from '@/views/TenantManagementView.vue';
import InquiriesView from '@/views/InquiriesView.vue';
import BillingPaymentsView from '@/views/BillingPaymentsView.vue';
import ExpensesLedgerView from '@/views/ExpensesLedgerView.vue';
import MaintenanceDispatchView from '@/views/MaintenanceDispatchView.vue';
import TenantPortalView from '@/views/TenantPortalView.vue';
import PublicGuestView from '@/views/PublicGuestView.vue';

const routes = [
  { path: '/', name: 'PublicLanding', component: PublicLandingView },
  { path: '/public', name: 'PublicGuest', component: PublicGuestView },
  { path: '/tenant', name: 'TenantPortal', component: TenantPortalView },
  { path: '/admin', redirect: '/admin/overview' },
  { path: '/admin/overview', name: 'AdminOverview', component: AdminOverviewView },
  { path: '/admin/directory', name: 'RoomDirectory', component: RoomDirectoryView },
  { path: '/admin/tenants', name: 'TenantManagement', component: TenantManagementView },
  { path: '/admin/inquiries', name: 'Inquiries', component: InquiriesView },
  { path: '/admin/billing', name: 'BillingPayments', component: BillingPaymentsView },
  { path: '/admin/expenses', name: 'ExpensesLedger', component: ExpensesLedgerView },
  { path: '/admin/tickets', name: 'MaintenanceDispatch', component: MaintenanceDispatchView },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
