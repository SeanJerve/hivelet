<script setup lang="ts">
/**
 * @file components/ui/SkeletonCard.vue
 * @description Standardized card skeleton placeholder with thumbnail, titles, and action slots.
 * @systemBibleRef Section 1 - Minimalist Corporate Aesthetic
 */
import Skeleton from './Skeleton.vue';

interface Props {
  variant?: 'room' | 'category' | 'metric';
  count?: number;
}

withDefaults(defineProps<Props>(), {
  variant: 'room',
  count: 1
});
</script>

<template>
  <div class="contents">
    <div
      v-for="i in count"
      :key="i"
      class="rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-xs space-y-4 overflow-hidden"
    >
      <!-- Variant: Room Card -->
      <template v-if="variant === 'room'">
        <Skeleton className="h-44 w-full rounded-xl bg-slate-200/90" />
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </template>

      <!-- Variant: Category Card -->
      <template v-else-if="variant === 'category'">
        <div class="flex items-center justify-between w-full">
          <Skeleton className="size-12 rounded-xl" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div class="space-y-2 pt-2">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
        <div class="pt-4 border-t border-[#e7e5e4] flex items-center justify-between">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
      </template>

      <!-- Variant: Metric KPI -->
      <template v-else-if="variant === 'metric'">
        <div class="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
        <div class="space-y-1.5 pt-1">
          <Skeleton className="h-7 w-28 rounded" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>
      </template>
    </div>
  </div>
</template>
