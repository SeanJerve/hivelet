<!--
  @file components/modals/TicketHoverModal.vue
  @description Hover pop-over details modal triggered by outward diagonal arrow expand button on dispatch table.
  @systemBibleRef Section 3.4 - Maintenance Dispatch & Ticket Management
-->
<script setup lang="ts">
import { isTicketHoverModalOpen, activeHoverTicket, resolveTicket } from '@/lib/systemState';
import { X, CheckCircle, Wrench, User, Phone, FileText } from 'lucide-vue-next';

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
    <div class="jira-card w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between p-4 border-b border-[#dfe1e6] bg-[#f4f5f7]">
        <h3 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <Wrench class="w-4 h-4 text-[#0c66e4]" />
          <span>Maintenance Ticket Details — Room {{ activeHoverTicket.room }}</span>
        </h3>
        <button @click="closeModal" class="p-1 hover:bg-[#ebecf0] rounded-xs text-[#5e6c84]">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-[#172b4d]">
        <div class="flex justify-between items-center p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
          <div>
            <p class="font-bold text-sm text-[#172b4d]">{{ activeHoverTicket.issue }}</p>
            <p class="text-[#5e6c84]">Reported Date: {{ activeHoverTicket.date }}</p>
          </div>
          <span :class="[
            'jira-badge text-xs font-bold uppercase',
            activeHoverTicket.priority === 'Emergency' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800'
          ]">
            {{ activeHoverTicket.priority }} Priority
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 border border-[#dfe1e6] rounded-xs space-y-1">
            <p class="font-bold text-[#5e6c84] flex items-center gap-1"><User class="w-3.5 h-3.5" /> Tenant Contact</p>
            <p class="font-semibold">{{ activeHoverTicket.tenant }}</p>
            <p class="text-[#5e6c84] flex items-center gap-1"><Phone class="w-3 h-3" /> {{ activeHoverTicket.phone }}</p>
          </div>
          <div class="p-3 border border-[#dfe1e6] rounded-xs space-y-1">
            <p class="font-bold text-[#5e6c84] flex items-center gap-1"><Wrench class="w-3.5 h-3.5" /> Assigned Tech</p>
            <p class="font-semibold">{{ activeHoverTicket.technician }}</p>
            <p class="text-[#5e6c84] flex items-center gap-1"><FileText class="w-3 h-3" /> Attachment: {{ activeHoverTicket.photo }}</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-bold text-[#5e6c84]">Issue Description:</p>
          <p class="p-3 bg-[#ffffff] border border-[#dfe1e6] rounded-xs leading-relaxed">
            "{{ activeHoverTicket.desc }}"
          </p>
        </div>
      </div>

      <div class="p-4 border-t border-[#dfe1e6] bg-[#f4f5f7] flex justify-between items-center">
        <span v-if="activeHoverTicket.status === 'RESOLVED'" class="jira-badge bg-emerald-100 text-emerald-800 font-bold">
          ✓ Ticket Resolved
        </span>
        <button v-else @click="handleResolve" class="jira-btn-primary bg-emerald-700 hover:bg-emerald-800 flex items-center gap-1.5">
          <CheckCircle class="w-3.5 h-3.5" /> Close & Resolve Ticket
        </button>

        <button @click="closeModal" class="jira-btn-secondary">Close Window</button>
      </div>
    </div>
  </div>
</template>
