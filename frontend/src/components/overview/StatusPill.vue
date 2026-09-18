<script setup lang="ts">
/**
 * A status in words. The words carry the meaning; colour only repeats it.
 *
 * These carried a coloured dot before the word, everywhere, which said nothing
 * the word did not already say and made two pills side by side read as a list
 * of bullets. A marker earns its place only in a chart legend, where the shape
 * has to match a mark drawn in the chart. The one legend that needs that draws
 * its own marks (MonthCapsules), so no pill carries one.
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    tone?: 'paid' | 'verify' | 'overdue' | 'neutral' | 'unentered' | 'expected' | 'on-dark';
  }>(),
  { tone: 'neutral' }
);

const pillClass = computed(
  () =>
    ({
      paid: 'bg-brand-soft text-brand',
      verify: 'bg-verify-soft text-verify',
      overdue: 'bg-overdue-soft text-overdue',
      neutral: 'bg-canvas text-ink-soft',
      unentered: 'bg-tile text-ink-soft border border-line',
      expected: 'bg-tile text-ink-soft border border-dashed border-hatch',
      'on-dark': 'bg-white/10 text-on-night',
    })[props.tone]
);
</script>

<template>
  <span
    :class="[
      'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-4',
      pillClass,
    ]"
  >
    <slot />
  </span>
</template>
