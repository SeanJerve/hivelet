<!--
  @file components/modals/EditPaymentModal.vue
  @description Modal to edit recorded payment/income entries in the Billings & Collections Ledger (Spec 09).
  @systemBibleRef Section 3.3 - Billing & Income Collection Ledger
-->
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { isEditPaymentModalOpen, activeEditPayment, updateIncomeRecord, rooms, requestSecondaryConfirm } from '@/lib/systemState';
import { Edit, X } from 'lucide-vue-next';

const selectedUnitNum = ref('1a');
const datePaid = ref('');
const tenantName = ref('');
const invoiceNum = ref('');
const rentAmount = ref(0);
const occupantsCount = ref(1);
const paymentMethod = ref<'Cash' | 'Online'>('Cash');
const referenceNum = ref('');

watch(activeEditPayment, (newVal) => {
  if (newVal) {
    selectedUnitNum.value = newVal.unit;
    datePaid.value = newVal.date;
    tenantName.value = newVal.contact;
    invoiceNum.value = newVal.invoiceNum;
    rentAmount.value = newVal.rent;
    occupantsCount.value = newVal.occupants;
    paymentMethod.value = newVal.paymentMethod;
    referenceNum.value = newVal.referenceNum || '';
  }
}, { immediate: true });

const calcShare = computed(() => (rentAmount.value || 0) / 2);
const calcWater = computed(() => (occupantsCount.value || 0) * 200);
const calcRemitted = computed(() => (rentAmount.value || 0) + calcWater.value);

function handleClose() {
  isEditPaymentModalOpen.value = false;
}

function handleSave() {
  if (!activeEditPayment.value) return;

  requestSecondaryConfirm({
    title: 'Confirm Payment Record Update',
    message: `Are you sure you want to update payment invoice ${invoiceNum.value} for Unit ${selectedUnitNum.value}?`,
    warningLevel: 'info',
    requiresPin: true,
    confirmText: 'Save Payment Changes',
    onConfirm: () => {
      if (activeEditPayment.value) {
        updateIncomeRecord(activeEditPayment.value.id || '', {
          unit: selectedUnitNum.value,
          date: datePaid.value,
          invoiceNum: invoiceNum.value,
          contact: tenantName.value,
          rent: rentAmount.value,
          share: calcShare.value,
          occupants: occupantsCount.value,
          water: calcWater.value,
          remitted: calcRemitted.value,
          paymentMethod: paymentMethod.value,
          referenceNum: paymentMethod.value === 'Online' ? referenceNum.value || 'GCASH-UPDATED' : 'N/A'
        });
        handleClose();
      }
    }
  });
}
</script>

<template>
  <div v-if="isEditPaymentModalOpen && activeEditPayment" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
    <div class="jira-card bg-white w-full max-w-lg border border-[#dfe1e6] shadow-xl rounded-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header -->
      <div class="px-5 py-4 border-b border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-between">
        <div class="flex items-center gap-2 font-bold text-sm text-[#172b4d]">
          <Edit class="w-4 h-4 text-[#054e38]" />
          <span>Edit Recorded Payment (Invoice {{ activeEditPayment.invoiceNum }})</span>
        </div>
        <button @click="handleClose" class="text-[#5e6c84] hover:text-[#172b4d] cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSave" class="p-5 space-y-4 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Unit / Room</label>
            <select v-model="selectedUnitNum" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]">
              <option v-for="r in rooms" :key="r.id" :value="r.unitCode">Unit {{ r.unitCode }} ({{ r.cluster }})</option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Date Paid</label>
            <input v-model="datePaid" type="date" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]" required />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Tenant Name</label>
            <input v-model="tenantName" type="text" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Invoice OR / Ref #</label>
            <input v-model="invoiceNum" type="text" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]" required />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Rent Amount (₱)</label>
            <input v-model.number="rentAmount" type="number" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Occupants Count</label>
            <input v-model.number="occupantsCount" type="number" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]" min="0" required />
          </div>
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Payment Method</label>
            <select v-model="paymentMethod" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]">
              <option value="Cash">Cash</option>
              <option value="Online">Online (GCash)</option>
            </select>
          </div>
        </div>

        <div v-if="paymentMethod === 'Online'">
          <label class="block font-bold text-[#5e6c84] mb-1">GCash Reference #</label>
          <input v-model="referenceNum" type="text" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]" />
        </div>

        <!-- Calculated Summary -->
        <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs flex justify-between items-center text-xs font-mono">
          <div>
            <span>50% Share: <strong>₱{{ calcShare.toLocaleString() }}</strong></span> | 
            <span>Water (₱200/h): <strong>₱{{ calcWater.toLocaleString() }}</strong></span>
          </div>
          <div>
            Total: <strong class="text-[#054e38] text-sm">₱{{ calcRemitted.toLocaleString() }}</strong>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-[#dfe1e6]">
          <button type="button" @click="handleClose" class="jira-btn-secondary border border-[#dfe1e6] hover:bg-[#f4f5f7] px-3.5 py-1.5 font-semibold text-[#172b4d] cursor-pointer">
            Cancel
          </button>
          <button type="submit" class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white px-4 py-1.5 font-semibold cursor-pointer">
            Update Payment Record
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
