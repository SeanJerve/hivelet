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

/**
 * `express.json()` refuses some bodies before any route sees them, and those
 * are CLIENT errors that carry their own status: `entity.too.large` is a 413,
 * a body that is not JSON is a 400.
 *
 * They are not `ApiError`s, so everything below called them **500 Internal
 * server error**. Measured, not supposed: a 1.04 MB body answered `500
 * INTERNAL`, and so did `{"broken":`. Two consequences worth the fix - a
 * resident attaching a photo from a phone is told the system broke, when what
 * happened is that the photo was too big and nothing is wrong with the system;
 * and a genuine 500 stops meaning anything, because the commonest way to see
 * one is to send a large request.
 *
 * Only body-parser's own shape is trusted (a `type` string beside a 4xx
 * `status`), and only far enough to choose a status. The message is written
 * here rather than passed through, because the library's own text quotes the
 * configured limit back at the caller.
 */
type BodyParserError = Error & { type?: string; status?: number; statusCode?: number };

function bodyParserFailure(
  err: Error
): { status: number; code: string; message: string } | null {
  const e = err as BodyParserError;
  const status = e.status ?? e.statusCode;
  if (typeof e.type !== 'string' || typeof status !== 'number') return null;
  if (status < 400 || status >= 500) return null;

  if (e.type === 'entity.too.large') {
    return {
      status: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message:
        'That request is larger than this server accepts. If you were attaching a photo, it ' +
        'is too large to send - use a smaller one, or file the request first and add the ' +
        'photo as a reply.',
    };
  }

  return {
    status,
    code: 'BAD_REQUEST',
    message: 'The request body could not be read.',
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isApiError = err instanceof ApiError;
  const bodyFailure = isApiError ? null : bodyParserFailure(err);
  const statusCode = isApiError ? err.statusCode : (bodyFailure?.status ?? 500);
  const code = isApiError ? err.code : (bodyFailure?.code ?? 'INTERNAL');

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
      // A body-parser refusal gets the message written above rather than the
      // library's, which quotes the configured limit back at the caller.
      message:
        statusCode >= 500
          ? 'Internal server error.'
          : (bodyFailure?.message ?? err.message),
      ...(isApiError && err.details ? { details: err.details } : {}),
      ...(config.isProduction || statusCode < 500 ? {} : { stack: err.stack }),
    },
  });
}
