-- 033 — the same receipt cannot be recorded twice for one unit in one month
--
-- Adds an index. Changes no data.
--
-- WHY
-- ---
-- `POST /admin/income-records` checks for a duplicate by SELECTing and then
-- INSERTing. Two requests that arrive together both pass the SELECT before
-- either INSERTs, so both are written. Proved against the live API on
-- 2026-09-19 by firing the same receipt simultaneously:
--
--     2 identical receipts at once  ->  {"201": 2}, 2 rows written
--     5 identical receipts at once  ->  {"201": 5}, 5 rows written
--
-- That is a double-click on "Record payment", or a retry after a timeout where
-- the first request actually succeeded. The result is one rent payment recorded
-- two or five times, inflating the owner's income by a figure nothing would
-- reconcile against.
--
-- No amount of application code fixes this. A read followed by a write is racy
-- by construction unless it holds a lock, and supabase-js cannot open a
-- transaction. The guarantee has to live where the rows do.
--
-- WHAT THE RULE IS
-- ----------------
-- One unit, one receipt number, one month, one row. That permits the case the
-- ledger genuinely contains - a receipt settling several months of arrears, like
-- OR#4895 covering Sep to Dec 2024 on four rows - because those differ by month.
-- It refuses the same month twice under the same number, which is only ever the
-- same payment recorded again.
--
-- `WHERE voided_at IS NULL`, so voiding a receipt entered wrongly and entering
-- it again is still possible. That is the ordinary correction and must not be
-- blocked by a row that no longer counts.
--
-- SAFE ON THE LIVE TABLE
-- ----------------------
-- Checked before writing this: **0** groups of (room_id, invoice_number, year,
-- month) among the 937 live rows hold more than one row. The index can be built
-- without touching anything.

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_receipt_per_unit_per_month
  ON public.monthly_income_records (room_id, invoice_number, year, month)
  WHERE voided_at IS NULL;

DO $$
DECLARE
  built boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'monthly_income_records'
       AND indexname = 'idx_one_receipt_per_unit_per_month'
  ) INTO built;

  IF NOT built THEN
    RAISE EXCEPTION '033: the index was not created. Rolled back.';
  END IF;

  RAISE NOTICE '033 OK: one receipt per unit per month is now enforced by the database.';
END $$;

-- To undo:
--   DROP INDEX IF EXISTS public.idx_one_receipt_per_unit_per_month;
