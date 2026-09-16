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

/**
 * The canonical unit order, from `docs/09_MONTHLY_INCOME_REPORT.md` §2.
 *
 * Not read from the database, and not sorted alphabetically, because neither
 * gives the right answer: the sheet runs `B1F, B2F, B2B` — front before back on
 * each floor — and an alphabetical sort produces `B1F, B2B, B2F`. The order is a
 * property of the owner's sheet, so it is written down here and checked against
 * the database rather than derived from it.
 */
const CLUSTER_ORDER: { code: string; label: string; units: string[]; subtotal: boolean }[] = [
  {
    code: 'BH',
    label: 'BH (Main Rooms)',
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
  invoice_number: string;
  rent_period_start: string;
  rent_period_end: string;
  rent_amount: number;
  fifty_percent_share: number | null;
  occupants: number;
  water_payment: number;
  gbg_fee: number;
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
  gbg: number;
  remitted: number;
}
const zero = (): Totals => ({ rent: 0, share: 0, occupants: 0, water: 0, gbg: 0, remitted: 0 });
const add = (t: Totals, r: LedgerRow): void => {
  t.rent += n(r.rent_amount);
  t.share += n(r.fifty_percent_share);
  t.occupants += n(r.occupants);
  t.water += n(r.water_payment);
  t.gbg += n(r.gbg_fee);
  t.remitted += n(r.remitted_amount);
};
const merge = (into: Totals, from: Totals): void => {
  into.rent += from.rent;
  into.share += from.share;
  into.occupants += from.occupants;
  into.water += from.water;
  into.gbg += from.gbg;
  into.remitted += from.remitted;
};

/**
 * Builds the workbook for one year.
 *
 * Voided rows are excluded — they are preserved in the database under BR-003,
 * but a voided receipt is not income and must not reach a total.
 */
export async function buildIncomeReportWorkbook(year: number): Promise<ExcelJS.Workbook> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw ApiError.validation('A four-digit year is required.', { year: ['must be between 2000 and 2100'] });
  }

  const { data, error } = await db
    .from('monthly_income_records')
    .select(
      'month, date_paid, contact_name, invoice_number, rent_period_start, rent_period_end, ' +
        'rent_amount, fifty_percent_share, occupants, water_payment, gbg_fee, remitted_amount, ' +
        'linda_electricity_charge, linda_water_charge, room_id, tenant_profile_id, ' +
        'rooms:room_id (room_number)'
    )
    .eq('year', year)
    .is('voided_at', null)
    .order('month', { ascending: true })
    .order('date_paid', { ascending: true });

  if (error) throw ApiError.internal(`The income ledger could not be read: ${error.message}`);

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

  const byMonth = new Map<number, LedgerRow[]>();
  for (const raw of (data ?? []) as unknown as Record<string, any>[]) {
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
      gbg_fee: n(raw.gbg_fee),
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
    const list = byMonth.get(Number(raw.month)) ?? [];
    list.push(row);
    byMonth.set(Number(raw.month), list);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hivelet';
  wb.created = new Date();
  const ws = wb.addWorksheet(`Income ${year}`, {
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
    { width: 9 },  // 9  GBG
    { width: 14 }, // 10 Remitted
    { width: 12 }, // 11 Anniv Date
    { width: 12 }, // 12 Deposit
  ];

  const title = ws.addRow([`HIVELET — MONTHLY INCOME REPORT — ${year}`]);
  title.font = { bold: true, size: 13, color: { argb: INK } };
  ws.mergeCells(title.number, 1, title.number, 12);

  const headerRow = ws.addRow([
    'Rm #', 'Date Paid', 'Contact + Invoice #', 'Rent For', 'Rent Amount', '50% Share',
    'Occupants', 'Water Payment', 'GBG', 'Remitted Amount', 'Anniv Date', 'Deposit',
  ]);
  headerRow.font = { bold: true, size: 10, color: { argb: INK } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.eachCell((c) => {
    c.border = { bottom: { style: 'medium', color: { argb: INK } } };
  });

  const yearToDate = zero();
  const lindaYear = zero();
  const monthsPresent = [...byMonth.keys()].sort((a, b) => a - b);

  const moneyCells = (r: ExcelJS.Row) => {
    for (const i of [5, 6, 8, 9, 10, 12]) r.getCell(i).numFmt = MONEY_FMT;
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
      r.gbg_fee || null,
      r.remitted_amount ?? r.rent_amount + r.water_payment,
      annivFmt(r.anniversary_date),
      r.deposit_amount,
    ]);
    // The invoice number is red so it reads apart from the contact name, which is
    // how the owner's own sheet distinguishes them.
    row.getCell(3).value = {
      richText: [
        { text: `${r.contact_name}  ` },
        { text: r.invoice_number, font: { color: { argb: RED }, bold: true } },
      ],
    };
    row.font = { size: 10 };
    moneyCells(row);
    return row;
  };

  const emitTotalRow = (label: string, t: Totals, opts: { strong?: boolean } = {}) => {
    const row = ws.addRow([label, null, null, null, t.rent, t.share, t.occupants, t.water, t.gbg, t.remitted, null, null]);
    row.font = { bold: true, size: 10, color: { argb: INK } };
    moneyCells(row);
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = {
        top: { style: opts.strong ? 'medium' : 'thin', color: { argb: opts.strong ? INK : RULE } },
      };
    });
    return row;
  };

  for (const month of monthsPresent) {
    const rows = byMonth.get(month) ?? [];

    const monthRow = ws.addRow([`${MONTHS[month - 1]} ${year}`]);
    monthRow.font = { bold: true, size: 11, color: { argb: INK } };
    ws.mergeCells(monthRow.number, 1, monthRow.number, 12);

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
      if (cluster.subtotal) emitTotalRow(`${cluster.label} subtotal`, clusterTotal);
    }

    emitTotalRow('GRAND SUBTOTAL (excludes Linda)', grand, { strong: true });
    merge(yearToDate, grand);

    // --- Linda: fixed charges, remitted directly to Linda, never pooled above ---
    const lindaRows = LINDA_UNITS
      .map((u) => rows.filter((r) => r.room_number.toUpperCase() === u.toUpperCase()))
      .flat();

    if (lindaRows.length > 0) {
      const lindaHeader = ws.addRow(['LINDA — fixed charges, remitted directly to Linda']);
      lindaHeader.font = { bold: true, size: 10, italic: true, color: { argb: INK } };
      ws.mergeCells(lindaHeader.number, 1, lindaHeader.number, 12);

      const lindaTotal = zero();
      let lindaElectricity = 0;
      let lindaWater = 0;
      for (const r of lindaRows) {
        emitUnitRow(r);
        add(lindaTotal, r);
        lindaElectricity += n(r.linda_electricity_charge);
        lindaWater += n(r.linda_water_charge);
      }
      emitTotalRow('Linda total', lindaTotal);
      merge(lindaYear, lindaTotal);

      /**
       * The fixed water charge, shown as its own line rather than folded into
       * the Linda total.
       *
       * `remitted_amount` is a GENERATED column - `rent_amount + water_payment` -
       * and for these units `water_payment` is 0. Adding the fixed charge into
       * the total would make the total disagree with the column the database
       * itself computes, which is a worse error than the one being fixed. A
       * separate labelled line makes the money visible and keeps the arithmetic
       * honest. Unlike the electricity line below, this charge is CURRENT: it is
       * BR-040's live model, read from `system_settings` by
       * `getLindaFixedWaterCharge()`.
       */
      if (lindaWater > 0) {
        const w = ws.addRow([
          'Linda fixed water charge (BR-040, remitted directly to Linda)',
          null, null, null, null, null, null, null, null, lindaWater, null, null,
        ]);
        w.font = { size: 9, italic: true, color: { argb: INK } };
        w.getCell(10).numFmt = MONEY_FMT;
      }

      if (lindaElectricity > 0) {
        // Historical only. Migration 017 retired the flat charge; these figures are
        // real money already collected and are shown rather than dropped.
        const e = ws.addRow([
          'Linda electricity (historical, retired 2026-09-13)',
          null, null, null, null, null, null, null, null, lindaElectricity, null, null,
        ]);
        e.font = { size: 9, italic: true, color: { argb: INK } };
        e.getCell(10).numFmt = MONEY_FMT;
      }
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
  const ytd = emitTotalRow(`YEAR TO DATE ${year} — excludes Linda`, yearToDate, { strong: true });
  ytd.font = { bold: true, size: 11, color: { argb: INK } };

  if (lindaYear.rent > 0 || lindaYear.remitted > 0) {
    const lytd = emitTotalRow(`Linda, year to date ${year} — remitted directly to Linda`, lindaYear);
    lytd.font = { bold: true, size: 10, italic: true, color: { argb: INK } };
  }

  const note = ws.addRow([
    'Both figures are shown deliberately: each month carries its own grand subtotal, and the ' +
      'line above totals the year. Which of the two belongs at the bottom of the page is OD-01, ' +
      'still open with the owner — so neither is presented as the total.',
  ]);
  note.font = { size: 9, italic: true, color: { argb: INK } };
  ws.mergeCells(note.number, 1, note.number, 12);
  note.alignment = { wrapText: true, vertical: 'top' };

  if (monthsPresent.length === 0) {
    const empty = ws.addRow([`No income was recorded for ${year}.`]);
    empty.font = { size: 10, italic: true };
    ws.mergeCells(empty.number, 1, empty.number, 12);
  }

  return wb;
}
