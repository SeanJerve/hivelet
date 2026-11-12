#!/usr/bin/env node
// Appendix J (the questionnaire as administered) and Appendix L (the test cases and their results),
// print-ready, from their sources (13 October 2026):
//
//   node scripts/manuscript/build-appendices-j-l.mjs            -> FINAL/_src/appendices/APPENDIX_J_*.md
//   node scripts/manuscript/build-appendices-j-l.mjs --with-l   -> and APPENDIX_L_*.md
//   then node scripts/manuscript/build-final.mjs
//
// L is rebuilt only with --with-l: since 13 October it has been edited in FINAL/_src (the
// 4 November re-run, "Landlady" for the owner's role), and a rebuild would undo those edits.
//
// J comes from survey/LIVE_FORM_SNAPSHOT.json, the live Google Form's own text saved by
// scripts/survey/snapshot-live-form.mjs (13 November 2026), so every notice, label and item is worded
// and numbered exactly as respondents saw it (the numbering Chapter 3's Table 3-6 uses). It used to
// come from survey/build_survey_form.gs, the script written to build the form; the form was edited by
// hand afterwards, and J printed a repository instruction, Filipino lines and open questions that
// respondents never saw.
// L comes from the testing day's result sheets in docs/TESTING_DAY/results/. Only the case, its
// quality, its requirement, what was done, what should happen and the result are kept: the
// Evidence and Notes columns name units and sign-in times that could identify a tenant, and carry
// the team's working notes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'FINAL', '_src', 'appendices');

// ---- Appendix J -------------------------------------------------------------------------------
const form = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'FINAL MANUSCRIPT', 'survey', 'LIVE_FORM_SNAPSHOT.json'), 'utf8'));
// "2026-11-13" as "13 November 2026", read as written rather than through a time zone.
const longDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`;
};
// The form's own line breaks, one paragraph or list line each; trailing spaces are the form's, not text.
const lines = (s) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const choices = (it) => `**${it.title.trim()}**\n\n${it.options.map((o) => `- ${o.trim()}`).join('\n')}\n`;
const sectionTitles = [];
const counts = [];
let body = '';
let rows = 0;
let n = 0;
const endTable = () => { if (rows) { body += '\n'; rows = 0; } };
for (const it of form.items) {
  const title = it.title.trim();
  if (it.type === 'section') {
    endTable();
    if (sectionTitles.length) counts.push(n);
    n = 0;
    // The form numbers only its first section; the appendix numbers them all, keeping the form's titles.
    const number = sectionTitles.length + 1;
    sectionTitles.push(title);
    body += `\n## ${/^Section \d+:/.test(title) ? title : `Section ${number}: ${title}`}\n\n`;
    const [first, ...scale] = lines(it.description);
    if (first) body += `${first}\n\n${scale.map((l) => `- ${l}`).join('\n')}${scale.length ? '\n\n' : ''}`;
  } else if (it.type === 'grid') {
    if (!rows) body += '| No. | Statement | 5 | 4 | 3 | 2 | 1 |\n| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n';
    body += `| | **${title}** | | | | | |\n`;
    rows++;
    for (const r of it.rows) {
      const m = r.trim().match(/^(\d+)\.\s+(.*)$/);
      if (!m || Number(m[1]) !== ++n) throw new Error(`"${r}" is not item ${n} of "${sectionTitles.at(-1)}"`);
      body += `| ${m[1]} | ${m[2]} | | | | | |\n`;
    }
  } else if (it.type === 'multiple choice') {
    endTable();
    // The consent question comes before Section 1, with the privacy notice as its description.
    if (!sectionTitles.length) body += `**${title}**\n\n${lines(it.description).join('\n\n')}\n\n${it.options.map((o) => `- ${o.trim()}`).join('\n')}\n\n`;
    else body += `${choices(it)}\n`;
  } else if (it.type === 'short answer' || it.type === 'paragraph') {
    endTable();
    // The name field's placeholder is a team member's name; the field itself is what was asked.
    const ask = /^Full Name/.test(title) ? '' : lines(it.description).join(' ');
    body += `**${title}**${ask ? `: ${ask}` : ''}\n\n`;
  } else throw new Error(`Appendix J cannot print a "${it.type}" item`);
}
endTable();
counts.push(n);
// Section 1 (About you) has no rated items; the four groups' sections follow it.
const [, o, t, e, p] = counts;
const J = `# APPENDIX J: EVALUATION INSTRUMENT

The ISO/IEC 25010 questionnaire that respondents answered in a Google Form, from 30 September to
18 October 2026 and again in the second round, from 31 October to 10 November 2026, printed from the
live form as it stood on ${longDate(form.takenOn)}. The questions are worded exactly as in the responses
exported from it in both rounds. The form opens with a short description and the data privacy notice
through which the prospective tenants and the technical evaluators gave their consent (Section 3.4),
then asks for an optional name. Each respondent answered Section 1, which sent them to the one
section for their group. The item numbers are those of Chapter 3, Table 3-6. Section 2, answered by
the landlady, has ${o} rated items, Section 3 for tenants ${t}, Section 4 for technical evaluators ${e},
and Section 5 for prospective tenants ${p}. Every rated item and every open comment had to be
answered; the consent question and the name did not.

**${form.title.trim()}**

${lines(form.description).join('\n\n')}

${body.trim()}
`;

// ---- Appendix L -------------------------------------------------------------------------------
const R = path.join(root, 'docs', 'TESTING_DAY', 'results');
const DROP = /^(Evidence|Notes)$/i;
function mainTable(file) {
  const lines = fs.readFileSync(path.join(R, file), 'utf8').split(/\r?\n/);
  const start = lines.findIndex((l) => /^\|\s*ID\s*\|/.test(l));
  if (start < 0) throw new Error(`no ID table in ${file}`);
  const rows = [];
  for (let i = start; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i]);
  const cells = (l) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const head = cells(rows[0]);
  const keep = head.map((h, i) => (DROP.test(h) ? -1 : i)).filter((i) => i >= 0);
  return rows.map((r, ri) => `| ${keep.map((i) => (ri === 1 ? ':---' : (cells(r)[i] ?? ''))).join(' | ')} |`).join('\n');
}
const parts = [
  ['Part A. Owner and administrator (A-05 to A-32 are the 26-step walkthrough)', 'A_ADMIN_Lloyd.md'],
  ['Part T. Tenant tasks (testers coded T1 to T3; P done alone, PH done with help, F not done, NT not tried)', 'T_TENANTS_Vince.md'],
  ['Part P. Public site', 'P_PUBLIC_Kiel.md'],
  ['Part C. Simultaneous use', 'C_TOGETHER_Kiel.md'],
  ['Part O. Offline, weak signal and installing', 'O_OFFLINE_Sean.md'],
  ['Part S. Security', 'S_SECURITY_Sean.md'],
  ['Part CO. Browsers and devices', 'CO_BROWSERS_Eljohn.md'],
  ['Part PF. Performance timings (seconds)', 'PF_TIMINGS_Eljohn.md'],
  ['Part N. Changes shipped on 30 September', 'N_NEW_TODAY_unassigned.md'],
];
let L = `# APPENDIX L: TEST CASES

The test cases run on 30 September 2026 on the live system, with their results, as summarized in
Chapter 4, Sections 4.3.4 to 4.3.7. Each case names the ISO/IEC 25010 characteristic it tests (FS
Functional Suitability, PE Performance Efficiency, CO Compatibility, US Usability, RE Reliability,
SE Security, MA Maintainability, PO Portability) and the requirement it traces to. Results: Pass;
Fail; Pass after fix; NT, not tested. The prospective tenant's task cards (Part PR) were not
recorded on the day and are not shown.
`;
for (const [title, file] of parts) L += `\n## ${title}\n\n${mainTable(file)}\n`;

// The paper's spelling is American (APA 7), and a result sheet's "Claude, 30 Sep" names who ran an
// automated browser check, which the reader needs only as "automated test".
const tidy = (s) => s
  .replace(/\benquir(y|ies|e|ed|es|ing)\b/g, 'inquir$1').replace(/\bEnquir(y|ies|e|ed|es|ing)\b/g, 'Inquir$1')
  .replace(/\banalys(e|ed|es|ing)\b/g, 'analyz$1').replace(/\bper cent\b/g, 'percent')
  .replace(/\bClaude,\s*/g, 'Automated test, ');
fs.writeFileSync(path.join(OUT, 'APPENDIX_J_EVALUATION_INSTRUMENT.md'), tidy(J));
if (process.argv.includes('--with-l')) fs.writeFileSync(path.join(OUT, 'APPENDIX_L_TEST_CASES.md'), tidy(L));
console.log(`J: ${o}/${t}/${e}/${p} items` + (process.argv.includes('--with-l') ? `; L: ${parts.length} parts` : '; L left as it is (--with-l to rebuild it)'));
