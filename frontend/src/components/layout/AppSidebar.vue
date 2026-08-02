<script setup lang="ts">
/**
 * @component AppSidebar
 * @description Left navigation sidebar for Hivelet, inspired directly by Atlassian/Jira space navigation.
 * @systemBibleRef Section 3 & UI Wireframe Specification - Sidebar Menu Items
 * @rationale Provides structured, clean workspace navigation tailored per capstone role with Vue Router.
 * @innovations Integrated RouterLinks to enable URL-slug-based navigation across all 10 system modules.
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
  Home,
  X
} from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';

defineProps<{
  isMobileSidebarOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'closeMobileSidebar'): void;
}>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Sidebar module set follows the signed-in profile's actual DB role, not the URL.
const currentRole = computed<'admin' | 'tenant' | 'public'>(() => {
  if (authStore.isAdmin) return 'admin';
  if (authStore.isTenant) return 'tenant';
  return 'public';
});

// Admin Management Modules aligned with System Bible
const adminModules = [
  { path: '/admin/overview', label: 'Executive Overview', icon: LayoutDashboard },
  { path: '/admin/directory', label: 'Room Directory (33 Units)', icon: Building2 },
  { path: '/admin/tenants', label: 'Tenant Directory', icon: Users },
  { path: '/admin/inquiries', label: 'Inquiry Inbox', icon: MessageSquare },
  { path: '/admin/billing', label: 'Billing & Collections', icon: CreditCard },
  { path: '/admin/expenses', label: 'Expenses Ledger', icon: Receipt },
  { path: '/admin/tickets', label: 'Maintenance Dispatch', icon: Wrench },
  { path: '/admin/audit', label: 'System Audit Logs', icon: ShieldCheck },
];

// Tenant Portal Modules
const tenantModules = [
  { path: '/tenant', label: 'My Room & Billing', icon: Home },
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
      class="md:hidden fixed inset-0 bg-[#091e4252] backdrop-blur-xs z-40 transition-opacity"
    ></div>

    <!-- Sidebar Container -->
    <aside 
      :class="[
        'w-64 bg-white border-r border-[#dfe1e6] flex flex-col justify-between z-50 transition-all duration-200 ease-in-out',
        'fixed md:static inset-y-0 left-0 h-full',
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <div class="p-3 overflow-y-auto">
        <!-- Mobile Sidebar Close Header -->
        <div class="md:hidden flex items-center justify-between pb-3 mb-2 border-b border-[#dfe1e6]">
          <span class="text-xs font-bold text-[#172b4d] uppercase tracking-wider">Navigation Menu</span>
          <button @click="emit('closeMobileSidebar')" class="p-1 text-[#6b778c] hover:bg-[#ebecf0] rounded-xs">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Space Context Header -->
        <div class="px-2.5 py-2 mb-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
          <p class="text-[10px] font-bold text-[#6b778c] uppercase tracking-wider">WORKSPACE</p>
          <p class="text-xs font-semibold text-[#172b4d] truncate">
            {{ currentRole === 'admin' ? 'Landlady Management Space' : currentRole === 'tenant' ? 'Tenant Account Portal' : 'Public Guest Catalog' }}
          </p>
        </div>

        <!-- Admin Workspace Navigation -->
        <div v-if="currentRole === 'admin'" class="space-y-0.5">
          <p class="px-2 py-1 text-[11px] font-bold text-[#6b778c] uppercase tracking-wider">Management Modules</p>
          <button
            v-for="module in adminModules"
            :key="module.path"
            @click="navigateTo(module.path)"
            :class="['jira-sidebar-item w-full text-left', route.path === module.path ? 'active' : '']"
          >
            <component :is="module.icon" class="w-4 h-4 shrink-0" />
            <span class="truncate">{{ module.label }}</span>
          </button>
        </div>

        <!-- Tenant Portal Navigation -->
        <div v-else-if="currentRole === 'tenant'" class="space-y-0.5">
          <p class="px-2 py-1 text-[11px] font-bold text-[#6b778c] uppercase tracking-wider">Tenant Self-Service</p>
          <button
            v-for="module in tenantModules"
            :key="module.path"
            @click="navigateTo(module.path)"
            :class="['jira-sidebar-item w-full text-left', route.path === module.path ? 'active' : '']"
          >
            <component :is="module.icon" class="w-4 h-4 shrink-0" />
            <span class="truncate">{{ module.label }}</span>
          </button>
        </div>
      </div>

      <!-- Footer Identity Note -->
      <div class="p-3 border-t border-[#dfe1e6] bg-[#f4f5f7]">
        <p class="text-[11px] font-medium text-[#6b778c]">Fe Galang Da Silva Boarding House</p>
        <p class="text-[10px] text-[#8993a4]">33 Total Units • 3 Floors</p>
      </div>
    </aside>
  </div>
</template>
