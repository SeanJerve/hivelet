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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
  waterChargeFor,
  type RoomItem,
  type MaintenanceTicket,
  roomsFetchFailed,
  incomeRecordsFetchFailed,
  expenseRecordsFetchFailed,
  maintenanceTicketsFetchFailed,
} from '@/lib/systemState';
import { CLUSTERS, peso } from '@/lib/canonicalUnits';
import { propertyToday } from '@/lib/propertyDate';
import { pickedYear } from '@/lib/yearScope';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import RecentActions from '@/components/overview/RecentActions.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import MonthCapsules from '@/components/overview/MonthCapsules.vue';
import OccupancyArc from '@/components/overview/OccupancyArc.vue';
import PhoneMore from '@/components/overview/PhoneMore.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import QuickActionsFab from '@/components/overview/QuickActionsFab.vue';
import { greetingName, usePartOfDay } from '@/lib/greeting';
import type { ArcUnit, CapsuleMonth, QuickAction } from '@/components/overview/types';
import {
  Plus,
  ReceiptText,
  ChevronDown,
  Check,
  ArrowLeft,
  Search,
  DoorOpen,
  ArrowUpRight,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const pendingPayments = ref<any[]>([]);
/** True when the verification queue could not be read, so 0 is not reported as fact. */
const pendingPaymentsFailed = ref(false);
const isRefreshing = ref(false);
const isInitialLoading = ref(true);

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

const todayLabel = new Date().toLocaleDateString('en-PH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
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

// The year menu opened on hover only, so it could not be reached by keyboard or
// touch. It is a real disclosure now.
const isYearMenuOpen = ref(false);
const yearMenuRoot = ref<HTMLElement | null>(null);
const yearButton = ref<HTMLButtonElement | null>(null);

const yearOptions = computed(() => [String(CURRENT_YEAR), ...availableHistoricalYears.value]);
const shownYear = computed(() => (isHistoricalMode.value ? selectedArchiveYear.value : String(CURRENT_YEAR)));

/**
 * Which edge of the year button the menu hangs from (Sean, 2026-10-01: on a
 * phone "the menu is under the year but aligned too far right").
 *
 * It always hung from the button's left edge. On a 375px phone the button
 * wraps to the right of the second row, so the 160px menu ran from x=227 to
 * 387, off the screen by 12px; at 320px the same button sits at the left and
 * the left edge is right. So it is measured on open: the left edge when the
 * menu fits that way, otherwise the right edge, under the button either way.
 * `flush: 'post'` measures the menu as rendered, before it is painted.
 */
const yearMenuAlignEnd = ref(false);
watch(
  isYearMenuOpen,
  (open) => {
    if (!open) return;
    const button = yearButton.value?.getBoundingClientRect();
    const menu = document.getElementById('overview-year-menu');
    if (!button || !menu) return;
    yearMenuAlignEnd.value = button.left + menu.offsetWidth > document.documentElement.clientWidth - 8;
  },
  { flush: 'post' }
);

function closeYearMenu(returnFocus = false) {
  isYearMenuOpen.value = false;
  if (returnFocus) yearButton.value?.focus();
}

function chooseYear(year: string) {
  closeYearMenu(true);
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

function onDocumentPointerDown(e: PointerEvent) {
  if (isYearMenuOpen.value && yearMenuRoot.value && !yearMenuRoot.value.contains(e.target as Node)) {
    closeYearMenu();
  }
}

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
  isRefreshing.value = true;
  try {
    await Promise.allSettled([
      fetchRooms(),
      fetchIncomeRecords(),
      fetchExpenseRecords(),
      fetchMaintenanceTickets(),
      fetchTenants(),
      loadPayments(),
    ]);
  } finally {
    isRefreshing.value = false;
    isInitialLoading.value = false;
  }
}

watch(isInitialLoading, (loading) => {
  if (!loading) followPickedYear();
});

onMounted(() => {
  syncFromRoute();
  refreshAllData();
  document.addEventListener('pointerdown', onDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown);
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

/** Year to date: every collection entered for the current year. */
const monthlyRevenue = computed(() =>
  liveIncomeRecords.value.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0)
);

function isOccupied(r: RoomItem) {
  return r.status === 'settled' || r.status === 'pending' || r.tenant !== null;
}

const totalRoomsCount = computed(() => rooms.length);
const vacantUnits = computed(() => rooms.filter((r) => !isOccupied(r)));

const pendingCount = computed(() => pendingPayments.value.length);
const pendingTotal = computed(() => pendingPayments.value.reduce((s, p) => s + (Number(p.amount) || 0), 0));

const pendingPreview = computed(() =>
  [...pendingPayments.value]
    .sort((a, b) => String(b.paid_at ?? '').localeCompare(String(a.paid_at ?? '')))
    .slice(0, 3)
    .map((p) => ({
      id: String(p.id),
      name: p.profiles?.full_name ?? 'Name not on file',
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
const openTicketsPreview = computed(() =>
  [...openTickets.value].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]).slice(0, 5)
);

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

/** The latest month of this year that has any collection entered, or 0. */


// Base monthly run-rate from currently occupied rooms, at the configured water
// rate (BR-014). Every unit is billed per head, Linda's included - see
// `waterChargeFor` in systemState.ts for why the flat LF/LB figures went.
const baseMonthlyRunRate = computed(() =>
  rooms.reduce((sum, r) => {
    if (!isOccupied(r)) return sum;
    return sum + Number(r.price || 0) + waterChargeFor(r.unitCode, r.occupants || 1);
  }, 0)
);

const baseMonthlyWater = computed(() =>
  rooms.reduce((sum, r) => {
    if (!isOccupied(r)) return sum;
    return sum + waterChargeFor(r.unitCode, r.occupants || 1);
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
  halfOfRentShare: number;
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
        halfOfRentShare: matchingRecords.reduce(
          (sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'Boarding House' ? r.rent / 2 : r.rent) || 0),
          0
        ),
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
      halfOfRentShare: Math.round(projectedGross * 0.5),
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
    if (d.hasIncome) return { short: d.month, long, value: d.grossIncome, kind: 'recorded' };
    if (d.monthNum <= CURRENT_MONTH) return { short: d.month, long, value: null, kind: 'unentered' };
    if (d.isProjected) return { short: d.month, long, value: d.grossIncome, kind: 'expected' };
    return { short: d.month, long, value: null, kind: 'future' };
  })
);

const liveRecordedMonths = computed(() => live12MonthsData.value.filter((d) => d.hasIncome));
const liveRecordedAverage = computed(() =>
  liveRecordedMonths.value.length ? Math.round(monthlyRevenue.value / liveRecordedMonths.value.length) : 0
);

const liveLatestCashMonth = computed(() => liveRecordedMonths.value.at(-1) ?? null);
const livePersonalTotal = computed(() =>
  liveExpenseRecords.value.reduce((s, e) => s + Number(e.personalAmount ?? 0), 0)
);

const arcUnits = computed<ArcUnit[]>(() =>
  CLUSTERS.flatMap((c) =>
    rooms
      .filter((r) => r.cluster === c)
      .map((r) => ({ code: r.unitCode.toUpperCase(), cluster: c, occupied: isOccupied(r) }))
  )
);
/**
 * On a phone the tiles go in the order of what has something to show (Loyd,
 * 2026-10-03). Needs your attention and this month's rent and water lead when
 * they hold a figure, and when they are zero they move below occupancy and the
 * month chart instead of opening the screen on "0, 0, ₱0". A failed load counts
 * as something to show: "could not be loaded" is not a zero. Two tiles in the
 * same place share a row; one alone takes the width.
 */
const attentionHasFigures = computed(
  () => pendingPaymentsFailed.value || maintenanceTicketsFetchFailed.value || pendingCount.value > 0 || urgentTickets.value.length > 0
);
const monthHasFigures = computed(() => incomeRecordsFetchFailed.value || currentMonthRevenue.value > 0);
const pairedOnPhone = computed(() => attentionHasFigures.value === monthHasFigures.value);
const phonePlace = (leads: boolean) => [
  leads ? 'max-md:order-1' : 'max-md:order-4',
  !pairedOnPhone.value && 'max-md:col-span-2',
];

const liveClusterPerformance = computed(() =>
  CLUSTERS.map((clusterName) => {
    const clusterRooms = rooms.filter((r) => r.cluster === clusterName);
    const occupied = clusterRooms.filter(isOccupied).length;
    return {
      name: clusterName,
      total: clusterRooms.length,
      occupied,
      revenue: clusterRooms.reduce((s, r) => s + (r.tenant ? Number(r.price || 0) : 0), 0),
    };
  })
);

/* ========================================================================== *
 * 2. Archive year
 * ========================================================================== */

const targetHistoricalYear = computed(() => parseInt(selectedArchiveYear.value, 10));

const historicalIncomeRecords = computed(() => incomeRecords.filter((r) => r.year === targetHistoricalYear.value));
const historicalExpenseRecords = computed(() => expenseRecords.filter((e) => e.year === targetHistoricalYear.value));

const historicalAnnualGrossTotal = computed(() =>
  historicalIncomeRecords.value.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0)
);

const historicalAnnualHalfOfRentShare = computed(() =>
  historicalIncomeRecords.value.reduce(
    (sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'Boarding House' ? r.rent / 2 : r.rent) || 0),
    0
  )
);

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
      halfOfRentShare: matchingRecords.reduce(
        (sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'Boarding House' ? r.rent / 2 : r.rent) || 0),
        0
      ),
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

const historicalRecordedMonths = computed(() => historical12MonthsData.value.filter((d) => d.hasIncome));
const historicalRecordedAverage = computed(() =>
  historicalRecordedMonths.value.length
    ? Math.round(historicalAnnualGrossTotal.value / historicalRecordedMonths.value.length)
    : 0
);
const historicalHighestMonth = computed(() =>
  historicalRecordedMonths.value.reduce<MonthIncomeData | null>(
    (best, d) => (best === null || d.grossIncome > best.grossIncome ? d : best),
    null
  )
);

const historicalClusterPerformance = computed(() =>
  CLUSTERS.map((clusterName) => {
    const clusterRecords = historicalIncomeRecords.value.filter((r) => r.cluster === clusterName);
    const totalRevenue = clusterRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
    return {
      name: clusterName,
      revenue: totalRevenue,
      uniqueRooms: new Set(clusterRecords.map((r) => r.unit)).size,
      share:
        historicalAnnualGrossTotal.value > 0 ? (totalRevenue / historicalAnnualGrossTotal.value) * 100 : 0,
      recordCount: clusterRecords.length,
    };
  })
);

const historicalTenantRosterOpen = ref(true);
const historicalUnitTableOpen = ref(true);
const historicalLedgerOpen = ref(true);
const historicalLedgerTab = ref<'income' | 'expenses'>('income');
const historicalSearchQuery = ref('');
const historicalClusterFilter = ref('All');

const historicalClusterOptions = computed(() => [
  { value: 'All', label: 'All clusters' },
  ...CLUSTERS.map((c) => ({ value: c, label: c })),
]);

interface HistoricalTenantSummary {
  name: string;
  unit: string;
  cluster: string;
  monthsCount: number;
  activeMonths: string[];
  totalRemitted: number;
  invoiceSample: string;
}

const historicalTenantRoster = computed<HistoricalTenantSummary[]>(() => {
  const map = new Map<string, HistoricalTenantSummary>();

  for (const r of historicalIncomeRecords.value) {
    const key = `${r.contact.trim()}__${r.unit}`;
    const monthName = MONTH_NAMES[(r.month || 1) - 1];
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name: r.contact.trim(),
        unit: r.unit,
        cluster: r.cluster,
        monthsCount: 1,
        activeMonths: [monthName],
        totalRemitted: Number(r.totalRemitted || r.rent || 0),
        invoiceSample: r.invoice || '',
      });
    } else {
      existing.monthsCount++;
      if (!existing.activeMonths.includes(monthName)) existing.activeMonths.push(monthName);
      existing.totalRemitted += Number(r.totalRemitted || r.rent || 0);
    }
  }

  let list = Array.from(map.values()).sort((a, b) => b.totalRemitted - a.totalRemitted);
  // Months were listed in the order records arrived ("Jul, Oct, Aug"). Calendar order reads.
  for (const t of list) {
    t.activeMonths.sort((a, b) => MONTH_NAMES.indexOf(a as any) - MONTH_NAMES.indexOf(b as any));
  }
  if (historicalClusterFilter.value !== 'All') {
    list = list.filter((t) => t.cluster === historicalClusterFilter.value);
  }
  const q = historicalSearchQuery.value.toLowerCase().trim();
  if (q) list = list.filter((t) => t.name.toLowerCase().includes(q) || t.unit.toLowerCase().includes(q));
  return list;
});

interface HistoricalRoomUtilization {
  unitCode: string;
  cluster: string;
  floorLabel: string;
  activeMonths: number;
  totalRevenue: number;
  averageMonthlyRevenue: number;
}

const historicalRoomUtilization = computed<HistoricalRoomUtilization[]>(() =>
  rooms
    .map((room) => {
      const unitRecords = historicalIncomeRecords.value.filter(
        (r) => r.unit.toUpperCase() === room.unitCode.toUpperCase()
      );
      const totalRevenue = unitRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
      return {
        unitCode: room.unitCode,
        cluster: room.cluster,
        floorLabel: room.floorLabel,
        activeMonths: unitRecords.length,
        totalRevenue,
        averageMonthlyRevenue: unitRecords.length > 0 ? Math.round(totalRevenue / unitRecords.length) : 0,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
);

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
    <header class="flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-4">
      <div class="min-w-0">
        <div class="flex items-center justify-between gap-4">
          <p class="min-w-0 text-sm text-ink-faint">{{ todayLabel }}</p>
          <!--
            The year: a word, not a button (Sean, 2026-10-01: "not a button -
            a clickable word, like 'Ledger' and 'To verify' on Monthly
            Income"), so it takes those tab words' style - bold, brand, text
            size - with a chevron for the menu it opens. It sits on the date
            line, at the right, on every screen size, which also takes it out
            of the action row a phone no longer shows. `-my-1` keeps the py-1
            hit area from pushing the greeting down; the `before:` box widens
            the target for a finger without moving anything. The menu is
            `w-max`: its anchor is now only as wide as the word, and an
            absolute box sizes to its anchor, so "2026, this year" wrapped.
          -->
          <div ref="yearMenuRoot" class="relative -my-1 shrink-0" @keydown.escape="closeYearMenu(true)">
            <button
              ref="yearButton"
              type="button"
              class="press relative inline-flex items-center gap-1 py-1 text-sm font-bold text-brand cursor-pointer whitespace-nowrap before:absolute before:-inset-x-2 before:-inset-y-2"
              aria-haspopup="true"
              :aria-expanded="isYearMenuOpen"
              aria-controls="overview-year-menu"
              @click="isYearMenuOpen = !isYearMenuOpen"
            >
              <span class="tabular">{{ shownYear }}</span>
              <span class="sr-only">, change year</span>
              <ChevronDown
                :class="[
                  'size-4 transition-transform duration-200 ease-[var(--ease-out)]',
                  isYearMenuOpen && 'rotate-180',
                ]"
                aria-hidden="true"
              />
            </button>
            <!--
              This was `v-show`, which is instant: the menu was there or it was
              not, on the same frame as the click. PillSelect's popover already
              solved this exact shape (a menu anchored to its own trigger), so
              the year menu now opens the same way instead of reading as a
              different control that happens to sit beside it. `motion-safe:` on
              the scale and translate utilities is what stands in for a
              hand-written `prefers-reduced-motion` block here, since Tailwind
              already generates that correctly; opacity still fades either way.

              220ms/160ms, not 150ms/100ms - PillSelect's own dropdown was
              bumped to those numbers after the client found its old pair an
              instant cut rather than a deliberate motion. This menu copied
              PillSelect's timing when it was written and was left behind at
              the old numbers when PillSelect moved; same shape, same trigger,
              so it gets the same fix.

              Now `ws-pop` (index.css), the one transition PillSelect and both
              header menus share, so it cannot drift from them again (Sean,
              2026-10-01). Reduced motion keeps its fade there too.
            -->
            <Transition name="ws-pop">
              <div
                v-if="isYearMenuOpen"
                id="overview-year-menu"
                :class="[
                  'absolute top-full z-30 mt-2 w-max min-w-40 rounded-2xl bg-tile p-1.5 shadow-lift border border-line',
                  yearMenuAlignEnd ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
                ]"
              >
                <button
                  v-for="y in yearOptions"
                  :key="y"
                  type="button"
                  :aria-current="y === shownYear ? 'true' : undefined"
                  class="press flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm tabular hover:bg-canvas cursor-pointer"
                  @click="chooseYear(y)"
                >
                  <span>{{ y === String(CURRENT_YEAR) ? `${y}, this year` : y }}</span>
                  <Check v-if="y === shownYear" class="size-4 text-brand" aria-hidden="true" />
                </button>
              </div>
            </Transition>
          </div>
        </div>
        <h1 class="mt-1 text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          <template v-if="!isHistoricalMode">
            Good {{ partOfDay }}<template v-if="firstName">, {{ firstName }}</template>
          </template>
          <template v-else>{{ selectedArchiveYear }} archive</template>
        </h1>
        <!-- No line under the greeting (Sean, 2026-10-02): "Collections are entered
             through September" was a sentence about the data, not for her. The
             income tiles already mark a month with nothing entered. -->
      </div>

      <!--
        `.ws-page-actions` (index.css), the header row every admin page shares.
        From 768px only (Sean, 2026-10-01: on a phone the row under the greeting
        was "too much"; there the same three actions open from the floating
        button, QuickActionsFab, below). Record payment, the primary, is last
        at the right edge, as on Monthly Income. The year moved to the date
        line above. "Back to 2026" in an archive year stays on every size: the
        floating button is for the live year's actions only.
      -->
      <div :class="['ws-page-actions', !isHistoricalMode && 'max-md:hidden']">
        <!-- None while offline or showing the saved copy: each one is a write (lib/offlineCache.ts;
             Sean, 2026-10-02). -->
        <template v-if="!isHistoricalMode">
          <router-link
            v-for="a in writesUnavailable ? [] : headerActions"
            :key="a.to"
            :to="a.to"
            :class="a.primary ? 'pill-btn-brand' : 'pill-btn'"
          >
            <component :is="a.icon" :class="['size-4', !a.primary && 'text-ink-soft']" aria-hidden="true" />
            {{ a.label }}
          </router-link>
        </template>
        <template v-else>
          <button type="button" class="pill-btn-brand" @click="exitHistoricalMode">
            <ArrowLeft class="size-4" aria-hidden="true" />
            Back to {{ CURRENT_YEAR }}
          </button>
        </template>
      </div>
    </header>

    <!-- What she did last, under the greeting (Sean, 5 Oct: "action history"). -->
    <RecentActions />

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
        :class="['rounded-tile bg-tile p-6 flex flex-col gap-4', span]"
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
      deliberate click (the year menu, or "Back to <year>"), not a routine
      re-render, so the branch gets a fade-in rather than a jump cut. `ws-reveal`
      already handles the `prefers-reduced-motion` fallback.
    -->
    <!--
      On a phone (Loyd, 2026-10-03): the first screen shows what needs her, this
      month's rent and water, occupancy and the month chart together. The first
      two are half-width tiles side by side, the arc and the chart are smaller,
      and the figures each tile adds after its headline fold under "More"
      (PhoneMore). Which come first follows `phonePlace` above: CSS `order`, so
      the reading order on a phone follows what is drawn, not the source. From
      768px nothing changes.
    -->
    <div v-else-if="!isHistoricalMode" class="ws-reveal grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-12">
      <!-- What needs her action. The only dark tile on the screen. -->
      <OverviewTile tone="night" title="Needs your attention" :class="['max-md:gap-3 max-md:p-4 md:col-span-2 xl:col-span-5', phonePlace(attentionHasFigures)]">
        <!--
          On a phone each half of this tile is one link, the count and its words
          together, instead of a count, a button and a link stacked: at half a
          phone's width those made the first row 400px tall (Loyd, 2026-10-03).
          The payments themselves are one tap away on Monthly Income.
        -->
        <div class="flex flex-1 flex-col gap-3 md:hidden">
          <UnavailableNote
            v-if="pendingPaymentsFailed"
            dark
            message="Payments to verify could not be loaded."
            @retry="refreshAllData"
          />
          <router-link v-else to="/admin/income?tab=verify" class="press group/att flex flex-col gap-1">
            <span class="flex items-start justify-between gap-2">
              <span class="text-4xl leading-none font-semibold tabular tracking-tight">{{ pendingCount }}</span>
              <ArrowUpRight class="size-4 text-on-night-soft" aria-hidden="true" />
            </span>
            <span class="text-sm text-on-night-soft">{{ pendingCount === 1 ? 'payment' : 'payments' }} to verify</span>
            <span v-if="pendingCount > 0" class="text-xs tabular text-on-night-soft">{{ peso(pendingTotal, 2) }} in total</span>
          </router-link>
          <UnavailableNote
            v-if="maintenanceTicketsFetchFailed"
            dark
            class="mt-auto"
            message="Repairs could not be loaded."
            @retry="refreshAllData"
          />
          <router-link v-else to="/admin/tickets" class="press mt-auto flex flex-col gap-1 border-t border-white/10 pt-3">
            <span class="flex items-start justify-between gap-2">
              <span class="text-3xl leading-none font-semibold tabular">{{ urgentTickets.length }}</span>
              <ArrowUpRight class="size-4 text-on-night-soft" aria-hidden="true" />
            </span>
            <span class="text-sm text-on-night-soft">urgent {{ urgentTickets.length === 1 ? 'repair' : 'repairs' }} open</span>
          </router-link>
        </div>

        <UnavailableNote
          v-if="pendingPaymentsFailed"
          dark
          class="max-md:hidden"
          message="The payments waiting for verification could not be loaded. There may still be some."
          @retry="refreshAllData"
        />
        <div v-else class="max-md:hidden">
          <p class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span class="text-5xl leading-none font-semibold tabular tracking-tight">{{ pendingCount }}</span>
            <span class="text-sm text-on-night-soft">
              {{ pendingCount === 1 ? 'payment' : 'payments' }} to verify<template v-if="pendingCount > 0">, {{ peso(pendingTotal, 2) }} in total</template>
            </span>
          </p>
          <!-- No "Nothing is waiting for verification" under a 0: the count
               is the answer (Sean, 2026-10-01: figures at a glance). -->
          <ul v-if="pendingPreview.length" class="mt-4 divide-y divide-white/10">
            <li
              v-for="(p, i) in pendingPreview"
              :key="p.id"
              class="list-reveal-item flex items-center justify-between gap-3 py-2.5"
              :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
            >
              <span class="min-w-0">
                <span class="block text-sm font-medium">{{ p.name }}</span>
                <span class="block text-xs text-on-night-soft">
                  <template v-if="p.unit">Unit {{ p.unit }}</template><template v-if="p.unit && p.date">, </template>{{ p.date }}
                </span>
              </span>
              <span class="text-sm font-semibold tabular">{{ peso(p.amount, 2) }}</span>
            </li>
          </ul>
          <router-link v-if="pendingCount > 0" to="/admin/income?tab=verify" class="pill-btn-light mt-4">
            Review payments
          </router-link>
        </div>

        <div class="mt-auto border-t border-white/10 pt-4 max-md:hidden">
          <UnavailableNote
            v-if="maintenanceTicketsFetchFailed"
            dark
            message="Repair requests could not be loaded. There may still be urgent ones."
            @retry="refreshAllData"
          />
          <div v-else class="flex flex-wrap items-center justify-between gap-3">
            <p class="flex items-baseline gap-3">
              <span class="text-3xl leading-none font-semibold tabular">{{ urgentTickets.length }}</span>
              <span class="text-sm text-on-night-soft">
                urgent {{ urgentTickets.length === 1 ? 'repair' : 'repairs' }} open
              </span>
            </p>
            <router-link to="/admin/tickets" class="press inline-block py-1 text-sm font-semibold">
              Open repairs
            </router-link>
          </div>
        </div>
      </OverviewTile>

      <OverviewTile
        :title="`Rent and water for ${MONTH_LONG[CURRENT_MONTH - 1]} ${CURRENT_YEAR}`"
        phone-title="Rent and water"
        to="/admin/income"
        to-label="Open the income ledger"
        :class="['max-md:gap-3 max-md:p-4 xl:col-span-4', phonePlace(monthHasFigures)]"
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
              303px tile, and a seven-figure month is not hypothetical here. Half
              a phone's width is less again, so `text-2xl` there; `text-4xl` on a
              tablet, `text-5xl` from 640px as before.
            -->
            <p class="text-2xl leading-none font-semibold tabular tracking-tight md:text-4xl lg:text-5xl">{{ peso(currentMonthRevenue) }}</p>
            <!-- The count only; "usually entered a week or two after" was
                 explanation she does not need on her own screen (Sean, 2026-10-01). -->
            <p class="mt-2 text-sm text-ink-soft">
              <span class="md:hidden">{{ MONTH_LONG[CURRENT_MONTH - 1] }}, </span>{{ currentMonthRecordCount }} {{ currentMonthRecordCount === 1 ? 'payment' : 'payments' }}<span class="max-md:hidden"> entered for {{ MONTH_LONG[CURRENT_MONTH - 1] }}</span> so far
            </p>
          </div>
          <div class="mt-auto flex flex-col gap-3 md:gap-4">
            <PhoneMore>
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line pt-4 text-sm">
                <span class="text-ink-soft">Total for {{ CURRENT_YEAR }}</span>
                <span class="font-semibold tabular">{{ peso(monthlyRevenue) }}</span>
              </div>
            </PhoneMore>
          </div>
        </template>
      </OverviewTile>

      <OverviewTile title="Occupancy" to="/admin/directory" to-label="Open rooms and rates" class="col-span-2 max-md:order-2 max-md:gap-2 max-md:p-4 md:col-span-1 xl:col-span-3">
        <UnavailableNote
          v-if="roomsFetchFailed"
          message="Room status could not be loaded."
          @retry="refreshAllData"
        />
        <template v-else>
          <!-- The arc on a phone as well (Loyd, 2026-10-03: "I need the semicircle"),
               a little narrower there so the month chart still fits below it. -->
          <OccupancyArc :units="arcUnits" class="max-md:max-w-[14rem]" />
          <p class="text-center text-sm text-ink-soft">
            <template v-if="totalRoomsCount && vacantUnits.length === totalRoomsCount">All {{ totalRoomsCount }} units are vacant.</template>
            <template v-else-if="vacantUnits.length">
              Vacant: {{ vacantUnits.map((u) => u.unitCode.toUpperCase()).join(', ') }}
            </template>
            <template v-else>All {{ totalRoomsCount }} units are occupied.</template>
          </p>
        </template>
      </OverviewTile>

      <OverviewTile
        :title="`Rent and water by month, ${CURRENT_YEAR}`"
        to="/admin/income"
        to-label="Open the income ledger"
        class="col-span-2 max-md:order-3 max-md:gap-3 max-md:p-4 xl:col-span-8"
      >
        <UnavailableNote
          v-if="incomeRecordsFetchFailed"
          message="Collections could not be loaded, so the months cannot be drawn."
          @retry="refreshAllData"
        />
        <template v-else>
          <MonthCapsules :months="liveCapsules" :label="`Collections by month in ${CURRENT_YEAR}`" short />
          <PhoneMore>
            <dl class="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
              <div>
                <dt class="text-xs text-ink-faint">Total entered</dt>
                <dd class="text-lg font-semibold tabular">{{ peso(monthlyRevenue) }}</dd>
                <dd class="text-xs text-ink-soft">
                  Across {{ liveRecordedMonths.length }} {{ liveRecordedMonths.length === 1 ? 'month' : 'months' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-ink-faint">Monthly average</dt>
                <dd class="text-lg font-semibold tabular">{{ peso(liveRecordedAverage) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-ink-faint">Expected each month</dt>
                <dd class="text-lg font-semibold tabular">
                  {{ roomsFetchFailed ? 'Unavailable' : peso(baseMonthlyRunRate) }}
                </dd>
                <dd class="text-xs text-ink-soft">From the units occupied now</dd>
              </div>
            </dl>
          </PhoneMore>
        </template>
      </OverviewTile>

      <OverviewTile title="Units by cluster" to="/admin/directory" to-label="Open rooms and rates" class="col-span-2 xl:col-span-4 max-md:order-5">
        <UnavailableNote
          v-if="roomsFetchFailed"
          message="Room status could not be loaded."
          @retry="refreshAllData"
        />
        <ul v-else class="flex flex-col gap-4">
          <li
            v-for="(c, i) in liveClusterPerformance"
            :key="c.name"
            class="list-reveal-item"
            :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
          >
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="font-medium">{{ c.name }}</span>
              <span class="tabular text-ink-soft">{{ c.occupied }} of {{ c.total }} occupied</span>
            </div>
            <div class="mt-2 flex gap-1" aria-hidden="true">
              <span
                v-for="n in c.total"
                :key="n"
                class="bar-fill h-2 flex-1 origin-left rounded-full"
                :class="n <= c.occupied ? 'bg-brand' : 'hatch border border-line'"
                :style="{ animationDelay: `${Math.min(n - 1, 9) * 30}ms` }"
              />
            </div>
            <p class="mt-1.5 text-xs text-ink-faint tabular">
              Total rent {{ peso(c.revenue) }}
            </p>
          </li>
        </ul>
      </OverviewTile>

      <!-- The full row until xl: at half width its table needed 321px of a 287px
           wrapper, so the Net column sat behind a sideways scroll. -->
      <OverviewTile :title="`Net income, ${CURRENT_YEAR}`" to="/admin/expenses" to-label="Open the expense ledger" class="col-span-2 xl:col-span-6 max-md:order-5">
        <UnavailableNote
          v-if="incomeRecordsFetchFailed || expenseRecordsFetchFailed"
          message="Income or expenses could not be loaded, so net figures cannot be worked out."
          @retry="refreshAllData"
        />
        <p v-else-if="!liveLatestCashMonth" class="text-sm text-ink-soft">
          No collections are entered for {{ CURRENT_YEAR }} yet.
        </p>
        <template v-else>
          <div>
            <p class="text-xs text-ink-faint">
              {{ MONTH_LONG[liveLatestCashMonth.monthNum - 1] }}
            </p>
            <p
              :class="[
                'text-3xl leading-tight font-semibold tabular',
                liveLatestCashMonth.noi < 0 && 'text-overdue',
              ]"
            >
              {{ peso(liveLatestCashMonth.noi) }}
            </p>
          </div>
          <template v-if="liveLatestCashMonth.noi >= 0">
            <SegmentBar
              :segments="[
                { label: 'Expenses', value: liveLatestCashMonth.expenses, tone: 'night' },
                { label: 'Net', value: liveLatestCashMonth.noi, tone: 'bright' },
              ]"
              :label="`Of ${peso(liveLatestCashMonth.grossIncome)} in rent and water, ${peso(liveLatestCashMonth.expenses)} went to operating expenses and ${peso(liveLatestCashMonth.noi)} remained.`"
            />
            <!-- A key, not a second set of figures: the heading above already
                 gives Net, and the table the expenses (Sean, 2026-10-01). -->
            <ul class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
              <li class="flex items-center gap-1.5">
                <span aria-hidden="true" class="size-2.5 rounded-full bg-series-night" />
                Expenses
              </li>
              <li class="flex items-center gap-1.5">
                <span aria-hidden="true" class="size-2.5 rounded-full bg-brand-bright" />
                Net
              </li>
            </ul>
          </template>

          <!--
            Wrapped, like the five other `ws-table`s on this screen. This was
            the one bare one: `.ws-table` is `width: 100%`, which compresses a
            table but does not stop it overflowing once the columns cannot get
            any narrower - a month name and three peso figures on a 375px
            screen. Without `.ws-table-wrap` there is nothing to scroll inside,
            so the overflow becomes the PAGE's, and the dashboard scrolls
            sideways. Its sibling at "Month by month" has had the wrapper all
            along; this one was simply missed.
          -->
          <div class="ws-table-wrap">
          <table class="ws-table">
            <caption class="sr-only">Collections, operating expenses and net operating income by month</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" class="num">Rent and water</th>
                <!-- On a phone the four columns did not fit 303px and Net, the figure
                     she reads this for, sat off-screen behind a sideways scroll. There
                     the spending moves under Rent and water as a second line. -->
                <th scope="col" class="num hidden sm:table-cell">Expenses</th>
                <th scope="col" class="num">Net</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, i) in liveRecordedMonths"
                :key="d.month"
                class="list-reveal-item"
                :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
              >
                <th scope="row">{{ d.month }}</th>
                <td class="num">
                  {{ peso(d.grossIncome) }}
                  <span class="block text-xs font-normal text-ink-faint sm:hidden">
                    {{ d.hasExpenses ? `spent ${peso(d.expenses)}` : 'spending not entered' }}
                  </span>
                </td>
                <!-- A month with no expense entries is not entered, the same as a
                     month with no collections: "P0" read as a month that cost
                     nothing, and its Net as pure profit. -->
                <td class="num text-ink-soft hidden sm:table-cell">
                  <StatusPill v-if="!d.hasExpenses" tone="unentered">Not entered</StatusPill>
                  <template v-else>{{ peso(d.expenses) }}</template>
                </td>
                <td :class="['num font-semibold', d.noi < 0 && 'text-overdue']">{{ d.hasExpenses ? peso(d.noi) : '' }}</td>
              </tr>
            </tbody>
          </table>
          </div>
          <p class="text-xs leading-5 text-ink-faint">
            Personal spending in {{ CURRENT_YEAR }}: {{ peso(livePersonalTotal) }}, not counted above
          </p>
        </template>
      </OverviewTile>

      <OverviewTile
        title="Open repair requests"
        to="/admin/tickets"
        to-label="Open repairs"
        class="col-span-2 xl:col-span-6 max-md:order-5"
      >
        <UnavailableNote
          v-if="maintenanceTicketsFetchFailed"
          message="Repair requests could not be loaded. There may still be open ones."
          @retry="refreshAllData"
        />
        <p v-else-if="openTickets.length === 0" class="text-sm text-ink-soft">No repair requests are open.</p>
        <template v-else>
          <ul class="divide-y divide-line">
            <li
              v-for="(t, i) in openTicketsPreview"
              :key="t.id"
              class="list-reveal-item flex items-center justify-between gap-3 py-3"
              :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
            >
              <span class="min-w-0">
                <!-- break-words: the resident's own free text from the ticket
                     form, same overflow risk MaintenanceDispatchView's board
                     card had (measured 495px hidden at the ordinary desktop
                     width, silently, by body's overflow-x: hidden). -->
                <span class="block break-words text-sm font-medium">{{ t.title }}</span>
                <span class="block text-xs text-ink-faint">
                  {{ t.unit }}, {{ t.status === 'Open' ? 'submitted' : t.status.toLowerCase() }}<template v-if="t.technician">, {{ t.technician === 'Unassigned' ? 'no one assigned yet' : t.technician }}</template>
                </span>
              </span>
              <StatusPill :tone="t.priority === 'Emergency' || t.priority === 'High' ? 'overdue' : 'neutral'">
                {{ t.priority }}
              </StatusPill>
            </li>
          </ul>
          <p v-if="openTickets.length > openTicketsPreview.length" class="text-xs text-ink-faint">
            {{ openTickets.length - openTicketsPreview.length }} more open in Repairs.
          </p>
        </template>
      </OverviewTile>
    </div>

    <!-- ================================================================== *
     * Archive year
     * ================================================================== -->
    <!-- Every money tile names its year in its title (Sean, 2026-10-02: the
         landlady was surprised by all-time sums elsewhere; here nothing was
         all-time, but a figure should say which year it is without the reader
         looking back up at the heading). The live year's tiles do the same. -->
    <div v-else class="ws-reveal grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      <OverviewTile tone="brand" :title="`Rent and water entered, ${selectedArchiveYear}`" class="xl:col-span-3">
        <UnavailableNote v-if="incomeRecordsFetchFailed" dark @retry="refreshAllData" />
        <div v-else>
          <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(historicalAnnualGrossTotal) }}</p>
          <p class="mt-2 text-sm text-on-brand-soft">
            {{ historicalIncomeRecords.length }} {{ historicalIncomeRecords.length === 1 ? 'entry' : 'entries' }}
          </p>
        </div>
      </OverviewTile>

      <OverviewTile :title="`50% Share, ${selectedArchiveYear}`" class="xl:col-span-3">
        <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
        <div v-else>
          <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(historicalAnnualHalfOfRentShare) }}</p>
          <p class="mt-2 text-sm text-ink-soft">
            Half of each row's Rent Amount, computed by the system and kept for ledger parity with the owner's
            historical spreadsheet.
          </p>
        </div>
      </OverviewTile>

      <OverviewTile :title="`Expenses, ${selectedArchiveYear}`" to="/admin/expenses" to-label="Open the expense ledger" class="xl:col-span-3">
        <UnavailableNote v-if="expenseRecordsFetchFailed" @retry="refreshAllData" />
        <div v-else>
          <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(historicalAnnualExpenseTotal) }}</p>
          <p class="mt-2 text-sm text-ink-soft">
            {{ historicalExpenseRecords.length }} {{ historicalExpenseRecords.length === 1 ? 'entry' : 'entries' }},
            not counting {{ peso(historicalAnnualPersonalTotal) }} personal (Main House, Other)
          </p>
        </div>
      </OverviewTile>

      <OverviewTile :title="`Net income, ${selectedArchiveYear}`" class="xl:col-span-3">
        <UnavailableNote v-if="incomeRecordsFetchFailed || expenseRecordsFetchFailed" @retry="refreshAllData" />
        <div v-else>
          <p
            :class="[
              'text-4xl leading-none font-semibold tabular tracking-tight',
              historicalAnnualNOI < 0 && 'text-overdue',
            ]"
          >
            {{ peso(historicalAnnualNOI) }}
          </p>
          <p class="mt-2 text-sm text-ink-soft">Rent and water entered, minus operating expenses</p>
        </div>
      </OverviewTile>

      <OverviewTile :title="`Rent and water by month, ${selectedArchiveYear}`" class="md:col-span-2 xl:col-span-8">
        <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
        <template v-else>
          <MonthCapsules :months="historicalCapsules" :label="`Collections by month in ${selectedArchiveYear}`" />
          <dl class="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
            <div>
              <dt class="text-xs text-ink-faint">Total entered</dt>
              <dd class="text-lg font-semibold tabular">{{ peso(historicalAnnualGrossTotal) }}</dd>
              <dd class="text-xs text-ink-soft">All units</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Monthly average</dt>
              <dd class="text-lg font-semibold tabular">{{ peso(historicalRecordedAverage) }}</dd>
            </div>
            <div v-if="historicalHighestMonth">
              <dt class="text-xs text-ink-faint">Highest month</dt>
              <dd class="text-lg font-semibold tabular">{{ peso(historicalHighestMonth.grossIncome) }}</dd>
              <dd class="text-xs text-ink-soft">{{ MONTH_LONG[historicalHighestMonth.monthNum - 1] }}</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>

      <OverviewTile :title="`Rent and water by cluster, ${selectedArchiveYear}`" class="xl:col-span-4">
        <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
        <ul v-else class="flex flex-col gap-4">
          <li
            v-for="(c, i) in historicalClusterPerformance"
            :key="c.name"
            class="list-reveal-item"
            :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
          >
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="font-medium">{{ c.name }}</span>
              <span class="tabular font-semibold">{{ peso(c.revenue) }}</span>
            </div>
            <div class="mt-2 h-2 rounded-full bg-canvas" aria-hidden="true">
              <div
                class="bar-fill h-full origin-left rounded-full bg-brand"
                :style="{ width: `${c.share}%`, animationDelay: `${Math.min(i, 9) * 30}ms` }"
              />
            </div>
            <p class="mt-1.5 text-xs text-ink-faint tabular">
              <template v-if="c.recordCount === 0">No entries this year.</template>
              <template v-else>
                {{ c.share.toFixed(1) }}% of the year. {{ c.recordCount }}
                {{ c.recordCount === 1 ? 'entry' : 'entries' }} across {{ c.uniqueRooms }}
                {{ c.uniqueRooms === 1 ? 'unit' : 'units' }}.
              </template>
            </p>
          </li>
        </ul>
      </OverviewTile>

      <OverviewTile :title="`Month by month, ${selectedArchiveYear}`" class="md:col-span-2 xl:col-span-12">
        <UnavailableNote
          v-if="incomeRecordsFetchFailed || expenseRecordsFetchFailed"
          message="Income or expenses could not be loaded, so net figures cannot be worked out."
          @retry="refreshAllData"
        />
        <div v-else class="ws-table-wrap">
          <table class="ws-table">
            <caption class="sr-only">Collections, expenses and net operating income by month, {{ selectedArchiveYear }}</caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col" class="num">Rent and water</th>
                <th scope="col" class="num">Expenses</th>
                <th scope="col" class="num">Net</th>
                <th scope="col" class="num">Personal, not deducted</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, i) in historical12MonthsData"
                :key="d.month"
                class="list-reveal-item"
                :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
              >
                <th scope="row">{{ MONTH_LONG[d.monthNum - 1] }}</th>
                <td class="num">
                  <StatusPill v-if="!d.hasIncome" tone="unentered">Not entered</StatusPill>
                  <template v-else>{{ peso(d.grossIncome) }}</template>
                </td>
                <td class="num text-ink-soft">
                  <StatusPill v-if="!d.hasExpenses" tone="unentered">Not entered</StatusPill>
                  <template v-else>{{ peso(d.expenses) }}</template>
                </td>
                <td :class="['num font-semibold', d.noi < 0 && 'text-overdue']">
                  {{ d.hasIncome && d.hasExpenses ? peso(d.noi) : '' }}
                </td>
                <td class="num text-ink-faint">{{ peso(d.personalExpenses) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </OverviewTile>

      <!-- Tenants who paid in the year -->
      <OverviewTile :title="`Tenants in ${selectedArchiveYear}`" class="md:col-span-2 xl:col-span-12">
        <template #actions>
          <!--
            This screen has three of these disclosures (tenants, units, ledger
            entries), each rendering identically as "Show" or "Hide" - visually
            fine beside its own OverviewTile heading, but a screen reader user
            navigating by "buttons" list hears three unlabelled "Show" controls
            with nothing distinguishing them. `aria-label` restates which
            section each one opens, matching the tile's own title.
          -->
          <button
            type="button"
            class="pill-btn"
            :aria-expanded="historicalTenantRosterOpen"
            aria-controls="archive-roster"
            :aria-label="`${historicalTenantRosterOpen ? 'Hide' : 'Show'} tenants in ${selectedArchiveYear}`"
            @click="historicalTenantRosterOpen = !historicalTenantRosterOpen"
          >
            {{ historicalTenantRosterOpen ? 'Hide' : 'Show' }}
          </button>
        </template>
        <!-- `v-if`, not `v-show`, so this disclosure actually unfolds each time
             it opens: `.ws-reveal`'s `@starting-style` only plays on insertion,
             and a `v-show` element is inserted once and toggled with
             `display`, so it would only ever have played on the very first
             archive-year visit rather than on every "Show" click. -->
        <div v-if="historicalTenantRosterOpen" id="archive-roster" class="ws-reveal flex flex-col gap-4">
          <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
          <template v-else>
            <div class="flex flex-wrap items-center gap-3">
              <div class="relative w-full sm:w-80 shrink-0">
                <!-- left-4/pl-11: the one inset every search box in the
                     workspace uses. Four screens had drifted 2px off it. -->
                <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                <label for="historical-roster-search" class="sr-only">Search by tenant or unit</label>
                <input
                  id="historical-roster-search"
                  v-model="historicalSearchQuery"
                  type="search"
                  placeholder="Search"
                  class="ws-input w-full pl-11"
                />
              </div>
              <PillSelect
                v-model="historicalClusterFilter"
                :options="historicalClusterOptions"
                aria-label="Filter by cluster"
              />
              <p class="text-sm text-ink-soft" aria-live="polite">
                {{ historicalTenantRoster.length }} {{ historicalTenantRoster.length === 1 ? 'tenant' : 'tenants' }}
              </p>
            </div>
            <div class="ws-table-wrap max-h-[28rem]">
              <table class="ws-table">
                <caption class="sr-only">Tenants who paid in {{ selectedArchiveYear }}</caption>
                <thead>
                  <tr class="text-xs text-ink-faint border-b border-line">
                    <th scope="col" class="px-4 py-3 text-left font-medium">Tenant</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium">Unit</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium">Cluster</th>
                    <th scope="col" class="px-4 py-3 text-right font-medium">Payments</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium">Months paid</th>
                    <th scope="col" class="px-4 py-3 text-right font-medium">Rent and water paid</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium">Invoice no., first found</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in historicalTenantRoster" :key="`${t.name}-${t.unit}`">
                    <th scope="row" class="px-4 py-3 text-left font-medium">{{ t.name }}</th>
                    <td class="px-4 py-3 tabular">{{ t.unit }}</td>
                    <td class="px-4 py-3 text-ink-soft">{{ t.cluster }}</td>
                    <td class="px-4 py-3 text-right tabular">{{ t.monthsCount }}</td>
                    <td class="px-4 py-3 text-xs text-ink-soft">{{ t.activeMonths.join(', ') }}</td>
                    <td class="px-4 py-3 text-right font-semibold tabular">{{ peso(t.totalRemitted) }}</td>
                    <td class="px-4 py-3 text-xs text-ink-soft tabular">{{ t.invoiceSample }}</td>
                  </tr>
                  <tr v-if="historicalTenantRoster.length === 0">
                    <td colspan="7" class="px-4 py-8 text-center text-ink-soft">
                      No tenants match this search for {{ selectedArchiveYear }}.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </OverviewTile>

      <OverviewTile :title="`Units in ${selectedArchiveYear}`" class="md:col-span-2 xl:col-span-12">
        <template #actions>
          <button
            type="button"
            class="pill-btn"
            :aria-expanded="historicalUnitTableOpen"
            aria-controls="archive-units"
            :aria-label="`${historicalUnitTableOpen ? 'Hide' : 'Show'} units in ${selectedArchiveYear}`"
            @click="historicalUnitTableOpen = !historicalUnitTableOpen"
          >
            {{ historicalUnitTableOpen ? 'Hide' : 'Show' }}
          </button>
        </template>
        <div v-if="historicalUnitTableOpen" id="archive-units" class="ws-reveal">
          <UnavailableNote v-if="incomeRecordsFetchFailed || roomsFetchFailed" @retry="refreshAllData" />
          <div v-else class="ws-table-wrap max-h-[28rem]">
            <table class="ws-table">
              <caption class="sr-only">Entries and collections per unit in {{ selectedArchiveYear }}</caption>
              <thead>
                <tr class="text-xs text-ink-faint border-b border-line">
                  <th scope="col" class="px-4 py-3 text-left font-medium">Unit</th>
                  <th scope="col" class="px-4 py-3 text-left font-medium">Cluster</th>
                  <th scope="col" class="px-4 py-3 text-left font-medium">Floor</th>
                  <th scope="col" class="px-4 py-3 text-right font-medium">Entries</th>
                  <th scope="col" class="px-4 py-3 text-right font-medium">Average entry</th>
                  <th scope="col" class="px-4 py-3 text-right font-medium">Rent and water entered</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(u, i) in historicalRoomUtilization"
                  :key="u.unitCode"
                  class="list-reveal-item"
                  :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                >
                  <th scope="row" class="px-4 py-3 text-left font-semibold">{{ u.unitCode.toUpperCase() }}</th>
                  <td class="px-4 py-3 text-ink-soft">{{ u.cluster }}</td>
                  <td class="px-4 py-3 text-ink-soft">{{ u.floorLabel }}</td>
                  <td class="px-4 py-3 text-right">{{ u.activeMonths }}</td>
                  <td class="px-4 py-3 text-right text-ink-soft">{{ peso(u.averageMonthlyRevenue) }}</td>
                  <td class="px-4 py-3 text-right font-semibold">{{ peso(u.totalRevenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </OverviewTile>

      <OverviewTile :title="`Ledger entries in ${selectedArchiveYear}`" class="md:col-span-2 xl:col-span-12">
        <template #actions>
          <button
            type="button"
            class="pill-btn"
            :aria-expanded="historicalLedgerOpen"
            aria-controls="archive-ledger"
            :aria-label="`${historicalLedgerOpen ? 'Hide' : 'Show'} ledger entries in ${selectedArchiveYear}`"
            @click="historicalLedgerOpen = !historicalLedgerOpen"
          >
            {{ historicalLedgerOpen ? 'Hide' : 'Show' }}
          </button>
        </template>
        <div v-if="historicalLedgerOpen" id="archive-ledger" class="ws-reveal flex flex-col gap-4">
          <div role="tablist" aria-label="Ledger" class="inline-flex self-start rounded-full bg-canvas p-1">
            <button
              id="ledger-tab-income"
              type="button"
              role="tab"
              :aria-selected="historicalLedgerTab === 'income'"
              aria-controls="ledger-panel"
              :tabindex="historicalLedgerTab === 'income' ? 0 : -1"
              :class="[
                'press rounded-full px-4 py-2 text-sm font-semibold cursor-pointer',
                historicalLedgerTab === 'income' ? 'bg-night text-on-night' : 'text-ink-soft',
              ]"
              @click="historicalLedgerTab = 'income'"
              @keydown.right.prevent="historicalLedgerTab = 'expenses'"
            >
              Income <span class="tabular font-normal">{{ historicalIncomeRecords.length }}</span>
            </button>
            <button
              id="ledger-tab-expenses"
              type="button"
              role="tab"
              :aria-selected="historicalLedgerTab === 'expenses'"
              aria-controls="ledger-panel"
              :tabindex="historicalLedgerTab === 'expenses' ? 0 : -1"
              :class="[
                'press rounded-full px-4 py-2 text-sm font-semibold cursor-pointer',
                historicalLedgerTab === 'expenses' ? 'bg-night text-on-night' : 'text-ink-soft',
              ]"
              @click="historicalLedgerTab = 'expenses'"
              @keydown.left.prevent="historicalLedgerTab = 'income'"
            >
              Expenses <span class="tabular font-normal">{{ historicalExpenseRecords.length }}</span>
            </button>
          </div>

          <div
            id="ledger-panel"
            role="tabpanel"
            :aria-labelledby="historicalLedgerTab === 'income' ? 'ledger-tab-income' : 'ledger-tab-expenses'"
          >
            <template v-if="historicalLedgerTab === 'income'">
              <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
              <div v-else class="ws-reveal ws-table-wrap max-h-[32rem]">
                <table class="ws-table">
                  <caption class="sr-only">Income entries, {{ selectedArchiveYear }}</caption>
                  <thead>
                    <tr class="text-xs text-ink-faint border-b border-line">
                      <th scope="col" class="px-4 py-3 text-left font-medium">Date paid</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Unit</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Tenant</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Rent for</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">Rent</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">Water</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">Total remitted</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Invoice no.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(r, i) in historicalIncomeRecords"
                      :key="r.id"
                      class="list-reveal-item"
                      :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                    >
                      <td class="whitespace-nowrap text-ink-soft">{{ r.datePaid }}</td>
                      <td class="font-semibold">{{ r.unit }}</td>
                      <td>{{ r.contact }}</td>
                      <td class="text-xs text-ink-soft">{{ r.rentFor }}</td>
                      <td class="num text-ink-soft">{{ peso(r.rent, 2) }}</td>
                      <td class="num text-ink-soft">{{ peso(r.water, 2) }}</td>
                      <td class="num font-semibold">{{ peso(r.totalRemitted || r.rent, 2) }}</td>
                      <td class="text-xs text-ink-soft">{{ r.invoice }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <template v-else>
              <UnavailableNote v-if="expenseRecordsFetchFailed" @retry="refreshAllData" />
              <div v-else class="ws-reveal ws-table-wrap max-h-[32rem]">
                <table class="ws-table">
                  <caption class="sr-only">Expense entries, {{ selectedArchiveYear }}</caption>
                  <thead>
                    <tr class="text-xs text-ink-faint border-b border-line">
                      <th scope="col" class="px-4 py-3 text-left font-medium">Date</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Invoice or supplier</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Category</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Split across areas</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">Amount spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(e, i) in historicalExpenseRecords"
                      :key="e.id"
                      class="list-reveal-item"
                      :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                    >
                      <td class="tabular whitespace-nowrap text-ink-soft">{{ e.date }}</td>
                      <td>{{ e.description }}</td>
                      <td class="text-ink-soft">{{ e.category }}</td>
                      <td class="tabular text-xs text-ink-soft">
                        <span v-for="(s, sIdx) in e.splits" :key="sIdx" class="mr-3 inline-block">
                          {{ s.area }} {{ peso(s.amount, 2) }}
                        </span>
                      </td>
                      <td class="num font-semibold">{{ peso(e.totalAmount || 0, 2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
        </div>
      </OverviewTile>
    </div>
  </div>
</template>
