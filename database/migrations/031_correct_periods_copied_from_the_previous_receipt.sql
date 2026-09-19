-- 031 — five rent periods that were copied from the previous receipt
--
-- Run `npm run backup` first. It rewrites 5 rows of the owner's live income
-- ledger. No amount is touched.
--
-- WHAT IS WRONG
-- -------------
-- Five rows carry a rent period belonging to the receipt before them. It shows up
-- two ways, and both are the same mistake — the period was not advanced:
--
--   THREE where only the END was copied, so the period ends the day before it
--   starts. `check:ledger` has flagged these since 2026-09-16:
--
--     1h  OR#4757  2024-08-03 to 2024-08-02   (-1 day)
--     2b  OR#4775  2024-08-30 to 2024-08-29   (-1 day)
--     1h  OR#4872  2025-02-03 to 2025-02-02   (-1 day)
--
--   Each of those end dates is EXACTLY the previous receipt's end date: 1h's
--   OR#4735 ends 2024-08-02, OR#4865 ends 2025-02-02, and 2b's OR#4748 ends
--   2024-08-29.
--
--   TWO where BOTH ends were copied, so two receipts claim one period. These are
--   the last two duplicate (unit, period) pairs left after migration 030:
--
--     3e  OR#4679         month=3,  paid 2024-04-05, period reads Feb 5 - Mar 4
--     PH  N/A-PH-10-2024  month=10, paid 2024-11-10, period reads Sep 28 - Oct 27
--
-- HOW THE CORRECT VALUES ARE KNOWN
-- --------------------------------
-- Each tenancy runs on a fixed anniversary and every other row of it is regular,
-- so the right period is not a guess — it is the one the cycle skips:
--
--   1h  anniversary the 3rd:  Jun 3-Jul 2, Jul 3-Aug 2, [Aug 3-Sep 2], Sep 3-Oct 2 ...
--   2b  anniversary the 30th: Jun 30-Jul 29, Jul 30-Aug 29, [Aug 30-Sep 29], Sep 30-Oct 29 ...
--   3e  anniversary the 5th:  Jan 5-Feb 4, Feb 5-Mar 4, [Mar 5-Apr 4]
--   PH  anniversary the 28th: Jul 28-Aug 27, Aug 28-Sep 27, Sep 28-Oct 27, [Oct 28-Nov 27]
--
-- The `month` column of each broken row already names the month in brackets, and
-- `date_paid` falls in or just after it. The rule every other row obeys is
-- `end = start + 1 month - 1 day`.
--
-- Rows are addressed by their receipt number, which is unique for all five, so
-- each statement can only touch the row it names.

BEGIN;

CREATE TABLE IF NOT EXISTS copied_period_backup_031 (
  id               uuid PRIMARY KEY,
  invoice_number   text,
  old_period_start date,
  old_period_end   date,
  new_period_start date,
  new_period_end   date,
  corrected_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO copied_period_backup_031
  (id, invoice_number, old_period_start, old_period_end, new_period_start, new_period_end)
SELECT m.id, m.invoice_number, m.rent_period_start, m.rent_period_end, v.new_start, v.new_end
FROM monthly_income_records m
JOIN (VALUES
  ('OR#4757',        DATE '2024-08-03', DATE '2024-09-02'),
  ('OR#4775',        DATE '2024-08-30', DATE '2024-09-29'),
  ('OR#4872',        DATE '2025-02-03', DATE '2025-03-02'),
  ('OR#4679',        DATE '2024-03-05', DATE '2024-04-04'),
  ('N/A-PH-10-2024', DATE '2024-10-28', DATE '2024-11-27')
) AS v(inv, new_start, new_end) ON v.inv = m.invoice_number
ON CONFLICT (id) DO NOTHING;

UPDATE monthly_income_records m
SET rent_period_start = v.new_start,
    rent_period_end   = v.new_end,
    updated_at        = now()
FROM (VALUES
  ('OR#4757',        DATE '2024-08-03', DATE '2024-09-02'),
  ('OR#4775',        DATE '2024-08-30', DATE '2024-09-29'),
  ('OR#4872',        DATE '2025-02-03', DATE '2025-03-02'),
  ('OR#4679',        DATE '2024-03-05', DATE '2024-04-04'),
  ('N/A-PH-10-2024', DATE '2024-10-28', DATE '2024-11-27')
) AS v(inv, new_start, new_end)
WHERE m.invoice_number = v.inv;

-- Refuse to commit unless it landed exactly.
DO $$
DECLARE
  backwards integer;
  dup_pairs integer;
  touched   integer;
  remitted  numeric;
BEGIN
  SELECT count(*) INTO touched FROM copied_period_backup_031;
  IF touched <> 5 THEN
    RAISE EXCEPTION 'Expected to correct 5 rows, matched %. Rolled back.', touched;
  END IF;

  SELECT count(*) INTO backwards
  FROM monthly_income_records WHERE rent_period_end < rent_period_start;
  IF backwards <> 0 THEN
    RAISE EXCEPTION 'Expected 0 periods ending before they start, found %. Rolled back.', backwards;
  END IF;

  SELECT count(*) INTO dup_pairs FROM (
    SELECT room_id, rent_period_start FROM monthly_income_records
    GROUP BY 1, 2 HAVING count(*) > 1
  ) t;
  IF dup_pairs <> 0 THEN
    RAISE EXCEPTION 'Expected 0 duplicate (unit, period) pairs, found %. Rolled back.', dup_pairs;
  END IF;

  -- The ledger total must be untouched. This migration moves dates, never money.
  SELECT round(sum(coalesce(remitted_amount, 0))::numeric, 2) INTO remitted
  FROM monthly_income_records;
  IF remitted <> 8086250.00 THEN
    RAISE EXCEPTION 'Remitted total changed to % - it must stay 8086250.00. Rolled back.', remitted;
  END IF;

  RAISE NOTICE '5 periods corrected. Backwards periods 3 -> 0; duplicate pairs 2 -> 0; total unchanged.';
END $$;

COMMIT;

-- To undo:
--   UPDATE monthly_income_records m
--   SET rent_period_start = b.old_period_start,
--       rent_period_end   = b.old_period_end
--   FROM copied_period_backup_031 b
--   WHERE b.id = m.id;
