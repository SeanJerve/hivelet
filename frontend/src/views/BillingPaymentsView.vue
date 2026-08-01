<!--
  @file views/BillingPaymentsView.vue
  @description Spec 09 Monthly Payment recorder and auto-updating collection ledger matching canonical unit codes.
  @systemBibleRef Section 3.3 - Billing & Income Collection Ledger
  @rationale Implements 50% revenue share calculation, water billing rules (₱200/head), and auto-reflecting payment ledger.
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { incomeLedger, rooms, addIncomeRecord } from '@/lib/systemState';
import { Plus, Download, CreditCard } from 'lucide-vue-next';

const selectedUnitNum = ref('1a');
const datePaid = ref(new Date().toISOString().split('T')[0]);
const tenantName = ref('Juan Dela Cruz');
const invoiceNum = ref('INV-88392');
const rentAmount = ref(4500);
const occupantsCount = ref(2);
const paymentMethod = ref<'Cash' | 'Online'>('Cash');
const referenceNum = ref('');

const calcShare = computed(() => (rentAmount.value || 0) / 2);
const calcWater = computed(() => (occupantsCount.value || 0) * 200);
const calcRemitted = computed(() => (rentAmount.value || 0) + calcWater.value);

function onUnitChange(unitCode: string) {
  const room = rooms.find(r => r.unitCode === unitCode);
  if (room) {
    rentAmount.value = room.price;
    tenantName.value = room.tenant || '';
    occupantsCount.value = room.occupants || 1;
  }
}

function handleSubmit() {
  addIncomeRecord({
    unit: selectedUnitNum.value,
    date: datePaid.value,
    invoiceNum: invoiceNum.value,
    contact: tenantName.value,
    period: 'Current Period',
    rent: rentAmount.value,
    share: calcShare.value,
    occupants: occupantsCount.value,
    water: calcWater.value,
    remitted: calcRemitted.value,
    paymentMethod: paymentMethod.value,
    referenceNum: paymentMethod.value === 'Online' ? referenceNum.value || 'GCASH-9948271' : 'N/A'
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-bold text-[#172b4d]">Payment & Income Ledger</h1>
        <p class="text-xs text-[#5e6c84]">Spec 09 — Monthly Income Collection & 50% Revenue Share</p>
      </div>
      <button class="jira-btn-secondary flex items-center gap-1.5"><Download class="w-3.5 h-3.5" /> Export Excel Report</button>
    </div>

    <!-- Record Monthly Payment Form -->
    <div class="jira-card p-6 space-y-4">
      <h2 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
        <CreditCard class="w-4 h-4 text-[#0c66e4]" /> Record Monthly Unit Payment
      </h2>

      <form @submit.prevent="handleSubmit" class="space-y-4 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Select Unit / Room</label>
            <select v-model="selectedUnitNum" @change="onUnitChange(($event.target as HTMLSelectElement).value)" class="jira-input">
              <option v-for="r in rooms" :key="r.id" :value="r.unitCode">Unit {{ r.unitCode }} ({{ r.cluster }})</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Date Paid</label>
            <input v-model="datePaid" type="date" class="jira-input" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Tenant Name</label>
            <input v-model="tenantName" type="text" class="jira-input" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Invoice OR / Ref #</label>
            <input v-model="invoiceNum" type="text" class="jira-input" required />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Rent Amount (₱)</label>
            <input v-model.number="rentAmount" type="number" class="jira-input" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Occupants Count</label>
            <input v-model.number="occupantsCount" type="number" class="jira-input" min="0" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Payment Method</label>
            <select v-model="paymentMethod" class="jira-input">
              <option value="Cash">Cash Payment</option>
              <option value="Online">Online Payment (GCash)</option>
            </select>
          </div>
          <div v-if="paymentMethod === 'Online'">
            <label class="block font-bold text-[#5e6c84] mb-1">GCash Ref #</label>
            <input v-model="referenceNum" type="text" class="jira-input" placeholder="GCASH-9948271" />
          </div>
        </div>

        <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs flex flex-wrap justify-between items-center gap-3 font-mono text-xs">
          <div class="flex flex-wrap gap-4">
            <span>50% Share: <strong>₱{{ calcShare.toLocaleString() }}</strong></span>
            <span>Water (₱200/head): <strong>₱{{ calcWater.toLocaleString() }}</strong></span>
            <span>Total Remitted: <strong class="text-[#0c66e4] underline">₱{{ calcRemitted.toLocaleString() }}</strong></span>
          </div>
          <button type="submit" class="jira-btn-primary flex items-center gap-1">
            <Plus class="w-3.5 h-3.5" /> Record Monthly Payment & Add to Ledger
          </button>
        </div>
      </form>
    </div>

    <!-- Income Ledger Table -->
    <div class="jira-card p-6 space-y-4">
      <h2 class="text-sm font-bold text-[#172b4d]">Monthly Income Collection Ledger Table</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border border-[#dfe1e6]">
          <thead class="bg-[#f4f5f7] text-[#5e6c84] font-bold border-b border-[#dfe1e6]">
            <tr>
              <th class="p-2">Unit Code</th>
              <th class="p-2">Date Paid</th>
              <th class="p-2">Tenant Name</th>
              <th class="p-2">Invoice #</th>
              <th class="p-2">Rent</th>
              <th class="p-2">50% Share</th>
              <th class="p-2">Water</th>
              <th class="p-2">Remitted</th>
              <th class="p-2">Method</th>
              <th class="p-2">Ref #</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6]">
            <tr v-for="(rec, idx) in incomeLedger" :key="idx" class="hover:bg-[#f4f5f7]">
              <td class="p-2 font-bold">Unit {{ rec.unit }}</td>
              <td class="p-2">{{ rec.date }}</td>
              <td class="p-2">{{ rec.contact }}</td>
              <td class="p-2 font-mono text-[11px]">{{ rec.invoiceNum }}</td>
              <td class="p-2">₱{{ rec.rent.toLocaleString() }}</td>
              <td class="p-2">₱{{ rec.share.toLocaleString() }}</td>
              <td class="p-2">₱{{ rec.water.toLocaleString() }}</td>
              <td class="p-2 font-bold text-[#0c66e4]">₱{{ rec.remitted.toLocaleString() }}</td>
              <td class="p-2"><span class="jira-badge bg-blue-50 text-blue-800">{{ rec.paymentMethod }}</span></td>
              <td class="p-2 font-mono text-[10px] text-[#5e6c84]">{{ rec.referenceNum }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
