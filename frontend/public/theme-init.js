/*
 * The colour theme, applied before the first paint (Sean, 2026-10-01: dark mode).
 *
 * Loaded synchronously from <head> in index.html, so `data-theme` is on <html>
 * before the body - the loader included - is drawn. Applied any later (from
 * main.ts, after the bundle has downloaded) a dark-mode reader would see the
 * light page first and then watch it go dark: the flash this file exists to
 * prevent. It is a separate file rather than an inline <script> because
 * vercel.json's Content-Security-Policy is `script-src 'self'`, which blocks
 * inline scripts.
 *
 * The choice is 'system' (the default), 'light' or 'dark', stored under
 * `hivelet.theme`. src/lib/theme.ts owns it after this: the settings control,
 * following the OS live while the choice is 'system', and the same three writes
 * below. Keep the two in step - the colours in THEME_COLOR are `--brand` (light)
 * and `--canvas` (dark) in src/index.css.
 *
 * Wrapped in try/catch: storage can throw (a private window, blocked site
 * data), and a failure here must leave the page light and working rather
 * than stop the script before it reaches anything else.
 */
(function () {
  var THEME_COLOR = { light: '#17603f', dark: '#0f1412' };
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
    if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  } catch (e) {
    // Leave the page in its default light theme.
  }
})();
