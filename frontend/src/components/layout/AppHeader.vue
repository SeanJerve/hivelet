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
  startNotificationsHeartbeat,
  stopNotificationsHeartbeat
} from '@/lib/notificationsStore';
import NotificationPopover from './NotificationPopover.vue';
import { Menu, LogOut, LogIn, User, Bell, ChevronDown, Lock } from 'lucide-vue-next';
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
  <header
    :class="[
      'w-full transition-colors duration-150',
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
    <div class="ws-page flex h-16 items-center justify-between relative">
      
      <!-- Left: Mobile Menu Toggle & Brand Logo -->
      <div class="flex items-center gap-3">
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
        >
          <Menu class="size-5" />
        </button>

        <!-- Public Mobile Menu Toggle. Same 36 -> 44 as above. -->
        <button
          v-if="isPublicRoute"
          @click="isMobilePublicNavOpen = !isMobilePublicNavOpen"
          class="press flex md:hidden -ml-1 p-3 rounded-xl cursor-pointer"
          :class="isLandingPage ? 'text-white hover:bg-white/10' : 'text-ink-soft hover:bg-tile hover:text-ink'"
          aria-label="Toggle navigation menu"
        >
          <Menu class="size-5" />
        </button>

        <router-link :to="brandRoute" class="press flex items-center gap-2 group">
          <span
            class="font-display font-semibold text-xl tracking-tight transition-colors"
            :class="isLandingPage ? 'text-white drop-shadow-sm group-hover:text-white/80' : 'text-ink group-hover:text-brand'"
          >
            Hivelet
          </span>
        </router-link>
      </div>

      <!-- Right: Public Quick Navigation (Desktop) -->
      <nav v-if="isPublicRoute" class="hidden md:flex items-center ml-auto">
        <!-- Landing page: Editorial underlined links matching reference photo -->
        <template v-if="isLandingPage">
          <div class="flex flex-wrap items-baseline justify-end text-[0.8rem] font-light drop-shadow-sm text-white">
            <RouterLink
              to="/inquire"
              class="press inline-block py-1 underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white transition-colors text-white"
            >
              Inquire Now
            </RouterLink>
            <template v-if="!isAuthenticated">
              <span aria-hidden="true" class="pr-2 text-white">,</span>
              <RouterLink
                to="/login"
                class="press inline-block py-1 underline underline-offset-4 decoration-1 decoration-white/45 hover:decoration-white transition-colors text-white"
              >
                Sign In
              </RouterLink>
            </template>
          </div>
        </template>
        <!-- Other public routes (fallback) -->
        <template v-else>
          <div class="flex items-center gap-1 sm:gap-2">
            <RouterLink
              to="/inquire"
              class="press px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-ink hover:text-brand hover:bg-tile cursor-pointer"
            >
              Inquire Now
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
          <div ref="profileMenu" class="ws-focus relative py-1">
            <button
              data-account-trigger
              @click="isProfilePopoverOpen = !isProfilePopoverOpen"
              class="group press flex cursor-pointer items-center gap-1.5 rounded-full p-1"
              :class="isLandingPage ? 'hover:bg-white/10' : 'hover:bg-tile/80'"
              :aria-label="`Account menu for ${isTenant ? currentUser.fullName : 'the administrator'}`"
              :aria-expanded="isProfilePopoverOpen"
              aria-haspopup="true"
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
                      {{ isTenant ? currentUser.fullName : 'Administrator' }}
                    </p>
                    <p class="truncate text-xs text-ink-soft">{{ currentUser.email }}</p>
                    <p class="mt-1 text-xs font-semibold text-brand">
                      {{ isTenant ? 'Resident' : 'Owner' }}
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

                <div class="border-t border-line px-5 py-3 text-xs text-ink-faint">
                  Fe Galang Da Silva Boarding House
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
            <span>Sign In</span>
          </router-link>
        </template>

      </div>

      <!-- Light green divider at bottom of header, same width as navbar elements -->
      <div
        v-if="!isLandingPage"
        class="absolute bottom-0 inset-x-4 sm:inset-x-6 border-b border-line pointer-events-none"
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
      <div
        v-if="isPublicRoute && isMobilePublicNavOpen"
        class="md:hidden border-t border-line bg-tile px-4 py-3 space-y-1 shadow-md"
      >
        <!--
          `min-h-11` and centred, rather than `py-2` around a 20px line. This
          is the only navigation a visitor has on a phone - it is what the
          hamburger opens - and both rows measured 343x36 on an emulated
          handset, under the 44 the sidebar drawer's own rows already keep.
        -->
        <RouterLink
          to="/inquire"
          @click="isMobilePublicNavOpen = false"
          class="press flex min-h-11 w-full items-center px-3 rounded-lg text-sm font-semibold text-ink hover:bg-canvas hover:text-brand cursor-pointer"
        >
          Inquire Now
        </RouterLink>
        <RouterLink
          v-if="!isAuthenticated"
          to="/login"
          @click="isMobilePublicNavOpen = false"
          class="press flex min-h-11 w-full items-center px-3 rounded-lg text-sm font-semibold text-ink hover:bg-canvas hover:text-brand cursor-pointer"
        >
          Sign In
        </RouterLink>
      </div>
    </Transition>
  </header>

  <ChangePasswordModal :open="isChangePasswordOpen" @close="isChangePasswordOpen = false" />
</template>
