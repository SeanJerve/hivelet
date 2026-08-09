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

const nodeEnv = optional('NODE_ENV', 'development');
const jwtSecret = required('JWT_SECRET');

// A default secret shipped in the repo is fine for local work but would make
// every issued token forgeable in production.
if (nodeEnv === 'production' && jwtSecret === 'hivelet_super_secret_jwt_key_2026_capstone') {
  throw new Error(
    '[config] JWT_SECRET is still the example value. Set a unique secret before deploying.'
  );
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parseInt(optional('PORT', '5000'), 10),

  supabase: {
    url: required('SUPABASE_URL'),
    anonKey: required('SUPABASE_ANON_KEY'),
    /**
     * Bypasses row level security. This is the ONLY credential the API uses for
     * data access, and it must never reach the browser (04_ARCHITECTURE.md:
     * "Secrets must never be exposed to the frontend").
     */
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
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
} as const;

export type AppConfig = typeof config;
