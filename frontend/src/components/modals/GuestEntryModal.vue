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
    <div class="surface-card w-full max-w-sm shadow-2xl p-6 space-y-4 rounded-2xl animate-in fade-in zoom-in-95 duration-150 my-6 bg-white border border-border">
      
      <div class="flex justify-between items-start border-b border-border pb-3">
        <div class="flex items-center gap-2.5">
          <div class="size-8 rounded-xl bg-blue-50 text-primary ring-1 ring-blue-200 flex items-center justify-center">
            <Sparkles class="size-4" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-foreground">Public Guest Entry</h3>
            <p class="text-xs text-muted-foreground">Browse 33 available units and submit inquiries.</p>
          </div>
        </div>
        <button @click="closeModal" class="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted border border-border cursor-pointer">
          <X class="size-4" />
        </button>
      </div>

      <form @submit.prevent="handleGuestEntry" class="space-y-4 text-xs">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Guest Full Name</label>
          <input 
            type="text" 
            value="Maria Santos" 
            class="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors" 
            required 
          />
        </div>
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Mobile Contact (Optional)</label>
          <input 
            type="tel" 
            placeholder="0917-123-4567" 
            class="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors" 
          />
        </div>

        <div class="pt-3 border-t border-border flex justify-end gap-2.5">
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
