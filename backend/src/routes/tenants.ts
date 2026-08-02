/**
 * @file tenants.ts
 * @description Admin-only tenant onboarding endpoint. This is the one write the frontend cannot
 *              perform directly against Supabase, because creating a login (auth.users row)
 *              requires the service-role key. Implements BR-009 (reuse inquiry info),
 *              BR-026/BR-027 (reuse an existing profile by email instead of duplicating, including
 *              reactivating a former tenant), and BR-039 (deposit defaults to the room's rent at
 *              move-in). Everything else in tenant management (viewing, deactivating, editing)
 *              happens straight from the frontend against Supabase under RLS.
 */
import { Router, Response } from 'express';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin, AuthedRequest } from '../middleware/requireAdmin.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const onboardSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  occupation: z.string().optional(),
  facebookUrl: z.string().optional(),
  roomId: z.string().uuid(),
  startDate: z.string().min(1),
  occupantCount: z.number().int().min(1),
  depositAmount: z.number().min(0).optional(),
  inquiryId: z.string().uuid().optional(),
});

function generateTempPassword(): string {
  return `Hive-${randomBytes(6).toString('hex')}`;
}

router.post('/tenants/onboard', requireAdmin, async (req: AuthedRequest, res: Response, next) => {
  try {
    const input = onboardSchema.parse(req.body);

    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, room_number, current_price, operational_status')
      .eq('id', input.roomId)
      .single();

    if (roomError || !room) {
      const err: AppError = new Error('Room not found.');
      err.statusCode = 404;
      throw err;
    }

    const { data: existingAssignment } = await supabaseAdmin
      .from('room_assignments')
      .select('id')
      .eq('room_id', input.roomId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingAssignment) {
      const err: AppError = new Error(`Room ${room.room_number} already has an active tenant.`);
      err.statusCode = 409;
      throw err;
    }

    const tempPassword = generateTempPassword();

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id, role, account_status')
      .eq('email', input.email)
      .maybeSingle();

    if (existingProfile?.role === 'admin') {
      const err: AppError = new Error('This email belongs to an administrator account.');
      err.statusCode = 409;
      throw err;
    }

    let profileId: string;

    if (existingProfile) {
      // BR-026/BR-027: reuse the existing profile (former tenant or converted prospect)
      // instead of creating a duplicate.
      if (existingProfile.auth_user_id) {
        await supabaseAdmin.auth.admin.updateUserById(existingProfile.auth_user_id, {
          password: tempPassword,
        });
      } else {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: tempPassword,
          email_confirm: true,
        });
        if (createError || !created?.user) {
          const err: AppError = new Error(createError?.message || 'Failed to create login credentials.');
          err.statusCode = 500;
          throw err;
        }
        await supabaseAdmin
          .from('profiles')
          .update({ auth_user_id: created.user.id })
          .eq('id', existingProfile.id);
      }

      profileId = existingProfile.id;

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          role: 'tenant',
          account_status: 'active',
          full_name: input.fullName,
          phone_number: input.phoneNumber ?? null,
          emergency_contact_name: input.emergencyContactName ?? null,
          emergency_contact_phone: input.emergencyContactPhone ?? null,
          occupation: input.occupation ?? null,
          facebook_url: input.facebookUrl ?? null,
        })
        .eq('id', profileId);

      if (updateError) {
        const err: AppError = new Error(updateError.message || 'Failed to update tenant profile.');
        err.statusCode = 500;
        throw err;
      }
    } else {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createError || !created?.user) {
        const err: AppError = new Error(createError?.message || 'Failed to create login credentials.');
        err.statusCode = 500;
        throw err;
      }

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          auth_user_id: created.user.id,
          email: input.email,
          full_name: input.fullName,
          phone_number: input.phoneNumber ?? null,
          emergency_contact_name: input.emergencyContactName ?? null,
          emergency_contact_phone: input.emergencyContactPhone ?? null,
          occupation: input.occupation ?? null,
          facebook_url: input.facebookUrl ?? null,
          role: 'tenant',
          account_status: 'active',
        })
        .select('id')
        .single();

      if (insertError || !newProfile) {
        const err: AppError = new Error(insertError?.message || 'Failed to create tenant profile.');
        err.statusCode = 500;
        throw err;
      }
      profileId = newProfile.id;
    }

    const depositAmount = input.depositAmount ?? room.current_price;

    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('room_assignments')
      .insert({
        room_id: input.roomId,
        tenant_profile_id: profileId,
        start_date: input.startDate,
        anniversary_date: input.startDate,
        deposit_amount: depositAmount,
        occupant_count: input.occupantCount,
        is_primary_contact: true,
        is_active: true,
      })
      .select('*')
      .single();

    if (assignmentError || !assignment) {
      const err: AppError = new Error(assignmentError?.message || 'Failed to create room assignment.');
      err.statusCode = 500;
      throw err;
    }

    await supabaseAdmin
      .from('rooms')
      .update({ operational_status: 'Occupied' })
      .eq('id', input.roomId);

    if (input.inquiryId) {
      await supabaseAdmin
        .from('inquiries')
        .update({ status: 'Converted', converted_tenant_id: profileId })
        .eq('id', input.inquiryId);
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_profile_id: req.adminProfileId,
      action: 'ONBOARD_TENANT',
      entity_type: 'PROFILE',
      entity_id: profileId,
      previous_values: existingProfile ? { role: existingProfile.role, account_status: existingProfile.account_status } : null,
      new_values: {
        room_id: input.roomId,
        room_number: room.room_number,
        occupant_count: input.occupantCount,
        deposit_amount: depositAmount,
        start_date: input.startDate,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        profileId,
        roomAssignment: assignment,
        tempPassword,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
