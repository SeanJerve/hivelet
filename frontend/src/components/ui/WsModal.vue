<script lang="ts">
/**
 * How many `WsModal` instances are currently mounted, across the whole page.
 *
 * `OnsitePaymentModal` opens a second one of these - the "Record this payment?"
 * check - on top of itself, and every instance used to lock and unlock
 * `document.body.style.overflow` on its own. Closing the inner confirmation
 * unmounted it, its `onBeforeUnmount` cleared the lock unconditionally, and the
 * page behind the OUTER modal - the one still open - scrolled again.
 *
 * This has to live in a plain, non-`setup` block. A `let` declared inside
 * `<script setup>` is scoped to that component's own `setup()` call and a
 * fresh copy is created per instance, which is exactly the bug again - two
 * counters that cannot see each other. A module-level binding outside `setup`
 * is created once, when the module first loads, and every instance shares it.
 */
let openModalCount = 0;
</script>

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
    tone?: 'plain' | 'danger';
  }>(),
  { size: 'md', dismissible: true, mandatory: false, tone: 'plain' }
);

const emit = defineEmits<{ close: [] }>();

const titleId = useId();
const subtitleId = useId();
const panel = ref<HTMLElement | null>(null);
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

  const focusable = [...panel.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((el) => el.offsetParent !== null);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  openModalCount++;
  document.body.style.overflow = 'hidden';
  await nextTick();
  const target =
    panel.value?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea, select') ??
    panel.value;
  target?.focus();
});

onBeforeUnmount(() => {
  openModalCount = Math.max(0, openModalCount - 1);
  // Only the last modal to close releases the page behind it.
  if (openModalCount === 0) {
    document.body.style.overflow = '';
  }
  previouslyFocused?.focus?.();
});
</script>

<template>
  <div
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
