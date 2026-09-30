<script setup lang="ts">
/**
 * A tenant's rent, month by month: the same capsule chart the landlady's
 * overview uses, drawn from the tenant's own receipts and standing
 * (lib/tenantPaymentMonths.ts says what counts as paid and as due).
 *
 * Three states are kept apart on purpose. Still loading is not empty, and a
 * failed read is not "nothing recorded": both of those, said by accident to
 * someone who pays rent, read as the house having no record of their money.
 */
import { computed } from 'vue';
import { peso } from '@/lib/canonicalUnits';
import { formatDateOnly } from '@/lib/propertyDate';
import {
  buildPaymentMonths,
  type PaymentMonth,
  type ReceiptInput,
  type StandingInput,
} from '@/lib/tenantPaymentMonths';
import type { CapsuleMonth } from './types';
import MonthCapsules from './MonthCapsules.vue';
import StatusPill from './StatusPill.vue';
import UnavailableNote from './UnavailableNote.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import RecordTable from '@/components/ui/RecordTable.vue';

const props = defineProps<{
  receipts: ReceiptInput[];
  /** Payments not yet verified: sent, not counted. */
  waiting: { amount: number }[];
  standing: (StandingInput & { periodsDue: number; totalDue: number; status: 'settled' | 'due-soon' | 'due' | 'overdue' }) | null;
  today: string;
  loading: boolean;
  failed: boolean;
}>();

defineEmits<{ retry: [] }>();

const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = { month: 'long', day: 'numeric', year: 'numeric' } as const;
const shortDate = { month: 'short', day: 'numeric' } as const;

const months = computed(() => buildPaymentMonths(props.receipts, props.standing, props.today));

const monthName = (m: PaymentMonth) => `${MONTH_LONG[m.month - 1]} ${m.year}`;

const capsules = computed<CapsuleMonth[]>(() =>
  months.value.map((m) => {
    const base = { short: MONTH_LONG[m.month - 1]!.slice(0, 3), long: monthName(m) };
    if (m.duePeriod) return { ...base, value: m.due, kind: 'expected' };
    if (m.state === 'paid') return { ...base, value: m.paid, kind: 'recorded' };
    if (m.state === 'ahead') return { ...base, value: null, kind: 'future' };
    return { ...base, value: null, kind: 'unentered' };
  })
);

const capsuleTerms = { recorded: 'Paid', unentered: 'Nothing recorded', expected: 'Due', future: 'Not due yet' };

const paidMonths = computed(() => months.value.filter((m) => m.paid > 0));
const nothingMonths = computed(() => months.value.filter((m) => m.state === 'nothing'));
const paidTotal = computed(() => Math.round(paidMonths.value.reduce((s, m) => s + m.paid, 0) * 100) / 100);
const waitingTotal = computed(() => props.waiting.reduce((s, p) => s + (Number(p.amount) || 0), 0));

/** The one sentence a tenant opens this for. */
const headline = computed(() => {
  const st = props.standing;
  if (!st) return null;
  const through = st.paidThrough ? `Paid up to ${formatDateOnly(st.paidThrough, longDate)}` : 'No payment recorded yet';
  if (st.owedPeriods.length === 0) return { text: `${through}. You are up to date.`, tone: 'paid' as const, pill: 'Up to date' };
  if (st.periodsDue > 0) {
    const months = st.periodsDue === 1 ? '1 month is' : `${st.periodsDue} months are`;
    return {
      text: `${through}. ${months} due, ${peso(st.totalDue, 2)} in all.`,
      tone: 'overdue' as const,
      pill: st.status === 'overdue' ? 'Overdue' : 'Due today',
    };
  }
  const next = st.owedPeriods[0]!;
  return {
    text: `${through}. The next month is due on ${formatDateOnly(next.dueDate, longDate)}.`,
    tone: 'expected' as const,
    pill: 'Due soon',
  };
});

function nameList(list: PaymentMonth[]) {
  const names = list.map(monthName);
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

function periodText(start: string | null, end: string | null) {
  if (!start || !end) return '';
  return `${formatDateOnly(start, shortDate)} to ${formatDateOnly(end, shortDate)}`;
}

function stateLabel(m: PaymentMonth): { tone: 'paid' | 'overdue' | 'expected' | 'unentered' | 'neutral'; text: string } {
  switch (m.state) {
    case 'paid':
      return { tone: 'paid', text: 'Paid' };
    case 'overdue':
      return { tone: 'overdue', text: 'Overdue' };
    case 'due-today':
      return { tone: 'overdue', text: 'Due today' };
    case 'due-soon':
      return { tone: 'expected', text: 'Due soon' };
    case 'ahead':
      return { tone: 'neutral', text: 'Not due yet' };
    default:
      return { tone: 'unentered', text: 'Nothing recorded' };
  }
}

/** What the month's period was, in the tenant's words. */
function monthDetail(m: PaymentMonth): string {
  if (m.duePeriod) return `Rent, ${periodText(m.duePeriod.start, m.duePeriod.end)}`;
  const r = m.receipts[0];
  if (!r) return '';
  const period = periodText(r.periodStart, r.periodEnd);
  if (r.monthsCovered > 1) return `One receipt of ${peso(r.amount, 2)} for ${period}, ${r.monthsCovered} months`;
  if (period) return `Rent, ${period}`;
  return r.datePaid ? `Paid ${formatDateOnly(r.datePaid, shortDate)}` : '';
}

function monthAmount(m: PaymentMonth): string {
  if (m.duePeriod) return `${peso(m.due, 2)} due`;
  if (m.paid > 0) return peso(m.paid, 2);
  return '';
}

/** Newest first in the list; the chart reads left to right, oldest first. */
const rows = computed(() => [...months.value].reverse());
</script>

<template>
  <div v-if="loading" class="flex flex-col gap-4" aria-busy="true">
    <span class="sr-only" role="status">Loading your months</span>
    <Skeleton class-name="h-4 w-56 rounded-full" />
    <Skeleton class-name="h-48 w-full rounded-2xl" />
  </div>

  <UnavailableNote
    v-else-if="failed"
    message="Your months could not be loaded. This does not mean nothing was paid. Try again, and tell the landlady if it keeps failing."
    @retry="$emit('retry')"
  />

  <div v-else-if="months.length === 0" class="flex flex-col gap-1">
    <p class="text-lg font-semibold tracking-tight">Nothing recorded yet</p>
    <p class="text-sm leading-6 text-ink-soft">
      Each month appears here once the landlady records a receipt for it, or once rent falls due.
    </p>
  </div>

  <div v-else class="flex flex-col gap-4 min-w-0">
    <p v-if="headline" class="flex flex-wrap items-center gap-x-3 gap-y-2 text-base font-semibold leading-6">
      <StatusPill :tone="headline.tone">{{ headline.pill }}</StatusPill>
      <span class="min-w-0">{{ headline.text }}</span>
    </p>

    <MonthCapsules
      :months="capsules"
      :terms="capsuleTerms"
      :label="`Your rent by month, ${capsules[0]!.long} to ${capsules.at(-1)!.long}`"
    />

    <dl class="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
      <div>
        <dt class="text-xs text-ink-faint">Months paid</dt>
        <dd class="text-lg font-semibold tabular">{{ paidMonths.length }} of {{ months.length }}</dd>
        <dd class="text-xs text-ink-soft">In the months shown</dd>
      </div>
      <div>
        <dt class="text-xs text-ink-faint">Paid in these months</dt>
        <dd class="text-lg font-semibold tabular">{{ peso(paidTotal, 2) }}</dd>
        <dd class="text-xs text-ink-soft">From receipts the landlady verified</dd>
      </div>
      <div>
        <dt class="text-xs text-ink-faint">Due now</dt>
        <dd class="text-lg font-semibold tabular">
          {{ standing && standing.totalDue > 0 ? peso(standing.totalDue, 2) : standing ? 'Nothing' : 'Not known' }}
        </dd>
        <dd v-if="standing && standing.periodsDue > 0" class="text-xs text-ink-soft">
          {{ standing.periodsDue }} {{ standing.periodsDue === 1 ? 'month' : 'months' }}
        </dd>
      </div>
    </dl>

    <p v-if="waitingTotal > 0" class="text-sm leading-6 text-ink-soft">
      {{ peso(waitingTotal, 2) }} you sent is waiting for the landlady to verify it. It counts here once she does.
    </p>
    <p v-if="nothingMonths.length > 0" class="text-sm leading-6 text-ink-soft">
      No payment is recorded for {{ nameList(nothingMonths) }}. If you paid for
      {{ nothingMonths.length === 1 ? 'it' : 'them' }}, ask the landlady to check her records.
    </p>

    <details class="group border-t border-line pt-3">
      <summary
        class="press inline-flex min-h-11 cursor-pointer items-center text-sm text-ink-soft underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
      >
        <span class="group-open:hidden">Show each month as a list</span>
        <span class="hidden group-open:inline">Hide the list</span>
      </summary>
      <RecordTable
        class="mt-3"
        :rows="rows"
        flat
        caption="Your rent by month"
        noun="month"
        :page-size="12"
      >
        <template #head>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">For</th>
            <th scope="col" class="num">Amount</th>
            <th scope="col">Status</th>
          </tr>
        </template>
        <template #row="{ row }">
          <tr>
            <th scope="row" class="whitespace-nowrap font-medium">{{ monthName(row) }}</th>
            <td class="text-ink-soft">{{ monthDetail(row) }}</td>
            <td class="num font-semibold whitespace-nowrap">{{ monthAmount(row) }}</td>
            <td><StatusPill :tone="stateLabel(row).tone">{{ stateLabel(row).text }}</StatusPill></td>
          </tr>
        </template>
        <template #card="{ row }">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-ink">{{ monthName(row) }}</p>
              <p v-if="monthAmount(row)" class="mt-1 tabular text-sm text-ink">{{ monthAmount(row) }}</p>
            </div>
            <StatusPill :tone="stateLabel(row).tone">{{ stateLabel(row).text }}</StatusPill>
          </div>
          <p v-if="monthDetail(row)" class="mt-2 break-words text-sm text-ink-soft">{{ monthDetail(row) }}</p>
        </template>
      </RecordTable>
    </details>
  </div>
</template>
