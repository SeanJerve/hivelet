#!/usr/bin/env node
/**
 * Resets every TENANT account before real tenants start using the system.
 * The administrator is never touched.
 *
 * WHY (2026-09-29, before the first tenant/admin acceptance test)
 * ---------------------------------------------------------------
 * Since B-49 (2026-09-21) every tenant account shared ONE demo password from
 * `credentials/creds.txt`, and the team had signed in to several of them while
 * testing. Handing that password to a real tenant would have handed them the
 * key to all 32 accounts: anyone holding it and a neighbour's phone number
 * could sign in as the neighbour and set the neighbour's password first.
 * Forcing a change on first sign-in does not close that window by itself; a
 * password only one person knows does.
 *
 * So, for every profile with role = 'tenant':
 *   1. a fresh random starting password, different for every tenant;
 *   2. `must_change_password = true` - migration 048's gate: the portal and the
 *      whole /tenant API refuse the account until the tenant sets their own
 *      (`requirePasswordCurrent`, backend/src/middleware/auth.ts);
 *   3. `password_changed_at = now()` - every token issued before this moment
 *      stops working (`resolveAuthUser`), which signs out every session the
 *      team left open while testing;
 *   4. `failed_login_count = 0`, `locked_until = null`.
 *
 * The starting passwords are written ONLY to `credentials/` (gitignored):
 *   tenant-starting-passwords.html   one slip per tenant, to print, cut and
 *                                    hand over in person
 *   tenant-starting-passwords.csv    the team's own record of who got which
 *
 * A password never belongs in a migration (a migration is committed), which is
 * why this is a script like `rotate-demo-passwords.mjs` and not a numbered
 * migration. Take `npm run backup` first: the backup holds the old hashes, so
 * the previous state is recoverable.
 *
 * Run:   node scripts/reset-tenant-accounts.mjs --dry-run   (reads only)
 *        node scripts/reset-tenant-accounts.mjs              (writes, all tenants)
 *        node scripts/reset-tenant-accounts.mjs --only 09171234567
 *             one tenant, by phone or email: for a tenant who lost the slip or
 *             forgot the password they chose. There is no "forgot password" in
 *             the app yet (B-83), so this is the owner's only way to help them.
 *             Writes `tenant-starting-password-<stamp>.html` beside the others,
 *             so an earlier batch of slips is never overwritten.
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
const onlyAt = process.argv.indexOf('--only');
const ONLY = onlyAt > -1 ? String(process.argv[onlyAt + 1] ?? '').trim().toLowerCase() : null;
if (onlyAt > -1 && (!ONLY || ONLY.startsWith('--'))) {
  console.error('--only needs a phone number or email address.');
  process.exit(1);
}
/** Same folding as the database's normalize_ph_phone(): 0917..., +63917..., 63917... are one number. */
const phoneKey = (v) => String(v ?? '').replace(/\D/g, '').replace(/^(63|0)/, '');
const SITE = 'https://hivelet.vercel.app/login';

/**
 * Typed once, on a phone, by someone reading it off paper: no 0/O, 1/I/l, and
 * dashes every four. 8 random symbols from 31 is about 40 bits, ample for a
 * password that must be replaced at its first use and is limited to five tries.
 */
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

const { data: allTenants, error } = await db
  .from('profiles')
  .select('id, full_name, email, phone_number, role, account_status')
  .eq('role', 'tenant')
  .order('full_name');
if (error) {
  console.error('Could not read profiles:', error.message);
  process.exit(1);
}
const tenants = ONLY
  ? allTenants.filter(
      (t) => t.email?.toLowerCase() === ONLY || (phoneKey(ONLY) && phoneKey(t.phone_number) === phoneKey(ONLY))
    )
  : allTenants;
if (ONLY && tenants.length !== 1) {
  console.error(`--only ${ONLY}: ${tenants.length} tenant accounts match. Nothing written.`);
  process.exit(1);
}

const { data: admins, error: adminErr } = await db
  .from('profiles')
  .select('id, password_hash, password_changed_at')
  .eq('role', 'admin');
if (adminErr) {
  console.error('Could not read the administrator:', adminErr.message);
  process.exit(1);
}

const { data: assignments, error: asgErr } = await db
  .from('room_assignments')
  .select('tenant_profile_id, rooms:room_id (room_number)')
  .eq('is_active', true);
if (asgErr) {
  console.error('Could not read room assignments:', asgErr.message);
  process.exit(1);
}
const unitsOf = new Map();
for (const a of assignments ?? []) {
  const list = unitsOf.get(a.tenant_profile_id) ?? [];
  if (a.rooms?.room_number) list.push(a.rooms.room_number);
  unitsOf.set(a.tenant_profile_id, list);
}

console.log(`tenant accounts:        ${tenants.length}`);
console.log(`  active:               ${tenants.filter((t) => t.account_status === 'active').length}`);
console.log(`  with a current unit:  ${tenants.filter((t) => unitsOf.has(t.id)).length}`);
console.log(`administrator accounts: ${admins.length} (not touched)`);

if (DRY) {
  console.log('\n--dry-run: nothing written.');
  process.exit(0);
}

const now = new Date().toISOString();
const issued = [];
const failures = [];

for (const t of tenants) {
  const pw = startingPassword();
  const hash = await bcrypt.hash(pw, 12);
  const { error: upErr } = await db
    .from('profiles')
    .update({
      password_hash: hash,
      must_change_password: true,
      password_changed_at: now,
      failed_login_count: 0,
      locked_until: null,
      updated_at: now,
    })
    .eq('id', t.id)
    .eq('role', 'tenant');
  if (upErr) failures.push(`${t.full_name}: ${upErr.message}`);
  else issued.push({ ...t, units: (unitsOf.get(t.id) ?? []).sort().join(', '), password: pw });
}

console.log(`\nreset: ${issued.length}/${tenants.length}`);
if (failures.length) {
  console.error('failures:');
  for (const f of failures) console.error('  ' + f);
}

// ---- verify ---------------------------------------------------------------
const { data: after } = await db
  .from('profiles')
  .select('id, role, password_hash, must_change_password, failed_login_count, locked_until')
  .in('role', ['tenant', 'admin']);
const byId = new Map((after ?? []).map((p) => [p.id, p]));
let opens = 0;
let gated = 0;
for (const t of issued) {
  const row = byId.get(t.id);
  if (row && (await bcrypt.compare(t.password, row.password_hash))) opens++;
  if (row?.must_change_password && !row.failed_login_count && !row.locked_until) gated++;
}
const adminUntouched = admins.every((a) => byId.get(a.id)?.password_hash === a.password_hash);
console.log(`starting password opens its own account: ${opens}/${issued.length}`);
console.log(`forced to change + unlocked:             ${gated}/${issued.length}`);
console.log(`administrator unchanged:                 ${adminUntouched ? 'yes' : 'NO'}`);

// ---- hand-out files (gitignored) -------------------------------------------
const outDir = path.join(root, 'credentials');
fs.mkdirSync(outDir, { recursive: true });

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvPath = path.join(outDir, 'tenant-starting-passwords.csv');
const csvRows = issued.map((t) => [t.full_name, t.units, t.phone_number, t.email, t.password, now, '', ''].map(csvCell).join(','));
if (ONLY && fs.existsSync(csvPath)) {
  // Appended, never rewritten: the record of the first batch stays whole.
  fs.appendFileSync(csvPath, csvRows.join('\n') + '\n', 'utf8');
} else {
  fs.writeFileSync(
    csvPath,
    ['name,units,phone,email,starting_password,issued_at,handed_over_by,handed_over_on'].concat(csvRows).join('\n') + '\n',
    'utf8'
  );
}
const slipFile = ONLY
  ? `tenant-starting-password-${now.replace(/[:.]/g, '-')}.html`
  : 'tenant-starting-passwords.html';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const slips = issued
  .map(
    (t) => `<section class="slip">
  <h2>Hivelet sign-in: ${esc(t.full_name)}</h2>
  <p class="unit">Unit ${esc(t.units || 'not assigned')}</p>
  <table>
    <tr><th>Website</th><td>${SITE}</td></tr>
    <tr><th>Sign in with</th><td>${esc(t.phone_number)}</td></tr>
    <tr><th>Starting password</th><td class="pw">${esc(t.password)}</td></tr>
  </table>
  <ol>
    <li>Open the website and sign in with your phone number and the starting password above.</li>
    <li>You will be asked straight away for your own email address and your own password: at least 10 characters, with a letter and a number. You can change both, and your phone number, any time under My details.</li>
    <li>This starting password stops working once you change it. Keep this slip private, and tear it up afterwards.</li>
    <li>Five wrong tries locks the account for 15 minutes. Ask the owner if you are stuck.</li>
  </ol>
</section>`
  )
  .join('\n');
fs.writeFileSync(
  path.join(outDir, slipFile),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Tenant starting passwords (PRIVATE)</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:16px;color:#111;background:#fff}
.note{border:2px solid #b91c1c;padding:10px;margin-bottom:16px}
.slip{border:1px dashed #555;padding:12px 16px;margin:0 0 14px;page-break-inside:avoid}
h2{font-size:16px;margin:0 0 2px}.unit{margin:0 0 8px;color:#444}
table{border-collapse:collapse;margin-bottom:6px}th{text-align:left;padding:3px 12px 3px 0;color:#444;font-weight:600;vertical-align:top}
td span{color:#666}.pw{font:700 18px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.06em}
ol{margin:6px 0 0 18px;padding:0}@media print{.note{display:none}}
</style></head><body>
<p class="note"><b>PRIVATE. Never commit, email or post this file.</b> Issued ${now}. Print, cut along the dashed lines, and hand each slip to that tenant in person.
This note does not print.</p>
${slips}
</body></html>
`,
  'utf8'
);

// check:api signs in as the seeded tenant. Keep its local copy in step so a run
// here meets PASSWORD_CHANGE_REQUIRED instead of charging a real tenant's
// failed-login allowance with the retired shared password.
const seededPath = path.join(root, 'database/seeded-tenant-credentials.json');
if (fs.existsSync(seededPath)) {
  try {
    const seeded = JSON.parse(fs.readFileSync(seededPath, 'utf8'));
    for (const e of seeded) {
      const hit = issued.find((t) => t.email?.toLowerCase() === String(e.email ?? '').toLowerCase());
      if (hit) e.password = hit.password;
    }
    fs.writeFileSync(seededPath, JSON.stringify(seeded, null, 2) + '\n', 'utf8');
  } catch {}
}

console.log(`\nwritten (gitignored): credentials/${slipFile}, credentials/tenant-starting-passwords.csv`);
const ok = !failures.length && opens === issued.length && gated === issued.length && adminUntouched;
console.log(ok ? 'DONE' : 'CHECK THE LINES ABOVE');
process.exit(ok ? 0 : 1);
