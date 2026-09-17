/**
 * refresh:copies — bring the filming copies back in step with their documents.
 *
 * Run with `npm run refresh:copies` from the repo root. Copies files; changes
 * nothing else.
 *
 * WHY THIS EXISTS
 * ---------------
 * `VIDEO PRESENTATION DOCS/` holds nine copies of Phase 1-3 outputs, and the
 * folder is **gitignored** (`.gitignore:61`). So every correction made to a
 * document of record leaves its filming copy silently one revision behind, on
 * one machine, with nothing in version control to notice.
 *
 * `check:copies` catches the drift. Until now, fixing it meant reading its
 * output and copying nine paths by hand - and on 2026-09-17 I edited the defense
 * pack, watched that check go red, misread the runner's output as a connection
 * problem, and committed anyway. A one-line fix that takes nine manual steps is
 * a fix that gets skipped.
 *
 * DIRECTION IS DELIBERATE AND ONE-WAY: outputs -> copies, never the reverse.
 * Every drift found on 2026-09-16 was the copy being older, never better. If a
 * copy has ever been edited directly, this overwrites that edit - which is
 * correct, because the document of record is the one under version control.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COPIES = path.join(root, 'VIDEO PRESENTATION DOCS');
const OUTPUTS = path.join(root, 'docs', 'claude_pipeline', 'outputs');

/** Filming copy -> the document of record it is taken from. Mirrors check:copies. */
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

console.log('refresh:copies — filming copies from the documents of record\n');

if (!fs.existsSync(COPIES)) {
  console.log(`  "VIDEO PRESENTATION DOCS" is not on this machine, so there is nothing to refresh.`);
  console.log('  That folder is gitignored, so a fresh clone will not have it. Nothing to do.');
  process.exit(0);
}

let refreshed = 0;
let already = 0;
let missing = 0;

for (const [copy, source] of PAIRS) {
  const from = path.join(OUTPUTS, source);
  const to = path.join(COPIES, copy);

  if (!fs.existsSync(from)) {
    console.log(`  MISSING  ${source} — the document of record is not there`);
    missing++;
    continue;
  }

  const wanted = fs.readFileSync(from, 'utf8');
  const current = fs.existsSync(to) ? fs.readFileSync(to, 'utf8') : null;

  if (current === wanted) {
    already++;
    continue;
  }

  fs.writeFileSync(to, wanted, 'utf8');
  const was = current === null ? 'created' : 'updated';
  console.log(`  ${was}  ${copy}`);
  refreshed++;
}

console.log(
  `\n  ${refreshed} refreshed, ${already} already in step` +
  (missing ? `, ${missing} with no document of record` : '')
);
console.log('  Run `npm run check:copies` to confirm.');

if (missing) process.exit(1);
