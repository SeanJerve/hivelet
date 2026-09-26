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
} from '@/lib/notificationsStore';
import { isAdmin } from '@/lib/authStore';
import Skeleton from '@/components/ui/Skeleton.vue';
import StatusPill from '@/components/overview/StatusPill.vue';
import {
  CheckCheck,
  X,
  CreditCard,
  Wrench,
  Mail,
  AlertTriangle,
  Inbox,
  MessageSquare,
} from 'lucide-vue-next';

const router = useRouter();
const panel = ref<HTMLElement | null>(null);

/**
 * Whether the stream should still stagger its rows in.
 *
 * The panel mounts fresh every time it opens - it is a bare `v-if` with
 * nothing above it - so this starts `true` on every open and is exactly the
 * "first load" the rows should animate for. It is tied to `isLoading` rather
 * than to mount time, because the fetch this panel waits on can still be in
 * flight when it opens: gating on a timer from mount would have the reveal
 * fire against an empty list and never play against the real one. Once the
 * rows have had time to finish, this flips off for good, so clicking a filter
 * tab restyles the same list rather than restarting the stagger on it.
 */
const revealRows = ref(true);
let revealTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  isLoading,
  (loading) => {
    if (!loading && revealRows.value && revealTimer === null) {
      revealTimer = setTimeout(() => {
        revealRows.value = false;
      }, 500);
    }
  },
  { immediate: true }
);

const ALL_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'payments', label: 'Payments' },
  { key: 'maintenance', label: 'Repairs' },
  { key: 'inquiries', label: 'Inquiries' },
] as const;

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

  if (isAdmin.value) {
    if (item.type === 'Payment' || item.type === 'Billing') {
      router.push('/admin/income?tab=verify');
    } else if (item.type === 'Maintenance') {
      router.push('/admin/tickets');
    } else if (item.type === 'Inquiry') {
      router.push('/admin/inquiries');
    }
  } else {
    if (item.type === 'Payment' || item.type === 'Billing') {
      router.push('/tenant/payments');
    } else if (item.type === 'Maintenance') {
      router.push('/tenant/tickets');
    } else {
      router.push('/tenant');
    }
  }
}

/** Where focus came from, so Escape can put it back on the bell. */
let openedFrom: HTMLElement | null = null;

watch(isPopoverOpen, async (open) => {
  if (open) {
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
  <div v-if="isPopoverOpen" class="ws-focus">
    <!-- `h-dvh`, not `inset-0`: the blurred header is this fixed layer's
         containing block, so `inset-0` dimmed only the 64px header strip. -->
    <div class="notif-backdrop fixed inset-x-0 top-0 z-40 h-dvh bg-night/30 sm:hidden" aria-hidden="true" />

    <!--
      This panel opened and closed as a hard `v-if` cut, the one surface the
      owner named directly as "notifications" and asked to see move. Entry
      only, via `@starting-style` in the style block below - the same
      constraint WsModal's own panel answers to: this is a bare `v-if` with no
      wrapper to hang a Vue `<Transition>` leave on. It scales from its top
      right corner rather than from centre, because unlike a modal this is
      anchored to the bell that opened it.
    -->
    <!--
      `inset-x-2`, not `right-2` with a `100vw` width. The header's backdrop
      blur makes IT the containing block for this fixed panel, and `100vw`
      counts a scrollbar the header does not, so the panel came out wider than
      its box and sat 2px from the left edge at 375px (B-61). Pinning both
      sides to the box gives an even 8px gutter whichever box it is.
    -->
    <div
      ref="panel"
      tabindex="-1"
      role="dialog"
      aria-label="Notifications"
      class="notif-panel fixed inset-x-2 top-16 z-50 flex max-h-[calc(100vh-5rem)] origin-top-right flex-col overflow-hidden rounded-tile bg-tile shadow-lift outline-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[420px]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div class="flex min-w-0 items-baseline gap-2">
          <h2 class="text-sm font-semibold text-ink">Notifications</h2>
          <span v-if="unreadCount > 0" class="text-xs font-semibold text-brand">
            {{ unreadCount }} unread
          </span>
          <!-- Not after a failed load: the count is then 0 because nothing was
               read, and "All read" sat directly above "Notifications could not
               be loaded" (mocked-API harness, 2026-09-24). -->
          <span v-else-if="!notificationsFetchFailed" class="text-xs text-ink-faint">All read</span>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <!--
            `.press` on this button, the filter tabs, the notification rows
            and "Check again" below: none of them are `.pill-btn` or `.chip`,
            so none of them picked up the scale-on-press every other control
            in the workspace answers with. On a touch screen there is no
            hover, so a tap on one of these read as not having landed.

            `pointer-coarse:` 44px on every control here, as PillSelect does:
            they were 28px (36px for the X) under a finger (B-61), and the
            compact size stays for a mouse.
          -->
          <button
            v-if="unreadCount > 0"
            type="button"
            class="press inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft pointer-coarse:min-h-11"
            @click="markAllAsRead"
          >
            <CheckCheck class="size-3.5" aria-hidden="true" />
            Mark all read
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

      <!-- Filters -->
      <div
        class="flex items-center gap-1.5 overflow-x-auto border-b border-line px-3 py-2"
        role="group"
        aria-label="Show only"
      >
        <button
          v-for="tab in FILTERS"
          :key="tab.key"
          type="button"
          :aria-pressed="activeFilter === tab.key"
          :class="[
            'press whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold pointer-coarse:min-h-11',
            activeFilter === tab.key
              ? 'bg-ink text-canvas'
              : 'text-ink-soft hover:bg-canvas hover:text-ink',
          ]"
          @click="activeFilter = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- The stream -->
      <div class="max-h-[440px] flex-1 overflow-y-auto">
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
              'press-plate group flex w-full items-start gap-3 p-4 text-left hover:bg-canvas',
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

      <!-- Footer. Not under the failed state, which has its own "Try again". -->
      <div
        v-if="!(notificationsFetchFailed && filteredNotifications.length === 0 && !isLoading)"
        class="flex items-center justify-end gap-3 border-t border-line px-4 py-3 text-xs"
      >
        <button
          type="button"
          class="press rounded-full px-2.5 py-1.5 font-semibold text-brand hover:bg-brand-soft pointer-coarse:min-h-11"
          @click="fetchNotifications"
        >
          Check again
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Entry only, both of these - see the template comment above the panel for
 * why. Sitting inside `.ws-focus`, so the reduced-motion rule in index.css
 * already strips `scale`/`translate` from what transitions here and leaves
 * opacity in place, the same bargain every other dialog in the workspace
 * makes.
 */
.notif-backdrop {
  opacity: 1;
  transition: opacity 0.15s var(--ease-out);
}
@starting-style {
  .notif-backdrop {
    opacity: 0;
  }
}

.notif-panel {
  opacity: 1;
  scale: 1;
  translate: 0 0;
  transition:
    opacity 0.18s var(--ease-out),
    scale 0.18s var(--ease-out),
    translate 0.18s var(--ease-out);
}
@starting-style {
  .notif-panel {
    opacity: 0;
    scale: 0.96;
    translate: 4px -4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .notif-panel {
    scale: none;
    translate: none;
  }
  @starting-style {
    .notif-panel {
      scale: none;
      translate: none;
    }
  }
}
</style>
