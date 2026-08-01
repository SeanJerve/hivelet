<!--
  @file components/modals/TenantLoginModal.vue
  @description Active Tenant portal login modal.
-->
<script setup lang="ts">
import { isTenantLoginModalOpen, activeRole } from '@/lib/systemState';
import { useRouter } from 'vue-router';
import { X, LogIn } from 'lucide-vue-next';

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
  <div v-if="isTenantLoginModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-sm shadow-xl p-6 space-y-4">
      <div class="flex justify-between items-center border-b border-[#dfe1e6] pb-2">
        <h3 class="text-sm font-bold text-[#172b4d]">Active Tenant Portal Entry</h3>
        <button @click="closeModal"><X class="w-4 h-4 text-[#5e6c84]" /></button>
      </div>

      <div class="p-2 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xs">
        Demo Account: Room <code>204</code> | Password <code>tenant123</code>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-3 text-xs">
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Room Number / ID</label>
          <input type="text" value="204" class="jira-input" required />
        </div>
        <div>
          <label class="block font-bold text-[#5e6c84] mb-1">Password</label>
          <input type="password" value="tenant123" class="jira-input" required />
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button type="button" @click="closeModal" class="jira-btn-secondary">Cancel</button>
          <button type="submit" class="jira-btn-primary flex items-center gap-1"><LogIn class="w-3.5 h-3.5" /> Login to Tenant Portal</button>
        </div>
      </form>
    </div>
  </div>
</template>
