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
import { computed } from 'vue';
import { LANDLADY } from '@/lib/systemState';
import { isAuthenticated, isAdmin, isTenant } from '@/lib/authStore';

const portalRoute = computed(() => {
  if (isAdmin.value) return '/admin/overview';
  if (isTenant.value) return '/tenant';
  return '/login';
});
</script>

<template>
  <footer class="ws-focus on-dark w-full bg-night text-on-night font-editorial mt-auto">
    <div class="ws-page ws-band">

      <div class="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">

        <div class="lg:col-span-2 max-w-sm">
          <!--
            The product mark, matching the header on every other page. It was
            the property's own name over three lines, above a sentence opening
            "Managed with Hivelet" - the mark and the sentence each naming a
            different party, in the wrong order. The property is named in the
            sentence now, where it belongs, and the copyright line below
            already carries both.
          -->
          <p class="text-xl font-semibold tracking-tight">Hivelet</p>
          <!--
            "Centralised operational, financial and enquiry workflows for 33
            rentable units" described the ADMIN software to the person
            reading it here - a prospective tenant, at the bottom of the
            PUBLIC site, who has never seen the workspace this sentence is
            actually about. Replaced with what this page is for her: the
            property (asked to trim the AI-sounding copy, 2026-09-26).

            Just the city here, not the full street address - the "Address"
            column two along in this same footer already carries that in
            full, and a first pass at this fix put the whole thing in both
            places at once.
          -->
          <p class="mt-6 text-xs leading-relaxed text-on-night-soft">
            The website for Fe Galang Da Silva Boarding House, Legazpi City.
          </p>
        </div>

        <div>
          <h2 class="text-[0.7rem] tracking-[0.16em] uppercase text-on-night-soft">Property</h2>
          <!--
            `py-3` on each link and no `space-y` between them, rather than
            `py-1` with a 10px gap.

            Every row here measured 28px tall on an emulated handset - a
            stacked column (five then; four since the privacy policy moved
            to the strip at the bottom), which is the whole of the public
            navigation once a visitor is past the fold on a phone. The
            padding sits on an `inline-block`, so it grows the box a thumb
            lands on to 44 without moving the text or the underline by a
            pixel; the gap comes out to keep the column the same length it
            was. `mt-3` rather than `mt-5` for the same reason - the first
            link now brings 12px of its own.
          -->
          <ul class="mt-3 text-sm">
            <li>
              <RouterLink to="/public" class="press inline-block py-3 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Overview
              </RouterLink>
            </li>
            <!--
              Was `/category/1-bedroom`: a slug that no longer exists, kept
              working only by the legacy alias in `resolveSlug`, and a label
              reading "Rentable units" over a page showing the EIGHT
              one-bedrooms out of thirty-three. The category page carries links
              to all four kinds at its head, so any of them is a way in to all
              of them - this is the one with twenty units behind it, and it is
              also what `resolveSlug` falls back to.
            -->
            <li>
              <RouterLink to="/category/studio" class="press inline-block py-3 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Rentable units
              </RouterLink>
            </li>
            <li>
              <!-- Was a second link to /public, which went nowhere in particular. -->
              <RouterLink to="/inquire" class="press inline-block py-3 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Register your interest
              </RouterLink>
            </li>
            <li>
              <RouterLink
                v-if="!isAuthenticated"
                to="/login"
                class="press inline-block py-3 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors"
              >
                Sign in
              </RouterLink>
              <RouterLink
                v-else
                :to="portalRoute"
                class="press inline-block py-3 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors"
              >
                Portal
              </RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h2 class="text-[0.7rem] tracking-[0.16em] uppercase text-on-night-soft">Contact</h2>
          <!-- Same 28 -> 44 as the Property column above. -->
          <ul class="mt-3 text-sm">
            <li>
              <a :href="`tel:${LANDLADY.phone}`" class="press inline-block py-3 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                {{ LANDLADY.phone }}
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/michelle.millete.16"
                target="_blank"
                rel="noopener noreferrer"
                class="press inline-block py-3 text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors"
              >
                Facebook<span class="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>

          <!-- `mt-7`, not `mt-9`: the link above it now carries 12px of its own. -->
          <h2 class="mt-7 text-[0.7rem] tracking-[0.16em] uppercase text-on-night-soft">Address</h2>
          <p class="mt-5 max-w-xs text-sm leading-relaxed text-on-night-soft">
            {{ LANDLADY.address }}
          </p>
        </div>

      </div>

      <!--
        The two documents, in the strip where a visitor looks for them, as a
        pair. "Privacy policy" used to be the last of the Property links, and
        the terms had nowhere to go. They replace "Legazpi City, Albay", which
        repeated the last line of the full address directly above it.

        `min-h-11` gives each link the 44px tap height the columns above get
        from `py-3`; `pt-4` rather than `pt-7`, because the links now bring
        14px of their own above the text.
      -->
      <div class="mt-20 flex flex-col gap-3 border-t border-on-night/15 pt-4 text-xs text-on-night-soft sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Hivelet. Fe Galang Da Silva Boarding House.</p>
        <nav aria-label="Policies">
          <ul class="flex flex-wrap gap-x-6">
            <li>
              <RouterLink to="/privacy" class="press inline-flex min-h-11 items-center text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Privacy policy
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/terms" class="press inline-flex min-h-11 items-center text-on-night-soft underline underline-offset-4 decoration-1 decoration-on-night-soft hover:text-on-night hover:decoration-on-night transition-colors">
                Terms of use
              </RouterLink>
            </li>
          </ul>
        </nav>
      </div>

    </div>
  </footer>
</template>
