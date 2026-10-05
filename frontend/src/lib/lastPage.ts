/**
 * @file lib/lastPage.ts
 * @description The page each person had open last, so signing in again goes
 *   back to it.
 *
 * Technical evaluators, 3 Oct 2026: "when the session runs out, it would be
 * good if signing in again goes back to the last page viewed". A page that
 * needs a sign-in already sends you to /login with `?redirect=` and back
 * (router guard, main.ts). That does not cover signing in from the sign-in
 * page itself, after Sign out, an expiry noticed later, or the installed app
 * opened again: all of those landed on the role's home page.
 *
 * So every signed-in page records its path here, with the profile it belongs
 * to. Sign-in uses it only when there is no `?redirect=`, only for the same
 * profile (a shared phone does not hand one tenant another's last page), and
 * only within the same part of the app as the role (/admin or /tenant). A path
 * only, never anything on the page.
 */
const KEY = 'hivelet_last_page';

interface LastPage {
  profileId: string;
  path: string;
}

export function rememberLastPage(profileId: string, path: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ profileId, path } satisfies LastPage));
  } catch {
    /* storage blocked: sign-in goes to the home page, as before */
  }
}

/** The last page for this profile, if it belongs to `prefix` ('/admin' or '/tenant'). */
export function lastPageFor(profileId: string, prefix: string): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<LastPage>;
    if (saved.profileId !== profileId || typeof saved.path !== 'string') return null;
    if (!saved.path.startsWith(`${prefix}/`) && saved.path !== prefix) return null;
    if (!saved.path.startsWith('/') || saved.path.startsWith('//')) return null;
    return saved.path;
  } catch {
    return null;
  }
}
