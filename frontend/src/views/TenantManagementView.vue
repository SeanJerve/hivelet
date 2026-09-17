<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { tenants, fetchTenants as fetchTenantsState, fetchRooms, rooms, roomsFetchFailed, showToast, type TenantRecord } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Search, UserPlus, Pencil, LogOut, RefreshCw, Loader2, Users, Check } from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import StatusPill from '@/components/overview/StatusPill.vue';

const route = useRoute();
const q = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);
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

type StatusFilter = 'all' | 'active' | 'vacated' | 'prospect';

const statusFilter = ref<StatusFilter>('all');

/**
 * The ways of looking at the list, each carrying its own count. Prospects only
 * appear as a choice when there is at least one, because a chip reading zero is
 * a question nobody asked.
 */
const filterChips = computed<{ key: StatusFilter; label: string; count: number }[]>(() => [
  { key: 'all', label: 'Everyone', count: tenants.length },
  { key: 'active', label: 'Living here', count: activeCount.value },
  { key: 'vacated', label: 'Moved out', count: vacatedCount.value },
  ...(prospectCount.value
    ? [{ key: 'prospect' as const, label: 'Prospects', count: prospectCount.value }]
    : []),
]);

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

/**
 * `systemState` fills a missing emergency contact with an em dash rather than
 * leaving it blank, so a falsy test never fires and the dialog printed a dash
 * where it meant to say nobody is on file.
 */
function onFile(value: string | null | undefined) {
  const v = (value ?? '').trim();
  return v && v !== '—' && v !== '-' ? v : null;
}

/**
 * The household in words. BR-014 bills water by headcount, so the number of
 * people is the fact worth reading, not a yes/no badge.
 */
function householdLabel(t: TenantRecord) {
  const mates = t.roommateQty ?? Math.max(0, (t.occupants || 1) - 1);
  if (mates === 0) return 'Lives alone';
  return mates === 1 ? 'With 1 roommate' : `With ${mates} roommates`;
}

/** A prospect is not a resident. The three states each get their own words. */
function standing(t: TenantRecord): { label: string; tone: 'paid' | 'verify' | 'neutral' } {
  if (t.role === 'prospect') return { label: 'Prospect', tone: 'verify' };
  if (t.status === 'active') return { label: 'Living here', tone: 'paid' };
  return { label: 'Moved out', tone: 'neutral' };
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
  <div class="ws-focus space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          Residents
        </h1>
        <p class="mt-1 text-sm leading-6 text-ink-soft">
          {{ residentCount }} on record<span v-if="prospectCount">, and {{ prospectCount }} prospect<span v-if="prospectCount > 1">s</span> with no unit yet</span>.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          class="icon-btn size-11"
          :disabled="isLoading"
          aria-label="Load the directory again"
          @click="fetchTenants"
        >
          <RefreshCw :class="['size-4', isLoading && 'animate-spin']" aria-hidden="true" />
        </button>

        <button type="button" class="pill-btn-brand" @click="isOnboardModalOpen = true">
          <UserPlus class="size-4" aria-hidden="true" />
          <span>Move someone in</span>
        </button>
      </div>
    </div>

    <!-- Search and the four ways of looking at the list -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative lg:max-w-sm lg:flex-1">
        <Search
          class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <label for="resident-search" class="sr-only">Search residents</label>
        <input
          id="resident-search"
          v-model="q"
          type="search"
          placeholder="Name, unit, phone or email"
          class="ws-input w-full pl-11"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Show">
        <button
          v-for="chip in filterChips"
          :key="chip.key"
          type="button"
          :aria-pressed="statusFilter === chip.key"
          :class="[
            'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
            statusFilter === chip.key
              ? 'bg-ink text-canvas'
              : 'bg-tile text-ink-soft hover:text-ink',
          ]"
          @click="statusFilter = chip.key"
        >
          {{ chip.label }}
          <span
            :class="[
              'tabular text-xs font-semibold',
              statusFilter === chip.key ? 'text-on-night-soft' : 'text-ink-faint',
            ]"
            >{{ chip.count }}</span
          >
        </button>
      </div>
    </div>

    <SkeletonTable v-if="isLoading" :columns="6" :rows="6" />

    <div v-else-if="rows.length === 0" class="rounded-tile bg-tile px-6 py-16 text-center">
      <Users class="mx-auto size-8 text-ink-faint" aria-hidden="true" />
      <p class="mt-3 text-base font-semibold text-ink">Nobody matches</p>
      <p class="mt-1 text-sm leading-6 text-ink-soft">
        Nothing on this list answers to
        <span v-if="q">“{{ q }}”</span><span v-else>this filter</span>.
      </p>
    </div>

    <template v-else>
      <!--
        A register on a wide screen, a record per tile on a narrow one. It used
        to be one table 1,000px wide at every size, so a laptop and every phone
        scrolled sideways to reach the status and the Edit button.

        The email and the emergency contact are no longer columns. Both are in
        the edit dialog, where the whole record is, and search still reads the
        email. Seven columns of three-line cells was the reason this needed
        1,000px in the first place.
      -->
      <div class="hidden overflow-hidden rounded-tile bg-tile lg:block">
        <div class="ws-table-wrap max-h-[70vh]">
          <table class="ws-table">
            <caption class="sr-only">
              Residents, with unit, household, move-in date, advance rent and status
            </caption>
            <thead>
              <tr>
                <th scope="col">Resident</th>
                <th scope="col">Unit</th>
                <th scope="col">Household</th>
                <th scope="col">Moved in</th>
                <th scope="col" class="num">Advance rent</th>
                <th scope="col">Standing</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in rows" :key="t.id">
                <th scope="row">
                  <span class="block font-semibold text-ink">{{ t.name }}</span>
                  <span class="tabular block text-xs font-normal text-ink-soft">{{ t.phone }}</span>
                </th>
                <td class="font-semibold uppercase text-ink">{{ t.unitCode }}</td>
                <td>{{ householdLabel(t) }}</td>
                <td>{{ t.moveInDate }}</td>
                <td class="num font-semibold text-ink">{{ peso(t.depositAmount) }}</td>
                <td>
                  <StatusPill :tone="standing(t).tone">{{ standing(t).label }}</StatusPill>
                </td>
                <td class="num">
                  <button type="button" class="pill-btn" @click="openEdit(t)">
                    <Pencil class="size-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-3 lg:hidden">
        <div v-for="t in rows" :key="t.id" class="rounded-tile bg-tile p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-base font-semibold leading-snug text-ink">{{ t.name }}</p>
              <p class="tabular mt-0.5 text-sm text-ink-soft">{{ t.phone }}</p>
            </div>
            <StatusPill :tone="standing(t).tone">{{ standing(t).label }}</StatusPill>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt class="text-xs text-ink-faint">Unit</dt>
              <dd class="font-semibold uppercase text-ink">{{ t.unitCode }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Household</dt>
              <dd class="text-ink">{{ householdLabel(t) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Moved in</dt>
              <dd class="text-ink">{{ t.moveInDate }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Advance rent</dt>
              <dd class="tabular font-semibold text-ink">{{ peso(t.depositAmount) }}</dd>
            </div>
          </dl>

          <button type="button" class="pill-btn mt-4 w-full justify-center" @click="openEdit(t)">
            <Pencil class="size-3.5" aria-hidden="true" />
            <span>Edit this record</span>
          </button>
        </div>
      </div>
    </template>

    <!-- The whole record, and the parts of it that can be changed here -->
    <WsModal
      v-if="editModalTenant"
      :title="editModalTenant.name"
      size="lg"
      :dismissible="false"
      @close="editModalTenant = null"
    >
        <div class="rounded-2xl bg-canvas p-5">
          <div class="flex items-start justify-between gap-3 border-b border-line pb-3">
            <p class="text-sm font-semibold text-ink">On record</p>
            <StatusPill :tone="standing(editModalTenant).tone">
              {{ standing(editModalTenant).label }}
            </StatusPill>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs text-ink-faint">Phone</dt>
              <dd class="tabular mt-0.5 text-ink">{{ editModalTenant.phone }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-ink-faint">Email</dt>
              <dd class="mt-0.5 truncate text-ink" :title="editModalTenant.email">
                {{ editModalTenant.email || 'None on file' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Advance rent</dt>
              <dd class="tabular mt-0.5 font-semibold text-ink">
                {{ peso(editModalTenant.depositAmount) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Moved in</dt>
              <dd class="mt-0.5 text-ink">{{ editModalTenant.moveInDate }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ink-faint">Anniversary</dt>
              <dd class="mt-0.5 text-ink">{{ editModalTenant.anniversary }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs text-ink-faint">In an emergency</dt>
              <dd class="mt-0.5 truncate text-ink">
                {{ onFile(editModalTenant.emergencyContact.name) ?? 'Nobody on file' }}
              </dd>
              <dd
                v-if="onFile(editModalTenant.emergencyContact.phone)"
                class="tabular truncate text-xs text-ink-soft"
              >
                {{ editModalTenant.emergencyContact.phone }}
              </dd>
            </div>
          </dl>
        </div>

        <form @submit.prevent="saveEdit" class="mt-6 space-y-5">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="ws-field">
              <label for="edit-unit">Unit</label>
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
              <select id="edit-unit" v-model="editUnitCode" class="ws-select w-full" required>
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
              <p v-if="editUnitCode === '—'" class="ws-hint">
                This resident holds no unit. Pick one to assign them, or save to change the
                other details and leave them unassigned.
              </p>
            </div>

            <div class="ws-field">
              <label for="edit-status">Standing</label>
              <select id="edit-status" v-model="editStatus" class="ws-select w-full" required>
                <option value="active">Living here</option>
                <option value="vacated">Moved out</option>
              </select>
            </div>

            <div class="ws-field">
              <label for="edit-roommates">Sharing the unit</label>
              <select
                id="edit-roommates"
                v-model="editHasRoommates"
                class="ws-select w-full"
                required
              >
                <option value="no">Lives alone</option>
                <option value="yes">With roommates</option>
              </select>
            </div>

            <div v-if="editHasRoommates === 'yes'" class="ws-field">
              <label for="edit-roommate-qty">How many roommates</label>
              <input
                id="edit-roommate-qty"
                v-model.number="editRoommateQty"
                type="number"
                min="1"
                max="8"
                class="ws-input w-full"
                required
              />
            </div>
          </div>

          <!-- What the headcount means for the water bill, stated as a sentence. -->
          <p class="rounded-2xl bg-canvas px-4 py-3 text-sm leading-6 text-ink-soft">
            <strong class="font-semibold text-ink">{{
              editHasRoommates === 'yes' ? 1 + (Number(editRoommateQty) || 1) : 1
            }}</strong>
            in the unit, so water is
            <strong class="tabular font-semibold text-ink"
              >₱{{ (editHasRoommates === 'yes' ? 1 + (Number(editRoommateQty) || 1) : 1) * 200 }}</strong
            >
            a month.
          </p>

          <div
            class="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              class="pill-btn-danger-quiet"
              @click="openVacateFromModal(editModalTenant)"
            >
              <LogOut class="size-3.5" aria-hidden="true" />
              <span>Move them out</span>
            </button>

            <div class="flex items-center justify-end gap-2">
              <button type="button" class="pill-btn" @click="editModalTenant = null">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" aria-hidden="true" />
                <Check v-else class="size-3.5" aria-hidden="true" />
                <span>Save the changes</span>
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

        <form @submit.prevent="handleOnboard" class="grid gap-5 sm:grid-cols-2">
          <div class="ws-field">
            <label for="new-name">Full name</label>
            <input
              id="new-name"
              v-model="newName"
              placeholder="Juan Dela Cruz"
              class="ws-input w-full"
              required
            />
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
          <div class="ws-field">
            <label for="new-email">Email, if they have one</label>
            <input
              id="new-email"
              v-model="newEmail"
              type="email"
              placeholder="you@email.com"
              class="ws-input w-full"
            />
            <p class="ws-hint">Leave this blank and they sign in with their phone number.</p>
          </div>
          <div class="ws-field">
            <label for="new-phone">Phone</label>
            <input
              id="new-phone"
              v-model="newPhone"
              placeholder="0917-000-0000"
              class="ws-input w-full"
              required
            />
            <p class="ws-hint">This is what they sign in with.</p>
          </div>
          <div class="ws-field">
            <label for="new-unit">Unit</label>
            <select id="new-unit" v-model="newUnit" class="ws-select w-full" required>
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

          <div class="ws-field">
            <label for="new-sharing">Sharing the unit</label>
            <select id="new-sharing" v-model="newHasRoommates" class="ws-select w-full" required>
              <option value="no">Living alone</option>
              <option value="yes">With roommates</option>
            </select>
          </div>

          <div v-if="newHasRoommates === 'yes'" class="ws-field">
            <label for="new-roommate-qty">How many roommates</label>
            <input
              id="new-roommate-qty"
              v-model.number="newRoommateQty"
              type="number"
              min="1"
              max="8"
              class="ws-input w-full"
              required
            />
          </div>
          <div v-else class="hidden sm:block" aria-hidden="true" />

          <div class="ws-field">
            <label for="new-move-in">Move-in date</label>
            <input id="new-move-in" v-model="newMoveIn" type="date" class="ws-input w-full" required />
          </div>
          <div class="ws-field">
            <label for="new-anniversary">Anniversary date</label>
            <input
              id="new-anniversary"
              v-model="newAnniv"
              type="date"
              class="ws-input w-full"
              required
            />
            <p class="ws-hint">The date their year is counted from.</p>
          </div>
          <div class="ws-field">
            <!-- OD-04: this sum is ADVANCE RENT. This business collects no separate
                 refundable security deposit, and calling it one described a financial
                 instrument the property does not use. -->
            <label for="new-advance">Advance rent</label>
            <input
              id="new-advance"
              v-model.number="newDeposit"
              type="number"
              class="ws-input w-full"
              required
            />
            <p class="ws-hint">One month, filled in from the unit's current rate. Change it if she agreed something else.</p>
          </div>
          <div class="ws-field">
            <label for="new-emerg-name">In an emergency, who to call</label>
            <input
              id="new-emerg-name"
              v-model="newEmergName"
              placeholder="Maria Santos"
              class="ws-input w-full"
            />
          </div>
          <div class="ws-field sm:col-span-2">
            <label for="new-emerg-phone">Their phone number</label>
            <input
              id="new-emerg-phone"
              v-model="newEmergPhone"
              placeholder="0928-000-0000"
              class="ws-input w-full"
            />
          </div>

          <p class="rounded-2xl bg-canvas px-4 py-3 text-sm leading-6 text-ink-soft sm:col-span-2">
            <strong class="font-semibold text-ink">{{
              newHasRoommates === 'yes' ? 1 + (Number(newRoommateQty) || 1) : 1
            }}</strong>
            in the unit, so water is
            <strong class="tabular font-semibold text-ink"
              >₱{{ (newHasRoommates === 'yes' ? 1 + (Number(newRoommateQty) || 1) : 1) * 200 }}</strong
            >
            a month.
          </p>

          <div class="flex justify-end gap-2 border-t border-line pt-5 sm:col-span-2">
            <button type="button" class="pill-btn" @click="isOnboardModalOpen = false">Cancel</button>
            <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" aria-hidden="true" />
              <span>Move them in</span>
            </button>
          </div>
        </form>
    </WsModal>
  </div>
</template>
