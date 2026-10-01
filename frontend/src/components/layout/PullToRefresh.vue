<script setup lang="ts">
/**
 * The pull-down reload for the installed app (Sean, 2026-10-01). The gesture,
 * and why it exists only in standalone mode, are in lib/pullToRefresh.ts; this
 * is the circle that follows the finger and the status line a screen reader
 * hears.
 *
 * Nothing renders in a browser tab: `enabled` is read once, because a page does
 * not change display mode while it is open.
 */
import { computed } from 'vue';
import { ArrowDown, RefreshCw } from 'lucide-vue-next';
import { isStandaloneDisplay, usePullToRefresh, PULL_THRESHOLD } from '@/lib/pullToRefresh';

const enabled = isStandaloneDisplay();
const { distance, dragging, refreshing } = usePullToRefresh();

/** Past the threshold: letting go now reloads. The arrow turns to say so. */
const armed = computed(() => refreshing.value || distance.value >= PULL_THRESHOLD);

/*
 * Parked 48px above the top edge (its own 40px plus a gap) and brought down by
 * the pull, below the notch on phones that have one. Fades in over the same
 * travel, so a short accidental drag shows only a hint of it.
 */
const indicatorStyle = computed(() => ({
  transform: `translate(-50%, calc(${distance.value}px - 48px + env(safe-area-inset-top, 0px)))`,
  opacity: String(Math.min(1, distance.value / PULL_THRESHOLD)),
}));
</script>

<template>
  <template v-if="enabled">
    <div
      class="ptr-indicator pointer-events-none fixed left-1/2 top-0 z-[60] flex size-10 items-center justify-center rounded-full border border-line bg-tile text-brand shadow-lift"
      :class="{ 'ptr-settling': !dragging }"
      :style="indicatorStyle"
      aria-hidden="true"
      data-pull-to-refresh
    >
      <RefreshCw v-if="refreshing" class="size-5 motion-safe:animate-spin" />
      <ArrowDown v-else class="ptr-arrow size-5" :class="{ 'rotate-180': armed }" />
    </div>
    <!-- The reload follows within two frames; this is what is said before it. -->
    <span class="sr-only" role="status">{{ refreshing ? 'Refreshing' : '' }}</span>
  </template>
</template>

<style scoped>
/*
 * While the finger is down the circle tracks it exactly - easing there would
 * make it lag behind the touch. Once released it springs back (or settles at
 * the threshold while reloading) on the project's `--ease-out`. A reader who
 * asked for less motion gets the jump without the travel.
 */
@media (prefers-reduced-motion: no-preference) {
  .ptr-settling {
    transition:
      transform 0.2s var(--ease-out),
      opacity 0.2s var(--ease-out);
  }
  .ptr-arrow {
    transition: rotate 0.15s var(--ease-out), transform 0.15s var(--ease-out);
  }
}
</style>
