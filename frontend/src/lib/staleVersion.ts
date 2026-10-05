/**
 * @file lib/staleVersion.ts
 * @description An open page that outlived a deploy loads the new version on its
 * next navigation, instead of silently going dead.
 *
 * THE BUG (Sean, 2026-10-01, on the installed app): "I did go to Monthly
 * Income, try to add a monthly income and then close it; after closing, all
 * the other buttons are not working, even the sidebar."
 *
 * Every page is its own JS chunk, loaded on first visit, named by content hash.
 * Each deploy replaces those files on the server, and the service worker
 * (`skipWaiting` + `clientsClaim`, vite.config.ts) takes over an open page the
 * moment a new version installs and clears the old precache. The page in front
 * of her still holds the OLD index and asks for OLD chunk names, which no longer
 * exist anywhere. The import rejects, Vue Router's navigation fails without a
 * word, and every link and menu item looks dead. An installed app is the worst
 * case: it is never reloaded, and there is no address bar to reload it from.
 * Twenty deploys went out on 1 October.
 *
 * TWO REMEDIES, both ending in an ordinary full load of where she was going:
 *   - a chunk that fails to load (`vite:preloadError`, or a router navigation
 *     error with the browsers' own wording for it): load the target address;
 *   - a new service worker taking control (`controllerchange`) marks the page
 *     stale, and the NEXT navigation is done as a full load instead of in-page,
 *     so it never reaches for a missing file in the first place. Not an
 *     immediate reload: that could throw away a form she is typing in.
 *
 * A loop guard: at most one forced load per address per 30 seconds, so a chunk
 * that is genuinely missing shows the error rather than reloading forever.
 */
import type { Router } from 'vue-router';

const GUARD_KEY = 'hivelet.staleReload';
let stale = false;

const CHUNK_FAILURE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk \d+ failed/i;

function loadFresh(path: string): boolean {
  try {
    const last = JSON.parse(sessionStorage.getItem(GUARD_KEY) || 'null') as { path: string; at: number } | null;
    if (last && last.path === path && Date.now() - last.at < 30_000) return false;
    sessionStorage.setItem(GUARD_KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // Storage blocked: still worth one reload.
  }
  window.location.assign(path);
  return true;
}

export function installStaleVersionRecovery(router: Router): void {
  // A chunk Vite tried to preload is gone.
  window.addEventListener('vite:preloadError', (event) => {
    if (loadFresh(window.location.pathname + window.location.search + window.location.hash)) event.preventDefault();
  });

  // A navigation whose page chunk is gone: load the address she was going to.
  router.onError((error, to) => {
    if (CHUNK_FAILURE.test(String((error as Error)?.message ?? error))) loadFresh(to.fullPath);
  });

  // A new version took over this page: the next navigation is a full load.
  if ('serviceWorker' in navigator) {
    let hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // The first install on a first visit is not an update.
      if (hadController) stale = true;
      hadController = true;
    });

    /**
     * ASK FOR A NEW VERSION, rather than wait for the browser to (5 Oct 2026).
     * Checked on the live site: after a deploy, a reload still drew the old
     * version from the worker's cache, because the browser had not yet looked
     * for a new worker; it came only after asking. An installed app is rarely
     * reloaded at all. So the page asks when it comes back into view and every
     * 15 minutes while it is open. A new version then takes over as above, and
     * the next navigation loads it. Offline, the check fails quietly.
     */
    const checkForUpdate = () => {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {});
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') checkForUpdate();
    }, 15 * 60 * 1000);
  }
  router.beforeEach((to, from) => {
    if (stale && from.matched.length > 0 && to.fullPath !== from.fullPath) {
      stale = false;
      if (loadFresh(to.fullPath)) return false;
    }
    return true;
  });
}
