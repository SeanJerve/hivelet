-- =============================================================================
-- 048_must_change_password.sql — a fresh random password per tenant, and a
-- flag that forces them to replace it before the portal opens
-- =============================================================================
-- B-53 in BLOCKED_FOR_SEAN.md: `POST /admin/tenants` hashed the literal
-- 'Hivelet@Tenant2026' as every new tenant's starting password. That string is
-- not a secret anymore — it sits in 21 commits of this repo's own history and
-- was once found live in a shipped `frontend/dist` bundle
-- (docs/13_AUDIT_JUDGEMENT_LOG.md §9). The application code has already been
-- changed to generate a random one-time password per tenant instead
-- (backend/src/utils/generateTemporaryPassword.ts); this migration adds the
-- other half — a flag the login path can check so a resident who has not yet
-- replaced that starting password is told to, before anything else opens.
--
-- WHY A NEW COLUMN, NOT THE EXISTING `password_changed_at`
-- ----------------------------------------------------------------------------
-- `password_changed_at` already exists and looked like it could serve this —
-- "NULL means never changed" — until `scripts/rotate-demo-passwords.mjs` was
-- read: it sets `password_changed_at` on every account it rotates, including
-- ones that stay on the SAME shared demo password afterward. That field means
-- "the hash was last touched at this time", not "the holder chose this
-- password themselves" — two different facts that happen to coincide for a
-- resident who changes their own password normally, and diverge for exactly
-- the case this exists to catch. A purpose-built flag keeps the two apart.
--
-- WHAT THIS DOES NOT DO
-- ----------------------------------------------------------------------------
-- It does not touch any existing account. Every current row gets `false` —
-- this is a gate for tenants onboarded from here on, not a retroactive
-- password reset on the 44 accounts already on file (several of which are on
-- a shared demo password by deliberate, separate arrangement while testing —
-- see BLOCKED_FOR_SEAN.md's note beside B-53). Forcing that on every existing
-- account is a bigger, disruptive change nobody asked for here.
--
-- Purely additive: one column with a safe default, one function whose return
-- shape grows by a column. Nothing is dropped, nothing existing changes
-- meaning. Safe to re-run.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.must_change_password IS
  'True from onboarding until the resident sets their own password. Set by '
  'POST /admin/tenants when it issues a random starting password; cleared by '
  'changeOwnPassword() the moment they choose their own. Never true for an '
  'account with no password_hash at all (a prospect, or a tenant onboarded '
  'without a portal login) — the onboarding route only sets it alongside a '
  'password it is actually issuing.';

-- `resolve_login_identifier` returns a fixed row shape (migration 021).
-- Postgres will not let CREATE OR REPLACE add a column to that shape, so the
-- function is dropped and recreated rather than replaced in place.
DROP FUNCTION IF EXISTS public.resolve_login_identifier(TEXT);

CREATE FUNCTION public.resolve_login_identifier(p_identifier TEXT)
RETURNS TABLE (
  id                   UUID,
  email                VARCHAR,
  full_name            VARCHAR,
  role                 public.user_role_type,
  account_status       public.account_status_type,
  password_hash        VARCHAR,
  failed_login_count   INTEGER,
  locked_until         TIMESTAMPTZ,
  must_change_password BOOLEAN
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
         p.locked_until,
         p.must_change_password
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
         p.locked_until,
         p.must_change_password
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
  'second copy of that rule. OD-09. Extended 2026-09-22 (migration 048) to also '
  'return must_change_password, so the login path can enforce it without a '
  'second query.';

REVOKE ALL ON FUNCTION public.resolve_login_identifier(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_login_identifier(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_login_identifier(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_login_identifier(TEXT) TO service_role;

-- Expect every existing row false — nobody's account is retroactively gated.
SELECT count(*) FILTER (WHERE must_change_password) AS flagged_now,
       count(*) AS total_profiles
FROM public.profiles;

-- Expect one row, 9 columns, the last one must_change_password.
SELECT * FROM public.resolve_login_identifier('admin@hivelet.ph');
