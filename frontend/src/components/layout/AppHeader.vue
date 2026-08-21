<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isMobileSidebarOpen, isLiveChatheadOpen, showToast } from '@/lib/systemState';
import { 
  currentUser, 
  isAuthenticated, 
  isAdmin, 
  isTenant, 
  logout 
} from '@/lib/authStore';
import { 
  Hexagon, 
  Menu, 
  MessageCircle, 
  Shield, 
  User, 
  Globe, 
  LogOut, 
  LogIn 
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const isAdminRoute = computed(() => route.path.startsWith('/admin') || route.path.startsWith('/basis'));
const isTenantRoute = computed(() => route.path.startsWith('/tenant'));
const isPublicRoute = computed(() => route.path.startsWith('/public') || route.path === '/');

async function handleSignOut() {
  await logout();
  showToast('info', 'Signed Out', 'You have been safely signed out.');
  await router.push('/login');
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[#e7e5e4] bg-[#fafaf9]/95 backdrop-blur-md">
    <div class="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      
      <!-- Left: Mobile Menu Toggle & Brand Logo -->
      <div class="flex items-center gap-3">
        <button
          v-if="isAdminRoute"
          @click="isMobileSidebarOpen = true"
          class="lg:hidden p-2 rounded-xl text-[#71717a] hover:text-[#1c1917] hover:bg-[#f5f5f4] transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu class="size-5" />
        </button>

        <router-link to="/public" class="flex items-center gap-2.5 group">
          <div class="size-9 rounded-xl bg-[#1e2532] text-[#f59e0b] grid place-items-center shadow-xs group-hover:scale-105 transition-transform">
            <Hexagon class="size-5 fill-current" />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-display font-black text-lg tracking-tight text-[#1c1917]">HIVELET</span>
              <span class="rounded-md bg-[#fbf6ee] px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-[#8a5814]">
                EST. 2026
              </span>
            </div>
            <p class="text-[10px] font-medium text-[#71717a] -mt-0.5 hidden sm:block">Fe Galang Da Silva Boarding House</p>
          </div>
        </router-link>
      </div>

      <!-- Center: Role Navigation Switcher Pills -->
      <nav class="hidden md:flex items-center gap-1.5 rounded-2xl bg-[#f5f5f4] p-1 border border-[#e7e5e4]">
        <router-link
          v-if="isAdmin"
          to="/admin/overview"
          :class="[
            'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
            isAdminRoute
              ? 'bg-white text-[#1c1917] shadow-xs'
              : 'text-[#71717a] hover:text-[#1c1917]'
          ]"
        >
          <Shield class="size-3.5 text-[#f59e0b]" />
          <span>Landlady Admin</span>
        </router-link>

        <router-link
          v-if="isAuthenticated"
          to="/tenant"
          :class="[
            'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
            isTenantRoute
              ? 'bg-white text-[#1c1917] shadow-xs'
              : 'text-[#71717a] hover:text-[#1c1917]'
          ]"
        >
          <User class="size-3.5 text-sky-600" />
          <span>Tenant Portal</span>
        </router-link>

        <router-link
          to="/public"
          :class="[
            'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
            isPublicRoute
              ? 'bg-white text-[#1c1917] shadow-xs'
              : 'text-[#71717a] hover:text-[#1c1917]'
          ]"
        >
          <Globe class="size-3.5 text-emerald-600" />
          <span>Public Guest Showcase</span>
        </router-link>
      </nav>

      <!-- Right: User Profile, Live Chat Button & Sign In / Out -->
      <div class="flex items-center gap-2.5">
        
        <!-- Live Chat Button with Badge -->
        <button
          @click="isLiveChatheadOpen = !isLiveChatheadOpen"
          class="relative flex items-center gap-1.5 rounded-xl border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-semibold text-[#1c1917] hover:bg-[#f5f5f4] transition-colors shadow-xs"
        >
          <MessageCircle class="size-4 text-[#f59e0b]" />
          <span class="hidden sm:inline">Live Chat</span>
          <span class="grid size-5 place-items-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        <!-- Authenticated User Profile & Sign Out -->
        <template v-if="isAuthenticated && currentUser">
          <div class="hidden sm:flex flex-col text-right">
            <span class="text-xs font-bold text-[#1c1917] truncate max-w-[130px]">{{ currentUser.fullName }}</span>
            <span class="text-[10px] text-[#71717a] capitalize">{{ currentUser.role }}</span>
          </div>

          <button
            @click="handleSignOut"
            class="btn-secondary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs"
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
