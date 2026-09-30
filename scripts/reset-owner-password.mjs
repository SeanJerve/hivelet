#!/usr/bin/env node
/**
 * Gives the administrator (the owner) a new one-time password, for the day she
 * cannot sign in.
 *
 * WHY (2026-09-30, the testing morning)
 * -------------------------------------
 * A tenant who forgets a password asks her, and she issues a new one from
 * Tenants > Edit > Reset password (B-83). She is the only administrator, so
 * there is no screen above hers to do the same for her. Email and SMS reset
 * were ruled out on purpose: many tenants have no email, SMS needs a paid
 * provider, and everyone concerned sees the owner in person. This is the
 * team's half of that arrangement.
 *
 * WHAT IT DOES
 * ------------
 * Without `--confirm` it only reads: it finds the one administrator account and
 * says what it would do. With `--confirm` it gives that account a new starting
 * password, the same shape as the tenants' slips, and:
 *   - `must_change_password`, so she chooses her own at the next sign-in;
 *   - `password_changed_at` now, which ends every session she has open;
 *   - the failed-login count and any lock cleared;
 *   - one `AUTH_PASSWORD_CHANGE` row in the audit log, without the password,
 *     so her Activity page says the team reset it and when.
 * The password is printed once, here, and written nowhere else. Give it to her
 * in person.
 *
 * It is a write to the live database: run `npm run backup` first, and run it
 * yourself (see memory: live DB writes need Sean). `credentials/creds.txt`
 * keeps the old administrator password; `check:api` will not sign in until the
 * file is updated with hers, which is expected.
 *
 *   node scripts/reset-owner-password.mjs            # read-only: what it would do
 *   node scripts/reset-owner-password.mjs --confirm  # reset it
 */
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
dotenv.config({ path: path.join(root, '.env') });

const CONFIRM = process.argv.includes('--confirm');

/** Same alphabet and shape as `reset-tenant-accounts.mjs`: no 0/O, 1/I/L, read aloud easily. */
function startingPassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `HIVE-${s.slice(0, 4)}-${s.slice(4)}`;
}

const { createClient } = await import('@supabase/supabase-js');
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const { data: admins, error } = await db
  .from('profiles')
  .select('id, full_name, email, phone_number, account_status, must_change_password, locked_until')
  .eq('role', 'admin');
if (error) {
  console.error('Could not read the administrator account:', error.message);
  process.exit(1);
}
if ((admins ?? []).length !== 1) {
  console.error(`Expected exactly one administrator account, found ${admins?.length ?? 0}. Nothing written.`);
  process.exit(1);
}
const admin = admins[0];

console.log(`administrator:        ${admin.full_name} (${admin.email ?? admin.phone_number ?? 'no sign-in name'})`);
console.log(`account status:       ${admin.account_status}`);
console.log(`locked until:         ${admin.locked_until ?? 'not locked'}`);
console.log(`must change password: ${admin.must_change_password ? 'yes' : 'no'}`);

if (!CONFIRM) {
  console.log('\nRead-only: nothing written. Run `npm run backup`, then add --confirm to reset this account.');
  process.exit(0);
}

const password = startingPassword();
const now = new Date().toISOString();
const { data: updated, error: upErr } = await db
  .from('profiles')
  .update({
    password_hash: await bcrypt.hash(password, 12),
    must_change_password: true,
    password_changed_at: now,
    failed_login_count: 0,
    locked_until: null,
    updated_at: now,
  })
  .eq('id', admin.id)
  .eq('role', 'admin')
  .select('id, password_hash, must_change_password, failed_login_count, locked_until')
  .maybeSingle();
if (upErr || !updated) {
  console.error('The reset was not written:', upErr?.message ?? 'no row matched. Nothing changed.');
  process.exit(1);
}

const opens = await bcrypt.compare(password, updated.password_hash);
const gated = updated.must_change_password && !updated.failed_login_count && !updated.locked_until;

const { error: auditErr } = await db.from('audit_logs').insert({
  actor_profile_id: null,
  action: 'AUTH_PASSWORD_CHANGE',
  entity_type: 'PROFILE',
  entity_id: admin.id,
  new_values: {
    note:
      'Starting password reset by the Hivelet team (scripts/reset-owner-password.mjs) because the ' +
      'administrator could not sign in. She must choose a new password at next sign-in; every ' +
      'earlier session was ended.',
  },
});

console.log(`\nnew password opens the account:     ${opens ? 'yes' : 'NO'}`);
console.log(`must change it, not locked:         ${gated ? 'yes' : 'NO'}`);
console.log(`written to the audit log:           ${auditErr ? `NO (${auditErr.message})` : 'yes'}`);
console.log('\nOne-time password (shown once, give it to her in person):');
console.log(`\n    ${password}\n`);
console.log('She signs in with it at https://hivelet.vercel.app/login and is asked to choose her own.');
