<!--
  @file views/RoomDirectoryView.vue
  @description Canonical Room & Rate Directory featuring Live Unit Matrix & Table Register
  @systemBibleRef docs/01_SYSTEM_BIBLE.md Section 17 (Room Directory & Unit Matrix)
  @architectureRef docs/04_ARCHITECTURE.md
-->
<script setup lang="ts">
import { domId } from '@/lib/domId';
import { rememberFilters } from '@/lib/savedFilters';
import { ref, computed, onMounted } from 'vue';
import {
  rooms,
  roomsFetchFailed,
  fetchRooms as fetchRoomsState,
  fetchTenants,
  formatUnitOccupantsSummary,
  isAdminEditUnitModalOpen,
  activeAdminEditUnit,
  type RoomItem,
} from '@/lib/systemState';
import { CLUSTERS, peso, type UnitStatus } from '@/lib/canonicalUnits';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import RecordTable from '@/components/ui/RecordTable.vue';
import ShowMore from '@/components/ui/ShowMore.vue';
import { Search, Pencil, LayoutGrid, Table as TableIcon, ChevronDown } from 'lucide-vue-next';
import { sortRows, orderOptions, type RowOrder } from '@/lib/rowOrder';
import StatusPill from '@/components/overview/StatusPill.vue';
import ListToolbar from '@/components/ui/ListToolbar.vue';
import type { FilterDraft, ToolbarFilter, ToolbarView } from '@/components/ui/listToolbar';

type ViewMode = 'matrix' | 'table';

const q = ref('');
const cluster = ref('All');
const selectedStatus = ref<string>('All');
const viewMode = ref<ViewMode>('matrix');

const clusterOptions = computed(() => [
  { value: 'All', label: 'All clusters' },
  ...CLUSTERS.map((c) => ({ value: c, label: c })),
]);

/**
 * Which clusters are open.
 *
 * All five rendered every unit at once - 33 cards - which made this screen ten
 * viewports tall on a phone. A closed cluster still shows its name, its
 * occupancy and the strip, so the page reads as the whole property at a glance
 * and you open the cluster you want.
 *
 * The first opens by default, because a screen that starts entirely closed
 * looks broken.
 */
const openClusters = ref<Record<string, boolean>>({});

function isClusterOpen(name: string, index: number) {
  return openClusters.value[name] ?? index === 0;
}

/**
 * How many units are drawn in each open cluster.
 *
 * The Boarding House holds 22, and on a phone that is one card per row: four
 * thousand pixels inside a single cluster. Eight is about a screen and a half,
 * and the rest is one control away - the same control the registers use.
 */
const UNITS_PER_STEP = 8;
const shownUnits = ref<Record<string, number>>({});

function unitsShown(name: string) {
  return shownUnits.value[name] ?? UNITS_PER_STEP;
}

function visibleUnits(name: string) {
  return getUnitsForCluster(name).slice(0, unitsShown(name));
}

function unitsRemaining(name: string) {
  return Math.max(0, getUnitsForCluster(name).length - unitsShown(name));
}

function showMoreUnits(name: string) {
  shownUnits.value[name] = unitsShown(name) + UNITS_PER_STEP;
}

function showAllUnits(name: string) {
  shownUnits.value[name] = getUnitsForCluster(name).length;
}

function showFewerUnits(name: string) {
  shownUnits.value[name] = UNITS_PER_STEP;
}

function toggleCluster(name: string, index: number) {
  openClusters.value[name] = !isClusterOpen(name, index);
}
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

const roomOrder = ref<RowOrder>('unit');
// Kept for the tab (lib/savedFilters.ts).
rememberFilters('rooms', { status: selectedStatus, cluster, view: viewMode, order: roomOrder });
const filteredRooms = computed(() => {
  const matched = rooms.filter((u) => {
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
  // Filters > Order (Sean, 2026-10-02, every list): by unit (default) or by tenant name.
  return sortRows(matched, roomOrder.value, { unit: (u) => u.unitCode, name: (u) => u.tenant });
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

/**
 * The unit's OCCUPANCY, in the words that describe it - not a claim about money.
 *
 * This read `'settled'` as **"Paid up"** and `'pending'` as **"Owing"**, on a
 * column headed *Standing*. Neither word is supported by anything: `UnitStatus`
 * comes from `mapOperationalStatus`, which is a pure rename of
 * `operational_status` - Occupied becomes `settled`, Reserved becomes `pending` -
 * and `fetchRooms` sets `paid: isOccupied` with `balance: 0`. **No bill is read
 * anywhere on this screen.**
 *
 * So every one of the 32 occupied units announced "Paid up" about a real
 * resident, and would go on doing so with a bill sitting overdue, because
 * nothing here can change the word. A Reserved unit read "Owing" while owing
 * nothing.
 *
 * The values are honest; only the labels were not. What a unit's payment
 * standing actually is lives in the income ledger, which is its own screen.
 */
function getStatusLabel(status: UnitStatus) {
  if (status === 'vacant') return 'Vacant';
  if (status === 'settled') return 'Occupied';
  if (status === 'pending') return 'Reserved';
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

/** Under the "Tenant" label: the name(s), or "None" when the pill already says Vacant. */
function tenantLine(unitCode: string): string {
  const summary = formatUnitOccupantsSummary(unitCode);
  return summary.count > 0 ? summary.text : 'None';
}

function editUnit(u: RoomItem) {
  activeAdminEditUnit.value = u;
  isAdminEditUnitModalOpen.value = true;
}

// No "Details" (eye) button any more (Sean, 2026-10-02): the edit dialog already shows the unit,
// so the pencil is the one action on a card or row.

/**
 * The counts, which are also the filter. One chip per state, each carrying the
 * number of units in it, so the figures and the way of narrowing the list are
 * the same control rather than two that can disagree.
 */
const statusChips = computed(() => [
  { key: 'All', label: 'All units', count: rooms.length },
  // Matches `getStatusLabel` below exactly. This read 'Paid up' and 'Owing' -
  // the same payment framing that comment documents removing from the result
  // badges - so the filter menu offered words the results themselves no
  // longer used: picking "Paid up" here returned units badged "Occupied".
  { key: 'settled', label: 'Occupied', count: rooms.filter((r) => r.status === 'settled').length },
  { key: 'pending', label: 'Reserved', count: rooms.filter((r) => r.status === 'pending').length },
  { key: 'vacant', label: 'Vacant', count: rooms.filter((r) => r.status === 'vacant').length },
  {
    key: 'maintenance',
    label: 'Being repaired',
    count: rooms.filter((r) => r.status === 'maintenance').length,
  },
]);

/** The toolbar's switch and filters (components/ui/ListToolbar.vue); the refs above stay the state. */
const roomViews: ToolbarView<ViewMode>[] = [
  { value: 'matrix', label: 'By cluster', icon: LayoutGrid },
  { value: 'table', label: 'As a list', icon: TableIcon },
];
const roomFilters = computed<ToolbarFilter[]>(() => [
  { key: 'status', label: 'Status', value: selectedStatus.value, defaultValue: 'All', options: statusChips.value },
  { key: 'cluster', label: 'Cluster', value: cluster.value, defaultValue: 'All', options: clusterOptions.value },
  { key: 'order', label: 'Order', value: roomOrder.value, defaultValue: 'unit', options: orderOptions(['unit', 'name']) },
]);
function applyRoomFilters(v: FilterDraft) {
  selectedStatus.value = String(v.status);
  cluster.value = String(v.cluster);
  roomOrder.value = v.order as RowOrder;
}
</script>

<template>
  <!-- `ws-focus` carries the workspace focus ring; see ExpensesLedgerView for
       why a view has to supply it. -->
  <div class="ws-focus space-y-6">
    <!--
      `rooms` is SEEDED. If the fetch fails it keeps the built-in list, and the
      rates below are then whatever was hardcoded at build time - 30 of the 33
      seeded prices no longer match the database. This screen is called the Room
      and RATE Directory, and its whole job is to be believed, so a failed load
      has to say so rather than quietly show the old figures.
    -->
    <div v-if="roomsFetchFailed" class="ws-reveal flex flex-col items-start gap-3 rounded-tile bg-verify-soft p-5 sm:p-6" role="alert">
      <div>
        <p class="text-base font-semibold text-verify">
          The current rates could not be loaded.
        </p>
        <p class="mt-1 text-sm leading-6 text-verify">
          The list below may be out of date. Please do not quote a rate from it until they load.
        </p>
      </div>
      <button type="button" class="pill-btn" :disabled="isLoading" @click="fetchRooms">Try again</button>
    </div>

    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
      <!-- No subtitle that restates the page name (Sean, 2026-10-01, fewer words). -->
      <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
        Rooms and rates
      </h1>
    </div>

    <!--
      The list toolbar every screen shares (components/ui/ListToolbar.vue,
      Sean, 2026-10-01): search with the filter button beside it. The status
      ("All units") and cluster filters are in the filter dialog, and so is the
      switch between the two ways of reading the same 33 units, as "Show as"
      at its top (Sean, 2026-10-02: the switch inside Filters, so it's cleaner).
    -->
    <ListToolbar
      v-model:view="viewMode"
      v-model:search="q"
      :views="roomViews"
      view-label="How to show the units"
      search-label="Search units"
      :filters="roomFilters"
      @apply="applyRoomFilters"
    />

    <!-- SKELETON LOADING STATE -->
    <div v-if="isLoading" class="space-y-6">
      <div v-if="viewMode === 'matrix'" class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <SkeletonCard variant="room" :count="8" />
      </div>
      <SkeletonTable v-else :columns="7" :rows="8" />
    </div>

    <!--
      VIEW MODE 1: VISUAL MATRIX VIEW (Live Unit Matrix moved from Overview)

      "By cluster" and "As a list" are a deliberate switch a person clicks, not
      a routine re-render, so the branch that appears fades in rather than
      snapping into place the way both used to.
    -->
    <div v-else-if="viewMode === 'matrix'" class="ws-reveal space-y-6">
      <div
        v-for="(clusterName, clusterIndex) in activeClusters"
        :key="clusterName"
        v-show="getUnitsForCluster(clusterName).length > 0"
        class="overflow-hidden rounded-tile bg-tile"
      >
        <!-- The strip is one mark per unit in this cluster: solid when someone
             lives there, hatched when it is free. It stays visible when the
             cluster is closed, so the page is still a picture of the property. -->
        <h2>
          <button
            type="button"
            class="press-plate flex w-full flex-col gap-2.5 px-5 py-4 text-left hover:bg-canvas"
            :aria-expanded="isClusterOpen(clusterName, clusterIndex)"
            :aria-controls="`cluster-units-${domId(clusterName)}`"
            @click="toggleCluster(clusterName, clusterIndex)"
          >
            <span class="flex items-baseline justify-between gap-3">
              <span class="flex items-center gap-2">
                <ChevronDown
                  :class="[
                    'size-4 shrink-0 text-ink-soft transition-transform duration-200 ease-[var(--ease-out)]',
                    isClusterOpen(clusterName, clusterIndex) ? '' : '-rotate-90',
                  ]"
                  aria-hidden="true"
                />
                <span class="text-[0.9375rem] font-semibold text-ink">{{ clusterName }}</span>
              </span>
              <span class="tabular text-xs text-ink-soft">
                {{ clusterOccupancy(clusterName).occupied }} of
                {{ clusterOccupancy(clusterName).total }} occupied
              </span>
            </span>
            <span class="flex gap-1" aria-hidden="true">
              <span
                v-for="n in clusterOccupancy(clusterName).total"
                :key="n"
                class="bar-fill h-1.5 flex-1 origin-left rounded-full"
                :class="
                  n <= clusterOccupancy(clusterName).occupied
                    ? 'bg-brand'
                    : 'hatch border border-line'
                "
                :style="{ animationDelay: `${Math.min(n - 1, 9) * 30}ms` }"
              />
            </span>
          </button>
        </h2>

        <div
          v-if="isClusterOpen(clusterName, clusterIndex)"
          :id="`cluster-units-${domId(clusterName)}`"
          class="ws-reveal border-t border-line p-5 sm:p-6"
        >
          <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <article
              v-for="u in visibleUnits(clusterName)"
              :key="u.unitCode"
              class="group flex flex-col justify-between rounded-2xl border border-line p-4"
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

                <!-- Label above value, and the name wraps: it was truncated at
                     170px, which cut off "+ 1 roommate", the part that sets the
                     water bill. -->
                <dl class="mt-4 border-t border-line pt-3 text-sm">
                  <div class="min-w-0">
                    <dt class="text-xs text-ink-faint">Tenant</dt>
                    <dd class="mt-0.5 break-words font-medium text-ink">
                      {{ tenantLine(u.unitCode) }}
                    </dd>
                  </div>
                </dl>
              </div>

              <!--
                Hover-reveal, no border - back to this after a detour through
                two full-width labelled buttons that doubled every card's
                height across 33 cards. `.row-action` fades them in on
                `:hover`/`:focus-within` of the `group` card and stays opaque
                on touch, where hover does not exist (owner's call, 2026-09-26).
              -->
              <div class="mt-3 flex items-end justify-between gap-2">
                <dl class="text-sm">
                  <dt class="text-xs text-ink-faint">Monthly rent</dt>
                  <dd class="mt-0.5 tabular text-base font-bold text-brand">{{ peso(u.price) }}</dd>
                </dl>
                <div class="flex shrink-0 gap-1.5">
                  <button type="button" class="press-plate icon-btn-plain row-action -mr-3 -mb-1" :aria-label="`Edit ${u.unitCode.toUpperCase()}`" title="Edit" @click="editUnit(u)">
                    <Pencil class="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          </div>

          <ShowMore
            :shown="visibleUnits(clusterName).length"
            :total="getUnitsForCluster(clusterName).length"
            :remaining="unitsRemaining(clusterName)"
            :next-step="Math.min(8, unitsRemaining(clusterName)) || 8"
            noun="unit"
            :first-page="UNITS_PER_STEP"
            @more="showMoreUnits(clusterName)"
            @all="showAllUnits(clusterName)"
            @less="showFewerUnits(clusterName)"
          />
        </div>
      </div>

      <!--
        Nothing left after the filters.

        Written in the shape RecordTable's own empty state uses - which is what
        the "As a list" half of this very screen renders a few lines below -
        rather than its own smaller type and its own voice. It also named a
        control that does not exist: it told the reader to select "All
        Clusters", and the option in the cluster menu is labelled "Every
        cluster".
      -->
      <div
        v-if="filteredRooms.length === 0"
        class="ws-reveal rounded-tile bg-tile px-6 py-16 text-center"
      >
        <Search class="mx-auto size-8 text-ink-faint" aria-hidden="true" />
        <p class="mt-3 text-base font-semibold text-ink">No unit matches</p>
        <p class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
          Clear the search, or pick “All units” and “All clusters”.
        </p>
      </div>
    </div>

    <!--
      The register. It needed 950px, so it scrolled sideways on a laptop and on
      every phone. The cluster and the kind of unit share one column, and below
      `xl` it becomes one tile per unit, laid out like the cluster cards: at 1024
      the sidebar leaves 636px and the table needed 646.

      The billing line is not repeated here: it is the same for every unit, so
      it said the same thing 33 times. The unit's own dialogs still show it.
    -->
    <RecordTable
      v-else
      class="ws-reveal"
      :rows="filteredRooms"
      caption="Every unit, with where it is, what it costs, who lives in it and its standing"
      noun="unit"
      :page-size="12"
      table-from="xl"
      empty-title="No unit matches"
      empty-note="Clear the search, or pick “All units” and “All clusters”."
    >
      <template #head>
        <tr>
          <th scope="col">Unit</th>
          <th scope="col">Where and what</th>
          <th scope="col" class="num">Monthly rent</th>
          <th scope="col">Tenant</th>
          <th scope="col">Status</th>
          <th scope="col" class="w-24"><span class="sr-only">Actions</span></th>
        </tr>
      </template>

      <template #row="{ row: u }">
        <tr class="group">
          <th scope="row" class="font-semibold uppercase text-ink">
            {{ u.unitCode.toUpperCase() }}
          </th>
          <td class="text-ink">{{ u.cluster }}, {{ u.type }}</td>
          <td class="num font-semibold text-ink">{{ peso(u.price) }}</td>
          <td :title="tenantLine(u.unitCode)">
            {{ tenantLine(u.unitCode) }}
          </td>
          <td>
            <StatusPill :tone="statusTone(u.status)">{{ getStatusLabel(u.status) }}</StatusPill>
          </td>
          <td class="num">
            <div class="inline-flex items-center justify-end gap-2">
              <button type="button" class="press-plate icon-btn-plain row-action" :aria-label="`Edit ${u.unitCode.toUpperCase()}`" @click="editUnit(u)">
                <Pencil class="size-4" aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
      </template>

      <template #card="{ row: u }">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xl font-semibold uppercase leading-none text-ink">
              {{ u.unitCode.toUpperCase() }}
            </p>
            <p class="mt-1.5 text-sm text-ink-soft">{{ u.cluster }}, {{ u.type }}</p>
          </div>
          <StatusPill :tone="statusTone(u.status)">{{ getStatusLabel(u.status) }}</StatusPill>
        </div>

        <dl class="mt-4 border-t border-line pt-3 text-sm">
          <div class="min-w-0">
            <dt class="text-xs text-ink-faint">Tenant</dt>
            <dd class="mt-0.5 break-words font-medium text-ink">
              {{ tenantLine(u.unitCode) }}
            </dd>
          </div>
        </dl>

        <div class="mt-3 flex items-end justify-between gap-2">
          <dl class="text-sm">
            <dt class="text-xs text-ink-faint">Monthly rent</dt>
            <dd class="mt-0.5 tabular text-base font-bold text-brand">{{ peso(u.price) }}</dd>
          </dl>
          <div class="flex shrink-0 gap-1.5">
            <button type="button" class="press-plate icon-btn-plain row-action -mr-3 -mb-1" :aria-label="`Edit ${u.unitCode.toUpperCase()}`" title="Edit" @click="editUnit(u)">
              <Pencil class="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </template>
    </RecordTable>
  </div>
</template>
