<script setup lang="ts">
/**
 * @file components/ui/Skeleton.vue
 * @description Base pulse-animated skeleton placeholder primitive.
 * @systemBibleRef Section 1 - Product Identity & Jira Aesthetic
 * @rationale Standardizes subtle #e7e5e4 shimmer across all components without layout shifts.
 */
interface Props {
  className?: string | string[] | Record<string, boolean>;
}

defineProps<Props>();
</script>

<template>
  <div
    :class="[
      'animate-pulse bg-slate-200/80 rounded-md',
      className || 'h-4 w-full'
    ]"
    aria-hidden="true"
  />
</template>
