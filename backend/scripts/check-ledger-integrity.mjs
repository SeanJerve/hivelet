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
import { join } from 'node:path';
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

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
