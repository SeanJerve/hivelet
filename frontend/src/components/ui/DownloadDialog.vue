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
 *
 * A pop-up in the middle of the screen, not a sheet (Lloyd, 3 Nov 2026: "it's
 * unnecessary to have a very few component on a sliding bar"). The year and
 * the month are chips rather than dropdowns: the dropdowns sat in <label>s, and
 * a tap in the open list that missed an option was handed back to the
 * dropdown's button by the label, so the list closed and reopened under her
 * finger. PillSelect now cancels that itself; here there is nothing to open.
 */
import { computed, onBeforeUnmount, ref, useId } from 'vue';
import { FileSpreadsheet } from 'lucide-vue-next';
import WsModal from '@/components/ui/WsModal.vue';
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const [todayYear, todayMonth] = propertyToday().split('-').map(Number);

const yearList = computed(() => {
  const set = new Set(props.years.filter((y) => Number.isInteger(y) && y >= 2000 && y <= 2100));
  set.add(todayYear);
  return [...set].sort((a, b) => b - a);
});

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

const allNote = 'All years, one sheet each.';

const groupName = useId();
const yearGroup = useId();
const monthGroup = useId();
const errorId = useId();
const busy = ref(false);
const error = ref('');
let controller: AbortController | null = null;

/** One segment or chip: a native radio in a pill. */
const chip = (on: boolean) => [
  'press flex min-h-9 cursor-pointer items-center justify-center rounded-full px-2 text-sm font-semibold tabular outline-offset-2 pointer-coarse:min-h-11',
  'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ink',
  on ? 'text-ink' : 'text-ink-soft hover:text-ink',
];

/**
 * A year chosen here. Moving from a past year (opened on its December) to this year kept
 * December, so Month offered a file for a month that has not happened (6 Nov 2026); a month
 * still to come becomes this month.
 */
function pickYear(y: number) {
  pickedYear.value = y;
  if (y === todayYear && pickedMonth.value > todayMonth) pickedMonth.value = todayMonth;
  error.value = '';
}

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
  <WsModal :title="`Download ${title}`" size="sm" decision @close="emit('close')">
    <fieldset class="min-w-0" :disabled="busy">
      <legend class="text-xs text-ink-faint">What to download</legend>
      <div v-glide class="relative mt-2 grid grid-cols-3 gap-1 rounded-full bg-well p-1">
        <label v-for="o in options" :key="o.value" :class="chip(scopeKind === o.value)">
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

    <!-- Year, month and the note share one space the height of the tallest, so the dialog keeps
         its size as Month, Year and All are chosen (Sean, 4 Nov 2026). What does not apply is
         hidden and inert, not removed. -->
    <div class="grid">
    <div :class="['flex flex-col gap-4 [grid-area:1/1] sm:gap-5', scopeKind === 'all' && 'invisible']" :inert="scopeKind === 'all'">
    <fieldset class="min-w-0" :disabled="busy">
      <legend class="text-xs text-ink-faint">Year</legend>
      <div v-glide class="relative mt-2 flex flex-wrap gap-1 rounded-3xl bg-well p-1">
        <label v-for="y in yearList" :key="y" :class="['flex-1 basis-16', chip(pickedYear === y)]">
          <input type="radio" class="sr-only" :name="yearGroup" :value="y" :checked="pickedYear === y" @change="pickYear(y)" />
          <span>{{ y }}</span>
        </label>
      </div>
    </fieldset>

    <fieldset :class="['min-w-0', scopeKind !== 'month' && 'invisible']" :inert="scopeKind !== 'month'" :disabled="busy">
      <legend class="text-xs text-ink-faint">Month</legend>
      <div v-glide class="relative mt-2 grid grid-cols-4 gap-1 rounded-3xl bg-well p-1">
        <label v-for="(m, i) in MONTHS" :key="m" :class="chip(pickedMonth === i + 1)">
          <input type="radio" class="sr-only" :name="monthGroup" :value="i + 1" :checked="pickedMonth === i + 1" @change="pickedMonth = i + 1; error = ''" />
          <span>{{ m }}</span>
        </label>
      </div>
    </fieldset>

    </div>
    <p v-if="scopeKind === 'all'" class="text-sm leading-6 text-ink-soft [grid-area:1/1]">{{ allNote }}</p>
    </div>

    <!-- Two lines held, so a longer file name does not grow the dialog. -->
    <p class="flex min-h-12 items-start gap-2 text-sm leading-6 text-ink-soft">
      <FileSpreadsheet class="mt-1 size-4 shrink-0" aria-hidden="true" />
      <span class="min-w-0 break-words">Saves as <span class="text-ink">{{ fileName }}</span></span>
    </p>

    <p v-if="error" :id="errorId" role="alert" class="ws-reveal text-sm leading-6 text-overdue">{{ error }}</p>

    <template #actions>
      <button type="button" class="pill-btn-quiet" @click="emit('close')">Cancel</button>
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
