// Builds the team study page from the study guides in FINAL/: the defense questions, the team
// reviewer (story, objectives, numbers, screens, words, tips, self-quiz), the references, the code
// guide's panel questions and the demo script's checklists. Nothing is retyped: every question,
// answer, figure and definition is parsed from the guides, so the page cannot say what they do not.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// node scripts/manuscript/reviewer/build.mjs [out.html]   (default: FINAL/_reviewer/hivelet-reviewer.html)
// Published as the team's study page: https://claude.ai/artifact/HcPUTm1QV1Qcov8SK6MwKQ (rebuild, then republish).
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..', '..');
const out = process.argv[2] ?? path.join(root, 'FINAL', '_reviewer', 'hivelet-reviewer.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
const read = (f) => fs.readFileSync(path.join(root, 'FINAL', f), 'utf8').replace(/\r\n/g, '\n');
const qa = read('STUDY_GUIDE_DEFENSE_QA.md');
const rev = read('STUDY_GUIDE_TEAM_REVIEWER.md');
const refs = read('STUDY_GUIDE_REFERENCES.md');
const code = read('STUDY_GUIDE_CODE.md');
const demo = read('DEMO_SCRIPT.md');

// The text between a heading that starts with `from` and the next heading of the same level.
function section(doc, from) {
  const level = from.match(/^#+/)[0];
  const start = doc.indexOf(from);
  if (start < 0) throw new Error(`No section "${from}"`);
  const body = doc.slice(doc.indexOf('\n', start) + 1);
  const end = body.search(new RegExp(`^${level} `, 'm'));
  return (end < 0 ? body : body.slice(0, end)).split('\n').filter((l) => !/^---\s*$/.test(l)).join('\n').trim();
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
const strip = (s) => s.replace(/\*\*|`/g, '');
const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const isRule = (r) => /^\|\s*:?-/.test(r);

// Paragraphs, headings, lists, quotes and pipe tables: everything the guides use.
function md(text) {
  const lines = typeof text === 'string' ? text.split('\n') : text;
  const html = [];
  let para = [];
  const flush = () => {
    if (!para.length) return;
    const p = para.join(' ');
    // A line that is only bold text is a small heading ("**Studying**").
    html.push(/^\*\*[^*]+\*\*$/.test(p) ? `<h3>${inline(p.slice(2, -2))}</h3>` : `<p>${inline(p)}</p>`);
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const item = l.match(/^(\d+\.|-)\s+(.*)$/);
    if (/^#{3,4} /.test(l)) { flush(); html.push(`<h3>${inline(l.replace(/^#+ /, ''))}</h3>`); }
    else if (/^\|/.test(l)) {
      flush();
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const [head, ...body] = rows.filter((r) => !isRule(r));
      html.push(`<div class="tbl"><table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (/^>/.test(l)) {
      flush();
      const q = [];
      while (i < lines.length && /^>/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      i--;
      html.push(`<blockquote>${md(q).replace(/<\/?p>/g, (t) => (t === '<p>' ? '' : '<br><br>')).replace(/(<br><br>)+$/, '')}</blockquote>`);
    } else if (item) {
      flush();
      const ordered = item[1] !== '-';
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\d+\.|-)\s+(.*)$/);
        if (m && (m[1] !== '-') === ordered) { items.push([m[2]]); i++; continue; }
        if (items.length && /^\s+\S/.test(lines[i])) { items[items.length - 1].push(lines[i].trim()); i++; continue; }
        break;
      }
      i--;
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map((it) => `<li>${inline(it.join(' '))}</li>`).join('')}</${tag}>`);
    } else if (/^<details>/.test(l)) flush();
    else if (!l.trim()) flush();
    else para.push(l.trim());
  }
  flush();
  return html.join('');
}

// ---- the defense questions ---------------------------------------------------
const sections = [];
const questions = [];
{
  let cur = null;
  let q = null;
  for (const l of qa.split('\n')) {
    const h = l.match(/^## (\d+)\. (.+)$/);
    if (h) { cur = { id: Number(h[1]), title: h[2], items: [] }; sections.push(cur); q = null; continue; }
    if (/^## /.test(l)) { cur = null; q = null; continue; }
    if (!cur || /^---\s*$/.test(l)) continue;
    const m = l.match(/^\*\*(.+?)\*\*\s*$/);
    if (m) { q = { q: m[1].replace(/^"|"$/g, ''), body: [] }; cur.items.push(q); continue; }
    if (q) q.body.push(l);
  }
  for (const s of sections) for (const it of s.items) {
    const text = it.body.join('\n').trim();
    // The proof is the italic tail of the answer: "*Section 4.2.6; Table 4-7.*"
    const where = (text.match(/\*([^*]*(?:Section|Chapter|Table|Appendix|Figure|NFR|`)[^*]*)\*\.?\s*$/) || [])[1] || '';
    const body = where ? text.slice(0, text.lastIndexOf(`*${where}*`)).trim() : text;
    questions.push({ s: s.id, q: it.q, a: md(body), where: inline(where.replace(/\.$/, '')) });
  }
  for (const s of sections) delete s.items;
}

// "- **"Question?"** answer" bullets, as in the references' and the code guide's panel questions.
function quotedBullets(text) {
  const found = [];
  for (const it of text.split(/\n(?=- )/)) {
    const m = it.replace(/\n\s+/g, ' ').match(/^- \*\*"(.+?)"\*\*\s*(.*)$/s);
    if (m) found.push({ q: m[1], a: md(m[2]) });
  }
  return found;
}

// ---- the self-quiz (team reviewer, section 9) --------------------------------
const SELF = 11, SOURCES = 12, CODE = 13;
for (const m of section(rev, '## 9.').matchAll(/<details><summary>\d+\. (.+?)<\/summary>(.+?)<\/details>/g)) {
  questions.push({ s: SELF, q: m[1], a: `<p>${inline(m[2])}</p>`, where: '' });
}

// ---- the references -----------------------------------------------------------
const sources = [];
{
  const body = refs.slice(refs.indexOf('## A.'), refs.indexOf('## Questions panels ask'));
  let card = null;
  let para = null;
  const finishPara = () => {
    if (!para) return;
    const m = para.join(' ').match(/^\*\*If asked "(.+?)"[^*]*\*\*\s*(.*)$/);
    if (m) sources.push({ q: m[1][0].toUpperCase() + m[1].slice(1), a: md(m[2]), where: '' });
    para = null;
  };
  const finish = () => {
    if (!card) return;
    const bullets = card.lines.join('\n').split(/\n(?=- )/).map((b) => b.replace(/\n\s+/g, ' ').replace(/^- /, '').trim());
    let where = '';
    const parts = [];
    for (const b of bullets) {
      const cited = b.match(/^\*\*Cited in:\*\*\s*(.*?)(?:\s+(\*\*.*))?$/);
      if (cited) { where = inline(cited[1].replace(/\.$/, '')); if (cited[2]) parts.push(`<blockquote>${inline(cited[2])}</blockquote>`); }
      else if (b.trim()) parts.push(`<p>${inline(b)}</p>`);
    }
    if (/title only/.test(card.status)) {
      parts.unshift('<blockquote><strong>Title only:</strong> the source could not be opened here. Someone must read it before the defense.</blockquote>');
    }
    sources.push({ q: card.q, a: parts.join(''), where, pl: 'Cited in' });
    card = null;
  };
  let table = false;
  for (const l of body.split('\n')) {
    const h = l.match(/^### (.+?)\s*\*\((.+)\)\*\s*$/);
    if (h) { finishPara(); finish(); card = { q: h[1], status: h[2], lines: [] }; continue; }
    if (/^## /.test(l) || /^---/.test(l)) { finishPara(); finish(); table = false; continue; }
    if (/^\|/.test(l)) {
      finish();
      if (isRule(l)) continue;
      const c = cells(l);
      if (c[0] === 'Source') { table = true; continue; }
      if (table) sources.push({ q: strip(c[0]), a: `<p>${inline(c[1])}</p>`, where: inline(c[2]), pl: 'Cited in' });
      continue;
    }
    if (/^\*\*If asked/.test(l)) { finish(); finishPara(); para = [l.trim()]; continue; }
    if (para) { if (l.trim()) para.push(l.trim()); else finishPara(); continue; }
    if (card) card.lines.push(l);
  }
  finishPara();
  finish();
  sources.push(...quotedBullets(section(refs, '## Questions panels ask')));
  // The five to know cold go first, and say so.
  const five = [...section(refs, '## Start here').matchAll(/^\d\. \*\*(.+?)\*\*/gm)].map((m) => m[1]);
  const isFive = (name) => (s) => s.q.startsWith(name) ||
    (s.q.split(/[ ,]/)[0] === name.split(' ')[0] && (s.q.match(/\(\d{4}\)/) || [''])[0] === (name.match(/\(\d{4}\)/) || ['-'])[0]);
  const top = five.map((n) => {
    const i = sources.findIndex(isFive(n));
    if (i < 0) throw new Error(`"${n}" is in the five to know cold but has no entry`);
    const [s] = sources.splice(i, 1);
    s.a = '<p class="flag">One of the five to know cold.</p>' + s.a;
    return s;
  });
  sources.unshift(...top);
}
for (const s of sources) questions.push({ s: SOURCES, ...s });

// ---- the code guide's panel questions -------------------------------------------
for (const c of quotedBullets(section(code, '## 9.'))) {
  questions.push({ s: CODE, ...c, where: 'Line numbers as of 13 October 2026; search for the name if a line has moved', pl: 'Note' });
}

sections.push(
  { id: SELF, title: 'Self-quiz' },
  { id: SOURCES, title: 'Sources', hint: 'Say what it is, what it found, and how the paper uses it.' },
  { id: CODE, title: 'Code' },
);

// ---- numbers (team reviewer, section 4) ----------------------------------------
const groups = [];
{
  let g = null;
  for (const l of section(rev, '## 4.').split('\n')) {
    const t = l.match(/^\*\*(.+?)\*\*(.*)$/);
    if (t && !/^\|/.test(l)) { g = { title: t[1], rows: [] }; groups.push(g); continue; }
    if (g && /^\|/.test(l) && !isRule(l)) {
      const c = cells(l);
      if (/^(Figure|Characteristic)$/.test(c[0])) continue;
      g.rows.push(c);
    }
  }
}
const numbers = groups.map((gr) => ({
  title: gr.title,
  rows: gr.rows.map((c) => ({ k: inline(c[0]), v: inline(c.slice(1).join(' · ')), plain: strip(c.slice(1).join(' · ')) })),
}));

// ---- words (team reviewer, section 6) -----------------------------------------
const words = section(rev, '## 6.').split('\n').filter((l) => /^\|/.test(l) && !isRule(l)).map(cells)
  .filter((c) => c[0] !== 'Term').map((c) => ({ k: inline(c[0]), v: inline(c[1]), plain: strip(c[1]) }));

// ---- learn: the story, objectives and screens ----------------------------------
const s1 = section(rev, '## 1.');
const pitchAt = s1.indexOf('\n>');
const learn = {
  intro: md(s1.slice(0, pitchAt)),
  // The pitch is the guide's quote, kept as paragraphs rather than a warning box.
  pitch: md(s1.slice(pitchAt).split('\n').map((l) => l.replace(/^>\s?/, ''))),
  story: md(section(rev, '## 2.')),
  objectives: md(section(rev, '## 3.')),
  tour: md(section(rev, '## 5.')),
};

// ---- the day ------------------------------------------------------------------
const checklist = (text) => text.split(/\n(?=\d+\. |- )/).map((b) => b.replace(/\n\s+/g, ' ').replace(/^(\d+\.|-)\s+/, '').trim()).filter(Boolean).map(inline);
const day = {
  how: md(section(qa, '## How to answer any question')),
  tips: md(section(rev, '## 7.')),
  notice: md(section(rev, '## 8.')),
  before: checklist(section(demo, '## The day before')),
  after: checklist(section(demo, '## Right after')),
  fail: md(section(qa, '## If the live demo fails')) + md(section(demo, '## If something fails')),
};

const data = { sections, questions, numbers, words, learn, day };
const tpl = fs.readFileSync(path.join(here, 'page.html'), 'utf8');
if (!tpl.includes('/*__DATA__*/null')) throw new Error('page.html has lost its data slot');
fs.writeFileSync(out, tpl.replace('/*__DATA__*/null', () => JSON.stringify(data)));
const count = (id) => questions.filter((x) => x.s === id).length;
console.log(`${questions.length} questions: ${questions.length - count(SELF) - count(SOURCES) - count(CODE)} defense, ` +
  `${count(SELF)} self-quiz, ${count(SOURCES)} sources, ${count(CODE)} code; ` +
  `${numbers.reduce((s, n) => s + n.rows.length, 0)} figures in ${numbers.length} groups; ${words.length} words; ` +
  `checklists ${day.before.length} + ${day.after.length}; ${questions.filter((x) => x.s <= 10 && !x.where).length} defense answers without a source`);
