<script setup lang="ts">
/**
 * What the page area shows while a pull-to-refresh fetches it again (Sean, 2026-10-02: "since we
 * refreshed, it makes sense that the skeleton loaders reload again"). The page itself stays
 * mounted behind it (App.vue hides it with v-show) and takes the fresh answers; this stands in for
 * it until they are in, so the refresh is seen, not just the hexagon turning. Built from the one
 * placeholder shape (Skeleton.vue): a title, a row of figure tiles, then list rows.
 */
import Skeleton from '@/components/ui/Skeleton.vue';
</script>

<template>
  <div class="space-y-6" role="status" aria-label="Refreshing" data-refresh-skeleton>
    <div class="space-y-3">
      <Skeleton class-name="h-3 w-24 rounded-full" />
      <Skeleton class-name="h-8 w-56 max-w-full rounded-xl" />
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton class-name="h-32 w-full rounded-tile" />
      <Skeleton class-name="h-32 w-full rounded-tile" />
      <Skeleton class-name="hidden h-32 w-full rounded-tile lg:block" />
    </div>
    <div class="space-y-3 rounded-tile bg-tile p-5">
      <Skeleton class-name="h-10 w-full rounded-full" />
      <Skeleton v-for="n in 6" :key="n" class-name="h-14 w-full rounded-xl" />
    </div>
  </div>
</template>
