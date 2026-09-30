#!/usr/bin/env node
/**
 * Turns Part A's results table (docs/TESTING_DAY/results/A_ADMIN_Lloyd.md) into the CSV that
 * fill-walkthrough.mjs reads, so Table 10 always comes from the file the team corrects.
 *
 * Run:  node scripts/survey/a-md-to-csv.mjs > docs/TESTING_DAY/results/A_walkthrough.csv
 *
 * Only A-05 to A-32 (the walkthrough steps). NT becomes "Not done". A pass with nothing written in
 * Evidence is "As expected." - the observer wrote nothing because what should be seen was seen.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const md = fs.readFileSync(path.join(root, 'docs/TESTING_DAY/results/A_ADMIN_Lloyd.md'), 'utf8');
const q = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const RESULT = { Pass: 'Pass', Fail: 'Fail', 'Pass after fix': 'Pass after fix', NT: 'Not done' };

const out = ['step,result,actual,notes'];
for (const line of md.split(/\r?\n/)) {
  const c = line.split('|').map((s) => s.trim());
  const id = c[1] ?? '';
  const n = Number(id.slice(2));
  if (!/^A-\d{2}$/.test(id) || n < 5 || n > 32) continue;
  const res = RESULT[c[6]];
  if (!res) { console.error(`${id}: result "${c[6]}" not understood`); process.exit(1); }
  const evidence = (c[7] ?? '').replace(/\*\*/g, '').replace(/`/g, '');
  const actual = evidence || (res === 'Pass' ? 'As expected.' : '');
  out.push([id, res, actual, ''].map(q).join(','));
  // A-28 is walkthrough steps 22 and 22b together.
  if (id === 'A-28') out.push(['22b', res, actual, ''].map(q).join(','));
}
process.stdout.write(out.join('\n') + '\n');
