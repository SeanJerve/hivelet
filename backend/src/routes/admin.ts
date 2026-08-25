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
      .select('*, clusters:cluster_code (code, name, display_order), room_photos (id, file_url, is_primary, display_order)')
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
  photo: z.string().optional(),
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

    const { photo, ...roomFields } = parsed.data;

    const { data, error } = await db
      .from('rooms')
      .insert({
        ...roomFields,
        base_price: roomFields.current_price
      })
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    if (photo && photo.trim().length > 0) {
      await db.from('room_photos').insert({
        room_id: data.id,
        file_url: photo,
        caption: 'Room Primary Photo',
        is_primary: true,
        display_order: 0,
        uploaded_by: req.user!.profileId,
      });
    }

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
  room_type: z.string().max(100).optional(),
  capacity: z.number().int().min(1).max(20).optional(),
  current_price: z.number().min(0).optional(),
  operational_status: z.enum(['Available', 'Reserved', 'Occupied', 'Under Maintenance']).optional(),
  visibility_status: z.enum(['Published', 'Hidden']).optional(),
  available_from: z.string().nullish(),
  photo: z.string().optional(),
});

/**
 * PATCH /api/admin/rooms/:roomId
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

    const { photo, ...roomFields } = parsed.data;
    const patch: Record<string, unknown> = { ...roomFields, updated_at: new Date().toISOString() };

    const { data: after, error } = await db
      .from('rooms')
      .update(patch)
      .eq('id', req.params.roomId)
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    if (photo && photo.trim().length > 0) {
      const { data: existingPhotos } = await db
        .from('room_photos')
        .select('id')
        .eq('room_id', req.params.roomId);

      if (existingPhotos && existingPhotos.length > 0) {
        await db
          .from('room_photos')
          .update({
            file_url: photo,
            caption: 'Room Primary Photo',
            is_primary: true,
            uploaded_by: req.user!.profileId,
          })
          .eq('id', existingPhotos[0].id);
      } else {
        await db
          .from('room_photos')
          .insert({
            room_id: req.params.roomId,
            file_url: photo,
            caption: 'Room Primary Photo',
            is_primary: true,
            display_order: 0,
            uploaded_by: req.user!.profileId,
          });
      }
    }

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
 * POST /api/admin/rooms/:roomId/photo
 */
router.post(
  '/admin/rooms/:roomId/photo',
  requirePermission(PERMISSIONS.ROOM_MANAGE),
  asyncHandler(async (req, res) => {
    const { photo, caption } = req.body;
    if (!photo || typeof photo !== 'string') {
      throw ApiError.badRequest('A photo BLOB or base64 data URL is required.');
    }

    const { data: room, error: rErr } = await db.from('rooms').select('id').eq('id', req.params.roomId).single();
    if (rErr || !room) throw ApiError.notFound('Room not found.');

    const { data: existingPhotos } = await db
      .from('room_photos')
      .select('id')
      .eq('room_id', req.params.roomId);

    let savedPhoto;
    if (existingPhotos && existingPhotos.length > 0) {
      const { data, error } = await db
        .from('room_photos')
        .update({
          file_url: photo,
          caption: caption || 'Room Primary Photo',
          is_primary: true,
          uploaded_by: req.user!.profileId,
        })
        .eq('id', existingPhotos[0].id)
        .select('*')
        .single();

      if (error) throw ApiError.internal(error.message);
      savedPhoto = data;
    } else {
      const { data, error } = await db
        .from('room_photos')
        .insert({
          room_id: req.params.roomId,
          file_url: photo,
          caption: caption || 'Room Primary Photo',
          is_primary: true,
          display_order: 0,
          uploaded_by: req.user!.profileId,
        })
        .select('*')
        .single();

      if (error) throw ApiError.internal(error.message);
      savedPhoto = data;
    }

    res.status(200).json({ success: true, data: savedPhoto });
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
          'room_assignments (id, is_active, start_date, anniversary_date, deposit_amount, occupant_count, rooms (id, room_number))'
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
  occupantCount: z.number().int().min(1).optional(),
  roommateQty: z.number().int().min(0).optional(),
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
      occupation, facebookUrl, roomNumber, moveInDate, depositAmount,
      occupantCount, roommateQty 
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
        .ilike('room_number', roomNumber)
        .maybeSingle();

      if (roomError) throw ApiError.internal(roomError.message);
      if (!room) throw ApiError.notFound(`Room/Unit ${roomNumber} not found.`);

      const finalOccupants = occupantCount ?? (roommateQty !== undefined ? 1 + roommateQty : 1);

      // Create room assignment
      const { error: assignError } = await db
        .from('room_assignments')
        .insert({
          room_id: room.id,
          tenant_profile_id: profile.id,
          start_date: moveInDate || new Date().toISOString().slice(0, 10),
          anniversary_date: moveInDate || new Date().toISOString().slice(0, 10),
          deposit_amount: depositAmount || 0.00,
          occupant_count: finalOccupants,
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
  occupantCount: z.number().int().min(1).optional(),
  roommateQty: z.number().int().min(0).optional(),
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
      occupation, facebookUrl, roomNumber, accountStatus,
      occupantCount, roommateQty 
    } = parsed.data;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.profileId);
    if (!isUuid) {
      throw ApiError.notFound(`Tenant profile ${req.params.profileId} not found.`);
    }

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

    const explicitOccupants = occupantCount ?? (roommateQty !== undefined ? 1 + roommateQty : undefined);

    // If roomNumber changed, update room assignment!
    if (roomNumber !== undefined) {
      // Find old active assignments
      const { data: oldActive } = await db
        .from('room_assignments')
        .select('id, room_id, deposit_amount, occupant_count')
        .eq('tenant_profile_id', req.params.profileId)
        .eq('is_active', true);

      // Deactivate old assignments
      await db
        .from('room_assignments')
        .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
        .eq('tenant_profile_id', req.params.profileId)
        .eq('is_active', true);

      // If old room is now empty, set operational_status to Available
      if (oldActive && oldActive.length > 0) {
        for (const old of oldActive) {
          const { count } = await db
            .from('room_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', old.room_id)
            .eq('is_active', true);
          if (!count || count === 0) {
            await db.from('rooms').update({ operational_status: 'Available' }).eq('id', old.room_id);
          }
        }
      }

      if (roomNumber && roomNumber !== '—' && roomNumber.toLowerCase() !== 'none') {
        const { data: room, error: roomError } = await db
          .from('rooms')
          .select('id, base_price, current_price')
          .ilike('room_number', roomNumber)
          .maybeSingle();

        if (roomError) throw ApiError.internal(roomError.message);
        if (!room) throw ApiError.notFound(`Room/Unit ${roomNumber} not found.`);

        // Check if there are other active assignments on this target room
        const { data: targetRoomActive } = await db
          .from('room_assignments')
          .select('id, tenant_profile_id, profiles (full_name, account_status)')
          .eq('room_id', room.id)
          .eq('is_active', true);

        if (targetRoomActive && targetRoomActive.length > 0) {
          for (const a of targetRoomActive) {
            if (a.tenant_profile_id !== req.params.profileId) {
              const prof: any = a.profiles;
              if (prof?.account_status === 'inactive') {
                // Stale assignment from inactive tenant, safely deactivate it
                await db
                  .from('room_assignments')
                  .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
                  .eq('id', a.id);
              } else {
                throw ApiError.badRequest(`Unit ${roomNumber.toUpperCase()} is already occupied by active tenant ${prof?.full_name || 'another resident'}.`);
              }
            }
          }
        }

        const prevDeposit = oldActive?.[0]?.deposit_amount ?? (Number(room.current_price || room.base_price || 4500) * 2);
        const finalOccupants = explicitOccupants ?? oldActive?.[0]?.occupant_count ?? 1;

        const { error: assignError } = await db
          .from('room_assignments')
          .insert({
            room_id: room.id,
            tenant_profile_id: req.params.profileId,
            start_date: new Date().toISOString().slice(0, 10),
            anniversary_date: new Date().toISOString().slice(0, 10),
            deposit_amount: prevDeposit,
            occupant_count: finalOccupants,
            is_active: true
          });

        if (assignError) throw ApiError.internal(assignError.message);

        await db
          .from('rooms')
          .update({ operational_status: 'Occupied' })
          .eq('id', room.id);
      }
    } else if (explicitOccupants !== undefined) {
      // Room number did not change, but occupant count was updated directly
      await db
        .from('room_assignments')
        .update({ occupant_count: explicitOccupants })
        .eq('tenant_profile_id', req.params.profileId)
        .eq('is_active', true);
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

/**
 * POST /api/admin/tenants/:profileId/vacate
 * Settle vacancy: deactivates tenant, closes active room assignment, and frees the unit.
 */
router.post(
  '/admin/tenants/:profileId/vacate',
  requirePermission(PERMISSIONS.TENANT_MANAGE),
  asyncHandler(async (req, res) => {
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', req.params.profileId)
      .maybeSingle<{ id: string; full_name: string; role: string }>();

    if (profileError) throw ApiError.internal(profileError.message);
    if (!profile) throw ApiError.notFound('Tenant profile not found.');

    // Find active assignment
    const { data: activeAssignments } = await db
      .from('room_assignments')
      .select('id, room_id')
      .eq('tenant_profile_id', req.params.profileId)
      .eq('is_active', true);

    // Deactivate assignments
    await db
      .from('room_assignments')
      .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
      .eq('tenant_profile_id', req.params.profileId)
      .eq('is_active', true);

    // Free rooms
    if (activeAssignments && activeAssignments.length > 0) {
      for (const a of activeAssignments) {
        await db.from('rooms').update({ operational_status: 'Available' }).eq('id', a.room_id);
      }
    }

    // Set profile status to inactive
    const { data: updatedProfile, error: updateError } = await db
      .from('profiles')
      .update({ account_status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', req.params.profileId)
      .select('*')
      .single();

    if (updateError) throw ApiError.internal(updateError.message);

    await auditFromRequest(req, {
      action: 'TENANT_DEACTIVATE',
      entityType: 'PROFILE',
      entityId: req.params.profileId,
      newValues: { account_status: 'inactive' }
    });

    res.status(200).json({ success: true, data: updatedProfile });
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
        '*, rooms:room_id (id, room_number, cluster_code), profiles:tenant_profile_id (id, full_name, phone_number), bills:bill_id (*)'
      )
      .order('paid_at', { ascending: false });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const verifySchema = z.object({
  verification_status: z.enum(['Verified', 'Pending Verification', 'Rejected']),
  rejectionReason: z.string().optional(),
});

/**
 * PATCH /api/admin/payments/:paymentId/verify
 *
 * BR-016/BR-017 and System Bible Section 12 & 22 — an Adyen success does not
 * auto-clear a payment; the administrator's verification is a required,
 * audited step. Upon verification, the bill status is marked 'Paid' and a
 * synchronized entry is automatically written to monthly_income_records.
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
      .select('id, verification_status, amount, bill_id, room_id, tenant_profile_id, transaction_reference, paid_at')
      .eq('id', req.params.paymentId)
      .maybeSingle<{
        id: string;
        verification_status: string;
        amount: number;
        bill_id: string | null;
        room_id: string;
        tenant_profile_id: string;
        transaction_reference: string | null;
        paid_at: string;
      }>();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Payment not found.');

    const isVerified = parsed.data.verification_status === 'Verified';
    const isRejected = parsed.data.verification_status === 'Rejected';

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
    if (isVerified) {
      let billData: any = null;
      if (before.bill_id) {
        const { data: b } = await db
          .from('bills')
          .update({ status: 'Paid', updated_at: new Date().toISOString() })
          .eq('id', before.bill_id)
          .select('*')
          .single();
        billData = b;
      }

      // Query tenant profile name
      const { data: tenantProfile } = await db
        .from('profiles')
        .select('full_name')
        .eq('id', before.tenant_profile_id)
        .single();

      // Query active room assignment for occupant count
      const { data: assignment } = await db
        .from('room_assignments')
        .select('id, occupant_count')
        .eq('room_id', before.room_id)
        .eq('tenant_profile_id', before.tenant_profile_id)
        .eq('is_active', true)
        .maybeSingle();

      const occupants = assignment?.occupant_count || 1;
      const rentAmount = billData?.rent_amount || (before.amount - occupants * 200);
      const waterAmount = billData?.water_amount || (occupants * 200);
      const fiftyPercentShare = rentAmount / 2;

      const datePaid = new Date(before.paid_at || Date.now());
      const year = datePaid.getFullYear();
      const month = datePaid.getMonth() + 1;

      let rentPeriodStart = billData?.billing_period_start;
      let rentPeriodEnd = billData?.billing_period_end;

      if (!rentPeriodStart || !rentPeriodEnd) {
        const y = datePaid.getFullYear();
        const m = datePaid.getMonth();
        const d = datePaid.getDate();

        if (d >= 26) {
          rentPeriodStart = new Date(Date.UTC(y, m, 26)).toISOString().split('T')[0];
          rentPeriodEnd = new Date(Date.UTC(y, m + 1, 25)).toISOString().split('T')[0];
        } else {
          rentPeriodStart = new Date(Date.UTC(y, m - 1, 26)).toISOString().split('T')[0];
          rentPeriodEnd = new Date(Date.UTC(y, m, 25)).toISOString().split('T')[0];
        }
      }

      // Check if income record already exists for this transaction reference
      const { data: existingIncome } = await db
        .from('monthly_income_records')
        .select('id')
        .eq('transaction_reference', before.transaction_reference)
        .maybeSingle();

      if (!existingIncome && before.transaction_reference) {
        const { error: insertError } = await db.from('monthly_income_records').insert({
          room_id: before.room_id,
          tenant_profile_id: before.tenant_profile_id,
          assignment_id: assignment?.id || null,
          year,
          month,
          date_paid: datePaid.toISOString().split('T')[0],
          contact_name: tenantProfile?.full_name || 'Online Resident',
          invoice_number: before.transaction_reference,
          rent_period_start: rentPeriodStart,
          rent_period_end: rentPeriodEnd,
          rent_amount: rentAmount,
          occupants: occupants,
          water_payment: waterAmount,
          payment_method: 'GCash',
          transaction_reference: before.transaction_reference,
        });

        if (insertError) {
          throw ApiError.internal(`Failed to insert monthly income record: ${insertError.message}`);
        }
      }

      // Notify the tenant that their payment is settled
      await db.from('notifications').insert({
        recipient_profile_id: before.tenant_profile_id,
        title: 'Online Payment Verified',
        message: `Your online payment of ₱${before.amount.toLocaleString()} (Ref: ${before.transaction_reference}) has been verified and settled by the administrator.`,
        type: 'Payment',
        priority: 'Low',
        is_read: false,
      });
    } else if (isRejected) {
      // Revert bill status to 'Due' if it was linked
      if (before.bill_id) {
        await db
          .from('bills')
          .update({ status: 'Due', updated_at: new Date().toISOString() })
          .eq('id', before.bill_id);
      }

      // Notify tenant of rejection
      await db.from('notifications').insert({
        recipient_profile_id: before.tenant_profile_id,
        title: 'Payment Verification Declined',
        message: `Your online payment submission (Ref: ${before.transaction_reference || 'N/A'}) was declined. Please contact the administrator.`,
        type: 'Payment',
        priority: 'High',
        is_read: false,
      });
    }

    await auditFromRequest(req, {
      action: 'PAYMENT_VERIFY',
      entityType: 'PAYMENT',
      entityId: req.params.paymentId,
      previousValues: { verification_status: before.verification_status },
      newValues: {
        verification_status: parsed.data.verification_status,
        rejectionReason: parsed.data.rejectionReason,
      },
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
  paymentMethod: z.enum(['Cash', 'Online', 'GCash']).default('Cash'),
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
      throw ApiError.validation('Invalid income record payload.', parsed.error.flatten().fieldErrors);
    }

    const {
      roomNumber, datePaid, contactName, invoiceNumber, rentAmount,
      occupants, paymentMethod, transactionReference, monthsCovered,
      dateCoveredStart, dateCoveredEnd
    } = parsed.data;

    const normalizedMethod = (paymentMethod === 'Online' || paymentMethod === 'GCash') ? 'GCash' : 'Cash';

    // Find room
    const { data: room, error: roomError } = await db
      .from('rooms')
      .select('id')
      .ilike('room_number', roomNumber)
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
        invoice_number: invoiceNumber || `INV-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
        rent_amount: rentAmount,
        occupants,
        water_payment: calcWater,
        payment_method: normalizedMethod,
        transaction_reference: transactionReference || null,
        rent_period_start: dateCoveredStart,
        rent_period_end: dateCoveredEnd,
        verification_status: 'Verified'
      })
      .select('*')
      .single();

    if (insertError) throw ApiError.internal(insertError.message);

    // Sync: if this is recorded for an active tenant assignment, check and update their bills
    if (assign?.tenant_profile_id) {
      let remainingPayment = Number(rentAmount || 0) + Number(calcWater || 0);
      
      const { data: unpaidBills } = await db
        .from('bills')
        .select('id, total_amount, status')
        .eq('tenant_profile_id', assign.tenant_profile_id)
        .in('status', ['Due', 'Overdue', 'Pending'])
        .order('due_date', { ascending: true });

      if (unpaidBills && unpaidBills.length > 0) {
        for (const bill of unpaidBills) {
          const billAmount = Number(bill.total_amount);
          if (remainingPayment >= billAmount) {
            // Update bill status to Paid
            await db
              .from('bills')
              .update({ status: 'Paid', updated_at: new Date().toISOString() })
              .eq('id', bill.id);

            // Record a payment entry for the tenant to see in their payment history
            await db.from('payments').insert({
              bill_id: bill.id,
              room_id: room.id,
              tenant_profile_id: assign.tenant_profile_id,
              amount: billAmount,
              payment_method: normalizedMethod,
              payment_source: 'On-Site Cash',
              verification_status: 'Verified',
              transaction_reference: transactionReference || `CASH-REC-${Math.floor(100000 + Math.random() * 900000)}`,
              paid_at: new Date(datePaid).toISOString(),
              verified_at: new Date().toISOString(),
              verified_by: req.user!.profileId,
            });

            remainingPayment -= billAmount;
          } else {
            break;
          }
        }
      }

      // If there is still remaining payment or no bills were found, insert it as an unlinked payment
      if (remainingPayment > 0) {
        await db.from('payments').insert({
          bill_id: null,
          room_id: room.id,
          tenant_profile_id: assign.tenant_profile_id,
          amount: remainingPayment,
          payment_method: normalizedMethod,
          payment_source: 'On-Site Cash',
          verification_status: 'Verified',
          transaction_reference: transactionReference || `CASH-REC-${Math.floor(100000 + Math.random() * 900000)}`,
          paid_at: new Date(datePaid).toISOString(),
          verified_at: new Date().toISOString(),
          verified_by: req.user!.profileId,
        });
      }
    }

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
 * PATCH /api/admin/income-records/:id
 * Updates an income record in-place without voiding/recreating.
 */
router.patch(
  '/admin/income-records/:id',
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  asyncHandler(async (req, res) => {
    const { data: before, error: beforeError } = await db
      .from('monthly_income_records')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Income record not found.');

    const {
      roomNumber, datePaid, contactName, invoiceNumber, rentAmount,
      occupants, paymentMethod, transactionReference, monthsCovered,
      dateCoveredStart, dateCoveredEnd
    } = req.body;

    let roomId = before.room_id;
    if (roomNumber) {
      const { data: room, error: roomError } = await db
        .from('rooms')
        .select('id')
        .ilike('room_number', roomNumber)
        .maybeSingle();
      if (roomError) throw ApiError.internal(roomError.message);
      if (room) roomId = room.id;
    }

    const rent = rentAmount !== undefined ? Number(rentAmount) : Number(before.rent_amount);
    const occ = occupants !== undefined ? Number(occupants) : Number(before.occupants || 1);
    const water = occ * 200;

    const updatePatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (roomId) updatePatch.room_id = roomId;
    if (datePaid) updatePatch.date_paid = datePaid;
    if (contactName) updatePatch.contact_name = contactName;
    if (invoiceNumber) updatePatch.invoice_number = invoiceNumber;
    if (rentAmount !== undefined) updatePatch.rent_amount = rent;
    if (occupants !== undefined) {
      updatePatch.occupants = occ;
      updatePatch.water_payment = water;
    }
    if (paymentMethod) {
      updatePatch.payment_method = (paymentMethod === 'Online' || paymentMethod === 'GCash') ? 'GCash' : 'Cash';
    }
    if (transactionReference !== undefined) updatePatch.transaction_reference = transactionReference;
    if (dateCoveredStart) updatePatch.rent_period_start = dateCoveredStart;
    if (dateCoveredEnd) updatePatch.rent_period_end = dateCoveredEnd;

    const { data: after, error: updateError } = await db
      .from('monthly_income_records')
      .update(updatePatch)
      .eq('id', req.params.id)
      .select('*, rooms:room_id (id, room_number, cluster_code)')
      .single();

    if (updateError) throw ApiError.internal(updateError.message);

    await auditFromRequest(req, {
      action: 'PAYMENT_CORRECT',
      entityType: 'PAYMENT',
      entityId: req.params.id,
      previousValues: before,
      newValues: after
    });

    res.status(200).json({ success: true, data: after });
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
 * PATCH /api/admin/expense-entries/:id
 * Updates an expense entry in-place.
 */
router.patch(
  '/admin/expense-entries/:id',
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  asyncHandler(async (req, res) => {
    const { data: before, error: beforeError } = await db
      .from('monthly_expense_entries')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Expense entry not found.');

    const { expenseDate, orSupplier, categoryCode, allocations } = req.body;

    const totalExpenses = allocations && Array.isArray(allocations)
      ? allocations.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0)
      : before.total_expenses;

    const updatePatch: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    if (expenseDate) updatePatch.expense_date = expenseDate;
    if (orSupplier) updatePatch.or_supplier = orSupplier;
    if (categoryCode) updatePatch.category_code = categoryCode;
    if (allocations) updatePatch.total_expenses = totalExpenses;

    const { data: after, error: updateError } = await db
      .from('monthly_expense_entries')
      .update(updatePatch)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError) throw ApiError.internal(updateError.message);

    if (allocations && Array.isArray(allocations)) {
      await db.from('expense_property_allocations').delete().eq('expense_entry_id', req.params.id);
      const allocationInserts = allocations.map((a: any) => ({
        expense_entry_id: req.params.id,
        property_area: a.propertyArea || a.area,
        amount: Number(a.amount || 0)
      }));
      await db.from('expense_property_allocations').insert(allocationInserts);
    }

    await auditFromRequest(req, {
      action: 'EXPENSE_UPDATE',
      entityType: 'EXPENSE_ENTRY',
      entityId: req.params.id,
      previousValues: before,
      newValues: after
    });

    res.status(200).json({ success: true, data: after });
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

const ticketCreateSchema = z.object({
  roomNumber: z.string().optional(),
  roomId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']).optional(),
  assignedTechnician: z.string().optional(),
  status: z.enum(['Open', 'Submitted', 'In Progress', 'Resolved', 'Closed']).optional(),
  setRoomMaintenance: z.boolean().optional(),
});

/**
 * POST /api/admin/tickets
 */
router.post(
  '/admin/tickets',
  requirePermission(PERMISSIONS.TICKET_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = ticketCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid ticket payload.', parsed.error.flatten().fieldErrors);
    }

    let roomId = parsed.data.roomId;
    if (!roomId && parsed.data.roomNumber) {
      const { data: room } = await db
        .from('rooms')
        .select('id')
        .ilike('room_number', parsed.data.roomNumber)
        .maybeSingle();
      if (room) roomId = room.id;
    }

    if (!roomId) {
      const { data: firstRoom } = await db.from('rooms').select('id').limit(1).single();
      roomId = firstRoom?.id;
    }

    let tenantProfileId: string | null = null;
    if (roomId) {
      const { data: assignment } = await db
        .from('room_assignments')
        .select('tenant_profile_id')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .maybeSingle();
      if (assignment) tenantProfileId = assignment.tenant_profile_id;
    }

    let createStatus = parsed.data.status || 'Submitted';
    if (createStatus === 'Open') createStatus = 'Submitted';

    const { data: newTicket, error } = await db
      .from('maintenance_tickets')
      .insert({
        room_id: roomId,
        tenant_profile_id: tenantProfileId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category || 'General',
        priority: parsed.data.priority || 'Medium',
        status: createStatus,
        assigned_technician: parsed.data.assignedTechnician || 'Unassigned',
      })
      .select('*, rooms:room_id (id, room_number), profiles:tenant_profile_id (id, full_name, phone_number)')
      .single();

    if (error) throw ApiError.internal(error.message);

    if (roomId && (parsed.data.setRoomMaintenance || parsed.data.priority === 'Emergency')) {
      await db.from('rooms').update({ operational_status: 'Under Maintenance' }).eq('id', roomId);
    }

    await auditFromRequest(req, {
      action: 'TICKET_STATUS_CHANGE',
      entityType: 'TICKET',
      entityId: newTicket.id,
      newValues: newTicket,
    });

    res.status(201).json({ success: true, data: newTicket });
  })
);

const ticketUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']).optional(),
  status: z.enum(['Open', 'Submitted', 'In Progress', 'Resolved', 'Closed']).optional(),
  assigned_technician: z.string().optional(),
  assignedTechnician: z.string().optional(),
  roomNumber: z.string().optional(),
  roomId: z.string().optional(),
});

/**
 * PATCH /api/admin/tickets/:ticketId
 */
router.patch(
  '/admin/tickets/:ticketId',
  requirePermission(PERMISSIONS.TICKET_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = ticketUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid ticket payload.', parsed.error.flatten().fieldErrors);
    }

    const { data: before, error: beforeError } = await db
      .from('maintenance_tickets')
      .select('*, rooms:room_id (id, room_number, operational_status)')
      .eq('id', req.params.ticketId)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Ticket not found.');

    const patch: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.description !== undefined) patch.description = parsed.data.description;
    if (parsed.data.category !== undefined) patch.category = parsed.data.category;
    if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
    const tech = parsed.data.assigned_technician ?? parsed.data.assignedTechnician;
    if (tech !== undefined) patch.assigned_technician = tech;
    
    if (parsed.data.status !== undefined) {
      let dbStatus = parsed.data.status;
      if (dbStatus === 'Open') dbStatus = 'Submitted';
      patch.status = dbStatus;
      if (dbStatus === 'Resolved') patch.resolved_at = new Date().toISOString();
      if (dbStatus === 'Closed') {
        patch.closed_at = new Date().toISOString();
        patch.closed_by = req.user!.profileId;
      }
    }

    if (parsed.data.roomId) {
      patch.room_id = parsed.data.roomId;
    } else if (parsed.data.roomNumber) {
      const { data: matchedRoom } = await db
        .from('rooms')
        .select('id')
        .ilike('room_number', parsed.data.roomNumber)
        .maybeSingle();
      if (matchedRoom) patch.room_id = matchedRoom.id;
    }

    const { data: after, error } = await db
      .from('maintenance_tickets')
      .update(patch)
      .eq('id', req.params.ticketId)
      .select('*, rooms:room_id (id, room_number), profiles:tenant_profile_id (id, full_name, phone_number)')
      .single();

    if (error) throw ApiError.internal(error.message);

    // Auto-sync Room Operational Status if all tickets for this room are resolved!
    const targetRoomId = after.room_id || before.room_id;
    if (targetRoomId && (patch.status === 'Resolved' || patch.status === 'Closed')) {
      const { data: remainingUnresolved } = await db
        .from('maintenance_tickets')
        .select('id')
        .eq('room_id', targetRoomId)
        .in('status', ['Submitted', 'In Progress', 'Open']);

      if (!remainingUnresolved || remainingUnresolved.length === 0) {
        const { data: activeAssign } = await db
          .from('room_assignments')
          .select('id')
          .eq('room_id', targetRoomId)
          .eq('is_active', true)
          .maybeSingle();

        const newRoomStatus = activeAssign ? 'Occupied' : 'Available';
        await db.from('rooms').update({ operational_status: newRoomStatus }).eq('id', targetRoomId);
      }
    }

    await auditFromRequest(req, {
      action: patch.status === 'Closed' ? 'TICKET_CLOSE' : 'TICKET_STATUS_CHANGE',
      entityType: 'TICKET',
      entityId: req.params.ticketId,
      previousValues: before,
      newValues: after,
    });

    res.status(200).json({ success: true, data: after });
  })
);

/**
 * PATCH /api/admin/tickets/:ticketId/close
 */
router.patch(
  '/admin/tickets/:ticketId/close',
  requirePermission(PERMISSIONS.TICKET_MANAGE),
  asyncHandler(async (req, res) => {
    const { data: before, error: beforeError } = await db
      .from('maintenance_tickets')
      .select('*')
      .eq('id', req.params.ticketId)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Ticket not found.');

    const now = new Date().toISOString();
    const { data: after, error } = await db
      .from('maintenance_tickets')
      .update({
        status: 'Resolved',
        resolved_at: now,
        closed_at: now,
        closed_by: req.user!.profileId,
      })
      .eq('id', req.params.ticketId)
      .select('*, rooms:room_id (id, room_number), profiles:tenant_profile_id (id, full_name, phone_number)')
      .single();

    if (error) throw ApiError.internal(error.message);

    if (before.room_id) {
      const { data: remainingUnresolved } = await db
        .from('maintenance_tickets')
        .select('id')
        .eq('room_id', before.room_id)
        .in('status', ['Submitted', 'In Progress', 'Open']);

      if (!remainingUnresolved || remainingUnresolved.length === 0) {
        const { data: activeAssign } = await db
          .from('room_assignments')
          .select('id')
          .eq('room_id', before.room_id)
          .eq('is_active', true)
          .maybeSingle();

        const newRoomStatus = activeAssign ? 'Occupied' : 'Available';
        await db.from('rooms').update({ operational_status: newRoomStatus }).eq('id', before.room_id);
      }
    }

    res.status(200).json({ success: true, data: after });
  })
);

/**
 * DELETE /api/admin/tickets/:ticketId
 */
router.delete(
  '/admin/tickets/:ticketId',
  requirePermission(PERMISSIONS.TICKET_MANAGE),
  asyncHandler(async (req, res) => {
    const { data: before, error: beforeError } = await db
      .from('maintenance_tickets')
      .select('*')
      .eq('id', req.params.ticketId)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Ticket not found.');

    const { error } = await db
      .from('maintenance_tickets')
      .delete()
      .eq('id', req.params.ticketId);

    if (error) throw ApiError.internal(error.message);

    if (before.room_id) {
      const { data: remainingUnresolved } = await db
        .from('maintenance_tickets')
        .select('id')
        .eq('room_id', before.room_id)
        .in('status', ['Submitted', 'In Progress', 'Open']);

      if (!remainingUnresolved || remainingUnresolved.length === 0) {
        const { data: activeAssign } = await db
          .from('room_assignments')
          .select('id')
          .eq('room_id', before.room_id)
          .eq('is_active', true)
          .maybeSingle();

        const newRoomStatus = activeAssign ? 'Occupied' : 'Available';
        await db.from('rooms').update({ operational_status: newRoomStatus }).eq('id', before.room_id);
      }
    }

    res.status(200).json({ success: true, data: { message: 'Ticket deleted.' } });
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
