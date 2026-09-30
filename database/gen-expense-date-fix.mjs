/**
 * Generates migration 064 and its read-only preview from the owner's workbook (B-86).
 *
 *   node gen-expense-date-fix.mjs
 *
 * The original importer stored every imported expense under a date she did not write:
 *   - a typed date one day early (the 032 defect, corrected for income, never for expenses);
 *   - a blank Date (her "same day as the line above") on the 1st of the month, and "YEAR 2026"
 *     unrecognised, so 2026 lines went under 2025.
 *
 * For each workbook line before the August 2026 block (062 inserted August with the right dates),
 * this computes the date the importer stored and the date she meant, exactly as
 * import-ledger-update.mjs `parseExpenses` does (copied, because that file talks to the database
 * as soon as it is imported). The migration matches stored entries on that stored date, supplier,
 * category, total and allocation split, and moves only groups whose count agrees with the
 * workbook. Nothing is matched on id: this machine cannot read the live table.
 */
import xlsx from 'xlsx';
import fs from 'fs';

process.env.TZ = 'UTC';
const WORKBOOK = '../INCOME AND EXPENSES PAST RECORDS/Michelles-BH-Report-Income-and-Expenses-fr-Yr-2024-up (1) (1) (1).xlsx';
const BEFORE_BLOCK = '2026-08';
// Handled on its own in 064: her workbook now carries a Boarding House share the import did not.
const ELECTRIC = { or_supplier: 'Electricbill (May26)', date: '2026-06-04' };

const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function excelDateToJSDate(serial) {
  if (typeof serial !== 'number') return null;
  const days = serial - (serial < 60 ? 25567 : 25569);
  const dateObj = new Date(days * 86400 * 1000);
  const adjusted = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
}

// Copied from import-ledger-update.mjs parseExpenses, unchanged in behaviour.
export function parseExpenses(rows) {
  let y = 2024, m = 1; const out = [];
  let trueYear = 2024, lastCellDate = null;
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]; if (!row || row.length === 0) continue;
    const cell0 = row[0] ? String(row[0]).trim() : ''; const cell1 = row[1] ? String(row[1]).trim() : '';
    const yh = cell0.match(/^(?:year\s*)?(20\d\d)['"]?$/i);
    if (yh && !row[1] && !row[2]) { trueYear = Number(yh[1]); lastCellDate = null; }
    if (cell0.match(/^\d{4}['"]?$/) && !row[1] && !row[2]) { y = parseInt(cell0.match(/^\d{4}/)[0], 10); continue; }
    if (cell0 && !row[1] && !row[2] && !row[3] && !row[4]) { const l = cell0.toLowerCase().replace(/['"]/g, '').trim(); const f = monthNames.findIndex((n) => l.startsWith(n)); if (f !== -1) { m = f + 1; lastCellDate = null; } continue; }
    if (cell1.toLowerCase() === 'or/supplier') continue;
    if (cell1.toLowerCase() === 'total' || cell1.toLowerCase() === '        total') continue;
    const categoryVal = row[7] !== undefined ? String(row[7]).trim() : '';
    if (!(cell1 && categoryVal)) continue;
    let date = null;
    const fromCell = typeof row[0] === 'number';
    if (typeof row[0] === 'number') { date = excelDateToJSDate(row[0]); if (date) { const p = date.split('-'); const yr = parseInt(p[0], 10); if (yr < 2024 || yr > 2026) date = `${y}-${String(m).padStart(2, '0')}-${p[2] || '01'}`; } }
    else date = `${y}-${String(m).padStart(2, '0')}-01`;
    if (fromCell && date) lastCellDate = date;
    const trueDate = fromCell ? date : (lastCellDate ?? `${trueYear}-${String(m).padStart(2, '0')}-01`);
    const allocs = []; const v = (i) => parseFloat(row[i]) || 0;
    if (v(2) > 0) allocs.push({ area: 'Boarding House', amount: v(2) });
    if (v(3) > 0) allocs.push({ area: 'Main House', amount: v(3) });
    if (v(4) > 0) allocs.push({ area: 'Front Apartment', amount: v(4) });
    if (v(5) > 0) allocs.push({ area: 'Back Apartment', amount: v(5) });
    if (v(6) > 0) allocs.push({ area: 'Other Expenses / Personal', amount: v(6) });
    const total = allocs.reduce((s, a) => s + a.amount, 0) || v(8);
    if (total > 0) {
      if (!allocs.length) allocs.push({ area: 'Boarding House', amount: total });
      out.push({ _sheetRow: idx + 1, _fromCell: fromCell, _trueDate: trueDate, _block: `${y}-${String(m).padStart(2, '0')}`, expense_date: date, or_supplier: cell1, category_code: categoryVal.toLowerCase().replace(/\s+/g, ''), total_expenses: total, allocations: allocs });
    }
  }
  return out;
}

const minusDay = (d) => new Date(Date.parse(d) - 86400000).toISOString().slice(0, 10);
// The same signature the SQL builds from expense_property_allocations.
export const allocSig = (allocs) => allocs
  .map((a) => `${a.area}:${Number(a.amount).toFixed(2)}`)
  .sort()
  .join('|');

export function corrections(rows) {
  return rows
    .filter((r) => r._trueDate.slice(0, 7) < BEFORE_BLOCK && r._block < BEFORE_BLOCK)
    .filter((r) => !(r.or_supplier === ELECTRIC.or_supplier && r._trueDate === ELECTRIC.date))
    .map((r) => ({
      r: r._sheetRow,
      o: r._fromCell ? minusDay(r.expense_date) : r.expense_date,   // what the importer stored
      n: r._trueDate,                                                 // what she wrote
      s: r.or_supplier,
      c: r.category_code,
      t: Number(r.total_expenses).toFixed(2),
      a: allocSig(r.allocations),
    }));
}

if (process.argv[1] && process.argv[1].endsWith('gen-expense-date-fix.mjs')) {
  const wb = xlsx.readFile(WORKBOOK);
  const rows = parseExpenses(xlsx.utils.sheet_to_json(wb.Sheets['Monthly Expenses'], { header: 1 }));
  const fix = corrections(rows);
  // Written so the Supabase SQL editor cannot misread it (Sean, 2026-09-30; the diagnostic
  // failed three times with 'relation "2026" does not exist' while the same SQL runs in
  // Postgres). Every script that ran in that editor had lines of about 300 characters; this
  // carried all 1,261 workbook lines as ONE line of 157,000. So:
  //   - one workbook line per text line (about 150 characters each; a string may span lines);
  //   - no ";", "--" or "/*" inside the data, which an editor can take for the end of a
  //     statement or the start of a comment: her book has "Legazpi Commerial Buil;ding" and
  //     "Al--Sur Trading bh rooftop". Each is written as its JSON escape (\u003b, -\u002d,
  //     /\u002a), which jsonb reads back unchanged, so the data is exactly hers.
  const esc = (json) => json.replace(/'/g, "''").replace(/;/g, '\\u003b').replace(/--/g, '-\\u002d').replace(/\/\*/g, '/\\u002a');
  const data = '[' + fix.map((r) => esc(JSON.stringify(r))).join(',' + String.fromCharCode(10)) + ']';

  const moving = fix.filter((f) => f.o !== f.n).length;
  const tpl = (name) => fs.readFileSync(`./templates/${name}`, 'utf8')
    .replaceAll('__DATA__', () => data).replaceAll('__ROWS__', String(fix.length)).replaceAll('__MOVING__', String(moving));
  fs.writeFileSync('./migrations/064_expense_dates_as_she_wrote_them.sql', tpl('064.sql.tpl'));
  fs.writeFileSync('./migrations/DIAGNOSTIC_expense_dates_before_064.sql', tpl('DIAGNOSTIC_064.sql.tpl'));
  console.log(`workbook lines before ${BEFORE_BLOCK}: ${fix.length}, of which move: ${moving}`);
}
