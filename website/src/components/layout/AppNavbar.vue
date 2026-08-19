<!--
  @component AppNavbar
  @description Hivelet top minimal application header with session control and direct inquiry trigger.
  @systemBibleRef Section 4 - User Roles & Authorization Boundaries
  @rationale Clean corporate minimalist navbar removing redundant logos, links, and search bars for a distraction-free experience.
  @innovations In-place inquiry trigger invoking the blurred backdrop InquiryModal without page disruption.
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Shield, User, MessageSquare, LogIn, LogOut, ChevronDown } from 'lucide-vue-next';
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

function handleNavInquire() {
  if (router.currentRoute.value.path === '/') {
    const el = document.getElementById('inquire');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }
  router.push('/').then(() => {
    setTimeout(() => {
      const el = document.getElementById('inquire');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  });
}
</script>

<template>
  <header
    class="h-16 bg-[#0b132b] text-white sticky top-0 z-40 border-b border-white/10 shadow-lg flex items-center"
  >
    <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      <!-- Left space / Brand anchor -->
      <div class="flex items-center gap-4">
        <router-link to="/" class="text-xs font-semibold text-slate-300 hover:text-white transition-colors">
          Hivelet
        </router-link>
      </div>

      <!-- Right: session control & Inquire Now trigger -->
      <div class="flex items-center gap-3">
        <!-- Signed out: a sign-in link and Inquire Now button -->
        <template v-if="!isAuthenticated">
        <router-link
          to="/login"
          class="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/20"
        >
          <LogIn class="w-3.5 h-3.5" />
          <span>Sign in</span>
        </router-link>

        <button
          type="button"
          @click="handleNavInquire"
          class="flex cursor-pointer items-center gap-1.5 rounded-full bg-[#0c66e4] px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:bg-blue-600"
        >
          <MessageSquare class="w-3.5 h-3.5 text-white" />
          <span>Inquire Now</span>
        </button>
      </template>

      <!-- Signed in: identity + role badge + sign out -->
      <div v-else ref="menuRef" class="relative flex items-center gap-3">
        <button
          class="flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pl-1.5 pr-3 text-xs font-bold text-white transition-all hover:bg-white/20"
          @click.stop="isMenuOpen = !isMenuOpen"
        >
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full bg-[#0c66e4] text-[10px] font-extrabold"
          >{{ initials }}</span>
          <span class="hidden sm:flex flex-col items-start leading-tight">
            <span class="truncate max-w-[9rem]">{{ currentUser?.fullName }}</span>
            <span class="text-[9px] font-semibold text-slate-400">{{ roleLabel }}</span>
          </span>
          <ChevronDown class="w-3.5 h-3.5 text-slate-300" />
        </button>

        <div
          v-if="isMenuOpen"
          class="absolute right-0 top-10 mt-2 w-64 overflow-hidden rounded-lg border border-[#dfe1e6] bg-white text-[#172b4d] shadow-2xl"
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

        <!-- Role-specific action buttons -->
        <button
          v-if="isAdmin"
          class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0b132b] shadow-md transition-all hover:bg-slate-100"
          @click="isLiveChatheadOpen = !isLiveChatheadOpen"
        >
          <MessageSquare class="h-3.5 w-3.5 text-[#0b132b]" />
          <span class="hidden sm:inline">Landlady Inbox</span>
          <span class="rounded-full bg-[#0b132b] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {{ activeInquirers.length }}
          </span>
        </button>

        <button
          v-else
          class="flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0b132b] shadow-md transition-all hover:bg-slate-100"
          @click="isLiveChatheadOpen = !isLiveChatheadOpen"
        >
          <MessageSquare class="h-3.5 w-3.5 text-[#0b132b]" />
          <span class="hidden sm:inline">Tenant Chat</span>
        </button>
      </div>
    </div>
  </div>
</header>
</template>
