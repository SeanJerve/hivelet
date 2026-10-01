-- =============================================================================
-- 073 - tenants sign in first with a login ID; the phone numbers on file go
-- =============================================================================
-- Sean, 2026-10-01: the phone numbers on file for the tenants are not reliably
-- their own ("we had a really bad issue on that"), and neither are the emails.
-- So the system stops assuming any personal detail:
--
--   * every tenant gets a LOGIN ID, e.g. HV-48213 - five digits, typed easily on
--     a phone keypad. The landlady is shown it, with the one-time password, when
--     she moves someone in or resets a password, and hands both over in person.
--     Sign-in accepts it as well as an email or phone: `resolve_login_identifier`
--     gains a third branch, matched with dashes, spaces and letter case ignored
--     (HV-48213, hv48213 and "HV 48213" are the same ID);
--   * every active tenant's phone number is cleared. Nobody has changed their own
--     since 067 (checked 2026-10-01: no tenant PROFILE_UPDATE or password change
--     after 15:22 UTC on 30 Sep), so every number on file was typed in for them.
--     The old values are kept in this migration's AUDIT_CORRECTION row;
--   * every active tenant must, at next sign-in, choose their own password AND
--     give their own email and phone (`must_change_password`; the first sign-in
--     step asks for all three). The NAME stays the landlady's and is unchanged.
--
-- The CHECK that a password needs something to sign in with now counts the
-- login ID too. Emergency contacts are untouched. Former tenants are untouched.
--
-- SAFETY: one transaction. A second run assigns no new IDs (only tenants without
-- one get one), clears nothing more, and recreates the function identically.
-- =============================================================================

BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_id varchar(20);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_login_id
    ON profiles (upper(regexp_replace(login_id, '[^A-Za-z0-9]', '', 'g')))
 WHERE login_id IS NOT NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_login_identifier_required;
ALTER TABLE profiles ADD CONSTRAINT profiles_login_identifier_required
  CHECK (password_hash IS NULL OR email IS NOT NULL OR phone_number IS NOT NULL OR login_id IS NOT NULL);

-- A login ID for every tenant who can sign in and has none yet.
DO $$
DECLARE
  t record;
  candidate text;
BEGIN
  FOR t IN SELECT id FROM profiles WHERE role = 'tenant' AND password_hash IS NOT NULL AND login_id IS NULL LOOP
    LOOP
      candidate := 'HV-' || lpad((floor(random() * 90000) + 10000)::int::text, 5, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM profiles
         WHERE login_id IS NOT NULL
           AND upper(regexp_replace(login_id, '[^A-Za-z0-9]', '', 'g')) = upper(regexp_replace(candidate, '[^A-Za-z0-9]', '', 'g'))
      );
    END LOOP;
    UPDATE profiles SET login_id = candidate WHERE id = t.id;
  END LOOP;
END $$;

-- The phones typed in for the active tenants go; they give their own at sign-in.
DO $$
DECLARE
  prev jsonb;
  n integer;
BEGIN
  SELECT coalesce(jsonb_object_agg(id::text, phone_number), '{}'::jsonb) INTO prev
    FROM profiles
   WHERE role = 'tenant' AND account_status = 'active' AND phone_number IS NOT NULL;

  UPDATE profiles
     SET phone_number = NULL,
         must_change_password = true,
         updated_at = now()
   WHERE role = 'tenant' AND account_status = 'active'
     AND (phone_number IS NOT NULL OR must_change_password = false);
  GET DIAGNOSTICS n = ROW_COUNT;

  IF n > 0 THEN
    INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
    VALUES ('AUDIT_CORRECTION', 'PROFILE', '00000000-0000-0000-0000-000000000073',
            jsonb_build_object('phone_number_by_profile', prev),
            jsonb_build_object(
              'note', 'Tenants sign in first with a login ID the landlady hands over (HV-#####). The phone numbers typed in for the active tenants were cleared; each tenant gives their own email, phone and password at next sign-in. Names unchanged. Old numbers are in previous_values.',
              'tenants_updated', n,
              'reference', 'migration 073, Sean 2026-10-01'),
            NULL);
  END IF;
END $$;

-- Sign-in: email, then phone, then login ID. Same columns returned as before.
CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_identifier text)
 RETURNS TABLE(id uuid, email character varying, full_name character varying, role user_role_type, account_status account_status_type, password_hash character varying, failed_login_count integer, locked_until timestamp with time zone, must_change_password boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.email, p.full_name, p.role, p.account_status, p.password_hash,
         p.failed_login_count, p.locked_until, p.must_change_password
    FROM public.profiles p
   WHERE p.email IS NOT NULL
     AND lower(p.email) = lower(btrim(COALESCE(p_identifier, '')))

  UNION ALL

  SELECT p.id, p.email, p.full_name, p.role, p.account_status, p.password_hash,
         p.failed_login_count, p.locked_until, p.must_change_password
    FROM public.profiles p
   WHERE p.phone_number IS NOT NULL
     AND p.password_hash IS NOT NULL
     -- Guard against a blank or punctuation-only identifier normalising to ''
     -- and matching a row whose stored number is equally empty.
     AND public.normalize_ph_phone(p_identifier) <> ''
     AND public.normalize_ph_phone(p.phone_number) = public.normalize_ph_phone(p_identifier)
     -- Only reached when the email branch found nothing, so an address is never
     -- shadowed by a phone number.
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles e
        WHERE e.email IS NOT NULL
          AND lower(e.email) = lower(btrim(COALESCE(p_identifier, '')))
     )

  UNION ALL

  -- The login ID (073): letters and digits only, any case.
  SELECT p.id, p.email, p.full_name, p.role, p.account_status, p.password_hash,
         p.failed_login_count, p.locked_until, p.must_change_password
    FROM public.profiles p
   WHERE p.login_id IS NOT NULL
     AND p.password_hash IS NOT NULL
     AND regexp_replace(COALESCE(p_identifier, ''), '[^A-Za-z0-9]', '', 'g') <> ''
     AND upper(regexp_replace(p.login_id, '[^A-Za-z0-9]', '', 'g'))
       = upper(regexp_replace(p_identifier, '[^A-Za-z0-9]', '', 'g'))

  LIMIT 1;
$function$;

COMMIT;
