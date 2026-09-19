<script setup lang="ts">
import type { DemoAccount } from '@/lib/demoAccounts.dev';
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogIn, UserPlus, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import { login, registerUser, authError, isAuthenticating, homeRouteForRole } from '@/lib/authStore';
import { showToast } from '@/lib/systemState';
import StatusPill from '@/components/overview/StatusPill.vue';

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
  // A wrong guess counts toward locking a real resident out, so never submit one.
  if (!account.password) {
    password.value = '';
    authError.value = 'Demo passwords not found. Add credentials/creds.txt to this machine and restart the dev server.';
    return;
  }
  password.value = account.password;
  authError.value = null;
  await handleSubmit();
}
</script>

<template>
  <div class="ws-focus min-h-[calc(100vh-8rem)] bg-canvas px-4 py-10 text-ink sm:px-6">
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div class="grid gap-6 lg:grid-cols-12 lg:items-start">
        <!-- Sign in, or create an account -->
        <section class="min-w-0 rounded-tile bg-tile p-6 sm:p-8 lg:col-span-6 flex flex-col gap-6">
          <div>
            <h1 class="text-3xl leading-tight font-medium tracking-tight">
              {{ isSignUp ? 'Create an account' : 'Sign in' }}
            </h1>
            <p class="mt-1 text-sm text-ink-soft">Fe Galang Da Silva Boarding House</p>
          </div>

          <p
            v-if="deniedReason && !isSignUp"
            role="status"
            class="flex items-start gap-2.5 rounded-2xl bg-verify-soft px-4 py-3 text-sm text-verify"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ deniedReason }}
          </p>

          <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
            <label v-if="isSignUp" class="ws-field">
              Full name
              <input v-model="fullName" type="text" required placeholder="Juan Dela Cruz" class="ws-input" />
            </label>

            <label class="ws-field">
              {{ isSignUp ? 'Email address' : 'Email or phone number' }}
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
                class="ws-input"
              />
            </label>

            <label v-if="isSignUp" class="ws-field">
              Phone number, optional
              <input v-model="phoneNumber" type="text" placeholder="0917-000-0000" class="ws-input" />
            </label>

            <label class="ws-field">
              Password
              <span class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  class="ws-input pr-12"
                />
                <button
                  type="button"
                  class="press-plate absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-canvas cursor-pointer"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <component :is="showPassword ? EyeOff : Eye" class="size-4 text-ink-soft" aria-hidden="true" />
                </button>
              </span>
              <span v-if="isSignUp" class="text-xs text-ink-faint">
                At least 10 characters, with a letter and a number.
              </span>
            </label>

            <label v-if="isSignUp" class="ws-field">
              Confirm password
              <input v-model="confirmPassword" type="password" required class="ws-input" />
            </label>

            <p
              v-if="authError"
              role="alert"
              class="flex items-start gap-2.5 rounded-2xl bg-overdue-soft px-4 py-3 text-sm text-overdue"
            >
              <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {{ authError }}
            </p>

            <button type="submit" :disabled="!canSubmit" class="pill-btn-brand w-full">
              <Loader2 v-if="isAuthenticating" class="size-4 animate-spin" aria-hidden="true" />
              <component :is="isSignUp ? UserPlus : LogIn" v-else class="size-4" aria-hidden="true" />
              {{ isAuthenticating ? (isSignUp ? 'Creating account' : 'Signing in') : (isSignUp ? 'Create account' : 'Sign in') }}
            </button>
          </form>

          <button type="button" class="press self-start py-1 text-sm font-semibold text-brand hover:underline" @click="toggleMode">
            {{ isSignUp ? 'Already have an account? Sign in' : 'No account yet? Create one' }}
          </button>

          <p class="mt-auto flex items-start gap-2.5 border-t border-line pt-4 text-xs text-ink-faint">
            <ShieldCheck class="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            Roles are enforced on the server, and passwords are stored hashed.
          </p>
        </section>

        <!-- Demo accounts. Development only: the list is empty in a built app, so
             the whole panel disappears rather than rendering hollow. -->
        <section v-if="demoAccounts.length > 0" class="min-w-0 rounded-tile bg-tile p-6 sm:p-8 lg:col-span-6 flex flex-col gap-4">
          <div>
            <h2 class="text-lg font-semibold tracking-tight">Demo accounts</h2>
            <p class="mt-1 text-sm text-ink-soft">
              One click signs you in. This panel only exists while the dev server is running.
            </p>
          </div>

          <ul class="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
            <li
              v-for="acc in demoAccounts"
              :key="acc.email"
              class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-line p-3"
            >
              <span class="min-w-0 flex-1 basis-40">
                <span class="block truncate text-sm font-medium">{{ acc.name }}</span>
                <span class="block truncate text-xs text-ink-faint">
                  {{ acc.room || 'Admin workspace' }}
                </span>
              </span>
              <span class="flex shrink-0 items-center gap-2">
                <StatusPill :tone="acc.roleType === 'admin' ? 'verify' : acc.roleType === 'inactive' ? 'unentered' : 'neutral'">
                  {{ acc.roleLabel }}
                </StatusPill>
                <button
                  type="button"
                  :disabled="isAuthenticating"
                  class="pill-btn"
                  :aria-label="`Sign in as ${acc.name}`"
                  @click="handleQuickLogin(acc)"
                >
                  Sign in
                </button>
              </span>
            </li>
          </ul>

          <p class="text-xs leading-5 text-ink-faint">
            These accounts are real rows in the live database. Their passwords are read from
            credentials/creds.txt on this machine and are never written into the repository.
          </p>
        </section>
      </div>

      <router-link to="/public" class="press self-center py-1 text-sm font-semibold text-brand hover:underline">
        Back to the public pages
      </router-link>
    </div>
  </div>
</template>
