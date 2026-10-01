/**
 * @file services/contactDetails.ts
 * @description Who owns what on a tenant's profile, and the one rule for a
 *   placeholder email.
 *
 * THE SPLIT (Sean, 2026-09-30)
 * ----------------------------
 * A tenant owns their sign-in and contact details: email, phone number and
 * password. They change them themselves, any time (My details, and the first
 * sign-in step). The landlady owns their NAME, which is what her records and
 * receipts carry; a tenant sees it and cannot change it.
 *
 * So the administrator no longer edits an existing tenant's email or phone
 * (`PATCH /admin/tenants/:id` refuses a change). She still sets the phone at
 * move-in, because it is the tenant's first sign-in identifier, and may leave
 * the email blank.
 *
 * PLACEHOLDER EMAILS
 * ------------------
 * Migration 067 gave every active tenant an email that can never receive mail,
 * `tenant-<10 hex of the id>@hivelet.invalid`, and a move-in with no email gets
 * one too. `.invalid` is reserved by RFC 2606 for exactly this: it cannot be
 * registered and no mail is ever delivered to it. A tenant holding one is asked
 * for a real address at sign-in (`mustCompleteContact`).
 *
 * THIS FILE IS THE ONE COPY OF THAT RULE ON THE SERVER. Its twin for the pages
 * is `frontend/src/lib/contactDetails.ts`; the two must agree, and the domain
 * list below is written the same way in both.
 */
import { z } from 'zod';
import { db } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { likeLiteral } from '../utils/likeLiteral.js';
import { uniqueViolationOn } from '../utils/checkedWrite.js';

/** The domain migration 067 and a blank-email move-in write. */
export const PLACEHOLDER_EMAIL_DOMAIN = 'hivelet.invalid';

/**
 * Domains that can never be a real mailbox: the four reserved top-level names
 * (RFC 2606 / RFC 6761) and the three reserved example domains.
 */
const RESERVED_EMAIL_DOMAIN = /(^|\.)(invalid|test|example|localhost)$|^example\.(com|net|org)$/i;

/**
 * True when there is no email anyone could actually write to: nothing on file,
 * something without an @, or a reserved domain such as the migration's own.
 *
 * Never show such a value to anyone as if it were an address. Say it is not set
 * yet instead.
 */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  const value = String(email ?? '').trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (!value || at < 1) return true;
  return RESERVED_EMAIL_DOMAIN.test(value.slice(at + 1));
}

/**
 * The placeholder for one profile. Written the same way as migration 067's SQL,
 * `'tenant-' || left(replace(id::text, '-', ''), 10) || '@hivelet.invalid'`, so
 * a row the migration wrote and a row a move-in wrote look alike.
 * Unique because the id is: `idx_profiles_email_lower` would refuse a clash.
 */
export function placeholderEmailFor(profileId: string): string {
  return `tenant-${profileId.replace(/-/g, '').slice(0, 10).toLowerCase()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

/**
 * Whether a tenant must give a real email and confirm their phone before using
 * the portal. Always while they are on a starting password (the first sign-in
 * asks for all three together), and whenever the email is a placeholder.
 * An administrator is never asked: her address is her own sign-in.
 */
export function mustCompleteContact(
  user: {
    role: string;
    email: string | null;
    mustChangePassword: boolean;
  },
  /**
   * The phone on file, when the caller read it (`undefined` = not read). Since
   * 073 a tenant may have none - they sign in first with a login ID - and is
   * asked for their own at sign-in like the email (Sean, 2026-10-01).
   */
  phoneNumber?: string | null
): boolean {
  return (
    user.role === 'tenant' &&
    (user.mustChangePassword || isPlaceholderEmail(user.email) || phoneNumber === null || phoneNumber === '')
  );
}

/**
 * A Philippine mobile number: 09XX XXX XXXX, or the same as +63 9XX XXX XXXX.
 *
 * FORMAT ONLY. It folds the digits the way `normalize_ph_phone()` in the
 * database does (63 + ten digits becomes 0 + ten digits), to decide whether
 * what was typed is a mobile number at all. Whether the number is already
 * someone's sign-in is asked of the database itself, through
 * `resolve_login_identifier()` - see `assertContactAvailable` - so the
 * uniqueness rule still lives in one place: the index it is built on.
 * Every tenant phone on file passed this on 2026-09-30 (34 of 34, read-only).
 */
export function isPhMobile(raw: string): boolean {
  return /^09\d{9}$/.test(phoneDigits(raw));
}

/** The digits of a number, 63 folded to 0: "0917-555-2231" and "+63 917 555 2231" read alike. */
export function phoneDigits(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return /^63\d{10}$/.test(digits) ? `0${digits.slice(2)}` : digits;
}

/** An email a tenant can be written to. Lower-cased, as every stored address is. */
export const contactEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(255, 'That email address is too long.')
  .email('Enter a full email address, for example you@email.com.')
  .refine((e) => !isPlaceholderEmail(e), 'Enter an email address you can receive mail at.');

/** A phone a tenant can sign in with. Stored as typed, checked as a PH mobile. */
export const contactPhone = z
  .string()
  .trim()
  .max(50, 'That phone number is too long.')
  .refine(isPhMobile, 'Enter a Philippine mobile number, for example 0917 123 4567.');

export const EMAIL_TAKEN =
  'That email address is already used by another account here. Use a different one.';
export const PHONE_TAKEN =
  'That phone number already signs someone else in. Use a different number, or ask the landlady.';

/**
 * Refuses, with a message for the person typing, an email or phone that already
 * belongs to someone else. Checked before any write, so nothing half-changes.
 *
 * Email: `idx_profiles_email_lower` is UNIQUE on lower(email) across ALL
 * profiles (a prospect's enquiry address included), so the check is too.
 * Phone: `idx_profiles_phone_login` is UNIQUE on normalize_ph_phone(phone)
 * among profiles holding a password, which is exactly what
 * `resolve_login_identifier()` searches - the function sign-in itself uses.
 *
 * The indexes remain the real guard against two people saving at once;
 * `contactClash` below turns losing that race into the same messages.
 */
export async function assertContactAvailable(
  profileId: string,
  contact: { email?: string | null; phone_number?: string | null }
): Promise<void> {
  if (contact.email) {
    const { data, error } = await db
      .from('profiles')
      .select('id')
      .ilike('email', likeLiteral(contact.email))
      .neq('id', profileId)
      .limit(1);
    if (error) throw ApiError.internal(error.message);
    if (data && data.length > 0) {
      throw new ApiError(409, 'CONFLICT', EMAIL_TAKEN, { email: [EMAIL_TAKEN] });
    }
  }

  if (contact.phone_number) {
    const { data, error } = await db.rpc('resolve_login_identifier', {
      p_identifier: contact.phone_number,
    });
    if (error) throw ApiError.internal(error.message);
    const owners = (Array.isArray(data) ? data : []) as Array<{ id: string }>;
    if (owners.some((o) => o.id !== profileId)) {
      throw new ApiError(409, 'CONFLICT', PHONE_TAKEN, { phone_number: [PHONE_TAKEN] });
    }
  }
}

/** A unique-index refusal on a profile write, as the message `assertContactAvailable` gives. */
export function contactClash(err: { code?: string; message?: string } | null | undefined): ApiError | null {
  if (uniqueViolationOn(err, 'idx_profiles_email_lower')) {
    return new ApiError(409, 'CONFLICT', EMAIL_TAKEN, { email: [EMAIL_TAKEN] });
  }
  if (uniqueViolationOn(err, 'idx_profiles_phone_login')) {
    return new ApiError(409, 'CONFLICT', PHONE_TAKEN, { phone_number: [PHONE_TAKEN] });
  }
  return null;
}

/**
 * What a tenant may send about themselves, for both self-service routes
 * (`PUT /tenant/my-profile`, `PATCH /auth/me`). Email and phone can be changed
 * but not cleared: the phone is what they sign in with, and a cleared email
 * would only become a placeholder again. Lengths match the column widths.
 */
export const ownProfileUpdateSchema = z.object({
  email: contactEmail.optional(),
  phone_number: contactPhone.optional(),
  emergency_contact_name: z.string().trim().max(255).nullable().optional(),
  emergency_contact_phone: z.string().trim().max(50).nullable().optional(),
  occupation: z.string().trim().max(100).nullable().optional(),
  facebook_url: z.string().trim().max(2048).nullable().optional(),
});

export const NAME_IS_THE_LANDLADYS =
  'Your name is kept by the landlady on your tenancy record. Ask her if it needs changing.';

/**
 * Refuses a request that tries to change the caller's own name. Zod would drop
 * the key silently, and a silent drop answered 200 is how a tenant was once
 * shown "saved" for a name that never changed (TenantProfileView.vue).
 */
export function refuseOwnNameChange(body: unknown): void {
  if (body && typeof body === 'object' && ('full_name' in body || 'fullName' in body)) {
    throw ApiError.forbidden(NAME_IS_THE_LANDLADYS);
  }
}

/** The before-values of just the fields being changed, for an audit row. */
export function pickChanged(
  before: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    if (key in before) out[key] = before[key];
  }
  return out;
}
