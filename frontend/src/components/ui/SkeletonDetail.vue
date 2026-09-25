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
 *
 * WHY ITS OWN PULSE CLASS
 * ------------------------
 * This used Tailwind's built-in `animate-pulse` directly. That utility has no
 * `prefers-reduced-motion` guard of its own, so every block on this page kept
 * pulsing for a reader who had asked their system to reduce motion, while the
 * shared `.ws-skeleton` pulse elsewhere in the workspace holds still for them
 * (see index.css). `sd-pulse` below is the same duration and easing as that
 * shared pulse, so a placeholder still matches the rhythm of the ones next to
 * it, and it is scoped here rather than switched to `.ws-skeleton` because
 * that class also sets a colour and a border radius this hairline layout does
 * not want.
 */
</script>

<template>
  <div class="w-full" aria-hidden="true">
    <!-- The unit at size: one frame, and the figures beside it. -->
    <div class="grid border-t border-line lg:grid-cols-[1fr_26rem]">
      <div class="sd-pulse aspect-[4/3] border-b border-line bg-line lg:aspect-auto lg:min-h-[30rem] lg:border-b-0 lg:border-r" />

      <div class="px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
        <div class="h-2.5 w-32 sd-pulse bg-line" />
        <div class="mt-6 h-10 w-48 sd-pulse bg-line" />
        <div class="mt-4 h-3 w-36 sd-pulse bg-line" />
        <div class="mt-9 h-8 w-40 sd-pulse bg-line" />

        <div class="mt-10 border-t border-ink">
          <div v-for="i in 2" :key="i" class="flex items-center justify-between gap-6 border-b border-line py-4">
            <div class="h-3 w-20 sd-pulse bg-line" />
            <div class="h-3 w-28 sd-pulse bg-line" />
          </div>
        </div>

        <div class="mt-12 h-11 w-full sd-pulse bg-line" />
      </div>
    </div>

    <!-- The plates beneath it. -->
    <div class="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 xl:grid-cols-5">
      <div v-for="i in 5" :key="'plate-' + i" class="border-t border-line px-4 pt-5 pb-6">
        <div class="flex items-baseline justify-between gap-3">
          <div class="h-4 w-12 sd-pulse bg-line" />
          <div class="h-2.5 w-14 sd-pulse bg-line" />
        </div>
        <div class="mt-4 h-3.5 w-20 sd-pulse bg-line" />
        <div class="mt-2 h-2.5 w-16 sd-pulse bg-line" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sd-pulse {
  animation: sd-pulse-fade 1.6s ease-in-out infinite;
}
@keyframes sd-pulse-fade {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sd-pulse {
    animation: none;
  }
}
</style>
