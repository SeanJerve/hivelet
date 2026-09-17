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
import { useRouter, useRoute } from 'vue-router';
import { api } from '@/lib/api';
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
  isOnsitePaymentModalOpen,
  waterChargeFor,
  type RoomItem,
  type MaintenanceTicket,
  roomsFetchFailed,
  incomeRecordsFetchFailed,
  expenseRecordsFetchFailed,
  maintenanceTicketsFetchFailed,
} from '@/lib/systemState';
import { CLUSTERS, peso } from '@/lib/canonicalUnits';
import Skeleton from '@/components/ui/Skeleton.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import MonthCapsules from '@/components/overview/MonthCapsules.vue';
import OccupancyArc from '@/components/overview/OccupancyArc.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
import type { ArcUnit, CapsuleMonth } from '@/components/overview/types';
import {
  Plus,
  ReceiptText,
  RefreshCw,
  Calendar,
  ChevronDown,
  Check,
  Download,
  ArrowLeft,
  Search,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const pendingPayments = ref<any[]>([]);
/** True when the verification queue could not be read, so 0 is not reported as fact. */
const pendingPaymentsFailed = ref(false);
const isRefreshing = ref(false);
const isInitialLoading = ref(true);

// Read from the clock, not pinned to a literal. Every "live" figure filters on
// `r.year === CURRENT_YEAR`, so a literal would read zero from 1 January. The
// labels read it too: they used to say 2026 in six places regardless.
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/* ========================================================================== *
 * Greeting
 * ========================================================================== */

const firstName = computed(() => {
  const full = (currentUser.value?.fullName ?? '').replace(/^(mrs|mr|ms|miss|dr)\.?\s+/i, '').trim();
  return full.split(/\s+/)[0] ?? '';
});

const partOfDay = (() => {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
})();

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
  const qYear = route.query.archiveYear as string | undefined;
  if (qYear && availableHistoricalYears.value.includes(qYear)) {
    isHistoricalMode.value = true;
    selectedArchiveYear.value = qYear;
  } else {
    isHistoricalMode.value = false;
  }
}

watch(() => route.query.archiveYear, syncFromRoute);

// The switch used to show a 180 ms skeleton although every figure was already in
// memory: a loading state with nothing loading. It is instant now.
function enterHistoricalMode(year: string) {
  selectedArchiveYear.value = year;
  isHistoricalMode.value = true;
  router.replace({ query: { ...route.query, archiveYear: year } });
}

function exitHistoricalMode() {
  isHistoricalMode.value = false;
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

function closeYearMenu(returnFocus = false) {
  isYearMenuOpen.value = false;
  if (returnFocus) yearButton.value?.focus();
}

function chooseYear(year: string) {
  closeYearMenu(true);
  if (year === String(CURRENT_YEAR)) exitHistoricalMode();
  else enterHistoricalMode(year);
}

function onDocumentPointerDown(e: PointerEvent) {
  if (isYearMenuOpen.value && yearMenuRoot.value && !yearMenuRoot.value.contains(e.target as Node)) {
    closeYearMenu();
  }
}

/* ========================================================================== *
 * Loading
 * ========================================================================== */

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
      unit: p.rooms?.room_number ? String(p.rooms.room_number).toUpperCase() : '',
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
const lastRecordedMonth = computed(() =>
  liveIncomeRecords.value.reduce((m, r) => Math.max(m, r.month ?? 0), 0)
);

/**
 * Said when this month has nothing entered. Collection happens in person and is
 * typed in afterwards, so an empty month is usually one not yet entered rather
 * than one with no income (CLIENT_MEETING_QUESTIONS.md 2b).
 */
const ledgerNote = computed(() => {
  if (incomeRecordsFetchFailed.value || currentMonthRecordCount.value > 0) return '';
  if (lastRecordedMonth.value === 0) return `No collections are entered for ${CURRENT_YEAR} yet.`;
  return `Collections are entered through ${MONTH_LONG[lastRecordedMonth.value - 1]}.`;
});

// Base monthly run-rate from currently occupied rooms. Was `linda_fixed ? 200 :
// occupants * 200`, which hardcoded the configurable rate (BR-014) and used 200
// for LF, which is 400.
const baseMonthlyRunRate = computed(() =>
  rooms.reduce((sum, r) => {
    if (!isOccupied(r)) return sum;
    const isLinda = r.waterRateType === 'linda_fixed';
    return sum + Number(r.price || 0) + waterChargeFor(r.unitCode, r.occupants || 1, isLinda);
  }, 0)
);

const baseMonthlyWater = computed(() =>
  rooms.reduce((sum, r) => {
    if (!isOccupied(r)) return sum;
    return sum + waterChargeFor(r.unitCode, r.occupants || 1, r.waterRateType === 'linda_fixed');
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
        grossIncome,
        halfOfRentShare: matchingRecords.reduce(
          (sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'BH' ? r.rent / 2 : r.rent) || 0),
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
    (sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'BH' ? r.rent / 2 : r.rent) || 0),
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
      grossIncome,
      halfOfRentShare: matchingRecords.reduce(
        (sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'BH' ? r.rent / 2 : r.rent) || 0),
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

// CSV export for the selected archive year. Quotes are escaped RFC 4180 style so
// a name such as Jose "Jojo" Cruz cannot shift every column.
function exportHistoricalCSV() {
  const year = selectedArchiveYear.value;
  const headers = ['Type', 'Date', 'Month', 'Unit / OR', 'Contact / Supplier', 'Category / Cluster', 'Rent / Base', '50% Share', 'Water', 'Total Remitted / Expense'];

  const incomeRows = historicalIncomeRecords.value.map((r) => [
    'INCOME',
    r.datePaid,
    r.month,
    r.unit,
    `"${(r.contact || '').replace(/"/g, '""')}"`,
    r.cluster,
    r.rent,
    r.fiftyPercentShare,
    r.water,
    r.totalRemitted,
  ]);

  const expenseRows = historicalExpenseRecords.value.map((e) => [
    'EXPENSE',
    e.date,
    e.month,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    'Supplier',
    `"${(e.category || '').replace(/"/g, '""')}"`,
    0,
    0,
    0,
    e.totalAmount,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [
      [`HIVELET FINANCIAL AUDIT REPORT - FISCAL YEAR ${year}`],
      [
        `Gross Inflow: ${historicalAnnualGrossTotal.value}`,
        `50% Share (half of Rent Amount): ${historicalAnnualHalfOfRentShare.value}`,
        `Operating Expenses: ${historicalAnnualExpenseTotal.value}`,
        `Personal (not deducted): ${historicalAnnualPersonalTotal.value}`,
        `Net Operating Income: ${historicalAnnualNOI.value}`,
      ],
      [],
      headers,
      ...incomeRows,
      ...expenseRows,
    ]
      .map((e) => (Array.isArray(e) ? e.join(',') : e))
      .join('\n');

  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `Hivelet_FY${year}_Financial_Audit_Report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div class="ws-focus flex flex-col gap-5 text-ink">
    <!-- ================================================================== *
     * Header
     * ================================================================== -->
    <header class="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm text-ink-faint">{{ todayLabel }}</p>
        <h1 class="mt-1 text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          <template v-if="!isHistoricalMode">
            Good {{ partOfDay }}<template v-if="firstName">, {{ firstName }}</template>
          </template>
          <template v-else>{{ selectedArchiveYear }} archive</template>
        </h1>
        <p v-if="isHistoricalMode" class="mt-1 text-sm text-ink-soft">
          Every entry recorded for January to December {{ selectedArchiveYear }}.
        </p>
        <p v-else-if="ledgerNote" class="mt-1 text-sm text-ink-soft">{{ ledgerNote }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div ref="yearMenuRoot" class="relative" @keydown.escape="closeYearMenu(true)">
          <button
            ref="yearButton"
            type="button"
            class="pill-btn"
            aria-haspopup="true"
            :aria-expanded="isYearMenuOpen"
            aria-controls="overview-year-menu"
            @click="isYearMenuOpen = !isYearMenuOpen"
          >
            <Calendar class="size-4 text-ink-soft" aria-hidden="true" />
            <span class="tabular">{{ shownYear }}</span>
            <span class="sr-only">, change year</span>
            <ChevronDown
              :class="['size-4 text-ink-soft transition-transform', isYearMenuOpen && 'rotate-180']"
              aria-hidden="true"
            />
          </button>
          <div
            v-show="isYearMenuOpen"
            id="overview-year-menu"
            class="absolute left-0 top-full z-30 mt-2 min-w-40 rounded-2xl bg-tile p-1.5 shadow-lift border border-line"
          >
            <button
              v-for="y in yearOptions"
              :key="y"
              type="button"
              :aria-current="y === shownYear ? 'true' : undefined"
              class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm tabular hover:bg-canvas cursor-pointer"
              @click="chooseYear(y)"
            >
              <span>{{ y === String(CURRENT_YEAR) ? `${y}, this year` : y }}</span>
              <Check v-if="y === shownYear" class="size-4 text-brand" aria-hidden="true" />
            </button>
          </div>
        </div>

        <template v-if="!isHistoricalMode">
          <button type="button" class="pill-btn-brand" @click="isOnsitePaymentModalOpen = true">
            <Plus class="size-4" aria-hidden="true" />
            Record payment
          </button>
          <router-link to="/admin/expenses" class="pill-btn">
            <ReceiptText class="size-4 text-ink-soft" aria-hidden="true" />
            Record expense
          </router-link>
          <button
            type="button"
            class="icon-btn"
            :disabled="isRefreshing"
            aria-label="Refresh figures"
            @click="refreshAllData"
          >
            <RefreshCw :class="['size-4', isRefreshing && 'animate-spin']" aria-hidden="true" />
          </button>
        </template>
        <template v-else>
          <button type="button" class="pill-btn" @click="exportHistoricalCSV">
            <Download class="size-4 text-ink-soft" aria-hidden="true" />
            Export {{ selectedArchiveYear }} as CSV
          </button>
          <button type="button" class="pill-btn-brand" @click="exitHistoricalMode">
            <ArrowLeft class="size-4" aria-hidden="true" />
            Back to {{ CURRENT_YEAR }}
          </button>
        </template>
      </div>
    </header>

    <div
      v-if="!isInitialLoading && anyLoadFailed"
      role="status"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-verify-soft px-4 py-3 text-sm text-verify"
    >
      <span>Some figures could not be loaded. Each section that is affected says so.</span>
      <button type="button" class="pill-btn" :disabled="isRefreshing" @click="refreshAllData">Try again</button>
    </div>

    <!-- ================================================================== *
     * First load
     * ================================================================== -->
    <div v-if="isInitialLoading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-12" aria-busy="true">
      <span class="sr-only" role="status">Loading the overview</span>
      <div
        v-for="(span, i) in ['xl:col-span-5', 'xl:col-span-4', 'xl:col-span-3', 'md:col-span-2 xl:col-span-8', 'xl:col-span-4']"
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
    <div v-else-if="!isHistoricalMode" class="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      <!-- What needs her action. The only dark tile on the screen. -->
      <OverviewTile tone="night" title="Needs your attention" class="md:col-span-2 xl:col-span-5">
        <UnavailableNote
          v-if="pendingPaymentsFailed"
          dark
          message="The payments waiting for verification could not be loaded. There may still be some."
          @retry="refreshAllData"
        />
        <div v-else>
          <p class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span class="text-5xl leading-none font-semibold tabular tracking-tight">{{ pendingCount }}</span>
            <span class="text-sm text-on-night-soft">
              {{ pendingCount === 1 ? 'payment' : 'payments' }} to verify<template v-if="pendingCount > 0">, {{ peso(pendingTotal) }} in total</template>
            </span>
          </p>
          <ul v-if="pendingPreview.length" class="mt-4 divide-y divide-white/10">
            <li v-for="p in pendingPreview" :key="p.id" class="flex items-center justify-between gap-3 py-2.5">
              <span class="min-w-0">
                <span class="block text-sm font-medium">{{ p.name }}</span>
                <span class="block text-xs text-on-night-soft">
                  <template v-if="p.unit">Unit {{ p.unit }}</template><template v-if="p.unit && p.date">, </template>{{ p.date }}
                </span>
              </span>
              <span class="text-sm font-semibold tabular">{{ peso(p.amount) }}</span>
            </li>
          </ul>
          <p v-else class="mt-2 text-sm text-on-night-soft">Nothing is waiting for verification.</p>
          <router-link v-if="pendingCount > 0" to="/admin/income?tab=verify" class="pill-btn-light mt-4">
            Review payments
          </router-link>
        </div>

        <div class="mt-auto border-t border-white/10 pt-4">
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
            <router-link to="/admin/tickets" class="text-sm font-semibold underline underline-offset-4">
              Open maintenance dispatch
            </router-link>
          </div>
        </div>
      </OverviewTile>

      <OverviewTile
        :title="`Collected in ${MONTH_LONG[CURRENT_MONTH - 1]}`"
        to="/admin/income"
        to-label="Open the income ledger"
        class="xl:col-span-4"
      >
        <UnavailableNote
          v-if="incomeRecordsFetchFailed"
          message="Collections could not be loaded. That is not the same as nothing being collected."
          @retry="refreshAllData"
        />
        <template v-else>
          <div>
            <p class="text-5xl leading-none font-semibold tabular tracking-tight">{{ peso(currentMonthRevenue) }}</p>
            <p class="mt-2 text-sm text-ink-soft">
              {{ currentMonthRecordCount }} {{ currentMonthRecordCount === 1 ? 'collection' : 'collections' }} entered this month
            </p>
          </div>
          <div v-if="ledgerNote" class="flex flex-wrap items-center gap-2">
            <StatusPill tone="unentered">Not entered yet</StatusPill>
          </div>
          <div class="mt-auto flex items-baseline justify-between gap-3 border-t border-line pt-4 text-sm">
            <span class="text-ink-soft">{{ CURRENT_YEAR }} so far</span>
            <span class="font-semibold tabular">{{ peso(monthlyRevenue) }}</span>
          </div>
        </template>
      </OverviewTile>

      <OverviewTile title="Occupancy" to="/admin/directory" to-label="Open the room and rate directory" class="xl:col-span-3">
        <UnavailableNote
          v-if="roomsFetchFailed"
          message="Room status could not be loaded. The building is not necessarily empty."
          @retry="refreshAllData"
        />
        <template v-else>
          <OccupancyArc :units="arcUnits" />
          <p class="text-center text-sm text-ink-soft">
            <template v-if="vacantUnits.length">
              Vacant: {{ vacantUnits.map((u) => u.unitCode.toUpperCase()).join(', ') }}
            </template>
            <template v-else>All {{ totalRoomsCount }} units are occupied.</template>
          </p>
        </template>
      </OverviewTile>

      <OverviewTile
        :title="`Collections in ${CURRENT_YEAR}`"
        to="/admin/income"
        to-label="Open the income ledger"
        class="md:col-span-2 xl:col-span-8"
      >
        <UnavailableNote
          v-if="incomeRecordsFetchFailed"
          message="Collections could not be loaded, so the months cannot be drawn."
          @retry="refreshAllData"
        />
        <template v-else>
          <MonthCapsules :months="liveCapsules" :label="`Collections by month in ${CURRENT_YEAR}`" />
          <dl class="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
            <div>
              <dt class="text-xs text-ink-faint">Entered so far</dt>
              <dd class="text-lg font-semibold tabular">{{ peso(monthlyRevenue) }}</dd>
              <dd class="text-xs text-ink-soft">
                Across {{ liveRecordedMonths.length }} {{ liveRecordedMonths.length === 1 ? 'month' : 'months' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Average entered month</dt>
              <dd class="text-lg font-semibold tabular">{{ peso(liveRecordedAverage) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Expected each month</dt>
              <dd class="text-lg font-semibold tabular">
                {{ roomsFetchFailed ? 'Unavailable' : peso(baseMonthlyRunRate) }}
              </dd>
              <dd class="text-xs text-ink-soft">Rent and water of the units occupied now</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>

      <OverviewTile title="Units by cluster" to="/admin/directory" to-label="Open the room and rate directory" class="xl:col-span-4">
        <UnavailableNote
          v-if="roomsFetchFailed"
          message="Room status could not be loaded."
          @retry="refreshAllData"
        />
        <ul v-else class="flex flex-col gap-4">
          <li v-for="c in liveClusterPerformance" :key="c.name">
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="font-medium">{{ c.name }}</span>
              <span class="tabular text-ink-soft">{{ c.occupied }} of {{ c.total }} occupied</span>
            </div>
            <div class="mt-2 flex gap-1" aria-hidden="true">
              <span
                v-for="n in c.total"
                :key="n"
                :class="['h-2 flex-1 rounded-full', n <= c.occupied ? 'bg-brand' : 'hatch border border-line']"
              />
            </div>
            <p class="mt-1.5 text-xs text-ink-faint tabular">
              Monthly rent of occupied units {{ peso(c.revenue) }}
            </p>
          </li>
        </ul>
      </OverviewTile>

      <OverviewTile title="Operating cash flow" to="/admin/expenses" to-label="Open the expense ledger" class="xl:col-span-6">
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
              Net operating income, {{ MONTH_LONG[liveLatestCashMonth.monthNum - 1] }}
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
                { label: 'Operating expenses', value: liveLatestCashMonth.expenses, tone: 'night' },
                { label: 'Net operating income', value: liveLatestCashMonth.noi, tone: 'bright' },
              ]"
              :label="`Of ${peso(liveLatestCashMonth.grossIncome)} collected, ${peso(liveLatestCashMonth.expenses)} went to operating expenses and ${peso(liveLatestCashMonth.noi)} remained.`"
            />
            <ul class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
              <li class="flex items-center gap-1.5">
                <span aria-hidden="true" class="size-2.5 rounded-full bg-night" />
                Operating expenses {{ peso(liveLatestCashMonth.expenses) }}
              </li>
              <li class="flex items-center gap-1.5">
                <span aria-hidden="true" class="size-2.5 rounded-full bg-brand-bright" />
                Net {{ peso(liveLatestCashMonth.noi) }}
              </li>
            </ul>
          </template>

          <table class="w-full text-sm">
            <caption class="sr-only">Collections, operating expenses and net operating income by month</caption>
            <thead>
              <tr class="text-xs text-ink-faint">
                <th scope="col" class="py-2 text-left font-medium">Month</th>
                <th scope="col" class="py-2 text-right font-medium">Collected</th>
                <th scope="col" class="py-2 text-right font-medium">Operating</th>
                <th scope="col" class="py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line tabular">
              <tr v-for="d in liveRecordedMonths" :key="d.month">
                <th scope="row" class="py-2 text-left font-medium">{{ d.month }}</th>
                <td class="py-2 text-right">{{ peso(d.grossIncome) }}</td>
                <td class="py-2 text-right text-ink-soft">{{ peso(d.expenses) }}</td>
                <td :class="['py-2 text-right font-semibold', d.noi < 0 && 'text-overdue']">{{ peso(d.noi) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="text-xs leading-5 text-ink-faint">
            Operating expenses leave out personal costs for the Main House and Other, which are recorded in the
            same ledger but not subtracted. So far this year they come to {{ peso(livePersonalTotal) }}.
          </p>
        </template>
      </OverviewTile>

      <OverviewTile
        title="Open repair requests"
        to="/admin/tickets"
        to-label="Open maintenance dispatch"
        class="md:col-span-2 xl:col-span-6"
      >
        <UnavailableNote
          v-if="maintenanceTicketsFetchFailed"
          message="Repair requests could not be loaded. There may still be open ones."
          @retry="refreshAllData"
        />
        <p v-else-if="openTickets.length === 0" class="text-sm text-ink-soft">No repair requests are open.</p>
        <template v-else>
          <ul class="divide-y divide-line">
            <li v-for="t in openTicketsPreview" :key="t.id" class="flex items-center justify-between gap-3 py-3">
              <span class="min-w-0">
                <span class="block text-sm font-medium">{{ t.title }}</span>
                <span class="block text-xs text-ink-faint">
                  {{ t.unit }}, {{ t.status === 'Open' ? 'submitted' : t.status.toLowerCase() }}<template v-if="t.technician">, {{ t.technician }}</template>
                </span>
              </span>
              <StatusPill :tone="t.priority === 'Emergency' || t.priority === 'High' ? 'overdue' : 'neutral'">
                {{ t.priority }}
              </StatusPill>
            </li>
          </ul>
          <p v-if="openTickets.length > openTicketsPreview.length" class="text-xs text-ink-faint">
            {{ openTickets.length - openTicketsPreview.length }} more open in maintenance dispatch.
          </p>
        </template>
      </OverviewTile>
    </div>

    <!-- ================================================================== *
     * Archive year
     * ================================================================== -->
    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      <OverviewTile tone="brand" title="Collected" class="xl:col-span-3">
        <UnavailableNote v-if="incomeRecordsFetchFailed" dark @retry="refreshAllData" />
        <div v-else>
          <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(historicalAnnualGrossTotal) }}</p>
          <p class="mt-2 text-sm text-on-brand-soft">{{ historicalIncomeRecords.length }} entries</p>
        </div>
      </OverviewTile>

      <OverviewTile title="50% Share" class="xl:col-span-3">
        <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
        <div v-else>
          <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(historicalAnnualHalfOfRentShare) }}</p>
          <p class="mt-2 text-sm text-ink-soft">
            Half of each row's Rent Amount, computed by the system and kept for ledger parity with the owner's
            historical spreadsheet.
          </p>
        </div>
      </OverviewTile>

      <OverviewTile title="Operating expenses" to="/admin/expenses" to-label="Open the expense ledger" class="xl:col-span-3">
        <UnavailableNote v-if="expenseRecordsFetchFailed" @retry="refreshAllData" />
        <div v-else>
          <p class="text-4xl leading-none font-semibold tabular tracking-tight">{{ peso(historicalAnnualExpenseTotal) }}</p>
          <p class="mt-2 text-sm text-ink-soft">
            {{ historicalExpenseRecords.length }} entries. Leaves out {{ peso(historicalAnnualPersonalTotal) }} of
            personal costs for the Main House and Other.
          </p>
        </div>
      </OverviewTile>

      <OverviewTile title="Net operating income" class="xl:col-span-3">
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
          <p class="mt-2 text-sm text-ink-soft">Collected minus operating expenses</p>
        </div>
      </OverviewTile>

      <OverviewTile :title="`Collections in ${selectedArchiveYear}`" class="md:col-span-2 xl:col-span-8">
        <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
        <template v-else>
          <MonthCapsules :months="historicalCapsules" :label="`Collections by month in ${selectedArchiveYear}`" />
          <dl class="grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
            <div>
              <dt class="text-xs text-ink-faint">Total</dt>
              <dd class="text-lg font-semibold tabular">{{ peso(historicalAnnualGrossTotal) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Average entered month</dt>
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

      <OverviewTile title="Collected by cluster" class="xl:col-span-4">
        <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
        <ul v-else class="flex flex-col gap-4">
          <li v-for="c in historicalClusterPerformance" :key="c.name">
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="font-medium">{{ c.name }}</span>
              <span class="tabular font-semibold">{{ peso(c.revenue) }}</span>
            </div>
            <div class="mt-2 h-2 rounded-full bg-canvas" aria-hidden="true">
              <div class="h-full rounded-full bg-brand" :style="{ width: `${c.share}%` }" />
            </div>
            <p class="mt-1.5 text-xs text-ink-faint tabular">
              {{ c.share.toFixed(1) }}% of the year. {{ c.recordCount }} entries across {{ c.uniqueRooms }}
              {{ c.uniqueRooms === 1 ? 'unit' : 'units' }}.
            </p>
          </li>
        </ul>
      </OverviewTile>

      <OverviewTile title="Month by month" class="md:col-span-2 xl:col-span-12">
        <UnavailableNote
          v-if="incomeRecordsFetchFailed || expenseRecordsFetchFailed"
          message="Income or expenses could not be loaded, so net figures cannot be worked out."
          @retry="refreshAllData"
        />
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[36rem] text-sm">
            <caption class="sr-only">Collections, expenses and net operating income by month, {{ selectedArchiveYear }}</caption>
            <thead>
              <tr class="text-xs text-ink-faint">
                <th scope="col" class="py-2 text-left font-medium">Month</th>
                <th scope="col" class="py-2 text-right font-medium">Collected</th>
                <th scope="col" class="py-2 text-right font-medium">Operating expenses</th>
                <th scope="col" class="py-2 text-right font-medium">Net operating income</th>
                <th scope="col" class="py-2 text-right font-medium">Personal, not deducted</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line tabular">
              <tr v-for="d in historical12MonthsData" :key="d.month">
                <th scope="row" class="py-2.5 text-left font-medium">{{ MONTH_LONG[d.monthNum - 1] }}</th>
                <td class="py-2.5 text-right">
                  <StatusPill v-if="!d.hasIncome" tone="unentered">Not entered</StatusPill>
                  <template v-else>{{ peso(d.grossIncome) }}</template>
                </td>
                <td class="py-2.5 text-right text-ink-soft">{{ peso(d.expenses) }}</td>
                <td :class="['py-2.5 text-right font-semibold', d.noi < 0 && 'text-overdue']">
                  {{ d.hasIncome ? peso(d.noi) : '' }}
                </td>
                <td class="py-2.5 text-right text-ink-faint">{{ peso(d.personalExpenses) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </OverviewTile>

      <!-- Tenants who paid in the year -->
      <OverviewTile :title="`Tenants in ${selectedArchiveYear}`" class="md:col-span-2 xl:col-span-12">
        <template #actions>
          <button
            type="button"
            class="pill-btn"
            :aria-expanded="historicalTenantRosterOpen"
            aria-controls="archive-roster"
            @click="historicalTenantRosterOpen = !historicalTenantRosterOpen"
          >
            {{ historicalTenantRosterOpen ? 'Hide' : 'Show' }}
          </button>
        </template>
        <div v-show="historicalTenantRosterOpen" id="archive-roster" class="flex flex-col gap-4">
          <UnavailableNote v-if="incomeRecordsFetchFailed" @retry="refreshAllData" />
          <template v-else>
            <div class="flex flex-wrap items-end gap-3">
              <label class="flex flex-col gap-1 text-xs text-ink-faint">
                Search by tenant or unit
                <span class="relative">
                  <Search class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
                  <input
                    v-model="historicalSearchQuery"
                    type="search"
                    class="h-11 w-64 max-w-full rounded-full border border-line bg-tile pl-10 pr-4 text-sm text-ink"
                  />
                </span>
              </label>
              <label class="flex flex-col gap-1 text-xs text-ink-faint">
                Cluster
                <select
                  v-model="historicalClusterFilter"
                  class="h-11 rounded-full border border-line bg-tile px-4 text-sm text-ink cursor-pointer"
                >
                  <option value="All">All clusters</option>
                  <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
                </select>
              </label>
              <p class="pb-3 text-sm text-ink-soft" aria-live="polite">
                {{ historicalTenantRoster.length }} {{ historicalTenantRoster.length === 1 ? 'tenant' : 'tenants' }}
              </p>
            </div>
            <div class="max-h-[28rem] overflow-auto rounded-2xl border border-line">
              <table class="w-full min-w-[48rem] text-sm">
                <caption class="sr-only">Tenants who paid in {{ selectedArchiveYear }}</caption>
                <thead class="sticky top-0 bg-tile">
                  <tr class="text-xs text-ink-faint border-b border-line">
                    <th scope="col" class="px-4 py-3 text-left font-medium">Tenant</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium">Unit</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium">Cluster</th>
                    <th scope="col" class="px-4 py-3 text-right font-medium">Payments</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium">Months paid</th>
                    <th scope="col" class="px-4 py-3 text-right font-medium">Total</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium">Receipt no., first found</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
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
            @click="historicalUnitTableOpen = !historicalUnitTableOpen"
          >
            {{ historicalUnitTableOpen ? 'Hide' : 'Show' }}
          </button>
        </template>
        <div v-show="historicalUnitTableOpen" id="archive-units">
          <UnavailableNote v-if="incomeRecordsFetchFailed || roomsFetchFailed" @retry="refreshAllData" />
          <div v-else class="max-h-[28rem] overflow-auto rounded-2xl border border-line">
            <table class="w-full min-w-[40rem] text-sm">
              <caption class="sr-only">Entries and collections per unit in {{ selectedArchiveYear }}</caption>
              <thead class="sticky top-0 bg-tile">
                <tr class="text-xs text-ink-faint border-b border-line">
                  <th scope="col" class="px-4 py-3 text-left font-medium">Unit</th>
                  <th scope="col" class="px-4 py-3 text-left font-medium">Cluster</th>
                  <th scope="col" class="px-4 py-3 text-left font-medium">Floor</th>
                  <th scope="col" class="px-4 py-3 text-right font-medium">Entries</th>
                  <th scope="col" class="px-4 py-3 text-right font-medium">Average entry</th>
                  <th scope="col" class="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line tabular">
                <tr v-for="u in historicalRoomUtilization" :key="u.unitCode">
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
            @click="historicalLedgerOpen = !historicalLedgerOpen"
          >
            {{ historicalLedgerOpen ? 'Hide' : 'Show' }}
          </button>
        </template>
        <div v-show="historicalLedgerOpen" id="archive-ledger" class="flex flex-col gap-4">
          <div role="tablist" aria-label="Ledger" class="inline-flex self-start rounded-full bg-canvas p-1">
            <button
              id="ledger-tab-income"
              type="button"
              role="tab"
              :aria-selected="historicalLedgerTab === 'income'"
              aria-controls="ledger-panel"
              :tabindex="historicalLedgerTab === 'income' ? 0 : -1"
              :class="[
                'rounded-full px-4 py-2 text-sm font-semibold cursor-pointer',
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
                'rounded-full px-4 py-2 text-sm font-semibold cursor-pointer',
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
              <div v-else class="max-h-[32rem] overflow-auto rounded-2xl border border-line">
                <table class="w-full min-w-[56rem] text-sm">
                  <caption class="sr-only">Income entries, {{ selectedArchiveYear }}</caption>
                  <thead class="sticky top-0 bg-tile">
                    <tr class="text-xs text-ink-faint border-b border-line">
                      <th scope="col" class="px-4 py-3 text-left font-medium">Date paid</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Unit</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Tenant</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Rent for</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">Rent</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">50% Share</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">Water</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">Total remitted</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Receipt no.</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-line tabular">
                    <tr v-for="r in historicalIncomeRecords" :key="r.id">
                      <td class="px-4 py-2.5 whitespace-nowrap text-ink-soft">{{ r.datePaid }}</td>
                      <td class="px-4 py-2.5 font-semibold">{{ r.unit }}</td>
                      <td class="px-4 py-2.5">{{ r.contact }}</td>
                      <td class="px-4 py-2.5 text-xs text-ink-soft">{{ r.rentFor }}</td>
                      <td class="px-4 py-2.5 text-right text-ink-soft">{{ peso(r.rent) }}</td>
                      <td class="px-4 py-2.5 text-right text-ink-soft">{{ peso(r.fiftyPercentShare || 0) }}</td>
                      <td class="px-4 py-2.5 text-right text-ink-soft">{{ peso(r.water) }}</td>
                      <td class="px-4 py-2.5 text-right font-semibold">{{ peso(r.totalRemitted || r.rent) }}</td>
                      <td class="px-4 py-2.5 text-xs text-ink-soft">{{ r.invoice }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <template v-else>
              <UnavailableNote v-if="expenseRecordsFetchFailed" @retry="refreshAllData" />
              <div v-else class="max-h-[32rem] overflow-auto rounded-2xl border border-line">
                <table class="w-full min-w-[48rem] text-sm">
                  <caption class="sr-only">Expense entries, {{ selectedArchiveYear }}</caption>
                  <thead class="sticky top-0 bg-tile">
                    <tr class="text-xs text-ink-faint border-b border-line">
                      <th scope="col" class="px-4 py-3 text-left font-medium">Date</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Receipt or supplier</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Category</th>
                      <th scope="col" class="px-4 py-3 text-left font-medium">Split across areas</th>
                      <th scope="col" class="px-4 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-line">
                    <tr v-for="e in historicalExpenseRecords" :key="e.id">
                      <td class="px-4 py-2.5 whitespace-nowrap text-ink-soft tabular">{{ e.date }}</td>
                      <td class="px-4 py-2.5">{{ e.description }}</td>
                      <td class="px-4 py-2.5 text-ink-soft">{{ e.category }}</td>
                      <td class="px-4 py-2.5 text-xs text-ink-soft tabular">
                        <span v-for="(s, sIdx) in e.splits" :key="sIdx" class="mr-3 inline-block">
                          {{ s.area }} {{ peso(s.amount) }}
                        </span>
                      </td>
                      <td class="px-4 py-2.5 text-right font-semibold tabular">{{ peso(e.totalAmount || 0) }}</td>
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
