/**
 * @file utils/generateTemporaryPassword.ts
 * @description A random one-time password for a newly onboarded tenant.
 *
 * WHY THIS EXISTS
 * ----------------------------------------------------------------------------
 * `POST /admin/tenants` used to hash the literal `'Hivelet@Tenant2026'` for
 * every tenant it onboarded — B-53 in BLOCKED_FOR_SEAN.md. That string is not
 * a secret: it sits in 21 commits of this repo's own history and was once
 * found live in a shipped `frontend/dist` bundle
 * (docs/13_AUDIT_JUDGEMENT_LOG.md §9). This replaces it with a real one-time
 * password, generated fresh per tenant and never reused, logged, or written
 * anywhere but the single API response that hands it back to the
 * administrator issuing it — `profiles.must_change_password` (migration 048)
 * is what makes it genuinely one-time, by forcing a real password before the
 * portal opens.
 *
 * `crypto.randomInt` rather than `Math.random()` — this becomes a real
 * account credential, and `Math.random()` is not cryptographically secure.
 *
 * The character set deliberately excludes 0/O and 1/l/I. This password is
 * meant to be read aloud by the landlady and typed once by a resident
 * standing in front of her, unlike a password a person chooses and only ever
 * types on their own keyboard — the ambiguous pairs are exactly where that
 * handoff fails.
 */
import crypto from 'node:crypto';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL = LETTERS + DIGITS;

/**
 * Comfortably past `passwordSchema`'s floor (10 chars, a letter, a digit —
 * `backend/src/routes/auth.ts`) so a temporary password is never rejected by
 * the same policy it exists to satisfy.
 */
const LENGTH = 12;

function pick(charset: string): string {
  return charset[crypto.randomInt(charset.length)];
}

export function generateTemporaryPassword(): string {
  // One guaranteed letter and one guaranteed digit, not left to chance — the
  // charset makes either omission vanishingly unlikely at 12 characters, but
  // "vanishingly unlikely" is not the same guarantee `passwordSchema` needs.
  const chars = [pick(LETTERS), pick(DIGITS)];
  while (chars.length < LENGTH) chars.push(pick(ALL));

  // Fisher-Yates, so the guaranteed letter and digit are not always the
  // first two characters — a password with a predictable shape is a weaker
  // password even when every character in it was drawn randomly.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
