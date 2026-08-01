<!--
  @file components/layout/AppHeader.vue
  @description Corporate top navigation header featuring role portal mode switcher and live chat inbox trigger.
  @systemBibleRef Section 4 - Role Navigation & Authorization Boundaries
-->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { activeRole, isLiveChatheadOpen, activeInquirers } from '@/lib/systemState';
import { MessageSquare, Shield, User, Home } from 'lucide-vue-next';

const router = useRouter();

function switchRole(role: 'admin' | 'tenant' | 'guest') {
  activeRole.value = role;
  if (role === 'admin') router.push('/admin/overview');
  else if (role === 'tenant') router.push('/tenant');
  else router.push('/public');
}
</script>

<template>
  <header class="h-14 bg-[#ffffff] border-b border-[#dfe1e6] px-4 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 font-bold text-[#172b4d] text-sm tracking-tight">
        <span class="w-6 h-6 rounded-xs bg-[#0c66e4] text-white flex items-center justify-center text-xs font-mono">H</span>
        <span>HIVELET</span>
        <span class="text-[10px] text-[#5e6c84] font-normal uppercase border-l border-[#dfe1e6] pl-2 hidden sm:inline">Fe Galang Da Silva System</span>
      </div>
    </div>

    <!-- ROLE PORTAL MODE SWITCHER (APPROACH A) -->
    <div class="flex items-center gap-1 bg-[#f4f5f7] p-1 border border-[#dfe1e6] rounded-xs text-xs">
      <button
        @click="switchRole('admin')"
        :class="['px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1.5 transition-colors', activeRole === 'admin' ? 'bg-[#ffffff] text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84] hover:text-[#172b4d]']"
      >
        <Shield class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Landlady</span> Admin
      </button>

      <button
        @click="switchRole('tenant')"
        :class="['px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1.5 transition-colors', activeRole === 'tenant' ? 'bg-[#ffffff] text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84] hover:text-[#172b4d]']"
      >
        <User class="w-3.5 h-3.5" /> Tenant <span class="hidden sm:inline">Portal</span>
      </button>

      <button
        @click="switchRole('guest')"
        :class="['px-2.5 py-1 rounded-xs font-semibold flex items-center gap-1.5 transition-colors', activeRole === 'guest' ? 'bg-[#ffffff] text-[#0c66e4] shadow-2xs' : 'text-[#5e6c84] hover:text-[#172b4d]']"
      >
        <Home class="w-3.5 h-3.5" /> Public <span class="hidden sm:inline">Guest</span>
      </button>
    </div>

    <!-- Live Chat Inbox Button -->
    <div class="flex items-center gap-2">
      <button @click="isLiveChatheadOpen = !isLiveChatheadOpen" class="jira-btn-secondary text-xs flex items-center gap-1.5">
        <MessageSquare class="w-3.5 h-3.5 text-[#0c66e4]" />
        <span class="hidden sm:inline">Live Chat Inbox</span>
        <span class="jira-badge bg-[#0c66e4] text-white font-bold ml-1">{{ activeInquirers.length }}</span>
      </button>
    </div>
  </header>
</template>
