<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { isMobileSidebarOpen } from '@/lib/systemState';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wallet,
  ReceiptText, 
  Wrench, 
  Inbox,
  X,
  Shield,
  User,
  Home,
  CreditCard,
  UserCheck
} from 'lucide-vue-next';

const route = useRoute();

const isTenantSection = computed(() => route.path.startsWith('/tenant'));

const ADMIN_NAV = [
  { to: '/admin/overview', aliases: ['/basis/overview'], label: 'Executive Overview', icon: LayoutDashboard },
  { to: '/admin/directory', aliases: ['/basis/directory'], label: 'Room & Rate Directory', icon: Building2 },
  { to: '/admin/tenants', aliases: ['/basis/tenants'], label: 'Active Tenants', icon: Users },
  { to: '/admin/income', aliases: ['/basis/income'], label: 'Income & Collections', icon: Wallet },
  { to: '/admin/expenses', aliases: ['/basis/expenses'], label: 'Monthly Expenses', icon: ReceiptText },
  { to: '/admin/tickets', aliases: ['/basis/tickets'], label: 'Maintenance Dispatch', icon: Wrench },
  { to: '/admin/inquiries', aliases: ['/basis/inquiries'], label: 'Prospect Inquiries', icon: Inbox },
] as const;

const TENANT_NAV = [
  { to: '/tenant', aliases: ['/tenant/overview'], label: 'Unit Overview', icon: Home },
  { to: '/tenant/payments', aliases: [], label: 'Payment & Billing', icon: CreditCard },
  { to: '/tenant/tickets', aliases: [], label: 'Maintenance Tickets', icon: Wrench },
  { to: '/tenant/profile', aliases: [], label: 'My Profile', icon: UserCheck },
] as const;

const activeNav = computed(() => isTenantSection.value ? TENANT_NAV : ADMIN_NAV);
const spaceTitle = computed(() => isTenantSection.value ? 'Tenant Account Portal' : 'Landlady Operations Space');
const spaceCategory = computed(() => isTenantSection.value ? 'Tenant Self-Service' : 'Management Operations');



function isItemActive(to: string, aliases: readonly string[]) {
  if (route.path === to) return true;
  if (aliases.includes(route.path)) return true;
  if (to === '/tenant' && (route.path === '/tenant' || route.path === '/tenant/overview')) return true;
  return false;
}

function closeMobileNav() {
  isMobileSidebarOpen.value = false;
}
</script>

<template>
  <div>
    <!-- Desktop Sidebar -->
    <aside class="sticky top-20 hidden h-[calc(100dvh-6rem)] w-64 shrink-0 rounded-2xl border border-[#e7e5e4] bg-white p-3 shadow-xs lg:block my-6">
      <!-- Space Context Pill Header -->
      <div class="px-3 py-2.5 mb-3 bg-[#f5f5f4] border border-[#e7e5e4] rounded-xl">
        <p class="text-[10px] font-extrabold uppercase tracking-widest text-[#71717a]">
          SPACE
        </p>
        <p class="text-xs font-extrabold text-[#1c1917] truncate mt-0.5">
          {{ spaceTitle }}
        </p>
      </div>

      <p class="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-widest text-[#71717a]">
        {{ spaceCategory }}
      </p>

      <nav class="grid gap-1">
        <router-link
          v-for="item in activeNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all duration-150',
            isItemActive(item.to, item.aliases)
              ? (isTenantSection ? 'bg-[#e9f2ff] text-[#0c66e4] font-bold shadow-xs' : 'bg-[#fbf6ee] text-[#78350f] font-bold shadow-xs')
              : 'text-[#475569] hover:bg-[#f5f5f4] hover:text-[#1c1917]'
          ]"
        >
          <component 
            :is="item.icon" 
            :class="[
              'size-4 shrink-0 transition-colors',
              isItemActive(item.to, item.aliases) 
                ? (isTenantSection ? 'text-[#0c66e4]' : 'text-[#8a5814]') 
                : 'text-[#64748b]'
            ]" 
          />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- Mobile Drawer Sheet -->
    <div 
      v-if="isMobileSidebarOpen" 
      class="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      @click.self="closeMobileNav"
    >
      <div class="w-72 bg-white h-full shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-left duration-200 overflow-y-auto">
        <div class="space-y-6">
          <div class="flex items-center justify-between pb-4 border-b border-[#e7e5e4]">
            <div>
              <span class="font-display font-black text-base text-[#1c1917]">HIVELET</span>
              <p class="text-[11px] text-[#71717a]">{{ spaceTitle }}</p>
            </div>
            <button 
              @click="closeMobileNav" 
              class="p-1.5 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] hover:text-[#1c1917]"
              aria-label="Close menu"
            >
              <X class="size-5" />
            </button>
          </div>

          <!-- Space Pill Box (Mobile) -->
          <div class="px-3 py-2 bg-[#f5f5f4] border border-[#e7e5e4] rounded-xl">
            <p class="text-[9px] font-extrabold uppercase tracking-widest text-[#71717a]">Active Space</p>
            <p class="text-xs font-extrabold text-[#1c1917] truncate mt-0.5">{{ spaceTitle }}</p>
          </div>



          <!-- Section Specific Navigation -->
          <div>
            <p class="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#71717a]">
              {{ spaceCategory }}
            </p>
            <nav class="grid gap-1">
              <router-link
                v-for="item in activeNav"
                :key="item.to"
                :to="item.to"
                @click="closeMobileNav"
                :class="[
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs sm:text-sm font-semibold transition-all',
                  isItemActive(item.to, item.aliases)
                    ? (isTenantSection ? 'bg-[#e9f2ff] text-[#0c66e4] font-bold' : 'bg-[#fbf6ee] text-[#78350f] font-bold')
                    : 'text-[#475569] hover:bg-[#f5f5f4]'
                ]"
              >
                <component 
                  :is="item.icon" 
                  :class="[
                    'size-4 shrink-0',
                    isItemActive(item.to, item.aliases) 
                      ? (isTenantSection ? 'text-[#0c66e4]' : 'text-[#8a5814]') 
                      : 'text-[#64748b]'
                  ]" 
                />
                <span>{{ item.label }}</span>
              </router-link>
            </nav>
          </div>
        </div>

        <div class="p-3 bg-[#fafaf9] rounded-xl border border-[#e7e5e4] text-xs text-[#71717a] mt-6">
          <p class="font-bold text-[#1c1917]">Fe Galang Da Silva Boarding House</p>
          <p class="text-[11px] mt-0.5">32 Rentable Units • Tanauan City</p>
        </div>
      </div>
    </div>
  </div>
</template>
