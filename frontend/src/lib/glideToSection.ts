/**
 * Arriving on a page at the section an arrow pointed to (Sean, 1 Nov 2026): the page first, then a
 * smooth scroll down to it, rather than leaving the reader at the top to find it.
 *
 * It waits rather than scrolling at once. The section may not exist yet, since a page draws
 * skeletons and then its data, and everything above it can change height as that lands. So it
 * waits for the page's crossfade (ARRIVE_MS, as lib/afterArrival.ts), then for the page to hold
 * still (STILL_MS), and gives up after MAX_WAIT_MS with the reader still at the top of the page.
 * Someone who starts scrolling, then or during the glide, has taken over, so it leaves them alone.
 *
 * The scroll is animated here, not by `scrollIntoView({ behavior: 'smooth' })`: that did not move
 * the page at all in the desktop app's browser (measured 1 Nov 2026, while the same call without
 * 'smooth' landed exactly), and a system set to fewer animations turns it off. This always ends on
 * the section. It honours the section's `scroll-margin-top`, as the browser's own scroll would.
 */
const ARRIVE_MS = 450;
const STILL_MS = 160;
const MAX_WAIT_MS = 3000;
const POLL_MS = 50;
const GLIDE_MS = 650;
/** A frame, or a moment later where frames are not being drawn, so the glide always finishes. */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    const late = setTimeout(resolve, 34);
    requestAnimationFrame(() => {
      clearTimeout(late);
      resolve();
    });
  });
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export async function glideToSection(hash: string): Promise<void> {
  const id = decodeURIComponent(hash.slice(1));
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  window.addEventListener('wheel', cancel, { passive: true, once: true });
  window.addEventListener('touchmove', cancel, { passive: true, once: true });

  const start = performance.now();
  let height = -1;
  let stillSince = start;
  let el: HTMLElement | null = null;
  while (!cancelled) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const now = performance.now();
    el = document.getElementById(id);
    const pageHeight = document.documentElement.scrollHeight;
    if (pageHeight !== height) {
      height = pageHeight;
      stillSince = now;
    }
    const ready = el && now - start >= ARRIVE_MS && now - stillSince >= STILL_MS;
    if (ready || now - start >= MAX_WAIT_MS) break;
  }

  if (el && !cancelled) {
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const from = window.scrollY;
    const room = document.documentElement.scrollHeight - window.innerHeight;
    const to = Math.min(room, Math.max(0, el.getBoundingClientRect().top + from - margin));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const began = performance.now();
    let t = reduce ? 1 : 0;
    while (t < 1 && !cancelled) {
      await nextFrame();
      t = Math.min(1, (performance.now() - began) / GLIDE_MS);
      window.scrollTo(0, from + (to - from) * easeInOut(t));
    }
    if (reduce) window.scrollTo(0, to);
  }
  window.removeEventListener('wheel', cancel);
  window.removeEventListener('touchmove', cancel);
}
