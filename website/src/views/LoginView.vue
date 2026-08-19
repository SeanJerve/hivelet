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
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-[#f4f5f7]">
    <div class="w-full max-w-md">
      <div class="bg-white border border-[#dfe1e6] rounded-lg shadow-sm p-8">
        <!-- Brand header -->
        <div class="flex flex-col items-center text-center mb-6">
          <span
            class="w-12 h-12 rounded-xl bg-[#0c66e4] text-white flex items-center justify-center font-mono font-extrabold text-xl shadow-lg mb-3"
          >
            H
          </span>
          <h1 class="font-display text-xl font-extrabold text-[#172b4d]">
            {{ isSignUp ? 'Create a Hivelet Account' : 'Sign in to Hivelet' }}
          </h1>
          <p class="text-xs text-[#6b778c] mt-1">Fe Galang Da Silva Boarding House</p>
        </div>

        <!-- Guard redirect notice -->
        <div
          v-if="deniedReason && !isSignUp"
          class="mb-5 flex gap-2.5 rounded-md border border-[#ffe380] bg-[#fffae6] px-3.5 py-3 text-xs text-[#172b4d]"
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
              class="w-full rounded border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
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
              class="w-full rounded border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
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
              class="w-full rounded border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
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
                class="w-full rounded border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 pr-11 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                class="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-[#6b778c] transition-colors hover:bg-[#f4f5f7]"
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
              class="w-full rounded border border-[#dfe1e6] bg-[#fafbfc] px-3 py-2.5 text-sm text-[#172b4d] transition-colors focus:border-[#0c66e4] focus:bg-white focus:outline-none"
            />
            <p v-if="password && confirmPassword && password !== confirmPassword" class="text-[10px] text-red-600 mt-1">
              Passwords do not match.
            </p>
          </div>

          <!-- Error Alert -->
          <div
            v-if="authError"
            role="alert"
            class="flex gap-2.5 rounded-md border border-[#ffbdad] bg-[#ffebe6] px-3.5 py-3 text-xs font-medium text-[#ae2a19]"
          >
            <AlertCircle class="w-4 h-4 shrink-0 mt-px" />
            <span>{{ authError }}</span>
          </div>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-[#0c66e4] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-50"
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
              Your role and permissions are determined by the server on every request.
              Tenant records are private to each tenant.
            </span>
          </p>
        </div>
      </div>

      <div class="mt-5 text-center">
        <router-link to="/" class="text-xs font-semibold text-[#0c66e4] hover:underline">
          ← Back to the public property page
        </router-link>
      </div>
    </div>
  </div>
</template>
