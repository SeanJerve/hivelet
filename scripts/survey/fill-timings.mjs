#!/usr/bin/env node
/**
 * Fills Chapter 4's Table 11 (page load and response times) from the timing sheet.
 *
 * Run:  node scripts/survey/fill-timings.mjs <timings.csv> [--write] [--chapter=<path>]
 *
 * timings.csv - a copy of timings-template.csv, one line per case and device:
 *   case     PF-01 ... PF-08 (TESTING_DAY_TEST_CASES.md part PF)
 *   device   laptop | phone
 *   run1, run2, run3   seconds (a decimal point, not a comma)
 *
 * Each cell is the MEDIAN of the runs given (three are asked for; one or two are reported as they
 * are, and say so). Table 11's five rows come from PF-01, PF-03, PF-04, PF-05 and PF-06; PF-02, PF-07
 * and PF-08 are printed as supporting figures. Without --write it only prints. Cells with no data
 * stay empty: nothing is filled from expectation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith('--'));
const write = args.includes('--write');
const chapter = args.find((a) => a.startsWith('--chapter='))?.split('=')[1]
  ?? path.join(root, 'docs', 'FINAL MANUSCRIPT', 'CHAPTER_4_RESULTS_AND_DISCUSSION.md');
if (!csvPath) { console.error('usage: node scripts/survey/fill-timings.mjs <timings.csv> [--write]'); process.exit(1); }

const ROWS = [
  ['PF-01', 'Public home page, first load'],
  ['PF-03', 'Sign-in to dashboard'],
  ['PF-04', 'Income ledger, one full year'],
  ['PF-05', 'Excel export of one year'],
  ['PF-06', 'Tenant portal, first load'],
];
const SUPPORTING = { 'PF-02': 'Public home page, second load', 'PF-07': 'Tenant payments', 'PF-08': 'Sending a repair request' };

const lines = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
const head = lines.shift().split(',').map((h) => h.trim().toLowerCase());
const at = (n) => head.indexOf(n);
const data = new Map();
const problems = [];
for (const l of lines) {
  const c = l.split(',').map((x) => x.trim());
  if (/example/i.test(l)) continue;
  const key = `${c[at('case')]?.toUpperCase()}|${c[at('device')]?.toLowerCase()}`;
  const runs = ['run1', 'run2', 'run3'].map((r) => c[at(r)]).filter((v) => v !== undefined && v !== '').map(Number);
  if (runs.some((n) => !Number.isFinite(n) || n < 0)) { problems.push(`${key}: a run is not a number of seconds`); continue; }
  if (!['laptop', 'phone'].includes(c[at('device')]?.toLowerCase())) { problems.push(`${key}: device must be laptop or phone`); continue; }
  data.set(key, runs);
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const cell = (id, dev) => {
  const runs = data.get(`${id}|${dev}`);
  if (!runs?.length) return '';
  const v = `${median(runs).toFixed(1)} s`;
  return runs.length === 3 ? v : `${v} (${runs.length} run${runs.length > 1 ? 's' : ''})`;
};

const table = ['| Screen | Workstation (Table 2) | Mobile phone (Table 3) |', '| :--- | :--- | :--- |',
  ...ROWS.map(([id, label]) => `| ${label} | ${cell(id, 'laptop')} | ${id === 'PF-04' || id === 'PF-05' ? (cell(id, 'phone') || 'n/a') : cell(id, 'phone')} |`)];
console.log(table.join('\n'));
console.log('\nSupporting (not in Table 11):');
for (const [id, label] of Object.entries(SUPPORTING)) console.log(`- ${label} (${id}): laptop ${cell(id, 'laptop') || '-'}, phone ${cell(id, 'phone') || '-'}`);
console.log('\nEvery run, for the record:');
for (const [k, runs] of data) console.log(`- ${k.replace('|', ' ')}: ${runs.join(', ')} s`);
if (problems.length) { console.log('\nWARNING:'); for (const p of problems) console.log('- ' + p); process.exitCode = 2; }

if (write && !problems.length) {
  const raw = fs.readFileSync(chapter, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const md = raw.replace(/\r\n/g, '\n'); // worked on as LF, written back in the file's own line endings
  const start = md.indexOf('**Table 11.**');
  const tStart = md.indexOf('| Screen |', start);
  const tEnd = md.indexOf('\n\n', tStart);
  if (start < 0 || tStart < 0) { console.error('Table 11 not found'); process.exit(1); }
  fs.writeFileSync(chapter, (md.slice(0, tStart) + table.join('\n') + md.slice(tEnd)).replace(/\n/g, eol), 'utf8');
  console.log(`\nwritten: Table 11 in ${path.relative(root, chapter)} (write the device, browser, network and date in the paragraph under it)`);
}
