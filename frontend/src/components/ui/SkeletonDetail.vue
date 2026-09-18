<script setup lang="ts">
/**
 * A unit's page loading: the frame, its figures beside it, then the plates a
 * reader picks from.
 *
 * WHY IT IS HAIRLINE RATHER THAN TILED
 * ------------------------------------
 * It was built from the workspace vocabulary - `rounded-tile` tiles on
 * `bg-tile`, rounded placeholder blocks - and `CategoryRoomsView` is its only
 * consumer (checked 2026-09-19; `check:reachable` reports an orphan the moment
 * that stops being true). That screen is now in the public editorial register,
 * so a tiled, rounded placeholder announced a layout the page does not have and
 * then replaced it with square frames and hairlines.
 *
 * It mirrors the shape it stands in for: the same 26rem specification column,
 * the same rule per specification row, the same five-across plate grid. A
 * placeholder whose proportions are wrong is a layout shift with extra steps.
 */
</script>

<template>
  <div class="w-full" aria-hidden="true">
    <!-- The unit at size: one frame, and the figures beside it. -->
    <div class="grid border-t border-border lg:grid-cols-[1fr_26rem]">
      <div class="aspect-[4/3] animate-pulse border-b border-border bg-muted lg:aspect-auto lg:min-h-[30rem] lg:border-b-0 lg:border-r" />

      <div class="px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
        <div class="h-2.5 w-32 animate-pulse bg-muted" />
        <div class="mt-6 h-10 w-48 animate-pulse bg-muted" />
        <div class="mt-4 h-3 w-36 animate-pulse bg-muted" />
        <div class="mt-9 h-8 w-40 animate-pulse bg-muted" />

        <div class="mt-10 border-t border-foreground">
          <div v-for="i in 2" :key="i" class="flex items-center justify-between gap-6 border-b border-border py-4">
            <div class="h-3 w-20 animate-pulse bg-muted" />
            <div class="h-3 w-28 animate-pulse bg-muted" />
          </div>
        </div>

        <div class="mt-12 h-11 w-full animate-pulse bg-muted" />
      </div>
    </div>

    <!-- The plates beneath it. -->
    <div class="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 xl:grid-cols-5">
      <div v-for="i in 5" :key="'plate-' + i" class="border-t border-border px-4 pt-5 pb-6">
        <div class="flex items-baseline justify-between gap-3">
          <div class="h-4 w-12 animate-pulse bg-muted" />
          <div class="h-2.5 w-14 animate-pulse bg-muted" />
        </div>
        <div class="mt-4 h-3.5 w-20 animate-pulse bg-muted" />
        <div class="mt-2 h-2.5 w-16 animate-pulse bg-muted" />
      </div>
    </div>
  </div>
</template>
