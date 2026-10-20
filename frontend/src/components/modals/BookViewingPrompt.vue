<script setup lang="ts">
/**
 * @file BookViewingPrompt.vue
 * @description First-visit prompt on the public landing page, offering a route
 *   to the enquiry form.
 *
 * A SHEET, LIKE EVERY OTHER DIALOG
 * -------------------------------
 * It was a native <dialog> in the middle of the page. Pop-ups are for decisions
 * now, everything else is the sheet from the bottom edge (Sean, 20 Oct 2026), so
 * it is WsModal, which brings the focus trap, Escape, the scroll lock and the
 * half-height rest a prompt this short gets.
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
import WsModal from '@/components/ui/WsModal.vue';

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
  if (n === 0) return 'Send the landlady a message to ask when one opens.';
  return 'Viewings are by appointment. Send the landlady a message to arrange one.';
});

const router = useRouter();
const open = ref(false);

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
  open.value = false;
}

function bookNow() {
  remember();
  open.value = false;
  router.push('/inquire');
}

/*
 * NOT ON ARRIVAL (20 Oct 2026). Opened the instant the page loaded, the sheet covered the lower
 * half of the photograph the hero was resized to show. It now waits until the visitor has seen
 * the hero: scrolled past most of it, or eight seconds on the page, whichever comes first.
 */
const WAIT_MS = 8000;
let waitTimer: ReturnType<typeof setTimeout> | undefined;
function show() {
  clearTimeout(waitTimer);
  window.removeEventListener('scroll', onScroll);
  if (!alreadyDismissed()) open.value = true;
}
function onScroll() {
  if (window.scrollY > window.innerHeight * 0.4) show();
}

onMounted(() => {
  // A signed-in resident or the landlady is not a prospect; the router has
  // already restored the session before any page mounts.
  if (alreadyDismissed() || isAuthenticated.value) return;
  window.addEventListener('offline', onOffline);
  window.addEventListener('scroll', onScroll, { passive: true });
  waitTimer = setTimeout(show, WAIT_MS);
});

onBeforeUnmount(() => {
  clearTimeout(waitTimer);
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('offline', onOffline);
});
</script>

<template>
  <WsModal v-if="open" :title="heading" size="sm" @close="close">
    <!-- `aria-live`: the sheet opens before the listing answers, so the count can arrive while it is open. -->
    <p aria-live="polite" class="text-sm leading-relaxed text-ink-soft">{{ detail }}</p>
    <template #actions>
      <!-- "Inquire now", the header's own word for this destination, not "Book now": nothing is booked. -->
      <button type="button" class="pill-btn-brand" @click="bookNow">Inquire now</button>
    </template>
  </WsModal>
</template>
