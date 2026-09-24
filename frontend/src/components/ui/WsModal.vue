<script setup lang="ts">
/**
 * The one dialog in the workspace system.
 *
 * Every dialog used to be hand-built: its own overlay, its own header, its own
 * close button, and none of them handled Escape, focus or the scroll behind
 * them. This one does, so a dialog is a dialog everywhere:
 *   - role="dialog" with aria-modal and a real accessible name
 *   - Escape closes it, and focus returns to whatever opened it
 *   - focus is kept inside while it is open
 *   - the page behind does not scroll
 *
 * It owns chrome only. What goes inside, and what the buttons do, stays with
 * the screen that opens it.
 */
import { ref, onMounted, onBeforeUnmount, nextTick, useId } from 'vue';
import { X } from 'lucide-vue-next';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    /** sm 28rem, md 36rem, lg 48rem, xl 64rem */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /**
     * Off for forms holding typed input, or a step that must complete before
     * the dialog goes away (ChangePasswordModal's mandatory mode).
     *
     * Gates all three exits - backdrop click, Escape, and the header's X -
     * not just the backdrop. It did not used to: `false` only stopped a
     * backdrop click, so `AdyenPaymentModal` and every `:dismissible="false"`
     * form in the app could still be Escaped or X'd past, mid-typing or
     * mid-payment, despite asking for exactly the opposite.
     */
    dismissible?: boolean;
    /**
     * No way out at all - no X, no Escape, no backdrop. For a step that must
     * complete before the dialog goes away, which today is exactly one thing:
     * a resident replacing the starting password they were issued (B-53).
     *
     * Deliberately separate from `dismissible`. That prop guards against an
     * ACCIDENT - a stray click on the backdrop, a reflexive Escape - and every
     * form holding typed input sets it. It was never meant to trap anybody,
     * but it also hid the header X, which left a long form on a phone with no
     * way out except scrolling to the bottom for Cancel. Pressing an X is a
     * deliberate act; it belongs in the "not an accident" category, so it is
     * back for every modal except a genuinely mandatory one.
     */
    mandatory?: boolean;
    /**
     * Disables the header X, for a dialog whose action is already in flight.
     * `dismissible` guards the backdrop and Escape but not the X, on purpose (see
     * `mandatory`), so ConfirmDialog's X still fired `cancel` mid-request (B-61).
     * Disabled rather than hidden, so the header does not jump while it waits.
     */
    closeDisabled?: boolean;
    tone?: 'plain' | 'danger';
  }>(),
  { size: 'md', dismissible: true, mandatory: false, closeDisabled: false, tone: 'plain' }
);

const emit = defineEmits<{ close: [] }>();

const titleId = useId();
const subtitleId = useId();
const panel = ref<HTMLElement | null>(null);
const overlay = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

const widths = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (!props.dismissible || props.mandatory) return;
    e.stopPropagation();
    emit('close');
    return;
  }
  /**
   * Only trap Tab while focus is actually inside THIS instance's panel.
   *
   * `OnsitePaymentModal` mounts its "Record this payment?" confirmation as a
   * second `WsModal` nested inside the one it confirms, so the inner panel
   * sits in the DOM underneath the outer one. A Tab keydown bubbles from
   * whichever input is focused up through both overlay `div`s, and both had a
   * `@keydown` listener - so pressing Tab inside the inner dialog also ran the
   * OUTER modal's trap, against the outer modal's OWN first/last focusable
   * element, and the two would fight over where focus landed.
   *
   * Checking `contains(document.activeElement)` scopes each instance's trap to
   * its own focus, and stopping propagation once handled keeps the event from
   * reaching an ancestor modal at all - the same reasoning as the Escape
   * branch above, just deferred until we know this instance is the one that
   * should act.
   */
  if (e.key !== 'Tab' || !panel.value || !panel.value.contains(document.activeElement)) return;
  e.stopPropagation();

  // `:not([tabindex="-1"])` on every kind: a PillSelect's open options are
  // buttons at -1, and the browser's own Tab never lands on them either.
  const focusable = [...panel.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'
  )].filter((el) => el.offsetParent !== null && el.getAttribute('tabindex') !== '-1');
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  // The panel itself holds focus when the dialog opens (see onMounted). Shift+Tab
  // from there would otherwise leave the dialog for the page behind it.
  if (document.activeElement === panel.value) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  /**
   * The counter that used to live in this file's own `<script>` block moved to
   * `lib/scrollLock.ts`, unchanged in behaviour and for the same reason it
   * existed: `OnsitePaymentModal` opens a second modal on top of itself, and an
   * unconditional unlock on the inner one let the page behind the outer one
   * scroll again.
   *
   * It is shared now because the mobile navigation drawer needs the same lock,
   * and a second private counter would have reproduced that bug one level up -
   * two counters that cannot see each other, whichever closes last winning.
   */
  lockBodyScroll();
  await nextTick();
  /**
   * Focus goes to the dialog itself, which is named by its heading, not to its
   * first field. The first field was chosen by a selector for `input`, and that
   * did three things wrong (B-61): on a phone it pulled the keyboard up over a
   * dialog nobody had started typing in; in the unit editor it matched the
   * `sr-only` file input, so focus sat on something nobody could see; and it
   * skipped any PillSelect above the first input, which is a `<button>`. From
   * the panel, the first Tab reaches the first control in order, whatever it is.
   */
  panel.value?.focus();
});

/**
 * A closing dialog fades instead of vanishing.
 *
 * Every caller removes this component with `v-if`, so it is gone before a
 * `<Transition>` inside it could play a leave, while BookViewingPrompt's
 * native <dialog> faded out and these 16 did not. So at the moment of
 * removal a snapshot of the overlay is left in its place, inert and hidden
 * from assistive technology, and faded out over 150ms before it deletes
 * itself. It is visual only: focus, scroll lock and every handler belong to
 * the real dialog, which is already gone.
 *
 * The snapshot has its transitions switched off, because the opening fade is
 * `@starting-style` and would otherwise replay IN on the copy. It keeps typed
 * text and the scroll position so the frame does not change as it fades, and
 * its ids are stripped so nothing can find it by id. Under reduced motion it
 * fades without the scale, the same bargain the opening makes.
 */
function leaveGhost(): void {
  const el = overlay.value;
  if (!el || typeof el.animate !== 'function') return;
  try {
    const ghost = el.cloneNode(true) as HTMLElement;
    const liveFields = el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    ghost.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((f, i) => {
      if (liveFields[i] && f.type !== 'file') f.value = liveFields[i].value;
    });
    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    ghost.style.pointerEvents = 'none';
    ghost.style.transition = 'none';
    const ghostPanel = ghost.querySelector<HTMLElement>('.ws-modal-panel');
    if (ghostPanel) ghostPanel.style.transition = 'none';
    document.body.appendChild(ghost);
    ghost.scrollTop = el.scrollTop;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timing = { duration: 150, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' as const };
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], timing);
    if (ghostPanel && !reduce) {
      ghostPanel.animate([{ transform: 'none' }, { transform: 'translateY(8px) scale(0.97)' }], timing);
    }
    // A timer, not `finished`: a hidden tab can pause the animation and the
    // copy must never outlive it.
    window.setTimeout(() => ghost.remove(), 200);
  } catch {
    // A snapshot is decoration; failing to make one changes nothing.
  }
}

onBeforeUnmount(() => {
  leaveGhost();
  // Only the last holder to let go releases the page behind it.
  unlockBodyScroll();
  previouslyFocused?.focus?.();
});
</script>

<template>
  <div
    ref="overlay"
    class="ws-modal-overlay ws-focus fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-ink/40 p-4 sm:p-6"
    @click.self="dismissible && !mandatory && emit('close')"
    @keydown="onKeydown"
  >
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="subtitle ? subtitleId : undefined"
      tabindex="-1"
      :class="[
        'ws-modal-panel my-auto w-full rounded-tile bg-tile text-ink shadow-lift outline-none',
        widths[props.size],
      ]"
    >
      <header class="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
        <div class="min-w-0">
          <h2 :id="titleId" :class="['text-lg font-semibold tracking-tight', tone === 'danger' && 'text-overdue']">
            {{ title }}
          </h2>
          <p v-if="subtitle" :id="subtitleId" class="mt-1 text-sm text-ink-soft">{{ subtitle }}</p>
        </div>
        <!--
          Shown unless the dialog is genuinely mandatory. It used to be gated
          on `dismissible`, which meant every form holding typed input - the
          payment modals, the expense and income editors, the unit editor -
          had no X at all. On a phone that is a long scroll to reach Cancel,
          and nothing at the top to say the dialog can be left.
        -->
        <button
          v-if="!mandatory"
          type="button"
          class="icon-btn shrink-0"
          aria-label="Close this dialog"
          :disabled="closeDisabled"
          @click="emit('close')"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5 sm:p-6 flex flex-col gap-5">
        <slot />
      </div>

      <footer
        v-if="$slots.actions"
        class="flex flex-wrap items-center justify-end gap-2 border-t border-line p-5 sm:p-6"
      >
        <slot name="actions" />
      </footer>
    </div>
  </div>
</template>
