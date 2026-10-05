import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  LineRuleType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  HeadingLevel,
  ImageRun,
} from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// The FINAL MANUSCRIPT copy is the authority (its README says the `chapter 4 tenative` drafts are
// superseded). This read the tentative draft until 2026-09-29 - a condensed copy half the length
// that called itself "synchronized" and lacked everything added after 28 September - so the Word
// file in FINAL MANUSCRIPT was being built from the wrong text.
const inputMdPath = path.join(root, 'docs', 'FINAL MANUSCRIPT', 'CHAPTER_4_RESULTS_AND_DISCUSSION.md');
const outputDocxPath1 = path.join(root, 'docs', 'chapter 4 tenative', 'CHAPTER_4_DRAFT.docx');
const outputDocxPath2 = path.join(root, 'docs', 'FINAL MANUSCRIPT', 'CHAPTER_4_RESULTS_AND_DISCUSSION.docx');

// Document Geometry & Typography Standards
// US Letter: 8.5 x 11 inches = 12240 x 15840 dxa
// Left margin: 1.5 in = 2160 dxa
// Right margin: 1.0 in = 1440 dxa
// Top margin: 1.0 in = 1440 dxa
// Bottom margin: 1.0 in = 1440 dxa
// Printable text width = 12240 - 2160 - 1440 = 8640 dxa
const PAGE_WIDTH_DXA = 12240;
const PAGE_HEIGHT_DXA = 15840;
const MARGIN_LEFT = 2160;
const MARGIN_RIGHT = 1440;
const MARGIN_TOP = 1440;
const MARGIN_BOTTOM = 1440;
const PRINTABLE_WIDTH_DXA = 8640;

const FONT_FAMILY = 'Arial';
const BODY_FONT_SIZE = 24; // 12 pt (in half-points)
const TABLE_FONT_SIZE = 20; // 10 pt
const TABLE_HEADER_FONT_SIZE = 20; // 10 pt bold
const LINE_SPACING_DOUBLE = 480; // 2.0 line spacing
const LINE_SPACING_SINGLE = 240; // 1.0 line spacing
const FIRST_LINE_INDENT = 720; // 0.5 inches

function parseInlineRuns(text, baseSize = BODY_FONT_SIZE, isHeader = false) {
  const runs = [];
  // Tokenize bold (**...**), italics (*...*), and code (`...`)
  const regex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(
        new TextRun({
          text: text.substring(lastIndex, match.index),
          font: FONT_FAMILY,
          size: baseSize,
          bold: isHeader,
        })
      );
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(
        new TextRun({
          text: token.slice(2, -2),
          font: FONT_FAMILY,
          size: baseSize,
          bold: true,
        })
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: FONT_FAMILY,
          size: baseSize,
          italics: true,
          bold: isHeader,
        })
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      runs.push(
        new TextRun({
          text: token.slice(1, -1),
          font: 'Courier New',
          size: Math.max(16, baseSize - 2),
          bold: isHeader,
        })
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(
      new TextRun({
        text: text.substring(lastIndex),
        font: FONT_FAMILY,
        size: baseSize,
        bold: isHeader,
      })
    );
  }

  return runs;
}

function createParagraph(text, options = {}) {
  const {
    alignment = AlignmentType.JUSTIFIED,
    indentFirstLine = true,
    spacingBefore = 0,
    spacingAfter = 0,
    lineSpacing = LINE_SPACING_DOUBLE,
    runs = null,
  } = options;

  return new Paragraph({
    alignment,
    indent: indentFirstLine ? { firstLine: FIRST_LINE_INDENT } : undefined,
    spacing: {
      before: spacingBefore,
      after: spacingAfter,
      line: lineSpacing,
      lineRule: LineRuleType.AUTO,
    },
    children: runs || parseInlineRuns(text, BODY_FONT_SIZE),
  });
}

function createHeading1(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240, line: LINE_SPACING_DOUBLE, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text: text.replace(/^#\s*/, ''),
        font: FONT_FAMILY,
        size: 28, // 14 pt
        bold: true,
      }),
    ],
  });
}

function createHeading2(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 360, after: 180, line: LINE_SPACING_DOUBLE, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text: text.replace(/^##\s*/, ''),
        font: FONT_FAMILY,
        size: BODY_FONT_SIZE,
        bold: true,
      }),
    ],
  });
}

function createHeading3(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120, line: LINE_SPACING_DOUBLE, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text: text.replace(/^###\s*/, ''),
        font: FONT_FAMILY,
        size: BODY_FONT_SIZE,
        bold: true,
      }),
    ],
  });
}

function createTableCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 360, after: 120, line: LINE_SPACING_DOUBLE, lineRule: LineRuleType.AUTO },
    children: parseInlineRuns(text, BODY_FONT_SIZE, true),
  });
}

function parseMarkdownTable(lines) {
  const rawRows = lines.map((l) =>
    l
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
  );

  if (rawRows.length < 2) return null;

  const headerRow = rawRows[0];
  // rawRows[1] is the separator (| :--- | :--- |)
  const dataRows = rawRows.slice(2);
  const colCount = headerRow.length;

  // Calculate dynamic column widths based on content lengths
  const colWeights = new Array(colCount).fill(0);
  for (let c = 0; c < colCount; c++) {
    let maxLen = headerRow[c].length;
    let sumLen = maxLen;
    for (let r = 0; r < dataRows.length; r++) {
      const cellText = dataRows[r][c] || '';
      maxLen = Math.max(maxLen, cellText.length);
      sumLen += cellText.length;
    }
    const avgLen = sumLen / (dataRows.length + 1);
    // Square root dampens extreme differences so short cols aren't crushed
    colWeights[c] = Math.sqrt(Math.max(8, avgLen * 0.7 + maxLen * 0.3));
  }

  const totalWeight = colWeights.reduce((a, b) => a + b, 0);
  const colWidths = colWeights.map((w) => Math.round((w / totalWeight) * PRINTABLE_WIDTH_DXA));

  // Ensure total sum equals PRINTABLE_WIDTH_DXA exactly
  const sumWidths = colWidths.reduce((a, b) => a + b, 0);
  colWidths[colWidths.length - 1] += PRINTABLE_WIDTH_DXA - sumWidths;

  const academicBorders = {
    top: { style: BorderStyle.SINGLE, size: 8, color: '2D3748' },
    bottom: { style: BorderStyle.SINGLE, size: 8, color: '2D3748' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const headerBorders = {
    top: { style: BorderStyle.SINGLE, size: 12, color: '1A202C' },
    bottom: { style: BorderStyle.SINGLE, size: 12, color: '1A202C' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const subtleRowBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const tableRows = [];

  // 1. Header row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: headerRow.map(
        (cellText, idx) =>
          new TableCell({
            width: { size: colWidths[idx], type: WidthType.DXA },
            shading: { fill: 'F8FAFC' },
            borders: headerBorders,
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            children: [
              new Paragraph({
                alignment: idx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                spacing: { line: LINE_SPACING_SINGLE, lineRule: LineRuleType.AUTO },
                children: parseInlineRuns(cellText, TABLE_HEADER_FONT_SIZE, true),
              }),
            ],
          })
      ),
    })
  );

  // 2. Data rows
  dataRows.forEach((row, rIdx) => {
    const isLastRow = rIdx === dataRows.length - 1;
    const isTotalOrComposite = row.some((c) => /total|composite|overall|mean/i.test(c));

    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: row.map((cellText, idx) => {
          const isNumeric = /^[\d,.\s₱%+-]+$/.test(cellText.trim()) || cellText.includes('[DATA PENDING]');
          const align = idx === 0 ? AlignmentType.LEFT : isNumeric ? AlignmentType.CENTER : AlignmentType.LEFT;

          return new TableCell({
            width: { size: colWidths[idx], type: WidthType.DXA },
            borders: isLastRow
              ? {
                  top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                  bottom: { style: BorderStyle.SINGLE, size: 12, color: '1A202C' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                }
              : isTotalOrComposite
              ? {
                  top: { style: BorderStyle.SINGLE, size: 6, color: '718096' },
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: '718096' },
                  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                }
              : subtleRowBorders,
            shading: isTotalOrComposite ? { fill: 'F8FAFC' } : undefined,
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                alignment: align,
                spacing: { line: LINE_SPACING_SINGLE, lineRule: LineRuleType.AUTO },
                children: parseInlineRuns(cellText, TABLE_FONT_SIZE, isTotalOrComposite),
              }),
            ],
          });
        }),
      })
    );
  });

  return new Table({
    width: { size: PRINTABLE_WIDTH_DXA, type: WidthType.DXA },
    rows: tableRows,
  });
}

/** A PNG's size in pixels, from its IHDR chunk. */
function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * A figure: a markdown line `![alt](figures/file.png)`, relative to the chapter's folder.
 * Fitted within the printable width (6 in, 576 px at 96 per inch) and 6.5 in of height, so a
 * phone figure still leaves its caption room on the page; kept with the caption below it.
 * A missing file stops the build rather than leaving a silent gap in the chapter.
 */
function createFigureImage(relPath) {
  const file = path.join(path.dirname(inputMdPath), relPath);
  const data = fs.readFileSync(file);
  const { width, height } = pngSize(data);
  const scale = Math.min(576 / width, 624 / height);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    spacing: { before: 240, after: 120 },
    children: [
      new ImageRun({
        type: 'png',
        data,
        transformation: { width: Math.round(width * scale), height: Math.round(height * scale) },
      }),
    ],
  });
}

function convertMarkdownToDocxElements(mdContent) {
  const lines = mdContent.split(/\r?\n/);
  const elements = [];
  let inBlockquote = false;
  let tableLines = [];
  let currentParagraphLines = [];

  function flushParagraph() {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join(' ').trim();
      currentParagraphLines = [];
      if (text.length > 0) {
        // Check if paragraph is a table title like **Table 5.** ...
        if (/^\*\*Table\s+\d+\.\*\*/i.test(text)) {
          elements.push(createTableCaption(text));
        } else if (/^\*\([^)]+\)\*$/i.test(text) || /^\*Figure\s+\d+\./i.test(text)) {
          // Figure placeholder
          elements.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 240, after: 240, line: LINE_SPACING_DOUBLE, lineRule: LineRuleType.AUTO },
              children: parseInlineRuns(text, BODY_FONT_SIZE),
            })
          );
        } else {
          elements.push(createParagraph(text));
        }
      }
    }
  }

  function flushTable() {
    if (tableLines.length > 0) {
      const table = parseMarkdownTable(tableLines);
      if (table) {
        elements.push(table);
        // Add spacing after table
        elements.push(
          new Paragraph({
            spacing: { before: 120, after: 240, line: LINE_SPACING_DOUBLE, lineRule: LineRuleType.AUTO },
            children: [],
          })
        );
      }
      tableLines = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Skip canonical banners or team notes in final docx
    if (trimmed.startsWith('> **CANONICAL MANUSCRIPT') || trimmed.startsWith('> Re-verified against') || trimmed.startsWith('> **TEAM NOTE')) {
      inBlockquote = true;
      continue;
    }
    if (inBlockquote) {
      if (trimmed.startsWith('>') || trimmed.length === 0) {
        continue;
      } else {
        inBlockquote = false;
      }
    }

    // 2. Separators
    if (trimmed === '---') {
      flushParagraph();
      flushTable();
      continue;
    }

    // 3. Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushParagraph();
      tableLines.push(trimmed);
      continue;
    } else if (tableLines.length > 0) {
      flushTable();
    }

    // 3b. Figures
    const figure = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (figure) {
      flushParagraph();
      elements.push(createFigureImage(figure[2]));
      continue;
    }

    // 4. Headings
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      elements.push(createHeading1(trimmed));
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      elements.push(createHeading2(trimmed));
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      elements.push(createHeading3(trimmed));
      continue;
    }

    // 5. Bullet items / Numbered lists
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const listMatch = trimmed.match(/^([-*]|\d+\.)\s+(.*)/);
      const prefix = listMatch ? listMatch[1] : '•';
      const text = listMatch ? listMatch[2] : trimmed;

      elements.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 720, hanging: 360 },
          spacing: { before: 120, after: 120, line: LINE_SPACING_DOUBLE, lineRule: LineRuleType.AUTO },
          children: [
            new TextRun({
              text: prefix.endsWith('.') ? prefix + '  ' : '•  ',
              font: FONT_FAMILY,
              size: BODY_FONT_SIZE,
              bold: true,
            }),
            ...parseInlineRuns(text, BODY_FONT_SIZE),
          ],
        })
      );
      continue;
    }

    // 6. Blank lines flush accumulated paragraph
    if (trimmed.length === 0) {
      flushParagraph();
      continue;
    }

    // 7. Accumulate paragraph text
    currentParagraphLines.push(trimmed);
  }

  flushParagraph();
  flushTable();

  return elements;
}

async function main() {
  console.log('Reading input markdown from:', inputMdPath);
  const mdContent = fs.readFileSync(inputMdPath, 'utf8');

  console.log('Parsing markdown elements into Word document structure...');
  const children = convertMarkdownToDocxElements(mdContent);

  console.log(`Generated ${children.length} document elements (paragraphs, headings, tables).`);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_DXA,
              height: PAGE_HEIGHT_DXA,
            },
            margin: {
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_FAMILY,
                    size: BODY_FONT_SIZE,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  console.log('Packing Word document buffer...');
  const buffer = await Packer.toBuffer(doc);

  console.log(`Writing output docx (size: ${buffer.length} bytes) to:`);
  console.log('1.', outputDocxPath1);
  fs.writeFileSync(outputDocxPath1, buffer);

  console.log('2.', outputDocxPath2);
  fs.writeFileSync(outputDocxPath2, buffer);

  console.log('\n[SUCCESS] Word documents generated successfully with proper manuscript formatting!');
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
