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
-- SCOPE LIMIT — read this before assuming the floor data is now correct.
-- The owner's authoritative survey is 11 / 11 / 10 / 1. After this migration the
-- seeded per-unit values yield 12 / 11 / 9 / 1: one unit sits on floor 1 in the
-- data that the survey places on floor 3. That unit has NOT been identified, and
-- this migration deliberately does not guess at it. Correcting the wrong row
-- would put a false floor on a real unit in a live database.
--
-- The two candidates are LF and LB. Every other floor-1 unit encodes its floor
-- in its own room_number — 1a-1h, B1F ("Back, floor 1, Front"), F1 ("Front,
-- floor 1") — whereas "Linda Front" and "Linda Back" encode position, not level.
-- Resolution is tracked as a follow-up; the PUBLISHED tally stays 11 / 11 / 10 / 1
-- on the owner's survey regardless, per locked canon.
--
-- Apply AFTER 001-006. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Move the penthouse to level 4.
--     `rooms.floor` is a plain INTEGER NOT NULL DEFAULT 1 with no CHECK
--     constraint, so level 4 is accepted without a constraint change.
-- -----------------------------------------------------------------------------
UPDATE public.rooms
   SET floor       = 4,
       description = 'Penthouse Master Suite on its own rooftop level, '
                     || 'above floor 3 (BR-032).',
       updated_at  = NOW()
 WHERE room_number = 'PH'
   AND floor IS DISTINCT FROM 4;

-- -----------------------------------------------------------------------------
-- 2. Verify the penthouse, and report the resulting tally without failing on
--    the known outstanding discrepancy.
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

  RAISE NOTICE 'Migration 007 OK: PH is on level 4. Seeded tally is now [%].', tally;
  RAISE NOTICE 'Owner survey is 1 => 11, 2 => 11, 3 => 10, 4 => 1. One floor-1 '
               'unit is still unreconciled (candidates: LF, LB) and is tracked '
               'as a follow-up, not corrected here.';
END $$;

COMMIT;
