<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { tenants, fetchTenants as fetchTenantsState, fetchRooms, showToast, type TenantRecord } from '@/lib/systemState';
import { peso, CANONICAL_32_UNITS } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Search, UserPlus, Eye, Pencil, LogOut, X, AlertTriangle, RefreshCw, Loader2, Users, User, Check, ShieldCheck, Clock } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';

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
const newHasRoommates = ref<'no' | 'yes'>('no');
const newRoommateQty = ref<number>(1);
const newEmergName = ref('');
const newEmergPhone = ref('');

// Edit Tenant Assignment Form
const editUnitCode = ref('');
const editStatus = ref<'active' | 'vacated'>('active');
const editHasRoommates = ref<'no' | 'yes'>('no');
const editRoommateQty = ref<number>(0);

async function fetchTenants() {
  isLoading.value = true;
  try {
    await fetchTenantsState();
  } catch (err) {
    console.error('fetchTenants failed:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTenants();
});

const statusFilter = ref<'all' | 'active' | 'vacated'>('all');

const activeCount = computed(() => tenants.filter(t => t.status === 'active').length);
const vacatedCount = computed(() => tenants.filter(t => t.status === 'vacated' || t.status === 'notice').length);

const rows = computed(() => {
  const query = q.value.toLowerCase().trim();
  return tenants.filter((t) => {
    const matchesFilter =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'active' && t.status === 'active') ||
      (statusFilter.value === 'vacated' && (t.status === 'vacated' || t.status === 'notice'));

    if (!matchesFilter) return false;

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
  editUnitCode.value = t.unitCode.toUpperCase();
  editStatus.value = t.status as 'active' | 'vacated';
  const rQty = t.roommateQty ?? Math.max(0, (t.occupants || 1) - 1);
  editHasRoommates.value = rQty > 0 ? 'yes' : 'no';
  editRoommateQty.value = rQty > 0 ? rQty : 1;
}

async function saveEdit() {
  if (!editModalTenant.value) return;
  
  // Verify unit is not occupied by another active tenant
  const targetUnit = editUnitCode.value.toLowerCase();
  const currentTenantId = editModalTenant.value.id;
  const isOccupiedByOther = tenants.some(t => 
    t.status === 'active' && 
    t.unitCode.toLowerCase() === targetUnit && 
    t.id !== currentTenantId
  );
  if (isOccupiedByOther && targetUnit !== '—' && targetUnit !== 'none') {
    showToast('error', 'Unit Already Occupied', `Unit ${editUnitCode.value.toUpperCase()} already has an active tenant.`);
    return;
  }

  isSubmitting.value = true;
  try {
    const finalRoommateQty = editHasRoommates.value === 'yes' ? Number(editRoommateQty.value) || 1 : 0;
    const finalOccupants = 1 + finalRoommateQty;

    await api.patch(`/admin/tenants/${editModalTenant.value.id}`, {
      roomNumber: editUnitCode.value.toUpperCase(),
      accountStatus: editStatus.value === 'active' ? 'active' : 'inactive',
      occupantCount: finalOccupants,
      roommateQty: finalRoommateQty,
    });

    await fetchTenants();
    await fetchRooms();
    showToast('success', 'Tenant details updated', `Resident info for ${editModalTenant.value.name} updated.`);
    editModalTenant.value = null;
  } catch (err: any) {
    showToast('error', 'Update Failed', err?.message || 'Could not update tenant details.');
  } finally {
    isSubmitting.value = false;
  }
}

function openVacate(t: TenantRecord) {
  vacateModalTenant.value = t;
}

function openVacateFromModal(t: TenantRecord) {
  editModalTenant.value = null;
  vacateModalTenant.value = t;
}

async function confirmVacate() {
  if (!vacateModalTenant.value) return;
  isSubmitting.value = true;
  try {
    await api.post(`/admin/tenants/${vacateModalTenant.value.id}/vacate`);
    await fetchTenants();
    await fetchRooms();
    showToast('warning', 'Vacancy settled', `Unit ${vacateModalTenant.value.unitCode} released back to directory.`);
    vacateModalTenant.value = null;
  } catch (err: any) {
    showToast('error', 'Vacate Failed', err?.message || 'Could not settle vacancy.');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleOnboard() {
  const isOccupied = tenants.some(t => t.status === 'active' && t.unitCode.toLowerCase() === newUnit.value.toLowerCase());
  if (isOccupied) {
    showToast('error', 'Unit Already Occupied', `Unit ${newUnit.value.toUpperCase()} already has an active tenant.`);
    return;
  }

  isSubmitting.value = true;
  try {
    const finalRoommateQty = newHasRoommates.value === 'yes' ? Number(newRoommateQty.value) || 1 : 0;
    const finalOccupants = 1 + finalRoommateQty;

    await api.post('/admin/tenants', {
      fullName: newName.value.trim(),
      email: newEmail.value.trim(),
      phone: newPhone.value.trim(),
      roomNumber: newUnit.value.toUpperCase(),
      moveInDate: newMoveIn.value,
      depositAmount: Number(newDeposit.value) || 9000,
      occupantCount: finalOccupants,
      roommateQty: finalRoommateQty,
      emergencyContactName: newEmergName.value.trim() || 'Emergency Contact',
      emergencyContactPhone: newEmergPhone.value.trim() || '—',
      occupation: 'Resident',
    });

    await fetchTenants();
    await fetchRooms();

    isOnboardModalOpen.value = false;
    newName.value = '';
    newEmail.value = '';
    newPhone.value = '';
    newHasRoommates.value = 'no';
    newRoommateQty.value = 1;
    showToast('success', 'Tenant onboarded', 'Resident portal access and room assignment registered.');
  } catch (err: any) {
    showToast('error', 'Onboarding Failed', err?.message || 'Could not onboard tenant.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col gap-3 border-b border-[#e7e5e4] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#71717a] mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-bold text-[#1c1917]">Active Tenants</span>
        </div>
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
          class="btn-secondary"
        >
          <RefreshCw :class="['size-3.5 text-[#71717a]', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="isOnboardModalOpen = true"
          class="btn-primary"
        >
          <UserPlus class="size-3.5 text-white" />
          <span>Onboard Tenant</span>
        </button>
      </div>
    </div>

    <!-- Section Card with Search & Tenant Table -->
    <div class="surface-card overflow-hidden">
      <!-- Search Bar & Filters -->
      <div class="border-b border-[#e7e5e4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#71717a]" />
          <input
            v-model="q"
            type="text"
            placeholder="Search name, unit or phone…"
            class="min-h-11 w-full rounded-xl border border-[#e7e5e4] bg-[#fafaf9] pl-10 pr-4 text-xs sm:text-sm text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none transition-colors"
          />
        </div>

        <div class="h-10 inline-flex items-center gap-1 self-start sm:self-auto bg-[#f5f5f4] p-1 border border-[#e7e5e4] rounded-xl text-xs">
          <button
            type="button"
            @click="statusFilter = 'all'"
            :class="[
              'h-8 px-3 rounded-lg font-bold transition-colors cursor-pointer inline-flex items-center',
              statusFilter === 'all' ? 'bg-white text-[#0c66e4] shadow-xs' : 'text-[#71717a] hover:text-[#1c1917]'
            ]"
          >
            All ({{ tenants.length }})
          </button>
          <button
            type="button"
            @click="statusFilter = 'active'"
            :class="[
              'h-8 px-3 rounded-lg font-bold transition-colors cursor-pointer inline-flex items-center',
              statusFilter === 'active' ? 'bg-white text-[#0c66e4] shadow-xs' : 'text-[#71717a] hover:text-[#1c1917]'
            ]"
          >
            Active ({{ activeCount }})
          </button>
          <button
            type="button"
            @click="statusFilter = 'vacated'"
            :class="[
              'h-8 px-3 rounded-lg font-bold transition-colors cursor-pointer inline-flex items-center',
              statusFilter === 'vacated' ? 'bg-white text-[#0c66e4] shadow-xs' : 'text-[#71717a] hover:text-[#1c1917]'
            ]"
          >
            Past / Vacated ({{ vacatedCount }})
          </button>
        </div>
      </div>

      <!-- SKELETON LOADING STATE -->
      <div v-if="isLoading" class="p-4">
        <SkeletonTable :columns="8" :rows="6" />
      </div>

      <!-- Table (Screenshot 4) -->
      <div v-else class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full min-w-[1000px] text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-[#f5f5f4]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-[#71717a] border-b border-[#e7e5e4]">
              <th class="whitespace-nowrap px-4 py-3 font-bold">RESIDENT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">ROOMMATES</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">EMERGENCY CONTACT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">MOVE-IN</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">DEPOSIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-bold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="t in rows" 
              :key="t.id"
              class="border-b border-[#e7e5e4] last:border-0 hover:bg-[#fafaf9] transition-colors"
            >
              <!-- RESIDENT (Name + Email + Phone stacked for compact layout) -->
              <td class="px-4 py-3.5">
                <p class="font-bold text-[#1c1917]">{{ t.name }}</p>
                <p class="text-xs text-[#71717a]">{{ t.email }}</p>
                <p class="tabular font-mono text-[11px] text-[#71717a] mt-0.5">{{ t.phone }}</p>
              </td>

              <!-- UNIT -->
              <td class="px-4 py-3.5 font-display font-extrabold uppercase text-[#1c1917]">
                {{ t.unitCode }}
              </td>

              <!-- ROOMMATES (BR-014 Water Billing & Headcount Rule) -->
              <td class="whitespace-nowrap px-4 py-3.5">
                <span 
                  v-if="(t.roommateQty ?? (t.occupants - 1)) > 0"
                  class="badge-soft badge-blue text-xs font-bold"
                >
                  Yes ({{ t.roommateQty ?? (t.occupants - 1) }} {{ (t.roommateQty ?? (t.occupants - 1)) === 1 ? 'roommate' : 'roommates' }})
                </span>
                <span 
                  v-else 
                  class="badge-soft badge-neutral text-xs font-bold"
                >
                  Solo (1 Pax)
                </span>
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
                    'badge-soft text-xs font-bold',
                    t.status === 'active' ? 'badge-success' : 'badge-neutral'
                  ]"
                >
                  {{ t.status === 'active' ? 'Active' : 'Vacated' }}
                </span>
              </td>

              <!-- ACTIONS (Compact Single Edit button opening Profile & Edit & Vacate) -->
              <td class="whitespace-nowrap px-4 py-3.5 text-right">
                <button 
                  @click="openEdit(t)"
                  class="btn-secondary min-h-8 px-3 py-1 text-xs gap-1.5 inline-flex items-center shadow-2xs font-semibold cursor-pointer hover:border-[#0c66e4] hover:text-[#0c66e4]"
                >
                  <Pencil class="size-3.5" />
                  <span>Edit</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit & Manage Tenant Modal (Profile + Edit Assignment + Vacate Action) -->
    <div 
      v-if="editModalTenant" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="editModalTenant = null"
    >
      <div class="surface-card w-full max-w-xl shadow-2xl rounded-2xl p-6 bg-white space-y-4 max-h-[90dvh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div class="flex items-center gap-2.5">
            <div class="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200">
              <Pencil class="size-4.5" />
            </div>
            <div>
              <h3 class="font-display font-extrabold text-lg text-[#1c1917] leading-tight">
                {{ editModalTenant.name }}
              </h3>
              <p class="text-xs text-[#71717a]">
                Unit {{ editModalTenant.unitCode }} · Resident Profile &amp; Assignment
              </p>
            </div>
          </div>
          <button @click="editModalTenant = null" class="p-1 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <!-- Section 1: Resident Information Profile Card -->
        <div class="rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-4 space-y-3">
          <div class="flex items-center justify-between border-b border-[#e7e5e4]/70 pb-2">
            <span class="font-bold text-[11px] uppercase tracking-wider text-[#71717a]">
              Resident Profile
            </span>
            <span :class="[
              'badge-soft text-xs font-bold',
              editModalTenant.status === 'active' ? 'badge-success' : 'badge-neutral'
            ]">
              {{ editModalTenant.status === 'active' ? 'Active Resident' : 'Past / Vacated' }}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p class="text-[10px] uppercase font-bold text-[#71717a]">Phone</p>
              <p class="font-mono text-xs text-[#1c1917] mt-0.5">{{ editModalTenant.phone }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase font-bold text-[#71717a]">Email</p>
              <p class="text-xs text-[#1c1917] truncate mt-0.5" :title="editModalTenant.email">{{ editModalTenant.email }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase font-bold text-[#71717a]">Deposit Held</p>
              <p class="font-display font-bold text-xs text-[#1c1917] mt-0.5">{{ peso(editModalTenant.depositAmount) }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase font-bold text-[#71717a]">Move-In Date</p>
              <p class="text-xs text-[#1c1917] mt-0.5">{{ editModalTenant.moveInDate }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase font-bold text-[#71717a]">Anniversary</p>
              <p class="text-xs text-[#1c1917] mt-0.5">{{ editModalTenant.anniversary }}</p>
            </div>
            <div>
              <p class="text-[10px] uppercase font-bold text-[#71717a]">Emergency Contact</p>
              <p class="text-xs text-[#1c1917] mt-0.5 truncate" :title="editModalTenant.emergencyContact.name + ' (' + editModalTenant.emergencyContact.phone + ')'">
                {{ editModalTenant.emergencyContact.name }}
              </p>
              <p class="font-mono text-[10px] text-[#71717a]">{{ editModalTenant.emergencyContact.phone }}</p>
            </div>
          </div>
        </div>

        <!-- Section 2: Edit Assignment & Roommate Details -->
        <form @submit.prevent="saveEdit" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Target Unit</label>
              <select v-model="editUnitCode" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white font-bold" required>
                <option v-for="u in CANONICAL_32_UNITS" :key="u.unitCode" :value="u.unitCode.toUpperCase()">
                  {{ u.unitCode.toUpperCase() }} — {{ u.cluster }} ({{ peso(u.basePrice) }})
                </option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Account Status</label>
              <select v-model="editStatus" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
                <option value="active">Active</option>
                <option value="vacated">Vacated (Pending)</option>
              </select>
            </div>
          </div>

          <!-- Roommate Options -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e7e5e4]">
            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Has Roommate?</label>
              <select v-model="editHasRoommates" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
                <option value="no">No (Solo Resident)</option>
                <option value="yes">Yes (With Roommates)</option>
              </select>
            </div>

            <div v-if="editHasRoommates === 'yes'">
              <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Roommate Qty</label>
              <input v-model.number="editRoommateQty" type="number" min="1" max="8" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-bold bg-[#fafaf9]" required />
            </div>
            <div v-else class="flex items-end">
              <p class="text-xs text-[#71717a] pb-2.5">Solo resident headcount.</p>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
            <span class="font-medium">Total Registered Occupants:</span>
            <strong class="font-display font-extrabold text-sm">
              {{ editHasRoommates === 'yes' ? 1 + (Number(editRoommateQty) || 1) : 1 }} Headcount (₱{{ (editHasRoommates === 'yes' ? 1 + (Number(editRoommateQty) || 1) : 1) * 200 }}/mo water fee)
            </strong>
          </div>

          <!-- Actions Footer (Vacate on Left, Cancel & Save on Right) -->
          <div class="pt-3 border-t border-[#e7e5e4] flex items-center justify-between gap-3">
            <button 
              type="button" 
              @click="openVacateFromModal(editModalTenant)" 
              class="btn-danger"
            >
              <LogOut class="size-3.5" />
              <span>Vacate Unit</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" @click="editModalTenant = null" class="btn-secondary">
                Cancel
              </button>
              <button type="submit" :disabled="isSubmitting" class="btn-primary">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
                <Check v-else class="size-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
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
          <button type="button" @click="vacateModalTenant = null" class="btn-secondary">Cancel</button>
          <button type="button" :disabled="isSubmitting" @click="confirmVacate" class="btn-danger-solid">
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

          <!-- Roommate Options -->
          <div>
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Has Roommate?</label>
            <select v-model="newHasRoommates" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm bg-white" required>
              <option value="no">No (Solo Resident)</option>
              <option value="yes">Yes (With Roommates)</option>
            </select>
          </div>

          <div v-if="newHasRoommates === 'yes'">
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Roommate Qty</label>
            <input v-model.number="newRoommateQty" type="number" min="1" max="8" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm font-bold bg-[#fafaf9]" required />
          </div>
          <div v-else class="flex items-end">
            <p class="text-xs text-[#71717a] pb-3">Resident will occupy unit alone (1 Headcount).</p>
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
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Emergency Contact Name (Optional)</label>
            <input v-model="newEmergName" placeholder="Maria Santos (optional)" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block font-bold text-[11px] uppercase tracking-wider text-[#71717a] mb-1">Emergency Contact Phone (Optional)</label>
            <input v-model="newEmergPhone" placeholder="0928-000-0000 (optional)" class="min-h-11 w-full px-3.5 border border-[#e7e5e4] rounded-xl text-sm" />
          </div>

          <!-- Concluded Summary Banner (Positioned directly above modal action buttons) -->
          <div class="sm:col-span-2 p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 text-xs flex items-center justify-between shadow-2xs">
            <div class="flex items-center gap-2">
              <span class="size-2 rounded-full bg-[#0c66e4]"></span>
              <span class="font-medium">Total Registered Headcount:</span>
            </div>
            <strong class="font-display font-extrabold text-sm text-[#0c66e4]">
              {{ newHasRoommates === 'yes' ? 1 + (Number(newRoommateQty) || 1) : 1 }} Pax · ₱{{ (newHasRoommates === 'yes' ? 1 + (Number(newRoommateQty) || 1) : 1) * 200 }}/mo water fee
            </strong>
          </div>

          <div class="sm:col-span-2 pt-2 flex justify-end gap-2.5">
            <button type="button" @click="isOnboardModalOpen = false" class="btn-secondary">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
              <span>Onboard Tenant</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
