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
