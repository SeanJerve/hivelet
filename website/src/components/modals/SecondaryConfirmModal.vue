<!--
  @file components/modals/SecondaryConfirmModal.vue
  @description Secondary confirmation and Security Authentication PIN modal for critical admin actions across the 5 property clusters.
  @systemBibleRef Section 3 & Section 5 - Administrative Security & Confirmation
-->
<script setup lang="ts">
import { ref } from 'vue';
import { isConfirmModalOpen, confirmModalData } from '@/lib/systemState';
import { ShieldAlert, Lock, X, CheckSquare } from 'lucide-vue-next';

const enteredPin = ref('');
const pinError = ref('');

function handleClose() {
  isConfirmModalOpen.value = false;
  enteredPin.value = '';
  pinError.value = '';
}

function handleConfirm() {
  if (confirmModalData.value?.requiresPin !== false) {
    if (enteredPin.value !== '1234') {
      pinError.value = 'Invalid Security PIN. Enter landlady PIN "1234".';
      return;
    }
  }

  if (confirmModalData.value?.onConfirm) {
    confirmModalData.value.onConfirm();
  }
  handleClose();
}
</script>

<template>
  <div v-if="isConfirmModalOpen && confirmModalData" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
    <div class="jira-card bg-white w-full max-w-md border border-[#dfe1e6] shadow-xl rounded-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header -->
      <div 
        class="px-5 py-4 border-b border-[#dfe1e6] flex items-center justify-between"
        :class="{
          'bg-red-50 text-red-900': confirmModalData.warningLevel === 'danger',
          'bg-amber-50 text-amber-900': confirmModalData.warningLevel === 'warning',
          'bg-[#f4f5f7] text-[#172b4d]': !confirmModalData.warningLevel || confirmModalData.warningLevel === 'info'
        }"
      >
        <div class="flex items-center gap-2 font-bold text-sm">
          <ShieldAlert class="w-4 h-4 text-red-600" />
          <span>{{ confirmModalData.title }}</span>
        </div>
        <button @click="handleClose" class="text-[#5e6c84] hover:text-[#172b4d] cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 space-y-4 text-xs">
        <p class="text-[#172b4d] leading-relaxed">{{ confirmModalData.message }}</p>

        <!-- Summary Fields Review Card -->
        <div v-if="confirmModalData.summaryFields && confirmModalData.summaryFields.length > 0" class="border border-[#dfe1e6] rounded-xs overflow-hidden bg-white shadow-xs">
          <div class="px-3 py-2 bg-[#f4f5f7] border-b border-[#dfe1e6] font-bold text-[#172b4d] flex items-center gap-1.5 text-[11px]">
            <CheckSquare class="w-3.5 h-3.5 text-[#054e38]" /> Review Your Entered Inputs / Changes
          </div>
          <div class="divide-y divide-[#dfe1e6] text-[11px]">
            <div 
              v-for="(f, idx) in confirmModalData.summaryFields" 
              :key="idx" 
              class="px-3 py-1.5 flex justify-between items-center"
              :class="{ 'bg-emerald-50/70 font-bold text-emerald-900': f.highlight }"
            >
              <span class="text-[#5e6c84] font-medium">{{ f.label }}</span>
              <span :class="['font-semibold', f.highlight ? 'text-[#054e38] text-xs' : 'text-[#172b4d]']">{{ f.value }}</span>
            </div>
          </div>
        </div>

        <!-- PIN Input if required -->
        <div v-if="confirmModalData.requiresPin !== false" class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs space-y-2">
          <label class="block font-bold text-[#5e6c84] flex items-center gap-1.5">
            <Lock class="w-3.5 h-3.5 text-[#0c66e4]" /> Secondary Authentication PIN
          </label>
          <input 
            v-model="enteredPin" 
            type="password" 
            placeholder="Enter Landlady PIN (Default: 1234)" 
            class="w-full p-2 bg-white border border-[#dfe1e6] rounded-xs font-mono text-center tracking-widest font-bold text-[#172b4d] focus:outline-none focus:border-[#0c66e4]"
            @keyup.enter="handleConfirm"
          />
          <p v-if="pinError" class="text-[11px] text-red-600 font-semibold">{{ pinError }}</p>
          <p v-else class="text-[10px] text-[#5e6c84]">For academic demo, enter security PIN <code class="font-bold text-[#0c66e4]">1234</code>.</p>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="px-5 py-3 bg-[#f4f5f7] border-t border-[#dfe1e6] flex justify-end gap-2 text-xs">
        <button @click="handleClose" class="jira-btn-secondary border border-[#dfe1e6] hover:bg-white px-3.5 py-1.5 font-semibold text-[#172b4d] cursor-pointer">
          Cancel
        </button>
        <button 
          @click="handleConfirm" 
          class="px-4 py-1.5 font-semibold text-white rounded-xs cursor-pointer shadow-xs"
          :class="{
            'bg-red-600 hover:bg-red-700': confirmModalData.warningLevel === 'danger',
            'bg-amber-600 hover:bg-amber-700': confirmModalData.warningLevel === 'warning',
            'bg-[#0c66e4] hover:bg-blue-700': !confirmModalData.warningLevel || confirmModalData.warningLevel === 'info'
          }"
        >
          {{ confirmModalData.confirmText || 'Confirm & Proceed' }}
        </button>
      </div>

    </div>
  </div>
</template>
