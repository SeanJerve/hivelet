/**
 * @file lib/authStore.ts
 * @description Reactive client-side session state and RBAC utilities.
 */
import { computed, reactive, readonly, ref } from 'vue';
import { api, setStoredToken, getStoredToken, ApiRequestError } from './api';

export type Role = 'guest' | 'prospect' | 'tenant' | 'admin';

export interface SessionUser {
  profileId: string;
  email: string;
  fullName: string;
  role: Exclude<Role, 'guest'>;
  accountStatus: 'active' | 'inactive';
  /**
   * True from onboarding until this account's own password replaces the
   * random one-time one it was issued (B-53, migration 048). Re-read on
   * every `restoreSession()`/`/auth/me` call, so it clears the moment a
   * change succeeds without needing a fresh sign-in.
   */
  mustChangePassword: boolean;
}

interface LoginResponse {
  token: string;
  expiresIn: string;
  user: SessionUser;
  permissions: string[];
}

interface MeResponse {
  user: SessionUser;
  profile: Record<string, unknown>;
  permissions: string[];
}

const state = reactive({
  user: null as SessionUser | null,
  permissions: [] as string[],
  profile: null as Record<string, unknown> | null,
});

export const isRestoring = ref(false);
export const isAuthenticating = ref(false);
export const authError = ref<string | null>(null);

export const session = readonly(state);

export const currentUser = computed(() => state.user);
export const isAuthenticated = computed(() => state.user !== null);

export const currentRole = computed<Role>(() => state.user?.role ?? 'guest');
export const isAdmin = computed(() => state.user?.role === 'admin');
export const isTenant = computed(() => state.user?.role === 'tenant');
export const mustChangePassword = computed(() => state.user?.mustChangePassword ?? false);

/**
 * Called the moment ChangePasswordModal's mandatory mode succeeds.
 *
 * The server already cleared `must_change_password` in the same request; this
 * mirrors that locally so the gate lifts immediately rather than waiting on
 * the next `/auth/me` (a page reload, or the next natural request).
 */
export function clearMustChangePassword(): void {
  if (state.user) state.user.mustChangePassword = false;
}

export function can(permission: string): boolean {
  return state.permissions.includes(permission);
}

/**
 * The token has been persisted since this store's beginning; nothing was
 * ever kept alongside it. That is what made "already signed in" and
 * "installed as an offline-capable PWA" contradict each other - see the
 * comment on `restoreSession` below.
 */
const CACHED_SESSION_KEY = 'hivelet_cached_session';

function cacheSessionSnapshot(payload: { user: SessionUser; permissions: string[] }): void {
  try {
    localStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Storage disabled - the token itself still works once back online.
  }
}

function readCachedSessionSnapshot(): { user: SessionUser; permissions: string[] } | null {
  try {
    const raw = localStorage.getItem(CACHED_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applySession(payload: { user: SessionUser; permissions: string[] }): void {
  state.user = payload.user;
  state.permissions = payload.permissions ?? [];
  cacheSessionSnapshot(payload);
}

function clearSession(): void {
  state.user = null;
  state.permissions = [];
  state.profile = null;
  setStoredToken(null);
  try {
    localStorage.removeItem(CACHED_SESSION_KEY);
  } catch {
    // Same storage-disabled case applies here.
  }
}

export async function login(email: string, password: string): Promise<SessionUser> {
  isAuthenticating.value = true;
  authError.value = null;

  try {
    // `identifier` may be an email address or a phone number (OD-09). `email` is still
    // sent so an older backend would keep working.
    const result = await api.post<LoginResponse>(
      '/auth/login',
      { identifier: email, email, password },
      false
    );
    setStoredToken(result.token);
    applySession(result);
    return result.user;
  } catch (error) {
    if (error instanceof ApiRequestError) authError.value = error.message;
    else authError.value = 'Sign-in failed. Please check credentials.';
    throw error;
  } finally {
    isAuthenticating.value = false;
  }
}

export async function registerUser(payload: Record<string, unknown>): Promise<SessionUser> {
  isAuthenticating.value = true;
  authError.value = null;

  try {
    const result = await api.post<LoginResponse>('/auth/register', payload, false);
    setStoredToken(result.token);
    applySession(result);
    return result.user;
  } catch (error) {
    if (error instanceof ApiRequestError) authError.value = error.message;
    else authError.value = 'Account registration failed. Please try again.';
    throw error;
  } finally {
    isAuthenticating.value = false;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore server error on logout
  } finally {
    clearSession();
  }
}

export async function restoreSession(): Promise<void> {
  if (!getStoredToken()) {
    clearSession();
    return;
  }

  isRestoring.value = true;
  try {
    const me = await api.get<MeResponse>('/auth/me');
    applySession(me);
    state.profile = me.profile;
  } catch (error) {
    /**
     * A dead token and a dead network threw through the same bare `catch`,
     * and both cleared the session. `ApiRequestError.isAuthFailure` is false
     * for `NETWORK_ERROR` (status 0, `fetch` itself threw) and for a 5xx -
     * exactly the shape a genuinely offline PWA launch produces, on a device
     * that HAD signed in and has a real token still sitting in storage.
     *
     * So a resident who installed this app, signed in once, and opened it
     * again with no signal - the offline capability `navigateFallback` and
     * the precached shell exist for - was signed out on the spot, by the
     * very session check meant to confirm they were still signed in. The
     * token was then deleted from storage too, so reconnecting did not fix
     * it; she had to sign in again, which needs the network she did not have.
     *
     * Only a REAL auth failure (a rejected or expired token, the server
     * itself saying so) clears the session now. Anything else falls back to
     * the last snapshot `applySession` cached alongside the token - the same
     * role and permissions she had at last successful sign-in - so the app
     * renders as hers while offline instead of locking her out of it. The
     * next successful `/auth/me`, the moment she is back online, overwrites
     * this with the real thing.
     */
    if (error instanceof ApiRequestError && error.isAuthFailure) {
      clearSession();
    } else {
      const cached = readCachedSessionSnapshot();
      if (cached) {
        state.user = cached.user;
        state.permissions = cached.permissions ?? [];
      } else {
        clearSession();
      }
    }
  } finally {
    isRestoring.value = false;
  }
}

export function handleAuthFailure(): void {
  clearSession();
}

export function homeRouteForRole(role: Role): string {
  if (role === 'admin') return '/admin/overview';
  if (role === 'tenant') return '/tenant';
  return '/public';
}
