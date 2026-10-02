<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter, RouterView } from 'vue-router';
import { WifiOff } from 'lucide-vue-next';
import { useToast } from '@/lib/useToast';
import { isAuthenticated, mustChangePassword, mustCompleteContact, PASSWORD_CHANGED_FLAG } from '@/lib/authStore';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import ToastContainer from '@/components/ui/ToastContainer.vue';
import AdminEditUnitModal from '@/components/modals/AdminEditUnitModal.vue';
import RoomDetailModal from '@/components/modals/RoomDetailModal.vue';
import OnsitePaymentModal from '@/components/modals/OnsitePaymentModal.vue';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal.vue';
import PullToRefresh from '@/components/layout/PullToRefresh.vue';
import RouteSkeleton from '@/components/layout/RouteSkeleton.vue';
import RefreshSkeleton from '@/components/layout/RefreshSkeleton.vue';
import { pullRefreshing } from '@/lib/pullToRefresh';
import { startLiveUpdates, stopLiveUpdates } from '@/lib/live';
import { isOffline, savedCopySince, savedAtLabel } from '@/lib/offlineCache';

// Every open page stays current while someone is signed in (lib/live.ts).
watch(isAuthenticated, (signedIn) => (signedIn ? startLiveUpdates() : stopLiveUpdates()), { immediate: true });

const route = useRoute();
const router = useRouter();
const { showToast } = useToast();

/**
 * Page transitions run from the second page on, never on opening the app
 * (Sean, 2026-10-01). The first page replaces the placeholder below, which the
 * `<Transition>` would otherwise treat as a navigation and fade in from
 * nothing - a slower first paint for no reason. CSS goes on one frame after
 * the first navigation has settled, by which point that swap has happened.
 */
const animatePages = ref(false);
router.isReady().then(() => requestAnimationFrame(() => (animatePages.value = true)));

/**
 * The header and footer wait for the first navigation (Sean, 2026-10-02).
 * Until it finishes, `route` is the router's START location, path "/", which
 * AppHeader takes for the landing page: white text on a transparent bar, drawn
 * over the pale placeholder below, the "header on an empty page" from his
 * phone. `matched` is empty only then (the catch-all matches every address),
 * and RouteSkeleton holds the screen meanwhile. A first navigation that fails
 * outright (a page's code that would not download) still brings the header
 * back, so there is a way to the rest of the site.
 */
const firstNavigationFailed = ref(false);
router.isReady().catch(() => (firstNavigationFailed.value = true));
const routeResolved = computed(() => route.matched.length > 0 || firstNavigationFailed.value);

/**
 * Hold the leaving page exactly where it was drawn while it fades.
 *
 * `.page-move-leave-active` takes it out of flow with `position: absolute`,
 * and an absolute box with no offsets of its own lands on `<main>`'s padding
 * edge: at `lg` (`pl-6`) the old page jumped 24px left for as long as the new
 * one took to mount - measured up to 400ms with a screencast, Sean 2026-10-01.
 * Measured before the class lands, so this is the in-flow position. Margins
 * are subtracted because `left`/`top` place the margin edge, not the border.
 */
function pinLeavingPage(el: Element) {
  const page = el as HTMLElement;
  const host = page.offsetParent ?? page.parentElement;
  if (!host) return;
  const p = page.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  const cs = getComputedStyle(page);
  page.style.top = `${p.top - h.top - (parseFloat(cs.marginTop) || 0)}px`;
  page.style.left = `${p.left - h.left - (parseFloat(cs.marginLeft) || 0)}px`;
  page.style.width = `${p.width}px`;
}

// Offline network status tracking (BR-031, FR-030). The flag itself lives in lib/offlineCache.ts
// since 2026-10-02 (Sean), so this bar and the write buttons it speaks for read one value.
const savedFrom = computed(() => (savedCopySince.value === null ? '' : savedAtLabel(savedCopySince.value)));
let wasOffline = isOffline.value;

function updateOnlineStatus() {
  const cameBack = wasOffline && navigator.onLine;
  wasOffline = !navigator.onLine;
  /**
   * "Authoritative synchronization active" was the old wording, and nothing
   * behind it did that, so it was cut to "Reload the page if what you see looks
   * out of date". Since 2026-10-02 (Sean) there is a resync: the first read that
   * reaches the server after one that did not reloads every open list and page
   * (lib/live.ts, `setReconnectHandler`), so the toast no longer asks her to.
   */
  if (cameBack) {
    // Not an action of hers, so no ping (Sean, 2026-10-01).
    showToast('success', 'Back online', 'You are connected again.', 4000, { sound: false });
  }
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // The confirmation for a forced password change, carried across the reload
  // that follows it (see ChangePasswordModal.vue).
  // The flag says which parts the forced step saved: '1' the password alone
  // (as before), 'contact' the email and phone alone, 'both' all three.
  try {
    const saved = sessionStorage.getItem(PASSWORD_CHANGED_FLAG);
    if (saved) {
      sessionStorage.removeItem(PASSWORD_CHANGED_FLAG);
      if (saved === 'both') {
        showToast('success', 'All set', 'Your new password, email and phone number are saved.');
      } else if (saved === 'contact') {
        showToast('success', 'Details saved', 'Your email and phone number are saved.');
      } else {
        showToast('success', 'Password changed', 'Your new password is active.');
      }
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
/**
 * Pull-to-refresh hides a page behind skeletons only where data is refetched:
 * the signed-in screens. A public page or the sign-in page has none of its
 * own, and the skeleton under a live header ("Hivelet", "Inquire now", "Sign
 * in") was half a screen (Sean, 2026-10-02: "the whole screen should load").
 * There the page stays as it is while the hexagon turns, then reloads.
 */
const skeletonOnRefresh = computed(() => pullRefreshing.value && isWorkspaceSection.value);

const isPublicPage = computed(() =>
  route.path.startsWith('/public') ||
  route.path.startsWith('/category') ||
  route.path === '/privacy' ||
  route.path === '/terms' ||
  route.path === '/' ||
  route.name === 'NotFound'
);

/**
 * The public routes that draw their own masthead - the enquiry and sign-in
 * pages in their own left column, and the category pages in a hairline bar at
 * the top of the screen - so the shared bar would be a second masthead above
 * the first. The landing (`/public`) keeps `AppHeader`, drawn transparent over
 * its hero; `/` only redirects there.
 *
 * THIS COMMENT HAD A PRECONDITION IN IT, AND THE PRECONDITION EXPIRED.
 * Until 2026-09-19 it read "the category and login routes have no masthead of
 * their own and keep AppHeader", which stopped being true the moment
 * `CategoryRoomsView` was rebuilt in the public register and grew one. Read it
 * as a claim with a date on it when the next public route appears.
 *
 * What a signed-in visitor loses on these routes is the bell and the
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
      'min-h-screen supports-[min-height:100dvh]:min-h-dvh text-foreground flex flex-col font-sans selection:bg-primary/10 selection:text-foreground',
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
    <!--
      The second line is the one notice for the copy saved on this device (lib/offlineCache.ts;
      Sean, 2026-10-02): every page drawing a saved answer used to carry its own note, and the
      tenant pages did, twice over. It also shows on its own when the device is online but the
      server cannot be reached, which is the same state to the reader.
    -->
    <div
      v-if="isOffline || savedFrom"
      role="status"
      class="sticky top-0 z-50 flex flex-col items-center gap-0.5 border-b border-verify-soft bg-verify-soft px-4 py-2.5 text-center text-sm font-medium text-verify"
    >
      <span v-if="isOffline" class="flex items-center justify-center gap-2">
        <WifiOff class="size-4 shrink-0" aria-hidden="true" />
        <span>
          No connection. You can read what is already loaded, but nothing can be saved or paid
          until it is back.
        </span>
      </span>
      <span v-if="savedFrom" class="flex items-center justify-center gap-2" data-saved-copy-notice>
        <WifiOff v-if="!isOffline" class="size-4 shrink-0" aria-hidden="true" />
        <span>Saved figures from {{ savedFrom }}</span>
      </span>
    </div>

    <!--
      The first thing in the document, so it is the first thing in the tab
      order. See `.ws-skip`: a keyboard reader had to walk the whole navigation
      before reaching anything on every page.
    -->
    <!-- A plain text link, not a button (Sean, 2026-09-30); it still appears only on Tab. -->
    <a href="#main" class="ws-skip bg-canvas px-2 py-1 text-sm text-ink underline underline-offset-4 decoration-1">Skip to content</a>

    <AppHeader v-if="routeResolved && !hidesGlobalHeader" />
    
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
        :class="['relative flex-1 max-w-full min-w-0 flex flex-col outline-none', isWorkspaceSection ? 'py-6 lg:pl-6' : '', skeletonOnRefresh && 'ptr-busy']"
      >
        <!--
          Pages used to swap with no transition at all - one screen replaced
          by the next in a single frame, the same jump cut a broken load
          would produce. `mode="out-in"` is deliberately NOT used: it waits
          for the old page to finish leaving before the new one starts
          entering, which is the "page-load choreography" Operate surfaces
          are told to avoid - every navigation would cost the sum of both
          durations instead of the longer of the two. This crossfades both
          ways at once, and the new page rises 8px as it arrives (Sean,
          2026-10-01). See `.page-move` in index.css for the timing, why it
          is keyframes rather than transitions, and the reduced-motion path.

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
        <!--
          The placeholder holds the page open to the full screen height until
          the first route's code has arrived. Without it `<main>` was EMPTY for
          the length of that download (0.75 s at a 4x-throttled CPU), the footer
          sat in view at the top of an empty page, and the page then arriving
          shoved it 466 px down: Lighthouse measured that one jump as a layout
          shift of 0.50 on every desktop run of the landing page (0.1 is the
          "good" line), 2026-09-30. With the space held, the footer starts below
          the fold and nothing visible moves. It exists only before the first
          page renders; later navigations always have a component.

          Since 2026-10-02 (Sean) it is RouteSkeleton, the shape of the page on
          its way, rather than an empty pale box with the header over it.
        -->
        <RouterView v-slot="{ Component }">
          <Transition name="page-move" :css="animatePages" @before-leave="pinLeavingPage">
            <component :is="Component" v-if="Component" />
            <RouteSkeleton v-else />
          </Transition>
        </RouterView>
        <!-- While a pull-to-refresh refetches, the page stays mounted (it takes the fresh
             answers) but is hidden - `ptr-busy` on <main> - behind this (Sean, 2026-10-02). -->
        <RefreshSkeleton v-if="skeletonOnRefresh" />
      </main>
    </div>

    <!-- Edge-to-edge full width footer (no left/right/bottom whitespace) -->
    <AppFooter v-if="routeResolved && isPublicPage" />
    
    <!-- Global Modals & Notifications -->
    <ToastContainer />
    <!-- Pull down to reload, installed app only (Sean, 2026-10-01; lib/pullToRefresh.ts). -->
    <PullToRefresh />
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
    <!--
      Since 2026-09-30 the same step also asks a tenant for a real email and to
      confirm their phone (`mustCompleteContact`): always alongside a starting
      password, and on its own while their email is a placeholder (migration
      067). The dialog decides which fields to show from the same two flags.
    -->
    <ChangePasswordModal
      :open="isAuthenticated && (mustChangePassword || mustCompleteContact)"
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
