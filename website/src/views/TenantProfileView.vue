<!--
  @file views/TenantProfileView.vue
  @description Tenant self-service profile — read-only identity fields plus the five tenant-editable personal details.
  @systemBibleRef Section 4 (Tenant Role), Section 19 (Tenant-Editable Profile Fields)
  @requirements FR-010 Tenant Profile Updates
  @rationale System Bible Section 19 permits a tenant to maintain their own phone, emergency contact,
             occupation and Facebook link. Identity fields (name, email, role, account status) are
             administrator-owned, so they are shown for confirmation but rendered disabled — the server
             enforces the same boundary regardless of what the client submits.
  @innovations Split account-identity / editable-details cards, dirty-state tracking so Save only enables
               on a real change, and inline success + validation feedback without a page reload.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Briefcase,
  Link as LinkIcon,
  Save,
  CheckCircle2,
  AlertTriangle,
  X,
  LifeBuoy,
} from 'lucide-vue-next';
import { api } from '@/lib/api';

/** The five columns a tenant may write, per System Bible Section 19. */
interface EditableProfile {
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  occupation: string;
  facebook_url: string;
}

/** Administrator-owned identity fields — displayed, never submitted. */
const identity = ref({
  full_name: '',
  email: '',
  role: '',
  account_status: '',
});

const form = ref<EditableProfile>({
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

const isDirty = computed(
  () => JSON.stringify(form.value) !== JSON.stringify(savedSnapshot.value)
);

onMounted(fetchProfile);

async function fetchProfile() {
  loading.value = true;
  errorNotice.value = '';
  try {
    const data = await api.get<any>('/tenant/my-profile');
    if (!data) return;

    identity.value = {
      full_name: data.full_name ?? '',
      email: data.email ?? '',
      role: data.role ?? '',
      account_status: data.account_status ?? '',
    };

    // Null columns become empty strings so the inputs stay controlled.
    form.value = {
      phone_number: data.phone_number ?? '',
      emergency_contact_name: data.emergency_contact_name ?? '',
      emergency_contact_phone: data.emergency_contact_phone ?? '',
      occupation: data.occupation ?? '',
      facebook_url: data.facebook_url ?? '',
    };
    savedSnapshot.value = { ...form.value };
  } catch (err: any) {
    errorNotice.value = `Could not load your profile: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  successNotice.value = '';
  errorNotice.value = '';

  const url = form.value.facebook_url.trim();
  if (url && !/^https?:\/\//i.test(url)) {
    errorNotice.value = 'Facebook URL must begin with http:// or https://';
    return;
  }

  saving.value = true;
  try {
    // Empty strings are sent as null so a cleared field clears the column.
    const payload = Object.fromEntries(
      Object.entries(form.value).map(([key, value]) => [key, value.trim() || null])
    );

    const data = await api.put<any>('/tenant/my-profile', payload);

    if (data) {
      form.value = {
        phone_number: data.phone_number ?? '',
        emergency_contact_name: data.emergency_contact_name ?? '',
        emergency_contact_phone: data.emergency_contact_phone ?? '',
        occupation: data.occupation ?? '',
        facebook_url: data.facebook_url ?? '',
      };
    }
    savedSnapshot.value = { ...form.value };
    successNotice.value = 'Your personal details have been updated.';
  } catch (err: any) {
    errorNotice.value = `Save failed: ${err.message}`;
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
  <div class="max-w-4xl mx-auto py-2 space-y-6">
    <!-- Breadcrumb Header -->
    <div class="border-b border-[#dfe1e6] pb-4">
      <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
        <span>Tenant Portal</span>
        <span>/</span>
        <span class="font-medium text-[#172b4d]">My Profile</span>
      </div>
      <h1 class="text-xl font-bold text-[#172b4d]">My Profile</h1>
      <p class="text-xs text-[#6b778c] mt-0.5">
        Review your account details and keep your contact information current
      </p>
    </div>

    <div v-if="loading" class="p-12 text-center bg-white border border-[#dfe1e6] text-[#5e6c84] rounded-lg text-sm">
      Loading your profile…
    </div>

    <div v-else class="space-y-6">
      <!-- Notices -->
      <div
        v-if="successNotice"
        class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg flex items-center justify-between shadow-sm"
      >
        <div class="flex items-center gap-2.5">
          <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
          <span class="font-medium">{{ successNotice }}</span>
        </div>
        <button
          @click="successNotice = ''"
          class="text-emerald-700 hover:text-emerald-900 ml-3 p-1 rounded cursor-pointer"
          title="Dismiss"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div
        v-if="errorNotice"
        class="p-4 bg-red-50 border border-red-200 text-red-900 text-sm rounded-lg flex items-start gap-2.5"
      >
        <AlertTriangle class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <span class="font-medium">{{ errorNotice }}</span>
      </div>

      <!-- ---- Account Identity (read-only) ---- -->
      <section class="bg-white border border-[#dfe1e6] rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-[#dfe1e6] bg-[#f7f8f9]">
          <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-[#0c66e4]" />
            Account Identity
          </h2>
          <p class="text-xs text-[#6b778c] mt-1">
            Maintained by the administrator. Contact Landlady Fe Galang Da Silva to change these.
          </p>
        </div>

        <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-semibold text-[#172b4d] mb-1.5">Full Name</label>
            <div class="relative">
              <User class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                :value="identity.full_name"
                type="text"
                disabled
                class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-[#f4f5f7] text-[#5e6c84] cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#172b4d] mb-1.5">Email Address</label>
            <div class="relative">
              <Mail class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                :value="identity.email"
                type="email"
                disabled
                class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-[#f4f5f7] text-[#5e6c84] cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#172b4d] mb-1.5">Role</label>
            <div class="px-3 py-2.5 border border-[#dfe1e6] rounded-md bg-[#f4f5f7]">
              <span class="text-sm font-semibold text-[#172b4d] capitalize">
                {{ identity.role || '—' }}
              </span>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#172b4d] mb-1.5">Account Status</label>
            <div class="px-3 py-2.5 border border-[#dfe1e6] rounded-md bg-[#f4f5f7]">
              <span
                class="px-2.5 py-1 text-xs font-bold rounded-full"
                :class="
                  identity.account_status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[#dfe1e6] text-[#5e6c84]'
                "
              >
                {{ (identity.account_status || 'unknown').toUpperCase() }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- ---- Editable Personal Details ---- -->
      <form
        @submit.prevent="handleSave"
        class="bg-white border border-[#dfe1e6] rounded-lg overflow-hidden"
      >
        <div class="px-6 py-4 border-b border-[#dfe1e6] bg-[#f7f8f9]">
          <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <User class="w-4 h-4 text-[#0c66e4]" />
            Personal Details
          </h2>
          <p class="text-xs text-[#6b778c] mt-1">
            These are the details you may update yourself.
          </p>
        </div>

        <div class="p-6 space-y-6">
          <!-- Contact -->
          <div>
            <h3 class="text-xs font-bold text-[#6b778c] uppercase tracking-wider mb-3">Contact</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="phone">
                  Phone Number
                </label>
                <div class="relative">
                  <Phone class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="phone"
                    v-model="form.phone_number"
                    type="tel"
                    placeholder="e.g. 0917-123-4567"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="occupation">
                  Occupation
                </label>
                <div class="relative">
                  <Briefcase class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="occupation"
                    v-model="form.occupation"
                    type="text"
                    placeholder="e.g. Registered Nurse"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                  />
                </div>
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="facebook">
                  Facebook Profile URL
                </label>
                <div class="relative">
                  <LinkIcon class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="facebook"
                    v-model="form.facebook_url"
                    type="url"
                    placeholder="https://facebook.com/your.profile"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-[#dfe1e6]"></div>

          <!-- Emergency contact -->
          <div>
            <h3
              class="text-xs font-bold text-[#6b778c] uppercase tracking-wider mb-3 flex items-center gap-1.5"
            >
              <LifeBuoy class="w-3.5 h-3.5" />
              Emergency Contact
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="ec-name">
                  Contact Name
                </label>
                <div class="relative">
                  <User class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="ec-name"
                    v-model="form.emergency_contact_name"
                    type="text"
                    placeholder="Full name of your emergency contact"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="ec-phone">
                  Contact Phone
                </label>
                <div class="relative">
                  <Phone class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="ec-phone"
                    v-model="form.emergency_contact_phone"
                    type="tel"
                    placeholder="e.g. 0918-765-4321"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action bar -->
        <div
          class="px-6 py-4 border-t border-[#dfe1e6] bg-[#f7f8f9] flex items-center justify-between gap-3 flex-wrap"
        >
          <p class="text-xs text-[#6b778c]">
            {{ isDirty ? 'You have unsaved changes.' : 'All changes saved.' }}
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="handleReset"
              :disabled="!isDirty || saving"
              class="px-4 py-2.5 text-sm font-semibold text-[#42526e] bg-white border border-[#dfe1e6] rounded-md hover:bg-[#f4f5f7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              :disabled="!isDirty || saving"
              class="px-5 py-2.5 text-sm font-bold text-white bg-[#0c66e4] rounded-md hover:bg-[#0055cc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save class="w-4 h-4" />
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
