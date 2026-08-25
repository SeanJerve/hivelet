<script setup lang="ts">
/**
 * @file components/layout/AppHeader.vue
 * @description Solid white navbar with public section navigation & authenticated notification center.
 * @systemBibleRef Section 1 - Product Identity, Section 4 - Public Visitor Role & Section 16 - Notifications
 */
import { ref, computed, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isMobileSidebarOpen } from '@/lib/systemState';
import { 
  currentUser, 
  isAuthenticated, 
  isAdmin, 
  isTenant, 
  logout 
} from '@/lib/authStore';
import { 
  unreadCount, 
  hasEmergencyUnread, 
  isPopoverOpen, 
  startNotificationsHeartbeat, 
  stopNotificationsHeartbeat 
} from '@/lib/notificationsStore';
import NotificationPopover from './NotificationPopover.vue';
import { 
  Menu, 
  LogOut, 
  LogIn,
  Bell
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const isMobilePublicNavOpen = ref(false);

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

async function handleSignOut() {
  stopNotificationsHeartbeat();
  await logout();
  router.push('/login');
}

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
  <header class="sticky top-0 z-40 w-full bg-white border-b border-[#e7e5e4] shadow-xs">
    <div class="max-w-[1600px] mx-auto flex h-16 items-center justify-between px-4 sm:px-6 relative">
      
      <!-- Left: Mobile Menu Toggle & Brand Logo -->
      <div class="flex items-center gap-3">
        <!-- Workspace Mobile Menu Toggle -->
        <button
          v-if="!isPublicRoute"
          @click="toggleSidebar"
          class="flex lg:hidden p-2 rounded-xl text-[#71717a] hover:bg-[#f5f5f4] hover:text-[#1c1917] transition-colors cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu class="size-5" />
        </button>

        <!-- Public Mobile Menu Toggle -->
        <button
          v-if="isPublicRoute"
          @click="isMobilePublicNavOpen = !isMobilePublicNavOpen"
          class="flex md:hidden p-2 rounded-xl text-[#71717a] hover:bg-[#f5f5f4] hover:text-[#1c1917] transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu class="size-5" />
        </button>

        <router-link :to="brandRoute" class="flex items-center gap-2 group">
          <div class="flex items-center gap-1.5">
            <span class="font-display font-black text-xl tracking-tight text-[#1c1917]">HIVELET</span>
            <span v-if="isAdminRoute || isAdmin" class="rounded-md bg-[#fbf6ee] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#8a5814] border border-[#fde68a]">
              LANDLADY ADMIN
            </span>
            <span v-else-if="isTenantRoute || isTenant" class="rounded-md bg-[#e9f2ff] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#0c66e4] border border-[#bfdbfe]">
              TENANT SPACE
            </span>
            <span v-else class="rounded-md bg-[#fbf6ee] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[#8a5814]">
              EST. 2026
            </span>
          </div>
        </router-link>
      </div>

      <!-- Center: Public Quick Navigation (Desktop) -->
      <nav v-if="isPublicRoute" class="hidden md:flex items-center gap-1 sm:gap-2">
        <button
          @click="scrollToSection('categories')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1c1917] hover:text-[#0c66e4] hover:bg-[#f5f5f4] transition-all cursor-pointer"
        >
          Category Section
        </button>
        <button
          @click="scrollToSection('about-us')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1c1917] hover:text-[#0c66e4] hover:bg-[#f5f5f4] transition-all cursor-pointer"
        >
          About Us
        </button>
        <button
          @click="scrollToSection('inquire-now')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1c1917] hover:text-[#0c66e4] hover:bg-[#f5f5f4] transition-all cursor-pointer"
        >
          Inquire Now
        </button>
        <button
          @click="scrollToSection('location')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1c1917] hover:text-[#0c66e4] hover:bg-[#f5f5f4] transition-all cursor-pointer"
        >
          Location
        </button>
      </nav>

      <!-- Right: User Profile & Sign In / Out -->
      <div class="flex items-center gap-2 sm:gap-3">

        <!-- Authenticated Notifications & User Profile -->
        <template v-if="isAuthenticated && currentUser">
          
          <!-- Notification Bell Button -->
          <div class="relative">
            <button
              @click="toggleNotifications"
              class="relative p-2 rounded-xl text-[#5e6c84] hover:text-[#172b4d] hover:bg-[#f4f5f7] transition-colors cursor-pointer"
              :class="{ 'bg-[#f4f5f7] text-[#172b4d]': isPopoverOpen }"
              aria-label="Open notifications"
              title="Notifications"
            >
              <Bell class="w-5 h-5" />
              
              <!-- Unread Badge Indicator -->
              <span
                v-if="unreadCount > 0"
                class="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-extrabold text-white rounded-full transition-transform"
                :class="hasEmergencyUnread ? 'bg-rose-600 animate-pulse' : 'bg-[#0c66e4]'"
              >
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </span>
            </button>

            <!-- Popover Dropdown -->
            <NotificationPopover />
          </div>

          <div class="hidden sm:flex flex-col text-right">
            <span class="text-xs font-bold text-[#1c1917] truncate max-w-[150px]">{{ currentUser.fullName }}</span>
            <span class="text-[10px] text-[#71717a] font-medium capitalize">{{ currentUser.role }}</span>
          </div>

          <button
            @click="handleSignOut"
            class="btn-secondary"
            title="Sign Out"
          >
            <LogOut class="size-3.5 text-[#71717a]" />
            <span class="hidden sm:inline">Sign Out</span>
          </button>
        </template>

        <!-- Unauthenticated Guest Sign In Button -->
        <template v-else>
          <router-link
            to="/login"
            class="btn-primary"
          >
            <LogIn class="size-3.5 text-[#f59e0b]" />
            <span>Sign In</span>
          </router-link>
        </template>

      </div>
    </div>

    <!-- Mobile Public Navigation Dropdown Drawer -->
    <div
      v-if="isPublicRoute && isMobilePublicNavOpen"
      class="md:hidden border-t border-[#e7e5e4] bg-white px-4 py-3 space-y-1 shadow-md animate-in slide-in-from-top duration-150"
    >
      <button
        @click="scrollToSection('categories'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-[#1c1917] hover:bg-[#f5f5f4] hover:text-[#0c66e4] transition-all cursor-pointer"
      >
        Category Section
      </button>
      <button
        @click="scrollToSection('about-us'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-[#1c1917] hover:bg-[#f5f5f4] hover:text-[#0c66e4] transition-all cursor-pointer"
      >
        About Us
      </button>
      <button
        @click="scrollToSection('inquire-now'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-[#1c1917] hover:bg-[#f5f5f4] hover:text-[#0c66e4] transition-all cursor-pointer"
      >
        Inquire Now
      </button>
      <button
        @click="scrollToSection('location'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-[#1c1917] hover:bg-[#f5f5f4] hover:text-[#0c66e4] transition-all cursor-pointer"
      >
        Location
      </button>
    </div>
  </header>
</template>
