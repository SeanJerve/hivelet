<script setup lang="ts">
import { isRoomDetailModalOpen, activeRoomDetail, roomsFetchFailed } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import WsModal from '@/components/ui/WsModal.vue';
import StatusPill from '@/components/overview/StatusPill.vue';

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

function statusTone(status: string) {
  if (status === 'settled' || status === 'occupied') return 'paid' as const;
  if (status === 'pending') return 'verify' as const;
  if (status === 'maintenance') return 'overdue' as const;
  return 'unentered' as const;
}

function statusLabel(status: string) {
  if (status === 'settled' || status === 'occupied') return 'Occupied';
  if (status === 'pending') return 'Payment pending';
  if (status === 'maintenance') return 'Under maintenance';
  return 'Vacant';
}
</script>

<template>
  <WsModal
    v-if="isRoomDetailModalOpen && activeRoomDetail"
    :title="`Unit ${activeRoomDetail.unitCode.toUpperCase()}`"
    :subtitle="`${activeRoomDetail.cluster}, ${activeRoomDetail.floorLabel || `floor ${activeRoomDetail.floor}`}`"
    size="lg"
    @close="closeModal"
  >
    <div v-if="activeRoomDetail.photo" class="h-52 overflow-hidden rounded-2xl">
      <img
        :src="activeRoomDetail.photo"
        :alt="`Photo of unit ${activeRoomDetail.unitCode.toUpperCase()}`"
        class="size-full object-cover"
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-2xl bg-brand-soft p-5">
        <p class="text-xs text-ink-faint">Monthly rate</p>
        <!-- `rooms` is seeded, and 30 of the 33 seeded prices are stale. A rate
             shown without saying whether it is live is a rate someone quotes. -->
        <p v-if="roomsFetchFailed" class="mt-1 text-sm text-ink-soft">
          The rate could not be loaded, so it is not shown here.
        </p>
        <p v-else class="mt-1 text-3xl font-semibold tabular tracking-tight">
          {{ peso(activeRoomDetail.price) }}
          <span class="text-sm font-normal text-ink-soft">/ month</span>
        </p>
      </div>

      <dl class="rounded-2xl border border-line p-5 flex flex-col gap-3 text-sm">
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Status</dt>
          <dd><StatusPill :tone="statusTone(activeRoomDetail.status)">{{ statusLabel(activeRoomDetail.status) }}</StatusPill></dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Type</dt>
          <dd class="font-medium">{{ activeRoomDetail.type }}</dd>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Sleeps up to</dt>
          <dd class="font-medium tabular">{{ activeRoomDetail.maxOccupants }}</dd>
        </div>
        <div v-if="activeRoomDetail.tenant" class="flex items-baseline justify-between gap-3">
          <dt class="text-ink-soft">Resident</dt>
          <dd class="font-medium truncate">{{ activeRoomDetail.tenant }}</dd>
        </div>
      </dl>
    </div>

    <div v-if="activeRoomDetail.billingRule">
      <h3 class="text-sm font-semibold">How this unit is billed</h3>
      <p class="mt-1 text-sm leading-6 text-ink-soft">{{ activeRoomDetail.billingRule }}</p>
    </div>

    <div v-if="activeRoomDetail.desc">
      <h3 class="text-sm font-semibold">Description</h3>
      <p class="mt-1 text-sm leading-6 text-ink-soft">{{ activeRoomDetail.desc }}</p>
    </div>

    <!-- The amenity list that used to sit here was the same four lines for all
         33 units, seeded in systemState rather than stored per unit. Nothing in
         the database says which unit has what, so this dialog says nothing. -->

    <template #actions>
      <button type="button" class="pill-btn" @click="closeModal">Close</button>
    </template>
  </WsModal>
</template>
