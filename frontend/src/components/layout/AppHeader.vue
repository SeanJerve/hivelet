<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
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

function toggleSidebar() {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
}

function toggleNotifications() {
  isPopoverOpen.value = !isPopoverOpen.value;
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
  <header class="sticky top-0 z-40 w-full border-b border-[#e7e5e4] bg-white/95 backdrop-blur-md">
    <div class="max-w-[1600px] mx-auto flex h-16 items-center justify-between px-4 sm:px-6 relative">
      
      <!-- Left: Mobile Menu Toggle & Brand Logo -->
      <div class="flex items-center gap-3">
        <button
          v-if="!isPublicRoute"
          @click="toggleSidebar"
          class="flex lg:hidden p-2 rounded-xl text-[#71717a] hover:bg-[#f5f5f4] hover:text-[#1c1917] transition-colors cursor-pointer"
          aria-label="Toggle navigation"
        >
          <Menu class="size-5" />
        </button>

        <router-link :to="isAdminRoute ? '/admin/overview' : '/public'" class="flex items-center gap-2 group">
          <div class="flex items-center gap-1.5">
            <span class="font-display font-black text-xl tracking-tight text-[#1c1917]">HIVELET</span>
            <span v-if="isAdminRoute" class="rounded-md bg-[#fbf6ee] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#8a5814] border border-[#fde68a]">
              LANDLADY ADMIN
            </span>
            <span v-else-if="isTenantRoute" class="rounded-md bg-[#e9f2ff] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#0c66e4] border border-[#bfdbfe]">
              TENANT SPACE
            </span>
            <span v-else class="rounded-md bg-[#fbf6ee] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[#8a5814]">
              EST. 2026
            </span>
          </div>
        </router-link>
      </div>

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
            class="btn-secondary min-h-9 px-3.5 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
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
            class="btn-primary min-h-9 px-3.5 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs"
          >
            <LogIn class="size-3.5 text-[#f59e0b]" />
            <span>Sign In</span>
          </router-link>
        </template>

      </div>
    </div>
  </header>
</template>
