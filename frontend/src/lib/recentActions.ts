/**
 * "Your recent actions", held once for the whole app (GET /auth/me/recent-actions).
 *
 * Since 6 Oct 2026 the list appears in up to three places at once: the desktop sidebar on every
 * page, the phone menu, and the phone's Overview (Sean: "you will also instantly see your
 * activity without compromising the original dashboard"). Each used to fetch for itself; one
 * store means one request, and every place shows the same three.
 *
 * The list belongs to the person signed in. A different person signing in on the same device
 * empties it before anything is shown, so nobody ever glimpses the previous person's actions.
 */
import { ref, watch } from 'vue';
import { api } from './api';
import { currentUser } from './authStore';

export interface RecentAction {
  id: string;
  at: string;
  text: string;
  link: string | null;
}

export const recentActions = ref<RecentAction[]>([]);
/** True until the first answer for the person signed in. */
export const recentActionsLoading = ref(true);
/** The first load failed and nothing is shown. A later quiet refresh that fails keeps the list. */
export const recentActionsFailed = ref(false);

let owner: string | null = null;
let inflight: Promise<void> | null = null;

function resetFor(profileId: string | null) {
  owner = profileId;
  recentActions.value = [];
  recentActionsLoading.value = true;
  recentActionsFailed.value = false;
  inflight = null;
}

watch(
  () => currentUser.value?.profileId ?? null,
  (id) => { if (id !== owner) resetFor(id); },
);

/**
 * Loads the list. `quiet` is a background refresh: it never shows a loading state and a failure
 * keeps what is on screen. Concurrent calls share one request.
 */
export function loadRecentActions(opts: { quiet?: boolean } = {}): Promise<void> {
  const me = currentUser.value?.profileId ?? null;
  if (!me) return Promise.resolve();
  if (me !== owner) resetFor(me);
  if (inflight) return inflight;
  if (!opts.quiet) recentActionsFailed.value = false;
  const asking = me;
  // On one line: screen-contract.mjs and check:endpoints find a caller by api.get( on one line.
  inflight = api.get<RecentAction[]>('/auth/me/recent-actions')
    .then((data) => {
      if (owner !== asking) return; // signed out or someone else signed in meanwhile
      recentActions.value = Array.isArray(data) ? data : [];
      recentActionsFailed.value = false;
    })
    .catch(() => {
      if (owner === asking && !opts.quiet && recentActions.value.length === 0) recentActionsFailed.value = true;
    })
    .finally(() => {
      if (owner === asking) recentActionsLoading.value = false;
      inflight = null;
    });
  return inflight;
}
