<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { isMobileSidebarOpen, inquiries, maintenanceTickets, incomeRecords } from '@/lib/systemState';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wallet,
  ReceiptText, 
  Wrench, 
  Inbox,
  X,
  Home,
  CreditCard,
  UserCheck,
  ShieldCheck
} from 'lucide-vue-next';

const route = useRoute();

const isTenantSection = computed(() => route.path.startsWith('/tenant'));

// Unread/Actionable counts for sidebar badges
const inquiriesCount = computed(() => inquiries.length);
const urgentTicketsCount = computed(() => 
  maintenanceTickets.filter(t => t.status !== 'Resolved' && (t.priority === 'Emergency' || t.priority === 'High')).length
);

const ADMIN_NAV = computed(() => [
  { to: '/admin/overview', aliases: ['/basis/overview'], label: 'Executive Overview', icon: LayoutDashboard, badge: null, badgeColor: '' },
  { to: '/admin/directory', aliases: ['/basis/directory'], label: 'Room & Rate Directory', icon: Building2, badge: null, badgeColor: '' },
  { to: '/admin/tenants', aliases: ['/basis/tenants'], label: 'Active Tenants', icon: Users, badge: null, badgeColor: '' },
  { to: '/admin/income', aliases: ['/basis/income'], label: 'Income & Collections', icon: Wallet, badge: null, badgeColor: '' },
  { to: '/admin/expenses', aliases: ['/basis/expenses'], label: 'Monthly Expenses', icon: ReceiptText, badge: null, badgeColor: '' },
  { to: '/admin/tickets', aliases: ['/basis/tickets'], label: 'Maintenance Dispatch', icon: Wrench, badge: urgentTicketsCount.value > 0 ? urgentTicketsCount.value : null, badgeColor: 'bg-rose-500 text-white' },
  { to: '/admin/inquiries', aliases: ['/basis/inquiries'], label: 'Prospect Inquiries', icon: Inbox, badge: inquiriesCount.value > 0 ? inquiriesCount.value : null, badgeColor: 'bg-[#0c66e4] text-white' },
  { to: '/admin/audit-logs', aliases: ['/admin/audit'], label: 'System Audit Trail', icon: ShieldCheck, badge: null, badgeColor: '' },
]);

const TENANT_NAV = computed(() => [
  { to: '/tenant', aliases: ['/tenant/overview'], label: 'Unit Overview', icon: Home, badge: null, badgeColor: '' },
  { to: '/tenant/payments', aliases: [], label: 'Payment & Billing', icon: CreditCard, badge: null, badgeColor: '' },
  { to: '/tenant/tickets', aliases: [], label: 'Maintenance Tickets', icon: Wrench, badge: null, badgeColor: '' },
  { to: '/tenant/profile', aliases: [], label: 'My Profile', icon: UserCheck, badge: null, badgeColor: '' },
]);

const activeNav = computed(() => isTenantSection.value ? TENANT_NAV.value : ADMIN_NAV.value);
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
      <p class="px-3 py-2 text-[11px] font-extrabold uppercase tracking-widest text-[#71717a]">
        {{ spaceCategory }}
      </p>

      <nav class="grid gap-1">
        <router-link
          v-for="item in activeNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex min-h-11 items-center justify-between rounded-xl px-3.5 text-sm font-semibold transition-all duration-150',
            isItemActive(item.to, item.aliases)
              ? 'bg-[#e9f2ff] text-[#0c66e4] font-bold shadow-xs'
              : 'text-[#475569] hover:bg-[#f5f5f4] hover:text-[#1c1917]'
          ]"
        >
          <div class="flex items-center gap-3">
            <component 
              :is="item.icon" 
              :class="[
                'size-4 shrink-0 transition-colors',
                isItemActive(item.to, item.aliases) 
                  ? 'text-[#0c66e4]' 
                  : 'text-[#64748b]'
              ]" 
            />
            <span>{{ item.label }}</span>
          </div>

          <span 
            v-if="item.badge" 
            :class="['px-2 py-0.5 text-[10px] font-extrabold rounded-full', item.badgeColor]"
          >
            {{ item.badge }}
          </span>
        </router-link>
      </nav>
    </aside>

    <!-- Mobile Drawer Sheet with Smooth Slide Transition -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="isMobileSidebarOpen" 
        class="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-xs"
        @click.self="closeMobileNav"
      >
        <Transition
          appear
          enter-active-class="transition duration-300 ease-out transform"
          enter-from-class="-translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-200 ease-in transform"
          leave-from-class="translate-x-0"
          leave-to-class="-translate-x-full"
        >
          <div class="w-72 bg-white h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div class="space-y-6">
              <div class="flex items-center justify-between pb-4 border-b border-[#e7e5e4]">
                <div>
                  <span class="font-display font-black text-base text-[#1c1917]">HIVELET</span>
                </div>
                <button 
                  @click="closeMobileNav" 
                  class="p-1.5 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] hover:text-[#1c1917] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X class="size-5" />
                </button>
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
                      'flex min-h-11 items-center justify-between rounded-xl px-3 text-xs sm:text-sm font-semibold transition-all',
                      isItemActive(item.to, item.aliases)
                        ? 'bg-[#e9f2ff] text-[#0c66e4] font-bold'
                        : 'text-[#475569] hover:bg-[#f5f5f4]'
                    ]"
                  >
                    <div class="flex items-center gap-3">
                      <component 
                        :is="item.icon" 
                        :class="[
                          'size-4 shrink-0',
                          isItemActive(item.to, item.aliases) 
                            ? 'text-[#0c66e4]' 
                            : 'text-[#64748b]'
                        ]" 
                      />
                      <span>{{ item.label }}</span>
                    </div>

                    <span 
                      v-if="item.badge" 
                      :class="['px-2 py-0.5 text-[10px] font-extrabold rounded-full', item.badgeColor]"
                    >
                      {{ item.badge }}
                    </span>
                  </router-link>
                </nav>
              </div>
            </div>

            <div class="p-3 bg-[#fafaf9] rounded-xl border border-[#e7e5e4] text-xs text-[#71717a] mt-6">
              <p class="font-bold text-[#1c1917]">Fe Galang Da Silva Boarding House</p>
              <p class="text-[11px] mt-0.5">32 Rentable Units • Legazpi City</p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>
