<script setup lang="ts">
/**
 * @file components/public/VisitorShell.vue
 * @description One screen for Sign in, Inquire and Your inquiries (Sean, 2 Nov 2026). The photograph
 * and the masthead stay still; only the left column changes, with a slide in the direction of
 * travel, so moving between them is a section changing rather than a new page.
 *
 * One screen tall on desktop, not a page to scroll: `lg:h-dvh` pins the two columns to the viewport
 * and the left one scrolls on its own when a form or a conversation is taller than the screen.
 * Phones have no photograph and scroll as normal.
 */
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { LANDLADY } from '@/lib/systemState';

const route = useRoute();

const SECTIONS = [
  { name: 'Login', to: '/login', label: 'Sign in' },
  { name: 'Inquire', to: '/inquire', label: 'Inquire' },
  { name: 'InquiryThread', to: '/inquiry', label: 'Your inquiries' },
];
const orderOf = (name: unknown) => SECTIONS.findIndex((s) => s.name === name);

/** Pressing the section already open starts it over: a second inquiry after the first is sent. */
const restarts = ref(0);
const direction = ref<'forward' | 'back'>('forward');
const column = ref<HTMLElement | null>(null);

watch(
  () => route.name,
  (to, from) => {
    direction.value = orderOf(to) < orderOf(from) ? 'back' : 'forward';
    column.value?.scrollTo({ top: 0 });
  }
);
</script>

<template>
  <div class="ws-focus flex-1 w-full font-editorial bg-canvas">
    <div class="grid min-h-dvh grid-cols-1 lg:h-dvh lg:grid-cols-2">
      <div ref="column" class="ws-page flex flex-col overflow-x-clip pb-8 sm:pb-10 lg:pb-8 lg:overflow-y-auto">
        <!--
          The landing page's masthead bar, repeated: the same wordmark on the same gutter, so moving
          from the landing page to here leaves "Hivelet" exactly where it was. Links are 44px tall
          inside the bar, and "Contact us" shows from 640px so the bar keeps one row on a phone.
        -->
        <div class="flex min-h-16 flex-wrap items-center justify-between gap-x-6">
          <RouterLink
            to="/public"
            class="press inline-flex min-h-11 items-center font-display text-xl font-semibold tracking-tight text-ink hover:text-ink-soft transition-colors"
          >
            Hivelet
          </RouterLink>

          <p class="flex flex-wrap items-baseline justify-end gap-x-3">
            <span class="hidden text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft sm:inline">Contact us</span>
            <a
              :href="`tel:${LANDLADY.phone}`"
              class="press inline-flex min-h-11 items-center text-sm font-semibold text-ink transition-colors"
            >
              {{ LANDLADY.phoneShown }}
            </a>
            <ThemeToggle class="self-center text-ink" />
          </p>
        </div>

        <!-- Home and the page you are on (Sean, 4 Nov 2026). The other two are linked from the pages
             themselves: Inquire now under Sign in, Your inquiries under the form. -->
        <nav aria-label="Breadcrumb" class="mt-8 flex flex-wrap items-center gap-x-5 text-xs sm:mt-10 lg:mt-6">
          <RouterLink
            to="/public"
            class="press inline-flex min-h-11 items-center gap-1.5 text-ink-soft hover:text-ink transition-colors font-semibold"
          >
            <ArrowLeft class="size-3.5" aria-hidden="true" />
            Home
          </RouterLink>
          <span aria-hidden="true" class="text-ink-faint">/</span>
          <RouterLink
            v-for="s in SECTIONS.filter((x) => x.name === route.name)"
            :key="s.name"
            :to="s.to"
            :class="[
              'press inline-flex min-h-11 items-center transition-colors font-semibold',
              route.name === s.name ? 'text-ink' : 'text-ink-faint hover:text-ink',
            ]"
            :aria-current="route.name === s.name ? 'page' : undefined"
            @click="route.name === s.name && restarts++"
          >
            {{ s.label }}
          </RouterLink>
        </nav>

        <RouterView v-slot="{ Component }">
          <Transition :name="`visitor-${direction}`" mode="out-in">
            <component :is="Component" :key="`${String(route.name)}-${restarts}`" />
          </Transition>
        </RouterView>
      </div>

      <!--
        `loading="lazy"` is doing real work: this panel is `hidden lg:flex`, and display:none does
        not stop a browser fetching an image inside it. Lazy spares a phone 284 KB it never shows.
      -->
      <aside class="relative hidden lg:flex flex-col justify-between text-white px-10 sm:px-14 pb-10 sm:pb-14 overflow-hidden bg-night">
        <img
          src="/fe-galang-building.webp"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full object-cover object-center"
          width="1790"
          height="879"
          loading="lazy"
        />
        <!-- Contrast gradient overlay: unblurred to keep building details clear and vibrant -->
        <div class="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-night/50" />

        <!-- On the masthead's line, not 56px below it: the same 64px bar. -->
        <div class="relative z-10 flex h-16 items-center">
          <p class="text-[0.7rem] tracking-[0.18em] uppercase text-white/80 drop-shadow-sm">
            {{ LANDLADY.address }}
          </p>
        </div>

        <div class="relative z-10">
          <p class="font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2rem,4.4vw,3.75rem)] drop-shadow-sm">
            Fe Galang Da Silva<br />Boarding House
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.visitor-forward-enter-active,
.visitor-back-enter-active {
  transition: opacity 0.22s var(--ease-out), transform 0.22s var(--ease-out);
}
.visitor-forward-leave-active,
.visitor-back-leave-active {
  transition: opacity 0.12s var(--ease-out), transform 0.12s var(--ease-out);
}
.visitor-forward-enter-from,
.visitor-back-leave-to {
  opacity: 0;
  transform: translateX(18px);
}
.visitor-forward-leave-to,
.visitor-back-enter-from {
  opacity: 0;
  transform: translateX(-18px);
}

/* Reduced motion keeps the fade and drops the slide. */
@media (prefers-reduced-motion: reduce) {
  .visitor-forward-enter-from,
  .visitor-back-leave-to,
  .visitor-forward-leave-to,
  .visitor-back-enter-from {
    transform: none;
  }
}
</style>
