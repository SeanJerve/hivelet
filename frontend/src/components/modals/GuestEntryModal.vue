<script setup lang="ts">
import { isGuestEntryModalOpen, activeRole } from '@/lib/systemState';
import { useRouter } from 'vue-router';
import { X, UserCheck, Sparkles } from 'lucide-vue-next';

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
  <div v-if="isGuestEntryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1917]/50 backdrop-blur-xs p-4 overflow-y-auto">
    <div class="surface-card w-full max-w-sm shadow-2xl p-6 space-y-4 rounded-2xl animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex justify-between items-start border-b border-[#e7e5e4] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#fbf6ee] text-[#f59e0b] flex items-center justify-center">
            <Sparkles class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Public Guest Entry</h3>
            <p class="text-xs text-[#71717a]">Browse 32 available units and submit inquiries.</p>
          </div>
        </div>
        <button @click="closeModal" class="w-8 h-8 rounded-full flex items-center justify-center text-[#71717a] hover:bg-[#f5f5f4] border border-[#e7e5e4]">
          <X class="w-4 h-4" />
        </button>
      </div>

      <form @submit.prevent="handleGuestEntry" class="space-y-4 text-xs">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">Guest Full Name</label>
          <input type="text" value="Maria Santos" class="form-input text-xs" required />
        </div>
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">Mobile Contact (Optional)</label>
          <input type="tel" value="0917-123-4567" class="form-input text-xs" />
        </div>

        <div class="pt-3 border-t border-[#e7e5e4] flex justify-end gap-2.5">
          <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">
            <UserCheck class="size-3.5 text-[#f59e0b]" />
            <span>Enter Guest Showcase</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
