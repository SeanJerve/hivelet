/**
 * @file 20260807000001_payment_receipts.sql
 * @description Adds receipt-sent tracking to the two payment-record tables so the administrator can
 *              send a tenant an in-app payment confirmation receipt (System Bible Section 22:
 *              "Payment verified → financial records update"; admin capability requested 2026-08-07).
 * @rationale In-app receipt only (no PDF, per project decision) -- the receipt itself is just the
 *            existing verified record plus a timestamp marking that a confirmation notification was
 *            sent, and a notifications row (type='Receipt') the tenant can see. No new table needed.
 */

ALTER TABLE monthly_income_records ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMPTZ;

-- BR-048 keeps monthly_income_records admin-only at the table/RLS level ("Tenants and public
-- visitors have no access to these ledgers") -- that stays untouched. But the Tenant Portal's new
-- Payment Receipts card needs the tenant to see their OWN confirmed payment receipts (System Bible
-- Section 4: tenants "can view billing/payment status"). Resolved with a narrow SECURITY DEFINER
-- function instead of a blanket SELECT policy: it returns only receipt-relevant fields, only for
-- the caller's own rows, only once a receipt has actually been sent -- never the full ledger.
CREATE OR REPLACE FUNCTION get_my_income_receipts()
RETURNS TABLE (
    id UUID,
    amount NUMERIC,
    payment_method payment_method_type,
    reference VARCHAR,
    paid_on DATE,
    sent_at TIMESTAMPTZ
) AS $$
    SELECT id, remitted_amount, payment_method, invoice_number, date_paid, receipt_sent_at
    FROM monthly_income_records
    WHERE tenant_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      AND receipt_sent_at IS NOT NULL
    ORDER BY receipt_sent_at DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_my_income_receipts() TO authenticated;
