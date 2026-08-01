<!--
  @file components/modals/EditExpenseModal.vue
  @description Modal to edit recorded expense entries in the Expenses Ledger (Spec 10).
  @systemBibleRef Section 3.3 - Expenses & Financial Ledger
-->
<script setup lang="ts">
import { ref, watch } from 'vue';
import { isEditExpenseModalOpen, activeEditExpenseDate, activeEditExpenseItem, updateExpenseItem, requestSecondaryConfirm } from '@/lib/systemState';
import { Edit, X } from 'lucide-vue-next';

const EXPENSE_CATEGORIES = [
  { id: '8', name: 'Repairs & Maintenance' },
  { id: '7', name: 'Comm, Light, Water (Utilities)' },
  { id: '1', name: 'Taxes & Licenses' },
  { id: '2', name: 'Salaries & Wages' },
  { id: '3', name: 'Supplies & Hardware' },
  { id: '4', name: 'Capital Outlay / Improvements' },
  { id: '5', name: 'Miscellaneous' },
];

const supplier = ref('');
const area = ref<'BH' | 'MainHouse' | 'FrontApt' | 'BackApt' | 'Other'>('BH');
const catName = ref('Repairs & Maintenance');
const amount = ref(0);

watch(activeEditExpenseItem, (newVal) => {
  if (newVal) {
    supplier.value = newVal.supplier;
    area.value = newVal.area;
    catName.value = newVal.catName;
    amount.value = newVal.amount;
  }
}, { immediate: true });

function handleClose() {
  isEditExpenseModalOpen.value = false;
}

function handleSave() {
  if (!activeEditExpenseItem.value) return;

  const foundCat = EXPENSE_CATEGORIES.find(c => c.name === catName.value);

  requestSecondaryConfirm({
    title: 'Confirm Expense Record Update',
    message: `Are you sure you want to update expense "${supplier.value}" (₱${amount.value.toLocaleString()}) for date ${activeEditExpenseDate.value}?`,
    warningLevel: 'info',
    requiresPin: true,
    confirmText: 'Save Expense Changes',
    onConfirm: () => {
      if (activeEditExpenseItem.value) {
        updateExpenseItem(activeEditExpenseDate.value, activeEditExpenseItem.value.id || '', {
          supplier: supplier.value,
          area: area.value,
          catId: foundCat ? foundCat.id : '8',
          catName: catName.value,
          amount: amount.value
        });
        handleClose();
      }
    }
  });
}
</script>

<template>
  <div v-if="isEditExpenseModalOpen && activeEditExpenseItem" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
    <div class="jira-card bg-white w-full max-w-md border border-[#dfe1e6] shadow-xl rounded-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header -->
      <div class="px-5 py-4 border-b border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-between">
        <div class="flex items-center gap-2 font-bold text-sm text-[#172b4d]">
          <Edit class="w-4 h-4 text-[#054e38]" />
          <span>Edit Logged Expense Entry</span>
        </div>
        <button @click="handleClose" class="text-[#5e6c84] hover:text-[#172b4d] cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form Body -->
      <form @submit.prevent="handleSave" class="p-5 space-y-4 text-xs">
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Supplier / Description</label>
          <input v-model="supplier" type="text" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]" required />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Property Area</label>
            <select v-model="area" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]">
              <option value="BH">BH (Main Rooms)</option>
              <option value="MainHouse">Main House</option>
              <option value="FrontApt">Front Apt</option>
              <option value="BackApt">Back Apt</option>
              <option value="Other">Other / Personal</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Expense Category</label>
            <select v-model="catName" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-medium text-[#172b4d]">
              <option v-for="cat in EXPENSE_CATEGORIES" :key="cat.id" :value="cat.name">
                {{ cat.name }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Amount (₱)</label>
          <input v-model.number="amount" type="number" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs font-bold text-[#172b4d]" required />
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-[#dfe1e6]">
          <button type="button" @click="handleClose" class="jira-btn-secondary border border-[#dfe1e6] hover:bg-[#f4f5f7] px-3.5 py-1.5 font-semibold text-[#172b4d] cursor-pointer">
            Cancel
          </button>
          <button type="submit" class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white px-4 py-1.5 font-semibold cursor-pointer">
            Update Expense Record
          </button>
        </div>
      </form>

    </div>
  </div>
</template>
