<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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

const selectedOption = computed(() => {
  return normalizedOptions.value.find((opt) => String(opt.value) === String(props.modelValue));
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

function toggle() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function selectOption(val: string | number) {
  emit('update:modelValue', val);
  emit('change', val);
  close();
}

function onDocumentPointerDown(e: PointerEvent) {
  if (isOpen.value && rootRef.value && !rootRef.value.contains(e.target as Node)) {
    close();
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close();
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown);
});
</script>

<template>
  <div
    ref="rootRef"
    class="relative text-left"
    :class="[widthClass || 'w-52', widthClass === 'w-full' ? 'block' : 'inline-block']"
    @keydown="onKeyDown"
  >
    <!-- Trigger Button -->
    <button
      :id="id"
      type="button"
      class="inline-flex w-full min-h-[2.75rem] h-11 items-center justify-between gap-2 rounded-full border border-line bg-tile px-3.5 py-2 text-sm font-medium text-ink shadow-xs transition-colors hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-faint cursor-pointer select-none"
      :class="{
        'border-brand ring-2 ring-brand/10': isOpen,
      }"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen"
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
            'size-4 text-ink-soft transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180 text-brand',
          ]"
          aria-hidden="true"
        />
      </div>
    </button>

    <!-- Floating Popover Menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-1"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        role="listbox"
        :aria-label="ariaLabel"
        class="absolute top-full z-50 mt-1.5 w-full rounded-2xl border border-line bg-tile p-1.5 shadow-lift overflow-hidden"
        :class="align === 'right' ? 'right-0' : 'left-0'"
      >
        <div class="max-h-64 overflow-y-auto space-y-0.5">
          <button
            v-for="opt in normalizedOptions"
            :key="opt.value"
            type="button"
            role="option"
            :aria-selected="String(opt.value) === String(modelValue)"
            class="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors cursor-pointer select-none"
            :class="[
              String(opt.value) === String(modelValue)
                ? 'bg-brand-soft text-brand font-semibold'
                : 'text-ink hover:bg-brand-soft/40 hover:text-brand',
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
