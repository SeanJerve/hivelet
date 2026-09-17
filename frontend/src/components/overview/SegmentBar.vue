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
};
</script>

<template>
  <div role="img" :aria-label="label" class="flex h-3.5 w-full gap-1">
    <template v-for="s in segments" :key="s.label">
      <div
        v-if="s.value > 0 && total > 0"
        :class="['h-full rounded-full', toneClass[s.tone]]"
        :style="{ width: `${(s.value / total) * 100}%`, minWidth: '0.375rem' }"
      />
    </template>
  </div>
</template>
