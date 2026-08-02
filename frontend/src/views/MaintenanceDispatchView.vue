<script setup lang="ts">
/**
 * @component MaintenanceDispatchView
 * @description Maintenance Dispatch & Closure Authorization table for the Landlady.
 * @systemBibleRef Section 5.7 & Wireframe Specification Section 2
 * @rationale Manages issue reporting, priority triage, photo attachment modal pop-overs, and ticket closure.
 * @innovations Icon-only details pop-over modal and in-place uniform button replacement with resolved tag.
 */
import { ref, onMounted } from 'vue';
import { Eye, X } from 'lucide-vue-next';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../lib/useToast';

type TicketPriority = 'Emergency' | 'High' | 'Medium' | 'Low';
type TicketStatus = 'Submitted' | 'In Progress' | 'Resolved' | 'Closed';

interface Ticket {
  id: string;
  room_id: string;
  tenant_profile_id: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  rooms: { room_number: string } | null;
  // Disambiguated via the tenant_profile_id FK hint -- maintenance_tickets has TWO
  // foreign keys into profiles (tenant_profile_id and closed_by), so a bare
  // `profiles(full_name)` embed is rejected by PostgREST as ambiguous.
  profiles: { full_name: string } | null;
}

interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_url: string;
  file_type: string | null;
  uploaded_at: string;
  signedUrl?: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message_body: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

const authStore = useAuthStore();
const { showToast } = useToast();

const PRIORITY_RANK: Record<TicketPriority, number> = { Emergency: 0, High: 1, Medium: 2, Low: 3 };

const tickets = ref<Ticket[]>([]);
const loadingTickets = ref(true);

const activeTicketModal = ref<Ticket | null>(null);
const modalLoading = ref(false);
const attachments = ref<TicketAttachment[]>([]);
const messages = ref<TicketMessage[]>([]);
const replyText = ref('');
const sendingReply = ref(false);

const priorityBadgeClass = (priority: TicketPriority) => {
  if (priority === 'Emergency') return 'jira-badge-emergency';
  if (priority === 'High') return 'jira-badge-warning';
  return 'jira-badge-todo'; // Medium / Low
};

const statusBadgeClass = (status: TicketStatus) => {
  if (status === 'Submitted') return 'jira-badge-todo';
  if (status === 'In Progress') return 'jira-badge-warning';
  return 'jira-badge-done'; // Resolved / Closed
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA');

const fetchTickets = async () => {
  loadingTickets.value = true;
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .select('*, rooms(room_number), profiles!tenant_profile_id(full_name)')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Failed to Load Tickets', error.message, 'error');
    loadingTickets.value = false;
    return;
  }

  // Stable sort (JS Array.prototype.sort is spec-guaranteed stable) so ties within
  // the same priority keep the created_at-descending order from the query above.
  tickets.value = ((data ?? []) as Ticket[]).slice().sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  );
  loadingTickets.value = false;
};

const openTicketModal = async (ticket: Ticket) => {
  activeTicketModal.value = ticket;
  attachments.value = [];
  messages.value = [];
  replyText.value = '';
  modalLoading.value = true;

  const [attachmentsRes, messagesRes] = await Promise.all([
    supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('uploaded_at', { ascending: true }),
    supabase
      .from('ticket_messages')
      .select('*, profiles(full_name)')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true }),
  ]);

  if (attachmentsRes.error) {
    showToast('Failed to Load Attachments', attachmentsRes.error.message, 'error');
  } else {
    const rows = (attachmentsRes.data ?? []) as TicketAttachment[];
    // Bucket is private -- resolve a short-lived signed URL per attachment for viewing.
    attachments.value = await Promise.all(
      rows.map(async (a) => {
        const { data } = await supabase.storage.from('ticket-photos').createSignedUrl(a.file_url, 60);
        return { ...a, signedUrl: data?.signedUrl ?? null };
      })
    );
  }

  if (messagesRes.error) {
    showToast('Failed to Load Messages', messagesRes.error.message, 'error');
  } else {
    messages.value = (messagesRes.data ?? []) as TicketMessage[];
  }

  modalLoading.value = false;
};

const closeModal = () => {
  activeTicketModal.value = null;
  attachments.value = [];
  messages.value = [];
  replyText.value = '';
};

const sendReply = async () => {
  const ticket = activeTicketModal.value;
  const body = replyText.value.trim();
  if (!ticket || !body || !authStore.profile) return;

  sendingReply.value = true;

  const { data, error } = await supabase
    .from('ticket_messages')
    .insert({ ticket_id: ticket.id, sender_id: authStore.profile.id, message_body: body })
    .select('*, profiles(full_name)')
    .single();

  if (error) {
    showToast('Failed to Send Reply', error.message, 'error');
    sendingReply.value = false;
    return;
  }

  messages.value.push(data as TicketMessage);
  replyText.value = '';

  // First admin reply on a fresh ticket implicitly starts work on it (BR-022).
  if (ticket.status === 'Submitted') {
    const { error: statusError } = await supabase
      .from('maintenance_tickets')
      .update({ status: 'In Progress' })
      .eq('id', ticket.id);

    if (statusError) {
      showToast('Status Update Failed', statusError.message, 'error');
    } else {
      // `ticket` is the same reactive object referenced by the `tickets` list row,
      // so this mutation updates both the modal and the table in one shot.
      ticket.status = 'In Progress';
    }
  }

  showToast('Reply Sent', 'Your message has been added to the ticket thread.', 'success');
  sendingReply.value = false;
};

// BR-023: Admin has sole authority to close a maintenance ticket.
const closeTicket = async (ticket: Ticket) => {
  if (!authStore.profile) return;

  const closedAt = new Date().toISOString();
  const { error } = await supabase
    .from('maintenance_tickets')
    .update({ status: 'Closed', closed_at: closedAt, closed_by: authStore.profile.id })
    .eq('id', ticket.id);

  if (error) {
    showToast('Failed to Close Ticket', error.message, 'error');
    return;
  }

  ticket.status = 'Closed';
  ticket.closed_at = closedAt;
  ticket.closed_by = authStore.profile.id;
  showToast('Ticket Closed', `"${ticket.title}" has been marked as closed.`, 'success');
};

onMounted(fetchTickets);
</script>

<template>
  <div class="space-y-5">
    <!-- Header Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dfe1e6]">
      <div>
        <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
          <span>Hivelet Space</span>
          <span>/</span>
          <span class="font-medium text-[#172b4d]">Maintenance Dispatch</span>
        </div>
        <h1 class="text-xl font-bold text-[#172b4d]">Maintenance Dispatch & Closure Authorization</h1>
      </div>
    </div>

    <!-- Dispatch Data Table -->
    <div class="jira-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-[#f4f5f7] border-b border-[#dfe1e6] text-[#5e6c84] uppercase tracking-wider font-semibold text-[11px]">
              <th class="py-2.5 px-3">Room #</th>
              <th class="py-2.5 px-3">Issue Description</th>
              <th class="py-2.5 px-3">Priority Level</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3">Date Reported</th>
              <th class="py-2.5 px-3 text-center">Details</th>
              <th class="py-2.5 px-3 text-right">Closure Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#dfe1e6] text-[#172b4d]">
            <tr v-if="loadingTickets">
              <td colspan="7" class="py-6 px-3 text-center text-[#6b778c]">Loading tickets…</td>
            </tr>
            <tr v-else-if="tickets.length === 0">
              <td colspan="7" class="py-6 px-3 text-center text-[#6b778c]">No maintenance tickets found.</td>
            </tr>
            <tr v-for="t in tickets" v-else :key="t.id" class="hover:bg-[#f7f8f9]">
              <td class="py-2.5 px-3 font-bold text-[#172b4d]">{{ t.rooms?.room_number ?? '—' }}</td>
              <td class="py-2.5 px-3 font-medium">{{ t.title }}</td>
              <td class="py-2.5 px-3">
                <span :class="['jira-badge', priorityBadgeClass(t.priority)]">
                  {{ t.priority.toUpperCase() }}
                </span>
              </td>
              <td class="py-2.5 px-3">
                <span :class="['jira-badge', statusBadgeClass(t.status)]">
                  {{ t.status }}
                </span>
              </td>
              <td class="py-2.5 px-3 text-[#5e6c84]">{{ formatDate(t.created_at) }}</td>

              <!-- Details Pop-Over Button -->
              <td class="py-2.5 px-3 text-center">
                <button
                  @click="openTicketModal(t)"
                  class="jira-btn-secondary p-1 text-[11px]"
                  title="View Ticket Details & Photos"
                >
                  <Eye class="w-3.5 h-3.5" />
                </button>
              </td>

              <!-- Uniform In-Place Closure Action -->
              <td class="py-2.5 px-3 text-right">
                <span v-if="t.status === 'Closed'" class="jira-badge jira-badge-done">
                  ✓ CLOSED
                </span>
                <button
                  v-else
                  @click="closeTicket(t)"
                  class="jira-btn-secondary text-[11px] py-1 px-2.5"
                >
                  Close Ticket
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ticket Detail Pop-Over Modal -->
    <div v-if="activeTicketModal" class="fixed inset-0 bg-[#091e4252] backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div class="jira-card w-full max-w-lg p-5 bg-white shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
          <h3 class="font-bold text-base text-[#172b4d]">Ticket Specs — {{ activeTicketModal.rooms?.room_number ?? 'Unknown Room' }}</h3>
          <button @click="closeModal" class="text-[#6b778c] hover:text-[#172b4d]">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-3 text-xs text-[#172b4d]">
          <div>
            <span class="font-semibold text-[#5e6c84]">Reported By:</span> {{ activeTicketModal.profiles?.full_name ?? 'Unknown Tenant' }}
          </div>
          <div>
            <span class="font-semibold text-[#5e6c84]">Issue Title:</span> {{ activeTicketModal.title }}
          </div>
          <div class="flex items-center gap-2">
            <span :class="['jira-badge', priorityBadgeClass(activeTicketModal.priority)]">
              {{ activeTicketModal.priority.toUpperCase() }}
            </span>
            <span :class="['jira-badge', statusBadgeClass(activeTicketModal.status)]">
              {{ activeTicketModal.status }}
            </span>
          </div>
          <div>
            <span class="font-semibold text-[#5e6c84]">Detailed Notes:</span>
            <p class="mt-1 p-2.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-[#172b4d]">
              {{ activeTicketModal.description }}
            </p>
          </div>

          <!-- Attachments -->
          <div>
            <span class="font-semibold text-[#5e6c84]">Attached Photos:</span>
            <div v-if="modalLoading" class="text-[#6b778c] mt-1">Loading attachments…</div>
            <div v-else-if="attachments.length === 0" class="text-[#6b778c] mt-1">No attachments submitted.</div>
            <div v-else class="grid grid-cols-3 gap-2 mt-1">
              <a
                v-for="att in attachments"
                :key="att.id"
                :href="att.signedUrl ?? '#'"
                target="_blank"
                rel="noopener noreferrer"
                class="block"
              >
                <img
                  v-if="att.file_type?.startsWith('image/')"
                  :src="att.signedUrl ?? ''"
                  class="w-full h-16 object-cover rounded-xs border border-[#dfe1e6]"
                />
                <span v-else class="block text-[11px] text-[#0c66e4] underline p-1.5 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs text-center">
                  View Attachment
                </span>
              </a>
            </div>
          </div>

          <!-- Message Thread -->
          <div>
            <span class="font-semibold text-[#5e6c84]">Message Thread:</span>
            <div v-if="modalLoading" class="text-[#6b778c] mt-1">Loading messages…</div>
            <div v-else-if="messages.length === 0" class="text-[#6b778c] mt-1">No messages yet.</div>
            <div v-else class="space-y-2 mt-1 max-h-40 overflow-y-auto">
              <div v-for="m in messages" :key="m.id" class="p-2 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
                <div class="flex items-center justify-between text-[10px] text-[#6b778c] mb-0.5">
                  <span class="font-semibold text-[#172b4d]">{{ m.profiles?.full_name ?? 'Unknown Sender' }}</span>
                  <span>{{ formatDate(m.created_at) }}</span>
                </div>
                <p>{{ m.message_body }}</p>
              </div>
            </div>
          </div>

          <!-- Admin Reply -->
          <div>
            <span class="font-semibold text-[#5e6c84]">Reply to Tenant:</span>
            <textarea
              v-model="replyText"
              rows="2"
              class="w-full mt-1 p-2 bg-white border border-[#dfe1e6] rounded-xs text-xs"
              placeholder="Type a reply to the tenant…"
            ></textarea>
            <div class="flex justify-end mt-1">
              <button
                @click="sendReply"
                :disabled="sendingReply || !replyText.trim()"
                class="jira-btn-secondary text-[11px] py-1 px-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ sendingReply ? 'Sending…' : 'Send Reply' }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-3 border-t border-[#dfe1e6]">
          <button @click="closeModal" class="jira-btn-primary">Done Viewing</button>
        </div>
      </div>
    </div>
  </div>
</template>
