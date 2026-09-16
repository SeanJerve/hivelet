/**
 * @file lib/propertyDate.ts
 * @description Dates as the property experiences them, for form defaults and previews.
 *
 * WHY THIS EXISTS
 * ---------------
 * Form defaults were `new Date().toISOString().split('T')[0]`, which is **UTC's
 * date**. The property is in Legazpi City at **UTC+8**, so between midnight and
 * 08:00 local time that expression returns **yesterday** - and it did so on the
 * on-site payment form's date field, the expense date field, and the period
 * start. An administrator collecting rent at seven in the morning was offered
 * yesterday's date as the default, and would have had to notice.
 *
 * The backend was fixed the same day; see `backend/src/utils/propertyClock.ts`.
 * This is the browser half, kept deliberately consistent with it: both anchor to
 * the property, not to whoever happens to be looking.
 */

/** Legazpi City. UTC+8, no daylight saving, ever. */
export const PROPERTY_TIMEZONE = 'Asia/Manila';

/**
 * Today at the property, as `YYYY-MM-DD`.
 *
 * `en-CA` is used because its short date format is ISO 8601. It is a formatting
 * locale, not a statement about Canada.
 */
export function propertyToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: PROPERTY_TIMEZONE });
}

/** A `Date` rendered as `YYYY-MM-DD` at the property, never in UTC. */
export function propertyDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: PROPERTY_TIMEZONE });
}

/**
 * The last day covered by `monthsCovered` months starting at `startIso`.
 *
 * This mirrors `billingService.computeRentPeriod()` on the server, which is the
 * authority. The browser keeps a copy only so the form can show the period
 * before it is submitted - and the API accepts a supplied `dateCoveredEnd`, so
 * this value can reach the ledger.
 *
 * The version it replaces did `setMonth(getMonth() + n)` and then `setDate(-1)`,
 * which overflows: **31 January plus one month became 2 March**, because "31
 * February" normalises forward and the minus-one-day only claws back one of the
 * three. It happened to be right elsewhere - a one-day overflow is exactly
 * cancelled by the minus-one-day - so only February exposed it, which is the
 * worst way for a bug like this to behave.
 *
 * Clamping to the length of the target month is what the server already does.
 */
export function periodEnd(startIso: string, monthsCovered: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso)) return '';
  const [y, m, d] = startIso.split('-').map(Number);
  if (!y || !m || !d) return '';

  const targetMonthIndex = m - 1 + monthsCovered;
  const daysInTarget = new Date(Date.UTC(y, targetMonthIndex + 1, 0)).getUTCDate();
  const anniversary = new Date(Date.UTC(y, targetMonthIndex, Math.min(d, daysInTarget)));

  // The day before the next anniversary is the last day covered.
  return new Date(anniversary.getTime() - 86_400_000).toISOString().slice(0, 10);
}
