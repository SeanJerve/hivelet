<!--
  What a tenant can change about themselves: email, phone number, password
  and emergency contact. The name and the account status belong to the
  tenancy record and are shown, not edited (System Bible Section 19, FR-010).

  Email and phone joined on 2026-09-30 (Sean): the tenant owns their sign-in
  and contact details, the landlady owns their name. The admin tenant dialog
  shows email and phone read-only for the same reason. A placeholder email
  (migration 067) is never shown as an address: the field starts empty and
  says it is not set yet. Rules in lib/contactDetails.ts.

  Occupation and Facebook page were editable here too; the owner asked for
  them removed as unnecessary (2026-09-26). The columns and the backend's
  acceptance of them are untouched, so nothing already on file was cleared.

  There is no photo here, and the comment in the template says why.
-->
<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { Save, CheckCircle2, AlertTriangle, X, RotateCcw, KeyRound } from 'lucide-vue-next';
import { currentUser, restoreSession } from '@/lib/authStore';
import { api, ApiRequestError } from '@/lib/api';
import { showingSavedCopy, writesUnavailable } from '@/lib/offlineCache';
import {
  EMAIL_NOT_SET,
  emailProblem,
  phoneDigits,
  phoneProblem,
  realEmail,
} from '@/lib/contactDetails';
import { formatPhone } from '@/lib/phoneFormat';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal.vue';
import { showToast } from '@/lib/systemState';
import { RouterLink } from 'vue-router';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';

/** Tenant-editable profile fields */
interface EditableProfile {
  full_name: string;
  email: string;
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

/** Administrator-owned identity fields — displayed for confirmation. */
const identity = ref({
  role: '',
  account_status: '',
});

const form = ref<EditableProfile>({
  full_name: currentUser.value?.fullName || '',
  email: '',
  phone_number: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
});

/** Snapshot of the last saved server state, used for dirty tracking and reset. */
const savedSnapshot = ref<EditableProfile>({ ...form.value });

const loading = ref(false);
const saving = ref(false);
/**
 * Set when the profile could not be read.
 *
 * Saving is refused while it is true. `handleSave` sends the emergency
 * contact unconditionally (email and phone only when changed), so a Save on
 * top of a failed read writes empty strings over whatever was really on file.
 */
const loadFailed = ref(false);
const successNotice = ref('');
const errorNotice = ref('');
/** Said under the field it is about, from the page's own check or the server's. */
const emailError = ref('');
const phoneError = ref('');
const isPasswordOpen = ref(false);

const phoneChanged = computed(
  () => phoneDigits(form.value.phone_number) !== phoneDigits(savedSnapshot.value.phone_number)
);

/** First and last name, as the header's avatar does: "Ana Marie Bonto" is AB there, not AM. */
const initials = computed(() => {
  const name = form.value.full_name || currentUser.value?.fullName || 'Tenant';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const picked = parts.length >= 2 ? [parts[0], parts[parts.length - 1]] : parts;
  return picked.map((p) => p[0]?.toUpperCase() || '').join('') || 'T';
});

const isDirty = computed(
  () => JSON.stringify(form.value) !== JSON.stringify(savedSnapshot.value)
);

onMounted(fetchProfile);
// Opened offline, the form shows the copy saved on this phone (lib/offlineCache.ts). The moment
// the connection is back and the app has reloaded its lists, read the live one, unless she has
// started typing (Sean, 2026-10-02).
watch(showingSavedCopy, (now, was) => {
  if (was && !now && !isDirty.value && !saving.value) fetchProfile();
});

async function fetchProfile() {
  loading.value = true;
  loadFailed.value = false;
  errorNotice.value = '';
  try {
    /**
     * Not `.catch(() => null)`.
     *
     * That swallowed the failure before the catch below could report it, so a
     * refused or broken read produced `data = null` and no error notice at all.
     * The form then filled from the session: the resident's **name**, correctly,
     * and blanks for phone, emergency contact, emergency contact number,
     * occupation and Facebook.
     *
     * Which reads exactly like "you have not filled these in yet". And
     * `handleSave` sends all five of those columns unconditionally - so typing
     * one field and pressing Save wrote empty strings over the other four,
     * including the emergency contact. A transient network failure on load could
     * erase the number someone would be rung on in an emergency, and the
     * resident would be shown "saved successfully".
     *
     * The failure now reaches the catch, which sets the notice and blocks Save.
     */
    const data = await api.get<any>('/tenant/my-profile');
    
    identity.value = {
      role: currentUser.value?.role || data?.role || 'tenant',
      account_status: data?.account_status || 'active',
    };

    // A blank field stays blank.
    //
    // These defaults used to be invented values - 'Maria Da Silva' as the
    // emergency contact, '0918-987-6543' as her number, a facebook.com URL - and
    // the form saves whatever it holds. A resident who opened this page and
    // pressed Save wrote all six fabrications into their own record as fact,
    // including an emergency contact who does not exist. Guidance belongs in the
    // input placeholder, which is never submitted.
    form.value = {
      full_name: data?.full_name || currentUser.value?.fullName || '',
      // No invented address, and no placeholder shown as one (migration 067):
      // empty means "not set yet", and the template says so. This once fell back
      // to 'tenant@hivelet.com', shown to the tenant as though it were theirs.
      email: realEmail(data?.email),
      // Spaced as the field shows them (lib/phoneFormat.ts), so the field's own
      // formatting is not mistaken for a change she made.
      phone_number: formatPhone(data?.phone_number || ''),
      emergency_contact_name: data?.emergency_contact_name || '',
      emergency_contact_phone: formatPhone(data?.emergency_contact_phone || ''),
    };
    savedSnapshot.value = { ...form.value };
  } catch (err: any) {
    // The template swaps the whole page for an error with a retry. A notice
    // above the form was not enough: the form still rendered blank beneath it,
    // with "Everything here is saved", a "Not active" pill and "No email on
    // file", each a claim made out of a request that failed (B-61, reproduced
    // in the mocked-API harness).
    console.error('Failed to load profile:', err?.message || err);
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  // Save disables on `saving`, but Enter inside any text field submits the
  // form directly - a second Enter before Vue's next render still reaches
  // here with the button not yet visibly disabled, and would resend the
  // whole profile while the first save is still in flight.
  // Enter in a field submits even while Save is disabled for having no connection.
  if (saving.value || writesUnavailable.value) return;
  successNotice.value = '';

  // The form is not a picture of what is stored, so it must not be written back.
  if (loadFailed.value) {
    errorNotice.value =
      'Your profile could not be loaded, so these fields are empty rather than yours. ' +
      'Saving them would erase what is on file. Reload and try again.';
    return;
  }

  errorNotice.value = '';
  emailError.value = '';
  phoneError.value = '';

  // Only what changed is checked and sent. An email that was never set can stay
  // unset here (the sign-in step asks for it); one on file cannot be cleared.
  const emailChanged = form.value.email.trim() !== savedSnapshot.value.email.trim();
  const sendPhone = phoneChanged.value;
  if (emailChanged) emailError.value = emailProblem(form.value.email);
  if (sendPhone) phoneError.value = phoneProblem(form.value.phone_number);
  if (emailError.value || phoneError.value) {
    await focusFirstInvalid();
    return;
  }

  saving.value = true;
  try {
    /**
     * Only the five fields the API actually accepts.
     *
     * `full_name` and `avatar_url` were being sent too, and both were silently discarded:
     * `profileUpdateSchema` on the server lists exactly five tenant-editable columns, by
     * design (System Bible Section 19 - a resident does not rename themselves), and
     * `profiles` has no `avatar_url` column at all. Zod strips what it does not declare, so
     * the request succeeded, the success notice appeared, and nothing had been saved.
     *
     * Worse for the name: the line below used to copy it into `currentUser.fullName`, so the
     * header changed too and the edit looked real until the next reload put it back.
     */
    const payload: Record<string, string> = {
      emergency_contact_name: form.value.emergency_contact_name.trim(),
      emergency_contact_phone: form.value.emergency_contact_phone.trim(),
    };
    if (emailChanged) payload.email = form.value.email.trim();
    if (sendPhone) payload.phone_number = form.value.phone_number.trim();

    // Surfaced rather than swallowed: a profile edit that silently fails leaves
    // the tenant believing their emergency contact is on file when it is not.
    await api.put('/tenant/my-profile', payload);

    // The name is not tenant-editable, so there is nothing to copy back here. Writing it
    // into the session made an edit the server refused look like it had been accepted.

    savedSnapshot.value = { ...form.value };
    successNotice.value = sendPhone
      ? `Your details are saved. You sign in with ${form.value.phone_number.trim()} from now on.`
      : 'Your details are saved.';
    showToast('success', 'Details saved', successNotice.value);
    // The header and the sign-in step read the session, so it hears about a new email too.
    if (emailChanged) void restoreSession();
  } catch (err: any) {
    // Someone else already has it (409), or the server's own check refused it
    // (422): said under the field, the way the page's own check says it.
    if (err instanceof ApiRequestError && (err.status === 409 || err.status === 422) && err.details) {
      emailError.value = err.details.email?.[0] ?? '';
      phoneError.value = err.details.phone_number?.[0] ?? '';
      if (emailError.value || phoneError.value) {
        errorNotice.value = 'Nothing was saved. Check the field marked below.';
        await focusFirstInvalid();
        return;
      }
    }
    // A TIMEOUT may have saved (`lib/api.ts`, the deadline). Saving the same
    // details again is harmless here, but "Not saved" would still be a claim.
    if (err?.code === 'TIMEOUT') {
      errorNotice.value = err.message;
      showToast('error', 'Could not confirm', err.message);
      return;
    }
    errorNotice.value = `Save failed: ${err?.message || err}`;
    showToast('error', 'Not saved', err?.message || 'Your details could not be saved.');
  } finally {
    saving.value = false;
  }
}

/**
 * Focus, and so scroll to, the field whose note just appeared (audit 2026-10-01).
 * Save is at the foot of the form and the email field near its head: on a
 * 320x640 phone the note "Enter a full email address" rendered 48px above the
 * screen while focus stayed on Save, so pressing Save appeared to do nothing.
 * The same move `/inquire` makes with `focusFirstInvalid`.
 */
async function focusFirstInvalid() {
  await nextTick();
  document.getElementById(emailError.value ? 'email' : 'phone')?.focus();
}

function handleReset() {
  form.value = { ...savedSnapshot.value };
  successNotice.value = '';
  errorNotice.value = '';
  emailError.value = '';
  phoneError.value = '';
}
</script>

<template>
  <div class="ws-focus space-y-5">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">My account</p>
      <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
        My details
      </h1>
      <!-- Only the privacy link: "Keep these right so the landlady can reach you"
           went (Sean, 2026-10-01, fewer words). -->
      <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
        <RouterLink
          to="/privacy"
          class="press hover:text-ink transition-colors font-semibold"
        >
          How your details are kept and used
        </RouterLink>
      </p>
    </div>

    <SkeletonCard v-if="loading" variant="list" :count="2" />

    <!-- No form at all on a failed read: see the catch in `fetchProfile`. -->
    <div v-else-if="loadFailed" class="ws-reveal rounded-tile bg-tile p-5 sm:p-6">
      <UnavailableNote
        message="Your details could not be loaded, so they are not shown here. What is on file has not changed. The form comes back once they load, so a save cannot put blanks over them."
        @retry="fetchProfile"
      />
    </div>

    <div v-else class="ws-reveal space-y-4 sm:space-y-6">
      <!-- What just happened, when something did -->
      <div
        v-if="successNotice"
        class="ws-reveal flex items-center justify-between gap-3 rounded-tile bg-brand-soft p-4 sm:p-5"
        role="status"
      >
        <p class="flex items-center gap-2.5 text-sm font-semibold leading-6 text-brand">
          <CheckCircle2 class="size-5 shrink-0" aria-hidden="true" />
          {{ successNotice }}
        </p>
        <!-- No `size-9`: it overrode `.icon-btn`'s own 2.75rem down to 36px. -->
        <button
          type="button"
          class="icon-btn shrink-0"
          aria-label="Dismiss this message"
          @click="successNotice = ''"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="errorNotice"
        class="ws-reveal flex items-start gap-2.5 rounded-tile bg-overdue-soft p-4 sm:p-5"
        role="alert"
      >
        <AlertTriangle class="mt-0.5 size-5 shrink-0 text-overdue" aria-hidden="true" />
        <p class="text-sm font-semibold leading-6 text-overdue">{{ errorNotice }}</p>
      </div>

      <!-- Who you are here -->
      <div class="flex flex-col items-center gap-5 rounded-tile bg-tile p-5 text-center sm:flex-row sm:p-6 sm:text-left">
        <span
          class="grid size-20 shrink-0 place-items-center rounded-full bg-night text-2xl font-semibold text-on-night"
          aria-hidden="true"
        >
          {{ initials }}
        </span>
        <!--
          The photo upload is gone, deliberately.

          `profiles` has no `avatar_url` column and the tenant profile API accepts five
          fields, none of them a photo. The control read the file, showed it, sent it, and
          the server dropped it - so the resident picked a photo, watched it appear, saved,
          and lost it on the next reload with a success message in between.

          Storing one properly is a schema decision, not a transcription: a new column and
          somewhere for the file to live. `room_photos` is the pattern the project already
          has for images, and a data URL in a varchar is not it. Raised for Mrs. Da Silva
          rather than invented here. Until then the initials stand, and nothing on screen
          promises otherwise.
        -->

        <div class="min-w-0 flex-1">
          <div class="flex flex-col items-center gap-2 sm:flex-row">
            <h2 class="min-w-0 text-xl font-semibold tracking-tight text-ink break-words">{{ form.full_name }}</h2>
            <!-- Only the exception gets a pill: anyone signed in here lives here. -->
            <StatusPill v-if="identity.account_status !== 'active'" tone="neutral">Not active</StatusPill>
          </div>

          <p class="mt-2 text-sm leading-6 text-ink-soft break-words">
            <!-- What is saved, not what is being typed: the new number signs in only once saved. -->
            <template v-if="savedSnapshot.phone_number">
              You sign in with <span class="whitespace-nowrap">{{ savedSnapshot.phone_number }}</span>.
            </template>
            <template v-else-if="savedSnapshot.email">
              No phone number on file, so you sign in with {{ savedSnapshot.email }}.
            </template>
            <template v-else>No phone number on file.</template>
          </p>
        </div>
      </div>

      <!-- What you can change -->
      <form @submit.prevent="handleSave" class="overflow-hidden rounded-tile bg-tile">
        <div class="space-y-6 p-5 sm:p-6">
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div class="ws-field">
              <label for="full-name">Your name</label>
              <!--
                Read-only. The API accepts five tenant-editable fields and the name is not
                among them - System Bible Section 19 - so typing here changed nothing but
                looked as though it had. The reason was in a `title` attribute, which a
                touch screen and a keyboard both never show.
              -->
              <input
                id="full-name"
                :value="form.full_name"
                type="text"
                readonly
                class="ws-input"
                required
              />
              <p class="ws-hint">
                The landlady keeps your name on your tenancy record. Ask her if it needs changing.
              </p>
            </div>

            <div class="ws-field">
              <label for="email">Your email</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                inputmode="email"
                placeholder="you@email.com"
                :class="['ws-input', emailError && 'border-overdue']"
                :aria-invalid="emailError ? 'true' : undefined"
                :aria-describedby="emailError ? 'email-error' : 'email-hint'"
                @input="emailError = ''"
                @blur="form.email.trim() && form.email.trim() !== savedSnapshot.email.trim() && (emailError = emailProblem(form.email))"
              />
              <p v-if="emailError" id="email-error" class="ws-reveal text-sm text-overdue">{{ emailError }}</p>
              <p v-else id="email-hint" class="ws-hint">
                {{ savedSnapshot.email ? 'Only you can change it.' : `${EMAIL_NOT_SET}. Add one you check.` }}
              </p>
            </div>

            <div class="ws-field">
              <label for="phone">Your mobile number</label>
              <input
                id="phone"
                v-model="form.phone_number"
                v-phone
                type="tel"
                autocomplete="tel"
                inputmode="tel"
                placeholder="0917 123 4567"
                :class="['ws-input tabular', phoneError && 'border-overdue']"
                :aria-invalid="phoneError ? 'true' : undefined"
                :aria-describedby="phoneError ? 'phone-error' : 'phone-hint'"
                @input="phoneError = ''"
                @blur="form.phone_number.trim() && phoneChanged && (phoneError = phoneProblem(form.phone_number))"
              />
              <p v-if="phoneError" id="phone-error" class="ws-reveal text-sm text-overdue">{{ phoneError }}</p>
              <p v-else-if="phoneChanged && form.phone_number.trim()" id="phone-hint" class="ws-reveal text-sm font-medium text-verify">
                Once saved, you sign in with this new number, not {{ savedSnapshot.phone_number }}.
              </p>
              <p v-else id="phone-hint" class="ws-hint">You sign in with this number.</p>
            </div>

            <div class="ws-field">
              <span id="password-label">Your password</span>
              <button
                type="button"
                class="pill-btn self-start"
                aria-describedby="password-label"
                @click="isPasswordOpen = true"
              >
                <KeyRound class="size-4" aria-hidden="true" />
                <span>Change password</span>
              </button>
            </div>

          </div>

          <div class="border-t border-line pt-6">
            <h2 class="text-base font-semibold text-ink">If something happens to you</h2>
            <p class="ws-hint mt-1">Who the landlady should ring.</p>

            <div class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div class="ws-field">
                <label for="ec-name">Their name</label>
                <input
                  id="ec-name"
                  v-model="form.emergency_contact_name"
                  type="text"
                  placeholder="A parent or guardian"
                  class="ws-input"
                  required
                />
              </div>

              <div class="ws-field">
                <label for="ec-phone">Their phone number</label>
                <input
                  id="ec-phone"
                  v-model="form.emergency_contact_phone"
                  v-phone
                  type="tel"
                  placeholder="0917 123 4567"
                  class="ws-input"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line p-5 sm:p-6">
          <p class="text-sm text-ink-soft">
            {{ writesUnavailable ? 'Saving needs a connection.' : isDirty ? 'You have changes that are not saved yet.' : 'Everything here is saved.' }}
          </p>
          <div class="flex items-center gap-2">
            <button type="button" :disabled="!isDirty || saving || loadFailed" class="pill-btn" @click="handleReset">
              <RotateCcw class="size-3.5" aria-hidden="true" />
              <span>Undo changes</span>
            </button>
            <button type="submit" :disabled="!isDirty || saving || loadFailed || writesUnavailable" class="pill-btn-brand">
              <Save class="size-4" aria-hidden="true" />
              <span>{{ saving ? 'Saving…' : 'Save' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>

    <ChangePasswordModal :open="isPasswordOpen" @close="isPasswordOpen = false" />
  </div>
</template>
