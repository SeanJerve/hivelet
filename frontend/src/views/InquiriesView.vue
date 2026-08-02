<script setup lang="ts">
/**
 * @component InquiriesView
 * @description Centralized Public Inquiry Inbox for prospective tenant communication.
 * @systemBibleRef Section 5.4 - Centralized Inquiries & Messenger Communication
 * @rationale Replaces fragmented Facebook Messenger / SMS channels with a unified inquiry inbox.
 * @innovations Provides prospect conversion tracking to seamlessly convert approved inquiries into tenant profiles.
 */
import { ref, onMounted } from 'vue';
import { MessageSquare, ArrowRight, ChevronDown, ChevronUp, Send, X, UserPlus, XCircle } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../lib/useToast';

interface Inquiry {
  id: string;
  room_id: string;
  prospect_name: string;
  prospect_email: string;
  prospect_phone: string;
  message: string;
  status: 'Pending' | 'Contacted' | 'Converted' | 'Closed';
  converted_tenant_id: string | null;
  created_at: string;
  updated_at: string;
  rooms: { room_number: string } | null;
}

interface InquiryMessage {
  id: string;
  inquiry_id: string;
  sender_id: string | null;
  sender_name: string;
  message_body: string;
  sent_at: string;
}

interface AvailableRoom {
  id: string;
  room_number: string;
}

const authStore = useAuthStore();
const { showToast } = useToast();

// Inbox state
const inquiries = ref<Inquiry[]>([]);
const loadingInquiries = ref(false);

// Thread / reply state (keyed by inquiry id)
const expandedId = ref<string | null>(null);
const threadMessages = ref<Record<string, InquiryMessage[]>>({});
const threadLoading = ref<Record<string, boolean>>({});
const replyDrafts = ref<Record<string, string>>({});
const sendingReply = ref<Record<string, boolean>>({});

const statusBadgeClass = (status: Inquiry['status']) => {
  switch (status) {
    case 'Pending':
      return 'jira-badge-warning';
    case 'Contacted':
      return 'jira-badge-progress';
    case 'Converted':
      return 'jira-badge-done';
    case 'Closed':
    default:
      return 'jira-badge-todo';
  }
};

const fetchInquiries = async () => {
  loadingInquiries.value = true;
  const { data, error } = await supabase
    .from('inquiries')
    .select('*, rooms(room_number)')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Failed to Load Inquiries', error.message, 'error');
  } else {
    inquiries.value = (data as unknown as Inquiry[]) || [];
  }
  loadingInquiries.value = false;
};

const toggleThread = async (inq: Inquiry) => {
  if (expandedId.value === inq.id) {
    expandedId.value = null;
    return;
  }

  expandedId.value = inq.id;

  if (!threadMessages.value[inq.id]) {
    threadLoading.value[inq.id] = true;
    const { data, error } = await supabase
      .from('inquiry_messages')
      .select('*')
      .eq('inquiry_id', inq.id)
      .order('sent_at');

    if (error) {
      showToast('Failed to Load Thread', error.message, 'error');
    } else {
      threadMessages.value[inq.id] = (data as InquiryMessage[]) || [];
    }
    threadLoading.value[inq.id] = false;
  }
};

const sendReply = async (inq: Inquiry) => {
  const body = (replyDrafts.value[inq.id] || '').trim();
  const profile = authStore.profile;
  if (!body || !profile) return;

  sendingReply.value[inq.id] = true;

  const { data, error } = await supabase
    .from('inquiry_messages')
    .insert({
      inquiry_id: inq.id,
      sender_id: profile.id,
      sender_name: profile.full_name,
      message_body: body,
    })
    .select('*')
    .single();

  if (error) {
    showToast('Failed to Send Reply', error.message, 'error');
    sendingReply.value[inq.id] = false;
    return;
  }

  if (!threadMessages.value[inq.id]) threadMessages.value[inq.id] = [];
  threadMessages.value[inq.id].push(data as InquiryMessage);
  replyDrafts.value[inq.id] = '';

  // First admin reply on a Pending inquiry bumps it to Contacted.
  if (inq.status === 'Pending') {
    const { error: statusError } = await supabase
      .from('inquiries')
      .update({ status: 'Contacted' })
      .eq('id', inq.id);
    if (!statusError) {
      inq.status = 'Contacted';
    }
  }

  showToast('Reply Sent', `Your reply to ${inq.prospect_name} was sent.`, 'success');
  sendingReply.value[inq.id] = false;
};

const closeInquiry = async (inq: Inquiry) => {
  const { error } = await supabase
    .from('inquiries')
    .update({ status: 'Closed' })
    .eq('id', inq.id);

  if (error) {
    showToast('Failed to Close Inquiry', error.message, 'error');
    return;
  }

  inq.status = 'Closed';
  showToast('Inquiry Closed', `Inquiry from ${inq.prospect_name} has been marked as closed.`, 'info');
};

// Convert-to-Tenant modal state
const showConvertModal = ref(false);
const convertingInquiry = ref<Inquiry | null>(null);
const availableRooms = ref<AvailableRoom[]>([]);
const loadingRooms = ref(false);
const convertSubmitting = ref(false);

const convertForm = ref({
  fullName: '',
  email: '',
  phoneNumber: '',
  roomId: '',
  startDate: new Date().toISOString().slice(0, 10),
  occupantCount: 1,
  depositAmount: null as number | null,
});

const openConvertModal = async (inq: Inquiry) => {
  convertingInquiry.value = inq;
  convertForm.value = {
    fullName: inq.prospect_name,
    email: inq.prospect_email,
    phoneNumber: inq.prospect_phone,
    roomId: '',
    startDate: new Date().toISOString().slice(0, 10),
    occupantCount: 1,
    depositAmount: null,
  };
  showConvertModal.value = true;

  loadingRooms.value = true;
  const { data, error } = await supabase
    .from('rooms')
    .select('id, room_number')
    .eq('operational_status', 'Available')
    .order('room_number');

  if (error) {
    showToast('Failed to Load Available Rooms', error.message, 'error');
    availableRooms.value = [];
  } else {
    availableRooms.value = (data as AvailableRoom[]) || [];
    // Default to the inquiry's own room only if it's still Available;
    // otherwise leave it for the admin to pick since it may have been taken.
    const stillAvailable = availableRooms.value.some((r) => r.id === inq.room_id);
    convertForm.value.roomId = stillAvailable ? inq.room_id : (availableRooms.value[0]?.id || '');
  }
  loadingRooms.value = false;
};

const closeConvertModal = () => {
  showConvertModal.value = false;
  convertingInquiry.value = null;
};

const submitConvert = async () => {
  if (!convertingInquiry.value) return;

  if (!convertForm.value.roomId) {
    showToast('Select a Room', 'Please select an available room before converting this prospect.', 'error');
    return;
  }

  convertSubmitting.value = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/tenants/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        email: convertForm.value.email,
        fullName: convertForm.value.fullName,
        phoneNumber: convertForm.value.phoneNumber,
        roomId: convertForm.value.roomId,
        startDate: convertForm.value.startDate,
        occupantCount: convertForm.value.occupantCount,
        depositAmount: convertForm.value.depositAmount ?? undefined,
        inquiryId: convertingInquiry.value.id,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      showToast('Conversion Failed', json?.error?.message || 'Failed to onboard tenant.', 'error');
      convertSubmitting.value = false;
      return;
    }

    showToast(
      'Tenant Onboarded',
      `Share this temporary password with ${convertForm.value.fullName}: ${json.data.tempPassword}`,
      'success',
      12000
    );

    showConvertModal.value = false;
    convertingInquiry.value = null;
    await fetchInquiries();
  } catch (err) {
    showToast('Conversion Failed', err instanceof Error ? err.message : 'Network error while onboarding tenant.', 'error');
  } finally {
    convertSubmitting.value = false;
  }
};

onMounted(fetchInquiries);
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Inquiries Inbox</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Public Prospect Inquiries</h1>
      </div>
    </div>

    <!-- Loading / Empty States -->
    <div v-if="loadingInquiries" class="jira-card p-6 text-center text-xs text-[#6b778c]">
      Loading inquiries...
    </div>
    <div v-else-if="inquiries.length === 0" class="jira-card p-6 text-center text-xs text-[#6b778c]">
      No prospect inquiries yet.
    </div>

    <!-- Inquiries Cards Stack -->
    <div v-else class="space-y-3">
      <div v-for="inq in inquiries" :key="inq.id" class="jira-card p-4 space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#dfe1e6] pb-2">
          <div>
            <span class="font-bold text-[#172b4d] text-sm">{{ inq.prospect_name }}</span>
            <span class="text-xs text-[#6b778c] ml-2">
              • Inquiring for
              <strong class="text-[#0c66e4]">Room {{ inq.rooms?.room_number ?? '—' }}</strong>
            </span>
          </div>

          <span :class="['jira-badge', statusBadgeClass(inq.status)]">
            {{ inq.status }}
          </span>
        </div>

        <p class="text-xs text-[#172b4d] bg-[#f4f5f7] p-2.5 rounded-xs border border-[#dfe1e6]">
          "{{ inq.message }}"
        </p>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#6b778c] pt-1">
          <div class="flex items-center gap-4">
            <span>Phone: {{ inq.prospect_phone }}</span>
            <span>Email: {{ inq.prospect_email }}</span>
            <span>Date: {{ new Date(inq.created_at).toLocaleDateString() }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              v-if="inq.status === 'Pending' || inq.status === 'Contacted'"
              @click="closeInquiry(inq)"
              class="jira-btn-secondary text-[11px] py-1 px-2.5"
            >
              <XCircle class="w-3 h-3" />
              <span>Close</span>
            </button>

            <button
              v-if="inq.status === 'Pending' || inq.status === 'Contacted'"
              @click="openConvertModal(inq)"
              class="jira-btn-primary text-[11px] py-1 px-2.5"
            >
              <UserPlus class="w-3 h-3" />
              <span>Convert to Tenant</span>
            </button>

            <button @click="toggleThread(inq)" class="jira-btn-secondary text-[11px] py-1 px-2.5">
              <MessageSquare class="w-3 h-3" />
              <span>{{ expandedId === inq.id ? 'Hide Thread' : 'View Thread / Reply' }}</span>
              <ChevronUp v-if="expandedId === inq.id" class="w-3 h-3" />
              <ChevronDown v-else class="w-3 h-3" />
            </button>
          </div>
        </div>

        <!-- Message Thread + Reply Box -->
        <div v-if="expandedId === inq.id" class="pt-2 border-t border-[#dfe1e6] space-y-2.5">
          <div v-if="threadLoading[inq.id]" class="text-[11px] text-[#6b778c] py-2">Loading thread...</div>

          <div v-else class="space-y-2">
            <div v-if="(threadMessages[inq.id] || []).length === 0" class="text-[11px] text-[#6b778c] italic">
              No messages yet — the original inquiry above is the first contact.
            </div>

            <div
              v-for="msg in threadMessages[inq.id]"
              :key="msg.id"
              :class="[
                'max-w-[85%] p-2.5 rounded-xs text-xs',
                msg.sender_id
                  ? 'ml-auto bg-[#deebff] text-[#0747a6]'
                  : 'bg-[#f4f5f7] text-[#172b4d] border border-[#dfe1e6]'
              ]"
            >
              <div class="flex items-center justify-between gap-3 mb-0.5">
                <span class="font-semibold text-[11px]">{{ msg.sender_id ? msg.sender_name + ' (Admin)' : msg.sender_name }}</span>
                <span class="text-[10px] opacity-70">{{ new Date(msg.sent_at).toLocaleString() }}</span>
              </div>
              <p>{{ msg.message_body }}</p>
            </div>
          </div>

          <div class="flex items-end gap-2 pt-1">
            <textarea
              v-model="replyDrafts[inq.id]"
              rows="2"
              placeholder="Type a reply to the prospect..."
              class="flex-1 p-2 text-xs bg-white border border-[#dfe1e6] rounded-xs focus:outline-none focus:border-[#0c66e4]"
            ></textarea>
            <button
              @click="sendReply(inq)"
              :disabled="sendingReply[inq.id] || !replyDrafts[inq.id]?.trim()"
              class="jira-btn-primary text-[11px] py-1.5 px-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send class="w-3 h-3" />
              <span>{{ sendingReply[inq.id] ? 'Sending...' : 'Send' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Convert to Tenant Modal -->
    <div v-if="showConvertModal && convertingInquiry" class="fixed inset-0 bg-[#091e4252] backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-md p-5 bg-white shadow-xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-base text-[#172b4d]">Convert Prospect to Tenant</h3>
          <button @click="closeConvertModal" class="text-[#6b778c] hover:text-[#172b4d]">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Full Name</label>
            <input v-model="convertForm.fullName" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Email</label>
              <input v-model="convertForm.email" type="email" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Phone Number</label>
              <input v-model="convertForm.phoneNumber" type="text" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Assign Room</label>
            <select v-model="convertForm.roomId" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs">
              <option value="" disabled>{{ loadingRooms ? 'Loading available rooms...' : 'Select a room' }}</option>
              <option v-for="room in availableRooms" :key="room.id" :value="room.id">
                Room {{ room.room_number }}
              </option>
            </select>
            <p v-if="!loadingRooms && availableRooms.length === 0" class="text-[10px] text-rose-600 mt-1">
              No rooms currently marked Available.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Move-in Start Date</label>
              <input v-model="convertForm.startDate" type="date" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
            <div>
              <label class="block font-semibold text-[#5e6c84] mb-1">Occupant Count</label>
              <input v-model.number="convertForm.occupantCount" type="number" min="1" class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs" />
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#5e6c84] mb-1">Deposit Amount (₱) — optional</label>
            <input
              v-model.number="convertForm.depositAmount"
              type="number"
              min="0"
              placeholder="Defaults to the room's current rent"
              class="w-full p-1.5 bg-white border border-[#dfe1e6] rounded-xs"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#dfe1e6]">
          <button @click="closeConvertModal" class="jira-btn-secondary">Cancel</button>
          <button
            @click="submitConvert"
            :disabled="convertSubmitting"
            class="jira-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight class="w-3.5 h-3.5" />
            <span>{{ convertSubmitting ? 'Onboarding...' : 'Onboard Tenant' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
