<!--
  @file components/modals/LiveChatheadModal.vue
  @description Floating chathead messenger popover for real-time landlady/inquirer communications.
  @systemBibleRef Section 3.5 - Tenant & Guest Inquiries Communication Channel
-->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { isLiveChatheadOpen, activeInquirers, selectedInquirerId, sendChatMessage } from '@/lib/systemState';
import { X, Send, MessageSquare } from 'lucide-vue-next';

const newMessageText = ref('');

const activeInquirer = computed(() => activeInquirers.find(i => i.id === selectedInquirerId.value));

function closeModal() {
  isLiveChatheadOpen.value = false;
}

function handleSend() {
  if (!newMessageText.value.trim() || !selectedInquirerId.value) return;
  sendChatMessage(selectedInquirerId.value, newMessageText.value.trim(), 'Landlady');
  newMessageText.value = '';
}
</script>

<template>
  <div v-if="isLiveChatheadOpen" class="fixed bottom-4 right-4 z-50 w-full max-w-lg shadow-2xl rounded-xs border border-[#dfe1e6] bg-[#ffffff] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
    <div class="flex items-center justify-between p-3 border-b border-[#dfe1e6] bg-[#172b4d] text-white">
      <div class="flex items-center gap-2">
        <MessageSquare class="w-4 h-4 text-sky-400" />
        <span class="text-xs font-bold">Landlady Inquiry Chat Messenger</span>
      </div>
      <button @click="closeModal" class="p-1 hover:bg-slate-700 rounded-xs text-slate-300">
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="grid grid-cols-3 h-80">
      <!-- Sidebar list of inquirers -->
      <div class="border-r border-[#dfe1e6] bg-[#f4f5f7] p-2 space-y-1 overflow-y-auto">
        <p class="text-[10px] font-bold text-[#5e6c84] uppercase tracking-wider mb-2">Inquirers</p>
        <button
          v-for="inq in activeInquirers"
          :key="inq.id"
          @click="selectedInquirerId = inq.id"
          :class="[
            'w-full text-left p-2 rounded-xs text-xs transition-colors',
            selectedInquirerId === inq.id ? 'bg-[#ffffff] font-bold border border-[#dfe1e6] shadow-2xs' : 'hover:bg-[#ebecf0] text-[#172b4d]'
          ]"
        >
          <p class="truncate">{{ inq.name }}</p>
          <p class="text-[10px] text-[#5e6c84]">Room {{ inq.room }}</p>
        </button>
      </div>

      <!-- Active Chat Feed -->
      <div v-if="activeInquirer" class="col-span-2 flex flex-col h-full bg-[#ffffff] p-3 justify-between">
        <div class="border-b border-[#dfe1e6] pb-2 mb-2">
          <p class="text-xs font-bold text-[#172b4d]">{{ activeInquirer.name }}</p>
          <p class="text-[10px] text-[#5e6c84]">Inquiring about Room {{ activeInquirer.room }} (₱{{ activeInquirer.price.toLocaleString() }}/mo)</p>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 p-1 text-xs">
          <div
            v-for="(msg, idx) in activeInquirer.messages"
            :key="idx"
            :class="['max-w-[85%] p-2 rounded-xs', msg.sender === 'Landlady' ? 'ml-auto bg-[#0c66e4] text-white' : 'bg-[#f4f5f7] text-[#172b4d] border border-[#dfe1e6]']"
          >
            <p>{{ msg.text }}</p>
            <p :class="['text-[9px] mt-1 text-right', msg.sender === 'Landlady' ? 'text-sky-100' : 'text-[#5e6c84]']">{{ msg.time }}</p>
          </div>
        </div>

        <form @submit.prevent="handleSend" class="pt-2 border-t border-[#dfe1e6] flex gap-1.5">
          <input v-model="newMessageText" type="text" placeholder="Type response..." class="jira-input text-xs flex-1" required />
          <button type="submit" class="jira-btn-primary p-2">
            <Send class="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
