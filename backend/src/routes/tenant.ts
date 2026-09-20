/**
 * @file routes/tenant.ts
 * @description Tenant self-service endpoints, scoped to the caller's own rows.
 * @systemBibleRef Section 4 (Tenant), Section 15 (Maintenance), Section 20 (Security)
 * @businessRules  BR-024 Tenant Privacy, BR-023 Ticket Closure, BR-013 Full Payment
 * @requirements   FR-010, FR-021, FR-022, FR-024
 *
 * Two independent controls apply to every route here:
 *
 *   1. `requirePermission` — does this role hold the capability at all?
 *   2. `resolveTenantScope` — which rows may THIS caller see?
 *
 * The second is what stops one tenant reading another's records. Room and
 * tenant identifiers are never taken from the request body; they are derived
 * server-side from the authenticated profile.
 */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/rbac.js';
import { resolveTenantScope, isEmptyScope, assertRoomInScope } from '../services/scopeService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { warnIfWriteFailed } from '../utils/checkedWrite.js';
import { auditFromRequest, clientIp } from '../services/auditService.js';
import { computeBillAmounts, computeBillPeriod, isOverdue, toCentavos, billAlreadyRaised }
  from '../services/billingService.js';
import { adyenService } from '../services/adyenService.js';
import { notificationService } from '../services/notificationService.js';
import { config } from '../config/env.js';

const router = Router();

// Everything below requires an authenticated, active account.
router.use('/tenant', requireAuth);

/**
 * GET /api/tenant/my-rooms
 * The rooms this tenant is (or was) responsible for — System Bible Section 8.
 */
router.get(
  '/tenant/my-rooms',
  requirePermission(PERMISSIONS.ROOM_READ_OWN),
  asyncHandler(async (req, res) => {
    const scope = await resolveTenantScope(req.user!.profileId);
    if (isEmptyScope(scope)) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const { data, error } = await db
      .from('room_assignments')
      .select(
        'id, start_date, end_date, anniversary_date, deposit_amount, occupant_count, ' +
          'is_primary_contact, is_active, ' +
          'rooms:room_id (id, room_number, floor, cluster_code, room_type, description, ' +
          'capacity, current_price, operational_status, available_from, is_linda_unit, ' +
          'room_photos (id, file_url, is_primary, display_order))'
      )
      .eq('tenant_profile_id', req.user!.profileId)
      .order('start_date', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

/**
 * Adds `effective_status` to each bill, and leaves `status` exactly as stored.
 *
 * FR-013 was recorded as MISSING for a real reason: nothing in this system ever
 * moves a bill from `Due` to `Overdue`. There is no handler, no scheduled job and
 * no trigger, so a bill issued in July still reads `Due` in September. The literal
 * 'Overdue' appears once in `backend/src`, as a filter value - it was never
 * written by anything.
 *
 * `billingService.isOverdue()` was written to answer exactly this and then called
 * by nothing at all. It is called here.
 *
 * Being overdue is a function of a date and the clock, so it is DERIVED on read
 * rather than stored. A stored flag is wrong from the moment the clock passes it
 * until some job catches up; a derived one is correct every time it is asked.
 * Nothing is written, so this cannot corrupt a ledger row.
 *
 * `status` is kept untouched beside it. The two differing is not a bug - it is the
 * difference between what the database holds and what is true today, and hiding
 * that would make the stored column look maintained when it is not.
 */
interface BillRow {
  id?: string;
  total_amount?: number | string | null;
  due_date: string;
  grace_period_end_date?: string | null;
  status: string;
  [key: string]: unknown;
}

type BillWithBalance<T> = T & {
  effective_status: string;
  amount_paid: number;
  amount_outstanding: number;
  /**
   * Money sent for this bill that the landlady has not confirmed yet.
   *
   * Deliberately NOT subtracted from `amount_outstanding`: BR-017 says the
   * gateway does not decide a debt is settled, so what is OWED is unchanged
   * until she verifies it. But the resident has to be able to see that their
   * payment arrived, or the screen shows a full balance with a live Pay button
   * five minutes after they paid - which is how somebody pays twice.
   *
   * Owed and sent are two different facts. The interface should show both.
   */
  amount_pending: number;
};

async function withEffectiveStatus<T extends BillRow>(
  bills: T[]
): Promise<BillWithBalance<T>[]> {
  const now = new Date();

  /**
   * BR-013 - the balance, alongside the status.
   *
   * A bill can now read 'Partially Paid', and a status with no balance beside it
   * tells the tenant they still owe something without telling them how much: the
   * bill's own `total_amount` is the debt as issued, not what is left of it.
   * Both figures are derived on read from the payments actually linked to the
   * bill, for the same reason `effective_status` is - a stored balance is wrong
   * from the moment a payment lands until something recomputes it.
   */
  const ids = bills
    .map((b) => b.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const paidByBill = new Map<string, number>();
  const pendingByBill = new Map<string, number>();

  if (ids.length > 0) {
    const { data: paid, error: paidError } = await db
      .from('payments')
      .select('bill_id, amount, verification_status')
      .in('bill_id', ids)
      .in('verification_status', ['Verified', 'Pending Verification']);

    // Not swallowed. Falling back to zero would report every bill as fully
    // outstanding, which reads as a demand for money the tenant has already paid.
    if (paidError) throw ApiError.internal(paidError.message);

    for (const pmt of paid ?? []) {
      const row = pmt as { bill_id: string | null; amount: number; verification_status: string };
      const key = String(row.bill_id);
      const bucket = row.verification_status === 'Verified' ? paidByBill : pendingByBill;
      bucket.set(key, (bucket.get(key) ?? 0) + Number(row.amount));
    }
  }

  return Promise.all(
    bills.map(async (b) => {
      const amountPaid = toCentavos(paidByBill.get(String(b.id)) ?? 0);
      const total = toCentavos(Number(b.total_amount ?? 0));
      return {
        ...b,
        effective_status: (await isOverdue(b, now)) ? 'Overdue' : b.status,
        amount_paid: amountPaid,
        // Clamped at zero: an overpayment is an advance, not a negative debt.
        amount_outstanding: toCentavos(Math.max(0, total - amountPaid)),
        amount_pending: toCentavos(pendingByBill.get(String(b.id)) ?? 0),
      };
    })
  );
}

/**
 * Money already sent for this bill that the administrator has not yet verified.
 *
 * `outstandingOnBill` counts VERIFIED payments only, which is right for what is
 * owed - the gateway does not get to decide a debt is settled (BR-017). But it
 * means a bill paid five minutes ago still reports its full balance, and the
 * checkout route was refusing only `status === 'Paid'`.
 *
 * So: resident pays 6,900 in GCash. The webhook writes the row `Pending
 * Verification`. The bill still reads 6,900 outstanding with a live Pay button.
 * They tap it again - having seen a confirmation toast and an unchanged bill,
 * on a phone - and a SECOND session for 6,900 is created and accepted. Two
 * pspReferences, so neither the idempotency lookup nor migration 040's index
 * sees a duplicate. 13,800 has left their GCash against a 6,900 debt, and if
 * both are verified the ledger books both.
 *
 * Rejected payments are excluded deliberately: a refused attempt must not block
 * a real one.
 */
async function pendingOnBill(billId: string): Promise<number> {
  const { data: pending, error } = await db
    .from('payments')
    .select('amount')
    .eq('bill_id', billId)
    .eq('verification_status', 'Pending Verification');

  // Not swallowed. Reading zero here would reopen the double-charge this exists
  // to close, which is the one outcome worth failing the request over.
  if (error) throw ApiError.internal(error.message);

  return toCentavos(
    (pending ?? []).reduce((sum, p) => sum + Number((p as { amount: number }).amount), 0)
  );
}

/**
 * What is still owed on a bill: its total, less every verified payment already
 * linked to it. BR-013.
 *
 * A bill that is 'Partially Paid' has a total that is no longer what the tenant
 * owes, and charging `total_amount` would take the settled portion a second
 * time. Derived on read for the same reason the balance on `withEffectiveStatus`
 * is - a stored figure is wrong from the moment a payment lands.
 */
async function outstandingOnBill(billId: string, totalAmount: number): Promise<number> {
  const { data: paid, error } = await db
    .from('payments')
    .select('amount')
    .eq('bill_id', billId)
    .eq('verification_status', 'Verified');

  // Not swallowed. A zero fallback would silently charge the full original
  // amount, which is precisely the overcharge this function exists to prevent.
  if (error) throw ApiError.internal(error.message);

  const alreadyPaid = (paid ?? []).reduce((sum, p) => sum + Number((p as { amount: number }).amount), 0);
  return toCentavos(Math.max(0, toCentavos(totalAmount) - toCentavos(alreadyPaid)));
}

/**
 * GET /api/tenant/my-bills
 * FR-011/FR-013 — the tenant's own billing status, including grace period.
 */
router.get(
  '/tenant/my-bills',
  requirePermission(PERMISSIONS.BILL_READ_OWN),
  asyncHandler(async (req, res) => {
    const { data, error } = await db
      .from('bills')
      .select(
        'id, bill_type, billing_period_start, billing_period_end, rent_amount, ' +
          'water_amount, total_amount, due_date, grace_period_end_date, status, created_at, ' +
          'rooms:room_id (id, room_number)'
      )
      .eq('tenant_profile_id', req.user!.profileId)
      .order('due_date', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    // The generated Supabase types widen an embedded relation into a union that
    // includes an error shape; the runtime rows are plain objects.
    const bills = (data ?? []) as unknown as BillRow[];
    res.status(200).json({ success: true, data: await withEffectiveStatus(bills) });
  })
);

/**
 * GET /api/tenant/my-payments
 * FR-016 — a tenant can see their own payment verification status but cannot
 * change it; verification stays with the administrator (BR-017).
 */
router.get(
  '/tenant/my-payments',
  requirePermission(PERMISSIONS.PAYMENT_READ_OWN),
  asyncHandler(async (req, res) => {
    const { data, error } = await db
      .from('payments')
      .select(
        'id, bill_id, amount, payment_method, payment_source, verification_status, ' +
          'transaction_reference, paid_at, verified_at, created_at, ' +
          'rooms:room_id (id, room_number)'
      )
      .eq('tenant_profile_id', req.user!.profileId)
      .order('paid_at', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

/**
 * GET /api/tenant/my-income-records
 * Allow tenants to retrieve their verified income records ledger to determine rent coverage.
 */
router.get(
  '/tenant/my-income-records',
  requirePermission(PERMISSIONS.PAYMENT_READ_OWN),
  asyncHandler(async (req, res) => {
    const { data, error } = await db
      .from('monthly_income_records')
      /**
       * `gbg_fee` is selected because the screen is showing the resident what
       * they handed over, and `remitted_amount` is not that number.
       *
       * It is `GENERATED ALWAYS AS (rent_amount + water_payment)` - garbage is a
       * SEPARATE column (BR-037, PHP 20 per unit per month), so a receipt that
       * carried one read on the portal as less than the paper in their hand, by
       * exactly the garbage fee, with nothing on the page to explain the gap.
       *
       * The income export keeps extra charges on their own lines for the same
       * reason and says so twice. The column is right; reading it as the total
       * was the mistake.
       */
      .select('id, rent_period_start, rent_period_end, date_paid, remitted_amount, gbg_fee, ' +
              'payment_method, verification_status')
      .eq('tenant_profile_id', req.user!.profileId)
      .order('date_paid', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

/**
 * GET /api/tenant/my-tickets
 * FR-024 — a tenant can view the status of their own tickets.
 */
router.get(
  '/tenant/my-tickets',
  requirePermission(PERMISSIONS.TICKET_READ_OWN),
  asyncHandler(async (req, res) => {
    const { data, error } = await db
      .from('maintenance_tickets')
      /**
       * The tenant's own attachments come back with the ticket.
       *
       * They did not, and the effect was quiet: a resident photographs a leaking pipe,
       * attaches it, submits, and can never see it again. The administrator's list selects
       * `ticket_attachments` and always has; this one did not, so the only person who could
       * not see the photo was the person who took it.
       */
      .select(
        'id, title, description, category, priority, status, created_at, resolved_at, ' +
          'closed_at, rooms:room_id (id, room_number), ' +
          'ticket_attachments (id, file_url, file_type)'
      )
      .eq('tenant_profile_id', req.user!.profileId)
      .order('created_at', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const ticketSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(4000),
  category: z.string().min(2).max(60),
  priority: z.enum(['Emergency', 'High', 'Medium', 'Low']),
  /**
   * `fileUrl` is deliberately uncapped, and this is the reasoning rather than an oversight.
   *
   * Two mechanisms are in the live data: one attachment is a real
   * `https://storage.hivelet.…` URL of 50 characters, the other a 142,351-character
   * `data:image/jpeg;base64,…` string, because the current client reads the file with
   * `FileReader` and posts the data URL rather than uploading it first.
   *
   * A length cap looks like the obvious guard and is not. Any cap tight enough to reject a
   * data URL rejects every photo the current client produces - it would not harden the
   * endpoint, it would switch the feature off. The bound that genuinely applies is
   * `express.json({ limit: '1mb' })` in `server.ts`, which caps the request; ten attachments
   * cannot together exceed it.
   *
   * Moving attachments to object storage is the real answer and it is a storage decision with
   * a cost attached, not a validation change. Recorded here so the next reader does not add a
   * cap thinking it is free.
   */
  attachments: z
    .array(z.object({ fileUrl: z.string().min(1), fileType: z.string().max(80).optional() }))
    .max(10)
    .optional(),
});

/**
 * POST /api/tenant/tickets
 * FR-021/FR-022/BR-021 — a tenant raises an issue with a priority and photos.
 *
 * `tenant_profile_id` is taken from the token, and the room is checked against
 * the caller's own assignments, so a tenant cannot file a ticket against a room
 * they do not occupy.
 */
router.post(
  '/tenant/tickets',
  requirePermission(PERMISSIONS.TICKET_CREATE_OWN),
  asyncHandler(async (req, res) => {
    const parsed = ticketSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid ticket payload.', parsed.error.flatten().fieldErrors);
    }
    const input = parsed.data;

    const scope = await resolveTenantScope(req.user!.profileId);
    assertRoomInScope(scope, input.roomId);

    const { data, error } = await db
      .from('maintenance_tickets')
      .insert({
        room_id: input.roomId,
        tenant_profile_id: req.user!.profileId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        // BR-022 — a new ticket is immediately visible to the administrator.
        status: 'Submitted',
      })
      .select('id, title, priority, status, created_at')
      .single();

    if (error) throw ApiError.internal(error.message);

    /**
     * The ticket is already committed by this point, so a failure here must NOT
     * throw.
     *
     * It used to. The consequence was the opposite of what it looked like: the
     * tenant saw "Submission failed", the ticket existed and was already visible
     * to the administrator under BR-022, and the obvious response - submit it
     * again - filed the same complaint twice. A leak got two tickets and the
     * administrator had to work out that they were one leak.
     *
     * This is exactly the case `utils/checkedWrite.ts` describes: a write that
     * is secondary to one which has already committed. A ticket without its
     * photo is still an actionable ticket; a duplicate ticket plus an error is
     * worse than a missing photo.
     *
     * Not silent, though. The tenant is told the photo did not attach so they
     * can add it to the ticket thread, rather than believing it is there.
     */
    let attachmentWarning: string | null = null;

    if (input.attachments?.length) {
      const attachResult = await db.from('ticket_attachments').insert(
        input.attachments.map((a) => ({
          ticket_id: data.id,
          file_url: a.fileUrl,
          file_type: a.fileType ?? null,
        }))
      );
      warnIfWriteFailed(attachResult, `Ticket ${data.id} attachments`);
      if (attachResult.error) {
        attachmentWarning =
          input.attachments.length === 1
            ? 'Your ticket was filed, but the photo could not be attached. Do not submit ' +
              'the ticket again - reply to it with the photo instead.'
            : 'Your ticket was filed, but the photos could not be attached. Do not submit ' +
              'the ticket again - reply to it with the photos instead.';
      }
    }

    await auditFromRequest(req, {
      action: 'TICKET_CREATE',
      entityType: 'TICKET',
      entityId: data.id,
      newValues: { room_id: input.roomId, priority: input.priority, title: input.title },
    });

    // Notify Landlady about the new maintenance ticket
    await notificationService.notify({
      title: `New Maintenance Ticket (${input.priority || 'Medium'})`,
      message: `Tenant submitted ticket "${input.title}" (Priority: ${input.priority || 'Medium'}).`,
      type: 'Maintenance',
      priority: (input.priority as any) || 'Medium',
      relatedEntityType: 'TICKET',
      relatedEntityId: data.id,
    });

    res.status(201).json({ success: true, data: { ...data, attachmentWarning } });
  })
);

const messageSchema = z.object({ message: z.string().min(1).max(2000) });

/**
 * GET /api/tenant/tickets/:ticketId/messages
 * Retrieves conversation thread for tenant's own ticket.
 */
router.get(
  '/tenant/tickets/:ticketId/messages',
  requirePermission(PERMISSIONS.TICKET_READ_OWN),
  asyncHandler(async (req, res) => {
    const { data: ticket } = await db
      .from('maintenance_tickets')
      .select('id, tenant_profile_id')
      .eq('id', req.params.ticketId)
      .maybeSingle<{ id: string; tenant_profile_id: string }>();

    if (!ticket || ticket.tenant_profile_id !== req.user!.profileId) {
      throw ApiError.notFound('Ticket not found.');
    }

    const { data, error } = await db
      .from('ticket_messages')
      .select('*, profiles:sender_id (id, full_name, role)')
      .eq('ticket_id', req.params.ticketId)
      .order('created_at', { ascending: true });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

/**
 * POST /api/tenant/tickets/:ticketId/messages
 * System Bible Section 16 — communication stays attached to its ticket.
 */
router.post(
  '/tenant/tickets/:ticketId/messages',
  requirePermission(PERMISSIONS.TICKET_COMMENT_OWN),
  asyncHandler(async (req, res) => {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid message payload.', parsed.error.flatten().fieldErrors);
    }

    // Ownership check: 404 rather than 403, so a tenant cannot probe for the
    // existence of other tenants' tickets.
    const { data: ticket, error: ticketError } = await db
      .from('maintenance_tickets')
      .select('id, title, tenant_profile_id, status')
      .eq('id', req.params.ticketId)
      .maybeSingle<{ id: string; title: string; tenant_profile_id: string; status: string }>();

    if (ticketError) throw ApiError.internal(ticketError.message);
    if (!ticket || ticket.tenant_profile_id !== req.user!.profileId) {
      throw ApiError.notFound('Ticket not found.');
    }
    if (ticket.status === 'Closed') {
      throw ApiError.conflict('This ticket is closed. Contact the administrator to reopen it.');
    }

    const { data, error } = await db
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: req.user!.profileId,
        message_body: parsed.data.message,
      })
      .select('id, ticket_id, message_body, created_at')
      .single();

    if (error) throw ApiError.internal(error.message);

    // Notify Landlady about the tenant's reply
    await notificationService.notify({
      title: 'Tenant Commented on Ticket',
      message: `Tenant commented on ticket "${ticket.title}": "${parsed.data.message.slice(0, 80)}${parsed.data.message.length > 80 ? '...' : ''}"`,
      type: 'Maintenance',
      priority: 'Medium',
      relatedEntityType: 'TICKET',
      relatedEntityId: ticket.id,
    });

    // BR-028 - a tenant's message on their own ticket is part of the record too.
    await auditFromRequest(req, {
      action: 'TICKET_MESSAGE_SEND',
      entityType: 'TICKET',
      entityId: req.params.ticketId,
      newValues: { messageId: data?.id }
    });

    res.status(201).json({ success: true, data });
  })
);

/**
 * GET /api/tenant/my-notifications
 * FR-027 — notifications addressed to this profile only.
 */
router.get(
  '/tenant/my-notifications',
  requirePermission(PERMISSIONS.NOTIFICATION_READ_OWN),
  asyncHandler(async (req, res) => {
    const isReadParam = req.query.is_read;
    const isRead = isReadParam !== undefined ? isReadParam === 'true' : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    const result = await notificationService.getNotifications(req.user!.profileId, {
      isRead,
      type,
      limit,
      offset,
    });

    /**
     * `totalUnread` belongs under `meta`, not beside `data`.
     *
     * The client envelope is `{ success, data, meta? }` and `requestEnvelope()`
     * returns exactly `{ data: payload.data, meta: payload.meta }` - every other
     * top-level key is dropped on the floor. This endpoint sent `totalUnread` as
     * a sibling of `data`, so the number never reached the browser at all, no
     * matter which helper called it. `/admin/audit-logs` already does this
     * correctly with `meta.businessTotal`; this one did not.
     */
    res.status(200).json({
      success: true,
      data: result.notifications,
      meta: { totalUnread: result.totalUnread },
    });
  })
);

router.patch(
  '/tenant/my-notifications/:id/read',
  requirePermission(PERMISSIONS.NOTIFICATION_READ_OWN),
  asyncHandler(async (req, res) => {
    /**
     * A 200 that says `success: false` is a contradiction, and nothing could
     * act on it: `api.patch` unwraps the envelope to `data`, so the browser
     * never saw the flag at all. It greyed the item out, decremented the badge,
     * and the row stayed unread until the next poll brought it back.
     *
     * `markAsRead` returns false only on a database error - a row that is not
     * the caller's simply matches nothing, which is a no-op and correctly a
     * success. So false here means the write failed, and that is a 500.
     */
    const ok = await notificationService.markAsRead(req.params.id, req.user!.profileId);
    if (!ok) throw ApiError.internal('The notification could not be marked as read.');
    res.status(200).json({ success: true, data: { is_read: true } });
  })
);

router.post(
  '/tenant/my-notifications/mark-all-read',
  requirePermission(PERMISSIONS.NOTIFICATION_READ_OWN),
  asyncHandler(async (req, res) => {
    const ok = await notificationService.markAllAsRead(req.user!.profileId);
    if (!ok) throw ApiError.internal('The notifications could not be marked as read.');
    res.status(200).json({ success: true, data: { markedAllRead: true } });
  })
);

const checkoutSchema = z.object({
  billId: z.string().uuid().optional(),
  returnUrl: z.string().optional(),
});

/**
 * POST /api/tenant/payments/checkout
 *
 * Opens an Adyen Checkout session for an unpaid bill. BR-016 and BR-017.
 *
 * This said "mock Adyen checkout session", and it is not one. `isLiveConfigured()` is true
 * whenever real credentials are present - they are - and the session is created against
 * `https://checkout-test.adyen.com/v71/sessions`. The local cashier page is the fallback for
 * an environment with no credentials at all, and both of its routes return 404 the moment a
 * gateway is configured.
 *
 * Returns `{ sessionId, sessionData, clientKey, environment, isLive }` for the Adyen Web
 * component to mount. There is no redirect URL in this flow.
 */
router.post(
  '/tenant/payments/checkout',
  requirePermission(PERMISSIONS.PAYMENT_READ_OWN),
  asyncHandler(async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid checkout payload.', parsed.error.flatten().fieldErrors);
    }
    const { returnUrl } = parsed.data;
    let targetBillId = parsed.data.billId;
    // Starts at zero deliberately. Every path below either resolves a real bill total or
    // throws; a non-zero seed here previously meant a failed lookup could charge P4,700.
    let billTotalAmount = 0;

    if (targetBillId) {
      // Validate that the bill exists, belongs to this tenant, and is unpaid
      const { data: bill, error } = await db
        .from('bills')
        .select('id, total_amount, status, tenant_profile_id')
        .eq('id', targetBillId)
        .single();

      if (error || !bill) {
        throw ApiError.notFound('Bill not found.');
      }

      if (bill.tenant_profile_id !== req.user!.profileId) {
        throw ApiError.forbidden('You are not authorized to pay this bill.');
      }

      if (bill.status === 'Paid') {
        throw ApiError.conflict('This bill is already paid.');
      }

      // The guard that stops a resident paying twice. See `pendingOnBill`.
      const alreadySent = await pendingOnBill(bill.id);
      if (alreadySent > 0) {
        throw ApiError.conflict(
          `A payment of ₱${alreadySent.toLocaleString('en-PH', { minimumFractionDigits: 2 })} ` +
          'for this bill has already been received and is waiting for the landlady to confirm ' +
          'it. Nothing further is owed right now, and you have not been charged again. It will ' +
          'show as paid once she has checked it.'
        );
      }

      // The BALANCE, not the debt as issued - a partially paid bill would
      // otherwise be charged in full a second time. BR-013.
      billTotalAmount = await outstandingOnBill(bill.id, Number(bill.total_amount));

      if (billTotalAmount <= 0) {
        throw ApiError.conflict(
          'This bill has already been paid in full. Nothing is outstanding on it.'
        );
      }
    } else {
      // Auto-resolve latest unpaid bill or create one for the occupied unit
      const { data: existingBills, error: existingBillsError } = await db
        .from('bills')
        .select('id, total_amount, status')
        .eq('tenant_profile_id', req.user!.profileId)
        .order('due_date', { ascending: false });

      // Read as "this resident has no bills", the else branch below raises a
      // fresh one - so a failed query bills someone who already owed for the
      // period a second time, and their payment lands against the new bill while
      // the original stays outstanding.
      if (existingBillsError) throw ApiError.internal(existingBillsError.message);

      const unpaid = existingBills?.find((b: any) => b.status !== 'Paid');
      if (unpaid) {
        targetBillId = unpaid.id;
        billTotalAmount = await outstandingOnBill(unpaid.id, Number(unpaid.total_amount));
      } else {
        // Raise the current cycle's bill for the tenant's OWN active unit.
        //
        // This block previously fell back to `SELECT id, current_price FROM rooms LIMIT 1`
        // when the tenant had no assignment, and billed them against that arbitrary room at
        // a hardcoded P4,500 if its price was also missing. That could attach a financial
        // record to a unit the tenant has never occupied. A tenant with no active tenancy
        // now gets a 409 instead.
        const { data: assignment, error: assignmentError } = await db
          .from('room_assignments')
          .select('room_id, occupant_count, anniversary_date, rooms:room_id (room_number, current_price)')
          .eq('tenant_profile_id', req.user!.profileId)
          .eq('is_active', true)
          .maybeSingle();

        if (assignmentError) throw ApiError.internal(assignmentError.message);

        const room = assignment?.rooms as { room_number?: string; current_price?: number } | null;

        if (!assignment?.room_id || !room?.room_number) {
          throw ApiError.conflict(
            'You have no active unit, so there is nothing to bill. Contact the administrator ' +
            'if you believe this is wrong.'
          );
        }

        // BR-014 / BR-040 - the water rate and any Linda fixed charge come from
        // system_settings, never from a literal. BR-033 - the period runs on the tenancy
        // anniversary. BR-012 / OD-16 - there is no grace period, so grace ends on the due date.
        const amounts = await computeBillAmounts({
          roomNumber: room.room_number,
          currentPrice: Number(room.current_price) || 0,
          occupants: Number(assignment.occupant_count) || 1
        });

        if (amounts.totalAmount <= 0) {
          throw ApiError.conflict(
            'This unit has no rate set, so a bill cannot be raised. Contact the administrator.'
          );
        }

        // BR-033 - the cycle runs on the tenancy anniversary day, not the calendar month.
        const period = await computeBillPeriod(assignment.anniversary_date ?? new Date());

        const { data: newBill, error: billError } = await db
          .from('bills')
          .insert({
            tenant_profile_id: req.user!.profileId,
            room_id: assignment.room_id,
            // 'Combined' is a real `bill_type_enum` value. This previously read
            // 'Monthly Rent', which is not, so the insert failed with 22P02 every time.
            bill_type: 'Combined',
            billing_period_start: period.billingPeriodStart,
            billing_period_end: period.billingPeriodEnd,
            due_date: period.dueDate,
            grace_period_end_date: period.gracePeriodEndDate,
            rent_amount: amounts.rentAmount,
            water_amount: amounts.waterAmount,
            total_amount: amounts.totalAmount,
            status: 'Due'
          })
          .select('id, total_amount')
          .single();

        /**
         * A double-tap on Pay sends two of these at once. Both read "no unpaid
         * bills" above and both insert, because supabase-js cannot put the
         * check and the write in one transaction. Migration 038's unique index
         * refuses the second - and the right answer to that refusal is not an
         * error. The tenant wanted a bill for this period and there is one, so
         * read the one the other request just made and continue with it.
         *
         * Anything else is still fatal. The error was previously discarded
         * outright, which left the request carrying on with a fabricated total.
         */
        if (billAlreadyRaised(billError)) {
          const { data: raced, error: racedError } = await db
            .from('bills')
            .select('id, total_amount')
            .eq('tenant_profile_id', req.user!.profileId)
            .eq('billing_period_start', period.billingPeriodStart)
            .eq('bill_type', 'Combined')
            .maybeSingle();

          if (racedError || !raced) {
            throw ApiError.internal(
              'A bill for this period was raised by another request, but could not be read ' +
              'back. Try again.'
            );
          }

          targetBillId = raced.id;
          billTotalAmount = await outstandingOnBill(raced.id, Number(raced.total_amount));
        } else if (billError) {
          throw ApiError.internal(billError.message);
        } else {
          targetBillId = newBill.id;
          billTotalAmount = Number(newBill.total_amount);
        }
      }
    }

    // Every path above either resolves a real bill or throws. This used to
    // fabricate `bill_demo_<timestamp>` here instead, which meant a checkout
    // session - and a real Adyen session, with a real amount - could be opened
    // against a bill id that referenced nothing. The payment that came back had
    // nowhere to attach.
    if (!targetBillId || billTotalAmount <= 0) {
      throw ApiError.conflict(
        'No unpaid bill could be resolved for your account, so there is nothing to pay. ' +
        'Contact the administrator if you believe this is wrong.'
      );
    }

    // Initialize Adyen checkout session (Hybrid: live or mock sandbox)
    const sessionRes = await adyenService.createCheckoutSession(
      targetBillId,
      req.user!.profileId,
      billTotalAmount,
      returnUrl
    );

    // Create audit entry for checkout initiation
    await auditFromRequest(req, {
      action: 'PAYMENT_RECORD',
      entityType: 'BILL',
      entityId: /^[0-9a-fA-F-]{36}$/.test(targetBillId) ? targetBillId : '00000000-0000-0000-0000-000000000000',
      newValues: { status: 'Checkout Session Initiated', sessionId: sessionRes.sessionId, isLive: sessionRes.isLive }
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId: sessionRes.sessionId,
        sessionData: sessionRes.sessionData,
        clientKey: sessionRes.clientKey,
        environment: sessionRes.environment,
        // Only the local development checkout has a page of ours to redirect to.
        // A real Adyen session is paid inside the Drop-in on the tenant's own
        // page; there is no Hivelet-hosted cashier in that flow.
        redirectUrl:
          'redirectUrl' in sessionRes && sessionRes.redirectUrl
            ? `http://localhost:${config.port}${sessionRes.redirectUrl}`
            : null,
        isLive: sessionRes.isLive
      }
    });
  })
);

/**
 * `sessionResult` is the opaque token Adyen hands the browser when checkout ends.
 * It is required, because it is the only part of this payload the server can
 * actually check - it gets passed back to Adyen over a server-to-server call. The
 * previous schema accepted a `resultCode` and a `pspReference` from the browser
 * and trusted both; neither is evidence of anything.
 */
const verifySessionSchema = z.object({
  sessionId: z.string().min(1).max(200),
  sessionResult: z.string().min(1).max(4096),
});

/**
 * POST /api/tenant/payments/adyen/verify-session
 *
 * Asks Adyen what became of a checkout session and reports it back to the payer.
 * **It records no payment.** The HMAC-verified webhook is the only writer of an
 * `Adyen Online` row - see the note at the top of `services/adyenService.ts`.
 *
 * This route previously inserted a payment straight from the browser's say-so,
 * under a locally invented reference. Two things were wrong with that: a tenant
 * could put a row in the landlady's verification queue without paying anything,
 * and when the real webhook arrived it could not recognise the row (it matches on
 * `transaction_reference = pspReference`, which the browser never learns), so the
 * same payment was banked twice.
 */
router.post(
  '/tenant/payments/adyen/verify-session',
  requirePermission(PERMISSIONS.PAYMENT_READ_OWN),
  asyncHandler(async (req, res) => {
    const parsed = verifySessionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid verification payload.', parsed.error.flatten().fieldErrors);
    }
    const { sessionId, sessionResult } = parsed.data;

    const result = await adyenService.confirmCheckout(
      sessionId,
      sessionResult,
      req.user!.profileId
    );

    res.status(200).json({
      success: true,
      data: {
        // Adyen's own word for the session's state.
        gatewayStatus: result.status,
        confirmed: result.confirmed,
        // Whether the webhook's payment row has landed yet. It usually arrives
        // within seconds, and the payment is real either way - this only tells
        // the UI whether to say "recorded" or "being recorded".
        recorded: result.recorded,
        status: 'Pending Verification',
      },
    });
  })
);

/**
 * GET /api/tenant/my-profile
 * FR-010 — returns the tenant's own profile data for display and editing.
 * Only permitted personal fields are exposed; password_hash is never sent.
 */
router.get(
  '/tenant/my-profile',
  requirePermission(PERMISSIONS.PROFILE_READ_OWN),
  asyncHandler(async (req, res) => {
    const { data, error } = await db
      .from('profiles')
      .select(
        'id, email, full_name, phone_number, emergency_contact_name, ' +
          'emergency_contact_phone, occupation, facebook_url, role, account_status, created_at'
      )
      .eq('id', req.user!.profileId)
      .single();

    if (error) throw ApiError.internal(error.message);
    if (!data) throw ApiError.notFound('Profile not found.');

    res.status(200).json({ success: true, data });
  })
);

/**
 * Validation schema for tenant-editable fields.
 * System Bible Section 19: phone, emergency contact, occupation, Facebook.
 * Full name, email, role, and account status are NOT tenant-editable.
 */
const profileUpdateSchema = z.object({
  phone_number: z.string().max(50).optional().nullable(),
  emergency_contact_name: z.string().max(150).optional().nullable(),
  emergency_contact_phone: z.string().max(50).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  facebook_url: z.string().max(255).optional().nullable(),
});

/**
 * PUT /api/tenant/my-profile
 * FR-010 — tenant self-service profile update for permitted fields only.
 * Server-side enforcement: only the 5 allowed columns are written, regardless
 * of what the client sends. The profile ID comes from the JWT, not the body.
 */
router.put(
  '/tenant/my-profile',
  requirePermission(PERMISSIONS.PROFILE_UPDATE_OWN),
  asyncHandler(async (req, res) => {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid profile payload.', parsed.error.flatten().fieldErrors);
    }

    const updates = parsed.data;

    const { data, error } = await db
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user!.profileId)
      .select(
        'id, email, full_name, phone_number, emergency_contact_name, ' +
          'emergency_contact_phone, occupation, facebook_url, role, account_status'
      )
      .single();

    if (error) throw ApiError.internal(error.message);

    await auditFromRequest(req, {
      action: 'PROFILE_UPDATE',
      entityType: 'PROFILE',
      entityId: req.user!.profileId,
      newValues: updates,
    });

    res.status(200).json({ success: true, data });
  })
);

export default router;
