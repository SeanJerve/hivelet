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

/**
 * The calendar parts of an instant, as the property experiences it.
 *
 * `payments.paid_at` is a `timestamptz` - a moment, not a date - and the income
 * ledger files it under a `year` and `month`. Reading those with
 * `Date.getFullYear()` and `.getMonth()` uses the SERVER's timezone, so the same
 * payment files to a different month depending on where the process runs:
 *
 *   paid_at 2026-09-30T17:00:00Z   Manila 2026-10-01 01:00   ->  October
 *                                  a UTC server              ->  September
 *
 * A ledger figure must not depend on where the server is. These parts are always
 * the property's.
 */
export function propertyParts(instant: Date | string | number): {
  year: number;
  month: number;
  day: number;
  date: string;
} {
  const d = instant instanceof Date ? instant : new Date(instant);  // string or epoch ms
  const date = d.toLocaleDateString('en-CA', { timeZone: PROPERTY_TIMEZONE });
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day, date };
}

/**
 * The last instant of a given property date, for comparing against a real moment.
 *
 * This is a DIFFERENT shape from the one this file was written for, and the
 * sweep that fixed the seven stored dates did not cover it. `isOverdue()` built
 * its cutoff as
 *
 *     new Date(`${boundary}T23:59:59.999Z`)
 *
 * which is the end of that day in **UTC**. The property is at UTC+8, so a bill
 * due 16 September did not become overdue until **08:00 Manila on the 17th** -
 * an eight-hour grace period nobody granted, in a system whose OD-16 says there
 * is no grace period at all. A tenant paying at 7am on the day after the due
 * date was recorded as on time.
 *
 * `+08:00` is written literally because the Philippines has never observed
 * daylight saving. If that ever changes, this is the one place to fix.
 */
export function propertyEndOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999+08:00`);
}

/**
 * The first instant of a given property date. Same reasoning as
 * `propertyEndOfDay`.
 */
export function propertyStartOfDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000+08:00`);
}

/**
 * The calendar parts of a plain `YYYY-MM-DD` string.
 *
 * Deliberately does NOT go through `Date`. A date string has no timezone, so
 * converting it to an instant and back can only introduce one - which is how
 * `new Date('2026-09-16').getDate()` returns 15 on a server west of UTC.
 */
export function isoDateParts(iso: string): { year: number; month: number; day: number } {
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  };
}
