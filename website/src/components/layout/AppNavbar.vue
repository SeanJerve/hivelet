<!--
  @file components/layout/AppNavbar.vue
  @description Hivelet top application header with brand logo, public navigation links, room search input, and role switcher bar.
  @systemBibleRef Section 4 - User Roles & Section 5.4 - Centralized Inquiries
  @rationale Provides unified single-slug navigation between Public, Admin, and Tenant portals with corporate blue styling.
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
    <!-- Left: Hivelet Logo & Navigation Links -->
    <div class="flex items-center gap-8">
      <router-link to="/" class="flex items-center gap-2.5 font-bold text-xl tracking-tight">
        <span class="w-9 h-9 rounded-xl bg-[#0c66e4] text-white flex items-center justify-center font-mono font-extrabold shadow-lg text-lg">H</span>
        <div class="flex flex-col">
          <span class="font-display tracking-wide font-extrabold text-white text-base leading-tight">Hivelet</span>
          <span class="text-[9px] font-medium text-slate-400 leading-none">Fe Galang Da Silva BH</span>
        </div>
      </router-link>

      <nav class="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
        <a href="#hero" class="hover:text-white transition-colors">Home</a>
        <a href="#highlights" class="hover:text-white transition-colors">Features</a>
        <a href="#rooms" class="hover:text-white transition-colors">Available Units</a>
        <a href="#rules" class="hover:text-white transition-colors">House Rules</a>
      </nav>
    </div>

    <!-- Center Search Bar -->
    <div class="hidden md:flex items-center relative w-64 lg:w-80">
      <input 
        type="text" 
        placeholder="Search unit code (e.g. 102, 204)..." 
        class="w-full bg-white/10 text-white text-xs pl-4 pr-9 py-2 rounded-full border border-white/20 placeholder-slate-400 focus:outline-none focus:bg-white/20 transition-all" 
      />
      <Search class="w-4 h-4 absolute right-3 text-slate-400" />
    </div>

    <!-- Right: Language, Role Switcher Bar & Live Chat Messenger -->
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

      <!-- Role-specific CTA / Live Chat button -->
      <button 
        v-if="activeRole === 'admin'"
        @click="isLiveChatheadOpen = !isLiveChatheadOpen" 
        class="bg-white hover:bg-slate-100 text-[#0b132b] text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
      >
        <MessageSquare class="w-3.5 h-3.5 text-[#0b132b]" />
        <span class="hidden sm:inline">Landlady Inbox</span>
        <span class="bg-[#0b132b] text-white font-bold px-1.5 py-0.5 rounded-full text-[10px]">{{ activeInquirers.length }}</span>
      </button>

      <a 
        v-else-if="activeRole === 'guest'"
        href="#inquire" 
        class="bg-[#0c66e4] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
      >
        <MessageSquare class="w-3.5 h-3.5 text-white" />
        <span class="hidden sm:inline">Inquire Now</span>
      </a>

      <button 
        v-else
        @click="isLiveChatheadOpen = !isLiveChatheadOpen" 
        class="bg-white hover:bg-slate-100 text-[#0b132b] text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
      >
        <MessageSquare class="w-3.5 h-3.5 text-[#0b132b]" />
        <span class="hidden sm:inline">Tenant Chat</span>
      </button>
    </div>
  </header>
</template>
