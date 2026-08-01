<!--
  @file views/InquiriesView.vue
  @description Centralized Public Inquiry Inbox with interactive live chat reply trigger for Hivelet website.
  @systemBibleRef Section 5.4 - Centralized Inquiries & Messenger Communication
-->
<script setup lang="ts">
import { ref } from 'vue';
import { activeInquirers, isLiveChatheadOpen, selectedInquirerId } from '@/lib/systemState';
import { ArrowRight, MessageSquare } from 'lucide-vue-next';

const inquiries = ref([
  { id: 'inq-1', prospectName: 'Maria Santos', room: 'Unit 1c (1-Bedroom)', phone: '0927-111-2222', email: 'maria.santos@gmail.com', date: '2026-07-27', status: 'Pending Review', message: 'Hi! Is Unit 1c still available for move-in next week? We are 2 working professionals.' },
  { id: 'inq-2', prospectName: 'Alex Gonzaga', room: 'Unit B3F (1-Bedroom)', phone: '0917-333-4444', email: 'alex.g@yahoo.com', date: '2026-07-26', status: 'Replied', message: 'Good morning! Inquiring about Back Apartment B3F deposit requirements.' },
  { id: 'inq-3', prospectName: 'Jerome Mercado', room: 'Unit 3f (Studio)', phone: '0998-555-6666', email: 'j.mercado@outlook.com', date: '2026-07-25', status: 'Converted', message: 'Inquiring about studio room deposit requirements and water billing policies.' },
]);

function openReplyChat(inqId: string) {
  // Ensure inquirer exists in activeInquirers store
  let target = activeInquirers.find(i => i.id === inqId);
  if (!target) {
    const item = inquiries.value.find(x => x.id === inqId);
    if (item) {
      activeInquirers.push({
        id: item.id,
        name: item.prospectName,
        room: item.room,
        type: 'Unit Inquirer',
        price: 6000,
        unread: false,
        messages: [
          { sender: 'Inquirer', time: 'Today', text: item.message }
        ]
      });
    }
  }
  selectedInquirerId.value = inqId;
  isLiveChatheadOpen.value = true;
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Inquiries Inbox</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Public Prospect Inquiries</h1>
      </div>
    </div>

    <!-- Inquiries Cards Stack -->
    <div class="space-y-3">
      <div v-for="inq in inquiries" :key="inq.id" class="jira-card p-4 space-y-2 bg-white border border-[#dfe1e6]">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dfe1e6] pb-2">
          <div>
            <span class="font-bold text-[#172b4d] text-sm">{{ inq.prospectName }}</span>
            <span class="text-xs text-[#6b778c] ml-2">• Inquiring for <strong class="text-[#0c66e4]">{{ inq.room }}</strong></span>
          </div>

          <span 
            :class="[
              'px-2 py-0.5 text-xs font-bold rounded-full',
              inq.status === 'Pending Review' ? 'bg-amber-100 text-amber-800' : inq.status === 'Replied' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
            ]"
          >
            {{ inq.status }}
          </span>
        </div>

        <p class="text-xs text-[#172b4d] bg-[#f4f5f7] p-2.5 rounded-xs border border-[#dfe1e6]">
          "{{ inq.message }}"
        </p>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#6b778c] pt-1">
          <div class="flex items-center gap-4">
            <span>Phone: {{ inq.phone }}</span>
            <span>Email: {{ inq.email }}</span>
            <span>Date: {{ inq.date }}</span>
          </div>

          <button 
            @click="openReplyChat(inq.id)"
            class="jira-btn-primary bg-[#054e38] hover:bg-[#003626] text-white text-[11px] py-1.5 px-3 rounded-md font-semibold cursor-pointer flex items-center gap-1.5"
          >
            <MessageSquare class="w-3.5 h-3.5" />
            <span>Reply & Chat with Prospect</span>
            <ArrowRight class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
