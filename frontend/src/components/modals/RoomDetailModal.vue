<!--
  @file components/modals/RoomDetailModal.vue
  @description Room unit details modal displaying base rent, occupant limits, amenities, and inquiry trigger.
  @systemBibleRef Section 3.1 - Room Directory & Unit Showcase
  @rationale Allows guests, tenants, and admin to view full unit specifications and trigger landlady inquiries.
-->
<script setup lang="ts">
import { isRoomDetailModalOpen, activeRoomDetail, isLiveChatheadOpen, selectedInquirerId } from '@/lib/systemState';
import { X, MessageSquare, ShieldCheck, Users, Banknote } from 'lucide-vue-next';

function closeModal() {
  isRoomDetailModalOpen.value = false;
}

function handleInquire() {
  closeModal();
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}
</script>

<template>
  <div v-if="isRoomDetailModalOpen && activeRoomDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between p-4 border-b border-[#dfe1e6] bg-[#f4f5f7]">
        <h3 class="text-sm font-bold text-[#172b4d] flex items-center gap-2">
          <span>Room {{ activeRoomDetail.num }} Details</span>
          <span class="jira-badge text-xs bg-blue-100 text-blue-800">{{ activeRoomDetail.type }}</span>
        </h3>
        <button @click="closeModal" class="p-1 hover:bg-[#ebecf0] rounded-xs text-[#5e6c84] transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-[#172b4d]">
        <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs flex justify-between items-center">
          <div>
            <p class="text-[#5e6c84]">Monthly Base Rent</p>
            <p class="text-lg font-bold text-[#0c66e4]">₱{{ activeRoomDetail.price.toLocaleString() }} <span class="text-xs font-normal text-[#5e6c84]">/ mo</span></p>
          </div>
          <div class="text-right">
            <p class="text-[#5e6c84]">Floor Level</p>
            <p class="font-bold text-[#172b4d]">Floor {{ activeRoomDetail.floor }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 border border-[#dfe1e6] rounded-xs">
            <p class="text-[#5e6c84] flex items-center gap-1"><Users class="w-3.5 h-3.5" /> Max Occupants</p>
            <p class="font-bold mt-1">{{ activeRoomDetail.maxOccupants }} Persons Limit</p>
          </div>
          <div class="p-3 border border-[#dfe1e6] rounded-xs">
            <p class="text-[#5e6c84] flex items-center gap-1"><ShieldCheck class="w-3.5 h-3.5" /> Status</p>
            <p class="font-bold mt-1 uppercase text-[#0c66e4]">{{ activeRoomDetail.status }}</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-bold text-[#5e6c84]">Description & Amenities:</p>
          <p class="p-3 bg-[#ffffff] border border-[#dfe1e6] rounded-xs leading-relaxed text-[#172b4d]">
            {{ activeRoomDetail.desc }}
          </p>
        </div>

        <div class="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs">
          <p class="font-semibold flex items-center gap-1"><Banknote class="w-3.5 h-3.5" /> Water Billing Rule (BR-014):</p>
          <p class="mt-0.5">₱200 per registered occupant per month added to monthly remittance.</p>
        </div>
      </div>

      <div class="p-4 border-t border-[#dfe1e6] bg-[#f4f5f7] flex justify-end gap-2">
        <button @click="closeModal" class="jira-btn-secondary">Close</button>
        <button @click="handleInquire" class="jira-btn-primary flex items-center gap-1.5">
          <MessageSquare class="w-3.5 h-3.5" /> Inquire Room & Chat Landlady
        </button>
      </div>
    </div>
  </div>
</template>
