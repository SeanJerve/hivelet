-- 030 — the rent period year, corrected to agree with the row's own year and month
--
-- DO NOT RUN THIS WITHOUT READING THE TWO PARAGRAPHS BELOW.
-- Run `npm run backup` first. It rewrites 58 rows of the owner's live income ledger.
--
-- WHAT IS WRONG
-- -------------
-- 58 of the 937 income rows carry a `rent_period_start` whose YEAR disagrees with
-- the row's own `year` column. It is not scattered: it is two mirror-image groups.
--
--   48 rows  month = 12, period exactly ONE YEAR AHEAD   (Dec 2024 rows dated Dec 2025)
--   10 rows  month = 1..7, period exactly ONE YEAR BEHIND (Jan 2025/2026 rows dated a year back)
--
-- In every one of the 58 the period's MONTH already matches the `month` column, and
-- `date_paid`'s year already matches the `year` column. Only the period's year is out.
-- So `year`, `month` and `date_paid` agree with each other and outvote the period.
--
-- THE EVIDENCE THAT THE PERIOD IS THE WRONG ONE, NOT THE YEAR COLUMN
-- -----------------------------------------------------------------
--   * All 48 December rows cover exactly one month (29-32 days, PHP 5,000-12,000).
--     None is a multi-month prepayment, which is the only other reading.
--   * 43 of the 48 are their unit's ONLY December row for that year. Without them
--     December is simply missing from the ledger for that unit.
--   * Unit 2a: an unbroken PHP 8,000 monthly run from Jan 2024 to Jul 2026, every row
--     paid at the end of its own month - except the Dec 2024 one, paid 1 Jan 2025,
--     which claims 1-31 December 2025, the same period as its genuine Dec 2025 row.
--   * Unit F1: no January 2025 row exists at all. The PHP 12,600 paid 2025-01-06 is
--     filed year=2025 month=1 with a period in January 2024. Correcting it fills the gap.
--   * Unit 2g, Sheena Mae Guianan: her tenancy runs on the 9th, Oct 2024 to Mar 2025,
--     and has a gap exactly at December 2024 - which is where her odd row lands once
--     its period is corrected.
--
-- WHAT IT DOES TO THE DUPLICATES
-- ------------------------------
-- 14 (room, rent_period_start) pairs currently hold more than one receipt. This
-- correction resolves 12 of them and creates NONE - measured, not assumed:
--
--     mismatched rows   58 -> 0
--     duplicate pairs   14 -> 2
--     newly created      0
--
-- The 2 that remain are a different defect and are NOT touched here: unit 3e
-- (month=3, paid 2024-04-05) and unit PH (month=10, paid 2024-11-10) each have a
-- period that was never advanced to the next month. Their `month` column says which
-- month they belong to, but the correct day depends on the tenancy anniversary and
-- should be confirmed with the owner before anything is written.
--
-- Every receipt in all 14 pairs is exactly one month's rent for that unit. Nothing
-- was ever paid twice; only the period label was wrong.

BEGIN;

-- A record of what was there, so this is reversible from the database itself and
-- not only from a file backup.
CREATE TABLE IF NOT EXISTS rent_period_drift_backup_030 (
  id                  uuid PRIMARY KEY,
  room_id             uuid,
  year                integer,
  month               integer,
  date_paid           date,
  old_period_start    date,
  old_period_end      date,
  new_period_start    date,
  new_period_end      date,
  corrected_at        timestamptz NOT NULL DEFAULT now()
);

INSERT INTO rent_period_drift_backup_030
  (id, room_id, year, month, date_paid, old_period_start, old_period_end, new_period_start, new_period_end)
SELECT
  m.id, m.room_id, m.year, m.month, m.date_paid,
  m.rent_period_start, m.rent_period_end,
  CASE WHEN extract(year FROM m.rent_period_start)::int = m.year + 1 AND m.month = 12
       THEN (m.rent_period_start - interval '1 year')::date
       ELSE (m.rent_period_start + interval '1 year')::date END,
  CASE WHEN extract(year FROM m.rent_period_start)::int = m.year + 1 AND m.month = 12
       THEN (m.rent_period_end   - interval '1 year')::date
       ELSE (m.rent_period_end   + interval '1 year')::date END
FROM monthly_income_records m
WHERE extract(year FROM m.rent_period_start)::int <> m.year
ON CONFLICT (id) DO NOTHING;

-- Group A — December rows whose period is a year ahead. 48 rows.
UPDATE monthly_income_records
SET rent_period_start = (rent_period_start - interval '1 year')::date,
    rent_period_end   = (rent_period_end   - interval '1 year')::date,
    updated_at        = now()
WHERE extract(year FROM rent_period_start)::int = year + 1
  AND month = 12;

-- Group B — rows whose period is a year behind. 10 rows.
UPDATE monthly_income_records
SET rent_period_start = (rent_period_start + interval '1 year')::date,
    rent_period_end   = (rent_period_end   + interval '1 year')::date,
    updated_at        = now()
WHERE extract(year FROM rent_period_start)::int = year - 1;

-- A single payment date whose year is a typo. Unit 1c, Daryl Rivero: stored
-- 2027-02-26 against a period starting 2026-02-26. The day and month match the
-- period start exactly, and every neighbouring receipt of his is paid within a day
-- or two of the period start - 2026-01-25, 2026-03-28, 2026-04-26, 2026-05-28.
-- Only the year is wrong. Drop this statement if the owner says otherwise.
UPDATE monthly_income_records
SET date_paid = DATE '2026-02-26', updated_at = now()
WHERE date_paid = DATE '2027-02-26'
  AND rent_period_start = DATE '2026-02-26';

-- Unit 2g, Sheena Mae Guianan, OR#4839. `date_paid` reads 1900-01-17.
--
-- That is not a typo. It is Excel's epoch showing through: a cell holding the bare
-- number 17 renders as 17 January 1900, because Excel counts days from 1 Jan 1900.
-- So the DAY survived as 17 and the month and year were lost on import.
--
-- The receipt book pins the rest of it. Receipts are numbered in the order they are
-- written, and 425 of the 434 consecutive pairs in this ledger run in date order.
-- OR#4839 sits between:
--
--     OR#4838   unit 2d, Joan Rejuso        paid 14 December 2024
--     OR#4839   unit 2g, Sheena Mae Guianan paid ????
--     OR#4840   unit 2f, France Sacueza     paid 18 December 2024
--
-- So it was written between the 14th and the 18th, and the day that survived is the
-- 17th. That is the only date in the window it can be. Six things agree and none
-- disagree: the surviving day, the receipt before, the receipt after, her corrected
-- rent period (9 Dec 2024 - 8 Jan 2025, which contains it), her payment habit (her
-- five other receipts land 1 day early to 18 days late; the 17th is 8 days in), and
-- the gap in her ledger, which is exactly December 2024.
--
-- It is still a date nobody wrote down. Drop this one statement if the owner says
-- otherwise - nothing else in this migration depends on it.
UPDATE monthly_income_records
SET date_paid = DATE '2024-12-17', updated_at = now()
WHERE date_paid = DATE '1900-01-17'
  AND invoice_number = 'OR#4839';

-- Refuse to commit unless the correction did exactly what it claims.
DO $$
DECLARE
  mismatched integer;
  dup_pairs  integer;
BEGIN
  SELECT count(*) INTO mismatched
  FROM monthly_income_records
  WHERE extract(year FROM rent_period_start)::int <> year;

  IF mismatched <> 0 THEN
    RAISE EXCEPTION 'Expected 0 rows with a mismatched period year, found %. Rolled back.', mismatched;
  END IF;

  SELECT count(*) INTO dup_pairs FROM (
    SELECT room_id, rent_period_start
    FROM monthly_income_records
    GROUP BY 1, 2 HAVING count(*) > 1
  ) t;

  PERFORM 1 FROM monthly_income_records WHERE date_paid < DATE '2020-01-01';
  IF FOUND THEN
    RAISE EXCEPTION 'A payment date before 2020 is still present. Rolled back.';
  END IF;

  IF dup_pairs <> 2 THEN
    RAISE EXCEPTION
      'Expected 2 remaining duplicate (unit, period) pairs - 3e and PH, which this migration does not touch - but found %. Rolled back.',
      dup_pairs;
  END IF;

  RAISE NOTICE 'Period years corrected. Mismatched rows now 0; duplicate pairs 14 -> 2, none created.';
END $$;

COMMIT;

-- To undo:
--   UPDATE monthly_income_records m
--   SET rent_period_start = b.old_period_start,
--       rent_period_end   = b.old_period_end
--   FROM rent_period_drift_backup_030 b
--   WHERE b.id = m.id;
