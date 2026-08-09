/**
 * @file types/auth.ts
 * @description Shared authentication/authorization types.
 * @systemBibleRef Section 4 (Users), Section 20 (Security)
 */
import type { Role, StoredRole } from '../config/rbac.js';

/** The authenticated caller, resolved from the database on every request. */
export interface AuthUser {
  profileId: string;
  email: string;
  fullName: string;
  role: StoredRole;
  accountStatus: 'active' | 'inactive';
}

/**
 * JWT claims.
 *
 * The token carries the role for convenience only — middleware still re-reads
 * the profile from the database on every request, so a role change or a
 * deactivation (BR-025) takes effect immediately instead of waiting for the
 * token to expire.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: StoredRole;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/** What a tenant is allowed to reach, computed server-side. */
export interface TenantScope {
  profileId: string;
  /** Rooms with an active assignment to this tenant. */
  roomIds: string[];
  /** Every room ever assigned, for historical reads (System Bible Section 6). */
  historicalRoomIds: string[];
  assignmentIds: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Present once requireAuth (or optionalAuth with a token) has run. */
      user?: AuthUser;
      /** Effective role — 'guest' when unauthenticated. */
      role: Role;
      /** Populated lazily by tenant-scoped controllers. */
      tenantScope?: TenantScope;
    }
  }
}

export {};
