<script setup lang="ts">
import { isTicketHoverModalOpen, activeHoverTicket, resolveTicket } from '@/lib/systemState';
import { X, CheckCircle2, Wrench, User } from 'lucide-vue-next';

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
  <div v-if="isTicketHoverModalOpen && activeHoverTicket" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
    <div class="surface-card w-full max-w-lg shadow-2xl overflow-hidden rounded-2xl bg-white animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex items-center justify-between p-6 pb-4 border-b border-[#e7e5e4]">
        <div class="flex items-center gap-2.5">
          <div class="grid size-9 place-items-center rounded-xl bg-[#fbf6ee] text-[#8a5814]">
            <Wrench class="size-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">
              Ticket Details — Unit {{ activeHoverTicket.unit }}
            </h3>
            <p class="text-xs text-[#71717a]">ID: {{ activeHoverTicket.id }} • {{ activeHoverTicket.reported }}</p>
          </div>
        </div>
        <button @click="closeModal" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4]">
          <X class="size-5" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-[#1c1917]">
        <div class="flex justify-between items-center p-4 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
          <div>
            <p class="font-bold text-sm text-[#1c1917]">{{ activeHoverTicket.title }}</p>
            <p class="text-[#71717a] mt-0.5">Reported: {{ activeHoverTicket.reported }} · {{ activeHoverTicket.category }}</p>
          </div>
          <span :class="[
            'badge-soft px-2.5 py-1 text-xs font-bold',
            activeHoverTicket.priority === 'Emergency' ? 'badge-danger' :
            activeHoverTicket.priority === 'High' ? 'badge-warning' : 'badge-info'
          ]">
            {{ activeHoverTicket.priority }} Priority
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 border border-[#e7e5e4] bg-white rounded-xl space-y-1">
            <p class="font-bold text-[#71717a] text-[10px] uppercase flex items-center gap-1"><User class="size-3.5" /> Unit</p>
            <p class="font-semibold text-sm text-[#1c1917]">Unit {{ activeHoverTicket.unit }}</p>
            <p class="text-[#71717a] text-xs">{{ activeHoverTicket.category }}</p>
          </div>
          <div class="p-3.5 border border-[#e7e5e4] bg-white rounded-xl space-y-1">
            <p class="font-bold text-[#71717a] text-[10px] uppercase flex items-center gap-1"><Wrench class="size-3.5" /> Assigned Tech</p>
            <p class="font-semibold text-sm text-[#1c1917]">{{ activeHoverTicket.technician }}</p>
            <p class="text-[#71717a] text-xs">Technician Assigned</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-bold text-[#71717a] text-[10px] uppercase">Issue Description</p>
          <p class="p-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl leading-relaxed text-[#44403c]">
            "{{ activeHoverTicket.description }}"
          </p>
        </div>

        <div v-if="activeHoverTicket.photo" class="space-y-1">
          <p class="font-bold text-[#71717a] text-[10px] uppercase">Resident Photo Attachment</p>
          <div class="rounded-xl border border-[#e7e5e4] p-2 bg-[#fafaf9] flex flex-col items-center">
            <a :href="activeHoverTicket.photo" target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-lg">
              <img :src="activeHoverTicket.photo" alt="Attached photo" class="max-h-48 w-auto object-contain rounded-lg shadow-xs" />
            </a>
          </div>
        </div>
      </div>

      <div class="p-4 px-6 border-t border-[#e7e5e4] flex justify-between items-center">
        <span v-if="activeHoverTicket.status === 'Resolved'" class="badge-soft badge-success px-3 py-1 text-xs font-bold">
          ✓ Resolved
        </span>
        <button v-else @click="handleResolve" class="btn-primary">
          <CheckCircle2 class="size-3.5" />
          <span>Close &amp; Resolve Ticket</span>
        </button>

        <button @click="closeModal" class="btn-secondary">Close Window</button>
      </div>
    </div>
  </div>
</template>
