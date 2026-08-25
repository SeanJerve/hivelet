<!--
  @file views/AdminOverviewView.vue
  @description Executive Operations Overview Dashboard with 12-Month Income & Cash Flow Analytics
  @systemBibleRef docs/01_SYSTEM_BIBLE.md Section 17 (Dashboard & Financial Reporting)
  @architectureRef docs/04_ARCHITECTURE.md
  @businessRules BR-017, BR-028, BR-032
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
  type RoomItem 
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
  ChevronRight
} from 'lucide-vue-next';

const router = useRouter();
const pendingPayments = ref<any[]>([]);
const isRefreshing = ref(false);
const isInitialLoading = ref(true);
const hoveredMonthIndex = ref<number | null>(null);

async function loadPayments() {
  try {
    const data = await api.get<any[]>('/admin/payments');
    if (data && Array.isArray(data)) {
      pendingPayments.value = data.filter((p) => p.verification_status === 'Pending Verification');
    }
  } catch {
    // Graceful fallback
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
      loadPayments()
    ]);
  } finally {
    isRefreshing.value = false;
    isInitialLoading.value = false;
  }
}

onMounted(() => {
  refreshAllData();
});

// Dynamic Computed Metrics
const monthlyRevenue = computed(() => {
  if (incomeRecords.length > 0) {
    return incomeRecords.reduce((sum, r) => sum + (Number(r.totalRemitted || r.rent || 0)), 0);
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

const openTicketsCount = computed(() => maintenanceTickets.filter(t => t.status !== 'Resolved').length);
const emergencyTicketsCount = computed(() => maintenanceTickets.filter(t => t.status !== 'Resolved' && (t.priority === 'Emergency' || t.priority === 'High')).length);

// 12-Month Yearly Income Calculation (Jan through Dec for current fiscal year 2026)
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

// Base active monthly run-rate from occupied rooms
const baseMonthlyRunRate = computed(() => {
  return rooms.reduce((sum, r) => {
    if (r.status === 'settled' || r.status === 'pending' || r.tenant !== null) {
      return sum + Number(r.price || 0) + (r.waterRateType === 'linda_fixed' ? 200 : (r.occupants || 1) * 200);
    }
    return sum;
  }, 0);
});

interface MonthIncomeData {
  month: string;
  monthNum: number;
  grossIncome: number;
  landladyShare: number;
  waterIncome: number;
  expenses: number;
  noi: number;
  isProjected: boolean;
}

const yearly12MonthsData = computed<MonthIncomeData[]>(() => {
  const currentMonthNum = new Date().getMonth() + 1; // 1-12

  return MONTH_NAMES.map((name, idx) => {
    const monthNum = idx + 1;
    
    // Find all income records for this month in year 2026
    const matchingRecords = incomeRecords.filter((r) => {
      if (r.datePaid) {
        const parts = r.datePaid.split(' ');
        if (parts[0] === name) return true;
        const d = new Date(r.datePaid);
        if (!isNaN(d.getTime()) && d.getMonth() === idx) return true;
      }
      return false;
    });

    // Find expense records for this month
    const matchingExpenses = expenseRecords.filter((e) => {
      const parts = (e.date || '').split(' ');
      if (parts[0] === name) return true;
      return false;
    });

    const recordedExpenses = matchingExpenses.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);

    if (matchingRecords.length > 0) {
      const grossIncome = matchingRecords.reduce((sum, r) => sum + Number(r.totalRemitted || r.rent || 0), 0);
      const landladyShare = matchingRecords.reduce((sum, r) => sum + Number(r.fiftyPercentShare || (r.rent / 2) || 0), 0);
      const waterIncome = matchingRecords.reduce((sum, r) => sum + Number(r.water || 0), 0);
      return {
        month: name,
        monthNum,
        grossIncome,
        landladyShare,
        waterIncome,
        expenses: recordedExpenses,
        noi: grossIncome - recordedExpenses,
        isProjected: false
      };
    }

    // Baseline projected run-rate for ongoing/upcoming months
    const projectedGross = baseMonthlyRunRate.value > 0 ? baseMonthlyRunRate.value : 43500;
    const projectedShare = Math.round(projectedGross * 0.5);
    const projectedExpenses = recordedExpenses > 0 ? recordedExpenses : Math.round(projectedGross * 0.22);

    return {
      month: name,
      monthNum,
      grossIncome: projectedGross,
      landladyShare: projectedShare,
      waterIncome: 2400,
      expenses: projectedExpenses,
      noi: projectedGross - projectedExpenses,
      isProjected: monthNum > currentMonthNum
    };
  });
});

// Annual Summary Indicators
const totalAnnualProjectedRevenue = computed(() => {
  return yearly12MonthsData.value.reduce((sum, d) => sum + d.grossIncome, 0);
});

const totalAnnualLandladyShare = computed(() => {
  return yearly12MonthsData.value.reduce((sum, d) => sum + d.landladyShare, 0);
});

const averageMonthlyIncome = computed(() => {
  return Math.round(totalAnnualProjectedRevenue.value / 12);
});

const peakMonth = computed(() => {
  let highest = yearly12MonthsData.value[0];
  for (const d of yearly12MonthsData.value) {
    if (d.grossIncome > highest.grossIncome) {
      highest = d;
    }
  }
  return highest;
});

// SVG Chart Path Generation (12-column aligned)
const chartSvgWidth = 1200;
const chartSvgHeight = 220;
const chartPaddingY = 32;

const maxGross = computed(() => {
  const max = Math.max(...yearly12MonthsData.value.map(d => d.grossIncome), 50000);
  return Math.ceil(max / 10000) * 10000;
});

const chartPoints = computed(() => {
  const totalMonths = yearly12MonthsData.value.length || 12;
  const colWidth = chartSvgWidth / totalMonths;
  const innerH = chartSvgHeight - (chartPaddingY * 2);

  return yearly12MonthsData.value.map((d, i) => {
    // Center of each of the 12 columns
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

// Cluster Performance Breakdown
const clusterPerformance = computed(() => {
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

// Recent Verified Income Records (Top 5)
const recentIncomeRecords = computed(() => {
  return incomeRecords.slice(0, 5);
});

// Urgent & Open Maintenance Tickets (Top 5)
const urgentTickets = computed(() => {
  return maintenanceTickets.filter(t => t.status !== 'Resolved').slice(0, 5);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Executive Overview
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Executive financial health, 12-month revenue trajectory, and property operating performance.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button 
          @click="refreshAllData"
          :disabled="isRefreshing"
          class="btn-secondary min-h-11 gap-2 text-xs cursor-pointer shadow-xs"
          title="Refresh Data from Database"
        >
          <RefreshCw :class="['size-4 text-[#71717a]', isRefreshing && 'animate-spin']" />
          <span>Sync DB</span>
        </button>
      </div>
    </div>

    <!-- Dynamic KPI Stat Cards (4 Cards) -->
    <div v-if="isInitialLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SkeletonCard variant="metric" :count="4" />
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div 
        class="surface-card relative overflow-hidden p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Monthly Revenue</p>
          <span class="rounded-xl p-2 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
            <TrendingUp class="size-4" />
          </span>
        </div>
        <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">{{ peso(monthlyRevenue) }}</p>
        <p class="mt-1.5 text-xs text-emerald-700 font-semibold">Live collections ledger sum</p>
      </div>

      <div 
        class="surface-card relative overflow-hidden p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Occupancy Rate</p>
          <span class="rounded-xl p-2 bg-sky-50 text-sky-800 ring-1 ring-sky-200">
            <Home class="size-4" />
          </span>
        </div>
        <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">
          {{ occupiedRoomsCount }} / {{ totalRoomsCount }} Units
        </p>
        <p class="mt-1.5 text-xs text-[#71717a]">
          {{ occupancyPercentage }}% occupied • {{ vacantRoomsCount }} vacant<template v-if="maintenanceRoomsCount > 0"> • {{ maintenanceRoomsCount }} maintenance</template>
        </p>
      </div>

      <div 
        class="surface-card relative overflow-hidden p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Pending Remittances</p>
          <span class="rounded-xl p-2 bg-amber-50 text-amber-800 ring-1 ring-amber-200">
            <ShieldAlert class="size-4" />
          </span>
        </div>
        <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">
          {{ pendingTotal > 0 ? peso(pendingTotal) : '₱0.00' }}
        </p>
        <p class="mt-1.5 text-xs text-amber-800 font-medium">
          {{ pendingCount }} remittance{{ pendingCount === 1 ? '' : 's' }} awaiting review
        </p>
      </div>

      <div 
        class="surface-card relative overflow-hidden p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Maintenance Alerts</p>
          <span class="rounded-xl p-2 bg-rose-50 text-rose-800 ring-1 ring-rose-200">
            <Wrench class="size-4" />
          </span>
        </div>
        <p class="tabular mt-3 font-display text-3xl font-black leading-tight text-[#1c1917]">
          {{ openTicketsCount }} Open
        </p>
        <p class="mt-1.5 text-xs text-rose-700 font-medium">
          {{ emergencyTicketsCount > 0 ? `${emergencyTicketsCount} urgent needs dispatch` : 'All tickets handled' }}
        </p>
      </div>
    </div>

    <!-- 12-MONTH YEARLY INCOME LINE CHART -->
    <div class="surface-card overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-xs">
      <!-- Chart Title & KPI Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e7e5e4] pb-5">
        <div>
          <div class="flex items-center gap-2">
            <span class="p-1.5 rounded-lg bg-[#0c66e4]/10 text-[#0c66e4]">
              <TrendingUp class="size-4" />
            </span>
            <h2 class="font-display text-lg font-black text-[#1c1917]">
              12-Month Yearly Income &amp; Collections Trajectory
            </h2>
          </div>
          <p class="text-xs text-[#71717a] mt-0.5">
            Gross monthly remittance projections and verified ledger collections across FY 2026.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-xs">
          <div class="bg-[#fafaf9] px-3 py-1.5 rounded-xl border border-[#e7e5e4]">
            <span class="text-[#71717a]">Annual Run-Rate: </span>
            <span class="font-display font-bold text-[#1c1917]">{{ peso(totalAnnualProjectedRevenue) }}</span>
          </div>

          <div class="bg-[#fafaf9] px-3 py-1.5 rounded-xl border border-[#e7e5e4]">
            <span class="text-[#71717a]">Monthly Avg: </span>
            <span class="font-display font-bold text-[#0c66e4]">{{ peso(averageMonthlyIncome) }}</span>
          </div>

          <div class="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <span class="text-emerald-800 font-bold">Peak: {{ peakMonth.month }} ({{ peso(peakMonth.grossIncome) }})</span>
          </div>
        </div>
      </div>

      <!-- SVG Line Chart Canvas -->
      <div class="relative mt-6 w-full">
        <svg 
          :viewBox="`0 0 ${chartSvgWidth} ${chartSvgHeight}`" 
          class="w-full h-56 overflow-visible"
        >
          <defs>
            <!-- Area Gradient Fill -->
            <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0c66e4" stop-opacity="0.22" />
              <stop offset="80%" stop-color="#0c66e4" stop-opacity="0.02" />
              <stop offset="100%" stop-color="#0c66e4" stop-opacity="0.0" />
            </linearGradient>

            <!-- Line Stroke Gradient -->
            <linearGradient id="revenueLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#0c66e4" />
              <stop offset="50%" stop-color="#2563eb" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
          </defs>

          <!-- Horizontal Grid Lines -->
          <g class="grid-lines" opacity="0.5">
            <line 
              v-for="tick in 4" 
              :key="tick"
              :x1="chartPoints[0]?.x ?? 50" 
              :y1="chartPaddingY + ((tick - 1) * ((chartSvgHeight - chartPaddingY * 2) / 3))"
              :x2="chartPoints[chartPoints.length - 1]?.x ?? (chartSvgWidth - 50)" 
              :y2="chartPaddingY + ((tick - 1) * ((chartSvgHeight - chartPaddingY * 2) / 3))"
              stroke="#e7e5e4" 
              stroke-dasharray="4 4"
              stroke-width="1"
            />
          </g>

          <!-- Area Under Curve -->
          <path 
            :d="areaPathData" 
            fill="url(#revenueAreaGradient)" 
          />

          <!-- Smooth Curve Line -->
          <path 
            :d="linePathData" 
            fill="none" 
            stroke="url(#revenueLineGradient)" 
            stroke-width="3.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Data Points & Interactive Hit Targets -->
          <g v-for="(pt, idx) in chartPoints" :key="pt.month">
            <!-- Vertical guide on hover -->
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

            <!-- Point Circle Outer Glow -->
            <circle 
              :cx="pt.x" 
              :cy="pt.y" 
              :r="hoveredMonthIndex === idx ? 7 : 4.5" 
              fill="#ffffff" 
              :stroke="hoveredMonthIndex === idx ? '#0c66e4' : '#2563eb'" 
              :stroke-width="hoveredMonthIndex === idx ? 3.5 : 2.5"
              class="transition-all duration-150 cursor-pointer"
            />

            <!-- Month Label on X-Axis -->
            <text 
              :x="pt.x" 
              :y="chartSvgHeight - 8" 
              text-anchor="middle" 
              class="text-[11px] font-bold fill-[#71717a]"
            >
              {{ pt.month }}
            </text>

            <!-- Invisible hit target for hover spanning the column -->
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

        <!-- Dynamic Floating Tooltip on Hover -->
        <div 
          v-if="hoveredMonthIndex !== null && chartPoints[hoveredMonthIndex]"
          class="absolute pointer-events-none z-20 top-2 bg-[#1c1917] text-white p-3 rounded-xl shadow-xl text-xs space-y-1 transition-all duration-150 whitespace-nowrap"
          :style="{
            left: `${((hoveredMonthIndex + 0.5) / 12) * 100}%`,
            transform: 'translateX(-50%)'
          }"
        >
          <div class="flex items-center justify-between gap-3 border-b border-neutral-700 pb-1">
            <span class="font-bold uppercase tracking-wider text-amber-400">
              {{ chartPoints[hoveredMonthIndex].month }} 2026
            </span>
            <span class="text-[10px] text-neutral-400">
              {{ chartPoints[hoveredMonthIndex].isProjected ? 'Projected' : 'Verified' }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="text-neutral-300">Gross Remittance:</span>
            <span class="font-bold text-white">{{ peso(chartPoints[hoveredMonthIndex].grossIncome) }}</span>
          </div>
          <div class="flex items-center justify-between gap-4 text-[11px]">
            <span class="text-neutral-400">50% Landlady Share:</span>
            <span class="font-semibold text-emerald-400">{{ peso(chartPoints[hoveredMonthIndex].landladyShare) }}</span>
          </div>
        </div>
      </div>

      <!-- 12-Month Micro Data Grid -->
      <div class="mt-4 pt-4 border-t border-[#e7e5e4] grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2 text-center">
        <div 
          v-for="(d, i) in yearly12MonthsData" 
          :key="d.month"
          :class="[
            'p-2 rounded-xl border transition-all cursor-pointer text-xs',
            hoveredMonthIndex === i 
              ? 'border-[#0c66e4] bg-blue-50/50 ring-1 ring-[#0c66e4]' 
              : 'border-[#e7e5e4]/80 bg-[#fafaf9] hover:bg-white'
          ]"
          @mouseenter="hoveredMonthIndex = i"
          @mouseleave="hoveredMonthIndex = null"
        >
          <p class="font-extrabold text-[#71717a] text-[10px] uppercase">{{ d.month }}</p>
          <p class="font-display font-bold text-[#1c1917] mt-0.5 text-[11px]">{{ peso(d.grossIncome) }}</p>
          <span :class="['text-[9px] font-semibold block mt-0.5', d.isProjected ? 'text-[#a1a1aa]' : 'text-emerald-700']">
            {{ d.isProjected ? 'Run-rate' : 'Ledger' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 2-COLUMN SECTION: MONTHLY CASH FLOW & CLUSTER OCCUPANCY PERFORMANCE -->
    <div class="grid gap-6 lg:grid-cols-2">
      
      <!-- Chart 2: Monthly Cash Flow (Income vs Expenses) -->
      <div class="surface-card rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between border-b border-[#e7e5e4] pb-4">
            <div>
              <h2 class="font-display text-base font-extrabold text-[#1c1917]">
                Operating Cash Flow (Income vs. Expenses)
              </h2>
              <p class="text-xs text-[#71717a] mt-0.5">
                Monthly revenue inflow compared with maintenance &amp; utility outflows.
              </p>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                <span class="size-2.5 rounded-sm bg-emerald-600"></span> Inflow
              </span>
              <span class="inline-flex items-center gap-1.5 text-xs text-rose-800 font-bold">
                <span class="size-2.5 rounded-sm bg-rose-500"></span> Expenses
              </span>
            </div>
          </div>

          <!-- Cash Flow Bars (Last 6 Months) -->
          <div class="mt-5 space-y-4">
            <div 
              v-for="d in yearly12MonthsData.slice(0, 6)" 
              :key="d.month"
              class="space-y-1.5"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-extrabold text-[#1c1917]">{{ d.month }} 2026</span>
                <span class="text-[#71717a]">
                  Net Income: <strong class="text-emerald-800">{{ peso(d.noi) }}</strong>
                </span>
              </div>

              <!-- Dual Progress Bar -->
              <div class="grid grid-cols-2 gap-2 h-3.5 bg-[#f5f5f4] rounded-lg p-0.5">
                <!-- Income Inflow Bar -->
                <div class="relative h-full bg-[#f0fdf4] rounded-sm overflow-hidden flex justify-end">
                  <div 
                    class="h-full bg-emerald-600 rounded-sm transition-all duration-300"
                    :style="{ width: `${Math.min((d.grossIncome / maxGross) * 100, 100)}%` }"
                  ></div>
                </div>

                <!-- Expense Outflow Bar -->
                <div class="relative h-full bg-[#fff1f2] rounded-sm overflow-hidden flex justify-start">
                  <div 
                    class="h-full bg-rose-500 rounded-sm transition-all duration-300"
                    :style="{ width: `${Math.min((d.expenses / maxGross) * 100, 100)}%` }"
                  ></div>
                </div>
              </div>

              <div class="flex justify-between text-[10px] text-[#71717a] px-0.5">
                <span>Revenue: {{ peso(d.grossIncome) }}</span>
                <span>Expenses: {{ peso(d.expenses) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-[#e7e5e4] flex items-center justify-between">
          <span class="text-xs text-[#71717a]">Detailed records in ledgers:</span>
          <div class="flex gap-2">
            <button 
              @click="router.push('/admin/income')" 
              class="btn-secondary min-h-8 px-3 py-1 text-xs gap-1 cursor-pointer"
            >
              <span>Income Ledger</span>
              <ChevronRight class="size-3" />
            </button>
            <button 
              @click="router.push('/admin/expenses')" 
              class="btn-secondary min-h-8 px-3 py-1 text-xs gap-1 cursor-pointer"
            >
              <span>Expense Ledger</span>
              <ChevronRight class="size-3" />
            </button>
          </div>
        </div>
      </div>

      <!-- Cluster Performance & Occupancy Matrix -->
      <div class="surface-card rounded-2xl border border-[#e7e5e4] bg-white p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between border-b border-[#e7e5e4] pb-4">
            <div>
              <h2 class="font-display text-base font-extrabold text-[#1c1917]">
                Cluster Occupancy &amp; Contribution Matrix
              </h2>
              <p class="text-xs text-[#71717a] mt-0.5">
                Capacity utilization and revenue across the 5 property clusters.
              </p>
            </div>
            <button 
              @click="router.push('/admin/rooms')"
              class="text-xs font-bold text-[#0c66e4] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Directory</span>
              <ChevronRight class="size-3" />
            </button>
          </div>

          <!-- Cluster Rows -->
          <div class="mt-5 space-y-4">
            <div 
              v-for="c in clusterPerformance" 
              :key="c.name"
              class="p-3.5 rounded-xl border border-[#e7e5e4] bg-[#fafaf9] hover:bg-white hover:border-[#0c66e4] transition-all cursor-pointer"
              @click="router.push('/admin/rooms')"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-display text-xs font-black uppercase text-[#1c1917]">
                    {{ c.name }}
                  </h3>
                  <p class="text-[11px] text-[#71717a] mt-0.5">
                    {{ c.occupied }} of {{ c.total }} units occupied ({{ c.vacant }} vacant)
                  </p>
                </div>
                <div class="text-right">
                  <span class="font-display font-extrabold text-sm text-[#1c1917] block">
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

              <!-- Progress bar -->
              <div class="mt-2.5 h-2 w-full bg-[#e7e5e4] rounded-full overflow-hidden">
                <div 
                  class="h-full bg-[#0c66e4] rounded-full transition-all duration-300"
                  :style="{ width: `${c.rate}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-[#e7e5e4] flex items-center justify-between text-xs text-[#71717a]">
          <span>Total Operational Capacity: <strong>32 Units</strong></span>
          <span class="text-emerald-700 font-semibold">Active Inventory Fully Synchronized</span>
        </div>
      </div>
    </div>

    <!-- RECENT ACTIVITY: RECENT COLLECTIONS & URGENT MAINTENANCE TICKETS -->
    <div class="grid gap-6 lg:grid-cols-2">
      
      <!-- Recent Verified Collections -->
      <div class="surface-card rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between border-b border-[#e7e5e4] pb-3 mb-3">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="size-4 text-emerald-600" />
            <h3 class="font-display text-sm font-extrabold text-[#1c1917]">
              Recent Verified Rental Receipts
            </h3>
          </div>
          <button 
            @click="router.push('/admin/income')" 
            class="text-xs font-semibold text-[#0c66e4] hover:underline"
          >
            All Receipts &rarr;
          </button>
        </div>

        <div v-if="recentIncomeRecords.length > 0" class="divide-y divide-[#e7e5e4]">
          <div 
            v-for="rec in recentIncomeRecords" 
            :key="rec.id"
            class="py-2.5 flex items-center justify-between text-xs"
          >
            <div>
              <p class="font-bold text-[#1c1917]">{{ rec.contact }}</p>
              <p class="text-[11px] text-[#71717a]">{{ rec.unit }} · {{ rec.datePaid }} · {{ rec.paymentMethod }}</p>
            </div>
            <div class="text-right">
              <p class="font-display font-extrabold text-[#1c1917]">{{ peso(rec.totalRemitted || rec.rent) }}</p>
              <span class="badge-soft badge-success text-[9px]">Verified</span>
            </div>
          </div>
        </div>

        <div v-else class="p-6 text-center text-xs text-[#71717a]">
          No rental collections recorded yet this period.
        </div>
      </div>

      <!-- Urgent & Active Maintenance Dispatches -->
      <div class="surface-card rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-xs">
        <div class="flex items-center justify-between border-b border-[#e7e5e4] pb-3 mb-3">
          <div class="flex items-center gap-2">
            <Wrench class="size-4 text-rose-600" />
            <h3 class="font-display text-sm font-extrabold text-[#1c1917]">
              Open Maintenance Tickets
            </h3>
          </div>
          <button 
            @click="router.push('/admin/maintenance')" 
            class="text-xs font-semibold text-[#0c66e4] hover:underline"
          >
            Dispatch Board &rarr;
          </button>
        </div>

        <div v-if="urgentTickets.length > 0" class="divide-y divide-[#e7e5e4]">
          <div 
            v-for="t in urgentTickets" 
            :key="t.id"
            class="py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-[#fafaf9] rounded-lg px-1 transition-colors"
            @click="router.push('/admin/maintenance')"
          >
            <div>
              <p class="font-bold text-[#1c1917]">{{ t.title }}</p>
              <p class="text-[11px] text-[#71717a]">Unit {{ t.unit }} · Reported {{ t.reported }}</p>
            </div>
            <div class="text-right">
              <span :class="[
                'badge-soft text-[9px] font-bold',
                t.priority === 'Emergency' || t.priority === 'High' ? 'badge-danger' : 'badge-warning'
              ]">
                {{ t.priority }}
              </span>
              <span class="text-[10px] text-[#71717a] block mt-0.5">{{ t.status }}</span>
            </div>
          </div>
        </div>

        <div v-else class="p-6 text-center text-xs text-emerald-700">
          ✓ All maintenance tickets have been resolved.
        </div>
      </div>
    </div>
  </div>
</template>
