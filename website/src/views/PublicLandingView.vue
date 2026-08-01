<!--
  @file views/PublicLandingView.vue
  @description 1:1 Horizon Luxury Booking Landing Page tailored for Fe Galang Da Silva Boarding House (Hivelet).
  @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Catalog
  @rationale Implements the exact Horizon landing page layout: Hero search, Discover Destination category cards, Top Trending units grid, Most Visited units grid, Spec 09/10 Promo split banners, Partner logo bar, Asymmetric mosaic gallery, and Horizon footer.
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { rooms, isLiveChatheadOpen, selectedInquirerId } from '@/lib/systemState';
import { PROPERTY_CLUSTERS } from '@/lib/canonicalUnits';
import { 
  Search, Star, MapPin, Users, Heart, ArrowUpRight, 
  ArrowRight, Tag, Percent, Sparkles, Building2 
} from 'lucide-vue-next';

const selectedCluster = ref('all');
const activeTrendingFilter = ref('all');
const searchUnit = ref('');
const occupantsFilter = ref('1');

const trendingRooms = computed(() => {
  return rooms.filter(r => {
    if (activeTrendingFilter.value === 'all') return true;
    return r.cluster === activeTrendingFilter.value;
  }).slice(0, 4);
});

const mostVisitedRooms = computed(() => {
  return rooms.filter(r => r.status === 'occupied' || r.status === 'pending').slice(0, 4);
});

function handleInquire() {
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}
</script>

<template>
  <div class="space-y-16 pb-12 bg-[#f4f5f7] text-[#172b4d]">

    <!-- ====================================================================
         1. HERO HEADER BANNER & FLOATING BOOKING BAR (HORIZON STYLE)
         ==================================================================== -->
    <section class="relative bg-[#0b132b] text-white pt-16 pb-24 px-4 md:px-12 rounded-b-[2.5rem] overflow-hidden shadow-2xl">
      <!-- High-res interior background image with subtle dark gradient vignette -->
      <div class="absolute inset-0 bg-gradient-to-b from-[#0b132b]/80 via-[#0b132b]/60 to-[#0b132b] z-10"></div>
      <img 
        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80" 
        alt="Hivelet Boarding House Exterior & Interior" 
        class="absolute inset-0 w-full h-full object-cover opacity-40 transform scale-105"
      />

      <div class="max-w-7xl mx-auto relative z-20 space-y-12">
        <!-- Hero Headline -->
        <div class="max-w-3xl space-y-4 pt-6">
          <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs">
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span class="font-semibold text-slate-200">Official Boarding House System</span>
          </div>
          <h1 class="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] font-display">
            Find Your Best <br class="hidden sm:inline" />Staycation
          </h1>
        </div>

        <!-- Floating Booking Search Card Container (Horizon White Card) -->
        <div class="bg-white text-[#172b4d] rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-w-5xl">
          <!-- Top Row: 3 Input Columns -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <!-- Col 1: Location / Cluster -->
            <div class="space-y-1">
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Location / Cluster</label>
              <div class="flex items-center gap-2">
                <MapPin class="w-4 h-4 text-slate-400 flex-shrink-0" />
                <select v-model="selectedCluster" class="w-full font-bold text-xs bg-transparent focus:outline-none cursor-pointer">
                  <option value="all">All 5 Property Clusters</option>
                  <option v-for="c in PROPERTY_CLUSTERS" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>

            <!-- Col 2: Unit Search -->
            <div class="space-y-1 md:pl-6 pt-3 md:pt-0">
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit Search</label>
              <div class="flex items-center gap-2">
                <Search class="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input v-model="searchUnit" type="text" placeholder="Unit Code (1a, B1F, PH)" class="w-full font-bold text-xs bg-transparent focus:outline-none" />
              </div>
            </div>

            <!-- Col 3: Guests and Rooms -->
            <div class="space-y-1 md:pl-6 pt-3 md:pt-0">
              <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Guests & Occupants</label>
              <div class="flex items-center gap-2">
                <Users class="w-4 h-4 text-slate-400 flex-shrink-0" />
                <select v-model="occupantsFilter" class="w-full font-bold text-xs bg-transparent focus:outline-none cursor-pointer">
                  <option value="1">1 Occupant (Single Bed)</option>
                  <option value="2">2 Occupants (Twin Bed)</option>
                  <option value="3">3 Occupants (Family Unit)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Bottom Row: Filter Pills & Search CTA Button -->
          <div class="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="font-bold text-slate-400 uppercase text-[10px] mr-1">Filters:</span>
              <button 
                v-for="cluster in PROPERTY_CLUSTERS" 
                :key="cluster"
                @click="selectedCluster = cluster"
                :class="['px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer', selectedCluster === cluster ? 'bg-[#0b132b] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
              >
                {{ cluster }}
              </button>
            </div>

            <button @click="handleInquire" class="bg-[#0b132b] hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-full text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer">
              <span>Search Units</span>
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         2. DISCOVER YOUR DESTINATION (CATEGORY CARDS GRID)
         ==================================================================== -->
    <section class="max-w-7xl mx-auto px-4 md:px-12 space-y-6">
      <div>
        <h2 class="text-2xl md:text-3xl font-extrabold text-[#172b4d] font-display">Discover your destination</h2>
        <p class="text-xs text-slate-500 mt-1">Explore our range of property types across 5 canonical property clusters.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <!-- Category Card 1: BH Main Rooms -->
        <div class="jira-card p-5 hover:shadow-xl transition-all cursor-pointer group space-y-4 bg-white">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-extrabold text-base text-[#172b4d]">BH Main Rooms</h3>
              <p class="text-xs text-slate-500 font-medium">22 Available Units</p>
            </div>
            <div class="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#0b132b] group-hover:text-white transition-colors">
              <ArrowUpRight class="w-4 h-4" />
            </div>
          </div>
          <div class="h-32 rounded-xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="BH Main Rooms" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        </div>

        <!-- Category Card 2: Back Apartments -->
        <div class="jira-card p-5 hover:shadow-xl transition-all cursor-pointer group space-y-4 bg-white">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-extrabold text-base text-[#172b4d]">Back Apartment</h3>
              <p class="text-xs text-slate-500 font-medium">5 Available Units</p>
            </div>
            <div class="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#0b132b] group-hover:text-white transition-colors">
              <ArrowUpRight class="w-4 h-4" />
            </div>
          </div>
          <div class="h-32 rounded-xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80" alt="Back Apartment" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        </div>

        <!-- Category Card 3: Penthouse Suite -->
        <div class="jira-card p-5 hover:shadow-xl transition-all cursor-pointer group space-y-4 bg-white">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-extrabold text-base text-[#172b4d]">Penthouse Suite</h3>
              <p class="text-xs text-slate-500 font-medium">1 Luxury Suite</p>
            </div>
            <div class="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#0b132b] group-hover:text-white transition-colors">
              <ArrowUpRight class="w-4 h-4" />
            </div>
          </div>
          <div class="h-32 rounded-xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80" alt="Penthouse Suite" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        </div>

        <!-- Category Card 4: Linda Units -->
        <div class="jira-card p-5 hover:shadow-xl transition-all cursor-pointer group space-y-4 bg-white">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-extrabold text-base text-[#172b4d]">Linda Units</h3>
              <p class="text-xs text-slate-500 font-medium">2 Fixed Rate Units</p>
            </div>
            <div class="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#0b132b] group-hover:text-white transition-colors">
              <ArrowUpRight class="w-4 h-4" />
            </div>
          </div>
          <div class="h-32 rounded-xl overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80" alt="Linda Units" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         3. TOP TRENDING UNITS (HORIZONTAL CARDS WITH FAVORITES & PRICING)
         ==================================================================== -->
    <section class="max-w-7xl mx-auto px-4 md:px-12 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 class="text-2xl md:text-3xl font-extrabold text-[#172b4d] font-display">Top trending units in Hivelet</h2>
          <p class="text-xs text-slate-500 mt-1">Discover the most sought-after units for an unforgettable boarding house experience.</p>
        </div>

        <!-- Tab Filters & See All -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1 bg-slate-200 p-1 rounded-full text-xs">
            <button 
              @click="activeTrendingFilter = 'all'"
              :class="['px-3 py-1 rounded-full font-bold transition-all cursor-pointer', activeTrendingFilter === 'all' ? 'bg-white text-[#172b4d] shadow-xs' : 'text-slate-600']"
            >
              All
            </button>
            <button 
              @click="activeTrendingFilter = 'BH (Main Rooms)'"
              :class="['px-3 py-1 rounded-full font-bold transition-all cursor-pointer', activeTrendingFilter === 'BH (Main Rooms)' ? 'bg-white text-[#172b4d] shadow-xs' : 'text-slate-600']"
            >
              BH Main
            </button>
            <button 
              @click="activeTrendingFilter = 'Back Apartment'"
              :class="['px-3 py-1 rounded-full font-bold transition-all cursor-pointer', activeTrendingFilter === 'Back Apartment' ? 'bg-white text-[#172b4d] shadow-xs' : 'text-slate-600']"
            >
              Back Apt
            </button>
          </div>
          <button @click="handleInquire" class="text-xs font-bold text-[#172b4d] hover:underline flex items-center gap-1 cursor-pointer">
            <span>See All</span> <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- 4 Unit Cards Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div 
          v-for="room in trendingRooms" 
          :key="room.id"
          class="jira-card bg-white overflow-hidden hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div class="h-48 relative overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Room Photo" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <button class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-red-500 transition-colors shadow-md">
              <Heart class="w-4 h-4" />
            </button>
          </div>

          <div class="p-5 space-y-3">
            <div>
              <h3 class="font-extrabold text-base text-[#172b4d]">Unit {{ room.unitCode }} ({{ room.type }})</h3>
              <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin class="w-3 h-3 text-slate-400" /> {{ room.floorLabel }}
              </p>
            </div>

            <div class="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>4.9</span>
              <span class="text-slate-400 font-normal">(124 Reviews)</span>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-baseline justify-between">
              <div>
                <span class="text-lg font-extrabold text-[#172b4d]">₱{{ room.price.toLocaleString() }}</span>
                <span class="text-xs text-slate-400 font-normal"> / mo</span>
                <p class="text-[10px] text-slate-400">Includes ₱200/head water rule</p>
              </div>
              <button @click="handleInquire" class="jira-btn-primary text-xs py-1.5 px-3">Inquire</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         4. MOST VISITED UNITS THIS MONTH
         ==================================================================== -->
    <section class="max-w-7xl mx-auto px-4 md:px-12 space-y-6">
      <div>
        <h2 class="text-2xl md:text-3xl font-extrabold text-[#172b4d] font-display">Most visited units this month</h2>
        <p class="text-xs text-slate-500 mt-1">Trending exceptional boarding house units that captivated occupants this month.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div 
          v-for="room in mostVisitedRooms" 
          :key="room.id"
          class="jira-card bg-white overflow-hidden hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div class="h-48 relative overflow-hidden bg-slate-100">
            <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80" alt="Room Photo" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <button class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-red-500 transition-colors shadow-md">
              <Heart class="w-4 h-4" />
            </button>
          </div>

          <div class="p-5 space-y-3">
            <div>
              <h3 class="font-extrabold text-base text-[#172b4d]">Unit {{ room.unitCode }} ({{ room.cluster }})</h3>
              <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin class="w-3 h-3 text-slate-400" /> Occupied • {{ room.occupants }} Occupants
              </p>
            </div>

            <div class="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>4.8</span>
              <span class="text-slate-400 font-normal">(98 Reviews)</span>
            </div>

            <div class="pt-3 border-t border-slate-100 flex items-baseline justify-between">
              <div>
                <span class="text-lg font-extrabold text-[#172b4d]">₱{{ room.price.toLocaleString() }}</span>
                <span class="text-xs text-slate-400 font-normal"> / mo</span>
              </div>
              <span class="jira-badge bg-emerald-100 text-emerald-800">LEASED</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         5. PROMOTIONAL SPLIT BANNERS (50% REVENUE SHARE & WATER BILLING)
         ==================================================================== -->
    <section class="max-w-7xl mx-auto px-4 md:px-12 space-y-6">
      <div class="flex justify-between items-end">
        <div>
          <h2 class="text-2xl md:text-3xl font-extrabold text-[#172b4d] font-display">System Rule Highlights</h2>
          <p class="text-xs text-slate-500 mt-1">Key operational rules and financial algorithms governing Hivelet.</p>
        </div>
        <button @click="handleInquire" class="text-xs font-bold text-[#172b4d] hover:underline flex items-center gap-1 cursor-pointer">
          <span>See All Rules</span> <ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Banner 1: 50% Revenue Share (Spec 09) -->
        <div class="relative rounded-2xl overflow-hidden bg-slate-900 text-white p-8 space-y-6 shadow-xl flex flex-col justify-between">
          <img src="https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=1000&q=80" alt="Finance Banner" class="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div class="relative z-10 space-y-4">
            <div class="flex items-center justify-between">
              <span class="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500 text-amber-400 flex items-center justify-center font-bold">
                <Percent class="w-5 h-5" />
              </span>
              <span class="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">Spec 09 Ledger</span>
            </div>

            <div>
              <p class="text-xs text-slate-300">Spec 09 Monthly Income Distribution Algorithm</p>
              <h3 class="text-5xl font-extrabold text-white font-display mt-1">50% Share</h3>
            </div>
          </div>

          <div class="relative z-10 pt-4 border-t border-white/20 text-xs text-slate-300">
            Automated equal splitting of monthly base rent between Landlady Fe Galang Da Silva and Property Owner.
          </div>
        </div>

        <!-- Banner 2: ₱200 Water Billing Rule (BR-014) -->
        <div class="relative rounded-2xl overflow-hidden bg-amber-900 text-white p-8 space-y-6 shadow-xl flex flex-col justify-between">
          <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80" alt="Water Rule Banner" class="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div class="relative z-10 space-y-4">
            <div class="flex items-center justify-between">
              <span class="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-400 text-yellow-300 flex items-center justify-center font-bold">
                <Tag class="w-5 h-5" />
              </span>
              <span class="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase tracking-wider">BR-014 Rule</span>
            </div>

            <div>
              <p class="text-xs text-amber-200">Per Head Utility Sub-metering Calculation</p>
              <h3 class="text-5xl font-extrabold text-white font-display mt-1">₱200 / Head</h3>
            </div>
          </div>

          <div class="relative z-10 pt-4 border-t border-white/20 text-xs text-amber-200">
            Fixed monthly water surcharge calculated directly per registered occupant and added to monthly remittance statement.
          </div>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         6. CAPSTONE PARTNER & CERTIFICATION LOGO BAR
         ==================================================================== -->
    <section class="max-w-7xl mx-auto px-4 md:px-12 py-6 border-y border-slate-200">
      <div class="flex flex-wrap items-center justify-between gap-8 opacity-60 text-xs font-bold tracking-widest text-slate-500 uppercase">
        <span>BULACAN STATE UNIVERSITY</span>
        <span>HIVELET SYSTEM BIBLE</span>
        <span>FE GALANG DA SILVA</span>
        <span>SPEC 09 LEDGER</span>
        <span>SPEC 10 EXPENSES</span>
        <span>BR-040 LINDA FIXED</span>
      </div>
    </section>

    <!-- ====================================================================
         7. ASYMMETRIC MOSAIC GALLERY BANNERS
         ==================================================================== -->
    <section class="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Left Column (2 Stacked Banners) -->
      <div class="space-y-6">
        <!-- Top Dark Banner -->
        <div class="bg-[#0b132b] text-white p-6 rounded-2xl space-y-4 shadow-lg flex flex-col justify-between h-44">
          <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Building2 class="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 class="text-lg font-bold font-display">Explore more to get your comfort zone</h3>
            <p class="text-xs text-slate-300">Book your perfect stay with us.</p>
          </div>
          <button @click="handleInquire" class="bg-white text-[#0b132b] font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 w-fit hover:bg-slate-200 transition-colors cursor-pointer">
            <span>Inquire Now</span> <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Bottom Image Stats Banner -->
        <div class="relative h-44 rounded-2xl overflow-hidden bg-slate-900 text-white p-6 flex flex-col justify-end shadow-lg">
          <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" alt="Units count" class="absolute inset-0 w-full h-full object-cover opacity-40" />
          <div class="relative z-10">
            <p class="text-xs text-slate-300">Total Canonical Units Available</p>
            <p class="text-3xl font-extrabold font-display">32 Units</p>
          </div>
        </div>
      </div>

      <!-- Right Column (Large Hero Feature Photo Banner) -->
      <div class="md:col-span-2 relative h-[23rem] rounded-2xl overflow-hidden bg-slate-900 text-white p-8 flex items-end shadow-xl">
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80" alt="Large interior showcase" class="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div class="relative z-10 max-w-xl space-y-2">
          <h2 class="text-3xl md:text-5xl font-extrabold font-display leading-tight">
            Beyond accommodation, creating memories of a lifetime
          </h2>
        </div>
      </div>
    </section>

  </div>
</template>
