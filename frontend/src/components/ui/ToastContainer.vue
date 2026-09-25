<script setup lang="ts">
/**
 * Toasts on the workspace system. One dark surface for every kind, because the
 * words carry the meaning; the icon and its colour only repeat it. They are
 * announced politely, so a screen reader hears them without losing its place.
 *
 * ONE live region, the container, which is mounted with the app and so exists
 * before any toast is added to it. Each toast used to be its own
 * `role="status"`, created in the same instant as its text, and a live region
 * that appears already holding its content is one screen readers commonly do
 * not announce at all (B-61). Errors share the polite region: the design gives
 * them no separate place, and splitting the stack in two to get an assertive
 * one would reorder what sighted readers see.
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
    aria-label="Messages"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="on-dark pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-night p-4 text-on-night shadow-lift"
      >
        <span class="mt-0.5 shrink-0" aria-hidden="true">
          <CheckCircle2 v-if="toast.type === 'success'" :class="['size-5', iconTone.success]" />
          <AlertTriangle v-else-if="toast.type === 'warning'" :class="['size-5', iconTone.warning]" />
          <AlertCircle v-else-if="toast.type === 'error'" :class="['size-5', iconTone.error]" />
          <Info v-else :class="['size-5', iconTone.info]" />
        </span>

        <div class="min-w-0 flex-1">
          <p class="break-words text-sm font-semibold leading-snug">{{ toast.title }}</p>
          <p class="mt-0.5 break-words text-sm leading-6 text-on-night-soft">{{ toast.message }}</p>
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
/*
 * `<TransitionGroup name="toast">` looks for a `.toast-move` class to animate
 * the SURVIVING toasts sliding into the gap a dismissed or expired one leaves
 * behind - Vue does not add this transition automatically, only enter/leave.
 * Without it, a stack of three toasts loses its middle one and the bottom
 * toast jumps to its new position in a single frame; with it, the jump is a
 * short, interruptible slide, the same `--ease-out` every other move in this
 * file already answers to.
 */
.toast-move {
  transition: transform 0.2s var(--ease-out);
}

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

/*
 * Reduced motion removes the MOVEMENT, not the fade. This was `transition:
 * none`, so under the setting a toast blinked in and out (B-61); the opacity
 * change is not motion and stays, as `index.css`'s own reduced-motion rule for
 * `.ws-focus` already keeps it.
 */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.2s var(--ease-out);
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
  .toast-move {
    transition: none;
  }
}
</style>
