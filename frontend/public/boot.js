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
 * The loader is skipped whenever this browser has rendered Hivelet before
 * (`hivelet.seen`, set by main.ts after the first page renders; see below).
 * Storage that throws (private mode, blocked site data) counts as a first
 * visit: the loader shows, which is the safe side.
 */

/*
 * The colour theme first (Sean, 2026-10-01: dark mode), so `data-theme` is on
 * <html> before anything - the loader included - is drawn. Set any later (from
 * main.ts, once the bundle has arrived) a dark-mode reader would see the light
 * page and then watch it go dark. One more storage read.
 *
 * The choice is 'system' (the default), 'light' or 'dark' under
 * `hivelet.theme`; src/lib/theme.ts owns it once the app runs (the Appearance
 * control, following the OS live) and makes the same three writes. The two
 * colours are `--brand` (light) and `--canvas` (dark) in src/index.css, for
 * the phone's status bar. Its own try/catch, so a failure here leaves the page
 * light and still runs the loader decision below.
 */
(function () {
  try {
    var choice = null;
    try {
      choice = localStorage.getItem('hivelet.theme');
    } catch (e) {
      choice = null;
    }
    var dark =
      choice === 'dark' ||
      (choice !== 'light' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var theme = dark ? 'dark' : 'light';
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0f1412' : '#17603f');
  } catch (e) {
    // Leave the page in its default light theme.
  }
})();

/*
 * Only the first load in this browser draws it (Sean, 2026-10-02: "the
 * spinner still appears on some refreshes - only the first-time load"). The
 * 1 Oct version also kept it on every refresh of a page without its own
 * skeleton (the landing page, sign-in, enquiry), which is most of what a
 * visitor refreshes. After the first render the whole app is in the service
 * worker's precache, so a later load paints from the phone at once; the
 * signed-in screens show their skeletons while their figures arrive.
 */
(function () {
  try {
    if (localStorage.getItem('hivelet.seen') === '1') {
      document.documentElement.classList.add('no-splash');
    }
  } catch (e) {
    // Storage blocked: leave the loader on.
  }
})();
