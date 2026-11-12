/**
 * Chapter 4's diagrams (Figures 4 to 9), Chapter 2's conceptual framework (Figure 2-2) and the
 * Gantt chart and child data flow diagrams of Appendices C and F, drawn as SVG from what the system is, then rendered to
 * PNG by headless Chrome for the .docx.
 *
 *   node scripts/build-chapter-4-diagrams.mjs            all of them
 *   node scripts/build-chapter-4-diagrams.mjs erd        one, by key
 *
 * Every box, flow and relationship here was read from the running system on 5 October 2026, not
 * from a plan: the tables, keys and nullability from the live database catalogue (pg_attribute,
 * pg_constraint), the flows from the API routes and backend/src/config/rbac.ts, the hosting from
 * vercel.json and the two package.json files. Never from database/FULL_DATABASE_SCHEMA.sql, which
 * does not describe this database (CLAUDE.md rule 2). If the schema changes, change the ERD here.
 *
 * Sizes: the .docx fits a figure into 6 in by 8.5 in, so a canvas about 900 px wide prints its
 * 15 px text at about 7 pt. Keep canvases near that width and fonts at 13 px or more.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs', 'FINAL MANUSCRIPT', 'figures');
const srcDir = path.join(outDir, 'diagrams');

// ---------------------------------------------------------------------------------------------
// Drawing primitives. Black on white, one weight of line, Arial: the manuscript prints in mono.
// ---------------------------------------------------------------------------------------------
const FONT = 'Arial, Helvetica, sans-serif';
const INK = '#111';
const MUTED = '#555';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy word wrap by an average Arial glyph width. Good enough to lay out; check by eye. */
function wrap(text, width, size) {
  const max = Math.max(4, Math.floor(width / (size * 0.52)));
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (!line) line = word;
      else if ((line + ' ' + word).length <= max) line += ' ' + word;
      else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

/** Text block whose middle sits at y. `w` wraps; `anchor` is start, middle or end. */
function T(x, y, text, o = {}) {
  const size = o.size ?? 15;
  const lh = o.lh ?? Math.round(size * 1.22);
  const lines = o.w ? wrap(text, o.w, size) : String(text).split('\n');
  const top = o.top != null ? o.top + size * 0.8
    : o.bottom != null ? o.bottom - (lines.length - 1) * lh - size * 0.25
    : y - ((lines.length - 1) * lh) / 2 + size * 0.35;
  const attrs = [
    `x="${x}"`, `y="${top.toFixed(1)}"`, `font-family="${FONT}"`, `font-size="${size}"`,
    `text-anchor="${o.anchor ?? 'middle'}"`, `fill="${o.fill ?? INK}"`,
    o.weight ? `font-weight="${o.weight}"` : '', o.italic ? 'font-style="italic"' : '',
    o.rotate ? `transform="rotate(${o.rotate} ${x} ${y})"` : '',
    o.halo ? 'stroke="#fff" stroke-width="6" stroke-linejoin="round" paint-order="stroke"' : '',
  ].filter(Boolean).join(' ');
  return `<text ${attrs}>${lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('')}</text>`;
}

function rect(x, y, w, h, o = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 0}" fill="${o.fill ?? '#fff'}" ` +
    `stroke="${o.stroke ?? INK}" stroke-width="${o.sw ?? 1.6}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
}

/** A labelled box centred on (cx, cy). */
function box(cx, cy, w, h, label, o = {}) {
  return rect(cx - w / 2, cy - h / 2, w, h, o) +
    T(cx, cy, label, { w: w - 16, size: o.size ?? 15, weight: o.weight, italic: o.italic, fill: o.fill === undefined ? INK : INK });
}

/** Flowchart document symbol: a box with a wavy bottom edge. */
function doc(cx, cy, w, h, label, o = {}) {
  const x = cx - w / 2, y = cy - h / 2, b = y + h - 8;
  const d = `M${x},${y} H${x + w} V${b} C${x + w * 0.75},${b - 12} ${x + w * 0.6},${b + 14} ${x + w / 2},${b + 4} ` +
    `C${x + w * 0.35},${b - 6} ${x + w * 0.2},${b + 14} ${x},${b + 2} Z`;
  return `<path d="${d}" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` + T(cx, cy - 4, label, { w: w - 16, size: o.size ?? 15 });
}

/** A line through points, with arrowheads at the end, the start, or both. */
function line(pts, o = {}) {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const ends = o.head === 'both' ? ' marker-start="url(#arrS)" marker-end="url(#arr)"'
    : o.head === 'start' ? ' marker-start="url(#arrS)"'
    : o.head === 'none' ? '' : ' marker-end="url(#arr)"';
  return `<path d="${d}" fill="none" stroke="${o.stroke ?? INK}" stroke-width="${o.sw ?? 1.5}"` +
    `${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${ends}/>`;
}

/** A line that hops over a crossing at x (a horizontal run) - the standard way to show it is not a join. */
function hopH(x1, y, x2, hops, o = {}) {
  const dir = Math.sign(x2 - x1);
  const xs = [...hops].sort((a, b) => dir * (a - b));
  let d = `M${x1},${y}`;
  for (const hx of xs) d += ` L${hx - 6 * dir},${y} A6,6 0 0 ${dir > 0 ? 1 : 0} ${hx + 6 * dir},${y}`;
  d += ` L${x2},${y}`;
  const ends = o.head === 'both' ? ' marker-start="url(#arrS)" marker-end="url(#arr)"' : o.head === 'none' ? '' : ' marker-end="url(#arr)"';
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.5"${ends}/>`;
}

const DEFS = `<defs>
  <marker id="arr" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
    <path d="M0,0.5 L10,5 L0,9.5 Z" fill="${INK}"/></marker>
  <marker id="arrS" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
    <path d="M0,0.5 L10,5 L0,9.5 Z" fill="${INK}"/></marker>
</defs>`;

/**
 * Gane and Sarson symbols (Form 2 item 13 asks for this notation). A process is a rounded
 * rectangle centred on (cx, cy) with its number in a band across the top; an external entity is a
 * square with a shaded edge. Lines meet a process at its flat sides, hw and hh from the centre.
 */
function gsProc(cx, cy, hw, hh, n, name, o = {}) {
  const top = cy - hh, band = o.band ?? 26;
  return rect(cx - hw, top, 2 * hw, 2 * hh, { rx: 12, sw: 1.7 }) +
    line([[cx - hw, top + band], [cx + hw, top + band]], { head: 'none', sw: 1.2 }) +
    T(cx, top + band / 2, n, { size: o.nsize ?? 14, weight: 'bold' }) +
    T(cx, cy + band / 2, name, { w: 2 * hw - 16, size: o.size ?? 13.5, weight: o.weight });
}
function gsEnt(x, y, w, h, o = {}) {
  return `<rect x="${x + 5}" y="${y + 5}" width="${w}" height="${h}" fill="${INK}"/>` + rect(x, y, w, h, { sw: o.sw ?? 1.8 });
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `<rect width="${w}" height="${h}" fill="#fff"/>${DEFS}${body}</svg>`;

// ---------------------------------------------------------------------------------------------
// Figure 4. The landlady's process before Hivelet (Section 4.1.1, Table 5)
// ---------------------------------------------------------------------------------------------
function asIs() {
  const W = 900, H = 760, L = 112;
  const colW = (W - L) / 4;
  const cx = (i) => L + colW * i + colW / 2;
  const lanes = [
    ['', 0, 44],
    ['Tenant or prospect', 44, 196],
    ['Landlady', 196, 486],
    ['Records kept', 486, 636],
    ['Problem identified (Table 4-1)', 636, H - 2],
  ];
  let s = rect(1, 1, W - 2, H - 3, { sw: 1.6 });
  for (const [label, y0, y1] of lanes) {
    if (y0) s += line([[1, y0], [W - 1, y0]], { head: 'none', sw: 1.2 });
    if (label) s += T(L / 2, (y0 + y1) / 2, label, { w: L - 14, size: 14, weight: 'bold' });
  }
  s += line([[L, 1], [L, H - 2]], { head: 'none', sw: 1.2 });
  for (let i = 1; i < 4; i++) s += line([[L + colW * i, 1], [L + colW * i, H - 2]], { head: 'none', sw: 1, stroke: '#999', dash: '4 4' });
  ['Rent collection', 'Expenses', 'Repair requests', 'Inquiries'].forEach((h, i) => { s += T(cx(i), 23, h, { size: 15, weight: 'bold' }); });

  const BW = 166;
  // Rent collection
  s += box(cx(0), 118, BW, 62, 'Tenant pays rent in cash on site', { rx: 31 });
  s += box(cx(0), 262, BW, 62, 'Landlady writes an invoice in the paper invoice book');
  s += box(cx(0), 396, BW, 96, 'Landlady types the payment into the Monthly Income Report and adds the totals by hand');
  s += line([[cx(0), 149], [cx(0), 231]]);
  s += line([[cx(0), 293], [cx(0), 348]]);
  s += doc(cx(0), 548, 150, 66, 'Invoice book (paper)');
  s += line([[cx(0) - BW / 2, 262], [L + 8, 262], [L + 8, 548], [cx(0) - 75, 548]]);
  // Expenses
  s += box(cx(1), 262, BW, 62, 'Landlady pays a supplier', { rx: 31 });
  s += box(cx(1), 400, BW, 124, 'Landlady types the expense into the Monthly Expenses Report and splits it across property areas by hand');
  s += line([[cx(1), 293], [cx(1), 338]]);
  s += doc(cx(1), 552, 172, 88, 'Workbook on a USB flash drive, the only copy');
  s += line([[cx(0), 444], [cx(0), 474], [cx(1) - 50, 474], [cx(1) - 50, 508]]);
  s += line([[cx(1), 462], [cx(1), 508]]);
  // Repair requests
  s += box(cx(2), 118, BW, 78, 'Tenant reports a problem by message or in person', { rx: 39 });
  s += box(cx(2), 300, BW, 62, 'Landlady arranges the repair');
  s += line([[cx(2), 157], [cx(2), 269]]);
  s += box(cx(2), 560, 140, 50, 'No record', { dash: '6 5', italic: true });
  s += line([[cx(2), 331], [cx(2), 535]], { dash: '6 5' });
  // Inquiries
  s += box(cx(3), 118, BW, 62, 'Prospect asks about a unit', { rx: 31 });
  s += box(cx(3), 300, BW, 62, 'Landlady answers the prospect');
  s += line([[cx(3), 149], [cx(3), 269]]);
  s += box(cx(3), 560, 140, 50, 'No record', { dash: '6 5', italic: true });
  s += line([[cx(3), 331], [cx(3), 535]], { dash: '6 5' });

  const problems = [
    'Nothing checks an invoice number against the book; totals depend on hand arithmetic',
    'Totals depend on hand arithmetic; one file on a USB flash drive is the only copy',
    'Requests are not recorded, so none can be followed to completion',
    'No record of an inquiry or of the unit it was about',
  ];
  problems.forEach((p, i) => { s += T(cx(i), 698, p, { w: colW - 22, size: 14, italic: true }); });
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Figure 5. System architecture (Section 4.2.1, Table 7)
// ---------------------------------------------------------------------------------------------
function architecture() {
  const W = 900, H = 660;
  let s = '';
  const group = (x, y, w, h, title, sub) =>
    rect(x, y, w, h, { rx: 10, sw: 1.4, dash: '7 5' }) + T(x + w / 2, y + 22, title, { size: 16, weight: 'bold' }) +
    (sub ? T(x + w / 2, 0, sub, { size: 13.5, w: w - 24, fill: MUTED, top: y + 38 }) : '');

  // Client
  s += group(16, 16, 230, 560, 'Client device', 'A phone or computer browser, used by visitors, tenants and the landlady');
  s += box(131, 186, 196, 96, 'Hivelet web app (Vue 3, TypeScript), installable as a Progressive Web App');
  s += box(131, 316, 196, 70, 'Service worker: keeps the app\'s files so it opens offline');
  s += box(131, 470, 196, 70, 'Adyen Drop-in: the GCash payment form');
  s += line([[131, 234], [131, 281]], { head: 'both' });

  // Vercel
  s += group(356, 16, 270, 560, 'Vercel (hosting)');
  s += box(491, 110, 230, 62, 'Static site: the built app files');
  const api = { x: 376, y: 200, w: 230, h: 356 };
  s += rect(api.x, api.y, api.w, api.h);
  s += T(491, api.y + 26, 'Serverless function: Express API at /api', { w: 210, size: 15, weight: 'bold' });
  const items = [
    'Sign-in with signed tokens (JWT); passwords hashed with bcrypt',
    'Role checked on every request',
    'Every input validated (zod)',
    'Business rules and computed figures',
    'An audit record of every change',
    'Workbook downloads (ExcelJS)',
  ];
  let iy = api.y + 74;
  for (const it of items) {
    const lines = wrap(it, 186, 14);
    s += `<circle cx="${api.x + 16}" cy="${iy + 1}" r="2.6" fill="${INK}"/>`;
    s += T(api.x + 26, iy, it, { w: 186, size: 14, anchor: 'start', top: iy - 10 });
    iy += lines.length * 17 + 14;
  }

  // Supabase
  s += group(700, 16, 184, 300, 'Supabase');
  s += box(792, 112, 150, 66, 'PostgreSQL 17.6 database');
  s += T(792, 222, 'Row-level security on every table; read and written only by the API, with a key kept on the server', { w: 160, size: 13.5, fill: MUTED });

  // Adyen and GCash
  s += box(792, 400, 168, 62, 'Adyen payment gateway');
  s += box(832, 520, 96, 44, 'GCash');
  s += line([[832, 431], [832, 498]], { head: 'both' });

  // Flows
  s += line([[229, 160], [376, 110]], { head: 'both' });
  s += T(296, 108, 'App files', { size: 13.5, fill: MUTED });
  s += line([[229, 200], [300, 200], [300, 300], [376, 300]], { head: 'both' });
  s += T(301, 352, 'Requests and answers over HTTPS, with the sign-in token', { w: 100, size: 13.5, fill: MUTED });
  s += line([[606, 250], [650, 250], [650, 112], [717, 112]], { head: 'both' });
  s += T(642, 181, 'Queries', { size: 13.5, fill: MUTED, rotate: -90 });
  s += line([[606, 388], [708, 388]]);
  s += T(660, 360, 'Payment session', { w: 80, size: 13, fill: MUTED });
  s += line([[708, 414], [606, 414]]);
  s += T(660, 448, 'Signed result notice', { w: 80, size: 13, fill: MUTED });
  s += line([[131, 505], [131, 610], [740, 610], [740, 431]], { head: 'both' });
  s += T(420, 628, 'Payment details go from the form to Adyen directly, never through the API', { size: 13.5, fill: MUTED });
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Figure 6. Context diagram (Level 0, Gane and Sarson notation). Three parties, as in the diagrams the
// team's SAD professor approved (Sean, 4 Nov 2026): Adyen is part of the payment process, not an
// external entity, so it is not drawn here or in Figure 7, and step 4.3 in Appendix F names it.
// Online payments still go through it (Figure 5).
// ---------------------------------------------------------------------------------------------
function context() {
  const W = 900, H = 556, cx = 450, cy = 390, r = 108;
  let s = '';
  const hw = 100;
  s += gsProc(cx, cy, hw, r, '0', 'Hivelet apartment management system', { band: 34, nsize: 16, size: 16, weight: 'bold' });
  const edgeY = () => r; // the process's flat top and bottom
  const edgeX = () => hw; // and its sides

  // Visitor (top)
  s += gsEnt(cx - 115, 19, 230, 54) + T(cx, 46, 'Visitor or prospect', { weight: 'bold' });
  s += line([[cx - 44, 73], [cx - 44, cy - edgeY(44)]]);
  s += line([[cx + 44, cy - edgeY(44)], [cx + 44, 73]]);
  s += T(cx - 56, 178, 'Inquiry about a unit; follow-up messages', { w: 190, size: 14, anchor: 'end' });
  s += T(cx + 56, 178, 'Units, rates and availability; the inquiry\'s reference and replies', { w: 190, size: 14, anchor: 'start' });

  // Landlady (left)
  s += gsEnt(14, cy - 60, 140, 120) + T(84, cy, 'Landlady (administrator)', { w: 124, weight: 'bold' });
  s += line([[154, cy - 34], [cx - edgeX(34), cy - 34]]);
  s += line([[cx - edgeX(34), cy + 34], [154, cy + 34]]);
  s += T(162, cy - 46, 'Sign-in; units and rates; move-ins and move-outs; payments with invoice numbers, verifications and voids; expenses; repair dispatch; inquiry replies',
    { w: 176, size: 14, anchor: 'start', bottom: cy - 44 });
  s += T(162, cy + 46, 'Overview figures; income and expense records; workbook downloads; notifications; recent actions',
    { w: 176, size: 14, anchor: 'start', top: cy + 44 });

  // Tenant (right)
  s += gsEnt(W - 154, cy - 60, 140, 120) + T(W - 84, cy, 'Tenant', { weight: 'bold' });
  s += line([[W - 154, cy + 34], [cx + edgeX(34), cy + 34]]);
  s += line([[cx + edgeX(34), cy - 34], [W - 154, cy - 34]]);
  s += T(W - 162, cy - 46, 'Bills and amounts owed; payment history and receipts; repair status; notifications; recent actions',
    { w: 176, size: 14, anchor: 'end', bottom: cy - 44 });
  s += T(W - 162, cy + 46, 'Sign-in; profile and password changes; repair requests with photos; cancellations; GCash payments',
    { w: 176, size: 14, anchor: 'end', top: cy + 44 });
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Figure 7. Level 1 data flow diagram (Gane and Sarson notation)
// ---------------------------------------------------------------------------------------------
function dfd() {
  const W = 900, H = 1040;
  let s = '';
  const R = 54;
  const proc = (x, y, n, name) => gsProc(x, y, R, R, n, name);
  // An open-ended store; a duplicate (drawn twice to avoid crossings) carries a second bar.
  const store = (x, y, w, id, name, dup) =>
    `<path d="M${x + w},${y} H${x} V${y + 32} H${x + w}" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` +
    line([[x + 34, y], [x + 34, y + 32]], { head: 'none', sw: 1.3 }) +
    (dup ? line([[x + 7, y], [x + 7, y + 32]], { head: 'none', sw: 1.3 }) : '') +
    T(x + 20 + (dup ? 3 : 0), y + 16, id, { size: 13.5, weight: 'bold' }) + T(x + 42, y + 16, name, { size: 13.5, anchor: 'start' });
  const ent = (x, y, w, h, name) => gsEnt(x, y, w, h) + T(x + w / 2, y + h / 2, name, { size: 15, weight: 'bold', w: w - 12 });
  const lab = (x, y, t, o = {}) => T(x, y, t, { size: 12.5, fill: MUTED, ...o });
  const at = () => R; // a line meets a process at its flat side, R from the centre

  const P = {
    p2: [104, 214], p3: [300, 214], p7: [496, 214], p6: [692, 214],
    p1: [110, 690], p8: [300, 690], p5: [496, 690], p4: [692, 690],
  };
  const rowA = 350, rowB = 510;

  // External entities.
  s += ent(16, 16, 862, 44, 'Landlady (administrator)');
  s += ent(16, H - 64, 150, 48, 'Visitor or prospect');
  s += ent(196, H - 64, 688, 48, 'Tenant');

  // Data stores between the two rows of processes.
  s += store(36, rowA, 154, 'D1', 'Units and rates');
  s += store(212, rowA, 176, 'D2', 'Tenants, tenancies');
  s += store(406, rowA, 180, 'D3', 'Bills and receipts');
  s += store(606, rowA, 150, 'D4', 'Expenses');
  s += store(30, rowB, 112, 'D5', 'Inquiries');
  s += store(406, rowB, 154, 'D6', 'Repair requests');
    s += store(606, rowB, 184, 'D2', 'Tenants, tenancies', true);
  // D1 again under 5.0 and 4.0 (13 Nov 2026), so Figure 7 balances with Appendix F: 3.0 and 5.0
  // update the units store (move-in, move-out, a unit under repair) and 4.0 reads its rate.
  s += store(512, 776, 160, 'D1', 'Units and rates', true);

  // Landlady to the landlady-only processes (row 1).
  for (const [k, t, head] of [['p2', 'Units, rates', 'both'], ['p3', 'Move-in, move-out', 'both'], ['p7', 'Overview, workbooks', 'start'], ['p6', 'Expenses', 'both']]) {
    const [x, y] = P[k];
    s += line([[x, 60], [x, y - R]], { head });
    s += lab(x + 8, 104, t, { anchor: 'start', w: 84 });
  }
  // Landlady to the shared processes (row 2): down a gap in row 1, then across.
  for (const [k, gx, t] of [['p1', 22, 'Replies'], ['p8', 202, 'Own account'], ['p5', 398, 'Dispatch, close'], ['p4', 594, 'Record, verify, void']]) {
    const [x, y] = P[k];
    s += line([[gx, 60], [gx, y], [x - R, y]], { head: 'both' });
    if (k !== 'p4') s += lab(gx + 6, 304, t, { anchor: 'start', w: 64 });
  }
  s += lab(600, 576, 'Record, verify, void', { anchor: 'start' });


  // Visitor and tenant, from below.
  s += line([[P.p1[0], H - 64], [P.p1[0], P.p1[1] + R]], { head: 'both' });
  s += lab(P.p1[0] + 8, 888, 'Inquiry, messages; units, replies', { anchor: 'start', w: 76 });
  for (const [k, t] of [['p8', 'Sign-in, profile, password'], ['p5', 'Requests, photos, cancellations; status'], ['p4', 'GCash payment; bills, receipts']]) {
    const [x, y] = P[k];
    s += line([[x, H - 64], [x, y + R]], { head: 'both' });
    s += lab(x + 8, 888, t, { anchor: 'start', w: 100 });
  }

  // Processes and stores.
  s += line([[P.p2[0], P.p2[1] + R], [P.p2[0], rowA]], { head: 'both' });
  s += line([[P.p3[0], P.p3[1] + R], [P.p3[0], rowA]], { head: 'both' });
  s += line([[P.p7[0], rowA], [P.p7[0], P.p7[1] + R]]);
  s += line([[P.p6[0], P.p6[1] + R], [P.p6[0], rowA]], { head: 'both' });
  s += line([[620, rowA], [620, 300]], { head: 'none' }) + hopH(620, 300, P.p7[0] + 40, [594], { head: 'none' }) +
    line([[P.p7[0] + 40, 300], [P.p7[0] + 40, P.p7[1] + at(40)]]);
  s += line([[156, rowA + 32], [156, P.p1[1] - at(46)]]);
  s += lab(162, 440, 'Units shown', { anchor: 'start', w: 40 });
  s += line([[80, rowB + 32], [80, P.p1[1] - at(30)]], { head: 'both' });
  s += line([[P.p8[0], rowA + 32], [P.p8[0], P.p8[1] - R]], { head: 'both' });
  s += line([[P.p5[0], rowB + 32], [P.p5[0], P.p5[1] - R]], { head: 'both' });
  s += line([[576, 610], [576, rowA + 32]]) + hopH(576, 610, 652, [594], { head: 'none' }) +
    line([[652, 610], [652, P.p4[1] - at(40)]]);
    s += line([[728, rowB + 32], [728, P.p4[1] - at(36)]]);
  // 3.0 writes D1: down from 3.0, across with a hop over the landlady's line to 8.0, into D1.
  s += line([[262, P.p3[1] + R], [262, 288]], { head: 'none' }) + hopH(262, 288, 176, [202], { head: 'none' }) +
    line([[176, 288], [176, rowA]]);
  // 5.0 writes the second D1, and 4.0 reads it.
  s += line([[528, P.p5[1] + R], [528, 776]]);
  s += line([[656, 776], [656, P.p4[1] + R]]);

  // Processes last, so the lines end under them cleanly.
  s += proc(...P.p2, '2.0', 'Manage units and rates');
  s += proc(...P.p3, '3.0', 'Manage tenants and tenancies');
  s += proc(...P.p7, '7.0', 'Produce reports');
  s += proc(...P.p6, '6.0', 'Record expenses');
  s += proc(...P.p1, '1.0', 'Handle inquiries');
  s += proc(...P.p8, '8.0', 'Sign in, manage own account');
  s += proc(...P.p5, '5.0', 'Manage repair requests');
  s += proc(...P.p4, '4.0', 'Bill and record payments');
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Figure 8. Use case diagram (UML). The actors' powers are those of config/rbac.ts (Table 7C).
// ---------------------------------------------------------------------------------------------
function useCases() {
  const W = 900, H = 950;
  let s = '';
  const actor = (x, y, name) =>
    `<g fill="none" stroke="${INK}" stroke-width="1.7">` +
    `<circle cx="${x}" cy="${y - 34}" r="11" fill="#fff"/>` +
    `<path d="M${x},${y - 23} V${y + 8} M${x - 18},${y - 12} H${x + 18} M${x},${y + 8} L${x - 14},${y + 30} M${x},${y + 8} L${x + 14},${y + 30}"/></g>` +
    T(x, y + 48, name, { size: 14.5, weight: 'bold', w: 120, halo: true });
  const UW = 214, UH = 44;
  const uc = (x, y, name) =>
    `<ellipse cx="${x}" cy="${y}" rx="${UW / 2}" ry="${UH / 2}" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
    T(x, y, name, { w: UW - 34, size: 13.5 });
  const assoc = (ax, ay, x, y, side) => line([[ax, ay], [x + (side === 'L' ? -UW / 2 : UW / 2), y]], { head: 'none', sw: 1.2 });

  // System boundary
  s += rect(160, 14, 580, 784, { sw: 1.6 });
  s += T(450, 34, 'Hivelet', { size: 16, weight: 'bold' });

  const L = 300, C = 450, Rx = 600;
  const visitor = [[90, 'View units, rates and availability'], [150, 'Send an inquiry about a unit'], [210, 'Read and answer an inquiry\'s replies']];
  const shared = [[300, 'Sign in'], [356, 'Update own details and password'], [412, 'Read notifications'], [468, 'See own recent actions']];
  const tenant = [[560, 'View own bills, payments and receipts'], [616, 'Send and follow a repair request'], [672, 'Cancel a repair request not yet started'], [736, 'Pay a bill online with GCash']];
  const adminTop = [[90, 'Manage units and rates'], [150, 'Answer, close and delete inquiries'], [210, 'Move a tenant in or out; reset a password']];
  const adminBottom = [[560, 'Record, verify, correct and void payments'], [616, 'Record and void expenses'], [672, 'Dispatch and close repair requests'], [728, 'View the overview; download workbooks']];

  const VX = 70, VY = 150, TX = 70, TY = 540, AX = 830, AY = 420;
  for (const [y] of visitor) s += assoc(VX + 20, VY - 12, L, y, 'L');
  for (const [y] of tenant) s += assoc(TX + 20, TY - 12, L, y, 'L');
  for (const [y] of shared) s += assoc(TX + 20, TY - 12, C, y, 'L') + assoc(AX - 20, AY - 12, C, y, 'R');
  for (const [y] of [...adminTop, ...adminBottom]) s += assoc(AX - 20, AY - 12, Rx, y, 'R');
  // The gateway is a secondary actor on one use case.
  const GX = 450, GY = H - 70;
  s += line([[GX - 18, GY - 12], [L + 78, 736 + 15]], { head: 'none', sw: 1.2 });

  for (const [y, n] of visitor) s += uc(L, y, n);
  for (const [y, n] of shared) s += uc(C, y, n);
  for (const [y, n] of tenant) s += uc(L, y, n);
  for (const [y, n] of adminTop) s += uc(Rx, y, n);
  for (const [y, n] of adminBottom) s += uc(Rx, y, n);

  s += actor(VX, VY, 'Visitor or prospect');
  s += actor(TX, TY, 'Tenant');
  s += actor(AX, AY, 'Landlady (administrator)');
  s += actor(GX, GY - 4, 'Adyen (GCash)');
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Figure 9. Entity-relationship diagram (Crow's Foot), from the live catalogue, 5 October 2026.
// ---------------------------------------------------------------------------------------------
function erd() {
  const W = 952, H = 1124, EW = 192, ROW = 16, HEAD = 26;
  const COL = [34, 264, 494, 724];
  let s = '';
  const ent = {};
  // [name, column, y, attributes]. A key marker leads where there is one; "=" marks a column the
  // database computes from others (a generated column).
  const E = [
    ['property_areas', 0, 14, ['PK code', 'name', 'is_rental_expense']],
    ['clusters', 0, 130, ['PK code', 'name', 'FK expense_area']],
    ['rooms', 0, 250, ['PK id', 'UQ room_number', 'floor', 'FK cluster_code', 'room_type', 'capacity', 'base_price', 'current_price', 'operational_status', 'visibility_status', 'available_from', 'is_linda_unit']],
    ['room_price_history', 0, 516, ['PK id', 'FK room_id', 'previous_price', 'new_price', 'effective_date']],
    ['room_photos', 0, 670, ['PK id', 'FK room_id', 'file_url', 'is_primary']],
    ['ticket_attachments', 0, 820, ['PK id', 'FK ticket_id', 'file_url']],
    ['expense_property_allocations', 1, 14, ['PK id', 'FK expense_entry_id', 'FK property_area', 'amount']],
    ['room_assignments', 1, 150, ['PK id', 'FK room_id', 'FK tenant_profile_id', 'start_date', 'end_date', 'anniversary_date', 'deposit_amount', 'occupant_count', 'is_active']],
    ['monthly_income_records', 1, 420, ['PK id', 'FK room_id', 'FK tenant_profile_id', 'FK assignment_id', 'year, month', 'date_paid', 'invoice_number', 'rent_amount', 'water_payment', '= fifty_percent_share', '= remitted_amount', 'payment_method', 'verification_status', 'voided_at']],
    ['maintenance_tickets', 1, 740, ['PK id', 'FK room_id', 'FK tenant_profile_id', 'title', 'category', 'priority', 'status', 'assigned_technician']],
    ['ticket_messages', 1, 950, ['PK id', 'FK ticket_id', 'sender_id', 'message_body']],
    ['monthly_expense_entries', 2, 14, ['PK id', 'expense_date', 'invoice_supplier', 'FK category_code', 'total_expenses', 'voided_at']],
    ['bills', 2, 184, ['PK id', 'FK room_id', 'FK tenant_profile_id', 'bill_type', 'billing_period_start', 'rent_amount', 'water_amount', 'total_amount', 'due_date', 'status']],
    ['payments', 2, 430, ['PK id', 'FK bill_id', 'FK room_id', 'FK tenant_profile_id', 'amount', 'payment_method', 'verification_status', 'transaction_reference', 'paid_at']],
    ['inquiries', 2, 660, ['PK id', 'FK room_id', 'prospect_name', 'prospect_phone', 'status', 'FK converted_tenant_id', 'UQ reference_code']],
    ['inquiry_messages', 2, 850, ['PK id', 'FK inquiry_id', 'sender_id', 'message_body']],
    ['fixed_expense_categories', 3, 14, ['PK code', 'name', 'FK parent_code']],
    ['system_settings', 3, 150, ['PK key', 'value', 'business_rule']],
    ['profiles', 3, 250, ['PK id', 'full_name', 'UQ email', 'phone_number', 'UQ login_id', 'role', 'account_status', 'password_hash', 'failed_login_count', 'locked_until', 'must_change_password', 'last_login_at']],
    ['notifications', 3, 560, ['PK id', 'FK recipient_profile_id', 'title', 'type', 'is_read']],
    ['audit_logs', 3, 706, ['PK id', 'FK actor_profile_id', 'action', 'entity_type', 'entity_id', 'created_at']],
  ];
  for (const [name, c, y, attrs] of E) {
    const x = COL[c], h = HEAD + attrs.length * ROW + 8;
    ent[name] = { x, y, w: EW, h, r: x + EW, b: y + h, cx: x + EW / 2 };
    s += rect(x, y, EW, h, { sw: 1.5 });
    s += `<rect x="${x + 0.75}" y="${y + 0.75}" width="${EW - 1.5}" height="${HEAD - 1}" fill="#e6e6e6"/>`;
    s += line([[x, y + HEAD], [x + EW, y + HEAD]], { head: 'none', sw: 1.2 });
    s += T(x + EW / 2, y + HEAD / 2 + 1, name, { size: Math.min(13, (EW - 12) / (name.length * 0.6)), weight: 'bold' });
    attrs.forEach((a, i) => {
      const m = a.match(/^(PK|FK|UQ|=) (.*)$/);
      const ty = y + HEAD + 4 + i * ROW + ROW / 2;
      if (m) s += T(x + 8, ty, m[1], { size: 11, anchor: 'start', weight: 'bold' });
      s += T(x + 34, ty, m ? m[2] : a, { size: 12.5, anchor: 'start', italic: m?.[1] === '=' });
    });
  }

  // A route with hops on its horizontal runs at the given x positions.
  const route = (pts, hops = []) => {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      if (y0 === y1) {
        const dir = Math.sign(x1 - x0);
        for (const hx of hops.filter((h) => (h - x0) * (h - x1) < 0).sort((a, b) => dir * (a - b)))
          d += ` L${hx - 6 * dir},${y0} A6,6 0 0 ${dir > 0 ? 1 : 0} ${hx + 6 * dir},${y0}`;
      }
      d += ` L${x1},${y1}`;
    }
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
  };
  // Crow's Foot ends, drawn at an entity's edge and pointing along the line away from it.
  const end = ([px, py], [qx, qy], kind) => {
    const len = Math.hypot(qx - px, qy - py), dx = (qx - px) / len, dy = (qy - py) / len, nx = -dy, ny = dx;
    const at = (t) => [px + dx * t, py + dy * t];
    const bar = (t) => { const [x, y] = at(t); return `<path d="M${x + nx * 7},${y + ny * 7} L${x - nx * 7},${y - ny * 7}" stroke="${INK}" stroke-width="1.4"/>`; };
    const ring = (t) => { const [x, y] = at(t); return `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" stroke="${INK}" stroke-width="1.4"/>`; };
    const foot = () => { const [mx, my] = at(13); return `<path d="M${px + nx * 8},${py + ny * 8} L${mx},${my} L${px - nx * 8},${py - ny * 8} M${px},${py} L${mx},${my}" fill="none" stroke="${INK}" stroke-width="1.4"/>`; };
    if (kind === 'one') return bar(8) + bar(14);
    if (kind === 'zeroOne') return bar(8) + ring(19);
    return foot() + ring(20); // zero or more
  };
  // rel(points from the child's edge to the parent's edge, the parent's end, hops)
  const rel = (pts, parent, hops) => {
    s += route(pts, hops);
    s += end(pts[0], pts[1], 'many');
    s += end(pts[pts.length - 1], pts[pts.length - 2], parent);
  };
  const e = ent;

  // The expense chain, across the top.
  rel([[e.clusters.cx, e.clusters.y], [e.clusters.cx, e.property_areas.b]], 'one');
  rel([[e.expense_property_allocations.x, 60], [e.property_areas.r, 60]], 'one');
  rel([[e.expense_property_allocations.r, 60], [e.monthly_expense_entries.x, 60]], 'one');
  rel([[e.monthly_expense_entries.r, 60], [e.fixed_expense_categories.x, 60]], 'one');
  rel([[770, e.fixed_expense_categories.b], [770, 124], [870, 124], [870, e.fixed_expense_categories.b]], 'zeroOne');

  // rooms, the hub on the left.
  rel([[e.rooms.cx, e.rooms.y], [e.rooms.cx, e.clusters.b]], 'one');
  rel([[e.room_price_history.cx, e.room_price_history.y], [e.room_price_history.cx, e.rooms.b]], 'one');
  rel([[e.room_photos.x, 720], [6, 720], [6, 440], [e.rooms.x, 440]], 'one');
  rel([[e.room_assignments.x, 290], [e.rooms.r, 290]], 'one');
  rel([[e.monthly_income_records.x, 440], [e.rooms.r, 440]], 'one');
  rel([[e.bills.x, 362], [e.rooms.r, 362]], 'one', [360]);
  rel([[e.payments.x, 460], [472, 460], [472, 380], [e.rooms.r, 380]], 'one', [360]);
  rel([[e.inquiries.x, 708], [248, 708], [248, 452], [e.rooms.r, 452]], 'one');
  rel([[e.maintenance_tickets.x, 770], [236, 770], [236, 466], [e.rooms.r, 466]], 'one');

  // Within the middle columns.
  rel([[360, e.monthly_income_records.y], [360, e.room_assignments.b]], 'zeroOne');
  rel([[630, e.payments.y], [630, e.bills.b]], 'zeroOne');
  rel([[e.ticket_attachments.r, 860], [e.maintenance_tickets.x, 860]], 'one');
  rel([[e.ticket_messages.cx, e.ticket_messages.y], [e.ticket_messages.cx, e.maintenance_tickets.b]], 'one');
  rel([[e.inquiry_messages.cx, e.inquiry_messages.y], [e.inquiry_messages.cx, e.inquiries.b]], 'one');

  // profiles, the hub on the right. Three routes leave by its foot so their ends do not crowd.
  rel([[e.bills.r, 300], [e.profiles.x, 300]], 'one');
  rel([[e.payments.r, 446], [e.profiles.x, 446]], 'one');
  rel([[e.room_assignments.r, 164], [702, 164], [702, 262], [e.profiles.x, 262]], 'one');
  rel([[e.monthly_income_records.r, 630], [694, 630], [694, 500], [736, 500], [736, e.profiles.b]], 'zeroOne');
  rel([[e.inquiries.r, 720], [706, 720], [706, 514], [758, 514], [758, e.profiles.b]], 'zeroOne');
  rel([[e.maintenance_tickets.r, 800], [472, 800], [472, 830], [716, 830], [716, 528], [780, 528], [780, e.profiles.b]], 'zeroOne');
  rel([[e.notifications.cx, e.notifications.y], [e.notifications.cx, e.profiles.b]], 'one');
  rel([[e.audit_logs.r, 770], [944, 770], [944, 420], [e.profiles.r, 420]], 'zeroOne');

  s += T(W / 2, H - 38, 'PK primary key, FK foreign key, UQ unique, = computed by the database from other columns of the row. ' +
    'Two bars: exactly one; bar and ring: zero or one; crow\'s foot and ring: zero or more. ' +
    'Columns ending in _by, and sender_id in the two message tables, also refer to profiles; they are left out for readability, as are three correction-backup tables.',
    { w: W - 40, size: 12.5, fill: MUTED });
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Figure 2-2. Conceptual framework (Section 2.3), redrawn 13 October 2026 from the manuscript's
// own figure: the same three columns and feedback loop, with "Adyen" spelled as the gateway is,
// and the maintenance ticketing module that Objective 2 names and the old figure left out.
// ---------------------------------------------------------------------------------------------
function framework() {
  const W = 1040, H = 700;
  let s = '';
  const col = (x, y, w, h, title, items) => {
    let b = rect(x, y, w, h, { rx: 26, sw: 2 }) + rect(x + 16, y + 14, w - 32, 58, { rx: 16, sw: 1.8 }) +
      T(x + w / 2, y + 43, title, { size: 22, weight: 'bold' });
    let cy = y + 100;
    for (const [head, sub] of items) {
      const hl = head ? wrap(head, w - 40, 16).length : 0;
      const sl = sub ? wrap(sub, w - 40, 15).length : 0;
      if (head) b += T(x + w / 2, 0, head, { top: cy, w: w - 40, size: 16, weight: 'bold' });
      if (sub) b += T(x + w / 2, 0, sub, { top: cy + hl * 20, w: w - 40, size: 15 });
      cy += hl * 20 + sl * 19 + 16;
    }
    return b;
  };
  const arrow = (x1, x2, y) =>
    `<path d="M${x1},${y - 26} H${x2 - 40} V${y - 46} L${x2},${y} L${x2 - 40},${y + 46} V${y + 26} H${x1} Z" fill="${INK}"/>`;

  s += col(24, 30, 280, 530, 'INPUT', [
    ['Objectives of the Study', '(Workflow integration, communication, operational control)'],
    ['Review of Related Literature', '(Contextual, integration and technology gaps)'],
    ['Client Interviews and Operational Workflow Observations', '(Property management and tenant feedback)'],
    ['Payment', '(Integration, payment workflow)'],
  ]);
  s += col(382, 60, 276, 470, 'PROCESS', [
    ['AGILE', ''],
    ['Financial Tracking', '(Analytics, Reports)'],
    ['Booking and Reservation', '(Inquiries, Reserved units)'],
    ['Tenant Management', '(Profiles, Records)'],
    ['Maintenance Ticketing', '(Requests, Notifications)'],
    ['Adyen Payment API', '(Optional GCash, in the Adyen test environment)'],
  ]);
  s += col(736, 30, 280, 530, 'OUTPUT', [
    ['Hivelet System', ''],
    ['System Modules', 'Financial Tracking Module (Analytics, Reports); Booking and Reservation Module (Inquiries, Reserved units); Tenant Management Module (Profiles, Records); Maintenance Ticketing Module (Requests, Notifications); Payment Module (Adyen Payment API with GCash)'],
    ['Finished Research Manuscript', ''],
    ['System Evaluation Results', '(ISO/IEC 25010:2011)'],
    ['User Manual', ''],
  ]);
  s += arrow(306, 380, 295) + arrow(660, 734, 295);
  // Feedback: from the output column down, along the bottom box, and back up into the input column.
  s += rect(230, 600, 580, 70, { rx: 18, sw: 2 }) + T(520, 635, 'FEEDBACK', { size: 22, weight: 'bold' });
  s += line([[880, 560], [880, 635], [812, 635]], { sw: 3 });
  s += line([[230, 635], [164, 635], [164, 562]], { sw: 3 });
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Appendix C. Gantt chart of the first build and the three iterations as they ran (Appendix M,
// Table M-19): every phase of Section 3.2 in each iteration, the Module 01 gap, and the dated
// events Chapter 4 reports.
// ---------------------------------------------------------------------------------------------
function gantt() {
  const W = 1040, H = 600;
  const x0 = 250, x1 = 1010; // 20 July to 20 November 2026
  const day = (m, d) => (Date.UTC(2026, m - 1, d) - Date.UTC(2026, 6, 20)) / 864e5;
  const span = day(11, 20);
  const X = (m, d) => x0 + ((x1 - x0) * day(m, d)) / span;
  let s = T(W / 2, 26, 'Hivelet development schedule, July to November 2026', { size: 18, weight: 'bold' });
  // Month grid.
  for (const [m, name] of [[8, 'August'], [9, 'September'], [10, 'October'], [11, 'November']]) {
    s += line([[X(m, 1), 56], [X(m, 1), H - 40]], { head: 'none', sw: 1, stroke: '#bbb' });
    s += T(X(m, 1) + 6, 66, name, { size: 14, anchor: 'start', fill: MUTED });
  }
  s += T(x0 + 6, 66, 'July', { size: 14, anchor: 'start', fill: MUTED });
  // Iteration bands across the top.
  const it = [[[7, 24], [8, 28], 'First build'], [[9, 12], [9, 14], 'Iteration 1'], [[9, 15], [10, 31], 'Iteration 2: Consolidation and testing'], [[11, 1], [11, 20], 'Iteration 3']];
  for (const [a, b, name] of it) {
    s += rect(X(...a), 80, X(...b) - X(...a), 34, { sw: 1.4, fill: '#eee' });
    // A bar too narrow for its name (Iteration 1, three days) is named underneath instead.
    if (X(...b) - X(...a) > 90) s += T((X(...a) + X(...b)) / 2, 97, name, { size: 14, weight: 'bold' });
  }
  s += rect(X(8, 29), 80, X(9, 11) - X(8, 29), 34, { sw: 1.2, dash: '5 4' });
  s += T((X(8, 29) + X(9, 11)) / 2, 97, 'Module 01', { size: 12.5, fill: MUTED });
  s += T(X(9, 13), 130, 'Iteration 1: Verification, 12 to 14 Sep', { size: 12.5, weight: 'bold' });
  // One row per phase; a bar in every iteration the phase ran in. The numbers index `it`.
  const rows = [
    ['Requirements', [2, 3, 4]], ['Design', [2, 3, 4]], ['Development', [1, 2, 3, 4]],
    ['Testing', [2, 3, 4]], ['Deployment', [3, 4]], ['Review and maintenance', [2, 3, 4]],
  ];
  const top = 150, rh = 48;
  rows.forEach(([name, its], i) => {
    const y = top + i * rh;
    s += T(x0 - 12, y + 16, name, { size: 15, anchor: 'end' });
    s += line([[x0, y + rh - 8], [x1, y + rh - 8]], { head: 'none', sw: 0.6, stroke: '#ddd' });
    for (const k of its) {
      const [a, b] = it[k - 1];
      s += rect(X(...a), y + 4, Math.max(6, X(...b) - X(...a)), 24, { fill: '#9a9a9a', sw: 1.2 });
    }
  });
  // Dated events (Chapter 4): a diamond on the date, its label below the rows.
  const ev = [[[9, 24], 'Hosted on Vercel'], [[9, 30], 'Testing day'], [[10, 3], 'Evaluators\' review'], [[10, 13], 'Re-test']];
  const ey = top + rows.length * rh + 10;
  ev.forEach(([d, name], i) => {
    const x = X(...d);
    s += `<path d="M${x},${ey} l9,9 l-9,9 l-9,-9 Z" fill="${INK}"/>`;
    s += line([[x, ey + 18], [x, ey + 34 + i * 22]], { head: 'none', sw: 1, stroke: MUTED });
    s += T(x - 6, ey + 40 + i * 22, `${name} (${d[1]} ${d[0] === 9 ? 'Sep' : 'Oct'})`, { size: 13, anchor: 'end' });
  });
  s += T(x1, H - 18, 'Iteration 3 continues to the defense.', { size: 12.5, anchor: 'end', fill: MUTED });
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Appendix F. Level 2 data flow diagrams (Gane and Sarson): each of the eight processes of
// Figure 7 opened into its steps, as Form 2 item 13 asks ("down to Level 2"). The steps and flows
// are the endpoints the screens call (docs/SCREEN_CONTRACT.md, generated from the code); stores and
// entities keep Figure 7's names. Each diagram shows every store its steps read or write. Figure 7
// connects D1 to 3.0, 4.0 and 5.0 as well (13 Nov 2026), so each Level 2 diagram balances with it.
// Entities and stores are repeated on each row rather than crossed; a repeated store carries a
// second bar, as in Figure 7. The audit trail is left out, as there.
// ---------------------------------------------------------------------------------------------
const CHILD = {
  '1': ['1.0 Handle inquiries', [
    ['1.1', 'Show units and rates', [['Visitor or prospect', 'Units, rates', 'out']], [['D1', 'Units and rates', 'in']]],
    ['1.2', 'Record an inquiry', [['Visitor or prospect', 'Inquiry about a unit', 'in']], [['D5', 'Inquiries', 'out']]],
    ['1.3', 'Exchange messages', [['Visitor or prospect', 'Link or code; messages', 'both'], ['Landlady (administrator)', 'Replies', 'both']], [['D5', 'Inquiries', 'both']]],
    ['1.4', 'Advance, close or delete', [['Landlady (administrator)', 'Status, deletion', 'in']], [['D5', 'Inquiries', 'out']]],
  ]],
  '2': ['2.0 Manage units and rates', [
    ['2.1', 'Show the unit directory', [['Landlady (administrator)', 'Units, status, rates', 'out']], [['D1', 'Units and rates', 'in']]],
    ['2.2', 'Edit a unit and its rate', [['Landlady (administrator)', 'Unit details, new rate', 'in']], [['D1', 'Units and rates', 'both']]],
  ]],
  '3': ['3.0 Manage tenants and tenancies', [
    ['3.1', 'Onboard a tenant', [['Landlady (administrator)', 'Tenant details, unit', 'in']], [['D2', 'Tenants, tenancies', 'out'], ['D1', 'Units and rates', 'out']]],
    ['3.2', 'Edit a tenant record', [['Landlady (administrator)', 'Corrections', 'in']], [['D2', 'Tenants, tenancies', 'both']]],
    ['3.3', 'Reset a tenant\'s password', [['Landlady (administrator)', 'Reset; one-time password', 'both']], [['D2', 'Tenants, tenancies', 'out']]],
    ['3.4', 'End a tenancy', [['Landlady (administrator)', 'Move-out', 'in']], [['D2', 'Tenants, tenancies', 'out'], ['D1', 'Units and rates', 'out']]],
  ]],
  '4': ['4.0 Bill and record payments', [
    ['4.1', 'Raise a bill on demand', [['Tenant', 'Bills shown', 'out']], [['D1', 'Units and rates', 'in'], ['D2', 'Tenants, tenancies', 'in'], ['D3', 'Bills and receipts', 'out']]],
    ['4.2', 'Record an on-site payment', [['Landlady (administrator)', 'Cash received, invoice no.', 'in']], [['D3', 'Bills and receipts', 'out']]],
    ['4.3', 'Take a GCash payment through Adyen', [['Tenant', 'GCash payment, receipt', 'both']], [['D3', 'Bills and receipts', 'out']]],
    ['4.4', 'Verify or decline a payment', [['Landlady (administrator)', 'Verify, decline', 'in'], ['Tenant', 'Outcome', 'out']], [['D3', 'Bills and receipts', 'both']]],
    ['4.5', 'Correct or void a receipt', [['Landlady (administrator)', 'Correction, void', 'in']], [['D3', 'Bills and receipts', 'both']]],
  ]],
  '5': ['5.0 Manage repair requests', [
    ['5.1', 'File a request', [['Tenant', 'Request, photos', 'in']], [['D6', 'Repair requests', 'out']]],
    ['5.2', 'Withdraw a request', [['Tenant', 'Withdrawal, reason', 'in']], [['D6', 'Repair requests', 'out']]],
    ['5.3', 'Raise a ticket', [['Landlady (administrator)', 'Ticket for a unit', 'in']], [['D6', 'Repair requests', 'out'], ['D1', 'Units and rates', 'out']]],
    ['5.4', 'Update a ticket\'s status', [['Landlady (administrator)', 'New status', 'in'], ['Tenant', 'Status, notification', 'out']], [['D6', 'Repair requests', 'out'], ['D1', 'Units and rates', 'out']]],
    ['5.5', 'Add a note to a request', [['Tenant', 'Note', 'in'], ['Landlady (administrator)', 'Note, as a notification', 'out']], [['D6', 'Repair requests', 'out']]],
  ]],
  '6': ['6.0 Record expenses', [
    ['6.1', 'Add an expense', [['Landlady (administrator)', 'Expense, areas', 'in']], [['D4', 'Expenses', 'out']]],
    ['6.2', 'Edit or delete an expense', [['Landlady (administrator)', 'Correction, deletion', 'in']], [['D4', 'Expenses', 'both']]],
    ['6.3', 'Add a kind of expense', [['Landlady (administrator)', 'New kind', 'in']], [['D4', 'Expenses', 'out']]],
    ['6.4', 'Show the expense records', [['Landlady (administrator)', 'Expense records', 'out']], [['D4', 'Expenses', 'in']]],
  ]],
  '7': ['7.0 Produce reports', [
    ['7.1', 'Compute the Overview', [['Landlady (administrator)', 'Overview figures', 'out']], [['D3', 'Bills and receipts', 'in'], ['D4', 'Expenses', 'in']]],
    ['7.2', 'Build the workbooks', [['Landlady (administrator)', 'Income, expense, tenant workbooks', 'out']], [['D3', 'Bills and receipts', 'in'], ['D4', 'Expenses', 'in']]],
  ]],
  '8': ['8.0 Sign in, manage own account', [
    ['8.1', 'Sign in and out', [['Landlady (administrator)', 'Login ID or phone, password', 'in'], ['Tenant', 'Login ID or phone, password', 'in']], [['D2', 'Tenants, tenancies', 'in']]],
    ['8.2', 'Change own password', [['Landlady (administrator)', 'Current, new password', 'in'], ['Tenant', 'Current, new password', 'in']], [['D2', 'Tenants, tenancies', 'out']]],
    ['8.3', 'Change sign-in number', [['Landlady (administrator)', 'Current and new number', 'in']], [['D2', 'Tenants, tenancies', 'out']]],
    ['8.4', 'Edit own profile', [['Tenant', 'Own details', 'both']], [['D2', 'Tenants, tenancies', 'both']]],
  ]],
};
function childDfd(key) {
  return () => {
    const [title, rows] = CHILD[key];
    const W = 940, R = 50, cx = 470, gap = 46;
    const head = { in: 'end', out: 'start', both: 'both' };
    const at = () => R + 14; // a process's flat side
    const seen = new Set();
    let s = T(W / 2, 26, `Level 2 diagram, ${title}`, { size: 18, weight: 'bold' });
    let y = 64;
    for (const [n, name, left, right] of rows) {
      const k = Math.max(left.length, right.length);
      const h = Math.max(2 * R + 24, k * gap + 20);
      const cy = y + h / 2;
      const ys = (m, i) => cy + (i - (m - 1) / 2) * gap;
      left.forEach(([ent, lab, dir], i) => {
        const ey = ys(left.length, i);
        s += gsEnt(16, ey - 20, 170, 40) + T(101, ey, ent, { size: 13.5, weight: 'bold', w: 160 });
        s += line([[186, ey], [cx - at(ey - cy), ey]], { head: head[dir] });
        s += T((186 + cx - R) / 2 + 6, ey - 9, lab, { size: 12, fill: MUTED, halo: true });
      });
      right.forEach(([id, sname, dir], i) => {
        const sy = ys(right.length, i);
        const dup = seen.has(id); seen.add(id);
        const x = 690, w = 230;
        s += `<path d="M${x + w},${sy - 16} H${x} V${sy + 16} H${x + w}" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` +
          line([[x + 34, sy - 16], [x + 34, sy + 16]], { head: 'none', sw: 1.3 }) +
          (dup ? line([[x + 7, sy - 16], [x + 7, sy + 16]], { head: 'none', sw: 1.3 }) : '') +
          T(x + 20 + (dup ? 3 : 0), sy, id, { size: 13.5, weight: 'bold' }) + T(x + 42, sy, sname, { size: 13.5, anchor: 'start' });
        // A flow toward the process is "in": the store is read.
        s += line([[x, sy], [cx + at(sy - cy), sy]], { head: head[dir] });
      });
      s += gsProc(cx, cy, R + 14, R, n, name, { size: 12.5 });
      y += h + 14;
    }
    s += T(16, y + 10, 'Arrows show the direction data moves. A store drawn again has a second bar. The audit trail is left out, as in Figure 4-4.',
      { size: 12, fill: MUTED, anchor: 'start', w: W - 20 });
    return { W, H: y + 40, body: s };
  };
}

// ---------------------------------------------------------------------------------------------
// Figure 3-1. The Agile cycle (Section 3.2), redrawn 13 October 2026 from the manuscript's figure:
// the same six phases and activities, named as Sections 3.2.1 to 3.2.6 name them, grammar fixed.
// ---------------------------------------------------------------------------------------------
function agile() {
  const W = 1100, H = 880;
  let s = '';
  const phases = [
    [300, 715, '1  Requirements', ['Conducting interviews and identifying the system requirements', 'Considering resources, cost, and time']],
    [800, 715, '2  Design', ['Identifying each problem and the solution that best fits it', "Analyzing the end users' and the client's needs", 'Describing specifications, features, and processes']],
    [950, 440, '3  Development', ['Organizing processes with flowcharts', 'Developing and structuring the system']],
    [800, 165, '4  Testing', ['Determining whether the system meets end-user requirements', 'Identifying bugs, errors, and other issues']],
    [300, 165, '5  Deployment', ['Installing and rolling out the system', 'Deploying each increment to the target environment']],
    [150, 440, '6  Review and Maintenance', ['Gathering stakeholder and user feedback', 'Improving performance through incremental updates', 'Planning and checking the next iteration']],
  ];
  const bw = 280, bh = 170;
  for (const [cx, cy, title, bullets] of phases) {
    s += rect(cx - bw / 2, cy - bh / 2, bw, bh, { rx: 14, sw: 1.8 });
    s += T(cx, cy - bh / 2 + 22, title, { size: 16, weight: 'bold' });
    let y = cy - bh / 2 + 44;
    for (const b of bullets) {
      const lines = wrap(b, bw - 40, 13.5);
      s += T(cx - bw / 2 + 16, 0, '•', { top: y, size: 13.5, anchor: 'start' });
      s += T(cx - bw / 2 + 30, 0, b, { top: y, size: 13.5, anchor: 'start', w: bw - 44 });
      y += lines.length * 16.5 + 5;
    }
  }
  s += `<circle cx="550" cy="440" r="80" fill="#fff" stroke="${INK}" stroke-width="2"/>` + T(550, 440, 'AGILE', { size: 24, weight: 'bold' });
  // Clockwise on the page is the order of the phases: 1 to 6, then back to 1.
  const arrows = [[[440, 715], [660, 715]], [[900, 630], [925, 525]], [[925, 355], [900, 250]],
    [[660, 165], [440, 165]], [[200, 250], [175, 355]], [[175, 525], [200, 630]]];
  for (const pts of arrows) s += line(pts, { sw: 2.2 });
  return { W, H, body: s };
}

// ---------------------------------------------------------------------------------------------
// Appendix R. Literature map (Form 3A, Form 2 item 3): Chapter 2's five themes, what each body of work
// found and the sources cited under it, narrowing through the synthesis (2.1.6) and the gap (2.2) to
// the study. Every source is one the chapter cites in that section; every finding is the chapter's own.
// ---------------------------------------------------------------------------------------------
const LIT_THEMES = [
  ['2.1.1', 'Fragmentation in property management', 'Disconnected workflows, inconsistent records and delayed communication slow the work', ['Burke (2026)', 'Magno et al. (2024)', 'Pavia et al. (2022)', 'Thevaraju et al. (2019)', 'Ullah et al. (2018)']],
  ['2.1.2', 'Information systems as the basis of centralization', 'Inefficiency comes from fragmented information processing and no central view of operations', ['Burke (2026)', 'Ghasemaghaei et al. (2018)', 'Laudon et al. (2026)', 'Magno et al. (2024)', 'Pressman and Maxim (2020)']],
  ['2.1.3', 'Financial analytics and decision support', 'Structured payment records improve oversight and transparency', ['Caparos et al. (2025)', 'Encarnacion et al. (2025)', 'Ghasemaghaei et al. (2018)', 'Magno et al. (2024)']],
  ['2.1.4', 'Communication and structured issue resolution', 'Accountability improves when requests follow a structured digital workflow', ['Altinay et al. (2024)', 'Canlas et al. (2026)', 'Jing and Lim (2021)', 'Mangca (2023a, 2023b)', 'Pernate et al. (2025)', 'Saputra et al. (2025)', 'Setty (2022)']],
  ['2.1.5', 'Progressive Web Applications', 'One installable web application reaches varied devices, and a tool is taken up when it fits existing practice', ['Anuar and Othman (2024)', 'Biørn-Hansen et al. (2017)', 'Mia et al. (2024)', 'Muawwal (2024)']],
];
function literatureMap() {
  const W = 1000, gap = 10, cw = (W - 32 - gap * 4) / 5;
  const lh = (t, w, size) => wrap(t, w, size).length * Math.round(size * 1.22);
  let s = '';
  let y = 16;
  // The topic.
  s += rect(16, y, W - 32, 56, { sw: 2 });
  s += T(W / 2, y + 28, 'Managing a small boarding house: tenants and units, rent and expenses, repairs and inquiries', { size: 16, weight: 'bold', w: W - 60 });
  y += 56;
  const top = y + 34;
  // The five themes, each a column: number and title, the finding, then its sources.
  const body = LIT_THEMES.map(([, title, found, src]) =>
    lh(title, cw - 16, 14) + 10 + lh(found, cw - 16, 13) + 14 + src.length * 17 + 14);
  const ch = Math.max(...body) + 30;
  LIT_THEMES.forEach(([n, title, found, src], i) => {
    const x = 16 + i * (cw + gap), cx = x + cw / 2;
    s += line([[cx, y], [cx, top]]);
    s += rect(x, top, cw, ch, { rx: 8 });
    let ty = top + 10;
    s += T(cx, 0, n, { top: ty, size: 13, weight: 'bold' }); ty += 18;
    s += T(cx, 0, title, { top: ty, size: 14, weight: 'bold', w: cw - 16 }); ty += lh(title, cw - 16, 14) + 10;
    s += line([[x + 10, ty - 4], [x + cw - 10, ty - 4]], { head: 'none', sw: 0.8 });
    s += T(x + 8, 0, found, { top: ty + 2, size: 13, w: cw - 16, anchor: 'start' }); ty += lh(found, cw - 16, 13) + 14;
    for (const r of src) { s += T(x + 8, 0, r, { top: ty, size: 12.5, anchor: 'start', fill: MUTED }); ty += 17; }
  });
  y = top + ch;
  // All five themes feed the synthesis: a short drop from each, joined by one bar.
  const xs = LIT_THEMES.map((_, i) => 16 + i * (cw + gap) + cw / 2);
  for (const x of xs) s += line([[x, y], [x, y + 14]], { head: 'none' });
  s += line([[xs[0], y + 14], [xs[4], y + 14]], { head: 'none' });
  y += 14;
  // Converging: the synthesis, the gap, the study.
  const steps = [
    ['Synthesis (2.1.6)', 'Each study solves one part in isolation, finance, communication or tenant tracking, not all of them together. Recent housing systems were evaluated with ISO/IEC 25010 (Canlas et al., 2026; Pernate et al., 2025).', 860],
    ['Gap (2.2)', 'No integrated system is built for a small, resource-constrained boarding house and used by both its landlady and its tenants. Puspasari et al. (2025) serve the manager only.', 760],
    ['This study', 'Hivelet: one Progressive Web Application joining tenant and unit records, financial tracking, repair requests and inquiries, evaluated with ISO/IEC 25010.', 660],
  ];
  for (const [i, [head, text, w]] of steps.entries()) {
    const h = lh(text, w - 24, 13.5) + 40;
    s += line([[W / 2, y], [W / 2, y + 28]]);
    y += 28;
    s += rect(W / 2 - w / 2, y, w, h, { rx: 8, sw: i === 2 ? 2.4 : 1.6 });
    s += T(W / 2, 0, head, { top: y + 8, size: 14, weight: 'bold' });
    s += T(W / 2, 0, text, { top: y + 28, size: 13.5, w: w - 24 });
    y += h;
  }
  return { W, H: y + 16, body: s };
}

const DIAGRAMS = {
  'as-is': { file: 'figure-4-current-process.png', make: asIs },
  architecture: { file: 'figure-5-system-architecture.png', make: architecture },
  context: { file: 'figure-6-context-diagram.png', make: context },
  dfd: { file: 'figure-7-data-flow-level-1.png', make: dfd },
  'use-cases': { file: 'figure-8-use-case-diagram.png', make: useCases },
  erd: { file: 'figure-9-entity-relationship.png', make: erd },
  // Outside Chapter 4: Chapter 2's framework and Appendices C and F (FINAL/08_APPENDICES.md).
  framework: { file: 'figure-2-2-conceptual-framework.png', make: framework },
  agile: { file: 'figure-3-1-agile-cycle.png', make: agile },
  gantt: { file: 'appendix-c-gantt-chart.png', make: gantt },
  'dfd-1': { file: 'appendix-f-dfd-1-inquiries.png', make: childDfd('1') },
  'dfd-2': { file: 'appendix-f-dfd-2-units-and-rates.png', make: childDfd('2') },
  'dfd-3': { file: 'appendix-f-dfd-3-tenancies.png', make: childDfd('3') },
  'dfd-4': { file: 'appendix-f-dfd-4-billing-and-payments.png', make: childDfd('4') },
  'dfd-5': { file: 'appendix-f-dfd-5-repair-requests.png', make: childDfd('5') },
  'dfd-6': { file: 'appendix-f-dfd-6-expenses.png', make: childDfd('6') },
  'dfd-7': { file: 'appendix-f-dfd-7-reports.png', make: childDfd('7') },
  'dfd-8': { file: 'appendix-f-dfd-8-account.png', make: childDfd('8') },
  'literature-map': { file: 'appendix-r-literature-map.png', make: literatureMap },
};

// ---------------------------------------------------------------------------------------------
// Render: SVG to PNG at twice the canvas, by headless Chrome with a throwaway profile.
// ---------------------------------------------------------------------------------------------
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  .find((p) => fs.existsSync(p));

function render(key) {
  const { file, make } = DIAGRAMS[key];
  const { W, H, body } = make();
  const svgText = svg(W, H, body);
  fs.mkdirSync(srcDir, { recursive: true });
  const svgPath = path.join(srcDir, file.replace(/\.png$/, '.svg'));
  fs.writeFileSync(svgPath, svgText);
  if (!CHROME) { console.log(`${key}: SVG written; no Chrome found to render ${file}`); return; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hivelet-diagram-'));
  const html = path.join(tmp, 'page.html');
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}</style></head><body>${svgText}</body></html>`);
  execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', `--user-data-dir=${path.join(tmp, 'profile')}`,
    `--window-size=${W},${H}`, '--force-device-scale-factor=2', `--screenshot=${path.join(outDir, file)}`,
    'file:///' + html.replace(/\\/g, '/')], { stdio: 'ignore' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${key}: ${file} (${W} x ${H})`);
}

const wanted = process.argv.slice(2);
for (const key of wanted.length ? wanted : Object.keys(DIAGRAMS)) {
  if (!DIAGRAMS[key]) throw new Error(`no diagram "${key}"; have ${Object.keys(DIAGRAMS).join(', ')}`);
  render(key);
}
