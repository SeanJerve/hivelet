<!--
  @file components/modals/TicketHoverModal.vue
  @description Diagonal arrow expand modal displaying detailed maintenance ticket information.
-->
<script setup lang="ts">
import { isTicketHoverModalOpen, activeHoverTicket, resolveTicket } from '@/lib/systemState';
import { X, CheckCircle, Wrench, Calendar, User, Phone } from 'lucide-vue-next';

function closeModal() {
  isTicketHoverModalOpen.value = false;
}

function handleResolve() {
  if (activeHoverTicket.value) {
    resolveTicket(activeHoverTicket.value.id);
  }
  closeModal();
}
</script>

<template>
  <div v-if="isTicketHoverModalOpen && activeHoverTicket" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <div class="flex justify-between items-center border-b border-[#dfe1e6] pb-3">
        <h3 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <Wrench class="w-4 h-4 text-[#0c66e4]" />
          <span>Ticket {{ activeHoverTicket.id }} — Unit {{ activeHoverTicket.room }}</span>
        </h3>
        <button @click="closeModal" class="p-1 hover:bg-[#ebecf0] rounded-xs cursor-pointer"><X class="w-4 h-4 text-[#5e6c84]" /></button>
      </div>

      <div class="space-y-3 text-xs">
        <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs space-y-1">
          <p class="font-bold text-base text-[#172b4d]">{{ activeHoverTicket.issue }}</p>
          <div class="flex items-center gap-2">
            <span class="jira-badge bg-red-100 text-red-800">{{ activeHoverTicket.priority }}</span>
            <span class="text-[#5e6c84] flex items-center gap-1"><Calendar class="w-3 h-3" /> {{ activeHoverTicket.date }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="p-2 border border-[#dfe1e6] rounded-xs">
            <span class="text-[#5e6c84] flex items-center gap-1"><User class="w-3 h-3" /> Tenant</span>
            <strong class="text-[#172b4d] block mt-0.5">{{ activeHoverTicket.tenant }}</strong>
          </div>
          <div class="p-2 border border-[#dfe1e6] rounded-xs">
            <span class="text-[#5e6c84] flex items-center gap-1"><Phone class="w-3 h-3" /> Contact</span>
            <span class="text-[#172b4d] font-mono block mt-0.5">{{ activeHoverTicket.phone }}</span>
          </div>
        </div>

        <div>
          <span class="font-bold text-[#5e6c84] block mb-1">Issue Description & Photo Attachment:</span>
          <p class="p-3 bg-white border border-[#dfe1e6] rounded-xs leading-relaxed text-[#172b4d]">
            {{ activeHoverTicket.desc }}
          </p>
        </div>

        <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-xs flex justify-between items-center text-blue-900">
          <span>Assigned Technician:</span>
          <strong class="font-bold">{{ activeHoverTicket.technician }}</strong>
        </div>
      </div>

      <div class="pt-2 flex justify-end gap-2 border-t border-[#dfe1e6]">
        <button @click="closeModal" class="jira-btn-secondary">Close</button>
        <button v-if="activeHoverTicket.status === 'OPEN'" @click="handleResolve" class="jira-btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1">
          <CheckCircle class="w-3.5 h-3.5" /> Mark resolved
        </button>
      </div>
    </div>
  </div>
</template>
