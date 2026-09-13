/**
 * @file utils/validators.ts
 * @description Shared Zod primitives for money, dates and identifiers.
 *
 * WHY `money` EXISTS, AND WHY IT USES `.finite()`
 * ----------------------------------------------
 * `PATCH /api/admin/income-records/:id` read `rentAmount` straight off the request
 * body and passed it through `Number()` with no schema. That looks harmless
 * because the column is `numeric NOT NULL CHECK (rent_amount >= 0)`.
 *
 * It is not harmless. **PostgreSQL sorts `NaN` as greater than every other
 * numeric**, so `'NaN'::numeric >= 0` evaluates to TRUE and the CHECK constraint
 * lets it through. Verified directly against the live database.
 *
 * The consequence is not one bad row. `fifty_percent_share` and `remitted_amount`
 * are `GENERATED ALWAYS AS` columns derived from `rent_amount`, so both become
 * NaN too - and any `SUM()` over the ledger returns NaN from then on. A single
 * malformed request would make every income report unreadable, and the CHECK
 * constraint that looks like it prevents exactly this would not have fired.
 *
 * `z.number()` alone rejects NaN but accepts `Infinity`, which has the same
 * property (`'Infinity'::numeric >= 0` is also true). `.finite()` rejects both.
 */
import { z } from 'zod';

/**
 * A monetary amount. Finite, not negative, at most two decimal places, and
 * bounded well below the `numeric(10,2)` column ceiling of 99,999,999.99.
 */
export const money = z
  .number({ invalid_type_error: 'must be a number' })
  .finite('must be a finite number - NaN and Infinity are not amounts')
  .min(0, 'cannot be negative')
  .max(99_999_999.99, 'is larger than this system records')
  .refine(
    (n) => Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
    'cannot have more than two decimal places'
  );

/** A strictly positive amount - a payment of zero is not a payment. */
export const positiveMoney = money.refine((n) => n > 0, 'must be greater than zero');

/** A headcount. Whole, not negative, and capped at something a room could hold. */
export const occupantCount = z
  .number({ invalid_type_error: 'must be a number' })
  .int('must be a whole number')
  .min(0, 'cannot be negative')
  .max(50, 'is implausible for a single unit');

/** An ISO date, `YYYY-MM-DD`, that is also a real calendar date. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be formatted YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'is not a real date');

/** A UUID, for path and body identifiers. */
export const uuid = z.string().uuid('must be a UUID');

/** Free text with a sane ceiling, trimmed. Rejects an all-whitespace value. */
export const shortText = (max = 255) =>
  z.string().trim().min(1, 'cannot be empty').max(max, `cannot exceed ${max} characters`);

/** Optional free text: absent, or non-empty after trimming. */
export const optionalText = (max = 255) => shortText(max).optional();
