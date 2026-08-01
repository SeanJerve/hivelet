<script setup lang="ts">
import { ref } from 'vue';
import { requestSecondaryConfirm, showToast } from '@/lib/systemState';
import { ShieldCheck, Banknote, FileSpreadsheet, Layers, Save } from 'lucide-vue-next';

const standardWaterRate = ref(200);
const lindaLfWaterRate = ref(400);
const lindaLbWaterRate = ref(200);

function handleSaveConfig() {
  requestSecondaryConfirm({
    title: 'Review & Confirm System Configuration Update',
    message: 'Please review your modified business rule parameters before saving system configuration:',
    warningLevel: 'warning',
    requiresPin: true,
    confirmText: 'Save System Configuration',
    summaryFields: [
      { label: 'Standard Water Billing Rate', value: `₱${standardWaterRate.value}/head per month`, highlight: true },
      { label: 'Linda Front (LF) Fixed Water', value: `₱${lindaLfWaterRate.value}/month` },
      { label: 'Linda Back (LB) Fixed Water', value: `₱${lindaLbWaterRate.value}/month` },
      { label: 'Linda Back (LB) Fixed Electric', value: '₱325.00/month (BR-040)' },
      { label: 'Revenue Share Structure', value: '50% Gross Rent Remittance Rule' }
    ],
    onConfirm: () => {
      showToast('success', 'Configuration Saved', 'System business rules & water billing rates updated successfully.');
    }
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-bold text-[#172b4d]">System Configuration & Business Rules</h1>
        <p class="text-xs text-[#5e6c84]">Operational Rules for Fe Galang Da Silva Boarding House Management System</p>
      </div>
      <button @click="handleSaveConfig" class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
        <Save class="w-3.5 h-3.5" /> Save Configuration
      </button>
    </div>

    <div class="jira-card p-6 space-y-4 text-xs leading-relaxed text-[#172b4d] bg-white border border-[#dfe1e6]">
      <div class="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xs space-y-2">
        <p class="font-bold flex items-center gap-1.5 text-sm"><Banknote class="w-4 h-4 text-[#0c66e4]" /> Water Billing Rate (BR-014):</p>
        <p>₱200.00 per registered occupant per month automatically added to monthly tenant remittance calculations.</p>
        <div class="flex items-center gap-2 pt-1">
          <label class="font-semibold text-xs">Standard Water Rate (₱/head):</label>
          <input v-model.number="standardWaterRate" type="number" class="w-24 p-1 bg-white border border-[#dfe1e6] rounded-xs font-bold" />
        </div>
      </div>

      <div class="p-4 bg-slate-50 border border-[#dfe1e6] rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5 text-sm"><ShieldCheck class="w-4 h-4 text-[#054e38]" /> Primary Payment Method:</p>
        <p>On-Site Cash Payment directly to Landlady is preferred. Optional online checkout via GCash supported with pending verification workflow.</p>
      </div>

      <div class="p-4 bg-slate-50 border border-[#dfe1e6] rounded-xs space-y-2">
        <p class="font-bold flex items-center gap-1.5 text-sm"><Layers class="w-4 h-4 text-[#0c66e4]" /> Linda Units Fixed Rules (LF, LB):</p>
        <p>Linda Front (LF) water fixed at ₱400. Linda Back (LB) water fixed at ₱200, electric fixed at ₱325.</p>
        <div class="flex flex-wrap gap-4 pt-1">
          <div class="flex items-center gap-2">
            <label class="font-semibold text-xs">LF Fixed Water (₱):</label>
            <input v-model.number="lindaLfWaterRate" type="number" class="w-24 p-1 bg-white border border-[#dfe1e6] rounded-xs font-bold" />
          </div>
          <div class="flex items-center gap-2">
            <label class="font-semibold text-xs">LB Fixed Water (₱):</label>
            <input v-model.number="lindaLbWaterRate" type="number" class="w-24 p-1 bg-white border border-[#dfe1e6] rounded-xs font-bold" />
          </div>
        </div>
      </div>

      <div class="p-4 bg-slate-50 border border-[#dfe1e6] rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5 text-sm"><FileSpreadsheet class="w-4 h-4 text-[#054e38]" /> Report Exports (BR-049):</p>
        <p>Excel-compatible CSV/XLSX spreadsheet exports for Monthly Income Collection & Guided Expenses ledgers.</p>
      </div>
    </div>
  </div>
</template>

