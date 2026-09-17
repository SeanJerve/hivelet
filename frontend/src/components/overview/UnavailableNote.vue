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
      'flex flex-col items-start gap-3 rounded-2xl border border-dashed p-4',
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
