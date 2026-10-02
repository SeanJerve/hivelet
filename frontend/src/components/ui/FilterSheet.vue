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
 * "Show as" (By cluster / As a list) lives here too, at the top (Sean,
 * 2026-10-02: "put the switch inside the Filters, so it's cleaner"). It is
 * drafted and applied with the rest rather than switching on tap, so the
 * dialog has one rule - nothing behind it moves until Apply - instead of one
 * control that acts at once beside four that wait. Reset leaves it alone: it
 * is how the rows are drawn, not which rows, and the "Clear" under the
 * toolbar never touched it either.
 *
 * Built on WsModal for the focus trap, Escape and scroll lock it already gets
 * right, and PillSelect for each choice, the control every form in the
 * workspace already uses.
 */
import { computed, reactive, ref, useId } from 'vue';
import WsModal from '@/components/ui/WsModal.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import {
  isShown,
  optionsFor,
  type FilterDraft,
  type FilterValue,
  type ToolbarFilter,
  type ToolbarView,
} from '@/components/ui/listToolbar';

const props = withDefaults(
  defineProps<{
    filters: ToolbarFilter[];
    title?: string;
    /** The ways of drawing the list; the "Show as" switch is drawn when there are two or more. */
    views?: ToolbarView[];
    view?: string;
    /** Offered only while this holds for the draft (Tenants: not for a past year). */
    viewsWhen?: (draft: FilterDraft) => boolean;
  }>(),
  { title: 'Filters', views: () => [], view: undefined, viewsWhen: undefined }
);

const emit = defineEmits<{
  apply: [values: FilterDraft, view: string | undefined];
  close: [];
}>();

const uid = useId();

// Copied once, when the dialog opens: the screen's values stay as they are until Apply.
const draft = reactive<FilterDraft>(
  Object.fromEntries(props.filters.map((f) => [f.key, f.value]))
);
const draftView = ref<string | undefined>(props.view);

const showViews = computed(
  () => props.views.length > 1 && (props.viewsWhen ? props.viewsWhen(draft) : true)
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
  emit('apply', { ...draft }, showViews.value ? draftView.value : undefined);
  emit('close');
}
</script>

<template>
  <WsModal :title="title" size="sm" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <!-- The switch that used to sit above the search bar, the same markup:
           full width, even halves. -->
      <div v-if="showViews" class="ws-field">
        <span :id="`${uid}-view`">Show as</span>
        <div
          class="min-h-[2.75rem] h-11 flex w-full items-center rounded-full bg-tile border border-line p-1 shadow-xs"
          role="group"
          :aria-labelledby="`${uid}-view`"
        >
          <button
            v-for="v in views"
            :key="v.value"
            type="button"
            :class="[
              'press h-full flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold cursor-pointer whitespace-nowrap',
              draftView === v.value ? 'bg-brand text-on-brand shadow-sm' : 'text-ink-soft hover:text-brand hover:bg-brand-soft/40',
            ]"
            :aria-pressed="draftView === v.value"
            @click="draftView = v.value"
          >
            <component :is="v.icon" v-if="v.icon" class="size-4" aria-hidden="true" />
            <span>{{ v.label }}</span>
          </button>
        </div>
      </div>

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
      <button v-if="shown.length" type="button" class="pill-btn" @click="reset">Reset</button>
      <button type="button" class="pill-btn-brand" @click="apply">Apply filters</button>
    </template>
  </WsModal>
</template>
