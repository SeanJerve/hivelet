/**
 * check:relations — separate records must agree with each other.
 *
 * Run with `npm run check:relations` from the repo root, with the backend up.
 * Reads through the API as the administrator. **Writes nothing.**
 *
 * WHY THIS EXISTS
 * ---------------
 * Every other suite asks whether one thing is internally consistent.
 * `check:ledger` re-derives the money. `check:columns` proves a column
 * reference resolves. `check:rules` keeps a register honest with itself.
 * **None of them asks whether two records that describe the same situation
 * agree**, and that is where this system had gone wrong without anyone
 * noticing.
 *
 * Found on 2026-09-18, by asking exactly that:
 *
 *   bill b3415b46 is for unit 1A, for the period 21 Aug - 5 Sep 2026.
 *   Its tenant's only two tenancies are both for unit 1B.
 *   **The bill names a unit that tenant never occupied.**
 *
 * Both rows are test accounts, so no real money is wrong. The point is that
 * nothing detected it: a bill's room and a tenancy's room are two separate
 * records, each internally fine, disagreeing with each other.
 *
 * WHAT IT ASSERTS
 * ---------------
 *   1. The property is 33 units in 5 clusters, 11/11/10/1 by floor.
 *   2. Occupancy agrees across three sources - rooms marked Occupied, active
 *      tenancies, and the tenants holding them - with no room double-let.
 *   3. Every tenancy, bill, payment, ticket and inquiry points at a row that
 *      exists.
 *   4. A bill's room is one its tenant holds or held a tenancy for.
 *   5. A bill's total is its rent plus its water, and its water is the
 *      occupant count times the configured rate - except Linda's units, which
 *      are a fixed charge under BR-040.
 *   6. No NEW tenancy ends without a date. A ratchet rather than a
 *      pass/fail, because all 16 existing ones predate the code that writes
 *      one - see the note on that section.
 *   7. Every income row names a unit on the canonical list.
 *
 * KNOWN, PINNED, AND REPORTED EVERY RUN
 * -------------------------------------
 * Two things are known-wrong today. They are **pinned and printed on every run**
 * rather than silenced, which is the shape `check:ledger` already uses for the
 * seven receipts: a known wrong thing stays visible, and **anything NEW fails the
 * run immediately**.
 *
 *   - bill `b3415b46`, above.
 *   - **16 ended tenancies with no end date.** Every one predates `d026e21`
 *     (2026-09-16), the commit that made the vacate path write one. The code is
 *     right; the rows were never backfilled. It reaches real residents, and a
 *     move-out date is what OD-04's deposit settlement needs.
 *
 * Correcting them means changing live rows, which is a migration and is Sean's
 * call - so the check reports and does not fail, in the same way and for the
 * same reason.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.API_BASE || 'http://127.0.0.1:5000/api';

/** Anomalies already known. Keyed by a stable id prefix, with why it is here. */
const KNOWN = {
  'b3415b46': 'bill is for unit 1A; its tenant\'s tenancies are both 1B (build-window test rows)',
};

const credsPath = path.join(root, 'credentials', 'creds.txt');
if (!fs.existsSync(credsPath)) {
  console.error('credentials/creds.txt not found - cannot run the relationship check.');
  process.exit(1);
}
const creds = fs.readFileSync(credsPath, 'utf8');
const adminEmail = creds.match(/Email:\s*(\S+)/)?.[1];
const adminPass = creds.match(/^Password:\s*(\S+)\s*$/m)?.[1];

let pass = 0, fail = 0;
const failures = [];
const pinned = [];

function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  OK    ${name}`); return; }
  fail++; failures.push(`${name}${detail ? ` - ${detail}` : ''}`);
  console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
}
function known(key, what) {
  pinned.push(`${key}: ${KNOWN[key] ?? what}`);
}

const res = await fetch(`${BASE}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: adminEmail, password: adminPass }),
}).catch(() => null);
if (!res || !res.ok) {
  console.error('Could not sign in. Is the backend running (npm run dev:backend)?');
  process.exit(1);
}
const token = (await res.json())?.data?.token;
const get = async (p) => {
  const r = await fetch(BASE + p, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data ?? j;
};

const [rooms, tenants, bills, payments, income, tickets, inquiries, rates] = await Promise.all([
  get('/admin/rooms'), get('/admin/tenants'), get('/admin/bills'), get('/admin/payments'),
  get('/admin/income-records'), get('/admin/tickets'), get('/admin/inquiries'), get('/public/rates'),
]);

if (!rooms || !tenants) { console.error('Could not read rooms or tenants.'); process.exit(1); }

console.log('check:relations - separate records must agree with each other\n');
console.log(`               ${rooms.length} rooms, ${tenants.length} profiles, ${bills.length} bills, ` +
            `${payments.length} payments,\n               ${income.length} income rows, ` +
            `${tickets.length} tickets, ${inquiries.length} inquiries examined\n`);

const roomById = new Map(rooms.map((r) => [r.id, r]));
const tenantById = new Map(tenants.map((t) => [t.id ?? t.profile_id, t]));
const unitCodes = new Set(rooms.map((r) => String(r.room_number).toUpperCase()));
const activeOf = (t) => (t.room_assignments ?? []).filter((a) => a.is_active);
const allOf = (t) => t.room_assignments ?? [];

// ---- 1. the property ----------------------------------------------------
check('the property is 33 units', rooms.length === 33, `got ${rooms.length}`);
check('every unit code is unique', unitCodes.size === rooms.length,
  `${rooms.length - unitCodes.size} duplicate(s)`);
const clusters = new Set(rooms.map((r) => r.cluster_code));
check('5 clusters', clusters.size === 5, [...clusters].join(', '));
const byFloor = rooms.reduce((a, r) => (a[r.floor] = (a[r.floor] ?? 0) + 1, a), {});
check('floors read 11 / 11 / 10 / 1',
  [1, 2, 3, 4].map((f) => byFloor[f]).join('/') === '11/11/10/1', JSON.stringify(byFloor));

// ---- 2. occupancy -------------------------------------------------------
const occupied = rooms.filter((r) => r.operational_status === 'Occupied');
const actives = tenants.flatMap(activeOf);
const activeRoomIds = actives.map((a) => a.rooms?.id ?? a.room_id).filter(Boolean);
check('rooms marked Occupied match the number of active tenancies',
  occupied.length === actives.length, `${occupied.length} rooms, ${actives.length} tenancies`);
check('no unit is let to two people at once',
  new Set(activeRoomIds).size === activeRoomIds.length,
  `${activeRoomIds.length - new Set(activeRoomIds).size} collision(s)`);
check('every active tenancy points at a unit that exists',
  activeRoomIds.every((id) => roomById.has(id)));
const occupiedIds = new Set(occupied.map((r) => r.id));
check('every tenanted unit reads Occupied', activeRoomIds.every((id) => occupiedIds.has(id)));
check('every Occupied unit has somebody in it',
  [...occupiedIds].every((id) => activeRoomIds.includes(id)));

// ---- 3. a bill's unit is one its tenant holds or held --------------------
let billRoomMismatch = 0;
for (const b of bills ?? []) {
  const t = tenantById.get(b.tenant_profile_id);
  if (!t) { check(`bill ${String(b.id).slice(0, 8)} belongs to a known profile`, false); continue; }
  const everHeld = allOf(t).map((a) => a.rooms?.id ?? a.room_id);
  const ok = !b.room_id || everHeld.includes(b.room_id);
  if (!ok) {
    const key = String(b.id).slice(0, 8);
    if (KNOWN[key]) { known(key); continue; }
    billRoomMismatch++;
    check(`bill ${key} is for a unit its tenant has held`, false,
      `bill says ${roomById.get(b.room_id)?.room_number ?? b.room_id}, tenancies say ` +
      `${everHeld.map((id) => roomById.get(id)?.room_number ?? '?').join(', ') || 'none'}`);
  }
}
if (billRoomMismatch === 0) check('every bill is for a unit its tenant has held', true);

// ---- 4. bill arithmetic and the water rule ------------------------------
const rate = Number(rates?.waterRatePerOccupant);
check('the water rate is configured', Number.isFinite(rate) && rate > 0, String(rate));
for (const b of bills ?? []) {
  const id = String(b.id).slice(0, 8);
  check(`bill ${id}: total is rent plus water`,
    Math.abs(Number(b.total_amount) - (Number(b.rent_amount) + Number(b.water_amount))) < 0.005,
    `${b.rent_amount} + ${b.water_amount} != ${b.total_amount}`);
  const t = tenantById.get(b.tenant_profile_id);
  const a = t ? (activeOf(t)[0] ?? allOf(t)[0]) : null;
  const room = a ? roomById.get(a.rooms?.id ?? a.room_id) : null;
  if (!a || room?.is_linda_unit) continue;   // BR-040: Linda's units are a fixed charge
  check(`bill ${id}: water is occupants x ${rate}`,
    Math.abs(Number(b.water_amount) - Number(a.occupant_count) * rate) < 0.005,
    `${a.occupant_count} x ${rate} != ${b.water_amount}`);
}

// ---- 5. an ended tenancy records when it ended --------------------------
//
// A RATCHET, not a pass/fail, and the reason matters.
//
// All three places that deactivate a tenancy write `end_date: propertyToday()`,
// and have since `d026e21` on 2026-09-16. **The code is right.** What is wrong is
// the data underneath it: every inactive tenancy in the database predates that
// commit, none was backfilled, and so not one of them records when it ended.
//
// It is worse than it sounds and better than it sounds. Worse, because it covers
// real residents - `jaye.casia` left Linda's LB, and nothing says when - and
// because a move-out date is exactly what the deposit settlement in OD-04 needs.
// Better, because nothing is broken going forward.
//
// And there is a reason no correctly-dated row exists yet: **no write path in
// this system has ever been used by a person** (B-04). The fixed code has never
// run in anger. The rehearsal's vacate step will produce the first one, which is
// why that step is worth doing carefully.
//
// So: pin the count, print it every run, and fail only if it GROWS. A new undated
// tenancy means the fixed path was bypassed, and that is worth stopping the build
// for. The existing ones need a migration, which is not this script's business.
const UNDATED_BASELINE = 16;
const undated = [];
for (const t of tenants) {
  for (const a of allOf(t)) {
    if (a.is_active || a.end_date) continue;
    undated.push(`${t.email ?? t.id} ${a.rooms?.room_number ?? '?'} from ${a.start_date}`);
  }
}
check(`no NEW tenancy has ended without a date (baseline ${UNDATED_BASELINE})`,
  undated.length <= UNDATED_BASELINE,
  `${undated.length} undated, ${undated.length - UNDATED_BASELINE} more than the baseline`);
if (undated.length) {
  pinned.push(`${undated.length} ended tenancies carry no end date - all predate d026e21 ` +
              `(2026-09-16), which is when the vacate path started writing one. Needs a backfill ` +
              `migration; OD-04's deposit settlement depends on knowing move-out dates.`);
}
if (undated.length < UNDATED_BASELINE) {
  console.log(`  note  the baseline can come down to ${undated.length} - someone backfilled`);
}

// ---- 6. references resolve ----------------------------------------------
check('every payment points at a bill that exists',
  (payments ?? []).every((p) => !p.bill_id || (bills ?? []).some((b) => b.id === p.bill_id)));
check('every ticket points at a unit that exists',
  (tickets ?? []).every((t) => !t.room_id || roomById.has(t.room_id)));
check('every ticket points at a profile that exists',
  (tickets ?? []).every((t) => !t.tenant_profile_id || tenantById.has(t.tenant_profile_id)));
check('every enquiry points at a unit that exists',
  (inquiries ?? []).every((i) => !i.room_id || roomById.has(i.room_id)));
check('every converted enquiry links a profile that exists',
  (inquiries ?? []).every((i) => !i.converted_tenant_id || tenantById.has(i.converted_tenant_id)));

// ---- 7. the ledger names real units -------------------------------------
const strayUnits = new Map();
for (const r of income ?? []) {
  const u = String(r.room_number ?? r.unit ?? '').toUpperCase();
  if (u && !unitCodes.has(u)) strayUnits.set(u, (strayUnits.get(u) ?? 0) + 1);
}
check('every income row names a unit on the canonical list', strayUnits.size === 0,
  [...strayUnits].map(([u, n]) => `${u} x${n}`).join(', '));

// ---- report -------------------------------------------------------------
if (pinned.length) {
  console.log(`\n  KNOWN AND PINNED - ${pinned.length}, reported every run so they are not forgotten:`);
  for (const p of pinned) console.log(`    ${p}`);
  console.log('    Correcting these means changing live rows, which is a migration.');
}

console.log(`\n${pass} passed, ${fail} failed`);
for (const f of failures) console.log('  - ' + f);
process.exitCode = fail === 0 ? 0 : 1;
