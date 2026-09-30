-- =============================================================================
-- 070 - loydtest is the evaluation account: turn it back on
-- =============================================================================
-- Sean, 2026-09-30 evening: "loydtest" was made on purpose. It is the tenant
-- account a technical expert will use to evaluate the site.
--
-- 069 got this wrong. Its reason for switching the account off was that an
-- active tenant with no tenancy pushed the tenant count to 33 against 32
-- tenancies. But the account had been turned back on deliberately at
-- 2026-09-30 15:22 UTC (audit TENANT_UPDATE, inactive -> active) and signed in
-- at 15:23. 069 ran at 15:30 and undid that, which blocks every sign-in
-- (authService refuses an inactive account after a correct password).
--
-- WHAT CHANGES: account_status goes back to 'active', exactly as it was at
-- 15:22. Nothing else is touched. The password, sign-in details, phone and
-- name stay as they are. The records 069 removed (a bill, two payments, a
-- voided income row, a repair) were test residue and are not put back. The
-- evaluator makes fresh ones.
--
-- KNOWN SIDE EFFECT, ACCEPTED FOR THE EVALUATION: the admin's active tenant
-- count reads one more than the tenancies (33 against 32), because loydtest
-- has no unit. Giving it a unit (PH is the one vacant unit) is Sean's call,
-- in BLOCKED_FOR_SEAN.md B-90.
--
-- SAFETY: stops, changing nothing, if the profile is not the test one. A
-- second run changes nothing.
-- =============================================================================

DO $$
DECLARE
  p_test uuid := '4d8876e6-def8-4e15-9456-ebd91bee2580';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_test AND full_name = 'loydtest' AND role::text = 'tenant') THEN
    RAISE EXCEPTION '070: the evaluation profile is not there. Nothing changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_test AND account_status::text = 'active') THEN
    RAISE NOTICE '070: loydtest is already active. Nothing to do.';
    RETURN;
  END IF;

  UPDATE profiles SET account_status = 'active', updated_at = now() WHERE id = p_test;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'PROFILE', p_test,
          jsonb_build_object('account_status', 'inactive'),
          jsonb_build_object(
            'account_status', 'active',
            'note', 'Turned the loydtest account back on. It is the tenant account kept for the technical evaluation, and it had been reactivated on purpose at 15:22 UTC before migration 069 switched it off again.',
            'reference', 'migration 070, 2026-09-30'),
          NULL);
END $$;
