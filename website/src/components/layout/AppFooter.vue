<!--
  @file components/layout/AppFooter.vue
  @description Dark corporate footer inspired by Horizon.
-->
<template>
  <footer class="bg-[#091e42] text-slate-300 pt-12 pb-8 border-t border-slate-800 text-xs">
    <div class="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div class="space-y-3">
        <div class="flex items-center gap-2 text-white font-bold text-lg">
          <span class="w-7 h-7 rounded-lg bg-[#0c66e4] flex items-center justify-center font-mono font-extrabold text-sm">H</span>
          <span class="font-display">HIVELET</span>
        </div>
        <p class="text-slate-400 leading-relaxed">
          Fe Galang Da Silva Boarding House Management System. 32 canonical rentable units across 5 property clusters in Bulacan.
        </p>
      </div>

      <div>
        <h4 class="font-bold text-white uppercase tracking-wider mb-3">Property Clusters</h4>
        <ul class="space-y-2 text-slate-400">
          <li>BH (Main Rooms - 22 Units)</li>
          <li>Back Apartment (5 Units)</li>
          <li>Penthouse Suite (1 Unit)</li>
          <li>Front Apartment (3 Units)</li>
          <li>Linda Units (2 Units)</li>
        </ul>
      </div>

      <div>
        <h4 class="font-bold text-white uppercase tracking-wider mb-3">Operational Rules</h4>
        <ul class="space-y-2 text-slate-400">
          <li>BR-014: ₱200/head Water Billing</li>
          <li>BR-040: Linda Fixed Rate Exception</li>
          <li>Spec 09: 50% Monthly Revenue Share</li>
          <li>Spec 10: Guided Expense Ledger</li>
        </ul>
      </div>

      <div>
        <h4 class="font-bold text-white uppercase tracking-wider mb-3">Landlady Contact</h4>
        <p class="text-slate-400 leading-relaxed mb-2">Fe Galang Da Silva Boarding House Office, Bulacan</p>
        <p class="text-slate-300 font-mono">Contact: (044) 791-2049</p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 md:px-8 pt-8 mt-8 border-t border-slate-800 text-center text-slate-500 text-[11px]">
      © 2026 Fe Galang Da Silva Boarding House System (Hivelet). All rights reserved.
    </div>
  </footer>
</template>
