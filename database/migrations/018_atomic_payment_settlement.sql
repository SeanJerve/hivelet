-- =============================================================================
-- Migration 018 — Atomic Payment Settlement
-- =============================================================================
-- @phase          Phase 3
-- @businessRules  BR-017 (administrator verification), BR-038 (remitted amount)
-- @requirements   FR-016 (payment verification)
--
-- WHAT THIS CLOSES
-- ----------------
-- `PATCH /api/admin/payments/:paymentId/verify` performs three writes that must
-- either all happen or none happen:
--
--   1. UPDATE payments  SET verification_status = 'Verified', verified_by, verified_at
--   2. UPDATE bills     SET status = 'Paid'
--   3. INSERT INTO monthly_income_records  (the ledger row)
--
-- They are three separate PostgREST round trips with nothing joining them,
-- because supabase-js cannot open a transaction - which is why no BEGIN/COMMIT
-- appears anywhere in `backend/src`. If step 3 fails after 1 and 2 have
-- committed, the payment reads Verified, the bill reads Paid, and **no income
-- was ever recorded**. Money collected, debt closed, ledger blank - and nothing
-- on screen to say so.
--
-- Step 3 can fail for ordinary reasons. `invoice_number` and `contact_name` are
-- NOT NULL; `payment_method` is an enum; `rent_amount` carries a CHECK. Any one
-- of those rejects the row after the bill has already been marked Paid.
--
-- A plpgsql function body executes inside a single implicit transaction, so all
-- three writes here commit together or roll back together. This is the same
-- remedy migration 010 applied to expense allocations, for the same reason.
--
-- A SECOND CORRECTION, WHILE WE ARE HERE
-- --------------------------------------
-- The route hardcoded `payment_method: 'GCash'` on the ledger row. The payments
-- table records four methods - Cash, GCash, Bank Transfer, Adyen Online - so an
-- Adyen Online settlement was being written into the income ledger as GCash. The
-- method now travels with the row and is validated against the enum.
--
-- Idempotent by design: a payment already marked Verified is returned unchanged
-- and writes nothing, so a retry cannot double-post a ledger row.
--
-- Apply AFTER 017. Safe to re-run.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.settle_verified_payment(
  p_payment_id  UUID,
  p_verified_by UUID,
  p_income      JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  v_payment       payments%ROWTYPE;
  v_income_id     UUID := NULL;
  v_bill_updated  BOOLEAN := FALSE;
BEGIN
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'settle_verified_payment: p_payment_id is required';
  END IF;
  IF p_verified_by IS NULL THEN
    RAISE EXCEPTION 'settle_verified_payment: p_verified_by is required (BR-017 - a human decides)';
  END IF;

  -- Lock the row for the life of this transaction so two administrators pressing
  -- Verify at the same moment cannot both pass the already-verified check below.
  SELECT * INTO v_payment
    FROM payments
   WHERE id = p_payment_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'settle_verified_payment: payment % not found', p_payment_id;
  END IF;

  -- Idempotent. A retry returns the existing state and writes nothing, so the
  -- ledger cannot gain a second row for the same payment.
  IF v_payment.verification_status = 'Verified' THEN
    RETURN jsonb_build_object(
      'payment_id',   v_payment.id,
      'already_done', TRUE,
      'bill_updated', FALSE,
      'income_id',    NULL
    );
  END IF;

  -- 1. the payment itself
  UPDATE payments
     SET verification_status = 'Verified',
         verified_by         = p_verified_by,
         verified_at         = NOW()
   WHERE id = p_payment_id;

  -- 2. the debt it settles, if it is attached to one
  IF v_payment.bill_id IS NOT NULL THEN
    UPDATE bills
       SET status     = 'Paid',
           updated_at = NOW()
     WHERE id = v_payment.bill_id;
    v_bill_updated := TRUE;
  END IF;

  -- 3. the ledger row. NULL means the caller has decided one is not required
  --    (for example, a duplicate already exists for this reference).
  IF p_income IS NOT NULL THEN
    INSERT INTO monthly_income_records (
      room_id, tenant_profile_id, assignment_id,
      year, month, date_paid, contact_name, invoice_number,
      rent_period_start, rent_period_end,
      rent_amount, occupants, water_payment,
      payment_method, transaction_reference
    )
    VALUES (
      (p_income ->> 'room_id')::UUID,
      (p_income ->> 'tenant_profile_id')::UUID,
      NULLIF(p_income ->> 'assignment_id', '')::UUID,
      (p_income ->> 'year')::INTEGER,
      (p_income ->> 'month')::INTEGER,
      (p_income ->> 'date_paid')::DATE,
      p_income ->> 'contact_name',
      p_income ->> 'invoice_number',
      (p_income ->> 'rent_period_start')::DATE,
      (p_income ->> 'rent_period_end')::DATE,
      (p_income ->> 'rent_amount')::NUMERIC,
      (p_income ->> 'occupants')::INTEGER,
      (p_income ->> 'water_payment')::NUMERIC,
      -- The real method, not a hardcoded 'GCash'. Falls back to the payment's own
      -- method, and only then to Cash, which is what 937 of 937 historical rows are.
      COALESCE(
        NULLIF(p_income ->> 'payment_method', '')::payment_method_type,
        v_payment.payment_method,
        'Cash'::payment_method_type
      ),
      NULLIF(p_income ->> 'transaction_reference', '')
    )
    RETURNING id INTO v_income_id;
  END IF;

  RETURN jsonb_build_object(
    'payment_id',   p_payment_id,
    'already_done', FALSE,
    'bill_updated', v_bill_updated,
    'income_id',    v_income_id
  );
END;
$fn$;

COMMENT ON FUNCTION public.settle_verified_payment(UUID, UUID, JSONB) IS
  'Settles a verified payment atomically: marks the payment Verified, marks its bill Paid, and '
  'writes the monthly income row, all in one transaction. Exists because supabase-js cannot open '
  'a transaction, so the three writes were three round trips and a failure on the third left a '
  'bill marked Paid with nothing in the ledger. Idempotent by verification_status. BR-017 still '
  'applies: p_verified_by is required, because a human makes this decision.';

REVOKE ALL ON FUNCTION public.settle_verified_payment(UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_verified_payment(UUID, UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.settle_verified_payment(UUID, UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_verified_payment(UUID, UUID, JSONB) TO service_role;

DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'settle_verified_payment'
  ) THEN
    RAISE EXCEPTION 'Migration 018 failed: settle_verified_payment was not created.';
  END IF;

  IF has_function_privilege('anon', 'public.settle_verified_payment(uuid,uuid,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Migration 018 failed: anon can execute settle_verified_payment.';
  END IF;

  RAISE NOTICE 'Migration 018 OK: settle_verified_payment() created, execute granted to service_role only.';
END
$verify$;

COMMIT;
