-- ============================================================================
-- Migration 012 - Penthouse expense area, and cluster -> expense area routing
-- ============================================================================
-- Closes OD-15, answered by the owner on 2026-09-13:
--
--   "the expense can be put to front, back, boarding house, main house and
--    penthouse. the penthouse is another separate category since its a large
--    unit so its own category, and linda is on the back category."
--
-- Two changes follow from that, and they are not the same change.
--
-- A. Penthouse becomes a sixth Property Area. It is a rental expense.
--
-- B. The cluster -> area mapping is moved to the side of the relationship that
--    can actually express it.
--
--    Migration 008 put `cluster_code` on `property_areas`, which makes the
--    relationship one area -> one cluster. The owner's answer is
--    many clusters -> one area: BOTH the "Back Apartment" cluster AND the
--    "Linda" cluster book their costs to the "Back Apartment" area. That cannot
--    be written down in a column that lives on property_areas without either
--    inventing a duplicate area row or leaving Linda unmapped, which is the
--    state the database is in today.
--
--    So `clusters.expense_area` is added (N clusters : 1 area) and
--    `property_areas.cluster_code` is dropped. Keeping both would be a stored
--    redundancy that can disagree with itself - precisely the kind of finding
--    the Phase 2 3NF proof has to survive. Nothing reads the dropped column:
--    the backend carries its own list in backend/src/config/propertyAreas.ts
--    and never queries property_areas.cluster_code.
--
-- NOTE ON ORDERING. PostgreSQL will not let a value added by ALTER TYPE ... ADD
-- VALUE be used in the same transaction that added it. Step 1 therefore commits
-- on its own before step 2 references 'Penthouse'. Run this file as a whole
-- (psql / the Supabase SQL Editor handle the split correctly); do not wrap the
-- entire file in a single explicit transaction.
--
-- Idempotent. Touches no expense amounts - only classification.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Step 1 - extend the enum. Must commit before the value can be used.
-- ---------------------------------------------------------------------------
-- Guarded, because the enum only exists in production. On a database built from
-- FULL_DATABASE_SCHEMA.sql the column is VARCHAR(100) and migration 008 builds
-- property_areas.code to match it, so there is no type to extend and the seed in
-- step 2 works unchanged. An unguarded ALTER TYPE here failed with 42704 on
-- exactly such a database during testing.
DO $mig012enum$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = 'property_area_type'
  ) THEN
    ALTER TYPE public.property_area_type ADD VALUE IF NOT EXISTS 'Penthouse';
    RAISE NOTICE '012: property_area_type extended with Penthouse';
  ELSE
    RAISE NOTICE '012: property_area_type not present - column is not an enum, nothing to extend';
  END IF;
END
$mig012enum$;


-- ---------------------------------------------------------------------------
-- Step 2 - seed the Penthouse area and re-point the mapping.
-- ---------------------------------------------------------------------------
BEGIN;

-- 2a. The sixth area. is_rental_expense = TRUE: the penthouse is let to
--     tenants, so its upkeep is a cost of running the property, unlike
--     'Main House' (the owner's residence) and 'Other Expenses / Personal'.
INSERT INTO public.property_areas (code, name, is_rental_expense, display_order, notes)
VALUES (
  'Penthouse',
  'Penthouse Expenses',
  TRUE,
  6,
  'Sixth area, added 2026-09-13 (OD-15). The penthouse is a single large unit '
  || 'and the owner books its costs separately rather than folding them into '
  || 'Boarding House. Before this row existed, PH costs had nowhere to go.'
)
ON CONFLICT (code) DO UPDATE
  SET name              = EXCLUDED.name,
      is_rental_expense = EXCLUDED.is_rental_expense,
      display_order     = EXCLUDED.display_order,
      notes             = EXCLUDED.notes;

-- 2b. Add the correctly-sided mapping column, typed to match the key it will
--     reference. property_areas.code is the enum in production and VARCHAR(100)
--     on a database built from FULL_DATABASE_SCHEMA.sql, because migration 008
--     builds it to match the referencing column. Hardcoding the enum here failed
--     with 42704 on such a database during testing, so the type is read rather
--     than assumed - the same technique that repaired 008.
DO $mig012col$
DECLARE
  v_code_type text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'clusters' AND column_name = 'expense_area'
  ) THEN
    RAISE NOTICE '012: clusters.expense_area already present';
    RETURN;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod)
    INTO v_code_type
    FROM pg_attribute a
    JOIN pg_class c     ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'property_areas' AND a.attname = 'code'
     AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_code_type IS NULL THEN
    RAISE EXCEPTION '012: property_areas.code not found - run migration 008 first';
  END IF;

  EXECUTE format('ALTER TABLE public.clusters ADD COLUMN expense_area %s', v_code_type);
  RAISE NOTICE '012: clusters.expense_area added as %', v_code_type;
END
$mig012col$;

DO $mig012a$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'clusters_expense_area_fkey'
       AND conrelid = 'public.clusters'::regclass
  ) THEN
    ALTER TABLE public.clusters
      ADD CONSTRAINT clusters_expense_area_fkey
      FOREIGN KEY (expense_area) REFERENCES public.property_areas(code)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END
$mig012a$;

-- 2c. Populate it. 'Linda' -> 'Back Apartment' is the owner's answer, and is the
--     mapping the old column could not represent.
UPDATE public.clusters SET expense_area = 'Boarding House'  WHERE code = 'BH';
UPDATE public.clusters SET expense_area = 'Back Apartment'  WHERE code = 'Back Apartment';
UPDATE public.clusters SET expense_area = 'Back Apartment'  WHERE code = 'Linda';
UPDATE public.clusters SET expense_area = 'Front Apartment' WHERE code = 'Front Apartment';
UPDATE public.clusters SET expense_area = 'Penthouse'       WHERE code = 'Penthouse';

-- 2d. Every cluster must now route somewhere. This is the condition whose
--     absence was OD-15: three of the thirty-three units had no destination.
ALTER TABLE public.clusters
  ALTER COLUMN expense_area SET NOT NULL;

COMMENT ON COLUMN public.clusters.expense_area IS
  'Which Property Area this cluster''s costs are booked to in the monthly expense '
  'ledger. Many clusters may share one area - "Linda" and "Back Apartment" both '
  'book to "Back Apartment" (OD-15, 2026-09-13). Replaces property_areas.cluster_code, '
  'which could only express one area to one cluster and therefore left Linda and '
  'Penthouse unmapped.';

-- 2e. Drop the superseded, wrong-sided column.
ALTER TABLE public.property_areas DROP COLUMN IF EXISTS cluster_code;

COMMIT;


-- ============================================================================
-- Verification
-- ============================================================================
DO $mig012b$
DECLARE
  v_areas     int;
  v_rental    int;
  v_unmapped  int;
  v_ph_area   text;
BEGIN
  SELECT count(*) INTO v_areas  FROM public.property_areas;
  SELECT count(*) INTO v_rental FROM public.property_areas WHERE is_rental_expense;
  SELECT count(*) INTO v_unmapped FROM public.clusters WHERE expense_area IS NULL;

  SELECT c.expense_area::text INTO v_ph_area
    FROM public.rooms r JOIN public.clusters c ON c.code = r.cluster_code
   WHERE r.room_number = 'PH';

  RAISE NOTICE '012 VERIFY: property areas = % (% rental, % personal)',
    v_areas, v_rental, v_areas - v_rental;
  RAISE NOTICE '012 VERIFY: clusters with no expense area = %', v_unmapped;
  RAISE NOTICE '012 VERIFY: PH routes to area = %', v_ph_area;

  IF v_areas <> 6 THEN
    RAISE EXCEPTION '012 FAILED: expected 6 property areas, found %', v_areas;
  END IF;
  IF v_rental <> 4 THEN
    RAISE EXCEPTION '012 FAILED: expected 4 rental areas, found %', v_rental;
  END IF;
  IF v_unmapped > 0 THEN
    RAISE EXCEPTION '012 FAILED: % cluster(s) still route nowhere', v_unmapped;
  END IF;
  IF v_ph_area IS DISTINCT FROM 'Penthouse' THEN
    RAISE EXCEPTION '012 FAILED: PH routes to %, expected Penthouse', v_ph_area;
  END IF;

  RAISE NOTICE '012 OK';
END
$mig012b$;
