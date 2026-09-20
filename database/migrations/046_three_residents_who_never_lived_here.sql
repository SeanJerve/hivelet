-- 046 — three residents in her list who never lived here
--
-- NOT YET APPLIED. See BLOCKED_FOR_SEAN.md B-48. This deletes live rows, and
-- nothing about it is urgent: the three are inactive and referenced by nothing,
-- so the only cost of leaving them is three confusing names on a screen.
--
-- WHAT THEY ARE
-- -------------
-- The import of 2026-08-27 ran twice, about thirty seconds apart. The first
-- pass read the owner's name column with the receipt number still glued to it
-- and created three profiles called:
--
--   Ron Juliene DominguinoINV.#5227
--   Nikki ProllamanteINV#5212
--   Mireel Fatima ParcareyINV.#5223
--
-- The second pass created the clean records, which are the ones holding
-- everything: 31, 10 and 26 income rows respectively, and an active tenancy
-- each. The three below hold nothing at all.
--
-- CHECKED, NOT ASSUMED
-- --------------------
-- `profiles` is referenced by 18 foreign-key columns across 15 tables, read
-- from `pg_constraint` rather than from any schema file. Every one of those 18
-- was counted against these three ids on 2026-09-20:
--
--   room_price_history.created_by            0
--   room_assignments.tenant_profile_id       0
--   inquiries.converted_tenant_id            0
--   inquiry_messages.sender_id               0
--   monthly_income_records.tenant_profile_id 0
--   monthly_income_records.voided_by         0
--   bills.tenant_profile_id                  0
--   payments.tenant_profile_id               0
--   payments.verified_by                     0
--   monthly_expense_entries.created_by       0
--   monthly_expense_entries.voided_by        0
--   maintenance_tickets.closed_by            0
--   maintenance_tickets.tenant_profile_id    0
--   ticket_messages.sender_id                0
--   notifications.recipient_profile_id       0
--   audit_logs.actor_profile_id              0
--   room_photos.uploaded_by                  0
--   system_settings.updated_by               0
--
-- No money, no tenancy, no correspondence, no audit history. Deleting them
-- removes three names and nothing else.
--
-- WHY DELETE RATHER THAN CORRECT
-- ------------------------------
-- Migration 043 deliberately posted a correcting entry instead of deleting 276
-- wrong audit rows, and that was right: `audit_logs` is append-only by design
-- and an audit log you edit when its contents are inconvenient is not an audit
-- log. `profiles` is not a ledger. It is a list of people, and these three are
-- not people - they are a spreadsheet cell read badly, twice.
--
-- The record of the double import is not lost by this. It is in the git
-- history, in this file, and in the three surviving clean profiles whose
-- `created_at` sits thirty seconds after the ones being removed.
--
-- BY EXACT UUID. Not by a name pattern - `LIKE '%INV%'` would match a real
-- resident called Invierno, and this database has been surprised by its own
-- data before.

BEGIN;

-- Refuse to run if anything has come to reference them since this was written.
-- A migration that deletes what it expected to be inert must check that it
-- still is, on the day it runs rather than the day it was written.
DO $$
DECLARE
  v_refs integer;
  v_found integer;
BEGIN
  SELECT count(*) INTO v_found FROM profiles WHERE id IN (
    '5ab0c29a-d443-4d5c-b138-e84633bc8d43',
    '11528c89-b3f0-4ede-814a-5730f7041c61',
    '123229d3-bc44-48a5-b101-a8e207fa015f');

  IF v_found <> 3 THEN
    RAISE EXCEPTION
      'Expected 3 import artefact profiles, found %. Someone has changed them; stopping.', v_found;
  END IF;

  SELECT
    (SELECT count(*) FROM room_assignments WHERE tenant_profile_id IN (
       '5ab0c29a-d443-4d5c-b138-e84633bc8d43','11528c89-b3f0-4ede-814a-5730f7041c61',
       '123229d3-bc44-48a5-b101-a8e207fa015f'))
  + (SELECT count(*) FROM monthly_income_records WHERE tenant_profile_id IN (
       '5ab0c29a-d443-4d5c-b138-e84633bc8d43','11528c89-b3f0-4ede-814a-5730f7041c61',
       '123229d3-bc44-48a5-b101-a8e207fa015f'))
  + (SELECT count(*) FROM bills WHERE tenant_profile_id IN (
       '5ab0c29a-d443-4d5c-b138-e84633bc8d43','11528c89-b3f0-4ede-814a-5730f7041c61',
       '123229d3-bc44-48a5-b101-a8e207fa015f'))
  + (SELECT count(*) FROM payments WHERE tenant_profile_id IN (
       '5ab0c29a-d443-4d5c-b138-e84633bc8d43','11528c89-b3f0-4ede-814a-5730f7041c61',
       '123229d3-bc44-48a5-b101-a8e207fa015f'))
  + (SELECT count(*) FROM audit_logs WHERE actor_profile_id IN (
       '5ab0c29a-d443-4d5c-b138-e84633bc8d43','11528c89-b3f0-4ede-814a-5730f7041c61',
       '123229d3-bc44-48a5-b101-a8e207fa015f'))
  INTO v_refs;

  IF v_refs <> 0 THEN
    RAISE EXCEPTION
      'These profiles are no longer inert - % row(s) now reference them. Stopping.', v_refs;
  END IF;
END $$;

DELETE FROM profiles WHERE id IN (
  '5ab0c29a-d443-4d5c-b138-e84633bc8d43',  -- Ron Juliene DominguinoINV.#5227
  '11528c89-b3f0-4ede-814a-5730f7041c61',  -- Nikki ProllamanteINV#5212
  '123229d3-bc44-48a5-b101-a8e207fa015f'   -- Mireel Fatima ParcareyINV.#5223
);

COMMIT;

-- AFTERWARDS, the figures that should have moved and the ones that must not:
--
--   SELECT count(*) FROM profiles;                                -- 45 -> 42
--   SELECT count(*) FROM profiles WHERE role='tenant';            -- 43 -> 40
--   SELECT count(*) FROM profiles
--     WHERE role='tenant' AND account_status='active';            -- 39, UNCHANGED
--   SELECT count(*) FROM monthly_income_records;                  -- 937, UNCHANGED
--   SELECT sum(remitted_amount) FROM monthly_income_records;      -- 8086250.00, UNCHANGED
--   SELECT count(*) FROM room_assignments WHERE is_active;        -- UNCHANGED
--
-- The three clean residents keep their records. Check one of them by name:
--
--   SELECT full_name, account_status,
--          (SELECT count(*) FROM monthly_income_records m
--            WHERE m.tenant_profile_id = p.id) AS receipts
--   FROM profiles p WHERE p.full_name = 'Ron Juliene Dominguino';
--   -- expect: active, 31
