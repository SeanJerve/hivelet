/**
 * Markdown to Word, in the manuscript's format: the one used by `build-chapter-4-docx.mjs` and by
 * the team's proposal (read from "Proposal Checkpoint.docx" on 13 October 2026): US Letter,
 * margins 1.5 in left and 1 in elsewhere, Arial 12, justified, double-spaced, 0.5 in first-line
 * indent, chapter titles 14 pt bold and centered, captions centered above the exhibit.
 *
 * Headings use Word's own Heading 1 to 3 styles (restyled to Arial, black), so Word can build the
 * table of contents from them. Bold `[TO DO` and `[KEEP` markers are highlighted, so none can reach
 * the printed copy unnoticed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle,
  LineRuleType, HeadingLevel, ImageRun,
} from 'docx';

export const PAGE = { width: 12240, height: 15840, top: 1440, bottom: 1440, left: 2160, right: 1440 };
export const PRINTABLE_WIDTH_DXA = 8640;
export const FONT = 'Arial';
export const BODY = 24; // 12 pt, in half-points
const TABLE_SIZE = 20; // 10 pt
const DOUBLE = 480;
const SINGLE = 240;
const INDENT = 720; // 0.5 in

/** Word's heading styles, restyled to the manuscript's type (the defaults are coloured Calibri). */
export const HEADING_STYLES = {
  heading1: { run: { font: FONT, size: 28, bold: true, color: '000000' }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240, line: DOUBLE } } },
  heading2: { run: { font: FONT, size: BODY, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 120, line: DOUBLE } } },
  heading3: { run: { font: FONT, size: BODY, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 120, line: DOUBLE } } },
  heading4: { run: { font: FONT, size: BODY, bold: true, italics: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 120, line: DOUBLE } } },
};

export function runs(text, size = BODY, bold = false) {
  const out = [];
  const re = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  let last = 0; let m;
  const plain = (t) => out.push(new TextRun({ text: t, font: FONT, size, bold }));
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) plain(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) {
      const inner = t.slice(2, -2);
      const marker = /^\[(TO DO|KEEP)/.test(inner);
      out.push(new TextRun({ text: inner, font: FONT, size, bold: true, highlight: marker ? 'yellow' : undefined }));
    } else if (t.startsWith('*')) out.push(new TextRun({ text: t.slice(1, -1), font: FONT, size, italics: true, bold }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: 'Courier New', size: Math.max(16, size - 2), bold }));
    last = re.lastIndex;
  }
  if (last < text.length) plain(text.slice(last));
  return out;
}

const body = (text, o = {}) => new Paragraph({
  alignment: o.align ?? AlignmentType.JUSTIFIED,
  indent: o.hanging ? { left: INDENT, hanging: INDENT } : o.noIndent ? undefined : { firstLine: INDENT },
  spacing: { before: 0, after: o.after ?? 0, line: DOUBLE, lineRule: LineRuleType.AUTO },
  children: runs(text),
});

function heading(level, text, pageBreak) {
  const lv = [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][level];
  return new Paragraph({ heading: lv, pageBreakBefore: !!pageBreak, children: [new TextRun({ text, font: FONT })] });
}

const caption = (text) => new Paragraph({
  keepNext: true, alignment: AlignmentType.CENTER,
  spacing: { before: 240, after: 120, line: DOUBLE, lineRule: LineRuleType.AUTO },
  children: runs(text),
});

function table(lines) {
  const rows = lines.map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
  if (rows.length < 2) return null;
  const head = rows[0]; const data = rows.slice(2); const n = head.length;
  const weight = head.map((h, c) => {
    let max = h.length; let sum = max;
    for (const r of data) { const t = r[c] || ''; max = Math.max(max, t.length); sum += t.length; }
    return Math.sqrt(Math.max(8, (sum / (data.length + 1)) * 0.7 + max * 0.3));
  });
  const total = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map((w) => Math.round((w / total) * PRINTABLE_WIDTH_DXA));
  widths[n - 1] += PRINTABLE_WIDTH_DXA - widths.reduce((a, b) => a + b, 0);
  const none = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const rule = (size, color) => ({ style: BorderStyle.SINGLE, size, color });
  const cell = (t, i, header, last) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: header ? { fill: 'F2F2F2' } : undefined,
    borders: { left: none, right: none, top: header ? rule(12, '000000') : rule(4, 'D9D9D9'), bottom: header || last ? rule(12, '000000') : rule(4, 'D9D9D9') },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ spacing: { line: SINGLE, lineRule: LineRuleType.AUTO }, children: runs(t || '', TABLE_SIZE, header) })],
  });
  return new Table({
    width: { size: PRINTABLE_WIDTH_DXA, type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: head.map((t, i) => cell(t, i, true, false)) }),
      ...data.map((r, ri) => new TableRow({ cantSplit: true, children: head.map((_, i) => cell(r[i], i, false, ri === data.length - 1)) })),
    ],
  });
}

function image(file) {
  const data = fs.readFileSync(file);
  const w = data.readUInt32BE(16); const h = data.readUInt32BE(20);
  const maxH = /-phone\.png$/.test(file) ? 624 : 816; // 6.5 in for a phone screen, 8.5 in otherwise
  const s = Math.min(576 / w, maxH / h); // 6 in wide at most
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 240 }, children: [new ImageRun({ type: 'png', data, transformation: { width: Math.round(w * s), height: Math.round(h * s) } })] });
}

/**
 * Converts one Markdown file's text. `baseDir` resolves image links. Options: `firstHeadingPageBreak`
 * (start the file on a new page), `references` (hanging indent, left-aligned, as APA asks).
 */
export function convert(md, { baseDir, firstHeadingPageBreak = true, references = false } = {}) {
  const out = []; let para = []; let tbl = []; let firstHeading = true;
  // A list item whose text wraps onto indented lines ("1. To analyze ...\n   determine ...") is one item.
  let item = null;
  const flushItem = () => {
    if (!item) return;
    out.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED, indent: { left: INDENT, hanging: 360 },
      spacing: { before: 0, after: 0, line: DOUBLE, lineRule: LineRuleType.AUTO },
      children: [new TextRun({ text: /^\d/.test(item.mark) ? `${item.mark}  ` : '•  ', font: FONT, size: BODY }), ...runs(item.text)],
    }));
    item = null;
  };
  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ').trim(); para = [];
    if (!text) return;
    if (/^\*\*Table\s+[A-Z0-9]+(-\d+)?[A-Z]?\.\*\*/.test(text) || /^\*Figure\s+[A-Z0-9]+(-\d+)?[a-z]?\./.test(text)) out.push(caption(text));
    else if (references) out.push(body(text, { hanging: true, align: AlignmentType.LEFT, after: 240 }));
    else out.push(body(text));
  };
  const flushTable = () => {
    if (!tbl.length) return;
    const t = table(tbl); tbl = [];
    if (t) out.push(t, new Paragraph({ spacing: { before: 0, after: 240 }, children: [] }));
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (item && line && /^\s+/.test(raw) && !/^([-*]|\d+\.)\s+/.test(line)) { item.text += ` ${line}`; continue; }
    flushItem();
    if (line.startsWith('|') && line.endsWith('|')) { flushPara(); tbl.push(line); continue; }
    flushTable();
    if (line === '---') { flushPara(); continue; }
    const img = line.match(/^!\[[^\]]*\]\(<?([^)>]+)>?\)$/);
    if (img) { flushPara(); out.push(image(path.resolve(baseDir, img[1]))); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara();
      out.push(heading(h[1].length, h[2], h[1].length === 1 && firstHeading && firstHeadingPageBreak));
      if (h[1].length === 1) firstHeading = false;
      continue;
    }
    const li = line.match(/^([-*]|\d+\.)\s+(.*)$/);
    if (li) { flushPara(); item = { mark: li[1], text: li[2] }; continue; }
    if (!line) { flushPara(); continue; }
    if (line.startsWith('>')) continue; // team notes never reach the manuscript
    para.push(line);
  }
  flushItem(); flushPara(); flushTable();
  return out;
}
