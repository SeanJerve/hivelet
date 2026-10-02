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
 * When the loader is drawn (Sean, 2026-10-02 evening - the rule as he set it):
 *
 *   - the first visit in this browser (no `hivelet.seen`);
 *   - opening after being away (`hivelet.lastActive`, kept by main.ts while the
 *     app is on screen, more than AWAY_MS ago) - the installed app's cold start
 *     included;
 *   - a reload of a page with no skeletons of its own: the public pages and the
 *     sign-in page. With nothing to draw in the shape of the page, the hexagon
 *     in the middle is the loading sign.
 *
 * Otherwise - a reload of a signed-in screen (/admin, /tenant) during a visit -
 * it is skipped and the screen's skeletons are the loading sign; in the
 * installed app that is the pull-to-refresh's hexagon and the skeletons.
 *
 * The loader is the page's own background (light, or dark under the dark
 * theme) with the turning hexagon. The dark green field the landing page used
 * to show on a reload (`boot-hero`) is gone: it read as a broken page.
 * Storage that throws counts as a first visit: the loader shows.
 */
(function () {
  var AWAY_MS = 30 * 60 * 1000;
  try {
    var seen = localStorage.getItem('hivelet.seen') === '1';
    var last = Number(localStorage.getItem('hivelet.lastActive') || 0);
    var away = !last || Date.now() - last > AWAY_MS;
    var path = location.pathname;
    var hasSkeletons = /^\/(admin|tenant)(\/|$)/.test(path);
    if (seen && !away && hasSkeletons) {
      document.documentElement.classList.add('no-splash');
    }
  } catch (e) {
    // Storage blocked: leave the loader on.
  }
})();
