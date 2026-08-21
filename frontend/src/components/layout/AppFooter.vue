<script setup lang="ts">
/**
 * @file components/layout/AppFooter.vue
 * @description Hivelet corporate footer spanning 100% full viewport width with deep navy background (#0b132b).
 * @systemBibleRef Section 1 - Product Identity & Section 4 - Public Visitor Role
 * @rationale Full edge-to-edge corporate footer with zero left/right/bottom whitespace margins.
 */
</script>

<template>
  <footer class="w-full bg-[#0b132b] text-slate-300 pt-16 pb-12 text-xs mt-auto">
    <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8">
      
      <!-- 4 Columns Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
        
        <!-- Col 1: Brand & Description -->
        <div class="space-y-4">
          <h3 class="font-display font-bold text-white uppercase tracking-wider text-xs">HIVELET</h3>
          <p class="text-slate-400 leading-relaxed text-xs">
            Fe Galang Da Silva Boarding House Management System. Centralized operational, financial, and inquiry workflows for 32 rentable units in Barangay Sambat, Tanauan City, Batangas.
          </p>
        </div>

        <!-- Col 2: Property Quick Links -->
        <div class="space-y-3">
          <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs">PROPERTY PORTAL</h4>
          <ul class="space-y-2.5 text-slate-400">
            <li>
              <router-link to="/public" class="hover:text-white transition-colors">Overview</router-link>
            </li>
            <li>
              <router-link to="/category/1-bedroom" class="hover:text-white transition-colors">Rentable Units</router-link>
            </li>
            <li>
              <router-link to="/public" class="hover:text-white transition-colors">Utility Rates & Rules</router-link>
            </li>
            <li>
              <router-link to="/public" class="hover:text-white transition-colors">Submit Inquiry</router-link>
            </li>
          </ul>
        </div>

        <!-- Col 3: Workspaces -->
        <div class="space-y-3">
          <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs">WORKSPACES</h4>
          <ul class="space-y-2.5 text-slate-400">
            <li>
              <router-link to="/public" class="hover:text-white transition-colors">Public Portal</router-link>
            </li>
            <li>
              <router-link to="/tenant" class="hover:text-white transition-colors">Tenant Self-Service</router-link>
            </li>
            <li>
              <router-link to="/admin" class="hover:text-white transition-colors">Landlady Admin Overview</router-link>
            </li>
          </ul>
        </div>

        <!-- Col 4: Location & Property Address -->
        <div class="space-y-4">
          <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs">PROPERTY LOCATION</h4>
          <p class="text-slate-400 leading-relaxed text-xs">
            Barangay Sambat, Tanauan City, Batangas, Philippines.<br />
            Accessible to local university campuses & industrial centers.
          </p>
        </div>

      </div>

      <!-- Bottom Copyright Bar -->
      <div class="pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
        <p>© 2026 Hivelet. Fe Galang Da Silva Boarding House. All rights reserved.</p>
        <div class="flex items-center gap-6">
          <span class="text-slate-400">Capstone Academic Study</span>
        </div>
      </div>

    </div>
  </footer>
</template>
