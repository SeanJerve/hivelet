<script setup lang="ts">
/**
 * What App.vue draws while the very first page of a load is still on its way
 * (Sean, 2026-10-02: "first visit, the spinner; on a refresh, the page's
 * skeleton, never a blank page with the header on it").
 *
 * Until the router has finished its first navigation, `useRoute()` is the
 * router's START location, whose path is "/". AppHeader read that as the
 * landing page and drew its white, transparent hero masthead, over the pale
 * empty placeholder this replaces: Sean's phone, refreshing /public on LTE,
 * showed "Hivelet", "Inquire now" and "Sign in" in white on a white page and
 * nothing else. The first navigation waits for the page's own code and, for a
 * signed-in phone, for `/auth/me` (router/index.ts), so on a slow connection
 * that state lasted seconds. Measured on the production build at 400 ms /
 * 400 kbps, refreshing with the loader skipped: up to 1.3 s on /public and
 * /login, and on every signed-in page for as long as `/auth/me` took.
 *
 * The header and footer now wait for that navigation (App.vue), and this
 * holds the screen in the shape of the page that is coming. It cannot ask the
 * router which page that is, for the reason above, so it reads the address
 * the browser loaded:
 *   - the landing page: the hero's own dark field, full height, with the
 *     name's two lines where they will appear, so the white masthead lands on
 *     the colour it was designed for;
 *   - a signed-in page: the workspace canvas, a masthead bar and the figure
 *     tiles every overview starts with;
 *   - anything else (sign-in, enquiry, a category, the legal pages): the
 *     public canvas with a masthead bar and lines of text.
 * Shapes only, no words: it is on screen for a moment, and `aria-hidden`
 * keeps it out of a screen reader, which hears the page when it arrives.
 *
 * It only ever exists before the first page renders; every later navigation
 * already has a page to show. Same height as before, a full screen, so the
 * footer still starts below the fold and nothing shifts when the page lands
 * (the 0.50 layout shift App.vue's placeholder was introduced to stop,
 * Lighthouse, 2026-09-30).
 */
import Skeleton from '@/components/ui/Skeleton.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';

const path = typeof window === 'undefined' ? '/' : window.location.pathname;
const kind: 'landing' | 'workspace' | 'public' =
  path === '/' || path === '/public' || path === '/public/'
    ? 'landing'
    : /^\/(admin|basis|tenant)(\/|$)/.test(path)
      ? 'workspace'
      : 'public';
</script>

<template>
  <div
    v-if="kind === 'landing'"
    data-boot-skeleton
    class="relative flex min-h-screen supports-[min-height:100dvh]:min-h-dvh w-full flex-col justify-end bg-night"
    aria-hidden="true"
  >
    <!-- The name's two lines, at the hero's own gutter and bottom padding. -->
    <div class="ws-page w-full pt-24 pb-20 sm:pb-16 md:pb-12 lg:pb-6 flex flex-col gap-4">
      <Skeleton class-name="h-12 sm:h-20 w-4/5 max-w-3xl rounded-2xl bg-on-night/10" />
      <Skeleton class-name="h-4 w-36 rounded-full bg-on-night/10" />
    </div>
  </div>

  <div
    v-else
    data-boot-skeleton
    :class="[
      'min-h-screen supports-[min-height:100dvh]:min-h-dvh w-full',
      kind === 'workspace' ? 'bg-canvas' : 'bg-background',
    ]"
    aria-hidden="true"
  >
    <!-- The masthead bar: the wordmark's place, and the controls' place on the right. -->
    <div class="ws-page flex h-16 items-center justify-between">
      <Skeleton class-name="h-6 w-24 rounded-full" />
      <Skeleton class-name="h-8 w-8 rounded-full" />
    </div>
    <div v-if="kind === 'workspace'" class="ws-page ws-workspace flex flex-col gap-6 py-6">
      <Skeleton class-name="h-8 w-48 rounded-full" />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard variant="metric" :count="3" />
      </div>
      <SkeletonCard variant="list" :count="2" />
    </div>
    <div v-else class="ws-page py-10">
      <div class="flex max-w-2xl flex-col gap-4">
        <Skeleton class-name="h-10 w-3/4 rounded-2xl" />
        <Skeleton class-name="h-4 w-full rounded-full" />
        <Skeleton class-name="h-4 w-5/6 rounded-full" />
        <Skeleton class-name="h-4 w-2/3 rounded-full" />
      </div>
    </div>
  </div>
</template>
