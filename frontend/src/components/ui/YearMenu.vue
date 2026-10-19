<script setup lang="ts">
/**
 * The year menu: a bold green word with a chevron, opening a short list (Sean, 2026-10-01: "not a
 * button - a clickable word, like 'Ledger' and 'To verify' on Monthly Income").
 *
 * Taken out of the Overview (19 Oct 2026) so the Overview and both ledgers use one control, in the
 * place each page had its "Admin" line. Behavior kept from the Overview's own: a real disclosure
 * (keyboard and touch, not hover), Escape and an outside tap close it, focus returns to the word,
 * and the menu hangs from whichever edge keeps it on screen, measured on open (a 375px phone ran a
 * left-hung menu 12px off the right edge). `ws-pop` is the transition PillSelect shares.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { Check, ChevronDown } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: string;
  /** In order; `label` is what the list shows ("2026, this year", "All years"). */
  options: { value: string; label: string }[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const button = ref<HTMLButtonElement | null>(null);
const menuId = `year-menu-${useId()}`;
const alignEnd = ref(false);

// The word shows the year itself; "All years" for All.
const shown = computed(() => (props.modelValue === 'All' ? 'All years' : props.modelValue));

watch(
  open,
  (isOpen) => {
    if (!isOpen) return;
    const b = button.value?.getBoundingClientRect();
    const menu = document.getElementById(menuId);
    if (!b || !menu) return;
    alignEnd.value = b.left + menu.offsetWidth > document.documentElement.clientWidth - 8;
  },
  { flush: 'post' }
);

function close(returnFocus = false) {
  open.value = false;
  if (returnFocus) nextTick(() => button.value?.focus());
}

function choose(value: string) {
  close(true);
  if (value !== props.modelValue) emit('update:modelValue', value);
}

function onPointerDown(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close();
}
onMounted(() => document.addEventListener('pointerdown', onPointerDown));
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown));
</script>

<template>
  <!-- `-my-1` keeps the py-1 hit area from pushing the heading down; the `before:` box widens the
       target for a finger without moving anything. The menu is `w-max` so "2026, this year" does
       not wrap inside an anchor only as wide as the word. -->
  <div ref="root" class="relative -my-1 shrink-0" @keydown.escape="close(true)">
    <button
      ref="button"
      type="button"
      class="press relative inline-flex items-center gap-1 py-1 text-sm font-bold text-brand cursor-pointer whitespace-nowrap before:absolute before:-inset-x-2 before:-inset-y-2"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-controls="menuId"
      @click="open = !open"
    >
      <span class="tabular">{{ shown }}</span>
      <span class="sr-only">, change the year shown</span>
      <ChevronDown
        :class="['size-4 transition-transform duration-200 ease-[var(--ease-out)]', open && 'rotate-180']"
        aria-hidden="true"
      />
    </button>
    <Transition name="ws-pop">
      <div
        v-if="open"
        :id="menuId"
        :class="[
          'absolute top-full z-30 mt-2 w-max min-w-40 rounded-2xl bg-tile p-1.5 shadow-lift border border-line',
          alignEnd ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
        ]"
      >
        <button
          v-for="o in options"
          :key="o.value"
          type="button"
          :aria-current="o.value === modelValue ? 'true' : undefined"
          class="press flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm tabular text-ink hover:bg-canvas cursor-pointer"
          @click="choose(o.value)"
        >
          <span>{{ o.label }}</span>
          <Check v-if="o.value === modelValue" class="size-4 text-brand" aria-hidden="true" />
        </button>
      </div>
    </Transition>
  </div>
</template>
