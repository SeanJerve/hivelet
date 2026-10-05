<script setup lang="ts">
import { showPhone } from '@/lib/phoneFormat';
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { periodEnd, propertyToday, formatDateOnly, PROPERTY_TIMEZONE } from '@/lib/propertyDate';
import { useOpenFromQuery } from '@/lib/openFromQuery';
import InvoiceField from '@/components/ui/InvoiceField.vue';
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useLiveRefresh } from '@/lib/live';
import { useRoute, useRouter } from 'vue-router';
import {
  incomeRecords,
  fetchIncomeRecords,
  isOnsitePaymentModalOpen,
  rooms,
  roomsFetchFailed,
  showToast,
  formatUnitOccupantsSummary,
  incomeRecordsFetchFailed,
  asListedUnitCode,
  type IncomeRecord,
} from '@/lib/systemState';
import { peso, CLUSTERS } from '@/lib/canonicalUnits';
import { api, failureTitle } from '@/lib/api';
import { writesUnavailable } from '@/lib/offlineCache';
import { afterArrival } from '@/lib/afterArrival';
import DownloadDialog from '@/components/ui/DownloadDialog.vue';
import { pickedYear } from '@/lib/yearScope';
import { incomeRowInPeriod, incomeRowMonth } from '@/lib/incomeFiling';
import { Plus, Pencil, Trash2, X, Loader2, Check, FileSpreadsheet, Table as TableIcon, LayoutGrid, ChevronDown } from 'lucide-vue-next';
import { sortRows, orderOptions, compareUnits, type RowOrder } from '@/lib/rowOrder';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import MonthCapsules from '@/components/overview/MonthCapsules.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import { focusMonth, MONTH_SHORT as FOCUS_MONTH_SHORT } from '@/lib/focusMonth';
import RecordTable from '@/components/ui/RecordTable.vue';
import type { CapsuleMonth } from '@/components/overview/types';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import ListToolbar from '@/components/ui/ListToolbar.vue';
import type { FilterDraft, ToolbarFilter, ToolbarView } from '@/components/ui/listToolbar';

const route = useRoute();
const router = useRouter();
const activeTab = ref<'ledger' | 'verify'>('ledger');


interface ApiPendingPayment {
  id: string;
  amount: number;
  payment_method: string;
  verification_status: string;
  transaction_reference: string;
  paid_at: string;
  profiles?: { full_name: string; phone_number: string };
  rooms?: { room_number: string; cluster_code: string };
  bills?: {
    rent_amount: number; water_amount: number; total_amount: number;
    billing_period_start?: string | null; billing_period_end?: string | null;
  };
}

const q = ref('');
const selectedCluster = ref('All');
const isLoading = ref(false);
const isSubmitting = ref(false);

// Month and Year Filters
const filterMonth = ref('All');
/**
 * This year by default, not every year (Sean, 2026-10-02). Opened on "All
 * years", every figure on this page added up every payment since 2024 -
 * ₱8,222,900 against the anonymised copy of her ledger - and the landlady was
 * surprised by it: she reads this page as "how is this year going". "All
 * years" is one choice away in Filters, and the period is named in every
 * figure's title. The property's year, not the viewer's (lib/propertyDate.ts).
 */
const THIS_YEAR = propertyToday().slice(0, 4);
const filterYear = ref(THIS_YEAR);
const viewMode = ref<'grouped' | 'flat'>('grouped');

/**
 * Which cluster sections are open.
 *
 * All five used to render at once, which made this screen six viewports tall
 * before anyone had asked to read a single entry. The header of a closed
 * section still carries its subtotals, so the page reads as a summary of the
 * five and you open the one you actually want.
 *
 * The first opens by default, because a screen that starts entirely closed
 * looks broken.
 */
const openClusters = ref<Record<string, boolean>>({});

function isClusterOpen(key: string, index: number) {
  return openClusters.value[key] ?? index === 0;
}

function toggleCluster(key: string, index: number) {
  openClusters.value[key] = !isClusterOpen(key, index);
}

const monthsList = [
  { val: 'All', label: 'All Months' },
  { val: 'Jan', label: 'January' },
  { val: 'Feb', label: 'February' },
  { val: 'Mar', label: 'March' },
  { val: 'Apr', label: 'April' },
  { val: 'May', label: 'May' },
  { val: 'Jun', label: 'June' },
  { val: 'Jul', label: 'July' },
  { val: 'Aug', label: 'August' },
  { val: 'Sep', label: 'September' },
  { val: 'Oct', label: 'October' },
  { val: 'Nov', label: 'November' },
  { val: 'Dec', label: 'December' },
];

// Derived from the ledger, not a literal list. It was `['All','2026','2025','2024']`,
// which would have stopped offering the current year the moment 2027 began.
const yearsList = computed(() => {
  const years = new Set<string>();
  for (const r of incomeRecords) if (r.year) years.add(String(r.year));
  // The property's year, not the viewer's - `lib/propertyDate.ts` exists so both
  // anchor to Legazpi rather than to whoever is looking. A browser behind UTC+8
  // is still in the old year for its first eight hours of January.
  years.add(propertyToday().slice(0, 4));
  return ['All', ...Array.from(years).sort((a, b) => Number(b) - Number(a))];
});

const yearOptions = computed(() =>
  yearsList.value.map((y) => ({
    value: y,
    label: y === 'All' ? 'All years' : y,
  }))
);

/**
 * Starts on the year picked on the Overview or the other ledger, when this
 * ledger lists it, and reports her own pick back. Tried again once the records
 * load, since the list is built from them; a pick she makes meanwhile has
 * already become `pickedYear`, so it is repeated, not overridden.
 */
function followPickedYear() {
  const year = pickedYear.value;
  if (year && yearsList.value.includes(year)) filterYear.value = year;
}
followPickedYear();
watch(isLoading, (loading) => {
  if (!loading) followPickedYear();
});
watch(filterYear, (year) => {
  pickedYear.value = year;
}, { flush: 'sync' });


/** "1 head" / "2 heads" - the water line always read "heads", plural, down to "1 heads". */
function headsLabel(n: number): string {
  return `${n} ${n === 1 ? 'head' : 'heads'}`;
}

const pendingPayments = ref<ApiPendingPayment[]>([]);

/**
 * Whether the last attempt to load the verification queue failed.
 *
 * Without this, a failed fetch left the list empty and the panel below rendered
 * its empty state: a green shield reading "All Remittances Verified". That is an
 * affirmative false statement - the system had not verified anything, it had
 * failed to ask. An administrator reading it would reasonably stop looking.
 *
 * Empty and unknown are different things, and the screen has to say which.
 */
const pendingPaymentsError = ref<string | null>(null);

// The "to verify" queue stays current too; the ledger itself is refreshed by lib/live.ts.
useLiveRefresh(() => fetchPayments());

async function fetchPayments() {
  try {
    const data = await api.get<ApiPendingPayment[]>('/admin/payments');
    if (data && Array.isArray(data)) {
      pendingPayments.value = data.filter((p) => p.verification_status === 'Pending Verification');
    }
    pendingPaymentsError.value = null;
  } catch (err: any) {
    // Do NOT leave the list empty and silent - see the note on
    // `pendingPaymentsError`. The previous rows are kept on screen rather than
    // cleared, so a transient failure does not make payments appear to vanish.
    pendingPaymentsError.value = err?.message || 'The verification queue could not be loaded.';
  }
}

async function fetchIncome() {
  isLoading.value = true;
  try {
    await Promise.allSettled([
      fetchPayments(),
      fetchIncomeRecords()
    ]);
  } catch (err) {
    console.warn('Fetch income failed, using local state:', err);
  } finally {
    isLoading.value = false;
  }
}

/**
 * The payment a verify or reject is saving for, and which of the two.
 *
 * This used to set `isLoading`, the flag the queue and the ledger both read
 * for their FIRST load. So pressing Verify swapped the whole queue for a
 * skeleton announcing "Loading the verification queue" while one row was being
 * saved (B-61). The card being acted on now shows its own busy button, and the
 * other cards' buttons wait for it.
 */
const verifying = ref<{ id: string; status: 'Verified' | 'Rejected' } | null>(null);

/**
 * Reject was a single click with nothing to take it back: the payment is marked
 * Rejected and the bill stays due. Every other destructive action on this
 * screen asks first, so this one does too.
 */
const rejectTarget = ref<ApiPendingPayment | null>(null);

const rejectMessage = computed(() => {
  const p = rejectTarget.value;
  if (!p) return '';
  const unit = p.rooms?.room_number ? `, unit ${String(p.rooms.room_number).toUpperCase()}` : '';
  return `${peso(Number(p.amount) || 0, 2)} from ${p.profiles?.full_name || 'this tenant'}${unit}. ` +
    'Nothing is added to the ledger and their bill stays due.';
});

function confirmReject() {
  const p = rejectTarget.value;
  rejectTarget.value = null;
  if (p) verifyPayment(p.id, 'Rejected');
}

/**
 * One payment, opened from its notification (`?payment=<id>`), with Verify and
 * Reject in the dialog itself. The owner used to land on the queue and scroll
 * for it.
 */
const openedPayment = ref<ApiPendingPayment | null>(null);

async function openPaymentFromNotification(id: string) {
  activeTab.value = 'verify';
  let p = pendingPayments.value.find((x) => x.id === id);
  if (!p) {
    // The notification is usually newer than this page's last load.
    await fetchPayments();
    p = pendingPayments.value.find((x) => x.id === id);
  }
  if (p) {
    openedPayment.value = p;
  } else if (!pendingPaymentsError.value) {
    showToast('info', 'Already done', 'That payment has already been verified or rejected.');
  }
  // On a failed load the queue itself says it could not be read.
}

useOpenFromQuery('payment', openPaymentFromNotification);

async function verifyOpenedPayment() {
  const p = openedPayment.value;
  if (!p) return;
  await verifyPayment(p.id, 'Verified');
  // Closed only once it has left the queue; a failed save keeps it open, with its toast.
  if (!pendingPayments.value.some((x) => x.id === p.id)) openedPayment.value = null;
}

function rejectOpenedPayment() {
  rejectTarget.value = openedPayment.value;
  openedPayment.value = null;
}

function billPeriodText(b: ApiPendingPayment['bills']): string {
  if (!b?.billing_period_start || !b.billing_period_end) return '';
  const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${formatDateOnly(b.billing_period_start, o)} to ${formatDateOnly(b.billing_period_end, o)}`;
}

function sentAtText(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: PROPERTY_TIMEZONE,
  });
}

async function verifyPayment(paymentId: string, status: 'Verified' | 'Rejected') {
  if (verifying.value) return;
  verifying.value = { id: paymentId, status };
  try {
    await api.patch(`/admin/payments/${paymentId}/verify`, {
      verification_status: status
    });
    if (status === 'Verified') {
      // BR-035: the toast once named a purpose for the 50% column. It now says
      // nothing about that column at all; the ledger shows it.
      showToast('success', 'Payment verified', 'It is in the ledger and the bill is marked paid.');
    } else {
      showToast('warning', 'Payment rejected', 'The bill is still due.');
    }
    // Refreshed in place, not through `fetchIncome`, which would blank both
    // panels behind their first-load skeletons for a single saved row.
    await Promise.allSettled([fetchPayments(), fetchIncomeRecords()]);
  } catch (err: any) {
    showToast('error', failureTitle(err, 'Not saved'), err.message || 'The payment was not changed. Please try again.');
  } finally {
    verifying.value = null;
  }
}

/**
 * The configured water rate, from `GET /api/public/rates`. BR-014.
 *
 * This view validated water against a hardcoded `occupants * 200`, with `LF` and
 * `LB` pinned at 400 and 200, and required the figure to be a whole multiple of
 * 200. `OnsitePaymentModal` was moved onto the configured rate; this form - the
 * one the owner uses to correct the ledger - was not, so the moment she changes
 * the rate in settings the two disagree and this one rejects a correct entry.
 *
 * The seeded value remains as the fallback, so a failed fetch degrades to
 * today's behaviour rather than to no validation at all.
 *
 * There is no separate Linda rate to fetch any more - see the note on
 * `handleEditIncome`'s `waterBaseline` and the Linda reference card below.
 * `lindaFixedWaterCharges` used to be read here too; it is a routing flag on
 * the backend now (`getLindaFixedWaterCharge`'s own docblock says so in as many
 * words), not a rate, and this screen stopped treating it as one.
 */
const waterRatePerOccupant = ref<number | null>(null);

async function loadWaterRates() {
  try {
    const r = await api.get<{ waterRatePerOccupant: number }>('/public/rates', false);
    waterRatePerOccupant.value = r?.waterRatePerOccupant ?? null;
  } catch {
    // Left null; the seeded default below applies.
  }
}


/**
 * Arriving from "See it in Monthly Income" on the payment form (Sean,
 * 2026-09-30): ?year=2026&month=9&highlight=<record id>. The page opens on that
 * month, opens the cluster the payment sits in, scrolls to it and tints it for a
 * few seconds, so she sees exactly what was just recorded.
 */
const highlightId = ref<string | null>(null);
let highlightTimer: ReturnType<typeof setTimeout> | undefined;
function applyArrivalQuery() {
  const y = typeof route.query.year === 'string' ? route.query.year : null;
  const m = Number(route.query.month);
  if (y) {
    pickedYear.value = y;
    if (yearsList.value.includes(y)) filterYear.value = y;
  }
  if (m >= 1 && m <= 12) filterMonth.value = MONTH_SHORT[m - 1];
  if (typeof route.query.highlight === 'string') {
    activeTab.value = 'ledger';
    highlightId.value = route.query.highlight;
    showHighlighted();
  }
}
async function showHighlighted() {
  const id = highlightId.value;
  if (!id) return;
  if (y_isLoading()) return; // tried again when the ledger arrives
  const row = rows.value.find((r) => r.id === id);
  if (!row) return;
  const group = displayGroups.value.find((g) => g.records.some((r) => r.id === id));
  if (group) openClusters.value = { ...openClusters.value, [group.key]: true };
  await nextTick();
  document.querySelector(`[data-row-id="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => (highlightId.value = null), 6000);
}
function y_isLoading() {
  return isLoading.value;
}
watch(() => [route.query.year, route.query.month, route.query.highlight], applyArrivalQuery);
watch(isLoading, (loading) => {
  if (!loading) {
    const y = typeof route.query.year === 'string' ? route.query.year : null;
    if (y && yearsList.value.includes(y)) filterYear.value = y;
    showHighlighted();
  }
});

onMounted(() => {
  applyArrivalQuery();
  if (route.query.tab === 'verify') {
    activeTab.value = 'verify';
  }
  const loading = fetchIncome();
  loadWaterRates();
  if (route.query.openPayment === '1') {
    const nextQuery = { ...route.query };
    delete nextQuery.openPayment;
    router.replace({ query: nextQuery });
    // The ledger arrives first, then the dialog (lib/afterArrival.ts).
    afterArrival(loading).then(() => {
      isOnsitePaymentModalOpen.value = true;
    });
  }
});

/**
 * Every narrowing EXCEPT the cluster.
 *
 * Split out so the cluster chips below can count what each one would actually
 * give you, from the same predicate the list itself uses. A count and a list
 * computed separately are two things that can disagree, and the number is the
 * one nobody checks.
 *
 * The year and month are the ones the row is filed under - the month the rent
 * is for - not the date paid. The date paid put rent collected in late December
 * for January into the other year from the Overview and the Excel export, and
 * left a row whose date would not parse in every month at once (FINAL_REVIEW F3).
 */
function matchesExceptCluster(r: IncomeRecord, year = filterYear.value, month = filterMonth.value): boolean {
  const query = q.value.toLowerCase().trim();
  if (
    query &&
    !r.unit.toLowerCase().includes(query) &&
    !r.contact.toLowerCase().includes(query) &&
    !(r.invoice ?? '').toLowerCase().includes(query)
  ) {
    return false;
  }

  // The month the rent is for, as the Overview and the Excel export count it.
  return incomeRowInPeriod(r, year, month);
}

// Filters > Order (Sean, 2026-10-02, every list): newest payment first (default), by unit, by name.
const incomeOrder = ref<RowOrder>('newest');
const rows = computed(() =>
  sortRows(
    incomeRecords.filter(
      (r) =>
        matchesExceptCluster(r) &&
        (selectedCluster.value === 'All' || r.cluster === selectedCluster.value)
    ),
    incomeOrder.value,
    { unit: (r) => r.unit, name: (r) => r.contact, date: (r) => r.rawDate ?? r.datePaid }
  )
);

/**
 * The counts, which are also the filter.
 *
 * The same control the room and rate directory uses, for the same reason: the
 * figures and the way of narrowing the list are one thing rather than two that
 * can drift. This was a dropdown, which said nothing about how much was in
 * each cluster until you picked one and looked.
 *
 * Counted over everything the OTHER filters already allow, so a chip reading
 * 12 gives twelve rows when pressed. Counting the whole ledger instead would
 * promise rows that the month and year in force would then withhold.
 *
 * "In force" is the filter dialog's draft while it is open (Sean, 2026-10-01:
 * filters apply on "Apply filters"), so picking 2025 there re-counts the
 * clusters for 2025 before anything behind the dialog changes.
 */
function clusterChipsFor(year: string, month: string) {
  const inScope = incomeRecords.filter((r) => matchesExceptCluster(r, year, month));
  return [
    { key: 'All', label: 'All clusters', count: inScope.length },
    ...CLUSTERS.map((c) => ({
      key: c as string,
      label: c as string,
      count: inScope.filter((r) => r.cluster === c).length,
    })),
  ];
}

/** The toolbar's switch and filters (components/ui/ListToolbar.vue); the refs above stay the state. */
const incomeViews: ToolbarView<'grouped' | 'flat'>[] = [
  { value: 'grouped', label: 'By cluster', icon: LayoutGrid },
  { value: 'flat', label: 'As a list', icon: TableIcon },
];
const incomeFilters = computed<ToolbarFilter[]>(() => [
  {
    key: 'cluster',
    label: 'Cluster',
    value: selectedCluster.value,
    defaultValue: 'All',
    options: (d) => clusterChipsFor(String(d.year), String(d.month)),
  },
  { key: 'month', label: 'Month', value: filterMonth.value, defaultValue: 'All', options: monthsList },
  // Default this year (above), so Reset and Clear come back to it, and the
  // summary line names "All years" when that is picked.
  { key: 'year', label: 'Year', value: filterYear.value, defaultValue: THIS_YEAR, options: yearOptions.value },
  {
    key: 'group',
    label: 'Group by',
    value: incomeGroupBy.value,
    defaultValue: 'cluster',
    options: [
      { value: 'cluster', label: 'Cluster' },
      { value: 'unit', label: 'Unit' },
      { value: 'name', label: 'Tenant (A to Z)' },
    ],
  },
  { key: 'order', label: 'Order', value: incomeOrder.value, defaultValue: 'newest', options: orderOptions(['newest', 'oldest', 'unit', 'name']) },
]);
function applyIncomeFilters(v: FilterDraft) {
  selectedCluster.value = String(v.cluster);
  filterMonth.value = String(v.month);
  filterYear.value = String(v.year);
  incomeOrder.value = v.order as RowOrder;
  incomeGroupBy.value = v.group as IncomeGroupBy;
  // Grouping by unit or tenant only shows in the grouped view, so choosing one switches to it.
  if (incomeGroupBy.value !== 'cluster') viewMode.value = 'grouped';
}

const totalRent = computed(() => rows.value.reduce((s, r) => s + r.rent, 0));
/**
 * Half of Rent Amount, summed over Boarding House rows only. BR-035: a
 * system-computed figure equal to half the row's Rent Amount, retained so the
 * ledger reconciles with the historical spreadsheet. The "As a list" totals row.
 */
const totalWater = computed(() => rows.value.reduce((s, r) => s + r.water, 0));
/**
 * BR-038, matching the generated column exactly: Rent Amount + Water Payment.
 *
 * The one Remitted figure on this screen, for every cluster. There used to be
 * a second, "her spreadsheet's own bottom line", counting BH rows at HALF
 * their rent, and the BH rows and header showed that one. Her workbook says
 * otherwise (B-76, read 2026-09-26): Remitted is `=SUM(E5,H5:I5)`, full rent
 * plus water, and the BH total `=SUM(J3:J24)` adds those rows at
 * full rent. Half rent appears only in her 50% column (`=SUM(E3*0.5)`), which
 * is shown on its own. So the screen now agrees with the database and the
 * Excel export.
 */
const totalRemitted = computed(() => rows.value.reduce((s, r) => s + r.rent + r.water, 0));

/**
 * Unit, Paid, Who (takes the rest), Rent, the one extra slot, Water (with its
 * heads), Remitted, edit. Sized so a seven-figure total
 * ("P1,485,000.00", 89px at 14px) fits on one line; percentages broke
 * "P4,500.00" in two.
 */
const CLUSTER_TABLE_COLS = ['3.5rem', '6.5rem', '', '7rem', '6.25rem', '6.25rem', '7rem', '4rem'];

/**
 * Collections by month, for the same capsule chart the overview uses.
 *
 * Built from the rows already on screen, so it answers to the filters above it.
 * A month with no row is `unentered` rather than zero: this ledger is entered by
 * hand and a blank month means nobody has typed it in yet, which is a different
 * fact from having collected nothing. The overview makes the same distinction.
 *
 * When a single month is being filtered for, the chart would be one capsule and
 * eleven blanks, so it is not drawn at all.
 */
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const;

const collectionsByMonth = computed<CapsuleMonth[]>(() => {
  const totals = new Array(12).fill(0);
  const seen = new Array(12).fill(false);

  // Filed and summed as the Overview's capsules are: the month the rent is for,
  // rent plus water (lib/incomeFiling.ts).
  for (const r of rows.value) {
    const month = incomeRowMonth(r);
    if (month === null) continue;
    seen[month - 1] = true;
    totals[month - 1] += r.rent + r.water;
  }

  return MONTH_SHORT.map((short, i) => ({
    short,
    long: MONTH_FULL[i],
    kind: seen[i] ? ('recorded' as const) : ('unentered' as const),
    value: seen[i] ? totals[i] : null,
  }));
});

const showMonthChart = computed(() => filterMonth.value === 'All' && rows.value.length > 0);

// Rent plus water: the same figure as the Remitted column's total, so the page
// shows one "collected" number, not two that differ (Sean, 2026-09-30).
const collectedAltogether = computed(() => totalRent.value + totalWater.value);

/**
 * What the figures below add up, in one plain line (Sean, 2026-10-01). On the
 * testing day the landlady saw "₱8,222,900" with no idea it was every payment
 * since 2024, and asked whether the Penthouse was in a cluster figure. The page
 * now opens on this year (Sean, 2026-10-02); this still names the period and
 * the units, whichever year, or "All years", is picked.
 */
/**
 * The period every figure is for, short enough for a tile's title beside the
 * figure: "2026", "September 2026", "all years" (Sean, 2026-10-02: the year
 * labelled next to the figure, so this year's total is never read as all-time,
 * or the other way round).
 */
const periodWord = computed(() => {
  const m = filterMonth.value === 'All' ? '' : (monthsList.find((x) => x.val === filterMonth.value)?.label ?? '');
  if (filterYear.value === 'All') return m ? `${m}, every year` : 'all years';
  return m ? `${m} ${filterYear.value}` : filterYear.value;
});

/**
 * The headline card is one month (Sean, 2026-10-02: the screen is MONTHLY
 * Income; the year is the card beside it, as on Monthly Expenses). Which
 * month: lib/focusMonth.ts. The sentence that sat above the cards ("These
 * figures are for all of 2026: all units, the Penthouse and Linda's units
 * included") is gone: each card's title names its period.
 */
const focus = computed(() =>
  focusMonth(filterYear.value, filterMonth.value, (year) => [
    ...new Set(incomeRecords.filter((r) => String(r.year) === year).map((r) => incomeRowMonth(r)).filter((m): m is number => m !== null)),
  ])
);
const monthRows = computed(() =>
  incomeRecords.filter(
    (r) =>
      matchesExceptCluster(r, focus.value.year, FOCUS_MONTH_SHORT[focus.value.month - 1]) &&
      (selectedCluster.value === 'All' || r.cluster === selectedCluster.value)
  )
);
const monthRent = computed(() => monthRows.value.reduce((s, r) => s + r.rent, 0));
/** Nothing to show (not a failed load): sent to the end on a phone. */
const receivedIsEmpty = computed(() => !incomeRecordsFetchFailed.value && monthRent.value + monthWater.value === 0);
const monthWater = computed(() => monthRows.value.reduce((s, r) => s + r.water, 0));
// BR-035: a system-computed figure, half of each Boarding House row's Rent Amount.
// Shown only here, as the month's total on the Received tile (Loyd, 2026-10-03).
const monthShare = computed(() => monthRows.value.reduce((s, r) => s + (r.cluster === 'Boarding House' ? r.rent / 2 : 0), 0));

/** Where the period's rent and water came from, by cluster: a true part-to-whole, like Expenses by area. */
const splitIsEmpty = computed(() => !incomeRecordsFetchFailed.value && clusterSplit.value.length === 0);
const clusterSplit = computed(() => {
  const totals = new Map<string, number>();
  for (const r of rows.value) totals.set(r.cluster, (totals.get(r.cluster) ?? 0) + r.rent + r.water);
  const tones = ['brand', 'bright', 'night', 'soft', 'hatch', 'faint'] as const;
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, tone: tones[i % tones.length] }));
});

// Grouped rows matching Excel's 5 physical sub-sections
const clusterGroups = computed(() => {
  const definitions = [
    { 
      key: 'Boarding House', 
      label: 'Boarding House',
      desc: '22 Rooms',
      hasShareColumn: true, 
      units: ['1A', '1B', '1C', '1D', '1E', '1F', '1G', '1H', '2A', '2B', '2C', '2D', '2E', '2F', '2G', '3A', '3B', '3C', '3D', '3E', '3F', '3G'] 
    },
    {
      key: 'Back Apartment',
      label: 'Back Apartment',
      desc: '5 Rooms',
      hasShareColumn: false,
      units: ['B1F', 'B2F', 'B2B', 'B3F', 'B3B']
    },
    {
      key: 'Penthouse',
      label: 'Penthouse',
      desc: '1 Room (PH)',
      hasShareColumn: false,
      units: ['PH']
    },
    {
      key: 'Front Apartment',
      label: 'Front Apartment',
      desc: '3 Rooms',
      hasShareColumn: false,
      units: ['F1', 'F2F', 'F2B']
    },
    {
      // "Linda Commercial & Annex" named a kind of space nothing in this
      // property is - these are residential units, not commercial ones - and
      // disagreed with what every other screen calls this cluster
      // (RoomDirectoryView, AdminOverviewView, TenantManagementView all read
      // it off `CLUSTERS` in canonicalUnits.ts, which spells it "Linda Units").
      //
      // Only Linda's line says where the money goes; the others used to add
      // "Pooled into the grand total", and Linda's "kept out of the grand
      // total". That is true of the spreadsheet export's GRAND SUBTOTAL
      // (judgement log 3.5), but this screen's own "collected altogether"
      // sums every row in view, Linda included - so on this page the claim
      // contradicted the figure above it. Where the money goes is the fact
      // that is true everywhere.
      key: 'Linda',
      label: 'Linda Units',
      desc: '2 Rooms (LF, LB)',
      hasShareColumn: false,
      units: ['LF', 'LB', '*LF', '*LB']
    }
  ];

  return definitions.map(def => {
    const groupRecords = rows.value.filter(r => {
      const u = r.unit.toUpperCase();
      return def.units.includes(u) || r.cluster === def.key;
    });

    const gRent = groupRecords.reduce((sum, r) => sum + r.rent, 0);
    const gShare = def.hasShareColumn ? gRent / 2 : 0;
    const gOccupants = groupRecords.reduce((sum, r) => sum + r.occupants, 0);
    const gWater = groupRecords.reduce((sum, r) => sum + r.water, 0);
    const gRemitted = groupRecords.reduce((sum, r) => sum + r.rent + r.water, 0);

    return {
      ...def,
      records: groupRecords,
      totalRent: gRent,
      totalShare: gShare,
      totalOccupants: gOccupants,
      totalWater: gWater,
      totalRemitted: gRemitted
    };
  }).filter(g => (q.value.trim() ? g.records.length > 0 : (selectedCluster.value === 'All' || selectedCluster.value === g.key)));
});

/**
 * Filters > Group by (Sean, 2026-10-02: "a filter that groups the tenants by their units,
 * alphabetically, or by name"). By cluster is the sections above; by unit is one section per
 * unit (1A, 1B ... 3G, then the named units); by tenant is one per payer, A to Z. Each section has
 * the same header and totals as a cluster's; the 50% Share counts only Boarding House rows in it
 * (BR-035, half that row's Rent Amount), so a tenant or unit section outside it shows none.
 */
type IncomeGroupBy = 'cluster' | 'unit' | 'name';
const incomeGroupBy = ref<IncomeGroupBy>('cluster');
const displayGroups = computed(() => {
  if (incomeGroupBy.value === 'cluster') return clusterGroups.value;
  const byUnit = incomeGroupBy.value === 'unit';
  const buckets = new Map<string, (typeof rows.value)[number][]>();
  for (const r of rows.value) {
    const k = byUnit ? (r.unit || '').toUpperCase() || 'No unit' : (r.contact || '').trim() || 'No name';
    const list = buckets.get(k);
    if (list) list.push(r);
    else buckets.set(k, [r]);
  }
  const keys = [...buckets.keys()].sort(byUnit ? compareUnits : (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return keys.map((k, i) => {
    const records = buckets.get(k)!;
    const totalRent = records.reduce((s, r) => s + r.rent, 0);
    const totalShare = records.filter((r) => r.cluster === 'Boarding House').reduce((s, r) => s + r.rent / 2, 0);
    const units = [...new Set(records.map((r) => (r.unit || '').toUpperCase()).filter(Boolean))];
    return {
      key: `${incomeGroupBy.value}-${i}-${k.replace(/[^A-Za-z0-9]+/g, '-')}`,
      label: byUnit ? `Unit ${k}` : k,
      desc: byUnit ? records[0].cluster || '' : units.length ? `Unit ${units.join(', ')}` : '',
      hasShareColumn: totalShare > 0,
      units,
      records,
      totalRent,
      totalShare,
      totalOccupants: records.reduce((s, r) => s + r.occupants, 0),
      totalWater: records.reduce((s, r) => s + r.water, 0),
      totalRemitted: records.reduce((s, r) => s + r.rent + r.water, 0),
    };
  });
});

// Custom Confirmation Modal state
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<(() => void) | null>(null);

function showConfirm(title: string, message: string, action: () => void) {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
  isConfirmOpen.value = true;
}

function handleConfirmAccept() {
  const action = confirmAction.value;
  isConfirmOpen.value = false;
  if (action) {
    action();
  }
}

// Edit Income State
const isEditOpen = ref(false);
const editingIncome = ref<IncomeRecord | null>(null);

const editUnit = ref('1a');
// Zero rather than a plausible figure: an unset field should read as empty,
// not as a rent someone might not notice is wrong.
const editRent = ref(0);
const editWater = ref(400);
const editInvoice = ref('');
const editDate = ref('');
/**
 * `payment_method_type` is (Cash | GCash | Bank Transfer | Adyen Online).
 *
 * This form is the ledger's twin of the on-site payment modal fixed in 4170dfd, and it had
 * the same two-option dropdown - "Cash" and "Online Payment", filed as GCash - beside a box
 * asking for a "Gcash / Bank Ref #".
 *
 * 'Adyen Online' is never OFFERED, because only the gateway's webhook may assert that money
 * came through Adyen. It is accepted as a loaded value and shown disabled, so opening a
 * gateway-created receipt to correct a typo puts the method back unchanged instead of
 * quietly restating how the money arrived.
 */
const editMethod = ref<'Cash' | 'GCash' | 'Bank Transfer' | 'Adyen Online'>('Cash');

const editUnitOptions = computed(() =>
  rooms.map((r) => ({
    value: r.unitCode,
    label: `${r.unitCode.toUpperCase()}, ${r.tenant || 'Vacant'} (${r.cluster})`,
  }))
);

const editMethodOptions = computed(() => {
  const base = [
    { value: 'Cash', label: 'Cash' },
    { value: 'GCash', label: 'GCash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
  ];
  if (editMethod.value === 'Adyen Online') {
    base.push({ value: 'Adyen Online', label: 'Adyen Online (gateway)' });
  }
  return base;
});

/** Cash has no reference to record; every other method does. */
const methodHasReference = computed(() => editMethod.value !== 'Cash');
const editReference = ref('');
const editMonthsCovered = ref(1);
const editDateCoveredStart = ref('');

/**
 * BR-034 - the occupant count on this receipt.
 *
 * It was derived from the live tenancy and never shown, so the rule's
 * "and is editable" half had nowhere to happen. Water is occupants x rate
 * (BR-014), so when a roommate had moved out and the tenancy had not been
 * updated yet, the receipt was written at the stale headcount and the
 * administrator had no way to correct it without leaving the form.
 *
 * Defaults to the tenancy's count, which is the carry-forward the rule asks for.
 * A different figure is accepted and the divergence is recorded in the audit log.
 */
const editOccupants = ref(1);

const editDateCoveredEnd = computed(() => {
  // Same rule as the server, and as the on-site payment form. See lib/propertyDate.
  return periodEnd(editDateCoveredStart.value, editMonthsCovered.value);
});

const editTotal = computed(() => {
  return (Number(editRent.value) || 0) + (Number(editWater.value) || 0);
});

function startEditIncome(r: IncomeRecord) {
  editingIncome.value = r;
  // In the case `rooms` lists it, or the Unit dropdown matches no option and
  // shows the raw "3D" rather than the listed "3D — name (cluster)" (B-61).
  // The submit path uppercases it again, so what is posted is unchanged.
  editUnit.value = asListedUnitCode(r.unit);
  editRent.value = r.rent;
  editWater.value = r.water;
  editInvoice.value = r.invoice ?? '';
  
  /**
   * `r.rawDate`, not a re-parse of `r.datePaid`.
   *
   * `datePaid` is already a formatted display string ("Jan 31, 2026"), built by
   * `formatDateOnly` for a viewer in any timezone. `new Date(r.datePaid)` parses
   * that human-readable string as LOCAL midnight (it is not ISO 8601), and
   * `propertyDate(d)` then reads that instant back at the property's zone - two
   * more zone conversions stacked on a value that was already timezone-safe.
   * For an admin working from a browser west of the property, this silently
   * wrote a day earlier than the record actually held on every edit, whatever
   * field was being corrected. `rawDate` is the untouched `YYYY-MM-DD` the
   * column holds; slicing it needs no `Date` and no zone at all.
   */
  if (r.rawDate) {
    editDate.value = r.rawDate;
  } else {
    editDate.value = propertyToday();
  }

  editMonthsCovered.value = 1;
  // BR-033 - left blank so the server derives the period from the tenant's own
  // anniversary cycle. This used to default to the DATE PAID, so a tenant on a
  // 13th-of-the-month cycle paying on the 20th had the period recorded as
  // starting on the 20th, and the ledger's "Rent For" drifted off the cycle one
  // receipt at a time. Typing a date still overrides, which back-dated
  // corrections need - the divergence is recorded in the audit log.
  editDateCoveredStart.value = '';

  // BR-034 - carried forward from the tenancy, and editable from here.
  const occSummary = formatUnitOccupantsSummary(editUnit.value);
  const occRoom = rooms.find((rm) => rm.unitCode.toLowerCase() === editUnit.value.toLowerCase());
  // `rooms` is SEEDED, and the seed carries invented occupant counts. When the
  // fetch failed, `occRoom.occupants` is one of those - and occupants set the
  // water line on the receipt about to be saved, so a seeded 3 overcharges a
  // resident by ₱400. Fall through to 1 rather than to a made-up figure; the
  // banner below tells the administrator to enter it herself.
  editOccupants.value = occSummary.count > 0
    ? occSummary.count
    : (roomsFetchFailed.value ? 1 : (occRoom?.occupants || 1));
  /**
   * Put back what the row actually held.
   *
   * These two lines read `editMethod.value = 'Cash'` and `editReference.value = ''`,
   * discarding the record's own values - and the payload below then PATCHed 'Cash' over the
   * top. Correcting a typo in the rent amount therefore rewrote how the money was received
   * and dropped its reference number. Every one of the 937 live rows is Cash with no
   * reference, so nothing has been lost; it became reachable the moment 4170dfd made GCash
   * and Bank Transfer recordable.
   */
  const loadedMethod = r.paymentMethod === 'GCash' || r.paymentMethod === 'Bank Transfer' || r.paymentMethod === 'Adyen Online'
    ? r.paymentMethod
    : 'Cash';
  editMethod.value = loadedMethod;
  editReference.value = r.transactionReference || '';

  isEditOpen.value = true;
}

function handleDeleteIncome(id: string, invoice: string | null, unit: string) {
  showConfirm(
    'Delete this payment?',
    `Unit ${unit.toUpperCase()}${invoice ? `, invoice ${invoice}` : ''}. It is removed from the ledger and cannot be brought back.`,
    async () => {
      try {
        await api.delete(`/admin/income-records/${id}`);
        const idx = incomeRecords.findIndex(r => r.id === id);
        if (idx !== -1) {
          incomeRecords.splice(idx, 1);
        }
        showToast('success', 'Payment deleted', invoice ? `Invoice ${invoice} is no longer in the ledger.` : 'The payment is no longer in the ledger.');
      } catch (err: any) {
        showToast('error', failureTitle(err, 'Delete failed'), err.message || 'Server error occurred');
      }
    }
  );
}

function handleDeleteFromModal() {
  if (!editingIncome.value) return;
  const id = editingIncome.value.id || '';
  const inv = editingIncome.value.invoice;
  const u = editingIncome.value.unit;
  isEditOpen.value = false;
  handleDeleteIncome(id, inv, u);
}

async function handleEditIncome() {
  if (!editingIncome.value) return;
  const invalid = Number(editRent.value) < 0 || Number(editWater.value) < 0;
  if (invalid) {
    showToast('error', 'Validation Error', 'Amounts cannot be negative.');
    return;
  }

  const unitUpper = editUnit.value.toUpperCase();
  const room = rooms.find((rm) => rm.unitCode.toLowerCase() === editUnit.value.toLowerCase());
  const summary = formatUnitOccupantsSummary(editUnit.value);
  // What the administrator confirmed on the form, falling back to the tenancy.
  const carriedForward = summary.count > 0
    ? summary.count
    : (roomsFetchFailed.value ? 1 : (room?.occupants || 1));
  const occupants = Number(editOccupants.value) > 0 ? Number(editOccupants.value) : carriedForward;
  // BR-014 - the configured rate, with the seeded value as the fallback.
  const perOccupantRate = waterRatePerOccupant.value ?? 200;

  /**
   * BR-040's FIXED WATER CHARGE IS RETIRED (errata 2026-09-20, carried in
   * `backend/src/services/billingService.ts computeWaterFee`). This block used
   * to read `lindaFixedWaterCharges` and validate LF/LB against a flat 400/200
   * with no multiple-of-rate check - the exact figures BOTH units already
   * happened to bill at their standing headcount (1 and 2 heads), which is why
   * the ledger never caught it. The owner confirmed directly: a third person
   * in LF makes the water 600, same as any other unit. Every unit on the
   * property is `occupants x rate` now; only WHERE the money is recorded and
   * remitted still differs for LF/LB, which this form does not need to know.
   */
  const waterBaseline = occupants * perOccupantRate;

  const waterVal = Number(editWater.value) || 0;
  if (waterVal !== 0) {
    if (waterVal < waterBaseline) {
      showToast('error', 'Water Payment Error', `Water payment for ${unitUpper} cannot be lower than the limit of ₱${waterBaseline} for ${occupants} occupant(s) unless it is ₱0.`);
      return;
    }
    if (waterVal % perOccupantRate !== 0) {
      showToast('error', 'Water Payment Error', `Water payment must be paid in whole multiples of ₱${perOccupantRate} (e.g. 0, ${perOccupantRate}, ${perOccupantRate * 2}, ${perOccupantRate * 3}).`);
      return;
    }
  }

  const oldId = editingIncome.value.id;

  isSubmitting.value = true;
  try {
    const payload = {
      roomNumber: editUnit.value.toUpperCase(),
      datePaid: editDate.value,
      /**
       * `contactName` is deliberately NOT sent.
       *
       * It used to be, recomputed from the unit's CURRENT occupancy:
       * `summary.residents.join(', ')`, falling back to `room?.tenant`, falling
       * back to the literal `'Walk-in Resident'`. This form has no contact
       * field - `startEditIncome` never reads `r.contact` - so correcting a
       * typo in a rent figure rewrote **who paid** as a side effect.
       *
       * `contact_name` is the record of who handed the money over. On a unit
       * that has since changed hands it would be replaced by today's resident,
       * and on a vacant one by a literal. Measured against the live ledger
       * rather than supposed: **396 of 937 rows carry a contact that differs
       * from their unit's current tenant**, and 6 sit on units with no active
       * tenant at all. Editing any of those 402 would have destroyed the payer.
       *
       * `PATCH /admin/income-records` applies this field only `if
       * (contactName)`, so omitting it leaves the stored value untouched -
       * which is the correct behaviour for a field the form does not offer. If
       * the payer ever needs correcting, that wants a field of its own and an
       * audit entry, not a silent recomputation.
       */
      // Blank clears it: not every payment has an invoice (Sean, 2026-09-30).
      invoiceNumber: editInvoice.value.trim(),
      rentAmount: Number(editRent.value) || 0,
      occupants: occupants,
      paymentMethod: editMethod.value,
      transactionReference: methodHasReference.value ? editReference.value : undefined,
      monthsCovered: Number(editMonthsCovered.value) || 1,
      // Omitted when blank, so the server derives both from the anniversary. BR-033.
      ...(editDateCoveredStart.value
        ? { dateCoveredStart: editDateCoveredStart.value, dateCoveredEnd: editDateCoveredEnd.value }
        : {}),
    };

    if (oldId && !oldId.startsWith('INC-MOCK-') && !oldId.startsWith('INC-NEW-')) {
      await api.patch(`/admin/income-records/${oldId}`, payload);
    } else {
      /**
       * Creation is the one case where the contact IS derived from occupancy,
       * and it has to be: `incomeRecordSchema` requires `contactName`, and a
       * brand-new row has no previous payer to preserve. Only the edit above
       * leaves it alone.
       */
      await api.post('/admin/income-records', {
        ...payload,
        contactName:
          summary.residents.length > 0
            ? summary.residents.join(', ')
            : (room?.tenant || 'Walk-in Resident'),
      });
    }

    await fetchIncomeRecords();

    showToast('success', 'Payment updated', `Unit ${editUnit.value.toUpperCase()} is saved in the ledger.`);
    isEditOpen.value = false;
    editingIncome.value = null;
  } catch (err: any) {
    showToast('error', failureTitle(err, 'Not saved'), err?.message || 'The entry could not be updated.');
  } finally {
    isSubmitting.value = false;
  }
}

/**
 * The Monthly Income Report as a real spreadsheet. BR-049.
 *
 * This is the one export on this screen, and it satisfies both BR-030 - the rows
 * leave the system in a format Excel opens - and the stricter BR-049: the
 * documented layout, with the month blocks, the per-cluster subtotals, and Linda
 * kept in her own section rather than folded into the grand total.
 *
 * A CSV button used to sit beside it writing a flat dump of the same rows. CSV
 * cannot express any of that structure, so the two files disagreed about what
 * the ledger looks like, and the flat one was the easier button to reach.
 */
//
// The button opens the Download dialog (Sean, 2026-10-02): one month, one
// year, or everything. It opens on what the screen is showing - the month and
// year in the filters - and on this year when the filter says every year, so
// one press of Download still gets this year's workbook as it always did.
// The property's year, not the viewer's (lib/propertyDate.ts).
const exportYear = computed(() => (filterYear.value !== 'All' ? filterYear.value : propertyToday().slice(0, 4)));
const exportMonth = computed(() => {
  const i = monthsList.findIndex((m) => m.val === filterMonth.value);
  return i > 0 ? i : null;
});
const exportYears = computed(() => yearsList.value.filter((y) => y !== 'All').map(Number));
const isDownloadOpen = ref(false);

</script>

<template>
  <!-- `ws-focus` carries the workspace focus ring. See the note on the same
       class in ExpensesLedgerView: the rule is scoped to an ancestor, nothing
       above a view provides one, and without it this screen's controls had
       only the browser's default ring and its search box had none. -->
  <div class="ws-focus space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4">
      <div>
        <!--
          Download is a word on the eyebrow line, at the right, the way the
          Overview's year sits on its date line (Loyd, 2026-10-03), so the
          button row under the name holds the one action. It still opens the
          month / year / everything dialog; the year and the format are in its
          accessible name and tooltip.
        -->
        <div class="flex items-center justify-between gap-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
          <button
            type="button"
            class="press relative -my-1 inline-flex shrink-0 items-center gap-1.5 py-1 text-sm font-bold text-brand whitespace-nowrap before:absolute before:-inset-x-2 before:-inset-y-2"
            aria-haspopup="dialog"
            :aria-label="`Download ${exportYear} for Excel`"
            :title="`Download ${exportYear} for Excel`"
            @click="isDownloadOpen = true"
          >
            <span>Download</span>
            <FileSpreadsheet class="size-4" aria-hidden="true" />
          </button>
        </div>
        <div class="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 class="text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
            Monthly Income
          </h1>

          <div class="ws-page-actions">
            <!-- Not offline or from the saved copy: recording needs the server (Sean, 2026-10-02). -->
            <button
              type="button"
              class="pill-btn-brand"
              :disabled="writesUnavailable"
              :title="writesUnavailable ? 'Needs a connection' : undefined"
              @click="isOnsitePaymentModalOpen = true"
            >
              <Plus class="size-4" aria-hidden="true" />
              <span>Record payment</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Month, year, or everything; the busy state and any failure live in it. -->
      <DownloadDialog
        v-if="isDownloadOpen"
        kind="income"
        title="Monthly Income"
        :years="exportYears"
        :year="Number(exportYear)"
        :month="exportMonth"
        @close="isDownloadOpen = false"
      />
    </div>

    <!--
      The four figures.

      EVERY ONE OF THEM READS `incomeRecordsFetchFailed` FIRST, and that is not
      decoration. They are sums over `rows`, which derives from
      `incomeRecords`, which stays EMPTY when the fetch fails - so without this
      a refused or broken request rendered "₱0" four times over, on the screen
      the owner opens to see money received, against a table holding 937 real
      income rows. A failure presented as a financial fact.

      The flag already existed and was already set by `fetchIncomeRecords`.
      AdminOverviewView reads it in six places. This screen - the one that owns
      the data - read it in none, which is the same shape as the dispatch board
      that claimed zero repairs.
    -->
    <!--
      On a phone a tile with nothing in it goes to the end (Loyd, 2026-10-03,
      the same rule as the Overview): a month with nothing entered yet would
      otherwise open the page on ₱0 above the chart. A failed load is not a
      zero and keeps its place. CSS order below 768px only.
    -->
    <div class="grid gap-3 md:gap-4 xl:grid-cols-12">
      <OverviewTile :title="`Received, ${focus.label}`" tone="night" :class="['max-md:gap-3 max-md:p-4 xl:col-span-4', receivedIsEmpty && 'max-md:order-last']">
        <UnavailableNote
          v-if="incomeRecordsFetchFailed"
          dark
          message="The collections could not be loaded, so no total is shown. That is not the same as nothing having been collected."
          @retry="fetchIncome"
        />
        <template v-else>
          <!-- Rent plus water, the Remitted column's figure, for the one month. -->
          <p class="tabular text-3xl md:text-4xl font-semibold leading-none tracking-tight">{{ peso(monthRent + monthWater) }}</p>
          <p class="text-sm leading-6 text-on-night-soft">
            {{ monthRows.length === 0 ? 'Nothing entered yet' : `From ${monthRows.length} ${monthRows.length === 1 ? 'payment' : 'payments'}` }}
          </p>
          <!-- Side by side on a phone, rows from 768px (Loyd, 2026-10-03: smaller
               cards there, so the graphs below are on the first screen). -->
          <dl class="mt-auto grid auto-cols-fr grid-flow-col gap-3 border-t border-white/10 pt-3 md:flex md:flex-col md:gap-0 md:divide-y md:divide-white/10 md:pt-1">
            <div class="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3 md:py-2.5">
              <dt class="text-sm text-on-night-soft">Rent</dt>
              <dd class="tabular text-base font-semibold md:text-lg">{{ peso(monthRent) }}</dd>
            </div>
            <div class="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3 md:py-2.5">
              <dt class="text-sm text-on-night-soft">Water</dt>
              <dd class="tabular text-base font-semibold md:text-lg">{{ peso(monthWater) }}</dd>
            </div>
            <!-- BR-035: the label only; a system-computed figure, half of each row's Rent Amount. -->
            <div class="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-3 md:py-2.5">
              <dt class="text-sm text-on-night-soft">50% Share</dt>
              <dd class="tabular text-base font-semibold md:text-lg">{{ peso(monthShare) }}</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>

      <OverviewTile :title="`Where it came from, ${periodWord}`" :class="['max-md:gap-3 max-md:p-4 xl:col-span-8', splitIsEmpty && 'max-md:order-last']">
        <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="fetchIncome" />
        <p v-else-if="clusterSplit.length === 0" class="text-sm text-ink-soft">
          No payments match the filters above.
        </p>
        <template v-else>
          <p class="flex flex-wrap items-baseline gap-x-2">
            <span class="tabular text-xl md:text-2xl font-semibold leading-none text-ink">{{ peso(collectedAltogether) }}</span>
            <span class="text-sm text-ink-soft">received from {{ rows.length }} {{ rows.length === 1 ? 'payment' : 'payments' }}</span>
          </p>
          <SegmentBar
            :segments="clusterSplit"
            :label="`How ${peso(collectedAltogether)} divides across the clusters`"
          />
          <!-- The legend in two columns on a phone, name and share; the amounts
               from 768px (Loyd, 2026-10-03). -->
          <ul class="grid grid-cols-2 gap-x-3 gap-y-2 max-md:text-xs md:flex md:flex-col md:gap-2.5">
            <li v-for="c in clusterSplit" :key="c.label" class="flex min-w-0 items-center justify-between gap-2 md:gap-3 md:text-sm">
              <span class="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  :class="[
                    'size-3 shrink-0 rounded-full',
                    c.tone === 'brand' && 'bg-brand',
                    c.tone === 'bright' && 'bg-brand-bright',
                    c.tone === 'night' && 'bg-series-night',
                    c.tone === 'soft' && 'bg-series-soft',
                    c.tone === 'hatch' && 'hatch border border-line',
                    c.tone === 'faint' && 'bg-ink-faint',
                  ]"
                />
                <span class="truncate">{{ c.label }}</span>
              </span>
              <span class="flex shrink-0 items-baseline gap-3">
                <span class="text-xs text-ink-faint tabular">
                  {{ collectedAltogether > 0 ? Math.round((c.value / collectedAltogether) * 100) : 0 }}%
                </span>
                <span class="tabular font-semibold max-md:hidden">{{ peso(c.value) }}</span>
              </span>
            </li>
          </ul>
          <p v-if="waterRatePerOccupant !== null" class="text-xs leading-5 text-ink-faint max-md:hidden">
            Water is {{ peso(waterRatePerOccupant) }} per person each month.
          </p>
        </template>
      </OverviewTile>

      <!--
        What came in, month by month - the same capsules the overview and the
        expenses ledger draw. "What it was made of" (a rent/water bar and the two
        figures) stood beside it and repeated the Rent and Water tiles above word
        for word; removed for less on screen (Sean, 2026-10-01). In the same grid
        as the two tiles above since 2026-10-03, so an empty one can drop below it.
      -->
      <OverviewTile
        v-if="rows.length > 0 && showMonthChart"
        :title="`Rent and water by month, ${periodWord}`"
        class="max-md:gap-3 max-md:p-4 xl:col-span-12"
      >
        <MonthCapsules :months="collectionsByMonth" label="Rent and water by month" short />
      </OverviewTile>
    </div>

    <!--
      The tabs, then the list toolbar every screen shares (components/ui/
      ListToolbar.vue, Sean, 2026-10-01): search with the filter button beside
      it. Cluster, Month, Year and "Show as" (By cluster / As a list, moved into
      the dialog by Sean, 2026-10-02) are in the filter dialog, only on the
      ledger. Ledger / To verify stay tabs: they are two different lists, not
      two drawings of one.
    -->
    <div class="flex flex-col gap-3">
      <!-- Tabs: Ledger or To verify -->
      <div role="tablist" aria-label="Income view" class="flex items-center gap-5 shrink-0">
        <button
          id="income-tab-ledger"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'ledger'"
          aria-controls="income-panel"
          :tabindex="activeTab === 'ledger' ? 0 : -1"
          :class="[
            'press text-sm cursor-pointer py-1 whitespace-nowrap',
            activeTab === 'ledger' ? 'font-bold text-brand' : 'font-normal text-ink-soft hover:text-brand',
          ]"
          @click="activeTab = 'ledger'"
          @keydown.right.prevent="activeTab = 'verify'"
        >
          Ledger
        </button>
        <button
          id="income-tab-verify"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'verify'"
          aria-controls="income-panel"
          :tabindex="activeTab === 'verify' ? 0 : -1"
          :class="[
            'press flex items-center gap-2 text-sm cursor-pointer py-1 whitespace-nowrap',
            activeTab === 'verify' ? 'font-bold text-brand' : 'font-normal text-ink-soft hover:text-brand',
          ]"
          @click="activeTab = 'verify'"
          @keydown.left.prevent="activeTab = 'ledger'"
        >
          <span>To verify</span>
          <span
            v-if="pendingPayments.length > 0"
            class="rounded-full bg-brand-soft text-brand px-2 py-0.5 text-xs tabular font-semibold"
          >
            {{ pendingPayments.length }}
          </span>
        </button>
      </div>

      <ListToolbar
        v-if="activeTab === 'ledger'"
        v-model:view="viewMode"
        v-model:search="q"
        :views="incomeViews"
        view-label="How to show the ledger"
        search-label="Search the ledger"
        :filters="incomeFilters"
        @apply="applyIncomeFilters"
      />
    </div>

    <!--
      Verification queue. Each payment is a decision, so it reads as one.

      Switching between "Ledger" and "To verify" used to be a plain DOM swap -
      an entirely different panel replacing the last one on the same frame as
      the click. `ws-reveal` gives the newly-shown panel a fade-in, which is
      a deliberate click a person makes a handful of times, not a keystroke
      that would make the motion feel like it is in the way.
    -->
    <div v-if="activeTab === 'verify'" id="income-panel" role="tabpanel" aria-labelledby="income-tab-verify" class="ws-reveal flex flex-col gap-4">
      <div v-if="isLoading" class="rounded-tile bg-tile p-6 flex flex-col gap-3" aria-busy="true">
        <span class="sr-only" role="status">Loading the verification queue</span>
        <Skeleton class-name="h-4 w-40 rounded-full" />
        <Skeleton class-name="h-20 w-full rounded-2xl" />
      </div>

      <OverviewTile v-else-if="pendingPaymentsError" class="ws-reveal" title="Payments to verify">
        <UnavailableNote
          message="The verification queue could not be loaded. This does not mean there is nothing to verify, it means we could not ask."
          @retry="fetchPayments()"
        />
      </OverviewTile>

      <OverviewTile v-else-if="pendingPayments.length === 0" tone="soft" class="ws-reveal" title="Payments to verify">
        <p class="text-2xl font-semibold tracking-tight">Nothing is waiting</p>
      </OverviewTile>

      <template v-else>
        <!-- What verifying does is said once, in the dialog where she verifies
             (Sean, 2026-10-01: fewer words). The test-account warning stays. -->
        <!--
          B-80, Sean's decision of 2026-09-28: do not verify an online payment as
          real money until the account is live. The tenant's pay dialog says the
          same; this is the side where verifying would mark a bill paid with
          nothing collected. Remove with the change that wires the live account.
        -->
        <p class="ws-reveal rounded-2xl bg-verify-soft px-4 py-3 text-sm leading-6 text-ink">
          Online GCash payments still run on Adyen's test account, so no real money reaches you yet.
          Reject these until online payment goes live.
        </p>
        <ul class="grid gap-4 md:grid-cols-2">
          <li
            v-for="(p, i) in pendingPayments"
            :key="p.id"
            class="list-reveal-item rounded-tile bg-tile p-5 sm:p-6 flex flex-col gap-4"
            :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium break-words">{{ p.profiles?.full_name || 'Name not on file' }}</p>
                <!-- Upper case, as the ledger below and the reject dialog print it. -->
                <p class="mt-0.5 text-xs text-ink-faint">
                  Unit {{ String(p.rooms?.room_number || '').toUpperCase() || 'not on file' }}<template v-if="p.profiles?.phone_number">, {{ showPhone(p.profiles.phone_number) }}</template>
                </p>
              </div>
              <StatusPill tone="verify">Waiting for you</StatusPill>
            </div>

            <p class="text-3xl leading-none font-semibold tabular tracking-tight">{{ peso(p.amount, 2) }}</p>

            <dl class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
              <div class="flex gap-1.5">
                <dt class="text-ink-faint">Method</dt>
                <dd>{{ p.payment_method }}</dd>
              </div>
              <div class="flex gap-1.5 min-w-0">
                <dt class="text-ink-faint">Reference</dt>
                <dd class="truncate">{{ p.transaction_reference || 'None recorded' }}</dd>
              </div>
              <div v-if="p.paid_at" class="flex gap-1.5">
                <dt class="text-ink-faint">Sent</dt>
                <dd>{{ new Date(p.paid_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: PROPERTY_TIMEZONE }) }}</dd>
              </div>
            </dl>

            <div class="mt-auto flex flex-wrap gap-2">
              <button
                type="button"
                class="pill-btn-brand disabled:opacity-50"
                :disabled="verifying !== null"
                :aria-busy="verifying?.id === p.id && verifying.status === 'Verified'"
                @click="verifyPayment(p.id, 'Verified')"
              >
                <Loader2 v-if="verifying?.id === p.id && verifying.status === 'Verified'" class="size-4 animate-spin" aria-hidden="true" />
                <Check v-else class="size-4" aria-hidden="true" />
                {{ verifying?.id === p.id && verifying.status === 'Verified' ? 'Verifying…' : 'Verify payment' }}
              </button>
              <button
                type="button"
                class="pill-btn-danger-quiet disabled:opacity-50"
                :disabled="verifying !== null"
                :aria-busy="verifying?.id === p.id && verifying.status === 'Rejected'"
                @click="rejectTarget = p"
              >
                <Loader2 v-if="verifying?.id === p.id && verifying.status === 'Rejected'" class="size-4 animate-spin" aria-hidden="true" />
                <X v-else class="size-4" aria-hidden="true" />
                {{ verifying?.id === p.id && verifying.status === 'Rejected' ? 'Rejecting…' : 'Reject' }}
              </button>
            </div>
          </li>
        </ul>
      </template>
    </div>

    <!-- Ledger -->
    <div v-else id="income-panel" role="tabpanel" aria-labelledby="income-tab-ledger" class="ws-reveal space-y-6">



    <!-- `SkeletonTable` is `aria-hidden="true"` throughout, so without an
         announced region a screen reader had nothing to say while the ledger
         table loaded. The "To verify" tab beside this one already pairs its
         own skeleton with a `role="status"` announcement; this tab's table
         skeleton had none. -->
    <span v-if="isLoading" class="sr-only" role="status">Loading the income ledger</span>
    <SkeletonTable v-if="isLoading" :columns="7" :rows="8" />

    <!--
      By cluster: her spreadsheet's own five sections, each with its subtotal.

      "By cluster" and "As a list" are the same rows in two different shapes,
      switched by the pill group above - a deliberate click, so the branch
      that appears gets a fade-in rather than snapping into place the way it
      did before.
    -->
    <div v-else-if="viewMode === 'grouped'" class="ws-reveal space-y-6">
      <!--
        The same empty state the "As a list" half of this screen renders, in
        the same shape - a title and a sentence under it, not one grey line.
        Two ways of reading the same ledger should not disagree about what
        "nothing found" looks like.
      -->
      <div
        v-if="displayGroups.length === 0"
        class="ws-reveal rounded-tile bg-tile px-6 py-16 text-center"
      >
        <p class="text-base font-semibold text-ink">Nothing matches</p>
      </div>

      <section
        v-for="(group, groupIndex) in displayGroups"
        :key="group.key"
        class="overflow-hidden rounded-tile bg-tile"
      >
        <h2>
          <button
            type="button"
            class="press-plate flex w-full flex-col items-start gap-3 p-5 text-left hover:bg-canvas sm:flex-row sm:flex-wrap sm:justify-between sm:p-6"
            :aria-expanded="isClusterOpen(group.key, groupIndex)"
            :aria-controls="`cluster-${group.key}`"
            @click="toggleCluster(group.key, groupIndex)"
          >
            <span class="min-w-0">
              <span class="flex items-center gap-2">
                <ChevronDown
                  :class="[
                    'size-4 shrink-0 text-ink-soft transition-transform duration-200 ease-[var(--ease-out)]',
                    isClusterOpen(group.key, groupIndex) ? '' : '-rotate-90',
                  ]"
                  aria-hidden="true"
                />
                <!-- 0.9375rem, the size every other collapsible section title in
                     the workspace uses - the cluster headers on the room
                     directory and the residents register, and OverviewTile's own
                     heading. This one was a step larger for no reason the screen
                     could give. -->
                <span class="text-[0.9375rem] font-semibold text-ink">{{ group.label }}</span>
              </span>
              <span class="mt-1 block text-sm leading-6 text-ink-soft">{{ group.desc }}</span>
            </span>

            <!-- A closed section still says what it holds. Stacked under the title on
                 a phone for every cluster alike; it used to sit beside short titles
                 and wrap under long ones, so sibling headers disagreed at 375.
                 The remitted figure is the size of the Received tile's, whole
                 pesos like it, and the entries count is gone (Loyd, 2026-10-03):
                 the figure is what she opens a cluster for. -->
            <span class="sm:text-right">
              <span class="block text-xs text-ink-faint">Remitted</span>
              <span class="tabular mt-1 block text-3xl font-semibold leading-none tracking-tight text-brand md:text-4xl">{{
                peso(group.totalRemitted)
              }}</span>
            </span>
          </button>
        </h2>

        <div
          v-if="isClusterOpen(group.key, groupIndex)"
          :id="`cluster-${group.key}`"
          class="ws-reveal border-t border-line p-5 sm:p-6"
        >
          <RecordTable
            flat
            :rows="group.records"
            :caption="`${group.label}, by unit`"
            noun="entry"
            :page-size="8"
            empty-title="Nothing in this cluster"
            :cols="CLUSTER_TABLE_COLS"
            min-width="55.25rem"
            table-from="xl"
          >
            <template #head>
              <tr>
                <th scope="col">Unit</th>
                <th scope="col">Paid</th>
                <th scope="col">Who</th>
                <th scope="col" class="num">Rent</th>
                <!-- One slot every cluster keeps, so all five tables share one
                     grid: Linda's Electricity, else empty. The 50% Share is a
                     total on the Received tile only, not a column or badge per
                     row (Loyd, 2026-10-03); the workbook keeps its column. -->
                <th scope="col" class="num">
                  <template v-if="group.key === 'Linda'">Electricity</template>
                </th>
                <!-- Heads sits under the water it sets, as on the phone cards
                     ("Water, 2 heads"); a column of its own made the ledger
                     scroll sideways at 1280. -->
                <th scope="col" class="num">Water</th>
                <th scope="col" class="num">Remitted<span class="block text-xs font-normal text-ink-faint">rent + water</span></th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </template>

            <template #row="{ row: r }">
              <tr class="group transition-colors duration-700" :class="r.id === highlightId && 'bg-brand-soft'" :data-row-id="r.id">
                <th scope="row" class="font-semibold uppercase text-ink">{{ r.unit }}</th>
                <td>
                  <span class="block whitespace-nowrap">{{ r.datePaid }}</span>
                  <span class="block whitespace-nowrap text-xs text-ink-faint">{{ r.rentFor }}</span>
                </td>
                <td>
                  <span class="block wrap-anywhere text-ink">{{ r.contact }}</span>
                  <span v-if="r.invoice" class="block font-mono text-xs text-ink-faint">{{
                    r.invoice
                  }}</span>
                </td>
                <td class="num font-semibold text-ink">{{ peso(r.rent, 2) }}</td>
                <td v-if="group.key === 'Linda'" class="num font-semibold text-brand">
                  {{ peso(r.linda?.electricity || 0, 2) }}
                </td>
                <td v-else></td>
                <td class="num">
                  <span class="block font-semibold text-ink">{{ peso(r.water, 2) }}</span>
                  <span class="block text-xs text-ink-faint">{{ headsLabel(r.occupants) }}</span>
                </td>
                <td class="num font-semibold text-brand">
                  {{ peso(r.rent + r.water, 2) }}
                </td>
                <td class="num">
                  <button
                    type="button"
                    class="press-plate icon-btn-plain row-action"
                    :aria-label="`Edit ${r.contact}'s record`"
                    title="Edit"
                    @click="startEditIncome(r)"
                  >
                    <Pencil class="size-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </template>

            <template #foot>
              <tr>
                <th scope="row" colspan="3">{{ group.label }}, all {{ group.records.length }}</th>
                <td class="num">{{ peso(group.totalRent, 2) }}</td>
                <td v-if="group.key === 'Linda'" class="num text-brand">
                  {{ peso(group.records.reduce((sum, r) => sum + (r.linda?.electricity || 0), 0), 2) }}
                </td>
                <td v-else></td>
                <td class="num">
                  <span class="block">{{ peso(group.totalWater, 2) }}</span>
                  <span class="block text-xs font-normal text-ink-faint">{{ headsLabel(group.totalOccupants) }}</span>
                </td>
                <td class="num text-brand">{{ peso(group.totalRemitted, 2) }}</td>
                <td></td>
              </tr>
            </template>

            <!--
              The same subtotal as the `foot` row above it, in the card shape
              this register already uses on a phone. Without it, below `lg`
              every one of these figures disappeared and the cluster header's
              "Remitted" was the only total left on the screen - so a month
              checked on a phone had no breakdown at all.

              Same arithmetic, same fields, same order as the table foot; the
              headcount rides on the Water label the way it does on a row card
              rather than becoming a column of its own.
            -->
            <template #foot-card>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-ink">
                    {{ group.label }}, all {{ group.records.length }}
                  </p>
                  <!-- Only when some entries are still behind "Show more" (page size 8). -->
                  <p v-if="group.records.length > 8" class="mt-0.5 text-xs text-ink-faint">
                    Every entry in this cluster, not only the ones shown
                  </p>
                </div>
                <!-- Labelled, as the desktop column header labels it; on a phone the
                     figure sat there with no name, beside a rent twice its size. -->
                <p class="tabular shrink-0 text-right text-base font-semibold text-brand">
                  <span class="block text-xs font-normal text-ink-faint">Remitted</span>
                  {{ peso(group.totalRemitted, 2) }}
                </p>
              </div>

              <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt class="text-xs text-ink-faint">Rent</dt>
                  <dd class="tabular font-semibold text-ink">{{ peso(group.totalRent, 2) }}</dd>
                </div>
                <div v-if="group.key === 'Linda'">
                  <dt class="text-xs text-ink-faint">Electricity</dt>
                  <dd class="tabular font-semibold text-brand">
                    {{ peso(group.records.reduce((sum, r) => sum + (r.linda?.electricity || 0), 0), 2) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-ink-faint">Water, {{ headsLabel(group.totalOccupants) }}</dt>
                  <dd class="tabular font-semibold text-ink">{{ peso(group.totalWater, 2) }}</dd>
                </div>
              </dl>
            </template>

            <template #card="{ row: r }">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-lg font-bold uppercase leading-none text-ink">{{ r.unit }}</p>
                  <p class="mt-1 truncate text-sm text-ink-soft">{{ r.contact }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <span class="block text-xs font-normal text-ink-faint">Remitted</span>
                  <span class="tabular text-xl font-bold text-brand">{{ peso(r.rent + r.water, 2) }}</span>
                </div>
              </div>

              <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/60 pt-2.5 text-xs">
                <div>
                  <dt class="text-ink-faint">Paid</dt>
                  <dd class="mt-0.5 font-medium text-ink">{{ r.datePaid }}</dd>
                </div>
                <div>
                  <dt class="text-ink-faint">Covering</dt>
                  <dd class="mt-0.5 font-medium text-ink">{{ r.rentFor }}</dd>
                </div>
                <div>
                  <dt class="text-ink-faint">Rent</dt>
                  <dd class="tabular mt-0.5 text-base font-semibold text-ink">{{ peso(r.rent, 2) }}</dd>
                </div>
                <div>
                  <dt class="text-ink-faint">Water, {{ headsLabel(r.occupants) }}</dt>
                  <dd class="tabular mt-0.5 text-base font-semibold text-ink">{{ peso(r.water, 2) }}</dd>
                </div>
              </dl>

              <div class="mt-2.5 flex justify-end">
                <button
                  type="button"
                  class="press-plate icon-btn-plain row-action -mr-3 -mb-1"
                  :aria-label="`Edit ${r.unit.toUpperCase()}, ${r.invoice || r.contact}`"
                  title="Edit"
                  @click="startEditIncome(r)"
                >
                  <Pencil class="size-4" aria-hidden="true" />
                </button>
              </div>
            </template>
          </RecordTable>
        </div>
      </section>
    </div>

    <!-- All together: every cluster in one register -->
    <RecordTable
      v-else
      class="ws-reveal"
      :rows="rows"
      caption="Every collection on screen, with unit, date, who paid, rent, water and what was remitted"
      noun="entry"
      :page-size="12"
      table-from="xl"
      empty-title="Nothing matches"
    >
      <template #head>
        <tr>
          <th scope="col">Unit</th>
          <th scope="col">Paid</th>
          <th scope="col">Who</th>
          <th scope="col" class="num">Rent</th>
          <th scope="col" class="num">Heads</th>
          <th scope="col" class="num">Water</th>
          <th scope="col" class="num">Remitted<span class="block text-xs font-normal text-ink-faint">rent + water</span></th>
          <th scope="col"><span class="sr-only">Actions</span></th>
        </tr>
      </template>

      <template #row="{ row: r }">
        <tr class="group transition-colors duration-700" :class="r.id === highlightId && 'bg-brand-soft'" :data-row-id="r.id">
          <th scope="row">
            <span class="block font-semibold uppercase text-ink">{{ r.unit }}</span>
            <span class="block text-xs font-normal text-ink-faint">{{ r.cluster }}</span>
          </th>
          <td>
            <span class="block whitespace-nowrap">{{ r.datePaid }}</span>
            <span class="block whitespace-nowrap text-xs text-ink-faint">{{ r.rentFor }}</span>
          </td>
          <td>
            <span class="block wrap-anywhere text-ink">{{ r.contact }}</span>
            <span v-if="r.invoice" class="block font-mono text-xs text-ink-faint">{{
              r.invoice
            }}</span>
          </td>
          <td class="num font-semibold text-ink">{{ peso(r.rent, 2) }}</td>
          <td class="num">{{ r.occupants }}</td>
          <td class="num font-semibold text-ink">{{ peso(r.water, 2) }}</td>
          <td class="num font-semibold text-brand">
            {{ peso(r.rent + r.water, 2) }}
          </td>
          <td class="num">
            <button
              type="button"
              class="press-plate icon-btn-plain row-action"
              :aria-label="`Edit ${r.contact}'s record`"
                    title="Edit"
              @click="startEditIncome(r)"
            >
              <Pencil class="size-4" aria-hidden="true" />
            </button>
          </td>
        </tr>
      </template>

      <template #foot>
        <tr>
          <th scope="row" colspan="3">All {{ rows.length }} on screen</th>
          <td class="num">{{ peso(totalRent, 2) }}</td>
          <td class="num">{{ rows.reduce((sum, r) => sum + r.occupants, 0) }}</td>
          <td class="num">{{ peso(totalWater, 2) }}</td>
          <!-- The column's own sum: every row is rent + water (BR-038). -->
          <td class="num text-brand">{{ peso(totalRemitted, 2) }}</td>
          <td></td>
        </tr>
      </template>

      <!--
        The phone half of the `foot` row above. Every figure in it was missing
        below `lg`, on the one screen a landlady is most likely to check away
        from a desk.

        Each figure is the same computed total the table foot prints, taken
        from the same names - nothing is re-derived here.

        The headline is `totalRemitted`, the same figure the table foot prints.
      -->
      <template #foot-card>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-ink">All {{ rows.length }} on screen</p>
            <!-- Only when some entries are still behind "Show more" (page size 12). -->
            <p v-if="rows.length > 12" class="mt-0.5 text-xs text-ink-faint">
              Every entry the filters allow, not only the ones shown
            </p>
          </div>
          <p class="tabular shrink-0 text-right text-base font-semibold text-brand">
            <span class="block text-xs font-normal text-ink-faint">Remitted</span>
            {{ peso(totalRemitted, 2) }}
          </p>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt class="text-xs text-ink-faint">Rent</dt>
            <dd class="tabular font-semibold text-ink">{{ peso(totalRent, 2) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-faint">
              Water, {{ headsLabel(rows.reduce((sum, r) => sum + r.occupants, 0)) }}
            </dt>
            <dd class="tabular font-semibold text-ink">{{ peso(totalWater, 2) }}</dd>
          </div>
        </dl>
      </template>

      <template #card="{ row: r }">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-lg font-bold uppercase leading-none text-ink">{{ r.unit }}</p>
            <p class="mt-1 truncate text-sm text-ink-soft">{{ r.cluster }}, {{ r.contact }}</p>
          </div>
          <div class="shrink-0 text-right">
            <span class="block text-xs font-normal text-ink-faint">Remitted</span>
            <span class="tabular text-xl font-bold text-brand">{{ peso(r.rent + r.water, 2) }}</span>
          </div>
        </div>

        <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line/60 pt-2.5 text-xs">
          <div>
            <dt class="text-ink-faint">Paid</dt>
            <dd class="mt-0.5 font-medium text-ink">{{ r.datePaid }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">Covering</dt>
            <dd class="mt-0.5 font-medium text-ink">{{ r.rentFor }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">Rent</dt>
            <dd class="tabular mt-0.5 text-base font-semibold text-ink">{{ peso(r.rent, 2) }}</dd>
          </div>
          <div>
            <dt class="text-ink-faint">Water, {{ headsLabel(r.occupants) }}</dt>
            <dd class="tabular mt-0.5 text-base font-semibold text-ink">{{ peso(r.water, 2) }}</dd>
          </div>
        </dl>

        <div class="mt-2.5 flex justify-end">
          <button
            type="button"
            class="press-plate icon-btn-plain row-action -mr-3 -mb-1"
            :aria-label="`Edit ${r.unit.toUpperCase()}, ${r.invoice || r.contact}`"
            title="Edit"
            @click="startEditIncome(r)"
          >
            <Pencil class="size-4" aria-hidden="true" />
          </button>
        </div>
      </template>
    </RecordTable>

  </div>

    <!-- Edit Payment Modal -->
    <WsModal
      v-if="isEditOpen"
      title="Edit this payment"
      :subtitle="editingIncome ? `Unit ${editingIncome.unit.toUpperCase()}${editingIncome.invoice ? `, invoice ${editingIncome.invoice}` : ''}` : undefined"
      size="lg"
      :dismissible="false"
      @close="isEditOpen = false"
    >

        <!-- This form's own button row is kept on the bottom edge by `.ws-modal-body .ws-actions` (index.css) now, and WsModal's body does the scrolling (2026-10-03). -->
        <form @submit.prevent="handleEditIncome" class="text-xs">
          <div class="space-y-4">
          <!-- Room/Unit selector -->
          <div>
            <p
              v-if="roomsFetchFailed"
              class="mb-1.5 text-xs leading-snug text-verify"
            >
              The unit list could not be refreshed, so the number of people has <strong>not</strong>
              been filled in. Enter it yourself. It sets the water on this payment.
            </p>
            <!-- The warning above belongs to this field, so the label wraps the
                 select rather than sitting beside it unassociated. -->
            <label class="ws-field">
              Unit
              <PillSelect v-model="editUnit" :options="editUnitOptions" aria-label="Unit" widthClass="w-full" />
            </label>
          </div>

          <!-- Rent Amount & Water Payment Row -->
          <!-- Two up on a phone as well: short money fields that read as a
               pair, 146px each at 375 with no overflow. -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4">
            <label class="ws-field">
              Rent
              <!--
                `step="any"`: without it, `type="number"` defaults to a whole-number
                step, and the browser's native constraint validation silently blocks
                the submit event on any centavo value - no error, no app code runs,
                just a tooltip the user may not see. `money` (backend/src/utils/
                validators.ts) explicitly allows two decimal places and the columns
                are `numeric(10,2)`, so a real centavo correction on this ledger was
                unsubmittable from this dialog. ExpensesLedgerView's equivalent
                amount field already carries this.
              -->
              <input v-model.number="editRent" type="number" min="0" step="any" class="ws-input w-full" required />
            </label>
            <label class="ws-field">
              Water
              <input v-model.number="editWater" type="number" min="0" step="any" class="ws-input w-full" required />
            </label>
          </div>

          <!-- Invoice number: optional, because not every payment has one. Typed,
               or ACK for a slip with no number (Sean, 2026-10-01), with the
               same in-box button as the Record payment form (InvoiceField). -->
          <div class="ws-field">
            <InvoiceField id="edit-invoice" v-model="editInvoice" label="Invoice or acknowledgement receipt (if any)" />
          </div>

          <!-- Payment Method & Online Reference Number Row -->
          <!-- Full width on a phone on purpose, unlike the money pairs above:
               a reference is a long string typed off an invoice. -->
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="ws-field">
              How they paid
              <PillSelect v-model="editMethod" :options="editMethodOptions" aria-label="How they paid" widthClass="w-full" />
            </label>
            <label class="ws-field" :class="{ 'opacity-40': !methodHasReference }">
              Their reference number
              <input v-model="editReference" type="text" :placeholder="editMethod === 'Bank Transfer' ? 'Bank reference' : 'GCash reference'" class="ws-input w-full" :disabled="!methodHasReference" :required="methodHasReference" />
            </label>
          </div>

          <!-- Rent Validity / Duration Details Row -->
          <!--
            Two short numbers stay two up on a phone; the dates do not (Sean,
            2026-10-01: "Covering from and Covering to are beside each other,
            covering each other"). The note here used to say two up cost
            nothing because a date field measured 144px in a 146px box - in
            Chrome at 14px. At the phone's 16px it measured 118px and showed
            "mm/dd/" and "09/02/2", and a phone's own date control is wider
            still, which is what ran into its neighbour and scrolled the dialog
            sideways. A date takes the whole row on a phone and half from 640px.
          -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4">
            <label class="ws-field">
              Months covered
              <input v-model.number="editMonthsCovered" type="number" min="1" class="ws-input w-full" required />
            </label>
            <label class="ws-field">
              How many people
              <input v-model.number="editOccupants" type="number" min="1" max="50" class="ws-input w-full" required />
              <span class="ws-hint">Water is charged per person.</span>
            </label>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="ws-field">
              Covering from
              <input v-model="editDateCoveredStart" type="date" class="ws-input w-full" />
              <span class="ws-hint">Leave blank to follow their billing cycle.</span>
            </label>
            <label class="ws-field">
              Covering to
              <input :value="editDateCoveredEnd" type="date" class="ws-input w-full" disabled />
            </label>
          </div>

          <!-- Date Received & Read-Only Total Amount calculation. Stacked on a
               phone for the same reason as the dates above, and the total gets
               a full row to itself rather than a cramped half beside a date. -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="ws-field">
              Date received
              <input v-model="editDate" type="date" class="ws-input w-full" required />
            </label>
            <!-- The same total box the payment form uses, so the twins read alike. -->
            <div class="rounded-2xl bg-canvas px-4 py-3 sm:self-end">
              <p class="text-xs text-ink-faint">Total</p>
              <p class="tabular mt-0.5 text-lg font-semibold leading-none text-brand">{{ peso(editTotal, 2) }}</p>
            </div>
          </div>

          </div>

          <!--
            THIS IS THE FOOTER THE CLIENT PHOTOGRAPHED WITH "Update Collection"
            CUT OFF AT THE RIGHT EDGE.

            It was `flex items-center justify-between` with no wrapping, so the
            three buttons were laid out on one line whatever the room. Measured
            in the running app at a 375px viewport: the row's content came to
            446px inside a 303px box - 143px of overflow - and the submit
            button's right edge landed at x=482 against a content column that
            ends at 339. `body` carries `overflow-x: hidden`, so it was clipped
            rather than reachable by scrolling sideways: the button that saves
            a correction to the ledger could not be fully seen and its right
            half could not be pressed.

            Wrapping fixed the clipping and left three buttons of three widths
            (Sean, 2026-10-01). `.ws-actions` (index.css) is the one footer
            rule now: Cancel and Save changes as equal halves, Delete payment
            a full row of its own beneath them at the same height, and from
            640px one line with Delete at the far left.
          -->
          <div class="ws-actions mt-4 pt-4 border-t border-line">
            <button
              type="button"
              @click="handleDeleteFromModal"
              class="pill-btn-danger-quiet ws-action-apart"
            >
              <Trash2 class="size-4" aria-hidden="true" />
              <span>Delete payment</span>
            </button>
            <button type="button" @click="isEditOpen = false" class="pill-btn">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
              <Check v-else class="size-4" aria-hidden="true" />
              <span>Save changes</span>
            </button>
          </div>
        </form>
    </WsModal>

    <!-- Confirmation -->
    <ConfirmDialog
      v-if="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-label="Delete payment"
      destructive
      :busy="isSubmitting"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmAccept"
    />

    <WsModal
      v-if="openedPayment"
      title="Payment to verify"
      :subtitle="`${openedPayment.profiles?.full_name || 'Name not on file'}, unit ${String(openedPayment.rooms?.room_number || '').toUpperCase() || 'not on file'}`"
      @close="openedPayment = null"
    >
      <div class="flex flex-col gap-5">
        <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(openedPayment.amount, 2) }}</p>

        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <template v-if="billPeriodText(openedPayment.bills)">
            <dt class="text-ink-faint">For</dt>
            <dd>{{ billPeriodText(openedPayment.bills) }}</dd>
          </template>
          <template v-if="openedPayment.bills">
            <dt class="text-ink-faint">Rent</dt>
            <dd class="tabular">{{ peso(Number(openedPayment.bills.rent_amount) || 0, 2) }}</dd>
            <dt class="text-ink-faint">Water</dt>
            <dd class="tabular">{{ peso(Number(openedPayment.bills.water_amount) || 0, 2) }}</dd>
          </template>
          <dt class="text-ink-faint">Method</dt>
          <dd>{{ openedPayment.payment_method }}</dd>
          <dt class="text-ink-faint">Reference</dt>
          <dd class="break-all">{{ openedPayment.transaction_reference || 'None recorded' }}</dd>
          <template v-if="openedPayment.paid_at">
            <dt class="text-ink-faint">Sent</dt>
            <dd>{{ sentAtText(openedPayment.paid_at) }}</dd>
          </template>
          <template v-if="openedPayment.profiles?.phone_number">
            <dt class="text-ink-faint">Phone</dt>
            <dd>{{ showPhone(openedPayment.profiles.phone_number) }}</dd>
          </template>
        </dl>

        <p class="text-sm leading-6 text-ink-soft">
          Verifying marks the bill as paid and adds it to the ledger.
        </p>
      </div>

      <template #actions>
        <button
          type="button"
          class="pill-btn-danger-quiet ws-action-apart disabled:opacity-50"
          :disabled="verifying !== null"
          @click="rejectOpenedPayment"
        >
          <X class="size-4" aria-hidden="true" />
          Reject
        </button>
        <button
          type="button"
          class="pill-btn-brand disabled:opacity-50"
          :disabled="verifying !== null"
          :aria-busy="verifying?.id === openedPayment.id"
          @click="verifyOpenedPayment"
        >
          <Loader2 v-if="verifying?.id === openedPayment.id" class="size-4 animate-spin" aria-hidden="true" />
          <Check v-else class="size-4" aria-hidden="true" />
          {{ verifying?.id === openedPayment.id ? 'Verifying…' : 'Verify payment' }}
        </button>
      </template>
    </WsModal>

    <ConfirmDialog
      v-if="rejectTarget"
      title="Reject this payment?"
      :message="rejectMessage"
      confirm-label="Reject payment"
      destructive
      @cancel="rejectTarget = null"
      @confirm="confirmReject"
    />
  </div>
</template>
