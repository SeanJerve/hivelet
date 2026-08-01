<!--
  @file views/PublicLandingView.vue
  @description High-end public property landing page inspired directly by Horizon Staycation design.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Catalog
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { rooms, isLiveChatheadOpen, selectedInquirerId } from '@/lib/systemState';
import { PROPERTY_CLUSTERS } from '@/lib/canonicalUnits';
import { Search, Star, Building2, ArrowRight } from 'lucide-vue-next';

const selectedCluster = ref('all');
const search = ref('');

const availableRooms = computed(() => {
  return rooms.filter(r => {
    const isAvailable = r.status === 'available';
    const matchesCluster = selectedCluster.value === 'all' || r.cluster === selectedCluster.value;
    const matchesSearch = search.value === '' || r.unitCode.toLowerCase().includes(search.value.toLowerCase()) || r.type.toLowerCase().includes(search.value.toLowerCase());
    return isAvailable && matchesCluster && matchesSearch;
  });
});

function handleInquire() {
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}
</script>

<template>
  <div class="space-y-16 pb-16">
    <!-- HERO SECTION (Horizon Inspired) -->
    <section class="relative bg-[#091e42] text-white py-20 px-4 md:px-8 rounded-b-3xl overflow-hidden shadow-2xl">
      <div class="absolute inset-0 bg-gradient-to-r from-[#091e42] via-[#091e42]/90 to-transparent z-10"></div>
      <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80" alt="Hivelet Boarding House Interior" class="absolute inset-0 w-full h-full object-cover opacity-30" />

      <div class="max-w-7xl mx-auto relative z-20 space-y-8">
        <div class="inline-flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs">
          <Star class="w-4 h-4 text-amber-400 fill-amber-400" />
          <span class="font-bold">4.9 Stars</span> — <span>Verified Boarding House Stays</span>
        </div>

        <div class="max-w-2xl space-y-4">
          <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight font-display">
            Find Your Best Staycation <br>In Hivelet Stays.
          </h1>
          <p class="text-sm md:text-base text-slate-300 leading-relaxed">
            Explore clean, affordable Studio, 1-Bedroom, 2-Bedroom, and Penthouse units across 5 property clusters in Bulacan. Private bathrooms & transparent sub-metered utilities.
          </p>
        </div>

        <!-- Glassmorphic Search Bar (Horizon Style) -->
        <div class="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl text-[#172b4d] grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl border border-white/20">
          <div>
            <label class="block text-[11px] font-bold uppercase text-[#5e6c84] mb-1">Location / Cluster</label>
            <select v-model="selectedCluster" class="w-full bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg p-2.5 text-xs font-bold focus:outline-none">
              <option value="all">All 5 Property Clusters</option>
              <option v-for="c in PROPERTY_CLUSTERS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase text-[#5e6c84] mb-1">Search Unit</label>
            <div class="relative">
              <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5e6c84]" />
              <input v-model="search" type="text" placeholder="Unit code (1a, B1F, PH)" class="w-full bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg pl-8 pr-2.5 py-2.5 text-xs font-bold focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase text-[#5e6c84] mb-1">Water Billing Rule</label>
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs font-bold">
              ₱200 / head per month
            </div>
          </div>

          <div class="flex items-end">
            <button class="jira-btn-primary w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs">
              <span>Filter Units</span> <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- DISCOVER PROPERTY CLUSTERS -->
    <section class="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-[#172b4d] font-display">Discover Your Destination</h2>
        <p class="text-xs text-[#5e6c84]">Explore our 5 canonical property clusters designed for students and working professionals.</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div v-for="cluster in PROPERTY_CLUSTERS" :key="cluster" class="jira-card p-4 hover:shadow-lg transition-all cursor-pointer group space-y-2">
          <div class="w-10 h-10 rounded-lg bg-blue-50 text-[#0c66e4] flex items-center justify-center group-hover:bg-[#0c66e4] group-hover:text-white transition-colors">
            <Building2 class="w-5 h-5" />
          </div>
          <h3 class="font-bold text-xs text-[#172b4d]">{{ cluster }}</h3>
          <p class="text-[10px] text-[#5e6c84]">Canonical Rentable Space</p>
        </div>
      </div>
    </section>

    <!-- AVAILABLE UNITS SHOWCASE GRID -->
    <section class="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-2xl font-bold text-[#172b4d] font-display">Available Units in Bulacan</h2>
          <p class="text-xs text-[#5e6c84]">Verified units ready for immediate leasing.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="room in availableRooms" :key="room.id" class="jira-card overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between">
          <div class="h-44 bg-slate-200 relative overflow-hidden">
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Unit Photo" class="w-full h-full object-cover" />
            <span class="absolute top-3 right-3 bg-emerald-600 text-white font-bold text-[10px] px-2 py-1 rounded-full uppercase">Available</span>
          </div>

          <div class="p-5 space-y-3">
            <div class="flex justify-between items-center">
              <h3 class="font-bold text-lg text-[#172b4d] font-display">Unit {{ room.unitCode }}</h3>
              <span class="text-xs font-semibold text-[#0c66e4] bg-blue-50 px-2 py-0.5 rounded-md">{{ room.type }}</span>
            </div>
            <p class="text-xs text-[#5e6c84] leading-relaxed">{{ room.desc }}</p>

            <div class="border-t border-[#dfe1e6] pt-3 flex justify-between items-center">
              <div>
                <p class="text-[10px] text-[#5e6c84] uppercase font-bold">Monthly Base Rent</p>
                <p class="text-lg font-bold text-[#172b4d]">₱{{ room.price.toLocaleString() }} <span class="text-xs font-normal text-[#5e6c84]">/ mo</span></p>
              </div>

              <button @click="handleInquire()" class="jira-btn-primary text-xs">
                Inquire Unit
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
