/**
 * Validates PHASE1_BR_CROSSWALK.md against itself.
 *
 * Run with `npm run check:rules`. Reads one file and writes nothing.
 *
 * WHY THIS EXISTS
 * ---------------
 * The crosswalk is the document the defense is argued from, and in a single
 * audit session it drifted six times. Three kinds of drift, all silent:
 *
 *   1. A row lost its status cell entirely. BR-039 ended mid-sentence with no
 *      `| Partial |`, so the table rendered a column short and the rule had no
 *      status at all - while the summary still counted it.
 *   2. A row and the summary disagreed. BR-049's row said `Not enforced`; the
 *      summary listed it under Partial.
 *   3. A status appeared that the legend does not define. Three rows said
 *      `Satisfied`, which means nothing to a reader and was counted as Enforced.
 *
 * None of these is visible when reading the document - the eye slides over a
 * table cell that is not there. All three are trivially checkable.
 *
 * The check is deliberately narrow: it does NOT judge whether a status is
 * correct, only that the document agrees with itself. Whether BR-013 really is
 * Enforced is what `check:billing` and the migrations are for.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// A path may be passed to check a copy - which is how this script's own
// failure modes are exercised without editing the real document.
const FILE = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md');

const VALID = ['Enforced', 'Partial', 'Schema only', 'Not enforced', 'Violated'];
const TOTAL_RULES = 49;

let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  OK    ${msg}`);

if (!fs.existsSync(FILE)) {
  console.log(`FAIL  crosswalk not found at ${path.relative(root, FILE)}`);
  process.exit(1);
}

const lines = fs.readFileSync(FILE, 'utf8').split('\n');

// ---- every rule row, first occurrence (a later table re-uses the same ids) ---
const rows = new Map();
const malformed = [];
lines.forEach((line, i) => {
  const m = /^\| \*\*(BR-\d+)\*\* \|/.exec(line);
  if (!m || rows.has(m[1])) return;
  const cells = line.trimEnd().replace(/\|$/, '').split('|').map((c) => c.trim());
  const status = cells[cells.length - 1].replace(/\*/g, '').trim();
  // A rule row is | id | name | rule | evidence | status |. Splitting on the pipe
  // yields SIX parts, because the leading pipe produces an empty first element -
  // so the threshold is 6, not 5. It was 5 on the first version of this script,
  // which meant a row missing its status cell still passed: the evidence slid
  // into the last position and was read as the status. That is precisely the
  // BR-039 failure this check exists to catch, so the check was not catching it.
  if (cells.length < 6) {
    malformed.push(
      `${m[1]} (line ${i + 1}): row has ${cells.length - 1} cells, expected 5 - a cell was dropped`
    );
  }
  rows.set(m[1], { status, line: i + 1 });
});

console.log('BR CROSSWALK - internal consistency\n');

// ---- 1. coverage ------------------------------------------------------------
const expected = Array.from({ length: TOTAL_RULES }, (_, i) => `BR-${String(i + 1).padStart(3, '0')}`);
const missing = expected.filter((id) => !rows.has(id));
missing.length === 0
  ? pass(`all ${TOTAL_RULES} rules have a row`)
  : fail(`no row for: ${missing.join(', ')}`);

// ---- 2. no dropped cells ----------------------------------------------------
malformed.length === 0
  ? pass('every rule row has all five cells')
  : malformed.forEach((m) => fail(m));

// ---- 3. only statuses the legend defines ------------------------------------
const unknown = [...rows].filter(([, v]) => !VALID.includes(v.status));
unknown.length === 0
  ? pass(`every status is one of: ${VALID.join(', ')}`)
  : unknown.forEach(([id, v]) => fail(`${id} (line ${v.line}) has undefined status "${v.status}"`));

// ---- 4. rows agree with the summary table -----------------------------------
const summary = {};
for (const line of lines) {
  const m = /^\| \*\*(Enforced|Partial|Schema only|Not enforced|Violated)\*\* \| (?:\*\*)?(\d+)/.exec(line);
  if (m && summary[m[1]] === undefined) summary[m[1]] = Number(m[2]);
}

const tally = {};
for (const [, v] of rows) tally[v.status] = (tally[v.status] ?? 0) + 1;

for (const status of VALID) {
  const counted = tally[status] ?? 0;
  const claimed = summary[status];
  if (claimed === undefined) { fail(`summary table has no row for "${status}"`); continue; }
  counted === claimed
    ? pass(`${status}: ${counted} rows, summary says ${claimed}`)
    : fail(`${status}: ${counted} rows but the summary claims ${claimed}`);
}

const summed = VALID.reduce((s, k) => s + (summary[k] ?? 0), 0);
summed === TOTAL_RULES
  ? pass(`summary sums to ${TOTAL_RULES}`)
  : fail(`summary sums to ${summed}, not ${TOTAL_RULES}`);

// ---- 5. the ids listed beside each count are the ids actually marked that way -
for (const line of lines) {
  const m = /^\| \*\*(Enforced|Partial|Schema only)\*\* \| (\d+) \| (BR-.*?) \|/.exec(line);
  if (!m) continue;
  const listed = [...new Set(m[3].match(/BR-\d+/g) ?? [])];
  const actual = [...rows].filter(([, v]) => v.status === m[1]).map(([id]) => id);
  const extra   = listed.filter((id) => !actual.includes(id));
  const absent  = actual.filter((id) => !listed.includes(id));
  if (extra.length === 0 && absent.length === 0 && listed.length === Number(m[2])) {
    pass(`${m[1]} id list matches the rows it names`);
  } else {
    if (extra.length)  fail(`${m[1]} list names ${extra.join(', ')}, which are not marked ${m[1]}`);
    if (absent.length) fail(`${m[1]} list omits ${absent.join(', ')}, which are`);
    if (listed.length !== Number(m[2])) fail(`${m[1]} list has ${listed.length} ids but the count says ${m[2]}`);
  }
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
