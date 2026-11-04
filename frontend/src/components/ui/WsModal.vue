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
import { ref, computed, onMounted, onBeforeUnmount, nextTick, useId } from 'vue';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-vue-next';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { useToast, registerDialog, unregisterDialog } from '@/lib/useToast';

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
    /**
     * A sheet that must not be left by a tap on the dimmed area or a swipe down (4 Nov 2026).
     *
     * On a sheet those two exits follow `mandatory` and `closeDisabled`, NOT `dismissible`: the
     * owner expects a form with typed input to close when she taps outside it, so
     * `:dismissible="false"` on a form now stops Escape only. What must still refuse a stray tap
     * or a swipe - the credential reveal, a payment in flight - says so here. The header X is
     * unchanged and stays available.
     */
    persistent?: boolean;
    tone?: 'plain' | 'danger';
    /**
     * A decision that needs a full stop ("Record this payment?", ConfirmDialog): the one kind
     * still drawn as a pop-up in the middle of the screen (Sean, 20 Oct 2026). Everything else is
     * a sheet from the bottom edge at every width; see "The sheet" below.
     */
    decision?: boolean;
  }>(),
  { size: 'md', dismissible: true, mandatory: false, closeDisabled: false, persistent: false, tone: 'plain', decision: false }
);

const emit = defineEmits<{ close: [] }>();

const titleId = useId();
const subtitleId = useId();
const dialogId = useId();

/**
 * Messages raised while this is the top dialog (audit 2026-10-09). The stack
 * at the top of the screen used to draw them over this dialog's title and X on
 * a phone; they are drawn here instead, under the title, and a refusal stays
 * until it is dismissed or the dialog closes. Reasoning in `lib/useToast.ts`.
 */
const { toasts } = useToast();
const messages = computed(() => toasts.value.filter((t) => t.dialogId === dialogId));
const messageTone = {
  success: { box: 'bg-brand-soft', icon: 'text-brand', is: CheckCircle2 },
  warning: { box: 'bg-verify-soft', icon: 'text-verify', is: AlertTriangle },
  error: { box: 'bg-overdue-soft', icon: 'text-overdue', is: AlertCircle },
  info: { box: 'bg-well', icon: 'text-ink-soft', is: Info },
} as const;
const panel = ref<HTMLElement | null>(null);
const overlay = ref<HTMLElement | null>(null);
const body = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

/* -------------------------------------------------------------------------- *
 * The sheet (Sean, 20 Oct 2026; one set of snap points, 4 Nov 2026)
 *
 * Every dialog that is not a decision rises from the bottom edge, at every width, and rests at
 * one of three places and nothing in between: FULL (the screen less a strip of the page behind,
 * where it opens - Lloyd, 3 Nov 2026: "everything should open by default to the top"), HALF, or
 * CLOSED. Every sheet has exactly these, so a drag does the same thing everywhere.
 *
 * The handle and the title row drag it, 1:1 under the finger:
 *   - between half and full the height follows the finger;
 *   - below half the sheet keeps its half height and slides down as a transform, so its content
 *     does not reflow while it leaves;
 *   - on release the flick's speed is projected to where it would come to rest (Apple's
 *     projection). If that is below CLOSE_BELOW of half the sheet slides the rest of the way out
 *     and closes; otherwise it settles on the nearer of half or full.
 * From half it grows to full by itself when a field is focused (the keyboard needs the room); it
 * never shrinks by itself. The handle is also a button, so the keyboard and a screen reader can
 * switch the height too. A tap on the dimmed area outside the sheet closes it, at any height.
 * Tap-outside and swipe-away follow `mandatory`, `closeDisabled` and `persistent`; see
 * `canDismiss`.
 * -------------------------------------------------------------------------- */
const viewportH = ref(typeof window === 'undefined' ? 800 : window.innerHeight);
const snap = ref<'half' | 'full'>('full');
const dragHeight = ref<number | null>(null);
const dragOffset = ref(0);
const dragging = ref(false);
/** The sheet is sliding out after a swipe; it is already on its way and takes no more input. */
const leaving = ref(false);
const halfPx = computed(() => Math.round(viewportH.value * 0.5));
const fullPx = computed(() => viewportH.value - 24);
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Where a release is judged: a projected resting height under this share of half closes. */
const CLOSE_BELOW = 0.6;
const SLIDE_OUT_MS = 240;
const VELOCITY_WINDOW_MS = 100;
// The two curves the sheet uses; `--ease-drawer` is the iOS drawer curve, spelled out here so it
// works wherever the token is not defined.
const EASE_DRAWER = 'var(--ease-drawer, cubic-bezier(0.32, 0.72, 0, 1))';
const EASE_OUT = 'var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1))';

/**
 * At rest the two heights are CSS, in dynamic viewport units, not pixels measured when the
 * dialog opened: a phone's visible height changes as its address bar slides, and a page measured
 * at the wrong moment (a hidden preview reported 0) would otherwise leave the sheet at that size.
 * Pixels only while a finger holds it. Movement is a height between half and full and a
 * transform below half; under reduced motion nothing animates, it just lands.
 */
const panelStyle = computed(() => {
  if (props.decision) return undefined;
  const reduce = prefersReducedMotion();
  const held = dragHeight.value !== null;
  const transform = leaving.value
    ? 'translateY(calc(100% + 2rem))'
    : dragOffset.value > 0
      ? `translateY(${dragOffset.value}px)`
      : undefined;
  return {
    height: held ? `${dragHeight.value}px` : snap.value === 'full' ? 'calc(100dvh - 1.5rem)' : '50dvh',
    transform,
    transition:
      dragging.value || reduce
        ? 'none'
        : leaving.value
          ? `transform ${SLIDE_OUT_MS}ms ${EASE_DRAWER}`
          : `height 320ms ${EASE_DRAWER}, transform 320ms ${EASE_DRAWER}`,
  };
});
// The scrim goes with the sheet while it slides out.
const overlayStyle = computed(() =>
  leaving.value && !prefersReducedMotion() ? { opacity: 0, transition: `opacity ${SLIDE_OUT_MS}ms ${EASE_OUT}` } : undefined
);

function toggleSnap() {
  if (suppressHandleClick) {
    suppressHandleClick = false;
    return;
  }
  if (leaving.value) return;
  snap.value = snap.value === 'full' ? 'half' : 'full';
}

// A field needs the room once someone starts typing, and on a phone the keyboard takes half.
function onFocusIn(e: FocusEvent) {
  if (props.decision || snap.value === 'full') return;
  if ((e.target as HTMLElement | null)?.matches?.('input:not([type="checkbox"]):not([type="radio"]), textarea, select')) {
    snap.value = 'full';
  }
}

/**
 * Whether a sheet may be left by a tap on the dimmed area or a swipe down. NOT gated by
 * `dismissible`: that prop guards Escape on a form holding typed input, and the owner's review
 * (4 Nov 2026) wants a tap outside to close those too. `mandatory`, a request in flight
 * (`closeDisabled`) and an explicit `persistent` still refuse.
 */
const canDismiss = computed(() => !props.mandatory && !props.closeDisabled && !props.persistent);
/** A decision (the centred card) keeps what it always had: the backdrop follows `dismissible`. */
const canBackdropClose = computed(() => (props.decision ? props.dismissible && !props.mandatory : canDismiss.value));

// Apple's projection of where a flick comes to rest (WWDC 2018, "Designing Fluid Interfaces").
const project = (velocityPxPerSec: number, rate = 0.998) => ((velocityPxPerSec / 1000) * rate) / (1 - rate);
// Resistance past an edge that does not give, so the sheet slows before it stops.
const rubber = (over: number, dim: number) => (over * dim * 0.55) / (dim + 0.55 * Math.abs(over));
let drag: {
  startY: number;
  startH: number;
  /** The height the finger asks for, before it is clamped: below half it is the slide-out distance. */
  h: number;
  moved: boolean;
  samples: { y: number; t: number }[];
} | null = null;
let suppressHandleClick = false;
/** When the last drag ended; a click this soon after is the drag's own, not a tap outside. */
let lastDragEnd = 0;
let unmounted = false;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
let restoreTimer: ReturnType<typeof setTimeout> | undefined;

function onDragStart(e: PointerEvent) {
  if (props.decision || leaving.value || e.button !== 0) return;
  // Only the handle and the title row grab; the X and anything else interactive keep their taps.
  const target = e.target as HTMLElement;
  if (target.closest('a, input, select, textarea, button:not(.ws-sheet-handle)')) return;
  viewportH.value = window.innerHeight;
  const startH = panel.value?.getBoundingClientRect().height ?? (snap.value === 'full' ? fullPx.value : halfPx.value);
  drag = { startY: e.clientY, startH, h: startH, moved: false, samples: [{ y: e.clientY, t: e.timeStamp }] };
  // Capture, so the move and the release arrive here even when the finger leaves the handle, and
  // the click that follows is not aimed at whatever is under the finger.
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
}
function onDragMove(e: PointerEvent) {
  if (!drag) return;
  const dy = e.clientY - drag.startY;
  if (!drag.moved && Math.abs(dy) < 6) return; // a tap stays a tap
  drag.moved = true;
  dragging.value = true;
  let h = drag.startH - dy;
  if (h > fullPx.value) h = fullPx.value + rubber(h - fullPx.value, viewportH.value);
  // A sheet that cannot be dismissed resists being pulled below half instead of following.
  else if (h < halfPx.value && !canDismiss.value) h = halfPx.value - rubber(halfPx.value - h, viewportH.value);
  drag.h = h;
  dragHeight.value = Math.max(h, halfPx.value);
  dragOffset.value = Math.max(0, halfPx.value - h);
  drag.samples.push({ y: e.clientY, t: e.timeStamp });
  if (drag.samples.length > 8) drag.samples.shift();
}
function onDragEnd(e: PointerEvent) {
  if (!drag) return;
  const d = drag;
  drag = null;
  dragging.value = false;
  if (!d.moved) return;
  // The click the browser sends after this release belongs to the drag: not a handle toggle, and
  // not a tap on the backdrop even where it is aimed at the overlay.
  lastDragEnd = Date.now();
  suppressHandleClick = true;
  window.setTimeout(() => (suppressHandleClick = false), 0);
  // Speed over the last 100ms before release; a finger that stopped before lifting is not a flick.
  const endT = e.timeStamp;
  const recent = d.samples.filter((s) => endT - s.t <= VELOCITY_WINDOW_MS);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const dt = first && last ? Math.max(1, last.t - first.t) : 0;
  const downwardPxPerSec = dt ? ((last.y - first.y) / dt) * 1000 : 0;
  const projected = d.h - project(downwardPxPerSec);
  if (canDismiss.value && e.type !== 'pointercancel' && projected < halfPx.value * CLOSE_BELOW) {
    slideOutAndClose();
    return;
  }
  snap.value = Math.abs(projected - halfPx.value) < Math.abs(projected - fullPx.value) ? 'half' : 'full';
  dragHeight.value = null;
  dragOffset.value = 0;
}

/**
 * Finish a swipe: carry the sheet the rest of the way off the bottom, then close. The parent
 * removes this component on `close`; a parent that declines (it is busy, it asks first) leaves it
 * mounted, and then it slides back rather than being left invisible.
 */
function slideOutAndClose() {
  if (leaving.value) return;
  if (prefersReducedMotion()) {
    // No movement under reduced motion: close from where it was released, and the ghost fades.
    emit('close');
    restoreTimer = setTimeout(restoreAfterRefusal, 150);
    return;
  }
  leaving.value = true;
  closeTimer = setTimeout(() => {
    emit('close');
    restoreTimer = setTimeout(restoreAfterRefusal, 150);
  }, SLIDE_OUT_MS + 20);
}
function restoreAfterRefusal() {
  if (unmounted) return;
  leaving.value = false;
  dragHeight.value = null;
  dragOffset.value = 0;
}

/**
 * A tap on the dimmed area. It has to have both started and ended there: a press inside the
 * panel (selecting text in a field) released outside is a click on the overlay too, since the
 * overlay is the two elements' common ancestor, and must not close anything. A click within a
 * beat of a drag's release is the drag's. `detail` 0 is a click made without a pointer (a
 * script, an assistive tool) and is taken as a deliberate tap.
 */
let pressedOnBackdrop = false;
function onOverlayPointerDown(e: PointerEvent) {
  pressedOnBackdrop = e.target === e.currentTarget;
}
function onOverlayClick(e: MouseEvent) {
  if (e.target !== e.currentTarget) return;
  const startedThere = pressedOnBackdrop || e.detail === 0;
  pressedOnBackdrop = false;
  if (!startedThere || Date.now() - lastDragEnd < 300) return;
  if (leaving.value || !canBackdropClose.value) return;
  emit('close');
}

function onResize() {
  viewportH.value = window.innerHeight;
}

const widths = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

// `:not([tabindex="-1"])` on every kind: a PillSelect's open options are
// buttons at -1, and the browser's own Tab never lands on them either.
function focusables(): HTMLElement[] {
  if (!panel.value) return [];
  return [...panel.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'
  )].filter((el) => el.offsetParent !== null && el.getAttribute('tabindex') !== '-1');
}

/**
 * Tab and Escape when focus is NOT inside the dialog. The listener above sits
 * on the overlay, so it hears nothing once focus has fallen to `<body>` - which
 * is what happens when the focused button disables itself (ConfirmDialog while
 * busy). After a failed request Escape then did nothing and Tab walked into the
 * page behind. Only the topmost open dialog answers.
 */
function onDocumentKeydown(e: KeyboardEvent) {
  if (e.defaultPrevented || (e.key !== 'Tab' && e.key !== 'Escape')) return;
  if (overlay.value?.contains(document.activeElement)) return;
  const open = document.querySelectorAll('.ws-modal-overlay:not([aria-hidden="true"])');
  if (open[open.length - 1] !== overlay.value) return;
  if (e.key === 'Escape') {
    if (!props.dismissible || props.mandatory) return;
    emit('close');
    return;
  }
  e.preventDefault();
  const focusable = focusables();
  (focusable.length ? focusable[e.shiftKey ? focusable.length - 1 : 0] : panel.value)?.focus();
}

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

  const focusable = focusables();
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

/**
 * A button that disables itself while its request runs - Save, Record
 * payment, Reset password, every form's submit - drops keyboard focus to
 * <body> the moment it is disabled (audit 2026-10-09: measured in Chrome, a
 * `blur` with no related target). After a refused save the dialog was still
 * open but focus was outside it: the next Tab started over from the top of
 * the page's order, and a screen reader was left on nothing. Focus is parked
 * on the dialog itself, which is named by its title, and handed back to the
 * same button when it is enabled again, so Enter tries again from where the
 * keyboard was.
 */
let parkedFor: MutationObserver | null = null;
function onFocusOut(e: FocusEvent) {
  const lost = e.target as HTMLElement | null;
  if (e.relatedTarget || !lost || !(lost as HTMLButtonElement).disabled || !panel.value) return;
  const host = panel.value;
  queueMicrotask(() => {
    if (!host.isConnected || (document.activeElement && document.activeElement !== document.body)) return;
    host.focus({ preventScroll: true });
    parkedFor?.disconnect();
    parkedFor = new MutationObserver(() => {
      if ((lost as HTMLButtonElement).disabled) return;
      parkedFor?.disconnect();
      parkedFor = null;
      if (document.activeElement === host && lost.isConnected) lost.focus({ preventScroll: true });
    });
    parkedFor.observe(lost, { attributes: true, attributeFilter: ['disabled'] });
  });
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
  registerDialog(dialogId);
  document.addEventListener('keydown', onDocumentKeydown);
  enterMotion();
  await nextTick();
  /**
   * Focus goes to the dialog itself, which is named by its heading, not to its
   * first field. The first field was chosen by a selector for `input`, and that
   * did three things wrong (B-61): on a phone it pulled the keyboard up over a
   * dialog nobody had started typing in; in the unit editor it matched the
   * `sr-only` file input, so focus sat on something nobody could see; and it
   * skipped any PillSelect above the first input, which is a `<button>`. From
   * the panel, the first Tab reaches the first control in order, whatever it is.
   * `preventScroll`: focusing a panel taller than the screen scrolled the
   * overlay about 40px, pushing the title and the X off the top.
   */
  panel.value?.focus({ preventScroll: true });
  if (!props.decision) {
    window.addEventListener('resize', onResize);
  }
});

/**
 * The opening: the backdrop fades in and the panel rises 12px and grows from
 * 0.96 as it fades, 240ms (Sean, 2026-10-01: "when clicking actions the modals
 * just pop up").
 *
 * It was `@starting-style` in index.css, and in Chrome it did run - but on
 * `--ease-out`, a quint, the panel was 93% of the way there 89ms in, from a
 * 0.97 start: two frames of a 3% change, which reads as no animation at all.
 * Older iPhones never ran it (`@starting-style` arrived in Safari 17.5). Web
 * Animations from here run everywhere, and start in the first frame the
 * dialog is drawn because this runs before that frame.
 *
 * No `fill`: once finished the panel goes back to no transform at all. A
 * transform left in place would make it the containing block for the
 * "Record this payment?" confirmation OnsitePaymentModal opens INSIDE it - see
 * the note on `.ws-modal-panel` in index.css. Reduced motion keeps the fades
 * and drops the movement, the same bargain as the close below.
 */
const ENTER = { duration: 240, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' };
/**
 * A sheet rises into place rather than growing from its centre: a sheet that
 * scales pulls its own bottom edge off the screen for the length of the
 * animation. Every dialog but a decision is a sheet at every width now
 * (Sean, 20 Oct 2026; it was below 640px only, Loyd, 2026-10-03).
 */
const isSheet = () => !props.decision;
const offscreen = () => (isSheet() ? 'translateY(32px)' : 'translateY(12px) scale(0.96)');
function enterMotion(): void {
  const el = overlay.value;
  if (!el || typeof el.animate !== 'function') return;
  try {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.animate([{ opacity: 0 }, { opacity: 1 }], ENTER);
    panel.value?.animate(
      reduce
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: offscreen() },
            { opacity: 1, transform: 'none' },
          ],
      ENTER
    );
  } catch {
    // Decoration: a dialog that cannot animate still opens.
  }
}

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
 * The snapshot has its CSS transitions switched off so nothing on it animates
 * but the closing below. It keeps typed text and the scroll position so the
 * frame does not change as it fades, and its ids are stripped so nothing can
 * find it by id. Under reduced motion it fades without the scale, the same
 * bargain the opening makes.
 *
 * 160ms, the opening run backwards and quicker (Sean, 2026-10-01: "close with
 * a quick reverse"): it sinks the same 12px and shrinks to the same 0.96.
 */
function leaveGhost(): void {
  const el = overlay.value;
  if (!el || typeof el.animate !== 'function') return;
  // A sheet that slid itself out is already off the screen; a snapshot would pop it back.
  if (leaving.value) return;
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
    // The fields scroll inside the panel now, not the overlay.
    const liveBody = el.querySelector<HTMLElement>('.ws-modal-body');
    const ghostBody = ghost.querySelector<HTMLElement>('.ws-modal-body');
    if (liveBody && ghostBody) ghostBody.scrollTop = liveBody.scrollTop;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timing = { duration: 160, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'forwards' as const };
    ghost.animate([{ opacity: 1 }, { opacity: 0 }], timing);
    if (ghostPanel && !reduce) {
      ghostPanel.animate([{ transform: ghostPanel.style.transform || 'none' }, { transform: offscreen() }], timing);
    }
    // A timer, not `finished`: a hidden tab can pause the animation and the
    // copy must never outlive it.
    window.setTimeout(() => ghost.remove(), 200);
  } catch {
    // A snapshot is decoration; failing to make one changes nothing.
  }
}

onBeforeUnmount(() => {
  unmounted = true;
  leaveGhost();
  clearTimeout(closeTimer);
  clearTimeout(restoreTimer);
  window.removeEventListener('resize', onResize);
  parkedFor?.disconnect();
  unregisterDialog(dialogId);
  document.removeEventListener('keydown', onDocumentKeydown);
  // Only the last holder to let go releases the page behind it.
  unlockBodyScroll();
  // The opener can be gone by now (a row re-rendered after a save); land on
  // the page content rather than `<body>`, which restarts Tab at the skip link.
  if (previouslyFocused?.isConnected) previouslyFocused.focus();
  else document.getElementById('main')?.focus({ preventScroll: true });
});
</script>

<template>
  <!--
    The layout (Loyd, 2026-10-03: "it looks too long"). Below 640px the dialog
    is a sheet along the bottom edge, full width, up to the screen's height
    less a strip of the page behind it. From 640px it is a centred card. Either
    way it is three rows: the title and X stay at the top, the buttons stay at
    the bottom, and only the fields between them scroll. It used to be one
    block the height of its content, so on a phone the title scrolled away and
    Save was a long scroll down, under fields that read as a page of their own.
    `index.css`, `.ws-modal-body`, keeps a form's own button row on the bottom
    edge too, for the forms whose buttons have to sit inside the <form>.
  -->
  <!--
    A decision is a card in the middle of the screen; every other dialog is a sheet on the bottom
    edge at every width, at half or full height (see "The sheet" in the script, 20 Oct 2026).
  -->
  <div
    ref="overlay"
    :class="[
      'ws-modal-overlay ws-focus fixed inset-0 z-50 flex justify-center overscroll-contain bg-scrim',
      // A sheet has a fixed height, so the overlay never scrolls; and a sheet dragged down by a
      // transform must not lengthen it into a scrollbar.
      decision ? 'items-center overflow-y-auto p-4 sm:p-6' : 'items-end overflow-hidden',
    ]"
    :style="overlayStyle"
    @pointerdown="onOverlayPointerDown"
    @click="onOverlayClick"
    @keydown="onKeydown"
    @focusout="onFocusOut"
    @focusin="onFocusIn"
  >
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="subtitle ? subtitleId : undefined"
      tabindex="-1"
      :class="[
        'ws-modal-panel flex w-full flex-col overflow-hidden bg-tile text-ink shadow-lift outline-none',
        decision ? 'my-auto max-h-[calc(100dvh-2rem)] rounded-tile sm:max-h-[calc(100dvh-3rem)]' : 'rounded-t-[1.75rem]',
        widths[props.size],
      ]"
      :style="panelStyle"
    >
      <!--
        The sheet's grip: the handle and the title row drag it between half and full, and down to
        close (touch-action none so the drag is not read as a scroll). The handle is a button too.
      -->
      <div
        :class="['flex-none', !decision && 'touch-none select-none']"
        @pointerdown="onDragStart"
        @pointermove="onDragMove"
        @pointerup="onDragEnd"
        @pointercancel="onDragEnd"
      >
      <button
        v-if="!decision"
        type="button"
        class="ws-sheet-handle flex w-full cursor-grab justify-center pt-2.5 pb-1 active:cursor-grabbing"
        :aria-label="snap === 'full' ? 'Make this sheet half the screen' : 'Make this sheet full screen'"
        @click="toggleSnap"
      >
        <span class="block h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
      </button>
      <header :class="['flex flex-none items-start justify-between gap-4 border-b border-line pl-5 pr-3 sm:pl-6 sm:pr-4', decision ? 'py-3 sm:py-4' : 'pt-1 pb-3 sm:pb-4']">
        <!-- The text takes the room the X leaves and wraps inside it (7.4, 4 Nov 2026): a long subtitle
             breaks onto the next line before the X rather than running up to it or under it. -->
        <div class="min-w-0 flex-1 py-1 pr-2 sm:pr-4">
          <h2 :id="titleId" :class="['break-words text-lg font-semibold leading-snug tracking-tight', tone === 'danger' && 'text-overdue']">
            {{ title }}
          </h2>
          <p v-if="subtitle" :id="subtitleId" class="mt-0.5 break-words text-sm text-ink-soft">{{ subtitle }}</p>
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
          class="icon-btn -mt-1.5 shrink-0"
          aria-label="Close this dialog"
          :disabled="closeDisabled"
          @click="emit('close')"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </header>
      </div>

      <!--
        The dialog's own message line (audit 2026-10-09): a refused save, a
        problem with what was typed, a confirmation. Under the title rather
        than over it, outside the scrolling fields so it is on screen wherever
        the form was scrolled to. The live region is here from the moment the
        dialog opens, so a screen reader announces what arrives in it (the
        reason ToastContainer keeps one region for the stack, B-61); the stack
        does not draw these, so they are not read twice.
      -->
      <div role="status" aria-live="polite" class="flex-none">
        <div
          v-for="m in messages"
          :key="m.id"
          :class="['ws-reveal flex items-start gap-3 border-b border-line py-3 pl-5 pr-3 sm:pl-6 sm:pr-4', messageTone[m.type].box]"
        >
          <component :is="messageTone[m.type].is" :class="['mt-0.5 size-5 shrink-0', messageTone[m.type].icon]" aria-hidden="true" />
          <div class="min-w-0 flex-1 py-0.5">
            <p class="break-words text-sm font-semibold leading-snug text-ink">{{ m.title }}</p>
            <p v-if="m.message" class="mt-0.5 break-words text-sm leading-6 text-ink-soft">{{ m.message }}</p>
          </div>
        </div>
      </div>

      <!--
        `min-w-0` (Sean, 2026-10-01: "the modal has HORIZONTAL scrolling -
        really bad"). A field that will not shrink - a native date control at
        the phone's 16px is the one that did - pushed the body wider than the
        panel. The fields themselves are fixed to shrink; this is the floor.
        It scrolls on the vertical axis only, and a PillSelect's menu opening
        near the bottom lengthens the scroll rather than being cut off.
      -->
      <div ref="body" class="ws-modal-body flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-contain p-5 sm:gap-5 sm:p-6">
        <slot />
      </div>

      <!-- `.ws-actions` (index.css): equal halves on a phone, right-aligned
           from 640px, one height. Sean, 2026-10-01. -->
      <footer
        v-if="$slots.actions"
        class="ws-actions ws-modal-foot flex-none border-t border-line px-5 pt-3 sm:p-6"
      >
        <slot name="actions" />
      </footer>
    </div>
  </div>
</template>
