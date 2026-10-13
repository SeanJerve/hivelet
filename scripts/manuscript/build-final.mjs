#!/usr/bin/env node
// Builds FINAL/, the manuscript the team retypes into Word: every chapter with every fix applied,
// numbered the way the course guide asks (Table 4-1, restarting each chapter), with the team notes
// taken out.
//
//   node scripts/manuscript/build-final.mjs
//
// Sources:
//   FINAL/_src/CHAPTER_1.md to CHAPTER_3.md   Chapters 1 to 3, rewritten from the 18 September
//                                             manuscript with FIXES_TO_CHAPTERS_1_TO_3.md applied
//   docs/FINAL MANUSCRIPT/                    the abstract, Chapters 4 and 5 and Appendices K, M, N, O
//
// All sources keep the drafts' old numbers (Table 7A, Figure 11), so other documents that cite
// them still find them; this is the only place they change. The map is the same one
// number-by-chapter.mjs prints: Chapters 2 and 3 in manuscript order, then Chapter 4 in caption
// order. Exits 1 if any text cites a number no caption has, or if a team note or an old-style
// reference survives into FINAL/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = path.join(root, 'FINAL', '_src');
const docs = path.join(root, 'docs', 'FINAL MANUSCRIPT');
const out = path.join(root, 'FINAL');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// ---- the number map -------------------------------------------------------------------------
const map = { Table: new Map(), Figure: new Map() };
const captionRe = { Table: /^\*\*Table (\d+[A-Z]?)\.\*\*/, Figure: /^\*Figure (\d+[a-z]?)\./ };
function number(text, chapter) {
  let t = 0; let f = 0;
  for (const line of text.split('\n')) {
    let m = line.match(captionRe.Table);
    if (m) { map.Table.set(m[1], `${chapter}-${++t}`); continue; }
    m = line.match(captionRe.Figure);
    if (m) map.Figure.set(m[1], `${chapter}-${++f}`);
  }
  return { t, f };
}
const chapters = {
  1: read(path.join(src, 'CHAPTER_1.md')),
  2: read(path.join(src, 'CHAPTER_2.md')),
  3: read(path.join(src, 'CHAPTER_3.md')),
  4: read(path.join(docs, 'CHAPTER_4_RESULTS_AND_DISCUSSION.md')),
  5: read(path.join(docs, 'CHAPTER_5_SUMMARY_CONCLUSIONS_RECOMMENDATIONS.md')),
};
const counts = {};
for (const c of [1, 2, 3, 4, 5]) counts[c] = number(chapters[c], c);
// Tables moved out of Chapter 4 to Appendix M on 12 October keep being cited by their old number
// inside the appendix ("Table 10, steps 9 and 18"); each caption there names its old number.
const appMRaw = read(path.join(docs, 'APPENDIX_M_CHAPTER_4_EVIDENCE.md'));
for (const m of appMRaw.matchAll(/^\*\*Table (M-\d+)\.\*\*.*?\(Chapter 4's Table (\d+[A-Z]?) before 12 October 2026/gm)) {
  // Table 23 stayed in Chapter 4 as a summary of M-18; a citation of it means the chapter's table.
  if (!map.Table.has(m[2])) map.Table.set(m[2], m[1]);
}

// ---- rewriting ------------------------------------------------------------------------------
const problems = [];
const order = (kind) => [...map[kind].keys()];
const seq = (n) => +n.split('-')[1];
function joinList(ns) {
  if (ns.length === 1) return ns[0];
  if (ns.length > 2 && ns.every((n, i) => i === 0 || (n.split('-')[0] === ns[0].split('-')[0] && seq(n) === seq(ns[i - 1]) + 1))) {
    return `${ns[0]} to ${ns.at(-1)}`;
  }
  return `${ns.slice(0, -1).join(', ')} and ${ns.at(-1)}`;
}
function expandRange(kind, a, b) {
  const keys = order(kind); const i = keys.indexOf(a); const j = keys.indexOf(b);
  if (i < 0 || j < 0 || j < i) return null;
  const letter = (k) => /[A-Za-z]$/.test(k);
  const span = keys.slice(i, j + 1);
  return letter(a) === letter(b) ? span.filter((k) => letter(k) === letter(a)) : span;
}
const sep = String.raw`(?:,\s+and\s+|,\s+|\s+and\s+|\s+or\s+|\s+to\s+)`;
function renumber(text, where) {
  // Captions first, so the reference pass below does not see them.
  text = text.replace(/^\*\*Table (\d+[A-Z]?)\.\*\*/gm, (s, o) => (map.Table.has(o) ? `**Table ${map.Table.get(o)}.**` : (problems.push(`${where}: caption Table ${o}`), s)));
  text = text.replace(/^\*Figure (\d+[a-z]?)\./gm, (s, o) => (map.Figure.has(o) ? `*Figure ${map.Figure.get(o)}.` : (problems.push(`${where}: caption Figure ${o}`), s)));
  for (const kind of ['Table', 'Figure']) {
    const re = new RegExp(String.raw`\b(${kind}s?)(\s+)((?:\d+[A-Za-z]?)(?:${sep}(?:\d+[A-Za-z]?))*)\b(?!-)`, 'g');
    text = text.replace(re, (whole, word, gap, list) => {
      // A caption already renumbered ("Table 4-1") is not matched, because of the (?!-) guard.
      const tokens = list.split(new RegExp(`(${sep})`));
      const parts = []; // groups of new numbers, each keeping the separator that followed it
      for (let k = 0; k < tokens.length; k += 2) {
        const o = tokens[k];
        if (/^\s+to\s+$/.test(tokens[k + 1] || '')) {
          const r = expandRange(kind, o, tokens[k + 2]);
          if (!r) { problems.push(`${where}: ${kind} range ${o} to ${tokens[k + 2]}`); return whole; }
          parts.push(r.map((x) => map[kind].get(x)));
          k += 2;
        } else if (map[kind].has(o)) parts.push([map[kind].get(o)]);
        else { problems.push(`${where}: ${kind} ${o}`); return whole; }
      }
      const all = parts.flat();
      return `${all.length > 1 ? `${kind}s` : kind}${gap}${joinList(all)}`;
    });
  }
  return text;
}
function stripTeamNotes(text) {
  // Every blockquote in the drafts is a team note; a run of '>' lines goes with the blank line after it.
  return text.replace(/(^>.*\n)+\n?/gm, '');
}
function figures(text, depth) {
  const up = '../'.repeat(depth);
  return text.replace(/\]\(figures\//g, `](<${up}docs/FINAL MANUSCRIPT/figures/`).replace(/(\]\(<[^>)]*?\.png)\)/g, '$1>)');
}
const write = (name, text) => {
  const p = path.join(out, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
  return name;
};

// ---- particular edits -----------------------------------------------------------------------
// Each must match exactly once, or the build stops: a draft that changed under it is a reason to look.
function once(text, a, b, where) {
  if (text.split(a).length !== 2) { problems.push(`${where}: expected once: ${a.slice(0, 60)}`); return text; }
  return text.replace(a, () => b);
}
// The Chapter 4 note on the signed form becomes a marker in the text, where the sentence goes.
let ch4 = chapters[4];
ch4 = once(ch4, `> **TEAM NOTE.** Once the owner has signed the acceptance form (Appendix O), add after this section's first`,
  `**[TO DO when the owner signs Appendix O: add "The owner's signed acceptance form is in Appendix O." after this section's first paragraph. If she does not accept it yet, say what she asked for instead.]**\n\n> **TEAM NOTE.** Once the owner has signed the acceptance form (Appendix O), add after this section's first`, 'Ch 4');
let appO = read(path.join(docs, 'APPENDIX_O_UAT_SIGN_OFF.md'));
appO = once(appO, '> **TEAM NOTE (delete before pasting).** The course guide',
  '**[TO DO: place the scan of the signed form here (print UAT_SIGN_OFF_FORM.docx; the owner signs only if she agrees).]**\n\n> **TEAM NOTE (delete before pasting).** The course guide', 'App O');
// Appendix M captions carry the drafts' old numbers ("Chapter 4's Table 10 before 12 October 2026");
// in the final paper there is no old number to point at.
let appM = appMRaw
  .replace(/\(Chapter 4's Table \d+[A-Z]? before 12 October 2026; summarized in /g, '(summarized in ');

// ---- assemble -------------------------------------------------------------------------------
const made = [];
const chapter = (n, file, text) => made.push(write(file, figures(renumber(stripTeamNotes(text), `Ch ${n}`), 1)));
made.push(write('01_ABSTRACT.md', renumber(stripTeamNotes(read(path.join(docs, 'ABSTRACT.md'))), 'Abstract')));
chapter(1, '02_CHAPTER_1_INTRODUCTION.md', chapters[1]);
chapter(2, '03_CHAPTER_2_THEORETICAL_FRAMEWORK.md', chapters[2]);
chapter(3, '04_CHAPTER_3_MATERIALS_AND_METHODS.md', chapters[3]);
chapter(4, '05_CHAPTER_4_RESULTS_AND_DISCUSSION.md', ch4);
chapter(5, '06_CHAPTER_5_SUMMARY_CONCLUSIONS_AND_RECOMMENDATIONS.md', chapters[5]);
const app = (file, text, where) => made.push(write(`appendices/${file}`, figures(renumber(stripTeamNotes(text), where), 2)));
app('APPENDIX_K_USER_MANUAL.md', read(path.join(docs, 'USER_MANUAL_APPENDIX_K.md')), 'App K');
app('APPENDIX_M_CHAPTER_4_EVIDENCE.md', appM, 'App M');
app('APPENDIX_N_DATA_DICTIONARY.md', read(path.join(docs, 'APPENDIX_N_DATA_DICTIONARY.md')), 'App N');
app('APPENDIX_O_UAT_SIGN_OFF.md', appO, 'App O');

// Appendices written for FINAL itself (C, F, Q), with images from docs/FINAL MANUSCRIPT/figures/.
for (const file of fs.readdirSync(path.join(src, 'appendices')).filter((f) => f.endsWith('.md')).sort()) {
  app(file, read(path.join(src, 'appendices', file)), `App ${file.match(/APPENDIX_([A-Z])/)[1]}`);
}

made.push(write('08_APPENDICES.md', renumber(read(path.join(src, 'APPENDICES.md')), 'Appendices')));
// The AI-use statement is kept outside the repository until the adviser says where it goes
// (Sean, 13 October 2026): _AI_USE (not in repo)/AI_USE_STATEMENT.md.

// ---- references -----------------------------------------------------------------------------
// Every citation in the body needs an entry and every entry needs a citation (FIXES C7: two entries
// were cited nowhere, and Ullah et al. was cited five times with no entry). An entry is keyed by its
// first author's surname and its year; the ISO entries by the short name the text cites them by.
const refsText = read(path.join(src, 'REFERENCES.md'));
made.push(write('07_REFERENCES.md', refsText));
const entryKey = (e) => {
  const year = (e.match(/\((\d{4}[a-z]?|n\.d\.)\)/) || [])[1];
  const who = e.startsWith('International Organization for Standardization, International Electrotechnical Commission, & Institute')
    ? 'ISO/IEC/IEEE' : e.startsWith('International Organization for Standardization & International Electrotechnical') ? 'ISO/IEC' : e.split(/[,.\s]/)[0];
  return `${who} ${year}`;
};
const entries = refsText.split(/\n\n+/).map((p) => p.replace(/\n/g, ' ').trim()).filter((p) => p && !p.startsWith('#'));
const entryKeys = new Set(entries.map(entryKey));
const cited = new Map();
const body = ['01_ABSTRACT.md', '02_CHAPTER_1_INTRODUCTION.md', '03_CHAPTER_2_THEORETICAL_FRAMEWORK.md',
  '04_CHAPTER_3_MATERIALS_AND_METHODS.md', '05_CHAPTER_4_RESULTS_AND_DISCUSSION.md', '06_CHAPTER_5_SUMMARY_CONCLUSIONS_AND_RECOMMENDATIONS.md'];
for (const name of body) {
  const text = read(path.join(out, name)).replace(/\n/g, ' ');
  const cite = (who, year) => { const k = `${who} ${year}`; (cited.get(k) || cited.set(k, new Set()).get(k)).add(name.slice(0, 2)); };
  // (Burke, 2026; Ullah et al., 2018) and (ISO/IEC, 2011a)
  for (const m of text.matchAll(/\(([^()]*?(?:\d{4}[a-z]?|n\.d\.))\)/g)) {
    // A group author spelled out at its first citation carries its abbreviation in brackets
    // ("International Organization for Standardization & ... [ISO/IEC], 2011a").
    const parts = m[1].split(';').map((x) => x.trim().replace(/^International Organization[\s\S]*?\[(ISO\/IEC(?:\/IEEE)?)\]/, '$1'));
    const whos = [];
    for (const part of parts) {
      const p = part.match(/^((?:ISO\/IEC(?:\/IEEE)?)|[A-Z][\p{L}-]+)(?:[^,]*), (\d{4}[a-z]?|n\.d\.)$/u);
      if (p) { cite(p[1], p[2]); whos.push(p[1]); }
    }
    // APA 7: several works in one parenthesis are listed in the order of the reference list.
    const sorted = [...whos].sort((a, b) => a.localeCompare(b, 'en'));
    if (whos.join() !== sorted.join()) problems.push(`${name}: citations not in alphabetical order: (${m[1].slice(0, 90)})`);
  }
  // Burke (2026), Magno et al. (2024), Laudon and Laudon (2006)
  for (const m of text.matchAll(/\b([A-Z][\p{L}-]+)(?: et al\.| (?:and|&) [A-Z][\p{L}-]+)? \((\d{4}[a-z]?)\)/gu)) cite(m[1], m[2]);
}
for (const [k, where] of cited) if (!entryKeys.has(k)) problems.push(`cited with no reference entry: ${k} (in ${[...where].join(', ')})`);
for (const k of entryKeys) if (!cited.has(k)) problems.push(`reference entry never cited: ${k}`);

// ---- section references ---------------------------------------------------------------------
// "Section 4.4.8" must name a heading that exists: Chapter 4 was re-sectioned when it was cut, and
// Appendix M still pointed at the old security section.
const heads = new Set();
for (const name of made) for (const m of read(path.join(out, name)).matchAll(/^#+ (\d+(?:\.\d+)*)\b/gm)) heads.add(m[1]);
for (const name of made) {
  const text = read(path.join(out, name)).replace(/\n/g, ' ');
  for (const m of text.matchAll(/\b(?:Sections?|§)\s*(\d+\.\d+(?:\.\d+)*(?:(?:,\s*|\s+(?:and|to|or)\s+)\d+\.\d+(?:\.\d+)*)*)/g)) {
    for (const n of m[1].split(/,\s*|\s+(?:and|to|or)\s+/)) if (!heads.has(n)) problems.push(`${name}: Section ${n} has no heading`);
  }
}

// ---- checks on what was written -------------------------------------------------------------
for (const name of made) {
  const text = read(path.join(out, name));
  text.split('\n').forEach((line, i) => {
    if (/^>/.test(line) || /TEAM NOTE/.test(line)) problems.push(`${name}:${i + 1}: team note left in`);
    // Anything still numbered the old way: "Table 7A", "Figure 11", not "Table 4-5" or "Table M-3".
    for (const m of line.matchAll(/\b(Tables?|Figures?)\s+(\d+[A-Za-z]?)\b(?!-)/g)) problems.push(`${name}:${i + 1}: old number ${m[0]}`);
  });
}

console.log(`Numbered: ${[1, 2, 3, 4, 5].map((c) => `Ch ${c} ${counts[c].t} tables, ${counts[c].f} figures`).join('; ')}`);
console.log(`Wrote ${made.length} files to FINAL/`);
if (problems.length) { console.log(`\n${problems.length} problem(s):\n${problems.join('\n')}`); process.exitCode = 1; }
