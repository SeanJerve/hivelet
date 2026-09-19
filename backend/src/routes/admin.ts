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
import { propertyToday, propertyParts, isoDateParts } from '../utils/propertyClock.js';
import { assertWritten, warnIfWriteFailed, uniqueViolationOn } from '../utils/checkedWrite.js';
import { auditFromRequest } from '../services/auditService.js';
import { notificationService } from '../services/notificationService.js';
import { computeWaterFee, isOverdue, allocateReceipt, computeRentPeriod, monthlySpansFrom } from '../services/billingService.js';
import { buildIncomeReportWorkbook } from '../services/incomeReportExport.js';
import { buildExpenseReportWorkbook } from '../services/expenseReportExport.js';
import { buildAuditTrailWorkbook, type AuditCategory } from '../services/auditTrailExport.js';
import { money, occupantCount, isoDate, shortText, unitCode, uuid } from '../utils/validators.js';

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
  cluster_code: z.string().min(1).max(50),
  room_number: unitCode(20),
  /**
   * REQUIRED, because the database requires it.
   *
   * `rooms.floor` and `rooms.capacity` are both NOT NULL with NO DEFAULT - read
   * from `pg_attribute`, not from the schema file. They were `.optional()` here,
   * so creating a unit without them got as far as the INSERT and came back as a
   * 500 carrying a raw not-null-violation, when the honest answer is a 422
   * naming the field the form did not send.
   *
   * Latent rather than live: nothing in `frontend/src` calls POST /admin/rooms
   * at all - there is no create-unit screen, and the property's 33 units were
   * seeded. It is fixed because the route is reachable and its contract should
   * not promise something the database refuses.
   *
   * `floor` is the level WITHIN a building, not across the property - see
   * migration 034 and `scripts/check-relations.mjs`.
   */
  floor: z.number().int().min(1),
  // `room_type` is the enum `room_type_enum`, not free text. It was `z.string()` while
  // `operational_status` and `visibility_status` in this same file were properly
  // enumerated, so an invalid type reached PostgreSQL and came back as a 22P02 the
  // caller could not act on. Validated here, it is a 422 naming the allowed values.
  room_type: z.enum(['Studio', 'One-bedroom', 'Two-bedroom', 'Three-bedroom']).optional(),
  capacity: occupantCount.refine((n) => n >= 1, 'must be at least one'),
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

    /**
     * A unit code must not collide with an existing one IN ANY CASE.
     *
     * `rooms_room_number_key` is `UNIQUE (room_number)` on the raw text - read
     * out of `pg_index`, not assumed - so it is case SENSITIVE, and the live
     * table is mixed case: 22 lowercase (`1a`..`3g`) and 11 upper (`B1F`, `LF`,
     * `PH`...). So `'1A'` inserts happily alongside `'1a'` and the property
     * quietly has two rows for one unit.
     *
     * That is not a tidiness problem. **Six lookups in this file find a unit
     * with `.ilike('room_number', …)`**, which matches both - and the one on
     * the money path, `POST /admin/income-records`, uses `maybeSingle()`, which
     * ERRORS on more than one row. The result is a 500 on the only route that
     * records cash for that unit, for a reason nothing on screen would explain.
     * The same shape the judgement log records for the receipt guard.
     *
     * And it is reachable by doing the obvious thing: every screen DISPLAYS
     * unit codes uppercased (`fetchRooms` uppercases them), so an administrator
     * adding a unit types the case she has been shown.
     *
     * Checked before writing: 0 case-insensitive collisions exist today.
     */
    const { data: existing, error: existingError } = await db
      .from('rooms')
      .select('room_number')
      .ilike('room_number', roomFields.room_number)
      .limit(1);

    if (existingError) throw ApiError.internal(existingError.message);
    if (existing && existing.length > 0) {
      throw ApiError.conflict(
        `Unit ${existing[0].room_number} already exists. Unit codes are matched without regard ` +
          `to case, so "${roomFields.room_number}" would be a second row for the same unit.`
      );
    }

    const { data, error } = await db
      .from('rooms')
      .insert({
        ...roomFields,
        base_price: roomFields.current_price
      })
      .select('*')
      .single();

    // The `ilike` pre-check above cannot see a unit created between itself and
    // this insert - a double-click on Add Unit is enough. `rooms` carries TWO
    // unique indexes on the code, exact and case-folded, so either can fire.
    if (
      uniqueViolationOn(error, 'idx_rooms_room_number_lower') ||
      uniqueViolationOn(error, 'rooms_room_number_key')
    ) {
      throw ApiError.conflict(
        `Unit ${roomFields.room_number} already exists - it was created a moment ago, most ` +
        'likely by this form being submitted twice. Nothing was added a second time.'
      );
    }
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
      const { data: existingPhotos, error: existingPhotosError } = await db
        .from('room_photos')
        .select('id')
        .eq('room_id', req.params.roomId);

      // This read decides replace-or-insert. Undefined on a failed query means
      // the else branch runs and a SECOND primary photo is inserted for a unit
      // that already has one.
      //
      // `idx_room_photos_one_primary` - UNIQUE on (room_id) WHERE is_primary,
      // confirmed in pg_indexes - stops the duplicate reaching the table, so
      // this fails closed. But it fails as "The photo could not be saved" from
      // the assertWritten on the insert, which blames the photo for a failure
      // in a query about a different row. Saying what actually went wrong costs
      // one line.
      if (existingPhotosError) throw ApiError.internal(existingPhotosError.message);

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
  email: z.string().email('Enter a valid email address, or leave it blank.').max(255).optional().or(z.literal('')),
  fullName: z.string().min(2, 'Full name is required.').max(255),
  phone: z.string().max(50).optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  occupation: z.string().max(100).optional(),
  facebookUrl: z.string().optional(),   // facebook_url is TEXT, unbounded
  roomNumber: unitCode(20).optional(),
  /**
   * `isoDate`, not a bare string, and this one carries further than it looks.
   *
   * It is written to BOTH `start_date` and `anniversary_date` below, and
   * `anniversary_date` is what BR-033 derives every future rent period from
   * (`computeRentPeriod`). A `date` column accepts more spellings than a form
   * does: `03/04/2026` is a real date to PostgreSQL and means March in one
   * reading and April in another, so a value that is merely *parseable* can set
   * a tenancy's cycle to the wrong day and every "Rent For" on every later
   * receipt follows it. Silently - nothing errors, because nothing is wrong
   * with the row.
   *
   * And an unparseable one fails at the assignment insert, which happens AFTER
   * the profile has been created - the orphan-profile case §3.7 of the
   * judgement log lists. Rejecting here is before any write, which is the
   * reason the expense allocation schema gives for validating where it does.
   *
   * Costs nothing: the form is an `<input type="date">`, so it already sends
   * exactly this.
   */
  moveInDate: isoDate.optional(),
  // The one month held at move-in (OD-04), so it is money and takes the finite
  // check with it. See the BR-039 block below for what that month is.
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

    /**
     * The unit is resolved BEFORE the person is created.
     *
     * supabase-js cannot open a transaction, so these are separate writes that
     * commit independently. The order used to be: insert the profile, then look
     * the unit up, then `throw ApiError.notFound('Room/Unit 2C not found.')` if
     * it was not there - by which point the profile row was already committed.
     *
     * So onboarding with a mistyped unit code left a tenant profile behind with
     * no assignment and returned a 404 that said nothing about it. The natural
     * response is to correct the code and submit again, which creates a **second
     * profile** for the same person. Two records, one of them orphaned, and the
     * duplicate-identifier check would then refuse the retry outright if an email
     * or phone was given - so the second attempt fails too, for a reason that
     * looks unrelated.
     *
     * Reading first costs one query and makes the common failure - a typo - leave
     * nothing behind at all.
     */
    /**
     * `room_number` is selected alongside the id so messages can quote the unit
     * as the PROPERTY spells it. The lookup is `ilike`, so "b2f" finds B2F - and
     * echoing the administrator's own typing back at her, or upper-casing it,
     * prints a code that does not exist on any door. Her units are 1a, B2F, PH.
     */
    let resolvedRoom: { id: string; current_price: number; room_number: string } | null = null;
    if (roomNumber) {
      const { data: room, error: roomError } = await db
        .from('rooms')
        .select('id, current_price, room_number')
        .ilike('room_number', roomNumber)
        .maybeSingle();

      if (roomError) throw ApiError.internal(roomError.message);
      if (!room) throw ApiError.notFound(`Room/Unit ${roomNumber} not found.`);
      resolvedRoom = room as { id: string; current_price: number; room_number: string };
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

    /**
     * The two pre-checks above answer the ordinary case. They cannot answer a
     * DOUBLE-CLICK on Add Tenant: both requests read "no such email", both
     * insert, and the second loses to `idx_profiles_email_lower` or
     * `idx_profiles_phone_login`. That surfaced as a 500 carrying the raw
     * constraint name, at the exact moment the administrator most needs to know
     * whether the person was saved - so she cannot tell whether to try again,
     * and trying again is how one record becomes two.
     *
     * 409, naming the identifier that clashed and saying the tenant is on file.
     * The same double-click already produced a duplicate receipt (033) and could
     * have produced a duplicate bill (038); this is the third instance of it.
     */
    if (uniqueViolationOn(insertError, 'idx_profiles_email_lower')) {
      throw ApiError.conflict(
        `A profile with the email ${normalizedEmail} already exists - it was created a moment ` +
        'ago, most likely by this form being submitted twice. The tenant is on file. Open ' +
        'their record to assign the unit rather than adding them again.'
      );
    }
    if (uniqueViolationOn(insertError, 'idx_profiles_phone_login')) {
      throw ApiError.conflict(
        'That phone number already signs someone in to the portal - the profile was created a ' +
        'moment ago, most likely by this form being submitted twice. Check the resident list ' +
        'before adding them again.'
      );
    }
    if (insertError) throw ApiError.internal(insertError.message);

    // Already resolved above, before the profile was written.
    if (resolvedRoom) {
      const room = resolvedRoom;

      const finalOccupants = occupantCount ?? (roommateQty !== undefined ? 1 + roommateQty : 1);

      /**
       * BR-039 — the advance rent equals the rent in effect at move-in.
       *
       * OD-04, and BR-039 in `docs/02_BUSINESS_RULES.md` is the authority on it
       * - read that before this. TWO months are collected at move-in: one of
       * rent and one held as a deposit. This column holds ONE of them; the rent
       * month is recorded as an ordinary income receipt, so both are on file
       * and neither is counted twice.
       *
       * At move-out the deposit is spent on repairing the unit and WHAT IS LEFT
       * IS REFUNDED - her own example is 6,500 held against 6,400 of work,
       * 100 returned. The system does not settle any of that: the repairs are
       * category 8 expense entries and the refund is an entry she writes
       * herself, which BR-039 records as a deliberate choice rather than a
       * missing feature. Nothing here is a disposition record.
       *
       * Either way it is one month's rent for the unit being moved into, which
       * is why the figure below does not change. Checked against the live rows
       * before trusting that: measured against the rent each unit ACTUALLY
       * charges - not the rate card, which understates by about 1.6x - all 32
       * active tenancies hold one month, 20 of them exactly. None holds two.
       * Do not double it (B-31).
       *
       * The text this replaces said no separate deposit was collected at all,
       * on a 2026-09-13 reading she has since contradicted.
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
          start_date: moveInDate || propertyToday(),
          anniversary_date: moveInDate || propertyToday(),
          deposit_amount: finalDeposit,
          occupant_count: finalOccupants,
          is_active: true
        });

      /**
       * The profile is already committed at this point and there is no
       * transaction to roll back, so the message has to say so. Without it the
       * administrator sees a failure, assumes nothing was saved, and onboards the
       * same person a second time - which is how one mistake becomes two records.
       */
      /**
       * `idx_single_active_assignment_per_room` is UNIQUE on `room_id` among
       * active assignments - it is what makes "no unit is let to two people at
       * once" true rather than merely checked. Losing to it means somebody was
       * moved into this unit between the lookup above and this insert, so the
       * honest answer names the unit rather than the constraint.
       *
       * The profile is already committed either way, which the message has to
       * say: without it the administrator sees a failure, assumes nothing was
       * saved, and onboards the same person a second time.
       */
      if (assignError) {
        const clash = uniqueViolationOn(assignError, 'idx_single_active_assignment_per_room');
        throw ApiError.internal(
          `${fullName} was created, but could not be assigned to ${room.room_number}: ` +
          (clash
            ? `unit ${room.room_number} already has an active resident - somebody was ` +
              'moved in while this form was open.'
            : assignError.message) +
          ' The person is on file - assign the unit from their record rather than adding them ' +
          'again.'
        );
      }

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
  fullName: z.string().min(2).max(255).optional(),
  phone: z.string().max(50).optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  occupation: z.string().max(100).optional(),
  facebookUrl: z.string().optional(),   // facebook_url is TEXT, unbounded
  roomNumber: unitCode(20).optional(),
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
      const { data: oldActive, error: oldActiveError } = await db
        .from('room_assignments')
        .select('id, room_id, deposit_amount, occupant_count')
        .eq('tenant_profile_id', req.params.profileId)
        .eq('is_active', true);

      // A failed read here is not "this tenant has no current unit". It decides
      // which unit gets freed and what advance rent and occupant count carry
      // forward, so reading a broken query as an empty list moves the tenant
      // while leaving the old unit recorded as occupied.
      if (oldActiveError) throw ApiError.internal(oldActiveError.message);

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
          .update({ is_active: false, end_date: propertyToday() })
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
        const { data: targetRoomActive, error: targetRoomError } = await db
          .from('room_assignments')
          .select('id, tenant_profile_id, profiles (full_name, account_status)')
          .eq('room_id', room.id)
          .eq('is_active', true);

        // This is the check for "is someone already living there". Read as an
        // empty list, the move goes ahead and lands on
        // `idx_single_active_assignment_per_room` - a partial UNIQUE index on
        // (room_id) WHERE is_active, confirmed in pg_indexes - so it surfaces as
        // a raw Postgres unique violation inside a 500 rather than as the clear
        // conflict message below. The database stops two tenants sharing a unit;
        // it cannot make the failure legible.
        if (targetRoomError) throw ApiError.internal(targetRoomError.message);

        if (targetRoomActive && targetRoomActive.length > 0) {
          for (const a of targetRoomActive) {
            if (a.tenant_profile_id !== req.params.profileId) {
              const prof: any = a.profiles;
              if (prof?.account_status === 'inactive') {
                // Stale assignment from inactive tenant, safely deactivate it
                assertWritten(
                  await db
                    .from('room_assignments')
                    .update({ is_active: false, end_date: propertyToday() })
                    .eq('id', a.id),
                  `Unit ${roomNumber.toUpperCase()} still holds a stale tenancy that could not be closed`
                );
              } else {
                throw ApiError.badRequest(`Unit ${roomNumber.toUpperCase()} is already occupied by active tenant ${prof?.full_name || 'another resident'}.`);
              }
            }
          }
        }

        // `deposit_amount` holds ONE MONTH, held at move-in (OD-04, answered by the owner
        // 2026-09-19). Two months are collected - one of rent, recorded as an ordinary income
        // receipt, and one held here. The previous default was `current_price * 2`, which wrote
        // BOTH months into this one column and so counted the rent month twice.
        //
        // The comment this replaces said no separate deposit existed at all, on a 2026-09-13
        // reading that the owner has since contradicted. What did NOT change is the behaviour:
        // carry forward what the tenant actually had, otherwise leave it at zero for the
        // administrator to enter. Measured against the rent each unit really charges, all 32
        // live tenancies hold one month - none holds two - so this figure is not to be doubled
        // (B-31). Never fabricate money.
        const prevDeposit = Number(oldActive?.[0]?.deposit_amount ?? 0);
        const finalOccupants = explicitOccupants ?? oldActive?.[0]?.occupant_count ?? 1;

        const { error: assignError } = await db
          .from('room_assignments')
          .insert({
            room_id: room.id,
            tenant_profile_id: req.params.profileId,
            start_date: propertyToday(),
            anniversary_date: propertyToday(),
            deposit_amount: prevDeposit,
            occupant_count: finalOccupants,
            is_active: true
          });

        // The occupancy check a few lines up cannot close the gap between
        // itself and this insert. `idx_single_active_assignment_per_room`
        // does, and losing to it means someone was moved in meanwhile - which
        // is a 409 naming the unit, not a 500 naming the constraint.
        if (uniqueViolationOn(assignError, 'idx_single_active_assignment_per_room')) {
          throw ApiError.conflict(
            `Unit ${roomNumber.toUpperCase()} already has an active resident - somebody was ` +
            'moved in while this was open. Reload the resident list and try again.'
          );
        }
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

    /**
     * An administrator is not a tenancy, and this route ends by writing
     * `account_status: 'inactive'`.
     *
     * `role` was already being selected here and never read. Nothing else
     * stopped it either: the guard above is `requirePermission`, which asks who
     * is CALLING, not who is being vacated. So this endpoint, pointed at an
     * administrator's own profile id, deactivates that administrator - and
     * `authService` checks `account_status` after a valid password, so the
     * owner would be refused her own login with a correct one. Recovering that
     * means editing the live database, which on this project means Sean and a
     * migration.
     *
     * Not reachable from the interface, which is why it has not happened:
     * `GET /admin/tenants` filters `.in('role', ['tenant','prospect'])`, so an
     * administrator never appears in the list the Vacate button is drawn from.
     * That is the list endpoint knowing something this one was never told.
     */
    if (profile.role === 'admin') {
      throw ApiError.forbidden(
        'That profile is an administrator, not a tenancy. Vacating ends a tenancy and ' +
          'deactivates the account, which would lock this administrator out of the system.'
      );
    }

    // Find active assignment
    const { data: activeAssignments, error: activeAssignmentsError } = await db
      .from('room_assignments')
      .select('id, room_id')
      .eq('tenant_profile_id', req.params.profileId)
      .eq('is_active', true);

    // The list of units to free. Read as empty, the tenancies below are still
    // closed and the profile still deactivated - but no unit is ever marked
    // Available, so the flat someone has moved out of goes on counting as
    // occupied and never appears as free to let. This read happens before any
    // write, so throwing here leaves nothing half-done.
    if (activeAssignmentsError) throw ApiError.internal(activeAssignmentsError.message);

    // Deactivate assignments.
    //
    // BR-025. This is the departure path. Discarding the result meant the tenant
    // could be marked inactive while still holding an active tenancy: the unit
    // never frees, it keeps counting as occupied, and the next assignment to it
    // fails on `idx_single_active_assignment_per_room` long afterwards.
    assertWritten(
      await db
        .from('room_assignments')
        .update({ is_active: false, end_date: propertyToday() })
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
      /**
       * A VERIFIED PAYMENT CANNOT BE UNDONE FROM HERE, AND THE RACE IS CLOSED ON THE ROW.
       *
       * The comment above says rejection "touches no ledger row, so there is nothing
       * to tear". That is true only while the payment has never been verified. Once
       * it has, `settle_verified_payment` has already written the
       * `monthly_income_records` row - and this branch did not look at the current
       * status before overwriting it.
       *
       * So a payment could go Verified -> Rejected, and the result was four records
       * disagreeing about one sum of money:
       *
       *   - the payment      read Rejected
       *   - the bill         was reopened to Due, below, so the tenant still owed it
       *   - the income row   STAYED, so the ledger still counted the money
       *   - `verified_at` and `verified_by` were nulled, erasing who had verified it
       *
       * The owner would have been chasing a debt she had already been paid, and the
       * audit trail of who banked it was gone.
       *
       * Two ways in, and neither needs bad intent:
       *
       *   1. Two administrators with the queue open. `IncomeCollectionsView` filters
       *      to `Pending Verification` in the CLIENT from a list fetched on mount,
       *      and only refetches after an action - so the stale window is as long as
       *      the tab is left open. One verifies, the other rejects the row still
       *      showing as pending on their screen.
       *   2. One administrator changing their mind: verify, notice it was the wrong
       *      resident, press Reject to undo it.
       *
       * Not live today - checked: all 15 payments read Verified, none Rejected, and
       * every one still carries its `verified_at`.
       *
       * The right way to reverse a settled payment is to VOID the income record
       * (`DELETE /admin/income-records/:id`), which is a soft void - it sets
       * `voided_at`, `voided_by` and `void_reason` and keeps the history. That is
       * what the message points the administrator at, because refusing an action
       * without naming the alternative just moves the problem to the help desk.
       */
      if (before.verification_status === 'Verified') {
        throw ApiError.conflict(
          'This payment has already been verified, and its income row is in the ledger. ' +
            'Undoing it here would reopen the bill while the money stayed booked, so the ' +
            'resident would be chased for rent that was already paid. To reverse it, void ' +
            'the income record in Income & Collections instead - that reverses the ledger ' +
            'entry and keeps the history.'
        );
      }

      // Compare-and-set on the status we read. If another administrator moved the
      // row in between, zero rows match and nothing is written - rather than this
      // request silently overwriting their decision.
      const { data: updated, error } = await db
        .from('payments')
        .update({
          verification_status: parsed.data.verification_status,
          verified_at: null,
          verified_by: null,
        })
        .eq('id', req.params.paymentId)
        .eq('verification_status', before.verification_status)
        .select('*')
        .maybeSingle();

      if (error) throw ApiError.internal(error.message);
      if (!updated) {
        throw ApiError.conflict(
          'This payment changed while it was on your screen - another administrator has ' +
            'already acted on it. Nothing was altered. Reload the verification queue and ' +
            'check where it stands before acting again.'
        );
      }
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
      const { data: assignment, error: assignmentError } = await db
        .from('room_assignments')
        .select('id, occupant_count')
        .eq('room_id', before.room_id)
        .eq('tenant_profile_id', before.tenant_profile_id)
        .eq('is_active', true)
        .maybeSingle();

      // Feeds `assignment?.occupant_count || 1` below, which is the occupant
      // count the water charge is computed from (BR-014, PHP 200 a head). A
      // failed read is indistinguishable from "no active tenancy" and both fall
      // to 1, so a household of four could be billed one person's water and the
      // figure written into the ledger as fact. The `?.` still covers the
      // genuine case - a payment settled after the tenancy ended - which is why
      // only the error is promoted here.
      if (assignmentError) throw ApiError.internal(assignmentError.message);

      // The unit's code decides whether water is per-occupant or a Linda fixed charge
      // (BR-014 / BR-040), so it has to be known before the water figure can be derived.
      const { data: paidRoom, error: paidRoomError } = await db
        .from('rooms')
        .select('room_number')
        .eq('id', before.room_id)
        .maybeSingle();

      // `computeWaterFee(paidRoom?.room_number ?? '', ...)` below. An empty code
      // matches neither LF nor LB, so a failed read silently bills one of
      // Linda's two fixed-charge units on the per-occupant model instead
      // (BR-040 against BR-014) and writes that figure into the ledger. The
      // bill's own water_amount wins where there is a bill, so this only reaches
      // a payment raised without one - which is the Adyen path.
      if (paidRoomError) throw ApiError.internal(paidRoomError.message);

      const occupants = assignment?.occupant_count || 1;

      // Rate read from system_settings, never hardcoded (defect 2). Prefer the bill's own
      // figures when there is a bill - those are the terms the tenant was invoiced under.
      const derivedWater = await computeWaterFee(paidRoom?.room_number ?? '', occupants);
      const waterAmount = billData?.water_amount ?? derivedWater.amount;
      const rentAmount = billData?.rent_amount ?? (before.amount - waterAmount);

      /**
      * The property's calendar, not the server's.
      *
      * `paid_at` is a `timestamptz` - a moment. `getFullYear()` and `getMonth()`
      * read it in the SERVER's timezone, so a payment at 2026-09-30T17:00:00Z
      * (01:00 on 1 October in Manila) filed to October here and to September on
      * a UTC host. A ledger figure must not depend on where the process runs.
      */
      const paidParts = propertyParts(before.paid_at || Date.now());
      const year = paidParts.year;
      const month = paidParts.month;

      let rentPeriodStart = billData?.billing_period_start;
      let rentPeriodEnd = billData?.billing_period_end;

      if (!rentPeriodStart || !rentPeriodEnd) {
        const y = paidParts.year;
        const m = paidParts.month - 1;   // Date.UTC() below wants 0-based months
        const d = paidParts.day;

        if (d >= 26) {
          rentPeriodStart = new Date(Date.UTC(y, m, 26)).toISOString().split('T')[0];
          rentPeriodEnd = new Date(Date.UTC(y, m + 1, 25)).toISOString().split('T')[0];
        } else {
          rentPeriodStart = new Date(Date.UTC(y, m - 1, 26)).toISOString().split('T')[0];
          rentPeriodEnd = new Date(Date.UTC(y, m, 25)).toISOString().split('T')[0];
        }
      }

      // Check if income record already exists for this transaction reference
      const { data: existingIncome, error: existingIncomeError } = await db
        .from('monthly_income_records')
        .select('id')
        .eq('transaction_reference', before.transaction_reference)
        .maybeSingle();

      // The guard against writing the same receipt into the ledger twice. On a
      // failed read `existingIncome` is undefined, `!existingIncome` is true,
      // and a second income row is written for a transaction reference that
      // already has one - the same money counted twice in her book, with
      // nothing on either row to say which is the duplicate.
      if (existingIncomeError) throw ApiError.internal(existingIncomeError.message);

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
              // The date the money arrived AT THE PROPERTY. This read
              // `toISOString()`, which is UTC's date, so anything received
              // between midnight and 08:00 Manila was recorded a day early in
              // the owner's ledger.
              date_paid: paidParts.date,
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
    const year = Number(req.query.year ?? propertyParts(Date.now()).year);

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
    const year = Number(req.query.year ?? propertyParts(Date.now()).year);

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

/**
 * GET /api/admin/reports/audit.xlsx?category=business|auth|all&limit=N
 *
 * FR-029, BR-028. The trail left the system as a CSV while both financial
 * ledgers left as workbooks - the weakest format for the one artifact whose
 * whole claim is that it can be trusted, and the worst case for CSV besides:
 * `previous_values` and `new_values` are JSON, and every comma and quote in
 * them is a chance to shift a column and change what the record appears to say.
 *
 * The export itself is audited, like the other two.
 */
router.get(
  '/admin/reports/audit.xlsx',
  requirePermission(PERMISSIONS.AUDIT_READ),
  asyncHandler(async (req, res) => {
    const raw = String(req.query.category ?? 'business');
    const category: AuditCategory =
      raw === 'auth' || raw === 'all' || raw === 'business' ? raw : 'business';
    const limit = Number(req.query.limit ?? 500);

    const { workbook, rowCount } = await buildAuditTrailWorkbook(category, limit);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="hivelet-audit-trail.xlsx"');

    await auditFromRequest(req, {
      action: 'LEDGER_EXPORT',
      entityType: 'AUDIT_LOG',
      entityId: category,
      newValues: { export: 'xlsx', trail: category, limit, rows: rowCount },
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
/**
 * Turns Postgres's unique-violation on `idx_one_receipt_per_unit_per_month`
 * into the refusal a person can act on.
 *
 * Migration 033 made "one unit, one receipt number, one month, one row" a rule
 * the database keeps, because the application check could not: it SELECTs and
 * then INSERTs, and two requests that arrive together both pass the SELECT.
 * Fired simultaneously against the live API, five identical receipts produced
 * five rows.
 *
 * The index closes that. Without this, the requests that lose the race get a
 * bare 500 carrying `duplicate key value violates unique constraint ...`, which
 * tells the person at the counter nothing. `23505` is the code for it.
 */
function receiptAlreadyRecorded(err: { code?: string; message?: string } | null): boolean {
  return err?.code === '23505' && String(err?.message ?? '').includes('idx_one_receipt_per_unit_per_month');
}

const incomeRecordSchema = z.object({
  roomNumber: unitCode(20),
  datePaid: isoDate,
  contactName: shortText(255),
  invoiceNumber: shortText(100),
  rentAmount: money,
  /**
   * BR-037. The garbage fee, as typed at the counter.
   *
   * There was no field here at all, and the column defaults to 0.00 - so the
   * receipt form's GBG input was collected, added to the total the administrator
   * asked the resident for, PRINTED ON THE RECEIPT, and then dropped. Twice
   * over: it was never in the request body either.
   *
   * Dormant only because the fee has been zero since June 2025. It would have
   * gone live the moment the owner resumed charging it - ₱20 a unit a month,
   * about ₱640 a month across the occupied units, collected in cash and
   * recorded as nothing. That question is open as **OD-02**, which is why this
   * is wired now rather than after she answers.
   *
   * Optional and defaulted, so an older client that omits it still posts.
   * Unlike water it is NOT derived - there is no rule to derive it from; BR-037
   * says it is charged per unit and the figure is hers.
   */
  gbgFee: money.optional().default(0),
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
      gbgFee, occupants, paymentMethod, transactionReference, monthsCovered,
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

    // Find room. `capacity` comes along for the headcount check below.
    const { data: room, error: roomError } = await db
      .from('rooms')
      .select('id, capacity')
      .ilike('room_number', roomNumber)
      .maybeSingle();

    if (roomError) throw ApiError.internal(roomError.message);
    if (!room) throw ApiError.notFound(`Room/Unit ${roomNumber} not found.`);

    /**
     * More people than the unit is recorded as holding.
     *
     * `rooms.capacity` is stored, validated on create and edit, and shown to the
     * public - "Room for up to 5 people" is on the category page. It was checked
     * against nothing. A receipt for **nine** occupants of PH, which holds five,
     * was accepted in silence and charged 9 x 200 = 1,800 of water. Verified by
     * sending exactly that.
     *
     * Both readings are real. Nine people may genuinely be in there, and the
     * ledger records what happened, not what the room card says. But a 9 typed
     * where 2 was meant overcharges a resident 1,400 for water with nothing
     * anywhere to notice it.
     *
     * So: accepted, and recorded. That is the posture BR-036 takes on a
     * mismatched water figure and BR-039 takes on an advance rent that differs
     * from the rent - warn and attribute, never silently overwrite the human.
     * The audit row carries both numbers, so the divergence is answerable later
     * rather than invisible.
     */
    const unitCapacity = Number(room.capacity);
    const overCapacity = Number.isFinite(unitCapacity) && unitCapacity > 0 && occupants > unitCapacity;

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
     * One span per month, because that is the shape her book keeps.
     *
     * A receipt covering several months is recorded as SEVERAL ROWS, one per
     * month, each with one month of rent and one month of water - `OR#4895`
     * across four rows, `OR#4896` across three. There is no row in the 937
     * holding several months of rent, and the form used to produce exactly that.
     *
     * The spans run from whichever start won above: the supplied one when the
     * administrator typed it, otherwise the one derived from the tenancy's
     * anniversary (BR-033).
     */
    const spans = monthlySpansFrom(periodStart, monthsCovered);

    /**
     * A supplied end date still wins, which is BR-033's posture and not a detail.
     *
     * Judgement log SS 3.1: the system computes the right value, pre-fills it, and
     * **accepts a different one** - 937 rows were migrated with periods from her
     * own book and a back-dated correction is legitimate. Building the spans from
     * `periodStart` alone quietly dropped `dateCoveredEnd`, so a period she had
     * typed herself was replaced by a derived one. That is precisely the tightening
     * SS 3.1 warns will "break real entry", and I introduced it in the commit that
     * added the spans.
     *
     * The supplied end describes the whole stretch the receipt covers, so it
     * belongs on the LAST span. For a single month that is the only span, which
     * restores the previous behaviour exactly.
     */
    if (dateCoveredEnd) {
      spans[spans.length - 1].end = dateCoveredEnd;
    }

    // `periodStart`/`periodEnd` describe the whole stretch the receipt covers and
    // are used only for the divergence audit above. Each ROW carries its own
    // month's start and end, from `spans`.

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

    /**
     * `year` and `month` are the month the rent is FOR, taken from each span -
     * not the month the cash arrived.
     *
     * This read `isoDateParts(datePaid)`. That is right whenever the two agree,
     * which is most of the time, and wrong exactly when it matters: arrears paid
     * in October for August were filed as October, so the money landed in the
     * wrong month of her report and August still looked unpaid.
     *
     * Her book settles it. Among the rows where the two disagree - the only rows
     * carrying any information about which rule is in force - **216 follow the
     * rent period and 50 follow the date paid**. Counted on the live ledger, not
     * inferred.
     *
     * (`isoDateParts` is still the right tool for a timezone-free read of a
     * `YYYY-MM-DD` string; it is simply being asked about the wrong date. The
     * spans are built from `periodStart`, which is itself such a string.)
     */
    const { year, month } = { year: spans[0].year, month: spans[0].month };

    /**
     * The same receipt must not be recorded twice.
     *
     * `monthly_income_records` has one constraint - a primary key on `id`. There
     * is no uniqueness on the invoice number, and there cannot be a simple one:
     * `OR#4895` legitimately covers four consecutive months on four rows, one
     * receipt settling arrears.
     *
     * The sibling path already guards. When a gateway payment is verified, the
     * handler looks for an existing income row on `transaction_reference` before
     * inserting. This path - the on-site form, where the administrator types a
     * receipt by hand - had no equivalent, so a retried request or a re-entered
     * receipt would double-count rent in the owner's ledger among 937 rows, with
     * nothing to notice it.
     *
     * The browser disables its submit button while saving, which closes the
     * impatient double-click. It does not close a network retry on a request
     * that actually succeeded, or the same receipt being entered twice.
     *
     * Matched on unit, receipt number, date, amount AND PERIOD - all six.
     *
     * The period is not optional, and the live ledger is why. Four receipts
     * already appear on several rows each: `OR#4895` covers four consecutive
     * months on four rows, `OR#4896` three, `OR#4920` and `OR#4952` two. One
     * receipt settling arrears, split across the months it pays for, which is
     * exactly right. A guard matching only the first four would have rejected
     * the next one of those as a duplicate.
     *
     * Including year and month, the combination is unique across all 937 live
     * rows - checked, not assumed - so this rejects only what is a duplicate by
     * any reading, and names the record it collided with rather than failing
     * vaguely.
     */
    /**
     * A receipt number may cover several months of ONE tenancy, written on ONE
     * day. It may not appear against a different unit, and it may not appear
     * against a different payment date.
     *
     * `check:ledger` enforces exactly these two rules over the whole ledger, and
     * the write path did not, so the interface could create rows the check would
     * then report forever. The historical ledger holds five of them - OR#4726,
     * OR#4772, OR#4774, OR#4813 and INV#5165 - each a number mistyped as one
     * already in use, and each with its own number left unused in the book
     * (B-26). Every one would have passed the guard below, which only ever
     * refused an EXACT repeat of unit, receipt, date, amount, year and month.
     *
     * Both are warnings about the piece of paper, not about the money, so they
     * are 409s naming the row they collide with rather than silent corrections.
     */
    if (invoiceNumber) {
      const { data: sameNumber, error: sameNumberError } = await db
        .from('monthly_income_records')
        .select('id, date_paid, room_id, rooms:room_id (room_number)')
        .eq('invoice_number', invoiceNumber)
        .is('voided_at', null)
        .limit(50);

      if (sameNumberError) throw ApiError.internal(sameNumberError.message);

      const otherRoom = (sameNumber ?? []).find((r: any) => r.room_id !== room.id);
      if (otherRoom) {
        throw ApiError.conflict(
          `Receipt ${invoiceNumber} is already recorded against unit ` +
            `${(otherRoom as any).rooms?.room_number ?? 'another unit'} (record ${otherRoom.id}). ` +
            'One receipt covers one unit. If this is a separate payment, give it its own receipt number.'
        );
      }

      const otherDate = (sameNumber ?? []).find((r: any) => r.date_paid !== datePaid);
      if (otherDate) {
        throw ApiError.conflict(
          `Receipt ${invoiceNumber} is already recorded as paid on ${(otherDate as any).date_paid} ` +
            `(record ${otherDate.id}), and this one says ${datePaid}. One receipt is written on one ` +
            'day. A receipt may cover several months, but they are all paid at once - if this is a ' +
            'later payment, give it its own receipt number.'
        );
      }
    }

    /**
     * Every month this receipt covers is checked, not just the first. A receipt
     * spanning three months collides if ANY of the three is already recorded.
     */
    for (const span of spans) {
      const { data: duplicates, error: duplicateError } = await db
        .from('monthly_income_records')
        .select('id')
        .eq('room_id', room.id)
        .eq('invoice_number', invoiceNumber)
        .eq('date_paid', datePaid)
        .eq('rent_amount', rentAmount)
        .eq('year', span.year)
        .eq('month', span.month)
        .is('voided_at', null)
        .limit(1);

      if (duplicateError) throw ApiError.internal(duplicateError.message);

      const duplicate = duplicates?.[0];
      if (duplicate) {
        throw ApiError.conflict(
          `Receipt ${invoiceNumber} is already recorded for unit ${roomNumber} on ` +
            `${datePaid}, covering ${span.year}-${String(span.month).padStart(2, '0')} ` +
            `(record ${duplicate.id}). If this is a second payment, give it its own ` +
            `receipt number.`
        );
      }
    }

    /**
     * One row per month, and all of them or none.
     *
     * A single month keeps the plain insert it has always used - that is every
     * collection this interface has ever recorded, so there is nothing to
     * regress. Several months go through `record_income_for_months` (migration
     * 029), because a loop that inserts three and fails on the second leaves
     * the owner having collected three months of rent with one in her books.
     * supabase-js cannot open a transaction; migrations 010, 018 and 019 exist
     * for exactly this and this follows them.
     */
    let newRecord: Record<string, unknown>;

    if (spans.length === 1) {
      const { data, error: insertError } = await db
        .from('monthly_income_records')
        .insert({
          room_id: room.id,
          tenant_profile_id: assign?.tenant_profile_id || null,
          assignment_id: assign?.id || null,
          year: spans[0].year,
          month: spans[0].month,
          date_paid: datePaid,
          contact_name: contactName,
          // Required by the schema above, so there is nothing to substitute.
          invoice_number: invoiceNumber,
          rent_amount: rentAmount,
          occupants,
          water_payment: calcWater,
          // Taken from the request, not derived: BR-037 gives no rule to derive it
          // from. Omitting it let the column default to 0.00 silently.
          gbg_fee: gbgFee,
          payment_method: normalizedMethod,
          transaction_reference: transactionReference || null,
          rent_period_start: spans[0].start,
          rent_period_end: spans[0].end,
          verification_status: 'Verified'
        })
        .select('*')
        .single();

      if (receiptAlreadyRecorded(insertError)) {
        throw ApiError.conflict(
          `Receipt ${invoiceNumber} is already recorded for unit ${roomNumber} covering that ` +
            'month. If this is a second payment, give it its own receipt number.'
        );
      }
      if (insertError) throw ApiError.internal(insertError.message);
      newRecord = data as Record<string, unknown>;
    } else {
      const { data, error: rpcError } = await db.rpc('record_income_for_months', {
        p_room_id: room.id,
        p_tenant_profile_id: assign?.tenant_profile_id || null,
        p_assignment_id: assign?.id || null,
        p_date_paid: datePaid,
        p_contact_name: contactName,
        p_invoice_number: invoiceNumber,
        // Per month. The form sends one month's rent; the months are the spans.
        p_rent_amount: rentAmount,
        p_water_payment: calcWater,
        // BR-037 - once per RECEIPT, not once per month covered. The function
        // puts it on the first month only.
        p_gbg_fee: gbgFee,
        p_occupants: occupants,
        p_payment_method: normalizedMethod,
        p_transaction_reference: transactionReference || null,
        p_periods: spans,
      });

      if (rpcError) {
        /**
         * `42883` is "function does not exist". Migration 029 has been written
         * but has to be applied by a person, so say which one rather than
         * reporting a generic failure - and say plainly that nothing was
         * written, because the administrator is standing at a counter holding
         * several months of somebody's rent.
         */
        if (rpcError.code === '42883') {
          throw ApiError.notImplemented(
            'Recording several months at once needs database migration 029, which has not ' +
              'been applied yet. Nothing was written. Record each month as its own receipt ' +
              'line in the meantime, which is how the ledger already holds them.'
          );
        }
        if (receiptAlreadyRecorded(rpcError)) {
          throw ApiError.conflict(
            `Receipt ${invoiceNumber} is already recorded for unit ${roomNumber} covering one ` +
              'of those months. If this is a second payment, give it its own receipt number.'
          );
        }
        throw ApiError.internal(rpcError.message);
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length !== spans.length) {
        throw ApiError.internal(
          `Expected ${spans.length} ledger rows for the months this receipt covers and the ` +
            `database returned ${rows.length}. Check the ledger before recording it again.`
        );
      }
      // The first month's row stands for the receipt in the audit entry and the
      // response; all of them carry the same receipt number.
      newRecord = rows[0];
    }

    // Sync: if this is recorded for an active tenant assignment, check and update their bills
    // Audited here rather than after settlement, so that a settlement failure
    // below still leaves a record that this income row was created. It was, and
    // it is kept.
    await auditFromRequest(req, {
      action: 'PAYMENT_RECORD',
      entityType: 'PAYMENT',
      entityId: String(newRecord.id),
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
        /**
         * Everything this receipt actually settles, which is one month's rent
         * and water MULTIPLIED BY the months it covers.
         *
         * This read `rentAmount + calcWater` for the whole receipt. Correct
         * while a receipt was one row; wrong the moment one covers three
         * months, because the tenant would have handed over three months and
         * only one month's worth would have been applied to what they owe -
         * leaving bills open that the money in the drawer had already paid.
         *
         * The garbage fee stays out, as it always has: BR-037 charges it per
         * unit and no bill is raised for it, so it settles nothing.
         */
        (Number(rentAmount || 0) + Number(calcWater || 0)) * spans.length,
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

    /**
     * A headcount above the unit's recorded capacity, attributed rather than
     * refused. See the note where `overCapacity` is computed.
     *
     * `.catch(() => {})` for the same reason BR-039's divergence note has one:
     * the money is already recorded and committed, and an audit outage must not
     * turn a receipt she has taken into an error on her screen.
     */
    if (overCapacity) {
      await auditFromRequest(req, {
        // `PAYMENT_RECORD`, because this IS the receipt being recorded and the
        // note is about that receipt. `RECORD_INCOME_PAYMENT` appears once in
        // the live log from the original import but is not in `AuditAction`,
        // and adding it would be inventing vocabulary for one note.
        action: 'PAYMENT_RECORD',
        entityType: 'INCOME_RECORD',
        entityId: String(newRecord.id),
        newValues: {
          note: 'Occupants recorded exceed the unit capacity on file. Accepted as entered; water was charged for the occupants given.',
          room_number: roomNumber,
          unit_capacity: unitCapacity,
          occupants_recorded: occupants,
          water_charged: calcWater,
        },
      }).catch(() => {});
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
  roomNumber: unitCode(20).optional(),
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

      // `if (room)` with no else. A unit number that matched nothing left
      // `roomId` at the row's EXISTING room, and the handler carried on and
      // wrote that same room back - so moving a receipt to a unit whose code was
      // mistyped returned success and moved nothing. The ledger then disagreed
      // with what the administrator believed she had just corrected.
      //
      // Same shape as the ticket PATCH and the edit-unit dialog. Moving the row
      // is the point of supplying the number, so a miss refuses the whole edit.
      if (!room) {
        throw ApiError.validation('No unit has that number.', {
          roomNumber: [`There is no unit numbered "${roomNumber}", so nothing was changed.`],
        });
      }
      roomId = room.id;
    }

    const rent = rentAmount !== undefined ? Number(rentAmount) : Number(before.rent_amount);
    const occ = occupants !== undefined ? Number(occupants) : Number(before.occupants || 1);

    // Resolve the unit's code so the Linda fixed charge is honoured on edits too. When the
    // caller did not change the room, fall back to the row's existing one.
    const { data: editRoom, error: editRoomError } = await db
      .from('rooms')
      .select('room_number')
      .eq('id', roomId)
      .maybeSingle();

    // The unit code decides which water model applies, and the figure it
    // produces is written straight to `water_payment` - which feeds
    // `remitted_amount`, a GENERATED column. A failed read yields '' below,
    // matching neither LF nor LB, so one of Linda's two fixed-charge units
    // would be re-billed at occupants x rate (BR-014 instead of BR-040) and the
    // owner's remitted total would carry that figure with nothing to notice.
    //
    // The same defect as the verify-payment path, which was fixed in 9e730eb.
    // This one is worse: there it only reached a payment raised without a bill,
    // because the bill's own water_amount won. Here it is written every time.
    if (editRoomError) throw ApiError.internal(editRoomError.message);

    const { amount: water } = await computeWaterFee(editRoom?.room_number ?? '', occ);

    const updatePatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (roomId) updatePatch.room_id = roomId;
    if (datePaid) updatePatch.date_paid = datePaid;
    if (contactName) updatePatch.contact_name = contactName;
    if (invoiceNumber) updatePatch.invoice_number = invoiceNumber;
    if (rentAmount !== undefined) updatePatch.rent_amount = rent;
    if (occupants !== undefined) updatePatch.occupants = occ;
    /**
     * Water is derived from TWO things - the occupants and the unit - so it is
     * rewritten when either of them was supplied, not when the occupants were.
     *
     * The guard was `if (occupants !== undefined)`, with `water_payment` set
     * inside it. Moving a record to a different unit without touching the
     * headcount therefore left the previous unit's water on it: a row moved
     * onto `LB`, whose water is a fixed charge (BR-040), would keep
     * `occupants x rate` from wherever it came from, and `remitted_amount` is
     * `GENERATED ALWAYS AS (rent_amount + water_payment)`, so the owner's
     * remitted total would carry the wrong figure with nothing to notice.
     *
     * Latent, not live: the ledger's edit form sends `roomNumber` and
     * `occupants` on every save, so the old condition was always true and the
     * water always recomputed. It held because of what the single caller
     * happens to send, which is a precondition rather than a guarantee.
     */
    if (occupants !== undefined || roomNumber) {
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

    /**
     * An EDIT can collide too, and this is the likeliest way anyone meets
     * migration 033's index: correcting a mistyped receipt number onto one that
     * already exists for that unit and month. `receiptAlreadyRecorded` is the
     * same helper the create path uses; only the sentence differs, because here
     * nothing was recorded twice - the correction was simply refused.
     */
    if (receiptAlreadyRecorded(updateError)) {
      // `after` is null on a failed update, so it cannot name the unit - and a
      // room UUID on screen is worse than not naming it. The receipt number and
      // the month are what she needs to find the other row.
      throw ApiError.conflict(
        `A receipt numbered ${updatePatch.invoice_number ?? before.invoice_number} is already ` +
        `recorded against that unit for ${String(before.month).padStart(2, '0')}/${before.year}. ` +
        'Nothing was changed. Check the ledger for the receipt that already carries this number.'
      );
    }
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

    /**
     * VOIDING A ROW THAT IS ALREADY VOID OVERWROTE WHO VOIDED IT.
     *
     * Neither the read above nor the update below filtered on `voided_at`, so a
     * second DELETE on the same id succeeded silently and rewrote `voided_at`,
     * `voided_by` and `void_reason` - destroying the original attribution on a
     * financial record, which is the one thing a soft delete exists to keep.
     * Both calls answered "voided", so nothing on screen distinguished the
     * first from the second. Thirty-five income rows in the live ledger are in that state
     * today and were re-voidable.
     *
     * The rest of this file already knows the idiom - the create path filters
     * `.is('voided_at', null)` in three places - so this was an omission rather
     * than a decision.
     *
     * The guard is on the UPDATE and not only on the read, because a read
     * followed by a write is not atomic here. `.select()` makes the update
     * report what it actually touched: no rows means somebody else voided it
     * first, which is a 409 and not a failure.
     */
    if (before.voided_at) {
      throw ApiError.conflict(
        'That income record was already voided on ' +
        `${String(before.voided_at).slice(0, 10)}. It has not been changed again - voiding it ` +
        'a second time would erase who voided it the first time.'
      );
    }

    const { data: voided, error } = await db
      .from('monthly_income_records')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: req.user!.profileId,
        void_reason: 'Administrator manual deletion'
      })
      .eq('id', req.params.id)
      .is('voided_at', null)
      .select('id');

    if (error) throw ApiError.internal(error.message);
    if (!voided || voided.length === 0) {
      throw ApiError.conflict(
        'That income record was voided by someone else a moment ago. Nothing was changed. ' +
        'Reload the ledger.'
      );
    }

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
  // `isoDate`, matching the PATCH schema eighty lines below, which already used
  // it. This one took a bare string, so a malformed date reached the database
  // function as a cast error - a 500 where the sibling returns a clean 422 - and
  // an ambiguous one (`03/04/2026`) was accepted and filed under whichever month
  // PostgreSQL's DateStyle preferred. This ledger already carries two dates that
  // cannot be right (`check:ledger` pins them, one is the Excel epoch), and a
  // route that accepts ambiguous spellings is how a third arrives.
  expenseDate: isoDate,
  orSupplier: z.string().min(1),
  categoryCode: z.string().min(1).max(20),
  /**
   * At least one, and a bounded number.
   *
   * There are **six** property areas, so a genuine split cannot need many lines.
   * The array had no ceiling: 10,000 allocations were accepted by the schema,
   * carried into `create_expense_entry_with_allocations`, and came back as a
   * bare **500 "Internal server error."** - verified by sending exactly that.
   * One request, ten thousand rows attempted, and an opaque failure.
   *
   * Fifty is far above any real receipt - it allows the same area several times
   * over, which she may want for an itemised bill - and far below a number that
   * costs the database anything.
   */
  allocations: z
    .array(expenseAllocationSchema)
    .min(1, 'an expense needs at least one allocation')
    .max(50, 'an expense cannot be split more than 50 ways - there are only six property areas'),
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

    /**
     * `total_expenses` IS NOT WRITTEN HERE, and that is the fix rather than an
     * omission.
     *
     * It used to be: this handler computed the sum, put it in the patch, and the
     * UPDATE below committed it - and THEN called `replace_expense_allocations`
     * as a separate round trip. Two writes, no transaction between them. A
     * failure in the second left the entry carrying the NEW total against the
     * OLD allocations, which is BR-047 broken, while the caller saw an error and
     * reasonably assumed nothing had happened.
     *
     * Nothing needs to write it from here. `replace_expense_allocations`
     * re-derives the total from the rows it actually inserted, and
     * `trg_update_expense_total` on `expense_property_allocations` does the same
     * on every change - both read from the catalogue, not from a comment. The
     * total follows the allocations by construction, so the only honest thing
     * for this handler to touch is the date, the supplier and the category.
     *
     * The window closes because the remaining UPDATE no longer moves money: if
     * the rpc below fails now, nothing financial has changed.
     */
    const updatePatch: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };
    if (expenseDate) updatePatch.expense_date = expenseDate;
    if (orSupplier) updatePatch.or_supplier = orSupplier;
    if (categoryCode) updatePatch.category_code = categoryCode;

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

      // The row read back above predates the replacement, so its
      // `total_expenses` is the OLD sum. Returning that would show the
      // administrator a figure that was already stale before it reached her.
      const { data: fresh, error: freshError } = await db
        .from('monthly_expense_entries')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (!freshError && fresh) Object.assign(after as object, fresh);
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

    // The same defect, in the same shape, as the income void above - see the
    // block there for why the guard is on the update and not only on the read.
    if (before.voided_at) {
      throw ApiError.conflict(
        'That expense entry was already voided on ' +
        `${String(before.voided_at).slice(0, 10)}. It has not been changed again - voiding it ` +
        'a second time would erase who voided it the first time.'
      );
    }

    const { data: voided, error } = await db
      .from('monthly_expense_entries')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: req.user!.profileId,
        void_reason: 'Administrator manual deletion'
      })
      .eq('id', req.params.id)
      .is('voided_at', null)
      .select('id');

    if (error) throw ApiError.internal(error.message);
    if (!voided || voided.length === 0) {
      throw ApiError.conflict(
        'That expense entry was voided by someone else a moment ago. Nothing was changed. ' +
        'Reload the ledger.'
      );
    }

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
  roomNumber: unitCode(20).optional(),
  roomId: z.string().optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  category: z.string().max(100).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']).optional(),
  assignedTechnician: z.string().max(160).optional(),
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

    /**
     * Which unit the repair is for. It has to be the right one, and there is no
     * safe guess available.
     *
     * The fallback here used to be `.from('rooms').select('id').limit(1).single()`
     * - an arbitrary room, with no ORDER BY, so whichever one Postgres happened to
     * return. A ticket raised with a mistyped unit code, or with none, was filed
     * against that unit. Everything downstream then followed the wrong unit: the
     * active resident of that flat was attached as the person who reported it, and
     * an Emergency or `setRoomMaintenance` marked *their* unit Under Maintenance.
     * A typo could take an occupied flat out of service and put a stranger's name
     * on a complaint they never made.
     *
     * A repair with no identifiable unit is a bad request, not a repair filed
     * somewhere plausible.
     */
    let roomId = parsed.data.roomId;

    if (!roomId && parsed.data.roomNumber) {
      const { data: room, error: roomError } = await db
        .from('rooms')
        .select('id')
        .ilike('room_number', parsed.data.roomNumber)
        .maybeSingle();
      if (roomError) throw ApiError.internal(roomError.message);
      if (!room) {
        throw ApiError.validation('No unit has that number.', {
          roomNumber: [`There is no unit numbered "${parsed.data.roomNumber}".`],
        });
      }
      roomId = room.id;
    }

    if (!roomId) {
      throw ApiError.validation('A repair has to say which unit it is for.', {
        roomNumber: ['Give the unit number, or the unit id as roomId.'],
      });
    }

    /**
     * Who the repair is recorded against.
     *
     * `maintenance_tickets.tenant_profile_id` is **NOT NULL** - checked in
     * `information_schema`, not assumed - because the table was designed around
     * the tenant portal, where a ticket always has the resident who raised it.
     * This admin path has no such guarantee, and it read the active tenancy with
     * the error discarded and then inserted whatever it got. For a unit with
     * nobody in it that is `null`, and the insert failed on the constraint as a
     * bare **500 "Internal server error."**
     *
     * Verified live: `POST /admin/tickets` for **PH** returned 500, and the same
     * request for **1a** returned 201. PH is the one vacant unit - and the unit
     * being made ready to let, which is exactly when a repair gets logged.
     *
     * A clear refusal is the honest answer while the column stays NOT NULL. That
     * the column is NOT NULL at all is a real question - a repair to an empty
     * flat genuinely has no tenant - but relaxing it changes what a ticket means
     * and belongs with the form that has never been built (B-22), not with a
     * handler nothing calls yet.
     */
    let tenantProfileId: string | null = null;
    if (roomId) {
      const { data: assignment, error: assignmentError } = await db
        .from('room_assignments')
        .select('tenant_profile_id')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .maybeSingle();

      if (assignmentError) throw ApiError.internal(assignmentError.message);
      if (assignment) tenantProfileId = assignment.tenant_profile_id;
    }

    if (!tenantProfileId) {
      throw ApiError.validation('That unit has no resident on record.', {
        roomNumber: [
          'A repair is filed against the resident of the unit, and this one has nobody in it. ' +
            'Assign the tenancy first, or raise the repair once someone has moved in.',
        ],
      });
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
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Emergency']).optional(),
  status: z.enum(['Open', 'Submitted', 'In Progress', 'Resolved', 'Closed']).optional(),
  assigned_technician: z.string().max(160).optional(),
  assignedTechnician: z.string().max(160).optional(),
  roomNumber: unitCode(20).optional(),
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
      const { data: matchedRoom, error: matchError } = await db
        .from('rooms')
        .select('id')
        .ilike('room_number', parsed.data.roomNumber)
        .maybeSingle();
      if (matchError) throw ApiError.internal(matchError.message);
      // A miss used to be dropped in silence: `if (matchedRoom)` with no else, so
      // the rest of the patch went through and the caller was told the ticket had
      // been updated. Moving a repair to the wrong unit is the whole point of the
      // request - if the unit cannot be found, nothing about it should be saved.
      if (!matchedRoom) {
        throw ApiError.validation('No unit has that number.', {
          roomNumber: [`There is no unit numbered "${parsed.data.roomNumber}", so the ticket was not moved.`],
        });
      }
      patch.room_id = matchedRoom.id;
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
      /**
       * `'Open'` is NOT a value of `ticket_status_type`, and asking the database
       * for it does not return nothing - it throws.
       *
       *   select ... where status in ('Submitted','In Progress','Open')
       *   ERROR: 22P02: invalid input value for enum ticket_status_type: "Open"
       *
       * Run against the live database rather than reasoned about. `'Open'` is
       * the FRONTEND's word for `'Submitted'` - `systemState.ts` maps it on the
       * way in and this handler maps it back twenty lines above - so it should
       * never have reached a query. The enum has four values and this list named
       * a fifth.
       *
       * The failure was silent and it failed OPEN, which is the dangerous
       * direction. `error` was not destructured, so a throw left
       * `remainingUnresolved` as `null`, `!remainingUnresolved` was **true**,
       * and the branch below concluded "nothing is still open" and returned the
       * unit to Occupied. **The check for outstanding repairs could never find
       * any.** Resolve one ticket on a unit with three open and the unit comes
       * out of Under Maintenance regardless.
       *
       * Worse than an error a person would see: rehearsal step 21 asserts that
       * the unit returns to Occupied, so the rehearsal would have PASSED on a
       * query that never worked.
       *
       * `check:writes` does not cover it - this is a read, and that suite guards
       * writes that discard their result.
       */
      const { data: remainingUnresolved, error: remainingError } = await db
        .from('maintenance_tickets')
        .select('id')
        .eq('room_id', targetRoomId)
        .in('status', ['Submitted', 'In Progress']);

      if (remainingError) {
        throw ApiError.internal(
          `The ticket was updated, but this unit's other repair requests could not be read, ` +
            `so it has been left as it was rather than reported clear: ${remainingError.message}`
        );
      }

      if (remainingUnresolved.length === 0) {
        /**
         * A failed read here must not decide the unit is empty.
         *
         * `activeAssign` alone is falsy both when nobody lives there AND when
         * the query failed, and the line below turns the second into
         * **'Available'** - a unit with a resident in it, advertised as free.
         * `operational_status` is in the `/public/rooms` payload, so that answer
         * reaches the public listing, not just the directory.
         *
         * The same fail-open shape as the `'Open'` query above it, which is why
         * this was worth checking while in here.
         */
        const { data: activeAssign, error: assignError } = await db
          .from('room_assignments')
          .select('id')
          .eq('room_id', targetRoomId)
          .eq('is_active', true)
          .maybeSingle();

        if (assignError) {
          throw ApiError.internal(
            `The ticket was updated, but this unit's tenancy could not be read, so its ` +
              `status has been left as it was rather than guessed: ${assignError.message}`
          );
        }

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
      /**
       * The same defect as the PATCH handler above, in the same words - found by
       * grepping for siblings after fixing that one, which is the habit that
       * finds most of them on this project.
       *
       * `'Open'` is not a value of `ticket_status_type`; the database answers
       * `22P02` rather than an empty list. `error` was not destructured, so the
       * throw left the result null, `!remainingUnresolved` was TRUE, and
       * deleting one ticket cleared the unit however many were still open.
       */
      const { data: remainingUnresolved, error: remainingError } = await db
        .from('maintenance_tickets')
        .select('id')
        .eq('room_id', before.room_id)
        .in('status', ['Submitted', 'In Progress']);

      if (remainingError) {
        throw ApiError.internal(
          `The ticket was deleted, but this unit's other repair requests could not be read, ` +
            `so it has been left as it was rather than reported clear: ${remainingError.message}`
        );
      }

      if (remainingUnresolved.length === 0) {
        // Same fail-open as the PATCH path: falsy covers both "nobody lives
        // there" and "the query failed", and the second would advertise an
        // occupied unit as free on the public listing.
        const { data: activeAssign, error: assignError } = await db
          .from('room_assignments')
          .select('id')
          .eq('room_id', before.room_id)
          .eq('is_active', true)
          .maybeSingle();

        if (assignError) {
          throw ApiError.internal(
            `The ticket was deleted, but this unit's tenancy could not be read, so its ` +
              `status has been left as it was rather than guessed: ${assignError.message}`
          );
        }

        const newRoomStatus = activeAssign ? 'Occupied' : 'Available';
        assertWritten(
          await db.from('rooms').update({ operational_status: newRoomStatus }).eq('id', before.room_id),
          `The ticket was deleted, but the unit could not be returned to ${newRoomStatus}`
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
     *   export   - downloads of a ledger. A read; it changes nothing
     *   (absent) - everything, newest first
     *
     * **`export` was split out of `business` on 2026-09-19, and it is the same
     * defect as the paragraph above, one category over.** `LEDGER_EXPORT` does
     * not begin with `AUTH_`, so every one of them landed in the business
     * bucket - and the verification suites export workbooks on every run.
     * Counted on the day: **1,581 of the 1,715 business rows were
     * `LEDGER_EXPORT`, 92%**, leaving 134 real events. The default limit is 100,
     * newest first, so the administrator's first page was entirely exports and
     * the rows describing what was actually done to her records were off the
     * end of it. Exactly what the AUTH filter exists to prevent.
     *
     * The tab is labelled *"Done to the records"*. An export does nothing to
     * them, so this is what that label already promised rather than a new
     * definition. The rows are still written and still readable - auditing who
     * downloaded the ledger is a real access record - they are simply not
     * counted as a change.
     */
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    let query = db
      .from('audit_logs')
      .select('*, profiles:actor_profile_id (id, full_name, role)');

    if (category === 'business') {
      query = query.not('action', 'like', 'AUTH\_%').neq('action', 'LEDGER_EXPORT');
    } else if (category === 'auth') query = query.like('action', 'AUTH\_%');
    else if (category === 'export') query = query.eq('action', 'LEDGER_EXPORT');

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw ApiError.internal(error.message);

    // Totals for the whole table, so the tab labels are not limited to the window.
    const counted = await db
      .from('audit_logs')
      .select('id', { head: true, count: 'exact' })
      .like('action', 'AUTH\_%');
    const exported = await db
      .from('audit_logs')
      .select('id', { head: true, count: 'exact' })
      .eq('action', 'LEDGER_EXPORT');
    const total = await db
      .from('audit_logs')
      .select('id', { head: true, count: 'exact' });

    const authTotal = counted.count ?? 0;
    const exportTotal = exported.count ?? 0;
    const grandTotal = total.count ?? 0;

    res.status(200).json({
      success: true,
      data: data ?? [],
      meta: {
        authTotal,
        exportTotal,
        // What is left once sign-ins and downloads are taken out: the events
        // the tab actually claims to list.
        businessTotal: grandTotal - authTotal - exportTotal,
        grandTotal,
      },
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
        /**
         * The sender's own name, not a hardcoded one.
         *
         * This wrote 'Fe Galang Da Silva (Landlady)' for whoever sent the reply,
         * beside a `sender_id` recording who actually did. There is one `admin`
         * profile today, so the two agree - and they stop agreeing the moment a
         * second account can reply, which would leave a PERSISTED record of
         * correspondence with a prospective resident attributing words to the
         * owner that she did not write. That is the sort of row someone reads
         * back later to settle what was promised.
         *
         * The prospect's own message stores `sender_name: input.prospectName`
         * (routes/public.ts), so the column already means "whoever sent this".
         * This makes the other side of the thread symmetric.
         */
        sender_name: req.user!.fullName,
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

    /**
     * Named from the row that was just written, not assumed.
     *
     * This said "Landlady commented" for whoever posted it. There is exactly one
     * `admin` profile today - Mrs. Fe Galang Da Silva - so it is accurate right
     * now, and it stops being accurate the moment a second account holds
     * `TICKET_COMMENT`: a caretaker, or an account added for a demonstration.
     * The resident would then be told the owner said something she did not say.
     *
     * The sender's name is already in hand: the insert above selects
     * `profiles:sender_id (id, full_name, role)` for exactly this row. It falls
     * back to a role rather than a name, because "someone commented" is a worse
     * message than "the administrator commented" and both beat a wrong name.
     */
    const senderName =
      (data as { profiles?: { full_name?: string | null } } | null)?.profiles?.full_name?.trim() ||
      'The administrator';

    await notificationService.notify({
      recipientProfileId: ticket.tenant_profile_id,
      title: 'New Maintenance Ticket Comment',
      message: `${senderName} commented on ticket "${ticket.title}": "${parsed.data.message.slice(0, 80)}${parsed.data.message.length > 80 ? '...' : ''}"`,
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
