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
import ShowMore from '@/components/ui/ShowMore.vue';
import { Search, Pencil, LayoutGrid, Table as TableIcon, Eye, ChevronDown } from 'lucide-vue-next';
import StatusPill from '@/components/overview/StatusPill.vue';
import PillSelect from '@/components/ui/PillSelect.vue';

type ViewMode = 'matrix' | 'table';

const q = ref('');
const cluster = ref('All');
const selectedStatus = ref<string>('All');
const viewMode = ref<ViewMode>('matrix');

const clusterOptions = computed(() => [
  { value: 'All', label: 'Every cluster' },
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
    <div v-if="roomsFetchFailed" class="ws-reveal rounded-tile bg-verify-soft p-5 sm:p-6" role="alert">
      <p class="text-base font-semibold text-verify">
        These rates could not be loaded, and may be out of date.
      </p>
      <p class="mt-1 text-sm leading-6 text-verify">
        What you see below is the built-in list, not the live database. Do not quote a rate from
        this screen until it loads. Reload the page to try again.
      </p>
    </div>

    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
      <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
        Rooms and rates
      </h1>
      <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
        All 33 units across 5 clusters, what each one lets for, and who is in it.
      </p>
    </div>

    <!--
      Controls toolbar. A column on a phone, a row from `sm` up.

      `flex-1 min-w-0` on the left-hand group is gone with it. It is the other
      half of the trap the filters below document: an item that can absorb the
      whole shortfall means the row never wraps, so at 375 the search box and
      the switcher were being squeezed rather than stacked. Here the group is
      sized by its content, so the outer row wraps the filters underneath
      instead, which is what it did at every width worth having.
    -->
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <!-- Search units -->
        <div class="relative w-full sm:w-80">
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

        <!-- Two ways of reading the same 33 units -->
        <div
          class="min-h-[2.75rem] h-11 inline-flex w-full items-center rounded-full bg-tile border border-line p-1 shadow-xs sm:w-auto sm:shrink-0"
          role="group"
          aria-label="How to show the units"
        >
          <button
            type="button"
            :class="[
              'press h-full flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap sm:flex-none',
              viewMode === 'matrix' ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-soft hover:text-brand hover:bg-brand-soft/40',
            ]"
            :aria-pressed="viewMode === 'matrix'"
            @click="viewMode = 'matrix'"
          >
            <LayoutGrid class="size-4" aria-hidden="true" />
            <span>By cluster</span>
          </button>

          <button
            type="button"
            :class="[
              'press h-full flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap sm:flex-none',
              viewMode === 'table' ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-soft hover:text-brand hover:bg-brand-soft/40',
            ]"
            :aria-pressed="viewMode === 'table'"
            @click="viewMode = 'table'"
          >
            <TableIcon class="size-4" aria-hidden="true" />
            <span>As a list</span>
          </button>
        </div>
      </div>

      <!--
        `flex-wrap`, and no `shrink-0`, which is how the expenses ledger and
        the audit trail already lay their filter rows out.

        Two PillSelects are 2 x 13rem plus the gap = 424px, and `shrink-0`
        held that width against a 343px content column on a phone. Measured in
        the running app at a 375px viewport: the row ran to x=448, so the last
        97px of the cluster filter sat past the right edge - and `body` carries
        `overflow-x: hidden`, so it was CLIPPED rather than reachable by
        scrolling. The cluster filter could not be used on a phone at all.

        Re-measured after the change at 375, 768 and 1280: they stack only at
        375 and sit on one row at both larger widths, ending on exactly the
        same right edge as before.

        2026-09-23: that stack was two 208px pills on two rows, left-aligned
        under a 236px switcher, and the client called the result messy. They
        share ONE row at phone width now - `flex-1` off a 343px column is
        167.5px each - and `sm:w-48 sm:flex-none` fixes their width from `sm`
        up. 2026-09-25: 12rem rather than 13rem, because at 1366 the toolbar
        needed 990px of a 980px column and the filters wrapped onto a second
        row by themselves.
      -->
      <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
        <PillSelect
          v-model="selectedStatus"
          :options="statusChips"
          aria-label="Filter by status"
          widthClass="min-w-0 flex-1 sm:w-48 sm:flex-none"
        />
        <PillSelect
          v-model="cluster"
          :options="clusterOptions"
          aria-label="Cluster"
          align="right"
          widthClass="min-w-0 flex-1 sm:w-48 sm:flex-none"
        />
      </div>
    </div>

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
            :aria-controls="`cluster-units-${clusterName}`"
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
          :id="`cluster-units-${clusterName}`"
          class="ws-reveal border-t border-line p-5 sm:p-6"
        >
          <div class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <article
              v-for="u in visibleUnits(clusterName)"
              :key="u.unitCode"
              class="flex flex-col justify-between rounded-2xl border border-line p-4"
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
                <dl class="mt-4 grid gap-3 border-t border-line pt-3 text-sm">
                  <div class="min-w-0">
                    <dt class="text-xs text-ink-faint">Lived in by</dt>
                    <dd class="mt-0.5 break-words font-medium text-ink">
                      {{ formatUnitOccupantsSummary(u.unitCode).text }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs text-ink-faint">A month</dt>
                    <dd class="mt-0.5 tabular font-semibold text-ink">{{ peso(u.price) }}</dd>
                  </div>
                </dl>
              </div>

              <!--
                Bordered and unfilled so the status pill (whose `neutral` tone
                is `bg-canvas`) has a plain surface to show against.

                Two labelled buttons, always shown. These were unlabelled
                `row-action` icons at opposite corners: hidden until hover on a
                desktop, which left an empty strip under every card, and on a
                phone an eye that did not say what it opened.
              -->
              <div class="mt-4 flex gap-2">
                <button type="button" class="pill-btn flex-1 px-3" :aria-label="`Details of ${u.unitCode.toUpperCase()}`" @click="openSpecs(u)">
                  <Eye class="size-3.5 text-ink-soft" aria-hidden="true" />
                  <span>Details</span>
                </button>
                <button type="button" class="pill-btn flex-1 px-3" :aria-label="`Edit ${u.unitCode.toUpperCase()}`" @click="editUnit(u)">
                  <Pencil class="size-3.5 text-ink-soft" aria-hidden="true" />
                  <span>Edit</span>
                </button>
              </div>
            </article>
          </div>

          <ShowMore
            :shown="visibleUnits(clusterName).length"
            :total="getUnitsForCluster(clusterName).length"
            :remaining="unitsRemaining(clusterName)"
            :next-step="Math.min(8, unitsRemaining(clusterName)) || 8"
            noun="unit"
            @more="showMoreUnits(clusterName)"
            @all="showAllUnits(clusterName)"
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
          Clear the search, or pick “Every unit” and “Every cluster”.
        </p>
      </div>
    </div>

    <!--
      The register. It needed 950px, so it scrolled sideways on a laptop and on
      every phone. The cluster and the kind of unit share one column, and below
      1024px it becomes one tile per unit, laid out like the cluster cards.

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
      empty-title="No unit matches"
      empty-note="Clear the search, or pick “Every unit” and “Every cluster”."
    >
      <template #head>
        <tr>
          <th scope="col">Unit</th>
          <th scope="col">Where and what</th>
          <th scope="col" class="num">A month</th>
          <th scope="col">Lived in by</th>
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
          <td :title="formatUnitOccupantsSummary(u.unitCode).text">
            {{ formatUnitOccupantsSummary(u.unitCode).text }}
          </td>
          <td>
            <StatusPill :tone="statusTone(u.status)">{{ getStatusLabel(u.status) }}</StatusPill>
          </td>
          <td class="num">
            <div class="inline-flex items-center justify-end gap-2">
              <button type="button" class="press-plate flex size-9 items-center justify-center rounded-full row-action hover:bg-canvas cursor-pointer" :aria-label="`Details of ${u.unitCode.toUpperCase()}`" @click="openSpecs(u)">
                <Eye class="size-3.5 text-ink-soft" aria-hidden="true" />
              </button>
              <button type="button" class="press-plate flex size-9 items-center justify-center rounded-full row-action hover:bg-canvas cursor-pointer" :aria-label="`Edit ${u.unitCode.toUpperCase()}`" @click="editUnit(u)">
                <Pencil class="size-3.5 text-ink-soft" aria-hidden="true" />
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

        <dl class="mt-4 grid gap-3 border-t border-line pt-3 text-sm">
          <div class="min-w-0">
            <dt class="text-xs text-ink-faint">Lived in by</dt>
            <dd class="mt-0.5 break-words font-medium text-ink">
              {{ formatUnitOccupantsSummary(u.unitCode).text }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">A month</dt>
            <dd class="mt-0.5 tabular font-semibold text-ink">{{ peso(u.price) }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex gap-2">
          <button type="button" class="pill-btn flex-1 px-3" :aria-label="`Details of ${u.unitCode.toUpperCase()}`" @click="openSpecs(u)">
            <Eye class="size-3.5 text-ink-soft" aria-hidden="true" />
            <span>Details</span>
          </button>
          <button type="button" class="pill-btn flex-1 px-3" :aria-label="`Edit ${u.unitCode.toUpperCase()}`" @click="editUnit(u)">
            <Pencil class="size-3.5 text-ink-soft" aria-hidden="true" />
            <span>Edit</span>
          </button>
        </div>
      </template>
    </RecordTable>
  </div>
</template>
