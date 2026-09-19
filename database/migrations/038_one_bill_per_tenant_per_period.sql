-- 038 — two taps on "Pay" can raise the same bill twice
--
-- One index. No data, no columns, no money.
--
-- WHAT IS WRONG
-- -------------
-- A bill is raised ON DEMAND, not by a scheduler - a deliberate call recorded
-- in `docs/13_AUDIT_JUDGEMENT_LOG.md` section 3. Two code paths do it, and
-- both have the same shape:
--
--   backend/src/routes/tenant.ts     POST /tenant/payments/checkout
--   backend/src/services/adyenService.ts   when a notification arrives with no
--                                          bill attached to the session
--
-- Each one reads the tenant's bills, finds nothing unpaid, and INSERTS. There
-- is no transaction around the pair and there was no constraint behind it, so
-- two requests that interleave both see "no unpaid bills" and both insert. A
-- resident who double-taps Pay gets two bills for the same month.
--
-- supabase-js cannot open a transaction, so check-then-write is racy by
-- construction here. This is the same defect, in the same shape, as the
-- double-click that recorded one receipt five times - fixed by migration 033
-- with a partial unique index, because an index is the only guard that holds
-- when the check and the write cannot be atomic.
--
-- WHY IT HAS NOT HAPPENED
-- -----------------------
-- `bills` holds TWO rows, both Paid, no duplicates - checked before writing
-- this. No tenant has ever paid through the portal. The whole 937-row ledger
-- is imported, and the two bills are from testing. The guard is going in
-- before the rehearsal rather than after it.
--
-- WHY THIS SHAPE
-- --------------
-- `(tenant_profile_id, billing_period_start, bill_type)`.
--
-- `bill_type_enum` is `Rent, Water, Combined, Other`, so the schema clearly
-- anticipates a tenant having a separate rent bill and water bill for the same
-- period. Keying on the type allows that and still blocks what the race
-- produces, which is always two `Combined` rows with an identical period -
-- both computed from the same anniversary on the same day.
--
-- NOT partial. `bill_status_type` is `Pending, Due, Overdue, Paid, Partially
-- Paid` - there is no cancelled or voided state, so there is no row that ought
-- to stop counting. If a void status is ever added, this index must become
-- partial on it, or a corrected bill could never be re-raised.
--
-- THE CODE HALF IS SEPARATE AND IS ALREADY DONE
-- ---------------------------------------------
-- An index alone turns the race into a 500. Both insert sites now catch 23505
-- on this index and re-read the bill the other request just created, which is
-- the honest outcome: the tenant wanted a bill for this period, and there is
-- one. Same handling as `receiptAlreadyRecorded()` for migration 033.
--
-- HOW TO RUN IT
-- -------------
-- Safe to run any time. It creates no lock worth worrying about on a two-row
-- table, and it will fail loudly rather than silently if a duplicate exists.
-- The SELECT before it should return 0 rows; if it does not, STOP.

-- Expect: 0 rows. If any come back, the index below will fail - resolve them
-- with her first, because deciding which of two bills is real is not a thing
-- this file can do.
SELECT tenant_profile_id, billing_period_start, bill_type, count(*)
FROM   bills
GROUP  BY 1, 2, 3
HAVING count(*) > 1;

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

-- Expect: one row, the index above.
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'bills'
  AND indexname = 'idx_one_bill_per_tenant_per_period';
