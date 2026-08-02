<script setup lang="ts">
/**
 * @component AppHeader
 * @description Master corporate top header for Hivelet, providing global search, workspace branding,
 *              mobile sidebar toggle, and active system role switcher with Vue Router integration.
 * @systemBibleRef Section 4 - User Roles & Authorization Boundaries
 * @rationale Designed after Jira Space top navigation. Features a clean white background, subtle border,
 *              role perspective selector (Admin / Tenant / Public), and instant search input.
 * @innovations Vue Router integration allowing seamless URL slug navigation when switching perspectives.
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Search,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  LogOut,
} from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import NotificationBell from '../ui/NotificationBell.vue';

defineProps<{
  isMobileSidebarOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggleMobileSidebar'): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const searchQuery = ref('');

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<template>
  <header class="bg-white border-b border-[#dfe1e6] sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between shadow-xs">
    <!-- Left Section: Mobile Menu Toggle & System Branding -->
    <div class="flex items-center gap-3">
      <!-- Mobile Sidebar Drawer Toggle -->
      <button 
        @click="emit('toggleMobileSidebar')" 
        class="md:hidden p-1.5 text-[#42526e] hover:bg-[#ebecf0] rounded-sm transition-colors"
        aria-label="Toggle Navigation Menu"
      >
        <X v-if="isMobileSidebarOpen" class="w-5 h-5" />
        <Menu v-else class="w-5 h-5" />
      </button>

      <!-- App Logo & Space Identity -->
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 bg-[#0c66e4] text-white rounded-sm flex items-center justify-center font-bold text-sm shadow-xs">
          H
        </div>
        <div class="hidden sm:block">
          <div class="flex items-center gap-2">
            <span class="font-bold text-[#172b4d] text-sm tracking-tight">HIVELET</span>
            <span class="text-[11px] font-semibold text-[#5e6c84] bg-[#ebecf0] px-1.5 py-0.2 rounded-xs border border-[#dfe1e6]">
              Fe Galang Da Silva Boarding House
            </span>
          </div>
          <p class="text-[11px] text-[#6b778c] leading-tight">Apartment Management System</p>
        </div>
      </div>
    </div>

    <!-- Center Section: Jira-Style Quick Search Bar -->
    <div class="hidden md:flex items-center flex-1 max-w-md mx-6">
      <div class="relative w-full">
        <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search rooms, tenants, bills, tickets..." 
          class="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe1e6] rounded-sm text-[#172b4d] placeholder-[#6b778c] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors"
        />
      </div>
    </div>

    <!-- Right Section: Signed-in identity, notifications, logout -->
    <div class="flex items-center gap-2 sm:gap-3">
      <NotificationBell v-if="authStore.profile" />

      <div v-if="authStore.profile" class="flex items-center gap-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-sm pl-2.5 pr-1 py-1">
        <component :is="authStore.isAdmin ? ShieldCheck : UserCheck" class="w-3.5 h-3.5 text-[#0c66e4]" />
        <div class="hidden sm:block text-right leading-tight">
          <p class="text-xs font-semibold text-[#172b4d]">{{ authStore.profile.full_name }}</p>
          <p class="text-[10px] text-[#6b778c] uppercase tracking-wide">{{ authStore.profile.role }}</p>
        </div>
        <button
          @click="handleLogout"
          class="p-1.5 text-[#6b778c] hover:text-[#bf2600] hover:bg-[#ffebe6] rounded-xs transition-colors"
          title="Logout"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>
