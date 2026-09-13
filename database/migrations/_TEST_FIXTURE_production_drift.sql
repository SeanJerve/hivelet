-- =============================================================================
-- _TEST_FIXTURE_production_drift.sql — reproduce known production drift locally
-- =============================================================================
-- NOT A MIGRATION. Never apply this to Supabase. The leading underscore keeps it
-- out of the numbered sequence.
--
-- `database/FULL_DATABASE_SCHEMA.sql` does not describe the live database. Two
-- differences have been found the hard way, each by a migration failing in
-- production after passing locally:
--
--   1. `rooms_floor_check`     — a CHECK constraint capping rooms.floor at 3.
--                                Broke migration 007 with SQLSTATE 23514.
--   2. `property_area_type`    — expense_property_allocations.property_area is a
--                                custom ENUM, not VARCHAR(100).
--                                Broke migration 008 with SQLSTATE 42883.
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

-- 1. rooms.floor capped at 3 (the pre-penthouse-correction state).
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

-- 2. property_area as an ENUM rather than VARCHAR(100).
DO $fixture$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_area_type') THEN
    CREATE TYPE public.property_area_type AS ENUM (
      'Boarding House',
      'Main House',
      'Front Apartment',
      'Back Apartment',
      'Other Expenses / Personal'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
     WHERE c.relname = 'expense_property_allocations'
       AND a.attname = 'property_area'
       AND format_type(a.atttypid, a.atttypmod) <> 'property_area_type'
       AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    ALTER TABLE public.expense_property_allocations
      ALTER COLUMN property_area TYPE public.property_area_type
      USING property_area::text::public.property_area_type;
  END IF;
END
$fixture$;

DO $fixture$
BEGIN
  RAISE NOTICE 'Test fixture applied: rooms_floor_check (1-3) and property_area_type enum.';
END
$fixture$;

COMMIT;
