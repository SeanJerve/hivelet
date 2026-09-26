<script setup lang="ts">
/**
 * @file components/layout/AppSidebar.vue
 * @description Borderless canvas workspace sidebar for Admin and Tenant navigation.
 * @systemBibleRef Section 1 - Corporate Aesthetic & Section 2 - System Architecture
 * @rationale Renders directly onto the canvas surface without an artificial white card container,
 *            preserving active brand-soft pills, legible typography, and smooth hover feedback.
 */
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import {
  isMobileSidebarOpen,
  inquiries,
  maintenanceTickets,
  incomeRecords,
  fetchInquiries,
  fetchMaintenanceTickets,
} from '@/lib/systemState';
import { isAuthenticated, isAdmin } from '@/lib/authStore';
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
  ShieldCheck,
  Globe
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

/**
 * The two counts above are correctly REACTIVE - wrapped in `computed()`, so
 * they update the instant `inquiries` or `maintenanceTickets` changes - but
 * nothing kept those arrays themselves current. `fetchInquiries()` and
 * `fetchMaintenanceTickets()` were called from exactly one place in the whole
 * app: `AdminOverviewView`'s `onMounted`. An administrator who landed on
 * Income, or bookmarked straight into Tickets, and stayed there had a sidebar
 * showing whatever those arrays held at last Overview visit - zero, if this
 * session never loaded Overview at all - while the notification bell three
 * inches away kept polling every 12 seconds regardless of which screen was
 * open. Two indicators answering the same question, only one of them live.
 *
 * Polled here rather than folded into that heartbeat: notifications and
 * sidebar badges are different concerns that happen to share a cadence, not
 * the same concern, and coupling them would mean a change to one poll's
 * error handling or backoff silently changing the other's.
 *
 * 45 seconds, not 12: these are moderate-priority counts, not money or an
 * unread message, and every tick here is two full-list refetches
 * (`fetchInquiries`/`fetchMaintenanceTickets` return complete records, the
 * same calls the Inquiries and Dispatch screens use to populate themselves,
 * not a lightweight count) - unlike the notification badge, which now has a
 * real COUNT(*) route behind it. A shorter interval would just be paying
 * that cost more often for a number nobody is watching in real time the way
 * they watch a bell.
 *
 * Gated on `isAdmin`, not `isTenantSection`: the badges are admin-only
 * (`TENANT_NAV` sets `badge: null` throughout), so a tenant session should
 * never open this connection at all, not merely fail to render its result.
 *
 * Same lifecycle shape as `AppHeader.vue`'s notification heartbeat -
 * `immediate: true` because a page reload restores an authenticated session
 * without ever transitioning false -> true, and torn down on unmount so
 * leaving the workspace (this component is conditionally mounted, see
 * `App.vue`'s `isWorkspaceSection`) cannot leave a timer running against a
 * component that no longer exists.
 */
let badgeRefreshInterval: ReturnType<typeof setInterval> | null = null;

function refreshSidebarBadgeCounts() {
  if (!isAuthenticated.value || !isAdmin.value) return;
  fetchInquiries();
  fetchMaintenanceTickets();
}

watch(
  () => isAuthenticated.value && isAdmin.value,
  (active) => {
    if (badgeRefreshInterval) {
      clearInterval(badgeRefreshInterval);
      badgeRefreshInterval = null;
    }
    if (active) {
      refreshSidebarBadgeCounts();
      badgeRefreshInterval = setInterval(refreshSidebarBadgeCounts, 45_000);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (badgeRefreshInterval) {
    clearInterval(badgeRefreshInterval);
    badgeRefreshInterval = null;
  }
});

const ADMIN_NAV = computed(() => [
  { to: '/admin/overview', aliases: ['/basis/overview'], label: 'Overview', icon: LayoutDashboard, badge: null, badgeColor: '' },
  { to: '/admin/directory', aliases: ['/basis/directory'], label: 'Rooms and rates', icon: Building2, badge: null, badgeColor: '' },
  { to: '/admin/tenants', aliases: ['/basis/tenants'], label: 'Tenants', icon: Users, badge: null, badgeColor: '' },
  { to: '/admin/income', aliases: ['/basis/income'], label: 'Money coming in', icon: Wallet, badge: null, badgeColor: '' },
  { to: '/admin/expenses', aliases: ['/basis/expenses'], label: 'Money going out', icon: ReceiptText, badge: null, badgeColor: '' },
  { to: '/admin/tickets', aliases: ['/basis/tickets'], label: 'Repairs', icon: Wrench, badge: urgentTicketsCount.value > 0 ? urgentTicketsCount.value : null, badgeColor: 'bg-overdue text-white' },
  { to: '/admin/inquiries', aliases: ['/basis/inquiries'], label: 'Inquiries', icon: Inbox, badge: inquiriesCount.value > 0 ? inquiriesCount.value : null, badgeColor: 'bg-brand text-on-brand' },
  { to: '/admin/audit-logs', aliases: ['/admin/audit'], label: 'Activity', icon: ShieldCheck, badge: null, badgeColor: '' },
]);

const TENANT_NAV = computed(() => [
  { to: '/tenant', aliases: ['/tenant/overview'], label: 'Overview', icon: Home, badge: null, badgeColor: '' },
  { to: '/tenant/payments', aliases: [], label: 'Payments and billing', icon: CreditCard, badge: null, badgeColor: '' },
  { to: '/tenant/tickets', aliases: [], label: 'Repairs', icon: Wrench, badge: null, badgeColor: '' },
  { to: '/tenant/profile', aliases: [], label: 'My details', icon: UserCheck, badge: null, badgeColor: '' },
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
/**
 * Focus goes into the drawer on open, stays there, and comes back on close.
 *
 * The drawer covers the page, but Tab walked straight out of it into the links
 * behind the backdrop, Escape did nothing, and closing it dropped focus on the
 * page body (B-61). It now behaves like `WsModal`: focus moves to the close
 * button, Tab wraps inside the panel, Escape closes, and focus returns to
 * whatever opened it - the header's menu button, captured here rather than
 * reached into `AppHeader.vue` for.
 */
const drawerPanel = ref<HTMLElement | null>(null);
let returnFocusTo: HTMLElement | null = null;

function onDrawerKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    closeMobileNav();
    return;
  }
  if (e.key !== 'Tab' || !drawerPanel.value) return;
  // Same selector and filter as WsModal's trap.
  const focusable = [...drawerPanel.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'
  )].filter((el) => el.offsetParent !== null && el.getAttribute('tabindex') !== '-1');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (!drawerPanel.value.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

watch(
  isMobileSidebarOpen,
  (open, wasOpen) => {
    if (open === wasOpen) return;
    if (open) {
      lockBodyScroll();
      // On the document, not the overlay, so Escape still closes the drawer
      // when focus has fallen to the body.
      document.addEventListener('keydown', onDrawerKeydown);
      returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      drawerPanel.value?.querySelector<HTMLElement>('button, a[href]')?.focus();
    } else {
      unlockBodyScroll();
      document.removeEventListener('keydown', onDrawerKeydown);
      // Only if it is still on the page.
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
      returnFocusTo = null;
    }
  },
  { flush: 'post' }
);

/**
 * The drawer is `lg:hidden`, so a tablet turned to landscape (or a window
 * widened) with it open left an invisible drawer holding the scroll lock and
 * focus trap. Close it once the desktop sidebar takes over.
 */
const desktopQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null;
function onDesktopChange(e: MediaQueryListEvent) {
  if (e.matches) closeMobileNav();
}
desktopQuery?.addEventListener('change', onDesktopChange);

onBeforeUnmount(() => {
  desktopQuery?.removeEventListener('change', onDesktopChange);
  document.removeEventListener('keydown', onDrawerKeydown);
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

      <!-- The way back to the public site from inside the workspace. Below the
           section nav and quieter than it: it leaves the workspace. -->
      <div class="mt-4 border-t border-line pt-4">
        <router-link
          to="/public"
          class="press flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-medium text-ink-soft hover:bg-tile hover:text-ink"
        >
          <Globe class="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
          <span>Visit the website</span>
        </router-link>
      </div>
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
          <div
            id="workspace-mobile-nav"
            ref="drawerPanel"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            class="w-72 bg-tile h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto"
          >
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
                  <X class="size-5" aria-hidden="true" />
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

                <!--
                  The straight divider above "Overview" (border-b on
                  a plain div) sits on an element with no border-radius. This
                  one used to put border-t directly on the rounded-full link
                  below, so the line curved around the pill's corner instead
                  of running straight. The divider now lives on this plain
                  wrapping div, and rounded-full stays on the link itself,
                  which is what every other row in this list uses for its own
                  hover shape.
                -->
                <div class="mt-3 border-t border-line pt-3">
                  <router-link
                    to="/public"
                    @click="closeMobileNav"
                    class="press flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink"
                  >
                    <Globe class="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <span>Visit the website</span>
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>
