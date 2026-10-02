<script setup lang="ts">
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useLiveRefresh } from '@/lib/live';
import { writesUnavailable } from '@/lib/offlineCache';
import { useRouter } from 'vue-router';
import { inquiries, fetchInquiries as fetchInquiriesState, inquiriesFetchFailed, rooms, roomsFetchFailed, roomsLoaded, fetchRooms, showToast, type Inquiry } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api, failureTitle } from '@/lib/api';
import { useOpenFromQuery } from '@/lib/openFromQuery';
import { Inbox, Phone, Mail, Send, Loader2, UserPlus, XCircle, Trash2 } from 'lucide-vue-next';
import { sortRows, orderOptions, type RowOrder } from '@/lib/rowOrder';
import StatusPill from '@/components/overview/StatusPill.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import UnavailableNote from '@/components/overview/UnavailableNote.vue';
import ListToolbar from '@/components/ui/ListToolbar.vue';
import type { ToolbarFilter } from '@/components/ui/listToolbar';

const router = useRouter();

interface MessageBubble {
  id: string | number;
  from: 'them' | 'me';
  author: string;
  text: string;
  time: string;
}

const activeInquiryId = ref<string | null>(null);
const replyMessage = ref('');
const searchQuery = ref('');
const isLoading = ref(false);
const isSubmitting = ref(false);

// Local conversation store mapped by inquiry id
const inquiryThreads = ref<Record<string, MessageBubble[]>>({});

/**
 * `inquiry_status_type` is (Pending | Contacted | Converted | Closed), and this page showed
 * none of it. Every lead wore a hardcoded "Active Prospect" badge - the one she had already
 * answered, the one that became a tenancy, and the one that went nowhere, all identical -
 * and the list rows carried no status at all.
 *
 * 'Closed' had no writer anywhere in the system either, so a dead lead stayed in the inbox
 * forever. The API has accepted it since the schema was written.
 */
const STATUS_TONE: Record<string, 'verify' | 'paid' | 'neutral'> = {
  Pending: 'verify',
  Contacted: 'neutral',
  Converted: 'paid',
  Closed: 'neutral',
};

/** The four states of `inquiry_status_type`, said the way a person would. */
const STATUS_WORD: Record<string, string> = {
  Pending: 'Waiting for an answer',
  Contacted: 'Answered',
  Converted: 'Moved in',
  Closed: 'Closed',
};

function statusTone(status: string) {
  return STATUS_TONE[status] ?? 'neutral';
}

function statusWord(status: string) {
  return STATUS_WORD[status] ?? status;
}

/** A lead that converted or was closed is finished; it takes no further action. */
function isLeadOpen(status: string) {
  return status !== 'Converted' && status !== 'Closed';
}

// Confirmation modal, same shape as the ledger and expenses pages.
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<(() => void) | null>(null);
const confirmLabel = ref('Close inquiry');

function showConfirm(title: string, message: string, action: () => void, label = 'Close inquiry') {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
  confirmLabel.value = label;
  isConfirmOpen.value = true;
}

/**
 * Deletes the inquiry and its conversation for good (Sean, 2026-10-02: "a delete button that
 * completely deletes it on the database"; server: DELETE /admin/inquiries/:id, audited). Removed
 * from the screen only after the server confirms it, never before.
 */
function handleDeleteInquiry() {
  const inq = activeInquiry.value;
  if (!inq) return;
  showConfirm(
    'Delete this inquiry?',
    `${inq.name}, unit ${inq.unit.toUpperCase()}.\n\nThe inquiry and its conversation are removed for good. This cannot be undone.`,
    async () => {
      isSubmitting.value = true;
      try {
        await api.delete(`/admin/inquiries/${inq.id}`);
        await fetchInquiriesState();
        showToast('success', 'Inquiry deleted', `${inq.name}'s inquiry is gone.`);
      } catch (err: any) {
        showToast('error', failureTitle(err, 'Not deleted'), err?.message || 'The inquiry is still there.');
      } finally {
        isSubmitting.value = false;
      }
    },
    'Delete inquiry'
  );
}

function handleConfirmAccept() {
  const action = confirmAction.value;
  isConfirmOpen.value = false;
  if (action) action();
}

function handleCloseLead() {
  const inq = activeInquiry.value;
  if (!inq) return;

  showConfirm(
    'Close this inquiry?',
    `${inq.name}, unit ${inq.unit.toUpperCase()}.\n\nYou can still read it, but they will no longer be able to write back.`,
    async () => {
      isSubmitting.value = true;
      try {
        await api.patch(`/admin/inquiries/${inq.id}`, { status: 'Closed' });
        await fetchInquiriesState();
        showToast('success', 'Inquiry closed', `${inq.name}'s inquiry is closed.`);
      } catch (err: any) {
        showToast('error', failureTitle(err, 'Not closed'), err?.message || 'The inquiry was not updated.');
      } finally {
        isSubmitting.value = false;
      }
    }
  );
}

async function fetchInquiries() {
  isLoading.value = true;
  try {
    await fetchInquiriesState();
    if (!activeInquiryId.value && inquiries.length > 0) {
      activeInquiryId.value = inquiries[0].id;
    }
  } catch (err) {
    console.error('fetchInquiries failed:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  /**
   * The rate quoted beside an inquiry ("which rents for ...") reads `rooms`, and
   * nothing on this screen ever loaded them. Opened straight from the menu or a
   * notification, `rooms` was still the seed, so a Penthouse inquiry was quoted
   * ₱12,000 a month against the ₱30,000 Rooms and rates shows (audit
   * 2026-10-01). Not awaited: the inbox does not wait for the rates, and the
   * price is held back until they have arrived (`roomsLoaded`, below).
   */
  if (!roomsLoaded.value) void fetchRooms().catch(() => {});
  await fetchInquiries();
  // Only when nothing is chosen yet: a notification may already have opened one.
  if (!activeInquiryId.value && inquiries.length > 0) {
    activeInquiryId.value = inquiries[0].id;
  }
});

/** An enquiry named by its notification (`?inquiry=<id>`) opens on its thread. */
useOpenFromQuery('inquiry', async (id) => {
  if (!inquiries.some((i) => i.id === id)) await fetchInquiriesState();
  if (inquiries.some((i) => i.id === id)) await selectInquiry(id);
  else if (!inquiriesFetchFailed.value) showToast('info', 'Not found', 'That inquiry is no longer in the list.');
});

/**
 * Which inquiries to list, by where they stand. New with the shared list
 * toolbar (Sean, 2026-10-01): every list has the same filter button, and here
 * the useful question is "who is still waiting for an answer". All by default,
 * so nothing is hidden on arrival.
 */
const statusFilter = ref('All');
const inquiryFilters = computed<ToolbarFilter[]>(() => [
  {
    key: 'status',
    label: 'Status',
    value: statusFilter.value,
    defaultValue: 'All',
    options: [
      { value: 'All', label: 'All inquiries', count: inquiries.length },
      ...Object.keys(STATUS_WORD).map((s) => ({
        value: s,
        label: STATUS_WORD[s],
        count: inquiries.filter((i) => i.status === s).length,
      })),
    ],
  },
  { key: 'order', label: 'Order', value: inquiryOrder.value, defaultValue: 'newest', options: orderOptions(['newest', 'oldest', 'unit', 'name']) },
]);

// Filters > Order (Sean, 2026-10-02, every list).
const inquiryOrder = ref<RowOrder>('newest');
const filteredInquiries = computed(() => {
  return sortRows(inquiries.filter(inq => {
    const matchesSearch =
      inq.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      inq.unit.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      inq.phone.includes(searchQuery.value) ||
      inq.email.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesSearch && (statusFilter.value === 'All' || inq.status === statusFilter.value);
  }), inquiryOrder.value, { unit: (i) => i.unit, name: (i) => i.name, date: (i) => i.date });
});

const activeInquiry = computed(() => {
  if (!activeInquiryId.value) return inquiries[0] || null;
  return inquiries.find(i => i.id === activeInquiryId.value) || inquiries[0] || null;
});

/**
 * Choosing an enquiry on a phone scrolls to it.
 *
 * Below `xl` the detail panel sits UNDER the whole list, so a tap changed a
 * panel that was off screen and nothing appeared to happen (B-61). From `xl`
 * the two are side by side and the page must not move. `scroll-mt-24` on the
 * panel keeps its heading clear of the sticky workspace header.
 */
const detailPanel = ref<HTMLElement | null>(null);

async function selectInquiry(id: string) {
  activeInquiryId.value = id;
  if (window.matchMedia('(min-width: 1280px)').matches) return;
  await nextTick();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  detailPanel.value?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

const activeUnit = computed(() => {
  if (!activeInquiry.value) return null;
  return rooms.find(u => u.unitCode.toLowerCase() === activeInquiry.value?.unit.toLowerCase()) || null;
});

/**
 * The whole conversation, oldest first.
 *
 * The prospect's own message is a row in `inquiry_messages` too - the public
 * form writes it there with `sender_name` set to their name - so it comes back
 * with the replies and must not be prepended a second time. The fallback below
 * covers an enquiry stored before that was true, and a failed load.
 */
const activeMessages = computed<MessageBubble[]>(() => {
  if (!activeInquiry.value) return [];
  const stored = inquiryThreads.value[activeInquiry.value.id];
  if (stored?.length) return stored;

  return [
    {
      id: `init-${activeInquiry.value.id}`,
      from: 'them',
      author: activeInquiry.value.name,
      text: activeInquiry.value.message,
      time: activeInquiry.value.date || 'When they wrote in',
    },
  ];
});

/**
 * Reads the replies already on record.
 *
 * The thread was built in local state only: a reply appeared under the enquiry
 * and was gone on the next reload, even though the API stored it and has served
 * `GET /admin/inquiries/:id/messages` all along. So the landlady could not see
 * what she had already answered, which is the one thing an inbox is for.
 */
const threadError = ref<string | null>(null);

// The open conversation stays current: a visitor's reply appears while she reads (lib/live.ts).
useLiveRefresh(() => (activeInquiryId.value ? loadThread(activeInquiryId.value) : undefined));

async function loadThread(inquiryId: string) {
  threadError.value = null;
  try {
    /**
     * The column names are the row keys: the endpoint returns `select('*')`.
     * The body is `message_body`, not `message` - asking for the wrong one is
     * `undefined` in a browser, not an error, so the bubbles rendered empty.
     * Checked against `information_schema.columns`, not against the schema file.
     */
    const data = await api.get<
      {
        id: string;
        message_body: string;
        sender_id: string | null;
        sender_name?: string;
        sent_at?: string;
      }[]
    >(`/admin/inquiries/${inquiryId}/messages`);
    inquiryThreads.value[inquiryId] = (data ?? []).map((m) => ({
      id: m.id,
      // The prospect has no profile, so a null sender is their side of it.
      from: m.sender_id ? ('me' as const) : ('them' as const),
      // "You" for her own replies, as the repair messages say it.
      author: m.sender_id
        ? 'You'
        : (m.sender_name || inquiries.find((i) => i.id === inquiryId)?.name || 'The person asking'),
      text: m.message_body,
      time: m.sent_at ? new Date(m.sent_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }) : 'Time not recorded',
    }));
  } catch (err: unknown) {
    // Said plainly rather than shown as an empty thread, which would read as
    // "nothing was ever sent".
    inquiryThreads.value[inquiryId] = [];
    threadError.value =
      err instanceof Error ? err.message : 'The replies on record could not be loaded.';
  }
}

watch(
  activeInquiryId,
  (id) => {
    if (id) loadThread(id);
  },
  { immediate: true }
);

async function handleSendReply() {
  if (!activeInquiry.value || !replyMessage.value.trim()) return;
  isSubmitting.value = true;
  const currentInq = activeInquiry.value;
  const messageToSend = replyMessage.value.trim();

  try {
    // The endpoint is /messages - there is no /reply route, so this call always
    // 404'd. It was silent because the catch below swallowed it as an "offline
    // fallback", and the thread was only ever updated in local state: the reply
    // looked sent, and was never stored.
    await api.post(`/admin/inquiries/${currentInq.id}/messages`, {
      message: messageToSend,
    });

    // Read it back rather than guessing, so what is on screen is what is stored.
    await loadThread(currentInq.id);

    /**
     * The reply also moves the lead on, and the list has to be told.
     *
     * Sending a message advances a Pending inquiry to 'Contacted' server-side
     * ('Converted' and 'Closed' are left alone). `loadThread` only reloads the
     * message bubbles, so the status pill beside the name kept saying Pending
     * however many times she had answered. Nothing was wrong in the database -
     * the screen was just reading a copy fetched before the reply.
     *
     * The effect was that answered leads were indistinguishable from unanswered
     * ones, which is the one thing this inbox exists to tell her.
     */
    await fetchInquiriesState();

    showToast('success', 'Reply saved', `Your answer to ${currentInq.name} is on record.`);
    replyMessage.value = '';
  } catch (err: unknown) {
    // Without this the failure propagated silently: the reply box emptied, no
    // toast appeared, and the landlady had no way to tell the message had not
    // been stored.
    showToast(
      'error',
      failureTitle(err, 'Reply not sent'),
      err instanceof Error ? err.message : 'Your reply could not be saved. Please try again.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <!-- `ws-focus` carries the workspace focus ring; see ExpensesLedgerView for
       why a view has to supply it. It matters more here than most: the enquiry
       inbox is a list of buttons, and walking it from the keyboard was the way
       it was meant to be worked. -->
  <div class="ws-focus space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <!-- No subtitle that restates the page name (Sean, 2026-10-01, fewer words). -->
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          Inquiries
        </h1>
      </div>

    </div>

    <div class="grid min-h-[620px] grid-cols-1 gap-4 xl:grid-cols-12">
      <!-- The enquiries -->
      <div class="flex flex-col overflow-hidden rounded-tile bg-tile xl:col-span-4">
        <div class="space-y-3 border-b border-line p-4">
          <!-- The list toolbar every screen shares (components/ui/ListToolbar.vue,
               Sean, 2026-10-01): search, and the filter button beside it. -->
          <ListToolbar
            v-model:search="searchQuery"
            search-label="Search inquiries"
            :filters="inquiryFilters"
            @apply="(v) => { statusFilter = String(v.status); inquiryOrder = v.order as RowOrder; }"
          />
          <p class="text-sm text-ink-soft">
            {{ filteredInquiries.length }}
            {{ filteredInquiries.length === 1 ? 'inquiry' : 'inquiries' }}
          </p>
        </div>

        <div class="max-h-[540px] flex-1 overflow-y-auto">
          <!-- The first read. Without this the list fell straight through to its
               empty state - "Nothing matches what you have typed" - while the
               request that would have filled it was still in flight. Built from
               the same row shape as the real list, not the generic tile card -
               this panel is already on --tile, so a card-shaped placeholder
               would have drawn no edge against it. -->
          <div v-if="isLoading" class="divide-y divide-line" aria-busy="true">
            <span class="sr-only" role="status">Loading inquiries</span>
            <div v-for="i in 3" :key="i" class="space-y-2.5 p-4">
              <div class="flex items-start justify-between gap-2">
                <Skeleton class-name="h-4 w-32 rounded-full" />
                <Skeleton class-name="h-3 w-12 shrink-0 rounded-full" />
              </div>
              <Skeleton class-name="h-3 w-20 rounded-full" />
              <Skeleton class-name="h-3 w-full rounded-full" />
              <Skeleton class-name="h-3 w-2/3 rounded-full" />
            </div>
          </div>

          <!--
            A failed load is not an empty inbox. Without this, a refused request
            left `inquiries` untouched and the list said "Nothing matches what
            you have typed" - which is a statement about the SEARCH, on a screen
            that had not managed to read anything at all.
          -->
          <div v-else-if="inquiriesFetchFailed" class="ws-reveal p-4">
            <UnavailableNote
              message="The inquiries could not be loaded. That is not the same as there being none."
              @retry="fetchInquiries"
            />
          </div>

          <!-- Two different empties. This said "Nothing matches what you have
               typed" to an inbox with nothing in it and nothing typed (B-61). -->
          <p v-else-if="inquiries.length === 0" class="ws-reveal p-8 text-center text-sm text-ink-soft">
            No inquiries yet.
          </p>

          <p v-else-if="filteredInquiries.length === 0" class="ws-reveal p-8 text-center text-sm text-ink-soft">
            <template v-if="searchQuery.trim()">No inquiry matches “{{ searchQuery.trim() }}”.</template>
            <!-- Only the status filter can empty the list without a search. -->
            <template v-else>No inquiry is “{{ statusWord(statusFilter) }}”.</template>
          </p>

          <!--
            Each enquiry is a button. They were clickable divs, so the inbox
            could not be worked through from the keyboard at all.

            The selected one is a filled row, not a thick coloured left border.
            That side-tab is the most recognisable tell of a generated
            interface, and the fill says the same thing without the bar - the
            unit picker on the public category page already selects this way.
          -->
          <ul v-else class="ws-reveal divide-y divide-line">
            <li v-for="inq in filteredInquiries" :key="inq.id">
              <button
                type="button"
                :aria-current="activeInquiry?.id === inq.id ? 'true' : undefined"
                :class="[
                  'press-plate w-full p-4 text-left',
                  activeInquiry?.id === inq.id
                    ? 'bg-brand-soft'
                    : 'hover:bg-canvas',
                ]"
                @click="selectInquiry(inq.id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="min-w-0 truncate text-sm font-semibold text-ink">{{ inq.name }}</p>
                  <span class="shrink-0 text-xs text-ink-faint">{{ inq.date || 'Recently' }}</span>
                </div>

                <div class="mt-1.5 flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-brand">
                    Unit {{ inq.unit.toUpperCase() }}
                  </span>
                  <StatusPill :tone="statusTone(inq.status)">{{ statusWord(inq.status) }}</StatusPill>
                </div>

                <!--
                  `break-words`: this is the visitor's own free text (up to
                  2000 characters, InquireView.vue), and `line-clamp-2` only
                  hides extra LINES - it does nothing about a single line that
                  is one long unbroken run (a pasted URL, a typo with no
                  spaces). Measured with such a message: 1110px of scrollWidth
                  against a 301px row at 375px, hidden rather than shown by
                  `body`'s `overflow-x: hidden`, so it read as a blank card.
                -->
                <p class="mt-2 line-clamp-2 break-words text-sm leading-6 text-ink-soft">{{ inq.message }}</p>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- The one being read -->
      <div
        v-if="activeInquiry"
        ref="detailPanel"
        class="ws-reveal flex min-h-[550px] scroll-mt-24 flex-col overflow-hidden rounded-tile bg-tile xl:col-span-8"
      >
        <div class="border-b border-line p-5 sm:p-6">
          <!-- Delete sits top right, level with the name, at every width (Sean, 2026-10-02). -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-2">
              <h2 class="min-w-0 break-words text-lg font-semibold tracking-tight text-ink">
                {{ activeInquiry.name }}
              </h2>
              <span
                v-if="activeInquiry.referenceCode"
                class="tabular text-xs tracking-[0.08em] text-ink-faint"
              >{{ activeInquiry.referenceCode }}</span>
              <!-- Was a hardcoded "Active Prospect" on every lead, whatever its status. -->
              <StatusPill :tone="statusTone(activeInquiry.status)">
                {{ statusWord(activeInquiry.status) }}
              </StatusPill>
            </div>
            <button
              type="button"
              class="icon-btn-plain text-overdue"
              aria-label="Delete inquiry"
              title="Delete inquiry"
              :disabled="isSubmitting || writesUnavailable"
              @click="handleDeleteInquiry"
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </button>
          </div>

          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">

              <!--
                `min-h-[2.75rem]`, the height every other control in the
                workspace is (`.pill-btn`, `.icon-btn`, PillSelect's trigger).
                These two are how the office actually reaches a prospect - the
                first one dials the phone - and they were 28px tall measured at
                a 375px viewport, well under the ~44px a finger needs. The text
                does not move; the box around it grows.
              -->
              <div class="mt-2 flex flex-wrap items-center gap-x-4 text-sm text-ink-soft">
                <a
                  :href="`tel:${activeInquiry.phone}`"
                  class="press tabular inline-flex min-h-[2.75rem] items-center gap-1.5 py-1 font-semibold text-ink hover:text-brand"
                >
                  <Phone class="size-3.5" aria-hidden="true" />{{ activeInquiry.phone }}
                </a>
                <a
                  v-if="activeInquiry.email"
                  :href="`mailto:${activeInquiry.email}`"
                  class="press inline-flex min-h-[2.75rem] min-w-0 items-center gap-1.5 py-1 hover:text-brand"
                >
                  <Mail class="size-3.5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{{ activeInquiry.email }}</span>
                </a>
              </div>

              <p v-if="activeUnit" class="mt-2 text-sm text-ink-soft">
                <!-- The rate she quotes a prospective resident. `rooms` is seeded, so a
                     failed refresh would have her quoting a figure up to ₱1,900 out. Better
                     to show no price than a wrong one. -->
                Filed under unit
                <span class="font-semibold uppercase text-ink">{{ activeUnit.unitCode }}</span
                ><template v-if="roomsLoaded && !roomsFetchFailed">, which rents for
                  <span class="tabular font-semibold text-ink">{{ peso(activeUnit.price) }}</span>
                  a month</template
                >.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <template v-if="isLeadOpen(activeInquiry.status)">
                <button
                  type="button"
                  class="pill-btn"
                  :disabled="isSubmitting || writesUnavailable"
                  :title="writesUnavailable ? 'Needs a connection' : undefined"
                  @click="handleCloseLead"
                >
                  <XCircle class="size-3.5" aria-hidden="true" />
                  <span>Close inquiry</span>
                </button>

                <button
                  type="button"
                  class="pill-btn-brand"
                  @click="
                    router.push({
                      path: '/admin/tenants',
                      query: {
                        convertInquiryId: activeInquiry.id,
                        name: activeInquiry.name,
                        phone: activeInquiry.phone,
                        email: activeInquiry.email,
                        unit: activeInquiry.unit,
                      },
                    })
                  "
                >
                  <UserPlus class="size-4" aria-hidden="true" />
                  <span>Move them in</span>
                </button>
              </template>
              <!-- A finished inquiry has no other actions. Its status already shows beside
                   the name, so it is not repeated here. -->
            </div>
          </div>
        </div>

        <!-- What was said -->
        <div class="max-h-[380px] flex-1 space-y-5 overflow-y-auto bg-canvas p-5 sm:p-6">
          <p v-if="threadError" class="ws-reveal rounded-2xl bg-overdue-soft p-4 text-sm leading-6 text-overdue">
            The replies already on record could not be loaded, so only their original message is
            shown. {{ threadError }}
          </p>

          <div
            v-for="msg in activeMessages"
            :key="msg.id"
            :class="['flex flex-col', msg.from === 'me' ? 'items-end' : 'items-start']"
          >
            <p class="mb-1 px-1 text-xs text-ink-faint">
              <span class="font-semibold text-ink-soft">{{ msg.author }}</span>
              · {{ msg.time }}
            </p>

            <!--
              `break-words`: the first bubble is the prospect's own free text,
              unmoderated, up to 2000 characters. `max-w-md` bounds the
              bubble, but bounding a container does nothing for a single
              unbroken run inside it - measured a bubble at offsetWidth 448
              with scrollWidth 1126, 678px hidden past its own edge by
              `body`'s `overflow-x: hidden`, in the one place the landlady
              actually reads what a prospect asked her.
            -->
            <div
              :class="[
                'max-w-md break-words rounded-2xl px-4 py-3 text-sm leading-6',
                msg.from === 'me' ? 'bg-brand text-on-brand' : 'bg-tile text-ink',
              ]"
            >
              {{ msg.text }}
            </div>
          </div>
        </div>

        <!-- Writing back. The send button sits inside the field, as in a chat app
             (Sean, 2026-10-02). Nothing goes out by text or email: the reply is
             saved to `inquiry_messages`, and since 065 the visitor reads it on
             their inquiry page. -->
        <form @submit.prevent="handleSendReply" class="space-y-2 border-t border-line p-4 sm:p-5">
          <label for="reply" class="sr-only">Your answer</label>
          <div class="relative">
            <textarea
              id="reply"
              v-model="replyMessage"
              rows="1"
              placeholder="Write a reply"
              class="ws-textarea block min-h-14 max-h-40 w-full resize-none rounded-[1.75rem] py-4 pl-5 pr-16 [field-sizing:content]"
              required
            ></textarea>
            <button
              type="submit"
              aria-label="Send reply"
              :disabled="isSubmitting || writesUnavailable || !replyMessage.trim()"
              :title="writesUnavailable ? 'Needs a connection' : 'Send reply'"
              class="pill-btn-brand absolute bottom-1.5 right-1.5 size-11 px-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
              <Send v-else class="size-4" aria-hidden="true" />
            </button>
          </div>
          <!-- Sent before 30 Sep 2026: no inquiry page, so this reply never reaches them. -->
          <p v-if="!activeInquiry.hasConversation" class="ws-hint px-1">
            They can't read replies online. Call or text them too.
          </p>
        </form>
      </div>

      <div
        v-else
        class="grid place-items-center rounded-tile bg-tile p-12 text-center xl:col-span-8"
      >
        <div>
          <Inbox class="mx-auto size-8 text-ink-faint" aria-hidden="true" />
          <p class="mt-3 text-base font-semibold text-ink">Nothing picked yet</p>
          <p class="mt-1 text-sm leading-6 text-ink-soft">
            Choose an inquiry to read it and answer.
          </p>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-label="confirmLabel"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmAccept"
    />
  </div>
</template>
