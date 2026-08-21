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

  get isAuthFailure(): boolean {
    return (
      this.status === 401 ||
      this.code === 'TOKEN_EXPIRED' ||
      this.code === 'TOKEN_INVALID' ||
      this.code === 'ACCOUNT_INACTIVE'
    );
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage disabled fallback
  }
}

let onAuthFailure: (() => void) | null = null;

export function setAuthFailureHandler(handler: () => void): void {
  onAuthFailure = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the Hivelet server. Check that the API is running.',
    });
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    const error = (payload.error as ApiErrorShape | undefined) ?? {
      code: 'UNKNOWN',
      message: `Request failed with status ${response.status}.`,
    };
    const apiError = new ApiRequestError(response.status, error);

    if (apiError.isAuthFailure) onAuthFailure?.();
    throw apiError;
  }

  return payload.data as T;
}

export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body, auth }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { API_BASE };
