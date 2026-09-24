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
import { ApiRequestError } from '@/lib/api';
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

/**
 * Only a path inside this application. `//evil.example` starts with a slash and
 * is still another origin, which `history.replaceState` refuses with a
 * SecurityError - so a crafted link would sign someone in, toast "Signed In",
 * and then leave them standing on this form.
 */
const redirectPath = computed(() => {
  const raw = route.query.redirect;
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
});

/**
 * WHY THE SIGN-IN NOTICE IS WORDED HERE AND NOT READ FROM THE ADDRESS BAR.
 *
 * The router guard puts its sentence in `?reason=`, and this rendered that
 * query string verbatim, in the notice style, above the form. So anybody could
 * send a resident a real link to this real page reading
 * `/login?reason=Your account is suspended. Ring 0917... to restore it.` and
 * the site would print it as its own words, on the screen that asks for a
 * password. Vue escapes it, so it is not a script injection - it is worse for
 * being plausible.
 *
 * The notice is now built from the page being returned to: the same sentence
 * the guard writes (`Please sign in to access ${label}.`), from the same
 * `meta.label`, and only when that page genuinely needs a sign-in. `reason`
 * is no longer read.
 */
const deniedReason = computed(() => {
  if (!redirectPath.value) return null;
  const target = router.resolve(redirectPath.value);
  if (!target.meta.roles?.length) return null;
  return `Please sign in to access ${target.meta.label ?? 'this section'}.`;
});

const canSubmit = computed(
  () => !isAuthenticating.value && email.value.trim().length > 3 && password.value.length > 0
);

/**
 * The failure, in words for a resident, by error code.
 *
 * `authStore` stores the server's message as it comes, which is right for
 * the lockout and the rate limit (both already name the wait) and wrong for
 * the rest: "Invalid email or password." to someone who typed a phone number,
 * "Cannot reach the Hivelet server. Check that the API is running." to a
 * tenant with no signal (api.ts's wording until 2026-09-24), and "Internal server error." on a bad day. Mapped
 * here from the code the thrown `ApiRequestError` carries; anything this does
 * not recognise falls through to `authError`, so nothing is ever blank.
 *
 * The wrong-credentials sentence is one sentence for an unknown account and a
 * wrong password alike, because the server deliberately answers them the same
 * (`ApiError.invalidCredentials`), and this must not undo that.
 */
const loginFailure = ref<string | null>(null);

function describeLoginFailure(err: unknown): string | null {
  if (!(err instanceof ApiRequestError)) return null;
  switch (err.code) {
    case 'INVALID_CREDENTIALS':
      return 'That email or phone number and password do not match an account. Check both and try again.';
    case 'ACCOUNT_LOCKED':
    case 'RATE_LIMITED':
      return err.message;
    case 'ACCOUNT_INACTIVE':
      return `This account is no longer active. If you still live here, ask Mrs. ${LANDLADY.name} to look at it.`;
    case 'VALIDATION_FAILED':
      return 'Enter the email address or phone number on your account, and your password.';
    case 'NETWORK_ERROR':
      return 'You were not signed in because this page could not reach the server. Check your connection and try again.';
  }
  if (err.status >= 500 || err.code === 'MALFORMED_RESPONSE') {
    return 'You were not signed in because of a problem on our side. Please try again in a moment.';
  }
  return null;
}

const shownError = computed(() => (authError.value ? loginFailure.value ?? authError.value : null));

onMounted(() => {
  authError.value = null;
});

async function handleSubmit() {
  if (!canSubmit.value) return;
  loginFailure.value = null;

  try {
    const user = await login(email.value.trim(), password.value);
    password.value = '';

    showToast('success', 'Signed In', `Welcome back, ${user.fullName}.`);

    const fallback = homeRouteForRole(user.role);
    const target = redirectPath.value ?? fallback;
    const isAdminTarget = target.startsWith('/admin');

    // A tenant following an /admin redirect is sent to their own home instead.
    await router.replace(isAdminTarget && user.role !== 'admin' ? fallback : target);
  } catch (err) {
    // `authStore` has already set `authError`; this only rewords it.
    loginFailure.value = describeLoginFailure(err);
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
  loginFailure.value = null;
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
    <!--
      One screen tall on desktop, not a page to scroll. `lg:h-dvh` pins the two
      columns to the viewport, and the form stays top-aligned under the
      masthead (centred was tried and read as floating). On a screen too short
      for the form, only this column scrolls (`lg:overflow-y-auto`), so the
      submit button is never cut off. Phones scroll the page as normal: two
      fields, the notes and the on-screen keyboard do not fit on one phone
      screen.
    -->
    <div class="grid min-h-dvh grid-cols-1 lg:h-dvh lg:grid-cols-2">

      <!-- Left: the form -->
      <div class="ws-page flex flex-col pb-8 sm:pb-10 lg:pb-8 lg:overflow-y-auto">

        <!--
          The landing page's masthead bar, repeated: `h-16 items-center`, the
          same `font-display` wordmark, on the same `ws-page` gutter. Moving
          from the landing page to here, "Hivelet" now stays exactly where it
          was. It used to start 32px down inside this column's padding, so the
          page visibly dropped on arrival. Contact goes onto one line for the
          same reason: two stacked lines do not fit a 64px bar. It may wrap on
          a 320px phone, which the bar's height still holds.
        -->
        <!-- 44px targets, text unmoved: see the same bar in InquireView.vue. -->
        <div class="flex min-h-16 flex-wrap items-center justify-between gap-x-6">
          <RouterLink
            to="/public"
            class="press inline-flex min-h-11 items-center font-display text-xl font-semibold tracking-tight text-ink hover:text-ink-soft transition-colors"
          >
            Hivelet
          </RouterLink>

          <p class="flex flex-wrap items-baseline justify-end gap-x-3">
            <span class="text-[0.7rem] tracking-[0.16em] uppercase text-ink-soft">Contact us</span>
            <a
              :href="`tel:${LANDLADY.phone}`"
              class="press inline-flex min-h-11 items-center text-sm font-medium text-ink underline underline-offset-4 decoration-1 decoration-line hover:decoration-ink transition-colors"
            >
              {{ LANDLADY.phone }}
            </a>
          </p>
        </div>

        <!--
          A breadcrumb above the title, where the way back used to be a link
          at the very bottom of the form. `min-h-11` keeps "Home" at the
          app's 44px tap-target size.
        -->
        <nav aria-label="Breadcrumb" class="mt-8 sm:mt-10 lg:mt-6">
          <ol class="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
            <li>
              <RouterLink
                to="/public"
                class="press inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
              >
                <ArrowLeft class="size-3.5" aria-hidden="true" />
                Home
              </RouterLink>
            </li>
            <li aria-hidden="true" class="text-ink-faint">/</li>
            <li aria-current="page" class="text-ink">Sign in</li>
          </ol>
        </nav>

        <h1 class="mt-1 font-medium text-ink tracking-[-0.025em] leading-[1.05] text-[clamp(1.75rem,3vw,2.75rem)] max-w-xl">
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

        <form class="mt-8 lg:mt-6 max-w-2xl" @submit.prevent="handleSubmit">
          <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
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
                <!--
                  A 44px button around the 36px circle that was the whole
                  target (measured 36x36 at 375). The circle is now an inner
                  span that carries the hover fill, so what a reader sees is
                  unchanged; `right-0.5` puts it back 6px from the field's
                  edge, where `right-1.5` had it. It fits the field's `pr-12`.
                -->
                <button
                  type="button"
                  class="group press-plate absolute right-0.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full cursor-pointer"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <span class="grid size-9 place-items-center rounded-full transition-colors group-hover:bg-canvas">
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
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="shownError"
            role="alert"
            class="ws-reveal mt-6 flex items-start gap-2.5 rounded-2xl bg-overdue-soft px-4 py-3 text-sm text-overdue"
          >
            <AlertCircle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ shownError }}
          </div>

          <p class="mt-6 max-w-xl text-xs leading-relaxed text-ink-soft">
            Accounts are created by the landlady. If you live here and cannot get in, ask
            Mrs. {{ LANDLADY.name }} and she will set yours up.
          </p>
          <!--
            Signing in is where a resident starts using the portal, so the rules
            for it and what it keeps about them are one tap away here (B-61).
            Same underline as the Home breadcrumb above, and the same 44px row.
          -->
          <p class="mt-1 flex flex-wrap gap-x-5 text-xs text-ink-soft">
            <RouterLink
              to="/terms"
              class="press inline-flex min-h-11 items-center underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
            >
              Terms of use
            </RouterLink>
            <RouterLink
              to="/privacy"
              class="press inline-flex min-h-11 items-center underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
            >
              Privacy policy
            </RouterLink>
          </p>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="pill-btn-brand mt-6 px-8 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Loader2 v-if="isAuthenticating" class="size-4 animate-spin" aria-hidden="true" />
            <LogIn v-else class="size-4" aria-hidden="true" />
            <span>{{ isAuthenticating ? 'Signing in…' : 'Sign in' }}</span>
          </button>
        </form>
      </div>

      <!-- Right: Real building exterior showcase with clear background image -->
      <aside class="relative hidden lg:flex flex-col justify-between text-white px-10 sm:px-14 pb-10 sm:pb-14 overflow-hidden bg-night">
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

        <!-- On the masthead's line, not 56px below it: the same 64px bar. -->
        <div class="relative z-10 flex h-16 items-center">
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
