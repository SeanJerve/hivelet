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
 *
 * THE VACANCY COUNT, AND WHEN IT IS NOT SHOWN
 * -------------------------------------------
 * The heading says how many units are vacant, from the listing the landing
 * page already loads (`/public/rooms`, counted by the parent). It falls back
 * to the original wording - "Viewings are by appointment" - whenever that
 * number is not known to be current:
 *
 *   - while the listing is loading, and when it fails. The parent passes null
 *     for both, because until it answers the unit list is the all-vacant seed.
 *   - offline. The service worker answers `/api/public/*` from its cache for up
 *     to an hour (vite.config.ts), so a count read offline is an old count
 *     presented as "right now". Once the browser reports going offline the
 *     count is withdrawn for the life of this prompt, not restored on
 *     reconnect, because the list it came from may be that cached copy.
 *
 * Zero says "No units are vacant", not "all N are occupied": a unit under
 * maintenance or reserved is neither, and the sentence would be false.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { isAuthenticated } from '@/lib/authStore';
import { X } from 'lucide-vue-next';

const props = defineProps<{
  /** Published units whose status is Available. Null while unknown: loading, or failed. */
  vacantCount: number | null;
}>();

const STORAGE_KEY = 'hivelet.viewingPromptDismissed';

const offline = ref(typeof navigator !== 'undefined' && navigator.onLine === false);
function onOffline() {
  offline.value = true;
}

/** The count to state, or null to keep the original wording. */
const shownCount = computed<number | null>(() => (offline.value ? null : props.vacantCount));

const heading = computed(() => {
  const n = shownCount.value;
  if (n === null) return 'Viewings are by appointment';
  if (n === 0) return 'No units are vacant right now';
  // Both built from `n`, never a written-out one: check:ledger reads a bare number before the word
  // for a unit in frontend/src as a claim about the property's size, and this is a vacancy count.
  return n === 1 ? `${n} unit is vacant right now` : `${n} units are vacant right now`;
});

const detail = computed(() => {
  const n = shownCount.value;
  if (n === null) return 'Send the landlady a message to arrange one.';
  if (n === 0) return 'Send the landlady a message to ask when one opens. Viewings are by appointment.';
  return 'Viewings are by appointment. Send the landlady a message to arrange one.';
});

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
  window.addEventListener('offline', onOffline);
  dialogRef.value?.showModal();
  dialogRef.value?.focus();
});

onBeforeUnmount(() => {
  window.removeEventListener('offline', onOffline);
  if (dialogRef.value?.open) dialogRef.value.close();
});
</script>

<template>
  <!--
    Focus starts on the dialog itself (`tabindex="-1"`, focused in onMounted):
    showModal() otherwise focuses its first control, the X, and with nothing
    clicked yet Chrome draws the keyboard ring round it on arrival, the circle
    Sean removed from every X (6 Oct 2026). `autofocus` on the dialog is the
    spec's way and Chromium ignored it (tested). Tab reaches the X, ring and all.
  -->
  <dialog
    ref="dialogRef"
    tabindex="-1"
    aria-labelledby="viewing-prompt-title"
    class="ws-dialog outline-none m-auto w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-tile border border-line bg-tile shadow-lift p-0 font-editorial text-ink backdrop:bg-dim/70"
    @click="onDialogClick"
    @cancel="onCancel"
  >
    <div class="relative px-6 pb-8 pt-14 sm:px-14 sm:py-16 text-center">
      <button
        type="button"
        class="icon-btn absolute right-3 top-3"
        @click="close"
      >
        <span class="sr-only">Close</span>
        <X class="size-4" />
      </button>

      <!--
        `aria-live`: the dialog opens before the listing answers, so the heading
        can change from the fallback to the count while it is already open and
        announced. Polite, so the change is read once rather than interrupting.
      -->
      <div aria-live="polite">
        <h2
          id="viewing-prompt-title"
          class="text-balance font-medium tracking-[-0.025em] leading-[1.15] text-[clamp(1.35rem,3.4vw,1.9rem)]"
        >
          {{ heading }}
        </h2>
        <!-- Was a second heading line, "Register your interest", over a button saying "Inquire now": two names for one action. -->
        <p class="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
          {{ detail }}
        </p>
      </div>

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
