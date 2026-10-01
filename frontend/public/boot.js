/*
 * Runs before the first paint and decides whether index.html's loader is
 * drawn at all (Sean, 2026-10-01: "the main spinner should show only the
 * first time you visit or load the dashboard; on refresh, skeleton only").
 *
 * A separate file because vercel.json's CSP (`script-src 'self'`) blocks an
 * inline one; synchronous in <head>, before the loader's markup, because by
 * the time any module script runs the loader has already painted. It blocks
 * parsing, so it stays this small: no imports, at most three storage reads.
 *
 * The loader is skipped only when BOTH hold:
 *   - this browser has rendered Hivelet before (`hivelet.seen`, set by
 *     main.ts after the first page renders), so the route code is already in
 *     the service worker's precache and arrives at once; and
 *   - the page draws its own loading skeleton: the admin and tenant screens
 *     (with a sign-in token present - without one the router sends the
 *     person to the sign-in page, which has none) and the category pages
 *     (SkeletonDetail). The landing page's hero has no skeleton, and neither
 *     do the enquiry, sign-in, legal and not-found pages, so they keep it.
 * Storage that throws (private mode, blocked site data) counts as a first
 * visit: the loader shows, which is the safe side.
 */
(function () {
  try {
    var p = location.pathname, k = 'hivelet.auth.token';
    var signedIn = /^\/(admin|tenant)(\/|$)/.test(p) && !!(localStorage.getItem(k) || sessionStorage.getItem(k));
    if (localStorage.getItem('hivelet.seen') === '1' && (signedIn || /^\/category\//.test(p))) {
      document.documentElement.classList.add('no-splash');
    }
  } catch (e) {
    // Storage blocked: leave the loader on.
  }
})();
