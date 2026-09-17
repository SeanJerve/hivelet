/**
 * check:reports — the workbooks the owner actually reads must agree with the
 * database, month by month.
 *
 * Run with `npm run check:reports` from `backend/`. Downloads both reports over
 * the API, reads them with the same library that wrote them, and compares each
 * month's printed total against a direct query. Writes nothing.
 *
 * WHY THIS EXISTS
 * ---------------
 * `check:api` asserts that `income.xlsx` comes back as a real workbook of some
 * thousands of bytes. That proves the endpoint answers and the file is not
 * corrupt. It proves nothing at all about the numbers inside it.
 *
 * These two workbooks are the deliverable - what Mrs. Da Silva opens and what a
 * panel is shown. Every other check here verifies the DATABASE. None of them
 * follows the money the last step: out of the database, through the export, onto
 * the sheet she reads. A month landing in the wrong bucket, a filter applied to
 * one total and not another, a row dropped by a join - all of that lives in that
 * last step and is invisible to everything else.
 *
 * Comparing MONTH BY MONTH rather than one figure for the year is deliberate: a
 * receipt filed into the wrong month leaves the annual total correct and two
 * months wrong, which a single yearly comparison cannot see. This project has
 * already had one timezone defect that moved a payment across a month boundary.
 *
 * A NOTE ON THE FIRST VERSION, WHICH WAS WRONG
 * --------------------------------------------
 * It summed every numeric cell in each money column and reported the workbook
 * was 3x to 4x the database. It was not. These sheets carry, per month, the
 * detail rows AND a `MONTH TOTAL` row AND a category-total column - so summing
 * the column counts the same money three times. The ratios were suspiciously
 * round (water exactly 4.0, expenses exactly 3.0), which is what prompted
 * looking at the sheet instead of believing the check.
 *
 * The export was right all along. It even prints, under each month,
 * "Reconciles (BR-047): Property Area total and category total both 129,737.90".
 */
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = join(here, '..', '..');
dotenv.config({ path: join(repo, '.env') });

const BASE = process.env.API_BASE ?? 'http://localhost:5000/api';
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;

/** Half a centavo - float residue, not a discrepancy. */
const MONEY_DUST = 0.005;

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

let pass = 0;
let fail = 0;

function check(label, workbook, database) {
  const ok = Math.abs(Number(workbook) - Number(database)) <= MONEY_DUST;
  ok ? pass++ : fail++;
  const money = (n) => Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 });
  console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${label.padEnd(28)} ${money(workbook)}`);
  if (!ok) {
    console.log(`          database says ${money(database)}`);
    console.log(`          difference    ${money(Number(workbook) - Number(database))}`);
  }
}

async function sql(path_) {
  const r = await fetch(`${URL_}/rest/v1/${path_}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`${path_} -> HTTP ${r.status}`);
  return r.json();
}

/** From the gitignored local file, never from source - as check:api does. */
async function login() {
  const credsPath = join(repo, 'credentials', 'creds.txt');
  if (!existsSync(credsPath)) return null;
  const creds = readFileSync(credsPath, 'utf8');
  const email = creds.match(/Email:\s*(\S+)/)?.[1];
  const password = creds.match(/Password:\s*(\S+)/)?.[1];
  if (!email || !password) return null;

  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  if (!r.ok) return null;
  return (await r.json())?.data?.token ?? null;
}

const cell = (v) =>
  typeof v === 'number' ? v : v && typeof v === 'object' && v.result != null ? v.result : null;

/** The column under a given header, searched in the first dozen rows. */
function columnOf(sheet, header) {
  let col = null;
  sheet.eachRow((row, n) => {
    if (col !== null || n > 12) return;
    row.eachCell((c, i) => {
      if (String(c.value ?? '').trim().toLowerCase() === header.toLowerCase()) col = i;
    });
  });
  return col;
}

/**
 * The `MONTH TOTAL` rows: month name -> the value in the TOTAL COLUMN.
 *
 * Read from the named column, never "the last numeric cell on the row". That was
 * the second wrong version of this checker: these rows continue to the right
 * with a category breakdown AND a running cumulative, and the trailing layout
 * differs from row to row. Six months matched by luck and MARCH did not - its
 * last cell held the cumulative, 282,668.94, which is exactly January plus
 * February plus March. The sheet was right; the reading was not.
 */
function monthTotals(sheet, header) {
  const col = columnOf(sheet, header);
  const found = new Map();
  if (col === null) return found;

  sheet.eachRow((row) => {
    const first = String(cell(row.getCell(1).value) ?? row.getCell(1).value ?? '').trim().toUpperCase();
    const m = /^([A-Z]+)\s+TOTAL$/.exec(first);
    if (!m || !MONTHS.includes(m[1])) return;
    const n = cell(row.getCell(col).value);
    if (typeof n === 'number' && Number.isFinite(n)) found.set(m[1], n);
  });
  return found;
}

/**
 * The right-side "Category summary" block of `expenses.xlsx`.
 *
 * BR-049 requires the workbook to reproduce the layout in
 * `10_MONTHLY_EXPENSES_REPORT.md`, which has a per-category "This month" column
 * and a "Cumulative" carried month to month (§ 6.2). Until 2026-09-17 this
 * checker verified the MONTH TOTAL figures and said nothing about that block -
 * two derived money columns nobody looked at.
 *
 * Returns, per month, the `MONTH — all categories` footer: its this-month
 * figure and its running cumulative.
 */
function categorySummary(sheet) {
  const nameCol = columnOf(sheet, 'Category summary');
  const thisCol = columnOf(sheet, 'This month');
  const cumCol = columnOf(sheet, 'Cumulative');
  const found = new Map();
  if (nameCol === null || thisCol === null || cumCol === null) return { found, layout: false };

  sheet.eachRow((row) => {
    const label = String(cell(row.getCell(nameCol).value) ?? row.getCell(nameCol).value ?? '')
      .trim()
      .toUpperCase();
    const m = /^([A-Z]+)\s*[—-]\s*ALL CATEGORIES$/.exec(label);
    if (!m || !MONTHS.includes(m[1])) return;
    found.set(m[1], {
      thisMonth: cell(row.getCell(thisCol).value),
      cumulative: cell(row.getCell(cumCol).value),
    });
  });
  return { found, layout: true };
}

async function workbookFor(token, report, year) {
  const r = await fetch(`${BASE}/admin/reports/${report}?year=${year}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return { error: `HTTP ${r.status}` };
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await r.arrayBuffer()));
  return { sheet: wb.worksheets[0] };
}

console.log('check:reports — the workbooks must agree with the database, month by month\n');

const token = await login();
if (!token) {
  console.log('  SKIP  credentials/creds.txt not found, so the reports cannot be fetched.');
  console.log('        A SKIP, not a pass: the workbooks were not checked.');
  process.exit(0);
}

/**
 * Every year the ledger actually holds, not just this one.
 *
 * Checking only the current year covered 214 of the 937 receipts. The other 723
 * are the years a panel is most likely to ask about, because they are the ones
 * with twelve complete months.
 */
const years = [
  ...new Set(
    (await sql('monthly_income_records?select=year&voided_at=is.null')).map((r) => Number(r.year))
  ),
].sort();
console.log(`  ledger years: ${years.join(', ')}\n`);

for (const year of years) {
  // ---------------------------------------------------------------- expenses --
  {
    const { sheet, error } = await workbookFor(token, 'expenses.xlsx', year);
    if (error) {
      console.log(`  FAIL  expenses.xlsx -> ${error}`);
      fail++;
    } else {
      const rows = await sql(
        `monthly_expense_entries?select=total_expenses,expense_date&voided_at=is.null` +
        `&expense_date=gte.${year}-01-01&expense_date=lte.${year}-12-31`
      );
      const byMonth = new Map();
      for (const r of rows) {
        const m = Number(r.expense_date.slice(5, 7));
        byMonth.set(m, (byMonth.get(m) ?? 0) + Number(r.total_expenses ?? 0));
      }

      const printed = monthTotals(sheet, 'Total Expenses');
      console.log(`  EXPENSES ${year} — ${rows.length} entries, ${printed.size} month total(s) printed\n`);
      for (const [name, total] of printed) {
        check(`${name} total`, total, byMonth.get(MONTHS.indexOf(name) + 1) ?? 0);
      }

      const sheetSum = [...printed.values()].reduce((a, b) => a + b, 0);
      const dbSum = [...byMonth.values()].reduce((a, b) => a + b, 0);
      console.log('');
      check(`${year} expenses, all months`, sheetSum, dbSum);

      /**
       * The right-side summary, which is the same money cut a different way.
       *
       * Two invariants, both derived and both previously unchecked:
       *
       *   1. RECONCILIATION - `MONTH — all categories` must equal that month's
       *      `MONTH TOTAL`. Categories and Property Areas are two cuts of one
       *      sum, so they have to land on the same figure. The export's own
       *      header says it: "The two must reconcile."
       *   2. THE CUMULATIVE CHAIN - each month's cumulative must be the previous
       *      month's plus this month's, resetting in January. An off-by-one here
       *      is invisible, because every figure still looks like a plausible
       *      peso amount. It is also the exact cell that broke the second
       *      version of this checker.
       */
      const { found: summary, layout } = categorySummary(sheet);
      if (!layout) {
        console.log(`  FAIL  ${year} category summary - a required header is missing (BR-049)`);
        fail++;
      } else {
        console.log('');
        let running = 0;
        for (const [name, total] of printed) {
          const s = summary.get(name);
          if (!s) {
            console.log(`  FAIL  ${name} category summary - no "all categories" row`);
            fail++;
            continue;
          }
          running += Number(s.thisMonth ?? 0);
          check(`${name} categories`, s.thisMonth, total);
          check(`${name} cumulative`, s.cumulative, running);
        }
      }
    }
  }

  // ------------------------------------------------------------------ income --
  {
    const { sheet, error } = await workbookFor(token, 'income.xlsx', year);
    if (error) {
      console.log(`\n  FAIL  income.xlsx -> ${error}`);
      fail++;
    } else {
      const rows = await sql(
        `monthly_income_records?select=rent_amount,water_payment,gbg_fee,month,is_linda_billing` +
        `&voided_at=is.null&year=eq.${year}`
      );
      const byMonth = new Map();
      /**
       * Split, because the sum alone cannot see the rule.
       *
       * Linda's two units are billed under a different rule set and are excluded
       * from the grand subtotal on purpose (report spec 3 item 5, judgement log
       * SS 3.5). This checker used to add `GRAND SUBTOTAL` and `Linda total`
       * together and compare the pair against the whole month - which matches
       * whether or not Linda is in the right half. A misallocation between them
       * CANCELS OUT, and that misallocation is the only thing the rule forbids.
       */
      const byMonthGrand = new Map();
      const byMonthLinda = new Map();
      for (const r of rows) {
        const m = Number(r.month);
        const amt = Number(r.rent_amount ?? 0);
        byMonth.set(m, (byMonth.get(m) ?? 0) + amt);
        if (r.is_linda_billing) byMonthLinda.set(m, (byMonthLinda.get(m) ?? 0) + amt);
        else byMonthGrand.set(m, (byMonthGrand.get(m) ?? 0) + amt);
      }

      /**
       * The income sheet subtotals differently from the expense sheet: a month
       * banner row, then detail, then a cluster subtotal each for BH, Back
       * Apartment and Front Apartment, then `GRAND SUBTOTAL (excludes Linda)`,
       * then `Linda total`.
       *
       * A month's collections are therefore the grand subtotal PLUS Linda, and the
       * separation is deliberate - Linda is excluded from grand totals on purpose
       * (judgement log SS 3.5). Adding them back here compares the whole month,
       * which is what the query returns.
       */
      const col = columnOf(sheet, 'Rent Amount');
      const printed = new Map();
      const printedGrand = new Map();
      const printedLinda = new Map();

      if (col === null) {
        console.log('\n  FAIL  income.xlsx has no "Rent Amount" column');
        fail++;
      } else {
        let current = null;
        sheet.eachRow((row) => {
          const first = String(row.getCell(1).value ?? '').trim();
          const banner = /^([A-Z]+)\s+\d{4}$/.exec(first.toUpperCase());
          if (banner && MONTHS.includes(banner[1])) {
            current = banner[1];
            return;
          }
          if (!current) return;
          const isGrand = /^GRAND SUBTOTAL/i.test(first);
          const isLinda = /^Linda total/i.test(first);
          if (!isGrand && !isLinda) return;
          const n = cell(row.getCell(col).value);
          if (typeof n === 'number' && Number.isFinite(n)) {
            printed.set(current, (printed.get(current) ?? 0) + n);
            const half = isGrand ? printedGrand : printedLinda;
            half.set(current, (half.get(current) ?? 0) + n);
          }
        });
      }

      console.log(`\n  INCOME ${year} - ${rows.length} receipts, ${printed.size} month(s) totalled\n`);
      if (printed.size === 0 && col !== null) {
        console.log('  SKIP  no month subtotals recognised, so nothing was compared. Not a pass.');
      }
      for (const [name, total] of printed) {
        const m = MONTHS.indexOf(name) + 1;
        check(`${name} rent`, total, byMonth.get(m) ?? 0);
        // And each half on its own, so a misallocation cannot cancel out.
        check(`${name} grand (no Linda)`, printedGrand.get(name) ?? 0, byMonthGrand.get(m) ?? 0);
        check(`${name} Linda only`, printedLinda.get(name) ?? 0, byMonthLinda.get(m) ?? 0);
      }
      if (printed.size) {
        const sheetSum = [...printed.values()].reduce((a, b) => a + b, 0);
        const dbSum = [...byMonth.values()].reduce((a, b) => a + b, 0);
        console.log('');
        check(`${year} rent, all months`, sheetSum, dbSum);
      }
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
