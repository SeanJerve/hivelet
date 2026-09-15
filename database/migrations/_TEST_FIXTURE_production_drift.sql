-- =============================================================================
-- _TEST_FIXTURE_production_drift.sql — reproduce known production drift locally
-- =============================================================================
-- NOT A MIGRATION. Never apply this to Supabase. The leading underscore keeps it
-- out of the numbered sequence.
--
-- `database/FULL_DATABASE_SCHEMA.sql` does not describe the live database. SEVEN
-- differences are now known. The first two were found the hard way, each by a
-- migration failing in production after passing locally. The rest were found by
-- reading the live catalogue, which is the cheaper way and the one the second
-- addendum of VERIFICATION.md committed to.
--
--   1. `rooms_floor_check`   — a CHECK constraint capping rooms.floor at 3.
--                              Broke migration 007, SQLSTATE 23514.
--   2. `property_area_type`  — expense_property_allocations.property_area is a
--                              custom ENUM, not VARCHAR(100).
--                              Broke migration 008, SQLSTATE 42883.
--   3. ALL THIRTEEN ENUMS    — drift 2 was not a special case. The schema file
--                              contains ZERO `CREATE TYPE` statements, while
--                              production defines thirteen enum types used by
--                              eighteen columns. Every one of them is declared
--                              VARCHAR in the repository.
--   4. GENERATED columns     — monthly_income_records.fifty_percent_share and
--                              .remitted_amount are GENERATED ALWAYS AS (...)
--                              STORED, not plain DEFAULT 0.00 columns.
--                              Falsified defect #5 in the register.
--   5. The expense-total trigger — update_expense_entry_total() and
--                              trg_update_expense_total exist in production and
--                              NOWHERE in this repository. A database rebuilt
--                              from the repo has no triggers at all, so BR-045
--                              silently stops holding.
--   6. `current_user_role()` — exists in production, created out of band.
--                              Migration 002 only ever revokes it if present.
--   7. UNIQUE(expense_entry_id, property_area) — present in production, absent
--                              from the repository. It is the ONLY composite
--                              candidate key in the whole schema, it enforces
--                              BR-044, and the 2NF section of
--                              PHASE2_NORMALIZATION_PROOF.md is entirely about
--                              it. Found by an ON CONFLICT clause failing under
--                              behavioural test with 42P10.
--
-- Apply this file immediately after FULL_DATABASE_SCHEMA.sql + 001-004 when
-- building a test database, so the fixture resembles production rather than the
-- repository's stale idea of it. A migration that has not been run against this
-- has not really been tested.
--
-- When DRIFT_DIAGNOSTIC.sql is run against the live database, anything else it
-- turns up belongs in here too.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. rooms.floor capped at 3 (the pre-penthouse-correction state).
-- -----------------------------------------------------------------------------
DO $fixture$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'rooms' AND con.conname = 'rooms_floor_check'
  ) THEN
    ALTER TABLE public.rooms
      ADD CONSTRAINT rooms_floor_check CHECK (floor >= 1 AND floor <= 3);
  END IF;
END
$fixture$;

-- -----------------------------------------------------------------------------
-- 2. The thirteen enum types, with production's value ordering.
-- -----------------------------------------------------------------------------
DO $fixture$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('account_status_type',      ARRAY['active','inactive']),
      ('bill_status_type',         ARRAY['Pending','Due','Overdue','Paid','Partially Paid']),
      ('bill_type_enum',           ARRAY['Rent','Water','Combined','Other']),
      ('inquiry_status_type',      ARRAY['Pending','Contacted','Converted','Closed']),
      ('operational_status_type',  ARRAY['Available','Reserved','Occupied','Under Maintenance']),
      ('payment_method_type',      ARRAY['Cash','GCash','Bank Transfer','Adyen Online']),
      ('property_area_type',       ARRAY['Boarding House','Main House','Front Apartment','Back Apartment','Other Expenses / Personal']),
      ('room_type_enum',           ARRAY['Studio','One-bedroom','Two-bedroom','Three-bedroom']),
      ('ticket_priority_type',     ARRAY['Emergency','High','Medium','Low']),
      ('ticket_status_type',       ARRAY['Submitted','In Progress','Resolved','Closed']),
      ('user_role_type',           ARRAY['admin','tenant','prospect']),
      ('verification_status_type', ARRAY['Verified','Pending Verification','Rejected']),
      ('visibility_status_type',   ARRAY['Published','Hidden'])
    ) AS t(typname, vals)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_type ty JOIN pg_namespace n ON n.oid = ty.typnamespace
       WHERE n.nspname = 'public' AND ty.typname = r.typname
    ) THEN
      EXECUTE format('CREATE TYPE public.%I AS ENUM (%s)',
        r.typname,
        (SELECT string_agg(quote_literal(v), ', ') FROM unnest(r.vals) v));
      RAISE NOTICE 'fixture: created type %', r.typname;
    END IF;
  END LOOP;
END
$fixture$;

-- -----------------------------------------------------------------------------
-- 3. Convert the sixteen columns that hold enums at fixture time.
-- -----------------------------------------------------------------------------
-- Production holds eighteen enum columns today; two are deliberately absent
-- here because neither exists yet at fixture time. property_areas.code:
-- that table does not exist until migration 008 creates it, which already
-- reads the referencing column's real type rather than assuming one.
-- clusters.expense_area: added later still, by migration 012 - see
-- 012_penthouse_area_and_cluster_routing.sql:118.
--
-- Defaults have to be dropped before the type change and restored after. The
-- default expression is evaluated to text rather than string-parsed, so
-- 'Combined'::character varying is restored correctly as 'Combined'.
DO $fixture$
DECLARE
  r        record;
  v_def    text;
  v_lit    text;
  v_actual text;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('bills',                  'bill_type',           'bill_type_enum'),
      ('bills',                  'status',              'bill_status_type'),
      ('expense_property_allocations', 'property_area', 'property_area_type'),
      ('inquiries',              'status',              'inquiry_status_type'),
      ('maintenance_tickets',    'priority',            'ticket_priority_type'),
      ('maintenance_tickets',    'status',              'ticket_status_type'),
      ('monthly_income_records', 'payment_method',      'payment_method_type'),
      ('monthly_income_records', 'verification_status', 'verification_status_type'),
      ('notifications',          'priority',            'ticket_priority_type'),
      ('payments',               'payment_method',      'payment_method_type'),
      ('payments',               'verification_status', 'verification_status_type'),
      ('profiles',               'account_status',      'account_status_type'),
      ('profiles',               'role',                'user_role_type'),
      ('rooms',                  'operational_status',  'operational_status_type'),
      ('rooms',                  'room_type',           'room_type_enum'),
      ('rooms',                  'visibility_status',   'visibility_status_type')
    ) AS t(tbl, col, typ)
  LOOP
    SELECT format_type(a.atttypid, a.atttypmod), pg_get_expr(d.adbin, d.adrelid)
      INTO v_actual, v_def
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE n.nspname = 'public' AND c.relname = r.tbl AND a.attname = r.col
       AND a.attnum > 0 AND NOT a.attisdropped;

    IF v_actual IS NULL THEN
      RAISE NOTICE 'fixture: %.% not present, skipped', r.tbl, r.col;
      CONTINUE;
    END IF;

    IF v_actual = r.typ THEN
      CONTINUE;  -- already the enum
    END IF;

    v_lit := NULL;
    IF v_def IS NOT NULL THEN
      EXECUTE format('SELECT (%s)::text', v_def) INTO v_lit;
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.tbl, r.col);
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE public.%I USING %I::text::public.%I',
      r.tbl, r.col, r.typ, r.col, r.typ);

    IF v_lit IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %L::public.%I',
        r.tbl, r.col, v_lit, r.typ);
    END IF;

    RAISE NOTICE 'fixture: %.% % -> %', r.tbl, r.col, v_actual, r.typ;
  END LOOP;
END
$fixture$;

-- -----------------------------------------------------------------------------
-- 4. fifty_percent_share and remitted_amount are GENERATED, not plain columns.
-- -----------------------------------------------------------------------------
-- A plain column cannot be converted in place, so they are dropped and re-added.
-- Safe here: this file is only ever applied to a throwaway test database,
-- immediately after the schema is built and before any data is loaded.
DO $fixture$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
     WHERE c.relname = 'monthly_income_records' AND a.attname = 'fifty_percent_share'
       AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated <> 's'
  ) THEN
    ALTER TABLE public.monthly_income_records DROP COLUMN fifty_percent_share;
    ALTER TABLE public.monthly_income_records
      ADD COLUMN fifty_percent_share NUMERIC(10,2)
      GENERATED ALWAYS AS (rent_amount / 2.0) STORED;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
     WHERE c.relname = 'monthly_income_records' AND a.attname = 'remitted_amount'
       AND a.attnum > 0 AND NOT a.attisdropped AND a.attgenerated <> 's'
  ) THEN
    ALTER TABLE public.monthly_income_records DROP COLUMN remitted_amount;
    ALTER TABLE public.monthly_income_records
      ADD COLUMN remitted_amount NUMERIC(10,2)
      GENERATED ALWAYS AS (rent_amount + water_payment) STORED;
  END IF;
END
$fixture$;

-- -----------------------------------------------------------------------------
-- 5. The expense-total trigger, reproduced verbatim from production.
-- -----------------------------------------------------------------------------
-- This is what keeps BR-045 true, and it is the single most important object
-- missing from the repository: restore a database from FULL_DATABASE_SCHEMA.sql
-- and monthly_expense_entries.total_expenses stops tracking its allocations —
-- silently, with no error.
CREATE OR REPLACE FUNCTION public.update_expense_entry_total()
RETURNS trigger
LANGUAGE plpgsql
AS $trgfn$
BEGIN
    UPDATE monthly_expense_entries
    SET total_expenses = (
        SELECT COALESCE(SUM(amount), 0.00)
        FROM expense_property_allocations
        WHERE expense_entry_id = COALESCE(NEW.expense_entry_id, OLD.expense_entry_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.expense_entry_id, OLD.expense_entry_id);
    RETURN NEW;
END;
$trgfn$;

DROP TRIGGER IF EXISTS trg_update_expense_total ON public.expense_property_allocations;
CREATE TRIGGER trg_update_expense_total
AFTER INSERT OR DELETE OR UPDATE ON public.expense_property_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_expense_entry_total();

-- -----------------------------------------------------------------------------
-- 6. current_user_role(), reproduced verbatim from production.
-- -----------------------------------------------------------------------------
-- Note what it does when no profile matches: it returns 'admin'. Nothing uses it
-- today — there are zero RLS policies — but it is a SECURITY DEFINER function
-- that FAILS OPEN, which is why migration 011 revokes it from PUBLIC rather than
-- leaving it callable over PostgREST.
--
-- It references auth.uid(). plpgsql resolves that at call time, not creation
-- time, so this creates cleanly on a stock PostgreSQL with no auth schema.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_type
LANGUAGE plpgsql
SECURITY DEFINER
AS $curfn$
DECLARE
    u_role user_role_type;
BEGIN
    SELECT role INTO u_role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
    IF u_role IS NULL THEN
        -- Default to 'admin' in local development environment
        RETURN 'admin'::user_role_type;
    END IF;
    RETURN u_role;
END;
$curfn$;

-- -----------------------------------------------------------------------------
-- 7. UNIQUE (expense_entry_id, property_area) on the allocations.
-- -----------------------------------------------------------------------------
-- BR-044: one expense entry charges a given Property Area at most once. This is
-- the only composite candidate key in the schema and the entire subject of the
-- 2NF proof. Production has it; the repository does not.
DO $fixture$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.expense_property_allocations'::regclass
       AND contype = 'u'
  ) THEN
    ALTER TABLE public.expense_property_allocations
      ADD CONSTRAINT expense_property_allocations_expense_entry_id_property_area_key
      UNIQUE (expense_entry_id, property_area);
    RAISE NOTICE 'fixture: added UNIQUE(expense_entry_id, property_area)';
  END IF;
END
$fixture$;

DO $fixture$
BEGIN
  RAISE NOTICE 'Test fixture applied: floor check, 13 enums, 16 column conversions,';
  RAISE NOTICE '  2 generated columns, the expense-total trigger, current_user_role(),';
  RAISE NOTICE '  and the allocations composite unique key.';
END
$fixture$;

COMMIT;
