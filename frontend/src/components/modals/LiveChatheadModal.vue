<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { isLiveChatheadOpen, showToast } from '@/lib/systemState';
import { api } from '@/lib/api';
import { isAdmin, isAuthenticated } from '@/lib/authStore';
import { MessageCircle, Send, X, UserRound, Loader2 } from 'lucide-vue-next';

interface Msg {
  id: string | number;
  from: 'them' | 'me';
  author: string;
  text: string;
  time: string;
}

interface Thread {
  id: string;
  name: string;
  unit: string;
  messages: Msg[];
}

const DEFAULT_THREADS: Thread[] = [
  {
    id: 'demo-1',
    name: 'Gabriel Fernandez',
    unit: 'Inquiry — Room 3E',
    messages: [
      {
        id: 1,
        from: 'them',
        author: 'Gabriel Fernandez',
        text: 'Good day po! Available pa po ba ang Room 3E this September?',
        time: '9:12 AM',
      },
      {
        id: 2,
        from: 'me',
        author: 'Fe Galang Da Silva',
        text: 'Good day! Opo, vacant pa ang 3E. ₱6,500/mo plus ₱200 water per occupant.',
        time: '9:20 AM',
      },
      {
        id: 3,
        from: 'them',
        author: 'Gabriel Fernandez',
        text: 'Salamat po! Pwede po bang mag-viewing this Saturday, 10 AM?',
        time: '9:22 AM',
      },
    ],
  },
  {
    id: 'demo-2',
    name: 'Maria Santos',
    unit: 'Inquiry — Penthouse',
    messages: [
      {
        id: 4,
        from: 'them',
        author: 'Maria Santos',
        text: 'Hello po, may parking ba ang Penthouse?',
        time: 'Yesterday',
      },
    ],
  },
];

const threads = ref<Thread[]>([...DEFAULT_THREADS]);
const activeThreadIndex = ref(0);
const draft = ref('');
const isLoadingMessages = ref(false);
const chatScrollContainer = ref<HTMLDivElement | null>(null);

const activeThread = computed(() => threads.value[activeThreadIndex.value] || threads.value[0]);

function scrollToBottom() {
  nextTick(() => {
    if (chatScrollContainer.value) {
      chatScrollContainer.value.scrollTop = chatScrollContainer.value.scrollHeight;
    }
  });
}

async function loadInquiries() {
  if (!isAuthenticated.value || !isAdmin.value) return;

  try {
    const res = await api.get<any[]>('/admin/inquiries');
    if (res && Array.isArray(res) && res.length > 0) {
      const liveThreads: Thread[] = [];

      for (const inq of res.slice(0, 5)) {
        liveThreads.push({
          id: inq.id,
          name: inq.prospect_name || inq.full_name || 'Prospect',
          unit: `Inquiry — Room ${inq.rooms?.room_number || inq.room_number || 'Unit'}`,
          messages: [
            {
              id: `init-${inq.id}`,
              from: 'them',
              author: inq.prospect_name || inq.full_name || 'Prospect',
              text: inq.message || 'Good day! Inquiring about room availability.',
              time: inq.created_at ? new Date(inq.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Recent',
            }
          ]
        });
      }

      if (liveThreads.length > 0) {
        threads.value = liveThreads;
        await loadMessagesForThread(0);
      }
    }
  } catch (err) {
    console.error('Failed to load inquiry threads for chathead:', err);
  }
}

async function loadMessagesForThread(index: number) {
  activeThreadIndex.value = index;
  const target = threads.value[index];
  if (!target || target.id.startsWith('demo-') || !isAdmin.value) {
    scrollToBottom();
    return;
  }

  isLoadingMessages.value = true;
  try {
    const res = await api.get<any[]>(`/admin/inquiries/${target.id}/messages`);
    if (res && Array.isArray(res) && res.length > 0) {
      target.messages = res.map((m) => ({
        id: m.id,
        from: m.sender_name?.includes('Landlady') ? 'me' : 'them',
        author: m.sender_name || 'Prospect',
        text: m.message_body || m.message,
        time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      }));
    }
  } catch {
    // Graceful fallback to existing messages
  } finally {
    isLoadingMessages.value = false;
    scrollToBottom();
  }
}

watch(isLiveChatheadOpen, (open) => {
  if (open) {
    loadInquiries();
    scrollToBottom();
  }
});

async function sendMessage() {
  const text = draft.value.trim();
  if (!text) return;

  const current = activeThread.value;
  if (!current) return;

  const newMsg: Msg = {
    id: Date.now(),
    from: 'me',
    author: 'Fe Galang Da Silva',
    text,
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };

  current.messages.push(newMsg);
  draft.value = '';
  scrollToBottom();

  if (isAdmin.value && !current.id.startsWith('demo-')) {
    try {
      await api.post(`/admin/inquiries/${current.id}/messages`, { message: text });
    } catch (err) {
      console.error('Failed to persist inquiry message:', err);
    }
  }
}

onMounted(() => {
  if (isAdmin.value) {
    loadInquiries();
  }
});
</script>

<template>
  <div>
    <!-- Chat Drawer / Modal Window -->
    <div 
      v-if="isLiveChatheadOpen" 
      class="fixed bottom-4 right-4 z-[60] flex h-[560px] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
    >
      <!-- Chat Header -->
      <header class="flex items-center justify-between gap-2 border-b border-[#e7e5e4] bg-[#1e2532] px-4 py-3 text-white">
        <div>
          <p class="font-display text-sm font-extrabold">Inquiry Inbox</p>
          <p class="text-[11px] text-gray-300">Hivelet Live Chat</p>
        </div>
        <button
          @click="isLiveChatheadOpen = false"
          class="grid size-8 place-items-center rounded-lg text-white hover:bg-white/10 transition-colors"
          aria-label="Close chat"
        >
          <X class="size-4" />
        </button>
      </header>

      <!-- Thread Switcher -->
      <div class="flex gap-1 overflow-x-auto border-b border-[#e7e5e4] bg-[#f5f5f4] px-2 py-2">
        <button
          v-for="(t, i) in threads"
          :key="t.id"
          @click="loadMessagesForThread(i)"
          :class="[
            'min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer',
            activeThreadIndex === i 
              ? 'bg-white text-[#1c1917] shadow-xs font-bold' 
              : 'text-[#71717a] hover:text-[#1c1917]'
          ]"
        >
          {{ t.name.split(' ')[0] }}
        </button>
      </div>

      <!-- Messages Stream -->
      <div ref="chatScrollContainer" class="flex-1 space-y-3 overflow-y-auto bg-[#fafaf9] p-3 text-xs">
        <div class="text-center">
          <p class="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-[#5e6c84]">
            {{ activeThread?.unit || 'Inquiry Thread' }}
          </p>
        </div>

        <div v-if="isLoadingMessages" class="py-6 text-center text-[#5e6c84] flex flex-col items-center gap-1">
          <Loader2 class="w-4 h-4 text-[#0c66e4] animate-spin" />
          <span class="text-[10px]">Loading messages...</span>
        </div>

        <div 
          v-for="m in activeThread?.messages || []" 
          :key="m.id" 
          :class="['flex gap-2', m.from === 'me' ? 'flex-row-reverse' : '']"
        >
          <span class="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-[#f5f5f4] text-[#1c1917] border border-[#e7e5e4]">
            <UserRound class="size-3.5 text-[#71717a]" />
          </span>

          <div
            :class="[
              'max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
              m.from === 'me'
                ? 'rounded-br-xs bg-[#1e2532] text-white'
                : 'rounded-bl-xs border border-[#e7e5e4] bg-white text-[#1c1917] shadow-xs'
            ]"
          >
            <p>{{ m.text }}</p>
            <p :class="['mt-1 text-[10px]', m.from === 'me' ? 'text-gray-300' : 'text-[#71717a]']">
              {{ m.time }}
            </p>
          </div>
        </div>
      </div>

      <!-- Message Composer -->
      <form
        @submit.prevent="sendMessage"
        class="flex items-center gap-2 border-t border-[#e7e5e4] bg-white p-2"
      >
        <input
          v-model="draft"
          placeholder="Type a reply…"
          class="min-h-10 flex-1 px-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl text-xs text-[#1c1917] focus:bg-white focus:border-[#0c66e4] focus:outline-none"
        />
        <button 
          type="submit" 
          class="grid size-10 place-items-center rounded-xl bg-[#0c66e4] text-white hover:bg-[#0055cc] transition-colors shadow-xs shrink-0 cursor-pointer"
          aria-label="Send message"
        >
          <Send class="size-4 text-white" />
        </button>
      </form>
    </div>

    <!-- Floating Chat Trigger Button (when chat is closed) -->
    <button
      v-if="!isLiveChatheadOpen"
      @click="isLiveChatheadOpen = true"
      aria-label="Open live chat"
      class="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-[#1e2532] text-white shadow-xl transition-transform hover:scale-105 cursor-pointer"
      title="Inquiry Live Chat"
    >
      <MessageCircle class="size-6 text-[#f59e0b]" />
    </button>
  </div>
</template>
