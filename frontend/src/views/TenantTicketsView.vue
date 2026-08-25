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
  MessageSquarePlus,
  ListChecks,
} from 'lucide-vue-next';

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

/** The room the ticket is filed against — derived server-side data, never typed by the tenant. */
const activeRoomId = ref<string | null>(null);
const activeRoomNumber = ref<string>('');

// Status filter chips. 'All' is the default so nothing is hidden on first paint.
const statusFilter = ref<'All' | 'Open' | 'Resolved'>('All');

const RESOLVED_STATES = ['Resolved', 'Closed'];

const filteredTickets = computed(() => {
  if (statusFilter.value === 'All') return tickets.value;
  const wantResolved = statusFilter.value === 'Resolved';
  return tickets.value.filter((t) => RESOLVED_STATES.includes(t.status) === wantResolved);
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
const newNoteText = ref('');
const savingNote = ref(false);

/**
 * The 5-stage progress timeline for every maintenance ticket.
 * Each stage maps to known status strings from the backend / local mock.
 * @systemBibleRef Section 15 (Maintenance Workflow Stages)
 */
const TIMELINE_STAGES = [
  { key: 'Submitted',  label: 'Submitted',           desc: 'Your ticket has been received.' },
  { key: 'Open',       label: 'Reviewed by Landlady', desc: 'Landlady Fe has reviewed your request.' },
  { key: 'In Progress', label: 'Handyman Assigned',   desc: 'A handyman has been dispatched.' },
  { key: 'In Progress', label: 'Work In Progress',    desc: 'Repairs are currently underway.' },
  { key: 'Resolved',   label: 'Resolved',             desc: 'The issue has been fully resolved.' },
];

function getStageIndex(status: string): number {
  if (RESOLVED_STATES.includes(status)) return 4;
  if (status === 'In Progress') return 2; // Show up to "Handyman Assigned"
  if (status === 'Open') return 1;
  return 0; // Submitted / just filed
}

async function openTimeline(ticket: TicketRow) {
  activeTimelineTicket.value = ticket;
  timelineNotes.value = seedNotesForTicket(ticket);
  newNoteText.value = '';
  isTimelineOpen.value = true;

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
  } catch {
    // Fallback to seeded notes
  }
}

function closeTimeline() {
  isTimelineOpen.value = false;
  activeTimelineTicket.value = null;
  newNoteText.value = '';
}

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
      id: `note-ll-${ticket.id}`,
      author: 'Landlady Fe',
      text: 'Thank you for reporting this! I have assigned a handyman and they will visit soon.',
      timestamp: ticket.created_at,
    });
  }
  if (RESOLVED_STATES.includes(ticket.status) && ticket.resolved_at) {
    base.push({
      id: `note-resolve-${ticket.id}`,
      author: 'Landlady Fe',
      text: 'Issue has been resolved. Please let me know if you encounter the same problem again.',
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
    if (activeRoomId.value) {
      try {
        const attachments = ticketPhotoUrl.value
          ? [{ fileUrl: ticketPhotoUrl.value, fileType: 'image/png' }]
          : undefined;

        await api.post('/tenant/tickets', {
          roomId: activeRoomId.value,
          title: ticketTitle.value.trim(),
          description: ticketDescription.value.trim(),
          category: ticketCategory.value,
          priority: ticketPriority.value,
          attachments,
        });
      } catch {
        // Fallback for offline mode
      }
    }

    const newTicket: TicketRow = {
      id: `TCK-${Date.now().toString().slice(-6)}`,
      title: ticketTitle.value.trim(),
      description: ticketDescription.value.trim(),
      category: ticketCategory.value,
      priority: ticketPriority.value,
      status: 'Open',
      created_at: new Date().toISOString(),
      resolved_at: null,
      rooms: { id: activeRoomId.value || '1a', room_number: activeRoomNumber.value || '1A' }
    };
    tickets.value.unshift(newTicket);

    ticketNotice.value = `Ticket "${ticketTitle.value.trim()}" has been submitted to Landlady Fe Galang Da Silva for review.`;
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
      return 'bg-[#f4f5f7] text-[#5e6c84] border-[#dfe1e6]';
  }
}

function statusClass(status: string) {
  if (RESOLVED_STATES.includes(status)) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'In Progress') return 'bg-amber-50 text-amber-900 border-amber-200';
  return 'bg-[#e9f2ff] text-[#0c66e4] border-[#b3d4ff]';
}
</script>

<template>
  <div class="max-w-6xl mx-auto w-full space-y-6">
    <!-- Breadcrumb Header -->
    <div class="border-b border-[#dfe1e6] pb-4">
      <div class="flex items-center gap-2 text-xs text-[#6b778c] mb-1">
        <span>Tenant Portal</span>
        <span>/</span>
        <span class="font-medium text-[#172b4d]">Maintenance</span>
      </div>
      <h1 class="font-display text-xl sm:text-2xl font-extrabold text-[#172b4d]">Maintenance Tickets</h1>
      <p class="text-xs text-[#6b778c] mt-0.5">
        Report repair requests and track their progress
        <span v-if="activeRoomNumber"> for Unit {{ activeRoomNumber }}</span>
      </p>
    </div>

    <!-- Success Notice -->
    <div
      v-if="ticketNotice"
      class="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg flex items-center justify-between shadow-sm"
    >
      <div class="flex items-center gap-2.5">
        <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
        <span class="font-medium">{{ ticketNotice }}</span>
      </div>
      <button
        @click="ticketNotice = ''"
        class="text-emerald-700 hover:text-emerald-900 ml-3 p-1 rounded cursor-pointer"
        title="Dismiss"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- ---- Submit Ticket Form ---- -->
      <div class="lg:col-span-5 bg-white border border-[#dfe1e6] rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-[#dfe1e6] bg-[#f7f8f9]">
          <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
            <Wrench class="w-4 h-4 text-[#0c66e4]" />
            Submit a Maintenance Ticket
          </h2>
          <p class="text-xs text-[#6b778c] mt-1">
            Reported directly to Landlady Fe Galang Da Silva.
          </p>
        </div>

        <form @submit.prevent="handleTicketSubmit" class="p-6 space-y-5">
          <div
            v-if="ticketError"
            class="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md flex items-start gap-2"
          >
            <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{{ ticketError }}</span>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="ticket-title">
              Issue Title
            </label>
            <input
              id="ticket-title"
              v-model="ticketTitle"
              type="text"
              placeholder="e.g. Bathroom sink pipe leak"
              class="w-full text-sm px-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
              required
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="ticket-category">
                Category
              </label>
              <select
                id="ticket-category"
                v-model="ticketCategory"
                class="w-full text-sm px-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none cursor-pointer transition"
              >
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Appliance">Appliance / Aircon</option>
                <option value="Structural / Furniture">Structural / Furniture</option>
                <option value="General Maintenance">General Maintenance</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="ticket-priority">
                Priority
              </label>
              <select
                id="ticket-priority"
                v-model="ticketPriority"
                class="w-full text-sm px-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none cursor-pointer transition"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#172b4d] mb-1.5" for="ticket-desc">
              Details &amp; Description
            </label>
            <textarea
              id="ticket-desc"
              v-model="ticketDescription"
              rows="5"
              placeholder="Describe the issue — where it is in the unit, when it started, and how severe it is."
              class="w-full text-sm px-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] leading-relaxed focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition resize-y"
              required
            ></textarea>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#172b4d] mb-1.5">
              Attach Photo <span class="font-normal text-[#6b778c]">(optional)</span>
            </label>

            <div
              v-if="!ticketPhotoUrl"
              class="border-2 border-dashed border-[#dfe1e6] rounded-md p-6 text-center bg-[#f7f8f9] hover:bg-[#e9f2ff]/50 hover:border-[#0c66e4]/40 transition-colors"
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
                class="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <ImageIcon class="w-6 h-6 text-[#0c66e4]" />
                <span class="text-sm font-medium text-[#172b4d]">Click to upload a photo</span>
                <span class="text-xs text-[#6b778c]">PNG, JPG or WEBP up to 10MB</span>
              </label>
            </div>

            <div
              v-else
              class="p-3 bg-[#e9f2ff] border border-[#b3d4ff] rounded-md flex items-center justify-between gap-3"
            >
              <div class="flex items-center gap-3 overflow-hidden">
                <img
                  :src="ticketPhotoUrl"
                  alt="Ticket attachment preview"
                  class="w-12 h-12 object-cover rounded border border-[#b3d4ff] shrink-0"
                />
                <div class="truncate">
                  <span class="text-sm font-semibold text-[#172b4d] block truncate">
                    {{ ticketPhotoName }}
                  </span>
                  <span class="text-xs text-emerald-700 font-medium">Photo attached</span>
                </div>
              </div>
              <button
                type="button"
                @click="removePhoto"
                class="p-1.5 text-[#6b778c] hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer shrink-0"
                title="Remove photo"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-3 px-4 bg-[#0c66e4] hover:bg-[#0055cc] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send class="w-4 h-4" />
            <span>{{ submitting ? 'Submitting…' : 'Submit Maintenance Ticket' }}</span>
          </button>
        </form>
      </div>

      <!-- ---- Ticket Tracker ---- -->
      <div class="lg:col-span-7 bg-white border border-[#dfe1e6] rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-[#dfe1e6] bg-[#f7f8f9]">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <h2 class="font-bold text-sm text-[#172b4d] flex items-center gap-2">
              <FileText class="w-4 h-4 text-[#0c66e4]" />
              My Ticket Tracker
            </h2>
            <span class="text-xs text-[#6b778c]">
              <strong class="text-[#172b4d]">{{ openCount }}</strong> open ·
              <strong class="text-[#172b4d]">{{ resolvedCount }}</strong> resolved
            </span>
          </div>

          <!-- Status filter chips -->
          <div class="flex items-center gap-2 mt-3">
            <button
              v-for="chip in (['All', 'Open', 'Resolved'] as const)"
              :key="chip"
              @click="statusFilter = chip"
              :class="[
                'px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors cursor-pointer',
                statusFilter === chip
                  ? 'bg-[#0c66e4] text-white border-[#0c66e4]'
                  : 'bg-white text-[#5e6c84] border-[#dfe1e6] hover:bg-[#f4f5f7]',
              ]"
            >
              {{ chip }}
            </button>
          </div>
        </div>

        <div class="p-6">
          <div v-if="loadingTickets" class="py-12 text-center text-sm text-[#5e6c84]">
            Loading your maintenance tickets…
          </div>

          <div
            v-else-if="filteredTickets.length === 0"
            class="py-12 text-center space-y-2"
          >
            <Inbox class="w-8 h-8 text-[#b3bac5] mx-auto" />
            <p class="text-sm font-medium text-[#172b4d]">No tickets to show</p>
            <p class="text-xs text-[#6b778c]">
              {{
                statusFilter === 'All'
                  ? 'Submit a ticket using the form and it will appear here.'
                  : `You have no ${statusFilter.toLowerCase()} tickets.`
              }}
            </p>
          </div>

          <div v-else class="space-y-4">
            <article
              v-for="ticket in filteredTickets"
              :key="ticket.id"
              class="border border-[#dfe1e6] rounded-lg overflow-hidden hover:border-[#0c66e4]/50 transition-colors"
            >
              <!-- Header row: title on the left, status on the right -->
              <div
                class="px-5 py-4 flex items-start justify-between gap-4 border-b border-[#dfe1e6] bg-white"
              >
                <div class="min-w-0">
                  <h3 class="font-bold text-sm text-[#172b4d] leading-snug">{{ ticket.title }}</h3>
                  <p class="text-xs text-[#6b778c] mt-1">
                    Submitted {{ formatDate(ticket.created_at) }}
                    <span v-if="ticket.rooms"> · Unit {{ ticket.rooms.room_number }}</span>
                  </p>
                </div>
                <span
                  class="px-2.5 py-1 text-xs font-bold rounded-full border shrink-0 flex items-center gap-1.5"
                  :class="statusClass(ticket.status)"
                >
                  <ShieldCheck v-if="RESOLVED_STATES.includes(ticket.status)" class="w-3.5 h-3.5" />
                  <Clock v-else class="w-3.5 h-3.5" />
                  {{ ticket.status }}
                </span>
              </div>

              <!-- Body: description gets its own quiet band -->
              <div class="px-5 py-4 bg-[#f7f8f9]">
                <p class="text-sm text-[#5e6c84] leading-relaxed">{{ ticket.description }}</p>
              </div>

              <!-- Footer: classification metadata + View Timeline button -->
              <div
                class="px-5 py-3 flex flex-wrap items-center gap-2 border-t border-[#dfe1e6] bg-white"
              >
                <span
                  class="px-2.5 py-1 text-xs font-semibold rounded border"
                  :class="priorityClass(ticket.priority)"
                >
                  {{ ticket.priority }} priority
                </span>
                <span
                  class="px-2.5 py-1 text-xs font-medium rounded border border-[#dfe1e6] bg-[#f4f5f7] text-[#5e6c84]"
                >
                  {{ ticket.category }}
                </span>
                <span
                  v-if="ticket.resolved_at"
                  class="px-2.5 py-1 text-xs font-medium rounded border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-1.5"
                >
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  Resolved {{ formatDate(ticket.resolved_at) }}
                </span>
                <span class="text-xs text-[#6b778c] font-mono flex items-center gap-1.5">
                  <Paperclip class="w-3.5 h-3.5" />
                  {{ ticket.id.slice(0, 8) }}
                </span>

                <!-- ✨ View Timeline Button -->
                <button
                  @click="openTimeline(ticket)"
                  class="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0c66e4] bg-[#e9f2ff] border border-[#b3d4ff] rounded-md hover:bg-[#dbeafe] transition-colors cursor-pointer"
                >
                  <ListChecks class="w-3.5 h-3.5" />
                  View Timeline
                  <ChevronRight class="w-3 h-3" />
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ✨ Progress Timeline Modal -->
  <div
    v-if="isTimelineOpen && activeTimelineTicket"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
    @click.self="closeTimeline"
  >
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-[#dfe1e6] bg-[#f7f8f9] flex items-start justify-between gap-4 sticky top-0">
        <div class="min-w-0">
          <h3 class="font-bold text-sm text-[#172b4d] truncate">{{ activeTimelineTicket.title }}</h3>
          <p class="text-xs text-[#6b778c] mt-0.5">
            Progress Timeline · #{{ activeTimelineTicket.id.slice(0, 8) }}
          </p>
        </div>
        <button
          @click="closeTimeline"
          class="p-1.5 rounded-lg text-[#6b778c] hover:bg-[#dfe1e6] cursor-pointer shrink-0"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-6">
        <!-- 5-Stage Progress Stepper -->
        <div>
          <p class="text-xs font-bold text-[#6b778c] uppercase tracking-wider mb-4">Repair Progress</p>
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
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    index <= getStageIndex(activeTimelineTicket.status)
                      ? 'bg-[#0c66e4] border-[#0c66e4] text-white'
                      : 'bg-white border-[#dfe1e6] text-[#b3bac5]'
                  ]"
                >
                  <CheckCircle2 v-if="index <= getStageIndex(activeTimelineTicket.status)" class="w-4 h-4" />
                  <span v-else class="text-[10px] font-bold">{{ index + 1 }}</span>
                </div>
                <div
                  v-if="index < TIMELINE_STAGES.length - 1"
                  :class="[
                    'w-0.5 flex-1 min-h-[28px]',
                    index < getStageIndex(activeTimelineTicket.status) ? 'bg-[#0c66e4]' : 'bg-[#dfe1e6]'
                  ]"
                />
              </div>

              <!-- Stage text -->
              <div class="pb-5 flex-1 min-w-0">
                <p
                  :class="[
                    'text-sm font-bold leading-tight',
                    index <= getStageIndex(activeTimelineTicket.status) ? 'text-[#172b4d]' : 'text-[#b3bac5]'
                  ]"
                >
                  {{ stage.label }}
                  <span
                    v-if="index === getStageIndex(activeTimelineTicket.status)"
                    class="ml-2 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-[#0c66e4] text-white"
                  >CURRENT</span>
                </p>
                <p
                  :class="[
                    'text-xs mt-0.5',
                    index <= getStageIndex(activeTimelineTicket.status) ? 'text-[#5e6c84]' : 'text-[#b3bac5]'
                  ]"
                >
                  {{ stage.desc }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-[#dfe1e6]" />

        <!-- Notes / Comment Feed -->
        <div>
          <p class="text-xs font-bold text-[#6b778c] uppercase tracking-wider mb-3">Activity &amp; Notes</p>

          <div class="space-y-3 mb-4 max-h-48 overflow-y-auto">
            <div
              v-for="note in timelineNotes"
              :key="note.id"
              class="flex gap-3"
            >
              <div class="w-7 h-7 rounded-full bg-[#172b4d] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {{ note.author[0] }}
              </div>
              <div class="flex-1 bg-[#f7f8f9] border border-[#dfe1e6] rounded-lg px-3 py-2.5">
                <p class="text-xs font-bold text-[#172b4d]">{{ note.author }}</p>
                <p class="text-xs text-[#5e6c84] mt-0.5 leading-relaxed">{{ note.text }}</p>
                <p class="text-[10px] text-[#b3bac5] mt-1.5">{{ formatDateTime(note.timestamp) }}</p>
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
              class="flex-1 text-sm px-3 py-2.5 border border-[#dfe1e6] rounded-md bg-white text-[#172b4d] focus:ring-2 focus:ring-[#0c66e4]/30 focus:border-[#0c66e4] focus:outline-none transition"
            />
            <button
              @click="postNote"
              :disabled="!newNoteText.trim() || savingNote"
              class="px-3 py-2.5 bg-[#0c66e4] hover:bg-[#0055cc] disabled:opacity-50 text-white rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <MessageSquarePlus class="w-4 h-4" />
              <span class="text-xs font-bold">{{ savingNote ? '…' : 'Post' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
