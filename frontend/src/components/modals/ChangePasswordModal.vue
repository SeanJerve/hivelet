<script setup lang="ts">
/**
 * Change your own password.
 *
 * WHY THIS EXISTS
 * ---------------
 * `POST /api/auth/change-password` has existed and worked for months, and
 * nothing in the interface called it. **There was no way for anyone - the
 * administrator or any of the 33 residents - to change a password from inside
 * the product.** Every tenant was onboarded on the same shared literal, and the
 * only route to a new one was someone editing the database by hand.
 *
 * Deliberately takes `open` as a prop and emits `close`, rather than reading a
 * flag out of `systemState`, which is the idiom elsewhere in this folder. The
 * interface is being redesigned, `systemState.ts` is the file most likely to be
 * reworked while that happens, and a self-contained dialog is the easiest thing
 * to restyle and the least likely to collide.
 *
 * The validation below mirrors `passwordSchema` in `backend/src/routes/auth.ts`
 * exactly - ten characters, a letter, a number. It is a courtesy, not a
 * safeguard: the server enforces it either way, and this only means the person
 * finds out while typing instead of after submitting.
 */
import { ref, computed, watch } from 'vue';
import { api, ApiRequestError, setStoredToken } from '@/lib/api';
import { showToast } from '@/lib/systemState';
import { clearMustChangePassword, PASSWORD_CHANGED_FLAG } from '@/lib/authStore';
import { Check, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import WsModal from '@/components/ui/WsModal.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    /**
     * B-53: a tenant issued a random starting password (migration 048)
     * cannot get past this until they replace it. No Cancel button, and
     * WsModal's own `:dismissible="false"` now genuinely blocks Escape and
     * its header X too, not just a backdrop click - see the note on that
     * prop for why that fix mattered here specifically.
     */
    mandatory?: boolean;
  }>(),
  { mandatory: false }
);
const emit = defineEmits<{ (e: 'close'): void }>();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const reveal = ref(false);
const isSubmitting = ref(false);
const formError = ref('');
const currentPasswordError = ref('');
const newPasswordError = ref('');

/** Mirrors backend `passwordSchema`. Kept in this order so the list reads the same way. */
const rules = computed(() => [
  { label: 'At least 10 characters', met: newPassword.value.length >= 10 },
  { label: 'Contains a letter', met: /[A-Za-z]/.test(newPassword.value) },
  { label: 'Contains a number', met: /[0-9]/.test(newPassword.value) },
]);

const allRulesMet = computed(() => rules.value.every((r) => r.met));
const matches = computed(() => confirmPassword.value.length > 0 && newPassword.value === confirmPassword.value);
const sameAsCurrent = computed(
  () => newPassword.value.length > 0 && newPassword.value === currentPassword.value
);

const canSubmit = computed(
  () =>
    !isSubmitting.value &&
    currentPassword.value.length > 0 &&
    allRulesMet.value &&
    matches.value &&
    !sameAsCurrent.value
);

function reset() {
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  reveal.value = false;
  formError.value = '';
  currentPasswordError.value = '';
  newPasswordError.value = '';
}

// Never leave a typed password sitting in memory behind a closed dialog.
watch(() => props.open, (isOpen) => { if (!isOpen) reset(); });

function close() {
  if (isSubmitting.value || props.mandatory) return;
  emit('close');
}

async function submit() {
  if (!canSubmit.value) return;
  isSubmitting.value = true;
  formError.value = '';
  currentPasswordError.value = '';
  newPasswordError.value = '';

  try {
    const result = await api.post<{ token?: string } | null>('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });

    /**
     * B-63 decision 3 (Sean, 2026-09-24): a password change ends the account's
     * other sessions. The server does that by refusing tokens issued before the
     * change, so it has to hand this device a fresh one, or the person who just
     * changed their password would be signed out too. Used when present; until
     * the backend half lands the response carries no token and the current one
     * stays valid, which is today's behaviour.
     */
    if (result && typeof result.token === 'string' && result.token) {
      setStoredToken(result.token);
    }

    /**
     * B-63 decision 2: the server will refuse everything but the password
     * change while `must_change_password` is set, so the screen behind this
     * dialog loaded nothing. One reload after the forced change fetches it all
     * again. It happens once per account, and a flag carries the confirmation
     * across it (read in App.vue).
     */
    if (props.mandatory) {
      clearMustChangePassword();
      try {
        sessionStorage.setItem(PASSWORD_CHANGED_FLAG, '1');
      } catch {
        // Storage blocked: the reload still happens, just without the toast.
      }
      window.location.reload();
      return;
    }

    showToast('success', 'Password changed', 'Your new password is active. Use it next time you sign in.');
    emit('close');
  } catch (err: unknown) {
    /**
     * A wrong CURRENT password comes back 401 INVALID_CREDENTIALS - the same
     * code the sign-in form gets for a wrong password. It does not mean the
     * session is over, and `ApiRequestError.isAuthFailure` excludes that code
     * for exactly this reason. Shown against the field it belongs to.
     */
    if (err instanceof ApiRequestError && err.code === 'INVALID_CREDENTIALS') {
      currentPasswordError.value = 'That is not your current password.';
    } else if (err instanceof ApiRequestError && err.status === 422) {
      /**
       * A 422 said "Invalid password payload." and nothing else, so the person
       * could not tell which field to fix (B-61). `passwordSchema` in
       * `backend/src/routes/auth.ts` sends its per-field messages in
       * `details`, already written in plain words; each is shown under its
       * own field.
       */
      currentPasswordError.value = err.details?.currentPassword?.[0] ?? '';
      newPasswordError.value = err.details?.newPassword?.[0] ?? '';
      if (!currentPasswordError.value && !newPasswordError.value) {
        formError.value = 'One of these passwords was not accepted. Check both and try again.';
      }
    } else if (err instanceof ApiRequestError && err.isAuthFailure) {
      formError.value = 'Your session has ended. Sign in again, then change your password.';
    } else if (err instanceof ApiRequestError && err.status >= 400 && err.status < 500) {
      // 429 and the like: the server's text is written for people and says
      // how long to wait.
      formError.value = err.message;
    } else {
      /**
       * A 5xx or no answer at all. The server's text here is internal (a
       * database message, or "Check that the API is running") and was shown
       * as it came (B-61). It cannot say whether the change landed, since the
       * audit write comes after it, so this does not claim either way.
       */
      formError.value =
        'Something went wrong on our side while changing it. Try again in a moment. If your ' +
        'current password stops working, sign in with the new one.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <WsModal
    v-if="open"
    :title="mandatory ? 'Set your password' : 'Change password'"
    :subtitle="
      mandatory
        ? 'Your account was created with a one-time password. Set your own before continuing.'
        : 'You will stay signed in on this device.'
    "
    size="sm"
    :dismissible="false"
    :mandatory="mandatory"
    @close="close"
  >
    <form id="change-password-form" class="flex flex-col gap-5" @submit.prevent="submit">
      <label class="ws-field">
        Current password
        <input
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          :class="['ws-input', currentPasswordError && 'border-overdue']"
          :aria-invalid="currentPasswordError ? 'true' : undefined"
          aria-describedby="cp-current-error"
          @input="currentPasswordError = ''"
        />
        <span v-if="currentPasswordError" id="cp-current-error" class="ws-reveal text-sm text-overdue">
          {{ currentPasswordError }}
        </span>
      </label>

      <div class="flex flex-col gap-2">
        <label class="ws-field">
          New password
          <span class="relative">
            <input
              v-model="newPassword"
              :type="reveal ? 'text' : 'password'"
              autocomplete="new-password"
              :class="['ws-input pr-12', newPasswordError && 'border-overdue']"
              :aria-invalid="newPasswordError ? 'true' : undefined"
              :aria-describedby="newPasswordError ? 'cp-new-error' : undefined"
              @input="newPasswordError = ''"
            />
            <!--
              44px target around the 36px circle (measured 36x36 at 375 in the
              mocked-API harness, 2026-09-24). Same fix and offsets as LoginView's
              toggle; it fits the field's `pr-12`.
            -->
            <button
              type="button"
              class="group press-plate absolute right-0.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full cursor-pointer"
              :aria-label="reveal ? 'Hide password' : 'Show password'"
              @click="reveal = !reveal"
            >
              <span class="grid size-9 place-items-center rounded-full transition-colors group-hover:bg-canvas">
                <EyeOff v-if="reveal" class="size-4 text-ink-soft" aria-hidden="true" />
                <Eye v-else class="size-4 text-ink-soft" aria-hidden="true" />
              </span>
            </button>
          </span>
          <span v-if="newPasswordError" id="cp-new-error" class="ws-reveal text-sm text-overdue">
            {{ newPasswordError }}
          </span>
        </label>

        <ul class="flex flex-col gap-1.5">
          <li
            v-for="rule in rules"
            :key="rule.label"
            :class="['flex items-center gap-2 text-sm', rule.met ? 'text-ink' : 'text-ink-soft']"
          >
            <!--
              Typed into on every keystroke, so this stays fast and small - a
              rule newly met is feedback confirming what was just typed, not a
              moment worth lingering on. Transition rather than a plain
              `v-if`/`v-else` swap so the check mark pops in instead of
              replacing the empty circle in the same frame.
            -->
            <!-- Both faces are absolutely positioned inside this fixed-size box
                 so the brief moment both are on screen during the crossfade
                 does not shove the label beside it sideways. -->
            <span class="relative inline-block size-4 shrink-0">
              <Transition
                enter-active-class="transition-[opacity,scale] duration-100 ease-[cubic-bezier(0.23,1,0.32,1)]"
                enter-from-class="opacity-0 scale-50"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition-[opacity,scale] duration-75 ease-[cubic-bezier(0.23,1,0.32,1)]"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-50"
              >
                <Check v-if="rule.met" class="absolute inset-0 size-4 text-brand" aria-hidden="true" />
                <span v-else aria-hidden="true" class="absolute inset-0 size-4 rounded-full border border-line" />
              </Transition>
            </span>
            {{ rule.label }}<span class="sr-only">{{ rule.met ? ', met' : ', not met yet' }}</span>
          </li>
        </ul>

        <p v-if="sameAsCurrent" class="ws-reveal text-sm text-overdue">
          The new password must be different from the current one.
        </p>
      </div>

      <label class="ws-field">
        Confirm new password
        <input
          v-model="confirmPassword"
          :type="reveal ? 'text' : 'password'"
          autocomplete="new-password"
          class="ws-input"
        />
        <span v-if="confirmPassword.length > 0 && !matches" class="ws-reveal text-sm text-overdue">
          The two passwords do not match.
        </span>
      </label>

      <p v-if="formError" role="alert" class="ws-reveal text-sm text-overdue">{{ formError }}</p>
    </form>

    <template #actions>
      <button v-if="!mandatory" type="button" class="pill-btn" :disabled="isSubmitting" @click="close">
        Cancel
      </button>
      <button
        type="submit"
        form="change-password-form"
        :class="['pill-btn-brand', mandatory && 'ml-auto']"
        :disabled="!canSubmit"
      >
        <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
        {{ isSubmitting ? 'Changing' : mandatory ? 'Set password' : 'Change password' }}
      </button>
    </template>
  </WsModal>
</template>
