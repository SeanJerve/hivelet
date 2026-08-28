<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { expenseRecords, fetchExpenseRecords, EXPENSE_CATEGORIES, showToast, type ExpenseRecord } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Plus, Search, ReceiptText, X, RefreshCw, Loader2, Calendar, Download, Pencil, Trash2, ChevronDown } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';

interface ApiExpense {
  id: string;
  expense_date: string;
  or_supplier: string;
  category_code: string;
  total_expenses: number;
  expense_property_allocations?: { property_area: string; amount: number }[];
}

interface ApiCat {
  code: string;
  name: string;
  display_order: number;
}

interface FormExpenseAllocation {
  area: 'Boarding House' | 'Main House' | 'Front Apt' | 'Back Apt' | 'Other';
  amount: string;
}

interface FormExpenseEntry {
  desc: string;
  category: string;
  allocations: FormExpenseAllocation[];
}

const q = ref('');
const selectedCategory = ref('All');
const isAddOpen = ref(false);
const isLoading = ref(false);
const isSubmitting = ref(false);
const dbCategories = ref<ApiCat[]>([]);

// Filter selectors
const filterMonth = ref('All');
const filterYear = ref('All');

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

const yearsList = ['All', '2026', '2025', '2024'];

// New Expense Form Entries (At least one default entry)
const date = ref(new Date().toISOString().split('T')[0]);
const formEntries = ref<FormExpenseEntry[]>([
  {
    desc: '',
    category: EXPENSE_CATEGORIES[0],
    allocations: [
      { area: 'Boarding House', amount: '' }
    ]
  }
]);

function addFormEntry() {
  formEntries.value.push({
    desc: '',
    category: EXPENSE_CATEGORIES[0],
    allocations: [
      { area: 'Boarding House', amount: '' }
    ]
  });
}

function removeFormEntry(index: number) {
  if (formEntries.value.length > 1) {
    formEntries.value.splice(index, 1);
  }
}

function addAllocation(entryIndex: number) {
  formEntries.value[entryIndex].allocations.push({
    area: 'Boarding House',
    amount: ''
  });
}

function removeAllocation(entryIndex: number, allocIndex: number) {
  const entry = formEntries.value[entryIndex];
  if (entry.allocations.length > 1) {
    entry.allocations.splice(allocIndex, 1);
  }
}

// Convert DB code to frontend category string
function getFrontendCategory(code: string): string {
  const cleanCode = code.startsWith('6') ? '6' : code;
  const match = EXPENSE_CATEGORIES.find(c => c.startsWith(`${cleanCode} —`));
  return match || "10 — Others";
}

// Convert frontend category string to DB code
function getDbCategoryCode(catStr: string): string {
  const code = catStr.split(' —')[0]?.trim();
  return code || '10';
}

// Normalize Date into "MMM DD, YYYY" for grouping consistency
function formatDateForDisplay(dateVal: string | Date): string {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

async function fetchExpenses() {
  isLoading.value = true;
  try {
    const [, catData] = await Promise.all([
      fetchExpenseRecords(),
      api.get<ApiCat[]>('/admin/expense-categories').catch(() => [])
    ]);

    if (catData && catData.length) {
      dbCategories.value = catData;
    }
  } catch (err) {
    console.error('fetchExpenses failed:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchExpenses();
});

const filtered = computed(() => {
  return expenseRecords.filter((e) => {
    const query = q.value.toLowerCase().trim();
    const matchesQ =
      !query ||
      e.description.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query);
    const matchesCat = selectedCategory.value === 'All' || e.category === selectedCategory.value;

    const dateParts = e.date.split(' ');
    const monthPart = dateParts[0]; 
    const yearPart = dateParts[2];  

    const matchesMonth = filterMonth.value === 'All' || monthPart === filterMonth.value;
    const matchesYear = filterYear.value === 'All' || yearPart === filterYear.value;

    return matchesQ && matchesCat && matchesMonth && matchesYear;
  });
});

// Group filtered expenses by Date
const groupedExpenses = computed(() => {
  const groups: Record<string, ExpenseRecord[]> = {};
  
  filtered.value.forEach((e) => {
    const key = e.date;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(e);
  });
  
  return Object.entries(groups).map(([dateStr, records]) => {
    const dayTotal = records.reduce((sum, r) => sum + getExpenseTotal(r), 0);
    const dateObj = new Date(dateStr);
    return {
      dateStr,
      dateObj,
      records,
      dayTotal
    };
  }).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
});

const totalJuly = computed(() =>
  filtered.value.reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

const utilitiesTotal = computed(() =>
  filtered.value
    .filter((e) => e.category.toLowerCase().includes('water') || e.category.toLowerCase().includes('light') || e.category.toLowerCase().includes('util'))
    .reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

const repairsTotal = computed(() =>
  filtered.value
    .filter((e) => e.category.toLowerCase().includes('repair') || e.category.toLowerCase().includes('janitorial') || e.category.toLowerCase().includes('suppl'))
    .reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

function getExpenseTotal(e: ExpenseRecord) {
  return e.splits.reduce((s, x) => s + x.amount, 0);
}

function submitAddExpense() {
  const invalid = formEntries.value.some(entry => {
    if (!entry.desc.trim()) return true;
    return entry.allocations.some(a => !a.amount || Number(a.amount) <= 0);
  });
  if (invalid) {
    showToast('error', 'Validation Error', 'Please fill in a description and positive amount for all item allocations.');
    return;
  }

  const confirmMsg = `Are you sure you want to record these ${formEntries.value.length} expense entries for ${formatDateForDisplay(date.value)}?`;
  showConfirm(
    'Confirm Expense Entries',
    confirmMsg,
    async () => {
      isSubmitting.value = true;
      try {
        const areaMap: Record<string, string> = {
          'Boarding House': 'Boarding House',
          'Main House': 'Main House',
          'Front Apt': 'Front Apartment',
          'Back Apt': 'Back Apartment',
          'Other': 'Other Expenses / Personal'
        };

        // Save each item individually
        await Promise.all(
          formEntries.value.map(async (entry) => {
            try {
              await api.post('/admin/expense-entries', {
                expenseDate: date.value,
                orSupplier: entry.desc.trim(),
                categoryCode: getDbCategoryCode(entry.category),
                allocations: entry.allocations.map(a => ({
                  propertyArea: areaMap[a.area] || 'Boarding House',
                  amount: Number(a.amount) || 0
                }))
              });
            } catch (err) {
              console.warn('API save failed, relying on local sync:', err);
            }
          })
        );

        // Save locally
        formEntries.value.forEach((entry, idx) => {
          const newEntry: ExpenseRecord = {
            id: `EXP-NEW-${Date.now()}-${idx}`,
            date: formatDateForDisplay(date.value),
            description: entry.desc.trim(),
            category: entry.category,
            splits: entry.allocations.map(a => ({
              area: a.area,
              amount: Number(a.amount) || 0
            })),
          };
          expenseRecords.unshift(newEntry);
        });

        isAddOpen.value = false;
        const count = formEntries.value.length;

        // Reset entries form list
        formEntries.value = [
          {
            desc: '',
            category: EXPENSE_CATEGORIES[0],
            allocations: [
              { area: 'Boarding House', amount: '' }
            ]
          }
        ];

        showToast('success', 'Expenses recorded', `Successfully saved ${count} entries.`);
      } catch (err: any) {
        showToast('error', 'Submission failed', err.message || 'Server error occurred');
      } finally {
        isSubmitting.value = false;
      }
    }
  );
}

// Helper to get split amount for a specific area
function getAreaAmount(e: ExpenseRecord, areaName: 'Boarding House' | 'Main House'): number {
  const match = e.splits.find(s => s.area === areaName);
  return match ? match.amount : 0;
}

// Helper to get sum of splits for Apts & Other
function getAptsOtherAmount(e: ExpenseRecord): number {
  return e.splits
    .filter(s => s.area === 'Front Apt' || s.area === 'Back Apt' || s.area === 'Other')
    .reduce((sum, s) => sum + s.amount, 0);
}

// Custom Confirmation State
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

// Edit Expense State
const isEditOpen = ref(false);
const editingExpense = ref<ExpenseRecord | null>(null);
const editDate = ref('');
const editDesc = ref('');
const editCategory = ref('');
const editAllocations = ref<{
  area: 'Boarding House' | 'Main House' | 'Front Apt' | 'Back Apt' | 'Other';
  amount: string;
}[]>([]);

function addEditAllocation() {
  editAllocations.value.push({
    area: 'Boarding House',
    amount: ''
  });
}

function removeEditAllocation(allocIndex: number) {
  if (editAllocations.value.length > 1) {
    editAllocations.value.splice(allocIndex, 1);
  }
}

function startEditExpense(e: ExpenseRecord) {
  editingExpense.value = e;
  const d = new Date(e.date);
  if (!isNaN(d.getTime())) {
    editDate.value = d.toISOString().split('T')[0];
  } else {
    editDate.value = new Date().toISOString().split('T')[0];
  }
  editDesc.value = e.description;
  editCategory.value = e.category;
  editAllocations.value = e.splits.map(s => ({
    area: s.area,
    amount: String(s.amount)
  }));
  isEditOpen.value = true;
}

function handleDeleteFromEditModal() {
  if (!editingExpense.value) return;
  const id = editingExpense.value.id;
  const desc = editingExpense.value.description;
  isEditOpen.value = false;
  handleDeleteExpense(id, desc);
}

function handleDeleteExpense(id: string, description: string) {
  showConfirm(
    'Void Expense Record',
    `Are you sure you want to delete the expense "${description}"? This action is permanent and will adjust financial reports.`,
    async () => {
      try {
        await api.delete(`/admin/expense-entries/${id}`);
        const index = expenseRecords.findIndex(e => e.id === id);
        if (index !== -1) {
          expenseRecords.splice(index, 1);
        }
        showToast('success', 'Expense deleted', `Voided "${description}" successfully.`);
      } catch (err: any) {
        showToast('error', 'Delete failed', err.message || 'Server error occurred');
      }
    }
  );
}

async function handleEditExpense() {
  if (!editingExpense.value) return;
  const invalid = editAllocations.value.some(a => !a.amount || Number(a.amount) <= 0);
  if (!editDesc.value.trim() || invalid) {
    showToast('error', 'Validation Error', 'Please enter a description and positive amount for all allocations.');
    return;
  }

  isSubmitting.value = true;
  try {
    const oldId = editingExpense.value.id;
    const oldDesc = editingExpense.value.description;
    
    const areaMap: Record<string, string> = {
      'Boarding House': 'Boarding House',
      'Main House': 'Main House',
      'Front Apt': 'Front Apartment',
      'Back Apt': 'Back Apartment',
      'Other': 'Other Expenses / Personal'
    };

    const payload = {
      expenseDate: editDate.value,
      orSupplier: editDesc.value.trim(),
      categoryCode: getDbCategoryCode(editCategory.value),
      allocations: editAllocations.value.map(a => ({
        propertyArea: areaMap[a.area] || 'Boarding House',
        amount: Number(a.amount) || 0
      }))
    };

    if (oldId && !oldId.startsWith('EXP-') && !oldId.startsWith('EXP-NEW-')) {
      await api.patch(`/admin/expense-entries/${oldId}`, payload);
    } else {
      await api.post('/admin/expense-entries', payload);
    }

    await fetchExpenseRecords();

    isEditOpen.value = false;
    editingExpense.value = null;
    showToast('success', 'Expense updated', `Updated "${editDesc.value.trim()}" successfully.`);
  } catch (err: any) {
    showToast('error', 'Update failed', err.message || 'Server error occurred');
  } finally {
    isSubmitting.value = false;
  }
}

// CSV export function
function exportFilteredExpenses() {
  const headers = [
    'Date', 
    'Description / Voucher', 
    'Category', 
    'Boarding House Split (PHP)', 
    'Main House Split (PHP)', 
    'Apts & Other Split (PHP)', 
    'Total (PHP)'
  ];
  const csvRows = [headers.join(',')];
  
  // Sort chronologically ascending
  const sortedRecords = [...filtered.value].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  });

  // Group rows by month
  const groups: { monthKey: string; records: typeof filtered.value }[] = [];
  
  sortedRecords.forEach(e => {
    const d = new Date(e.date);
    let monthKey = 'Unknown Month';
    if (!isNaN(d.getTime())) {
      monthKey = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    let group = groups.find(g => g.monthKey === monthKey);
    if (!group) {
      group = { monthKey, records: [] };
      groups.push(group);
    }
    group.records.push(e);
  });

  groups.forEach((g, gIdx) => {
    // 3 blank rows before subsequent months
    if (gIdx > 0) {
      csvRows.push(',,,,,,');
      csvRows.push(',,,,,,');
      csvRows.push(',,,,,,');
    }

    // Month header row
    csvRows.push([`"** ${g.monthKey.toUpperCase()} **"`, '', '', '', '', '', ''].join(','));

    // Records
    g.records.forEach(e => {
      const dateStr = `"${e.date.replace(/"/g, '""')}"`;
      const descStr = `"${e.description.replace(/"/g, '""')}"`;
      const catStr = `"${e.category.replace(/"/g, '""')}"`;
      const bhAmt = getAreaAmount(e, 'Boarding House') || '';
      const mhAmt = getAreaAmount(e, 'Main House') || '';
      const aptsOtherAmt = getAptsOtherAmount(e) || '';
      const totalVal = getExpenseTotal(e);
      
      csvRows.push([dateStr, descStr, catStr, bhAmt, mhAmt, aptsOtherAmt, totalVal].join(','));
    });

    // Monthly Subtotal row
    const bhSubtotal = g.records.reduce((sum, e) => sum + getAreaAmount(e, 'Boarding House'), 0);
    const mhSubtotal = g.records.reduce((sum, e) => sum + getAreaAmount(e, 'Main House'), 0);
    const aptsOtherSubtotal = g.records.reduce((sum, e) => sum + getAptsOtherAmount(e), 0);
    const totalSubtotal = g.records.reduce((sum, e) => sum + getExpenseTotal(e), 0);
    
    csvRows.push([
      `"SUBTOTAL (${g.monthKey.toUpperCase()})"`,
      '',
      '',
      bhSubtotal,
      mhSubtotal,
      aptsOtherSubtotal,
      totalSubtotal
    ].join(','));
  });

  // Yearly Grand Totals
  const bhGrand = filtered.value.reduce((sum, e) => sum + getAreaAmount(e, 'Boarding House'), 0);
  const mhGrand = filtered.value.reduce((sum, e) => sum + getAreaAmount(e, 'Main House'), 0);
  const aptsOtherGrand = filtered.value.reduce((sum, e) => sum + getAptsOtherAmount(e), 0);
  const totalGrand = filtered.value.reduce((sum, e) => sum + getExpenseTotal(e), 0);
  
  csvRows.push(',,,,,,');
  csvRows.push([
    '"GRAND YEARLY TOTALS"',
    '',
    '',
    bhGrand,
    mhGrand,
    aptsOtherGrand,
    totalGrand
  ].join(','));
  
  // Use Blob with \uFEFF BOM to ensure Excel opens it as UTF-8
  const csvContent = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  const monthName = filterMonth.value === 'All' ? 'All-Months' : filterMonth.value;
  const yearName = filterYear.value === 'All' ? 'All-Years' : filterYear.value;
  
  link.setAttribute("href", url);
  link.setAttribute("download", `hivelet_expenses_${monthName}_${yearName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('success', 'Export Successful', `CSV exported for ${monthName} ${yearName}`);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Breadcrumbs & Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#71717a] mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-bold text-[#1c1917]">Monthly Expenses</span>
        </div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Monthly Operating Expenses
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Property disbursements categorized and allocated by property area.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <button
          @click="fetchExpenses"
          :disabled="isLoading"
          class="btn-secondary"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="exportFilteredExpenses"
          class="btn-secondary"
          title="Export CSV"
        >
          <Download class="size-3.5 text-[#71717a]" />
          <span>Export Excel CSV</span>
        </button>

        <button 
          @click="isAddOpen = true"
          class="btn-primary"
        >
          <Plus class="size-3.5 text-white" />
          <span>Record Expense</span>
        </button>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Total Operating Expenses</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ peso(totalJuly) }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Disbursed in selected period</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Utilities Subtotal</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ peso(utilitiesTotal) }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Water District, Power &amp; Fuel</p>
      </div>

      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Repairs &amp; Janitorial</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ peso(repairsTotal) }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Plumbing, fixtures &amp; cleaning</p>
      </div>
    </div>

    <!-- Table Section -->
    <div class="surface-card overflow-hidden">
      <!-- Filter Bar -->
      <div class="flex flex-col gap-3 border-b border-[#e7e5e4] p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <input
            v-model="q"
            type="text"
            placeholder="Search description, receipt # or category…"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors"
          />
        </div>

        <select
          v-model="selectedCategory"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm font-semibold text-[#1c1917] focus:border-[#0c66e4] focus:outline-none sm:w-48 cursor-pointer"
        >
          <option value="All">All Categories</option>
          <option v-for="c in EXPENSE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>

        <select
          v-model="filterMonth"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm font-semibold text-[#1c1917] focus:border-[#0c66e4] focus:outline-none sm:w-36 cursor-pointer"
        >
          <option v-for="m in monthsList" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>

        <select
          v-model="filterYear"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-4 text-xs sm:text-sm font-semibold text-[#1c1917] focus:border-[#0c66e4] focus:outline-none sm:w-28 cursor-pointer"
        >
          <option v-for="y in yearsList" :key="y" :value="y">{{ y === 'All' ? 'All Years' : y }}</option>
        </select>
      </div>

      <!-- SKELETON LOADING STATE -->
      <div v-if="isLoading" class="p-4">
        <SkeletonTable :columns="7" :rows="6" />
      </div>

      <div v-else class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[900px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4] border-b border-[#e7e5e4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a]">
              <th class="whitespace-nowrap px-4 py-3 font-bold pl-6">DESCRIPTION / VOUCHER</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">CATEGORY</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-right">BOARDING HOUSE (₱)</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-right">MAIN HOUSE (₱)</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-right">APTS &amp; OTHER (₱)</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-right">TOTAL (₱)</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-center">ACTIONS</th>
            </tr>
          </thead>
          
          <tbody v-if="groupedExpenses.length === 0">
            <tr>
              <td colspan="7" class="p-8 text-center text-[#71717a] bg-white">
                No expense entries found matching the criteria.
              </td>
            </tr>
          </tbody>

          <tbody v-for="group in groupedExpenses" :key="group.dateStr" v-else>
            <!-- Date Group Header -->
            <tr class="bg-[#fafaf9] border-y border-[#e7e5e4]">
              <td colspan="6" class="px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#71717a] pl-6">
                {{ group.dateStr }}
              </td>
              <td class="tabular px-4 py-2.5 text-right text-xs font-black text-[#1c1917]">
                Daily: {{ peso(group.dayTotal) }}
              </td>
            </tr>
            <!-- Individual Expense Records -->
            <tr 
              v-for="e in group.records" 
              :key="e.id"
              class="border-b border-[#e7e5e4] last:border-b-0 hover:bg-[#fafaf9] transition-colors"
            >
              <td class="px-4 py-3.5 font-semibold text-[#1c1917] pl-6">{{ e.description }}</td>
              <td class="whitespace-nowrap px-4 py-3.5 text-xs text-[#71717a]">{{ e.category }}</td>
              
              <!-- Boarding House Split -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-medium text-[#1c1917]">
                {{ getAreaAmount(e, 'Boarding House') ? peso(getAreaAmount(e, 'Boarding House')) : '—' }}
              </td>
              
              <!-- Main House Split -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-medium text-[#1c1917]">
                {{ getAreaAmount(e, 'Main House') ? peso(getAreaAmount(e, 'Main House')) : '—' }}
              </td>
              
              <!-- Apts & Other Split -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-medium text-[#1c1917]">
                {{ getAptsOtherAmount(e) ? peso(getAptsOtherAmount(e)) : '—' }}
              </td>
              
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-display font-bold text-[#1c1917]">
                {{ peso(getExpenseTotal(e)) }}
              </td>
              
              <td class="whitespace-nowrap px-4 py-3.5 text-center">
                <button 
                  @click="startEditExpense(e)" 
                  class="btn-secondary min-h-8 px-2.5 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer hover:border-[#0c66e4] hover:text-[#0c66e4]"
                  title="Edit Expense"
                >
                  <Pencil class="size-3.5" />
                  <span>Edit</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Record Expense Modal (Supports Multiple Entries) -->
    <div 
      v-if="isAddOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="isAddOpen = false"
    >
      <div class="surface-card w-full max-w-2xl shadow-2xl overflow-hidden rounded-2xl bg-white border border-[#e7e5e4] animate-in fade-in zoom-in-95 duration-150 my-6">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 pb-4 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200 flex items-center justify-center">
              <ReceiptText class="size-5" />
            </div>
            <div>
              <h3 class="font-display font-extrabold text-lg text-[#1c1917]">
                Record Operating Expenses
              </h3>
              <p class="text-xs text-[#71717a]">Batch record property expenses and area cost splits</p>
            </div>
          </div>
          <button @click="isAddOpen = false" class="p-1.5 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer" aria-label="Close modal">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="submitAddExpense">
          <div class="p-6 space-y-4 text-xs text-[#1c1917] max-h-[70vh] overflow-y-auto">
            <!-- Date Field -->
            <div class="w-full sm:w-64">
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">Expense Date</label>
              <input v-model="date" type="date" class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-xs text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors" required />
            </div>

            <!-- Dynamic Entries List -->
            <div class="space-y-4">
              <div 
                v-for="(entry, index) in formEntries" 
                :key="index" 
                class="relative p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-2xl space-y-3"
              >
                <!-- Header with Item Index and Remove Item Button -->
                <div class="flex items-center justify-between pb-2 border-b border-[#e7e5e4]/70">
                  <span class="font-display font-extrabold text-xs text-[#1c1917]">
                    Expense Item #{{ index + 1 }}
                  </span>
                  <button 
                    v-if="formEntries.length > 1" 
                    type="button" 
                    @click="removeFormEntry(index)" 
                    class="btn-secondary text-rose-600 hover:bg-rose-50 hover:border-rose-200 min-h-7 py-0.5 px-2 text-[11px] gap-1 inline-flex items-center cursor-pointer"
                    title="Remove Item"
                  >
                    <Trash2 class="size-3 text-rose-500" />
                    <span>Remove Item</span>
                  </button>
                </div>

                <!-- Description & Category Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-bold text-[10px] uppercase tracking-wider text-[#71717a] mb-1.5">Description &amp; Receipt #</label>
                    <input 
                      v-model="entry.desc" 
                      placeholder="e.g. OR #88240 — supplies" 
                      class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-white px-3.5 text-xs text-[#1c1917] focus:border-[#0c66e4] focus:outline-none transition-colors" 
                      required 
                    />
                  </div>

                  <div>
                    <label class="block font-bold text-[10px] uppercase tracking-wider text-[#71717a] mb-1.5">Expense Category</label>
                    <select 
                      v-model="entry.category" 
                      class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-white px-3.5 text-xs font-medium text-[#1c1917] focus:border-[#0c66e4] focus:outline-none transition-colors cursor-pointer" 
                      required
                    >
                      <option v-for="c in EXPENSE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </div>
                </div>

                <!-- Allocations / Splits Section -->
                <div class="border-t border-[#e7e5e4]/70 pt-3 space-y-2.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Property Area Allocations (Splits)</span>
                    <span class="text-[10px] text-[#71717a]">Cost distribution</span>
                  </div>
                  
                  <div class="space-y-2">
                    <div 
                      v-for="(alloc, aIdx) in entry.allocations" 
                      :key="aIdx" 
                      class="flex items-center gap-3 bg-white p-3 border border-[#e7e5e4] rounded-xl shadow-2xs"
                    >
                      <!-- Area Selector -->
                      <div class="flex-1">
                        <label class="block text-[10px] font-bold text-[#71717a] uppercase mb-1">Target Area</label>
                        <select 
                          v-model="alloc.area" 
                          class="min-h-10 w-full px-3 border border-[#e7e5e4] rounded-lg text-xs bg-[#fafaf9] text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none" 
                          required
                        >
                          <option value="Boarding House">Boarding House</option>
                          <option value="Main House">Main House</option>
                          <option value="Front Apt">Front Apt</option>
                          <option value="Back Apt">Back Apt</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <!-- Amount -->
                      <div class="w-36 sm:w-44">
                        <label class="block text-[10px] font-bold text-[#71717a] uppercase mb-1">Amount (₱)</label>
                        <input 
                          v-model="alloc.amount" 
                          type="number" 
                          placeholder="0.00" 
                          min="0"
                          step="any"
                          class="min-h-10 w-full px-3 border border-[#e7e5e4] rounded-lg text-xs font-bold text-[#1c1917] bg-[#fafaf9] focus:bg-white focus:border-[#0c66e4] focus:outline-none tabular" 
                          required 
                        />
                      </div>

                      <!-- Delete split button -->
                      <div class="self-end pb-0.5">
                        <button 
                          v-if="entry.allocations.length > 1" 
                          type="button" 
                          @click="removeAllocation(index, aIdx)" 
                          class="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Remove Area"
                        >
                          <Trash2 class="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Add Split Area button -->
                  <div class="pt-1">
                    <button 
                      type="button" 
                      @click="addAllocation(index)" 
                      class="btn-secondary text-xs min-h-9 px-3 py-1.5 gap-1.5 inline-flex items-center cursor-pointer"
                    >
                      <Plus class="size-3.5 text-[#0c66e4]" />
                      <span>Split across another area</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add Another Item Button -->
            <div>
              <button 
                type="button" 
                @click="addFormEntry" 
                class="btn-secondary min-h-10 text-xs px-3.5 py-2 gap-1.5 inline-flex items-center cursor-pointer"
              >
                <Plus class="size-4 text-[#0c66e4]" />
                <span>Add Another Expense Item</span>
              </button>
            </div>
          </div>

          <!-- Modal Actions Footer -->
          <div class="p-4 px-6 border-t border-[#e7e5e4] flex items-center justify-end gap-2 bg-[#fafaf9]">
            <button type="button" @click="isAddOpen = false" class="btn-secondary cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary cursor-pointer disabled:opacity-50 min-w-[110px]">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
              <span>Save Entries</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Expense Modal -->
    <div 
      v-if="isEditOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="isEditOpen = false"
    >
      <div class="surface-card w-full max-w-2xl shadow-2xl overflow-hidden rounded-2xl bg-white border border-[#e7e5e4] animate-in fade-in zoom-in-95 duration-150 my-6">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 pb-4 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200 flex items-center justify-center">
              <ReceiptText class="size-5" />
            </div>
            <div>
              <h3 class="font-display font-extrabold text-lg text-[#1c1917]">
                Edit Operating Expense
              </h3>
              <p class="text-xs text-[#71717a]">Update expense classification and property area cost splits</p>
            </div>
          </div>
          <button @click="isEditOpen = false" class="p-1.5 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer" aria-label="Close dialog">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleEditExpense">
          <div class="p-6 space-y-4 text-xs text-[#1c1917] max-h-[70vh] overflow-y-auto">
            <!-- Date Field -->
            <div class="w-full sm:w-64">
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
                Expense Date
              </label>
              <input 
                v-model="editDate" 
                type="date" 
                class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-xs text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors" 
                required 
              />
            </div>

            <!-- Description & Category Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
                  Description &amp; Receipt #
                </label>
                <input 
                  v-model="editDesc" 
                  placeholder="e.g. OR #88240 — supplies" 
                  class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-xs text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors" 
                  required 
                />
              </div>

              <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1.5">
                  Expense Category
                </label>
                <select 
                  v-model="editCategory" 
                  class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-xs font-medium text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors cursor-pointer" 
                  required
                >
                  <option v-for="c in EXPENSE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <!-- Allocations / Splits Section -->
            <div class="space-y-3 pt-2">
              <div class="flex items-center justify-between">
                <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a]">
                  Property Area Allocations (Splits)
                </label>
                <span class="text-[10px] text-[#71717a]">Distribute cost across boarding house &amp; main house</span>
              </div>

              <div class="space-y-2">
                <div 
                  v-for="(alloc, aIdx) in editAllocations" 
                  :key="aIdx" 
                  class="flex items-center gap-3 bg-[#fafaf9] p-3 border border-[#e7e5e4] rounded-xl"
                >
                  <!-- Area Selector -->
                  <div class="flex-1">
                    <label class="block text-[10px] font-bold text-[#71717a] uppercase mb-1">Target Area</label>
                    <select 
                      v-model="alloc.area" 
                      class="min-h-10 w-full px-3 border border-[#e7e5e4] rounded-lg text-xs bg-white text-[#1c1917] focus:border-[#0c66e4] focus:outline-none cursor-pointer" 
                      required
                    >
                      <option value="Boarding House">Boarding House</option>
                      <option value="Main House">Main House</option>
                      <option value="Front Apt">Front Apt</option>
                      <option value="Back Apt">Back Apt</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <!-- Amount -->
                  <div class="w-36 sm:w-44">
                    <label class="block text-[10px] font-bold text-[#71717a] uppercase mb-1">Amount (₱)</label>
                    <input 
                      v-model="alloc.amount" 
                      type="number" 
                      placeholder="0.00" 
                      min="0"
                      step="any"
                      class="min-h-10 w-full px-3 border border-[#e7e5e4] rounded-lg text-xs font-bold text-[#1c1917] bg-white focus:border-[#0c66e4] focus:outline-none tabular" 
                      required 
                    />
                  </div>

                  <!-- Delete split button -->
                  <div class="self-end pb-0.5">
                    <button 
                      v-if="editAllocations.length > 1" 
                      type="button" 
                      @click="removeEditAllocation(aIdx)" 
                      class="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      title="Remove Area Split"
                    >
                      <Trash2 class="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Add Split Area button -->
              <div class="pt-1">
                <button 
                  type="button" 
                  @click="addEditAllocation" 
                  class="btn-secondary text-xs min-h-9 px-3 py-1.5 gap-1.5 inline-flex items-center cursor-pointer"
                >
                  <Plus class="size-3.5 text-[#0c66e4]" />
                  <span>Split across another area</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Actions Footer: Delete on the left, Cancel/Save on the right -->
          <div class="p-4 px-6 border-t border-[#e7e5e4] flex items-center justify-between gap-3 bg-[#fafaf9]">
            <button
              v-if="editingExpense"
              type="button"
              @click="handleDeleteFromEditModal"
              class="btn-secondary text-rose-600 hover:bg-rose-50 hover:border-rose-200 min-h-10 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center cursor-pointer"
            >
              <Trash2 class="size-3.5 text-rose-500" />
              <span>Delete Expense</span>
            </button>
            <div v-else />

            <div class="flex items-center gap-2">
              <button type="button" @click="isEditOpen = false" class="btn-secondary cursor-pointer">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="btn-primary cursor-pointer disabled:opacity-50 min-w-[110px]">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
                <span>Update Entry</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div 
      v-if="isConfirmOpen" 
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isConfirmOpen = false"
    >
      <div class="surface-card w-full max-w-sm shadow-2xl rounded-2xl p-6 bg-white space-y-4 text-center border border-[#e7e5e4]">
        <div class="flex flex-col items-center gap-3">
          <div class="size-12 rounded-xl bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200 flex items-center justify-center">
            <ReceiptText class="size-6" />
          </div>
          <h3 class="font-display font-extrabold text-base text-[#1c1917]">{{ confirmTitle }}</h3>
          <p class="text-xs text-[#71717a] leading-relaxed">{{ confirmMessage }}</p>
        </div>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button 
            type="button" 
            @click="isConfirmOpen = false" 
            class="btn-secondary cursor-pointer min-w-[100px]"
          >
            Cancel
          </button>
          <button 
            type="button" 
            @click="handleConfirmAccept" 
            class="btn-primary cursor-pointer min-w-[100px]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
