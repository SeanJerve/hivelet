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
import SystemSettingsView from '@/views/SystemSettingsView.vue';

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
  { path: '/admin/settings', name: 'SystemSettings', component: SystemSettingsView },
  { 
    path: '/admin/audit', 
    name: 'SystemAudit', 
    component: {
      template: `
        <div class="jira-card p-6 space-y-4 bg-white border border-[#dfe1e6]">
          <h2 class="text-lg font-bold text-[#172b4d]">System Audit & Activity Logs</h2>
          <p class="text-xs text-[#5e6c84]">Immutable activity log tracking system actions, financial edits, and authorization events.</p>
          <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] text-xs font-mono text-[#172b4d] rounded-xs space-y-1">
            <p>[2026-08-01 14:00:00] [SYSTEM] Centralized system reactive state initialized.</p>
            <p>[2026-08-01 14:05:00] [ADMIN] Spec 09 Monthly Payment recorded for Room 204.</p>
            <p>[2026-08-01 14:10:00] [TENANT] Maintenance ticket 108 details expanded.</p>
          </div>
        </div>
      `
    }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
