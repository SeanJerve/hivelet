#!/usr/bin/env node
// Checks a Word manuscript, including the team's own final file after pasting (13 October 2026):
//
//   node scripts/manuscript/check-docx.mjs "path/to/manuscript.docx"
//
// build-final.mjs guards the Markdown in FINAL/; nothing guarded the Word file the team prints. This
// reads the .docx itself and reports, by page-independent quotation:
//   - a table or figure cited in the text that no caption carries, and old-style numbers ("Table 5")
//   - a "Section 4.4.8" with no heading of that number
//   - a citation with no reference entry, and a reference entry cited nowhere
//   - markers that must not be printed: [TO DO, [KEEP, [IMAGE FILE, [DATA PENDING, <System Name>
//   - the locked facts: the property has 33 units; no annual increase rule; Adyen spelled so; the
//     gateway never called a mock or simulator
// Exits 1 if anything is found.
import fs from 'node:fs';
import JSZip from 'jszip';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('usage: node scripts/manuscript/check-docx.mjs <file.docx>'); process.exit(2); }
const zip = await JSZip.loadAsync(fs.readFileSync(file));
const xml = await zip.file('word/document.xml').async('string');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
// One string per paragraph, from its text runs; tabs and breaks become spaces.
const paras = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) =>
  decode(m[0].replace(/<w:tab\/>|<w:br\/>/g, ' ').replace(/<w:delText[^>]*>[\s\S]*?<\/w:delText>/g, '')
    .replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g, '').match(/<w:t[^>]*>[^<]*<\/w:t>/g)?.map((t) => t.replace(/<[^>]+>/g, '')).join('') ?? '')
).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
const text = paras.join('\n');
const problems = [];
const say = (kind, msg) => problems.push(`${kind.padEnd(11)} ${msg}`);

// ---- tables and figures ---------------------------------------------------------------------
const caps = { Table: new Set(), Figure: new Set() };
for (const p of paras) {
  const m = p.match(/^(Table|Figure)\s+([A-Z0-9]+-\d+[a-z]?)\.?\s/);
  if (m) caps[m[1]].add(m[2]);
}
const seq = (id) => id.split('-');
for (const kind of ['Table', 'Figure']) {
  const re = new RegExp(String.raw`\b${kind}s?\s+([A-Z0-9]+-\d+[a-z]?(?:(?:,\s*|,?\s+and\s+|\s+to\s+|\s+or\s+)[A-Z0-9]+-\d+[a-z]?)*)`, 'g');
  for (const m of text.matchAll(re)) {
    const ids = m[1].split(/,\s*|,?\s+and\s+|\s+or\s+/).flatMap((part) => {
      const r = part.split(/\s+to\s+/);
      if (r.length === 2 && seq(r[0])[0] === seq(r[1])[0]) {
        const [c, a] = seq(r[0]); const b = +seq(r[1])[1];
        return Array.from({ length: Math.max(0, b - +a + 1) }, (_, i) => `${c}-${+a + i}`);
      }
      return r;
    });
    for (const id of ids) if (!caps[kind].has(id.replace(/[a-z]$/, '')) && !caps[kind].has(id)) say('NO CAPTION', `${kind} ${id} is cited, but no caption is "${kind} ${id}."`);
  }
  for (const m of text.matchAll(new RegExp(String.raw`\b${kind}s?\s+(\d+[A-Za-z]?)\b(?!-)`, 'g'))) say('OLD NUMBER', `"${m[0]}": the paper numbers by chapter (${kind} 4-1)`);
}

// ---- sections ---------------------------------------------------------------------------------
const heads = new Set(paras.map((p) => (p.match(/^(\d+(?:\.\d+)+)\s+[A-Z]/) || [])[1]).filter(Boolean));
for (const m of text.matchAll(/\bSections?\s+(\d+\.\d+(?:\.\d+)*(?:(?:,\s*|\s+(?:and|to|or)\s+)\d+\.\d+(?:\.\d+)*)*)/g)) {
  for (const n of m[1].split(/,\s*|\s+(?:and|to|or)\s+/)) if (!heads.has(n)) say('NO SECTION', `Section ${n} is cited, but no heading starts "${n}"`);
}

// ---- citations against the reference list ---------------------------------------------------
const ri = paras.findIndex((p) => /^REFERENCES$/i.test(p));
const ai = paras.findIndex((p, i) => i > ri && /^APPENDI(CES|X)\b/i.test(p));
if (ri < 0) say('NO REFS', 'no paragraph reads "REFERENCES"');
else {
  const entries = paras.slice(ri + 1, ai > ri ? ai : undefined).filter((p) => /\((\d{4}[a-z]?|n\.d\.)\)/.test(p));
  const keyOf = (e) => {
    const year = (e.match(/\((\d{4}[a-z]?|n\.d\.)\)/) || [])[1];
    const who = /^International Organization for Standardization, International Electrotechnical Commission, &/.test(e) ? 'ISO/IEC/IEEE'
      : /^International Organization for Standardization & International Electrotechnical/.test(e) ? 'ISO/IEC' : e.split(/[,.\s]/)[0];
    return `${who} ${year}`;
  };
  const keys = new Set(entries.map(keyOf));
  const cited = new Set();
  const body = paras.slice(0, ri).join(' ');
  for (const m of body.matchAll(/\(([^()]*?(?:\d{4}[a-z]?|n\.d\.))\)/g)) {
    for (const part of m[1].split(';').map((x) => x.trim().replace(/^International Organization[\s\S]*?\[(ISO\/IEC(?:\/IEEE)?)\]/, '$1'))) {
      const p = part.match(/^((?:ISO\/IEC(?:\/IEEE)?)|[A-Z][\p{L}-]+)(?:[^,]*), (\d{4}[a-z]?|n\.d\.)$/u);
      if (p) cited.add(`${p[1]} ${p[2]}`);
    }
  }
  for (const m of body.matchAll(/\b([A-Z][\p{L}-]+)(?: et al\.| (?:and|&) [A-Z][\p{L}-]+)? \((\d{4}[a-z]?)\)/gu)) cited.add(`${m[1]} ${m[2]}`);
  for (const k of cited) if (!keys.has(k)) say('NO ENTRY', `${k} is cited, but the reference list has no entry for it`);
  for (const k of keys) if (!cited.has(k)) say('UNCITED', `${k} is in the reference list but cited nowhere before it`);
}

// ---- markers and locked facts ------------------------------------------------------------------
const count = (re) => (text.match(re) || []).length;
for (const [label, re] of [['[TO DO', /\[TO DO/g], ['[KEEP', /\[KEEP/g], ['[IMAGE FILE', /\[IMAGE FILE/g], ['[DATA PENDING', /\[DATA PENDING/g], ['<System Name>', /<System Name>/g], ['TEAM NOTE', /TEAM NOTE/g]]) {
  const n = count(re); if (n) say('MARKER', `${n} x ${label} still in the text`);
}
for (const [label, re] of [
  ['the property has 33 units, not 32', /\b32[- ]units?\b|\b32-unit\b/gi],
  ['no annual increase rule exists', /\b2\s?% annual/gi],
  ['the gateway is Adyen', /\bAyden\b/g],
  ['the gateway is never a mock or simulator', /\b(mock|simulat\w*)\b[^.]{0,40}\b(gateway|Adyen|GCash|payment)|\b(gateway|Adyen|GCash)\b[^.]{0,40}\b(mock|simulat\w*)\b/gi],
]) for (const m of text.matchAll(re)) say('LOCKED FACT', `"${m[0]}": ${label}`);

console.log(`${file}\n  ${paras.length} paragraphs, ${caps.Table.size} table and ${caps.Figure.size} figure captions\n`);
if (!problems.length) { console.log('  OK  nothing found'); process.exit(0); }
const byKind = {};
for (const p of problems) byKind[p.slice(0, 11).trim()] = (byKind[p.slice(0, 11).trim()] || 0) + 1;
console.log(`  ${problems.length} finding(s): ${Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', ')}\n`);
for (const p of [...new Set(problems)]) console.log(`  ${p}`);
process.exit(1);
