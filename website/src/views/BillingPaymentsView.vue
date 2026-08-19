<!--
  @file views/BillingPaymentsView.vue
  @description Unified payment entry form and historical ledger page for Hivelet website connected to live database.
  @systemBibleRef Section 3.3 - Billing & Income Collection Ledger
-->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/lib/api';
import { requestSecondaryConfirm, showToast } from '@/lib/systemState';
import { CreditCard, ArrowRight, Save, Download, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-vue-next';

const route = useRoute();

// Tab state — defaults to 'record' unless query param ?tab=history is present
const activeTab = ref<'record' | 'history'>(route.query.tab === 'history' ? 'history' : 'record');

// Shared lists from DB
const roomsList = ref<any[]>([]);
const tenantsList = ref<any[]>([]);
const incomeRecords = ref<any[]>([]);
const loadingData = ref(false);

// Form state
const selectedUnitNum = ref('');
const datePaid = ref(new Date().toISOString().split('T')[0]);
const tenantName = ref('');
const invoiceNum = ref('');
const rentAmount = ref(4500);
const occupantsCount = ref(1);
const paymentMethod = ref<'Cash' | 'Online'>('Cash');
const referenceNum = ref('');

// Payment coverage dates
const monthsCovered = ref(1);
const dateCoveredStart = ref(new Date().toISOString().split('T')[0]);
const dateCoveredEnd = ref('');

// Month and Year selection state for history ledger
const selectedMonth = ref(new Date().getMonth()); // 0-indexed
const selectedYear = ref(new Date().getFullYear());
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const years = [2025, 2026, 2027, 2028];

// Synchronize dates initially and update end date
function updateEndDate() {
  if (!dateCoveredStart.value) return;
  const start = new Date(dateCoveredStart.value);
  start.setMonth(start.getMonth() + monthsCovered.value);
  dateCoveredEnd.value = start.toISOString().split('T')[0];
}

// Watch for datePaid changes to default the start date
watch(datePaid, (newDate) => {
  dateCoveredStart.value = newDate;
  updateEndDate();
}, { immediate: true });

// Watch monthsCovered or dateCoveredStart to update end date
watch([monthsCovered, dateCoveredStart], () => {
  updateEndDate();
});

// Auto-fill tenant details and calculate months covered based on rent entered
function onUnitChange(unitCode: string) {
  const room = roomsList.value.find(r => r.room_number === unitCode);
  if (room) {
    rentAmount.value = room.current_price;
    
    // Find active tenant for this room number
    const tenant = tenantsList.value.find(t => 
      t.room_assignments?.some((a: any) => a.is_active && a.rooms?.room_number === unitCode)
    );
    if (tenant) {
      tenantName.value = tenant.full_name;
      const assign = tenant.room_assignments?.find((a: any) => a.is_active && a.rooms?.room_number === unitCode);
      occupantsCount.value = assign?.occupant_count || 1;
    } else {
      tenantName.value = '';
      occupantsCount.value = 1;
    }
    
    // Reset date coverage to today
    dateCoveredStart.value = datePaid.value;
    monthsCovered.value = 1;
    updateEndDate();
  }
}

// Watch rentAmount to suggest months covered if multiple of the unit price
watch(rentAmount, (newAmount) => {
  const room = roomsList.value.find(r => r.room_number === selectedUnitNum.value);
  if (room && room.current_price > 0) {
    const suggested = Math.round(newAmount / room.current_price);
    if (suggested >= 1) {
      monthsCovered.value = suggested;
    }
  }
});

function handleDateChange() {
  if (!dateCoveredStart.value || !dateCoveredEnd.value) return;
  const start = new Date(dateCoveredStart.value);
  const end = new Date(dateCoveredEnd.value);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const suggested = Math.round(diffDays / 30.4);
  if (suggested >= 1) {
    monthsCovered.value = suggested;
  }
}

async function loadData() {
  loadingData.value = true;
  try {
    const [rooms, tenants, records] = await Promise.all([
      api.get<any[]>('/admin/rooms'),
      api.get<any[]>('/admin/tenants'),
      api.get<any[]>('/admin/income-records')
    ]);
    roomsList.value = rooms;
    tenantsList.value = tenants;
    incomeRecords.value = records;
    if (rooms.length > 0 && !selectedUnitNum.value) {
      selectedUnitNum.value = rooms[0].room_number;
      onUnitChange(rooms[0].room_number);
    }
  } catch (err: any) {
    console.error('Failed to load initial data:', err.message);
  } finally {
    loadingData.value = false;
  }
}

onMounted(() => {
  loadData();
});

// Navigate to previous month
function prevMonth() {
  if (selectedMonth.value === 0) {
    selectedMonth.value = 11;
    selectedYear.value -= 1;
  } else {
    selectedMonth.value -= 1;
  }
}

// Navigate to next month
function nextMonth() {
  if (selectedMonth.value === 11) {
    selectedMonth.value = 0;
    selectedYear.value += 1;
  } else {
    selectedMonth.value += 1;
  }
}

// Filtered ledger based on selected month & year
const filteredLedger = computed(() => {
  return incomeRecords.value.filter((rec) => {
    if (!rec.date_paid) return false;
    const recDate = new Date(rec.date_paid);
    return (
      recDate.getMonth() === selectedMonth.value &&
      recDate.getFullYear() === selectedYear.value
    );
  });
});

async function handleSubmit() {
  if (!selectedUnitNum.value) return;
  const calcWater = occupantsCount.value * 200;
  const calcShare = rentAmount.value / 2;
  const calcRemitted = rentAmount.value + calcWater;

  requestSecondaryConfirm({
    title: 'Review & Confirm Monthly Unit Payment',
    message: `Please review your payment entry details for Unit ${selectedUnitNum.value} before logging into the collection ledger:`,
    warningLevel: 'info',
    requiresPin: true,
    confirmText: 'Confirm & Log Payment',
    summaryFields: [
      { label: 'Target Unit / Room', value: `Unit ${selectedUnitNum.value}` },
      { label: 'Date Paid', value: datePaid.value },
      { label: 'Tenant Name', value: tenantName.value },
      { label: 'Invoice / Ref #', value: invoiceNum.value || 'N/A' },
      { label: 'Base Rent Amount', value: `₱${rentAmount.value.toLocaleString()}` },
      { label: 'Water Fee (₱200/head)', value: `₱${calcWater.toLocaleString()}` },
      { label: '50% Revenue Share', value: `₱${calcShare.toLocaleString()}` },
      { label: 'Total Remitted Amount', value: `₱${calcRemitted.toLocaleString()}`, highlight: true },
      { label: 'Payment Method', value: paymentMethod.value }
    ],
    onConfirm: async () => {
      try {
        await api.post('/admin/income-records', {
          roomNumber: selectedUnitNum.value,
          datePaid: datePaid.value,
          contactName: tenantName.value,
          invoiceNumber: invoiceNum.value || undefined,
          rentAmount: rentAmount.value,
          occupants: occupantsCount.value,
          paymentMethod: paymentMethod.value,
          transactionReference: paymentMethod.value === 'Online' ? referenceNum.value || undefined : undefined,
          monthsCovered: monthsCovered.value,
          dateCoveredStart: dateCoveredStart.value,
          dateCoveredEnd: dateCoveredEnd.value
        });

        showToast('success', 'Payment Logged', `Unit payment for Unit ${selectedUnitNum.value} logged successfully.`);
        
        // Reset form
        invoiceNum.value = '';
        referenceNum.value = '';
        
        // Reload data
        await loadData();
        activeTab.value = 'history';
      } catch (err: any) {
        alert(`Failed to save payment: ${err.message}`);
      }
    }
  });
}

function handleDelete(id: string, refNum: string, amount: number) {
  requestSecondaryConfirm({
    title: 'Delete Recorded Payment Entry',
    message: `Are you sure you want to permanently delete payment invoice ${refNum} (₱${amount.toLocaleString()})? This action will adjust financial totals.`,
    warningLevel: 'danger',
    requiresPin: true,
    confirmText: 'Delete Payment Entry',
    onConfirm: async () => {
      try {
        await api.delete(`/admin/income-records/${id}`);
        showToast('warning', 'Payment Voided', `Payment entry has been voided successfully.`);
        await loadData();
      } catch (err: any) {
        alert(`Failed to void payment: ${err.message}`);
      }
    }
  });
}

function handleExport() {
  alert(`Exporting collections report for ${months[selectedMonth.value]} ${selectedYear.value} to Excel...`);
}
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto w-full">
    <!-- Header with breadcrumbs and Tab Switcher -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Billing & Collections</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">
            {{ activeTab === 'record' ? 'Record Payment' : 'Collection History' }}
          </span>
        </div>
        <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">
          {{ activeTab === 'record' ? 'Record Unit Payment' : 'Collection History Ledger' }}
        </h1>
        <p class="text-xs text-[#5e6c84]">
          {{ activeTab === 'record' ? 'Log monthly tenant room rents, water billings, and payment coverages' : 'View and manage all historical tenant unit payment records' }}
        </p>
      </div>

      <!-- Tab Buttons -->
      <div class="flex items-center bg-[#f4f5f7] p-1 border border-[#dfe1e6] rounded-md gap-1 self-start sm:self-auto w-fit">
        <button 
          @click="activeTab = 'record'"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer',
            activeTab === 'record' ? 'bg-white text-[#0c66e4] shadow-xs' : 'text-[#5e6c84] hover:text-[#172b4d]'
          ]"
        >
          Record Payment
        </button>
        <button 
          @click="activeTab = 'history'"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer',
            activeTab === 'history' ? 'bg-white text-[#0c66e4] shadow-xs' : 'text-[#5e6c84] hover:text-[#172b4d]'
          ]"
        >
          Collection History
        </button>
      </div>
    </div>

    <!-- TAB 1: RECORD UNIT PAYMENT -->
    <div v-if="activeTab === 'record'" class="space-y-6">
      <div class="jira-card p-6 bg-white border border-[#dfe1e6] shadow-sm rounded-lg space-y-6">
        <div class="flex items-center gap-2 border-b border-[#f4f5f7] pb-3">
          <div class="w-8 h-8 rounded bg-[#e9f2ff] text-[#0c66e4] flex items-center justify-center">
            <CreditCard class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#172b4d]">Payment Information Entry</h2>
            <p class="text-[10px] text-[#6b778c]">Input the remittance details below to save to ledger</p>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5 text-xs text-[#172b4d]">
          <!-- Row 1: Select Unit, Date Paid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Select Rentable Unit</label>
              <select v-model="selectedUnitNum" @change="onUnitChange(($event.target as HTMLSelectElement).value)" class="jira-input text-sm py-2">
                <option v-for="r in roomsList" :key="r.id" :value="r.room_number">
                  Unit {{ r.room_number }} ({{ r.clusters?.name || r.cluster_code }}) - {{ r.operational_status }}
                </option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Date Logged / Paid</label>
              <input v-model="datePaid" type="date" class="jira-input text-sm py-2" required />
            </div>
          </div>

          <!-- Row 2: Tenant Name, Invoice Ref -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Tenant Name Reference</label>
              <input v-model="tenantName" type="text" placeholder="e.g. Active Resident" class="jira-input text-sm py-2" required />
            </div>
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Invoice Receipt / Official Reference #</label>
              <input v-model="invoiceNum" type="text" placeholder="e.g. OR-994112" class="jira-input text-sm py-2" />
            </div>
          </div>

          <hr class="border-t border-[#dfe1e6]/50 my-2" />

          <!-- Row 3: Rent Amount, Occupants, Payment Mode -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Base Rent Paid (₱)</label>
              <input v-model.number="rentAmount" type="number" placeholder="4500" class="jira-input text-sm py-2 font-bold" required />
            </div>
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Active Occupants Count</label>
              <input v-model.number="occupantsCount" type="number" placeholder="1" class="jira-input text-sm py-2" min="1" required />
            </div>
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Payment Mode</label>
              <select v-model="paymentMethod" class="jira-input text-sm py-2">
                <option value="Cash">Cash Remittance</option>
                <option value="Online">Online Payment (GCash)</option>
              </select>
            </div>
          </div>

          <div v-if="paymentMethod === 'Online'" class="grid grid-cols-1 gap-4">
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">GCash Transaction Reference ID</label>
              <input v-model="referenceNum" type="text" placeholder="e.g. GCASH-99182741" class="jira-input text-sm py-2 font-mono" required />
            </div>
          </div>

          <hr class="border-t border-[#dfe1e6]/50 my-2" />

          <!-- Row 4: Months Covered & Date Covered Range -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Months Covered Selection</label>
              <select v-model.number="monthsCovered" class="jira-input text-sm py-2 font-bold text-slate-700">
                <option :value="1">1 Month Coverage</option>
                <option :value="2">2 Months Coverage</option>
                <option :value="3">3 Months Coverage</option>
                <option :value="6">6 Months Coverage</option>
                <option :value="12">12 Months (1 Year)</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Date Covered Duration</label>
              <div class="flex items-center gap-2">
                <input v-model="dateCoveredStart" type="date" class="jira-input text-sm py-2" required />
                <span class="text-[#6b778c]"><ArrowRight class="w-4 h-4 shrink-0" /></span>
                <input v-model="dateCoveredEnd" type="date" @change="handleDateChange" class="jira-input text-sm py-2" required />
              </div>
            </div>
          </div>

          <!-- Submit Button Row -->
          <div class="pt-4 flex justify-end">
            <button type="submit" class="jira-btn-primary bg-[#0c66e4] hover:bg-[#0052cc] text-white text-sm py-2.5 px-6 flex items-center gap-2 shadow-sm font-semibold cursor-pointer">
              <Save class="w-4 h-4" />
              <span>Record Unit Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- TAB 2: COLLECTION HISTORY LEDGER -->
    <div v-if="activeTab === 'history'" class="space-y-6">
      <!-- Header Options Row -->
      <div class="flex justify-end">
        <button @click="handleExport" class="jira-btn-secondary text-xs flex items-center gap-1.5 bg-white border border-[#dfe1e6] hover:bg-[#ebecf0] px-3.5 py-2 font-semibold cursor-pointer">
          <Download class="w-3.5 h-3.5" />
          <span>Export Excel Report</span>
        </button>
      </div>

      <!-- Month / Year Filter Controls -->
      <div class="jira-card p-4 bg-white border border-[#dfe1e6] rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-xs">
          <Calendar class="w-4 h-4 text-[#0c66e4]" />
          <span class="font-bold text-[#5e6c84] uppercase">Filter Period:</span>
        </div>

        <div class="flex items-center gap-2">
          <!-- Prev Month Button -->
          <button 
            @click="prevMonth"
            class="min-w-[32px] min-h-[32px] flex items-center justify-center border border-[#dfe1e6] hover:bg-[#ebecf0] rounded bg-white text-[#172b4d] transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <!-- Month Dropdown -->
          <select v-model.number="selectedMonth" class="jira-input font-bold text-xs py-1.5 px-3 min-w-[120px]">
            <option v-for="(m, idx) in months" :key="idx" :value="idx">{{ m }}</option>
          </select>

          <!-- Year Dropdown -->
          <select v-model.number="selectedYear" class="jira-input font-bold text-xs py-1.5 px-3 min-w-[80px]">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>

          <!-- Next Month Button -->
          <button 
            @click="nextMonth"
            class="min-w-[32px] min-h-[32px] flex items-center justify-center border border-[#dfe1e6] hover:bg-[#ebecf0] rounded bg-white text-[#172b4d] transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div class="text-xs text-[#5e6c84] font-bold">
          Records found in period: <span class="text-[#172b4d] font-black text-sm">{{ filteredLedger.length }}</span>
        </div>
      </div>

      <!-- History Table -->
      <div class="jira-card overflow-hidden bg-white border border-[#dfe1e6] rounded-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
              <tr>
                <th class="p-2.5 px-3.5">Unit Code</th>
                <th class="p-2.5 px-3.5">Date Paid</th>
                <th class="p-2.5 px-3.5">Tenant Name</th>
                <th class="p-2.5 px-3.5">Invoice #</th>
                <th class="p-2.5 px-3.5">Rent Amount</th>
                <th class="p-2.5 px-3.5 text-center">Months Covered</th>
                <th class="p-2.5 px-3.5">Date Covered Range</th>
                <th class="p-2.5 px-3.5">Method</th>
                <th class="p-2.5 px-3.5">Ref #</th>
                <th class="p-2.5 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
              <tr v-if="filteredLedger.length === 0">
                <td colspan="10" class="p-8 text-center text-gray-400 bg-gray-50/50">
                  No payment records logged for {{ months[selectedMonth] }} {{ selectedYear }}.
                </td>
              </tr>
              <tr v-for="rec in filteredLedger" :key="rec.id" v-else class="hover:bg-[#f7f8f9]">
                <td class="p-2.5 px-3.5 font-bold text-[#172b4d]">
                  {{ rec.rooms?.room_number ? 'Unit ' + rec.rooms.room_number : 'Unit ' + rec.room_id }}
                </td>
                <td class="p-2.5 px-3.5 text-[#172b4d] font-subtle-num">{{ rec.date_paid }}</td>
                <td class="p-2.5 px-3.5 text-[#172b4d] font-semibold">{{ rec.contact_name }}</td>
                <td class="p-2.5 px-3.5 font-mono text-[11px] text-[#5e6c84]">{{ rec.invoice_number || 'N/A' }}</td>
                <td class="p-2.5 px-3.5 font-semibold text-[#172b4d] font-subtle-num">₱{{ Number(rec.rent_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                <td class="p-2.5 px-3.5 text-center font-bold text-slate-700 bg-slate-50 border-x border-[#dfe1e6]/40">{{ Math.round((new Date(rec.rent_period_end).getTime() - new Date(rec.rent_period_start).getTime()) / (1000 * 60 * 60 * 24 * 30)) || 1 }} Mo.</td>
                <td class="p-2.5 px-3.5 font-medium">
                  <span v-if="rec.rent_period_start && rec.rent_period_end" class="text-emerald-700 font-mono text-[11px]">
                    {{ rec.rent_period_start }} to {{ rec.rent_period_end }}
                  </span>
                  <span v-else class="text-gray-400 font-mono text-[11px]">N/A</span>
                </td>
                <td class="p-2.5 px-3.5">
                  <span 
                    class="px-2 py-0.5 text-[10px] font-bold rounded"
                    :class="rec.payment_method === 'Online' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'"
                  >
                    {{ rec.payment_method.toUpperCase() }}
                  </span>
                </td>
                <td class="p-2.5 px-3.5 font-mono text-[10px] text-[#6b778c]">{{ rec.transaction_reference || 'N/A' }}</td>
                <td class="p-2.5 px-3.5 text-center">
                  <button 
                    @click="handleDelete(rec.id, rec.invoice_number || 'Ledger', rec.remitted_amount)"
                    class="p-1.5 hover:bg-[#ffebe6] text-[#ae2a19] hover:text-[#de350b] rounded transition-colors cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
