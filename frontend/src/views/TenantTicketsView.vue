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
import { ref, computed, onMounted } from 'vue';
import { TICKET_CATEGORIES } from '@/lib/systemState';
import { api } from '@/lib/api';
import {
  Wrench,
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
  RefreshCw,
  Search,
} from 'lucide-vue-next';
import SkeletonCard from '@/components/ui/SkeletonCard.vue';

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
const ticketDescription = ref('');
const ticketPhotoUrl = ref<string | null>(null);
const ticketPhotoName = ref('');
const ticketNotice = ref('');
const ticketError = ref('');
const submitting = ref(false);

// ---- Ticket list state ----------------------------------------------------
const tickets = ref<TicketRow[]>([]);
const loadingTickets = ref(false);
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

async function openTimeline(ticket: TicketRow) {
  activeTimelineTicket.value = ticket;
  timelineNotes.value = seedNotesForTicket(ticket);
  newNoteText.value = '';
  isTimelineOpen.value = true;

  timelineError.value = null;

  try {
    const msgs = await api.get<any[]>(`/tenant/tickets/${ticket.id}/messages`);
    if (msgs && Array.isArray(msgs) && msgs.length > 0) {
      timelineNotes.value = msgs.map((m) => ({
        id: m.id,
        author: m.profiles?.role === 'admin' ? 'Landlady Fe' : 'You (Resident)',
        text: m.message_body,
        timestamp: m.created_at,
      }));
    }
  } catch (err: any) {
    // The status notes above still stand - they come from the ticket row. What is
    // unknown is whether there are replies, and the panel says so rather than
    // showing an empty thread that reads as "nobody has answered you".
    timelineError.value = err?.message || 'Replies could not be loaded.';
  }
}

function closeTimeline() {
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
  if (!text || !activeTimelineTicket.value) return;
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
      activeRoomId.value = activeRoom.rooms?.id || activeRoom.id || 'room-1a';
      activeRoomNumber.value = activeRoom.rooms?.room_number || activeRoom.room_number || '1A';
    }
  } catch (err: any) {
    console.error('Failed to resolve active room:', err?.message || err);
  }
}

async function fetchTickets() {
  loadingTickets.value = true;
  try {
    tickets.value = (await api.get<TicketRow[]>('/tenant/my-tickets')) ?? [];
  } catch (err: any) {
    console.error('Failed to load tickets:', err?.message || err);
  } finally {
    loadingTickets.value = false;
  }
}

const handlePhotoSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  ticketPhotoName.value = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    ticketPhotoUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const removePhoto = () => {
  ticketPhotoUrl.value = null;
  ticketPhotoName.value = '';
};

async function handleTicketSubmit() {
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
      ? [{ fileUrl: ticketPhotoUrl.value, fileType: 'image/png' }]
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

function priorityClass(priority: string) {
  switch (priority) {
    case 'Emergency':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'High':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'Medium':
      return 'bg-blue-50 text-blue-900 border-blue-200';
    default:
      return 'bg-surface-sunken text-[#5e6c84] border-border-strong';
  }
}

function statusClass(status: string) {
  if (RESOLVED_STATES.includes(status)) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'In Progress') return 'bg-amber-50 text-amber-900 border-amber-200';
  return 'bg-primary-soft text-primary border-[#b3d4ff]';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Tenant</span>
          <span>/</span>
          <span class="font-bold text-foreground">Maintenance Tickets</span>
        </div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Maintenance Tickets</h1>
        <p class="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Report repair requests and track their progress
          <span v-if="activeRoomNumber"> for Unit {{ activeRoomNumber }}</span>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button @click="fetchTickets" :disabled="loadingTickets" class="btn-secondary">
          <RefreshCw :class="['size-3.5 text-muted-foreground', loadingTickets ? 'animate-spin text-primary' : '']" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Success Notice -->
    <div
      v-if="ticketNotice"
      class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm rounded-2xl flex items-center justify-between shadow-xs"
    >
      <div class="flex items-center gap-2.5">
        <CheckCircle2 class="size-5 text-emerald-600 shrink-0" />
        <span class="font-medium">{{ ticketNotice }}</span>
      </div>
      <button
        @click="ticketNotice = ''"
        class="text-emerald-700 hover:text-emerald-900 ml-3 p-1 rounded-lg cursor-pointer"
        title="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <!-- Submit Ticket Form -->
      <div class="lg:col-span-5 surface-card rounded-2xl border border-border bg-white overflow-hidden shadow-xs h-full flex flex-col">
        <div class="px-6 py-4 border-b border-border bg-background">
          <h2 class="font-display font-extrabold text-sm text-foreground flex items-center gap-2">
            <Wrench class="size-4 text-primary" />
            Submit a Maintenance Ticket
          </h2>
          <p class="text-xs text-muted-foreground mt-1">
            Reported directly to Landlady Fe Galang Da Silva.
          </p>
        </div>

        <form @submit.prevent="handleTicketSubmit" class="p-6 space-y-4 flex-1 flex flex-col justify-between">
          <div class="space-y-4">
            <div
              v-if="ticketError"
              class="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2"
            >
              <AlertTriangle class="size-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{{ ticketError }}</span>
            </div>

            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5" for="ticket-title">
                Issue Title
              </label>
              <input
                id="ticket-title"
                v-model="ticketTitle"
                type="text"
                placeholder="e.g. Bathroom sink pipe leak"
                class="form-input text-xs"
                required
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5" for="ticket-category">
                  Category
                </label>
                <select
                  id="ticket-category"
                  v-model="ticketCategory"
                  class="form-select text-xs cursor-pointer"
                >
                  <option v-for="cat in TICKET_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5" for="ticket-priority">
                  Priority
                </label>
                <select
                  id="ticket-priority"
                  v-model="ticketPriority"
                  class="form-select text-xs cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5" for="ticket-desc">
                Details &amp; Description
              </label>
              <textarea
                id="ticket-desc"
                v-model="ticketDescription"
                rows="4"
                placeholder="Describe the issue — where it is in the unit, when it started, and how severe it is."
                class="w-full p-3 border border-border rounded-xl text-xs bg-white text-foreground leading-relaxed focus:border-primary focus:outline-none transition resize-y"
                required
              ></textarea>
            </div>

            <div>
              <label class="block font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Attach Photo <span class="font-normal text-muted-foreground">(optional)</span>
              </label>

              <div
                v-if="!ticketPhotoUrl"
                class="border-2 border-dashed border-border rounded-xl p-5 text-center bg-background hover:bg-blue-50/40 hover:border-primary/40 transition-colors"
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
                  <ImageIcon class="size-6 text-primary" />
                  <span class="text-xs font-bold text-foreground">Click to upload a photo</span>
                  <span class="text-[11px] text-muted-foreground">PNG, JPG or WEBP up to 10MB</span>
                </label>
              </div>

              <div
                v-else
                class="p-3 bg-[#f0f7ff] border border-[#b3d4ff] rounded-xl flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-3 overflow-hidden">
                  <img
                    :src="ticketPhotoUrl"
                    alt="Ticket attachment preview"
                    class="size-12 object-cover rounded-lg border border-[#b3d4ff] shrink-0"
                  />
                  <div class="truncate">
                    <span class="text-xs font-bold text-foreground block truncate">
                      {{ ticketPhotoName }}
                    </span>
                    <span class="text-[11px] text-emerald-700 font-semibold">Photo attached</span>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removePhoto"
                  class="p-1 text-muted-foreground hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Remove photo"
                >
                  <X class="size-4" />
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="btn-primary w-full min-h-11 mt-4"
          >
            <Send class="size-3.5 text-white" />
            <span>{{ submitting ? 'Submitting…' : 'Submit Maintenance Ticket' }}</span>
          </button>
        </form>
      </div>

      <!-- Ticket Tracker (Matching Admin Table Style) -->
      <div class="lg:col-span-7 surface-card rounded-2xl border border-border bg-white overflow-hidden shadow-xs h-full flex flex-col">
        <div class="px-6 py-4 border-b border-border bg-background flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <h2 class="font-display font-extrabold text-sm text-foreground flex items-center gap-2">
              <FileText class="size-4 text-primary" />
              My Ticket Tracker
            </h2>
            <span class="text-xs text-muted-foreground">
              ({{ filteredTickets.length }} ticket{{ filteredTickets.length === 1 ? '' : 's' }})
            </span>
          </div>
          <span class="text-xs text-muted-foreground">
            <strong class="text-foreground">{{ openCount }}</strong> open ·
            <strong class="text-foreground">{{ resolvedCount }}</strong> resolved
          </span>
        </div>

        <!-- Filter Bar (Identical to Admin Dispatch / Maintenance Tickets) -->
        <div class="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div class="relative flex-1">
            <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search title, category or description…"
              class="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs sm:text-sm text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <select
            v-model="statusFilter"
            class="min-h-11 rounded-xl border border-border bg-white px-4 text-xs sm:text-sm font-semibold text-foreground focus:border-primary focus:outline-none sm:w-44 cursor-pointer"
          >
            <option value="All">All Tickets</option>
            <option value="Open">Open Only</option>
            <option value="Resolved">Resolved Only</option>
          </select>
        </div>

        <div class="p-6 flex-1 overflow-y-auto max-h-[580px]">
          <div v-if="loadingTickets" class="space-y-4">
            <SkeletonCard variant="room" :count="2" />
          </div>

          <div
            v-else-if="filteredTickets.length === 0"
            class="py-12 text-center space-y-2"
          >
            <Inbox class="size-8 text-muted-foreground/50 mx-auto" />
            <p class="text-sm font-bold text-foreground">No tickets to show</p>
            <p class="text-xs text-muted-foreground">
              {{
                statusFilter === 'All'
                  ? 'Submit a ticket using the form and it will appear here.'
                  : `You have no ${statusFilter.toLowerCase()} tickets.`
              }}
            </p>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="ticket in filteredTickets"
              :key="ticket.id"
              class="border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-colors bg-white shadow-xs"
            >
              <!-- Clickable Header Row: Toggles Collapsible State -->
              <div
                @click="toggleTicketExpanded(ticket.id)"
                class="px-5 py-3.5 flex items-start justify-between gap-4 border-b border-border cursor-pointer hover:bg-background transition-colors select-none group"
              >
                <div class="min-w-0">
                  <h3 class="font-display font-extrabold text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
                    {{ ticket.title }}
                  </h3>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    <span v-if="ticket.id" class="font-mono font-bold text-muted-foreground">#{{ ticket.id.slice(0, 8) }} · </span>
                    Submitted {{ formatDate(ticket.created_at) }}
                    <span v-if="ticket.rooms"> · Unit {{ ticket.rooms.room_number }}</span>
                  </p>
                </div>

                <div class="flex items-center gap-2.5 shrink-0">
                  <span
                    :class="[
                      'badge-soft',
                      RESOLVED_STATES.includes(ticket.status) ? 'badge-success' : 'badge-blue'
                    ]"
                  >
                    {{ ticket.status === 'Open' ? 'Submitted' : ticket.status }}
                  </span>
                  <div class="p-1 rounded-lg text-muted-foreground group-hover:text-foreground transition-colors">
                    <ChevronDown
                      :class="[
                        'size-4 transition-transform duration-200',
                        isTicketExpanded(ticket.id) ? 'rotate-180 text-primary' : ''
                      ]"
                    />
                  </div>
                </div>
              </div>

              <!-- Collapsible Body & Footer -->
              <div v-show="isTicketExpanded(ticket.id)">
                <!-- Body: description -->
                <div class="px-5 py-3.5 bg-background">
                  <p class="text-xs text-foreground-soft leading-relaxed">{{ ticket.description }}</p>

                  <!--
                    The photo the resident attached, shown back to them.

                    `GET /api/tenant/my-tickets` did not select `ticket_attachments`, while the
                    administrator's list always has - so the only person who could not see the
                    photo was the one who took it.
                  -->
                  <div v-if="ticket.ticket_attachments?.length" class="mt-3">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Photo you attached
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <a
                        v-for="att in ticket.ticket_attachments"
                        :key="att.id"
                        :href="att.file_url"
                        target="_blank"
                        rel="noopener"
                        class="block size-20 rounded-xl overflow-hidden border border-border bg-white"
                        title="Open the full-size photo"
                      >
                        <img :src="att.file_url" alt="Photo attached to this request" class="w-full h-full object-cover" />
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Footer: classification metadata + View Timeline button -->
                <div
                  class="px-5 py-3 flex flex-wrap items-center gap-2 border-t border-border bg-white"
                >
                  <span
                    :class="[
                      'badge-soft',
                      ticket.priority === 'Emergency' ? 'badge-danger' : 
                      ticket.priority === 'High' ? 'badge-warning' : 
                      ticket.priority === 'Medium' ? 'badge-blue' : 'badge-neutral'
                    ]"
                  >
                    {{ ticket.priority }} priority
                  </span>
                  <span class="badge-soft badge-neutral">
                    {{ ticket.category }}
                  </span>
                  <span
                    v-if="ticket.resolved_at"
                    class="badge-soft badge-success"
                  >
                    Resolved {{ formatDate(ticket.resolved_at) }}
                  </span>

                  <!-- View Timeline Button -->
                  <button
                    @click.stop="openTimeline(ticket)"
                    class="btn-secondary ml-auto text-xs py-1 px-3 min-h-9 h-9"
                  >
                    <ListChecks class="size-3.5 text-primary" />
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
  <div
    v-if="isTimelineOpen && activeTimelineTicket"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
    @click.self="closeTimeline"
  >
    <div class="surface-card bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden border border-border">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-border bg-background flex items-start justify-between gap-4 sticky top-0">
        <div class="min-w-0">
          <h3 class="font-display font-extrabold text-base text-foreground truncate">{{ activeTimelineTicket.title }}</h3>
          <p class="text-xs text-muted-foreground mt-0.5">
            Progress Timeline · #{{ activeTimelineTicket.id.slice(0, 8) }}
          </p>
        </div>
        <button
          @click="closeTimeline"
          class="p-1.5 rounded-lg text-muted-foreground hover:bg-border cursor-pointer shrink-0"
        >
          <X class="size-4" />
        </button>
      </div>

      <div class="p-6 space-y-6">
        <!-- 5-Stage Progress Stepper -->
        <div>
          <p class="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Repair Progress</p>
          <div class="space-y-0">
            <div
              v-for="(stage, index) in TIMELINE_STAGES"
              :key="index"
              class="flex gap-4"
            >
              <!-- Connector column -->
              <div class="flex flex-col items-center">
                <div
                  :class="[
                    'size-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    index <= getStageIndex(activeTimelineTicket.status)
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-border text-muted-foreground'
                  ]"
                >
                  <CheckCircle2 v-if="index <= getStageIndex(activeTimelineTicket.status)" class="size-4" />
                  <span v-else class="text-[10px] font-bold">{{ index + 1 }}</span>
                </div>
                <div
                  v-if="index < TIMELINE_STAGES.length - 1"
                  :class="[
                    'w-0.5 flex-1 min-h-[28px]',
                    index < getStageIndex(activeTimelineTicket.status) ? 'bg-primary' : 'bg-border'
                  ]"
                />
              </div>

              <!-- Stage text -->
              <div class="pb-5 flex-1 min-w-0">
                <p
                  :class="[
                    'text-xs sm:text-sm font-bold leading-tight',
                    index <= getStageIndex(activeTimelineTicket.status) ? 'text-foreground' : 'text-muted-foreground'
                  ]"
                >
                  {{ stage.label }}
                  <span
                    v-if="index === getStageIndex(activeTimelineTicket.status)"
                    class="badge-soft badge-blue text-[10px] font-bold ml-2"
                  >CURRENT</span>
                </p>
                <p
                  :class="[
                    'text-xs mt-0.5',
                    index <= getStageIndex(activeTimelineTicket.status) ? 'text-foreground-soft' : 'text-muted-foreground'
                  ]"
                >
                  {{ stage.desc }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-border" />

        <!-- Notes / Comment Feed -->
        <div>
          <p class="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Activity &amp; Notes</p>

          <p
            v-if="timelineError"
            class="mb-3 rounded-xl border border-amber-300 bg-amber-50/60 px-3.5 py-2.5 text-xs text-foreground-soft"
          >
            <strong class="text-foreground">Replies could not be loaded.</strong>
            This does not mean nobody has answered — only that we could not check.
            <span class="text-muted-foreground">{{ timelineError }}</span>
          </p>

          <div class="space-y-3 mb-4 max-h-48 overflow-y-auto">
            <div
              v-for="note in timelineNotes"
              :key="note.id"
              class="flex gap-3"
            >
              <div class="size-7 rounded-full bg-neutral-dark text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {{ note.author[0] }}
              </div>
              <div class="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5">
                <p class="text-xs font-bold text-foreground">{{ note.author }}</p>
                <p class="text-xs text-foreground-soft mt-0.5 leading-relaxed">{{ note.text }}</p>
                <p class="text-[10px] text-muted-foreground mt-1">{{ formatDateTime(note.timestamp) }}</p>
              </div>
            </div>
          </div>

          <!-- Add Note Input -->
          <div class="flex gap-2">
            <input
              v-model="newNoteText"
              type="text"
              placeholder="Add a follow-up note for Landlady Fe…"
              @keydown.enter.prevent="postNote"
              class="form-input flex-1 text-xs"
            />
            <button
              @click="postNote"
              :disabled="!newNoteText.trim() || savingNote"
              class="btn-primary shrink-0"
            >
              <MessageSquarePlus class="size-3.5" />
              <span>{{ savingNote ? '…' : 'Post' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
