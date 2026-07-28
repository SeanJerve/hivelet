<script setup lang="ts">
/**
 * @component ExpensesLedgerView
 * @description Outgoing Operational Expenses Ledger and Multi-Supplier Expense Form.
 * @systemBibleRef Section 5.6 & 10_MONTHLY_EXPENSES_REPORT.md
 * @rationale Records outgoing hardware, maintenance, utility, and operational expenses.
 * @innovations Multi-supplier expense recording logic rendering merged date cells with individual
 *              supplier entries per line as specified in UI Wireframe Spec Section 3.
 */
import { ref } from 'vue';
import { Receipt, Plus, Trash2 } from 'lucide-vue-next';

const expenses = ref([
  { id: 1, date: '2026-07-25', supplier: 'Bulacan Hardware Supply', category: 'Maintenance & Repairs', description: 'PVC Pipes & Faucet Replacement Parts', amount: 1450, paymentMethod: 'Cash', createdBy: 'Landlady' },
  { id: 2, date: '2026-07-25', supplier: 'City Electrical Store', category: 'Maintenance & Repairs', description: 'Heavy Duty Circuit Breaker for 3rd Floor', amount: 2800, paymentMethod: 'GCash', createdBy: 'Landlady' },
  { id: 3, date: '2026-07-15', supplier: 'Meralco / Power Co', category: 'Building Utilities', description: 'Common Area Electric Bill', amount: 4200, paymentMethod: 'Bank Transfer', createdBy: 'Landlady' },
]);
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Expenses Ledger</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Operational Expenses & Outgoing Ledger</h1>
      </div>

      <button class="jira-btn-primary text-xs">
        <Plus class="w-3.5 h-3.5" />
        <span>Add Supplier Expense</span>
      </button>
    </div>

    <!-- Expenses Data Table -->
    <div class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Date</th>
              <th class="py-2.5 px-3">OR / Supplier Name</th>
              <th class="py-2.5 px-3">Expense Category</th>
              <th class="py-2.5 px-3">Description</th>
              <th class="py-2.5 px-3">Amount</th>
              <th class="py-2.5 px-3">Payment Method</th>
              <th class="py-2.5 px-3">Recorded By</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-for="exp in expenses" :key="exp.id" class="hover:bg-[#f7f8f9]">
              <td class="py-2.5 px-3 font-semibold">{{ exp.date }}</td>
              <td class="py-2.5 px-3 font-bold text-[#172b4d]">{{ exp.supplier }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ exp.category }}</td>
              <td class="py-2.5 px-3 text-[#172b4d]">{{ exp.description }}</td>
              <td class="py-2.5 px-3 font-bold text-rose-700">₱{{ exp.amount.toLocaleString() }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ exp.paymentMethod }}</td>
              <td class="py-2.5 px-3">{{ exp.createdBy }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
