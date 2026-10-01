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
}

const toasts = ref<ToastItem[]>([]);

export function useToast() {
  function showToast(
    type: 'success' | 'warning' | 'error' | 'info',
    title: string,
    message: string,
    duration = 4000,
    options: ToastOptions = {}
  ) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item: ToastItem = { id, type, title, message, duration };
    toasts.value.push(item);
    // The one place a saved action pings (lib/sounds.ts): every success toast
    // here is a completed save, once per action. lib/live.ts stays quiet for 4 s
    // after one's own write, so the same change does not ping twice.
    if (options.sound ?? type === 'success') playSound('notify');
    else if (type === 'error') playSound('problem');

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
    return id;
  }

  function dismissToast(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }

  return { toasts, showToast, dismissToast };
}
