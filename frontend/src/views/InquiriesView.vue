<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { inquiries, fetchInquiries as fetchInquiriesState, rooms, roomsFetchFailed, showToast, type Inquiry } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import { api } from '@/lib/api';
import { 
  Inbox, 
  Phone, 
  Mail, 
  Send, 
  RefreshCw, 
  Loader2, 
  User, 
  UserPlus,
  Building2, 
  CheckCircle2, 
  MessageSquare,
  Search,
  Check,
  XCircle
} from 'lucide-vue-next';

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
const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-warning',
  Contacted: 'badge-info',
  Converted: 'badge-success',
  Closed: 'badge-neutral',
};

function statusBadgeClass(status: string) {
  return STATUS_BADGE[status] || 'badge-neutral';
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

const activeMessages = computed(() => {
  if (!activeInquiry.value) return [];
  if (!inquiryThreads.value[activeInquiry.value.id]) {
    inquiryThreads.value[activeInquiry.value.id] = [
      {
        id: `init-${activeInquiry.value.id}`,
        from: 'them',
        author: activeInquiry.value.name,
        text: activeInquiry.value.message,
        time: activeInquiry.value.date || 'Recent'
      }
    ];
  }
  return inquiryThreads.value[activeInquiry.value.id];
});

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

    if (!inquiryThreads.value[currentInq.id]) {
      inquiryThreads.value[currentInq.id] = [];
    }

    inquiryThreads.value[currentInq.id].push({
      id: Date.now(),
      from: 'me',
      author: 'Fe Galang Da Silva',
      text: messageToSend,
      time: 'Just now'
    });

    showToast('success', 'Reply sent', `Your response to ${currentInq.name} has been saved.`);
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
    <!-- Header with Breadcrumbs -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-ink-soft mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-semibold text-ink">Prospect Inquiries</span>
        </div>
        <h1 class="text-3xl sm:text-[2.125rem] leading-tight font-medium tracking-tight">
          Prospect Inquiries &amp; Leads
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-ink-soft">
          2-Pane Master-Detail Lead Inbox and real-time prospect conversation console.
        </p>
      </div>

      <button
        @click="fetchInquiries"
        :disabled="isLoading"
        class="pill-btn"
      >
        <RefreshCw :class="['size-3.5 text-ink-soft', isLoading ? 'animate-spin' : '']" />
        <span>Refresh</span>
      </button>
    </div>

    <!-- 2-Pane Master-Detail Inbox Container -->
    <div class="rounded-tile bg-tile overflow-hidden border border-line rounded-tile bg-tile grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
      
      <!-- LEFT PANE: Leads List (4 of 12 cols on desktop) -->
      <div class="lg:col-span-4 border-r border-line flex flex-col bg-canvas">
        <!-- Search & Filter Header -->
        <div class="p-3.5 border-b border-line bg-tile space-y-2.5">
          <div class="relative">
            <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input
              v-model="searchQuery"
              aria-label="Search prospect or unit"
              type="text"
              placeholder="Search prospect or unit..."
              class="ws-input w-full pl-10 pr-4"
            />
          </div>
          <div class="flex items-center justify-between text-xs text-ink-soft px-1">
            <span class="font-semibold text-[11px]">Inbox ({{ filteredInquiries.length }})</span>
            <span class="text-[11px] font-semibold text-brand">Live sync</span>
          </div>
        </div>

        <!-- Inquiries List Scrollable -->
        <div class="flex-1 overflow-y-auto divide-y divide-line/70 max-h-[540px]">
          <div 
            v-if="filteredInquiries.length === 0" 
            class="p-8 text-center text-xs text-ink-soft"
          >
            No inquiries match your criteria.
          </div>

          <div
            v-for="inq in filteredInquiries"
            :key="inq.id"
            @click="activeInquiryId = inq.id"
            :class="[ 'p-3.5 cursor-pointer transition-all border-l-3', activeInquiry?.id === inq.id ? 'bg-tile border-l-primary ' : 'border-l-transparent hover:bg-tile' ]"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold text-xs text-ink truncate">{{ inq.name }}</p>
                <span class="inline-block text-[11px] font-semibold text-brand mt-0.5">
                  Unit {{ inq.unit.toUpperCase() }}
                </span>
                <span :class="['badge-soft text-[10px] font-semibold ml-1.5', statusBadgeClass(inq.status)]">
                  {{ inq.status }}
                </span>
              </div>
              <span class="text-[10px] text-ink-soft shrink-0 font-medium">{{ inq.date || 'Recent' }}</span>
            </div>

            <p class="text-xs text-ink-soft line-clamp-2 mt-1.5 leading-relaxed">
              {{ inq.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- RIGHT PANE: Conversation Detail & Quick Reply Composer (8 of 12 cols) -->
      <div v-if="activeInquiry" class="lg:col-span-8 flex flex-col justify-between bg-tile min-h-[550px]">
        <!-- Thread Header -->
        <div class="p-4 border-b border-line flex items-center justify-between bg-canvas">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-full bg-brand text-white flex items-center justify-center font-semibold text-sm">
              {{ activeInquiry.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h2 class="font-semibold text-sm text-ink flex items-center gap-2">
                {{ activeInquiry.name }}
                <!-- Was a hardcoded "Active Prospect" on every lead, whatever its status. -->
                <span :class="['badge-soft text-[10px]', statusBadgeClass(activeInquiry.status)]">
                  {{ activeInquiry.status }}
                </span>
              </h2>
              <div class="flex flex-wrap items-center gap-3 text-[11px] text-ink-soft mt-0.5">
                <span class="flex items-center gap-1"><Phone class="size-3" /> {{ activeInquiry.phone }}</span>
                <span class="flex items-center gap-1"><Mail class="size-3" /> {{ activeInquiry.email }}</span>
              </div>
            </div>
          </div>

          <!-- Unit Info & Conversion Action -->
          <div class="flex items-center gap-3">
            <div v-if="activeUnit" class="text-right hidden sm:block">
              <span class="text-[10px] font-semibold text-ink-soft">Target Unit</span>
              <p class="font-semibold text-xs text-ink">
                <!-- The rate she quotes a prospective resident. `rooms` is seeded, so a
                     failed refresh would have her quoting a figure up to ₱1,900 out. Better
                     to show no price than a wrong one. -->
                Room {{ activeUnit.unitCode.toUpperCase() }}<template v-if="!roomsFetchFailed"> ({{ peso(activeUnit.price) }}/mo)</template>
              </p>
            </div>

            <button
              v-if="isLeadOpen(activeInquiry.status)"
              type="button"
              :disabled="isSubmitting"
              @click="handleCloseLead"
              class="pill-btn text-xs flex items-center gap-1.5"
              title="Mark this lead as closed - it stays on record but stops awaiting a reply"
            >
              <XCircle class="size-3.5" />
              <span>Close Lead</span>
            </button>

            <button
              v-if="isLeadOpen(activeInquiry.status)"
              @click="router.push({
                path: '/admin/tenants',
                query: {
                  convertInquiryId: activeInquiry.id,
                  name: activeInquiry.name,
                  phone: activeInquiry.phone,
                  email: activeInquiry.email,
                  unit: activeInquiry.unit
                }
              })"
              class="pill-btn-brand text-xs flex items-center gap-1.5"
              title="Pre-fill inquiry details into the tenant onboarding form"
            >
              <UserPlus class="size-3.5 text-white" />
              <span>Convert to Tenant</span>
            </button>

            <span
              v-else
              class="text-[11px] font-semibold text-ink-soft inline-flex items-center gap-1"
            >
              <Check class="size-3.5" /> {{ activeInquiry.status }}
            </span>
          </div>
        </div>

        <!-- Conversation Stream -->
        <div class="flex-1 p-5 overflow-y-auto space-y-4 max-h-[380px] bg-canvas/40">
          <div 
            v-for="msg in activeMessages" 
            :key="msg.id"
            :class="['flex flex-col', msg.from === 'me' ? 'items-end' : 'items-start']"
          >
            <div class="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-ink-soft">
              <span class="font-semibold">{{ msg.from === 'me' ? 'Fe Galang Da Silva (Landlady)' : msg.author }}</span>
              <span>· {{ msg.time }}</span>
            </div>

            <div 
              :class="[ 'max-w-md p-3.5 rounded-tile text-xs leading-relaxed ', msg.from === 'me' ? 'bg-brand text-white rounded-br-xs' : 'bg-tile text-ink border border-line rounded-bl-xs' ]"
            >
              {{ msg.text }}
            </div>
          </div>
        </div>

        <!-- Quick Reply Box Composer -->
        <div class="p-4 border-t border-line bg-tile">
          <form @submit.prevent="handleSendReply" class="space-y-3">
            <div class="relative">
              <textarea
                v-model="replyMessage"
                rows="3"
                placeholder="Type your reply to prospect (e.g. Opo, vacant pa po ang unit and viewing is open tomorrow)..."
                class="ws-textarea w-full"
                required
              ></textarea>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-[11px] text-ink-soft">
                Replies are dispatched directly via SMS / Email to {{ activeInquiry.phone }}.
              </span>

              <button 
                type="submit" 
                :disabled="isSubmitting || !replyMessage.trim()" 
                class="pill-btn-brand"
              >
                <Loader2 v-if="isSubmitting" class="size-3.5 animate-spin" />
                <Send v-else class="size-3.5 text-white" />
                <span>Send Response</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Empty Selection State -->
      <div v-else class="lg:col-span-8 grid place-items-center p-12 text-center text-xs text-ink-soft">
        <div>
          <Inbox class="size-10 mx-auto text-ink-soft mb-2 opacity-50" />
          <p class="font-semibold text-sm text-ink">Select an Inquiry</p>
          <p class="mt-1">Choose a prospect thread on the left to read and reply.</p>
        </div>
      </div>

    </div>

    <!-- Confirmation Modal -->
    <div
      v-if="isConfirmOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      @click.self="isConfirmOpen = false"
    >
      <div class="rounded-tile bg-tile w-full max-w-sm shadow-2xl rounded-tile p-6 bg-tile space-y-4 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-warning-soft text-warning-foreground flex items-center justify-center">
            <XCircle class="w-6 h-6" />
          </div>
          <h3 class="font-semibold text-lg text-ink">{{ confirmTitle }}</h3>

          <div class="w-full text-left bg-canvas border border-line rounded-xl p-3.5 text-xs text-ink space-y-1 leading-relaxed whitespace-pre-line font-semibold">
            {{ confirmMessage }}
          </div>
        </div>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button type="button" @click="isConfirmOpen = false" class="pill-btn cursor-pointer min-w-[100px]">
            Cancel
          </button>
          <button type="button" @click="handleConfirmAccept" class="pill-btn-brand cursor-pointer min-w-[100px]">
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
