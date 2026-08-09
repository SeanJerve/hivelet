<!--
  @file views/AdminDashboardView.vue
  @description Donezo-inspired executive dashboard featuring 32-room occupancy matrix across 5 Property Clusters, Spec 09/10 ledgers, and ticket dispatch.
  @systemBibleRef Section 3 & Section 5 - Property Model
-->
<script setup lang="ts">
import { computed } from 'vue';
import { rooms, incomeLedger, tickets, openRoomDetail, openAdminEditUnit, isOnsitePaymentModalOpen } from '@/lib/systemState';
import { Plus, Eye, Edit, Building2 } from 'lucide-vue-next';

const occupiedCount = computed(() => rooms.filter(r => r.status === 'occupied').length);
const vacantCount = computed(() => rooms.filter(r => r.status === 'available').length);
const totalRevenue = computed(() => incomeLedger.reduce((sum, i) => sum + i.remitted, 0));
const onlinePendingCount = computed(() => incomeLedger.filter(i => i.paymentMethod === 'Online').length);
const onlinePendingAmount = computed(() => incomeLedger.filter(i => i.paymentMethod === 'Online').reduce((sum, i) => sum + i.remitted, 0));
const openTicketsCount = computed(() => tickets.filter(t => t.status === 'OPEN').length);
const emergencyTicketsCount = computed(() => tickets.filter(t => t.status === 'OPEN' && t.priority === 'Emergency').length);
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
    <!-- Header Controls -->
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[#172b4d] font-display">Executive Dashboard</h1>
        <p class="text-xs text-[#5e6c84]">Donezo-Inspired Management Suite for Fe Galang Da Silva Boarding House</p>
      </div>
      <button @click="isOnsitePaymentModalOpen = true" class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] flex items-center gap-1.5 cursor-pointer">
        <Plus class="w-4 h-4" /> Record Cash Payment
      </button>
    </div>

    <!-- Donezo-Inspired Metric Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="jira-card p-5 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Monthly Revenue</p>
        <p class="text-2xl font-extrabold text-[#054e38] mt-1">₱{{ totalRevenue.toLocaleString() }}</p>
        <span class="inline-block mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Current Remittances</span>
      </div>

      <div class="jira-card p-5 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Occupancy Rate</p>
        <p class="text-2xl font-extrabold text-[#172b4d] mt-1">{{ occupiedCount }} / 32 <span class="text-xs font-normal">({{ ((occupiedCount / 32) * 100).toFixed(1) }}%)</span></p>
        <p class="text-[10px] text-[#5e6c84] mt-2">{{ vacantCount }} Vacant Units Available</p>
      </div>

      <div class="jira-card p-5 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Pending Verifications</p>
        <p class="text-2xl font-extrabold text-amber-700 mt-1">₱{{ onlinePendingAmount.toLocaleString() }}</p>
        <span class="inline-block mt-2 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">{{ onlinePendingCount }} Online Payments</span>
      </div>

      <div class="jira-card p-5 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Maintenance Tickets</p>
        <p class="text-2xl font-extrabold text-red-700 mt-1">{{ openTicketsCount }} Open</p>
        <span class="inline-block mt-2 text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">{{ emergencyTicketsCount }} Emergency Tickets</span>
      </div>
    </div>

    <!-- 32-ROOM OCCUPANCY MATRIX (5 PROPERTY CLUSTERS) -->
    <div class="jira-card p-6 space-y-6">
      <div class="flex flex-wrap justify-between items-center gap-2 border-b border-[#dfe1e6] pb-3">
        <h2 class="text-base font-bold text-[#172b4d] font-display flex items-center gap-2">
          <Building2 class="w-5 h-5 text-[#054e38]" />
          <span>32 Canonical Rentable Units (5 Property Clusters)</span>
        </h2>
        <div class="flex items-center gap-3 text-xs text-[#5e6c84]">
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-emerald-500 rounded-2xs"></span> Settled</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-amber-500 rounded-2xs"></span> Pending</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-red-500 rounded-2xs"></span> Overdue</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-slate-300 rounded-2xs"></span> Vacant</span>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        <div
          v-for="room in rooms"
          :key="room.id"
          :class="[
            'p-3 border rounded-lg text-xs space-y-1 relative group cursor-pointer transition-all hover:shadow-md',
            room.status === 'occupied' && room.paid ? 'bg-emerald-50 border-emerald-300' :
            room.status === 'pending' ? 'bg-amber-50 border-amber-300' :
            room.status === 'overdue' ? 'bg-red-50 border-red-300' : 'bg-[#f4f5f7] border-[#dfe1e6]'
          ]"
        >
          <div class="flex justify-between items-center font-bold">
            <span>Unit {{ room.unitCode }}</span>
            <span class="text-[9px] text-[#5e6c84]">{{ room.type }}</span>
          </div>
          <p class="text-[10px] text-[#5e6c84] truncate">{{ room.tenant || 'Vacant' }}</p>
          <div class="flex gap-1 pt-1.5 border-t border-[#dfe1e6]">
            <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
            <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
