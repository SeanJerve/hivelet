-- =============================================================================
-- 079 - undo what a test session on the live site did to the owner's books
--        (4 October 2026, 22:46 to 23:08 Manila, the administrator account)
-- =============================================================================
-- Found 2026-10-05 by Claude while building "Your recent actions": one session,
-- from an address that had never signed in to the administrator account before
-- (136.158.102.3, one sign-in ever; the team's own is 103.200.32.3), tested the
-- admin functions on REAL records the evening after the technical evaluation:
--
--   22:54  EXPENSE_UPDATE  9ecdf8a3  "BDO (fe) deposit", 24 Feb 2026, a real
--          personal expense of PHP 63,000 (one line, Other Expenses / Personal).
--          Two lines were ADDED: Back Apartment 5,000 and Front Apartment 20,000,
--          so the entry reads 88,000 and February's operating expenses 25,000 high.
--   22:57  EXPENSE_CREATE  e1bd656b  supplier "jjeijse_2323", 4 Oct 2026, 6,000,
--          edited at 22:58 to 11,000 (Boarding House 6,000, Front 3,000, Back 2,000).
--   22:59  TENANT_DEACTIVATE  Ann Kristine Diaz, 3G (tenancy 3e1506e8, since
--          1 Jul 2026): moved out; 3G set Available.
--   23:00  PAYMENT_CORRECT  6982087b  a real receipt VOIDED: 3D, August 2026,
--          Alejandro Delarosa, PHP 8,700, INV#5245, reason "Administrator manual
--          deletion". Remitted fell from 8,222,900.00 to 8,214,200.00.
--   (also: a test inquiry deleted, a reply on loydtest's test repair, loydtest's
--    GCash payment rejected. loydtest is the evaluation account; left as is.)
--
-- The values put back are the 30 September backup's (backups/2026-09-30T15-35-19),
-- which agree with each row's own audit "before" values.
--
-- WHAT THIS DOES
--   1. 9ecdf8a3: removes the two added lines (5,000 Back, 20,000 Front); the
--      allocation trigger sets the entry back to 63,000. The personal line stays.
--   2. e1bd656b: VOIDED (not deleted), reason given. It leaves every total.
--   3. 6982087b: the void is undone, so the receipt counts again. Remitted back
--      to 8,222,900.00 over 953 live receipts.
--   4. Ann Kristine Diaz: tenancy 3e1506e8 active again with no end date, her
--      profile active, 3G Occupied.
--   5. One AUDIT_CORRECTION row saying all of it.
--
-- SAFETY: every step checks the row is exactly as the test left it and stops,
-- changing nothing, otherwise (one DO block: an error anywhere undoes it all).
-- A second run finds nothing to do and says so.
-- NOT TO BE APPLIED until Sean confirms these were tests: B-100.
-- =============================================================================

DO $$
DECLARE
  n integer;
  remitted numeric;
BEGIN
  -- 0. Already done?
  IF NOT EXISTS (SELECT 1 FROM expense_property_allocations
                  WHERE expense_entry_id = '9ecdf8a3-0f02-463a-afff-6fe284e94beb'
                    AND property_area::text IN ('Back Apartment', 'Front Apartment'))
     AND NOT EXISTS (SELECT 1 FROM monthly_income_records
                      WHERE id = '6982087b-ae9b-4372-adad-4a065b5a4609' AND voided_at IS NOT NULL) THEN
    RAISE NOTICE '079: already applied. Nothing to do.';
    RETURN;
  END IF;

  -- 1. The February expense: exactly the three lines the test left, then back to one.
  SELECT count(*) INTO n FROM expense_property_allocations
   WHERE expense_entry_id = '9ecdf8a3-0f02-463a-afff-6fe284e94beb'
     AND ((property_area::text = 'Other Expenses / Personal' AND amount = 63000)
       OR (property_area::text = 'Back Apartment' AND amount = 5000)
       OR (property_area::text = 'Front Apartment' AND amount = 20000));
  IF n <> 3 OR (SELECT count(*) FROM expense_property_allocations
                 WHERE expense_entry_id = '9ecdf8a3-0f02-463a-afff-6fe284e94beb') <> 3 THEN
    RAISE EXCEPTION '079: the February expense 9ecdf8a3 is not as the test left it. Nothing changed.';
  END IF;
  DELETE FROM expense_property_allocations
   WHERE expense_entry_id = '9ecdf8a3-0f02-463a-afff-6fe284e94beb'
     AND property_area::text IN ('Back Apartment', 'Front Apartment');
  IF (SELECT total_expenses FROM monthly_expense_entries WHERE id = '9ecdf8a3-0f02-463a-afff-6fe284e94beb') <> 63000 THEN
    RAISE EXCEPTION '079: the February expense did not come back to 63,000. Rolled back.';
  END IF;

  -- 2. The test expense: voided, not deleted.
  IF NOT EXISTS (SELECT 1 FROM monthly_expense_entries
                  WHERE id = 'e1bd656b-4aff-45c8-bd1a-3d91d0377449'
                    AND invoice_supplier = 'jjeijse_2323' AND voided_at IS NULL) THEN
    RAISE EXCEPTION '079: the test expense e1bd656b is not as the test left it. Rolled back.';
  END IF;
  UPDATE monthly_expense_entries
     SET voided_at = now(),
         void_reason = 'Test entry made on the live site on 4 Oct 2026 (supplier "jjeijse_2323"). Voided by migration 079.',
         updated_at = now()
   WHERE id = 'e1bd656b-4aff-45c8-bd1a-3d91d0377449';

  -- 3. The 3D August receipt counts again.
  IF NOT EXISTS (SELECT 1 FROM monthly_income_records
                  WHERE id = '6982087b-ae9b-4372-adad-4a065b5a4609' AND voided_at IS NOT NULL
                    AND remitted_amount = 8700 AND invoice_number = 'INV#5245') THEN
    RAISE EXCEPTION '079: the 3D August receipt is not the voided INV#5245 of 8,700. Rolled back.';
  END IF;
  UPDATE monthly_income_records
     SET voided_at = NULL, voided_by = NULL, void_reason = NULL, updated_at = now()
   WHERE id = '6982087b-ae9b-4372-adad-4a065b5a4609';

  -- 4. Ann Kristine Diaz back in 3G.
  IF NOT EXISTS (SELECT 1 FROM room_assignments
                  WHERE id = '3e1506e8-d19a-47ac-9715-92d547cfb763'
                    AND tenant_profile_id = '71e0165e-8eaf-40b2-aa02-691b97e1fef4'
                    AND is_active = false AND end_date = DATE '2026-10-04') THEN
    RAISE EXCEPTION '079: the 3G tenancy is not the one the test ended on 4 Oct. Rolled back.';
  END IF;
  IF EXISTS (SELECT 1 FROM room_assignments
              WHERE room_id = 'a0300000-0000-0000-0000-000000000007' AND is_active) THEN
    RAISE EXCEPTION '079: someone else now lives in 3G. Rolled back.';
  END IF;
  UPDATE room_assignments SET is_active = true, end_date = NULL, updated_at = now()
   WHERE id = '3e1506e8-d19a-47ac-9715-92d547cfb763';
  UPDATE profiles SET account_status = 'active', updated_at = now()
   WHERE id = '71e0165e-8eaf-40b2-aa02-691b97e1fef4';
  UPDATE rooms SET operational_status = 'Occupied', updated_at = now()
   WHERE id = 'a0300000-0000-0000-0000-000000000007';

  -- 5. The record of it.
  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  -- entity_id is NOT NULL: the row points at the receipt it restored; the note names the rest.
  VALUES ('AUDIT_CORRECTION', 'PAYMENT', '6982087b-ae9b-4372-adad-4a065b5a4609',
          jsonb_build_object(
            'expense_9ecdf8a3_total', 88000,
            'expense_e1bd656b', 'live, 11000',
            'receipt_6982087b', 'voided 2026-10-04, Administrator manual deletion',
            'tenancy_3e1506e8', 'ended 2026-10-04'),
          jsonb_build_object(
            'note', 'Undid a test session on the live site (4 Oct 2026, 22:46-23:08 Manila, administrator account): the two lines added to the Feb 2026 BDO deposit expense removed (back to 63,000), the test expense jjeijse_2323 voided, the voided 3D August receipt INV#5245 (8,700) counted again, and Ann Kristine Diaz back in 3G.',
            'source', 'backups/2026-09-30T15-35-19 and each row''s audit before-values',
            'reference', 'migration 079, B-100'),
          NULL);

  SELECT sum(remitted_amount), count(*) INTO remitted, n FROM monthly_income_records WHERE voided_at IS NULL;
  RAISE NOTICE '079: done. Remitted % over % live receipts (expected 8222900.00 over 953).', remitted, n;
END $$;
