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
import { Search, Pencil, RefreshCw, LayoutGrid, Table as TableIcon, Eye } from 'lucide-vue-next';
import StatusPill from '@/components/overview/StatusPill.vue';

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

function getStatusLabel(status: UnitStatus) {
  if (status === 'vacant') return 'Vacant';
  if (status === 'settled') return 'Paid up';
  if (status === 'pending') return 'Owing';
  if (status === 'maintenance') return 'Being repaired';
  return status;
}

/**
 * Maintenance used to wear the same tone as a settled unit, so a unit out of
 * action read as one that had paid. It is a waiting state, like owing.
 */
function statusTone(status: UnitStatus): 'paid' | 'verify' | 'neutral' {
  if (status === 'settled') return 'paid';
  if (status === 'pending' || status === 'maintenance') return 'verify';
  return 'neutral';
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
              class="flex flex-col justify-between rounded-2xl bg-canvas p-4"
            >
              <div>
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xl font-semibold uppercase leading-none text-ink">
                      {{ u.unitCode }}
                    </p>
                    <p class="mt-1.5 text-sm text-ink-soft">{{ u.type }}</p>
                  </div>
                  <StatusPill :tone="statusTone(u.status)">{{ getStatusLabel(u.status) }}</StatusPill>
                </div>

                <dl class="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                  <div class="flex items-baseline justify-between gap-2">
                    <dt class="shrink-0 text-ink-faint">Lived in by</dt>
                    <dd
                      class="max-w-[170px] truncate text-right font-medium text-ink"
                      :title="formatUnitOccupantsSummary(u.unitCode).text"
                    >
                      {{ formatUnitOccupantsSummary(u.unitCode).text }}
                    </dd>
                  </div>

                  <div class="flex items-baseline justify-between gap-2">
                    <dt class="text-ink-faint">A month</dt>
                    <dd class="tabular font-semibold text-ink">{{ peso(u.price) }}</dd>
                  </div>
                </dl>
              </div>

              <div class="mt-4 flex gap-2">
                <button type="button" class="pill-btn flex-1" @click="openSpecs(u)">
                  <Eye class="size-3.5" aria-hidden="true" />
                  <span>Look</span>
                </button>
                <button type="button" class="pill-btn flex-1" @click="editUnit(u)">
                  <Pencil class="size-3.5" aria-hidden="true" />
                  <span>Edit</span>
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

    <!--
      The register. It needed 950px, so it scrolled sideways on a laptop and on
      every phone. The cluster and the kind of unit now share one column, the
      rate and the billing rule share another, and below 1024px the whole thing
      becomes one tile per unit.
    -->
    <template v-else>
      <div class="hidden overflow-hidden rounded-tile bg-tile lg:block">
        <div class="ws-table-wrap max-h-[70vh]">
          <table class="ws-table">
            <caption class="sr-only">
              Every unit, with where it is, what it costs, who lives in it and its standing
            </caption>
            <thead>
              <tr>
                <th scope="col">Unit</th>
                <th scope="col">Where and what</th>
                <th scope="col" class="num">A month</th>
                <th scope="col">Lived in by</th>
                <th scope="col">Standing</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in filteredRooms" :key="u.unitCode">
                <th scope="row" class="font-semibold uppercase text-ink">
                  {{ u.unitCode.toUpperCase() }}
                </th>
                <td>
                  <span class="block text-ink">{{ u.cluster }}, {{ u.type }}</span>
                  <span class="block text-xs text-ink-faint">{{ u.billingRule }}</span>
                </td>
                <td class="num font-semibold text-ink">{{ peso(u.price) }}</td>
                <td :title="formatUnitOccupantsSummary(u.unitCode).text">
                  {{ formatUnitOccupantsSummary(u.unitCode).text }}
                </td>
                <td>
                  <StatusPill :tone="statusTone(u.status)">{{ getStatusLabel(u.status) }}</StatusPill>
                </td>
                <td class="num">
                  <div class="inline-flex items-center justify-end gap-2">
                    <button type="button" class="pill-btn" @click="openSpecs(u)">
                      <Eye class="size-3.5" aria-hidden="true" />
                      <span>Look</span>
                    </button>
                    <button type="button" class="pill-btn" @click="editUnit(u)">
                      <Pencil class="size-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-3 lg:hidden">
        <div v-for="u in filteredRooms" :key="u.unitCode" class="rounded-tile bg-tile p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-lg font-semibold uppercase leading-none text-ink">
                {{ u.unitCode.toUpperCase() }}
              </p>
              <p class="mt-1.5 text-sm text-ink-soft">{{ u.cluster }}, {{ u.type }}</p>
            </div>
            <StatusPill :tone="statusTone(u.status)">{{ getStatusLabel(u.status) }}</StatusPill>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt class="text-xs text-ink-faint">A month</dt>
              <dd class="tabular font-semibold text-ink">{{ peso(u.price) }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-ink-faint">Lived in by</dt>
              <dd class="truncate text-ink">{{ formatUnitOccupantsSummary(u.unitCode).text }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-xs text-ink-faint">How it is billed</dt>
              <dd class="text-ink">{{ u.billingRule }}</dd>
            </div>
          </dl>

          <div class="mt-4 flex gap-2">
            <button type="button" class="pill-btn flex-1 justify-center" @click="openSpecs(u)">
              <Eye class="size-3.5" aria-hidden="true" />
              <span>Look</span>
            </button>
            <button type="button" class="pill-btn flex-1 justify-center" @click="editUnit(u)">
              <Pencil class="size-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
