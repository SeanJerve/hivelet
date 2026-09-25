<script setup lang="ts">
/**
 * What a visitor is shown when the site cannot find out which units are free.
 *
 * WHY THIS IS A COMPONENT
 * -----------------------
 * The two public pages answered the same outage differently. `/category/studio`
 * said the units could not be loaded and gave the landlady's number;
 * `/public` listed the built-in fallback - **all 33 units, every one marked
 * Available**, on a property where 32 are occupied - under a notice saying the
 * figures might be out of date. So one page said "we cannot tell you" while the
 * other told a prospective boarder there were 33 rooms free, during the same
 * outage, on the same site.
 *
 * Sean settled it on 2026-09-19: be honest, show that we cannot display it right
 * now, and tell them to make contact directly. This is that, in one place, so
 * the two pages cannot drift apart again.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It shows **no unit list, no rates and no counts**. The fallback data is
 * `canonicalUnits.ts`, whose prices are a snapshot - 30 of the 33 no longer match
 * the database - and whose status is `vacant` for every unit. Printing any of it
 * during an outage is how a stranger gets quoted a rent that is wrong by up to
 * ₱2,000, or told a room is free when somebody lives in it.
 *
 * It also does not say "error", "failed" or a status code. A visitor is not
 * debugging the site; they want to know whether there is a room, and the honest
 * answer is that we cannot tell them right now and here is who can.
 */
import { RouterLink } from 'vue-router';
import { Phone, MessageSquare, RotateCw } from 'lucide-vue-next';
import { LANDLADY } from '@/lib/systemState';

withDefaults(
  defineProps<{
    /** What could not be shown, in the visitor's terms. */
    subject?: string;
    /** Hidden when the surrounding page already offers one. */
    showRetry?: boolean;
  }>(),
  {
    subject: 'which units are free',
    showRetry: true,
  }
);

function reload() {
  window.location.reload();
}
</script>

<template>
  <section
    role="alert"
    aria-live="polite"
    class="availability-unavailable w-full border-t border-line"
  >
    <div class="ws-page ws-content ws-band">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-soft">
        Live availability
      </p>

      <h2 class="mt-4 text-xl sm:text-2xl font-medium text-ink tracking-[-0.02em]">
        We cannot show you {{ subject }} right now
      </h2>

      <!--
        The first sentence is the important one, and it is the same point the
        category page has always carried: an outage is not a full house, and a
        visitor who assumes otherwise simply leaves.
      -->
      <!-- "Her" had no one to refer to until the footer line; she is named here now. -->
      <p class="mt-5 max-w-xl text-xs sm:text-sm text-ink-soft leading-relaxed">
        That does not mean nothing is vacant. The list is out of reach for the moment,
        so please ask Mrs. {{ LANDLADY.name }} directly.
      </p>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <a
          :href="`tel:${LANDLADY.phone}`"
          class="pill-btn-brand"
        >
          <Phone class="size-4" aria-hidden="true" />
          Call {{ LANDLADY.phone }}
        </a>

        <RouterLink to="/inquire" class="pill-btn">
          <MessageSquare class="size-4" aria-hidden="true" />
          Inquire now
        </RouterLink>

        <button v-if="showRetry" type="button" class="pill-btn" @click="reload">
          <RotateCw class="size-4" aria-hidden="true" />
          Try again
        </button>
      </div>

      <p class="mt-6 text-xs text-ink-soft">
        {{ LANDLADY.name }} · {{ LANDLADY.address }}
      </p>
    </div>
  </section>
</template>

<style scoped>
/* Same reasoning as UnavailableNote: this section only exists on the page
   because a fetch just failed, so its mount is the moment a visitor sees it. */
.availability-unavailable {
  animation: availability-unavailable-in 0.22s var(--ease-out) backwards;
}
@keyframes availability-unavailable-in {
  from {
    opacity: 0;
    translate: 0 4px;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .availability-unavailable {
    animation: none;
  }
}
</style>
