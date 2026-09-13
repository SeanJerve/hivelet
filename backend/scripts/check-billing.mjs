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
 */
import { computeBillPeriod, computeWaterFee, computeBillAmounts, isOverdue }
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

// --- grace is zero everywhere (OD-16) ---
check('grace equals due date', p1.gracePeriodEndDate === p1.dueDate, true);

// --- water fee (BR-014 / BR-040) ---
check('standard unit, 3 occupants -> 600 per-occupant', await computeWaterFee('2c', 3),
  { amount: 600, basis: 'per-occupant' });
check('LF -> 400 fixed', await computeWaterFee('LF', 5), { amount: 400, basis: 'linda-fixed' });
check('LB -> 200 fixed', await computeWaterFee('LB', 1), { amount: 200, basis: 'linda-fixed' });
check('lowercase lf still matches', await computeWaterFee('lf', 2), { amount: 400, basis: 'linda-fixed' });
check('zero occupants floors to 1', await computeWaterFee('3a', 0), { amount: 200, basis: 'per-occupant' });

// --- totals ---
check('rent 8000 + 2 occupants', await computeBillAmounts({ roomNumber: '1a', currentPrice: 8000, occupants: 2 }),
  { rentAmount: 8000, waterAmount: 400, totalAmount: 8400, waterBasis: 'per-occupant' });
check('LF rent 5000 + fixed water', await computeBillAmounts({ roomNumber: 'LF', currentPrice: 5000, occupants: 4 }),
  { rentAmount: 5000, waterAmount: 400, totalAmount: 5400, waterBasis: 'linda-fixed' });

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

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
