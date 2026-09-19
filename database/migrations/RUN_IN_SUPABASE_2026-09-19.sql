-- =============================================================================
-- PASTE-READY: migrations 035, 036 and 037, in order, 2026-09-19
-- =============================================================================
--
-- Everything currently prepared and waiting. Nothing else needs running.
--
-- RUN `npm run backup` FIRST. Two of these three change live rows.
--
-- Each block is self-contained and every one ends with a SELECT whose expected
-- result is stated. Run them in order and read each result before moving on.
-- If a count comes back different from what is stated, STOP and say so - it
-- means the data moved since 2026-09-19 and the figures need re-deriving.
--
-- WHAT THEY ARE, shortest version:
--
--   035  29 of 32 residents are billed on the 1st; their own ledger says
--        otherwise. Sets the anniversary DAY for the 16 units the ledger
--        settles. 16 more need Mrs Fe - see B-32.
--        -> 16 rows, one column. No money.
--
--   036  The live column comment on `deposit_amount` still says no deposit
--        exists and instructs the reader not to build the move-out workflow she
--        described. Replaces the text.
--        -> comments only. No rows at all.
--
--   037  `occupant_count` is 1 on all 32 tenancies, and the tenant portal bills
--        water from it. Sets the 13 her ledger settles. 7 need her - see B-33.
--        -> 13 rows, one column. No money already recorded.
--
--   038  Two taps on "Pay" can raise the same bill twice - both paths that
--        raise a bill read-then-insert with no transaction behind them. Adds
--        the unique index that makes the second one lose.
--        -> one index. No rows at all.
--
--   039  Removes the 37 rows THIS AUDIT put in her database while testing
--        write paths - 35 voided income rows, 1 voided expense, and one test
--        enquiry that shows in her Inquiries screen as Pending. None of them
--        is a record of hers. **Run this one from its own file**, not from
--        here: it names 37 UUIDs and they should not be retyped.
--        -> database/migrations/039_remove_the_audit_test_rows_from_her_ledger.sql
--
-- The full reasoning for each is in its own numbered file. This one exists so
-- nothing is missed, not to replace them.
--
-- NOT IN HERE, deliberately: the rate card (B-29). Residents pay 162% of it on
-- average and a tenant paying through the portal is charged about half what
-- they owe - but she sets rates, and nothing here may infer one from the
-- ledger. That one is a conversation, not a migration.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 035 — the rent cycle runs from the tenant's own day
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

UPDATE room_assignments ra
SET    anniversary_date = make_date(2026, 7, v.day),
       updated_at = now()
FROM  (VALUES
         ('1A',7),('1C',26),('1D',9),('1F',28),('2A',1),('2B',10),('2D',15),
         ('3A',4),('3E',1),('B1F',10),('B2B',3),('B2F',21),('F1',1),('F2B',15),
         ('LB',25),('LF',13)
       ) AS v(unit, day)
JOIN   rooms r ON upper(r.room_number) = v.unit
WHERE  ra.room_id = r.id
  AND  ra.is_active = true
  AND  ra.anniversary_date = DATE '2026-07-01';

COMMIT;

-- EXPECT 13 ROWS. (16 were updated; 2a, 3e and F1 really are day 1, so they
-- still read 2026-07-01 and do not appear here.)
SELECT r.room_number, ra.anniversary_date
FROM   room_assignments ra JOIN rooms r ON r.id = ra.room_id
WHERE  ra.is_active AND ra.anniversary_date <> DATE '2026-07-01'
ORDER  BY r.room_number;


-- ─────────────────────────────────────────────────────────────────────────────
-- 036 — the deposit comment says the opposite of the owner's answer
-- ─────────────────────────────────────────────────────────────────────────────
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

-- EXPECT 1 ROW, showing the text above.
SELECT a.attname, col_description(a.attrelid, a.attnum) AS comment
FROM   pg_attribute a
JOIN   pg_class c ON c.oid = a.attrelid
JOIN   pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname='public' AND c.relname='room_assignments' AND a.attname='deposit_amount';


-- ─────────────────────────────────────────────────────────────────────────────
-- 037 — every tenancy says one occupant, and water is billed from it
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

UPDATE room_assignments ra
SET    occupant_count = v.occupants,
       updated_at = now()
FROM  (VALUES
         ('1B',3),('1F',3),('2B',2),('2D',2),('3A',2),('3C',2),('3E',2),
         ('B1F',2),('B2B',2),('B2F',2),('F1',2),('F2B',2),('LF',2)
       ) AS v(unit, occupants)
JOIN   rooms r ON upper(r.room_number) = v.unit
WHERE  ra.room_id = r.id
  AND  ra.is_active = true
  AND  ra.occupant_count = 1;

COMMIT;

-- EXPECT 13 ROWS, none of them 1.
SELECT r.room_number, ra.occupant_count, r.capacity
FROM   room_assignments ra JOIN rooms r ON r.id = ra.room_id
WHERE  ra.is_active AND ra.occupant_count <> 1
ORDER  BY r.room_number;

-- EXPECT 2 ROWS: 1b and 1f, each 3 people in a 2-person unit. That is what her
-- ledger has said for eleven straight months. It is a fact about the property,
-- not an error in this file.
SELECT r.room_number, ra.occupant_count, r.capacity
FROM   room_assignments ra JOIN rooms r ON r.id = ra.room_id
WHERE  ra.is_active AND ra.occupant_count > r.capacity
ORDER  BY r.room_number;


-- ─────────────────────────────────────────────────────────────────────────────
-- 038 — one bill per tenant per period
-- ─────────────────────────────────────────────────────────────────────────────

-- EXPECT 0 ROWS. If any come back, STOP - the index below will fail, and
-- deciding which of two bills is real needs her, not this file.
SELECT tenant_profile_id, billing_period_start, bill_type, count(*)
FROM   bills GROUP BY 1,2,3 HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_bill_per_tenant_per_period
  ON public.bills (tenant_profile_id, billing_period_start, bill_type);

COMMENT ON INDEX public.idx_one_bill_per_tenant_per_period IS
  'Stops a double-tap on Pay raising the same bill twice. Both bill-raising '
  'paths read-then-insert with no transaction, because supabase-js cannot open '
  'one, so this index is the only guard that holds. Keyed on bill_type as well, '
  'because the enum allows a separate Rent and Water bill for one period; the '
  'race always produces two Combined rows with an identical period. If a '
  'cancelled or voided bill status is ever added, make this index partial on '
  'it, or a corrected bill can never be re-raised. See migration 038.';

-- EXPECT 1 ROW, the index above.
SELECT indexname, indexdef FROM pg_indexes
WHERE  schemaname='public' AND tablename='bills'
  AND  indexname='idx_one_bill_per_tenant_per_period';


-- ─────────────────────────────────────────────────────────────────────────────
-- AFTERWARDS
-- ─────────────────────────────────────────────────────────────────────────────
-- Run `npm run check:all` and read the summary table. Two ratchets in
-- check:ledger should come down on their own:
--
--     BR-033 anniversary vs ledger   29  ->  16
--     BR-014 headcount vs ledger     16  ->   3
--
-- Lower both baselines in backend/scripts/check-ledger-integrity.mjs to match,
-- so they keep guarding at the new level rather than leaving slack.
--
-- Then run 039 from its own file. After it, both void counts read 0, and the
-- ledger still reads 937 live rows and PHP 8,086,250.00 - unchanged, because
-- voided rows were never in that total.
