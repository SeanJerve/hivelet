<script setup lang="ts">
/**
 * A register loading. The shape matches the register itself: a tile, a header
 * strip, then rows separated by hairlines, with the last column right-aligned
 * the way a figure is.
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
  showHeader: true,
});
</script>

<template>
  <div class="w-full overflow-hidden rounded-tile bg-tile" aria-hidden="true">
    <div
      v-if="showHeader"
      class="flex items-center gap-4 border-b border-line px-5 py-4 sm:px-6"
    >
      <div v-for="c in columns" :key="'th-' + c" class="flex-1">
        <Skeleton
          :class-name="['h-3 rounded-full', c === columns ? 'ml-auto w-14' : 'w-20']"
        />
      </div>
    </div>

    <div class="divide-y divide-line">
      <div
        v-for="r in rows"
        :key="'tr-' + r"
        class="flex items-center gap-4 px-5 py-4 sm:px-6"
      >
        <div
          v-for="c in columns"
          :key="'td-' + r + '-' + c"
          class="flex flex-1 items-center gap-3"
        >
          <Skeleton v-if="c === 1" class-name="size-8 shrink-0 rounded-full" />
          <Skeleton
            :class-name="[
              'h-4 rounded-full',
              c === 1 ? 'w-28' : c === columns ? 'ml-auto w-16' : 'w-20 sm:w-24',
            ]"
          />
        </div>
      </div>
    </div>
  </div>
</template>
