/**
 * @file services/authService.ts
 * @description Password verification, JWT issuance, and profile resolution.
 * @systemBibleRef Section 4 (Users), Section 19 (Account Lifecycle), Section 20 (Security)
 * @businessRules  BR-025 Tenant Deactivation
 * @requirements   FR-001 Authentication
 *
 * 05_DATABASE_DESIGN.md Rule 8 — passwords are only ever handled as bcrypt
 * hashes. `password_hash` is never included in any response payload.
 */
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { db } from '../config/db.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import type { AuthUser, JwtPayload } from '../types/auth.js';
import type { StoredRole } from '../config/rbac.js';

/** Columns safe to select. Deliberately excludes password_hash. */
const SAFE_PROFILE_COLUMNS =
  'id, email, full_name, phone_number, emergency_contact_name, emergency_contact_phone, ' +
  'occupation, facebook_url, role, account_status, last_login_at, created_at, updated_at';

interface CredentialRow {
  id: string;
  email: string;
  full_name: string;
  role: StoredRole;
  account_status: 'active' | 'inactive';
  password_hash: string | null;
  failed_login_count: number;
  locked_until: string | null;
}

export interface LoginResult {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

/**
 * Authenticates by email + password.
 *
 * Failure modes are deliberately indistinguishable to the caller where they
 * could enable account enumeration: an unknown email, a password-less profile
 * (e.g. a prospect), and a wrong password all return the same error.
 */
export async function login(
  emailInput: string,
  password: string,
  ipAddress?: string
): Promise<LoginResult> {
  const email = emailInput.trim().toLowerCase();

  const { data, error } = await db
    .from('profiles')
    .select(
      'id, email, full_name, role, account_status, password_hash, failed_login_count, locked_until'
    )
    .ilike('email', email)
    .maybeSingle<CredentialRow>();

  if (error) {
    throw ApiError.internal(`Authentication lookup failed: ${error.message}`);
  }

  if (!data || !data.password_hash) {
    // Unknown email, or a profile with no credentials (System Bible Section 4:
    // a prospect holds no account access). Burn comparable time so response
    // latency does not reveal which case occurred.
    await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
    throw ApiError.invalidCredentials();
  }

  if (data.locked_until && new Date(data.locked_until) > new Date()) {
    const minutes = Math.max(
      1,
      Math.ceil((new Date(data.locked_until).getTime() - Date.now()) / 60000)
    );
    throw ApiError.accountLocked(minutes);
  }

  const passwordMatches = await bcrypt.compare(password, data.password_hash);

  if (!passwordMatches) {
    await registerFailedAttempt(data);
    throw ApiError.invalidCredentials();
  }

  // BR-025 — a vacated tenant's account is deactivated and must lose access.
  // Checked only after a valid password so the response cannot be used to probe
  // which accounts exist.
  if (data.account_status !== 'active') {
    throw ApiError.accountInactive();
  }

  await db
    .from('profiles')
    .update({
      last_login_at: new Date().toISOString(),
      failed_login_count: 0,
      locked_until: null,
    })
    .eq('id', data.id);

  const user: AuthUser = {
    profileId: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    accountStatus: data.account_status,
  };

  void recordLoginAudit(user, ipAddress);

  return {
    token: issueToken(user),
    expiresIn: config.jwt.expiresIn,
    user,
  };
}

/** Increments the failure counter and locks the profile past the threshold. */
async function registerFailedAttempt(row: CredentialRow): Promise<void> {
  const failedCount = (row.failed_login_count ?? 0) + 1;
  const shouldLock = failedCount >= config.auth.maxFailedLogins;

  await db
    .from('profiles')
    .update({
      failed_login_count: failedCount,
      locked_until: shouldLock
        ? new Date(Date.now() + config.auth.lockoutMinutes * 60_000).toISOString()
        : null,
    })
    .eq('id', row.id);
}

export function issueToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: user.profileId,
    email: user.email,
    role: user.role,
  };

  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  };

  return jwt.sign(payload, config.jwt.secret, options);
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as JwtPayload;
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired. Please sign in again.');
    }
    throw new ApiError(401, 'TOKEN_INVALID', 'Invalid authentication token.');
  }
}

/**
 * Re-reads the profile behind a token.
 *
 * Called on every authenticated request so that deactivating a tenant
 * (BR-025) or changing a role revokes access immediately, rather than when the
 * JWT happens to expire.
 */
export async function resolveAuthUser(profileId: string): Promise<AuthUser> {
  const { data, error } = await db
    .from('profiles')
    .select('id, email, full_name, role, account_status')
    .eq('id', profileId)
    .maybeSingle<Omit<CredentialRow, 'password_hash' | 'failed_login_count' | 'locked_until'>>();

  if (error) {
    throw ApiError.internal(`Profile lookup failed: ${error.message}`);
  }
  if (!data) {
    throw ApiError.unauthenticated('Account no longer exists.');
  }
  if (data.account_status !== 'active') {
    throw ApiError.accountInactive();
  }

  return {
    profileId: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    accountStatus: data.account_status,
  };
}

export async function getOwnProfile(profileId: string) {
  const { data, error } = await db
    .from('profiles')
    .select(SAFE_PROFILE_COLUMNS)
    .eq('id', profileId)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound('Profile not found.');
  return data;
}

/** Fields a tenant may edit about themselves (System Bible Section 19). */
const TENANT_EDITABLE_FIELDS = [
  'phone_number',
  'emergency_contact_name',
  'emergency_contact_phone',
  'occupation',
  'facebook_url',
] as const;

export type TenantEditableField = (typeof TENANT_EDITABLE_FIELDS)[number];

/**
 * Updates the caller's own profile.
 *
 * System Bible Section 19 permits a tenant to update phone number, emergency
 * contact, occupation and contact links — and nothing else. `role`,
 * `account_status` and `email` are stripped here rather than trusted from the
 * request body, so a tenant cannot escalate themselves to admin.
 */
export async function updateOwnProfile(
  profileId: string,
  patch: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const safePatch: Record<string, unknown> = {};

  for (const field of TENANT_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) {
      const value = patch[field];
      safePatch[field] = value === '' ? null : value;
    }
  }

  if (Object.keys(safePatch).length === 0) {
    throw ApiError.badRequest(
      `No permitted fields supplied. Editable fields: ${TENANT_EDITABLE_FIELDS.join(', ')}.`
    );
  }

  safePatch.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from('profiles')
    .update(safePatch)
    .eq('id', profileId)
    .select(SAFE_PROFILE_COLUMNS)
    .maybeSingle();

  if (error) throw ApiError.internal(error.message);
  if (!data) throw ApiError.notFound('Profile not found.');
  return data as unknown as Record<string, unknown>;
}

export async function changeOwnPassword(
  profileId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data, error } = await db
    .from('profiles')
    .select('id, password_hash')
    .eq('id', profileId)
    .maybeSingle<{ id: string; password_hash: string | null }>();

  if (error) throw ApiError.internal(error.message);
  if (!data?.password_hash) throw ApiError.invalidCredentials();

  const matches = await bcrypt.compare(currentPassword, data.password_hash);
  if (!matches) throw ApiError.invalidCredentials();

  const hash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);

  const { error: updateError } = await db
    .from('profiles')
    .update({
      password_hash: hash,
      password_changed_at: new Date().toISOString(),
      failed_login_count: 0,
      locked_until: null,
    })
    .eq('id', profileId);

  if (updateError) throw ApiError.internal(updateError.message);
}

/** Best-effort login audit; never blocks or fails the login itself. */
async function recordLoginAudit(user: AuthUser, ipAddress?: string): Promise<void> {
  try {
    await db.from('audit_logs').insert({
      actor_profile_id: user.profileId,
      action: 'AUTH_LOGIN',
      entity_type: 'PROFILE',
      entity_id: user.profileId,
      new_values: { role: user.role, email: user.email },
      ip_address: ipAddress ?? null,
    });
  } catch {
    // Audit write failures must not deny a legitimate login.
  }
}

export { SAFE_PROFILE_COLUMNS };
