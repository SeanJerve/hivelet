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
import { useRoute } from 'vue-router';
import { ArrowLeft, RotateCw, Send } from 'lucide-vue-next';
import { api, ApiRequestError, isUnconfirmed } from '@/lib/api';
import { LANDLADY } from '@/lib/systemState';
import { savedInquiries, rememberInquiry, forgetInquiry, type SavedInquiry } from '@/lib/myInquiries';

type Creds = { token: string } | { reference: string; phone: string };
type Thread = {
  inquiry: { referenceCode: string | null; unit: string | null; status: string; name: string; sentAt: string };
  messages: { id: string; from: 'you' | 'landlady'; name: string; body: string; sentAt: string }[];
};

const route = useRoute();

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
  if (s === 'Converted') return 'This inquiry became a tenancy. Welcome to the boarding house.';
  if (s === 'Closed') return `${LANDLADY.name} has closed this inquiry.`;
  if (lastFromYou.value) return `Waiting for ${LANDLADY.name} to reply. Check back here.`;
  return `${LANDLADY.name} has replied.`;
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

function tokenFromHash(): string | null {
  const m = /(?:^#|&)t=([^&]+)/.exec(route.hash || window.location.hash || '');
  return m ? decodeURIComponent(m[1]) : null;
}

async function load(next: Creds, { focus = true } = {}) {
  loading.value = true;
  loadError.value = null;
  try {
    const data = await api.post<Thread>('/public/inquiries/thread', next, false);
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
      ? 'We could not confirm your message arrived. Press "Check for a reply" before sending it again, so it is not sent twice.'
      : err instanceof ApiRequestError && err.status !== 0
        ? err.message
        : 'Your message was not sent. Check your connection and try again.';
  } finally {
    sending.value = false;
  }
}

function backToList() {
  thread.value = null;
  creds.value = null;
  loadError.value = null;
  saved.value = savedInquiries();
  if (window.location.hash) history.replaceState(history.state, '', '/inquiry');
}

// A new reply is likelier to be seen when the visitor comes back to the tab.
function onVisible() {
  if (document.visibilityState === 'visible' && thread.value) refresh();
}

onMounted(() => {
  saved.value = savedInquiries();
  const token = tokenFromHash();
  if (token) load({ token });
  document.addEventListener('visibilitychange', onVisible);
});
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible));

watch(
  () => route.hash,
  () => {
    const token = tokenFromHash();
    if (token && !('token' in (creds.value ?? {}) && (creds.value as { token: string }).token === token)) load({ token });
  }
);
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
            class="press inline-flex min-h-11 items-center gap-1.5 text-xs text-ink-soft underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink"
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

          <ol class="mt-6 space-y-3" aria-label="Messages">
            <li
              v-for="m in thread.messages"
              :key="m.id"
              :class="['max-w-[85%] rounded-tile border px-4 py-3', m.from === 'you' ? 'ml-auto border-brand-soft bg-brand-soft' : 'mr-auto border-line bg-surface']"
            >
              <p class="text-[0.7rem] text-ink-soft">
                <span class="font-medium text-ink">{{ m.from === 'you' ? 'You' : m.name || LANDLADY.name }}</span>
                · {{ when(m.sentAt) }}
              </p>
              <p class="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink">{{ m.body }}</p>
            </li>
          </ol>

          <div class="mt-4 flex items-center gap-3">
            <button type="button" class="pill-btn" :disabled="loading" @click="refresh">
              <RotateCw :class="['size-4', loading && 'animate-spin']" aria-hidden="true" />
              Check for a reply
            </button>
          </div>

          <form v-if="!closed" class="mt-8" novalidate @submit.prevent="sendReply">
            <label for="thread-reply" class="block text-xs text-ink-faint">Write back to {{ LANDLADY.name }}</label>
            <textarea
              id="thread-reply"
              v-model="reply"
              rows="3"
              maxlength="2000"
              :aria-invalid="replyError ? 'true' : undefined"
              :aria-describedby="replyError ? 'thread-reply-error' : undefined"
              :class="['ws-textarea w-full mt-2', replyError && 'border-overdue']"
              placeholder="For example: a time you can come to view the unit."
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
            <RouterLink to="/inquire" class="underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink">Send a new inquiry</RouterLink>
            to ask something else.
          </p>
        </section>

        <!-- No link: the enquiries this browser sent, and the code form. -->
        <section v-else aria-labelledby="find-heading">
          <h1 id="find-heading" class="text-2xl sm:text-3xl font-medium tracking-[-0.02em] text-ink">
            Your inquiries
          </h1>
          <p class="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
            {{ LANDLADY.name }}, who runs the boarding house, answers each inquiry on its own page.
            Open yours to read her reply and write back.
          </p>

          <p v-if="loadError && !saved.length && !lookupError" class="mt-6 text-sm text-overdue" role="alert">{{ loadError }}</p>

          <ul v-if="saved.length" class="mt-6 divide-y divide-line border-y border-line">
            <li v-for="s in saved" :key="s.token">
              <RouterLink
                :to="`/inquiry#t=${encodeURIComponent(s.token)}`"
                class="press flex min-h-14 items-center justify-between gap-4 py-3 text-sm text-ink hover:text-ink-soft"
              >
                <span>
                  Sent {{ when(s.sentAt) }}
                  <span class="block text-xs text-ink-soft">Reference {{ s.referenceCode }}</span>
                </span>
                <span aria-hidden="true">›</span>
              </RouterLink>
            </li>
          </ul>

          <form class="mt-8 max-w-md" novalidate @submit.prevent="lookUp">
            <h2 class="text-sm font-medium text-ink">Open one with its reference code</h2>
            <p class="mt-1 text-xs leading-relaxed text-ink-soft">
              The code was shown when you sent your inquiry. Use the phone number you gave with it.
            </p>
            <label for="find-ref" class="mt-4 block text-xs text-ink-faint">Reference code</label>
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
              class="ws-input mt-2"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="0917-000-0000"
              :aria-describedby="lookupError ? 'find-error' : undefined"
            />
            <p v-if="lookupError" id="find-error" class="mt-2 text-xs leading-relaxed text-overdue" role="alert">
              {{ lookupError }}
            </p>
            <button type="submit" class="pill-btn-brand mt-4" :disabled="loading">
              {{ loading ? 'Opening' : 'Open my inquiry' }}
            </button>
          </form>

          <p class="mt-10 text-xs leading-relaxed text-ink-soft">
            Have not asked yet?
            <RouterLink to="/inquire" class="underline underline-offset-4 decoration-1 decoration-line hover:text-ink hover:decoration-ink">Send an inquiry</RouterLink>.
            Sent one before 30 September 2026? {{ LANDLADY.name }} answers those by phone:
            <a :href="`tel:${LANDLADY.phone}`" class="underline underline-offset-4 decoration-1 decoration-line hover:text-ink">{{ LANDLADY.phone }}</a>.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
