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
import RecordTable from '@/components/ui/RecordTable.vue';
import { Search, Pencil, LayoutGrid, Table as TableIcon, Eye } from 'lucide-vue-next';
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

/**
 * The counts, which are also the filter. One chip per state, each carrying the
 * number of units in it, so the figures and the way of narrowing the list are
 * the same control rather than two that can disagree.
 */
const statusChips = computed(() => [
  { key: 'All', label: 'Every unit', count: rooms.length },
  { key: 'settled', label: 'Paid up', count: rooms.filter((r) => r.status === 'settled').length },
  { key: 'pending', label: 'Owing', count: rooms.filter((r) => r.status === 'pending').length },
  { key: 'vacant', label: 'Vacant', count: rooms.filter((r) => r.status === 'vacant').length },
  {
    key: 'maintenance',
    label: 'Being repaired',
    count: rooms.filter((r) => r.status === 'maintenance').length,
  },
]);
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
    <div v-if="roomsFetchFailed" class="rounded-tile bg-verify-soft p-5 sm:p-6" role="alert">
      <p class="text-base font-semibold text-verify">
        These rates could not be loaded, and may be out of date.
      </p>
      <p class="mt-1 text-sm leading-6 text-verify">
        What you see below is the built-in list, not the live database. Do not quote a rate from
        this screen until it loads. Reload the page to try again.
      </p>
    </div>

    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          Rooms and rates
        </h1>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          All 33 units across 5 clusters, what each one lets for, and who is in it.
        </p>
      </div>

      <!-- Two ways of reading the same 33 units -->
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="How to show the units">
        <button
          type="button"
          class="chip"
          :aria-pressed="viewMode === 'matrix'"
          @click="viewMode = 'matrix'"
        >
          <LayoutGrid class="size-4" aria-hidden="true" />
          <span>By cluster</span>
        </button>

        <button
          type="button"
          class="chip"
          :aria-pressed="viewMode === 'table'"
          @click="viewMode = 'table'"
        >
          <TableIcon class="size-4" aria-hidden="true" />
          <span>As a list</span>
        </button>
      </div>
    </div>

    <!--
      The counts and the filter are the same control. Four stat tiles used to
      sit above a status dropdown holding the same four numbers, and each tile
      was a clickable div wearing `ring-2 ring-emerald-600`, `ring-sky-600` and
      `ring-purple-600` - three colours from outside the system, on a screen
      whose own status colours mean something.
    -->
    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div class="relative xl:max-w-sm xl:flex-1">
        <Search
          class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <label for="unit-search" class="sr-only">Search units</label>
        <input
          id="unit-search"
          v-model="q"
          type="search"
          placeholder="Unit, resident or kind of unit"
          class="ws-input w-full pl-11"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Show">
          <button
            v-for="chip in statusChips"
            :key="chip.key"
            type="button"
            class="chip"
            :aria-pressed="selectedStatus === chip.key"
            @click="selectedStatus = chip.key"
          >
            {{ chip.label }}
            <span class="chip-count">{{ chip.count }}</span>
          </button>
        </div>

        <label class="ws-field">
          <span class="sr-only">Cluster</span>
          <select v-model="cluster" class="ws-select w-auto">
            <option value="All">Every cluster</option>
            <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
      </div>
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
      rate and the billing rule share another, and below 1024px it becomes one
      tile per unit.
    -->
    <RecordTable
      v-else
      :rows="filteredRooms"
      caption="Every unit, with where it is, what it costs, who lives in it and its standing"
      noun="unit"
      :page-size="12"
      empty-title="No unit matches"
      empty-note="Nothing in the directory answers to what you have asked for."
    >
      <template #head>
        <tr>
          <th scope="col">Unit</th>
          <th scope="col">Where and what</th>
          <th scope="col" class="num">A month</th>
          <th scope="col">Lived in by</th>
          <th scope="col">Standing</th>
          <th scope="col"><span class="sr-only">Actions</span></th>
        </tr>
      </template>

      <template #row="{ row: u }">
        <tr>
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
      </template>

      <template #card="{ row: u }">
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
      </template>
    </RecordTable>
  </div>
</template>
