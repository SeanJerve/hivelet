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
 */
import { ref, useId } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

const open = ref(false);
const id = useId();
</script>

<template>
  <div :id="id" :class="['flex flex-col gap-4', !open && 'max-md:hidden']">
    <slot />
  </div>
  <button
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
