<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, useId } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

export interface SelectOption {
  value: string | number;
  label: string;
  count?: number | string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    options: ReadonlyArray<
      | SelectOption
      | string
      | number
      | { key: string | number; label: string; count?: number | string }
      | { val: string | number; label: string; count?: number | string }
      | { value: any; label: string; count?: number | string }
    >;
    id?: string;
    ariaLabel?: string;
    placeholder?: string;
    align?: 'left' | 'right';
    widthClass?: string;
    disabled?: boolean;
  }>(),
  {
    ariaLabel: 'Select an option',
    placeholder: '',
    align: 'left',
    widthClass: 'w-52',
    disabled: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
  (e: 'change', value: string | number): void;
}>();

const normalizedOptions = computed<SelectOption[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    const item = opt as Record<string, any>;
    const val = item.value ?? item.key ?? item.val ?? item.label;
    return {
      value: val as string | number,
      label: String(item.label ?? item.value ?? item.key ?? item.val),
      count: item.count !== undefined ? item.count : undefined,
    };
  });
});

const selectedIndex = computed(() =>
  normalizedOptions.value.findIndex((opt) => String(opt.value) === String(props.modelValue))
);

const selectedOption = computed(() => {
  return selectedIndex.value === -1 ? undefined : normalizedOptions.value[selectedIndex.value];
});

const selectedLabel = computed(() => {
  if (!selectedOption.value) {
    if (props.placeholder) return props.placeholder;
    return String(props.modelValue ?? '');
  }
  return selectedOption.value.label;
});

const selectedCount = computed(() => {
  return selectedOption.value?.count;
});

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const listRef = ref<HTMLElement | null>(null);

/**
 * Which option the keyboard is pointing at. -1 while the popover is closed.
 *
 * DOM focus never leaves the trigger. This control told assistive technology it
 * was a listbox - `role="listbox"`, `role="option"`, `aria-haspopup` - and then
 * implemented none of the interaction that promises: no arrows, no Home/End, no
 * type-ahead, and nothing at all naming which option was current. A reader was
 * handed a listbox and found a dead end.
 *
 * Of the two ways out, this is the `aria-activedescendant` one rather than
 * roving `tabindex`, and the deciding factor is Tab. With roving focus the
 * focused element is an option INSIDE a popover that unmounts, so Tab has to be
 * intercepted and focus put somewhere by hand or it falls to `<body>`. Keeping
 * focus on the trigger means Tab is just Tab: close the popover and the
 * browser's own sequential navigation carries on from a control that is still
 * there. The options are `tabindex="-1"` so they are never in that sequence.
 *
 * Both models are legitimate; mixing them is not. Nothing below moves focus
 * into the list.
 */
const activeIndex = ref(-1);

const uid = useId();
const listboxId = `${uid}-listbox`;
function optionId(index: number) {
  return `${uid}-option-${index}`;
}
const activeOptionId = computed(() =>
  isOpen.value && activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined
);

/** Type-ahead buffer. Cleared after a pause, the same as a native <select>. */
let typeahead = '';
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

function clampIndex(index: number) {
  const last = normalizedOptions.value.length - 1;
  if (last < 0) return -1;
  return Math.min(Math.max(index, 0), last);
}

function open(index: number) {
  if (props.disabled) return;
  isOpen.value = true;
  activeIndex.value = clampIndex(index);
}

function close() {
  isOpen.value = false;
  activeIndex.value = -1;
  typeahead = '';
  if (typeaheadTimer) clearTimeout(typeaheadTimer);
}

function toggle() {
  if (props.disabled) return;
  if (isOpen.value) close();
  else open(selectedIndex.value >= 0 ? selectedIndex.value : 0);
}

function selectOption(val: string | number) {
  emit('update:modelValue', val);
  emit('change', val);
  close();
  /**
   * A mouse click lands focus on the option button, and that button is about to
   * be unmounted - focus would fall to `<body>` and a keyboard reader who had
   * walked this far would restart from the top of the page. `:focus-visible`
   * does not match after a pointer interaction, so the ring is not forced on a
   * mouse user by putting focus back.
   */
  triggerRef.value?.focus();
}

function runTypeahead(char: string) {
  const options = normalizedOptions.value;
  if (options.length === 0) return;

  if (typeaheadTimer) clearTimeout(typeaheadTimer);
  typeahead += char.toLowerCase();
  typeaheadTimer = setTimeout(() => {
    typeahead = '';
  }, 600);

  // One letter pressed repeatedly cycles the options starting with it.
  const repeated = typeahead.length > 1 && [...typeahead].every((c) => c === typeahead[0]);
  const needle = repeated ? typeahead[0] : typeahead;
  const from = activeIndex.value >= 0 ? activeIndex.value : selectedIndex.value;
  const startAt = typeahead.length === 1 || repeated ? Math.max(from, -1) + 1 : Math.max(from, 0);

  for (let step = 0; step < options.length; step++) {
    const i = (startAt + step) % options.length;
    if (options[i].label.toLowerCase().startsWith(needle)) {
      if (isOpen.value) activeIndex.value = i;
      else open(i);
      return;
    }
  }
}

function onDocumentPointerDown(e: PointerEvent) {
  if (isOpen.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    close();
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (props.disabled) return;
  const key = e.key;
  const last = normalizedOptions.value.length - 1;

  if (key === 'Escape') {
    /**
     * Only swallow Escape when there is a popover to close. PillSelect sits
     * inside `WsModal` on two screens, and an unconditional `close()` that let
     * the event carry on closed the dialog as well as the menu - one keystroke,
     * two dismissals, and the half-filled form behind it gone. When this
     * control has nothing open, Escape is the dialog's.
     */
    if (!isOpen.value) return;
    e.preventDefault();
    e.stopPropagation();
    close();
    triggerRef.value?.focus();
    return;
  }

  if (key === 'Tab') {
    // Focus is already on the trigger; get the popover out of the way and let
    // the browser move on from there.
    if (isOpen.value) close();
    return;
  }

  if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
    e.preventDefault(); // these scroll the page otherwise
    if (!isOpen.value) {
      if (key === 'ArrowUp') open(selectedIndex.value >= 0 ? selectedIndex.value : last);
      else if (key === 'End') open(last);
      else if (key === 'Home') open(0);
      else open(selectedIndex.value >= 0 ? selectedIndex.value : 0);
      return;
    }
    if (key === 'ArrowDown') activeIndex.value = clampIndex(activeIndex.value + 1);
    else if (key === 'ArrowUp') activeIndex.value = clampIndex(activeIndex.value - 1);
    else if (key === 'Home') activeIndex.value = clampIndex(0);
    else activeIndex.value = clampIndex(last);
    return;
  }

  if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
    // A space that continues a type-ahead is a space, not a choice.
    if (key !== 'Enter' && typeahead) {
      e.preventDefault();
      runTypeahead(' ');
      return;
    }
    // Also cancels the click the trigger would otherwise fire, which would
    // toggle the popover a second time and undo what we just did.
    e.preventDefault();
    if (!isOpen.value) {
      open(selectedIndex.value >= 0 ? selectedIndex.value : 0);
      return;
    }
    const opt = normalizedOptions.value[activeIndex.value];
    if (opt) selectOption(opt.value);
    else close();
    return;
  }

  if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    runTypeahead(key);
  }
}

/**
 * Keep the active option on screen. The list scrolls at `max-h-64`, so on a
 * register filter with twenty entries the arrow keys otherwise move a
 * highlight nobody can see.
 */
watch(activeIndex, async (index) => {
  if (index < 0 || !isOpen.value) return;
  await nextTick();
  const el = listRef.value?.querySelectorAll<HTMLElement>('[role="option"]')[index];
  el?.scrollIntoView({ block: 'nearest' });
});

// A disabled control cannot be reached to close its own popover.
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled && isOpen.value) close();
  }
);

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown);
  if (typeaheadTimer) clearTimeout(typeaheadTimer);
});
</script>

<template>
  <div
    ref="rootRef"
    class="relative text-left"
    :class="[widthClass || 'w-52', widthClass === 'w-full' ? 'block' : 'inline-block']"
    @keydown="onKeyDown"
  >
    <!--
      Trigger Button.

      IT NO LONGER CARRIES `focus:outline-none focus:ring-2 focus:ring-brand/20`,
      and that is the fix rather than a tidy-up. `focus:outline-none` compiles
      into Tailwind's `utilities` layer, which is ordered AFTER the `components`
      layer that holds `.ws-focus :focus-visible` - so on every screen in the
      application this control cancelled the workspace's own 3px focus ring and
      replaced it with a 2px ring at 20% brand over a white tile. That blend is
      about rgb(209,223,217): roughly 1.3:1 against the tile it sits on, where
      WCAG 2.4.11 asks for 3:1. In practice the most-reused filter control in
      the workspace showed a keyboard reader almost nothing.

      Read out of the running app's compiled stylesheet rather than reasoned
      about - the layer each rule landed in is what settles this, and it is not
      visible in the source.

      The `isOpen` ring below is a different signal (this menu is open, for a
      pointer user too) and stays.
    -->
    <button
      :id="id"
      ref="triggerRef"
      type="button"
      role="combobox"
      class="press inline-flex w-full min-h-[2.75rem] h-11 items-center justify-between gap-2 rounded-full border border-line bg-tile px-3.5 py-2 text-sm font-medium text-ink shadow-xs hover:border-brand/40 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-faint cursor-pointer select-none"
      :class="{
        'border-brand ring-2 ring-brand/10': isOpen,
      }"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :aria-activedescendant="activeOptionId"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <div class="flex items-center gap-2 shrink-0">
        <span
          v-if="selectedCount !== undefined"
          class="rounded-full bg-brand-soft text-brand px-2 py-0.5 text-xs tabular font-semibold"
        >
          {{ selectedCount }}
        </span>
        <ChevronDown
          :class="[
            'size-4 text-ink-soft transition-transform duration-200 ease-[var(--ease-out)] shrink-0',
            isOpen && 'rotate-180 text-brand',
          ]"
          aria-hidden="true"
        />
      </div>
    </button>

    <!--
      Floating Popover Menu.

      Was Tailwind's bare `ease-out`/`ease-in` keywords - the weak built-in
      curves this file's own motion system exists to replace everywhere else.
      `ease-in` on the leave was the sharper problem: it starts slow, which is
      wrong on an exit nobody is watching closely, and it is the one curve
      emil-design-eng's framework names outright as never right for UI. Both
      directions now use the same `--ease-out` token every other popover,
      dialog and reveal in this file already uses, so a PillSelect opening
      feels like the same product as everything around it, not a component
      that arrived from somewhere else.

      220ms/160ms rather than 150ms/100ms - asked for directly, still inside
      emil-design-eng's 150-250ms dropdown range, just at the slow end of it
      rather than the fast end, so this and every other dropdown in the app
      (every PillSelect instance) reads as a deliberate motion rather than a
      snap.

      `origin-top-left`/`origin-top-right` (matching `align`, the same edge
      the `left-0`/`right-0` below already pins to the trigger) - every other
      trigger-anchored menu in this file's neighbourhood (the year picker
      here, NotificationPopover, AppHeader's profile menu) already scales
      from that corner rather than its own centre; this was the one dropdown
      left on the default centre origin despite being the most-reused one.
    -->
    <Transition
      enter-active-class="transition duration-[220ms] ease-[var(--ease-out)]"
      enter-from-class="transform scale-95 opacity-0 -translate-y-1"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-[160ms] ease-[var(--ease-out)]"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        :id="listboxId"
        ref="listRef"
        role="listbox"
        :aria-label="ariaLabel"
        class="absolute top-full z-50 mt-1.5 w-full rounded-2xl border border-line bg-tile p-1.5 shadow-lift overflow-hidden"
        :class="align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'"
      >
        <div class="max-h-64 overflow-y-auto space-y-0.5">
          <!--
            Three states that must not collapse into each other: SELECTED (the
            filter currently in force), HOVERED (where the mouse happens to be),
            and ACTIVE (where the keyboard is, the one `aria-activedescendant`
            names). The ring is the active marker and nothing else uses it, so
            active-on-selected and active-on-anything-else both read, and a
            hover never counterfeits the keyboard position.

            `tabindex="-1"` keeps these out of the tab sequence - focus stays on
            the trigger, which is what makes `aria-activedescendant` the thing
            that speaks.
          -->
          <button
            v-for="(opt, index) in normalizedOptions"
            :key="opt.value"
            :id="optionId(index)"
            type="button"
            role="option"
            tabindex="-1"
            :aria-selected="String(opt.value) === String(modelValue)"
            class="press flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm cursor-pointer select-none"
            :class="[
              String(opt.value) === String(modelValue)
                ? 'bg-brand-soft text-brand font-semibold'
                : index === activeIndex
                  ? 'bg-brand-soft/40 text-brand'
                  : 'text-ink hover:bg-brand-soft/40 hover:text-brand',
              index === activeIndex && 'ring-2 ring-brand',
            ]"
            @click="selectOption(opt.value)"
          >
            <span class="truncate">{{ opt.label }}</span>
            <span
              v-if="opt.count !== undefined"
              class="rounded-full px-2 py-0.5 text-xs tabular font-medium shrink-0"
              :class="[
                String(opt.value) === String(modelValue)
                  ? 'bg-brand/15 text-brand font-semibold'
                  : 'bg-canvas text-ink-soft',
              ]"
            >
              {{ opt.count }}
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
