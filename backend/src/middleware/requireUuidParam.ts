/**
 * @file middleware/requireUuidParam.ts
 * @description Rejects an id-shaped route parameter that is not actually a UUID,
 *              before any handler reaches the database with it.
 *
 * WHY THIS EXISTS
 * ----------------
 * Nearly every route in `routes/admin.ts` and `routes/tenant.ts` takes an id
 * from the URL — `:profileId`, `:roomId`, `:ticketId`, a bare `:id` — and passes
 * it straight into a Supabase `.eq('id', req.params.xxx)` (or `.eq('*_id', …)`)
 * query. Every one of those columns is `uuid`, and PostgreSQL does not quietly
 * treat a non-UUID string as "no match" — it refuses the comparison outright
 * with its own `22P02 invalid input syntax for type uuid` error. Nothing in
 * this codebase caught that before it reached the database, so a stale link, a
 * typo'd id, or `"undefined"` from a broken frontend call came back as
 * `ApiError.internal(error.message)` — a bare 500 carrying a raw Postgres error
 * string to whoever sent it, for what is almost always a stale link rather than
 * a fault in the system.
 *
 * `PATCH /admin/tenants/:profileId` had already met this exact problem once and
 * answered it with a one-off inline regex
 * (`/^[0-9a-f]{8}-[0-9a-f]{4}-…$/i.test(req.params.profileId)`), duplicated
 * nowhere else. This middleware is that same check, generalised, and built on
 * the `uuid` Zod schema `utils/validators.ts` already exports and already uses
 * to validate UUIDs arriving in request bodies — one rule for "is this a
 * UUID", not two.
 *
 * WHY A 404, NOT A 400
 * --------------------
 * Matches the wording the inline check above already chose, and every other
 * "the thing you asked for by id doesn't exist" handler in these two files:
 * `ApiError.notFound(...)`. A caller cannot tell "malformed id" from
 * "well-formed id, no such row" from the response, which is the point — it is
 * not this system's job to confirm which UUID shapes it recognises to a caller
 * that has no business probing that.
 *
 * WHERE THIS RUNS
 * ----------------
 * Mounted per-route, positioned after `requirePermission` (or
 * `requireSelfOrAdmin`) and before the handler, the same way those guards are
 * already composed in `routes/admin.ts` and `routes/tenant.ts`:
 *
 *   router.patch(
 *     '/admin/rooms/:roomId',
 *     requirePermission(PERMISSIONS.ROOM_MANAGE),
 *     requireUuidParam('roomId', 'Room'),
 *     asyncHandler(async (req, res) => { ... })
 *   );
 *
 * so reading a route's middleware chain tells you everything checked about it
 * without following a separate list. It runs before the handler's first
 * database read, so a malformed id never reaches a query.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { uuid } from '../utils/validators.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Requires `req.params[paramName]` to be shaped like a UUID.
 *
 * `resourceLabel` names the thing being looked up — "Room", "Tenant profile",
 * "Ticket" — so the 404 reads the same as every genuine "no such row" answer
 * elsewhere in these routers, rather than inventing a new shape for the one
 * case where the id was malformed rather than merely absent.
 */
export function requireUuidParam(paramName: string, resourceLabel: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (!uuid.safeParse(value).success) {
      next(ApiError.notFound(`${resourceLabel} ${value} not found.`));
      return;
    }
    next();
  };
}
