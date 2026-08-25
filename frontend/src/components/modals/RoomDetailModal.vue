<script setup lang="ts">
import { isRoomDetailModalOpen, activeRoomDetail, isLiveChatheadOpen, selectedInquirerId, selectedPublicInquiryUnit } from '@/lib/systemState';
import { X, MessageSquare, Building2, Check, Banknote } from 'lucide-vue-next';

function closeModal() {
  isRoomDetailModalOpen.value = false;
}

function handleInquireDirectly() {
  if (activeRoomDetail.value) {
    selectedPublicInquiryUnit.value = activeRoomDetail.value.unitCode;
  }
  closeModal();
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}
</script>

<template>
  <div v-if="isRoomDetailModalOpen && activeRoomDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1917]/50 backdrop-blur-xs p-4 overflow-y-auto">
    <div class="surface-card w-full max-w-lg shadow-2xl overflow-hidden rounded-2xl animate-in fade-in zoom-in-95 duration-150 my-6">
      
      <div class="flex items-center justify-between p-6 pb-4 border-b border-[#e7e5e4]">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-[#fbf6ee] text-[#f59e0b] flex items-center justify-center">
            <Building2 class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-lg text-[#1c1917]">
              Unit {{ activeRoomDetail.unitCode.toUpperCase() }} Specifications
            </h3>
            <p class="text-xs text-[#71717a]">{{ activeRoomDetail.cluster }} • {{ activeRoomDetail.floorLabel }}</p>
          </div>
        </div>
        <button @click="closeModal" class="w-8 h-8 rounded-full flex items-center justify-center text-[#71717a] hover:bg-[#f5f5f4] border border-[#e7e5e4]">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-[#1c1917] max-h-[75vh] overflow-y-auto">
        
        <!-- Room Photo Banner -->
        <div v-if="activeRoomDetail.photo" class="h-44 w-full rounded-xl overflow-hidden relative border border-[#e7e5e4] bg-neutral-900 shadow-2xs">
          <img 
            :src="activeRoomDetail.photo" 
            :alt="`Unit ${activeRoomDetail.unitCode}`"
            class="size-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div class="absolute bottom-3 left-3 flex items-center gap-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/90 text-[#1c1917] shadow-xs uppercase tracking-wider backdrop-blur-xs">
              {{ activeRoomDetail.cluster }}
            </span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f59e0b] text-white shadow-xs">
              Floor {{ activeRoomDetail.floor }}
            </span>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-[#1e2532] text-white flex justify-between items-end">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-[#f59e0b]">Unit Showcase</span>
            <h4 class="font-display font-bold text-xl text-white mt-0.5">Unit {{ activeRoomDetail.unitCode.toUpperCase() }}</h4>
            <p class="text-xs text-[#a1a1aa] mt-0.5">{{ activeRoomDetail.type }} • Up to {{ activeRoomDetail.maxOccupants }} Pax</p>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-[#a1a1aa] block uppercase font-bold">Base Rate</span>
            <span class="font-display font-extrabold text-xl text-white">₱{{ activeRoomDetail.price.toLocaleString() }}<span class="text-xs font-normal text-[#a1a1aa]">/mo</span></span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
            <p class="text-[#71717a] text-[10px] font-bold uppercase">Monthly Rate</p>
            <p class="font-display text-base font-extrabold text-[#1c1917] mt-0.5">
              ₱{{ activeRoomDetail.price.toLocaleString() }} <span class="text-xs font-normal text-[#71717a]">/ month</span>
            </p>
          </div>
          <div class="p-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl">
            <p class="text-[#71717a] text-[10px] font-bold uppercase">Availability</p>
            <p class="font-bold text-[#1c1917] mt-0.5 capitalize">{{ activeRoomDetail.status }}</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-bold text-[#71717a] text-[11px] uppercase tracking-wider">Unit Description</p>
          <p class="p-3.5 bg-white border border-[#e7e5e4] rounded-xl leading-relaxed text-[#44403c]">
            {{ activeRoomDetail.desc }}
          </p>
        </div>

        <div class="space-y-1.5">
          <p class="font-bold text-[#71717a] text-[11px] uppercase tracking-wider">Included Amenities &amp; Fixtures</p>
          <div class="grid grid-cols-2 gap-2 text-xs text-[#1c1917] bg-[#fafaf9] p-3.5 border border-[#e7e5e4] rounded-xl">
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-emerald-600 font-bold" /> Private T&amp;B Bathroom</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-emerald-600 font-bold" /> Kitchenette Sink</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-emerald-600 font-bold" /> Bed Frame / Base</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-emerald-600 font-bold" /> Submetered Electricity</div>
          </div>
        </div>

        <div class="p-3.5 bg-[#fffbeb] border border-[#fde68a] text-[#92400e] rounded-xl space-y-1">
          <p class="font-bold flex items-center gap-1.5 text-xs">
            <Banknote class="w-3.5 h-3.5 text-[#f59e0b]" /> Utility Billing Rules:
          </p>
          <p class="text-xs">
            Water is billed at ₱200 per registered occupant monthly. Electricity is submetered per room based on actual consumption.
          </p>
        </div>
      </div>

      <div class="p-4 px-6 border-t border-[#e7e5e4] flex items-center justify-between">
        <button @click="closeModal" class="btn-secondary">
          Close
        </button>
        <button @click="handleInquireDirectly" class="btn-primary">
          <MessageSquare class="size-3.5 text-[#f59e0b]" />
          <span>Inquire to Landlady</span>
        </button>
      </div>
    </div>
  </div>
</template>
