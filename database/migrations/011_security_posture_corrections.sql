-- ============================================================================
-- Migration 011 - Security posture corrections
-- ============================================================================
-- Three findings, all discovered while writing the Phase 2 RLS and security
-- posture deliverable by reading the LIVE catalogue (database/live_schema.csv)
-- rather than database/FULL_DATABASE_SCHEMA.sql.
--
--   1. public.property_areas has RLS DISABLED. Every one of the other twenty
--      public tables is "enabled, forced, 0 policies" - the deny-by-default
--      lockdown established by migration 002, under which only service_role
--      (rolbypassrls = true) can read or write. Migration 008 created
--      property_areas and never enabled RLS on it, so the newest table in the
--      schema is the only one outside the posture the design claims.
--
--   2. Migration 002 tried to revoke the SECURITY DEFINER helper
--      current_user_role() with:
--          REVOKE ALL ON FUNCTION public.current_user_role() FROM anon, authenticated;
--      That is ineffective. EXECUTE on a function is granted to PUBLIC by
--      default, and anon/authenticated hold it by virtue of being members of
--      PUBLIC, not by a direct grant. Revoking a privilege a role never held
--      directly removes nothing. The live ACL still reads "=X/postgres" - the
--      leading empty grantee IS the PUBLIC grant - and the Supabase security
--      advisor reports the function as callable by anon over
--      /rest/v1/rpc/current_user_role. The revoke must name PUBLIC.
--
--   3. Three functions have a mutable search_path. For a SECURITY DEFINER
--      function that is a privilege-escalation vector: a caller who can set
--      search_path can shadow an unqualified name with their own object and
--      have it run as the definer.
--
-- Touches zero rows of business data. Idempotent.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Bring property_areas under the same lockdown as the other twenty tables.
-- ---------------------------------------------------------------------------
-- service_role has rolbypassrls = true, so the Express backend (which connects
-- exclusively as service_role) is unaffected. Referential integrity checks for
-- expense_property_allocations.property_area run as internal RI triggers and
-- bypass RLS, so the foreign key added by 008 keeps working.
ALTER TABLE public.property_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_areas FORCE ROW LEVEL SECURITY;

-- Match the sibling tables: no direct grants to the PostgREST-facing roles.
REVOKE ALL ON TABLE public.property_areas FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Actually revoke the SECURITY DEFINER helper.
-- ---------------------------------------------------------------------------
DO $mig011a$
DECLARE
  v_acl text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'current_user_role'
  ) THEN
    SELECT coalesce(array_to_string(proacl, ' | '), '(default: PUBLIC EXECUTE)')
      INTO v_acl
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'current_user_role';
    RAISE NOTICE '011: current_user_role() ACL before = %', v_acl;

    -- PUBLIC is the grantee that actually holds EXECUTE. Named roles are
    -- revoked too, so the result is explicit rather than merely inherited.
    REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.current_user_role() FROM anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;

    RAISE NOTICE '011: current_user_role() revoked from PUBLIC';
  ELSE
    RAISE NOTICE '011: current_user_role() not present - nothing to revoke';
  END IF;
END
$mig011a$;

-- normalize_ph_phone() is SECURITY INVOKER and harmless, but it has no business
-- being reachable as a PostgREST RPC. Same treatment.
REVOKE ALL ON FUNCTION public.normalize_ph_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_ph_phone(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_ph_phone(text) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Pin search_path on every public function.
-- ---------------------------------------------------------------------------
-- SET search_path changes the function's configuration, not its body, so the
-- IMMUTABLE contract of normalize_ph_phone() is preserved and the values it
-- returns are unchanged - its body calls only pg_catalog built-ins. The index
-- built on it is reindexed below regardless, because an index over a function
-- whose definition has been altered is worth rebuilding rather than trusting.
--
-- This iterates the catalogue rather than naming the four functions. Naming them
-- was the first version of this migration and it FAILED under test: migration
-- 002 does not create current_user_role() on every database, so an unconditional
-- ALTER aborted the whole transaction with 42883 on a database where the
-- function was simply absent. Asking the catalogue is correct whatever is there,
-- and it also covers any function added later without editing this file.
DO $mig011b$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       AND (p.proconfig IS NULL OR NOT EXISTS (
             SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search\_path=%'))
       -- Skip anything owned by an extension. On Supabase, pgcrypto and
       -- uuid-ossp live in the `extensions` schema and this is moot; on a test
       -- database built from FULL_DATABASE_SCHEMA.sql they land in `public`,
       -- and an earlier version of this loop altered 44 of them. Extension
       -- objects belong to the extension: altering them is out of scope here
       -- and can be undone or conflict on ALTER EXTENSION UPDATE.
       AND NOT EXISTS (
             SELECT 1 FROM pg_depend d
              WHERE d.objid = p.oid
                AND d.classid = 'pg_proc'::regclass
                AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public', r.sig);
    RAISE NOTICE '011: pinned search_path on %', r.sig;
  END LOOP;
END
$mig011b$;

COMMIT;

-- Cheap here (profiles holds 45 rows). Runs outside the transaction above so it
-- can be re-run on its own if the function is ever altered again.
REINDEX INDEX public.idx_profiles_phone_login;

-- ============================================================================
-- Verification
-- ============================================================================
DO $mig011c$
DECLARE
  v_rls           boolean;
  v_forced        boolean;
  v_anon_can_exec boolean := false;
  v_unpinned      int;
BEGIN
  SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_forced
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'property_areas';

  -- Only ask about the function if it exists on this database. Migration 002
  -- does not create it everywhere.
  SELECT coalesce(bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')), false)
    INTO v_anon_can_exec
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'current_user_role';

  -- Same exclusion as the loop above: extension-owned functions are not ours.
  SELECT count(*) INTO v_unpinned
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.prokind = 'f'
     AND (p.proconfig IS NULL OR NOT EXISTS (
           SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search\_path=%'))
     AND NOT EXISTS (
           SELECT 1 FROM pg_depend d
            WHERE d.objid = p.oid
              AND d.classid = 'pg_proc'::regclass
              AND d.deptype = 'e');

  RAISE NOTICE '011 VERIFY: property_areas RLS enabled=%, forced=%', v_rls, v_forced;
  RAISE NOTICE '011 VERIFY: anon can execute current_user_role() = %', v_anon_can_exec;
  RAISE NOTICE '011 VERIFY: public functions with unpinned search_path = %', v_unpinned;

  IF NOT v_rls OR NOT v_forced THEN
    RAISE EXCEPTION '011 FAILED: property_areas is not under forced RLS';
  END IF;
  IF v_anon_can_exec THEN
    RAISE EXCEPTION '011 FAILED: anon can still execute current_user_role()';
  END IF;
  IF v_unpinned > 0 THEN
    RAISE EXCEPTION '011 FAILED: % function(s) still have a mutable search_path', v_unpinned;
  END IF;

  RAISE NOTICE '011 OK';
END
$mig011c$;
