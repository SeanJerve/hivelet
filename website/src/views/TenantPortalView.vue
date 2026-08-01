<!--
  @file views/TenantPortalView.vue
  @description Active Tenant Self-Service Workspace for Hivelet website matching canonical unit codes.
  @systemBibleRef Section 4 - Tenant User Role & Section 5.5 - Water Billing Rate Rule (₱200/head)
-->
<script setup lang="ts">
import { ref } from 'vue';
import { Home, CreditCard } from 'lucide-vue-next';

const tenantData = ref({
  name: 'Juan Dela Cruz',
  room: 'Unit 1a',
  roomType: 'BH Main Rooms • Studio Unit',
  occupants: 2, // 2 heads
  baseRent: 4500,
  waterRatePerHead: 200, // ₱200 per head
  totalWater: 400, // 2 x ₱200
  totalMonthlyBill: 4900,
  dueDate: '2026-08-05',
  paymentStatus: 'Paid for July'
});
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="pb-3 border-b border-[#dfe1e6]">
      <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
        <span>Tenant Portal</span>
        <span>/</span>
        <span class="font-medium text-[#172b4d]">{{ tenantData.name }}</span>
      </div>
      <h1 class="text-xl font-bold text-[#172b4d]">My Room & Account Workspace</h1>
    </div>

    <!-- Room Specs & Billing Overview Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Assigned Room Spec Card -->
      <div class="jira-card p-4 space-y-3 bg-white border border-[#dfe1e6]">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <Home class="w-4 h-4 text-[#0c66e4]" />
            <span>Assigned Unit Specs</span>
          </h3>
          <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">Active Occupant</span>
        </div>

        <div class="space-y-2 text-xs text-[#172b4d]">
          <div class="flex justify-between">
            <span class="text-[#5e6c84]">Canonical Unit:</span>
            <strong class="text-[#0c66e4]">{{ tenantData.room }}</strong>
          </div>
          <div class="flex justify-between">
            <span class="text-[#5e6c84]">Unit Classification:</span>
            <span>{{ tenantData.roomType }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#5e6c84]">Registered Occupants:</span>
            <span>{{ tenantData.occupants }} Persons</span>
          </div>
        </div>
      </div>

      <!-- Current Bill Itemized Breakdown Card -->
      <div class="jira-card p-4 space-y-3 bg-white border border-[#dfe1e6]">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <CreditCard class="w-4 h-4 text-[#0c66e4]" />
            <span>Current Month Statement</span>
          </h3>
          <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">{{ tenantData.paymentStatus }}</span>
        </div>

        <div class="space-y-2 text-xs">
          <div class="flex justify-between text-[#172b4d]">
            <span class="text-[#5e6c84]">Base Monthly Rent:</span>
            <span>₱{{ tenantData.baseRent.toLocaleString() }}</span>
          </div>
          <!-- Itemized Water Billing Rule Annotation -->
          <div class="flex justify-between text-[#172b4d]">
            <span class="text-[#5e6c84]">Water Utility (₱200/head x {{ tenantData.occupants }}):</span>
            <span>₱{{ tenantData.totalWater.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between font-bold text-sm text-[#172b4d] border-t border-[#dfe1e6] pt-2">
            <span>Total Monthly Obligation:</span>
            <span class="text-[#0c66e4]">₱{{ tenantData.totalMonthlyBill.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
