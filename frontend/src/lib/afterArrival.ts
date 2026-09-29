import { nextTick } from 'vue';

/**
 * Waits until a page has arrived before one of its dialogs opens on top of it.
 *
 * "Record payment" on the Overview goes to Monthly Income and opens its dialog;
 * so do "Record expense", a notification that names a record, and the tenant's
 * Pay button. All of them used to open the dialog on the very frame the page
 * mounted, so it appeared over a blank or half-drawn page and the page's own
 * crossfade and list reveal were never seen (asked for 2026-09-29: load the
 * section and its animations first, then bring the dialog in).
 *
 * Resolves once the page's data has loaded AND the page has had time to show
 * itself: at least ARRIVE_MS after the call (App.vue's page crossfade is 200 ms,
 * the row reveals run just after), and a further SETTLE_MS once the data is in,
 * so rows that only just arrived are not covered mid-reveal. The dialog's own
 * enter transition does the rest. With reduced motion there is nothing to wait
 * for but the data.
 *
 * Call it when the page mounts, passing the page's load promise.
 */
const ARRIVE_MS = 450;
const SETTLE_MS = 150;

export async function afterArrival(ready?: Promise<unknown>): Promise<void> {
  const start = performance.now();
  await nextTick();
  await (ready ?? Promise.resolve()).catch(() => undefined);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const wait = Math.max(SETTLE_MS, ARRIVE_MS - (performance.now() - start));
  await new Promise((resolve) => setTimeout(resolve, wait));
}
