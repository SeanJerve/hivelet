import { watch, type Ref } from 'vue';

/**
 * Every list keeps its filters while the tab is open (technical evaluators, flagged again by Sean,
 * 6 Oct 2026: "when I change the year filter to something else all the other filters are not
 * saved"). The year already followed her from page to page (lib/yearScope.ts); the cluster, month,
 * kind, standing, "Show as", grouping and order went back to their defaults the moment she left
 * the page. Now each screen hands its own refs here: they are read back when the screen opens and
 * written on every change, so leaving Monthly Income for the Overview and coming back finds it
 * exactly as she left it.
 *
 * The screen still owns the refs, as with the toolbar (components/ui/ListToolbar.vue), so every
 * computed, export and arrival link that reads them is unchanged. A link that names a month or a
 * year (IncomeCollectionsView's applyArrivalQuery, run on mount) still wins, as it runs after this.
 *
 * Session storage, like the year: gone when the tab closes, and cleared on sign-out
 * (`forgetSavedFilters`, called from authStore's clearSession) so the next person on a shared
 * phone starts from the defaults. Filter choices only: never a search, a name or a record.
 */
const PREFIX = 'hivelet.filters.';

type Saved = string | number;

function read(screen: string): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(PREFIX + screen);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Restores `refs` from this tab's last visit to `screen`, then saves them on every change. Call it
 * in setup once the refs exist. A saved value is taken only when it is the same type as the ref's
 * default, so an old or hand-edited entry cannot put a number where a string belongs; one that
 * `allowed` refuses (a year no longer listed, say) is ignored and the default stays.
 */
export function rememberFilters<T extends Record<string, Ref<Saved>>>(
  screen: string,
  refs: T,
  allowed: Partial<Record<keyof T, (value: Saved) => boolean>> = {}
): void {
  const saved = read(screen);
  for (const [key, r] of Object.entries(refs)) {
    const value = saved[key];
    if (typeof value !== typeof r.value || (typeof value !== 'string' && typeof value !== 'number')) continue;
    if (allowed[key as keyof T] && !allowed[key as keyof T]!(value)) continue;
    r.value = value;
  }
  watch(Object.values(refs), () => {
    try {
      sessionStorage.setItem(PREFIX + screen, JSON.stringify(Object.fromEntries(Object.entries(refs).map(([k, r]) => [k, r.value]))));
    } catch {
      // Storage disabled: the filters still work, they are just not remembered.
    }
  });
}

/** Signing out: the next person starts from every list's defaults. */
export function forgetSavedFilters(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // Storage disabled: nothing was saved.
  }
}
