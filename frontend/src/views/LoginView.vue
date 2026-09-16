<script setup lang="ts">
import type { DemoAccount } from '@/lib/demoAccounts.dev';
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogIn, UserPlus, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import { login, registerUser, authError, isAuthenticating, homeRouteForRole } from '@/lib/authStore';
import { showToast } from '@/lib/systemState';

const router = useRouter();
const route = useRoute();

const isSignUp = ref(false);
const email = ref('');
const password = ref('');
const fullName = ref('');
const phoneNumber = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);

const redirectPath = computed(() => (route.query.redirect as string | undefined) ?? null);
const deniedReason = computed(() => (route.query.reason as string | undefined) ?? null);

const canSubmit = computed(() => {
  if (isAuthenticating.value) return false;
  if (isSignUp.value) {
    return (
      fullName.value.trim().length > 1 &&
      email.value.trim().length > 3 &&
      password.value.length >= 10 &&
      password.value === confirmPassword.value
    );
  }
  return email.value.trim().length > 3 && password.value.length > 0;
});

onMounted(() => {
  authError.value = null;
});

function toggleMode() {
  isSignUp.value = !isSignUp.value;
  authError.value = null;
  password.value = '';
  confirmPassword.value = '';
}

async function handleSubmit() {
  if (!canSubmit.value) return;

  try {
    if (isSignUp.value) {
      if (!/[A-Za-z]/.test(password.value) || !/[0-9]/.test(password.value)) {
        authError.value = 'Password must be at least 10 characters and contain both letters and numbers.';
        return;
      }

      const user = await registerUser({
        email: email.value.trim(),
        password: password.value,
        fullName: fullName.value.trim(),
        phoneNumber: phoneNumber.value.trim() || undefined,
      });

      showToast('success', 'Account Created', `Welcome to Hivelet, ${user.fullName}!`);
      await router.replace('/tenant');
    } else {
      const user = await login(email.value.trim(), password.value);
      password.value = '';

      showToast('success', 'Signed In', `Welcome back, ${user.fullName}.`);

      const fallback = homeRouteForRole(user.role);
      const target = redirectPath.value ?? fallback;
      const isAdminTarget = target.startsWith('/admin');

      await router.replace(isAdminTarget && user.role !== 'admin' ? fallback : target);
    }
  } catch {
    // Handled in authStore
  }
}

/**
 * The demonstration sign-in list is loaded ONLY in development.
 *
 * It used to be a literal array here, which put 34 account passwords - the
 * administrator's among them - into the production bundle, alongside the name,
 * email and room number of every real resident. See
 * `lib/demoAccounts.dev.ts` for what was in `dist` and why.
 *
 * `import.meta.env.DEV` becomes `false` at build time, so this branch and the
 * module it reaches are eliminated. In a built app `demoAccounts` stays empty
 * and the panel below does not render at all.
 */
const demoAccounts = ref<DemoAccount[]>([]);

if (import.meta.env.DEV) {
  import('@/lib/demoAccounts.dev').then((m) => {
    demoAccounts.value = m.demoAccounts;
  });
}

async function handleQuickLogin(account: DemoAccount) {
  if (isSignUp.value) {
    isSignUp.value = false;
  }
  email.value = account.email;
  password.value = account.password;
  authError.value = null;
  await handleSubmit();
}
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
    <div class="w-full max-w-5xl space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Left: Sign In / Register Form -->
        <div class="lg:col-span-6 surface-card p-6 sm:p-8 space-y-6">
          <div class="text-center space-y-1">
            <h1 class="font-display text-2xl font-extrabold text-foreground">
              {{ isSignUp ? 'Create a Hivelet Account' : 'Sign in to Hivelet' }}
            </h1>
            <p class="text-xs text-muted-foreground">Fe Galang Da Silva Boarding House</p>
          </div>

          <!-- Denied Alert -->
          <div
            v-if="deniedReason && !isSignUp"
            class="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900"
          >
            <AlertCircle class="size-4 shrink-0 text-accent mt-0.5" />
            <span>{{ deniedReason }}</span>
          </div>

          <form class="space-y-4 text-xs" @submit.prevent="handleSubmit">
            <div v-if="isSignUp">
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Full Name
              </label>
              <input
                v-model="fullName"
                type="text"
                required
                placeholder="Juan Dela Cruz"
                class="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                {{ isSignUp ? 'Email address' : 'Email or phone number' }}
              </label>
              <!--
                Signing in accepts either identifier (OD-09: a tenant may have no email).
                type="email" is kept for sign-up, where an address really is required, but
                would make the browser reject a phone number before it was ever sent.
              -->
              <input
                v-model="email"
                :type="isSignUp ? 'email' : 'text'"
                autocomplete="username"
                required
                :placeholder="isSignUp ? 'you@email.com' : 'you@email.com or 0917-000-0000'"
                class="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div v-if="isSignUp">
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Phone Number (Optional)
              </label>
              <input
                v-model="phoneNumber"
                type="text"
                placeholder="0917-000-0000"
                class="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Password
              </label>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  placeholder="••••••••"
                  class="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 pr-11 text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  class="absolute right-1 top-1/2 -translate-y-1/2 size-9 grid place-items-center text-muted-foreground hover:text-foreground"
                  @click="showPassword = !showPassword"
                >
                  <component :is="showPassword ? EyeOff : Eye" class="size-4" />
                </button>
              </div>
              <p v-if="isSignUp" class="text-[11px] text-muted-foreground mt-1">
                Must be at least 10 characters and contain a letter and a number.
              </p>
            </div>

            <div v-if="isSignUp">
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Confirm Password
              </label>
              <input
                v-model="confirmPassword"
                type="password"
                required
                placeholder="••••••••"
                class="min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <!-- Error Banner -->
            <div
              v-if="authError"
              class="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"
            >
              <AlertCircle class="size-4 shrink-0 mt-0.5" />
              <span>{{ authError }}</span>
            </div>

            <button
              type="submit"
              :disabled="!canSubmit"
              class="btn-primary min-h-11 w-full gap-2 text-sm font-bold shadow-xs justify-center"
            >
              <Loader2 v-if="isAuthenticating" class="size-4 animate-spin" />
              <component :is="isSignUp ? UserPlus : LogIn" v-else class="size-4 text-white" />
              {{ isAuthenticating ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create Account' : 'Sign in') }}
            </button>
          </form>

          <div class="text-center text-xs pt-2">
            <button @click="toggleMode" class="text-accent-ink font-bold hover:underline">
              {{ isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one" }}
            </button>
          </div>

          <div class="border-t border-border pt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck class="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>Enforced server-side Role-Based Access Control (RBAC). Passwords hashed with bcrypt.</p>
          </div>
        </div>

        <!-- Right: 1-Click Demo Accounts. Development only - the list is empty in a
             built app, so the whole panel disappears rather than rendering hollow. -->
        <div v-if="demoAccounts.length > 0" class="lg:col-span-6 surface-card p-6 sm:p-8 space-y-4">
          <div class="border-b border-border pb-3">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-lg font-extrabold text-foreground">
                Quick Demo Access
              </h2>
              <span class="badge-soft badge-warning font-bold text-[10px]">
                1-Click Sign In
              </span>
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              Select any verified demonstration account below to authenticate immediately.
            </p>
          </div>

          <div class="overflow-x-auto border border-border rounded-2xl max-h-[380px] overflow-y-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-muted text-muted-foreground border-b border-border sticky top-0 z-10 shadow-[inset_0_-1px_0_#e7e5e4]">
                  <th class="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]">User / Role</th>
                  <th class="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]">Target</th>
                  <th class="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr
                  v-for="acc in demoAccounts"
                  :key="acc.email"
                  class="hover:bg-background transition-colors"
                >
                  <td class="py-3 px-3">
                    <div class="font-bold text-foreground">{{ acc.name }}</div>
                    <div class="text-[11px] text-muted-foreground font-mono">{{ acc.email }}</div>
                    <span :class="['badge-soft text-[9px] mt-1 inline-block', acc.badgeClass]">
                      {{ acc.roleLabel }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-muted-foreground font-medium text-xs">
                    {{ acc.room || 'Admin Workspace' }}
                  </td>
                  <td class="py-3 px-3 text-right">
                    <button
                      type="button"
                      :disabled="isAuthenticating"
                      @click="handleQuickLogin(acc)"
                      class="btn-primary min-h-8 px-3 py-1 text-xs gap-1 inline-flex items-center shadow-xs cursor-pointer"
                    >
                      <LogIn class="size-3 text-white" />
                      <span>Sign In</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <p class="font-bold">Account Access Protocol:</p>
            <p>All accounts match credentials seeded in the PostgreSQL database.</p>
          </div>
        </div>

      </div>

      <div class="text-center">
        <router-link to="/public" class="text-xs font-bold text-accent-ink hover:underline">
          ← Back to the public guest showcase
        </router-link>
      </div>
    </div>
  </div>
</template>
