<script setup lang="ts">
/**
 * @file components/layout/AppHeader.vue
 * @description Borderless transparent navigation header with editorial section navigation,
 *              authenticated notification center, and role actions.
 * @systemBibleRef Section 1 - Product Identity, Section 4 - Public Visitor Role & Section 16 - Notifications
 * @rationale Renders transparently across public landing and role workspaces to harmonize with
 *            the canvas background and hero imagery. Features a light green divider (border-line)
 *            matching the exact content width of the navbar elements to anchor the header cleanly
 *            above workspace content.
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isMobileSidebarOpen } from '@/lib/systemState';
import { 
  currentUser, 
  isAuthenticated, 
  isAdmin, 
  isTenant, 
  logout 
} from '@/lib/authStore';
/**
 * The notification centre.
 *
 * This import, the bell, the badge and the heartbeat were removed from this file
 * on 2026-08-26 by `8a34ec9` - a commit titled "complete UI visual audit,
 * speed-dial FABs, smooth transitions, and header harmonization". Nothing in
 * that message mentions notifications, and the `@description` above was left
 * describing an "authenticated notification center" the markup no longer had.
 *
 * For the twenty days that followed, `notificationService` went on writing rows
 * on five events and seven endpoints went on serving them, to a surface no route
 * could reach. On 2026-09-15 the table held 20 rows and every one was unread,
 * because nothing in the product was capable of reading one.
 *
 * Restored 2026-09-15. Keep this wiring when the header is restyled.
 */
import {
  unreadCount,
  hasEmergencyUnread,
  urgentUnreadCount,
  isPopoverOpen,
  notificationsFetchFailed,
  startNotificationsHeartbeat,
  stopNotificationsHeartbeat
} from '@/lib/notificationsStore';
import NotificationPopover from './NotificationPopover.vue';
import { Menu, LogOut, LogIn, User, Bell, ChevronDown, Lock, Globe, LayoutDashboard } from 'lucide-vue-next';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal.vue';

const route = useRoute();
const router = useRouter();
const isMobilePublicNavOpen = ref(false);
const isProfilePopoverOpen = ref(false);

/** Honorifics are not names. "Mrs. Fe Galang Da Silva" was initialled "MS". */
const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'engr', 'atty', 'sr', 'jr', 'prof']);

const userInitials = computed(() => {
  const name = currentUser.value?.fullName || 'User';
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((w) => w && !HONORIFICS.has(w.replace(/\./g, '').toLowerCase()));
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase();
});

const userRoleLabel = computed(() => {
  if (isAdmin.value) return 'Admin';
  if (isTenant.value) return 'Tenant';
  return 'Guest';
});

const isAdminRoute = computed(() => 
  route.path.startsWith('/admin') || route.path.startsWith('/basis')
);

const isTenantRoute = computed(() => 
  route.path.startsWith('/tenant')
);

const isPublicRoute = computed(() =>
  route.path.startsWith('/public') ||
  route.path.startsWith('/category') ||
  route.path === '/'
);

/**
 * Where a sidebar actually exists to be toggled.
 *
 * The workspace hamburger was gated on `!isPublicRoute`, which is NOT the same
 * set of routes `App.vue` mounts `AppSidebar` on. `/privacy` is in neither set:
 * it is not a public route by this file's definition, so the button rendered,
 * and it is not a workspace section, so `AppSidebar` was never in the document
 * for `isMobileSidebarOpen` to open. Measured on an emulated handset at 375px -
 * a 36x36 hamburger at (16, 14) that does nothing at all when tapped.
 *
 * Mirrors `isWorkspaceSection` in App.vue. If a fifth route ever grows a
 * sidebar, these two have to move together.
 */
const hasSidebar = computed(() => isAdminRoute.value || isTenantRoute.value);

const isLandingPage = computed(() =>
  route.path === '/' || route.path === '/public'
);

const brandRoute = computed(() => {
  if (isAdmin.value || isAdminRoute.value) return '/admin/overview';
  if (isTenant.value || isTenantRoute.value) return '/tenant';
  return '/public';
});

function toggleSidebar() {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
}

function toggleNotifications() {
  isPopoverOpen.value = !isPopoverOpen.value;
}

/**
 * The bell says how many are waiting and whether any is an emergency, so that
 * reading does not depend on seeing the red dot.
 */
/**
 * The urgent figure is COUNTED, and it is not called an emergency.
 *
 * This read `hasEmergencyUnread ? '…, one of them an emergency' : …` - a count
 * asserted from a boolean, and the wrong word for it. The flag is true for
 * Emergency **or High**, so four High notifications were announced as an
 * emergency; and "one" was hardcoded, so the administrator with 2 Emergency and
 * 4 High unread (read live, 2026-09-19) was told there was one of them.
 *
 * This label is the whole information for anyone not looking at the red dot -
 * the comment above says so - which makes a wrong number in it a wrong fact,
 * not a wording preference.
 */
const notificationsLabel = computed(() => {
  // A failed load is not "none unread": the count is 0 because nothing
  // arrived, which is the false zero the panel itself stopped showing (342513a).
  if (notificationsFetchFailed.value && unreadCount.value === 0) {
    return 'Notifications, could not be loaded';
  }
  if (unreadCount.value === 0) return 'Notifications, none unread';
  const count = `${unreadCount.value} unread`;
  const urgent = urgentUnreadCount.value;
  if (urgent === 0) return `Notifications, ${count}`;
  return urgent === 1
    ? `Notifications, ${count}, one needing urgent attention`
    : `Notifications, ${count}, ${urgent} needing urgent attention`;
});

/**
 * The account menu opens on click, not on hover.
 *
 * It used to do both, and the two fought each other: moving the pointer onto
 * the avatar opened the menu, and the click that followed toggled it shut
 * again, so a click appeared to do nothing at all. Hover also gives a touch
 * screen no way in. One trigger, one behaviour.
 */
const profileMenu = ref<HTMLElement | null>(null);

function closeProfileMenu() {
  isProfilePopoverOpen.value = false;
}

function onProfileKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isProfilePopoverOpen.value) {
    closeProfileMenu();
    (document.querySelector('[data-account-trigger]') as HTMLElement | null)?.focus();
  }
}

// Tab past "Sign out" left the menu open over the page it had moved on to.
function onProfileFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null;
  if (next && !profileMenu.value?.contains(next)) closeProfileMenu();
}

function onProfilePointerDown(e: PointerEvent) {
  if (!isProfilePopoverOpen.value) return;
  const target = e.target as Node;
  if (profileMenu.value?.contains(target)) return;
  closeProfileMenu();
}

onMounted(() => {
  window.addEventListener('keydown', onProfileKeyDown);
  document.addEventListener('pointerdown', onProfilePointerDown);
});

/**
 * `POST /auth/change-password` worked for months with nothing calling it, so
 * there was no way to change a password from inside the product at all - and
 * every tenant was onboarded on the same shared literal.
 */
const isChangePasswordOpen = ref(false);

function openChangePassword() {
  isProfilePopoverOpen.value = false;
  isChangePasswordOpen.value = true;
}

async function handleSignOut() {
  isProfilePopoverOpen.value = false;
  // Stop polling before the token goes away, or the next tick fires a 401.
  stopNotificationsHeartbeat();
  await logout();
  router.push('/login');
}

/**
 * The poll follows the session, not the component. `immediate` matters: the
 * header mounts once, and a page reload restores an authenticated session
 * without ever transitioning false -> true.
 */
watch(
  () => isAuthenticated.value,
  (authed) => {
    if (authed) {
      startNotificationsHeartbeat();
    } else {
      stopNotificationsHeartbeat();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  stopNotificationsHeartbeat();
  window.removeEventListener('keydown', onProfileKeyDown);
  document.removeEventListener('pointerdown', onProfilePointerDown);
});
</script>

<template>
  <!--
    `ws-focus` on the whole header, not only the bell and the account menu, so
    the wordmark, the nav links and the menu buttons get the same 3px ring as
    every other control instead of the browser's default. On the landing hero
    the brand group and the nav are `on-dark`, which turns that ring light: an
    ink ring on the photograph could not be seen. Only those two, not the whole
    row, because the account menu and the notification popover open as white
    tiles inside it, where a light ring would vanish instead.
  -->
  <header
    :class="[
      'ws-focus w-full transition-colors duration-150',
      isLandingPage
        ? 'absolute top-0 inset-x-0 z-40 bg-transparent border-none'
        : 'ws-glass sticky top-0 z-40 bg-canvas/90 backdrop-blur-sm border-none'
    ]"
  >
    <!--
      `ws-page` rather than the measure spelled out again: the header's edges
      have to line up with the page content under it, and they only stay lined
      up if both read the same class.
    -->
    <!--
      `min-h-16 flex-wrap`, not `h-16`. At 200% text on a 375px phone (WCAG
      1.4.4) the row's contents - menu button, wordmark, Sign In - measured
      about 500px against a 343px row, and the Sign In pill ran to x=411 where
      `body`'s overflow-x: hidden cut it off. It now wraps to a second line
      instead. At normal size everything fits on one 64px line, so nothing
      moves.
    -->
    <div
      :class="[
        'ws-page flex min-h-16 flex-wrap items-center justify-between relative',
        // The workspace's 1600px measure (index.css), so the header lines up
        // with the capped content under it. The public site stays full width.
        hasSidebar && 'ws-workspace',
      ]"
    >
      
      <!-- Left: Mobile Menu Toggle & Brand Logo -->
      <div class="flex items-center gap-3" :class="isLandingPage && 'on-dark'">
        <!--
          Workspace Mobile Menu Toggle. `hasSidebar`, not `!isPublicRoute` -
          see the note on that computed.

          `p-3 -ml-1`, not `p-2`: `p-2` around a `size-5` icon is a 36x36 tap
          target, measured on an emulated handset. `p-3` makes it 44, and the
          negative margin puts the icon back on the page gutter it was already
          aligned to, so nothing moves on screen but the box that answers a
          thumb.
        -->
        <button
          v-if="hasSidebar"
          @click="toggleSidebar"
          class="press flex lg:hidden -ml-1 p-3 rounded-xl text-ink-soft hover:bg-tile hover:text-ink cursor-pointer"
          aria-label="Toggle navigation"
          :aria-expanded="isMobileSidebarOpen"
          aria-controls="workspace-mobile-nav"
        >
          <Menu class="size-5" aria-hidden="true" />
        </button>

        <!--
          Public Mobile Menu Toggle. Same 36 -> 44 as above. `aria-expanded`
          so a screen reader hears whether the drawer is open; the drawer is a
          `v-if`, so `aria-controls` names an element only while it exists,
          which is allowed when `aria-expanded` is false.
          Not on the landing page: its two links sit in the bar at every width.
        -->
        <button
          v-if="isPublicRoute && !isLandingPage"
          @click="isMobilePublicNavOpen = !isMobilePublicNavOpen"
          class="press flex md:hidden -ml-1 p-3 rounded-xl cursor-pointer"
          :class="isLandingPage ? 'text-white hover:bg-white/10' : 'text-ink-soft hover:bg-tile hover:text-ink'"
          aria-label="Toggle navigation menu"
          :aria-expanded="isMobilePublicNavOpen"
          aria-controls="public-mobile-nav"
        >
          <Menu class="size-5" aria-hidden="true" />
        </button>

        <!--
          `min-h-11`: the wordmark's box was `text-xl`'s 28px line, and it is
          the way home from every page. It is already centred in the 64px bar, so growing
          the box around the text moves nothing on screen.
        -->
        <router-link :to="brandRoute" class="press flex min-h-11 items-center gap-2 group">
          <span
            class="font-display font-semibold text-xl tracking-tight transition-colors"
            :class="isLandingPage ? 'text-white drop-shadow-sm group-hover:text-white/80' : 'text-ink group-hover:text-brand'"
          >
            Hivelet
          </span>
        </router-link>
      </div>

      <!-- Right: Public Quick Navigation (Desktop) -->
      <!--
        The links are `inline-flex min-h-11 items-center` rather than `py-1`
        around a 19px line: 27px targets before. Centred in the same bar, so
        the text sits where it did, and the comma still meets them on the
        baseline because an inline-flex box takes its first line's baseline.
      -->
      <!--
        On the landing page this shows at every width, phones included: the
        same two underlined links, not a menu button that drops them down
        (asked for the phone to match the desktop, 2026-09-25).
      -->
      <nav
        v-if="isPublicRoute"
        class="items-center ml-auto"
        :class="isLandingPage ? 'flex on-dark' : 'hidden md:flex'"
      >
        <!-- Landing page: Editorial underlined links matching reference photo -->
        <template v-if="isLandingPage">
          <div class="flex flex-wrap items-baseline justify-end text-[0.8rem] font-light drop-shadow-sm text-white">
            <RouterLink
              to="/inquire"
              class="press inline-flex min-h-11 items-center underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white transition-colors text-white"
            >
              Inquire now
            </RouterLink>
            <template v-if="!isAuthenticated">
              <span aria-hidden="true" class="pr-2 text-white">,</span>
              <RouterLink
                to="/login"
                class="press inline-flex min-h-11 items-center underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white transition-colors text-white"
              >
                Sign in
              </RouterLink>
            </template>
          </div>
        </template>
        <!-- Other public routes (fallback) -->
        <template v-else>
          <div class="flex items-center gap-1 sm:gap-2">
            <RouterLink
              to="/inquire"
              class="press inline-flex min-h-11 items-center px-3.5 rounded-xl text-xs sm:text-sm font-semibold text-ink hover:text-brand hover:bg-tile cursor-pointer"
            >
              Inquire now
            </RouterLink>
          </div>
        </template>
      </nav>

      <!-- Right: User Profile & Sign In / Out -->
      <div
        v-if="(isAuthenticated && currentUser) || (route.path !== '/login' && !isLandingPage)"
        class="flex items-center gap-2 sm:gap-3 ml-4 sm:ml-6"
      >

        <!-- Authenticated User Profile & Dropdown Avatar -->
        <template v-if="isAuthenticated && currentUser">
          <!-- Notification Bell + Popover. Restored 2026-09-15; see the note on the import. -->
          <div class="ws-focus relative">
            <!--
              No `size-10` here. It overrode `.icon-btn`'s own 2.75rem down to
              40px, under the 44 every other control in this system keeps, on
              the one header control a resident taps from a phone. `relative`
              is the load-bearing part - the unread badge is positioned
              against this button.
            -->
            <button
              data-notifications-trigger
              @click="toggleNotifications"
              class="icon-btn relative transition-colors"
              :class="[
                isLandingPage
                  ? 'border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30'
                  // Both `bg-tile` and Tailwind's `white` are #ffffff, so a
                  // `hover:bg-white` here was a no-op - the pill is already
                  // white and stays white on hover. `.icon-btn`'s own hover
                  // rule (border-color shift to --hatch) is the real feedback.
                  : 'bg-tile text-ink',
                isPopoverOpen && (isLandingPage ? 'bg-white/25 text-white' : 'bg-tile text-ink')
              ]"
              :aria-label="notificationsLabel"
              :aria-expanded="isPopoverOpen"
            >
              <Bell class="size-5" aria-hidden="true" />

              <!--
                The count is a second reading of what the label already says, so
                nobody depends on seeing the colour to know something is urgent.

                `-right-1 -top-1`, not `right-1 top-1`. A positive inset tucks
                the badge INSIDE the button's own circle, where it overlaps the
                bell rather than marking its corner - a badge worth noticing
                sits astride the edge of what it is attached to, half in and
                half out, the way an unread count does everywhere else.
              -->
              <!--
                A count appearing or clearing used to be an instant `v-if`
                snap - the one badge in the header a reader is meant to notice
                arriving, with no arrival at all. Named properties, ease-out
                both ways, exit quicker than entry: closing "Mark all read"
                and watching the badge vanish is the reader confirming their
                own action, not something worth lingering on.
              -->
              <Transition
                enter-active-class="transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                enter-from-class="opacity-0 scale-50"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition-[opacity,transform] duration-100 ease-[cubic-bezier(0.23,1,0.32,1)]"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-50"
              >
                <span
                  v-if="unreadCount > 0"
                  class="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-xs font-semibold ring-2 ring-canvas"
                  :class="hasEmergencyUnread ? 'bg-overdue text-white' : 'bg-brand text-on-brand'"
                  aria-hidden="true"
                >
                  {{ unreadCount > 99 ? '99+' : unreadCount }}
                </span>
              </Transition>
            </button>

            <NotificationPopover />
          </div>

          <!-- The account menu. Opens on click; see the note in the script. -->
          <!-- A disclosure, not `aria-haspopup`: that promises an ARIA menu
               with arrow-key movement, and these are plain links and buttons. -->
          <div ref="profileMenu" class="ws-focus relative py-1" @focusout="onProfileFocusOut">
            <button
              data-account-trigger
              @click="isProfilePopoverOpen = !isProfilePopoverOpen"
              class="group press flex cursor-pointer items-center gap-1.5 rounded-full p-1"
              :class="isLandingPage ? 'hover:bg-white/10' : 'hover:bg-tile/80'"
              :aria-label="`Account menu for ${isTenant ? currentUser.fullName : 'the administrator'}`"
              :aria-expanded="isProfilePopoverOpen"
              aria-controls="account-menu"
            >
              <span
                class="grid size-9 place-items-center rounded-full bg-brand text-xs font-semibold text-on-brand"
                aria-hidden="true"
              >
                {{ userInitials }}
              </span>
              <ChevronDown
                :class="[
                  'size-3.5 transition-transform duration-200 ease-[var(--ease-out)]',
                  isLandingPage ? 'text-white/70' : 'text-ink-soft',
                  isProfilePopoverOpen && 'rotate-180'
                ]"
                aria-hidden="true"
              />
            </button>

            <!--
              Named properties rather than `all`, so nothing but opacity and
              transform is animated, and ease-out both ways. `ease-in` on the
              way out starts slow, which reads as the menu being reluctant to
              close. The exit is also shorter than the entrance: a person
              closing a menu has already decided.
            -->
            <Transition
              enter-active-class="transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
              enter-from-class="opacity-0 -translate-y-2 scale-95"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
              leave-from-class="opacity-100 translate-y-0 scale-100"
              leave-to-class="opacity-0 -translate-y-2 scale-95"
            >
              <div
                v-if="isProfilePopoverOpen"
                id="account-menu"
                class="absolute right-0 top-14 z-50 w-72 origin-top-right overflow-hidden rounded-tile bg-tile shadow-lift sm:w-80"
              >
                <!-- Who is signed in, read left to right like everything else. -->
                <div class="flex items-center gap-3 border-b border-line p-5">
                  <span
                    class="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-on-brand"
                    aria-hidden="true"
                  >
                    {{ userInitials }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-ink">
                      {{ currentUser.fullName || 'Administrator' }}
                    </p>
                    <p class="truncate text-xs text-ink-soft">{{ currentUser.email }}</p>
                    <p class="mt-1 text-xs font-semibold text-brand">
                      {{ isTenant ? 'Tenant' : 'Owner' }}
                    </p>
                  </div>
                </div>

                <div class="space-y-1 p-3">
                  <router-link
                    v-if="isTenant"
                    to="/tenant/profile"
                    @click="isProfilePopoverOpen = false"
                    class="press flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-ink hover:bg-canvas"
                  >
                    <User class="size-4 text-ink-soft" aria-hidden="true" />
                    <span>My details</span>
                  </router-link>

                  <!-- "Visit the website" while inside the workspace lives in
                       AppSidebar's drawer only now (2026-09-24) - the same
                       link in two menus at once was one too many. This entry
                       covers the other direction: signed in but currently ON
                       the public site, back to the dashboard. The wordmark
                       already goes there too, but nothing said so. -->
                  <router-link
                    v-if="!hasSidebar"
                    :to="brandRoute"
                    @click="isProfilePopoverOpen = false"
                    class="press flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-ink hover:bg-canvas"
                  >
                    <LayoutDashboard class="size-4 text-ink-soft" aria-hidden="true" />
                    <span>Back to my dashboard</span>
                  </router-link>

                  <!--
                    Not `v-if="isTenant"`. The administrator was onboarded on a
                    literal too, and until this existed nobody - her included -
                    could change a password without editing the database.
                  -->
                  <button
                    @click="openChangePassword"
                    class="press flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-ink hover:bg-canvas"
                  >
                    <Lock class="size-4 text-ink-soft" aria-hidden="true" />
                    <span>Change password</span>
                  </button>

                  <button
                    @click="handleSignOut"
                    class="press flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-overdue hover:bg-overdue-soft"
                  >
                    <LogOut class="size-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>

              </div>
            </Transition>
          </div>
        </template>

        <!--
          Sign In, for a visitor who is not signed in - and not while they are
          already standing on the sign-in page, where it is a button that goes
          nowhere, competing with the real one in the form below it.
        -->
        <template v-else>
          <router-link
            v-if="route.path !== '/login' && !isLandingPage"
            to="/login"
            class="pill-btn-brand"
          >
            <LogIn class="size-3.5 text-white" />
            <span>Sign in</span>
          </router-link>
        </template>

      </div>

      <!-- Light green divider at bottom of header, same width as navbar elements.
           Its insets are `ws-page`'s gutters, 56px from `lg` included. -->
      <div
        v-if="!isLandingPage"
        class="absolute bottom-0 inset-x-4 sm:inset-x-6 lg:inset-x-14 border-b border-line pointer-events-none"
        aria-hidden="true"
      />
    </div>

    <!--
      Mobile Public Navigation Dropdown Drawer

      This carried `animate-in slide-in-from-top duration-150` - utilities
      from the `tailwindcss-animate` plugin, which is not in package.json.
      Tailwind 4 has no built-in `animate-in`, so the class did nothing: the
      menu was a `v-if` popping open with no transition of any kind, the exact
      gap this pass was asked to close. Real `<Transition>` now, matching the
      curve and asymmetric timing every other menu in this file uses.
    -->
    <Transition
      enter-active-class="motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <!--
        Only for a public route other than the landing page, which draws its
        links in the bar itself at every width (see the nav above). No such
        route shows this header today (App.vue's `hidesGlobalHeader`), so this
        is the defensive fallback, kept plain rather than deleted.
      -->
      <div
        v-if="isPublicRoute && !isLandingPage && isMobilePublicNavOpen"
        id="public-mobile-nav"
        class="md:hidden flex flex-col items-start gap-1 border-t border-line bg-tile px-4 py-3 shadow-md"
      >
        <RouterLink
          to="/inquire"
          @click="isMobilePublicNavOpen = false"
          class="press inline-flex min-h-11 w-full items-center rounded-lg px-3 text-sm font-semibold text-ink transition-colors hover:bg-canvas hover:text-brand"
        >
          Inquire now
        </RouterLink>
        <RouterLink
          v-if="!isAuthenticated"
          to="/login"
          @click="isMobilePublicNavOpen = false"
          class="press inline-flex min-h-11 w-full items-center rounded-lg px-3 text-sm font-semibold text-ink transition-colors hover:bg-canvas hover:text-brand"
        >
          Sign in
        </RouterLink>
        <RouterLink
          v-else
          :to="brandRoute"
          @click="isMobilePublicNavOpen = false"
          class="press inline-flex min-h-11 w-full items-center rounded-lg px-3 text-sm font-semibold text-ink transition-colors hover:bg-canvas hover:text-brand"
        >
          Back to my dashboard
        </RouterLink>
      </div>
    </Transition>
  </header>

  <ChangePasswordModal :open="isChangePasswordOpen" @close="isChangePasswordOpen = false" />
</template>
