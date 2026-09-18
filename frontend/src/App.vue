<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, RouterView } from 'vue-router';
import { WifiOff } from 'lucide-vue-next';
import { useToast } from '@/lib/useToast';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
import TicketHoverModal from '@/components/modals/TicketHoverModal.vue';

const route = useRoute();
const { showToast } = useToast();

// Offline network status tracking (BR-031, FR-030)
const isOffline = ref(!navigator.onLine);

function updateOnlineStatus() {
  const wasOffline = isOffline.value;
  isOffline.value = !navigator.onLine;
  if (wasOffline && !isOffline.value) {
    showToast('success', 'Back Online', 'Network connection restored. Authoritative synchronization active.');
  }
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});

const isWorkspaceSection = computed(() => 
  route.path.startsWith('/admin') || route.path.startsWith('/basis') || route.path.startsWith('/tenant')
);

const isPublicPage = computed(() =>
  route.path.startsWith('/public') ||
  route.path.startsWith('/category') ||
  route.path === '/'
);

/**
 * The public routes that draw their own masthead - the landing over its hero,
 * the enquiry page in its own left column, and the category pages in a hairline
 * bar at the top of the screen - so the shared bar would be a second masthead
 * above the first. Still narrower than `isPublicPage`: `/login` has no masthead
 * of its own and keeps `AppHeader`. `/` only redirects to `/public`, so
 * matching it here is belt and braces.
 *
 * THIS COMMENT HAD A PRECONDITION IN IT, AND THE PRECONDITION EXPIRED.
 * Until 2026-09-19 it read "the category and login routes have no masthead of
 * their own and keep AppHeader", which stopped being true the moment
 * `CategoryRoomsView` was rebuilt in the public register and grew one. Read it
 * as a claim with a date on it when the next public route appears.
 *
 * What a signed-in visitor loses on these four routes is the bell and the
 * profile menu, which live in `AppHeader` only. An administrator cannot reach
 * them at all - the router guard in `router/index.ts` sends `/public`,
 * `/category` and `/tenant` back to `/admin/overview` - and a resident who
 * wanders onto the public site has the same experience there as on `/public`
 * and `/inquire` today.
 */
const hidesGlobalHeader = computed(() =>
  route.path === '/public' ||
  route.path === '/' ||
  route.path === '/inquire' ||
  route.path.startsWith('/category')
);
</script>

<template>
  <div
    :class="[
      'min-h-screen text-foreground flex flex-col font-sans selection:bg-primary/10 selection:text-foreground',
      isWorkspaceSection ? 'bg-canvas' : 'bg-background',
    ]"
  >
    <!-- Offline status notification banner (BR-031, System Bible Section 21) -->
    <div 
      v-if="isOffline" 
      class="bg-amber-500 text-slate-900 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 border-b border-amber-600 shadow-xs z-50 sticky top-0"
    >
      <WifiOff class="size-4 shrink-0 text-slate-900" />
      <span>Offline Mode — Viewing cached application resources. Financial mutations and payment updates require an active internet connection (BR-031).</span>
    </div>

    <AppHeader v-if="!hidesGlobalHeader" />
    
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
    <TicketHoverModal />
  </div>
</template>
