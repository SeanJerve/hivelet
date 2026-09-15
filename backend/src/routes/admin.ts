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
import {
  PROPERTY_AREAS,
  normalizePropertyArea,
  type PropertyArea
} from '../config/propertyAreas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertWritten, warnIfWriteFailed } from '../utils/checkedWrite.js';
import { auditFromRequest } from '../services/auditService.js';
import { notificationService } from '../services/notificationService.js';
import { computeWaterFee, isOverdue, allocateReceipt, computeRentPeriod } from '../services/billingService.js';
import { buildIncomeReportWorkbook } from '../services/incomeReportExport.js';
import { buildExpenseReportWorkbook } from '../services/expenseReportExport.js';
import { money, occupantCount, isoDate, shortText, uuid } from '../utils/validators.js';

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
    /**
     * The active tenancy comes with the room.
     *
     * This endpoint returned the room and nothing about who lives in it, while the frontend
     * mapper read `r.tenant_name` and `r.tenant_profile_id` - neither of which is a column on
     * `rooms` or anything this select produced. Both were therefore `undefined` on every row,
     * and the mapper's fallback wrote the literal string "Active Resident" in place of the
     * resident's name for all 32 occupied units.
     *
     * That reached further than the directory. `room.tenant` is the fallback contact name on
     * the on-site payment modal and the ledger's own form, so a receipt recorded while the
     * occupant summary was empty would have carried "Active Resident" into
     * `monthly_income_records.contact_name` - the owner's ledger, and the "Contact + Invoice #"
     * column of her Excel export. No live row shows it yet: all 937 are real names.
     *
     * All 32 occupied rooms have exactly one active assignment, and the one Available room has
     * none, so this join answers for every row.
     */
    const { data, error } = await db
      .from('rooms')
      .select(
        '*, clusters:cluster_code (code, name, display_order), ' +
        'room_photos (id, file_url, is_primary, display_order), ' +
        'room_assignments (id, is_active, tenant_profile_id, occupant_count, profiles:tenant_profile_id (id, full_name))'
      )
      .order('room_number');

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const roomInsertSchema = z.object({
  cluster_code: z.string().min(1),
  room_number: z.string().min(1),
  floor: z.number().int().min(1).optional(),
  // `room_type` is the enum `room_type_enum`, not free text. It was `z.string()` while
  // `operational_status` and `visibility_status` in this same file were properly
  // enumerated, so an invalid type reached PostgreSQL and came back as a 22P02 the
  // caller could not act on. Validated here, it is a 422 naming the allowed values.
  room_type: z.enum(['Studio', 'One-bedroom', 'Two-bedroom', 'Three-bedroom']).optional(),
  capacity: occupantCount.refine((n) => n >= 1, 'must be at least one').optional(),
  // `money`, not `z.number().min(0)`. Zod's `z.number()` rejects NaN but ACCEPTS
  // Infinity, and JSON carries it in plainly as `1e999`. PostgreSQL sorts Infinity
  // above every numeric, so a `>= 0` CHECK passes it. This is the unit's rent: it
  // becomes the advance rent at move-in (BR-039), every bill raised against the
  // unit (BR-010), and every income total that follows.
  current_price: money,
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
      assertWritten(
        await db.from('room_photos').insert({
          room_id: data.id,
          file_url: photo,
          caption: 'Room Primary Photo',
          is_primary: true,
          display_order: 0,
          uploaded_by: req.user!.profileId,
        }),
        `Unit ${data.room_number} was created, but its photo could not be saved - ` +
          'add it from the unit page rather than creating the unit again'
      );
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
  // `room_type` is the enum `room_type_enum`, not free text. It was `z.string()` while
  // `operational_status` and `visibility_status` in this same file were properly
  // enumerated, so an invalid type reached PostgreSQL and came back as a 22P02 the
  // caller could not act on. Validated here, it is a 422 naming the allowed values.
  room_type: z.enum(['Studio', 'One-bedroom', 'Two-bedroom', 'Three-bedroom']).optional(),
  capacity: occupantCount.refine((n) => n >= 1 && n <= 20, 'must be between 1 and 20').optional(),
  // See the note on `roomInsertSchema.current_price` above.
  current_price: money.optional(),
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
        assertWritten(
          await db
            .from('room_photos')
            .update({
              file_url: photo,
              caption: 'Room Primary Photo',
              is_primary: true,
              uploaded_by: req.user!.profileId,
            })
            .eq('id', existingPhotos[0].id),
          'The photo could not be replaced'
        );
      } else {
        assertWritten(
          await db
            .from('room_photos')
            .insert({
              room_id: req.params.roomId,
              file_url: photo,
              caption: 'Room Primary Photo',
              is_primary: true,
              display_order: 0,
              uploaded_by: req.user!.profileId,
            }),
          'The photo could not be saved'
        );
      }
    }

    /**
     * BR-003 / ARCH-004 - rate change history.
     *
     * The history row is no longer written here. Migration `020` put an AFTER
     * UPDATE trigger on `rooms` that writes it in the same transaction as the
     * rate change itself, so a rate cannot be changed without being recorded by
     * ANY path - this route, a future service, or a direct SQL fix.
     *
     * This code used to insert it and discard the result: no `error` was
     * destructured and nothing was checked. `rooms` had already been updated by
     * then, so a rejected insert left the new rate live and no record that the
     * old one ever existed - exactly what BR-003 forbids, reported to nobody.
     *
     * What is left here is attribution. The row is already guaranteed; this adds
     * who did it and why. If it fails, the history is still intact and the actor
     * is still in `audit_logs`, which is what the message below says.
     */
    const previousPrice = Number((before as Record<string, unknown>).current_price);
    if (parsed.data.current_price !== undefined && parsed.data.current_price !== previousPrice) {
      const { data: recorded, error: findError } = await db
        .from('room_price_history')
        .select('id')
        .eq('room_id', req.params.roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        throw ApiError.internal(
          `The rate was changed and the change is recorded, but the record could not be read ` +
            `back to attribute it: ${findError.message}. The administrator who made the change ` +
            'is still in the audit log.'
        );
      }

      if (!recorded) {
        // The trigger is the only thing that writes this row, so its absence means
        // the trigger is gone - which would make every future rate change silent.
        throw ApiError.internal(
          'The rate was changed, but no history row was written for it. The trigger ' +
            '`trg_record_room_price_change` (migration 020) may be missing - check it before ' +
            'changing any further rates.'
        );
      }

      const { error: attributionError } = await db
        .from('room_price_history')
        .update({ created_by: req.user!.profileId, reason: 'Administrator price adjustment' })
        .eq('id', recorded.id);

      if (attributionError) {
        throw ApiError.internal(
          `The rate was changed and the change IS recorded, but it could not be attributed: ` +
            `${attributionError.message}. The administrator who made it is still in the audit log.`
        );
      }
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
    // Size is already bounded by `express.json({ limit: '1mb' })` in server.ts, so
    // this checks shape rather than length: that the value really is an image
    // data URL or an http(s) URL, and not an arbitrary string that would be
    // rendered into an <img src> on the public directory.
    const parsedPhoto = z.object({
      photo: z.string()
        .min(1, 'is required')
        .refine(
          (v) => /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)
              || /^https?:\/\//.test(v),
          'must be an image data URL (data:image/...;base64,...) or an http(s) URL'
        ),
      caption: z.string().trim().max(255).optional()
    }).strict().safeParse(req.body);

    if (!parsedPhoto.success) {
      throw ApiError.validation('Invalid photo payload.', parsedPhoto.error.flatten().fieldErrors);
    }
    const { photo, caption } = parsedPhoto.data;

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

    // BR-028 - a photo upload changes what the public directory shows for a unit.
    await auditFromRequest(req, {
      action: 'ROOM_PHOTO_UPLOAD',
      entityType: 'ROOM',
      entityId: req.params.roomId,
      newValues: { roomId: req.params.roomId, uploadedBy: req.user?.profileId }
    });

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

    /**
     * BR-003 - Historical Preservation.
     *
     * This is a hard DELETE, and it was unguarded. The ledger tables survive it:
     * migration `005` moved `bills`, `payments` and `monthly_income_records` to
     * `ON DELETE RESTRICT`, so PostgreSQL refuses to remove a room that has any
     * of them - and today all 33 rooms do, which is why nothing has been lost.
     *
     * Four tables do NOT survive it. `room_price_history`, `room_assignments`,
     * `inquiries` and `room_photos` are all `ON DELETE CASCADE` from `rooms`, so
     * a room without ledger rows - a newly created one, or one never rented -
     * takes its entire history with it, silently and with no confirmation beyond
     * the button press.
     *
     * `room_price_history` is the table BR-003 is anchored to. Destroying the
     * record of every rate the owner ever set, as a side effect of removing a
     * unit created by mistake, is exactly what the rule forbids.
     *
     * So the room is deleted only when it carries no history at all. Anything
     * else is a retirement, and `operational_status` is what expresses that.
     */
    const [assignments, priceHistory, inquiries, photos, bills, payments, income] =
      await Promise.all([
        db.from('room_assignments').select('id', { count: 'exact', head: true }).eq('room_id', req.params.roomId),
        db.from('room_price_history').select('id', { count: 'exact', head: true }).eq('room_id', req.params.roomId),
        db.from('inquiries').select('id', { count: 'exact', head: true }).eq('room_id', req.params.roomId),
        db.from('room_photos').select('id', { count: 'exact', head: true }).eq('room_id', req.params.roomId),
        db.from('bills').select('id', { count: 'exact', head: true }).eq('room_id', req.params.roomId),
        db.from('payments').select('id', { count: 'exact', head: true }).eq('room_id', req.params.roomId),
        db.from('monthly_income_records').select('id', { count: 'exact', head: true }).eq('room_id', req.params.roomId),
      ]);

    const held: string[] = [];
    const note = (count: number | null, singular: string, plural: string) => {
      if (count && count > 0) held.push(`${count} ${count === 1 ? singular : plural}`);
    };
    note(income.count, 'income record', 'income records');
    note(payments.count, 'payment', 'payments');
    note(bills.count, 'bill', 'bills');
    note(assignments.count, 'tenancy record', 'tenancy records');
    note(priceHistory.count, 'rate change', 'rate changes');
    note(inquiries.count, 'inquiry', 'inquiries');
    note(photos.count, 'photo', 'photos');

    if (held.length > 0) {
      throw ApiError.conflict(
        `Unit ${before.room_number} cannot be deleted - it holds ${held.join(', ')}. ` +
          'Deleting it would destroy that history. Set its operational status to ' +
          '"Under Maintenance" to take it out of service instead; the unit and everything ' +
          'recorded against it are kept.'
      );
    }

    const { error } = await db
      .from('rooms')
      .delete()
      .eq('id', req.params.roomId);

    if (error) throw ApiError.internal(error.message);

    // ROOM_DELETE, not ROOM_UPDATE. The row is gone, so this entry is the only
    // remaining record that the unit ever existed - `previousValues` carries the
    // whole row deliberately, as it does for the ticket delete.
    await auditFromRequest(req, {
      action: 'ROOM_DELETE',
      entityType: 'ROOM',
      entityId: req.params.roomId,
      previousValues: before
    });

    res.status(200).json({
      success: true,
      data: { message: `Unit ${before.room_number} deleted. It held no records.` }
    });
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
  /**
   * Optional, per OD-09 (client-confirmed 2026-09-13): "Do tenants need an email address to
   * exist in the system? No. Every tenant is a record; a portal login is optional and
   * separate." `profiles.email` was made nullable by migration `006` to allow exactly this,
   * but this schema still demanded one, so the administrator could not onboard a tenant who
   * has no email - which is the case the client raised in the first place.
   *
   * An empty string is treated as absent, because that is what a cleared form field sends.
   */
  email: z.string().email('Enter a valid email address, or leave it blank.').optional().or(z.literal('')),
  fullName: z.string().min(2, 'Full name is required.'),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  occupation: z.string().optional(),
  facebookUrl: z.string().optional(),
  roomNumber: z.string().optional(),
  moveInDate: z.string().optional(),
  // Advance rent (OD-04), so it is money and takes the finite check with it.
  depositAmount: money.optional(),
  occupantCount: occupantCount.refine((n) => n >= 1, 'must be at least one occupant').optional(),
  roommateQty: occupantCount.optional(),
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

    // An empty string from a cleared form field means "no email", not "".
    const normalizedEmail = email && email.trim() ? email.toLowerCase().trim() : null;

    // Only meaningful when an email was supplied. `profiles.email` is UNIQUE but nullable,
    // and Postgres does not treat NULLs as duplicates of each other, so several tenants
    // without an email coexist happily.
    if (normalizedEmail) {
      const { data: existing, error: checkError } = await db
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (checkError) throw ApiError.internal(checkError.message);
      if (existing) {
        throw ApiError.badRequest('A profile with this email address already exists.');
      }
    }

    /**
     * A portal login is created when there is an identifier to log in WITH - an email or a
     * phone number. The database was built for both: `idx_profiles_phone_login` is a UNIQUE
     * index on `normalize_ph_phone(phone_number)` restricted to profiles that have a
     * password, and `normalize_ph_phone()` folds 0917.../+63917.../63917... to one form.
     * Those objects exist for phone login specifically.
     *
     * OD-09 makes the login optional and separate from the tenancy record, and the
     * `profiles_login_identifier_required` CHECK enforces the same thing from below:
     * `password_hash IS NULL OR email IS NOT NULL OR phone_number IS NOT NULL`. Setting a
     * password on a profile with no identifier would violate it, so a tenant onboarded
     * without an email is a record with no credentials - exactly what the client described.
     */
    const normalizedPhone = phone && phone.trim() ? phone.trim() : null;

    /**
     * The same duplicate check the email path has always had, for the identifier that only
     * just became one.
     *
     * `idx_profiles_phone_login` is UNIQUE on `normalize_ph_phone(phone_number)` among
     * profiles that hold a password. Onboarding a second tenant whose number folds to the
     * same form would therefore fail at the insert, and the handler surfaces an insert error
     * as `ApiError.internal(insertError.message)` - a 500 carrying a raw
     * "duplicate key value violates unique constraint" string to the administrator. A
     * foreseeable data clash should be a 400 that says what to do about it.
     *
     * The test goes through `resolve_login_identifier`, which is the function the login path
     * uses, so "would this number already sign someone in?" is answered by the thing that
     * does the signing in. No second copy of the normalisation rule. Its email branch cannot
     * match here: a phone number is not an email address.
     */
    if (normalizedPhone) {
      const { data: phoneOwner, error: phoneCheckError } = await db.rpc(
        'resolve_login_identifier',
        { p_identifier: normalizedPhone }
      );

      if (phoneCheckError) throw ApiError.internal(phoneCheckError.message);
      if (Array.isArray(phoneOwner) && phoneOwner.length > 0) {
        throw ApiError.badRequest(
          'That phone number already signs someone in to the portal. Use a different number, ' +
          'or leave the phone blank if this tenant does not need a login.'
        );
      }
    }

    let passwordHash: string | null = null;
    if (normalizedEmail || normalizedPhone) {
      const tempPassword = 'Hivelet@Tenant2026';
      const bcrypt = (await import('bcryptjs')).default;
      passwordHash = await bcrypt.hash(tempPassword, 12);
    }

    // Insert new profile
    const { data: profile, error: insertError } = await db
      .from('profiles')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: fullName,
        phone_number: normalizedPhone,
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
        .select('id, current_price')
        .ilike('room_number', roomNumber)
        .maybeSingle();

      if (roomError) throw ApiError.internal(roomError.message);
      if (!room) throw ApiError.notFound(`Room/Unit ${roomNumber} not found.`);

      const finalOccupants = occupantCount ?? (roommateQty !== undefined ? 1 + roommateQty : 1);

      /**
       * BR-039 — the advance rent equals the rent in effect at move-in.
       *
       * OD-04: this sum is ADVANCE RENT, not a refundable security deposit. This
       * business collects no separate damage sum, so by definition it is one
       * month's rent for the unit being moved into.
       *
       * This route used to write `depositAmount || 0.00`, so an onboarding that
       * omitted the figure recorded a tenancy with NO advance rent - which is not
       * what happened in the world - and one that sent any figure at all had it
       * accepted unexamined. The rule was recorded as Violated for that reason.
       *
       * The rent is now the source: omit the field and the unit's `current_price`
       * is used. A figure that is supplied and DIFFERS is still accepted, because
       * the landlady may genuinely have agreed something else, but the divergence
       * is written to the audit log with both numbers so it is attributable rather
       * than silent. That is the same posture BR-036 takes on a mismatched water
       * entry: warn and record, do not quietly overwrite the human.
       */
      const rentAtMoveIn = Number(room.current_price) || 0;
      const suppliedDeposit = depositAmount === undefined || depositAmount === null
        ? undefined
        : Number(depositAmount);
      const finalDeposit = suppliedDeposit === undefined || suppliedDeposit === 0
        ? rentAtMoveIn
        : suppliedDeposit;
      const divergesFromRent = finalDeposit !== rentAtMoveIn;

      // Create room assignment
      const { error: assignError } = await db
        .from('room_assignments')
        .insert({
          room_id: room.id,
          tenant_profile_id: profile.id,
          start_date: moveInDate || new Date().toISOString().slice(0, 10),
          anniversary_date: moveInDate || new Date().toISOString().slice(0, 10),
          deposit_amount: finalDeposit,
          occupant_count: finalOccupants,
          is_active: true
        });

      if (assignError) throw ApiError.internal(assignError.message);

      if (divergesFromRent) {
        await auditFromRequest(req, {
          action: 'TENANT_CREATE',
          entityType: 'ROOM_ASSIGNMENT',
          entityId: profile.id,
          newValues: {
            note: 'Advance rent recorded differs from the unit rent at move-in (BR-039).',
            room_number: roomNumber,
            rent_at_move_in: rentAtMoveIn,
            advance_rent_recorded: finalDeposit
          }
        }).catch(() => {});
      }

      // Update room status to Occupied
      assertWritten(
        await db
          .from('rooms')
          .update({ operational_status: 'Occupied' })
          .eq('id', room.id),
        `Unit ${roomNumber} was assigned, but its status could not be set to Occupied`
      );
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
  occupantCount: occupantCount.refine((n) => n >= 1, 'must be at least one occupant').optional(),
  roommateQty: occupantCount.optional(),
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

      // Deactivate old assignments.
      //
      // Silently skipping this used to leave the previous tenancy active. The
      // tenant then occupied two units at once in every occupancy figure, and
      // the next assignment to the old unit failed on
      // `idx_single_active_assignment_per_room` - a unique violation surfacing
      // much later, nowhere near the cause.
      assertWritten(
        await db
          .from('room_assignments')
          .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
          .eq('tenant_profile_id', req.params.profileId)
          .eq('is_active', true),
        'The previous tenancy could not be closed'
      );

      // If old room is now empty, set operational_status to Available
      if (oldActive && oldActive.length > 0) {
        for (const old of oldActive) {
          const { count } = await db
            .from('room_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', old.room_id)
            .eq('is_active', true);
          if (!count || count === 0) {
            assertWritten(
              await db.from('rooms').update({ operational_status: 'Available' }).eq('id', old.room_id),
              'The vacated unit could not be marked Available'
            );
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
                assertWritten(
                  await db
                    .from('room_assignments')
                    .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
                    .eq('id', a.id),
                  `Unit ${roomNumber.toUpperCase()} still holds a stale tenancy that could not be closed`
                );
              } else {
                throw ApiError.badRequest(`Unit ${roomNumber.toUpperCase()} is already occupied by active tenant ${prof?.full_name || 'another resident'}.`);
              }
            }
          }
        }

        // `deposit_amount` is ADVANCE RENT, not a refundable security deposit - this business
        // collects no separate damage or security sum (OD-04, confirmed 2026-09-13). The previous
        // default here was `current_price * 2`, the familiar one-month-advance-plus-one-month-
        // deposit arrangement, which invented a figure that was never collected and wrote it into
        // a financial record. Carry forward what the tenant actually had; otherwise leave it at
        // zero for the administrator to enter. Never fabricate money.
        const prevDeposit = Number(oldActive?.[0]?.deposit_amount ?? 0);
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

        assertWritten(
          await db
            .from('rooms')
            .update({ operational_status: 'Occupied' })
            .eq('id', room.id),
          'The tenancy was moved, but the new unit could not be marked Occupied'
        );
      }
    } else if (explicitOccupants !== undefined) {
      // Room number did not change, but occupant count was updated directly.
      // The water charge is occupants x rate (BR-014), so a silently dropped
      // change here bills the tenant on the old headcount indefinitely.
      assertWritten(
        await db
          .from('room_assignments')
          .update({ occupant_count: explicitOccupants })
          .eq('tenant_profile_id', req.params.profileId)
          .eq('is_active', true),
        'The occupant count could not be updated'
      );
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

    // Deactivate assignments.
    //
    // BR-025. This is the departure path. Discarding the result meant the tenant
    // could be marked inactive while still holding an active tenancy: the unit
    // never frees, it keeps counting as occupied, and the next assignment to it
    // fails on `idx_single_active_assignment_per_room` long afterwards.
    assertWritten(
      await db
        .from('room_assignments')
        .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
        .eq('tenant_profile_id', req.params.profileId)
        .eq('is_active', true),
      'The tenancy could not be closed, so this unit is still recorded as occupied'
    );

    // Free rooms
    if (activeAssignments && activeAssignments.length > 0) {
      for (const a of activeAssignments) {
        assertWritten(
          await db.from('rooms').update({ operational_status: 'Available' }).eq('id', a.room_id),
          'The tenancy was closed, but the unit could not be marked Available'
        );
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
  /**
   * BR-009 - the tenancy this inquiry became.
   *
   * `inquiries.converted_tenant_id` has existed since the original schema and
   * nothing ever wrote to it. The admin UI carries the prospect's details into
   * the onboarding form, so the "no retyping" half of the rule was met - but
   * after onboarding, the lead stayed `Pending` in the inbox forever and nothing
   * recorded that it had become a tenancy. The column is the link; this is what
   * sets it.
   */
  convertedTenantId: uuid.optional(),
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

    const patch: Record<string, unknown> = {
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.convertedTenantId) {
      // Checked rather than trusted: the column is a foreign key, so a bad id
      // would fail anyway - but as a raw constraint error rather than something
      // the administrator can act on.
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('id')
        .eq('id', parsed.data.convertedTenantId)
        .maybeSingle();

      if (profileError) throw ApiError.internal(profileError.message);
      if (!profile) {
        throw ApiError.notFound('The tenant this inquiry should be linked to does not exist.');
      }
      patch.converted_tenant_id = parsed.data.convertedTenantId;
    }

    const { data: after, error } = await db
      .from('inquiries')
      .update(patch)
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

    // Same derivation as GET /tenant/my-bills - see the note on
    // `withEffectiveStatus` there. Nothing in this system ever writes 'Overdue',
    // so it is computed from the due date on read and `status` is left as stored.
    const now = new Date();
    const withStatus = await Promise.all(
      (data ?? []).map(async (b: { due_date: string; grace_period_end_date?: string | null; status: string }) => ({
        ...b,
        effective_status: (await isOverdue(b, now)) ? 'Overdue' : b.status,
      }))
    );
    res.status(200).json({ success: true, data: withStatus });
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

    /**
     * VERIFYING A PAYMENT IS THREE WRITES, AND THEY MUST NOT HAPPEN SEPARATELY.
     *
     * Marking the payment Verified, marking its bill Paid, and writing the
     * monthly income row used to be three PostgREST round trips with nothing
     * joining them, because supabase-js cannot open a transaction. If the third
     * failed - `contact_name` and `invoice_number` are NOT NULL, `payment_method`
     * is an enum, `rent_amount` carries a CHECK - the first two had already
     * committed. The payment read Verified, the bill read Paid, and no income was
     * ever recorded. Money collected, debt closed, ledger blank, and nothing on
     * screen to say so.
     *
     * Migration 018 added `settle_verified_payment()`. A plpgsql body runs in one
     * implicit transaction, so all three commit together or none do. Verified
     * against the live database by deliberately rejecting the ledger row: the
     * payment stayed Pending Verification and the bill stayed Due.
     *
     * The figures are therefore computed BEFORE anything is written, and the
     * payment update moved inside that call. Rejection is left as a direct
     * update - it touches no ledger row, so there is nothing to tear.
     */
    let after: Record<string, unknown> | null = null;

    if (!isVerified) {
      const { data: updated, error } = await db
        .from('payments')
        .update({
          verification_status: parsed.data.verification_status,
          verified_at: null,
          verified_by: null,
        })
        .eq('id', req.params.paymentId)
        .select('*')
        .single();

      if (error) throw ApiError.internal(error.message);
      after = updated;
    }

    // System Bible Section 22 — "Payment verified -> financial records update."
    if (isVerified) {
      // Read-only: the bill's own figures are the terms the tenant was invoiced
      // under, so they are preferred over anything derived. Nothing is written
      // until the single call at the end of this block.
      let billData: any = null;
      if (before.bill_id) {
        const { data: b } = await db
          .from('bills')
          .select('*')
          .eq('id', before.bill_id)
          .maybeSingle();
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

      // The unit's code decides whether water is per-occupant or a Linda fixed charge
      // (BR-014 / BR-040), so it has to be known before the water figure can be derived.
      const { data: paidRoom } = await db
        .from('rooms')
        .select('room_number')
        .eq('id', before.room_id)
        .maybeSingle();

      const occupants = assignment?.occupant_count || 1;

      // Rate read from system_settings, never hardcoded (defect 2). Prefer the bill's own
      // figures when there is a bill - those are the terms the tenant was invoiced under.
      const derivedWater = await computeWaterFee(paidRoom?.room_number ?? '', occupants);
      const waterAmount = billData?.water_amount ?? derivedWater.amount;
      const rentAmount = billData?.rent_amount ?? (before.amount - waterAmount);

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

      // `payment_method` is NOT hardcoded. It used to read 'GCash', so an
      // `Adyen Online` settlement was written into the ledger as GCash. The
      // function falls back to the payment's own method.
      const incomePayload =
        !existingIncome && before.transaction_reference
          ? {
              room_id: before.room_id,
              tenant_profile_id: before.tenant_profile_id,
              assignment_id: assignment?.id ?? null,
              year,
              month,
              date_paid: datePaid.toISOString().split('T')[0],
              contact_name: tenantProfile?.full_name || 'Online Resident',
              invoice_number: before.transaction_reference,
              rent_period_start: rentPeriodStart,
              rent_period_end: rentPeriodEnd,
              rent_amount: rentAmount,
              occupants,
              water_payment: waterAmount,
              transaction_reference: before.transaction_reference,
            }
          : null;

      // All three writes, one transaction. Idempotent by verification_status, so
      // a retry cannot double-post a ledger row.
      const { error: settleError } = await db.rpc('settle_verified_payment', {
        p_payment_id: req.params.paymentId,
        p_verified_by: req.user!.profileId,
        p_income: incomePayload,
      });

      if (settleError) {
        throw ApiError.internal(
          `Could not settle this payment: ${settleError.message}. ` +
            'Nothing was changed - the payment is still awaiting verification.'
        );
      }

      const { data: settled } = await db
        .from('payments')
        .select('*')
        .eq('id', req.params.paymentId)
        .single();
      after = settled;

      // Secondary to a settlement that has already committed, so a failure is
      // logged rather than thrown - throwing would report a successful payment
      // as an error and invite the administrator to record it twice.
      warnIfWriteFailed(
        await db.from('notifications').insert({
        recipient_profile_id: before.tenant_profile_id,
        title: 'Online Payment Verified',
        message: `Your online payment of ₱${before.amount.toLocaleString()} (Ref: ${before.transaction_reference}) has been verified and settled by the administrator.`,
          type: 'Payment',
          priority: 'Low',
          is_read: false,
        }),
        'Settlement notification'
      );
    } else if (isRejected) {
      // Revert bill status to 'Due' if it was linked.
      //
      // This runs when an administrator REJECTS a payment. Discarding the result
      // meant a declined payment could leave its bill still reading Paid - the
      // money was not collected, the debt was closed, and nobody would chase it,
      // because as far as the system was concerned there was nothing to chase.
      if (before.bill_id) {
        assertWritten(
          await db
            .from('bills')
            .update({ status: 'Due', updated_at: new Date().toISOString() })
            .eq('id', before.bill_id),
          'The payment was rejected, but its bill could not be reopened and may still read Paid'
        );
      }

      warnIfWriteFailed(
        await db.from('notifications').insert({
        recipient_profile_id: before.tenant_profile_id,
        title: 'Payment Verification Declined',
        message: `Your online payment submission (Ref: ${before.transaction_reference || 'N/A'}) was declined. Please contact the administrator.`,
          type: 'Payment',
          priority: 'High',
          is_read: false,
        }),
        'Rejection notification'
      );
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

/**
 * GET /api/admin/reports/income.xlsx?year=YYYY
 *
 * BR-049 / FR-044 - the Monthly Income Report as a real spreadsheet, in the
 * layout `docs/09_MONTHLY_INCOME_REPORT.md` documents: month blocks, units in
 * canonical order inside each cluster, a subtotal per cluster, a grand subtotal
 * that excludes Linda, and Linda's own section beneath it.
 *
 * The CSV export in the browser already satisfies **BR-030** - the records leave
 * the system in a format Excel opens. This is the stricter rule: the *layout*,
 * which CSV cannot express.
 *
 * Streamed rather than buffered into a string, because a full year of the
 * owner's ledger is thousands of styled cells and there is no reason to hold the
 * whole file in memory to hand it over.
 */
router.get(
  '/admin/reports/income.xlsx',
  requirePermission(PERMISSIONS.INCOME_LEDGER_READ),
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year ?? new Date().getFullYear());

    const workbook = await buildIncomeReportWorkbook(year);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="hivelet-income-${year}.xlsx"`
    );

    await auditFromRequest(req, {
      action: 'LEDGER_EXPORT',
      entityType: 'INCOME_RECORD',
      entityId: String(year),
      newValues: { export: 'xlsx', year },
    });

    await workbook.xlsx.write(res);
    res.end();
  })
);

/**
 * GET /api/admin/reports/expenses.xlsx?year=YYYY
 *
 * BR-049 / FR-044 - the other half. `docs/10_MONTHLY_EXPENSES_REPORT.md` describes
 * a month block with two totals systems side by side: Property Area columns
 * summed at the bottom, and a category summary down the right with a "this month"
 * figure and a running cumulative. The sheet prints both and states whether they
 * reconcile, which is **BR-047** and is what the owner checks by eye today.
 */
router.get(
  '/admin/reports/expenses.xlsx',
  requirePermission(PERMISSIONS.EXPENSE_LEDGER_READ),
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year ?? new Date().getFullYear());

    const workbook = await buildExpenseReportWorkbook(year);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="hivelet-expenses-${year}.xlsx"`
    );

    await auditFromRequest(req, {
      action: 'LEDGER_EXPORT',
      entityType: 'EXPENSE_ENTRY',
      entityId: String(year),
      newValues: { export: 'xlsx', ledger: 'expenses', year },
    });

    await workbook.xlsx.write(res);
    res.end();
  })
);

router.get(
  '/admin/income-records',
  requirePermission(PERMISSIONS.INCOME_LEDGER_READ),
  asyncHandler(async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;

    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      let query = db
        .from('monthly_income_records')
        .select('*, rooms:room_id (id, room_number, cluster_code)')
        .is('voided_at', null)
        .order('date_paid', { ascending: false })
        .range(from, from + batchSize - 1);

      if (year) query = query.eq('year', year);
      if (month) query = query.eq('month', month);

      const { data, error } = await query;
      if (error) throw ApiError.internal(error.message);
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    res.status(200).json({ success: true, data: allData });
  })
);

/**
 * Body schema for a NEW income-record entry.
 *
 * Two corrections here, both about the ledger being the book of record.
 *
 * `rentAmount` used `z.number().min(0)`. Zod's `z.number()` does reject NaN, but
 * it ACCEPTS `Infinity` - and PostgreSQL sorts Infinity above every numeric, so
 * `CHECK (rent_amount >= 0)` passes it, both GENERATED columns derive from it,
 * and every SUM over the ledger returns Infinity from that row onward. The
 * shared `money` primitive is `.finite()` and rejects both. The PATCH route was
 * fixed earlier; this create route was still open.
 *
 * `invoiceNumber` was optional, and the handler substituted
 * `INV-<year>-<4 random digits>` when it was absent. That writes a receipt number
 * matching no receipt in the landlady's book, from a 9,000-value space that
 * collides at roughly even odds after a hundred entries. All 937 historical rows
 * carry a real OR number (`OR#4627` and so on), and the column is NOT NULL, so
 * the number is asked for rather than invented.
 */
const incomeRecordSchema = z.object({
  roomNumber: shortText(20),
  datePaid: isoDate,
  contactName: shortText(255),
  invoiceNumber: shortText(100),
  rentAmount: money,
  occupants: occupantCount.refine((n) => n >= 1, 'must be at least one occupant'),
  /**
   * `payment_method_type` is (Cash | GCash | Bank Transfer | Adyen Online). Three of those
   * can be taken over the counter; 'Adyen Online' is written only by the gateway's webhook,
   * so it is deliberately NOT offered here - an administrator must not be able to assert by
   * hand that money arrived through Adyen.
   *
   * 'Online' is kept as an accepted input because that is the value the on-site modal used
   * to send, and a request already in flight should not start failing.
   */
  paymentMethod: z.enum(['Cash', 'Online', 'GCash', 'Bank Transfer']).default('Cash'),
  transactionReference: shortText(120).optional(),
  monthsCovered: z.number().int().min(1).max(60),
  // BR-033 - optional, and derived from the tenancy's anniversary cycle when
  // omitted. They were required, and the form defaulted the start to the DATE
  // PAID, so a tenant on a 13th-of-the-month cycle who paid on the 20th had the
  // period recorded as starting on the 20th. "Rent For" is supposed to come from
  // the stored anniversary and the current cycle, not be typed per entry.
  dateCoveredStart: isoDate.optional(),
  dateCoveredEnd: isoDate.optional(),
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

    // 'Online' was the old form's word for GCash; everything else is already an enum value.
    const normalizedMethod =
      paymentMethod === 'Online' ? 'GCash' :
      paymentMethod === 'GCash' ? 'GCash' :
      paymentMethod === 'Bank Transfer' ? 'Bank Transfer' : 'Cash';

    /**
     * `payments.payment_source` is free text describing where the money came in - the
     * existing literals are 'On-Site Cash' here, 'GCash (Adyen webhook)' in the webhook
     * handler, and 'Local checkout (no gateway configured)' in the Adyen service.
     *
     * It was hardcoded to 'On-Site Cash' on every row this endpoint wrote, including rows
     * whose `payment_method` said GCash. The two columns then contradicted each other in the
     * same row. Nothing had noticed because no GCash row has ever been written by hand - all
     * 15 live payments are 7 Cash and 8 Adyen Online - but the moment one is, the row would
     * misdescribe itself. Same shape as the existing literal, so no new vocabulary.
     */
    const paymentSource = `On-Site ${normalizedMethod}`;

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
      .select('id, tenant_profile_id, anniversary_date, occupant_count')
      .eq('room_id', room.id)
      .eq('is_active', true)
      .maybeSingle();

    if (assignError) throw ApiError.internal(assignError.message);

    // BR-014 / BR-040 - the rate comes from system_settings and the two Linda units are on a
    // fixed charge. Previously `occupants * 200`, which could not be changed without a deploy.
    const { amount: calcWater } = await computeWaterFee(roomNumber, occupants);

    /**
     * BR-033 - the rent period comes from the tenancy's own cycle.
     *
     * The two dates were required fields, and the form defaulted the start to the
     * date paid. A tenant whose anniversary is the 13th, paying on the 20th, had
     * the period recorded as starting on the 20th - so the ledger's "Rent For"
     * column drifted away from the cycle the rent actually belongs to, one
     * receipt at a time.
     *
     * `computeRentPeriod()` derives it from the stored anniversary, which is what
     * the rule asks for. A supplied value is still honoured - 937 historical rows
     * were migrated with periods taken from the owner's own book, and a
     * back-dated correction is legitimate - but a divergence is recorded rather
     * than passed over, the same posture BR-039 takes on advance rent.
     */
    const derivedPeriod = assign?.anniversary_date
      ? await computeRentPeriod(assign.anniversary_date, datePaid, monthsCovered)
      : null;

    const periodStart = dateCoveredStart ?? derivedPeriod?.start;
    const periodEnd = dateCoveredEnd ?? derivedPeriod?.end;

    if (!periodStart || !periodEnd) {
      throw ApiError.validation(
        'The rent period could not be determined.',
        {
          dateCoveredStart: [
            'This unit has no active tenancy to derive the period from, so the dates ' +
              'covered must be supplied.'
          ]
        }
      );
    }

    const periodDiverges =
      derivedPeriod !== null &&
      (periodStart !== derivedPeriod.start || periodEnd !== derivedPeriod.end);

    /**
     * BR-034 - occupant count carries forward from the tenancy and is editable.
     *
     * The form derives it from the live tenancy, which is the carry-forward. A
     * different figure is accepted, because a roommate may have left before the
     * tenancy was updated and the receipt should record what was actually
     * charged - water is occupants x rate (BR-014), so the two must agree with
     * the money collected. The divergence is recorded rather than passed over.
     */
    const carriedOccupants = assign?.occupant_count ?? null;
    const occupantsDiverge = carriedOccupants !== null && occupants !== carriedOccupants;

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
        // Required by the schema above, so there is nothing to substitute.
        invoice_number: invoiceNumber,
        rent_amount: rentAmount,
        occupants,
        water_payment: calcWater,
        payment_method: normalizedMethod,
        transaction_reference: transactionReference || null,
        rent_period_start: periodStart,
        rent_period_end: periodEnd,
        verification_status: 'Verified'
      })
      .select('*')
      .single();

    if (insertError) throw ApiError.internal(insertError.message);

    // Sync: if this is recorded for an active tenant assignment, check and update their bills
    // Audited here rather than after settlement, so that a settlement failure
    // below still leaves a record that this income row was created. It was, and
    // it is kept.
    await auditFromRequest(req, {
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: newRecord.id,
      newValues:
        periodDiverges || occupantsDiverge
          ? {
              ...newRecord,
              // Kept, because the administrator may have a reason - but
              // attributable rather than silent.
              ...(periodDiverges
                ? {
                    rentPeriodOverride: {
                      supplied: { start: periodStart, end: periodEnd },
                      derivedFromAnniversary: derivedPeriod
                    }
                  }
                : {}),
              ...(occupantsDiverge
                ? {
                    occupantCountOverride: {
                      recorded: occupants,
                      carriedFromTenancy: carriedOccupants
                    }
                  }
                : {})
            }
          : newRecord
    });

    if (assign?.tenant_profile_id) {
      /**
       * BR-013 - apply this receipt to what the tenant actually owes.
       *
       * The decision of where the money goes is `allocateReceipt()` in
       * billingService, which is pure arithmetic and directly tested by
       * `npm run check:billing`. Everything here is the I/O around it: read the
       * open bills, read what has already been paid against them, then write the
       * plan it returns and check every write.
       */
      const { data: openBills, error: openBillsError } = await db
        .from('bills')
        .select('id, total_amount, status')
        .eq('tenant_profile_id', assign.tenant_profile_id)
        .in('status', ['Due', 'Overdue', 'Pending', 'Partially Paid'])
        .order('due_date', { ascending: true });

      if (openBillsError) {
        throw ApiError.internal(
          'The income record was saved and kept, but this tenant\'s bills could not be ' +
            `read to settle against: ${openBillsError.message}. No bill was changed.`
        );
      }

      // One query for every prior verified payment across all of these bills,
      // rather than one query per bill inside the loop.
      const billIds = (openBills ?? []).map((b) => String(b.id));
      const paidByBill = new Map<string, number>();

      if (billIds.length > 0) {
        const { data: priorPayments, error: priorError } = await db
          .from('payments')
          .select('bill_id, amount')
          .in('bill_id', billIds)
          .eq('verification_status', 'Verified');

        if (priorError) {
          throw ApiError.internal(
            'The income record was saved and kept, but prior payments could not be read, ' +
              `so this receipt was not applied to any bill: ${priorError.message}`
          );
        }

        for (const pmt of priorPayments ?? []) {
          const key = String((pmt as { bill_id: string | null }).bill_id);
          const amt = Number((pmt as { amount: number }).amount);
          paidByBill.set(key, (paidByBill.get(key) ?? 0) + amt);
        }
      }

      const plan = allocateReceipt(
        Number(rentAmount || 0) + Number(calcWater || 0),
        (openBills ?? []).map((b) => ({
          id: String(b.id),
          total_amount: b.total_amount,
          status: String(b.status),
          paidSoFar: paidByBill.get(String(b.id)) ?? 0,
        }))
      );

      // The receipt number the administrator entered. This previously generated
      // `CASH-REC-<6 random digits>` - a reference matching no document anyone
      // holds. Several bills settled from one receipt now carry that receipt's
      // number, which is what makes them traceable back to it.
      const reference = transactionReference || invoiceNumber;

      // Bills earlier payments already covered, whose stored status never caught up.
      for (const billId of plan.corrections) {
        const { error: fixError } = await db
          .from('bills')
          .update({ status: 'Paid', updated_at: new Date().toISOString() })
          .eq('id', billId);

        if (fixError) {
          throw ApiError.internal(
            `The income record was saved, but a bill already covered by earlier payments ` +
              `could not be corrected to Paid: ${fixError.message}`
          );
        }
      }

      for (const step of plan.steps) {
        // The payment row goes in FIRST, deliberately. If the status update then
        // fails, the money is recorded against the debt and only the status is
        // stale - visible, and recoverable by hand. The other order leaves a bill
        // marked Paid with nothing recorded against it, which is the failure this
        // project has already been bitten by once.
        const { error: paymentError } = await db.from('payments').insert({
          bill_id: step.billId,
          room_id: room.id,
          tenant_profile_id: assign.tenant_profile_id,
          amount: step.amount,
          payment_method: normalizedMethod,
          payment_source: paymentSource,
          verification_status: 'Verified',
          transaction_reference: reference,
          paid_at: new Date(datePaid).toISOString(),
          verified_at: new Date().toISOString(),
          verified_by: req.user!.profileId,
        });

        if (paymentError) {
          throw ApiError.internal(
            `The income record was saved, but ${step.amount.toFixed(2)} of it could not be ` +
              `applied to this tenant's account: ${paymentError.message}. No bill was marked ` +
              'paid by this step - check the tenant before recording anything else.'
          );
        }

        if (step.billId === null || step.billStatus === null) continue;

        const { error: billError } = await db
          .from('bills')
          .update({ status: step.billStatus, updated_at: new Date().toISOString() })
          .eq('id', step.billId);

        if (billError) {
          throw ApiError.internal(
            `${step.amount.toFixed(2)} was recorded against this bill, but its status could ` +
              `not be updated: ${billError.message}. The money is not lost - the bill still ` +
              'reads unpaid and needs correcting by hand.'
          );
        }
      }
    }

    res.status(201).json({ success: true, data: newRecord });
  })
);

/**
 * PATCH /api/admin/income-records/:id
 * Updates an income record in-place without voiding/recreating.
 */
/**
 * Body schema for an income-record edit.
 *
 * This route previously read `req.body` directly and passed `rentAmount` through
 * `Number()`. `Number('abc')` is NaN, and PostgreSQL sorts NaN above every
 * numeric - so `CHECK (rent_amount >= 0)` would have ACCEPTED it, and the two
 * GENERATED columns derived from it, plus every SUM over the ledger, would have
 * become NaN from that row onward. See `utils/validators.ts`.
 */
const incomeRecordPatchSchema = z.object({
  roomNumber: shortText(20).optional(),
  datePaid: isoDate.optional(),
  contactName: shortText(255).optional(),
  invoiceNumber: shortText(100).optional(),
  rentAmount: money.optional(),
  occupants: occupantCount.optional(),
  paymentMethod: z.enum(['Cash', 'GCash', 'Bank Transfer', 'Adyen Online']).optional(),
  transactionReference: shortText(120).optional(),
  monthsCovered: z.number().int().min(1).max(60).optional(),
  dateCoveredStart: isoDate.optional(),
  dateCoveredEnd: isoDate.optional()
}).strict();

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

    const parsedBody = incomeRecordPatchSchema.safeParse(req.body);
    if (!parsedBody.success) {
      throw ApiError.validation(
        'Invalid income record payload.',
        parsedBody.error.flatten().fieldErrors
      );
    }
    const {
      roomNumber, datePaid, contactName, invoiceNumber, rentAmount,
      occupants, paymentMethod, transactionReference, monthsCovered,
      dateCoveredStart, dateCoveredEnd
    } = parsedBody.data;

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

    // Resolve the unit's code so the Linda fixed charge is honoured on edits too. When the
    // caller did not change the room, fall back to the row's existing one.
    const { data: editRoom } = await db
      .from('rooms')
      .select('room_number')
      .eq('id', roomId)
      .maybeSingle();

    const { amount: water } = await computeWaterFee(editRoom?.room_number ?? '', occ);

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
      // The schema already constrains this to the four values of
      // `payment_method_type`, so it is written through unchanged.
      //
      // It used to read:
      //   (paymentMethod === 'Online' || paymentMethod === 'GCash') ? 'GCash' : 'Cash'
      // which collapsed four methods into two. 'Online' is not a value of the
      // enum at all, so that branch was dead - and 'Bank Transfer' and 'Adyen
      // Online' both fell through to the else and were silently rewritten as
      // 'Cash'. Editing any other field on a record paid by bank transfer would
      // have changed how that payment was recorded. TypeScript surfaced it the
      // moment the body was given a real schema.
      updatePatch.payment_method = paymentMethod;
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
  asyncHandler(async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : undefined;

    let allData: any[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      let query = db
        .from('monthly_expense_entries')
        .select(
          '*, fixed_expense_categories:category_code (code, name, parent_code), ' +
            'expense_property_allocations (id, property_area, amount)'
        )
        .is('voided_at', null)
        .order('expense_date', { ascending: false })
        .range(from, from + batchSize - 1);

      if (year) {
        query = query.gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw ApiError.internal(error.message);
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    res.status(200).json({ success: true, data: allData });
  })
);

const expenseAllocationSchema = z.object({
  // Accepts a canonical area or a known short form, and normalises it. Anything unresolvable is
  // rejected here, BEFORE any write - which is what keeps the PATCH handler below from deleting an
  // entry's allocations and then failing to insert the replacements (migration 008 added the
  // foreign key that would reject them).
  propertyArea: z
    .string()
    .transform(normalizePropertyArea)
    .refine((a): a is PropertyArea => a !== null, {
      message: `Property area must be one of: ${PROPERTY_AREAS.join(', ')}`
    }),
  // `money`, not `z.number().min(0)`. Zod's `z.number()` rejects NaN but ACCEPTS
  // Infinity, and PostgreSQL sorts Infinity above every numeric - it would pass
  // the column's CHECK, poison the entry's derived total, and make every SUM
  // over the expense ledger return Infinity from that row onward. The PATCH
  // route below already used the shared `.finite()` primitive; this one did not.
  amount: money
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

    /**
     * Atomic - migration 019. BR-047.
     *
     * This was two unrelated round trips: insert the entry with a total computed
     * here, then insert the allocations. If the second failed - a bad area, the
     * foreign key migration 008 added, a duplicate (entry, area) pair - the first
     * had already committed, leaving an entry carrying a real total with NOTHING
     * underneath it. That is exactly the imbalance BR-047 forbids: the category
     * side of the month gains an amount the Property Area side never sees, and
     * nothing in the application would ever notice. The caller saw the error; the
     * orphaned row stayed behind regardless.
     *
     * `total_expenses` is no longer sent. It is derived inside the transaction
     * from the allocation rows themselves, so the stored figure and the rows
     * beneath it are one assertion instead of two that happen to agree.
     *
     * Migration 010 gave the UPDATE path this treatment. This is the create path.
     */
    const { data: created, error: createError } = await db.rpc(
      'create_expense_entry_with_allocations',
      {
        p_expense_date: expenseDate,
        p_or_supplier: orSupplier,
        p_category_code: categoryCode,
        p_allocations: allocations.map((a) => ({
          property_area: a.propertyArea,
          amount: a.amount
        })),
        p_created_by: req.user!.profileId
      }
    );

    if (createError) throw ApiError.internal(createError.message);
    if (!created) {
      throw ApiError.internal('The expense entry was not created and nothing was written.');
    }

    const entry = created as Record<string, unknown>;

    await auditFromRequest(req, {
      action: 'EXPENSE_CREATE',
      entityType: 'EXPENSE_ENTRY',
      entityId: String(entry.id),
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

    const parsedEntry = z.object({
      expenseDate: isoDate.optional(),
      orSupplier: shortText(500).optional(),
      categoryCode: shortText(20).optional(),
      // Allocation shape is checked here; each property_area is then normalised
      // to a canonical value below before anything is written.
      allocations: z.array(z.object({
        propertyArea: z.string().optional(),
        area: z.string().optional(),
        amount: money
      })).min(1, 'at least one allocation is required').optional()
    }).strict().safeParse(req.body);

    if (!parsedEntry.success) {
      throw ApiError.validation(
        'Invalid expense entry payload.',
        parsedEntry.error.flatten().fieldErrors
      );
    }
    const { expenseDate, orSupplier, categoryCode, allocations } = parsedEntry.data;

    // Normalise and validate EVERY allocation before touching a single row. The replacement below
    // is atomic, but rejecting a bad payload up front gives the caller a 400 that names the problem
    // instead of a database foreign-key error.
    let normalizedAllocations: { property_area: PropertyArea; amount: number }[] | null = null;
    if (allocations !== undefined) {
      if (!Array.isArray(allocations) || allocations.length === 0) {
        throw ApiError.validation('allocations must be a non-empty array.');
      }
      normalizedAllocations = allocations.map((a: any, i: number) => {
        const area = normalizePropertyArea(a?.propertyArea ?? a?.area);
        if (!area) {
          throw ApiError.validation(
            `allocations[${i}].propertyArea is not a recognised Property Area. ` +
            `Expected one of: ${PROPERTY_AREAS.join(', ')}.`
          );
        }
        const amount = Number(a?.amount ?? 0);
        if (!Number.isFinite(amount) || amount < 0) {
          throw ApiError.validation(`allocations[${i}].amount must be a number of at least 0.`);
        }
        return { property_area: area, amount };
      });
    }

    const totalExpenses = normalizedAllocations
      ? normalizedAllocations.reduce((acc, curr) => acc + curr.amount, 0)
      : before.total_expenses;

    const updatePatch: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    if (expenseDate) updatePatch.expense_date = expenseDate;
    if (orSupplier) updatePatch.or_supplier = orSupplier;
    if (categoryCode) updatePatch.category_code = categoryCode;
    if (normalizedAllocations) updatePatch.total_expenses = totalExpenses;

    const { data: after, error: updateError } = await db
      .from('monthly_expense_entries')
      .update(updatePatch)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateError) throw ApiError.internal(updateError.message);

    if (normalizedAllocations) {
      // Atomic delete-and-reinsert inside one database transaction
      // (database/migrations/010_atomic_expense_allocations.sql). Doing this as two PostgREST
      // round trips meant a rejected insert left the entry with no allocations at all.
      const { error: replaceError } = await db.rpc('replace_expense_allocations', {
        p_entry_id: req.params.id,
        p_allocations: normalizedAllocations
      });
      if (replaceError) throw ApiError.internal(replaceError.message);
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
      assertWritten(
        await db.from('rooms').update({ operational_status: 'Under Maintenance' }).eq('id', roomId),
        'The ticket was raised, but the unit could not be marked Under Maintenance'
      );
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
        assertWritten(
          await db.from('rooms').update({ operational_status: newRoomStatus }).eq('id', targetRoomId),
          `The ticket was updated, but the unit could not be returned to ${newRoomStatus}`
        );
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

    // BR-028 - closing a ticket is a state change made by a named actor, and
    // belongs in the event ledger like every other mutation.
    await auditFromRequest(req, {
      action: 'TICKET_CLOSE',
      entityType: 'TICKET',
      entityId: req.params.ticketId,
      previousValues: before,
      newValues: after
    });

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
        assertWritten(
          await db.from('rooms').update({ operational_status: newRoomStatus }).eq('id', before.room_id),
          `The ticket was updated, but the unit could not be returned to ${newRoomStatus}`
        );
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

    // BR-028 - one of only two hard DELETEs an administrator can perform (the
    // other is a room that holds no records), so the audit entry is the ONLY
    // remaining record that the ticket ever existed.
    // `previousValues` carries the whole row deliberately.
    await auditFromRequest(req, {
      action: 'TICKET_DELETE',
      entityType: 'TICKET',
      entityId: req.params.ticketId,
      previousValues: before,
      newValues: null
    });

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
        assertWritten(
          await db.from('rooms').update({ operational_status: newRoomStatus }).eq('id', before.room_id),
          `The ticket was updated, but the unit could not be returned to ${newRoomStatus}`
        );
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

    /**
     * `category` filters BEFORE the row limit, which is the whole point.
     *
     * 1,700 of the 2,221 rows in this table are `AUTH_ACCESS_DENIED`, nearly all
     * of them produced by a bug in our own frontend that fired six
     * administrator-only requests on every page load regardless of who was signed
     * in. That is fixed, but `audit_logs` is append-only - migration 002 revokes
     * DELETE from every role including this one - so the rows are permanent.
     *
     * Filtering in the browser could not work: the last 100 rows are ALL
     * authentication events, so a client-side "business events" filter returned
     * nothing at all. The database has to do the filtering.
     *
     *   business - what was actually done to the records
     *   auth     - sign-ins, sign-outs and refused requests
     *   (absent) - everything, newest first
     */
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    let query = db
      .from('audit_logs')
      .select('*, profiles:actor_profile_id (id, full_name, role)');

    if (category === 'business') query = query.not('action', 'like', 'AUTH\_%');
    else if (category === 'auth') query = query.like('action', 'AUTH\_%');

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw ApiError.internal(error.message);

    // Totals for the whole table, so the tab labels are not limited to the window.
    const counted = await db
      .from('audit_logs')
      .select('id', { head: true, count: 'exact' })
      .like('action', 'AUTH\_%');
    const total = await db
      .from('audit_logs')
      .select('id', { head: true, count: 'exact' });

    const authTotal = counted.count ?? 0;
    const grandTotal = total.count ?? 0;

    res.status(200).json({
      success: true,
      data: data ?? [],
      meta: { authTotal, businessTotal: grandTotal - authTotal, grandTotal },
    });
  })
);

/* ========================================================================== *
 * NOTIFICATIONS & REAL-TIME ALERTS — FR-027, Section 16 & 22
 * ========================================================================== */

router.get(
  '/admin/notifications',
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

    res.status(200).json({
      success: true,
      data: result.notifications,
      totalUnread: result.totalUnread,
    });
  })
);

router.get(
  '/admin/notifications/unread-count',
  requirePermission(PERMISSIONS.NOTIFICATION_READ_OWN),
  asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user!.profileId);
    res.status(200).json({ success: true, data: { unreadCount: count } });
  })
);

router.patch(
  '/admin/notifications/:id/read',
  requirePermission(PERMISSIONS.NOTIFICATION_READ_OWN),
  asyncHandler(async (req, res) => {
    const ok = await notificationService.markAsRead(req.params.id, req.user!.profileId);
    res.status(200).json({ success: ok, data: { is_read: true } });
  })
);

router.post(
  '/admin/notifications/mark-all-read',
  requirePermission(PERMISSIONS.NOTIFICATION_READ_OWN),
  asyncHandler(async (req, res) => {
    const ok = await notificationService.markAllAsRead(req.user!.profileId);
    res.status(200).json({ success: ok, data: { markedAllRead: true } });
  })
);

/* ========================================================================== *
 * LIVE INQUIRY & TICKET MESSAGING — FR-026, Section 16
 * ========================================================================== */

router.get(
  '/admin/inquiries/:id/messages',
  requirePermission(PERMISSIONS.INQUIRY_READ_ALL),
  asyncHandler(async (req, res) => {
    const { data, error } = await db
      .from('inquiry_messages')
      .select('*')
      .eq('inquiry_id', req.params.id)
      // `inquiry_messages` has no `created_at`; the column is `sent_at`. Ordering by a
      // column that does not exist is a PostgREST 42703, so reading any conversation
      // returned a 500 - the twin of the broken lookup in the POST beneath this.
      .order('sent_at', { ascending: true });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const postInquiryMessageSchema = z.object({
  message: z.string().min(1, 'Message body is required.').max(2000),
});

router.post(
  '/admin/inquiries/:id/messages',
  requirePermission(PERMISSIONS.INQUIRY_MANAGE),
  asyncHandler(async (req, res) => {
    const parsed = postInquiryMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation(parsed.error.errors.map((e) => e.message).join(', '));
    }

    /**
     * This read asked for `full_name, email, phone_number`. `inquiries` has no such columns -
     * the prospect's details live in `prospect_name`, `prospect_email` and `prospect_phone` -
     * so PostgREST answered every call with
     *
     *     42703: column inquiries.full_name does not exist
     *
     * `inqErr` was then truthy and the handler threw "Inquiry not found", blaming the record
     * for a fault in the query. Every reply the landlady tried to send failed, and the
     * message it failed with sent her looking in the wrong place.
     *
     * Nothing downstream ever used those three fields; only the existence check and the
     * current status are needed, so that is all this asks for now.
     */
    const { data: inquiry, error: inqErr } = await db
      .from('inquiries')
      .select('id, status')
      .eq('id', req.params.id)
      .single();

    if (inqErr || !inquiry) throw ApiError.notFound('Inquiry not found.');

    const { data, error } = await db
      .from('inquiry_messages')
      .insert({
        inquiry_id: req.params.id,
        sender_id: req.user!.profileId,
        sender_name: 'Fe Galang Da Silva (Landlady)',
        message_body: parsed.data.message,
      })
      .select('*')
      .single();

    if (error) throw ApiError.internal(error.message);

    /**
     * A lead that has been answered is no longer Pending.
     *
     * `inquiry_status_type` carries 'Contacted' for exactly this, and nothing in the system
     * ever wrote it - so the inbox showed a lead as Pending however many times the landlady
     * had replied to it. Only Pending is advanced: 'Converted' and 'Closed' are ends of the
     * line and must not be walked backwards by sending a message.
     *
     * Not fatal. The reply is already stored, and a lead showing the wrong status is a
     * smaller problem than an error telling her the message did not send when it did.
     */
    if (inquiry.status === 'Pending') {
      warnIfWriteFailed(
        await db
          .from('inquiries')
          .update({ status: 'Contacted', updated_at: new Date().toISOString() })
          .eq('id', req.params.id)
          .eq('status', 'Pending'),
        'Inquiry status advance to Contacted'
      );
    }

    // BR-028 - correspondence with a tenant or prospect is part of the record.
    await auditFromRequest(req, {
      action: 'INQUIRY_MESSAGE_SEND',
      entityType: 'INQUIRY',
      entityId: req.params.id,
      newValues: { messageId: data?.id }
    });

    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/admin/tickets/:id/messages',
  requirePermission(PERMISSIONS.TICKET_READ_ALL),
  asyncHandler(async (req, res) => {
    const { data, error } = await db
      .from('ticket_messages')
      .select('*, profiles:sender_id (id, full_name, role)')
      .eq('ticket_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw ApiError.internal(error.message);
    res.status(200).json({ success: true, data: data ?? [] });
  })
);

const postTicketMessageSchema = z.object({
  message: z.string().min(1, 'Message body is required.').max(2000),
});

router.post(
  '/admin/tickets/:id/messages',
  requirePermission(PERMISSIONS.TICKET_COMMENT),
  asyncHandler(async (req, res) => {
    const parsed = postTicketMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation(parsed.error.errors.map((e) => e.message).join(', '));
    }

    const { data: ticket, error: ticketErr } = await db
      .from('maintenance_tickets')
      .select('id, title, tenant_profile_id, room_id, rooms:room_id (room_number)')
      .eq('id', req.params.id)
      .single();

    if (ticketErr || !ticket) throw ApiError.notFound('Ticket not found.');

    const { data, error } = await db
      .from('ticket_messages')
      .insert({
        ticket_id: req.params.id,
        sender_id: req.user!.profileId,
        message_body: parsed.data.message,
      })
      .select('*, profiles:sender_id (id, full_name, role)')
      .single();

    if (error) throw ApiError.internal(error.message);

    // Notify the tenant about the landlady's reply
    await notificationService.notify({
      recipientProfileId: ticket.tenant_profile_id,
      title: 'New Maintenance Ticket Comment',
      message: `Landlady commented on ticket "${ticket.title}": "${parsed.data.message.slice(0, 80)}${parsed.data.message.length > 80 ? '...' : ''}"`,
      type: 'Maintenance',
      priority: 'Medium',
      relatedEntityType: 'TICKET',
      relatedEntityId: ticket.id,
    });

    // BR-028 - correspondence with a tenant or prospect is part of the record.
    await auditFromRequest(req, {
      action: 'TICKET_MESSAGE_SEND',
      entityType: 'TICKET',
      entityId: req.params.id,
      newValues: { messageId: data?.id }
    });

    res.status(201).json({ success: true, data });
  })
);

export default router;
