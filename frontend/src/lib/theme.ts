/**
 * The colour theme: System (the default), Light or Dark (Sean, 2026-10-01:
 * "a complete working dark mode").
 *
 * public/boot.js applies the stored choice before the first paint; this
 * module takes over once the app is running. It owns three things:
 *
 *   - the choice, in localStorage under `hivelet.theme`, shared by every
 *     account on this browser (it is a property of the screen, not the person);
 *   - `data-theme` on <html>, which is all src/index.css reads. 'system' is
 *     resolved here, so the CSS only ever sees 'light' or 'dark' and never has
 *     to second-guess the OS with its own media query;
 *   - `<meta name="theme-color">`, so the phone's status bar and the installed
 *     app's title bar match the page.
 *
 * While the choice is 'system' it follows the OS live: switching the phone to
 * dark at sunset turns the open page dark without a reload.
 */
import { computed, ref } from 'vue';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'hivelet.theme';

/** `--brand` in light, `--canvas` in dark. The same pair is in public/boot.js. */
const THEME_COLOR: Record<Theme, string> = { light: '#17603f', dark: '#0f1412' };

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage blocked: follow the system.
  }
  return 'system';
}

const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export const themeChoice = ref<ThemeChoice>(readChoice());
const systemDark = ref(media?.matches ?? false);

export const resolvedTheme = computed<Theme>(() =>
  themeChoice.value === 'system' ? (systemDark.value ? 'dark' : 'light') : themeChoice.value,
);

/**
 * Swapping every token at once is instant for everything that does not
 * transition, and a 150ms fade for everything that does (`.press`, the pills,
 * `transition-colors` on hundreds of links) - so the page changed in two
 * steps, the controls trailing the surfaces they sit on. One frame with
 * transitions off makes it a single, clean swap.
 */
function suspendTransitions(): () => void {
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.appendChild(style);
  return () => {
    // Read a style to flush the swap before transitions come back on.
    void getComputedStyle(document.body).backgroundColor;
    requestAnimationFrame(() => style.remove());
  };
}

function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') === theme && root.style.colorScheme === theme) return;
  const restore = animate ? suspendTransitions() : null;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  restore?.();
}

export function setThemeChoice(choice: ThemeChoice) {
  themeChoice.value = choice;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage blocked: the choice still holds for this visit.
  }
  apply(resolvedTheme.value, true);
}

let installed = false;

/** Called once from main.ts. Safe to call again. */
export function installTheme() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  apply(resolvedTheme.value, false);

  media?.addEventListener('change', (e) => {
    systemDark.value = e.matches;
    if (themeChoice.value === 'system') apply(resolvedTheme.value, true);
  });

  // Another tab changed it: follow, so two open tabs never disagree.
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== THEME_STORAGE_KEY) return;
    themeChoice.value = readChoice();
    apply(resolvedTheme.value, true);
  });
}
