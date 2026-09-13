-- =============================================================================
-- Migration 007 — Correct the Penthouse to the Rooftop Level
-- =============================================================================
-- @phase          Phase 2 (Database Architecture / data cleanup)
-- @decisionRef    PHASE1_LOCKED_DECISIONS.md §1; OD-13 (closed 2026-09-13)
-- @confirmedBy    Owner, re-confirmed 2026-09-13: the penthouse sits on its own
--                 rooftop level above floor 3. The building has four levels.
-- @defectRef      PHASE1_LOCKED_DECISIONS.md known defect 10
-- @businessRules  BR-032 (property model)
-- @architecture   ARCH-001 Room-Centric Tenancy
--
-- `PH` is seeded with floor = 3 (`database/FULL_DATABASE_SCHEMA.sql:499`). It is
-- the only penthouse and it occupies a rooftop level of its own. Corrected here
-- as an incremental migration; the master schema file is never edited.
--
-- SCHEMA DRIFT — why this migration has a step 1 at all.
-- The first version of this file went straight to the UPDATE, on the evidence of
-- `FULL_DATABASE_SCHEMA.sql`, which declares `floor INTEGER NOT NULL DEFAULT 1`
-- with no CHECK. Applying it to the live database failed:
--
--   ERROR 23514: new row for relation "rooms" violates check constraint "rooms_floor_check"
--
-- The live database carries a `rooms_floor_check` constraint that **exists
-- nowhere in this repository** — not in the master schema file, not in migrations
-- `001`-`004`. It was applied out of band. It almost certainly caps `floor` at 3,
-- which was correct until the penthouse was confirmed to sit on a fourth level.
--
-- The transaction rolled the failure back cleanly and nothing was left half-done,
-- which is the behaviour these migrations are written for. Step 1 now relaxes the
-- constraint to the real building before touching the row, and reports whatever
-- definition it replaced so the drift is recorded rather than silently erased.
--
-- SCOPE LIMIT — read this before assuming the floor data is now correct.
-- The owner's authoritative survey is 11 / 11 / 10 / 1. After this migration the
-- seeded per-unit values yield 12 / 11 / 9 / 1: one unit sits on floor 1 in the
-- data that the survey places on floor 3. LF and LB were confirmed on floor 1 on
-- 2026-09-13, so every floor-1 unit is now accounted for and each encodes its own
-- level — which points at the survey being one out, not the data. Tracked as
-- OD-14. This migration does not guess; it corrects only `PH`.
--
-- Apply AFTER 001-006. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Make room for a fourth level.
--
--    Finds any CHECK constraint on `rooms` whose definition mentions `floor`,
--    regardless of name, reports it, drops it, and installs one that matches the
--    building as surveyed. Doing this by definition rather than by name means the
--    migration works whether the live constraint is called `rooms_floor_check` or
--    something else, and whether or not it exists at all (a database built purely
--    from the repo has none).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  found BOOLEAN := FALSE;
BEGIN
  FOR r IN
    SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class     rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'rooms'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%floor%'
  LOOP
    found := TRUE;
    RAISE NOTICE 'Migration 007: replacing CHECK constraint % -> %', r.conname, r.definition;
    EXECUTE format('ALTER TABLE public.rooms DROP CONSTRAINT %I', r.conname);
  END LOOP;

  IF NOT found THEN
    RAISE NOTICE 'Migration 007: no pre-existing floor CHECK constraint found; adding one.';
  END IF;
END $$;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_floor_check
  CHECK (floor BETWEEN 1 AND 4);

COMMENT ON COLUMN public.rooms.floor IS
  'Building level. 1-3 are residential floors; 4 is the rooftop level occupied '
  'only by the penthouse (PH). Owner-confirmed 2026-09-13 (OD-13).';

-- -----------------------------------------------------------------------------
-- 2. Move the penthouse to level 4.
-- -----------------------------------------------------------------------------
UPDATE public.rooms
   SET floor       = 4,
       description = 'Penthouse Master Suite on its own rooftop level, '
                     || 'above floor 3 (BR-032).',
       updated_at  = NOW()
 WHERE room_number = 'PH'
   AND floor IS DISTINCT FROM 4;

-- -----------------------------------------------------------------------------
-- 3. Verify the penthouse, and report the resulting tally without failing on
--    the known outstanding discrepancy (OD-14).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  ph_floor INTEGER;
  tally    TEXT;
BEGIN
  SELECT floor INTO ph_floor FROM public.rooms WHERE room_number = 'PH';

  IF ph_floor IS NULL THEN
    RAISE EXCEPTION 'Migration 007 failed: no room row with room_number = ''PH''.';
  ELSIF ph_floor <> 4 THEN
    RAISE EXCEPTION 'Migration 007 failed: PH is on floor %, expected 4.', ph_floor;
  END IF;

  SELECT string_agg(floor || ' => ' || cnt, ',  ' ORDER BY floor)
    INTO tally
    FROM (SELECT floor, COUNT(*) AS cnt FROM public.rooms GROUP BY floor) t;

  RAISE NOTICE 'Migration 007 OK: PH is on level 4. Tally is now [%].', tally;
  RAISE NOTICE 'Owner survey is 1 => 11, 2 => 11, 3 => 10, 4 => 1. One floor-1 '
               'unit remains unreconciled (OD-14) and is not corrected here.';
END $$;

COMMIT;
