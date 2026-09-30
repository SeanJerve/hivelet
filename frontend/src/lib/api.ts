/**
 * @file lib/api.ts
 * @description Typed HTTP client for the Hivelet API.
 * @architectureRef 04_ARCHITECTURE.md — the frontend never talks to Supabase
 *                  directly; every read and write goes through the Express API
 *                  so that authorization is enforced server-side.
 */

/// <reference types="vite/client" />

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5000/api';
const TOKEN_STORAGE_KEY = 'hivelet.auth.token';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(status: number, error: ApiErrorShape) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }

  /**
   * "Your session is over" - NOT "the password you just typed is wrong".
   *
   * `INVALID_CREDENTIALS` is deliberately excluded. The backend returns it with
   * a 401 in exactly two places, and in both the caller SUPPLIED a password that
   * did not match:
   *
   *   POST /auth/login             - a wrong password on the sign-in form
   *   POST /auth/change-password   - a wrong CURRENT password
   *
   * Neither means the token is dead. Treating them as a session failure fires
   * `onAuthFailure`, so signing in with a typo would trigger a "logged out"
   * path, and getting your current password wrong while changing it would end
   * the session you are sitting in - losing the form instead of saying
   * "that is not your current password".
   *
   * This has never misfired, because `setAuthFailureHandler` is exported and
   * nothing has ever called it, so `onAuthFailure` is null. It is a trap laid
   * for whoever wires it up - which the exported setter plainly invites.
   */
  get isAuthFailure(): boolean {
    if (this.code === 'INVALID_CREDENTIALS') return false;
    return (
      this.status === 401 ||
      this.code === 'TOKEN_EXPIRED' ||
      this.code === 'TOKEN_INVALID' ||
      this.code === 'ACCOUNT_INACTIVE'
    );
  }
}

/**
 * A write that hit the deadline in `request` below (`TIMEOUT`) may already be
 * saved. Its message says so, but the owner's screens put their own title above
 * it - "Not saved", "Payment not recorded" - and the record-payment toast added
 * "Nothing was written to the ledger". Told that, she records it again, and a
 * second expense or note is a duplicate row. The tenant screens were fixed for
 * this in 52e374b; these are the owner's, found reviewing it 2026-09-29.
 */
export function isUnconfirmed(err: unknown): boolean {
  return err instanceof ApiRequestError && err.code === 'TIMEOUT';
}

/** The toast title for a failed write: the caller's own, unless it may have saved. */
export function failureTitle(err: unknown, title: string): string {
  return isUnconfirmed(err) ? 'Not confirmed' : title;
}

export function getStoredToken(): string | null {
  try {
    const sessionToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (sessionToken) return sessionToken;
    const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (localToken) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, localToken);
      return localToken;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage disabled fallback
  }
}

// Handed the refusal itself, so the handler can tell a moved-out account
// (ACCOUNT_INACTIVE) from an expired session.
let onAuthFailure: ((error: ApiRequestError) => void) | null = null;

export function setAuthFailureHandler(handler: (error: ApiRequestError) => void): void {
  onAuthFailure = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

/** The full `{ success, data, meta? }` envelope the API returns. */
interface Envelope<T, M = Record<string, unknown>> {
  data: T;
  meta?: M;
}

async function requestEnvelope<T, M = Record<string, unknown>>(
  path: string,
  options: RequestOptions = {}
): Promise<Envelope<T, M>> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  /**
   * A deadline, because a weak signal does not fail - it stalls. With none, a
   * tenant on one bar pressed Send and watched "Sending…" for as long as the
   * browser cared to wait (minutes, in Chrome), with the button disabled and
   * nothing to say whether to wait or walk away. Found 2026-09-29 auditing the
   * semi-offline case before the tenant acceptance test.
   *
   * A read that times out changed nothing, so it is reported as the same
   * `NETWORK_ERROR` every screen already words for a dropped connection. A
   * WRITE that times out may still have reached the server and been saved - the
   * abort stops the waiting, not the request already sent - so it gets its own
   * `TIMEOUT` code and says so, rather than inviting a second, duplicate send.
   * 25 s and 45 s sit well above what the API answers in (p95 under 1 s under
   * six concurrent readers, measured the same day) and inside the hosting
   * platform's own function limit.
   */
  const isRead = method === 'GET';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), isRead ? 25_000 : 45_000);

  let response: Response;
  let text: string;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    text = await response.text();
  } catch (cause) {
    if (controller.signal.aborted && !isRead) {
      console.warn(`[api] ${method} ${API_BASE}${path.split('?')[0]} timed out after 45 s`);
      throw new ApiRequestError(0, {
        code: 'TIMEOUT',
        message:
          'The server took too long to answer, so we cannot tell whether this was saved. ' +
          'Check the list before trying again, so it is not sent twice.',
      });
    }
    /**
     * The message reaches residents verbatim wherever a screen shows
     * `error.message`, so it is written for them. It said "Check that the API
     * is running", which is advice for a developer and none a tenant with no
     * signal can act on (B-61). The developer's half - which address failed,
     * and the browser's own reason - goes to the console instead, without the
     * query string, which can carry a search term or an email address.
     *
     * `NETWORK_ERROR` and status 0 are load-bearing: `isAuthFailure` is false
     * for them, which is what keeps `authStore.restoreSession` from signing out
     * a resident who opens the installed app offline. LoginView and
     * inquiryRules.ts also map this code to their own wording.
     */
    console.warn(`[api] ${method} ${API_BASE}${path.split('?')[0]} did not reach the server:`, cause);
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR',
      message: 'We could not reach the server. Check your connection and try again.',
    });
  } finally {
    clearTimeout(timer);
  }

  /**
   * A body that is not JSON is a transport failure, not a caller's mistake.
   *
   * `JSON.parse` was called bare here, so anything that is not this API's
   * envelope threw a raw `SyntaxError` - which is NOT an `ApiRequestError` and
   * therefore escapes every `instanceof` check downstream. The visible cost was
   * in `authStore.login`, whose catch reads
   *
   *     if (error instanceof ApiRequestError) authError.value = error.message;
   *     else authError.value = 'Sign-in failed. Please check credentials.';
   *
   * so a `502 Bad Gateway` HTML page told the resident their PASSWORD was
   * wrong. That is not a hypothetical page: CLAUDE.md has whoever is testing
   * pointing a `cloudflared` tunnel at their own laptop, and a tunnel with
   * nothing behind it answers in HTML, as do the proxy and the dev server when
   * the API is down.
   *
   * It also skipped `isAuthFailure`, so a 401 whose body was not JSON never
   * reached `onAuthFailure` at all.
   *
   * The status is already in hand, so an unparseable body still produces an
   * `ApiRequestError` carrying it. Only the envelope is unavailable, not the
   * fact that the request failed.
   */
  // `text` was read inside the timed block above: a stall can come after the
  // status line, while the body is still arriving.
  let payload: Record<string, unknown>;
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    const unreadable = new ApiRequestError(response.status, {
      code: response.ok ? 'MALFORMED_RESPONSE' : 'UNKNOWN',
      message: response.ok
        ? 'The server sent a reply the application could not read.'
        : `Request failed with status ${response.status}.`,
    });
    // Same handling a parseable failure gets. A 401 is a dead session whether or
    // not whatever answered it could be read.
    if (unreadable.isAuthFailure) onAuthFailure?.(unreadable);
    throw unreadable;
  }

  if (!response.ok) {
    const error = (payload.error as ApiErrorShape | undefined) ?? {
      code: 'UNKNOWN',
      message: `Request failed with status ${response.status}.`,
    };
    const apiError = new ApiRequestError(response.status, error);

    if (apiError.isAuthFailure) onAuthFailure?.(apiError);
    throw apiError;
  }

  return { data: payload.data as T, meta: payload.meta as M | undefined };
}

/** The common case: just the rows. */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await requestEnvelope<T>(path, options)).data;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET', auth }),
  /**
   * For endpoints that report totals alongside the rows - the audit log says how
   * many events exist in the whole table, which a 100-row window cannot tell you.
   */
  getWithMeta: <T, M = Record<string, unknown>>(path: string, auth = true) =>
    requestEnvelope<T, M>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body, auth }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { API_BASE };
