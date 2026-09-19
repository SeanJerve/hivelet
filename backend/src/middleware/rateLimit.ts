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
 * WHY `POST /auth/login` IS NOT WRAPPED IN THIS
 * ---------------------------------------------
 * Considered and declined, 2026-09-17.
 *
 * The control that matters there already exists and is stronger: `profiles`
 * carries `failed_login_count` and `locked_until`, so guessing is stopped per
 * ACCOUNT rather than per address - which is the direction that actually
 * protects a resident, since an attacker can change address far more easily
 * than they can change whose account they are guessing at.
 *
 * Adding a per-IP limit on top would mostly limit US. `check:api` and
 * `check:reports` sign in on every run, and `npm run check:all` is run many
 * times an hour while working. A limit loose enough not to break that is loose
 * enough not to matter; a limit tight enough to matter breaks the suites. Days
 * before a defense, that trade is not worth making.
 *
 * Worth revisiting when the system is deployed somewhere the verification
 * suites are not hammering it.
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
