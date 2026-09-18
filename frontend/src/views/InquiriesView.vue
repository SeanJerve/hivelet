<script setup lang="ts">
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { inquiries, fetchInquiries as fetchInquiriesState, rooms, roomsFetchFailed, showToast, type Inquiry } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { Inbox, Phone, Mail, Send, Loader2, UserPlus, Search, XCircle } from 'lucide-vue-next';
import StatusPill from '@/components/overview/StatusPill.vue';

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
  Closed: 'Nothing came of it',
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

function showConfirm(title: string, message: string, action: () => void) {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction.value = action;
  isConfirmOpen.value = true;
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
    'Close this lead',
    `${inq.name} — Unit ${inq.unit.toUpperCase()}\n\nThe thread stays on record and can still be read. It simply stops sitting in the inbox as something waiting for an answer.`,
    async () => {
      isSubmitting.value = true;
      try {
        await api.patch(`/admin/inquiries/${inq.id}`, { status: 'Closed' });
        await fetchInquiriesState();
        showToast('success', 'Lead closed', `${inq.name}'s enquiry is no longer awaiting a reply.`);
      } catch (err: any) {
        showToast('error', 'Could not close lead', err?.message || 'The inquiry was not updated.');
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
  await fetchInquiries();
  if (inquiries.length > 0) {
    activeInquiryId.value = inquiries[0].id;
  }
});

const filteredInquiries = computed(() => {
  return inquiries.filter(inq => {
    const matchesSearch = 
      inq.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      inq.unit.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      inq.phone.includes(searchQuery.value) ||
      inq.email.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesSearch;
  });
});

const activeInquiry = computed(() => {
  if (!activeInquiryId.value) return inquiries[0] || null;
  return inquiries.find(i => i.id === activeInquiryId.value) || inquiries[0] || null;
});

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
      author: m.sender_name || 'The office',
      text: m.message_body,
      time: m.sent_at ? new Date(m.sent_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
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

    showToast('success', 'Reply written down', `Your answer to ${currentInq.name} is on record.`);
    replyMessage.value = '';
  } catch (err: unknown) {
    // Without this the failure propagated silently: the reply box emptied, no
    // toast appeared, and the landlady had no way to tell the message had not
    // been stored.
    showToast(
      'error',
      'Reply not sent',
      err instanceof Error ? err.message : 'Your reply could not be saved. Please try again.'
    );
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-ink-faint">Admin</p>
        <h1 class="mt-1 text-3xl font-medium leading-tight tracking-tight sm:text-[2.125rem]">
          People asking about a unit
        </h1>
        <p class="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          Each enquiry, what they asked, and what has been answered. Pick one to read it.
        </p>
      </div>

    </div>

    <div class="grid min-h-[620px] grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- The enquiries -->
      <div class="flex flex-col overflow-hidden rounded-tile bg-tile lg:col-span-4">
        <div class="space-y-3 border-b border-line p-4">
          <div class="relative">
            <Search
              class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <label for="inquiry-search" class="sr-only">Search enquiries</label>
            <input
              id="inquiry-search"
              v-model="searchQuery"
              type="search"
              placeholder="Name, unit, phone or email"
              class="ws-input w-full pl-11"
            />
          </div>
          <p class="text-sm text-ink-soft">
            {{ filteredInquiries.length }}
            {{ filteredInquiries.length === 1 ? 'enquiry' : 'enquiries' }}
          </p>
        </div>

        <div class="max-h-[540px] flex-1 overflow-y-auto">
          <p v-if="filteredInquiries.length === 0" class="p-8 text-center text-sm text-ink-soft">
            Nothing matches what you have typed.
          </p>

          <!--
            Each enquiry is a button. They were clickable divs, so the inbox
            could not be worked through from the keyboard at all.

            The selected one is a filled row, not a thick coloured left border.
            That side-tab is the most recognisable tell of a generated
            interface, and the fill says the same thing without the bar - the
            unit picker on the public category page already selects this way.
          -->
          <ul v-else class="divide-y divide-line">
            <li v-for="inq in filteredInquiries" :key="inq.id">
              <button
                type="button"
                :aria-current="activeInquiry?.id === inq.id ? 'true' : undefined"
                :class="[
                  'w-full p-4 text-left transition-colors',
                  activeInquiry?.id === inq.id
                    ? 'bg-brand-soft'
                    : 'hover:bg-canvas',
                ]"
                @click="activeInquiryId = inq.id"
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

                <p class="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft">{{ inq.message }}</p>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- The one being read -->
      <div
        v-if="activeInquiry"
        class="flex min-h-[550px] flex-col overflow-hidden rounded-tile bg-tile lg:col-span-8"
      >
        <div class="border-b border-line p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg font-semibold tracking-tight text-ink">
                  {{ activeInquiry.name }}
                </h2>
                <!-- Was a hardcoded "Active Prospect" on every lead, whatever its status. -->
                <StatusPill :tone="statusTone(activeInquiry.status)">
                  {{ statusWord(activeInquiry.status) }}
                </StatusPill>
              </div>

              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                <a
                  :href="`tel:${activeInquiry.phone}`"
                  class="tabular inline-flex items-center gap-1.5 font-semibold text-ink hover:text-brand"
                >
                  <Phone class="size-3.5" aria-hidden="true" />{{ activeInquiry.phone }}
                </a>
                <a
                  v-if="activeInquiry.email"
                  :href="`mailto:${activeInquiry.email}`"
                  class="inline-flex min-w-0 items-center gap-1.5 hover:text-brand"
                >
                  <Mail class="size-3.5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{{ activeInquiry.email }}</span>
                </a>
              </div>

              <p v-if="activeUnit" class="mt-2 text-sm text-ink-soft">
                <!-- The rate she quotes a prospective resident. `rooms` is seeded, so a
                     failed refresh would have her quoting a figure up to ₱1,900 out. Better
                     to show no price than a wrong one. -->
                Asking about unit
                <span class="font-semibold uppercase text-ink">{{ activeUnit.unitCode }}</span
                ><template v-if="!roomsFetchFailed">, which lets at
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
                  :disabled="isSubmitting"
                  @click="handleCloseLead"
                >
                  <XCircle class="size-3.5" aria-hidden="true" />
                  <span>Nothing came of it</span>
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

              <StatusPill v-else tone="neutral">{{ statusWord(activeInquiry.status) }}</StatusPill>
            </div>
          </div>
        </div>

        <!-- What was said -->
        <div class="max-h-[380px] flex-1 space-y-5 overflow-y-auto bg-canvas p-5 sm:p-6">
          <p v-if="threadError" class="rounded-2xl bg-overdue-soft p-4 text-sm leading-6 text-overdue">
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

            <div
              :class="[
                'max-w-md rounded-2xl px-4 py-3 text-sm leading-6',
                msg.from === 'me' ? 'bg-brand text-on-brand' : 'bg-tile text-ink',
              ]"
            >
              {{ msg.text }}
            </div>
          </div>
        </div>

        <!-- Writing back -->
        <form @submit.prevent="handleSendReply" class="space-y-3 border-t border-line p-5 sm:p-6">
          <div class="ws-field">
            <label for="reply">Your answer</label>
            <textarea
              id="reply"
              v-model="replyMessage"
              rows="3"
              placeholder="Opo, vacant pa po ang unit. Pwede po kayong mag-viewing bukas."
              class="ws-textarea w-full"
              required
            ></textarea>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <!--
              This said replies were "dispatched directly via SMS / Email". They
              are not: the message is written to `inquiry_messages` and nothing
              in the system sends anything to anybody. The landlady was being
              told her answer had gone out when it had not left the building.
            -->
            <p class="ws-hint max-w-md">
              This is kept here as a record of what you answered. It does not reach
              {{ activeInquiry.name }} on its own, so ring or message them as well.
            </p>

            <button
              type="submit"
              :disabled="isSubmitting || !replyMessage.trim()"
              class="pill-btn-brand shrink-0"
            >
              <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" aria-hidden="true" />
              <Send v-else class="size-4" aria-hidden="true" />
              <span>Write it down</span>
            </button>
          </div>
        </form>
      </div>

      <div
        v-else
        class="grid place-items-center rounded-tile bg-tile p-12 text-center lg:col-span-8"
      >
        <div>
          <Inbox class="mx-auto size-8 text-ink-faint" aria-hidden="true" />
          <p class="mt-3 text-base font-semibold text-ink">Nothing picked yet</p>
          <p class="mt-1 text-sm leading-6 text-ink-soft">
            Choose an enquiry on the left to read it and answer.
          </p>
        </div>
      </div>
    </div>

    <ConfirmDialog
      v-if="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-label="Close this lead"
      @cancel="isConfirmOpen = false"
      @confirm="handleConfirmAccept"
    />
  </div>
</template>
