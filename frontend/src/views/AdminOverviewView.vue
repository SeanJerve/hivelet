<!--
  @file views/AdminOverviewView.vue
  @description The landlady's overview. The live year leads with what needs her action (payments
    to verify, urgent repairs), then this month's collections, occupancy, the year by month, and
    cash flow. Past years open as an archive with full ledgers.
  @systemBibleRef docs/01_SYSTEM_BIBLE.md Section 17 (Dashboard & Financial Reporting)
  @designRef docs/DESIGN_GUIDELINE.md (workspace system), docs/OVERVIEW_AUDIT_2026-09-17.md
  @businessRules BR-017 (Payment Verification), BR-029 (Current Month Dashboard),
    BR-035 (50% Share Is Derived), BR-043/BR-044 (Categorized Operating Expenses)
-->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useLiveRefresh } from '@/lib/live';
import { useRouter, useRoute } from 'vue-router';
import { api } from '@/lib/api';
import { writesUnavailable } from '@/lib/offlineCache';
import { currentUser } from '@/lib/authStore';
import {
  rooms,
  incomeRecords,
  expenseRecords,
  maintenanceTickets,
  fetchRooms,
  fetchIncomeRecords,
  fetchExpenseRecords,
  fetchMaintenanceTickets,
  fetchTenants,
  fetchInquiries,
  inquiries,
  inquiriesFetchFailed,
  waterChargeFor,
  type RoomItem,
  type MaintenanceTicket,
  roomsFetchFailed,
  incomeRecordsFetchFailed,
  expenseRecordsFetchFailed,
  maintenanceTicketsFetchFailed,
} from '@/lib/systemState';
import { CLUSTERS, peso as pesoFixed, pesoExact, wholePercents } from '@/lib/canonicalUnits';
// Every money figure on this page is shown as it is, centavos included when there are any
// (lib/canonicalUnits.ts, pesoExact), so a total always equals the parts listed under it.
const peso = (value: number, decimals?: number) => (decimals === undefined ? pesoExact(value) : pesoFixed(value, decimals));
import { propertyToday } from '@/lib/propertyDate';
import { pickedYear } from '@/lib/yearScope';
import { screenRef, screenLoaded } from '@/lib/screenCache';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import MonthCapsules from '@/components/overview/MonthCapsules.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import YearMenu from '@/components/ui/YearMenu.vue';
import QuickActionsFab from '@/components/overview/QuickActionsFab.vue';
import { greetingName, usePartOfDay } from '@/lib/greeting';
import { payersOn, samePerson } from '@/lib/tenantHistory';
import type { CapsuleMonth, QuickAction, Segment } from '@/components/overview/types';
import {
  Plus,
  ReceiptText,
  DoorOpen,
  ArrowUpRight,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

// Kept between visits (lib/screenCache.ts): the skeleton is for the first load only, and coming
// back to the page shows what it held while the figures are read again.
const pendingPayments = screenRef<any[]>('overview.pending', []);
/** True when the verification queue could not be read, so 0 is not reported as fact. */
const pendingPaymentsFailed = ref(false);
const isRefreshing = ref(false);
const overviewLoaded = screenLoaded('overview');
const isInitialLoading = ref(!overviewLoaded.value);

/**
 * Read from the clock, not pinned to a literal. Every "live" figure filters on
 * `r.year === CURRENT_YEAR`, so a literal would read zero from 1 January. The
 * labels read it too: they used to say 2026 in six places regardless.
 *
 * And read from the PROPERTY'S clock, not the viewer's. These were
 * `new Date().getFullYear()` and `.getMonth()`, which is whatever the browser
 * believes - so a machine set to a timezone behind UTC+8 reads the wrong year
 * for its first eight hours of January, and the dashboard's whole
 * year-to-date, month chart and archive list follow it. `lib/propertyDate.ts`
 * exists for exactly this and says so in its header: both halves "anchor to the
 * property, not to whoever happens to be looking". The form defaults already
 * used it; these two did not.
 */
const CURRENT_YEAR = Number(propertyToday().slice(0, 4));
const CURRENT_MONTH = Number(propertyToday().slice(5, 7));

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/* ========================================================================== *
 * Greeting
 * ========================================================================== */

// Morning, noon, afternoon or evening by the property's clock, kept current
// while the page stays open (lib/greeting.ts).
const firstName = computed(() => greetingName(currentUser.value?.fullName));
const partOfDay = usePartOfDay();

// Without the year: the year after it is the year menu (Sean, 13 Oct 2026). From the property's
// clock, like CURRENT_YEAR, so the day and the year beside it can never disagree. Noon, so no
// timezone moves the day.
const todayLabel = new Date(`${propertyToday()}T12:00:00`).toLocaleDateString('en-PH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/* ========================================================================== *
 * Live year or archive, synchronised with ?archiveYear=
 * ========================================================================== */

const isHistoricalMode = ref(false);
const selectedArchiveYear = ref<string>(String(CURRENT_YEAR - 1));

const availableHistoricalYears = computed(() => {
  const years = new Set<string>();
  incomeRecords.forEach((r) => {
    if (r.year && r.year < CURRENT_YEAR) years.add(String(r.year));
  });
  expenseRecords.forEach((e) => {
    if (e.year && e.year < CURRENT_YEAR) years.add(String(e.year));
  });
  const list = Array.from(years).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  return list.length > 0 ? list : [String(CURRENT_YEAR - 1), String(CURRENT_YEAR - 2)];
});

function syncFromRoute() {
  const qYear = route.query.archiveYear;
  if (typeof qYear === 'string' && qYear) pickedYear.value = qYear;
  if (typeof qYear === 'string' && availableHistoricalYears.value.includes(qYear)) {
    isHistoricalMode.value = true;
    selectedArchiveYear.value = qYear;
  } else {
    isHistoricalMode.value = false;
    if (!qYear) followPickedYear();
  }
}

watch(() => route.query.archiveYear, syncFromRoute);

/**
 * Opens the archive for a past year picked here or on a ledger. This year,
 * "All years", or a year with no records leaves the live year showing. Runs
 * again when the first load settles, since the past years come from records
 * that may still be loading. The route check stops it writing `?archiveYear=`
 * onto another page's address mid-navigation.
 */
function followPickedYear() {
  const year = pickedYear.value;
  if (route.name !== 'AdminOverview' || isHistoricalMode.value || !year) return;
  if (availableHistoricalYears.value.includes(year)) enterHistoricalMode(year);
}

// The switch used to show a 180 ms skeleton although every figure was already in
// memory: a loading state with nothing loading. It is instant now.
function enterHistoricalMode(year: string) {
  selectedArchiveYear.value = year;
  isHistoricalMode.value = true;
  pickedYear.value = year;
  router.replace({ query: { ...route.query, archiveYear: year } });
}

function exitHistoricalMode() {
  isHistoricalMode.value = false;
  pickedYear.value = String(CURRENT_YEAR);
  const nextQuery = { ...route.query };
  delete nextQuery.archiveYear;
  router.replace({ query: nextQuery });
}

const yearOptions = computed(() => [String(CURRENT_YEAR), ...availableHistoricalYears.value]);
const shownYear = computed(() => (isHistoricalMode.value ? selectedArchiveYear.value : String(CURRENT_YEAR)));
const yearMenuOptions = computed(() =>
  yearOptions.value.map((y) => ({ value: y, label: y === String(CURRENT_YEAR) ? `${y}, this year` : y }))
);

// The menu itself is YearMenu now (components/ui), shared with both ledgers (19 Oct 2026).
function chooseYear(year: string) {
  if (year === String(CURRENT_YEAR)) exitHistoricalMode();
  else enterHistoricalMode(year);
}

/**
 * Her three regular actions, in priority order, written once for both places
 * they appear (Sean, 2026-10-01): the header row from 768px, and the floating
 * button on a phone (QuickActionsFab), so the two cannot point at different
 * places. The header shows them reversed, the primary last at the right edge.
 *
 * Move someone in/out is as much her regular work as a receipt (Sean,
 * 2026-09-30). One action, to the Tenants page, because both start there.
 * Like the other two it opens its dialog on arrival, "Move someone in"
 * (Loyd, 2026-10-03); moving out needs the list to choose who (Edit > Move
 * them out), and that dialog says so in one line.
 */
const quickActions: QuickAction[] = [
  { to: '/admin/income?openPayment=1', label: 'Record payment', icon: Plus, primary: true },
  { to: '/admin/expenses?openExpense=1', label: 'Record expense', icon: ReceiptText },
  { to: '/admin/tenants?openMoveIn=1', label: 'Move someone in/out', icon: DoorOpen },
];
const headerActions = [...quickActions].reverse();

/* ========================================================================== *
 * Loading
 * ========================================================================== */

// The payments waiting for her stay current; the rest is refreshed by lib/live.ts.
useLiveRefresh(() => loadPayments());

async function loadPayments() {
  try {
    const data = await api.get<any[]>('/admin/payments');
    if (data && Array.isArray(data)) {
      pendingPayments.value = data.filter((p) => p.verification_status === 'Pending Verification');
    }
    pendingPaymentsFailed.value = false;
  } catch {
    // Left silent, a failed load rendered "0 awaiting verification", which is a
    // claim, not an absence. The attention tile says the queue is unavailable.
    pendingPaymentsFailed.value = true;
  }
}

async function refreshAllData() {
  /**
   * A retry after a failure goes back behind the first-load skeleton.
   *
   * Each `fetch*` in systemState clears its failure flag BEFORE its request, and
   * the arrays a failed load left empty are still empty, so for the length of
   * the retry every affected tile rendered its figures from nothing: ₱0
   * collected, ₱0 net (B-61). Zero is a claim; loading is not.
   */
  if (anyLoadFailed.value) isInitialLoading.value = true;
  const wasLoading = isInitialLoading.value;
  isRefreshing.value = true;
  try {
    await Promise.allSettled([
      fetchRooms(),
      fetchIncomeRecords(),
      fetchExpenseRecords(),
      fetchMaintenanceTickets(),
      fetchTenants(),
      fetchInquiries(),
      loadPayments(),
    ]);
  } finally {
    isRefreshing.value = false;
    isInitialLoading.value = false;
    // A failed first read is shown again behind the skeleton on the next visit, not as zeros.
    overviewLoaded.value = !anyLoadFailed.value;
    // The watch below only runs on the first load; a revisit settles the year here.
    if (!wasLoading) followPickedYear();
  }
}

watch(isInitialLoading, (loading) => {
  if (!loading) followPickedYear();
});

onMounted(() => {
  syncFromRoute();
  refreshAllData();
});


const anyLoadFailed = computed(
  () =>
    pendingPaymentsFailed.value ||
    roomsFetchFailed.value ||
    incomeRecordsFetchFailed.value ||
    expenseRecordsFetchFailed.value ||
    maintenanceTicketsFetchFailed.value
);

/* ========================================================================== *
 * 1. Live year
 * ========================================================================== */

const liveIncomeRecords = computed(() => incomeRecords.filter((r) => r.year === CURRENT_YEAR));
const liveExpenseRecords = computed(() => expenseRecords.filter((e) => e.year === CURRENT_YEAR));


function isOccupied(r: RoomItem) {
  return r.status === 'settled' || r.status === 'pending' || r.tenant !== null;
}

const vacantUnits = computed(() => rooms.filter((r) => !isOccupied(r)));

const pendingCount = computed(() => pendingPayments.value.length);
const pendingTotal = computed(() => pendingPayments.value.reduce((s, p) => s + (Number(p.amount) || 0), 0));

/** Rows each part of Needs your attention lists before the rest become a count (Lloyd, 3 Nov 2026). */
const ATTENTION_ROWS = 3;
const pendingPreview = computed(() =>
  [...pendingPayments.value]
    .sort((a, b) => String(b.paid_at ?? '').localeCompare(String(a.paid_at ?? '')))
    .slice(0, ATTENTION_ROWS)
    .map((p) => ({
      id: String(p.id),
      name: p.profiles?.full_name ?? 'Name not recorded',
      // The code on the door, not an upper-cased version of it.
      unit: p.rooms?.room_number ? String(p.rooms.room_number) : '',
      amount: Number(p.amount) || 0,
      date: p.paid_at
        ? new Date(p.paid_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        : '',
    }))
);

// Closed counts as done too: `ticket_status_type` has both, and a closed ticket
// in the open list would overstate the outstanding work.
const openTickets = computed(() =>
  maintenanceTickets.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed')
);
const urgentTickets = computed(() =>
  openTickets.value.filter((t) => t.priority === 'Emergency' || t.priority === 'High')
);
const PRIORITY_RANK: Record<MaintenanceTicket['priority'], number> = { Emergency: 0, High: 1, Medium: 2, Low: 3 };

/**
 * BR-029: the dashboard defaults to the current month. The year figure is kept
 * beside it, because the month-by-month chart is built on the year.
 */
const currentMonthRevenue = computed(() =>
  liveIncomeRecords.value
    .filter((r) => r.month === CURRENT_MONTH)
    .reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0)
);

const currentMonthRecordCount = computed(
  () => liveIncomeRecords.value.filter((r) => r.month === CURRENT_MONTH).length
);

/**
 * Needs your attention holds two parts side by side, payments on the left and urgent repairs on
 * the right, and a part with nothing waiting is not drawn (Lloyd, 3 Nov 2026: "if the payment is
 * one only and there's no urgent repairs, then that whole card will only have one"). Each lists
 * three at most; the rest are a count and a link. A failed load still shows its part: "could not
 * be loaded" is not a zero (B-61).
 */
const paymentsWaiting = computed(() => pendingPaymentsFailed.value || pendingCount.value > 0);
const repairsWaiting = computed(() => maintenanceTicketsFetchFailed.value || urgentTickets.value.length > 0);
/** The third part (Sean, 5 Nov 2026): inquiries waiting for an answer. */
const inquiriesWaiting = computed(() => inquiriesFetchFailed.value || inquiries.some((i) => i.status === 'Pending'));
/** How many parts are showing, one to three; two or more take the whole row. */
const attentionParts = computed(() => [paymentsWaiting.value, repairsWaiting.value, inquiriesWaiting.value].filter(Boolean).length);
const attentionBoth = computed(() => attentionParts.value >= 2);
const urgentPreview = computed(() =>
  [...urgentTickets.value].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]).slice(0, ATTENTION_ROWS)
);



/** The latest month of this year that has any collection entered, or 0. */


// Base monthly run-rate from currently occupied rooms, at the configured water
// rate (BR-014). Every unit is billed per head, Linda's included - see
// `waterChargeFor` in systemState.ts for why the flat LF/LB figures went.
//
// Linda's water is left out (figures audit, 6 Nov 2026). The months this estimate stands beside
// are rent plus `water_payment`, and Linda's water is never in `water_payment`: migration 041
// routes it to `linda_water_charge`, remitted to Linda. Counting it put ₱600 a month (LF 2 heads,
// LB 1) into the expected December that no recorded month could ever hold.
const projectedWater = (r: RoomItem) => (r.cluster === 'Linda Units' ? 0 : waterChargeFor(r.unitCode, r.occupants || 1));

const baseMonthlyRunRate = computed(() =>
  rooms.reduce((sum, r) => {
    if (!isOccupied(r)) return sum;
    return sum + Number(r.price || 0) + projectedWater(r);
  }, 0)
);

const baseMonthlyWater = computed(() =>
  rooms.reduce((sum, r) => {
    if (!isOccupied(r)) return sum;
    return sum + projectedWater(r);
  }, 0)
);

/**
 * This year's recorded expenses as a share of recorded income, used to estimate
 * future months instead of a flat 15%. Null when there is nothing to derive it
 * from, in which case nothing is estimated.
 */
const observedExpenseRatio = computed<number | null>(() => {
  const income = liveIncomeRecords.value.reduce((s, r) => s + Number(r.totalRemitted || r.rent || 0), 0);
  const expenses = liveExpenseRecords.value.reduce(
    (s, e) => s + Number(e.rentalAmount ?? e.totalAmount ?? 0),
    0
  );
  if (income <= 0 || expenses <= 0) return null;
  return expenses / income;
});

interface MonthIncomeData {
  month: string;
  monthNum: number;
  hasIncome: boolean;
  /** Any expense entry at all this month. None means not entered, not "cost nothing". */
  hasExpenses: boolean;
  grossIncome: number;
  waterIncome: number;
  /** Operating expenses only. Personal/Main House costs are excluded (OD-05). */
  expenses: number;
  /** Non-rental costs recorded in the same ledger. Shown for transparency, never subtracted. */
  personalExpenses: number;
  noi: number;
  isProjected: boolean;
}

const live12MonthsData = computed<MonthIncomeData[]>(() =>
  MONTH_NAMES.map((name, idx) => {
    const monthNum = idx + 1;
    const matchingRecords = liveIncomeRecords.value.filter((r) => r.month === monthNum);
    const matchingExpenses = liveExpenseRecords.value.filter((e) => e.month === monthNum);
    // Only the rental portion may be subtracted from income. "Main House" is Mrs. Fe's own
    // residence and "Other / Personal" is personal by definition (OD-05, confirmed 2026-09-13).
    const recordedExpenses = matchingExpenses.reduce((sum, e) => sum + Number(e.rentalAmount ?? e.totalAmount ?? 0), 0);
    const recordedPersonal = matchingExpenses.reduce((sum, e) => sum + Number(e.personalAmount ?? 0), 0);

    if (matchingRecords.length > 0) {
      const grossIncome = matchingRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
      return {
        month: name,
        monthNum,
        hasIncome: true,
        hasExpenses: matchingExpenses.length > 0,
        grossIncome,
        waterIncome: matchingRecords.reduce((sum, r) => sum + Number(r.water || 0), 0),
        expenses: recordedExpenses,
        personalExpenses: recordedPersonal,
        noi: grossIncome - recordedExpenses,
        isProjected: false,
      };
    }

    // A month with no records is estimated only if it has not happened yet, and
    // only from a real basis. A month that has passed stays empty, and the chart
    // draws it as not entered rather than as a confident zero.
    const canProject = monthNum > CURRENT_MONTH && baseMonthlyRunRate.value > 0;
    const projectedGross = canProject ? baseMonthlyRunRate.value : 0;
    const ratio = observedExpenseRatio.value;
    const projectedExpenses =
      recordedExpenses > 0 ? recordedExpenses : canProject && ratio !== null ? Math.round(projectedGross * ratio) : 0;

    return {
      month: name,
      monthNum,
      hasIncome: false,
      hasExpenses: matchingExpenses.length > 0,
      grossIncome: projectedGross,
      waterIncome: canProject ? baseMonthlyWater.value : 0,
      expenses: projectedExpenses,
      personalExpenses: recordedPersonal,
      noi: projectedGross - projectedExpenses,
      isProjected: canProject,
    };
  })
);

const liveCapsules = computed<CapsuleMonth[]>(() =>
  live12MonthsData.value.map((d) => {
    const long = `${MONTH_LONG[d.monthNum - 1]} ${CURRENT_YEAR}`;
    if (d.hasIncome) {
      const water = d.waterIncome ?? 0;
      const detail = `Rent ${peso(d.grossIncome - water)}, water ${peso(water)}`;
      return { short: d.month, long, value: d.grossIncome, kind: 'recorded', detail };
    }
    if (d.monthNum <= CURRENT_MONTH) return { short: d.month, long, value: null, kind: 'unentered' };
    if (d.isProjected) return { short: d.month, long, value: d.grossIncome, kind: 'expected' };
    return { short: d.month, long, value: null, kind: 'future' };
  })
);


/** The month picked on the Income chart, by its index in the year. */
const pickedMonthIndex = ref<number | null>(null);
const pickedMonth = computed(() =>
  pickedMonthIndex.value === null ? null : live12MonthsData.value[pickedMonthIndex.value] ?? null
);
// "Not recorded" is the one wording for nothing entered (Sean, 6 Nov 2026); "Not yet" is a month still to come.
const notEnteredWord = (d: MonthIncomeData) => (d.monthNum > CURRENT_MONTH ? 'Not yet' : 'Not recorded');

/**
 * The Overview shows what has something to say (Sean, 1 Nov 2026). A tile with nothing in it is
 * not drawn, and the others take its room. A failed load counts as something to say: "could not
 * be loaded" is not a zero, and hiding it would read as all clear (B-61).
 *
 * These wait a moment after the data arrives, so the page settles first and a tile with news then
 * makes its entrance, the others moving aside for it. `tile-*` in index.css.
 */
const TILE_ENTRANCE_DELAY_MS = 450;
// Already settled on a revisit: the tiles are drawn at once, not after the first-load pause.
const tilesSettled = ref(!isInitialLoading.value);
watch(isInitialLoading, (loading) => {
  if (!loading) setTimeout(() => (tilesSettled.value = true), TILE_ENTRANCE_DELAY_MS);
});
const attentionShown = computed(() => tilesSettled.value && attentionParts.value > 0);
const monthShown = computed(
  () => tilesSettled.value && (incomeRecordsFetchFailed.value || currentMonthRecordCount.value > 0)
);

/**
 * The width of each tile on the twelve-column grid, by which of the others are showing. Halves,
 * two to a row, rather than the 7 and 5 they were (Lloyd, 3 Nov 2026: "repositioning equally
 * instead of having asymmetric orientations"). Needs your attention takes the whole row when both
 * its parts are showing, and half, beside Occupancy, when one is. A half left alone at the end
 * takes the whole row.
 */
const tileSpans = computed(() => {
  const order: { key: string; full: boolean }[] = [
    ...(attentionShown.value ? [{ key: 'attention', full: attentionBoth.value }] : []),
    ...(monthShown.value ? [{ key: 'month', full: false }] : []),
    { key: 'occupancy', full: false },
    { key: 'byMonth', full: false },
  ];
  const spans: Record<string, string> = {};
  let alone: string | null = null; // a half with nothing yet beside it
  for (const t of order) {
    if (t.full) {
      if (alone) spans[alone] = 'xl:col-span-12';
      alone = null;
      spans[t.key] = 'xl:col-span-12';
    } else {
      spans[t.key] = 'xl:col-span-6';
      // Occupancy beside Income takes a third and the chart two (Sean, 5 Nov 2026).
      if (alone === 'occupancy' && t.key === 'byMonth') {
        spans.occupancy = 'xl:col-span-4';
        spans.byMonth = 'xl:col-span-8';
      }
      alone = alone ? null : t.key;
    }
  }
  if (alone) spans[alone] = 'xl:col-span-12';
  return spans;
});
/** The inquiries waiting for an answer, newest first, three of them. */
const waitingInquiries = computed(() =>
  inquiries.filter((i) => i.status === 'Pending').slice(0, 3)
);
const waitingInquiryCount = computed(() => inquiries.filter((i) => i.status === 'Pending').length);

const phoneSpan = computed(() => (attentionShown.value && monthShown.value ? '' : 'max-md:col-span-2'));

/**
 * Most units first, each with its colour in the bar. No hatch among them: beside this tile's
 * chart, hatching means not entered yet.
 */
const liveClusterPerformance = computed(() => {
  const tones = ['brand', 'bright', 'night', 'soft', 'faint'] as const;
  return CLUSTERS.map((clusterName) => {
    const clusterRooms = rooms.filter((r) => r.cluster === clusterName);
    const occupied = clusterRooms.filter(isOccupied).length;
    return {
      name: clusterName,
      total: clusterRooms.length,
      occupied,
    };
  })
    .sort((a, b) => b.occupied - a.occupied)
    .map((c, i) => ({ ...c, tone: tones[i % tones.length] }));
});
const occupiedCount = computed(() => rooms.length - vacantUnits.value.length);
/** All the units, the occupied by cluster and the vacant as empty track at the end. */
const clusterUnitSplit = computed<Segment[]>(() => [
  ...liveClusterPerformance.value.map((c) => ({ label: c.name, value: c.occupied, tone: c.tone })),
  { label: 'Vacant', value: vacantUnits.value.length, tone: 'empty' as const },
]);

/** The key's dot for a segment of the bar. */
const toneDot: Record<Segment['tone'], string> = {
  brand: 'bg-brand',
  bright: 'bg-brand-bright',
  night: 'bg-series-night',
  soft: 'bg-series-soft',
  hatch: 'hatch border border-line',
  faint: 'bg-ink-faint',
  empty: 'bg-line',
};

/* ========================================================================== *
 * 2. Archive year
 * ========================================================================== */

const targetHistoricalYear = computed(() => parseInt(selectedArchiveYear.value, 10));

const historicalIncomeRecords = computed(() => incomeRecords.filter((r) => r.year === targetHistoricalYear.value));
const historicalExpenseRecords = computed(() => expenseRecords.filter((e) => e.year === targetHistoricalYear.value));

const historicalAnnualGrossTotal = computed(() =>
  historicalIncomeRecords.value.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0)
);

/**
 * The 50% Share as Monthly Income shows it: Boarding House rows only, the one cluster whose
 * section in her workbook has the column (20 Oct 2026). This summed every row's half, all
 * clusters, so the Overview's 2025 figure (₱1,466,100) and the ledger's disagreed.
 */
const historicalAnnualHalfOfRentShare = computed(() =>
  historicalIncomeRecords.value
    .filter((r) => r.cluster === 'Boarding House')
    .reduce((sum, r) => sum + Number(r.fiftyPercentShare || r.rent / 2 || 0), 0)
);
const historicalRent = computed(() => historicalIncomeRecords.value.reduce((s, r) => s + Number(r.rent || 0), 0));
const historicalWater = computed(() => historicalIncomeRecords.value.reduce((s, r) => s + Number(r.water || 0), 0));

// Operating expenses of the rental business. Excludes Main House (Mrs. Fe's own residence) and
// Other / Personal, which are recorded in the same ledger but are not a cost of the business
// (OD-05, confirmed 2026-09-13). Subtracting them understated Net Operating Income.
const historicalAnnualExpenseTotal = computed(() =>
  historicalExpenseRecords.value.reduce((sum, e) => sum + Number(e.rentalAmount ?? e.totalAmount ?? 0), 0)
);

const historicalAnnualPersonalTotal = computed(() =>
  historicalExpenseRecords.value.reduce((sum, e) => sum + Number(e.personalAmount ?? 0), 0)
);

const historicalAnnualNOI = computed(() => historicalAnnualGrossTotal.value - historicalAnnualExpenseTotal.value);

const historical12MonthsData = computed<MonthIncomeData[]>(() =>
  MONTH_NAMES.map((name, idx) => {
    const monthNum = idx + 1;
    const matchingRecords = historicalIncomeRecords.value.filter((r) => r.month === monthNum);
    const matchingExpenses = historicalExpenseRecords.value.filter((e) => e.month === monthNum);
    const grossIncome = matchingRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
    // Operating expenses only (OD-05).
    const expenses = matchingExpenses.reduce((sum, e) => sum + Number(e.rentalAmount ?? e.totalAmount ?? 0), 0);
    return {
      month: name,
      monthNum,
      hasIncome: matchingRecords.length > 0,
      hasExpenses: matchingExpenses.length > 0,
      grossIncome,
      waterIncome: matchingRecords.reduce((sum, r) => sum + Number(r.water || 0), 0),
      expenses,
      personalExpenses: matchingExpenses.reduce((sum, e) => sum + Number(e.personalAmount ?? 0), 0),
      noi: grossIncome - expenses,
      isProjected: false,
    };
  })
);

const historicalCapsules = computed<CapsuleMonth[]>(() =>
  historical12MonthsData.value.map((d) => ({
    short: d.month,
    long: `${MONTH_LONG[d.monthNum - 1]} ${selectedArchiveYear.value}`,
    value: d.hasIncome ? d.grossIncome : null,
    kind: d.hasIncome ? 'recorded' : 'unentered',
  }))
);

/** Where the year's rent and water came from, by cluster, as Monthly Income's "Income by cluster". */
const historicalClusterSplit = computed<Segment[]>(() => {
  const totals = new Map<string, number>();
  for (const r of historicalIncomeRecords.value) {
    totals.set(r.cluster, (totals.get(r.cluster) ?? 0) + Number(r.totalRemitted || r.rent || 0));
  }
  const tones = ['brand', 'bright', 'night', 'soft', 'hatch', 'faint'] as const;
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, tone: tones[i % tones.length] }));
});

/*
 * The rest of an archive year is two counts and a chart (Sean, 19 Oct 2026). The year used to
 * end in four tables, tenants, units, month by month, and every ledger entry behind an Income /
 * Expenses switch, which sometimes failed on Expenses. The ledgers already show all of it, for any
 * year, so the archive points to them instead: each tile's arrow opens the page for that year.
 */
const historicalExpenseCapsules = computed<CapsuleMonth[]>(() =>
  historical12MonthsData.value.map((d) => ({
    short: d.month,
    long: `${MONTH_LONG[d.monthNum - 1]} ${selectedArchiveYear.value}`,
    value: d.hasExpenses ? d.expenses : null,
    kind: d.hasExpenses ? 'recorded' : 'unentered',
  }))
);

/** Who paid that year, counted by the name on the receipt and the unit, as the roster was. */
/*
 * People, not name-and-unit pairs (21 Oct 2026). Counting "name__unit" put a tenant who moved units
 * in twice, and a name typed with extra spaces in twice (2025 read 46; the receipts name 44 people).
 * One person written two ways is folded by the rule Tenants history uses (lib/tenantHistory.ts), so
 * the two screens agree; "A, B" on one receipt is two payers there and here.
 */
const historicalTenantCount = computed(() => {
  const people: string[] = [];
  for (const r of historicalIncomeRecords.value) {
    for (const payer of payersOn(r.contact)) {
      if (!people.some((p) => samePerson(p, payer))) people.push(payer);
    }
  }
  return people.length;
});
const historicalUnitCount = computed(
  () => new Set(historicalIncomeRecords.value.map((r) => r.unit.toUpperCase())).size
);
const archiveIncomeLink = computed(() => `/admin/income?year=${selectedArchiveYear.value}#income-records`);
const archiveIncomeByMonthLink = computed(() => `/admin/income?year=${selectedArchiveYear.value}#income-by-month`);
/** The past year's chart: income or operating expenses, picked in its heading. */
const archiveShape = ref<'income' | 'expenses'>('income');
const archiveShapeOptions = [
  { value: 'income', label: 'Income' },
  { value: 'expenses', label: 'Expenses' },
];
const archiveExpensesLink = computed(() => `/admin/expenses?year=${selectedArchiveYear.value}#expense-records`);

</script>

<template>
  <div
    :class="[
      'ws-focus flex flex-col gap-5 text-ink',
      !isHistoricalMode && 'max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]',
    ]"
  >
    <!-- The bottom padding on a phone is the floating button's room (56px, 16px
         off the edge, plus the home-indicator inset), so it never sits on the
         last tile's content (Sean, 2026-10-01). -->
    <!-- ================================================================== *
     * Header
     * ================================================================== -->
    <!-- Beside the greeting only from 2xl (Sean, 2026-10-01). At 1366 the four
         actions shared ~650px with "Good afternoon, Michelle" and Record
         payment fell onto a line of its own; under the title they are one row. -->
    <!-- A grid, so from 2xl the actions sit at the right of the greeting. -->
    <header class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
        <!--
          Today's date and its year, the year being the menu (Sean, 13 Oct 2026). In a past year the
          date goes and only the year shows (Sean, 19 Oct 2026): "Monday, October 19" beside 2025
          was a false date, and the menu is the way back, so there is no "Back to" button.
        -->
        <div class="col-span-2 row-start-1 flex min-w-0 items-center text-sm text-ink-faint">
          <span v-if="!isHistoricalMode" class="whitespace-nowrap">{{ todayLabel }},&nbsp;</span>
          <YearMenu :model-value="shownYear" :options="yearMenuOptions" @update:model-value="chooseYear" />
        </div>
      <div class="col-span-2 row-start-2 min-w-0 2xl:col-span-1">
        <h1 class="mt-1 text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          <template v-if="!isHistoricalMode">
            Good {{ partOfDay }}<template v-if="firstName">, {{ firstName }}</template>
          </template>
          <template v-else>{{ selectedArchiveYear }} archive</template>
        </h1>
        <!-- What she did last is in the sidebar on every width, the phone's menu included (Sean, 17 Oct 2026). -->
        <!-- No line under the greeting (Sean, 2026-10-02): "Collections are entered
             through September" was a sentence about the data, not for her. The
             income tiles already mark a month with nothing entered. -->
      </div>

      <!--
        `.ws-page-actions` (index.css), the header row every admin page shares.
        From 768px only (Sean, 2026-10-01: on a phone the row under the greeting
        was "too much"; there the same three actions open from the floating
        button, QuickActionsFab, below). Record payment, the primary, is last
        at the right edge, as on Monthly Income. All three green, as they are
        in the floating button on a phone (Sean, 6 Oct 2026). The year is in the date line
        above. A past year has no actions (Sean, 19 Oct 2026): the year menu is the
        way back, and a past year is read-only on every page.
      -->
      <div
        :class="[
          'ws-page-actions col-span-2 row-start-3 mt-4 2xl:col-span-1 2xl:col-start-2 2xl:row-start-2 2xl:mt-0 2xl:self-end 2xl:justify-self-end',
          !isHistoricalMode && 'max-md:hidden',
        ]"
      >
        <!-- None while offline or showing the saved copy: each one is a write (lib/offlineCache.ts;
             Sean, 2026-10-02). -->
        <template v-if="!isHistoricalMode">
          <router-link
            v-for="a in writesUnavailable ? [] : headerActions"
            :key="a.to"
            :to="a.to"
            class="pill-btn-brand"
          >
            <component :is="a.icon" class="size-4" aria-hidden="true" />
            {{ a.label }}
          </router-link>
        </template>
      </div>
    </header>

    <QuickActionsFab v-if="!isHistoricalMode && !writesUnavailable" :actions="quickActions" />

    <div
      v-if="!isInitialLoading && anyLoadFailed"
      role="status"
      class="ws-reveal flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-verify-soft px-4 py-3 text-sm text-verify"
    >
      <span>Some figures could not be loaded.</span>
      <button type="button" class="pill-btn" :disabled="isRefreshing" @click="refreshAllData">Try again</button>
    </div>

    <!-- ================================================================== *
     * First load
     * ================================================================== -->
    <div v-if="isInitialLoading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-12" aria-busy="true">
      <span class="sr-only" role="status">Loading the overview</span>
      <div
        v-for="(span, i) in ['md:col-span-2 xl:col-span-5', 'xl:col-span-4', 'xl:col-span-3', 'md:col-span-2 xl:col-span-8', 'md:col-span-2 xl:col-span-4']"
        :key="i"
        :class="['flex flex-col gap-4 py-2', span]"
      >
        <Skeleton class-name="h-4 w-32 rounded-full" />
        <Skeleton class-name="h-12 w-40 rounded-2xl" />
        <Skeleton class-name="h-3 w-full rounded-full" />
        <Skeleton class-name="h-3 w-2/3 rounded-full" />
      </div>
    </div>

    <!-- ================================================================== *
     * Live year
     * ================================================================== -->
    <!--
      Switching between the live year and an archive year replaces this whole
      grid with a differently-shaped one - the tiles, the tables and the
      cluster lists are not the same DOM before and after. That is a
      deliberate click on the year menu, not a routine
      re-render, so the branch gets a fade-in rather than a jump cut. `ws-reveal`
      already handles the `prefers-reduced-motion` fallback.
    -->
    <!--
      On a phone (Loyd, 2026-10-03): the first screen shows what needs her, this
      month's rent and water, occupancy and the month chart together. The first
      two are half-width tiles side by side, and the arc and the chart are
      smaller. Which come first follows CSS `order`, so
      the reading order on a phone follows what is drawn, not the source. From
      768px nothing changes.
    -->
    <TransitionGroup v-else-if="!isHistoricalMode" tag="div" name="tile" class="ws-reveal grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-12">
      <!-- What needs her action. The only dark tile on the screen. -->
      <OverviewTile v-if="attentionShown" key="attention" tone="night" title="Needs your attention" :class="['max-md:order-1 max-md:gap-3 max-md:p-4 md:col-span-2', tileSpans.attention, phoneSpan]">
        <!--
          On a phone each part of this tile is one link, the count and its words
          together, instead of a count, a button and a link stacked: at half a
          phone's width those made the first row 400px tall (Loyd, 2026-10-03).
          The payments themselves are one tap away on Monthly Income.
        -->
        <div class="flex flex-1 flex-col gap-3 md:hidden">
          <template v-if="paymentsWaiting">
            <UnavailableNote
              v-if="pendingPaymentsFailed"
              dark
              message="Payments to verify could not be loaded."
              @retry="refreshAllData"
            />
            <router-link v-else to="/admin/income?tab=verify#income-records" class="press group/att flex flex-col gap-1">
              <span class="flex items-start gap-2">
                <span class="text-3xl leading-none font-semibold tracking-tight max-[359px]:text-2xl">{{ pendingCount }}</span>
                <ArrowUpRight class="size-4 text-on-night" aria-hidden="true" />
              </span>
              <span class="text-sm text-on-night-soft">{{ pendingCount === 1 ? 'payment' : 'payments' }} to verify</span>
              <span class="text-xs tabular text-on-night-soft">{{ peso(pendingTotal, 2) }} in total</span>
            </router-link>
          </template>
          <template v-if="repairsWaiting">
            <UnavailableNote
              v-if="maintenanceTicketsFetchFailed"
              dark
              :class="attentionBoth && 'mt-auto'"
              message="Repairs could not be loaded."
              @retry="refreshAllData"
            />
            <router-link
              v-else
              to="/admin/tickets#repairs-board"
              :class="['press flex flex-col gap-1', attentionBoth && 'mt-auto border-t border-white/10 pt-3']"
            >
              <span class="flex items-start gap-2">
                <span class="text-3xl leading-none font-semibold tracking-tight max-[359px]:text-2xl">{{ urgentTickets.length }}</span>
                <ArrowUpRight class="size-4 text-on-night" aria-hidden="true" />
              </span>
              <span class="text-sm text-on-night-soft">urgent {{ urgentTickets.length === 1 ? 'repair' : 'repairs' }} open</span>
            </router-link>
          </template>
          <template v-if="inquiriesWaiting">
            <UnavailableNote
              v-if="inquiriesFetchFailed"
              dark
              message="Inquiries could not be loaded."
              @retry="refreshAllData"
            />
            <router-link
              v-else
              to="/admin/inquiries"
              :class="['press flex flex-col gap-1', (paymentsWaiting || repairsWaiting) && 'border-t border-white/10 pt-3']"
            >
              <span class="flex items-start gap-2">
                <span class="text-3xl leading-none font-semibold tracking-tight max-[359px]:text-2xl">{{ waitingInquiryCount }}</span>
                <ArrowUpRight class="size-4 text-on-night" aria-hidden="true" />
              </span>
              <span class="text-sm text-on-night-soft">{{ waitingInquiryCount === 1 ? 'inquiry' : 'inquiries' }} waiting for an answer</span>
            </router-link>
          </template>
        </div>

        <!-- From 768px: the two parts side by side, each a count, its link and three rows at most. -->
        <!-- One, two or three parts, each a column with a rule between (Sean, 5 Nov 2026). -->
        <div :class="['grid gap-6 max-md:hidden', attentionParts === 2 && 'md:grid-cols-2', attentionParts === 3 && 'md:grid-cols-3', attentionBoth && 'md:gap-0 md:divide-x md:divide-white/10']">
          <div v-if="paymentsWaiting" :class="['min-w-0', attentionBoth && 'md:px-6 md:first:pl-0 md:last:pr-0']">
            <UnavailableNote
              v-if="pendingPaymentsFailed"
              dark
              message="Payments to verify could not be loaded. Some may be waiting."
              @retry="refreshAllData"
            />
            <template v-else>
              <div class="flex items-start gap-1">
                <p class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <!-- Not `tabular`: fixed-width digits are for columns, and at this size its 1 grows a foot. -->
                  <span class="text-5xl leading-none font-semibold tracking-tight lg:text-6xl">{{ pendingCount }}</span>
                  <span class="text-sm text-on-night-soft">
                    {{ pendingCount === 1 ? 'payment' : 'payments' }} to verify, {{ peso(pendingTotal, 2) }} in total
                  </span>
                </p>
                <router-link to="/admin/income?tab=verify#income-records" aria-label="Review payments" class="icon-btn icon-btn-goto icon-btn-on-dark group/goto shrink-0">
                  <ArrowUpRight
                    class="size-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[var(--ease-out)] motion-safe:group-hover/goto:translate-x-0.5 motion-safe:group-hover/goto:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </router-link>
              </div>
              <ul class="mt-4 divide-y divide-white/10">
                <li
                  v-for="(p, i) in pendingPreview"
                  :key="p.id"
                  class="list-reveal-item flex items-center justify-between gap-3 py-2.5"
                  :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                >
                  <span class="min-w-0">
                    <span class="block break-words text-sm font-medium">{{ p.name }}</span>
                    <span class="block text-xs text-on-night-soft">
                      <template v-if="p.unit">Unit {{ p.unit }}</template><template v-if="p.unit && p.date">, </template>{{ p.date }}
                    </span>
                  </span>
                  <span class="text-sm font-semibold tabular">{{ peso(p.amount, 2) }}</span>
                </li>
              </ul>
              <p v-if="pendingCount > pendingPreview.length" class="mt-2 text-xs text-on-night-soft">
                {{ pendingCount - pendingPreview.length }} more in Monthly Income.
              </p>
            </template>
          </div>

          <div v-if="repairsWaiting" :class="['min-w-0', attentionBoth && 'md:px-6 md:first:pl-0 md:last:pr-0']">
            <UnavailableNote
              v-if="maintenanceTicketsFetchFailed"
              dark
              message="Repairs could not be loaded. Some may be urgent."
              @retry="refreshAllData"
            />
            <template v-else>
              <div class="flex items-start gap-1">
                <p class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span class="text-5xl leading-none font-semibold tracking-tight lg:text-6xl">{{ urgentTickets.length }}</span>
                  <span class="text-sm text-on-night-soft">
                    urgent {{ urgentTickets.length === 1 ? 'repair' : 'repairs' }} open
                  </span>
                </p>
                <router-link to="/admin/tickets#repairs-board" aria-label="Open repairs" class="icon-btn icon-btn-goto icon-btn-on-dark group/goto shrink-0">
                  <ArrowUpRight
                    class="size-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[var(--ease-out)] motion-safe:group-hover/goto:translate-x-0.5 motion-safe:group-hover/goto:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </router-link>
              </div>
              <!-- The rows of Open repair requests below: what it is, where and how far along, and
                   how urgent (Lloyd, 3 Nov 2026), rather than the title and unit alone. -->
              <ul class="mt-4 divide-y divide-white/10">
                <li
                  v-for="(t, i) in urgentPreview"
                  :key="t.id"
                  class="list-reveal-item flex items-center justify-between gap-3 py-2.5"
                  :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                >
                  <span class="min-w-0">
                    <span class="block break-words text-sm font-medium">{{ t.title }}</span>
                    <span class="block text-xs text-on-night-soft">
                      {{ t.unit }}, {{ t.status === 'Open' ? 'submitted' : t.status.toLowerCase() }}<template v-if="t.technician">, {{ t.technician === 'Unassigned' ? 'no one assigned yet' : t.technician }}</template>
                    </span>
                  </span>
                  <StatusPill :tone="t.priority === 'Emergency' ? 'overdue' : 'verify'">{{ t.priority }}</StatusPill>
                </li>
              </ul>
              <p v-if="urgentTickets.length > urgentPreview.length" class="mt-2 text-xs text-on-night-soft">
                {{ urgentTickets.length - urgentPreview.length }} more in Repairs.
              </p>
            </template>
          </div>
          <div v-if="inquiriesWaiting" :class="['min-w-0', attentionBoth && 'md:px-6 md:first:pl-0 md:last:pr-0']">
            <UnavailableNote
              v-if="inquiriesFetchFailed"
              dark
              message="Inquiries could not be loaded. Some may be waiting."
              @retry="refreshAllData"
            />
            <template v-else>
              <div class="flex items-start gap-1">
                <p class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span class="text-5xl leading-none font-semibold tracking-tight lg:text-6xl">{{ waitingInquiryCount }}</span>
                  <span class="text-sm text-on-night-soft">
                    {{ waitingInquiryCount === 1 ? 'inquiry' : 'inquiries' }} waiting for an answer
                  </span>
                </p>
                <router-link to="/admin/inquiries" aria-label="Open inquiries" class="icon-btn icon-btn-goto icon-btn-on-dark group/goto shrink-0">
                  <ArrowUpRight class="size-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[var(--ease-out)] motion-safe:group-hover/goto:translate-x-0.5 motion-safe:group-hover/goto:-translate-y-0.5" aria-hidden="true" />
                </router-link>
              </div>
              <ul class="mt-4 divide-y divide-white/10">
                <li
                  v-for="(q, i) in waitingInquiries"
                  :key="q.id"
                  class="list-reveal-item flex items-center justify-between gap-3 py-2.5"
                  :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                >
                  <span class="min-w-0">
                    <span class="block break-words text-sm font-medium">{{ q.name }}</span>
                    <span class="block truncate text-xs text-on-night-soft">{{ q.message }}</span>
                  </span>
                  <span class="shrink-0 text-right text-xs text-on-night-soft">
                    <span class="block font-semibold text-on-night">Unit {{ q.unit.toUpperCase() }}</span>
                    {{ q.date }}
                  </span>
                </li>
              </ul>
              <p v-if="waitingInquiryCount > waitingInquiries.length" class="mt-2 text-xs text-on-night-soft">
                {{ waitingInquiryCount - waitingInquiries.length }} more in Inquiries.
              </p>
            </template>
          </div>
        </div>
      </OverviewTile>

      <OverviewTile
        v-if="monthShown"
        key="month"
        :title="`Received, ${MONTH_LONG[CURRENT_MONTH - 1]} ${CURRENT_YEAR}`"
        phone-title="Received"
        to="/admin/income#income-records"
        to-label="Open the income records"
        :class="['max-md:order-1 max-md:gap-3', tileSpans.month, phoneSpan]"
      >
        <UnavailableNote
          v-if="incomeRecordsFetchFailed"
          message="Collections could not be loaded."
          @retry="refreshAllData"
        />
        <template v-else>
          <div>
            <!--
              `text-5xl` did not fit a phone: "₱1,284,750.00" is 327.7px in a
              303px tile. Half a phone's width is less again, so `text-3xl` there,
              the size of Monthly Income's and Monthly Expenses' month figures,
              `text-4xl` on a tablet and `text-5xl` from 1024px. The counts beside
              it in "Needs your attention" used the same steps: Loyd (2026-10-03)
              saw a 0 there larger than the rent figure next to it; a part with
              nothing waiting is not drawn there now (3 Nov 2026). Below 360px the
              tile's text is 106px wide, which "₱141,000" fills at `text-2xl`, so
              all three step down together there.
            -->
            <p class="text-3xl leading-none font-semibold tabular tracking-tight max-[359px]:text-2xl md:text-4xl lg:text-5xl">{{ peso(currentMonthRevenue) }}</p>
            <!-- The count only; "usually entered a week or two after" was
                 explanation she does not need on her own screen (Sean, 2026-10-01). -->
            <p class="mt-2 text-sm text-ink-soft">
              <span class="md:hidden">{{ MONTH_LONG[CURRENT_MONTH - 1] }}, </span>{{ currentMonthRecordCount }} {{ currentMonthRecordCount === 1 ? 'payment' : 'payments' }}<span class="max-md:hidden"> entered for {{ MONTH_LONG[CURRENT_MONTH - 1] }}</span> so far
            </p>
          </div>
        </template>
      </OverviewTile>

      <OverviewTile key="occupancy" title="Occupancy" to="/admin/directory#rooms-list" to-label="Open rooms and rates" :class="['col-span-2 max-md:order-2 max-md:gap-2', tileSpans.occupancy]">
        <UnavailableNote
          v-if="roomsFetchFailed"
          message="Room status could not be loaded."
          @retry="refreshAllData"
        />
        <template v-else>
          <!-- The count and one bar of the same units replaced the semicircle (Sean, 1 Nov 2026):
               the arc and a bar drew the one fact twice. -->
          <div>
            <p class="flex flex-wrap items-baseline gap-x-2">
              <span class="text-5xl leading-none font-semibold tabular tracking-tight">
                <span class="text-brand">{{ occupiedCount }}</span><span class="text-3xl text-ink-faint">/{{ rooms.length }}</span>
              </span>
              <span class="text-sm text-ink-soft">units occupied</span>
            </p>
            <p v-if="vacantUnits.length" class="mt-2 text-sm text-ink-soft">
              Vacant: {{ vacantUnits.map((u) => u.unitCode.toUpperCase()).join(', ') }}
            </p>
          </div>
          <SegmentBar :segments="clusterUnitSplit" :label="`${occupiedCount}/${rooms.length} units occupied, by cluster`" />
          <table class="w-full text-sm">
            <!-- Each cluster and its count only, no column names (Sean, 5 Nov 2026): the rent is on
                 Rooms and rates. The names stay for a screen reader. -->
            <caption class="sr-only">Occupied units by cluster</caption>
            <thead class="sr-only">
              <tr>
                <th scope="col">Cluster</th>
                <th scope="col">Occupied</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="c in liveClusterPerformance" :key="c.name">
                <th scope="row" class="py-1.5 text-left font-medium">
                  <span class="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" :class="['size-3 shrink-0 rounded-full', toneDot[c.tone]]" />
                    <span class="min-w-0 break-words leading-snug">{{ c.name }}</span>
                  </span>
                </th>
                <td class="py-1.5 pl-3 text-right text-base font-semibold tabular whitespace-nowrap">{{ c.occupied }}/{{ c.total }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </OverviewTile>

      <OverviewTile
        key="by-month"
        boxed
        title="Income and expenses"
        to="/admin/income#income-by-month"
        to-label="Open the income records"
        :class="['col-span-2 max-md:order-3 max-md:gap-3', tileSpans.byMonth]"
      >
        <UnavailableNote
          v-if="incomeRecordsFetchFailed"
          message="Collections could not be loaded."
          @retry="refreshAllData"
        />
        <template v-else>
          <MonthCapsules
            :months="liveCapsules"
            :label="`Collections by month in ${CURRENT_YEAR}`"
            short
            :decimals="2"
            @select="(i) => (pickedMonthIndex = i)"
          >
            <!-- In the chart's right column on a wide card, under the month's figure (Sean, 5 Nov 2026). -->
            <template #aside>
            <!-- The month picked on the chart, income against expenses (review of 4 Nov 2026). A
                 month not entered says so rather than showing a confident zero. Net income lives
                 here alone now: its own section went (Sean, 5 Nov 2026), and Income and Expenses
                 each open their own page. -->
              <dl v-if="pickedMonth" class="grid grid-cols-3 gap-4 border-t border-line pt-3 @[54rem]:grid-cols-1 @[54rem]:gap-3">
              <div>
                <dt class="text-xs text-ink-faint">
                  <RouterLink to="/admin/income#income-records" class="group/goto relative inline-flex items-center gap-1 hover:text-ink before:absolute before:-inset-x-1 before:-inset-y-1.5" aria-label="Income, open Monthly Income">
                    Income
                    <ArrowUpRight class="size-3.5 motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover/goto:translate-x-0.5 motion-safe:group-hover/goto:-translate-y-0.5" aria-hidden="true" />
                  </RouterLink>
                </dt>
                <dd :class="['text-lg font-semibold tabular', !pickedMonth.hasIncome && 'text-ink-soft']">{{ pickedMonth.hasIncome ? peso(pickedMonth.grossIncome) : notEnteredWord(pickedMonth) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-faint">
                  <RouterLink to="/admin/expenses#expense-records" class="group/goto relative inline-flex items-center gap-1 hover:text-ink before:absolute before:-inset-x-1 before:-inset-y-1.5" aria-label="Operating expenses, open Monthly Expenses">
                    Operating expenses
                    <ArrowUpRight class="size-3.5 motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover/goto:translate-x-0.5 motion-safe:group-hover/goto:-translate-y-0.5" aria-hidden="true" />
                  </RouterLink>
                </dt>
                <dd :class="['text-lg font-semibold tabular', !pickedMonth.hasExpenses && 'text-ink-soft']">{{ pickedMonth.hasExpenses ? peso(pickedMonth.expenses) : notEnteredWord(pickedMonth) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-faint">Net income</dt>
                <dd :class="['text-lg font-semibold tabular', !(pickedMonth.hasIncome && pickedMonth.hasExpenses) ? 'text-ink-soft' : pickedMonth.noi < 0 && 'text-overdue']">
                  {{ pickedMonth.hasIncome && pickedMonth.hasExpenses ? peso(pickedMonth.noi) : notEnteredWord(pickedMonth) }}
                </dd>
              </div>
            </dl>
              </template>
          </MonthCapsules>
        </template>
      </OverviewTile>

    </TransitionGroup>

    <!-- ================================================================== *
     * Archive year
     * ================================================================== -->
    <!--
      A past year in the recordss' own cards (Sean, 20 Oct 2026): a figure, then its parts on ruled
      lines, no sentences. Each money card's arrow opens that year's ledger.
    -->
    <div v-else class="ws-reveal grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      <!-- The year as one table (Sean, 5 Nov 2026): what it is, its total, then its parts, so every
           total sits in one column and every part in the next, one ruled row each. No year in the
           title: it is at the top of the page. -->
      <OverviewTile class="md:col-span-2 xl:col-span-12">
        <div class="divide-y divide-line">
          <div class="grid grid-cols-1 gap-x-8 gap-y-3 py-5 first:pt-0 last:pb-0 md:grid-cols-[11rem_minmax(0,16rem)_minmax(0,1fr)] md:items-start">
            <h3 class="flex items-center gap-1 text-[0.9375rem] font-semibold">
              Income
              <router-link :to="archiveIncomeLink" :aria-label="'Open Monthly Income for this year'" class="icon-btn icon-btn-goto group/goto shrink-0"><ArrowUpRight class="size-4" aria-hidden="true" /></router-link>
            </h3>
            <UnavailableNote v-if="incomeRecordsFetchFailed" class="md:col-span-2" @retry="refreshAllData" />
            <p v-else-if="historicalIncomeRecords.length === 0" class="text-2xl font-semibold tracking-tight text-ink-soft md:col-span-2">Not recorded</p>
            <template v-else>
              <div>
                <p class="tabular text-3xl font-semibold leading-none tracking-tight">{{ peso(historicalAnnualGrossTotal) }}</p>
                <p class="mt-1 text-sm text-ink-soft">From {{ historicalIncomeRecords.length }} {{ historicalIncomeRecords.length === 1 ? 'payment' : 'payments' }}
                  by {{ historicalTenantCount }} {{ historicalTenantCount === 1 ? 'tenant' : 'tenants' }}
                  in {{ historicalUnitCount }} {{ historicalUnitCount === 1 ? 'unit' : 'units' }}</p>
              </div>
              <dl class="flex flex-col divide-y divide-line text-sm">
                <div class="flex items-baseline justify-between gap-3 py-2 first:pt-0 ">
                  <dt class="text-ink-soft">Rent</dt>
                  <dd class="tabular font-semibold">{{ peso(historicalRent) }}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-3 py-2 first:pt-0 ">
                  <dt class="text-ink-soft">Water</dt>
                  <dd class="tabular font-semibold">{{ peso(historicalWater) }}</dd>
                </div>
                <!-- BR-035: the label only. Inside Rent, never added to it (Sean, 22 Oct 2026). -->
                <div class="flex items-baseline justify-between gap-3 py-2">
                  <dt class="text-ink-soft">50% Share <span class="block text-xs">Half of Boarding House rent</span></dt>
                  <dd class="tabular text-ink-soft">{{ peso(historicalAnnualHalfOfRentShare) }}</dd>
                </div>
              </dl>
            </template>
          </div>
          <div class="grid grid-cols-1 gap-x-8 gap-y-3 py-5 first:pt-0 last:pb-0 md:grid-cols-[11rem_minmax(0,16rem)_minmax(0,1fr)] md:items-start">
            <h3 class="flex items-center gap-1 text-[0.9375rem] font-semibold">
              Expenses
              <router-link :to="archiveExpensesLink" :aria-label="'Open Monthly Expenses for this year'" class="icon-btn icon-btn-goto group/goto shrink-0"><ArrowUpRight class="size-4" aria-hidden="true" /></router-link>
            </h3>
            <UnavailableNote v-if="expenseRecordsFetchFailed" class="md:col-span-2" @retry="refreshAllData" />
            <p v-else-if="historicalExpenseRecords.length === 0" class="text-2xl font-semibold tracking-tight text-ink-soft md:col-span-2">Not recorded</p>
            <template v-else>
              <div>
                <p class="tabular text-3xl font-semibold leading-none tracking-tight">{{ peso(historicalAnnualExpenseTotal + historicalAnnualPersonalTotal) }}</p>
                <p class="mt-1 text-sm text-ink-soft">From {{ historicalExpenseRecords.length }} {{ historicalExpenseRecords.length === 1 ? 'entry' : 'entries' }}</p>
              </div>
              <dl class="flex flex-col divide-y divide-line text-sm">
                <div class="flex items-baseline justify-between gap-3 py-2 first:pt-0 ">
                  <dt class="text-ink-soft">Operating</dt>
                  <dd class="tabular font-semibold">{{ peso(historicalAnnualExpenseTotal) }}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-3 py-2 first:pt-0 ">
                  <dt class="text-ink-soft">Personal, not deducted</dt>
                  <dd class="tabular font-semibold">{{ peso(historicalAnnualPersonalTotal) }}</dd>
                </div>
              </dl>
            </template>
          </div>
          <div class="grid grid-cols-1 gap-x-8 gap-y-3 py-5 first:pt-0 last:pb-0 md:grid-cols-[11rem_minmax(0,16rem)_minmax(0,1fr)] md:items-start">
            <h3 class="flex items-center gap-1 text-[0.9375rem] font-semibold">
              Net income
              
            </h3>
            <UnavailableNote v-if="incomeRecordsFetchFailed || expenseRecordsFetchFailed" class="md:col-span-2" @retry="refreshAllData" />
            <p v-else-if="false" class="text-2xl font-semibold tracking-tight text-ink-soft md:col-span-2">Not recorded</p>
            <template v-else>
              <div>
                <p class="tabular text-3xl font-semibold leading-none tracking-tight" :class="historicalAnnualNOI < 0 && 'text-overdue'">{{ peso(historicalAnnualNOI) }}</p>
                <p class="mt-1 text-sm text-ink-soft">Income less operating expenses</p>
              </div>

            </template>
          </div>
        </div>
      </OverviewTile>

      <!-- One chart, its green word switching income and expenses, as Monthly Income's does (Sean,
           5 Nov 2026); both views share one cell so the card keeps its height. -->
      <OverviewTile boxed :to="archiveShape === 'income' ? archiveIncomeByMonthLink : archiveExpensesLink" :to-label="archiveShape === 'income' ? 'Open Monthly Income for this year' : 'Open Monthly Expenses for this year'" class="md:col-span-2 xl:col-span-7">
        <template #heading>
          <YearMenu v-model="archiveShape" :options="archiveShapeOptions" inline hint="show income or expenses" /> by month
        </template>
        <UnavailableNote v-if="incomeRecordsFetchFailed || expenseRecordsFetchFailed" @retry="refreshAllData" />
        <div v-else class="grid">
          <div :class="['min-w-0 [grid-area:1/1] motion-safe:transition-[opacity,visibility] motion-safe:duration-200', archiveShape !== 'income' && 'invisible opacity-0']" :inert="archiveShape !== 'income'">
            <MonthCapsules :key="'i' + archiveShape" :months="historicalCapsules" :label="`Collections by month in ${selectedArchiveYear}`" />
          </div>
          <div :class="['min-w-0 [grid-area:1/1] motion-safe:transition-[opacity,visibility] motion-safe:duration-200', archiveShape !== 'expenses' && 'invisible opacity-0']" :inert="archiveShape !== 'expenses'">
            <MonthCapsules :key="'e' + archiveShape" :months="historicalExpenseCapsules" tone="expense" :label="`Operating expenses by month in ${selectedArchiveYear}`" />
          </div>
        </div>
      </OverviewTile>

      <OverviewTile boxed title="Income by cluster" :to="archiveIncomeLink" to-label="Open Monthly Income for this year" class="md:col-span-2 xl:col-span-5">
        <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
        <p v-else-if="historicalClusterSplit.length === 0" class="text-sm text-ink-soft">Not recorded</p>
        <template v-else>
          <SegmentBar :segments="historicalClusterSplit" :label="`How ${peso(historicalAnnualGrossTotal)} divides across the clusters`" />
          <ul class="flex flex-col gap-2.5">
            <li v-for="(c, i) in historicalClusterSplit" :key="c.label" class="flex min-w-0 items-center justify-between gap-3 text-sm">
              <span class="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  :class="['size-3 shrink-0 rounded-full', toneDot[c.tone]]"
                />
                <span class="min-w-0 break-words leading-snug">{{ c.label }}</span>
              </span>
              <span class="flex shrink-0 items-baseline gap-3">
                <span class="text-xs text-ink-faint tabular">{{ wholePercents(historicalClusterSplit.map((s) => s.value))[i] }}%</span>
                <span class="tabular font-semibold">{{ peso(c.value) }}</span>
              </span>
            </li>
          </ul>
        </template>
      </OverviewTile>

    </div>
  </div>
</template>
