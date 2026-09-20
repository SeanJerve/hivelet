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
import { propertyEndOfDay, propertyParts, isoDateParts } from '../utils/propertyClock.js';

/** A bill's money, rounded to centavos. */
export interface BillAmounts {
  rentAmount: number;
  waterAmount: number;
  totalAmount: number;
  /** How the water figure was arrived at, for the audit log and for support questions. */
  /**
   * Which unit this is, not which formula was used - every unit is now 200 a
   * head. `linda-fixed` is kept as the name because it is what marks a charge as
   * LINDA'S money, which is still recorded and remitted separately (BR-040).
   */
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
  /**
   * BR-040's FIXED WATER CHARGE IS RETIRED. It never existed.
   *
   * The rule said LF and LB are billed a fixed monthly amount - LF 400, LB 200 -
   * instead of the per-occupant rate, and the ledger agreed for 26 months.
   *
   * It agreed because of a COINCIDENCE. Across all 62 Linda rows the occupancy
   * never changed once: LB has always held 1 person and LF 2. So 1 x 200 = 200
   * and 2 x 200 = 400 - the "fixed" charges were the per-head figures for their
   * standing occupancy, and no row in her book could tell the two readings apart.
   *
   * The owner settled it on 2026-09-20, asked directly what happens if a third
   * person moves into LF:
   *
   *     "yes, water will be 600 since its 200 per head 200x3 is 600. LB will
   *      remain 200 since there is only 1 person in the unit and if ever another
   *      one moves in LB, it will still be charged 200 per head"
   *
   * So every unit on the property is 200 a head. There is no exception, and the
   * fixed charge would have been wrong the first time anybody moved in or out of
   * those two units - silently, because it would still have looked right.
   *
   * WHAT IS NOT RETIRED: Linda's money is still kept separate. That is a
   * question about WHERE the charge is recorded and who it is remitted to, not
   * about how much it is, and she did not change it. `linda_water_charge` and
   * migration 041's routing trigger stand.
   */
  const rate = await getWaterRatePerOccupant();
  const heads = Number.isFinite(occupants) && occupants >= 1 ? Math.floor(occupants) : 1;
  const isLinda = (await getLindaFixedWaterCharge(roomNumber)) !== null;
  return { amount: toCentavos(heads * rate), basis: isLinda ? 'linda-fixed' : 'per-occupant' };
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
  /**
   * THE PROPERTY'S CALENDAR, NOT THE SERVER'S. This function read
   * `getUTCFullYear/Month/Date` off `reference`, which defaults to `new Date()`
   * - so between midnight and 08:00 Manila it was working from YESTERDAY, and
   * yesterday can be last month.
   *
   * That is not a day out. It is a whole cycle out. Measured, not reasoned:
   *
   *   anniversary day 1, bill raised 07:30 Manila on 1 Oct 2026
   *       was  2026-09-01 .. 2026-09-30   due 2026-09-01
   *       now  2026-10-01 .. 2026-10-31   due 2026-10-01
   *
   *   anniversary day 15, bill raised 07:00 Manila on 15 Oct 2026
   *       was  2026-09-15 .. 2026-10-14
   *       now  2026-10-15 .. 2026-11-14
   *
   * Three things followed from it, all money:
   *
   *   1. The resident is billed for a period that has already ended.
   *   2. The bill is BORN OVERDUE. `isOverdue()` is correct - it uses
   *      `propertyEndOfDay` - so a due date of 1 September is already past when
   *      the bill is created on 1 October. They open the portal to a debt that
   *      was created seconds earlier and is marked late.
   *   3. **Migration 038's unique index does not catch the duplicate.** It is on
   *      `(tenant_profile_id, billing_period_start, bill_type)`. A tap at 07:30
   *      writes `2026-09-01` and a tap at 09:00 writes `2026-10-01` - different
   *      keys, so both insert. Two bills, one month, from one resident paying
   *      once before breakfast and once after.
   *
   * `propertyClock.ts` exists for exactly this and its own header names
   * `computeBillPeriod()` as a consumer of the anniversary column. The sweep
   * that converted seven stored dates never reached inside this function.
   *
   * `check:billing` could not have caught it: every assertion passes an explicit
   * reference built as `new Date(Date.UTC(...))`, which is 08:00 Manila - the
   * one hour of the day when the two calendars agree.
   *
   * The ANCHOR takes the same treatment. A date-only column parses to midnight
   * UTC and `getUTCDate()` is right for it, but both callers pass
   * `anniversary_date ?? new Date()`, and on that fallback the UTC reading
   * shifts the anchor day too.
   */
  const anchorDay = (() => {
    if (typeof anniversaryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(anniversaryDate)) {
      return isoDateParts(anniversaryDate).day;          // a DATE column, no instant involved
    }
    const d = anniversaryDate instanceof Date ? anniversaryDate : new Date(anniversaryDate);
    return Number.isNaN(d.getTime()) ? 1 : propertyParts(d).day;
  })();

  const refParts = propertyParts(reference);
  const year = refParts.year;
  const month = refParts.month - 1;   // propertyParts is 1-based; the arithmetic below is 0-based
  const day = refParts.day;

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
  // End of that day AT THE PROPERTY, not in UTC. Built as `T23:59:59.999Z`
  // this granted an unlegislated eight-hour grace: a bill due the 16th only
  // became overdue at 08:00 Manila on the 17th. See propertyEndOfDay().
  const cutoff = propertyEndOfDay(boundary);
  return asOf.getTime() > cutoff.getTime();
}


/**
 * The span a receipt covers, expressed as the tenancy's own cycle. BR-033.
 *
 * "Rent For" is supposed to derive from the stored anniversary date and the
 * current cycle, not be typed per entry. `computeBillPeriod()` already does that
 * for one cycle; this extends it to a receipt covering several months, which the
 * income ledger allows (`monthsCovered`, 1..60).
 *
 * The end is the day before the anniversary `monthsCovered` cycles later, with
 * the same month-length clamping - so three months from 31 January ends on
 * 30 April, not on an impossible 31 April that rolls into May.
 */
export async function computeRentPeriod(
  anniversaryDate: string | Date,
  datePaid: string | Date,
  monthsCovered = 1
): Promise<{ start: string; end: string }> {
  const first = await computeBillPeriod(anniversaryDate, new Date(datePaid));
  if (monthsCovered <= 1) {
    return { start: first.billingPeriodStart, end: first.billingPeriodEnd };
  }

  const anniversary = new Date(anniversaryDate);
  const anchorDay = Number.isNaN(anniversary.getTime()) ? 1 : anniversary.getUTCDate();
  const clampToMonth = (y: number, m: number, d: number) =>
    Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());

  const start = new Date(`${first.billingPeriodStart}T00:00:00Z`);
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth() + monthsCovered;
  const nextAnniversary = new Date(Date.UTC(y, m, clampToMonth(y, m, anchorDay)));

  return {
    start: first.billingPeriodStart,
    end: toIsoDate(new Date(nextAnniversary.getTime() - 86_400_000)),
  };
}
/**
 * One span per month, because that is how the owner's book records a receipt
 * that covers several.
 *
 * `computeRentPeriod` above returns a SINGLE span covering all the months, which
 * is what a bill wants. The ledger wants something different, and her 937 rows
 * say so: a receipt settling arrears appears as **one row per month** - `OR#4895`
 * across four rows, `OR#4896` across three - each carrying one month of rent and
 * one month of water. There is no row anywhere in that book holding several
 * months of rent.
 *
 * The day of the month is taken from the first span's start, which is the
 * tenancy's anniversary day (BR-033), and clamped to the length of each month
 * the same way `computeRentPeriod` clamps: a tenancy anchored on the 31st runs
 * 31 Jan - 27 Feb, then 28 Feb - 30 Mar. Without the clamp, "31 February"
 * normalises forward into March and every later span slides with it.
 *
 * Pure, so it can be exercised without a database - `check:billing` reaches it.
 */
export function monthlySpansFrom(
  startIso: string,
  monthsCovered = 1
): { start: string; end: string; year: number; month: number }[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso)) {
    throw new Error(`monthlySpansFrom needs a YYYY-MM-DD start, received "${startIso}"`);
  }

  const [baseYear, baseMonthOneBased, anchorDay] = startIso.split('-').map(Number);
  const baseMonth = baseMonthOneBased - 1;
  const clampToMonth = (y: number, m: number, d: number) =>
    Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());

  const count = Math.max(1, Math.floor(Number(monthsCovered) || 1));
  const spans: { start: string; end: string; year: number; month: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    const startMonth = baseMonth + i;
    const start = new Date(
      Date.UTC(baseYear, startMonth, clampToMonth(baseYear, startMonth, anchorDay))
    );
    const nextMonth = baseMonth + i + 1;
    const next = new Date(
      Date.UTC(baseYear, nextMonth, clampToMonth(baseYear, nextMonth, anchorDay))
    );

    spans.push({
      start: toIsoDate(start),
      end: toIsoDate(new Date(next.getTime() - 86_400_000)),
      /**
       * The month the rent is FOR, not the month it arrived.
       *
       * Asked of the live ledger rather than assumed. Where `year`/`month`
       * disagrees with the payment date - the only rows that carry any
       * information about which rule is in force - **216 follow the rent period
       * and 50 follow the date paid.** So her book files a receipt under the
       * month it covers, which is what makes arrears land in the month they
       * belong to instead of the month the cash came in.
       */
      year: start.getUTCFullYear(),
      month: start.getUTCMonth() + 1,
    });
  }

  return spans;
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

/**
 * Did this bill insert lose a race to an identical one?
 *
 * A bill is raised ON DEMAND by two paths - `POST /tenant/payments/checkout`
 * and the Adyen notification handler - and each reads the tenant's bills, finds
 * nothing unpaid, and inserts. `supabase-js` cannot open a transaction, so the
 * check and the write are not atomic and two requests that interleave both
 * insert. A resident who double-taps Pay would get two bills for one month.
 *
 * Migration 038 puts a unique index on
 * `(tenant_profile_id, billing_period_start, bill_type)` behind that, which is
 * the only guard that holds when the check cannot be. An index on its own turns
 * the race into a 500, so both call sites use this to recognise the collision
 * and re-read the bill the other request just created - which is the honest
 * outcome: the tenant wanted a bill for this period, and there is one.
 *
 * Matched on the index NAME, not on 23505 alone. Any other unique violation on
 * `bills` is a different bug and must not be swallowed as "someone beat us to
 * it". Same reasoning, and same shape, as `receiptAlreadyRecorded()` in
 * `routes/admin.ts` for migration 033.
 */
export function billAlreadyRaised(err: { code?: string; message?: string } | null): boolean {
  return (
    err?.code === '23505' &&
    String(err?.message ?? '').includes('idx_one_bill_per_tenant_per_period')
  );
}
