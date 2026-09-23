<script setup lang="ts">
/**
 * @file components/layout/AppSidebar.vue
 * @description Borderless canvas workspace sidebar for Admin and Tenant navigation.
 * @systemBibleRef Section 1 - Corporate Aesthetic & Section 2 - System Architecture
 * @rationale Renders directly onto the canvas surface without an artificial white card container,
 *            preserving active brand-soft pills, legible typography, and smooth hover feedback.
 */
import { computed, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { isMobileSidebarOpen, inquiries, maintenanceTickets, incomeRecords } from '@/lib/systemState';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
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

function isItemActive(to: string, aliases: readonly string[]) {
  if (route.path === to) return true;
  if (aliases.includes(route.path)) return true;
  if (to === '/tenant' && (route.path === '/tenant' || route.path === '/tenant/overview')) return true;
  return false;
}

function closeMobileNav() {
  isMobileSidebarOpen.value = false;
}

/**
 * Hold the page still while the drawer is open.
 *
 * It had no lock at all: the drawer covered the screen and the page behind it
 * still scrolled under a drag on the backdrop, so closing it could leave the
 * reader somewhere else entirely. Found on an emulated handset, 2026-09-23.
 *
 * The same reference-counted lock `WsModal` uses (`lib/scrollLock.ts`) rather
 * than a second private counter, because a modal can be open over the drawer -
 * two independent counters would each clear the other's lock, which is the
 * exact bug WsModal's own history records between nested modals.
 *
 * `flush: 'post'` so the lock is taken after the drawer has actually been put
 * in the document, and released on unmount so navigating away with it open
 * cannot strand the page unscrollable.
 */
watch(
  isMobileSidebarOpen,
  (open, wasOpen) => {
    if (open === wasOpen) return;
    if (open) lockBodyScroll();
    else unlockBodyScroll();
  },
  { flush: 'post' }
);

onBeforeUnmount(() => {
  if (isMobileSidebarOpen.value) unlockBodyScroll();
});
</script>

<template>
  <div>
    <!-- Desktop Sidebar (Borderless Canvas Navigation) -->
    <aside class="sticky top-16 hidden h-[calc(100dvh-5rem)] w-60 shrink-0 lg:block py-6 pr-2">
      <nav class="grid gap-1">
        <router-link
          v-for="item in activeNav"
          :key="item.to"
          :to="item.to"
          :class="[
            'press flex min-h-11 items-center justify-between rounded-full px-4 text-sm',
            isItemActive(item.to, item.aliases)
              ? 'bg-brand-soft text-brand font-semibold'
              : 'text-ink-soft font-medium hover:bg-tile hover:text-ink'
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

          <!--
            The nav badge answers the count of something waiting - a ticket, an
            inquiry - and a count that snaps from nothing to a number is the
            one thing in a sidebar seen dozens of times a session worth
            noticing arrive. Kept short: this is not the flagship moment, it
            is a rank-and-file corner of a screen a reader passes often.

            150ms/100ms, not the original 120ms/90ms - this is the same job
            AppHeader's notification-count badge does (a count popping onto an
            icon), and that one already ran at 150ms/100ms; the two were
            drifting apart doing identical work.
          -->
          <Transition
            enter-active-class="motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
            enter-from-class="opacity-0 scale-75"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="motion-safe:transition-[opacity,transform] motion-safe:duration-100 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-75"
          >
            <span
              v-if="item.badge"
              :class="['min-w-6 px-2 py-0.5 text-center text-xs font-semibold tabular rounded-full', item.badgeColor]"
            >
              {{ item.badge }}
            </span>
          </Transition>
        </router-link>
      </nav>
    </aside>

    <!--
      Mobile Drawer Sheet with Smooth Slide Transition

      The backdrop used Tailwind's bare `ease-out` keyword, the one curve this
      workspace deliberately does not use - it is weaker than the tokened
      curve every other transition in the app accelerates with, so this drawer
      alone would have answered a fraction softer than the one it sits beside
      in AppHeader.
    -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobileSidebarOpen"
        class="ws-glass fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-xs"
        style="--ws-glass-solid: var(--night)"
        @click.self="closeMobileNav"
      >
        <!--
          The slide itself is gated with `motion-safe:` rather than the global
          `.ws-focus` reduced-motion rule - this drawer is not nested under a
          `.ws-focus` root, so nothing was catching its `translate-x` for a
          reader who has asked for less motion. The backdrop's opacity fade
          above is left unconditional: a fade is not vestibular motion, only
          the drawer sliding across the screen is.
        -->
        <Transition
          appear
          enter-active-class="motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)]"
          enter-from-class="-translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.32,0.72,0,1)]"
          leave-from-class="translate-x-0"
          leave-to-class="-translate-x-full"
        >
          <div class="w-72 bg-tile h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div class="space-y-6">
              <div class="flex items-center justify-between pb-4 border-b border-line">
                <div>
                  <span class="font-display text-base font-semibold tracking-tight text-ink">Hivelet</span>
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
                <nav class="grid gap-1">
                  <router-link
                    v-for="item in activeNav"
                    :key="item.to"
                    :to="item.to"
                    @click="closeMobileNav"
                    :class="[
                      'press flex min-h-11 items-center justify-between rounded-full px-4 text-sm',
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

                    <!-- Same badge, same fix as the desktop nav above: 150ms/100ms to match AppHeader's notification badge instead of the 120ms/90ms this drawer copy had drifted to. -->
                    <Transition
                      enter-active-class="motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
                      enter-from-class="opacity-0 scale-75"
                      enter-to-class="opacity-100 scale-100"
                      leave-active-class="motion-safe:transition-[opacity,transform] motion-safe:duration-100 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
                      leave-from-class="opacity-100 scale-100"
                      leave-to-class="opacity-0 scale-75"
                    >
                      <span
                        v-if="item.badge"
                        :class="['min-w-6 px-2 py-0.5 text-center text-xs font-semibold tabular rounded-full', item.badgeColor]"
                      >
                        {{ item.badge }}
                      </span>
                    </Transition>
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
