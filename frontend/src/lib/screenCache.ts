import { ref, type Ref } from 'vue';

/**
 * A screen that has loaded once does not show its skeleton again (the owner, 4 Nov 2026: "when
 * loading for the first time that page or section, only then the skeleton loading should appear,
 * not every change of page or going back to the page"). Every screen used to keep its data in
 * refs made in setup and flip a local loading flag on mount, so each visit remounted empty and
 * drew the skeleton again even though the same figures were fetched a minute earlier.
 *
 * Now a screen asks for its refs here by key. They live in this module, so they outlive the
 * screen: on a revisit the page renders what it held at once, fetches again exactly as before,
 * and replaces it. The skeleton is for a key that has never loaded (`screenLoaded`).
 *
 * A fetch that depends on a year, a tenant or a ticket puts it in the key ('tenant.history:' +
 * id), so one person's rows are never shown as another's. Most screens read the shared lists in
 * lib/systemState.ts and keep only the loaded flag here.
 *
 * Memory only, never storage, and emptied on sign-out and on every sign-in (`forgetScreenCache`,
 * called from authStore's clearSession and applySession) so the next person on a shared phone
 * starts from a skeleton, never from the last person's figures. A screen still mounted when it
 * runs keeps the refs it already holds; the next one to mount gets fresh ones.
 */
const kept = new Map<string, Ref<unknown>>();

/** The ref that holds `key`'s data between visits, created from `initial` the first time. */
export function screenRef<T>(key: string, initial: T): Ref<T> {
  let held = kept.get(key);
  if (!held) {
    held = ref(initial) as Ref<unknown>;
    kept.set(key, held);
  }
  return held as Ref<T>;
}

/**
 * False until `key` has loaded once this session. Set it to true when a fetch has come back
 * without failing, and show the skeleton only while it is false.
 */
export function screenLoaded(key: string): Ref<boolean> {
  return screenRef(`${key}#loaded`, false);
}

/** Signing out or in: nothing one person saw is kept for the next. */
export function forgetScreenCache(): void {
  kept.clear();
}
