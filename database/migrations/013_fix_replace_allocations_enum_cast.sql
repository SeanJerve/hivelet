-- ============================================================================
-- Migration 013 - replace_expense_allocations() cannot insert into an enum
-- ============================================================================
-- LIVE DEFECT. Found 2026-09-13 by a behavioural test of migration 010 against a
-- database carrying the real production column type.
--
-- Migration 010 built the RPC that makes an expense-entry edit atomic - the fix
-- for defect D-2, where a delete-then-insert across two PostgREST round trips
-- destroyed an entry's allocations when the insert was rejected. The function
-- body ends with:
--
--     INSERT INTO public.expense_property_allocations (expense_entry_id, property_area, amount)
--     SELECT p_entry_id,
--            elem ->> 'property_area',          <-- returns TEXT
--            (elem ->> 'amount')::NUMERIC
--       FROM jsonb_array_elements(p_allocations) AS elem;
--
-- `->>` yields `text`. In production `property_area` is the enum
-- `property_area_type` (drift 2), and PostgreSQL will not implicitly cast text
-- to an enum in an INSERT. Every call therefore fails with:
--
--     ERROR: 42804: column "property_area" is of type property_area_type
--            but expression is of type text
--
-- Consequence: **PATCH /api/admin/expense-entries/:id fails whenever the payload
-- contains allocations.** backend/src/routes/admin.ts routes every allocation
-- edit through this RPC, so editing an expense entry's split has been returning
-- a 500 since that code shipped.
--
-- It fails SAFELY - this was verified, not assumed. The exception aborts the
-- function's transaction, so the DELETE rolls back with it and the entry keeps
-- the allocations it had. No data has been lost. The feature is broken, the
-- ledger is not.
--
-- Why 010's own verification missed it: it tested the function against a
-- database built from FULL_DATABASE_SCHEMA.sql, where `property_area` is
-- VARCHAR(100) and text inserts fine. Same blind spot that broke 007 and 008,
-- third time. The fixture now reproduces all thirteen enums, so this class of
-- failure is reproducible locally from here on.
--
-- ---------------------------------------------------------------------------
-- The fix: ask the catalogue for the column's type, the way 008 does.
-- ---------------------------------------------------------------------------
-- The cast cannot be hardcoded as ::property_area_type, because on a database
-- built from the repository the column really is VARCHAR and that cast would
-- then fail. Reading the type at run time is correct in both worlds, and it
-- stays correct if the column is ever changed again.
--
-- Idempotent. Changes no data.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.replace_expense_allocations(
  p_entry_id     uuid,
  p_allocations  jsonb
)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $fn$
DECLARE
  inserted_count INTEGER;
  v_area_type    TEXT;
BEGIN
  IF p_entry_id IS NULL THEN
    RAISE EXCEPTION 'replace_expense_allocations: p_entry_id is required';
  END IF;

  IF jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'replace_expense_allocations: p_allocations must be a JSON array, got %',
      COALESCE(jsonb_typeof(p_allocations), 'null');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.monthly_expense_entries WHERE id = p_entry_id) THEN
    RAISE EXCEPTION 'replace_expense_allocations: no expense entry %', p_entry_id;
  END IF;

  -- The real type of the column we are about to write. Enum in production,
  -- varchar on a database built from FULL_DATABASE_SCHEMA.sql.
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_area_type
    FROM pg_attribute a
    JOIN pg_class c     ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'expense_property_allocations'
     AND a.attname = 'property_area'
     AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_area_type IS NULL THEN
    RAISE EXCEPTION 'replace_expense_allocations: expense_property_allocations.property_area not found';
  END IF;

  -- Both statements share this function's transaction. A foreign key violation,
  -- a bad enum label or a duplicate (entry, area) pair on the INSERT rolls the
  -- DELETE back with it, which is the entire point of this function.
  DELETE FROM public.expense_property_allocations
   WHERE expense_entry_id = p_entry_id;

  -- The explicit cast is what 010 was missing. An invalid label still raises -
  -- and still rolls the DELETE back - which is the behaviour we want; it just
  -- now raises 22P02 on a genuinely bad value instead of 42804 on every value.
  EXECUTE format(
    'INSERT INTO public.expense_property_allocations (expense_entry_id, property_area, amount)
     SELECT $1,
            (elem ->> %L)::%s,
            (elem ->> %L)::NUMERIC
       FROM jsonb_array_elements($2) AS elem',
    'property_area', v_area_type, 'amount')
  USING p_entry_id, p_allocations;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Keep the entry's face value in step with the rows that make it up.
  UPDATE public.monthly_expense_entries
     SET total_expenses = COALESCE((
           SELECT SUM(amount) FROM public.expense_property_allocations
            WHERE expense_entry_id = p_entry_id), 0),
         updated_at = NOW()
   WHERE id = p_entry_id;

  RETURN inserted_count;
END
$fn$;

COMMENT ON FUNCTION public.replace_expense_allocations(uuid, jsonb) IS
  'Atomically replaces every allocation of an expense entry and recomputes its '
  'total_expenses. Exists because supabase-js cannot open a transaction, and a '
  'delete-then-insert across two round trips loses the allocations when the insert '
  'is rejected. Reads property_area''s real type from the catalogue and casts to it: '
  'the column is an enum in production and a varchar on a database built from '
  'FULL_DATABASE_SCHEMA.sql, and migration 010 inserted uncast text, which failed '
  'against the enum every time (42804). Callers should still normalise property_area '
  'to a canonical value first (backend/src/config/propertyAreas.ts).';

-- Keep 010's grants: this function is not part of the public API surface.
REVOKE ALL ON FUNCTION public.replace_expense_allocations(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_expense_allocations(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_expense_allocations(uuid, jsonb) TO service_role;

COMMIT;

-- ============================================================================
-- Verification - exercises the function rather than just creating it.
-- ============================================================================
DO $verify$
DECLARE
  v_entry   uuid;
  v_cat     text;
  v_count   int;
  v_total   numeric;
  v_ok      boolean;
BEGIN
  SELECT code INTO v_cat FROM public.fixed_expense_categories ORDER BY display_order LIMIT 1;
  IF v_cat IS NULL THEN
    RAISE NOTICE '013 VERIFY: no expense categories seeded - behavioural check skipped';
    RETURN;
  END IF;

  INSERT INTO public.monthly_expense_entries (expense_date, or_supplier, category_code, total_expenses)
  VALUES (CURRENT_DATE, '013 self-test', v_cat, 0)
  RETURNING id INTO v_entry;

  -- 1. A valid replacement must succeed and recompute the total.
  PERFORM public.replace_expense_allocations(v_entry,
    '[{"property_area":"Boarding House","amount":255.50},
      {"property_area":"Main House","amount":44.50}]'::jsonb);

  SELECT count(*), coalesce(sum(amount),0) INTO v_count, v_total
    FROM public.expense_property_allocations WHERE expense_entry_id = v_entry;

  IF v_count <> 2 OR v_total <> 300.00 THEN
    RAISE EXCEPTION '013 FAILED: expected 2 allocations totalling 300.00, got % / %', v_count, v_total;
  END IF;

  -- 2. A bad label must be refused AND must leave the originals intact.
  v_ok := false;
  BEGIN
    PERFORM public.replace_expense_allocations(v_entry,
      '[{"property_area":"Front Apt","amount":10}]'::jsonb);
  EXCEPTION WHEN others THEN
    v_ok := true;
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION '013 FAILED: a non-canonical property area was accepted';
  END IF;

  SELECT count(*), coalesce(sum(amount),0) INTO v_count, v_total
    FROM public.expense_property_allocations WHERE expense_entry_id = v_entry;

  IF v_count <> 2 OR v_total <> 300.00 THEN
    RAISE EXCEPTION '013 FAILED: rejected payload destroyed the originals - % rows, % total',
      v_count, v_total;
  END IF;

  -- Clean up the self-test rows.
  DELETE FROM public.monthly_expense_entries WHERE id = v_entry;

  RAISE NOTICE '013 OK: valid replacement applied and recomputed; bad label refused '
               'with the original allocations intact.';
END
$verify$;
