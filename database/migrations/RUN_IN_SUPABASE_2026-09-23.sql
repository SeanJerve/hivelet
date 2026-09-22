-- ============================================================
-- RUN IN SUPABASE — 2026-09-23
-- Built by concatenating 046, 049 and 050 in order.
-- Nothing here was retyped; every UUID comes from its migration file.
--
-- RUN 'npm run backup' FIRST. It is the first data change of the session.
--
-- Order matters only in one place: 049 deactivates Jaz, 050 then deletes
-- him. Running them this way round is harmless either way.
-- ============================================================


-- ##### 046 — three import duplicates ##########################

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


-- ##### 049 — deactivate two moved-out accounts ################

-- 049 — two residents who have moved out can still sign in
--
-- WHY
-- ---
-- Sean's rule, 2026-09-22: "When a tenant moved out automatically deny and lose
-- their access on the accounts... but obviously its record are still there."
--
-- The application already does this. `POST /admin/tenants/:profileId/vacate`
-- writes `account_status = 'inactive'`, and `resolveAuthUser()` re-reads that
-- column on EVERY authenticated request — so a resident moved out through the
-- interface loses the portal on their very next tap, not at their next sign-in.
-- A token already sitting in their phone stops working.
--
-- These two predate that path. Their tenancies were closed by the bulk import
-- of 2026-08-25 rather than by the Vacate button, and the import closed the
-- assignment without touching the profile. So the rule was never applied to
-- them, and both accounts still open the resident portal today.
--
-- WHO, and the exact test that found them
-- ---------------------------------------
-- Every profile with role 'tenant' and account_status 'active' that has NO
-- active row in room_assignments. Read from the live tables on 2026-09-22:
--
--   full_name   email                unit   active tenancies   assignment ended
--   Jaz         jaz@gmail.com        1d     0                  (no end date)
--   Mark Cruz   mark.cruz@gmail.com  1a     0                  2026-08-25
--
-- Both units are occupied by someone else now — 1d by Sandrine Jammeka Mariano
-- and 1a by Lobby Toor — so these are not residents between tenancies. They
-- have gone.
--
-- Jaz's assignment carries no `end_date`. That is one of the four rows
-- `check:ledger` already pins as import debris ("tenancies ended without an end
-- date: 4, all import debris from 2026-08-25, none carrying income"), so it is
-- known and accounted for, not a new surprise. This migration does not invent a
-- date for it: nobody knows which day it was, and writing a guess into her
-- records to tidy a column would be the exact thing this project keeps refusing
-- to do.
--
-- WHAT THIS DOES NOT DO
-- ---------------------
-- **It deletes nothing and it detaches nothing.** `account_status` is the only
-- column touched. Every receipt, payment, ticket and message either of them
-- appears on stays exactly where it is and keeps their name on it — which is
-- the half of Sean's instruction that matters most for a financial record. The
-- ledger totals do not move, because nothing about money is read from this
-- column.
--
-- It is also fully reversible: set the column back to 'active' and the account
-- opens again. Nothing here is one-way.
--
-- WHAT IT FIXES BEYOND ACCESS
-- ---------------------------
-- A separate audit found that a moved-out resident whose account is still
-- active can file a maintenance ticket against the unit they left, which then
-- lands on the dispatch board attributed to the unit — so it reads as a
-- complaint from whoever lives there now. Deactivating the account closes that
-- too, because the request never gets past `resolveAuthUser`.
--
-- Named by id, never by a pattern. A pattern on the email or the name would
-- also match a future resident.

BEGIN;

UPDATE profiles
   SET account_status = 'inactive',
       updated_at     = NOW()
 WHERE id IN (
         '2432a1f7-05db-435e-b631-baf736a4aeec',  -- Jaz, formerly 1d
         '22222222-2222-2222-2222-222222222222'   -- Mark Cruz, formerly 1a
       )
   AND account_status = 'active'
   -- Belt and braces: refuse to touch anyone who has since been given a
   -- tenancy again. A migration that deactivates an account should check, on
   -- the day it runs, that the reason still holds — not on the day it was
   -- written.
   AND NOT EXISTS (
         SELECT 1 FROM room_assignments ra
          WHERE ra.tenant_profile_id = profiles.id
            AND ra.is_active
       );

COMMIT;

-- VERIFY — expect 0 rows. Anyone listed here is a tenant who has moved out and
-- can still sign in.
SELECT p.full_name, p.email, p.account_status
  FROM profiles p
 WHERE p.role = 'tenant'
   AND p.account_status = 'active'
   AND NOT EXISTS (
         SELECT 1 FROM room_assignments ra
          WHERE ra.tenant_profile_id = p.id AND ra.is_active
       );

-- VERIFY — the records are untouched. Both counts should be unchanged from
-- before this ran: 937 live income rows, PHP 8,086,250.00 remitted.
SELECT count(*) AS live_income_rows,
       COALESCE(sum(remitted_amount), 0) AS remitted_total
  FROM monthly_income_records
 WHERE voided_at IS NULL;


-- ##### 050 — delete three dummy profiles ######################

-- 050 — three dummy profiles, deleted
--
-- Sean asked on 2026-09-22 to delete five: Mark Cruz, Jaz, Jaye Casia, Miguel
-- Ramos and Rhea Mendoza, after Supabase refused the delete with a foreign key
-- error from `audit_logs`.
--
-- **THREE OF THE FIVE ARE SAFE. TWO ARE NOT, AND THIS MIGRATION DELETES
-- NEITHER OF THEM.** Read the two exclusions before running this.
--
-- ============================================================================
-- ❌ NOT DELETED — JAYE CASIA IS A CURRENT, PAYING RESIDENT
-- ============================================================================
-- `55555555-5555-5555-5555-555555555555`. Read from the live tables:
--
--   active tenancy       1   — she lives in LB right now
--   units                3e, LB
--   live income rows     31
--   money on record      ₱170,500.00
--   most recent          July 2026, LB, ₱5,500, invoice N/A-LB-7-2026
--
-- She is billed ₱5,500 every month and the ledger has 31 of those. Deleting
-- her would remove a resident who currently occupies a unit and destroy
-- ₱170,500 of the owner's financial record. B-43 reached the same conclusion
-- independently on 2026-09-20 — her name was one of the two found on the
-- PUBLIC website, and that entry states she is a current, active resident.
--
-- If the intent was to remove her name from somewhere she should not appear,
-- that is a different job from deleting the person.
--
-- ============================================================================
-- ❌ NOT DELETED — MARK CRUZ HOLDS 902 AUDIT ROWS AND 13 PAYMENTS
-- ============================================================================
-- `22222222-2222-2222-2222-222222222222` — the id in Sean's error message.
-- He carries no money (0 income rows, ₱0), so he is not a resident in the
-- ledger sense, but he is not inert either:
--
--   payments     13   — the test payments TESTING_REHEARSAL already documents
--   audit_logs  902   — as actor, which is what Supabase refused the delete on
--
-- **That refusal is the database doing its job.** `audit_logs` is append-only
-- on purpose: `service_role` holds INSERT, SELECT, REFERENCES, TRIGGER and
-- TRUNCATE on it and NOT DELETE, read from `information_schema.role_table_grants`
-- during B-41. Deleting him needs one of:
--
--   * ON DELETE CASCADE on `audit_logs_actor_profile_id_fkey` — destroys 902
--     audit rows, and leaves every FUTURE profile delete silently destroying
--     audit history too;
--   * ON DELETE SET NULL — keeps the rows and erases who did it, which is the
--     one column that made them worth keeping.
--
-- **Do not accept Supabase's offer to "set an on delete behavior" on that
-- constraint.** B-41 settled the principle when 276 false audit rows were
-- found and deliberately left standing: an audit log you edit when its
-- contents are inconvenient is not an audit log. A correction was posted
-- instead.
--
-- Migration 049 already deactivates Mark Cruz, which removes his access and
-- takes him out of the resident list without touching a single audit row. That
-- is almost certainly what was actually wanted. If he must genuinely be erased,
-- that is a decision to make on its own, knowing it costs the 902 rows.
--
-- ============================================================================
-- ✅ DELETED — the three that really are inert
-- ============================================================================
-- Every foreign key that could hold them, counted live on 2026-09-22:
--
--   monthly_income_records  0     payments        0     bills               0
--   maintenance_tickets     0     ticket_messages 0     notifications       0
--   inquiries.converted     0     audit_logs      0
--   room_assignments        3     ← closed tenancies, deleted with them below
--
--   Jaz            2432a1f7-05db-435e-b631-baf736a4aeec   formerly 1d
--   Miguel Ramos   66666666-6666-6666-6666-666666666666   formerly 1c, 1h
--   Rhea Mendoza   77777777-7777-7777-7777-777777777777   prospect, never a unit
--
-- No money, no correspondence, no audit history. Nothing dangles.
--
-- Named by id, never by a pattern. A pattern on the name or the email would
-- also match a future resident.

BEGIN;

-- Assignments first: they hold the foreign key.
DELETE FROM room_assignments
 WHERE tenant_profile_id IN (
         '2432a1f7-05db-435e-b631-baf736a4aeec',  -- Jaz
         '66666666-6666-6666-6666-666666666666',  -- Miguel Ramos
         '77777777-7777-7777-7777-777777777777'   -- Rhea Mendoza
       );

DELETE FROM profiles
 WHERE id IN (
         '2432a1f7-05db-435e-b631-baf736a4aeec',
         '66666666-6666-6666-6666-666666666666',
         '77777777-7777-7777-7777-777777777777'
       )
   -- A migration that deletes what it expects to be inert should check, on the
   -- day it runs rather than the day it was written, that it still is.
   AND NOT EXISTS (SELECT 1 FROM monthly_income_records m WHERE m.tenant_profile_id = profiles.id)
   AND NOT EXISTS (SELECT 1 FROM payments pay          WHERE pay.tenant_profile_id = profiles.id)
   AND NOT EXISTS (SELECT 1 FROM audit_logs al          WHERE al.actor_profile_id  = profiles.id);

COMMIT;

-- VERIFY — expect 0 rows. Anything here was not deleted, and the guard above
-- says why: something came to reference it.
SELECT id, full_name FROM profiles
 WHERE id IN (
         '2432a1f7-05db-435e-b631-baf736a4aeec',
         '66666666-6666-6666-6666-666666666666',
         '77777777-7777-7777-7777-777777777777'
       );

-- VERIFY — Jaye Casia is untouched and still housed. Expect one row:
-- LB, active, 31 income rows, ₱170,500.00.
SELECT p.full_name, p.account_status,
       (SELECT count(*) FROM room_assignments ra WHERE ra.tenant_profile_id = p.id AND ra.is_active) AS active_tenancy,
       (SELECT count(*) FROM monthly_income_records m WHERE m.tenant_profile_id = p.id AND m.voided_at IS NULL) AS income_rows,
       (SELECT COALESCE(sum(m.remitted_amount),0) FROM monthly_income_records m WHERE m.tenant_profile_id = p.id AND m.voided_at IS NULL) AS money_on_record
  FROM profiles p
 WHERE p.id = '55555555-5555-5555-5555-555555555555';

-- VERIFY — the ledger has not moved. Expect 937 rows / ₱8,086,250.00, and
-- profiles down by exactly three.
SELECT (SELECT count(*) FROM profiles) AS profiles_now,
       (SELECT count(*) FROM monthly_income_records WHERE voided_at IS NULL) AS live_income_rows,
       (SELECT COALESCE(sum(remitted_amount),0) FROM monthly_income_records WHERE voided_at IS NULL) AS remitted_total;


-- ============================================================
-- FINAL CHECK — run this last, on its own.
--
-- The figures 046's own footer quotes are STALE: it was written before
-- migration 047 removed five test residents, so it says "45 -> 42".
-- The live count today is 40. These are the numbers that actually apply.
-- ============================================================

SELECT
  (SELECT count(*) FROM profiles)                                           AS profiles,          -- 40 -> 34
  (SELECT count(*) FROM room_assignments WHERE is_active)                   AS active_tenancies,  -- 32, UNCHANGED
  (SELECT count(*) FROM rooms)                                              AS units,             -- 33, UNCHANGED
  (SELECT count(*) FROM monthly_income_records WHERE voided_at IS NULL)     AS income_rows,       -- 937, UNCHANGED
  (SELECT COALESCE(sum(remitted_amount),0)
     FROM monthly_income_records WHERE voided_at IS NULL)                   AS remitted_total;    -- 8086250.00, UNCHANGED

-- The three real residents keep everything. Expect 26, 10 and 31 receipts,
-- all active, none of them carrying a receipt number in the name.
SELECT p.full_name, p.account_status,
       (SELECT count(*) FROM monthly_income_records m
         WHERE m.tenant_profile_id = p.id AND m.voided_at IS NULL) AS receipts
  FROM profiles p
 WHERE p.full_name IN ('Mireel Fatima Parcarey','Nikki Prollamante','Ron Juliene Dominguino')
 ORDER BY p.full_name;

-- Jaye Casia is untouched and still housed. Expect: active, LB, 31 receipts,
-- PHP 170,500.00. She was NOT a dummy and nothing above deletes her.
SELECT p.full_name, p.account_status,
       (SELECT count(*) FROM room_assignments ra
         WHERE ra.tenant_profile_id = p.id AND ra.is_active) AS active_tenancy,
       (SELECT COALESCE(sum(m.remitted_amount),0) FROM monthly_income_records m
         WHERE m.tenant_profile_id = p.id AND m.voided_at IS NULL) AS money_on_record
  FROM profiles p
 WHERE p.id = '55555555-5555-5555-5555-555555555555';

-- Mark Cruz survives, deactivated, with his 902 audit rows intact.
SELECT p.full_name, p.account_status,
       (SELECT count(*) FROM audit_logs al WHERE al.actor_profile_id = p.id) AS audit_rows
  FROM profiles p
 WHERE p.id = '22222222-2222-2222-2222-222222222222';
