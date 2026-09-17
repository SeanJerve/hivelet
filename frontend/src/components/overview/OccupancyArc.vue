<script setup lang="ts">
/**
 * The building as a half ring: one segment per rentable unit, grouped by
 * cluster with a wider gap between clusters. Occupied units are solid; vacant
 * ones are hatched. It is a count of real units, not a percentage gauge.
 */
import { computed, useId } from 'vue';
import type { ArcUnit } from './types';

const props = defineProps<{
  units: ArcUnit[];
}>();

const patternId = useId();

const CX = 120;
const CY = 118;
const R = 96;
const UNIT_GAP = 1.1;
const CLUSTER_GAP = 5;

const segments = computed(() => {
  const list = props.units;
  if (list.length === 0) return [];
  let clusterBreaks = 0;
  for (let i = 1; i < list.length; i++) if (list[i].cluster !== list[i - 1].cluster) clusterBreaks++;
  const unitBreaks = list.length - 1 - clusterBreaks;
  const sweep = (180 - clusterBreaks * CLUSTER_GAP - unitBreaks * UNIT_GAP) / list.length;

  let angle = 180;
  return list.map((u, i) => {
    if (i > 0) angle -= list[i].cluster !== list[i - 1].cluster ? CLUSTER_GAP : UNIT_GAP;
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
      <defs>
        <pattern :id="patternId" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" class="fill-tile" />
          <rect width="1.6" height="6" class="fill-hatch" />
        </pattern>
      </defs>
      <path
        v-for="s in segments"
        :key="s.code"
        :d="s.d"
        fill="none"
        stroke-width="24"
        :class="s.occupied ? 'stroke-brand' : undefined"
        :stroke="s.occupied ? undefined : `url(#${patternId})`"
      />
    </svg>
    <div aria-hidden="true" class="absolute inset-x-0 bottom-0 text-center">
      <span class="block text-4xl leading-10 font-semibold tabular tracking-tight">
        {{ occupied }}<span class="text-ink-faint text-2xl">/{{ units.length }}</span>
      </span>
      <span class="block text-xs leading-4 text-ink-soft">units occupied</span>
    </div>
  </div>
</template>
