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
export type ReportKind = 'income' | 'expenses' | 'tenants';

/**
 * What a download covers: one month, one year, or everything (Sean,
 * 2026-10-02 - the Download dialog, components/ui/DownloadDialog.vue). The
 * server reads the same three (backend/src/utils/reportScope.ts).
 */
export type DownloadScope =
  | { kind: 'month'; year: number; month: number }
  | { kind: 'year'; year: number }
  | { kind: 'all' };

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
  tenants: '/admin/reports/tenants.xlsx',
};

/**
 * The name a downloaded workbook is saved under (Sean, 2026-09-29): what it is,
 * the month it is current to, and a reference of the report's initials, month
 * and year - "Monthly Income September 2026 - MI092026".
 *
 * A ledger for the current year runs to this month, so it carries this month. A
 * past year is complete, and no one month describes it, so it is named for the
 * year alone - "Monthly Income 2025 - MI2025". The month is the property's
 * (lib/propertyDate.ts), not the viewer's clock. The server names its
 * attachment the same way (backend/src/utils/reportFileName.ts), so the two agree.
 *
 * One month of any report is named for that month - "Monthly Income March 2026
 * - MI032026" - and everything is "Monthly Income All Years - MIALL" (Sean,
 * 2026-10-02, the Download dialog).
 */
const NAME: Record<ReportKind, { title: string; code: string }> = {
  income: { title: 'Monthly Income', code: 'MI' },
  expenses: { title: 'Monthly Expenses', code: 'ME' },
  tenants: { title: 'Tenant History', code: 'TH' },
};

const monthNameOf = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

/**
 * The tenant history is named for the period chosen, not today's month,
 * because that is what it holds: "Tenant History 2024 - TH2024", or "Tenant
 * History June 2025 - TH062025" for one month (`month`).
 */
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
    // "only" on a ledger's month: see the server's twin (backend/src/utils/reportFileName.ts).
    const only = kind === 'tenants' ? '' : ' only';
    return `${title} ${monthNameOf(Number(scope), month)} ${scope}${only} - ${code}${mm}${scope}.xlsx`;
  }
  if (kind === 'tenants') return `${title} ${scope} - ${code}${scope}.xlsx`;
  if (String(scope) !== year) return `${title} ${scope} - ${code}${scope}.xlsx`;
  return `${title} ${monthNameOf(Number(year), Number(thisMonth))} ${year} - ${code}${thisMonth}${year}.xlsx`;
}

/** The query the server reads, from a scope: `scope=month&year=2026&month=3`. */
export function scopeQuery(scope: DownloadScope): URLSearchParams {
  if (scope.kind === 'all') return new URLSearchParams({ scope: 'all' });
  if (scope.kind === 'year') return new URLSearchParams({ scope: 'year', year: String(scope.year) });
  return new URLSearchParams({ scope: 'month', year: String(scope.year), month: String(scope.month) });
}

/**
 * Fetches the workbook and saves it, then says so in a toast.
 *
 * A failure is THROWN, not toasted (Sean, 2026-10-02): the Download dialog is
 * still open when it happens and shows it there, beside the button that will
 * try again - a toast would land over the dialog's X. `signal` lets the
 * dialog stop waiting when it is closed mid-download.
 */
export async function downloadReport(
  kind: ReportKind,
  scope: DownloadScope,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${PATH[kind]}?${scopeQuery(scope)}`, {
      headers: { Authorization: `Bearer ${getStoredToken() ?? ''}` },
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error('The server could not be reached. Check the connection and try again.');
  }
  if (!res.ok) throw new Error(await failureMessage(res));

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  const fileName =
    scope.kind === 'all'
      ? reportFileName(kind, 'all')
      : reportFileName(kind, scope.year, propertyToday(), scope.kind === 'month' ? scope.month : null);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  // A download is not a change, so no ping (Sean, 2026-10-01: major actions only).
  showToast('success', 'Report downloaded', `Saved as ${fileName}`, { sound: false });
}

/** The server's own sentence for a refusal it explains (a 422), else the status. */
async function failureMessage(res: Response): Promise<string> {
  if (res.status === 401 || res.status === 403) {
    return 'You are not allowed to download this report. Sign in again and try once more.';
  }
  if (res.status < 500) {
    try {
      const body = await res.json();
      const message = body?.error?.message;
      if (typeof message === 'string' && message) return message;
    } catch {
      // Not JSON: fall through to the status.
    }
  }
  return `The report could not be generated (HTTP ${res.status}).`;
}
