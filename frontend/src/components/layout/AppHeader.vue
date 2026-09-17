<script setup lang="ts">
/**
 * @file components/layout/AppHeader.vue
 * @description Solid white navbar with public section navigation & authenticated notification center.
 * @systemBibleRef Section 1 - Product Identity, Section 4 - Public Visitor Role & Section 16 - Notifications
 */
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isMobileSidebarOpen } from '@/lib/systemState';
import { 
  currentUser, 
  isAuthenticated, 
  isAdmin, 
  isTenant, 
  logout 
} from '@/lib/authStore';
/**
 * The notification centre.
 *
 * This import, the bell, the badge and the heartbeat were removed from this file
 * on 2026-08-26 by `8a34ec9` - a commit titled "complete UI visual audit,
 * speed-dial FABs, smooth transitions, and header harmonization". Nothing in
 * that message mentions notifications, and the `@description` above was left
 * describing an "authenticated notification center" the markup no longer had.
 *
 * For the twenty days that followed, `notificationService` went on writing rows
 * on five events and seven endpoints went on serving them, to a surface no route
 * could reach. On 2026-09-15 the table held 20 rows and every one was unread,
 * because nothing in the product was capable of reading one.
 *
 * Restored 2026-09-15. Keep this wiring when the header is restyled.
 */
import {
  unreadCount,
  hasEmergencyUnread,
  isPopoverOpen,
  startNotificationsHeartbeat,
  stopNotificationsHeartbeat
} from '@/lib/notificationsStore';
import NotificationPopover from './NotificationPopover.vue';
import { Menu, LogOut, LogIn, User, Bell, ChevronDown, Lock } from 'lucide-vue-next';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal.vue';

const route = useRoute();
const router = useRouter();
const isMobilePublicNavOpen = ref(false);
const isProfilePopoverOpen = ref(false);

/** Honorifics are not names. "Mrs. Fe Galang Da Silva" was initialled "MS". */
const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'engr', 'atty', 'sr', 'jr', 'prof']);

const userInitials = computed(() => {
  const name = currentUser.value?.fullName || 'User';
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((w) => w && !HONORIFICS.has(w.replace(/\./g, '').toLowerCase()));
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase();
});

const userRoleLabel = computed(() => {
  if (isAdmin.value) return 'Admin';
  if (isTenant.value) return 'Tenant';
  return 'Guest';
});

const isAdminRoute = computed(() => 
  route.path.startsWith('/admin') || route.path.startsWith('/basis')
);

const isTenantRoute = computed(() => 
  route.path.startsWith('/tenant')
);

const isPublicRoute = computed(() => 
  route.path.startsWith('/public') || 
  route.path.startsWith('/category') || 
  route.path === '/'
);

const brandRoute = computed(() => {
  if (isAdmin.value || isAdminRoute.value) return '/admin/overview';
  if (isTenant.value || isTenantRoute.value) return '/tenant';
  return '/public';
});

function toggleSidebar() {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
}

function toggleNotifications() {
  isPopoverOpen.value = !isPopoverOpen.value;
}

function scrollToSection(sectionId: string) {
  if (route.path === '/public' || route.path === '/') {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  } else {
    router.push(`/public#${sectionId}`);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  }
}

let popoverTimeout: ReturnType<typeof setTimeout> | null = null;

function handleMouseEnter() {
  if (popoverTimeout) clearTimeout(popoverTimeout);
  isProfilePopoverOpen.value = true;
}

function handleMouseLeave() {
  if (popoverTimeout) clearTimeout(popoverTimeout);
  popoverTimeout = setTimeout(() => {
    isProfilePopoverOpen.value = false;
  }, 180);
}

/**
 * `POST /auth/change-password` worked for months with nothing calling it, so
 * there was no way to change a password from inside the product at all - and
 * every tenant was onboarded on the same shared literal.
 */
const isChangePasswordOpen = ref(false);

function openChangePassword() {
  isProfilePopoverOpen.value = false;
  isChangePasswordOpen.value = true;
}

async function handleSignOut() {
  if (popoverTimeout) clearTimeout(popoverTimeout);
  isProfilePopoverOpen.value = false;
  // Stop polling before the token goes away, or the next tick fires a 401.
  stopNotificationsHeartbeat();
  await logout();
  router.push('/login');
}

/**
 * The poll follows the session, not the component. `immediate` matters: the
 * header mounts once, and a page reload restores an authenticated session
 * without ever transitioning false -> true.
 */
watch(
  () => isAuthenticated.value,
  (authed) => {
    if (authed) {
      startNotificationsHeartbeat();
    } else {
      stopNotificationsHeartbeat();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  stopNotificationsHeartbeat();
});
</script>

<template>
  <header class="sticky top-0 z-40 w-full bg-tile border-b border-line">
    <div class="max-w-[1600px] mx-auto flex h-16 items-center justify-between px-4 sm:px-6 relative">
      
      <!-- Left: Mobile Menu Toggle & Brand Logo -->
      <div class="flex items-center gap-3">
        <!-- Workspace Mobile Menu Toggle -->
        <button
          v-if="!isPublicRoute"
          @click="toggleSidebar"
          class="flex lg:hidden p-2 rounded-xl text-ink-soft hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu class="size-5" />
        </button>

        <!-- Public Mobile Menu Toggle -->
        <button
          v-if="isPublicRoute"
          @click="isMobilePublicNavOpen = !isMobilePublicNavOpen"
          class="flex md:hidden p-2 rounded-xl text-ink-soft hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu class="size-5" />
        </button>

        <router-link :to="brandRoute" class="flex items-center gap-2 group">
          <span class="font-semibold text-xl tracking-tight text-ink">HIVELET</span>
        </router-link>
      </div>

      <!-- Center: Public Quick Navigation (Desktop) -->
      <nav v-if="isPublicRoute" class="hidden md:flex items-center gap-1 sm:gap-2">
        <button
          @click="scrollToSection('categories')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-ink hover:text-brand hover:bg-canvas transition-all cursor-pointer"
        >
          Category Section
        </button>
        <button
          @click="scrollToSection('faqs')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-ink hover:text-brand hover:bg-canvas transition-all cursor-pointer"
        >
          FAQs
        </button>
        <button
          @click="scrollToSection('inquire-now')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-ink hover:text-brand hover:bg-canvas transition-all cursor-pointer"
        >
          Inquire Now
        </button>
        <button
          @click="scrollToSection('location')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-ink hover:text-brand hover:bg-canvas transition-all cursor-pointer"
        >
          Location
        </button>
      </nav>

      <!-- Right: User Profile & Sign In / Out -->
      <div class="flex items-center gap-2 sm:gap-3">

        <!-- Authenticated User Profile & Dropdown Avatar -->
        <template v-if="isAuthenticated && currentUser">
          <!-- Notification Bell + Popover. Restored 2026-09-15; see the note on the import. -->
          <div class="relative">
            <button
              @click="toggleNotifications"
              class="relative p-2 rounded-xl text-ink-soft hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
              :class="{ 'bg-canvas text-ink': isPopoverOpen }"
              aria-label="Open notifications"
              title="Notifications"
            >
              <Bell class="size-5" />

              <!-- Unread count. Emergency and High both surface as the danger tone. -->
              <span
                v-if="unreadCount > 0"
                class="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold rounded-full transition-transform"
                :class="hasEmergencyUnread ? 'bg-danger text-danger-foreground animate-pulse' : 'bg-brand text-brand-foreground'"
              >
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </span>
            </button>

            <NotificationPopover />
          </div>

          <!-- Avatar Button with Dropdown Arrow (Desktop & Mobile) -->
          <div 
            class="relative py-1"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
          >
            <button
              @click="isProfilePopoverOpen = !isProfilePopoverOpen"
              class="flex items-center gap-1.5 p-1 rounded-xl hover:bg-canvas transition-colors cursor-pointer group"
              title="Account Menu"
              aria-label="User Account Menu"
            >
              <div class="size-9 rounded-full bg-gradient-to-tr from-primary to-sky-400 p-0.5 group-hover:ring-2 group-hover:ring-brand/40 transition-all flex items-center justify-center">
                <span class="w-full h-full rounded-full bg-brand flex items-center justify-center text-[11px] font-semibold text-white">
                  {{ userInitials }}
                </span>
              </div>
              <ChevronDown :class="['size-3.5 text-ink-soft transition-transform duration-150', isProfilePopoverOpen && 'rotate-180']" />
            </button>

            <!-- Transparent click-outside backdrop (mobile) -->
            <div 
              v-if="isProfilePopoverOpen" 
              class="fixed inset-0 z-40 sm:hidden" 
              @click="isProfilePopoverOpen = false"
            />

            <!-- Interactive Popover Modal (School Portal Style) with Subtle Animation -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-2 scale-95"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-100"
              leave-to-class="opacity-0 -translate-y-2 scale-95"
            >
              <div
                v-if="isProfilePopoverOpen"
                class="absolute right-0 top-12 z-50 w-72 sm:w-80 rounded-tile border border-line bg-tile p-5 shadow-2xl origin-top-right"
                @mouseenter="handleMouseEnter"
                @mouseleave="handleMouseLeave"
              >
                <!-- Centered Profile Header with Circular Avatar -->
                <div class="flex flex-col items-center text-center pb-4 border-b border-line">
                  <div class="size-16 rounded-full ring-4 ring-brand-soft border-2 border-white shadow-md bg-gradient-to-tr from-primary to-sky-400 flex items-center justify-center text-white text-lg font-semibold">
                    {{ userInitials }}
                  </div>
                  <p class="font-semibold text-sm text-ink mt-3">
                    {{ isTenant ? currentUser.fullName : 'Administrator' }}
                  </p>
                  <p class="text-xs text-ink-soft truncate max-w-[240px] mt-0.5">
                    {{ currentUser.email }}
                  </p>
                  <span class="badge-soft badge-blue text-[10px] font-semibold uppercase mt-2.5">
                    {{ isTenant ? 'Active Resident' : 'Landlady Administrator' }}
                  </span>
                </div>

                <!-- Quick Action Navigation Links -->
                <div class="py-3 space-y-1">
                  <router-link
                    v-if="isTenant"
                    to="/tenant/profile"
                    @click="isProfilePopoverOpen = false"
                    class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-ink hover:bg-canvas transition-colors"
                  >
                    <User class="size-4 text-brand" />
                    <span>My Profile</span>
                  </router-link>

                  <!--
                    Not `v-if="isTenant"`. The administrator was onboarded on a
                    literal too, and until this existed nobody - her included -
                    could change a password without editing the database.
                  -->
                  <button
                    @click="openChangePassword"
                    class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-ink hover:bg-canvas transition-colors text-left cursor-pointer"
                  >
                    <Lock class="size-4 text-brand" />
                    <span>Change Password</span>
                  </button>

                  <button
                    @click="handleSignOut"
                    class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-overdue hover:bg-overdue-soft transition-colors text-left cursor-pointer"
                  >
                    <LogOut class="size-4 text-overdue" />
                    <span>Sign Out</span>
                  </button>
                </div>

                <!-- Discreet Footer -->
                <div class="pt-3 border-t border-line flex items-center justify-between text-[10px] text-ink-faint">
                  <span>Hivelet Portal</span>
                  <span>Fe Galang Da Silva BH</span>
                </div>
              </div>
            </Transition>
          </div>
        </template>

        <!-- Unauthenticated Guest Sign In Button -->
        <template v-else>
          <router-link
            to="/login"
            class="pill-btn-brand"
          >
            <LogIn class="size-3.5 text-white" />
            <span>Sign In</span>
          </router-link>
        </template>

      </div>
    </div>

    <!-- Mobile Public Navigation Dropdown Drawer -->
    <div
      v-if="isPublicRoute && isMobilePublicNavOpen"
      class="md:hidden border-t border-line bg-tile px-4 py-3 space-y-1 shadow-md animate-in slide-in-from-top duration-150"
    >
      <button
        @click="scrollToSection('categories'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-ink hover:bg-canvas hover:text-brand transition-all cursor-pointer"
      >
        Category Section
      </button>
      <button
        @click="scrollToSection('faqs'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-ink hover:bg-canvas hover:text-brand transition-all cursor-pointer"
      >
        FAQs
      </button>
      <button
        @click="scrollToSection('inquire-now'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-ink hover:bg-canvas hover:text-brand transition-all cursor-pointer"
      >
        Inquire Now
      </button>
      <button
        @click="scrollToSection('location'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-ink hover:bg-canvas hover:text-brand transition-all cursor-pointer"
      >
        Location
      </button>
    </div>
  </header>

  <ChangePasswordModal :open="isChangePasswordOpen" @close="isChangePasswordOpen = false" />
</template>
