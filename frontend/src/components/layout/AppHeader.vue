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
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  Building2, 
  Search, 
  Menu, 
  X, 
  Plus, 
  ShieldCheck, 
  UserCheck, 
  Globe 
} from 'lucide-vue-next';

const props = defineProps<{
  isMobileSidebarOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggleMobileSidebar'): void;
}>();

const router = useRouter();
const route = useRoute();
const searchQuery = ref('');

// Compute active role based on current URL path
const currentRole = computed<'admin' | 'tenant' | 'public'>(() => {
  if (route.path.startsWith('/tenant')) return 'tenant';
  if (route.path.startsWith('/admin')) return 'admin';
  return 'public';
});

const navigateRole = (role: 'admin' | 'tenant' | 'public') => {
  if (role === 'admin') router.push('/admin/overview');
  else if (role === 'tenant') router.push('/tenant');
  else router.push('/public');
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

    <!-- Right Section: Role Switcher & Action Button -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Capstone Role Perspective Selector -->
      <div class="flex items-center bg-[#f4f5f7] p-0.5 border border-[#dfe1e6] rounded-sm">
        <button 
          @click="navigateRole('admin')"
          :class="[
            'px-2 py-1 text-xs font-medium rounded-2xs flex items-center gap-1.5 transition-all',
            currentRole === 'admin' 
              ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs border border-[#dfe1e6]' 
              : 'text-[#42526e] hover:text-[#172b4d]'
          ]"
          title="Switch to Admin / Landlady Workspace (/admin/overview)"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Admin</span>
        </button>

        <button 
          @click="navigateRole('tenant')"
          :class="[
            'px-2 py-1 text-xs font-medium rounded-2xs flex items-center gap-1.5 transition-all',
            currentRole === 'tenant' 
              ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs border border-[#dfe1e6]' 
              : 'text-[#42526e] hover:text-[#172b4d]'
          ]"
          title="Switch to Active Tenant View (/tenant)"
        >
          <UserCheck class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Tenant</span>
        </button>

        <button 
          @click="navigateRole('public')"
          :class="[
            'px-2 py-1 text-xs font-medium rounded-2xs flex items-center gap-1.5 transition-all',
            currentRole === 'public' 
              ? 'bg-white text-[#0c66e4] font-semibold shadow-2xs border border-[#dfe1e6]' 
              : 'text-[#42526e] hover:text-[#172b4d]'
          ]"
          title="Switch to Public Guest Inquiry View (/public)"
        >
          <Globe class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Public</span>
        </button>
      </div>

      <!-- Quick Action Button -->
      <button class="jira-btn-primary text-xs">
        <Plus class="w-3.5 h-3.5" />
        <span class="hidden xs:inline">Create</span>
      </button>
    </div>
  </header>
</template>
