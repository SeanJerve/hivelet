/**
 * @file services/expenseReportExport.ts
 * @description The Monthly Expenses Report as a real Excel workbook. BR-049, FR-044.
 *
 * The companion to `incomeReportExport.ts`, and a different shape entirely.
 * `docs/10_MONTHLY_EXPENSES_REPORT.md` describes a month block with **two
 * independent totals systems** running side by side:
 *
 *   - **Bottom totals, by Property Area.** Each area column summed across the
 *     month's entries, plus the row totals.
 *   - **Right-side summary, by Category.** Every category listed with a "this
 *     month" figure and a running cumulative carried forward month to month.
 *
 * The two must reconcile: the category column and the Property Area columns are
 * the same money counted two ways. That identity is **BR-047**, and the database
 * holds it - `trg_update_expense_total` derives each entry's total from its own
 * allocations, so the sides cannot drift. This sheet prints both and states
 * whether they agree, which is the reconciliation the owner does by eye today.
 *
 * THREE OPEN QUESTIONS, NONE OF THEM ANSWERED HERE
 * ------------------------------------------------
 *   - **OD-07** - does the category cumulative reset at the calendar year, or run
 *     indefinitely? This is the rule that keeps **BR-046** unenforced. The sheet
 *     accumulates within the exported year and says so on the page, rather than
 *     picking a convention and presenting it as hers.
 *   - **OD-05** - what "Main House" covers. It is a first-class area in the
 *     database and appears as a column; only its meaning is unconfirmed.
 *   - **OD-06** - `D-MMM-YY` or `DD/MM/YYYY`. Her spreadsheet shows the former,
 *     which is what the income report uses, so that is what this uses.
 *
 * SIX AREAS, NOT FIVE
 * -------------------
 * The document says five Property Areas. Migration `012` added **Penthouse**, so
 * the enum has six and the sheet has six columns. The document predates the
 * migration; the database is right.
 */
import ExcelJS from 'exceljs';
import { db } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONEY_FMT = '#,##0.00';
const INK = 'FF1F2430';
const RED = 'FFC0392B';
const RULE = 'FFD8DCE3';

/** Ledger columns 1-2, then one per area, then category, then the row total. */
const LEDGER_COLS = 2;
const SUMMARY_GAP = 1; // a blank column between the ledger and the right-side summary

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Round to centavos before writing.
 *
 * Every figure here is a sum of NUMERIC(10,2) values that arrived as JS floats,
 * so a month of additions lands on values like `60507.59999999999`. The cell
 * format hides it, but the stored number is wrong and anything reading the file
 * - a formula, a later import, the owner's own SUM - inherits the drift.
 */
const c2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/** `D-MMM-YY` - what her sheet shows, and what the income report uses. OD-06. */
function dateFmt(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()}-${MON[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
}

interface Entry {
  month: number;
  expense_date: string;
  or_supplier: string;
  category_code: string;
  total_expenses: number;
  byArea: Map<string, number>;
}

/**
 * Builds the workbook for one year.
 *
 * Voided entries are excluded. They are kept in the database under BR-003, but a
 * voided expense is not money spent and must not reach a total.
 */
export async function buildExpenseReportWorkbook(year: number): Promise<ExcelJS.Workbook> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw ApiError.validation('A four-digit year is required.', { year: ['must be between 2000 and 2100'] });
  }

  const [{ data: areaRows, error: areaError }, { data: catRows, error: catError }] = await Promise.all([
    db.from('property_areas').select('code, name, display_order').order('display_order'),
    db.from('fixed_expense_categories').select('code, name, parent_code, display_order').order('display_order'),
  ]);

  if (areaError) throw ApiError.internal(`Property areas could not be read: ${areaError.message}`);
  if (catError) throw ApiError.internal(`Expense categories could not be read: ${catError.message}`);

  const areas = (areaRows ?? []).map((a) => ({
    code: String((a as any).code),
    name: String((a as any).name),
  }));
  const categories = (catRows ?? []).map((c) => ({
    code: String((c as any).code),
    name: String((c as any).name),
    parent: (c as any).parent_code ? String((c as any).parent_code) : null,
  }));

  const { data: entryRows, error: entryError } = await db
    .from('monthly_expense_entries')
    .select(
      'id, expense_date, or_supplier, category_code, total_expenses, ' +
        'expense_property_allocations (property_area, amount)'
    )
    .gte('expense_date', `${year}-01-01`)
    .lte('expense_date', `${year}-12-31`)
    .is('voided_at', null)
    .order('expense_date', { ascending: true });

  if (entryError) throw ApiError.internal(`The expense ledger could not be read: ${entryError.message}`);

  const byMonth = new Map<number, Entry[]>();
  for (const raw of (entryRows ?? []) as unknown as Record<string, any>[]) {
    const month = new Date(`${raw.expense_date}T00:00:00Z`).getUTCMonth() + 1;
    const byArea = new Map<string, number>();
    for (const alloc of raw.expense_property_allocations ?? []) {
      const key = String(alloc.property_area);
      byArea.set(key, (byArea.get(key) ?? 0) + n(alloc.amount));
    }
    const list = byMonth.get(month) ?? [];
    list.push({
      month,
      expense_date: raw.expense_date,
      or_supplier: raw.or_supplier,
      category_code: String(raw.category_code),
      total_expenses: n(raw.total_expenses),
      byArea,
    });
    byMonth.set(month, list);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hivelet';
  wb.created = new Date();
  const ws = wb.addWorksheet(`Expenses ${year}`, {
    views: [{ state: 'frozen', ySplit: 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const catCol = LEDGER_COLS + areas.length + 1;
  const totalCol = catCol + 1;
  const sumNameCol = totalCol + SUMMARY_GAP + 1;
  const sumThisCol = sumNameCol + 1;
  const sumCumCol = sumNameCol + 2;

  ws.columns = [
    { width: 12 },                                  // Date
    { width: 34 },                                  // OR / Supplier
    ...areas.map(() => ({ width: 16 })),            // one per Property Area
    { width: 10 },                                  // Category
    { width: 15 },                                  // Total Expenses
    { width: 3 },                                   // gap
    { width: 34 },                                  // summary: category
    { width: 15 },                                  // summary: this month
    { width: 17 },                                  // summary: cumulative
  ];

  const title = ws.addRow([`HIVELET — MONTHLY EXPENSES REPORT — ${year}`]);
  title.font = { bold: true, size: 13, color: { argb: INK } };
  ws.mergeCells(title.number, 1, title.number, sumCumCol);

  const header = ws.addRow([
    'Date', 'OR / Supplier', ...areas.map((a) => a.name), 'Category', 'Total Expenses',
    '', 'Category summary', 'This month', 'Cumulative',
  ]);
  header.font = { bold: true, size: 10, color: { argb: INK } };
  header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  header.eachCell((c) => {
    c.border = { bottom: { style: 'medium', color: { argb: INK } } };
  });

  /** Running cumulative per category, across the months of this year. OD-07. */
  const cumulative = new Map<string, number>();
  const yearAreaTotals = new Map<string, number>();
  let yearGrandTotal = 0;

  const moneyCells = (r: ExcelJS.Row) => {
    for (let c = LEDGER_COLS + 1; c <= LEDGER_COLS + areas.length; c++) r.getCell(c).numFmt = MONEY_FMT;
    r.getCell(totalCol).numFmt = MONEY_FMT;
  };

  for (const month of [...byMonth.keys()].sort((a, b) => a - b)) {
    const entries = byMonth.get(month) ?? [];

    const monthRow = ws.addRow([`${MONTHS[month - 1]} ${year}`]);
    monthRow.font = { bold: true, size: 11, color: { argb: INK } };
    ws.mergeCells(monthRow.number, 1, monthRow.number, totalCol);

    const blockFirstRow = monthRow.number + 1;

    const areaTotals = new Map<string, number>();
    const catThisMonth = new Map<string, number>();
    let monthTotal = 0;

    for (const e of entries) {
      const cells: (string | number | null)[] = [dateFmt(e.expense_date), e.or_supplier];
      for (const a of areas) {
        const v = e.byArea.get(a.code) ?? 0;
        cells.push(v ? c2(v) : null);
        if (v) areaTotals.set(a.code, (areaTotals.get(a.code) ?? 0) + v);
      }
      cells.push(e.category_code, c2(e.total_expenses));

      const row = ws.addRow(cells);
      row.font = { size: 10 };
      moneyCells(row);

      monthTotal += e.total_expenses;
      catThisMonth.set(e.category_code, (catThisMonth.get(e.category_code) ?? 0) + e.total_expenses);
    }

    // --- 6.1 bottom totals, by Property Area --------------------------------
    const totalCells: (string | number | null)[] = [`${MONTHS[month - 1]} TOTAL`, null];
    for (const a of areas) totalCells.push(c2(areaTotals.get(a.code) ?? 0));
    totalCells.push(null, c2(monthTotal));

    const totalRow = ws.addRow(totalCells);
    totalRow.font = { bold: true, size: 10, color: { argb: INK } };
    moneyCells(totalRow);
    totalRow.eachCell({ includeEmpty: true }, (c) => {
      c.border = { top: { style: 'medium', color: { argb: INK } } };
    });

    for (const a of areas) {
      yearAreaTotals.set(a.code, (yearAreaTotals.get(a.code) ?? 0) + (areaTotals.get(a.code) ?? 0));
    }
    yearGrandTotal += monthTotal;

    // --- 6.2 right-side summary, by Category --------------------------------
    //
    // Written beside the month's rows, in the same columns her sheet uses. It
    // starts on the block's first row and runs down; where a month has fewer
    // entries than there are categories it simply extends past them, which is
    // what the source sheet does too.
    let cursor = blockFirstRow;
    let summaryThisMonth = 0;
    let summaryCumulative = 0;

    for (const cat of categories) {
      const thisMonth = catThisMonth.get(cat.code) ?? 0;
      const running = (cumulative.get(cat.code) ?? 0) + thisMonth;
      cumulative.set(cat.code, running);
      summaryThisMonth += thisMonth;
      summaryCumulative += running;

      const r = ws.getRow(cursor);
      r.getCell(sumNameCol).value = cat.parent ? `    ${cat.code}  ${cat.name}` : `${cat.code}  ${cat.name}`;
      r.getCell(sumNameCol).font = { size: 9, italic: Boolean(cat.parent), color: { argb: INK } };
      r.getCell(sumThisCol).value = thisMonth ? c2(thisMonth) : null;
      r.getCell(sumThisCol).numFmt = MONEY_FMT;
      r.getCell(sumCumCol).value = running ? c2(running) : null;
      r.getCell(sumCumCol).numFmt = MONEY_FMT;
      r.commit?.();
      cursor++;
    }

    const sumRow = ws.getRow(cursor);
    sumRow.getCell(sumNameCol).value = `${MONTHS[month - 1]} — all categories`;
    sumRow.getCell(sumNameCol).font = { bold: true, size: 9, color: { argb: RED } };
    sumRow.getCell(sumThisCol).value = c2(summaryThisMonth);
    sumRow.getCell(sumThisCol).numFmt = MONEY_FMT;
    sumRow.getCell(sumThisCol).font = { bold: true, color: { argb: RED } };
    sumRow.getCell(sumCumCol).value = c2(summaryCumulative);
    sumRow.getCell(sumCumCol).numFmt = MONEY_FMT;
    sumRow.getCell(sumCumCol).font = { bold: true, color: { argb: RED } };
    for (const c of [sumNameCol, sumThisCol, sumCumCol]) {
      sumRow.getCell(c).border = { top: { style: 'thin', color: { argb: RULE } } };
    }
    sumRow.commit?.();

    // --- BR-047: the two sides are the same money, counted two ways ---------
    const areaSide = [...areaTotals.values()].reduce((s, v) => s + v, 0);
    const agree = Math.abs(areaSide - summaryThisMonth) < 0.005;
    const check = ws.addRow([
      agree
        ? `Reconciles (BR-047): Property Area total and category total both ${monthTotal.toFixed(2)}.`
        : `DOES NOT RECONCILE (BR-047): areas ${areaSide.toFixed(2)} vs categories ${summaryThisMonth.toFixed(2)}.`,
    ]);
    check.font = { size: 9, italic: true, color: { argb: agree ? INK : RED }, bold: !agree };
    ws.mergeCells(check.number, 1, check.number, totalCol);

    ws.addRow([]);
  }

  // --- year totals ----------------------------------------------------------
  const yearCells: (string | number | null)[] = [`YEAR TOTAL ${year}`, null];
  for (const a of areas) yearCells.push(c2(yearAreaTotals.get(a.code) ?? 0));
  yearCells.push(null, c2(yearGrandTotal));

  const yearRow = ws.addRow(yearCells);
  yearRow.font = { bold: true, size: 11, color: { argb: INK } };
  moneyCells(yearRow);
  yearRow.eachCell({ includeEmpty: true }, (c) => {
    c.border = { top: { style: 'medium', color: { argb: INK } } };
  });

  const note = ws.addRow([
    'The Cumulative column accumulates from January of this year. Whether it should reset at the ' +
      'year boundary or run indefinitely is OD-07, still open with the owner — it is the one ' +
      'question keeping BR-046 unenforced, so no convention is assumed here. "Main House" is a ' +
      'real area in the database; what it covers is OD-05. Dates follow the spreadsheet\'s ' +
      'D-MMM-YY rather than the DD/MM/YYYY described verbally (OD-06).',
  ]);
  note.font = { size: 9, italic: true, color: { argb: INK } };
  ws.mergeCells(note.number, 1, note.number, sumCumCol);
  note.alignment = { wrapText: true, vertical: 'top' };

  if (byMonth.size === 0) {
    const empty = ws.addRow([`No expenses were recorded for ${year}.`]);
    empty.font = { size: 10, italic: true };
    ws.mergeCells(empty.number, 1, empty.number, totalCol);
  }

  return wb;
}
