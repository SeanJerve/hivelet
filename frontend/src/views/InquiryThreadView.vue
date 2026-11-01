<script setup lang="ts">
/**
 * @file views/InquiryThreadView.vue
 * @description /inquiry - the person who sent an enquiry reads Michelle's reply
 * and answers it, without an account (065, Sean 2026-09-30).
 *
 * Three ways in, most convenient first:
 *   1. the private link from the confirmation (/inquiry#t=...). The secret is in
 *      the #fragment, which the browser never sends to any server;
 *   2. the enquiries this browser sent before (lib/myInquiries.ts);
 *   3. the reference code with the phone number the enquiry was sent with.
 *
 * The server answers "no match" the same way whichever part was wrong, and
 * limits the tries (routes/public.ts), so the code form is not a way to find
 * other people's conversations.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ArrowUpRight, Check, Copy, RotateCw, Send } from 'lucide-vue-next';
import { api, ApiRequestError, isUnconfirmed } from '@/lib/api';
import { copyText } from '@/lib/copyText';
import { LANDLADY } from '@/lib/systemState';
import { savedInquiries, rememberInquiry, forgetInquiry, conversationUrl, type SavedInquiry } from '@/lib/myInquiries';
import { playSound } from '@/lib/sounds';

type Creds = { token: string } | { reference: string; phone: string };
type Thread = {
  inquiry: { referenceCode: string | null; unit: string | null; status: string; name: string; sentAt: string };
  messages: { id: string; from: 'you' | 'landlady'; name: string; body: string; sentAt: string }[];
};

const route = useRoute();
const router = useRouter();

const creds = ref<Creds | null>(null);
const thread = ref<Thread | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const saved = ref<SavedInquiry[]>([]);

const refInput = ref('');
const phoneInput = ref('');
const lookupError = ref<string | null>(null);

const reply = ref('');
const sending = ref(false);
const replyError = ref<string | null>(null);
const heading = ref<HTMLElement | null>(null);

const closed = computed(() => ['Closed', 'Converted'].includes(thread.value?.inquiry.status ?? ''));
const lastFromYou = computed(() => thread.value?.messages.at(-1)?.from === 'you');

const statusLine = computed(() => {
  const s = thread.value?.inquiry.status;
  if (s === 'Converted') return 'You have moved in. Welcome to the boarding house.';
  if (s === 'Closed') return 'This inquiry is closed.';
  if (lastFromYou.value) return 'Waiting for a reply. Check back here.';
  return 'You have a reply.';
});

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * The link needs the conversation's token. Opened with the reference code there is none in the
 * address, so it comes from this phone's saved inquiries, and without one there is no link to copy.
 */
const conversationToken = computed(() => {
  if (creds.value && 'token' in creds.value) return creds.value.token;
  const code = thread.value?.inquiry.referenceCode;
  return savedInquiries().find((s) => s.referenceCode === code)?.token ?? null;
});
const linkCopied = ref(false);
const linkCopyFailed = ref(false);

async function copyConversationLink() {
  if (!conversationToken.value) return;
  linkCopyFailed.value = false;
  const ok = await copyText(conversationUrl(conversationToken.value));
  linkCopied.value = ok;
  linkCopyFailed.value = !ok;
  if (ok) setTimeout(() => (linkCopied.value = false), 2500);
}

function tokenFromHash(): string | null {
  const m = /(?:^#|&)t=([^&]+)/.exec(route.hash || '');
  return m ? decodeURIComponent(m[1]) : null;
}

async function load(next: Creds, { focus = true } = {}) {
  loading.value = true;
  loadError.value = null;
  try {
    const data = await api.post<Thread>('/public/inquiries/thread', next, false);
    // The ping when a new reply from the landlady arrives in the conversation
    // already open (Sean, 2026-10-01: the same ping for chats).
    const before = thread.value?.messages.filter((m) => m.from === 'landlady').length;
    const after = data.messages.filter((m) => m.from === 'landlady').length;
    if (before !== undefined && after > before) playSound('notify');
    creds.value = next;
    thread.value = data;
    if ('token' in next && data.inquiry.referenceCode) {
      rememberInquiry({ token: next.token, referenceCode: data.inquiry.referenceCode, unit: data.inquiry.unit, sentAt: data.inquiry.sentAt });
    }
    if (focus) {
      await nextTick();
      heading.value?.focus();
    }
  } catch (err) {
    thread.value = null;
    if (err instanceof ApiRequestError && err.status === 404) {
      loadError.value = err.message;
      if ('token' in next) {
        // Saved here means it opened once, so a link that no longer works was removed.
        if (err.message.startsWith('This link') && savedInquiries().some((s) => s.token === next.token)) {
          loadError.value = 'This inquiry was closed and has been removed. To ask something new, send another inquiry.';
        }
        forgetInquiry(next.token);
        saved.value = savedInquiries();
      }
    } else {
      loadError.value = 'Your conversation could not be loaded. Check your connection and try again.';
    }
  } finally {
    loading.value = false;
  }
}

async function lookUp() {
  lookupError.value = null;
  if (!refInput.value.trim() || !phoneInput.value.trim()) {
    lookupError.value = 'Type the reference code and the phone number you gave.';
    return;
  }
  await load({ reference: refInput.value.trim(), phone: phoneInput.value.trim() });
  if (loadError.value) lookupError.value = loadError.value;
}

async function refresh() {
  if (creds.value) await load(creds.value, { focus: false });
}

async function sendReply() {
  if (sending.value || !creds.value) return;
  replyError.value = null;
  const text = reply.value.trim();
  if (!text) {
    replyError.value = 'Write a message first.';
    return;
  }
  sending.value = true;
  try {
    await api.post('/public/inquiries/thread/messages', { ...creds.value, message: text }, false);
    reply.value = '';
    await load(creds.value, { focus: false });
  } catch (err) {
    replyError.value = isUnconfirmed(err)
      ? 'We are not sure your message went through. Press "Check for a reply": if it shows above, it was sent.'
      : err instanceof ApiRequestError && err.status !== 0
        ? err.message
        : 'Your message was not sent. Check your connection and try again.';
  } finally {
    sending.value = false;
  }
}

/**
 * The address is the one source of truth for which conversation is open
 * (Sean, 2026-09-30: "I cannot click it again to check my conversation, I need
 * to refresh"). "Your inquiries" used to drop the #t= from the address behind
 * the router's back, so the router still believed the conversation was open;
 * clicking the same inquiry again was then a navigation to where it already
 * was, which does nothing. Every way in and out now goes through the router,
 * so opening, "Your inquiries", and the browser's own Back all agree.
 */
function showList() {
  thread.value = null;
  creds.value = null;
  loadError.value = null;
  saved.value = savedInquiries();
}

function backToList() {
  if (tokenFromHash()) router.push({ path: '/inquiry' });
  else showList(); // opened with the reference code: nothing in the address to undo
}

function syncWithAddress() {
  const token = tokenFromHash();
  if (!token) {
    if (creds.value && 'token' in creds.value) showList();
    return;
  }
  const open = thread.value && creds.value && 'token' in creds.value && creds.value.token === token;
  if (!open) load({ token });
}

// A new reply is likelier to be seen when the visitor comes back to the tab.
function onVisible() {
  if (document.visibilityState === 'visible' && thread.value) refresh();
}

/**
 * Checks for a reply by itself while the conversation is open and on screen.
 * Every 90 s, not faster: look-ups are limited to 30 a quarter-hour per
 * connection (routes/public.ts), shared by everyone on the house wifi, so this
 * uses 10 of them and leaves room for other visitors and the code form.
 */
const POLL_MS = 90_000;
let poll: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  saved.value = savedInquiries();
  syncWithAddress();
  document.addEventListener('visibilitychange', onVisible);
  poll = setInterval(() => {
    if (document.visibilityState === 'visible' && thread.value && !closed.value && !loading.value && !sending.value) refresh();
  }, POLL_MS);
});
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisible);
  if (poll) clearInterval(poll);
});

watch(() => route.hash, syncWithAddress);
</script>

<template>
  <div class="ws-focus flex-1 w-full font-editorial bg-canvas">
    <div class="ws-page ws-content pb-16 pt-6 sm:pt-10">
      <div class="mx-auto max-w-2xl">
        <!-- Loading: the link is being read. -->
        <div v-if="loading && !thread" class="space-y-3" aria-busy="true">
          <p class="sr-only" role="status">Loading your conversation</p>
          <div class="h-8 w-2/3 rounded-tile bg-surface-sunken animate-pulse" />
          <div class="h-20 w-full rounded-tile bg-surface-sunken animate-pulse" />
          <div class="h-20 w-5/6 rounded-tile bg-surface-sunken animate-pulse" />
        </div>

        <!-- The conversation -->
        <section v-else-if="thread" aria-labelledby="thread-heading">
          <button
            type="button"
            class="press inline-flex min-h-11 items-center gap-1.5 text-xs text-ink-soft hover:text-ink font-semibold"
            @click="backToList"
          >
            <ArrowLeft class="size-3.5" aria-hidden="true" />
            Your inquiries
          </button>
          <h1
            id="thread-heading"
            ref="heading"
            tabindex="-1"
            class="mt-2 text-2xl sm:text-3xl font-medium tracking-[-0.02em] text-ink outline-none"
          >
            Your inquiry
          </h1>
          <p class="mt-2 text-xs text-ink-soft">
            Sent {{ when(thread.inquiry.sentAt) }}<template v-if="thread.inquiry.referenceCode"> · Reference
              <span class="font-medium text-ink tracking-[0.08em]">{{ thread.inquiry.referenceCode }}</span></template>
          </p>
          <p class="mt-4 text-sm text-ink" role="status">{{ statusLine }}</p>

          <!-- The same bubbles as the owner's side (InquiriesView), each as wide as its message. -->
          <ol class="mt-6 space-y-4" aria-label="Messages">
            <li
              v-for="m in thread.messages"
              :key="m.id"
              :class="['flex flex-col', m.from === 'you' ? 'items-end' : 'items-start']"
            >
              <p class="mb-1 px-1 text-xs text-ink-faint">
                <span class="font-semibold text-ink-soft">{{ m.from === 'you' ? 'You' : 'Boarding house' }}</span>
                · {{ when(m.sentAt) }}
              </p>
              <p
                :class="[
                  'max-w-md whitespace-pre-line break-words rounded-2xl px-4 py-3 text-sm leading-6',
                  m.from === 'you' ? 'bg-brand text-on-brand' : 'bg-tile text-ink shadow-card ring-1 ring-line',
                ]"
              >{{ m.body }}</p>
            </li>
          </ol>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" class="pill-btn" :disabled="loading" @click="refresh">
              <RotateCw :class="['size-4', loading && 'animate-spin']" aria-hidden="true" />
              Check for a reply
            </button>
            <button v-if="conversationToken" type="button" class="pill-btn" @click="copyConversationLink">
              <Check v-if="linkCopied" class="size-4" aria-hidden="true" />
              <Copy v-else class="size-4" aria-hidden="true" />
              {{ linkCopied ? 'Link copied' : 'Copy conversation link' }}
            </button>
          </div>
          <p v-if="linkCopyFailed && conversationToken" class="mt-3 text-xs leading-relaxed text-ink-soft break-all">
            Copying did not work here. Keep this address instead: {{ conversationUrl(conversationToken) }}
          </p>
          <span class="sr-only" role="status" aria-live="polite">{{ linkCopied ? 'Link copied' : '' }}</span>

          <form v-if="!closed" class="mt-8" novalidate @submit.prevent="sendReply">
            <label for="thread-reply" class="sr-only">Write a reply</label>
            <textarea
              id="thread-reply"
              v-model="reply"
              rows="3"
              maxlength="2000"
              :aria-invalid="replyError ? 'true' : undefined"
              :aria-describedby="replyError ? 'thread-reply-error' : undefined"
              :class="['ws-textarea w-full', replyError && 'border-overdue']"
              placeholder="Write a reply"
            ></textarea>
            <p v-if="replyError" id="thread-reply-error" class="mt-1.5 text-xs leading-relaxed text-overdue" role="alert">
              {{ replyError }}
            </p>
            <button type="submit" class="pill-btn-brand mt-3" :disabled="sending">
              <Send class="size-4" aria-hidden="true" />
              {{ sending ? 'Sending' : 'Send' }}
            </button>
          </form>
          <p v-else class="mt-8 text-sm text-ink-soft">
            This conversation is closed.
            <RouterLink to="/inquire" class="hover:text-ink font-semibold">Send a new inquiry</RouterLink>
            to ask something else.
          </p>
        </section>

        <!-- No link: the enquiries this browser sent, and the code form. -->
        <section v-else aria-labelledby="find-heading">
          <!--
            The breadcrumb and heading of its two sibling forms, Inquire and Sign in
            (audit 2026-10-09). This page is where both of them send a visitor
            ("Read the reply", "Your inquiries" in the footer), and it alone had no
            way home in the page and a smaller heading: 24px against their 28px on a
            phone, 30px against 43px at 1440.
          -->
          <nav aria-label="Breadcrumb">
            <ol class="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
              <li>
                <RouterLink
                  to="/public"
                  class="press inline-flex min-h-11 items-center gap-1.5 hover:text-ink transition-colors font-semibold"
                >
                  <ArrowLeft class="size-3.5" aria-hidden="true" />
                  Home
                </RouterLink>
              </li>
              <li aria-hidden="true" class="text-ink-faint">/</li>
              <li aria-current="page" class="text-ink">Your inquiries</li>
            </ol>
          </nav>
          <h1 id="find-heading" class="mt-1 font-medium text-ink tracking-[-0.025em] leading-[1.05] text-[clamp(1.75rem,3vw,2.75rem)] max-w-xl">
            Your inquiries
          </h1>
          <p class="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            Enter your reference code and phone number to read the reply.
          </p>

          <p v-if="loadError && !lookupError" class="mt-6 text-sm text-overdue" role="alert">{{ loadError }}</p>

          <ul v-if="saved.length" class="mt-6 divide-y divide-line border-y border-line">
            <li v-for="s in saved" :key="s.token">
              <RouterLink
                :to="`/inquiry#t=${encodeURIComponent(s.token)}`"
                class="group/goto press flex min-h-14 items-center justify-between gap-4 py-3 text-sm text-ink hover:text-ink-soft"
              >
                <span>
                  Sent {{ when(s.sentAt) }}
                  <span class="block text-xs text-ink-soft">Reference {{ s.referenceCode }}</span>
                </span>
                <!-- The overview tiles' own arrow and hover nudge (components/overview/OverviewTile.vue). -->
                <ArrowUpRight
                  class="size-4 shrink-0 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[var(--ease-out)] motion-safe:group-hover/goto:translate-x-0.5 motion-safe:group-hover/goto:-translate-y-0.5"
                  aria-hidden="true"
                />
              </RouterLink>
            </li>
          </ul>

          <form class="mt-8 max-w-md" novalidate @submit.prevent="lookUp">
            <label for="find-ref" class="block text-xs text-ink-faint">Reference code</label>
            <input
              id="find-ref"
              v-model="refInput"
              class="ws-input mt-2 uppercase tracking-[0.08em]"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="K7QM-3XRD"
              :aria-describedby="lookupError ? 'find-error' : undefined"
            />
            <label for="find-phone" class="mt-4 block text-xs text-ink-faint">Phone number</label>
            <input
              id="find-phone"
              v-model="phoneInput"
              v-phone
              class="ws-input mt-2"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="0917 123 4567"
              :aria-describedby="lookupError ? 'find-error' : undefined"
            />
            <p v-if="lookupError" id="find-error" class="mt-2 text-xs leading-relaxed text-overdue" role="alert">
              {{ lookupError }}
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <button type="submit" class="pill-btn-brand" :disabled="loading">
                {{ loading ? 'Opening' : 'Open inquiry' }}
              </button>
              <RouterLink to="/inquire" class="pill-btn">Send another inquiry</RouterLink>
            </div>
          </form>

          <p class="mt-10 text-xs leading-relaxed text-ink-soft">
            Need help? Call
            <!-- whitespace-nowrap: at 320-414px the number split as "0927 465 / 3938", a number nobody can dial from two lines (audit 2026-10-09). -->
            <a :href="`tel:${LANDLADY.phone}`" class="whitespace-nowrap hover:text-ink font-semibold">{{ LANDLADY.phoneShown }}</a>.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
