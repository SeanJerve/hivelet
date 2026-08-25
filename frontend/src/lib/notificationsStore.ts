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
 * Checks if there is any unread Emergency or High priority notification.
 */
export const hasEmergencyUnread = computed(() => {
  return notifications.value.some(
    (n) => !n.is_read && (n.priority === 'Emergency' || n.priority === 'High')
  );
});

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
    const res = await api.get<{ data: NotificationItem[]; totalUnread?: number }>(endpoint);

    if (res && res.data) {
      notifications.value = res.data;
      unreadCount.value = res.totalUnread ?? res.data.filter((n) => !n.is_read).length;

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

    const count = typeof res?.data?.unreadCount === 'number' 
      ? res.data.unreadCount 
      : (Array.isArray(res?.data) ? res.data.filter((n: any) => !n.is_read).length : 0);

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
    console.error('[NotificationsStore] Failed to mark read:', err);
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
