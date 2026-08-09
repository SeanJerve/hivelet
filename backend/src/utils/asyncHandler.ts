/**
 * @file utils/asyncHandler.ts
 * @description Forwards rejected promises from async controllers to Express.
 * @rationale Without this, a thrown ApiError inside an async handler becomes an
 *            unhandled rejection and the request hangs — which on an authorization
 *            check would fail open from the caller's point of view.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
