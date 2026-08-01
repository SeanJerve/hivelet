<!--
  @file views/ExpensesLedgerView.vue
  @description Spec 10 Guided Monthly Expense Ledger with multi-supplier logging and date cell rowspan merging.
  @systemBibleRef Section 3.3 - Expenses & Financial Ledger
  @rationale Implements date-grouped expense logs where multiple supplier receipts share a single date rowspan.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { expenseLedger, addExpenseGroup, ExpenseItem } from '@/lib/systemState';
import { Plus, Download, Receipt } from 'lucide-vue-next';

const expenseDate = ref(new Date().toISOString().split('T')[0]);
const supplierItems = ref<ExpenseItem[]>([
  { supplier: 'Wilcon Depot (bh)', area: 'BH', amount: 2500, catId: '8', catName: 'Repairs & Maintenance' }
]);

function addSupplierRow() {
  supplierItems.value.push({ supplier: '', area: 'BH', amount: 0, catId: '7', catName: 'Comm, Light, Water' });
}

function handleLogExpenses() {
  addExpenseGroup({
    date: expenseDate.value,
    items: [...supplierItems.value]
  });
  supplierItems.value = [{ supplier: '', area: 'BH', amount: 0, catId: '8', catName: 'Repairs & Maintenance' }];
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-bold text-[#172b4d]">Guided Expenses Ledger</h1>
        <p class="text-xs text-[#5e6c84]">Spec 10 — Multi-Supplier Expense Entry with Merged Date Rowspan</p>
      </div>
      <button class="jira-btn-secondary flex items-center gap-1.5"><Download class="w-3.5 h-3.5" /> Export Expenses Excel</button>
    </div>

    <!-- Multi-Supplier Form -->
    <div class="jira-card p-6 space-y-4">
      <h2 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
        <Receipt class="w-4 h-4 text-[#0c66e4]" /> Log Date Expenses
      </h2>

      <form @submit.prevent="handleLogExpenses" class="space-y-3 text-xs">
        <div class="w-48">
          <label class="block font-bold text-[#5e6c84] mb-1">Expense Date</label>
          <input v-model="expenseDate" type="date" class="jira-input" required />
        </div>

        <div class="space-y-2">
          <div v-for="(item, idx) in supplierItems" :key="idx" class="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
            <input v-model="item.supplier" type="text" placeholder="OR / Supplier Description" class="jira-input" required />
            <select v-model="item.area" class="jira-input">
              <option value="BH">BH Expenses</option>
              <option value="MainHouse">Main House</option>
              <option value="FrontApt">Front Apt</option>
              <option value="BackApt">Back Apt</option>
              <option value="Other">Other / Personal</option>
            </select>
            <input v-model.number="item.amount" type="number" placeholder="Amount (₱)" class="jira-input" required />
            <input v-model="item.catName" type="text" placeholder="Category Name" class="jira-input" required />
          </div>
        </div>

        <div class="flex justify-between items-center pt-2">
          <button type="button" @click="addSupplierRow" class="jira-btn-secondary flex items-center gap-1">
            <Plus class="w-3.5 h-3.5" /> Add Another OR / Supplier on Same Date
          </button>
          <button type="submit" class="jira-btn-primary">Log Expenses for Date</button>
        </div>
      </form>
    </div>

    <!-- Expenses Ledger Table -->
    <div class="jira-card p-6 space-y-4">
      <h2 class="text-sm font-bold text-[#172b4d]">Guided Expenses Ledger Table</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border border-[#dfe1e6]">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2 border-r border-[#dfe1e6]">Expense Date (Merged)</th>
              <th class="p-2">OR / Supplier Description</th>
              <th class="p-2">Area</th>
              <th class="p-2">Category</th>
              <th class="p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in expenseLedger" :key="group.date">
              <tr v-for="(item, itemIdx) in group.items" :key="itemIdx" class="border-b border-[#dfe1e6]">
                <td v-if="itemIdx === 0" :rowspan="group.items.length" class="p-2 font-bold border-r border-[#dfe1e6] bg-[#f4f5f7] align-top">
                  {{ group.date }}
                </td>
                <td class="p-2">{{ item.supplier }}</td>
                <td class="p-2"><span class="jira-badge bg-slate-100 text-slate-800">{{ item.area }}</span></td>
                <td class="p-2">{{ item.catName }}</td>
                <td class="p-2 font-bold text-[#172b4d]">₱{{ item.amount.toLocaleString() }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
