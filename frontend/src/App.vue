<script setup lang="ts">
/**
 * @component App
 * @description Main application shell for Hivelet Web-Based Apartment Management System.
 * @systemBibleRef Section 1 - Product Identity & Section 4 - User Roles & Authorization
 * @rationale Serves as the central view layout manager wiring up the corporate Jira-style AppHeader,
 *              AppSidebar, responsive mobile drawer state, and active module views.
 * @innovations Reactive multi-role switcher allowing instant exploration of Admin, Tenant, and Public
 *              workflows without hard resets.
 */
import { ref } from 'vue';
import AppHeader from './components/layout/AppHeader.vue';
import AppSidebar from './components/layout/AppSidebar.vue';

// Import Corporate Module Views
import AdminOverviewView from './views/AdminOverviewView.vue';
import RoomDirectoryView from './views/RoomDirectoryView.vue';
import TenantManagementView from './views/TenantManagementView.vue';
import InquiriesView from './views/InquiriesView.vue';
import BillingPaymentsView from './views/BillingPaymentsView.vue';
import ExpensesLedgerView from './views/ExpensesLedgerView.vue';
import MaintenanceDispatchView from './views/MaintenanceDispatchView.vue';
import TenantPortalView from './views/TenantPortalView.vue';
import PublicGuestView from './views/PublicGuestView.vue';

// Application State
const currentRole = ref<'admin' | 'tenant' | 'public'>('admin');
const activeTab = ref('overview');
const isMobileSidebarOpen = ref(false);

const handleRoleChange = (role: 'admin' | 'tenant' | 'public') => {
  currentRole.value = role;
  if (role === 'admin') activeTab.value = 'overview';
  else if (role === 'tenant') activeTab.value = 'tenant-dashboard';
  else if (role === 'public') activeTab.value = 'public-rooms';
};
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] text-[#172b4d] flex flex-col font-sans">
    <!-- Corporate App Top Header Bar -->
    <AppHeader 
      :current-role="currentRole" 
      :is-mobile-sidebar-open="isMobileSidebarOpen"
      @update:current-role="handleRoleChange"
      @toggle-mobile-sidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
    />

    <!-- Main Workspace Layout (Sidebar + Content Area) -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Jira-Style Left Sidebar -->
      <AppSidebar 
        :current-role="currentRole"
        :active-tab="activeTab"
        :is-mobile-sidebar-open="isMobileSidebarOpen"
        @update:active-tab="activeTab = $event"
        @close-mobile-sidebar="isMobileSidebarOpen = false"
      />

      <!-- Main Workspace Scrollable Content Canvas -->
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <div class="max-w-7xl mx-auto">
          <!-- Admin Workspace Views -->
          <template v-if="currentRole === 'admin'">
            <AdminOverviewView v-if="activeTab === 'overview'" />
            <RoomDirectoryView v-else-if="activeTab === 'directory'" />
            <TenantManagementView v-else-if="activeTab === 'tenants'" />
            <InquiriesView v-else-if="activeTab === 'inquiries'" />
            <BillingPaymentsView v-else-if="activeTab === 'billing'" />
            <ExpensesLedgerView v-else-if="activeTab === 'expenses'" />
            <MaintenanceDispatchView v-else-if="activeTab === 'tickets'" />
            
            <!-- Audit Logs Placeholder -->
            <div v-else-if="activeTab === 'audit'" class="jira-card p-6 space-y-3">
              <h2 class="text-lg font-bold text-[#172b4d]">System Audit & Activity Logs</h2>
              <p class="text-xs text-[#5e6c84]">Immutable activity log tracking system actions, financial edits, and authorization events.</p>
              <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] text-xs font-mono text-[#172b4d]">
                [2026-07-28 14:00:00] [SYSTEM] Supabase Database client connection initialized.<br>
                [2026-07-28 14:05:00] [ADMIN] Payment recorded: INV-2026-0701 for Room 101.
              </div>
            </div>
          </template>

          <!-- Tenant Portal View -->
          <template v-else-if="currentRole === 'tenant'">
            <TenantPortalView />
          </template>

          <!-- Public Guest View -->
          <template v-else-if="currentRole === 'public'">
            <PublicGuestView />
          </template>
        </div>
      </main>
    </div>
  </div>
</template>
