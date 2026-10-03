import { propertyToday } from './propertyClock.js';

/**
 * The name a downloaded workbook is saved under: what it is and the period it
 * holds, nothing else (Loyd, 2026-10-03).
 *
 *   one month   "Monthly Income August 2026.xlsx"
 *   one year    "Monthly Income 2026.xlsx"            (this year too)
 *   everything  "Monthly Income 2024-2026.xlsx"       (first to last year held)
 *
 * It used to carry a reference after a dash ("- MI082026"), "only" on a single
 * month, and a current-year file named for this month ("Monthly Income October
 * 2026" for the whole of 2026), which read as one month when it was the year.
 * Everything was "All Years - MIALL"; the years it actually spans say more. With
 * no years given (or none found) it falls back to "Monthly Income, all records".
 * A year's file and a month's file can no longer share a name, so the "only"
 * that kept them apart is not needed. The tenant history follows the same rule.
 *
 * The frontend names the file it saves the same way
 * (frontend/src/lib/downloadReport.ts `reportFileName`); change one, change both.
 */
export type ReportKind = 'income' | 'expenses' | 'tenants';

const NAME: Record<ReportKind, { title: string }> = {
  income: { title: 'Monthly Income' },
  expenses: { title: 'Monthly Expenses' },
  tenants: { title: 'Tenant History' },
};

const monthNameOf = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

export function reportFileName(
  kind: ReportKind,
  scope: string | number,
  _today = propertyToday(),
  month: number | null = null,
  years: number[] = []
): string {
  const { title } = NAME[kind];
  if (scope === 'all') {
    const held = years.filter((y) => Number.isInteger(y));
    if (!held.length) return `${title}, all records.xlsx`;
    const first = Math.min(...held);
    const last = Math.max(...held);
    return first === last ? `${title} ${first}.xlsx` : `${title} ${first}-${last}.xlsx`;
  }
  if (month) return `${title} ${monthNameOf(Number(scope), month)} ${scope}.xlsx`;
  return `${title} ${scope}.xlsx`;
}

/** The header value: the name quoted, which every browser accepts for plain ASCII. */
export function attachmentHeader(
  kind: ReportKind,
  scope: string | number,
  month: number | null = null,
  years: number[] = []
): string {
  return `attachment; filename="${reportFileName(kind, scope, propertyToday(), month, years)}"`;
}

/** The years an everything-workbook holds, read off its sheet names ("Income 2024"). */
export function yearsInSheets(sheetNames: string[]): number[] {
  return sheetNames.map((n) => Number(/(\d{4})$/.exec(n)?.[1])).filter((y) => Number.isInteger(y) && y > 0);
}
