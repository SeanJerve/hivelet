<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { tenants, fetchTenants as fetchTenantsState, fetchRooms, rooms, roomsFetchFailed, showToast, type TenantRecord } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Search, UserPlus, Eye, Pencil, LogOut, X, AlertTriangle, RefreshCw, Loader2, Users, User, Check, ShieldCheck, Clock, TrendingUp } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';

const route = useRoute();
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
// BR-039: the advance rent equals the rent in effect at move-in. It is pre-filled
// from the unit's LIVE price the moment a unit is chosen (see the watcher below),
// so the administrator sees and confirms the figure rather than the API
// substituting one. It started at a flat 9,000, which belonged to no unit.
const newDeposit = ref(0);
const newHasRoommates = ref<'no' | 'yes'>('no');
const newRoommateQty = ref<number>(1);
const newEmergName = ref('');
const newEmergPhone = ref('');

// Edit Tenant Assignment Form
const editUnitCode = ref('');
const editStatus = ref<'active' | 'vacated'>('active');
const editHasRoommates = ref<'no' | 'yes'>('no');
const editRoommateQty = ref<number>(0);

/**
 * NOTE: a `checkAnnualEscalation()` helper used to live here, recommending a 2%
 * annual rent increase after 12 months of tenure. It has been removed.
 *
 * There is no 2% rule. It appears in no business rule and in neither Bible
 * document, and the owner confirmed on 2026-09-13 that she simply sets the rate
 * herself when she decides to change it. Errata E-18 and E-20 withdraw the
 * feature in full. Rate changes are recorded in `room_price_history` with the
 * administrator who made them and an effective date (ARCH-004) - the history is
 * kept, the automation never existed.
 */

/**
 * Pre-fills the advance rent from the selected unit's current price. BR-039.
 *
 * Reads the LIVE room list rather than the hardcoded CANONICAL_UNITS table, whose
 * `basePrice` is a second copy that drifts as soon as the landlady changes a rate.
 * The administrator can still overwrite it - this fills the field, it does not
 * decide the amount.
 */
function syncDepositToUnit() {
  const live = rooms.find((r) => r.unitCode.toLowerCase() === newUnit.value.toLowerCase());
  if (live && Number(live.price) > 0) {
    newDeposit.value = Number(live.price);
  }
}

function checkInquiryConversion() {
  if (route.query.convertInquiryId) {
    newName.value = String(route.query.name || '');
    newPhone.value = String(route.query.phone || '');
    newEmail.value = String(route.query.email || '');
    if (route.query.unit) {
      newUnit.value = String(route.query.unit).toLowerCase();
    }
    syncDepositToUnit();
    isOnboardModalOpen.value = true;
    showToast('info', 'Inquiry Pre-filled', `Details loaded from prospect inquiry for ${newName.value}.`);
  }
}

async function fetchTenants() {
  isLoading.value = true;
  try {
    await fetchTenantsState();
    await fetchRooms();
  } catch (err) {
    console.error('fetchTenants failed:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTenants();
  checkInquiryConversion();
});

watch(newUnit, syncDepositToUnit);

watch(() => route.query.convertInquiryId, () => {
  checkInquiryConversion();
});

const statusFilter = ref<'all' | 'active' | 'vacated' | 'prospect'>('all');

/**
 * A prospect is not a resident, and this page used to say she was.
 *
 * `/admin/tenants` returns `.in('role', ['tenant', 'prospect'])` on purpose, so an enquirer
 * promoted to a profile shows up here before any unit is assigned. Nothing distinguished
 * them: the header read "44 residents currently on record" when 43 are residents and one is
 * a prospect, the Active chip counted her among the residents paying rent, and her row wore
 * the same green Active badge. With 33 units on the property, a headcount that is quietly
 * one too high is the kind of number someone checks.
 */
const residentCount = computed(() => tenants.filter(t => t.role === 'tenant').length);
const prospectCount = computed(() => tenants.filter(t => t.role === 'prospect').length);

const activeCount = computed(
  () => tenants.filter(t => t.role === 'tenant' && t.status === 'active').length
);
const vacatedCount = computed(
  () => tenants.filter(t => t.role === 'tenant' && (t.status === 'vacated' || t.status === 'notice')).length
);

const rows = computed(() => {
  const query = q.value.toLowerCase().trim();
  return tenants.filter((t) => {
    // Every chip but "All" is about residents, so a prospect answers only her own.
    const matchesFilter =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'prospect' && t.role === 'prospect') ||
      (statusFilter.value === 'active' && t.role === 'tenant' && t.status === 'active') ||
      (statusFilter.value === 'vacated' && t.role === 'tenant' && (t.status === 'vacated' || t.status === 'notice'));

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

    /**
     * `roomNumber` is omitted when no unit is selected, rather than sent as "—".
     *
     * The API treats `roomNumber !== undefined` as "the assignment is being changed": it
     * closes the tenant's active tenancy and frees the unit FIRST, and only then reads the
     * value - where "—" and "none" are its sentinels for *leave them unassigned*. Sending the
     * sentinel from a form whose real subject is the occupant count would therefore end a
     * tenancy as a side effect. Omitting the key skips that whole branch, so editing status
     * or roommates leaves the tenancy exactly where it was.
     */
    const payload: Record<string, unknown> = {
      accountStatus: editStatus.value === 'active' ? 'active' : 'inactive',
      occupantCount: finalOccupants,
      roommateQty: finalRoommateQty,
    };
    if (editUnitCode.value && editUnitCode.value !== '—') {
      payload.roomNumber = editUnitCode.value.toUpperCase();
    }

    await api.patch(`/admin/tenants/${editModalTenant.value.id}`, payload);

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

    const created = await api.post<{ id: string }>('/admin/tenants', {
      fullName: newName.value.trim(),
      email: newEmail.value.trim(),
      phone: newPhone.value.trim(),
      roomNumber: newUnit.value.toUpperCase(),
      moveInDate: newMoveIn.value,
      // A blank field is sent blank. The API takes all three as optional and
      // stores NULL, so there is no reason to invent values here - and these were
      // written to the live record as fact: a 9,000 advance rent the landlady
      // never entered, an emergency contact literally named "Emergency Contact"
      // with "-" for a phone number, and an occupation of "Resident" for everyone.
      depositAmount: Number(newDeposit.value) || 0,
      occupantCount: finalOccupants,
      roommateQty: finalRoommateQty,
      emergencyContactName: newEmergName.value.trim(),
      emergencyContactPhone: newEmergPhone.value.trim(),
    });

    /**
     * BR-009 - close the loop on the lead this came from.
     *
     * The inquiry's details were carried into this form, but nothing was ever
     * written back: the lead stayed `Pending` in the inbox indefinitely and
     * `inquiries.converted_tenant_id` - a column that has existed since the
     * original schema - was never set by anything, so no record connected a
     * tenancy to the enquiry that produced it.
     *
     * Not fatal if it fails. The tenant exists either way, and re-running the
     * onboarding to fix a lead's status would create a duplicate person.
     */
    const inquiryId = route.query.convertInquiryId;
    if (inquiryId && created?.id) {
      try {
        await api.patch(`/admin/inquiries/${inquiryId}`, {
          status: 'Converted',
          convertedTenantId: created.id,
        });
      } catch (err: any) {
        showToast(
          'info',
          'Tenant onboarded',
          `${newName.value} was added, but the inquiry could not be marked Converted. ` +
            'Set it from the Inquiries page.'
        );
      }
    }

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
    <div class="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex items-center gap-2 text-xs text-ink-soft mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-semibold text-ink">Active Tenants</span>
        </div>
        <h1 class="text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          Active Tenant Directory
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-ink-soft">
          {{ residentCount }} residents currently on record<span v-if="prospectCount">, plus {{ prospectCount }} prospect<span v-if="prospectCount > 1">s</span> not yet assigned a unit</span>.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          @click="fetchTenants"
          :disabled="isLoading"
          class="pill-btn"
        >
          <RefreshCw :class="['size-3.5 text-ink-soft', isLoading ? 'animate-spin' : '']" />
          <span>Refresh</span>
        </button>

        <button 
          @click="isOnboardModalOpen = true"
          class="pill-btn-brand"
        >
          <UserPlus class="size-3.5 text-white" />
          <span>Onboard Tenant</span>
        </button>
      </div>
    </div>

    <!-- Section Card with Search & Tenant Table -->
    <div class="rounded-tile bg-tile overflow-hidden">
      <!-- Search Bar & Filters -->
      <div class="border-b border-line p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-tile">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            v-model="q"
            type="text"
            placeholder="Search name, unit or phone…"
            class="ws-input w-full pl-10 pr-4 sm:text-sm"
          />
        </div>

        <div class="h-10 inline-flex items-center gap-1 self-start sm:self-auto bg-canvas p-1 border border-line rounded-xl text-xs">
          <button
            type="button"
            @click="statusFilter = 'all'"
            :class="[ 'h-8 px-3 rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center', statusFilter === 'all' ? 'bg-tile text-brand ' : 'text-ink-soft hover:text-ink' ]"
          >
            All ({{ tenants.length }})
          </button>
          <button
            type="button"
            @click="statusFilter = 'active'"
            :class="[ 'h-8 px-3 rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center', statusFilter === 'active' ? 'bg-tile text-brand ' : 'text-ink-soft hover:text-ink' ]"
          >
            Active ({{ activeCount }})
          </button>
          <button
            type="button"
            @click="statusFilter = 'vacated'"
            :class="[ 'h-8 px-3 rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center', statusFilter === 'vacated' ? 'bg-tile text-brand ' : 'text-ink-soft hover:text-ink' ]"
          >
            Past / Vacated ({{ vacatedCount }})
          </button>
          <button
            v-if="prospectCount"
            type="button"
            @click="statusFilter = 'prospect'"
            :class="[ 'h-8 px-3 rounded-lg font-semibold transition-colors cursor-pointer inline-flex items-center', statusFilter === 'prospect' ? 'bg-tile text-brand ' : 'text-ink-soft hover:text-ink' ]"
          >
            Prospects ({{ prospectCount }})
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
          <thead class="sticky top-0 z-10 bg-canvas">
            <tr class="text-left text-xs uppercase tracking-wide text-ink-soft border-b border-line">
              <th class="whitespace-nowrap px-4 py-3 font-semibold">RESIDENT</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">ROOMMATES</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">EMERGENCY CONTACT</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">MOVE-IN</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">DEPOSIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="t in rows" 
              :key="t.id"
              class="border-b border-line last:border-0 hover:bg-canvas transition-colors"
            >
              <!-- RESIDENT (Name + Email + Phone stacked for compact layout) -->
              <td class="px-4 py-3.5">
                <p class="font-semibold text-ink">{{ t.name }}</p>
                <p class="text-xs text-ink-soft">{{ t.email }}</p>
                <p class="tabular font-mono text-xs text-ink-soft mt-0.5">{{ t.phone }}</p>
              </td>

              <!-- UNIT -->
              <td class="px-4 py-3.5 font-semibold uppercase text-ink">
                {{ t.unitCode }}
              </td>

              <!-- ROOMMATES (BR-014 Water Billing & Headcount Rule) -->
              <td class="whitespace-nowrap px-4 py-3.5">
                <span 
                  v-if="(t.roommateQty ?? (t.occupants - 1)) > 0"
                  class="badge-soft badge-blue text-xs font-semibold"
                >
                  Yes ({{ t.roommateQty ?? (t.occupants - 1) }} {{ (t.roommateQty ?? (t.occupants - 1)) === 1 ? 'roommate' : 'roommates' }})
                </span>
                <span 
                  v-else 
                  class="badge-soft badge-neutral text-xs font-semibold"
                >
                  Solo (1 Pax)
                </span>
              </td>

              <!-- EMERGENCY CONTACT -->
              <td class="whitespace-nowrap px-4 py-3.5">
                <p class="text-ink font-medium">{{ t.emergencyContact.name }}</p>
                <p class="tabular font-mono text-xs text-ink-soft">{{ t.emergencyContact.phone }}</p>
              </td>

              <!-- MOVE-IN -->
              <td class="whitespace-nowrap px-4 py-3.5 text-ink-soft">
                {{ t.moveInDate }}
              </td>

              <!-- DEPOSIT -->
              <td class="tabular whitespace-nowrap px-4 py-3.5 font-semibold text-ink">
                {{ peso(t.depositAmount) }}
              </td>

              <!-- STATUS -->
              <td class="px-4 py-3.5">
                <span 
                  :class="[ 'badge-soft text-xs font-semibold', t.role === 'prospect' ? 'badge-info' : (t.status === 'active' ? 'badge-success' : 'badge-neutral') ]"
                >
                  {{ t.role === 'prospect' ? 'Prospect' : (t.status === 'active' ? 'Active' : 'Vacated') }}
                </span>
              </td>

              <!-- ACTIONS (Compact Single Edit button opening Profile & Edit & Vacate) -->
              <td class="whitespace-nowrap px-4 py-3.5 text-right">
                <button 
                  @click="openEdit(t)"
                  class="pill-btn min-h-8 px-3 py-1 text-xs gap-1.5 inline-flex items-center font-semibold cursor-pointer hover:border-brand hover:text-brand"
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
    <WsModal
      v-if="editModalTenant"
      title="Edit tenant"
      size="lg"
      :dismissible="false"
      @close="editModalTenant = null"
    >

        <!-- Section 1: Resident Information Profile Card -->
        <div class="rounded-xl border border-line bg-canvas p-4 space-y-3">
          <div class="flex items-center justify-between border-b border-line/70 pb-2">
            <span class="font-semibold text-xs text-ink-soft">
              Resident Profile
            </span>
            <span :class="[ 'badge-soft text-xs font-semibold', editModalTenant.role === 'prospect' ? 'badge-info' : (editModalTenant.status === 'active' ? 'badge-success' : 'badge-neutral') ]">
              {{ editModalTenant.role === 'prospect'
                  ? 'Prospect — not yet a resident'
                  : (editModalTenant.status === 'active' ? 'Active Resident' : 'Past / Vacated') }}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p class="text-xs uppercase font-semibold text-ink-soft">Phone</p>
              <p class="font-mono text-xs text-ink mt-0.5">{{ editModalTenant.phone }}</p>
            </div>
            <div>
              <p class="text-xs uppercase font-semibold text-ink-soft">Email</p>
              <p class="text-xs text-ink truncate mt-0.5" :title="editModalTenant.email">{{ editModalTenant.email }}</p>
            </div>
            <div>
              <p class="text-xs uppercase font-semibold text-ink-soft">Deposit Held</p>
              <p class="font-semibold text-xs text-ink mt-0.5">{{ peso(editModalTenant.depositAmount) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase font-semibold text-ink-soft">Move-In Date</p>
              <p class="text-xs text-ink mt-0.5">{{ editModalTenant.moveInDate }}</p>
            </div>
            <div>
              <p class="text-xs uppercase font-semibold text-ink-soft">Anniversary</p>
              <p class="text-xs text-ink mt-0.5">{{ editModalTenant.anniversary }}</p>
            </div>
            <div>
              <p class="text-xs uppercase font-semibold text-ink-soft">Emergency Contact</p>
              <p class="text-xs text-ink mt-0.5 truncate" :title="editModalTenant.emergencyContact.name + ' (' + editModalTenant.emergencyContact.phone + ')'">
                {{ editModalTenant.emergencyContact.name }}
              </p>
              <p class="font-mono text-xs text-ink-soft">{{ editModalTenant.emergencyContact.phone }}</p>
            </div>
          </div>
        </div>

        <!-- Section 2: Edit Assignment & Roommate Details -->
        <form @submit.prevent="saveEdit" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-xs text-ink-soft mb-1">Target Unit</label>
              <!--
                `systemState` gives a tenant with no room assignment the unit code "—".
                That matched none of the options below, so the browser rendered this select
                EMPTY, and `required` then refused to submit the form - meaning the four
                active tenants who hold no assignment today could not have their status or
                roommate count edited at all without also being handed a unit.

                The state is now an option of its own, so it displays honestly and the form
                submits. It is `disabled`: a tenant who HAS a unit cannot be un-assigned from
                this dropdown, because releasing a unit is what the Settle Vacancy button is
                for and that path also closes the tenancy properly. A disabled option can
                still be the selected one, and its value is non-empty, so `required` is
                satisfied.
              -->
              <select v-model="editUnitCode" class="ws-select w-full" required>
                <option value="—" disabled>No unit assigned</option>
                <!--
                  Reads the LIVE list. This iterated CANONICAL_UNITS and printed `basePrice`
                  - the exact second copy the comment on `syncDepositToUnit` warns about, 550
                  lines above. 30 of the 33 seeded prices no longer match the database; the
                  worst is out by ₱1,900, and the seeded rent roll overstates the real one
                  by ₱28,800 a month.
                -->
                <option v-for="u in rooms" :key="u.unitCode" :value="u.unitCode.toUpperCase()">
                  {{ u.unitCode.toUpperCase() }} — {{ u.cluster }}<template v-if="!roomsFetchFailed"> ({{ peso(u.price) }})</template>
                </option>
              </select>
              <p v-if="editUnitCode === '—'" class="text-xs text-ink-soft mt-1">
                This resident holds no unit. Pick one to assign them, or save to change the
                other details and leave them unassigned.
              </p>
            </div>

            <div>
              <label class="block font-semibold text-xs text-ink-soft mb-1">Account Status</label>
              <select v-model="editStatus" class="ws-select w-full" required>
                <option value="active">Active</option>
                <option value="vacated">Vacated (Pending)</option>
              </select>
            </div>
          </div>

          <!-- Roommate Options -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line">
            <div>
              <label class="block font-semibold text-xs text-ink-soft mb-1">Has Roommate?</label>
              <select v-model="editHasRoommates" class="ws-select w-full" required>
                <option value="no">No (Solo Resident)</option>
                <option value="yes">Yes (With Roommates)</option>
              </select>
            </div>

            <div v-if="editHasRoommates === 'yes'">
              <label class="block font-semibold text-xs text-ink-soft mb-1">Roommate Qty</label>
              <input v-model.number="editRoommateQty" type="number" min="1" max="8" class="ws-input w-full" required />
            </div>
            <div v-else class="flex items-end">
              <p class="text-xs text-ink-soft pb-2.5">Solo resident headcount.</p>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-brand-soft/70 border border-brand-soft text-brand text-xs flex items-center justify-between">
            <span class="font-medium">Total Registered Occupants:</span>
            <strong class="font-semibold text-sm">
              {{ editHasRoommates === 'yes' ? 1 + (Number(editRoommateQty) || 1) : 1 }} Headcount (₱{{ (editHasRoommates === 'yes' ? 1 + (Number(editRoommateQty) || 1) : 1) * 200 }}/mo water fee)
            </strong>
          </div>

          <!-- Actions Footer (Vacate on Left, Cancel & Save on Right) -->
          <div class="pt-3 border-t border-line flex items-center justify-between gap-3">
            <button 
              type="button" 
              @click="openVacateFromModal(editModalTenant)" 
              class="pill-btn-danger-quiet"
            >
              <LogOut class="size-3.5" />
              <span>Vacate Unit</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" @click="editModalTenant = null" class="pill-btn">
                Cancel
              </button>
              <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
                <Check v-else class="size-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
    </WsModal>

    <!-- Vacate Confirm Dialog -->
    <ConfirmDialog
      v-if="vacateModalTenant"
      title="Settle and move out"
      confirm-label="Settle the vacancy"
      destructive
      :busy="isSubmitting"
      @cancel="vacateModalTenant = null"
      @confirm="confirmVacate"
    >
      <p class="text-sm leading-6 text-ink-soft">
        This closes the account of <strong class="text-ink">{{ vacateModalTenant.name }}</strong> and marks unit
        <strong class="text-ink">{{ vacateModalTenant.unitCode }}</strong> vacant. The deposit settlement is written
        to the record.
      </p>
    </ConfirmDialog>

    <!-- Onboard Tenant Modal -->
    <WsModal
      v-if="isOnboardModalOpen"
      title="Move a tenant in"
      subtitle="Creates the account and assigns the unit."
      size="lg"
      :dismissible="false"
      @close="isOnboardModalOpen = false"
    >

        <form @submit.prevent="handleOnboard" class="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <label class="block font-semibold text-xs text-ink-soft mb-1">Full Name</label>
            <input v-model="newName" placeholder="Juan Dela Cruz" class="ws-input w-full" required />
          </div>
          <!--
            Email is optional; the phone number is not.

            OD-09, client-confirmed 2026-09-13: "Do tenants need an email address to exist in
            the system? No." `profiles.email` has been nullable since migration 006 and the
            API schema stopped demanding one in 43c4608 - but this field kept `required`, so
            the administrator still could not submit the form without an address. The rule
            the database actually enforces is `profiles_login_identifier_required`: a profile
            holding a password must have an email OR a phone number. Phone stays required, so
            every tenant onboarded here has one identifier and can sign in.
          -->
          <div>
            <label class="block font-semibold text-xs text-ink-soft mb-1">
              Email <span class="font-semibold normal-case tracking-normal text-ink-soft/70">(optional)</span>
            </label>
            <input v-model="newEmail" type="email" placeholder="you@email.com" class="ws-input w-full" />
            <p class="text-xs text-ink-soft mt-1">Leave blank if they have none — they will sign in with their phone number.</p>
          </div>
          <div>
            <label class="block font-semibold text-xs text-ink-soft mb-1">Phone</label>
            <input v-model="newPhone" placeholder="0917-000-0000" class="ws-input w-full" required />
            <p class="text-xs text-ink-soft mt-1">Used to sign in to the tenant portal.</p>
          </div>
          <div>
            <label class="block font-semibold text-xs text-ink-soft mb-1">Target Unit</label>
            <select v-model="newUnit" class="ws-select w-full" required>
              <!--
                This one mattered most. `syncDepositToUnit` fills the deposit field from the
                LIVE price the moment a unit is picked, while this label showed the SEEDED
                one - so for unit 2B the dropdown read ₱6,500 and the deposit box ₱4,600,
                at the same time, with nothing failing.
              -->
              <option v-for="u in rooms" :key="u.unitCode" :value="u.unitCode">
                {{ u.unitCode.toUpperCase() }}<template v-if="!roomsFetchFailed"> — {{ peso(u.price) }}</template> ({{ u.cluster }})
              </option>
            </select>
          </div>

          <!-- Roommate Options -->
          <div>
            <label class="block font-semibold text-xs text-ink-soft mb-1">Has Roommate?</label>
            <select v-model="newHasRoommates" class="ws-select w-full" required>
              <option value="no">No (Solo Resident)</option>
              <option value="yes">Yes (With Roommates)</option>
            </select>
          </div>

          <div v-if="newHasRoommates === 'yes'">
            <label class="block font-semibold text-xs text-ink-soft mb-1">Roommate Qty</label>
            <input v-model.number="newRoommateQty" type="number" min="1" max="8" class="ws-input w-full" required />
          </div>
          <div v-else class="flex items-end">
            <p class="text-xs text-ink-soft pb-3">Resident will occupy unit alone (1 Headcount).</p>
          </div>

          <div>
            <label class="block font-semibold text-xs text-ink-soft mb-1">Move-in Date</label>
            <input v-model="newMoveIn" type="date" class="ws-input w-full" required />
          </div>
          <div>
            <label class="block font-semibold text-xs text-ink-soft mb-1">Anniversary Anchor Date</label>
            <input v-model="newAnniv" type="date" class="ws-input w-full" required />
          </div>
          <div>
            <!-- OD-04: this sum is ADVANCE RENT. This business collects no separate
                 refundable security deposit, and calling it one described a financial
                 instrument the property does not use. -->
            <label class="block font-semibold text-xs text-ink-soft mb-1">
              Advance Rent (₱)
              <span class="normal-case font-medium text-ink-faint">— one month, pre-filled from the unit's rate</span>
            </label>
            <input v-model.number="newDeposit" type="number" class="ws-input w-full" required />
          </div>
          <div>
            <label class="block font-semibold text-xs text-ink-soft mb-1">Emergency Contact Name (Optional)</label>
            <input v-model="newEmergName" placeholder="Maria Santos (optional)" class="ws-input w-full" />
          </div>
          <div class="sm:col-span-2">
            <label class="block font-semibold text-xs text-ink-soft mb-1">Emergency Contact Phone (Optional)</label>
            <input v-model="newEmergPhone" placeholder="0928-000-0000 (optional)" class="ws-input w-full" />
          </div>

          <!-- Concluded Summary Banner (Positioned directly above modal action buttons) -->
          <div class="sm:col-span-2 p-3.5 rounded-xl bg-brand-soft/80 border border-brand-soft text-brand text-xs flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="size-2 rounded-full bg-brand"></span>
              <span class="font-medium">Total Registered Headcount:</span>
            </div>
            <strong class="font-semibold text-sm text-brand">
              {{ newHasRoommates === 'yes' ? 1 + (Number(newRoommateQty) || 1) : 1 }} Pax · ₱{{ (newHasRoommates === 'yes' ? 1 + (Number(newRoommateQty) || 1) : 1) * 200 }}/mo water fee
            </strong>
          </div>

          <div class="sm:col-span-2 pt-2 flex justify-end gap-2.5">
            <button type="button" @click="isOnboardModalOpen = false" class="pill-btn">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
              <span>Onboard Tenant</span>
            </button>
          </div>
        </form>
    </WsModal>
  </div>
</template>
