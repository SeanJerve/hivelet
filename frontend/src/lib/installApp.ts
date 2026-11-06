import { computed, ref } from 'vue';

/**
 * Add to home screen (Sean, 6 Nov 2026), from the account menu.
 *
 * What a page is allowed to do differs by browser, and this does only that:
 * - Chrome, Edge and Samsung Internet (Android, Windows, macOS, ChromeOS) fire `beforeinstallprompt`
 *   once the app qualifies (manifest in vite.config.ts, the service worker). It is held here, and the
 *   menu's button opens the browser's own install prompt with it.
 * - Every browser on an iPhone or iPad (Safari, Chrome, Edge, Firefox) has no prompt a page can open:
 *   Apple only lets a person add it themselves. The button there opens the steps for the browser in
 *   use (Sean, 7 Nov 2026: Chrome on his iPhone was shown Safari's), and general steps for any other.
 * - An Android browser that has not offered the prompt (Firefox, or Chrome before it is ready) gets
 *   its menu's steps the same way.
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

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isAndroid = /Android/i.test(ua);

/**
 * The steps for the browser in use, on a phone or tablet with no prompt to open. Read from the user
 * agent: Chrome on iOS says CriOS, Edge EdgiOS, Firefox FxiOS; Safari says none of them.
 */
export function installSteps(): string[] {
  if (isAppleMobile) {
    if (/CriOS/.test(ua)) return ['Tap the Share button in the address bar, at the top right.', 'Choose Add to Home Screen, then Add.'];
    if (/EdgiOS/.test(ua)) return ['Tap the menu (three dots) at the bottom, then Share.', 'Choose Add to Home Screen, then Add.'];
    if (/FxiOS/.test(ua)) return ['Tap the menu (three lines), then Share.', 'Choose Add to Home Screen, then Add.'];
    if (/Safari/.test(ua) && !/(OPiOS|YaBrowser|DuckDuckGo|GSA)/.test(ua)) {
      return ['Tap the Share button, at the bottom of the screen (at the top on an iPad).', 'Choose Add to Home Screen, then Add.'];
    }
  } else if (isAndroid) {
    if (/Firefox/.test(ua)) return ['Tap the menu (three dots).', 'Choose Install, or Add to Home screen.'];
    return ['Tap your browser\'s menu (three dots).', 'Choose Install app, or Add to Home screen.'];
  }
  return ['Open your browser\'s Share button or menu.', 'Choose Add to Home Screen (some browsers say Install).'];
}

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
  () => !installed.value && (held.value !== null || isAppleMobile || isAndroid)
);

/**
 * Opens the browser's prompt where there is one. Returns 'steps' where the person has to do it
 * themselves (any iPhone or iPad browser, an Android browser with no prompt), so the caller shows
 * `installSteps()`.
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
