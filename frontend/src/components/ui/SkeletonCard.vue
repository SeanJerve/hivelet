<script setup lang="ts">
/**
 * Tile-shaped loading placeholders, so what appears while loading has the same
 * shape as what arrives. Variants match the four tiles in use: a unit card with
 * a photograph, a category card, a figure tile, and a record in a stacked list.
 */
import Skeleton from './Skeleton.vue';

interface Props {
  variant?: 'room' | 'category' | 'metric' | 'list';
  count?: number;
}

withDefaults(defineProps<Props>(), { variant: 'room', count: 1 });
</script>

<template>
  <div class="contents">
    <div
      v-for="i in count"
      :key="i"
      class="rounded-tile bg-tile p-5 sm:p-6 flex flex-col gap-4"
      aria-hidden="true"
    >
      <template v-if="variant === 'room'">
        <Skeleton class-name="h-36 w-full rounded-2xl" />
        <div class="flex items-center justify-between gap-3">
          <Skeleton class-name="h-5 w-20 rounded-full" />
          <Skeleton class-name="h-6 w-20 rounded-full" />
        </div>
        <Skeleton class-name="h-4 w-3/4 rounded-full" />
        <Skeleton class-name="h-4 w-1/2 rounded-full" />
      </template>

      <template v-else-if="variant === 'category'">
        <Skeleton class-name="h-6 w-40 rounded-full" />
        <Skeleton class-name="h-4 w-24 rounded-full" />
        <Skeleton class-name="h-4 w-full rounded-full" />
        <Skeleton class-name="h-4 w-4/5 rounded-full" />
      </template>

      <template v-else-if="variant === 'list'">
        <div class="flex items-start justify-between gap-4">
          <Skeleton class-name="h-5 w-48 rounded-full" />
          <Skeleton class-name="h-7 w-24 shrink-0 rounded-full" />
        </div>
        <Skeleton class-name="h-4 w-full rounded-full" />
        <Skeleton class-name="h-4 w-2/3 rounded-full" />
        <div class="flex items-center gap-3">
          <Skeleton class-name="h-3 w-24 rounded-full" />
          <Skeleton class-name="h-3 w-20 rounded-full" />
        </div>
      </template>

      <template v-else>
        <Skeleton class-name="h-4 w-28 rounded-full" />
        <Skeleton class-name="h-12 w-40 rounded-2xl" />
        <Skeleton class-name="h-4 w-36 rounded-full" />
      </template>
    </div>
  </div>
</template>
