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
  z
    .string()
    .trim()
    .min(1, 'cannot be empty')
    .max(max, `cannot exceed ${max} characters`)
    /**
     * A `text` column cannot hold a NUL. Sending one reached the database and
     * came back as a bare 500 "Internal server error." - verified by putting a
     * NUL inside a payer's name. The caller was told nothing, and the log
     * carried a Postgres encoding error that reads like a fault in the system
     * rather than in the request.
     *
     * Other C0 controls are left alone. A stray tab or newline in a supplier
     * name is untidy but storable, and this validator's job is to stop
     * unstorable input reaching the database, not to tidy her typing.
     */
    .refine((v) => !v.includes(String.fromCharCode(0)), 'cannot contain a null character');

/**
 * A unit code, as the property actually numbers its units.
 *
 * Letters and digits only. Every one of the 33 live units matches - 1a, 2G, B2F,
 * F2B, PH, LF - checked against `rooms`, so this rejects nothing real.
 *
 * It exists because a unit code is not free text to this system: it is fed
 * straight into `.ilike('room_number', code)` in seven places, and `ILIKE` reads
 * `%` and `_` as WILDCARDS. A code of `%` matches every unit at once. Six of the
 * seven end in `.maybeSingle()`, so PostgREST returns "more than one row" and the
 * handler throws - a 500 where the honest answer is "that is not a unit code" -
 * and the seventh takes `.limit(1)`, which silently picks one.
 *
 * Nobody is likely to type `%` on purpose. The point is that the failure is
 * illegible when they do, and a wildcard reaching a lookup that resolves WHICH
 * UNIT a payment or a repair belongs to is the wrong thing to leave to chance.
 * Constraining the input is cheaper than making seven call sites defensive.
 */
export const unitCode = (max = 20) =>
  z
    .string()
    .trim()
    .min(1, 'cannot be empty')
    .max(max, `cannot exceed ${max} characters`)
    .regex(/^[A-Za-z0-9]+$/, 'may contain only letters and digits');

/** Optional free text: absent, or non-empty after trimming. */
export const optionalText = (max = 255) => shortText(max).optional();
