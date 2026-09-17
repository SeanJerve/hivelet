<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  maintenanceTickets, 
  fetchMaintenanceTickets, 
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
  RefreshCw, 
  Loader2, 
  ReceiptText,
  Check,
  ChevronDown,
  AlertTriangle,
  Clock,
  AlertCircle
} from 'lucide-vue-next';
import SkeletonTable from '@/components/ui/SkeletonTable.vue';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';

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

const openCount = computed(() => maintenanceTickets.filter((t) => t.status === 'Open').length);
const inProgressCount = computed(() => maintenanceTickets.filter((t) => t.status === 'In Progress').length);
const resolvedCount = computed(() => maintenanceTickets.filter((t) => isDone(t.status)).length);

function getPriorityBadgeClass(p: string) {
  if (p === 'Emergency') return 'badge-danger';
  if (p === 'High') return 'badge-warning';
  if (p === 'Medium') return 'badge-info';
  return 'badge-neutral';
}

function getStatusBadgeClass(s: string) {
  if (s === 'Resolved') return 'badge-success';
  if (s === 'Closed') return 'badge-neutral';
  if (s === 'In Progress') return 'badge-info';
  return 'badge-warning';
}

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
  <div class="space-y-6">
    <!-- Header with Breadcrumbs -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-ink-soft mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-semibold text-ink">Maintenance Dispatch</span>
        </div>
        <h1 class="text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          Maintenance Dispatch Board
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-ink-soft">
          Track repair requests, dispatch technicians, and resolve resident work orders.
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          @click="fetchTickets"
          :disabled="isLoading"
          class="pill-btn"
          title="Refresh Maintenance Data"
        >
          <RefreshCw :class="['size-3.5 text-ink-soft', isLoading ? 'animate-spin text-brand' : '']" />
          <span class="font-semibold">{{ isLoading ? 'Refreshing Table…' : 'Refresh Table' }}</span>
        </button>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-tile bg-tile p-5">
        <p class="text-xs font-semibold text-ink-soft">Open Tickets</p>
        <p class="tabular mt-2 text-2xl sm:text-3xl font-semibold text-ink">{{ openCount }}</p>
        <p class="mt-1 text-xs text-ink-soft">Awaiting technician assignment</p>
      </div>

      <div class="rounded-tile bg-tile p-5">
        <p class="text-xs font-semibold text-ink-soft">In Progress</p>
        <p class="tabular mt-2 text-2xl sm:text-3xl font-semibold text-brand">{{ inProgressCount }}</p>
        <p class="mt-1 text-xs text-ink-soft">Technician on site / active repair</p>
      </div>

      <div class="rounded-tile bg-tile p-5">
        <p class="text-xs font-semibold text-ink-soft">Resolved Tickets</p>
        <p class="tabular mt-2 text-2xl sm:text-3xl font-semibold text-brand">{{ resolvedCount }}</p>
        <p class="mt-1 text-xs text-ink-soft">Completed repairs on record</p>
      </div>
    </div>

    <!-- Table Section -->
    <div class="rounded-tile bg-tile overflow-hidden">
      <!-- Filter Bar -->
      <div class="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            v-model="q"
            type="text"
            placeholder="Search title, unit code or technician…"
            class="ws-input w-full pl-10 pr-4 sm:text-sm"
          />
        </div>

        <select
          v-model="statusFilter"
          class="ws-select sm:text-sm sm:w-56"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <!-- SKELETON LOADING STATE -->
      <div v-if="isLoading" class="p-4">
        <SkeletonTable :columns="8" :rows="6" />
      </div>

      <!-- Maintenance Tickets Table -->
      <div v-else class="max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table class="w-full text-xs sm:text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-canvas">
            <tr class="text-left text-[11px] uppercase tracking-wide text-ink-soft border-b border-line">
              <th class="whitespace-nowrap px-4 py-3 font-semibold">TICKET ID</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">UNIT</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">ISSUE TITLE &amp; CATEGORY</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">PRIORITY</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">REPORTED</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">ASSIGNED TECH</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold">STATUS</th>
              <th class="whitespace-nowrap px-4 py-3 font-semibold text-center">ACTION</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="p-8 text-center text-ink-soft bg-tile">
                No maintenance tickets found matching the search criteria.
              </td>
            </tr>
            <tr 
              v-else
              v-for="t in filtered" 
              :key="t.id"
              class="hover:bg-canvas transition-colors"
            >
              <td class="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">{{ t.id }}</td>
              <td class="whitespace-nowrap px-4 py-3 font-semibold uppercase text-ink">{{ t.unit }}</td>
              <td class="px-4 py-3">
                <p class="font-semibold text-ink leading-snug">{{ t.title }}</p>
                <p class="text-xs text-ink-soft">{{ t.category }}</p>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="['badge-soft text-xs font-semibold whitespace-nowrap', getPriorityBadgeClass(t.priority)]">
                  {{ t.priority }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">{{ t.reported }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-ink font-medium">{{ t.technician }}</td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="['badge-soft text-xs font-semibold whitespace-nowrap', getStatusBadgeClass(t.status)]">
                  {{ t.status }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-center">
                <button 
                  @click="openEditModal(t)" 
                  class="pill-btn min-h-8 px-3 py-1 text-xs gap-1.5 inline-flex items-center cursor-pointer hover:border-brand hover:text-brand"
                  title="Edit & Manage Ticket"
                >
                  <Pencil class="size-3.5 text-ink-soft" />
                  <span>Edit</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit & Manage Ticket Modal -->
    <div 
      v-if="isEditModalOpen && editingTicket" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
      @click.self="isEditModalOpen = false"
    >
      <div class="rounded-tile bg-tile w-full max-w-2xl shadow-2xl rounded-tile p-6 bg-tile space-y-4 my-6">
        <div class="flex items-center justify-between pb-3 border-b border-line">
          <div class="flex items-center gap-2.5">
            <div class="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand-soft">
              <Wrench class="size-5" />
            </div>
            <div>
              <h3 class="font-semibold text-base text-ink">
                Manage Ticket #{{ editingTicket.id }}
              </h3>
              <p class="text-xs text-ink-soft">Unit {{ editingTicket.unit.toUpperCase() }} · Reported {{ editingTicket.reported }}</p>
            </div>
          </div>
          <button @click="isEditModalOpen = false" class="p-1 rounded-lg text-ink-soft hover:bg-canvas cursor-pointer">
            <X class="size-5" />
          </button>
        </div>

        <!-- Quick Action Shortcuts Bar -->
        <div class="p-3 bg-canvas border border-line rounded-xl flex items-center justify-between gap-3 text-xs">
          <span class="font-semibold text-ink-soft text-[10px]">Quick Actions:</span>
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
          <div>
            <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">Issue Title</label>
            <input v-model="editTitle" class="ws-input w-full" required />
          </div>

          <!-- Unit Code & Category -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">Unit</label>
              <select v-model="editUnit" class="ws-select w-full" required>
                <option v-for="r in rooms" :key="r.id" :value="r.unitCode.toLowerCase()">
                  {{ r.unitCode.toUpperCase() }} ({{ r.cluster }})
                </option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">Category</label>
              <select v-model="editCategory" class="ws-select w-full" required>
                <option v-for="cat in TICKET_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
          </div>

          <!-- Priority & Status -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">Priority</label>
              <select v-model="editPriority" class="ws-select w-full" required>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">Status</label>
              <select v-model="editStatus" class="ws-select w-full" required>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <!-- Assigned Technician -->
          <div>
            <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">Assigned Technician</label>
            <select v-model="editTech" class="ws-select w-full">
              <option v-for="tech in TECHNICIANS" :key="tech" :value="tech">{{ tech }}</option>
            </select>
          </div>

          <!-- Description -->
          <div>
            <label class="block font-semibold text-[11px] text-ink-soft mb-1.5">Description &amp; Repair Notes</label>
            <textarea v-model="editDesc" rows="3" class="ws-textarea w-full" placeholder="Details regarding the maintenance request..."></textarea>
          </div>

          <!-- Resident Photo Attachment (if present) -->
          <div v-if="editingTicket?.photo" class="space-y-1.5 pt-2 border-t border-line">
            <label class="block font-semibold text-[11px] text-ink-soft">
              Resident Photo Attachment
            </label>
            <div class="rounded-xl border border-line p-3 bg-canvas flex flex-col items-center">
              <a :href="editingTicket.photo" target="_blank" rel="noopener noreferrer" class="group relative block overflow-hidden rounded-lg">
                <img :src="editingTicket.photo" alt="Ticket Attachment" class="max-h-52 w-auto object-contain rounded-lg transition-transform group-hover:scale-102" />
                <span class="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded font-medium">Click to view original</span>
              </a>
            </div>
          </div>

          <!-- Resident Communication Dialogue Stream -->
          <div class="pt-3 border-t border-line space-y-2">
            <label class="block font-semibold text-[11px] text-ink-soft">
              Resident Communication &amp; Follow-up Notes
            </label>

            <!-- Message Stream Box -->
            <div class="max-h-36 overflow-y-auto rounded-xl border border-line bg-canvas p-3 space-y-2 text-xs">
              <div v-if="loadingMessages" class="py-2 text-center text-ink-faint text-[11px]">
                Loading conversation thread...
              </div>
              <div v-else-if="ticketMessages.length === 0" class="py-2 text-center text-ink-faint text-[11px]">
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
                  <p class="font-semibold text-[10px] opacity-75 mb-0.5">
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
              <input
                v-model="newAdminMessage"
                @keydown.enter.prevent="handleSendAdminComment"
                placeholder="Type a follow-up comment for the resident…"
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
      </div>
    </div>

    <!-- Custom Confirmation Modal -->
    <div 
      v-if="isConfirmOpen" 
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isConfirmOpen = false"
    >
      <div class="rounded-tile bg-tile w-full max-w-sm shadow-2xl rounded-tile p-6 bg-tile space-y-4 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
            <ReceiptText class="w-6 h-6" />
          </div>
          <h3 class="font-semibold text-lg text-ink">{{ confirmTitle }}</h3>
          
          <div class="w-full text-left bg-canvas border border-line rounded-xl p-3.5 text-xs text-ink space-y-1 leading-relaxed whitespace-pre-line font-semibold">
            {{ confirmMessage }}
          </div>
        </div>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button 
            type="button" 
            @click="isConfirmOpen = false" 
            class="pill-btn min-w-[100px]"
          >
            Cancel
          </button>
          <button 
            type="button" 
            @click="handleConfirmAccept" 
            class="pill-btn-brand min-w-[100px]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
