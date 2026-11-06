import { computed, ref } from 'vue';

/**
 * Add to home screen (Sean, 6 Nov 2026), from the account menu.
 *
 * What a page is allowed to do differs by browser, and this does only that:
 * - Chrome, Edge and Samsung Internet (Android, Windows, macOS, ChromeOS) fire `beforeinstallprompt`
 *   once the app qualifies (manifest in vite.config.ts, the service worker). It is held here, and the
 *   menu's button opens the browser's own install prompt with it.
 * - Safari on iPhone and iPad, and every iOS browser, has no prompt a page can open: Apple only lets a
 *   person add it themselves, from Share then Add to Home Screen. The button there opens the two steps.
 * - Already opened from the home screen (`display-mode: standalone`), or a browser with neither path
 *   (Firefox on a computer): no button.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const held = ref<InstallPromptEvent | null>(null);
const installed = ref(false);

function runningInstalled(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone, iPad (which reports itself as a Mac with touch), iPod. */
export const isAppleMobile =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** Phones and tablets say "home screen"; a computer "installs" an app. */
export const installLabel =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    ? 'Add to home screen'
    : 'Install app';

/** Called once from main.ts, before the browser can fire the event. */
export function listenForInstall(): void {
  installed.value = runningInstalled();
  window.addEventListener('beforeinstallprompt', (e) => {
    // Stops the browser's own mini-bar on Android, so the menu's button is the one way in.
    e.preventDefault();
    held.value = e as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    installed.value = true;
    held.value = null;
  });
}

/** Whether the menu shows the button at all. */
export const canOfferInstall = computed(
  () => !installed.value && (held.value !== null || isAppleMobile)
);

/**
 * Opens the browser's prompt where there is one. Returns 'steps' where the person has to do it
 * themselves (iOS), so the caller shows the two steps.
 */
export async function offerInstall(): Promise<'prompted' | 'steps'> {
  const ev = held.value;
  if (!ev) return 'steps';
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  // A prompt can be used once; a dismissed one comes back when the browser fires the event again.
  held.value = null;
  if (outcome === 'accepted') installed.value = true;
  return 'prompted';
}
