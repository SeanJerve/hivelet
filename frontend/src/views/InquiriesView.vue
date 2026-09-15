<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { inquiries, fetchInquiries as fetchInquiriesState, rooms, showToast, type Inquiry } from '@/lib/systemState';
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
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span>Admin</span>
          <span>/</span>
          <span class="font-bold text-foreground">Prospect Inquiries</span>
        </div>
        <h1 class="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Prospect Inquiries &amp; Leads
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-muted-foreground">
          2-Pane Master-Detail Lead Inbox and real-time prospect conversation console.
        </p>
      </div>

      <button
        @click="fetchInquiries"
        :disabled="isLoading"
        class="btn-secondary"
      >
        <RefreshCw :class="['size-3.5 text-muted-foreground', isLoading ? 'animate-spin' : '']" />
        <span>Refresh</span>
      </button>
    </div>

    <!-- 2-Pane Master-Detail Inbox Container -->
    <div class="surface-card overflow-hidden border border-border rounded-2xl bg-white shadow-xs grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
      
      <!-- LEFT PANE: Leads List (4 of 12 cols on desktop) -->
      <div class="lg:col-span-4 border-r border-border flex flex-col bg-background">
        <!-- Search & Filter Header -->
        <div class="p-3.5 border-b border-border bg-white space-y-2.5">
          <div class="relative">
            <Search class="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search prospect or unit..."
              class="h-10 min-h-10 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-xs text-foreground focus:bg-white focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div class="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span class="font-extrabold text-[11px] uppercase tracking-wider">Inbox ({{ filteredInquiries.length }})</span>
            <span class="text-[11px] font-semibold text-emerald-700">Live sync</span>
          </div>
        </div>

        <!-- Inquiries List Scrollable -->
        <div class="flex-1 overflow-y-auto divide-y divide-border/70 max-h-[540px]">
          <div 
            v-if="filteredInquiries.length === 0" 
            class="p-8 text-center text-xs text-muted-foreground"
          >
            No inquiries match your criteria.
          </div>

          <div
            v-for="inq in filteredInquiries"
            :key="inq.id"
            @click="activeInquiryId = inq.id"
            :class="[
              'p-3.5 cursor-pointer transition-all border-l-3',
              activeInquiry?.id === inq.id 
                ? 'bg-white border-l-primary shadow-xs' 
                : 'border-l-transparent hover:bg-white'
            ]"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-xs text-foreground truncate">{{ inq.name }}</p>
                <span class="inline-block text-[11px] font-semibold text-primary mt-0.5">
                  Unit {{ inq.unit.toUpperCase() }}
                </span>
                <span :class="['badge-soft text-[10px] font-bold ml-1.5', statusBadgeClass(inq.status)]">
                  {{ inq.status }}
                </span>
              </div>
              <span class="text-[10px] text-muted-foreground shrink-0 font-medium">{{ inq.date || 'Recent' }}</span>
            </div>

            <p class="text-xs text-foreground-soft line-clamp-2 mt-1.5 leading-relaxed">
              {{ inq.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- RIGHT PANE: Conversation Detail & Quick Reply Composer (8 of 12 cols) -->
      <div v-if="activeInquiry" class="lg:col-span-8 flex flex-col justify-between bg-white min-h-[550px]">
        <!-- Thread Header -->
        <div class="p-4 border-b border-border flex items-center justify-between bg-background">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm">
              {{ activeInquiry.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h2 class="font-display font-extrabold text-sm text-foreground flex items-center gap-2">
                {{ activeInquiry.name }}
                <!-- Was a hardcoded "Active Prospect" on every lead, whatever its status. -->
                <span :class="['badge-soft text-[10px]', statusBadgeClass(activeInquiry.status)]">
                  {{ activeInquiry.status }}
                </span>
              </h2>
              <div class="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                <span class="flex items-center gap-1"><Phone class="size-3" /> {{ activeInquiry.phone }}</span>
                <span class="flex items-center gap-1"><Mail class="size-3" /> {{ activeInquiry.email }}</span>
              </div>
            </div>
          </div>

          <!-- Unit Info & Conversion Action -->
          <div class="flex items-center gap-3">
            <div v-if="activeUnit" class="text-right hidden sm:block">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Target Unit</span>
              <p class="font-display font-bold text-xs text-foreground">
                Room {{ activeUnit.unitCode.toUpperCase() }} ({{ peso(activeUnit.price) }}/mo)
              </p>
            </div>

            <button
              v-if="isLeadOpen(activeInquiry.status)"
              type="button"
              :disabled="isSubmitting"
              @click="handleCloseLead"
              class="btn-secondary text-xs flex items-center gap-1.5"
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
              class="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
              title="Pre-fill inquiry details into the tenant onboarding form"
            >
              <UserPlus class="size-3.5 text-white" />
              <span>Convert to Tenant</span>
            </button>

            <span
              v-else
              class="text-[11px] font-bold text-muted-foreground inline-flex items-center gap-1"
            >
              <Check class="size-3.5" /> {{ activeInquiry.status }}
            </span>
          </div>
        </div>

        <!-- Conversation Stream -->
        <div class="flex-1 p-5 overflow-y-auto space-y-4 max-h-[380px] bg-background/40">
          <div 
            v-for="msg in activeMessages" 
            :key="msg.id"
            :class="['flex flex-col', msg.from === 'me' ? 'items-end' : 'items-start']"
          >
            <div class="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-muted-foreground">
              <span class="font-bold">{{ msg.from === 'me' ? 'Fe Galang Da Silva (Landlady)' : msg.author }}</span>
              <span>· {{ msg.time }}</span>
            </div>

            <div 
              :class="[
                'max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs',
                msg.from === 'me' 
                  ? 'bg-primary text-white rounded-br-xs' 
                  : 'bg-white text-foreground border border-border rounded-bl-xs'
              ]"
            >
              {{ msg.text }}
            </div>
          </div>
        </div>

        <!-- Quick Reply Box Composer -->
        <div class="p-4 border-t border-border bg-white">
          <form @submit.prevent="handleSendReply" class="space-y-3">
            <div class="relative">
              <textarea
                v-model="replyMessage"
                rows="3"
                placeholder="Type your reply to prospect (e.g. Opo, vacant pa po ang unit and viewing is open tomorrow)..."
                class="w-full p-3 text-xs rounded-xl border border-border bg-background text-foreground focus:bg-white focus:border-primary focus:outline-none resize-none"
                required
              ></textarea>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-[11px] text-muted-foreground">
                Replies are dispatched directly via SMS / Email to {{ activeInquiry.phone }}.
              </span>

              <button 
                type="submit" 
                :disabled="isSubmitting || !replyMessage.trim()" 
                class="btn-primary"
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
      <div v-else class="lg:col-span-8 grid place-items-center p-12 text-center text-xs text-muted-foreground">
        <div>
          <Inbox class="size-10 mx-auto text-muted-foreground mb-2 opacity-50" />
          <p class="font-bold text-sm text-foreground">Select an Inquiry</p>
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
      <div class="surface-card w-full max-w-sm shadow-2xl rounded-2xl p-6 bg-white space-y-4 text-center">
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center">
            <XCircle class="w-6 h-6" />
          </div>
          <h3 class="font-display font-extrabold text-lg text-foreground">{{ confirmTitle }}</h3>

          <div class="w-full text-left bg-background border border-border rounded-xl p-3.5 text-xs text-foreground space-y-1 leading-relaxed whitespace-pre-line font-semibold">
            {{ confirmMessage }}
          </div>
        </div>

        <div class="flex items-center justify-center gap-2 pt-2">
          <button type="button" @click="isConfirmOpen = false" class="btn-secondary cursor-pointer min-w-[100px]">
            Cancel
          </button>
          <button type="button" @click="handleConfirmAccept" class="btn-primary cursor-pointer min-w-[100px]">
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
