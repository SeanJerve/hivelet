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
  <div v-if="isTenantLoginModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1917]/50 backdrop-blur-xs p-4 overflow-y-auto">
    <div class="surface-card w-full max-w-sm shadow-2xl p-6 space-y-4 rounded-2xl animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex justify-between items-start border-b border-[#e7e5e4] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#fbf6ee] text-[#f59e0b] flex items-center justify-center">
            <KeyRound class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-base text-[#1c1917]">Resident Login</h3>
            <p class="text-xs text-[#71717a]">Access your room statement &amp; tickets.</p>
          </div>
        </div>
        <button @click="closeModal" class="w-8 h-8 rounded-full flex items-center justify-center text-[#71717a] hover:bg-[#f5f5f4] border border-[#e7e5e4]">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-3 bg-[#f0f9ff] border border-[#b9e6fe] text-[#075985] text-xs rounded-xl">
        Demo Login: Unit <strong class="font-mono">204 / 2A</strong> • Pass: <strong class="font-mono">tenant123</strong>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4 text-xs">
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">Assigned Unit Code</label>
          <input type="text" value="2A" class="form-input text-xs font-bold" required />
        </div>
        <div>
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#71717a] mb-1.5">Password</label>
          <input type="password" value="tenant123" class="form-input text-xs" required />
        </div>

        <div class="pt-3 border-t border-[#e7e5e4] flex justify-end gap-2.5">
          <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">
            <LogIn class="size-3.5" />
            <span>Login to Portal</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
