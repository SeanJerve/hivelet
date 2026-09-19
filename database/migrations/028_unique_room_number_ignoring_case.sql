-- 028_unique_room_number_ignoring_case.sql
--
-- Makes "one row per unit" true at the database level, not only in the handler.
--
-- WHY
-- ---
-- `rooms_room_number_key` is `UNIQUE (room_number)` on the raw text - read from
-- pg_index on 2026-09-19, not taken from a document - so it is case SENSITIVE.
-- The live table is mixed case, and always has been:
--
--     22 lowercase   1a 1b 1c 1d 1e 1f 1g 1h 2a 2b 2c 2d 2e 2f 2g 3a 3b 3c 3d 3e 3f 3g
--     11 uppercase   B1F B2B B2F B3B B3F F1 F2B F2F LB LF PH
--
-- So `'1A'` can be inserted while `'1a'` exists, and the property has two rows
-- for one unit. Every lookup in `backend/src` finds a unit with
-- `.ilike('room_number', …)` - six of them - so both rows match; and the one on
-- the money path, `POST /admin/income-records`, uses `maybeSingle()`, which
-- errors on more than one row. A duplicate therefore breaks the only route that
-- records cash for that unit, with a 500 and no explanation on screen.
--
-- It is reachable by doing the obvious thing. Every screen displays unit codes
-- uppercased, so an administrator adding a unit types the case she was shown.
--
-- THIS IS NOT A NEW IDEA HERE - IT IS THE PATTERN THIS SCHEMA ALREADY USES
-- ------------------------------------------------------------------------
-- `profiles` already solves the identical problem twice, and both were read out
-- of pg_index on 2026-09-19:
--
--   idx_profiles_email_lower   UNIQUE (lower(email)) WHERE email IS NOT NULL
--   idx_profiles_phone_login   UNIQUE (normalize_ph_phone(phone_number))
--                              WHERE phone_number IS NOT NULL
--                                AND password_hash IS NOT NULL
--
-- So "one row per person regardless of how the identifier is spelled" is already
-- enforced at the database level for an email and for a phone number. `rooms`
-- is the one identifier that never received it, and it is the one an
-- administrator types most often. The handler halves match too: both
-- `register()` and `POST /admin/tenants` lower-case an email before writing it.
--
-- WHAT THIS DOES NOT DO
-- ---------------------
-- It does NOT rewrite the 22 lowercase codes. Their case is how they were
-- migrated and several documents quote them that way; normalising them is a
-- separate decision about the owner's data, not a constraint.
--
-- SAFETY
-- ------
-- Verified before writing, on the live database:
--
--     select lower(room_number), count(*) from rooms
--     group by 1 having count(*) > 1;   ->  0 rows
--
-- so the index builds without conflict. Re-run that query before applying; if it
-- returns anything, STOP - the duplicates have to be settled by a person first,
-- because choosing which spelling survives is a data decision.
--
-- WHAT THE CODE DOES WITH THE NEW ERROR
-- -------------------------------------
-- Judgement log entry 20: a constraint does not only forbid something, it
-- introduces an error the code has never seen. Here the answer is already in
-- place - `POST /admin/rooms` checks `.ilike` first and returns a clean 409, so
-- this index is a BACKSTOP for anything that bypasses the handler rather than a
-- new path the API has to learn. If that check is ever removed, a 23505 from
-- this index would surface as a 500 from `ApiError.internal`, and the handler
-- would need a 23505 branch the way the Adyen webhook got one in 024.
--
-- APPLIED 2026-09-19 by Claude, on Sean's instruction ("try it now yourself").
-- Read back afterwards: idx_rooms_room_number_lower exists as
--   CREATE UNIQUE INDEX ... ON public.rooms USING btree (lower((room_number)::text))
-- and nothing else moved - 33 rooms, 937 income rows. The collision guard above
-- passed with 0, as it had when the file was written.

BEGIN;

DO $$
DECLARE
  collisions int;
BEGIN
  SELECT count(*) INTO collisions
  FROM (
    SELECT lower(room_number)
    FROM rooms
    GROUP BY lower(room_number)
    HAVING count(*) > 1
  ) AS d;

  IF collisions > 0 THEN
    RAISE EXCEPTION
      '028: % unit code(s) already differ only by case. Settle them by hand first; '
      'this migration will not choose which spelling survives.', collisions;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_room_number_lower
  ON rooms (lower(room_number));

COMMENT ON INDEX idx_rooms_room_number_lower IS
  'One row per unit regardless of case. rooms_room_number_key is case-sensitive '
  'and the table is mixed case, so 1A could otherwise be inserted beside 1a - '
  'which breaks the six .ilike lookups in backend/src, including the '
  'maybeSingle() on the income-record path. See migration 028.';

DO $$
BEGIN
  RAISE NOTICE '028: unit codes are now unique ignoring case (% rooms)',
    (SELECT count(*) FROM rooms);
END $$;

COMMIT;
