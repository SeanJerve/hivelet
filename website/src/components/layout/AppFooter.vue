<!--
  @file components/layout/AppFooter.vue
  @description Hivelet corporate footer with property information, quick links, and capstone system notes.
  @systemBibleRef Section 1 - Product Identity & Section 4 - Public Visitor Role
-->
<template>
  <footer class="bg-[#0b132b] text-slate-300 pt-16 pb-10 border-t border-white/10 text-xs">
    <div class="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-10">
      <!-- Col 1: Brand & Mission -->
      <div class="space-y-4">
        <h3 class="font-bold text-white uppercase tracking-wider text-xs">Hivelet</h3>
        <p class="text-slate-400 leading-relaxed text-xs">
          Fe Galang Da Silva Boarding House Management System. Centralized operational, financial, and inquiry workflows for 32 rentable units in Barangay Sambat, Tanauan City, Batangas.
        </p>
      </div>

      <!-- Col 2: Property Quick Links -->
      <div class="space-y-3">
        <h4 class="font-bold text-white uppercase tracking-wider text-xs">Property Portal</h4>
        <ul class="space-y-2 text-slate-400">
          <li><a href="#hero" class="hover:text-white transition-colors">Overview</a></li>
          <li><a href="#rooms" class="hover:text-white transition-colors">Rentable Units</a></li>
          <li><a href="#rules" class="hover:text-white transition-colors">Utility Rates & Rules</a></li>
          <li><a href="#inquire" class="hover:text-white transition-colors">Submit Inquiry</a></li>
        </ul>
      </div>

      <!-- Col 3: System Workspaces -->
      <div class="space-y-3">
        <h4 class="font-bold text-white uppercase tracking-wider text-xs">Workspaces</h4>
        <ul class="space-y-2 text-slate-400">
          <li><router-link to="/" class="hover:text-white transition-colors">Public Portal</router-link></li>
          <li><router-link to="/tenant" class="hover:text-white transition-colors">Tenant Self-Service</router-link></li>
          <li><router-link to="/admin" class="hover:text-white transition-colors">Landlady Admin Overview</router-link></li>
        </ul>
      </div>

      <!-- Col 4: Location & Property Address -->
      <div class="space-y-4">
        <h4 class="font-bold text-white uppercase tracking-wider text-xs">Property Location</h4>
        <p class="text-slate-400 leading-relaxed text-xs">
          Barangay Sambat, Tanauan City, Batangas, Philippines.<br />
          Accessible to local university campuses & industrial centers.
        </p>
      </div>
    </div>

    <!-- Bottom Copyright Bar -->
    <div class="max-w-7xl mx-auto px-4 md:px-12 pt-8 mt-12 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
      <p>© 2026 Hivelet. Fe Galang Da Silva Boarding House. All rights reserved.</p>
      <div class="flex items-center gap-6">
        <span class="text-slate-400">Capstone Academic Study</span>
      </div>
    </div>
  </footer>
</template>
