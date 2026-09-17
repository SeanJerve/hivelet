<script setup lang="ts">
import { isTicketHoverModalOpen, activeHoverTicket, resolveTicket } from '@/lib/systemState';
import { X, CheckCircle2, Wrench, User, AlertTriangle, Clock } from 'lucide-vue-next';

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
    <div class="rounded-tile bg-tile w-full max-w-lg shadow-2xl overflow-hidden rounded-tile bg-tile animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex items-center justify-between p-6 pb-4 border-b border-line">
        <div class="flex items-center gap-2.5">
          <div class="size-9 rounded-xl bg-brand-soft text-brand ring-1 ring-brand-soft flex items-center justify-center">
            <Wrench class="size-5" />
          </div>
          <div>
            <h3 class="font-semibold text-base text-ink">
              Ticket Details — Unit {{ activeHoverTicket.unit }}
            </h3>
            <p class="text-xs text-ink-soft">ID: {{ activeHoverTicket.id }} • {{ activeHoverTicket.reported }}</p>
          </div>
        </div>
        <button @click="closeModal" class="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-canvas border border-line cursor-pointer">
          <X class="size-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-ink">
        <div class="flex justify-between items-center p-4 bg-canvas border border-line rounded-xl">
          <div>
            <p class="font-semibold text-sm text-ink">{{ activeHoverTicket.title }}</p>
            <p class="text-ink-soft mt-0.5">Reported: {{ activeHoverTicket.reported }} · {{ activeHoverTicket.category }}</p>
          </div>
          <span :class="[ 'badge-soft text-xs font-semibold', activeHoverTicket.priority === 'Emergency' ? 'badge-danger' : activeHoverTicket.priority === 'High' ? 'badge-warning' : 'badge-blue' ]">
            {{ activeHoverTicket.priority }} Priority
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 border border-line bg-tile rounded-xl space-y-1">
            <p class="font-semibold text-ink-soft text-[10px] uppercase flex items-center gap-1"><User class="size-3.5" /> Unit</p>
            <p class="font-semibold text-sm text-ink">Unit {{ activeHoverTicket.unit }}</p>
            <p class="text-ink-soft text-xs">{{ activeHoverTicket.category }}</p>
          </div>
          <div class="p-3.5 border border-line bg-tile rounded-xl space-y-1">
            <p class="font-semibold text-ink-soft text-[10px] uppercase flex items-center gap-1"><Wrench class="size-3.5" /> Assigned Tech</p>
            <p class="font-semibold text-sm text-ink">{{ activeHoverTicket.technician }}</p>
            <p class="text-ink-soft text-xs">Technician Assigned</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-semibold text-ink-soft text-[10px] uppercase">Issue Description</p>
          <p class="p-3.5 bg-canvas border border-line rounded-xl leading-relaxed text-[#44403c]">
            "{{ activeHoverTicket.description }}"
          </p>
        </div>

        <div v-if="activeHoverTicket.photo" class="space-y-1">
          <p class="font-semibold text-ink-soft text-[10px] uppercase">Resident Photo Attachment</p>
          <div class="rounded-xl border border-line p-2 bg-canvas flex flex-col items-center">
            <a :href="activeHoverTicket.photo" target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-lg">
              <img :src="activeHoverTicket.photo" alt="Attached photo" class="max-h-48 w-auto object-contain rounded-lg" />
            </a>
          </div>
        </div>
      </div>

      <div class="p-4 px-6 border-t border-line flex justify-between items-center">
        <span
          v-if="activeHoverTicket.status === 'Resolved' || activeHoverTicket.status === 'Closed'"
          :class="['badge-soft text-xs font-semibold', activeHoverTicket.status === 'Closed' ? 'badge-neutral' : 'badge-success']"
        >
          {{ activeHoverTicket.status }}
        </span>
        <!-- Said "Close & Resolve Ticket" while writing only 'Resolved'. -->
        <button v-else @click="handleResolve" class="pill-btn-brand">
          <CheckCircle2 class="size-3.5 text-white" />
          <span>Mark Resolved</span>
        </button>

        <button @click="closeModal" class="pill-btn">Close Window</button>
      </div>
    </div>
  </div>
</template>
