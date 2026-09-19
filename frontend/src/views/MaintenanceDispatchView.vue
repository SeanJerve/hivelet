<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { ref, computed, onMounted } from 'vue';
import { 
  maintenanceTickets, 
  fetchMaintenanceTickets, 
  maintenanceTicketsFetchFailed,
  rooms, 
  fetchRooms, 
  TECHNICIANS,
  TICKET_CATEGORIES,
  showToast,
  type MaintenanceTicket
} from '@/lib/systemState';
import { api } from '@/lib/api';
import { 
  Plus, 
  Search, 
  Wrench, 
  CheckCircle2, 
  UserCheck, 
  Pencil, 
  Trash2, 
  X, 
  Loader2, 
  ReceiptText,
  Check,
  ChevronDown,
  AlertTriangle,
  Clock,
  AlertCircle
} from 'lucide-vue-next';
import Skeleton from '@/components/ui/Skeleton.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import StatusPill from '@/components/overview/StatusPill.vue';

const q = ref('');
const statusFilter = ref('All');
const isLoading = ref(false);
const isSubmitting = ref(false);

// Edit / Manage Ticket Modal State
const isEditModalOpen = ref(false);
const editingTicket = ref<MaintenanceTicket | null>(null);
const editTitle = ref('');
const editUnit = ref('1a');
const editCategory = ref('Plumbing');
const editPriority = ref<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
const editStatus = ref<'Open' | 'In Progress' | 'Resolved' | 'Closed'>('Open');

/**
 * Resolved and Closed are both "no longer on the board", and several counts here mean that
 * rather than Resolved specifically. They were written as `status === 'Resolved'`, which was
 * complete only while Closed did not exist in this layer.
 */
const DONE_STATUSES = ['Resolved', 'Closed'];
const isDone = (s: string) => DONE_STATUSES.includes(s);
const editTech = ref('Unassigned');
const editDesc = ref('');

// Custom Confirmation Dialog State
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<(() => void) | null>(null);

function showConfirm(titleText: string, messageText: string, action: () => void) {
  confirmTitle.value = titleText;
  confirmMessage.value = messageText;
  confirmAction.value = action;
  isConfirmOpen.value = true;
}

function handleConfirmAccept() {
  const action = confirmAction.value;
  isConfirmOpen.value = false;
  if (action) {
    action();
  }
}

async function fetchTickets() {
  isLoading.value = true;
  try {
    await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
  } catch (err) {
    console.error('fetchTickets failed:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchTickets();
});

const PRIORITY_RANK: Record<string, number> = {
  Emergency: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const filtered = computed(() => {
  const list = maintenanceTickets.filter((t) => {
    const query = q.value.toLowerCase().trim();
    const matchesQ =
      !query ||
      t.title.toLowerCase().includes(query) ||
      t.unit.toLowerCase().includes(query) ||
      t.technician.toLowerCase().includes(query);
    const matchesStatus = statusFilter.value === 'All' || t.status === statusFilter.value;
    return matchesQ && matchesStatus;
  });

  return list.slice().sort((a, b) => {
    // 1. Put Resolved tickets at the bottom (0 for active, 1 for resolved)
    const aIsResolved = isDone(a.status) ? 1 : 0;
    const bIsResolved = isDone(b.status) ? 1 : 0;
    if (aIsResolved !== bIsResolved) {
      return aIsResolved - bIsResolved;
    }

    // 2. For active tickets, keep order by priority (Emergency -> High -> Medium -> Low)
    if (!aIsResolved) {
      const pA = PRIORITY_RANK[a.priority] ?? 2;
      const pB = PRIORITY_RANK[b.priority] ?? 2;
      if (pA !== pB) return pA - pB;
    }

    // 3. Secondary sort by reported date or ID
    return (b.id || '').localeCompare(a.id || '');
  });
});

/**
 * The board reads as the work does: what has not been dispatched, what a
 * technician is on, and what is finished. Same tickets, same filters and same
 * sort as the table it replaces, grouped by the status column instead of
 * repeating it in every row.
 */
const columns = computed(() => [
  {
    key: 'open',
    title: 'To dispatch',
    caption: 'No technician assigned yet',
    tickets: filtered.value.filter((t) => t.status === 'Open'),
  },
  {
    key: 'progress',
    title: 'In progress',
    caption: 'A technician is on it',
    tickets: filtered.value.filter((t) => t.status === 'In Progress'),
  },
  {
    key: 'done',
    title: 'Done',
    caption: 'Resolved or closed',
    tickets: filtered.value.filter((t) => isDone(t.status)),
  },
]);

const isUrgent = (p: string) => p === 'Emergency' || p === 'High';

const ticketMessages = ref<any[]>([]);
const loadingMessages = ref(false);
const newAdminMessage = ref('');
const sendingAdminMessage = ref(false);

async function loadTicketMessages(ticketId: string) {
  loadingMessages.value = true;
  ticketMessages.value = [];
  try {
    const res = await api.get<any[]>(`/admin/tickets/${ticketId}/messages`);
    if (res && Array.isArray(res)) {
      ticketMessages.value = res;
    }
  } catch {
    // Non-blocking
  } finally {
    loadingMessages.value = false;
  }
}

async function handleSendAdminComment() {
  const text = newAdminMessage.value.trim();
  if (!text || !editingTicket.value) return;

  sendingAdminMessage.value = true;
  try {
    const res = await api.post<any>(`/admin/tickets/${editingTicket.value.id}/messages`, {
      message: text,
    });
    if (res) {
      ticketMessages.value.push(res);
      newAdminMessage.value = '';
      showToast('success', 'Comment sent', 'Resident has been notified of your message.');
    }
  } catch (err: any) {
    showToast('error', 'Failed to send comment', err?.message || 'Could not post message.');
  } finally {
    sendingAdminMessage.value = false;
  }
}

function openEditModal(t: MaintenanceTicket) {
  editingTicket.value = t;
  editTitle.value = t.title;
  editUnit.value = t.unit.toLowerCase();
  editCategory.value = t.category || 'General';
  editPriority.value = t.priority;
  editStatus.value = t.status;
  editTech.value = t.technician || 'Unassigned';
  editDesc.value = t.description;
  newAdminMessage.value = '';
  isEditModalOpen.value = true;
  loadTicketMessages(t.id);
}

async function handleSaveEditTicket() {
  if (!editingTicket.value) return;
  isSubmitting.value = true;
  try {
    const ticketId = editingTicket.value.id;
    
    // Immediate reactive update to UI state
    const t = maintenanceTickets.find(item => item.id === ticketId);
    if (t) {
      t.title = editTitle.value;
      t.unit = editUnit.value.toUpperCase();
      t.category = editCategory.value;
      t.priority = editPriority.value;
      t.status = editStatus.value;
      t.technician = editTech.value;
      t.description = editDesc.value;
    }

    // No inner catch. The failure was swallowed here with a console warning while
    // the local ticket object had ALREADY been mutated above, so the board showed
    // the new status and technician and announced "updated successfully" with
    // nothing changed in the database - until the refetch below quietly put the
    // old values back. The outer catch reports it instead.
    await api.patch(`/admin/tickets/${ticketId}`, {
      title: editTitle.value,
      roomNumber: editUnit.value.toUpperCase(),
      category: editCategory.value,
      priority: editPriority.value,
      status: editStatus.value,
      assignedTechnician: editTech.value,
      description: editDesc.value,
    });

    await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
    showToast('success', 'Ticket updated', `Ticket #${ticketId} updated successfully.`);
    isEditModalOpen.value = false;
    editingTicket.value = null;
  } catch (err: any) {
    showToast('error', 'Update failed', err?.message || 'Could not update ticket.');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleQuickDispatch() {
  if (!editingTicket.value) return;

  /**
   * This used to auto-assign `TECHNICIANS[1]` - "Mang Ruel (Plumbing)" - to any
   * unassigned ticket it dispatched, whatever the ticket was about. An
   * electrical fault got the plumber, and the name was written to
   * `maintenance_tickets.assigned_technician`, which is a real column on a real
   * record.
   *
   * Dispatching is the administrator saying who is going. The system guessing on
   * her behalf produces a record that reads like a decision she made.
   */
  if (editTech.value === 'Unassigned') {
    showToast(
      'error',
      'Choose a technician first',
      'Pick who is attending this ticket before dispatching it.'
    );
    return;
  }

  editStatus.value = 'In Progress';
  await handleSaveEditTicket();
}

async function handleQuickResolve() {
  if (!editingTicket.value) return;
  editStatus.value = 'Resolved';
  await handleSaveEditTicket();
}

function handleDeleteTicketPrompt() {
  if (!editingTicket.value) return;
  const ticketId = editingTicket.value.id;
  const unitCode = editingTicket.value.unit;

  showConfirm(
    'Delete Maintenance Ticket',
    `Are you sure you want to delete Ticket #${ticketId} for Unit ${unitCode}? This will remove the maintenance record and restore the unit status if no other active repairs exist.`,
    async () => {
      isSubmitting.value = true;
      try {
        // The delete must succeed before anything is removed from the screen.
        //
        // The failure was swallowed here with a console warning, the ticket was
        // spliced out of local state regardless, and a "successfully removed"
        // toast followed. The row was still in the database, so it reappeared on
        // the next refresh - after the landlady had been told it was gone.
        await api.delete(`/admin/tickets/${ticketId}`);

        const idx = maintenanceTickets.findIndex(t => t.id === ticketId);
        if (idx !== -1) {
          maintenanceTickets.splice(idx, 1);
        }

        await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
        isEditModalOpen.value = false;
        editingTicket.value = null;
        showToast('success', 'Ticket deleted', `Ticket #${ticketId} was successfully removed.`);
      } catch (err: unknown) {
        showToast(
          'error',
          'Ticket not deleted',
          err instanceof Error ? err.message : 'The ticket could not be removed. It is still on the board.'
        );
      } finally {
        isSubmitting.value = false;
      }
    }
  );
}
</script>

<template>
  <div class="ws-focus flex flex-col gap-5 text-ink">
    <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <h1 class="mt-1 text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">Repairs</h1>
        <p class="mt-1 text-sm text-ink-soft">
          What residents have reported, who is attending it, and what is finished.
        </p>
      </div>
    </header>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label class="ws-field flex-1">
        Search by title, unit or technician
        <span class="relative">
          <Search class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input v-model="q" type="search" class="ws-input pl-10" />
        </span>
      </label>
      <label class="ws-field sm:w-56">
        Status
        <select v-model="statusFilter" class="ws-select">
          <option value="All">Every status</option>
          <option value="Open">To dispatch</option>
          <option value="In Progress">In progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </label>
    </div>

    <div v-if="isLoading" class="grid gap-4 lg:grid-cols-3" aria-busy="true">
      <span class="sr-only" role="status">Loading repair requests</span>
      <div v-for="i in 3" :key="i" class="rounded-tile bg-tile p-6 flex flex-col gap-3">
        <Skeleton class-name="h-4 w-28 rounded-full" />
        <Skeleton class-name="h-16 w-full rounded-2xl" />
        <Skeleton class-name="h-16 w-full rounded-2xl" />
      </div>
    </div>

    <!--
      A failed load must not read as an empty board.

      `maintenanceTicketsFetchFailed` already existed and was already set by
      `fetchMaintenanceTickets`; AdminOverviewView reads it. This screen - the
      one the landlady actually opens to see outstanding repairs - never did, so
      a refused or broken request left the array untouched and rendered three
      columns of "Nothing here." with 0 counts. "No outstanding repairs",
      asserted from a failure. The same false affirmative the fifth sweep fixed
      for the dashboard's KPI cards.
    -->
    <UnavailableNote
      v-else-if="maintenanceTicketsFetchFailed"
      message="The repair requests could not be loaded. That is not the same as there being none — nothing is shown rather than an empty board."
      @retry="fetchTickets"
    />

    <div v-else class="grid gap-4 lg:grid-cols-3">
      <section
        v-for="col in columns"
        :key="col.key"
        :aria-labelledby="`col-${col.key}`"
        class="rounded-tile bg-tile p-5 sm:p-6 flex flex-col gap-4 min-w-0"
      >
        <header class="flex items-start justify-between gap-3">
          <div>
            <h2 :id="`col-${col.key}`" class="text-[0.9375rem] leading-5 font-semibold">{{ col.title }}</h2>
            <p class="mt-0.5 text-xs text-ink-faint">{{ col.caption }}</p>
          </div>
          <span class="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold tabular text-ink-soft">
            {{ col.tickets.length }}
          </span>
        </header>

        <p v-if="col.tickets.length === 0" class="py-4 text-sm text-ink-soft">Nothing here.</p>

        <ul v-else class="flex flex-col gap-3">
          <li
            v-for="t in col.tickets"
            :key="t.id"
            class="rounded-2xl border border-line p-4 flex flex-col gap-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium leading-snug">{{ t.title }}</p>
                <p class="mt-0.5 text-xs text-ink-faint">
                  Unit {{ t.unit.toUpperCase() }}, {{ t.category }}
                </p>
              </div>
              <StatusPill :tone="isUrgent(t.priority) ? 'overdue' : 'neutral'">{{ t.priority }}</StatusPill>
            </div>

            <dl class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
              <div class="flex gap-1.5">
                <dt class="text-ink-faint">Reported</dt>
                <dd>{{ t.reported }}</dd>
              </div>
              <div class="flex gap-1.5">
                <dt class="text-ink-faint">Technician</dt>
                <dd>{{ t.technician || 'Unassigned' }}</dd>
              </div>
            </dl>

            <button type="button" class="pill-btn self-start" @click="openEditModal(t)">
              <Pencil class="size-4 text-ink-soft" aria-hidden="true" />
              Manage
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- Edit & Manage Ticket Modal -->
    <WsModal
      v-if="isEditModalOpen && editingTicket"
      title="Manage this repair"
      :subtitle="`Unit ${editingTicket.unit.toUpperCase()}, reported ${editingTicket.reported}`"
      size="lg"
      :dismissible="false"
      @close="isEditModalOpen = false"
    >

        <!-- Quick Action Shortcuts Bar -->
        <div class="p-3 bg-canvas border border-line rounded-xl flex items-center justify-between gap-3 text-xs">
          <span class="font-semibold text-ink-soft text-xs">Quick Actions:</span>
          <div class="flex items-center gap-2">
            <button
              v-if="editStatus !== 'In Progress' && editStatus !== 'Resolved' && editStatus !== 'Closed'"
              type="button"
              @click="handleQuickDispatch"
              class="pill-btn px-3 py-1 text-xs gap-1.5 inline-flex items-center cursor-pointer"
            >
              <UserCheck class="size-3.5 text-brand" />
              <span>Dispatch Tech</span>
            </button>
            <!--
              This button said "Close / Resolve" and its companion "Ticket Resolved &
              Closed", while the only status either ever wrote was 'Resolved'. Closed is a
              separate value in `ticket_status_type` and is now available in the Status
              dropdown above, so these say what they actually do.
            -->
            <button
              v-if="editStatus !== 'Resolved' && editStatus !== 'Closed'"
              type="button"
              @click="handleQuickResolve"
              class="pill-btn-brand px-3 py-1 text-xs gap-1.5 inline-flex items-center cursor-pointer"
            >
              <CheckCircle2 class="size-3.5 text-white" />
              <span>Mark Resolved</span>
            </button>
            <span v-else class="text-xs font-semibold text-brand inline-flex items-center gap-1">
              <Check class="size-4" /> Ticket {{ editStatus }}
            </span>
          </div>
        </div>

        <form @submit.prevent="handleSaveEditTicket" class="space-y-4 text-xs">
          <!-- Issue Title -->
          <label class="ws-field">
              What is wrong
            <input v-model="editTitle" class="ws-input w-full" required />
          </label>

          <!-- Unit Code & Category -->
          <div class="grid grid-cols-2 gap-3">
            <label class="ws-field">
              Unit
              <select v-model="editUnit" class="ws-select w-full" required>
                <option v-for="r in rooms" :key="r.id" :value="r.unitCode.toLowerCase()">
                  {{ r.unitCode.toUpperCase() }} ({{ r.cluster }})
                </option>
              </select>
            </label>
            <label class="ws-field">
              Category
              <select v-model="editCategory" class="ws-select w-full" required>
                <option v-for="cat in TICKET_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </label>
          </div>

          <!-- Priority & Status -->
          <div class="grid grid-cols-2 gap-3">
            <label class="ws-field">
              Priority
              <select v-model="editPriority" class="ws-select w-full" required>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </label>
            <label class="ws-field">
              Status
              <select v-model="editStatus" class="ws-select w-full" required>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
          </div>

          <!-- Assigned Technician -->
          <label class="ws-field">
              Who is going
            <select v-model="editTech" class="ws-select w-full">
              <option v-for="tech in TECHNICIANS" :key="tech" :value="tech">{{ tech }}</option>
            </select>
          </label>

          <!-- Description -->
          <label class="ws-field">
              What was reported, and what was done
            <textarea v-model="editDesc" rows="3" class="ws-textarea w-full" placeholder="Details regarding the maintenance request..."></textarea>
          </label>

          <!-- Resident Photo Attachment (if present) -->
          <div v-if="editingTicket?.photo" class="space-y-1.5 pt-2 border-t border-line">
            <label class="block font-semibold text-xs text-ink-soft">
              Resident Photo Attachment
            </label>
            <div class="flex flex-col items-center rounded-2xl bg-canvas p-3">
              <a :href="editingTicket.photo" target="_blank" rel="noopener noreferrer" class="group relative block overflow-hidden rounded-lg">
                <img :src="editingTicket.photo" alt="Ticket Attachment" class="max-h-52 w-auto object-contain rounded-lg transition-transform group-hover:scale-102" />
                <span class="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-0.5 rounded font-medium">Click to view original</span>
              </a>
            </div>
          </div>

          <!-- Resident Communication Dialogue Stream -->
          <div class="pt-3 border-t border-line space-y-2">
            <label class="block font-semibold text-xs text-ink-soft">
              Resident Communication &amp; Follow-up Notes
            </label>

            <!-- Message Stream Box -->
            <div class="max-h-36 space-y-2 overflow-y-auto rounded-2xl bg-canvas p-3 text-sm">
              <div v-if="loadingMessages" class="py-2 text-center text-ink-faint text-xs">
                Loading conversation thread...
              </div>
              <div v-else-if="ticketMessages.length === 0" class="py-2 text-center text-ink-faint text-xs">
                No comments on this ticket yet.
              </div>
              <div
                v-for="msg in ticketMessages"
                :key="msg.id"
                :class="['flex flex-col', msg.profiles?.role === 'admin' ? 'items-end' : 'items-start']"
              >
                <div
                  :class="[ 'max-w-[85%] rounded-xl px-3 py-1.5 text-xs', msg.profiles?.role === 'admin' ? 'bg-night text-white' : 'bg-tile border border-line text-ink' ]"
                >
                  <p class="font-semibold text-xs opacity-75 mb-0.5">
                    {{ msg.profiles?.role === 'admin' ? 'You (Landlady)' : (msg.profiles?.full_name || 'Resident') }}
                  </p>
                  <p>{{ msg.message_body }}</p>
                  <p class="text-[9px] opacity-60 text-right mt-0.5">
                    {{ new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Quick Comment Box -->
            <div class="flex gap-2">
              <label for="dispatch-reply" class="sr-only">Write back to the resident</label>
              <input
                id="dispatch-reply"
                v-model="newAdminMessage"
                @keydown.enter.prevent="handleSendAdminComment"
                placeholder="Write back to the resident"
                class="ws-input flex-1"
              />
              <button
                type="button"
                @click="handleSendAdminComment"
                :disabled="sendingAdminMessage || !newAdminMessage.trim()"
                class="pill-btn-brand shrink-0"
              >
                Send
              </button>
            </div>
          </div>

          <!-- Modal Action Footer -->
          <div class="pt-4 border-t border-line flex items-center justify-between gap-3">
            <button 
              type="button" 
              @click="handleDeleteTicketPrompt" 
              class="pill-btn-danger-quiet"
            >
              <Trash2 class="size-3.5" />
              <span>Delete Ticket</span>
            </button>

            <div class="flex items-center gap-2">
              <button type="button" @click="isEditModalOpen = false" class="pill-btn">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
                <Check v-else class="size-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
    </WsModal>

    <ConfirmDialog
      v-if="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-label="Delete ticket"
      destructive
      :busy="isSubmitting"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmAccept"
    />
  </div>
</template>
