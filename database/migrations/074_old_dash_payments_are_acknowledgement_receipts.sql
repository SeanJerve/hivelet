-- =============================================================================
-- 074 - the "--" payments in her sheets are acknowledgement receipts
-- =============================================================================
-- Sean, 2026-10-01, from the owner: "some of the payments have dash dash. That
-- means that that's acknowledgement receipts" - a slip with no number.
--
-- The importer turned each "--" into an invented number "N/A-<unit>-<m>-<y>",
-- and 066 blanked those 317 to "no invoice". This writes them as what they are,
-- 'Acknowledgement receipt' (072's standard words).
--
-- NAMED BY RECORD, NOT BY PATTERN: exactly the rows whose value before 066 began
-- "N/A-", read from 066's own AUDIT_CORRECTION row (previous_values ->
-- invoice_number_by_record), and only if they are still blank. A payment
-- entered since without an invoice is not touched.
--
-- Applied with migration 072 already in place, so the one-invoice-per-unit-per-
-- month index does not cover these rows.
-- =============================================================================

DO $$
DECLARE
  old_map jsonb;
  ids uuid[];
  n integer;
BEGIN
  SELECT previous_values -> 'invoice_number_by_record' INTO old_map
    FROM audit_logs
   WHERE action = 'AUDIT_CORRECTION'
     AND new_values ->> 'reference' = 'migration 066, Sean 2026-09-30'
     AND previous_values ? 'invoice_number_by_record'
   LIMIT 1;
  IF old_map IS NULL THEN
    RAISE EXCEPTION '074: 066''s audit row with the old invoice numbers was not found. Nothing changed.';
  END IF;

  SELECT array_agg(key::uuid) INTO ids
    FROM jsonb_each_text(old_map)
   WHERE value LIKE 'N/A-%';

  UPDATE monthly_income_records
     SET invoice_number = 'Acknowledgement receipt'
   WHERE id = ANY(ids) AND invoice_number IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;

  IF n > 0 THEN
    INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
    VALUES ('AUDIT_CORRECTION', 'INCOME_RECORD', '00000000-0000-0000-0000-000000000074',
            jsonb_build_object('invoice_number', NULL, 'records', to_jsonb(ids)),
            jsonb_build_object(
              'note', 'The owner confirmed that "--" in her sheets means an acknowledgement receipt (a slip with no number). The payments the importer gave an invented N/A- number, blanked by 066, are written as ''Acknowledgement receipt''.',
              'rewritten', n,
              'reference', 'migration 074, Sean 2026-10-01'),
            NULL);
  END IF;
  RAISE NOTICE '074: % payment(s) labelled as acknowledgement receipts.', n;
END $$;
