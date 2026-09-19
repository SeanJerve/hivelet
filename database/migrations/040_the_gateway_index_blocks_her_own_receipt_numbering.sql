-- 040 — one receipt cannot be split, because a gateway index forbids it
--
-- Two indexes replaced. No data, no columns, no money.
--
-- WHAT IS WRONG
-- -------------
-- Migration 024 made `transaction_reference` UNIQUE on `payments` and on
-- `monthly_income_records`, titled "One gateway reference, one payment". It was
-- right about the thing it was looking at: Adyen retries a notification until it
-- gets a 200, the handler reads-then-inserts, and only an index can refuse the
-- second write.
--
-- It did not look at the two paths that write that column for HER money, and
-- both of them write the same reference to SEVERAL ROWS on purpose.
--
--   1. `POST /admin/income-records` sets
--          const reference = transactionReference || invoiceNumber;
--      which is never null, and then inserts ONE PAYMENT ROW PER ALLOCATION
--      STEP. BR-013 produces more than one step whenever a receipt does not
--      exactly match one bill - the commonest case being an OVERPAYMENT, where
--      the plan is [against the bill] + [the remainder as an advance].
--
--      So: a resident owing 5,000 who hands over 6,000. Step one inserts.
--      Step two carries the same reference and the index refuses it. The income
--      row is already saved and 5,000 is already applied, so the request fails
--      PARTWAY - her ledger says 6,000 arrived and the tenant's account shows
--      5,000. The handler's own message admits it: "The income record was saved,
--      but 1,000.00 of it could not be applied to this tenant's account."
--
--   2. `record_income_for_months` (migration 029) inserts one row per month and
--      passes `p_transaction_reference` to every one of them. A receipt covering
--      three months with a typed reference is refused on the second row.
--
--      That one at least fails cleanly - it is a plpgsql function, so the whole
--      thing rolls back and nothing is recorded. She simply cannot enter it.
--
-- THE PART THAT MAKES THIS A CONTRADICTION RATHER THAN A BUG
-- ---------------------------------------------------------
-- One receipt number across several rows is not an edge case here, it is HOW
-- SHE KEEPS HER BOOK. `routes/admin.ts` states it as settled fact, from the 937
-- imported rows:
--
--     "A receipt covering several months is recorded as SEVERAL ROWS, one per
--      month ... `OR#4895` across four rows, `OR#4896` across three."
--
-- So the database was told to forbid the exact shape the ledger is built on.
-- Nothing caught it because the column is NULL on all 937 imported rows and no
-- receipt has ever been recorded through the application by a person.
--
-- WHAT THIS CHANGES
-- -----------------
-- Both indexes are re-created scoped to GATEWAY ROWS ONLY, which is what 024
-- actually wanted:
--
--     WHERE transaction_reference IS NOT NULL AND payment_method = 'Adyen Online'
--
-- That predicate is exact, not approximate. `payment_method_type` is
-- (Cash | GCash | Bank Transfer | Adyen Online), and the admin path cannot
-- produce the fourth: `normalizedMethod` maps everything to Cash, GCash or Bank
-- Transfer. Both Adyen insert sites write 'Adyen Online' literally, and
-- `settle_verified_payment` carries the payment's own method onto the income row
-- it creates - COALESCE(NULLIF(p_income->>'payment_method',''),
-- v_payment.payment_method), read from migration 018's source rather than from a
-- comment about it.
--
-- Adyen idempotency is therefore untouched: a retried pspReference still cannot
-- create a second payment row.
--
-- WHAT IS GIVEN UP, STATED PLAINLY
-- --------------------------------
-- Two different hand-entered receipts may now carry the same typed reference.
-- That was never what 024 was guarding - and it can be legitimate, because one
-- GCash transfer can pay two months. Her receipt NUMBERING is still guarded, by
-- `idx_one_receipt_per_unit_per_month` (migration 033), which is the index that
-- actually models her book.
--
-- NOTHING VIOLATES THE NEW PREDICATE. Checked before writing: 8 'Adyen Online'
-- payments with 8 distinct references, and every one of the 972 income rows has
-- a NULL reference.
--
-- HOW TO RUN IT
-- -------------
-- Safe to run any time; it changes no rows. Run the two SELECTs first - both
-- must return 0. If either does not, STOP.
--
-- UNDO
-- ----
--     DROP INDEX public.uq_payments_transaction_reference;
--     DROP INDEX public.uq_income_transaction_reference;
--   then re-create both without the payment_method predicate, as in 024.

-- Expect 0.
SELECT transaction_reference, count(*) AS n
FROM   payments
WHERE  transaction_reference IS NOT NULL AND payment_method = 'Adyen Online'
GROUP  BY transaction_reference HAVING count(*) > 1;

-- Expect 0.
SELECT transaction_reference, count(*) AS n
FROM   monthly_income_records
WHERE  transaction_reference IS NOT NULL AND payment_method = 'Adyen Online'
GROUP  BY transaction_reference HAVING count(*) > 1;

BEGIN;

DROP INDEX IF EXISTS public.uq_payments_transaction_reference;
DROP INDEX IF EXISTS public.uq_income_transaction_reference;

CREATE UNIQUE INDEX uq_payments_gateway_reference
  ON public.payments (transaction_reference)
  WHERE transaction_reference IS NOT NULL AND payment_method = 'Adyen Online';

CREATE UNIQUE INDEX uq_income_gateway_reference
  ON public.monthly_income_records (transaction_reference)
  WHERE transaction_reference IS NOT NULL AND payment_method = 'Adyen Online';

COMMENT ON INDEX public.uq_payments_gateway_reference IS
  'One Adyen pspReference, one payment row. Scoped to gateway rows because the '
  'on-site path writes ONE reference across SEVERAL payment rows on purpose - '
  'BR-013 splits a receipt into one row per bill plus an advance - and the '
  'unscoped version of this index (migration 024) refused the second row and '
  'failed the request partway. See migration 040.';

COMMENT ON INDEX public.uq_income_gateway_reference IS
  'One Adyen pspReference, one income row. Scoped to gateway rows because a '
  'receipt covering several months is recorded as several rows carrying the same '
  'reference - OR#4895 across four - which is how the owner keeps her book. See '
  'migration 040.';

COMMIT;

-- Expect 2 rows, both scoped.
SELECT indexname, indexdef FROM pg_indexes
WHERE  schemaname='public'
  AND  indexname IN ('uq_payments_gateway_reference','uq_income_gateway_reference');
