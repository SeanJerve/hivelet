-- =============================================================================
-- 087 - the test tenant's stay begins when it says (loydtest, unit PH)
-- =============================================================================
-- Found 2026-10-31 testing the tenant side, and asked for by Sean the same day. loydtest moved in
-- on 1 October, yet their screens showed a bill from 30 September, a September that was never
-- lived in, and an amount for two months beside a single bill.
--
-- HOW: during the team's testing, loydtest was moved into PH on 30 September and out the same day,
-- then in again on 1 October. A tenancy ending the day before the next begins is one continuous
-- stay (continuousStayStart, backend/src/services/standingService.ts), which is the right rule for
-- a room move. So the stay was read as starting on 30 September, every period ran from the 30th,
-- and the bill raised on demand on 2 October took that period. The code is right. The two test
-- tenancies touching is the only thing that is wrong.
--
-- WHAT THIS DOES, to this one test tenant and nothing else:
--   1. The one-day tenancy moves back a day, to 29 September, so a gap separates it from the one
--      that began on 1 October and the stay now begins on 1 October.
--   2. The one open bill moves from 30 Sep to 29 Oct onto 1 Oct to 31 Oct, the period that stay
--      gives. Its amount, ₱30,400, its status, Due, and its three rejected payments are unchanged.
--   Two AUDIT_CORRECTION rows record both, with the old values. Nothing is deleted. The two voided
--   receipts stay exactly as they are.
--
-- NOT TOUCHED: every real tenant, every live income and expense row, the ledger totals, the unit's
-- tenancy of 1 October, and unit PH.
--
-- WHAT THE SCREENS SHOW AFTER: a bill from 1 October, overdue, because this test tenant has never
-- paid. Further months appear as they fall due, as they would for anyone. That is correct.
--
-- SAFETY: one DO block. Every condition below is checked first, or nothing changes. A second run
-- finds the bill already moved and does nothing.
--
-- Applied by Sean in the SQL editor on 31 Oct 2026.
-- Backup: backups/2026-10-31T11-03-39. Verify (expected one row: 2026-09-29, 2026-10-01, 2026-10-31,
-- Due, 3):
--   SELECT old.start_date, b.billing_period_start, b.billing_period_end, b.status,
--          (SELECT count(*) FROM payments p WHERE p.bill_id = b.id) AS payments
--     FROM bills b, room_assignments old
--    WHERE b.id = 'b82a0d7f-a33f-41a7-8d18-30db3eff95b5'
--      AND old.id = '57df663e-55e0-4e51-aa0f-3800e8dc6871';
-- =============================================================================

DO $$
DECLARE
  loyd constant uuid := '4d8876e6-def8-4e15-9456-ebd91bee2580';
  old_tenancy constant uuid := '57df663e-55e0-4e51-aa0f-3800e8dc6871';
  open_bill constant uuid := 'b82a0d7f-a33f-41a7-8d18-30db3eff95b5';
  n integer;
BEGIN
  SELECT count(*) INTO n FROM bills WHERE id = open_bill AND billing_period_start = DATE '2026-10-01';
  IF n = 1 THEN
    RAISE NOTICE '087: already applied. Nothing to do.';
    RETURN;
  END IF;

  -- It must be the test tenant and no one else.
  SELECT count(*) INTO n FROM profiles WHERE id = loyd AND full_name = 'loydtest';
  IF n <> 1 THEN
    RAISE EXCEPTION '087: expected the test tenant loydtest; found %. Nothing changed.', n;
  END IF;

  -- The two tenancies as they were found: the one-day one, and the one that began on 1 October.
  SELECT count(*) INTO n FROM room_assignments
   WHERE id = old_tenancy AND tenant_profile_id = loyd AND is_active = false
     AND start_date = DATE '2026-09-30' AND end_date = DATE '2026-09-30';
  IF n <> 1 THEN
    RAISE EXCEPTION '087: the one-day tenancy is not as found on 31 Oct. Nothing changed.';
  END IF;
  SELECT count(*) INTO n FROM room_assignments
   WHERE tenant_profile_id = loyd AND is_active = true AND start_date = DATE '2026-10-01';
  IF n <> 1 THEN
    RAISE EXCEPTION '087: the active tenancy is not the one of 1 October. Nothing changed.';
  END IF;
  SELECT count(*) INTO n FROM room_assignments WHERE tenant_profile_id = loyd;
  IF n <> 2 THEN
    RAISE EXCEPTION '087: expected two tenancies; found %. Nothing changed.', n;
  END IF;

  -- The one bill, still open, with nothing accepted against it and no receipt standing behind it.
  SELECT count(*) INTO n FROM bills
   WHERE id = open_bill AND tenant_profile_id = loyd AND status = 'Due' AND total_amount = 30400
     AND billing_period_start = DATE '2026-09-30' AND billing_period_end = DATE '2026-10-29';
  IF n <> 1 THEN
    RAISE EXCEPTION '087: the open bill is not as found on 31 Oct. Nothing changed.';
  END IF;
  SELECT count(*) INTO n FROM bills WHERE tenant_profile_id = loyd;
  IF n <> 1 THEN
    RAISE EXCEPTION '087: expected one bill for this tenant; found %. Nothing changed.', n;
  END IF;
  SELECT count(*) INTO n FROM payments WHERE bill_id = open_bill AND verification_status <> 'Rejected';
  IF n <> 0 THEN
    RAISE EXCEPTION '087: a payment on this bill is not Rejected. Nothing changed.';
  END IF;
  SELECT count(*) INTO n FROM monthly_income_records WHERE tenant_profile_id = loyd AND voided_at IS NULL;
  IF n <> 0 THEN
    RAISE EXCEPTION '087: this tenant has a live receipt. Nothing changed.';
  END IF;

  UPDATE room_assignments
     SET start_date = DATE '2026-09-29', end_date = DATE '2026-09-29',
         anniversary_date = DATE '2026-09-29', updated_at = now()
   WHERE id = old_tenancy;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'ROOM_ASSIGNMENT', old_tenancy,
          jsonb_build_object('start_date', '2026-09-30', 'end_date', '2026-09-30', 'anniversary_date', '2026-09-30'),
          jsonb_build_object(
            'start_date', '2026-09-29', 'end_date', '2026-09-29', 'anniversary_date', '2026-09-29',
            'unit', 'PH',
            'note', 'Test tenant. The one-day test tenancy touched the one of 1 October, so the stay read as starting on 30 September. A day''s gap ends that.',
            'reference', 'migration 087; B-116'),
          NULL);

  UPDATE bills
     SET billing_period_start = DATE '2026-10-01', billing_period_end = DATE '2026-10-31',
         due_date = DATE '2026-10-01', grace_period_end_date = DATE '2026-10-01', updated_at = now()
   WHERE id = open_bill;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'BILL', open_bill,
          jsonb_build_object('billing_period_start', '2026-09-30', 'billing_period_end', '2026-10-29',
                             'due_date', '2026-09-30', 'grace_period_end_date', '2026-09-30'),
          jsonb_build_object(
            'billing_period_start', '2026-10-01', 'billing_period_end', '2026-10-31',
            'due_date', '2026-10-01', 'grace_period_end_date', '2026-10-01',
            'unit', 'PH',
            'note', 'Test tenant. The bill took its period from the stay read as starting on 30 September; moved to the period of the stay of 1 October. Amount and status unchanged.',
            'reference', 'migration 087; B-116'),
          NULL);

  RAISE NOTICE '087: done. loydtest''s stay begins on 1 October and the open bill covers 1 to 31 October.';
END $$;
