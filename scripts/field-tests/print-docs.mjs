#!/usr/bin/env node
/**
 * Renders the testing day's Markdown handouts as print-ready A4 pages.
 *
 * Run from this folder:  npm install  (once), then  node print-docs.mjs
 *
 * Writes, beside each source in docs/FINAL MANUSCRIPT/:
 *   TESTING_DAY_FORMS_PRINT.html        every "## Form" starts on a new sheet
 *   TESTING_DAY_TEST_CASES_PRINT.html   every "## Part" starts on a new sheet, landscape
 *   TESTING_DAY_GUIDE_PRINT.html        the guide, portrait
 * and, beside its source in docs/TESTING_DAY/:
 *   OBSERVATION_PROTOCOL_PRINT.html     the facilitator's copy, task cards included
 *
 * The Markdown stays the one source: change it, then re-run this. Open a page in Chrome > Print.
 * Tables keep rows whole across a page break and repeat their header row on each page, and empty
 * table cells print tall enough to write in.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '..', '..', 'docs', 'FINAL MANUSCRIPT');

const JOBS = [
  { src: 'TESTING_DAY_FORMS.md', out: 'TESTING_DAY_FORMS_PRINT.html', breakBefore: /^## Form /, landscape: false, title: 'Testing day forms' },
  { src: 'TESTING_DAY_TEST_CASES.md', out: 'TESTING_DAY_TEST_CASES_PRINT.html', breakBefore: /^## Part /, landscape: true, title: 'Testing day test cases' },
  { src: 'TESTING_DAY_GUIDE.md', out: 'TESTING_DAY_GUIDE_PRINT.html', breakBefore: /^## \d+\. /, landscape: false, title: 'Testing day guide' },
  { src: '../TESTING_DAY/OBSERVATION_PROTOCOL.md', out: '../TESTING_DAY/OBSERVATION_PROTOCOL_PRINT.html', breakBefore: /^## 4\. /, landscape: false, title: 'Observation protocol' },
];

const css = (landscape) => `
@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 9.5pt/1.4 "Segoe UI", system-ui, Arial, sans-serif; color: #111; background: #fff; }
h1 { font-size: 16pt; color: #17603f; margin: 0 0 3mm; }
h2 { font-size: 12.5pt; color: #17603f; margin: 5mm 0 2mm; border-bottom: 1.5px solid #17603f; padding-bottom: 1mm; }
h3 { font-size: 10.5pt; margin: 4mm 0 1.5mm; }
p, ul, ol { margin: 0 0 2mm; }
blockquote { margin: 2mm 0; padding: 2mm 3mm; border-left: 3px solid #b45309; background: #fdf6ec; }
code { font: 8.5pt Consolas, "Courier New", monospace; background: #f1f3f2; padding: 0 2px; border-radius: 2px; }
pre { font: 8pt Consolas, monospace; background: #f1f3f2; padding: 2mm; white-space: pre-wrap; }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; break-inside: avoid; }
th, td { border: 1px solid #999; padding: 1.2mm 1.8mm; vertical-align: top; text-align: left; }
th { background: #e8f1ec; font-size: 8.5pt; }
td:empty { height: 8mm; min-width: 12mm; }
.sheet-break { break-before: page; page-break-before: always; }
input[type=checkbox] { width: 3.5mm; height: 3.5mm; margin-right: 1.5mm; vertical-align: -0.5mm; }
hr { border: 0; border-top: 1px dashed #999; margin: 4mm 0; }
@media screen { body { background: #ddd; } main { max-width: ${landscape ? '281mm' : '194mm'}; margin: 6mm auto; background: #fff; padding: 10mm; box-shadow: 0 1px 6px rgba(0,0,0,.2); } }
`;

for (const job of JOBS) {
  const md = fs.readFileSync(path.join(dir, job.src), 'utf8');
  // Page breaks before each named section, except when it is the first thing on the page.
  const lines = md.split('\n');
  const withBreaks = lines.map((l, i) => (job.breakBefore.test(l) && i > 5 ? `<div class="sheet-break"></div>\n\n${l}` : l)).join('\n');
  // GitHub-style task list items print as real boxes.
  const body = marked.parse(withBreaks, { gfm: true })
    .replace(/<li>\[ \] /g, '<li><input type="checkbox"> ')
    .replace(/<li>\[x\] /gi, '<li><input type="checkbox" checked> ');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${job.title} (print)</title>
<!-- Generated from ${job.src} by scripts/field-tests/print-docs.mjs. Edit the Markdown, then re-run. -->
<style>${css(job.landscape)}</style></head>
<body><main>
${body}
</main></body></html>
`;
  fs.writeFileSync(path.join(dir, job.out), html, 'utf8');
  console.log(`written: ${path.relative(path.resolve(dir, '..', '..'), path.join(dir, job.out)).split(path.sep).join('/')}`);
}
