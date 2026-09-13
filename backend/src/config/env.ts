/**
 * @file config/env.ts
 * @description Validated, typed environment configuration for the Hivelet API.
 * @architectureRef 04_ARCHITECTURE.md — "The production environment must use
 *                  environment variables for database credentials,
 *                  authentication secrets, Adyen credentials..."
 * @rationale Fails fast at boot rather than surfacing an undefined secret as a
 *            silent authorization bypass at request time.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Repo-root .env is the single source of truth; a backend-local .env may
// override it for per-developer settings.
dotenv.config({ path: path.resolve(here, '../../../.env') });
dotenv.config({ path: path.resolve(here, '../../.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `[config] Missing required environment variable ${name}. ` +
        `Copy .env.example to .env at the repository root and fill it in.`
    );
  }
  return value.trim();
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

/**
 * Reads whichever of two environment variables is set, preferring the first.
 * Used where a credential has been renamed and both spellings must keep working.
 */
function either(preferred: string, legacy: string): string {
  const value = process.env[preferred] ?? process.env[legacy];
  if (!value || !value.trim()) {
    throw new Error(`[config] Set ${preferred} (or ${legacy}) in your .env`);
  }
  return value.trim();
}

const nodeEnv = optional('NODE_ENV', 'development');
const jwtSecret = required('JWT_SECRET');

// Secrets known to be compromised. `hivelet_super_secret_jwt_key_2026_capstone`
// was committed to a public repository in `.env.example` from 2026-08-25 until
// 2026-09-13, so it is public knowledge and anyone holding it can mint a token
// claiming any role - which defeats the entire permission model in
// `config/rbac.ts` regardless of how correct that model is.
//
// This refuses it in EVERY environment, not just production. The original guard
// only fired on `NODE_ENV === 'production'`, which is the one environment this
// project has never run in; a published secret is no safer in development.
const COMPROMISED_JWT_SECRETS = new Set([
  'hivelet_super_secret_jwt_key_2026_capstone'
]);

if (COMPROMISED_JWT_SECRETS.has(jwtSecret)) {
  throw new Error(
    '[config] JWT_SECRET is a known-compromised value that was published in a public ' +
    'repository. Generate a new one with: ' +
    'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"'
  );
}

if (jwtSecret.length < 32) {
  throw new Error(
    `[config] JWT_SECRET is ${jwtSecret.length} characters. Use at least 32 - ` +
    'a short or guessable signing key can be brute-forced offline from any single token.'
  );
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parseInt(optional('PORT', '5000'), 10),

  /**
   * Supabase credentials.
   *
   * Migrated on 2026-09-13 from the legacy JWT keys (`anon` / `service_role`) to
   * Supabase's current format (`sb_publishable_...` / `sb_secret_...`). The legacy
   * pair had been published in `.env.example` in a public repository since
   * 2026-08-25 and was disabled at the project level as the remediation - there is
   * no "reset" for legacy keys any more, so migrating and disabling is the fix.
   *
   * Either name is accepted for each so a stale `.env` does not break the boot,
   * but the new names are preferred and the new formats are what production uses.
   */
  supabase: {
    url: required('SUPABASE_URL'),

    /**
     * Publishable key. Safe in a browser IF row-level security is configured -
     * and here it is deliberately more locked down than that: `anon` holds no
     * grant on any of the 21 tables, so this key can read nothing at all.
     * Verified 2026-09-13: permission denied on every table tested.
     * Used only by the health check, to assert that the lockdown still holds.
     */
    anonKey: either('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'),

    /**
     * Secret key. Bypasses row level security. This is the ONLY credential the
     * API uses for data access, and it must never reach the browser
     * (04_ARCHITECTURE.md: "Secrets must never be exposed to the frontend").
     */
    serviceRoleKey: either('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
  },

  jwt: {
    secret: jwtSecret,
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
    issuer: 'hivelet-api',
    audience: 'hivelet-web',
  },

  auth: {
    bcryptRounds: 12,
    /** Consecutive failures before a profile is temporarily locked. */
    maxFailedLogins: 5,
    lockoutMinutes: 15,
  },

  cors: {
    origins: optional('CORS_ORIGINS', optional('CLIENT_URL', 'http://localhost:5174'))
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  adyen: {
    apiKey: optional('ADYEN_API_KEY', 'mock_api_key_for_testing'),
    merchantAccount: optional('ADYEN_MERCHANT_ACCOUNT', 'mock_merchant_account'),
    environment: optional('ADYEN_ENVIRONMENT', 'TEST'),
    clientKey: optional('ADYEN_CLIENT_KEY', 'mock_client_key'),
    hmacKey: optional('ADYEN_HMAC_KEY', 'mock_hmac_key'),
  },
} as const;

export type AppConfig = typeof config;
