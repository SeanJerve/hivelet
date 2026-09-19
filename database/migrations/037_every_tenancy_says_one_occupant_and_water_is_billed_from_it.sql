-- 037 — `occupant_count` is 1 on all 32 tenancies; water is billed from it
--
-- Thirteen rows, one column. No schema, no money already recorded.
--
-- WHAT IS WRONG
-- -------------
-- `room_assignments.occupant_count` reads **1** for every one of the 32 active
-- tenancies. One distinct value across the whole property - the third column
-- found this way, after `anniversary_date` (035) and `start_date` (B-11), all
-- three being uniform defaults the bulk import wrote and nothing since has
-- corrected.
--
-- Her ledger disagrees for 16 of the 32, measured against the most recent month
-- she recorded for each: fourteen were last billed water for TWO occupants and
-- two for THREE. Eighteen disagree with the unit's USUAL headcount rather than
-- its latest - the wider figure, quoted here so the two are not confused.
--
-- WHERE IT COSTS MONEY - AND WHERE IT DOES NOT
-- --------------------------------------------
-- It does NOT affect the receipts Mrs Fe writes on site. `POST
-- /admin/income-records` takes `occupants` as a field and she types it, so
-- `computeWaterFee()` gets the real number and the ledger stays right.
--
-- It DOES affect the bill a TENANT raises. `GET /tenant/bills` (tenant.ts) and
-- the Adyen path (adyenService.ts) both read this column and pass it to
-- `computeBillAmounts()`. So the amount shown in a resident's own portal, and
-- the amount charged when they pay by GCash, is computed for ONE occupant.
--
--     water understated on            15 units
--     understated by                  2,200 per month in total
--
-- That figure is small only next to the other half of the same bill: the rent
-- comes from `rooms.current_price`, the rate card, which understates by
-- **89,650 a month** across the same 30 units (B-29). A tenant-raised bill
-- under-charges 29 of the 30 non-Linda units, by 3,062 on average.
--
-- LF and LB are unaffected on the water half - BR-040 bills them a fixed
-- charge regardless of headcount - but LF's count is corrected below anyway,
-- because the number is also read by screens that report occupancy.
--
-- WHAT THIS MIGRATION CHANGES
-- ---------------------------
-- The 13 units whose last twelve recorded months agree unanimously, or whose
-- most recent figure has held unbroken for at least 8 months:
--
--     1b, 1f            3 occupants
--     2b 2d 3a 3c 3e    2 occupants
--     B1F B2B B2F F1 F2B LF
--
-- Twelve more are already correct at 1 and are not touched.
--
-- SEVEN NEED HER (B-33). Each changed within the last four months, and a
-- change that recent is as likely to be real as to be a slip:
--
--     1h    1 1 1 1 1 1 1 1 1 2 2 2    -> 2 for 3 months
--     B3B   3 3 3 4 4 4 4 4 4 4 2 2    -> 2 for 2 months
--     B3F   4 4 4 4 4 4 4 4 2 2 2 2    -> 2 for 4 months
--     2e 3b 3g   2 ... 2 1 1           -> dropped to 1 very recently
--     3d    2 2 2 2 2 2 2 2 1 1 1 1    -> 1 for 4 months
--
-- Of those seven, four (2e, 3b, 3d, 3g) already hold the value the ledger's
-- newest row shows, so leaving them alone costs nothing today.
--
-- READ THIS BEFORE RUNNING IT
-- ---------------------------
-- **Occupancy is the one fact here that legitimately changes month to month,**
-- and it is the one she maintains by hand - her own answer, CLIENT_ANSWERS
-- 2026-09-17 Q6: *"also to edit the number of occupants in each apartment. We
-- already have that."*
--
-- The newest row in the ledger is **July 2026**. Today is September. These
-- figures are two months old and are her records, not a live count. They are a
-- better starting point than 1-for-everyone, which is wrong for 16 units, but
-- **confirm them with her** - it is 32 numbers and one sitting.
--
-- `npm run backup` first. Then the UPDATE, then the SELECT.
--
-- UNDO
-- ----
--     UPDATE room_assignments SET occupant_count = 1 WHERE is_active = true;

BEGIN;

UPDATE room_assignments ra
SET    occupant_count = v.occupants,
       updated_at = now()
FROM  (VALUES
         ('1B',  3),
         ('1F',  3),
         ('2B',  2),
         ('2D',  2),
         ('3A',  2),
         ('3C',  2),
         ('3E',  2),
         ('B1F', 2),
         ('B2B', 2),
         ('B2F', 2),
         ('F1',  2),
         ('F2B', 2),
         ('LF',  2)
       ) AS v(unit, occupants)
JOIN   rooms r ON upper(r.room_number) = v.unit
WHERE  ra.room_id = r.id
  AND  ra.is_active = true
  AND  ra.occupant_count = 1;

COMMIT;

-- Expect: 13 rows, none of them 1.
SELECT r.room_number, ra.occupant_count, r.capacity
FROM   room_assignments ra
JOIN   rooms r ON r.id = ra.room_id
WHERE  ra.is_active = true
  AND  ra.occupant_count <> 1
ORDER  BY r.room_number;

-- Expect: 1b and 1f only. Both hold 3 people in a unit whose capacity is 2 -
-- that is what her ledger has said for eleven straight months, and it is a
-- fact about the property, not an error in this migration. The receipt path
-- already writes an audit row when a payment is recorded over capacity.
SELECT r.room_number, ra.occupant_count, r.capacity
FROM   room_assignments ra
JOIN   rooms r ON r.id = ra.room_id
WHERE  ra.is_active = true
  AND  ra.occupant_count > r.capacity
ORDER  BY r.room_number;
