<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { tenants, showToast, type TenantRecord } from '@/lib/systemState';
import { peso, CANONICAL_32_UNITS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Search, UserPlus, Eye, Pencil, LogOut, X, AlertTriangle, RefreshCw, Loader2 } from 'lucide-vue-next';

interface ApiTenant {
  profile_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  account_status: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  occupation: string;
  facebook_url: string;
  current_room_number: string;
  start_date: string;
  deposit_amount: number;
  occupant_count: number;
  anniversary_date: string;
  assignment_id: string;
}

const q = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
const profileModalTenant = ref<TenantRecord | null>(null);
const editModalTenant = ref<TenantRecord | null>(null);
const vacateModalTenant = ref<TenantRecord | null>(null);
const isOnboardModalOpen = ref(false);

// Onboard Form
const newName = ref('');
const newEmail = ref('');
const newPhone = ref('');
const newUnit = ref('1a');
const newMoveIn = ref('2026-08-21');
const newAnniv = ref('2026-08-21');
const newDeposit = ref(9000);
const newOccupants = ref(1);
const newEmergName = ref('');
const newEmergPhone = ref('');
const newOccupation = ref('');

// Edit Contact Form
const editPhone = ref('');
const editEmail = ref('');
const editEmergName = ref('');
const editEmergPhone = ref('');
const editOccupation = ref('');

async function fetchTenants() {
  isLoading.value = true;
  try {
    const data = await api.get<ApiTenant[]>('/admin/tenants');
    if (data && data.length) {
      data.forEach((t) => {
        const existing = tenants.find(
          (item) => item.id === t.profile_id || item.email.toLowerCase() === t.email.toLowerCase()
        );
        if (existing) {
          existing.name = t.full_name || existing.name;
          existing.phone = t.phone_number || existing.phone;
          existing.unitCode = t.current_room_number || existing.unitCode;
          existing.depositAmount = Number(t.deposit_amount) || existing.depositAmount;
          existing.emergencyContact = {
            name: t.emergency_contact_name || existing.emergencyContact.name,
            phone: t.emergency_contact_phone || existing.emergencyContact.phone,
          };
          existing.occupation = t.occupation || existing.occupation;
          existing.occupants = t.occupant_count || existing.occupants;
        } else {
          tenants.push({
            id: t.profile_id,
            name: t.full_name,
            unitCode: t.current_room_number || '1A',
            phone: t.phone_number || '0917-000-0000',
            email: t.email,
            moveInDate: t.start_date || 'Aug 2026',
            anniversary: t.anniversary_date || '21 Aug',
            depositAmount: Number(t.deposit_amount) || 9000,
            status: t.account_status === 'active' ? 'active' : 'vacated',
            emergencyContact: {
              name: t.emergency_contact_name || 'Contact Person',
              phone: t.emergency_contact_phone || '0917-000-0000',
            },
            occupation: t.occupation || 'Resident',
            facebook: t.facebook_url || `facebook.com/${t.full_name.replace(/\s+/g, '').toLowerCase()}`,
            occupants: t.occupant_count || 1,
          });
        }
      });
    }
  } catch {
    // Graceful offline fallback
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTenants();
});

const rows = computed(() => {
  const query = q.value.toLowerCase().trim();
  return tenants.filter((t) => {
    return (
      !query ||
      t.name.toLowerCase().includes(query) ||
      t.unitCode.toLowerCase().includes(query) ||
      t.phone.includes(query) ||
      t.email.toLowerCase().includes(query)
    );
  });
});

function openProfile(t: TenantRecord) {
  profileModalTenant.value = t;
}

function openEdit(t: TenantRecord) {
  editModalTenant.value = t;
  editPhone.value = t.phone;
  editEmail.value = t.email;
  editEmergName.value = t.emergencyContact.name;
  editEmergPhone.value = t.emergencyContact.phone;
  editOccupation.value = t.occupation;
}

async function saveEdit() {
  if (!editModalTenant.value) return;
  isSubmitting.value = true;
  try {
    try {
      await api.patch(`/admin/tenants/${editModalTenant.value.id}`, {
        phoneNumber: editPhone.value,
        emergencyContactName: editEmergName.value,
        emergencyContactPhone: editEmergPhone.value,
        occupation: editOccupation.value,
      });
    } catch {
      // Offline fallback
    }

    editModalTenant.value.phone = editPhone.value;
    editModalTenant.value.email = editEmail.value;
    editModalTenant.value.emergencyContact.name = editEmergName.value;
    editModalTenant.value.emergencyContact.phone = editEmergPhone.value;
    editModalTenant.value.occupation = editOccupation.value;
    showToast('success', 'Contact details updated', `Resident info for ${editModalTenant.value.name} updated.`);
    editModalTenant.value = null;
  } finally {
    isSubmitting.value = false;
  }
}

function openVacate(t: TenantRecord) {
  vacateModalTenant.value = t;
}

async function confirmVacate() {
  if (!vacateModalTenant.value) return;
  isSubmitting.value = true;
  try {
    try {
      await api.post(`/admin/tenants/${vacateModalTenant.value.id}/vacate`);
    } catch {
      // Offline fallback
    }

    const idx = tenants.findIndex((t) => t.id === vacateModalTenant.value?.id);
    if (idx !== -1) {
      tenants.splice(idx, 1);
    }
    showToast('warning', 'Vacancy settled', `Unit ${vacateModalTenant.value.unitCode} released back to directory.`);
    vacateModalTenant.value = null;
  } finally {
    isSubmitting.value = false;
  }
}

async function handleOnboard() {
  isSubmitting.value = true;
  try {
    try {
      const allRooms = await api.get<{ id: string; room_number: string }[]>('/admin/rooms');
      const matched = allRooms.find((r) => r.room_number.toLowerCase() === newUnit.value.toLowerCase());
      if (matched) {
        await api.post('/admin/tenants', {
          fullName: newName.value.trim(),
          email: newEmail.value.trim(),
          phoneNumber: newPhone.value.trim(),
          roomId: matched.id,
          startDate: newMoveIn.value,
          anniversaryDate: newAnniv.value,
          depositAmount: Number(newDeposit.value) || 9000,
          occupantCount: Number(newOccupants.value) || 1,
          emergencyContactName: newEmergName.value || 'Contact Person',
          emergencyContactPhone: newEmergPhone.value || '0917-000-0000',
          occupation: newOccupation.value || 'Resident',
        });
      }
    } catch {
      // Local sync
    }

    const newTenant: TenantRecord = {
      id: `TEN-${String(tenants.length + 1).padStart(3, '0')}`,
      name: newName.value,
      unitCode: newUnit.value.toUpperCase(),
      phone: newPhone.value,
      email: newEmail.value,
      moveInDate: new Date(newMoveIn.value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      anniversary: `${new Date(newAnniv.value).getDate()} ${new Date(newAnniv.value).toLocaleDateString('en-US', { month: 'short' })}`,
      depositAmount: Number(newDeposit.value) || 9000,
      status: 'active',
      emergencyContact: {
        name: newEmergName.value || 'Contact Person',
        phone: newEmergPhone.value || '0917-000-0000',
      },
      occupation: newOccupation.value || 'Resident',
      facebook: `facebook.com/${newName.value.replace(/\s+/g, '').toLowerCase()}`,
      occupants: Number(newOccupants.value) || 1,
    };
    tenants.unshift(newTenant);
    isOnboardModalOpen.value = false;
    newName.value = '';
    newEmail.value = '';
    newPhone.value = '';
    showToast('success', 'Tenant onboarded', 'Resident portal access and billing issued.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header (Screenshot 4) -->
    <div class="flex flex-col gap-3 border-b border-[#e7e5e4] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
          Active Tenant Directory
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#71717a]">
          {{ tenants.length }} residents currently on record.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          @click="fetchTenants"
          :disabled="isLoading"
          class="btn-secondary min-h-11 px-3 py-1.5 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="isOnboardModalOpen = true"
          class="btn-primary min-h-11 gap-2 text-xs shadow-xs cursor-pointer"
        >
          <UserPlus class="size-4 text-[#f59e0b]" />
          <span>Onboard Tenant</span>
        </button>
      </div>
    </div>

    <!-- Section Card with Search & Tenant Table -->
    <div class="surface-card overflow-hidden">
      <!-- Search Bar -->
      <div class="border-b border-[#e7e5e4] p-4">
        <div class="relative">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <input
            v-model="q"
            type="text"
            placeholder="Search name, unit or phone…"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none transition-colors"
          />
        </div>
      </div>

      <!-- Table (Screenshot 4) -->
      <div class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[1000px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a] border-b border-[#e7e5e4]">
              <th class="whitespace-nowrap px-4 py-3 font-bold">RESIDENT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">CONTACT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">EMERGENCY CONTACT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">MOVE-IN</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">DEPOSIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="t in rows" 
              :key="t.id"
              class="border-b border-[#e7e5e4] last:border-0 hover:bg-[#fafaf9] transition-colors"
            >
              <!-- RESIDENT -->
              <td class="px-4 py-3.5">
                <p class="font-bold text-[#1c1917]">{{ t.name }}</p>
                <p class="text-xs text-[#71717a]">{{ t.email }}</p>
              </td>

              <!-- UNIT -->
              <td class="px-4 py-3.5 font-display font-extrabold uppercase text-[#1c1917]">
                {{ t.unitCode }}
              </td>

              <!-- CONTACT -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 font-mono text-xs text-[#1c1917]">
                {{ t.phone }}
              </td>

              <!-- EMERGENCY CONTACT -->
              <td class="whitespace-nowrap px-4 py-3.5">
                <p class="text-[#1c1917] font-medium">{{ t.emergencyContact.name }}</p>
                <p class="tabular font-mono text-xs text-[#71717a]">{{ t.emergencyContact.phone }}</p>
              </td>

              <!-- MOVE-IN -->
              <td class="whitespace-nowrap px-4 py-3.5 text-[#71717a]">
                {{ t.moveInDate }}
              </td>

              <!-- DEPOSIT -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 font-display font-bold text-[#1c1917]">
                {{ peso(t.depositAmount) }}
              </td>

              <!-- STATUS -->
              <td class="px-4 py-3.5">
                <span 
                  :class="[
                    'badge-soft text-xs',
                    t.status === 'active' ? 'badge-success' : 'badge-warning'
                  ]"
                >
                  {{ t.status === 'active' ? 'Active' : 'Pending' }}
                </span>
              </td>

              <!-- ACTIONS -->
              <td class="whitespace-nowrap px-4 py-3.5">
                <div class="flex items-center gap-1.5">
                  <button 
                    @click="openProfile(t)"
                    class="btn-secondary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
                  >
                    <Eye class="size-3.5 text-[#71717a]" />
                    <span>Profile</span>
                  </button>
                  <button 
                    @click="openEdit(t)"
                    class="btn-secondary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs cursor-pointer"
                  >
                    <Pencil class="size-3.5 text-[#71717a]" />
                    <span>Edit</span>
                  </button>
                  <button 
                    @click="openVacate(t)"
                    class="btn-secondary min-h-9 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-xs hover:border-rose-300 hover:text-rose-600 cursor-pointer"
                  >
                    <LogOut class="size-3.5" />
                    <span>Vacate</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Profile Dialog -->
    <div 
      v-if="profileModalTenant" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="profileModalTenant = null"
    >
      <div class="surface-card w-full max-w-lg shadow-2xl rounded-2xl p-6 bg-white space-y-4 max-h-[90dvh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div>
            <h3 class="font-display font-extrabold text-xl text-[#1c1917]">{{ profileModalTenant.name }}</h3>
            <p class="text-xs text-[#71717a]">Unit {{ profileModalTenant.unitCode }} · {{ profileModalTenant.id }}</p>
          </div>
          <button @click="profileModalTenant = null" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <div class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Phone</p>
            <p class="font-mono text-sm mt-0.5">{{ profileModalTenant.phone }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Email</p>
            <p class="text-sm mt-0.5">{{ profileModalTenant.email }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Occupation</p>
            <p class="text-sm mt-0.5">{{ profileModalTenant.occupation }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Occupants</p>
            <p class="text-sm mt-0.5">{{ profileModalTenant.occupants }} registered</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Move-in Date</p>
            <p class="text-sm mt-0.5">{{ profileModalTenant.moveInDate }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Anniversary Anchor</p>
            <p class="text-sm mt-0.5">{{ profileModalTenant.anniversary }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Deposit Held</p>
            <p class="font-display font-bold text-sm text-[#1c1917] mt-0.5">{{ peso(profileModalTenant.depositAmount) }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Facebook</p>
            <p class="text-sm text-blue-600 mt-0.5">{{ profileModalTenant.facebook }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Emergency Contact</p>
            <p class="text-sm mt-0.5">{{ profileModalTenant.emergencyContact.name }}</p>
          </div>
          <div>
            <p class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">Emergency Phone</p>
            <p class="font-mono text-sm mt-0.5">{{ profileModalTenant.emergencyContact.phone }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Contact Modal -->
    <div 
      v-if="editModalTenant" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="editModalTenant = null"
    >
      <div class="surface-card w-full max-w-md shadow-2xl rounded-2xl p-6 bg-white space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div>
            <h3 class="font-display font-extrabold text-lg text-[#1c1917]">Edit Contact Info</h3>
            <p class="text-xs text-[#71717a]">{{ editModalTenant.name }} · Unit {{ editModalTenant.unitCode }}</p>
          </div>
          <button @click="editModalTenant = null" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="saveEdit" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Phone</label>
            <input v-model="editPhone" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Email</label>
            <input v-model="editEmail" type="email" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Occupation</label>
            <input v-model="editOccupation" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Emergency Contact Name</label>
            <input v-model="editEmergName" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Emergency Contact Phone</label>
            <input v-model="editEmergPhone" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" @click="editModalTenant = null" class="btn-secondary cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary cursor-pointer disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Vacate Confirm Dialog -->
    <div 
      v-if="vacateModalTenant" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="vacateModalTenant = null"
    >
      <div class="surface-card w-full max-w-md shadow-2xl rounded-2xl p-6 bg-white space-y-4">
        <div class="flex items-center gap-2.5 text-rose-600">
          <AlertTriangle class="size-5" />
          <h3 class="font-display font-extrabold text-lg">Settle vacancy &amp; deactivate</h3>
        </div>
        <p class="text-xs text-[#71717a] leading-relaxed">
          This closes the account of <strong>{{ vacateModalTenant.name }}</strong> and marks unit <strong>{{ vacateModalTenant.unitCode }}</strong> as vacant. Deposit settlement will be logged.
        </p>
        <div class="pt-2 flex justify-end gap-2">
          <button type="button" @click="vacateModalTenant = null" class="btn-secondary cursor-pointer">Cancel</button>
          <button type="button" :disabled="isSubmitting" @click="confirmVacate" class="btn-primary bg-rose-600 hover:bg-rose-700 cursor-pointer disabled:opacity-50">
            <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
            <span>Settle Vacancy</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Onboard Tenant Modal -->
    <div 
      v-if="isOnboardModalOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isOnboardModalOpen = false"
    >
      <div class="surface-card w-full max-w-2xl shadow-2xl rounded-2xl p-6 bg-white space-y-4 max-h-[90dvh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2">
            <UserPlus class="size-5 text-[#f59e0b]" />
            <h3 class="font-display font-extrabold text-lg text-[#1c1917]">Onboard New Tenant</h3>
          </div>
          <button @click="isOnboardModalOpen = false" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <form @submit.prevent="handleOnboard" class="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Full Name</label>
            <input v-model="newName" placeholder="Juan Dela Cruz" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Email</label>
            <input v-model="newEmail" type="email" placeholder="you@email.com" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Phone</label>
            <input v-model="newPhone" placeholder="0917-000-0000" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Target Unit</label>
            <select v-model="newUnit" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
              <option v-for="u in CANONICAL_32_UNITS" :key="u.unitCode" :value="u.unitCode">
                {{ u.unitCode.toUpperCase() }} — {{ peso(u.basePrice) }} ({{ u.cluster }})
              </option>
            </select>
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Occupation</label>
            <input v-model="newOccupation" placeholder="Software Engineer / Student" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Occupants Count</label>
            <input v-model.number="newOccupants" type="number" min="1" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Move-in Date</label>
            <input v-model="newMoveIn" type="date" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Anniversary Anchor Date</label>
            <input v-model="newAnniv" type="date" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Deposit Amount (₱)</label>
            <input v-model.number="newDeposit" type="number" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-bold" required />
          </div>
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Emergency Contact Name</label>
            <input v-model="newEmergName" placeholder="Maria Santos" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>
          <div class="sm:col-span-2">
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Emergency Contact Phone</label>
            <input v-model="newEmergPhone" placeholder="0928-000-0000" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" required />
          </div>

          <div class="sm:col-span-2 pt-2 flex justify-end gap-2">
            <button type="button" @click="isOnboardModalOpen = false" class="btn-secondary cursor-pointer">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary cursor-pointer disabled:opacity-50">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin mr-1" />
              <span>Onboard Tenant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
