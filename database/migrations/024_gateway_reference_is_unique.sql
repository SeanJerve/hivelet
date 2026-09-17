-- ============================================================================
-- 024  One gateway reference, one payment
--
-- WHAT WAS UNGUARDED
-- ------------------
-- `adyenWebhookHandler` is idempotent by `pspReference`, and says so: Adyen
-- retries a notification until it receives a 200, so the handler stores the
-- reference as `transaction_reference` and looks for it before inserting.
--
-- That check is a READ FOLLOWED BY A WRITE, and there was **no index on
-- `transaction_reference` at all** - not unique, not even plain. Nothing in the
-- database stopped two inserts carrying the same reference.
--
-- The window is narrow and it is exactly the window that retries live in. Adyen
-- retries when it does not get a timely 200 - that is, when the first attempt is
-- still running. Two handlers then read "not found" at the same moment and both
-- insert, and the property has been paid once and credited twice.
--
-- Nothing has gone wrong yet: 15 payments, 15 distinct references, checked
-- before writing this.
--
-- WHY AN INDEX RATHER THAN BETTER CODE
-- ------------------------------------
-- No amount of checking-before-inserting closes a race between two connections.
-- Only the database can refuse the second write, and a unique index is how it
-- refuses. The handler's existing check stays - it is what turns the common case
-- into a clean `duplicate` outcome instead of an error - and this is what
-- catches the case the check cannot see.
--
-- On `monthly_income_records` for the same reason. That column is NULL on all
-- 937 rows today, because every one came from the 2026-08-28 import and no
-- income row has ever been written by the application. The settlement path DOES
-- write it, and that path guards the same way: read for an existing row by
-- reference, then insert.
--
-- PARTIAL, on `IS NOT NULL`. Postgres does not treat NULLs as equal, so a plain
-- unique index would already permit many NULL rows - the predicate is for size
-- and for saying plainly which rows this is about.
--
-- REVERSIBLE: `DROP INDEX public.uq_payments_transaction_reference;` and the
-- same for the income one.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_transaction_reference
  ON public.payments (transaction_reference)
  WHERE transaction_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_income_transaction_reference
  ON public.monthly_income_records (transaction_reference)
  WHERE transaction_reference IS NOT NULL;

COMMENT ON INDEX public.uq_payments_transaction_reference IS
  'One gateway reference, one payment. Adyen retries until it gets a 200, and the '
  'handler''s read-then-write check cannot close a race between two connections. '
  'Migration 024.';

COMMENT ON INDEX public.uq_income_transaction_reference IS
  'One gateway reference, one income row. Same reasoning as the payments index. '
  'Migration 024.';
