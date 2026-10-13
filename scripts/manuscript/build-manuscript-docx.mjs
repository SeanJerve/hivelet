#!/usr/bin/env node
// The whole manuscript as one Word file, in the proposal's format, so the team checks it instead of
// retyping it (Sean, 13 October 2026).
//
//   node scripts/manuscript/build-final.mjs           first, to rebuild FINAL/
//   node scripts/manuscript/build-manuscript-docx.mjs -> FINAL/CLAUDE MANUSCRIPT/
//
// The folder holds CLAUDE MANUSCRIPT.docx and images/, every picture in it named by its figure
// number and caption ("Figure 4-1 - The owner's process before the system.png"). The team pastes
// section by section into its own Word file, which keeps the school's logo, headers and page
// numbers; a highlighted label above each image in the .docx names its file (Sean, 13 Oct 2026).
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
const OUT = path.join(FINAL, 'CLAUDE MANUSCRIPT');
const IMAGES = path.join(OUT, 'images');
fs.rmSync(IMAGES, { recursive: true, force: true });
fs.mkdirSync(IMAGES, { recursive: true });
const used = new Map();
// How many images sit under each figure caption in FINAL/, counted before converting.
const shared = new Map();
for (const f of [...fs.readdirSync(FINAL).filter((x) => /^0\d_.*\.md$/.test(x)), ...fs.readdirSync(path.join(FINAL, 'appendices')).map((x) => `appendices/${x}`)]) {
  let cap = null;
  for (const line of read(f).split(/\r?\n/)) {
    const c = line.trim().match(/^\*(Figure\s+[A-Z0-9]+(?:-\d+)?[a-z]?\..*?)\*$/);
    if (c) { cap = c[1]; continue; }
    if (/^!\[/.test(line.trim()) && cap) shared.set(cap, (shared.get(cap) || 0) + 1);
    if (/^#/.test(line.trim())) cap = null;
  }
}
// "Figure 4-1. The owner's process before the system." -> "Figure 4-1 - The owner's process before the system.png"
function onImage(file, caption) {
  let base = caption
    ? caption.replace(/\.\s*$/, '').replace(/^(Figure [A-Z0-9]+(?:-\d+)?[a-z]?)\.\s*/, '$1 - ')
    : path.basename(file, '.png');
  base = base.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  const n = (used.get(base) || 0) + 1;
  used.set(base, n);
  // A caption over several images (Figure 4-8: the catalogue and the inquiry form) numbers them all.
  const name = `${(shared.get(caption) || 1) > 1 ? `${base} (${n})` : base}.png`;
  fs.copyFileSync(file, path.join(IMAGES, name));
  return `[IMAGE FILE: images/${name}]`;
}
const md = (f, o = {}) => convert(read(f), { baseDir: path.dirname(path.join(FINAL, f)), onImage, ...o });

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text, font: FONT })] });
const todo = (text) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480 }, children: runs(`**[TO DO: ${text}]**`) });
const figureAppendix = (letter, title, file, figureNo) => [
  h1(`APPENDIX ${letter}: ${title.toUpperCase()}`),
  ...convert(`*Figure ${letter}-1. ${title}, as built (the same diagram as Figure ${figureNo}).*\n\n![${title}](${path.join(FIG, file)})`, { baseDir: FIG, onImage }),
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
  ...md('appendices/APPENDIX_J_EVALUATION_INSTRUMENT.md'),
  ...md('appendices/APPENDIX_K_USER_MANUAL.md'),
  ...md('appendices/APPENDIX_L_TEST_CASES.md'),
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

// --out <file> writes elsewhere, for when the team has the manuscript open in Word.
const outArg = process.argv.indexOf('--out');
const out = outArg > 0 ? path.resolve(process.argv[outArg + 1]) : path.join(OUT, 'CLAUDE MANUSCRIPT.docx');
fs.writeFileSync(out, await Packer.toBuffer(doc));
console.log(`${front.length + main.length} elements -> ${path.relative(root, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB), ${fs.readdirSync(IMAGES).length} images`);
