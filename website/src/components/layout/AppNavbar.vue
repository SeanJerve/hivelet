<!--
  @file components/layout/AppNavbar.vue
  @description 1:1 Horizon navbar header with brand logo, nav items, search input, and role switcher bar.
-->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { activeRole, isLiveChatheadOpen, activeInquirers } from '@/lib/systemState';
import { Shield, User, Home, MessageSquare, Search, Globe } from 'lucide-vue-next';

const router = useRouter();

function switchRole(role: 'admin' | 'tenant' | 'guest') {
  activeRole.value = role;
  if (role === 'admin') router.push('/admin');
  else if (role === 'tenant') router.push('/tenant');
  else router.push('/');
}
</script>

<template>
  <header class="h-20 bg-[#0b132b] text-white px-4 md:px-12 flex items-center justify-between sticky top-0 z-40 border-b border-white/10 shadow-xl">
    <!-- Left: Horizon Logo & Navigation Links -->
    <div class="flex items-center gap-8">
      <router-link to="/" class="flex items-center gap-2.5 font-bold text-xl tracking-tight">
        <span class="w-9 h-9 rounded-xl bg-white text-[#0b132b] flex items-center justify-center font-mono font-extrabold shadow-lg text-lg">8</span>
        <span class="font-display tracking-wide font-extrabold text-white">Horizon</span>
      </router-link>

      <nav class="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
        <router-link to="/" class="hover:text-white transition-colors">Hotel</router-link>
        <router-link to="/" class="hover:text-white transition-colors">Units</router-link>
        <router-link to="/" class="hover:text-white transition-colors">Clusters</router-link>
        <router-link to="/" class="hover:text-white transition-colors">Rules</router-link>
        <router-link to="/" class="hover:text-white transition-colors">Car Rental</router-link>
      </nav>
    </div>

    <!-- Center Search Bar (Horizon Style) -->
    <div class="hidden md:flex items-center relative w-64 lg:w-80">
      <input 
        type="text" 
        placeholder="Search destinations..." 
        class="w-full bg-white/10 text-white text-xs pl-4 pr-9 py-2 rounded-full border border-white/20 placeholder-slate-400 focus:outline-none focus:bg-white/20 transition-all" 
      />
      <Search class="w-4 h-4 absolute right-3 text-slate-400" />
    </div>

    <!-- Right: Language, Role Switcher Bar & Sign Up / Chat -->
    <div class="flex items-center gap-3">
      <div class="hidden xl:flex items-center gap-1 text-xs font-semibold text-slate-300 mr-1">
        <Globe class="w-3.5 h-3.5" />
        <span>EN</span>
      </div>

      <!-- Role Switcher -->
      <div class="flex items-center gap-1 bg-white/10 p-1 rounded-full border border-white/20 text-xs">
        <button
          @click="switchRole('guest')"
          :class="['px-3 py-1 rounded-full font-bold transition-all cursor-pointer', activeRole === 'guest' ? 'bg-white text-[#0b132b] shadow-md' : 'text-slate-300 hover:text-white']"
        >
          <Home class="w-3.5 h-3.5 inline mr-1" /> Public
        </button>

        <button
          @click="switchRole('admin')"
          :class="['px-3 py-1 rounded-full font-bold transition-all cursor-pointer', activeRole === 'admin' ? 'bg-white text-[#0b132b] shadow-md' : 'text-slate-300 hover:text-white']"
        >
          <Shield class="w-3.5 h-3.5 inline mr-1" /> Admin
        </button>

        <button
          @click="switchRole('tenant')"
          :class="['px-3 py-1 rounded-full font-bold transition-all cursor-pointer', activeRole === 'tenant' ? 'bg-white text-[#0b132b] shadow-md' : 'text-slate-300 hover:text-white']"
        >
          <User class="w-3.5 h-3.5 inline mr-1" /> Tenant
        </button>
      </div>

      <!-- Live Chat button -->
      <button @click="isLiveChatheadOpen = !isLiveChatheadOpen" class="bg-white hover:bg-slate-100 text-[#0b132b] text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer">
        <MessageSquare class="w-3.5 h-3.5 text-[#0b132b]" />
        <span class="hidden sm:inline">Sign Up</span>
        <span class="bg-[#0b132b] text-white font-bold px-1.5 py-0.5 rounded-full text-[10px]">{{ activeInquirers.length }}</span>
      </button>
    </div>
  </header>
</template>
