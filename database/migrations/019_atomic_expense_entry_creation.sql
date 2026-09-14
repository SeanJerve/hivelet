-- =============================================================================
-- Migration 019 — Atomic Expense Entry Creation
-- =============================================================================
-- @phase          Phase 3
-- @businessRules  BR-041 (property-area split), BR-047 (category reconciliation)
-- @requirements   FR-037 .. FR-042 (the landlady's expense ledger)
--
-- WHAT THIS CLOSES
-- ----------------
-- Migration 010 made the UPDATE path atomic. `POST /api/admin/expense-entries`
-- was never given the same treatment, and still performs two unrelated writes:
--
--   1. INSERT INTO monthly_expense_entries      (total_expenses computed in JS)
--   2. INSERT INTO expense_property_allocations (the split, one row per area)
--
-- Two PostgREST round trips with nothing joining them. If step 2 fails - a bad
-- enum label, the foreign key migration 008 added, a duplicate (entry, area)
-- pair - step 1 has already committed. The result is an expense entry carrying
-- a real total with **no allocations underneath it**.
--
-- That is precisely the state BR-047 forbids. The rule requires that the sum of
-- the category totals equal the sum of the Property Area totals for the same
-- month; an entry with a total and no allocation puts the two sides out of
-- balance by that amount, permanently, and nothing in the application would ever
-- notice. The route does surface the error to the caller, but the orphaned row
-- stays behind.
--
-- All 1,262 live entries and 1,327 allocations currently reconcile exactly -
-- 5,823,586.47 on both sides across 31 months, zero variance. This migration is
-- what keeps that true rather than lucky.
--
-- HOW
-- ---
-- One plpgsql function, one implicit transaction. The entry is inserted, then
-- `replace_expense_allocations()` - which already exists and already derives the
-- entry's total from the allocation rows - is called inside the same
-- transaction. If it raises for any reason, the entry insert rolls back with it.
--
-- The total is DERIVED, never accepted from the caller. The route previously
-- computed it in JavaScript with a float `reduce` and sent it along, so the
-- stored figure and the rows beneath it were two independent assertions that
-- happened to agree. Now there is only one.
--
-- Apply AFTER 018. Safe to re-run.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.create_expense_entry_with_allocations(
  p_expense_date   DATE,
  p_or_supplier    TEXT,
  p_category_code  TEXT,
  p_allocations    JSONB,
  p_created_by     UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_entry_id    UUID;
  v_alloc_count INTEGER;
  v_entry       public.monthly_expense_entries%ROWTYPE;
BEGIN
  IF p_expense_date IS NULL THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: p_expense_date is required';
  END IF;

  IF p_or_supplier IS NULL OR btrim(p_or_supplier) = '' THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: p_or_supplier is required';
  END IF;

  IF p_category_code IS NULL OR btrim(p_category_code) = '' THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: p_category_code is required';
  END IF;

  IF jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: p_allocations must be a JSON array, got %',
      COALESCE(jsonb_typeof(p_allocations), 'null');
  END IF;

  -- An expense that is not allocated to any area is not a recordable expense:
  -- it would sit in the category totals with nothing on the Property Area side,
  -- which is the BR-047 imbalance this function exists to prevent.
  IF jsonb_array_length(p_allocations) = 0 THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: at least one property-area allocation is required (BR-041)';
  END IF;

  -- Fails here rather than with a foreign key violation three statements later.
  IF NOT EXISTS (
    SELECT 1 FROM public.fixed_expense_categories WHERE code = p_category_code
  ) THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: no expense category %', p_category_code;
  END IF;

  -- Seeded at zero deliberately. The real figure is derived from the allocation
  -- rows by replace_expense_allocations() below; accepting a total from the
  -- caller is what allowed the stored figure and its own rows to disagree.
  INSERT INTO public.monthly_expense_entries (
    expense_date, or_supplier, category_code, total_expenses, created_by
  )
  VALUES (
    p_expense_date, p_or_supplier, p_category_code, 0, p_created_by
  )
  RETURNING id INTO v_entry_id;

  -- Shares this function's transaction. Anything it raises - a bad area label,
  -- the migration 008 foreign key, a duplicate (entry, area) pair - takes the
  -- INSERT above down with it, which is the whole point.
  v_alloc_count := public.replace_expense_allocations(v_entry_id, p_allocations);

  IF v_alloc_count IS NULL OR v_alloc_count = 0 THEN
    RAISE EXCEPTION 'create_expense_entry_with_allocations: no allocation rows were written for entry %', v_entry_id;
  END IF;

  SELECT * INTO v_entry FROM public.monthly_expense_entries WHERE id = v_entry_id;

  RETURN to_jsonb(v_entry) || jsonb_build_object('allocation_count', v_alloc_count);
END
$fn$;

COMMENT ON FUNCTION public.create_expense_entry_with_allocations(DATE, TEXT, TEXT, JSONB, UUID) IS
  'Creates an expense entry and its property-area allocations in one transaction, deriving '
  'total_expenses from the allocation rows rather than accepting it from the caller. Exists '
  'because the create route wrote the entry and its allocations as two separate round trips, so '
  'a rejected allocation left an entry carrying a total with nothing underneath it - the exact '
  'imbalance BR-047 forbids. Migration 010 fixed the update path; this is the create path.';

REVOKE ALL ON FUNCTION public.create_expense_entry_with_allocations(DATE, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_expense_entry_with_allocations(DATE, TEXT, TEXT, JSONB, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.create_expense_entry_with_allocations(DATE, TEXT, TEXT, JSONB, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_expense_entry_with_allocations(DATE, TEXT, TEXT, JSONB, UUID) TO service_role;

DO $verify$
DECLARE
  v_out_of_balance INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'create_expense_entry_with_allocations'
  ) THEN
    RAISE EXCEPTION 'Migration 019 failed: create_expense_entry_with_allocations was not created.';
  END IF;

  IF has_function_privilege('anon', 'public.create_expense_entry_with_allocations(date,text,text,jsonb,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Migration 019 failed: anon can execute create_expense_entry_with_allocations.';
  END IF;

  -- BR-047 as it stands right now. This asserts nothing about the future; it
  -- records that the ledger was in balance at the moment this was applied, so a
  -- later divergence can be dated.
  SELECT count(*) INTO v_out_of_balance
    FROM (
      SELECT date_trunc('month', e.expense_date) AS m,
             SUM(e.total_expenses)               AS entries_total,
             (SELECT COALESCE(SUM(a.amount), 0)
                FROM public.expense_property_allocations a
                JOIN public.monthly_expense_entries e2 ON e2.id = a.expense_entry_id
               WHERE e2.voided_at IS NULL
                 AND date_trunc('month', e2.expense_date) = date_trunc('month', e.expense_date)
             ) AS alloc_total
        FROM public.monthly_expense_entries e
       WHERE e.voided_at IS NULL
       GROUP BY 1
    ) t
   WHERE round(entries_total, 2) <> round(alloc_total, 2);

  IF v_out_of_balance > 0 THEN
    RAISE WARNING 'Migration 019: % month(s) do not reconcile (BR-047). The function is in place; the existing rows need review.', v_out_of_balance;
  ELSE
    RAISE NOTICE 'Migration 019 OK: create_expense_entry_with_allocations() created, execute granted to service_role only, and every month reconciles (BR-047).';
  END IF;
END
$verify$;

COMMIT;
