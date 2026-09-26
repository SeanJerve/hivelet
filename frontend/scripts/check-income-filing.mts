// Targeted test for docs/FINAL_REVIEW.md F3. Run from the repo root:
//   node frontend/scripts/check-income-filing.mts
// (Node 22.18+ runs TypeScript directly.) Failed 9 of 10 against the page's
// previous date-paid filter; passes against lib/incomeFiling.ts.
import { incomeRowInPeriod, incomeRowMonth } from '../src/lib/incomeFiling.ts';

let pass = 0, fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

// Rent for January 2026, paid 28 December 2025 (OD-03: she collects ahead).
// The Overview and the Excel export count it in 2026 / January, from year and month.
const ahead = { year: 2026, month: 1, datePaid: 'Dec 28, 2025' };
check('paid ahead: counted in the year it is for', incomeRowInPeriod(ahead, '2026', 'All'), true);
check('paid ahead: not in the year it was paid', incomeRowInPeriod(ahead, '2025', 'All'), false);
check('paid ahead: counted in the month it is for', incomeRowInPeriod(ahead, '2026', 'Jan'), true);
check('paid ahead: not in the month it was paid', incomeRowInPeriod(ahead, '2025', 'Dec'), false);
check('paid ahead: charted in January', incomeRowMonth(ahead), 1);

// Arrears: August 2026 rent paid in October.
const arrears = { year: 2026, month: 8, datePaid: 'Oct 3, 2026' };
check('arrears: in August', incomeRowInPeriod(arrears, '2026', 'Aug'), true);
check('arrears: not in October', incomeRowInPeriod(arrears, '2026', 'Oct'), false);

// A mistyped payment year (the ledger holds one dated 1900) is still filed under its month.
const typo = { year: 2024, month: 3, datePaid: 'Jan 1, 1900' };
check('a mistyped payment date is still counted in its filed year', incomeRowInPeriod(typo, '2024', 'Mar'), true);

// A row with no readable date is still filed.
const undated = { year: 2025, month: 5, datePaid: '—' };
check('an undated row is still counted in its filed year', incomeRowInPeriod(undated, '2025', 'May'), true);
check('All/All keeps everything', incomeRowInPeriod(undated, 'All', 'All'), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
