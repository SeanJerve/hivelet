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
import { X, Lock, Check, Loader2, Eye, EyeOff } from 'lucide-vue-next';

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
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="close"
    >
      <div class="rounded-tile bg-tile w-full max-w-md shadow-2xl rounded-tile p-6 space-y-5 bg-tile my-6">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-canvas flex items-center justify-center shrink-0">
              <Lock class="size-5 text-brand" />
            </div>
            <div>
              <h2 class="font-semibold text-base text-ink">Change Password</h2>
              <p class="text-xs text-ink-soft mt-0.5">
                You will stay signed in on this device.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 hover:bg-canvas transition-colors cursor-pointer"
            aria-label="Close"
            @click="close"
          >
            <X class="size-4 text-ink-soft" />
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <!-- Current -->
          <div class="space-y-1.5">
            <label for="cp-current" class="text-xs font-semibold text-ink-soft">
              Current password
            </label>
            <input
              id="cp-current"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              class="ws-input w-full"
              :class="currentPasswordError ? 'border-danger' : ''"
              @input="currentPasswordError = ''"
            />
            <p v-if="currentPasswordError" class="text-xs font-semibold text-danger">
              {{ currentPasswordError }}
            </p>
          </div>

          <!-- New -->
          <div class="space-y-1.5">
            <label for="cp-new" class="text-xs font-semibold text-ink-soft">
              New password
            </label>
            <div class="relative">
              <input
                id="cp-new"
                v-model="newPassword"
                :type="reveal ? 'text' : 'password'"
                autocomplete="new-password"
                class="ws-input w-full pr-11"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 hover:bg-canvas transition-colors cursor-pointer"
                :aria-label="reveal ? 'Hide password' : 'Show password'"
                @click="reveal = !reveal"
              >
                <EyeOff v-if="reveal" class="size-4 text-ink-soft" />
                <Eye v-else class="size-4 text-ink-soft" />
              </button>
            </div>

            <ul class="space-y-1 pt-1">
              <li
                v-for="rule in rules"
                :key="rule.label"
                class="flex items-center gap-2 text-xs"
                :class="rule.met ? 'text-ink' : 'text-ink-soft'"
              >
                <Check v-if="rule.met" class="size-3.5 text-brand shrink-0" />
                <span v-else class="size-3.5 rounded-full border border-line shrink-0" />
                <span>{{ rule.label }}</span>
              </li>
            </ul>

            <p v-if="sameAsCurrent" class="text-xs font-semibold text-danger">
              The new password must be different from the current one.
            </p>
          </div>

          <!-- Confirm -->
          <div class="space-y-1.5">
            <label for="cp-confirm" class="text-xs font-semibold text-ink-soft">
              Confirm new password
            </label>
            <input
              id="cp-confirm"
              v-model="confirmPassword"
              :type="reveal ? 'text' : 'password'"
              autocomplete="new-password"
              class="ws-input w-full"
            />
            <p
              v-if="confirmPassword.length > 0 && !matches"
              class="text-xs font-semibold text-danger"
            >
              The two passwords do not match.
            </p>
          </div>

          <p v-if="formError" class="text-xs font-semibold text-danger">{{ formError }}</p>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              class="rounded-xl px-4 py-2.5 text-xs font-semibold text-ink hover:bg-canvas transition-colors cursor-pointer"
              :disabled="isSubmitting"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canSubmit"
            >
              <span v-if="isSubmitting" class="flex items-center gap-2">
                <Loader2 class="size-3.5 animate-spin" />
                Changing…
              </span>
              <span v-else>Change password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>
