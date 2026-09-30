-- =============================================================================
-- 072 - acknowledgement receipts: a kind of slip with no number
-- =============================================================================
-- Sean, 2026-10-01: for some units the landlady gives only an ACKNOWLEDGEMENT
-- RECEIPT, which has no number (the "--" cells in her sheets). The invoice field
-- now offers "Acknowledgement receipt" in its list, beside a typed INV# number,
-- and `normalizeInvoiceNumber` (backend and frontend twins) writes "ACKNOWL",
-- "ack", "Acknowledgment receipt" and the like as exactly
-- 'Acknowledgement receipt'.
--
-- WHAT THIS CHANGES
-- 1. The one existing slip written by hand ("ACKNOWL": F2F's PHP 8,800 cash
--    payment of 30 Sep, the only such row) is written the standard way. Its
--    old value is kept in the AUDIT_CORRECTION row below.
-- 2. idx_one_invoice_per_unit_per_month (room, invoice, year, month, live rows)
--    no longer covers acknowledgement receipts. Every acknowledgement receipt
--    carries the same words, so under the old index a second one for the same
--    unit and month (a balance paid later) would be refused as a "duplicate
--    invoice". A blank invoice was never covered either (NULLs never collide).
--    The application's exact-repeat guard (same unit, slip, date, amount,
--    month) still refuses a true double entry.
--
-- NOT CHANGED: the 317 payments with no invoice (the importer's "N/A-..."
-- placeholders, blanked by 066). They may be acknowledgement receipts, but that
-- is for the owner to confirm (CLIENT_MEETING_QUESTIONS.md); nothing is
-- inferred here.
--
-- SAFETY: one DO block, all or nothing. A second run finds nothing to rewrite
-- and recreates the index identically.
-- =============================================================================

DO $$
DECLARE
  prev jsonb;
  n integer;
BEGIN
  SELECT coalesce(jsonb_object_agg(id::text, invoice_number), '{}'::jsonb) INTO prev
    FROM monthly_income_records
   WHERE invoice_number ~* '^ack' AND invoice_number <> 'Acknowledgement receipt';

  UPDATE monthly_income_records
     SET invoice_number = 'Acknowledgement receipt'
   WHERE invoice_number ~* '^ack' AND invoice_number <> 'Acknowledgement receipt';
  GET DIAGNOSTICS n = ROW_COUNT;

  IF n > 0 THEN
    INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
    VALUES ('AUDIT_CORRECTION', 'INCOME_RECORD', '00000000-0000-0000-0000-000000000072',
            jsonb_build_object('invoice_number_by_record', prev),
            jsonb_build_object(
              'note', 'Acknowledgement receipts written one way, ''Acknowledgement receipt'': a slip with no number, which some units receive instead of an invoice. Old values are in previous_values.',
              'rewritten', n,
              'reference', 'migration 072, Sean 2026-10-01'),
            NULL);
  END IF;

  DROP INDEX IF EXISTS idx_one_invoice_per_unit_per_month;
  CREATE UNIQUE INDEX idx_one_invoice_per_unit_per_month
      ON monthly_income_records (room_id, invoice_number, year, month)
   WHERE voided_at IS NULL AND invoice_number IS DISTINCT FROM 'Acknowledgement receipt';

  RAISE NOTICE '072: % slip(s) rewritten; index recreated without acknowledgement receipts.', n;
END $$;
