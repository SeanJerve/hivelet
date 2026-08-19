<script setup lang="ts">
/**
 * @component AppSidebar
 * @description Left navigation sidebar for Hivelet, inspired directly by Atlassian/Jira space navigation.
 * @systemBibleRef Section 3 & UI Wireframe Specification - Sidebar Menu Items
 * @rationale Provides structured, soft workspace navigation with larger Jira-style typography
 *              and 44px+ touch targets for mobile-first PWA compliance.
 * @innovations Integrated RouterLinks to enable URL-slug-based navigation across system modules, with URL path prefix normalization (/basis) supporting parallel wireframe deployment.
 */
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
  ShieldCheck, 
  Settings,
  Home, 
  X 
} from 'lucide-vue-next';

const props = defineProps<{
  isMobileSidebarOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'closeMobileSidebar'): void;
  (e: 'update:activeTab', tab: string): void;
}>();

const route = useRoute();
const router = useRouter();

// Compute active role based on URL path, normalizing any /basis path prefix
const currentRole = computed<'admin' | 'tenant' | 'public'>(() => {
  if (route.path.startsWith('/tenant') || route.path.startsWith('/basis/tenant')) return 'tenant';
  if (route.path.startsWith('/admin') || route.path.startsWith('/basis/admin')) return 'admin';
  return 'public';
});

// Admin Management Modules aligned with System Bible & BR-032
const adminModules = [
  { path: '/admin/overview', label: 'Executive Overview', icon: LayoutDashboard },
  { path: '/admin/directory', label: 'Room Directory (32 Units)', icon: Building2 },
  { path: '/admin/tenants', label: 'Tenant Directory', icon: Users },
  { path: '/admin/inquiries', label: 'Inquiry Inbox', icon: MessageSquare },
  { path: '/admin/billing', label: 'Billing & Collections', icon: CreditCard },
  { path: '/admin/billing/history', label: '  • Collection History', icon: Receipt },
  { path: '/admin/expenses', label: 'Expenses Ledger', icon: Receipt },
  { path: '/admin/tickets', label: 'Maintenance Dispatch', icon: Wrench },
  { path: '/admin/settings', label: 'Settings & Business Rules', icon: Settings },
  { path: '/admin/audit', label: 'System Audit Logs', icon: ShieldCheck },
];

// Tenant Portal Modules
const tenantModules = [
  { path: '/tenant', label: 'My Room & Billing', icon: Home },
];

// Public Portal Modules
const publicModules = [
  { path: '/public', label: 'Property & Available Units', icon: Building2 },
];

// Normalizing helper to check if a navigation module path matches route.path (with or without /basis prefix)
const isActive = (modulePath: string) => {
  return route.path === modulePath || route.path === `/basis${modulePath}`;
};

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
        'fixed md:static inset-y-0 left-0 h-full shadow-xs',
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <div class="p-4 overflow-y-auto space-y-4">
        <!-- Mobile Sidebar Close Header -->
        <div class="md:hidden flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <span class="text-xs font-bold text-[#172b4d] uppercase tracking-wider">Navigation Menu</span>
          <button 
            @click="emit('closeMobileSidebar')" 
            class="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#6b778c] hover:bg-[#ebecf0] rounded-md transition-colors"
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
            :class="['jira-sidebar-item w-full text-left', isActive(module.path) ? 'active' : '']"
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
            :class="['jira-sidebar-item w-full text-left', isActive(module.path) ? 'active' : '']"
          >
            <component :is="module.icon" class="w-5 h-5 shrink-0" />
            <span class="truncate font-medium">{{ module.label }}</span>
          </button>
        </div>

        <!-- Public Portal Navigation -->
        <div v-else-if="currentRole === 'public'" class="space-y-1">
          <p class="px-2 py-1 text-xs font-bold text-[#6b778c] uppercase tracking-wider">Guest Directory</p>
          <button
            v-for="module in publicModules"
            :key="module.path"
            @click="navigateTo(module.path)"
            :class="['jira-sidebar-item w-full text-left', isActive(module.path) ? 'active' : '']"
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
