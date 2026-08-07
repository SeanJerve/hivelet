<script setup lang="ts">
/**
 * @component LoginView
 * @description Two distinct login flows (Admin & Staff vs Tenant), matching the System Bible's
 *              user-role split. Whichever tab is active determines the expected role; the DB's
 *              actual profiles.role is still the authority (stores/auth.ts rejects a mismatch).
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ShieldCheck, UserCheck, LogIn, Loader2, FlaskConical } from 'lucide-vue-next';
import PublicNavbar from '../components/layout/PublicNavbar.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const activeTab = ref<'admin' | 'tenant'>('admin');
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const submitting = ref(false);

const switchTab = (tab: 'admin' | 'tenant') => {
  activeTab.value = tab;
  errorMessage.value = '';
};

const submitLogin = async () => {
  errorMessage.value = '';
  submitting.value = true;
  try {
    const profile = await authStore.login(email.value.trim(), password.value, activeTab.value);
    router.push(profile.role === 'admin' ? '/admin/overview' : '/tenant');
  } catch (err: any) {
    errorMessage.value = err.message || 'Login failed. Please try again.';
  } finally {
    submitting.value = false;
  }
};

// Dev-only convenience: signs straight into a seeded test account. Gated on Vite's built-in DEV
// flag so this never ships in a production build (`import.meta.env.DEV` is false under `vite build`).
const isDev = import.meta.env.DEV;
const QUICK_LOGIN_ACCOUNTS = {
  admin: { email: 'admin@hivelet.ph', password: 'Hivelet2026!' },
  tenant: { email: 'mark.cruz@gmail.com', password: 'Hivelet2026!' }, // seeded with a room, a paid bill, and a ticket thread
} as const;

const quickLogin = async (role: 'admin' | 'tenant') => {
  activeTab.value = role;
  email.value = QUICK_LOGIN_ACCOUNTS[role].email;
  password.value = QUICK_LOGIN_ACCOUNTS[role].password;
  await submitLogin();
};
</script>

<template>
  <div class="lux-canvas min-h-screen">
    <PublicNavbar variant="solid" />

    <main class="max-w-md mx-auto px-5 py-16 md:py-24">
      <div class="lux-card p-8 space-y-6">
        <div class="text-center border-b border-[var(--lux-border)] pb-5">
          <span class="lux-eyebrow">Sign In</span>
          <h1 class="lux-serif text-2xl mt-2 text-[var(--lux-text)]">System Entry Portal</h1>
          <p class="text-xs text-[var(--lux-text-muted)] mt-1">Fe Galang Da Silva Boarding House</p>
        </div>

        <!-- Tabs -->
        <div class="flex items-center bg-[var(--lux-canvas)] p-1 border border-[var(--lux-border)] rounded text-xs">
          <button
            @click="switchTab('admin')"
            :class="['flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded font-medium transition-all', activeTab === 'admin' ? 'bg-[var(--lux-surface)] text-[var(--lux-text)] font-semibold shadow-sm border border-[var(--lux-border)]' : 'text-[var(--lux-text-muted)]']"
          >
            <ShieldCheck class="w-3.5 h-3.5" />
            Admin &amp; Staff
          </button>
          <button
            @click="switchTab('tenant')"
            :class="['flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded font-medium transition-all', activeTab === 'tenant' ? 'bg-[var(--lux-surface)] text-[var(--lux-text)] font-semibold shadow-sm border border-[var(--lux-border)]' : 'text-[var(--lux-text-muted)]']"
          >
            <UserCheck class="w-3.5 h-3.5" />
            Tenant
          </button>
        </div>

        <form @submit.prevent="submitLogin" class="space-y-4">
          <div>
            <label class="lux-label">Email Address</label>
            <input v-model="email" type="email" required placeholder="you@example.com" class="lux-input" />
          </div>
          <div>
            <label class="lux-label">Password</label>
            <input v-model="password" type="password" required placeholder="••••••••" class="lux-input" />
          </div>

          <div v-if="errorMessage" class="p-3 bg-[#f7e6e2] border border-[#e3b7ac] rounded text-[#8a3a26] text-xs">
            {{ errorMessage }}
          </div>

          <button type="submit" :disabled="submitting" class="lux-btn-primary w-full justify-center py-3 disabled:opacity-60">
            <Loader2 v-if="submitting" class="w-3.5 h-3.5 animate-spin" />
            <LogIn v-else class="w-3.5 h-3.5" />
            <span>{{ submitting ? 'Signing in…' : `Login to ${activeTab === 'admin' ? 'Admin Dashboard' : 'Tenant Portal'}` }}</span>
          </button>
        </form>

        <p class="text-[11px] text-[var(--lux-text-muted)] text-center border-t border-[var(--lux-border)] pt-4 leading-relaxed">
          Tenant accounts are created by the administrator during onboarding.
          Prospective tenants should <router-link to="/rooms" class="text-[var(--lux-accent)] font-medium">submit an inquiry</router-link> instead.
        </p>

        <!-- Dev-only: quick sign-in to a seeded test account, never shown in a production build -->
        <div v-if="isDev" class="border-t border-dashed border-[var(--lux-border)] pt-4 space-y-2">
          <p class="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[var(--lux-text-muted)] uppercase tracking-wider">
            <FlaskConical class="w-3 h-3" />
            Development Quick Login
          </p>
          <div class="flex gap-2">
            <button @click="quickLogin('admin')" :disabled="submitting" class="lux-btn-secondary flex-1 justify-center text-xs disabled:opacity-50">
              Admin
            </button>
            <button @click="quickLogin('tenant')" :disabled="submitting" class="lux-btn-secondary flex-1 justify-center text-xs disabled:opacity-50">
              Tenant
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
