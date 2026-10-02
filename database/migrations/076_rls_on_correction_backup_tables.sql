-- =============================================================================
-- 076 - the three correction-backup tables get row-level security
-- =============================================================================
-- B-96 (security audit 2026-10-02, S-2). Migrations 030, 031 and 032 created
-- rent_period_drift_backup_030, copied_period_backup_031 and
-- date_paid_import_backup_032 in `public` without ENABLE ROW LEVEL SECURITY;
-- every other table has it. The website is not exposed by this (the browser
-- never holds a Supabase key), but Supabase's security advisor flags it.
--
-- Changes no data. The backend uses the service role, which RLS does not
-- restrict. A table that does not exist is skipped.
--
-- Verify afterwards (every row: relrowsecurity true, anon_can_select false):
--   SELECT c.relname, c.relrowsecurity,
--          has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_select
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r'
--   ORDER BY c.relrowsecurity, c.relname;
-- =============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rent_period_drift_backup_030','copied_period_backup_031','date_paid_import_backup_032'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
      RAISE NOTICE '076: RLS on public.%', t;
    END IF;
  END LOOP;
END $$;
