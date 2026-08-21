<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, RouterView } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
import LiveChatheadModal from '@/components/modals/LiveChatheadModal.vue';
import TenantLoginModal from '@/components/modals/TenantLoginModal.vue';
import GuestEntryModal from '@/components/modals/GuestEntryModal.vue';
import TicketHoverModal from '@/components/modals/TicketHoverModal.vue';

const route = useRoute();
const isAdminSection = computed(() => 
  route.path.startsWith('/admin') || route.path.startsWith('/basis')
);
</script>

<template>
  <div class="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col font-sans selection:bg-[#f59e0b]/20 selection:text-[#1c1917]">
    <AppHeader />
    
    <div class="flex-1 flex w-full max-w-[1600px] mx-auto px-4 sm:px-6">
      <AppSidebar v-if="isAdminSection" />
      <main :class="['flex-1 py-6 overflow-y-auto max-w-full min-w-0', isAdminSection ? 'lg:pl-6' : '']">
        <RouterView />
      </main>
    </div>
    
    <!-- Global Modals & Notifications -->
    <ToastContainer />
    <AdminEditUnitModal />
    <RoomDetailModal />
    <OnsitePaymentModal />
    <LiveChatheadModal />
    <TenantLoginModal />
    <GuestEntryModal />
    <TicketHoverModal />
  </div>
</template>
