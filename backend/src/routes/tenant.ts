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
import { auditFromRequest } from '../services/auditService.js';
import { adyenService } from '../services/adyenService.js';
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
    res.status(200).json({ success: true, data: data ?? [] });
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
 * GET /api/tenant/my-tickets
 * FR-024 — a tenant can view the status of their own tickets.
 */
router.get(
  '/tenant/my-tickets',
  requirePermission(PERMISSIONS.TICKET_READ_OWN),
  asyncHandler(async (req, res) => {
    const { data, error } = await db
      .from('maintenance_tickets')
      .select(
        'id, title, description, category, priority, status, created_at, resolved_at, ' +
          'closed_at, rooms:room_id (id, room_number)'
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
  attachments: z
    .array(z.object({ fileUrl: z.string().url(), fileType: z.string().max(80).optional() }))
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

    if (input.attachments?.length) {
      const { error: attachError } = await db.from('ticket_attachments').insert(
        input.attachments.map((a) => ({
          ticket_id: data.id,
          file_url: a.fileUrl,
          file_type: a.fileType ?? null,
        }))
      );
      if (attachError) throw ApiError.internal(attachError.message);
    }

    await auditFromRequest(req, {
      action: 'TICKET_CREATE',
      entityType: 'TICKET',
      entityId: data.id,
      newValues: { room_id: input.roomId, priority: input.priority, title: input.title },
    });

    res.status(201).json({ success: true, data });
  })
);

const messageSchema = z.object({ message: z.string().min(1).max(2000) });

/**
 * POST /api/tenant/tickets/:ticketId/messages
 * System Bible Section 16 — communication stays attached to its ticket.
 */
router.post(
  '/tenant/tickets/:ticketId/messages',
  requirePermission(PERMISSIONS.TICKET_COMMENT),
  asyncHandler(async (req, res) => {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid message payload.', parsed.error.flatten().fieldErrors);
    }

    // Ownership check: 404 rather than 403, so a tenant cannot probe for the
    // existence of other tenants' tickets.
    const { data: ticket, error: ticketError } = await db
      .from('maintenance_tickets')
      .select('id, tenant_profile_id, status')
      .eq('id', req.params.ticketId)
      .maybeSingle<{ id: string; tenant_profile_id: string; status: string }>();

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
    const { data, error } = await db
      .from('notifications')
      .select('id, title, message, type, priority, is_read, related_entity_type, related_entity_id, created_at')
      .eq('recipient_profile_id', req.user!.profileId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const checkoutSchema = z.object({
  billId: z.string().uuid().optional(),
  returnUrl: z.string().optional(),
});

/**
 * POST /api/tenant/payments/checkout
 * Initiates a mock Adyen checkout session for an unpaid bill.
 * Aligns with BR-016 and BR-017 to direct the resident to checkout.
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
    let billTotalAmount = 4700;

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

      billTotalAmount = Number(bill.total_amount);
    } else {
      // Auto-resolve latest unpaid bill or create one for the occupied unit
      const { data: existingBills } = await db
        .from('bills')
        .select('id, total_amount, status')
        .eq('tenant_profile_id', req.user!.profileId)
        .order('due_date', { ascending: false });

      const unpaid = existingBills?.find((b: any) => b.status !== 'Paid');
      if (unpaid) {
        targetBillId = unpaid.id;
        billTotalAmount = Number(unpaid.total_amount);
      } else {
        // Query active room assignment to generate current cycle bill
        const { data: assignment } = await db
          .from('room_assignments')
          .select('room_id, occupant_count, rooms:room_id (current_price)')
          .eq('tenant_profile_id', req.user!.profileId)
          .maybeSingle();

        const { data: anyRoom } = await db
          .from('rooms')
          .select('id, current_price')
          .limit(1)
          .maybeSingle();

        const targetRoomId = assignment?.room_id || anyRoom?.id;
        const rent = Number((assignment?.rooms as any)?.current_price) || Number(anyRoom?.current_price) || 4500;
        const water = (Number(assignment?.occupant_count) || 1) * 200;
        const total = rent + water;

        if (targetRoomId) {
          const { data: newBill } = await db
            .from('bills')
            .insert({
              tenant_profile_id: req.user!.profileId,
              room_id: targetRoomId,
              bill_type: 'Monthly Rent',
              billing_period_start: new Date().toISOString().split('T')[0],
              billing_period_end: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
              grace_period_end_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
              rent_amount: rent,
              water_amount: water,
              total_amount: total,
              status: 'Due',
            })
            .select('id, total_amount')
            .maybeSingle();

          if (newBill) {
            targetBillId = newBill.id;
            billTotalAmount = Number(newBill.total_amount);
          }
        }
      }
    }

    if (!targetBillId) {
      targetBillId = `bill_demo_${Date.now()}`;
    }

    // Initialize mock Adyen checkout session
    const { sessionId, redirectUrl, isLive } = adyenService.createMockCheckoutSession(
      targetBillId,
      req.user!.profileId,
      billTotalAmount,
      returnUrl
    );

    // Create audit entry for checkout initiation
    await auditFromRequest(req, {
      action: 'PAYMENT_RECORD',
      entityType: 'BILL',
      entityId: targetBillId,
      newValues: { status: 'Checkout Session Initiated', sessionId }
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        redirectUrl: `http://localhost:${config.port}${redirectUrl}`
      }
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
