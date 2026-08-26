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
  <div v-if="isGuestEntryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto" @click.self="closeModal">
    <div class="surface-card w-full max-w-sm shadow-2xl p-6 space-y-4 rounded-2xl animate-in fade-in zoom-in-95 duration-150 my-6 bg-white border border-[#e7e5e4]">
      
      <div class="flex justify-between items-start border-b border-[#e7e5e4] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="size-8 rounded-xl bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200 flex items-center justify-center">
            <Sparkles class="size-4" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Public Guest Entry</h3>
            <p class="text-xs text-[#71717a]">Browse 32 available units and submit inquiries.</p>
          </div>
        </div>
        <button @click="closeModal" class="grid size-8 place-items-center rounded-full text-[#71717a] hover:bg-[#f5f5f4] border border-[#e7e5e4] cursor-pointer">
          <X class="size-4" />
        </button>
      </div>

      <form @submit.prevent="handleGuestEntry" class="space-y-4 text-xs">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">Guest Full Name</label>
          <input 
            type="text" 
            value="Maria Santos" 
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors" 
            required 
          />
        </div>
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">Mobile Contact (Optional)</label>
          <input 
            type="tel" 
            value="0917-123-4567" 
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors" 
          />
        </div>

        <div class="pt-3 border-t border-[#e7e5e4] flex justify-end gap-2.5">
          <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">
            <UserCheck class="size-3.5 text-white" />
            <span>Enter Guest Showcase</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
