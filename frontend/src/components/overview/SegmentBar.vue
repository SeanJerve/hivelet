<script setup lang="ts">
/**
 * One whole divided into its parts. Only for a true part-to-whole: the segments
 * must add up to the total they are drawn against.
 */
import { computed } from 'vue';
import type { Segment } from './types';

const props = defineProps<{
  segments: Segment[];
  label: string;
}>();

const total = computed(() => props.segments.reduce((s, x) => s + Math.max(0, x.value), 0));

const toneClass: Record<Segment['tone'], string> = {
  brand: 'bg-brand',
  bright: 'bg-brand-bright',
  night: 'bg-night',
  hatch: 'hatch bg-tile',
  soft: 'bg-brand-soft',
  // A sixth, for the six property areas: with five, two areas shared a green.
  faint: 'bg-ink-faint',
};
</script>

<template>
  <div role="img" :aria-label="label" class="flex h-3.5 w-full gap-1">
    <template v-for="(s, i) in segments" :key="s.label">
      <div
        v-if="s.value > 0 && total > 0"
        class="segment-fill h-full rounded-full origin-left"
        :class="toneClass[s.tone]"
        :style="{
          width: `${(s.value / total) * 100}%`,
          minWidth: '0.375rem',
          animationDelay: `${Math.min(i, 9) * 30}ms`,
        }"
      />
    </template>
  </div>
</template>

<style scoped>
/*
 * Each segment grows in from its trigger edge rather than simply being there,
 * the same fill-in the ring on OccupancyArc uses. The actual layout width is
 * still set instantly by the inline `width` above, so the row's total and the
 * gap between segments never move - `transform: scaleX` only changes what is
 * PAINTED inside that already-final box, never what is LAID OUT, which is why
 * it is safe to animate here and `width` itself is not.
 *
 * Same 30ms-a-step, capped-at-ten stagger as `.list-reveal-item` and
 * OccupancyArc's ring, so a reader who sees several of these on one screen
 * gets one consistent rhythm rather than a different one per chart.
 *
 * Deliberately still `--ease-out`, not the bounce MonthCapsules' bars got.
 * These segments sit edge to edge in one packed row (`gap-1`, no space
 * between); scaleX overshooting past 100% from `origin-left` would grow
 * each one into its neighbour's territory for the split second before it
 * settles, several of them at once given the stagger. A bar with clear air
 * above it can overshoot cleanly; a segment with another segment immediately
 * to its right cannot.
 */
.segment-fill {
  animation: segment-fill 0.26s var(--ease-out) backwards;
}
@keyframes segment-fill {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .segment-fill {
    animation: none;
  }
}
</style>
