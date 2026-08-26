<script setup lang="ts">
import { useRoute } from 'vue-router';
import { isRoomDetailModalOpen, activeRoomDetail, isLiveChatheadOpen, selectedInquirerId, selectedPublicInquiryUnit } from '@/lib/systemState';
import { isAdmin } from '@/lib/authStore';
import { X, MessageSquare, Building2, Check, ShieldCheck, Clock, Wrench, Home } from 'lucide-vue-next';

const route = useRoute();

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

function getStatusBadgeClass(status?: string) {
  if (status === 'settled' || status === 'occupied') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
  if (status === 'overdue') return 'badge-danger';
  if (status === 'maintenance') return 'badge-purple';
  return 'badge-neutral';
}
</script>

<template>
  <div 
    v-if="isRoomDetailModalOpen && activeRoomDetail" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto"
    @click.self="closeModal"
  >
    <div class="surface-card w-full max-w-2xl shadow-2xl overflow-hidden rounded-2xl animate-in fade-in zoom-in-95 duration-150 my-6 bg-white border border-[#e7e5e4]">
      
      <div class="flex items-center justify-between p-6 pb-4 border-b border-[#e7e5e4]">
        <div class="flex items-center gap-2.5">
          <div class="size-9 rounded-xl bg-blue-50 text-[#0c66e4] ring-1 ring-blue-200 flex items-center justify-center">
            <Building2 class="size-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-lg text-[#1c1917]">
              Unit {{ activeRoomDetail.unitCode.toUpperCase() }} Specifications
            </h3>
            <p class="text-xs text-[#71717a]">{{ activeRoomDetail.cluster }} · {{ activeRoomDetail.floorLabel || `Floor ${activeRoomDetail.floor}` }}</p>
          </div>
        </div>
        <button @click="closeModal" class="p-1.5 rounded-lg text-[#71717a] hover:bg-[#f5f5f4] cursor-pointer" aria-label="Close dialog">
          <X class="size-5" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-[#1c1917] max-h-[75vh] overflow-y-auto">
        
        <!-- Room Photo Banner -->
        <div v-if="activeRoomDetail.photo" class="h-48 w-full rounded-xl overflow-hidden relative border border-[#e7e5e4] bg-neutral-900 shadow-2xs">
          <img 
            :src="activeRoomDetail.photo" 
            :alt="`Unit ${activeRoomDetail.unitCode}`"
            class="size-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div class="absolute bottom-3 left-3 flex items-center gap-2">
            <span class="badge-soft badge-neutral bg-white/95 font-bold uppercase tracking-wider">
              {{ activeRoomDetail.cluster }}
            </span>
            <span class="badge-soft badge-blue bg-white/95 font-bold">
              Floor {{ activeRoomDetail.floor }}
            </span>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-[#1e2532] text-white flex justify-between items-end">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-blue-400">Unit Showcase</span>
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
          <div class="p-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-xl flex flex-col justify-between">
            <p class="text-[#71717a] text-[10px] font-bold uppercase">Operational Status</p>
            <div class="mt-0.5">
              <span :class="['badge-soft text-xs capitalize font-extrabold', getStatusBadgeClass(activeRoomDetail.status)]">
                {{ activeRoomDetail.status }}
              </span>
            </div>
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
      </div>

      <!-- Footer Actions -->
      <div class="p-4 px-6 border-t border-[#e7e5e4] flex items-center justify-end gap-3">
        <!-- If opened by a guest on the public showcase, show Inquire button -->
        <button 
          v-if="!isAdmin && !route.path.startsWith('/admin')"
          @click="handleInquireDirectly" 
          class="btn-primary"
        >
          <MessageSquare class="size-3.5 text-white" />
          <span>Inquire Directly</span>
        </button>
        <button @click="closeModal" class="btn-secondary">
          Close Specs
        </button>
      </div>
    </div>
  </div>
</template>
