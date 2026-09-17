<script setup lang="ts">
/**
 * A unit's detail page loading. Two tiles, matching the page that arrives: the
 * photograph and its figures at the top, then the money below.
 */
import Skeleton from './Skeleton.vue';
</script>

<template>
  <div class="w-full space-y-4 sm:space-y-6" aria-hidden="true">
    <div class="grid grid-cols-1 gap-4 rounded-tile bg-tile p-5 sm:gap-6 sm:p-6 lg:grid-cols-12">
      <Skeleton class-name="lg:col-span-5 h-[220px] sm:h-[260px] w-full rounded-2xl" />

      <div class="flex flex-col justify-center gap-5 lg:col-span-7">
        <div class="space-y-3">
          <Skeleton class-name="h-3 w-28 rounded-full" />
          <div class="flex items-center justify-between gap-4">
            <Skeleton class-name="h-9 w-40 rounded-2xl" />
            <Skeleton class-name="h-7 w-28 rounded-full" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <div v-for="i in 3" :key="'spec-' + i" class="space-y-2">
            <Skeleton class-name="h-3 w-20 rounded-full" />
            <Skeleton class-name="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-6 rounded-tile bg-tile p-5 sm:p-6">
      <div class="flex items-center justify-between gap-4 border-b border-line pb-4">
        <Skeleton class-name="h-6 w-48 rounded-full" />
        <Skeleton class-name="h-7 w-24 rounded-full" />
      </div>

      <div class="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <div v-for="i in 4" :key="'fig-' + i" class="space-y-2">
          <Skeleton class-name="h-3 w-20 rounded-full" />
          <Skeleton class-name="h-6 w-28 rounded-full" />
        </div>
      </div>

      <div class="space-y-3 border-t border-line pt-4">
        <div v-for="i in 3" :key="'li-' + i" class="flex items-center justify-between gap-4">
          <Skeleton class-name="h-4 w-40 rounded-full" />
          <Skeleton class-name="h-4 w-20 rounded-full" />
        </div>
      </div>
    </div>
  </div>
</template>
