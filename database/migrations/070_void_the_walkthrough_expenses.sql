-- =============================================================================
-- 070 - void the two expenses the testing-day walkthrough left in her books
-- =============================================================================
-- NOT APPLIED YET. Written 2026-10-01 01:40 Manila by Claude (Lloyd's machine)
-- from a read-only look at the live database; Sean approved it the same night.
-- This machine has no database connection: `npm run backup`, then paste this
-- file into the Supabase SQL editor and run it. B-91 in BLOCKED_FOR_SEAN.md.
--
-- WHAT THEY ARE
-- Part A, case A-28 (walkthrough step 22 and 22b): "Monthly Expenses: PHP 100
-- REHEARSAL, edit, split 60/40, delete". The Activity log for 30 Sep shows two
-- EXPENSE_CREATE entries by the owner's account at 22:50 Manila and no
-- EXPENSE_UPDATE or EXPENSE_VOID after them: the split was typed as two separate
-- expenses and neither was deleted. They are still live, so September's
-- Operating expenses read PHP 100 more than she spent:
--   * 93aa521a-43ab-46a9-9680-de06d11c2f53  2026-09-30  "0r551"  category 2  PHP 60
--   * 16f2ae62-ccc6-4640-9631-518912ca6fdf  2026-09-30  "0r555"  category 1  PHP 40
-- 60 + 40 is the case's PHP 100 split 60/40; created 14:50:39 UTC, 0.04 s
-- apart, one minute before the walkthrough's workbook download (A-29, 22:51).
--
-- WHY A VOID, NOT A DELETE (unlike 039 and 069)
-- A void is what the Delete button does on her screen (admin.ts, EXPENSE_VOID):
-- the rows leave every total at once but stay in the table, marked, and can be
-- restored by clearing voided_at if they turn out to be hers after all. Sean can
-- still hard-delete them later as 039 did once they are confirmed as debris.
-- Named by id only, never by pattern. Their allocations stay with them.
-- WHAT STAYS: both rows (voided) and every audit_logs row.
--
-- SAFETY: stops, changing nothing, if either row is not exactly what it was
-- read to be (amount, supplier text, date, not voided). One DO block; an error
-- anywhere undoes it all. A second run finds nothing and says so.
--
-- AFTERWARDS: Monthly Expenses, September 2026, is PHP 100 lower (voided rows
-- count in no total); income totals
-- unchanged (Remitted PHP 8,222,900.00 as after 066).
-- =============================================================================

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM monthly_expense_entries
   WHERE id IN ('93aa521a-43ab-46a9-9680-de06d11c2f53', '16f2ae62-ccc6-4640-9631-518912ca6fdf')
     AND voided_at IS NULL;
  IF n = 0 THEN
    RAISE NOTICE '070: both walkthrough expenses are already voided or gone. Nothing to do.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM monthly_expense_entries
                  WHERE id = '93aa521a-43ab-46a9-9680-de06d11c2f53' AND total_expenses = 60
                    AND invoice_supplier = '0r551' AND expense_date = DATE '2026-09-30' AND voided_at IS NULL)
     OR NOT EXISTS (SELECT 1 FROM monthly_expense_entries
                  WHERE id = '16f2ae62-ccc6-4640-9631-518912ca6fdf' AND total_expenses = 40
                    AND invoice_supplier = '0r555' AND expense_date = DATE '2026-09-30' AND voided_at IS NULL) THEN
    RAISE EXCEPTION '070: a row is not the walkthrough expense it was read to be (checked 2026-10-01). Nothing changed.';
  END IF;

  UPDATE monthly_expense_entries
     SET voided_at = NOW(),
         void_reason = 'Testing-day walkthrough A-28 (30 Sep 2026), not a real expense - migration 070'
   WHERE id IN ('93aa521a-43ab-46a9-9680-de06d11c2f53', '16f2ae62-ccc6-4640-9631-518912ca6fdf')
     AND voided_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN
    RAISE EXCEPTION '070: expected to void 2 expenses, would void %. Nothing changed.', n;
  END IF;
  RAISE NOTICE '070: voided the 2 walkthrough expenses (PHP 60 and PHP 40).';
END $$;
