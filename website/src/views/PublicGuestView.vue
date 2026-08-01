<!--
  @file views/PublicGuestView.vue
  @description Corporate Public Property Catalog & Room Inquiry Portal displaying available canonical units for Hivelet website.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5.4 - Centralized Inquiries
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { rooms, isLiveChatheadOpen, selectedInquirerId } from '@/lib/systemState';
import { Send } from 'lucide-vue-next';

const availableRooms = computed(() => rooms.filter(r => r.status === 'available'));

const selectedUnitCode = ref('1c');
const prospectName = ref('');
const phone = ref('');
const email = ref('');
const message = ref('');
const inquirySubmitted = ref(false);

function handleInquireUnit(unitCode: string) {
  selectedUnitCode.value = unitCode;
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}

const submitInquiry = () => {
  if (!prospectName.value || !phone.value) return;
  inquirySubmitted.value = true;
};
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Property Header Banner -->
    <div class="jira-card p-6 bg-white space-y-2 border-l-4 border-l-[#0c66e4] border border-[#dfe1e6]">
      <span class="text-xs font-bold text-[#0c66e4] uppercase tracking-wider">Fe Galang Da Silva Boarding House</span>
      <h1 class="text-2xl font-bold text-[#172b4d]">Available Rentable Units Catalog</h1>
      <p class="text-xs text-[#5e6c84] max-w-2xl">
        Centralized property catalog across 5 Property Clusters (BH Main, Back Apt, Penthouse, Front Apt, Linda). View verified available units and inquire directly.
      </p>
    </div>

    <!-- Available Units Grid -->
    <div class="space-y-4">
      <h2 class="text-base font-bold text-[#172b4d]">Currently Available Canonical Units ({{ availableRooms.length }})</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="room in availableRooms" :key="room.id" class="jira-card p-4 flex flex-col justify-between space-y-3 bg-white border border-[#dfe1e6]">
          <div>
            <div class="flex items-center justify-between mb-1">
              <h3 class="font-bold text-base text-[#172b4d]">Unit {{ room.unitCode }}</h3>
              <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">AVAILABLE</span>
            </div>
            <p class="text-xs text-[#0c66e4] font-medium mb-1">{{ room.cluster }} • {{ room.type }}</p>
            <p class="text-xs text-[#5e6c84] leading-relaxed">{{ room.desc }}</p>
          </div>

          <div class="border-t border-[#dfe1e6] pt-3 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-[#6b778c] block uppercase font-semibold">Monthly Rate</span>
              <strong class="text-base font-bold text-[#172b4d]">₱{{ room.price.toLocaleString() }}/mo</strong>
            </div>

            <button 
              @click="handleInquireUnit(room.unitCode)" 
              class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              Inquire Now
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Inquiry Submission Form Card -->
    <div class="jira-card p-6 bg-white space-y-4 max-w-2xl border border-[#dfe1e6]">
      <div class="border-b border-[#dfe1e6] pb-3">
        <h2 class="text-base font-bold text-[#172b4d]">Submit Direct Inquiry for Unit {{ selectedUnitCode }}</h2>
        <p class="text-xs text-[#6b778c]">Your message will be delivered directly to the landlady's live chat messenger.</p>
      </div>

      <div v-if="inquirySubmitted" class="p-4 bg-[#e3fcef] border border-[#abf5d1] rounded-xs text-[#006644] text-xs space-y-1">
        <strong class="font-bold text-sm">Inquiry Submitted Successfully!</strong>
        <p>Thank you, {{ prospectName }}. The landlady will review your message shortly.</p>
      </div>

      <form v-else @submit.prevent="submitInquiry" class="space-y-3 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Full Name *</label>
            <input v-model="prospectName" required type="text" placeholder="e.g. Gabriel Fernandez" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Contact Phone *</label>
            <input v-model="phone" required type="text" placeholder="e.g. 0917-123-4567" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Email Address</label>
          <input v-model="email" type="email" placeholder="e.g. gabriel@gmail.com" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Message / Questions</label>
          <textarea v-model="message" rows="3" placeholder="State your target move-in date, number of occupants, etc..." class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]"></textarea>
        </div>

        <button type="submit" class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white w-full justify-center py-2 text-xs flex items-center gap-1.5 cursor-pointer">
          <Send class="w-3.5 h-3.5" />
          <span>Send Direct Inquiry Message</span>
        </button>
      </form>
    </div>
  </div>
</template>
