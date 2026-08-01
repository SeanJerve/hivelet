<!--
  @file components/modals/LiveChatheadModal.vue
  @description Floating live chathead messenger for guest inquiries and landlady responses.
-->
<script setup lang="ts">
import { isLiveChatheadOpen, activeInquirers, selectedInquirerId, sendChatMessage } from '@/lib/systemState';
import { ref, computed } from 'vue';
import { X, Send, MessageSquare } from 'lucide-vue-next';

const draftMessage = ref('');

const currentInquirer = computed(() => {
  return activeInquirers.find(i => i.id === selectedInquirerId.value) || activeInquirers[0];
});

function handleSend() {
  if (!draftMessage.value.trim()) return;
  sendChatMessage(currentInquirer.value.id, draftMessage.value.trim(), 'Landlady');
  draftMessage.value = '';
}
</script>

<template>
  <div v-if="isLiveChatheadOpen" class="fixed bottom-16 right-4 md:right-8 z-50 w-full max-w-sm">
    <div class="jira-card shadow-2xl overflow-hidden border border-[#dfe1e6] flex flex-col h-96 animate-in slide-in-from-bottom-5 duration-200">
      <div class="bg-[#091e42] text-white p-3 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <MessageSquare class="w-4 h-4 text-sky-400" />
          <span class="font-bold text-xs">Live Inquiry Messenger</span>
        </div>
        <button @click="isLiveChatheadOpen = false" class="text-slate-300 hover:text-white cursor-pointer"><X class="w-4 h-4" /></button>
      </div>

      <!-- Inquirer selector tabs -->
      <div class="bg-slate-100 p-1 border-b border-[#dfe1e6] flex gap-1 text-[11px] overflow-x-auto">
        <button
          v-for="inq in activeInquirers"
          :key="inq.id"
          @click="selectedInquirerId = inq.id"
          :class="['px-2.5 py-1 rounded-md font-bold whitespace-nowrap cursor-pointer', selectedInquirerId === inq.id ? 'bg-[#0c66e4] text-white' : 'bg-white text-[#172b4d] hover:bg-slate-200']"
        >
          {{ inq.name }} (Unit {{ inq.room }})
        </button>
      </div>

      <!-- Message History Thread -->
      <div class="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#f4f5f7] text-xs">
        <div
          v-for="(msg, idx) in currentInquirer.messages"
          :key="idx"
          :class="['max-w-[80%] p-2.5 rounded-lg space-y-0.5', msg.sender === 'Landlady' ? 'ml-auto bg-[#0c66e4] text-white rounded-br-none' : 'bg-white text-[#172b4d] border border-[#dfe1e6] rounded-bl-none']"
        >
          <div class="flex justify-between items-center gap-2 text-[10px] opacity-80 font-semibold">
            <span>{{ msg.sender }}</span>
            <span>{{ msg.time }}</span>
          </div>
          <p class="leading-relaxed">{{ msg.text }}</p>
        </div>
      </div>

      <!-- Reply Box -->
      <form @submit.prevent="handleSend" class="p-2 bg-white border-t border-[#dfe1e6] flex gap-1.5">
        <input v-model="draftMessage" type="text" placeholder="Type landlady response..." class="jira-input text-xs py-1.5" />
        <button type="submit" class="jira-btn-primary py-1.5 px-3"><Send class="w-3.5 h-3.5" /></button>
      </form>
    </div>
  </div>
</template>
