<script setup lang="ts">
import { ref } from 'vue';
import { expenseLedger, addExpenseGroup, ExpenseItem, openEditExpense, deleteExpenseItem, requestSecondaryConfirm } from '@/lib/systemState';
import { Plus, Download, Receipt, Edit2, Trash2 } from 'lucide-vue-next';

const expenseDate = ref(new Date().toISOString().split('T')[0]);

const EXPENSE_CATEGORIES = [
  { id: '8', name: 'Repairs & Maintenance' },
  { id: '7', name: 'Comm, Light, Water (Utilities)' },
  { id: '1', name: 'Taxes & Licenses' },
  { id: '2', name: 'Salaries & Wages' },
  { id: '3', name: 'Supplies & Hardware' },
  { id: '4', name: 'Capital Outlay / Improvements' },
  { id: '5', name: 'Miscellaneous' },
];

const supplierItems = ref<ExpenseItem[]>([
  { supplier: '', area: 'BH', amount: 0, catId: '8', catName: 'Repairs & Maintenance' }
]);

function addSupplierRow() {
  supplierItems.value.push({ supplier: '', area: 'BH', amount: 0, catId: '7', catName: 'Comm, Light, Water (Utilities)' });
}

function handleCategoryChange(item: ExpenseItem, selectedName: string) {
  const found = EXPENSE_CATEGORIES.find(c => c.name === selectedName);
  if (found) {
    item.catId = found.id;
    item.catName = found.name;
  }
}

function handleLogExpenses() {
  const totalSum = supplierItems.value.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const itemsSummary = supplierItems.value.map(i => `${i.supplier || 'Supplier'} (${i.area}): ₱${i.amount.toLocaleString()} [${i.catName}]`).join(' | ');

  requestSecondaryConfirm({
    title: 'Review & Confirm Date Expenses',
    message: `Please review your logged expense entries for date ${expenseDate.value} before logging into the ledger:`,
    warningLevel: 'info',
    requiresPin: true,
    confirmText: 'Confirm & Log Expenses',
    summaryFields: [
      { label: 'Expense Log Date', value: expenseDate.value },
      { label: 'Total Supplier OR Items', value: `${supplierItems.value.length} entry/entries` },
      { label: 'Suppliers Breakdown', value: itemsSummary },
      { label: 'Total Expense Amount', value: `₱${totalSum.toLocaleString()}`, highlight: true }
    ],
    onConfirm: () => {
      addExpenseGroup({
        date: expenseDate.value,
        items: [...supplierItems.value]
      });
      supplierItems.value = [{ supplier: '', area: 'BH', amount: 0, catId: '8', catName: 'Repairs & Maintenance' }];
    }
  });
}

function handleDeleteExpense(date: string, item: ExpenseItem) {
  requestSecondaryConfirm({
    title: 'Delete Logged Expense Entry',
    message: `Are you sure you want to delete expense "${item.supplier}" (₱${item.amount.toLocaleString()}) logged for ${date}?`,
    warningLevel: 'danger',
    requiresPin: true,
    confirmText: 'Delete Expense Entry',
    onConfirm: () => {
      deleteExpenseItem(date, item.id || '');
    }
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-bold text-[#172b4d]">Guided Expenses Ledger</h1>
        <p class="text-xs text-[#5e6c84]">Spec 10 — Structured Multi-Supplier Expense Entry with Category Dropdowns</p>
      </div>
      <button class="jira-btn-secondary border border-[#dfe1e6] hover:bg-[#f4f5f7] px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
        <Download class="w-3.5 h-3.5" /> Export Expenses Excel
      </button>
    </div>

    <!-- Multi-Supplier Form -->
    <div class="jira-card p-6 space-y-4 bg-white border border-[#dfe1e6]">
      <h2 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
        <Receipt class="w-4 h-4 text-[#054e38]" /> Log Date Expenses
      </h2>

      <form @submit.prevent="handleLogExpenses" class="space-y-3 text-xs">
        <div class="w-48">
          <label class="block font-bold text-[#5e6c84] mb-1">Expense Date</label>
          <input v-model="expenseDate" type="date" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]" required />
        </div>

        <div class="space-y-2">
          <div v-for="(item, idx) in supplierItems" :key="idx" class="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
            <div>
              <label class="block font-semibold text-[10px] text-[#5e6c84] mb-0.5">Supplier / Description</label>
              <input v-model="item.supplier" type="text" placeholder="e.g. Wilcon Depot" class="w-full p-2 bg-white border border-[#dfe1e6] rounded-xs text-[#172b4d]" required />
            </div>

            <div>
              <label class="block font-semibold text-[10px] text-[#5e6c84] mb-0.5">Property Subcategory / Area</label>
              <select v-model="item.area" class="w-full p-2 bg-white border border-[#dfe1e6] rounded-xs text-[#172b4d]">
                <option value="BH">BH (Main Rooms)</option>
                <option value="MainHouse">Main House</option>
                <option value="FrontApt">Front Apt</option>
                <option value="BackApt">Back Apt</option>
                <option value="Other">Other / Personal</option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-[10px] text-[#5e6c84] mb-0.5">Expense Category</label>
              <select 
                :value="item.catName"
                @change="handleCategoryChange(item, ($event.target as HTMLSelectElement).value)"
                class="w-full p-2 bg-white border border-[#dfe1e6] rounded-xs text-[#172b4d]"
              >
                <option v-for="cat in EXPENSE_CATEGORIES" :key="cat.id" :value="cat.name">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-[10px] text-[#5e6c84] mb-0.5">Amount (₱)</label>
              <input v-model.number="item.amount" type="number" placeholder="Amount (₱)" class="w-full p-2 bg-white border border-[#dfe1e6] rounded-xs font-bold text-[#172b4d]" required />
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center pt-2">
          <button type="button" @click="addSupplierRow" class="jira-btn-secondary border border-[#dfe1e6] hover:bg-[#f4f5f7] px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer">
            <Plus class="w-3.5 h-3.5" /> Add Another OR / Supplier on Same Date
          </button>
          <button type="submit" class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white px-4 py-1.5 text-xs font-semibold cursor-pointer">Log Expenses for Date</button>
        </div>
      </form>
    </div>

    <!-- Expenses Ledger Table -->
    <div class="jira-card p-6 space-y-4 bg-white border border-[#dfe1e6]">
      <h2 class="text-sm font-bold text-[#172b4d]">Guided Expenses Ledger Table</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border border-[#dfe1e6]">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2 border-r border-[#dfe1e6]">Expense Date (Merged)</th>
              <th class="p-2">OR / Supplier Description</th>
              <th class="p-2">Property Area</th>
              <th class="p-2">Expense Category</th>
              <th class="p-2">Amount</th>
              <th class="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in expenseLedger" :key="group.date">
              <tr v-for="(item, itemIdx) in group.items" :key="itemIdx" class="border-b border-[#dfe1e6] hover:bg-[#f4f5f7]">
                <td v-if="itemIdx === 0" :rowspan="group.items.length" class="p-2 font-bold border-r border-[#dfe1e6] bg-[#f4f5f7] align-top font-subtle-num">
                  {{ group.date }}
                </td>
                <td class="p-2 font-medium text-[#172b4d]">{{ item.supplier }}</td>
                <td class="p-2"><span class="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-800">{{ item.area }}</span></td>
                <td class="p-2"><span class="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200">{{ item.catName }}</span></td>
                <td class="p-2 font-bold text-[#172b4d] font-subtle-num">₱{{ item.amount.toLocaleString() }}</td>
                <td class="p-2 text-right">
                  <div class="flex justify-end gap-1">
                    <button @click="openEditExpense(group.date, item)" title="Edit Expense Log" class="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer">
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                    <button @click="handleDeleteExpense(group.date, item)" title="Delete Expense Log" class="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer">
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

