<!--
  @file components/modals/GuestEntryModal.vue
  @description Public Guest visitor entry info modal.
-->
<script setup lang="ts">
import { isGuestEntryModalOpen, activeRole } from '@/lib/systemState';
import { useRouter } from 'vue-router';
import { X, UserCheck } from 'lucide-vue-next';

const router = useRouter();

function closeModal() {
  isGuestEntryModalOpen.value = false;
}

function handleGuestEntry() {
  activeRole.value = 'guest';
  closeModal();
  router.push('/public');
}
</script>

<template>
  <div v-if="isGuestEntryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-sm shadow-xl p-6 space-y-4">
      <div class="flex justify-between items-center border-b border-[#dfe1e6] pb-2">
        <h3 class="text-sm font-bold text-[#172b4d]">Public Guest Entry</h3>
        <button @click="closeModal"><X class="w-4 h-4 text-[#5e6c84]" /></button>
      </div>

      <form @submit.prevent="handleGuestEntry" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Guest Full Name</label>
          <input type="text" value="Maria Santos" class="jira-input" required />
        </div>
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Mobile Contact (Optional)</label>
          <input type="tel" value="0917-123-4567" class="jira-input" />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button type="button" @click="closeModal" class="jira-btn-secondary">Cancel</button>
          <button type="submit" class="jira-btn-primary flex items-center gap-1"><UserCheck class="w-3.5 h-3.5" /> Enter Guest Showcase</button>
        </div>
      </form>
    </div>
  </div>
</template>
