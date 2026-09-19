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
import { rateLimit, failureLimit } from '../middleware/rateLimit.js';
import { config } from '../config/env.js';
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
/**
 * Failed sign-ins from one address, per quarter-hour.
 *
 * Per-account lockout already stops someone guessing at ONE account. This stops
 * the opposite shape - one password tried once against each of forty-five
 * accounts, which never gives any single account five failures and so never
 * locks anything. See the header of `middleware/rateLimit.ts`.
 *
 * Thirty, because thirty-two units share one connection on the house wifi, so
 * every resident's mistyped password lands on the same counter.
 */
const loginFailures = failureLimit({
  max: 30,
  windowMs: 15 * 60 * 1000,
  what: 'failed sign-in attempts',
});

router.post(
  '/auth/login',
  loginFailures,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid login payload.', parsed.error.flatten().fieldErrors);
    }

    const identifier = parsed.data.identifier ?? parsed.data.email ?? '';

    // Only a genuine failure is charged to the address, so a resident who signs
    // in correctly never moves the counter and neither do the suites.
    let result;
    try {
      result = await login(identifier, parsed.data.password, clientIp(req) ?? undefined);
    } catch (err) {
      loginFailures.record(req);
      throw err;
    }

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
 *
 * **This is the system's second genuinely open write, and it was unthrottled.**
 *
 * `middleware/rateLimit.ts` says in its own header that `POST /public/inquiries`
 * is *"the only genuinely open write in the system"*, and enumerates the other
 * public writes to prove it. The census was of `routes/public.ts`. This route
 * lives in `routes/auth.ts`, so it was never in the set being counted - the
 * same shape as the closure proof that could not find `property_areas` because
 * it enumerated the wrong file. A completeness claim is only as good as its
 * idea of where the thing being counted is allowed to live.
 *
 * What it writes is a real `profiles` row, `role: 'tenant'`,
 * `account_status: 'active'`. Unlimited, that is the owner's Active Tenants
 * screen filled with accounts nobody created on purpose - and `profiles` is
 * live data, so clearing them is a migration rather than a delete.
 *
 * The sharper cost is CPU. Every call runs bcrypt at the configured rounds
 * before anything else can be decided, on the machine that also serves the
 * ledger. An unauthenticated endpoint that hashes on demand is the classic way
 * to exhaust one.
 *
 * The header's reasoning for NOT wrapping `/auth/login` is sound and does not
 * transfer: login is guarded per ACCOUNT by `failed_login_count` and
 * `locked_until`, and the suites sign in constantly. Neither is true here -
 * every registration is a NEW account, so there is nothing per-account to
 * count, and no suite registers. `check:api` checks this route statically,
 * on purpose, because proving an account cannot be created by creating one is
 * not a test worth having against a live database.
 *
 * Five in a quarter of an hour: a person signs up once, a script does not.
 */
router.post(
  '/auth/register',
  rateLimit({ max: 5, windowMs: 15 * 60 * 1000, what: 'sign-up attempts' }),
  /**
   * Refused unless `ALLOW_PUBLIC_SIGNUP=true`. See the note on the setting.
   *
   * Placed AFTER the rate limit deliberately, so someone hammering a closed
   * endpoint is still throttled rather than being handed an unlimited supply of
   * cheap 403s.
   */
  (req, _res, next) => {
    if (!config.allowPublicSignup) {
      next(
        ApiError.forbidden(
          'This system does not accept public sign-ups. A resident is admitted by the ' +
            'administrator, who records the unit and the move-in date at the same time.'
        )
      );
      return;
    }
    next();
  },
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
