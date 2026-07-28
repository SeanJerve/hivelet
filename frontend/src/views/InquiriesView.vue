<script setup lang="ts">
/**
 * @component InquiriesView
 * @description Centralized Public Inquiry Inbox for prospective tenant communication.
 * @systemBibleRef Section 5.4 - Centralized Inquiries & Messenger Communication
 * @rationale Replaces fragmented Facebook Messenger / SMS channels with a unified inquiry inbox.
 * @innovations Provides prospect conversion tracking to seamlessly convert approved inquiries into tenant profiles.
 */
import { ref } from 'vue';
import { MessageSquare, Search, Mail, Phone, Calendar, ArrowRight, CheckCircle2 } from 'lucide-vue-next';

const inquiries = ref([
  { id: 101, prospectName: 'Gabriel Fernandez', room: 'Room 103 (1-Bedroom)', phone: '0927-111-2222', email: 'gabriel.f@gmail.com', date: '2026-07-27', status: 'Pending Review', message: 'Hi! Is Room 103 still available for move-in next month? We are 2 working professionals.' },
  { id: 102, prospectName: 'Samantha Cruz', room: 'Room 204 (1-Bedroom)', phone: '0917-333-4444', email: 'sam.cruz@yahoo.com', date: '2026-07-26', status: 'Replied', message: 'Good afternoon, I would like to schedule a viewing this Friday around 2 PM if possible.' },
  { id: 103, prospectName: 'Jerome Mercado', room: 'Room 306 (Studio)', phone: '0998-555-6666', email: 'j.mercado@outlook.com', date: '2026-07-25', status: 'Converted', message: 'Inquiring about studio room deposit requirements and water billing policies.' },
]);

const search = ref('');
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
      <div v-for="inq in inquiries" :key="inq.id" class="jira-card p-4 space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dfe1e6] pb-2">
          <div>
            <span class="font-bold text-[#172b4d] text-sm">{{ inq.prospectName }}</span>
            <span class="text-xs text-[#6b778c] ml-2">• Inquiring for <strong class="text-[#0c66e4]">{{ inq.room }}</strong></span>
          </div>

          <span 
            :class="[
              'jira-badge',
              inq.status === 'Pending Review' ? 'jira-badge-warning' : inq.status === 'Replied' ? 'jira-badge-progress' : 'jira-badge-done'
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

          <button class="jira-btn-secondary text-[11px] py-1 px-2.5">
            <span>Reply / Convert to Tenant</span>
            <ArrowRight class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
