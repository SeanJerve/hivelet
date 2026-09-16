/**
 * @file routes/auth.ts
 * @description Authentication and self-service profile endpoints.
 * @systemBibleRef Section 4 (Users), Section 19 (Account Lifecycle)
 * @requirements   FR-001 Authentication, FR-010 Tenant Profile Updates
 */
import { Router } from 'express';
import { z } from 'zod';
import {
  login,
  register,
  getOwnProfile,
  updateOwnProfile,
  changeOwnPassword,
} from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { permissionsForRole } from '../config/rbac.js';
import { auditFromRequest, clientIp } from '../services/auditService.js';

const router = Router();

/**
 * The identifier may be an email address OR a Philippine phone number (OD-09 —
 * a tenant need not have an email, and the database carries a UNIQUE index on
 * `normalize_ph_phone(phone_number)` for exactly this). It is therefore NOT
 * validated as an email here; `resolve_login_identifier()` decides what it is.
 *
 * `email` is still accepted as an alias so existing clients keep working.
 */
const loginSchema = z
  .object({
    identifier: z.string().trim().min(1).max(255).optional(),
    email: z.string().trim().min(1).max(255).optional(),
    password: z.string().min(1, 'Password is required.'),
  })
  .refine((v) => Boolean(v.identifier || v.email), {
    message: 'Enter your email address or phone number.',
    path: ['identifier'],
  });

/**
 * POST /api/auth/login
 * Public. Exchanges credentials for a JWT.
 */
router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid login payload.', parsed.error.flatten().fieldErrors);
    }

    const identifier = parsed.data.identifier ?? parsed.data.email ?? '';
    const result = await login(identifier, parsed.data.password, clientIp(req) ?? undefined);

    res.status(200).json({
      success: true,
      data: {
        token: result.token,
        expiresIn: result.expiresIn,
        user: result.user,
        // The frontend uses these to render navigation only. They are a UX
        // convenience — the backend re-checks every permission on every call.
        permissions: permissionsForRole(result.user.role),
      },
    });
  })
);

const registerSchema = z.object({
  email: z.string().email('A valid email address is required.').max(255),
  password: z.string().min(10, 'Password must be at least 10 characters.'),
  fullName: z.string().min(2, 'Full name is required.').max(255),
  phoneNumber: z.string().max(50).optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  occupation: z.string().max(100).optional(),
  facebookUrl: z.string().optional(),
  /**
   * `role` is NOT accepted here, and must never be added back.
   *
   * This schema carried `role: z.string().optional()` until 2026-09-16, on a
   * route with no `requireAuth` and no `requirePermission`, and
   * `authService.register()` wrote it straight into the insert as
   * `role: data.role || 'tenant'`. `user_role_type` accepts `'admin'`.
   *
   * So an unauthenticated POST of
   *     { email, password, fullName, role: 'admin' }
   * created an administrator and returned a signed token for it - reaching all
   * 937 income rows, all 45 profiles and the payment verification gate.
   *
   * The sign-up form has only ever sent email, password, fullName and
   * phoneNumber, so removing the field changes nothing any real caller does.
   * Zod strips unknown keys, so a payload containing `role` is now accepted and
   * ignored rather than rejected - the attacker learns nothing and the tenant
   * still gets their account. A role is assigned by the server, never asked for.
   */
});

/**
 * POST /api/auth/register
 * Public. Creates a new user profile and returns a JWT.
 */
router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid registration payload.', parsed.error.flatten().fieldErrors);
    }

    const result = await register(parsed.data, clientIp(req) ?? undefined);

    res.status(201).json({
      success: true,
      data: {
        token: result.token,
        expiresIn: result.expiresIn,
        user: result.user,
        permissions: permissionsForRole(result.user.role),
      },
    });
  })
);

/**
 * GET /api/auth/me
 * Returns the caller's identity, role and effective permissions.
 */
router.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await getOwnProfile(req.user!.profileId);

    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        profile,
        permissions: permissionsForRole(req.user!.role),
      },
    });
  })
);

/**
 * PATCH /api/auth/me
 * System Bible Section 19 — a tenant may update phone number, emergency
 * contact, occupation and contact links. `role` and `account_status` are
 * stripped in the service, so this cannot be used to self-promote.
 */
router.patch(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const before = await getOwnProfile(req.user!.profileId);
    // `updateOwnProfile` already strips anything outside TENANT_EDITABLE_FIELDS,
    // so role escalation was never possible. What was missing was TYPE checking:
    // an object or array reached PostgreSQL and came back as a 500 rather than a
    // 422 naming the offending field. Lengths match the column widths.
    const parsedProfile = z.object({
      phone_number: z.string().trim().max(50).nullable().optional(),
      emergency_contact_name: z.string().trim().max(255).nullable().optional(),
      emergency_contact_phone: z.string().trim().max(50).nullable().optional(),
      occupation: z.string().trim().max(100).nullable().optional(),
      facebook_url: z.string().trim().max(2048).nullable().optional()
    }).strict().safeParse(req.body ?? {});

    if (!parsedProfile.success) {
      throw ApiError.validation(
        'Invalid profile payload.',
        parsedProfile.error.flatten().fieldErrors
      );
    }

    const updated = await updateOwnProfile(req.user!.profileId, parsedProfile.data);

    await auditFromRequest(req, {
      action: 'PROFILE_UPDATE',
      entityType: 'PROFILE',
      entityId: req.user!.profileId,
      previousValues: before as unknown as Record<string, unknown>,
      newValues: updated,
    });

    res.status(200).json({ success: true, data: updated });
  })
);

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(10, 'New password must be at least 10 characters.')
    .regex(/[A-Za-z]/, 'New password must contain a letter.')
    .regex(/[0-9]/, 'New password must contain a number.'),
});

/** POST /api/auth/change-password */
router.post(
  '/auth/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid password payload.', parsed.error.flatten().fieldErrors);
    }

    await changeOwnPassword(
      req.user!.profileId,
      parsed.data.currentPassword,
      parsed.data.newPassword
    );

    await auditFromRequest(req, {
      action: 'AUTH_PASSWORD_CHANGE',
      entityType: 'PROFILE',
      entityId: req.user!.profileId,
    });

    res.status(200).json({ success: true, data: { message: 'Password updated.' } });
  })
);

/**
 * POST /api/auth/logout
 * JWTs are stateless, so the client discards the token. This exists to record
 * the event in the audit trail (FR-029).
 */
router.post(
  '/auth/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    await auditFromRequest(req, {
      action: 'AUTH_LOGOUT',
      entityType: 'PROFILE',
      entityId: req.user!.profileId,
    });

    res.status(200).json({ success: true, data: { message: 'Signed out.' } });
  })
);

export default router;
