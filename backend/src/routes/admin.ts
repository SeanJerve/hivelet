/**
 * @file routes/admin.ts
 * @description Administrator-only endpoints.
 * @systemBibleRef Section 4 (Administrator), Section 14 (Auditability), Section 17 (Dashboard)
 * @businessRules  BR-017 Payment Verification, BR-018 Payment Correction,
 *                 BR-023 Ticket Closure, BR-028 Auditability,
 *                 BR-048 Admin-Only Authorship of Income/Expense Ledgers
 * @requirements   FR-005, FR-007, FR-009, FR-014, FR-016, FR-017, FR-025, FR-029, FR-043
 *
 * The whole router is gated by `requireAuth` + `requireAdmin`, so no individual
 * handler can be reached by a tenant even if a permission check were forgotten.
 * Per-route `requirePermission` calls remain as documentation of intent and as
 * a second barrier.
 */
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import { requireAuth, requireAdmin, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../config/rbac.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { auditFromRequest } from '../services/auditService.js';

const router = Router();

// BR-048 and System Bible Section 20: administrator-only, without exception.
router.use('/admin', requireAuth, requireAdmin);

/* ========================================================================== *
 * ROOMS — FR-007, FR-008
 * ========================================================================== */

router.get(
  '/admin/rooms',
  requirePermission(PERMISSIONS.ROOM_READ_ALL),
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from('rooms')
      .select('*, clusters:cluster_code (code, name, display_order)')
      .order('room_number');

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const roomInsertSchema = z.object({
  cluster_code: z.string().min(1),
  room_number: z.string().min(1),
  floor: z.number().int().min(1).optional(),
  room_type: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  current_price: z.number().min(0),
  description: z.string().optional(),
  operational_status: z.enum(['Available', 'Reserved', 'Occupied', 'Under Maintenance']).optional(),
  visibility_status: z.enum(['Published', 'Hidden']).optional(),
  is_linda_unit: z.boolean().optional(),
});

/**
 * POST /api/admin/rooms
 */
router.post(
  '/admin/rooms',
  requirePermission(PERMISSIONS.ROOM_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = roomInsertSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid room payload.', parsed.error.flatten().fieldErrors);
    }

    const { data, error } = await db
      .from('rooms')
      .insert({
        ...parsed.data,
        base_price: parsed.data.current_price
      })
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    await auditFromRequest(req, {
      action: 'ROOM_UPDATE',
      entityType: 'ROOM',
      entityId: data.id,
      newValues: data
    });

    res.status(201).json({ success: true, data });
  })
);

const roomUpdateSchema = z.object({
  description: z.string().max(2000).nullish(),
  capacity: z.number().int().min(1).max(20).optional(),
  current_price: z.number().min(0).optional(),
  operational_status: z.enum(['Available', 'Reserved', 'Occupied', 'Under Maintenance']).optional(),
  visibility_status: z.enum(['Published', 'Hidden']).optional(),
  available_from: z.string().nullish(),
});

/**
 * PATCH /api/admin/rooms/:roomId

 *
 * A price change writes `room_price_history` rather than overwriting silently —
 * 05_DATABASE_DESIGN.md: "The 2% annual increase rule must be represented
 * transparently rather than silently overwriting history."
 */
router.patch(
  '/admin/rooms/:roomId',
  requirePermission(PERMISSIONS.ROOM_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = roomUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid room payload.', parsed.error.flatten().fieldErrors);
    }

    const { data: before, error: beforeError } = await db
      .from('rooms')
      .select('*')
      .eq('id', req.params.roomId)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Room not found.');

    const patch: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };

    const { data: after, error } = await db
      .from('rooms')
      .update(patch)
      .eq('id', req.params.roomId)
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    const previousPrice = Number((before as Record<string, unknown>).current_price);
    if (parsed.data.current_price !== undefined && parsed.data.current_price !== previousPrice) {
      await db.from('room_price_history').insert({
        room_id: req.params.roomId,
        previous_price: previousPrice,
        new_price: parsed.data.current_price,
        effective_date: new Date().toISOString().slice(0, 10),
        reason: 'Administrator price adjustment',
        created_by: req.user!.profileId,
      });
    }

    await auditFromRequest(req, {
      action: 'ROOM_UPDATE',
      entityType: 'ROOM',
      entityId: req.params.roomId,
      previousValues: before as Record<string, unknown>,
      newValues: after as Record<string, unknown>,
    });

    res.status(200).json({ success: true, data: after });
  })
);

/**
 * DELETE /api/admin/rooms/:roomId
 */
router.delete(
  '/admin/rooms/:roomId',
  requirePermission(PERMISSIONS.ROOM_MANAGE),
  asyncHandler(async (req, res) => {
    const { data: before, error: beforeError } = await db
      .from('rooms')
      .select('*')
      .eq('id', req.params.roomId)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Room not found.');

    const { error } = await db
      .from('rooms')
      .delete()
      .eq('id', req.params.roomId);

    if (error) throw ApiError.internal(error.message);

    await auditFromRequest(req, {
      action: 'ROOM_UPDATE',
      entityType: 'ROOM',
      entityId: req.params.roomId,
      previousValues: before
    });

    res.status(200).json({ success: true, data: { message: 'Room unit deleted.' } });
  })
);

/* ========================================================================== *
 * TENANTS — FR-009, BR-024, BR-025
 * ========================================================================== */

router.get(
  '/admin/tenants',
  requirePermission(PERMISSIONS.TENANT_READ_ALL),
  asyncHandler(async (_req, res) => {
    // password_hash is never selected, even for the administrator.
    // Joins room_assignments and rooms to fetch active unit assignments
    const { data, error } = await db
      .from('profiles')
      .select(
        'id, email, full_name, phone_number, emergency_contact_name, emergency_contact_phone, ' +
          'occupation, facebook_url, role, account_status, last_login_at, created_at, ' +
          'room_assignments (is_active, start_date, rooms (room_number))'
      )
      .in('role', ['tenant', 'prospect'])
      .order('full_name');

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const tenantOnboardSchema = z.object({
  email: z.string().email('A valid email address is required.'),
  fullName: z.string().min(2, 'Full name is required.'),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  occupation: z.string().optional(),
  facebookUrl: z.string().optional(),
  roomNumber: z.string().optional(),
  moveInDate: z.string().optional(),
  depositAmount: z.number().min(0).optional(),
});

/**
 * POST /api/admin/tenants
 * Gated by admin credentials. Onboards a new tenant and optionally assigns a room.
 */
router.post(
  '/admin/tenants',
  requirePermission(PERMISSIONS.TENANT_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = tenantOnboardSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid onboard payload.', parsed.error.flatten().fieldErrors);
    }

    const { 
      email, fullName, phone, emergencyContactName, emergencyContactPhone, 
      occupation, facebookUrl, roomNumber, moveInDate, depositAmount 
    } = parsed.data;

    // Check if profile exists
    const { data: existing, error: checkError } = await db
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (checkError) throw ApiError.internal(checkError.message);
    if (existing) {
      throw ApiError.badRequest('A profile with this email address already exists.');
    }

    // Default temp password for demo verification
    const tempPassword = 'Hivelet@Tenant2026';
    const bcrypt = (await import('bcryptjs')).default;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Insert new profile
    const { data: profile, error: insertError } = await db
      .from('profiles')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: fullName,
        phone_number: phone || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        occupation: occupation || null,
        facebook_url: facebookUrl || null,
        role: 'tenant',
        account_status: 'active'
      })
      .select('*')
      .single();

    if (insertError) throw ApiError.internal(insertError.message);

    // If roomNumber is provided, assign room
    if (roomNumber) {
      const { data: room, error: roomError } = await db
        .from('rooms')
        .select('id')
        .eq('room_number', roomNumber)
        .maybeSingle();

      if (roomError) throw ApiError.internal(roomError.message);
      if (!room) throw ApiError.notFound(`Room/Unit ${roomNumber} not found.`);

      // Create room assignment
      const { error: assignError } = await db
        .from('room_assignments')
        .insert({
          room_id: room.id,
          tenant_profile_id: profile.id,
          start_date: moveInDate || new Date().toISOString().slice(0, 10),
          anniversary_date: moveInDate || new Date().toISOString().slice(0, 10),
          deposit_amount: depositAmount || 0.00,
          occupant_count: 1,
          is_active: true
        });

      if (assignError) throw ApiError.internal(assignError.message);

      // Update room status to Occupied
      await db
        .from('rooms')
        .update({ operational_status: 'Occupied' })
        .eq('id', room.id);
    }

    await auditFromRequest(req, {
      action: 'TENANT_CREATE',
      entityType: 'PROFILE',
      entityId: profile.id,
      newValues: { email, fullName, roomNumber }
    });

    res.status(201).json({ success: true, data: profile });
  })
);

const tenantUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  occupation: z.string().optional(),
  facebookUrl: z.string().optional(),
  roomNumber: z.string().optional(),
  accountStatus: z.enum(['active', 'inactive']).optional(),
});

/**
 * PATCH /api/admin/tenants/:profileId
 * Updates tenant profile details and assignments.
 */
router.patch(
  '/admin/tenants/:profileId',
  requirePermission(PERMISSIONS.TENANT_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = tenantUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid update payload.', parsed.error.flatten().fieldErrors);
    }

    const { 
      fullName, phone, emergencyContactName, emergencyContactPhone, 
      occupation, facebookUrl, roomNumber, accountStatus 
    } = parsed.data;

    const { data: before, error: beforeError } = await db
      .from('profiles')
      .select('*')
      .eq('id', req.params.profileId)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Tenant profile not found.');

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fullName !== undefined) patch.full_name = fullName;
    if (phone !== undefined) patch.phone_number = phone;
    if (emergencyContactName !== undefined) patch.emergency_contact_name = emergencyContactName;
    if (emergencyContactPhone !== undefined) patch.emergency_contact_phone = emergencyContactPhone;
    if (occupation !== undefined) patch.occupation = occupation;
    if (facebookUrl !== undefined) patch.facebook_url = facebookUrl;
    if (accountStatus !== undefined) patch.account_status = accountStatus;

    const { data: after, error } = await db
      .from('profiles')
      .update(patch)
      .eq('id', req.params.profileId)
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    // If roomNumber changed, update room assignment!
    if (roomNumber !== undefined) {
      // Deactivate old assignments
      await db
        .from('room_assignments')
        .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
        .eq('tenant_profile_id', req.params.profileId)
        .eq('is_active', true);

      if (roomNumber) {
        const { data: room, error: roomError } = await db
          .from('rooms')
          .select('id')
          .eq('room_number', roomNumber)
          .maybeSingle();

        if (roomError) throw ApiError.internal(roomError.message);
        if (room) {
          await db
            .from('room_assignments')
            .insert({
              room_id: room.id,
              tenant_profile_id: req.params.profileId,
              start_date: new Date().toISOString().slice(0, 10),
              anniversary_date: new Date().toISOString().slice(0, 10),
              is_active: true
            });

          await db
            .from('rooms')
            .update({ operational_status: 'Occupied' })
            .eq('id', room.id);
        }
      }
    }

    await auditFromRequest(req, {
      action: 'TENANT_UPDATE',
      entityType: 'PROFILE',
      entityId: req.params.profileId,
      previousValues: before as Record<string, unknown>,
      newValues: after as Record<string, unknown>
    });

    res.status(200).json({ success: true, data: after });
  })
);

const tenantStatusSchema = z.object({
  account_status: z.enum(['active', 'inactive']),
});

/**
 * PATCH /api/admin/tenants/:profileId/status
 * BR-025 — settling a departure deactivates the account while preserving
 * history (BR-003). `resolveAuthUser` then denies that tenant's next request.
 */
router.patch(
  '/admin/tenants/:profileId/status',
  requirePermission(PERMISSIONS.TENANT_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = tenantStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid status payload.', parsed.error.flatten().fieldErrors);
    }

    const { data: before, error: beforeError } = await db
      .from('profiles')
      .select('id, full_name, role, account_status')
      .eq('id', req.params.profileId)
      .maybeSingle<{ id: string; full_name: string; role: string; account_status: string }>();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Tenant not found.');

    // The single administrator account must not be able to lock itself out.
    if (before.role === 'admin') {
      throw ApiError.forbidden('Administrator accounts cannot be deactivated through this endpoint.');
    }

    const { data: after, error } = await db
      .from('profiles')
      .update({ account_status: parsed.data.account_status, updated_at: new Date().toISOString() })
      .eq('id', req.params.profileId)
      .select('id, full_name, role, account_status')
      .single();

    if (error) throw ApiError.internal(error.message);

    await auditFromRequest(req, {
      action: parsed.data.account_status === 'inactive' ? 'TENANT_DEACTIVATE' : 'TENANT_UPDATE',
      entityType: 'PROFILE',
      entityId: req.params.profileId,
      previousValues: { account_status: before.account_status },
      newValues: { account_status: parsed.data.account_status },
    });

    res.status(200).json({ success: true, data: after });
  })
);

/* ========================================================================== *
 * INQUIRIES — FR-005
 * ========================================================================== */

router.get(
  '/admin/inquiries',
  requirePermission(PERMISSIONS.INQUIRY_READ_ALL),
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from('inquiries')
      .select('*, rooms:room_id (id, room_number, room_type, current_price)')
      .order('created_at', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const inquiryStatusSchema = z.object({
  status: z.enum(['Pending', 'Contacted', 'Converted', 'Closed']),
});

router.patch(
  '/admin/inquiries/:inquiryId',
  requirePermission(PERMISSIONS.INQUIRY_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = inquiryStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid inquiry payload.', parsed.error.flatten().fieldErrors);
    }

    const { data: before, error: beforeError } = await db
      .from('inquiries')
      .select('id, status')
      .eq('id', req.params.inquiryId)
      .maybeSingle<{ id: string; status: string }>();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Inquiry not found.');

    const { data: after, error } = await db
      .from('inquiries')
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq('id', req.params.inquiryId)
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    await auditFromRequest(req, {
      action: 'INQUIRY_STATUS_CHANGE',
      entityType: 'INQUIRY',
      entityId: req.params.inquiryId,
      previousValues: { status: before.status },
      newValues: { status: parsed.data.status },
    });

    res.status(200).json({ success: true, data: after });
  })
);

/* ========================================================================== *
 * BILLING & PAYMENTS — FR-011, FR-014, FR-016, FR-017
 * ========================================================================== */

router.get(
  '/admin/bills',
  requirePermission(PERMISSIONS.BILL_READ_ALL),
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from('bills')
      .select(
        '*, rooms:room_id (id, room_number), profiles:tenant_profile_id (id, full_name, phone_number)'
      )
      .order('due_date', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

router.get(
  '/admin/payments',
  requirePermission(PERMISSIONS.PAYMENT_READ_ALL),
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from('payments')
      .select(
        '*, rooms:room_id (id, room_number), profiles:tenant_profile_id (id, full_name)'
      )
      .order('paid_at', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const verifySchema = z.object({
  verification_status: z.enum(['Verified', 'Pending Verification', 'Rejected']),
});

/**
 * PATCH /api/admin/payments/:paymentId/verify
 *
 * BR-016/BR-017 and System Bible Section 12 — an Adyen success does not
 * auto-clear a payment; the administrator's verification is a required,
 * audited step.
 */
router.patch(
  '/admin/payments/:paymentId/verify',
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  asyncHandler(async (req, res) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid verification payload.', parsed.error.flatten().fieldErrors);
    }

    const { data: before, error: beforeError } = await db
      .from('payments')
      .select('id, verification_status, amount, bill_id')
      .eq('id', req.params.paymentId)
      .maybeSingle<{
        id: string;
        verification_status: string;
        amount: number;
        bill_id: string | null;
      }>();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Payment not found.');

    const isVerified = parsed.data.verification_status === 'Verified';

    const { data: after, error } = await db
      .from('payments')
      .update({
        verification_status: parsed.data.verification_status,
        verified_at: isVerified ? new Date().toISOString() : null,
        verified_by: isVerified ? req.user!.profileId : null,
      })
      .eq('id', req.params.paymentId)
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    // System Bible Section 22 — "Payment verified -> financial records update."
    if (isVerified && before.bill_id) {
      await db
        .from('bills')
        .update({ status: 'Paid', updated_at: new Date().toISOString() })
        .eq('id', before.bill_id);
    }

    await auditFromRequest(req, {
      action: 'PAYMENT_VERIFY',
      entityType: 'PAYMENT',
      entityId: req.params.paymentId,
      previousValues: { verification_status: before.verification_status },
      newValues: { verification_status: parsed.data.verification_status },
    });

    res.status(200).json({ success: true, data: after });
  })
);

/* ========================================================================== *
 * FINANCIAL LEDGERS — BR-048, FR-043
 * ========================================================================== */

router.get(
  '/admin/income-records',
  requirePermission(PERMISSIONS.INCOME_LEDGER_READ),
  asyncHandler(async (req, res) => {
    let query = db
      .from('monthly_income_records')
      .select('*, rooms:room_id (id, room_number, cluster_code)')
      .is('voided_at', null)
      .order('date_paid', { ascending: false });

    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    if (year) query = query.eq('year', year);
    if (month) query = query.eq('month', month);

    const { data, error } = await query;
    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const incomeRecordSchema = z.object({
  roomNumber: z.string(),
  datePaid: z.string(),
  contactName: z.string(),
  invoiceNumber: z.string().optional(),
  rentAmount: z.number().min(0),
  occupants: z.number().int().min(1),
  paymentMethod: z.enum(['Cash', 'Online']),
  transactionReference: z.string().optional(),
  monthsCovered: z.number().int().min(1),
  dateCoveredStart: z.string(),
  dateCoveredEnd: z.string(),
});

/**
 * POST /api/admin/income-records
 * Gated by admin. Adds a new payment ledger entry and logs audit trail.
 */
router.post(
  '/admin/income-records',
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  asyncHandler(async (req, res) => {
    const parsed = incomeRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid income payload.', parsed.error.flatten().fieldErrors);
    }

    const {
      roomNumber, datePaid, contactName, invoiceNumber, rentAmount,
      occupants, paymentMethod, transactionReference, monthsCovered,
      dateCoveredStart, dateCoveredEnd
    } = parsed.data;

    // Find room
    const { data: room, error: roomError } = await db
      .from('rooms')
      .select('id')
      .eq('room_number', roomNumber)
      .maybeSingle();

    if (roomError) throw ApiError.internal(roomError.message);
    if (!room) throw ApiError.notFound(`Room/Unit ${roomNumber} not found.`);

    // Find active assignment
    const { data: assign, error: assignError } = await db
      .from('room_assignments')
      .select('id, tenant_profile_id')
      .eq('room_id', room.id)
      .eq('is_active', true)
      .maybeSingle();

    if (assignError) throw ApiError.internal(assignError.message);

    const calcShare = rentAmount / 2;
    const calcWater = occupants * 200;
    const calcRemitted = rentAmount + calcWater;

    const date = new Date(datePaid);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const { data: newRecord, error: insertError } = await db
      .from('monthly_income_records')
      .insert({
        room_id: room.id,
        tenant_profile_id: assign?.tenant_profile_id || null,
        assignment_id: assign?.id || null,
        year,
        month,
        date_paid: datePaid,
        contact_name: contactName,
        invoice_number: invoiceNumber || null,
        rent_amount: rentAmount,
        fifty_percent_share: calcShare,
        occupants,
        water_payment: calcWater,
        remitted_amount: calcRemitted,
        payment_method: paymentMethod,
        transaction_reference: transactionReference || null,
        rent_period_start: dateCoveredStart,
        rent_period_end: dateCoveredEnd,
        verification_status: 'Verified'
      })
      .select('*')
      .single();

    if (insertError) throw ApiError.internal(insertError.message);

    await auditFromRequest(req, {
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: newRecord.id,
      newValues: newRecord
    });

    res.status(201).json({ success: true, data: newRecord });
  })
);

/**
 * DELETE /api/admin/income-records/:id
 * Soft-deletes (voids) the income record.
 */
router.delete(
  '/admin/income-records/:id',
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  asyncHandler(async (req, res) => {
    const { data: before, error: checkError } = await db
      .from('monthly_income_records')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (checkError) throw ApiError.internal(checkError.message);
    if (!before) throw ApiError.notFound('Income record not found.');

    const { error } = await db
      .from('monthly_income_records')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: req.user!.profileId,
        void_reason: 'Administrator manual deletion'
      })
      .eq('id', req.params.id);

    if (error) throw ApiError.internal(error.message);

    await auditFromRequest(req, {
      action: 'PAYMENT_CORRECT',
      entityType: 'PAYMENT',
      entityId: req.params.id,
      previousValues: before
    });

    res.status(200).json({ success: true, data: { message: 'Income record voided.' } });
  })
);

router.get(
  '/admin/expense-entries',
  requirePermission(PERMISSIONS.EXPENSE_LEDGER_READ),
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from('monthly_expense_entries')
      .select(
        '*, fixed_expense_categories:category_code (code, name, parent_code), ' +
          'expense_property_allocations (id, property_area, amount)'
      )
      .is('voided_at', null)
      .order('expense_date', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const expenseAllocationSchema = z.object({
  propertyArea: z.string(),
  amount: z.number().min(0)
});

const expenseEntrySchema = z.object({
  expenseDate: z.string(),
  orSupplier: z.string().min(1),
  categoryCode: z.string().min(1),
  allocations: z.array(expenseAllocationSchema).min(1),
});

/**
 * POST /api/admin/expense-entries
 * Gated by admin. Creates a new expense entry with property allocations.
 */
router.post(
  '/admin/expense-entries',
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  asyncHandler(async (req, res) => {
    const parsed = expenseEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid expense payload.', parsed.error.flatten().fieldErrors);
    }

    const { expenseDate, orSupplier, categoryCode, allocations } = parsed.data;

    const totalExpenses = allocations.reduce((acc, curr) => acc + curr.amount, 0);

    // Insert main entry
    const { data: entry, error: entryError } = await db
      .from('monthly_expense_entries')
      .insert({
        expense_date: expenseDate,
        or_supplier: orSupplier,
        category_code: categoryCode,
        total_expenses: totalExpenses,
        created_by: req.user!.profileId
      })
      .select('*')
      .single();

    if (entryError) throw ApiError.internal(entryError.message);

    // Insert allocations
    const allocationInserts = allocations.map(a => ({
      expense_entry_id: entry.id,
      property_area: a.propertyArea,
      amount: a.amount
    }));

    const { error: allocError } = await db
      .from('expense_property_allocations')
      .insert(allocationInserts);

    if (allocError) throw ApiError.internal(allocError.message);

    await auditFromRequest(req, {
      action: 'EXPENSE_CREATE',
      entityType: 'EXPENSE_ENTRY',
      entityId: entry.id,
      newValues: { entry, allocations }
    });

    res.status(201).json({ success: true, data: entry });
  })
);

/**
 * DELETE /api/admin/expense-entries/:id
 * Soft-deletes (voids) the expense entry.
 */
router.delete(
  '/admin/expense-entries/:id',
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  asyncHandler(async (req, res) => {
    const { data: before, error: checkError } = await db
      .from('monthly_expense_entries')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (checkError) throw ApiError.internal(checkError.message);
    if (!before) throw ApiError.notFound('Expense entry not found.');

    const { error } = await db
      .from('monthly_expense_entries')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: req.user!.profileId,
        void_reason: 'Administrator manual deletion'
      })
      .eq('id', req.params.id);

    if (error) throw ApiError.internal(error.message);

    await auditFromRequest(req, {
      action: 'EXPENSE_VOID',
      entityType: 'EXPENSE_ENTRY',
      entityId: req.params.id,
      previousValues: before
    });

    res.status(200).json({ success: true, data: { message: 'Expense entry voided.' } });
  })
);

router.get(
  '/admin/expense-categories',
  requirePermission(PERMISSIONS.EXPENSE_LEDGER_READ),
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from('fixed_expense_categories')
      .select('code, name, parent_code, display_order')
      .order('display_order');

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

/* ========================================================================== *
 * MAINTENANCE — FR-025, BR-023
 * ========================================================================== */

router.get(
  '/admin/tickets',
  requirePermission(PERMISSIONS.TICKET_READ_ALL),
  asyncHandler(async (_req, res) => {
    const { data, error } = await db
      .from('maintenance_tickets')
      .select(
        '*, rooms:room_id (id, room_number), ' +
          'profiles:tenant_profile_id (id, full_name, phone_number), ' +
          'ticket_attachments (id, file_url, file_type)'
      )
      .order('created_at', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const ticketStatusSchema = z.object({
  status: z.enum(['Submitted', 'In Progress', 'Resolved', 'Closed']),
});

/**
 * PATCH /api/admin/tickets/:ticketId/status
 * BR-023 — closing a ticket is the administrator's decision alone. The tenant
 * router deliberately exposes no equivalent route.
 */
router.patch(
  '/admin/tickets/:ticketId/status',
  requirePermission(PERMISSIONS.TICKET_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = ticketStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid ticket payload.', parsed.error.flatten().fieldErrors);
    }

    const { data: before, error: beforeError } = await db
      .from('maintenance_tickets')
      .select('id, status')
      .eq('id', req.params.ticketId)
      .maybeSingle<{ id: string; status: string }>();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Ticket not found.');

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: parsed.data.status };

    if (parsed.data.status === 'Resolved') patch.resolved_at = now;
    if (parsed.data.status === 'Closed') {
      patch.closed_at = now;
      patch.closed_by = req.user!.profileId;
    }

    const { data: after, error } = await db
      .from('maintenance_tickets')
      .update(patch)
      .eq('id', req.params.ticketId)
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    await auditFromRequest(req, {
      action: parsed.data.status === 'Closed' ? 'TICKET_CLOSE' : 'TICKET_STATUS_CHANGE',
      entityType: 'TICKET',
      entityId: req.params.ticketId,
      previousValues: { status: before.status },
      newValues: { status: parsed.data.status },
    });

    res.status(200).json({ success: true, data: after });
  })
);

/* ========================================================================== *
 * AUDIT TRAIL — FR-029, Section 20 (administrator-only)
 * ========================================================================== */

router.get(
  '/admin/audit-logs',
  requirePermission(PERMISSIONS.AUDIT_READ),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);

    const { data, error } = await db
      .from('audit_logs')
      .select('*, profiles:actor_profile_id (id, full_name, role)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

export default router;
