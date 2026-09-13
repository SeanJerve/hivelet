-- =============================================================================
-- APPLY_PHASE2.sql  —  Hivelet Phase 2 migrations 005-010, in order
-- =============================================================================
-- Regenerated 2026-09-13 after a failed first run. Paste the whole file into the
-- Supabase SQL Editor and Run.
--
-- SAFE TO RE-RUN AFTER THE FAILED ATTEMPT. On the first attempt 005 and 006
-- committed, 007 failed and rolled back, and 008-010 never executed. Every
-- migration here is idempotent, so running the file again re-applies 005 and 006
-- as no-ops and continues from 007.
--
-- WHY 007 FAILED THE FIRST TIME - and what it taught us.
-- The live database carries a CHECK constraint, `rooms_floor_check`, capping
-- `rooms.floor` at 3. That constraint exists NOWHERE in this repository: not in
-- FULL_DATABASE_SCHEMA.sql, not in migrations 001-004. It was applied out of band,
-- so the master schema file does not describe the live database.
--
-- The original 007 went straight to the UPDATE on the evidence of that file and
-- hit 23514. The transaction rolled it back cleanly and nothing was left
-- half-applied - which is exactly what these migrations are written to do.
--
-- 007 now relaxes the constraint to `floor BETWEEN 1 AND 4` before touching the
-- row, and reports whatever definition it replaced so the drift is recorded.
-- Re-verified against a database deliberately built WITH the production
-- constraint, not just from the schema file.
--
-- Live-data preconditions re-checked 2026-09-13 with
-- database/check-migration-preconditions.mjs: NO BLOCKERS.
--   * no credentialed account shares a phone number (after +63 folding)
--   * no case-insensitive email collisions
--   * every credentialed account has at least one identifier
--   * all 1,327 stored property_area values are already canonical
--
-- WHAT CHANGES, in one line each:
--   005  six ledger foreign keys -> ON DELETE RESTRICT (financial history cannot cascade away)
--   006  profiles.email nullable; phone becomes an alternate login identifier
--   007  rooms_floor_check relaxed to 1-4; PH moves to the rooftop level 4
--   008  property_areas lookup + foreign key; Main House and Other marked NON-RENTAL
--   009  comments only: deposit_amount is advance rent; rent is never prorated
--   010  replace_expense_allocations() so allocation edits are atomic
--
-- ORDER MATTERS: 010 depends on 008.
--
-- AFTER RUNNING THIS, please run DRIFT_DIAGNOSTIC.sql in the same editor and send
-- the result. The schema file is known to be wrong and the remaining Phase 2
-- deliverables - the ERD, the data dictionary, the 3NF proof - must describe the
-- real database rather than a stale file.
-- =============================================================================


-- ######################################################################
-- ##  005_ledger_fk_restrict.sql
-- ######################################################################

-- =============================================================================
-- Migration 005 — Protect Financial History with ON DELETE RESTRICT
-- =============================================================================
-- @phase          Phase 2 (Database Architecture)
-- @decisionRef    docs/claude_pipeline/CONTINUE_HERE.md "Phase 2 starts here"
-- @defectRef      PHASE1_LOCKED_DECISIONS.md known defect 6
-- @businessRules  BR-018, BR-028 (audit integrity), BR-048 (ledger access)
-- @architecture   ARCH-007 Immutable Audit Trail
--
-- The three financial ledgers reference `rooms` and `profiles` with
-- ON DELETE CASCADE. Deleting one room row would therefore delete every bill,
-- payment and income record ever raised against it, silently and with no audit
-- entry, because a cascade is a database-level action that never reaches
-- auditService.ts. The Phase 1 audit measured 17 CASCADE / 4 SET NULL /
-- 0 RESTRICT across the schema; `DEEP_TECHNICAL_ARCHITECTURE_AND_DATABASE_
-- ANALYSIS.md:41` already claims RESTRICT is in force. This migration makes
-- that claim true.
--
-- Safe by construction: soft-delete already exists on both parents
-- (`profiles.account_status`, `rooms.operational_status`), so the application
-- never hard-deletes either. The migration therefore changes behaviour on a
-- path that is not exercised, and touches zero rows.
--
-- Deliberately NOT changed:
--   * `payments.bill_id`           -> SET NULL is correct; a payment can
--                                    legitimately outlive a voided bill.
--   * `monthly_income_records.assignment_id` -> SET NULL for the same reason.
--   * `room_photos`, `ticket_attachments`, `inquiry_messages`,
--     `ticket_messages`, `expense_property_allocations` -> these are genuine
--     child records with no independent meaning. CASCADE is correct for them.
--
-- Apply AFTER 001-004. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Rebuild the six ledger foreign keys with RESTRICT.
--
--    The existing constraint is located by column rather than by assumed name,
--    so the migration is correct even if PostgreSQL did not use its default
--    `<table>_<column>_fkey` naming. Dropping and recreating is the only way to
--    change ON DELETE behaviour; PostgreSQL has no ALTER CONSTRAINT for it.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r         RECORD;
  existing  TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('bills',                  'room_id',           'rooms'),
      ('bills',                  'tenant_profile_id', 'profiles'),
      ('payments',               'room_id',           'rooms'),
      ('payments',               'tenant_profile_id', 'profiles'),
      ('monthly_income_records', 'room_id',           'rooms'),
      ('monthly_income_records', 'tenant_profile_id', 'profiles')
    ) AS v(tbl, col, reftbl)
  LOOP
    SELECT con.conname
      INTO existing
      FROM pg_constraint con
      JOIN pg_class     rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      JOIN pg_attribute att ON att.attrelid = con.conrelid
                           AND att.attnum   = con.conkey[1]
     WHERE nsp.nspname = 'public'
       AND con.contype = 'f'
       AND rel.relname = r.tbl
       AND array_length(con.conkey, 1) = 1
       AND att.attname = r.col;

    IF existing IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, existing);
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I '
      'FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE RESTRICT',
      r.tbl, r.tbl || '_' || r.col || '_fkey', r.col, r.reftbl
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Assert the end state, so a partial application fails loudly inside the
--    transaction rather than leaving the ledgers half-protected.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  restrict_count INTEGER;
BEGIN
  SELECT COUNT(*)
    INTO restrict_count
    FROM pg_constraint con
    JOIN pg_class     rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid
                         AND att.attnum   = con.conkey[1]
   WHERE nsp.nspname = 'public'
     AND con.contype = 'f'
     AND con.confdeltype = 'r'                       -- 'r' = RESTRICT
     AND rel.relname IN ('bills', 'payments', 'monthly_income_records')
     AND att.attname IN ('room_id', 'tenant_profile_id');

  IF restrict_count <> 6 THEN
    RAISE EXCEPTION
      'Migration 005 failed: expected 6 RESTRICT ledger foreign keys, found %.',
      restrict_count;
  END IF;

  RAISE NOTICE 'Migration 005 OK: 6 ledger foreign keys now ON DELETE RESTRICT.';
END $$;

COMMIT;

-- ######################################################################
-- ##  006_profiles_optional_login.sql
-- ######################################################################

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

-- ######################################################################
-- ##  007_rooms_floor_correction.sql
-- ######################################################################

-- =============================================================================
-- Migration 007 — Correct the Penthouse to the Rooftop Level
-- =============================================================================
-- @phase          Phase 2 (Database Architecture / data cleanup)
-- @decisionRef    PHASE1_LOCKED_DECISIONS.md §1; OD-13 (closed 2026-09-13)
-- @confirmedBy    Owner, re-confirmed 2026-09-13: the penthouse sits on its own
--                 rooftop level above floor 3. The building has four levels.
-- @defectRef      PHASE1_LOCKED_DECISIONS.md known defect 10
-- @businessRules  BR-032 (property model)
-- @architecture   ARCH-001 Room-Centric Tenancy
--
-- `PH` is seeded with floor = 3 (`database/FULL_DATABASE_SCHEMA.sql:499`). It is
-- the only penthouse and it occupies a rooftop level of its own. Corrected here
-- as an incremental migration; the master schema file is never edited.
--
-- SCHEMA DRIFT — why this migration has a step 1 at all.
-- The first version of this file went straight to the UPDATE, on the evidence of
-- `FULL_DATABASE_SCHEMA.sql`, which declares `floor INTEGER NOT NULL DEFAULT 1`
-- with no CHECK. Applying it to the live database failed:
--
--   ERROR 23514: new row for relation "rooms" violates check constraint "rooms_floor_check"
--
-- The live database carries a `rooms_floor_check` constraint that **exists
-- nowhere in this repository** — not in the master schema file, not in migrations
-- `001`-`004`. It was applied out of band. It almost certainly caps `floor` at 3,
-- which was correct until the penthouse was confirmed to sit on a fourth level.
--
-- The transaction rolled the failure back cleanly and nothing was left half-done,
-- which is the behaviour these migrations are written for. Step 1 now relaxes the
-- constraint to the real building before touching the row, and reports whatever
-- definition it replaced so the drift is recorded rather than silently erased.
--
-- SCOPE LIMIT — read this before assuming the floor data is now correct.
-- The owner's authoritative survey is 11 / 11 / 10 / 1. After this migration the
-- seeded per-unit values yield 12 / 11 / 9 / 1: one unit sits on floor 1 in the
-- data that the survey places on floor 3. LF and LB were confirmed on floor 1 on
-- 2026-09-13, so every floor-1 unit is now accounted for and each encodes its own
-- level — which points at the survey being one out, not the data. Tracked as
-- OD-14. This migration does not guess; it corrects only `PH`.
--
-- Apply AFTER 001-006. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Make room for a fourth level.
--
--    Finds any CHECK constraint on `rooms` whose definition mentions `floor`,
--    regardless of name, reports it, drops it, and installs one that matches the
--    building as surveyed. Doing this by definition rather than by name means the
--    migration works whether the live constraint is called `rooms_floor_check` or
--    something else, and whether or not it exists at all (a database built purely
--    from the repo has none).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  found BOOLEAN := FALSE;
BEGIN
  FOR r IN
    SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class     rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'rooms'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%floor%'
  LOOP
    found := TRUE;
    RAISE NOTICE 'Migration 007: replacing CHECK constraint % -> %', r.conname, r.definition;
    EXECUTE format('ALTER TABLE public.rooms DROP CONSTRAINT %I', r.conname);
  END LOOP;

  IF NOT found THEN
    RAISE NOTICE 'Migration 007: no pre-existing floor CHECK constraint found; adding one.';
  END IF;
END $$;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_floor_check
  CHECK (floor BETWEEN 1 AND 4);

COMMENT ON COLUMN public.rooms.floor IS
  'Building level. 1-3 are residential floors; 4 is the rooftop level occupied '
  'only by the penthouse (PH). Owner-confirmed 2026-09-13 (OD-13).';

-- -----------------------------------------------------------------------------
-- 2. Move the penthouse to level 4.
-- -----------------------------------------------------------------------------
UPDATE public.rooms
   SET floor       = 4,
       description = 'Penthouse Master Suite on its own rooftop level, '
                     || 'above floor 3 (BR-032).',
       updated_at  = NOW()
 WHERE room_number = 'PH'
   AND floor IS DISTINCT FROM 4;

-- -----------------------------------------------------------------------------
-- 3. Verify the penthouse, and report the resulting tally without failing on
--    the known outstanding discrepancy (OD-14).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  ph_floor INTEGER;
  tally    TEXT;
BEGIN
  SELECT floor INTO ph_floor FROM public.rooms WHERE room_number = 'PH';

  IF ph_floor IS NULL THEN
    RAISE EXCEPTION 'Migration 007 failed: no room row with room_number = ''PH''.';
  ELSIF ph_floor <> 4 THEN
    RAISE EXCEPTION 'Migration 007 failed: PH is on floor %, expected 4.', ph_floor;
  END IF;

  SELECT string_agg(floor || ' => ' || cnt, ',  ' ORDER BY floor)
    INTO tally
    FROM (SELECT floor, COUNT(*) AS cnt FROM public.rooms GROUP BY floor) t;

  RAISE NOTICE 'Migration 007 OK: PH is on level 4. Tally is now [%].', tally;
  RAISE NOTICE 'Owner survey is 1 => 11, 2 => 11, 3 => 10, 4 => 1. One floor-1 '
               'unit remains unreconciled (OD-14) and is not corrected here.';
END $$;

COMMIT;

-- ######################################################################
-- ##  008_property_areas_lookup.sql
-- ######################################################################

-- =============================================================================
-- Migration 008 — Property Area Lookup, and the Personal/Rental Boundary
-- =============================================================================
-- @phase          Phase 2 (Database Architecture)
-- @decisionRef    OD-05, closed 2026-09-13 by Group 4
-- @businessRules  BR-041 (expense allocation), BR-047 (reconciliation)
-- @sourceDoc      docs/10_MONTHLY_EXPENSES_REPORT.md §2, §5
--
-- `expense_property_allocations.property_area` is VARCHAR(100) NOT NULL free
-- text with no CHECK and no lookup, and the API writes whatever string arrives
-- (`backend/src/routes/admin.ts:1409`). A typo silently creates a sixth area
-- that no report will ever find again.
--
-- WHY THIS IS MORE THAN A TIDY-UP.
-- "Main House" was the one area with no matching unit cluster, and
-- `docs/10_MONTHLY_EXPENSES_REPORT.md:27` recorded its meaning as unconfirmed.
-- CONFIRMED 2026-09-13: **Main House is Mrs. Fe's own residence.** Those rows are
-- personal household costs that happen to share a book with the business \u2014 they
-- are NOT a cost of running the boarding house.
--
-- This matters arithmetically, not just descriptively. §5 of the source document
-- gives a real entry: the `4-Jun-26 Electricbill (May26)` row splits
-- \u20b114,964.13 to Boarding House and \u20b15,688.67 to Main House on ONE bill. If that
-- \u20b15,688.67 is counted as a business expense, net rental income is understated by
-- that amount every time it happens. `is_rental_expense` is what lets the income
-- report subtract only the \u20b114,964.13.
--
-- "Other Expenses / Personal" is marked non-rental for the same reason; it
-- already says so in its own name.
--
-- KNOWN GAP, recorded not invented: the five areas cover only three of the five
-- unit clusters. Penthouse and Linda have no area of their own. Where their
-- costs are recorded today is not established by any document, and this
-- migration does not guess \u2014 it is carried as a Phase 2 follow-up question.
--
-- Apply AFTER 001-007. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. The lookup. `code` deliberately holds the exact string already stored in
--    `expense_property_allocations.property_area`, so no data rewrite is needed
--    and the foreign key can be added against live rows as they stand.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_areas (
  code              VARCHAR(100) PRIMARY KEY,
  name              VARCHAR(150) NOT NULL,
  cluster_code      VARCHAR(50) REFERENCES public.clusters(code) ON UPDATE CASCADE,
  is_rental_expense BOOLEAN      NOT NULL DEFAULT TRUE,
  display_order     INTEGER      NOT NULL DEFAULT 0,
  notes             TEXT
);

COMMENT ON TABLE public.property_areas IS
  'The five allocation buckets of the monthly expense ledger '
  '(10_MONTHLY_EXPENSES_REPORT.md section 2). is_rental_expense = FALSE marks '
  'costs that are not a cost of running the boarding house and must be excluded '
  'from net rental income.';

COMMENT ON COLUMN public.property_areas.is_rental_expense IS
  'FALSE for Main House (Mrs. Fe personal residence) and Other/Personal. Net '
  'rental income must sum only the TRUE rows. Confirmed 2026-09-13 (OD-05).';

INSERT INTO public.property_areas (code, name, cluster_code, is_rental_expense, display_order, notes)
VALUES
  ('Boarding House',            'Boarding House Expenses',   'BH',              TRUE,  1,
   'Maps to the BH (Main Rooms) cluster.'),
  ('Main House',                'Main House Expenses',        NULL,             FALSE, 2,
   'Mrs. Fe Galang Da Silva personal residence. Confirmed 2026-09-13 (OD-05). '
   'Not a rental cost; excluded from net rental income. Shares utility bills '
   'with the boarding house, which is why entries split across two areas.'),
  ('Front Apartment',           'Front Apartment Expenses',  'Front Apartment', TRUE,  3,
   'Maps to the Front Apartment cluster.'),
  ('Back Apartment',            'Back Apartment Expenses',   'Back Apartment',  TRUE,  4,
   'Maps to the Back Apartment cluster.'),
  ('Other Expenses / Personal', 'Other Expenses / Personal',  NULL,             FALSE, 5,
   'Non-rental by definition. Excluded from net rental income.')
ON CONFLICT (code) DO UPDATE
SET name              = EXCLUDED.name,
    cluster_code      = EXCLUDED.cluster_code,
    is_rental_expense = EXCLUDED.is_rental_expense,
    display_order     = EXCLUDED.display_order,
    notes             = EXCLUDED.notes;

-- -----------------------------------------------------------------------------
-- 2. Refuse to constrain live data that would not satisfy the constraint.
--    Fails inside the transaction and rolls back, rather than half-applying.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  strays TEXT;
BEGIN
  SELECT string_agg(DISTINCT quote_literal(a.property_area), ', ')
    INTO strays
    FROM public.expense_property_allocations a
    LEFT JOIN public.property_areas p ON p.code = a.property_area
   WHERE p.code IS NULL;

  IF strays IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration 008 stopped: expense_property_allocations holds property_area '
      'value(s) not in the lookup: %. Reconcile them to the five canonical '
      'areas, then re-run. Nothing has been committed.', strays;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Constrain it. ON UPDATE CASCADE so a future rename propagates instead of
--    orphaning history; ON DELETE RESTRICT because an area with expenses
--    allocated against it must not be removable.
-- -----------------------------------------------------------------------------
ALTER TABLE public.expense_property_allocations
  DROP CONSTRAINT IF EXISTS expense_property_allocations_property_area_fkey;

ALTER TABLE public.expense_property_allocations
  ADD CONSTRAINT expense_property_allocations_property_area_fkey
  FOREIGN KEY (property_area) REFERENCES public.property_areas(code)
  ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_expense_alloc_area
  ON public.expense_property_allocations (property_area);

-- -----------------------------------------------------------------------------
-- 4. Verify.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  area_count    INTEGER;
  nonrental_cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO area_count    FROM public.property_areas;
  SELECT COUNT(*) INTO nonrental_cnt FROM public.property_areas WHERE NOT is_rental_expense;

  IF area_count <> 5 THEN
    RAISE EXCEPTION 'Migration 008 failed: expected 5 property areas, found %.', area_count;
  END IF;
  IF nonrental_cnt <> 2 THEN
    RAISE EXCEPTION
      'Migration 008 failed: expected 2 non-rental areas (Main House, Other/Personal), found %.',
      nonrental_cnt;
  END IF;

  RAISE NOTICE 'Migration 008 OK: 5 property areas, 2 of them non-rental, '
               'allocations now constrained by foreign key.';
END $$;

COMMIT;

-- ######################################################################
-- ##  009_advance_rent_and_whole_month_billing.sql
-- ######################################################################

-- =============================================================================
-- Migration 009 — Advance Rent Semantics and Whole-Month Billing
-- =============================================================================
-- @phase          Phase 2 (Database Architecture / semantics)
-- @decisionRef    OD-04 and OD-03, both closed 2026-09-13 by Group 4
-- @businessRules  BR-025 (deactivation), BR-035, BR-038
--
-- Two long-standing open questions were answered together, and both turned out
-- to be about the same thing: this business does not refund.
--
-- OD-04 - THERE IS NO SECURITY DEPOSIT.
-- The register assumed `room_assignments.deposit_amount` held a refundable
-- security deposit and asked how it is reconciled on move-out. It does not.
-- Confirmed 2026-09-13: no separate damage/security sum is ever collected. The
-- column holds ADVANCE RENT - rent paid ahead of the period it covers. If the
-- tenant leaves without consuming it, it is not returned.
--
-- The consequence is that OD-04 needs no schema at all. Adding
-- `deposit_refunded_amount` / `deposit_forfeited_amount` columns, as the Phase 1
-- register anticipated, would have created machinery for a workflow that does
-- not exist. The right fix is to correct the column's MEANING so nobody builds
-- a refund screen against it later.
--
-- The column is NOT renamed. `deposit_amount` is read by
-- `backend/src/routes/admin.ts:314, :416, :512, :571, :581`,
-- `backend/src/routes/tenant.ts:52`, and by the frontend at
-- `frontend/src/lib/systemState.ts:57, :388` and
-- `frontend/src/views/TenantManagementView.vue:227, :415`. The frontend is
-- read-only for this work stream, so a rename would break it. A COMMENT carries
-- the correction into the data dictionary without touching a line of code.
--
-- OD-03 - RENT IS CHARGED WHOLE, NEVER PRORATED.
-- A tenant leaving on the 10th still owes the full month. Rent is not reduced to
-- the days occupied and nothing is handed back. Payment is collected in the last
-- days of the month for the month ahead, and late payment is not accepted.
--
-- DEFECT SURFACED BY THIS DECISION, recorded for Phase 3, NOT fixed here:
-- `backend/src/routes/admin.ts:571` defaults a missing deposit to
-- `current_price * 2` - the familiar "one month advance plus one month deposit"
-- arrangement. With no security deposit in this business, doubling the rent as a
-- default is not right. Correcting it changes money, so it belongs with the
-- billingService extraction and a look at the live rows, not in a comment.
--
-- Apply AFTER 001-008. Idempotent; safe to re-run. Comments only - no data or
-- structure is modified by this migration.
-- =============================================================================

BEGIN;

COMMENT ON COLUMN public.room_assignments.deposit_amount IS
  'ADVANCE RENT, not a refundable security deposit. Rent paid ahead of the '
  'period it covers. No separate damage or security deposit is collected by '
  'this business. Non-refundable: an unconsumed balance is not returned when '
  'the tenant leaves. Confirmed 2026-09-13 (OD-04). Do not build a refund or '
  'forfeiture workflow against this column. Historical note: the name is kept '
  'because backend and frontend both read it; only the meaning is corrected.';

COMMENT ON COLUMN public.bills.rent_amount IS
  'The WHOLE month rent. Never prorated. A tenant who vacates mid-period still '
  'owes the full amount and receives nothing back. Confirmed 2026-09-13 (OD-03).';

COMMENT ON COLUMN public.bills.billing_period_start IS
  'Start of the period billed. The period is always a whole month; a partial '
  'occupancy does not shorten it or reduce rent_amount (OD-03).';

COMMENT ON COLUMN public.bills.water_amount IS
  'Registered occupants x system_settings.water_rate_per_occupant (BR-002, '
  'BR-014). Linda units LF and LB are excluded from the per-occupant model and '
  'use their own fixed per-unit charges (BR-040). Currently hardcoded to '
  'occupants * 200 at backend/src/routes/admin.ts:910, :1103, :1243 - a known '
  'Phase 3 defect, not the intended design.';

COMMENT ON TABLE public.room_assignments IS
  'Tenancy of a room by a tenant. A tenant may hold an assignment without any '
  'portal login: profiles.email is nullable and credentials are optional '
  '(OD-09, migration 006).';

DO $$
BEGIN
  RAISE NOTICE 'Migration 009 OK: advance-rent and whole-month-billing '
               'semantics recorded. No data or structure changed.';
END $$;

COMMIT;

-- ######################################################################
-- ##  010_atomic_expense_allocations.sql
-- ######################################################################

-- =============================================================================
-- Migration 010 — Atomic Replacement of Expense Allocations
-- =============================================================================
-- @phase          Phase 2 / Phase 3 boundary
-- @defectRef      PHASE2_LOCKED_DECISIONS.md D-2; PHASE1 known defect 7
-- @businessRules  BR-041 (expense allocation), BR-047 (reconciliation)
--
-- `PATCH /api/admin/expense-entries/:id` replaces an entry's allocations by DELETEing them all and
-- then INSERTing the replacements (`backend/src/routes/admin.ts:1471-1477`). Those are two separate
-- PostgREST round trips with nothing joining them, because supabase-js has no transaction support -
-- which is why no `BEGIN`/`COMMIT` appears anywhere in `backend/src`.
--
-- That was survivable only while `property_area` was unconstrained free text. Migration `008` added a
-- foreign key, so a bad area now makes the INSERT fail - and the DELETE has already committed. The
-- entry silently loses every allocation it had.
--
-- A plpgsql function executes inside a single implicit transaction, so wrapping the pair here makes
-- the replacement atomic: if any row is rejected, the DELETE rolls back with it and the entry keeps
-- the allocations it started with.
--
-- Apply AFTER 008. Idempotent; safe to re-run.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.replace_expense_allocations(
  p_entry_id     UUID,
  p_allocations  JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  inserted_count INTEGER;
BEGIN
  IF p_entry_id IS NULL THEN
    RAISE EXCEPTION 'replace_expense_allocations: p_entry_id is required';
  END IF;

  IF jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION 'replace_expense_allocations: p_allocations must be a JSON array, got %',
      COALESCE(jsonb_typeof(p_allocations), 'null');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.monthly_expense_entries WHERE id = p_entry_id) THEN
    RAISE EXCEPTION 'replace_expense_allocations: no expense entry %', p_entry_id;
  END IF;

  -- Both statements share this function's transaction. A foreign key violation on the INSERT
  -- rolls the DELETE back with it, which is the entire point of this function.
  DELETE FROM public.expense_property_allocations
   WHERE expense_entry_id = p_entry_id;

  INSERT INTO public.expense_property_allocations (expense_entry_id, property_area, amount)
  SELECT p_entry_id,
         elem ->> 'property_area',
         (elem ->> 'amount')::NUMERIC
    FROM jsonb_array_elements(p_allocations) AS elem;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- Keep the entry's face value in step with the rows that make it up.
  UPDATE public.monthly_expense_entries
     SET total_expenses = COALESCE((
           SELECT SUM(amount) FROM public.expense_property_allocations
            WHERE expense_entry_id = p_entry_id), 0),
         updated_at = NOW()
   WHERE id = p_entry_id;

  RETURN inserted_count;
END
$fn$;

COMMENT ON FUNCTION public.replace_expense_allocations(UUID, JSONB) IS
  'Atomically replaces every allocation of an expense entry and recomputes its total_expenses. '
  'Exists because supabase-js cannot open a transaction, and a delete-then-insert across two '
  'round trips loses the allocations when the insert is rejected by the property_area foreign '
  'key. Callers should still normalise property_area to a canonical value first (see '
  'backend/src/config/propertyAreas.ts) so the rejection never happens.';

REVOKE ALL ON FUNCTION public.replace_expense_allocations(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_expense_allocations(UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.replace_expense_allocations(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_expense_allocations(UUID, JSONB) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'replace_expense_allocations'
  ) THEN
    RAISE EXCEPTION 'Migration 010 failed: function was not created.';
  END IF;
  RAISE NOTICE 'Migration 010 OK: replace_expense_allocations() created, execute granted to service_role only.';
END $$;

COMMIT;
