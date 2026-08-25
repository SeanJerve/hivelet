-- =============================================================================
-- Migration 001 — RBAC Authentication Columns
-- =============================================================================
-- @systemBibleRef  Section 4 (Users), Section 20 (Security)
-- @requirements    FR-001 Authentication, FR-002 Role-Based Access
-- @architectureRef 04_ARCHITECTURE.md — "The frontend is not a security boundary.
--                  Every protected operation must be validated and authorized by
--                  the backend."
--
-- Adds the credential columns the Express authentication service needs. The
-- capstone architecture makes Express the single security boundary, so the
-- password hash lives on `profiles` and is verified server-side with bcrypt.
--
-- 05_DATABASE_DESIGN.md Rule 8: "Never store plaintext passwords." Only the
-- bcrypt hash is ever persisted.
-- =============================================================================

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_login_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_login_count   INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.password_hash IS
  'bcrypt hash (cost 12). Never a plaintext password — 05_DATABASE_DESIGN.md Rule 8.';
COMMENT ON COLUMN public.profiles.failed_login_count IS
  'Consecutive failed logins; reset to 0 on success. Drives lockout throttling.';
COMMENT ON COLUMN public.profiles.locked_until IS
  'When set and in the future, authentication is refused for this profile.';

-- Email is the login identifier: it must be unique and case-insensitively
-- searchable. BR-026 (Duplicate Prevention) also depends on this.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (LOWER(email));

-- Authorization lookups filter on role + account_status on every request
-- (BR-025: a vacated tenant's account becomes inactive and must lose access).
CREATE INDEX IF NOT EXISTS idx_profiles_role_status
  ON public.profiles (role, account_status);

-- Tenant-scoped queries resolve "which rooms is this profile responsible for?"
-- on nearly every tenant request (System Bible Section 20).
CREATE INDEX IF NOT EXISTS idx_room_assignments_tenant_active
  ON public.room_assignments (tenant_profile_id, is_active);

CREATE INDEX IF NOT EXISTS idx_bills_tenant
  ON public.bills (tenant_profile_id);

CREATE INDEX IF NOT EXISTS idx_payments_tenant
  ON public.payments (tenant_profile_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_tenant
  ON public.maintenance_tickets (tenant_profile_id);

COMMIT;
