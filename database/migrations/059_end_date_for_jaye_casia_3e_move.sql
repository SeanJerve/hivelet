-- =============================================================================
-- 059_end_date_for_jaye_casia_3e_move.sql - the one ended tenancy with no end
-- date gets the date it ended (B-81)
-- =============================================================================
-- Written 2026-09-28. NOT applied: run it in the Supabase SQL editor.
-- Backed up first: backups/2026-09-28T12-27-35/.
--
-- WHAT
-- ----------------------------------------------------------------------------
-- Jaye Casia (profile 55555555-...) has three tenancies:
--   LB  2025-03-01 -> 2026-08-19  ended
--   3e  2026-08-19 -> (none)      ended, no end date   <- this row
--   LB  2026-07-01 -> (none)      current
-- The 3e row was created and switched off on the same day (created_at and
-- updated_at are both 2026-08-19): a move to 3e that was undone, with Jaye
-- back in LB. No receipt is linked to it. Every path in the app that ends a
-- tenancy writes the day it ended as end_date; this row missed it, so it is
-- the only "ended tenancy with no end date" in room_assignments.
--
-- Setting end_date = 2026-08-19 records what already happened. Nothing else
-- changes: is_active stays false, no receipt, bill or other row is touched.
--
-- After this runs, check:ledger's KNOWN_ENDLESS and check:relations'
-- UNDATED_BASELINE can both come down from 1 to 0.
-- =============================================================================

BEGIN;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM room_assignments ra JOIN rooms r ON r.id = ra.room_id
  WHERE ra.id = '30d95ca5-3103-469c-805a-2451da1a5dfd'
    AND ra.tenant_profile_id = '55555555-5555-5555-5555-555555555555'
    AND r.room_number = '3e'
    AND ra.is_active = false
    AND ra.start_date = '2026-08-19'
    AND ra.end_date IS NULL;
  IF n <> 1 THEN
    RAISE EXCEPTION 'The 3e row is not as expected (matched %), so nothing was changed.', n;
  END IF;
END $$;

UPDATE room_assignments
SET end_date = '2026-08-19'
WHERE id = '30d95ca5-3103-469c-805a-2451da1a5dfd'
  AND end_date IS NULL;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM room_assignments WHERE is_active IS NOT TRUE AND end_date IS NULL;
  IF n <> 0 THEN
    RAISE EXCEPTION 'Still % ended tenancies without an end date. Rolled back.', n;
  END IF;
END $$;

COMMIT;
