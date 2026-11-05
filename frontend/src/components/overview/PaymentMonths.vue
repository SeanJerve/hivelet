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

/**
 * The chart runs January to December of the latest year shown (Sean, 20 Oct 2026: a tenant who
 * moved in in September saw two capsules). Months before the first one with anything to say are
 * empty and colourless ('none'); months after the last are "Not due yet", an outline. The figures
 * under the chart still count only the tenancy's own months.
 */
const capsules = computed<CapsuleMonth[]>(() => {
  const shown = tenancyCapsules.value;
  // A tenancy with a year or more already fills the chart; only a shorter one is padded, to twelve.
  if (!months.value.length || shown.length >= 12) return shown;
  const first = months.value[0]!;
  const last = months.value[months.value.length - 1]!;
  const pad = (month: number, kind: 'none' | 'future'): CapsuleMonth => ({
    short: MONTH_LONG[month - 1]!.slice(0, 3),
    long: `${MONTH_LONG[month - 1]} ${last.year}`,
    value: null,
    kind,
  });
  const before: CapsuleMonth[] = [];
  if (first.year === last.year) for (let m = 1; m < first.month; m++) before.push(pad(m, 'none'));
  const after: CapsuleMonth[] = [];
  for (let m = last.month + 1; m <= 12; m++) after.push(pad(m, 'future'));
  return [...before, ...shown, ...after].slice(0, Math.max(12, shown.length));
});

const tenancyCapsules = computed<CapsuleMonth[]>(() =>
  months.value.map((m) => {
    const base = { short: MONTH_LONG[m.month - 1]!.slice(0, 3), long: monthName(m) };
    // A past period with no payment entered is "Not entered", never an amount owed: the ledger
    // alone cannot tell unpaid from not yet entered (Sean, 2026-10-01).
    if (m.duePeriod && m.state === 'overdue') return { ...base, value: null, kind: 'unentered' };
    if (m.duePeriod) return { ...base, value: m.due, kind: 'expected' };
    if (m.state === 'paid') return { ...base, value: m.paid, kind: 'recorded' };
    if (m.state === 'ahead') return { ...base, value: null, kind: 'future' };
    return { ...base, value: null, kind: 'unentered' };
  })
);

const capsuleTerms = { recorded: 'Paid', unentered: 'Not entered', expected: 'Due', future: 'Not due yet' };

const paidMonths = computed(() => months.value.filter((m) => m.paid > 0));
// "Months paid, 0 of 2" counted a month whose period had not started (20 Oct 2026). Only months
// that have come due, or that a payment already covers, are out of the total.
const countedMonths = computed(() => months.value.filter((m) => m.state !== 'ahead' || m.paid > 0));
const nothingMonths = computed(() => months.value.filter((m) => m.state === 'nothing'));
const paidTotal = computed(() => Math.round(paidMonths.value.reduce((s, m) => s + m.paid, 0) * 100) / 100);

/** The one sentence a tenant opens this for. */
const headline = computed(() => {
  const st = props.standing;
  if (!st) return null;
  const through = st.paidThrough ? `Paid up to ${formatDateOnly(st.paidThrough, longDate)}` : 'No payment recorded yet';
  if (st.owedPeriods.length === 0) return { text: `${through}.`, tone: 'paid' as const, pill: 'Up to date' };
  if (st.periodsDue > 0 && st.status === 'overdue') {
    // From the ledger alone: months after the last payment entered. Not "overdue" - the
    // landlady may not have entered a payment yet (Sean, 2026-10-01).
    // 'After that' needs a payment to follow; with none recorded the months simply are not entered.
    const after = st.paidThrough ? ' after that' : '';
    const months = st.periodsDue === 1 ? `1 month${after} is` : `${st.periodsDue} months${after} are`;
    return {
      text: `${through}. ${months} not entered yet.`,
      tone: 'unentered' as const,
      pill: 'Not entered',
    };
  }
  if (st.periodsDue > 0) {
    const months = st.periodsDue === 1 ? '1 month is' : `${st.periodsDue} months are`;
    return {
      text: `${through}. ${months} due, ${peso(st.totalDue, 2)} in all.`,
      tone: 'overdue' as const,
      pill: 'Due today',
    };
  }
  const next = st.owedPeriods[0]!;
  return {
    text: `${through}. Next rent is due on ${formatDateOnly(next.dueDate, longDate)}.`,
    tone: 'expected' as const,
    pill: 'Due soon',
  };
});

function nameList(list: PaymentMonth[]) {
  const names = list.map(monthName);
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

</script>

<template>
  <div v-if="loading" class="flex flex-col gap-4" aria-busy="true">
    <span class="sr-only" role="status">Loading your rent history</span>
    <Skeleton class-name="h-4 w-56 rounded-full" />
    <Skeleton class-name="h-48 w-full rounded-2xl" />
  </div>

  <UnavailableNote
    v-else-if="failed"
    message="Your rent history could not be loaded."
    @retry="$emit('retry')"
  />

  <p v-else-if="months.length === 0" class="text-lg font-semibold tracking-tight">Nothing entered yet</p>

  <div v-else class="flex flex-col gap-4 min-w-0">
    <p v-if="headline" class="flex flex-wrap items-center gap-x-3 gap-y-2 text-base font-semibold leading-6">
      <StatusPill :tone="headline.tone">{{ headline.pill }}</StatusPill>
      <span class="min-w-0">{{ headline.text }}</span>
    </p>

    <MonthCapsules
      :months="capsules"
      :terms="capsuleTerms"
      low
      :decimals="2"
      :label="`Your rent by month, ${capsules[0]!.long} to ${capsules.at(-1)!.long}`"
    />

    <dl class="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
      <div>
        <dt class="text-xs text-ink-faint">Months paid</dt>
        <dd class="text-lg font-semibold tabular">{{ paidMonths.length }}/{{ countedMonths.length }}</dd>
      </div>
      <div>
        <dt class="text-xs text-ink-faint">Paid in these months</dt>
        <dd class="text-lg font-semibold tabular">{{ peso(paidTotal, 2) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-ink-faint">{{ standing?.status === 'overdue' ? 'Not entered yet' : 'Due now' }}</dt>
        <dd class="text-lg font-semibold tabular">
          {{ standing && standing.totalDue > 0 ? peso(standing.totalDue, 2) : standing ? 'Nothing' : 'Not known' }}
        </dd>
        <dd v-if="standing && standing.periodsDue > 0" class="text-xs text-ink-soft">
          {{ standing.periodsDue }} {{ standing.periodsDue === 1 ? 'month' : 'months' }}<template v-if="standing.status === 'overdue'"> at today's rate</template>
        </dd>
      </div>
    </dl>

    <p v-if="nothingMonths.length > 0" class="text-sm leading-6 text-ink-soft">
      No payment is entered for {{ nameList(nothingMonths) }}. If you paid for
      {{ nothingMonths.length === 1 ? 'it' : 'them' }}, ask the landlady to check her records.
    </p>

    <!-- Each month as a row is in the Payment record below (Sean, 5 Nov 2026). -->
  </div>
</template>
