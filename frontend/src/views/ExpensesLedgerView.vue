<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { expenseRecords, EXPENSE_CATEGORIES, showToast, type ExpenseRecord } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Plus, Search, ReceiptText, X, RefreshCw, Loader2 } from 'lucide-vue-next';

interface ApiExpense {
  id: string;
  expense_date: string;
  or_supplier: string;
  category_code: string;
  total_expenses: number;
  allocations?: { property_area: string; amount: number }[];
}

interface ApiCat {
  code: string;
  name: string;
  display_order: number;
}

const q = ref('');
const selectedCategory = ref('All');
const isAddOpen = ref(false);
const isLoading = ref(false);
const isSubmitting = ref(false);
const dbCategories = ref<ApiCat[]>([]);

// New Expense Form
const date = ref('2026-08-21');
const desc = ref('');
const category = ref(EXPENSE_CATEGORIES[0]);
const area = ref<'Boarding House' | 'Main House' | 'Front Apt' | 'Back Apt' | 'Other'>('Boarding House');
const amount = ref('');

async function fetchExpenses() {
  isLoading.value = true;
  try {
    const [expensesData, catData] = await Promise.all([
      api.get<ApiExpense[]>('/admin/expenses').catch(() => []),
      api.get<ApiCat[]>('/admin/expense-categories').catch(() => [])
    ]);

    if (catData && catData.length) {
      dbCategories.value = catData;
    }

    if (expensesData && expensesData.length) {
      expensesData.forEach((item) => {
        const existing = expenseRecords.find((e) => e.id === item.id);
        if (!existing) {
          expenseRecords.unshift({
            id: item.id,
            date: item.expense_date,
            description: item.or_supplier,
            category: item.category_code,
            splits: (item.allocations && item.allocations.length > 0)
              ? item.allocations.map((a) => ({
                  area: (['Boarding House', 'Main House', 'Front Apt', 'Back Apt', 'Other'].includes(a.property_area)
                    ? a.property_area
                    : 'Boarding House') as 'Boarding House' | 'Main House' | 'Front Apt' | 'Back Apt' | 'Other',
                  amount: Number(a.amount)
                }))
              : [{ area: 'Boarding House', amount: Number(item.total_expenses) }]
          });
        }
      });
    }
  } catch {
    // Offline fallback
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
    return matchesQ && matchesCat;
  });
});

const totalJuly = computed(() =>
  expenseRecords.reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

const utilitiesTotal = computed(() =>
  expenseRecords
    .filter((e) => e.category.toLowerCase().includes('water') || e.category.toLowerCase().includes('light') || e.category.toLowerCase().includes('util'))
    .reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

const repairsTotal = computed(() =>
  expenseRecords
    .filter((e) => e.category.toLowerCase().includes('repair') || e.category.toLowerCase().includes('janitorial') || e.category.toLowerCase().includes('suppl'))
    .reduce((s, e) => s + e.splits.reduce((acc, x) => acc + x.amount, 0), 0)
);

function getExpenseTotal(e: ExpenseRecord) {
  return e.splits.reduce((s, x) => s + x.amount, 0);
}

async function handleAddExpense() {
  isSubmitting.value = true;
  try {
    const areaMap: Record<string, string> = {
      'Boarding House': 'Boarding House',
      'Main House': 'Main House',
      'Front Apt': 'Front Apartment',
      'Back Apt': 'Back Apartment',
      'Other': 'Other Expenses / Personal'
    };

    try {
      await api.post('/admin/expenses', {
        expenseDate: date.value,
        orSupplier: desc.value.trim(),
        categoryCode: dbCategories.value.length ? (dbCategories.value[0]?.code || '7') : '7',
        allocations: [{
          propertyArea: areaMap[area.value] || 'Boarding House',
          amount: Number(amount.value) || 0
        }]
      });
    } catch {
      // Offline fallback
    }

    const newEntry: ExpenseRecord = {
      id: `EXP-${String(expenseRecords.length + 1).padStart(3, '0')}`,
      date: new Date(date.value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      description: desc.value,
      category: category.value,
      splits: [{ area: area.value, amount: Number(amount.value) || 0 }],
    };
    expenseRecords.unshift(newEntry);
    isAddOpen.value = false;
    desc.value = '';
    amount.value = '';
    showToast('success', 'Expense recorded', `${peso(Number(amount.value) || 0)} posted under ${category.value}.`);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e7e5e4] pb-5">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Monthly Operating Expenses
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          Property disbursements categorized and allocated by area.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          @click="fetchExpenses"
          :disabled="isLoading"
          class="btn-secondary min-h-11 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="isAddOpen = true"
          class="btn-primary min-h-11 gap-2 text-xs shadow-xs cursor-pointer"
        >
          <Plus class="size-4 text-[#f59e0b]" />
          <span>Record Expense</span>
        </button>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="surface-card p-5">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#71717a]">Total Operating Expenses</p>
        <p class="tabular mt-2 font-display text-2xl sm:text-3xl font-black text-[#1c1917]">{{ peso(totalJuly) }}</p>
        <p class="mt-1 text-xs text-[#71717a]">Disbursed across all clusters</p>
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
      <div class="flex flex-col gap-3 border-b border-[#e7e5e4] p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <input
            v-model="q"
            type="text"
            placeholder="Search description, receipt # or category…"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none"
          />
        </div>

        <select
          v-model="selectedCategory"
          class="min-h-11 rounded-xl border border-[#e7e5e4] bg-white px-3 text-xs sm:text-sm text-[#1c1917] focus:border-[#f59e0b] focus:outline-none sm:w-64"
        >
          <option value="All">All Categories</option>
          <option v-for="c in EXPENSE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[900px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a] border-b border-[#e7e5e4]">
              <th class="whitespace-nowrap px-4 py-3 font-bold">DATE</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">DESCRIPTION / VOUCHER</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">CATEGORY</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">PROPERTY AREA SPLITS</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-right">TOTAL (₱)</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="e in filtered" 
              :key="e.id"
              class="border-b border-[#e7e5e4] last:border-0 hover:bg-[#fafaf9] transition-colors"
            >
              <td class="whitespace-nowrap px-4 py-3.5 font-medium text-[#71717a]">{{ e.date }}</td>
              <td class="px-4 py-3.5 font-semibold text-[#1c1917]">{{ e.description }}</td>
              <td class="whitespace-nowrap px-4 py-3.5 text-xs text-[#71717a]">{{ e.category }}</td>
              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(s, idx) in e.splits"
                    :key="idx"
                    class="inline-flex items-center rounded-lg bg-[#f5f5f4] px-2.5 py-1 text-xs text-[#1c1917] font-medium"
                  >
                    {{ s.area }}: <strong class="ml-1 font-bold">{{ peso(s.amount) }}</strong>
                  </span>
                </div>
              </td>
              <td class="tabular whitespace-nowrap px-4 py-3.5 text-right font-display font-bold text-[#1c1917]">
                {{ peso(getExpenseTotal(e)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Record Expense Modal -->
    <div 
      v-if="isAddOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isAddOpen = false"
    >
      <div class="surface-card w-full max-w-md shadow-2xl rounded-2xl p-6 bg-white space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2">
            <ReceiptText class="size-5 text-[#f59e0b]" />
            <h3 class="font-display font-extrabold text-lg text-[#1c1917]">Record Operating Expense</h3>
          </div>
          <button @click="isAddOpen = false" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleAddExpense" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Expense Date</label>
            <input v-model="date" type="date" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Description &amp; Receipt #</label>
            <input v-model="desc" placeholder="OR #88240 — Hardware supply purchase" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>

          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Expense Category</label>
            <select v-model="category" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
              <option v-for="c in EXPENSE_CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Property Area</label>
              <select v-model="area" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
                <option value="Boarding House">Boarding House</option>
                <option value="Main House">Main House</option>
                <option value="Front Apt">Front Apt</option>
                <option value="Back Apt">Back Apt</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Amount (₱)</label>
              <input v-model="amount" type="number" placeholder="2500" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-bold" required />
            </div>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" @click="isAddOpen = false" class="btn-secondary cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary cursor-pointer disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
