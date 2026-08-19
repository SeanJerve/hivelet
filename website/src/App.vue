<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { setAuthFailureHandler } from '@/lib/api';
import { handleAuthFailure } from '@/lib/authStore';
import LoadingScreen from '@/components/common/LoadingScreen.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import AppNavbar from '@/components/layout/AppNavbar.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import MobilePillNavbar from '@/components/layout/MobilePillNavbar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import TicketHoverModal from '@/components/modals/TicketHoverModal.vue';
import LiveChatheadModal from '@/components/modals/LiveChatheadModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
import SecondaryConfirmModal from '@/components/modals/SecondaryConfirmModal.vue';
import EditPaymentModal from '@/components/modals/EditPaymentModal.vue';
import EditExpenseModal from '@/components/modals/EditExpenseModal.vue';
import InquiryModal from '@/components/modals/InquiryModal.vue';

const route = useRoute();
const router = useRouter();
const isMobileSidebarOpen = ref(false);

const isWorkspaceRoute = computed(() => {
  return route.path.startsWith('/admin') || route.path.startsWith('/tenant');
});

// The login screen renders its own full-height layout.
const isAuthRoute = computed(() => route.path === '/login');

/**
 * Signs the user out when the API rejects the stored token — an expired
 * session, or an account deactivated since sign-in (BR-025). Without this the
 * UI would keep rendering an admin shell whose every request returns 401.
 */
onMounted(() => {
  setAuthFailureHandler(() => {
    handleAuthFailure();
    if (route.meta.roles) {
      void router.replace({
        path: '/login',
        query: { reason: 'Your session ended. Please sign in again.' },
      });
    }
  });
});
</script>

<template>
  <div class="min-h-screen bg-[#f4f5f7] flex flex-col font-sans antialiased text-[#172b4d] relative pb-16 md:pb-0">
    <LoadingScreen />
    <ToastContainer />
    <AppNavbar />
    
    <!-- Main Content Container with AppSidebar for Admin & Tenant Workspace Routes -->
    <div class="flex flex-1 relative w-full">
      <AppSidebar 
        v-if="isWorkspaceRoute"
        :isMobileSidebarOpen="isMobileSidebarOpen"
        @closeMobileSidebar="isMobileSidebarOpen = false"
      />

      <main :class="['flex-1 overflow-y-auto w-full', isWorkspaceRoute ? 'p-4 sm:p-6 lg:p-8' : '']">
        <router-view />
      </main>
    </div>

    <AppFooter v-if="!isWorkspaceRoute && !isAuthRoute" />
    <MobilePillNavbar v-if="!isAuthRoute" />

    <!-- MODAL MOUNT POINTS -->
    <RoomDetailModal />
    <AdminEditUnitModal />
    <TicketHoverModal />
    <LiveChatheadModal />
    <OnsitePaymentModal />
    <SecondaryConfirmModal />
    <EditPaymentModal />
    <EditExpenseModal />
    <InquiryModal />
  </div>
</template>

