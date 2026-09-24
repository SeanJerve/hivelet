<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, RouterView } from 'vue-router';
import { WifiOff } from 'lucide-vue-next';
import { useToast } from '@/lib/useToast';
import { isAuthenticated, mustChangePassword, PASSWORD_CHANGED_FLAG } from '@/lib/authStore';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal.vue';

const route = useRoute();
const { showToast } = useToast();

// Offline network status tracking (BR-031, FR-030)
const isOffline = ref(!navigator.onLine);

function updateOnlineStatus() {
  const wasOffline = isOffline.value;
  isOffline.value = !navigator.onLine;
  /**
   * "Authoritative synchronization active" was the old wording, and nothing
   * behind it did that. `isOffline` is read nowhere else in the app - checked
   * with a grep across every `.vue` and `.ts` file - so reconnecting triggers
   * no refetch, no resync, nothing beyond this toast and the banner going
   * away. Whatever was on screen when the connection dropped stays exactly
   * that stale until the reader navigates or reloads by hand.
   *
   * That is a real gap worth having, not papering over: the honest fix is
   * either build the resync this claimed, or stop claiming it. Given nothing
   * elsewhere in the app currently listens for reconnection, claiming it here
   * would be the exact shape of defect this project keeps finding - a screen
   * asserting a fact the system does not hold, on the one word ("authoritative")
   * a reader would take most literally if it mattered to them.
   */
  if (wasOffline && !isOffline.value) {
    showToast('success', 'Back online', 'You are connected again. Reload the page if what you see looks out of date.');
  }
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // The confirmation for a forced password change, carried across the reload
  // that follows it (see ChangePasswordModal.vue).
  try {
    if (sessionStorage.getItem(PASSWORD_CHANGED_FLAG)) {
      sessionStorage.removeItem(PASSWORD_CHANGED_FLAG);
      showToast('success', 'Password changed', 'Your new password is active.');
    }
  } catch {
    // Storage blocked: nothing to show.
  }
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});

const isWorkspaceSection = computed(() => 
  route.path.startsWith('/admin') || route.path.startsWith('/basis') || route.path.startsWith('/tenant')
);

/**
 * Where AppFooter renders. `/privacy` and `/terms` joined on 2026-09-24: the footer is where a
 * reader finds the other document, and the privacy page was the one public page that ended in
 * nothing. `/inquire` and `/login` stay out on purpose - both are drawn one screen tall - so
 * they link the documents from their own text: InquireView beside the form's submit button.
 */
const isPublicPage = computed(() =>
  route.path.startsWith('/public') ||
  route.path.startsWith('/category') ||
  route.path === '/privacy' ||
  route.path === '/terms' ||
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
  route.path === '/inquire' ||
  route.path === '/login' ||
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
    <div :class="['flex-1 flex w-full', isWorkspaceSection ? 'ws-page ws-workspace' : '']">
      <AppSidebar v-if="isWorkspaceSection" />
      <main
        id="main"
        tabindex="-1"
        :class="['relative flex-1 max-w-full min-w-0 flex flex-col outline-none', isWorkspaceSection ? 'py-6 lg:pl-6' : '']"
      >
        <!--
          Pages used to swap with no transition at all - one screen replaced
          by the next in a single frame, the same jump cut a broken load
          would produce. `mode="out-in"` is deliberately NOT used: it waits
          for the old page to finish leaving before the new one starts
          entering, which is the "page-load choreography" Operate surfaces
          are told to avoid - every navigation would cost the sum of both
          durations instead of the longer of the two. This crossfades both
          ways at once, opacity only. See `.page-move` in index.css for the
          timing and the reduced-motion path.

          ⚠ `relative` ON `<main>` ABOVE IS LOAD-BEARING, AND ITS ABSENCE IS
          WHAT MADE NAVIGATION LOOK BROKEN.

          Because both pages are in the DOM at once, `.page-move-leave-active`
          takes the leaving one out of flow with `position: absolute` so the
          two do not stack and double the page height. Absolute positioning
          resolves against the nearest POSITIONED ancestor, and this element
          had none - so the leaving page was positioned against the initial
          containing block instead, jumping to the top-left of the viewport
          and fading out across the header and sidebar. Every navigation
          flashed a copy of the previous screen in the wrong place.

          The CSS was right and had been since it was written; it was resting
          on a precondition nothing in this file supplied. Read the two
          together - the rule in index.css does not work without this class.
        -->
        <!--
          No `:key` on the route path. That would force every param-only
          navigation (a category slug changing under `/category/:slug`) to
          remount its component, which is a heavier, separate decision this
          motion pass is not making - some of those views watch their route
          param instead of expecting a fresh mount. Without a key, Vue still
          fires the transition on every actual PAGE change, because that is
          a different component; a param change inside the same page stays
          instant, which is correct for a filter, not a navigation.
        -->
        <RouterView v-slot="{ Component }">
          <Transition name="page-move">
            <component :is="Component" />
          </Transition>
        </RouterView>
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
      B-53: a resident (or the administrator) signed in on a one-time password
      cannot reach anything else on the site until they replace it. Mounted
      here rather than inside AppHeader's own ChangePasswordModal instance
      (the voluntary one, from the account menu) because AppHeader itself is
      hidden on several public routes (`hidesGlobalHeader` above) - this gate
      has to hold regardless of which page a freshly-signed-in account lands
      on, not just the ones that happen to render a header.
    -->
    <ChangePasswordModal
      :open="isAuthenticated && mustChangePassword"
      mandatory
      @close="() => {}"
    />
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
