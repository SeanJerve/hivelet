<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { isLiveChatheadOpen } from '@/lib/systemState';
import { MessageCircle, Send, X, UserRound } from 'lucide-vue-next';

interface Msg {
  id: number;
  from: 'them' | 'me';
  author: string;
  text: string;
  time: string;
}

interface Thread {
  name: string;
  unit: string;
  seed: Msg[];
}

const THREADS: Thread[] = [
  {
    name: 'Gabriel Fernandez',
    unit: 'Inquiry — Room 3e',
    seed: [
      {
        id: 1,
        from: 'them',
        author: 'Gabriel Fernandez',
        text: 'Good day po! Available pa po ba ang Room 3e this September?',
        time: '9:12 AM',
      },
      {
        id: 2,
        from: 'me',
        author: 'Fe Galang Da Silva',
        text: 'Good day! Opo, vacant pa ang 3e. ₱6,500/mo plus ₱200 water per occupant.',
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
    name: 'Maria Santos',
    unit: 'Inquiry — Penthouse',
    seed: [
      {
        id: 1,
        from: 'them',
        author: 'Maria Santos',
        text: 'Hello po, may parking ba ang Penthouse?',
        time: 'Yesterday',
      },
    ],
  },
  {
    name: 'Samantha Cruz',
    unit: 'Tenant — Room 1A',
    seed: [
      {
        id: 1,
        from: 'them',
        author: 'Samantha Cruz',
        text: "Ma'am, na-submit ko na po ang GCash proof for August.",
        time: 'Mon',
      },
    ],
  },
];

const activeThreadIndex = ref(0);
const threads = ref<Msg[][]>(THREADS.map((t) => [...t.seed]));
const draft = ref('');
const chatScrollContainer = ref<HTMLDivElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (chatScrollContainer.value) {
      chatScrollContainer.value.scrollTop = chatScrollContainer.value.scrollHeight;
    }
  });
}

watch([activeThreadIndex, isLiveChatheadOpen], () => {
  if (isLiveChatheadOpen.value) {
    scrollToBottom();
  }
});

function sendMessage() {
  const text = draft.value.trim();
  if (!text) return;
  threads.value[activeThreadIndex.value].push({
    id: Date.now(),
    from: 'me',
    author: 'Fe Galang Da Silva',
    text,
    time: new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }),
  });
  draft.value = '';
  scrollToBottom();
}
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
          v-for="(t, i) in THREADS"
          :key="t.name"
          @click="activeThreadIndex = i"
          :class="[
            'min-h-9 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors',
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
        <p class="text-center text-[11px] font-medium text-[#71717a]">
          {{ THREADS[activeThreadIndex].unit }}
        </p>

        <div 
          v-for="m in threads[activeThreadIndex]" 
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
          class="min-h-10 flex-1 px-3 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl text-xs text-[#1c1917] focus:bg-white focus:border-[#f59e0b] focus:outline-none"
        />
        <button 
          type="submit" 
          class="grid size-10 place-items-center rounded-xl bg-[#1e2532] text-white hover:bg-[#2b3648] transition-colors shadow-xs shrink-0"
          aria-label="Send message"
        >
          <Send class="size-4 text-[#f59e0b]" />
        </button>
      </form>
    </div>

    <!-- Floating Chat Trigger Button (when chat is closed) -->
    <button
      v-if="!isLiveChatheadOpen"
      @click="isLiveChatheadOpen = true"
      aria-label="Open live chat"
      class="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-[#1e2532] text-white shadow-xl transition-transform hover:scale-105"
    >
      <MessageCircle class="size-6 text-[#f59e0b]" />
      <span class="absolute -right-0.5 -top-0.5 grid size-6 place-items-center rounded-full bg-rose-600 text-xs font-bold text-white ring-2 ring-[#fafaf9]">
        3
      </span>
    </button>
  </div>
</template>
