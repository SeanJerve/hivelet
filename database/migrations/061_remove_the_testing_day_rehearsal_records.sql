-- =============================================================================
-- 061 - remove what the testing day's rehearsal tenant left in her books (B-85)
-- =============================================================================
-- NOT APPLIED by the author. Run it AFTER the walkthrough is finished, which
-- means after step 24 / test case A-31 has moved the rehearsal tenant out of
-- PH. Run the PREVIEW query at the foot first and read it; then
-- `npm run backup`; then run this whole file in the Supabase SQL editor.
--
-- WHY
-- ---
-- On 30 September 2026 the owner's session moved a test tenant into PH
-- ("REHERSAL TEST", spelled that way, created 08:42 Manila) and walked it
-- through every write path: a bill raised by the GCash checkout (A-20, P30,200
-- at 08:46), a receipt recorded and voided (A-23, A-25), a repair request with
-- messages (A-16, A-17), notifications to the tenant and to her. Moving the
-- tenant out (A-31) frees the unit and deactivates the profile but does not
-- touch any of those rows (B-85), and `bill_status_type` has no cancelled
-- state, so the test bill would sit open in her records for good.
--
-- WHAT GOES
-- ---------
-- For each rehearsal profile created on 30 September (Manila) whose name
-- starts REH...RSAL (either spelling), all of:
--   * its bills, and every payment on them or made by it;
--   * its ledger rows (the voided test receipt, and any not voided);
--   * its repair requests (their messages and attachments go with them by
--     ON DELETE CASCADE);
--   * notifications to it, and notifications to anyone that point at one of
--     the rows above.
--
-- WHAT STAYS, ON PURPOSE
-- ----------------------
--   * The profile and its ended tenancy: audit_logs name the profile, and a
--     deactivated profile with an ended tenancy shows nowhere (B-70).
--   * audit_logs, append-only; this adds one AUDIT_CORRECTION row saying what
--     went and why, as 055 did.
--   * Unit PH itself. Its rate goes back to P30,000 through the screen
--     (step 26), not here.
--
-- SAFETY
-- ------
--   * Stops, changing nothing, if no rehearsal profile from that day exists,
--     if more than three match (the name rule has caught something it should
--     not), or if any of them still lives in a unit (step 24 not done yet).
--   * Stops if a payment by anyone else sits on one of the bills, which would
--     mean a real tenant's money is attached to a test bill.
--   * One DO block: one statement and one transaction in the SQL editor. An
--     error anywhere undoes all of it (see 055 on why not temporary tables).
--   * A second run finds nothing left to remove and records nothing.
-- =============================================================================

DO $$
DECLARE
  t_prof uuid[];
  t_bill uuid[];
  t_pay  uuid[];
  t_inc  uuid[];
  t_tk   uuid[];
  t_note uuid[];
  n      bigint;
BEGIN
  t_prof := ARRAY(
    SELECT id FROM profiles
    WHERE role::text IN ('tenant', 'prospect')
      AND upper(full_name) LIKE 'REH%RSAL%'
      AND created_at >= '2026-09-29 16:00:00+00'   -- 30 September, Manila
      AND created_at <  '2026-09-30 16:00:00+00');

  IF cardinality(t_prof) = 0 THEN
    RAISE EXCEPTION '061 stopped, nothing deleted: no rehearsal profile created on 30 September was found.';
  END IF;
  IF cardinality(t_prof) > 3 THEN
    RAISE EXCEPTION '061 stopped, nothing deleted: % profiles match the rehearsal name rule, more than expected. Send this message.', cardinality(t_prof);
  END IF;

  SELECT count(*) INTO n FROM room_assignments
  WHERE tenant_profile_id = ANY(t_prof) AND is_active;
  IF n > 0 THEN
    RAISE EXCEPTION '061 stopped, nothing deleted: the rehearsal tenant still lives in a unit. Move them out first (step 24, A-31).';
  END IF;

  t_bill := ARRAY(SELECT id FROM bills WHERE tenant_profile_id = ANY(t_prof));

  SELECT count(*) INTO n FROM payments
  WHERE bill_id = ANY(t_bill) AND NOT (tenant_profile_id = ANY(t_prof));
  IF n > 0 THEN
    RAISE EXCEPTION '061 stopped, nothing deleted: % payment(s) by someone else sit on a rehearsal bill. Send this message.', n;
  END IF;

  t_pay := ARRAY(SELECT id FROM payments
                 WHERE tenant_profile_id = ANY(t_prof) OR bill_id = ANY(t_bill));
  t_inc := ARRAY(SELECT id FROM monthly_income_records WHERE tenant_profile_id = ANY(t_prof));
  t_tk  := ARRAY(SELECT id FROM maintenance_tickets WHERE tenant_profile_id = ANY(t_prof));
  t_note := ARRAY(
    SELECT id FROM notifications
    WHERE recipient_profile_id = ANY(t_prof)
       OR related_entity_id::text IN (
            SELECT unnest(t_pay)::text UNION ALL SELECT unnest(t_bill)::text
            UNION ALL SELECT unnest(t_inc)::text UNION ALL SELECT unnest(t_tk)::text));

  -- Children before parents.
  DELETE FROM notifications          WHERE id = ANY(t_note);
  DELETE FROM monthly_income_records WHERE id = ANY(t_inc);
  DELETE FROM payments               WHERE id = ANY(t_pay);
  DELETE FROM bills                  WHERE id = ANY(t_bill);
  DELETE FROM maintenance_tickets    WHERE id = ANY(t_tk);   -- messages and attachments cascade

  IF cardinality(t_note) + cardinality(t_inc) + cardinality(t_pay)
     + cardinality(t_bill) + cardinality(t_tk) > 0 THEN
    INSERT INTO audit_logs (action, entity_type, entity_id, new_values, ip_address)
    VALUES ('AUDIT_CORRECTION',
            'PROFILE',
            t_prof[1],
            jsonb_build_object(
              'note',   'Removed the testing day''s rehearsal records: the test tenant''s bills, payments, ledger rows, repair requests and the notifications about them. The tenant was a test account in PH; no real money or real tenant was involved.',
              'why',    'Moving the test tenant out leaves its bill open in the owner''s records, with no cancelled state to put it in (B-85).',
              'counts', jsonb_build_object(
                'profiles',               cardinality(t_prof),
                'bills',                  cardinality(t_bill),
                'payments',               cardinality(t_pay),
                'monthly_income_records', cardinality(t_inc),
                'maintenance_tickets',    cardinality(t_tk),
                'notifications',          cardinality(t_note)),
              'kept',   'The profile and its ended tenancy (B-70), and every audit_logs row.',
              'reference', 'migration 061, B-85, testing day 2026-09-30'),
            NULL);
  END IF;

  -- Nothing of it left, or nothing commits.
  SELECT count(*) INTO n FROM bills WHERE tenant_profile_id = ANY(t_prof);
  IF n <> 0 THEN RAISE EXCEPTION '061: % rehearsal bill(s) remain. Rolled back.', n; END IF;
  SELECT count(*) INTO n FROM payments WHERE tenant_profile_id = ANY(t_prof);
  IF n <> 0 THEN RAISE EXCEPTION '061: % rehearsal payment(s) remain. Rolled back.', n; END IF;
  SELECT count(*) INTO n FROM monthly_income_records WHERE tenant_profile_id = ANY(t_prof);
  IF n <> 0 THEN RAISE EXCEPTION '061: % rehearsal ledger row(s) remain. Rolled back.', n; END IF;
  SELECT count(*) INTO n FROM maintenance_tickets WHERE tenant_profile_id = ANY(t_prof);
  IF n <> 0 THEN RAISE EXCEPTION '061: % rehearsal repair request(s) remain. Rolled back.', n; END IF;
END $$;

-- "Success. No rows returned" means it ran.
--
-- PREVIEW - run this first, on its own; it only reads. It lists what 061
-- would remove, and whether the tenant has been moved out yet.
--
-- WITH p AS (
--   SELECT id, full_name, created_at FROM profiles
--   WHERE role::text IN ('tenant', 'prospect') AND upper(full_name) LIKE 'REH%RSAL%'
--     AND created_at >= '2026-09-29 16:00:00+00' AND created_at < '2026-09-30 16:00:00+00')
-- SELECT p.full_name,
--   (SELECT count(*) FROM room_assignments ra WHERE ra.tenant_profile_id = p.id AND ra.is_active) AS still_living_there,
--   (SELECT count(*) FROM bills b WHERE b.tenant_profile_id = p.id) AS bills,
--   (SELECT count(*) FROM payments x WHERE x.tenant_profile_id = p.id) AS payments,
--   (SELECT count(*) FROM monthly_income_records m WHERE m.tenant_profile_id = p.id) AS ledger_rows,
--   (SELECT count(*) FROM maintenance_tickets t WHERE t.tenant_profile_id = p.id) AS repairs,
--   (SELECT count(*) FROM notifications n WHERE n.recipient_profile_id = p.id) AS notices_to_it
-- FROM p;
--
-- AFTERWARDS the same query should read 0 in every column but still_living_there
-- (also 0), and:
-- SELECT new_values FROM audit_logs WHERE action = 'AUDIT_CORRECTION'
--   ORDER BY created_at DESC LIMIT 1;
