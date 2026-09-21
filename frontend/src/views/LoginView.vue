<script setup lang="ts">
/**
 * @file views/LoginView.vue
 * @description Authentication entrance screen for administrators and residents.
 * @rationale Built following the even split-screen layout, spacing, typography,
 *            and design identity established by InquireView.vue and user reference.
 */
import type { DemoAccount } from '@/lib/demoAccounts.dev';
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { LogIn, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-vue-next';
import { login, authError, isAuthenticating, homeRouteForRole } from '@/lib/authStore';
import { showToast, LANDLADY } from '@/lib/systemState';
import StatusPill from '@/components/overview/StatusPill.vue';

const router = useRouter();
const route = useRoute();

/**
 * There is no sign-up here, and that is deliberate.
 *
 * This screen used to offer "No account yet? Create one", which let anyone on
 * the internet make an account against a live boarding house. Nobody signs
 * themselves up to live somewhere: the landlady admits a resident, and the
 * application already has that path - TenantManagementView posts to
 * `POST /admin/tenants`, audited, with the unit and the move-in attached.
 *
 * A second way in that skipped all of that was not a feature. `registerUser`
 * stays in authStore because the endpoint is still there; nothing in the
 * interface reaches it.
 */
const email = ref('');
const password = ref('');
const showPassword = ref(false);

const redirectPath = computed(() => (route.query.redirect as string | undefined) ?? null);
const deniedReason = computed(() => (route.query.reason as string | undefined) ?? null);

const canSubmit = computed(
  () => !isAuthenticating.value && email.value.trim().length > 3 && password.value.length > 0
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

    const fallback = homeRouteForRole(user.role);
    const target = redirectPath.value ?? fallback;
    const isAdminTarget = target.startsWith('/admin');

    // A tenant following an /admin redirect is sent to their own home instead.
    await router.replace(isAdminTarget && user.role !== 'admin' ? fallback : target);
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
  <div class="ws-focus flex-1 w-full font-editorial bg-canvas">
    <div class="grid min-h-screen lg:grid-cols-2">

      <!-- Left: the form -->
      <div class="flex flex-col px-4 sm:px-6 lg:px-14 py-10 sm:py-14">

        <div class="flex items-start justify-between gap-6">
          <RouterLink
            to="/public"
            class="press text-xl font-semibold tracking-tight text-ink hover:text-ink-soft transition-colors"
          >
            Hivelet
          </RouterLink>

          <div class="text-right shrink-0">
            <p class="text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">Landlady</p>
            <p class="mt-1 text-sm font-medium text-ink">{{ LANDLADY.name }}</p>
            <a
              :href="`tel:${LANDLADY.phone}`"
              class="press mt-0.5 inline-block py-1 text-sm text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
            >
              {{ LANDLADY.phone }}
            </a>
          </div>
        </div>

        <h1 class="mt-12 sm:mt-16 font-medium text-ink tracking-[-0.025em] leading-[1.05] text-[clamp(1.75rem,3.6vw,2.75rem)] max-w-lg">
          Sign in to your account
        </h1>

        <div
          v-if="deniedReason"
          role="status"
          class="ws-reveal mt-6 flex items-start gap-2.5 rounded-2xl bg-verify-soft px-4 py-3 text-sm text-verify max-w-2xl"
        >
          <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {{ deniedReason }}
        </div>

        <form class="mt-10 sm:mt-12 max-w-2xl" @submit.prevent="handleSubmit">
          <div class="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <div>
              <label
                for="login-email"
                class="block text-xs text-ink-faint"
              >
                Email or phone number
              </label>
              <!--
                Either identifier is accepted (OD-09: a tenant may have no
                email), so this is type="text". type="email" would make the
                browser reject a phone number before it was ever sent.
              -->
              <input
                id="login-email"
                v-model="email"
                type="text"
                autocomplete="username"
                required
                placeholder="you@email.com or 0917-000-0000"
                class="ws-input mt-2"
              />
            </div>

            <div>
              <label
                for="login-password"
                class="block text-xs text-ink-faint"
              >
                Password
              </label>
              <div class="relative mt-2">
                <input
                  id="login-password"
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
                  <!-- A quick crossfade rather than a hard swap between the two
                       icon states, so toggling reads as a change of state
                       rather than a flicker. `mode="out-in"` keeps only one
                       icon in the flow at a time, since the button has no
                       spare width for two to sit side by side mid-transition.
                       Transitioning `scale`, not `transform` - Tailwind 4
                       compiles `scale-*` to the individual `scale` property
                       (see the `.press`/`.press-plate` note in index.css), so
                       a `transform` entry in this list would transition
                       nothing. -->
                  <Transition
                    mode="out-in"
                    enter-active-class="transition-[opacity,scale] duration-100 ease-[var(--ease-out)]"
                    leave-active-class="transition-[opacity,scale] duration-75 ease-[var(--ease-out)]"
                    enter-from-class="opacity-0 motion-safe:scale-90"
                    leave-to-class="opacity-0 motion-safe:scale-90"
                  >
                    <component
                      :is="showPassword ? EyeOff : Eye"
                      :key="showPassword ? 'eye-off' : 'eye-on'"
                      class="size-4 text-ink-soft"
                      aria-hidden="true"
                    />
                  </Transition>
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="authError"
            role="alert"
            class="ws-reveal mt-6 flex items-start gap-2.5 rounded-2xl bg-overdue-soft px-4 py-3 text-sm text-overdue"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ authError }}
          </div>

          <p class="mt-10 max-w-xl text-xs leading-relaxed text-ink-soft">
            Accounts are created by the landlady. If you live here and cannot get in, ask
            Mrs. {{ LANDLADY.name }} and she will set yours up.
          </p>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="pill-btn-brand mt-10 px-8 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isAuthenticating" class="size-4 animate-spin" aria-hidden="true" />
            <LogIn v-else class="size-4" aria-hidden="true" />
            <span>{{ isAuthenticating ? 'Signing in…' : 'Sign in' }}</span>
          </button>
        </form>

        <p class="mt-12 text-xs text-ink-soft">
          <RouterLink
            to="/public"
            class="press inline-flex items-center gap-1.5 py-1 underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
          >
            <ArrowLeft class="size-3.5" aria-hidden="true" />
            Back to home
          </RouterLink>
        </p>
      </div>

      <!-- Right: Real building exterior showcase with clear background image -->
      <aside class="relative hidden lg:flex flex-col justify-between text-white px-10 sm:px-14 py-10 sm:py-14 overflow-hidden bg-night">
        <img
          src="/fe-galang-building.webp"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 w-full h-full object-cover object-center"
          width="1790"
          height="879"
          loading="lazy"
        />
        <!-- Contrast gradient overlay: unblurred to keep building details clear and vibrant -->
        <div class="absolute inset-0 bg-gradient-to-t from-night/85 via-night/25 to-night/50" />

        <div class="relative z-10">
          <p class="text-[0.7rem] tracking-[0.18em] uppercase text-white/80 drop-shadow-sm">
            {{ LANDLADY.address }}
          </p>
        </div>

        <div class="relative z-10">
          <p class="font-medium tracking-[-0.03em] leading-[0.95] text-[clamp(2rem,4.4vw,3.75rem)] drop-shadow-sm">
            Fe Galang Da Silva<br />Boarding House
          </p>
        </div>
      </aside>

    </div>

    <!--
      Development only. `demoAccounts` is empty in a built application - the
      module it comes from sits behind `import.meta.env.DEV` - so this whole
      section is absent rather than rendering hollow.
    -->
    <section v-if="demoAccounts.length > 0" class="border-t border-line px-6 py-12 sm:px-10 lg:px-16">
      <div class="mx-auto w-full max-w-5xl">
        <h2 class="text-lg font-semibold tracking-tight">Demo accounts</h2>
        <p class="mt-1 text-sm text-ink-soft">
          One click signs you in. This panel only exists while the dev server is running.
        </p>

        <ul class="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <li
            v-for="(acc, i) in demoAccounts"
            :key="acc.email"
            class="list-reveal-item flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-line bg-tile p-3"
            :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
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

        <p class="mt-6 text-xs leading-5 text-ink-faint">
          These accounts are real rows in the live database. Their passwords are read from
          credentials/creds.txt on this machine and are never written into the repository.
        </p>
      </div>
    </section>
  </div>
</template>
