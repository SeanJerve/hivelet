#!/usr/bin/env node
// Appendix J (the questionnaire as administered) and Appendix L (the test cases and their results),
// print-ready, from their sources (13 October 2026):
//
//   node scripts/manuscript/build-appendices-j-l.mjs   -> FINAL/_src/appendices/APPENDIX_J_*.md, APPENDIX_L_*.md
//   then node scripts/manuscript/build-final.mjs
//
// J comes from survey/build_survey_form.gs, the script that built the Google Form, so every item is
// worded and numbered exactly as respondents saw it (the numbering Chapter 3's Table 4B uses).
// L comes from the testing day's result sheets in docs/TESTING_DAY/results/. Only the case, its
// quality, its requirement, what was done, what should happen and the result are kept: the
// Evidence and Notes columns name units and sign-in times that could identify a tenant, and carry
// the team's working notes.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'FINAL', '_src', 'appendices');

// ---- Appendix J -------------------------------------------------------------------------------
const gs = fs.readFileSync(path.join(root, 'docs', 'FINAL MANUSCRIPT', 'survey', 'build_survey_form.gs'), 'utf8');
const consts = gs.slice(0, gs.indexOf('function scale('));
const ctx = {};
vm.runInNewContext(`${consts}\nObject.assign(globalThis.out, { OWNER, TENANT, TECH, PROSPECT, DESCRIPTION, OWNER_ITEMS, OWNER_OPEN, TENANT_ITEMS, TENANT_OPEN, TECH_ITEMS, TECH_OPEN, PROSPECT_ITEMS, PROSPECT_OPEN });`, { out: ctx });
const choices = (q, opts) => `**${q}**\n\n${opts.map((o) => `- ${o}`).join('\n')}\n`;
const section = (title, note, groups, bilingual, open) => {
  let n = 0;
  let s = `## ${title}\n\n${note}\n\n| No. | Statement | 5 | 4 | 3 | 2 | 1 |\n| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`;
  for (const [heading, items] of groups) {
    s += `| | **${heading}** | | | | | |\n`;
    for (const it of items) s += `| ${++n} | ${bilingual ? `${it[0]} *${it[1]}*` : it} | | | | | |\n`;
  }
  s += `\n**Open questions (optional)**\n\n`;
  open.forEach((q, i) => { s += `${i + 1}. ${bilingual ? `${q[0]} *${q[1]}*` : q}\n`; });
  return { text: s, n };
};
const scaleNote = 'Rate each statement: 5 Strongly Agree, 4 Agree, 3 Neutral, 2 Disagree, 1 Strongly Disagree.';
const scaleNoteFil = `${scaleNote} *5 Lubos na Sumasang-ayon, 4 Sumasang-ayon, 3 Walang Kinikilingan, 2 Hindi Sumasang-ayon, 1 Lubos na Hindi Sumasang-ayon.*`;
const o = section('Section 2: Owner and administrator', scaleNote, ctx.OWNER_ITEMS, false, ctx.OWNER_OPEN);
const t = section('Section 3: Tenants', scaleNoteFil, ctx.TENANT_ITEMS, true, ctx.TENANT_OPEN);
const e = section('Section 4: Technical evaluators', `${scaleNote} The form asked evaluators to review the repository and documentation before answering.`, ctx.TECH_ITEMS, false, ctx.TECH_OPEN);
const p = section('Section 5: Prospective tenants', scaleNoteFil, ctx.PROSPECT_ITEMS, true, ctx.PROSPECT_OPEN);
const desc = ctx.DESCRIPTION.split('\n').filter((l) => l && l !== '---');
const J = `# APPENDIX J: EVALUATION INSTRUMENT

The ISO/IEC 25010 questionnaire, as respondents saw it in a Google Form, from 30 September to
4 October 2026. Each respondent answered Section 1, which sent them to the one section for their
group; the item numbers are those of Chapter 3, Table 4B. Rated items: owner and administrator
${o.n}, tenants ${t.n}, technical evaluators ${e.n}, prospective tenants ${p.n}.

**Hivelet System Evaluation: ISO/IEC 25010 Software Quality Assessment**

${desc.map((l, i) => (i >= desc.length / 2 ? `*${l}*` : l)).join('\n\n')}

## Section 1: About you

${choices('Q1. Which best describes you? / Alin ang naglalarawan sa inyo?', [ctx.OWNER, ctx.TENANT, ctx.TECH, ctx.PROSPECT])}
${choices('Q2. How long have you been using or reviewing the system? / Gaano na kayo katagal gumagamit o sumusuri sa sistema?', ['Less than one week / Wala pang isang linggo', 'One to two weeks / Isa hanggang dalawang linggo', 'More than two weeks / Higit sa dalawang linggo'])}
${choices('Q3. Which device did you mainly use? / Anong device ang pangunahin ninyong ginamit?', ['Desktop or laptop computer / Desktop o laptop', 'Mobile phone / Cellphone', 'Tablet / Tablet', 'Both computer and mobile phone / Parehong computer at cellphone'])}
${o.text}
${t.text}
${e.text}
${p.text}`;

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
fs.writeFileSync(path.join(OUT, 'APPENDIX_L_TEST_CASES.md'), tidy(L));
console.log(`J: ${o.n}/${t.n}/${e.n}/${p.n} items; L: ${parts.length} parts`);
