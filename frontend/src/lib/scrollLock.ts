/**
 * @file lib/scrollLock.ts
 * @description One reference-counted lock on the page behind an overlay.
 *
 * WHY THIS IS SHARED, AND NOT A LINE IN EACH COMPONENT
 * ----------------------------------------------------------------------------
 * `WsModal` used to own a private counter for this, and its own docblock records
 * why it needed one at all: `OnsitePaymentModal` opens a second modal on top of
 * itself, each instance was setting and clearing `document.body.style.overflow`
 * independently, and closing the inner one unlocked the page behind the outer
 * one that was still open.
 *
 * The mobile navigation drawer then turned out to have no lock whatsoever - the
 * page behind it scrolled while it was open, found on an emulated handset on
 * 2026-09-23. Giving the drawer its own copy of the counter would have
 * reproduced the original bug one level up: two counters that cannot see each
 * other, so whichever closed last would win and the other would be left holding
 * a lock nobody released.
 *
 * So there is one counter, here, and every overlay takes a turn on it. The page
 * unlocks when the LAST holder lets go, not when any one of them does.
 *
 * The previous value is restored rather than cleared to `''`, so a stylesheet or
 * another script that had its own reason to set `overflow` gets it back.
 */

let holders = 0;
let previousOverflow = '';

/** Take a turn on the lock. Every call must be paired with `unlockBodyScroll`. */
export function lockBodyScroll(): void {
  if (holders === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  holders += 1;
}

/**
 * Give the turn back. The page only scrolls again once every holder has.
 *
 * Clamped at zero: an unmatched release must not push the count negative, or
 * the next genuine lock would start from -1 and never take effect.
 */
export function unlockBodyScroll(): void {
  holders = Math.max(0, holders - 1);
  if (holders === 0) {
    document.body.style.overflow = previousOverflow;
  }
}
