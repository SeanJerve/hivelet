/**
 * @file lib/rowOrder.ts
 * @description The "Order" choice every list's Filters offers (Sean, 2026-10-02: "Tenants: Filters
 *   > Order - by name or by unit - apply this to all tables"). One comparison per order, so every
 *   list arranges its rows the same way: units naturally (1A, 1B ... 3G, then the named units, no
 *   unit last), names A to Z, dates newest first.
 */
import type { FilterOption } from '@/components/ui/listToolbar';

export type RowOrder = 'unit' | 'name' | 'newest' | 'oldest';

export const ORDER_LABELS: Record<RowOrder, string> = {
  unit: 'By unit',
  name: 'By name (A to Z)',
  newest: 'Newest first',
  oldest: 'Oldest first',
};

/** The Filters options for the orders a list supports, in the order given. */
export function orderOptions(orders: readonly RowOrder[]): FilterOption[] {
  return orders.map((o) => ({ value: o, label: ORDER_LABELS[o] }));
}

export function compareUnits(a: string | null | undefined, b: string | null | undefined): number {
  const x = (a ?? '').trim();
  const y = (b ?? '').trim();
  if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1);
  return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
}

const time = (v: string | number | Date | null | undefined) => {
  if (v == null || v === '') return NaN;
  const t = v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v);
  return Number.isNaN(t) ? NaN : t;
};

/**
 * A sorted copy of `rows`. Each getter is optional; an order whose getter a list does not give
 * leaves the rows as they came (the list's own default order).
 */
export function sortRows<T>(
  rows: readonly T[],
  order: RowOrder,
  get: { unit?: (r: T) => string | null | undefined; name?: (r: T) => string | null | undefined; date?: (r: T) => string | number | Date | null | undefined }
): T[] {
  const byName = (a: T, b: T) => (get.name ? (get.name(a) ?? '').localeCompare(get.name(b) ?? '') : 0);
  const byDate = (a: T, b: T) => {
    if (!get.date) return 0;
    const x = time(get.date(a));
    const y = time(get.date(b));
    if (Number.isNaN(x) || Number.isNaN(y)) return (Number.isNaN(x) ? 1 : 0) - (Number.isNaN(y) ? 1 : 0);
    return order === 'oldest' ? x - y : y - x;
  };
  const list = [...rows];
  if (order === 'unit' && get.unit) return list.sort((a, b) => compareUnits(get.unit!(a), get.unit!(b)) || byName(a, b));
  if (order === 'name' && get.name) return list.sort((a, b) => byName(a, b) || compareUnits(get.unit?.(a), get.unit?.(b)));
  if ((order === 'newest' || order === 'oldest') && get.date) return list.sort((a, b) => byDate(a, b) || byName(a, b));
  return list;
}
