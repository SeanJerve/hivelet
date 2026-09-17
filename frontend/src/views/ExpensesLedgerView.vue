<script setup lang="ts">
import { propertyToday, propertyDate } from '@/lib/propertyDate';
import { ref, computed, onMounted } from 'vue';
import { expenseRecords, expenseRecordsFetchFailed, fetchExpenseRecords, EXPENSE_CATEGORIES, PROPERTY_AREA_OPTIONS, showToast, type ExpenseRecord, type PropertyArea } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api, API_BASE, getStoredToken } from '@/lib/api';
import { Plus, Search, ReceiptText, X, RefreshCw, Loader2, Calendar, Download, FileSpreadsheet, Pencil, Trash2, ChevronDown } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import OverviewTile from '@/components/overview/OverviewTile.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import SegmentBar from '@/components/overview/SegmentBar.vue';
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
  area: PropertyArea;
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

/**
 * The Monthly Expenses Report as a real spreadsheet. BR-049.
 *
 * The CSV beside this one is a flat dump. This is her layout: a month block per
 * month, the Property Area columns totalled at the bottom, the category summary
 * down the right with a running cumulative, and a line stating whether the two
 * sides reconcile - which is BR-047, and the check she does by eye today.
 *
 * Fetched rather than linked, because the endpoint needs the bearer token.
 */
const isExportingExcel = ref(false);

async function exportExpensesExcel() {
  if (isExportingExcel.value) return;
  isExportingExcel.value = true;
  // A per-year report, so "All Years" falls back to this year rather than
  // silently exporting one of them.
  const year = filterYear.value !== 'All' ? filterYear.value : String(new Date().getFullYear());
  try {
    const res = await fetch(`${API_BASE}/admin/reports/expenses.xlsx?year=${year}`, {
      headers: { Authorization: `Bearer ${getStoredToken() ?? ''}` },
    });
    if (!res.ok) throw new Error(`The report could not be generated (HTTP ${res.status}).`);
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `hivelet-expenses-${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('success', 'Report downloaded', `Monthly Expenses Report for ${year}.`);
  } catch (err: any) {
    showToast('error', 'Export failed', err?.message || 'The report could not be generated.');
  } finally {
    isExportingExcel.value = false;
  }
}

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
// The property's today, not UTC's - see lib/propertyDate.
const date = ref(propertyToday());
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

/**
 * Where the filtered money actually went. Every entry is allocated across the
 * five property areas (BR-044), and those allocations add up to the entry's
 * face value, so this is a true part-to-whole and can be drawn as one bar.
 */
const areaSplit = computed(() => {
  const totals = new Map<string, number>();
  for (const e of filtered.value) {
    for (const s of e.splits) {
      totals.set(s.area, (totals.get(s.area) ?? 0) + s.amount);
    }
  }
  const tones = ['brand', 'bright', 'night', 'soft', 'hatch'] as const;
  return [...totals.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, tone: tones[i % tones.length] }));
});

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

        /**
         * Every entry must reach the ledger, and the ones that did not must be
         * named.
         *
         * Each POST used to be wrapped in its own catch that logged "API save
         * failed, relying on local sync" and carried on. All the entries were
         * then pushed into local state under fabricated ids
         * (`EXP-NEW-<timestamp>-<n>`) and a toast reported "Successfully saved N
         * entries" - N being the number typed, not the number saved. Expenses
         * that never reached the database sat on screen looking recorded until
         * the next refresh silently removed them.
         */
        const results = await Promise.allSettled(
          formEntries.value.map((entry) =>
            api.post('/admin/expense-entries', {
              expenseDate: date.value,
              orSupplier: entry.desc.trim(),
              categoryCode: getDbCategoryCode(entry.category),
              allocations: entry.allocations.map(a => ({
                propertyArea: a.area,
                amount: Number(a.amount) || 0
              }))
            })
          )
        );

        const failed = results
          .map((r, i) => (r.status === 'rejected' ? formEntries.value[i].desc.trim() || `entry ${i + 1}` : null))
          .filter((x): x is string => x !== null);

        const count = results.length - failed.length;

        if (failed.length > 0) {
          showToast(
            'error',
            count > 0 ? 'Some expenses were not saved' : 'Expenses not saved',
            `${failed.length} of ${results.length} could not be recorded: ${failed.join(', ')}. ` +
            'They are still in the form - please try again.'
          );
        }

        if (count === 0) {
          return;
        }

        // Only what the ledger accepted. The refetch below replaces these rows
        // with the server's own, ids included.
        formEntries.value.forEach((entry, idx) => {
          if (results[idx].status !== 'fulfilled') return;
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

        if (failed.length > 0) {
          isSubmitting.value = false;
          return;
        }

        isAddOpen.value = false;

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

        showToast('success', 'Expenses recorded', `${count} ${count === 1 ? 'entry' : 'entries'} saved to the ledger.`);
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
    .filter(s => s.area === 'Front Apartment' || s.area === 'Back Apartment'
             || s.area === 'Other Expenses / Personal')
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
  area: PropertyArea;
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
    editDate.value = propertyDate(d);
  } else {
    editDate.value = propertyToday();
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
    

    const payload = {
      expenseDate: editDate.value,
      orSupplier: editDesc.value.trim(),
      categoryCode: getDbCategoryCode(editCategory.value),
      allocations: editAllocations.value.map(a => ({
        propertyArea: a.area,
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
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-ink-soft mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-semibold text-ink">Monthly Expenses</span>
        </div>
        <h1 class="text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          Monthly Operating Expenses
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-ink-soft">
          Property disbursements categorized and allocated by property area.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <button
          @click="fetchExpenses"
          :disabled="isLoading"
          class="pill-btn"
        >
          <RefreshCw :class="['size-3.5 text-ink-soft', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="exportFilteredExpenses"
          class="pill-btn"
          title="Export CSV"
        >
          <Download class="size-3.5 text-ink-soft" />
          <span>Export CSV</span>
        </button>

        <button
          @click="exportExpensesExcel"
          :disabled="isExportingExcel"
          class="pill-btn"
          title="The full Monthly Expenses Report layout — month blocks, Property Area totals, and the category summary with its running cumulative"
        >
          <FileSpreadsheet :class="['size-3.5 text-ink-soft', isExportingExcel ? 'animate-pulse' : '']" />
          <span>{{ isExportingExcel ? 'Building…' : 'Export Excel (.xlsx)' }}</span>
        </button>

        <button 
          @click="isAddOpen = true"
          class="pill-btn-brand"
        >
          <Plus class="size-3.5 text-white" />
          <span>Record Expense</span>
        </button>
      </div>
    </div>

    <!-- What was spent, and where it landed -->
    <div class="grid gap-4 xl:grid-cols-12">
      <OverviewTile title="Spent in this view" class="xl:col-span-4">
        <UnavailableNote
          v-if="expenseRecordsFetchFailed"
          message="Expenses could not be loaded. That is not the same as nothing being spent."
          @retry="fetchExpenses"
        />
        <template v-else>
          <p class="text-5xl leading-none font-semibold tabular tracking-tight">{{ peso(totalJuly) }}</p>
          <p class="text-sm text-ink-soft">Across {{ filtered.length }} {{ filtered.length === 1 ? 'entry' : 'entries' }}</p>
          <dl class="mt-auto flex flex-col divide-y divide-line border-t border-line pt-1 text-sm">
            <div class="flex items-baseline justify-between gap-3 py-2">
              <dt class="text-ink-soft">Utilities</dt>
              <dd class="tabular font-semibold">{{ peso(utilitiesTotal) }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-3 py-2">
              <dt class="text-ink-soft">Repairs and cleaning</dt>
              <dd class="tabular font-semibold">{{ peso(repairsTotal) }}</dd>
            </div>
          </dl>
        </template>
      </OverviewTile>

      <OverviewTile title="Where it landed" class="xl:col-span-8">
        <UnavailableNote v-if="expenseRecordsFetchFailed" @retry="fetchExpenses" />
        <p v-else-if="areaSplit.length === 0" class="text-sm text-ink-soft">
          No expenses match the filters above.
        </p>
        <template v-else>
          <SegmentBar
            :segments="areaSplit"
            :label="`How ${peso(totalJuly)} divides across the property areas`"
          />
          <ul class="flex flex-col gap-2.5">
            <li v-for="a in areaSplit" :key="a.label" class="flex items-center justify-between gap-3 text-sm">
              <span class="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  :class="[
                    'size-3 shrink-0 rounded-full',
                    a.tone === 'brand' && 'bg-brand',
                    a.tone === 'bright' && 'bg-brand-bright',
                    a.tone === 'night' && 'bg-night',
                    a.tone === 'soft' && 'bg-brand-soft',
                    a.tone === 'hatch' && 'hatch border border-line',
                  ]"
                />
                <span class="truncate">{{ a.label }}</span>
              </span>
              <span class="flex shrink-0 items-baseline gap-3">
                <span class="text-xs text-ink-faint tabular">
                  {{ totalJuly > 0 ? Math.round((a.value / totalJuly) * 100) : 0 }}%
                </span>
                <span class="tabular font-semibold">{{ peso(a.value) }}</span>
              </span>
            </li>
          </ul>
          <p class="text-xs leading-5 text-ink-faint">
            Main House and Other are the owner's own costs. They are recorded here but never subtracted from
            rental income.
          </p>
        </template>
      </OverviewTile>
    </div>

    <!-- Table Section -->
    <div class="rounded-tile bg-tile overflow-hidden">
      <!-- Filter Bar -->
      <div class="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            v-model="q"
            type="text"
            placeholder="Search description, receipt # or category…"
            class="ws-input w-full pl-10 pr-4 sm:text-sm"
          />
        </div>

        <select
          v-model="selectedCategory"
          class="ws-select sm:text-sm sm:w-48"
        >
          <option value="All">All Categories</option>
          <option v-for="c in EXPENSE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>

        <select
          v-model="filterMonth"
          class="ws-select sm:text-sm sm:w-36"
        >
          <option v-for="m in monthsList" :key="m.val" :value="m.val">{{ m.label }}</option>
        </select>

        <select
          v-model="filterYear"
          class="ws-select sm:text-sm sm:w-28"
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
          <thead class="sticky top-0 z-10 bg-canvas border-b border-line">
            <tr class="text-left text-[11px] uppercase tracking-wide text-ink-soft">
              <th class="whitespace-nowrap px-4 py-3 font-semibold pl-6">DESCRIPTION / VOUCHER</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">CATEGORY</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold text-right">BOARDING HOUSE (₱)</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold text-right">MAIN HOUSE (₱)</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold text-right">APTS &amp; OTHER (₱)</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold text-right">TOTAL (₱)</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold text-center">ACTIONS</th>
            </tr>
          </thead>
          
          <tbody v-if="groupedExpenses.length === 0">
            <tr>
              <td colspan="7" class="p-8 text-center text-ink-soft bg-tile">
                <template v-if="expenseRecordsFetchFailed">
                  The expense ledger could not be loaded. This is not the same as there being
                  none — press Refresh to retry.
                </template>
                <template v-else>No expense entries found matching the criteria.</template>
              </td>
            </tr>
          </tbody>

          <tbody v-for="group in groupedExpenses" :key="group.dateStr" v-else>
            <!-- Date Group Header -->
            <tr class="bg-canvas border-y border-line">
              <td colspan="6" class="px-4 py-2.5 text-xs font-semibold text-ink-soft pl-6">
                {{ group.dateStr }}
              </td>
              <td class="tabular px-4 py-2.5 text-right text-xs font-semibold text-ink">
                Daily: {{ peso(group.dayTotal) }}
              </td>
            </tr>
            <!-- Individual Expense Records -->
            <tr 
              v-for="e in group.records" 
              :key="e.id"
              class="border-b border-line last:border-b-0 hover:bg-canvas transition-colors"
            >
              <td class="px-4 py-3.5 font-semibold text-ink pl-6">{{ e.description }}</td>
              <td class="whitespace-nowrap px-4 py-3.5 text-xs text-ink-soft">{{ e.category }}</td>
              
              <!-- Boarding House Split -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-medium text-ink">
                {{ getAreaAmount(e, 'Boarding House') ? peso(getAreaAmount(e, 'Boarding House')) : '—' }}
              </td>
              
              <!-- Main House Split -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-medium text-ink">
                {{ getAreaAmount(e, 'Main House') ? peso(getAreaAmount(e, 'Main House')) : '—' }}
              </td>
              
              <!-- Apts & Other Split -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-medium text-ink">
                {{ getAptsOtherAmount(e) ? peso(getAptsOtherAmount(e)) : '—' }}
              </td>
              
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-semibold text-ink">
                {{ peso(getExpenseTotal(e)) }}
              </td>
              
              <td class="whitespace-nowrap px-4 py-3.5 text-center">
                <button 
                  @click="startEditExpense(e)" 
                  class="pill-btn min-h-8 px-2.5 py-1 text-xs gap-1.5 inline-flex items-center cursor-pointer hover:border-brand hover:text-brand"
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
      <div class="rounded-tile bg-tile w-full max-w-2xl shadow-2xl overflow-hidden rounded-tile bg-tile border border-line animate-in fade-in zoom-in-95 duration-150 my-6">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 pb-4 border-b border-line">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-brand-soft text-brand ring-1 ring-brand-soft flex items-center justify-center">
              <ReceiptText class="size-5" />
            </div>
            <div>
              <h3 class="font-semibold text-lg text-ink">
                Record Operating Expenses
              </h3>
              <p class="text-xs text-ink-soft">Batch record property expenses and area cost splits</p>
            </div>
          </div>
          <button @click="isAddOpen = false" class="p-1.5 rounded-lg text-ink-soft hover:bg-canvas cursor-pointer" aria-label="Close modal">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="submitAddExpense">
          <div class="p-6 space-y-4 text-xs text-ink max-h-[70vh] overflow-y-auto">
            <!-- Date Field -->
            <div class="w-full sm:w-64">
              <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">Expense Date</label>
              <input v-model="date" type="date" class="ws-input w-full" required />
            </div>

            <!-- Dynamic Entries List -->
            <div class="space-y-4">
              <div 
                v-for="(entry, index) in formEntries" 
                :key="index" 
                class="relative p-4 bg-canvas border border-line rounded-tile space-y-3"
              >
                <!-- Header with Item Index and Remove Item Button -->
                <div class="flex items-center justify-between pb-2 border-b border-line/70">
                  <span class="font-semibold text-xs text-ink">
                    Expense Item #{{ index + 1 }}
                  </span>
                  <button 
                    v-if="formEntries.length > 1" 
                    type="button" 
                    @click="removeFormEntry(index)" 
                    class="pill-btn text-overdue hover:bg-overdue-soft hover:border-overdue-soft min-h-7 py-0.5 px-2 text-[11px] gap-1 inline-flex items-center cursor-pointer"
                    title="Remove Item"
                  >
                    <Trash2 class="size-3 text-overdue" />
                    <span>Remove Item</span>
                  </button>
                </div>

                <!-- Description & Category Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block font-semibold text-[10px] text-ink-soft mb-1.5">Description &amp; Receipt #</label>
                    <input 
                      v-model="entry.desc" 
                      placeholder="e.g. OR #88240 — supplies" 
                      class="ws-input w-full" 
                      required 
                    />
                  </div>

                  <div>
                    <label class="block font-semibold text-[10px] text-ink-soft mb-1.5">Expense Category</label>
                    <select 
                      v-model="entry.category" 
                      class="ws-select w-full" 
                      required
                    >
                      <option v-for="c in EXPENSE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </div>
                </div>

                <!-- Allocations / Splits Section -->
                <div class="border-t border-line/70 pt-3 space-y-2.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-semibold text-ink-soft">Property Area Allocations (Splits)</span>
                    <span class="text-[10px] text-ink-soft">Cost distribution</span>
                  </div>
                  
                  <div class="space-y-2">
                    <div 
                      v-for="(alloc, aIdx) in entry.allocations" 
                      :key="aIdx" 
                      class="flex items-center gap-3 bg-tile p-3 border border-line rounded-xl"
                    >
                      <!-- Area Selector -->
                      <div class="flex-1">
                        <label class="block text-[10px] font-semibold text-ink-soft uppercase mb-1">Target Area</label>
                        <select 
                          v-model="alloc.area" 
                          class="ws-select w-full" 
                          required
                        >
                          <option
                            v-for="areaOption in PROPERTY_AREA_OPTIONS"
                            :key="areaOption.value"
                            :value="areaOption.value"
                          >{{ areaOption.label }}</option>
                        </select>
                      </div>

                      <!-- Amount -->
                      <div class="w-36 sm:w-44">
                        <label class="block text-[10px] font-semibold text-ink-soft uppercase mb-1">Amount (₱)</label>
                        <input 
                          v-model="alloc.amount" 
                          type="number" 
                          placeholder="0.00" 
                          min="0"
                          step="any"
                          class="ws-input w-full tabular" 
                          required 
                        />
                      </div>

                      <!-- Delete split button -->
                      <div class="self-end pb-0.5">
                        <button 
                          v-if="entry.allocations.length > 1" 
                          type="button" 
                          @click="removeAllocation(index, aIdx)" 
                          class="p-2 text-overdue hover:bg-overdue-soft rounded-lg cursor-pointer transition-colors"
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
                      class="pill-btn text-xs min-h-9 px-3 py-1.5 gap-1.5 inline-flex items-center cursor-pointer"
                    >
                      <Plus class="size-3.5 text-brand" />
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
                class="pill-btn min-h-10 text-xs px-3.5 py-2 gap-1.5 inline-flex items-center cursor-pointer"
              >
                <Plus class="size-4 text-brand" />
                <span>Add Another Expense Item</span>
              </button>
            </div>
          </div>

          <!-- Modal Actions Footer -->
          <div class="p-4 px-6 border-t border-line flex items-center justify-end gap-2 bg-canvas">
            <button type="button" @click="isAddOpen = false" class="pill-btn cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="pill-btn-brand cursor-pointer disabled:opacity-50 min-w-[110px]">
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
      <div class="rounded-tile bg-tile w-full max-w-2xl shadow-2xl overflow-hidden rounded-tile bg-tile border border-line animate-in fade-in zoom-in-95 duration-150 my-6">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 pb-4 border-b border-line">
          <div class="flex items-center gap-2.5">
            <div class="size-9 rounded-xl bg-brand-soft text-brand ring-1 ring-brand-soft flex items-center justify-center">
              <ReceiptText class="size-5" />
            </div>
            <div>
              <h3 class="font-semibold text-lg text-ink">
                Edit Operating Expense
              </h3>
              <p class="text-xs text-ink-soft">Update expense classification and property area cost splits</p>
            </div>
          </div>
          <button @click="isEditOpen = false" class="p-1.5 rounded-lg text-ink-soft hover:bg-canvas cursor-pointer" aria-label="Close dialog">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleEditExpense">
          <div class="p-6 space-y-4 text-xs text-ink max-h-[70vh] overflow-y-auto">
            <!-- Date Field -->
            <div class="w-full sm:w-64">
              <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">
                Expense Date
              </label>
              <input 
                v-model="editDate" 
                type="date" 
                class="ws-input w-full" 
                required 
              />
            </div>

            <!-- Description & Category Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">
                  Description &amp; Receipt #
                </label>
                <input 
                  v-model="editDesc" 
                  placeholder="e.g. OR #88240 — supplies" 
                  class="ws-input w-full" 
                  required 
                />
              </div>

              <div>
                <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">
                  Expense Category
                </label>
                <select 
                  v-model="editCategory" 
                  class="ws-select w-full" 
                  required
                >
                  <option v-for="c in EXPENSE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <!-- Allocations / Splits Section -->
            <div class="space-y-3 pt-2">
              <div class="flex items-center justify-between">
                <label class="block font-semibold text-[11px] text-ink-soft">
                  Property Area Allocations (Splits)
                </label>
                <span class="text-[10px] text-ink-soft">Distribute cost across boarding house &amp; main house</span>
              </div>

              <div class="space-y-2">
                <div 
                  v-for="(alloc, aIdx) in editAllocations" 
                  :key="aIdx" 
                  class="flex items-center gap-3 bg-canvas p-3 border border-line rounded-xl"
                >
                  <!-- Area Selector -->
                  <div class="flex-1">
                    <label class="block text-[10px] font-semibold text-ink-soft uppercase mb-1">Target Area</label>
                    <select 
                      v-model="alloc.area" 
                      class="ws-select w-full" 
                      required
                    >
                      <option
                        v-for="areaOption in PROPERTY_AREA_OPTIONS"
                        :key="areaOption.value"
                        :value="areaOption.value"
                      >{{ areaOption.label }}</option>
                    </select>
                  </div>

                  <!-- Amount -->
                  <div class="w-36 sm:w-44">
                    <label class="block text-[10px] font-semibold text-ink-soft uppercase mb-1">Amount (₱)</label>
                    <input 
                      v-model="alloc.amount" 
                      type="number" 
                      placeholder="0.00" 
                      min="0"
                      step="any"
                      class="ws-input w-full tabular" 
                      required 
                    />
                  </div>

                  <!-- Delete split button -->
                  <div class="self-end pb-0.5">
                    <button 
                      v-if="editAllocations.length > 1" 
                      type="button" 
                      @click="removeEditAllocation(aIdx)" 
                      class="p-2 text-overdue hover:bg-overdue-soft rounded-lg cursor-pointer transition-colors"
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
                  class="pill-btn text-xs min-h-9 px-3 py-1.5 gap-1.5 inline-flex items-center cursor-pointer"
                >
                  <Plus class="size-3.5 text-brand" />
                  <span>Split across another area</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Actions Footer: Delete on the left, Cancel/Save on the right -->
          <div class="p-4 px-6 border-t border-line flex items-center justify-between gap-3 bg-canvas">
            <button
              v-if="editingExpense"
              type="button"
              @click="handleDeleteFromEditModal"
              class="pill-btn text-overdue hover:bg-overdue-soft hover:border-overdue-soft min-h-10 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center cursor-pointer"
            >
              <Trash2 class="size-3.5 text-overdue" />
              <span>Delete Expense</span>
            </button>
            <div v-else />

            <div class="flex items-center gap-2">
              <button type="button" @click="isEditOpen = false" class="pill-btn cursor-pointer">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="pill-btn-brand cursor-pointer disabled:opacity-50 min-w-[110px]">
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
      <div class="rounded-tile bg-tile w-full max-w-sm shadow-2xl rounded-tile p-6 bg-tile space-y-4 text-center border border-line">
        <div class="flex flex-col items-center gap-3">
          <div class="size-12 rounded-xl bg-brand-soft text-brand ring-1 ring-brand-soft flex items-center justify-center">
            <ReceiptText class="size-6" />
          </div>
          <h3 class="font-semibold text-base text-ink">{{ confirmTitle }}</h3>
          <p class="text-xs text-ink-soft leading-relaxed">{{ confirmMessage }}</p>
        </div>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button 
            type="button" 
            @click="isConfirmOpen = false" 
            class="pill-btn cursor-pointer min-w-[100px]"
          >
            Cancel
          </button>
          <button 
            type="button" 
            @click="handleConfirmAccept" 
            class="pill-btn-brand cursor-pointer min-w-[100px]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
