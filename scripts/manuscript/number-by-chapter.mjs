#!/usr/bin/env node
// The course guide numbers tables and figures with their chapter (Table 4-1, Figure 4-1, restarting
// each chapter; GUIDE_ALIGNMENT D2). The drafts number them across the document (Table 5 to 25,
// with lettered tables between). This writes the lookup the team needs when renumbering in Word:
//
//   node scripts/manuscript/number-by-chapter.mjs
//     -> docs/FINAL MANUSCRIPT/TABLE_AND_FIGURE_NUMBERS.md
//
// New numbers follow the order the captions appear in Chapter 4. Chapters 2 and 3 come from the
// manuscript PDF of 18 September plus the tables FIXES_TO_CHAPTERS_1_TO_3.md adds (4A and 4B, after
// the Likert table). Every reference in the abstract and Chapters 4 and 5 is listed with its line,
// and a range ("Tables 14 to 21") is spelled out, because lettered tables sit inside it and the new
// numbers are no longer consecutive. Exits 1 if the text cites a number no caption has. Rerun it
// whenever a table is added or moved.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = path.join(root, 'docs', 'FINAL MANUSCRIPT');
const files = ['ABSTRACT.md', 'CHAPTER_4_RESULTS_AND_DISCUSSION.md', 'CHAPTER_5_SUMMARY_CONCLUSIONS_RECOMMENDATIONS.md'];

// Chapters 2 and 3, from the manuscript (List of Tables and Figures, pages 13 to 36) and FIXES H8.
const earlier = {
  Table: [['1', '3-1', 'Software Requirements'], ['2', '3-2', 'Hardware Requirements'],
    ['3', '3-3', 'Mobile Testing Hardware Specifications'], ['4', '3-4', 'Likert Scale'],
    ['4A', '3-5', 'Interpretation of Mean Scores (FIXES H8)'],
    ['4B', '3-6', 'Survey Items and Tests Assigned to the ISO/IEC 25010:2011 Sub-characteristics (FIXES H8)']],
  Figure: [['1', '2-1', 'Management Information System (MIS) framework by Laudon and Laudon'],
    ['2', '2-2', 'Conceptual Framework'], ['3', '3-1', 'Agile Software Development Life Cycle']],
};
const earlierKeys = { Table: new Set(earlier.Table.map((e) => e[0])), Figure: new Set(earlier.Figure.map((e) => e[0])) };

const ch4 = fs.readFileSync(path.join(dir, files[1]), 'utf8').split(/\r?\n/);
const map = { Table: new Map(), Figure: new Map() };
const caption = { Table: new Map(), Figure: new Map() };
for (const kind of ['Table', 'Figure']) for (const [o, n, c] of earlier[kind]) { map[kind].set(o, n); caption[kind].set(o, c); }
let t = 0; let f = 0;
for (const line of ch4) {
  let m = line.match(/^\*\*Table (\d+[A-Z]?)\.\*\*\s*(.*)$/);
  if (m) { map.Table.set(m[1], `4-${++t}`); caption.Table.set(m[1], m[2].trim()); continue; }
  m = line.match(/^\*Figure (\d+[a-z]?)\.\s*(.*?)\*?$/);
  if (m) { map.Figure.set(m[1], `4-${++f}`); caption.Figure.set(m[1], m[2].replace(/[.*]+$/, '').trim()); }
}

const order = (kind) => [...map[kind].keys()];
const newOf = (kind, o) => map[kind].get(o) || `?${o}`;
function expandRange(kind, a, b) {
  const keys = order(kind); const i = keys.indexOf(a); const j = keys.indexOf(b);
  if (i < 0 || j < 0 || j < i) return null;
  // A range of plain numbers ("14 to 21") means those numbers only; a range of lettered ones
  // ("14A to 21A") means the lettered ones. Mixed ranges ("8 to 11E") take everything between.
  const span = keys.slice(i, j + 1);
  const letter = (k) => /[A-Za-z]$/.test(k);
  const pick = letter(a) === letter(b) ? span.filter((k) => letter(k) === letter(a)) : span;
  return { olds: pick, news: pick.map((k) => newOf(kind, k)) };
}
// 4-1, 4-2, 4-3 stays a range; 4-24, 4-26 does not.
const consecutive = (ns) => ns.every((n, i) => i === 0 || +n.split('-')[1] === +ns[i - 1].split('-')[1] + 1);

const refs = { Table: new Map(), Figure: new Map() };
const addRef = (kind, o, where) => (refs[kind].get(o) || refs[kind].set(o, []).get(o)).push(where);
const ranges = [];
const unknown = [];
const sep = String.raw`(?:,\s+and\s+|,\s+|\s+and\s+|\s+or\s+|\s+to\s+)`;
for (const file of files) {
  // Team notes are deleted before pasting, so they are blanked (keeping their lines for numbering).
  // A reference can break across lines ("Table" ending one, "12B" starting the next), so the whole
  // text is searched at once.
  const lines = fs.readFileSync(path.join(dir, file), 'utf8').split(/\r?\n/).map((l) => (l.startsWith('>') ? '' : l));
  const text = lines.join('\n');
  const starts = []; let pos = 0; for (const l of lines) { starts.push(pos); pos += l.length + 1; }
  const lineAt = (i) => { let lo = 0; let hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= i) lo = mid; else hi = mid - 1; } return lo; };
  const label = file.startsWith('CHAPTER_4') ? 'Ch 4' : file.startsWith('CHAPTER_5') ? 'Ch 5' : 'Abstract';
  const whereAt = (i) => {
    const n = lineAt(i); let section = '';
    for (let k = n; k >= 0; k--) { const h = lines[k].match(/^#{1,4}\s+(.*)/); if (h) { section = h[1].trim(); break; } }
    return `${label}, line ${n + 1}${section ? ` (${section.slice(0, 40)})` : ''}`;
  };
  for (const kind of ['Table', 'Figure']) {
    const re = new RegExp(String.raw`\b${kind}s?\s+((?:\d+[A-Za-z]?)(?:${sep}(?:\d+[A-Za-z]?))*)`, 'g');
    for (const m of text.matchAll(re)) {
      const n = lineAt(m.index);
      // The caption itself ("**Table 7.**" or "*Figure 5.") is not a reference to it.
      if (starts[n] === m.index - (kind === 'Table' ? 2 : 1) && /^(\*\*Table|\*Figure) /.test(lines[n])) continue;
      const where = whereAt(m.index);
      const tokens = m[1].split(new RegExp(`(${sep})`));
      for (let k = 0; k < tokens.length; k += 2) {
        const o = tokens[k];
        if (/^\s+to\s+$/.test(tokens[k + 1] || '')) {
          const b = tokens[k + 2];
          const r = expandRange(kind, o, b);
          const to = r ? `${kind}s ${consecutive(r.news) ? `${r.news[0]} to ${r.news.at(-1)}` : r.news.join(', ')}` : '(check by hand)';
          ranges.push({ where, text: `${kind}s ${o} to ${b}`, to });
          if (r) r.olds.forEach((x) => addRef(kind, x, where));
          k += 2; continue;
        }
        if (!map[kind].has(o)) { unknown.push(`${where}: ${kind} ${o}`); continue; }
        addRef(kind, o, where);
      }
    }
  }
}

let out = `# Table and figure numbers by chapter

> **TEAM NOTE.** Generated ${new Date().toISOString().slice(0, 10)} by \`node scripts/manuscript/number-by-chapter.mjs\`; do not edit by hand,
> rerun it. The course guide numbers exhibits with their chapter, restarting each chapter (GUIDE_ALIGNMENT D2).
> Use this when pasting into Word: insert each caption with **References > Insert Caption** (label Table or
> Figure, "Include chapter number" ticked), then replace each reference below with **Insert
> Cross-reference** so Word keeps them right if a table moves. The drafts keep their old numbers on purpose, so
> every other document that cites "Table 22A" still finds it.

## Ranges to rewrite

The lettered tables sit between the numbered ones, so a range of old numbers is no longer a range of new ones.
Each is spelled out below; if a list reads badly, name the group instead (for example "the survey tables for
each characteristic") and cite the first and last.

| Where | Now | Becomes |
| :--- | :--- | :--- |
${ranges.map((r) => `| ${r.where} | ${r.text} | ${r.to} |`).join('\n')}
`;
for (const kind of ['Table', 'Figure']) {
  out += `\n## ${kind}s\n\n| Old | New | Caption | Referenced at |\n| :--- | :--- | :--- | :--- |\n`;
  for (const o of order(kind)) {
    const r = refs[kind].get(o) || [];
    const at = r.length ? [...new Set(r)].join('; ') : earlierKeys[kind].has(o) ? 'Chapters 2 and 3 only' : '**not referenced in the text**';
    out += `| ${o} | **${newOf(kind, o)}** | ${caption[kind].get(o) || ''} | ${at} |\n`;
  }
}
if (unknown.length) out += `\n## References to a number that has no caption\n\n${unknown.map((u) => `- ${u}`).join('\n')}\n`;
fs.writeFileSync(path.join(dir, 'TABLE_AND_FIGURE_NUMBERS.md'), out);
console.log(`Tables ${map.Table.size}, figures ${map.Figure.size}, ranges ${ranges.length}, unmatched ${unknown.length} -> docs/FINAL MANUSCRIPT/TABLE_AND_FIGURE_NUMBERS.md`);
if (unknown.length) { console.log(unknown.join('\n')); process.exitCode = 1; }
