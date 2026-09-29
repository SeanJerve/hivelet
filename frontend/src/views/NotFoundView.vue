<script setup lang="ts">
/**
 * @file NotFoundView.vue
 * @description An address that is not a page. It used to redirect every unknown URL to the
 *   landing page without a word, so a mistyped or outdated link looked like the site had
 *   ignored the visitor, and a search engine indexed the landing page under addresses it has
 *   no business answering (a "soft 404"). main.ts marks this page `noindex`.
 *
 *   The address is shown back, so whoever typed it can see the mistake. A signed-in visitor
 *   also gets a way back to their own screens.
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { isAuthenticated, currentRole, homeRouteForRole } from '@/lib/authStore';

const route = useRoute();
const home = computed(() => (isAuthenticated.value ? homeRouteForRole(currentRole.value) : null));
</script>

<template>
  <section class="ws-page ws-band min-h-[60vh] flex flex-col justify-center">
    <p class="text-[0.7rem] tracking-[0.18em] uppercase text-ink-soft">Page not found</p>
    <h1 class="mt-4 max-w-2xl font-medium text-ink tracking-[-0.03em] leading-[1.05] text-[clamp(2rem,5vw,3.25rem)]">
      There is no page at this address.
    </h1>
    <p class="mt-6 max-w-md text-sm leading-relaxed text-ink-soft">
      The link may be mistyped, or the page may have moved. You asked for
      <span class="break-all text-ink">{{ route.fullPath }}</span>.
    </p>
    <div class="mt-10 flex flex-wrap items-center gap-4">
      <RouterLink to="/public" class="pill-btn-brand px-5">Go to the home page</RouterLink>
      <RouterLink v-if="home" :to="home" class="pill-btn px-5">Back to your account</RouterLink>
    </div>
  </section>
</template>
