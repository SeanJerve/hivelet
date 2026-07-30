/**
 * @file useToast.ts
 * @description Composable for managing stateful, floating toast notifications across Hivelet.
 * @systemBibleRef Section 22 - Core Design Principle (Clear state transition for every action)
 * @rationale Provides a single reactive store for subtle, non-disruptive, yet highly visible action feedback
 *             (Success, Warning, Error, Info) tailored for the non-techy administrator.
 * @innovations Built auto-dismiss timer queue with support for warning badges and manual dismissal.
 */
import { ref } from 'vue';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

const toasts = ref<ToastMessage[]>([]);

export function useToast() {
  const showToast = (
    title: string, 
    message: string, 
    type: 'success' | 'warning' | 'error' | 'info' = 'success', 
    duration: number = 4000
  ) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const newToast: ToastMessage = { id, type, title, message, duration };
    toasts.value.push(newToast);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  };

  const dismissToast = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  };

  return {
    toasts,
    showToast,
    dismissToast
  };
}
