<script setup lang="ts">
/**
 * @file components/layout/AppHeader.vue
 * @description Solid white navbar with public section navigation & authenticated notification center.
 * @systemBibleRef Section 1 - Product Identity, Section 4 - Public Visitor Role & Section 16 - Notifications
 */
import { ref, computed } from 'vue';
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
  Menu, 
  LogOut, 
  LogIn,
  User,
  ChevronDown
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const isMobilePublicNavOpen = ref(false);
const isProfilePopoverOpen = ref(false);

const userInitials = computed(() => {
  const name = currentUser.value?.fullName || 'User';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

async function handleSignOut() {
  if (popoverTimeout) clearTimeout(popoverTimeout);
  isProfilePopoverOpen.value = false;
  await logout();
  router.push('/login');
}
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
          <span class="font-display font-black text-xl tracking-tight text-[#1c1917]">HIVELET</span>
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
          @click="scrollToSection('faqs')"
          class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#1c1917] hover:text-[#0c66e4] hover:bg-[#f5f5f4] transition-all cursor-pointer"
        >
          FAQs
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

        <!-- Authenticated User Profile & Dropdown Avatar -->
        <template v-if="isAuthenticated && currentUser">
          <!-- Avatar Button with Dropdown Arrow (Desktop & Mobile) -->
          <div 
            class="relative py-1"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
          >
            <button
              @click="isProfilePopoverOpen = !isProfilePopoverOpen"
              class="flex items-center gap-1.5 p-1 rounded-xl hover:bg-[#f5f5f4] transition-colors cursor-pointer group"
              title="Account Menu"
              aria-label="User Account Menu"
            >
              <div class="size-9 rounded-full bg-gradient-to-tr from-[#0c66e4] to-sky-400 p-0.5 shadow-xs group-hover:ring-2 group-hover:ring-[#0c66e4]/40 transition-all flex items-center justify-center">
                <span class="w-full h-full rounded-full bg-[#0c66e4] flex items-center justify-center text-[11px] font-black tracking-wider text-white">
                  {{ userInitials }}
                </span>
              </div>
              <ChevronDown :class="['size-3.5 text-[#71717a] transition-transform duration-150', isProfilePopoverOpen && 'rotate-180']" />
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
                class="absolute right-0 top-12 z-50 w-72 sm:w-80 rounded-2xl border border-[#e7e5e4] bg-white p-5 shadow-2xl origin-top-right"
                @mouseenter="handleMouseEnter"
                @mouseleave="handleMouseLeave"
              >
                <!-- Centered Profile Header with Circular Avatar -->
                <div class="flex flex-col items-center text-center pb-4 border-b border-[#e7e5e4]">
                  <div class="size-16 rounded-full ring-4 ring-blue-100 border-2 border-white shadow-md bg-gradient-to-tr from-[#0c66e4] to-sky-400 flex items-center justify-center text-white text-lg font-black tracking-wider">
                    {{ userInitials }}
                  </div>
                  <p class="font-display font-black text-sm text-[#1c1917] mt-3">
                    {{ isTenant ? currentUser.fullName : 'Administrator' }}
                  </p>
                  <p class="text-xs text-[#71717a] truncate max-w-[240px] mt-0.5">
                    {{ currentUser.email }}
                  </p>
                  <span class="badge-soft badge-blue text-[10px] font-extrabold uppercase mt-2.5">
                    {{ isTenant ? 'Active Resident' : 'Landlady Administrator' }}
                  </span>
                </div>

                <!-- Quick Action Navigation Links -->
                <div class="py-3 space-y-1">
                  <router-link
                    v-if="isTenant"
                    to="/tenant/profile"
                    @click="isProfilePopoverOpen = false"
                    class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#1c1917] hover:bg-[#f5f5f4] transition-colors"
                  >
                    <User class="size-4 text-[#0c66e4]" />
                    <span>My Profile</span>
                  </router-link>

                  <button
                    @click="handleSignOut"
                    class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut class="size-4 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>

                <!-- Discreet Footer -->
                <div class="pt-3 border-t border-[#e7e5e4] flex items-center justify-between text-[10px] text-[#a1a1aa]">
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
            class="btn-primary"
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
      class="md:hidden border-t border-[#e7e5e4] bg-white px-4 py-3 space-y-1 shadow-md animate-in slide-in-from-top duration-150"
    >
      <button
        @click="scrollToSection('categories'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-[#1c1917] hover:bg-[#f5f5f4] hover:text-[#0c66e4] transition-all cursor-pointer"
      >
        Category Section
      </button>
      <button
        @click="scrollToSection('faqs'); isMobilePublicNavOpen = false"
        class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-[#1c1917] hover:bg-[#f5f5f4] hover:text-[#0c66e4] transition-all cursor-pointer"
      >
        FAQs
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
