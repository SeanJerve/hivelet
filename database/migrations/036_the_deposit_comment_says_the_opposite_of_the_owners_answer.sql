-- 036 — the live column comment on `deposit_amount` contradicts the owner
--
-- Comments only. No data, no structure, no money.
--
-- WHAT IS WRONG
-- -------------
-- Migration 009 wrote this onto `room_assignments.deposit_amount`, and it is
-- still what the catalogue says today:
--
--     'ADVANCE RENT, not a refundable security deposit. ... No separate damage
--      or security deposit is collected by this business. Non-refundable: an
--      unconsumed balance is not returned when the tenant leaves. Confirmed
--      2026-09-13 (OD-04). Do not build a refund or forfeiture workflow
--      against this column.'
--
-- On 2026-09-19 Sean put the question to the owner and relayed her answer:
--
--     "yes two months total, one month for rent and the other is the deposit"
--     "when the tenant leaves, that deposit money will be used to cover
--      expenses in fixing/maintaining the apartment that the tenant used"
--
-- Every clause of the comment is contradicted by that. A separate deposit IS
-- collected, it IS spent at move-out, and there IS therefore a move-out
-- workflow to think about.
--
-- WHY THIS IS WORTH A MIGRATION RATHER THAN A NOTE SOMEWHERE
-- ---------------------------------------------------------
-- CLAUDE.md tells everyone working here to distrust the schema file and ask
-- the catalogue instead. This comment IS the catalogue. It is the one place a
-- careful person is instructed to go, and it currently tells them the opposite
-- of what the owner said - including an explicit instruction not to build the
-- workflow she has just described.
--
-- It is also the exact failure that document records as its recurring lesson:
-- a comment is a claim with a date on it. This one carries its date in the
-- text - 2026-09-13 - and the fact changed six days later.
--
-- WHAT HAPPENS TO WHAT IS LEFT - SHE HAS ANSWERED THIS
-- ----------------------------------------------------
-- The remainder IS returned. `CLIENT_ANSWERS_2026-09-17.md` Q7, verbatim:
--
--     "The deposit is usually used to fix and maintain the apartment when the
--      tenant leaves ... and whatever is left of that entire expenses will be
--      refunded to the tenant. If it's 6500 and the expenses is 6400, the 100
--      pesos will still be given back to the tenant."
--
-- `docs/02_BUSINESS_RULES.md` BR-039 carries this and marks the opposite
-- reading retired. The register (PHASE1_OPEN_DECISIONS_REGISTER.md) holds both
-- of her answers; Sean's 2026-09-19 relay settles which one stands.
--
-- Settlement is NOT automated, and that is her choice, not a gap: the move-out
-- repairs are expense entries under category 8 and the refund is an entry she
-- writes herself. This column stores the figure and does not settle it. There
-- is still no disposition column - no refunded amount, no settlement date - and
-- BR-025 rests on that; see B-11, which also has no move-out dates.
--
-- Which of the two months this column holds is a NAMING question, not an
-- arithmetic one. Measured against the rent each unit actually charges, all 32
-- active tenancies hold ONE month - 20 of them exactly, 9 more within 8%, none
-- at two. The other month is the first month's rent and appears as an ordinary
-- income receipt. Both months are recorded. See B-31: the figure is right and
-- must not be doubled.
--
-- HOW TO RUN IT
-- -------------
-- Safe to run any time; it changes no rows. Idempotent. The SELECT afterwards
-- should show the new text.

BEGIN;

COMMENT ON COLUMN public.room_assignments.deposit_amount IS
  'ONE MONTH, held at move-in. Two months are collected when a tenant moves '
  'in: one month of rent, which is recorded as an ordinary income receipt, and '
  'one month held here. Confirmed by the owner 2026-09-19, superseding the '
  '2026-09-13 reading of OD-04 that this comment previously carried. That '
  'earlier text said no separate deposit existed and that the sum was advance '
  'rent; it was wrong on both counts and is withdrawn. At move-out this money '
  'is put towards fixing and maintaining the unit the tenant used, and WHATEVER '
  'IS LEFT IS REFUNDED to the tenant - her own example: 6,500 held, 6,400 of '
  'repairs, 100 returned (CLIENT_ANSWERS_2026-09-17 Q7, BR-039). The system '
  'stores this figure and does NOT settle it: the repairs are expense entries '
  'under category 8 and the refund is an entry she writes herself, which is a '
  'deliberate choice and not a missing feature. There is still no disposition '
  'column, so nothing here records what was refunded (BR-025, B-11). '
  'Historical note: every one of the 32 active tenancies holds one month of '
  'the rent actually charged; the figure is not to be doubled.';

COMMIT;

-- Expect: the text above.
SELECT a.attname AS column_name,
       col_description(a.attrelid, a.attnum) AS comment
FROM   pg_attribute a
JOIN   pg_class c ON c.oid = a.attrelid
JOIN   pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public'
  AND  c.relname = 'room_assignments'
  AND  a.attname = 'deposit_amount';
