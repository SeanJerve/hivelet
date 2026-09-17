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
import { api, ApiRequestError } from '@/lib/api';
import { showToast } from '@/lib/systemState';
import { Check, Loader2, Eye, EyeOff } from 'lucide-vue-next';
import WsModal from '@/components/ui/WsModal.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const reveal = ref(false);
const isSubmitting = ref(false);
const formError = ref('');
const currentPasswordError = ref('');

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
}

// Never leave a typed password sitting in memory behind a closed dialog.
watch(() => props.open, (isOpen) => { if (!isOpen) reset(); });

function close() {
  if (isSubmitting.value) return;
  emit('close');
}

async function submit() {
  if (!canSubmit.value) return;
  isSubmitting.value = true;
  formError.value = '';
  currentPasswordError.value = '';

  try {
    await api.post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });

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
    } else if (err instanceof ApiRequestError) {
      formError.value = err.message;
    } else {
      formError.value = 'The password could not be changed. Try again.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <WsModal
    v-if="open"
    title="Change password"
    subtitle="You will stay signed in on this device."
    size="sm"
    :dismissible="false"
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
        <span v-if="currentPasswordError" id="cp-current-error" class="text-sm text-overdue">
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
              class="ws-input pr-12"
            />
            <button
              type="button"
              class="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-canvas cursor-pointer"
              :aria-label="reveal ? 'Hide password' : 'Show password'"
              @click="reveal = !reveal"
            >
              <EyeOff v-if="reveal" class="size-4 text-ink-soft" aria-hidden="true" />
              <Eye v-else class="size-4 text-ink-soft" aria-hidden="true" />
            </button>
          </span>
        </label>

        <ul class="flex flex-col gap-1.5">
          <li
            v-for="rule in rules"
            :key="rule.label"
            :class="['flex items-center gap-2 text-sm', rule.met ? 'text-ink' : 'text-ink-soft']"
          >
            <Check v-if="rule.met" class="size-4 shrink-0 text-brand" aria-hidden="true" />
            <span v-else aria-hidden="true" class="size-4 shrink-0 rounded-full border border-line" />
            {{ rule.label }}<span class="sr-only">{{ rule.met ? ', met' : ', not met yet' }}</span>
          </li>
        </ul>

        <p v-if="sameAsCurrent" class="text-sm text-overdue">
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
        <span v-if="confirmPassword.length > 0 && !matches" class="text-sm text-overdue">
          The two passwords do not match.
        </span>
      </label>

      <p v-if="formError" role="alert" class="text-sm text-overdue">{{ formError }}</p>
    </form>

    <template #actions>
      <button type="button" class="pill-btn" :disabled="isSubmitting" @click="close">Cancel</button>
      <button type="submit" form="change-password-form" class="pill-btn-brand" :disabled="!canSubmit">
        <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
        {{ isSubmitting ? 'Changing' : 'Change password' }}
      </button>
    </template>
  </WsModal>
</template>
