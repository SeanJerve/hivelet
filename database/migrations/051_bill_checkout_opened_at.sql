-- =============================================================================
-- 051_bill_checkout_opened_at.sql — remember when a GCash checkout was opened
-- on a bill, so a second one cannot be opened while the first may be paid
-- =============================================================================
-- Approved by Sean 2026-09-24. Schema only: adds one nullable column, touches
-- no existing value. Safe to run on the live database.
--
-- WHY
-- ----------------------------------------------------------------------------
-- The 409 that stops a resident paying twice counts `Pending Verification`
-- payments, and only Adyen's webhook writes those. Between opening a checkout
-- and the webhook arriving there was nothing on record at all. When the
-- webhook is slow and the Drop-in reports anything but "completed", the
-- resident is told nothing was recorded, taps Pay again, gets a second
-- session - and both payments are recorded, under different pspReferences.
-- (2026-09-24 Adyen audit, reproduced with two back-to-back and two
-- concurrent checkouts on one bill.)
--
-- An in-memory marker would do on one long-running server, but the API is
-- planned for serverless hosting, where each request may be a different
-- instance. So the marker lives on the bill.
--
-- HOW IT IS USED (backend/src/routes/tenant.ts, POST /tenant/payments/checkout)
-- ----------------------------------------------------------------------------
-- One conditional UPDATE claims the bill: it sets this column to now() only
-- if it is NULL or older than 15 minutes, and a checkout that claims nothing
-- is refused with the same 409 shape. The claim is released if the Adyen
-- session cannot be created. An abandoned checkout therefore blocks that
-- bill for 15 minutes, never for good.
--
-- The code tolerates this column being absent (it logs and carries on
-- without the guard), so deploying the code before this migration is safe.
-- =============================================================================

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS checkout_opened_at timestamptz NULL;

COMMENT ON COLUMN bills.checkout_opened_at IS
  'When a GCash checkout session was last opened on this bill. A new one is refused for 15 minutes after, so a payment still in flight cannot be made twice. Migration 051.';

-- PostgREST caches the schema; without this the API cannot see the new column
-- until the cache next refreshes.
NOTIFY pgrst, 'reload schema';

-- Verify (read-only): expect one row, data_type 'timestamp with time zone', is_nullable 'YES'.
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--  WHERE table_name = 'bills' AND column_name = 'checkout_opened_at';
