<script setup lang="ts">
/**
 * @component PublicGuestView
 * @description Minimalist Corporate Public Property Catalog & Room Inquiry Portal.
 * @systemBibleRef Section 4 - Public Visitor Role & Section 5.4 - Centralized Inquiries
 * @rationale Provides prospective tenants with clear property specifications, room availability grids,
 *              and direct inquiry submission without distracting consumer marketing gimmicks.
 * @innovations Built a clean, mobile-first room availability grid with integrated direct inquiry modal.
 */
import { ref } from 'vue';
import { Building2, Search, Send, CheckCircle2, Info } from 'lucide-vue-next';

const publicRooms = ref([
  { id: '103', number: 'Room 103', floor: 1, type: '1-Bedroom Unit', capacity: 3, price: 6000, description: 'Spacious 1-bedroom unit with private bathroom and kitchen counter on the 1st floor.' },
  { id: '204', number: 'Room 204', floor: 2, type: '1-Bedroom Unit', capacity: 3, price: 6200, description: 'Second-floor 1-bedroom unit with good ventilation and dedicated submeter.' },
  { id: '306', number: 'Room 306', floor: 3, type: 'Studio Unit', capacity: 2, price: 4700, description: 'Third-floor quiet studio unit ideal for students or single professionals.' },
]);

const inquiryForm = ref({
  prospectName: '',
  phone: '',
  email: '',
  roomNumber: 'Room 103',
  message: ''
});

const inquirySubmitted = ref(false);

const submitInquiry = () => {
  if (!inquiryForm.value.prospectName || !inquiryForm.value.phone) return;
  inquirySubmitted.value = true;
};
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Property Header Banner -->
    <div class="jira-card p-6 bg-white space-y-2 border-l-4 border-l-[#0c66e4]">
      <span class="text-xs font-bold text-[#0c66e4] uppercase tracking-wider">Fe Galang Da Silva Boarding House</span>
      <h1 class="text-2xl font-bold text-[#172b4d]">Available Room Units Directory</h1>
      <p class="text-xs text-[#5e6c84] max-w-2xl">
        Centralized apartment management catalog. View verified available units across 3 floors and submit inquiries directly to the landlady.
      </p>
    </div>

    <!-- Available Units Grid -->
    <div class="space-y-4">
      <h2 class="text-base font-bold text-[#172b4d]">Currently Available Units (3)</h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="room in publicRooms" :key="room.id" class="jira-card p-4 flex flex-col justify-between space-y-3">
          <div>
            <div class="flex items-center justify-between mb-1">
              <h3 class="font-bold text-base text-[#172b4d]">{{ room.number }}</h3>
              <span class="jira-badge jira-badge-progress">AVAILABLE</span>
            </div>
            <p class="text-xs text-[#0c66e4] font-medium mb-2">{{ room.type }} • Floor {{ room.floor }}</p>
            <p class="text-xs text-[#5e6c84] leading-relaxed">{{ room.description }}</p>
          </div>

          <div class="border-t border-[#dfe1e6] pt-3 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-[#6b778c] block uppercase font-semibold">Monthly Rate</span>
              <strong class="text-base font-bold text-[#172b4d]">₱{{ room.price.toLocaleString() }}/mo</strong>
            </div>

            <button 
              @click="inquiryForm.roomNumber = room.number" 
              class="jira-btn-primary text-xs"
            >
              Inquire
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Inquiry Submission Form Card -->
    <div class="jira-card p-6 bg-white space-y-4 max-w-2xl">
      <div class="border-b border-[#dfe1e6] pb-3">
        <h2 class="text-base font-bold text-[#172b4d]">Submit Inquiry for {{ inquiryForm.roomNumber }}</h2>
        <p class="text-xs text-[#6b778c]">Your message will be sent directly to the landlady's central inbox.</p>
      </div>

      <div v-if="inquirySubmitted" class="p-4 bg-[#e3fcef] border border-[#abf5d1] rounded-xs text-[#006644] text-xs space-y-1">
        <strong class="font-bold text-sm">Inquiry Submitted Successfully!</strong>
        <p>Thank you, {{ inquiryForm.prospectName }}. The landlady will review your message shortly.</p>
      </div>

      <form v-else @submit.prevent="submitInquiry" class="space-y-3 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Full Name *</label>
            <input v-model="inquiryForm.prospectName" required type="text" placeholder="e.g. Gabriel Fernandez" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Contact Phone *</label>
            <input v-model="inquiryForm.phone" required type="text" placeholder="e.g. 0917-123-4567" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Email Address</label>
          <input v-model="inquiryForm.email" type="email" placeholder="e.g. gabriel@gmail.com" class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
        </div>

        <div>
          <label class="block font-semibold text-[#5e6c84] mb-1">Message / Questions</label>
          <textarea v-model="inquiryForm.message" rows="3" placeholder="State your target move-in date, number of occupants, etc..." class="w-full p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]"></textarea>
        </div>

        <button type="submit" class="jira-btn-primary w-full justify-center py-2 text-xs">
          <Send class="w-3.5 h-3.5" />
          <span>Send Inquiry Message</span>
        </button>
      </form>
    </div>
  </div>
</template>
