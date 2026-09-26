-- =============================================================================
-- 055 - remove every GCash test payment and the demo profiles' records
-- =============================================================================
-- NOT APPLIED by the author. Run DIAGNOSTIC_test_data_before_055.sql first
-- and read it; then `npm run backup`; then run this.
--
-- Sean's decision, 2026-09-26: "removing everything that doesn't happen in
-- real life, all transactions we did on testing ... you have 1000% of my
-- permission."
--
-- WHAT GOES
-- ----------------------------------------------------------------------------
-- 1. Every payment with payment_method 'Adyen Online'. The gateway only ever
--    talks to Adyen's TEST host (backend/src/services/adyenService.ts,
--    ADYEN_CHECKOUT_HOST = checkout-test.adyen.com), so no such row can be
--    real money. That includes the two test payments of 2026-09-26
--    (NDQW3Z5ZQL8MNB75 and the P8,200 retest), both rejected by Sean, which
--    otherwise sit in real tenants' histories as "Not accepted - pay it
--    again".
-- 2. Every ledger row written by verifying one (payment_method 'Adyen
--    Online' in monthly_income_records). Expected to be none; if the
--    diagnostic lists any, they were test money counted as income.
--    And every VOIDED ledger row, with the on-site payment rows it wrote. There
--    is one: unit 1a's cash receipt recorded during testing on 2026-09-22 and
--    voided minutes later (Chapter 4, 4.3.2). A void already says "this did not
--    happen"; the row stayed as history, and its two payment rows stayed
--    Verified, so 1a's real bill still reads Paid (B-75).
-- 2b. Any real tenant's bill that one of those payments had marked Paid or
--    Partially Paid goes back to what its remaining verified payments make it
--    (Due when there are none), the same rule 054 applies on a void.
-- 3. The payments, bills, tenancies and notifications of the demo
--    profiles: Mark Cruz (22222222-..., deactivated by 049, whose fake 1a
--    tenancy overlaps Lobby Toor's - B-73), and the five test accounts of
--    047 if 047 has not removed them yet.
-- 4. Notifications that exist only because of those payments: anything
--    pointing at a removed payment, every "Online payment ..." notice, and
--    every "Payment Verification Declined".
--
-- WHAT STAYS, ON PURPOSE
-- ----------------------------------------------------------------------------
-- * Real tenants' BILLS, including ones a test checkout raised. A bill is
--   the rent owed for a period, worked out from her own records (unit 1D
--   owes 9 Aug to 8 Sep whoever pressed the button), not a transaction.
-- * Every cash payment and every one of her 937 imported receipts.
-- * The profiles themselves. Deleting a profile that audit_logs names means
--   blanking who did what on those rows (053 did it for 7 rows; Mark Cruz
--   is the actor on 902). Deactivated and with nothing left, they show
--   nowhere.
-- * audit_logs. Append-only by design: the trail of the testing stays, and
--   this migration adds one entry saying what was removed and why, the way
--   043 corrected the record instead of editing it.
--
-- SAFETY
-- ----------------------------------------------------------------------------
-- Before deleting anything, every foreign key in the database that points
-- at payments, bills, room_assignments or monthly_income_records is read
-- from pg_constraint, and each is checked for rows that point at something
-- being removed without being removed themselves. Any such row stops the
-- whole migration with its table and column named: nothing is deleted
-- until the answer is "nothing real depends on this". All in one
-- transaction; an error anywhere undoes everything.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE _demo ON COMMIT DROP AS
  SELECT id FROM profiles
  WHERE (id = '22222222-2222-2222-2222-222222222222' AND full_name = 'Mark Cruz')
     OR id IN ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
               'a8305b4f-c98a-4241-be13-ff507826b2ba', '318cfbc2-7180-45ac-aaa0-6e4c49054c1c',
               '99ef1471-cbf0-4d21-9701-8e173b07e222');

CREATE TEMP TABLE _t_monthly_income_records ON COMMIT DROP AS
  SELECT id, room_id, invoice_number, transaction_reference FROM monthly_income_records
  WHERE payment_method::text = 'Adyen Online'
     OR tenant_profile_id IN (SELECT id FROM _demo)
     OR voided_at IS NOT NULL;

-- A voided receipt's on-site payment rows carry its number as their reference
-- (admin.ts: `reference = transactionReference || invoiceNumber`), same unit.
CREATE TEMP TABLE _t_payments ON COMMIT DROP AS
  SELECT p.id, p.bill_id FROM payments p
  WHERE p.payment_method::text = 'Adyen Online'
     OR p.tenant_profile_id IN (SELECT id FROM _demo)
     OR EXISTS (
          SELECT 1 FROM monthly_income_records v
          WHERE v.voided_at IS NOT NULL
            AND v.room_id = p.room_id
            AND p.transaction_reference IN (v.invoice_number, v.transaction_reference));

CREATE TEMP TABLE _t_bills ON COMMIT DROP AS
  SELECT id FROM bills WHERE tenant_profile_id IN (SELECT id FROM _demo);

CREATE TEMP TABLE _t_room_assignments ON COMMIT DROP AS
  SELECT id FROM room_assignments WHERE tenant_profile_id IN (SELECT id FROM _demo);

CREATE TEMP TABLE _t_notifications ON COMMIT DROP AS
  SELECT id FROM notifications
  WHERE recipient_profile_id IN (SELECT id FROM _demo)
     OR related_entity_id::text IN (SELECT id::text FROM _t_payments)
     OR (type::text = 'Payment'
         AND (title ILIKE 'online payment%' OR title = 'Payment Verification Declined'));

-- Bills a removed payment had settled, and what they read once it is gone.
CREATE TEMP TABLE _t_restatus ON COMMIT DROP AS
  SELECT b.id,
         CASE WHEN coalesce(k.kept, 0) <= 0 THEN 'Due'
              WHEN k.kept < b.total_amount - 0.005 THEN 'Partially Paid'
              ELSE 'Paid' END AS new_status
  FROM bills b
  LEFT JOIN LATERAL (
    SELECT sum(p.amount) AS kept FROM payments p
    WHERE p.bill_id = b.id AND p.verification_status::text = 'Verified'
      AND p.id NOT IN (SELECT id FROM _t_payments)
  ) k ON true
  WHERE b.id IN (SELECT bill_id FROM _t_payments WHERE bill_id IS NOT NULL)
    AND b.id NOT IN (SELECT id FROM _t_bills)
    AND b.status::text IN ('Paid', 'Partially Paid');

-- Nothing real may point at anything being removed.
DO $$
DECLARE
  fk record;
  target_of_parent text;
  target_of_child text;
  n bigint;
BEGIN
  FOR fk IN
    SELECT c.conname,
           child.relname  AS child_table,
           a.attname      AS child_column,
           parent.relname AS parent_table
    FROM pg_constraint c
    JOIN pg_class child  ON child.oid = c.conrelid
    JOIN pg_class parent ON parent.oid = c.confrelid
    JOIN pg_namespace ns ON ns.oid = parent.relnamespace AND ns.nspname = 'public'
    JOIN pg_attribute a  ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND array_length(c.conkey, 1) = 1
      AND parent.relname IN ('payments', 'bills', 'room_assignments', 'monthly_income_records')
  LOOP
    target_of_parent := '_t_' || fk.parent_table;
    target_of_child := CASE WHEN fk.child_table IN
      ('payments', 'bills', 'room_assignments', 'monthly_income_records', 'notifications')
      THEN '_t_' || fk.child_table END;

    EXECUTE format(
      'SELECT count(*) FROM public.%I s WHERE s.%I IN (SELECT id FROM %I)%s',
      fk.child_table, fk.child_column, target_of_parent,
      CASE WHEN target_of_child IS NOT NULL
           THEN format(' AND s.id NOT IN (SELECT id FROM %I)', target_of_child) ELSE '' END
    ) INTO n;

    IF n > 0 THEN
      RAISE EXCEPTION
        '055 stopped, nothing deleted: % row(s) of %.% (constraint %) point at % rows being removed, and are not being removed themselves. Send this message.',
        n, fk.child_table, fk.child_column, fk.conname, fk.parent_table;
    END IF;
  END LOOP;
END $$;

-- The record of what is about to go, written before it goes.
INSERT INTO audit_logs (action, entity_type, entity_id, new_values, ip_address)
SELECT 'AUDIT_CORRECTION',
       'PAYMENT',
       '00000000-0000-0000-0000-000000000000',
       jsonb_build_object(
         'note',   'Removed the test data of development: every GCash payment made against Adyen''s test account, any ledger row written by verifying one, and the demo profiles'' payments, bills, tenancies and notifications. No real money was involved in any of it.',
         'why',    'The gateway only talks to Adyen''s test host, so no Adyen Online row is real money. Test payments were showing in real tenants'' histories as "Not accepted".',
         'counts', jsonb_build_object(
           'payments',               (SELECT count(*) FROM _t_payments),
           'monthly_income_records', (SELECT count(*) FROM _t_monthly_income_records),
           'bills',                  (SELECT count(*) FROM _t_bills),
           'room_assignments',       (SELECT count(*) FROM _t_room_assignments),
           'notifications',          (SELECT count(*) FROM _t_notifications),
           'bills_back_to_due',      (SELECT count(*) FROM _t_restatus WHERE new_status <> 'Paid')),
         'references', (SELECT coalesce(jsonb_agg(transaction_reference), '[]'::jsonb)
                        FROM payments WHERE id IN (SELECT id FROM _t_payments)
                          AND transaction_reference IS NOT NULL),
         'kept',   'audit_logs rows about the testing are kept (append-only); profiles are kept, deactivated.',
         'reference', 'migration 055, Sean''s decision 2026-09-26'
       ),
       NULL
-- Only when there is something to remove: a second run records nothing.
WHERE (SELECT count(*) FROM _t_payments) + (SELECT count(*) FROM _t_monthly_income_records)
    + (SELECT count(*) FROM _t_bills) + (SELECT count(*) FROM _t_room_assignments)
    + (SELECT count(*) FROM _t_notifications) > 0;

-- Children before parents.
DELETE FROM notifications          WHERE id IN (SELECT id FROM _t_notifications);
DELETE FROM monthly_income_records WHERE id IN (SELECT id FROM _t_monthly_income_records);
DELETE FROM payments               WHERE id IN (SELECT id FROM _t_payments);
DELETE FROM bills                  WHERE id IN (SELECT id FROM _t_bills);
DELETE FROM room_assignments       WHERE id IN (SELECT id FROM _t_room_assignments);

UPDATE bills b
   SET status = r.new_status::bill_status_type, updated_at = NOW()
  FROM _t_restatus r
 WHERE b.id = r.id AND b.status::text <> r.new_status;

-- Nothing left of any of it, or nothing commits.
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM payments WHERE payment_method::text = 'Adyen Online';
  IF n <> 0 THEN RAISE EXCEPTION '055: % GCash payment(s) remain. Rolled back.', n; END IF;

  SELECT count(*) INTO n FROM monthly_income_records WHERE payment_method::text = 'Adyen Online';
  IF n <> 0 THEN RAISE EXCEPTION '055: % GCash ledger row(s) remain. Rolled back.', n; END IF;

  SELECT count(*) INTO n FROM payments WHERE tenant_profile_id IN (SELECT id FROM _demo);
  IF n <> 0 THEN RAISE EXCEPTION '055: % demo payment(s) remain. Rolled back.', n; END IF;

  SELECT count(*) INTO n FROM room_assignments WHERE tenant_profile_id IN (SELECT id FROM _demo);
  IF n <> 0 THEN RAISE EXCEPTION '055: % demo tenancy(ies) remain. Rolled back.', n; END IF;

  SELECT count(*) INTO n FROM monthly_income_records WHERE voided_at IS NOT NULL;
  IF n <> 0 THEN RAISE EXCEPTION '055: % voided ledger row(s) remain. Rolled back.', n; END IF;
END $$;

COMMIT;

-- "Success. No rows returned" means it ran. Check afterwards:
-- SELECT count(*) FROM payments WHERE payment_method::text = 'Adyen Online';          -- 0
-- SELECT count(*) FROM room_assignments
--   WHERE tenant_profile_id = '22222222-2222-2222-2222-222222222222';                   -- 0
-- SELECT new_values FROM audit_logs WHERE action = 'AUDIT_CORRECTION'
--   ORDER BY created_at DESC LIMIT 1;                                                   -- the record of this
