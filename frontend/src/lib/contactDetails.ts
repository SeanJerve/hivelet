/**
 * @file lib/contactDetails.ts
 * @description Who owns what on a tenant's record, and the one rule the pages
 *   use for a placeholder email.
 *
 * Sean, 2026-09-30: a tenant owns their email, phone number and password and
 * changes them themselves (My details, and the first sign-in step). The
 * landlady owns their name. So the admin tenant dialog shows email and phone
 * read-only, and My details shows the name read-only.
 *
 * Migration 067 gave every active tenant an email that can never receive mail,
 * `tenant-...@hivelet.invalid`, and a move-in with no email gets one too.
 * NEVER SHOW ONE AS AN ADDRESS. `realEmail()` turns it into '' so every screen
 * says "Not set yet" instead.
 *
 * THE SERVER'S COPY OF THIS RULE is `backend/src/services/contactDetails.ts`.
 * The reserved-domain pattern below is written identically there; change both
 * or neither. The server decides - this only lets a page agree with it before
 * anything is sent.
 */
/** The four reserved top-level names and the three reserved example domains. */
const RESERVED_EMAIL_DOMAIN = /(^|\.)(invalid|test|example|localhost)$|^example\.(com|net|org)$/i;

/** True when there is no email anyone could write to: none, or a placeholder. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  const value = String(email ?? '').trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (!value || at < 1) return true;
  return RESERVED_EMAIL_DOMAIN.test(value.slice(at + 1));
}

/** The email if it is a real one, otherwise ''. Use this wherever an email is shown. */
export function realEmail(email: string | null | undefined): string {
  return isPlaceholderEmail(email) ? '' : String(email ?? '').trim();
}

/**
 * The digits of a number with 63 folded to 0, the way the database's
 * `normalize_ph_phone()` reads it: "0917-555-2231" and "+63 917 555 2231" alike.
 */
export function phoneDigits(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return /^63\d{10}$/.test(digits) ? `0${digits.slice(2)}` : digits;
}

/** A Philippine mobile number, 09XX XXX XXXX. The server checks the same. */
export function isPhMobile(raw: string | null | undefined): boolean {
  return /^09\d{9}$/.test(phoneDigits(raw));
}

/** The message for a sign-in phone field, or '' when it is fine. Mirrors `contactPhone`. */
/** An emergency contact's number: blank, or a Philippine mobile (the server's `emergencyPhone`). */
export function emergencyPhoneProblem(raw: string): string {
  if (!raw.trim()) return '';
  return isPhMobile(raw) ? '' : 'Enter a Philippine mobile number, for example 0917 123 4567.';
}

export function phoneProblem(raw: string): string {
  if (!raw.trim()) return 'Enter your mobile number. It is what you sign in with.';
  if (!isPhMobile(raw)) return 'Enter a Philippine mobile number, for example 0917 123 4567.';
  return '';
}
