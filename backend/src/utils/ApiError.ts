/**
 * @file utils/ApiError.ts
 * @description Typed HTTP errors with stable machine-readable codes.
 * @rationale Authorization failures must be distinguishable by the client
 *            (401 -> log in, 403 -> you are logged in but not permitted)
 *            without leaking why a record was withheld.
 */
export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_INACTIVE'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static validation(message: string, details?: unknown) {
    return new ApiError(422, 'VALIDATION_FAILED', message, details);
  }

  static unauthenticated(message = 'Authentication required.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static invalidCredentials() {
    // Same message for unknown email and wrong password: distinguishing them
    // would let an attacker enumerate which tenants have accounts.
    return new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  static accountInactive() {
    // BR-025: a vacated tenant's account is deactivated and loses access.
    return new ApiError(
      403,
      'ACCOUNT_INACTIVE',
      'This account is inactive. Contact the administrator.'
    );
  }

  static accountLocked(minutes: number) {
    return new ApiError(
      429,
      'ACCOUNT_LOCKED',
      `Too many failed attempts. Try again in ${minutes} minute(s).`
    );
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }

  static internal(message = 'Internal server error.') {
    return new ApiError(500, 'INTERNAL', message);
  }
}
