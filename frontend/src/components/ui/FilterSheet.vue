<script setup lang="ts">
/**
 * Every filter a list has, in one dialog, applied together.
 *
 * Sean, 2026-10-01: instead of a row of selects on every screen, one filter
 * button opens this, with an "Apply filters" button, "then they load". So the
 * choices here are a DRAFT: picking "2025" changes nothing behind the dialog
 * until Apply, and closing it any other way (X, Escape, the backdrop) throws
 * the draft away. Reset puts the draft back to the defaults; it does not apply
 * them on its own, so the landlady sees what Reset did before it happens.
 *
 * Built on WsModal for the focus trap, Escape and scroll lock it already gets
 * right, and PillSelect for each choice, the control every form in the
 * workspace already uses.
 */
import { computed, reactive, useId } from 'vue';
import WsModal from '@/components/ui/WsModal.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import {
  isShown,
  optionsFor,
  type FilterDraft,
  type FilterValue,
  type ToolbarFilter,
} from '@/components/ui/listToolbar';

const props = withDefaults(
  defineProps<{
    filters: ToolbarFilter[];
    title?: string;
  }>(),
  { title: 'Filters' }
);

const emit = defineEmits<{
  apply: [values: FilterDraft];
  close: [];
}>();

const uid = useId();

// Copied once, when the dialog opens: the screen's values stay as they are until Apply.
const draft = reactive<FilterDraft>(
  Object.fromEntries(props.filters.map((f) => [f.key, f.value]))
);

/**
 * The filters to offer, each with its options for the current draft. One with a
 * single option is left out: a choice of one is not a choice (Sean called the
 * Tenants page's one-option "Living here" filter nonsense on 2026-09-30).
 */
const shown = computed(() =>
  props.filters
    .filter((f) => isShown(f, draft))
    .map((f) => ({ filter: f, options: optionsFor(f, draft) }))
    .filter((x) => x.options.length > 1)
);

function setDraft(key: string, value: FilterValue) {
  draft[key] = value;
}

function reset() {
  for (const f of props.filters) draft[f.key] = f.defaultValue;
}

function apply() {
  emit('apply', { ...draft });
  emit('close');
}
</script>

<template>
  <WsModal :title="title" size="sm" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <div v-for="{ filter, options } in shown" :key="filter.key" class="ws-field">
        <label :for="`${uid}-${filter.key}`">{{ filter.label }}</label>
        <PillSelect
          :id="`${uid}-${filter.key}`"
          :model-value="draft[filter.key]"
          :options="options"
          :aria-label="filter.label"
          width-class="w-full"
          @update:model-value="setDraft(filter.key, $event)"
        />
      </div>
    </div>

    <template #actions>
      <button type="button" class="pill-btn" @click="reset">Reset</button>
      <button type="button" class="pill-btn-brand" @click="apply">Apply filters</button>
    </template>
  </WsModal>
</template>
