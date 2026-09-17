<!--
  @file views/TenantProfileView.vue
  @description Tenant self-service profile — edit personal details, phone number, emergency contacts, and profile avatar.
  @systemBibleRef Section 4 (Tenant Role), Section 19 (Tenant-Editable Profile Fields)
  @requirements FR-010 Tenant Profile Updates
  @rationale Allows tenants to keep their contact info, emergency contacts, occupation, and profile photo current.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  User,
  Mail,
  Save,
  CheckCircle2,
  AlertTriangle,
  X,
  LifeBuoy,
  RotateCcw,
  ShieldCheck
} from 'lucide-vue-next';
import { currentUser } from '@/lib/authStore';
import { api } from '@/lib/api';
import { showToast } from '@/lib/systemState';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';

/** Tenant-editable profile fields */
interface EditableProfile {
  full_name: string;
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  occupation: string;
  facebook_url: string;
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
  occupation: '',
  facebook_url: '',
});

/** Snapshot of the last saved server state, used for dirty tracking and reset. */
const savedSnapshot = ref<EditableProfile>({ ...form.value });

const loading = ref(false);
const saving = ref(false);
const successNotice = ref('');
const errorNotice = ref('');

const initials = computed(() => {
  const name = form.value.full_name || currentUser.value?.fullName || 'Resident';
  return name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'T';
});

const isDirty = computed(
  () => JSON.stringify(form.value) !== JSON.stringify(savedSnapshot.value)
);

onMounted(fetchProfile);

async function fetchProfile() {
  loading.value = true;
  errorNotice.value = '';
  try {
    const data = await api.get<any>('/tenant/my-profile').catch(() => null);
    
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
      occupation: data?.occupation || '',
      facebook_url: data?.facebook_url || '',
    };
    savedSnapshot.value = { ...form.value };
  } catch (err: any) {
    errorNotice.value = `Could not load your profile: ${err?.message || err}`;
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  successNotice.value = '';
  errorNotice.value = '';

  if (!form.value.full_name.trim()) {
    errorNotice.value = 'Please enter your name.';
    return;
  }

  const url = form.value.facebook_url.trim();
  if (url && !/^https?:\/\//i.test(url)) {
    errorNotice.value = 'Facebook URL must begin with http:// or https://';
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
      occupation: form.value.occupation.trim(),
      facebook_url: form.value.facebook_url.trim(),
    };

    // Surfaced rather than swallowed: a profile edit that silently fails leaves
    // the tenant believing their emergency contact is on file when it is not.
    await api.put('/tenant/my-profile', payload);

    // The name is not tenant-editable, so there is nothing to copy back here. Writing it
    // into the session made an edit the server refused look like it had been accepted.

    savedSnapshot.value = { ...form.value };
    successNotice.value = 'Your profile details have been saved successfully!';
    showToast('success', 'Profile Updated', 'Your profile details have been saved successfully.');
  } catch (err: any) {
    errorNotice.value = `Save failed: ${err?.message || err}`;
    showToast('error', 'Save Failed', err?.message || 'Could not save profile details.');
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
  <div class="space-y-6">
    <!-- Breadcrumb Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-ink-soft mb-1">
          <span>Tenant</span>
          <span>/</span>
          <span class="font-semibold text-ink">My Profile</span>
        </div>
        <h1 class="text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">Resident Profile</h1>
        <p class="text-xs sm:text-sm text-ink-soft mt-0.5">Manage your personal contact details, emergency info, and account profile.</p>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="space-y-4">
      <SkeletonCard variant="room" :count="2" />
    </div>

    <div v-else class="space-y-6">
      <!-- Notices -->
      <div
        v-if="successNotice"
        class="p-4 bg-brand-soft border border-brand-soft text-brand text-xs sm:text-sm rounded-tile flex items-center justify-between"
      >
        <div class="flex items-center gap-2.5">
          <CheckCircle2 class="size-5 text-brand shrink-0" />
          <span class="font-medium">{{ successNotice }}</span>
        </div>
        <button
          @click="successNotice = ''"
          class="text-brand hover:text-brand p-1 rounded-lg cursor-pointer"
          title="Dismiss"
        >
          <X class="size-4" />
        </button>
      </div>

      <div
        v-if="errorNotice"
        class="p-4 bg-overdue-soft border border-overdue-soft text-overdue text-xs sm:text-sm rounded-tile flex items-start gap-2.5"
      >
        <AlertTriangle class="size-5 text-overdue shrink-0 mt-0.5" />
        <span class="font-semibold">{{ errorNotice }}</span>
      </div>

      <!-- Avatar & Account Identity Card -->
      <div class="rounded-tile bg-tile rounded-tile border border-line bg-tile p-6 flex flex-col sm:flex-row items-center gap-6">
        <div class="relative group">
          <div class="size-24 rounded-full bg-night text-white flex items-center justify-center text-2xl font-semibold shadow-md overflow-hidden border-4 border-white ring-2 ring-border">
            <span>{{ initials }}</span>
          </div>

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
        </div>

        <div class="text-center sm:text-left space-y-1.5 flex-1">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 class="font-semibold text-xl text-ink">{{ form.full_name }}</h2>
            <span class="badge-soft badge-success text-xs font-semibold w-fit mx-auto sm:mx-0">
              Active Tenant
            </span>
          </div>
          <p class="text-xs text-ink-soft flex items-center justify-center sm:justify-start gap-1.5">
            <template v-if="identity.email">
              <Mail class="size-3.5 text-brand" /> {{ identity.email }}
            </template>
            <template v-else-if="form.phone_number">
              <Mail class="size-3.5 text-ink-soft" />
              <span>No email on file — signs in with {{ form.phone_number }}</span>
            </template>
            <template v-else>
              <Mail class="size-3.5 text-ink-soft" />
              <span>No email on file</span>
            </template>
          </p>
          <p class="text-xs text-ink-soft">
            Role: <strong class="text-ink capitalize">{{ identity.role }}</strong> · Status: <strong class="text-brand capitalize">{{ identity.account_status }}</strong>
          </p>
        </div>
      </div>

      <!-- Editable Profile Form -->
      <form @submit.prevent="handleSave" class="rounded-tile bg-tile rounded-tile border border-line bg-tile overflow-hidden">
        <div class="px-6 py-4 border-b border-line bg-canvas flex items-center justify-between">
          <div>
            <h2 class="font-semibold text-sm text-ink flex items-center gap-2">
              <User class="size-4 text-brand" />
              Edit Profile Details
            </h2>
            <p class="text-xs text-ink-soft mt-0.5">Update your contact numbers, emergency contact, and links</p>
          </div>
        </div>

        <div class="p-6 space-y-6">
          <!-- Full Name & Phone Number -->
          <div>
            <h3 class="text-xs font-semibold text-ink-soft mb-3">Resident Information</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs text-ink-faint" for="full-name">
                  Full Display Name
                </label>
                <!--
                  Read-only. The API accepts five tenant-editable fields and the name is not
                  among them - System Bible Section 19 - so typing here changed nothing but
                  looked as though it had.
                -->
                <input
                  id="full-name"
                  :value="form.full_name"
                  type="text"
                  readonly
                  title="Your name is on your tenancy record. Ask the landlady to change it."
                  placeholder="Your Full Name"
                  class="ws-input"
                  required
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs text-ink-faint" for="phone">
                  Contact Phone Number
                </label>
                <input
                  id="phone"
                  v-model="form.phone_number"
                  type="tel"
                  placeholder="e.g. 0917-123-4567"
                  class="ws-input"
                  required
                />
              </div>
            </div>
          </div>

          <div class="border-t border-line"></div>

          <!-- Occupation & Socials -->
          <div>
            <h3 class="text-xs font-semibold text-ink-soft mb-3">Work &amp; Social Profile</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs text-ink-faint" for="occupation">
                  Occupation / Course &amp; University
                </label>
                <input
                  id="occupation"
                  v-model="form.occupation"
                  type="text"
                  placeholder="e.g. BS Nursing Student / IT Specialist"
                  class="ws-input"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs text-ink-faint" for="facebook">
                  Facebook Profile Link
                </label>
                <input
                  id="facebook"
                  v-model="form.facebook_url"
                  type="url"
                  placeholder="https://facebook.com/your.profile"
                  class="ws-input"
                />
              </div>
            </div>
          </div>

          <div class="border-t border-line"></div>

          <!-- Emergency Contact -->
          <div>
            <h3 class="text-xs font-semibold text-ink-soft mb-3 flex items-center gap-1.5">
              <LifeBuoy class="size-3.5 text-overdue" />
              Emergency Contact Person
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs text-ink-faint" for="ec-name">
                  Emergency Contact Full Name
                </label>
                <input
                  id="ec-name"
                  v-model="form.emergency_contact_name"
                  type="text"
                  placeholder="Parent / Guardian Name"
                  class="ws-input"
                  required
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs text-ink-faint" for="ec-phone">
                  Emergency Contact Phone Number
                </label>
                <input
                  id="ec-phone"
                  v-model="form.emergency_contact_phone"
                  type="tel"
                  placeholder="e.g. 0918-987-6543"
                  class="ws-input"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="px-6 py-4 border-t border-line bg-canvas flex items-center justify-between gap-3 flex-wrap">
          <p class="text-xs text-ink-soft">
            {{ isDirty ? 'Unsaved profile modifications.' : 'Profile is up to date.' }}
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="handleReset"
              :disabled="!isDirty || saving"
              class="pill-btn"
            >
              <RotateCcw class="size-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="submit"
              :disabled="!isDirty || saving"
              class="pill-btn-brand"
            >
              <Save class="size-3.5 text-white" />
              <span>{{ saving ? 'Saving Changes…' : 'Save Profile' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
