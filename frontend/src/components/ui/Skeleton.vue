<script setup lang="ts">
/**
 * The one loading placeholder shape. Everything that loads is built from this,
 * so a screen mid-load has the same rhythm as the screen that replaces it.
 *
 * It holds still for anyone who has asked their system to reduce motion.
 */
interface Props {
  className?: string | string[] | Record<string, boolean>;
}

defineProps<Props>();
</script>

<template>
  <div :class="['ws-skeleton', className || 'h-4 w-full']" aria-hidden="true" />
</template>
