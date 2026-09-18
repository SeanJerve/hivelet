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

function plural(n: number) {
  return n === 1 ? props.noun : `${props.noun}s`;
}
</script>

<template>
  <div v-if="remaining > 0" class="mt-3 flex flex-wrap items-center justify-center gap-3">
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

  <p v-else-if="total > nextStep" class="mt-3 text-center text-sm text-ink-soft">
    All {{ total }} {{ plural(total) }}
  </p>
</template>
