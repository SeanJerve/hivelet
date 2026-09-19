<script setup lang="ts">
/**
 * The one dialog in the workspace system.
 *
 * Every dialog used to be hand-built: its own overlay, its own header, its own
 * close button, and none of them handled Escape, focus or the scroll behind
 * them. This one does, so a dialog is a dialog everywhere:
 *   - role="dialog" with aria-modal and a real accessible name
 *   - Escape closes it, and focus returns to whatever opened it
 *   - focus is kept inside while it is open
 *   - the page behind does not scroll
 *
 * It owns chrome only. What goes inside, and what the buttons do, stays with
 * the screen that opens it.
 */
import { ref, onMounted, onBeforeUnmount, nextTick, useId } from 'vue';
import { X } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    /** sm 28rem, md 36rem, lg 48rem, xl 64rem */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Clicking the backdrop closes it. Off for forms holding typed input. */
    dismissible?: boolean;
    tone?: 'plain' | 'danger';
  }>(),
  { size: 'md', dismissible: true, tone: 'plain' }
);

const emit = defineEmits<{ close: [] }>();

const titleId = useId();
const panel = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

const widths = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    emit('close');
    return;
  }
  if (e.key !== 'Tab' || !panel.value) return;

  const focusable = [...panel.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((el) => el.offsetParent !== null);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  document.body.style.overflow = 'hidden';
  await nextTick();
  const target =
    panel.value?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea, select') ??
    panel.value;
  target?.focus();
});

onBeforeUnmount(() => {
  document.body.style.overflow = '';
  previouslyFocused?.focus?.();
});
</script>

<template>
  <div
    class="ws-modal-overlay ws-focus fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-ink/40 p-4 sm:p-6"
    @click.self="dismissible && emit('close')"
    @keydown="onKeydown"
  >
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      :class="[
        'ws-modal-panel my-auto w-full rounded-tile bg-tile text-ink shadow-lift outline-none',
        widths[props.size],
      ]"
    >
      <header class="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
        <div class="min-w-0">
          <h2 :id="titleId" :class="['text-lg font-semibold tracking-tight', tone === 'danger' && 'text-overdue']">
            {{ title }}
          </h2>
          <p v-if="subtitle" class="mt-1 text-sm text-ink-soft">{{ subtitle }}</p>
        </div>
        <button type="button" class="icon-btn shrink-0" aria-label="Close this dialog" @click="emit('close')">
          <X class="size-4" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5 sm:p-6 flex flex-col gap-5">
        <slot />
      </div>

      <footer
        v-if="$slots.actions"
        class="flex flex-wrap items-center justify-end gap-2 border-t border-line p-5 sm:p-6"
      >
        <slot name="actions" />
      </footer>
    </div>
  </div>
</template>
