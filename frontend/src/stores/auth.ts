/**
 * @file stores/auth.ts
 * @description Session + profile state for Hivelet. The Supabase session is the source of truth;
 *              profiles.role/account_status (read back from the DB after login, protected by RLS
 *              and the profiles trigger in the security-hardening migration) drive what the UI
 *              shows -- never a client-side assumption.
 */
import { defineStore } from 'pinia';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  occupation: string | null;
  facebook_url: string | null;
  role: 'admin' | 'tenant' | 'prospect';
  account_status: 'active' | 'inactive';
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    session: null,
    user: null,
    profile: null,
    loading: false,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.session && !!state.profile,
    isAdmin: (state) => state.profile?.role === 'admin',
    isTenant: (state) => state.profile?.role === 'tenant' && state.profile?.account_status === 'active',
  },

  actions: {
    async fetchProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        this.profile = null;
        return;
      }
      this.profile = data as Profile;
    },

    async initialize() {
      if (this.initialized) return;
      this.loading = true;

      const { data } = await supabase.auth.getSession();
      this.session = data.session;
      this.user = data.session?.user ?? null;
      if (this.user) {
        await this.fetchProfile(this.user.id);
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        this.session = session;
        this.user = session?.user ?? null;
        if (this.user) {
          await this.fetchProfile(this.user.id);
        } else {
          this.profile = null;
        }
      });

      this.initialized = true;
      this.loading = false;
    },

    async login(email: string, password: string, expectedRole: 'admin' | 'tenant') {
      this.loading = true;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) {
          throw new Error(error?.message || 'Invalid email or password.');
        }

        await this.fetchProfile(data.user.id);

        if (!this.profile) {
          await supabase.auth.signOut();
          throw new Error('No account profile found for this login.');
        }

        if (this.profile.role !== expectedRole) {
          await supabase.auth.signOut();
          this.profile = null;
          throw new Error(
            expectedRole === 'admin'
              ? 'This account is not an administrator. Use the Tenant Login tab instead.'
              : 'This account is not a tenant. Use the Admin & Staff Login tab instead.'
          );
        }

        if (this.profile.role === 'tenant' && this.profile.account_status !== 'active') {
          await supabase.auth.signOut();
          this.profile = null;
          throw new Error('This tenant account is inactive. Please contact the administrator.');
        }

        this.session = data.session;
        this.user = data.user;
        return this.profile;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      await supabase.auth.signOut();
      this.session = null;
      this.user = null;
      this.profile = null;
    },
  },
});
