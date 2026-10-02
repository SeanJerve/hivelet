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
import { refreshNow } from './live';

/** The shortest spin after a release, so a fast refresh still reads as one. */
const MIN_SPIN_MS = 700;

/*
 * THE FEEL (Sean, 2026-10-01: "make it smooth like Facebook and Instagram -
 * when you pull it doesn't get stuck, it just keeps going down as you pull").
 * The indicator used to follow at half the finger's speed and then stop dead
 * at 80px, so the rest of a long pull did nothing visible. It now follows a
 * rubber band: almost 1:1 at first, then giving less and less ground the
 * further it goes, approaching PULL_MAX without ever reaching it, so it is
 * still moving under the finger at any distance a thumb can travel.
 *
 *   distance = PULL_MAX * (1 - e^(-dy * PULL_RESISTANCE / PULL_MAX))
 *
 * Finger travel -> indicator travel: 50 -> 27, 139 -> 64 (the threshold),
 * 150 -> 68, 300 -> 105, 500 -> 130.
 */
/** Indicator travel per pixel of finger travel at the start of a pull. */
export const PULL_RESISTANCE = 0.6;
/** What the rubber band approaches; never actually reached. */
export const PULL_MAX = 150;
/** Indicator travel at which letting go reloads (about 139px of finger travel). */
export const PULL_THRESHOLD = 64;
/** Where the indicator settles and spins once released past the threshold. */
export const PULL_REST = 56;
/**
 * The icon turns with the pull: one full turn by the threshold, where the
 * arrow becomes the refresh icon, which keeps turning at the same rate (Sean,
 * 2026-10-01: "the refresh icon really spins in proportion to how far you
 * pull"). Half a turn was tried first and read as a slow drift, not a spin.
 * About 5.6 degrees per pixel of indicator travel.
 */
export const PULL_ROTATE_PER_PX = 360 / PULL_THRESHOLD;
/** The settle after letting go (PullToRefresh.vue's transition), in ms. */
export const PULL_SETTLE_MS = 300;
/** Finger travel before the gesture's direction is decided. */
const DECIDE_AFTER = 10;

/** Finger travel (px, downward) to indicator travel, with resistance. */
export function rubberBand(dy: number): number {
  if (dy <= 0) return 0;
  return PULL_MAX * (1 - Math.exp((-dy * PULL_RESISTANCE) / PULL_MAX));
}

/**
 * A light tick as the pull crosses the threshold, where the phone supports it
 * (Android; iOS Safari has no Vibration API). Chrome refuses `vibrate` until
 * the page has had a tap and logs a warning when asked before then, so it is
 * not asked.
 */
function hapticTick() {
  try {
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) return;
    navigator.vibrate?.(10);
  } catch {
    // No vibration is fine; the icon change says the same thing.
  }
}

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
  /** How far the indicator has travelled, in px (0 up to, never at, PULL_MAX). */
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
  let latest = 0; // indicator travel for the most recent touchmove
  let frame = 0; // pending requestAnimationFrame, 0 if none
  let wasArmed = false; // past the threshold as of the last drawn frame
  let previousOverscroll = '';
  let attached = false;

  /*
   * touchmove can fire more than once per frame (120Hz touch sampling on a
   * 60Hz screen). Each one only records where the finger is; the indicator is
   * redrawn at most once per frame, with the newest value, so Vue re-renders
   * it at the screen's rate and not the digitiser's.
   */
  function draw() {
    frame = 0;
    distance.value = latest;
    const armed = latest >= PULL_THRESHOLD;
    if (armed && !wasArmed) hapticTick();
    wasArmed = armed;
  }

  function cancelFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function reset() {
    cancelFrame();
    candidate = false;
    pulling = false;
    wasArmed = false;
    latest = 0;
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
      wasArmed = false;
      dragging.value = true;
    }

    if (dy <= 0) {
      // Pushed back up past where it started: the pull is off, and the page
      // is the browser's again from the next touch.
      reset();
      return;
    }
    // Synchronous, unlike the redraw: preventDefault only counts inside the
    // event's own dispatch.
    if (event.cancelable) event.preventDefault();
    latest = rubberBand(dy);
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function onTouchEnd(event: TouchEvent) {
    if (!pulling) {
      candidate = false;
      return;
    }
    // `latest`, not `distance`: the last move may not have been drawn yet.
    const release = event.type === 'touchend' && latest >= PULL_THRESHOLD;
    cancelFrame();
    candidate = false;
    pulling = false;
    wasArmed = false;
    latest = 0;
    dragging.value = false;
    if (!release) {
      // Below the threshold (or the touch was cancelled): spring back.
      distance.value = 0;
      return;
    }
    refreshing.value = true;
    distance.value = PULL_REST;
    /*
     * Refresh in place, the way Instagram and Facebook do (Sean, 2026-10-02: "spin continuously
     * until the page is loaded instead of showing a [full-screen] spinner"). A full reload throws
     * the page - and this indicator with it - away, so nothing could keep spinning across it.
     * Instead every figure on screen is fetched again (lib/live.ts `refreshNow`, the same refetch a
     * live update runs) while the hexagon spins at its resting place; when the answers are in, it
     * springs back. At least a short spin, so a fast answer still reads as "refreshed". A signed-out
     * public page has nothing to refetch and falls back to a plain reload. A cap, so a stalled
     * network never leaves it spinning for ever.
     */
    const started = Date.now();
    const finish = () => {
      refreshing.value = false;
      distance.value = 0;
    };
    const cap = window.setTimeout(finish, 15_000);
    void refreshNow()
      .then((refreshed) => {
        if (!refreshed) {
          // Signed out: a plain reload, after the hexagon has visibly started turning.
          window.setTimeout(() => window.location.reload(), PULL_SETTLE_MS);
          return;
        }
        window.setTimeout(() => {
          window.clearTimeout(cap);
          finish();
        }, Math.max(0, MIN_SPIN_MS - (Date.now() - started)));
      })
      .catch(() => {
        window.clearTimeout(cap);
        finish();
      });
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
    cancelFrame();
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
