<!--
  @file components/layout/AppNavbar.vue
  @description Horizon dark/light top navigation header with role switcher bar.
-->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { activeRole, isLiveChatheadOpen, activeInquirers } from '@/lib/systemState';
import { Shield, User, Home, MessageSquare } from 'lucide-vue-next';

const router = useRouter();

function switchRole(role: 'admin' | 'tenant' | 'guest') {
  activeRole.value = role;
  if (role === 'admin') router.push('/admin');
  else if (role === 'tenant') router.push('/tenant');
  else router.push('/');
}
</script>

<template>
  <header class="h-16 bg-[#091e42] text-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shadow-md">
    <div class="flex items-center gap-3">
      <router-link to="/" class="flex items-center gap-2 font-bold text-lg tracking-tight">
        <span class="w-8 h-8 rounded-lg bg-[#0c66e4] text-white flex items-center justify-center font-mono font-extrabold shadow-md">H</span>
        <span class="font-display">HIVELET</span>
      </router-link>
    </div>

    <!-- Role Switcher Tabs -->
    <div class="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
      <button
        @click="switchRole('guest')"
        :class="['px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer', activeRole === 'guest' ? 'bg-[#0c66e4] text-white shadow-md' : 'text-slate-300 hover:text-white']"
      >
        <Home class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Public</span> Guest
      </button>

      <button
        @click="switchRole('admin')"
        :class="['px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer', activeRole === 'admin' ? 'bg-[#0c66e4] text-white shadow-md' : 'text-slate-300 hover:text-white']"
      >
        <Shield class="w-3.5 h-3.5" /> Landlady <span class="hidden sm:inline">Admin</span>
      </button>

      <button
        @click="switchRole('tenant')"
        :class="['px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer', activeRole === 'tenant' ? 'bg-[#0c66e4] text-white shadow-md' : 'text-slate-300 hover:text-white']"
      >
        <User class="w-3.5 h-3.5" /> Tenant <span class="hidden sm:inline">Portal</span>
      </button>
    </div>

    <!-- Live Chat Inbox Button -->
    <div class="flex items-center gap-2">
      <button @click="isLiveChatheadOpen = !isLiveChatheadOpen" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer">
        <MessageSquare class="w-3.5 h-3.5 text-sky-400" />
        <span class="hidden sm:inline">Live Chat</span>
        <span class="bg-[#0c66e4] text-white font-bold px-1.5 py-0.5 rounded-md text-[10px]">{{ activeInquirers.length }}</span>
      </button>
    </div>
  </header>
</template>
