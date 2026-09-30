-- =============================================================================
-- 069 - remove what the second rehearsal tenant ("loydtest") left in her books
-- =============================================================================
-- APPLIED 2026-09-30 evening through the Supabase connection, after the backup
-- backups/2026-09-30T15-20-50; verified: 32 active tenants against 32 tenancies,
-- 7 real open bills (PHP 64,150), Remitted unchanged at PHP 8,222,900.00.
--
-- The same job 061 did for "REHERSAL TEST" (B-85), for the second test tenant
-- made on the testing day: "loydtest", created 2026-09-30 10:41 UTC in PH and
-- moved out again, but left ACTIVE with no tenancy - so the owner's tenant
-- count read 33 against 32 tenancies - and with a bill of PHP 30,200 still Due
-- on PH, which reads on her screens as money owed.
--
-- WHAT GOES (each by its id, found and checked on 2026-09-30 evening):
--   * bill      55997a3b-5910-4cfd-bb7c-45d1f3437703  PH, Due, 30,200, loydtest's
--   * payment   7b09bc0f-df88-4d78-ae86-4332216519df  Rejected 30,200 on that bill
--   * payment   f3b79eca-0753-4567-a58a-25b0c10da44d  "Verified" 30,200, PH, written
--               with the test income row below (A-23, 14:47:21 UTC)
--   * income    22aba3fd-2721-43fa-9520-2bd9390791e6  ACKNOWL1, contact loydtest,
--               already VOIDED (A-25), so no total changes
--   * ticket    a6eda72a-f97b-4a0d-8292-9fd6ba0cee0c  "broken heart" (its messages
--               and attachments go with it by ON DELETE CASCADE)
--   * notifications to loydtest, and any pointing at one of the rows above
-- WHAT STAYS: the profile (set inactive), its ended tenancy, every audit_logs row.
--
-- SAFETY: stops, changing nothing, if the profile is not the test one, if a row
-- above is not what it was checked to be, or if loydtest has an active tenancy.
-- One DO block; an error anywhere undoes it all. A second run finds nothing.
-- =============================================================================

DO $$
DECLARE
  p_test   uuid := '4d8876e6-def8-4e15-9456-ebd91bee2580';
  n        integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_test AND full_name = 'loydtest' AND role::text = 'tenant') THEN
    RAISE NOTICE '069: the test profile is not there. Nothing to do.';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM room_assignments WHERE tenant_profile_id = p_test AND is_active) THEN
    RAISE EXCEPTION '069: loydtest still has an active tenancy. Move it out first. Nothing changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM bills WHERE id = '55997a3b-5910-4cfd-bb7c-45d1f3437703' AND tenant_profile_id IS DISTINCT FROM p_test) THEN
    RAISE EXCEPTION '069: the PH bill is not the test tenant''s. Nothing changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM monthly_income_records WHERE id = '22aba3fd-2721-43fa-9520-2bd9390791e6'
             AND (voided_at IS NULL OR contact_name <> 'loydtest')) THEN
    RAISE EXCEPTION '069: the test income row is not the voided loydtest one. Nothing changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM payments WHERE id = 'f3b79eca-0753-4567-a58a-25b0c10da44d'
             AND (amount <> 30200 OR room_id <> (SELECT id FROM rooms WHERE room_number ILIKE 'ph'))) THEN
    RAISE EXCEPTION '069: the PH payment is not the test one. Nothing changed.';
  END IF;

  DELETE FROM notifications
   WHERE recipient_profile_id = p_test
      OR related_entity_id IN ('55997a3b-5910-4cfd-bb7c-45d1f3437703', '7b09bc0f-df88-4d78-ae86-4332216519df',
                               'f3b79eca-0753-4567-a58a-25b0c10da44d', '22aba3fd-2721-43fa-9520-2bd9390791e6',
                               'a6eda72a-f97b-4a0d-8292-9fd6ba0cee0c');
  DELETE FROM payments WHERE id IN ('7b09bc0f-df88-4d78-ae86-4332216519df', 'f3b79eca-0753-4567-a58a-25b0c10da44d');
  DELETE FROM bills WHERE id = '55997a3b-5910-4cfd-bb7c-45d1f3437703';
  DELETE FROM monthly_income_records WHERE id = '22aba3fd-2721-43fa-9520-2bd9390791e6';
  DELETE FROM maintenance_tickets WHERE id = 'a6eda72a-f97b-4a0d-8292-9fd6ba0cee0c';
  UPDATE profiles SET account_status = 'inactive', updated_at = now() WHERE id = p_test;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'PROFILE', p_test, NULL,
          jsonb_build_object(
            'note', 'Removed the testing day''s second rehearsal tenant (loydtest) records: its PH bill (Due 30,200), the two 30,200 payments, the voided test income row ACKNOWL1, the test repair, and notifications about them. The profile is kept and set inactive.',
            'why', 'The bill read as money owed on the owner''s screens, and the active profile made her tenant count 33 against 32 tenancies.',
            'reference', 'migration 069, testing day 2026-09-30'),
          NULL);

  SELECT count(*) INTO n FROM bills WHERE tenant_profile_id = p_test;
  IF n <> 0 THEN RAISE EXCEPTION '069: % test bill(s) remain. Rolled back.', n; END IF;
  SELECT count(*) INTO n FROM profiles WHERE role::text = 'tenant' AND account_status::text = 'active';
  IF n <> (SELECT count(*) FROM room_assignments WHERE is_active) THEN
    RAISE NOTICE '069: % active tenant profiles against % active tenancies after this - check.', n, (SELECT count(*) FROM room_assignments WHERE is_active);
  END IF;
END $$;
