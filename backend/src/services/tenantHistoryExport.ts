/**
 * @file services/tenantHistoryExport.ts
 * @description The Tenants page's history, as a workbook: who paid for each
 * unit in a year, or in one month of it, read from the owner's receipts.
 *
 * Built from the same rule the screen uses (utils/tenantHistory.ts, an
 * identical copy of the frontend's lib/tenantHistory.ts; `check:reports`
 * holds the two together), so the file and the screen list the same people
 * under the same names. Her receipts are read, never changed: a name she wrote
 * two ways in one unit is one row here with the other spelling in its own
 * column, exactly as the screen shows it.
 *
 * Why the receipts and not the accounts: see utils/tenantHistory.ts.
 */
import ExcelJS from 'exceljs';
import { db } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { buildTenantHistory, monthsLabel, type HistoryReceipt, type HistoryPerson } from '../utils/tenantHistory.js';

/** The same header ink and hairline as the other workbooks (auditTrailExport.ts). */
const INK = 'FF1F2430';
const RULE = 'FFD8DCE3';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A bare `YYYY-MM-DD` as the screen prints it, read as the date it is (no time zone shift). */
function dateOnly(iso: unknown, opts: Intl.DateTimeFormatOptions): string {
  const s = String(iso ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}

async function allReceipts(): Promise<HistoryReceipt[]> {
  const rows: any[] = [];
  // Paged: PostgREST caps a response at 1,000 rows, and the ledger is near that.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('monthly_income_records')
      .select('year, month, contact_name, date_paid, rent_period_start, rent_period_end, invoice_number, rooms:room_id (room_number)')
      .is('voided_at', null)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw ApiError.internal(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows.map((r) => {
    const room = Array.isArray(r.rooms) ? r.rooms[0] : r.rooms;
    const start = dateOnly(r.rent_period_start, { month: 'short', day: 'numeric' });
    const end = dateOnly(r.rent_period_end, { month: 'short', day: 'numeric' });
    return {
      unit: room?.room_number ?? '',
      year: Number(r.year),
      month: Number(r.month),
      contact: r.contact_name ?? '',
      datePaid: dateOnly(r.date_paid, { month: 'short', day: 'numeric', year: 'numeric' }),
      rentFor: start && end ? `${start} – ${end}` : '',
      invoice: r.invoice_number ?? '',
    };
  });
}

async function currentTenants() {
  const { data, error } = await db
    .from('room_assignments')
    .select('rooms:room_id (room_number), profiles:tenant_profile_id (full_name, account_status)')
    .eq('is_active', true);
  if (error) throw ApiError.internal(error.message);
  return (data ?? []).map((a: any) => {
    const room = Array.isArray(a.rooms) ? a.rooms[0] : a.rooms;
    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    return {
      name: profile?.full_name ?? '',
      unitCode: room?.room_number ?? '',
      status: profile?.account_status === 'active' ? 'active' : 'vacated',
    };
  });
}

export async function buildTenantHistoryWorkbook(
  year: number,
  month: number | null
): Promise<{ workbook: ExcelJS.Workbook; rowCount: number; people: HistoryPerson[] }> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw ApiError.validation('A year between 2000 and 2100 is required.', { year: ['must be between 2000 and 2100'] });
  }
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) {
    throw ApiError.validation('A month from 1 to 12 is required.', { month: ['must be from 1 to 12'] });
  }

  const [receipts, current] = await Promise.all([allReceipts(), currentTenants()]);
  const people = buildTenantHistory(receipts, current, { year, month });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hivelet';
  workbook.created = new Date();
  const period = month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year);
  workbook.title = `Tenant history, ${period}`;
  workbook.subject = 'Who paid for each unit, from the payments in Monthly Income';

  const sheet = workbook.addWorksheet(`Tenants ${period}`.slice(0, 31));
  sheet.columns = [
    { header: 'Unit', key: 'unit', width: 8 },
    { header: 'Tenant', key: 'name', width: 30 },
    { header: 'Lives here now', key: 'now', width: 15 },
    { header: 'Also written as', key: 'spellings', width: 28 },
    { header: 'Also rented', key: 'alsoIn', width: 13 },
    ...(month
      ? [
          { header: 'Covers', key: 'covers', width: 22 },
          { header: 'Paid on', key: 'paidOn', width: 16 },
          { header: 'Invoice', key: 'receipt', width: 18 },
        ]
      : [
          { header: `Months paid in ${year}`, key: 'months', width: 26 },
          { header: 'Payments', key: 'receipts', width: 10 },
        ]),
  ];

  const head = sheet.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
  head.alignment = { vertical: 'middle' };
  head.height = 22;

  for (const p of people) {
    sheet.addRow({
      unit: p.unit.toUpperCase(),
      name: p.name,
      now: p.livesHereNow ? 'Yes' : '',
      spellings: p.otherSpellings.join(', '),
      alsoIn: p.alsoIn.map((u) => u.toUpperCase()).join(', '),
      ...(month
        ? { covers: p.covers.join('; '), paidOn: p.paidOn.join('; '), receipt: p.receiptNumbers.join(', ') }
        : { months: monthsLabel(p.months), receipts: p.receipts }),
    });
  }

  sheet.eachRow((row, index) => {
    if (index === 1) return;
    row.alignment = { vertical: 'top', wrapText: true };
    row.border = { bottom: { style: 'hair', color: { argb: RULE } } };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };

  return { workbook, rowCount: people.length, people };
}
