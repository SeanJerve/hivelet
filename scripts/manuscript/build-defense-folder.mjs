#!/usr/bin/env node
// The defense checklist folder: one folder per item of Form 2 (the Pre-Defense Clearance Checklist),
// numbered as the form numbers them, holding what the item asks for, so the team can see at a glance
// what is ready and what is missing (Sean, 10 November 2026).
//
//   node scripts/manuscript/build-final.mjs              first, to rebuild FINAL/
//   node scripts/manuscript/build-manuscript-docx.mjs    then the Word manuscript
//   node scripts/manuscript/build-defense-folder.mjs     then this
//
// It writes to `_DEFENSE CHECKLIST/` at the top of the checkout it runs in, outside the code
// folders. The folder is committed, so both machines have it (Sean, 10 Nov 2026). The repository is
// public until P9 makes it private: a signed scan put here is published by the next commit.
//
// It never deletes a file it did not write. Each folder's `.generated.json` lists what this script
// put there; anything else is the team's (a scan, a signed form) and is left alone and reported in
// `00 STATUS`. Markdown documents are converted to Word so they print as they are.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, Packer } from 'docx';
import { convert, PAGE, FONT, BODY, HEADING_STYLES, CAPTION_STYLES } from './docx-from-markdown.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(repo, '_DEFENSE CHECKLIST');
const FIG = 'docs/FINAL MANUSCRIPT/figures';
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Manila' });

// What each folder holds. `files` are copied from the repository ({ md } is converted to Word),
// `text` files are written here, and `needs` is what only a person can supply. An item with no
// needs is READY; with files and needs it is PARTLY; with needs and nothing else it is MISSING.
const md = (from, as) => ({ md: from, as });
const cp = (from, as) => ({ from, as });
// A blank form from the FIC (the LMS), kept in the folder below, copied to the item that uses it.
const FORMS = '_DEFENSE CHECKLIST/Forms from the FIC (blank)';
const form = (name) => cp(`${FORMS}/${name}`, `${name.replace(/\.(docx|xlsx)$/, '')} (blank).${name.split('.').pop()}`);
const ITEMS = [
  { no: '01', name: 'Manuscript, Chapters I to V', asks: 'Chapters I to V complete and on the Form 1 template, with the front matter, references and annexes.', who: 'Content Adviser',
    files: [cp('FINAL/CLAUDE MANUSCRIPT/CLAUDE MANUSCRIPT.docx', 'Hivelet manuscript (Abstract, Chapters 1 to 5, References, Appendices A to R).docx')],
    needs: ['The front matter in the team\'s Word file: title page, approval sheet, defense date and room, each member\'s Curriculum Vitae (P3)', 'The Acknowledgement (P4)', 'Scans for Appendices A (letter of request) and B (adviser appointments) (P10)', 'A check of the layout against the Form 1 template'] },
  { no: '02', name: 'Content Adviser comments addressed', asks: 'All comments of the Content Adviser on the latest draft addressed.', who: 'Content Adviser',
    needs: ['The consultation record with the Content Adviser'] },
  { no: '03', name: 'Literature Map', asks: 'The Literature Map required by Form 3A, prepared and attached.', who: 'Content Adviser',
    files: [md('FINAL/appendices/APPENDIX_R_LITERATURE_MAP.md', 'Appendix R - Literature Map.docx'), cp(`${FIG}/appendix-r-literature-map.png`, 'Figure R-1 - Literature map.png')] },
  { no: '04', name: 'Citations and references', asks: 'Citations and the reference list in the style the Form 1 template prescribes.', who: 'Content Adviser',
    files: [md('FINAL/07_REFERENCES.md', 'References (APA 7, 35 entries).docx')],
    needs: ['A check of the reference style against the Form 1 template'] },
  { no: '05', name: 'Similarity report', asks: 'A similarity check of the full manuscript, within the University\'s threshold.', who: 'Content Adviser',
    needs: ['The similarity report (the FIC sets the threshold)'] },
  { no: '06', name: 'Live demonstration', asks: 'All planned modules developed, integrated and working, shown live.', who: 'Programming Adviser',
    files: [md('FINAL/DEMO_SCRIPT.md', 'Demo script.docx')],
    text: { 'The live system.txt': 'https://hivelet.vercel.app\n\nThe owner and each tenant sign in with their own account. The demonstration uses the test tenant in unit PH (DEMO_SCRIPT, the day before).\n' } },
  { no: '07', name: 'Revision log', asks: 'Revisions after testing documented, and the revision log up to date.', who: 'Programming Adviser',
    files: [md('FINAL/FORM_2_EVIDENCE/REVISION_LOG.md', 'Revision log.docx')] },
  { no: '08', name: 'Test plan and test results', asks: 'The test plan executed: at least 90% of cases pass, every critical defect logged and resolved.', who: 'Programming Adviser',
    files: [md('FINAL/appendices/APPENDIX_L_TEST_CASES.md', 'Appendix L - Test cases and results (30 September 2026).docx'), md('docs/TESTING_DAY/results/RERUN_2026-11-04.md', 'Rerun of all 114 test cases (4 November 2026).docx')],
    text: { 'Summary.txt': '82 of 83 test cases passed on 30 September 2026 (98.8%), above the 90% Form 2 asks for. No critical defect was found in any activity: 35 defects were found, 32 resolved and 3 accepted as low risk with the reason recorded (Chapter 4, Table 4-20). Table 4-12 gives the results by test level. On 4 November 2026 all 114 cases were run again and none failed.\n' } },
  { no: '09', name: 'UAT sign-off', asks: 'User Acceptance Testing done and signed off by the client.', who: 'Programming Adviser',
    files: [cp('docs/FINAL MANUSCRIPT/UAT_SIGN_OFF_FORM.docx', 'UAT sign-off form (blank, to print).docx')],
    needs: ['The scan of the form signed by the owner (P1). She signs only if she agrees. Never sign it for her'] },
  { no: '10', name: 'Deployment report and acceptance form or MOA', asks: 'Deployed or pilot-tested in its intended environment, with the client or end-user acceptance signed.', who: 'Programming Adviser',
    files: [md('FINAL/FORM_2_EVIDENCE/DEPLOYMENT_REPORT.md', 'Deployment report.docx')],
    needs: ['A Client or End-User Acceptance Form, or an MOA. None exists yet: ask the FIC whether the signed UAT form of item 09 serves'] },
  { no: '11', name: 'User manual and repository', asks: 'The user manual complete, and the source code in version control, open to the Programming Adviser.', who: 'Programming Adviser',
    files: [md('FINAL/appendices/APPENDIX_K_USER_MANUAL.md', 'Appendix K - User manual.docx'), cp('docs/FINAL MANUSCRIPT/TENANT_QUICK_GUIDE_PRINT.html', 'Tenant quick guide (open in a browser and print).html')],
    text: { 'Repository.txt': 'https://github.com/SeanJerve/hivelet\n\nIf the repository is made private before the defense (P9), add the Programming Adviser as a collaborator, or this item fails.\n' } },
  { no: '12', name: 'Context diagram', asks: 'A Context Diagram, in the standard model (Form 3B annex).', who: 'Programming Adviser',
    files: [cp(`${FIG}/figure-6-context-diagram.png`, 'Figure 4-3 and Appendix D - Context diagram.png')] },
  { no: '13', name: 'Data flow diagrams, Gane and Sarson, to Level 2', asks: 'A Data Flow Diagram in Gane and Sarson notation, down to Level 2 (Form 3B annex).', who: 'Programming Adviser',
    files: [cp(`${FIG}/figure-7-data-flow-level-1.png`, 'Figure 4-4 and Appendix E - Level 1.png'), md('FINAL/appendices/APPENDIX_F_CHILD_DATA_FLOW_DIAGRAMS.md', 'Appendix F - Level 2, all eight processes.docx'),
      ...['1-inquiries', '2-units-and-rates', '3-tenancies', '4-billing-and-payments', '5-repair-requests', '6-expenses', '7-reports', '8-account'].map((k) => cp(`${FIG}/appendix-f-dfd-${k}.png`, `Figure F-${k[0]} - Level 2, process ${k[0]}.0.png`))] },
  { no: '14', name: 'Use case diagram', asks: 'A Use Case Diagram of the actors, use cases and the system (Form 3B annex).', who: 'Programming Adviser',
    files: [cp(`${FIG}/figure-8-use-case-diagram.png`, 'Figure 4-5 and Appendix G - Use case diagram.png')] },
  { no: '15', name: 'Entity-relationship diagram', asks: 'An ERD or database diagram that supports the system (Form 3B annex).', who: 'Programming Adviser',
    files: [cp(`${FIG}/figure-9-entity-relationship.png`, 'Figure 4-6 and Appendix H - Entity-relationship diagram.png'), md('FINAL/appendices/APPENDIX_N_DATA_DICTIONARY.md', 'Appendix N - Data dictionary.docx')] },
  { no: '16', name: 'Consultation record, Content Adviser', asks: 'The consultation record with the Content Adviser, with the signed sessions the FIC sets.', who: 'FIC', files: [md('FINAL/FORM_2_EVIDENCE/CONSULTATION_RECORD.md', 'Consultation record, Sir Jayvee (to print and sign).docx')], needs: ['The consultation record signed by Sir Jayvee for each session (he is both advisers, so one record serves items 16 and 17)'] },
  { no: '17', name: 'Consultation record, Programming Adviser', asks: 'The consultation record with the Programming Adviser, with the signed sessions the FIC sets.', who: 'FIC', files: [md('FINAL/FORM_2_EVIDENCE/CONSULTATION_RECORD.md', 'Consultation record, Sir Jayvee (to print and sign).docx')], needs: ['The consultation record signed by Sir Jayvee for each session (the same record as item 16)'] },
  { no: '18', name: 'Form 3A, signed by the Content Adviser', asks: 'Form 3A signed by the Content Adviser, all 16 items ticked.', who: 'FIC', files: [form('Form 03A - Content Adviser Endorsement.docx'), md('FINAL/FORM_2_EVIDENCE/FORMS_3A_3B_CHECK.md', 'Forms 3A and 3B checked item by item.docx')], needs: ['Form 3A, signed (original). All 16 items are met'] },
  { no: '19', name: 'Form 3B, signed by the Programming Adviser', asks: 'Form 3B signed by the Programming Adviser, all 6 items ticked, with the four diagram annexes (items 12 to 15) attached.', who: 'FIC', files: [form('Form 03B - Programming Adviser Endorsement.docx'), md('FINAL/FORM_2_EVIDENCE/FORMS_3A_3B_CHECK.md', 'Forms 3A and 3B checked item by item.docx')], needs: ['Form 3B, signed (original). All 6 items are met'] },
  { no: '20', name: 'Mock defense evaluation', asks: 'The mock or practice defense held and evaluated.', who: 'FIC', needs: ['The mock defense evaluation'] },
  { no: '21', name: 'Actions on the mock defense', asks: 'Every recommendation from the mock defense acted on.', who: 'FIC', needs: ['The list of actions taken. Send the recommendations and Claude records what was done'] },
  { no: '22', name: 'Slides and demo script', asks: 'The final slides and the live demonstration script ready, with a backup copy of the system and the slides.', who: 'FIC',
    files: [cp('FINAL/HIVELET DEFENSE SLIDES.pptx', 'Hivelet defense slides.pptx'), md('FINAL/DEFENSE_PRESENTATION_SCRIPT.md', 'What to say on each slide.docx'), md('FINAL/DEMO_SCRIPT.md', 'Demo script.docx')],
    needs: ['Slide 1: the names, the adviser and the date', 'A backup copy of the system and the slides'] },
  { no: '23', name: 'Copies for the panel and advisers', asks: 'Complete manuscript copies for the three panelists and the two advisers.', who: 'FIC', needs: ['Five printed copies of the manuscript'] },
];
const EXTRA = [
  { folder: "Proponent's Checklist - Phase 1, item 04 Annexes, UAT and acceptance", asks: 'The signed UAT Sign-off Form and the signed Client or End-User Acceptance Form or MOA in the annexes.', who: 'Client',
    needs: ['The signed UAT form (see Form 2 item 09)', 'The acceptance form or MOA (see Form 2 item 10)'] },
  { folder: "Proponent's Checklist - Phase 2 Scheduling and panel (items 10 to 15)", later: true, asks: 'Form 4 filled in and signed (FIC, both advisers, the panel\'s conforme), the appointment letters (Form 6) signed by the Dean and delivered, manuscript copies to the panel, and the FIC\'s other requirements, such as honoraria.', who: 'FIC, panel, Dean',
    files: [form('Form 04 - Final Defense Form.docx'), form('Form 06 - Appointment Letters.docx'), form('CS Form 48 - Daily Time Record.docx')],
    needs: ['Form 4, filled in and signed', 'Form 6, the appointment letters signed by the Dean, with each conforme', 'The receiving copy signed by each panelist and adviser'] },
  { folder: "Proponent's Checklist - Phase 3 Final defense (items 16 to 21)", later: true, asks: 'The defense kit (three Form 5A, one Form 5B, one Form 7, one Form 4), the presentation and demo set up, the panel\'s recommendations on Form 7 and its signatures.', who: 'Panel',
    files: [form('Form 05A - Panelist Grade Sheet.docx'), form('Form 05B - Summary Grade Sheet.docx'), form('Form 07 - Revision Form.xlsx')],
    needs: ['Form 7 with every recommendation, signed by the panel and both advisers', 'Forms 5A and 5B, filled in by the panel'] },
  { folder: "Proponent's Checklist - Phase 4 Revisions (items 22 to 26)", later: true, asks: 'Every recommendation on Form 7 carried out and recorded on Form 8, Part A (manuscript) and Part B (system), signed by both advisers.', who: 'Advisers',
    files: [form('Form 08 - Compliance Form.xlsx')],
    needs: ['Form 8, filled in and signed by both advisers'] },
  { folder: "Proponent's Checklist - Phase 5 Editing and approval (items 27 to 32)", later: true, asks: 'The editor\'s certification (Form 9), a final similarity check, the final manuscript with its signed front matter, the approval sheet, and the final PDF for the FIC.', who: 'Editor, advisers, FIC',
    files: [form("Form 09 - Editor's Certification.docx")],
    needs: ['Form 9, signed by the editor', 'The final similarity report', 'The approval sheet, signed', 'The final PDF, cleared to print'] },
  { folder: "Proponent's Checklist - Phase 5, item 31 Turnover package", asks: 'The user manual, the source code and database script, installation and deployment notes, and the repository link.', who: 'Programming Adviser',
    files: [md('FINAL/appendices/APPENDIX_K_USER_MANUAL.md', 'User manual (Appendix K).docx'), md('FINAL/FORM_2_EVIDENCE/DEPLOYMENT_REPORT.md', 'Deployment report, with the installation notes in Section 6.docx')],
    text: { 'Repository.txt': 'https://github.com/SeanJerve/hivelet\n' },
    needs: ['The database script, a schema-only dump of the live database. Never database/FULL_DATABASE_SCHEMA.sql, which does not describe it (Sean)'] },
  { folder: 'Consent forms - Appendix P', asks: 'Every tester consented in writing (Chapter 3, Section 3.4). The blank form is Appendix P.', who: 'Team',
    files: [cp('docs/FINAL MANUSCRIPT/CONSENT_FORM.pdf', 'Informed consent form (blank, Appendix P).pdf')],
    text: { 'Where the signed forms are.txt': 'The signed scans are kept in "_CONSENT_FORMS (not in repo)" beside this folder, because they carry names and signatures: the landlady (scanned twice), tenant F1, tenant F2F and the tenant in unit 2, sent 29 October 2026. Do not copy them into anything that is shared or printed for the panel.\n\nF1 agreed to take part only: no screen recording, no photos, no face. Blur or crop F2F\'s face unless he confirms.\n' },
    needs: ['Scans of the ten second-round tenants\' signed forms, kept private in _CONSENT_FORMS (not in repo). Prospects and evaluators consented in the questionnaire', '"Research team member present" filled in on all four paper originals'] },
  { folder: 'Study guides', asks: 'Not a Form 2 item: the team\'s guides for studying the capstone and the defense.', who: 'Team',
    files: [md('FINAL/00_HOW_TO_STUDY.md', '0 How to study (start here).docx'), md('FINAL/STUDY_GUIDE_TEAM_REVIEWER.md', '1 Team reviewer, the whole capstone in one sitting.docx'),
      md('FINAL/STUDY_GUIDE_DEFENSE_QA.md', '2 Defense questions and answers.docx'), md('FINAL/STUDY_GUIDE_PAPER_WALKTHROUGH.md', '3 Paper walkthrough.docx'),
      md('FINAL/STUDY_GUIDE_GLOSSARY.md', '4 Glossary.docx'), md('FINAL/STUDY_GUIDE_REFERENCES.md', '5 References guide.docx'),
      md('FINAL/STUDY_GUIDE_CODE.md', '6 Code guide.docx'), md('FINAL/STUDY_GUIDE_CODE_FRONTEND_FILES.md', '7 Frontend files.docx'), md('FINAL/STUDY_GUIDE_CODE_BACKEND_FILES.md', '8 Backend files.docx')] },
];

// ---------------------------------------------------------------------------------------------
async function toDocx(from, to) {
  const file = path.join(repo, from);
  const children = convert(fs.readFileSync(file, 'utf8'), { baseDir: path.dirname(file), firstHeadingPageBreak: false });
  const doc = new Document({
    styles: { default: { ...HEADING_STYLES, document: { run: { font: FONT, size: BODY } } }, paragraphStyles: CAPTION_STYLES },
    sections: [{ properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.left, right: PAGE.right } } }, children }],
  });
  fs.writeFileSync(to, await Packer.toBuffer(doc));
}

const ABOUT = '_ABOUT THIS ITEM.txt';
async function fill(dir, item, label) {
  fs.mkdirSync(dir, { recursive: true });
  const manifest = path.join(dir, '.generated.json');
  const before = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : [];
  const written = [ABOUT];
  for (const f of item.files ?? []) {
    const to = path.join(dir, f.as);
    if (f.md) await toDocx(f.md, to); else fs.copyFileSync(path.join(repo, f.from), to);
    written.push(f.as);
  }
  for (const [name, body] of Object.entries(item.text ?? {})) { fs.writeFileSync(path.join(dir, name), body); written.push(name); }
  // The team's own files: anything this script did not write, now or before.
  const theirs = fs.readdirSync(dir).filter((f) => !f.startsWith('.') && !written.includes(f) && !before.includes(f) && !f.startsWith('MISSING - '));
  // A "MISSING - ..." note stands in for each need until the team puts a file here.
  for (const f of fs.readdirSync(dir).filter((f) => f.startsWith('MISSING - '))) fs.rmSync(path.join(dir, f));
  const needs = item.needs ?? [];
  if (needs.length && !theirs.length) {
    needs.forEach((n, i) => {
      const name = `MISSING - ${String(i + 1)} ${n.replace(/[\\/:*?"<>|]/g, '').slice(0, 70).trim()}.txt`;
      fs.writeFileSync(path.join(dir, name), `${n}\n\nPut the scan or file in this folder, then run node scripts/manuscript/build-defense-folder.mjs again.\n`);
      written.push(name);
    });
  }
  // Files this script wrote before but no longer writes (a renamed output) go; the team's never do.
  for (const f of before) if (!written.includes(f) && !theirs.includes(f) && fs.existsSync(path.join(dir, f))) fs.rmSync(path.join(dir, f));
  const status = item.later && !theirs.length ? 'LATER' : !needs.length ? 'READY' : theirs.length ? 'CHECK' : (item.files?.length || item.text) ? 'PARTLY' : 'MISSING';
  fs.writeFileSync(path.join(dir, ABOUT), [
    label, '',
    `What the form asks: ${item.asks}`,
    `Checked or signed by: ${item.who}`,
    `Status on ${today}: ${status}`, '',
    'Here:', ...(item.files ?? []).map((f) => `  - ${f.as}`), ...Object.keys(item.text ?? {}).map((f) => `  - ${f}`),
    ...(theirs.length ? ['', 'Added by the team:', ...theirs.map((f) => `  - ${f}`)] : []),
    ...(needs.length ? ['', 'Still needed (only a person can supply these):', ...needs.map((n) => `  - ${n}`)] : []),
    '', 'Rebuilt by node scripts/manuscript/build-defense-folder.mjs. It never deletes a file the team put here.', '',
  ].join('\r\n'));
  fs.writeFileSync(manifest, JSON.stringify(written, null, 1));
  return { status, needs, theirs };
}

fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const it of ITEMS) {
  const folder = `Form 2 - ${it.no} ${it.name}`;
  rows.push({ folder, ...(await fill(path.join(OUT, folder), it, `Form 2, item ${Number(it.no)}: ${it.name}`)) });
}
for (const it of EXTRA) rows.push({ folder: it.folder, ...(await fill(path.join(OUT, it.folder), it, it.folder)) });

const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
const count = (s) => rows.filter((r) => r.status === s).length;
fs.writeFileSync(path.join(OUT, '00 STATUS - what is here and what is missing.txt'), [
  `DEFENSE CHECKLIST: Hivelet, Fe Galang Da Silva Boarding House`,
  `Status on ${today}. One folder per item of Form 2 (Pre-Defense Clearance Checklist), numbered as`,
  `the form numbers them, then the Proponent's Checklist items Form 2 does not cover.`, '',
  `READY ${count('READY')}   PARTLY ${count('PARTLY')}   MISSING ${count('MISSING')}   CHECK ${count('CHECK')}   LATER ${count('LATER')}`, '',
  'READY    everything the item asks for is here',
  'PARTLY   the documents are here, and something only a person can supply is still needed',
  'MISSING  nothing yet: it needs a signature, a scan or a paper',
  'CHECK    the team put a file in the folder: open it and confirm the item is complete',
  'LATER    not due yet: on or after the defense day. The blank forms are already there', '',
  ...rows.flatMap((r) => [`${pad(r.status, 9)}${r.folder}`, ...r.needs.map((n) => `           still needed: ${n}`), ...r.theirs.map((f) => `           added by the team: ${f}`)]),
  '', 'Put each scan or signed form in its folder and run, from the hivelet folder:',
  '  node scripts/manuscript/build-defense-folder.mjs',
  'The folder "Forms from the FIC (blank)" holds the forms as the FIC sent them. The paper itself is in FINAL/,',
  'and FINAL/00_READ_ME_FIRST.md says what every file there is for.', '',
].join('\r\n'));
console.log(`${OUT}\n` + rows.map((r) => `  ${pad(r.status, 8)} ${r.folder}`).join('\n'));
