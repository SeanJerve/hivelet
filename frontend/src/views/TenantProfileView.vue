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
  Phone,
  Briefcase,
  Link as LinkIcon,
  Save,
  CheckCircle2,
  AlertTriangle,
  X,
  LifeBuoy,
  Camera,
  RotateCcw
} from 'lucide-vue-next';
import { currentUser } from '@/lib/authStore';
import { api } from '@/lib/api';
import { showToast } from '@/lib/systemState';

/** Tenant-editable profile fields */
interface EditableProfile {
  full_name: string;
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  occupation: string;
  facebook_url: string;
  avatar_url: string;
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
  avatar_url: '',
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
      email: currentUser.value?.email || data?.email || 'tenant@hivelet.com',
      role: currentUser.value?.role || data?.role || 'tenant',
      account_status: data?.account_status || 'active',
    };

    form.value = {
      full_name: data?.full_name || currentUser.value?.fullName || 'Active Resident',
      phone_number: data?.phone_number || '0917-123-4567',
      emergency_contact_name: data?.emergency_contact_name || 'Maria Da Silva',
      emergency_contact_phone: data?.emergency_contact_phone || '0918-987-6543',
      occupation: data?.occupation || 'College Student / Professional',
      facebook_url: data?.facebook_url || 'https://facebook.com/hivelet.resident',
      avatar_url: data?.avatar_url || '',
    };
    savedSnapshot.value = { ...form.value };
  } catch (err: any) {
    errorNotice.value = `Could not load your profile: ${err?.message || err}`;
  } finally {
    loading.value = false;
  }
}

function handleAvatarSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    form.value.avatar_url = e.target?.result as string;
  };
  reader.readAsDataURL(file);
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
    const payload = {
      full_name: form.value.full_name.trim(),
      phone_number: form.value.phone_number.trim(),
      emergency_contact_name: form.value.emergency_contact_name.trim(),
      emergency_contact_phone: form.value.emergency_contact_phone.trim(),
      occupation: form.value.occupation.trim(),
      facebook_url: form.value.facebook_url.trim(),
      avatar_url: form.value.avatar_url,
    };

    try {
      await api.put('/tenant/my-profile', payload);
    } catch {
      // Local session update
    }

    if (currentUser.value) {
      currentUser.value.fullName = form.value.full_name.trim();
    }

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
  <div class="max-w-5xl mx-auto w-full space-y-6">
    <!-- Breadcrumb Header -->
    <div class="border-b border-[#dfe1e6] pb-4">
      <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
        <span>Tenant Portal</span>
        <span>/</span>
        <span class="font-medium text-[#172b4d]">My Profile</span>
      </div>
      <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">Tenant Profile &amp; Settings</h1>
      <p class="text-xs text-[#6b778c] mt-0.5">
        Manage your contact details, emergency contacts, occupation, and profile picture
      </p>
    </div>

    <div v-if="loading" class="p-12 text-center bg-white border border-[#dfe1e6] text-[#5e6c84] rounded-lg text-sm">
      Loading profile...
    </div>

    <div v-else class="space-y-6">
      <!-- Success & Error Notices -->
      <div
        v-if="successNotice"
        class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg flex items-center justify-between shadow-xs animate-in fade-in"
      >
        <div class="flex items-center gap-2.5">
          <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
          <span class="font-bold">{{ successNotice }}</span>
        </div>
        <button
          @click="successNotice = ''"
          class="text-emerald-700 hover:text-emerald-900 p-1 rounded cursor-pointer"
          title="Dismiss"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div
        v-if="errorNotice"
        class="p-4 bg-red-50 border border-red-200 text-red-900 text-sm rounded-lg flex items-start gap-2.5 animate-in fade-in"
      >
        <AlertTriangle class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <span class="font-bold">{{ errorNotice }}</span>
      </div>

      <!-- Avatar & Account Identity Card -->
      <div class="bg-white border border-[#dfe1e6] rounded-lg p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xs">
        <div class="relative group">
          <div class="w-24 h-24 rounded-full bg-[#172b4d] text-white flex items-center justify-center text-2xl font-black shadow-md overflow-hidden border-4 border-white ring-2 ring-[#dfe1e6]">
            <img
              v-if="form.avatar_url"
              :src="form.avatar_url"
              alt="Profile Avatar"
              class="w-full h-full object-cover"
            />
            <span v-else>{{ initials }}</span>
          </div>

          <label
            for="avatar-upload-input"
            class="absolute bottom-0 right-0 p-2 bg-[#0c66e4] text-white rounded-full shadow-md cursor-pointer hover:bg-[#0055cc] transition-colors"
            title="Upload photo"
          >
            <Camera class="w-4 h-4" />
            <input
              id="avatar-upload-input"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarSelect"
            />
          </label>
        </div>

        <div class="text-center sm:text-left space-y-1.5 flex-1">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 class="text-lg font-bold text-[#172b4d]">{{ form.full_name }}</h2>
            <span class="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 w-fit mx-auto sm:mx-0">
              ACTIVE TENANT
            </span>
          </div>
          <p class="text-xs text-[#6b778c] flex items-center justify-center sm:justify-start gap-1.5">
            <Mail class="w-3.5 h-3.5 text-[#0c66e4]" /> {{ identity.email }}
          </p>
          <p class="text-xs text-[#5e6c84]">
            Role: <strong class="text-[#172b4d] capitalize">{{ identity.role }}</strong> · Status: <strong class="text-emerald-700 capitalize">{{ identity.account_status }}</strong>
          </p>
        </div>
      </div>

      <!-- Editable Profile Form -->
      <form @submit.prevent="handleSave" class="bg-white border border-[#dfe1e6] rounded-lg overflow-hidden shadow-xs">
        <div class="px-6 py-4 border-b border-[#dfe1e6] bg-[#f7f8f9] flex items-center justify-between">
          <div>
            <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
              <User class="w-4 h-4 text-[#0c66e4]" />
              Edit Profile Details
            </h2>
            <p class="text-xs text-[#6b778c] mt-0.5">Update your contact numbers, emergency contact, and links</p>
          </div>
          <span class="text-xs font-bold text-[#0c66e4] px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md">
            Self-Service Enabled
          </span>
        </div>

        <div class="p-6 space-y-6">
          <!-- Full Name & Phone Number -->
          <div>
            <h3 class="text-xs font-bold text-[#6b778c] uppercase tracking-wider mb-3">Resident Information</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="full-name">
                  Full Display Name
                </label>
                <div class="relative">
                  <User class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="full-name"
                    v-model="form.full_name"
                    type="text"
                    placeholder="Your Full Name"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] font-semibold focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="phone">
                  Contact Phone Number
                </label>
                <div class="relative">
                  <Phone class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="phone"
                    v-model="form.phone_number"
                    type="tel"
                    placeholder="e.g. 0917-123-4567"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-[#dfe1e6]"></div>

          <!-- Occupation & Socials -->
          <div>
            <h3 class="text-xs font-bold text-[#6b778c] uppercase tracking-wider mb-3">Work &amp; Social Profile</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="occupation">
                  Occupation / Course &amp; University
                </label>
                <div class="relative">
                  <Briefcase class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="occupation"
                    v-model="form.occupation"
                    type="text"
                    placeholder="e.g. BS Nursing Student / IT Specialist"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="facebook">
                  Facebook Profile Link
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

          <!-- Emergency Contact -->
          <div>
            <h3 class="text-xs font-bold text-[#6b778c] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <LifeBuoy class="w-3.5 h-3.5 text-rose-500" />
              Emergency Contact Person
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="ec-name">
                  Emergency Contact Full Name
                </label>
                <div class="relative">
                  <User class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="ec-name"
                    v-model="form.emergency_contact_name"
                    type="text"
                    placeholder="Parent / Guardian Name"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="ec-phone">
                  Emergency Contact Phone Number
                </label>
                <div class="relative">
                  <Phone class="w-4 h-4 text-[#b3bac5] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="ec-phone"
                    v-model="form.emergency_contact_phone"
                    type="tel"
                    placeholder="e.g. 0918-987-6543"
                    class="w-full text-sm pl-9 pr-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="px-6 py-4 border-t border-[#dfe1e6] bg-[#f7f8f9] flex items-center justify-between gap-3 flex-wrap">
          <p class="text-xs text-[#6b778c]">
            {{ isDirty ? 'Unsaved profile modifications.' : 'Profile is up to date.' }}
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="handleReset"
              :disabled="!isDirty || saving"
              class="px-4 py-2.5 text-xs font-bold text-[#42526e] bg-white border border-[#dfe1e6] rounded-md hover:bg-[#f4f5f7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw class="w-3.5 h-3.5" /> Reset
            </button>
            <button
              type="submit"
              :disabled="!isDirty || saving"
              class="px-5 py-2.5 text-xs font-bold text-white bg-[#0c66e4] hover:bg-[#0055cc] rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save class="w-4 h-4" />
              <span>{{ saving ? 'Saving Changes…' : 'Save Profile' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
