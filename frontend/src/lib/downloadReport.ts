import { API_BASE, getStoredToken } from './api';
import { showToast } from './systemState';
import { propertyToday } from './propertyDate';

/**
 * Downloads one of the server-built workbooks.
 *
 * Three screens were each writing this out: the same fetch, the same bearer
 * header, the same blob-to-anchor dance, the same three failure branches. The
 * income and expenses ledgers had drifted apart in their wording already.
 *
 * Fetched rather than linked because the endpoint needs the bearer token and an
 * `<a href>` cannot carry one.
 */
export type ReportKind = 'income' | 'expenses' | 'audit';

/**
 * The paths, written out.
 *
 * Not `/admin/reports/${kind}.xlsx`. `check:endpoints` proves every route has a
 * caller by searching the frontend source for its path, and an interpolated URL
 * is invisible to it - building this helper with one hid all three of these at
 * once, including the two that had been fine for weeks. A route that quietly
 * loses its caller is exactly what that check is for, so the literals stay.
 */
const PATH: Record<ReportKind, string> = {
  income: '/admin/reports/income.xlsx',
  expenses: '/admin/reports/expenses.xlsx',
  audit: '/admin/reports/audit.xlsx',
};

/**
 * The name a downloaded workbook is saved under (Sean, 2026-09-29): what it is,
 * the month it is current to, and a reference of the report's initials, month
 * and year - "Monthly Income September 2026 - MI092026".
 *
 * A ledger for the current year runs to this month, so it carries this month. A
 * past year is complete, and no one month describes it, so it is named for the
 * year alone - "Monthly Income 2025 - MI2025". The Activity Log adds the chip it
 * was downloaded from, unless that was Everything. The month is the property's
 * (lib/propertyDate.ts), not the viewer's clock. The server names its
 * attachment the same way (backend/src/utils/reportFileName.ts), so the two agree.
 */
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

/**
 * `scope` is the year for the two ledgers, and the category for the trail.
 * Both end up as a query the endpoint understands, and in the file name.
 */
export async function downloadReport(
  kind: ReportKind,
  scope: string | number,
  extra: Record<string, string | number> = {}
) {
  try {
    const params = new URLSearchParams(
      kind === 'audit'
        ? { category: String(scope), ...toStrings(extra) }
        : { year: String(scope), ...toStrings(extra) }
    );
    const res = await fetch(`${API_BASE}${PATH[kind]}?${params}`, {
      headers: { Authorization: `Bearer ${getStoredToken() ?? ''}` },
    });
    if (!res.ok) {
      throw new Error(`The report could not be generated (HTTP ${res.status}).`);
    }

    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    const fileName = reportFileName(kind, scope);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('success', 'Report downloaded', `Saved as ${fileName}`);
  } catch (err: unknown) {
    showToast(
      'error',
      'Export failed',
      err instanceof Error ? err.message : 'The report could not be generated.'
    );
  }
}

function toStrings(o: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));
}
