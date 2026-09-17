<script setup lang="ts">
/**
 * A status in words, with a marker shaped by what kind of status it is. The
 * words always carry the meaning; colour and marker only repeat it.
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

const markerClass = computed(
  () =>
    ({
      paid: 'size-1.5 rounded-full bg-brand',
      verify: 'size-1.5 rounded-full bg-verify',
      overdue: 'size-1.5 rounded-full bg-overdue',
      neutral: 'size-1.5 rounded-full bg-ink-faint',
      unentered: 'size-3 rounded-full hatch border border-line',
      expected: 'size-3 rounded-full border border-dashed border-ink-faint',
      'on-dark': 'size-1.5 rounded-full bg-on-night-soft',
    })[props.tone]
);
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-4 whitespace-nowrap',
      pillClass,
    ]"
  >
    <span aria-hidden="true" :class="markerClass" />
    <slot />
  </span>
</template>
