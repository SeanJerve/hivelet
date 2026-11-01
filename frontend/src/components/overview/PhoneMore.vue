<script setup lang="ts">
/**
 * The second half of an Overview tile, folded away below 768px.
 *
 * Loyd, 2026-10-03: on a phone the first screen should show what needs her,
 * this month's rent and water, occupancy and the month chart, all at once. The
 * figures a tile adds after its headline (the list of payments waiting, the
 * year total, the chart's three averages) fold under "More" there. From 768px
 * there is room for everything, so the toggle is not drawn and nothing folds.
 *
 * `max-md:hidden`, not `v-if`: the content stays in the page, so a screen
 * reader on a phone still reaches it once it is opened, and nothing re-mounts.
 *
 * `everywhere` folds it at every width (Sean, 1 Nov 2026), for a tile whose extra detail would
 * otherwise stretch the short tiles beside it. That one is drawn as Monthly Income's cluster
 * headers are: a full row above what it folds, chevron first, the title, and on the right what
 * it holds, so a shut section still says so.
 */
import { ref, useId } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

defineProps<{ everywhere?: boolean; title?: string; summary?: string }>();

const open = ref(false);
const id = useId();
</script>

<template>
  <button
    v-if="everywhere"
    type="button"
    class="press-plate -mx-2 flex items-center justify-between gap-3 rounded-xl border-t border-line px-2 py-3 text-left hover:bg-hover"
    :aria-expanded="open"
    :aria-controls="id"
    @click="open = !open"
  >
    <span class="flex min-w-0 items-center gap-2">
      <ChevronDown
        :class="['size-4 shrink-0 text-ink-soft transition-transform duration-200 ease-[var(--ease-out)]', !open && '-rotate-90']"
        aria-hidden="true"
      />
      <span class="truncate text-[0.9375rem] font-semibold text-ink">{{ title }}</span>
    </span>
    <span v-if="summary" class="shrink-0 text-sm tabular text-ink-soft">{{ summary }}</span>
  </button>
  <div :id="id" :class="['flex flex-col gap-4', !open && (everywhere ? 'hidden' : 'max-md:hidden')]">
    <slot />
  </div>
  <button
    v-if="!everywhere"
    type="button"
    class="press -my-2 inline-flex min-h-11 items-center gap-1 self-start text-xs font-semibold opacity-80 hover:opacity-100 md:hidden"
    :aria-expanded="open"
    :aria-controls="id"
    @click="open = !open"
  >
    {{ open ? 'Less' : 'More' }}
    <ChevronDown
      :class="['size-3.5 motion-safe:transition-transform motion-safe:duration-200', open && 'rotate-180']"
      aria-hidden="true"
    />
  </button>
</template>
