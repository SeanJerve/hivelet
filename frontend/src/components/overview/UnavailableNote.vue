<script setup lang="ts">
/**
 * What a section shows when its data could not be loaded. It must never read as
 * zero or as an empty list: see HANDOFF_TO_DESIGN.md section 4.
 */
withDefaults(
  defineProps<{
    message?: string;
    dark?: boolean;
    retry?: boolean;
  }>(),
  {
    message: 'This could not be loaded. That is not the same as there being nothing to show.',
    dark: false,
    retry: true,
  }
);

defineEmits<{ retry: [] }>();
</script>

<template>
  <div
    role="status"
    :class="[
      'unavailable-note flex flex-col items-start gap-3 rounded-2xl border border-dashed p-4',
      dark ? 'border-white/30' : 'border-hatch',
    ]"
  >
    <p class="text-sm leading-5">{{ message }}</p>
    <button
      v-if="retry"
      type="button"
      :class="dark ? 'pill-btn-light' : 'pill-btn'"
      @click="$emit('retry')"
    >
      Try again
    </button>
  </div>
</template>

<style scoped>
/*
 * This replaces whichever tile or chart could not load, on a `v-if` the
 * screen that owns it flips the moment a fetch fails - so from here, mounting
 * IS the moment it appears. A settle-in rather than a snap keeps a failed
 * load from reading as a layout glitch.
 */
.unavailable-note {
  animation: unavailable-note-in 0.2s var(--ease-out) backwards;
}
@keyframes unavailable-note-in {
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
  .unavailable-note {
    animation: none;
  }
}
</style>
