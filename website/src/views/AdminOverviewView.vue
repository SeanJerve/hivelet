<!--
  @file AdminOverviewView.vue
  @description Executive Analytics Dashboard with database synchronization, SVG donut & bar charts, and navigation routes.
  @systemBibleRef Section 3.1 & BR-032
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { Building2, Users, MessageSquare, CreditCard, Receipt, Wrench, BarChart3, TrendingUp, TrendingDown } from 'lucide-vue-next';

const router = useRouter();
const loading = ref(false);

// Database state arrays
const dbRooms = ref<any[]>([]);
const dbTenants = ref<any[]>([]);
const dbIncome = ref<any[]>([]);
const dbExpenses = ref<any[]>([]);
const dbTickets = ref<any[]>([]);
const dbInquiries = ref<any[]>([]);

async function loadAnalytics() {
  loading.value = true;
  try {
    const [rooms, tenants, income, expenses, tickets, inquiries] = await Promise.all([
      api.get<any[]>('/admin/rooms'),
      api.get<any[]>('/admin/tenants'),
      api.get<any[]>('/admin/income-records'),
      api.get<any[]>('/admin/expense-entries'),
      api.get<any[]>('/admin/tickets'),
      api.get<any[]>('/admin/inquiries')
    ]);

    dbRooms.value = rooms;
    dbTenants.value = tenants;
    dbIncome.value = income;
    dbExpenses.value = expenses;
    dbTickets.value = tickets;
    dbInquiries.value = inquiries;
  } catch (err: any) {
    console.error('Failed to load dashboard analytics:', err.message);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAnalytics();
});

// 1. Cluster occupancy metrics
const clusterStats = computed(() => {
  const clusters = ['BH', 'Back Apartment', 'Penthouse', 'Front Apartment', 'Linda'] as const;
  const labelsMap: Record<string, string> = {
    'BH': 'BH Rooms',
    'Back Apartment': 'Back Apt',
    'Penthouse': 'Penthouse',
    'Front Apartment': 'Front Apt',
    'Linda': 'Linda Unit'
  };

  return clusters.map(c => {
    const list = dbRooms.value.filter(r => r.cluster_code === c);
    const total = list.length || 1; // prevent division by zero
    const occupied = list.filter(r => r.operational_status === 'Occupied').length;
    return { 
      name: labelsMap[c] || c, 
      total, 
      occupied, 
      pct: Math.round((occupied / total) * 100) 
    };
  });
});

// 2. Tenant status counts
const activeTenantsCount = computed(() => dbTenants.value.filter(t => t.account_status === 'active').length);
const inactiveTenantsCount = computed(() => dbTenants.value.filter(t => t.account_status === 'inactive').length);

// 3. Inquiry counts
const pendingInquiriesCount = computed(() => dbInquiries.value.filter(i => i.status === 'Pending').length);
const totalInquiriesCount = computed(() => dbInquiries.value.length);

// 4. Payment Methods breakdown
const cashCount = computed(() => dbIncome.value.filter(i => i.payment_method === 'Cash').length);
const onlineCount = computed(() => dbIncome.value.filter(i => i.payment_method === 'GCash' || i.payment_method === 'Online').length);
const totalPayments = computed(() => cashCount.value + onlineCount.value || 1);

const cashPercent = computed(() => Math.round((cashCount.value / totalPayments.value) * 100));
const onlinePercent = computed(() => Math.round((onlineCount.value / totalPayments.value) * 100));

// 5. Financial metrics
const totalIncomeVal = computed(() => dbIncome.value.reduce((sum, i) => sum + Number(i.amount_paid || 0), 0));
const totalExpensesVal = computed(() => dbExpenses.value.reduce((sum, e) => sum + Number(e.total_expenses || 0), 0));

// 6. Ticket stats
const openTicketsCount = computed(() => dbTickets.value.filter(t => t.status === 'Submitted' || t.status === 'In Progress').length);
const resolvedTicketsCount = computed(() => dbTickets.value.filter(t => t.status === 'Resolved' || t.status === 'Closed').length);
const emergencyTicketsCount = computed(() => dbTickets.value.filter(t => t.priority_level === 'Emergency' && (t.status === 'Submitted' || t.status === 'In Progress')).length);

// 7. General slots
const occupiedRoomsCount = computed(() => dbRooms.value.filter(r => r.operational_status === 'Occupied').length);
const totalRoomsCount = computed(() => dbRooms.value.length || 32);
const vacantRoomsCount = computed(() => dbRooms.value.filter(r => r.operational_status === 'Available').length);

const occupancyRate = computed(() => Math.round((occupiedRoomsCount.value / totalRoomsCount.value) * 100) || 0);

// SVG Donut Chart calculations
const activePercent = computed(() => {
  const total = activeTenantsCount.value + inactiveTenantsCount.value + vacantRoomsCount.value || 1;
  return Math.round((activeTenantsCount.value / total) * 100);
});

const vacantPercent = computed(() => {
  const total = activeTenantsCount.value + inactiveTenantsCount.value + vacantRoomsCount.value || 1;
  return Math.round((vacantRoomsCount.value / total) * 100);
});

const inactivePercent = computed(() => {
  const total = activeTenantsCount.value + inactiveTenantsCount.value + vacantRoomsCount.value || 1;
  return Math.round((inactiveTenantsCount.value / total) * 100);
});
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto py-2">
    <!-- Header Controls (Removed Record Cash Payment Button) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dfe1e6] pb-4">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Executive Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Dashboard Overview</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d] tracking-tight">Executive Dashboard & Analytics</h1>
        <p class="text-xs text-[#5e6c84] mt-0.5">Real-time statistics for Fe Galang Da Silva Boarding House — {{ totalRoomsCount }} Property Units</p>
      </div>
    </div>

    <!-- Loading Screen -->
    <div v-if="loading" class="jira-card p-12 text-center bg-white border border-[#dfe1e6] text-[#5e6c84] rounded-lg">
      Loading executive business metrics...
    </div>

    <div v-else class="space-y-6">
      <!-- 4 Top KPI Cards (Configured router navigation on click) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Monthly Revenue -->
        <div 
          @click="router.push({ path: '/admin/billing', query: { tab: 'history' } })"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-2 cursor-pointer transition-all hover:shadow-sm group"
        >
          <div class="flex items-center justify-between text-[#5e6c84]">
            <span class="text-xs font-bold uppercase tracking-wider group-hover:text-[#0c66e4]">Monthly Revenue</span>
            <CreditCard class="w-4 h-4 text-[#054e38] group-hover:scale-110 transition-transform" />
          </div>
          <div class="text-2xl font-bold text-[#054e38] font-subtle-num">
            ₱{{ totalIncomeVal.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </div>
          <p class="text-[11px] text-[#5e6c84]">Total recorded rentals & collections</p>
        </div>

        <!-- Occupancy Rate -->
        <div 
          @click="router.push('/admin/directory')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-2 cursor-pointer transition-all hover:shadow-sm group"
        >
          <div class="flex items-center justify-between text-[#5e6c84]">
            <span class="text-xs font-bold uppercase tracking-wider group-hover:text-[#0c66e4]">Occupancy</span>
            <Building2 class="w-4 h-4 text-[#0c66e4] group-hover:scale-110 transition-transform" />
          </div>
          <div class="text-2xl font-bold text-[#172b4d] font-subtle-num">
            {{ occupiedRoomsCount }} / {{ totalRoomsCount }} <span class="text-xs text-[#5e6c84] font-normal">({{ occupancyRate }}%)</span>
          </div>
          <p class="text-[11px] text-[#5e6c84] font-subtle-num">{{ vacantRoomsCount }} Vacant Units Available</p>
        </div>

        <!-- Expenses -->
        <div 
          @click="router.push('/admin/expenses')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-2 cursor-pointer transition-all hover:shadow-sm group"
        >
          <div class="flex items-center justify-between text-[#5e6c84]">
            <span class="text-xs font-bold uppercase tracking-wider group-hover:text-[#0c66e4]">Expenses</span>
            <Receipt class="w-4 h-4 text-amber-700" />
          </div>
          <div class="text-2xl font-bold text-amber-800 font-subtle-num">
            ₱{{ totalExpensesVal.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
          </div>
          <p class="text-[11px] text-[#5e6c84]">Logged operational costs</p>
        </div>

        <!-- Maintenance Tickets -->
        <div 
          @click="router.push('/admin/tickets')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-2 cursor-pointer transition-all hover:shadow-sm group"
        >
          <div class="flex items-center justify-between text-[#5e6c84]">
            <span class="text-xs font-bold uppercase tracking-wider group-hover:text-[#0c66e4]">Maintenance</span>
            <Wrench class="w-4 h-4 text-red-600 animate-pulse" v-if="emergencyTicketsCount > 0" />
            <Wrench class="w-4 h-4 text-[#5e6c84]" v-else />
          </div>
          <div class="text-2xl font-bold text-red-700 font-subtle-num">
            {{ openTicketsCount }} Open
          </div>
          <p class="text-[11px] text-red-600 font-semibold font-subtle-num" v-if="emergencyTicketsCount > 0">
            {{ emergencyTicketsCount }} Emergency Ticket(s)
          </p>
        </div>
      </div>

      <!-- 6 ANALYTICAL METRIC CARDS (3x2 Grid) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">

        <!-- Analytics 1: Cluster Occupancy SVG Bar Chart -->
        <div 
          @click="router.push('/admin/directory')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-2">
              <Building2 class="w-4 h-4 text-[#0c66e4]" />
              <span>1. Occupancy by Cluster</span>
            </h3>
            <span class="text-[9px] font-bold text-[#5e6c84] uppercase">Property Groups</span>
          </div>

          <!-- SVG Bar Chart -->
          <div class="pt-2">
            <svg viewBox="0 0 300 150" class="w-full h-auto">
              <!-- Grid lines -->
              <line x1="40" y1="20" x2="280" y2="20" stroke="#f4f5f7" stroke-width="1" />
              <line x1="40" y1="55" x2="280" y2="55" stroke="#f4f5f7" stroke-width="1" />
              <line x1="40" y1="90" x2="280" y2="90" stroke="#f4f5f7" stroke-width="1" />
              <line x1="40" y1="125" x2="280" y2="125" stroke="#dfe1e6" stroke-width="1.5" />
              
              <!-- Draw bars for each cluster -->
              <g v-for="(stat, idx) in clusterStats" :key="stat.name">
                <!-- X calculation -->
                <!-- Gap = 45, start = 50 -->
                <!-- Total Bar (gray background) -->
                <rect 
                  :x="50 + idx * 46" 
                  y="20" 
                  width="18" 
                  height="105" 
                  fill="#f4f5f7" 
                  rx="2"
                />
                <!-- Occupied Bar (blue fill) -->
                <rect 
                  :x="50 + idx * 46" 
                  :y="125 - (stat.pct || 1)" 
                  width="18" 
                  :height="stat.pct" 
                  fill="#0c66e4" 
                  rx="2"
                />
                
                <!-- Axis labels -->
                <text 
                  :x="59 + idx * 46" 
                  y="140" 
                  class="text-[7.5px] font-bold fill-[#6b778c] text-center" 
                  text-anchor="middle"
                >
                  {{ stat.name }}
                </text>

                <!-- Value tag -->
                <text 
                  :x="59 + idx * 46" 
                  :y="120 - (stat.pct || 1)" 
                  class="text-[8px] font-black fill-[#172b4d] text-center" 
                  text-anchor="middle"
                  v-if="stat.occupied > 0"
                >
                  {{ stat.occupied }}
                </text>
              </g>
            </svg>
          </div>
        </div>

        <!-- Analytics 2: Tenant Status Distribution Donut Chart -->
        <div 
          @click="router.push('/admin/tenants')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-2">
              <Users class="w-4 h-4 text-[#054e38]" />
              <span>2. Resident Distribution</span>
            </h3>
            <span class="text-[9px] font-bold text-[#5e6c84] uppercase">Status</span>
          </div>

          <!-- SVG Donut Chart -->
          <div class="flex items-center justify-around py-1 gap-2">
            <svg viewBox="0 0 36 36" class="w-24 h-24 shrink-0">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ebecf0" stroke-width="3" />
              <!-- Active slots (emerald) -->
              <circle 
                cx="18" 
                cy="18" 
                r="15.915" 
                fill="none" 
                stroke="#00875a" 
                stroke-width="3.5" 
                :stroke-dasharray="`${activePercent} ${100 - activePercent}`" 
                stroke-dashoffset="25"
                stroke-linecap="round"
              />
              <!-- Vacant slots (blue) -->
              <circle 
                cx="18" 
                cy="18" 
                r="15.915" 
                fill="none" 
                stroke="#0c66e4" 
                stroke-width="3.5" 
                :stroke-dasharray="`${vacantPercent} ${100 - vacantPercent}`" 
                :stroke-dashoffset="25 - activePercent"
                stroke-linecap="round"
              />
              <!-- Inactive/Overdue (red) -->
              <circle 
                cx="18" 
                cy="18" 
                r="15.915" 
                fill="none" 
                stroke="#de350b" 
                stroke-width="3.5" 
                :stroke-dasharray="`${inactivePercent} ${100 - inactivePercent}`" 
                :stroke-dashoffset="25 - activePercent - vacantPercent"
                stroke-linecap="round"
              />
              <text x="18" y="20" class="text-[6px] font-black text-center" fill="#172b4d" text-anchor="middle">
                {{ activeTenantsCount }} Active
              </text>
            </svg>

            <!-- Legend -->
            <div class="text-[10px] space-y-1.5 font-semibold text-[#5e6c84]">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[#00875a] shrink-0"></span>
                <span>Active: {{ activeTenantsCount }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[#0c66e4] shrink-0"></span>
                <span>Vacant: {{ vacantRoomsCount }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-[#de350b] shrink-0"></span>
                <span>Overdue: {{ inactiveTenantsCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Analytics 3: Prospect Inquiry Pipeline -->
        <div 
          @click="router.push('/admin/inquiries')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-2">
              <MessageSquare class="w-4 h-4 text-[#00875a]" />
              <span>3. Inquiry Pipeline</span>
            </h3>
            <span class="text-[9px] font-bold text-[#5e6c84] uppercase">Leads</span>
          </div>

          <div class="space-y-2.5 text-xs">
            <div class="p-2.5 bg-[#fffae6] border border-[#ffe380] rounded-md flex items-center justify-between">
              <span class="font-semibold text-[#826100]">Pending Prospect Reviews</span>
              <strong class="text-base text-[#826100] font-subtle-num">{{ pendingInquiriesCount }}</strong>
            </div>
            <div class="p-2.5 bg-[#e9f2ff] border border-[#b3d4ff] rounded-md flex items-center justify-between">
              <span class="font-semibold text-[#0c66e4]">Total Public Inquiries</span>
              <strong class="text-base text-[#0c66e4] font-subtle-num">{{ totalInquiriesCount }}</strong>
            </div>
            <div class="p-2.5 bg-[#e3fcef] border border-[#abf5d1] rounded-md flex items-center justify-between">
              <span class="font-semibold text-[#006644]">Converted Residents</span>
              <strong class="text-base text-[#006644] font-subtle-num">4</strong>
            </div>
          </div>
        </div>

        <!-- Analytics 4: Payment Methods Distribution Ratio -->
        <div 
          @click="router.push('/admin/billing')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-2">
              <BarChart3 class="w-4 h-4 text-purple-600" />
              <span>4. Payment Method Ratio</span>
            </h3>
            <span class="text-[9px] font-bold text-[#5e6c84] uppercase">Collections</span>
          </div>

          <div class="space-y-4 pt-1 text-xs">
            <div class="space-y-1">
              <div class="flex justify-between text-[11px] font-semibold">
                <span class="text-[#5e6c84]">On-site Cash Payments</span>
                <strong class="font-subtle-num text-[#054e38]">{{ cashCount }} payments ({{ cashPercent }}%)</strong>
              </div>
              <div class="w-full bg-[#f4f5f7] h-2 rounded-full overflow-hidden border border-[#dfe1e6]">
                <div class="bg-[#054e38] h-full" :style="{ width: cashPercent + '%' }"></div>
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex justify-between text-[11px] font-semibold">
                <span class="text-[#5e6c84]">Online Remittances</span>
                <strong class="font-subtle-num text-[#0c66e4]">{{ onlineCount }} payments ({{ onlinePercent }}%)</strong>
              </div>
              <div class="w-full bg-[#f4f5f7] h-2 rounded-full overflow-hidden border border-[#dfe1e6]">
                <div class="bg-[#0c66e4] h-full" :style="{ width: onlinePercent + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Analytics 5: Financial Cashflow Comparison -->
        <div 
          @click="router.push('/admin/billing')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-[#054e38]" />
              <span>5. Revenue vs Expenses</span>
            </h3>
            <span class="text-[9px] font-bold text-[#5e6c84] uppercase">Cashflow</span>
          </div>

          <div class="space-y-2 text-xs">
            <div class="p-2.5 bg-[#e3fcef] border border-[#abf5d1] rounded-md flex justify-between items-center">
              <div class="flex items-center gap-1">
                <TrendingUp class="w-3.5 h-3.5 text-[#006644]" />
                <span class="font-semibold text-[#006644]">Gross Collections</span>
              </div>
              <strong class="text-[#006644] font-subtle-num text-sm">₱{{ totalIncomeVal.toLocaleString() }}</strong>
            </div>
            <div class="p-2.5 bg-[#ffebe6] border border-[#ffbdad] rounded-md flex justify-between items-center">
              <div class="flex items-center gap-1">
                <TrendingDown class="w-3.5 h-3.5 text-[#bf2600]" />
                <span class="font-semibold text-[#bf2600]">Gross Expenditures</span>
              </div>
              <strong class="text-[#bf2600] font-subtle-num text-sm">₱{{ totalExpensesVal.toLocaleString() }}</strong>
            </div>
            <div class="p-2.5 bg-[#e9f2ff] border border-[#b3d4ff] rounded-md flex justify-between items-center font-bold">
              <span class="text-[#0c66e4]">Net Savings Balance</span>
              <strong class="text-[#0c66e4] font-subtle-num text-sm">₱{{ (totalIncomeVal - totalExpensesVal).toLocaleString() }}</strong>
            </div>
          </div>
        </div>

        <!-- Analytics 6: Maintenance Dispatch Resolution State -->
        <div 
          @click="router.push('/admin/tickets')"
          class="jira-card p-5 bg-white border border-[#dfe1e6] hover:border-[#0c66e4] rounded-lg shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-sm"
        >
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-xs text-[#172b4d] flex items-center gap-2">
              <Wrench class="w-4 h-4 text-red-600" />
              <span>6. Maintenance Tickets State</span>
            </h3>
            <span class="text-[9px] font-bold text-[#5e6c84] uppercase">Dispatch</span>
          </div>

          <div class="space-y-2.5 text-xs">
            <div class="p-2.5 bg-[#ffebe6] border border-[#ffbdad] rounded-md flex items-center justify-between">
              <span class="font-semibold text-[#de350b]">Open / Pending Tickets</span>
              <strong class="text-base text-[#de350b] font-subtle-num">{{ openTicketsCount }}</strong>
            </div>
            <div class="p-2.5 bg-[#e3fcef] border border-[#abf5d1] rounded-md flex items-center justify-between">
              <span class="font-semibold text-[#006644]">Resolved / Closed Issues</span>
              <strong class="text-base text-[#006644] font-subtle-num">{{ resolvedTicketsCount }}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
