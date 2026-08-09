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

BEGIN;

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

COMMIT;

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
