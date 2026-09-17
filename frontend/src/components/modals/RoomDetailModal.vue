<script setup lang="ts">
import { isRoomDetailModalOpen, activeRoomDetail, roomsFetchFailed } from '@/lib/systemState';
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
 * `LiveChatheadModal.vue` has since been deleted. It was imported by no file, so it could
 * never render; its three triggers were removed first; and it posted to
 * `/admin/inquiries/:id/messages`, an administrator-only route, with a hardcoded inquirer id -
 * so even mounted it could not have worked for the guests it was shown to. A live chat may
 * well be worth building; it would not start from that code.
 */

function getStatusBadgeClass(status?: string) {
  if (status === 'settled' || status === 'occupied') return 'badge-success';
  if (status === 'pending') return 'badge-warning';
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
    <div class="rounded-tile bg-tile w-full max-w-2xl shadow-2xl overflow-hidden rounded-tile animate-in fade-in zoom-in-95 duration-150 my-6 bg-tile border border-line">
      
      <div class="flex items-center justify-between p-6 pb-4 border-b border-line">
        <div class="flex items-center gap-2.5">
          <div class="size-9 rounded-xl bg-brand-soft text-brand ring-1 ring-brand-soft flex items-center justify-center">
            <Building2 class="size-5" />
          </div>
          <div>
            <h3 class="font-semibold text-lg text-ink">
              Unit {{ activeRoomDetail.unitCode.toUpperCase() }} Specifications
            </h3>
            <p class="text-xs text-ink-soft">{{ activeRoomDetail.cluster }} · {{ activeRoomDetail.floorLabel || `Floor ${activeRoomDetail.floor}` }}</p>
          </div>
        </div>
        <button @click="closeModal" class="p-1.5 rounded-lg text-ink-soft hover:bg-canvas cursor-pointer" aria-label="Close dialog">
          <X class="size-5" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs text-ink max-h-[75vh] overflow-y-auto">
        
        <!-- Room Photo Banner -->
        <div v-if="activeRoomDetail.photo" class="h-48 w-full rounded-xl overflow-hidden relative border border-line bg-neutral-900">
          <img 
            :src="activeRoomDetail.photo" 
            :alt="`Unit ${activeRoomDetail.unitCode}`"
            class="size-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div class="absolute bottom-3 left-3 flex items-center gap-2">
            <span class="badge-soft badge-neutral bg-tile/95 font-semibold">
              {{ activeRoomDetail.cluster }}
            </span>
            <span class="badge-soft badge-blue bg-tile/95 font-semibold">
              Floor {{ activeRoomDetail.floor }}
            </span>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-night text-white flex justify-between items-end">
          <div>
            <span class="text-[10px] uppercase font-semibold text-brand">Unit Showcase</span>
            <h4 class="font-semibold text-xl text-white mt-0.5">Unit {{ activeRoomDetail.unitCode.toUpperCase() }}</h4>
            <p class="text-xs text-ink-faint mt-0.5">{{ activeRoomDetail.type }} • Up to {{ activeRoomDetail.maxOccupants }} Pax</p>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-ink-faint block uppercase font-semibold">Base Rate</span>
            <!-- `rooms` is seeded; 30 of the 33 seeded prices are stale. A rate shown
                 without saying whether it is live is a rate someone will quote. -->
            <span class="font-semibold text-xl text-white"><template v-if="roomsFetchFailed">—</template><template v-else>₱{{ activeRoomDetail.price.toLocaleString() }}</template><span class="text-xs font-normal text-ink-faint">/mo</span></span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 bg-canvas border border-line rounded-xl">
            <p class="text-ink-soft text-[10px] font-semibold uppercase">Monthly Rate</p>
            <p class="text-base font-semibold text-ink mt-0.5">
              <template v-if="roomsFetchFailed">Rate unavailable — refresh to retry</template><template v-else>₱{{ activeRoomDetail.price.toLocaleString() }} <span class="text-xs font-normal text-ink-soft">/ month</span></template>
            </p>
          </div>
          <div class="p-3.5 bg-canvas border border-line rounded-xl flex flex-col justify-between">
            <p class="text-ink-soft text-[10px] font-semibold uppercase">Operational Status</p>
            <div class="mt-0.5">
              <span :class="['badge-soft text-xs capitalize font-semibold', getStatusBadgeClass(activeRoomDetail.status)]">
                {{ activeRoomDetail.status }}
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-1">
          <p class="font-semibold text-ink-soft text-[11px]">Unit Description</p>
          <p class="p-3.5 bg-tile border border-line rounded-xl leading-relaxed text-[#44403c]">
            {{ activeRoomDetail.desc }}
          </p>
        </div>

        <div class="space-y-1.5">
          <p class="font-semibold text-ink-soft text-[11px]">Included Amenities &amp; Fixtures</p>
          <div class="grid grid-cols-2 gap-2 text-xs text-ink bg-canvas p-3.5 border border-line rounded-xl">
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-brand font-semibold" /> Private T&amp;B Bathroom</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-brand font-semibold" /> Kitchenette Sink</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-brand font-semibold" /> Bed Frame / Base</div>
            <div class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5 text-brand font-semibold" /> Submetered Electricity</div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="p-4 px-6 border-t border-line flex items-center justify-end gap-3">
        <button @click="closeModal" class="pill-btn">
          Close Specs
        </button>
      </div>
    </div>
  </div>
</template>
