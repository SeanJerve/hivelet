import { propertyToday } from './propertyClock.js';

/**
 * The name a downloaded workbook is saved under (Sean, 2026-09-29): what it is,
 * the month it is current to, and a reference of the report's initials, month
 * and year - "Monthly Income September 2026 - MI092026".
 *
 * A ledger for the current year runs to this month, so it carries this month; a
 * past year is complete and is named for the year alone - "Monthly Income 2025 -
 * MI2025". The Activity Log adds the screen's chip unless it was everything. The
 * month is the property's (Asia/Manila), not the server's.
 *
 * The tenant history (2026-09-30) is named for the period chosen, not today's
 * month, because that is what it holds: "Tenant History 2024 - TH2024", or
 * "Tenant History June 2025 - TH062025" for one month.
 *
 * The frontend names the file it saves the same way
 * (frontend/src/lib/downloadReport.ts `reportFileName`); change one, change both.
 */
export type ReportKind = 'income' | 'expenses' | 'audit' | 'tenants';

const NAME: Record<ReportKind, { title: string; code: string }> = {
  income: { title: 'Monthly Income', code: 'MI' },
  expenses: { title: 'Monthly Expenses', code: 'ME' },
  audit: { title: 'Activity Log', code: 'AL' },
  tenants: { title: 'Tenant History', code: 'TH' },
};
const AUDIT_CHIP: Record<string, string> = { business: 'Done to the records', auth: 'Sign-ins', export: 'Downloads' };

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
  if (kind === 'tenants') {
    if (!month) return `${title} ${scope} - ${code}${scope}.xlsx`;
    const mm = String(month).padStart(2, '0');
    return `${title} ${monthNameOf(Number(scope), month)} ${scope} - ${code}${mm}${scope}.xlsx`;
  }
  if (kind !== 'audit' && String(scope) !== year) return `${title} ${scope} - ${code}${scope}.xlsx`;
  const what = kind === 'audit' && AUDIT_CHIP[String(scope)] ? `${title} (${AUDIT_CHIP[String(scope)]})` : title;
  return `${what} ${monthNameOf(Number(year), Number(thisMonth))} ${year} - ${code}${thisMonth}${year}.xlsx`;
}

/** The header value: the name quoted, which every browser accepts for plain ASCII. */
export function attachmentHeader(kind: ReportKind, scope: string | number, month: number | null = null): string {
  return `attachment; filename="${reportFileName(kind, scope, propertyToday(), month)}"`;
}
