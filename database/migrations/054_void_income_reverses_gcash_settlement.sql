-- =============================================================================
-- Migration 054 — Voiding a GCash settlement reverses it, in one transaction
-- =============================================================================
-- @businessRules  BR-013 (balances), BR-017 (verification), BR-048 (ledger authorship)
-- @review         docs/FINAL_REVIEW.md F2, BLOCKED_FOR_SEAN.md B-71
--
-- Schema only: adds one function. Touches no existing row when applied. Safe to
-- run on the live database. The backend works with or without it - until it is
-- applied, `DELETE /admin/income-records/:id` falls back to the plain void it
-- has always done.
--
-- WHAT THIS CLOSES
-- ----------------
-- Verifying a GCash payment writes three records in one transaction
-- (`settle_verified_payment`, migration 018): the payment is marked Verified,
-- its bill is marked Paid, and an income row is written. Voiding reversed only
-- the income row. So after a chargeback or refund - which the webhook tells the
-- owner to handle by voiding the payment - two readings of the same tenant
-- disagreed:
--
--   - `readStanding()` skips voided income rows, so the period read as owed;
--   - the payment still read Verified and the bill still read Paid, so
--     `outstandingOnBill()` found nothing to pay, and the checkout answered 409
--     "No unpaid bill could be resolved" (its new bill for the period collides
--     with the Paid one on `idx_one_bill_per_tenant_per_period`).
--
-- The reversed money could not be collected online, and the tenant's portal
-- said the bill was paid.
--
-- WHAT IT DOES
-- ------------
-- `void_income_record(p_income_id, p_voided_by, p_reason)`, in one transaction:
--
--   1. voids the income row (the same three columns the route always wrote);
--   2. ONLY when the row is a GCash settlement - `payment_method = 'Adyen
--      Online'` with a `transaction_reference` - marks the one Verified
--      `Adyen Online` payment carrying that pspReference as 'Rejected'.
--      Migration 040's unique index makes that payment exactly one row. Every
--      balance in the system counts Verified payments only, so this is what
--      stops the reversed money counting. `verified_by` and `verified_at` are
--      KEPT: who verified it is history, and the reversal is attributed in the
--      income row's `voided_by` and in the audit log;
--   3. re-derives that payment's bill from what is still Verified against it:
--      Paid when covered, Partially Paid when part is, Due when nothing is.
--      Overdue is derived on read (`isOverdue`), never stored.
--
-- WHY ON-SITE RECEIPTS ARE LEFT AS THEY ARE
-- -----------------------------------------
-- One on-site receipt covering several months writes one income row per month,
-- but its payment rows are spread across bills in aggregate by
-- `allocateReceipt()`, all under the same reference. Voiding one month of three
-- has no single right answer about which payment rows to reverse, so a void of
-- an on-site row voids the row and nothing else, exactly as before.
--
-- Idempotent: a row already voided is returned unchanged, with
-- `already_voided = true`, and nothing is written - so a retried request can
-- neither reverse twice nor overwrite who voided it.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.void_income_record(
  p_income_id UUID,
  p_voided_by UUID,
  p_reason    TEXT DEFAULT 'Administrator manual deletion'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  v_income      monthly_income_records%ROWTYPE;
  v_payment     payments%ROWTYPE;
  v_bill_total  NUMERIC;
  v_still_paid  NUMERIC;
  v_bill_status bill_status_type := NULL;
  v_payment_id  UUID := NULL;
BEGIN
  IF p_income_id IS NULL THEN
    RAISE EXCEPTION 'void_income_record: p_income_id is required';
  END IF;
  IF p_voided_by IS NULL THEN
    RAISE EXCEPTION 'void_income_record: p_voided_by is required (BR-048 - a human decides)';
  END IF;

  -- Locked for the life of the transaction, so two voids of one row cannot both
  -- pass the already-voided check below.
  SELECT * INTO v_income FROM monthly_income_records WHERE id = p_income_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'void_income_record: income record % not found', p_income_id;
  END IF;

  IF v_income.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('income_id', p_income_id, 'already_voided', TRUE,
                              'payment_id', NULL, 'bill_id', NULL, 'bill_status', NULL);
  END IF;

  -- 1. the ledger row
  UPDATE monthly_income_records
     SET voided_at   = NOW(),
         voided_by   = p_voided_by,
         void_reason = COALESCE(NULLIF(p_reason, ''), 'Administrator manual deletion')
   WHERE id = p_income_id;

  -- 2. the GCash payment it settled, if it is one
  IF v_income.payment_method = 'Adyen Online'::payment_method_type
     AND v_income.transaction_reference IS NOT NULL THEN

    SELECT * INTO v_payment
      FROM payments
     WHERE transaction_reference = v_income.transaction_reference
       AND payment_method = 'Adyen Online'::payment_method_type
       AND verification_status = 'Verified'::verification_status_type
     FOR UPDATE;

    IF FOUND THEN
      v_payment_id := v_payment.id;

      UPDATE payments
         SET verification_status = 'Rejected'::verification_status_type
       WHERE id = v_payment.id;

      -- 3. its bill, from what is still Verified against it
      IF v_payment.bill_id IS NOT NULL THEN
        SELECT total_amount INTO v_bill_total FROM bills WHERE id = v_payment.bill_id FOR UPDATE;

        SELECT COALESCE(SUM(amount), 0) INTO v_still_paid
          FROM payments
         WHERE bill_id = v_payment.bill_id
           AND verification_status = 'Verified'::verification_status_type;

        v_bill_status := CASE
          WHEN v_still_paid >= v_bill_total - 0.005 THEN 'Paid'::bill_status_type
          WHEN v_still_paid > 0                     THEN 'Partially Paid'::bill_status_type
          ELSE 'Due'::bill_status_type
        END;

        UPDATE bills SET status = v_bill_status, updated_at = NOW() WHERE id = v_payment.bill_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'income_id',      p_income_id,
    'already_voided', FALSE,
    'payment_id',     v_payment_id,
    'bill_id',        v_payment.bill_id,
    'bill_status',    v_bill_status
  );
END;
$fn$;

COMMENT ON FUNCTION public.void_income_record(UUID, UUID, TEXT) IS
  'Voids an income row. When the row is a GCash settlement it also marks that one Adyen Online '
  'payment Rejected and re-derives its bill (Paid / Partially Paid / Due) from what is still '
  'Verified, in the same transaction, so a reversed payment can be collected again. On-site rows '
  'are voided and nothing else. Idempotent. Migration 054, docs/FINAL_REVIEW.md F2.';

REVOKE ALL ON FUNCTION public.void_income_record(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.void_income_record(UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.void_income_record(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.void_income_record(UUID, UUID, TEXT) TO service_role;

DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'void_income_record'
  ) THEN
    RAISE EXCEPTION 'Migration 054 failed: void_income_record was not created.';
  END IF;

  IF has_function_privilege('anon', 'public.void_income_record(uuid,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Migration 054 failed: anon can execute void_income_record.';
  END IF;

  RAISE NOTICE 'Migration 054 OK: void_income_record() created, execute granted to service_role only.';
END
$verify$;

COMMIT;

-- PostgREST caches the schema; without this the API cannot see the new function
-- until the cache next refreshes.
NOTIFY pgrst, 'reload schema';
