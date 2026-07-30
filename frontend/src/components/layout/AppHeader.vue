<script setup lang="ts">
/**
 * @component AppHeader
 * @description Master corporate top header for Hivelet, providing global search, workspace branding,
 *              mobile sidebar toggle, and active system role switcher with Vue Router integration.
 * @systemBibleRef Section 4 - User Roles & Authorization Boundaries
 * @rationale Designed directly after Atlassian Jira top space navigation with soft light styling,
 *              larger typography, and touch-friendly mobile targets.
 * @innovations Integrated Vue Router navigation and role switcher with clear visual active indicators.
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
  <header class="bg-white border-b border-[#dfe1e6] sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
    <!-- Left Section: Mobile Menu Toggle & System Branding -->
    <div class="flex items-center gap-3 sm:gap-4">
      <!-- Mobile Sidebar Drawer Toggle (44px target) -->
      <button 
        @click="emit('toggleMobileSidebar')" 
        class="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[#42526e] hover:bg-[#ebecf0] rounded-md transition-colors"
        aria-label="Toggle Navigation Menu"
      >
        <X v-if="isMobileSidebarOpen" class="w-6 h-6" />
        <Menu v-else class="w-6 h-6" />
      </button>

      <!-- App Logo & Space Identity -->
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-[#0c66e4] text-white rounded-md flex items-center justify-center font-extrabold text-base shadow-xs">
          H
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-[#172b4d] text-base sm:text-lg tracking-tight">HIVELET</span>
            <span class="hidden sm:inline text-xs font-semibold text-[#42526e] bg-[#f4f5f7] px-2 py-0.5 rounded-md border border-[#dfe1e6]">
              Fe Galang Da Silva Boarding House
            </span>
          </div>
          <p class="text-xs text-[#6b778c] leading-tight">32 Rentable Units Operations Portal</p>
        </div>
      </div>
    </div>

    <!-- Center Section: Jira-Style Quick Search Bar -->
    <div class="hidden lg:flex items-center flex-1 max-w-md mx-8">
      <div class="relative w-full">
        <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search 32 units, tenants, bills, maintenance..." 
          class="w-full pl-10 pr-4 py-2 text-sm bg-[#f7f8f9] border border-[#dfe1e6] rounded-md text-[#172b4d] placeholder-[#6b778c] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors"
        />
      </div>
    </div>

    <!-- Right Section: Role Switcher & Quick Action Button -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Capstone Role Perspective Selector -->
      <div class="flex items-center bg-[#f7f8f9] p-1 border border-[#dfe1e6] rounded-md">
        <button 
          @click="navigateRole('admin')"
          :class="[
            'px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md flex items-center gap-1.5 transition-all min-h-[36px]',
            currentRole === 'admin' 
              ? 'bg-white text-[#0c66e4] shadow-2xs border border-[#dfe1e6]' 
              : 'text-[#42526e] hover:text-[#172b4d]'
          ]"
          title="Switch to Admin / Landlady Workspace (/admin/overview)"
        >
          <ShieldCheck class="w-4 h-4" />
          <span class="hidden sm:inline">Admin</span>
        </button>

        <button 
          @click="navigateRole('tenant')"
          :class="[
            'px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md flex items-center gap-1.5 transition-all min-h-[36px]',
            currentRole === 'tenant' 
              ? 'bg-white text-[#0c66e4] shadow-2xs border border-[#dfe1e6]' 
              : 'text-[#42526e] hover:text-[#172b4d]'
          ]"
          title="Switch to Active Tenant View (/tenant)"
        >
          <UserCheck class="w-4 h-4" />
          <span class="hidden sm:inline">Tenant</span>
        </button>

        <button 
          @click="navigateRole('public')"
          :class="[
            'px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md flex items-center gap-1.5 transition-all min-h-[36px]',
            currentRole === 'public' 
              ? 'bg-white text-[#0c66e4] shadow-2xs border border-[#dfe1e6]' 
              : 'text-[#42526e] hover:text-[#172b4d]'
          ]"
          title="Switch to Public Guest View (/public)"
        >
          <Globe class="w-4 h-4" />
          <span class="hidden sm:inline">Public</span>
        </button>
      </div>

      <!-- Quick Action Button -->
      <button class="jira-btn-primary text-xs sm:text-sm font-semibold">
        <Plus class="w-4 h-4" />
        <span class="hidden sm:inline">Create</span>
      </button>
    </div>
  </header>
</template>
