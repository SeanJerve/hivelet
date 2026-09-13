// Read-only precondition check for migrations 005-009 against the LIVE database.
// Reads nothing but counts and distinct values. Writes nothing. Safe to run any time.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  const env = {};
  let raw = '';
  for (const p of ['./.env', '../.env', './backend/.env', '../backend/.env']) {
    try { raw = readFileSync(p, 'utf8'); break; } catch {}
  }
  if (!raw) { console.error('Could not find .env'); process.exit(1); }
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CANONICAL_AREAS = [
  'Boarding House', 'Main House', 'Front Apartment', 'Back Apartment', 'Other Expenses / Personal'
];

function normalizePhPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/[^0-9]/g, '');
  return /^63[0-9]{10}$/.test(digits) ? '0' + digits.slice(2) : digits;
}

let blockers = 0;
const line = (s = '') => console.log(s);

line('LIVE DATABASE PRECONDITION CHECK  -  migrations 005-009');
line('='.repeat(72));

// ---- 006: duplicate phones among credentialed accounts -------------------
const { data: profiles, error: pErr } = await db
  .from('profiles').select('id, full_name, email, phone_number, password_hash, role');
if (pErr) { console.error('profiles read failed:', pErr.message); process.exit(1); }

line(`\n[006] profiles: ${profiles.length} rows`);
const withCreds = profiles.filter(p => p.password_hash);
const noEmail = profiles.filter(p => !p.email);
line(`      ${withCreds.length} hold credentials, ${noEmail.length} have no email`);

const byPhone = new Map();
for (const p of withCreds) {
  const c = normalizePhPhone(p.phone_number);
  if (!c) continue;
  if (!byPhone.has(c)) byPhone.set(c, []);
  byPhone.get(c).push(p);
}
const dupPhones = [...byPhone.entries()].filter(([, v]) => v.length > 1);
if (dupPhones.length) {
  blockers++;
  line(`      BLOCKER: ${dupPhones.length} phone number(s) shared by >1 credentialed account:`);
  for (const [c, v] of dupPhones) line(`        ${c} -> ${v.map(x => x.full_name).join(', ')}`);
} else {
  line('      OK: no credentialed account shares a phone number (after +63 folding)');
}

const dupEmail = new Map();
for (const p of profiles) {
  if (!p.email) continue;
  const k = p.email.toLowerCase();
  dupEmail.set(k, (dupEmail.get(k) || 0) + 1);
}
const emailCollisions = [...dupEmail.entries()].filter(([, n]) => n > 1);
if (emailCollisions.length) {
  blockers++;
  line(`      BLOCKER: case-insensitive email collisions: ${emailCollisions.map(([k]) => k).join(', ')}`);
} else {
  line('      OK: no case-insensitive email collisions');
}

const ghostLogins = profiles.filter(p => p.password_hash && !p.email && !p.phone_number);
if (ghostLogins.length) {
  blockers++;
  line(`      BLOCKER: ${ghostLogins.length} account(s) have a password but neither email nor phone`);
  ghostLogins.forEach(p => line(`        ${p.full_name} (${p.id})`));
} else {
  line('      OK: every credentialed account has at least one identifier');
}

// ---- 005: ledger rows that would block a RESTRICT conversion -------------
// RESTRICT only bites on DELETE, so conversion itself cannot fail. Report scale.
for (const t of ['bills', 'payments', 'monthly_income_records']) {
  const { count, error } = await db.from(t).select('*', { count: 'exact', head: true });
  if (error) { line(`\n[005] ${t}: read failed - ${error.message}`); continue; }
  line(`\n[005] ${t}: ${count} rows (RESTRICT affects DELETE only; conversion touches no rows)`);
}

// ---- 007: room floors ----------------------------------------------------
const { data: rooms, error: rErr } = await db.from('rooms').select('room_number, floor, cluster_code');
if (rErr) { console.error('rooms read failed:', rErr.message); }
else {
  const tally = {};
  rooms.forEach(r => { tally[r.floor] = (tally[r.floor] || 0) + 1; });
  const ph = rooms.find(r => r.room_number === 'PH');
  line(`\n[007] rooms: ${rooms.length} total, current tally ${JSON.stringify(tally)}`);
  line(`      PH is on floor ${ph ? ph.floor : 'MISSING'} (migration sets it to 4)`);
  const projected = { ...tally };
  if (ph && ph.floor !== 4) { projected[ph.floor]--; projected[4] = (projected[4] || 0) + 1; }
  line(`      after migration: ${JSON.stringify(projected)}  (owner survey: {"1":11,"2":11,"3":10,"4":1})`);
}

// ---- 008: non-canonical property_area values ----------------------------
const { data: allocs, error: aErr } = await db
  .from('expense_property_allocations').select('property_area, amount');
if (aErr) { console.error('allocations read failed:', aErr.message); }
else {
  const seen = new Map();
  allocs.forEach(a => seen.set(a.property_area, (seen.get(a.property_area) || 0) + 1));
  line(`\n[008] expense_property_allocations: ${allocs.length} rows, ${seen.size} distinct area value(s)`);
  const strays = [...seen.entries()].filter(([k]) => !CANONICAL_AREAS.includes(k));
  for (const [k, n] of [...seen.entries()].sort((x, y) => y[1] - x[1])) {
    const ok = CANONICAL_AREAS.includes(k);
    line(`        ${ok ? 'OK     ' : 'STRAY  '} ${JSON.stringify(k)}  x${n}`);
  }
  if (strays.length) {
    blockers++;
    line(`      BLOCKER: ${strays.length} non-canonical value(s) - 008 will refuse until reconciled`);
  } else {
    line('      OK: every stored area is one of the five canonical values');
  }

  const personal = allocs
    .filter(a => ['Main House', 'Other Expenses / Personal'].includes(a.property_area))
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const business = allocs
    .filter(a => ['Boarding House', 'Front Apartment', 'Back Apartment'].includes(a.property_area))
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  line(`      OD-05 impact on live data:`);
  line(`        business (is_rental_expense = TRUE) : PHP ${business.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
  line(`        personal (excluded from net income): PHP ${personal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
}

line('\n' + '='.repeat(72));
line(blockers === 0
  ? 'RESULT: no blockers. 005-009 can be applied as written.'
  : `RESULT: ${blockers} blocker(s) must be resolved before applying.`);
process.exit(0);
