<script setup lang="ts">
/**
 * @component ExpensesLedgerView
 * @description Guided Monthly Expenses ledger per docs/10_MONTHLY_EXPENSES_REPORT.md (BR-041 to
 *              BR-047, FR-037 to FR-042). One expense entry, one fixed category, one-or-more
 *              Property Area allocations. Row totals are a DB trigger (trg_update_expense_total) --
 *              never computed or sent by the client. Category "this month" / cumulative totals and
 *              the BR-047 reconciliation check are computed here from the normalized entries.
 */
import { ref, computed, onMounted } from 'vue';
import { Receipt, Plus, Trash2, CheckCircle2, AlertTriangle, Download } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../lib/useToast';
import { exportMonthlyExpensesExcel } from '../lib/expensesReportExport';

const authStore = useAuthStore();
const { showToast } = useToast();

const PROPERTY_AREAS = [
  'Boarding House',
  'Main House',
  'Front Apartment',
  'Back Apartment',
  'Other Expenses / Personal',
] as const;

interface Category {
  code: string;
  name: string;
  parent_code: string | null;
  display_order: number;
}

interface Allocation {
  property_area: string;
  amount: number;
}

interface ExpenseEntry {
  id: string;
  expense_date: string;
  or_supplier: string;
  category_code: string;
  total_expenses: number;
  fixed_expense_categories: { name: string };
  expense_property_allocations: Allocation[];
}

const loading = ref(true);
const saving = ref(false);
const categories = ref<Category[]>([]);
const entries = ref<ExpenseEntry[]>([]);

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

const form = ref({
  expenseDate: now.toISOString().slice(0, 10),
  orSupplier: '',
  categoryCode: '',
});
const allocationRows = ref<Allocation[]>([{ property_area: PROPERTY_AREAS[0], amount: 0 }]);

const addAllocationRow = () => {
  allocationRows.value.push({ property_area: PROPERTY_AREAS[0], amount: 0 });
};
const removeAllocationRow = (index: number) => {
  if (allocationRows.value.length > 1) allocationRows.value.splice(index, 1);
};
const rowTotalPreview = computed(() => allocationRows.value.reduce((sum, a) => sum + (Number(a.amount) || 0), 0));

const loadAll = async () => {
  loading.value = true;
  const yearStart = `${currentYear}-01-01`;

  const [categoriesRes, entriesRes] = await Promise.all([
    supabase.from('fixed_expense_categories').select('*').order('display_order'),
    supabase
      .from('monthly_expense_entries')
      .select('*, fixed_expense_categories(name), expense_property_allocations(property_area, amount)')
      .gte('expense_date', yearStart)
      .order('expense_date', { ascending: false }),
  ]);

  categories.value = categoriesRes.data ?? [];
  entries.value = (entriesRes.data as any) ?? [];
  loading.value = false;
};

onMounted(loadAll);

const isCurrentMonth = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.getUTCFullYear() === currentYear && d.getUTCMonth() + 1 === currentMonth;
};

// BR-046: per-category "this month" total and year-to-date cumulative (previous months'
// cumulative + this month's total, computed directly from stored entries rather than a
// separately maintained running-total column).
const categoryTotals = computed(() => {
  return categories.value.map((cat) => {
    const catEntries = entries.value.filter((e) => e.category_code === cat.code);
    const thisMonth = catEntries.filter((e) => isCurrentMonth(e.expense_date)).reduce((s, e) => s + Number(e.total_expenses), 0);
    const cumulative = catEntries.reduce((s, e) => s + Number(e.total_expenses), 0); // year-to-date through current month
    return { ...cat, thisMonth, cumulative };
  });
});

// BR-041 Section 6.1: Property Area bottom totals for the current month.
const areaTotals = computed(() => {
  const totals: Record<string, number> = Object.fromEntries(PROPERTY_AREAS.map((a) => [a, 0]));
  for (const e of entries.value) {
    if (!isCurrentMonth(e.expense_date)) continue;
    for (const alloc of e.expense_property_allocations) {
      totals[alloc.property_area] = (totals[alloc.property_area] ?? 0) + Number(alloc.amount);
    }
  }
  return totals;
});

const areaGrandTotal = computed(() => Object.values(areaTotals.value).reduce((s, v) => s + v, 0));
const categoryGrandTotal = computed(() => categoryTotals.value.reduce((s, c) => s + c.thisMonth, 0));

// BR-047: the two totals systems must reconcile for the same month.
const reconciled = computed(() => Math.abs(areaGrandTotal.value - categoryGrandTotal.value) < 0.01);

const resetForm = () => {
  form.value.orSupplier = '';
  form.value.categoryCode = '';
  allocationRows.value = [{ property_area: PROPERTY_AREAS[0], amount: 0 }];
};

const submitExpense = async () => {
  const validRows = allocationRows.value.filter((r) => r.property_area && Number(r.amount) > 0);
  if (!form.value.categoryCode || !form.value.orSupplier || validRows.length === 0) {
    showToast('Missing Information', 'Supplier, category, and at least one Property Area amount are required.', 'error');
    return;
  }

  saving.value = true;

  const { data: entry, error: entryError } = await supabase
    .from('monthly_expense_entries')
    .insert({
      expense_date: form.value.expenseDate,
      or_supplier: form.value.orSupplier,
      category_code: form.value.categoryCode,
      created_by: authStore.profile!.id,
    })
    .select('id')
    .single();

  if (entryError || !entry) {
    saving.value = false;
    showToast('Failed to Save Expense', entryError?.message || 'Could not create the expense entry.', 'error');
    return;
  }

  const { error: allocError } = await supabase.from('expense_property_allocations').insert(
    validRows.map((r) => ({ expense_entry_id: entry.id, property_area: r.property_area, amount: r.amount }))
  );

  saving.value = false;

  if (allocError) {
    showToast('Failed to Save Allocations', allocError.message, 'error');
    return;
  }

  showToast('Expense Recorded', `${form.value.orSupplier} logged across ${validRows.length} area(s).`, 'success');
  resetForm();
  await loadAll();
};

const exporting = ref(false);
const exportReport = async () => {
  exporting.value = true;
  try {
    await exportMonthlyExpensesExcel({
      monthLabel,
      categoryTotals: categoryTotals.value,
      categoryGrandTotal: categoryGrandTotal.value,
      areaTotals: areaTotals.value,
      areaGrandTotal: areaGrandTotal.value,
      entries: entries.value.filter((e) => isCurrentMonth(e.expense_date)),
    });
  } catch (err: any) {
    showToast('Export Failed', err?.message || 'Could not generate the Excel file.', 'error');
  } finally {
    exporting.value = false;
  }
};
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Expenses Ledger</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Monthly Expenses Ledger</h1>
      </div>
      <button @click="exportReport" :disabled="exporting" class="jira-btn-secondary text-xs disabled:opacity-50">
        <Download class="w-3.5 h-3.5" />
        {{ exporting ? 'Exporting…' : 'Export to Excel' }}
      </button>
    </div>

    <div v-if="loading" class="text-xs text-[#6b778c] p-6 text-center">Loading expenses...</div>

    <template v-else>
      <!-- Guided Entry Form (Spec 10 Section 7) -->
      <div class="jira-card p-4 space-y-3">
        <h3 class="font-bold text-sm text-[#172b4d] pb-2 border-b border-[#dfe1e6]">Log an Expense</h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Date</label>
            <input v-model="form.expenseDate" type="date" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
          </div>
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">OR / Supplier</label>
            <input v-model="form.orSupplier" type="text" placeholder="e.g. Wilcon Depot (bh)" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
          </div>
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Category (applies to whole entry)</label>
            <select v-model="form.categoryCode" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
              <option value="" disabled>Select category...</option>
              <option v-for="c in categories" :key="c.code" :value="c.code">
                {{ c.parent_code ? '   ' : '' }}{{ c.code }}. {{ c.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="border-t border-[#dfe1e6] pt-3 space-y-2">
          <p class="text-[11px] font-semibold text-[#5e6c84] uppercase tracking-wider">Property Area Allocations</p>
          <div v-for="(row, i) in allocationRows" :key="i" class="flex items-center gap-2 text-xs">
            <select v-model="row.property_area" class="flex-1 p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
              <option v-for="area in PROPERTY_AREAS" :key="area" :value="area">{{ area }}</option>
            </select>
            <input v-model.number="row.amount" type="number" placeholder="Amount" class="w-32 p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            <button v-if="allocationRows.length > 1" @click="removeAllocationRow(i)" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xs">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
          <button @click="addAllocationRow" class="jira-btn-secondary text-[11px] py-1 px-2.5">
            <Plus class="w-3 h-3" />
            Add Area
          </button>
        </div>

        <div class="p-2.5 bg-[#deebff] border border-[#b3d4ff] rounded-xs text-[#0747a6] text-xs flex items-center justify-between">
          <span>Row Total (derived from areas above):</span>
          <strong class="text-sm">&#8369;{{ rowTotalPreview.toLocaleString() }}</strong>
        </div>

        <div class="flex justify-end pt-1">
          <button @click="submitExpense" :disabled="saving" class="jira-btn-primary disabled:opacity-60">
            <Receipt class="w-3.5 h-3.5" />
            {{ saving ? 'Saving...' : 'Log Expense' }}
          </button>
        </div>
      </div>

      <!-- Category Summary (BR-046) & Reconciliation (BR-047) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="jira-card overflow-hidden">
          <div class="p-3 border-b border-[#dfe1e6] bg-[#f4f5f7]">
            <h3 class="text-xs font-bold text-[#172b4d] uppercase tracking-wider">Category Totals &mdash; {{ monthLabel }}</h3>
          </div>
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="text-[#5e6c84] uppercase tracking-wider font-semibold text-[10px] border-b border-[#dfe1e6]">
                <th class="py-2 px-3">Category</th>
                <th class="py-2 px-3 text-right">This Month</th>
                <th class="py-2 px-3 text-right">YTD Cumulative</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#dfe1e6]">
              <tr v-for="c in categoryTotals" :key="c.code" :class="c.parent_code ? 'text-[#6b778c]' : 'text-[#172b4d] font-medium'">
                <td class="py-1.5 px-3">{{ c.parent_code ? '  ' : '' }}{{ c.code }}. {{ c.name }}</td>
                <td class="py-1.5 px-3 text-right">&#8369;{{ c.thisMonth.toLocaleString() }}</td>
                <td class="py-1.5 px-3 text-right">&#8369;{{ c.cumulative.toLocaleString() }}</td>
              </tr>
              <tr class="font-bold text-[#172b4d] border-t-2 border-[#dfe1e6]">
                <td class="py-2 px-3">Total</td>
                <td class="py-2 px-3 text-right">&#8369;{{ categoryGrandTotal.toLocaleString() }}</td>
                <td class="py-2 px-3 text-right"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="jira-card overflow-hidden">
          <div class="p-3 border-b border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-between">
            <h3 class="text-xs font-bold text-[#172b4d] uppercase tracking-wider">Property Area Totals &mdash; {{ monthLabel }}</h3>
            <span :class="['flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-xs', reconciled ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50']">
              <CheckCircle2 v-if="reconciled" class="w-3 h-3" />
              <AlertTriangle v-else class="w-3 h-3" />
              {{ reconciled ? 'Reconciled' : 'Mismatch' }}
            </span>
          </div>
          <table class="w-full text-left text-xs">
            <tbody class="divide-y divide-[#dfe1e6]">
              <tr v-for="area in PROPERTY_AREAS" :key="area" class="text-[#172b4d]">
                <td class="py-1.5 px-3">{{ area }}</td>
                <td class="py-1.5 px-3 text-right">&#8369;{{ (areaTotals[area] ?? 0).toLocaleString() }}</td>
              </tr>
              <tr class="font-bold text-[#172b4d] border-t-2 border-[#dfe1e6]">
                <td class="py-2 px-3">Total</td>
                <td class="py-2 px-3 text-right">&#8369;{{ areaGrandTotal.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Ledger Rows -->
      <div class="jira-card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
                <th class="py-2.5 px-3">Date</th>
                <th class="py-2.5 px-3">OR / Supplier</th>
                <th class="py-2.5 px-3">Category</th>
                <th class="py-2.5 px-3">Area Allocations</th>
                <th class="py-2.5 px-3">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
              <tr v-for="e in entries" :key="e.id" class="hover:bg-[#f7f8f9]">
                <td class="py-2.5 px-3 font-semibold whitespace-nowrap">{{ e.expense_date }}</td>
                <td class="py-2.5 px-3 font-bold">{{ e.or_supplier }}</td>
                <td class="py-2.5 px-3 text-[#5e6c84]">{{ e.fixed_expense_categories?.name }}</td>
                <td class="py-2.5 px-3 text-[11px] text-[#5e6c84]">
                  <span v-for="(a, i) in e.expense_property_allocations" :key="i" class="inline-block mr-2">
                    {{ a.property_area }}: &#8369;{{ Number(a.amount).toLocaleString() }}{{ i < e.expense_property_allocations.length - 1 ? ';' : '' }}
                  </span>
                </td>
                <td class="py-2.5 px-3 font-bold text-rose-700">&#8369;{{ Number(e.total_expenses).toLocaleString() }}</td>
              </tr>
              <tr v-if="entries.length === 0">
                <td colspan="5" class="py-6 text-center text-[#6b778c]">No expenses recorded yet this year.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
