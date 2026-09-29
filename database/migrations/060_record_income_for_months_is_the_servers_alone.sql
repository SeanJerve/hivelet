-- 060: record_income_for_months, callable by the server alone, like every other function
--
-- WHY
-- ---
-- Supabase's security advisor, run 2026-09-29, flagged one WARN:
-- `function_search_path_mutable` on public.record_income_for_months. A catalogue
-- read the same day (pg_proc, has_function_privilege) found it is also the one
-- function that the `anon` and `authenticated` roles may EXECUTE while being a
-- real entry point. Migration 029 created it without the two lines every other
-- write function carries (019, 041 and the rest): a fixed search_path, and
-- EXECUTE revoked from PUBLIC, anon and authenticated.
--
-- WHY IT WAS NOT A LIVE HOLE
-- --------------------------
-- It is SECURITY INVOKER, and on 2026-09-29 `anon` and `authenticated` held zero
-- grants on any table in `public` (information_schema.role_table_grants), with
-- RLS on and no policies on all 22 tables. A call through the Data API would be
-- refused the moment the function touched monthly_income_records. This closes
-- the door anyway, so the guarantee does not rest on the table grants alone.
--
-- The three other functions `anon` may execute (record_room_price_change,
-- route_linda_water, update_expense_entry_total) return `trigger`, cannot be
-- called directly, and already fix their search_path. They are left alone.
--
-- SAFE TO APPLY
-- -------------
-- The body calls only jsonb_array_length and jsonb_array_elements (pg_catalog)
-- and writes monthly_income_records (public), so `pg_catalog, public` resolves
-- everything it uses. The backend calls it with the service key
-- (routes/admin.ts, `db.rpc('record_income_for_months', ...)`), and service_role
-- keeps its own explicit grant: the same REVOKE on
-- create_expense_entry_with_allocations in 019 has not stopped the backend
-- calling that one. No data changes.

ALTER FUNCTION public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, numeric, integer, payment_method_type, character varying, jsonb
) SET search_path TO 'pg_catalog', 'public';

REVOKE ALL ON FUNCTION public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, numeric, integer, payment_method_type, character varying, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, numeric, integer, payment_method_type, character varying, jsonb
) FROM anon;
REVOKE ALL ON FUNCTION public.record_income_for_months(
  uuid, uuid, uuid, date, character varying, character varying,
  numeric, numeric, numeric, integer, payment_method_type, character varying, jsonb
) FROM authenticated;

-- VERIFY (expected: service_role true, anon false, authenticated false,
-- config {search_path=pg_catalog, public}). Nothing is written to test it; the
-- next multi-month receipt she records goes through it.
--
-- SELECT p.proconfig,
--   has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role,
--   has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
--   has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated
-- FROM pg_proc p WHERE p.proname = 'record_income_for_months';
