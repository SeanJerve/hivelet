<script setup lang="ts">
/**
 * @file components/ui/SkeletonDetail.vue
 * @description Full-width hero showcase skeleton for unit specifications and overview displays.
 * @systemBibleRef Section 4 & 5 - Property Model & Unit Details
 */
import Skeleton from './Skeleton.vue';
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Top Hero Banner Skeleton -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      <!-- Media Frame Placeholder -->
      <div class="lg:col-span-5 h-[240px] sm:h-[260px] rounded-xl overflow-hidden border border-[#dfe1e6] bg-slate-200/80 animate-pulse" />

      <!-- Specs & Metadata Placeholder -->
      <div class="lg:col-span-7 flex flex-col justify-center space-y-5">
        <div class="space-y-2">
          <Skeleton className="h-3 w-28 rounded" />
          <div class="flex items-center justify-between">
            <Skeleton className="h-8 w-36 rounded-lg" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </div>

        <!-- 3-Column Key-Value Specs -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-6 py-2">
          <div class="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div class="space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div class="space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary Payment Card / Details Skeleton -->
    <div class="bg-white border border-[#dfe1e6] rounded-xl p-6 space-y-6 shadow-xs">
      <div class="flex items-center justify-between pb-4 border-b border-slate-100">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-5 w-28 rounded" />
        </div>
      </div>
      <div class="pt-4 border-t border-slate-100 space-y-3">
        <div v-for="i in 3" :key="'li-' + i" class="flex justify-between items-center">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
      </div>
    </div>
  </div>
</template>
