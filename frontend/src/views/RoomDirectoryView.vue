<!--
  @file views/RoomDirectoryView.vue
  @description Canonical Room & Rate Directory featuring Live Unit Matrix & Table Register
  @systemBibleRef docs/01_SYSTEM_BIBLE.md Section 17 (Room Directory & Unit Matrix)
  @architectureRef docs/04_ARCHITECTURE.md
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  rooms, 
  fetchRooms as fetchRoomsState, 
  fetchTenants,
  formatUnitOccupantsSummary,
  isAdminEditUnitModalOpen, 
  activeAdminEditUnit, 
  isRoomDetailModalOpen,
  activeRoomDetail,
  type RoomItem 
} from '@/lib/systemState';
import { CLUSTERS, peso, type UnitStatus } from '@/lib/canonicalUnits';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import { 
  Search, 
  Pencil, 
  RefreshCw, 
  LayoutGrid, 
  Table as TableIcon, 
  Eye, 
  Home, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Wrench 
} from 'lucide-vue-next';

type ViewMode = 'matrix' | 'table';

const q = ref('');
const cluster = ref('All');
const selectedStatus = ref<string>('All');
const viewMode = ref<ViewMode>('matrix');
const isLoading = ref(false);

async function fetchRooms() {
  isLoading.value = true;
  try {
    await Promise.all([fetchRoomsState(), fetchTenants()]);
  } catch (err) {
    console.error('fetchRooms failed:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchRooms();
});

const filteredRooms = computed(() => {
  return rooms.filter((u) => {
    const matchesCluster = cluster.value === 'All' || u.cluster === cluster.value;
    const matchesStatus = selectedStatus.value === 'All' || 
      (selectedStatus.value === 'settled' && u.status === 'settled') ||
      (selectedStatus.value === 'pending' && u.status === 'pending') ||
      (selectedStatus.value === 'vacant' && u.status === 'vacant') ||
      (selectedStatus.value === 'maintenance' && u.status === 'maintenance') ||
      (selectedStatus.value === 'overdue' && u.status === 'overdue');

    const query = q.value.toLowerCase().trim();
    const matchesQuery =
      !query ||
      u.unitCode.toLowerCase().includes(query) ||
      (u.tenant || '').toLowerCase().includes(query) ||
      u.type.toLowerCase().includes(query);

    return matchesCluster && matchesStatus && matchesQuery;
  });
});

const activeClusters = computed(() => {
  if (cluster.value !== 'All') {
    return [cluster.value];
  }
  return CLUSTERS;
});

function getUnitsForCluster(clusterName: string) {
  return filteredRooms.value.filter((r) => r.cluster === clusterName);
}

const STATUS_STYLE: Record<UnitStatus, string> = {
  settled: 'border-emerald-200 bg-emerald-50/40',
  pending: 'border-amber-200 bg-amber-50/40',
  overdue: 'border-rose-200 bg-rose-50/40',
  vacant: 'border-[#e7e5e4] bg-[#fafaf9]',
  maintenance: 'border-purple-200 bg-purple-50/40',
};

function getStatusLabel(status: UnitStatus) {
  if (status === 'vacant') return 'Vacant';
  if (status === 'settled') return 'Settled';
  if (status === 'pending') return 'Pending';
  if (status === 'overdue') return 'Overdue';
  if (status === 'maintenance') return 'Under Maintenance';
  return status;
}

function getStatusBadgeClass(status: UnitStatus) {
  if (status === 'settled') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
  if (status === 'overdue') return 'badge-danger';
  if (status === 'maintenance') return 'badge-purple';
  return 'badge-neutral';
}

function editUnit(u: RoomItem) {
  activeAdminEditUnit.value = u;
  isAdminEditUnitModalOpen.value = true;
}

function openSpecs(u: RoomItem) {
  activeRoomDetail.value = u;
  isRoomDetailModalOpen.value = true;
}

// Summary Statistics
const totalCount = computed(() => rooms.length);
const occupiedCount = computed(() => rooms.filter(r => r.status === 'settled' || r.status === 'pending' || r.tenant !== null).length);
const vacantCount = computed(() => rooms.filter(r => r.status === 'vacant').length);
const maintenanceCount = computed(() => rooms.filter(r => r.status === 'maintenance').length);
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Room &amp; Rate Directory
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Canonical 32-unit inventory with live operational statuses, rates, and occupancy across 5 clusters.
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center gap-3">
        <!-- View Mode Switcher -->
        <div class="inline-flex rounded-xl border border-[#e7e5e4] bg-white p-1 shadow-2xs">
          <button
            type="button"
            @click="viewMode = 'matrix'"
            :class="[
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
              viewMode === 'matrix' 
                ? 'bg-[#1c1917] text-white shadow-xs' 
                : 'text-[#71717a] hover:text-[#1c1917]'
            ]"
          >
            <LayoutGrid class="size-3.5" />
            <span>Visual Matrix</span>
          </button>

          <button
            type="button"
            @click="viewMode = 'table'"
            :class="[
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
              viewMode === 'table' 
                ? 'bg-[#1c1917] text-white shadow-xs' 
                : 'text-[#71717a] hover:text-[#1c1917]'
            ]"
          >
            <TableIcon class="size-3.5" />
            <span>Table Register</span>
          </button>
        </div>

        <button
          @click="fetchRooms"
          :disabled="isLoading"
          class="btn-secondary min-h-10 px-3.5 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
          title="Refresh rooms from database"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
          <span>Sync DB</span>
        </button>
      </div>
    </div>

    <!-- Inventory Quick Stats Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div 
        @click="selectedStatus = 'All'"
        :class="[
          'surface-card p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs',
          selectedStatus === 'All' ? 'border-[#1c1917] ring-1 ring-[#1c1917]' : 'border-[#e7e5e4]'
        ]"
      >
        <p class="text-[11px] font-bold uppercase tracking-wider text-[#71717a]">Total Inventory</p>
        <p class="text-xl font-extrabold text-[#1c1917] mt-0.5">{{ totalCount }} Units</p>
      </div>

      <div 
        @click="selectedStatus = 'settled'"
        :class="[
          'surface-card p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs',
          selectedStatus === 'settled' ? 'border-emerald-600 ring-1 ring-emerald-600 bg-emerald-50/40' : 'border-[#e7e5e4]'
        ]"
      >
        <p class="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Occupied / Settled</p>
        <p class="text-xl font-extrabold text-emerald-950 mt-0.5">{{ occupiedCount }} Units</p>
      </div>

      <div 
        @click="selectedStatus = 'vacant'"
        :class="[
          'surface-card p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs',
          selectedStatus === 'vacant' ? 'border-sky-600 ring-1 ring-sky-600 bg-sky-50/40' : 'border-[#e7e5e4]'
        ]"
      >
        <p class="text-[11px] font-bold uppercase tracking-wider text-sky-800">Vacant / Available</p>
        <p class="text-xl font-extrabold text-sky-950 mt-0.5">{{ vacantCount }} Units</p>
      </div>

      <div 
        @click="selectedStatus = 'maintenance'"
        :class="[
          'surface-card p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs',
          selectedStatus === 'maintenance' ? 'border-purple-600 ring-1 ring-purple-600 bg-purple-50/40' : 'border-[#e7e5e4]'
        ]"
      >
        <p class="text-[11px] font-bold uppercase tracking-wider text-purple-800">Under Maintenance</p>
        <p class="text-xl font-extrabold text-purple-950 mt-0.5">{{ maintenanceCount }} Units</p>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="surface-card p-4 rounded-2xl border border-[#e7e5e4] flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
        <input
          v-model="q"
          type="text"
          placeholder="Search by unit code, resident name, or unit type…"
          class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
        />
      </div>

      <select
        v-model="cluster"
        class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm font-semibold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-56 cursor-pointer"
      >
        <option value="All">All Clusters (5)</option>
        <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
      </select>

      <select
        v-model="selectedStatus"
        class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm font-semibold text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-48 cursor-pointer"
      >
        <option value="All">All Statuses</option>
        <option value="settled">Settled / Occupied</option>
        <option value="pending">Pending</option>
        <option value="vacant">Vacant</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </div>

    <!-- SKELETON LOADING STATE -->
    <div v-if="isLoading" class="space-y-6">
      <div v-if="viewMode === 'matrix'" class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <SkeletonCard variant="room" :count="8" />
      </div>
      <SkeletonTable v-else :columns="7" :rows="8" />
    </div>

    <!-- VIEW MODE 1: VISUAL MATRIX VIEW (Live Unit Matrix moved from Overview) -->
    <div v-else-if="viewMode === 'matrix'" class="space-y-6">
      <div 
        v-for="clusterName in activeClusters" 
        :key="clusterName"
        v-show="getUnitsForCluster(clusterName).length > 0"
        class="surface-card rounded-2xl overflow-hidden border border-[#e7e5e4]"
      >
        <!-- Cluster Header -->
        <header class="flex items-center justify-between gap-3 border-b border-[#e7e5e4] bg-[#fafaf9] px-5 py-3.5">
          <div class="flex items-center gap-2.5">
            <span class="size-2.5 rounded-full bg-[#1c1917]"></span>
            <h2 class="font-display text-sm font-black uppercase tracking-wider text-[#1c1917]">
              {{ clusterName }}
            </h2>
            <span class="text-xs font-medium text-[#71717a]">
              ({{ getUnitsForCluster(clusterName).length }} units)
            </span>
          </div>

          <div class="flex items-center gap-2 text-xs text-[#71717a]">
            <span>Active Inventory</span>
          </div>
        </header>

        <!-- Units Grid -->
        <div class="p-5">
          <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <article
              v-for="u in getUnitsForCluster(clusterName)"
              :key="u.unitCode"
              :class="[
                'rounded-2xl border p-4 transition-all hover:shadow-md bg-white flex flex-col justify-between',
                STATUS_STYLE[u.status] || 'border-[#e7e5e4]'
              ]"
            >
              <!-- Card Header -->
              <div>
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-display text-xl font-black uppercase leading-none text-[#1c1917]">
                      {{ u.unitCode }}
                    </p>
                    <p class="mt-1 text-xs font-semibold text-[#71717a]">{{ u.type }}</p>
                  </div>
                  <span :class="['badge-soft text-[10px] capitalize font-bold', getStatusBadgeClass(u.status)]">
                    {{ getStatusLabel(u.status) }}
                  </span>
                </div>

                <!-- Occupant & Price Info -->
                <div class="mt-3.5 pt-3 border-t border-[#e7e5e4]/60 space-y-1">
                  <div class="flex items-center justify-between text-xs gap-1">
                    <span class="text-[#71717a] shrink-0">Occupants:</span>
                    <span class="font-bold text-[#1c1917] truncate max-w-[170px] text-right" :title="formatUnitOccupantsSummary(u.unitCode).text">
                      {{ formatUnitOccupantsSummary(u.unitCode).text }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-xs">
                    <span class="text-[#71717a]">Monthly Rate:</span>
                    <span class="tabular font-display font-extrabold text-[#1c1917]">
                      {{ peso(u.price) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="mt-4 flex gap-2 pt-2">
                <button
                  type="button"
                  @click="openSpecs(u)"
                  class="btn-secondary min-h-9 flex-1 py-1 px-2.5 text-xs gap-1.5 shadow-2xs font-semibold cursor-pointer"
                >
                  <Eye class="size-3.5 text-[#71717a]" />
                  <span>Specs</span>
                </button>
                <button
                  type="button"
                  @click="editUnit(u)"
                  class="btn-secondary min-h-9 flex-1 py-1 px-2.5 text-xs gap-1.5 shadow-2xs font-bold hover:border-[#0c66e4] hover:text-[#0c66e4] cursor-pointer"
                >
                  <Pencil class="size-3.5" />
                  <span>Edit Unit</span>
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>

      <!-- Empty Filter State -->
      <div 
        v-if="filteredRooms.length === 0" 
        class="surface-card p-12 text-center rounded-2xl border border-[#e7e5e4] text-[#71717a]"
      >
        <Search class="size-8 mx-auto mb-2 text-[#a1a1aa]" />
        <p class="font-bold text-sm text-[#1c1917]">No units match your filter criteria</p>
        <p class="text-xs mt-1">Try clearing your search query or selecting "All Clusters".</p>
      </div>
    </div>

    <!-- VIEW MODE 2: TABLE REGISTER VIEW -->
    <div v-else class="surface-card overflow-hidden rounded-2xl border border-[#e7e5e4]">
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[950px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a] border-b border-[#e7e5e4]">
              <th class="whitespace-nowrap px-4 py-3 font-bold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">CLUSTER</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">TYPE</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">BILLING RULE</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">RATE (₱/MO)</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">REGISTERED OCCUPANTS</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="u in filteredRooms" 
              :key="u.unitCode"
              class="border-b border-[#e7e5e4] last:border-0 hover:bg-[#fafaf9] transition-colors"
            >
              <td class="px-4 py-3.5 font-display font-extrabold uppercase text-[#1c1917]">
                {{ u.unitCode.toUpperCase() }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-[#71717a] font-medium">
                {{ u.cluster }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 font-medium text-[#1c1917]">
                {{ u.type }}
              </td>

              <td class="px-4 py-3.5 text-xs text-[#71717a]">
                {{ u.billingRule }}
              </td>

              <td class="tabular whitespace-nowrap px-4 py-3.5 font-display font-bold text-[#1c1917]">
                {{ peso(u.price) }}
              </td>

              <td class="px-4 py-3.5">
                <span :class="['badge-soft text-xs capitalize font-bold', getStatusBadgeClass(u.status)]">
                  {{ getStatusLabel(u.status) }}
                </span>
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-[#1c1917] font-medium" :title="formatUnitOccupantsSummary(u.unitCode).text">
                {{ formatUnitOccupantsSummary(u.unitCode).text }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-right">
                <div class="inline-flex items-center gap-1.5 justify-end">
                  <button 
                    @click="openSpecs(u)"
                    class="btn-secondary min-h-8 px-2.5 py-1 text-xs gap-1 inline-flex items-center shadow-2xs cursor-pointer"
                  >
                    <Eye class="size-3.5 text-[#71717a]" />
                    <span>Specs</span>
                  </button>
                  <button 
                    @click="editUnit(u)"
                    class="btn-secondary min-h-8 px-2.5 py-1 text-xs gap-1 inline-flex items-center shadow-2xs font-semibold cursor-pointer hover:border-[#0c66e4] hover:text-[#0c66e4]"
                  >
                    <Pencil class="size-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
