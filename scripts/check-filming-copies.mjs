/**
 * check:copies — the documents filmed from must match the documents of record.
 *
 * Run with `npm run check:copies`. Reads files and writes nothing.
 *
 * WHY THIS EXISTS
 * ---------------
 * `VIDEO PRESENTATION DOCS/` holds copies of the Phase 1-3 outputs, and it is
 * **gitignored** (`.gitignore:61`). So the copies do not travel with the
 * repository, they are never reviewed in a diff, and nothing ever compared them
 * to the originals.
 *
 * Measured on 2026-09-16, they had drifted badly:
 *
 *   05_section5_dfd_traceability.md          126 differing lines
 *   06b_section6_business_rule_crosswalk.md   88
 *   01_SCRIPT_defense_pack.md                 33
 *   04c_section4_security_and_rls.md          16
 *
 * Every difference was the copy being older. The security copy still said the
 * transaction gap was Open, three days after migration `018` closed the payment
 * path, and still carried a claim about `update_expense_entry_total()` that the
 * original had corrected as an overclaim. The DFD copy still contained the
 * closure proof over 20 tables that this audit disproved.
 *
 * These are the files a camera points at. A stale copy is not a documentation
 * problem; it is a wrong sentence said out loud to a panel.
 *
 * WHY IT SKIPS RATHER THAN FAILS WHEN THE FOLDER IS ABSENT
 * --------------------------------------------------------
 * The folder is ignored, so a fresh clone does not have it. Absent is normal;
 * present-and-different is not. The run says which case it saw, so a skip is
 * visible rather than silent - the same reason the build scan in
 * `check:secrets` reports how many files it read.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COPIES = path.join(root, 'VIDEO PRESENTATION DOCS');
const OUTPUTS = path.join(root, 'docs', 'claude_pipeline', 'outputs');

/** Filming copy -> the document of record it is taken from. */
const PAIRS = [
  ['01_SCRIPT_defense_pack.md', 'PHASE3_DEFENSE_PACK.md'],
  ['01_FILMING_SCRIPT.md', 'PHASE3_FILMING_SCRIPT.md'],
  ['02_panel_recommendation_register.md', 'PHASE3_PANEL_RECOMMENDATION_REGISTER.md'],
  ['03_section3_architecture.md', 'PHASE1_ARCHITECTURE_AND_PATTERN.md'],
  ['04a_section4_erd_and_data_dictionary.md', 'PHASE2_ERD_AND_DATA_DICTIONARY.md'],
  ['04b_section4_3NF_proof.md', 'PHASE2_NORMALIZATION_PROOF.md'],
  ['04c_section4_security_and_rls.md', 'PHASE2_SECURITY_AND_RLS.md'],
  ['05_section5_dfd_traceability.md', 'PHASE1_DFD_TRACEABILITY.md'],
  ['06b_section6_business_rule_crosswalk.md', 'PHASE1_BR_CROSSWALK.md'],
];

let failures = 0;
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  OK    ${m}`);

if (!existsSync(COPIES)) {
  console.log('check:copies — no "VIDEO PRESENTATION DOCS" folder here.');
  console.log('               That is normal: it is gitignored and does not travel with a clone.');
  console.log('\nALL CHECKS PASSED');
  process.exit(0);
}

console.log(`check:copies — ${PAIRS.length} filming copies against their documents of record\n`);

/** Line-level difference count, so the message says how far apart they are. */
function differingLines(a, b) {
  const x = a.split('\n');
  const y = b.split('\n');
  const setY = new Map();
  for (const l of y) setY.set(l, (setY.get(l) ?? 0) + 1);
  let only = 0;
  for (const l of x) {
    const n = setY.get(l) ?? 0;
    if (n === 0) only += 1;
    else setY.set(l, n - 1);
  }
  const leftover = [...setY.values()].reduce((s, n) => s + n, 0);
  return only + leftover;
}

let checked = 0;
for (const [copy, original] of PAIRS) {
  const cPath = path.join(COPIES, copy);
  const oPath = path.join(OUTPUTS, original);

  if (!existsSync(oPath)) { fail(`${original} does not exist — this pairing is wrong`); continue; }
  if (!existsSync(cPath)) continue; // a copy that was never made is not drift

  checked += 1;
  const c = readFileSync(cPath, 'utf8');
  const o = readFileSync(oPath, 'utf8');

  if (c === o) {
    pass(`${copy} matches ${original}`);
  } else {
    fail(`${copy} differs from ${original} by ${differingLines(c, o)} line(s)`);
  }
}

if (checked === 0) {
  console.log('  no filming copies present to compare');
} else if (failures) {
  console.log('\n  These are the files a camera points at. Refresh them from');
  console.log('  docs/claude_pipeline/outputs/ before filming, or film from the originals.');
  console.log('  Every drift found on 2026-09-16 was the copy being older, never better.');
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
