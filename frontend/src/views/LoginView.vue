<script setup lang="ts">
import type { DemoAccount } from '@/lib/demoAccounts.dev';
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogIn, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import { login, authError, isAuthenticating, homeRouteForRole } from '@/lib/authStore';
import { showToast } from '@/lib/systemState';
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
  <!--
    A split, like the enquiry page: the task on one side, the property on the
    other. This was two equal white cards side by side on a pale green field -
    the sign-in form and a development-only account list given the same weight -
    with the rest of the page's height left over as empty space underneath.
    Signing in is a single-task screen and now reads as one.

    The demonstration list moves below the fold. It exists only on a
    development machine, so it should not shape what everybody else sees.
  -->
  <div class="ws-focus bg-canvas text-ink">
    <div class="grid min-h-[calc(100vh-8rem)] lg:grid-cols-2">

      <!-- The task. -->
      <div class="flex flex-col justify-center px-4 py-14 sm:px-6 lg:px-16">
        <div class="mx-auto w-full max-w-sm">
          <h1 class="text-3xl leading-tight font-medium tracking-tight">Sign in</h1>
          <p class="mt-1 text-sm text-ink-soft">Fe Galang Da Silva Boarding House</p>

          <p
            v-if="deniedReason"
            role="status"
            class="mt-6 flex items-start gap-2.5 rounded-2xl bg-verify-soft px-4 py-3 text-sm text-verify"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ deniedReason }}
          </p>

          <form class="mt-8 flex flex-col gap-4" @submit.prevent="handleSubmit">
            <label class="ws-field">
              Email or phone number
              <!--
                Either identifier is accepted (OD-09: a tenant may have no
                email), so this is type="text". type="email" would make the
                browser reject a phone number before it was ever sent.
              -->
              <input
                v-model="email"
                type="text"
                autocomplete="username"
                required
                placeholder="you@email.com or 0917-000-0000"
                class="ws-input"
              />
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
            </label>

            <p
              v-if="authError"
              role="alert"
              class="flex items-start gap-2.5 rounded-2xl bg-overdue-soft px-4 py-3 text-sm text-overdue"
            >
              <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {{ authError }}
            </p>

            <button type="submit" :disabled="!canSubmit" class="pill-btn-brand mt-2 w-full">
              <Loader2 v-if="isAuthenticating" class="size-4 animate-spin" aria-hidden="true" />
              <LogIn v-else class="size-4" aria-hidden="true" />
              {{ isAuthenticating ? 'Signing in' : 'Sign in' }}
            </button>
          </form>

          <!--
            What replaced "No account yet? Create one". Somebody who cannot get
            in still needs telling what to do, and the answer is a person rather
            than a form.
          -->
          <p class="mt-8 border-t border-line pt-6 text-sm leading-6 text-ink-soft">
            Accounts are made by the landlady. If you live here and cannot get in, ask
            Mrs. Fe Galang Da Silva and she will set yours up.
          </p>

          <p class="mt-4 flex items-start gap-2.5 text-xs leading-5 text-ink-faint">
            <ShieldCheck class="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            Roles are enforced on the server, and passwords are stored hashed.
          </p>

          <router-link
            to="/public"
            class="press mt-8 inline-block py-1 text-sm font-semibold text-brand hover:underline"
          >
            Back to the public pages
          </router-link>
        </div>
      </div>

      <!--
        The property, on the half of the screen the form does not need. The
        same treatment as the enquiry page: photograph, a scrim dark enough to
        read over, and the name. Lazy, because below `lg` this panel is
        display:none and a phone must not fetch 284 KB it will never show.
      -->
      <aside class="relative hidden overflow-hidden bg-night lg:flex lg:flex-col lg:justify-between">
        <img
          src="/fe-galang-building.webp"
          alt=""
          aria-hidden="true"
          class="absolute inset-0 size-full object-cover object-center"
          width="1790"
          height="879"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-night/75" />

        <p class="relative px-12 pt-12 text-[0.7rem] tracking-[0.18em] uppercase text-on-night-soft">
          32 Sapaguita Street, Brgy. 4 Sagpon Old Albay, Legazpi City
        </p>

        <div class="relative px-12 pb-12">
          <p class="font-display text-on-night">
            <span class="text-3xl font-medium leading-tight tracking-tight">Fe Galang Da Silva</span>
            <span class="ml-2 whitespace-nowrap text-[0.8rem] font-light">&#32;Boarding House</span>
          </p>
          <p class="mt-3 max-w-sm text-sm leading-6 text-on-night-soft">
            33 units across four levels, in 5 property clusters.
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
            v-for="acc in demoAccounts"
            :key="acc.email"
            class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-line bg-tile p-3"
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
