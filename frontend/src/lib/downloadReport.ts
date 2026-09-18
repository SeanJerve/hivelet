import { API_BASE, getStoredToken } from './api';
import { showToast } from './systemState';

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

const TITLE: Record<ReportKind, string> = {
  income: 'Monthly Income Report',
  expenses: 'Monthly Expenses Report',
  audit: 'Audit trail',
};

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
    a.download = `hivelet-${kind}-${scope}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('success', 'Report downloaded', `${TITLE[kind]} for ${scope}.`);
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
