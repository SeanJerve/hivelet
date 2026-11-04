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

// The year on the copyright line follows the calendar rather than being typed
// in, so it does not go stale every January.
const year = new Date().getFullYear();
</script>

<template>
  <!--
    One band of dark glass across the page, not a card on it (review of 4 Nov 2026). The page
    links that were here are all in the top bar, so the footer holds what it is for: who to call,
    where it is, and the policies.
  -->
  <footer class="ws-focus on-dark w-full bg-night text-on-night font-editorial mt-auto">
    <div class="ws-page py-8 sm:py-10">

      <div class="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4 lg:gap-10">

        <div class="col-span-2 max-w-sm">
          <!--
            The product mark, matching the header on every other page. It was
            the property's own name over three lines, above a sentence opening
            "Managed with Hivelet" - the mark and the sentence each naming a
            different party, in the wrong order. The property is named in the
            sentence now, where it belongs, and the copyright line below
            already carries both.
          -->
          <RouterLink to="/public" class="press inline-flex min-h-11 items-center text-xl font-semibold tracking-tight text-on-night hover:text-on-night-soft transition-colors">Hivelet</RouterLink>
        </div>

        <div>
          <h2 class="text-[0.7rem] tracking-[0.16em] uppercase text-on-night-soft">Contact</h2>
          <ul class="mt-1 text-sm">
            <li>
              <a :href="`tel:${LANDLADY.phone}`" class="press inline-block py-2.5 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                {{ LANDLADY.phoneShown }}
              </a>
            </li>
          </ul>
          <h2 class="mt-4 text-[0.7rem] tracking-[0.16em] uppercase text-on-night-soft">Address</h2>
          <p class="mt-2 max-w-xs text-sm leading-relaxed text-on-night-soft">
            {{ LANDLADY.address }}
          </p>
        </div>

        <nav aria-label="Policies">
          <h2 class="text-[0.7rem] tracking-[0.16em] uppercase text-on-night-soft">Policies</h2>
          <ul class="mt-1 text-sm">
            <li>
              <RouterLink to="/privacy" class="press inline-block py-2.5 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Privacy policy
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/terms" class="press inline-block py-2.5 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Terms of use
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/terms#refunds" class="press inline-block py-2.5 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Refunds
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/privacy#browser" class="press inline-block py-2.5 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Cookies
              </RouterLink>
            </li>
          </ul>
        </nav>

      </div>

      <div class="mt-8 border-t border-on-night/15 pt-4 text-xs text-on-night-soft">
        <p>© {{ year }} Hivelet. Fe Galang Da Silva Boarding House.</p>
      </div>
    </div>
  </footer>
</template>
