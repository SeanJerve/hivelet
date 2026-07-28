<script setup lang="ts">
/**
 * @component AdminOverviewView
 * @description Executive Decision Support Dashboard displaying key operational metrics and the 32-Room Visual Matrix.
 * @systemBibleRef Section 2 & Section 5.1 - Decision Support & Occupancy Matrix
 * @rationale Answers the core capstone question: "What needs the landlady's attention today?"
 *              Provides high-density, minimalist Jira-style cards for 3 floors of rooms.
 * @innovations Built a room-centric visual floor plan matrix representing 32 units across 3 floors
 *              with interactive room status indicators (Occupied, Available, Maintenance).
 */
import { ref } from 'vue';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Filter 
} from 'lucide-vue-next';

// 32-Room Data Structure (3 Floors: Floor 1=101-110, Floor 2=201-210, Floor 3=301-312)
const floors = [
  {
    floorNumber: 1,
    label: '1st Floor (Units 101 - 110)',
    rooms: [
      { id: '101', number: 'Room 101', status: 'occupied', tenant: 'Juan Dela Cruz', type: 'Studio', price: 4500 },
      { id: '102', number: 'Room 102', status: 'occupied', tenant: 'Maria Santos', type: 'Studio', price: 4500 },
      { id: '103', number: 'Room 103', status: 'available', tenant: null, type: '1-Bedroom', price: 6000 },
      { id: '104', number: 'Room 104', status: 'occupied', tenant: 'Pedro Penduko', type: 'Studio', price: 4500 },
      { id: '105', number: 'Room 105', status: 'maintenance', tenant: null, type: 'Studio', price: 4500 },
      { id: '106', number: 'Room 106', status: 'occupied', tenant: 'Ana Reyes', type: '2-Bedroom', price: 8000 },
      { id: '107', number: 'Room 107', status: 'occupied', tenant: 'Carlos Ramos', type: 'Studio', price: 4500 },
      { id: '108', number: 'Room 108', status: 'occupied', tenant: 'Elena Toribio', type: 'Studio', price: 4500 },
      { id: '109', number: 'Room 109', status: 'occupied', tenant: 'Mark Bautista', type: 'Studio', price: 4500 },
      { id: '110', number: 'Room 110', status: 'available', tenant: null, type: '1-Bedroom', price: 6000 },
    ]
  },
  {
    floorNumber: 2,
    label: '2nd Floor (Units 201 - 210)',
    rooms: [
      { id: '201', number: 'Room 201', status: 'occupied', tenant: 'Grace Poe', type: 'Studio', price: 4600 },
      { id: '202', number: 'Room 202', status: 'occupied', tenant: 'Lito Lapid', type: 'Studio', price: 4600 },
      { id: '203', number: 'Room 203', status: 'occupied', tenant: 'Robin Padilla', type: 'Studio', price: 4600 },
      { id: '204', number: 'Room 204', status: 'available', tenant: null, type: '1-Bedroom', price: 6200 },
      { id: '205', number: 'Room 205', status: 'occupied', tenant: 'Joel Villanueva', type: 'Studio', price: 4600 },
      { id: '206', number: 'Room 206', status: 'occupied', tenant: 'Nancy Binay', type: 'Studio', price: 4600 },
      { id: '207', number: 'Room 207', status: 'occupied', tenant: 'Sonny Angara', type: '2-Bedroom', price: 8200 },
      { id: '208', number: 'Room 208', status: 'occupied', tenant: 'Bam Aquino', type: 'Studio', price: 4600 },
      { id: '209', number: 'Room 209', status: 'occupied', tenant: 'Chiz Escudero', type: 'Studio', price: 4600 },
      { id: '210', number: 'Room 210', status: 'occupied', tenant: 'Ping Lacson', type: 'Studio', price: 4600 },
    ]
  },
  {
    floorNumber: 3,
    label: '3rd Floor (Units 301 - 312)',
    rooms: [
      { id: '301', number: 'Room 301', status: 'occupied', tenant: 'Risa Hontiveros', type: 'Studio', price: 4700 },
      { id: '302', number: 'Room 302', status: 'occupied', tenant: 'Koko Pimentel', type: 'Studio', price: 4700 },
      { id: '303', number: 'Room 303', status: 'occupied', tenant: 'Francis Tolentino', type: 'Studio', price: 4700 },
      { id: '304', number: 'Room 304', status: 'occupied', tenant: 'Bong Go', type: 'Studio', price: 4700 },
      { id: '305', number: 'Room 305', status: 'occupied', tenant: 'Bong Revilla', type: 'Studio', price: 4700 },
      { id: '306', number: 'Room 306', status: 'available', tenant: null, type: 'Studio', price: 4700 },
      { id: '307', number: 'Room 307', status: 'occupied', tenant: 'Jinggoy Estrada', type: 'Studio', price: 4700 },
      { id: '308', number: 'Room 308', status: 'occupied', tenant: 'Cynthia Villar', type: '3-Bedroom', price: 10000 },
      { id: '309', number: 'Room 309', status: 'occupied', tenant: 'Mark Villar', type: 'Studio', price: 4700 },
      { id: '310', number: 'Room 310', status: 'occupied', tenant: 'Alan Peter Cayetano', type: 'Studio', price: 4700 },
      { id: '311', number: 'Room 311', status: 'occupied', tenant: 'Pia Cayetano', type: 'Studio', price: 4700 },
      { id: '312', number: 'Room 312', status: 'available', tenant: null, type: '1-Bedroom', price: 6500 },
    ]
  }
];

const selectedFilter = ref('all');
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title & Breadcrumb -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Dashboard Overview</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Executive Overview</h1>
      </div>

      <!-- Quick Diagnostic Stats -->
      <div class="flex items-center gap-2 text-xs text-[#5e6c84] bg-white border border-[#dfe1e6] px-3 py-1.5 rounded-xs shadow-2xs">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>System Status: <strong>Operational</strong></span>
      </div>
    </div>

    <!-- Executive KPI Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Occupancy KPI Card -->
      <div class="jira-card p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Occupancy Rate</span>
          <Building2 class="w-4 h-4 text-[#0c66e4]" />
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-[#172b4d]">27 / 32</span>
          <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-xs">84.3%</span>
        </div>
        <p class="text-xs text-[#6b778c] mt-2 border-t border-[#dfe1e6] pt-2">
          5 Available Units (103, 110, 204, 306, 312)
        </p>
      </div>

      <!-- Overdue Billing Alert Card -->
      <div class="jira-card p-4 border-l-4 border-l-amber-500">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Pending Collections</span>
          <CreditCard class="w-4 h-4 text-amber-600" />
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-[#172b4d]">₱ 18,500</span>
          <span class="text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs">3 Unverified</span>
        </div>
        <p class="text-xs text-[#6b778c] mt-2 border-t border-[#dfe1e6] pt-2">
          Individual Move-in Date Aware
        </p>
      </div>

      <!-- Maintenance Tickets Card -->
      <div class="jira-card p-4 border-l-4 border-l-rose-500">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">Active Tickets</span>
          <Wrench class="w-4 h-4 text-rose-600" />
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-[#172b4d]">2</span>
          <span class="text-xs font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-xs">1 Emergency</span>
        </div>
        <p class="text-xs text-[#6b778c] mt-2 border-t border-[#dfe1e6] pt-2">
          Room 108 (Faucet) & Room 305 (Outlet)
        </p>
      </div>

      <!-- Inquiries Inbox Card -->
      <div class="jira-card p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-[#6b778c] uppercase tracking-wider">New Inquiries</span>
          <Users class="w-4 h-4 text-[#0c66e4]" />
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-[#172b4d]">4</span>
          <span class="text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-xs">Awaiting Reply</span>
        </div>
        <p class="text-xs text-[#6b778c] mt-2 border-t border-[#dfe1e6] pt-2">
          Centralized Prospect Inbox
        </p>
      </div>
    </div>

    <!-- 32-Room Visual Occupancy Matrix Header & Filter -->
    <div class="jira-card p-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#dfe1e6]">
        <div>
          <h2 class="text-base font-bold text-[#172b4d]">32-Room Visual Matrix</h2>
          <p class="text-xs text-[#6b778c]">Room-centric operational visual plan across all 3 floors</p>
        </div>

        <!-- Filter Pills -->
        <div class="flex items-center gap-1.5 bg-[#f4f5f7] p-1 border border-[#dfe1e6] rounded-xs text-xs">
          <button 
            @click="selectedFilter = 'all'"
            :class="['px-2.5 py-1 rounded-2xs font-medium transition-colors', selectedFilter === 'all' ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs' : 'text-[#5e6c84]']"
          >
            All (32)
          </button>
          <button 
            @click="selectedFilter = 'occupied'"
            :class="['px-2.5 py-1 rounded-2xs font-medium transition-colors', selectedFilter === 'occupied' ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs' : 'text-[#5e6c84]']"
          >
            Occupied (27)
          </button>
          <button 
            @click="selectedFilter = 'available'"
            :class="['px-2.5 py-1 rounded-2xs font-medium transition-colors', selectedFilter === 'available' ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs' : 'text-[#5e6c84]']"
          >
            Available (4)
          </button>
        </div>
      </div>

      <!-- Floor Plan Grid -->
      <div class="space-y-6">
        <div v-for="floor in floors" :key="floor.floorNumber" class="space-y-2.5">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-[#172b4d] bg-[#ebecf0] px-2 py-0.5 rounded-xs border border-[#dfe1e6]">
              {{ floor.label }}
            </span>
          </div>

          <!-- Room Cards Grid (Responsive Grid) -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            <div 
              v-for="room in floor.rooms" 
              :key="room.id"
              v-show="selectedFilter === 'all' || selectedFilter === room.status"
              :class="[
                'p-2.5 rounded-xs border text-left transition-all relative',
                room.status === 'occupied' 
                  ? 'bg-white border-[#dfe1e6] hover:border-[#0c66e4]' 
                  : room.status === 'available' 
                    ? 'bg-[#e3fcef] border-[#abf5d1] hover:border-[#36b37e]' 
                    : 'bg-[#ffebe6] border-[#ffbdad]'
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold text-[#172b4d]">{{ room.number }}</span>
                <span 
                  :class="[
                    'jira-badge',
                    room.status === 'occupied' ? 'jira-badge-done' : room.status === 'available' ? 'jira-badge-progress' : 'jira-badge-emergency'
                  ]"
                >
                  {{ room.status }}
                </span>
              </div>

              <div class="text-[11px] text-[#5e6c84] truncate mb-1">
                {{ room.tenant || 'Vacant Unit' }}
              </div>

              <div class="flex items-center justify-between text-[10px] text-[#6b778c] border-t border-[#dfe1e6/50] pt-1">
                <span>{{ room.type }}</span>
                <span class="font-semibold text-[#172b4d]">₱{{ room.price.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
