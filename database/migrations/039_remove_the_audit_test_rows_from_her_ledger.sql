-- 039 — remove the 37 rows this audit put in her live database
--
-- WHOSE ROWS THESE ARE
-- --------------------
-- Mine. Every one of them was created on 2026-09-19 by the functional audit,
-- testing write paths that had never been used by a person. None is a record
-- of hers.
--
-- The test that proves it: **her ledger has never had a voided row.** All 35
-- voided income records are dated today and named after the probe that made
-- them - TEST, EDGE, CAP, RACE, MM, HARD, PP, PROTO. The one voided expense
-- entry reads "FUNCTIONAL TEST ... - edited". Checked against every voided row
-- in both tables, not sampled.
--
-- They are all VOIDED, so they are already out of every total: the ledger reads
-- 937 live rows and PHP 8,086,250.00 with them present. This removes the
-- litter, not a liability.
--
-- The enquiry is the one that actually shows: `inquiries` has no voided state,
-- so "REHEARSAL Test / QA audit test enquiry, safe to ignore/delete" sits in
-- her Inquiries screen as Pending, looking like somebody who wants a unit.
--
-- WHY A HARD DELETE HERE, WHEN THE RULE IS NEVER TO DELETE
-- -------------------------------------------------------
-- CLAUDE.md's first rule is about her data. These rows are not her data - they
-- are debris from testing her system, and leaving them voided-but-present means
-- every future reader has to work out what they are. That is a worse outcome
-- than removing them.
--
-- The rows are named by ID and nothing else. No pattern match on
-- `invoice_number`, no date range, no "where void_reason like". A pattern can
-- widen; a list of 37 UUIDs cannot. Each SELECT states the count it must return
-- and the DELETEs are wrapped so a wrong count can be rolled back.
--
-- `expense_property_allocations` is ON DELETE CASCADE, checked in
-- `pg_constraint`, so the one allocation on the test expense goes with it.
-- `monthly_income_records` has NO inbound foreign keys at all - also checked -
-- so nothing dangles.
--
-- AFTERWARDS `check:ledger` should read 937 live income rows exactly as it does
-- now, and both void counts become 0.
--
-- HOW TO RUN IT
-- -------------
-- `npm run backup` first, as with any change to live data. Run the three
-- SELECTs first and confirm 35 / 1 / 1. If any count differs, STOP: something
-- has changed since 2026-09-19 and the list needs rebuilding.

-- Expect 35.
SELECT count(*) AS income_rows_to_remove FROM monthly_income_records
WHERE voided_at IS NOT NULL;

-- Expect 1.
SELECT count(*) AS expense_rows_to_remove FROM monthly_expense_entries
WHERE voided_at IS NOT NULL;

-- Expect 1.
SELECT count(*) AS enquiries_to_remove FROM inquiries
WHERE id = '1e21ef75-4dc6-49c0-8505-3068e36e833e';

BEGIN;

DELETE FROM monthly_income_records
WHERE id IN (
         'ce8475e1-338b-49d5-9eb1-2415703ab5bb',
         'a2afffc5-83cc-471a-aa79-0333cd00c498',
         'f920992c-2c40-4570-925e-f8d061fd6222',
         'ae98e55a-dd16-4f72-807f-47c0307a2c0b',
         'c89dcee7-fe29-42a2-8b74-1cd0bb3390e6',
         '94dffb83-a912-41cd-b0b4-c5019d2e9a0f',
         '29a0f707-910a-4db7-a6e9-b5fd9870c6c9',
         '0ee52b5b-624d-45eb-9ba6-28cd6f04b6fa',
         '5de2fcf6-f6e8-414a-8c5f-1839b7f769da',
         '74bd7f94-7f2a-4122-817f-95da5eedc594',
         '8bce1496-f2ed-45f5-b9c8-41e73e11e875',
         '3583c375-9626-4b24-b742-c142048c09b3',
         'd3dfc1a4-6384-4af3-a07c-4aa20a41b19c',
         '6454724e-879e-404b-abd0-79d58d6145e0',
         '186b998b-6f1f-4530-957f-dbfd195c430e',
         'aa72efd8-c217-462b-b416-7cb0a02307b8',
         '068c91de-4a5d-4a12-9edf-63ce2594224c',
         '716a9286-d0dc-4b03-9a8b-8ed858fa4c24',
         'd5e3eac7-3140-40f8-9128-92f72b0d92a3',
         '736dc5d6-0f51-4392-8917-9f6178940a7d',
         '21345727-3c2f-4bc2-bee2-d6cf805e1a24',
         '6c66c17e-4866-4cb7-9dd5-904301f8d184',
         'ef94c629-3dee-49af-a41d-0f2e525a6138',
         'f045b6a7-1522-4903-b79e-e64895a4b95f',
         '9dae9699-8dc4-40ec-8342-cdcca3d6597f',
         '798e278a-ac94-411e-ae8d-56daa63197e6',
         'e822b5b7-1bcb-4504-b9f5-3cf241a45521',
         'aa3bd647-ad69-44b3-b8c9-17e8c9418dc9',
         '810ba562-36f3-4080-aa61-c384e7abaab0',
         '781cab7d-60d2-4867-933b-8405c8ca4e1a',
         '7b244180-e996-41f4-9b1a-f5dac6b61b6d',
         'd366555a-c45a-439c-808a-2fb9456fe1bf',
         'a67a6cd0-f99a-46c3-97b9-683b12f3b639',
         '466c0daa-e764-4160-b678-7e2061d69677',
         'ec0b220b-d5ba-4f5a-9689-b9cc2a262e77'
       )
  AND  voided_at IS NOT NULL;   -- belt and braces: never touch a live row

DELETE FROM monthly_expense_entries
WHERE id = '83361e4c-7e58-4eda-ace3-58b773ce37c6'
  AND voided_at IS NOT NULL;

DELETE FROM inquiries
WHERE id = '1e21ef75-4dc6-49c0-8505-3068e36e833e'
  AND prospect_email = 'rehearsal.test@example.com';

COMMIT;

-- Expect 0, 0, 0.
SELECT (SELECT count(*) FROM monthly_income_records WHERE voided_at IS NOT NULL) AS voided_income,
       (SELECT count(*) FROM monthly_expense_entries WHERE voided_at IS NOT NULL) AS voided_expenses,
       (SELECT count(*) FROM inquiries WHERE prospect_email = 'rehearsal.test@example.com') AS test_enquiries;

-- Expect 937 and 8086250.00 - unchanged, because voided rows were never in it.
SELECT count(*) AS live_income_rows, sum(rent_amount) AS total_rent
FROM   monthly_income_records
WHERE  voided_at IS NULL;
