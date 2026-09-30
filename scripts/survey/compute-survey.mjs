#!/usr/bin/env node
/**
 * Turns the survey's exported responses into Chapter 4's Tables 12 and 14 to 22.
 *
 * Run:  node scripts/survey/compute-survey.mjs <responses.csv> [--method=A|B] [--out=tables.md]
 *
 *   responses.csv   Google Forms > Responses > the green Sheets icon > File > Download > CSV
 *   --method=A      composite = mean of the group means (Chapter 4 §4.4.2's recommendation, default)
 *   --method=B      composite = mean of every individual answer to that characteristic's items
 *
 * WHY: 91 rated items, four groups (prospective tenants added 2026-09-30), eight characteristics. Every mean, group mean, composite and
 * verbal interpretation in Chapter 4 comes from these responses, and computing them by hand is
 * hours of spreadsheet work where one mis-dragged range changes a result the panel reads.
 *
 * The items are read from `docs/chapter 4 tenative/build_survey_form.gs`, the file that built the
 * form, so the questions scored here are exactly the questions asked. A response column is matched
 * to an item by its header, which Google Forms sets to the question's title. An item asked of two
 * groups with the same words (for example "I can tell what each screen is for without being
 * taught.") appears as two columns; each respondent only ever fills the one in their own section.
 *
 * Items with no answers print as "no responses" rather than 0.00. Nothing is written anywhere but
 * stdout (or --out).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith('--'));
const method = (args.find((a) => a.startsWith('--method='))?.split('=')[1] ?? 'A').toUpperCase();
const outPath = args.find((a) => a.startsWith('--out='))?.split('=')[1];
if (!csvPath || !['A', 'B'].includes(method)) {
  console.error('usage: node scripts/survey/compute-survey.mjs <responses.csv> [--method=A|B] [--out=tables.md]');
  process.exit(1);
}

// ---- the items, from the file that built the form -------------------------
const gsFile = path.join(root, 'docs', 'chapter 4 tenative', 'build_survey_form.gs');
const ctx = {};
vm.createContext(ctx);
const def = vm.runInContext(
  fs.readFileSync(gsFile, 'utf8') + '\n({ OWNER, TENANT, TECH, OWNER_ITEMS, TENANT_ITEMS, TECH_ITEMS, OWNER_OPEN, TENANT_OPEN, TECH_OPEN, PROSPECT, PROSPECT_ITEMS, PROSPECT_OPEN })',
  ctx
);
const GROUPS = [
  { key: 'owner', label: 'Owner', table: 'Owner / administrator', answer: def.OWNER, items: def.OWNER_ITEMS, open: def.OWNER_OPEN },
  { key: 'tenant', label: 'Tenants', table: 'Tenants', answer: def.TENANT, items: def.TENANT_ITEMS.map(([h, list]) => [h, list.map(([en]) => en)]), open: def.TENANT_OPEN.map(([en]) => en) },
  { key: 'tech', label: 'Technical', table: 'Technical evaluators', answer: def.TECH, items: def.TECH_ITEMS, open: def.TECH_OPEN },
  { key: 'prospect', label: 'Prospects', table: 'Prospective tenants', answer: def.PROSPECT, items: def.PROSPECT_ITEMS.map(([h, list]) => [h, list.map(([en]) => en)]), open: def.PROSPECT_OPEN.map(([en]) => en) },
];
const ORDER = ['Functional Suitability', 'Performance Efficiency', 'Compatibility', 'Usability', 'Reliability', 'Security', 'Maintainability', 'Portability'];
const TABLE_NO = { 'Functional Suitability': 14, 'Performance Efficiency': 15, Compatibility: 16, Usability: 17, Reliability: 18, Security: 19, Maintainability: 20, Portability: 21 };

// ---- CSV -------------------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}
const [header, ...records] = parseCsv(fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const columnsFor = (title) => header.map((h, i) => [norm(h), i]).filter(([h]) => h === norm(title)).map(([, i]) => i);
const q1Col = header.findIndex((h) => norm(h).startsWith('Q1.'));
if (q1Col < 0) { console.error('No "Q1." column: is this the export of the Hivelet survey?'); process.exit(1); }

// ---- scoring ---------------------------------------------------------------
const interpret = (m) => m == null ? '' : m >= 4.21 ? 'Very High Quality' : m >= 3.41 ? 'High Quality' : m >= 2.61 ? 'Moderate Quality' : m >= 1.81 ? 'Low Quality' : 'Very Low Quality';
const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const sd = (a) => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
const f2 = (v) => v == null ? 'no responses' : v.toFixed(2);

const byGroup = Object.fromEntries(GROUPS.map((g) => [g.key, records.filter((r) => norm(r[q1Col]) === norm(g.answer))]));
const unmatched = records.filter((r) => !GROUPS.some((g) => norm(r[q1Col]) === norm(g.answer)));
const missingItems = [];

function scores(group, item) {
  const cols = columnsFor(item);
  if (!cols.length) missingItems.push(`${group.label}: ${item}`);
  const vals = [];
  for (const r of byGroup[group.key]) {
    const v = cols.map((i) => r[i]).find((x) => x != null && String(x).trim() !== '');
    const n = Number(v);
    if (Number.isFinite(n) && n >= 1 && n <= 5) vals.push(n);
  }
  return vals;
}

const out = [];
const total = records.length;
out.push(`<!-- Generated by scripts/survey/compute-survey.mjs from ${path.basename(csvPath)}, ${new Date().toISOString().slice(0, 10)}, composite method ${method}. -->`);
out.push('', '**Table 12.** Distribution of Respondents', '', '| Group | Number | Percent |', '| :--- | ---: | ---: |');
for (const g of GROUPS) out.push(`| ${g.table} | ${byGroup[g.key].length} | ${total ? ((100 * byGroup[g.key].length) / total).toFixed(2) : '0.00'}% |`);
out.push(`| **Total** | **${total}** | 100% |`);
if (unmatched.length) out.push('', `> ${unmatched.length} response(s) had an unrecognised answer to Q1 and are left out.`);

const summary = [];
for (const characteristic of ORDER) {
  out.push('', `**Table ${TABLE_NO[characteristic]}.** Evaluation Results for ${characteristic}`, '', '| Indicator | Rated by | Mean | SD | Interpretation |', '| :--- | :--- | ---: | ---: | :--- |');
  const groupMeans = [];
  const everyAnswer = [];
  for (const g of GROUPS) {
    const block = g.items.find(([h]) => h === characteristic);
    if (!block) continue;
    const itemMeans = [];
    for (const item of block[1]) {
      const v = scores(g, item);
      everyAnswer.push(...v);
      const m = mean(v);
      if (m != null) itemMeans.push(m);
      out.push(`| ${item} | ${g.label} | ${f2(m)} | ${v.length > 1 ? sd(v).toFixed(2) : ''} | ${interpret(m)} |`);
    }
    const gm = mean(itemMeans);
    if (gm != null) groupMeans.push(gm);
    out.push(`| **${g.label === 'Technical' ? 'Technical evaluator' : g.label === 'Tenants' ? 'Tenant' : g.label === 'Prospects' ? 'Prospective tenant' : g.label} mean** | | **${f2(gm)}** | | ${interpret(gm)} |`);
  }
  const composite = method === 'A' ? mean(groupMeans) : mean(everyAnswer);
  out.push(`| **Composite mean** | | **${f2(composite)}** | | **${interpret(composite)}** |`);
  summary.push([characteristic, composite]);
}

out.push('', '**Table 22.** Summary of Evaluation Results', '', '| Characteristic | Composite mean | Interpretation |', '| :--- | ---: | :--- |');
for (const [c, m] of summary) out.push(`| ${c} | ${f2(m)} | ${interpret(m)} |`);
const overall = mean(summary.map(([, m]) => m).filter((m) => m != null));
out.push(`| **Overall** | **${f2(overall)}** | **${interpret(overall)}** |`);
out.push('', method === 'A'
  ? '> Composite = the mean of the group means (method A, §4.4.2): one owner is not outweighed by many tenants. Overall = the mean of the eight composites.'
  : '> Composite = the mean of every individual answer (method B, §4.4.2). Overall = the mean of the eight composites.');

// Open comments, grouped, for the interpretation paragraphs (read them before writing).
out.push('', '## Open comments (for the interpretation paragraphs; not a manuscript table)');
for (const g of GROUPS) {
  for (const q of g.open) {
    const cols = columnsFor(q);
    const answers = byGroup[g.key].map((r) => cols.map((i) => r[i]).find((x) => x && x.trim())).filter(Boolean);
    out.push('', `**${g.label}: ${q}** (${answers.length})`);
    for (const a of answers) out.push(`- ${a.replace(/\s+/g, ' ').trim()}`);
  }
}
if (missingItems.length) {
  out.push('', `> WARNING: ${missingItems.length} item(s) had no matching column. The form's wording may have been edited; fix the form or this list before using these tables:`);
  for (const m of missingItems) out.push(`> - ${m}`);
}

const text = out.join('\n') + '\n';
if (outPath) { fs.writeFileSync(outPath, text, 'utf8'); console.log(`written: ${outPath}`); }
else process.stdout.write(text);
if (missingItems.length) process.exitCode = 2;
