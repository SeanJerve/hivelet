<script setup lang="ts">
/**
 * @file components/layout/NotificationPopover.vue
 * @description The notification drawer and dropdown popover for the workspace system.
 * @systemBibleRef Section 16 - Notification Center
 * @rationale Anchored directly below the header bell trigger button with consistent 8px offset,
 *            keyboard navigation focus trapping, and real-time read state persistence.
 *
 * Every row is a real button rather than a clickable div, so the list can be
 * reached and opened from the keyboard. Opening the drawer moves focus into it
 * and closing returns focus to the bell, so nobody is left at the top of the
 * page. The filters are a pressed-state group, not tabs: they narrow one list
 * rather than swapping panels.
 *
 * The header is one line - title, filter, refresh, close (Sean, 2026-10-01:
 * the row of All / Unread / Payments / Repairs / Inquiries chips "is so
 * clogged"). The choices moved into a small list behind a filter icon, and a
 * filter other than All shows as a removable label under the header, so a
 * narrowed list never looks like the whole inbox. "Check again" is a refresh
 * icon beside the X, named "Check again" for a screen reader, spinning while
 * it loads. "Mark all read" moved to the footer the text button left.
 */
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  unreadCount,
  isLoading,
  isPopoverOpen,
  activeFilter,
  filteredNotifications,
  markAsRead,
  markAllAsRead,
  fetchNotifications,
  notificationsFetchFailed,
  type NotificationItem,
  type NotificationFilter,
} from '@/lib/notificationsStore';
import { isAdmin } from '@/lib/authStore';
import { notificationTarget } from '@/lib/openFromQuery';
import Skeleton from '@/components/ui/Skeleton.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import {
  Check,
  CheckCheck,
  X,
  CreditCard,
  Wrench,
  Mail,
  AlertTriangle,
  Inbox,
  MessageSquare,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-vue-next';

const router = useRouter();
const panel = ref<HTMLElement | null>(null);

/**
 * Whether the stream should still stagger its rows in.
 *
 * On every open. This used to say the panel "mounts fresh every time it
 * opens", and only the panel did: this component stays mounted in AppHeader
 * for the whole session, so the flag went false 500ms after the first load
 * and the rows never staggered again (Sean, 2026-10-01). It is set again in
 * the `isPopoverOpen` watcher below. It still waits on `isLoading` rather
 * than a timer from opening, because the fetch can be in flight when the
 * panel opens: a timer from then would have the reveal fire against an empty
 * list and never play against the real one. Once the rows have had time to
 * finish, it flips off, so choosing a filter restyles the same list rather
 * than restarting the stagger on it.
 */
const revealRows = ref(true);
let revealTimer: ReturnType<typeof setTimeout> | null = null;
function settleRevealSoon() {
  if (revealTimer !== null) clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    revealRows.value = false;
    revealTimer = null;
  }, 500);
}
watch(
  isLoading,
  (loading) => {
    if (!loading && revealRows.value) settleRevealSoon();
  },
  { immediate: true }
);

/** The filter list behind the filter icon. */
const isFilterOpen = ref(false);
const filterRoot = ref<HTMLElement | null>(null);
const filterButton = ref<HTMLButtonElement | null>(null);
const activeFilterLabel = computed(
  () => ALL_FILTERS.find((f) => f.key === activeFilter.value)?.label ?? 'All'
);

function chooseFilter(key: NotificationFilter) {
  activeFilter.value = key;
  isFilterOpen.value = false;
  filterButton.value?.focus();
}

/** "Check again". Not disabled while loading: a focused button that disables itself drops focus to the page. */
function checkAgain() {
  if (!isLoading.value) fetchNotifications();
}

const ALL_FILTERS: ReadonlyArray<{ key: NotificationFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'payments', label: 'Payments' },
  { key: 'maintenance', label: 'Repairs' },
  { key: 'inquiries', label: 'Inquiries' },
];

// Prospect inquiries reach the administrator only; a resident never has one.
const FILTERS = computed(() =>
  isAdmin.value ? ALL_FILTERS : ALL_FILTERS.filter((f) => f.key !== 'inquiries')
);

// The page names the owner reads everywhere else; the stored types stay as they are.
const TYPE_WORDS: Record<string, string> = {
  Payment: 'Payment',
  Billing: 'Bill',
  Maintenance: 'Repair',
  Inquiry: 'Inquiry',
  Chat: 'Message',
};

function getIconForType(type: string) {
  switch (type) {
    case 'Payment':
    case 'Billing':
      return CreditCard;
    case 'Maintenance':
      return Wrench;
    case 'Inquiry':
      return Mail;
    case 'Chat':
      return MessageSquare;
    default:
      return AlertTriangle;
  }
}

/**
 * The icon chip carries the same meaning as the badge beside it, so colour is
 * never the only thing saying a notice is urgent.
 */
function chipTone(type: string, priority: string) {
  if (priority === 'Emergency') return 'bg-overdue-soft text-overdue';
  if (priority === 'High') return 'bg-verify-soft text-verify';
  switch (type) {
    case 'Payment':
    case 'Billing':
    case 'Maintenance':
    case 'Inquiry':
      return 'bg-brand-soft text-brand';
    default:
      return 'bg-canvas text-ink-soft';
  }
}

function formatRelativeTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

async function handleNotificationClick(item: NotificationItem) {
  await markAsRead(item.id);
  isPopoverOpen.value = false;

  // The record itself when the notification names one: a payment opens with its
  // Verify and Reject buttons, a ticket or enquiry opens on its own thread.
  const target = notificationTarget(item, isAdmin.value);
  if (target) router.push(target);
}

/** Where focus came from, so Escape can put it back on the bell. */
let openedFrom: HTMLElement | null = null;

watch(isPopoverOpen, async (open) => {
  isFilterOpen.value = false;
  if (open) {
    revealRows.value = true;
    if (!isLoading.value) settleRevealSoon();
    openedFrom = document.activeElement as HTMLElement | null;
    await nextTick();
    panel.value?.focus();
  } else if (openedFrom?.isConnected) {
    openedFrom.focus();
    openedFrom = null;
  }
});

/**
 * Escape closes it; Tab stays inside it while it is open.
 *
 * The @rationale block above has claimed "keyboard navigation focus trapping"
 * since this file was written, but nothing here ever implemented one - Tab
 * walked straight through the panel and out into the page behind it, same as
 * any other floating layer. WsModal solved this exact problem already (see
 * its own onKeydown); this mirrors that solution rather than inventing a
 * second one; the `contains(document.activeElement)` guard is copied for the
 * same reason WsModal added it - so this trap only acts while focus is
 * actually inside THIS panel, not some ancestor dialog that happens to share
 * the page.
 */
function onKeyDown(e: KeyboardEvent) {
  // The filter list is the innermost layer, so Escape closes it first.
  if (e.key === 'Escape' && isFilterOpen.value) {
    e.stopPropagation();
    isFilterOpen.value = false;
    filterButton.value?.focus();
    return;
  }
  if (e.key === 'Escape' && isPopoverOpen.value) {
    e.stopPropagation();
    isPopoverOpen.value = false;
    return;
  }
  if (
    e.key !== 'Tab' ||
    !isPopoverOpen.value ||
    !panel.value ||
    !panel.value.contains(document.activeElement)
  ) {
    return;
  }

  const focusable = [...panel.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((el) => el.offsetParent !== null);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  // The panel itself holds focus on open; Shift+Tab from it went back to the bell with the panel still open.
  if (document.activeElement === panel.value) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * A click anywhere else closes the drawer. The bell itself is excluded, because
 * it already toggles, and closing here would let it reopen on the same click.
 */
function onDocumentPointerDown(e: PointerEvent) {
  if (!isPopoverOpen.value) return;
  const target = e.target as Node;
  if (isFilterOpen.value && !filterRoot.value?.contains(target)) isFilterOpen.value = false;
  if (panel.value?.contains(target)) return;
  // The bell toggles on its own. Closing here too would reopen it on one click.
  const el = target instanceof Element ? target : target.parentElement;
  if (el?.closest('[data-notifications-trigger]')) return;
  isPopoverOpen.value = false;
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onDocumentPointerDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('pointerdown', onDocumentPointerDown);
  if (revealTimer !== null) clearTimeout(revealTimer);
});
</script>

<template>
  <div>
    <!-- `h-dvh`, not `inset-0`: the blurred header is this fixed layer's
         containing block, so `inset-0` dimmed only the 64px header strip. -->
    <Transition name="ws-fade">
      <div v-if="isPopoverOpen" class="fixed inset-x-0 top-0 z-40 h-dvh bg-night/30 sm:hidden" aria-hidden="true" />
    </Transition>

    <!--
      This panel opened and closed as a hard `v-if` cut, then (from
      2026-09-30) opened through `@starting-style` and still vanished on
      close. It is a real `<Transition>` now, both ways, and the SAME one as
      the account menu beside it - `ws-pop` in index.css, growing from the
      top-right corner it hangs from (Sean, 2026-10-01: "the user dropdown and
      the notification dropdown don't appear the same way").

      `inset-x-2`, not `right-2` with a `100vw` width. The header's backdrop
      blur makes IT the containing block for this fixed panel, and `100vw`
      counts a scrollbar the header does not, so the panel came out wider than
      its box and sat 2px from the left edge at 375px (B-61). Pinning both
      sides to the box gives an even 8px gutter whichever box it is.

      `top-[4.125rem]` on a phone and `top-[calc(100%+0.75rem)]` from `sm`
      are the same line: 12px under the 44px bell, which sits centred in the
      64px header row (10 + 44 + 12 = 66px). The account menu hangs from the
      same 12px, so both menus start at the same height (Sean, 2026-10-01).
    -->
    <Transition name="ws-pop">
    <div
      v-if="isPopoverOpen"
      ref="panel"
      tabindex="-1"
      role="dialog"
      aria-label="Notifications"
      class="ws-focus fixed inset-x-2 top-[4.125rem] z-50 flex max-h-[calc(100vh-5rem)] supports-[height:100dvh]:max-h-[calc(100dvh-5rem)] origin-top-right flex-col overflow-hidden rounded-tile bg-tile shadow-lift outline-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:w-[420px]"
    >
      <!--
        Header: title, filter, refresh, close, on one line.

        `pointer-coarse:` 44px on every control here, as PillSelect does: they
        were 28px (36px for the X) under a finger (B-61), and the compact size
        stays for a mouse. `.press` on each, so a tap answers on a touch screen.

        Only the X keeps the circle (`icon-btn`): Sean, 2026-10-01, only close
        buttons and the up-right arrow buttons wear one. The filter and refresh
        are the icon alone, with a soft fill on hover and while open.

        The title and count may wrap onto two lines at 320px rather than push
        the three buttons out of the panel.
      -->
      <div class="flex items-center gap-2 border-b border-line py-2 pl-4 pr-2">
        <div class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <h2 class="text-sm font-semibold text-ink">Notifications</h2>
          <span v-if="unreadCount > 0" class="text-xs font-semibold text-brand">
            {{ unreadCount }} unread
          </span>
          <!-- Not after a failed load: the count is then 0 because nothing was
               read, and "All read" sat directly above "Notifications could not
               be loaded" (mocked-API harness, 2026-09-24). -->
          <span v-else-if="!notificationsFetchFailed" class="text-xs text-ink-faint">All read</span>
        </div>

        <div class="flex shrink-0 items-center gap-0.5">
          <!--
            The filter. A disclosure that opens a short list of the same
            choices the chip row had, the current one checked. Each choice keeps
            `aria-pressed` - the list narrows one stream, it does not swap
            panels - and the button's own name says which one is in force.

            SlidersHorizontal, the icon on every list's Filters button
            (components/ui/ListToolbar.vue). It was ListFilter, a different
            glyph for the same idea (Sean, 2026-10-01: "the filter icon is
            different from the icon used on the dashboards").
          -->
          <div ref="filterRoot" class="relative">
            <button
              ref="filterButton"
              type="button"
              :class="[
                'press relative grid size-9 place-items-center rounded-full text-ink-soft hover:bg-canvas hover:text-ink pointer-coarse:size-11',
                (isFilterOpen || activeFilter !== 'all') && 'text-ink',
                isFilterOpen && 'bg-canvas',
              ]"
              :aria-label="activeFilter === 'all' ? 'Filter notifications' : `Filter notifications, showing ${activeFilterLabel}`"
              :aria-expanded="isFilterOpen"
              aria-controls="notifications-filter"
              @click="isFilterOpen = !isFilterOpen"
            >
              <SlidersHorizontal class="size-4" aria-hidden="true" />
              <span
                v-if="activeFilter !== 'all'"
                class="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-tile"
                aria-hidden="true"
              />
            </button>
            <Transition name="ws-pop">
              <div
                v-if="isFilterOpen"
                id="notifications-filter"
                role="group"
                aria-label="Show only"
                class="absolute right-0 top-[calc(100%+0.25rem)] z-10 w-44 origin-top-right rounded-2xl border border-line bg-tile p-1.5 shadow-lift"
              >
                <button
                  v-for="tab in FILTERS"
                  :key="tab.key"
                  type="button"
                  :aria-pressed="activeFilter === tab.key"
                  :class="[
                    'press flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm pointer-coarse:min-h-11',
                    activeFilter === tab.key
                      ? 'bg-brand-soft font-semibold text-brand'
                      : 'text-ink hover:bg-canvas',
                  ]"
                  @click="chooseFilter(tab.key)"
                >
                  <span>{{ tab.label }}</span>
                  <Check v-if="activeFilter === tab.key" class="size-4 shrink-0" aria-hidden="true" />
                </button>
              </div>
            </Transition>
          </div>

          <!-- "Check again", as an icon beside the X. It spins while a load is
               in flight; under reduced motion it holds still and the list's own
               loading rows say the same thing. -->
          <button
            type="button"
            class="press grid size-9 place-items-center rounded-full text-ink-soft hover:bg-canvas hover:text-ink pointer-coarse:size-11"
            aria-label="Check again"
            :aria-busy="isLoading"
            @click="checkAgain"
          >
            <RefreshCw :class="['size-4', isLoading && 'motion-safe:animate-spin']" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="icon-btn size-9 pointer-coarse:size-11"
            aria-label="Close notifications"
            @click="isPopoverOpen = false"
          >
            <X class="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- The filter in force, when it is not All, as a label that removes it. -->
      <div v-if="activeFilter !== 'all'" class="flex items-center gap-2 border-b border-line px-4 py-2 text-xs">
        <span class="text-ink-soft">Showing</span>
        <button
          type="button"
          class="press inline-flex items-center gap-1.5 rounded-full bg-ink py-1 pl-2.5 pr-2 font-semibold text-canvas pointer-coarse:py-2"
          :aria-label="`Showing ${activeFilterLabel} only. Show all notifications`"
          @click="activeFilter = 'all'"
        >
          {{ activeFilterLabel }}
          <X class="size-3" aria-hidden="true" />
        </button>
      </div>

      <!-- The stream -->
      <div class="max-h-[440px] flex-1 overflow-y-auto overscroll-contain">
        <div v-if="isLoading" class="divide-y divide-line">
          <div v-for="i in 3" :key="'sk-' + i" class="flex items-start gap-3 p-4">
            <Skeleton class-name="size-9 shrink-0 rounded-xl" />
            <div class="min-w-0 flex-1 space-y-2">
              <Skeleton class-name="h-4 w-40 rounded-full" />
              <Skeleton class-name="h-3 w-full rounded-full" />
              <Skeleton class-name="h-3 w-2/3 rounded-full" />
            </div>
          </div>
        </div>

        <div
          v-else-if="notificationsFetchFailed && filteredNotifications.length === 0"
          role="status"
          class="px-6 py-12 text-center"
        >
          <AlertTriangle class="mx-auto size-8 text-verify" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-ink">Notifications could not be loaded</p>
          <p class="mt-1 text-sm leading-6 text-ink-soft">
            This does not mean there are none. Check your connection and try again.
          </p>
          <button
            type="button"
            class="pill-btn mt-4"
            @click="fetchNotifications"
          >
            Try again
          </button>
        </div>

        <div v-else-if="filteredNotifications.length === 0" class="px-6 py-12 text-center">
          <Inbox class="mx-auto size-8 text-ink-faint" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-ink">Nothing here</p>
          <p class="mt-1 text-sm leading-6 text-ink-soft">
            {{
              activeFilter === 'unread'
                ? 'You have read everything.'
                : activeFilter === 'all'
                  ? 'Nothing has come in yet.'
                  : 'Nothing has come in under this filter.'
            }}
          </p>
        </div>

        <div v-else class="divide-y divide-line">
          <!-- The rows from the last good load stay; this says they may be behind. -->
          <p
            v-if="notificationsFetchFailed"
            role="status"
            class="bg-verify-soft px-4 py-2.5 text-xs leading-5 text-verify"
          >
            The latest could not be loaded. These are from the last time it worked.
          </p>
          <button
            v-for="(item, i) in filteredNotifications"
            :key="item.id"
            type="button"
            :class="[
              // Negative offset: these rows run edge to edge inside a scrolling
              // list, which clipped the workspace's outset focus outline.
              'press-plate group flex w-full items-start gap-3 p-4 text-left hover:bg-canvas focus-visible:outline-offset-[-3px]',
              item.is_read ? 'bg-tile' : 'bg-brand-soft/50',
              revealRows ? 'list-reveal-item' : '',
            ]"
            :style="revealRows ? { animationDelay: `${Math.min(i, 9) * 30}ms` } : undefined"
            @click="handleNotificationClick(item)"
          >
            <span
              :class="[
                'grid size-9 shrink-0 place-items-center rounded-xl',
                chipTone(item.type, item.priority),
              ]"
              aria-hidden="true"
            >
              <component :is="getIconForType(item.type)" class="size-4" />
            </span>

            <span class="min-w-0 flex-1">
              <!-- The title wraps rather than truncating: at 375px even a
                   short one was cut off, and the row is the only place it is shown. -->
              <span class="flex items-baseline justify-between gap-3">
                <span class="min-w-0 break-words text-sm font-semibold text-ink group-hover:text-brand">
                  {{ item.title }}
                </span>
                <time
                  :datetime="item.created_at"
                  class="shrink-0 whitespace-nowrap text-xs text-ink-faint"
                >
                  {{ formatRelativeTime(item.created_at) }}
                </time>
              </span>

              <!--
                Whole, not `line-clamp-2`. The row is a link to another
                screen, not an expander, so a clamped message had no way to be
                read in full from here (B-61).
              -->
              <span class="mt-0.5 block break-words text-sm leading-6 text-ink-soft">
                {{ item.message }}
              </span>

              <span class="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill v-if="item.priority === 'Emergency'" tone="overdue">
                  Needs someone now
                </StatusPill>
                <StatusPill v-else-if="item.priority === 'High'" tone="verify">Soon</StatusPill>
                <span v-if="TYPE_WORDS[item.type]" class="text-xs font-medium text-ink-faint">{{ TYPE_WORDS[item.type] }}</span>
                <span v-if="!item.is_read" class="text-xs font-semibold text-brand">Unread</span>
              </span>
            </span>
          </button>
        </div>
      </div>

      <!-- Footer: "Mark all read", when there is anything to mark. Not under the
           failed state, which has its own "Try again". -->
      <div
        v-if="unreadCount > 0 && !(notificationsFetchFailed && filteredNotifications.length === 0 && !isLoading)"
        class="flex items-center justify-end gap-3 border-t border-line px-4 py-2 text-xs"
      >
        <button
          type="button"
          class="press inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-semibold text-brand hover:bg-brand-soft pointer-coarse:min-h-11"
          @click="markAllAsRead"
        >
          <CheckCheck class="size-3.5" aria-hidden="true" />
          Mark all read
        </button>
      </div>
    </div>
    </Transition>
  </div>
</template>
