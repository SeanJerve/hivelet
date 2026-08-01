<!--
  @file App.vue
  @description Main Application Container registering AppHeader, AppSidebar, Viewport, and Modals.
  @systemBibleRef Section 3 & Section 4
-->
<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import TicketHoverModal from '@/components/modals/TicketHoverModal.vue';
import LiveChatheadModal from '@/components/modals/LiveChatheadModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
import TenantLoginModal from '@/components/modals/TenantLoginModal.vue';
import GuestEntryModal from '@/components/modals/GuestEntryModal.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] flex flex-col font-sans antialiased text-[#172b4d]">
    <AppHeader />
    <div class="flex flex-1">
      <AppSidebar />
      <main class="flex-1 p-6 overflow-y-auto">
        <router-view />
      </main>
    </div>

    <!-- MODAL MOUNT POINTS -->
    <RoomDetailModal />
    <AdminEditUnitModal />
    <TicketHoverModal />
    <LiveChatheadModal />
    <OnsitePaymentModal />
    <TenantLoginModal />
    <GuestEntryModal />
    <ToastContainer />
  </div>
</template>
