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
 * The frontend names the file it saves the same way
 * (frontend/src/lib/downloadReport.ts `reportFileName`); change one, change both.
 */
export type ReportKind = 'income' | 'expenses' | 'audit';

const NAME: Record<ReportKind, { title: string; code: string }> = {
  income: { title: 'Monthly Income', code: 'MI' },
  expenses: { title: 'Monthly Expenses', code: 'ME' },
  audit: { title: 'Activity Log', code: 'AL' },
};
const AUDIT_CHIP: Record<string, string> = { business: 'Done to the records', auth: 'Sign-ins', export: 'Downloads' };

export function reportFileName(kind: ReportKind, scope: string | number, today = propertyToday()): string {
  const [year, month] = today.split('-');
  const monthName = new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const { title, code } = NAME[kind];
  if (kind !== 'audit' && String(scope) !== year) return `${title} ${scope} - ${code}${scope}.xlsx`;
  const what = kind === 'audit' && AUDIT_CHIP[String(scope)] ? `${title} (${AUDIT_CHIP[String(scope)]})` : title;
  return `${what} ${monthName} ${year} - ${code}${month}${year}.xlsx`;
}

/** The header value: the name quoted, which every browser accepts for plain ASCII. */
export function attachmentHeader(kind: ReportKind, scope: string | number): string {
  return `attachment; filename="${reportFileName(kind, scope)}"`;
}
