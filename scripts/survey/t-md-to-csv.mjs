#!/usr/bin/env node
/**
 * Turns the Part T results table (docs/TESTING_DAY/results/T_TENANTS_Vince.md) into the observations
 * CSV that compute-uat.mjs reads, so Table 11C always comes from the file the team corrects.
 *
 * Run:  node scripts/survey/t-md-to-csv.mjs > docs/TESTING_DAY/results/T_observations.csv
 *
 * Times "7:28 – 7:31" are PM clock times on the sheet and become 19:28, 19:31. A time taken from the
 * Activity log ("7:34 (log)") is a moment, not a start and an end, so it gives no time on task and
 * is left blank, as is "not timed".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const md = fs.readFileSync(path.join(root, 'docs/TESTING_DAY/results/T_TENANTS_Vince.md'), 'utf8');
const said = {};
for (const m of md.matchAll(/^- \*\*(T\d):\*\* "([^"]+)"/gm)) said[m[1]] = m[2];

const pm = (hm) => { const [h, m] = hm.split(':').map(Number); return `${h < 12 ? h + 12 : h}:${String(m).padStart(2, '0')}`; };
function times(cell) {
  const r = cell.match(/^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/);
  return r ? [pm(r[1]), pm(r[2])] : ['', ''];
}
const q = (s) => (/[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

const out = ['tester,device,case,start,end,success,errors,help_given,said'];
for (const line of md.split(/\r?\n/)) {
  const c = line.split('|').map((s) => s.trim());
  if (!/^T-\d{2}$/.test(c[1] ?? '')) continue;
  for (let t = 0; t < 3; t++) {
    const [time, result, errors] = c.slice(4 + t * 3, 7 + t * 3);
    const tester = `T${t + 1}`;
    const isQuestion = c[1] === 'T-18';
    const [start, end] = times(time);
    out.push([tester, '', c[1], start, end, isQuestion ? 'NT' : result, errors || '0', '', isQuestion ? said[tester] ?? '' : ''].map(q).join(','));
  }
}
process.stdout.write(out.join('\n') + '\n');
