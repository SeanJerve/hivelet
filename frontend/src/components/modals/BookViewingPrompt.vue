<script setup lang="ts">
/**
 * @file BookViewingPrompt.vue
 * @description First-visit prompt on the public landing page, offering a route
 *   to the enquiry form.
 *
 * WHY A NATIVE <dialog>
 * --------------------
 * `showModal()` gives focus containment, Escape-to-close, background inertness
 * and a `::backdrop` from the platform. A div with `role="dialog"` would mean
 * reimplementing all four, and the usual result is a trap that leaks focus to
 * the page behind it.
 *
 * WHY IT IS REMEMBERED
 * --------------------
 * Shown once per browser, not once per page load. A prompt that reappears on
 * every visit to a page someone is actively reading is an obstacle, not an
 * invitation. `localStorage` can throw in a private window and comes back empty
 * when site data is cleared, so both accessors are guarded; a failure means the
 * prompt simply shows, which is the safe direction.
 *
 * The wording claims nothing the property cannot honour: no show home, no
 * open-house hours, no promise of a reply by a channel this system does not
 * have. Viewings are arranged with the landlady, and that is what it says.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { isAuthenticated } from '@/lib/authStore';
import { X } from 'lucide-vue-next';

const STORAGE_KEY = 'hivelet.viewingPromptDismissed';

const router = useRouter();
const dialogRef = ref<HTMLDialogElement | null>(null);

function alreadyDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Private window or blocked site data. The prompt shows again next visit,
    // which is preferable to failing the close.
  }
}

function close() {
  remember();
  dialogRef.value?.close();
}

function bookNow() {
  remember();
  dialogRef.value?.close();
  router.push('/inquire');
}

/**
 * A click landing on the dialog element itself - rather than on the panel
 * inside it - is a click on the backdrop, because the panel covers the whole
 * dialog box.
 */
function onDialogClick(event: MouseEvent) {
  if (event.target === dialogRef.value) close();
}

// Escape fires `cancel` before `close`; remember the dismissal either way.
function onCancel() {
  remember();
}

onMounted(() => {
  // A signed-in resident or the landlady is not a prospect; the router has
  // already restored the session before any page mounts.
  if (alreadyDismissed() || isAuthenticated.value) return;
  dialogRef.value?.showModal();
});

onBeforeUnmount(() => {
  if (dialogRef.value?.open) dialogRef.value.close();
});
</script>

<template>
  <dialog
    ref="dialogRef"
    aria-labelledby="viewing-prompt-title"
    class="ws-dialog m-auto w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-tile border border-line bg-tile shadow-lift p-0 font-editorial text-ink backdrop:bg-night/70"
    @click="onDialogClick"
    @cancel="onCancel"
  >
    <div class="relative px-8 py-12 sm:px-14 sm:py-16 text-center">
      <button
        type="button"
        class="icon-btn absolute right-3 top-3"
        @click="close"
      >
        <span class="sr-only">Close</span>
        <X class="size-4" />
      </button>

      <h2
        id="viewing-prompt-title"
        class="text-balance font-medium tracking-[-0.025em] leading-[1.15] text-[clamp(1.35rem,3.4vw,1.9rem)]"
      >
        Viewings are by appointment
      </h2>
      <!-- Was a second heading line, "Register your interest", over a button saying "Inquire now": two names for one action. -->
      <p class="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
        Send the landlady a message to arrange one.
      </p>

      <!--
        `px-6`, not `px-10`. `.pill-btn-brand` already sets `padding: 0
        1.125rem` (index.css); this button doubled it again on top for visual
        weight, which is fine at a normal text size and genuinely broken at a
        larger one.

        At 200% browser text zoom - a real accessibility setting, not an edge
        case, and the one WCAG 1.4.4 requires content to survive - the dialog
        itself stays correctly sized (`w-[min(34rem,calc(100vw-2rem))]` is
        anchored to `100vw`, which does not scale with text). This button's
        `rem`-based padding does scale, and unbounded by the dialog's own
        width, `px-10` alone ate more width than the dialog had left for it -
        measured on an emulated handset at `html { font-size: 200% }`: the
        button's own rect ran to x=404 against a 375px viewport, past even
        `overflow-hidden` on the dialog, which is what actually swallowed the
        overflow rather than showing it - the label was there and unreadable,
        not visibly broken. `px-5` keeps some of the emphasis (6px more per
        side than the base pill, not 22px) and measured with a genuine margin
        at the same 200% zoom - about 15px between the button's right edge and
        the dialog's own padded content area, not flush against it. Re-check
        that measurement if this value changes again; it was right at the
        edge, under 2px, at `px-6`.
      -->
      <!--
        "Book now" over-promised: clicking it does not book anything, it opens
        the enquiry form (bookNow() below just routes to /inquire), which this
        file's own top comment says the wording must not do. "Inquire now"
        matches AppHeader's existing label for the same destination, so a
        first-time visitor meets the same words twice rather than two
        different ones for one link (asked to simplify, 2026-09-24).
      -->
      <button
        type="button"
        class="pill-btn-brand mt-8 px-5"
        @click="bookNow"
      >
        Inquire now
      </button>
    </div>
  </dialog>
</template>
