<script setup lang="ts">
/**
 * "What do you want to download?" - one month, one year, or everything (Sean,
 * 2026-10-02: "a dialog pops up to confirm what she wants to download - for one
 * month (which month), for a year (which year), or everything").
 *
 * Every Download button opens this one: Monthly Income, Monthly Expenses and
 * the Tenants page's history. The screen passes what it is showing, so the
 * choice opens on the month or year already on screen and one press of
 * Download gets the file she was looking at.
 *
 * A failure is shown here, under the choice, not as a toast: the dialog is
 * still open when it happens, and a toast lands over its X. Closing it while a
 * file is being prepared stops waiting for that file (the request is aborted).
 *
 * The segments are native radios, as in ThemeChoice.vue: arrow keys move
 * between them and a screen reader announces the group and the choice.
 */
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import { FileSpreadsheet } from 'lucide-vue-next';
import WsModal from '@/components/ui/WsModal.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import { propertyToday } from '@/lib/propertyDate';
import { downloadReport, reportFileName, type DownloadScope, type ReportKind } from '@/lib/downloadReport';

const props = defineProps<{
  kind: ReportKind;
  /** What the file is, for the title: "Monthly Income". */
  title: string;
  /** Years that have records, newest first. This year is added if missing. */
  years: number[];
  /** The year on screen; this year when the screen shows every year. */
  year: number;
  /** The month on screen (1-12), or null for a whole year. */
  month: number | null;
  /** Which choice to open on. Defaults to Month when a month is on screen, else Year. */
  initialScope?: DownloadScope['kind'];
}>();

const emit = defineEmits<{ close: [] }>();

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const [todayYear, todayMonth] = propertyToday().split('-').map(Number);

const yearList = computed(() => {
  const set = new Set(props.years.filter((y) => Number.isInteger(y) && y >= 2000 && y <= 2100));
  set.add(todayYear);
  return [...set].sort((a, b) => b - a);
});
const yearOptions = computed(() => yearList.value.map((y) => ({ value: y, label: String(y) })));
const monthOptions = MONTHS.map((label, i) => ({ value: i + 1, label }));

const scopeKind = ref<DownloadScope['kind']>(props.initialScope ?? (props.month ? 'month' : 'year'));
const pickedYear = ref<number>(yearList.value.includes(props.year) ? props.year : yearList.value[0]);
/**
 * The month on screen; with a whole year on screen, this month for this year
 * (the one most likely wanted), else December - the last month of a past year.
 */
const pickedMonth = ref<number>(props.month ?? (pickedYear.value === todayYear ? todayMonth : 12));

const options: { value: DownloadScope['kind']; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
];

const scope = computed<DownloadScope>(() => {
  if (scopeKind.value === 'all') return { kind: 'all' };
  if (scopeKind.value === 'year') return { kind: 'year', year: Number(pickedYear.value) };
  return { kind: 'month', year: Number(pickedYear.value), month: Number(pickedMonth.value) };
});

/** The name the file will be saved under, so the choice reads back before she presses. */
const fileName = computed(() => {
  const s = scope.value;
  if (s.kind === 'all') return reportFileName(props.kind, 'all', propertyToday(), null, props.years);
  return reportFileName(props.kind, s.year, propertyToday(), s.kind === 'month' ? s.month : null);
});

const allNote = computed(() =>
  props.kind === 'tenants'
    ? 'Every year of payments, one sheet for each year.'
    : 'Every year in the ledger, one sheet for each year.'
);

const groupName = useId();
const errorId = useId();
const busy = ref(false);
const error = ref('');
let controller: AbortController | null = null;

function choose(kind: DownloadScope['kind']) {
  scopeKind.value = kind;
  error.value = '';
}

async function download() {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  controller = new AbortController();
  try {
    await downloadReport(props.kind, scope.value, { signal: controller.signal, years: props.years });
    emit('close');
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    error.value = err instanceof Error ? err.message : 'The report could not be generated.';
  } finally {
    busy.value = false;
    controller = null;
  }
}

// Closed mid-download: stop waiting, so a file nobody is waiting for never saves.
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <WsModal :title="`Download ${title}`" subtitle="Choose what the Excel file covers." size="sm" @close="emit('close')">
    <fieldset class="min-w-0" :disabled="busy">
      <legend class="text-xs text-ink-faint">What to download</legend>
      <div class="mt-2 grid grid-cols-3 gap-1 rounded-full bg-canvas p-1">
        <label
          v-for="o in options"
          :key="o.value"
          :class="[
            'press flex min-h-9 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-semibold outline-offset-2 pointer-coarse:min-h-11',
            'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink',
            scopeKind === o.value ? 'bg-tile text-ink shadow-card' : 'text-ink-soft hover:text-ink',
          ]"
        >
          <input
            type="radio"
            class="sr-only"
            :name="groupName"
            :value="o.value"
            :checked="scopeKind === o.value"
            @change="choose(o.value)"
          />
          <span>{{ o.label }}</span>
        </label>
      </div>
    </fieldset>

    <div v-if="scopeKind === 'month'" class="grid grid-cols-2 gap-3">
      <label class="ws-field">
        Month
        <PillSelect
          v-model="pickedMonth"
          :options="monthOptions"
          aria-label="Month"
          width-class="w-full"
          :disabled="busy"
        />
      </label>
      <label class="ws-field">
        Year
        <PillSelect
          v-model="pickedYear"
          :options="yearOptions"
          aria-label="Year"
          width-class="w-full"
          :disabled="busy"
        />
      </label>
    </div>

    <label v-else-if="scopeKind === 'year'" class="ws-field">
      Year
      <PillSelect
        v-model="pickedYear"
        :options="yearOptions"
        aria-label="Year"
        width-class="w-full"
        :disabled="busy"
      />
    </label>

    <p v-else class="text-sm leading-6 text-ink-soft">{{ allNote }}</p>

    <p class="flex items-start gap-2 text-sm leading-6 text-ink-soft">
      <FileSpreadsheet class="mt-1 size-4 shrink-0" aria-hidden="true" />
      <span class="min-w-0 break-words">Saves as <span class="text-ink">{{ fileName }}</span></span>
    </p>

    <p v-if="error" :id="errorId" role="alert" class="ws-reveal text-sm leading-6 text-overdue">{{ error }}</p>

    <template #actions>
      <button type="button" class="pill-btn" @click="emit('close')">Cancel</button>
      <button
        type="button"
        class="pill-btn-brand"
        :disabled="busy"
        :aria-busy="busy"
        :aria-describedby="error ? errorId : undefined"
        @click="download"
      >
        <FileSpreadsheet :class="['size-4', busy && 'animate-pulse']" aria-hidden="true" />
        <span>{{ busy ? 'Preparing' : 'Download' }}</span>
      </button>
    </template>
  </WsModal>
</template>
