/**
 * The five canonical Property Areas of the monthly expense ledger.
 *
 * These strings are the primary key of `public.property_areas`
 * (database/migrations/008_property_areas_lookup.sql) and the exact values stored in
 * `expense_property_allocations.property_area`. Anything else is rejected by the foreign key.
 *
 * Source of truth: docs/10_MONTHLY_EXPENSES_REPORT.md section 2.
 */
export const PROPERTY_AREAS = [
  'Boarding House',
  'Main House',
  'Front Apartment',
  'Back Apartment',
  'Other Expenses / Personal'
] as const;

export type PropertyArea = (typeof PROPERTY_AREAS)[number];

/**
 * Areas that are NOT a cost of running the boarding house.
 *
 * "Main House" is the owner's own residence (OD-05, confirmed 2026-09-13) and "Other Expenses /
 * Personal" is personal by definition. Both are recorded in the same ledger because they share
 * utility bills with the business, but neither may be subtracted from rental income.
 *
 * Mirrors `property_areas.is_rental_expense = FALSE`. Keep the two in step.
 */
export const NON_RENTAL_AREAS: readonly PropertyArea[] = [
  'Main House',
  'Other Expenses / Personal'
] as const;

export function isRentalArea(area: PropertyArea): boolean {
  return !NON_RENTAL_AREAS.includes(area);
}

/**
 * Short forms the UI has historically used, mapped onto canonical values.
 *
 * `frontend/src/views/ExpensesLedgerView.vue` keeps its own `areaMap` and normalises before
 * posting, but the API is reachable directly and the PATCH handler used to accept a raw
 * `a.area` fallback. Accepting the short forms here and normalising them is safer than
 * rejecting a request that is unambiguous.
 */
const ALIASES: Record<string, PropertyArea> = {
  'front apt': 'Front Apartment',
  'back apt': 'Back Apartment',
  'other': 'Other Expenses / Personal',
  'other expenses': 'Other Expenses / Personal',
  'personal': 'Other Expenses / Personal',
  'bh': 'Boarding House',
  'boarding house expenses': 'Boarding House',
  'main house expenses': 'Main House',
  'front apartment expenses': 'Front Apartment',
  'back apartment expenses': 'Back Apartment'
};

/**
 * Resolves a caller-supplied area to a canonical value, or returns null if it cannot be resolved.
 * Callers MUST reject on null before performing any write.
 */
export function normalizePropertyArea(raw: unknown): PropertyArea | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const exact = PROPERTY_AREAS.find(a => a.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  return ALIASES[trimmed.toLowerCase()] ?? null;
}
