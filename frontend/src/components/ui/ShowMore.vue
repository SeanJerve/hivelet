<script setup lang="ts">
/**
 * The one control for lengthening a capped list. A register, a trail and a
 * stack of cards all grow the same way, so the reader learns it once.
 */
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps<{
  shown: number;
  total: number;
  remaining: number;
  nextStep: number;
  /** Singular noun, e.g. "payment". */
  noun: string;
}>();

const emit = defineEmits<{ more: []; all: [] }>();

/**
 * Pluralise the counter's noun.
 *
 * This appended a bare `s`, which reads correctly for `payment` and `row` and
 * not for `entry` — the income ledger passes `noun="entry"` and the counter said
 * **"8 of 626 entrys"** on the screen the owner reads most often.
 *
 * Deliberately small: consonant + y becomes -ies, sibilants take -es, everything
 * else takes -s. It is not a general English pluraliser and does not try to be —
 * it covers the nouns this component is actually passed, and an irregular one
 * (`person`) would need handling here rather than silently coming out wrong.
 */
function plural(n: number) {
  if (n === 1) return props.noun;
  const word = props.noun;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(word)) return `${word}es`;
  return `${word}s`;
}
</script>

<template>
  <div v-if="remaining > 0" class="ws-reveal mt-3 flex flex-wrap items-center justify-center gap-3">
    <button type="button" class="pill-btn" @click="emit('more')">
      <ChevronDown class="size-4" aria-hidden="true" />
      <span>Show {{ nextStep }} more</span>
    </button>
    <button type="button" class="pill-btn-quiet" @click="emit('all')">
      Show all {{ total }}
    </button>
    <p aria-live="polite" class="basis-full text-center text-sm text-ink-soft">
      {{ shown }} of {{ total }} {{ plural(total) }}
    </p>
  </div>

  <!--
    Replaces the buttons above the instant "Show all" is pressed - a settle-in
    here is what tells the reader their click landed and finished the job,
    rather than the row of buttons just vanishing.
  -->
  <p v-else-if="total > nextStep" class="ws-reveal mt-3 text-center text-sm text-ink-soft">
    All {{ total }} {{ plural(total) }}
  </p>
</template>
