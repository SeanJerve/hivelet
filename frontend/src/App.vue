<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, RouterView } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
import TenantLoginModal from '@/components/modals/TenantLoginModal.vue';
import GuestEntryModal from '@/components/modals/GuestEntryModal.vue';
import TicketHoverModal from '@/components/modals/TicketHoverModal.vue';

const route = useRoute();

const isWorkspaceSection = computed(() => 
  route.path.startsWith('/admin') || route.path.startsWith('/basis') || route.path.startsWith('/tenant')
);

const isPublicPage = computed(() => 
  route.path.startsWith('/public') || 
  route.path.startsWith('/category') || 
  route.path === '/'
);
</script>

<template>
  <div class="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col font-sans selection:bg-[#0c66e4]/10 selection:text-[#1c1917]">
    <AppHeader />
    
    <div :class="['flex-1 flex w-full', isWorkspaceSection ? 'max-w-[1600px] mx-auto px-4 sm:px-6' : '']">
      <AppSidebar v-if="isWorkspaceSection" />
      <main :class="['flex-1 max-w-full min-w-0 flex flex-col', isWorkspaceSection ? 'py-6 lg:pl-6' : '']">
        <RouterView />
      </main>
    </div>

    <!-- Edge-to-edge full width footer (no left/right/bottom whitespace) -->
    <AppFooter v-if="isPublicPage" />
    
    <!-- Global Modals & Notifications -->
    <ToastContainer />
    <AdminEditUnitModal />
    <RoomDetailModal />
    <OnsitePaymentModal />
    <TenantLoginModal />
    <GuestEntryModal />
    <TicketHoverModal />
  </div>
</template>
