<script setup lang="ts">
/**
 * Toasts on the workspace system. One dark surface for every kind, because the
 * words carry the meaning; the icon and its colour only repeat it. They are
 * announced politely, so a screen reader hears them without losing its place.
 */
import { useToast } from '../../lib/useToast';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-vue-next';

const { toasts, dismissToast } = useToast();

const iconTone: Record<string, string> = {
  success: 'text-brand-bright',
  warning: 'text-verify-soft',
  error: 'text-overdue-soft',
  info: 'text-on-night-soft',
};
</script>

<template>
  <div
    class="ws-focus pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:max-w-sm"
    role="region"
    aria-label="Notifications"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="status"
        aria-live="polite"
        class="on-dark pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-night p-4 text-on-night shadow-lift"
      >
        <span class="mt-0.5 shrink-0" aria-hidden="true">
          <CheckCircle2 v-if="toast.type === 'success'" :class="['size-5', iconTone.success]" />
          <AlertTriangle v-else-if="toast.type === 'warning'" :class="['size-5', iconTone.warning]" />
          <AlertCircle v-else-if="toast.type === 'error'" :class="['size-5', iconTone.error]" />
          <Info v-else :class="['size-5', iconTone.info]" />
        </span>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold leading-snug">{{ toast.title }}</p>
          <p class="mt-0.5 text-sm leading-6 text-on-night-soft">{{ toast.message }}</p>
        </div>

        <button
          type="button"
          class="icon-btn icon-btn-on-dark size-9 shrink-0"
          aria-label="Dismiss this message"
          @click="dismissToast(toast.id)"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  /*
   * `var(--ease-out)`, not the plain `ease` this used to read. Both a toast
   * arriving and a toast leaving are answering something that just happened -
   * a save, a dismiss - so both count as "entering or exiting" in the
   * framework this system uses everywhere else, and that case is `ease-out`
   * either way. Plain `ease` is the one curve the rest of the workspace
   * deliberately does not use.
   */
  transition: opacity 0.2s var(--ease-out), transform 0.2s var(--ease-out);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>
