<!--
  @file views/LoginView.vue
  @description Single sign-in surface for administrator and tenant accounts.
  @systemBibleRef Section 4 - User Roles, Section 20 - Security
  @requirements FR-001 Authentication, FR-002 Role-Based Access
  @rationale One form for both roles. The destination is decided by the role
             the SERVER returns, never by which button the visitor clicked —
             letting the client assert a role is exactly the hole this replaces.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogIn, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import { login, authError, isAuthenticating, homeRouteForRole } from '@/lib/authStore';
import { showToast } from '@/lib/systemState';

const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const showPassword = ref(false);

/** Set by the router guard when an unauthenticated user hit a private route. */
const redirectPath = computed(() => (route.query.redirect as string | undefined) ?? null);
const deniedReason = computed(() => (route.query.reason as string | undefined) ?? null);

const canSubmit = computed(
  () => email.value.trim().length > 3 && password.value.length > 0 && !isAuthenticating.value
);

onMounted(() => {
  authError.value = null;
});

async function handleSubmit() {
  if (!canSubmit.value) return;

  try {
    const user = await login(email.value.trim(), password.value);
    password.value = '';

    showToast('success', 'Signed In', `Welcome back, ${user.fullName}.`);

    // Honour the original destination only if the role can actually reach it;
    // otherwise fall back to that role's home.
    const fallback = homeRouteForRole(user.role);
    const target = redirectPath.value ?? fallback;
    const isAdminTarget = target.startsWith('/admin');

    await router.replace(isAdminTarget && user.role !== 'admin' ? fallback : target);
  } catch {
    // authError is rendered below; nothing further to do here.
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-12 bg-[#f4f5f7]">
    <div class="w-full max-w-md">
      <div class="bg-white border border-[#dfe1e6] rounded-lg shadow-sm p-8">
        <!-- Brand header -->
        <div class="flex flex-col items-center text-center mb-7">
          <span
            class="w-12 h-12 rounded-xl bg-[#0c66e4] text-white flex items-center justify-center font-mono font-extrabold text-xl shadow-lg mb-3"
          >
            H
          </span>
          <h1 class="font-display text-xl font-extrabold text-[#172b4d]">Sign in to Hivelet</h1>
          <p class="text-xs text-[#6b778c] mt-1">Fe Galang Da Silva Boarding House</p>
        </div>

        <!-- Guard redirect notice -->
        <div
          v-if="deniedReason"
          class="mb-5 flex gap-2.5 rounded-md border border-[#ffe380] bg-[#fffae6] px-3.5 py-3 text-xs text-[#172b4d]"
        >
          <AlertCircle class="w-4 h-4 shrink-0 text-[#974f0c] mt-px" />
          <span>{{ deniedReason }}</span>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
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
          </div>

          <!-- Server-reported failure. Deliberately does not distinguish an
               unknown email from a wrong password. -->
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
            <LogIn v-else class="h-4 w-4" />
            {{ isAuthenticating ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

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
