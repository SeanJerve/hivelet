<!--
  @file views/AdminOverviewView.vue
  @description Executive Operations Overview Dashboard with Pinned Live 2026 Operations, Dedicated Historical Fiscal Archive (FY 2025 / 2024), and Collapsible & Scrollable High-Density Audit Tables.
  @systemBibleRef docs/01_SYSTEM_BIBLE.md Section 17 (Dashboard & Financial Reporting), Section 1 (Product Identity), Section 2 (Product Philosophy: "I finally know exactly where my money goes")
  @architectureRef docs/04_ARCHITECTURE.md
  @businessRules BR-017 (Payment Verification), BR-028 (Auditability), BR-032 (50% Revenue Share Calculation), BR-043/BR-044 (Categorized Operating Expenses & 5 Property Split Allocations), BR-048 (Admin-Only Financial Ledger Authorship)
  @innovations
    - Pinned Live Operations: Default executive dashboard strictly tracks live FY 2026 occupancy, pending remittances, and maintenance alerts.
    - Deep Historical Fiscal Year Archive: One-click transformation into an audit-grade historical review interface for past years (FY 2025, FY 2024).
    - Multi-Dimensional Historical Audit Surface: Dynamically aggregates 12-month inflow curves, operating cash flow, 5-cluster matrix, verified tenant roster, 33-unit utilization, and raw searchable ledgers.
    - Collapsible & Contained Scrollable Tables: High-density tables feature individual accordion collapse/expand toggles, sticky header rows, and max-height scrolling to maintain clean visual hierarchy.
-->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '@/lib/api';
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
  type IncomeRecord,
  type ExpenseRecord,
  waterChargeFor,
  type RoomItem,
  roomsFetchFailed,
  incomeRecordsFetchFailed,
  maintenanceTicketsFetchFailed,
} from '@/lib/systemState';
import { CLUSTERS, peso, type UnitStatus } from '@/lib/canonicalUnits';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import { 
  TrendingUp, 
  Home, 
  ShieldAlert, 
  Wrench, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Layers, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  ReceiptText,
  History,
  Archive,
  Download,
  Search,
  Users,
  Building2,
  FileSpreadsheet,
  ArrowLeft,
  Filter,
  Check
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const pendingPayments = ref<any[]>([]);
/** True when the verification queue could not be read, so 0 is not reported as fact. */
const pendingPaymentsFailed = ref(false);
const isRefreshing = ref(false);
const isInitialLoading = ref(true);
const hoveredMonthIndex = ref<number | null>(null);
const isFabOpen = ref(false);

// Active Operational Year
// Read from the clock, not pinned to a literal.
//
// This was `= 2026`. Every "live" figure on this dashboard filters on
// `r.year === CURRENT_YEAR` while the month beside it comes from `new Date()`,
// so on 1 January the whole page would have quietly read zero - no error, no
// empty state, just a dashboard reporting that the business had stopped.
//
// The historical archive below derives its years from the data with
// `r.year < CURRENT_YEAR`, so it follows automatically: the year that has just
// ended becomes an archive year on its own.
const CURRENT_YEAR = new Date().getFullYear();

// Historical Archive State & Scalable Period Selector
const isHistoricalMode = ref(false);
const selectedArchiveYear = ref<string>('2025');
const isSwitchingPeriod = ref(false);

const availableHistoricalYears = computed(() => {
  const years = new Set<string>();
  incomeRecords.forEach(r => {
    if (r.year && r.year < CURRENT_YEAR) years.add(String(r.year));
  });
  expenseRecords.forEach(e => {
    if (e.year && e.year < CURRENT_YEAR) years.add(String(e.year));
  });
  const list = Array.from(years).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  return list.length > 0 ? list : ['2025', '2024'];
});

// Collapsible Table States (Individual Section Toggles)
const isTenantRosterOpen = ref(true);
const isUnitDirectoryOpen = ref(true);
const isDeepLedgerOpen = ref(true);
const isHistoricalCashFlowOpen = ref(true);
const isHistoricalClusterMatrixOpen = ref(true);
const isLiveCashFlowOpen = ref(true);
const isLiveClusterMatrixOpen = ref(true);

// Historical Sub-tab for Deep Ledgers
const historicalLedgerTab = ref<'income' | 'expenses'>('income');
const historicalSearchQuery = ref('');
const historicalClusterFilter = ref('All');
const historicalMonthFilter = ref('All');

// Synchronize state with URL query
function syncFromRoute() {
  const qYear = route.query.archiveYear as string | undefined;
  if (qYear && (availableHistoricalYears.value.includes(qYear) || qYear === '2025' || qYear === '2024')) {
    isHistoricalMode.value = true;
    selectedArchiveYear.value = qYear;
  } else {
    isHistoricalMode.value = false;
  }
}

watch(() => route.query.archiveYear, () => {
  syncFromRoute();
});

function enterHistoricalMode(year: string) {
  if (selectedArchiveYear.value === year && isHistoricalMode.value) return;
  isSwitchingPeriod.value = true;
  selectedArchiveYear.value = year;
  isHistoricalMode.value = true;
  router.replace({ query: { ...route.query, archiveYear: year } });
  setTimeout(() => {
    isSwitchingPeriod.value = false;
  }, 180);
}

function exitHistoricalMode() {
  if (!isHistoricalMode.value) return;
  isSwitchingPeriod.value = true;
  isHistoricalMode.value = false;
  const nextQuery = { ...route.query };
  delete nextQuery.archiveYear;
  router.replace({ query: nextQuery });
  setTimeout(() => {
    isSwitchingPeriod.value = false;
  }, 180);
}

async function loadPayments() {
  try {
    const data = await api.get<any[]>('/admin/payments');
    if (data && Array.isArray(data)) {
      pendingPayments.value = data.filter((p) => p.verification_status === 'Pending Verification');
    }
    pendingPaymentsFailed.value = false;
  } catch {
    // The card below states a peso figure. Left silent, a failed load rendered
    // it as a confident "PHP 0.00 awaiting verification" - which is a claim, not
    // an absence. The card now says the figure is unavailable instead.
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
      loadPayments()
    ]);
  } finally {
    isRefreshing.value = false;
    isInitialLoading.value = false;
  }
}

onMounted(() => {
  syncFromRoute();
  refreshAllData();
});

/* ========================================================================== *
 * 1. LIVE CURRENT YEAR (FY 2026) COMPUTED METRICS
 * ========================================================================== */

const live2026IncomeRecords = computed(() => {
  return incomeRecords.filter(r => r.year === CURRENT_YEAR);
});

const live2026ExpenseRecords = computed(() => {
  return expenseRecords.filter(e => e.year === CURRENT_YEAR);
});

const monthlyRevenue = computed(() => {
  if (live2026IncomeRecords.value.length > 0) {
    return live2026IncomeRecords.value.reduce((sum, r) => sum + (Number(r.totalRemitted || r.rent || 0)), 0);
  }
  return 0;
});

const totalRoomsCount = computed(() => rooms.length);
const occupiedRoomsCount = computed(() => rooms.filter(r => r.status === 'settled' || r.status === 'pending' || r.tenant !== null).length);
const vacantRoomsCount = computed(() => rooms.filter(r => r.status === 'vacant').length);
const maintenanceRoomsCount = computed(() => rooms.filter(r => r.status === 'maintenance').length);
const occupancyPercentage = computed(() => totalRoomsCount.value > 0 ? ((occupiedRoomsCount.value / totalRoomsCount.value) * 100).toFixed(1) : '0');

const pendingCount = computed(() => pendingPayments.value.length);
const pendingTotal = computed(() => pendingPayments.value.reduce((s, p) => s + (Number(p.amount) || 0), 0));

// Closed counts as done too. `ticket_status_type` has both, and a closed ticket sitting in
// the "open tickets" figure would overstate the outstanding work on the landlady's dashboard.
const openTicketsCount = computed(() => maintenanceTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed').length);
const emergencyTicketsCount = computed(() => maintenanceTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed' && (t.priority === 'Emergency' || t.priority === 'High')).length);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/**
 * BR-029 — financial dashboard statistics default to the current month.
 *
 * The dashboard was scoped entirely to the fiscal year: the headline read
 * "FY 2026 Collections" and the only way to see a month was to read it off the
 * chart. For the landlady the operationally useful number is what came in *this*
 * month, which is what the rule asks for.
 *
 * The year figure is kept rather than replaced. Removing it would trade one
 * incomplete view for another, and the annual run-rate is what the chart beneath
 * is built on.
 *
 * Derived from records already in memory, so this costs no request.
 */
const CURRENT_MONTH = new Date().getMonth() + 1;

const currentMonthLabel = computed(() =>
  `${MONTH_NAMES[CURRENT_MONTH - 1]} ${CURRENT_YEAR}`
);

const currentMonthRevenue = computed(() =>
  live2026IncomeRecords.value
    .filter((r) => r.month === CURRENT_MONTH)
    .reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0)
);

const currentMonthRecordCount = computed(() =>
  live2026IncomeRecords.value.filter((r) => r.month === CURRENT_MONTH).length
);

// Base active monthly run-rate from currently occupied rooms
const baseMonthlyRunRate = computed(() => {
  return rooms.reduce((sum, r) => {
    if (r.status === 'settled' || r.status === 'pending' || r.tenant !== null) {
      // Was `linda_fixed ? 200 : occupants * 200`, which hardcoded the rate
      // BR-014 makes configurable AND used 200 for both Linda units although LF
      // is 400 - so the run-rate understated LF by 200 every month.
      const isLinda = r.waterRateType === 'linda_fixed';
      return sum + Number(r.price || 0) + waterChargeFor(r.unitCode, r.occupants || 1, isLinda);
    }
    return sum;
  }, 0);
});

/** The same water figure across the occupied units, for the projection below. */
const baseMonthlyWater = computed(() =>
  rooms.reduce((sum, r) => {
    if (r.status === 'settled' || r.status === 'pending' || r.tenant !== null) {
      return sum + waterChargeFor(r.unitCode, r.occupants || 1, r.waterRateType === 'linda_fixed');
    }
    return sum;
  }, 0)
);

/**
 * What this year's recorded expenses have actually been, as a share of recorded
 * income. Used to project forward instead of the flat 15% that was written in.
 * Null when there is nothing to derive it from, in which case nothing is
 * projected rather than a figure being invented.
 */
const observedExpenseRatio = computed<number | null>(() => {
  const income = live2026IncomeRecords.value.reduce(
    (s, r) => s + Number(r.totalRemitted || r.rent || 0), 0);
  const expenses = live2026ExpenseRecords.value.reduce(
    (s, e) => s + Number((e as any).rentalAmount ?? (e as any).totalAmount ?? 0), 0);
  if (income <= 0 || expenses <= 0) return null;
  return expenses / income;
});

interface MonthIncomeData {
  month: string;
  monthNum: number;
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

// 12-Month Data for Live 2026
const live12MonthsData = computed<MonthIncomeData[]>(() => {
  return MONTH_NAMES.map((name, idx) => {
    const monthNum = idx + 1;
    const matchingRecords = live2026IncomeRecords.value.filter(r => r.month === monthNum);
    const matchingExpenses = live2026ExpenseRecords.value.filter(e => e.month === monthNum);
    // Only the rental portion may be subtracted from income. "Main House" is Mrs. Fe's own
    // residence and "Other / Personal" is personal by definition (OD-05, confirmed 2026-09-13).
    // Falls back to totalAmount only for records that carry no allocation breakdown at all.
    const recordedExpenses = matchingExpenses.reduce(
      (sum, e) => sum + Number(e.rentalAmount ?? e.totalAmount ?? 0), 0);
    const recordedPersonal = matchingExpenses.reduce(
      (sum, e) => sum + Number(e.personalAmount ?? 0), 0);

    if (matchingRecords.length > 0) {
      const grossIncome = matchingRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
      const halfOfRentShare = matchingRecords.reduce((sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'BH' ? r.rent / 2 : r.rent) || 0), 0);
      const waterIncome = matchingRecords.reduce((sum, r) => sum + Number(r.water || 0), 0);
      return {
        month: name,
        monthNum,
        grossIncome,
        halfOfRentShare,
        waterIncome,
        expenses: recordedExpenses,
        personalExpenses: recordedPersonal,
        noi: grossIncome - recordedExpenses,
        isProjected: false
      };
    }

    /**
     * A month with no records. Project it only if it has not happened yet.
     *
     * This was `monthNum > 7` - a fixed July boundary. Two things were wrong with
     * it: a month that HAS passed with no receipts was drawn as a confident
     * run-rate projection rather than as the empty month it is, and next January
     * the boundary would still say July.
     *
     * The figures are no longer invented either. The gross came from
     * `baseMonthlyRunRate` or, failing that, a literal 242000 with no source; the
     * water was a literal 10400; the expenses were 15% of gross, a ratio from
     * nowhere. A projection built on made-up constants is not a forecast, it is a
     * drawing. Where there is no basis, nothing is projected.
     */
    const isFutureMonth = CURRENT_YEAR === new Date().getFullYear() && monthNum > CURRENT_MONTH;
    const canProject = isFutureMonth && baseMonthlyRunRate.value > 0;

    const projectedGross = canProject ? baseMonthlyRunRate.value : 0;
    const projectedShare = Math.round(projectedGross * 0.5);
    const ratio = observedExpenseRatio.value;
    const projectedExpenses = recordedExpenses > 0
      ? recordedExpenses
      : (canProject && ratio !== null ? Math.round(projectedGross * ratio) : 0);

    return {
      month: name,
      monthNum,
      grossIncome: projectedGross,
      halfOfRentShare: projectedShare,
      waterIncome: canProject ? baseMonthlyWater.value : 0,
      expenses: projectedExpenses,
      personalExpenses: recordedPersonal,
      noi: projectedGross - projectedExpenses,
      isProjected: canProject
    };
  });
});

const totalAnnualLiveRevenue = computed(() => live12MonthsData.value.reduce((sum, d) => sum + d.grossIncome, 0));
const totalAnnualLiveShare = computed(() => live12MonthsData.value.reduce((sum, d) => sum + d.halfOfRentShare, 0));
const averageMonthlyLiveIncome = computed(() => Math.round(totalAnnualLiveRevenue.value / 12));

const livePeakMonth = computed(() => {
  let highest = live12MonthsData.value[0];
  for (const d of live12MonthsData.value) {
    if (d.grossIncome > highest.grossIncome) highest = d;
  }
  return highest;
});

// Live 33 Units Cluster Performance Breakdown
const liveClusterPerformance = computed(() => {
  return CLUSTERS.map((clusterName) => {
    const clusterRooms = rooms.filter(r => r.cluster === clusterName);
    const total = clusterRooms.length;
    const occupied = clusterRooms.filter(r => r.status === 'settled' || r.status === 'pending' || r.tenant !== null).length;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const revenue = clusterRooms.reduce((s, r) => s + (r.tenant ? Number(r.price || 0) : 0), 0);

    return {
      name: clusterName,
      total,
      occupied,
      vacant: total - occupied,
      rate,
      revenue
    };
  });
});

/* ========================================================================== *
 * 2. HISTORICAL FISCAL ARCHIVE (FY 2025 / 2024) COMPUTED METRICS
 * ========================================================================== */

const targetHistoricalYear = computed(() => parseInt(selectedArchiveYear.value, 10));

const historicalIncomeRecords = computed(() => {
  return incomeRecords.filter(r => r.year === targetHistoricalYear.value);
});

const historicalExpenseRecords = computed(() => {
  return expenseRecords.filter(e => e.year === targetHistoricalYear.value);
});

// Annual Aggregate Totals for Selected Historical Year
const historicalAnnualGrossTotal = computed(() => {
  return historicalIncomeRecords.value.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
});

const historicalAnnualHalfOfRentShare = computed(() => {
  return historicalIncomeRecords.value.reduce((sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'BH' ? r.rent / 2 : r.rent) || 0), 0);
});

const historicalAnnualWaterTotal = computed(() => {
  return historicalIncomeRecords.value.reduce((sum, r) => sum + Number(r.water || 0), 0);
});

// Operating expenses of the rental business. Excludes Main House (Mrs. Fe's own residence) and
// Other / Personal, which are recorded in the same ledger but are not a cost of the business
// (OD-05, confirmed 2026-09-13). Subtracting them understated Net Operating Income.
const historicalAnnualExpenseTotal = computed(() => {
  return historicalExpenseRecords.value.reduce(
    (sum, e) => sum + Number(e.rentalAmount ?? e.totalAmount ?? 0), 0);
});

// The non-rental remainder, reported alongside so the ledger still reconciles to its face value.
const historicalAnnualPersonalTotal = computed(() => {
  return historicalExpenseRecords.value.reduce((sum, e) => sum + Number(e.personalAmount ?? 0), 0);
});

const historicalAnnualNOI = computed(() => {
  return historicalAnnualGrossTotal.value - historicalAnnualExpenseTotal.value;
});

// 12-Month Historical Data
const historical12MonthsData = computed<MonthIncomeData[]>(() => {
  return MONTH_NAMES.map((name, idx) => {
    const monthNum = idx + 1;
    const matchingRecords = historicalIncomeRecords.value.filter(r => r.month === monthNum);
    const matchingExpenses = historicalExpenseRecords.value.filter(e => e.month === monthNum);

    const grossIncome = matchingRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
    const halfOfRentShare = matchingRecords.reduce((sum, r) => sum + Number(r.fiftyPercentShare || (r.cluster === 'BH' ? r.rent / 2 : r.rent) || 0), 0);
    const waterIncome = matchingRecords.reduce((sum, r) => sum + Number(r.water || 0), 0);
    // Operating expenses only - see the note in live12MonthsData (OD-05).
    const expenses = matchingExpenses.reduce(
      (sum, e) => sum + Number(e.rentalAmount ?? e.totalAmount ?? 0), 0);
    const personalExpenses = matchingExpenses.reduce(
      (sum, e) => sum + Number(e.personalAmount ?? 0), 0);

    return {
      month: name,
      monthNum,
      grossIncome,
      halfOfRentShare,
      waterIncome,
      expenses,
      personalExpenses,
      noi: grossIncome - expenses,
      isProjected: false
    };
  });
});

const historicalAverageMonthlyIncome = computed(() => {
  return Math.round(historicalAnnualGrossTotal.value / 12);
});

const historicalPeakMonth = computed(() => {
  let highest = historical12MonthsData.value[0];
  for (const d of historical12MonthsData.value) {
    if (d.grossIncome > highest.grossIncome) highest = d;
  }
  return highest;
});

// Historical Cluster Contribution Matrix
const historicalClusterPerformance = computed(() => {
  return CLUSTERS.map((clusterName) => {
    const clusterRecords = historicalIncomeRecords.value.filter(r => r.cluster === clusterName);
    const totalRevenue = clusterRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
    const uniqueRooms = new Set(clusterRecords.map(r => r.unit)).size;
    const totalPossibleRooms = rooms.filter(r => r.cluster === clusterName).length || 1;
    const shareOfTotal = historicalAnnualGrossTotal.value > 0 ? ((totalRevenue / historicalAnnualGrossTotal.value) * 100).toFixed(1) : '0';

    return {
      name: clusterName,
      revenue: totalRevenue,
      uniqueRooms,
      totalPossibleRooms,
      shareOfTotal,
      recordCount: clusterRecords.length
    };
  });
});

// Historical Tenant Roster (Aggregated from Historical Income Records)
interface HistoricalTenantSummary {
  name: string;
  unit: string;
  cluster: string;
  monthsCount: number;
  activeMonths: string[];
  totalRemitted: number;
  totalRent: number;
  invoiceSample: string;
}

const historicalTenantRoster = computed<HistoricalTenantSummary[]>(() => {
  const map = new Map<string, HistoricalTenantSummary>();

  for (const r of historicalIncomeRecords.value) {
    const key = `${r.contact.trim()}__${r.unit}`;
    const monthName = MONTH_NAMES[(r.month || 1) - 1];

    if (!map.has(key)) {
      map.set(key, {
        name: r.contact.trim(),
        unit: r.unit,
        cluster: r.cluster,
        monthsCount: 1,
        activeMonths: [monthName],
        totalRemitted: Number(r.totalRemitted || r.rent || 0),
        totalRent: Number(r.rent || 0),
        invoiceSample: r.invoice || '—'
      });
    } else {
      const existing = map.get(key)!;
      existing.monthsCount++;
      if (!existing.activeMonths.includes(monthName)) {
        existing.activeMonths.push(monthName);
      }
      existing.totalRemitted += Number(r.totalRemitted || r.rent || 0);
      existing.totalRent += Number(r.rent || 0);
    }
  }

  let list = Array.from(map.values()).sort((a, b) => b.totalRemitted - a.totalRemitted);

  if (historicalClusterFilter.value !== 'All') {
    list = list.filter(t => t.cluster === historicalClusterFilter.value);
  }

  if (historicalSearchQuery.value.trim()) {
    const q = historicalSearchQuery.value.toLowerCase().trim();
    list = list.filter(t => t.name.toLowerCase().includes(q) || t.unit.toLowerCase().includes(q));
  }

  return list;
});

// Historical 33-Unit Room Utilization Directory
interface HistoricalRoomUtilization {
  unitCode: string;
  cluster: string;
  floorLabel: string;
  activeMonths: number;
  totalRevenue: number;
  averageMonthlyRevenue: number;
  occupancyRate: number;
}

const historicalRoomUtilization = computed<HistoricalRoomUtilization[]>(() => {
  return rooms.map((room) => {
    const unitRecords = historicalIncomeRecords.value.filter(r => r.unit.toUpperCase() === room.unitCode.toUpperCase());
    const activeMonths = unitRecords.length;
    const totalRevenue = unitRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
    const averageMonthlyRevenue = activeMonths > 0 ? Math.round(totalRevenue / activeMonths) : 0;
    const occupancyRate = Math.round((activeMonths / 12) * 100);

    return {
      unitCode: room.unitCode,
      cluster: room.cluster,
      floorLabel: room.floorLabel,
      activeMonths,
      totalRevenue,
      averageMonthlyRevenue,
      occupancyRate
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);
});

/* ========================================================================== *
 * 3. DYNAMIC SVG CHART GENERATION (Works for both Live and Historical)
 * ========================================================================== */

const activeChartData = computed<MonthIncomeData[]>(() => {
  return isHistoricalMode.value ? historical12MonthsData.value : live12MonthsData.value;
});

const chartSvgWidth = 1200;
const chartSvgHeight = 260;
const chartPaddingY = 36;

const maxGross = computed(() => {
  const max = Math.max(...activeChartData.value.map(d => d.grossIncome), 50000);
  return Math.ceil(max / 10000) * 10000;
});

const chartPoints = computed(() => {
  const totalMonths = activeChartData.value.length || 12;
  const colWidth = chartSvgWidth / totalMonths;
  const innerH = chartSvgHeight - (chartPaddingY * 2);

  return activeChartData.value.map((d, i) => {
    const x = (i + 0.5) * colWidth;
    const y = chartSvgHeight - chartPaddingY - ((d.grossIncome / maxGross.value) * innerH);
    return { ...d, x, y };
  });
});

const linePathData = computed(() => {
  const pts = chartPoints.value;
  if (pts.length === 0) return '';

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
});

const areaPathData = computed(() => {
  const pts = chartPoints.value;
  if (pts.length === 0) return '';
  const baseY = chartSvgHeight - chartPaddingY;
  return `${linePathData.value} L ${pts[pts.length - 1].x},${baseY} L ${pts[0].x},${baseY} Z`;
});

// CSV Export for Selected Historical Fiscal Year
function exportHistoricalCSV() {
  const year = selectedArchiveYear.value;
  const headers = ['Type', 'Date', 'Month', 'Unit / OR', 'Contact / Supplier', 'Category / Cluster', 'Rent / Base', '50% Share', 'Water', 'Total Remitted / Expense'];
  
  const incomeRows = historicalIncomeRecords.value.map(r => [
    'INCOME',
    r.datePaid,
    r.month,
    r.unit,
    `"${(r.contact || '').replace(/"/g, '""')}"`,
    r.cluster,
    r.rent,
    r.fiftyPercentShare,
    r.water,
    r.totalRemitted
  ]);

  const expenseRows = historicalExpenseRecords.value.map(e => [
    'EXPENSE',
    e.date,
    e.month,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    'Supplier',
    `"${(e.category || '').replace(/"/g, '""')}"`,
    0,
    0,
    0,
    e.totalAmount
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [
    [`HIVELET FINANCIAL AUDIT REPORT - FISCAL YEAR ${year}`],
    [`Gross Inflow: ${historicalAnnualGrossTotal.value}`, `50% Share (half of Rent Amount): ${historicalAnnualHalfOfRentShare.value}`, `Operating Expenses: ${historicalAnnualExpenseTotal.value}`, `Personal (not deducted): ${historicalAnnualPersonalTotal.value}`, `Net Operating Income: ${historicalAnnualNOI.value}`],
    [],
    headers,
    ...incomeRows,
    ...expenseRows
  ].map(e => Array.isArray(e) ? e.join(',') : e).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Hivelet_FY${year}_Financial_Audit_Report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div class="space-y-6">

    <!-- ====================================================================== *
     * HEADER: DYNAMIC BREADCRUMB & CONTROLS
     * ====================================================================== -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border-strong pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Admin</span>
          <span>/</span>
          <span v-if="!isHistoricalMode" class="font-bold text-ink-navy">Executive Overview (FY {{ CURRENT_YEAR }})</span>
          <template v-else>
            <button @click="exitHistoricalMode" class="hover:text-primary underline font-medium cursor-pointer">
              Live Operations
            </button>
            <span>/</span>
            <span class="font-bold text-primary">Historical Fiscal Archive (FY {{ selectedArchiveYear }})</span>
          </template>
        </div>
        
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-ink-navy tracking-tight flex items-center gap-3">
          <span v-if="!isHistoricalMode">Executive Operations Overview</span>
          <span v-else class="flex items-center gap-2.5">
            <span>Historical Fiscal Archive</span>
            <span class="text-xs px-2.5 py-1 rounded-md bg-primary text-white font-black tracking-wider uppercase">
              FY {{ selectedArchiveYear }}
            </span>
          </span>
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          <template v-if="!isHistoricalMode">
            Live operations, current FY {{ CURRENT_YEAR }} run-rates, verified remittances, and property performance.
          </template>
          <template v-else>
            Comprehensive financial audit, verified past ledgers, cluster matrix, and tenant records for Fiscal Year {{ selectedArchiveYear }}.
          </template>
        </p>
      </div>

      <!-- Quick Actions Bar -->
      <div class="flex flex-wrap items-center gap-2.5 sm:justify-end">
        
        <!-- Consistent Year-Only Hover Dropdown Button (Exact Width & Symmetrical Alignment) -->
        <div class="relative group w-28">
          <button
            type="button"
            class="btn-secondary flex items-center justify-between gap-1 w-full min-h-[38px] px-2.5 text-xs font-bold cursor-pointer"
          >
            <Calendar class="size-3.5 text-primary shrink-0" />
            <span class="flex-1 text-center font-extrabold">{{ isHistoricalMode ? selectedArchiveYear : '2026' }}</span>
            <ChevronDown class="size-3.5 text-muted-foreground shrink-0 transition-transform duration-200 group-hover:rotate-180" />
          </button>

          <!-- Hover Dropdown Menu (Exact Width & Symmetrical Icon Alignment) -->
          <div
            class="absolute left-0 right-0 top-full pt-1 w-full hidden group-hover:block z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            <div class="rounded-xl bg-white p-1 shadow-xl border border-border-strong space-y-0.5">
              <!-- Live 2026 -->
              <button
                @click="exitHistoricalMode"
                :class="[
                  'w-full h-8 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-1 cursor-pointer',
                  !isHistoricalMode 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'text-ink-navy hover:bg-surface-sunken'
                ]"
              >
                <span class="size-3.5 shrink-0"></span>
                <span class="flex-1 text-center font-extrabold">{{ CURRENT_YEAR }}</span>
                <span class="size-3.5 shrink-0 flex items-center justify-center">
                  <Check v-if="!isHistoricalMode" class="size-3.5 text-white" />
                </span>
              </button>

              <!-- Historical Years (2025, 2024, etc.) -->
              <button
                v-for="yr in availableHistoricalYears"
                :key="yr"
                @click="enterHistoricalMode(yr)"
                :class="[
                  'w-full h-8 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between gap-1 cursor-pointer',
                  isHistoricalMode && selectedArchiveYear === yr 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'text-ink-navy hover:bg-surface-sunken'
                ]"
              >
                <span class="size-3.5 shrink-0"></span>
                <span class="flex-1 text-center font-extrabold">{{ yr }}</span>
                <span class="size-3.5 shrink-0 flex items-center justify-center">
                  <Check v-if="isHistoricalMode && selectedArchiveYear === yr" class="size-3.5 text-white" />
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Mode-Specific Quick Actions -->
        <template v-if="!isHistoricalMode">
          <button 
            @click="isOnsitePaymentModalOpen = true"
            class="btn-primary"
          >
            <Plus class="size-3.5 text-white" />
            <span>Record Payment</span>
          </button>

          <router-link 
            to="/admin/expenses"
            class="btn-secondary"
          >
            <ReceiptText class="size-3.5 text-primary" />
            <span>Record Expense</span>
          </router-link>

          <button 
            @click="refreshAllData"
            :disabled="isRefreshing"
            class="btn-secondary"
            title="Refresh Data from Database"
          >
            <RefreshCw :class="['size-3.5 text-muted-foreground', isRefreshing && 'animate-spin']" />
            <span>Refresh</span>
          </button>
        </template>

        <template v-else>
          <button 
            @click="exportHistoricalCSV"
            class="btn-secondary"
            title="Export full financial audit report for this year as CSV"
          >
            <Download class="size-3.5 text-primary" />
            <span>Export FY {{ selectedArchiveYear }} Report</span>
          </button>

          <button 
            @click="exitHistoricalMode"
            class="btn-primary"
          >
            <ArrowLeft class="size-3.5 text-white" />
            <span>Return to Live 2026</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Comprehensive Dashboard Skeleton State (For initial load and smooth year transitions) -->
    <div v-if="isInitialLoading || isSwitchingPeriod" class="space-y-6 animate-pulse">
      <!-- 4 Top KPI Stat Cards Skeleton -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard variant="metric" :count="4" />
      </div>

      <!-- 12-Month Inflow Trajectory Chart Card Skeleton -->
      <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-5">
          <div class="space-y-2">
            <Skeleton className="h-5 w-64 rounded" />
            <Skeleton className="h-3.5 w-80 max-w-full rounded" />
          </div>
          <div class="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-xl" />
            <Skeleton className="h-7 w-28 rounded-xl" />
            <Skeleton className="h-7 w-28 rounded-xl" />
          </div>
        </div>

        <!-- Simulated SVG Chart Skeleton Area -->
        <div class="h-56 w-full flex items-end justify-between gap-3 pt-6 px-2">
          <div v-for="bar in 12" :key="bar" class="flex-1 flex flex-col items-center gap-2">
            <Skeleton className="w-full rounded-t-lg bg-slate-200" :style="{ height: `${30 + ((bar * 17) % 65)}%` }" />
            <Skeleton className="h-3 w-7 rounded" />
          </div>
        </div>
      </div>

      <!-- 2-Column Cash Flow & Cluster Matrix Skeleton -->
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 space-y-4">
          <div class="flex items-center justify-between border-b border-border-strong pb-4">
            <div class="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded" />
              <Skeleton className="h-3.5 w-64 max-w-full rounded" />
            </div>
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
          <div class="space-y-3 pt-2">
            <div v-for="i in 5" :key="i" class="p-3 rounded-xl border border-border-strong bg-background space-y-2">
              <div class="flex justify-between">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          </div>
        </div>

        <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 space-y-4">
          <div class="flex items-center justify-between border-b border-border-strong pb-4">
            <div class="space-y-1.5">
              <Skeleton className="h-5 w-52 rounded" />
              <Skeleton className="h-3.5 w-64 max-w-full rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
          <div class="space-y-3 pt-2">
            <div v-for="i in 5" :key="i" class="p-3 rounded-xl border border-border-strong bg-background space-y-2">
              <div class="flex justify-between">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- High-Density Tables Skeleton -->
      <div class="space-y-4">
        <SkeletonTable :rows="6" :columns="7" />
      </div>
    </div>

    <div v-else class="space-y-6">

      <!-- ==================================================================== *
       * VIEW MODE A: LIVE 2026 OPERATIONS DASHBOARD (PINNED)
       * ==================================================================== -->
      <template v-if="!isHistoricalMode">

        <!-- Live KPI Stat Cards (4 Cards) -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="surface-card relative overflow-hidden p-5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Collections · {{ currentMonthLabel }}
              </p>
              <span class="rounded-xl p-2 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                <TrendingUp class="size-4" />
              </span>
            </div>
            <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-ink-navy">{{ incomeRecordsFetchFailed ? '—' : peso(currentMonthRevenue) }}</p>
            <!-- A failed fetch leaves `incomeRecords` at whatever it last held (or
                 empty, on first load), which reads as "₱0.00 collected" - a
                 confident claim the business stopped, not the unknown it is. -->
            <p class="mt-1.5 text-xs text-emerald-700 font-semibold">
              <template v-if="incomeRecordsFetchFailed">Figures unavailable — refresh to retry</template>
              <template v-else>{{ currentMonthRecordCount }} {{ currentMonthRecordCount === 1 ? 'collection' : 'collections' }} recorded this month</template>
            </p>
            <!-- BR-029 asks the dashboard to default to the current month. The
                 fiscal year is kept beneath rather than dropped - it is what the
                 chart below is built on. -->
            <p class="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
              FY {{ CURRENT_YEAR }} to date: <strong class="text-foreground tabular">{{ incomeRecordsFetchFailed ? '—' : peso(monthlyRevenue) }}</strong>
            </p>
          </div>

          <div class="surface-card relative overflow-hidden p-5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Current Occupancy</p>
              <span class="rounded-xl p-2 bg-sky-50 text-sky-800 ring-1 ring-sky-200">
                <Home class="size-4" />
              </span>
            </div>
            <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-ink-navy">
              <template v-if="roomsFetchFailed">—</template>
              <template v-else>{{ occupiedRoomsCount }} / {{ totalRoomsCount }} Units</template>
            </p>
            <!-- A failed fetch leaves every room at its seeded vacant default (see
                 `rooms` in systemState.ts), which would otherwise read as a
                 confidently empty 33-unit building rather than an unknown one. -->
            <p class="mt-1.5 text-xs text-muted-foreground">
              <template v-if="roomsFetchFailed">Occupancy unavailable — refresh to retry</template>
              <template v-else>{{ occupancyPercentage }}% occupied • {{ vacantRoomsCount }} vacant<template v-if="maintenanceRoomsCount > 0"> • {{ maintenanceRoomsCount }} maintenance</template></template>
            </p>
          </div>

          <div class="surface-card relative overflow-hidden p-5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Pending Remittances</p>
              <span class="rounded-xl p-2 bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                <ShieldAlert class="size-4" />
              </span>
            </div>
            <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-ink-navy">
              {{ pendingPaymentsFailed ? '—' : (pendingTotal > 0 ? peso(pendingTotal) : '₱0.00') }}
            </p>
            <p class="mt-1.5 text-xs text-amber-800 font-medium">
              {{ pendingCount }} remittance{{ pendingCount === 1 ? '' : 's' }} awaiting review
            </p>
          </div>

          <div class="surface-card relative overflow-hidden p-5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Maintenance Alerts</p>
              <span class="rounded-xl p-2 bg-rose-50 text-rose-800 ring-1 ring-rose-200">
                <Wrench class="size-4" />
              </span>
            </div>
            <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-ink-navy">
              {{ maintenanceTicketsFetchFailed ? '—' : `${openTicketsCount} Open` }}
            </p>
            <!-- The headline counts OPEN tickets; this line used to report on
                 EMERGENCY tickets, so "2 Open" sat above "All tickets handled".
                 A failed fetch must not fall through to that same "all clear"
                 wording either - it has verified nothing. -->
            <p
              :class="[
                'mt-1.5 text-xs font-medium',
                maintenanceTicketsFetchFailed ? 'text-muted-foreground' : emergencyTicketsCount > 0 ? 'text-rose-700' : openTicketsCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              ]"
            >
              {{
                maintenanceTicketsFetchFailed
                  ? 'Ticket status unavailable — refresh to retry'
                  : emergencyTicketsCount > 0
                    ? `${emergencyTicketsCount} urgent, needs dispatch`
                    : openTicketsCount > 0
                      ? `${openTicketsCount} awaiting a technician`
                      : 'All tickets handled'
              }}
            </p>
          </div>
        </div>

        <!-- 12-MONTH INCOME TRAJECTORY (FY 2026) -->
        <div class="surface-card relative rounded-2xl border border-border-strong bg-white p-6 shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-5">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp class="size-4" />
                </span>
                <h2 class="font-display text-lg font-black text-ink-navy">
                  12-Month Inflow Trajectory &amp; Run-Rate (FY 2026)
                </h2>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Verified remittances from active ledgers (Jan–Jul) with capacity run-rate projections for upcoming months.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-xs">
              <div class="bg-background px-3 py-1.5 rounded-xl border border-border-strong">
                <span class="text-muted-foreground">Annual Run-Rate: </span>
                <span class="font-display font-bold text-ink-navy">{{ peso(totalAnnualLiveRevenue) }}</span>
              </div>
              <div class="bg-background px-3 py-1.5 rounded-xl border border-border-strong">
                <span class="text-muted-foreground">Monthly Avg: </span>
                <span class="font-display font-bold text-primary">{{ peso(averageMonthlyLiveIncome) }}</span>
              </div>
              <div class="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <span class="text-emerald-800 font-bold">Peak: {{ livePeakMonth.month }} ({{ peso(livePeakMonth.grossIncome) }})</span>
              </div>
            </div>
          </div>

          <!-- SVG Chart Area -->
          <div class="relative mt-6 w-full">
            <svg :viewBox="`0 0 ${chartSvgWidth} ${chartSvgHeight}`" class="w-full h-64 overflow-visible">
              <defs>
                <linearGradient id="liveRevenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0c66e4" stop-opacity="0.22" />
                  <stop offset="80%" stop-color="#0c66e4" stop-opacity="0.02" />
                  <stop offset="100%" stop-color="#0c66e4" stop-opacity="0.0" />
                </linearGradient>
                <linearGradient id="liveRevenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#0c66e4" />
                  <stop offset="50%" stop-color="#2563eb" />
                  <stop offset="100%" stop-color="#38bdf8" />
                </linearGradient>
              </defs>

              <g class="grid-lines" opacity="0.5">
                <line 
                  v-for="tick in 4" 
                  :key="tick"
                  :x1="chartPoints[0]?.x ?? 50" 
                  :y1="chartPaddingY + ((tick - 1) * ((chartSvgHeight - chartPaddingY * 2 - 40) / 3))"
                  :x2="chartPoints[chartPoints.length - 1]?.x ?? (chartSvgWidth - 50)" 
                  :y2="chartPaddingY + ((tick - 1) * ((chartSvgHeight - chartPaddingY * 2 - 40) / 3))"
                  stroke="#dfe1e6" 
                  stroke-dasharray="4 4"
                  stroke-width="1"
                />
              </g>

              <path :d="areaPathData" fill="url(#liveRevenueAreaGradient)" />
              <path :d="linePathData" fill="none" stroke="url(#liveRevenueLineGradient)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

              <g v-for="(pt, idx) in chartPoints" :key="pt.month">
                <line 
                  v-if="hoveredMonthIndex === idx"
                  :x1="pt.x" 
                  :y1="chartPaddingY" 
                  :x2="pt.x" 
                  :y2="chartSvgHeight - chartPaddingY"
                  stroke="#0c66e4" 
                  stroke-width="1.5" 
                  stroke-dasharray="2 2"
                />
                <circle 
                  :cx="pt.x" 
                  :cy="pt.y" 
                  :r="hoveredMonthIndex === idx ? 7 : 4.5" 
                  fill="#ffffff" 
                  :stroke="hoveredMonthIndex === idx ? '#0c66e4' : '#2563eb'" 
                  :stroke-width="hoveredMonthIndex === idx ? 3.5 : 2.5"
                  class="transition-all duration-150 cursor-pointer"
                />
                <text :x="pt.x" :y="chartSvgHeight - 38" text-anchor="middle" class="text-[12px] font-extrabold fill-ink-navy">
                  {{ pt.month }}
                </text>
                <text :x="pt.x" :y="chartSvgHeight - 22" text-anchor="middle" class="text-[11px] font-extrabold fill-primary">
                  {{ peso(pt.grossIncome) }}
                </text>
                <text :x="pt.x" :y="chartSvgHeight - 8" text-anchor="middle" :class="['text-[9px] font-bold', pt.isProjected ? 'fill-muted-foreground-soft' : 'fill-emerald-700']">
                  {{ pt.isProjected ? 'Run-rate' : 'Verified' }}
                </text>
                <rect 
                  :x="idx * (chartSvgWidth / 12)" 
                  :y="0" 
                  :width="chartSvgWidth / 12" 
                  :height="chartSvgHeight" 
                  fill="transparent" 
                  class="cursor-pointer"
                  @mouseenter="hoveredMonthIndex = idx"
                  @mouseleave="hoveredMonthIndex = null"
                />
              </g>
            </svg>

            <!-- Tooltip -->
            <div 
              v-if="hoveredMonthIndex !== null && chartPoints[hoveredMonthIndex]"
              class="absolute pointer-events-none z-50 top-1 bg-ink-navy text-white p-3 rounded-xl shadow-2xl border border-neutral-700/80 text-xs space-y-1 transition-all duration-150 whitespace-nowrap"
              :style="{
                left: `${((hoveredMonthIndex + 0.5) / 12) * 100}%`,
                transform: hoveredMonthIndex === 0 ? 'translateX(0%)' : hoveredMonthIndex === 11 ? 'translateX(-100%)' : 'translateX(-50%)'
              }"
            >
              <div class="flex items-center justify-between gap-3 border-b border-neutral-700 pb-1">
                <span class="font-bold uppercase tracking-wider text-amber-400">
                  {{ chartPoints[hoveredMonthIndex].month }} 2026
                </span>
                <span class="text-[10px] text-neutral-400">
                  {{ chartPoints[hoveredMonthIndex].isProjected ? 'Capacity Projected' : 'Verified Ledger' }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="text-neutral-300">Gross Remittance:</span>
                <span class="font-bold text-white">{{ peso(chartPoints[hoveredMonthIndex].grossIncome) }}</span>
              </div>
              <div class="flex items-center justify-between gap-4 text-[11px]">
                <span class="text-neutral-400">50% Share:</span>
                <span class="font-semibold text-emerald-400">{{ peso(chartPoints[hoveredMonthIndex].halfOfRentShare) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2-COLUMN SECTION: LIVE OPERATING CASH FLOW & LIVE CLUSTER MATRIX -->
        <div class="grid gap-6 lg:grid-cols-2">
          
          <!-- Live Cash Flow (Jan-Jun 2026) -->
          <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 flex flex-col justify-between">
            <div>
              <!-- `flex-wrap` plus `min-w-0`: this row could not wrap, so at 390px
                   the legend forced the whole card 32px wider than the viewport.
                   `body` carries `overflow-x: hidden`, which hid the sideways scroll
                   and silently CLIPPED the figures instead - every Net Operating
                   Income read "P201,0". -->
              <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-border-strong pb-4">
                <div class="min-w-0">
                  <h2 class="font-display text-base font-extrabold text-ink-navy">
                    Operating Cash Flow (FY 2026)
                  </h2>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Monthly revenue inflow compared with operational expenses.
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold mr-2">
                    <span class="size-2.5 rounded-sm bg-emerald-600"></span> Inflow
                  </span>
                  <span class="inline-flex items-center gap-1.5 text-xs text-rose-800 font-bold mr-2">
                    <span class="size-2.5 rounded-sm bg-rose-500"></span> Expenses
                  </span>
                  <button 
                    @click="isLiveCashFlowOpen = !isLiveCashFlowOpen"
                    class="p-1 rounded-lg hover:bg-surface-sunken text-muted-foreground hover:text-ink-navy transition-all cursor-pointer"
                    :title="isLiveCashFlowOpen ? 'Collapse Cash Flow' : 'Expand Cash Flow'"
                  >
                    <ChevronDown :class="['size-4 transition-transform duration-200', isLiveCashFlowOpen ? 'rotate-180' : '']" />
                  </button>
                </div>
              </div>

              <div v-show="isLiveCashFlowOpen" class="mt-5 space-y-4 max-h-[360px] overflow-y-auto pr-1">
                <div 
                  v-for="d in live12MonthsData.slice(0, 6)" 
                  :key="d.month"
                  class="space-y-1.5"
                >
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-extrabold text-ink-navy">{{ d.month }} 2026</span>
                    <span class="text-muted-foreground">
                      Net Operating Income: <strong class="text-emerald-800">{{ peso(d.noi) }}</strong>
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 h-3.5 bg-surface-sunken rounded-lg p-0.5">
                    <div class="relative h-full bg-[#f0fdf4] rounded-sm overflow-hidden flex justify-end">
                      <div 
                        class="h-full bg-emerald-600 rounded-sm transition-all duration-300"
                        :style="{ width: `${Math.min((d.grossIncome / maxGross) * 100, 100)}%` }"
                      ></div>
                    </div>
                    <div class="relative h-full bg-[#fff1f2] rounded-sm overflow-hidden flex justify-start">
                      <div 
                        class="h-full bg-rose-500 rounded-sm transition-all duration-300"
                        :style="{ width: `${Math.min((d.expenses / maxGross) * 100, 100)}%` }"
                      ></div>
                    </div>
                  </div>

                  <div class="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>Revenue: {{ peso(d.grossIncome) }}</span>
                    <span
                      :title="d.personalExpenses > 0
                        ? `Operating expenses only. A further ${peso(d.personalExpenses)} of personal (Main House / Other) cost is recorded this month and is not subtracted from rental income.`
                        : 'Operating expenses only.'"
                    >Operating: {{ peso(d.expenses) }}</span>
                  </div>
                  <div
                    v-if="d.personalExpenses > 0"
                    class="flex flex-wrap justify-end text-[10px] text-muted-foreground-soft px-0.5 -mt-0.5"
                  >
                    <span>Personal (not deducted): {{ peso(d.personalExpenses) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Two buttons plus a label do not fit on one 390px line; without
                 wrapping they pushed the card past the viewport edge. -->
            <div class="mt-6 pt-4 border-t border-border-strong flex flex-wrap items-center justify-between gap-2">
              <span class="text-xs text-muted-foreground">Direct ledgers:</span>
              <div class="flex flex-wrap gap-2">
                <button @click="router.push('/admin/income')" class="btn-secondary min-h-8 px-3 py-1 text-xs gap-1 cursor-pointer">
                  <span>Income Ledger</span>
                  <ChevronRight class="size-3" />
                </button>
                <button @click="router.push('/admin/expenses')" class="btn-secondary min-h-8 px-3 py-1 text-xs gap-1 cursor-pointer">
                  <span>Expense Ledger</span>
                  <ChevronRight class="size-3" />
                </button>
              </div>
            </div>
          </div>

          <!-- Live Cluster Occupancy Matrix -->
          <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between border-b border-border-strong pb-4">
                <div>
                  <h2 class="font-display text-base font-extrabold text-ink-navy">
                    Cluster Occupancy &amp; Contribution Matrix
                  </h2>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Capacity utilization and active revenue across the 5 property clusters.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button 
                    @click="router.push('/admin/directory')"
                    class="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer mr-2"
                  >
                    <span>Directory</span>
                    <ChevronRight class="size-3" />
                  </button>
                  <button 
                    @click="isLiveClusterMatrixOpen = !isLiveClusterMatrixOpen"
                    class="p-1 rounded-lg hover:bg-surface-sunken text-muted-foreground hover:text-ink-navy transition-all cursor-pointer"
                    :title="isLiveClusterMatrixOpen ? 'Collapse Clusters' : 'Expand Clusters'"
                  >
                    <ChevronDown :class="['size-4 transition-transform duration-200', isLiveClusterMatrixOpen ? 'rotate-180' : '']" />
                  </button>
                </div>
              </div>

              <div v-show="isLiveClusterMatrixOpen" class="mt-5 space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                <div 
                  v-for="c in liveClusterPerformance" 
                  :key="c.name"
                  class="p-3.5 rounded-xl border border-border-strong bg-background"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-display text-xs font-black uppercase text-ink-navy">
                        {{ c.name }}
                      </h3>
                      <p class="text-[11px] text-muted-foreground mt-0.5">
                        {{ c.occupied }} of {{ c.total }} units occupied ({{ c.vacant }} vacant)
                      </p>
                    </div>
                    <div class="text-right">
                      <span class="font-display font-extrabold text-sm text-ink-navy block">
                        {{ peso(c.revenue) }}
                      </span>
                      <span :class="[
                        'text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mt-0.5',
                        c.rate >= 75 ? 'bg-emerald-100 text-emerald-800' : c.rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      ]">
                        {{ c.rate }}% Occupancy
                      </span>
                    </div>
                  </div>

                  <div class="mt-2.5 h-2 w-full bg-border-strong rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-primary rounded-full transition-all duration-300"
                      :style="{ width: `${c.rate}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-border-strong flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <!-- The unit count is read from the live room list rather than written
                   into the markup, and the second span used to read "Active Inventory
                   Fully Synchronized" - a reassurance that measured nothing. -->
              <span class="whitespace-nowrap">Total operational capacity: <strong>{{ totalRoomsCount }} units</strong></span>
              <span class="whitespace-nowrap text-emerald-700 font-semibold">{{ occupiedRoomsCount }} occupied · {{ totalRoomsCount - occupiedRoomsCount }} vacant</span>
            </div>
          </div>
        </div>

      </template>

      <!-- ==================================================================== *
       * VIEW MODE B: DEDICATED HISTORICAL FISCAL ARCHIVE (FY 2025 / 2024)
       * ==================================================================== -->
      <template v-else>

        <!-- Historical Annual Key Performance Indicators (4 Cards) -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          
          <!-- Card 1: Gross Remittance -->
          <div class="surface-card relative overflow-hidden p-5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">FY {{ selectedArchiveYear }} Gross Inflow</p>
              <span class="rounded-xl p-2 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                <TrendingUp class="size-4" />
              </span>
            </div>
            <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-ink-navy">
              {{ peso(historicalAnnualGrossTotal) }}
            </p>
            <p class="mt-1.5 text-xs text-emerald-700 font-semibold">
              {{ historicalIncomeRecords.length }} verified remittance records
            </p>
          </div>

          <!-- Card 2: 50% Share -->
          <div class="surface-card relative overflow-hidden p-5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">50% Share</p>
              <span class="rounded-xl p-2 bg-blue-50 text-blue-800 ring-1 ring-blue-200">
                <DollarSign class="size-4" />
              </span>
            </div>
            <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-primary">
              {{ peso(historicalAnnualHalfOfRentShare) }}
            </p>
            <p class="mt-1.5 text-xs text-muted-foreground">
              BR-032 compliant 50% profit allocation
            </p>
          </div>

          <!-- Card 3: Total Expenses -->
          <div class="surface-card relative overflow-hidden p-5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Operational Expenses</p>
              <span class="rounded-xl p-2 bg-rose-50 text-rose-800 ring-1 ring-rose-200">
                <ReceiptText class="size-4" />
              </span>
            </div>
            <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-rose-700">
              {{ peso(historicalAnnualExpenseTotal) }}
            </p>
            <p class="mt-1.5 text-xs text-rose-600 font-semibold">
              {{ historicalExpenseRecords.length }} categorized expense entries
            </p>
            <p
              v-if="historicalAnnualPersonalTotal > 0"
              class="mt-1 text-[11px] leading-snug text-muted-foreground"
              title="Main House is the owner's own residence and Other / Personal is personal by definition. Both are recorded in the same ledger but are not a cost of running the boarding house, so they are not subtracted from rental income."
            >
              Excludes {{ peso(historicalAnnualPersonalTotal) }} personal (Main House / Other)
            </p>
          </div>

          <!-- Card 4: Net Operating Income -->
          <div class="surface-card relative overflow-hidden p-5">
            <div class="flex items-start justify-between gap-3">
              <p class="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Net Operating Income (NOI)</p>
              <span :class="[
                'rounded-xl p-2 ring-1',
                historicalAnnualNOI >= 0 ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-rose-200'
              ]">
                <ArrowUpRight v-if="historicalAnnualNOI >= 0" class="size-4" />
                <ArrowDownRight v-else class="size-4" />
              </span>
            </div>
            <p :class="[
              'tabular mt-3 font-display text-3xl font-black leading-tight',
              historicalAnnualNOI >= 0 ? 'text-emerald-700' : 'text-rose-700'
            ]">
              {{ peso(historicalAnnualNOI) }}
            </p>
            <p class="mt-1.5 text-xs text-muted-foreground">
              Inflow minus operating outflows
            </p>
          </div>
        </div>

        <!-- 12-MONTH HISTORICAL INCOME CURVE -->
        <div class="surface-card relative rounded-2xl border border-border-strong bg-white p-6 shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-5">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp class="size-4" />
                </span>
                <h2 class="font-display text-lg font-black text-ink-navy">
                  12-Month Inflow Trajectory (FY {{ selectedArchiveYear }})
                </h2>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Exact monthly gross remittances collected from tenants across Jan–Dec {{ selectedArchiveYear }}.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-xs">
              <div class="bg-background px-3 py-1.5 rounded-xl border border-border-strong">
                <span class="text-muted-foreground">Annual Total: </span>
                <span class="font-display font-bold text-ink-navy">{{ peso(historicalAnnualGrossTotal) }}</span>
              </div>
              <div class="bg-background px-3 py-1.5 rounded-xl border border-border-strong">
                <span class="text-muted-foreground">Monthly Average: </span>
                <span class="font-display font-bold text-primary">{{ peso(historicalAverageMonthlyIncome) }}</span>
              </div>
              <div class="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <span class="text-emerald-800 font-bold">Peak: {{ historicalPeakMonth.month }} ({{ peso(historicalPeakMonth.grossIncome) }})</span>
              </div>
            </div>
          </div>

          <!-- SVG Chart Area -->
          <div class="relative mt-6 w-full">
            <svg :viewBox="`0 0 ${chartSvgWidth} ${chartSvgHeight}`" class="w-full h-64 overflow-visible">
              <defs>
                <linearGradient id="histRevenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0c66e4" stop-opacity="0.22" />
                  <stop offset="80%" stop-color="#0c66e4" stop-opacity="0.02" />
                  <stop offset="100%" stop-color="#0c66e4" stop-opacity="0.0" />
                </linearGradient>
                <linearGradient id="histRevenueLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#0c66e4" />
                  <stop offset="50%" stop-color="#2563eb" />
                  <stop offset="100%" stop-color="#38bdf8" />
                </linearGradient>
              </defs>

              <g class="grid-lines" opacity="0.5">
                <line 
                  v-for="tick in 4" 
                  :key="tick"
                  :x1="chartPoints[0]?.x ?? 50" 
                  :y1="chartPaddingY + ((tick - 1) * ((chartSvgHeight - chartPaddingY * 2 - 40) / 3))"
                  :x2="chartPoints[chartPoints.length - 1]?.x ?? (chartSvgWidth - 50)" 
                  :y2="chartPaddingY + ((tick - 1) * ((chartSvgHeight - chartPaddingY * 2 - 40) / 3))"
                  stroke="#dfe1e6" 
                  stroke-dasharray="4 4"
                  stroke-width="1"
                />
              </g>

              <path :d="areaPathData" fill="url(#histRevenueAreaGradient)" />
              <path :d="linePathData" fill="none" stroke="url(#histRevenueLineGradient)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />

              <g v-for="(pt, idx) in chartPoints" :key="pt.month">
                <line 
                  v-if="hoveredMonthIndex === idx"
                  :x1="pt.x" 
                  :y1="chartPaddingY" 
                  :x2="pt.x" 
                  :y2="chartSvgHeight - chartPaddingY"
                  stroke="#0c66e4" 
                  stroke-width="1.5" 
                  stroke-dasharray="2 2"
                />
                <circle 
                  :cx="pt.x" 
                  :cy="pt.y" 
                  :r="hoveredMonthIndex === idx ? 7 : 4.5" 
                  fill="#ffffff" 
                  :stroke="hoveredMonthIndex === idx ? '#0c66e4' : '#2563eb'" 
                  :stroke-width="hoveredMonthIndex === idx ? 3.5 : 2.5"
                  class="transition-all duration-150 cursor-pointer"
                />
                <text :x="pt.x" :y="chartSvgHeight - 38" text-anchor="middle" class="text-[12px] font-extrabold fill-ink-navy">
                  {{ pt.month }}
                </text>
                <text :x="pt.x" :y="chartSvgHeight - 22" text-anchor="middle" class="text-[11px] font-extrabold fill-primary">
                  {{ peso(pt.grossIncome) }}
                </text>
                <text :x="pt.x" :y="chartSvgHeight - 8" text-anchor="middle" class="text-[9px] font-bold fill-emerald-700">
                  Verified
                </text>
                <rect 
                  :x="idx * (chartSvgWidth / 12)" 
                  :y="0" 
                  :width="chartSvgWidth / 12" 
                  :height="chartSvgHeight" 
                  fill="transparent" 
                  class="cursor-pointer"
                  @mouseenter="hoveredMonthIndex = idx"
                  @mouseleave="hoveredMonthIndex = null"
                />
              </g>
            </svg>

            <!-- Floating Tooltip -->
            <div 
              v-if="hoveredMonthIndex !== null && chartPoints[hoveredMonthIndex]"
              class="absolute pointer-events-none z-50 top-1 bg-ink-navy text-white p-3 rounded-xl shadow-2xl border border-neutral-700/80 text-xs space-y-1 transition-all duration-150 whitespace-nowrap"
              :style="{
                left: `${((hoveredMonthIndex + 0.5) / 12) * 100}%`,
                transform: hoveredMonthIndex === 0 ? 'translateX(0%)' : hoveredMonthIndex === 11 ? 'translateX(-100%)' : 'translateX(-50%)'
              }"
            >
              <div class="flex items-center justify-between gap-3 border-b border-neutral-700 pb-1">
                <span class="font-bold uppercase tracking-wider text-amber-400">
                  {{ chartPoints[hoveredMonthIndex].month }} {{ selectedArchiveYear }}
                </span>
                <span class="text-[10px] text-neutral-400">
                  Verified Past Record
                </span>
              </div>
              <div class="flex items-center justify-between gap-4">
                <span class="text-neutral-300">Gross Remitted:</span>
                <span class="font-bold text-white">{{ peso(chartPoints[hoveredMonthIndex].grossIncome) }}</span>
              </div>
              <div class="flex items-center justify-between gap-4 text-[11px]">
                <span class="text-neutral-400">50% Share:</span>
                <span class="font-semibold text-emerald-400">{{ peso(chartPoints[hoveredMonthIndex].halfOfRentShare) }}</span>
              </div>
              <div class="flex items-center justify-between gap-4 text-[11px]">
                <span class="text-neutral-400">Expenses:</span>
                <span class="font-semibold text-rose-400">{{ peso(chartPoints[hoveredMonthIndex].expenses) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2-COLUMN SECTION: HISTORICAL CASH FLOW & HISTORICAL CLUSTER CONTRIBUTION -->
        <div class="grid gap-6 lg:grid-cols-2">
          
          <!-- Historical Cash Flow (All 12 Months) -->
          <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between border-b border-border-strong pb-4">
                <div>
                  <h2 class="font-display text-base font-extrabold text-ink-navy">
                    Historical Cash Flow (FY {{ selectedArchiveYear }})
                  </h2>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Monthly income inflow compared with maintenance, bills, and operational expenses.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold mr-1">
                    <span class="size-2 rounded-sm bg-emerald-600"></span> Inflow
                  </span>
                  <span class="inline-flex items-center gap-1.5 text-xs text-rose-800 font-bold mr-2">
                    <span class="size-2 rounded-sm bg-rose-500"></span> Expenses
                  </span>
                  <button 
                    @click="isHistoricalCashFlowOpen = !isHistoricalCashFlowOpen"
                    class="p-1 rounded-lg hover:bg-surface-sunken text-muted-foreground hover:text-ink-navy transition-all cursor-pointer"
                    :title="isHistoricalCashFlowOpen ? 'Collapse Cash Flow' : 'Expand Cash Flow'"
                  >
                    <ChevronDown :class="['size-4 transition-transform duration-200', isHistoricalCashFlowOpen ? 'rotate-180' : '']" />
                  </button>
                </div>
              </div>

              <!-- 12 Months List (Scrollable & Collapsible) -->
              <div v-show="isHistoricalCashFlowOpen" class="mt-5 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                <div 
                  v-for="d in historical12MonthsData" 
                  :key="d.month"
                  class="p-2.5 rounded-xl border border-border-strong bg-background space-y-1.5"
                >
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-extrabold text-ink-navy">{{ d.month }} {{ selectedArchiveYear }}</span>
                    <span class="text-xs">
                      Net: <strong :class="d.noi >= 0 ? 'text-emerald-800' : 'text-rose-700'">{{ peso(d.noi) }}</strong>
                    </span>
                  </div>

                  <!-- Dual Progress Bar -->
                  <div class="grid grid-cols-2 gap-2 h-3 bg-white rounded-lg p-0.5 border border-border-strong">
                    <div class="relative h-full bg-[#f0fdf4] rounded-sm overflow-hidden flex justify-end">
                      <div 
                        class="h-full bg-emerald-600 rounded-sm transition-all duration-300"
                        :style="{ width: `${Math.min((d.grossIncome / maxGross) * 100, 100)}%` }"
                      ></div>
                    </div>
                    <div class="relative h-full bg-[#fff1f2] rounded-sm overflow-hidden flex justify-start">
                      <div 
                        class="h-full bg-rose-500 rounded-sm transition-all duration-300"
                        :style="{ width: `${Math.min((d.expenses / maxGross) * 100, 100)}%` }"
                      ></div>
                    </div>
                  </div>

                  <div class="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>Revenue: <strong class="text-ink-navy">{{ peso(d.grossIncome) }}</strong></span>
                    <span
                      :title="d.personalExpenses > 0
                        ? `Operating expenses only. A further ${peso(d.personalExpenses)} of personal (Main House / Other) cost is recorded this month and is not subtracted from rental income.`
                        : 'Operating expenses only.'"
                    >Operating: <strong class="text-rose-700">{{ peso(d.expenses) }}</strong></span>
                  </div>
                  <div
                    v-if="d.personalExpenses > 0"
                    class="flex flex-wrap justify-end text-[10px] text-muted-foreground-soft px-0.5 -mt-0.5"
                  >
                    <span>Personal (not deducted): {{ peso(d.personalExpenses) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-border-strong flex items-center justify-between text-xs text-muted-foreground">
              <span>Annual Inflow: <strong>{{ peso(historicalAnnualGrossTotal) }}</strong></span>
              <span>Annual Outflow: <strong>{{ peso(historicalAnnualExpenseTotal) }}</strong></span>
            </div>
          </div>

          <!-- Historical Cluster Contribution Matrix -->
          <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between border-b border-border-strong pb-4">
                <div>
                  <h2 class="font-display text-base font-extrabold text-ink-navy">
                    Cluster Contribution Matrix (FY {{ selectedArchiveYear }})
                  </h2>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Annual revenue contribution and unit participation across property clusters.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs px-2 py-0.5 rounded-md bg-surface-sunken border border-border-strong font-bold text-muted-foreground mr-1">
                    5 Clusters
                  </span>
                  <button 
                    @click="isHistoricalClusterMatrixOpen = !isHistoricalClusterMatrixOpen"
                    class="p-1 rounded-lg hover:bg-surface-sunken text-muted-foreground hover:text-ink-navy transition-all cursor-pointer"
                    :title="isHistoricalClusterMatrixOpen ? 'Collapse Matrix' : 'Expand Matrix'"
                  >
                    <ChevronDown :class="['size-4 transition-transform duration-200', isHistoricalClusterMatrixOpen ? 'rotate-180' : '']" />
                  </button>
                </div>
              </div>

              <!-- Cluster Rows (Scrollable & Collapsible) -->
              <div v-show="isHistoricalClusterMatrixOpen" class="mt-5 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                <div 
                  v-for="c in historicalClusterPerformance" 
                  :key="c.name"
                  class="p-3.5 rounded-xl border border-border-strong bg-background"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-display text-xs font-black uppercase text-ink-navy">
                        {{ c.name }}
                      </h3>
                      <p class="text-[11px] text-muted-foreground mt-0.5">
                        {{ c.recordCount }} recorded payments across {{ c.uniqueRooms }} unit{{ c.uniqueRooms === 1 ? '' : 's' }}
                      </p>
                    </div>
                    <div class="text-right">
                      <span class="font-display font-extrabold text-sm text-ink-navy block">
                        {{ peso(c.revenue) }}
                      </span>
                      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mt-0.5 bg-blue-100 text-blue-800">
                        {{ c.shareOfTotal }}% of Total Inflow
                      </span>
                    </div>
                  </div>

                  <div class="mt-2.5 h-2 w-full bg-border-strong rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-primary rounded-full transition-all duration-300"
                      :style="{ width: `${c.shareOfTotal}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-border-strong flex items-center justify-between text-xs text-muted-foreground">
              <span>50% Share (half of Rent Amount): <strong>{{ peso(historicalAnnualHalfOfRentShare) }}</strong></span>
              <span class="text-emerald-700 font-semibold">100% Reconciled with Excel</span>
            </div>
          </div>
        </div>

        <!-- ================================================================== *
         * SECTION 4: HISTORICAL TENANT ROSTER FOR FY {selectedArchiveYear}
         * ================================================================== -->
        <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Users class="size-4" />
                </span>
                <h2 class="font-display text-base font-extrabold text-ink-navy">
                  Historical Tenant Directory &amp; Roster (FY {{ selectedArchiveYear }})
                </h2>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Every tenant who resided and remitted payments in FY {{ selectedArchiveYear }}, mapped from verified records.
              </p>
            </div>

            <!-- Search & Controls -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <div class="relative min-w-[180px]">
                <Search class="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input 
                  v-model="historicalSearchQuery" 
                  type="text" 
                  placeholder="Search tenant or unit..."
                  class="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border-strong bg-background text-xs focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <select 
                v-model="historicalClusterFilter"
                class="px-2.5 py-1.5 rounded-xl border border-border-strong bg-background text-xs focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Clusters</option>
                <option v-for="c in CLUSTERS" :key="c" :value="c">{{ c }}</option>
              </select>

              <span class="px-2.5 py-1 rounded-xl bg-surface-sunken text-muted-foreground font-bold">
                {{ historicalTenantRoster.length }} Residents
              </span>

              <!-- Collapse Toggle Button -->
              <button 
                @click="isTenantRosterOpen = !isTenantRosterOpen"
                class="btn-secondary min-h-8 px-2.5 py-1 text-xs gap-1 cursor-pointer"
                :title="isTenantRosterOpen ? 'Collapse table' : 'Expand table'"
              >
                <span>{{ isTenantRosterOpen ? 'Collapse' : 'Expand' }}</span>
                <ChevronDown :class="['size-3.5 transition-transform duration-200', isTenantRosterOpen ? 'rotate-180' : '']" />
              </button>
            </div>
          </div>

          <!-- Roster Table (Scrollable Viewport with Sticky Header) -->
          <div v-show="isTenantRosterOpen" class="overflow-x-auto max-h-[360px] overflow-y-auto rounded-xl border border-border-strong">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="sticky top-0 bg-background z-10 shadow-xs">
                <tr class="border-b border-border-strong text-muted-foreground font-bold">
                  <th class="py-2.5 px-3">Tenant Name</th>
                  <th class="py-2.5 px-3">Unit Code</th>
                  <th class="py-2.5 px-3">Cluster</th>
                  <th class="py-2.5 px-3 text-center">Active Remittances</th>
                  <th class="py-2.5 px-3">Months Paid</th>
                  <th class="py-2.5 px-3 text-right">Total Remitted</th>
                  <th class="py-2.5 px-3">Invoice / OR Reference</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-strong">
                <tr 
                  v-for="t in historicalTenantRoster" 
                  :key="`${t.name}-${t.unit}`"
                  class="hover:bg-background transition-colors"
                >
                  <td class="py-2.5 px-3 font-bold text-ink-navy">
                    {{ t.name }}
                  </td>
                  <td class="py-2.5 px-3">
                    <span class="px-2 py-0.5 rounded-md bg-surface-sunken border border-border-strong font-mono font-bold text-ink-navy">
                      {{ t.unit }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-muted-foreground">
                    {{ t.cluster }}
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <span class="px-2 py-0.5 rounded-full bg-blue-50 text-primary font-bold text-[10px] ring-1 ring-blue-200">
                      {{ t.monthsCount }} Payment{{ t.monthsCount === 1 ? '' : 's' }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-muted-foreground text-[11px]">
                    {{ t.activeMonths.join(', ') }}
                  </td>
                  <td class="py-2.5 px-3 text-right font-display font-extrabold text-ink-navy">
                    {{ peso(t.totalRemitted) }}
                  </td>
                  <td class="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                    {{ t.invoiceSample }}
                  </td>
                </tr>

                <tr v-if="historicalTenantRoster.length === 0">
                  <td colspan="7" class="py-8 text-center text-muted-foreground">
                    No tenants match your search filter for FY {{ selectedArchiveYear }}.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ================================================================== *
         * SECTION 5: 33-UNIT HISTORICAL ROOM UTILIZATION DIRECTORY
         * ================================================================== -->
        <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Building2 class="size-4" />
                </span>
                <h2 class="font-display text-base font-extrabold text-ink-navy">
                  33-Unit Historical Revenue &amp; Occupancy Directory (FY {{ selectedArchiveYear }})
                </h2>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Annual revenue and active occupancy months generated by each unit in FY {{ selectedArchiveYear }}.
              </p>
            </div>

            <div class="flex items-center gap-2 text-xs">
              <span class="px-3 py-1 rounded-xl bg-background border border-border-strong text-muted-foreground font-bold">
                33 Canonical Units
              </span>

              <!-- Collapse Toggle Button -->
              <button 
                @click="isUnitDirectoryOpen = !isUnitDirectoryOpen"
                class="btn-secondary min-h-8 px-2.5 py-1 text-xs gap-1 cursor-pointer"
                :title="isUnitDirectoryOpen ? 'Collapse table' : 'Expand table'"
              >
                <span>{{ isUnitDirectoryOpen ? 'Collapse' : 'Expand' }}</span>
                <ChevronDown :class="['size-3.5 transition-transform duration-200', isUnitDirectoryOpen ? 'rotate-180' : '']" />
              </button>
            </div>
          </div>

          <!-- Unit Utilization Grid Table (Scrollable Viewport with Sticky Header) -->
          <div v-show="isUnitDirectoryOpen" class="overflow-x-auto max-h-[360px] overflow-y-auto rounded-xl border border-border-strong">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="sticky top-0 bg-background z-10 shadow-xs">
                <tr class="border-b border-border-strong text-muted-foreground font-bold">
                  <th class="py-2.5 px-3">Unit</th>
                  <th class="py-2.5 px-3">Cluster</th>
                  <th class="py-2.5 px-3">Floor</th>
                  <th class="py-2.5 px-3 text-center">Months Active</th>
                  <th class="py-2.5 px-3 text-center">Occupancy Rate</th>
                  <th class="py-2.5 px-3 text-right">Avg Monthly Rate</th>
                  <th class="py-2.5 px-3 text-right">Total FY Revenue</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-strong">
                <tr 
                  v-for="u in historicalRoomUtilization" 
                  :key="u.unitCode"
                  class="hover:bg-background transition-colors"
                >
                  <td class="py-2.5 px-3 font-mono font-black text-ink-navy">
                    {{ u.unitCode }}
                  </td>
                  <td class="py-2.5 px-3 text-muted-foreground">
                    {{ u.cluster }}
                  </td>
                  <td class="py-2.5 px-3 text-muted-foreground">
                    {{ u.floorLabel }}
                  </td>
                  <td class="py-2.5 px-3 text-center font-bold text-ink-navy">
                    {{ u.activeMonths }} / 12 mos
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <span :class="[
                      'px-2 py-0.5 rounded-full font-bold text-[10px]',
                      u.occupancyRate >= 75 ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : u.occupancyRate >= 50 ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-stone-100 text-stone-700'
                    ]">
                      {{ u.occupancyRate }}%
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-right text-muted-foreground">
                    {{ peso(u.averageMonthlyRevenue) }}
                  </td>
                  <td class="py-2.5 px-3 text-right font-display font-extrabold text-ink-navy">
                    {{ peso(u.totalRevenue) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ================================================================== *
         * SECTION 6: DEEP HISTORICAL LEDGER DRILLDOWNS (TABBED & COLLAPSIBLE)
         * ================================================================== -->
        <div class="surface-card rounded-2xl border border-border-strong bg-white p-4 sm:p-6 shadow-xs min-w-0 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-strong pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet class="size-4" />
                </span>
                <h2 class="font-display text-base font-extrabold text-ink-navy">
                  Deep Ledger Drilldown (FY {{ selectedArchiveYear }})
                </h2>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Audit every raw line entry matching the Excel archive workbook with 100% mathematical fidelity.
              </p>
            </div>

            <!-- Tab Switcher & Collapse Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="inline-flex rounded-xl bg-surface-sunken p-1 border border-border-strong text-xs">
                <button
                  @click="historicalLedgerTab = 'income'"
                  :class="[
                    'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    historicalLedgerTab === 'income' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-ink-navy'
                  ]"
                >
                  <span>Income Ledger</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="historicalLedgerTab === 'income' ? 'bg-white/20' : 'bg-stone-200'">
                    {{ historicalIncomeRecords.length }}
                  </span>
                </button>

                <button
                  @click="historicalLedgerTab = 'expenses'"
                  :class="[
                    'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    historicalLedgerTab === 'expenses' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-ink-navy'
                  ]"
                >
                  <span>Expense Ledger</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded-full" :class="historicalLedgerTab === 'expenses' ? 'bg-white/20' : 'bg-stone-200'">
                    {{ historicalExpenseRecords.length }}
                  </span>
                </button>
              </div>

              <!-- Collapse Toggle Button -->
              <button 
                @click="isDeepLedgerOpen = !isDeepLedgerOpen"
                class="btn-secondary min-h-8 px-2.5 py-1 text-xs gap-1 cursor-pointer"
                :title="isDeepLedgerOpen ? 'Collapse ledger' : 'Expand ledger'"
              >
                <span>{{ isDeepLedgerOpen ? 'Collapse' : 'Expand' }}</span>
                <ChevronDown :class="['size-3.5 transition-transform duration-200', isDeepLedgerOpen ? 'rotate-180' : '']" />
              </button>
            </div>
          </div>

          <div v-show="isDeepLedgerOpen">
            <!-- TAB 1: INCOME LEDGER (Scrollable with Sticky Header) -->
            <div v-if="historicalLedgerTab === 'income'" class="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-border-strong">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="sticky top-0 bg-background z-10 shadow-xs">
                  <tr class="border-b border-border-strong text-muted-foreground font-bold">
                    <th class="py-2.5 px-3">Date Paid</th>
                    <th class="py-2.5 px-3">Unit</th>
                    <th class="py-2.5 px-3">Tenant Name</th>
                    <th class="py-2.5 px-3">Rent Period</th>
                    <th class="py-2.5 px-3 text-right">Rent Base</th>
                    <th class="py-2.5 px-3 text-right">50% Share</th>
                    <th class="py-2.5 px-3 text-right">Water</th>
                    <th class="py-2.5 px-3 text-right">Total Remitted</th>
                    <th class="py-2.5 px-3">Invoice #</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-strong">
                  <tr 
                    v-for="r in historicalIncomeRecords" 
                    :key="r.id"
                    class="hover:bg-background transition-colors"
                  >
                    <td class="py-2 px-3 text-muted-foreground whitespace-nowrap">{{ r.datePaid }}</td>
                    <td class="py-2 px-3 font-mono font-bold text-ink-navy">{{ r.unit }}</td>
                    <td class="py-2 px-3 font-medium text-ink-navy">{{ r.contact }}</td>
                    <td class="py-2 px-3 text-muted-foreground text-[11px]">{{ r.rentFor }}</td>
                    <td class="py-2 px-3 text-right text-muted-foreground">{{ peso(r.rent) }}</td>
                    <td class="py-2 px-3 text-right font-medium text-blue-700">{{ peso(r.fiftyPercentShare || 0) }}</td>
                    <td class="py-2 px-3 text-right text-muted-foreground">{{ peso(r.water) }}</td>
                    <td class="py-2 px-3 text-right font-bold text-emerald-800">{{ peso(r.totalRemitted || r.rent) }}</td>
                    <td class="py-2 px-3 font-mono text-[11px] text-muted-foreground">{{ r.invoice }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- TAB 2: EXPENSE LEDGER (Scrollable with Sticky Header) -->
            <div v-else class="overflow-x-auto max-h-[380px] overflow-y-auto rounded-xl border border-border-strong">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="sticky top-0 bg-background z-10 shadow-xs">
                  <tr class="border-b border-border-strong text-muted-foreground font-bold">
                    <th class="py-2.5 px-3">Date</th>
                    <th class="py-2.5 px-3">OR / Supplier</th>
                    <th class="py-2.5 px-3">Category</th>
                    <th class="py-2.5 px-3">Property Allocations</th>
                    <th class="py-2.5 px-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-strong">
                  <tr 
                    v-for="e in historicalExpenseRecords" 
                    :key="e.id"
                    class="hover:bg-background transition-colors"
                  >
                    <td class="py-2 px-3 text-muted-foreground whitespace-nowrap">{{ e.date }}</td>
                    <td class="py-2 px-3 font-medium text-ink-navy">{{ e.description }}</td>
                    <td class="py-2 px-3">
                      <span class="px-2 py-0.5 rounded-md bg-surface-sunken border border-border-strong text-[11px] text-ink-navy">
                        {{ e.category }}
                      </span>
                    </td>
                    <td class="py-2 px-3 text-[11px] text-muted-foreground">
                      <span v-for="(s, sIdx) in e.splits" :key="sIdx" class="mr-2">
                        {{ s.area }}: <strong>{{ peso(s.amount) }}</strong>
                      </span>
                    </td>
                    <td class="py-2 px-3 text-right font-bold text-rose-700">{{ peso(e.totalAmount || 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </template>

    </div>

    <!-- Mobile Floating Action Speed-Dial Button (FAB) -->
    <div class="sm:hidden">
      <div 
        v-if="isFabOpen" 
        class="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 animate-in fade-in duration-150" 
        @click="isFabOpen = false" 
      />

      <div class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform opacity-0 translate-y-4 scale-90"
          enter-to-class="transform opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform opacity-100 translate-y-0 scale-100"
          leave-to-class="transform opacity-0 translate-y-4 scale-90"
        >
          <div v-if="isFabOpen" class="flex flex-col items-end gap-2.5 mb-1">
            <button
              v-if="!isHistoricalMode"
              @click="isFabOpen = false; router.push('/admin/expenses');"
              class="px-4 py-2.5 rounded-xl bg-white text-ink-navy font-extrabold text-xs shadow-xl border border-border-strong hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer select-none whitespace-nowrap"
            >
              <span>Record Expense</span>
            </button>

            <button
              v-if="!isHistoricalMode"
              @click="isFabOpen = false; isOnsitePaymentModalOpen = true;"
              class="px-4 py-2.5 rounded-xl bg-white text-ink-navy font-extrabold text-xs shadow-xl border border-border-strong hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer select-none whitespace-nowrap"
            >
              <span>Record Payment</span>
            </button>

            <button
              v-if="isHistoricalMode"
              @click="isFabOpen = false; exportHistoricalCSV();"
              class="px-4 py-2.5 rounded-xl bg-white text-ink-navy font-extrabold text-xs shadow-xl border border-border-strong hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer select-none whitespace-nowrap"
            >
              <span>Export FY {{ selectedArchiveYear }} CSV</span>
            </button>
          </div>
        </Transition>

        <button
          @click="isFabOpen = !isFabOpen"
          :class="[
            'size-14 rounded-full shadow-2xl transition-all flex items-center justify-center cursor-pointer border-2 border-white',
            isFabOpen 
              ? 'bg-primary text-white ring-4 ring-blue-200' 
              : 'bg-white text-ink-navy ring-4 ring-stone-200 hover:bg-primary hover:text-white hover:ring-blue-200'
          ]"
          title="Quick Actions"
          aria-label="Quick Actions Menu"
        >
          <Plus 
            :class="[
              'size-7 transition-transform duration-200',
              isFabOpen ? 'rotate-45' : ''
            ]" 
          />
        </button>
      </div>
    </div>
  </div>
</template>
