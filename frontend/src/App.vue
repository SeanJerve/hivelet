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
    <!--
      No connection (BR-031, System Bible Section 21).

      This was slate text on an amber fill, which is the one colour pairing
      that always reads as washed out - a grey on a saturated background has
      neither the contrast of near-black nor the intent of the fill's own
      darker shade. It is on the verify role now, which is the system's colour
      for "this needs your attention" and is measured against its own text.

      The wording changed too. "Financial mutations" is not a phrase anyone
      says, and the person reading it is a landlady who has just lost signal.
    -->
    <div
      v-if="isOffline"
      role="status"
      class="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-verify-soft bg-verify-soft px-4 py-2.5 text-sm font-medium text-verify"
    >
      <WifiOff class="size-4 shrink-0" aria-hidden="true" />
      <span>
        No connection. You can read what is already loaded, but nothing can be saved or paid
        until it is back.
      </span>
    </div>

    <!--
      The first thing in the document, so it is the first thing in the tab
      order. See `.ws-skip`: a keyboard reader had to walk the whole navigation
      before reaching anything on every page.
    -->
    <a href="#main" class="ws-skip pill-btn-brand">Skip to content</a>

    <AppHeader v-if="!hidesGlobalHeader" />
    
    <!--
      The workspace takes the same `ws-page` the public pages take. It used to
      repeat the measure inline - `max-w-[1600px] mx-auto px-4 sm:px-6` - which
      is the same numbers and a second copy of them, so the two could drift
      apart again exactly as they had before.
    -->
    <div :class="['flex-1 flex w-full', isWorkspaceSection ? 'ws-page' : '']">
      <AppSidebar v-if="isWorkspaceSection" />
      <main
        id="main"
        tabindex="-1"
        :class="['flex-1 max-w-full min-w-0 flex flex-col outline-none', isWorkspaceSection ? 'py-6 lg:pl-6' : '']"
      >
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
    <!--
      `TicketHoverModal` is gone. It was mounted here on every page load and could
      never open: nothing in the codebase set `isTicketHoverModalOpen` or
      `activeHoverTicket` to anything but false/null, so `check:reachable` passed
      it - an import makes a file reachable, not renderable.

      Had it ever been wired up it would have lied. Its "Mark resolved" button
      called `resolveTicket()`, which mutated the in-memory array and made NO API
      call: the pill flipped, the modal closed, the ticket left the open list, and
      the next fetch brought it back unresolved. Same shape as the
      LiveChatheadModal deletion - see the note at RoomDetailModal.vue:11.
    -->
  </div>
</template>
