<script setup lang="ts">
/**
 * @file components/layout/AppFooter.vue
 * @description Public footer for the landing and category pages.
 * @systemBibleRef Section 1 - Product Identity & Section 4 - Public Visitor Role
 * @rationale Set in the same register as the rest of the public site: the hero's
 *   dark field, hairline rules, and text links rather than icon-and-pill rows.
 *   Rendered only where `isPublicPage` is true in App.vue, so the workspace
 *   screens are untouched by it.
 *
 * The colours are tokens now. This was `bg-[#0b132b]`, and the Facebook mark
 * carried `text-[#1877F2]`; both were raw literals of the kind
 * `check:design-tokens` ratchets down, and the marks went with the icons when
 * the rows became text.
 */
import { LANDLADY } from '@/lib/systemState';
</script>

<template>
  <footer class="w-full bg-neutral-dark text-white font-editorial mt-auto">
    <div class="max-w-[1400px] mx-auto w-full px-6 sm:px-8 lg:px-10 py-20 sm:py-24">

      <div class="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">

        <div class="lg:col-span-2 max-w-sm">
          <p class="text-[0.8rem] leading-[1.25] font-light tracking-[-0.01em]">
            Fe Galang<br />Da Silva<br />Boarding House
          </p>
          <p class="mt-6 text-xs leading-relaxed text-white/60">
            Managed with Hivelet. Centralised operational, financial and enquiry workflows for 33
            rentable units in Legazpi City, Albay.
          </p>
        </div>

        <div>
          <h2 class="text-[0.7rem] tracking-[0.16em] uppercase text-white/50">Property</h2>
          <ul class="mt-5 space-y-2.5 text-sm">
            <li>
              <RouterLink to="/public" class="text-white/80 underline underline-offset-4 decoration-1 decoration-white/25 hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">
                Overview
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/category/1-bedroom" class="text-white/80 underline underline-offset-4 decoration-1 decoration-white/25 hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">
                Rentable units
              </RouterLink>
            </li>
            <li>
              <!-- Was a second link to /public, which went nowhere in particular. -->
              <RouterLink to="/inquire" class="text-white/80 underline underline-offset-4 decoration-1 decoration-white/25 hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">
                Register your interest
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/login" class="text-white/80 underline underline-offset-4 decoration-1 decoration-white/25 hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">
                Sign in
              </RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h2 class="text-[0.7rem] tracking-[0.16em] uppercase text-white/50">Contact</h2>
          <ul class="mt-5 space-y-2.5 text-sm">
            <li>
              <a :href="`tel:${LANDLADY.phone}`" class="text-white/80 underline underline-offset-4 decoration-1 decoration-white/25 hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors">
                {{ LANDLADY.phone }}
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/michelle.millete.16"
                target="_blank"
                rel="noopener noreferrer"
                class="text-white/80 underline underline-offset-4 decoration-1 decoration-white/25 hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors"
              >
                Facebook<span class="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>

          <h2 class="mt-9 text-[0.7rem] tracking-[0.16em] uppercase text-white/50">Address</h2>
          <p class="mt-5 max-w-xs text-sm leading-relaxed text-white/70">
            {{ LANDLADY.address }}
          </p>
        </div>

      </div>

      <div class="mt-20 flex flex-col gap-3 border-t border-white/15 pt-7 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Hivelet. Fe Galang Da Silva Boarding House.</p>
        <p>Legazpi City, Albay</p>
      </div>

    </div>
  </footer>
</template>
