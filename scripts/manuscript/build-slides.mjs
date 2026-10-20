#!/usr/bin/env node
// The defense deck (13 October 2026): node scripts/manuscript/build-slides.mjs
//   -> FINAL/HIVELET DEFENSE SLIDES.pptx
//
// Twenty 16:9 slides in the system's own green, each with speaker notes. Every figure on a slide is
// one of the paper's (docs/FINAL MANUSCRIPT/figures/) and every number is Chapter 4's, so the deck
// cannot say what the paper does not. Names, adviser and date are left for the team to fill.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PptxGenJS from 'pptxgenjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIG = path.join(root, 'docs', 'FINAL MANUSCRIPT', 'figures');
const OUT = path.join(root, 'FINAL', 'HIVELET DEFENSE SLIDES.pptx');

const C = { brand: '17603F', strong: '0E4A30', soft: 'E2F0E7', ink: '101713', faint: '5D6962', line: 'E2E8E3', white: 'FFFFFF' };
const FONT = 'Arial';
const W = 13.333; const H = 7.5;

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = 'Hivelet: capstone defense';
pptx.defineSlideMaster({
  title: 'BODY',
  background: { color: C.white },
  objects: [
    { rect: { x: 0, y: 0, w: W, h: 0.12, fill: { color: C.brand } } },
    { text: { text: 'Hivelet · Fe Galang Da Silva Boarding House', options: { x: 0.6, y: H - 0.45, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: C.faint } } },
  ],
  slideNumber: { x: W - 1.1, y: H - 0.45, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 10, color: C.faint, align: 'right' },
});

const png = (f) => { const b = fs.readFileSync(path.join(FIG, f)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
/** An image fitted inside a box, centered, keeping its proportions. */
function image(slide, file, x, y, w, h) {
  const s = png(file); const k = Math.min(w / s.w, h / s.h);
  const iw = s.w * k; const ih = s.h * k;
  slide.addImage({ path: path.join(FIG, file), x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
}
function titled(title, notes) {
  const s = pptx.addSlide({ masterName: 'BODY' });
  s.addText(title, { x: 0.6, y: 0.35, w: W - 1.2, h: 0.8, fontFace: FONT, fontSize: 28, bold: true, color: C.ink });
  if (notes) s.addNotes(notes);
  return s;
}
const bullets = (s, items, o = {}) => s.addText(
  items.map((t) => ({ text: t, options: { bullet: o.numbered ? { type: 'number', indent: 24 } : { indent: 20 }, breakLine: true } })),
  { x: o.x ?? 0.6, y: o.y ?? 1.45, w: o.w ?? W - 1.2, h: o.h ?? 5.2, fontFace: FONT, fontSize: o.size ?? 21, color: C.ink, valign: 'top', paraSpaceAfter: 14 },
);
function stat(s, x, y, big, small, w = 2.8) {
  s.addText(big, { x, y, w, h: 0.8, fontFace: FONT, fontSize: 34, bold: true, color: C.brand });
  s.addText(small, { x, y: y + 0.75, w, h: 0.7, fontFace: FONT, fontSize: 13, color: C.faint, valign: 'top' });
}
function box(s, x, y, w, h, head, body, size = 13) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: C.soft }, line: { color: C.soft }, rectRadius: 0.12 });
  s.addText(head, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.5, fontFace: FONT, fontSize: size + 3, bold: true, color: C.strong });
  s.addText(body, { x: x + 0.2, y: y + 0.7, w: w - 0.4, h: h - 0.8, fontFace: FONT, fontSize: size, color: C.ink, valign: 'top', paraSpaceAfter: 8 });
}

// 1. Title
{
  const s = pptx.addSlide();
  s.background = { color: C.brand };
  s.addText('Hivelet', { x: 0.8, y: 1.5, w: 11, h: 1.2, fontFace: FONT, fontSize: 60, bold: true, color: C.white });
  s.addText('A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House', { x: 0.8, y: 2.7, w: 11.5, h: 1.0, fontFace: FONT, fontSize: 24, color: C.white });
  s.addText('IT 124 Capstone Project 2 · Group 4, BS Information Technology · Bicol University College of Science', { x: 0.8, y: 4.2, w: 11.5, h: 0.5, fontFace: FONT, fontSize: 14, color: C.soft });
  s.addText('[Team members]   ·   Adviser: [name]   ·   [Defense date]', { x: 0.8, y: 4.8, w: 11.5, h: 0.5, fontFace: FONT, fontSize: 14, color: C.soft });
  s.addNotes('Introduce the team and the client: a 33-unit boarding house in Legazpi City, 32 of them occupied, run by its owner.');
}

// 2. The problem
{
  const s = titled('Before Hivelet: four areas, four separate records', 'Walk the four columns of the figure left to right. The point: every path ends in a record kept apart from the others, or in no record at all (Chapter 4, Section 4.1.1).');
  bullets(s, [
    'Income and expenses typed into a workbook on a USB flash drive, the only copy',
    'Invoices written in a paper book; rent collected in cash on site',
    'Repair requests by message or in person, never recorded',
    'Inquiries through Facebook, referrals, texts and walk-ins, with no record of which unit',
  ], { w: 5.6, size: 17 });
  image(s, 'figure-4-current-process.png', 6.5, 1.25, 6.3, 5.6);
}

// 3. What her records showed
{
  const s = titled('What the owner\'s own records showed', 'These come from transferring her real workbook into the system (Section 4.1.1). The records were kept exactly as she wrote them; the system reports the anomalies rather than correcting them.');
  stat(s, 0.8, 1.6, '937', 'income rows transferred');
  stat(s, 3.9, 1.6, '1,327', 'expense allocations transferred');
  stat(s, 7.0, 1.6, '43%', '402 of the 937 rows had no anniversary date and no deposit');
  stat(s, 10.1, 1.6, '5', 'invoice numbers each used for two payments');
  s.addText('The problem was not the lack of a digital tool. It was that nothing connected one record to another.', { x: 0.8, y: 4.3, w: 11.7, h: 1.2, fontFace: FONT, fontSize: 22, bold: true, color: C.brand });
}

// 4. Objectives
{
  const s = titled('Objectives of the study', 'Read the general objective, then the four specific ones. The conclusions near the end answer each one in the same order.');
  s.addText('To design, develop and evaluate Hivelet, a web-based apartment management system that integrates the boarding house\'s administrative workflow, communication and operational control.', { x: 0.6, y: 1.3, w: W - 1.2, h: 1.0, fontFace: FONT, fontSize: 16, italic: true, color: C.faint });
  bullets(s, [
    'Analyze the existing practices and set the system requirements',
    'Develop tenant and room management, booking, financial tracking with optional online payment, maintenance ticketing and notifications, role-based access control, and PWA support',
    'Pilot test the system for functionality, responsiveness and operational performance',
    'Evaluate and optimize it with the ISO/IEC 25010 software quality model',
  ], { y: 2.5, h: 4.3 });
}

// 5. The gap
{
  const s = titled('What related studies did, and what was missing', 'Each study solves one part. Canlas et al. (2026) is the closest in method and respondents; Puspasari et al. (2025) is the clearest example of the gap: only the manager can use it.');
  box(s, 0.6, 1.4, 3.9, 2.2, 'Magno et al., 2024', 'Apartment rental records and tasks (Negros)');
  box(s, 4.7, 1.4, 3.9, 2.2, 'Pernate et al., 2025', 'Finding and booking boarding house rooms (Ormoc City), ISO/IEC 25010');
  box(s, 8.8, 1.4, 3.9, 2.2, 'Mangca, 2023', 'Boarding house booking with SMS notifications (Surigao City)');
  box(s, 0.6, 3.8, 3.9, 2.2, 'Puspasari et al., 2025', 'Billing notifications, but only the manager uses it');
  box(s, 4.7, 3.8, 3.9, 2.2, 'Canlas et al., 2026', 'Dormitory maintenance reporting, Agile, ISO/IEC 25010');
  s.addShape(pptx.ShapeType.roundRect, { x: 8.8, y: 3.8, w: 3.9, h: 2.2, fill: { color: C.brand }, line: { color: C.brand }, rectRadius: 0.12 });
  s.addText('The gap: one system that integrates records, money, requests and inquiries for a small, cash-based boarding house', { x: 9.0, y: 3.95, w: 3.5, h: 1.9, fontFace: FONT, fontSize: 15, bold: true, color: C.white, valign: 'middle' });
}

// 6. Conceptual framework
{
  const s = titled('Conceptual framework', 'Input, process, output, with feedback into the next iteration (Chapter 2, Section 2.3).');
  image(s, 'figure-2-2-conceptual-framework.png', 1.2, 1.2, 10.9, 5.6);
}

// 7. Method
{
  const s = titled('Method: Agile, in three iterations', 'Iteration 2 is the honest part of the story: it checked the system and its documents against each other and corrected 22 recorded errors, many written in Iteration 1 with the AI assistant and never checked.');
  image(s, 'appendix-c-gantt-chart.png', 0.5, 1.2, 7.6, 4.6);
  bullets(s, [
    'Construction, 24 July to 28 August',
    'Verification, 12 to 14 September: 22 recorded errors corrected',
    'Consolidation and testing, 15 September to the defense',
  ], { x: 8.3, w: 4.6, h: 3.6, size: 17, numbered: true });
  s.addText('Every iteration ran every phase: requirements, design, development, testing, deployment and review.', { x: 8.3, y: 5.0, w: 4.6, h: 1.2, fontFace: FONT, fontSize: 14, italic: true, color: C.faint, valign: 'top' });
}

// 8. Architecture
{
  const s = titled('How it is built', 'Express is the security boundary: the browser never talks to the database directly. Row-level security is on all 24 tables.');
  image(s, 'figure-5-system-architecture.png', 0.5, 1.2, 7.2, 5.5);
  bullets(s, [
    'Vue 3 and TypeScript, a Progressive Web App',
    'Express API in TypeScript',
    'PostgreSQL on Supabase, row-level security on every table',
    'Adyen with GCash for the optional online payment',
    'Hosted on Vercel',
  ], { x: 8.0, w: 4.8, size: 16 });
}

// 9. Features
{
  const s = titled('Six features, one system', 'These are the six the second objective names (Chapter 4, Sections 4.2.2 to 4.2.7).');
  const f = [
    ['Tenants and rooms', 'Move-in, move-out, occupants, deposit; every rate change recorded'],
    ['Booking and inquiries', 'Public catalogue; an inquiry about a unit, answered in a thread'],
    ['Financial tracking', 'The owner\'s own ledger layout, invoice numbers and Excel workbooks'],
    ['Optional GCash payment', 'Through Adyen; counts only after the owner verifies it'],
    ['Repairs and notifications', 'A request with photos, followed to completion'],
    ['Roles and the PWA', 'Each person sees only their part; installs from the browser, reads offline'],
  ];
  f.forEach(([h, b], i) => box(s, 0.6 + (i % 3) * 4.1, 1.4 + Math.floor(i / 3) * 2.6, 3.9, 2.4, h, b));
}

// 10. Screens: public and tenant
{
  const s = titled('What a visitor and a tenant see', 'Left: the public unit catalogue (Figure 4-8). Right: the tenant portal on a phone (Figure 4-11). Sample records; the units and rates are real.');
  image(s, 'figure-11a-public-unit-catalogue.png', 0.5, 1.2, 7.8, 5.6);
  image(s, 'figure-14-tenant-portal-phone.png', 8.6, 1.2, 4.2, 5.6);
}

// 11. Screens: owner
{
  const s = titled('What the owner sees', 'Left: the monthly income ledger in her workbook\'s layout (Figure 4-9). Right: the repair board (Figure 4-10). Sample records.');
  image(s, 'figure-12-monthly-income.png', 0.5, 1.3, 6.1, 5.4);
  image(s, 'figure-13-repairs-board.png', 6.8, 1.3, 6.1, 5.4);
}

// 12. Security
{
  const s = titled('Security', 'Two weaknesses are named in the paper and recommended for later: the sign-in token is kept in the browser\'s storage, and the administrator has no second sign-in factor (Section 4.4.4).');
  bullets(s, [
    'Passwords stored only as bcrypt hashes, each with its own salt',
    'Too many wrong passwords lock the account for 15 minutes; breached passwords are refused',
    'One permission matrix; a tenant sees only their own records',
    'Row-level security on all 24 database tables',
    'Every owner action in an audit trail the application cannot erase',
    'Every gateway message checked by its HMAC signature before anything is written',
  ]);
}

// 13. Testing
{
  const s = titled('Pilot testing: 82 of 83 tests passed (98.8%)', 'Four layers, on the ISO/IEC/IEEE 29119 levels (Table 4-12). The one failure, a ₱0 shown with the connection cut, passed when re-tested on the owner\'s laptop on 13 October. The course standard is 90 percent.');
  const rows = [
    ['Level', 'Activity', 'Executed', 'Passed'],
    ['Unit and integration', 'Automated check suites', '20', '20'],
    ['System', 'Owner\'s functional walkthrough', '25', '24'],
    ['Acceptance', 'Tenant tasks', '34', '34'],
    ['Acceptance', 'Simultaneous use', '4', '4'],
    ['All levels', '', '83', '82 (98.8%)'],
  ].map((r, i) => r.map((t) => ({ text: t, options: { bold: i === 0 || i === 5, color: i === 0 ? C.white : C.ink, fill: { color: i === 0 ? C.brand : i === 5 ? C.soft : C.white } } })));
  s.addTable(rows, { x: 0.8, y: 1.5, w: 11.7, colW: [2.6, 5.1, 1.8, 2.2], fontFace: FONT, fontSize: 16, border: { type: 'solid', color: C.line, pt: 1 }, rowH: 0.6 });
  s.addText('No critical defect. 35 defects found across all activities: 32 resolved, 3 accepted as low risk.', { x: 0.8, y: 5.6, w: 11.7, h: 0.6, fontFace: FONT, fontSize: 16, color: C.brand, bold: true });
}

// 14. Performance and reliability
{
  const s = titled('Fast, and safe when the connection is not', 'Load times are from 30 September on real devices (Table 4-10). The load test used simulated users, not people. Saves arriving at the same instant are refused by the database itself.');
  stat(s, 0.8, 1.5, '3.05 s', 'slowest screen on a phone (the tenant portal\'s first load)');
  stat(s, 3.9, 1.5, '0 of 1,085', 'requests failed with 12 simulated users at once');
  stat(s, 7.0, 1.5, '10 of 10', 'addresses opened with no connection');
  stat(s, 10.1, 1.5, '1 saved', 'when the same receipt was sent five times at once');
  bullets(s, [
    'A page stops waiting after 25 seconds and says so; a save after 45 seconds says it cannot tell whether it arrived',
    'A figure that cannot load is shown as unavailable, never as ₱0',
    'A change on one device appears on another within about 2 seconds',
  ], { y: 3.9, h: 2.6, size: 16 });
}

// 15. User acceptance
{
  const s = titled('The owner and three tenants used it themselves', 'Observed on their own devices with a fixed help ladder; testers thought aloud (Chapter 3, Section 3.3; Chapter 4, Section 4.3.7).');
  stat(s, 0.8, 1.5, '34 of 34', 'tenant tasks completed');
  stat(s, 3.9, 1.5, '31', 'of them without help (91%)');
  stat(s, 7.0, 1.5, '60 s', 'median time per task');
  stat(s, 10.1, 1.5, '24 of 25', 'walkthrough steps the owner performed passed the first time');
  s.addText('Where tenants needed help: the first sign-in and finding their unit and rent. Chapter 5 recommends showing each new tenant those first.', { x: 0.8, y: 4.2, w: 11.7, h: 1.2, fontFace: FONT, fontSize: 18, color: C.ink });
}

// 16. ISO/IEC 25010 results
{
  const s = titled('ISO/IEC 25010 evaluation: 4.59, Very High Quality', 'Composite means (Table 4-17), mean of the group means. Ten respondents: the owner, three tenants, a prospective tenant and five technical evaluators. Every characteristic Very High Quality.');
  const labels = ['Portability', 'Functional Suitability', 'Security', 'Reliability', 'Compatibility', 'Performance Efficiency', 'Usability', 'Maintainability'];
  const values = [4.86, 4.79, 4.68, 4.61, 4.55, 4.48, 4.42, 4.32];
  s.addChart(pptx.ChartType.bar, [{ name: 'Composite mean', labels, values }], {
    x: 0.6, y: 1.3, w: 12.1, h: 5.4, barDir: 'bar', chartColors: [C.brand], valAxisMinVal: 1, valAxisMaxVal: 5,
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 14, valAxisLabelFontSize: 12, catAxisOrientation: 'maxMin',
    showValue: true, dataLabelFontSize: 13, dataLabelFormatCode: '0.00', valGridLine: { color: C.line, size: 1 },
  });
}

// 17. Measured and rated
{
  const s = titled('Measured and rated evidence agree on all eight', 'Usability agrees once the later technical evaluators had rated it. The owner\'s two 3s still mark where a first-time user needs help (Section 4.4.5).');
  bullets(s, [
    '27 of the 31 sub-characteristics measured by tests; 25 rated by the survey',
    'Usability (4.42): nine tasks in ten done without help; the owner rated learning without help lower',
    'Maintainability (4.32): checks pass on every change, but three database calls in four sit inside the request handlers',
    'The 14 comments of 3 October were all acted on by 5 October',
    '51 optimizations in all, each traced to the finding that caused it (Appendix M)',
  ]);
}

// 18. Conclusions
{
  const s = titled('Conclusions: all four objectives achieved', 'One line per objective, in order (Chapter 5, Section 5.2).');
  [
    ['1. Analyze the practices', 'Every gap in the owner\'s practices traced to a requirement and a module'],
    ['2. Develop the system', 'All six features built and in use on her real records, in her own layout'],
    ['3. Pilot test it', '82 of 83 tests passed (98.8%), with no critical defect'],
    ['4. Evaluate and optimize', 'Very High Quality overall (4.59) on ISO/IEC 25010; 51 optimizations made'],
  ].forEach(([h, b], i) => box(s, 0.6 + (i % 2) * 6.15, 1.45 + Math.floor(i / 2) * 2.65, 5.95, 2.45, h, b, 19));
}

// 19. Recommendations
{
  const s = titled('Recommendations', 'Grouped by who acts on them (Chapter 5, Section 5.3).');
  box(s, 0.6, 1.45, 3.9, 5.1, 'The owner', 'Keep the system\'s receipts up to date with her receipt book.\n\nKeep a backup before any change to the records.', 16);
  box(s, 4.7, 1.45, 3.9, 5.1, 'The system', 'Move Adyen from test to live, with refunds.\n\nA protected sign-in cookie and a second sign-in factor.\n\nAutomated browser tests for the 26 walkthrough steps, and faster first loads on phones.\n\nRaise Maintainability (service modules) and Usability (first-use guidance).', 16);
  box(s, 8.8, 1.45, 3.9, 5.1, 'Future researchers', 'Check a system against its own real data, not only against test records.\n\nEvaluate over a longer period, with every tenant.', 16);
}

// 20. Thank you
{
  const s = pptx.addSlide();
  s.background = { color: C.brand };
  s.addText('Thank you', { x: 0.8, y: 2.3, w: 11, h: 1.2, fontFace: FONT, fontSize: 54, bold: true, color: C.white });
  s.addText('Questions, and a live demonstration', { x: 0.8, y: 3.6, w: 11, h: 0.7, fontFace: FONT, fontSize: 24, color: C.soft });
  s.addText('hivelet.vercel.app', { x: 0.8, y: 4.4, w: 11, h: 0.5, fontFace: FONT, fontSize: 18, color: C.white });
  s.addNotes('Switch to the demo: FINAL/DEMO_SCRIPT.md. Test tenant on unit PH only; reject the GCash payment, never verify it.');
}

await pptx.writeFile({ fileName: OUT });
console.log(`20 slides -> ${path.relative(root, OUT)}`);
