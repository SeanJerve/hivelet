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
