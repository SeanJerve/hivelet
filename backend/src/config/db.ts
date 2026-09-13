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
 *   publicProbe the publishable (anon) key. Deliberately powerless after
 *               migration 002. Used solely by the health check to assert the
 *               lockdown still holds.
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

/**
 * The outcome of the anon lockdown probe.
 *
 *   enforced   The probe reached PostgreSQL and PostgreSQL refused it. This is
 *              the only result that proves the lockdown is in force.
 *   exposed    The probe read tenant rows. An emergency.
 *   unverified The probe never reached PostgreSQL — the key was rejected at the
 *              API gateway, or the network failed. Nothing was proven either
 *              way, and saying "locked down" here would be a lie.
 */
export type LockdownVerdict = 'enforced' | 'exposed' | 'unverified';

export interface DbHealth {
  connected: boolean;
  /** Whether the public key was actually shown to be unable to read tenant data. */
  lockdown: LockdownVerdict;
  /** Safe to return to an unauthenticated caller. */
  message: string;
  /** Operator-facing detail. Logged, never returned over HTTP. */
  detail?: string;
}

/**
 * Distinguishes "PostgreSQL said no" from "the gateway did not recognise the key".
 *
 * WHY THIS EXISTS
 * ---------------
 * The previous implementation treated ANY error from the probe as proof of
 * lockdown (`probe.error !== null`). Measured against the live project, the two
 * cases are indistinguishable by that test — both arrive as HTTP 401:
 *
 *   real publishable key   -> code 42501, "permission denied for table profiles"
 *   stale or mistyped key  -> code null,  "Invalid API key"
 *
 * So a `.env` still holding a rotated-out key — exactly the state several
 * machines were left in after the September key rotation — would have reported
 * a green padlock while proving nothing at all. A security check that passes
 * when it is misconfigured is worse than no check, because it is trusted.
 *
 * A PostgreSQL `code` is only present once PostgREST has authenticated the key
 * and handed the query to the database, so its presence is the discriminator.
 */
function classifyProbeError(error: { code?: string | null; message?: string } | null): LockdownVerdict {
  if (error === null) return 'exposed';

  // 42501 is insufficient_privilege; an RLS refusal on a FORCE'd table with no
  // policies surfaces as an empty result or 42501 depending on the verb. Any
  // PostgreSQL-issued code means the request was authenticated and then denied.
  if (typeof error.code === 'string' && error.code.length > 0) return 'enforced';

  return 'unverified';
}

/**
 * Verifies both that the API can reach the database and that the public key
 * cannot.
 *
 * The original implementation pinged `/rest/v1/`, which only `service_role` may
 * call — so it reported "disconnected" even when the database was perfectly
 * healthy. This queries an actual table instead.
 */
export async function checkDbHealth(): Promise<DbHealth> {
  try {
    const { error } = await db.from('profiles').select('id', { head: true, count: 'exact' });

    if (error) {
      return {
        connected: false,
        lockdown: 'unverified',
        // Deliberately generic: /api/health is an open endpoint, and the raw
        // Supabase error names tables and can carry connection detail.
        message: 'Database unreachable.',
        detail: `Supabase query failed: ${error.message}`,
      };
    }

    // Migration 002 should make this fail. If it succeeds, tenant PII is public.
    const probe = await publicProbe.from('profiles').select('id').limit(1);
    const lockdown = classifyProbeError(probe.error);

    const message =
      lockdown === 'enforced'
        ? 'Database reachable; public key reached PostgreSQL and was refused.'
        : lockdown === 'exposed'
          ? 'DATABASE REACHABLE BUT THE PUBLIC KEY CAN READ profiles — apply database/migrations/002_rbac_rls_lockdown.sql.'
          : 'Database reachable; the lockdown could not be tested because the configured public key was not accepted.';

    return {
      connected: true,
      lockdown,
      message,
      detail: probe.error ? `probe: code=${probe.error.code ?? 'none'} message=${probe.error.message}` : undefined,
    };
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    return { connected: false, lockdown: 'unverified', message: 'Database unreachable.', detail };
  }
}

/** Boot-time connectivity report. */
export async function reportDbStatus(): Promise<void> {
  const health = await checkDbHealth();

  if (!health.connected) {
    console.error('❌ Supabase connection failed:', health.detail ?? health.message);
    return;
  }

  console.log('✅ Supabase connected (service_role).');

  if (health.lockdown === 'enforced') {
    console.log('🔒 RLS lockdown verified — the public key was refused by PostgreSQL.');
    return;
  }

  if (health.lockdown === 'exposed') {
    console.warn('');
    console.warn('🚨 SECURITY: the public key can still read `profiles`.');
    console.warn('   Tenant emails, phone numbers and emergency contacts are exposed.');
    console.warn('   Apply database/migrations/002_rbac_rls_lockdown.sql.');
    console.warn('');
    return;
  }

  console.warn('');
  console.warn('⚠️  The RLS lockdown was NOT tested this boot.');
  console.warn('   The publishable key in this environment was rejected before it');
  console.warn('   reached PostgreSQL, so the probe proved nothing. Check that');
  console.warn('   SUPABASE_PUBLISHABLE_KEY is the current key for this project.');
  if (health.detail) console.warn(`   ${health.detail}`);
  console.warn('');
}
