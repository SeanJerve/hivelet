-- =============================================================================
-- Migration 010 — Atomic Replacement of Expense Allocations
-- =============================================================================
-- @phase          Phase 2 / Phase 3 boundary
-- @defectRef      PHASE2_LOCKED_DECISIONS.md D-2; PHASE1 known defect 7
-- @businessRules  BR-041 (expense allocation), BR-047 (reconciliation)
--
-- `PATCH /api/admin/expense-entries/:id` replaces an entry's allocations by DELETEing them all and
-- then INSERTing the replacements (`backend/src/routes/admin.ts:1471-1477`). Those are two separate
-- PostgREST round trips with nothing joining them, because supabase-js has no transaction support -
-- which is why no `BEGIN`/`COMMIT` appears anywhere in `backend/src`.
--
-- That was survivable only while `property_area` was unconstrained free text. Migration `008` added a
-- foreign key, so a bad area now makes the INSERT fail - and the DELETE has already committed. The
-- entry silently loses every allocation it had.
--
-- A plpgsql function executes inside a single implicit transaction, so wrapping the pair here makes
-- the replacement atomic: if any row is rejected, the DELETE rolls back with it and the entry keeps
-- the allocations it started with.
--
-- Apply AFTER 008. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.replace_expense_allocations(
  p_entry_id     UUID,
  p_allocations  JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  inserted_count INTEGER;
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

  -- Both statements share this function's transaction. A foreign key violation on the INSERT
  -- rolls the DELETE back with it, which is the entire point of this function.
  DELETE FROM public.expense_property_allocations
   WHERE expense_entry_id = p_entry_id;

  INSERT INTO public.expense_property_allocations (expense_entry_id, property_area, amount)
  SELECT p_entry_id,
         elem ->> 'property_area',
         (elem ->> 'amount')::NUMERIC
    FROM jsonb_array_elements(p_allocations) AS elem;

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

COMMENT ON FUNCTION public.replace_expense_allocations(UUID, JSONB) IS
  'Atomically replaces every allocation of an expense entry and recomputes its total_expenses. '
  'Exists because supabase-js cannot open a transaction, and a delete-then-insert across two '
  'round trips loses the allocations when the insert is rejected by the property_area foreign '
  'key. Callers should still normalise property_area to a canonical value first (see '
  'backend/src/config/propertyAreas.ts) so the rejection never happens.';

REVOKE ALL ON FUNCTION public.replace_expense_allocations(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_expense_allocations(UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.replace_expense_allocations(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_expense_allocations(UUID, JSONB) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'replace_expense_allocations'
  ) THEN
    RAISE EXCEPTION 'Migration 010 failed: function was not created.';
  END IF;
  RAISE NOTICE 'Migration 010 OK: replace_expense_allocations() created, execute granted to service_role only.';
END $$;

COMMIT;
