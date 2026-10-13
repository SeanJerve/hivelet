#!/usr/bin/env node
/**
 * Writes the user acceptance sign-off form as a Word file, for the owner to read, tick and sign
 * (course guide Q4.3.8-4: "Do not report UAT results with no corresponding signed form"; the signed
 * copy goes in Appendix O). One A4 page.
 *
 * Run:  node scripts/build-uat-signoff-docx.mjs
 * Out:  docs/FINAL MANUSCRIPT/UAT_SIGN_OFF_FORM.docx
 *
 * It is Form 6 of TESTING_DAY_FORMS.md, which was printed for 30 September but has no signed copy on
 * record, brought up to date with what the testing found (Chapter 4, Sections 4.3.4 and 4.3.7, and
 * Table 23A). Every fact on it is in Chapter 4; change the chapter first, then this. The boxes are
 * left for the owner to tick: the team does not tick them for her, and she signs only if she agrees.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs', 'FINAL MANUSCRIPT', 'UAT_SIGN_OFF_FORM.docx');

const FONT = 'Arial';
const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 20, bold: o.bold, italics: o.italics });
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: o.after ?? 90, before: o.before ?? 0 }, alignment: o.align, border: o.border });
const heading = (text) => p(t(text, { bold: true }), { before: 140, after: 60 });
const bullet = (text) => p([t('•  '), t(text)], { after: 50 });
const box = (text) => p([t('☐  ', { size: 24 }), t(text)], { after: 60 });
const line = (label, width = 40) => [t(label), t(' ' + '_'.repeat(width))];

const doc = new Document({
  creator: 'Group 4, BS Information Technology, Bicol University College of Science',
  title: 'User acceptance sign-off - Hivelet',
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 1000, right: 1000 } } },
    children: [
      p(t('User Acceptance Sign-off', { bold: true, size: 30 }), { align: AlignmentType.CENTER, after: 60 }),
      p(t('Hivelet: A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House', { bold: true, size: 21 }), { align: AlignmentType.CENTER, after: 40 }),
      p(t('Group 4, BS Information Technology, Bicol University College of Science', { size: 19 }), { align: AlignmentType.CENTER, after: 160, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '17603F', space: 6 } } }),

      p(t('The system was tested at the Fe Galang Da Silva Boarding House on 30 September 2026, on the live system at https://hivelet.vercel.app with the property\'s own records, by the owner (administrator), three tenants and one prospective tenant. Please read the results below. Sign only if you agree with them.')),

      heading('What was tested, and what happened'),
      bullet('The owner went through the 26-step walkthrough (30 rows) on her own laptop and account. 24 rows passed the first time, 1 failed, and 5 were not done as written.'),
      bullet('Three tenants used their own phones and accounts: every task they attempted was completed, 31 of 34 attempts without help.'),
      bullet('One prospective tenant browsed the public site and sent an inquiry about a unit.'),
      bullet('The owner and two tenants used the system at the same time: each tenant saw only their own unit, and no session affected another.'),
      bullet('The one failure: with the connection cut, the Overview showed ₱0 instead of "—". Tested again on your laptop on 13 October, it passed. On one Android phone the "cannot tell whether it was saved" message came late; corrected on 1 October, it was on time when tested again on 13 October.'),

      heading('The parts of the system you used (tick what you used)'),
      box('Units, rates and tenants (moving a tenant in and out)'),
      box('Recording payments and reading Monthly Income'),
      box('Recording expenses and reading Monthly Expenses'),
      box('Repair requests and inquiries'),
      box('Downloading the reports to Excel'),
      box('Tenants viewing their bills and payments and sending repair requests'),

      heading('Your decision (tick one)'),
      box('I accept the system as tested, for use at the boarding house.'),
      box('I accept it, subject to the following:'),
      p(t('_'.repeat(86)), { after: 40 }),
      box('I do not accept it yet. What I would need to see first:'),
      p(t('_'.repeat(86)), { after: 40 }),

      heading('Remarks'),
      p(t('_'.repeat(86)), { after: 40 }),
      p(t('_'.repeat(86)), { after: 200 }),

      p(line('Signature:', 36), { after: 120 }),
      p(line('Name:', 40), { after: 120 }),
      p([t('Owner / administrator (circle one), Fe Galang Da Silva Boarding House')], { after: 120 }),
      p(line('Date signed:', 20), { after: 200 }),
      p(line('Witnessed by (research team):', 30), { after: 60 }),
      p(t('The date is the day you sign, not the testing day. A copy of this form, signed, goes in Appendix O of the manuscript.', { italics: true, size: 17 })),
    ],
  }],
});

fs.writeFileSync(out, await Packer.toBuffer(doc));
console.log('wrote', path.relative(root, out));
