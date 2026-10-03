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
 * The name a downloaded workbook is saved under: what it is and the period it
 * holds (Loyd, 2026-10-03) - "Monthly Income August 2026", "Monthly Income
 * 2026", and for everything the years it spans, "Monthly Income 2024-2026".
 * No reference after a dash, no "only", and this year's file is named for the
 * year, not this month. The server names its attachment the same way
 * (backend/src/utils/reportFileName.ts), so the two agree; change one, change both.
 */
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
  options: { signal?: AbortSignal; years?: number[] } = {}
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

  const blob = await res.blob();
  const fileName =
    scope.kind === 'all'
      ? reportFileName(kind, 'all', propertyToday(), null, options.years)
      : reportFileName(kind, scope.year, propertyToday(), scope.kind === 'month' ? scope.month : null);

  /*
   * "Even when I cancel it still shows success" (Sean, 2026-10-02). A plain <a download> cannot
   * tell the page whether the browser's own Save dialog was cancelled. Where the browser has a
   * save picker (Chrome and Edge on a computer), use it: it reports a cancel, and success is said
   * only once the file is written. It needs the tap's user activation, which a slow download can
   * outlive; then (and everywhere else - phones, Safari, Firefox) the plain download runs, and the
   * message says it started rather than claiming it was saved.
   */
  type SavePicker = (o: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{
    createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }>;
  }>;
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: fileName,
        types: [{ description: 'Excel workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      // A download is not a change, so no ping (Sean, 2026-10-01: major actions only).
      showToast('success', 'Report downloaded', `Saved as ${fileName}`, { sound: false });
      return;
    } catch (err) {
      // Cancelled in the Save window: nothing was saved, so nothing to announce.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Activation expired or the picker refused: fall through to the plain download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('info', 'Download started', fileName, { sound: false });
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
