-- ============================================================================
-- Migration 015 - correct the one wrong rooms.floor value, closing OD-14
-- ============================================================================
-- The owner's surveyed distribution is 11 / 11 / 10 / 1 (locked canon, reconfirmed
-- twice). The seeded data read 12 / 11 / 9 / 1 - defect 10, populated for
-- development rather than surveyed. Both total 33 and the error was symmetrical,
-- so exactly one row was wrong. Which one is settled by the client's
-- building-by-building breakdown, given 2026-09-13:
--
--   Apartment Building (BH)   8 / 7 / 7  = 22   matches 1a-1h, 2a-2g, 3a-3g exactly
--   Back Apartment            1 / 2 / 2  =  5   matches B1F, B2F+B2B, B3F+B3B exactly
--   Penthouse                        1   =  1   PH, rooftop level 4
--   Front Apartment             3 units         floors not stated by the client
--   Linda                       2 units         floors not stated; "beside the red gate"
--
-- The first three account for 9 / 9 / 9 / 1. Reaching 11 / 11 / 10 / 1 needs +2 on
-- the ground, +2 on the second and +1 on the third - five places for the five
-- remaining units. The owner has twice stated that the ground floor's eleven
-- INCLUDE both Linda units, which fixes Linda at 2 on the ground. F2B and F2F are
-- already on the second, filling it.
--
-- That leaves exactly one placement:
--
--     **F1 is on the third floor, not the ground floor.**
--
-- The code "F1" reads like "Front, floor 1", and that is almost certainly how it
-- came to be seeded as floor 1. On the client's account the Front Apartment is a
-- separate structure beside the owner's own house and "F1" denotes its first unit,
-- not its level. **This is the single inference in this migration**, and it is the
-- one thing worth eyeballing on a walk-through. Nothing else about the building is
-- asserted here: every other unit's floor was already correct and is untouched.
--
-- rooms.floor is display-only. No billing, pricing, water-charge or reporting logic
-- reads it - verified by searching backend/src and frontend/src; the only consumers
-- are a floor label in RoomDetailModal.vue and AdminEditUnitModal.vue. This changes
-- presentation, not money.
--
-- Idempotent. Touches exactly one row.
-- ============================================================================

UPDATE public.rooms SET floor = 3, updated_at = NOW()
 WHERE room_number = 'F1' AND floor <> 3;

-- ============================================================================
-- Verification
-- ============================================================================
DO $mig015$
DECLARE
  v_f1 int; v_f2 int; v_f3 int; v_f4 int; v_total int;
BEGIN
  SELECT count(*) FILTER (WHERE floor = 1), count(*) FILTER (WHERE floor = 2),
         count(*) FILTER (WHERE floor = 3), count(*) FILTER (WHERE floor = 4), count(*)
    INTO v_f1, v_f2, v_f3, v_f4, v_total
    FROM public.rooms;

  RAISE NOTICE '015 VERIFY: floors = % / % / % / % (total %)', v_f1, v_f2, v_f3, v_f4, v_total;

  IF (v_f1, v_f2, v_f3, v_f4) IS DISTINCT FROM (11, 11, 10, 1) THEN
    RAISE EXCEPTION '015 FAILED: expected 11/11/10/1, got %/%/%/%', v_f1, v_f2, v_f3, v_f4;
  END IF;
  IF v_total <> 33 THEN
    RAISE EXCEPTION '015 FAILED: expected 33 units, found %', v_total;
  END IF;

  RAISE NOTICE '015 OK: 11 / 11 / 10 / 1, 33 units, matching the surveyed distribution.';
END
$mig015$;
