/**
 * @file middleware/auth.ts
 * @description Authentication and role-based authorization middleware.
 * @systemBibleRef Section 4 (Users), Section 20 (Security)
 * @architectureRef 04_ARCHITECTURE.md — "Every protected operation must be
 *                  validated and authorized by the backend."
 * @requirements   FR-001 Authentication, FR-002 Role-Based Access
 *
 * This module is the enforcement point. A route is only as protected as the
 * middleware in front of it, so every non-public router mounts `requireAuth`
 * plus a permission or role guard.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { resolveAuthUser, verifyToken } from '../services/authService.js';
import { roleHasPermission, type Permission, type Role } from '../config/rbac.js';
import { ApiError } from '../utils/ApiError.js';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Establishes `req.role = 'guest'` for every request.
 *
 * Mounted before all routers so that a permission check on an unauthenticated
 * request evaluates against guest rights rather than reading `undefined` —
 * i.e. the default is deny, not crash.
 */
export const attachGuestRole: RequestHandler = (req, _res, next) => {
  req.role = 'guest';
  next();
};

/**
 * Populates `req.user` when a valid token is present, and does nothing when it
 * is absent.
 *
 * For endpoints that serve everyone but reveal more to an administrator — the
 * public room catalogue hides unpublished units from guests but shows them to
 * the landlady (BR-007).
 *
 * A malformed or expired token is still rejected: presenting a bad credential
 * is an error, not anonymity.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    req.role = 'guest';
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    const user = await resolveAuthUser(payload.sub);
    req.user = user;
    req.role = user.role;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Rejects the request unless a valid token maps to an active profile.
 *
 * The profile is re-read from the database rather than trusted from the token
 * claims, so a deactivated tenant (BR-025) loses access on their next request.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw ApiError.unauthenticated('Sign in to access this resource.');
    }

    const payload = verifyToken(token);
    const user = await resolveAuthUser(payload.sub);

    req.user = user;
    req.role = user.role;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Requires one of the given roles.
 *
 * Prefer `requirePermission` — it keeps authorization decisions in
 * `config/rbac.ts`. Use this only where a whole router is role-bound, such as
 * the admin ledgers (BR-048).
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    const role = req.role ?? 'guest';

    if (!allowed.includes(role)) {
      next(
        ApiError.forbidden(
          `This action requires the ${allowed.join(' or ')} role. Your role: ${role}.`
        )
      );
      return;
    }
    next();
  };
}

/** Convenience guard for administrator-only routers. */
export const requireAdmin: RequestHandler = requireRole('admin');

/**
 * Requires a specific permission from the RBAC matrix.
 *
 * This is the preferred guard: routes declare the capability they need and
 * `config/rbac.ts` decides which roles hold it.
 */
export function requirePermission(...required: Permission[]): RequestHandler {
  return (req, _res, next) => {
    const role = req.role ?? 'guest';
    const missing = required.filter((p) => !roleHasPermission(role, p));

    if (missing.length > 0) {
      next(
        ApiError.forbidden(
          `Missing required permission: ${missing.join(', ')}. Your role: ${role}.`
        )
      );
      return;
    }
    next();
  };
}

/**
 * Blocks a tenant from acting on another tenant's records via a path parameter.
 *
 * BR-024 / System Bible Section 20 — "A tenant must not access another tenant's
 * personal data." An administrator passes through unaffected.
 */
export function requireSelfOrAdmin(paramName = 'profileId'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.role === 'admin') {
      next();
      return;
    }
    if (!req.user) {
      next(ApiError.unauthenticated());
      return;
    }
    if (req.params[paramName] !== req.user.profileId) {
      next(ApiError.forbidden('You may only access your own records.'));
      return;
    }
    next();
  };
}
