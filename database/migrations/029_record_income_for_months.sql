-- 029_record_income_for_months.sql
--
-- Records a receipt that covers several months as SEVERAL ROWS, one per month,
-- in a single transaction.
--
-- WHY
-- ---
-- Her book has no row holding several months of rent. A receipt settling arrears
-- appears as one row per month - OR#4895 across four rows, OR#4896 across three,
-- OR#4920 and OR#4952 across two - each carrying one month of rent and one month
-- of water. Confirmed against all 937 rows: every non-Linda row with water
-- records exactly `occupants x rate`, and none records a multiple of it.
--
-- The on-site form has a "months covered" field that produced ONE row with N
-- months of rent on it, and the server then wrote a single month of water beside
-- it. That shape exists nowhere in her ledger. Sean's instruction, 2026-09-19:
-- follow her way, and give the system a way to accommodate it.
--
-- WHY A DATABASE FUNCTION RATHER THAN A LOOP IN THE HANDLER
-- --------------------------------------------------------
-- supabase-js cannot open a transaction. Three migrations already exist for
-- exactly this reason - 010, 018 and 019 - and the standing rule in
-- CONTINUE_HERE is that any write touching more than one row follows them
-- rather than chaining awaits.
--
-- It matters more here than usual. A loop that inserts three months and fails on
-- the second leaves the owner having collected three months of rent with one
-- month in her books, and no error that says which. That is money going missing
-- from the ledger, which is the one outcome this project treats as unacceptable.
-- Either every month lands or none does.
--
-- WHAT IT DOES NOT DO
-- -------------------
-- It does NOT check for duplicates. The handler does that before calling, on
-- (room, invoice number, date paid, rent amount, year, month) - the six columns
-- that are unique across all 937 live rows - and returns a clean 409. That guard
-- stays in code deliberately; judgement log SS 3.6b sets out why a unique index
-- on a live financial table wants a real threat first, and this one does not
-- have one.
--
-- The garbage fee lands on the FIRST month only. BR-037: it is charged once per
-- year per unit, not on every monthly entry, so multiplying it by the months a
-- receipt covers would invent money she did not collect.
--
-- APPLIED 2026-09-19 by Claude, on Sean's instruction ("try it now yourself").
-- Read back from pg_proc afterwards with all thirteen arguments in place, and
-- the ledger unchanged at 937 rows - installing a function writes no data.
--
-- So `POST /api/admin/income-records` with monthsCovered > 1 now works. The 501
-- branch in the handler stays: it is what any environment without this migration
-- will answer, and saying which migration is missing is more useful than a 500.

BEGIN;

CREATE OR REPLACE FUNCTION record_income_for_months(
  p_room_id               uuid,
  p_tenant_profile_id     uuid,
  p_assignment_id         uuid,
  p_date_paid             date,
  p_contact_name          varchar,
  p_invoice_number        varchar,
  p_rent_amount           numeric,
  p_water_payment         numeric,
  p_gbg_fee               numeric,
  p_occupants             integer,
  p_payment_method        payment_method_type,
  p_transaction_reference varchar,
  p_periods               jsonb
)
RETURNS SETOF monthly_income_records
LANGUAGE plpgsql
AS $$
DECLARE
  period   jsonb;
  is_first boolean := true;
BEGIN
  IF p_periods IS NULL OR jsonb_array_length(p_periods) = 0 THEN
    RAISE EXCEPTION 'record_income_for_months: no periods supplied, so nothing would be recorded';
  END IF;

  FOR period IN SELECT * FROM jsonb_array_elements(p_periods)
  LOOP
    RETURN QUERY
    INSERT INTO monthly_income_records (
      room_id, tenant_profile_id, assignment_id,
      year, month, date_paid, contact_name, invoice_number,
      rent_amount, occupants, water_payment, gbg_fee,
      payment_method, transaction_reference,
      rent_period_start, rent_period_end, verification_status
    )
    VALUES (
      p_room_id, p_tenant_profile_id, p_assignment_id,
      (period->>'year')::int, (period->>'month')::int,
      p_date_paid, p_contact_name, p_invoice_number,
      p_rent_amount, p_occupants, p_water_payment,
      -- BR-037: once per unit, not once per month covered.
      CASE WHEN is_first THEN p_gbg_fee ELSE 0 END,
      p_payment_method, p_transaction_reference,
      (period->>'start')::date, (period->>'end')::date,
      'Verified'
    )
    RETURNING *;

    is_first := false;
  END LOOP;
END $$;

COMMENT ON FUNCTION record_income_for_months IS
  'Writes one monthly_income_records row per month a receipt covers, atomically. '
  'Her book records arrears as one row per month (OR#4895 across four), and a '
  'partial failure would mean cash collected and not recorded. The garbage fee '
  'goes on the first month only (BR-037). Duplicate checking stays in the '
  'handler - see judgement log 3.6b. Migration 029.';

DO $$
BEGIN
  RAISE NOTICE '029: record_income_for_months is installed';
END $$;

COMMIT;
