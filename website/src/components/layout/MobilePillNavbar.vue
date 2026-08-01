<!--
  @file components/layout/MobilePillNavbar.vue
  @description Floating bottom pill navigation bar for mobile screens (Inspired by Images 4 & 5).
-->
<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { activeRole } from '@/lib/systemState';
import { Home, Shield, User, MessageSquare } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

function navTo(path: string, role: 'admin' | 'tenant' | 'guest') {
  activeRole.value = role;
  router.push(path);
}
</script>

<template>
  <div class="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
    <div class="bg-[#091e42]/95 backdrop-blur-md text-white p-2 rounded-full shadow-2xl border border-slate-700 flex items-center justify-around">
      <button
        @click="navTo('/', 'guest')"
        :class="['p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5 cursor-pointer', route.path === '/' ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white']"
      >
        <Home class="w-4 h-4" />
      </button>

      <button
        @click="navTo('/admin', 'admin')"
        :class="['p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5 cursor-pointer', route.path.startsWith('/admin') ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white']"
      >
        <Shield class="w-4 h-4" />
      </button>

      <button
        @click="navTo('/tenant', 'tenant')"
        :class="['p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5 cursor-pointer', route.path.startsWith('/tenant') ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white']"
      >
        <User class="w-4 h-4" />
      </button>

      <button
        @click="navTo('/inquiries', 'admin')"
        :class="['p-2.5 rounded-full transition-all flex flex-col items-center gap-0.5 cursor-pointer', route.path.startsWith('/inquiries') ? 'bg-[#0c66e4] text-white shadow-lg' : 'text-slate-400 hover:text-white']"
      >
        <MessageSquare class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
