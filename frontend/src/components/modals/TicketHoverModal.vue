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
    <div class="surface-card w-full max-w-lg shadow-2xl overflow-hidden rounded-2xl bg-white animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex items-center justify-between p-6 pb-4 border-b border-border">
        <div class="flex items-center gap-2.5">
          <div class="size-9 rounded-xl bg-blue-50 text-primary ring-1 ring-blue-200 flex items-center justify-center">
            <Wrench class="size-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-foreground">
              Ticket Details — Unit {{ activeHoverTicket.unit }}
            </h3>
            <p class="text-xs text-muted-foreground">ID: {{ activeHoverTicket.id }} • {{ activeHoverTicket.reported }}</p>
          </div>
        </div>
        <button @click="closeModal" class="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted border border-border cursor-pointer">
          <X class="size-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-foreground">
        <div class="flex justify-between items-center p-4 bg-background border border-border rounded-xl">
          <div>
            <p class="font-bold text-sm text-foreground">{{ activeHoverTicket.title }}</p>
            <p class="text-muted-foreground mt-0.5">Reported: {{ activeHoverTicket.reported }} · {{ activeHoverTicket.category }}</p>
          </div>
          <span :class="[
            'badge-soft text-xs font-bold',
            activeHoverTicket.priority === 'Emergency' ? 'badge-danger' :
            activeHoverTicket.priority === 'High' ? 'badge-warning' : 'badge-blue'
          ]">
            {{ activeHoverTicket.priority }} Priority
          </span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 border border-border bg-white rounded-xl space-y-1">
            <p class="font-bold text-muted-foreground text-[10px] uppercase flex items-center gap-1"><User class="size-3.5" /> Unit</p>
            <p class="font-semibold text-sm text-foreground">Unit {{ activeHoverTicket.unit }}</p>
            <p class="text-muted-foreground text-xs">{{ activeHoverTicket.category }}</p>
          </div>
          <div class="p-3.5 border border-border bg-white rounded-xl space-y-1">
            <p class="font-bold text-muted-foreground text-[10px] uppercase flex items-center gap-1"><Wrench class="size-3.5" /> Assigned Tech</p>
            <p class="font-semibold text-sm text-foreground">{{ activeHoverTicket.technician }}</p>
            <p class="text-muted-foreground text-xs">Technician Assigned</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-bold text-muted-foreground text-[10px] uppercase">Issue Description</p>
          <p class="p-3.5 bg-background border border-border rounded-xl leading-relaxed text-[#44403c]">
            "{{ activeHoverTicket.description }}"
          </p>
        </div>

        <div v-if="activeHoverTicket.photo" class="space-y-1">
          <p class="font-bold text-muted-foreground text-[10px] uppercase">Resident Photo Attachment</p>
          <div class="rounded-xl border border-border p-2 bg-background flex flex-col items-center">
            <a :href="activeHoverTicket.photo" target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-lg">
              <img :src="activeHoverTicket.photo" alt="Attached photo" class="max-h-48 w-auto object-contain rounded-lg shadow-xs" />
            </a>
          </div>
        </div>
      </div>

      <div class="p-4 px-6 border-t border-border flex justify-between items-center">
        <span v-if="activeHoverTicket.status === 'Resolved'" class="badge-soft badge-success text-xs font-bold">
          Resolved
        </span>
        <button v-else @click="handleResolve" class="btn-primary">
          <CheckCircle2 class="size-3.5 text-white" />
          <span>Close &amp; Resolve Ticket</span>
        </button>

        <button @click="closeModal" class="btn-secondary">Close Window</button>
      </div>
    </div>
  </div>
</template>
