<script setup lang="ts">
import { isTenantLoginModalOpen, activeRole } from '@/lib/systemState';
import { useRouter } from 'vue-router';
import { X, LogIn, KeyRound } from 'lucide-vue-next';

const router = useRouter();

function closeModal() {
  isTenantLoginModalOpen.value = false;
}

function handleLogin() {
  activeRole.value = 'tenant';
  closeModal();
  router.push('/tenant');
}
</script>

<template>
  <div v-if="isTenantLoginModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto" @click.self="closeModal">
    <div class="surface-card w-full max-w-sm shadow-2xl p-6 space-y-4 rounded-2xl animate-in fade-in zoom-in-95 duration-150 my-6 bg-white border border-[#e7e5e4]">
      
      <div class="flex justify-between items-start border-b border-[#e7e5e4] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="size-8 rounded-xl bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200 flex items-center justify-center">
            <KeyRound class="size-4" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Resident Login</h3>
            <p class="text-xs text-[#71717a]">Access your room statement &amp; tickets.</p>
          </div>
        </div>
        <button @click="closeModal" class="grid size-8 place-items-center rounded-full text-[#71717a] hover:bg-[#f5f5f4] border border-[#e7e5e4] cursor-pointer">
          <X class="size-4" />
        </button>
      </div>

      <div class="p-3 bg-blue-50/70 border border-blue-200/60 text-[#0c66e4] text-xs rounded-xl">
        Demo Login: Unit <strong class="font-mono text-[#1c1917]">204 / 2A</strong> • Pass: <strong class="font-mono text-[#1c1917]">tenant123</strong>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4 text-xs">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">Assigned Unit Code</label>
          <input 
            type="text" 
            value="2A" 
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm font-bold text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors" 
            required 
          />
        </div>
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">Password</label>
          <input 
            type="password" 
            value="tenant123" 
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] px-3.5 text-sm text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors" 
            required 
          />
        </div>

        <div class="pt-3 border-t border-[#e7e5e4] flex justify-end gap-2.5">
          <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">
            <LogIn class="size-3.5 text-white" />
            <span>Login to Portal</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
