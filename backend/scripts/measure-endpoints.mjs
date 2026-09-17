/**
 * measure — what the read endpoints actually cost, reproducibly.
 *
 * Run with `npm run measure` from `backend/`. Reads only; writes nothing to the
 * database.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Module 01 submission claimed "sub-50ms indexed database queries", "under
 * 256MB of RAM" and "100% data consistency". All of it was **withdrawn** as
 * errata **E-16**, and the Phase 1 documents now say plainly that they assert no
 * performance figure at all. That was the right call: a number nobody measured
 * is worse than no number.
 *
 * But "we withdrew that claim" is a poor answer to *"how fast is it?"*, and it is
 * a question a panel asks. This is the other half of the fix: not a number
 * written into a document, but a number anyone can reproduce in ten seconds on
 * the machine in front of them.
 *
 * WHAT IT MEASURES
 * ----------------
 * The whole round trip an administrator actually waits for - HTTP in, auth,
 * PostgREST, JSON out - not the database query in isolation. The query is the
 * part that was claimed at "sub-50ms"; the part that matters to a person is this
 * one.
 *
 * WHAT IT DOES NOT MEASURE, so nobody quotes it as more than it is:
 *   - one machine, one process, localhost. No network, no other users.
 *   - a warm database. The first call of the day will be slower.
 *   - reads only. No write path is timed, because timing one means writing one.
 *   - not RAM, not concurrency, not growth. It says nothing about any of them.
 */
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..', '..');
dotenv.config({ path: join(repo, '.env') });

const BASE = process.env.API_BASE ?? 'http://localhost:5000/api';
const RUNS = 5;

const ENDPOINTS = [
  ['/admin/income-records', "the owner's income ledger"],
  ['/admin/expense-entries', 'the expense ledger'],
  ['/admin/audit-logs?limit=100', 'the audit trail, newest 100'],
  ['/admin/tenants', 'the resident directory'],
  ['/admin/rooms', 'the unit directory'],
  ['/admin/payments', 'payments awaiting verification'],
  ['/public/rooms', 'the public catalogue (unauthenticated)'],
];

async function login() {
  const credsPath = join(repo, 'credentials', 'creds.txt');
  if (!existsSync(credsPath)) return null;
  const creds = readFileSync(credsPath, 'utf8');
  const email = creds.match(/Email:\s*(\S+)/)?.[1];
  const password = creds.match(/Password:\s*(\S+)/)?.[1];
  if (!email || !password) return null;
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  if (!r.ok) return null;
  return (await r.json())?.data?.token ?? null;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

console.log('measure — the round trip an administrator waits for\n');

const token = await login();
if (!token) {
  console.log('  credentials/creds.txt not found, so nothing was measured.');
  process.exit(0);
}

console.log(
  `  ${'endpoint'.padEnd(34)}${'median'.padStart(9)}${'slowest'.padStart(9)}` +
  `${'payload'.padStart(11)}${'rows'.padStart(8)}`
);
console.log('  ' + '-'.repeat(70));

const results = [];

for (const [path_, what] of ENDPOINTS) {
  const times = [];
  let bytes = 0;
  let rows = '-';

  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    const r = await fetch(`${BASE}${path_}`, { headers: { Authorization: `Bearer ${token}` } });
    const text = await r.text();
    times.push(performance.now() - t0);
    bytes = text.length;
    try {
      const d = JSON.parse(text).data;
      if (Array.isArray(d)) rows = d.length;
    } catch {
      /* not json */
    }
  }

  const kb = bytes / 1024;
  console.log(
    `  ${path_.padEnd(34)}` +
    `${(median(times).toFixed(0) + 'ms').padStart(9)}` +
    `${(Math.max(...times).toFixed(0) + 'ms').padStart(9)}` +
    `${(kb > 999 ? (kb / 1024).toFixed(1) + ' MB' : kb.toFixed(0) + ' KB').padStart(11)}` +
    `${String(rows).padStart(8)}`
  );
  console.log(`  ${''.padEnd(34)}${what}`);
  if (typeof rows === 'number') results.push({ path: path_, ms: median(times), rows });
}

/**
 * The shape of the numbers matters more than any single one of them, and it is
 * computed here rather than asserted: the smallest endpoint and the largest are
 * compared, so the split between fixed cost and per-row cost comes out of the
 * measurement instead of out of a claim.
 */
if (results.length >= 2) {
  const small = results.reduce((a, b) => (a.rows <= b.rows ? a : b));
  const large = results.reduce((a, b) => (a.rows >= b.rows ? a : b));
  const extraRows = large.rows - small.rows;
  const extraMs = large.ms - small.ms;

  console.log('');
  console.log('  WHERE THE TIME GOES');
  console.log(
    `    ${small.rows} rows costs ${small.ms.toFixed(0)}ms; ${large.rows} rows costs ` +
    `${large.ms.toFixed(0)}ms.`
  );
  if (extraRows > 0 && extraMs > 0) {
    console.log(
      `    So ${extraRows} extra rows cost ${extraMs.toFixed(0)}ms - about ` +
      `${((extraMs / extraRows) * 1000).toFixed(2)} microseconds each - while roughly ` +
      `${small.ms.toFixed(0)}ms is paid before a single row is read.`
    );
    console.log(
      '    The database is hosted, so that floor is the round trip to it, not this code.'
    );
    console.log(
      '    Rows are cheap here; the hop is not. Anyone asking whether it scales with the'
    );
    console.log(
      '    ledger should be pointed at that ratio rather than at a single figure.'
    );
  }
}

console.log(
  '\n  Median of ' + RUNS + ' runs, localhost, one process, warm database.\n' +
  '  Reads only - timing a write means performing one.\n' +
  '  Says nothing about RAM, concurrency, or growth. Errata E-16 withdrew the\n' +
  '  submitted claims about all three; this replaces one of them with a figure\n' +
  '  anyone can reproduce, and leaves the other two withdrawn.'
);
