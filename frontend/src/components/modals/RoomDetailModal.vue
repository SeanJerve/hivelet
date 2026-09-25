<script setup lang="ts">
import { ref, watch } from 'vue';
import { isRoomDetailModalOpen, activeRoomDetail, roomsFetchFailed } from '@/lib/systemState';
import { peso } from '@/lib/canonicalUnits';
import WsModal from '@/components/ui/WsModal.vue';
import StatusPill from '@/components/overview/StatusPill.vue';

function closeModal() {
  isRoomDetailModalOpen.value = false;
}

/** Same reasoning as AdminEditUnitModal's photo: fade in on `@load` rather
 *  than pop in the instant the `src` is set, reset whenever the unit shown
 *  changes so a different room's photo does not inherit "already loaded". */
const isPhotoLoaded = ref(false);
watch(
  () => activeRoomDetail.value?.photo,
  () => {
    isPhotoLoaded.value = false;
  }
);

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

// Matches RoomDirectoryView's `statusTone`/`getStatusLabel` exactly - this
// modal opens FROM that screen's own "Look at" button, for the same unit, so
// a status reading one colour and one word on the card and a different
// colour and word one click later is the same fact disagreeing with itself.
//
// This used to tone maintenance 'overdue' (red) where the directory uses
// 'verify' (amber) - RoomDirectoryView's own comment gives the reason: a unit
// out of action is a waiting state, like a reservation, not a debt. And it
// labelled 'pending' as "Payment pending", which is the exact payment framing
// RoomDirectoryView's comment documents removing ("'pending' comes from
// Reserved, not Owing - no bill is read anywhere on this screen").
function statusTone(status: string) {
  if (status === 'settled' || status === 'occupied') return 'paid' as const;
  if (status === 'pending' || status === 'maintenance') return 'verify' as const;
  // Vacant is a known, factual state, not a gap in the record - 'unentered' is
  // for the latter, which is why AdminEditUnitModal's own occupancy pill uses
  // 'neutral' for the same case.
  return 'neutral' as const;
}

function statusLabel(status: string) {
  if (status === 'settled' || status === 'occupied') return 'Occupied';
  if (status === 'pending') return 'Reserved';
  if (status === 'maintenance') return 'Being repaired';
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
    <!--
      Capped and scrollable on a phone, same reasoning as AdminEditUnitModal's
      form and `OnsitePaymentModal` before it: this dialog's "Close" lives in
      `WsModal`'s footer slot, drawn after the body, so the only way to keep it
      on screen is to stop the body being taller than the screen. A photo, the
      rate, the status list, a billing note and a description routinely run
      past 812px - measured at 375 with a photo present and both optional
      sections filled, the panel reached 993px and "Close" sat entirely below
      the fold with nothing to say there was more to scroll to.

      `dvh` rather than `vh` for the same reason as there: the phone's bars are
      showing when this opens.
    -->
    <div class="flex flex-col gap-5 max-h-[60dvh] overflow-y-auto px-1.5 -mx-1.5 sm:mx-0 sm:max-h-none sm:overflow-visible sm:px-0">
    <div v-if="activeRoomDetail.photo" class="h-52 overflow-hidden rounded-2xl bg-canvas">
      <img
        :src="activeRoomDetail.photo"
        :alt="`Photo of unit ${activeRoomDetail.unitCode.toUpperCase()}`"
        class="size-full object-cover transition-opacity duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
        :class="isPhotoLoaded ? 'opacity-100' : 'opacity-0'"
        @load="isPhotoLoaded = true"
        @error="isPhotoLoaded = true"
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-2xl bg-brand-soft p-5">
        <p class="text-xs text-ink-faint">Monthly rent</p>
        <!-- `rooms` is seeded, and 30 of the 33 seeded prices are stale. A rate
             shown without saying whether it is live is a rate someone quotes. -->
        <p v-if="roomsFetchFailed" class="mt-1 text-sm text-ink-soft">
          The rate could not be loaded, so it is not shown here.
        </p>
        <p v-else class="mt-1 text-3xl font-semibold tabular tracking-tight">
          {{ peso(activeRoomDetail.price) }}
        </p>
      </div>

      <!--
        `min-w-0` on this list is the fix for a real overflow: a grid item will
        not shrink below its min-content width, and at 375 a long resident name
        pushed this list to 359px inside a 303px column, cutting off the
        dialog's right edge.

        The name wraps rather than truncating. At 196px "Maria Fernanda
        Villareal-Gonzales" lost its last word, and a dialog opened to look at
        a unit should show who lives in it in full.
      -->
      <dl class="min-w-0 rounded-2xl border border-line p-5 flex flex-col gap-3 text-sm">
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
          <dd class="min-w-0 break-words text-right font-medium">{{ activeRoomDetail.tenant }}</dd>
        </div>
      </dl>
    </div>

    <div v-if="activeRoomDetail.billingRule">
      <h3 class="text-sm font-semibold">How this unit is billed</h3>
      <p class="mt-1 text-sm leading-6 text-ink-soft">{{ activeRoomDetail.billingRule }}</p>
    </div>

    <!-- `rawDesc`, what is actually stored. `desc` falls back to an invented
         "Studio unit in BH." for a unit with none, which read here as saved. -->
    <div v-if="activeRoomDetail.rawDesc">
      <h3 class="text-sm font-semibold">Description</h3>
      <p class="mt-1 text-sm leading-6 text-ink-soft">{{ activeRoomDetail.rawDesc }}</p>
    </div>

    <!-- The amenity list that used to sit here was the same four lines for all
         33 units, seeded in systemState rather than stored per unit. Nothing in
         the database says which unit has what, so this dialog says nothing. -->
    </div>

    <template #actions>
      <button type="button" class="pill-btn" @click="closeModal">Close</button>
    </template>
  </WsModal>
</template>
