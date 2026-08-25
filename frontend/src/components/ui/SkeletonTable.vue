<script setup lang="ts">
/**
 * @file components/ui/SkeletonTable.vue
 * @description Standardized data table skeleton placeholder for Jira-inspired admin data grids.
 * @systemBibleRef Section 1 - Jira Inspired Data Grids
 */
import Skeleton from './Skeleton.vue';

interface Props {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

withDefaults(defineProps<Props>(), {
  columns: 5,
  rows: 5,
  showHeader: true
});
</script>

<template>
  <div class="w-full bg-white border border-[#dfe1e6] rounded-xl overflow-hidden shadow-xs">
    <!-- Table Header Placeholder -->
    <div v-if="showHeader" class="bg-[#f4f5f7] border-b border-[#dfe1e6] px-6 py-3.5 flex items-center justify-between gap-4">
      <div v-for="c in columns" :key="'th-' + c" class="flex-1">
        <Skeleton className="h-3.5 w-20 rounded" />
      </div>
    </div>

    <!-- Table Rows Placeholder -->
    <div class="divide-y divide-[#dfe1e6]">
      <div
        v-for="r in rows"
        :key="'tr-' + r"
        class="px-6 py-4 flex items-center justify-between gap-4"
      >
        <div v-for="c in columns" :key="'td-' + r + '-' + c" class="flex-1 flex items-center gap-2">
          <!-- First column often has avatar/icon -->
          <Skeleton v-if="c === 1" className="size-7 rounded-full shrink-0" />
          <Skeleton
            :className="[
              'h-4 rounded',
              c === 1 ? 'w-28' : c === columns ? 'w-16' : 'w-20 sm:w-24'
            ]"
          />
        </div>
      </div>
    </div>
  </div>
</template>
