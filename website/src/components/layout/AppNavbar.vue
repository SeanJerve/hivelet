<!--
  @file components/layout/AppNavbar.vue
  @description Hivelet top application header with brand, public navigation, and session control.
  @systemBibleRef Section 4 - User Roles, Section 20 - Security
  @requirements FR-002 Role-Based Access
  @rationale Replaces the previous Public/Admin/Tenant role switcher. That
             control let any visitor assert the administrator role from the
             browser, which contradicts System Bible Section 20 — authorization
             "must be enforced on the backend, not only in the frontend". Role
             now comes from the authenticated session and nothing else.
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Shield, User, MessageSquare, Search, Globe, LogIn, LogOut, ChevronDown } from 'lucide-vue-next';
import { isLiveChatheadOpen, activeInquirers, showToast } from '@/lib/systemState';
import { currentUser, currentRole, isAuthenticated, isAdmin, logout } from '@/lib/authStore';

const router = useRouter();
const isMenuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const roleLabel = computed(() => {
  if (currentRole.value === 'admin') return 'Administrator';
  if (currentRole.value === 'tenant') return 'Tenant';
  if (currentRole.value === 'prospect') return 'Prospect';
  return 'Guest';
});

const initials = computed(() => {
  const name = currentUser.value?.fullName ?? '';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
});

function closeOnOutsideClick(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    isMenuOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', closeOnOutsideClick));
onBeforeUnmount(() => document.removeEventListener('click', closeOnOutsideClick));

async function handleSignOut() {
  const name = currentUser.value?.fullName ?? 'User';
  isMenuOpen.value = false;
  await logout();
  showToast('info', 'Signed Out', `${name} has been signed out.`);
  await router.push('/');
}
</script>

<template>
  <header
    class="h-20 bg-[#0b132b] text-white px-4 md:px-12 flex items-center justify-between sticky top-0 z-40 border-b border-white/10 shadow-xl"
  >
    <!-- Left: brand & public navigation -->
    <div class="flex items-center gap-8">
      <router-link to="/" class="flex items-center gap-2.5 font-bold text-xl tracking-tight">
        <span
          class="w-9 h-9 rounded-xl bg-[#0c66e4] text-white flex items-center justify-center font-mono font-extrabold shadow-lg text-lg"
        >H</span>
        <div class="flex flex-col">
          <span class="font-display tracking-wide font-extrabold text-white text-base leading-tight">Hivelet</span>
          <span class="text-[9px] font-medium text-slate-400 leading-none">Fe Galang Da Silva BH</span>
        </div>
      </router-link>

      <nav class="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
        <a href="#hero" class="hover:text-white transition-colors">Home</a>
        <a href="#highlights" class="hover:text-white transition-colors">Features</a>
        <a href="#rooms" class="hover:text-white transition-colors">Available Units</a>
        <a href="#rules" class="hover:text-white transition-colors">House Rules</a>
      </nav>
    </div>

    <!-- Center search -->
    <div class="hidden md:flex items-center relative w-64 lg:w-80">
      <input
        type="text"
        placeholder="Search unit code (e.g. 102, 204)..."
        class="w-full bg-white/10 text-white text-xs pl-4 pr-9 py-2 rounded-full border border-white/20 placeholder-slate-400 focus:outline-none focus:bg-white/20 transition-all"
      />
      <Search class="w-4 h-4 absolute right-3 text-slate-400" />
    </div>

    <!-- Right: locale, session control, role CTA -->
    <div class="flex items-center gap-3">
      <div class="hidden xl:flex items-center gap-1 text-xs font-semibold text-slate-300 mr-1">
        <Globe class="w-3.5 h-3.5" />
        <span>EN</span>
      </div>

      <!-- Signed out: a sign-in link, not a role selector -->
      <router-link
        v-if="!isAuthenticated"
        to="/login"
        class="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/20"
      >
        <LogIn class="w-3.5 h-3.5" />
        <span>Sign in</span>
      </router-link>

      <!-- Signed in: identity + role badge + sign out -->
      <div v-else ref="menuRef" class="relative">
        <button
          class="flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-1.5 pr-3 text-xs font-bold text-white transition-all hover:bg-white/20"
          @click.stop="isMenuOpen = !isMenuOpen"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full bg-[#0c66e4] text-[10px] font-extrabold"
          >{{ initials }}</span>
          <span class="hidden sm:flex flex-col items-start leading-tight">
            <span class="truncate max-w-[9rem]">{{ currentUser?.fullName }}</span>
            <span class="text-[9px] font-semibold text-slate-400">{{ roleLabel }}</span>
          </span>
          <ChevronDown class="w-3.5 h-3.5 text-slate-300" />
        </button>

        <div
          v-if="isMenuOpen"
          class="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-[#dfe1e6] bg-white text-[#172b4d] shadow-2xl"
        >
          <div class="border-b border-[#dfe1e6] bg-[#f7f8f9] px-4 py-3">
            <p class="truncate text-sm font-bold">{{ currentUser?.fullName }}</p>
            <p class="truncate text-[11px] text-[#6b778c]">{{ currentUser?.email }}</p>
            <span
              :class="[
                'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                isAdmin ? 'bg-[#e9f2ff] text-[#0c66e4]' : 'bg-[#e3fcef] text-[#216e4e]'
              ]"
            >
              <component :is="isAdmin ? Shield : User" class="h-3 w-3" />
              {{ roleLabel }}
            </span>
          </div>

          <router-link
            v-if="isAdmin"
            to="/admin/overview"
            class="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-[#f4f5f7]"
            @click="isMenuOpen = false"
          >
            <Shield class="h-3.5 w-3.5 text-[#0c66e4]" /> Landlady Operations
          </router-link>

          <router-link
            v-else
            to="/tenant"
            class="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-[#f4f5f7]"
            @click="isMenuOpen = false"
          >
            <User class="h-3.5 w-3.5 text-[#0c66e4]" /> My Room &amp; Billing
          </router-link>

          <button
            class="flex w-full cursor-pointer items-center gap-2 border-t border-[#dfe1e6] px-4 py-2.5 text-left text-xs font-semibold text-[#ae2a19] transition-colors hover:bg-[#ffebe6]"
            @click="handleSignOut"
          >
            <LogOut class="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>

      <!-- Role-specific CTA -->
      <button
        v-if="isAdmin"
        class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0b132b] shadow-md transition-all hover:bg-slate-100"
        @click="isLiveChatheadOpen = !isLiveChatheadOpen"
      >
        <MessageSquare class="h-3.5 w-3.5 text-[#0b132b]" />
        <span class="hidden sm:inline">Landlady Inbox</span>
        <span class="rounded-full bg-[#0b132b] px-1.5 py-0.5 text-[10px] font-bold text-white">
          {{ activeInquirers.length }}
        </span>
      </button>

      <a
        v-else-if="!isAuthenticated"
        href="#inquire"
        class="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0c66e4] px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-blue-600"
      >
        <MessageSquare class="h-3.5 w-3.5 text-white" />
        <span class="hidden sm:inline">Inquire Now</span>
      </a>

      <button
        v-else
        class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0b132b] shadow-md transition-all hover:bg-slate-100"
        @click="isLiveChatheadOpen = !isLiveChatheadOpen"
      >
        <MessageSquare class="h-3.5 w-3.5 text-[#0b132b]" />
        <span class="hidden sm:inline">Tenant Chat</span>
      </button>
    </div>
  </header>
</template>
