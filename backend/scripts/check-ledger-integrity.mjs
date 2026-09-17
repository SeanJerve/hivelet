/**
 * check:ledger — arithmetic and plausibility invariants over the live money.
 *
 * Run with `npm run check:ledger`. Reads the database and writes NOTHING.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every other suite checks the code. This one checks the owner's actual
 * records, because the code being right does not make the ledger right - 937
 * income rows were migrated from a spreadsheet, and a spreadsheet can hold a
 * date Excel never parsed.
 *
 * It found seven rows on 2026-09-16, out of 937 income rows and 1,262 expense
 * entries. Everything else was clean: no negative amount anywhere, no payment
 * verified without a verifier, no room with two active tenancies, and
 * `remitted_amount` and `fifty_percent_share` agreeing with their formulas on
 * every single row.
 *
 * KNOWN ROWS ARE LISTED, NOT SILENCED
 * -----------------------------------
 * The seven are real entries in Mrs. Da Silva's books and **correcting one
 * means knowing what it should say**, which is hers to tell us, not ours to
 * infer. So they are pinned below by id, and the check passes with them while
 * printing every one on every run. A row that is NOT on the list fails the run.
 *
 * That is the useful gate: a typo entered tomorrow fails immediately, while the
 * seven historical ones wait for an answer instead of being quietly accepted.
 * When one is corrected, delete its entry - and `check:ledger` will tell you if
 * you delete an entry whose row is still wrong.
 */
import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: join(here, '..', '..', '.env') });

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) {
  console.error('check:ledger — SUPABASE_URL / SUPABASE_SECRET_KEY are not set.');
  process.exit(2);
}

/**
 * Rows already surfaced to the owner on 2026-09-16, each with what is wrong and
 * what it looks like it should say. Nothing here has been written to.
 */
const KNOWN = new Map([
  ['OR#4839', 'date_paid is 1900-01-17 — the Excel epoch, so the source cell never parsed. Its year/month (2024-12) also disagree with its rent period (2025-12-09 to 2026-01-08). Room 2g, PHP 6,500.'],
  ['INVOICE#5120', 'date_paid is 2027-02-26, a year in the future, against a rent period of 2026-02-26 to 2026-03-25. Reads as a mistyped year. Room 1c, PHP 8,000.'],
  ['OR#4757', 'rent period ends the day before it starts: 2024-08-03 to 2024-08-02. Migration off-by-one; the end looks like it should be 2024-09-02. Room 1h.'],
  ['OR#4775', 'rent period ends the day before it starts: 2024-08-30 to 2024-08-29. Room 2b.'],
  ['OR#4872', 'rent period ends the day before it starts: 2025-02-03 to 2025-02-02. Room 1h.'],
  ['OR#4774', 'one receipt number against two rooms (3f and 3g) for the same tenant, but paid twelve days apart — 2024-08-22 and 2024-09-03. One of the two numbers is likely a transcription error.'],
  ['OR#4813', 'one receipt number against TWO DIFFERENT TENANTS on the same day — Ron Juliene Dominguino (2a, PHP 8,000) and M. Juselle Escuro (3a, PHP 9,000). Two people cannot share one official receipt.'],
]);

let failures = 0;
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  OK    ${m}`);

/** PostgREST, not raw SQL: read each table and do the arithmetic here. */
async function rows(path) {
  const out = [];
  let from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
    });
    if (!r.ok) {
      console.error(`check:ledger — read failed (HTTP ${r.status}) for ${path}`);
      process.exit(2);
    }
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) break;
    from += 1000;
  }
  return out;
}

const income = await rows(
  'monthly_income_records?voided_at=is.null&select=id,invoice_number,contact_name,year,month,' +
  'date_paid,rent_period_start,rent_period_end,rent_amount,water_payment,occupants,' +
  'fifty_percent_share,remitted_amount,room_id'
);

console.log(`check:ledger — ${income.length} live income rows\n`);

const near = (a, b) => Math.abs(Number(a) - Number(b)) <= 0.005;
const findings = [];
const add = (row, what) => findings.push({ ref: row.invoice_number, what });

for (const r of income) {
  if (r.remitted_amount !== null && !near(r.remitted_amount, Number(r.rent_amount) + Number(r.water_payment)))
    add(r, 'remitted_amount does not equal rent_amount + water_payment');
  if (r.fifty_percent_share !== null && !near(r.fifty_percent_share, Number(r.rent_amount) / 2))
    add(r, 'fifty_percent_share does not equal half the rent');
  if (Number(r.rent_amount) <= 0) add(r, 'rent_amount is zero or negative');
  if (Number(r.water_payment) < 0) add(r, 'water_payment is negative');
  if (Number(r.occupants) < 1) add(r, 'occupants is below one');
  if (r.rent_period_end < r.rent_period_start) add(r, 'rent period ends before it starts');
  if (r.date_paid > new Date().toISOString().slice(0, 10)) add(r, 'date_paid is in the future');
  if (r.date_paid < '2020-01-01') add(r, 'date_paid is before 2020');
}

/** One receipt number may cover several months; it may not cover several rooms. */
const byInvoice = new Map();
for (const r of income) {
  if (!byInvoice.has(r.invoice_number)) byInvoice.set(r.invoice_number, new Set());
  byInvoice.get(r.invoice_number).add(r.room_id);
}
for (const [inv, roomIds] of byInvoice) {
  if (roomIds.size > 1) findings.push({ ref: inv, what: `one receipt number against ${roomIds.size} different rooms` });
}

const unknown = findings.filter((f) => !KNOWN.has(f.ref));
if (unknown.length === 0) {
  pass(`no unrecorded anomaly in ${income.length} income rows`);
} else {
  for (const f of unknown) fail(`${f.ref}: ${f.what}`);
  console.log('\n  A row that fails here is a record in the owner\'s books. Establish what it');
  console.log('  SHOULD say before changing it, then pin it above or correct it.');
}

/** The pinned list can go stale too - a row corrected should lose its entry. */
const refs = new Set(findings.map((f) => f.ref));
const fixed = [...KNOWN.keys()].filter((k) => !refs.has(k));
if (fixed.length === 0) pass('every pinned row is still anomalous - no stale entries');
else for (const k of fixed) fail(`${k} is pinned as anomalous but now reads clean - remove its entry`);

const live = findings.filter((f) => KNOWN.has(f.ref));
if (live.length) {
  console.log(`\n  AWAITING THE OWNER — ${new Set(live.map((f) => f.ref)).size} receipt(s), reported every run:`);
  for (const ref of new Set(live.map((f) => f.ref))) {
    console.log(`    ${ref}`);
    console.log(`      ${KNOWN.get(ref)}`);
  }
}

/**
 * BUSINESS RULES, TESTED AGAINST THE DATA RATHER THAN AGAINST THE REGISTER
 * -----------------------------------------------------------------------
 * `check:rules` proves the BR crosswalk agrees with ITSELF - that its counts
 * match its rows and its statuses are ones the legend defines. It cannot prove
 * a rule marked **Enforced** is actually being obeyed, because it never reads
 * the database.
 *
 * These do. Each one is a rule stated in `docs/02_BUSINESS_RULES.md` turned
 * into a question the live data can answer, and each was zero on 2026-09-16.
 * They live here rather than in a fourteenth suite because this is already the
 * one place that reads the owner's records.
 *
 * A rule that cannot be falsified by a query does not belong here. BR-024
 * Tenant Privacy, for instance, is about what an endpoint returns, and is
 * covered by `check:api`.
 */
{
  const rooms = await rows('rooms?select=id,room_number,operational_status,cluster_code,floor');
  const clusters = await rows('clusters?select=code');
  const assigns = await rows('room_assignments?is_active=eq.true&select=room_id,tenant_profile_id,is_primary_contact');
  const people = await rows('profiles?select=id,role,email,phone_number');
  const bills = await rows('bills?select=id,status,total_amount');
  const pays = await rows('payments?select=bill_id,amount,verification_status,verified_by,payment_source');

  const dupes = (list, key) => {
    const seen = new Map();
    for (const x of list) {
      const k = key(x);
      if (k === null || k === undefined || k === '') continue;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    return [...seen.values()].filter((n) => n > 1).length;
  };

  /**
   * `detail` states what SHOULD be true, so a pass reads as a fact and a failure
   * reads as the expectation that was broken. Printing the same sentence after
   * "N violation(s):" made a failure look like it was asserting the thing it had
   * just disproved.
   */
  const check = (label, n, detail) =>
    n === 0
      ? pass(`${label} — ${detail}`)
      : fail(`${label} — ${n} violation(s). Expected: ${detail}`);

  // BR-002: a room is identified by its room number.
  check('BR-002 Room Identity', dupes(rooms, (r) => r.room_number.toLowerCase()),
    `${rooms.length} rooms, no duplicate room number`);

  // BR-032: the canonical list is 33 units across 5 clusters.
  check('BR-032 Canonical Unit List', Math.abs(rooms.length - 33) + Math.abs(clusters.length - 5),
    `${rooms.length} units, ${clusters.length} clusters`);

  // BR-008: one primary accountable contact per occupied room - and at least one.
  const byRoom = new Map();
  for (const a of assigns) {
    if (!byRoom.has(a.room_id)) byRoom.set(a.room_id, []);
    byRoom.get(a.room_id).push(a);
  }
  const primaryWrong = [...byRoom.values()].filter((list) => {
    const primaries = list.filter((a) => a.is_primary_contact).length;
    return primaries !== 1;
  }).length;
  check('BR-008 Primary Contact', primaryWrong,
    `${byRoom.size} occupied rooms, each with exactly one primary contact`);

  // BR-026: no duplicate person, and no tenant holding two tenancies at once.
  const tenants = people.filter((p) => p.role === 'tenant');
  const dupPeople = dupes(tenants, (p) => (p.email ?? '').toLowerCase()) +
                    dupes(tenants, (p) => p.phone_number);
  check('BR-026 Duplicate Prevention', dupPeople,
    `${tenants.length} tenants, no repeated email or phone`);
  check('BR-026 one active tenancy per tenant', dupes(assigns, (a) => a.tenant_profile_id),
    `${assigns.length} active assignments`);

  // BR-004: and no room let to two tenants at once - the invariant that would
  // corrupt every occupancy figure in the system.
  check('BR-004 Room Occupancy', dupes(assigns, (a) => a.room_id),
    'no room has two active tenancies');

  /**
   * A room's status must agree with whether anyone is actually living in it.
   *
   * This is the invariant that catches a HALF-COMPLETED write. Onboarding and
   * vacate each touch three tables without a transaction - supabase-js cannot
   * open one - so they are written in a deliberate order with `assertWritten` on
   * every step. That makes a partial failure loud and recoverable, but it does
   * not make it impossible:
   *
   *   onboarding stops after the assignment  ->  tenancy exists, room still Available
   *   vacate stops after ending the tenancy  ->  room still Occupied, nobody in it
   *
   * Neither shows up in BR-004 or BR-026 above: those compare assignments with
   * each other and never look at `rooms.operational_status`. Nothing did, until
   * this. See judgement log SS 3.7.
   *
   * `Under Maintenance` is deliberately allowed to hold a tenancy: raising a
   * ticket flips an occupied room to that status with the tenant still in it.
   * `Reserved` and `Available` are not.
   */
  const activeByRoom = new Map();
  for (const a of assigns) activeByRoom.set(a.room_id, (activeByRoom.get(a.room_id) ?? 0) + 1);

  const HOLDS_A_TENANT = new Set(['Occupied', 'Under Maintenance']);
  const statusDrift = rooms.filter((r) => {
    const n = activeByRoom.get(r.id) ?? 0;
    if (r.operational_status === 'Occupied' && n === 0) return true;
    if (n > 0 && !HOLDS_A_TENANT.has(r.operational_status)) return true;
    return false;
  });

  for (const r of statusDrift) {
    const n = activeByRoom.get(r.id) ?? 0;
    console.log(
      `        unit ${r.room_number}: ${r.operational_status}, ` +
      `${n} active tenanc${n === 1 ? 'y' : 'ies'}`
    );
  }

  const occupied = rooms.filter((r) => r.operational_status === 'Occupied').length;
  check('room status agrees with tenancy', statusDrift.length,
    `${rooms.length} units, ${occupied} Occupied, ${assigns.length} active tenancies, no drift`);

  /**
   * A TENANCY THAT ENDED MUST SAY WHEN.
   *
   * `vacate` sets `is_active = false` AND `end_date` together, under
   * `assertWritten`. So a row that is inactive with a NULL `end_date` did not go
   * through vacate - and you cannot say when that person left, which is the one
   * thing an ended tenancy is for.
   *
   * There are EIGHT, found 2026-09-17. All eight carry **zero income rows**, and
   * seven of the eight start on or after 2026-08-19 - most of them on
   * **2026-08-25**, the day the import reassigned units. They are debris from
   * the same import that left the three duplicate profiles reported above:
   * superseded rows that were switched off rather than ended.
   *
   * No money is attached to any of them, so this is a RATCHET rather than a
   * failure: eight is the number that exists, and a ninth means a live vacate
   * left a tenancy hanging - which is a real defect, in a path that runs against
   * real residents.
   */
  /**
   * How much of the income report's Anniv Date / Deposit pair comes out blank.
   *
   * Those two columns live on the tenancy, not the receipt, and are resolved by
   * room AND tenant together. `assignment_id` would have carried the link and is
   * NULL on every one of the 937 rows.
   *
   * Reported, not failed. Blank is the correct answer for every one of these -
   * inventing a move-in date from the room alone would put a previous tenant's
   * date against this tenant's receipt. The point is that nobody knew the scale
   * before it was counted, and the comment in incomeReportExport said 214 when
   * the real figure was the whole ledger.
   */
  const incomeLinkage = await rows(
    'monthly_income_records?select=room_id,tenant_profile_id&voided_at=is.null'
  );
  const tenancyPairs = new Set(
    (await rows('room_assignments?select=room_id,tenant_profile_id'))
      .map((a) => `${a.room_id}|${a.tenant_profile_id}`)
  );
  const noTenant = incomeLinkage.filter((m) => !m.tenant_profile_id).length;
  const unmatched = incomeLinkage.filter(
    (m) => m.tenant_profile_id && !tenancyPairs.has(`${m.room_id}|${m.tenant_profile_id}`)
  ).length;
  const blank = noTenant + unmatched;

  console.log(
    `
  INCOME REPORT, Anniv Date + Deposit — ${blank} of ${incomeLinkage.length} rows blank ` +
    `(${Math.round((blank / incomeLinkage.length) * 100)}%):`
  );
  console.log(`    ${noTenant} carry no tenant at all - nothing to resolve with`);
  console.log(`    ${unmatched} name a room/tenant pair that matches no tenancy`);
  console.log(`    ${incomeLinkage.length - blank} resolve, and are filled`);

  /**
   * Test payments still sitting in the live `payments` table.
   *
   * All 15 rows date from 2026-07-05 to 2026-08-25 - the build window - and
   * carry generated references: 8 `ADYEN-GCASH-*` from proving the gateway and
   * 7 `CASH-REC-*` from proving the cash path. Thirteen are attached to no bill.
   *
   * THEY DO NOT TOUCH THE MONEY. Nothing in backend/src or frontend/src sums
   * this table - checked - so no figure the owner reads includes them, and the
   * ledger she actually keeps is `monthly_income_records`. BR-013 above is
   * unaffected, because it asks whether bills marked Paid are covered, and these
   * are attached to no bill.
   *
   * They ARE visible: `GET /admin/payments` returns all 15, so the payments list
   * shows them during a demonstration. Reported here so nobody meets them for
   * the first time in front of a panel.
   */
  const pays2 = await rows('payments?select=amount,bill_id,transaction_reference');
  const noBill = pays2.filter((p) => !p.bill_id);
  if (noBill.length) {
    const sum = noBill.reduce((a, p) => a + Number(p.amount), 0);
    console.log(
      `
  TEST PAYMENTS FROM THE BUILD WINDOW — ${noBill.length} of ${pays2.length}, ` +
      `PHP ${sum.toLocaleString('en-PH')}, attached to no bill:`
    );
    console.log('    visible in the admin payments list; summed by nothing, so no owner-facing');
    console.log('    figure includes them. Her ledger is monthly_income_records, not this table.');
  }

  /**
   * THE EXPENSE LEDGER'S ARITHMETIC.
   *
   * Everything above tests the INCOME side. The expense ledger - 1,262 entries
   * and 1,327 allocations - had no invariant here at all, which is the larger
   * half of the two by row count and the one that decides Net Operating Income.
   *
   * An entry's `total_expenses` must equal the sum of its area allocations. If
   * it does not, one figure is wrong and there is no way to tell which: the
   * total feeds the monthly report, the allocations feed the per-area
   * breakdown, and they would disagree silently.
   *
   * Both write paths go through database functions -
   * `create_expense_entry_with_allocations` (019) and
   * `replace_expense_allocations` (010) - so the total and its allocations
   * commit together or not at all. This proves that held, for every row, rather
   * than trusting that it must have.
   */
  /** Half a centavo. The same tolerance `billingService` uses, and for the same
   *  reason: summing numerics in floating point leaves residue like 4.5e-13,
   *  and comparing money with === reports that as a mismatch. */
  const MONEY_DUST = 0.005;

  const entries = await rows('monthly_expense_entries?select=id,total_expenses&voided_at=is.null');
  const allocs = await rows('expense_property_allocations?select=expense_entry_id,amount');

  const allocSum = new Map();
  for (const a of allocs) {
    allocSum.set(a.expense_entry_id, (allocSum.get(a.expense_entry_id) ?? 0) + Number(a.amount));
  }

  const mismatched = entries.filter(
    (e) => Math.abs(Number(e.total_expenses) - (allocSum.get(e.id) ?? 0)) > MONEY_DUST
  );
  const unallocated = entries.filter((e) => !allocSum.has(e.id));
  const orphans = allocs.filter((a) => !entries.some((e) => e.id === a.expense_entry_id)).length;

  for (const e of mismatched.slice(0, 5)) {
    console.log(
      `        entry ${e.id}: total ${Number(e.total_expenses).toFixed(2)}, ` +
      `allocations ${(allocSum.get(e.id) ?? 0).toFixed(2)}`
    );
  }

  check('expense totals equal their allocations', mismatched.length,
    `${entries.length} entries against ${allocs.length} allocations, to the centavo`);
  check('every expense entry is allocated', unallocated.length,
    `${entries.length} entries, none unallocated`);
  check('no allocation without its entry', orphans,
    `${allocs.length} allocations, every one attached`);

  /**
   * THE PROPERTY'S OWN NUMBERS, WHERE THE PUBLIC READS THEM.
   *
   * "33 units", "5 clusters", "4 floors" are written into the interface by hand,
   * in headings and stat cards, because they are part of the copy rather than
   * data fetched at runtime. Which means they drift, and this project has a
   * history of exactly that: the **32-unit** figure survived in thirty places
   * and is still being corrected.
   *
   * On 2026-09-17 the public landing page's stat card said **"3 Floors"** two
   * lines below its own prose saying *"three residential floors plus a rooftop
   * penthouse level"* - the number contradicting the sentence above it, on the
   * page a panel opens first. `rooms.floor` holds 1, 2, 3 and 4. The unit
   * directory said "3 floors" too.
   *
   * Nothing could have caught it. `check:fields` reads field NAMES, `check:canon`
   * polices banned WORDING, and neither looks at a number in a heading.
   *
   * Every such claim in `frontend/src` is now read and compared against the live
   * `rooms` table. A survey before writing this found fourteen unit claims, four
   * cluster claims and three floor claims, in several spellings - `33-unit`,
   * `33 Units`, `33-UNIT` - and no other shape, so the pattern below is narrow
   * without being fragile.
   */
  const feFiles = [];
  (function walkFe(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walkFe(p);
      else if (e.name.endsWith('.vue') || e.name.endsWith('.ts')) feFiles.push(p);
    }
  })(join(here, '..', '..', 'frontend', 'src'));

  const TRUTH = new Map([
    ['unit', rooms.length],
    ['cluster', new Set(rooms.map((r) => r.cluster_code)).size],
    ['floor', new Set(rooms.map((r) => r.floor)).size],
  ]);

  const CLAIM = /(\d+)[ -]+(units?|clusters?|floors?)\b/gi;
  const wrongClaims = [];

  for (const f of feFiles) {
    const src = readFileSync(f, 'utf8');
    src.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(CLAIM)) {
        const noun = m[2].toLowerCase().replace(/s$/, '');
        const expected = TRUTH.get(noun);
        if (expected === undefined || Number(m[1]) === expected) continue;
        wrongClaims.push({
          file: relative(join(here, '..', '..'), f).replace(/\\/g, '/'),
          line: i + 1,
          said: m[0],
          expected: `${expected} ${noun}${expected === 1 ? '' : 's'}`,
        });
      }
    });
  }

  for (const w of wrongClaims) {
    console.log(`        ${w.file}:${w.line} says "${w.said}" - the database says ${w.expected}`);
  }

  check(
    "the property's own numbers, as the interface states them",
    wrongClaims.length,
    `${TRUTH.get('unit')} units, ${TRUTH.get('cluster')} clusters, ` +
    `${TRUTH.get('floor')} floors - every claim in frontend/src agrees`
  );

  const KNOWN_ENDLESS = 8;
  const endless = (await rows(
    'room_assignments?select=id&is_active=eq.false&end_date=is.null'
  )).length;

  if (endless > KNOWN_ENDLESS) {
    fail(
      `tenancies ended without an end date: ${endless}, was ${KNOWN_ENDLESS} - ` +
      'a vacate left one hanging. `vacate` sets is_active and end_date together, ' +
      'so a new one means that path did not run.'
    );
  } else if (endless < KNOWN_ENDLESS) {
    fail(
      `tenancies ended without an end date: ${endless}, was ${KNOWN_ENDLESS} - ` +
      'the import debris has been cleaned up. Lower KNOWN_ENDLESS to ' +
      `${endless} so the ratchet keeps holding.`
    );
  } else {
    pass(
      `tenancies ended without an end date: ${endless}, all import debris from ` +
      '2026-08-25, none carrying income'
    );
  }

  /**
   * ACCOUNTS THAT CAN SIGN IN AND BELONG TO NOBODY.
   *
   * BR-026 above proves no two profiles share an email or a phone. That is a
   * check on IDENTIFIERS, and it passes happily while the same PERSON holds two
   * records - which is exactly what the 2026-08-27 import produced. Three rows
   * carry an invoice number glued onto the name:
   *
   *     Mireel Fatima ParcareyINV.#5223
   *
   * each with its own fabricated email derived from the corrupted name, its own
   * phone number, a usable `password_hash` - and zero tenancies, zero income
   * rows, zero bills, zero payments. The real person has a separate, complete
   * profile. So BR-026 sees two different identifiers and says nothing.
   *
   * They matter because they can SIGN IN, on the shared tenant literal that has
   * been in this repository's git history since 2026-08-25. Three working
   * logins belonging to nobody, that nothing was counting.
   *
   * Not a failure here, because the fix is `database/migrations/023`, which the
   * sandbox cannot apply - so failing would only mean a permanently red suite.
   * Printed every run instead, the way the seven receipts are, so it stays
   * visible until someone runs it.
   *
   * KNOWN_NO_TENANCY exists because the obvious query finds a FOURTH row that
   * must be left alone: a team member's own account, role 'tenant' so the portal
   * can be exercised. A later sweep that deactivated "everyone with no tenancy"
   * would lock out the database administrator.
   */
  const KNOWN_NO_TENANCY = new Map([
    ['luydcuario@gmail.com', "team account - the database administrator's own, role 'tenant' so the portal can be exercised. LEAVE IT."],
  ]);

  // Filtered on `password_hash` rather than SELECTing it. The distinction that
  // matters is "can this account sign in", which is a filter; pulling 42 bcrypt
  // hashes across the wire to compute a boolean would be careless with the one
  // column in this database that must never travel.
  const allProfiles = await rows(
    'profiles?select=id,full_name,email&role=eq.tenant&account_status=eq.active&password_hash=not.is.null'
  );
  const hasEverHadTenancy = new Set(
    (await rows('room_assignments?select=tenant_profile_id')).map((a) => a.tenant_profile_id)
  );
  const hasLedger = new Set(
    (await rows('monthly_income_records?select=tenant_profile_id')).map((m) => m.tenant_profile_id)
  );

  const nobodys = allProfiles.filter(
    (p) => !hasEverHadTenancy.has(p.id) && !hasLedger.has(p.id)
  );

  if (nobodys.length) {
    console.log(
      `\n  LOGINS THAT BELONG TO NOBODY — ${nobodys.length} account(s), reported every run:`
    );
    for (const p of nobodys) {
      const known = KNOWN_NO_TENANCY.get((p.email ?? '').toLowerCase());
      console.log(`    ${p.full_name}`);
      console.log(
        `      ${known ?? 'no tenancy ever, no ledger row, and it can sign in - see migration 023'}`
      );
    }
  }

  // BR-013: a bill reading Paid must actually be covered by verified payments.
  const paidByBill = new Map();
  for (const p of pays) {
    if (p.verification_status !== 'Verified' || !p.bill_id) continue;
    paidByBill.set(p.bill_id, (paidByBill.get(p.bill_id) ?? 0) + Number(p.amount));
  }
  const underpaid = bills.filter(
    (b) => b.status === 'Paid' && (paidByBill.get(b.id) ?? 0) < Number(b.total_amount) - 0.005
  ).length;
  check('BR-013 Full Payment', underpaid,
    `${bills.filter((b) => b.status === 'Paid').length} bills marked Paid, each covered`);

  /**
   * OD-05 / BR-041: which property areas are NOT a cost of the rental business.
   *
   * This one fact exists in THREE places. `property_areas.is_rental_expense` is
   * the column; `backend/src/config/propertyAreas.ts` and
   * `frontend/src/lib/systemState.ts` each hold a hardcoded `NON_RENTAL_AREAS`
   * array, and both carry the comment *"Keep the two in step."*
   *
   * Nothing kept them in step. **No line of code reads the column** - the
   * frontend splits a receipt into rental and personal using its own constant,
   * and the backend's copy is not used at all. A change made in the database,
   * which is the obvious place to make one, would have moved nothing and told
   * nobody.
   *
   * It matters because of what the split decides: of PHP 5,823,586.47 allocated
   * across all areas, **PHP 3,432,990.47 sits in the two non-rental ones** -
   * Main House, the owner's own residence, and Other Expenses / Personal. That
   * is 59% of the ledger that must not be subtracted from rental income.
   *
   * A comment asking a human to remember is not a mechanism. This is.
   */
  const areaRows = await rows('property_areas?select=code,is_rental_expense');
  const dbNonRental = new Set(
    areaRows.filter((a) => a.is_rental_expense === false).map((a) => a.code)
  );

  const constantFrom = (file) => {
    const src = readFileSync(join(here, '..', '..', file), 'utf8');
    const m = /NON_RENTAL_AREAS[^=]*=\s*\[([^\]]*)\]/.exec(src);
    if (!m) return null;
    return new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
  };

  /**
   * THE WHOLE LIST, not only the non-rental half.
   *
   * The check below proves the two hardcoded `NON_RENTAL_AREAS` constants agree
   * with `property_areas.is_rental_expense`. It says nothing about the areas
   * that ARE rental - so a seventh area added to the database would be invisible
   * to both files and to this suite.
   *
   * That is not hypothetical. `Penthouse` was added on 2026-09-13 by migration
   * 012 (OD-15) and `systemState.ts` records that it was then missing from TWO
   * hardcoded lists until commit `430d4e1` put it back. An area the interface
   * does not offer is an area the administrator cannot file to - and the
   * penthouse's own spending is still sitting in three other areas today
   * because of exactly that kind of gap.
   */
  const dbAreas = new Set(areaRows.map((a) => a.code));
  /**
   * The two files spell the same list differently, so both spellings are read:
   * the backend exports `PROPERTY_AREAS = [...]`, the frontend declares
   * `type PropertyArea = 'a' | 'b' | ...`. Matching only the array form reported
   * the frontend as having no list at all, which is a false alarm - and a check
   * that cries wolf gets switched off.
   */
  const fullListFrom = (file) => {
    const src = readFileSync(join(here, '..', '..', file), 'utf8');

    const arr = /PROPERTY_AREAS[^=]*=\s*\[([^\]]*)\]/.exec(src);
    if (arr) return new Set([...arr[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));

    const union = /type\s+PropertyArea\s*=([\s\S]*?);/.exec(src);
    if (union) return new Set([...union[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));

    return null;
  };

  for (const file of [
    'backend/src/config/propertyAreas.ts',
    'frontend/src/lib/systemState.ts',
  ]) {
    const inCode = fullListFrom(file);
    if (!inCode) {
      fail(`property areas — could not find PROPERTY_AREAS in ${file}`);
      continue;
    }
    const missing = [...dbAreas].filter((a) => !inCode.has(a));
    const extra = [...inCode].filter((a) => !dbAreas.has(a));
    if (missing.length === 0 && extra.length === 0) {
      pass(`property areas — ${file} offers all ${dbAreas.size}`);
    } else {
      if (missing.length) {
        fail(
          `property areas — ${file} does NOT offer [${missing.join(', ')}], so nothing can be ` +
          'filed to it from there'
        );
      }
      if (extra.length) {
        fail(`property areas — ${file} offers [${extra.join(', ')}], which the database does not have`);
      }
    }
  }

  const sameSet = (a, b) =>
    a && b && a.size === b.size && [...a].every((x) => b.has(x));

  for (const file of [
    'backend/src/config/propertyAreas.ts',
    'frontend/src/lib/systemState.ts',
  ]) {
    const inCode = constantFrom(file);
    if (!inCode) {
      fail(`OD-05 non-rental areas — could not find NON_RENTAL_AREAS in ${file}`);
      continue;
    }
    sameSet(inCode, dbNonRental)
      ? pass(`OD-05 non-rental areas — ${file} matches the database: ${[...dbNonRental].join(', ')}`)
      : fail(
          `OD-05 non-rental areas — ${file} says [${[...inCode].join(', ')}] but ` +
          `property_areas.is_rental_expense=false says [${[...dbNonRental].join(', ')}]`
        );
  }

  /**
   * BR-014 / BR-040: the water rates, and the eleven places the frontend keeps a
   * copy of them.
   *
   * `/public/rates` serves the configured figures. Every caller of it has a
   * fallback literal for when that request fails - `?? 200`, `'LF' ? 400 : 200` -
   * across `OnsitePaymentModal.vue`, `systemState.ts` and
   * `IncomeCollectionsView.vue`.
   *
   * Those fallbacks are the same arrangement as `NON_RENTAL_AREAS` above: a
   * configurable value copied into source, kept in step by nothing. BR-014 exists
   * precisely so the landlady can change the water rate without a developer. The
   * day she does, every fallback here quietly bills the OLD rate whenever the
   * rates request fails - on the on-site payment form, which is where a real
   * amount gets written into her ledger.
   *
   * Narrow, because it needs the request to fail first. Not narrow enough to
   * leave uncompared.
   */
  const settings = await rows('system_settings?select=key,value');
  const setting = (k) => {
    const row = settings.find((s) => s.key === k);
    return row === undefined ? null : Number(row.value);
  };

  const RATES = [
    ['water_rate_per_occupant', setting('water_rate_per_occupant')],
    ['linda_lf_water_charge', setting('linda_lf_water_charge')],
    ['linda_lb_water_charge', setting('linda_lb_water_charge')],
  ];
  const missing = RATES.filter(([, v]) => v === null).map(([k]) => k);
  if (missing.length) {
    fail(`BR-014/BR-040 rates — ${missing.join(', ')} missing from system_settings`);
  } else {
    const [, perOccupant] = RATES[0];
    const [, lf] = RATES[1];
    const [, lb] = RATES[2];

    const FILES = [
      'frontend/src/components/modals/OnsitePaymentModal.vue',
      'frontend/src/lib/systemState.ts',
      'frontend/src/views/IncomeCollectionsView.vue',
    ];

    const wrong = [];
    let literals = 0;
    for (const rel of FILES) {
      const src = readFileSync(join(here, '..', '..', rel), 'utf8');
      for (const m of src.matchAll(/(?:waterRatePerOccupant|perOccupant)[^?\n]*\?\?\s*(\d+)/g)) {
        literals += 1;
        if (Number(m[1]) !== perOccupant) {
          wrong.push(`${rel}: per-occupant fallback is ${m[1]}, setting is ${perOccupant}`);
        }
      }
      for (const m of src.matchAll(/'(?:LF|lf)'\s*\?\s*(\d+)\s*:\s*(\d+)/g)) {
        literals += 2;
        if (Number(m[1]) !== lf) wrong.push(`${rel}: LF fallback is ${m[1]}, setting is ${lf}`);
        if (Number(m[2]) !== lb) wrong.push(`${rel}: LB fallback is ${m[2]}, setting is ${lb}`);
      }
    }

    if (literals === 0) {
      fail('BR-014/BR-040 rates — no fallback literals found; the patterns this checks for have moved');
    } else if (wrong.length === 0) {
      pass(`BR-014/BR-040 rates — ${literals} frontend fallback literal(s) match system_settings ` +
           `(per-occupant ${perOccupant}, LF ${lf}, LB ${lb})`);
    } else {
      for (const w of wrong) fail(`BR-014/BR-040 rates — ${w}`);
    }
  }

  // BR-017: the administrator's verification gate. A gateway payment must never
  // settle itself - every Verified row names the person who verified it.
  const selfVerified = pays.filter(
    (p) => p.verification_status === 'Verified' && !p.verified_by
  ).length;
  check('BR-017 Payment Verification', selfVerified,
    `${pays.length} payments, none Verified without a verifier`);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
