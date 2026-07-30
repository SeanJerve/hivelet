<script setup lang="ts">
/**
 * @component AdminOverviewView
 * @description Executive Decision Support Dashboard displaying key operational metrics,
 *              the canonical 32-Unit Visual Matrix (BR-032), Jira tab bar, and state feedback controls.
 * @systemBibleRef Section 2 & Section 5.1 & BR-032 (Canonical 32 Unit List)
 * @rationale Serves the non-techy landlady with clear, comfortable Jira-style typography,
 *              generous breathing room, soft pastel status indicators, and mobile-first responsiveness.
 * @innovations Built 5-cluster visual room layout strictly conforming to the 32 authentic units
 *              defined in Section 2 of 09_MONTHLY_INCOME_REPORT.md.
 */
import { ref, computed } from 'vue';
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
  LayoutGrid,
  Calendar,
  List,
  FileText,
  Clock,
  Filter,
  SlidersHorizontal
} from 'lucide-vue-next';
import { useToast } from '../lib/useToast';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import { CANONICAL_32_UNITS, PROPERTY_CLUSTERS, type RentableUnit } from '../lib/canonicalUnits';

const { showToast } = useToast();

// Active View Tab (Matching attached Jira UI screenshot)
const activeTab = ref<'board' | 'summary' | 'list' | 'calendar'>('board');

// State for testing confirmation modal
const isConfirmModalOpen = ref(false);
const confirmModalTitle = ref('');
const confirmModalMessage = ref('');
const confirmModalVariant = ref<'danger' | 'primary' | 'warning'>('danger');

// Toast testing handlers
const triggerSuccessToast = () => {
  showToast(
    'Payment Recorded Successfully',
    'Monthly payment for Unit 1a (Juan Dela Cruz) recorded and remitted to ledger.',
    'success'
  );
};

const triggerWaterWarningToast = () => {
  showToast(
    'Water Billing Warning (BR-036)',
    'Water Payment entered is ₱600. Standard calculation for 2 occupants is ₱400 (2 × ₱200/head).',
    'warning',
    6000
  );
};

const triggerErrorToast = () => {
  showToast(
    'Inquiry Conversion Notice',
    'Prospect contact details match an existing active tenant record (Unit 2a). Please review.',
    'error'
  );
};

const openSettleVacancyModal = () => {
  confirmModalTitle.value = 'Settle Vacancy & Deactivate Tenant Account';
  confirmModalMessage.value = 'Are you sure you want to settle the departure for Unit 2a (Grace Poe)? The tenant account will be deactivated and Unit 2a will be marked as Available.';
  confirmModalVariant.value = 'danger';
  isConfirmModalOpen.value = true;
};

const handleConfirmModalAction = () => {
  isConfirmModalOpen.value = false;
  showToast(
    'Room Vacancy Settled',
    'Unit 2a is now marked as Available. Tenant account deactivated and archived in audit log.',
    'success'
  );
};

// Filter State for 32 Canonical Units
const selectedClusterFilter = ref<string>('all');
const selectedStatusFilter = ref<string>('all');

// Filtered Units
const filteredUnits = computed(() => {
  return CANONICAL_32_UNITS.filter(unit => {
    const matchesCluster = selectedClusterFilter.value === 'all' || unit.cluster === selectedClusterFilter.value;
    const matchesStatus = selectedStatusFilter.value === 'all' || unit.status === selectedStatusFilter.value;
    return matchesCluster && matchesStatus;
  });
});

// Group filtered units by cluster for rendering
const unitsByCluster = computed(() => {
  const map = new Map<string, RentableUnit[]>();
  PROPERTY_CLUSTERS.forEach(cluster => {
    const units = filteredUnits.value.filter(u => u.cluster === cluster);
    if (units.length > 0) {
      map.set(cluster, units);
    }
  });
  return map;
});

// Statistics
const occupiedCount = computed(() => CANONICAL_32_UNITS.filter(u => u.status === 'occupied').length);
const availableCount = computed(() => CANONICAL_32_UNITS.filter(u => u.status === 'available').length);
const maintenanceCount = computed(() => CANONICAL_32_UNITS.filter(u => u.status === 'maintenance').length);
const occupancyPercentage = computed(() => ((occupiedCount.value / CANONICAL_32_UNITS.length) * 100).toFixed(1));
</script>

<template>
  <div class="space-y-6 md:space-y-8">
    <!-- Header Title & Jira Workspace Breadcrumbs -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs sm:text-sm text-[#6b778c] mb-1">
          <span>Fe Galang Da Silva Boarding House</span>
          <span>/</span>
          <span class="font-bold text-[#172b4d]">Operations Space</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#172b4d] tracking-tight">Executive Overview</h1>
      </div>

      <!-- Quick Diagnostic Stats -->
      <div class="flex items-center gap-2.5 text-xs sm:text-sm text-[#42526e] bg-white border border-[#dfe1e6] px-3.5 py-2 rounded-md shadow-2xs">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Canonical 32 Units: <strong>BR-032 Aligned</strong></span>
      </div>
    </div>

    <!-- Soft Jira Workspace View Tabs (Directly matching attached screenshot) -->
    <div class="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 border-b border-[#dfe1e6] text-sm">
      <button 
        @click="activeTab = 'board'"
        :class="[
          'px-3.5 py-2 font-bold rounded-md flex items-center gap-2 transition-all shrink-0 min-h-[40px]',
          activeTab === 'board' ? 'bg-[#e9f2ff] text-[#0c66e4]' : 'text-[#5e6c84] hover:bg-[#ebecf0] hover:text-[#172b4d]'
        ]"
      >
        <LayoutGrid class="w-4 h-4" />
        <span>32-Unit Matrix Board</span>
      </button>

      <button 
        @click="activeTab = 'summary'"
        :class="[
          'px-3.5 py-2 font-bold rounded-md flex items-center gap-2 transition-all shrink-0 min-h-[40px]',
          activeTab === 'summary' ? 'bg-[#e9f2ff] text-[#0c66e4]' : 'text-[#5e6c84] hover:bg-[#ebecf0] hover:text-[#172b4d]'
        ]"
      >
        <FileText class="w-4 h-4" />
        <span>Executive Summary</span>
      </button>

      <button 
        @click="activeTab = 'list'"
        :class="[
          'px-3.5 py-2 font-bold rounded-md flex items-center gap-2 transition-all shrink-0 min-h-[40px]',
          activeTab === 'list' ? 'bg-[#e9f2ff] text-[#0c66e4]' : 'text-[#5e6c84] hover:bg-[#ebecf0] hover:text-[#172b4d]'
        ]"
      >
        <List class="w-4 h-4" />
        <span>Canonical Ledger List</span>
      </button>

      <button 
        @click="activeTab = 'calendar'"
        :class="[
          'px-3.5 py-2 font-bold rounded-md flex items-center gap-2 transition-all shrink-0 min-h-[40px]',
          activeTab === 'calendar' ? 'bg-[#e9f2ff] text-[#0c66e4]' : 'text-[#5e6c84] hover:bg-[#ebecf0] hover:text-[#172b4d]'
        ]"
      >
        <Calendar class="w-4 h-4" />
        <span>Billing Cycle Calendar</span>
      </button>
    </div>

    <!-- UI/UX Interactive Feedback Controls (Soft Jira Pill Box) -->
    <div class="jira-card p-5 sm:p-6 bg-[#ffffff] border-l-4 border-l-[#0c66e4] space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <Sparkles class="w-5 h-5 text-[#0c66e4]" />
          <h3 class="text-sm sm:text-base font-bold text-[#172b4d]">Landlady Visual Design Feedback Controls</h3>
        </div>
        <span class="text-xs text-[#6b778c]">Test subtle toast notifications & confirmation modals</span>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <button 
          @click="triggerSuccessToast"
          class="jira-btn-secondary text-xs sm:text-sm border-emerald-300 hover:bg-emerald-50 text-emerald-800"
        >
          <CheckCircle2 class="w-4 h-4 text-emerald-600" />
          Test Success Toast
        </button>

        <button 
          @click="triggerWaterWarningToast"
          class="jira-btn-secondary text-xs sm:text-sm border-amber-300 hover:bg-amber-50 text-amber-800"
        >
          <AlertCircle class="w-4 h-4 text-amber-600" />
          Test Water Rule Warning (BR-036)
        </button>

        <button 
          @click="triggerErrorToast"
          class="jira-btn-secondary text-xs sm:text-sm border-rose-300 hover:bg-rose-50 text-rose-800"
        >
          <AlertCircle class="w-4 h-4 text-rose-600" />
          Test Error Toast
        </button>

        <button 
          @click="openSettleVacancyModal"
          class="jira-btn-primary text-xs sm:text-sm bg-[#bf2600] hover:bg-[#de350b]"
        >
          <Wrench class="w-4 h-4" />
          Test Confirmation Modal (Settle Vacancy)
        </button>
      </div>
    </div>

    <!-- Executive KPI Summary Cards (Mobile-First 1 to 4 Grid, Soft Palette) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <!-- Occupancy KPI Card -->
      <div class="jira-card p-5 sm:p-6 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-[#6b778c] uppercase tracking-wider">Occupancy Rate</span>
          <div class="p-2 rounded-md bg-[#e9f2ff] text-[#0c66e4]">
            <Building2 class="w-5 h-5" />
          </div>
        </div>
        <div class="flex items-baseline gap-3">
          <span class="text-3xl font-extrabold text-[#172b4d]">{{ occupiedCount }} / 32</span>
          <span class="text-xs font-bold text-[#006644] bg-[#e3fcef] px-2 py-1 rounded-md border border-[#abf5d1]">
            {{ occupancyPercentage }}%
          </span>
        </div>
        <p class="text-xs text-[#6b778c] pt-2 border-t border-[#dfe1e6]">
          {{ availableCount }} Available Units across 5 Property Clusters
        </p>
      </div>

      <!-- Overdue Billing Alert Card -->
      <div class="jira-card p-5 sm:p-6 border-l-4 border-l-[#ffab00] space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-[#6b778c] uppercase tracking-wider">Pending Collections</span>
          <div class="p-2 rounded-md bg-[#fffae6] text-[#826100]">
            <CreditCard class="w-5 h-5" />
          </div>
        </div>
        <div class="flex items-baseline gap-3">
          <span class="text-3xl font-extrabold text-[#172b4d]">₱ 18,500</span>
          <span class="text-xs font-bold text-[#826100] bg-[#fffae6] px-2 py-1 rounded-md border border-[#ffe380]">
            3 Pending
          </span>
        </div>
        <p class="text-xs text-[#6b778c] pt-2 border-t border-[#dfe1e6]">
          Individual Move-in Anniversary Aware
        </p>
      </div>

      <!-- Maintenance Tickets Card -->
      <div class="jira-card p-5 sm:p-6 border-l-4 border-l-[#ff5630] space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-[#6b778c] uppercase tracking-wider">Active Maintenance</span>
          <div class="p-2 rounded-md bg-[#ffebe6] text-[#bf2600]">
            <Wrench class="w-5 h-5" />
          </div>
        </div>
        <div class="flex items-baseline gap-3">
          <span class="text-3xl font-extrabold text-[#172b4d]">2</span>
          <span class="text-xs font-bold text-[#bf2600] bg-[#ffebe6] px-2 py-1 rounded-md border border-[#ffbdad]">
            1 Emergency
          </span>
        </div>
        <p class="text-xs text-[#6b778c] pt-2 border-t border-[#dfe1e6]">
          Unit 1e (Faucet) & Unit B2F (Outlet)
        </p>
      </div>

      <!-- Inquiries Inbox Card -->
      <div class="jira-card p-5 sm:p-6 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-[#6b778c] uppercase tracking-wider">New Inquiries</span>
          <div class="p-2 rounded-md bg-[#e9f2ff] text-[#0c66e4]">
            <Users class="w-5 h-5" />
          </div>
        </div>
        <div class="flex items-baseline gap-3">
          <span class="text-3xl font-extrabold text-[#172b4d]">4</span>
          <span class="text-xs font-bold text-[#0747a6] bg-[#deebff] px-2 py-1 rounded-md border border-[#b3d4ff]">
            Awaiting Action
          </span>
        </div>
        <p class="text-xs text-[#6b778c] pt-2 border-t border-[#dfe1e6]">
          Centralized Prospect Inbox
        </p>
      </div>
    </div>

    <!-- 32-Unit Canonical Visual Matrix (BR-032 & Section 2 of Income Report) -->
    <div class="jira-card p-5 sm:p-7 space-y-6">
      <!-- Section Title & Soft Filter Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#dfe1e6]">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-[#172b4d]">Canonical 32-Unit Visual Matrix</h2>
          <p class="text-xs sm:text-sm text-[#6b778c] mt-0.5">
            Strictly aligned with Capstone BR-032: BH (1a-1h, 2a-2g, 3a-3g), Back Apt (B1F-B3B), Penthouse (PH), Front Apt (F1-F2B), Linda (LF, LB)
          </p>
        </div>

        <!-- Filter Controls (Mobile-First Stacked / Row) -->
        <div class="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <!-- Cluster Filter Dropdown -->
          <div class="flex items-center gap-1.5 bg-[#f7f8f9] p-1 border border-[#dfe1e6] rounded-md">
            <Filter class="w-4 h-4 text-[#6b778c] ml-1.5" />
            <select 
              v-model="selectedClusterFilter" 
              class="bg-transparent text-[#172b4d] font-semibold text-xs sm:text-sm pr-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="all">All 5 Property Clusters (32)</option>
              <option v-for="cluster in PROPERTY_CLUSTERS" :key="cluster" :value="cluster">
                {{ cluster }}
              </option>
            </select>
          </div>

          <!-- Status Filter Pills -->
          <div class="flex items-center gap-1 bg-[#f7f8f9] p-1 border border-[#dfe1e6] rounded-md font-semibold text-xs">
            <button 
              @click="selectedStatusFilter = 'all'"
              :class="['px-2.5 py-1 rounded-sm transition-colors', selectedStatusFilter === 'all' ? 'bg-white text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84]']"
            >
              All ({{ CANONICAL_32_UNITS.length }})
            </button>
            <button 
              @click="selectedStatusFilter = 'occupied'"
              :class="['px-2.5 py-1 rounded-sm transition-colors', selectedStatusFilter === 'occupied' ? 'bg-white text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84]']"
            >
              Occupied ({{ occupiedCount }})
            </button>
            <button 
              @click="selectedStatusFilter = 'available'"
              :class="['px-2.5 py-1 rounded-sm transition-colors', selectedStatusFilter === 'available' ? 'bg-white text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84]']"
            >
              Available ({{ availableCount }})
            </button>
          </div>
        </div>
      </div>

      <!-- Cluster Unit Groups -->
      <div class="space-y-8">
        <div v-for="[clusterName, units] in unitsByCluster" :key="clusterName" class="space-y-3">
          <!-- Cluster Section Header -->
          <div class="flex items-center justify-between pb-1 border-b border-[#ebecf0]">
            <div class="flex items-center gap-2">
              <span class="text-xs sm:text-sm font-bold text-[#172b4d] bg-[#f7f8f9] px-3 py-1.5 rounded-md border border-[#dfe1e6] flex items-center gap-2">
                <Layers class="w-4 h-4 text-[#0c66e4]" />
                {{ clusterName }}
              </span>
              <span class="text-xs text-[#6b778c]">({{ units.length }} Rentable Units)</span>
            </div>

            <!-- Linda Rule Badge if applicable -->
            <span v-if="clusterName === 'Linda'" class="text-xs font-bold text-[#826100] bg-[#fffae6] px-2.5 py-0.5 rounded-md border border-[#ffe380]">
              BR-040 Fixed Billing Flow
            </span>
          </div>

          <!-- Unit Cards Grid (Mobile-First: 1 col on mobile, 2 sm, 3 md, 4 lg) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            <div 
              v-for="unit in units" 
              :key="unit.id"
              :class="[
                'p-4 rounded-md border text-left transition-all space-y-2 relative',
                unit.status === 'occupied' 
                  ? 'bg-white border-[#dfe1e6] hover:border-[#0c66e4] hover:shadow-xs' 
                  : unit.status === 'available' 
                    ? 'bg-[#e3fcef]/40 border-[#abf5d1] hover:border-[#36b37e]' 
                    : 'bg-[#ffebe6]/40 border-[#ffbdad]'
              ]"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-sm sm:text-base font-extrabold text-[#172b4d]">Unit {{ unit.unitCode }}</span>
                  <span class="text-[11px] text-[#6b778c]">({{ unit.type }})</span>
                </div>

                <span 
                  :class="[
                    'jira-badge',
                    unit.status === 'occupied' ? 'jira-badge-done' : unit.status === 'available' ? 'jira-badge-progress' : 'jira-badge-emergency'
                  ]"
                >
                  {{ unit.status }}
                </span>
              </div>

              <!-- Tenant Info / Vacant Status -->
              <div class="text-xs sm:text-sm font-semibold text-[#42526e] truncate">
                {{ unit.tenantName ? unit.tenantName : 'Vacant Unit' }}
              </div>

              <!-- Footer Details -->
              <div class="flex items-center justify-between text-xs text-[#6b778c] border-t border-[#dfe1e6]/60 pt-2 mt-1">
                <span>
                  {{ unit.waterRateType === 'linda_fixed' ? 'Fixed Billing' : `${unit.occupants} Occupant${unit.occupants === 1 ? '' : 's'}` }}
                </span>
                <span class="font-bold text-[#172b4d]">₱{{ unit.basePrice.toLocaleString() }}/mo</span>
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
