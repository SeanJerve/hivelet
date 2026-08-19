<!--
  @component InquiryModal
  @description Centered pop-up modal for prospective tenant inquiries with blurred background backdrop.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5.4 - Centralized Inquiries
  @rationale Replaces page jump with an in-place pop-up card featuring backdrop-blur-md, maintaining context while submitting direct inquiries to the Landlady Inbox.
  @innovations Simplified booking inquiry without redundant target unit dropdowns and date selectors, dynamic pre-filling when triggered from room cards.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { 
  isInquiryModalOpen, 
  inquiryPreselectedUnit, 
  activeInquirers, 
  isLiveChatheadOpen, 
  selectedInquirerId, 
  rooms,
  showToast
} from '@/lib/systemState';
import { X, Send, MessageSquare, CheckCircle2, ShieldCheck } from 'lucide-vue-next';

const prospectName = ref('');
const phone = ref('');
const email = ref('');
const message = ref('');
const isSubmitting = ref(false);
const isSubmitted = ref(false);

function closeModal() {
  isInquiryModalOpen.value = false;
  // Reset form after short delay
  setTimeout(() => {
    isSubmitted.value = false;
    prospectName.value = '';
    phone.value = '';
    email.value = '';
    message.value = '';
    inquiryPreselectedUnit.value = null;
  }, 300);
}

function handleDirectChat() {
  closeModal();
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}

function submitInquiry() {
  if (!prospectName.value.trim() || !phone.value.trim()) return;

  isSubmitting.value = true;

  const unitCode = inquiryPreselectedUnit.value || 'General';
  const targetRoom = rooms.find(r => r.unitCode === unitCode);
  const newInquirerId = `inq-${Date.now()}`;

  // Add to activeInquirers reactive store in systemState
  activeInquirers.push({
    id: newInquirerId,
    name: prospectName.value.trim(),
    room: unitCode,
    type: targetRoom ? targetRoom.type : 'Boarding Unit',
    price: targetRoom ? targetRoom.price : 4500,
    unread: true,
    messages: [
      {
        sender: 'Inquirer',
        time: 'Just now',
        text: message.value.trim() || `Hi Mrs. Fe Galang, I would like to inquire regarding ${unitCode !== 'General' ? `Unit ${unitCode}` : 'available boarding rooms'}. Contact: ${phone.value.trim()} (${email.value.trim() || 'No email provided'})`
      }
    ]
  });

  isSubmitting.value = false;
  isSubmitted.value = true;
  selectedInquirerId.value = newInquirerId;
  showToast('success', 'Inquiry Delivered', 'Your message was delivered to Mrs. Fe Galang.');
}
</script>

<template>
  <div 
    v-if="isInquiryModalOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
    @click.self="closeModal"
  >
    <div 
      class="jira-card w-full max-w-lg bg-white border border-[#dfe1e6] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      @click.stop
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#dfe1e6] bg-[#f4f5f7]">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-[#0c66e4] text-white flex items-center justify-center">
            <MessageSquare class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-[#172b4d] leading-tight">
              {{ inquiryPreselectedUnit ? `Inquire for Unit ${inquiryPreselectedUnit}` : 'Direct Booking Inquiry' }}
            </h3>
            <p class="text-[11px] text-[#5e6c84] leading-tight">Mrs. Fe Galang Da Silva Boarding House</p>
          </div>
        </div>

        <button 
          @click="closeModal" 
          class="p-1.5 hover:bg-[#ebecf0] rounded-md text-[#5e6c84] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Success State -->
      <div v-if="isSubmitted" class="p-6 space-y-4">
        <div class="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 space-y-2 text-xs">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <strong class="font-bold text-sm">Inquiry Submitted Successfully!</strong>
          </div>
          <p class="leading-relaxed">
            Thank you, <strong>{{ prospectName }}</strong>. Your inquiry {{ inquiryPreselectedUnit ? `for Unit ${inquiryPreselectedUnit}` : '' }} has been sent straight to Mrs. Fe Galang's Landlady Inbox.
          </p>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button 
            @click="handleDirectChat" 
            class="bg-[#0c66e4] hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <MessageSquare class="w-3.5 h-3.5" />
            <span>Open Live Messenger</span>
          </button>
          <button 
            @click="closeModal" 
            class="jira-btn-secondary text-xs"
          >
            Done
          </button>
        </div>
      </div>

      <!-- Inquiry Form -->
      <form v-else @submit.prevent="submitInquiry" class="p-6 space-y-4 text-xs">
        <div v-if="inquiryPreselectedUnit" class="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-blue-900">
          <span class="font-semibold">Target Unit:</span>
          <span class="font-bold text-xs bg-blue-600 text-white px-2.5 py-0.5 rounded-full">Unit {{ inquiryPreselectedUnit }}</span>
        </div>

        <div class="space-y-1">
          <label class="block font-bold text-[#5e6c84]">Full Name <span class="text-rose-500">*</span></label>
          <input 
            v-model="prospectName" 
            required 
            type="text" 
            placeholder="e.g. Juan Dela Cruz" 
            class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all"
          />
        </div>

        <div class="space-y-1">
          <label class="block font-bold text-[#5e6c84]">Contact Phone Number <span class="text-rose-500">*</span></label>
          <input 
            v-model="phone" 
            required 
            type="tel" 
            placeholder="e.g. 0917-123-4567" 
            class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all"
          />
        </div>

        <div class="space-y-1">
          <label class="block font-bold text-[#5e6c84]">Email Address (Optional)</label>
          <input 
            v-model="email" 
            type="email" 
            placeholder="e.g. juan@gmail.com" 
            class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all"
          />
        </div>

        <div class="space-y-1">
          <label class="block font-bold text-[#5e6c84]">Message / Preferred Move-in Questions</label>
          <textarea 
            v-model="message" 
            rows="3" 
            placeholder="State your preferred viewing time, target number of occupants, or questions..." 
            class="w-full p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-lg text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all"
          ></textarea>
        </div>

        <div class="pt-2 flex items-center justify-between border-t border-[#dfe1e6]">
          <div class="flex items-center gap-1.5 text-[11px] text-[#5e6c84]">
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-600" />
            <span>Direct to Landlady Inbox</span>
          </div>

          <div class="flex items-center gap-2">
            <button 
              type="button" 
              @click="closeModal" 
              class="jira-btn-secondary text-xs"
            >
              Cancel
            </button>

            <button 
              type="submit" 
              :disabled="isSubmitting"
              class="jira-btn-primary text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Send class="w-3.5 h-3.5" />
              <span>{{ isSubmitting ? 'Sending...' : 'Send Inquiry' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
