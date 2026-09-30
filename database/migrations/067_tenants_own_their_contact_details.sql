-- =============================================================================
-- 067 - tenants own their contact details: every active tenant's email becomes
--       a placeholder until they give their own
-- =============================================================================
-- NOT APPLIED by the author. Run the PREVIEW at the foot first and read it;
-- then `npm run backup`; then run this whole file in the Supabase SQL editor.
-- Deploy the code that reads placeholders (services/contactDetails.ts and its
-- frontend twin, lib/contactDetails.ts) BEFORE running this, or the pages will
-- show the placeholder addresses as if they were real.
--
-- WHY
-- ---
-- Sean, 30 September 2026: a tenant owns their sign-in and contact details
-- (email, phone number, password) and changes them themselves; the landlady
-- owns their name. The emails on file were typed in for the tenants by the
-- admin side, so nobody can say which of them the tenant actually reads. From
-- now on the address on a tenant's record is one the tenant gave.
--
-- So each active tenant's email is replaced by one that can never receive mail
-- and is unique to them:
--     'tenant-' || left(replace(id::text, '-', ''), 10) || '@hivelet.invalid'
-- `.invalid` is reserved (RFC 2606): it cannot be registered and no mail is
-- ever delivered to it. At their next sign-in the tenant is asked for a real
-- email and to confirm their phone number, and cannot use the portal until
-- they have (App.vue, ChangePasswordModal.vue; `mustCompleteContact` in
-- backend/src/services/contactDetails.ts). No page shows a placeholder as an
-- address: it reads "Not set yet".
--
-- WHAT CHANGES
-- ------------
--   * profiles.email of every tenant profile with account_status 'active',
--     from its current value to that tenant's placeholder.
--
-- WHAT STAYS, ON PURPOSE
-- ----------------------
--   * Phone numbers and passwords. Every active tenant has a phone number and
--     signs in with it; that does not change. (Anyone who signed in with their
--     email address signs in with their phone number instead.)
--   * Former tenants (account_status 'inactive'), prospects and the admin.
--   * A tenant who has ALREADY given their own email through the app (a
--     PROFILE_UPDATE they made themselves that set `email`) keeps it: that
--     address is theirs, which is the whole point.
--   * audit_logs rows. This adds one AUDIT_CORRECTION row whose
--     previous_values holds every old email keyed by profile id, so nothing
--     is lost: any of them can be read back from there.
--
-- SAFETY
-- ------
--   * Stops, changing nothing, if there are no active tenants or more than 40
--     (the property has 33 units); if any active tenant who can sign in has no
--     phone number (they would be left with nothing to sign in with); or if any
--     placeholder would collide with an email already on file.
--   * A second run finds nothing left to change and records nothing.
--   * One DO block: one statement and one transaction. An error anywhere,
--     including the checks at its end, undoes all of it.
--   * `profiles_login_identifier_required` (password_hash IS NULL OR email IS
--     NOT NULL OR phone_number IS NOT NULL) holds throughout: the email stays
--     non-null. The unique index on lower(email) holds: each placeholder is
--     built from the profile's own id, and the collision check runs first.
-- =============================================================================

DO $$
DECLARE
  n_active     integer;
  n_no_phone   integer;
  n_clash      integer;
  n_expected   integer;
  n_changed    integer;
  n_left       integer;
  n_pw_before  integer;
  n_pw_after   integer;
  old_emails   jsonb;
  first_id     uuid;
BEGIN
  SELECT count(*) INTO n_active
  FROM profiles WHERE role::text = 'tenant' AND account_status::text = 'active';

  IF n_active = 0 OR n_active > 40 THEN
    RAISE EXCEPTION '067 stopped, nothing changed: % active tenant profiles, expected between 1 and 40 (33 units). Send this message.', n_active;
  END IF;

  SELECT count(*) INTO n_no_phone
  FROM profiles
  WHERE role::text = 'tenant' AND account_status::text = 'active'
    AND password_hash IS NOT NULL
    AND (phone_number IS NULL OR btrim(phone_number) = '');
  IF n_no_phone > 0 THEN
    RAISE EXCEPTION '067 stopped, nothing changed: % active tenant(s) can sign in but have no phone number. With a placeholder email they could not sign in at all. Send this message.', n_no_phone;
  END IF;

  SELECT count(*) INTO n_clash
  FROM profiles t
  JOIN profiles o
    ON lower(o.email) = 'tenant-' || left(replace(t.id::text, '-', ''), 10) || '@hivelet.invalid'
   AND o.id <> t.id
  WHERE t.role::text = 'tenant' AND t.account_status::text = 'active';
  IF n_clash > 0 THEN
    RAISE EXCEPTION '067 stopped, nothing changed: % placeholder(s) would collide with an email already on file. Send this message.', n_clash;
  END IF;

  SELECT count(*) INTO n_pw_before
  FROM profiles WHERE role::text = 'tenant' AND password_hash IS NOT NULL;

  -- The rows to change, and what they held. Keyed by profile id.
  SELECT count(*),
         jsonb_object_agg(p.id::text, p.email),
         (array_agg(p.id ORDER BY p.id))[1]
    INTO n_expected, old_emails, first_id
  FROM profiles p
  WHERE p.role::text = 'tenant' AND p.account_status::text = 'active'
    AND p.email IS DISTINCT FROM
        'tenant-' || left(replace(p.id::text, '-', ''), 10) || '@hivelet.invalid'
    AND NOT EXISTS (
      SELECT 1 FROM audit_logs a
      WHERE a.action = 'PROFILE_UPDATE'
        AND a.entity_id = p.id
        AND a.actor_profile_id = p.id
        AND a.new_values ? 'email');

  IF n_expected = 0 THEN
    RAISE NOTICE '067: every active tenant already has a placeholder or an email of their own. Nothing to do.';
    RETURN;
  END IF;

  UPDATE profiles p
     SET email = 'tenant-' || left(replace(p.id::text, '-', ''), 10) || '@hivelet.invalid',
         updated_at = now()
   WHERE p.id::text IN (SELECT jsonb_object_keys(old_emails));
  GET DIAGNOSTICS n_changed = ROW_COUNT;

  IF n_changed <> n_expected THEN
    RAISE EXCEPTION '067: expected to change % email(s), changed %. Rolled back.', n_expected, n_changed;
  END IF;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION',
          'PROFILE',
          first_id,
          old_emails,
          jsonb_build_object(
            'email',     'tenant-<first 10 hex digits of the profile id>@hivelet.invalid, for each profile in previous_values',
            'profiles',  n_changed,
            'note',      'Every active tenant''s email replaced by a placeholder that can never receive mail. The tenant gives their own at next sign-in; the old addresses were typed in for them and are kept in previous_values, keyed by profile id.',
            'kept',      'Phone numbers and passwords (every active tenant signs in with their phone); former tenants, prospects and the admin; any email a tenant already gave themselves; every audit_logs row.',
            'reference', 'migration 067, Sean 2026-09-30'),
          NULL);

  -- Nothing unexpected, or nothing commits.
  SELECT count(*) INTO n_left
  FROM profiles p
  WHERE p.id::text IN (SELECT jsonb_object_keys(old_emails))
    AND p.email IS DISTINCT FROM
        'tenant-' || left(replace(p.id::text, '-', ''), 10) || '@hivelet.invalid';
  IF n_left <> 0 THEN
    RAISE EXCEPTION '067: % profile(s) did not take their placeholder. Rolled back.', n_left;
  END IF;

  SELECT count(*) INTO n_pw_after
  FROM profiles WHERE role::text = 'tenant' AND password_hash IS NOT NULL;
  IF n_pw_after <> n_pw_before THEN
    RAISE EXCEPTION '067: tenants who can sign in went from % to %. Rolled back.', n_pw_before, n_pw_after;
  END IF;
END $$;

-- "Success. No rows returned" means it ran.
--
-- PREVIEW - run this first, on its own; it only reads. Read-only on
-- 2026-09-30 evening it gave: 32 active tenants, 32 to change, 0 without an
-- email, 32 distinct placeholders, 0 clashes, 0 who could sign in without a
-- phone, 0 who had already given their own email.
--
-- WITH t AS (
--   SELECT id, email, 'tenant-' || left(replace(id::text, '-', ''), 10) || '@hivelet.invalid' AS placeholder
--   FROM profiles WHERE role::text = 'tenant' AND account_status::text = 'active')
-- SELECT
--   (SELECT count(*) FROM t) AS active_tenants,
--   (SELECT count(*) FROM t WHERE email IS DISTINCT FROM placeholder) AS would_change,
--   (SELECT count(*) FROM t WHERE email IS NULL) AS no_email_now,
--   (SELECT count(DISTINCT placeholder) FROM t) AS distinct_placeholders,
--   (SELECT count(*) FROM t JOIN profiles o ON lower(o.email) = t.placeholder AND o.id <> t.id) AS clashes,
--   (SELECT count(*) FROM profiles p JOIN t ON t.id = p.id
--      WHERE p.password_hash IS NOT NULL AND (p.phone_number IS NULL OR btrim(p.phone_number) = '')) AS signin_without_phone,
--   (SELECT count(*) FROM audit_logs a JOIN t ON t.id = a.entity_id
--      WHERE a.action = 'PROFILE_UPDATE' AND a.actor_profile_id = a.entity_id AND a.new_values ? 'email') AS already_gave_own;
--
-- AFTER - every active tenant reads placeholder = true, and the record of it:
--
-- SELECT email LIKE 'tenant-%@hivelet.invalid' AS placeholder, count(*)
--   FROM profiles WHERE role::text = 'tenant' AND account_status::text = 'active' GROUP BY 1;
--
-- SELECT (SELECT count(*) FROM jsonb_object_keys(previous_values)) AS old_emails_kept, new_values
--   FROM audit_logs WHERE action = 'AUDIT_CORRECTION' ORDER BY created_at DESC LIMIT 1;
