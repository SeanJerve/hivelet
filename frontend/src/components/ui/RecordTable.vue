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
 * version through `card`. A register that carries a subtotal supplies it twice
 * for the same reason: `foot` for the table, `foot-card` for the phone. What a
 * row means stays with the screen that owns it.
 */
import { computed, onUnmounted, ref, toRef, watch } from 'vue';
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

/**
 * Whether the visible rows should still stagger in.
 *
 * This is true only for the first paint that has real rows in it, and false
 * for good after that. A register's `rows` prop changes on every keystroke in
 * a search box and every filter chip pressed - `usePaged` resets `visible`
 * back to the first page each time - so without this gate, narrowing a filter
 * to fewer rows and then clearing it would replay the whole reveal on rows the
 * reader has already seen. It is watched off `rows.length` rather than fired
 * once on mount, because several of this table's callers still have their
 * fetch in flight when they first render - gating on a mount timer would have
 * the animation fire against an empty table and never play against the real
 * data that arrives a moment later.
 */
const revealFirstLoad = ref(true);
let revealTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  () => props.rows.length,
  (len) => {
    if (len > 0 && revealFirstLoad.value && revealTimer === null) {
      revealTimer = setTimeout(() => {
        revealFirstLoad.value = false;
      }, 600);
    }
  },
  { immediate: true }
);
onUnmounted(() => {
  if (revealTimer !== null) clearTimeout(revealTimer);
});
</script>

<template>
  <div>
    <div
      v-if="rows.length === 0"
      :class="['ws-reveal px-6 py-16 text-center', flat ? '' : 'rounded-tile bg-tile']"
    >
      <p class="text-base font-semibold text-ink">{{ emptyTitle }}</p>
      <p v-if="emptyNote" class="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-soft">
        {{ emptyNote }}
      </p>
    </div>

    <template v-else>
      <!-- The register, on a screen wide enough to read one -->
      <div :class="['hidden overflow-hidden lg:block', flat ? '' : 'rounded-tile bg-tile']">
        <div class="ws-table-wrap" :class="{ 'is-first-load': revealFirstLoad }">
          <table class="ws-table">
            <caption class="sr-only">{{ caption }}</caption>
            <thead>
              <slot name="head" />
            </thead>
            <tbody>
              <slot v-for="(row, i) in visible" :key="i" name="row" :row="row" :index="i" />
            </tbody>
            <!-- A subtotal row, where the register carries one. -->
            <tfoot v-if="$slots.foot">
              <slot name="foot" />
            </tfoot>
          </table>
        </div>
      </div>

      <!--
        One tile per row, on a phone. A flat card is bordered, not filled
        `bg-canvas`: the soft status pills are canvas-coloured too, and on a
        canvas card they lost their outline (the directory's Vacant pill, 2026-09-25).
      -->
      <div class="space-y-3 lg:hidden">
        <div
          v-for="(row, i) in visible"
          :key="i"
          :class="[
            'rounded-2xl p-5',
            flat ? 'border border-line' : 'rounded-tile bg-tile',
            revealFirstLoad ? 'list-reveal-item' : '',
          ]"
          :style="revealFirstLoad ? { animationDelay: `${Math.min(i, 9) * 30}ms` } : undefined"
        >
          <slot name="card" :row="row" :index="i" />
        </div>

        <!--
          The subtotal, on a phone.
          `tfoot` lives inside the `hidden lg:block` table above, so below `lg`
          the whole per-cluster breakdown - rent, the 50% column, water, garbage
          and the headcount - simply was not rendered. The only figure that
          survived was the one the cluster header carries on its own.
          It takes the same surface as the cards it closes, with a border
          standing in for the 2px rule `.ws-table tfoot` draws above itself, so
          it reads as a conclusion rather than as one more entry. No stagger:
          the desktop reveal is scoped to `tbody tr` and leaves its own footer
          still, and this is the same line.
        -->
        <div
          v-if="$slots['foot-card']"
          :class="[
            'rounded-2xl border border-line p-5',
            flat ? 'bg-canvas' : 'rounded-tile bg-tile',
          ]"
        >
          <slot name="foot-card" />
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

<style scoped>
/*
 * The mobile card list above gets `.list-reveal-item` directly, because the
 * wrapping `<div>` per card belongs to this component. The desktop `<tr>`
 * has no such wrapper - the row markup itself comes from the caller through
 * the `row` slot, so there is nowhere on this component's own template to
 * hang a class or an inline `animationDelay` for it. `:deep()` reaches past
 * that: it drops the scoping check on the DESCENDANT side of the selector,
 * so it still matches a `<tr>` that was written in IncomeCollectionsView or
 * wherever else, as long as it sits inside this component's own scoped
 * ancestor.
 *
 * Gated by `.is-first-load` on the ancestor rather than applied unconditionally,
 * for the same reason `revealFirstLoad` exists at all: once it is false, a
 * filtered-out row coming back should not replay the stagger. Removing the
 * ancestor class after the rows have already finished animating has no visible
 * effect - the keyframe's own end state (opacity 1, no translate) is identical
 * to the element's plain, unanimated appearance, so nothing snaps.
 *
 * The `ws-list-reveal` keyframe itself is the one already declared in
 * index.css for `.list-reveal-item` - reused rather than redeclared, so a
 * table row and a notification row settle at the same pace.
 */
.ws-table-wrap.is-first-load :deep(tbody tr) {
  animation: ws-list-reveal 0.22s var(--ease-out) backwards;
  animation-delay: 270ms;
}
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(1)) { animation-delay: 0ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(2)) { animation-delay: 30ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(3)) { animation-delay: 60ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(4)) { animation-delay: 90ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(5)) { animation-delay: 120ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(6)) { animation-delay: 150ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(7)) { animation-delay: 180ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(8)) { animation-delay: 210ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(9)) { animation-delay: 240ms; }
.ws-table-wrap.is-first-load :deep(tbody tr:nth-child(10)) { animation-delay: 270ms; }

@media (prefers-reduced-motion: reduce) {
  .ws-table-wrap.is-first-load :deep(tbody tr) {
    animation: none;
  }
}
</style>
