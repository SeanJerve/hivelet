<script setup lang="ts">
/**
 * The pull-down reload for the installed app (Sean, 2026-10-01). The gesture,
 * and why it exists only in standalone mode, are in lib/pullToRefresh.ts; this
 * is the circle that follows the finger and the status line a screen reader
 * hears.
 *
 * Nothing renders in a browser tab: `enabled` is read once, because a page does
 * not change display mode while it is open.
 *
 * THE ICON (Sean, 2026-10-01: "I like the arrow that turns into a spinning
 * refresh icon at a certain point - keep that - but I want the refresh icon to
 * also rotate relative to how far you pull"). It turns with the finger the
 * whole way down: the arrow from pointing down to pointing up by the
 * threshold, then the refresh icon that replaces it carries on turning at the
 * same rate for as long as the pull continues. Crossing the threshold is the
 * one discrete cue - grey to brand green, a slight grow, and a haptic tick
 * where the phone has one - and letting go there sets it spinning on its own.
 */
import { computed, ref, watch } from 'vue';
import { ArrowDown, RefreshCw } from 'lucide-vue-next';
import {
  isStandaloneDisplay,
  usePullToRefresh,
  PULL_ROTATE_PER_PX,
  PULL_SETTLE_MS,
  PULL_THRESHOLD,
} from '@/lib/pullToRefresh';

const enabled = isStandaloneDisplay();
const { distance, dragging, refreshing } = usePullToRefresh();

/** Past the threshold: letting go now reloads. The arrow becomes the refresh icon. */
const armed = computed(() => refreshing.value || distance.value >= PULL_THRESHOLD);

/*
 * The icon's turn, in degrees, from the indicator's travel. Held where it was
 * at the moment of release while refreshing: the indicator then eases up to
 * its resting place, and unwinding the icon on the way would read as the
 * gesture undoing itself. The spin takes over from that angle.
 */
const rotation = ref(0);
watch(distance, (d) => {
  if (!refreshing.value) rotation.value = d * PULL_ROTATE_PER_PX;
});

/*
 * Parked 48px above the top edge (its own 40px plus a gap) and brought down by
 * the pull, below the notch on phones that have one. Fades in over the same
 * travel, so a short accidental drag shows only a hint of it.
 */
const indicatorStyle = computed(() => ({
  transform: `translate(-50%, calc(${distance.value}px - 48px + env(safe-area-inset-top, 0px)))`,
  opacity: String(Math.min(1, distance.value / PULL_THRESHOLD)),
  '--ptr-settle': `${PULL_SETTLE_MS}ms`,
}));

/*
 * `rotate` and `scale` are set as their own properties rather than inside one
 * `transform`, so the grow at the threshold can ease while the turn tracks the
 * finger exactly - one `transform` would have to take one transition for both.
 */
const iconStyle = computed(() => ({
  rotate: `${rotation.value}deg`,
  scale: armed.value ? '1.12' : '1',
}));
</script>

<template>
  <template v-if="enabled">
    <div
      class="ptr-indicator pointer-events-none fixed left-1/2 top-0 z-[60] flex size-10 items-center justify-center rounded-full border border-line bg-tile shadow-lift"
      :class="{ 'ptr-settling': !dragging }"
      :style="indicatorStyle"
      aria-hidden="true"
      data-pull-to-refresh
    >
      <span
        class="ptr-icon flex"
        :class="armed ? 'text-brand' : 'text-ink-faint'"
        :style="iconStyle"
        data-ptr-icon
      >
        <RefreshCw v-if="armed" class="size-5" :class="{ 'motion-safe:animate-spin': refreshing }" />
        <ArrowDown v-else class="size-5" />
      </span>
    </div>
    <!-- The reload follows once the indicator settles; this is what is said before it. -->
    <span class="sr-only" role="status">{{ refreshing ? 'Refreshing' : '' }}</span>
  </template>
</template>

<style scoped>
/*
 * Compositor-only: the indicator and its icon move by transform and opacity
 * (and `rotate`/`scale`, which are transforms), never by top or margin, so a
 * pull never lays the page out again. `will-change` keeps both on their own
 * layer for the whole gesture rather than promoting them on the first frame.
 */
.ptr-indicator,
.ptr-icon {
  will-change: transform, opacity;
}

/*
 * While the finger is down the circle and the icon's turn track it exactly -
 * easing there would make them lag behind the touch. Once released the circle
 * springs back (or settles where it rests while reloading) on the project's
 * `--ease-out`, the icon unwinding with it. The colour and the grow at the
 * threshold always ease: they are a cue, not something the finger is holding.
 * A reader who asked for less motion gets the jumps without the travel.
 */
@media (prefers-reduced-motion: no-preference) {
  .ptr-icon {
    transition:
      scale 0.15s var(--ease-out),
      color 0.15s var(--ease-out);
  }
  .ptr-settling {
    transition:
      transform var(--ptr-settle) var(--ease-out),
      opacity var(--ptr-settle) var(--ease-out);
  }
  .ptr-settling .ptr-icon {
    transition:
      rotate var(--ptr-settle) var(--ease-out),
      scale 0.15s var(--ease-out),
      color 0.15s var(--ease-out);
  }
}
</style>
