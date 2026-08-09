/**
 * @file middleware/errorHandler.ts
 * @description Central error serializer.
 * @systemBibleRef Section 20 (Security)
 * @rationale Authorization failures are audited here, and internal errors are
 *            never echoed verbatim to the client — a Postgres message can leak
 *            schema details to an unauthenticated caller.
 */
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { auditAccessDenied } from '../services/auditService.js';
import { config } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint not found: ${req.method} ${req.path}`,
    },
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const code = isApiError ? err.code : 'INTERNAL';

  // Every 401/403 is an authorization event worth preserving (Section 20).
  if (statusCode === 401 || statusCode === 403) {
    void auditAccessDenied(req, `${code}: ${err.message}`);
  }

  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  } else {
    console.warn(`[${statusCode}] ${req.method} ${req.originalUrl} — ${code}: ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      // A 500 could carry a database message; replace it with a safe string.
      message: statusCode >= 500 ? 'Internal server error.' : err.message,
      ...(isApiError && err.details ? { details: err.details } : {}),
      ...(config.isProduction || statusCode < 500 ? {} : { stack: err.stack }),
    },
  });
}
