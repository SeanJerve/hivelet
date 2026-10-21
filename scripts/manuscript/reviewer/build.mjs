// Builds the team study page from FINAL/STUDY_GUIDE_DEFENSE_QA.md and section 4 of
// FINAL/STUDY_GUIDE_TEAM_REVIEWER.md. Nothing is retyped: questions, answers and figures are
// parsed from the guides, so the page cannot say what they do not.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// node scripts/manuscript/reviewer/build.mjs [out.html]   (default: FINAL/_reviewer/hivelet-reviewer.html)
// Published as the team's study page: https://claude.ai/artifact/HcPUTm1QV1Qcov8SK6MwKQ (rebuild, then republish).
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const out = process.argv[2] ?? path.join(root, 'FINAL', '_reviewer', 'hivelet-reviewer.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
const norm = (s) => s.replace(/\r\n/g, '\n');
const qa = norm(fs.readFileSync(path.join(root, 'FINAL/STUDY_GUIDE_DEFENSE_QA.md'), 'utf8'));
const rev = norm(fs.readFileSync(path.join(root, 'FINAL/STUDY_GUIDE_TEAM_REVIEWER.md'), 'utf8'));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
function block(lines) {
  // Paragraphs, quotes and pipe tables, which is all the answers use.
  const html = [];
  let para = [];
  const flush = () => { if (para.length) { html.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\|/.test(l)) {
      flush();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...body] = rows;
      html.push(`<div class="tbl"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (/^>\s?/.test(l)) {
      flush();
      const q = [];
      while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      i--;
      html.push(`<blockquote>${inline(q.join(' '))}</blockquote>`);
    } else if (!l.trim()) flush();
    else para.push(l.trim());
  }
  flush();
  return html.join('');
}

// ---- questions ------------------------------------------------------------
const sections = [];
let cur = null;
let q = null;
const lines = qa.split('\n');
for (const l of lines) {
  const h = l.match(/^## (\d+)\. (.+)$/);
  if (h) { cur = { id: Number(h[1]), title: h[2], items: [] }; sections.push(cur); q = null; continue; }
  if (/^## /.test(l)) { cur = null; q = null; continue; }
  if (!cur || /^---\s*$/.test(l)) continue;
  const m = l.match(/^\*\*(.+?)\*\*\s*$/);
  if (m) { q = { q: m[1].replace(/^"|"$/g, ''), body: [] }; cur.items.push(q); continue; }
  if (q) q.body.push(l);
}
const questions = [];
for (const s of sections) for (const it of s.items) {
  const text = it.body.join('\n').trim();
  // The proof is the italic tail of the answer: "*Section 4.2.6; Table 4-7.*"
  const where = (text.match(/\*([^*]*(?:Section|Chapter|Table|Appendix|Figure|NFR|`)[^*]*)\*\.?\s*$/) || [])[1] || '';
  const body = where ? text.slice(0, text.lastIndexOf(`*${where}*`)).trim() : text;
  questions.push({ s: s.id, q: it.q, a: block(body.split('\n')), where: inline(where.replace(/\.$/, '')) });
}
const how = block(qa.slice(qa.indexOf('## How to answer any question'), qa.indexOf('## 1.')).split('\n').slice(1)
  .filter((l) => !/^---/.test(l)).map((l) => l.replace(/^\d\.\s+/, '')));
const failPlan = block(qa.slice(qa.indexOf('## If the live demo fails')).split('\n').slice(1));

// ---- numbers --------------------------------------------------------------
const s4 = rev.slice(rev.indexOf('## 4. The numbers to know cold'), rev.indexOf('## 5.'));
const groups = [];
let g = null;
for (const l of s4.split('\n')) {
  const t = l.match(/^\*\*(.+?)\*\*(.*)$/);
  if (t && !/^\|/.test(l)) { g = { title: t[1], note: t[2].trim(), rows: [] }; groups.push(g); continue; }
  if (g && /^\|/.test(l) && !/^\|\s*:?-/.test(l)) {
    const c = l.replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
    if (/^(Figure|Characteristic)$/.test(c[0])) { g.head = c; continue; }
    g.rows.push(c);
  }
}
const numbers = groups.map((gr) => ({
  title: gr.title,
  rows: gr.rows.map((c) => ({ k: inline(c[0]), v: inline(c.slice(1).join(' · ')), plain: c.slice(1).join(' · ').replace(/\*\*/g, '') })),
}));

const data = { sections: sections.map((s) => ({ id: s.id, title: s.title })), questions, numbers, how, failPlan };
const tpl = fs.readFileSync(path.join(here, 'page.html'), 'utf8');
fs.writeFileSync(out, tpl.replace('/*__DATA__*/null', JSON.stringify(data)));
console.log(`${questions.length} questions in ${sections.length} sections; ${numbers.reduce((s, n) => s + n.rows.length, 0)} figures in ${numbers.length} groups; ` +
  `${questions.filter((x) => !x.where).length} without a source`);
