/**
 * @file utils/propertyClock.ts
 * @description "Today", as the property experiences it.
 *
 * WHY THIS EXISTS
 * ---------------
 * Seven places wrote a DATE column using `new Date().toISOString().slice(0, 10)`.
 * That is **UTC's date**, and the property is in the Philippines at **UTC+8**,
 * with no daylight saving. Between **midnight and 08:00 Manila time** those two
 * dates differ, and the expression returns **yesterday**:
 *
 *   2026-09-16T16:30:00Z   UTC date 2026-09-16   Manila 2026-09-17 00:30
 *   2026-09-16T23:30:00Z   UTC date 2026-09-16   Manila 2026-09-17 07:30
 *
 * It is not a local-machine problem. `toISOString()` converts to UTC whatever
 * the server's own timezone is, so it was wrong on every machine equally.
 *
 * WHAT IT COST
 * ------------
 * Two of those seven wrote `room_assignments.anniversary_date`, on tenant
 * onboarding and on reassignment. That column is not cosmetic: `computeRentPeriod()`
 * and `computeBillPeriod()` derive the rent cycle from it under BR-033. A tenancy
 * created at 7am Manila would have been anchored to the previous day, and every
 * bill and every "Rent For" period after it would inherit the shift - quietly,
 * forever, with nothing to notice it.
 *
 * The other five wrote `start_date` and `end_date` on onboarding, reassignment
 * and vacate. Those are read by occupancy and by the final month's arithmetic.
 *
 * USE THIS INSTEAD OF `new Date()` FOR ANY STORED DATE
 * ---------------------------------------------------
 * Building a specific date from components - `new Date(Date.UTC(y, m, 26))` - is
 * a different thing and remains correct, because it never asks what day it is.
 * The bug is only ever in deriving TODAY from UTC.
 */

/** The property is in Legazpi City. UTC+8, no daylight saving, ever. */
export const PROPERTY_TIMEZONE = 'Asia/Manila';

/**
 * Today's date at the property, as `YYYY-MM-DD`.
 *
 * `en-CA` is used because its short date format is ISO 8601 - `2026-09-17` -
 * which is what a PostgreSQL `DATE` column wants. It is a formatting locale
 * here, not a statement about Canada.
 */
export function propertyToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: PROPERTY_TIMEZONE });
}
