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
import { warnIfWriteFailed } from '../utils/checkedWrite.js';
import type { AuthUser, JwtPayload } from '../types/auth.js';
import type { StoredRole } from '../config/rbac.js';

/** Columns safe to select. Deliberately excludes password_hash. */
const SAFE_PROFILE_COLUMNS =
  'id, email, full_name, phone_number, emergency_contact_name, emergency_contact_phone, ' +
  'occupation, facebook_url, role, account_status, last_login_at, created_at, updated_at';

interface CredentialRow {
  id: string;
  // Nullable: a tenant onboarded with only a phone number has no email (OD-09).
  email: string | null;
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
 * Authenticates by identifier + password, where the identifier is an email
 * address OR a Philippine phone number.
 *
 * Phone sign-in exists because OD-09 (client-confirmed 2026-09-13) says a tenant
 * need not have an email: "Every tenant is a record; a portal login is optional
 * and separate." The database was built for it — `idx_profiles_phone_login` is a
 * UNIQUE index on `normalize_ph_phone(phone_number)` over credentialed profiles —
 * but this function looked callers up by email alone, so a phone-only tenant
 * could hold a password and still never get in.
 *
 * Resolution goes through `resolve_login_identifier()` (migration 021) rather
 * than matching a phone here, so the normalisation rule lives in one place: the
 * expression the unique index is built on. A second copy in TypeScript could
 * drift from the index without anything failing loudly.
 *
 * Failure modes are deliberately indistinguishable to the caller where they
 * could enable account enumeration: an unknown identifier, a password-less
 * profile (e.g. a prospect), and a wrong password all return the same error.
 */
export async function login(
  identifierInput: string,
  password: string,
  ipAddress?: string
): Promise<LoginResult> {
  const identifier = identifierInput.trim();

  const { data: rows, error } = await db.rpc('resolve_login_identifier', {
    p_identifier: identifier
  });

  if (error) {
    throw ApiError.internal(`Authentication lookup failed: ${error.message}`);
  }

  // The function is `RETURNS TABLE ... LIMIT 1`, so this is zero or one row.
  const resolved = (rows ?? []) as unknown as CredentialRow[];
  const data: CredentialRow | null = resolved.length > 0 ? resolved[0] : null;

  if (!data || !data.password_hash) {
    // Unknown email, or a profile with no credentials (System Bible Section 4:
    // a prospect holds no account access). Burn comparable time so response
    // latency does not reveal which case occurred.
    await bcrypt.compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
    throw ApiError.invalidCredentials();
  }

  /**
   * THE LOCK IS CHECKED BEFORE THE PASSWORD, AND THAT ORDER IS LOAD-BEARING.
   *
   * Comparing first would mean a locked account still answered differently for
   * a right guess than a wrong one - so an attacker could keep guessing THROUGH
   * the lockout and read the result each time, and the lock would stop being a
   * brake on guessing at all. `check:api` asserts this ordering for that reason.
   *
   * THE COST, STATED PLAINLY: this response is a 429 where every other failure
   * is a 401, and only a real account can be locked. **Five wrong guesses and a
   * sixth attempt therefore reveal whether an address belongs to a resident.**
   *
   * The two enumeration comments in this file and in `ApiError` are true about
   * the paths they sit on - an unknown email and a wrong password are
   * indistinguishable, and `account_status` is not revealed until the password
   * is right - and this path defeats both. That was not written down anywhere
   * until 2026-09-17.
   *
   * It is kept, and § 3.8 of the judgement log records why and what would change
   * it. The short version: you cannot have a helpful lockout message AND no
   * enumeration; hiding the lock behind a generic 401 buys the second at the
   * price of a resident who is locked out being told nothing at all.
   */
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
  // Checked only after a valid password, so THIS response cannot be used to
  // probe which accounts exist. The lockout path above can — see the note on
  // it; that is a separate, deliberate trade and not something this line fixes.
  if (data.account_status !== 'active') {
    throw ApiError.accountInactive();
  }

  // Telemetry. A failure must not deny a login that has already succeeded.
  warnIfWriteFailed(
    await db
      .from('profiles')
      .update({
        last_login_at: new Date().toISOString(),
        failed_login_count: 0,
        locked_until: null,
      })
      .eq('id', data.id),
    'Login timestamp'
  );

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

  // Logged, not thrown: this runs inside the failed-login path, and turning it
  // into a 500 would both break the "invalid credentials" response and hand a
  // caller a way to tell a real account from a missing one. But it is NOT
  // silent - if this write is failing, lockout never engages and the account is
  // open to unlimited guessing, which is the one thing nobody would notice.
  warnIfWriteFailed(
    await db
      .from('profiles')
      .update({
        failed_login_count: failedCount,
        locked_until: shouldLock
          ? new Date(Date.now() + config.auth.lockoutMinutes * 60_000).toISOString()
          : null,
      })
      .eq('id', row.id),
    'Failed-login counter - lockout will NOT engage while this is failing'
  );
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
    // The try/catch around this is deliberate and stays. The warn is new: the
    // catch swallowed a rejected insert as well as a thrown one, so a broken
    // login audit produced no signal anywhere.
    warnIfWriteFailed(
      await db.from('audit_logs').insert({
        actor_profile_id: user.profileId,
        action: 'AUTH_LOGIN',
        entity_type: 'PROFILE',
        entity_id: user.profileId,
        new_values: { role: user.role, email: user.email },
        ip_address: ipAddress ?? null,
      }),
      'Login audit'
    );
  } catch {
    // Audit write failures must not deny a legitimate login.
  }
}

export interface RegisterData {
  email: string;
  password?: string;
  fullName: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  occupation?: string;
  facebookUrl?: string;
  // No `role`. It is not the caller's to choose - see the note in the
  // register handler and the assignment below.
}

export async function register(data: RegisterData, ipAddress?: string): Promise<LoginResult> {
  const email = data.email.trim().toLowerCase();
  
  // Check if profile already exists
  const { data: existing, error: checkError } = await db
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (checkError) {
    throw ApiError.internal(`Email registration check failed: ${checkError.message}`);
  }
  if (existing) {
    throw ApiError.badRequest('An account with this email address already exists.');
  }

  // Hash password
  let passwordHash: string | null = null;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, config.auth.bcryptRounds);
  }

  // Insert profile
  const { data: newProfile, error: insertError } = await db
    .from('profiles')
    .insert({
      email,
      password_hash: passwordHash,
      full_name: data.fullName,
      phone_number: data.phoneNumber || null,
      emergency_contact_name: data.emergencyContactName || null,
      emergency_contact_phone: data.emergencyContactPhone || null,
      occupation: data.occupation || null,
      facebook_url: data.facebookUrl || null,
      /**
       * Always 'tenant'. This read `data.role || 'tenant'`, on a public
       * endpoint whose schema accepted an arbitrary role string, which made
       * `POST /api/auth/register` with `role: 'admin'` a working privilege
       * escalation for anyone who could reach the server.
       *
       * Self-registration creates a tenant. An administrator is created by an
       * administrator, and a prospect by the enquiry flow. If a future caller
       * genuinely needs to set a role, that belongs on an authenticated route
       * behind a permission - not here.
       */
      role: 'tenant',
      account_status: 'active'
    })
    .select('id, email, full_name, role, account_status')
    .single();

  if (insertError) {
    throw ApiError.internal(`Failed to create account profile: ${insertError.message}`);
  }

  const user: AuthUser = {
    profileId: newProfile.id,
    email: newProfile.email,
    fullName: newProfile.full_name,
    role: newProfile.role as StoredRole,
    accountStatus: newProfile.account_status as 'active' | 'inactive',
  };

  void recordLoginAudit(user, ipAddress);

  return {
    token: issueToken(user),
    expiresIn: config.jwt.expiresIn,
    user,
  };
}

export { SAFE_PROFILE_COLUMNS };
