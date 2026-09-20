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
/**
 * OPEN leads, not all of them. This counted `inquiries.length` under a comment
 * saying "Actionable", one line above a ticket badge that correctly excludes
 * Resolved and Closed - so a lead she had already converted or closed went on
 * asking for attention, and the badge became a number that could only ever go
 * up.
 *
 * Latent rather than visibly wrong today: there is one enquiry live and it is
 * Contacted, so the count is currently right by coincidence.
 *
 * The predicate is `isLeadOpen` in `InquiriesView.vue`, which owns this
 * question. Duplicated rather than shared because that file is not exported
 * from - if it ever grows a shared module, this should follow it there.
 */
const inquiriesCount = computed(
  () => inquiries.filter((i) => i.status !== 'Converted' && i.status !== 'Closed').length
);
const urgentTicketsCount = computed(() => 
  maintenanceTickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed' && (t.priority === 'Emergency' || t.priority === 'High')).length
);

const ADMIN_NAV = computed(() => [
  { to: '/admin/overview', aliases: ['/basis/overview'], label: 'Executive Overview', icon: LayoutDashboard, badge: null, badgeColor: '' },
  { to: '/admin/directory', aliases: ['/basis/directory'], label: 'Room & Rate Directory', icon: Building2, badge: null, badgeColor: '' },
  { to: '/admin/tenants', aliases: ['/basis/tenants'], label: 'Active Tenants', icon: Users, badge: null, badgeColor: '' },
  { to: '/admin/income', aliases: ['/basis/income'], label: 'Income & Collections', icon: Wallet, badge: null, badgeColor: '' },
  { to: '/admin/expenses', aliases: ['/basis/expenses'], label: 'Monthly Expenses', icon: ReceiptText, badge: null, badgeColor: '' },
  { to: '/admin/tickets', aliases: ['/basis/tickets'], label: 'Maintenance Dispatch', icon: Wrench, badge: urgentTicketsCount.value > 0 ? urgentTicketsCount.value : null, badgeColor: 'bg-overdue text-white' },
  { to: '/admin/inquiries', aliases: ['/basis/inquiries'], label: 'Prospect Inquiries', icon: Inbox, badge: inquiriesCount.value > 0 ? inquiriesCount.value : null, badgeColor: 'bg-brand text-on-brand' },
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
    <aside class="sticky top-20 hidden h-[calc(100dvh-6rem)] w-64 shrink-0 rounded-tile bg-tile p-3 lg:block my-6">
      <p class="px-3 pt-2 pb-3 text-xs font-medium text-ink-faint">
        {{ spaceCategory }}
      </p>

      <nav class="grid gap-1">
        <router-link
          v-for="item in activeNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex min-h-11 items-center justify-between rounded-full px-4 text-sm transition-colors duration-150',
            isItemActive(item.to, item.aliases)
              ? 'bg-brand-soft text-brand font-semibold'
              : 'text-ink-soft font-medium hover:bg-canvas hover:text-ink'
          ]"
        >
          <div class="flex items-center gap-3">
            <component 
              :is="item.icon" 
              :class="[
                'size-4 shrink-0 transition-colors',
                isItemActive(item.to, item.aliases) 
                  ? 'text-brand' 
                  : 'text-ink-faint'
              ]" 
            />
            <span>{{ item.label }}</span>
          </div>

          <span 
            v-if="item.badge" 
            :class="['min-w-6 px-2 py-0.5 text-center text-xs font-semibold tabular rounded-full', item.badgeColor]"
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
      leave-active-class="transition-opacity duration-200 ease-out"
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
          enter-active-class="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          enter-from-class="-translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]"
          leave-from-class="translate-x-0"
          leave-to-class="-translate-x-full"
        >
          <div class="w-72 bg-tile h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div class="space-y-6">
              <div class="flex items-center justify-between pb-4 border-b border-line">
                <div>
                  <span class="text-base font-semibold tracking-tight text-ink">Hivelet</span>
                </div>
                <button 
                  @click="closeMobileNav" 
                  class="icon-btn"
                  aria-label="Close menu"
                >
                  <X class="size-5" />
                </button>
              </div>

              <!-- Section Specific Navigation -->
              <div>
                <p class="px-2 pb-3 text-xs font-medium text-ink-faint">
                  {{ spaceCategory }}
                </p>
                <nav class="grid gap-1">
                  <router-link
                    v-for="item in activeNav"
                    :key="item.to"
                    :to="item.to"
                    @click="closeMobileNav"
                    :class="[
                      'flex min-h-11 items-center justify-between rounded-full px-4 text-sm transition-colors',
                      isItemActive(item.to, item.aliases)
                        ? 'bg-brand-soft text-brand font-semibold'
                        : 'text-ink-soft font-medium hover:bg-canvas hover:text-ink'
                    ]"
                  >
                    <div class="flex items-center gap-3">
                      <component 
                        :is="item.icon" 
                        :class="[
                          'size-4 shrink-0',
                          isItemActive(item.to, item.aliases) 
                            ? 'text-brand' 
                            : 'text-ink-faint'
                        ]" 
                      />
                      <span>{{ item.label }}</span>
                    </div>

                    <span 
                      v-if="item.badge" 
                      :class="['min-w-6 px-2 py-0.5 text-center text-xs font-semibold tabular rounded-full', item.badgeColor]"
                    >
                      {{ item.badge }}
                    </span>
                  </router-link>
                </nav>
              </div>
            </div>

            <div class="p-4 bg-canvas rounded-2xl text-xs text-ink-soft mt-6">
              <p class="font-semibold text-ink">Fe Galang Da Silva Boarding House</p>
              <p class="mt-0.5">33 rentable units, Legazpi City</p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>
