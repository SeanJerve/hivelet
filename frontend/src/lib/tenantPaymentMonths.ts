/**
 * @file lib/tenantPaymentMonths.ts
 * @description A tenant's own rent, month by month: which months her recorded
 *   receipts cover, which are due, and which have nothing recorded.
 *
 * Pure: the payments screen reads `/tenant/my-income-records` and
 * `/tenant/my-standing` (both already scoped to the signed-in tenant) and hands
 * them here. Nothing is fetched or written.
 *
 * WHAT COUNTS AS PAID
 * Receipts are the record. Only a receipt marked Verified counts, which is the
 * same rule `readStanding` uses for "paid up to". A GCash payment through Adyen
 * gets its receipt when the landlady verifies it, so until then it is not paid
 * here either - it is listed separately as waiting. Voided receipts never reach
 * this: the endpoint already leaves them out.
 *
 * WHAT COUNTS AS DUE
 * Only the periods `computeStanding` says are uncovered, at the amount the
 * checkout would charge (`perPeriod.totalAmount`). A month before her latest
 * receipt with no receipt of its own is shown as "nothing recorded", never as
 * owed: the system does not claim that, and neither does this.
 *
 * WHICH MONTH A PERIOD BELONGS TO
 * The month its rent period starts in. Periods run from a fixed day each month,
 * so each calendar month holds exactly one period start. A receipt covering
 * several periods is spread evenly across them, and the list says so.
 */

export interface ReceiptInput {
  id: string | number;
  rent_period_start: string | null;
  rent_period_end: string | null;
  date_paid: string | null;
  remitted_amount: number | string | null;
  gbg_fee: number | string | null;
  verification_status: string | null;
}

export interface StandingInput {
  paidThrough: string | null;
  owedPeriods: { start: string; end: string; dueDate: string }[];
  perPeriod: { totalAmount: number };
}

export type MonthState = 'paid' | 'overdue' | 'due-today' | 'due-soon' | 'nothing' | 'ahead';

export interface MonthReceipt {
  id: string | number;
  periodStart: string | null;
  periodEnd: string | null;
  datePaid: string | null;
  /** The whole receipt, garbage fee included (BR-037). */
  amount: number;
  /** How many months it covers; the month's share is `amount / monthsCovered`. */
  monthsCovered: number;
}

export interface PaymentMonth {
  /** `YYYY-MM`. */
  key: string;
  year: number;
  /** 1 to 12. */
  month: number;
  state: MonthState;
  /** This month's share of verified receipts. */
  paid: number;
  /** What is owed for this month's period, when one is owed. */
  due: number;
  duePeriod: { start: string; end: string; dueDate: string } | null;
  receipts: MonthReceipt[];
}

const MAX_MONTHS_SHOWN = 12;
const MAX_MONTHS_PER_RECEIPT = 24;

const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
const isIsoDate = (v: string | null | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}/.test(v);
const toKey = (idx: number) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;

function daysIn(year: number, month1: number) {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

/**
 * Whole rent periods from `start` to `end` inclusive. "13 Jun to 12 Aug" is 2.
 * A period clamped to a short month ("31 Jan to 27 Feb") still counts as one,
 * and anything shorter than a month counts as one rather than as none.
 */
export function periodsCovered(start: string, end: string): number {
  const [y1, m1, d1] = start.slice(0, 10).split('-').map(Number) as [number, number, number];
  const [ey, em, ed] = end.slice(0, 10).split('-').map(Number) as [number, number, number];
  const after = new Date(Date.UTC(ey, em - 1, ed + 1));
  const y2 = after.getUTCFullYear();
  const m2 = after.getUTCMonth() + 1;
  const d2 = after.getUTCDate();
  let n = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < Math.min(d1, daysIn(y2, m2))) n -= 1;
  return Math.min(MAX_MONTHS_PER_RECEIPT, Math.max(1, n));
}

const isVerified = (status: string | null) => String(status ?? '').trim().toLowerCase() === 'verified';

export function buildPaymentMonths(
  receipts: ReceiptInput[],
  standing: StandingInput | null,
  today: string
): PaymentMonth[] {
  const paid = new Map<number, number>();
  const receiptsByMonth = new Map<number, MonthReceipt[]>();
  const owed = new Map<number, { start: string; end: string; dueDate: string }>();

  for (const r of receipts) {
    if (!isVerified(r.verification_status)) continue;
    const amount = (Number(r.remitted_amount) || 0) + (Number(r.gbg_fee) || 0);
    const anchor = isIsoDate(r.rent_period_start) ? r.rent_period_start : isIsoDate(r.date_paid) ? r.date_paid : null;
    if (!anchor) continue;
    const n =
      isIsoDate(r.rent_period_start) && isIsoDate(r.rent_period_end)
        ? periodsCovered(r.rent_period_start, r.rent_period_end)
        : 1;
    const entry: MonthReceipt = {
      id: r.id,
      periodStart: isIsoDate(r.rent_period_start) ? r.rent_period_start.slice(0, 10) : null,
      periodEnd: isIsoDate(r.rent_period_end) ? r.rent_period_end.slice(0, 10) : null,
      datePaid: isIsoDate(r.date_paid) ? r.date_paid.slice(0, 10) : null,
      amount,
      monthsCovered: n,
    };
    const first = monthIndex(anchor);
    for (let i = 0; i < n; i += 1) {
      paid.set(first + i, (paid.get(first + i) ?? 0) + amount / n);
      receiptsByMonth.set(first + i, [...(receiptsByMonth.get(first + i) ?? []), entry]);
    }
  }

  for (const p of standing?.owedPeriods ?? []) {
    if (isIsoDate(p.start) && !owed.has(monthIndex(p.start))) owed.set(monthIndex(p.start), p);
  }

  const known = [...paid.keys(), ...owed.keys()];
  if (known.length === 0) return [];

  const todayIdx = monthIndex(today);
  const last = Math.max(todayIdx, ...known);
  const first = Math.max(Math.min(...known), last - (MAX_MONTHS_SHOWN - 1));

  const months: PaymentMonth[] = [];
  for (let idx = first; idx <= last; idx += 1) {
    const period = owed.get(idx) ?? null;
    const paidHere = Math.round((paid.get(idx) ?? 0) * 100) / 100;
    let state: MonthState;
    if (period) {
      state = period.dueDate < today ? 'overdue' : period.dueDate === today ? 'due-today' : 'due-soon';
    } else if (paidHere > 0) {
      state = 'paid';
    } else {
      state = idx > todayIdx ? 'ahead' : 'nothing';
    }
    months.push({
      key: toKey(idx),
      year: Math.floor(idx / 12),
      month: (idx % 12) + 1,
      state,
      paid: paidHere,
      due: period ? standing?.perPeriod.totalAmount ?? 0 : 0,
      duePeriod: period,
      receipts: receiptsByMonth.get(idx) ?? [],
    });
  }
  return months;
}
