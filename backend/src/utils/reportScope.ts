import { ApiError } from './ApiError.js';
import { queryInt } from './validators.js';

/**
 * What a Download covers: one month, one year, or everything (Sean, 2026-10-02:
 * "a dialog pops up to confirm what she wants to download - for one month
 * (which month), for a year (which year), or everything").
 *
 * The three workbooks (income, expenses, tenant history) take the same three
 * scopes, so the query is read in one place and every route answers a bad one
 * the same way.
 */
export type ReportScope =
  | { kind: 'month'; year: number; month: number }
  | { kind: 'year'; year: number }
  | { kind: 'all' };

const KINDS = ['month', 'year', 'all'] as const;

/**
 * `?scope=month&year=YYYY&month=M`, `?scope=year&year=YYYY`, `?scope=all`.
 *
 * Every parameter is optional so the calls made before the dialog existed keep
 * their meaning (Sean, 2026-10-02): no `scope` is a year (`?year=`, default the
 * property's year), or a month when `month` is sent - which is exactly what the
 * tenant history did already, and what a `month` on the ledgers now means
 * rather than being silently ignored.
 *
 * Refused with the same 422 VALIDATION_FAILED as `queryInt`, not a 400, because
 * that is what every query number in this API answers and what `check:api`
 * asserts for `?year=1999` - one route speaking two dialects for one mistake
 * would be worse than either. A parameter that does not belong to the scope
 * (a `month` with `scope=year`, a `year` with `scope=all`) is refused rather
 * than ignored: the file would otherwise not be the one that was asked for,
 * and nothing on it would say so.
 */
export function parseReportScope(query: Record<string, unknown>, defaultYear: number): ReportScope {
  const rawScope = query.scope;
  if (rawScope !== undefined && (typeof rawScope !== 'string' || !(KINDS as readonly string[]).includes(rawScope))) {
    throw ApiError.validation('Invalid scope.', { scope: ['must be month, year or all'] });
  }

  const year = queryInt(query.year, { fieldName: 'year', min: 2000, max: 2100 });
  const month = queryInt(query.month, { fieldName: 'month', min: 1, max: 12 });
  const kind = (rawScope as ReportScope['kind'] | undefined) ?? (month !== undefined ? 'month' : 'year');

  if (kind === 'all') {
    if (year !== undefined || month !== undefined) {
      throw ApiError.validation('A download of everything takes no year or month.', {
        scope: ['all takes no year or month'],
      });
    }
    return { kind: 'all' };
  }

  if (kind === 'year') {
    if (month !== undefined) {
      throw ApiError.validation('A year download takes no month; use scope=month.', {
        month: ['only used with scope=month'],
      });
    }
    return { kind: 'year', year: year ?? defaultYear };
  }

  if (month === undefined) {
    throw ApiError.validation('A month download needs the month.', { month: ['is required with scope=month'] });
  }
  return { kind: 'month', year: year ?? defaultYear, month };
}

/** A bare year still means that year, so callers written before scopes keep working. */
export function asScope(scopeOrYear: ReportScope | number, month: number | null = null): ReportScope {
  if (typeof scopeOrYear !== 'number') return scopeOrYear;
  return month === null ? { kind: 'year', year: scopeOrYear } : { kind: 'month', year: scopeOrYear, month };
}

/** The same range check every builder made for itself, now for a scope. */
export function assertScope(scope: ReportScope): void {
  if (scope.kind === 'all') return;
  if (!Number.isInteger(scope.year) || scope.year < 2000 || scope.year > 2100) {
    throw ApiError.validation('A four-digit year is required.', { year: ['must be between 2000 and 2100'] });
  }
  if (scope.kind === 'month' && (!Number.isInteger(scope.month) || scope.month < 1 || scope.month > 12)) {
    throw ApiError.validation('A month from 1 to 12 is required.', { month: ['must be from 1 to 12'] });
  }
}

/** What the audit row records about the download, and the id it is filed under. */
export function scopeAudit(scope: ReportScope): { entityId: string; values: Record<string, unknown> } {
  if (scope.kind === 'all') return { entityId: 'all', values: { scope: 'all' } };
  if (scope.kind === 'year') return { entityId: String(scope.year), values: { scope: 'year', year: scope.year } };
  return {
    entityId: String(scope.year),
    values: { scope: 'month', year: scope.year, month: scope.month },
  };
}

/** The arguments `attachmentHeader` takes, from a scope. */
export function scopeName(scope: ReportScope): { scope: string | number; month: number | null } {
  if (scope.kind === 'all') return { scope: 'all', month: null };
  return { scope: scope.year, month: scope.kind === 'month' ? scope.month : null };
}
