<!--
  @file views/TenantTicketsView.vue
  @description Tenant Maintenance Tickets — submission form, ticket tracker with progress timeline
               modal, and tenant follow-up comment feed.
  @systemBibleRef Section 4 (Tenant Role), Section 15 (Maintenance), Section 16 (Ticket Communication)
  @businessRules BR-021 (Priority Classification), BR-022 (New tickets visible to administrator)
  @requirements FR-021, FR-022
  @innovations Progress timeline stepper (5 stages: Submitted → Reviewed → Assigned → In Progress → Resolved)
               with per-ticket note feed allowing tenant follow-up comments visible to Landlady Fe.
-->
<script setup lang="ts">
import WsModal from '@/components/ui/WsModal.vue';
import { ref, computed, onMounted } from 'vue';
import { TICKET_CATEGORIES } from '@/lib/systemState';
import { api } from '@/lib/api';
import {
  FileText,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Paperclip,
  Image as ImageIcon,
  X,
  AlertTriangle,
  Inbox,
  ChevronRight,
  ChevronDown,
  MessageSquarePlus,
  ListChecks,
  Search,
} from 'lucide-vue-next';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import PillSelect from '@/components/ui/PillSelect.vue';
import { useToast } from '@/lib/useToast';

const { showToast } = useToast();

const ticketFilterOptions = [
  { value: 'All', label: 'All Tickets' },
  { value: 'Open', label: 'Open Only' },
  { value: 'Resolved', label: 'Resolved Only' },
];

interface TicketRow {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  rooms?: { id: string; room_number: string } | null;
  ticket_attachments?: { id: string; file_url: string; file_type: string | null }[] | null;
}

interface TicketNote {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

// ---- Submission form state ------------------------------------------------
const ticketTitle = ref('');
const ticketCategory = ref('Plumbing');
const ticketPriority = ref('Medium');
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Emergency'];
const ticketDescription = ref('');
const ticketPhotoUrl = ref<string | null>(null);
const ticketPhotoName = ref('');
/**
 * The file's real type. `fileType` was hardcoded `'image/png'` on the way out,
 * so a JPEG from a phone - which is most of them - was recorded in
 * `ticket_attachments.file_type` as a PNG. An invented value, and the column
 * exists precisely to say what the thing is.
 */
const ticketPhotoType = ref('');
const ticketNotice = ref('');
const ticketError = ref('');
const submitting = ref(false);

// ---- Ticket list state ----------------------------------------------------
const tickets = ref<TicketRow[]>([]);
const loadingTickets = ref(false);
/**
 * Set when `/tenant/my-tickets` could not be read.
 *
 * Without it the catch in `fetchTickets` left `tickets` at `[]`, and an empty
 * array renders the same as a loaded-and-empty one: **"No tickets to show -
 * submit a ticket using the form and it will appear here"**, above a header
 * reading **"0 open · 0 resolved"**. A resident on a dropped connection who has
 * just filed an emergency plumbing ticket is told they have none, and files it
 * again. Same defect the bills and payments panels already carry a flag for;
 * this was the one tenant view of four the fix was never carried to.
 */
const ticketsLoadFailed = ref(false);
const searchQuery = ref('');
const expandedTicketIds = ref<Set<string>>(new Set());

function toggleTicketExpanded(ticketId: string) {
  const next = new Set(expandedTicketIds.value);
  if (next.has(ticketId)) {
    next.delete(ticketId);
  } else {
    next.add(ticketId);
  }
  expandedTicketIds.value = next;
}

function isTicketExpanded(ticketId: string): boolean {
  return expandedTicketIds.value.has(ticketId);
}

/** The room the ticket is filed against — derived server-side data, never typed by the tenant. */
const activeRoomId = ref<string | null>(null);
const activeRoomNumber = ref<string>('');

// Status filter chips. 'All' is the default so nothing is hidden on first paint.
const statusFilter = ref<'All' | 'Open' | 'Resolved'>('All');
/**
 * A repair goes Submitted, then In progress once a technician is attending it,
 * then Done. The resident sees where theirs has got to rather than one word.
 */
/**
 * How urgent a request is, in words a resident would use. "Emergency priority"
 * and "Low priority" are the system's four enum values with a noun stuck on
 * the end; these say what they mean.
 */
function priorityWord(priority: string) {
  if (priority === 'Emergency') return 'Needs someone now';
  if (priority === 'High') return 'Soon';
  if (priority === 'Medium') return 'When you can';
  return 'No rush';
}

function priorityTone(priority: string): 'overdue' | 'verify' | 'neutral' {
  if (priority === 'Emergency') return 'overdue';
  if (priority === 'High') return 'verify';
  return 'neutral';
}

const TICKET_STEPS = ['Submitted', 'In progress', 'Done'] as const;

function ticketStep(status: string) {
  if (RESOLVED_STATES.includes(status)) return 2;
  if (status === 'In Progress') return 1;
  return 0;
}

function ticketStepLabel(status: string) {
  return TICKET_STEPS[ticketStep(status)];
}


const RESOLVED_STATES = ['Resolved', 'Closed'];

const filteredTickets = computed(() => {
  let list = tickets.value;
  if (statusFilter.value !== 'All') {
    const wantResolved = statusFilter.value === 'Resolved';
    list = list.filter((t) => RESOLVED_STATES.includes(t.status) === wantResolved);
  }
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((t) => 
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }
  return list;
});

const openCount = computed(
  () => tickets.value.filter((t) => !RESOLVED_STATES.includes(t.status)).length
);
const resolvedCount = computed(
  () => tickets.value.filter((t) => RESOLVED_STATES.includes(t.status)).length
);

// ---- Timeline Modal state -------------------------------------------------
const isTimelineOpen = ref(false);
const activeTimelineTicket = ref<TicketRow | null>(null);
const timelineNotes = ref<TicketNote[]>([]);

/** Set when the conversation could not be loaded, so an empty thread is not mistaken for a quiet one. */
const timelineError = ref<string | null>(null);
const newNoteText = ref('');
const savingNote = ref(false);

/**
 * The 5-stage progress timeline for every maintenance ticket.
 * Each stage maps to known status strings from the backend / local mock.
 * @systemBibleRef Section 15 (Maintenance Workflow Stages)
 */
/**
 * The stages a ticket can actually be in.
 *
 * `ticket_status_type` in the live database has exactly four values - Submitted,
 * In Progress, Resolved, Closed - and this tracker had five stages, of which
 * **two could never be current**:
 *
 *   - "Reviewed by Landlady" was keyed to `'Open'`, which is not a value the
 *     enum has. It is the frontend's display alias for Submitted elsewhere, and
 *     this view reads the API directly, so it never arrived. Its description
 *     said "Landlady Fe has reviewed your request" - a claim no status in this
 *     system records, and one the tenant would have been shown while the ticket
 *     sat unread.
 *   - "Work In Progress" was keyed to `'In Progress'`, but `getStageIndex`
 *     returned 2 for that status, so stage 3 was never reached either.
 *
 * A tracker whose steps the record cannot reach tells the tenant less than
 * nothing. These are the four the database can prove, and Closed is shown as its
 * own stage rather than folded into Resolved, because they are different
 * outcomes to the person who filed the ticket.
 */
const TIMELINE_STAGES = [
  { key: 'Submitted',   label: 'Submitted',   desc: 'Your ticket has been received.' },
  { key: 'In Progress', label: 'In Progress', desc: 'Work on this request is underway.' },
  { key: 'Resolved',    label: 'Resolved',    desc: 'The issue has been resolved.' },
  { key: 'Closed',      label: 'Closed',      desc: 'This ticket is closed.' },
];

function getStageIndex(status: string): number {
  if (status === 'Closed') return 3;
  if (status === 'Resolved') return 2;
  if (status === 'In Progress') return 1;
  return 0; // Submitted - and anything unrecognised, which is honest about it
}

/**
 * Which thread the dialog is currently showing.
 *
 * `timelineNotes` was written by whichever `/tenant/tickets/:id/messages` call
 * returned LAST, not by the one belonging to the ticket on screen. Open ticket
 * A, let it hang, close it, open ticket B: A's response arrives second and
 * replaces B's thread while B's title is on the dialog. `closeTimeline` did not
 * cancel anything either, so a reply could land in a dialog that had been shut.
 *
 * A monotonic token rather than an id comparison, so reopening the SAME ticket
 * also discards the earlier flight.
 */
let timelineRequestToken = 0;

async function openTimeline(ticket: TicketRow) {
  activeTimelineTicket.value = ticket;
  timelineNotes.value = seedNotesForTicket(ticket);
  newNoteText.value = '';
  isTimelineOpen.value = true;

  timelineError.value = null;

  const token = ++timelineRequestToken;

  try {
    const msgs = await api.get<any[]>(`/tenant/tickets/${ticket.id}/messages`);
    if (token !== timelineRequestToken) return;
    if (msgs && Array.isArray(msgs) && msgs.length > 0) {
      timelineNotes.value = msgs.map((m) => ({
        id: m.id,
        author: m.profiles?.role === 'admin' ? 'Landlady Fe' : 'You (Resident)',
        text: m.message_body,
        timestamp: m.created_at,
      }));
    }
  } catch (err: any) {
    if (token !== timelineRequestToken) return;
    // The status notes above still stand - they come from the ticket row. What is
    // unknown is whether there are replies, and the panel says so rather than
    // showing an empty thread that reads as "nobody has answered you".
    timelineError.value = err?.message || 'Replies could not be loaded.';
  }
}

function closeTimeline() {
  // Nothing in flight belongs to the dialog any more.
  timelineRequestToken++;
  isTimelineOpen.value = false;
  activeTimelineTicket.value = null;
  newNoteText.value = '';
}

/**
 * The events this ticket's own record proves, and nothing else.
 *
 * This function used to fabricate two messages and attribute them to **Landlady
 * Fe** - "I have assigned a handyman and they will visit soon" on any In
 * Progress ticket, and "Issue has been resolved..." on any resolved one. She
 * never wrote either. They were shown to the tenant as their conversation
 * history, and because they were seeded BEFORE the fetch and only replaced when
 * it returned rows, a ticket with no replies yet - the ordinary case - displayed
 * an invented reply from a real person indefinitely.
 *
 * That is the same defect as the invented OR numbers and the fabricated
 * emergency contacts this audit already removed: made-up data presented as real.
 *
 * What is left is derived from the ticket row itself and attributed to System,
 * which is who observed it. A status change is a fact the record holds; a
 * sentence in the owner's voice is not.
 */
function seedNotesForTicket(ticket: TicketRow): TicketNote[] {
  const base: TicketNote[] = [
    {
      id: `note-sys-${ticket.id}`,
      author: 'System',
      text: `Ticket #${ticket.id.slice(0, 8)} was submitted on ${formatDate(ticket.created_at)}.`,
      timestamp: ticket.created_at,
    },
  ];
  if (ticket.status === 'In Progress') {
    base.push({
      id: `note-progress-${ticket.id}`,
      author: 'System',
      text: 'This ticket is marked In Progress.',
      timestamp: ticket.created_at,
    });
  }
  if (RESOLVED_STATES.includes(ticket.status) && ticket.resolved_at) {
    base.push({
      id: `note-resolve-${ticket.id}`,
      author: 'System',
      text: `Marked ${ticket.status.toLowerCase()} on ${formatDate(ticket.resolved_at)}.`,
      timestamp: ticket.resolved_at,
    });
  }
  return base;
}

async function postNote() {
  const text = newNoteText.value.trim();
  // The Post button's `:disabled="savingNote"` cannot stop this: the input
  // itself stays enabled while saving, and `@keydown.enter.prevent="postNote"`
  // fires straight off the keyboard. Two quick Enter presses called this
  // twice before the first request even returned, each posting the same note.
  if (!text || !activeTimelineTicket.value || savingNote.value) return;
  savingNote.value = true;
  try {
    const res = await api.post<any>(`/tenant/tickets/${activeTimelineTicket.value.id}/messages`, {
      message: text,
    });
    timelineNotes.value.push({
      id: res?.id || `note-${Date.now()}`,
      author: 'You (Resident)',
      text: text,
      timestamp: new Date().toISOString(),
    });
    newNoteText.value = '';
  } catch (err: any) {
    console.error('Failed to post ticket comment:', err);
    // The only visible change used to be the button label flicking from "…" back
    // to "Post". The note was not appended, nothing was rendered, and the input
    // kept its text - so "the leak is worse today" looked unsent AND looked
    // unsaved in exactly the same way a successful post that failed to render
    // would. Residents press again: the successes duplicate and the failures
    // stay silent. The text is deliberately still in the box to send again.
    showToast(
      'error',
      'Your note was not sent',
      `It is still in the box, so you can send it again. ${err?.message || err}`
    );
  } finally {
    savingNote.value = false;
  }
}

onMounted(async () => {
  await Promise.all([fetchActiveRoom(), fetchTickets()]);
});

async function fetchActiveRoom() {
  try {
    const data = await api.get<any[]>('/tenant/my-rooms');
    const activeRoom = data?.find((r) => r.is_active) || data?.[0];
    if (activeRoom) {
      /**
       * Only the room's own id and number, and nothing invented.
       *
       * These read `activeRoom.rooms?.id || activeRoom.id || 'room-1a'` and
       * `… || activeRoom.room_number || '1A'`. Each row here is a
       * ROOM_ASSIGNMENT with the unit nested under `rooms`, so the middle
       * fallback is the assignment's own id - a real uuid of the wrong entity,
       * which the server then refuses as "Room not found" - and
       * `activeRoom.room_number` does not exist on an assignment row at all.
       *
       * The last fallback is the one that mattered: a resident whose unit could
       * not be resolved was shown **1A**, somebody else's unit, as their own.
       * And because the invented id was truthy, the *"You have no active unit"*
       * guard in `handleTicketSubmit` could never fire - the case it exists for
       * was the case it could not see.
       */
      activeRoomId.value = activeRoom.rooms?.id ?? '';
      activeRoomNumber.value = activeRoom.rooms?.room_number ?? '';
    }
  } catch (err: any) {
    console.error('Failed to resolve active room:', err?.message || err);
  }
}

async function fetchTickets() {
  loadingTickets.value = true;
  ticketsLoadFailed.value = false;
  try {
    tickets.value = (await api.get<TicketRow[]>('/tenant/my-tickets')) ?? [];
  } catch (err: any) {
    console.error('Failed to load tickets:', err?.message || err);
    ticketsLoadFailed.value = true;
  } finally {
    loadingTickets.value = false;
  }
}

/**
 * The photo travels as a base64 data URI inside the JSON body, and the server
 * takes 1 MB of body in total (`express.json({ limit: '1mb' })`). Base64 costs
 * about a third on top, so anything over roughly **740 KB of image** cannot be
 * sent at all - which is most photographs a phone takes.
 *
 * Measured against the running server rather than worked out on paper: a body
 * of 0.91 MB reached the route, and 1.04 MB did not.
 *
 * Nothing checked. The file was read, encoded, posted, and refused by the body
 * parser - and until the fix that went in beside this one, refused as **500
 * Internal server error**, so a resident whose photo was too big was told the
 * system had broken. Checking here means they are told the truth before
 * anything is sent, and keeps the ticket itself - which is the part that
 * matters - from being held up by its attachment.
 */
const MAX_PHOTO_BYTES = 700 * 1024;

/**
 * The same figure, for the control that leads them to the file picker.
 *
 * The upload panel advertised **"PNG, JPG or WEBP up to 10MB"** while the
 * handler refused anything over 700 KB - and most phone photographs fall
 * between the two, so the label named a size the form could not accept and the
 * rejection arrived only after they had chosen the file. Derived from the
 * constant rather than retyped, because the last two copies of this number
 * disagreed.
 */
const MAX_PHOTO_LABEL = `${Math.round(MAX_PHOTO_BYTES / 1024)}KB`;

const handlePhotoSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (file.size > MAX_PHOTO_BYTES) {
    ticketPhotoUrl.value = null;
    ticketPhotoName.value = '';
    target.value = '';
    ticketError.value =
      `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB, and the largest this can send ` +
      `is about ${Math.round(MAX_PHOTO_BYTES / 1024)} KB. File the request without it and reply ` +
      `to it with the photo, or send a smaller one.`;
    return;
  }

  ticketError.value = '';
  ticketPhotoName.value = file.name;
  ticketPhotoType.value = file.type || 'application/octet-stream';
  const reader = new FileReader();
  reader.onload = (e) => {
    ticketPhotoUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const removePhoto = () => {
  ticketPhotoUrl.value = null;
  ticketPhotoName.value = '';
  ticketPhotoType.value = '';
};

async function handleTicketSubmit() {
  // The submit button disables on `submitting`, but Enter inside the title or
  // description field submits the form directly - a second Enter before Vue's
  // next render still reaches here with the button not yet visibly disabled.
  if (submitting.value) return;
  ticketError.value = '';

  if (!ticketTitle.value.trim() || ticketTitle.value.trim().length < 3) {
    ticketError.value = 'Please enter an issue title of at least 3 characters.';
    return;
  }
  if (!ticketDescription.value.trim() || ticketDescription.value.trim().length < 5) {
    ticketError.value = 'Please describe the maintenance issue in more detail.';
    return;
  }

  submitting.value = true;
  try {
    if (!activeRoomId.value) {
      ticketError.value = 'You have no active unit, so a request cannot be raised. Contact the administrator.';
      return;
    }

    const attachments = ticketPhotoUrl.value
      ? [{ fileUrl: ticketPhotoUrl.value, fileType: ticketPhotoType.value || 'application/octet-stream' }]
      : undefined;

    // Failure propagates to the catch below, which shows it. This used to be
    // swallowed and followed by a fabricated ticket row with an invented id, so a
    // request that never reached the server still read as "submitted to Landlady
    // Fe Galang Da Silva for review". `fetchTickets()` then quietly replaced the
    // fake row with the real list, and the ticket simply was not there.
    const created = await api.post<{ attachmentWarning?: string | null }>('/tenant/tickets', {
      roomId: activeRoomId.value,
      title: ticketTitle.value.trim(),
      description: ticketDescription.value.trim(),
      category: ticketCategory.value,
      priority: ticketPriority.value,
      attachments,
    });

    // The ticket commits before its attachments do. If the photo failed, the
    // ticket still exists and the server says so here rather than returning an
    // error - submitting again would file the same complaint twice.
    ticketNotice.value = created?.attachmentWarning
      ? `Ticket "${ticketTitle.value.trim()}" has been submitted to Landlady Fe Galang Da Silva ` +
        `for review. ${created.attachmentWarning}`
      : `Ticket "${ticketTitle.value.trim()}" has been submitted to Landlady Fe Galang Da Silva for review.`;
    ticketTitle.value = '';
    ticketDescription.value = '';
    ticketCategory.value = 'Plumbing';
    ticketPriority.value = 'Medium';
    removePhoto();

    await fetchTickets();
  } catch (err: any) {
    ticketError.value = `Submission failed: ${err?.message || err}`;
  } finally {
    submitting.value = false;
  }
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

</script>

<template>
  <div class="ws-focus space-y-5">
    <!-- Page header -->
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">My account</p>
      <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
        Something needs fixing
      </h1>
      <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
        Tell the landlady what is wrong<span v-if="activeRoomNumber"> in unit {{ activeRoomNumber }}</span>, and
        follow what happens next.
      </p>
    </div>

    <div
      v-if="ticketNotice"
      class="ws-reveal flex items-center justify-between gap-3 rounded-tile bg-brand-soft p-4 sm:p-5"
      role="status"
    >
      <p class="flex items-center gap-2.5 text-sm font-semibold leading-6 text-brand">
        <CheckCircle2 class="size-5 shrink-0" aria-hidden="true" />
        {{ ticketNotice }}
      </p>
      <!-- No `size-9`: it overrode `.icon-btn`'s own 2.75rem down to 36px. -->
      <button
        type="button"
        class="icon-btn shrink-0"
        aria-label="Dismiss this message"
        @click="ticketNotice = ''"
      >
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <!-- Submit Ticket Form -->
      <div class="flex h-full flex-col overflow-hidden rounded-tile bg-tile lg:col-span-5">
        <div class="border-b border-line p-5 sm:p-6">
          <h2 class="text-base font-semibold text-ink">Report it</h2>
          <p class="mt-1 text-sm leading-6 text-ink-soft">
            This goes straight to Mrs. Da Silva.
          </p>
        </div>

        <!-- `p-5 sm:p-6`, matching the header strip directly above it. -->
        <form @submit.prevent="handleTicketSubmit" class="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
          <div class="space-y-4">
            <div
              v-if="ticketError"
              class="ws-reveal flex items-start gap-2.5 rounded-2xl bg-overdue-soft p-4"
              role="alert"
            >
              <AlertTriangle class="mt-0.5 size-4 shrink-0 text-overdue" aria-hidden="true" />
              <p class="text-sm leading-6 text-overdue">{{ ticketError }}</p>
            </div>

            <div>
              <label class="mb-1.5 block text-xs text-ink-faint" for="ticket-title">
                Issue Title
              </label>
              <input
                id="ticket-title"
                v-model="ticketTitle"
                type="text"
                placeholder="e.g. Bathroom sink pipe leak"
                class="ws-input"
                required
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="mb-1.5 block text-xs text-ink-faint" for="ticket-category">
                  Category
                </label>
                <PillSelect
                  id="ticket-category"
                  v-model="ticketCategory"
                  :options="[...TICKET_CATEGORIES]"
                  aria-label="Category"
                  widthClass="w-full"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-xs text-ink-faint" for="ticket-priority">
                  Priority
                </label>
                <PillSelect
                  id="ticket-priority"
                  v-model="ticketPriority"
                  :options="PRIORITY_OPTIONS"
                  aria-label="Priority"
                  widthClass="w-full"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-xs text-ink-faint" for="ticket-desc">
                Details &amp; Description
              </label>
              <textarea
                id="ticket-desc"
                v-model="ticketDescription"
                rows="4"
                placeholder="Describe the issue — where it is in the unit, when it started, and how severe it is."
                class="ws-textarea w-full"
                required
              ></textarea>
            </div>

            <div>
              <label class="mb-1.5 block text-xs text-ink-faint">
                Attach Photo <span class="font-normal text-ink-soft">(optional)</span>
              </label>

              <div
                v-if="!ticketPhotoUrl"
                class="press-plate border-2 border-dashed border-line rounded-xl p-5 text-center bg-canvas hover:bg-brand-soft/40 hover:border-brand/40"
              >
                <input
                  id="ticket-photo-input"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handlePhotoSelect"
                />
                <label
                  for="ticket-photo-input"
                  class="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  <ImageIcon class="size-6 text-brand" />
                  <span class="text-xs font-semibold text-ink">Click to upload a photo</span>
                  <span class="text-xs text-ink-soft">PNG, JPG or WEBP up to {{ MAX_PHOTO_LABEL }}</span>
                </label>
              </div>

              <div
                v-else
                class="ws-reveal p-3 bg-brand-soft border border-brand-soft rounded-xl flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3 overflow-hidden">
                  <img
                    :src="ticketPhotoUrl"
                    alt="Ticket attachment preview"
                    class="size-12 object-cover rounded-lg border border-brand-soft shrink-0"
                  />
                  <div class="truncate">
                    <span class="text-xs font-semibold text-ink block truncate">
                      {{ ticketPhotoName }}
                    </span>
                    <span class="text-xs text-brand font-semibold">Photo attached</span>
                  </div>
                </div>
                <!--
                  `.icon-btn`, not `p-1` around a `size-4` icon - that was a
                  24x24 target, the smallest control on the resident's side of
                  the application, and the one that undoes an attachment they
                  have just taken on a phone.
                -->
                <button
                  type="button"
                  @click="removePhoto"
                  class="icon-btn shrink-0 text-ink-soft hover:text-overdue"
                  aria-label="Remove photo"
                  title="Remove photo"
                >
                  <X class="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="pill-btn-brand w-full min-h-11 mt-4"
          >
            <Send class="size-3.5" />
            <span>{{ submitting ? 'Submitting…' : 'Submit Maintenance Ticket' }}</span>
          </button>
        </form>
      </div>

      <!-- Ticket Tracker (Matching Admin Table Style) -->
      <div class="flex h-full flex-col overflow-hidden rounded-tile bg-tile lg:col-span-7">
        <!--
          `bg-canvas` used to sit here, which painted this strip a visibly
          different grey-green from "Report it" beside it - a plain white
          `bg-tile` card with just a `border-b` for its own header. Same
          border-only treatment here now, so the two panels read as one pair
          rather than one looking finished and the other looking like a draft.
        -->
        <div class="px-6 py-4 border-b border-line flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <h2 class="font-semibold text-sm text-ink flex items-center gap-2">
              <FileText class="size-4 text-brand" />
              My Ticket Tracker
            </h2>
            <!-- A count computed from a list that failed to load is a claim, not
                 an absence. Both of these read 0 out of a dropped request. -->
            <span class="text-xs text-ink-soft">
              <template v-if="ticketsLoadFailed">(not loaded)</template>
              <template v-else>({{ filteredTickets.length }} ticket{{ filteredTickets.length === 1 ? '' : 's' }})</template>
            </span>
          </div>
          <span class="text-xs text-ink-soft">
            <template v-if="ticketsLoadFailed">Open and resolved counts are not available</template>
            <template v-else>
              <strong class="text-ink">{{ openCount }}</strong> open ·
              <strong class="text-ink">{{ resolvedCount }}</strong> resolved
            </template>
          </span>
        </div>

        <!-- Filter Bar (Identical to Admin Dispatch / Maintenance Tickets) -->
        <div class="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="relative w-full sm:w-80 shrink-0">
            <!-- left-4/pl-11, which is what the comment above claims: the
                 dispatch board's search box uses that inset, and this one was
                 2px off it. -->
            <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <label for="ticket-search" class="sr-only">Search your requests</label>
            <input
              id="ticket-search"
              v-model="searchQuery"
              type="search"
              placeholder="What it was about"
              class="ws-input w-full pl-11 pr-4 sm:text-sm"
            />
          </div>

          <PillSelect
            v-model="statusFilter"
            :options="ticketFilterOptions"
            aria-label="Show which requests"
          />
        </div>

        <!--
          The inner scroller is `lg:` only now.

          Below `lg` this panel is stacked under the form rather than beside
          it, so there is no second column for it to keep pace with - and a
          580px scroll region inside a page that already scrolls is the
          worst thing a phone can be handed: a thumb that starts inside the
          list scrolls the list, a thumb two pixels outside it scrolls the
          page, and neither tells you which one it is about to do. At
          `lg` and up the two panels sit side by side and the cap is what
          keeps them the same height, so it stays there.

          `p-5 sm:p-6` rather than a flat `p-6`, matching `OverviewTile` and
          the "Report it" header above it; a flat 24px gutter on a 375px
          screen spends 13% of the width on padding.
        -->
        <div class="p-5 sm:p-6 flex-1 lg:overflow-y-auto lg:max-h-[580px]">
          <div v-if="loadingTickets" class="space-y-4">
            <SkeletonCard variant="list" :count="2" />
          </div>

          <!--
            A failed load must not read as "you have no requests".

            This branch comes first so the empty state below can only be reached
            by a list that actually loaded. The resident who has just filed an
            emergency plumbing ticket on a dropped connection was being told they
            had none, and the obvious thing to do about that is file it again.
          -->
          <UnavailableNote
            v-else-if="ticketsLoadFailed"
            message="Your requests could not be loaded. That is not the same as having none — anything you have already sent is still with the landlady."
            @retry="fetchTickets"
          />

          <div
            v-else-if="filteredTickets.length === 0"
            class="ws-reveal py-12 text-center space-y-2"
          >
            <Inbox class="size-8 text-ink-soft/50 mx-auto" />
            <p class="text-sm font-semibold text-ink">No tickets to show</p>
            <p class="text-xs text-ink-soft">
              {{
                tickets.length === 0
                  ? 'Submit a ticket using the form and it will appear here.'
                  : searchQuery.trim()
                    ? `Nothing matches "${searchQuery.trim()}".`
                    : `You have no ${statusFilter.toLowerCase()} tickets.`
              }}
            </p>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="(ticket, i) in filteredTickets"
              :key="ticket.id"
              class="list-reveal-item border border-line rounded-tile overflow-hidden hover:border-brand/40 hover:shadow-xs transition-[border-color,box-shadow] duration-150 ease-[var(--ease-out)] bg-tile"
              :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
            >
              <!--
                Clickable Header Row: Toggles Collapsible State.

                A plain `div` with a `@click`, unlike every other disclosure in
                this workspace (see "Other ways to pay" on the overview screen,
                or PillSelect's trigger) - reachable by a pointer only. Nothing
                here let a keyboard or screen-reader user open a ticket's own
                details at all.
              -->
              <div
                role="button"
                tabindex="0"
                :aria-expanded="isTicketExpanded(ticket.id)"
                :aria-controls="`ticket-body-${ticket.id}`"
                @click="toggleTicketExpanded(ticket.id)"
                @keydown.enter.prevent="toggleTicketExpanded(ticket.id)"
                @keydown.space.prevent="toggleTicketExpanded(ticket.id)"
                class="press-plate px-5 py-3.5 flex items-start justify-between gap-4 border-b border-line cursor-pointer hover:bg-canvas select-none group"
              >
                <div class="min-w-0">
                  <h3 class="font-semibold text-sm text-ink group-hover:text-brand transition-colors leading-snug">
                    {{ ticket.title }}
                  </h3>
                  <p class="text-xs text-ink-soft mt-0.5">
                    <span v-if="ticket.id" class="font-mono font-semibold text-ink-soft">#{{ ticket.id.slice(0, 8) }} · </span>
                    Submitted {{ formatDate(ticket.created_at) }}
                    <span v-if="ticket.rooms"> · Unit {{ ticket.rooms.room_number }}</span>
                  </p>
                </div>

                <div class="flex items-center gap-2.5 shrink-0">
                  <!-- Where the request has got to. The words are the meaning;
                       the marks repeat it. -->
                  <ol
                    class="hidden sm:flex items-center gap-1.5"
                    :aria-label="`Progress: ${ticketStepLabel(ticket.status)}`"
                  >
                    <li v-for="(step, i) in TICKET_STEPS" :key="step" class="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        :class="[
                          'size-2 rounded-full',
                          i <= ticketStep(ticket.status) ? 'bg-brand' : 'bg-line',
                        ]"
                      />
                      <span
                        :class="[
                          'text-xs',
                          i === ticketStep(ticket.status) ? 'font-semibold text-ink' : 'text-ink-faint',
                        ]"
                      >
                        {{ step }}
                      </span>
                      <span v-if="i < TICKET_STEPS.length - 1" aria-hidden="true" class="h-px w-4 bg-line" />
                    </li>
                  </ol>
                  <span class="sm:hidden text-xs font-semibold text-ink">{{ ticketStepLabel(ticket.status) }}</span>
                  <div class="p-1 rounded-lg text-ink-soft group-hover:text-ink transition-colors">
                    <ChevronDown
                      :class="[ 'size-4 transition-transform duration-200 ease-[var(--ease-out)]', isTicketExpanded(ticket.id) ? 'rotate-180 text-brand' : '' ]"
                    />
                  </div>
                </div>
              </div>

              <!-- Collapsible Body & Footer -->
              <div :id="`ticket-body-${ticket.id}`" v-show="isTicketExpanded(ticket.id)" class="ws-reveal">
                <!-- Body: description -->
                <div class="px-5 py-3.5 bg-canvas">
                  <p class="text-xs text-ink-soft leading-relaxed">{{ ticket.description }}</p>

                  <!--
                    The photo the resident attached, shown back to them.

                    `GET /api/tenant/my-tickets` did not select `ticket_attachments`, while the
                    administrator's list always has - so the only person who could not see the
                    photo was the one who took it.
                  -->
                  <div v-if="ticket.ticket_attachments?.length" class="mt-3">
                    <p class="text-xs font-semibold text-ink-soft mb-1.5">
                      Photo you attached
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <a
                        v-for="att in ticket.ticket_attachments"
                        :key="att.id"
                        :href="att.file_url"
                        target="_blank"
                        rel="noopener"
                        class="press block size-20 rounded-xl overflow-hidden border border-line bg-tile"
                        title="Open the full-size photo"
                      >
                        <img :src="att.file_url" alt="Photo attached to this request" class="w-full h-full object-cover" />
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Footer: classification metadata + View Timeline button -->
                <div
                  class="px-5 py-3 flex flex-wrap items-center gap-2 border-t border-line bg-tile"
                >
                  <StatusPill :tone="priorityTone(ticket.priority)">
                    {{ priorityWord(ticket.priority) }}
                  </StatusPill>
                  <StatusPill tone="neutral">{{ ticket.category }}</StatusPill>
                  <StatusPill v-if="ticket.resolved_at" tone="paid">
                    Done {{ formatDate(ticket.resolved_at) }}
                  </StatusPill>

                  <!-- View Timeline Button -->
                  <!--
                    `min-h-9 h-9` forced `.pill-btn` down from 2.75rem to 36px -
                    measured 74x36. It is the only way into a request's own
                    history, and it sits at the end of a wrapping row of pills,
                    which is where a thumb is least accurate.
                  -->
                  <button
                    @click.stop="openTimeline(ticket)"
                    class="pill-btn ml-auto text-xs px-3"
                  >
                    <ListChecks class="size-3.5 text-brand" />
                    <span>Timeline</span>
                    <ChevronRight class="size-3" />
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Progress Timeline Modal -->
  <WsModal
      v-if="isTimelineOpen && activeTimelineTicket"
      :title="activeTimelineTicket.title"
      subtitle="Where your request has got to"
      size="md"
      @close="closeTimeline()"
    >

      <div class="p-6 space-y-6">
        <!-- 5-Stage Progress Stepper -->
        <div>
          <p class="text-xs font-semibold text-ink-soft mb-4">Repair Progress</p>
          <div class="space-y-0">
            <div
              v-for="(stage, index) in TIMELINE_STAGES"
              :key="index"
              class="flex gap-4"
            >
              <!-- Connector column -->
              <div class="flex flex-col items-center">
                <div
                  :class="[ 'size-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors', index <= getStageIndex(activeTimelineTicket.status) ? 'bg-brand border-brand text-on-brand' : 'bg-tile border-line text-ink-soft' ]"
                >
                  <CheckCircle2 v-if="index <= getStageIndex(activeTimelineTicket.status)" class="size-4" />
                  <span v-else class="text-xs font-semibold">{{ index + 1 }}</span>
                </div>
                <div
                  v-if="index < TIMELINE_STAGES.length - 1"
                  :class="[ 'w-0.5 flex-1 min-h-[28px]', index < getStageIndex(activeTimelineTicket.status) ? 'bg-brand' : 'bg-line' ]"
                />
              </div>

              <!-- Stage text -->
              <div class="pb-5 flex-1 min-w-0">
                <p
                  :class="[ 'text-xs sm:text-sm font-semibold leading-tight', index <= getStageIndex(activeTimelineTicket.status) ? 'text-ink' : 'text-ink-soft' ]"
                >
                  {{ stage.label }}
                  <StatusPill
                    v-if="index === getStageIndex(activeTimelineTicket.status)"
                    tone="paid"
                    class="ml-2"
                    >Where it is now</StatusPill
                  >
                </p>
                <p
                  :class="[ 'text-xs mt-0.5', index <= getStageIndex(activeTimelineTicket.status) ? 'text-ink-soft' : 'text-ink-soft' ]"
                >
                  {{ stage.desc }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-line" />

        <!-- Notes / Comment Feed -->
        <div>
          <p class="text-xs font-semibold text-ink-soft mb-3">Activity &amp; Notes</p>

          <p
            v-if="timelineError"
            class="mb-3 rounded-xl border border-verify-soft bg-verify-soft/60 px-3.5 py-2.5 text-xs text-ink-soft"
          >
            <strong class="text-ink">Replies could not be loaded.</strong>
            This does not mean nobody has answered — only that we could not check.
            <span class="text-ink-soft">{{ timelineError }}</span>
          </p>

          <div class="space-y-3 mb-4 max-h-48 overflow-y-auto">
            <div
              v-for="(note, i) in timelineNotes"
              :key="note.id"
              class="list-reveal-item flex gap-3"
              :style="{ animationDelay: `${Math.min(i, 9) * 30}ms` }"
            >
              <div class="size-7 rounded-full bg-night text-on-night text-xs font-semibold flex items-center justify-center shrink-0">
                {{ note.author[0] }}
              </div>
              <div class="flex-1 bg-canvas border border-line rounded-xl px-3.5 py-2.5">
                <p class="text-xs font-semibold text-ink">{{ note.author }}</p>
                <p class="text-xs text-ink-soft mt-0.5 leading-relaxed">{{ note.text }}</p>
                <p class="text-xs text-ink-soft mt-1">{{ formatDateTime(note.timestamp) }}</p>
              </div>
            </div>
          </div>

          <!-- Add Note Input -->
          <div class="flex gap-2">
            <label for="ticket-note" class="sr-only">Add a note for the landlady</label>
            <input
              id="ticket-note"
              v-model="newNoteText"
              type="text"
              placeholder="Add a note for Mrs. Da Silva"
              @keydown.enter.prevent="postNote"
              class="ws-input flex-1"
            />
            <button
              @click="postNote"
              :disabled="!newNoteText.trim() || savingNote"
              class="pill-btn-brand shrink-0"
            >
              <MessageSquarePlus class="size-3.5" />
              <span>{{ savingNote ? '…' : 'Post' }}</span>
            </button>
          </div>
        </div>
      </div>
    </WsModal>
</template>
