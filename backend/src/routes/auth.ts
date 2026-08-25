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

const loginSchema = z.object({
  email: z.string().email('A valid email address is required.'),
  password: z.string().min(1, 'Password is required.'),
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

    const result = await login(parsed.data.email, parsed.data.password, clientIp(req) ?? undefined);

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
  email: z.string().email('A valid email address is required.'),
  password: z.string().min(10, 'Password must be at least 10 characters.'),
  fullName: z.string().min(2, 'Full name is required.'),
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  occupation: z.string().optional(),
  facebookUrl: z.string().optional(),
  role: z.string().optional(),
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
    const updated = await updateOwnProfile(req.user!.profileId, req.body ?? {});

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
