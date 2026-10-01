<script setup lang="ts" generic="V extends string = string">
/**
 * The one toolbar every list screen uses (Sean, 2026-10-01).
 *
 *   row 1  the view switch ("By cluster / As a list"), full width on a phone
 *   row 2  the search bar, and in line with it one filter button
 *
 * From `sm` up the two rows share one line. The switch is the Tenants page's,
 * the one Sean liked, and it is the same width and height on every screen
 * because it is the same markup: Monthly Income's was a different element
 * that stopped at its content width on a phone, which is what he noticed.
 *
 * Every filter sits behind the filter button, in `FilterSheet`, even when a
 * screen has only one (Repairs' status) - the same button in the same place
 * on every list. The button carries a count of the filters not at their
 * default, and under the toolbar the same filters are named in a short line
 * ("2025 · BH") with one tap to clear them, so the landlady can see what she
 * is looking at without opening anything.
 *
 * The screen keeps its own refs; this emits `apply` with the new values and
 * the screen writes them, so every computed, URL query and Excel export that
 * read those refs before still reads them.
 */
import { computed, ref } from 'vue';
import { Search, SlidersHorizontal, X } from 'lucide-vue-next';
import FilterSheet from '@/components/ui/FilterSheet.vue';
import {
  isShown,
  optionsFor,
  same,
  type FilterDraft,
  type ToolbarFilter,
  type ToolbarView,
} from '@/components/ui/listToolbar';

const props = withDefaults(
  defineProps<{
    /** Two or three ways of drawing the same rows. Omit for a screen with one. */
    views?: ToolbarView<V>[];
    view?: V;
    /** Names the switch for a screen reader ("How to show the tenants"). */
    viewLabel?: string;
    /** The search is drawn only when this is given; it is also its accessible name. */
    searchLabel?: string;
    search?: string;
    filters?: ToolbarFilter[];
    /** The filter dialog's title. */
    filterTitle?: string;
    /** The short "2025 · BH" line under the toolbar. Off where a screen already says it. */
    summary?: boolean;
  }>(),
  {
    views: () => [],
    view: undefined,
    viewLabel: 'How to show the list',
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

const sheetOpen = ref(false);

const applied = computed<FilterDraft>(() =>
  Object.fromEntries(props.filters.map((f) => [f.key, f.value]))
);

/** Filters the dialog would offer right now - the ones with a real choice in them. */
const offered = computed(() =>
  props.filters.filter((f) => isShown(f, applied.value) && optionsFor(f, applied.value).length > 1)
);

/** The ones narrowing the list now, with the words for the summary line. */
const active = computed(() =>
  offered.value
    .filter((f) => !same(f.value, f.defaultValue))
    .map((f) => ({
      key: f.key,
      label: optionsFor(f, applied.value).find((o) => same(o.value, f.value))?.label ?? String(f.value),
    }))
);

const filterButtonLabel = computed(() =>
  active.value.length
    ? `${props.filterTitle}, ${active.value.length} on`
    : props.filterTitle
);

function clearFilters() {
  emit('apply', Object.fromEntries(props.filters.map((f) => [f.key, f.defaultValue])));
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <!-- The Tenants switch, unchanged: full width with even halves on a phone,
           its natural width from `sm`. -->
      <div
        v-if="views.length > 1"
        class="min-h-[2.75rem] h-11 inline-flex w-full items-center rounded-full bg-tile border border-line p-1 shadow-xs sm:w-auto sm:shrink-0"
        role="group"
        :aria-label="viewLabel"
      >
        <button
          v-for="v in views"
          :key="v.value"
          type="button"
          :class="[
            'press h-full flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap sm:flex-none',
            view === v.value ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-soft hover:text-brand hover:bg-brand-soft/40',
          ]"
          :aria-pressed="view === v.value"
          @click="emit('update:view', v.value)"
        >
          <component :is="v.icon" v-if="v.icon" class="size-4" aria-hidden="true" />
          <span>{{ v.label }}</span>
        </button>
      </div>

      <!-- `min-w-0 flex-1` on the search so it takes what the filter button
           leaves, down to 320px phones; `sm:max-w-80` keeps it the 20rem every
           register's search box has been on a wide screen. -->
      <div v-if="searchLabel || offered.length" class="flex min-w-0 items-center gap-2 sm:flex-1">
        <div v-if="searchLabel" class="relative min-w-0 flex-1 sm:max-w-80">
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
          v-if="offered.length"
          type="button"
          :class="['pill-btn relative shrink-0', !searchLabel && 'ml-auto', active.length && 'border-brand text-brand']"
          :aria-label="filterButtonLabel"
          aria-haspopup="dialog"
          :aria-expanded="sheetOpen"
          @click="sheetOpen = true"
        >
          <SlidersHorizontal class="size-4" aria-hidden="true" />
          <span>{{ filterTitle }}</span>
          <!-- On the corner rather than inline, so the button keeps its width when
               a filter is applied: inline it took 28px from the search box,
               which left a 320px phone's tenant search showing "Searc". -->
          <span
            v-if="active.length"
            class="tabular absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-brand ring-2 ring-tile"
            aria-hidden="true"
          >{{ active.length }}</span>
        </button>
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

    <FilterSheet
      v-if="sheetOpen"
      :filters="filters"
      :title="filterTitle"
      @apply="emit('apply', $event)"
      @close="sheetOpen = false"
    />
  </div>
</template>
