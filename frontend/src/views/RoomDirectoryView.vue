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
  Wrench,
  ChevronDown,
  ShieldCheck
} from 'lucide-vue-next';

type ViewMode = 'matrix' | 'table';

const q = ref('');
const cluster = ref('All');
const selectedStatus = ref<string>('All');
const viewMode = ref<ViewMode>('matrix');
const isLoading = ref(true);

async function fetchRooms() {
  isLoading.value = true;
  try {
    await Promise.all([
      fetchRoomsState(),
      fetchTenants()
    ]);
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
  vacant: 'border-border bg-background',
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

function getStatusIcon(status: UnitStatus) {
  if (status === 'settled') return ShieldCheck;
  if (status === 'pending') return Clock;
  if (status === 'overdue') return AlertCircle;
  if (status === 'maintenance') return Wrench;
  return Home;
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
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-bold text-foreground">Room &amp; Rate Directory</span>
        </div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Room &amp; Rate Directory
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          Canonical 33-unit inventory with live operational statuses, rates, and occupancy across 5 clusters.
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center gap-3">
        <!-- View Mode Switcher -->
        <div class="h-10 inline-flex items-center rounded-xl border border-border bg-muted p-1 shadow-2xs">
          <button
            type="button"
            @click="viewMode = 'matrix'"
            :class="[
              'h-8 inline-flex items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all cursor-pointer',
              viewMode === 'matrix' 
                ? 'bg-white text-primary shadow-xs' 
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >
            <LayoutGrid class="size-3.5" />
            <span>Visual Matrix</span>
          </button>

          <button
            type="button"
            @click="viewMode = 'table'"
            :class="[
              'h-8 inline-flex items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all cursor-pointer',
              viewMode === 'table' 
                ? 'bg-white text-primary shadow-xs' 
                : 'text-muted-foreground hover:text-foreground'
            ]"
          >
            <TableIcon class="size-3.5" />
            <span>Table Register</span>
          </button>
        </div>

        <button
          @click="fetchRooms"
          :disabled="isLoading"
          class="btn-secondary"
          title="Refresh Directory"
        >
          <RefreshCw :class="['size-3.5 text-muted-foreground', isLoading ? 'animate-spin text-primary' : '']" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Inventory Quick Stats Bar (Standardized surface-card p-5 size) -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div 
        @click="selectedStatus = 'All'"
        :class="[
          'surface-card p-5 cursor-pointer transition-all hover:shadow-xs',
          selectedStatus === 'All' ? 'ring-2 ring-primary' : ''
        ]"
      >
        <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Total Inventory</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-foreground">33 Units</p>
        <p class="mt-1 text-xs text-muted-foreground">Across 5 clusters &amp; 3 floors</p>
      </div>

      <div 
        @click="selectedStatus = 'settled'"
        :class="[
          'surface-card p-5 cursor-pointer transition-all hover:shadow-xs',
          selectedStatus === 'settled' ? 'ring-2 ring-emerald-600' : ''
        ]"
      >
        <p class="text-xs font-extrabold uppercase tracking-widest text-emerald-800">Occupied / Settled</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-emerald-950">{{ occupiedCount }} Units</p>
        <p class="mt-1 text-xs text-emerald-700">Active resident leases</p>
      </div>

      <div 
        @click="selectedStatus = 'vacant'"
        :class="[
          'surface-card p-5 cursor-pointer transition-all hover:shadow-xs',
          selectedStatus === 'vacant' ? 'ring-2 ring-sky-600' : ''
        ]"
      >
        <p class="text-xs font-extrabold uppercase tracking-widest text-sky-800">Vacant / Available</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-sky-950">{{ vacantCount }} Units</p>
        <p class="mt-1 text-xs text-sky-700">Ready for occupancy</p>
      </div>

      <div 
        @click="selectedStatus = 'maintenance'"
        :class="[
          'surface-card p-5 cursor-pointer transition-all hover:shadow-xs',
          selectedStatus === 'maintenance' ? 'ring-2 ring-purple-600' : ''
        ]"
      >
        <p class="text-xs font-extrabold uppercase tracking-widest text-purple-800">Under Maintenance</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-purple-950">{{ maintenanceCount }} Units</p>
        <p class="mt-1 text-xs text-purple-700">Active repair work orders</p>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="surface-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          v-model="q"
          type="text"
          placeholder="Search by unit code, resident name, or unit type…"
          class="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs sm:text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      <select
        v-model="cluster"
        class="min-h-11 rounded-xl border border-border bg-white px-4 text-xs sm:text-sm font-semibold text-foreground focus:border-primary focus:outline-none sm:w-56 cursor-pointer"
      >
        <option value="All">All Clusters (5)</option>
        <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
      </select>

      <select
        v-model="selectedStatus"
        class="min-h-11 rounded-xl border border-border bg-white px-4 text-xs sm:text-sm font-semibold text-foreground focus:border-primary focus:outline-none sm:w-48 cursor-pointer"
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
        class="surface-card rounded-2xl overflow-hidden border border-border"
      >
        <!-- Cluster Header -->
        <header class="flex items-center justify-between gap-3 border-b border-border bg-background px-5 py-3.5">
          <div class="flex items-center gap-2.5">
            <span class="size-2.5 rounded-full bg-foreground"></span>
            <h2 class="font-display text-sm font-black uppercase tracking-wider text-foreground">
              {{ clusterName }}
            </h2>
            <span class="text-xs font-medium text-muted-foreground">
              ({{ getUnitsForCluster(clusterName).length }} units)
            </span>
          </div>

          <div class="flex items-center gap-2 text-xs text-muted-foreground">
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
                STATUS_STYLE[u.status] || 'border-border'
              ]"
            >
              <!-- Card Header -->
              <div>
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-display text-xl font-black uppercase leading-none text-foreground">
                      {{ u.unitCode }}
                    </p>
                    <p class="mt-1 text-xs font-semibold text-muted-foreground">{{ u.type }}</p>
                  </div>
                  <span :class="['badge-soft text-[10px] capitalize font-bold', getStatusBadgeClass(u.status)]">
                    {{ getStatusLabel(u.status) }}
                  </span>
                </div>

                <!-- Occupant & Price Info -->
                <div class="mt-3.5 pt-3 border-t border-border/60 space-y-1">
                  <div class="flex items-center justify-between text-xs gap-1">
                    <span class="text-muted-foreground shrink-0">Occupants:</span>
                    <span class="font-bold text-foreground truncate max-w-[170px] text-right" :title="formatUnitOccupantsSummary(u.unitCode).text">
                      {{ formatUnitOccupantsSummary(u.unitCode).text }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-xs">
                    <span class="text-muted-foreground">Monthly Rate:</span>
                    <span class="tabular font-display font-extrabold text-foreground">
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
                  <Eye class="size-3.5 text-muted-foreground" />
                  <span>Specs</span>
                </button>
                <button
                  type="button"
                  @click="editUnit(u)"
                  class="btn-secondary min-h-9 flex-1 py-1 px-2.5 text-xs gap-1.5 shadow-2xs font-bold hover:border-primary hover:text-primary cursor-pointer"
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
        class="surface-card p-12 text-center rounded-2xl border border-border text-muted-foreground"
      >
        <Search class="size-8 mx-auto mb-2 text-muted-foreground-soft" />
        <p class="font-bold text-sm text-foreground">No units match your filter criteria</p>
        <p class="text-xs mt-1">Try clearing your search query or selecting "All Clusters".</p>
      </div>
    </div>

    <!-- VIEW MODE 2: TABLE REGISTER VIEW -->
    <div v-else class="surface-card overflow-hidden rounded-2xl border border-border">
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[950px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-muted">
            <tr class="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
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
              class="border-b border-border last:border-0 hover:bg-background transition-colors"
            >
              <td class="px-4 py-3.5 font-display font-extrabold uppercase text-foreground">
                {{ u.unitCode.toUpperCase() }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-muted-foreground font-medium">
                {{ u.cluster }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 font-medium text-foreground">
                {{ u.type }}
              </td>

              <td class="px-4 py-3.5 text-xs text-muted-foreground">
                {{ u.billingRule }}
              </td>

              <td class="tabular whitespace-nowrap px-4 py-3.5 font-display font-bold text-foreground">
                {{ peso(u.price) }}
              </td>

              <td class="px-4 py-3.5">
                <span :class="['badge-soft text-xs capitalize font-bold', getStatusBadgeClass(u.status)]">
                  {{ getStatusLabel(u.status) }}
                </span>
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-foreground font-medium" :title="formatUnitOccupantsSummary(u.unitCode).text">
                {{ formatUnitOccupantsSummary(u.unitCode).text }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-right">
                <div class="inline-flex items-center gap-1.5 justify-end">
                  <button 
                    @click="openSpecs(u)"
                    class="btn-secondary min-h-8 px-2.5 py-1 text-xs gap-1 inline-flex items-center shadow-2xs cursor-pointer"
                  >
                    <Eye class="size-3.5 text-muted-foreground" />
                    <span>Specs</span>
                  </button>
                  <button 
                    @click="editUnit(u)"
                    class="btn-secondary min-h-8 px-2.5 py-1 text-xs gap-1 inline-flex items-center shadow-2xs font-semibold cursor-pointer hover:border-primary hover:text-primary"
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
