/**
 * @file lib/authStore.ts
 * @description Reactive client-side session state.
 * @systemBibleRef Section 4 (Users), Section 20 (Security)
 *
 * IMPORTANT — this store decides what the interface SHOWS, never what the user
 * is ALLOWED to do. 04_ARCHITECTURE.md: "The frontend is not a security
 * boundary." Hiding an admin menu item is a usability affordance; the actual
 * refusal happens in Express middleware, and every one of these permissions is
 * re-checked there on each request.
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

/** True until the stored token has been checked against the server once. */
export const isRestoring = ref(false);
export const isAuthenticating = ref(false);
export const authError = ref<string | null>(null);

export const session = readonly(state);

export const currentUser = computed(() => state.user);
export const isAuthenticated = computed(() => state.user !== null);

/** Effective role — 'guest' when signed out. Mirrors the backend default. */
export const currentRole = computed<Role>(() => state.user?.role ?? 'guest');

export const isAdmin = computed(() => state.user?.role === 'admin');
export const isTenant = computed(() => state.user?.role === 'tenant');

/** Mirrors the server matrix in backend/src/config/rbac.ts. Display only. */
export function can(permission: string): boolean {
  return state.permissions.includes(permission);
}

function applySession(payload: { user: SessionUser; permissions: string[] }): void {
  state.user = payload.user;
  state.permissions = payload.permissions ?? [];
}

function clearSession(): void {
  state.user = null;
  state.permissions = [];
  state.profile = null;
  setStoredToken(null);
}

export async function login(email: string, password: string): Promise<SessionUser> {
  isAuthenticating.value = true;
  authError.value = null;

  try {
    const result = await api.post<LoginResponse>('/auth/login', { email, password }, false);
    setStoredToken(result.token);
    applySession(result);
    return result.user;
  } catch (error) {
    if (error instanceof ApiRequestError) authError.value = error.message;
    else authError.value = 'Sign-in failed. Please try again.';
    throw error;
  } finally {
    isAuthenticating.value = false;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Signing out locally must succeed even if the server call fails.
  } finally {
    clearSession();
  }
}

/**
 * Re-establishes the session from a stored token on page load.
 *
 * The token is not trusted on its own — `/auth/me` re-reads the profile, so a
 * tenant deactivated since the token was issued (BR-025) is signed out here.
 */
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
  } catch {
    clearSession();
  } finally {
    isRestoring.value = false;
  }
}

/** Signs out when the API reports the token is no longer usable. */
export function handleAuthFailure(): void {
  clearSession();
}

/** Landing route for a role after sign-in (System Bible Section 4). */
export function homeRouteForRole(role: Role): string {
  if (role === 'admin') return '/admin/overview';
  if (role === 'tenant') return '/tenant';
  return '/';
}
