-- =============================================================================
-- 021_resolve_login_identifier.sql — let a tenant sign in with a phone number
-- =============================================================================
-- OD-09, client-confirmed 2026-09-13: "Do tenants need an email address to
-- exist in the system? No. Every tenant is a record; a portal login is optional
-- and separate."
--
-- The schema was built for phone login and then nothing used it:
--
--   profiles_login_identifier_required
--     CHECK (password_hash IS NULL OR email IS NOT NULL OR phone_number IS NOT NULL)
--
--   idx_profiles_phone_login
--     UNIQUE INDEX ON normalize_ph_phone(phone_number)
--     WHERE phone_number IS NOT NULL AND password_hash IS NOT NULL
--
--   normalize_ph_phone(text)
--     folds 0917…, +63917… and 63917… to one form
--
-- A unique index whose predicate is "has a phone AND has a password", beside a
-- normaliser for Philippine mobile formats, exists for exactly one purpose.
-- `authService.login()` nonetheless looked callers up with
-- `.ilike('email', …)` only, so a tenant onboarded without an email could hold
-- credentials and still never get in.
--
-- WHY THIS IS A DATABASE FUNCTION and not a few lines of TypeScript:
-- resolving a phone means applying `normalize_ph_phone` to the stored column,
-- which is what `idx_profiles_phone_login` is built on. Reimplementing that
-- regex in the API would create a second copy of the rule that can drift from
-- the index silently — the exact failure mode this project has been correcting
-- all through the 2026-09-15 audit. One definition, in the place the index
-- already uses.
--
-- Returns at most one row. `profiles.email` is UNIQUE and the phone index is
-- UNIQUE among credentialed profiles, so neither branch can be ambiguous. Email
-- is matched first so an address can never be shadowed by a phone.
--
-- Safe to re-run.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_login_identifier(p_identifier TEXT)
RETURNS TABLE (
  id                 UUID,
  email              VARCHAR,
  full_name          VARCHAR,
  role               public.user_role_type,
  account_status     public.account_status_type,
  password_hash      VARCHAR,
  failed_login_count INTEGER,
  locked_until       TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id,
         p.email,
         p.full_name,
         p.role,
         p.account_status,
         p.password_hash,
         p.failed_login_count,
         p.locked_until
    FROM public.profiles p
   WHERE p.email IS NOT NULL
     AND lower(p.email) = lower(btrim(COALESCE(p_identifier, '')))

  UNION ALL

  SELECT p.id,
         p.email,
         p.full_name,
         p.role,
         p.account_status,
         p.password_hash,
         p.failed_login_count,
         p.locked_until
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
       SELECT 1
         FROM public.profiles e
        WHERE e.email IS NOT NULL
          AND lower(e.email) = lower(btrim(COALESCE(p_identifier, '')))
     )

  LIMIT 1;
$$;

COMMENT ON FUNCTION public.resolve_login_identifier(TEXT) IS
  'Resolves a login identifier - an email address or a Philippine phone number - '
  'to one credential row. Phone matching goes through normalize_ph_phone(), the '
  'same expression idx_profiles_phone_login is built on, so the API never holds a '
  'second copy of that rule. OD-09.';

REVOKE ALL ON FUNCTION public.resolve_login_identifier(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_login_identifier(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_login_identifier(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(TEXT) TO service_role;
