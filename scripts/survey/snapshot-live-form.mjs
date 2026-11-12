#!/usr/bin/env node
// Saves the live Google Form's own text, exactly as respondents see it, so Appendix J can be printed
// from what was asked rather than from what was meant to be asked (13 November 2026):
//
//   node scripts/survey/snapshot-live-form.mjs <the form's respondent link>
//     -> docs/FINAL MANUSCRIPT/survey/LIVE_FORM_SNAPSHOT.json
//   then node scripts/manuscript/build-appendices-j-l.mjs and node scripts/manuscript/build-final.mjs
//
// Why: Appendix J used to come from survey/build_survey_form.gs, the script written to build the
// form. The form was then edited by hand, and by 13 November the two differed in the welcome text, the
// privacy notice, the group labels, the Filipino lines, the open questions and a sentence about
// reviewing the repository that the form never contained. The rated statements had stayed identical.
//
// Only reads: it fetches the page a respondent opens and submits nothing. The link is not stored, so
// the repository does not hand out a way to add responses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'docs', 'FINAL MANUSCRIPT', 'survey', 'LIVE_FORM_SNAPSHOT.json');
const link = process.argv[2];
if (!link) { console.error('usage: node scripts/survey/snapshot-live-form.mjs <respondent link>'); process.exit(1); }

const html = await (await fetch(link)).text();
const m = html.match(/FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);\s*<\/script>/s);
if (!m) throw new Error('No form data in that page: is it the respondent link, and is the form still accepting responses?');
const data = JSON.parse(m[1]);

// Google's own item types, as numbered in FB_PUBLIC_LOAD_DATA_.
const TYPE = { 0: 'short answer', 1: 'paragraph', 2: 'multiple choice', 3: 'dropdown', 4: 'checkboxes', 5: 'linear scale', 7: 'grid', 8: 'section' };
const form = data[1];
const items = (form[1] || []).map((it) => {
  const type = TYPE[it[3]];
  if (!type) throw new Error(`Item "${it[1]}" has type ${it[3]}, which this script does not read`);
  const out = { type, title: it[1] ?? '', description: it[2] ?? '' };
  const q = it[4] || [];
  if (type === 'grid') {
    out.required = q.every((row) => row[2] === 1);
    out.columns = q[0][1].map((c) => c[0]);
    out.rows = q.map((row) => row[3][0]);
  } else if (type !== 'section') {
    out.required = q[0]?.[2] === 1;
    if (q[0]?.[1]) out.options = q[0][1].map((c) => c[0]);
  }
  return out;
});

const snapshot = {
  note: 'The live Google Form as a respondent opens it, saved by scripts/survey/snapshot-live-form.mjs. Do not edit by hand: take a new snapshot.',
  // The local date (Legazpi is UTC+8), so a snapshot taken after midnight is not dated the day before.
  takenOn: new Date().toLocaleDateString('en-CA'),
  title: form[8],
  description: form[0],
  items,
};
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n');
const grids = items.filter((i) => i.type === 'grid');
console.log(`${items.length} items, ${items.filter((i) => i.type === 'section').length} sections, ` +
  `${grids.reduce((n, g) => n + g.rows.length, 0)} rated statements in ${grids.length} grids -> ${path.relative(root, OUT)}`);
