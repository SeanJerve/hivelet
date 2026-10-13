#!/usr/bin/env node
// The whole manuscript as one Word file, in the proposal's format, so the team checks it instead of
// retyping it (Sean, 13 October 2026).
//
//   node scripts/manuscript/build-final.mjs           first, to rebuild FINAL/
//   node scripts/manuscript/build-manuscript-docx.mjs -> FINAL/HIVELET_MANUSCRIPT.docx
//
// It holds the Abstract, a table of contents Word fills in when the file is opened, Chapters 1 to 5,
// the References and Appendices A to Q. The front matter that is signed or set by the school (title
// page, approval sheet, certifications, Acknowledgement, Curriculum Vitae) stays in the team's own
// Word file. Pages are numbered in roman numerals before Chapter 1 and from 1 after it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document, Packer, Paragraph, TextRun, Header, AlignmentType, PageNumber, NumberFormat,
  TableOfContents, HeadingLevel,
} from 'docx';
import { convert, runs, PAGE, FONT, BODY, HEADING_STYLES } from './docx-from-markdown.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FINAL = path.join(root, 'FINAL');
const FIG = path.join(root, 'docs', 'FINAL MANUSCRIPT', 'figures');
const read = (f) => fs.readFileSync(path.join(FINAL, f), 'utf8');
const md = (f, o = {}) => convert(read(f), { baseDir: path.dirname(path.join(FINAL, f)), ...o });

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text, font: FONT })] });
const todo = (text) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480 }, children: runs(`**[TO DO: ${text}]**`) });
const figureAppendix = (letter, title, file, figureNo) => [
  h1(`APPENDIX ${letter}: ${title.toUpperCase()}`),
  ...convert(`*Figure ${letter}-1. ${title}, as built (the same diagram as Figure ${figureNo}).*\n\n![${title}](${path.join(FIG, file)})`, { baseDir: FIG }),
];

const front = [
  ...md('01_ABSTRACT.md'),
  // Not a Heading 1, so the table of contents does not list itself.
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: 'TABLE OF CONTENTS', font: FONT, size: 28, bold: true })] }),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
  new Paragraph({ spacing: { before: 240 }, children: runs('*Right-click the table and choose Update Field if it is empty, after adding the lists of tables and figures from the inserted captions.*') }),
];

const appendices = [
  h1('APPENDICES'),
  h1('APPENDIX A: LETTER OF REQUEST'), todo('scan of the signed letter of request to the owner'),
  h1('APPENDIX B: APPOINTMENTS'), todo('scans of the adviser appointment papers'),
  ...md('appendices/APPENDIX_C_GANTT_CHART.md'),
  ...figureAppendix('D', 'Context diagram', 'figure-6-context-diagram.png', '4-3'),
  ...figureAppendix('E', 'Level 1 data flow diagram', 'figure-7-data-flow-level-1.png', '4-4'),
  ...md('appendices/APPENDIX_F_CHILD_DATA_FLOW_DIAGRAMS.md'),
  ...figureAppendix('G', 'Use case diagram', 'figure-8-use-case-diagram.png', '4-5'),
  ...figureAppendix('H', 'Entity-relationship diagram', 'figure-9-entity-relationship.png', '4-6'),
  ...md('appendices/APPENDIX_I_INITIAL_DESIGN.md'),
  h1('APPENDIX J: EVALUATION INSTRUMENT'), todo('the ISO/IEC 25010 questionnaire as administered, all four sections'),
  ...md('appendices/APPENDIX_K_USER_MANUAL.md'),
  h1('APPENDIX L: TEST CASES'), todo('the 26-step walkthrough and the tenant task cards, print-ready'),
  ...md('appendices/APPENDIX_M_CHAPTER_4_EVIDENCE.md'),
  ...md('appendices/APPENDIX_N_DATA_DICTIONARY.md'),
  ...md('appendices/APPENDIX_O_UAT_SIGN_OFF.md'),
  h1('APPENDIX P: INFORMED CONSENT FORM'), todo('the blank consent form, CONSENT_FORM.pdf'),
  ...md('appendices/APPENDIX_Q_SOURCE_CODE.md'),
];

const main = [
  ...md('02_CHAPTER_1_INTRODUCTION.md'),
  ...md('03_CHAPTER_2_THEORETICAL_FRAMEWORK.md'),
  ...md('04_CHAPTER_3_MATERIALS_AND_METHODS.md'),
  ...md('05_CHAPTER_4_RESULTS_AND_DISCUSSION.md'),
  ...md('06_CHAPTER_5_SUMMARY_CONCLUSIONS_AND_RECOMMENDATIONS.md'),
  ...md('07_REFERENCES.md', { references: true }),
  ...appendices,
];

const pageNumbers = () => ({
  default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: BODY })] })] }),
});
const geometry = { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.top, bottom: PAGE.bottom, left: PAGE.left, right: PAGE.right } };

const doc = new Document({
  features: { updateFields: true },
  styles: { default: { ...HEADING_STYLES, document: { run: { font: FONT, size: BODY } } } },
  sections: [
    { properties: { page: { ...geometry, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } }, headers: pageNumbers(), children: front },
    { properties: { page: { ...geometry, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } }, headers: pageNumbers(), children: main },
  ],
});

const out = path.join(FINAL, 'HIVELET_MANUSCRIPT.docx');
fs.writeFileSync(out, await Packer.toBuffer(doc));
console.log(`${front.length + main.length} elements -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
