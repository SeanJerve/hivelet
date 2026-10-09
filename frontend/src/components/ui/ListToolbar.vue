<script setup lang="ts" generic="V extends string = string">
/**
 * The one toolbar every list screen uses (Sean, 2026-10-01).
 *
 *   the search bar, then each filter as its own dropdown
 *
 * DROPDOWNS, NOT A POP-UP (technical evaluators, 3 Oct 2026: "filters as a
 * drop down instead of a pop-up"). Until 5 Oct every filter sat behind one
 * Filters button that opened a dialog (`FilterSheet`) with an Apply button, so
 * changing one filter took four steps: open, pick, apply, look. Now each
 * filter is a dropdown on the page and the list changes the moment one is
 * picked. "Show as" (By cluster / As a list), which had moved into that dialog
 * on 2 Oct, is a dropdown beside them.
 *
 * ON A PHONE the dropdowns would be a column of controls before any content,
 * which is why they went behind a button in the first place (Sean, 2 Oct:
 * "so it's cleaner"). So below the `sm` width the Filters button stays, and it
 * drops the same dropdowns open in a panel under the toolbar, two to a row,
 * rather than popping up a dialog over the page. Picking still applies at once.
 *
 * The button and the line under the toolbar ("2025 · BH", with one tap to
 * clear) still say what is narrowing the list, so the landlady can see what
 * she is looking at without opening anything. The view is not in that line or
 * that count: the page itself shows which way it is drawn.
 *
 * The screen keeps its own refs; this emits `update:view` and `apply` with the
 * new values and the screen writes them, so every computed, URL query and
 * Excel export that read those refs before still reads them.
 */
import { computed, ref, useId } from 'vue';
import { Search, SlidersHorizontal, X } from 'lucide-vue-next';
import PillSelect from '@/components/ui/PillSelect.vue';
import {
  isShown,
  optionsFor,
  same,
  type FilterDraft,
  type FilterValue,
  type NormalOption,
  type ToolbarFilter,
  type ToolbarView,
} from '@/components/ui/listToolbar';

const props = withDefaults(
  defineProps<{
    /** Two or three ways of drawing the same rows. Omit for a screen with one. */
    views?: ToolbarView<V>[];
    view?: V;
    /** The accessible name of the "Show as" dropdown. */
    viewLabel?: string;
    /** The switch is offered only while this holds for the values in force (Tenants: not for a past year). */
    viewsWhen?: (draft: FilterDraft) => boolean;
    /** The search is drawn only when this is given; it is also its accessible name. */
    searchLabel?: string;
    search?: string;
    filters?: ToolbarFilter[];
    /** The phone's Filters button. */
    filterTitle?: string;
    /** The short "2025 · BH" line under the toolbar. Off where a screen already says it. */
    summary?: boolean;
  }>(),
  {
    views: () => [],
    view: undefined,
    viewLabel: 'How to show the list',
    viewsWhen: undefined,
    searchLabel: '',
    search: '',
    filters: () => [],
    filterTitle: 'Filters',
    summary: true,
  }
);

const emit = defineEmits<{
  'update:view': [value: V];
  'update:search': [value: string];
  apply: [values: FilterDraft];
}>();

const panelId = useId();
const panelOpen = ref(false);

const applied = computed<FilterDraft>(() =>
  Object.fromEntries(props.filters.map((f) => [f.key, f.value]))
);

/** Filters with a real choice in them right now. */
const offered = computed(() =>
  props.filters
    .filter((f) => isShown(f, applied.value))
    .map((f) => ({ filter: f, options: optionsFor(f, applied.value) }))
    .filter((x) => x.options.length > 1)
);

const showViews = computed(
  () => props.views.length > 1 && (props.viewsWhen ? props.viewsWhen(applied.value) : true)
);

const viewOptions = computed<NormalOption[]>(() => props.views.map((v) => ({ value: v.value, label: v.label })));

/** How many dropdowns there are, so an odd last one takes the whole row on a phone. */
const controlCount = computed(() => offered.value.length + (showViews.value ? 1 : 0));

/** The ones narrowing the list now, with the words for the summary line. */
const active = computed(() =>
  offered.value
    .filter(({ filter }) => !same(filter.value, filter.defaultValue))
    .map(({ filter, options }) => ({
      key: filter.key,
      label: options.find((o) => same(o.value, filter.value))?.label ?? String(filter.value),
    }))
);

function setFilter(key: string, value: FilterValue) {
  emit('apply', { ...applied.value, [key]: value });
}

function setView(value: FilterValue) {
  if (value !== props.view) emit('update:view', String(value) as V);
}

function clearFilters() {
  emit('apply', Object.fromEntries(props.filters.map((f) => [f.key, f.defaultValue])));
}

const filterButtonLabel = computed(() =>
  active.value.length ? `${props.filterTitle}, ${active.value.length} on` : props.filterTitle
);

/** On a phone, an odd last dropdown spans both columns instead of sitting alone in half a row. */
function spanClass(index: number) {
  return controlCount.value % 2 === 1 && index === controlCount.value - 1 ? 'col-span-2 sm:col-span-1 sm:@max-lg:col-span-2' : '';
}
</script>

<template>
  <!-- @container: in a narrow column (Inquiries' list beside the thread on a laptop) the toolbar
       lays out by its own width, not the screen's - full-width search, the dropdowns two to a row
       under it - instead of wrapping each dropdown onto its own line (Sean, 2026-10-09). -->
  <div class="@container flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2 sm:items-end sm:gap-3">
      <!-- `min-w-0 flex-1` on the search so it takes what the Filters button
           leaves on a phone, down to 320px; `sm:max-w-80` keeps it the 20rem
           every register's search box has been on a wide screen.

           `sm:min-w-60` so it wraps instead of shrinking. Its flex-basis is 0,
           so with five or six dropdowns beside it (Monthly Income) nothing ever
           made the row wrap: the dropdowns kept their widths and the search
           was squeezed to its icon, under "Show as" (Sean, 6 Oct 2026). With a
           floor, the dropdowns go to the next row and the search keeps 15rem
           or more. -->
      <div v-if="searchLabel" class="relative min-w-0 flex-1 sm:min-w-60 sm:max-w-80 sm:@max-lg:max-w-none sm:@max-lg:basis-full">
        <Search
          class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <input
          :value="search"
          type="search"
          placeholder="Search"
          :aria-label="searchLabel"
          class="ws-input w-full pl-11"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <button
        v-if="controlCount > 0"
        type="button"
        :class="['pill-btn relative shrink-0 sm:hidden', !searchLabel && 'ml-auto', active.length && 'border-brand text-brand']"
        :aria-label="filterButtonLabel"
        :aria-expanded="panelOpen"
        :aria-controls="panelId"
        @click="panelOpen = !panelOpen"
      >
        <SlidersHorizontal class="size-4" aria-hidden="true" />
        <span>{{ filterTitle }}</span>
        <!-- On the corner rather than inline, so the button keeps its width when
             a filter is applied: inline it took 28px from the search box. -->
        <span
          v-if="active.length"
          class="tabular absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-brand ring-2 ring-tile"
          aria-hidden="true"
        >{{ active.length }}</span>
      </button>

      <!-- The dropdowns: in the row on a wide screen, in a dropped-down panel
           two to a row on a phone. -->
      <div
        v-if="controlCount > 0"
        :id="panelId"
        :class="[
          'w-full sm:flex sm:w-auto sm:flex-wrap sm:items-end sm:gap-3 sm:@max-lg:grid sm:@max-lg:w-full sm:@max-lg:grid-cols-2 sm:@max-lg:gap-2',
          // Four dropdowns in a toolbar too narrow for all four in a row (Tenants, Rooms
          // and rates, Expenses at 768 and 1024) wrapped three and one, the last alone on
          // its line. There they sit two and two, at their usual widths (audit 2026-10-09).
          controlCount === 4 && 'sm:@lg:@max-[51rem]:grid sm:@lg:@max-[51rem]:w-full sm:@lg:@max-[51rem]:grid-cols-[repeat(2,auto)] sm:@lg:@max-[51rem]:justify-start',
          panelOpen ? 'ws-reveal grid grid-cols-2 gap-2' : 'hidden',
        ]"
      >
        <!-- Each with its name above it: "Cluster" alone could be the filter or the
             grouping, and the landlady should not have to open one to find out. -->
        <div v-if="showViews" :class="['flex flex-col gap-1', spanClass(0)]">
          <span :id="`${panelId}-view`" class="px-1 text-xs text-ink-faint">Show as</span>
          <PillSelect
            :model-value="(view as string)"
            :options="viewOptions"
            :aria-label="viewLabel"
            width-class="w-full sm:w-44 sm:@max-lg:w-full"
            @update:model-value="setView"
          />
        </div>
        <div
          v-for="({ filter, options }, i) in offered"
          :key="filter.key"
          :class="['flex flex-col gap-1', spanClass(i + (showViews ? 1 : 0))]"
        >
          <span class="px-1 text-xs text-ink-faint">{{ filter.label }}</span>
          <PillSelect
            :model-value="filter.value"
            :options="options"
            :aria-label="filter.label"
            width-class="w-full sm:w-48 sm:@max-lg:w-full"
            @update:model-value="setFilter(filter.key, $event)"
          />
        </div>
      </div>
    </div>

    <!-- What is narrowing the list, in as few words as it takes, and one tap
         back to everything. Only while something is. -->
    <div v-if="summary && active.length" class="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
      <p class="min-w-0">
        <span class="sr-only">Filtered to </span>{{ active.map((a) => a.label).join(' · ') }}
      </p>
      <button
        type="button"
        class="press inline-flex min-h-[2.75rem] items-center gap-1 px-1 font-semibold text-brand hover:text-brand-strong cursor-pointer"
        @click="clearFilters"
      >
        <X class="size-3.5" aria-hidden="true" />
        <span>Clear</span>
      </button>
    </div>
  </div>
</template>
