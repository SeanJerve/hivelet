<script setup lang="ts">
/**
 * @file components/layout/AppFooter.vue
 * @description Hivelet corporate footer spanning 100% full viewport width with deep navy background (#0b132b).
 * @systemBibleRef Section 1 - Product Identity & Section 4 - Public Visitor Role
 * @rationale Full edge-to-edge corporate footer with zero left/right/bottom whitespace margins.
 */
import { 
  Building2, 
  MapPin, 
  Phone, 
  PhoneCall, 
  ChevronRight,
  ExternalLink
} from 'lucide-vue-next';
</script>

<template>
  <footer class="w-full bg-[#0b132b] text-slate-300 pt-16 pb-12 text-xs mt-auto">
    <div class="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8">
      
      <!-- 4 Columns Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
        
        <!-- Col 1: Brand & Description -->
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <span class="font-display font-black text-lg tracking-tight text-white">HIVELET</span>
            <span class="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-300 border border-blue-400/30">EST. 2026</span>
          </div>
          <p class="text-slate-400 leading-relaxed text-xs">
            Fe Galang Da Silva Boarding House Management System. Centralized operational, financial, and inquiry workflows for 32 rentable units in Legazpi City, Albay.
          </p>
        </div>

        <!-- Col 2: Property Quick Links -->
        <div class="space-y-3">
          <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
            <Building2 class="size-3.5 text-blue-400" />
            <span>Property Portal</span>
          </h4>
          <ul class="space-y-2.5 text-slate-400">
            <li>
              <router-link to="/public" class="hover:text-white transition-colors flex items-center gap-1.5">
                <ChevronRight class="size-3 text-slate-500" />
                <span>Overview</span>
              </router-link>
            </li>
            <li>
              <router-link to="/category/1-bedroom" class="hover:text-white transition-colors flex items-center gap-1.5">
                <ChevronRight class="size-3 text-slate-500" />
                <span>Rentable Units</span>
              </router-link>
            </li>
            <li>
              <router-link to="/public" class="hover:text-white transition-colors flex items-center gap-1.5">
                <ChevronRight class="size-3 text-slate-500" />
                <span>Utility Rates &amp; Rules</span>
              </router-link>
            </li>
            <li>
              <router-link to="/public" class="hover:text-white transition-colors flex items-center gap-1.5">
                <ChevronRight class="size-3 text-slate-500" />
                <span>Submit Inquiry</span>
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Col 3: Contact Us -->
        <div class="space-y-3">
          <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
            <PhoneCall class="size-3.5 text-blue-400" />
            <span>Contact Us</span>
          </h4>
          <ul class="space-y-3 text-slate-400">
            <li class="flex items-start gap-2.5">
              <Phone class="size-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <span class="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Contact Number</span>
                <a href="tel:09494150382" class="text-white hover:text-blue-300 font-semibold text-xs transition-colors">
                  09494150382
                </a>
              </div>
            </li>
            <li class="flex items-start gap-2.5">
              <svg class="size-4 text-[#1877F2] mt-0.5 shrink-0 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <div class="min-w-0">
                <span class="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Facebook</span>
                <a 
                  href="https://www.facebook.com/michelle.millete.16" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="text-white hover:text-blue-300 font-semibold text-xs transition-colors flex items-center gap-1 group"
                >
                  <span class="truncate">michelle.millete.16</span>
                  <ExternalLink class="size-3 text-slate-400 group-hover:text-blue-300 shrink-0" />
                </a>
              </div>
            </li>
          </ul>
        </div>

        <!-- Col 4: Location & Property Address -->
        <div class="space-y-3">
          <h4 class="font-display font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
            <MapPin class="size-3.5 text-blue-400" />
            <span>Property Location</span>
          </h4>
          <p class="text-slate-300 leading-relaxed text-xs">
            32 Sapaguita Street Brgy. 4 Sagpon Old Albay, Legazpi City, Philippines
          </p>
          <p class="text-slate-400 text-[11px] leading-relaxed">
            Accessible to university campuses, transit terminals &amp; commercial centers in Albay.
          </p>
        </div>

      </div>

      <!-- Bottom Copyright Bar -->
      <div class="pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs border-t border-slate-800">
        <p>© 2026 Hivelet. Fe Galang Da Silva Boarding House. All rights reserved.</p>
        <div class="flex items-center gap-4 text-slate-400">
          <span>Fe Galang Da Silva Boarding House</span>
        </div>
      </div>

    </div>
  </footer>
</template>
