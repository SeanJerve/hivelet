<script setup lang="ts">
/**
 * @component AppSidebar
 * @description Left navigation sidebar for Hivelet, inspired directly by Atlassian/Jira space navigation.
 * @systemBibleRef Section 3 & UI Wireframe Specification - Sidebar Menu Items
 * @rationale Provides structured, clean workspace navigation tailored per capstone role.
 *              Includes mobile drawer overlay rules for small devices.
 * @innovations Dynamic sidebar navigation switching between Admin management modules, Tenant portal actions,
 *              and Public room directory based on active role state.
 */
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
  FileText, 
  PlusCircle, 
  X 
} from 'lucide-vue-next';

const props = defineProps<{
  currentRole: 'admin' | 'tenant' | 'public';
  activeTab: string;
  isMobileSidebarOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: string): void;
  (e: 'closeMobileSidebar'): void;
}>();

// Admin Management Modules aligned with System Bible
const adminModules = [
  { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
  { id: 'directory', label: 'Room Directory (32 Units)', icon: Building2 },
  { id: 'tenants', label: 'Tenant Directory', icon: Users },
  { id: 'inquiries', label: 'Inquiry Inbox', icon: MessageSquare },
  { id: 'billing', label: 'Billing & Collections', icon: CreditCard },
  { id: 'expenses', label: 'Expenses Ledger', icon: Receipt },
  { id: 'tickets', label: 'Maintenance Dispatch', icon: Wrench },
  { id: 'audit', label: 'System Audit Logs', icon: ShieldCheck },
];

// Tenant Portal Modules
const tenantModules = [
  { id: 'tenant-dashboard', label: 'My Room & Billing', icon: Home },
  { id: 'tenant-tickets', label: 'Report Issue / Ticket', icon: Wrench },
];

// Public Portal Modules
const publicModules = [
  { id: 'public-rooms', label: 'Property & Units', icon: Building2 },
  { id: 'public-inquire', label: 'Submit Room Inquiry', icon: PlusCircle },
];

const handleSelect = (tabId: string) => {
  emit('update:activeTab', tabId);
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
        <div class="px-2 py-2 mb-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
          <p class="text-[10px] font-bold text-[#6b778c] uppercase tracking-wider">WORKSPACE</p>
          <p class="text-xs font-semibold text-[#172b4d] truncate">
            {{ currentRole === 'admin' ? 'Landlady Management Space' : currentRole === 'tenant' ? 'Tenant Account Portal' : 'Public Guest Catalog' }}
          </p>
        </div>

        <!-- Admin Workspace Navigation -->
        <div v-if="currentRole === 'admin'" class="space-y-0.5">
          <p class="px-2 py-1 text-[11px] font-bold text-[#6b778c] uppercase tracking-wider">Management Modules</p>
          <a
            v-for="module in adminModules"
            :key="module.id"
            @click.prevent="handleSelect(module.id)"
            href="#"
            :class="['jira-sidebar-item', activeTab === module.id ? 'active' : '']"
          >
            <component :is="module.icon" class="w-4 h-4 shrink-0" />
            <span class="truncate">{{ module.label }}</span>
          </a>
        </div>

        <!-- Tenant Portal Navigation -->
        <div v-else-if="currentRole === 'tenant'" class="space-y-0.5">
          <p class="px-2 py-1 text-[11px] font-bold text-[#6b778c] uppercase tracking-wider">Tenant Self-Service</p>
          <a
            v-for="module in tenantModules"
            :key="module.id"
            @click.prevent="handleSelect(module.id)"
            href="#"
            :class="['jira-sidebar-item', activeTab === module.id ? 'active' : '']"
          >
            <component :is="module.icon" class="w-4 h-4 shrink-0" />
            <span class="truncate">{{ module.label }}</span>
          </a>
        </div>

        <!-- Public Portal Navigation -->
        <div v-else-if="currentRole === 'public'" class="space-y-0.5">
          <p class="px-2 py-1 text-[11px] font-bold text-[#6b778c] uppercase tracking-wider">Guest Directory</p>
          <a
            v-for="module in publicModules"
            :key="module.id"
            @click.prevent="handleSelect(module.id)"
            href="#"
            :class="['jira-sidebar-item', activeTab === module.id ? 'active' : '']"
          >
            <component :is="module.icon" class="w-4 h-4 shrink-0" />
            <span class="truncate">{{ module.label }}</span>
          </a>
        </div>
      </div>

      <!-- Footer Identity Note -->
      <div class="p-3 border-t border-[#dfe1e6] bg-[#f4f5f7]">
        <p class="text-[11px] font-medium text-[#6b778c]">Fe Galang Da Silva Boarding House</p>
        <p class="text-[10px] text-[#8993a4]">32 Total Units • 3 Floors</p>
      </div>
    </aside>
  </div>
</template>
