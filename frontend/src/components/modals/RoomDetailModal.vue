<!--
  @file components/modals/RoomDetailModal.vue
  @description Minimalist Corporate Room Specifications & Direct Landlady Inquiry Modal.
  @systemBibleRef Section 4 - Public Visitor Role, Section 5 - Property Model, BR-014 (₱200/head water) & BR-040 (Linda exception)
  @rationale Displays full unit specs, unit photo, floor location, capacity, utility rules, and direct landlady inquiry trigger.
  @innovations Synchronizes unit specs with direct landlady chat messenger and public inquiry form.
-->
<script setup lang="ts">
import { isRoomDetailModalOpen, activeRoomDetail, isLiveChatheadOpen, selectedInquirerId, selectedPublicInquiryUnit } from '@/lib/systemState';
import { X, MessageSquare, ShieldCheck, Users, Banknote, Zap, Home, CheckCircle2, Building2 } from 'lucide-vue-next';

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

  // Smooth scroll to public inquiry form if visible on page
  const inquiryElem = document.getElementById('inquiry-form');
  if (inquiryElem) {
    inquiryElem.scrollIntoView({ behavior: 'smooth' });
  }
}
</script>

<template>
  <div v-if="isRoomDetailModalOpen && activeRoomDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
    <div class="jira-card w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header Bar -->
      <div class="flex items-center justify-between p-4 border-b border-[#dfe1e6] bg-[#f4f5f7]">
        <div class="flex items-center gap-2">
          <Building2 class="w-4 h-4 text-[#0c66e4]" />
          <h3 class="text-sm font-bold text-[#172b4d]">
            Unit {{ activeRoomDetail.unitCode }} Specifications
          </h3>
          <span class="jira-badge text-xs bg-blue-100 text-[#0c66e4] font-semibold">{{ activeRoomDetail.type }}</span>
        </div>
        <button @click="closeModal" class="p-1 hover:bg-[#ebecf0] rounded-xs text-[#5e6c84] transition-colors" aria-label="Close modal">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 space-y-4 text-xs text-[#172b4d] max-h-[80vh] overflow-y-auto">
        <!-- Visual Unit Photo Graphic Card -->
        <div class="relative bg-slate-800 text-white rounded-md p-4 overflow-hidden border border-slate-700 flex flex-col justify-between h-36">
          <div class="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-800/80 to-blue-900/40 opacity-90"></div>
          
          <div class="relative z-10 flex justify-between items-start">
            <div>
              <span class="text-[10px] uppercase font-bold tracking-wider text-blue-300">Unit Visual Showcase</span>
              <h4 class="text-lg font-extrabold tracking-tight text-white">Unit {{ activeRoomDetail.unitCode }} ({{ activeRoomDetail.type }})</h4>
              <p class="text-[11px] text-slate-300">{{ activeRoomDetail.floorLabel }} • {{ activeRoomDetail.cluster }}</p>
            </div>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0c66e4] text-white uppercase tracking-wider">
              {{ activeRoomDetail.status }}
            </span>
          </div>

          <div class="relative z-10 flex justify-between items-end pt-2 border-t border-slate-700/60">
            <div class="flex items-center gap-3 text-[11px] text-slate-300">
              <span class="flex items-center gap-1"><Users class="w-3 h-3 text-blue-300" /> Max {{ activeRoomDetail.maxOccupants }} Pax</span>
              <span class="flex items-center gap-1"><Home class="w-3 h-3 text-blue-300" /> Private T&B</span>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block uppercase">Base Rent</span>
              <span class="text-base font-extrabold text-white">₱{{ activeRoomDetail.price.toLocaleString() }}<span class="text-[10px] font-normal text-slate-300">/mo</span></span>
            </div>
          </div>
        </div>

        <!-- Primary Specs Grid -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
            <p class="text-[#5e6c84] text-[11px] font-semibold">Monthly Base Rent</p>
            <p class="text-base font-extrabold text-[#0c66e4] mt-0.5">₱{{ activeRoomDetail.price.toLocaleString() }} <span class="text-xs font-normal text-[#5e6c84]">/ month</span></p>
          </div>
          <div class="p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xs">
            <p class="text-[#5e6c84] text-[11px] font-semibold">Property Cluster & Floor</p>
            <p class="font-bold text-[#172b4d] mt-0.5">{{ activeRoomDetail.cluster }}</p>
            <p class="text-[10px] text-[#5e6c84]">{{ activeRoomDetail.floorLabel }}</p>
          </div>
        </div>

        <!-- Occupancy & Status -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 border border-[#dfe1e6] rounded-xs flex items-center gap-2">
            <Users class="w-4 h-4 text-[#0c66e4]" />
            <div>
              <p class="text-[10px] text-[#5e6c84] font-semibold">Maximum Capacity</p>
              <p class="font-bold text-[#172b4d]">{{ activeRoomDetail.maxOccupants }} Registered Occupants</p>
            </div>
          </div>
          <div class="p-3 border border-[#dfe1e6] rounded-xs flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-emerald-600" />
            <div>
              <p class="text-[10px] text-[#5e6c84] font-semibold">Current Availability</p>
              <p class="font-bold uppercase text-emerald-700">{{ activeRoomDetail.status }}</p>
            </div>
          </div>
        </div>

        <!-- Description & Amenities -->
        <div class="space-y-1.5">
          <p class="font-bold text-[#5e6c84] text-[11px]">Unit Description & Specifications:</p>
          <p class="p-3 bg-[#ffffff] border border-[#dfe1e6] rounded-xs leading-relaxed text-[#172b4d]">
            {{ activeRoomDetail.desc }}
          </p>
        </div>

        <!-- Key Amenities Checklist -->
        <div class="space-y-1.5">
          <p class="font-bold text-[#5e6c84] text-[11px]">Included Amenities & Fixtures:</p>
          <div class="grid grid-cols-2 gap-2 text-[11px] text-[#172b4d] bg-[#f4f5f7] p-3 border border-[#dfe1e6] rounded-xs">
            <div class="flex items-center gap-1.5"><CheckCircle2 class="w-3.5 h-3.5 text-[#0c66e4]" /> Private T&B Bathroom</div>
            <div class="flex items-center gap-1.5"><CheckCircle2 class="w-3.5 h-3.5 text-[#0c66e4]" /> Kitchenette Sink Unit</div>
            <div class="flex items-center gap-1.5"><CheckCircle2 class="w-3.5 h-3.5 text-[#0c66e4]" /> Storage Cabinets</div>
            <div class="flex items-center gap-1.5"><CheckCircle2 class="w-3.5 h-3.5 text-[#0c66e4]" /> Bed Frame & Mattress Base</div>
            <div class="flex items-center gap-1.5"><Zap class="w-3.5 h-3.5 text-[#0c66e4]" /> Submetered Electricity</div>
            <div class="flex items-center gap-1.5"><CheckCircle2 class="w-3.5 h-3.5 text-[#0c66e4]" /> Windows / Air Ventilation</div>
          </div>
        </div>

        <!-- Water & Utilities Policy (System Bible BR-014 / BR-040) -->
        <div class="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xs space-y-1">
          <p class="font-bold flex items-center gap-1 text-[11px]"><Banknote class="w-3.5 h-3.5 text-amber-700" /> Utility Billing Rules (BR-014 / BR-040):</p>
          <p v-if="activeRoomDetail.waterRateType === 'linda_fixed'" class="text-[11px]">
            Linda Unit Exception (BR-040 Fixed Water/Electric Rates).
          </p>
          <p v-else class="text-[11px]">
            Water is billed at ₱200 per registered occupant monthly. Electricity is individually submetered per unit based on actual consumption.
          </p>
        </div>
      </div>

      <!-- Footer Action Buttons -->
      <div class="p-4 border-t border-[#dfe1e6] bg-[#f4f5f7] flex items-center justify-between">
        <button @click="closeModal" class="jira-btn-secondary text-xs">
          Close Specs
        </button>
        <button @click="handleInquireDirectly" class="jira-btn-primary text-xs flex items-center gap-1.5">
          <MessageSquare class="w-3.5 h-3.5" />
          <span>Inquire Directly to Landlady</span>
        </button>
      </div>
    </div>
  </div>
</template>

