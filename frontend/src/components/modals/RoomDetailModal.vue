<script setup lang="ts">
import { isRoomDetailModalOpen, activeRoomDetail } from '@/lib/systemState';
import { X, Building2, Check, ShieldCheck, Clock, Wrench, Home } from 'lucide-vue-next';

function closeModal() {
  isRoomDetailModalOpen.value = false;
}

/**
 * The "Inquire Directly" button and its handler are gone, and none of it could ever run.
 *
 * This modal is opened from exactly one place - `RoomDirectoryView`, mounted at exactly one
 * route, `/admin/directory`, whose `meta.roles` is `['admin']`. The button's own guard was
 * `v-if="!isAdmin && !route.path.startsWith('/admin')"`, so both halves were false for the
 * only role that can reach it. It could not render.
 *
 * Had it rendered, the handler set `selectedPublicInquiryUnit` and `selectedInquirerId` -
 * both write-only, read by nothing in the codebase - and opened `isLiveChatheadOpen`, whose
 * component `LiveChatheadModal` is imported by no file and therefore never mounted. Three
 * dead things in one function.
 *
 * `LiveChatheadModal.vue` itself is left on disk: whether a live chat should exist, and
 * against which endpoint - it currently posts to an administrator-only route - is a decision
 * for Mrs. Da Silva, not a transcription.
 */

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
    <div class="surface-card w-full max-w-2xl shadow-2xl overflow-hidden rounded-2xl animate-in fade-in zoom-in-95 duration-150 my-6 bg-white border border-border">
      
      <div class="flex items-center justify-between p-6 pb-4 border-b border-border">
        <div class="flex items-center gap-2.5">
          <div class="size-9 rounded-xl bg-blue-50 text-primary ring-1 ring-blue-200 flex items-center justify-center">
            <Building2 class="size-5" />
          </div>
          <div>
            <h3 class="font-display font-extrabold text-lg text-foreground">
              Unit {{ activeRoomDetail.unitCode.toUpperCase() }} Specifications
            </h3>
            <p class="text-xs text-muted-foreground">{{ activeRoomDetail.cluster }} · {{ activeRoomDetail.floorLabel || `Floor ${activeRoomDetail.floor}` }}</p>
          </div>
        </div>
        <button @click="closeModal" class="p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer" aria-label="Close dialog">
          <X class="size-5" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-foreground max-h-[75vh] overflow-y-auto">
        
        <!-- Room Photo Banner -->
        <div v-if="activeRoomDetail.photo" class="h-48 w-full rounded-xl overflow-hidden relative border border-border bg-neutral-900 shadow-2xs">
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

        <div class="p-4 rounded-xl bg-neutral-dark text-white flex justify-between items-end">
          <div>
            <span class="text-[10px] uppercase font-bold tracking-widest text-blue-400">Unit Showcase</span>
            <h4 class="font-display font-bold text-xl text-white mt-0.5">Unit {{ activeRoomDetail.unitCode.toUpperCase() }}</h4>
            <p class="text-xs text-muted-foreground-soft mt-0.5">{{ activeRoomDetail.type }} • Up to {{ activeRoomDetail.maxOccupants }} Pax</p>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-muted-foreground-soft block uppercase font-bold">Base Rate</span>
            <span class="font-display font-extrabold text-xl text-white">₱{{ activeRoomDetail.price.toLocaleString() }}<span class="text-xs font-normal text-muted-foreground-soft">/mo</span></span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 bg-background border border-border rounded-xl">
            <p class="text-muted-foreground text-[10px] font-bold uppercase">Monthly Rate</p>
            <p class="font-display text-base font-extrabold text-foreground mt-0.5">
              ₱{{ activeRoomDetail.price.toLocaleString() }} <span class="text-xs font-normal text-muted-foreground">/ month</span>
            </p>
          </div>
          <div class="p-3.5 bg-background border border-border rounded-xl flex flex-col justify-between">
            <p class="text-muted-foreground text-[10px] font-bold uppercase">Operational Status</p>
            <div class="mt-0.5">
              <span :class="['badge-soft text-xs capitalize font-extrabold', getStatusBadgeClass(activeRoomDetail.status)]">
                {{ activeRoomDetail.status }}
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Unit Description</p>
          <p class="p-3.5 bg-white border border-border rounded-xl leading-relaxed text-[#44403c]">
            {{ activeRoomDetail.desc }}
          </p>
        </div>

        <div class="space-y-1.5">
          <p class="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Included Amenities &amp; Fixtures</p>
          <div class="grid grid-cols-2 gap-2 text-xs text-foreground bg-background p-3.5 border border-border rounded-xl">
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-emerald-600 font-bold" /> Private T&amp;B Bathroom</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-emerald-600 font-bold" /> Kitchenette Sink</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-emerald-600 font-bold" /> Bed Frame / Base</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-emerald-600 font-bold" /> Submetered Electricity</div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="p-4 px-6 border-t border-border flex items-center justify-end gap-3">
        <button @click="closeModal" class="btn-secondary">
          Close Specs
        </button>
      </div>
    </div>
  </div>
</template>
