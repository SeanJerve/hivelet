-- =============================================================================
-- DIAGNOSTIC for 055 - what the test-data cleanup would remove, and what stays.
-- READ ONLY. Changes nothing. Run this first, send the result, then run 055.
-- =============================================================================
-- Paste into the Supabase SQL editor and run. One table comes back:
--
--   section 1  REMOVE  every GCash payment row, one per line
--   section 2  REMOVE  every ledger row written by a GCash verification, and
--                      every voided ledger row (with its on-site payment rows
--                      in section 1)
--   section 3  REMOVE  bills, tenancies and payments of the demo profiles
--   section 4  REMOVE  notifications about test payments, counted by title
--   section 5  STAYS   every other payment, counted by method and status -
--                      look at this one: anything here that was a test is
--                      NOT removed by 055 and needs saying
--   section 6  BLOCK   rows that point at something 055 removes but are not
--                      removed themselves. Should be empty. If not, 055
--                      refuses to run and says the same thing.
--   section 7  056     the INV#5182 row as it stands
--   section 8  CHANGE  real bills a removed payment had marked Paid, which go
--                      back to Due (or Partially Paid if other payments remain)
--
-- WHY THESE, AND ONLY THESE
-- The gateway only ever talks to Adyen's TEST host (adyenService.ts
-- ADYEN_CHECKOUT_HOST), so no 'Adyen Online' row can be real money. The demo
-- profiles are the seeded or test accounts named in 047 and 050.
-- =============================================================================

WITH demo AS (
  SELECT id FROM profiles
  WHERE (id = '22222222-2222-2222-2222-222222222222' AND full_name = 'Mark Cruz')
     OR id IN ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
               'a8305b4f-c98a-4241-be13-ff507826b2ba', '318cfbc2-7180-45ac-aaa0-6e4c49054c1c',
               '99ef1471-cbf0-4d21-9701-8e173b07e222')
),
ti AS (
  SELECT * FROM monthly_income_records
  WHERE payment_method::text = 'Adyen Online' OR tenant_profile_id IN (SELECT id FROM demo)
     OR voided_at IS NOT NULL
),
tp AS (
  SELECT * FROM payments p
  WHERE p.payment_method::text = 'Adyen Online' OR p.tenant_profile_id IN (SELECT id FROM demo)
     OR EXISTS (SELECT 1 FROM monthly_income_records v
                WHERE v.voided_at IS NOT NULL AND v.room_id = p.room_id
                  AND p.transaction_reference IN (v.invoice_number, v.transaction_reference))
),
tb AS (SELECT * FROM bills WHERE tenant_profile_id IN (SELECT id FROM demo)),
ta AS (SELECT * FROM room_assignments WHERE tenant_profile_id IN (SELECT id FROM demo)),
tn AS (
  SELECT * FROM notifications
  WHERE recipient_profile_id IN (SELECT id FROM demo)
     OR related_entity_id::text IN (SELECT id::text FROM tp)
     OR (type::text = 'Payment'
         AND (title ILIKE 'online payment%' OR title = 'Payment Verification Declined'))
)
SELECT * FROM (
  SELECT '1 REMOVE payment' AS section,
         coalesce(pr.full_name, '(no tenant)') AS who,
         coalesce(r.room_number, '') AS unit,
         p.amount::text AS amount,
         p.verification_status::text AS status,
         p.payment_method::text || ' ' || coalesce(p.transaction_reference, '') || ' ' ||
           coalesce(to_char(p.paid_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH24:MI'), '') AS detail
  FROM tp p
  LEFT JOIN profiles pr ON pr.id = p.tenant_profile_id
  LEFT JOIN rooms r ON r.id = p.room_id

  UNION ALL
  SELECT '2 REMOVE ledger row', coalesce(i.contact_name, ''), coalesce(r.room_number, ''),
         i.remitted_amount::text, i.invoice_number,
         i.payment_method::text || ' ' || coalesce(i.transaction_reference, '') || ' ' || i.date_paid::text
  FROM ti i LEFT JOIN rooms r ON r.id = i.room_id

  UNION ALL
  SELECT '3 REMOVE demo bills', '', '', count(*)::text, '', coalesce(sum(total_amount), 0)::text FROM tb
  UNION ALL
  SELECT '3 REMOVE demo tenancies', '', string_agg(DISTINCT r.room_number, ', '), count(*)::text, '', ''
  FROM ta a LEFT JOIN rooms r ON r.id = a.room_id

  UNION ALL
  SELECT '4 REMOVE notifications', title, '', count(*)::text, '', ''
  FROM tn GROUP BY title

  UNION ALL
  SELECT '5 STAYS payment', payment_method::text, '', count(*)::text, verification_status::text,
         'total ' || sum(amount)::text
  FROM payments WHERE id NOT IN (SELECT id FROM tp)
  GROUP BY payment_method, verification_status

  UNION ALL
  SELECT '6 BLOCK real payment on a demo bill', '', '', count(*)::text, '', ''
  FROM payments WHERE bill_id IN (SELECT id FROM tb) AND id NOT IN (SELECT id FROM tp)
  HAVING count(*) > 0
  UNION ALL
  SELECT '6 BLOCK real ledger row on a demo tenancy', '', '', count(*)::text, '', ''
  FROM monthly_income_records WHERE assignment_id IN (SELECT id FROM ta) AND id NOT IN (SELECT id FROM ti)
  HAVING count(*) > 0

  UNION ALL
  SELECT '8 BILL back from ' || b.status::text, coalesce(pr.full_name, ''), coalesce(r.room_number, ''),
         b.total_amount::text, 'kept verified: ' || coalesce((
           SELECT sum(p.amount) FROM payments p
           WHERE p.bill_id = b.id AND p.verification_status::text = 'Verified'
             AND p.id NOT IN (SELECT id FROM tp)), 0)::text, b.id::text
  FROM bills b
  LEFT JOIN profiles pr ON pr.id = b.tenant_profile_id
  LEFT JOIN rooms r ON r.id = b.room_id
  WHERE b.id IN (SELECT bill_id FROM tp) AND b.id NOT IN (SELECT id FROM tb)
    AND b.status::text IN ('Paid', 'Partially Paid')

  UNION ALL
  SELECT '7 056 INV#5182', coalesce(i.contact_name, ''), r.room_number, i.remitted_amount::text,
         i.rent_period_start::text || ' to ' || i.rent_period_end::text,
         'filed ' || i.year || '-' || i.month
  FROM monthly_income_records i JOIN rooms r ON r.id = i.room_id
  WHERE i.invoice_number = 'INV#5182'
) x
ORDER BY section, detail;
