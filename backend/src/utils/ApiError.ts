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
  | 'SESSION_SUPERSEDED'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'NOT_IMPLEMENTED'
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
    //
    // THIS IS NOT COMPLETE, AND THE GAP IS DELIBERATE. `accountLocked` below
    // answers 429 where this answers 401, and only a real account can be
    // locked - so five wrong guesses and a sixth attempt will tell a caller
    // whether an address belongs to a resident. See the block in
    // `authService.login` that raises it, and § 3.8 of the judgement log.
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

  /**
   * A valid token, but issued before this profile's most recent password
   * change (B-64 decision 3). Same 401 shape as `TOKEN_EXPIRED`/`TOKEN_INVALID`
   * so `ApiRequestError.isAuthFailure` on the frontend catches it without any
   * change there - it checks `status === 401` for any code other than
   * `INVALID_CREDENTIALS`, and this is a genuinely distinct code only so the
   * reason is legible in logs and `audit_logs`, not because the client branches
   * on it.
   */
  static sessionSuperseded() {
    return new ApiError(
      401,
      'SESSION_SUPERSEDED',
      'Your password was changed. Sign in again on this device.'
    );
  }

  /**
   * 428 Precondition Required. B-63/B-64: an account issued a one-time
   * onboarding password (`must_change_password`) may reach only the handful of
   * routes that let it get unstuck - see `requirePasswordCurrent` in
   * `middleware/auth.ts` for exactly which ones and why.
   */
  static passwordChangeRequired() {
    return new ApiError(
      428,
      'PASSWORD_CHANGE_REQUIRED',
      'Set your own password before continuing.'
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

  /**
   * 429. Used by the per-IP limiter on the one endpoint a stranger can write
   * through. The message names the wait, because a limit that cannot be waited
   * out reads as a broken form.
   *
   * `RATE_LIMITED` was already in `ApiErrorCode` and had never been used by
   * anything - the code was reserved for this and the limiter was never built.
   */
  static tooManyRequests(message: string) {
    return new ApiError(429, 'RATE_LIMITED', message);
  }

  /**
   * The route is real and the request was fine; the database half of the feature
   * is not installed yet.
   *
   * Used where a migration has been written but has to be applied by a person -
   * 029, the several-months ledger write. A 500 would say the system broke and a
   * 400 would say the caller did something wrong, and neither is true.
   */
  static notImplemented(message: string) {
    return new ApiError(501, 'NOT_IMPLEMENTED', message);
  }

  static internal(message = 'Internal server error.') {
    return new ApiError(500, 'INTERNAL', message);
  }
}
