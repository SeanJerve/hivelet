-- =============================================================================
-- 081 - three units' headcounts, confirmed by the owner (B-33 / CLIENT_MEETING_QUESTIONS 2f-iii)
-- =============================================================================
-- Asked since 2026-09-19 (migration 037 left seven units for her because each had changed within
-- the last four months). Answered 2026-10-12 by Lloyd for the owner: "yes, all are true" - the
-- recent changes her receipts show are real:
--
--     1h, B3B, B3F   went UP to 2      -> the tenancy still read 1: set to 2 here
--     2e, 3b, 3d, 3g dropped to 1      -> already 1, nothing to change
--     1b, 1f         3 in a 2-person unit, known to her -> already 3, nothing to change
--
-- Why it matters: room_assignments.occupant_count is what a tenant-raised bill and the GCash
-- checkout charge water from (PHP 200 a head, BR-014). Receipts she types herself carry their
-- own count and are untouched. No receipt, bill or payment row changes here.
--
-- SAFETY: one DO block; each unit must have exactly one active tenancy reading 1, or nothing
-- changes. A second run finds them at 2 and does nothing. One AUDIT_CORRECTION row records it.
-- Verify:
--   SELECT r.room_number, a.occupant_count FROM room_assignments a JOIN rooms r ON r.id = a.room_id
--    WHERE a.is_active AND upper(r.room_number) IN ('1H','B3B','B3F');   -- each 2
-- Then check:ledger's BR-014 drift drops to 1 (F2F, B-102) and its baseline goes to 1.
-- =============================================================================

DO $$
DECLARE
  n integer;
  first_id uuid;
BEGIN
  SELECT count(*) INTO n
    FROM room_assignments a JOIN rooms r ON r.id = a.room_id
   WHERE a.is_active AND upper(r.room_number) IN ('1H', 'B3B', 'B3F') AND a.occupant_count = 2;
  IF n = 3 THEN
    RAISE NOTICE '081: already applied. Nothing to do.';
    RETURN;
  END IF;

  SELECT count(*), min(a.id::text)::uuid INTO n, first_id
    FROM room_assignments a JOIN rooms r ON r.id = a.room_id
   WHERE a.is_active AND upper(r.room_number) IN ('1H', 'B3B', 'B3F') AND a.occupant_count = 1;
  IF n <> 3 THEN
    RAISE EXCEPTION '081: expected one active tenancy reading 1 in each of 1h, B3B, B3F; found %. Nothing changed.', n;
  END IF;

  UPDATE room_assignments a
     SET occupant_count = 2, updated_at = now()
    FROM rooms r
   WHERE r.id = a.room_id AND a.is_active AND upper(r.room_number) IN ('1H', 'B3B', 'B3F')
     AND a.occupant_count = 1;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'TENANCY', first_id,
          jsonb_build_object('1h', 1, 'B3B', 1, 'B3F', 1),
          jsonb_build_object(
            '1h', 2, 'B3B', 2, 'B3F', 2,
            'note', 'Occupant counts set to 2, as her receipts show and as she confirmed (B-33, 2f-iii).',
            'reference', 'migration 081; confirmed by the owner through Lloyd 2026-10-12'),
          NULL);

  RAISE NOTICE '081: done. 1h, B3B and B3F now 2 occupants.';
END $$;
