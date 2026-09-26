/**
 * @file services/notificationService.ts
 * @description Centralized notification engine for Hivelet operations.
 * @systemBibleRef Section 16 (Communication Centralization), Section 22 (Core Design Principles)
 * @businessRules  BR-017, BR-023, BR-024, BR-027
 * @requirements   FR-026, FR-027
 */
import { db } from '../config/db.js';

export type NotificationType = 'Payment' | 'Maintenance' | 'Inquiry' | 'Billing' | 'Chat' | 'System';
export type NotificationPriority = 'Emergency' | 'High' | 'Medium' | 'Low';

export interface CreateNotificationOptions {
  recipientProfileId?: string; // If omitted, defaults to the Landlady Admin profile
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  relatedEntityType?: 'PAYMENT' | 'BILL' | 'TICKET' | 'INQUIRY' | 'ROOM' | 'TENANT' | 'MESSAGE';
  relatedEntityId?: string;
}

export interface NotificationRecord {
  id: string;
  recipient_profile_id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

/**
 * Cache for administrator profile IDs to avoid redundant DB lookups.
 */
let cachedAdminProfileId: string | null = null;

async function getAdminProfileId(): Promise<string | null> {
  if (cachedAdminProfileId) return cachedAdminProfileId;

  const { data, error } = await db
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1);

  if (error || !data || data.length === 0) {
    console.warn('[NotificationService] No admin profile found in database.');
    return null;
  }

  cachedAdminProfileId = data[0].id;
  return cachedAdminProfileId;
}

export const notificationService = {
  /**
   * Dispatches a structured notification into public.notifications table.
   */
  async notify(options: CreateNotificationOptions): Promise<NotificationRecord | null> {
    try {
      let recipientId = options.recipientProfileId;

      // If no recipient is specified, route to Landlady Admin
      if (!recipientId) {
        recipientId = (await getAdminProfileId()) || undefined;
      }

      if (!recipientId) {
        console.warn('[NotificationService] Skipped notification dispatch — missing recipient ID.');
        return null;
      }

      const payload = {
        recipient_profile_id: recipientId,
        title: options.title,
        message: options.message,
        type: options.type,
        priority: options.priority || 'Medium',
        is_read: false,
        related_entity_type: options.relatedEntityType || null,
        related_entity_id: options.relatedEntityId || null,
      };

      const { data, error } = await db
        .from('notifications')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        console.error('[NotificationService] Failed to insert notification:', error.message);
        return null;
      }

      return data as NotificationRecord;
    } catch (err) {
      console.error('[NotificationService] Unexpected error during notification dispatch:', err);
      return null;
    }
  },

  /**
   * Retrieves notifications for a specific user profile with pagination & filtering.
   */
  async getNotifications(
    profileId: string,
    filters?: { isRead?: boolean; type?: string; limit?: number; offset?: number }
  ): Promise<{ notifications: NotificationRecord[]; totalUnread: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let query = db
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('recipient_profile_id', profileId)
      .order('created_at', { ascending: false })
      // Unique last key so "load more" cannot repeat or skip one (FINAL_REVIEW F8).
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }

    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[NotificationService] Error fetching notifications:', error.message);
      return { notifications: [], totalUnread: 0 };
    }

    // Get unread count
    const { count: unreadCount, error: unreadError } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_profile_id', profileId)
      .eq('is_read', false);

    // `unreadCount ?? 0` below. A failed count is not "nothing unread" - it
    // clears the badge, which is the one thing that tells her there is
    // something to look at. The list itself is already returned on its own
    // error above, so this only decides the number beside it; it is logged and
    // the badge is left off rather than being asserted as zero.
    if (unreadError) {
      console.error(
        `[NotificationService] the unread count could not be read for ${profileId}: ` +
        `${unreadError.message}. The badge will not be shown, which is not the same ` +
        'as there being nothing unread.'
      );
    }

    return {
      notifications: (data as NotificationRecord[]) ?? [],
      totalUnread: unreadCount ?? 0,
    };
  },

  /**
   * Marks a single notification as read.
   */
  async markAsRead(notificationId: string, profileId: string): Promise<boolean> {
    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('recipient_profile_id', profileId);

    if (error) {
      console.error('[NotificationService] Failed to mark notification as read:', error.message);
      return false;
    }
    return true;
  },

  /**
   * Marks all notifications as read for a profile.
   */
  async markAllAsRead(profileId: string): Promise<boolean> {
    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_profile_id', profileId)
      .eq('is_read', false);

    if (error) {
      console.error('[NotificationService] Failed to mark all notifications as read:', error.message);
      return false;
    }
    return true;
  },

  /**
   * Gets unread count for quick header badge updates.
   *
   * `null` means THE COUNT COULD NOT BE READ, which is not the same as nothing
   * being unread. This returned 0 on error, and the badge is polled every twelve
   * seconds - so one failed read cleared the one thing on screen that tells her
   * there is something waiting, and the next poll cleared it again.
   *
   * The sibling twenty lines above states this rule in so many words - "a failed
   * count is not 'nothing unread'" - and then returns `unreadCount ?? 0` anyway.
   * A comment is a claim with a date on it; both now do what that one says.
   */
  async getUnreadCount(profileId: string): Promise<number | null> {
    const { count, error } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_profile_id', profileId)
      .eq('is_read', false);

    if (error) {
      console.error(
        `[NotificationService] the unread count could not be read for ${profileId}: ` +
        `${error.message}. Answering with a failure rather than a zero, so the badge keeps ` +
        'whatever it last knew instead of going quiet.'
      );
      return null;
    }
    return count ?? 0;
  }
};
