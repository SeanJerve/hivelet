/**
 * @file lib/incomeFiling.ts
 * @description Which year and month an income row is counted under.
 *
 * The month the rent is FOR: the row's own `year` and `month` columns. That is
 * how her book files a receipt (216 rows follow the rent period, 50 the date
 * paid - see the create path in backend/src/routes/admin.ts), and it is what the
 * Overview (`r.year`, `r.month`) and the Excel export (`.eq('year', year)`)
 * already count by.
 *
 * Money coming in used to filter and chart by the date paid instead. Rent for
 * January paid on 28 December then sat in one year on this page and in the other
 * on the Overview and in the spreadsheet the page exports, so a year picked once
 * across all three (lib/yearScope.ts) showed three totals that disagreed
 * (FINAL_REVIEW F3). Pure, so it can be tested without a browser.
 */

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** The fields of an income row this reads. */
export interface FiledIncomeRow {
  year?: number;
  month?: number;
}

/**
 * Whether a row belongs to the picked year and month. `year` is 'All' or a
 * four-digit year; `month` is 'All' or a short month name ('Jan').
 */
export function incomeRowInPeriod(r: FiledIncomeRow, year: string, month: string): boolean {
  if (year !== 'All' && String(r.year) !== year) return false;
  if (month !== 'All' && MONTH_SHORT[(r.month ?? 0) - 1] !== month) return false;
  return true;
}

/** The month (1-12) a row is charted under, or null when it has none. */
export function incomeRowMonth(r: FiledIncomeRow): number | null {
  return r.month !== undefined && r.month >= 1 && r.month <= 12 ? r.month : null;
}
