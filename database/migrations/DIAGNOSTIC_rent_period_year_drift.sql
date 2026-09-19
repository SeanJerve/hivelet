-- DIAGNOSTIC ONLY. READ-ONLY. NOTHING HERE WRITES.
--
-- 58 of the 937 income rows carry a `rent_period_start` whose YEAR disagrees
-- with the row's own `year` column. This file is how that was found and how it
-- should be checked again before anyone decides what to do about it.
--
-- It is deliberately NOT a migration. The correct value is a question about the
-- owner's own book, not something derivable from the data - for 48 of the rows
-- the `year`/`month` columns say one thing and `rent_period_start` says another,
-- and both are records SHE entered. Guessing which is right would rewrite real
-- financial history in a way nobody could audit afterwards. See BLOCKED_FOR_SEAN.md B-21.
--
-- Run it with:  psql "$DATABASE_URL" -f database/migrations/DIAGNOSTIC_rent_period_year_drift.sql

\echo '=== 1. Scope ==='
SELECT
  count(*)                                                                        AS total_rows,
  count(*) FILTER (WHERE extract(year FROM rent_period_start)::int <> year)        AS period_year_disagrees,
  count(*) FILTER (WHERE extract(year FROM rent_period_start)::int = year + 1)     AS period_one_year_ahead,
  count(*) FILTER (WHERE extract(month FROM rent_period_start)::int <> month)      AS period_month_disagrees
FROM monthly_income_records;

\echo ''
\echo '=== 2. The two groups, which behave differently ==='
-- Group A: December rows whose period is one year AHEAD. 48 rows.
-- Group B: non-December rows whose period is one year BEHIND. 10 rows, and
--          seven of them are one unit's consecutive Jan-Jul run at 10,000.
SELECT year, month,
  count(*)                                                                    AS rows_affected,
  count(*) FILTER (WHERE extract(year FROM rent_period_start)::int = year + 1) AS one_year_ahead,
  count(*) FILTER (WHERE extract(year FROM rent_period_start)::int = year - 1) AS one_year_behind,
  min(rent_period_start) AS earliest_period,
  max(rent_period_end)   AS latest_period,
  round(sum(rent_amount)::numeric, 2) AS rent_involved
FROM monthly_income_records
WHERE extract(year FROM rent_period_start)::int <> year
GROUP BY year, month
ORDER BY year, month;

\echo ''
\echo '=== 3. Every affected row, for reading against her book ==='
SELECT r.room_number, m.year, m.month, m.date_paid,
       m.rent_period_start, m.rent_period_end, m.rent_amount, m.contact_name
FROM monthly_income_records m
LEFT JOIN rooms r ON r.id = m.room_id
WHERE extract(year FROM m.rent_period_start)::int <> m.year
ORDER BY m.year, m.month, r.room_number;

\echo ''
\echo '=== 4. Periods already duplicated, BEFORE anything is changed ==='
-- 14 (room, period) pairs already carry more than one receipt. These are a
-- separate question - a genuine second payment, or the same receipt entered
-- twice - and they are why a blanket correction is not safe: shifting the
-- December rows back a year lands three of them on top of existing rows.
SELECT r.room_number, m.rent_period_start, count(*) AS receipts,
       string_agg(m.date_paid::text, ', ' ORDER BY m.date_paid) AS paid_on,
       string_agg(m.rent_amount::text, ', ' ORDER BY m.date_paid) AS amounts
FROM monthly_income_records m
JOIN rooms r ON r.id = m.room_id
GROUP BY r.room_number, m.rent_period_start
HAVING count(*) > 1
ORDER BY r.room_number, m.rent_period_start;

\echo ''
\echo '=== 5. Dates outside the ledger years at all ==='
-- Two are clearly typed wrong; four are genuine late-December payments for a
-- January period and are correct as they stand.
SELECT r.room_number, m.year, m.month, m.date_paid,
       m.rent_period_start, m.rent_period_end, m.rent_amount, m.contact_name
FROM monthly_income_records m
LEFT JOIN rooms r ON r.id = m.room_id
WHERE m.date_paid < '2024-01-01' OR m.date_paid > CURRENT_DATE
ORDER BY m.date_paid;
