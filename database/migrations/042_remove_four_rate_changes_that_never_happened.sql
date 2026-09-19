-- 042 — `room_price_history` records four PH rate changes that never happened
--
-- Four rows. No money, no schema.
--
-- WHAT THEY ARE
-- -------------
-- Mine. Verifying that migration 020's trigger actually fires meant changing a
-- rate and changing it back, twice:
--
--     PH  12,000 -> 12,001
--     PH  12,001 -> 12,000
--     PH  12,000 -> 12,001
--     PH  12,001 -> 12,000
--
-- All four are dated 2026-09-19, all are attributed to the administrator
-- account, and all carry the generic reason 'Administrator price adjustment'.
-- PH sits at 12,000 today, exactly where it started, so the net effect on the
-- rate card is nil.
--
-- WHY THEY SHOULD NOT STAY
-- ------------------------
-- This table exists for ONE reason: BR-003, an honest record of when a rate
-- changed and who changed it. Its whole value is that you can trust it.
--
-- Right now it says the Penthouse changed price four times in one day. It did
-- not. And B-29 is about to put the first REAL rate changes into it - up to 31
-- of them, once the owner confirms what each unit actually costs. Those are the
-- rows that matter, and they should not open with four that are noise.
--
-- Leaving them is worse than in the income ledger, where the test rows were at
-- least voided and excluded from every total. There is no voided state here:
-- a row in this table is a claim that a rate changed.
--
-- WHAT IS NOT BEING DELETED
-- -------------------------
-- Nothing else. This table holds exactly these four rows today - it held ZERO
-- before 2026-09-19, which is itself the finding behind B-29: no rate has ever
-- been changed through the system, so the rate card is still the seeded value.
--
-- Named by ID, not by a pattern. A pattern on 'Administrator price adjustment'
-- would also match every genuine change she makes next week, since that is the
-- reason string the code writes.
--
-- HOW TO RUN IT
-- -------------
-- `npm run backup` first. Run the SELECT, confirm 4, then the DELETE.

-- Expect 4 rows, all PH, all 2026-09-19, netting to no change.
SELECT h.id, r.room_number, h.previous_price, h.new_price, h.created_at::date
FROM   room_price_history h JOIN rooms r ON r.id = h.room_id
ORDER  BY h.created_at;

BEGIN;

DELETE FROM room_price_history
WHERE id IN (
        '0804316b-84e3-4f2e-b0c2-1caada7fdfc4',
        '154e3faf-1b9a-4416-b343-0a179af55619',
        '40b8b3c5-0b42-4bfc-8e86-950cb2cf9d66',
        'c8c8a06d-a36a-40cb-992e-581866a4dcd9'
      );

COMMIT;

-- Expect 0 history rows, and PH still at 12,000 - the rate card is untouched,
-- which is the point: this removes a false record, not a real change.
SELECT (SELECT count(*) FROM room_price_history)                                AS history_rows,
       (SELECT current_price FROM rooms WHERE upper(room_number) = 'PH')        AS ph_price;
