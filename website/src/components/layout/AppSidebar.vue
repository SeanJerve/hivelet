<!--
  @file AppSidebar.vue
  @description Left navigation sidebar for Hivelet Website, inspired directly by Atlassian/Jira space navigation.
  @systemBibleRef Section 3 & Section 4 - User Roles & Space Navigation
  @rationale Provides structured, soft workspace navigation with larger Jira-style typography
              and 44px+ touch targets for mobile-first PWA compliance.
  @keyInnovations Integrated Vue RouterLinks and systemState store bindings for unified navigation across website.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  MessageSquare, 
  CreditCard, 
  Receipt, 
  Wrench, 
  Home, 
  X
} from 'lucide-vue-next';
import { isAdmin, isTenant } from '@/lib/authStore';

defineProps<{
  isMobileSidebarOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'closeMobileSidebar'): void;
}>();

const route = useRoute();
const router = useRouter();

// Navigation is derived from the authenticated session, not from the URL.
// Reading the role off the path meant that simply typing /admin rendered the
// full management menu to anyone — System Bible Section 20 requires the role to
// come from an authenticated identity.
const sessionRole = computed<'admin' | 'tenant' | 'public'>(() => {
  if (isAdmin.value) return 'admin';
  if (isTenant.value) return 'tenant';
  return 'public';
});

// Kept as `currentRole` so the existing template bindings continue to read
// naturally below.
const currentRole = sessionRole;

// Admin Management Modules aligned with System Bible & BR-032
const adminModules = [
  { path: '/admin/overview', label: 'Executive Overview', icon: LayoutDashboard },
  { path: '/admin/directory', label: 'Room Directory (32 Units)', icon: Building2 },
  { path: '/admin/tenants', label: 'Tenant Directory', icon: Users },
  { path: '/admin/inquiries', label: 'Inquiry Inbox', icon: MessageSquare },
  { path: '/admin/billing', label: 'Billing & Collections', icon: CreditCard },
  { path: '/admin/expenses', label: 'Expenses Ledger', icon: Receipt },
  { path: '/admin/tickets', label: 'Maintenance Dispatch', icon: Wrench },
];

// Tenant Portal Modules
const tenantModules = [
  { path: '/tenant', label: 'My Room & Billing', icon: Home },
];

// Public Portal Modules
const publicModules = [
  { path: '/public', label: 'Property & Available Units', icon: Building2 },
];

const navigateTo = (path: string) => {
  router.push(path);
  emit('closeMobileSidebar');
};
</script>

<template>
  <div>
    <!-- Mobile Drawer Overlay Backdrop -->
    <div 
      v-if="isMobileSidebarOpen" 
      @click="emit('closeMobileSidebar')"
      class="md:hidden fixed inset-0 bg-[#091e42]/40 backdrop-blur-xs z-40 transition-opacity"
    ></div>

    <!-- Sidebar Container -->
    <aside 
      :class="[
        'w-72 bg-white border-r border-[#dfe1e6] flex flex-col justify-between z-50 transition-all duration-200 ease-in-out',
        'fixed md:static inset-y-0 left-0 h-full min-h-screen shadow-xs',
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <div class="p-4 overflow-y-auto space-y-4">
        <!-- Mobile Sidebar Close Header -->
        <div class="md:hidden flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <span class="text-xs font-bold text-[#172b4d] uppercase tracking-wider">Navigation Menu</span>
          <button 
            @click="emit('closeMobileSidebar')" 
            class="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#6b778c] hover:bg-[#ebecf0] rounded-md transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Space Context Header (Jira Soft Pill Box) -->
        <div class="px-3 py-2.5 bg-[#f7f8f9] border border-[#dfe1e6] rounded-md">
          <p class="text-[11px] font-bold text-[#6b778c] uppercase tracking-wider">SPACE</p>
          <p class="text-sm font-bold text-[#172b4d] truncate mt-0.5">
            {{ currentRole === 'admin' ? 'Landlady Operations Space' : currentRole === 'tenant' ? 'Tenant Account Portal' : 'Public Guest Catalog' }}
          </p>
        </div>

        <!-- Admin Workspace Navigation -->
        <div v-if="currentRole === 'admin'" class="space-y-1">
          <p class="px-2 py-1 text-xs font-bold text-[#6b778c] uppercase tracking-wider">Management Modules</p>
          <button
            v-for="module in adminModules"
            :key="module.path"
            @click="navigateTo(module.path)"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all cursor-pointer text-left',
              (route.path === module.path || (module.path === '/admin/overview' && route.path === '/admin'))
                ? 'bg-[#e9f2ff] text-[#0c66e4] font-bold border-l-4 border-[#0c66e4]' 
                : 'text-[#42526e] hover:bg-[#f4f5f7] hover:text-[#172b4d]'
            ]"
          >
            <component :is="module.icon" class="w-5 h-5 shrink-0" />
            <span class="truncate font-medium">{{ module.label }}</span>
          </button>
        </div>

        <!-- Tenant Portal Navigation -->
        <div v-else-if="currentRole === 'tenant'" class="space-y-1">
          <p class="px-2 py-1 text-xs font-bold text-[#6b778c] uppercase tracking-wider">Tenant Self-Service</p>
          <button
            v-for="module in tenantModules"
            :key="module.path"
            @click="navigateTo(module.path)"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all cursor-pointer text-left',
              route.path === module.path 
                ? 'bg-[#e9f2ff] text-[#0c66e4] font-bold border-l-4 border-[#0c66e4]' 
                : 'text-[#42526e] hover:bg-[#f4f5f7] hover:text-[#172b4d]'
            ]"
          >
            <component :is="module.icon" class="w-5 h-5 shrink-0" />
            <span class="truncate font-medium">{{ module.label }}</span>
          </button>
        </div>

        <!-- Public Portal Navigation -->
        <div v-else class="space-y-1">
          <p class="px-2 py-1 text-xs font-bold text-[#6b778c] uppercase tracking-wider">Guest Directory</p>
          <button
            v-for="module in publicModules"
            :key="module.path"
            @click="navigateTo(module.path)"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all cursor-pointer text-left',
              (route.path === module.path || route.path === '/') 
                ? 'bg-[#e9f2ff] text-[#0c66e4] font-bold border-l-4 border-[#0c66e4]' 
                : 'text-[#42526e] hover:bg-[#f4f5f7] hover:text-[#172b4d]'
            ]"
          >
            <component :is="module.icon" class="w-5 h-5 shrink-0" />
            <span class="truncate font-medium">{{ module.label }}</span>
          </button>
        </div>
      </div>

      <!-- Footer Identity Note -->
      <div class="p-4 border-t border-[#dfe1e6] bg-[#f7f8f9]">
        <p class="text-xs font-bold text-[#172b4d]">Fe Galang Da Silva Boarding House</p>
        <p class="text-xs text-[#6b778c] mt-0.5">32 Rentable Units • 5 Clusters</p>
      </div>
    </aside>
  </div>
</template>
