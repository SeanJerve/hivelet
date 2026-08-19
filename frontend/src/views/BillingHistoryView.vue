<!--
  @file views/BillingHistoryView.vue
  @description Sub-module displaying the historical income collection ledger for Fe Galang Da Silva Boarding House.
  @systemBibleRef Section 3.3 - Billing & Income Collection Ledger
  @rationale Separates history outputs from direct payment recording to save space and match professional corporate layout.
  @innovations Categorized month/year selector with step-navigation buttons, dynamic record filtering, and action callbacks.
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { incomeLedger, deleteIncomeRecord } from '@/lib/systemState';
import { Download, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-vue-next';

// Month and Year selection state
const currentDate = new Date();
const selectedMonth = ref(currentDate.getMonth()); // 0-indexed (0 = Jan)
const selectedYear = ref(currentDate.getFullYear());

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const years = [2025, 2026, 2027, 2028];

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
    selectedMonth.value -= 1;
  }
}

// Filtered ledger based on selected month & year of transaction
const filteredLedger = computed(() => {
  return incomeLedger.filter((rec) => {
    if (!rec.date) return false;
    const recDate = new Date(rec.date);
    return (
      recDate.getMonth() === selectedMonth.value &&
      recDate.getFullYear() === selectedYear.value
    );
  });
});

// Mock export excel
function handleExport() {
  alert(`Exporting collections report for ${months[selectedMonth.value]} ${selectedYear.value} to Excel...`);
}

function handleDelete(id?: string) {
  if (!id) return;
  if (confirm('Are you sure you want to delete this payment record from the ledger? This will affect financial summaries.')) {
    deleteIncomeRecord(id);
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Billing & Collections</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Collection History</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Collection History Ledger</h1>
        <p class="text-xs text-[#5e6c84]">View and manage all historical tenant unit payment records</p>
      </div>

      <button @click="handleExport" class="jira-btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto">
        <Download class="w-3.5 h-3.5" />
        <span>Export Excel Report</span>
      </button>
    </div>

    <!-- Month / Year Filter Controls -->
    <div class="jira-card p-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-xs">
        <Calendar class="w-4 h-4 text-[#0c66e4]" />
        <span class="font-bold text-[#5e6c84] uppercase">Filter Period:</span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Prev Month Button -->
        <button 
          @click="prevMonth"
          class="min-w-[32px] min-h-[32px] flex items-center justify-center border border-[#dfe1e6] hover:bg-[#ebecf0] rounded bg-white text-[#172b4d] transition-colors"
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
          class="min-w-[32px] min-h-[32px] flex items-center justify-center border border-[#dfe1e6] hover:bg-[#ebecf0] rounded bg-white text-[#172b4d] transition-colors"
          title="Next Month"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <div class="text-xs text-[#5e6c84]">
        Records found in period: <strong class="text-[#172b4d]">{{ filteredLedger.length }}</strong>
      </div>
    </div>

    <!-- History Table -->
    <div class="jira-card p-6 space-y-4">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border border-[#dfe1e6]">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2.5">Unit Code</th>
              <th class="p-2.5">Date Paid</th>
              <th class="p-2.5">Tenant Name</th>
              <th class="p-2.5">Invoice #</th>
              <th class="p-2.5">Rent Amount</th>
              <th class="p-2.5 text-center">Months Covered</th>
              <th class="p-2.5">Date Covered Range</th>
              <th class="p-2.5">Method</th>
              <th class="p-2.5">Ref #</th>
              <th class="p-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6]">
            <tr v-if="filteredLedger.length === 0">
              <td colspan="10" class="p-8 text-center text-gray-400 bg-gray-50/50">
                No payment records logged for {{ months[selectedMonth] }} {{ selectedYear }}.
              </td>
            </tr>
            <tr v-for="rec in filteredLedger" :key="rec.id" class="hover:bg-[#f4f5f7]">
              <td class="p-2.5 font-bold">Unit {{ rec.unit }}</td>
              <td class="p-2.5 text-[#172b4d]">{{ rec.date }}</td>
              <td class="p-2.5 text-[#172b4d] font-semibold">{{ rec.contact }}</td>
              <td class="p-2.5 font-mono text-[11px] text-[#5e6c84]">{{ rec.invoiceNum }}</td>
              <td class="p-2.5 font-semibold text-[#172b4d]">₱{{ rec.rent.toLocaleString() }}</td>
              <td class="p-2.5 text-center font-bold text-slate-700 bg-slate-50 border-x border-[#dfe1e6]/40">{{ rec.monthsCovered || 1 }} Mo.</td>
              <td class="p-2.5 font-medium">
                <span v-if="rec.dateCoveredStart && rec.dateCoveredEnd" class="text-emerald-700 font-mono text-[11px]">
                  {{ rec.dateCoveredStart }} to {{ rec.dateCoveredEnd }}
                </span>
                <span v-else class="text-gray-400 font-mono text-[11px]">N/A</span>
              </td>
              <td class="p-2.5">
                <span 
                  class="jira-badge"
                  :class="rec.paymentMethod === 'Online' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200'"
                >
                  {{ rec.paymentMethod }}
                </span>
              </td>
              <td class="p-2.5 font-mono text-[10px] text-[#6b778c]">{{ rec.referenceNum }}</td>
              <td class="p-2.5 text-center">
                <button 
                  @click="handleDelete(rec.id)"
                  class="p-1.5 hover:bg-[#ffebe6] text-[#ae2a19] hover:text-[#de350b] rounded transition-colors"
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
</template>
