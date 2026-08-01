<!--
  @file views/SystemSettingsView.vue
  @description System configuration and operational business rules summary view for Hivelet website.
  @systemBibleRef Section 3 & Section 5 - Business Rules & System Rules
-->
<script setup lang="ts">
import { ShieldCheck, Banknote, FileSpreadsheet, Layers } from 'lucide-vue-next';
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#172b4d]">System Configuration & Business Rules</h1>
      <p class="text-xs text-[#5e6c84]">Operational Rules for Fe Galang Da Silva Boarding House Management System</p>
    </div>

    <div class="jira-card p-6 space-y-4 text-xs leading-relaxed text-[#172b4d] bg-white border border-[#dfe1e6]">
      <div class="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5 text-sm"><Banknote class="w-4 h-4 text-[#0c66e4]" /> Water Billing Rate (BR-014):</p>
        <p>₱200.00 per registered occupant per month automatically added to monthly tenant remittance calculations.</p>
      </div>

      <div class="p-4 bg-slate-50 border border-[#dfe1e6] rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5 text-sm"><ShieldCheck class="w-4 h-4 text-[#054e38]" /> Primary Payment Method:</p>
        <p>On-Site Cash Payment directly to Landlady is preferred. Optional online checkout via GCash supported with pending verification workflow.</p>
      </div>

      <div class="p-4 bg-slate-50 border border-[#dfe1e6] rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5 text-sm"><Layers class="w-4 h-4 text-[#0c66e4]" /> Linda Units Fixed Rules (LF, LB):</p>
        <p>Linda Front (LF) water fixed at ₱400. Linda Back (LB) water fixed at ₱200, electric fixed at ₱325.</p>
      </div>

      <div class="p-4 bg-slate-50 border border-[#dfe1e6] rounded-xs space-y-1">
        <p class="font-bold flex items-center gap-1.5 text-sm"><FileSpreadsheet class="w-4 h-4 text-[#054e38]" /> Report Exports (BR-049):</p>
        <p>Excel-compatible CSV/XLSX spreadsheet exports for Monthly Income Collection & Guided Expenses ledgers.</p>
      </div>
    </div>
  </div>
</template>
