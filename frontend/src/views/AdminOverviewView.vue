<!--
  @file views/AdminOverviewView.vue
  @description Admin Executive Overview matrix featuring all 32 Canonical Units grouped by the 5 Property Clusters.
  @systemBibleRef Section 3.1, Section 5, & BR-032 (Canonical 32 Unit List)
  @rationale Matches RoomDirectoryView and system Bible, rendering all 32 canonical units across the 5 Property Clusters.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { rooms, openRoomDetail, openAdminEditUnit, isOnsitePaymentModalOpen } from '@/lib/systemState';
import { Plus, Eye, Edit, Building2 } from 'lucide-vue-next';

const bhRooms = computed(() => rooms.filter(r => r.cluster === 'BH (Main Rooms)'));
const backAptRooms = computed(() => rooms.filter(r => r.cluster === 'Back Apartment'));
const penthouseRooms = computed(() => rooms.filter(r => r.cluster === 'Penthouse'));
const frontAptRooms = computed(() => rooms.filter(r => r.cluster === 'Front Apartment'));
const lindaRooms = computed(() => rooms.filter(r => r.cluster === 'Linda'));

const occupiedCount = computed(() => rooms.filter(r => r.status === 'occupied').length);
const vacantCount = computed(() => rooms.filter(r => r.status === 'available').length);
</script>

<template>
  <div class="space-y-6">
    <!-- Header Controls -->
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div>
        <h1 class="text-xl font-bold text-[#172b4d]">System Overview Dashboard</h1>
        <p class="text-xs text-[#5e6c84]">Executive Matrix matching Canonical 32 Units across 5 Property Clusters</p>
      </div>
      <button @click="isOnsitePaymentModalOpen = true" class="jira-btn-primary flex items-center gap-1.5">
        <Plus class="w-4 h-4" /> Record On-Site Cash Payment
      </button>
    </div>

    <!-- Top KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="jira-card p-4">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Monthly Revenue</p>
        <p class="text-xl font-bold text-[#0c66e4] mt-1">₱178,500</p>
        <p class="text-[10px] text-emerald-700 mt-1">+₱12,000 vs last month</p>
      </div>
      <div class="jira-card p-4">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Occupancy Rate</p>
        <p class="text-xl font-bold text-[#172b4d] mt-1">{{ occupiedCount }} / 32 <span class="text-xs font-normal">({{ ((occupiedCount / 32) * 100).toFixed(1) }}%)</span></p>
        <p class="text-[10px] text-[#5e6c84] mt-1">{{ vacantCount }} Vacant Units</p>
      </div>
      <div class="jira-card p-4">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Pending Verifications</p>
        <p class="text-xl font-bold text-amber-700 mt-1">₱12,400</p>
        <p class="text-[10px] text-[#5e6c84] mt-1">2 GCash Verifications</p>
      </div>
      <div class="jira-card p-4">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Maintenance Tickets</p>
        <p class="text-xl font-bold text-red-700 mt-1">2 Open</p>
        <p class="text-[10px] text-[#5e6c84] mt-1">1 Emergency Ticket</p>
      </div>
    </div>

    <!-- 32-ROOM VISUAL MATRIX GROUPED BY 5 PROPERTY CLUSTERS -->
    <div class="jira-card p-6 space-y-6">
      <div class="flex flex-wrap justify-between items-center gap-2 border-b border-[#dfe1e6] pb-3">
        <h2 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <Building2 class="w-4 h-4 text-[#0c66e4]" />
          <span>Canonical 32-Unit Occupancy Matrix (5 Property Clusters)</span>
        </h2>
        <div class="flex items-center gap-3 text-xs text-[#5e6c84]">
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-emerald-500 rounded-2xs"></span> Settled</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-amber-500 rounded-2xs"></span> Pending</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-red-500 rounded-2xs"></span> Overdue</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 bg-slate-300 rounded-2xs"></span> Vacant</span>
        </div>
      </div>

      <!-- Cluster 1: BH (Main Rooms) - 22 Units -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84]">1. BH (MAIN ROOMS) — 22 UNITS (1a–1h, 2a–2g, 3a–3g)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-6 md:grid-cols-11 gap-2">
          <div
            v-for="room in bhRooms"
            :key="room.id"
            :class="[
              'p-2 border rounded-xs text-xs space-y-1 relative group cursor-pointer transition-shadow hover:shadow-md',
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
            <div class="flex gap-1 pt-1 border-t border-[#dfe1e6]">
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cluster 2: Back Apartment - 5 Units -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84]">2. BACK APARTMENT — 5 UNITS (B1F, B2F, B2B, B3F, B3B)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div
            v-for="room in backAptRooms"
            :key="room.id"
            :class="[
              'p-2 border rounded-xs text-xs space-y-1 relative group cursor-pointer transition-shadow hover:shadow-md',
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
            <div class="flex gap-1 pt-1 border-t border-[#dfe1e6]">
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cluster 3: Penthouse - 1 Unit -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84]">3. PENTHOUSE — 1 UNIT (PH)</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div
            v-for="room in penthouseRooms"
            :key="room.id"
            :class="[
              'p-2 border rounded-xs text-xs space-y-1 relative group cursor-pointer transition-shadow hover:shadow-md',
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
            <div class="flex gap-1 pt-1 border-t border-[#dfe1e6]">
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cluster 4: Front Apartment - 3 Units -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84]">4. FRONT APARTMENT — 3 UNITS (F1, F2F, F2B)</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div
            v-for="room in frontAptRooms"
            :key="room.id"
            :class="[
              'p-2 border rounded-xs text-xs space-y-1 relative group cursor-pointer transition-shadow hover:shadow-md',
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
            <div class="flex gap-1 pt-1 border-t border-[#dfe1e6]">
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Cluster 5: Linda Units - 2 Units -->
      <div class="space-y-2">
        <h3 class="text-xs font-bold text-[#5e6c84]">5. LINDA UNITS — 2 UNITS (LF, LB) [BR-040 FIXED RATES]</h3>
        <div class="grid grid-cols-2 sm:grid-cols-2 gap-2">
          <div
            v-for="room in lindaRooms"
            :key="room.id"
            :class="[
              'p-2 border rounded-xs text-xs space-y-1 relative group cursor-pointer transition-shadow hover:shadow-md',
              room.status === 'occupied' && room.paid ? 'bg-amber-50 border-amber-300' :
              room.status === 'pending' ? 'bg-amber-50 border-amber-300' :
              room.status === 'overdue' ? 'bg-red-50 border-red-300' : 'bg-[#f4f5f7] border-[#dfe1e6]'
            ]"
          >
            <div class="flex justify-between items-center font-bold">
              <span>Unit {{ room.unitCode }}</span>
              <span class="text-[9px] text-[#826100] font-bold">Fixed Rates</span>
            </div>
            <p class="text-[10px] text-[#5e6c84] truncate">{{ room.tenant || 'Vacant' }}</p>
            <div class="flex gap-1 pt-1 border-t border-[#dfe1e6]">
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
