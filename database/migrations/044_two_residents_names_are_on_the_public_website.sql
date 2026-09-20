-- 044 — two units publish the name of the person living in them
--
-- Two rows, one column. No money, no schema.
--
-- WHAT IS WRONG
-- -------------
-- `rooms.description` is served by `GET /api/public/rooms` - unauthenticated,
-- no token, rendered on the public site - and two of the 33 descriptions name
-- the resident:
--
--     LB   'Linda Back Unit (Jaye Casia) - Fixed Rate Billing'
--     LF   'Linda Front Unit (Gayon) - Fixed Rate Billing'
--
-- Both are `Published`. Both people are CURRENT, ACTIVE residents - checked
-- against `room_assignments`, not assumed from the text.
--
-- So anyone who opens the website can read who lives in those two units. That is
-- BR-024, tenant privacy, on the one surface where it matters most: the route
-- that requires nothing of the caller.
--
-- HOW IT WAS FOUND, because the method is reusable
-- ------------------------------------------------
-- Not by reading the column allowlist - that allowlist is CORRECT, and says so:
-- "Columns a public visitor may see. Note the absence of any tenant linkage."
-- There is no join to a tenant anywhere in the route.
--
-- It was found by pulling every real name, email and phone number out of
-- `profiles` and searching the actual bytes the public endpoint returns. The
-- leak was not in the query. It was in the DATA - a resident's name typed into
-- a field that happens to be public, which no amount of reviewing the query
-- would ever have shown.
--
-- WHAT THE NEW TEXT SAYS, AND WHY
-- -------------------------------
-- The useful public fact is which structure the unit is in, so a prospect knows
-- what they are looking at. The wording follows the interface's own description
-- of these units in `IncomeCollectionsView.vue` - "the separate structure beside
-- the red gate" - rather than inventing a new phrase for the same thing.
--
-- "Fixed Rate Billing" goes too. It is internal vocabulary; the public FAQ
-- already explains the fixed water charge in words a prospect can use.
--
-- The unit's own billing behaviour is unchanged. `rooms.is_linda_unit` is what
-- BR-040 and migration 041's trigger read - not this sentence.
--
-- HOW TO RUN IT
-- -------------
-- `npm run backup` first, as with any change to live data.

-- Expect 2 rows, LB and LF, naming the residents.
SELECT room_number, description FROM rooms
WHERE room_number IN ('LB','LF') ORDER BY room_number;

BEGIN;

UPDATE rooms
SET    description = 'Back unit in the separate two-storey structure beside the red gate. '
                  || 'Water is charged at a fixed monthly rate rather than per occupant.',
       updated_at = now()
WHERE  upper(room_number) = 'LB';

UPDATE rooms
SET    description = 'Front unit in the separate two-storey structure beside the red gate. '
                  || 'Water is charged at a fixed monthly rate rather than per occupant.',
       updated_at = now()
WHERE  upper(room_number) = 'LF';

COMMIT;

-- Expect 0 rows. No published description contains the name of anyone on file.
SELECT r.room_number, r.description
FROM   rooms r
WHERE  r.visibility_status = 'Published'
  AND  EXISTS (
         SELECT 1 FROM profiles p
         WHERE p.full_name IS NOT NULL AND length(p.full_name) > 3
           AND r.description ILIKE '%' || p.full_name || '%'
       );
