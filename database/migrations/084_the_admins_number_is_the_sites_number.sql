-- 084 - the administrator's sign-in number is the number the website gives (B-111)
--
-- Sean, 20 Oct 2026: "the visitor should call the number that the admin set, so it's the same as
-- the log in number and site contact number", and email is no longer a way to sign in. Since B-111
-- the website shows her account's phone number on every page (GET /public/contact), and she signs
-- in with it. Her account held 09171234567, the example number the app's own messages print ("for
-- example 0917 123 4567"), a placeholder, while the number visitors and tenants have always been
-- given, and the GCash number, is 09274653938. This puts that number on her account, so the site,
-- her sign-in and what she sets later in "Change number / password" are one number.
--
-- Guarded: exactly one administrator, still holding the placeholder, and no other profile with the
-- new number (the normalized-phone unique index would refuse it anyway). A second run finds the
-- number already set and does nothing. One audit row records it. Her email is left in place; the
-- server no longer accepts it for signing in.
--
-- Run `npm run backup` first (taken: backups/2026-10-20T00-10-46). Verify:
--   SELECT phone_number FROM profiles WHERE role = 'admin';   -- 09274653938

DO $$
DECLARE
  n integer;
  admin_id uuid;
BEGIN
  SELECT count(*), min(id::text)::uuid INTO n, admin_id FROM profiles WHERE role = 'admin';
  IF n <> 1 THEN RAISE EXCEPTION '084: expected one administrator, found %. Nothing changed.', n; END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND phone_number = '09274653938') THEN
    RAISE NOTICE '084: already applied. Nothing to do.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = admin_id AND phone_number = '09171234567') THEN
    RAISE EXCEPTION '084: the administrator no longer holds the placeholder number. Nothing changed.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM profiles
     WHERE id <> admin_id AND regexp_replace(coalesce(phone_number, ''), '\D', '', 'g') IN ('09274653938', '639274653938')
  ) THEN
    RAISE EXCEPTION '084: another profile already has 09274653938. Nothing changed.';
  END IF;

  UPDATE profiles SET phone_number = '09274653938', updated_at = now() WHERE id = admin_id;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'PROFILE', admin_id,
          jsonb_build_object('phone_number', '09171234567'),
          jsonb_build_object('phone_number', '09274653938',
            'note', 'The administrator''s sign-in number set to the number the website gives; it held the app''s example placeholder.',
            'reference', 'migration 084; B-111'),
          NULL);
END $$;
