<script setup lang="ts">
import { computed } from 'vue';
import { isTicketHoverModalOpen, activeHoverTicket, resolveTicket } from '@/lib/systemState';
import { CheckCircle2 } from 'lucide-vue-next';
import WsModal from '@/components/ui/WsModal.vue';
import StatusPill from '@/components/overview/StatusPill.vue';

const isDone = computed(
  () => activeHoverTicket.value?.status === 'Resolved' || activeHoverTicket.value?.status === 'Closed'
);

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
  <WsModal
    v-if="isTicketHoverModalOpen && activeHoverTicket"
    :title="activeHoverTicket.title"
    :subtitle="`Unit ${activeHoverTicket.unit.toUpperCase()}, reported ${activeHoverTicket.reported}`"
    size="md"
    @close="closeModal"
  >
    <div class="flex flex-wrap items-center gap-2">
      <StatusPill :tone="activeHoverTicket.priority === 'Emergency' || activeHoverTicket.priority === 'High' ? 'overdue' : 'neutral'">
        {{ activeHoverTicket.priority }} priority
      </StatusPill>
      <StatusPill :tone="isDone ? 'paid' : 'verify'">{{ activeHoverTicket.status === 'Open' ? 'Submitted' : activeHoverTicket.status }}</StatusPill>
    </div>

    <dl class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-2xl border border-line p-4">
        <dt class="text-xs text-ink-faint">Category</dt>
        <dd class="mt-1 text-sm font-medium">{{ activeHoverTicket.category }}</dd>
      </div>
      <div class="rounded-2xl border border-line p-4">
        <dt class="text-xs text-ink-faint">Technician</dt>
        <dd class="mt-1 text-sm font-medium">{{ activeHoverTicket.technician || 'Unassigned' }}</dd>
      </div>
    </dl>

    <div v-if="activeHoverTicket.description">
      <h3 class="text-sm font-semibold">What the resident reported</h3>
      <p class="mt-1 text-sm leading-6 text-ink-soft">{{ activeHoverTicket.description }}</p>
    </div>

    <div v-if="activeHoverTicket.photo">
      <h3 class="text-sm font-semibold">Photo from the resident</h3>
      <a
        :href="activeHoverTicket.photo"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 block overflow-hidden rounded-2xl border border-line"
      >
        <img :src="activeHoverTicket.photo" alt="Photo attached by the resident" class="max-h-64 w-full object-contain bg-canvas" />
      </a>
    </div>

    <template #actions>
      <button type="button" class="pill-btn" @click="closeModal">Close</button>
      <!-- Said "Close & Resolve Ticket" while writing only 'Resolved'. -->
      <button v-if="!isDone" type="button" class="pill-btn-brand" @click="handleResolve">
        <CheckCircle2 class="size-4" aria-hidden="true" />
        Mark resolved
      </button>
    </template>
  </WsModal>
</template>
