/**
 * @file services/billingService.ts
 * @description Bill arithmetic and period derivation, in one place.
 * @businessRules  BR-010 (due date), BR-012 (grace), BR-013 (full payment), BR-014 (water fee),
 *                 BR-033 (rent period derivation), BR-040 (Linda fixed billing)
 *
 * WHY THIS EXISTS
 * ---------------
 * Bill totals were computed inline in three route handlers with the water rate hardcoded as
 * `occupants * 200` (defect 2). The same expression appeared at `admin.ts:910`, `:1103`,
 * `:1243` and `tenant.ts:440`, so changing the rate meant finding four places and a deploy.
 *
 * Everything here is a pure function over values the caller has already fetched, except
 * `computeWaterFee`, which reads the rate from `settingsService`. Nothing in this file writes
 * to the database - that keeps it trivially testable and keeps the write path in one place
 * where a transaction can wrap it.
 */
import {
  getWaterRatePerOccupant,
  getGracePeriodDays,
  getLindaFixedWaterCharge
} from './settingsService.js';

/** A bill's money, rounded to centavos. */
export interface BillAmounts {
  rentAmount: number;
  waterAmount: number;
  totalAmount: number;
  /** How the water figure was arrived at, for the audit log and for support questions. */
  waterBasis: 'per-occupant' | 'linda-fixed';
}

/** The span a bill covers, and when it is payable. */
export interface BillPeriod {
  billingPeriodStart: string; // YYYY-MM-DD
  billingPeriodEnd: string;   // YYYY-MM-DD
  dueDate: string;            // YYYY-MM-DD
  gracePeriodEndDate: string; // YYYY-MM-DD
}

/** Rounds to two decimal places without floating-point drift on ordinary money values. */
export function toCentavos(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

/**
 * Water charged for one billing period.
 *
 * BR-014: ordinarily `occupants x water_rate_per_occupant`, with the rate read from
 * `system_settings` rather than hardcoded.
 *
 * BR-040: the two Linda units are on a fixed monthly water charge instead (LF P400,
 * LB P200), which does not vary with headcount. Both figures are corroborated by 31 months
 * of ledger data.
 *
 * @param roomNumber the unit's natural key, e.g. `2c` or `LF`
 * @param occupants  active headcount; values below 1 are treated as 1, since a let unit has
 *                   at least one occupant and a zero here would silently bill no water
 */
export async function computeWaterFee(
  roomNumber: string,
  occupants: number
): Promise<{ amount: number; basis: BillAmounts['waterBasis'] }> {
  const fixed = await getLindaFixedWaterCharge(roomNumber);
  if (fixed !== null) {
    return { amount: toCentavos(fixed), basis: 'linda-fixed' };
  }

  const rate = await getWaterRatePerOccupant();
  const heads = Number.isFinite(occupants) && occupants >= 1 ? Math.floor(occupants) : 1;
  return { amount: toCentavos(heads * rate), basis: 'per-occupant' };
}

/**
 * The money on a bill. Rent is never prorated - a tenant leaving mid-month owes the whole
 * month and nothing is refunded (OD-03).
 */
export async function computeBillAmounts(params: {
  roomNumber: string;
  currentPrice: number;
  occupants: number;
}): Promise<BillAmounts> {
  const rentAmount = toCentavos(Number(params.currentPrice) || 0);
  const water = await computeWaterFee(params.roomNumber, params.occupants);

  return {
    rentAmount,
    waterAmount: water.amount,
    totalAmount: toCentavos(rentAmount + water.amount),
    waterBasis: water.basis
  };
}

/**
 * The period a bill covers and when it falls due.
 *
 * BR-033: the cycle runs from the tenancy's anniversary day to the day before the next
 * anniversary - so a tenant whose anniversary is the 15th is billed the 15th to the 14th,
 * not the 1st to the 31st. This is why `room_assignments.anniversary_date` exists.
 *
 * BR-012 / OD-16: **there is no grace period.** `gracePeriodEndDate` therefore equals
 * `dueDate`. The value is still read from settings rather than pinned at zero in code, so
 * that granting a grace window later is a settings change rather than a deploy.
 *
 * @param anniversaryDate the tenancy's anniversary, any date - only its day-of-month is used
 * @param reference       the date the bill is being raised for; defaults to now
 */
export async function computeBillPeriod(
  anniversaryDate: string | Date,
  reference: Date = new Date()
): Promise<BillPeriod> {
  const anniversary = new Date(anniversaryDate);
  const anchorDay = Number.isNaN(anniversary.getTime()) ? 1 : anniversary.getUTCDate();

  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const day = reference.getUTCDate();

  // The cycle that contains `reference`: it starts on the anchor day of this month if we
  // have reached it, otherwise on the anchor day of last month.
  const startMonthOffset = day >= anchorDay ? 0 : -1;

  // Clamp the anchor to the length of the target month so the 31st does not roll into the
  // next month on a 30-day month. Day 0 of month n+1 is the last day of month n.
  const clampToMonth = (y: number, m: number, d: number) =>
    Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());

  const startY = year;
  const startM = month + startMonthOffset;
  const start = new Date(Date.UTC(startY, startM, clampToMonth(startY, startM, anchorDay)));

  // The period ends the day before the next anniversary.
  const nextM = startM + 1;
  const next = new Date(Date.UTC(startY, nextM, clampToMonth(startY, nextM, anchorDay)));
  const end = new Date(next.getTime() - 86_400_000);

  // Collection happens in the closing days of a month for the month ahead (OD-03), so the
  // bill is due on the day the period opens.
  const dueDate = start;

  const graceDays = await getGracePeriodDays();
  const graceEnd = graceDays > 0
    ? new Date(dueDate.getTime() + graceDays * 86_400_000)
    : dueDate;

  return {
    billingPeriodStart: toIsoDate(start),
    billingPeriodEnd: toIsoDate(end),
    dueDate: toIsoDate(dueDate),
    gracePeriodEndDate: toIsoDate(graceEnd)
  };
}

/**
 * Whether a bill is past due as at `asOf`.
 *
 * With no grace period this is simply "the due date has passed and it is not settled".
 * BR-011. Kept as a function rather than a comparison at each call site so that if a grace
 * window is ever granted, the definition of overdue changes in exactly one place.
 */
export async function isOverdue(
  bill: { due_date: string; grace_period_end_date?: string | null; status: string },
  asOf: Date = new Date()
): Promise<boolean> {
  if (bill.status === 'Paid') return false;

  // A bill carries the terms it was issued under (BR-003), so prefer its own stored window
  // over today's policy when one is present.
  const boundary = bill.grace_period_end_date ?? bill.due_date;
  const cutoff = new Date(`${boundary}T23:59:59.999Z`);
  return asOf.getTime() > cutoff.getTime();
}

/* ========================================================================== *
 * BR-013 — allocating a receipt against what a tenant actually owes
 * ========================================================================== */

/**
 * Half a centavo.
 *
 * Money is NUMERIC in PostgreSQL but arrives in JavaScript as a float, so a
 * chain of subtractions can leave a residue like 4.5e-13. `payments_amount_check`
 * is `CHECK (amount > 0)`, which means such a residue is a perfectly *legal*
 * payment row - it would be written, and it would be junk. Anything at or below
 * this is treated as settled.
 */
export const MONEY_DUST = 0.005;

export interface BillForAllocation {
  id: string;
  total_amount: number | string;
  status: string;
  /** Sum of every verified payment already linked to this bill. */
  paidSoFar: number;
}

export interface AllocationStep {
  /** `null` for the advance - money with no remaining debt to attach to. */
  billId: string | null;
  amount: number;
  /** The status the bill carries once this step is written. `null` for an advance. */
  billStatus: 'Paid' | 'Partially Paid' | null;
}

export interface AllocationPlan {
  /** Payment rows to write, in order. */
  steps: AllocationStep[];
  /** Bills already covered by earlier payments whose stored status is stale. */
  corrections: string[];
  /** The portion with no debt left to attach to. Zero when fully consumed. */
  advance: number;
}

/**
 * Decides how one receipt is spread across a tenant's open bills.
 *
 * WHAT THIS REPLACED
 * ------------------
 * The settlement loop used to pay only the bills it could cover in FULL. The
 * first bill it could not cover broke the loop, and the leftover was written
 * with `bill_id = NULL`.
 *
 * That stranded the money. Nothing anywhere summed those unlinked rows back into
 * a later settlement, so a tenant who paid 3,000 against a 5,000 bill had the
 * 3,000 recorded, the bill still reading its full 5,000, and nothing connecting
 * the two. The next month it happened again. The ledger was right about the cash
 * and wrong about the debt, permanently, and nothing on screen said so.
 *
 * `'Partially Paid'` was in `bill_status_type` the whole time - written by
 * nothing, read by nothing. BR-013 calls partial payment "an explicitly recorded
 * exception"; there was no recording.
 *
 * WHAT IT DOES
 * ------------
 * Oldest bill first, each settled against its OUTSTANDING balance rather than
 * its issued total. A bill that is not cleared is marked 'Partially Paid'. Money
 * becomes an advance only once every open bill is settled, which is the one case
 * where an unlinked payment row is the right record.
 *
 * Oldest-first, and it does NOT skip ahead: a receipt too small for the oldest
 * debt pays down that debt rather than clearing a smaller newer one. Reordering
 * would settle newer bills while an older one aged, which is the opposite of
 * what a ledger should do.
 *
 * Pure arithmetic - no I/O, so the caller owns the reads, the writes and their
 * failure handling. That is also what makes it directly testable, which for the
 * one function in this system that decides where money goes is the point.
 */
export function allocateReceipt(
  receiptAmount: number,
  bills: BillForAllocation[]
): AllocationPlan {
  let remaining = toCentavos(receiptAmount);
  const steps: AllocationStep[] = [];
  const corrections: string[] = [];

  for (const bill of bills) {
    if (remaining <= MONEY_DUST) break;

    const outstanding = toCentavos(Number(bill.total_amount) - toCentavos(bill.paidSoFar));

    // Already covered by earlier payments but never re-statused. Correct it
    // rather than spending this receipt on a debt that is gone.
    if (outstanding <= MONEY_DUST) {
      if (bill.status !== 'Paid') corrections.push(bill.id);
      continue;
    }

    const applied = toCentavos(Math.min(remaining, outstanding));
    steps.push({
      billId: bill.id,
      amount: applied,
      billStatus: applied >= outstanding - MONEY_DUST ? 'Paid' : 'Partially Paid',
    });
    remaining = toCentavos(remaining - applied);
  }

  const advance = remaining > MONEY_DUST ? remaining : 0;
  if (advance > 0) steps.push({ billId: null, amount: advance, billStatus: null });

  return { steps, corrections, advance };
}
