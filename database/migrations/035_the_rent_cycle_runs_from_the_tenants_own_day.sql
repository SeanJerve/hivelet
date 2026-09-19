-- 035 — every tenancy carries the import date as its anniversary, so BR-033
--       bills all 32 residents on the 1st
--
-- Sixteen rows, one column. Changes no money, no schema, and no receipt that
-- already exists.
--
-- WHAT IS WRONG
-- -------------
-- `room_assignments.anniversary_date` is 2026-07-01 for ALL 32 active
-- tenancies. One distinct value across the whole property. That date is the
-- bulk import's placeholder - the same 2026-07-01 that migration 032 already
-- identified as invented when it appeared in `date_paid`.
--
-- BR-033 derives the rent cycle from it. `computeBillPeriod()` in
-- `backend/src/services/billingService.ts` reads ONLY its day-of-month:
--
--     const anchorDay = Number.isNaN(...) ? 1 : anniversary.getUTCDate();
--
-- So the system believes every resident's month runs from the 1st.
--
-- The ledger says otherwise. Across the 937 income rows, `rent_period_start`
-- lands on the 1st in 122 of them and on 23 OTHER days in the remaining 815.
-- Unit 1a has paid from the 7th for 31 consecutive months. B2F from the 21st,
-- 31 for 31. LB the 25th, LF the 13th, B2B the 3rd - each unbroken across its
-- entire recorded history.
--
-- 29 of the 32 active tenancies are on a day that is not the 1st.
--
-- WHY IT HAS NOT DONE ANY DAMAGE YET, AND WHY THAT ENDS SOON
-- ---------------------------------------------------------
-- Every one of the 937 income rows was created by the import at
-- 2026-08-28T05:44 and carries a period taken from the owner's own book. No
-- receipt has ever been recorded through the application by a person.
--
-- The first one will be wrong. `POST /admin/income-records` derives the period
-- from this column whenever the administrator does not type the dates
-- (admin.ts, "BR-033 - the rent period comes from the tenancy's own cycle"),
-- so a receipt for 1a would be stamped 1 Oct - 31 Oct when that resident's
-- month runs 7 Oct - 6 Nov.
--
-- Worse, the divergence warning is inverted. The same handler writes an audit
-- row when the typed period differs from the derived one. As things stand, an
-- administrator who types the CORRECT dates is the one who gets flagged.
--
-- WHAT THIS MIGRATION CHANGES, AND WHAT IT DELIBERATELY DOES NOT
-- --------------------------------------------------------------
-- Only the DAY moves. The year and month stay at 2026-07 - the existing
-- placeholder - because the day is the only part the system reads and the only
-- part the ledger can evidence. Writing a plausible-looking move-in date would
-- replace one invented value with another, which is the reasoning migration 032
-- already applied to F1's date_paid.
--
-- `start_date` is NOT touched. It is still 2026-07-01 for everyone and still
-- unknown; see B-11.
--
-- The 16 units below are the ones whose own ledger settles the question: the
-- most recent period start is also the usual one, and it has been unbroken for
-- at least 8 consecutive months. Three of them (2a, 3e, F1) really are on the
-- 1st and are listed for completeness, not changed.
--
-- SIXTEEN OTHERS ARE NOT IN THIS MIGRATION and need Mrs Fe (B-32):
--
--   3c, B3B     the period tracked the LAST DAY of each month - 31st, 30th,
--               28th in February - and then stuck on 28 from March 2026. Their
--               real anchor is probably month-end, which BR-033 would express
--               as day 31, but "probably" is not good enough to write.
--   2g, 3d, 1e  the same month-end drift, less cleanly.
--   1g 1h 2c 2e 2f 3b 3f 3g B3F F2F 1b
--               the cycle moved at some point in the last year. Either the
--               resident changed or the day was renegotiated, and the ledger
--               cannot say which.
--
-- HOW TO RUN IT
-- -------------
-- `npm run backup` first, as with any change to live data. Run the UPDATE, then
-- the two SELECTs below; the first should return 16 rows and the second 0.
--
-- UNDO
-- ----
--     UPDATE room_assignments SET anniversary_date = '2026-07-01'
--     WHERE is_active = true;

BEGIN;

UPDATE room_assignments ra
SET    anniversary_date = make_date(2026, 7, v.day),
       updated_at = now()
FROM  (VALUES
         ('1A',   7),
         ('1C',  26),
         ('1D',   9),
         ('1F',  28),
         ('2A',   1),
         ('2B',  10),
         ('2D',  15),
         ('3A',   4),
         ('3E',   1),
         ('B1F', 10),
         ('B2B',  3),
         ('B2F', 21),
         ('F1',   1),
         ('F2B', 15),
         ('LB',  25),
         ('LF',  13)
       ) AS v(unit, day)
JOIN   rooms r ON upper(r.room_number) = v.unit
WHERE  ra.room_id = r.id
  AND  ra.is_active = true
  AND  ra.anniversary_date = DATE '2026-07-01';

COMMIT;

-- Expect: 16 rows, each anniversary day matching the unit's own ledger.
SELECT r.room_number,
       ra.anniversary_date,
       EXTRACT(DAY FROM ra.anniversary_date) AS anniversary_day
FROM   room_assignments ra
JOIN   rooms r ON r.id = ra.room_id
WHERE  ra.is_active = true
  AND  ra.anniversary_date <> DATE '2026-07-01'
ORDER  BY r.room_number;

-- Expect: 0 rows. No anniversary day disagrees with that unit's most recent
-- twelve rent periods, among the units this migration claims to have settled.
WITH recent AS (
  SELECT mir.room_id,
         EXTRACT(DAY FROM mir.rent_period_start) AS d,
         ROW_NUMBER() OVER (PARTITION BY mir.room_id
                            ORDER BY mir.year DESC, mir.month DESC) AS rn
  FROM   monthly_income_records mir
  WHERE  mir.voided_at IS NULL
), newest AS (
  SELECT room_id, d FROM recent WHERE rn = 1
)
SELECT r.room_number,
       EXTRACT(DAY FROM ra.anniversary_date) AS system_day,
       newest.d                              AS ledger_day
FROM   room_assignments ra
JOIN   rooms r      ON r.id = ra.room_id
JOIN   newest       ON newest.room_id = ra.room_id
WHERE  ra.is_active = true
  AND  ra.anniversary_date <> DATE '2026-07-01'
  AND  EXTRACT(DAY FROM ra.anniversary_date) <> newest.d;
