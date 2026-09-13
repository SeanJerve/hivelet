-- ============================================================================
-- Migration 014 - put the production-only objects into version control
-- ============================================================================
-- Two objects enforce business rules in production and exist in NO file in this
-- repository. They were applied out of band and never written back. Found
-- 2026-09-13 by building a database from FULL_DATABASE_SCHEMA.sql + 001-004 and
-- comparing it against the live catalogue.
--
--   A. update_expense_entry_total() + trg_update_expense_total
--      Keeps monthly_expense_entries.total_expenses equal to the sum of its
--      allocations. This IS BR-045. A database rebuilt from this repository has
--      no triggers at all, so expense totals would silently stop tracking the
--      rows that make them up - no error, just quietly wrong numbers.
--
--   B. UNIQUE (expense_entry_id, property_area) on expense_property_allocations
--      One expense entry charges a given Property Area at most once - BR-044.
--      It is also the only composite candidate key in the entire schema, and
--      the whole 2NF section of PHASE2_NORMALIZATION_PROOF.md is an argument
--      about it. Proving a property of a constraint that no file creates is not
--      a proof anybody should accept.
--
-- **In production this migration is a no-op.** Both objects are already there;
-- every statement below is guarded or idempotent. Its purpose is that the next
-- person who rebuilds this database from the repository gets a correct one.
--
-- This is deliberately NOT a rewrite of FULL_DATABASE_SCHEMA.sql. That file is
-- never edited (standing constraint), and it is not trusted either - it is an
-- inaccurate bootstrap, and the accurate description of the live database is
-- database/live_schema.csv.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A. The expense-total trigger.
-- ---------------------------------------------------------------------------
-- Body reproduced from production via pg_get_functiondef(), with search_path
-- pinned to match the posture migration 011 establishes for every function.
CREATE OR REPLACE FUNCTION public.update_expense_entry_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $trgfn$
BEGIN
    UPDATE public.monthly_expense_entries
    SET total_expenses = (
        SELECT COALESCE(SUM(amount), 0.00)
        FROM public.expense_property_allocations
        WHERE expense_entry_id = COALESCE(NEW.expense_entry_id, OLD.expense_entry_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.expense_entry_id, OLD.expense_entry_id);
    RETURN NEW;
END;
$trgfn$;

COMMENT ON FUNCTION public.update_expense_entry_total() IS
  'Maintains monthly_expense_entries.total_expenses as the sum of that entry''s '
  'allocations (BR-045). Codified by migration 014: it had existed only in the '
  'production database, in no file in this repository, since before the pipeline '
  'began. A database rebuilt from the repo had no triggers at all.';

DROP TRIGGER IF EXISTS trg_update_expense_total ON public.expense_property_allocations;
CREATE TRIGGER trg_update_expense_total
AFTER INSERT OR DELETE OR UPDATE ON public.expense_property_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_expense_entry_total();

-- ---------------------------------------------------------------------------
-- B. The composite unique key (BR-044).
-- ---------------------------------------------------------------------------
-- Added only if no unique constraint exists on the table, and only if the live
-- data would actually satisfy it. Constraining data that violates the rule
-- should fail loudly here rather than silently later.
DO $mig014$
DECLARE
  v_dupes int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.expense_property_allocations'::regclass
       AND contype = 'u'
  ) THEN
    RAISE NOTICE '014: composite unique key already present - nothing to do';
    RETURN;
  END IF;

  SELECT count(*) INTO v_dupes FROM (
    SELECT expense_entry_id, property_area
      FROM public.expense_property_allocations
     GROUP BY expense_entry_id, property_area
    HAVING count(*) > 1
  ) d;

  IF v_dupes > 0 THEN
    RAISE EXCEPTION
      '014 stopped: % (entry, area) pair(s) appear more than once. BR-044 cannot '
      'be enforced until they are merged. Nothing has been committed.', v_dupes;
  END IF;

  ALTER TABLE public.expense_property_allocations
    ADD CONSTRAINT expense_property_allocations_expense_entry_id_property_area_key
    UNIQUE (expense_entry_id, property_area);

  RAISE NOTICE '014: added UNIQUE (expense_entry_id, property_area)';
END
$mig014$;

COMMIT;

-- ============================================================================
-- Verification - exercises both objects rather than just checking they exist.
-- ============================================================================
DO $verify$
DECLARE
  v_entry uuid;
  v_cat   text;
  v_total numeric;
  v_ok    boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_update_expense_total' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION '014 FAILED: trg_update_expense_total is not present';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.expense_property_allocations'::regclass AND contype = 'u'
  ) THEN
    RAISE EXCEPTION '014 FAILED: the composite unique key is not present';
  END IF;

  SELECT code INTO v_cat FROM public.fixed_expense_categories ORDER BY display_order LIMIT 1;
  IF v_cat IS NULL THEN
    RAISE NOTICE '014 VERIFY: no expense categories seeded - behavioural check skipped';
    RETURN;
  END IF;

  INSERT INTO public.monthly_expense_entries (expense_date, or_supplier, category_code, total_expenses)
  VALUES (CURRENT_DATE, '014 self-test', v_cat, 0)
  RETURNING id INTO v_entry;

  -- The trigger must recompute the total on insert.
  INSERT INTO public.expense_property_allocations (expense_entry_id, property_area, amount)
  VALUES (v_entry, 'Boarding House', 120.00), (v_entry, 'Main House', 80.00);

  SELECT total_expenses INTO v_total
    FROM public.monthly_expense_entries WHERE id = v_entry;
  IF v_total <> 200.00 THEN
    RAISE EXCEPTION '014 FAILED: trigger did not recompute the total - expected 200.00, got %', v_total;
  END IF;

  -- And on delete.
  DELETE FROM public.expense_property_allocations
   WHERE expense_entry_id = v_entry AND property_area::text = 'Main House';

  SELECT total_expenses INTO v_total
    FROM public.monthly_expense_entries WHERE id = v_entry;
  IF v_total <> 120.00 THEN
    RAISE EXCEPTION '014 FAILED: trigger did not recompute after delete - expected 120.00, got %', v_total;
  END IF;

  -- BR-044: the same area twice in one entry must be refused.
  v_ok := false;
  BEGIN
    INSERT INTO public.expense_property_allocations (expense_entry_id, property_area, amount)
    VALUES (v_entry, 'Boarding House', 1.00);
  EXCEPTION WHEN unique_violation THEN
    v_ok := true;
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION '014 FAILED: a duplicate (entry, area) pair was accepted';
  END IF;

  DELETE FROM public.monthly_expense_entries WHERE id = v_entry;

  RAISE NOTICE '014 OK: trigger recomputes on insert and delete; duplicate (entry, area) refused.';
END
$verify$;
