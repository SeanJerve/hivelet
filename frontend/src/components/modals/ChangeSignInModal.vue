<script setup lang="ts">
/**
 * Change number / password: the administrator's (B-111, Sean 19 Oct 2026).
 *
 * She signs in with her phone number, so her number is changed the way a password is. She gives
 * her CURRENT number and CURRENT password first; then a new number, a new password, or both.
 * `POST /api/auth/change-sign-in` checks both (one refusal that does not say which was wrong),
 * the number as a Philippine mobile no other account signs in with, and the password by the same
 * rules and breach check as Change password. Tenants keep ChangePasswordModal.vue.
 *
 * The same shape as ChangePasswordModal on purpose (prop `open`, emits `close`, WsModal, one
 * form), so a change to how dialogs look applies to both the same way.
 *
 * Her number is also the one every page gives for calling her (`GET /public/contact`), so a
 * changed number is pushed to those pages at once with `setLandladyPhone`.
 */
import { ref, computed, watch } from 'vue';
import { api, ApiRequestError, setStoredToken } from '@/lib/api';
import { showToast, setLandladyPhone } from '@/lib/systemState';
import { setOwnPhone } from '@/lib/authStore';
import { phoneDigits, phoneProblem } from '@/lib/contactDetails';
import { showPhone } from '@/lib/phoneFormat';
import { Check, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import WsModal from '@/components/ui/WsModal.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const currentPhone = ref('');
const currentPassword = ref('');
const newPhone = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const reveal = ref(false);
const isSubmitting = ref(false);
const formError = ref('');
/** Set when the server refused the current number or password; it does not say which. */
const currentRefused = ref(false);
const currentPhoneError = ref('');
const currentPasswordError = ref('');
const newPhoneError = ref('');
const newPasswordError = ref('');

/** Mirrors backend `passwordSchema`, as ChangePasswordModal does. */
const rules = computed(() => [
  { label: 'At least 10 characters', met: newPassword.value.length >= 10 },
  { label: 'Contains a letter', met: /[A-Za-z]/.test(newPassword.value) },
  { label: 'Contains a number', met: /[0-9]/.test(newPassword.value) },
]);
const allRulesMet = computed(() => rules.value.every((r) => r.met));
const matches = computed(() => confirmPassword.value.length > 0 && newPassword.value === confirmPassword.value);
const sameAsCurrent = computed(() => newPassword.value.length > 0 && newPassword.value === currentPassword.value);

const wantsPhone = computed(() => newPhone.value.trim() !== '');
const wantsPassword = computed(() => newPassword.value.length > 0 || confirmPassword.value.length > 0);
const sameNumber = computed(
  () => wantsPhone.value && phoneDigits(newPhone.value) === phoneDigits(currentPhone.value)
);

/**
 * The button waits for both current fields and at least one new thing. A new password must meet
 * its rules first (the checklist says why); a bad number is named under its field on press.
 */
const canSubmit = computed(
  () =>
    !isSubmitting.value &&
    currentPhone.value.trim() !== '' &&
    currentPassword.value.length > 0 &&
    (wantsPhone.value || wantsPassword.value) &&
    (!wantsPassword.value || (allRulesMet.value && matches.value && !sameAsCurrent.value))
);

function reset() {
  currentPhone.value = '';
  currentPassword.value = '';
  newPhone.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  reveal.value = false;
  formError.value = '';
  currentRefused.value = false;
  currentPhoneError.value = '';
  currentPasswordError.value = '';
  newPhoneError.value = '';
  newPasswordError.value = '';
}

// Never leave a typed password sitting in memory behind a closed dialog.
watch(() => props.open, (isOpen) => { if (!isOpen) reset(); });

function close() {
  if (isSubmitting.value) return;
  emit('close');
}

function clearCurrentRefusal() {
  currentRefused.value = false;
  if (formError.value === REFUSED) formError.value = '';
}

const REFUSED = 'Your current number or password is not right. Check both and try again.';

async function submit() {
  if (!canSubmit.value) return;
  formError.value = '';
  currentRefused.value = false;
  currentPhoneError.value = '';
  currentPasswordError.value = '';
  newPhoneError.value = '';
  newPasswordError.value = '';

  if (wantsPhone.value) {
    newPhoneError.value = sameNumber.value
      ? 'That is your number now. Type the new one, or leave this empty.'
      : phoneProblem(newPhone.value);
    if (newPhoneError.value) return;
  }

  isSubmitting.value = true;
  try {
    const result = await api.post<{
      token?: string;
      phoneChanged?: boolean;
      passwordChanged?: boolean;
    } | null>('/auth/change-sign-in', {
      currentPhone: currentPhone.value.trim(),
      currentPassword: currentPassword.value,
      ...(wantsPhone.value ? { newPhone: newPhone.value.trim() } : {}),
      ...(wantsPassword.value ? { newPassword: newPassword.value } : {}),
    });

    // A new password ends every other session; this device carries on with the fresh token.
    if (result && typeof result.token === 'string' && result.token) setStoredToken(result.token);

    const phoneChanged = result?.phoneChanged ?? wantsPhone.value;
    const passwordChanged = result?.passwordChanged ?? wantsPassword.value;
    if (phoneChanged) {
      setOwnPhone(newPhone.value.trim());
      setLandladyPhone(newPhone.value.trim());
    }
    const shown = showPhone(newPhone.value.trim());
    showToast(
      'success',
      phoneChanged && passwordChanged ? 'Number and password changed' : phoneChanged ? 'Number changed' : 'Password changed',
      phoneChanged && passwordChanged
        ? `Sign in with ${shown} and your new password from now on.`
        : phoneChanged
          ? `Sign in with ${shown} from now on. Every page now gives this number for calling you.`
          : 'Your new password is active. Use it next time you sign in.'
    );
    emit('close');
  } catch (err: unknown) {
    if (err instanceof ApiRequestError && err.code === 'INVALID_CREDENTIALS') {
      // One message for both, on purpose: the server does not say which one was wrong either.
      currentRefused.value = true;
      formError.value = REFUSED;
    } else if (err instanceof ApiRequestError && err.status === 409) {
      newPhoneError.value = err.details?.phone_number?.[0] ?? err.message;
    } else if (err instanceof ApiRequestError && err.status === 422) {
      currentPhoneError.value = err.details?.currentPhone?.[0] ?? '';
      currentPasswordError.value = err.details?.currentPassword?.[0] ?? '';
      newPhoneError.value = err.details?.newPhone?.[0] ?? '';
      newPasswordError.value = err.details?.newPassword?.[0] ?? '';
      if (!currentPhoneError.value && !currentPasswordError.value && !newPhoneError.value && !newPasswordError.value) {
        formError.value = 'Something here was not accepted. Check each field and try again.';
      }
    } else if (err instanceof ApiRequestError && err.isAuthFailure) {
      formError.value = 'Your session has ended. Sign in again, then make the change.';
    } else if (err instanceof ApiRequestError && err.code === 'NETWORK_ERROR') {
      formError.value =
        'We could not connect, so nothing was changed. Check your connection and press the button again.';
    } else if (err instanceof ApiRequestError && err.status >= 400 && err.status < 500) {
      // 429 and the like: the server's text is written for people and says how long to wait.
      formError.value = err.message;
    } else {
      formError.value =
        'Something went wrong on our side while changing it. Try again in a moment. If your ' +
        'current number or password stops working, sign in with the new one.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <WsModal
    v-if="open"
    title="Change number / password"
    subtitle="First your current number and password. Then a new number, a new password, or both. You will stay signed in on this device."
    size="sm"
    :dismissible="false"
    @close="close"
  >
    <form id="change-sign-in-form" class="flex flex-col gap-5" novalidate @submit.prevent="submit">
      <label class="ws-field">
        Current number
        <input
          v-model="currentPhone"
          v-phone
          type="tel"
          autocomplete="username"
          inputmode="tel"
          :class="['ws-input tabular', (currentRefused || currentPhoneError) && 'border-overdue']"
          :aria-invalid="currentRefused || currentPhoneError ? 'true' : undefined"
          :aria-describedby="currentPhoneError ? 'cs-current-phone-error' : currentRefused ? 'cs-form-error' : undefined"
          @input="currentPhoneError = ''; clearCurrentRefusal()"
        />
        <span v-if="currentPhoneError" id="cs-current-phone-error" class="ws-reveal text-sm text-overdue">
          {{ currentPhoneError }}
        </span>
      </label>

      <label class="ws-field">
        Current password
        <input
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          :class="['ws-input', (currentRefused || currentPasswordError) && 'border-overdue']"
          :aria-invalid="currentRefused || currentPasswordError ? 'true' : undefined"
          :aria-describedby="currentPasswordError ? 'cs-current-error' : currentRefused ? 'cs-form-error' : undefined"
          @input="currentPasswordError = ''; clearCurrentRefusal()"
        />
        <span v-if="currentPasswordError" id="cs-current-error" class="ws-reveal text-sm text-overdue">
          {{ currentPasswordError }}
        </span>
      </label>

      <label class="ws-field">
        New number
        <input
          v-model="newPhone"
          v-phone
          type="tel"
          autocomplete="off"
          inputmode="tel"
          placeholder="0917 123 4567"
          :class="['ws-input tabular', newPhoneError && 'border-overdue']"
          :aria-invalid="newPhoneError ? 'true' : undefined"
          :aria-describedby="newPhoneError ? 'cs-new-phone-error' : 'cs-new-phone-hint'"
          @input="newPhoneError = ''"
          @blur="wantsPhone && !sameNumber && (newPhoneError = phoneProblem(newPhone))"
        />
        <span v-if="newPhoneError" id="cs-new-phone-error" class="ws-reveal text-sm text-overdue">{{ newPhoneError }}</span>
        <span v-else id="cs-new-phone-hint" class="ws-hint">
          Leave empty to keep your number. A new one is what you sign in with, and what every page gives for calling you.
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
              :aria-describedby="newPasswordError ? 'cs-new-error' : 'cs-new-hint'"
              @input="newPasswordError = ''"
            />
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
          <span v-if="newPasswordError" id="cs-new-error" class="ws-reveal text-sm text-overdue">{{ newPasswordError }}</span>
          <span v-else-if="!wantsPassword" id="cs-new-hint" class="ws-hint">Leave empty to keep your password.</span>
        </label>

        <ul v-if="wantsPassword" class="flex flex-col gap-1.5">
          <li
            v-for="rule in rules"
            :key="rule.label"
            :class="['flex items-center gap-2 text-sm', rule.met ? 'text-ink' : 'text-ink-soft']"
          >
            <span class="relative inline-block size-4 shrink-0">
              <Check v-if="rule.met" class="absolute inset-0 size-4 text-brand" aria-hidden="true" />
              <span v-else aria-hidden="true" class="absolute inset-0 size-4 rounded-full border border-line" />
            </span>
            {{ rule.label }}<span class="sr-only">{{ rule.met ? ', met' : ', not met yet' }}</span>
          </li>
        </ul>

        <p v-if="sameAsCurrent" class="ws-reveal text-sm text-overdue">
          The new password must be different from the current one.
        </p>
      </div>

      <label v-if="wantsPassword" class="ws-field">
        Confirm new password
        <input
          v-model="confirmPassword"
          :type="reveal ? 'text' : 'password'"
          autocomplete="new-password"
          class="ws-input"
          :aria-invalid="confirmPassword.length > 0 && !matches ? 'true' : undefined"
          :aria-describedby="confirmPassword.length > 0 && !matches ? 'cs-confirm-error' : undefined"
        />
        <span v-if="confirmPassword.length > 0 && !matches" id="cs-confirm-error" class="ws-reveal text-sm text-overdue">
          The two passwords do not match.
        </span>
      </label>

      <p v-if="formError" id="cs-form-error" role="alert" class="ws-reveal text-sm text-overdue">{{ formError }}</p>
    </form>

    <template #actions>
      <button type="button" class="pill-btn" :disabled="isSubmitting" @click="close">Cancel</button>
      <button type="submit" form="change-sign-in-form" class="pill-btn-brand" :disabled="!canSubmit">
        <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
        {{ isSubmitting ? 'Changing' : 'Save changes' }}
      </button>
    </template>
  </WsModal>
</template>
