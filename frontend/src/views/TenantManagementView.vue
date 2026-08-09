<!--
  @file views/TenantManagementView.vue
  @description Active Tenant Directory and Onboarding Management module for Hivelet matching canonical unit codes.
  @systemBibleRef Section 5.3 - tenant_profiles & room_assignments
  @rationale Tracks individual tenant personal information, emergency contact details, move-in dates, and canonical unit assignments.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { tenants } from '@/lib/systemState';
import { Search, UserPlus } from 'lucide-vue-next';

const search = ref('');
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Tenant Management</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Active Tenant Directory</h1>
      </div>

      <button class="jira-btn-primary text-xs">
        <UserPlus class="w-3.5 h-3.5" />
        <span>Onboard Tenant</span>
      </button>
    </div>

    <!-- Search Bar -->
    <div class="jira-card p-3">
      <div class="relative w-full md:w-80">
        <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input 
          v-model="search"
          type="text" 
          placeholder="Search tenant name, unit code, phone..." 
          class="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] focus:bg-white focus:outline-none"
        />
      </div>
    </div>

    <!-- Responsive Table -->
    <div class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Tenant Profile</th>
              <th class="py-2.5 px-3">Assigned Canonical Unit</th>
              <th class="py-2.5 px-3">Contact Details</th>
              <th class="py-2.5 px-3">Emergency Contact</th>
              <th class="py-2.5 px-3">Move-In Date</th>
              <th class="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-for="t in tenants" :key="t.id" class="hover:bg-[#f7f8f9]">
              <td class="py-2.5 px-3 font-bold text-[#172b4d]">{{ t.name }}</td>
              <td class="py-2.5 px-3 font-semibold text-[#0c66e4]">{{ t.room }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ t.phone }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ t.emergency }}</td>
              <td class="py-2.5 px-3">{{ t.moveInDate }}</td>
              <td class="py-2.5 px-3">
                <span :class="['jira-badge', t.status === 'Active' ? 'jira-badge-done' : 'jira-badge-emergency']">{{ t.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
