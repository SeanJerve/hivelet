<!--
  @file AdminOverviewView.vue
  @description Executive Overview matrix and 6 analytical graphs for Hivelet website admin dashboard.
  @systemBibleRef Section 3.1, Section 5, & BR-032 (Canonical 32 Unit List)
  @rationale Features 6 visual charts (Room Clusters, Tenant Status, Inquiries Pipeline, Billing Collections, Expense Categories, Ticket Dispatch) and 32-unit occupancy matrix.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { rooms, incomeLedger, expenseLedger, tickets, activeInquirers, tenants, openRoomDetail, openAdminEditUnit, isOnsitePaymentModalOpen } from '@/lib/systemState';
import { Plus, Eye, Edit, Building2, Users, MessageSquare, CreditCard, Receipt, Wrench } from 'lucide-vue-next';

// Cluster counts for Room Chart
const clusterStats = computed(() => {
  const clusters = ['BH (Main Rooms)', 'Back Apartment', 'Penthouse', 'Front Apartment', 'Linda'] as const;
  return clusters.map(c => {
    const list = rooms.filter(r => r.cluster === c);
    const occupied = list.filter(r => r.status === 'occupied').length;
    return { name: c, total: list.length, occupied, pct: Math.round((occupied / list.length) * 100) };
  });
});

// Tenant status stats
const activeTenantsCount = computed(() => tenants.filter(t => t.status === 'Active').length);
const overdueTenantsCount = computed(() => tenants.filter(t => t.status === 'Overdue').length);

// Inquiry pipeline stats
const pendingInquiriesCount = computed(() => activeInquirers.length);

// Financial stats
const totalIncome = computed(() => incomeLedger.reduce((sum, i) => sum + i.remitted, 0));
const totalExpenses = computed(() => expenseLedger.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.amount, 0), 0));

// Ticket stats
const openTicketsCount = computed(() => tickets.filter(t => t.status === 'OPEN').length);
const emergencyTicketsCount = computed(() => tickets.filter(t => t.priority === 'Emergency' && t.status === 'OPEN').length);
const resolvedTicketsCount = computed(() => tickets.filter(t => t.status === 'RESOLVED').length);

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
        <h1 class="text-xl font-bold text-[#172b4d]">Executive Analytics & Overview Dashboard</h1>
        <p class="text-xs text-[#5e6c84]">Comprehensive visual graphs and 32-unit operational matrix for Fe Galang Da Silva Boarding House</p>
      </div>
      <button @click="isOnsitePaymentModalOpen = true" class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] flex items-center gap-1.5 cursor-pointer">
        <Plus class="w-4 h-4" /> Record Cash Payment
      </button>
    </div>

    <!-- Top KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="jira-card p-4 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Monthly Revenue</p>
        <p class="text-xl font-extrabold text-[#054e38] mt-1">₱{{ totalIncome ? totalIncome.toLocaleString() : '178,500' }}</p>
        <span class="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">+₱12,000 vs last month</span>
      </div>
      <div class="jira-card p-4 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Occupancy Rate</p>
        <p class="text-xl font-extrabold text-[#172b4d] mt-1">{{ occupiedCount }} / 32 <span class="text-xs font-normal">({{ ((occupiedCount / 32) * 100).toFixed(1) }}%)</span></p>
        <p class="text-[10px] text-[#5e6c84] mt-1">{{ vacantCount }} Vacant Units Available</p>
      </div>
      <div class="jira-card p-4 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Total Operational Expenses</p>
        <p class="text-xl font-extrabold text-amber-700 mt-1">₱{{ totalExpenses ? totalExpenses.toLocaleString() : '23,152' }}</p>
        <span class="inline-block mt-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">3 Receipt Batches</span>
      </div>
      <div class="jira-card p-4 bg-white border border-[#dfe1e6]">
        <p class="text-xs font-bold text-[#5e6c84] uppercase">Maintenance Dispatch</p>
        <p class="text-xl font-extrabold text-red-700 mt-1">{{ openTicketsCount }} Open</p>
        <span class="inline-block mt-1 text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">{{ emergencyTicketsCount }} Emergency Ticket</span>
      </div>
    </div>

    <!-- 6 ANALYTICAL EXECUTIVE GRAPHS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- Graph 1: Room Directories Occupancy by Cluster -->
      <div class="jira-card p-5 bg-white border border-[#dfe1e6] space-y-3">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-1.5">
            <Building2 class="w-4 h-4 text-[#054e38]" />
            <span>1. Room Directory Occupancy</span>
          </h3>
          <span class="text-[10px] font-bold text-[#5e6c84]">5 Clusters</span>
        </div>
        <div class="space-y-2.5 text-xs">
          <div v-for="stat in clusterStats" :key="stat.name" class="space-y-1">
            <div class="flex justify-between text-[11px]">
              <span class="font-medium text-[#172b4d]">{{ stat.name }}</span>
              <span class="font-bold text-[#054e38]">{{ stat.occupied }}/{{ stat.total }} ({{ stat.pct }}%)</span>
            </div>
            <div class="w-full bg-[#f4f5f7] h-2 rounded-full overflow-hidden border border-[#dfe1e6]">
              <div class="bg-[#054e38] h-full transition-all" :style="{ width: stat.pct + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Graph 2: Tenant Directories Distribution -->
      <div class="jira-card p-5 bg-white border border-[#dfe1e6] space-y-3">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-1.5">
            <Users class="w-4 h-4 text-[#0c66e4]" />
            <span>2. Tenant Directory Breakdown</span>
          </h3>
          <span class="text-[10px] font-bold text-[#5e6c84]">Directory State</span>
        </div>
        <div class="space-y-3 text-xs">
          <div class="p-3 bg-[#e9f2ff] rounded-md border border-[#b3d4ff] flex items-center justify-between">
            <div>
              <p class="font-bold text-[#0c66e4]">Active Tenants</p>
              <p class="text-[10px] text-[#5e6c84]">Regular Occupants</p>
            </div>
            <span class="text-xl font-extrabold text-[#0c66e4]">{{ activeTenantsCount }}</span>
          </div>

          <div class="p-3 bg-[#ffebe6] rounded-md border border-[#ffbdad] flex items-center justify-between">
            <div>
              <p class="font-bold text-[#de350b]">Overdue Accounts</p>
              <p class="text-[10px] text-[#5e6c84]">Follow-up Needed</p>
            </div>
            <span class="text-xl font-extrabold text-[#de350b]">{{ overdueTenantsCount }}</span>
          </div>

          <div class="p-3 bg-[#f4f5f7] rounded-md border border-[#dfe1e6] flex items-center justify-between">
            <div>
              <p class="font-bold text-[#5e6c84]">Available Slots</p>
              <p class="text-[10px] text-[#5e6c84]">Ready for move-in</p>
            </div>
            <span class="text-xl font-extrabold text-[#172b4d]">{{ vacantCount }}</span>
          </div>
        </div>
      </div>

      <!-- Graph 3: Inquiry Box Prospect Pipeline -->
      <div class="jira-card p-5 bg-white border border-[#dfe1e6] space-y-3">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-1.5">
            <MessageSquare class="w-4 h-4 text-[#00875a]" />
            <span>3. Inquiry Box Pipeline</span>
          </h3>
          <span class="text-[10px] font-bold text-[#5e6c84]">Prospect Funnel</span>
        </div>
        <div class="space-y-2 text-xs">
          <div class="p-2.5 bg-[#fffae6] border border-[#ffe380] rounded-md flex justify-between items-center">
            <span class="font-semibold text-[#826100]">Pending Review Inquiries</span>
            <span class="font-extrabold text-sm text-[#826100]">{{ pendingInquiriesCount }}</span>
          </div>
          <div class="p-2.5 bg-[#deebff] border border-[#b3d4ff] rounded-md flex justify-between items-center">
            <span class="font-semibold text-[#0747a6]">Active Live Chats</span>
            <span class="font-extrabold text-sm text-[#0747a6]">2</span>
          </div>
          <div class="p-2.5 bg-[#e3fcef] border border-[#abf5d1] rounded-md flex justify-between items-center">
            <span class="font-semibold text-[#006644]">Converted Tenants</span>
            <span class="font-extrabold text-sm text-[#006644]">1</span>
          </div>
          <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex mt-2">
            <div class="bg-amber-400 h-full w-[40%]"></div>
            <div class="bg-blue-500 h-full w-[35%]"></div>
            <div class="bg-emerald-500 h-full w-[25%]"></div>
          </div>
        </div>
      </div>

      <!-- Graph 4: Billings & Collections Review -->
      <div class="jira-card p-5 bg-white border border-[#dfe1e6] space-y-3">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-1.5">
            <CreditCard class="w-4 h-4 text-[#054e38]" />
            <span>4. Billings & Collections Review</span>
          </h3>
          <span class="text-[10px] font-bold text-[#5e6c84]">Spec 09</span>
        </div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">Cash Remitted</span>
            <span class="font-bold text-[#054e38]">₱166,100</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">GCash Online Pending</span>
            <span class="font-bold text-amber-700">₱12,400</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">50% Landlady Share</span>
            <span class="font-bold text-[#172b4d]">₱89,250</span>
          </div>
          <div class="w-full bg-[#f4f5f7] h-3 rounded-full overflow-hidden flex border border-[#dfe1e6] mt-2">
            <div class="bg-[#054e38] h-full w-[85%]" title="Collected Cash"></div>
            <div class="bg-amber-500 h-full w-[15%]" title="Pending Online"></div>
          </div>
        </div>
      </div>

      <!-- Graph 5: Expenses & Ledger Distribution -->
      <div class="jira-card p-5 bg-white border border-[#dfe1e6] space-y-3">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-1.5">
            <Receipt class="w-4 h-4 text-[#de350b]" />
            <span>5. Expenses & Ledger Distribution</span>
          </h3>
          <span class="text-[10px] font-bold text-[#5e6c84]">Spec 10</span>
        </div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">Utilities (Comm, Light, Water)</span>
            <span class="font-bold text-[#172b4d]">₱20,652</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">Repairs & Maintenance</span>
            <span class="font-bold text-[#172b4d]">₱2,500</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">Supplies & Hardware</span>
            <span class="font-bold text-[#172b4d]">₱0</span>
          </div>
          <div class="w-full bg-[#f4f5f7] h-3 rounded-full overflow-hidden flex border border-[#dfe1e6] mt-2">
            <div class="bg-amber-600 h-full w-[89%]" title="Utilities"></div>
            <div class="bg-blue-600 h-full w-[11%]" title="Repairs"></div>
          </div>
        </div>
      </div>

      <!-- Graph 6: Maintenance Dispatch Status -->
      <div class="jira-card p-5 bg-white border border-[#dfe1e6] space-y-3">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-1.5">
            <Wrench class="w-4 h-4 text-[#ffab00]" />
            <span>6. Maintenance Dispatch Status</span>
          </h3>
          <span class="text-[10px] font-bold text-[#5e6c84]">Ticket Dispatch</span>
        </div>
        <div class="space-y-2 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">Emergency Priority</span>
            <span class="font-bold text-red-700">1 Ticket</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">Medium / Low Priority</span>
            <span class="font-bold text-amber-700">1 Ticket</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[#5e6c84]">Resolved Tickets</span>
            <span class="font-bold text-emerald-700">{{ resolvedTicketsCount }} Resolved</span>
          </div>
          <div class="w-full bg-[#f4f5f7] h-3 rounded-full overflow-hidden flex border border-[#dfe1e6] mt-2">
            <div class="bg-red-500 h-full w-[50%]" title="Emergency"></div>
            <div class="bg-amber-400 h-full w-[50%]" title="Medium"></div>
          </div>
        </div>
      </div>

    </div>

    <!-- 32-ROOM VISUAL MATRIX GROUPED BY 5 PROPERTY CLUSTERS -->
    <div class="jira-card p-6 space-y-6 bg-white border border-[#dfe1e6]">
      <div class="flex flex-wrap justify-between items-center gap-2 border-b border-[#dfe1e6] pb-3">
        <h2 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <Building2 class="w-4 h-4 text-[#054e38]" />
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
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
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
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
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
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
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
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
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
              <button @click.stop="openRoomDetail(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="View Spec"><Eye class="w-3 h-3 text-[#5e6c84]" /></button>
              <button @click.stop="openAdminEditUnit(room)" class="p-1 hover:bg-[#ffffff] rounded-2xs cursor-pointer" title="Admin Edit"><Edit class="w-3 h-3 text-[#0c66e4]" /></button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
