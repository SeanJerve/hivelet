/**
 * @file lib/pullToRefresh.ts
 * @description Pull down from the top of the page to reload, in the INSTALLED
 * app only.
 *
 * THE REQUEST (Sean, 2026-10-01): "on the part that it's added to home screen
 * you can't refresh there, you can't just scroll up and then refresh, so add
 * that feature: pull down to refresh the web app."
 *
 * A home-screen app runs in `display: standalone` (vite.config.ts): no address
 * bar, no reload button, and neither Chrome nor Safari gives it the pull-down
 * reload a browser tab has. lib/staleVersion.ts already reloads a page that
 * outlived a deploy on its next navigation; this is the hand-operated version
 * of the same thing, for data that looks out of date or a screen that stuck.
 *
 * WHY ONLY STANDALONE: in a browser tab the browser's own pull-to-refresh is
 * already there, and a second one drawn by the page would fight it - two
 * spinners, and the browser reloading underneath ours.
 *
 * WHY A FULL RELOAD and not a refetch: "refresh" to the person asking means
 * what the reload button does, and a full load also picks up a new version
 * waiting in the service worker. There is no per-page refetch to call anyway;
 * lib/live.ts keeps signed-in pages current on its own schedule.
 *
 * WHEN A PULL MAY START (all of these, checked on `touchstart`):
 *   - one finger;
 *   - the page is at the very top (`window.scrollY === 0`) - `html` is the
 *     scroller here, see index.css, so `window.scrollY` is the one to read;
 *   - no dialog is open: a `[role=dialog]` (WsModal, the navigation drawer, the
 *     notification panel) or an open native `<dialog>`, and the page is not
 *     scroll-locked by lib/scrollLock.ts - a modal over the top of the page
 *     must scroll its own content, not reload what is behind it;
 *   - the finger did not land inside something that is itself scrolled
 *     (a modal's overlay, a `.ws-table-wrap` scrolled sideways, a list inside
 *     a popover): dragging down there means "scroll this back", not "reload".
 * Then the first ~10px of movement decides: straight-ish down is a pull,
 * anything sideways or upward is left to the browser untouched, so a
 * horizontal table swipe never turns into a reload.
 *
 * LISTENERS: `touchstart` and `touchend` are passive. `touchmove` cannot be:
 * it is the one place the browser's own overscroll (iOS rubber-banding, the
 * Android glow) has to be stopped while the indicator follows the finger, and
 * only a non-passive listener may call `preventDefault`. It returns at once
 * unless a pull is in progress, and it is attached only in standalone mode.
 */
import { onMounted, onUnmounted, ref } from 'vue';

/** Indicator travel per pixel of finger travel: the pull feels weighted. */
export const PULL_RESISTANCE = 0.5;
/** The indicator stops here however far the finger goes. */
export const PULL_MAX = 80;
/** Indicator travel at which letting go reloads (128px of finger travel). */
export const PULL_THRESHOLD = 64;
/** Finger travel before the gesture's direction is decided. */
const DECIDE_AFTER = 10;

/** Is this page running as the installed, home-screen app? */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  // `navigator.standalone` is Safari's own flag for a home-screen web app;
  // older iOS versions do not report the display-mode media query.
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** A dialog is open somewhere on the page. */
function dialogOpen(): boolean {
  if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog[open]')) return true;
  // lib/scrollLock.ts holds the page while any overlay is up.
  return document.body.style.overflow === 'hidden';
}

/**
 * The touch landed inside an element that is scrolled away from its start,
 * vertically or sideways, or inside a modal's overlay at all.
 */
function startsInScrolledElement(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  if (el?.closest('.ws-modal-overlay')) return true;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollTop > 0 || el.scrollLeft > 0) return true;
    el = el.parentElement;
  }
  return false;
}

export function usePullToRefresh() {
  /** How far the indicator has travelled, in px (0 to PULL_MAX). */
  const distance = ref(0);
  /** A finger is down and pulling: the indicator tracks it with no easing. */
  const dragging = ref(false);
  /** Let go past the threshold: the reload is on its way. */
  const refreshing = ref(false);

  // Per-gesture state; not reactive, nothing draws from it directly.
  let candidate = false; // touchstart passed every check
  let pulling = false; // direction decided: this is a pull
  let startX = 0;
  let startY = 0;
  let previousOverscroll = '';
  let attached = false;

  function reset() {
    candidate = false;
    pulling = false;
    dragging.value = false;
    distance.value = 0;
  }

  function onTouchStart(event: TouchEvent) {
    if (refreshing.value) return;
    candidate = false;
    pulling = false;
    if (event.touches.length !== 1) return;
    if (window.scrollY > 0) return;
    if (dialogOpen()) return;
    if (startsInScrolledElement(event.target)) return;
    const touch = event.touches[0]!;
    startX = touch.clientX;
    startY = touch.clientY;
    candidate = true;
  }

  function onTouchMove(event: TouchEvent) {
    if (!candidate) return;
    if (event.touches.length !== 1) {
      reset();
      return;
    }
    const touch = event.touches[0]!;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!pulling) {
      if (Math.abs(dx) < DECIDE_AFTER && Math.abs(dy) < DECIDE_AFTER) return;
      // Sideways or upward: an ordinary scroll or swipe. Let it go and stop
      // watching this touch.
      // `cancelable` false means the browser has already started scrolling
      // and will not hand the gesture over.
      if (dy <= 0 || Math.abs(dx) > dy || !event.cancelable || window.scrollY > 0) {
        candidate = false;
        return;
      }
      pulling = true;
      dragging.value = true;
    }

    if (dy <= 0) {
      // Pushed back up past where it started: the pull is off, and the page
      // is the browser's again from the next touch.
      reset();
      return;
    }
    if (event.cancelable) event.preventDefault();
    distance.value = Math.min(PULL_MAX, dy * PULL_RESISTANCE);
  }

  function onTouchEnd(event: TouchEvent) {
    if (!pulling) {
      candidate = false;
      return;
    }
    const release = event.type === 'touchend' && distance.value >= PULL_THRESHOLD;
    candidate = false;
    pulling = false;
    dragging.value = false;
    if (!release) {
      // Below the threshold (or the touch was cancelled): spring back.
      distance.value = 0;
      return;
    }
    refreshing.value = true;
    distance.value = PULL_THRESHOLD;
    // Two frames so the spinner and the "Refreshing" status are on screen
    // before the page goes, rather than the reload looking like a flicker.
    requestAnimationFrame(() => requestAnimationFrame(() => window.location.reload()));
  }

  onMounted(() => {
    if (!isStandaloneDisplay()) return;
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    // `html` is the scroll container (index.css), and overscroll-behavior on
    // the root element is what governs the viewport; on `body` it would do
    // nothing here. `contain` stops iOS from handing a pull at the top to its
    // own rubber-band bounce, which otherwise drags the page down under the
    // indicator.
    const root = document.documentElement;
    previousOverscroll = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = 'contain';
    attached = true;
  });

  onUnmounted(() => {
    if (!attached) return;
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);
    document.documentElement.style.overscrollBehaviorY = previousOverscroll;
    attached = false;
  });

  return { distance, dragging, refreshing };
}
