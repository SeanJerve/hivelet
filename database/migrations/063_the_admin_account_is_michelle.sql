-- =============================================================================
-- 063 - the admin account carries the name of the person who uses it: Michelle
-- =============================================================================
-- APPLIED by Sean 2026-09-30 02:38 UTC, as 062. Loyd's August load took 062
-- the same minute (062_august_2026_receipts_and_expenses_from_her_workbook.sql,
-- applied first), so this file was renumbered 063 afterwards. Its own messages
-- and its AUDIT_CORRECTION row say "062" because that is the number it ran as.
-- NOT APPLIED by the author. Run the PREVIEW at the foot first and read it;
-- then `npm run backup`; then run this whole file in the Supabase SQL editor.
--
-- WHY
-- ---
-- The one admin profile is named "Mrs. Fe Galang Da Silva". Mrs. Da Silva owns
-- the business, and the boarding house keeps her name, but she is not the
-- person who signs in and runs it: that is Michelle (Sean, 30 September 2026).
-- The profile's name is what the admin side prints for its user (the header,
-- the Activity page's "who" column) and what a tenant is told when the admin
-- answers a repair request ("... commented on your request", routes/admin.ts).
-- So every one of those currently names someone who did not do it.
--
-- The pages that named her as the person to contact were changed in the
-- same commit (frontend/src/lib/systemState.ts, LANDLADY.name).
--
-- WHAT CHANGES
-- ------------
--   * profiles.full_name of the single admin profile, from its current value
--     to 'Michelle'. Nothing else on the row: email, phone, password, role and
--     sessions are untouched, so she signs in exactly as before.
--
-- WHAT STAYS, ON PURPOSE
-- ----------------------
--   * audit_logs rows. They refer to the profile by id, so the Activity page
--     shows the new name against earlier entries too, which is correct: the
--     same person did them. A stored copy of the old name inside an old row's
--     previous_values/new_values, if any, stays as written (append-only).
--   * The boarding house's name, everywhere.
--   * Notifications already delivered keep the wording they were sent with.
--
-- SAFETY
-- ------
--   * Stops, changing nothing, unless exactly one admin profile exists and
--     its name is still the old one (so a second run, or a run after someone
--     renamed it by hand, changes nothing and records nothing).
--   * One DO block: one statement and one transaction. An error anywhere
--     undoes all of it.
--   * Adds one AUDIT_CORRECTION row saying what changed and why, as 055 and
--     061 did.
-- =============================================================================

DO $$
DECLARE
  n_admin  integer;
  admin_id uuid;
  old_name text;
BEGIN
  SELECT count(*) INTO n_admin FROM profiles WHERE role::text = 'admin';
  IF n_admin <> 1 THEN
    RAISE EXCEPTION '062: expected exactly one admin profile, found %. Nothing changed.', n_admin;
  END IF;

  SELECT id, full_name INTO admin_id, old_name FROM profiles WHERE role::text = 'admin';

  IF old_name = 'Michelle' THEN
    RAISE NOTICE '062: the admin profile is already named Michelle. Nothing to do.';
    RETURN;
  END IF;
  IF old_name IS DISTINCT FROM 'Mrs. Fe Galang Da Silva' THEN
    RAISE EXCEPTION '062: the admin profile is named "%", not "Mrs. Fe Galang Da Silva". Nothing changed; check with Sean.', old_name;
  END IF;

  UPDATE profiles SET full_name = 'Michelle', updated_at = now() WHERE id = admin_id;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION',
          'PROFILE',
          admin_id,
          jsonb_build_object('full_name', old_name),
          jsonb_build_object(
            'full_name', 'Michelle',
            'note',      'The admin account now carries the name of the person who uses it. The boarding house keeps its name, Fe Galang Da Silva Boarding House; its owner does not use the system herself.',
            'kept',      'Email, phone number, password, role and sessions; every audit_logs row.',
            'reference', 'migration 062, Sean 2026-09-30'),
          NULL);

  IF (SELECT full_name FROM profiles WHERE id = admin_id) <> 'Michelle' THEN
    RAISE EXCEPTION '062: the name did not change. Rolled back.';
  END IF;
END $$;

-- "Success. No rows returned" means it ran.
--
-- PREVIEW - run this first, on its own; it only reads. Expect one row:
-- admin, "Mrs. Fe Galang Da Silva", active.
--
-- SELECT role, full_name, account_status FROM profiles WHERE role::text = 'admin';
--
-- AFTER - the same query should show "Michelle", and this the record of it:
--
-- SELECT previous_values, new_values FROM audit_logs WHERE action = 'AUDIT_CORRECTION'
--   ORDER BY created_at DESC LIMIT 1;
