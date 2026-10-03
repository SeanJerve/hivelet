/**
 * @file services/incomeReportExport.ts
 * @description The Monthly Income Report as a real Excel workbook. BR-049, FR-044.
 *
 * WHY THIS EXISTS
 * ---------------
 * Both ledgers already export to CSV, which satisfies **BR-030** — records leave
 * the system in a format Excel opens. **BR-049** asks for something stricter:
 * the *documented layout*, reproduced. `docs/09_MONTHLY_INCOME_REPORT.md` is that
 * document, and it describes a running ledger rather than a flat table — a year
 * header, a month header, units in a fixed order inside each cluster, a subtotal
 * per cluster, a grand subtotal that deliberately excludes Linda, then Linda's
 * own section, and a blank row before the next month.
 *
 * CSV cannot carry any of it. This can.
 *
 * WHAT IS DELIBERATELY NOT DECIDED HERE
 * -------------------------------------
 * **OD-01 is open.** The owner's own sheet shows a bottom-of-page figure far
 * larger than any single month, which suggests a year-to-date running total, but
 * she has not confirmed whether the report should show per-month totals,
 * year-to-date, or both. This workbook therefore emits **both**, each labelled,
 * and neither presented as "the" total. Picking one would be inventing her
 * answer; omitting both would drop a figure she uses.
 *
 * LINDA
 * -----
 * LF and LB bill on fixed charges, not occupants × rate, and their money is
 * remitted directly to Linda rather than pooled. They are kept out of the grand
 * subtotal and given their own section, exactly as the source sheet does.
 *
 * The fixed electricity charge that used to apply to them was **retired** by
 * migration `017` — the owner confirmed it was a workaround for unmetered units
 * and is out of scope going forward. Historical values are real money and are
 * still shown; the column simply stays empty for anything recorded since.
 */
import ExcelJS from 'exceljs';
import { db } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { asScope, assertScope, type ReportScope } from '../utils/reportScope.js';
import { isAcknowledgementReceipt } from '../utils/invoiceNumber.js';

/**
 * The canonical unit order, from `docs/09_MONTHLY_INCOME_REPORT.md` §2.
 *
 * Not read from the database, and not sorted alphabetically, because neither
 * gives the right answer: the sheet runs `B1F, B2F, B2B` — front before back on
 * each floor — and an alphabetical sort produces `B1F, B2B, B2F`. The order is a
 * property of the owner's sheet, so it is written down here and checked against
 * the database rather than derived from it.
 *
 * That last clause was a claim with no check behind it. Nothing compared this
 * list to `rooms`, anywhere, and the month loop below only ever pulls the units
 * it names - so a unit present in the ledger but absent from this array had its
 * income **silently dropped**: no row, no subtotal, not in the grand subtotal,
 * not in the year to date, and nothing on the sheet to say a unit was missing.
 * The report would simply have understated her income by that unit's rent.
 *
 * All 33 units are accounted for today (22 Boarding House (code BH) + 5 Back + 1 PH + 3 Front here,
 * plus LF and LB in LINDA_UNITS), verified against `rooms`. The risk is the
 * next one she adds. `unplacedRows` below now catches that rather than trusting
 * this comment to stay true.
 */
const CLUSTER_ORDER: { code: string; label: string; units: string[]; subtotal: boolean }[] = [
  {
    code: 'BH',
    label: 'Boarding House (Main Rooms)',
    units: [
      '1a', '1b', '1c', '1d', '1e', '1f', '1g', '1h',
      '2a', '2b', '2c', '2d', '2e', '2f', '2g',
      '3a', '3b', '3c', '3d', '3e', '3f', '3g',
    ],
    subtotal: true,
  },
  { code: 'Back Apartment', label: 'Back Apartment', units: ['B1F', 'B2F', 'B2B', 'B3F', 'B3B'], subtotal: true },
  { code: 'Penthouse', label: 'Penthouse', units: ['PH'], subtotal: false },
  { code: 'Front Apartment', label: 'Front Apartment', units: ['F1', 'F2F', 'F2B'], subtotal: true },
];

/** Billed on fixed charges and remitted directly to Linda. Never in the grand subtotal. */
const LINDA_UNITS = ['LF', 'LB'];

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONEY_FMT = '#,##0.00';
const INK = 'FF1F2430';
const RED = 'FFC0392B';
const RULE = 'FFD8DCE3';

interface LedgerRow {
  room_number: string;
  date_paid: string;
  contact_name: string;
  invoice_number: string | null;
  rent_period_start: string;
  rent_period_end: string;
  rent_amount: number;
  fifty_percent_share: number | null;
  occupants: number;
  water_payment: number;
  remitted_amount: number | null;
  linda_electricity_charge: number | null;
  /**
   * BR-040's fixed water charge for LF and LB.
   *
   * Their `water_payment` is 0 by design - they are not on the per-occupant
   * model - so the money sits here and nowhere else. Until 2026-09-16 this
   * column was not selected, not typed and not summed, and the LINDA section
   * of the workbook therefore reported zero water for both units against
   * PHP 18,600 actually collected across 62 rows.
   */
  linda_water_charge: number | null;
  anniversary_date: string | null;
  deposit_amount: number | null;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** `D-MMM-YY`, the format the source sheet uses for Date Paid. */
function datePaidFmt(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()}-${MON[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(2)}`;
}

/** `MMM.D-MMM.D/YY`, the "Rent For" column. */
function rentForFmt(startIso: string, endIso: string): string {
  const s = new Date(`${startIso}T00:00:00Z`);
  const e = new Date(`${endIso}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startIso} - ${endIso}`;
  return `${MON[s.getUTCMonth()]}.${s.getUTCDate()}-${MON[e.getUTCMonth()]}.${e.getUTCDate()}/${String(e.getUTCFullYear()).slice(2)}`;
}

/** `MMM D/YY`, the Anniv Date column. */
function annivFmt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}/${String(d.getUTCFullYear()).slice(2)}`;
}

interface Totals {
  rent: number;
  share: number;
  occupants: number;
  water: number;
  remitted: number;
}
const zero = (): Totals => ({ rent: 0, share: 0, occupants: 0, water: 0, remitted: 0 });
const add = (t: Totals, r: LedgerRow): void => {
  t.rent += n(r.rent_amount);
  t.share += n(r.fifty_percent_share);
  t.occupants += n(r.occupants);
  t.water += n(r.water_payment);
  t.remitted += n(r.remitted_amount);
};
const merge = (into: Totals, from: Totals): void => {
  into.rent += from.rent;
  into.share += from.share;
  into.occupants += from.occupants;
  into.water += from.water;
  into.remitted += from.remitted;
};

/**
 * Builds the workbook for one month, one year, or every year (`ReportScope`;
 * a bare number is a year, as every caller before 2026-10-02 passed).
 *
 * Voided rows are excluded — they are preserved in the database under BR-003,
 * but a voided receipt is not income and must not reach a total.
 *
 * A month and a year are chosen by the receipt's own `year` and `month`
 * columns - the period it pays for - which is what the year export has always
 * filtered on and what the Monthly Income screen groups by (Sean, 2026-10-02).
 */
export async function buildIncomeReportWorkbook(scopeOrYear: ReportScope | number): Promise<ExcelJS.Workbook> {
  const scope = asScope(scopeOrYear);
  assertScope(scope);

  /**
   * Read in batches. A single `select` is capped by PostgREST's default of 1000
   * rows and says nothing when it truncates - the workbook would simply be
   * short, with a total to match, and nothing on the sheet to show rows were
   * missing.
   *
   * Not hypothetical: 2025 already holds **837 expense entries**. `admin.ts`
   * pages the same table in 1000-row batches for the list endpoint; the exports
   * did not, and they are the artefact the owner actually keeps.
   */
  const BATCH = 1000;
  const data: any[] = [];
  for (let from = 0; ; from += BATCH) {
    let query = db
      .from('monthly_income_records')
      .select(
        'year, month, date_paid, contact_name, invoice_number, rent_period_start, rent_period_end, ' +
          'rent_amount, fifty_percent_share, occupants, water_payment, remitted_amount, ' +
          'linda_electricity_charge, linda_water_charge, room_id, tenant_profile_id, ' +
          'rooms:room_id (room_number)'
      )
      .is('voided_at', null);
    // Filtered here, in the query, so a month reads a month and not the ledger.
    if (scope.kind !== 'all') query = query.eq('year', scope.year);
    if (scope.kind === 'month') query = query.eq('month', scope.month);
    const { data: page, error } = await query
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .order('date_paid', { ascending: true })
      .order('invoice_number', { ascending: true })
      // Those three can tie, and pages are separate queries (FINAL_REVIEW F8).
      .order('id', { ascending: true })
      .range(from, from + BATCH - 1);

    if (error) throw ApiError.internal(`The income ledger could not be read: ${error.message}`);
    data.push(...(page ?? []));
    if (!page || page.length < BATCH) break;
  }

  /**
   * Anniv Date and Deposit (columns 11 and 12) live on the tenancy, not on the
   * receipt. `assignment_id` was meant to carry the link and is **NULL on every
   * one of the 937 rows** - the column has never been written, by the migration
   * or by anything since - so reading it produced two permanently empty columns.
   *
   * (This said "all 214 migrated rows" until 2026-09-17. 214 is the number of
   * rows dated 2026; the true figure is the whole ledger. The smaller number
   * made the gap look like a migration remnant rather than a column nothing
   * populates.)
   *
   * Resolved by room AND tenant together, never by room alone. A unit that has
   * changed hands would otherwise show the current tenant's move-in date against
   * a previous tenant's receipt - a plausible-looking date that is simply wrong.
   * Where the pair does not match, the cells stay blank, which is honest.
   *
   * HOW MUCH OF THE SHEET THAT LEAVES BLANK, measured 2026-09-17:
   *
   *     535  resolve to a tenancy          -> both columns filled
   *     354  have no `tenant_profile_id`   -> blank, nothing to resolve WITH
   *      48  name a room/tenant pair that matches no tenancy -> blank
   *     ---
   *     402 of 937  (43%) blank
   *
   * Blank is the right answer for all 402 - inventing a date would be worse -
   * but the scale is worth knowing before anyone is asked why half a column is
   * empty. `check:ledger` reports the split on every run.
   */
  const { data: assignments, error: assignError } = await db
    .from('room_assignments')
    .select('room_id, tenant_profile_id, anniversary_date, deposit_amount');

  if (assignError) {
    throw ApiError.internal(`Tenancies could not be read for the report: ${assignError.message}`);
  }

  return renderIncomeReportWorkbook(data, assignments ?? [], scope);
}

/** "March", for the sentence a month with nothing in it prints. */
const monthTitle = (m: number) => MONTHS[m - 1].charAt(0) + MONTHS[m - 1].slice(1).toLowerCase();

/**
 * The workbook from rows already read: no database here, so the layout for each
 * scope can be checked against fixture rows without touching the owner's ledger
 * (Sean, 2026-10-02).
 *
 * The rows are filtered by the scope again, as well as by the query that read
 * them, so this function means the same thing whoever calls it.
 *
 * Everything is one sheet per year, each the year's own layout - its own year
 * to date and Linda year to date - rather than one sheet running across years.
 * A running total across years is a figure the owner has never asked for, and
 * OD-01 has not settled even the one-year figure.
 */
export function renderIncomeReportWorkbook(
  rawRows: readonly Record<string, any>[],
  assignments: readonly Record<string, any>[],
  scope: ReportScope
): ExcelJS.Workbook {
  const tenancy = new Map<string, { anniversary_date: string | null; deposit_amount: number | null }>();
  for (const a of assignments ?? []) {
    const key = `${(a as any).room_id}::${(a as any).tenant_profile_id}`;
    tenancy.set(key, {
      anniversary_date: (a as any).anniversary_date ?? null,
      deposit_amount:
        (a as any).deposit_amount === null || (a as any).deposit_amount === undefined
          ? null
          : n((a as any).deposit_amount),
    });
  }

  const byYear = new Map<number, Map<number, LedgerRow[]>>();
  for (const raw of rawRows) {
    const rowYear = Number(raw.year);
    const rowMonth = Number(raw.month);
    if (scope.kind !== 'all' && rowYear !== scope.year) continue;
    if (scope.kind === 'month' && rowMonth !== scope.month) continue;
    const row: LedgerRow = {
      room_number: raw.rooms?.room_number ?? '',
      date_paid: raw.date_paid,
      contact_name: raw.contact_name,
      invoice_number: raw.invoice_number,
      rent_period_start: raw.rent_period_start,
      rent_period_end: raw.rent_period_end,
      rent_amount: n(raw.rent_amount),
      fifty_percent_share: raw.fifty_percent_share === null ? null : n(raw.fifty_percent_share),
      occupants: n(raw.occupants),
      water_payment: n(raw.water_payment),
      remitted_amount: raw.remitted_amount === null ? null : n(raw.remitted_amount),
      linda_electricity_charge:
        raw.linda_electricity_charge === null ? null : n(raw.linda_electricity_charge),
      linda_water_charge:
        raw.linda_water_charge === null ? null : n(raw.linda_water_charge),
      anniversary_date: null,
      deposit_amount: null,
    };

    const link = tenancy.get(`${raw.room_id}::${raw.tenant_profile_id}`);
    if (link) {
      row.anniversary_date = link.anniversary_date;
      row.deposit_amount = link.deposit_amount;
    }
    const byMonth = byYear.get(rowYear) ?? new Map<number, LedgerRow[]>();
    const list = byMonth.get(rowMonth) ?? [];
    list.push(row);
    byMonth.set(rowMonth, list);
    byYear.set(rowYear, byMonth);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Fe Galang Da Silva Boarding House';
  wb.created = new Date();

  if (scope.kind === 'all') {
    const years = [...byYear.keys()].sort((a, b) => a - b);
    if (years.length === 0) {
      const ws = wb.addWorksheet('Income');
      ws.addRow(['No income has been recorded.']).font = { size: 10, italic: true };
      return wb;
    }
    for (const y of years) addIncomeSheet(wb, y, null, byYear.get(y)!);
    return wb;
  }

  addIncomeSheet(wb, scope.year, scope.kind === 'month' ? scope.month : null, byYear.get(scope.year) ?? new Map());
  return wb;
}

/**
 * One sheet: a year, or one month of it (`onlyMonth`). A month is the same
 * block a year prints for it, and stops there - the year to date beneath a
 * year is not a figure one month can carry.
 */
function addIncomeSheet(
  wb: ExcelJS.Workbook,
  year: number,
  onlyMonth: number | null,
  byMonth: Map<number, LedgerRow[]>
): void {
  const period = onlyMonth ? `${MONTHS[onlyMonth - 1]} ${year}` : String(year);
  const ws = wb.addWorksheet(onlyMonth ? `Income ${MON[onlyMonth - 1]} ${year}` : `Income ${year}`, {
    views: [{ state: 'frozen', ySplit: 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 8 },  // 1  Rm #
    { width: 12 }, // 2  Date Paid
    { width: 30 }, // 3  Contact + Invoice
    { width: 20 }, // 4  Rent For
    { width: 13 }, // 5  Rent Amount
    { width: 12 }, // 6  50% Share
    { width: 10 }, // 7  Occupants
    { width: 13 }, // 8  Water Payment
    { width: 14 }, // 9  Remitted
    { width: 12 }, // 10 Anniv Date
    { width: 12 }, // 11 Deposit
  ];

  // The business's name, not the system's (Loyd, 2026-10-03): this is her report.
  const title = ws.addRow([`FE GALANG DA SILVA — MONTHLY INCOME REPORT — ${period}`]);
  title.font = { bold: true, size: 13, color: { argb: INK } };
  ws.mergeCells(title.number, 1, title.number, 11);

  const headerRow = ws.addRow([
    'Rm #', 'Date Paid', 'Contact + Invoice #', 'Rent For', 'Rent Amount', '50% Share',
    'Occupants', 'Water Payment', 'Remitted Amount', 'Anniv Date', 'Deposit',
  ]);
  headerRow.font = { bold: true, size: 10, color: { argb: INK } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.eachCell((c) => {
    c.border = { bottom: { style: 'medium', color: { argb: INK } } };
  });

  const yearToDate = zero();
  const lindaYear = zero();
  /**
   * The two fixed charges, carried across the year as well as within each month.
   *
   * They were accumulated per month and printed per month, and then dropped:
   * `lindaYear` is merged only from `lindaTotal`, which is the rent-and-remitted
   * shape and holds neither charge. So the Linda section reconciled month by
   * month and silently under-reported at the bottom of the page.
   *
   * Real money, not a rounding: **18,600.00 fixed water and 12,035.76
   * electricity** across the three years the ledger covers (7,200 + 7,200 +
   * 4,200, and 5,860.76 + 3,900 + 2,275), from `monthly_income_records`.
   * Anyone totalling Linda for a year from the year line was 30,635.76 short
   * over the ledger's life.
   */
  const monthsPresent = [...byMonth.keys()].sort((a, b) => a - b);

  const moneyCells = (r: ExcelJS.Row) => {
    for (const i of [5, 6, 8, 9, 11]) r.getCell(i).numFmt = MONEY_FMT;
  };

  const emitUnitRow = (r: LedgerRow) => {
    const row = ws.addRow([
      r.room_number,
      datePaidFmt(r.date_paid),
      null, // filled below as rich text
      rentForFmt(r.rent_period_start, r.rent_period_end),
      r.rent_amount,
      r.fifty_percent_share ?? r.rent_amount / 2,
      r.occupants || null,
      r.water_payment || null,
      r.remitted_amount ?? r.rent_amount + r.water_payment,
      annivFmt(r.anniversary_date),
      r.deposit_amount,
    ]);
    // The invoice number is red so it reads apart from the contact name, which is
    // how the owner's own sheet distinguishes them.
    // An acknowledgement receipt prints as "ACK" (Sean, 2026-10-02: shortened, still red).
    const invoice = isAcknowledgementReceipt(r.invoice_number) ? 'ACK' : r.invoice_number ?? '';
    row.getCell(3).value = {
      richText: [
        { text: `${r.contact_name}  ` },
        { text: invoice, font: { color: { argb: RED }, bold: true } },
      ],
    };
    row.font = { size: 10 };
    moneyCells(row);
    return row;
  };

  /**
   * Total rows. `band` colours them (Sean, 2026-10-02): a subtotal on light blue, a GRAND
   * SUBTOTAL on red with white type, so the two kinds of total read apart at a glance.
   */
  const emitTotalRow = (
    label: string,
    t: Totals,
    opts: { strong?: boolean; band?: 'subtotal' | 'grand' } = {}
  ) => {
    const row = ws.addRow([label, null, null, null, t.rent, t.share, t.occupants, t.water, t.remitted, null, null]);
    row.font = { bold: true, size: 10, color: { argb: opts.band === 'grand' ? 'FFFFFFFF' : INK } };
    moneyCells(row);
    for (let col = 1; col <= 11; col++) {
      const c = row.getCell(col);
      c.border = {
        top: { style: opts.strong ? 'medium' : 'thin', color: { argb: opts.strong ? INK : RULE } },
      };
      if (opts.band) {
        c.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: opts.band === 'grand' ? 'FFC00000' : 'FFDDEBF7' },
        };
      }
    }
    return row;
  };

  for (const month of monthsPresent) {
    const rows = byMonth.get(month) ?? [];

    const monthRow = ws.addRow([`${MONTHS[month - 1]} ${year}`]);
    monthRow.font = { bold: true, size: 11, color: { argb: INK } };
    ws.mergeCells(monthRow.number, 1, monthRow.number, 11);

    const grand = zero();

    for (const cluster of CLUSTER_ORDER) {
      const inCluster = cluster.units
        .map((u) => rows.filter((r) => r.room_number.toUpperCase() === u.toUpperCase()))
        .flat();

      if (inCluster.length === 0) continue;

      const clusterTotal = zero();
      for (const r of inCluster) {
        emitUnitRow(r);
        add(clusterTotal, r);
      }
      merge(grand, clusterTotal);

      // The sheet gives Penthouse no subtotal - a single unit's row is its own total.
      if (cluster.subtotal) emitTotalRow(`${cluster.label} subtotal`, clusterTotal, { band: 'subtotal' });
    }

    /**
     * Any unit the documented order does not name, other than Linda's two.
     *
     * Money that reaches neither a cluster nor the Linda section used to vanish
     * from the sheet entirely. Understating her income in silence is the worst
     * of the available failures, so these are printed, labelled, and counted
     * into the grand subtotal - they are pooled income like any other unit, and
     * only their position on the page is unknown.
     */
    const placed = new Set(
      [...CLUSTER_ORDER.flatMap((c) => c.units), ...LINDA_UNITS].map((u) => u.toUpperCase())
    );
    const unplacedRows = rows.filter((r) => !placed.has(r.room_number.toUpperCase()));

    if (unplacedRows.length > 0) {
      const units = [...new Set(unplacedRows.map((r) => r.room_number.toUpperCase()))].sort();
      const warn = ws.addRow([
        `NOT IN THE DOCUMENTED UNIT ORDER — ${units.join(', ')}. ` +
          'Counted in the grand subtotal below, but placed here because ' +
          'docs/09_MONTHLY_INCOME_REPORT.md §2 does not say where they belong.',
      ]);
      warn.font = { bold: true, size: 9, italic: true, color: { argb: RED } };
      ws.mergeCells(warn.number, 1, warn.number, 11);

      const unplacedTotal = zero();
      for (const r of unplacedRows) {
        emitUnitRow(r);
        add(unplacedTotal, r);
      }
      emitTotalRow('Not in the documented order — subtotal', unplacedTotal, { band: 'subtotal' });
      merge(grand, unplacedTotal);
    }

    emitTotalRow('GRAND SUBTOTAL (excludes Linda)', grand, { strong: true, band: 'grand' });
    merge(yearToDate, grand);

    // --- Linda: fixed charges, remitted directly to Linda, never pooled above ---
    const lindaRows = LINDA_UNITS
      .map((u) => rows.filter((r) => r.room_number.toUpperCase() === u.toUpperCase()))
      .flat();

    if (lindaRows.length > 0) {
      const lindaHeader = ws.addRow(['LINDA — fixed charges, remitted directly to Linda']);
      lindaHeader.font = { bold: true, size: 10, italic: true, color: { argb: INK } };
      ws.mergeCells(lindaHeader.number, 1, lindaHeader.number, 11);

      const lindaTotal = zero();
      for (const r of lindaRows) {
        emitUnitRow(r);
        add(lindaTotal, r);
      }
      emitTotalRow('Linda total', lindaTotal, { band: 'subtotal' });
      merge(lindaYear, lindaTotal);
      // The "Linda fixed water charge (BR-040 ...)" and "Linda electricity (historical ...)" note
      // lines are gone (Sean, 2026-10-02: unnecessary text on the owner's sheet). Neither was ever
      // in the Linda total, so no figure above changes.
    }

    ws.addRow([]); // the blank row the layout requires between months
  }

  // --- the bottom-of-page figure, which OD-01 has not settled -----------------
  //
  // Excludes Linda, for the same reason every month's grand subtotal does: that
  // money is remitted directly to Linda and was never part of the pooled total.
  // Labelled explicitly, because a figure called "year to date" that quietly
  // omits a section is the kind of total someone reconciles against and cannot
  // make balance.
  /**
   * A year with nothing in it says so, and says nothing else.
   *
   * The order here used to be: the bold YEAR TO DATE row, then the OD-01 note,
   * then - at the very bottom - "No income was recorded for 2024." So a year with
   * no rows opened with a confident bold total reading zero across every column,
   * followed by a paragraph explaining that "each month carries its own grand
   * subtotal" when the sheet had no months on it.
   *
   * A total of zero is a claim that the year came to nothing. "We hold no rows
   * for this year" is a different statement, and it is the true one - the ledger
   * starts in 2024 and the year picker offers years either side of the data. The
   * two are indistinguishable once a zero is printed in a totals row, and this
   * one was printed in bold, above the sentence that would have corrected it.
   *
   * Nothing is totalled when there is nothing to total.
   */
  if (monthsPresent.length === 0) {
    const empty = ws.addRow([
      `No income was recorded for ${onlyMonth ? `${monthTitle(onlyMonth)} ${year}` : year}.`,
    ]);
    empty.font = { size: 10, italic: true };
    ws.mergeCells(empty.number, 1, empty.number, 11);
    return;
  }

  // One month: its block already carries its grand subtotal and Linda's lines.
  if (onlyMonth) return;

  const ytd = emitTotalRow(`YEAR TO DATE ${year} — excludes Linda`, yearToDate, { strong: true });
  ytd.font = { bold: true, size: 11, color: { argb: INK } };

  if (lindaYear.rent > 0 || lindaYear.remitted > 0) {
    const lytd = emitTotalRow(`Linda, year to date ${year} — remitted directly to Linda`, lindaYear);
    lytd.font = { bold: true, size: 10, italic: true, color: { argb: INK } };
  }

  // The year's Linda water/electricity note lines and the OD-01 explanation that followed are
  // gone too (Sean, 2026-10-02): working notes, not something the owner's sheet should say.
}
