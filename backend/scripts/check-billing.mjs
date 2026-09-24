/**
 * Exercises the compiled billingService against the LIVE system_settings.
 *
 * Run with `npm run check:billing` from `backend/`. It builds first, so it always tests the
 * current source. It reads settings from the real database and writes nothing.
 *
 * These assertions encode decisions, not just arithmetic:
 *   - the cycle runs on the tenancy anniversary day, not the calendar month (BR-033)
 *   - a 31st anniversary clamps to the last day of a short month rather than rolling over
 *   - there is no grace period, so grace always equals the due date (OD-16)
 *   - the water rate comes from settings; the two Linda units are fixed (BR-014, BR-040)
 *   - a bill already issued keeps the window it was issued under (BR-003)
 *   - a partial payment attaches to the bill it pays down and is recorded
 *     as 'Partially Paid' rather than left floating (BR-013)
 */
import { computeBillPeriod, computeWaterFee, computeBillAmounts, isOverdue, allocateReceipt, computeRentPeriod, computeStanding }
  from '../dist/services/billingService.js';

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}\n        got ${a}${ok ? '' : `\n        want ${e}`}`);
}

// --- period derivation (BR-033): anniversary day drives the cycle ---
const p1 = await computeBillPeriod('2022-05-13', new Date(Date.UTC(2026, 8, 20))); // 20 Sep
check('anniversary 13th, ref 20 Sep -> 13 Sep..12 Oct', p1,
  { billingPeriodStart: '2026-09-13', billingPeriodEnd: '2026-10-12',
    dueDate: '2026-09-13', gracePeriodEndDate: '2026-09-13' });

const p2 = await computeBillPeriod('2022-05-13', new Date(Date.UTC(2026, 8, 5))); // 5 Sep, before anchor
check('anniversary 13th, ref 5 Sep -> 13 Aug..12 Sep', p2,
  { billingPeriodStart: '2026-08-13', billingPeriodEnd: '2026-09-12',
    dueDate: '2026-08-13', gracePeriodEndDate: '2026-08-13' });

// month-length clamping: 31st anniversary must not roll into the next month
const p3 = await computeBillPeriod('2021-01-31', new Date(Date.UTC(2026, 1, 15))); // Feb
check('anniversary 31st, ref 15 Feb -> 31 Jan..27 Feb (2026 not a leap year)', p3,
  { billingPeriodStart: '2026-01-31', billingPeriodEnd: '2026-02-27',
    dueDate: '2026-01-31', gracePeriodEndDate: '2026-01-31' });

// year boundary
const p4 = await computeBillPeriod('2020-03-10', new Date(Date.UTC(2026, 0, 3))); // 3 Jan
check('anniversary 10th, ref 3 Jan -> 10 Dec..9 Jan', p4,
  { billingPeriodStart: '2025-12-10', billingPeriodEnd: '2026-01-09',
    dueDate: '2025-12-10', gracePeriodEndDate: '2025-12-10' });

/**
 * THE HOUR OF THE DAY MUST NOT CHANGE THE CYCLE.
 *
 * Every assertion above builds its reference as `new Date(Date.UTC(...))`, which
 * is midnight UTC - 08:00 Manila. That is the ONE HOUR of the day when the two
 * calendars agree, so this suite was green while `computeBillPeriod` read UTC
 * parts off a UTC+8 property and produced the wrong MONTH for anything raised
 * before breakfast:
 *
 *     anniversary day 1, raised 07:30 Manila on 1 Oct 2026
 *         gave  2026-09-01 .. 2026-09-30, due 2026-09-01
 *
 * A bill for a period that has already ended, born overdue - and with a
 * different `billing_period_start` it slips past migration 038's unique index,
 * so the same resident paying once before breakfast and once after gets TWO
 * bills for one month.
 *
 * These four instants are the same property day, 1 Oct 2026, either side of the
 * UTC boundary. They must all produce the same cycle.
 */
const MANILA_1_OCT = [
  ['00:30 Manila', Date.UTC(2026, 8, 30, 16, 30)],
  ['07:30 Manila', Date.UTC(2026, 8, 30, 23, 30)],
  ['09:00 Manila', Date.UTC(2026, 9, 1, 1, 0)],
  ['23:00 Manila', Date.UTC(2026, 9, 1, 15, 0)],
];

for (const [label, ms] of MANILA_1_OCT) {
  const p = await computeBillPeriod('2026-07-01', new Date(ms));
  check(`anniversary 1st, 1 Oct ${label} -> October, whatever the hour`, p.billingPeriodStart, '2026-10-01');
}

// The same, on an anchor where the boundary crosses the anniversary itself:
// 15 Oct at 07:00 Manila is 14 Oct in UTC, which used to bill September.
const pTz = await computeBillPeriod('2026-07-15', new Date(Date.UTC(2026, 9, 14, 23, 0)));
check('anniversary 15th, 15 Oct 07:00 Manila -> 15 Oct..14 Nov', pTz.billingPeriodStart, '2026-10-15');

// --- grace is zero everywhere (OD-16) ---
check('grace equals due date', p1.gracePeriodEndDate === p1.dueDate, true);

// --- water fee (BR-014 / BR-040) ---
check('standard unit, 3 occupants -> 600 per-occupant', await computeWaterFee('2c', 3),
  { amount: 600, basis: 'per-occupant' });
/**
 * BR-040's FIXED WATER CHARGE IS RETIRED - and these assertions used to encode it.
 *
 * They read `computeWaterFee('LF', 5) -> 400`: five people, still 400, because
 * the rule said a fixed charge. The ledger agreed for 26 months, and it agreed
 * by coincidence - across all 62 Linda rows the occupancy never changed once, so
 * LB's 1 x 200 and LF's 2 x 200 were indistinguishable from a fixed amount.
 *
 * The owner settled it on 2026-09-20, asked what happens if a third person moves
 * into LF: "yes, water will be 600 since its 200 per head 200x3 is 600."
 *
 * The two cases that matter are the ones her old occupancy could never produce.
 */
check('LF with 3 people -> 600, the case she settled',
  await computeWaterFee('LF', 3), { amount: 600, basis: 'linda-fixed' });
check('LB with 2 people -> 400, not the old fixed 200',
  await computeWaterFee('LB', 2), { amount: 400, basis: 'linda-fixed' });
check('LF at its standing 2 people is still 400',
  await computeWaterFee('LF', 2), { amount: 400, basis: 'linda-fixed' });
check('LB at its standing 1 person is still 200',
  await computeWaterFee('LB', 1), { amount: 200, basis: 'linda-fixed' });
// The basis still says linda-fixed: it marks WHOSE money this is, which is
// unchanged, not which formula produced it.
check('a Linda unit is still flagged as Linda money',
  (await computeWaterFee('lf', 2)).basis, 'linda-fixed');
check('and a standard unit is not',
  (await computeWaterFee('2c', 2)).basis, 'per-occupant');
check('a Linda unit and a standard unit now cost the same per head',
  (await computeWaterFee('LF', 3)).amount, (await computeWaterFee('2c', 3)).amount);
check('zero occupants floors to 1', await computeWaterFee('3a', 0), { amount: 200, basis: 'per-occupant' });

// --- totals ---
check('rent 8000 + 2 occupants', await computeBillAmounts({ roomNumber: '1a', currentPrice: 8000, occupants: 2 }),
  { rentAmount: 8000, waterAmount: 400, totalAmount: 8400, waterBasis: 'per-occupant' });
check('LF rent 5000 + 4 people of water',
  await computeBillAmounts({ roomNumber: 'LF', currentPrice: 5000, occupants: 4 }),
  { rentAmount: 5000, waterAmount: 800, totalAmount: 5800, waterBasis: 'linda-fixed' });

// --- overdue (BR-011) ---
check('paid is never overdue',
  await isOverdue({ due_date: '2020-01-01', status: 'Paid' }, new Date(Date.UTC(2026, 8, 20))), false);
check('unpaid past due is overdue',
  await isOverdue({ due_date: '2026-09-01', status: 'Due' }, new Date(Date.UTC(2026, 8, 20))), true);
check('unpaid on the due date is not yet overdue',
  await isOverdue({ due_date: '2026-09-20', status: 'Due' }, new Date(Date.UTC(2026, 8, 20, 12))), false);
check('legacy bill honours its own stored 7-day window',
  await isOverdue({ due_date: '2026-07-05', grace_period_end_date: '2026-07-12', status: 'Due' },
                  new Date(Date.UTC(2026, 6, 10))), false);

/**
 * The boundary, in PROPERTY time.
 *
 * Added 2026-09-16 after a mutation exposed that nothing here pinned it. The
 * cutoff was built as `${boundary}T23:59:59.999Z` - the end of the day in UTC -
 * and the property is at UTC+8, so a bill due the 20th stayed "not overdue"
 * until 08:00 Manila on the 21st. An eight-hour grace period nobody granted, in
 * a system where OD-16 says there is no grace period at all.
 *
 * The three times below straddle it. The middle one is the assertion that used
 * to fail: 00:01 on the day after the due date IS overdue.
 */
check('23:59 Manila on the due date is not yet overdue',
  await isOverdue({ due_date: '2026-09-20', status: 'Due' },
                  new Date('2026-09-20T23:59:00+08:00')), false);
check('the last millisecond of the due day is still not overdue',
  await isOverdue({ due_date: '2026-09-20', status: 'Due' },
                  new Date('2026-09-20T23:59:59.999+08:00')), false);
check('00:01 Manila the next day IS overdue',
  await isOverdue({ due_date: '2026-09-20', status: 'Due' },
                  new Date('2026-09-21T00:01:00+08:00')), true);
check('07:59 Manila the next day IS overdue (the old eight-hour gap)',
  await isOverdue({ due_date: '2026-09-20', status: 'Due' },
                  new Date('2026-09-21T07:59:00+08:00')), true);

/**
 * Rent keeps its centavos.
 *
 * Also added after a mutation: swapping `toCentavos()` for `Math.round()` on the
 * rent broke nothing here, so nothing was pinning it. That mutation turns
 * 3,500.55 into 3,501 on every bill - a peso out, silently, forever.
 */
const cents = await computeBillAmounts({ roomNumber: '1a', currentPrice: 3500.55, occupants: 2 });
check('rent keeps centavos rather than rounding to pesos', cents.rentAmount, 3500.55);


// --- receipt allocation (BR-013): partial payment is recorded, never stranded ---
//
// This is the one function in the system that decides where money goes, so it is
// tested against its real export rather than a restatement of its logic.
//
// `bill` here is shorthand for { id, total_amount, status, paidSoFar }.
const bill = (id, total, status = 'Due', paidSoFar = 0) =>
  ({ id, total_amount: total, status, paidSoFar });

const plan = (receipt, bills) => {
  const p = allocateReceipt(receipt, bills);
  return { steps: p.steps, corrections: p.corrections, advance: p.advance };
};

// The case that was broken. 3,000 against a 5,000 bill used to be written with
// bill_id NULL and left there; the bill went on reading its full 5,000 forever.
check('partial: the money is LINKED to the bill it pays down',
  plan(3000, [bill('B1', 5000)]).steps,
  [{ billId: 'B1', amount: 3000, billStatus: 'Partially Paid' }]);

check('partial: nothing becomes a floating advance',
  plan(3000, [bill('B1', 5000)]).advance, 0);

// The following month. This is what used to orphan the first 3,000 permanently.
check('follow-up: only the 2,000 balance is taken, the rest is an advance',
  plan(3000, [bill('B1', 5000, 'Partially Paid', 3000)]).steps,
  [{ billId: 'B1', amount: 2000, billStatus: 'Paid' },
   { billId: null, amount: 1000, billStatus: null }]);

check('exact: clears the bill with no advance',
  plan(5000, [bill('B1', 5000)]).steps,
  [{ billId: 'B1', amount: 5000, billStatus: 'Paid' }]);

// Oldest first, and it does not skip ahead to a smaller newer bill.
check('cascade: oldest cleared, newest part-paid',
  plan(9000, [bill('B1', 5000, 'Overdue'), bill('B2', 5000)]).steps,
  [{ billId: 'B1', amount: 5000, billStatus: 'Paid' },
   { billId: 'B2', amount: 4000, billStatus: 'Partially Paid' }]);

check('oldest-first: a receipt too small for the oldest debt pays IT down, ' +
      'rather than clearing a smaller newer bill',
  plan(400, [bill('B1', 5000), bill('B2', 400)]).steps,
  [{ billId: 'B1', amount: 400, billStatus: 'Partially Paid' }]);

// A bill earlier payments already covered, whose status never caught up.
check('stale: a covered bill is corrected, not paid a second time',
  plan(5000, [bill('B1', 5000, 'Due', 5000), bill('B2', 5000)]),
  { steps: [{ billId: 'B2', amount: 5000, billStatus: 'Paid' }],
    corrections: ['B1'], advance: 0 });

// The live system's dominant case today: 13 of 15 payments have no bill at all.
check('no bills: the whole receipt is an advance',
  plan(4700, []).steps, [{ billId: null, amount: 4700, billStatus: null }]);

// Float drift. `payments_amount_check` is CHECK (amount > 0), so a sub-centavo
// residue is a LEGAL row - it would be written, and it would be junk.
check('dust: three odd bills clear exactly, leaving no residue row',
  plan(1000.10, [bill('B1', 333.37), bill('B2', 333.37), bill('B3', 333.36)]),
  { steps: [{ billId: 'B1', amount: 333.37, billStatus: 'Paid' },
            { billId: 'B2', amount: 333.37, billStatus: 'Paid' },
            { billId: 'B3', amount: 333.36, billStatus: 'Paid' }],
    corrections: [], advance: 0 });

check('dust: a sub-centavo receipt writes nothing at all',
  plan(0.004, [bill('B1', 5000)]).steps, []);

check('constraint: no step ever violates CHECK (amount > 0)',
  [5000.001, 0.004, 1000.10, 3000, 9000, 4700]
    .flatMap((r) => plan(r, [bill('B1', 5000), bill('B2', 333.37)]).steps)
    .filter((s) => !(s.amount > 0)),
  []);

// Conservation. Every peso handed over is recorded exactly once - no more, no less.
check('conservation: money in equals money recorded, to the centavo',
  [[3000, [bill('B1', 5000)]],
   [9000, [bill('B1', 5000), bill('B2', 5000)]],
   [12345.67, [bill('B1', 4700, 'Due', 1200)]],
   [4700, []],
   [1000.10, [bill('B1', 333.37), bill('B2', 333.37), bill('B3', 333.36)]]]
    .map(([receipt, bills]) => {
      const recorded = plan(receipt, bills).steps.reduce((s, x) => s + x.amount, 0);
      return Math.abs(recorded - receipt) < 0.005 ? null : { receipt, recorded };
    })
    .filter(Boolean),
  []);


// --- rent period derivation (BR-033): "Rent For" comes from the tenancy cycle ---
//
// The admin form defaulted this to the DATE PAID and required it, so a tenant on
// a 13th-of-the-month cycle paying on the 20th had the period recorded as
// starting on the 20th. These assert the cycle, not the payment date.
check('anniversary 13th, paid 20 Sep, 1 month -> the cycle, not the pay date',
  await computeRentPeriod('2022-05-13', '2026-09-20', 1),
  { start: '2026-09-13', end: '2026-10-12' });

check('anniversary 13th, paid 5 Sep (before the anchor) -> the cycle that contains it',
  await computeRentPeriod('2022-05-13', '2026-09-05', 1),
  { start: '2026-08-13', end: '2026-09-12' });

check('3 months from 13 Sep -> ends the day before the 13 Dec anniversary',
  await computeRentPeriod('2022-05-13', '2026-09-20', 3),
  { start: '2026-09-13', end: '2026-12-12' });

check('12 months crosses the year boundary correctly',
  await computeRentPeriod('2022-05-13', '2026-09-20', 12),
  { start: '2026-09-13', end: '2027-09-12' });

// Month-length clamping over a multi-month span: three months from 31 January
// must not produce an impossible 31 April that rolls into May.
check('anniversary 31st, 3 months from 31 Jan -> clamps to April, never rolls over',
  await computeRentPeriod('2021-01-31', '2026-01-31', 3),
  { start: '2026-01-31', end: '2026-04-29' });

check('monthsCovered 0 or negative is treated as a single cycle',
  await computeRentPeriod('2022-05-13', '2026-09-20', 0),
  { start: '2026-09-13', end: '2026-10-12' });

// ---------------------------------------------------------------------------
// computeStanding - settled only while her records cover today (2026-09-24).
// The live shape that day: records ending in August, nothing for September.
// ---------------------------------------------------------------------------
const st = (paidThrough, today, tenancyStart = '2024-01-01') =>
  computeStanding({ paidThrough, tenancyStart, today });
const brief = (s) => ({ status: s.status, next: s.nextPeriodStart, owed: s.owedPeriods.map((p) => `${p.start}..${p.end}`) });

check('paid through 14 Aug, today 24 Sep: Aug 15 and Sep 15 periods owed, overdue',
  brief(st('2026-08-14', '2026-09-24')),
  { status: 'overdue', next: '2026-08-15', owed: ['2026-08-15..2026-09-14', '2026-09-15..2026-10-14'] });

check('paid through 14 Oct, today 24 Sep: settled - nothing owed, no pay button',
  brief(st('2026-10-14', '2026-09-24')),
  { status: 'settled', next: '2026-10-15', owed: [] });

check('the next period opens within the payable week: due-soon, payable ahead (OD-03)',
  brief(st('2026-09-30', '2026-09-24')),
  { status: 'due-soon', next: '2026-10-01', owed: ['2026-10-01..2026-10-31'] });

check('the next period opens today: due, not overdue',
  brief(st('2026-09-23', '2026-09-24')),
  { status: 'due', next: '2026-09-24', owed: ['2026-09-24..2026-10-23'] });

check('periods keep her rhythm past a short month (paid through 30 Jan -> 31st anchor, clamped)',
  brief(st('2026-01-30', '2026-03-05')).owed,
  ['2026-01-31..2026-02-27', '2026-02-28..2026-03-30']);

check('no receipt at all: owed from the tenancy start',
  brief(st(null, '2026-09-24', '2026-08-10')),
  { status: 'overdue', next: '2026-08-10', owed: ['2026-08-10..2026-09-09', '2026-09-10..2026-10-09'] });

check('receipts from before this tenancy do not reach back past its start',
  brief(st('2026-03-31', '2026-09-24', '2026-09-01')).next,
  '2026-09-01');

check('a tenancy with nothing on record for years is capped, not unbounded',
  st(null, '2026-09-24', '2010-01-01').owedPeriods.length,
  24);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
/**
 * `process.exitCode`, not `process.exit()`.
 *
 * `billingService` opens a Supabase client to read the configured rates, and its
 * connection pool was still closing when this line was reached. Calling
 * `process.exit()` here tore the loop down mid-close and tripped a libuv
 * assertion on Windows:
 *
 *   Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94
 *
 * The process then exited **127** having printed `ALL CHECKS PASSED` with zero
 * failures, so `check:all` reported `FAIL check:billing` while every billing rule
 * it guards was satisfied. On a project whose rule is 'read the summary table', a
 * suite that is permanently red for a reason unrelated to its assertions is worse
 * than no suite: it teaches people to read past red.
 *
 * Setting the code and letting the loop drain exits cleanly with the same status.
 */
process.exitCode = failures === 0 ? 0 : 1;
