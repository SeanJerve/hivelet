import { propertyToday } from './propertyClock.js';

/**
 * The name a downloaded workbook is saved under (Sean, 2026-09-29): what it is,
 * the month it is current to, and a reference of the report's initials, month
 * and year - "Monthly Income September 2026 - MI092026".
 *
 * A ledger for the current year runs to this month, so it carries this month; a
 * past year is complete and is named for the year alone - "Monthly Income 2025 -
 * MI2025". The month is the property's (Asia/Manila), not the server's. (The
 * Activity Log workbook went with its screen - Sean, 2026-10-01.)
 *
 * The tenant history (2026-09-30) is named for the period chosen, not today's
 * month, because that is what it holds: "Tenant History 2024 - TH2024", or
 * "Tenant History June 2025 - TH062025" for one month.
 *
 * One month and everything (Sean, 2026-10-02, the Download dialog): a month of
 * any report is named for that month, the way the tenant history already was -
 * "Monthly Income March 2026 only - MI032026" ("only" on the two ledgers, so this
 * month alone never shares the current-year file's name) - and everything is "Monthly Income
 * All Years - MIALL". A year keeps the rule above unchanged, because the
 * testing-day cases quote it (TESTING_REHEARSAL.md step 23, A-29).
 *
 * The frontend names the file it saves the same way
 * (frontend/src/lib/downloadReport.ts `reportFileName`); change one, change both.
 */
export type ReportKind = 'income' | 'expenses' | 'tenants';

const NAME: Record<ReportKind, { title: string; code: string }> = {
  income: { title: 'Monthly Income', code: 'MI' },
  expenses: { title: 'Monthly Expenses', code: 'ME' },
  tenants: { title: 'Tenant History', code: 'TH' },
};

const monthNameOf = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

export function reportFileName(
  kind: ReportKind,
  scope: string | number,
  today = propertyToday(),
  month: number | null = null
): string {
  const [year, thisMonth] = today.split('-');
  const { title, code } = NAME[kind];
  if (scope === 'all') return `${title} All Years - ${code}ALL.xlsx`;
  if (month) {
    const mm = String(month).padStart(2, '0');
    // "only" on a ledger's month (Sean, 2026-10-02: nothing unusual): a current-year ledger is
    // already named for this month, so this month alone needs a different name. The tenant
    // history has no year-to-date name to collide with and keeps its 30 Sep form.
    const only = kind === 'tenants' ? '' : ' only';
    return `${title} ${monthNameOf(Number(scope), month)} ${scope}${only} - ${code}${mm}${scope}.xlsx`;
  }
  if (kind === 'tenants') return `${title} ${scope} - ${code}${scope}.xlsx`;
  if (String(scope) !== year) return `${title} ${scope} - ${code}${scope}.xlsx`;
  return `${title} ${monthNameOf(Number(year), Number(thisMonth))} ${year} - ${code}${thisMonth}${year}.xlsx`;
}

/** The header value: the name quoted, which every browser accepts for plain ASCII. */
export function attachmentHeader(kind: ReportKind, scope: string | number, month: number | null = null): string {
  return `attachment; filename="${reportFileName(kind, scope, propertyToday(), month)}"`;
}
