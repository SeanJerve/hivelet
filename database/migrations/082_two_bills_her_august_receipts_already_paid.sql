-- =============================================================================
-- 082 - two bills her August receipts already paid (B-107)
-- =============================================================================
-- Found 2026-10-13 in a full audit, comparing what a tenant's Overview shows with what the ledger
-- holds. Units 1d and F2B each have a bill marked Due for a period her own receipt already covers:
--
--   unit  bill period              bill        receipt                          paid
--   1d    2026-08-09 .. 2026-09-08 PHP 7,450   INV#5237, same period, PHP 7,450 2026-08-12
--   F2B   2026-08-15 .. 2026-09-14 PHP 10,400  Acknowledgement receipt, same    2026-08-25
--                                              period, PHP 10,400
--
-- HOW: the bills were raised on demand on 2026-09-26, when each tenant opened the payment screen
-- (docs/13_AUDIT_JUDGEMENT_LOG.md 3.6). Their ledger then ended at July, so the periods were owed
-- and the bills were right. The August receipts arrived on 2026-09-30 through migration 062, which
-- inserts income rows directly. Recording a receipt through Monthly Income settles the open bills
-- it covers (allocateReceipt, backend/src/routes/admin.ts); an insert does not. So both bills
-- stayed Due, and a raised bill is what the tenant's Overview shows first: each tenant reads an
-- amount due, overdue, for a month they paid.
--
-- WHAT THIS DOES: exactly what the receipt route would have done had she entered the two receipts
-- herself. For each bill, one Verified payment of the receipt's amount, method Cash, source
-- 'On-Site Cash' (the route's own literal), reference the receipt's number, paid on the receipt's
-- date; then the bill is set to Paid. verified_by is left NULL: no person verified these rows in
-- the system, and naming the administrator would say she did. Two AUDIT_CORRECTION rows record it.
-- No income record, expense or tenancy changes. Nothing is deleted.
--
-- SAFETY: one DO block. Each bill must still be Due, have no Verified payment, and match a live
-- receipt for the same unit, tenant, period and amount, or nothing changes. A second run finds both
-- Paid and does nothing.
--
-- Run `npm run backup` first. Verify (expected: both Paid, each with one Verified Cash payment):
--   SELECT r.room_number, b.status, p.amount, p.payment_method, p.transaction_reference
--     FROM bills b JOIN rooms r ON r.id = b.room_id LEFT JOIN payments p ON p.bill_id = b.id
--    WHERE b.id IN ('487f7ba5-aaba-409d-8780-59a7757cb739', '9f9e4bb5-beec-455f-902d-285c69afdeb4');
-- And no bill remains Due for a period a live receipt covers (expected: 0 rows):
--   SELECT b.id FROM bills b JOIN monthly_income_records i ON i.room_id = b.room_id
--      AND i.voided_at IS NULL AND i.rent_period_start <= b.billing_period_start
--      AND i.rent_period_end >= b.billing_period_end
--    WHERE b.status <> 'Paid';
-- =============================================================================

DO $$
DECLARE
  pair record;
  n integer;
BEGIN
  SELECT count(*) INTO n FROM bills
   WHERE id IN ('487f7ba5-aaba-409d-8780-59a7757cb739', '9f9e4bb5-beec-455f-902d-285c69afdeb4')
     AND status = 'Paid';
  IF n = 2 THEN
    RAISE NOTICE '082: already applied. Nothing to do.';
    RETURN;
  END IF;

  -- Both bills, each with the receipt that covers it. Every condition the audit found, checked again.
  SELECT count(*) INTO n
    FROM bills b
    JOIN monthly_income_records i
      ON i.room_id = b.room_id AND i.tenant_profile_id = b.tenant_profile_id AND i.voided_at IS NULL
     AND i.rent_period_start = b.billing_period_start AND i.rent_period_end = b.billing_period_end
     AND i.rent_amount + i.water_payment = b.total_amount
   WHERE (b.id, i.id) IN (('487f7ba5-aaba-409d-8780-59a7757cb739'::uuid, '271a292e-ebdf-4a33-be78-d8381f38d5cd'::uuid),
                          ('9f9e4bb5-beec-455f-902d-285c69afdeb4'::uuid, '03c41844-9655-40e8-b8cf-fc92a5343dca'::uuid))
     AND b.status = 'Due'
     AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.bill_id = b.id AND p.verification_status = 'Verified');
  IF n <> 2 THEN
    RAISE EXCEPTION '082: expected both bills Due, unpaid and matching their receipts; found %. Nothing changed.', n;
  END IF;

  FOR pair IN
    SELECT b.id AS bill_id, b.room_id, b.tenant_profile_id, b.total_amount, r.room_number,
           i.id AS income_id, i.invoice_number, i.date_paid
      FROM bills b
      JOIN rooms r ON r.id = b.room_id
      JOIN monthly_income_records i ON i.id IN ('271a292e-ebdf-4a33-be78-d8381f38d5cd', '03c41844-9655-40e8-b8cf-fc92a5343dca')
       AND i.room_id = b.room_id
     WHERE b.id IN ('487f7ba5-aaba-409d-8780-59a7757cb739', '9f9e4bb5-beec-455f-902d-285c69afdeb4')
  LOOP
    -- The payment first, as the route does: a failure after it leaves money recorded and only a
    -- status stale, never a bill marked Paid with nothing against it.
    INSERT INTO payments (bill_id, room_id, tenant_profile_id, amount, payment_method, payment_source,
                          verification_status, transaction_reference, paid_at, verified_at, verified_by)
    VALUES (pair.bill_id, pair.room_id, pair.tenant_profile_id, pair.total_amount, 'Cash', 'On-Site Cash',
            'Verified', pair.invoice_number, pair.date_paid::timestamptz, now(), NULL);

    UPDATE bills SET status = 'Paid', updated_at = now() WHERE id = pair.bill_id;

    INSERT INTO audit_logs (action, entity_type, entity_id, previous_values, new_values, ip_address)
    VALUES ('AUDIT_CORRECTION', 'BILL', pair.bill_id,
            jsonb_build_object('status', 'Due'),
            jsonb_build_object(
              'status', 'Paid',
              'unit', pair.room_number,
              'settled_by_income_record', pair.income_id,
              'note', 'Bill raised 2026-09-26 for a period her receipt covers; the receipt came in by migration 062, which did not settle it.',
              'reference', 'migration 082; B-107'),
            NULL);
  END LOOP;

  RAISE NOTICE '082: done. The 1d and F2B August bills are Paid, each with its receipt''s payment.';
END $$;
