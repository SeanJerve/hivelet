<!--
  @file views/ExpensesLedgerView.vue
  @description Guided expenses entry form and historical ledger page for Hivelet website connected to live database.
  @systemBibleRef Section 3.3 - Billing & Income Collection Ledger
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/lib/api';
import { requestSecondaryConfirm, showToast } from '@/lib/systemState';
import { Plus, Download, Receipt, Trash2, ChevronLeft, ChevronRight, Calendar, Save } from 'lucide-vue-next';

// Tab state
const activeTab = ref<'record' | 'history'>('record');

// Shared lists from DB
const categoriesList = ref<any[]>([]);
const expenseEntries = ref<any[]>([]);
const loadingData = ref(false);

// Form state
const expenseDate = ref(new Date().toISOString().split('T')[0]);

interface SupplierItemInput {
  supplier: string;
  area: string;
  amount: number;
  categoryCode: string;
}

const supplierItems = ref<SupplierItemInput[]>([
  { supplier: '', area: 'BH', amount: 0, categoryCode: '8' }
]);

// Month and Year selection state for history ledger
const selectedMonth = ref(new Date().getMonth()); // 0-indexed
const selectedYear = ref(new Date().getFullYear());
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const years = [2025, 2026, 2027, 2028];

function addSupplierRow() {
  const defaultCatCode = categoriesList.value.length > 0 ? categoriesList.value[0].code : '8';
  supplierItems.value.push({ supplier: '', area: 'BH', amount: 0, categoryCode: defaultCatCode });
}

function removeSupplierRow(idx: number) {
  if (supplierItems.value.length > 1) {
    supplierItems.value.splice(idx, 1);
  }
}

async function loadData() {
  loadingData.value = true;
  try {
    const [categories, entries] = await Promise.all([
      api.get<any[]>('/admin/expense-categories'),
      api.get<any[]>('/admin/expense-entries')
    ]);
    categoriesList.value = categories;
    expenseEntries.value = entries;
    
    // Set default category codes for form
    if (categories.length > 0 && supplierItems.value[0].categoryCode === '8') {
      const initialCat = categories.find((c: any) => c.code === '8') || categories[0];
      supplierItems.value[0].categoryCode = initialCat.code;
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
  return expenseEntries.value.filter((rec) => {
    if (!rec.expense_date) return false;
    const recDate = new Date(rec.expense_date);
    return (
      recDate.getMonth() === selectedMonth.value &&
      recDate.getFullYear() === selectedYear.value
    );
  });
});

async function handleLogExpenses() {
  const invalid = supplierItems.value.some(i => !i.supplier.trim() || i.amount <= 0);
  if (invalid) {
    alert('Please ensure all items have valid supplier names and positive amounts.');
    return;
  }

  const totalSum = supplierItems.value.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  
  requestSecondaryConfirm({
    title: 'Review & Confirm Logged Expenses',
    message: `Please review your logged expense entries for date ${expenseDate.value} before logging into the ledger:`,
    warningLevel: 'info',
    requiresPin: true,
    confirmText: 'Confirm & Log Expenses',
    summaryFields: [
      { label: 'Expense Log Date', value: expenseDate.value },
      { label: 'Total Supplier Receipts', value: `${supplierItems.value.length} entry/entries` },
      { label: 'Total Expense Amount', value: `₱${totalSum.toLocaleString()}`, highlight: true }
    ],
    onConfirm: async () => {
      try {
        // Save each item as a separate monthly expense entry in the database
        await Promise.all(
          supplierItems.value.map(item => 
            api.post('/admin/expense-entries', {
              expenseDate: expenseDate.value,
              orSupplier: item.supplier.trim(),
              categoryCode: item.categoryCode,
              allocations: [
                { propertyArea: item.area, amount: item.amount }
              ]
            })
          )
        );

        showToast('success', 'Expenses Logged', `Logged ${supplierItems.value.length} expenses successfully.`);
        
        // Reset form
        const defaultCatCode = categoriesList.value.length > 0 ? categoriesList.value[0].code : '8';
        supplierItems.value = [{ supplier: '', area: 'BH', amount: 0, categoryCode: defaultCatCode }];
        
        // Reload data
        await loadData();
        activeTab.value = 'history';
      } catch (err: any) {
        alert(`Failed to save expenses: ${err.message}`);
      }
    }
  });
}

function handleDeleteExpense(id: string, supplier: string, amount: number) {
  requestSecondaryConfirm({
    title: 'Delete Logged Expense Entry',
    message: `Are you sure you want to delete expense "${supplier}" (₱${amount.toLocaleString()})? This action will adjust financial totals.`,
    warningLevel: 'danger',
    requiresPin: true,
    confirmText: 'Delete Expense Entry',
    onConfirm: async () => {
      try {
        await api.delete(`/admin/expense-entries/${id}`);
        showToast('warning', 'Expense Voided', `Expense entry has been voided successfully.`);
        await loadData();
      } catch (err: any) {
        alert(`Failed to void expense: ${err.message}`);
      }
    }
  });
}

function handleExport() {
  alert(`Exporting expenses report for ${months[selectedMonth.value]} ${selectedYear.value} to Excel...`);
}
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto w-full">
    <!-- Header with breadcrumbs and Tab Switcher -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Expenses & Accounts</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">
            {{ activeTab === 'record' ? 'Record Expense' : 'Expense History' }}
          </span>
        </div>
        <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">
          {{ activeTab === 'record' ? 'Record Property Expenses' : 'Guided Expenses Ledger' }}
        </h1>
        <p class="text-xs text-[#5e6c84]">
          {{ activeTab === 'record' ? 'Log supplier receipts, subcategory allocations, and operational costs' : 'View and manage all historical property expense entries' }}
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
          Record Expense
        </button>
        <button 
          @click="activeTab = 'history'"
          :class="[
            'px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer',
            activeTab === 'history' ? 'bg-white text-[#0c66e4] shadow-xs' : 'text-[#5e6c84] hover:text-[#172b4d]'
          ]"
        >
          Expense History
        </button>
      </div>
    </div>

    <!-- TAB 1: RECORD EXPENSE -->
    <div v-if="activeTab === 'record'" class="space-y-6">
      <div class="jira-card p-6 bg-white border border-[#dfe1e6] shadow-sm rounded-lg space-y-6">
        <div class="flex items-center gap-2 border-b border-[#f4f5f7] pb-3">
          <div class="w-8 h-8 rounded bg-[#e9f2ff] text-[#0c66e4] flex items-center justify-center">
            <Receipt class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-[#172b4d]">Expense Information Entry</h2>
            <p class="text-[10px] text-[#6b778c]">Input the supplier items below to save to ledger</p>
          </div>
        </div>

        <form @submit.prevent="handleLogExpenses" class="space-y-5 text-xs text-[#172b4d]">
          <!-- Date Row -->
          <div class="w-full sm:w-64">
            <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Expense Date</label>
            <input v-model="expenseDate" type="date" class="jira-input text-sm py-2" required />
          </div>

          <hr class="border-t border-[#dfe1e6]/50 my-2" />

          <!-- Supplier Items List -->
          <div class="space-y-4">
            <div 
              v-for="(item, idx) in supplierItems" 
              :key="idx" 
              class="relative p-4 bg-[#fafbfc] border border-[#dfe1e6] rounded-md grid grid-cols-1 sm:grid-cols-4 gap-4"
            >
              <!-- Close Row button if multiple rows exist -->
              <button 
                v-if="supplierItems.length > 1"
                type="button"
                @click="removeSupplierRow(idx)"
                class="absolute -top-2 -right-2 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm cursor-pointer"
                title="Remove Item"
              >
                ✕
              </button>

              <div>
                <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Supplier / Description</label>
                <input v-model="item.supplier" type="text" placeholder="e.g. Wilcon Depot" class="jira-input text-sm py-2" required />
              </div>

              <div>
                <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Property Area Allocation</label>
                <select v-model="item.area" class="jira-input text-sm py-2">
                  <option value="BH">BH (Main Rooms)</option>
                  <option value="MainHouse">Main House</option>
                  <option value="FrontApt">Front Apt</option>
                  <option value="BackApt">Back Apt</option>
                  <option value="Other">Other / Personal</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Expense Category</label>
                <select v-model="item.categoryCode" class="jira-input text-sm py-2">
                  <option v-for="cat in categoriesList" :key="cat.code" :value="cat.code">
                    {{ cat.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-[#5e6c84] mb-1.5 uppercase tracking-wider text-[10px]">Amount (₱)</label>
                <input v-model.number="item.amount" type="number" placeholder="0.00" class="jira-input text-sm py-2 font-bold" min="1" required />
              </div>
            </div>
          </div>

          <!-- Actions Row -->
          <div class="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#dfe1e6]/50">
            <button 
              type="button" 
              @click="addSupplierRow" 
              class="jira-btn-secondary text-xs flex items-center gap-1.5 bg-white border border-[#dfe1e6] hover:bg-[#ebecf0] px-4 py-2 font-semibold cursor-pointer"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Add Another Supplier Item</span>
            </button>

            <button 
              type="submit" 
              class="jira-btn-primary bg-[#0c66e4] hover:bg-[#0052cc] text-white text-sm py-2.5 px-6 flex items-center gap-2 shadow-sm font-semibold cursor-pointer"
            >
              <Save class="w-4 h-4" />
              <span>Record Logged Expenses</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- TAB 2: EXPENSE HISTORY -->
    <div v-if="activeTab === 'history'" class="space-y-6">
      <!-- Header Options Row -->
      <div class="flex justify-end">
        <button @click="handleExport" class="jira-btn-secondary text-xs flex items-center gap-1.5 bg-white border border-[#dfe1e6] hover:bg-[#ebecf0] px-3.5 py-2 font-semibold cursor-pointer">
          <Download class="w-3.5 h-3.5" />
          <span>Export Expenses Excel</span>
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
                <th class="p-2.5 px-3.5">Expense Date</th>
                <th class="p-2.5 px-3.5">OR / Supplier Description</th>
                <th class="p-2.5 px-3.5">Property Area</th>
                <th class="p-2.5 px-3.5">Expense Category</th>
                <th class="p-2.5 px-3.5">Amount</th>
                <th class="p-2.5 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
              <tr v-if="filteredLedger.length === 0">
                <td colspan="6" class="p-8 text-center text-gray-400 bg-gray-50/50">
                  No expense records logged for {{ months[selectedMonth] }} {{ selectedYear }}.
                </td>
              </tr>
              <tr v-for="rec in filteredLedger" :key="rec.id" v-else class="hover:bg-[#f7f8f9]">
                <td class="p-2.5 px-3.5 font-bold text-[#172b4d] font-subtle-num">{{ rec.expense_date }}</td>
                <td class="p-2.5 px-3.5 text-[#172b4d] font-semibold">{{ rec.or_supplier }}</td>
                <td class="p-2.5 px-3.5">
                  <span 
                    class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-800"
                    v-for="a in rec.expense_property_allocations" :key="a.id"
                  >
                    {{ a.property_area }}
                  </span>
                </td>
                <td class="p-2.5 px-3.5">
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">
                    {{ rec.fixed_expense_categories?.name || rec.category_code }}
                  </span>
                </td>
                <td class="p-2.5 px-3.5 font-semibold text-[#172b4d] font-subtle-num">₱{{ Number(rec.total_expenses).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</td>
                <td class="p-2.5 px-3.5 text-center">
                  <button 
                    @click="handleDeleteExpense(rec.id, rec.or_supplier, rec.total_expenses)"
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
