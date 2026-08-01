<script setup lang="ts">
import LoadingScreen from '@/components/common/LoadingScreen.vue';
import AppNavbar from '@/components/layout/AppNavbar.vue';
import MobilePillNavbar from '@/components/layout/MobilePillNavbar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import TicketHoverModal from '@/components/modals/TicketHoverModal.vue';
import LiveChatheadModal from '@/components/modals/LiveChatheadModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] flex flex-col font-sans antialiased text-[#172b4d] relative pb-16 md:pb-0">
    <LoadingScreen />
    <AppNavbar />
    
    <main class="flex-1">
      <router-view />
    </main>

    <AppFooter />
    <MobilePillNavbar />

    <!-- MODAL MOUNT POINTS -->
    <RoomDetailModal />
    <AdminEditUnitModal />
    <TicketHoverModal />
    <LiveChatheadModal />
    <OnsitePaymentModal />
  </div>
</template>
