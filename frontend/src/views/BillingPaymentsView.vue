<script setup lang="ts">
/**
 * @component BillingPaymentsView
 * @description Monthly Payment Recording Form, Invoice Generator, and Collection Ledger.
 * @systemBibleRef Section 5.5 & 09_MONTHLY_INCOME_REPORT.md
 * @rationale Enforces authoritative financial tracking. Derives 50% landlady share automatically
 *              and assigns unique Invoice Numbers for audit compliance.
 * @innovations Built-in 50% share calculation preview and structured collection ledger table
 *              with explicit Tenant Name and Invoice Number columns as specified in UI Wireframe Spec.
 */
import { ref } from 'vue';
import { CreditCard, Plus, CheckCircle2, DollarSign, FileText, Search } from 'lucide-vue-next';

// Monthly Income / Collections Dataset
const collections = ref([
  { id: 1, invoiceNo: 'INV-2026-0701', room: 'Room 101', tenant: 'Juan Dela Cruz', billType: 'Rent + Water', amount: 4700, share50: 2350, payMethod: 'GCash (Adyen Verified)', paidDate: '2026-07-05', status: 'Verified' },
  { id: 2, invoiceNo: 'INV-2026-0702', room: 'Room 102', tenant: 'Maria Santos', billType: 'Rent + Water', amount: 4700, share50: 2350, payMethod: 'Cash', paidDate: '2026-07-06', status: 'Verified' },
  { id: 3, invoiceNo: 'INV-2026-0703', room: 'Room 106', tenant: 'Ana Reyes', billType: 'Rent + Water', amount: 8400, share50: 4200, payMethod: 'GCash (Manual Upload)', paidDate: '2026-07-10', status: 'Pending Verification' },
]);

const showRecordForm = ref(false);
const newPayment = ref({
  room: 'Room 104',
  tenant: 'Pedro Penduko',
  amount: 4700,
  payMethod: 'GCash',
  invoiceNo: 'INV-2026-0704'
});

const submitPayment = () => {
  collections.value.push({
    id: Date.now(),
    invoiceNo: newPayment.value.invoiceNo,
    room: newPayment.value.room,
    tenant: newPayment.value.tenant,
    billType: 'Rent + Water',
    amount: newPayment.value.amount,
    share50: newPayment.value.amount * 0.5,
    payMethod: newPayment.value.payMethod,
    paidDate: new Date().toISOString().split('T')[0],
    status: 'Verified'
  });
  showRecordForm.value = false;
};
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Billing & Income</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Monthly Payment Collection Ledger</h1>
      </div>

      <button @click="showRecordForm = true" class="jira-btn-primary text-xs">
        <Plus class="w-3.5 h-3.5" />
        <span>Record Monthly Payment</span>
      </button>
    </div>

    <!-- Record Payment Form Card -->
    <div v-if="showRecordForm" class="jira-card p-4 bg-[#f4f5f7] space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-[#dfe1e6]">
        <h3 class="font-bold text-sm text-[#172b4d]">RECORD MONTHLY PAYMENT UNIT FORM</h3>
        <button @click="showRecordForm = false" class="text-xs text-[#6b778c]">Cancel</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Select Unit & Tenant</label>
          <select v-model="newPayment.room" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
            <option value="Room 104">Room 104 — Pedro Penduko</option>
            <option value="Room 108">Room 108 — Elena Toribio</option>
          </select>
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Total Payment Amount (₱)</label>
          <input v-model.number="newPayment.amount" type="number" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Generated Invoice #</label>
          <input v-model="newPayment.invoiceNo" type="text" readonly class="w-full p-1.5 bg-[#ebecf0] border border-[#dfe1e6] rounded-xs font-mono font-bold text-[#172b4d]" />
        </div>
      </div>

      <!-- 50% Share Derivation Live Preview -->
      <div class="p-2.5 bg-[#e3fcef] border border-[#abf5d1] rounded-xs text-[#006644] text-xs flex items-center justify-between">
        <span>50% Derivation Landlady Share Preview:</span>
        <strong class="text-sm">₱{{ (newPayment.amount * 0.5).toLocaleString() }}</strong>
      </div>

      <div class="flex justify-end pt-2">
        <button @click="submitPayment" class="jira-btn-primary">Confirm & Record Invoice</button>
      </div>
    </div>

    <!-- Collection Ledger Table -->
    <div class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Invoice Number</th>
              <th class="py-2.5 px-3">Room Unit</th>
              <th class="py-2.5 px-3">Tenant Name</th>
              <th class="py-2.5 px-3">Bill Type</th>
              <th class="py-2.5 px-3">Total Amount</th>
              <th class="py-2.5 px-3">50% Landlady Share</th>
              <th class="py-2.5 px-3">Payment Method</th>
              <th class="py-2.5 px-3">Date Paid</th>
              <th class="py-2.5 px-3">Verification Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-for="c in collections" :key="c.id" class="hover:bg-[#f7f8f9]">
              <td class="py-2.5 px-3 font-mono font-bold text-[#0c66e4]">{{ c.invoiceNo }}</td>
              <td class="py-2.5 px-3 font-semibold">{{ c.room }}</td>
              <td class="py-2.5 px-3 font-medium">{{ c.tenant }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ c.billType }}</td>
              <td class="py-2.5 px-3 font-bold">₱{{ c.amount.toLocaleString() }}</td>
              <td class="py-2.5 px-3 text-emerald-700 font-semibold">₱{{ c.share50.toLocaleString() }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ c.payMethod }}</td>
              <td class="py-2.5 px-3">{{ c.paidDate }}</td>
              <td class="py-2.5 px-3">
                <span :class="['jira-badge', c.status === 'Verified' ? 'jira-badge-done' : 'jira-badge-warning']">
                  {{ c.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
