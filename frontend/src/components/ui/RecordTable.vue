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
import { computed, ref, watch } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

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
  }>(),
  { pageSize: 10, emptyTitle: 'Nothing here', emptyNote: '', noun: 'row' }
);

const shown = ref(props.pageSize);

// A new filter starts the count again, or the reader is left several pages in
// with no way of telling.
watch(
  () => props.rows,
  () => {
    shown.value = props.pageSize;
  }
);

const visible = computed(() => props.rows.slice(0, shown.value));
const remaining = computed(() => Math.max(0, props.rows.length - shown.value));
const nextStep = computed(() => Math.min(props.pageSize, remaining.value));

function showMore() {
  shown.value += props.pageSize;
}

function showEverything() {
  shown.value = props.rows.length;
}

function plural(n: number) {
  return n === 1 ? props.noun : `${props.noun}s`;
}
</script>

<template>
  <div>
    <div v-if="rows.length === 0" class="rounded-tile bg-tile px-6 py-16 text-center">
      <p class="text-base font-semibold text-ink">{{ emptyTitle }}</p>
      <p v-if="emptyNote" class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
        {{ emptyNote }}
      </p>
    </div>

    <template v-else>
      <!-- The register, on a screen wide enough to read one -->
      <div class="hidden overflow-hidden rounded-tile bg-tile lg:block">
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
        <div v-for="(row, i) in visible" :key="i" class="rounded-tile bg-tile p-5">
          <slot name="card" :row="row" :index="i" />
        </div>
      </div>

      <div
        v-if="remaining > 0"
        class="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-ink-soft"
      >
        <button type="button" class="pill-btn" @click="showMore">
          <ChevronDown class="size-4" aria-hidden="true" />
          <span>Show {{ nextStep }} more</span>
        </button>
        <button type="button" class="pill-btn-quiet" @click="showEverything">
          Show all {{ rows.length }}
        </button>
        <p aria-live="polite" class="basis-full text-center">
          {{ visible.length }} of {{ rows.length }} {{ plural(rows.length) }}
        </p>
      </div>

      <p v-else-if="rows.length > pageSize" class="mt-3 text-center text-sm text-ink-soft">
        All {{ rows.length }} {{ plural(rows.length) }}
      </p>
    </template>
  </div>
</template>
