<script setup lang="ts">
/**
 * Occupancy as a half ring of one segment per rentable unit, filled from the
 * left: occupied units first, solid, then vacant ones as empty track. Full reads
 * as a full ring and every vacancy shortens the fill. Which units are vacant is
 * listed in words under the ring (and in the aria label), not by position.
 *
 * It used to keep each unit in its cluster's place, with wider gaps between
 * clusters, and hatch a vacant one where it stood. The small clusters sit
 * together at the right end (PH, the Front Apartment, Linda), so their gaps
 * made a fully occupied ring look broken there, and a vacancy never read as
 * "less" (asked for, 2026-09-25).
 */
import { computed } from 'vue';
import type { ArcUnit } from './types';

const props = defineProps<{
  units: ArcUnit[];
}>();

const CX = 120;
const CY = 118;
const R = 96;
const GAP = 1.4;

const segments = computed(() => {
  const list = [...props.units.filter((u) => u.occupied), ...props.units.filter((u) => !u.occupied)];
  if (list.length === 0) return [];
  const sweep = (180 - (list.length - 1) * GAP) / list.length;

  let angle = 180;
  return list.map((u, i) => {
    if (i > 0) angle -= GAP;
    const start = angle;
    const end = angle - sweep;
    angle = end;
    const p = (deg: number) => {
      const rad = (deg * Math.PI) / 180;
      return `${(CX + R * Math.cos(rad)).toFixed(2)} ${(CY - R * Math.sin(rad)).toFixed(2)}`;
    };
    return { ...u, d: `M ${p(start)} A ${R} ${R} 0 0 1 ${p(end)}` };
  });
});

/**
 * Spreads every segment's draw-in across one continuous sweep rather than a
 * quick, capped-at-ten stagger (`.list-reveal-item`'s cadence, which every
 * OTHER staggered reveal in the app still uses on purpose - this is the one
 * deliberate exception). A ring read as "one whole, occupied left to right"
 * the moment it draws itself in a fraction of a second; delaying each
 * segment across the ring's real width instead makes it read as what it is -
 * a measurement being taken - and asked for by name ("rotate slow from left
 * to right") rather than the popcorn effect a short cap produces on 33
 * pieces.
 */
const SWEEP_DURATION_MS = 1100;
function sweepDelay(i: number): number {
  const count = segments.value.length || 1;
  return Math.round((i / count) * SWEEP_DURATION_MS);
}

const occupied = computed(() => props.units.filter((u) => u.occupied).length);
const vacantCodes = computed(() => props.units.filter((u) => !u.occupied).map((u) => u.code));

const description = computed(
  () =>
    `${occupied.value} of ${props.units.length} units occupied.` +
    (vacantCodes.value.length ? ` Vacant: ${vacantCodes.value.join(', ')}.` : '')
);
</script>

<template>
  <div class="relative w-full max-w-[17rem] mx-auto">
    <svg viewBox="0 0 240 128" role="img" :aria-label="description" class="w-full h-auto block">
      <path
        v-for="(s, i) in segments"
        :key="s.code"
        :d="s.d"
        fill="none"
        stroke-width="24"
        stroke-dasharray="100"
        pathLength="100"
        class="arc-segment"
        :style="{ animationDelay: `${sweepDelay(i)}ms` }"
        :class="s.occupied ? 'stroke-brand' : 'stroke-line'"
      />
    </svg>
    <div aria-hidden="true" class="absolute inset-x-0 bottom-0 text-center arc-count">
      <span class="block text-4xl leading-10 font-semibold tabular tracking-tight">
        {{ occupied }}<span class="text-ink-faint text-2xl">/{{ units.length }}</span>
      </span>
      <span class="block text-xs leading-4 text-ink-soft">units occupied</span>
    </div>
  </div>
</template>

<style scoped>
/*
 * The ring draws itself in rather than appearing complete, the same way a
 * measurement being taken reads as more trustworthy than a number that was
 * simply always there. `path-length="100"` normalises every segment's dash
 * units to a 0-100 scale regardless of its true arc length, so one keyframe
 * covers a two-degree sliver and a forty-degree one alike.
 *
 * Each segment's OWN draw is short - a quick reveal, not a slow one - and
 * `sweepDelay()` (above) is what actually reads as slow: spreading those
 * quick reveals across a full 1.1s turns 33 short flashes into one
 * continuous sweep moving left to right, the same way a stadium wave is
 * many people each standing up fast, spaced apart in time.
 */
.arc-segment {
  animation: arc-draw 0.18s var(--ease-out) backwards;
}
@keyframes arc-draw {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* The count reads as the ring's conclusion, not a separate label beside it -
   it settles in once the sweep (SWEEP_DURATION_MS, above) has actually
   reached the far end, not a fixed short delay that assumed a fast stagger. */
.arc-count {
  animation: arc-count-in 0.22s var(--ease-out) 1.15s backwards;
}
@keyframes arc-count-in {
  from {
    opacity: 0;
    translate: 0 4px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .arc-segment,
  .arc-count {
    animation: none;
  }
}
</style>
