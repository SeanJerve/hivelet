-- 041 — Linda's fixed water lands in the wrong column on every write path
--
-- One trigger. No data, no schema, no money already recorded.
--
-- WHAT IS WRONG
-- -------------
-- BR-040 puts LF and LB on a FIXED monthly water charge, and the ledger records
-- it in its own column. All 26 historical Linda rows read:
--
--     water_payment = 0,  linda_water_charge = 200 or 400,  is_linda_billing = true
--
-- **Nothing in `backend/src` has ever written those last two columns.** Grep
-- returns them only in `incomeReportExport.ts`, which READS them.
-- `computeWaterFee()` correctly returns the fixed amount with
-- `basis: 'linda-fixed'`, and all three callers discard the basis and write the
-- amount into `water_payment` like anyone else's.
--
-- WHY THAT DOES NOT STAY A TIDINESS PROBLEM
-- -----------------------------------------
--   * `remitted_amount` is GENERATED ALWAYS AS (rent_amount + water_payment) -
--     read from `pg_attribute`, not assumed - so Linda's water would be folded
--     into a figure NOBODY CAN CORRECT BY HAND.
--   * The Monthly Income Report builds Linda's separate line from
--     `linda_water_charge`. That line would read zero while the money sat in the
--     ordinary totals - and the whole point of the Linda section is that she is
--     kept OUT of those.
--   * A row recorded through the form would not look like any of the 26 rows
--     already in her book.
--
-- `incomeReportExport.ts` states the precondition out loud:
--
--     "remitted_amount is a GENERATED column - rent_amount + water_payment -
--      and for these units water_payment is 0."
--
-- That is exactly the shape CLAUDE.md warns about. It was TRUE of the imported
-- data and FALSE of anything the application would have written. The comment
-- would have gone on asserting the conclusion.
--
-- WHY A TRIGGER RATHER THAN FIXING THE CALLERS
-- --------------------------------------------
-- I wrote the caller-by-caller version first and threw it away. There are FOUR
-- write paths - the single-month insert, `record_income_for_months`,
-- `settle_verified_payment`, and the ledger edit - and two of them are Postgres
-- functions with fixed column lists, so the fix needed two function rewrites as
-- well as three code changes. Five places that must all remember one rule, and a
-- sixth the next time someone adds a write path.
--
-- `settle_verified_payment` made the point: its INSERT names its columns
-- explicitly and simply ignores any other key handed to it, so the obvious code
-- fix there does nothing at all. Checked, not assumed.
--
-- One trigger makes the rule true BY CONSTRUCTION, for every path that exists
-- and every path anyone adds. That is already how this database treats derived
-- money: `remitted_amount` and `fifty_percent_share` are generated columns, and
-- `trg_update_expense_total` keeps an expense total equal to its allocations.
-- This is the same idea applied to a rule the application kept forgetting.
--
-- WHAT IT DOES, PRECISELY
-- -----------------------
-- On INSERT or UPDATE of `monthly_income_records`, if the row's unit is flagged
-- `rooms.is_linda_unit`, any amount sitting in `water_payment` is moved to
-- `linda_water_charge` and `is_linda_billing` is set. If the unit is NOT a Linda
-- unit, the reverse: a stray `linda_water_charge` is folded back and the flag
-- cleared, so an edit that moves a receipt OFF a Linda unit cannot leave a stale
-- charge behind.
--
-- It does not invent money. The total of the two columns is preserved exactly;
-- only which column holds it changes.
--
-- The unit's Linda status is read from `rooms.is_linda_unit`, which is the
-- column the rest of the system already uses, rather than from a list of codes.
--
-- NOTHING CHANGES TODAY. All 972 existing rows already satisfy this - checked
-- below before the trigger is created - so it is a guard on future writes, not a
-- correction of past ones.
--
-- HOW TO RUN IT
-- -------------
-- Run the SELECT first; it must return 0. Then the trigger. Safe any time.
--
-- UNDO
-- ----
--     DROP TRIGGER trg_route_linda_water ON public.monthly_income_records;
--     DROP FUNCTION public.route_linda_water();

-- Expect 0 rows: no existing row has its water in the wrong column.
SELECT r.room_number, m.year, m.month, m.water_payment, m.linda_water_charge, r.is_linda_unit
FROM   monthly_income_records m
JOIN   rooms r ON r.id = m.room_id
WHERE  (r.is_linda_unit AND m.water_payment <> 0)
   OR  (NOT r.is_linda_unit AND COALESCE(m.linda_water_charge, 0) <> 0);

BEGIN;

CREATE OR REPLACE FUNCTION public.route_linda_water()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_is_linda boolean;
BEGIN
  SELECT COALESCE(is_linda_unit, false) INTO v_is_linda
    FROM public.rooms WHERE id = NEW.room_id;

  IF v_is_linda IS NULL THEN
    RETURN NEW;                      -- no unit resolved; leave the row alone
  END IF;

  IF v_is_linda THEN
    -- BR-040: the charge belongs in Linda's own column. Move it, never add it.
    NEW.linda_water_charge := COALESCE(NEW.linda_water_charge, 0)
                            + COALESCE(NEW.water_payment, 0);
    NEW.water_payment      := 0;
    NEW.is_linda_billing   := true;
  ELSE
    -- A receipt edited OFF a Linda unit must not keep the fixed charge.
    NEW.water_payment      := COALESCE(NEW.water_payment, 0)
                            + COALESCE(NEW.linda_water_charge, 0);
    NEW.linda_water_charge := 0;
    NEW.is_linda_billing   := false;
  END IF;

  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_route_linda_water ON public.monthly_income_records;

CREATE TRIGGER trg_route_linda_water
  BEFORE INSERT OR UPDATE OF water_payment, linda_water_charge, room_id, is_linda_billing
  ON public.monthly_income_records
  FOR EACH ROW EXECUTE FUNCTION public.route_linda_water();

COMMENT ON FUNCTION public.route_linda_water() IS
  'BR-040. Keeps a Linda unit''s fixed water in linda_water_charge and out of '
  'water_payment, which feeds the GENERATED remitted_amount and the ordinary '
  'totals Linda is deliberately excluded from. Exists because four separate '
  'write paths each had to remember this and none of them did - two of them are '
  'functions with fixed column lists that silently ignore the extra keys. Moves '
  'money between columns; never creates or destroys it. See migration 041.';

COMMIT;

-- Expect 1 row: the trigger.
SELECT t.tgname, p.proname
FROM   pg_trigger t
JOIN   pg_class c ON c.oid = t.tgrelid
JOIN   pg_proc p  ON p.oid = t.tgfoid
WHERE  c.relname = 'monthly_income_records' AND NOT t.tgisinternal
  AND  t.tgname = 'trg_route_linda_water';

-- Expect 0 rows, still. The trigger fires on writes; it has not touched anything.
SELECT count(*) AS rows_now_in_the_wrong_column
FROM   monthly_income_records m
JOIN   rooms r ON r.id = m.room_id
WHERE  (r.is_linda_unit AND m.water_payment <> 0)
   OR  (NOT r.is_linda_unit AND COALESCE(m.linda_water_charge, 0) <> 0);
