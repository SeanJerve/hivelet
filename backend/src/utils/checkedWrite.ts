/**
 * @file utils/checkedWrite.ts
 * @description Two ways to not ignore a failed database write.
 *
 * WHY THIS EXISTS
 * ---------------
 * supabase-js does not throw. Every call returns `{ data, error }`, so this
 *
 *     await db.from('bills').update({ status: 'Due' }).eq('id', billId);
 *
 * is indistinguishable from success at the call site: `await` resolves, the
 * handler continues, and the response says the operation worked. A sweep of
 * `backend/src` found **23** writes in that shape.
 *
 * The consequences were not uniform, which is the whole point of having two
 * helpers rather than one rule:
 *
 *   - The `bills` revert above runs when an administrator REJECTS a payment. If
 *     it fails, the payment is declined and the bill still reads Paid. Nobody
 *     chases the debt, because as far as the system is concerned there isn't
 *     one. That must fail loudly.
 *   - A notification insert that fails after a settlement has committed must
 *     NOT fail loudly. Throwing there would report a successful payment as an
 *     error and invite the administrator to record it a second time.
 *
 * So: `assertWritten` for anything whose failure leaves the data wrong, and
 * `warnIfWriteFailed` for anything secondary to a write that already committed.
 * Both take the same shape, so choosing between them is a deliberate act at each
 * call site rather than a default.
 */
import { ApiError } from './ApiError.js';

/** What every supabase-js mutation resolves to, narrowed to what matters here. */
interface WriteResult {
  error: { message: string; code?: string | null } | null;
}

/**
 * Throws when the write failed. For writes whose failure corrupts state — a bill
 * status, a tenancy, a unit's occupancy.
 *
 * @param result what the query resolved to
 * @param what   what was being written, phrased for the administrator reading
 *               the error: "this unit's status could not be updated"
 */
export function assertWritten(result: WriteResult, what: string): void {
  if (result.error) {
    throw ApiError.internal(`${what}: ${result.error.message}`);
  }
}

/**
 * Logs when the write failed, and carries on. For writes that are secondary to
 * one which has already committed — a notification, an activity message.
 *
 * Deliberately not silent: the previous behaviour was to discard the result
 * entirely, so a gateway or permissions problem that stopped every notification
 * in the system would produce no signal anywhere.
 */
export function warnIfWriteFailed(result: WriteResult, what: string): void {
  if (result.error) {
    console.warn(`[hivelet] ${what} failed: ${result.error.message}`);
  }
}

/**
 * Did this write lose to a unique index, and to WHICH one?
 *
 * A pre-check before an insert answers the ordinary case well: the caller gets
 * "a profile with this email already exists" rather than a constraint name. It
 * cannot answer the race. Two requests that interleave both read "not found"
 * and both insert, and the second one comes back as a bare 500 carrying
 * `duplicate key value violates unique constraint "..."` to whoever is looking
 * at the screen.
 *
 * That is not hypothetical here. It is the shape of every duplicate this
 * project has actually had: a double-click recorded one receipt five times
 * (migration 033), two taps on Pay could raise one bill twice (038), and Adyen
 * retries a notification precisely when the first attempt has not answered yet
 * (024). **No amount of checking before inserting closes a race between two
 * connections** - the index is the guard, and this is how a handler recognises
 * the index having done its job.
 *
 * Matched on the index NAME and not on 23505 alone, deliberately. A different
 * unique violation on the same table is a different bug, and swallowing it as
 * "someone beat us to it" would hide it. Callers name the index they expect.
 */
export function uniqueViolationOn(
  err: { code?: string; message?: string } | null | undefined,
  indexName: string
): boolean {
  return err?.code === '23505' && String(err?.message ?? '').includes(indexName);
}
