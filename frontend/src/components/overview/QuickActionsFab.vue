<script setup lang="ts">
/**
 * The Overview's actions on a phone: a floating green pill bottom right that
 * opens Record payment, Record expense and Move someone in/out above it
 * (Sean, 2026-10-01: four buttons under the greeting was "too much").
 *
 * It takes the SAME action list the header renders on a wider screen
 * (AdminOverviewView's `quickActions`), so a phone and a desktop cannot drift
 * apart on where an action goes.
 *
 * Teleported to <body> because the page it belongs to arrives inside
 * `.page-move`, whose keyframes animate `transform`: while that runs, a
 * `position: fixed` element inside it is fixed to the page, not the screen.
 *
 * Layering: z-30, the year menu's level - above the page, below the sticky
 * app header (z-40), the phone sidebar and every dialog (z-50) and the toasts
 * (z-60), so anything those open covers the button and its scrim.
 *
 * Phones and small tablets only: `md:hidden` on its own wrapper, because a
 * class on the parent's side would stay behind when the content is
 * teleported. From 768px the header buttons are back.
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import type { QuickAction } from '@/components/overview/types';

/** In priority order: the first sits nearest the button and takes focus on open. */
defineProps<{ actions: QuickAction[] }>();

const route = useRoute();
const isOpen = ref(false);
const root = ref<HTMLElement | null>(null);
const toggle = ref<HTMLButtonElement | null>(null);
const list = ref<HTMLElement | null>(null);

function open() {
  isOpen.value = true;
  // Focus the nearest action once it is in the DOM, so a keyboard or switch
  // user lands in the menu they just opened rather than behind it.
  nextTick(() => list.value?.querySelector<HTMLElement>('a, button')?.focus());
}

function close(returnFocus = false) {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (returnFocus) toggle.value?.focus();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    e.preventDefault();
    close(true);
  }
}

// Tabbing past the last action leaves the menu; it should not stay open
// behind the reader with its scrim over the page they moved on to.
function onFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null;
  if (isOpen.value && next && !root.value?.contains(next)) close();
}

watch(isOpen, (now) => {
  if (now) document.addEventListener('keydown', onKeydown);
  else document.removeEventListener('keydown', onKeydown);
});
// Any navigation, including the year changing the Overview's query, closes it.
watch(() => route.fullPath, () => close());
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="ws-focus md:hidden">
      <Transition name="ws-fade">
        <div
          v-if="isOpen"
          class="fixed inset-0 z-30 bg-night/20"
          aria-hidden="true"
          data-testid="quick-actions-scrim"
          @click="close(true)"
        />
      </Transition>

      <!-- flex-col-reverse: the toggle is first in the reading and tab order,
           the actions stack ABOVE it, the first of them nearest the thumb. -->
      <div
        ref="root"
        class="fixed z-30 flex flex-col-reverse items-end gap-3 right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))]"
        @focusout="onFocusOut"
      >
        <button
          ref="toggle"
          type="button"
          class="pill-btn-brand h-14 px-5 shadow-lift"
          :aria-expanded="isOpen"
          aria-controls="overview-quick-actions"
          aria-label="Record or move someone"
          @click="isOpen ? close(true) : open()"
        >
          <Plus
            :class="[
              'size-6 transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none',
              isOpen && 'rotate-45',
            ]"
            aria-hidden="true"
          />
        </button>

        <Transition name="ws-dial" :duration="{ enter: 260, leave: 140 }">
          <ul
            v-if="isOpen"
            id="overview-quick-actions"
            ref="list"
            aria-label="Record or move someone"
            class="flex flex-col-reverse items-end gap-2.5"
          >
            <li v-for="(a, i) in actions" :key="a.to" :style="{ '--i': i }">
              <router-link
                :to="a.to"
                :class="[a.primary ? 'pill-btn-brand' : 'pill-btn', 'shadow-lift']"
                @click="close()"
              >
                <component :is="a.icon" :class="['size-4', !a.primary && 'text-ink-soft']" aria-hidden="true" />
                {{ a.label }}
              </router-link>
            </li>
          </ul>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>
