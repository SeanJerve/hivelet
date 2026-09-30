#!/usr/bin/env node
/**
 * Fills Chapter 4's Table 10 (the 26-step walkthrough) from the owner session's notes.
 *
 * Run:  node scripts/survey/fill-walkthrough.mjs <results.csv> [--write] [--chapter=<path>]
 *
 * results.csv - a copy of walkthrough-results-template.csv, one line per step:
 *   step     the Table 10 step (1 ... 26, 15b, 19b, 22b, 23b) OR the test case (A-05 ... A-32)
 *   result   Pass | Fail | Pass after fix | Not done
 *   actual   what actually happened, in a sentence (goes in the "Actual result" column)
 *   notes    anything else (help given, the defect number); printed, not written to the table
 *
 * Without --write it prints the filled table and the counts the chapter's paragraph needs. With
 * --write it replaces Table 10's rows in the chapter (only the Actual and Pass-or-fail columns
 * change; the steps, functions and expected results are kept as the chapter has them). A step
 * with no line stays [DATA PENDING]: nothing is filled from expectation.
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
if (!csvPath) { console.error('usage: node scripts/survey/fill-walkthrough.mjs <results.csv> [--write]'); process.exit(1); }

// TESTING_DAY_TEST_CASES.md part A, "(n)" = walkthrough step n.
const CASE_TO_STEP = {
  'A-05': '1', 'A-06': '2', 'A-07': '3', 'A-08': '4', 'A-09': '5', 'A-10': '6', 'A-11': '7', 'A-12': '8',
  'A-13': '9', 'A-14': '10', 'A-15': '11', 'A-16': '12', 'A-17': '13', 'A-18': '14', 'A-19': '15', 'A-20': '15b',
  'A-21': '16', 'A-22': '17', 'A-23': '18', 'A-24': '19', 'A-25': '19b', 'A-26': '20', 'A-27': '21', 'A-28': '22',
  'A-29': '23', 'A-30': '23b', 'A-31': '24', 'A-32': '26',
};

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}
const [head, ...lines] = parseCsv(fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
const col = (n) => head.findIndex((h) => h.trim().toLowerCase() === n);
const C = { step: col('step'), result: col('result'), actual: col('actual'), notes: col('notes') };
if (C.step < 0 || C.result < 0) { console.error('The CSV needs "step" and "result" columns (see the template).'); process.exit(1); }

const RESULTS = { pass: 'Pass', fail: 'Fail', 'pass after fix': 'Pass after fix', 'not done': 'Not done' };
const results = new Map();
const problems = [];
for (const r of lines) {
  if (/^example/i.test((r[C.notes] ?? '').trim())) continue;
  let step = (r[C.step] ?? '').trim().toUpperCase();
  if (CASE_TO_STEP[step]) step = CASE_TO_STEP[step];
  step = step.toLowerCase();
  const res = RESULTS[(r[C.result] ?? '').trim().toLowerCase()];
  if (!res) { problems.push(`step ${step}: result "${r[C.result]}" is not Pass, Fail, Pass after fix or Not done`); continue; }
  const actual = (r[C.actual] ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  results.set(step, { res, actual, notes: (r[C.notes] ?? '').trim() });
}

const raw = fs.readFileSync(chapter, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const md = raw.replace(/\r\n/g, '\n'); // worked on as LF, written back in the file's own line endings
const start = md.indexOf('**Table 10.**');
if (start < 0) { console.error('Table 10 not found in ' + chapter); process.exit(1); }
const tableStart = md.indexOf('| Step |', start);
const tableEnd = md.indexOf('\n\n', tableStart);
const tableLines = md.slice(tableStart, tableEnd).split('\n');
const seen = new Set();
const filled = tableLines.map((line, i) => {
  if (i < 2) return line;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (!cells.length) return line;
  const step = cells[0].toLowerCase();
  const r = results.get(step);
  if (!r) return line;
  seen.add(step);
  cells[3] = r.actual || (r.res === 'Pass' ? 'As expected' : '[DATA PENDING: say what happened]');
  cells[4] = r.res;
  return `| ${cells.join(' | ')} |`;
});
for (const s of results.keys()) if (!seen.has(s)) problems.push(`step ${s}: no such row in Table 10`);

const counts = {};
for (const { res } of results.values()) counts[res] = (counts[res] ?? 0) + 1;
const totalRows = tableLines.length - 2;
console.log(filled.join('\n'));
console.log(`\nRows: ${totalRows}. Filled: ${results.size}. ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')}. Still pending: ${totalRows - seen.size}.`);
const notable = [...results.entries()].filter(([, r]) => r.res !== 'Pass' || r.notes);
if (notable.length) {
  console.log('\nFor the paragraph (every step that did not simply pass, and every note):');
  for (const [s, r] of notable) console.log(`- step ${s}: ${r.res}${r.actual ? ` - ${r.actual}` : ''}${r.notes ? ` [notes: ${r.notes}]` : ''}`);
}
if (problems.length) { console.log('\nWARNING:'); for (const p of problems) console.log('- ' + p); process.exitCode = 2; }

if (write && !problems.length) {
  const tag = md.slice(start, tableStart).replace('[DATA PENDING]', seen.size === totalRows ? '' : '[PARTLY FILLED]').replace(/[ \t]+\n/, '\n');
  fs.writeFileSync(chapter, (md.slice(0, start) + tag + filled.join('\n') + md.slice(tableEnd)).replace(/\n/g, eol), 'utf8');
  console.log(`\nwritten: Table 10 in ${path.relative(root, chapter)}`);
} else if (write) console.log('\nNot written: fix the warnings first.');
