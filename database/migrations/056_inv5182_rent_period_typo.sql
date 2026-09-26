-- =============================================================================
-- 056 - INV#5182 (unit 3d, Alejandro Delarosa) was imported as 1 to 31 May;
--       her book says 15 May to 14 June
-- =============================================================================
-- NOT APPLIED by the author. Sean asked for it on 2026-09-26 ("do what you
-- recommend"), after the final review found it (docs/FINAL_REVIEW.md, B-72).
--
-- The owner's workbook, Monthly Income, May 2026:
--   3d | 29-May-26 | Alejandro Delarosa INV#5182 | May.15-un.14/26 | 8,500 | ... | 8,700 | Apr.15/26
-- "un" is a typo for "Jun". The import could not read the period, so the row
-- was stored as the whole of May. His receipts on either side, INV#5157
-- (15 Apr to 14 May) and INV#5204 (15 Jun to 14 Jul), and his anniversary
-- date (15 Apr) both say 15 May to 14 June.
--
-- What changes: rent_period_start and rent_period_end on that one row. The
-- money, the invoice number and the month it is filed under (May 2026, the
-- month the rent is for) stay as they are, so no total anywhere moves. What
-- it fixes: 1 to 14 June no longer reads as a gap in his record.
--
-- Guarded: it changes exactly one row, and only if the row is still exactly
-- as imported. Run twice, the second run changes nothing and says so.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  n_wrong integer;
  n_fixed integer;
BEGIN
  SELECT count(*) INTO n_wrong
  FROM monthly_income_records i JOIN rooms r ON r.id = i.room_id
  WHERE i.invoice_number = 'INV#5182' AND lower(trim(r.room_number)) = '3d'
    AND i.rent_period_start = DATE '2026-05-01' AND i.rent_period_end = DATE '2026-05-31';

  SELECT count(*) INTO n_fixed
  FROM monthly_income_records i JOIN rooms r ON r.id = i.room_id
  WHERE i.invoice_number = 'INV#5182' AND lower(trim(r.room_number)) = '3d'
    AND i.rent_period_start = DATE '2026-05-15' AND i.rent_period_end = DATE '2026-06-14';

  IF n_wrong = 0 AND n_fixed = 1 THEN
    RAISE NOTICE '056: INV#5182 already reads 15 May to 14 June. Nothing changed.';
    RETURN;
  END IF;

  IF n_wrong <> 1 THEN
    RAISE EXCEPTION '056 stopped, nothing changed: expected exactly one INV#5182 row for 3d dated 1 to 31 May 2026, found %. Send this message.', n_wrong;
  END IF;

  UPDATE monthly_income_records i
     SET rent_period_start = DATE '2026-05-15',
         rent_period_end   = DATE '2026-06-14'
    FROM rooms r
   WHERE r.id = i.room_id
     AND i.invoice_number = 'INV#5182' AND lower(trim(r.room_number)) = '3d'
     AND i.rent_period_start = DATE '2026-05-01' AND i.rent_period_end = DATE '2026-05-31';

  INSERT INTO audit_logs (action, entity_type, entity_id, new_values, ip_address)
  SELECT 'AUDIT_CORRECTION', 'INCOME_RECORD', i.id,
         jsonb_build_object(
           'note', 'INV#5182 rent period corrected from 1 to 31 May 2026 to 15 May to 14 June 2026. The workbook reads "May.15-un.14/26"; the import could not parse the typo.',
           'previous', jsonb_build_object('rent_period_start', '2026-05-01', 'rent_period_end', '2026-05-31'),
           'reference', 'migration 056, docs/FINAL_REVIEW.md B-72'),
         NULL
  FROM monthly_income_records i JOIN rooms r ON r.id = i.room_id
  WHERE i.invoice_number = 'INV#5182' AND lower(trim(r.room_number)) = '3d';
END $$;

COMMIT;

-- Check afterwards:
-- SELECT invoice_number, rent_period_start, rent_period_end, year, month
--   FROM monthly_income_records WHERE invoice_number = 'INV#5182';   -- 2026-05-15, 2026-06-14, 2026, 5
