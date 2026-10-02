-- =============================================================================
-- 077 - the evaluation account's bills agree with its ledger again
-- =============================================================================
-- Found 2026-10-02 evening (Sean's screenshot): loydtest (B-92, the account the
-- technical evaluators use, in PH since 075) sees "Not entered yet P30,400.00"
-- on Payments and billing, and Pay with GCash answers "No unpaid bill could be
-- resolved for your account, so there is nothing to pay."
--
-- The two halves read different tables. The page reads the LEDGER
-- (monthly_income_records: no live receipt for the period, so it is owed). The
-- checkout reads BILLS: it found a bill whose Verified payments already cover
-- it. That is what testing-day receipts leave behind once they are voided or
-- deleted: voiding an on-site receipt leaves its payment Verified and its bill
-- as it was, by design (admin.ts, DELETE /admin/income-records; 054 reverses
-- only Adyen Online payments).
--
-- WHAT THIS DOES, FOR loydtest ONLY (no other account is touched):
--   1. A Verified payment on one of loydtest's bills whose period has NO live
--      ledger receipt (Verified, not voided, rent period overlapping the bill's)
--      is marked Rejected - the same thing 054 does when a GCash receipt is
--      voided. The ledger is the owner's record and wins.
--   2. Every loydtest bill's status is re-derived from what is still Verified
--      against it (054's rule): Paid / Partially Paid / Due. Only rows whose
--      status actually changes are written.
--   3. One AUDIT_CORRECTION row keeps the before-values of everything changed.
-- Nothing is deleted. If nothing matches, nothing changes and it says so.
-- All money on this account is the evaluation's test money (Adyen's test
-- account, or rehearsal receipts).
--
-- RUN FIRST (read-only), and again afterwards:
--   WITH me AS (SELECT id FROM profiles WHERE full_name = 'loydtest' AND role = 'tenant')
--   SELECT 'bill' AS kind, b.id, b.billing_period_start::text AS period_from,
--          b.billing_period_end::text AS period_to, b.total_amount AS amount, b.status::text AS status,
--          (SELECT COALESCE(SUM(p.amount),0) FROM payments p
--            WHERE p.bill_id = b.id AND p.verification_status = 'Verified') AS verified_paid
--     FROM bills b, me WHERE b.tenant_profile_id = me.id
--   UNION ALL
--   SELECT 'payment', p.id, p.bill_id::text, p.payment_method::text, p.amount,
--          p.verification_status::text, NULL
--     FROM payments p, me WHERE p.tenant_profile_id = me.id
--   UNION ALL
--   SELECT 'receipt', i.id, i.rent_period_start::text, i.rent_period_end::text, i.rent_amount,
--          CASE WHEN i.voided_at IS NULL THEN i.verification_status::text ELSE 'VOIDED' END, NULL
--     FROM monthly_income_records i, me WHERE i.tenant_profile_id = me.id
--   ORDER BY 1, 3;
--
-- Expected afterwards: no bill whose status is not Paid has verified_paid >=
-- amount, and every Verified payment's bill period has a live receipt. Then
-- signed in as loydtest, Pay with GCash opens the Drop-in for the owed period.
-- =============================================================================
DO $$
DECLARE
  p_id uuid;
  rejected jsonb;
  rederived jsonb;
  n_rejected int;
  n_rederived int;
BEGIN
  SELECT id INTO p_id FROM profiles WHERE full_name = 'loydtest' AND role = 'tenant';
  IF p_id IS NULL THEN
    RAISE EXCEPTION '077: no tenant named loydtest. Nothing changed.';
  END IF;

  -- 1. Verified payments on loydtest's bills with no live receipt for the period.
  WITH orphaned AS (
    SELECT p.id, p.bill_id, p.amount, p.payment_method, p.transaction_reference,
           b.billing_period_start, b.billing_period_end
      FROM payments p
      JOIN bills b ON b.id = p.bill_id
     WHERE b.tenant_profile_id = p_id
       AND p.verification_status = 'Verified'::verification_status_type
       AND NOT EXISTS (
             SELECT 1 FROM monthly_income_records i
              WHERE i.tenant_profile_id = p_id
                AND i.voided_at IS NULL
                AND i.verification_status = 'Verified'
                AND i.rent_period_start <= b.billing_period_end
                AND i.rent_period_end   >= b.billing_period_start)
  ), done AS (
    UPDATE payments p
       SET verification_status = 'Rejected'::verification_status_type
      FROM orphaned o
     WHERE p.id = o.id
    RETURNING o.*
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(done)), '[]'::jsonb), COUNT(*) INTO rejected, n_rejected FROM done;

  -- 2. Every loydtest bill's status from what is still Verified against it.
  WITH derived AS (
    SELECT b.id, b.status AS old_status, b.total_amount,
           CASE
             WHEN COALESCE(SUM(p.amount), 0) >= b.total_amount - 0.005 THEN 'Paid'::bill_status_type
             WHEN COALESCE(SUM(p.amount), 0) > 0                       THEN 'Partially Paid'::bill_status_type
             ELSE 'Due'::bill_status_type
           END AS new_status
      FROM bills b
      LEFT JOIN payments p
        ON p.bill_id = b.id AND p.verification_status = 'Verified'::verification_status_type
     WHERE b.tenant_profile_id = p_id
     GROUP BY b.id, b.status, b.total_amount
  ), done AS (
    UPDATE bills b
       SET status = d.new_status, updated_at = NOW()
      FROM derived d
     WHERE b.id = d.id AND b.status IS DISTINCT FROM d.new_status
    RETURNING b.id, d.old_status, d.new_status, d.total_amount
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(done)), '[]'::jsonb), COUNT(*) INTO rederived, n_rederived FROM done;

  IF n_rejected = 0 AND n_rederived = 0 THEN
    RAISE NOTICE '077: loydtest''s bills already agree with its ledger. Nothing changed.';
    RETURN;
  END IF;

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES ('AUDIT_CORRECTION', 'PROFILE', p_id,
          jsonb_build_object('payments_were_verified', rejected, 'bills', rederived),
          jsonb_build_object(
            'note', 'Evaluation account (B-92): Verified payments with no live ledger receipt for their '
                    || 'period marked Rejected, and bill statuses re-derived from what is still Verified, '
                    || 'so Pay with GCash agrees with Payments and billing.',
            'payments_rejected', n_rejected, 'bills_restatused', n_rederived,
            'reference', 'migration 077, 2026-10-02'),
          NULL);

  RAISE NOTICE '077: % payment(s) marked Rejected, % bill status(es) re-derived.', n_rejected, n_rederived;
END $$;
