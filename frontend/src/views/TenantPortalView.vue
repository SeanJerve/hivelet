<script setup lang="ts">
/**
 * @component TenantPortalView
 * @description Active Tenant Self-Service Workspace for Hivelet.
 * @systemBibleRef Section 4 - Tenant User Role & Section 5.5 - Water Billing Rate Rule (₱200/head)
 * @rationale Provides tenants with transparency over their assigned room, billing status,
 *            water rate calculations, ticket submissions with reply capability, and self-service
 *            info edits (FR-010). Styled with the luxury design tokens (index.css `.lux-*`) shared
 *            with the public site, distinct from the admin's Jira/Notion/Airtable workspace.
 * @innovations Falls back to a clearly-labelled computed estimate (BR-014) when no official bill
 *              row has been posted yet, and special-cases Linda units whose fixed-rate figures
 *              live in an admin-only ledger this view has no access to. Ticket replies mirror the
 *              admin's MaintenanceDispatchView.vue sendReply() pattern, minus the admin-only
 *              Submitted→In Progress auto-transition (project decision: messaging stays scoped to
 *              per-ticket threads, no new generic conversation feature).
 */
import { ref, computed, onMounted, defineAsyncComponent } from 'vue';
import { Home, CreditCard, Wrench, Plus, X, Settings, Paperclip, ChevronDown, Send, Smartphone, ReceiptText } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../lib/useToast';

// Code-split: pulls in the (large) @adyen/adyen-web SDK only when a tenant actually opens the
// optional GCash payment modal, instead of bundling it into every page load.
const TenantGCashPaymentModal = defineAsyncComponent(() => import('../components/ui/TenantGCashPaymentModal.vue'));

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

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message_body: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface ReceiptRow {
  id: string;
  amount: number;
  method: string;
  reference: string;
  date: string;
  sentAt: string;
}

const loading = ref(true);
const assignment = ref<AssignmentRow | null>(null);
const bill = ref<BillRow | null>(null);
const tickets = ref<TicketRow[]>([]);
const receipts = ref<ReceiptRow[]>([]);

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

  await Promise.all([loadTickets(), loadReceipts()]);
  loading.value = false;
}

// FR-016/Section 22: a payment becomes a receipt once the administrator confirms it. BR-048 keeps
// monthly_income_records admin-only at the RLS level, so cash/manual receipts are read through the
// narrow get_my_income_receipts() function (own rows only, receipt fields only) instead of a direct
// table query; online GCash entries come from `payments`, which already has a tenant-read policy.
async function loadReceipts() {
  const profileId = authStore.profile!.id;

  const [incomeRes, paymentsRes] = await Promise.all([
    supabase.rpc('get_my_income_receipts'),
    supabase
      .from('payments')
      .select('id, amount, payment_method, transaction_reference, paid_at, receipt_sent_at')
      .eq('tenant_profile_id', profileId)
      .not('receipt_sent_at', 'is', null),
  ]);

  const fromIncome: ReceiptRow[] = (incomeRes.data ?? []).map((r: any) => ({
    id: r.id,
    amount: Number(r.amount),
    method: r.payment_method,
    reference: r.reference,
    date: r.paid_on,
    sentAt: r.sent_at,
  }));
  const fromPayments: ReceiptRow[] = (paymentsRes.data ?? []).map((p: any) => ({
    id: p.id,
    amount: Number(p.amount),
    method: p.payment_method,
    reference: p.transaction_reference || '—',
    date: p.paid_at,
    sentAt: p.receipt_sent_at,
  }));

  receipts.value = [...fromIncome, ...fromPayments].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
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
// Optional Online GCash Payment (FR-015) -- only offered against an official,
// unpaid bill row; the estimate-only fallback has no bill id to pay against.
// ------------------------------------------------------------------
const showGcashModal = ref(false);

// ------------------------------------------------------------------
// Badge helpers
// ------------------------------------------------------------------
function priorityBadgeClass(priority: string) {
  if (priority === 'Emergency') return 'lux-badge-maintenance';
  if (priority === 'High') return 'lux-badge-reserved';
  return 'lux-badge-available'; // Medium / Low
}

function ticketStatusBadgeClass(status: string) {
  if (status === 'In Progress') return 'lux-badge-reserved';
  if (status === 'Resolved' || status === 'Closed') return 'lux-badge-available';
  return 'lux-badge-occupied'; // Submitted
}

function billStatusBadgeClass(status: string) {
  if (status === 'Paid') return 'lux-badge-available';
  if (status === 'Overdue') return 'lux-badge-maintenance';
  if (status === 'Partially Paid') return 'lux-badge-reserved';
  if (status === 'Due') return 'lux-badge-occupied';
  return 'lux-badge-maintenance'; // Pending
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
// Ticket Thread (reply to admin) -- mirrors MaintenanceDispatchView's admin
// sendReply() pattern, without the admin-only status auto-transition.
// ------------------------------------------------------------------
const expandedTicketId = ref<string | null>(null);
const messagesByTicket = ref<Record<string, TicketMessage[]>>({});
const loadingMessages = ref(false);
const replyText = ref('');
const sendingReply = ref(false);

async function toggleTicketThread(ticketId: string) {
  if (expandedTicketId.value === ticketId) {
    expandedTicketId.value = null;
    return;
  }
  expandedTicketId.value = ticketId;
  replyText.value = '';
  if (!messagesByTicket.value[ticketId]) {
    loadingMessages.value = true;
    const { data } = await supabase
      .from('ticket_messages')
      .select('*, profiles(full_name)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    messagesByTicket.value[ticketId] = (data as TicketMessage[] | null) ?? [];
    loadingMessages.value = false;
  }
}

async function sendTicketReply(ticketId: string) {
  const body = replyText.value.trim();
  if (!body) return;

  sendingReply.value = true;
  try {
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({ ticket_id: ticketId, sender_id: authStore.profile!.id, message_body: body })
      .select('*, profiles(full_name)')
      .single();

    if (error) throw error;

    messagesByTicket.value[ticketId] = [...(messagesByTicket.value[ticketId] ?? []), data as TicketMessage];
    replyText.value = '';
  } catch (err: any) {
    showToast('Reply Failed', err?.message || 'Could not send your reply. Please try again.', 'error');
  } finally {
    sendingReply.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="pb-4 border-b border-[var(--lux-border)]">
      <span class="lux-eyebrow">Welcome back</span>
      <h1 class="lux-serif text-2xl md:text-3xl mt-1 text-[var(--lux-text)]">{{ authStore.profile?.full_name }}</h1>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="lux-card p-8 text-center text-sm text-[var(--lux-text-muted)]">
      Loading your account details…
    </div>

    <template v-else>
      <!-- No Active Assignment Fallback -->
      <div v-if="!assignment" class="lux-card p-5 text-sm text-[var(--lux-text-muted)]">
        You currently have no active room assignment on file. Please contact the administrator if you believe this is an error.
      </div>

      <!-- Room Specs & Billing Overview Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Assigned Room Spec Card -->
        <div class="lux-card p-5 space-y-3">
          <div class="flex items-center justify-between border-b border-[var(--lux-border)] pb-3">
            <h3 class="lux-serif text-base text-[var(--lux-text)] flex items-center gap-2">
              <Home class="w-4 h-4 text-[var(--lux-accent)]" />
              <span>Assigned Unit</span>
            </h3>
            <span class="lux-badge lux-badge-available">Active Occupant</span>
          </div>

          <div class="space-y-2 text-sm text-[var(--lux-text)]">
            <div class="flex justify-between">
              <span class="text-[var(--lux-text-muted)]">Room Unit:</span>
              <strong class="text-[var(--lux-accent)]">Room {{ assignment.rooms?.room_number }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--lux-text-muted)]">Unit Type:</span>
              <span>{{ assignment.rooms?.room_type }} (Floor {{ assignment.rooms?.floor }})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--lux-text-muted)]">Registered Occupants:</span>
              <span>{{ assignment.occupant_count }} Persons</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[var(--lux-text-muted)]">Anniversary / Billing Date:</span>
              <span>{{ assignment.anniversary_date }}</span>
            </div>
          </div>
        </div>

        <!-- Current Bill Itemized Breakdown Card -->
        <div class="lux-card p-5 space-y-3">
          <div class="flex items-center justify-between border-b border-[var(--lux-border)] pb-3">
            <h3 class="lux-serif text-base text-[var(--lux-text)] flex items-center gap-2">
              <CreditCard class="w-4 h-4 text-[var(--lux-accent)]" />
              <span>Current Statement</span>
            </h3>
            <span v-if="bill" :class="['lux-badge', billStatusBadgeClass(bill.status)]">{{ bill.status }}</span>
            <span v-else class="lux-badge lux-badge-occupied">Estimate</span>
          </div>

          <!-- Linda Fixed-Rate Unit: no client-side computation, no official bill posted -->
          <div v-if="!bill && assignment.rooms?.is_linda_unit" class="text-xs text-[var(--lux-text-muted)] p-3 bg-[var(--lux-canvas)] border border-[var(--lux-border)] rounded">
            This unit is billed under Linda's fixed-rate arrangement — contact the administrator for your exact monthly amount.
          </div>

          <!-- Official Bill Row Exists -->
          <div v-else-if="bill" class="space-y-2 text-sm">
            <div class="flex justify-between text-[var(--lux-text)]">
              <span class="text-[var(--lux-text-muted)]">Rent Amount:</span>
              <span>₱{{ Number(bill.rent_amount).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-[var(--lux-text)]">
              <span class="text-[var(--lux-text-muted)]">Water Amount:</span>
              <span>₱{{ Number(bill.water_amount).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between lux-serif text-base text-[var(--lux-text)] border-t border-[var(--lux-border)] pt-2">
              <span>Total Amount Due:</span>
              <span class="text-[var(--lux-accent)]">₱{{ Number(bill.total_amount).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-[var(--lux-text-muted)] text-xs">
              <span>Due Date:</span>
              <span>{{ bill.due_date }}</span>
            </div>
            <button
              v-if="bill.status !== 'Paid'"
              @click="showGcashModal = true"
              class="lux-btn-secondary w-full justify-center mt-1"
            >
              <Smartphone class="w-3.5 h-3.5" />
              <span>Pay with GCash (Optional)</span>
            </button>
          </div>

          <!-- No Bill Posted Yet: Standard Unit Computed Estimate (BR-014) -->
          <div v-else class="space-y-2 text-sm">
            <div class="flex justify-between text-[var(--lux-text)]">
              <span class="text-[var(--lux-text-muted)]">Base Monthly Rent:</span>
              <span>₱{{ Number(assignment.rooms?.current_price ?? 0).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-[var(--lux-text)]">
              <span class="text-[var(--lux-text-muted)]">Water Utility (₱200/head x {{ assignment.occupant_count }}):</span>
              <span>₱{{ estimatedWater.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between lux-serif text-base text-[var(--lux-text)] border-t border-[var(--lux-border)] pt-2">
              <span>Estimated Monthly Obligation:</span>
              <span class="text-[var(--lux-accent)]">₱{{ estimatedTotal.toLocaleString() }}</span>
            </div>
            <p class="text-[11px] text-[var(--lux-text-muted)] italic">Estimated — no official bill posted yet.</p>
          </div>
        </div>
      </div>

      <!-- Payment Receipts Card -->
      <div class="lux-card p-5 space-y-3">
        <div class="flex items-center justify-between border-b border-[var(--lux-border)] pb-3">
          <h3 class="lux-serif text-base text-[var(--lux-text)] flex items-center gap-2">
            <ReceiptText class="w-4 h-4 text-[var(--lux-accent)]" />
            <span>Payment Receipts</span>
          </h3>
        </div>

        <div v-if="receipts.length === 0" class="text-sm text-[var(--lux-text-muted)] py-2">
          No payment receipts yet. The administrator sends a receipt once a payment is confirmed.
        </div>
        <div v-else class="divide-y divide-[var(--lux-border)]">
          <div v-for="r in receipts" :key="r.id" class="py-2.5 flex items-center justify-between gap-3 text-sm">
            <div>
              <p class="text-[var(--lux-text)] font-medium">₱{{ r.amount.toLocaleString() }} <span class="text-[var(--lux-text-muted)] font-normal">via {{ r.method }}</span></p>
              <p class="text-[11px] text-[var(--lux-text-muted)]">Paid {{ r.date }} • Ref {{ r.reference }}</p>
            </div>
            <span class="lux-badge lux-badge-available shrink-0">Confirmed</span>
          </div>
        </div>
      </div>

      <!-- My Information Card -->
      <div class="lux-card p-5 space-y-3">
        <div class="flex items-center justify-between border-b border-[var(--lux-border)] pb-3">
          <h3 class="lux-serif text-base text-[var(--lux-text)] flex items-center gap-2">
            <Settings class="w-4 h-4 text-[var(--lux-accent)]" />
            <span>My Information</span>
          </h3>
          <button v-if="!showEditProfile" @click="openEditProfile" class="lux-btn-secondary text-[11px] py-1.5 px-3">
            Edit My Info
          </button>
          <button v-else @click="showEditProfile = false" class="text-xs text-[var(--lux-text-muted)]">Cancel</button>
        </div>

        <!-- Read-Only Snapshot -->
        <div v-if="!showEditProfile" class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[var(--lux-text)]">
          <div class="flex justify-between"><span class="text-[var(--lux-text-muted)]">Full Name:</span><span>{{ authStore.profile?.full_name }}</span></div>
          <div class="flex justify-between"><span class="text-[var(--lux-text-muted)]">Email:</span><span>{{ authStore.profile?.email }}</span></div>
          <div class="flex justify-between"><span class="text-[var(--lux-text-muted)]">Phone Number:</span><span>{{ authStore.profile?.phone_number || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-[var(--lux-text-muted)]">Occupation:</span><span>{{ authStore.profile?.occupation || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-[var(--lux-text-muted)]">Emergency Contact:</span><span>{{ authStore.profile?.emergency_contact_name || '—' }}</span></div>
          <div class="flex justify-between"><span class="text-[var(--lux-text-muted)]">Emergency Contact Phone:</span><span>{{ authStore.profile?.emergency_contact_phone || '—' }}</span></div>
          <div class="flex justify-between sm:col-span-2"><span class="text-[var(--lux-text-muted)]">Facebook URL:</span><span class="truncate">{{ authStore.profile?.facebook_url || '—' }}</span></div>
        </div>

        <!-- Edit Form -->
        <div v-else class="space-y-3">
          <p class="text-[11px] text-[var(--lux-text-muted)] italic">You may update your contact details below. Room, rent, and account status can only be changed by the administrator.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="lux-label">Phone Number</label>
              <input v-model="profileForm.phone_number" type="text" class="lux-input" />
            </div>
            <div>
              <label class="lux-label">Occupation</label>
              <input v-model="profileForm.occupation" type="text" class="lux-input" />
            </div>
            <div>
              <label class="lux-label">Emergency Contact Name</label>
              <input v-model="profileForm.emergency_contact_name" type="text" class="lux-input" />
            </div>
            <div>
              <label class="lux-label">Emergency Contact Phone</label>
              <input v-model="profileForm.emergency_contact_phone" type="text" class="lux-input" />
            </div>
            <div class="sm:col-span-2">
              <label class="lux-label">Facebook URL</label>
              <input v-model="profileForm.facebook_url" type="text" class="lux-input" />
            </div>
          </div>
          <div class="flex justify-end pt-2">
            <button @click="saveProfile" :disabled="savingProfile" class="lux-btn-primary disabled:opacity-50">
              {{ savingProfile ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Maintenance Tickets Card -->
      <div id="tickets" class="lux-card p-5 space-y-3 scroll-mt-24">
        <div class="flex items-center justify-between border-b border-[var(--lux-border)] pb-3">
          <h3 class="lux-serif text-base text-[var(--lux-text)] flex items-center gap-2">
            <Wrench class="w-4 h-4 text-[var(--lux-accent)]" />
            <span>Maintenance Tickets</span>
          </h3>
          <button v-if="!showTicketForm" @click="showTicketForm = true" class="lux-btn-primary text-xs">
            <Plus class="w-3.5 h-3.5" />
            <span>Submit New Ticket</span>
          </button>
          <button v-else @click="showTicketForm = false; resetTicketForm();" class="text-xs text-[var(--lux-text-muted)] flex items-center gap-1">
            <X class="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>

        <!-- Submit New Ticket Form -->
        <div v-if="showTicketForm" class="p-4 bg-[var(--lux-canvas)] border border-[var(--lux-border)] rounded space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="lux-label">Title</label>
              <input v-model="ticketForm.title" type="text" placeholder="e.g. Faucet dripping" class="lux-input" />
            </div>
            <div class="sm:col-span-2">
              <label class="lux-label">Description</label>
              <textarea v-model="ticketForm.description" rows="3" placeholder="Describe the issue in detail" class="lux-input"></textarea>
            </div>
            <div>
              <label class="lux-label">Category</label>
              <select v-model="ticketForm.category" class="lux-input">
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Carpentry">Carpentry</option>
                <option value="General">General</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="lux-label">Priority</label>
              <select v-model="ticketForm.priority" class="lux-input">
                <option value="Emergency">Emergency</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="lux-label flex items-center gap-1">
                <Paperclip class="w-3 h-3" />
                <span>Photo (optional)</span>
              </label>
              <input type="file" accept="image/*" @change="onPhotoChange" class="w-full text-[11px] text-[var(--lux-text-muted)]" />
            </div>
          </div>
          <div class="flex justify-end pt-1">
            <button @click="submitTicket" :disabled="submittingTicket" class="lux-btn-primary disabled:opacity-50">
              {{ submittingTicket ? 'Submitting…' : 'Submit Ticket' }}
            </button>
          </div>
        </div>

        <!-- Ticket List -->
        <div v-if="tickets.length === 0" class="text-sm text-[var(--lux-text-muted)] py-2">
          You have not submitted any maintenance tickets yet.
        </div>
        <div v-else class="divide-y divide-[var(--lux-border)]">
          <div v-for="t in tickets" :key="t.id" class="py-3">
            <button @click="toggleTicketThread(t.id)" class="w-full text-left space-y-1.5">
              <div class="flex items-center justify-between gap-2">
                <span class="font-medium text-sm text-[var(--lux-text)]">{{ t.title }}</span>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span :class="['lux-badge', priorityBadgeClass(t.priority)]">{{ t.priority }}</span>
                  <span :class="['lux-badge', ticketStatusBadgeClass(t.status)]">{{ t.status }}</span>
                  <ChevronDown :class="['w-3.5 h-3.5 text-[var(--lux-text-muted)] transition-transform', expandedTicketId === t.id ? 'rotate-180' : '']" />
                </div>
              </div>
              <p class="text-xs text-[var(--lux-text-muted)]">{{ t.description }}</p>
              <div class="flex items-center gap-2 text-[11px] text-[var(--lux-text-muted)]">
                <span>{{ t.category }}</span>
                <span>•</span>
                <span>{{ new Date(t.created_at).toLocaleDateString() }}</span>
              </div>
            </button>

            <!-- Ticket Thread: reply to admin (RLS allows the ticket's own tenant to insert) -->
            <div v-if="expandedTicketId === t.id" class="mt-3 pl-1 space-y-3">
              <div v-if="loadingMessages" class="text-xs text-[var(--lux-text-muted)]">Loading conversation…</div>
              <div v-else class="space-y-2 max-h-52 overflow-y-auto">
                <div v-if="(messagesByTicket[t.id] ?? []).length === 0" class="text-xs text-[var(--lux-text-muted)]">
                  No messages yet — send a reply below to reach the administrator.
                </div>
                <div v-for="m in messagesByTicket[t.id]" :key="m.id" class="p-2.5 bg-[var(--lux-canvas)] border border-[var(--lux-border)] rounded">
                  <div class="flex items-center justify-between text-[10px] text-[var(--lux-text-muted)] mb-1">
                    <span class="font-semibold text-[var(--lux-text)]">{{ m.sender_id === authStore.profile?.id ? 'You' : (m.profiles?.full_name || 'Administrator') }}</span>
                    <span>{{ formatDate(m.created_at) }}</span>
                  </div>
                  <p class="text-xs text-[var(--lux-text)]">{{ m.message_body }}</p>
                </div>
              </div>

              <div class="flex items-end gap-2">
                <textarea v-model="replyText" rows="2" placeholder="Reply to the administrator…" class="lux-input flex-1"></textarea>
                <button
                  @click="sendTicketReply(t.id)"
                  :disabled="sendingReply || !replyText.trim()"
                  class="lux-btn-secondary shrink-0 disabled:opacity-50"
                >
                  <Send class="w-3.5 h-3.5" />
                  <span class="hidden sm:inline">{{ sendingReply ? 'Sending…' : 'Send' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <TenantGCashPaymentModal v-if="showGcashModal && bill" :bill-id="bill.id" @close="showGcashModal = false" />
  </div>
</template>
