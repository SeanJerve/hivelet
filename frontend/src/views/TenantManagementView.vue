<script setup lang="ts">
/**
 * @component TenantManagementView
 * @description Active Tenant Directory and Onboarding Management module for Hivelet.
 * @systemBibleRef Section 5.3 - tenant_profiles & room_assignments
 * @rationale Tracks individual tenant personal information, emergency contact details, move-in dates,
 *              and room assignments.
 * @innovations Supports individual move-in date tracking for grace-period-aware monthly billing logic.
 */
import { ref, computed, onMounted } from 'vue';
import { Search, UserPlus, UserMinus, X, KeyRound, Copy } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';
import { useAuthStore, type Profile } from '../stores/auth';
import { useToast } from '../lib/useToast';
import ConfirmModal from '../components/ui/ConfirmModal.vue';

interface MergedTenant extends Profile {
  assignmentId: string | null;
  roomId: string | null;
  roomNumber: string | null;
  moveInDate: string | null;
  occupantCount: number | null;
}

interface AvailableRoom {
  id: string;
  room_number: string;
}

const authStore = useAuthStore();
const { showToast } = useToast();

const tenants = ref<MergedTenant[]>([]);
const loading = ref(false);
const search = ref('');

const filteredTenants = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return tenants.value;
  return tenants.value.filter((t) =>
    t.full_name.toLowerCase().includes(q) ||
    (t.roomNumber ?? '').toLowerCase().includes(q) ||
    (t.phone_number ?? '').toLowerCase().includes(q) ||
    t.email.toLowerCase().includes(q)
  );
});

async function fetchTenants() {
  loading.value = true;
  try {
    const [{ data: profiles, error: profilesError }, { data: assignments, error: assignmentsError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'tenant').order('full_name'),
      supabase
        .from('room_assignments')
        .select('id, tenant_profile_id, room_id, start_date, occupant_count, rooms(room_number)')
        .eq('is_active', true),
    ]);

    if (profilesError) throw profilesError;
    if (assignmentsError) throw assignmentsError;

    const assignmentMap = new Map<string, any>();
    (assignments ?? []).forEach((a: any) => assignmentMap.set(a.tenant_profile_id, a));

    tenants.value = (profiles ?? []).map((p: any) => {
      const a = assignmentMap.get(p.id);
      const roomRel = Array.isArray(a?.rooms) ? a.rooms[0] : a?.rooms;
      return {
        ...p,
        assignmentId: a?.id ?? null,
        roomId: a?.room_id ?? null,
        roomNumber: roomRel?.room_number ?? null,
        moveInDate: a?.start_date ?? null,
        occupantCount: a?.occupant_count ?? null,
      } as MergedTenant;
    });
  } catch (err: any) {
    showToast('Failed to Load Tenants', err?.message || 'Could not fetch the tenant directory.', 'error');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchTenants);

// ---------------------------------------------------------------------------
// Onboard Tenant Modal
// ---------------------------------------------------------------------------
const showOnboardModal = ref(false);
const submitting = ref(false);
const availableRooms = ref<AvailableRoom[]>([]);
const loadingRooms = ref(false);

const emptyOnboardForm = () => ({
  email: '',
  fullName: '',
  phoneNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  occupation: '',
  roomId: '',
  startDate: new Date().toISOString().split('T')[0],
  occupantCount: 1,
  depositAmount: null as number | null,
});

const onboardForm = ref(emptyOnboardForm());

const lastTempPassword = ref<{ password: string; tenantName: string } | null>(null);

async function fetchAvailableRooms() {
  loadingRooms.value = true;
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, room_number')
      .eq('operational_status', 'Available')
      .order('room_number');
    if (error) throw error;
    availableRooms.value = data ?? [];
  } catch (err: any) {
    showToast('Failed to Load Rooms', err?.message || 'Could not fetch available rooms.', 'error');
  } finally {
    loadingRooms.value = false;
  }
}

function openOnboardModal() {
  onboardForm.value = emptyOnboardForm();
  showOnboardModal.value = true;
  fetchAvailableRooms();
}

function closeOnboardModal() {
  if (submitting.value) return;
  showOnboardModal.value = false;
}

async function submitOnboard() {
  if (submitting.value) return;

  if (!onboardForm.value.email.trim() || !onboardForm.value.fullName.trim() || !onboardForm.value.roomId || !onboardForm.value.startDate) {
    showToast('Missing Required Fields', 'Full name, email, room, and move-in date are required.', 'error');
    return;
  }

  submitting.value = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const payload: Record<string, unknown> = {
      email: onboardForm.value.email.trim(),
      fullName: onboardForm.value.fullName.trim(),
      phoneNumber: onboardForm.value.phoneNumber.trim() || undefined,
      emergencyContactName: onboardForm.value.emergencyContactName.trim() || undefined,
      emergencyContactPhone: onboardForm.value.emergencyContactPhone.trim() || undefined,
      occupation: onboardForm.value.occupation.trim() || undefined,
      roomId: onboardForm.value.roomId,
      startDate: onboardForm.value.startDate,
      occupantCount: onboardForm.value.occupantCount || 1,
    };

    const deposit = onboardForm.value.depositAmount;
    if (deposit !== null && deposit !== undefined && `${deposit}`.trim() !== '') {
      payload.depositAmount = Number(deposit);
    }

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/tenants/onboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (json.success) {
      lastTempPassword.value = { password: json.data.tempPassword, tenantName: onboardForm.value.fullName };
      showToast('Tenant Onboarded', `${onboardForm.value.fullName} was onboarded successfully. Share their temporary password securely.`, 'success', 8000);
      showOnboardModal.value = false;
      await fetchTenants();
    } else {
      showToast('Onboarding Failed', json.error?.message || 'Something went wrong. Please check the form and try again.', 'error');
    }
  } catch (err: any) {
    showToast('Onboarding Failed', err?.message || 'Could not reach the server. Please try again.', 'error');
  } finally {
    submitting.value = false;
  }
}

async function copyTempPassword() {
  if (!lastTempPassword.value) return;
  try {
    await navigator.clipboard.writeText(lastTempPassword.value.password);
    showToast('Copied', 'Temporary password copied to clipboard.', 'info', 2000);
  } catch {
    // Clipboard API unavailable — password is still visible in the panel.
  }
}

// ---------------------------------------------------------------------------
// Deactivate Tenant (BR-025)
// ---------------------------------------------------------------------------
const showDeactivateModal = ref(false);
const deactivateTarget = ref<MergedTenant | null>(null);
const deactivating = ref(false);

function openDeactivateModal(t: MergedTenant) {
  deactivateTarget.value = t;
  showDeactivateModal.value = true;
}

const deactivateMessage = computed(() => {
  const t = deactivateTarget.value;
  if (!t) return '';
  const room = t.roomNumber ? ` (Room ${t.roomNumber})` : '';
  return `Are you sure you want to deactivate ${t.full_name}${room}? Their account will be marked inactive, the room assignment will end, and the room will become Available again. Historical records (bills, payments, tickets) are kept.`;
});

async function confirmDeactivate() {
  if (deactivating.value) return;
  const t = deactivateTarget.value;
  if (!t || !t.assignmentId || !t.roomId) {
    showDeactivateModal.value = false;
    return;
  }

  deactivating.value = true;
  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ account_status: 'inactive' })
      .eq('id', t.id);
    if (profileError) throw profileError;

    const { error: assignmentError } = await supabase
      .from('room_assignments')
      .update({ is_active: false })
      .eq('id', t.assignmentId);
    if (assignmentError) throw assignmentError;

    const { error: roomError } = await supabase
      .from('rooms')
      .update({ operational_status: 'Available' })
      .eq('id', t.roomId);
    if (roomError) throw roomError;

    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_profile_id: authStore.profile!.id,
      action: 'VACATE_TENANT',
      entity_type: 'PROFILE',
      entity_id: t.id,
      previous_values: { account_status: 'active', room_id: t.roomId },
      new_values: { account_status: 'inactive' },
    });
    if (auditError) throw auditError;

    showToast('Tenant Deactivated', `${t.full_name} has been deactivated and their room is now available.`, 'success');
    showDeactivateModal.value = false;
    deactivateTarget.value = null;
    await fetchTenants();
  } catch (err: any) {
    showToast('Deactivation Failed', err?.message || 'Could not complete the deactivation. Please try again.', 'error');
  } finally {
    deactivating.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Tenant Management</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Active Tenant Directory</h1>
      </div>

      <button @click="openOnboardModal" class="jira-btn-primary text-xs">
        <UserPlus class="w-3.5 h-3.5" />
        <span>Onboard Tenant</span>
      </button>
    </div>

    <!-- Temporary Password Panel (shown once, right after onboarding) -->
    <div v-if="lastTempPassword" class="jira-card p-4 bg-[#e3fcef] border border-[#abf5d1] flex items-start justify-between gap-3">
      <div class="flex items-start gap-2.5">
        <KeyRound class="w-4 h-4 text-[#006644] mt-0.5 shrink-0" />
        <div class="text-xs text-[#006644]">
          <p class="font-bold mb-0.5">Temporary Password — {{ lastTempPassword.tenantName }}</p>
          <p>Share this with the tenant now. It will not be shown again:</p>
          <p class="mt-1.5 font-mono font-bold text-sm bg-white border border-[#abf5d1] rounded-xs px-2.5 py-1 inline-block text-[#172b4d]">
            {{ lastTempPassword.password }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <button @click="copyTempPassword" class="jira-btn-secondary py-1 px-2 text-[11px]">
          <Copy class="w-3 h-3" />
          <span>Copy</span>
        </button>
        <button @click="lastTempPassword = null" class="text-[#006644] hover:text-[#172b4d] p-1">
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="jira-card p-3">
      <div class="relative w-full md:w-80">
        <Search class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b778c]" />
        <input
          v-model="search"
          type="text"
          placeholder="Search tenant name, room #, phone..."
          class="w-full pl-8 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d] focus:bg-white focus:outline-none"
        />
      </div>
    </div>

    <!-- Responsive Table -->
    <div class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Tenant Profile</th>
              <th class="py-2.5 px-3">Assigned Unit</th>
              <th class="py-2.5 px-3">Contact Details</th>
              <th class="py-2.5 px-3">Emergency Contact</th>
              <th class="py-2.5 px-3">Move-In Date</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-if="loading">
              <td colspan="7" class="py-6 px-3 text-center text-[#6b778c]">Loading tenant directory…</td>
            </tr>
            <tr v-else-if="filteredTenants.length === 0">
              <td colspan="7" class="py-6 px-3 text-center text-[#6b778c]">No tenants found.</td>
            </tr>
            <tr v-for="t in filteredTenants" :key="t.id" class="hover:bg-[#f7f8f9]">
              <td class="py-2.5 px-3">
                <div class="font-bold text-[#172b4d]">{{ t.full_name }}</div>
                <div class="text-[11px] text-[#6b778c]">{{ t.email }}</div>
              </td>
              <td class="py-2.5 px-3 font-semibold text-[#0c66e4]">
                {{ t.roomNumber ? `Room ${t.roomNumber}` : 'Unassigned' }}
              </td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ t.phone_number || '—' }}</td>
              <td class="py-2.5 px-3 text-[#5e6c84]">
                <template v-if="t.emergency_contact_name || t.emergency_contact_phone">
                  {{ t.emergency_contact_name || '—' }}<span v-if="t.emergency_contact_phone"> ({{ t.emergency_contact_phone }})</span>
                </template>
                <template v-else>—</template>
              </td>
              <td class="py-2.5 px-3">{{ t.moveInDate || '—' }}</td>
              <td class="py-2.5 px-3">
                <span :class="['jira-badge', t.account_status === 'active' ? 'jira-badge-done' : 'jira-badge-todo']">
                  {{ t.account_status === 'active' ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-right">
                <button
                  v-if="t.account_status === 'active' && t.assignmentId"
                  @click="openDeactivateModal(t)"
                  class="jira-btn-secondary py-1 px-2 text-[11px] border-[#ffbdad] text-[#bf2600] hover:bg-[#ffebe6]"
                >
                  <UserMinus class="w-3 h-3" />
                  <span>Deactivate</span>
                </button>
                <span v-else class="text-[11px] text-[#a5adba]">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Onboard Tenant Modal -->
    <div
      v-if="showOnboardModal"
      class="fixed inset-0 bg-[#091e4252] backdrop-blur-xs z-50 flex items-center justify-center p-4"
      @click.self="closeOnboardModal"
    >
      <div class="jira-card w-full max-w-md p-5 bg-white shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-base text-[#172b4d]">Onboard New Tenant</h3>
          <button @click="closeOnboardModal" class="text-[#6b778c] hover:text-[#172b4d]">
            <X class="w-4 h-4" />
          </button>
        </div>

        <form @submit.prevent="submitOnboard" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Full Name *</label>
            <input v-model="onboardForm.fullName" type="text" required class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Email *</label>
            <input v-model="onboardForm.email" type="email" required class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Phone Number</label>
              <input v-model="onboardForm.phoneNumber" type="text" class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Occupation</label>
              <input v-model="onboardForm.occupation" type="text" class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Emergency Contact Name</label>
              <input v-model="onboardForm.emergencyContactName" type="text" class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Emergency Contact Phone</label>
              <input v-model="onboardForm.emergencyContactPhone" type="text" class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
            </div>
          </div>

          <div class="border-t border-[#dfe1e6] pt-3">
            <label class="block font-semibold text-[#5e6c84] mb-1">Assign Room *</label>
            <select v-model="onboardForm.roomId" required class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]">
              <option value="" disabled>{{ loadingRooms ? 'Loading available rooms…' : 'Select an available room' }}</option>
              <option v-for="r in availableRooms" :key="r.id" :value="r.id">Room {{ r.room_number }}</option>
            </select>
            <p v-if="!loadingRooms && availableRooms.length === 0" class="text-[11px] text-[#bf2600] mt-1">
              No rooms are currently Available. Mark a room Available in Room Directory first.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Move-In Date *</label>
              <input v-model="onboardForm.startDate" type="date" required class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Occupant Count *</label>
              <input v-model.number="onboardForm.occupantCount" type="number" min="1" required class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]" />
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Deposit Amount (₱)</label>
            <input
              v-model.number="onboardForm.depositAmount"
              type="number"
              min="0"
              placeholder="Defaults to room's current rent"
              class="w-full px-3 py-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#dfe1e6]">
            <button type="button" @click="closeOnboardModal" :disabled="submitting" class="jira-btn-secondary">Cancel</button>
            <button type="submit" :disabled="submitting" class="jira-btn-primary">
              {{ submitting ? 'Onboarding…' : 'Onboard Tenant' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Deactivate Confirmation Modal (BR-025) -->
    <ConfirmModal
      :is-open="showDeactivateModal"
      title="Deactivate Tenant Account"
      :message="deactivateMessage"
      confirm-text="Deactivate Tenant"
      cancel-text="Cancel"
      variant="danger"
      @confirm="confirmDeactivate"
      @cancel="showDeactivateModal = false"
    />
  </div>
</template>
