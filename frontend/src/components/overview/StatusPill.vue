<script setup lang="ts">
/**
 * A status in words. The words carry the meaning; colour only repeats it.
 *
 * Set in the type, like a note in a ledger, with no capsule around it (Sean, 1 Nov 2026). A
 * tinted capsule with same-hue text in traffic-light colours is every generated dashboard's
 * default, and softer tints would only have been a paler copy of it. So the colours are the
 * property's earth tones instead of alarms: clay for what is wrong, ochre for what is waiting,
 * the brand's green for what is done, and the ordinary soft ink for everything else. Weight
 * marks the one that matters most. On a dark tile a status is the tile's own light text, except
 * the two that ask for action, which keep their hue in the dark theme's lighter shade (Lloyd,
 * 3 Nov 2026: the Emergency on Needs your attention read as plain text).
 *
 * These carried a coloured dot before the word, everywhere, which said nothing
 * the word did not already say and made two side by side read as a list of
 * bullets. A marker earns its place only in a chart legend, where the shape has
 * to match a mark drawn in the chart. The one legend that needs that draws its
 * own marks (MonthCapsules), so none carries one. Two in a row are separated by
 * a mid-dot (`.status-word` in index.css).
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    tone?: 'paid' | 'verify' | 'overdue' | 'neutral' | 'unentered' | 'expected' | 'on-dark';
  }>(),
  { tone: 'neutral' }
);

const toneClass = computed(
  () =>
    ({
      paid: 'text-brand',
      verify: 'text-status-wait in-[.on-dark]:text-on-night-wait',
      overdue: 'font-semibold text-status-alert in-[.on-dark]:text-on-night-alert',
      neutral: 'text-ink-soft',
      unentered: 'text-ink-soft',
      expected: 'text-ink-faint',
      'on-dark': 'text-on-night',
    })[props.tone]
);
</script>

<template>
  <span
    :class="[
      'status-word inline-flex items-center whitespace-nowrap text-[0.8125rem] font-medium leading-5',
      props.tone !== 'verify' && props.tone !== 'overdue' && 'in-[.on-dark]:text-on-night',
      // A ticket moving Open to Resolved, a unit going Vacant to Occupied - this
      // word stays mounted and only its tone prop changes, so without a
      // transition the colour swap was an instant snap rather than a state
      // change the reader could follow. Named properties, same ease token as
      // every other colour transition in the workspace.
      'transition-colors duration-150 ease-[var(--ease-out)]',
      toneClass,
    ]"
  >
    <slot />
  </span>
</template>
