<!--
  What a resident can change about themselves: phone number and emergency
  contact. The name and the account status belong to the tenancy record and
  are shown, not edited (System Bible Section 19, FR-010).

  Occupation and Facebook page were editable here too; the owner asked for
  them removed as unnecessary (2026-09-26). The columns and the backend's
  acceptance of them are untouched, so nothing already on file was cleared.

  There is no photo here, and the comment in the template says why.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Save, CheckCircle2, AlertTriangle, X, RotateCcw } from 'lucide-vue-next';
import { currentUser } from '@/lib/authStore';
import { api } from '@/lib/api';
import { showToast } from '@/lib/systemState';
import { RouterLink } from 'vue-router';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';

/** Tenant-editable profile fields */
interface EditableProfile {
  full_name: string;
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

/** Administrator-owned identity fields — displayed for confirmation. */
const identity = ref({
  email: '',
  role: '',
  account_status: '',
});

const form = ref<EditableProfile>({
  full_name: currentUser.value?.fullName || '',
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
 * Saving is refused while it is true. `handleSave` sends all five editable
 * columns unconditionally, so a Save on top of a failed read writes empty
 * strings over whatever was really on file.
 */
const loadFailed = ref(false);
const successNotice = ref('');
const errorNotice = ref('');

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
      // No invented address. This used to fall back to 'tenant@hivelet.com', which
      // was shown to the resident beside a mail icon as though it were theirs. It
      // now actually fires: OD-09 allows a tenant with no email, and since phone
      // sign-in landed such a tenant can reach this page. Empty means "none on
      // file", and the template says so rather than filling the gap.
      email: currentUser.value?.email || data?.email || '',
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
      phone_number: data?.phone_number || '',
      emergency_contact_name: data?.emergency_contact_name || '',
      emergency_contact_phone: data?.emergency_contact_phone || '',
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
  if (saving.value) return;
  successNotice.value = '';

  // The form is not a picture of what is stored, so it must not be written back.
  if (loadFailed.value) {
    errorNotice.value =
      'Your profile could not be loaded, so these fields are empty rather than yours. ' +
      'Saving them would erase what is on file. Reload and try again.';
    return;
  }

  errorNotice.value = '';

  if (!form.value.full_name.trim()) {
    errorNotice.value = 'Please enter your name.';
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
    const payload = {
      phone_number: form.value.phone_number.trim(),
      emergency_contact_name: form.value.emergency_contact_name.trim(),
      emergency_contact_phone: form.value.emergency_contact_phone.trim(),
    };

    // Surfaced rather than swallowed: a profile edit that silently fails leaves
    // the tenant believing their emergency contact is on file when it is not.
    await api.put('/tenant/my-profile', payload);

    // The name is not tenant-editable, so there is nothing to copy back here. Writing it
    // into the session made an edit the server refused look like it had been accepted.

    savedSnapshot.value = { ...form.value };
    successNotice.value = 'Your details are saved.';
    showToast('success', 'Details saved', 'Your details are saved.');
  } catch (err: any) {
    errorNotice.value = `Save failed: ${err?.message || err}`;
    showToast('error', 'Not saved', err?.message || 'Your details could not be saved.');
  } finally {
    saving.value = false;
  }
}

function handleReset() {
  form.value = { ...savedSnapshot.value };
  successNotice.value = '';
  errorNotice.value = '';
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
      <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
        Keep these right so the landlady can reach you.
        <RouterLink
          to="/privacy"
          class="press underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink transition-colors"
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
            <!--
              This pill read "Active Tenant" on every account, whatever the record said,
              beside a line printing the real status two rows below it.
            -->
            <StatusPill :tone="identity.account_status === 'active' ? 'paid' : 'neutral'">
              {{ identity.account_status === 'active' ? 'Living here' : 'Not active' }}
            </StatusPill>
          </div>

          <p class="mt-2 text-sm leading-6 text-ink-soft break-words">
            <template v-if="form.phone_number">
              You sign in with <span class="whitespace-nowrap">{{ form.phone_number }}</span>.
            </template>
            <template v-else-if="identity.email">
              No phone number on file, so you sign in with {{ identity.email }}.
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
                This is on your tenancy record. Ask the landlady if it needs changing.
              </p>
            </div>

            <div class="ws-field">
              <label for="phone">Your phone number</label>
              <input
                id="phone"
                v-model="form.phone_number"
                type="tel"
                placeholder="0917-123-4567"
                class="ws-input"
                required
              />
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
                  type="tel"
                  placeholder="0918-987-6543"
                  class="ws-input"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line p-5 sm:p-6">
          <p class="text-sm text-ink-soft">
            {{ isDirty ? 'You have changes that are not saved yet.' : 'Everything here is saved.' }}
          </p>
          <div class="flex items-center gap-2">
            <button type="button" :disabled="!isDirty || saving || loadFailed" class="pill-btn" @click="handleReset">
              <RotateCcw class="size-3.5" aria-hidden="true" />
              <span>Undo changes</span>
            </button>
            <button type="submit" :disabled="!isDirty || saving || loadFailed" class="pill-btn-brand">
              <Save class="size-4" aria-hidden="true" />
              <span>{{ saving ? 'Saving…' : 'Save' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
