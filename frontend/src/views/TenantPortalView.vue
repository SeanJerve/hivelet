<script setup lang="ts">
/**
 * @component TenantPortalView
 * @description Active Tenant Self-Service Workspace for Hivelet.
 * @systemBibleRef Section 4 - Tenant User Role & Section 5.5 - Water Billing Rate Rule (₱200/head)
 * @rationale Provides tenants with transparency over their assigned room, billing status,
 *              water rate calculations, ticket submissions, and self-service info edits (FR-010).
 * @innovations Falls back to a clearly-labelled computed estimate (BR-014) when no official bill
 *              row has been posted yet, and special-cases Linda units whose fixed-rate figures
 *              live in an admin-only ledger this view has no access to.
 */
import { ref, computed, onMounted } from 'vue';
import { Home, CreditCard, Wrench, Plus, X, Settings, Paperclip } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../lib/useToast';

const authStore = useAuthStore();
const { showToast } = useToast();

const WATER_RATE_PER_HEAD = 200; // BR-014

interface RoomRow {
  id: string;
  room_number: string;
  floor: number;
  room_type: string;
  current_price: number;
  is_linda_unit: boolean;
}

interface AssignmentRow {
  id: string;
  room_id: string;
  tenant_profile_id: string;
  start_date: string;
  anniversary_date: string;
  deposit_amount: number;
  occupant_count: number;
  is_active: boolean;
  rooms: RoomRow | null;
}

interface BillRow {
  id: string;
  rent_amount: number;
  water_amount: number;
  total_amount: number;
  status: 'Pending' | 'Due' | 'Overdue' | 'Paid' | 'Partially Paid';
  due_date: string;
}

interface TicketRow {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Emergency' | 'High' | 'Medium' | 'Low';
  status: 'Submitted' | 'In Progress' | 'Resolved' | 'Closed';
  created_at: string;
}

const loading = ref(true);
const assignment = ref<AssignmentRow | null>(null);
const bill = ref<BillRow | null>(null);
const tickets = ref<TicketRow[]>([]);

// BR-014: Standard unit total = base rent + (occupant_count x ₱200). Linda units use a
// different fixed-rate ledger (monthly_income_records) this view has no access to.
const estimatedWater = computed(() => (assignment.value?.occupant_count ?? 0) * WATER_RATE_PER_HEAD);
const estimatedTotal = computed(() => (assignment.value?.rooms?.current_price ?? 0) + estimatedWater.value);

async function loadPortalData() {
  loading.value = true;
  const profileId = authStore.profile!.id;

  const { data: assignmentData } = await supabase
    .from('room_assignments')
    .select('*, rooms(*)')
    .eq('tenant_profile_id', profileId)
    .eq('is_active', true)
    .maybeSingle();
  assignment.value = (assignmentData as AssignmentRow | null) ?? null;

  if (assignment.value) {
    const { data: billData } = await supabase
      .from('bills')
      .select('*')
      .eq('tenant_profile_id', profileId)
      .order('due_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    bill.value = (billData as BillRow | null) ?? null;
  } else {
    bill.value = null;
  }

  await loadTickets();
  loading.value = false;
}

async function loadTickets() {
  const profileId = authStore.profile!.id;
  const { data } = await supabase
    .from('maintenance_tickets')
    .select('*')
    .eq('tenant_profile_id', profileId)
    .order('created_at', { ascending: false });
  tickets.value = (data as TicketRow[] | null) ?? [];
}

onMounted(loadPortalData);

// ------------------------------------------------------------------
// Badge helpers (kept visually consistent with MaintenanceDispatchView)
// ------------------------------------------------------------------
function priorityBadgeClass(priority: string) {
  if (priority === 'Emergency') return 'jira-badge-emergency';
  if (priority === 'High') return 'jira-badge-warning';
  return 'jira-badge-todo'; // Medium / Low
}

function ticketStatusBadgeClass(status: string) {
  if (status === 'In Progress') return 'jira-badge-progress';
  if (status === 'Resolved' || status === 'Closed') return 'jira-badge-done';
  return 'jira-badge-todo'; // Submitted
}

function billStatusBadgeClass(status: string) {
  if (status === 'Paid') return 'jira-badge-done';
  if (status === 'Overdue') return 'jira-badge-emergency';
  if (status === 'Partially Paid') return 'jira-badge-warning';
  if (status === 'Due') return 'jira-badge-progress';
  return 'jira-badge-todo'; // Pending
}

// ------------------------------------------------------------------
// Submit New Ticket
// ------------------------------------------------------------------
const showTicketForm = ref(false);
const submittingTicket = ref(false);
const ticketForm = ref({
  title: '',
  description: '',
  category: 'General',
  priority: 'Medium' as TicketRow['priority'],
});
const ticketPhoto = ref<File | null>(null);

function onPhotoChange(e: Event) {
  const target = e.target as HTMLInputElement;
  ticketPhoto.value = target.files?.[0] ?? null;
}

function resetTicketForm() {
  ticketForm.value = { title: '', description: '', category: 'General', priority: 'Medium' };
  ticketPhoto.value = null;
}

async function submitTicket() {
  if (!assignment.value) {
    showToast('Cannot Submit Ticket', 'No active room assignment on file.', 'error');
    return;
  }
  if (!ticketForm.value.title.trim() || !ticketForm.value.description.trim()) {
    showToast('Missing Information', 'Please provide a title and description.', 'warning');
    return;
  }

  submittingTicket.value = true;
  try {
    const profileId = authStore.profile!.id;
    const { data: newTicket, error } = await supabase
      .from('maintenance_tickets')
      .insert({
        room_id: assignment.value.room_id,
        tenant_profile_id: profileId,
        title: ticketForm.value.title.trim(),
        description: ticketForm.value.description.trim(),
        category: ticketForm.value.category,
        priority: ticketForm.value.priority,
      })
      .select()
      .single();

    if (error || !newTicket) throw error || new Error('Ticket could not be created.');

    if (ticketPhoto.value) {
      const file = ticketPhoto.value;
      const path = `${newTicket.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from('ticket-photos').upload(path, file);
      if (uploadError) {
        showToast('Photo Upload Failed', `Ticket was submitted, but the photo failed to upload: ${uploadError.message}`, 'warning');
      } else {
        await supabase.from('ticket_attachments').insert({
          ticket_id: newTicket.id,
          file_url: path,
          file_type: file.type,
        });
      }
    }

    tickets.value.unshift(newTicket as TicketRow);
    showToast('Ticket Submitted', 'Your maintenance ticket has been submitted to the administrator.', 'success');
    resetTicketForm();
    showTicketForm.value = false;
  } catch (err: any) {
    showToast('Ticket Submission Failed', err?.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    submittingTicket.value = false;
  }
}

// ------------------------------------------------------------------
// Edit My Info (FR-010: phone, emergency contact, occupation, facebook only)
// ------------------------------------------------------------------
const showEditProfile = ref(false);
const savingProfile = ref(false);
const profileForm = ref({
  phone_number: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  occupation: '',
  facebook_url: '',
});

function openEditProfile() {
  const p = authStore.profile;
  profileForm.value = {
    phone_number: p?.phone_number || '',
    emergency_contact_name: p?.emergency_contact_name || '',
    emergency_contact_phone: p?.emergency_contact_phone || '',
    occupation: p?.occupation || '',
    facebook_url: p?.facebook_url || '',
  };
  showEditProfile.value = true;
}

async function saveProfile() {
  savingProfile.value = true;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        phone_number: profileForm.value.phone_number || null,
        emergency_contact_name: profileForm.value.emergency_contact_name || null,
        emergency_contact_phone: profileForm.value.emergency_contact_phone || null,
        occupation: profileForm.value.occupation || null,
        facebook_url: profileForm.value.facebook_url || null,
      })
      .eq('id', authStore.profile!.id);

    if (error) throw error;

    await authStore.fetchProfile(authStore.user!.id);
    showToast('Profile Updated', 'Your information has been saved.', 'success');
    showEditProfile.value = false;
  } catch (err: any) {
    showToast('Update Failed', err?.message || 'Could not save your information. Please try again.', 'error');
  } finally {
    savingProfile.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="pb-3 border-b border-[#dfe1e6]">
      <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
        <span>Tenant Portal</span>
        <span>/</span>
        <span class="font-medium text-[#172b4d]">{{ authStore.profile?.full_name }}</span>
      </div>
      <h1 class="text-xl font-bold text-[#172b4d]">My Room & Account Workspace</h1>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="jira-card p-6 text-center text-xs text-[#6b778c]">
      Loading your account details…
    </div>

    <template v-else>
      <!-- No Active Assignment Fallback -->
      <div v-if="!assignment" class="jira-card p-4 text-xs text-[#5e6c84]">
        You currently have no active room assignment on file. Please contact the administrator if you believe this is an error.
      </div>

      <!-- Room Specs & Billing Overview Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Assigned Room Spec Card -->
        <div class="jira-card p-4 space-y-3">
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
              <Home class="w-4 h-4 text-[#0c66e4]" />
              <span>Assigned Unit Specs</span>
            </h3>
            <span class="jira-badge jira-badge-done">Active Occupant</span>
          </div>

          <div class="space-y-2 text-xs text-[#172b4d]">
            <div class="flex justify-between">
              <span class="text-[#5e6c84]">Room Unit:</span>
              <strong class="text-[#0c66e4]">Room {{ assignment.rooms?.room_number }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-[#5e6c84]">Unit Classification:</span>
              <span>{{ assignment.rooms?.room_type }} (Floor {{ assignment.rooms?.floor }})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#5e6c84]">Registered Occupants:</span>
              <span>{{ assignment.occupant_count }} Persons</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#5e6c84]">Anniversary / Billing Anchor Date:</span>
              <span>{{ assignment.anniversary_date }}</span>
            </div>
          </div>
        </div>

        <!-- Current Bill Itemized Breakdown Card -->
        <div class="jira-card p-4 space-y-3">
          <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
            <h3 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
              <CreditCard class="w-4 h-4 text-[#0c66e4]" />
              <span>Current Statement</span>
            </h3>
            <span v-if="bill" :class="['jira-badge', billStatusBadgeClass(bill.status)]">{{ bill.status }}</span>
            <span v-else class="jira-badge jira-badge-todo">Estimate</span>
          </div>

          <!-- Linda Fixed-Rate Unit: no client-side computation, no official bill posted -->
          <div v-if="!bill && assignment.rooms?.is_linda_unit" class="text-xs text-[#5e6c84] p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
            This unit is billed under Linda's fixed-rate arrangement — contact the administrator for your exact monthly amount.
          </div>

          <!-- Official Bill Row Exists -->
          <div v-else-if="bill" class="space-y-2 text-xs">
            <div class="flex justify-between text-[#172b4d]">
              <span class="text-[#5e6c84]">Rent Amount:</span>
              <span>₱{{ Number(bill.rent_amount).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-[#172b4d]">
              <span class="text-[#5e6c84]">Water Amount:</span>
              <span>₱{{ Number(bill.water_amount).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between font-bold text-sm text-[#172b4d] border-t border-[#dfe1e6] pt-2">
              <span>Total Amount Due:</span>
              <span class="text-[#0c66e4]">₱{{ Number(bill.total_amount).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-[#5e6c84]">
              <span>Due Date:</span>
              <span>{{ bill.due_date }}</span>
            </div>
          </div>

          <!-- No Bill Posted Yet: Standard Unit Computed Estimate (BR-014) -->
          <div v-else class="space-y-2 text-xs">
            <div class="flex justify-between text-[#172b4d]">
              <span class="text-[#5e6c84]">Base Monthly Rent:</span>
              <span>₱{{ Number(assignment.rooms?.current_price ?? 0).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-[#172b4d]">
              <span class="text-[#5e6c84]">Water Utility (₱200/head x {{ assignment.occupant_count }}):</span>
              <span>₱{{ estimatedWater.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between font-bold text-sm text-[#172b4d] border-t border-[#dfe1e6] pt-2">
              <span>Estimated Monthly Obligation:</span>
              <span class="text-[#0c66e4]">₱{{ estimatedTotal.toLocaleString() }}</span>
            </div>
            <p class="text-[11px] text-[#6b778c] italic">Estimated — no official bill posted yet.</p>
          </div>
        </div>
      </div>

      <!-- My Information Card -->
      <div class="jira-card p-4 space-y-3">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <Settings class="w-4 h-4 text-[#0c66e4]" />
            <span>My Information</span>
          </h3>
          <button v-if="!showEditProfile" @click="openEditProfile" class="jira-btn-secondary text-[11px] py-1 px-2.5">
            Edit My Info
          </button>
          <button v-else @click="showEditProfile = false" class="text-xs text-[#6b778c]">Cancel</button>
        </div>

        <!-- Read-Only Snapshot -->
        <div v-if="!showEditProfile" class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#172b4d]">
          <div class="flex justify-between"><span class="text-[#5e6c84]">Full Name:</span><span>{{ authStore.profile?.full_name }}</span></div>
          <div class="flex justify-between"><span class="text-[#5e6c84]">Email:</span><span>{{ authStore.profile?.email }}</span></div>
          <div class="flex justify-between"><span class="text-[#5e6c84]">Phone Number:</span><span>{{ authStore.profile?.phone_number || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-[#5e6c84]">Occupation:</span><span>{{ authStore.profile?.occupation || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-[#5e6c84]">Emergency Contact:</span><span>{{ authStore.profile?.emergency_contact_name || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-[#5e6c84]">Emergency Contact Phone:</span><span>{{ authStore.profile?.emergency_contact_phone || '—' }}</span></div>
          <div class="flex justify-between sm:col-span-2"><span class="text-[#5e6c84]">Facebook URL:</span><span class="truncate">{{ authStore.profile?.facebook_url || '—' }}</span></div>
        </div>

        <!-- Edit Form -->
        <div v-else class="space-y-3 text-xs">
          <p class="text-[11px] text-[#6b778c] italic">You may update your contact details below. Room, rent, and account status can only be changed by the administrator.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Phone Number</label>
              <input v-model="profileForm.phone_number" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Occupation</label>
              <input v-model="profileForm.occupation" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Emergency Contact Name</label>
              <input v-model="profileForm.emergency_contact_name" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Emergency Contact Phone</label>
              <input v-model="profileForm.emergency_contact_phone" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
            <div class="sm:col-span-2">
              <label class="block font-semibold text-[#5e6c84] mb-1">Facebook URL</label>
              <input v-model="profileForm.facebook_url" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
          </div>
          <div class="flex justify-end pt-2">
            <button @click="saveProfile" :disabled="savingProfile" class="jira-btn-primary disabled:opacity-50">
              {{ savingProfile ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Maintenance Tickets Card -->
      <div class="jira-card p-4 space-y-3">
        <div class="flex items-center justify-between border-b border-[#dfe1e6] pb-2">
          <h3 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <Wrench class="w-4 h-4 text-[#0c66e4]" />
            <span>Maintenance Tickets</span>
          </h3>
          <button v-if="!showTicketForm" @click="showTicketForm = true" class="jira-btn-primary text-xs">
            <Plus class="w-3.5 h-3.5" />
            <span>Submit New Ticket</span>
          </button>
          <button v-else @click="showTicketForm = false; resetTicketForm();" class="text-xs text-[#6b778c] flex items-center gap-1">
            <X class="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>

        <!-- Submit New Ticket Form -->
        <div v-if="showTicketForm" class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs space-y-3 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block font-semibold text-[#5e6c84] mb-1">Title</label>
              <input v-model="ticketForm.title" type="text" placeholder="e.g. Faucet dripping" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
            <div class="sm:col-span-2">
              <label class="block font-semibold text-[#5e6c84] mb-1">Description</label>
              <textarea v-model="ticketForm.description" rows="3" placeholder="Describe the issue in detail" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs"></textarea>
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Category</label>
              <select v-model="ticketForm.category" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Carpentry">Carpentry</option>
                <option value="General">General</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Priority</label>
              <select v-model="ticketForm.priority" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
                <option value="Emergency">Emergency</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block font-semibold text-[#5e6c84] mb-1 flex items-center gap-1">
                <Paperclip class="w-3 h-3" />
                <span>Photo (optional)</span>
              </label>
              <input type="file" accept="image/*" @change="onPhotoChange" class="w-full text-[11px] text-[#5e6c84]" />
            </div>
          </div>
          <div class="flex justify-end pt-1">
            <button @click="submitTicket" :disabled="submittingTicket" class="jira-btn-primary disabled:opacity-50">
              {{ submittingTicket ? 'Submitting…' : 'Submit Ticket' }}
            </button>
          </div>
        </div>

        <!-- Ticket List -->
        <div v-if="tickets.length === 0" class="text-xs text-[#6b778c] py-2">
          You have not submitted any maintenance tickets yet.
        </div>
        <div v-else class="divide-y divide-[#dfe1e6]">
          <div v-for="t in tickets" :key="t.id" class="py-2.5 space-y-1">
            <div class="flex items-center justify-between gap-2">
              <span class="font-semibold text-xs text-[#172b4d]">{{ t.title }}</span>
              <div class="flex items-center gap-1.5 shrink-0">
                <span :class="['jira-badge', priorityBadgeClass(t.priority)]">{{ t.priority }}</span>
                <span :class="['jira-badge', ticketStatusBadgeClass(t.status)]">{{ t.status }}</span>
              </div>
            </div>
            <p class="text-[11px] text-[#5e6c84]">{{ t.description }}</p>
            <div class="flex items-center gap-2 text-[11px] text-[#6b778c]">
              <span>{{ t.category }}</span>
              <span>•</span>
              <span>{{ new Date(t.created_at).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
