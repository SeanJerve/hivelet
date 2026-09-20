/**
 * @file lib/notificationsStore.ts
 * @description Central reactive store for real-time in-system notifications and alerts.
 * @systemBibleRef Section 16 (Communication Centralization), Section 22 (Core Design Principles)
 * @requirements   FR-026, FR-027
 */
import { ref, computed } from 'vue';
import { api } from './api';
import { currentUser, isAuthenticated, isAdmin } from './authStore';

export interface NotificationItem {
  id: string;
  recipient_profile_id: string;
  title: string;
  message: string;
  type: 'Payment' | 'Maintenance' | 'Inquiry' | 'Billing' | 'Chat' | 'System';
  priority: 'Emergency' | 'High' | 'Medium' | 'Low';
  is_read: boolean;
  related_entity_type?: 'PAYMENT' | 'BILL' | 'TICKET' | 'INQUIRY' | 'ROOM' | 'TENANT' | 'MESSAGE' | null;
  related_entity_id?: string | null;
  created_at: string;
}

export type NotificationFilter = 'all' | 'unread' | 'payments' | 'maintenance' | 'inquiries';

export const notifications = ref<NotificationItem[]>([]);
export const unreadCount = ref<number>(0);
export const isLoading = ref<boolean>(false);
export const isPopoverOpen = ref<boolean>(false);
export const activeFilter = ref<NotificationFilter>('all');

let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastKnownUnreadCount = 0;

/**
 * Filtered list of notifications based on active user tab.
 */
export const filteredNotifications = computed(() => {
  let list = notifications.value;

  if (activeFilter.value === 'unread') {
    list = list.filter((n) => !n.is_read);
  } else if (activeFilter.value === 'payments') {
    list = list.filter((n) => n.type === 'Payment' || n.type === 'Billing');
  } else if (activeFilter.value === 'maintenance') {
    list = list.filter((n) => n.type === 'Maintenance');
  } else if (activeFilter.value === 'inquiries') {
    list = list.filter((n) => n.type === 'Inquiry' || n.type === 'Chat');
  }

  return list;
});

/**
 * How many unread notifications are Emergency or High priority.
 *
 * Exists because the bell's accessible name was asserting a COUNT from a
 * boolean: `hasEmergencyUnread` answers "is there at least one", and the label
 * rendered that as *"one of them an emergency"* however many there were. Read
 * live on 2026-09-19, the administrator had **2 Emergency and 4 High** unread
 * and was told there was one.
 *
 * Counted from the loaded list rather than from the server, which is the same
 * basis the boolean always used. `unreadCount` comes from `meta.totalUnread`
 * and can therefore exceed what is loaded; this figure cannot exceed the page.
 * With 21 rows against a default limit of 50 that difference is theoretical
 * today, and it is the honest basis to count on rather than a second source.
 */
export const urgentUnreadCount = computed(
  () =>
    notifications.value.filter(
      (n) => !n.is_read && (n.priority === 'Emergency' || n.priority === 'High')
    ).length
);

/**
 * Whether any unread notification is Emergency or High priority. Drives the
 * bell's colour. Derived from the count above so the two cannot disagree.
 */
export const hasEmergencyUnread = computed(() => urgentUnreadCount.value > 0);

/**
 * Plays a subtle, non-intrusive notification chime via Web Audio API.
 */
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First tone (E5: 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.25);

    // Second tone (A5: 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may be restricted before user interaction
  }
}

/**
 * Fetches all notifications for the active authenticated profile.
 */
export async function fetchNotifications() {
  if (!isAuthenticated.value || !currentUser.value) return;

  isLoading.value = true;
  try {
    const endpoint = isAdmin.value ? '/admin/notifications' : '/tenant/my-notifications';
    /**
     * `getWithMeta`, not `get`.
     *
     * This read `api.get<{ data; totalUnread }>(endpoint)` and then `res.data`.
     * `api.get` ALREADY returns `payload.data` - so `res` was the array itself,
     * `res.data` was `undefined`, and the `if` below never ran. The store held
     * zero notifications and a zero badge from the day it was written, while the
     * live table held 20 unread rows.
     *
     * Nothing failed loudly, because there was nothing to fail: reading `.data`
     * off an array is `undefined`, not an error, and the `??` beside it produced
     * a plausible 0. The defensive default is what hid it - the same shape as
     * `r.tenant_name` and `l.old_values` elsewhere in this audit.
     */
    const { data, meta } = await api.getWithMeta<
      NotificationItem[],
      { totalUnread?: number }
    >(endpoint);

    if (Array.isArray(data)) {
      notifications.value = data;
      unreadCount.value = meta?.totalUnread ?? data.filter((n) => !n.is_read).length;

      // Play audio chime if new unread items arrived while active
      if (unreadCount.value > lastKnownUnreadCount && lastKnownUnreadCount > 0) {
        playNotificationChime();
      }
      lastKnownUnreadCount = unreadCount.value;
    }
  } catch (err) {
    console.error('[NotificationsStore] Failed to load notifications:', err);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Lightweight check for unread count.
 */
export async function pollUnreadCount() {
  if (!isAuthenticated.value || !currentUser.value) return;

  try {
    const endpoint = isAdmin.value ? '/admin/notifications/unread-count' : '/tenant/my-notifications';
    const res = await api.get<any>(endpoint);

    /**
     * One level, not two. `api.get` already unwrapped the envelope, so the admin
     * endpoint's `{ success, data: { unreadCount } }` arrives here as
     * `{ unreadCount }`. This read `res.data.unreadCount`, found `undefined`,
     * fell through to the array branch, found no array, and assigned 0 - every
     * twelve seconds, for as long as the feature has existed.
     *
     * The tenant branch polls the LIST endpoint, which unwraps to an array, so
     * both shapes are handled explicitly rather than by a fallback that cannot
     * tell "none" from "could not read".
     */
    const count = typeof res?.unreadCount === 'number' 
      ? res.unreadCount 
      : (Array.isArray(res) ? res.filter((n: any) => !n.is_read).length : 0);

    if (count > unreadCount.value) {
      // New notification detected! Fetch full list and chime
      unreadCount.value = count;
      await fetchNotifications();
    } else {
      unreadCount.value = count;
    }
  } catch {
    // Graceful silent polling
  }
}

/**
 * Marks a specific notification as read.
 */
export async function markAsRead(notificationId: string) {
  const item = notifications.value.find((n) => n.id === notificationId);
  if (!item || item.is_read) return;

  // Optimistic update
  item.is_read = true;
  if (unreadCount.value > 0) unreadCount.value--;

  try {
    const endpoint = isAdmin.value
      ? `/admin/notifications/${notificationId}/read`
      : `/tenant/my-notifications/${notificationId}/read`;
    await api.patch(endpoint, {});
  } catch (err) {
    /**
     * Put the badge back. The optimistic update above already greyed the item
     * out and decremented the count; leaving that standing after a failed write
     * means the notification silently disappears from view and returns on the
     * next poll, which looks like the app losing things.
     *
     * `markAllAsRead` below has always refetched here. This one did not.
     */
    console.error('[NotificationsStore] Failed to mark read:', err);
    await fetchNotifications();
  }
}

/**
 * Marks all notifications as read.
 */
export async function markAllAsRead() {
  if (unreadCount.value === 0) return;

  // Optimistic update
  notifications.value.forEach((n) => (n.is_read = true));
  unreadCount.value = 0;

  try {
    const endpoint = isAdmin.value
      ? '/admin/notifications/mark-all-read'
      : '/tenant/my-notifications/mark-all-read';
    await api.post(endpoint, {});
  } catch (err) {
    console.error('[NotificationsStore] Failed to mark all read:', err);
    await fetchNotifications();
  }
}

/**
 * Starts background polling heartbeat (every 12 seconds).
 */
export function startNotificationsHeartbeat() {
  stopNotificationsHeartbeat();
  fetchNotifications();
  pollInterval = setInterval(pollUnreadCount, 12000);
}

/**
 * Stops background polling.
 */
export function stopNotificationsHeartbeat() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
