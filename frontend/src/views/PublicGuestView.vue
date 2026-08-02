<!--
  @file views/PublicGuestView.vue
  @description Minimalist Corporate Public Unit Showcase, Specs Viewer & Direct Landlady Inquiry Portal.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5 - Property Model
  @rationale Features visual unit photos, full unit specification modal triggers, and direct inquiry submission to landlady.
  @innovations Integrates openRoomDetail modal trigger, unit photo card display, and automatic inquiry form synchronization.
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { rooms, isLiveChatheadOpen, selectedInquirerId, openRoomDetail, selectedPublicInquiryUnit, showToast, type RoomUnit } from '@/lib/systemState';
import { Send, Building2, Eye, MessageSquare, Users, ShieldCheck, Home } from 'lucide-vue-next';

const availableRooms = computed(() => rooms.filter(r => r.status === 'available'));

const prospectName = ref('');
const phone = ref('');
const email = ref('');
const message = ref('');
const inquirySubmitted = ref(false);

function handleViewSpecs(room: RoomUnit) {
  openRoomDetail(room);
}

function handleInquireUnit(unitCode: string) {
  selectedPublicInquiryUnit.value = unitCode;
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;

  const inquiryElem = document.getElementById('inquiry-form');
  if (inquiryElem) {
    inquiryElem.scrollIntoView({ behavior: 'smooth' });
  }
}

const submitInquiry = () => {
  if (!prospectName.value || !phone.value) return;
  inquirySubmitted.value = true;
  showToast('success', 'Inquiry Sent', `Your inquiry for Unit ${selectedPublicInquiryUnit.value} has been sent to the landlady.`);
};
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Property Header Banner -->
    <div class="jira-card p-6 bg-white space-y-2 border-l-4 border-l-[#0c66e4]">
      <div class="flex items-center gap-2">
        <Building2 class="w-4 h-4 text-[#0c66e4]" />
        <span class="text-xs font-bold text-[#0c66e4] uppercase tracking-wider">Fe Galang Da Silva Boarding House</span>
      </div>
      <h1 class="text-2xl font-bold text-[#172b4d]">Available Rentable Units Catalog & Specifications</h1>
      <p class="text-xs text-[#5e6c84] max-w-2xl leading-relaxed">
        Explore verified available units across 5 Property Clusters (BH Main, Back Apt, Penthouse, Front Apt, Linda). View complete unit specifications, utility rules, and inquire directly to the landlady.
      </p>
    </div>

    <!-- Available Units Grid -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-[#172b4d] flex items-center gap-2">
          <span>Currently Available Rentable Units</span>
          <span class="jira-badge jira-badge-progress">{{ availableRooms.length }} Available</span>
        </h2>
        <span class="text-xs text-[#6b778c]">Click View Specs for full room details & amenities</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div 
          v-for="room in availableRooms" 
          :key="room.id" 
          class="jira-card overflow-hidden bg-white flex flex-col justify-between border border-[#dfe1e6] hover:border-[#0c66e4] transition-all duration-200 shadow-xs"
        >
          <!-- Unit Photo Card Showcase -->
          <div class="relative bg-slate-800 h-32 p-3 text-white flex flex-col justify-between">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-800/70 to-blue-900/30"></div>
            
            <!-- Header Badges -->
            <div class="relative z-10 flex items-center justify-between">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0c66e4] text-white uppercase tracking-wider">
                Unit {{ room.unitCode }}
              </span>
              <span class="jira-badge text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30 uppercase">
                AVAILABLE
              </span>
            </div>

            <!-- Title & Location -->
            <div class="relative z-10">
              <p class="text-sm font-extrabold text-white tracking-tight">{{ room.type }}</p>
              <p class="text-[11px] text-slate-300">{{ room.cluster }} • {{ room.floorLabel }}</p>
            </div>
          </div>

          <!-- Unit Description & Limits -->
          <div class="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div class="space-y-2">
              <p class="text-xs text-[#5e6c84] leading-relaxed line-clamp-2">{{ room.desc }}</p>
              <div class="flex items-center gap-3 text-[11px] text-[#6b778c] pt-1">
                <span class="flex items-center gap-1"><Users class="w-3 h-3 text-[#0c66e4]" /> Max {{ room.maxOccupants }} Pax</span>
                <span class="flex items-center gap-1"><Home class="w-3 h-3 text-[#0c66e4]" /> Private T&B</span>
              </div>
            </div>

            <!-- Price & Dual Action Buttons -->
            <div class="border-t border-[#dfe1e6] pt-3 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-[#6b778c] uppercase font-semibold">Monthly Rent</span>
                <strong class="text-base font-bold text-[#172b4d]">₱{{ room.price.toLocaleString() }}<span class="text-xs font-normal text-[#6b778c]">/mo</span></strong>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button 
                  @click="handleViewSpecs(room)" 
                  class="jira-btn-secondary text-xs w-full justify-center"
                >
                  <Eye class="w-3.5 h-3.5" />
                  <span>View Specs</span>
                </button>

                <button 
                  @click="handleInquireUnit(room.unitCode)" 
                  class="jira-btn-primary text-xs w-full justify-center"
                >
                  <MessageSquare class="w-3.5 h-3.5" />
                  <span>Inquire Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Direct Inquiry Form Card -->
    <div id="inquiry-form" class="jira-card p-6 bg-white space-y-4 max-w-2xl border-l-4 border-l-[#0c66e4] scroll-mt-6">
      <div class="border-b border-[#dfe1e6] pb-3 flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-[#172b4d]">Submit Direct Inquiry for Unit {{ selectedPublicInquiryUnit }}</h2>
          <p class="text-xs text-[#6b778c]">Your message will be delivered directly to the landlady's live chat messenger.</p>
        </div>
        <span class="jira-badge bg-blue-50 text-[#0c66e4] font-bold text-xs">
          Target Unit: {{ selectedPublicInquiryUnit }}
        </span>
      </div>

      <div v-if="inquirySubmitted" class="p-4 bg-[#e3fcef] border border-[#abf5d1] rounded-xs text-[#006644] text-xs space-y-1">
        <strong class="font-bold text-sm">Inquiry Submitted Successfully!</strong>
        <p>Thank you, {{ prospectName }}. The landlady has received your inquiry for Unit {{ selectedPublicInquiryUnit }} and will contact you shortly.</p>
      </div>

      <form v-else @submit.prevent="submitInquiry" class="space-y-3 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Target Rentable Unit *</label>
            <select v-model="selectedPublicInquiryUnit" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] font-bold">
              <option v-for="r in availableRooms" :key="r.id" :value="r.unitCode">
                Unit {{ r.unitCode }} ({{ r.type }} - ₱{{ r.price.toLocaleString() }}/mo)
              </option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Full Name *</label>
            <input v-model="prospectName" required type="text" placeholder="e.g. Gabriel Fernandez" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Contact Phone *</label>
            <input v-model="phone" required type="text" placeholder="e.g. 0917-123-4567" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Email Address</label>
            <input v-model="email" type="email" placeholder="e.g. gabriel@gmail.com" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Inquiry Message / Special Requests</label>
          <textarea v-model="message" rows="3" placeholder="State your target move-in date, number of occupants, preferred viewing time, etc..." class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]"></textarea>
        </div>

        <button type="submit" class="jira-btn-primary w-full justify-center py-2.5 text-xs font-bold">
          <Send class="w-3.5 h-3.5" />
          <span>Send Direct Inquiry to Landlady</span>
        </button>
      </form>
    </div>
  </div>
</template>

