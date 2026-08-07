<script setup lang="ts">
/**
 * @component TenantNavbar
 * @description Top nav for the signed-in Tenant Portal -- logo, Home, notifications, a message icon
 *              that jumps to the tenant's maintenance-ticket threads, and profile/logout.
 * @systemBibleRef Section 4 - Tenant User Role
 * @rationale Same luxury design language as the public site (Playfair Display wordmark, warm-neutral
 *            palette) but structured as a logged-in product dashboard, not a marketing page -- the
 *            distinction the project drew between how a public visitor and a registered tenant
 *            experience the site (analogous to a storefront vs. a logged-in buyer account).
 * @innovations Messaging is intentionally scoped to existing maintenance-ticket threads (project
 *              decision, 2026-08-07) rather than a new generic conversation feature -- the message
 *              icon scrolls to the Tickets section instead of opening a separate inbox.
 */
import { useRouter } from 'vue-router';
import { MessageSquare, LogOut, User as UserIcon } from 'lucide-vue-next';
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import TenantNotificationBell from '../ui/TenantNotificationBell.vue';

const router = useRouter();
const authStore = useAuthStore();
const profileMenuOpen = ref(false);

const scrollToTickets = () => {
  document.getElementById('tickets')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<template>
  <header class="sticky top-0 z-40 bg-[var(--lux-canvas)] border-b border-[var(--lux-border)] px-5 md:px-8">
    <div class="max-w-5xl mx-auto flex items-center justify-between py-4">
      <button @click="router.push('/tenant')" class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-full border border-[var(--lux-text)] flex items-center justify-center lux-serif text-sm text-[var(--lux-text)]">H</div>
        <div class="text-left leading-tight">
          <div class="lux-serif text-base tracking-[0.12em] uppercase text-[var(--lux-text)]">Hivelet</div>
          <p class="text-[10px] tracking-[0.08em] uppercase text-[var(--lux-text-muted)]">Tenant Portal</p>
        </div>
      </button>

      <div class="flex items-center gap-1.5 sm:gap-3">
        <button @click="router.push('/tenant')" class="hidden sm:inline text-xs font-medium tracking-[0.04em] uppercase text-[var(--lux-text)] hover:text-[var(--lux-accent)] px-2 py-2">
          Home
        </button>

        <button @click="scrollToTickets" class="relative p-2 text-[var(--lux-text)] hover:bg-[var(--lux-surface)] rounded-full transition-colors" title="My Maintenance Tickets">
          <MessageSquare class="w-4.5 h-4.5" />
        </button>

        <TenantNotificationBell />

        <div class="relative">
          <button @click="profileMenuOpen = !profileMenuOpen" class="flex items-center gap-2 bg-[var(--lux-surface)] border border-[var(--lux-border)] rounded-full pl-2 pr-1 py-1">
            <UserIcon class="w-3.5 h-3.5 text-[var(--lux-accent)]" />
            <span class="hidden sm:inline text-xs font-medium text-[var(--lux-text)] pr-1">{{ authStore.profile?.full_name?.split(' ')[0] }}</span>
          </button>

          <div v-if="profileMenuOpen" class="fixed inset-0 z-40" @click="profileMenuOpen = false"></div>
          <div v-if="profileMenuOpen" class="absolute right-0 mt-2 w-48 lux-card bg-[var(--lux-surface)] shadow-lg z-50 py-1">
            <div class="px-3 py-2 border-b border-[var(--lux-border)]">
              <p class="text-xs font-semibold text-[var(--lux-text)] truncate">{{ authStore.profile?.full_name }}</p>
              <p class="text-[10px] text-[var(--lux-text-muted)] truncate">{{ authStore.profile?.email }}</p>
            </div>
            <button @click="handleLogout" class="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#8a3a26] hover:bg-[var(--lux-canvas)] transition-colors">
              <LogOut class="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
