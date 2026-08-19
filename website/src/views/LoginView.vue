<!--
  @file views/LoginView.vue
  @description Unified sign-in and account registration surface for Hivelet accounts.
  @systemBibleRef Section 4 - User Roles & Section 20 - Security
  @requirements FR-001 Authentication, FR-002 Role-Based Access
-->
<script setup lang="ts">
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

/** Set by the router guard when an unauthenticated user hit a private route. */
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
      // Validate password pattern (at least 10 chars, a letter and a number)
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
    // Error is set in authError by the authStore
  }
}

interface DemoAccount {
  roleLabel: string;
  roleType: 'admin' | 'tenant' | 'inactive';
  name: string;
  email: string;
  password: string;
  room?: string;
  badgeColor: string;
}

const demoAccounts: DemoAccount[] = [
  {
    roleLabel: 'Landlady Admin',
    roleType: 'admin',
    name: 'Mrs. Fe Galang Da Silva',
    email: 'admin@hivelet.ph',
    password: 'Hivelet@Admin2026',
    badgeColor: 'bg-[#0c66e4] text-white',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Mark Cruz',
    email: 'mark.cruz@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Unit 1a (BH Main)',
    badgeColor: 'bg-[#00875a] text-white',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'Sean Jerve',
    email: 'sean.jerve@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Unit 1b (BH Main)',
    badgeColor: 'bg-[#00875a] text-white',
  },
  {
    roleLabel: 'Tenant',
    roleType: 'tenant',
    name: 'John Lloyd',
    email: 'john.lloyd@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Unit 2a (BH Main)',
    badgeColor: 'bg-[#00875a] text-white',
  },
  {
    roleLabel: 'Tenant (Linda)',
    roleType: 'tenant',
    name: 'Jaye Casia',
    email: 'jaye.casia@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Unit 3a (BH Main)',
    badgeColor: 'bg-[#00875a] text-white',
  },
  {
    roleLabel: 'Inactive Tenant',
    roleType: 'inactive',
    name: 'Miguel Ramos',
    email: 'miguel.ramos@gmail.com',
    password: 'Hivelet@Tenant2026',
    room: 'Vacated (BR-025)',
    badgeColor: 'bg-[#de350b] text-white',
  },
];

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
  <div class="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-[#f4f5f7]">
    <div class="w-full max-w-6xl">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        <!-- Left Column: Login / Register Form Card -->
        <div class="lg:col-span-6 bg-white border border-[#dfe1e6] rounded-xl shadow-sm p-6 sm:p-8">
          <!-- Brand header -->
          <div class="flex flex-col items-center text-center mb-6">
            <span
              class="w-12 h-12 rounded-xl bg-[#0c66e4] text-white flex items-center justify-center font-mono font-extrabold text-xl shadow-md mb-3"
            >
              H
            </span>
            <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">
              {{ isSignUp ? 'Create a Hivelet Account' : 'Sign in to Hivelet' }}
            </h1>
            <p class="text-xs text-[#6b778c] mt-1">Fe Galang Da Silva Boarding House Management</p>
          </div>

          <!-- Guard redirect notice -->
          <div
            v-if="deniedReason && !isSignUp"
            class="mb-5 flex gap-2.5 rounded-lg border border-[#ffe380] bg-[#fffae6] px-3.5 py-3 text-xs text-[#172b4d]"
          >
            <AlertCircle class="w-4 h-4 shrink-0 text-[#974f0c] mt-px" />
            <span>{{ deniedReason }}</span>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <!-- Sign up fields -->
            <div v-if="isSignUp">
              <label for="reg-name" class="block text-xs font-bold text-[#172b4d] mb-1.5">
                Full Name
              </label>
              <input
                id="reg-name"
                v-model="fullName"
                type="text"
                required
                placeholder="e.g. John Doe"
                class="w-full rounded-lg border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label for="login-email" class="block text-xs font-bold text-[#172b4d] mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="username"
                required
                placeholder="you@example.com"
                class="w-full rounded-lg border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
              />
            </div>

            <div v-if="isSignUp">
              <label for="reg-phone" class="block text-xs font-bold text-[#172b4d] mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                id="reg-phone"
                v-model="phoneNumber"
                type="text"
                placeholder="e.g. 0917-123-4567"
                class="w-full rounded-lg border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label for="login-password" class="block text-xs font-bold text-[#172b4d] mb-1.5">
                Password
              </label>
              <div class="relative">
                <input
                  id="login-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  placeholder="••••••••"
                  class="w-full rounded-lg border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 pr-11 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#6b778c] transition-colors hover:bg-[#f4f5f7]"
                  @click="showPassword = !showPassword"
                >
                  <component :is="showPassword ? EyeOff : Eye" class="h-4 w-4" />
                </button>
              </div>
              <p v-if="isSignUp" class="text-[10px] text-[#6b778c] mt-1.5">
                Must be at least 10 characters and contain a letter and a number.
              </p>
            </div>

            <div v-if="isSignUp">
              <label for="reg-confirm" class="block text-xs font-bold text-[#172b4d] mb-1.5">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                v-model="confirmPassword"
                type="password"
                required
                placeholder="••••••••"
                class="w-full rounded-lg border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
              />
              <p v-if="password && confirmPassword && password !== confirmPassword" class="text-[10px] text-red-600 mt-1">
                Passwords do not match.
              </p>
            </div>

            <!-- Error Alert -->
            <div
              v-if="authError"
              role="alert"
              class="flex gap-2.5 rounded-lg border border-[#ffbdad] bg-[#ffebe6] px-3.5 py-3 text-xs font-medium text-[#ae2a19]"
            >
              <AlertCircle class="w-4 h-4 shrink-0 mt-px" />
              <span>{{ authError }}</span>
            </div>

            <button
              type="submit"
              :disabled="!canSubmit"
              class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0c66e4] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              <Loader2 v-if="isAuthenticating" class="h-4 w-4 animate-spin" />
              <component :is="isSignUp ? UserPlus : LogIn" v-else class="h-4 w-4" />
              {{ isAuthenticating ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create Account' : 'Sign in') }}
            </button>
          </form>

          <!-- Toggle Mode Link -->
          <div class="mt-5 text-center text-xs">
            <button @click="toggleMode" class="text-[#0c66e4] font-semibold hover:underline bg-transparent border-0 cursor-pointer">
              {{ isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one" }}
            </button>
          </div>

          <div class="mt-6 border-t border-[#dfe1e6] pt-4">
            <p class="flex items-start gap-2 text-[11px] leading-relaxed text-[#6b778c]">
              <ShieldCheck class="mt-px h-3.5 w-3.5 shrink-0 text-[#22a06b]" />
              <span>
                Your role and permissions are enforced by the server on every request.
                Tenant records are private to each tenant.
              </span>
            </p>
          </div>
        </div>

        <!-- Right Column: Demo Accounts & Fast Login Table Card -->
        <div class="lg:col-span-6 bg-white border border-[#dfe1e6] rounded-xl shadow-sm p-6 sm:p-8 space-y-4">
          <div class="border-b border-[#dfe1e6] pb-3">
            <div class="flex items-center justify-between">
              <h2 class="font-display text-base sm:text-lg font-bold text-[#172b4d]">
                Quick Demo Access
              </h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-50 text-[#0c66e4] border border-blue-200">
                1-Click Sign In
              </span>
            </div>
            <p class="text-xs text-[#6b778c] mt-1">
              Select any verified demonstration account below to automatically authenticate without manual credential entry.
            </p>
          </div>

          <!-- Accounts Table -->
          <div class="overflow-x-auto border border-[#dfe1e6] rounded-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[#f4f5f7] text-[#5e6c84] border-b border-[#dfe1e6]">
                  <th class="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]">User / Role</th>
                  <th class="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px]">Room / Target</th>
                  <th class="py-2.5 px-3 font-bold uppercase tracking-wider text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#dfe1e6]">
                <tr
                  v-for="acc in demoAccounts"
                  :key="acc.email"
                  class="hover:bg-[#f8f9fa] transition-colors"
                >
                  <td class="py-3 px-3">
                    <div class="font-bold text-[#172b4d]">{{ acc.name }}</div>
                    <div class="text-[11px] text-[#6b778c] font-mono-num">{{ acc.email }}</div>
                    <span class="inline-block mt-1 px-1.5 py-0.2 text-[9px] font-bold rounded" :class="acc.badgeColor">
                      {{ acc.roleLabel }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-[#5e6c84] font-medium text-[11px]">
                    {{ acc.room || 'Executive Workspace' }}
                  </td>
                  <td class="py-3 px-3 text-right">
                    <button
                      type="button"
                      :disabled="isAuthenticating"
                      @click="handleQuickLogin(acc)"
                      class="inline-flex items-center gap-1 bg-[#0c66e4] hover:bg-[#0052cc] text-white px-2.5 py-1.5 rounded text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <LogIn class="w-3 h-3" />
                      <span>Sign In</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-[11px] text-[#42526e] space-y-1">
            <div class="font-bold text-[#0c66e4]">Capstone Defense Note:</div>
            <p>
              All listed credentials follow academic audit protocols in <code>credentials/creds.txt</code> and <code>database/migrations/003_seed_rbac_credentials.sql</code>.
            </p>
          </div>
        </div>

      </div>

      <div class="mt-6 text-center">
        <router-link to="/" class="text-xs font-semibold text-[#0c66e4] hover:underline">
          ← Back to the public property page
        </router-link>
      </div>
    </div>
  </div>
</template>
