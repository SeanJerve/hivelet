-- ============================================================================
-- Migration 017 - retire the Linda fixed electricity charge, closing OD-18
-- ============================================================================
-- OD-18 recorded a contradiction: `system_settings.linda_lb_electricity_charge`
-- held '325' and named **LB**, while 31 months of ledger data charged electricity
-- to **LF** (every month, min P325, max P2,285.76) and to LB **never** - and the
-- owner's own spreadsheet agreed with the ledger, not the setting.
--
-- The client resolved it on 2026-09-13, and the answer was neither unit:
--
--   "we can remove the fixed 325 since that was just for the units that doesn't
--    have an electricity meter. also we don't have to worry about the electricity
--    recording for those that doesn't have a meter, since on excel we can't
--    control and change that, and in the future when the client uses this website
--    system to record they will not include that anymore - that's outside our
--    scope."
--
-- So the flat charge was a workaround for unmetered units, not a rate attached to
-- a particular unit. It is retired rather than reassigned. Going forward the
-- system does not record a fixed electricity charge for any unit.
--
-- WHAT THIS DOES AND DOES NOT TOUCH
--
--   * Deletes the `linda_lb_electricity_charge` settings row. Its value was '325';
--     it is recorded here so the deletion is reversible from this file alone.
--
--   * **Keeps `monthly_income_records.linda_electricity_charge` and every figure
--     in it.** Those 31 rows against LF total P12,035.76 and are real money that
--     was really collected. BR-003 preserves history. The column is re-documented
--     as historical-only: read it for past periods, never write it for new ones.
--
--   * Leaves the two Linda **water** settings alone. Those are correct and
--     corroborated - across 31 months LF is charged exactly P400/month and LB
--     exactly P200/month, matching `linda_lf_water_charge` and
--     `linda_lb_water_charge`. BR-040's fixed *water* rule stands.
--
-- BR-040 is errata: it describes "a flat electricity charge plus a fixed water
-- charge per unit". Only the second half survives.
--
-- Changes no financial amount. Deletes one settings row.
-- ============================================================================

BEGIN;

DELETE FROM public.system_settings WHERE key = 'linda_lb_electricity_charge';

COMMENT ON COLUMN public.monthly_income_records.linda_electricity_charge IS
  'HISTORICAL ONLY. A flat electricity charge that was applied to units without their '
  'own electricity meter, retired 2026-09-13 (OD-18). Existing rows are real money that '
  'was really collected and are preserved under BR-003 - 31 rows against LF totalling '
  'P12,035.76, and none against LB. **Do not write this column for new periods.** The '
  'client has confirmed that unmetered electricity will not be recorded in this system, '
  'and the corresponding system_settings key has been deleted.';

COMMENT ON COLUMN public.monthly_income_records.linda_water_charge IS
  'Fixed monthly water charge for a Linda unit (BR-040). Still in force: LF P400/month '
  'and LB P200/month, both corroborated by 31 months of ledger data and by the owner''s '
  'spreadsheet. Unlike the retired electricity charge, this rule stands.';

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $mig017$
DECLARE
  v_setting   int;
  v_water     int;
  v_hist_rows int;
  v_hist_sum  numeric;
BEGIN
  SELECT count(*) INTO v_setting
    FROM public.system_settings WHERE key = 'linda_lb_electricity_charge';

  SELECT count(*) INTO v_water
    FROM public.system_settings
   WHERE key IN ('linda_lf_water_charge', 'linda_lb_water_charge');

  SELECT count(*), coalesce(sum(linda_electricity_charge), 0)
    INTO v_hist_rows, v_hist_sum
    FROM public.monthly_income_records
   WHERE linda_electricity_charge > 0 AND voided_at IS NULL;

  RAISE NOTICE '017 VERIFY: electricity setting rows = % (expected 0)', v_setting;
  RAISE NOTICE '017 VERIFY: Linda water settings intact = % of 2', v_water;
  RAISE NOTICE '017 VERIFY: historical electricity rows preserved = % totalling %', v_hist_rows, v_hist_sum;

  IF v_setting <> 0 THEN
    RAISE EXCEPTION '017 FAILED: the electricity setting is still present';
  END IF;
  IF v_water <> 2 THEN
    RAISE EXCEPTION '017 FAILED: expected both Linda water settings, found %', v_water;
  END IF;
  IF v_hist_rows = 0 THEN
    RAISE EXCEPTION '017 FAILED: historical electricity figures were lost - they must be preserved';
  END IF;

  RAISE NOTICE '017 OK: fixed electricity retired, water rules intact, history preserved.';
END
$mig017$;
