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
 * THE MARK (Sean, 2026-10-01: the icon turns with the pull; 2026-10-02: "replace
 * the refresh icon with the hexagon rotating with our icon"). The app's mark:
 * its green hexagon turns with the finger the whole way down (one full turn by
 * the threshold), the white house and H stay upright. Crossing the threshold is
 * the one discrete cue - a slight grow, and a haptic tick where the phone has
 * one - and letting go there sets the hexagon turning like the first-load loader.
 */
import { computed, ref, watch } from 'vue';
import {
  isStandaloneDisplay,
  usePullToRefresh,
  PULL_ROTATE_PER_PX,
  PULL_RETURN_MS,
  PULL_SETTLE_MS,
  PULL_THRESHOLD,
} from '@/lib/pullToRefresh';

const enabled = isStandaloneDisplay();
const { distance, dragging, refreshing, returning } = usePullToRefresh();

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
  '--ptr-return': `${PULL_RETURN_MS}ms`,
}));

/*
 * `rotate` (on the hexagon only) and `scale` (on the whole mark) are their own
 * properties rather than one `transform`, so the grow at the threshold can ease
 * while the turn tracks the finger exactly.
 */
</script>

<template>
  <template v-if="enabled">
    <!--
      The app's own mark in place of a refresh icon (Sean, 2026-10-02: "replace the refresh icon
      with the hexagon rotating with our icon"): the same hexagon and house-and-H as the first-load
      loader in index.html and public/favicon.svg. The hexagon turns with the pull and spins
      fast-slow while reloading; the house and H stay upright, as on the loader.
    -->
    <div
      class="ptr-indicator pointer-events-none fixed left-1/2 top-0 z-[60] flex size-11 items-center justify-center"
      :class="{ 'ptr-settling': !dragging && !returning, 'ptr-returning': returning }"
      :style="indicatorStyle"
      aria-hidden="true"
      data-pull-to-refresh
    >
      <svg class="ptr-icon size-11 drop-shadow-md" viewBox="0 0 512 512" :style="{ scale: returning ? '0.7' : armed ? '1.12' : '1' }" data-ptr-icon>
        <path
          class="ptr-hex"
          :class="{ 'ptr-hex-spin': refreshing || returning }"
          :style="refreshing || returning ? undefined : { rotate: `${rotation}deg` }"
          fill="#17603f"
          d="M217.89 34Q256 12 294.11 34L429.21 112Q467.31 134 467.31 178L467.31 334Q467.31 378 429.21 400L294.11 478Q256 500 217.89 478L82.79 400Q44.69 378 44.69 334L44.69 178Q44.69 134 82.79 112Z"
        />
        <path
          fill="none"
          stroke="#fff"
          stroke-width="36"
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M146 216L256 126L366 216M186 244V366M326 244V366M186 304H326"
        />
      </svg>
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

/* The hexagon turns about its own centre (the viewBox is 512 square). */
.ptr-hex {
  transform-origin: 256px 256px;
}

/* Reloading: the loader's own turn - one revolution every 1.8 s, fast then slow (index.html). */
@keyframes ptr-hex-spin {
  to {
    rotate: 360deg;
  }
}
/*
 * Started 0.6 s into the turn - its fast part - so the spin is visibly going the instant the
 * finger lifts; begun at 0 the curve's slow start read as the hexagon stopping (Sean, 2026-10-02).
 */
.ptr-hex-spin {
  animation: ptr-hex-spin 1.8s cubic-bezier(0.77, 0, 0.175, 1) -0.6s infinite;
}
@media (prefers-reduced-motion: reduce) {
  .ptr-hex-spin {
    animation: none;
  }
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
    transition: scale 0.15s var(--ease-out);
  }
  .ptr-settling {
    transition:
      transform var(--ptr-settle) var(--ease-out),
      opacity var(--ptr-settle) var(--ease-out);
  }
  .ptr-settling .ptr-hex:not(.ptr-hex-spin) {
    transition: rotate var(--ptr-settle) var(--ease-out);
  }
  /*
   * Back up after a refresh: still turning, on an even ease-in-out so the travel is seen, and the
   * fade on an ease-in so it stays visible most of the way and goes only near the top.
   */
  .ptr-returning {
    transition:
      transform var(--ptr-return) cubic-bezier(0.65, 0, 0.35, 1),
      opacity var(--ptr-return) cubic-bezier(0.55, 0, 1, 0.45);
  }
  .ptr-returning .ptr-icon {
    transition: scale var(--ptr-return) cubic-bezier(0.65, 0, 0.35, 1);
  }
}
</style>
