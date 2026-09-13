-- =============================================================================
-- Migration 006 — Tenant Identity: Every Tenant a Record, Login Optional
-- =============================================================================
-- @phase          Phase 2 (Database Architecture)
-- @decisionRef    PHASE1_LOCKED_DECISIONS.md §7b; OD-09 (closed 2026-09-13)
-- @supersedes     004_form_schema_gaps.sql header note, which deferred this
--                 change pending "a deliberate answer rather than a silent
--                 default". That answer now exists.
-- @businessRules  BR-026, BR-027 (no duplicate profiles), BR-025 (deactivation)
-- @requirements   FR-001, FR-002
--
-- Mrs. Fe onboards tenants who have no email address. `profiles.email` is
-- currently NOT NULL and doubles as the login identifier, which would force the
-- administrator to invent fake addresses simply to create a billable record.
--
-- The locked decision: a tenant is a RECORD; a portal login is an OPTIONAL
-- capability layered on top of it. A tenant may exist with no credentials at
-- all — created from name plus phone, billed, settled in cash, issued a printed
-- receipt, and never once opening the site. A login can be enabled later for
-- that same row, which is what preserves BR-026 / BR-027.
--
-- Apply AFTER 001-005. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Email becomes optional.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Email uniqueness.
--
--    CORRECTION TO THE PHASE 1 HANDOFF NOTE. That note says the uniqueness
--    constraint "must become a partial unique index so multiple NULLs remain
--    legal". Multiple NULLs are *already* legal: PostgreSQL UNIQUE defaults to
--    NULLS DISTINCT, so every NULL is treated as different from every other.
--    Step 1 alone is therefore sufficient for correctness.
--
--    Two things are still worth doing, and neither is about NULL legality:
--
--    (a) `profiles_email_key` (the inline UNIQUE on the raw column) is REDUNDANT.
--        `idx_profiles_email_lower` enforces uniqueness on LOWER(email), which
--        is strictly stronger — anything the raw constraint would reject, the
--        case-insensitive one rejects too. Carrying both costs a second index
--        on every write and buys nothing.
--
--    (b) Making the surviving index PARTIAL keeps credential-less tenants out
--        of it entirely. That is an efficiency and intent-documenting change.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  conname_found TEXT;
BEGIN
  SELECT con.conname
    INTO conname_found
    FROM pg_constraint con
    JOIN pg_class     rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid
                         AND att.attnum   = con.conkey[1]
   WHERE nsp.nspname = 'public'
     AND con.contype = 'u'
     AND rel.relname = 'profiles'
     AND array_length(con.conkey, 1) = 1
     AND att.attname = 'email';

  IF conname_found IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', conname_found);
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_profiles_email_lower;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (LOWER(email))
  WHERE email IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Phone number as an alternate login identifier.
--
--    Uniqueness is scoped to rows that actually HOLD credentials
--    (`password_hash IS NOT NULL`). This is deliberate. A login identifier only
--    has to resolve to one account among accounts you can log into. Two
--    credential-less tenants - a married couple who gave the landlady one
--    contact number - must still both be billable records, and a global unique
--    index would make the second one impossible to create.
--
--    Normalisation is NOT simply "strip non-digits". A first attempt did exactly
--    that and failed a live test: '0917 555 1234' yields '09175551234' while
--    '+63 917 555 1234' yields '639175551234', so the same human phone number
--    registered twice. Philippine mobile numbers are written both ways
--    routinely, so the canonical form must fold the +63 country code onto the
--    national 0 prefix before comparing.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_ph_phone(raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $fn$
  SELECT CASE
    WHEN regexp_replace(COALESCE(raw, ''), '[^0-9]', '', 'g') ~ '^63[0-9]{10}$'
      THEN '0' || substring(regexp_replace(raw, '[^0-9]', '', 'g') FROM 3)
    ELSE regexp_replace(COALESCE(raw, ''), '[^0-9]', '', 'g')
  END;
$fn$;

COMMENT ON FUNCTION public.normalize_ph_phone(TEXT) IS
  'Canonical form of a Philippine phone number for identity comparison: digits '
  'only, with a leading 63 country code folded to the national 0 prefix so that '
  '+63 917 555 1234 and 0917 555 1234 compare equal. IMMUTABLE because '
  'idx_profiles_phone_login indexes it - changing this body silently invalidates '
  'that index, so reindex profiles if it is ever altered.';

DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO dup_count
    FROM (
      SELECT public.normalize_ph_phone(phone_number) AS canonical
        FROM public.profiles
       WHERE phone_number  IS NOT NULL
         AND password_hash IS NOT NULL
         AND public.normalize_ph_phone(phone_number) <> ''
       GROUP BY 1
      HAVING COUNT(*) > 1
    ) d;

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'Migration 006 stopped: % phone number(s) are shared by more than one '
      'credentialed account once +63 and 0 prefixes are treated as equal. '
      'Resolve the duplicates, then re-run. No changes have been committed.',
      dup_count;
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_profiles_phone_login;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_login
  ON public.profiles (public.normalize_ph_phone(phone_number))
  WHERE phone_number  IS NOT NULL
    AND password_hash IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. A credentialed account must be reachable by at least one identifier.
--
--    Expresses the locked decision directly: no credentials is fine, but
--    credentials with nothing to log in WITH is not a state the system should
--    be able to reach.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_login_identifier_required;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_login_identifier_required
  CHECK (
    password_hash IS NULL
    OR email        IS NOT NULL
    OR phone_number IS NOT NULL
  );

-- -----------------------------------------------------------------------------
-- 5. Verify.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF (SELECT is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'profiles'
         AND column_name = 'email') <> 'YES' THEN
    RAISE EXCEPTION 'Migration 006 failed: profiles.email is still NOT NULL.';
  END IF;

  RAISE NOTICE
    'Migration 006 OK: email optional, phone usable as an alternate login '
    'identifier, credential-less tenant records now permitted.';
END $$;

COMMIT;
