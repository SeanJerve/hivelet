-- =============================================================================
-- 091 - two receipts whose rent period runs eleven months for one month's rent
-- =============================================================================
-- APPLIED 6 Nov 2026 through the Supabase MCP after `npm run backup` (backups/2026-11-06T00-23-48); read back: both ends corrected, 0 rows over 40 days. Found in the figures audit of 6 Nov 2026 (Sean:
-- "make sure all the values and numbers ... are fully computed right ... If
-- you notice they are computing wrong, just like how we catch the errors they
-- made, use your better judgement and the right computation"). Same shape as
-- 056 (INV#5182) and 031: the money is right, the period's end date is not.
--
-- EVIDENCE (read-only, 6 Nov 2026). Every other income row on the ledger runs
-- 26 to 31 days; these two are the only rows over 40:
--
--   select r.room_number, m.year, m.month, m.invoice_number,
--          m.rent_period_start, m.rent_period_end, m.rent_amount
--     from monthly_income_records m join rooms r on r.id = m.room_id
--    where m.voided_at is null and m.rent_period_end - m.rent_period_start > 40;
--
--   2d   2024-09  INV#4783                 2024-09-27 to 2025-08-26   8,500.00
--   F2B  2024-04  Acknowledgement receipt  2024-04-15 to 2025-03-14  10,000.00
--
-- Each is one month's rent (2d's rate was 8,500, F2B's 10,000) filed under one
-- month, and the receipt after it in the same unit starts the next month:
--
--   2d  (Juchel Bernales, the 27th):  INV#4764 2024-08-27 to 2024-09-26,
--       [INV#4783 2024-09-27 to ...], INV#4817 2024-10-27 to 2024-11-26
--   F2B (Alfred John Laurinaria, the 15th): 2024-03-15 to 2024-04-14,
--       [2024-04-15 to ...], 2024-05-15 to 2024-06-14
--
-- So the ends are 2024-10-26 and 2024-05-14, `end = start + 1 month - 1 day`,
-- the rule the rest of each tenancy keeps. As stored, 2d's row overlaps ten of
-- the unit's later receipts and F2B's nine; Monthly Income prints the period
-- without its years ("Sep 27 - Aug 26", "Apr 15 - Mar 14"), and F2B's tenant,
-- who still lives there, reads "Apr 15, 2024 to Mar 14, 2025" on his own
-- Payment record for one month's payment.
--
-- BEFORE -> AFTER (rent_period_end only):
--   635e7d7e-bb31-4b48-8434-1413e56c8881  2d   2025-08-26 -> 2024-10-26
--   f89aec1f-23b3-4058-888a-f75d0454b649  F2B  2025-03-14 -> 2024-05-14
--
-- What does NOT change: the money, the receipt number, the start date, the
-- month each is filed under, so no total on any screen or sheet moves. No
-- tenant's standing moves either: F2B's tenant has receipts into 2026, so his
-- latest period end is not this one, and 2d's row names no tenant profile.
--
-- SAFETY: one DO block, each row addressed by id AND its current values. If
-- either row is not exactly as above it changes nothing; run twice, the second
-- run finds both corrected and says so.
--
-- Run `npm run backup` first, then paste this file into the Supabase SQL editor.
--
-- AFTER: returns 0 rows.
--   select id from monthly_income_records
--    where voided_at is null and rent_period_end - rent_period_start > 40;
-- And these two read 2024-10-26 and 2024-05-14:
--   select id, rent_period_end from monthly_income_records
--    where id in ('635e7d7e-bb31-4b48-8434-1413e56c8881', 'f89aec1f-23b3-4058-888a-f75d0454b649');
-- =============================================================================

BEGIN;

DO $$
DECLARE
  id_2d  constant uuid := '635e7d7e-bb31-4b48-8434-1413e56c8881';
  id_f2b constant uuid := 'f89aec1f-23b3-4058-888a-f75d0454b649';
  n_wrong integer;
  n_fixed integer;
BEGIN
  SELECT count(*) INTO n_fixed FROM monthly_income_records
   WHERE (id = id_2d  AND rent_period_start = DATE '2024-09-27' AND rent_period_end = DATE '2024-10-26')
      OR (id = id_f2b AND rent_period_start = DATE '2024-04-15' AND rent_period_end = DATE '2024-05-14');
  IF n_fixed = 2 THEN
    RAISE NOTICE '091: both periods already read one month. Nothing changed.';
    RETURN;
  END IF;

  SELECT count(*) INTO n_wrong
    FROM monthly_income_records m JOIN rooms r ON r.id = m.room_id
   WHERE m.voided_at IS NULL
     AND ((m.id = id_2d AND lower(r.room_number) = '2d' AND m.year = 2024 AND m.month = 9
           AND m.invoice_number = 'INV#4783' AND m.rent_amount = 8500
           AND m.rent_period_start = DATE '2024-09-27' AND m.rent_period_end = DATE '2025-08-26')
       OR (m.id = id_f2b AND lower(r.room_number) = 'f2b' AND m.year = 2024 AND m.month = 4
           AND m.rent_amount = 10000
           AND m.rent_period_start = DATE '2024-04-15' AND m.rent_period_end = DATE '2025-03-14'));
  IF n_wrong <> 2 THEN
    RAISE EXCEPTION '091 stopped, nothing changed: expected the two rows exactly as recorded on 6 Nov 2026, found % of 2. Send this message.', n_wrong;
  END IF;

  UPDATE monthly_income_records SET rent_period_end = DATE '2024-10-26'
   WHERE id = id_2d AND rent_period_end = DATE '2025-08-26';
  UPDATE monthly_income_records SET rent_period_end = DATE '2024-05-14'
   WHERE id = id_f2b AND rent_period_end = DATE '2025-03-14';

  INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
  VALUES
    ('AUDIT_CORRECTION', 'INCOME_RECORD', id_2d,
     jsonb_build_object('rent_period_end', '2025-08-26'),
     jsonb_build_object('rent_period_end', '2024-10-26',
       'note', '2d INV#4783: one month''s rent (8,500) filed under September 2024 had a period ending 26 Aug 2025. The next receipt, INV#4817, starts 27 Oct 2024.',
       'reference', 'migration 091, figures audit 6 Nov 2026'),
     NULL),
    ('AUDIT_CORRECTION', 'INCOME_RECORD', id_f2b,
     jsonb_build_object('rent_period_end', '2025-03-14'),
     jsonb_build_object('rent_period_end', '2024-05-14',
       'note', 'F2B: one month''s rent (10,000) filed under April 2024 had a period ending 14 Mar 2025. The next receipt starts 15 May 2024.',
       'reference', 'migration 091, figures audit 6 Nov 2026'),
     NULL);
END $$;

COMMIT;
