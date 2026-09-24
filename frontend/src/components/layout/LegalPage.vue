<script setup lang="ts">
/**
 * @file components/layout/LegalPage.vue
 * @description The frame the privacy policy and the terms of use share: a breadcrumb, the
 *   title, the effective and last-updated dates, a contents list, and a reading column.
 *
 * ONE FRAME FOR BOTH DOCUMENTS
 * ----------------------------
 * The two pages link to each other and are read one after the other. Written as two views
 * with the layout spelled out twice, they would drift apart the way the public pages' gutters
 * did before `ws-page` (see index.css). The views own their words; this owns how they read.
 *
 * WHY THE CONTENTS LINKS SCROLL IN SCRIPT
 * ---------------------------------------
 * Measured 2026-09-24 on /privacy: a plain `<a href="#section">` changed the URL and left the
 * page at scrollY 0. The router's `scrollBehavior` (router/index.ts) returns `{ top: 0 }` for
 * every navigation, and a hash change is one. So a click on any `#` link inside this frame (the
 * contents list, or a cross-reference in the text) is handled here, and a hash already in the
 * URL on arrival (a copied section link) is honoured after the router has scrolled to the top:
 * `setTimeout(0)` runs after the router's own scroll, which it schedules as a microtask behind
 * `nextTick`. The `href` stays, and a modified click is left alone, so a section link can still
 * be copied or opened in a new tab.
 *
 * Since 2026-09-24 the router honours `to.hash` itself, so a link from another page
 * (`/terms#payments`) lands on its section too. This frame's handling stays: a contents click
 * here replaces the URL instead of adding a history entry per section, and the arrival jump is
 * what moves focus to the heading. Both land on the same spot, because the router reads the
 * heading's own `scroll-margin-top`.
 *
 * The heading a link lands on takes focus (each carries `tabindex="-1"`), so a keyboard or
 * screen-reader user continues reading from the section they chose rather than from the list.
 *
 * THE READING COLUMN
 * ------------------
 * 70ch, about 70 characters a line at 16px, which is the brief's measure for a long document.
 * The body is 16px, not the 14px the rest of the public site uses: these are the two pages on
 * the site that someone reads start to finish. `.legal-prose` styles the slotted elements with
 * the same tokens the utilities resolve to, so each view writes plain h2/h3/p/ul.
 */
import { onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';

export interface LegalSection {
  id: string;
  title: string;
}

const props = defineProps<{
  title: string;
  /** YYYY-MM-DD */
  effective: string;
  /** YYYY-MM-DD */
  updated: string;
  sections: readonly LegalSection[];
}>();

/** "24 September 2026". UTC on both sides so no viewer's zone can move the day. */
function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function jumpTo(id: string, instant = false): void {
  const target = document.getElementById(id);
  if (!target) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: instant || reduce ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
  // `history.state` is passed back unchanged: it is the router's own record of this entry,
  // and replacing it with anything else breaks Back.
  if (!instant) history.replaceState(history.state, '', `#${id}`);
}

function onHashClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest('a[href^="#"]');
  const id = link ? decodeURIComponent(link.getAttribute('href')!.slice(1)) : '';
  if (!id || !document.getElementById(id)) return;
  event.preventDefault();
  jumpTo(id);
}

onMounted(() => {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id || !props.sections.some((s) => s.id === id)) return;
  window.setTimeout(() => jumpTo(id, true), 0);
});
</script>

<template>
  <div class="ws-focus flex-1 w-full font-editorial bg-canvas" @click="onHashClick">
    <div class="ws-page ws-content pt-4 pb-16 sm:pt-6 sm:pb-24">
      <!-- The breadcrumb the enquiry page uses, at the same 44px tap height. -->
      <nav aria-label="Breadcrumb">
        <ol class="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
          <li>
            <RouterLink
              to="/public"
              class="press inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
            >
              <ArrowLeft class="size-3.5" aria-hidden="true" />
              Home
            </RouterLink>
          </li>
          <li aria-hidden="true" class="text-ink-faint">/</li>
          <li aria-current="page" class="text-ink">{{ title }}</li>
        </ol>
      </nav>

      <header class="mt-4 max-w-[70ch]">
        <p class="text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">Fe Galang Da Silva Boarding House</p>
        <h1 class="mt-2 font-medium text-ink tracking-[-0.025em] leading-[1.05] text-[clamp(1.75rem,3.6vw,2.75rem)]">
          {{ title }}
        </h1>
        <div class="legal-prose mt-5">
          <slot name="lead" />
        </div>
        <p class="mt-5 text-sm text-ink-faint">
          Effective <time :datetime="effective">{{ longDate(effective) }}</time>.
          Last updated <time :datetime="updated">{{ longDate(updated) }}</time>.
        </p>
      </header>

      <!--
        Contents above the text on a phone and a tablet, beside it from 1024px, where it stays
        in view while the text scrolls. `lg:max-h` lets the list scroll on its own when large
        text makes it taller than the window, so no entry is ever out of reach. `top-24` clears
        AppHeader's 64px sticky bar with 32px to spare, the same allowance as the headings'
        `scroll-margin-top` below.
      -->
      <div
        class="mt-10 border-t border-line pt-8 sm:pt-10 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-12 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-x-20"
      >
        <nav
          aria-labelledby="legal-contents"
          class="mb-10 border-b border-line pb-8 lg:sticky lg:top-24 lg:mb-0 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:border-0 lg:pb-0"
        >
          <h2 id="legal-contents" class="text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">On this page</h2>
          <ol class="mt-2 text-sm sm:columns-2 sm:gap-8 lg:columns-1">
            <li v-for="s in sections" :key="s.id" class="break-inside-avoid">
              <a
                :href="`#${s.id}`"
                class="press flex min-h-11 items-center py-1 text-ink-soft underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
              >
                {{ s.title }}
              </a>
            </li>
          </ol>
        </nav>

        <article class="legal-prose min-w-0 max-w-[70ch]">
          <slot />
        </article>
      </div>
    </div>
  </div>
</template>

<!--
  Not scoped: the elements are the views' own (slot content), and one prefixed class is
  simpler to read than `:slotted()` on every rule. Colours are the design tokens.

  Links in the text underline in `--ink-faint`, not `--line`. `--line` is #e2e8e3 on a
  #edf1ee canvas, which leaves an underline that is all but invisible, and a link inside a
  sentence has nothing else to tell it apart: its ink is only one step darker than the text
  around it.
-->
<style>
.legal-prose {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--ink-soft);
}
.legal-prose > section + section {
  margin-top: 3rem;
}
.legal-prose h2 {
  color: var(--ink);
  font-size: 1.25rem;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.015em;
  scroll-margin-top: 6rem;
}
.legal-prose h3 {
  margin-top: 1.75rem;
  color: var(--ink);
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 600;
}
.legal-prose h2 + *,
.legal-prose h3 + * {
  margin-top: 0.625rem;
}
.legal-prose p + p,
.legal-prose p + ul,
.legal-prose ul + p,
.legal-prose p + address,
.legal-prose ul + address {
  margin-top: 0.875rem;
}
.legal-prose ul {
  list-style: disc;
  padding-left: 1.25rem;
}
.legal-prose li + li {
  margin-top: 0.5rem;
}
.legal-prose li::marker {
  color: var(--ink-faint);
}
.legal-prose strong {
  color: var(--ink);
  font-weight: 600;
}
.legal-prose a {
  color: var(--ink);
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  text-decoration-color: var(--ink-faint);
  overflow-wrap: anywhere;
}
.legal-prose a:hover {
  text-decoration-color: var(--ink);
}
.legal-prose address {
  font-style: normal;
}
</style>
