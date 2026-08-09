/**
 * @file config/db.ts
 * @description Supabase clients for the Hivelet API.
 * @systemBibleRef Section 20 (Security)
 * @architectureRef 04_ARCHITECTURE.md — backend-enforced authorization.
 *
 * Two clients exist for two different jobs:
 *
 *   db          service_role. Bypasses RLS. Every authorized query runs through
 *               this client AFTER Express middleware has established the
 *               caller's role. It is the only path to application data.
 *
 *   publicProbe anon. Deliberately powerless after migration 002. Used solely
 *               by the health check to assert the lockdown still holds.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './env.js';

/**
 * Privileged data client. Never expose this, its key, or raw errors from it to
 * an unauthenticated caller.
 */
export const db: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'X-Hivelet-Client': 'hivelet-api' },
    },
  }
);

/** Unprivileged client used only to verify that anon access stays denied. */
const publicProbe: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export interface DbHealth {
  connected: boolean;
  /** True when the anon key is correctly unable to read tenant data. */
  anonLockedDown: boolean;
  message: string;
}

/**
 * Verifies both that the API can reach the database and that the public key
 * cannot.
 *
 * The previous implementation pinged `/rest/v1/`, which only `service_role` may
 * call — so it reported "disconnected" even when the database was perfectly
 * healthy. This queries an actual table instead.
 */
export async function checkDbHealth(): Promise<DbHealth> {
  try {
    const { error } = await db.from('profiles').select('id', { head: true, count: 'exact' });

    if (error) {
      return {
        connected: false,
        anonLockedDown: false,
        message: `Supabase query failed: ${error.message}`,
      };
    }

    // Migration 002 should make this fail. If it succeeds, tenant PII is public.
    const probe = await publicProbe.from('profiles').select('id').limit(1);
    const anonLockedDown = probe.error !== null;

    return {
      connected: true,
      anonLockedDown,
      message: anonLockedDown
        ? 'Database reachable; anon key correctly denied.'
        : 'DATABASE REACHABLE BUT ANON KEY CAN READ profiles — apply migration 002_rbac_rls_lockdown.sql.',
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { connected: false, anonLockedDown: false, message };
  }
}

/** Boot-time connectivity report. */
export async function reportDbStatus(): Promise<void> {
  const health = await checkDbHealth();

  if (!health.connected) {
    console.error('❌ Supabase connection failed:', health.message);
    return;
  }

  console.log('✅ Supabase connected (service_role).');

  if (!health.anonLockedDown) {
    console.warn('');
    console.warn('🚨 SECURITY: the public anon key can still read `profiles`.');
    console.warn('   Tenant emails, phone numbers and emergency contacts are exposed.');
    console.warn('   Apply database/migrations/002_rbac_rls_lockdown.sql.');
    console.warn('');
  } else {
    console.log('🔒 RLS lockdown verified — anon key denied.');
  }
}
