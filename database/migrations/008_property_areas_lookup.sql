-- =============================================================================
-- Migration 008 — Property Area Metadata, and the Personal/Rental Boundary
-- =============================================================================
-- @phase          Phase 2 (Database Architecture)
-- @decisionRef    OD-05, closed 2026-09-13 by Group 4
-- @businessRules  BR-041 (expense allocation), BR-047 (reconciliation)
-- @sourceDoc      docs/10_MONTHLY_EXPENSES_REPORT.md section 2, section 5
--
-- WHY THIS MIGRATION EXISTS.
-- "Main House" was the one expense area with no matching unit cluster, and
-- docs/10_MONTHLY_EXPENSES_REPORT.md:27 recorded its meaning as unconfirmed.
-- CONFIRMED 2026-09-13: Main House is the owner's own residence. Those rows are
-- personal household costs that share a book with the business. They are NOT a
-- cost of running the boarding house.
--
-- That is arithmetic, not labelling. Section 5 of the source document gives a real
-- entry: the 4-Jun-26 Electricbill (May26) row splits P14,964.13 to Boarding House
-- and P5,688.67 to Main House on ONE bill. Across the live ledger the personal
-- share is P3,432,990.47 of P5,823,586.47 - 58.9%. Counting it as a business
-- expense understates net rental income by that much. is_rental_expense is what
-- lets a report subtract only the operating half.
--
-- SECOND CORRECTION FOR SCHEMA DRIFT - read this before assuming the premise.
-- The first version of this migration was written against FULL_DATABASE_SCHEMA.sql,
-- which declares property_area VARCHAR(100) NOT NULL, and argued the column was
-- unconstrained free text where a typo would silently create a sixth area.
-- Applying it to the live database failed:
--
--   ERROR 42883: operator does not exist: character varying = property_area_type
--
-- In production property_area is a custom ENUM, property_area_type - not varchar.
-- The repository does not mention that type anywhere. So the original premise was
-- wrong: the column was never free text and typos were already impossible. The
-- foreign key below is therefore NOT the point; it is a formality that lets the
-- metadata table join cleanly.
--
-- The point is is_rental_expense, which no enum can carry, and which nothing in
-- the live database currently records anywhere.
--
-- Rather than assume a type a second time, step 1 READS the actual type of
-- expense_property_allocations.property_area and builds the lookup primary key to
-- match. It is correct whether the column is the enum, a varchar, or something
-- else again.
--
-- KNOWN GAP, recorded not invented: the five areas cover only three of the five
-- unit clusters. Penthouse and Linda have no area of their own, and where their
-- costs are recorded is not established by any document (OD-15). Not guessed here.
--
-- Apply AFTER 001-007. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Build the lookup with a primary key of whatever type the referencing column
--    actually is, read from the catalogue rather than assumed.
-- -----------------------------------------------------------------------------
DO $mig$
DECLARE
  col_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
    INTO col_type
    FROM pg_attribute a
    JOIN pg_class     c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'expense_property_allocations'
     AND a.attname = 'property_area'
     AND a.attnum  > 0
     AND NOT a.attisdropped;

  IF col_type IS NULL THEN
    RAISE EXCEPTION
      'Migration 008: expense_property_allocations.property_area does not exist.';
  END IF;

  RAISE NOTICE 'Migration 008: property_area is of type %; building lookup to match.', col_type;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.property_areas ('
    '  code              %s PRIMARY KEY,'
    '  name              VARCHAR(150) NOT NULL,'
    '  cluster_code      VARCHAR(50) REFERENCES public.clusters(code) ON UPDATE CASCADE,'
    '  is_rental_expense BOOLEAN      NOT NULL DEFAULT TRUE,'
    '  display_order     INTEGER      NOT NULL DEFAULT 0,'
    '  notes             TEXT'
    ')', col_type);
END
$mig$;

COMMENT ON TABLE public.property_areas IS
  'Metadata for the five allocation buckets of the monthly expense ledger '
  '(10_MONTHLY_EXPENSES_REPORT.md section 2). The set of valid values is already '
  'enforced by the property_area_type enum; what this table adds is '
  'is_rental_expense, which the enum cannot carry.';

COMMENT ON COLUMN public.property_areas.is_rental_expense IS
  'FALSE for Main House (the owner personal residence) and Other/Personal. Net '
  'rental income must sum only the TRUE rows. Confirmed 2026-09-13 (OD-05).';

-- -----------------------------------------------------------------------------
-- 2. Seed. Unquoted string literals are of unknown type and coerce to whatever
--    code turned out to be, so this works for an enum or a varchar alike.
-- -----------------------------------------------------------------------------
INSERT INTO public.property_areas (code, name, cluster_code, is_rental_expense, display_order, notes)
VALUES
  ('Boarding House',            'Boarding House Expenses',   'BH',              TRUE,  1,
   'Maps to the BH (Main Rooms) cluster.'),
  ('Main House',                'Main House Expenses',        NULL,             FALSE, 2,
   'The owner personal residence. Confirmed 2026-09-13 (OD-05). Not a rental '
   'cost; excluded from net rental income. Shares utility bills with the boarding '
   'house, which is why single entries split across two areas.'),
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
-- 3. Refuse to constrain live data that would not satisfy the constraint.
--    Both sides are now the same type, so this comparison is valid.
-- -----------------------------------------------------------------------------
DO $mig$
DECLARE
  strays TEXT;
BEGIN
  SELECT string_agg(DISTINCT quote_literal(a.property_area::text), ', ')
    INTO strays
    FROM public.expense_property_allocations a
    LEFT JOIN public.property_areas p ON p.code = a.property_area
   WHERE p.code IS NULL;

  IF strays IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration 008 stopped: expense_property_allocations holds property_area '
      'value(s) with no row in the lookup: %. Seed them, then re-run. Nothing '
      'has been committed.', strays;
  END IF;
END
$mig$;

-- -----------------------------------------------------------------------------
-- 4. Constrain it. The enum already restricts the value set, so this foreign key
--    is about referential integrity with the metadata table, not about typos.
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
-- 5. Verify.
-- -----------------------------------------------------------------------------
DO $mig$
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
               'allocations now joined to the lookup by foreign key.';
END
$mig$;

COMMIT;
