-- ============================================================================
-- Migration 016 - there is no grace period, closing OD-16
-- ============================================================================
-- OD-16 asked whether the seeded 7-day grace window and BR-012 could be
-- reconciled with OD-03's answer that late payment is not accepted. The owner
-- settled it on 2026-09-13:
--
--   "there is no grace period. they do not accept late payments. it's just, i
--    think, a mistake that an AI does upon building this website."
--
-- So `grace_period_days = '7'` was never a business rule. It was invented during
-- the original build and then written up as though it were policy, which is how
-- it came to have a BR- number attached to it. BR-012 is errata.
--
-- What this migration does, and deliberately does not do:
--
--   * Sets the seeded value to '0' rather than deleting the key. The key stays so
--     that BR-012 remains traceable to something, so reports that read it do not
--     break, and so the answer is recorded as a value rather than as an absence.
--     Zero days of grace is the honest encoding of "no grace period".
--
--   * Rewrites the meaning of `bills.grace_period_end_date` through a COMMENT
--     rather than dropping the column. It is NOT NULL, it is selected by
--     `backend/src/routes/tenant.ts:78`, and dropping it would break the tenant
--     billing view for no functional gain. From here it equals `due_date`.
--
--   * **Leaves the two existing bills alone.** Both are already `Paid` and both
--     carry the 7-day window they were issued under. BR-003 preserves history;
--     a bill's terms are the terms it was issued on, and back-dating them would
--     falsify the record to tidy a column.
--
-- Touches one settings row. Changes no financial amount.
-- ============================================================================

BEGIN;

UPDATE public.system_settings
   SET value       = '0',
       label       = 'Payment grace period (days) - none',
       description = 'Zero. Late payment is not accepted (OD-03, OD-16, confirmed '
                  || '2026-09-13). The previous value of 7 was introduced during the '
                  || 'original build and was never a rule of this business. Kept as a '
                  || 'settings key so BR-012 stays traceable and so billing code has a '
                  || 'single place to read the policy from rather than hardcoding it.',
       updated_at  = NOW()
 WHERE key = 'grace_period_days';

COMMENT ON COLUMN public.bills.grace_period_end_date IS
  'End of the payment grace window for THIS bill. There is no grace period in this '
  'business (OD-16, 2026-09-13), so for every bill issued from that date onward this '
  'equals due_date. Older rows keep the window they were issued under - a bill''s '
  'terms are the terms it was issued on (BR-003). The column is retained rather than '
  'dropped because it is NOT NULL and is read by the tenant billing view.';

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $mig016$
DECLARE
  v_value text;
  v_legacy int;
BEGIN
  SELECT value INTO v_value FROM public.system_settings WHERE key = 'grace_period_days';

  SELECT count(*) INTO v_legacy
    FROM public.bills WHERE grace_period_end_date > due_date;

  RAISE NOTICE '016 VERIFY: grace_period_days = %', v_value;
  RAISE NOTICE '016 VERIFY: pre-existing bills still carrying a grace window = % (expected, not rewritten)', v_legacy;

  IF v_value IS DISTINCT FROM '0' THEN
    RAISE EXCEPTION '016 FAILED: grace_period_days is %, expected 0', v_value;
  END IF;

  RAISE NOTICE '016 OK: no grace period; historical bills left intact.';
END
$mig016$;
