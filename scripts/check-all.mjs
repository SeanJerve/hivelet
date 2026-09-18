/**
 * check:all — run every verification suite, in one command, from the repo root.
 *
 * WHY THIS EXISTS
 * ---------------
 * There are nineteen suites spread across three package.json files. Running
 * them by hand means three `cd`s and nineteen commands, in the right order,
 * remembering which live where. Before a defense, or after any change, that is
 * exactly the kind of chore that gets half-done - and a suite nobody runs is a
 * suite nobody wrote.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not hide anything. Every suite's own output is printed in full, in
 * order, followed by a summary table. A green line here means that suite said
 * green, not that this script decided it was fine.
 *
 * Three of them need the backend running (`npm run dev:backend`) because they
 * make real HTTP calls: check:api, check:billing and check:adyen build first.
 * The rest read files, the live schema, or the database directly. Nothing here
 * writes to the database - that is a property of the suites themselves, not of
 * this runner, and it is asserted in each of their headers.
 *
 * Exit code is 0 only if every suite exited 0.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** [directory, script, one-line description]. Order: cheapest and most local first. */
const SUITES = [
  ['.', 'check:secrets', 'no credential material in tracked files or the build output'],
  ['.', 'check:rules', 'the business-rule register agrees with itself'],
  ['.', 'check:matrix', 'the traceability matrix agrees with itself'],
  ['.', 'check:copies', 'the filming copies match the documents of record'],
  ['.', 'check:canon', 'no live document carries a retired or banned framing'],
  ['.', 'check:relations', 'separate records agree with each other'],
  ['frontend', 'check:tokens', 'design tokens resolve, and the raw-hex ratchet holds'],
  ['frontend', 'check:reachable', 'every source file is reachable from main.ts'],
  ['frontend', 'check:components', 'every rendered component is one the file can resolve'],
  ['frontend', 'check:labels', 'every form control a person types into has a name'],
  ['frontend', 'check:liveness', 'no screen presents cached or seeded state as a live figure'],
  ['backend', 'check:writes', 'no database write discards its result'],
  ['backend', 'check:columns', 'every column reference resolves, and live_schema.csv is current'],
  ['backend', 'check:fields', 'every snake_case field the frontend reads is one the API sends'],
  ['backend', 'check:endpoints', 'every route has a caller, or a stated reason it has none'],
  ['backend', 'check:ledger', 'the owner\'s money adds up, and the business rules hold in the data'],
  ['backend', 'check:reports', 'the exported workbooks agree with the database, month by month'],
  ['backend', 'check:adyen', 'HMAC signature verification'],
  ['backend', 'check:billing', 'water, grace, period and receipt-allocation arithmetic'],
  ['backend', 'check:api', 'endpoint, RBAC, perimeter and input checks'],
];

const results = [];
const started = Date.now();

for (const [dir, script, what] of SUITES) {
  const label = `${dir === '.' ? '' : dir + ' '}${script}`;
  console.log(`\n${'─'.repeat(74)}\n▸ ${label}  —  ${what}\n${'─'.repeat(74)}`);

  const began = Date.now();
  const r = spawnSync('npm', ['run', '--silent', script], {
    cwd: path.join(root, dir),
    stdio: 'inherit',
    shell: true,
  });
  results.push({
    label,
    ok: r.status === 0,
    seconds: ((Date.now() - began) / 1000).toFixed(1),
  });
}

const failed = results.filter((r) => !r.ok);

console.log(`\n${'═'.repeat(74)}`);
console.log(`  SUMMARY — ${results.length} suites in ${((Date.now() - started) / 1000).toFixed(0)}s`);
console.log('═'.repeat(74));
for (const r of results) {
  console.log(`  ${r.ok ? 'pass' : 'FAIL'}  ${r.label.padEnd(30)} ${r.seconds}s`);
}

if (failed.length === 0) {
  console.log(`\n  All ${results.length} suites green.\n`);
} else {
  console.log(`\n  ${failed.length} suite(s) failed: ${failed.map((f) => f.label).join(', ')}`);
  console.log('  Scroll up — each one printed its own reason.\n');
  console.log('  If check:api, check:billing or check:adyen failed to connect, start the');
  console.log('  backend first: npm run dev:backend\n');
}

process.exit(failed.length === 0 ? 0 : 1);
