<!--
  @file views/PublicLandingView.vue
  @description 1:1 guest.html wireframe layout adaptation for Fe Galang Da Silva Boarding House (Hivelet) styled with corporate blue theme.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5.4 - Centralized Inquiries
  @rationale Implements the exact guest.html wireframe layout: Hero grid with organic image cutout & floating glass cards, 'Get Updates Live' highlights grid, multi-combination Floor & Unit Type filter chips, 32-unit catalog grid, transparent house rules, and direct inquiry submission form connecting prospects to the Landlady Inbox.
  @innovations Real-time floor & room type reactive filtering over systemState rooms, direct pre-filling of unit codes in the inquiry form, and automatic inquiry persistence into landlady inbox state.
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { rooms, activeInquirers, isLiveChatheadOpen, selectedInquirerId, RoomUnit } from '@/lib/systemState';
import { 
  Star, ArrowUpRight, ArrowRight, ShieldCheck, 
  Zap, Droplets, Send, MessageSquare, CheckCircle2 
} from 'lucide-vue-next';

// Filter state
const activeFloorFilter = ref('1');
const activeTypeFilter = ref('all');
const activeStatusFilter = ref('all');
const isCatalogExpanded = ref(true);

// Form state
const prospectName = ref('');
const phone = ref('');
const email = ref('');
const selectedUnitCode = ref('102');
const targetMoveInDate = ref('');
const occupantsCount = ref('1');
const message = ref('');
const inquirySubmitted = ref(false);

function getRoomFloor(room: RoomUnit): string {
  if (room.floorLabel.includes('1st')) return '1';
  if (room.floorLabel.includes('2nd')) return '2';
  if (room.floorLabel.includes('3rd')) return '3';
  return '1';
}

const filteredRooms = computed(() => {
  return rooms.filter(r => {
    // Floor filter
    if (activeFloorFilter.value !== 'all') {
      if (getRoomFloor(r) !== activeFloorFilter.value) return false;
    }
    // Type filter
    if (activeTypeFilter.value !== 'all') {
      if (r.type !== activeTypeFilter.value) return false;
    }
    // Status filter
    if (activeStatusFilter.value !== 'all') {
      if (r.status !== activeStatusFilter.value) return false;
    }
    return true;
  });
});

function selectUnitForInquiry(unitCode: string) {
  selectedUnitCode.value = unitCode;
  const el = document.getElementById('inquire');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function handleDirectChat() {
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}

function submitInquiry() {
  if (!prospectName.value || !phone.value) return;

  const targetRoom = rooms.find(r => r.unitCode === selectedUnitCode.value);
  const newInquirerId = `inq-${Date.now()}`;

  // Add inquiry into activeInquirers list in systemState
  activeInquirers.push({
    id: newInquirerId,
    name: prospectName.value,
    room: selectedUnitCode.value,
    type: targetRoom ? targetRoom.type : 'Studio',
    price: targetRoom ? targetRoom.price : 4500,
    unread: true,
    messages: [
      {
        sender: 'Inquirer',
        time: 'Just now',
        text: message.value || `Hi Mrs. Fe Galang, I would like to inquire about Unit ${selectedUnitCode.value} for ${occupantsCount.value} occupant(s). Contact: ${phone.value} (${email.value || 'No email'})`
      }
    ]
  });

  inquirySubmitted.value = true;
  selectedInquirerId.value = newInquirerId;
  isLiveChatheadOpen.value = true;
}
</script>

<template>
  <div class="space-y-16 pb-16 bg-[#f4f5f7] text-[#172b4d]">

    <!-- ====================================================================
         1. HERO SECTION (Patterned after guest.html with Corporate Blue Theme)
         ==================================================================== -->
    <section id="hero" class="relative bg-gradient-to-br from-[#0b132b] via-[#1e293b] to-[#0b132b] text-white pt-12 pb-20 px-4 md:px-12 rounded-b-[2.5rem] overflow-hidden shadow-2xl">
      <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        <!-- Left Hero Content Column -->
        <div class="space-y-6">
          <!-- Star Rating & Verified Location Badge -->
          <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-xs">
            <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span class="font-bold text-slate-100">4.9 Stars</span>
            <span class="text-slate-400">•</span>
            <span class="text-slate-300">Verified Boarding House in Sambat, Tanauan City</span>
          </div>

          <!-- Hero Headline -->
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] font-display">
            Live Comfortably<br />In Hivelet Stays.
          </h1>

          <!-- Subtitle -->
          <p class="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Explore clean, affordable Studio, 1-Bedroom, 2-Bedroom, and 3-Bedroom boarding units across 3 floors. Private bathrooms, sub-metered electrics & direct landlady inquiry.
          </p>

          <!-- CTA Action Buttons -->
          <div class="pt-2 flex flex-wrap items-center gap-4">
            <a 
              href="#inquire" 
              class="bg-[#0c66e4] hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Inquire Now — Free</span>
              <ArrowRight class="w-4 h-4" />
            </a>

            <a 
              href="#rooms" 
              class="text-xs sm:text-sm font-bold text-blue-400 hover:text-white underline underline-offset-4 transition-colors flex items-center gap-1"
            >
              <span>Browse 32 Units</span>
              <ArrowUpRight class="w-4 h-4" />
            </a>
          </div>
        </div>

        <!-- Right Visual Area with Photo Cutout & Floating Glass Cards -->
        <div class="relative h-72 sm:h-96 w-full flex items-center justify-center">
          <!-- Background Organic Image Cutout Container -->
          <div class="w-full h-full rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl relative">
            <img 
              src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80" 
              alt="Fe Galang Da Silva Boarding House Interior" 
              class="w-full h-full object-cover opacity-85"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#0b132b]/80 via-transparent to-transparent"></div>
          </div>

          <!-- Floating Glass Card 1: Unit Status Preview (Top Right) -->
          <div class="absolute -top-4 -right-2 sm:right-2 bg-[#0b132b]/90 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl text-white text-xs w-44 space-y-1">
            <div class="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>Status</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px]">AVAILABLE</span>
            </div>
            <div class="font-extrabold text-base text-white">Unit 204</div>
            <div class="text-[11px] text-slate-300">Floor 2 • 1-Bedroom</div>
            <div class="font-extrabold text-sm text-[#38bdf8] pt-1">₱4,200 <span class="text-[10px] font-normal text-slate-400">/ mo</span></div>
          </div>

          <!-- Floating Glass Card 2: Location Card (Bottom Left) -->
          <div class="absolute -bottom-4 -left-2 sm:left-2 bg-[#0b132b]/90 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 shadow-2xl text-white text-xs flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-[#0c66e4] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              FG
            </div>
            <div>
              <div class="font-bold text-xs">Mrs. Fe Galang</div>
              <div class="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Online — Live Inquiry Line</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>

    <!-- ====================================================================
         2. HIGHLIGHTS SECTION ("Get Updates Live" Grid - guest.html pattern)
         ==================================================================== -->
    <section id="highlights" class="max-w-7xl mx-auto px-4 md:px-12 space-y-6">
      <div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-[#172b4d] font-display">Get Updates Live</h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">Key advantages of Fe Galang Da Silva Boarding House in Sambat, Tanauan City.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Highlight Card 1 -->
        <div class="jira-card p-6 bg-white border border-[#dfe1e6] rounded-xl border-l-4 border-l-[#0c66e4] space-y-2 hover:shadow-lg transition-all">
          <div class="text-[11px] font-bold text-[#0c66e4] uppercase tracking-wider">Direct Inquiry</div>
          <h3 class="font-extrabold text-base text-[#172b4d]">Send Inquiries</h3>
          <p class="text-xs text-[#5e6c84] leading-relaxed">
            Direct communication line to the landlady with fast turnaround for room viewing and move-in terms.
          </p>
        </div>

        <!-- Highlight Card 2 -->
        <div class="jira-card p-6 bg-white border border-[#dfe1e6] rounded-xl border-l-4 border-l-[#0c66e4] space-y-2 hover:shadow-lg transition-all">
          <div class="text-[11px] font-bold text-[#0c66e4] uppercase tracking-wider">Fair Utility Sub-meters</div>
          <h3 class="font-extrabold text-base text-[#172b4d]">Transparent Utilities</h3>
          <p class="text-xs text-[#5e6c84] leading-relaxed">
            Private sub-metering for electric consumption and standardized water rate at ₱200/head per month.
          </p>
        </div>

        <!-- Highlight Card 3 -->
        <div class="jira-card p-6 bg-white border border-[#dfe1e6] rounded-xl border-l-4 border-l-[#0c66e4] space-y-2 hover:shadow-lg transition-all">
          <div class="text-[11px] font-bold text-[#0c66e4] uppercase tracking-wider">Tenant Security</div>
          <h3 class="font-extrabold text-base text-[#172b4d]">Safe Environment</h3>
          <p class="text-xs text-[#5e6c84] leading-relaxed">
            Gated premises with CCTV coverage and quiet residential neighborhood ideal for students & working professionals.
          </p>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         3. ROOM SHOWCASE & COLLAPSIBLE FLOOR SECTIONS
         ==================================================================== -->
    <section id="rooms" class="max-w-7xl mx-auto px-4 md:px-12 space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-[#172b4d] font-display">Available Boarding Units</h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">Select floor tabs below to view units without endless scrolling.</p>
        </div>

        <button 
          @click="isCatalogExpanded = !isCatalogExpanded" 
          class="jira-btn-secondary border border-[#dfe1e6] text-xs px-4 py-2 font-bold flex items-center justify-center gap-2 cursor-pointer w-fit"
        >
          <span>{{ isCatalogExpanded ? 'Collapse Units Catalog' : 'Expand Units Catalog' }}</span>
        </button>
      </div>

      <!-- Multi-Combination Filter Container Box -->
      <div v-if="isCatalogExpanded" class="jira-card p-6 bg-white border border-[#dfe1e6] rounded-2xl space-y-4 shadow-sm">
        <!-- Floor Filter Chips -->
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="font-bold text-slate-500 w-24">Floor:</span>
          <button 
            @click="activeFloorFilter = 'all'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeFloorFilter === 'all' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            All Floors
          </button>
          <button 
            @click="activeFloorFilter = '1'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeFloorFilter === '1' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            1st Floor
          </button>
          <button 
            @click="activeFloorFilter = '2'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeFloorFilter === '2' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            2nd Floor
          </button>
          <button 
            @click="activeFloorFilter = '3'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeFloorFilter === '3' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            3rd Floor
          </button>
        </div>

        <!-- Unit Type Filter Chips -->
        <div class="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-slate-100">
          <span class="font-bold text-slate-500 w-24">Unit Type:</span>
          <button 
            @click="activeTypeFilter = 'all'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeTypeFilter === 'all' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            All Types
          </button>
          <button 
            @click="activeTypeFilter = 'Studio'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeTypeFilter === 'Studio' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            Studio
          </button>
          <button 
            @click="activeTypeFilter = '1-Bedroom'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeTypeFilter === '1-Bedroom' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            1-Bedroom
          </button>
          <button 
            @click="activeTypeFilter = '2-Bedroom'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeTypeFilter === '2-Bedroom' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            2-Bedroom
          </button>
          <button 
            @click="activeTypeFilter = '3-Bedroom'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeTypeFilter === '3-Bedroom' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            3-Bedroom
          </button>
        </div>

        <!-- Availability Status Filter Chips -->
        <div class="flex flex-wrap items-center gap-2 text-xs pt-2 border-t border-slate-100">
          <span class="font-bold text-slate-500 w-24">Availability:</span>
          <button 
            @click="activeStatusFilter = 'all'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeStatusFilter === 'all' ? 'bg-[#0c66e4] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200']"
          >
            All Statuses
          </button>
          <button 
            @click="activeStatusFilter = 'available'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeStatusFilter === 'available' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100']"
          >
            Available Only
          </button>
          <button 
            @click="activeStatusFilter = 'pending'"
            :class="['px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer', activeStatusFilter === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'bg-amber-50 text-amber-800 hover:bg-amber-100']"
          >
            Reserved / Vacating Soon
          </button>
        </div>
      </div>

      <!-- Rentable Units Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="room in filteredRooms" 
          :key="room.id" 
          class="jira-card p-5 bg-white border border-[#dfe1e6] rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-xl transition-all group"
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-extrabold text-lg text-[#172b4d] font-subtle-num">Unit {{ room.unitCode }}</h3>
              <span 
                :class="[
                  'px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider',
                  room.status === 'available' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  room.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  'bg-slate-100 text-slate-700 border border-slate-300'
                ]"
              >
                {{ room.status.toUpperCase() }}
              </span>
            </div>

            <p class="text-xs font-bold text-[#0c66e4]">{{ room.floorLabel }} • {{ room.type }}</p>
            <p class="text-xs text-[#5e6c84] leading-relaxed line-clamp-3">{{ room.desc }}</p>

            <div class="bg-[#f4f5f7] p-2.5 rounded-lg border border-slate-200 text-[11px] text-[#172b4d] space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Capacity:</span>
                <span class="font-bold font-subtle-num">Up to {{ room.maxOccupants }} Occupants</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Utilities:</span>
                <span class="font-bold font-subtle-num">Sub-metered Electric • ₱200/head Water</span>
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-[#dfe1e6] flex items-center justify-between">
            <div>
              <span class="text-[10px] text-slate-400 block font-semibold uppercase">Monthly Rent</span>
              <strong class="text-base font-extrabold text-[#172b4d] font-subtle-num">₱{{ room.price.toLocaleString() }}/mo</strong>
            </div>

            <button 
              @click="selectUnitForInquiry(room.unitCode)" 
              class="bg-[#0c66e4] hover:bg-blue-600 text-white font-bold px-4 py-2 text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <span>Inquire Unit {{ room.unitCode }}</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         4. HOUSE RULES & UTILITY GUIDELINES SECTION
         ==================================================================== -->
    <section id="rules" class="max-w-7xl mx-auto px-4 md:px-12 space-y-6">
      <div class="jira-card p-8 bg-white border border-[#dfe1e6] rounded-2xl space-y-6 shadow-sm">
        <div>
          <h2 class="text-2xl font-extrabold text-[#172b4d]">House Rules & Renting Guidelines</h2>
          <p class="text-xs text-slate-500 mt-1">Transparent operational rules for all tenants at Fe Galang Da Silva Boarding House.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-4 bg-[#f4f5f7] rounded-xl border border-slate-200 space-y-2">
            <div class="flex items-center gap-2 font-bold text-xs text-[#0c66e4]">
              <Droplets class="w-4 h-4" />
              <span>Standard Water Rate</span>
            </div>
            <p class="text-xs text-[#5e6c84] leading-relaxed">
              Water utility is charged at a fixed rate of ₱200 per head/person monthly, automatically added to monthly rent.
            </p>
          </div>

          <div class="p-4 bg-[#f4f5f7] rounded-xl border border-slate-200 space-y-2">
            <div class="flex items-center gap-2 font-bold text-xs text-[#0c66e4]">
              <Zap class="w-4 h-4" />
              <span>Private Sub-metered Electricity</span>
            </div>
            <p class="text-xs text-[#5e6c84] leading-relaxed">
              Each unit is equipped with an individual electric sub-meter. Tenants pay only for actual sub-metered consumption based on electric bills.
            </p>
          </div>

          <div class="p-4 bg-[#f4f5f7] rounded-xl border border-slate-200 space-y-2">
            <div class="flex items-center gap-2 font-bold text-xs text-[#0c66e4]">
              <ShieldCheck class="w-4 h-4" />
              <span>Due Dates & Grace Period</span>
            </div>
            <p class="text-xs text-[#5e6c84] leading-relaxed">
              Monthly rent due date is determined by move-in date. A 1-week grace period applies before payment is flagged as overdue.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         5. DIRECT INQUIRY SUBMISSION FORM SECTION
         ==================================================================== -->
    <section id="inquire" class="max-w-4xl mx-auto px-4 md:px-12">
      <div class="jira-card p-8 bg-white border border-[#dfe1e6] rounded-2xl space-y-6 shadow-xl">
        <div class="border-b border-[#dfe1e6] pb-4">
          <div class="flex items-center gap-2 text-xs font-bold text-[#0c66e4] uppercase tracking-wider mb-1">
            <MessageSquare class="w-4 h-4" />
            <span>Direct Landlady Inquiry Inbox</span>
          </div>
          <h2 class="text-2xl font-extrabold text-[#172b4d]">Submit Direct Booking Inquiry</h2>
          <p class="text-xs text-[#6b778c] mt-1">
            Fill out the form below to contact Mrs. Fe Galang directly. Your message will be sent straight to the Landlady Inbox.
          </p>
        </div>

        <div v-if="inquirySubmitted" class="p-6 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 space-y-3 text-xs">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <strong class="font-extrabold text-base">Inquiry Submitted Successfully!</strong>
          </div>
          <p class="leading-relaxed">
            Thank you, <strong>{{ prospectName }}</strong>. Your inquiry for <strong>Unit {{ selectedUnitCode }}</strong> has been delivered directly to Mrs. Fe Galang's Landlady Inbox.
          </p>
          <div class="pt-2 flex items-center gap-3">
            <button 
              @click="handleDirectChat" 
              class="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              <span>Open Live Chat Messenger</span>
            </button>
            <button 
              @click="inquirySubmitted = false" 
              class="text-emerald-800 hover:underline font-semibold"
            >
              Submit Another Inquiry
            </button>
          </div>
        </div>

        <form v-else @submit.prevent="submitInquiry" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1">Full Name *</label>
              <input 
                v-model="prospectName" 
                required 
                type="text" 
                placeholder="e.g. Gabriel Fernandez" 
                class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4]" 
              />
            </div>

            <div>
              <label class="block font-bold text-[#5e6c84] mb-1">Contact Phone Number *</label>
              <input 
                v-model="phone" 
                required 
                type="text" 
                placeholder="e.g. 0917-123-4567" 
                class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4]" 
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block font-bold text-[#5e6c84] mb-1">Email Address</label>
              <input 
                v-model="email" 
                type="email" 
                placeholder="e.g. gabriel@gmail.com" 
                class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4]" 
              />
            </div>

            <div>
              <label class="block font-bold text-[#5e6c84] mb-1">Target Unit Selection</label>
              <select 
                v-model="selectedUnitCode" 
                class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-bold focus:outline-none focus:border-[#0c66e4] cursor-pointer"
              >
                <option v-for="r in rooms" :key="r.id" :value="r.unitCode">
                  Unit {{ r.unitCode }} ({{ r.floorLabel }} • {{ r.type }} - ₱{{ r.price.toLocaleString() }}/mo)
                </option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#5e6c84] mb-1">Target Move-In Date</label>
              <input 
                v-model="targetMoveInDate" 
                type="date" 
                class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4]" 
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#5e6c84] mb-1">Message / Questions for Mrs. Fe Galang</label>
            <textarea 
              v-model="message" 
              rows="3" 
              placeholder="State your preferred viewing time, target lease duration, number of intended occupants..." 
              class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4]"
            ></textarea>
          </div>

          <button 
            type="submit" 
            class="w-full bg-[#0c66e4] hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Send class="w-4 h-4" />
            <span>Send Direct Inquiry to Landlady Inbox</span>
          </button>
        </form>
      </div>
    </section>

  </div>
</template>
