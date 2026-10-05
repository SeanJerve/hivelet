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
// Two export shapes are read. The scripted form has one 1-to-5 scale per item, so a header is the
// item's own words. The team's hand-built form (30 Sep) has one multiple-choice grid per
// characteristic, so a header reads "Usability [13. I can tell what each screen is for ...]": the
// row text, numbered. Both reduce to the item's words, so both match the same item.
// A row written "English / Filipino" keys on its English half (no item contains " / ").
const itemKey = (h) => { const m = norm(h).match(/\[(.*)\]$/); return norm(m ? m[1] : h).split(' / ')[0].replace(/^\d+\.\s*/, '').trim().toLowerCase(); };
const columnsFor = (title) => header.map((h, i) => [itemKey(h), i]).filter(([h]) => h === itemKey(title)).map(([, i]) => i);
const q1Col = header.findIndex((h) => norm(h).startsWith('Q1.') || /which best describes you/i.test(h));
if (q1Col < 0) { console.error('No "Q1." or "Which best describes you" column: is this the export of the Hivelet survey?'); process.exit(1); }

// ---- scoring ---------------------------------------------------------------
const interpret = (m) => m == null ? '' : m >= 4.21 ? 'Very High Quality' : m >= 3.41 ? 'High Quality' : m >= 2.61 ? 'Moderate Quality' : m >= 1.81 ? 'Low Quality' : 'Very Low Quality';
const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const sd = (a) => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
const f2 = (v) => v == null ? 'no responses' : v.toFixed(2);

// The exact answer first; then its role word, because the hand-built form words the tenant choice
// "Resident of the boarding house" where the script says "Tenant of the boarding house".
const ROLE_WORDS = { owner: /owner|administrator|may-ari/i, tenant: /resident|tenant|nangungupahan/i, tech: /technical evaluator/i, prospect: /looking for a room|naghahanap/i };
const groupOf = (answer) => GROUPS.find((g) => norm(answer) === norm(g.answer))?.key
  ?? (answer ? GROUPS.find((g) => ROLE_WORDS[g.key].test(answer))?.key : undefined);
const byGroup = Object.fromEntries(GROUPS.map((g) => [g.key, records.filter((r) => groupOf(r[q1Col]) === g.key)]));
const unmatched = records.filter((r) => !groupOf(r[q1Col]));
const missingItems = [];

function scores(group, item, answered) {
  const cols = columnsFor(item);
  if (!cols.length) missingItems.push(`${group.label}: ${item}`);
  const vals = [];
  for (const r of byGroup[group.key]) {
    const v = cols.map((i) => r[i]).find((x) => x != null && String(x).trim() !== '');
    const n = Number(String(v ?? '').trim().match(/^[1-5](?!\d)/)?.[0]); // "4", or a grid's "4 — Agree"
    if (Number.isFinite(n) && n >= 1 && n <= 5) { vals.push(n); answered?.add(r); }
  }
  return vals;
}

/** The indicator with the most answers, for the worked computation the course guide asks for. */
let worked = null;

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
  const answered = new Set();
  for (const g of GROUPS) {
    const block = g.items.find(([h]) => h === characteristic);
    if (!block) continue;
    const itemMeans = [];
    for (const item of block[1]) {
      const v = scores(g, item, answered);
      if (!worked || v.length > worked.values.length) worked = { item, group: g.table.toLowerCase(), characteristic, values: v };
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
  summary.push([characteristic, composite, answered.size]);
}

// Rank 1 is the highest composite; ties share a rank. n is the number of respondents who rated the
// characteristic at all (course guide: a rank column and n per characteristic).
const ranked = summary.filter(([, m]) => m != null).map(([, m]) => m).sort((a, b) => b - a);
const rankOf = (m) => (m == null ? '' : ranked.findIndex((x) => x.toFixed(2) === m.toFixed(2)) + 1);
out.push('', '**Table 22.** Summary of Evaluation Results', '', '| Characteristic | n | Composite mean | Interpretation | Rank |', '| :--- | ---: | ---: | :--- | ---: |');
for (const [c, m, n] of summary) out.push(`| ${c} | ${n} | ${f2(m)} | ${interpret(m)} | ${rankOf(m)} |`);
const overall = mean(summary.map(([, m]) => m).filter((m) => m != null));
out.push(`| **Overall** | | **${f2(overall)}** | **${interpret(overall)}** | |`);
const lowest = summary.filter(([, m]) => m != null).sort((a, b) => a[1] - b[1])[0];
if (lowest) out.push('', `> Lowest-rated characteristic: **${lowest[0]}**, ${f2(lowest[1])} (${interpret(lowest[1])}). Chapter 5's recommendation 6 is written for it.`);

// Table 13A: one weighted mean worked in full, WM = Σ(f × w) / N, with the item that has the most answers.
if (worked && worked.values.length) {
  const LABEL = { 5: 'Strongly Agree', 4: 'Agree', 3: 'Neutral', 2: 'Disagree', 1: 'Strongly Disagree' };
  const N = worked.values.length;
  let sum = 0;
  out.push('', '**Table 13A.** Worked Computation of a Weighted Mean', '',
    `Indicator: "${worked.item}" (${worked.characteristic}, rated by ${worked.group}).`, '',
    '| Rating (w) | Meaning | Frequency (f) | f × w |', '| ---: | :--- | ---: | ---: |');
  for (const w of [5, 4, 3, 2, 1]) {
    const fr = worked.values.filter((v) => v === w).length;
    sum += fr * w;
    out.push(`| ${w} | ${LABEL[w]} | ${fr} | ${fr * w} |`);
  }
  const wm = sum / N;
  out.push(`| **Total** | | **N = ${N}** | **Σ(f × w) = ${sum}** |`, '',
    `WM = Σ(f × w) / N = ${sum} / ${N} = **${wm.toFixed(2)}**, which Table 13 reads as **${interpret(wm)}**.`);
}
out.push('', method === 'A'
  ? '> Composite = the mean of the group means (method A, §4.4.2): one owner is not outweighed by many tenants. Overall = the mean of the eight composites.'
  : '> Composite = the mean of every individual answer (method B, §4.4.2). Overall = the mean of the eight composites.');

// Open comments, grouped, for the interpretation paragraphs (read them before writing).
out.push('', '## Open comments (for the interpretation paragraphs; not a manuscript table)');
for (const g of GROUPS) {
  for (const q of g.open) {
    const cols = columnsFor(q);
    // The hand-built form titles each open question "Open comments"; each respondent fills only the
    // one in their own section, so any such column is theirs.
    const use = cols.length ? cols : q !== g.open[0] ? [] : header.map((h, i) => [h, i]).filter(([h]) => /^open comments/i.test(norm(h))).map(([, i]) => i);
    const answers = byGroup[g.key].map((r) => use.map((i) => r[i]).find((x) => x && x.trim())).filter(Boolean);
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
