-- 032 — every imported `date_paid` is one day earlier than the owner wrote
--
-- Run `npm run backup` first. It rewrites 934 of the 937 rows of the live income
-- ledger. No amount is touched: the ledger totals PHP 8,086,250.00 before and
-- after, and the migration refuses to commit if it does not.
--
-- HOW THIS WAS FOUND
-- ------------------
-- The owner's original spreadsheet is in the repository:
--
--   INCOME AND EXPENSES PAST RECORDS/Michelles-BH-Report-Income-and-Expenses-...xlsx
--
-- Every row of `monthly_income_records` was created in a single import on
-- 2026-08-28 - one batch, nothing entered through the application since - so the
-- spreadsheet is the source for all 937 rows and can be compared against them.
--
-- Matching on (unit, rent amount) rather than receipt number, because the receipt
-- column has four spellings (OR#, INVOICE#, INV#, INV.#) and 311 rows carry no
-- number at all:
--
--     spreadsheet rows read          931
--     matched to a ledger row        929
--     ledger date EXACTLY one day early  929
--     ledger date matching the sheet       0
--     any other offset                     0
--
-- Not one row in the ledger carries the date she wrote. Every single one is a day
-- early, across 2024, 2025 and 2026 alike.
--
-- The cause is in the import, not in her book: the Excel cells hold exact UTC
-- midnight (checked - `2024-01-27T00:00:00.000Z`, no offset applied), so the
-- importer read each date as local midnight and formatted it in a zone behind
-- UTC, losing a day. It is the same defect `frontend/src/lib/propertyDate.ts` and
-- `backend/src/utils/propertyClock.ts` were written to prevent, one layer earlier
-- than either of them guards.
--
-- `rent_period_start` and `rent_period_end` are NOT affected and are not touched.
-- Those were parsed from text ("Jun.29-Jul.28/24") and are correct.
--
-- THE SIX ROWS THAT ARE A DIFFERENT PROBLEM
-- -----------------------------------------
-- Exactly six money rows in the sheet have a Date Paid cell Excel never stored as
-- a date, because of a typo. The importer defaulted all six to the 1st of the
-- month. They were never shifted, so they must be SET, not moved - and what she
-- meant is still legible in every case but the last:
--
--     sheet         unit   cell            imported as   she wrote
--     r207          B2F    "31-Maay-24"    2024-05-01    2024-05-31
--     r208          B2B    "21-Maay-24"    2024-05-01    2024-05-21
--     r216          F2F    "4-Maay-24"     2024-05-01    2024-05-04
--     r1223         3e     "13--Mar-26"    2026-03-01    2026-03-13
--     r1286         F2B    "30--Apr-26"    2026-04-01    2026-04-30
--     r1424         F1     (blank)         2026-07-01    nothing
--
-- "Maay" for May, and a doubled hyphen twice. The last one is genuinely blank in
-- her sheet - she never recorded a date for it - so it is LEFT ALONE at the
-- invented 2026-07-01 rather than moved to a second invented value. It is pinned
-- in check:ledger instead, for her to fill in.
--
-- TWO ROWS ALREADY CORRECTED, AND DELIBERATELY EXCLUDED
-- ----------------------------------------------------
--   OR#4839       migration 030 set it to 2024-12-17 from the receipt book. The
--                 sheet cell holds the bare number 17, which is Excel's serial
--                 for 17 January 1900 - the DAY she wrote, with the month and
--                 year lost. In her sheet's own frame that is the 17th, and after
--                 this migration the ledger reads her frame, so 2024-12-17 is
--                 already right. Its neighbours become 2024-12-15 and 2024-12-19,
--                 and it still sits between them.
--   INVOICE#5120  migration 030 set it to 2026-02-26. The sheet holds the typo
--                 2027-02-26 - day and month right, year wrong - so her frame
--                 says 2026-02-26, which is what it already reads.
--
-- 937 rows, less these 8, is 929 - exactly the number that matched the sheet.

BEGIN;

CREATE TABLE IF NOT EXISTS date_paid_import_backup_032 (
  id             uuid PRIMARY KEY,
  invoice_number text,
  old_date_paid  date,
  new_date_paid  date,
  how            text,
  corrected_at   timestamptz NOT NULL DEFAULT now()
);

-- Everything except the eight named rows: one day forward.
INSERT INTO date_paid_import_backup_032 (id, invoice_number, old_date_paid, new_date_paid, how)
SELECT id, invoice_number, date_paid, date_paid + 1, 'shifted +1 day (import timezone)'
FROM monthly_income_records
WHERE invoice_number NOT IN (
  'OR#4839', 'INVOICE#5120',
  'N/A-B2F-5-2024', 'N/A-B2B-5-2024', 'N/A-F2F-5-2024',
  'INV.#5134', 'N/A-F2B-4-2026', 'N/A-F1-7-2026'
)
ON CONFLICT (id) DO NOTHING;

-- The five whose cell was text, set to what she wrote.
INSERT INTO date_paid_import_backup_032 (id, invoice_number, old_date_paid, new_date_paid, how)
SELECT m.id, m.invoice_number, m.date_paid, v.d, 'set from an unparseable text cell'
FROM monthly_income_records m
JOIN (VALUES
  ('N/A-B2F-5-2024', DATE '2024-05-31'),
  ('N/A-B2B-5-2024', DATE '2024-05-21'),
  ('N/A-F2F-5-2024', DATE '2024-05-04'),
  ('INV.#5134',      DATE '2026-03-13'),
  ('N/A-F2B-4-2026', DATE '2026-04-30')
) AS v(inv, d) ON v.inv = m.invoice_number
ON CONFLICT (id) DO NOTHING;

UPDATE monthly_income_records
SET date_paid = date_paid + 1, updated_at = now()
WHERE invoice_number NOT IN (
  'OR#4839', 'INVOICE#5120',
  'N/A-B2F-5-2024', 'N/A-B2B-5-2024', 'N/A-F2F-5-2024',
  'INV.#5134', 'N/A-F2B-4-2026', 'N/A-F1-7-2026'
);

UPDATE monthly_income_records m
SET date_paid = v.d, updated_at = now()
FROM (VALUES
  ('N/A-B2F-5-2024', DATE '2024-05-31'),
  ('N/A-B2B-5-2024', DATE '2024-05-21'),
  ('N/A-F2F-5-2024', DATE '2024-05-04'),
  ('INV.#5134',      DATE '2026-03-13'),
  ('N/A-F2B-4-2026', DATE '2026-04-30')
) AS v(inv, d)
WHERE m.invoice_number = v.inv;

DO $$
DECLARE
  shifted  integer;
  setfrom  integer;
  remitted numeric;
  future   integer;
  ancient  integer;
BEGIN
  SELECT count(*) INTO shifted FROM date_paid_import_backup_032
   WHERE how = 'shifted +1 day (import timezone)';
  IF shifted <> 929 THEN
    RAISE EXCEPTION '032: expected to shift 929 rows, recorded %. Rolled back.', shifted;
  END IF;

  SELECT count(*) INTO setfrom FROM date_paid_import_backup_032
   WHERE how = 'set from an unparseable text cell';
  IF setfrom <> 5 THEN
    RAISE EXCEPTION '032: expected to set 5 text-cell rows, recorded %. Rolled back.', setfrom;
  END IF;

  -- It moves dates, never money.
  SELECT round(sum(coalesce(remitted_amount, 0))::numeric, 2) INTO remitted
  FROM monthly_income_records;
  IF remitted <> 8086250.00 THEN
    RAISE EXCEPTION '032: remitted total changed to % - it must stay 8086250.00. Rolled back.', remitted;
  END IF;

  SELECT count(*) INTO future FROM monthly_income_records WHERE date_paid > CURRENT_DATE;
  IF future <> 0 THEN
    RAISE EXCEPTION '032: % payment date(s) now lie in the future. Rolled back.', future;
  END IF;

  SELECT count(*) INTO ancient FROM monthly_income_records WHERE date_paid < DATE '2023-12-01';
  IF ancient <> 0 THEN
    RAISE EXCEPTION '032: % payment date(s) now fall before the ledger starts. Rolled back.', ancient;
  END IF;

  RAISE NOTICE '032 OK: 929 dates shifted a day forward, 5 set from text cells, total unchanged.';
END $$;

COMMIT;

-- To undo:
--   UPDATE monthly_income_records m
--   SET date_paid = b.old_date_paid
--   FROM date_paid_import_backup_032 b
--   WHERE b.id = m.id;
