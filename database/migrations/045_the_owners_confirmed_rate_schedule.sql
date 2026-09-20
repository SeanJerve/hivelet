-- 045 — the rate card, from the owner, at last
--
-- 31 rows, one column. This is B-29, the largest finding of the audit, and it
-- was never a bug: every figure was doing exactly what it was told. The rate
-- card was set when the units were seeded and never updated.
--
-- WHERE THESE NUMBERS COME FROM
-- -----------------------------
-- Mrs Fe, relayed by Sean on 2026-09-20, in answer to the question on the
-- client sheet: "what is the rent for each unit today?"
--
-- They are NOT inferred from the ledger. CLAUDE.md is explicit that she sets
-- rates and nothing here may guess one, and the audit refused to guess for two
-- days. She has now said.
--
-- WHAT MAKES THEM TRUSTWORTHY, CHECKED BEFORE WRITING
-- --------------------------------------------------
-- All 33 units are accounted for, and every single rate is corroborated by her
-- own receipts:
--
--     24 of 33   match the rent that unit MOST COMMONLY shows in the ledger
--      9 of 33   match the rent on that unit's MOST RECENT receipt
--      0 of 33   contradict her book
--
-- The nine are the units where she has raised the rate recently, so the common
-- figure still reflects the older one - 1g, 1h, 2b, 2c, 2e, 3d, 3f, 3g, F2F.
-- In every one of those nine her answer equals the latest receipt exactly.
--
-- And the total uplift comes to PHP 113,150 a month, which is the figure B-29
-- derived independently from the ledger before she was asked. Her answer
-- reproduces the audit's own number.
--
-- WHY IT MATTERS
-- --------------
-- `rooms.current_price` is what a tenant is CHARGED when they pay online, what
-- the public site advertises, and what BR-039 sets the move-in deposit from. A
-- resident paying through the portal today would be asked for about half of
-- what they owe. The Penthouse - the one unit actually available - has been
-- advertised at 12,000 and last let for 30,000.
--
-- WHAT IS NOT TOUCHED
-- -------------------
-- `base_price` stays at the seeded value. It is the original rate and it is
-- history; `current_price` is what is charged today, and the two are supposed
-- to diverge once a rate moves.
--
-- BR-003 LOOKS AFTER ITSELF. `trg_record_room_price_change` (migration 020)
-- writes one `room_price_history` row per change automatically, so this leaves
-- 31 dated history rows behind it - the first real entries that table has ever
-- held. The UPDATE below then stamps their `reason`, because a history row that
-- cannot say where its number came from is worth much less than one that can.
-- `created_by` is deliberately left NULL: no person clicked this in the
-- application, and pretending otherwise would put a name against a keystroke
-- that never happened.
--
-- HOW TO RUN IT
-- -------------
-- `npm run backup` first. Then the whole file. The SELECTs at the end must read
-- 31 changed, 0 disagreeing with her schedule, and 31 history rows.

BEGIN;

UPDATE rooms r
SET    current_price = v.rate,
       updated_at = now()
FROM  (VALUES
         ('1A',8000),('1B',8500),('1C',8000),('1D',7250),('1E',6000),('1F',6500),
         ('1G',6500),('1H',6500),
         ('2A',8000),('2B',8500),('2C',8500),('2D',8500),('2E',8000),('2F',6500),('2G',6500),
         ('3A',9000),('3B',8500),('3C',8500),('3D',8500),('3E',8000),('3F',6500),('3G',7000),
         ('B1F',10000),('B2F',10000),('B2B',12000),('B3F',12000),('B3B',12000),
         ('F1',12600),('F2F',8000),('F2B',10000),
         ('LF',5000),('LB',5500),
         ('PH',30000)
       ) AS v(unit, rate)
WHERE  upper(r.room_number) = v.unit
  AND  r.current_price <> v.rate;

-- The history rows the trigger just wrote, given their provenance.
UPDATE room_price_history
SET    reason = 'Rate confirmed by the owner and relayed 2026-09-20. Corroborated against her '
             || 'own receipts: 24 of 33 match the unit''s usual rent, 9 match its most recent, '
             || 'none contradict the ledger. See migration 045 and B-29.'
WHERE  reason IS NULL
  AND  created_at >= now() - interval '5 minutes';

COMMIT;

-- Expect 33 rows, every one matching her schedule.
SELECT r.room_number, r.current_price, r.base_price
FROM   rooms r ORDER BY r.room_number;

-- Expect 31 history rows, all carrying the reason above.
SELECT count(*) AS history_rows_written,
       count(*) FILTER (WHERE reason IS NOT NULL) AS with_a_reason
FROM   room_price_history;
