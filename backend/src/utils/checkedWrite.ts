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
