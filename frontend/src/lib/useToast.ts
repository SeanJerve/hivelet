import { ref } from 'vue';
import { playSound } from './sounds';

/**
 * `sound` overrides the default: a success toast pings, anything else is
 * silent except an error (Sean, 2026-10-01). `false` for a success that is not
 * an action (signed in, back online, a download); `true` for an action whose
 * toast is not green (moved out).
 */
export interface ToastOptions {
  sound?: boolean;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
  /**
   * The dialog that was on top when this was raised (audit 2026-10-09). It is
   * shown INSIDE that dialog, under its title, instead of in the stack at the
   * top of the screen - see `heldBy` below.
   */
  dialogId?: string;
  /** When it was raised, so a dialog closing can tell a read message from a new one. */
  at: number;
}

const toasts = ref<ToastItem[]>([]);

/**
 * The WsModal instances open now, the last one on top (audit 2026-10-09).
 *
 * WHY A MESSAGE RAISED UNDER A DIALOG IS SHOWN IN IT
 * --------------------------------------------------------------------------
 * The stack sits at the top of the screen, above every dialog (z-60). On a
 * phone a long dialog is a sheet whose header starts 24px from the top, so a
 * refused save's toast (Not saved / Could not save) landed squarely on the
 * dialog's title and X - measured at 375px on Edit tenant, Edit unit and
 * Manage this repair. A tap on the toast dismissed it (audit 2026-10-01), but
 * the reason the save was refused was then gone after four seconds, while the
 * form it was about was still open in front of her. The design guideline puts
 * a refusal "in the toast otherwise"; inside an open dialog the toast is now
 * drawn by the dialog itself, where it covers nothing and stays readable.
 */
const openDialogs = ref<string[]>([]);

/** True while `id` is an open dialog, so the dialog (not the stack) shows it. */
export function heldBy(toast: ToastItem): boolean {
  return !!toast.dialogId && openDialogs.value.includes(toast.dialogId);
}

export function registerDialog(id: string): void {
  openDialogs.value = [...openDialogs.value, id];
}

/**
 * The dialog has gone. What it showed and has been on screen for a moment was
 * read there, and the dialog it described is closed, so it goes with it. One
 * raised in the same instant as the close (a save that succeeds and closes
 * its form) has not been seen yet, and moves to the stack for its usual time.
 */
export function unregisterDialog(id: string): void {
  openDialogs.value = openDialogs.value.filter((d) => d !== id);
  // A young one keeps the timer it was raised with; one held past its time is
  // always older than this, so it never moves to the stack.
  const now = Date.now();
  for (const t of toasts.value.filter((t) => t.dialogId === id)) {
    if (now - t.at > 1000) dismissToast(t.id);
  }
}

function dismissToast(id: string) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

export function useToast() {
  function showToast(
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string,
    duration = 4000,
    options: ToastOptions = {}
  ) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const dialogId = openDialogs.value[openDialogs.value.length - 1];
    // One message at a time inside a dialog: pressing Save twice after a refusal
    // must not pile two copies of the same refusal under its title.
    if (dialogId) toasts.value = toasts.value.filter((t) => t.dialogId !== dialogId);
    const item: ToastItem = { id, type, title, message, duration, dialogId, at: Date.now() };
    toasts.value.push(item);
    // The one place a saved action pings (lib/sounds.ts): every success toast
    // here is a completed save, once per action. lib/live.ts stays quiet for 4 s
    // after one's own write, so the same change does not ping twice.
    if (options.sound ?? type === 'success') playSound('notify');
    else if (type === 'error') playSound('problem');

    if (duration > 0) {
      setTimeout(() => {
        // A refusal shown inside an open dialog stays until it is dismissed, the
        // dialog closes, or the next message replaces it: the form it explains
        // is still in front of her, and four seconds is less than it takes to
        // read the reason and find the field.
        const t = toasts.value.find((x) => x.id === id);
        if (t && heldBy(t) && (t.type === 'error' || t.type === 'warning')) return;
        dismissToast(id);
      }, duration);
    }
    return id;
  }

  return { toasts, showToast, dismissToast };
}
