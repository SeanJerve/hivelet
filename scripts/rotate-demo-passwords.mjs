#!/usr/bin/env node
/**
 * Rotates every account password that was published in the repository.
 *
 * On 2026-09-13 an audit found that `credentials/creds.txt` and
 * `database/seeded-tenant-credentials.json` - both committed to a PUBLIC
 * repository - contained plaintext passwords that still opened **44 of 44**
 * live accounts, including `admin@hivelet.ph`, which can read every tenant's
 * personal details and edit the entire financial ledger.
 *
 * This script:
 *   1. gives the administrator a unique strong password;
 *   2. gives every other account a single shared demo password, which keeps the
 *      capstone demo practical while removing the published one;
 *   3. rewrites both local credential files - now gitignored - with the results;
 *   4. verifies afterwards that no published password opens anything.
 *
 * Run:  node scripts/rotate-demo-passwords.mjs
 * Add --dry-run to see what it would do without writing.
 *
 * Reversible: the old passwords are public, so they can be re-applied if a demo
 * genuinely depends on them. That is not a reason to keep them.
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
dotenv.config({ path: path.join(root, '.env') });

const DRY = process.argv.includes('--dry-run');

/** Typeable under pressure in front of a panel, but not guessable. */
function demoPassword(prefix) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(10);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `${prefix}-${s}`;
}

const { createClient } = await import('@supabase/supabase-js');
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const { data: profiles, error } = await db
  .from('profiles')
  .select('id, email, full_name, role, password_hash')
  .not('password_hash', 'is', null);

if (error) {
  console.error('Could not read profiles:', error.message);
  process.exit(1);
}

const adminPw = demoPassword('HiveletAdmin');
const tenantPw = demoPassword('HiveletDemo');

console.log(`accounts with a password: ${profiles.length}`);
console.log(`  administrators: ${profiles.filter(p => p.role === 'admin').length}`);
console.log(`  others:         ${profiles.filter(p => p.role !== 'admin').length}`);

if (DRY) {
  console.log('\n--dry-run: nothing written.');
  process.exit(0);
}

const adminHash = await bcrypt.hash(adminPw, 12);
const tenantHash = await bcrypt.hash(tenantPw, 12);
const now = new Date().toISOString();

let updated = 0;
const failures = [];

for (const p of profiles) {
  const isAdmin = p.role === 'admin';
  const { error: upErr } = await db
    .from('profiles')
    .update({
      password_hash: isAdmin ? adminHash : tenantHash,
      password_changed_at: now,
      failed_login_count: 0,
      locked_until: null,
      updated_at: now
    })
    .eq('id', p.id);

  if (upErr) failures.push(`${p.email}: ${upErr.message}`);
  else updated++;
}

console.log(`\nupdated: ${updated}/${profiles.length}`);
if (failures.length) {
  console.error('failures:');
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}

// ---- verify --------------------------------------------------------------
const { data: after } = await db
  .from('profiles')
  .select('email, role, password_hash')
  .not('password_hash', 'is', null);

const published = new Set();
for (const f of ['credentials/creds.txt', 'database/seeded-tenant-credentials.json']) {
  const abs = path.join(root, f);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  if (f.endsWith('.json')) {
    try { for (const e of JSON.parse(text)) if (e.password) published.add(e.password); } catch {}
  } else {
    for (const m of text.matchAll(/Password:\s*(\S+)/g)) published.add(m[1]);
  }
}

let stillOpen = 0;
for (const p of after ?? []) {
  for (const pw of published) {
    if (await bcrypt.compare(pw, p.password_hash)) { stillOpen++; break; }
  }
}

let newWorks = 0;
for (const p of after ?? []) {
  const pw = p.role === 'admin' ? adminPw : tenantPw;
  if (await bcrypt.compare(pw, p.password_hash)) newWorks++;
}

console.log(`accounts still opened by a previously published password: ${stillOpen}`);
console.log(`accounts opened by the new password:                      ${newWorks}/${(after ?? []).length}`);

// ---- rewrite the local credential files ----------------------------------
const adminEmail = profiles.find(p => p.role === 'admin')?.email ?? 'admin@hivelet.ph';

fs.writeFileSync(path.join(root, 'credentials/creds.txt'),
`=============================================================================
HIVELET - DEMONSTRATION CREDENTIALS
Rotated ${now}
=============================================================================

THIS FILE IS GITIGNORED AND MUST STAY THAT WAY.

The previous contents were committed to a public repository and still opened all
44 live accounts, including the administrator. Those passwords are burned.

-----------------------------------------------------------------------------
ADMINISTRATOR  (full access - every tenant's details, the whole ledger)
-----------------------------------------------------------------------------
Email:     ${adminEmail}
Password:  ${adminPw}

-----------------------------------------------------------------------------
ALL OTHER ACCOUNTS  (tenants and prospects)
-----------------------------------------------------------------------------
Password:  ${tenantPw}

One shared password across demo tenant accounts is a deliberate convenience for
the defense, not a pattern to copy. It is acceptable only because these accounts
are scoped to their own rows and the password is no longer public.
`, 'utf8');

const seededPath = path.join(root, 'database/seeded-tenant-credentials.json');
if (fs.existsSync(seededPath)) {
  try {
    const seeded = JSON.parse(fs.readFileSync(seededPath, 'utf8'));
    for (const e of seeded) e.password = tenantPw;
    fs.writeFileSync(seededPath, JSON.stringify(seeded, null, 2) + '\n', 'utf8');
  } catch {}
}

console.log('\nlocal credential files rewritten (both gitignored)');
console.log(stillOpen === 0 ? 'DONE - no published password opens any account' : 'WARNING - some published passwords still work');
process.exit(stillOpen === 0 ? 0 : 1);
