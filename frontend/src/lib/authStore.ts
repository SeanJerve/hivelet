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
  } catch {
    clearSession();
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
