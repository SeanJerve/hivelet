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
  roomsFetchFailed,
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
      (selectedStatus.value === 'maintenance' && u.status === 'maintenance');

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

/** Occupied and total for one cluster, from the same rows the grid draws. */
function clusterOccupancy(clusterName: string) {
  const units = getUnitsForCluster(clusterName);
  return {
    total: units.length,
    occupied: units.filter((u) => u.status === 'settled' || u.status === 'pending' || u.tenant !== null).length,
  };
}

function getUnitsForCluster(clusterName: string) {
  return filteredRooms.value.filter((r) => r.cluster === clusterName);
}

const STATUS_STYLE: Record<UnitStatus, string> = {
  settled: 'border-brand-soft bg-brand-soft/40',
  pending: 'border-verify-soft bg-verify-soft/40',
  vacant: 'border-line bg-canvas',
  maintenance: 'border-brand-soft bg-brand-soft/40',
};

function getStatusLabel(status: UnitStatus) {
  if (status === 'vacant') return 'Vacant';
  if (status === 'settled') return 'Settled';
  if (status === 'pending') return 'Pending';
  if (status === 'maintenance') return 'Under Maintenance';
  return status;
}

function getStatusIcon(status: UnitStatus) {
  if (status === 'settled') return ShieldCheck;
  if (status === 'pending') return Clock;
  if (status === 'maintenance') return Wrench;
  return Home;
}

function getStatusBadgeClass(status: UnitStatus) {
  if (status === 'settled') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
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
    <!--
      `rooms` is SEEDED. If the fetch fails it keeps the built-in list, and the
      rates below are then whatever was hardcoded at build time - 30 of the 33
      seeded prices no longer match the database. This screen is called the Room
      and RATE Directory, and its whole job is to be believed, so a failed load
      has to say so rather than quietly show the old figures.
    -->
    <div
      v-if="roomsFetchFailed"
      class="p-4 bg-verify-soft border border-verify-soft rounded-tile flex items-start gap-3 text-xs text-verify"
    >
      <AlertCircle class="size-4 shrink-0 mt-0.5 text-verify" />
      <div>
        <p class="font-semibold">These rates could not be refreshed, and may be out of date.</p>
        <p class="mt-0.5">
          The unit list below is the built-in one, not the live database. Do not quote a
          rate from this screen until it reloads &mdash; refresh to retry.
        </p>
      </div>
    </div>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-ink-soft mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-semibold text-ink">Room &amp; Rate Directory</span>
        </div>
        <h1 class="text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          Room &amp; Rate Directory
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-ink-soft">
          Canonical 33-unit inventory with live operational statuses, rates, and occupancy across 5 clusters.
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="flex items-center gap-3">
        <!-- View Mode Switcher -->
        <div class="h-10 inline-flex items-center rounded-xl border border-line bg-canvas p-1">
          <button
            type="button"
            @click="viewMode = 'matrix'"
            :class="[ 'h-8 inline-flex items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all cursor-pointer', viewMode === 'matrix' ? 'bg-tile text-brand ' : 'text-ink-soft hover:text-ink' ]"
          >
            <LayoutGrid class="size-3.5" />
            <span>Visual Matrix</span>
          </button>

          <button
            type="button"
            @click="viewMode = 'table'"
            :class="[ 'h-8 inline-flex items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all cursor-pointer', viewMode === 'table' ? 'bg-tile text-brand ' : 'text-ink-soft hover:text-ink' ]"
          >
            <TableIcon class="size-3.5" />
            <span>Table Register</span>
          </button>
        </div>

        <button
          @click="fetchRooms"
          :disabled="isLoading"
          class="pill-btn"
          title="Refresh Directory"
        >
          <RefreshCw :class="['size-3.5 text-ink-soft', isLoading ? 'animate-spin text-brand' : '']" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Inventory Quick Stats Bar (Standardized rounded-tile bg-tile p-5 size) -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div 
        @click="selectedStatus = 'All'"
        :class="[ 'rounded-tile bg-tile p-5 cursor-pointer transition-all hover:', selectedStatus === 'All' ? 'ring-2 ring-brand' : '' ]"
      >
        <p class="text-xs text-ink-faint">Total Inventory</p>
        <p class="tabular mt-2 text-2xl sm:text-3xl font-semibold text-ink">33 Units</p>
        <!-- 4 floors: 1-3 residential, 4 the rooftop penthouse. See PublicGuestView. -->
        <p class="mt-1 text-xs text-ink-soft">Across 5 clusters &amp; 4 floors</p>
      </div>

      <div 
        @click="selectedStatus = 'settled'"
        :class="[ 'rounded-tile bg-tile p-5 cursor-pointer transition-all hover:', selectedStatus === 'settled' ? 'ring-2 ring-emerald-600' : '' ]"
      >
        <p class="text-xs font-semibold text-brand">Occupied / Settled</p>
        <p class="tabular mt-2 text-2xl sm:text-3xl font-semibold text-brand">{{ occupiedCount }} Units</p>
        <p class="mt-1 text-xs text-brand">Active resident leases</p>
      </div>

      <div 
        @click="selectedStatus = 'vacant'"
        :class="[ 'rounded-tile bg-tile p-5 cursor-pointer transition-all hover:', selectedStatus === 'vacant' ? 'ring-2 ring-sky-600' : '' ]"
      >
        <p class="text-xs font-semibold text-brand">Vacant / Available</p>
        <p class="tabular mt-2 text-2xl sm:text-3xl font-semibold text-brand">{{ vacantCount }} Units</p>
        <p class="mt-1 text-xs text-brand">Ready for occupancy</p>
      </div>

      <div 
        @click="selectedStatus = 'maintenance'"
        :class="[ 'rounded-tile bg-tile p-5 cursor-pointer transition-all hover:', selectedStatus === 'maintenance' ? 'ring-2 ring-purple-600' : '' ]"
      >
        <p class="text-xs font-semibold text-brand">Under Maintenance</p>
        <p class="tabular mt-2 text-2xl sm:text-3xl font-semibold text-brand">{{ maintenanceCount }} Units</p>
        <p class="mt-1 text-xs text-brand">Active repair work orders</p>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="rounded-tile bg-tile p-4 rounded-tile border border-line flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <input
          v-model="q"
          aria-label="Search by unit code, resident name, or unit type"
          type="text"
          placeholder="Search by unit code, resident name, or unit type…"
          class="ws-input w-full pl-10 pr-4 sm:text-sm"
        />
      </div>

      <select
        v-model="cluster"
        aria-label="Filter by cluster"
        class="ws-select sm:text-sm sm:w-56"
      >
        <option value="All">All Clusters (5)</option>
        <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
      </select>

      <select
        v-model="selectedStatus"
        aria-label="Filter by unit status"
        class="ws-select sm:text-sm sm:w-48"
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
        class="rounded-tile bg-tile rounded-tile overflow-hidden border border-line"
      >
        <!-- Cluster header. The strip is one mark per unit in this cluster:
             solid when someone lives there, hatched when it is free. -->
        <header class="flex flex-col gap-2.5 border-b border-line px-5 py-4">
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="text-[0.9375rem] font-semibold text-ink">{{ clusterName }}</h2>
            <p class="text-xs tabular text-ink-soft">
              {{ clusterOccupancy(clusterName).occupied }} of {{ clusterOccupancy(clusterName).total }} occupied
            </p>
          </div>
          <div class="flex gap-1" aria-hidden="true">
            <span
              v-for="n in clusterOccupancy(clusterName).total"
              :key="n"
              :class="[
                'h-1.5 flex-1 rounded-full',
                n <= clusterOccupancy(clusterName).occupied ? 'bg-brand' : 'hatch border border-line',
              ]"
            />
          </div>
        </header>

        <!-- Units Grid -->
        <div class="p-5">
          <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <article
              v-for="u in getUnitsForCluster(clusterName)"
              :key="u.unitCode"
              :class="[ 'rounded-tile border p-4 transition-all hover:shadow-md bg-tile flex flex-col justify-between', STATUS_STYLE[u.status] || 'border-line' ]"
            >
              <!-- Card Header -->
              <div>
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-xl font-semibold uppercase leading-none text-ink">
                      {{ u.unitCode }}
                    </p>
                    <p class="mt-1 text-xs font-semibold text-ink-soft">{{ u.type }}</p>
                  </div>
                  <span :class="['badge-soft text-xs capitalize font-semibold', getStatusBadgeClass(u.status)]">
                    {{ getStatusLabel(u.status) }}
                  </span>
                </div>

                <!-- Occupant & Price Info -->
                <div class="mt-3.5 pt-3 border-t border-line/60 space-y-1">
                  <div class="flex items-center justify-between text-xs gap-1">
                    <span class="text-ink-soft shrink-0">Occupants:</span>
                    <span class="font-semibold text-ink truncate max-w-[170px] text-right" :title="formatUnitOccupantsSummary(u.unitCode).text">
                      {{ formatUnitOccupantsSummary(u.unitCode).text }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-xs">
                    <span class="text-ink-soft">Monthly Rate:</span>
                    <span class="tabular font-semibold text-ink">
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
                  class="pill-btn min-h-9 flex-1 py-1 px-2.5 text-xs gap-1.5 font-semibold cursor-pointer"
                >
                  <Eye class="size-3.5 text-ink-soft" />
                  <span>Specs</span>
                </button>
                <button
                  type="button"
                  @click="editUnit(u)"
                  class="pill-btn min-h-9 flex-1 py-1 px-2.5 text-xs gap-1.5 font-semibold hover:border-brand hover:text-brand cursor-pointer"
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
        class="rounded-tile bg-tile p-12 text-center rounded-tile border border-line text-ink-soft"
      >
        <Search class="size-8 mx-auto mb-2 text-ink-faint" />
        <p class="font-semibold text-sm text-ink">No units match your filter criteria</p>
        <p class="text-xs mt-1">Try clearing your search query or selecting "All Clusters".</p>
      </div>
    </div>

    <!-- VIEW MODE 2: TABLE REGISTER VIEW -->
    <div v-else class="rounded-tile bg-tile overflow-hidden rounded-tile border border-line">
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[950px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-canvas">
            <tr class="text-left text-xs uppercase tracking-wide text-ink-soft border-b border-line">
              <th class="whitespace-nowrap px-4 py-3 font-semibold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">CLUSTER</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">TYPE</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">BILLING RULE</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">RATE (₱/MO)</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">REGISTERED OCCUPANTS</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="u in filteredRooms" 
              :key="u.unitCode"
              class="border-b border-line last:border-0 hover:bg-canvas transition-colors"
            >
              <td class="px-4 py-3.5 font-semibold uppercase text-ink">
                {{ u.unitCode.toUpperCase() }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-ink-soft font-medium">
                {{ u.cluster }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 font-medium text-ink">
                {{ u.type }}
              </td>

              <td class="px-4 py-3.5 text-xs text-ink-soft">
                {{ u.billingRule }}
              </td>

              <td class="tabular whitespace-nowrap px-4 py-3.5 font-semibold text-ink">
                {{ peso(u.price) }}
              </td>

              <td class="px-4 py-3.5">
                <span :class="['badge-soft text-xs capitalize font-semibold', getStatusBadgeClass(u.status)]">
                  {{ getStatusLabel(u.status) }}
                </span>
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-ink font-medium" :title="formatUnitOccupantsSummary(u.unitCode).text">
                {{ formatUnitOccupantsSummary(u.unitCode).text }}
              </td>

              <td class="whitespace-nowrap px-4 py-3.5 text-right">
                <div class="inline-flex items-center gap-1.5 justify-end">
                  <button 
                    @click="openSpecs(u)"
                    class="pill-btn min-h-8 px-2.5 py-1 text-xs gap-1 inline-flex items-center cursor-pointer"
                  >
                    <Eye class="size-3.5 text-ink-soft" />
                    <span>Specs</span>
                  </button>
                  <button 
                    @click="editUnit(u)"
                    class="pill-btn min-h-8 px-2.5 py-1 text-xs gap-1 inline-flex items-center font-semibold cursor-pointer hover:border-brand hover:text-brand"
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
