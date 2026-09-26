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
import PillSelect from '@/components/ui/PillSelect.vue';

const q = ref('');
const statusFilter = ref('All');
const isLoading = ref(false);
const isSubmitting = ref(false);

const statusFilterOptions = [
  { value: 'All', label: 'All statuses' },
  { value: 'Open', label: 'To dispatch' },
  { value: 'In Progress', label: 'In progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

// Edit / Manage Ticket Modal State
const isEditModalOpen = ref(false);
const editingTicket = ref<MaintenanceTicket | null>(null);
const editTitle = ref('');
const editUnit = ref('1a');
const editCategory = ref('Plumbing');
const editPriority = ref<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
const editStatus = ref<'Open' | 'In Progress' | 'Resolved' | 'Closed'>('Open');

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Emergency'];
// The same words the board and its filter use; the values are unchanged.
const STATUS_OPTIONS = [
  { value: 'Open', label: 'To dispatch' },
  { value: 'In Progress', label: 'In progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

const editUnitOptions = computed(() =>
  rooms.map((r) => ({
    value: r.unitCode.toLowerCase(),
    label: `${r.unitCode.toUpperCase()} (${r.cluster})`,
  }))
);

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

/**
 * Emergency red, High amber, the rest quiet. Emergency and High were both red,
 * so the one that cannot wait did not stand out from the one that can a little.
 */
const priorityTone = (p: string) => (p === 'Emergency' ? 'overdue' : p === 'High' ? 'verify' : 'neutral');

/** The date as well as the time: a message from last week read as if it were today's. */
function messageTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const ticketMessages = ref<any[]>([]);
const loadingMessages = ref(false);
const newAdminMessage = ref('');
const sendingAdminMessage = ref(false);
/**
 * Whether the resident's attached photo has finished loading, so it can fade
 * in rather than popping into the modal the instant the network delivers it -
 * the same jarring pop `.ws-skeleton` exists to avoid for text and figures.
 * Reset on every ticket opened, so re-opening a different ticket's photo (or
 * the same one, since the element remounts either way) fades in again rather
 * than staying at whatever opacity the last photo left it.
 */
const photoLoaded = ref(false);

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
  // The Send button is disabled while a message is in flight, but Enter in the box
  // calls this directly and was not: a second Enter before the reply landed posted
  // the same message twice, and the resident was notified twice (B-61).
  if (!text || !editingTicket.value || sendingAdminMessage.value) return;

  sendingAdminMessage.value = true;
  try {
    const res = await api.post<any>(`/admin/tickets/${editingTicket.value.id}/messages`, {
      message: text,
    });
    if (res) {
      ticketMessages.value.push(res);
      newAdminMessage.value = '';
      showToast('success', 'Message sent', 'The tenant has been notified.');
    }
  } catch (err: any) {
    showToast('error', 'Message not sent', err?.message || 'Please try again.');
  } finally {
    sendingAdminMessage.value = false;
  }
}

/**
 * The status the database holds for the open ticket, as distinct from `editStatus`,
 * which is the form's and changes before anything is saved. The quick-actions bar
 * reads this one: it said "Ticket Resolved" off `editStatus`, so a Mark Resolved
 * whose save failed still announced the ticket as resolved (B-61).
 */
const savedStatus = ref<MaintenanceTicket['status']>('Open');

function openEditModal(t: MaintenanceTicket) {
  editingTicket.value = t;
  savedStatus.value = t.status;
  editTitle.value = t.title;
  editUnit.value = t.unit.toLowerCase();
  editCategory.value = t.category || 'General';
  editPriority.value = t.priority;
  editStatus.value = t.status;
  editTech.value = t.technician || 'Unassigned';
  editDesc.value = t.description;
  newAdminMessage.value = '';
  photoLoaded.value = false;
  isEditModalOpen.value = true;
  loadTicketMessages(t.id);
}

/** True only when the PATCH succeeded, so a quick action can undo its own change. */
async function handleSaveEditTicket(): Promise<boolean> {
  if (!editingTicket.value || isSubmitting.value) return false;
  isSubmitting.value = true;
  try {
    const ticketId = editingTicket.value.id;

    /**
     * No inner catch. The failure was swallowed here with a console warning
     * while the local ticket object had ALREADY been mutated above, so the board
     * showed the new status and technician and announced "updated successfully"
     * with nothing changed in the database. The outer catch reports it instead.
     *
     * That comment used to end "- until the refetch below quietly put the old
     * values back". IT DOES NOT, on the path that matters. The refetch is on the
     * line after this call, so a throw jumps straight past it to the catch and
     * the board keeps showing the values that were never saved. The sentence was
     * true of the happy path and silent about the failing one.
     *
     * The catch now refetches, so a failed save leaves the board showing what is
     * actually in the database.
     *
     * And the board is no longer written BEFORE this call. It was updated first "for
     * speed", so for the length of the request, and for good if the refetch in the
     * catch also failed, the board showed values that had not been saved. It is
     * written below, once the PATCH has succeeded.
     */
    await api.patch(`/admin/tickets/${ticketId}`, {
      title: editTitle.value,
      roomNumber: editUnit.value.toUpperCase(),
      category: editCategory.value,
      priority: editPriority.value,
      status: editStatus.value,
      assignedTechnician: editTech.value,
      description: editDesc.value,
    });

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
    savedStatus.value = editStatus.value;

    await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
    // By title and unit: the id is a long code nobody reads.
    showToast('success', 'Repair saved', `${editTitle.value}, unit ${editUnit.value.toUpperCase()}.`);
    isEditModalOpen.value = false;
    editingTicket.value = null;
    return true;
  } catch (err: any) {
    // Put the board back to the truth before saying anything. A dispatch board
    // showing "Resolved" and a named technician for a ticket that is still Open
    // is worse than a slow one.
    await Promise.allSettled([fetchMaintenanceTickets(), fetchRooms()]);
    showToast('error', 'Not saved', err?.message || 'The repair could not be updated.');
    return false;
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
      'Choose who is going first',
      'Pick the technician under "Who is going", then press Send technician.'
    );
    return;
  }

  await quickSetStatus('In Progress');
}

async function handleQuickResolve() {
  if (!editingTicket.value) return;
  await quickSetStatus('Resolved');
}

/**
 * A quick action is one click that sets the status AND saves. If the save fails,
 * the status it set goes back, so the form does not keep an unsaved "Resolved"
 * that the next Save changes would then write without her choosing it.
 */
async function quickSetStatus(status: 'In Progress' | 'Resolved') {
  if (isSubmitting.value) return;
  const before = editStatus.value;
  editStatus.value = status;
  if (!(await handleSaveEditTicket())) editStatus.value = before;
}

function handleDeleteTicketPrompt() {
  if (!editingTicket.value) return;
  const ticketId = editingTicket.value.id;
  const unitCode = editingTicket.value.unit;
  const ticketTitle = editingTicket.value.title;

  showConfirm(
    'Delete this repair?',
    `"${ticketTitle}", unit ${unitCode.toUpperCase()}. It is removed for good. If no other repair is open for the unit, its status goes back to what it was.`,
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
        showToast('success', 'Repair deleted', `"${ticketTitle}" is no longer on the board.`);
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
          What tenants have reported, who is attending it, and what is finished.
        </p>
      </div>
    </header>

    <!--
      A column on a phone, a row from `sm` up - the same shape as the residents
      register and the room directory, so the three toolbars behave alike. The
      filter took the search box's full width rather than sitting alone at
      208px under a 343px bar; neither `shrink-0` is doing anything a wrapping
      row wants (see the residents register for what the pair of them cost
      there).
    -->
    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div class="relative w-full sm:w-80">
        <!-- left-4/pl-11, the inset the other six admin registers use for the
             same search box. This one sat 2px further left with 4px less room
             for its text. -->
        <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <label for="maintenance-search" class="sr-only">Search by title, unit or technician</label>
        <input
          id="maintenance-search"
          v-model="q"
          type="search"
          placeholder="Search"
          class="ws-input w-full pl-11"
        />
      </div>
      <div class="flex items-center gap-2 sm:ml-auto">
        <PillSelect
          v-model="statusFilter"
          :options="statusFilterOptions"
          aria-label="Filter by status"
          widthClass="w-full sm:w-52"
        />
      </div>
    </div>

    <div v-if="isLoading" class="grid gap-4 xl:grid-cols-3" aria-busy="true">
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
      message="The repair requests could not be loaded. That is not the same as there being none."
      @retry="fetchTickets"
    />

    <!-- One column until xl: at 1024 three columns were 202px and a title beside its priority pill had 28px. -->
    <div v-else class="ws-reveal grid gap-4 xl:grid-cols-3">
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
                <!--
                  `break-words`: the title is the resident's own words from
                  the ticket form (TenantTicketsView), free text, unbounded.
                  `min-w-0` on the wrapper lets the card shrink to the column,
                  but with no break-words on the text itself an unbroken run
                  (a typo with no spaces is common on a phone) does not care
                  that its wrapper shrank. Measured at the ordinary 1366px
                  desktop width the board runs at: column 176px, title
                  671px - 495px hidden by `body`'s `overflow-x: hidden`, not
                  an edge case at some narrow width.
                -->
                <p class="text-sm font-medium leading-snug break-words">{{ t.title }}</p>
                <p class="mt-0.5 text-xs text-ink-faint">
                  Unit {{ t.unit.toUpperCase() }}, {{ t.category }}
                </p>
              </div>
              <StatusPill :tone="priorityTone(t.priority)">{{ t.priority }}</StatusPill>
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
              <Pencil class="size-3.5 text-ink-soft" aria-hidden="true" />
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

        <!--
          Quick Action Shortcuts Bar.

          The label and the buttons are a column until `sm`. On one line they
          did not fit: measured inside this dialog at a 375px viewport, where
          the body column is 303px, the pair ran to x=339 - "Mark Resolved" 36px
          past the edge of the panel.
        -->
        <div class="p-3 bg-canvas border border-line rounded-xl flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span class="font-semibold text-ink-soft text-xs">Quick actions</span>
          <div class="flex flex-wrap items-center gap-2">
            <!-- `savedStatus`, not `editStatus`: this bar reports the ticket as saved. -->
            <button
              v-if="savedStatus !== 'In Progress' && savedStatus !== 'Resolved' && savedStatus !== 'Closed'"
              type="button"
              :disabled="isSubmitting"
              @click="handleQuickDispatch"
              class="pill-btn px-3 py-1 text-xs gap-1.5 inline-flex items-center cursor-pointer"
            >
              <UserCheck class="size-3.5 text-brand" aria-hidden="true" />
              <span>Send technician</span>
            </button>
            <!--
              This button said "Close / Resolve" and its companion "Ticket Resolved &
              Closed", while the only status either ever wrote was 'Resolved'. Closed is a
              separate value in `ticket_status_type` and is now available in the Status
              dropdown above, so these say what they actually do.
            -->
            <button
              v-if="savedStatus !== 'Resolved' && savedStatus !== 'Closed'"
              type="button"
              :disabled="isSubmitting"
              @click="handleQuickResolve"
              class="pill-btn-brand px-3 py-1 text-xs gap-1.5 inline-flex items-center cursor-pointer"
            >
              <CheckCircle2 class="size-3.5" aria-hidden="true" />
              <span>Mark resolved</span>
            </button>
            <span v-else class="text-xs font-semibold text-brand inline-flex items-center gap-1">
              <Check class="size-4" aria-hidden="true" /> {{ savedStatus }}
            </span>
          </div>
        </div>

        <form @submit.prevent="handleSaveEditTicket" class="space-y-4 text-xs">
          <!-- Issue Title -->
          <label class="ws-field">
              What is wrong
            <input v-model="editTitle" class="ws-input w-full" required />
          </label>

          <!--
            Unit Code & Category. One to a row on a phone: at 303px of dialog
            body, two columns leave 145px each, and the unit trigger's own label
            ("1A (Boarding House)") needs 134px of text in 92px of room - it was
            truncating to "1A (Boarding" with the cluster cut off mid-word.
          -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="ws-field">
              Unit
              <PillSelect v-model="editUnit" :options="editUnitOptions" aria-label="Unit" widthClass="w-full" />
            </label>
            <label class="ws-field">
              Category
              <PillSelect v-model="editCategory" :options="[...TICKET_CATEGORIES]" aria-label="Category" widthClass="w-full" />
            </label>
          </div>

          <!-- Priority & Status, stacked on a phone for the same reason. -->
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label class="ws-field">
              Priority
              <PillSelect v-model="editPriority" :options="PRIORITY_OPTIONS" aria-label="Priority" widthClass="w-full" />
            </label>
            <label class="ws-field">
              Status
              <PillSelect v-model="editStatus" :options="STATUS_OPTIONS" aria-label="Status" widthClass="w-full" />
            </label>
          </div>

          <!-- Assigned Technician -->
          <label class="ws-field">
              Who is going
            <PillSelect v-model="editTech" :options="[...TECHNICIANS]" aria-label="Who is going" widthClass="w-full" />
          </label>

          <!-- Description -->
          <label class="ws-field">
              What was reported, and what was done
            <textarea v-model="editDesc" rows="3" class="ws-textarea w-full" placeholder="Leak under the sink. Plumber replaced the washer."></textarea>
          </label>

          <!-- Resident Photo Attachment (if present) -->
          <div v-if="editingTicket?.photo" class="space-y-1.5 pt-2 border-t border-line">
            <p class="font-semibold text-xs text-ink-soft">
              Photo from the tenant
            </p>
            <div class="flex flex-col items-center rounded-2xl bg-canvas p-3">
              <a :href="editingTicket.photo" target="_blank" rel="noopener noreferrer" class="group relative block overflow-hidden rounded-lg">
                <!--
                  A resident's photo arrives over the network like anything
                  else on this modal, but unlike the fields around it, it used
                  to just pop into place the instant it finished loading -
                  the one element on this screen with no loading state.
                  `motion-safe:` stands in for a `prefers-reduced-motion`
                  block, since the only motion here is an opacity fade Tailwind
                  already gates correctly.
                -->
                <img
                  :src="editingTicket.photo"
                  alt="Photo the tenant attached"
                  :class="[
                    'max-h-52 w-auto object-contain rounded-lg transition-[opacity,transform] duration-300 ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.02]',
                    photoLoaded ? 'opacity-100' : 'opacity-0',
                  ]"
                  @load="photoLoaded = true"
                />
                <span class="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-0.5 rounded font-medium">Open full size</span>
              </a>
            </div>
          </div>

          <!-- Resident Communication Dialogue Stream -->
          <div class="pt-3 border-t border-line space-y-2">
            <p class="font-semibold text-xs text-ink-soft">
              Messages with the tenant
            </p>

            <!-- Message Stream Box -->
            <div class="max-h-36 space-y-2 overflow-y-auto rounded-2xl bg-canvas p-3 text-sm">
              <div v-if="loadingMessages" class="py-2 text-center text-ink-faint text-xs">
                Loading messages…
              </div>
              <div v-else-if="ticketMessages.length === 0" class="py-2 text-center text-ink-faint text-xs">
                No messages yet.
              </div>
              <div
                v-for="(msg, i) in ticketMessages"
                :key="msg.id"
                class="list-reveal-item"
                :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
                :class="['flex flex-col', msg.profiles?.role === 'admin' ? 'items-end' : 'items-start']"
              >
                <div
                  :class="[ 'max-w-[85%] rounded-xl px-3 py-1.5 text-xs', msg.profiles?.role === 'admin' ? 'bg-night text-on-night' : 'bg-tile border border-line text-ink' ]"
                >
                  <p class="font-semibold text-xs opacity-75 mb-0.5">
                    {{ msg.profiles?.role === 'admin' ? 'You' : (msg.profiles?.full_name || 'Tenant') }}
                  </p>
                  <!-- The resident's own words: a pasted link or a long run with no
                       spaces must wrap inside the bubble, not run out of it. -->
                  <p class="break-words whitespace-pre-line">{{ msg.message_body }}</p>
                  <p class="text-[0.6875rem] opacity-70 text-right mt-0.5">
                    {{ messageTime(msg.created_at) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Quick Comment Box -->
            <div class="flex gap-2">
              <label for="dispatch-reply" class="sr-only">Write back to the tenant</label>
              <input
                id="dispatch-reply"
                v-model="newAdminMessage"
                @keydown.enter.prevent="handleSendAdminComment"
                placeholder="Write back to the tenant"
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

          <!--
            Modal Action Footer. `flex-col-reverse` until `sm`, the shape the
            residents dialog already uses for a destructive action facing a
            Save: Save sits at the top of the stack where the thumb is, Delete
            at the bottom where it is not reached by accident.

            On one line the three did not fit. Measured at a 375px viewport
            inside this dialog's 303px body: the row ran to x=410, so "Save
            Changes" - the button the form exists to press - was 107px past the
            right edge of the panel.
          -->
          <div class="pt-4 border-t border-line flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <button
              type="button"
              @click="handleDeleteTicketPrompt"
              class="pill-btn-danger-quiet"
            >
              <Trash2 class="size-3.5" aria-hidden="true" />
              <span>Delete repair</span>
            </button>

            <div class="flex items-center justify-end gap-2">
              <button type="button" @click="isEditModalOpen = false" class="pill-btn">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="pill-btn-brand">
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" aria-hidden="true" />
                <Check v-else class="size-3.5" aria-hidden="true" />
                <span>Save changes</span>
              </button>
            </div>
          </div>
        </form>
    </WsModal>

    <ConfirmDialog
      v-if="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-label="Delete repair"
      destructive
      :busy="isSubmitting"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmAccept"
    />
  </div>
</template>
