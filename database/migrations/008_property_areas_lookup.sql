-- =============================================================================
-- Migration 008 — Property Area Lookup, and the Personal/Rental Boundary
-- =============================================================================
-- @phase          Phase 2 (Database Architecture)
-- @decisionRef    OD-05, closed 2026-09-13 by Group 4
-- @businessRules  BR-041 (expense allocation), BR-047 (reconciliation)
-- @sourceDoc      docs/10_MONTHLY_EXPENSES_REPORT.md §2, §5
--
-- `expense_property_allocations.property_area` is VARCHAR(100) NOT NULL free
-- text with no CHECK and no lookup, and the API writes whatever string arrives
-- (`backend/src/routes/admin.ts:1409`). A typo silently creates a sixth area
-- that no report will ever find again.
--
-- WHY THIS IS MORE THAN A TIDY-UP.
-- "Main House" was the one area with no matching unit cluster, and
-- `docs/10_MONTHLY_EXPENSES_REPORT.md:27` recorded its meaning as unconfirmed.
-- CONFIRMED 2026-09-13: **Main House is Mrs. Fe's own residence.** Those rows are
-- personal household costs that happen to share a book with the business \u2014 they
-- are NOT a cost of running the boarding house.
--
-- This matters arithmetically, not just descriptively. §5 of the source document
-- gives a real entry: the `4-Jun-26 Electricbill (May26)` row splits
-- \u20b114,964.13 to Boarding House and \u20b15,688.67 to Main House on ONE bill. If that
-- \u20b15,688.67 is counted as a business expense, net rental income is understated by
-- that amount every time it happens. `is_rental_expense` is what lets the income
-- report subtract only the \u20b114,964.13.
--
-- "Other Expenses / Personal" is marked non-rental for the same reason; it
-- already says so in its own name.
--
-- KNOWN GAP, recorded not invented: the five areas cover only three of the five
-- unit clusters. Penthouse and Linda have no area of their own. Where their
-- costs are recorded today is not established by any document, and this
-- migration does not guess \u2014 it is carried as a Phase 2 follow-up question.
--
-- Apply AFTER 001-007. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. The lookup. `code` deliberately holds the exact string already stored in
--    `expense_property_allocations.property_area`, so no data rewrite is needed
--    and the foreign key can be added against live rows as they stand.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_areas (
  code              VARCHAR(100) PRIMARY KEY,
  name              VARCHAR(150) NOT NULL,
  cluster_code      VARCHAR(50) REFERENCES public.clusters(code) ON UPDATE CASCADE,
  is_rental_expense BOOLEAN      NOT NULL DEFAULT TRUE,
  display_order     INTEGER      NOT NULL DEFAULT 0,
  notes             TEXT
);

COMMENT ON TABLE public.property_areas IS
  'The five allocation buckets of the monthly expense ledger '
  '(10_MONTHLY_EXPENSES_REPORT.md section 2). is_rental_expense = FALSE marks '
  'costs that are not a cost of running the boarding house and must be excluded '
  'from net rental income.';

COMMENT ON COLUMN public.property_areas.is_rental_expense IS
  'FALSE for Main House (Mrs. Fe personal residence) and Other/Personal. Net '
  'rental income must sum only the TRUE rows. Confirmed 2026-09-13 (OD-05).';

INSERT INTO public.property_areas (code, name, cluster_code, is_rental_expense, display_order, notes)
VALUES
  ('Boarding House',            'Boarding House Expenses',   'BH',              TRUE,  1,
   'Maps to the BH (Main Rooms) cluster.'),
  ('Main House',                'Main House Expenses',        NULL,             FALSE, 2,
   'Mrs. Fe Galang Da Silva personal residence. Confirmed 2026-09-13 (OD-05). '
   'Not a rental cost; excluded from net rental income. Shares utility bills '
   'with the boarding house, which is why entries split across two areas.'),
  ('Front Apartment',           'Front Apartment Expenses',  'Front Apartment', TRUE,  3,
   'Maps to the Front Apartment cluster.'),
  ('Back Apartment',            'Back Apartment Expenses',   'Back Apartment',  TRUE,  4,
   'Maps to the Back Apartment cluster.'),
  ('Other Expenses / Personal', 'Other Expenses / Personal',  NULL,             FALSE, 5,
   'Non-rental by definition. Excluded from net rental income.')
ON CONFLICT (code) DO UPDATE
SET name              = EXCLUDED.name,
    cluster_code      = EXCLUDED.cluster_code,
    is_rental_expense = EXCLUDED.is_rental_expense,
    display_order     = EXCLUDED.display_order,
    notes             = EXCLUDED.notes;

-- -----------------------------------------------------------------------------
-- 2. Refuse to constrain live data that would not satisfy the constraint.
--    Fails inside the transaction and rolls back, rather than half-applying.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  strays TEXT;
BEGIN
  SELECT string_agg(DISTINCT quote_literal(a.property_area), ', ')
    INTO strays
    FROM public.expense_property_allocations a
    LEFT JOIN public.property_areas p ON p.code = a.property_area
   WHERE p.code IS NULL;

  IF strays IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration 008 stopped: expense_property_allocations holds property_area '
      'value(s) not in the lookup: %. Reconcile them to the five canonical '
      'areas, then re-run. Nothing has been committed.', strays;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Constrain it. ON UPDATE CASCADE so a future rename propagates instead of
--    orphaning history; ON DELETE RESTRICT because an area with expenses
--    allocated against it must not be removable.
-- -----------------------------------------------------------------------------
ALTER TABLE public.expense_property_allocations
  DROP CONSTRAINT IF EXISTS expense_property_allocations_property_area_fkey;

ALTER TABLE public.expense_property_allocations
  ADD CONSTRAINT expense_property_allocations_property_area_fkey
  FOREIGN KEY (property_area) REFERENCES public.property_areas(code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_expense_alloc_area
  ON public.expense_property_allocations (property_area);

-- -----------------------------------------------------------------------------
-- 4. Verify.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  area_count    INTEGER;
  nonrental_cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO area_count    FROM public.property_areas;
  SELECT COUNT(*) INTO nonrental_cnt FROM public.property_areas WHERE NOT is_rental_expense;

  IF area_count <> 5 THEN
    RAISE EXCEPTION 'Migration 008 failed: expected 5 property areas, found %.', area_count;
  END IF;
  IF nonrental_cnt <> 2 THEN
    RAISE EXCEPTION
      'Migration 008 failed: expected 2 non-rental areas (Main House, Other/Personal), found %.',
      nonrental_cnt;
  END IF;

  RAISE NOTICE 'Migration 008 OK: 5 property areas, 2 of them non-rental, '
               'allocations now constrained by foreign key.';
END $$;

COMMIT;
