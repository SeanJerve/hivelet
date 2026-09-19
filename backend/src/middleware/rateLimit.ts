/**
 * @file middleware/rateLimit.ts
 * @description A small per-IP limiter for the one endpoint a stranger can write through.
 *
 * WHY THIS EXISTS
 * ---------------
 * `POST /api/public/inquiries` was the first endpoint to need it. The other
 * writes in `routes/public.ts` do not: the local cashier completion answers 404
 * whenever a gateway is configured, and the Adyen webhook requires Basic Auth
 * and a valid HMAC signature.
 *
 * **This header used to say inquiries was "the only genuinely open write in the
 * system", and that was wrong** - corrected 2026-09-19. The sentence was true of
 * the file it had counted, `routes/public.ts`, and `POST /api/auth/register` is
 * in `routes/auth.ts`. It is public, it takes no token, it inserts a live
 * `profiles` row with `role: 'tenant'` and `account_status: 'active'`, and it
 * ran bcrypt for every caller who asked. It is wrapped in this now too.
 *
 * The lesson is the one the judgement log keeps recording: a completeness claim
 * is only as good as its idea of where the thing being counted may live, and
 * this one could not have found its own counterexample. **Two endpoints use
 * this now, which is the condition the note below set for revisiting
 * `express-rate-limit`** - still declined, for the same reason, but it is no
 * longer a one-endpoint guard.
 *
 * The inquiry endpoint is well guarded in every other respect - the payload is
 * length-capped, the room must exist and be Published, and a Reserved room is
 * refused (BR-006). What it had no answer for was the same visitor sending it a
 * thousand times. Nothing would break: no money is touched and no existing row
 * is changed. The administrator would simply arrive to an inbox she cannot use.
 *
 * WHY NOT `express-rate-limit`
 * ---------------------------
 * A new dependency days before a defense, to guard one endpoint, is a worse
 * trade than thirty lines that can be read in full. If a second endpoint ever
 * needs this, that judgement is worth revisiting.
 *
 * WHAT THIS IS NOT
 * ----------------
 * **Per process, and in memory.** Two backend processes would allow twice the
 * traffic, and a restart forgets everything. That is honest for a single-server
 * deployment and would need Redis or a database table to be more than that.
 *
 * It is also **not** a defence against a distributed flood - a thousand
 * addresses sending one request each pass untouched. It stops the realistic
 * case, which is one person or one script, and says so rather than implying
 * more.
 *
 * `POST /auth/login`, AND WHY IT COUNTS FAILURES RATHER THAN REQUESTS
 * -------------------------------------------------------------------
 * A per-IP REQUEST limit on login was considered and declined on 2026-09-17,
 * for a good reason: `check:api` and `check:reports` sign in on every run and
 * `check:all` runs many times an hour, so a limit loose enough not to break the
 * suites is loose enough not to matter.
 *
 * That reasoning was sound and is left standing. What it did not cover is
 * **password spraying**. Per-account lockout - `failed_login_count` and
 * `locked_until` on `profiles` - stops someone guessing many passwords at ONE
 * account. It is blind to the opposite shape: one likely password tried once
 * against each of forty-five accounts. No account ever reaches five failures,
 * so nothing locks, and every attempt costs the server a bcrypt.
 *
 * `failureLimit` resolves the trade instead of splitting it. It counts only
 * attempts that FAILED, so a successful sign-in is never charged to anybody -
 * which means the suites are untouched. Checked before writing it: `check:api`
 * sends no wrong passwords at all. It asserts the SHAPE of the lockout code
 * rather than exercising it, deliberately, so as not to lock the owner's real
 * account.
 *
 * The threshold has to survive one detail of this property: **thirty-two units
 * behind one connection**. Residents on the house wifi share a public address,
 * so their mistyped passwords all land on the same counter. Thirty failures a
 * quarter-hour is generous for that and still leaves an attacker needing weeks
 * for a list they would otherwise walk in minutes.
 */
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { clientIp } from '../services/auditService.js';

interface Window {
  count: number;
  /** When this window opened, in epoch ms. */
  since: number;
}

export interface RateLimitOptions {
  /** How many requests one address may make inside the window. */
  max: number;
  /** The window, in milliseconds. */
  windowMs: number;
  /** Named in the error the caller sees, so the message says what was limited. */
  what: string;
}

/**
 * Counts requests per address in a fixed window.
 *
 * Fixed rather than sliding: a sliding window needs a timestamp per request and
 * this needs to stay small enough to audit by eye. The cost is that a caller can
 * send `max` at the end of one window and `max` at the start of the next. For a
 * limit measured in tens per quarter-hour that is not worth the complexity.
 */
export function rateLimit({ max, windowMs, what }: RateLimitOptions) {
  const seen = new Map<string, Window>();

  /**
   * Bounded memory. Without this the map grows one entry per address forever,
   * which turns a spam defence into a memory leak - a worse bug than the one
   * being fixed.
   */
  const prune = (now: number) => {
    for (const [key, w] of seen) {
      if (now - w.since > windowMs) seen.delete(key);
    }
  };

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (seen.size > 5000) prune(now);

    const key = clientIp(req) ?? 'unknown';
    const window = seen.get(key);

    if (!window || now - window.since > windowMs) {
      seen.set(key, { count: 1, since: now });
      next();
      return;
    }

    window.count += 1;
    if (window.count > max) {
      const waitMinutes = Math.max(1, Math.ceil((windowMs - (now - window.since)) / 60_000));
      next(
        ApiError.tooManyRequests(
          `Too many ${what} from this connection. Try again in about ` +
            `${waitMinutes} minute${waitMinutes === 1 ? '' : 's'}.`
        )
      );
      return;
    }

    next();
  };
}

/**
 * Counts only the attempts that failed, and refuses once an address is over
 * budget.
 *
 * Two pieces, because middleware runs before the handler and cannot know the
 * outcome: the middleware itself REFUSES a caller already over budget, and
 * `.record(req)` is called by the handler when an attempt actually failed.
 * Nothing is counted until something goes wrong, so an address that only ever
 * signs in successfully never accumulates anything.
 *
 * Same honest limits as `rateLimit` above: per process, in memory, forgotten on
 * restart, and no defence against a flood from a thousand addresses. It stops
 * one person or one script working through a list.
 */
export function failureLimit({ max, windowMs, what }: RateLimitOptions) {
  const failures = new Map<string, Window>();

  const prune = (now: number) => {
    for (const [key, w] of failures) {
      if (now - w.since > windowMs) failures.delete(key);
    }
  };

  const middleware = (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (failures.size > 5000) prune(now);

    const window = failures.get(clientIp(req) ?? 'unknown');
    if (!window || now - window.since > windowMs) {
      next();
      return;
    }

    if (window.count >= max) {
      const waitMinutes = Math.max(1, Math.ceil((windowMs - (now - window.since)) / 60_000));
      next(
        ApiError.tooManyRequests(
          `Too many ${what} from this connection. Try again in about ` +
            `${waitMinutes} minute${waitMinutes === 1 ? '' : 's'}. ` +
            'If this is not you, your account itself is not affected.'
        )
      );
      return;
    }

    next();
  };

  /** Call after an attempt that genuinely failed. */
  middleware.record = (req: Request): void => {
    const now = Date.now();
    const key = clientIp(req) ?? 'unknown';
    const window = failures.get(key);

    if (!window || now - window.since > windowMs) {
      failures.set(key, { count: 1, since: now });
      return;
    }
    window.count += 1;
  };

  return middleware;
}
