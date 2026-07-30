<script setup lang="ts">
/**
 * @component AdminOverviewView
 * @description Executive Decision Support Dashboard displaying key operational metrics, 32-Room Visual Matrix,
 *              and live interactive UI/UX feedback test controls.
 * @systemBibleRef Section 2 & Section 5.1 - Decision Support & Occupancy Matrix
 * @rationale Answers the core capstone question: "What needs the landlady's attention today?"
 *              Demonstrates Jira + Notion + Airtable tri-inspiration with high clarity for non-techy users.
 * @innovations Integrated live toast triggers and confirmation modals for visual design system validation.
 */
import { ref } from 'vue';
import { 
  Building2, 
  Users, 
  CreditCard, 
  Wrench, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-vue-next';
import { useToast } from '../lib/useToast';
import ConfirmModal from '../components/ui/ConfirmModal.vue';

const { showToast } = useToast();

// State for testing confirmation modal
const isConfirmModalOpen = ref(false);
const confirmModalTitle = ref('');
const confirmModalMessage = ref('');
const confirmModalVariant = ref<'danger' | 'primary' | 'warning'>('danger');

// Trigger helper functions for design testing
const triggerSuccessToast = () => {
  showToast(
    'Payment Recorded',
    'Monthly rent payment of ₱4,500 for Room 101 recorded and added to financial ledger.',
    'success'
  );
};

const triggerWaterWarningToast = () => {
  showToast(
    'Water Billing Notice (BR-036)',
    'Water Payment entered is ₱600. Expected calculation for 2 occupants is ₱400 (2 × ₱200/head).',
    'warning',
    6000
  );
};

const triggerErrorToast = () => {
  showToast(
    'Inquiry Conversion Failed',
    'Prospect email already associated with an active tenant record. Please verify existing accounts.',
    'error'
  );
};

const openSettleVacancyModal = () => {
  confirmModalTitle.value = 'Settle Vacancy & Deactivate Tenant Account';
  confirmModalMessage.value = 'Are you sure you want to settle the departure for Room 201 (Grace Poe)? The tenant account will be deactivated and Room 201 will be marked as Available.';
  confirmModalVariant.value = 'danger';
  isConfirmModalOpen.value = true;
};

const handleConfirmModalAction = () => {
  isConfirmModalOpen.value = false;
  showToast(
    'Room Vacancy Settled',
    'Room 201 is now marked as Available. Tenant account deactivated and archived in audit log.',
    'success'
  );
};

// 32-Room Data Structure (3 Floors: Floor 1=101-110, Floor 2=201-210, Floor 3=301-312 + 5 Clusters)
const floors = [
  {
    floorNumber: 1,
    label: '1st Floor (Units 101 - 110)',
    rooms: [
      { id: '101', number: 'Room 101', status: 'occupied', tenant: 'Juan Dela Cruz', type: 'Studio', price: 4500, occupants: 2 },
      { id: '102', number: 'Room 102', status: 'occupied', tenant: 'Maria Santos', type: 'Studio', price: 4500, occupants: 1 },
      { id: '103', number: 'Room 103', status: 'available', tenant: null, type: '1-Bedroom', price: 6000, occupants: 0 },
      { id: '104', number: 'Room 104', status: 'occupied', tenant: 'Pedro Penduko', type: 'Studio', price: 4500, occupants: 2 },
      { id: '105', number: 'Room 105', status: 'maintenance', tenant: null, type: 'Studio', price: 4500, occupants: 0 },
      { id: '106', number: 'Room 106', status: 'occupied', tenant: 'Ana Reyes', type: '2-Bedroom', price: 8000, occupants: 3 },
      { id: '107', number: 'Room 107', status: 'occupied', tenant: 'Carlos Ramos', type: 'Studio', price: 4500, occupants: 1 },
      { id: '108', number: 'Room 108', status: 'occupied', tenant: 'Elena Toribio', type: 'Studio', price: 4500, occupants: 1 },
      { id: '109', number: 'Room 109', status: 'occupied', tenant: 'Mark Bautista', type: 'Studio', price: 4500, occupants: 2 },
      { id: '110', number: 'Room 110', status: 'available', tenant: null, type: '1-Bedroom', price: 6000, occupants: 0 },
    ]
  },
  {
    floorNumber: 2,
    label: '2nd Floor (Units 201 - 210)',
    rooms: [
      { id: '201', number: 'Room 201', status: 'occupied', tenant: 'Grace Poe', type: 'Studio', price: 4600, occupants: 2 },
      { id: '202', number: 'Room 202', status: 'occupied', tenant: 'Lito Lapid', type: 'Studio', price: 4600, occupants: 1 },
      { id: '203', number: 'Room 203', status: 'occupied', tenant: 'Robin Padilla', type: 'Studio', price: 4600, occupants: 2 },
      { id: '204', number: 'Room 204', status: 'available', tenant: null, type: '1-Bedroom', price: 6200, occupants: 0 },
      { id: '205', number: 'Room 205', status: 'occupied', tenant: 'Joel Villanueva', type: 'Studio', price: 4600, occupants: 1 },
      { id: '206', number: 'Room 206', status: 'occupied', tenant: 'Nancy Binay', type: 'Studio', price: 4600, occupants: 1 },
      { id: '207', number: 'Room 207', status: 'occupied', tenant: 'Sonny Angara', type: '2-Bedroom', price: 8200, occupants: 3 },
      { id: '208', number: 'Room 208', status: 'occupied', tenant: 'Bam Aquino', type: 'Studio', price: 4600, occupants: 2 },
      { id: '209', number: 'Room 209', status: 'occupied', tenant: 'Chiz Escudero', type: 'Studio', price: 4600, occupants: 1 },
      { id: '210', number: 'Room 210', status: 'occupied', tenant: 'Ping Lacson', type: 'Studio', price: 4600, occupants: 2 },
    ]
  },
  {
    floorNumber: 3,
    label: '3rd Floor (Units 301 - 312)',
    rooms: [
      { id: '301', number: 'Room 301', status: 'occupied', tenant: 'Risa Hontiveros', type: 'Studio', price: 4700, occupants: 1 },
      { id: '302', number: 'Room 302', status: 'occupied', tenant: 'Koko Pimentel', type: 'Studio', price: 4700, occupants: 2 },
      { id: '303', number: 'Room 303', status: 'occupied', tenant: 'Francis Tolentino', type: 'Studio', price: 4700, occupants: 1 },
      { id: '304', number: 'Room 304', status: 'occupied', tenant: 'Bong Go', type: 'Studio', price: 4700, occupants: 1 },
      { id: '305', number: 'Room 305', status: 'occupied', tenant: 'Bong Revilla', type: 'Studio', price: 4700, occupants: 2 },
      { id: '306', number: 'Room 306', status: 'available', tenant: null, type: 'Studio', price: 4700, occupants: 0 },
      { id: '307', number: 'Room 307', status: 'occupied', tenant: 'Jinggoy Estrada', type: 'Studio', price: 4700, occupants: 2 },
      { id: '308', number: 'Room 308', status: 'occupied', tenant: 'Cynthia Villar', type: '3-Bedroom', price: 10000, occupants: 4 },
      { id: '309', number: 'Room 309', status: 'occupied', tenant: 'Mark Villar', type: 'Studio', price: 4700, occupants: 1 },
      { id: '310', number: 'Room 310', status: 'occupied', tenant: 'Alan Peter Cayetano', type: 'Studio', price: 4700, occupants: 1 },
      { id: '311', number: 'Room 311', status: 'occupied', tenant: 'Pia Cayetano', type: 'Studio', price: 4700, occupants: 2 },
      { id: '312', number: 'Room 312', status: 'available', tenant: null, type: '1-Bedroom', price: 6500, occupants: 0 },
    ]
  }
];

const selectedFilter = ref('all');
</script>

<template>
  <div class="space-y-6">
    <!-- Header Title & System Diagnostic Badge -->
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
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>System Design Mode: <strong>Jira + Notion + Airtable Active</strong></span>
      </div>
    </div>

    <!-- UI/UX Interactive Feedback Testing Panel -->
    <div class="jira-card p-4 bg-[#f8f9fa] border-l-4 border-l-[#0c66e4]">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-[#0c66e4]" />
          <h3 class="text-xs font-bold text-[#172b4d] uppercase tracking-wider">UI/UX Design System Feedback Test Controls</h3>
        </div>
        <span class="text-[11px] text-[#6b778c]">Test visual states & non-techy feedback</span>
      </div>
      <p class="text-xs text-[#42526e] mb-3">
        Click any button below to test the instant state feedback engine (Toast Notifications, Water Rule Warnings, and Destructive Action Confirmation Modals):
      </p>

      <div class="flex flex-wrap items-center gap-2.5">
        <button 
          @click="triggerSuccessToast"
          class="jira-btn-secondary text-xs border border-emerald-300 hover:bg-emerald-50 text-emerald-800"
        >
          <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
          Test Success Toast
        </button>

        <button 
          @click="triggerWaterWarningToast"
          class="jira-btn-secondary text-xs border border-amber-300 hover:bg-amber-50 text-amber-800"
        >
          <AlertCircle class="w-3.5 h-3.5 text-amber-600" />
          Test Water Rule Warning (BR-036)
        </button>

        <button 
          @click="triggerErrorToast"
          class="jira-btn-secondary text-xs border border-rose-300 hover:bg-rose-50 text-rose-800"
        >
          <AlertCircle class="w-3.5 h-3.5 text-rose-600" />
          Test Error Toast
        </button>

        <button 
          @click="openSettleVacancyModal"
          class="jira-btn-primary text-xs bg-[#bf2600] hover:bg-[#de350b]"
        >
          <Wrench class="w-3.5 h-3.5" />
          Test Confirmation Modal (Settle Departure)
        </button>
      </div>
    </div>

    <!-- Executive KPI Summary Cards (Notion Clean Elegance + Jira Cards) -->
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

    <!-- 32-Room Visual Occupancy Matrix Header & Filter (Airtable Grid Concept) -->
    <div class="jira-card p-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#dfe1e6]">
        <div>
          <h2 class="text-base font-bold text-[#172b4d]">32-Room Visual Unit Matrix</h2>
          <p class="text-xs text-[#6b778c]">Fe Galang Da Silva Boarding House (3 Floors & Clusters)</p>
        </div>

        <!-- Filter Pills (Airtable Filter Bar Style) -->
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
          <button 
            @click="selectedFilter = 'maintenance'"
            :class="['px-2.5 py-1 rounded-2xs font-medium transition-colors', selectedFilter === 'maintenance' ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs' : 'text-[#5e6c84]']"
          >
            Maintenance (1)
          </button>
        </div>
      </div>

      <!-- Floor Plan Grid -->
      <div class="space-y-6">
        <div v-for="floor in floors" :key="floor.floorNumber" class="space-y-2.5">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-[#172b4d] bg-[#ebecf0] px-2.5 py-1 rounded-xs border border-[#dfe1e6] flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-[#0c66e4]" />
              {{ floor.label }}
            </span>
          </div>

          <!-- Room Cards Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            <div 
              v-for="room in floor.rooms" 
              :key="room.id"
              v-show="selectedFilter === 'all' || selectedFilter === room.status"
              :class="[
                'p-3 rounded-xs border text-left transition-all relative',
                room.status === 'occupied' 
                  ? 'bg-white border-[#dfe1e6] hover:border-[#0c66e4] hover:shadow-xs' 
                  : room.status === 'available' 
                    ? 'bg-[#e3fcef] border-[#abf5d1] hover:border-[#36b37e]' 
                    : 'bg-[#ffebe6] border-[#ffbdad]'
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold text-[#172b4d]">{{ room.number }}</span>
                <span 
                  :class="[
                    'jira-badge text-[10px]',
                    room.status === 'occupied' ? 'jira-badge-done' : room.status === 'available' ? 'jira-badge-progress' : 'jira-badge-emergency'
                  ]"
                >
                  {{ room.status }}
                </span>
              </div>

              <div class="text-[11px] text-[#5e6c84] truncate mb-1">
                {{ room.tenant || 'Vacant Unit' }}
              </div>

              <div class="flex items-center justify-between text-[10px] text-[#6b778c] border-t border-[#dfe1e6/60] pt-1.5 mt-1">
                <span>{{ room.occupants }} Occupant{{ room.occupants === 1 ? '' : 's' }}</span>
                <span class="font-semibold text-[#172b4d]">₱{{ room.price.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reusable Confirmation Modal -->
    <ConfirmModal 
      :is-open="isConfirmModalOpen"
      :title="confirmModalTitle"
      :message="confirmModalMessage"
      :variant="confirmModalVariant"
      confirm-text="Deactivate & Settle"
      cancel-text="Cancel"
      @confirm="handleConfirmModalAction"
      @cancel="isConfirmModalOpen = false"
    />
  </div>
</template>
