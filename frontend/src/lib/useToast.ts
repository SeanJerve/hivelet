import { ref } from 'vue';
import { playSound } from './sounds';

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
}

const toasts = ref<ToastItem[]>([]);

export function useToast() {
  function showToast(type: 'success' | 'warning' | 'error' | 'info', title: string, message: string, duration = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item: ToastItem = { id, type, title, message, duration };
    toasts.value.push(item);
    // A saved action sounds "done", a failed one sounds different (lib/sounds.ts).
    if (type === 'success') playSound('success');
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
