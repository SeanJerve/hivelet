<script setup lang="ts">
/**
 * A register loading. The shape matches the register itself: a tile, a header
 * strip, then rows separated by hairlines, with the last column right-aligned
 * the way a figure is.
 *
 * RecordTable, the register this stands in for, is two different layouts, not
 * one: a `<table>` at `lg` and up, and "one tile per row" - a card with a
 * title/amount header and a two-column label list - below it (see its own
 * header comment). This skeleton used to be only the table shape, at every
 * width. Below `lg` that meant real content landing swapped a skeleton
 * squeezed into narrow flex columns for full-width cards with an entirely
 * different rhythm - the jump this component exists to prevent, reintroduced
 * by only ever drawing half of what it stands in for. Both shapes are drawn
 * now, gated on the same `lg` breakpoint RecordTable itself switches on, so
 * only one is ever in the DOM at a time.
 */
import Skeleton from './Skeleton.vue';

interface Props {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

withDefaults(defineProps<Props>(), {
  columns: 5,
  rows: 5,
  showHeader: true,
});
</script>

<template>
  <div aria-hidden="true">
    <!-- The register, on a screen wide enough to read one -->
    <div class="hidden w-full overflow-hidden rounded-tile bg-tile lg:block">
      <div
        v-if="showHeader"
        class="flex items-center gap-4 border-b border-line px-5 py-4 sm:px-6"
      >
        <div v-for="c in columns" :key="'th-' + c" class="flex-1">
          <Skeleton
            :class-name="['h-3 rounded-full', c === columns ? 'ml-auto w-14' : 'w-20']"
          />
        </div>
      </div>

      <div class="divide-y divide-line">
        <div
          v-for="r in rows"
          :key="'tr-' + r"
          class="flex items-center gap-4 px-5 py-4 sm:px-6"
        >
          <div
            v-for="c in columns"
            :key="'td-' + r + '-' + c"
            class="flex flex-1 items-center gap-3"
          >
            <Skeleton v-if="c === 1" class-name="size-8 shrink-0 rounded-full" />
            <Skeleton
              :class-name="[
                'h-4 rounded-full',
                c === 1 ? 'w-28' : c === columns ? 'ml-auto w-16' : 'w-20 sm:w-24',
              ]"
            />
          </div>
        </div>
      </div>
    </div>

    <!--
      One tile per row, on a phone - RecordTable's own `card` slot is
      consistently a title/subtitle header with a right-aligned figure or
      status pill, then a `grid grid-cols-2` label list (IncomeCollectionsView,
      ExpensesLedgerView, TenantManagementView all shape it this way). Four
      fields is the common count; a register whose cards run longer still
      settles into the same rhythm once the real content lands; this is a
      placeholder's proportions, not a promise of exactly what follows.
    -->
    <div class="space-y-3 lg:hidden">
      <div v-for="r in rows" :key="'card-' + r" class="rounded-2xl bg-tile p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <Skeleton class-name="h-4 w-28 rounded-full" />
            <Skeleton class-name="mt-2 h-3 w-20 rounded-full" />
          </div>
          <Skeleton class-name="h-4 w-16 shrink-0 rounded-full" />
        </div>
        <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <div v-for="f in 4" :key="'field-' + f">
            <Skeleton class-name="h-2.5 w-14 rounded-full" />
            <Skeleton class-name="mt-1.5 h-3.5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
