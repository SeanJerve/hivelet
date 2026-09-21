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
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue';
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

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'payments', label: 'Billing' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'inquiries', label: 'Inquiries' },
] as const;

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

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isPopoverOpen.value) {
    e.stopPropagation();
    isPopoverOpen.value = false;
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
});
</script>

<template>
  <div v-if="isPopoverOpen" class="ws-focus">
    <div class="fixed inset-0 z-40 bg-night/30 sm:hidden" aria-hidden="true" />

    <div
      ref="panel"
      tabindex="-1"
      role="dialog"
      aria-label="Notifications"
      class="fixed right-2 top-16 z-50 flex max-h-[calc(100vh-5rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-tile bg-tile shadow-lift outline-none sm:absolute sm:right-0 sm:top-12 sm:w-[420px]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div class="flex min-w-0 items-baseline gap-2">
          <h2 class="text-sm font-semibold text-ink">Notifications</h2>
          <span v-if="unreadCount > 0" class="text-xs font-semibold text-brand">
            {{ unreadCount }} unread
          </span>
          <span v-else class="text-xs text-ink-faint">All read</span>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <!--
            `.press` on this button, the filter tabs, the notification rows
            and "Check again" below: none of them are `.pill-btn` or `.chip`,
            so none of them picked up the scale-on-press every other control
            in the workspace answers with. On a touch screen there is no
            hover, so a tap on one of these read as not having landed.
          -->
          <button
            v-if="unreadCount > 0"
            type="button"
            class="press inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft"
            @click="markAllAsRead"
          >
            <CheckCheck class="size-3.5" aria-hidden="true" />
            Mark all read
          </button>

          <button
            type="button"
            class="icon-btn size-9"
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
            'press whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold',
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

        <div v-else-if="filteredNotifications.length === 0" class="px-6 py-12 text-center">
          <Inbox class="mx-auto size-8 text-ink-faint" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold text-ink">Nothing here</p>
          <p class="mt-1 text-sm leading-6 text-ink-soft">
            {{
              activeFilter === 'unread'
                ? 'You have read everything.'
                : 'Nothing has come in under this filter.'
            }}
          </p>
        </div>

        <div v-else class="divide-y divide-line">
          <button
            v-for="item in filteredNotifications"
            :key="item.id"
            type="button"
            :class="[
              'press-plate group flex w-full items-start gap-3 p-4 text-left hover:bg-canvas',
              item.is_read ? 'bg-tile' : 'bg-brand-soft/50',
            ]"
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
              <span class="flex items-baseline justify-between gap-3">
                <span class="truncate text-sm font-semibold text-ink group-hover:text-brand">
                  {{ item.title }}
                </span>
                <time
                  :datetime="item.created_at"
                  class="shrink-0 whitespace-nowrap text-xs text-ink-faint"
                >
                  {{ formatRelativeTime(item.created_at) }}
                </time>
              </span>

              <span class="mt-0.5 line-clamp-2 block text-sm leading-6 text-ink-soft">
                {{ item.message }}
              </span>

              <span class="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill v-if="item.priority === 'Emergency'" tone="overdue">
                  Needs someone now
                </StatusPill>
                <StatusPill v-else-if="item.priority === 'High'" tone="verify">Soon</StatusPill>
                <span class="text-xs font-medium text-ink-faint">{{ item.type }}</span>
                <span v-if="!item.is_read" class="text-xs font-semibold text-brand">Unread</span>
              </span>
            </span>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink-faint"
      >
        <span>Updates as they arrive</span>
        <button
          type="button"
          class="press rounded-full px-2.5 py-1.5 font-semibold text-brand hover:bg-brand-soft"
          @click="fetchNotifications"
        >
          Check again
        </button>
      </div>
    </div>
  </div>
</template>
