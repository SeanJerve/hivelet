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
  if (alreadyDismissed()) return;
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

      <p class="text-[0.7rem] tracking-[0.18em] uppercase text-ink-soft">
        Fe Galang Da Silva Boarding House
      </p>

      <h2
        id="viewing-prompt-title"
        class="mt-5 font-medium tracking-[-0.025em] leading-[1.15] text-[clamp(1.35rem,3.4vw,1.9rem)]"
      >
        Viewings by appointment<br />Register your interest
      </h2>

      <button
        type="button"
        class="pill-btn-brand mt-10 px-10"
        @click="bookNow"
      >
        Book now
      </button>
    </div>
  </dialog>
</template>
