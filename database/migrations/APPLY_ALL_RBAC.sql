-- ============================================================================
-- HIVELET RBAC — COMBINED MIGRATION (GENERATED, DO NOT EDIT BY HAND)
-- ============================================================================
-- Generated from database/migrations/001, 002 and 003.
-- Edit those files and regenerate; do not edit this one directly.
--
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> New query -> paste all of this -> Run.
--
-- Per-file BEGIN/COMMIT statements are stripped so the SQL editor runs the
-- whole script as a single transaction: either every change applies, or none
-- does. Re-running is safe (all statements are idempotent).
-- ============================================================================


-- ==========================================================================
-- SOURCE: 001_rbac_auth_columns.sql
-- ==========================================================================

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



-- ==========================================================================
-- SOURCE: 002_rbac_rls_lockdown.sql
-- ==========================================================================

-- =============================================================================
-- Migration 002 — RLS Lockdown / Database Security Boundary
-- =============================================================================
-- @systemBibleRef  Section 20 (Security), Section 14 (Auditability)
-- @businessRules   BR-024 Tenant Privacy, BR-028 Auditability,
--                  BR-048 Admin-Only Authorship of Income/Expense Ledgers
-- @requirements    FR-002 Role-Based Access
--
-- WHY THIS MIGRATION EXISTS
-- ------------------------------------------------------------------------
-- Before this migration every table in `public` was readable AND writable by
-- the Supabase `anon` key. That key is published to the browser by design and
-- was additionally committed to `.env.example`, so in practice the following
-- were world-readable:
--
--   * profiles                     — tenant emails, phones, emergency contacts
--   * bills / payments             — the whole property's financial position
--   * monthly_income_records       — the landlady's income ledger  (BR-048)
--   * monthly_expense_entries      — the landlady's expense ledger (BR-048)
--   * audit_logs                   — and these were world-WRITABLE, meaning
--                                    anyone could forge audit history, which
--                                    breaks System Bible Section 14 outright.
--
-- THE MODEL 04_ARCHITECTURE.md ASKS FOR
-- ------------------------------------------------------------------------
-- "The frontend is not a security boundary. Every protected operation must be
-- validated and authorized by the backend."
--
-- So the database trusts exactly one client: the Express API, which connects
-- with the `service_role` key and enforces role checks in middleware before
-- any query runs. Browsers never speak to PostgREST at all.
--
-- Implementation: enable RLS on every table and define NO policies for `anon`
-- or `authenticated`. With RLS on and no matching policy, Postgres denies the
-- row — so both roles get an empty/denied result on every table. `service_role`
-- holds BYPASSRLS, so the Express backend is unaffected.
--
-- Privileges are ALSO revoked outright. That is deliberate belt-and-braces: if
-- RLS were ever toggled off on a table by mistake, the missing GRANT still
-- denies access.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Enable (and FORCE) row level security on every application table.
--    FORCE also subjects the table owner to RLS, so a stray owner-context
--    connection cannot read around the policies either.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  app_tables TEXT[] := ARRAY[
    'profiles',
    'clusters',
    'rooms',
    'room_price_history',
    'room_assignments',
    'inquiries',
    'inquiry_messages',
    'bills',
    'payments',
    'maintenance_tickets',
    'ticket_messages',
    'ticket_attachments',
    'notifications',
    'audit_logs',
    'monthly_income_records',
    'fixed_expense_categories',
    'monthly_expense_entries',
    'expense_property_allocations'
  ];
BEGIN
  FOREACH t IN ARRAY app_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('ALTER TABLE public.%I FORCE  ROW LEVEL SECURITY;', t);
      RAISE NOTICE 'RLS enabled + forced on public.%', t;
    ELSE
      RAISE WARNING 'Table public.% not found — skipped', t;
    END IF;
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 2. Drop any pre-existing permissive policies.
--    A leftover "allow all" policy would silently defeat step 1.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I;',
      pol.policyname, pol.schemaname, pol.tablename
    );
    RAISE NOTICE 'Dropped pre-existing policy % on %.%',
      pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 3. Revoke every privilege from the browser-facing roles.
--    `anon`          = unauthenticated PostgREST requests (the public key)
--    `authenticated` = Supabase GoTrue sessions (unused in this architecture)
-- -----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Deny the schema itself, so PostgREST cannot even enumerate object names.
REVOKE USAGE  ON SCHEMA public FROM anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM anon, authenticated;

-- Ensure tables created later do not silently re-grant access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Retire the abandoned in-database role helper.
--    `current_user_role()` belonged to a Supabase-Auth-based RLS design that
--    this architecture does not use — role resolution now happens in Express
--    middleware against the verified JWT. Leaving it callable by `anon` would
--    be a needless information leak.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'current_user_role'
  ) THEN
    REVOKE ALL ON FUNCTION public.current_user_role() FROM anon, authenticated;
    RAISE NOTICE 'Revoked execute on public.current_user_role() from anon/authenticated';
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 5. Harden the audit trail at the storage layer.
--    System Bible Section 14: "Financial history must never silently
--    disappear." Audit rows are append-only — even the backend must not be
--    able to rewrite or erase them, so UPDATE/DELETE are revoked from every
--    role including service_role.
-- -----------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated, service_role;

COMMENT ON TABLE public.audit_logs IS
  'Append-only. UPDATE/DELETE revoked from all roles per System Bible Section 14.';


-- =============================================================================
-- VERIFICATION — run after applying; every row should report rls_enabled = true
-- and policy_count = 0 (deny-by-default, backend-only access).
-- =============================================================================
-- SELECT c.relname                AS table_name,
--        c.relrowsecurity         AS rls_enabled,
--        c.relforcerowsecurity    AS rls_forced,
--        COUNT(p.policyname)      AS policy_count
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
-- WHERE n.nspname = 'public' AND c.relkind = 'r'
-- GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
-- ORDER BY c.relname;


-- ==========================================================================
-- SOURCE: 003_seed_rbac_credentials.sql
-- ==========================================================================

-- =============================================================================
-- Migration 003 — Seed RBAC Credentials (DEVELOPMENT / DEFENSE DEMO ONLY)
-- =============================================================================
-- @systemBibleRef  Section 4 (Users), Section 19 (Account Lifecycle)
-- @businessRules   BR-024 Tenant Privacy, BR-025 Tenant Deactivation
-- @requirements    FR-001 Authentication, FR-002 Role-Based Access
--
-- Attaches bcrypt password hashes (cost 12) to the seeded profiles so the three
-- roles from System Bible Section 4 can be demonstrated end to end.
--
--   ROLE      EMAIL                    PASSWORD             EXPECTED BEHAVIOUR
--   -------   ----------------------   ------------------   -------------------------
--   admin     admin@hivelet.ph         Hivelet@Admin2026    full administrative access
--   tenant    mark.cruz@gmail.com      Hivelet@Tenant2026   own room/bills/tickets only
--   tenant    sean.jerve@gmail.com     Hivelet@Tenant2026   own room/bills/tickets only
--   tenant    john.lloyd@gmail.com     Hivelet@Tenant2026   own room/bills/tickets only
--   tenant    jaye.casia@gmail.com     Hivelet@Tenant2026   own room/bills/tickets only
--   tenant    miguel.ramos@gmail.com   Hivelet@Tenant2026   DENIED — account_status
--                                                           is 'inactive' (BR-025)
--
-- Rhea Mendoza (role = 'prospect') is intentionally given NO password. A
-- prospect is a public visitor who submitted an inquiry; System Bible Section 4
-- grants that class no account access, so the profile exists for inquiry
-- linkage only and cannot authenticate.
--
-- !! BEFORE DEPLOYING TO THE UNIVERSITY SERVER !!
-- Rotate every one of these passwords. They are published in this repository
-- and must never guard real tenant data.
-- =============================================================================


UPDATE public.profiles AS p
SET password_hash       = v.hash,
    password_changed_at = NOW(),
    failed_login_count  = 0,
    locked_until        = NULL
FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, '$2a$12$L3h2PeffvWzk55Ib.KLT6egtU6gdG0VqxZCujhQCl8WW30aek7FU.'), -- admin@hivelet.ph      / Hivelet@Admin2026
  ('22222222-2222-2222-2222-222222222222'::uuid, '$2a$12$rjbLOeEdh1Um9x2uX6BeEe1tScu6dsiz0WjiVgx5wlng5LarrGdPC'), -- mark.cruz@gmail.com   / Hivelet@Tenant2026
  ('33333333-3333-3333-3333-333333333333'::uuid, '$2a$12$/IARQqPw7cohJL8dEhzYUO5mQm/oRzpzLtlZdExWQBxyMhIyVyW..'), -- sean.jerve@gmail.com  / Hivelet@Tenant2026
  ('44444444-4444-4444-4444-444444444444'::uuid, '$2a$12$UtX3bdkZetJ7j6P5MdBPtuJ6MNysPmZGERu.rV7Hb62DLL0KXewpi'), -- john.lloyd@gmail.com  / Hivelet@Tenant2026
  ('55555555-5555-5555-5555-555555555555'::uuid, '$2a$12$8/A5qIMI.AFx0JXWPo/ZhOSaMDWF8EDrxT7.cfnBNadcz//.dmQny'), -- jaye.casia@gmail.com  / Hivelet@Tenant2026
  ('66666666-6666-6666-6666-666666666666'::uuid, '$2a$12$KEQsAqipGvBzA4GwV3sSi.A2Fm4lCRJ3OPPUM/YKx.gJ8RvoqgGD2')  -- miguel.ramos@gmail.com/ Hivelet@Tenant2026 (inactive)
) AS v(profile_id, hash)
WHERE p.id = v.profile_id;

-- A prospect never authenticates (System Bible Section 4: the public visitor
-- "cannot access private tenant information").
UPDATE public.profiles
SET password_hash = NULL
WHERE role = 'prospect';


-- =============================================================================
-- VERIFICATION — password_hash must be non-null for admin/tenant, null for
-- prospect. The hash itself is never selected back by the application.
-- =============================================================================
-- SELECT email, role, account_status,
--        (password_hash IS NOT NULL) AS can_authenticate
-- FROM public.profiles
-- ORDER BY role, email;
