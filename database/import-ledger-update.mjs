/**
 * ADDITIVE ledger update from the owner's workbook: insert only the rows that are not yet in the
 * database. Never deletes, never changes an existing row.
 *
 * Written 2026-09-30, when the owner's workbook ran to the end of August 2026 and the database's
 * last receipt was dated 8 August.
 *
 * WHY NOT migrate-past-records.mjs: that script deletes every income and expense row and imports
 * the workbook from scratch. Since it ran (2026-08-28) reviewed migrations have corrected, linked,
 * voided and annotated rows in place; re-running it would destroy all of that. This script parses
 * with the SAME rules (its functions are copied below unchanged), then compares.
 *
 * Run:  node import-ledger-update.mjs <workbook.xlsx>                 dry run: report only
 *       node import-ledger-update.mjs <workbook.xlsx> --sql=<file>    also write the migration SQL
 *       node import-ledger-update.mjs <workbook.xlsx> --apply         insert the new rows (after npm run backup)
 *
 * A workbook row is "already there" when the database holds a row with the same key:
 *   income   room + receipt number + date paid + rent amount
 *   expense  date + OR/supplier + category + total
 * Voided rows count as there, so nothing voided comes back.
 *
 * Linking a receipt to a tenant: exact name first (the original import's rule); failing that, the
 * profile that an EXISTING receipt for the same unit with the same written name is linked to.
 * Anything still unlinked is listed, not guessed.
 */
import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import fs from 'fs';

// The workbook's date cells are exact UTC midnight. Converting them in a zone ahead of UTC (this
// laptop is in Manila) lands a day early - the defect migration 032 corrected for income. Forced
// here so the dates read are the dates she wrote, on any machine.
process.env.TZ = 'UTC';

const args = process.argv.slice(2);
// Only this filing block and later are candidates. Older blocks are already in the database, some
// of their rows corrected in place by reviewed migrations; they are compared and reported, never
// re-inserted.
const FROM = args.find((a) => a.startsWith('--from='))?.split('=')[1] ?? '2026-08';
const file = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
const sqlOut = args.find((a) => a.startsWith('--sql='))?.split('=')[1];
if (!file) { console.error('usage: node import-ledger-update.mjs <workbook.xlsx> [--sql=file] [--apply]'); process.exit(1); }

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync('../.env', 'utf8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('='); if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}
const env = loadEnv();
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ---- parsing: copied unchanged from migrate-past-records.mjs --------------------------------
function excelDateToJSDate(serial) {
  if (typeof serial !== 'number') return null;
  const days = serial - (serial < 60 ? 25567 : 25569);
  const dateObj = new Date(days * 86400 * 1000);
  const tzOffset = dateObj.getTimezoneOffset();
  const adjusted = new Date(dateObj.getTime() + tzOffset * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
}
function parseRentPeriod(str, defaultYear) {
  if (!str || typeof str !== 'string') return { start: null, end: null };
  const cleaned = str.replace(/\s+/g, '');
  let year = defaultYear;
  const yearMatch = cleaned.match(/\/(\d{2})$/);
  let baseStr = cleaned;
  if (yearMatch) { year = 2000 + parseInt(yearMatch[1], 10); baseStr = cleaned.substring(0, cleaned.indexOf('/' + yearMatch[1])); }
  const parts = baseStr.split('-');
  if (parts.length !== 2) return { start: null, end: null };
  function parseMonthDay(s) {
    const match = s.match(/^([a-zA-Z\.]+)(\d+)$/);
    if (!match) return null;
    const mStr = match[1].toLowerCase().replace(/\./g, '');
    const d = parseInt(match[2], 10);
    let monthIdx = null;
    if (mStr.startsWith('jan')) monthIdx = 0; else if (mStr.startsWith('feb')) monthIdx = 1; else if (mStr.startsWith('mar')) monthIdx = 2;
    else if (mStr.startsWith('apr') || mStr.startsWith('ap')) monthIdx = 3; else if (mStr.startsWith('may')) monthIdx = 4; else if (mStr.startsWith('jun')) monthIdx = 5;
    else if (mStr.startsWith('jul')) monthIdx = 6; else if (mStr.startsWith('aug')) monthIdx = 7; else if (mStr.startsWith('sep')) monthIdx = 8;
    else if (mStr.startsWith('oct')) monthIdx = 9; else if (mStr.startsWith('nov')) monthIdx = 10; else if (mStr.startsWith('dec')) monthIdx = 11;
    if (monthIdx === null || isNaN(d)) return null;
    return { month: monthIdx, day: d };
  }
  const startMD = parseMonthDay(parts[0]);
  const endMD = parseMonthDay(parts[1]);
  if (!startMD) return { start: null, end: null };
  const startObj = new Date(year, startMD.month, startMD.day);
  let endObj = null;
  if (endMD) { let endYear = year; if (endMD.month < startMD.month) endYear = year + 1; endObj = new Date(endYear, endMD.month, endMD.day); }
  else { const endDay = parseInt(parts[1], 10); if (!isNaN(endDay)) endObj = new Date(year, startMD.month, endDay); }
  if (startObj && endObj) {
    const s = new Date(startObj.getTime() - startObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const e = new Date(endObj.getTime() - endObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    return { start: s, end: e };
  }
  return { start: null, end: null };
}
const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function parseIncome(rows, roomMap) {
  let activeYear = 2024, activeMonth = 1;
  const out = [];
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]; if (!row || row.length === 0) continue;
    const cell0 = row[0] ? String(row[0]).trim() : ''; const cell1 = row[1] ? String(row[1]).trim() : ''; const cell2 = row[2] ? String(row[2]).trim() : '';
    if (cell0 === 'BH' && cell1) {
      const c = cell1.toLowerCase().replace(/['"]/g, '').trim();
      const y = c.match(/\b(202\d)\b/); if (y) activeYear = parseInt(y[1], 10);
      const m = monthNames.findIndex((n) => c.includes(n)); if (m !== -1) activeMonth = m + 1;
      continue;
    }
    if (cell0 && !row[1] && !row[2] && !row[3] && !row[4]) continue;
    if (cell0 === 'Rm #') continue;
    if (!cell0) continue;
    let roomNum = cell0; if (roomNum.startsWith('*')) roomNum = roomNum.substring(1);
    const room = roomMap[roomNum.toLowerCase()]; if (!room) continue;
    if (cell2.toUpperCase() === 'VACANT') continue;
    let tenantName = cell2.trim(); let invoiceNum = null;
    const match = cell2.match(/^(.*?)(?:(?<=[a-z\s])|\b)(INVOICE\s*#|INVOICE\s*|INV\.\s*#|INV\s*#|INV\.\s*|OR\s*#|OR\s+|OR(?=\d)|O\s*#)(\d+.*)$/i);
    if (match) {
      tenantName = match[1].trim(); let prefix = match[2].trim().toUpperCase(); const numPart = match[3].trim();
      if (!prefix.includes('#') && !prefix.endsWith('.')) prefix = prefix + '#';
      invoiceNum = `${prefix}${numPart}`; if (!tenantName) tenantName = cell2.trim();
    }
    if (!tenantName) continue;
    if (!invoiceNum) invoiceNum = `N/A-${roomNum}-${activeMonth}-${activeYear}`;
    /**
     * A blank Date Paid is a row she has laid out for a tenant who has not paid yet (the August
     * block carries 16: a half-typed "INV#52" or last month's number, no date). The original
     * importer filed those as paid on the 1st; here they are marked and never inserted.
     * A date typed as text ("29-Aug--26") is read, and reported as a correction.
     */
    let datePaid = null, dateNote = null;
    if (typeof row[1] === 'number') datePaid = excelDateToJSDate(row[1]);
    else if (row[1] != null && String(row[1]).trim()) {
      const t = String(row[1]).trim().match(/^(\d{1,2})\s*-\s*([A-Za-z]{3})[a-z]*\s*-+\s*(\d{2}|\d{4})$/);
      const mi = t ? monthNames.findIndex((n) => n.startsWith(t[2].toLowerCase())) : -1;
      if (t && mi !== -1) {
        const yr = t[3].length === 2 ? 2000 + Number(t[3]) : Number(t[3]);
        datePaid = `${yr}-${String(mi + 1).padStart(2, '0')}-${String(t[1]).padStart(2, '0')}`;
        dateNote = `date paid typed as text "${String(row[1]).trim()}", read as ${datePaid}`;
      }
    }
    const unpaid = datePaid === null;
    const rp = parseRentPeriod(row[3] ? String(row[3]).trim() : '', activeYear);
    let rs = rp.start, re = rp.end;
    /**
     * A period a whole year away from its own payment ("Aug.10-Sep.9/25" paid 12 Aug 2026, in the
     * August 2026 block) is a year typed wrongly. Moved to the payment's year and reported.
     */
    let periodNote = null;
    if (rs && re && datePaid && Math.abs(Date.parse(rs) - Date.parse(datePaid)) > 200 * 86400000) {
      const shift = Number(datePaid.slice(0, 4)) - Number(rs.slice(0, 4));
      if (Math.abs(shift) === 1) {
        const move = (d) => `${Number(d.slice(0, 4)) + shift}${d.slice(4)}`;
        periodNote = `rent period "${String(row[3]).trim()}" read as ${rs}..${re}, a year from the payment; moved to ${move(rs)}..${move(re)}`;
        rs = move(rs); re = move(re);
      }
    }
    if (!rs || !re) { rs = `${activeYear}-${String(activeMonth).padStart(2, '0')}-01`; const last = new Date(activeYear, activeMonth, 0).getDate(); re = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(last).padStart(2, '0')}`; }
    const rentAmount = parseFloat(row[4]) || 0; const col5 = parseFloat(row[5]) || 0; const occupants = parseInt(row[6]) || 1;
    const water = parseFloat(row[7]) || 0; const gbg = parseFloat(row[8]) || 0;
    const isLinda = room.cluster_code === 'Linda';
    out.push({
      _sheetRow: idx + 1, _unpaid: unpaid, _notes: [dateNote, periodNote].filter(Boolean),
      room_id: room.id, _unit: room.room_number, year: activeYear, month: activeMonth, date_paid: datePaid ?? `${activeYear}-${String(activeMonth).padStart(2, '0')}-01`,
      contact_name: tenantName, invoice_number: invoiceNum, rent_period_start: rs, rent_period_end: re, rent_amount: rentAmount,
      occupants, water_payment: isLinda ? 0 : water, gbg_fee: gbg, payment_method: 'Cash', is_linda_billing: isLinda,
      linda_electricity_charge: isLinda ? col5 : 0, linda_water_charge: isLinda ? water : 0, verification_status: 'Verified',
    });
  }
  return out;
}

function parseExpenses(rows) {
  let y = 2024, m = 1; const out = [];
  /**
   * HER CONVENTION, read properly for the rows this script inserts (`_trueDate`): a blank Date
   * cell means the same day as the line above; the year comes from any year header, including
   * "YEAR 2026", which the original importer did not recognise. The original rules still produce
   * `expense_date`, because that is how the stored rows were made and matching must compare like
   * with like. (Those rules filed 647 blank-dated entries on the 1st of a 2025 month, 2026 ones
   * included - an existing error this script reports and does not touch.)
   */
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

// ---- database ----------------------------------------------------------------------------------
async function all(table, cols) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data); if (data.length < 1000) break;
  }
  return rows;
}
const money = (n) => Number(n).toFixed(2);
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const iKey = (r) => `${r.room_id}|${norm(r.invoice_number)}|${r.date_paid}|${money(r.rent_amount)}`;
/**
 * Imported expense dates are ONE DAY EARLY in the database: the 032 defect, corrected for income
 * and never for expenses (all 1,262 imported entries). So a stored entry is matched as if dated a
 * day later. New entries are inserted with the date she wrote.
 */
const minusDay = (d) => new Date(Date.parse(d) - 86400000).toISOString().slice(0, 10);
const eKey = (r) => `${r.expense_date}|${norm(r.or_supplier)}|${norm(r.category_code)}|${money(r.total_expenses)}`;
// A sheet entry whose date came from a real date cell may be stored a day early (the import
// defect); one whose date was defaulted to the 1st was never shifted. Try the keys in that order.
// ...and one this script inserted is stored under the date she meant (`_trueDate`), so that key is
// tried too - without it a re-run would see the blank-dated rows it had already added as missing.
const eKeys = (r) => [...new Set([
  eKey(r),
  ...(r._fromCell ? [eKey({ ...r, expense_date: minusDay(r.expense_date) })] : []),
  eKey({ ...r, expense_date: r._trueDate }),
])];

const { data: rooms } = await db.from('rooms').select('id, room_number, cluster_code');
const roomMap = Object.fromEntries(rooms.map((r) => [r.room_number.toLowerCase(), r]));
const profiles = await all('profiles', 'id, full_name, role, email');
const dbIncome = await all('monthly_income_records', 'id, room_id, tenant_profile_id, invoice_number, date_paid, rent_amount, contact_name, voided_at');
const dbExp = await all('monthly_expense_entries', 'id, expense_date, or_supplier, category_code, total_expenses');

const wb = xlsx.readFile(file);
const inc = parseIncome(xlsx.utils.sheet_to_json(wb.Sheets['Monthly Income'], { header: 1 }), roomMap);
const exp = parseExpenses(xlsx.utils.sheet_to_json(wb.Sheets['Monthly Expenses'], { header: 1 }));

// Multiset diff: a workbook row matches one database row with the same key.
function diff(sheetRows, dbRows, key, sheetKeys = (r) => [key(r)]) {
  const pool = new Map();
  for (const r of dbRows) { const k = key(r); pool.set(k, (pool.get(k) ?? 0) + 1); }
  const missing = [];
  for (const r of sheetRows) {
    const k = sheetKeys(r).find((c) => (pool.get(c) ?? 0) > 0);
    if (k) pool.set(k, pool.get(k) - 1); else missing.push(r);
  }
  const dbOnly = [...pool.entries()].filter(([, n]) => n > 0).reduce((s, [, n]) => s + n, 0);
  return { missing, dbOnly };
}
const blockOf = (r) => `${r.year}-${String(r.month).padStart(2, '0')}`;
const Iall = diff(inc, dbIncome, iKey);
const olderDiffer = Iall.missing.filter((r) => blockOf(r) < FROM);
const unpaid = Iall.missing.filter((r) => blockOf(r) >= FROM && r._unpaid);
/**
 * A row CARRIED FORWARD from last month: she lays the next month's line out by copying the last
 * one and moving the period on, and the receipt number and date stay until the tenant pays. 1E's
 * August line was exactly that (INV#5221, 25 July, already stored for 15 Jul - 14 Aug). So a
 * candidate is skipped when the unit already has that receipt number, or a receipt paid the same
 * day for the same rent (the second catches the clusters that write no receipt numbers).
 */
const realNo = (s) => !/^N\/A-/i.test(String(s));
const digits = (s) => String(s).replace(/\D/g, '');
const carried = (r) => dbIncome.some((d) => d.room_id === r.room_id && (
  (realNo(r.invoice_number) && digits(d.invoice_number) === digits(r.invoice_number)) ||
  (d.date_paid === r.date_paid && money(d.rent_amount) === money(r.rent_amount))));
const inBlockPaid = Iall.missing.filter((r) => blockOf(r) >= FROM && !r._unpaid);
const carriedRows = inBlockPaid.filter(carried);
const I = { missing: inBlockPaid.filter((r) => !carried(r)), dbOnly: Iall.dbOnly };
const Eall = diff(exp, dbExp, eKey, eKeys);
const expOlder = Eall.missing.filter((r) => r._trueDate.slice(0, 7) < FROM);
// Inserted with the date she means (`_trueDate`), not the importer's 1st-of-a-2025-month default.
const E = { missing: Eall.missing.filter((r) => r._trueDate.slice(0, 7) >= FROM).map((r) => ({ ...r, _importerDate: r.expense_date, expense_date: r._trueDate })), dbOnly: Eall.dbOnly };

// Link new receipts to tenants.
const byName = new Map(profiles.filter((p) => p.role !== 'admin').map((p) => [norm(p.full_name), p.id]));
const byUnitName = new Map();
for (const r of dbIncome) if (r.tenant_profile_id) byUnitName.set(`${r.room_id}|${norm(r.contact_name)}`, r.tenant_profile_id);
const unlinked = [];
for (const r of I.missing) {
  r.tenant_profile_id = byName.get(norm(r.contact_name)) ?? byUnitName.get(`${r.room_id}|${norm(r.contact_name)}`) ?? null;
  r._linkedBy = byName.has(norm(r.contact_name)) ? 'name' : r.tenant_profile_id ? 'same unit and name' : 'none';
  if (!r.tenant_profile_id) unlinked.push(r);
}

const sum = (a, k) => a.reduce((s, r) => s + Number(r[k] || 0), 0);
const byMonth = (a, f) => a.reduce((m, r) => ((m[f(r)] = (m[f(r)] ?? 0) + 1), m), {});
console.log(`WORKBOOK: ${inc.length} income rows, ${exp.length} expense entries.  DATABASE: ${dbIncome.length} income rows, ${dbExp.length} expense entries.`);
console.log(`\nINCOME not in the database: ${I.missing.length} rows, rent P${sum(I.missing, 'rent_amount').toLocaleString()}, water P${sum(I.missing, 'water_payment').toLocaleString()}`);
console.log('  by filing month:', JSON.stringify(byMonth(I.missing, (r) => `${r.year}-${String(r.month).padStart(2, '0')}`)));
console.log('  by date paid (month):', JSON.stringify(byMonth(I.missing, (r) => r.date_paid.slice(0, 7))));
console.log(`  linked by name ${I.missing.filter((r) => r._linkedBy === 'name').length}, by same unit+name ${I.missing.filter((r) => r._linkedBy === 'same unit and name').length}, UNLINKED ${unlinked.length}`);
console.log(`  database income rows with no match in the workbook (left as they are): ${I.dbOnly}`);
console.log(`  NOT inserted - laid out but no date paid (not paid yet): ${unpaid.length}${unpaid.length ? ' - units ' + unpaid.map((r) => r._unit).join(', ') : ''}`);
console.log(`  NOT inserted - carried forward from last month (same receipt, or same day and rent, already stored): ${carriedRows.length}${carriedRows.length ? ' - ' + carriedRows.map((r) => `${r._unit} ${r.invoice_number} ${r.date_paid}`).join('; ') : ''}`);
console.log(`  NOT inserted - older blocks that differ from the database (corrected there by migrations): ${olderDiffer.length}${olderDiffer.length ? ' - ' + olderDiffer.map((r) => `${r._unit} ${blockOf(r)} ${r.invoice_number}`).join('; ') : ''}`);
const corrected = I.missing.filter((r) => r._notes.length);
if (corrected.length) { console.log('  CORRECTIONS read from typos (inserted as corrected):'); for (const r of corrected) console.log(`    ${r._unit} (sheet row ${r._sheetRow}): ${r._notes.join('; ')}`); }
console.log(`\nEXPENSES not in the database: ${E.missing.length} entries, P${sum(E.missing, 'total_expenses').toLocaleString()}`);
console.log('  by expense month:', JSON.stringify(byMonth(E.missing, (r) => r.expense_date.slice(0, 7))));
console.log(`  NOT inserted - older entries that do not match the database: ${expOlder.length}${expOlder.length ? ' - ' + expOlder.map((r) => `${r.expense_date} P${r.total_expenses} ${r.or_supplier.slice(0, 25)}`).join('; ') : ''}`);
console.log(`  database expense entries with no match in the workbook (left as they are): ${E.dbOnly}`);
const show = process.argv.includes('--list');
if (show) {
  console.log('\nINCOME candidates (unit, filed, paid, receipt, period, rent, water, occ, link):');
  for (const r of I.missing) console.log(`  row ${r._sheetRow}: ${r._unit} ${r.year}-${r.month} paid ${r.date_paid} ${r.invoice_number} ${r.rent_period_start}..${r.rent_period_end} rent ${r.rent_amount} water ${r.water_payment} occ ${r.occupants} gbg ${r.gbg_fee} [${r._linkedBy}]`);
  console.log('\nEXPENSE candidates:');
  for (const r of E.missing) console.log(`  row ${r._sheetRow}: ${r._block} ${r.expense_date} cat ${r.category_code} P${r.total_expenses} ${r.allocations.map((a) => `${a.area} ${a.amount}`).join(' + ')} | ${r.or_supplier.slice(0, 40)}`);
}

// ---- migration SQL (the reviewable record) ----------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const incCols = ['room_id', 'tenant_profile_id', 'year', 'month', 'date_paid', 'contact_name', 'invoice_number', 'rent_period_start', 'rent_period_end', 'rent_amount', 'occupants', 'water_payment', 'gbg_fee', 'payment_method', 'is_linda_billing', 'linda_electricity_charge', 'linda_water_charge', 'verification_status'];
const incRow = (r) => Object.fromEntries(incCols.map((c) => [c, r[c]]));
if (sqlOut) {
  const lines = [];
  // Every statement is guarded by NOT EXISTS on the same key the script matched on, so running
  // this file after the script has applied the same rows (or twice) inserts nothing more.
  lines.push('BEGIN;', '', '-- INCOME: one row per paid receipt in the workbook that the database did not hold.');
  for (const r of I.missing) {
    lines.push(`INSERT INTO monthly_income_records (${incCols.join(', ')})`);
    lines.push(`  SELECT ${incCols.map((c) => q(r[c])).join(', ')}`);
    lines.push(`  WHERE NOT EXISTS (SELECT 1 FROM monthly_income_records WHERE room_id = ${q(r.room_id)} AND invoice_number = ${q(r.invoice_number)} AND date_paid = ${q(r.date_paid)} AND rent_amount = ${r.rent_amount}); -- sheet row ${r._sheetRow}, unit ${r._unit}`);
  }
  lines.push('', '-- EXPENSES: each entry, then its area allocations (the total follows the allocations by trigger).');
  for (const r of E.missing) {
    lines.push(`WITH e AS (INSERT INTO monthly_expense_entries (expense_date, or_supplier, category_code, total_expenses)`);
    lines.push(`  SELECT ${q(r.expense_date)}, ${q(r.or_supplier)}, ${q(r.category_code)}, ${r.total_expenses}`);
    lines.push(`  WHERE NOT EXISTS (SELECT 1 FROM monthly_expense_entries WHERE expense_date = ${q(r.expense_date)} AND or_supplier = ${q(r.or_supplier)} AND category_code = ${q(r.category_code)} AND total_expenses = ${r.total_expenses}) RETURNING id)`);
    lines.push(`INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) SELECT e.id, v.area::property_area_type, v.amount FROM e, (VALUES ${r.allocations.map((a) => `(${q(a.area)}, ${a.amount})`).join(', ')}) AS v(area, amount); -- sheet row ${r._sheetRow}`);
  }
  lines.push('', 'COMMIT;');
  fs.writeFileSync(sqlOut, lines.join('\n') + '\n', 'utf8');
  console.log(`\nSQL written: ${sqlOut}`);
}

// ---- apply -------------------------------------------------------------------------------------
if (apply) {
  const admin = profiles.find((p) => p.role === 'admin');
  const incPayload = I.missing.map(incRow);
  for (let i = 0; i < incPayload.length; i += 100) {
    const { error } = await db.from('monthly_income_records').insert(incPayload.slice(i, i + 100));
    if (error) { console.error(`income insert failed at ${i}: ${error.message}`); process.exit(1); }
  }
  console.log(`inserted income rows: ${incPayload.length}`);
  let n = 0;
  for (const r of E.missing) {
    const { data: entry, error } = await db.from('monthly_expense_entries')
      .insert({ expense_date: r.expense_date, or_supplier: r.or_supplier, category_code: r.category_code, total_expenses: r.total_expenses, created_by: admin?.id ?? null })
      .select('id').single();
    if (error) { console.error(`expense insert failed (sheet row ${r._sheetRow}): ${error.message}`); process.exit(1); }
    const { error: aErr } = await db.from('expense_property_allocations').insert(r.allocations.map((a) => ({ expense_entry_id: entry.id, property_area: a.area, amount: a.amount })));
    if (aErr) { console.error(`allocations failed (sheet row ${r._sheetRow}, entry ${entry.id}): ${aErr.message}`); process.exit(1); }
    n++;
  }
  console.log(`inserted expense entries: ${n}`);
}
