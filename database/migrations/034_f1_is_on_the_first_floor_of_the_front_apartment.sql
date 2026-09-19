-- 034 — unit F1 sits on the 1st floor, not the 3rd
--
-- One row, one column. Changes no money and no schema.
--
-- WHY
-- ---
-- `rooms` holds `floor = 3` for F1, and its own `description` reads
-- "Front Apartment 1st Floor". It is the ONLY one of the 33 published units
-- whose description disagrees with its floor - checked against all of them on
-- 2026-09-19; the other 32 agree unanimously on 1st, 2nd, 3rd and Penthouse.
--
-- A third source agreed independently: the floor plan Sean exported for it is
-- named `FRONT1STFLOOR-F1.svg`.
--
-- Sean settled it on 2026-09-19 (B-20 in BLOCKED_FOR_SEAN.md):
--
--     "it's a separate building that consists of 3 units. F1 is 1st floor of
--      that building, up it is 2 units which are the F2F and F2B"
--
-- So the Front Apartment is its own two-storey building: F1 below, F2F and
-- F2B above. `floor` is the floor WITHIN a building, not a property-wide
-- level - which is already how the rest of the data reads. F2F and F2B are
-- correctly `floor = 2`; only F1 was wrong.
--
-- WHY IT MATTERS RATHER THAN BEING COSMETIC
-- -----------------------------------------
-- The public unit row prints the floor label directly above the description,
-- so the page said "3rd Floor" and "Front Apartment 1st Floor" about the same
-- unit in adjacent lines. The floor also drives the floor-plan panel on the
-- category page and anything that groups units by level.
--
-- HOW TO RUN IT
-- -------------
-- `npm run backup` first, as with any change to live data. Then run the
-- statement below. The SELECT after it should return exactly one row reading
-- F1 / 1 / Front Apartment / Front Apartment 1st Floor.
--
-- UNDO
-- ----
--     UPDATE rooms SET floor = 3 WHERE upper(room_number) = 'F1';

UPDATE rooms
SET    floor = 1,
       updated_at = now()
WHERE  upper(room_number) = 'F1'
  AND  floor = 3;

-- Expect: 1 row, floor = 1, description mentioning 1st Floor.
SELECT room_number,
       floor,
       cluster_code,
       description
FROM   rooms
WHERE  upper(room_number) = 'F1';

-- Expect: 0 rows. Every published unit's description now agrees with its floor.
SELECT room_number, floor, description
FROM   rooms
WHERE  visibility_status = 'Published'
  AND  description IS NOT NULL
  AND  description <> ''
  AND  (
         (floor = 1 AND description !~* '1st floor|linda')
      OR (floor = 2 AND description !~* '2nd floor')
      OR (floor = 3 AND description !~* '3rd floor')
      OR (floor = 4 AND description !~* 'penthouse')
       );
