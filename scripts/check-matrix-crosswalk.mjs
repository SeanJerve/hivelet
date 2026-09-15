/**
 * Validates PHASE1_TRACEABILITY_MATRIX.md against itself.
 *
 * Run with `npm run check:matrix`. Reads one file and writes nothing.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-09-15 the matrix's Summary Counts table - the one table a panel adds
 * up - claimed a **Total of 44** and enumerated **43**. FR-013 had been moved
 * out of MISSING the day before and never added to any other row, so it fell
 * out of the document silently. Nothing in a markdown file notices that.
 *
 * Four kinds of drift were found in one document on one day, and every one of
 * them is arithmetic a script can do:
 *
 *   1. The summary enumerated 43 requirements under a Total of 44.
 *   2. Three places gave three different answers about the same 44 rows -
 *      the summary said 20/13/9/1, the tier table said 20/13/10/1, and the
 *      body rows said 20/12/9/1 plus two rows marked `IMPLEMENTED`.
 *   3. `IMPLEMENTED` is not one of the four statuses the document's own
 *      vocabulary section defines. Two rows used it; the summary counted one
 *      of them as PARTIAL and lost the other entirely.
 *   4. Rows that had moved off MISSING kept `—` in their Tier column and
 *      `none` as their Backing Route, so a MAPPED row claimed no route existed.
 *
 * WHAT THIS CHECK DOES NOT DO
 * ---------------------------
 * It does not judge whether a status is CORRECT. Whether FR-033 really is
 * MISSING is a question about code, answered by reading the code - and it was,
 * twice. This check only asks whether the document agrees with itself, which
 * is the part that decays without anyone touching it.
 *
 * The status vocabulary is read from the document's own §1.3 rather than
 * hardcoded here, so a fifth status cannot be introduced in one place and go
 * uncounted in another.
 *
 * MADE TO FAIL BEFORE IT WAS TRUSTED
 * ----------------------------------
 * A second path may be passed on the command line to check a copy, which is
 * how this script's failure modes are exercised without editing the real
 * document:
 *
 *   node scripts/check-matrix-crosswalk.mjs /tmp/mutated-copy.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'docs/claude_pipeline/outputs/PHASE1_TRACEABILITY_MATRIX.md');

const TOTAL_FRS = 44;
const COLUMNS = 7; // FR ID | Canonical Name | Tier | Named Component | Route | Table(s) | Status

let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  OK    ${msg}`);

if (!fs.existsSync(FILE)) {
  console.log(`FAIL  matrix not found at ${path.relative(root, FILE)}`);
  process.exit(1);
}

const lines = fs.readFileSync(FILE, 'utf8').split('\n');
const bodyEnd = lines.findIndex((l) => /^## 3\./.test(l));
if (bodyEnd === -1) {
  console.log('FAIL  no "## 3." heading - cannot tell the matrix body from its summaries');
  process.exit(1);
}

console.log(`check:matrix — ${path.relative(root, FILE).split(path.sep).join('/')}\n`);

// ---- 0. the status vocabulary, read from the document's own §1.3 -------------
const VALID = [];
for (const line of lines.slice(0, bodyEnd)) {
  const m = /^\| \*\*([A-Z][A-Z-]+)\*\* \| [A-Z]/.exec(line);
  if (m && !VALID.includes(m[1])) VALID.push(m[1]);
}
VALID.length >= 3
  ? pass(`status vocabulary read from §1.3: ${VALID.join(', ')}`)
  : fail('could not read the status vocabulary from §1.3');

// ---- 1. every FR row in the body, exactly once ------------------------------
const rows = new Map();
lines.slice(0, bodyEnd).forEach((line, i) => {
  const m = /^\| (FR-\d{3}) \|/.exec(line);
  if (!m) return;
  const id = m[1];
  if (rows.has(id)) { fail(`${id} appears twice in the body (lines ${rows.get(id).line} and ${i + 1})`); return; }
  const cells = line.trimEnd().replace(/\|$/, '').split('|').slice(1).map((c) => c.trim());
  const status = (cells[cells.length - 1] ?? '').replace(/\*/g, '').split('(')[0].trim();
  rows.set(id, { line: i + 1, cells, status, route: cells[4] ?? '', tier: cells[2] ?? '' });
});

const expected = Array.from({ length: TOTAL_FRS }, (_, i) => `FR-${String(i + 1).padStart(3, '0')}`);
const absent = expected.filter((id) => !rows.has(id));
absent.length === 0
  ? pass(`all ${TOTAL_FRS} requirements have a row`)
  : fail(`no row for ${absent.join(', ')}`);

// ---- 2. every row has every column ------------------------------------------
const short = [...rows].filter(([, v]) => v.cells.length !== COLUMNS);
short.length === 0
  ? pass(`every row has ${COLUMNS} columns`)
  : short.forEach(([id, v]) => fail(`${id} (line ${v.line}) has ${v.cells.length} columns, not ${COLUMNS}`));

// ---- 3. every status is one the vocabulary defines --------------------------
const unknown = [...rows].filter(([, v]) => !VALID.includes(v.status));
unknown.length === 0
  ? pass('every row uses a status §1.3 defines')
  : unknown.forEach(([id, v]) => fail(`${id} (line ${v.line}) has undefined status "${v.status}"`));

// ---- 4. a row's status and its route cell must not contradict each other -----
const contradictions = [];
for (const [id, v] of rows) {
  const noRoute = /^none\b/i.test(v.route) || v.route === '—';
  if (v.status === 'MAPPED' && noRoute) contradictions.push(`${id} is MAPPED but its Backing Route says "${v.route}"`);
  if (v.status === 'MISSING' && !noRoute) contradictions.push(`${id} is MISSING but names a Backing Route`);
  if (v.status !== 'MISSING' && v.tier === '—') contradictions.push(`${id} is ${v.status} but has no Tier`);
}
contradictions.length === 0
  ? pass('no row contradicts itself between Status, Tier and Backing Route')
  : contradictions.forEach(fail);

// ---- 5. the summary table agrees with the rows ------------------------------
const tally = {};
for (const [, v] of rows) tally[v.status] = (tally[v.status] ?? 0) + 1;

const summary = new Map();
for (const line of lines.slice(bodyEnd)) {
  const m = /^\| \*\*([A-Z][A-Z-]+)\*\* \| \*\*(\d+)\*\* \| ([\d.]+)% \| (.*?) \|\s*$/.exec(line);
  if (m && !summary.has(m[1])) summary.set(m[1], { count: Number(m[2]), share: m[3], ids: m[4] });
}

for (const status of VALID) {
  const counted = tally[status] ?? 0;
  const claimed = summary.get(status);
  if (!claimed) { fail(`the summary table has no row for "${status}"`); continue; }
  counted === claimed.count
    ? pass(`${status}: ${counted} rows, summary says ${claimed.count}`)
    : fail(`${status}: ${counted} rows but the summary claims ${claimed.count}`);
}

// ---- 6. the ids listed beside each count are the ids actually marked that way -
for (const status of VALID) {
  const claimed = summary.get(status);
  if (!claimed) continue;
  const listed = [...new Set(claimed.ids.match(/FR-\d{3}/g) ?? [])];
  const actual = [...rows].filter(([, v]) => v.status === status).map(([id]) => id);
  const extra = listed.filter((id) => !actual.includes(id));
  const missing = actual.filter((id) => !listed.includes(id));
  if (!extra.length && !missing.length && listed.length === claimed.count) {
    pass(`${status} id list matches the rows it names`);
  } else {
    if (extra.length) fail(`${status} list names ${extra.join(', ')}, which are not marked ${status}`);
    if (missing.length) fail(`${status} list omits ${missing.join(', ')}, which are`);
    if (listed.length !== claimed.count) fail(`${status} list has ${listed.length} ids but the count says ${claimed.count}`);
  }
}

// ---- 7. the summary sums to 44, and its Total row says so -------------------
const summed = [...summary.values()].reduce((s, v) => s + v.count, 0);
summed === TOTAL_FRS
  ? pass(`the summary enumerates all ${TOTAL_FRS} requirements`)
  : fail(`the summary enumerates ${summed} requirements, not ${TOTAL_FRS} - this is the drift that hid FR-013`);

const totalRow = lines.slice(bodyEnd).find((l) => /^\| \*\*Total\*\* \| \*\*(\d+)\*\* \| 100% \|/.test(l));
if (!totalRow) fail('the summary table has no Total row');
else {
  const claimedTotal = Number(/\*\*Total\*\* \| \*\*(\d+)\*\*/.exec(totalRow)[1]);
  claimedTotal === summed
    ? pass(`the Total row says ${claimedTotal}, and the rows above it sum to ${summed}`)
    : fail(`the Total row claims ${claimedTotal} but the rows above it sum to ${summed}`);
}

// ---- 8. the percentage beside each count is the percentage of 44 ------------
for (const [status, v] of summary) {
  const want = (v.count / TOTAL_FRS * 100).toFixed(1);
  v.share === want
    ? pass(`${status} share ${v.share}% matches ${v.count} of ${TOTAL_FRS}`)
    : fail(`${status} says ${v.share}% but ${v.count} of ${TOTAL_FRS} is ${want}%`);
}

// ---- 9. the tier distribution totals the same as the summary ----------------
const tierTotals = { MAPPED: 0, PARTIAL: 0, MISSING: 0, 'FRONTEND-ONLY': 0 };
let tierRows = 0;
for (const line of lines.slice(bodyEnd)) {
  const m = /^\| (?:\*?Tier \d[^|]*|\*No tier[^|]*)\|\s*(\d+) \|\s*(\d+) \|\s*(\d+) \|\s*(\d+) \|\s*$/.exec(line);
  if (!m) continue;
  tierRows += 1;
  tierTotals.MAPPED += Number(m[1]);
  tierTotals.PARTIAL += Number(m[2]);
  tierTotals.MISSING += Number(m[3]);
  tierTotals['FRONTEND-ONLY'] += Number(m[4]);
}
if (tierRows === 0) {
  fail('no tier distribution rows found in §3.1');
} else {
  for (const status of Object.keys(tierTotals)) {
    const claimed = summary.get(status)?.count;
    if (claimed === undefined) continue;
    tierTotals[status] === claimed
      ? pass(`tier table totals ${tierTotals[status]} ${status}, matching the summary`)
      : fail(`tier table totals ${tierTotals[status]} ${status} but the summary says ${claimed}`);
  }
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
