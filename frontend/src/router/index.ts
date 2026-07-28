/**
 * @file router/index.ts
 * @description Vue Router configuration mapping URL slugs to Hivelet system workspace views.
 * @systemBibleRef Section 4 - User Roles & Authorization Boundaries
 * @rationale Establishes explicit URL slug routes for direct URL navigation without requiring authentication guards
 *              during initial UI development and testing.
 * @innovations Clean RESTful slug structure matching capstone system roles (Public, Tenant, Admin sub-modules).
 */
import { createRouter, createWebHistory } from 'vue-router';

import AdminOverviewView from '../views/AdminOverviewView.vue';
import RoomDirectoryView from '../views/RoomDirectoryView.vue';
import TenantManagementView from '../views/TenantManagementView.vue';
import InquiriesView from '../views/InquiriesView.vue';
import BillingPaymentsView from '../views/BillingPaymentsView.vue';
import ExpensesLedgerView from '../views/ExpensesLedgerView.vue';
import MaintenanceDispatchView from '../views/MaintenanceDispatchView.vue';
import TenantPortalView from '../views/TenantPortalView.vue';
import PublicGuestView from '../views/PublicGuestView.vue';

const routes = [
  { path: '/', redirect: '/public' },
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
  { 
    path: '/admin/audit', 
    name: 'SystemAudit', 
    component: {
      template: `
        <div class="jira-card p-6 space-y-4">
          <h2 class="text-lg font-bold text-[#172b4d]">System Audit & Activity Logs</h2>
          <p class="text-xs text-[#5e6c84]">Immutable activity log tracking system actions, financial edits, and authorization events.</p>
          <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] text-xs font-mono text-[#172b4d] rounded-xs space-y-1">
            <p>[2026-07-28 14:00:00] [SYSTEM] Supabase Database client connection initialized.</p>
            <p>[2026-07-28 14:05:00] [ADMIN] Payment recorded: INV-2026-0701 for Room 101.</p>
            <p>[2026-07-28 14:10:00] [TENANT] Issue reported for Room 108: Faucet Leaking.</p>
          </div>
        </div>
      `
    }
  },
  // Catch-all fallback route
  { path: '/:pathMatch(.*)*', redirect: '/public' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
