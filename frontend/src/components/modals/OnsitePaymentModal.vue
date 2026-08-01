<!--
  @file components/modals/OnsitePaymentModal.vue
  @description Record on-site cash payment modal matching canonical unit codes.
-->
<script setup lang="ts">
import { isOnsitePaymentModalOpen, addIncomeRecord, rooms } from '@/lib/systemState';
import { X, Check } from 'lucide-vue-next';
import { ref } from 'vue';

const selectedUnit = ref('1a');
const amount = ref(4900);
const orNum = ref('OR-100294');

function closeModal() {
  isOnsitePaymentModalOpen.value = false;
}

function handleRecord() {
  addIncomeRecord({
    unit: selectedUnit.value,
    date: new Date().toISOString().split('T')[0],
    invoiceNum: orNum.value,
    contact: 'Recorded On-Site Tenant',
    period: 'Current Month',
    rent: amount.value - 400,
    share: (amount.value - 400) / 2,
    occupants: 2,
    water: 400,
    remitted: amount.value,
    paymentMethod: 'Cash',
    referenceNum: 'N/A'
  });
  closeModal();
}
</script>

<template>
  <div v-if="isOnsitePaymentModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-sm shadow-xl p-6 space-y-4">
      <div class="flex justify-between items-center border-b border-[#dfe1e6] pb-2">
        <h3 class="text-sm font-bold text-[#172b4d]">Record On-Site Cash Payment</h3>
        <button @click="closeModal"><X class="w-4 h-4 text-[#5e6c84]" /></button>
      </div>

      <form @submit.prevent="handleRecord" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Select Unit / Room</label>
          <select v-model="selectedUnit" class="jira-input">
            <option v-for="r in rooms" :key="r.id" :value="r.unitCode">Unit {{ r.unitCode }} ({{ r.cluster }})</option>
          </select>
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Cash Received Amount (₱)</label>
          <input v-model.number="amount" type="number" class="jira-input" required />
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Official Receipt Number</label>
          <input v-model="orNum" type="text" class="jira-input" required />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button type="button" @click="closeModal" class="jira-btn-secondary">Cancel</button>
          <button type="submit" class="jira-btn-primary flex items-center gap-1"><Check class="w-3.5 h-3.5" /> Record Payment</button>
        </div>
      </form>
    </div>
  </div>
</template>
