<script setup lang="ts" generic="T">
/**
 * The one table in the workspace system.
 *
 * Every register used to build its own: its own wrapper, its own header
 * styling, its own idea of how tall to grow. Three of them needed 900px or more
 * and scrolled sideways on a laptop, and all of them rendered every row they
 * had, so a ledger of 900 entries ran the page scrollbar down to a sliver.
 *
 * This one:
 *   - shows a first page and asks before showing more, so the page stays the
 *     height of the screen until the reader wants more of it
 *   - becomes one tile per row below `lg`, because a table read sideways on a
 *     phone is not a table
 *   - carries the caption, the sticky head and the empty state in one place
 *
 * The caller supplies the columns through `head` and `row`, and the phone
 * version through `card`. What a row means stays with the screen that owns it.
 */
import { computed, toRef } from 'vue';
import { usePaged } from '@/lib/usePaged';
import ShowMore from './ShowMore.vue';

const props = withDefaults(
  defineProps<{
    rows: T[];
    /** Read by a screen reader in place of a visible title. */
    caption: string;
    /** How many rows to show before asking. */
    pageSize?: number;
    /** Heading for the empty state. */
    emptyTitle?: string;
    /** Sentence for the empty state. */
    emptyNote?: string;
    /** Singular noun for the counts, e.g. "payment". */
    noun?: string;
    /** Drops the tile chrome, for a table already sitting inside a tile. */
    flat?: boolean;
  }>(),
  { pageSize: 10, emptyTitle: 'Nothing here', emptyNote: '', noun: 'row', flat: false }
);

const { visible, remaining, nextStep, showMore, showEverything } = usePaged(
  toRef(props, 'rows'),
  props.pageSize
);

const total = computed(() => props.rows.length);
</script>

<template>
  <div>
    <div
      v-if="rows.length === 0"
      :class="['px-6 py-16 text-center', flat ? '' : 'rounded-tile bg-tile']"
    >
      <p class="text-base font-semibold text-ink">{{ emptyTitle }}</p>
      <p v-if="emptyNote" class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
        {{ emptyNote }}
      </p>
    </div>

    <template v-else>
      <!-- The register, on a screen wide enough to read one -->
      <div :class="['hidden overflow-hidden lg:block', flat ? '' : 'rounded-tile bg-tile']">
        <div class="ws-table-wrap">
          <table class="ws-table">
            <caption class="sr-only">{{ caption }}</caption>
            <thead>
              <slot name="head" />
            </thead>
            <tbody>
              <slot v-for="(row, i) in visible" :key="i" name="row" :row="row" :index="i" />
            </tbody>
          </table>
        </div>
      </div>

      <!-- One tile per row, on a phone -->
      <div class="space-y-3 lg:hidden">
        <div
          v-for="(row, i) in visible"
          :key="i"
          :class="['rounded-2xl p-5', flat ? 'bg-canvas' : 'rounded-tile bg-tile']"
        >
          <slot name="card" :row="row" :index="i" />
        </div>
      </div>

      <ShowMore
        :shown="visible.length"
        :total="total"
        :remaining="remaining"
        :next-step="nextStep || pageSize"
        :noun="noun"
        @more="showMore"
        @all="showEverything"
      />
    </template>
  </div>
</template>
