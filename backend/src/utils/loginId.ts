/**
 * @file utils/loginId.ts
 * @description A tenant's first sign-in name (Sean, 2026-10-01; migration 073).
 *
 * The system no longer assumes a tenant's phone or email: the landlady moves
 * someone in with their NAME only, and is shown a login ID with the one-time
 * password to hand over in person. The tenant signs in with it, then gives their
 * own email, phone and password. It keeps working afterwards, like a username.
 *
 * Five digits after "HV-": typed on a phone keypad, read aloud without
 * ambiguity (no letters to confuse). 90,000 values for a 33-unit property, so a
 * clash is rare, and `idx_profiles_login_id` refuses one anyway; the caller
 * retries with a fresh ID. Sign-in ignores dashes, spaces and letter case
 * (`resolve_login_identifier`), so "hv48213" and "HV 48213" both work.
 */
import { randomInt } from 'node:crypto';

export function generateLoginId(): string {
  return `HV-${randomInt(10000, 100000)}`;
}

/** The index `idx_profiles_login_id` (073), for telling a clash apart from other errors. */
export const LOGIN_ID_INDEX = 'idx_profiles_login_id';
