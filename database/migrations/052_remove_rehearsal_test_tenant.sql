-- =============================================================================
-- 052_remove_rehearsal_test_tenant.sql — CANNOT SUCCEED AS WRITTEN. Do not re-run.
-- =============================================================================
-- Sean ran this 2026-09-26 in the Supabase SQL editor. It failed at
-- `DELETE FROM profiles`:
--
--   ERROR: 23503: update or delete on table "profiles" violates foreign key
--   constraint "audit_logs_actor_profile_id_fkey" on table "audit_logs"
--   DETAIL: Key (id)=(7a8dcec3-ac68-4309-8f92-2a01a2ba8728) is still
--   referenced from table "audit_logs".
--
-- The whole script was one transaction (BEGIN...COMMIT), so the failure
-- rolled everything back — confirmed read-only afterward: both profiles,
-- both room_assignments and the one bill are exactly as they were before
-- this ran. Nothing was left half-deleted.
--
-- WHY IT CANNOT SUCCEED, EVER, AS A DELETE
-- ----------------------------------------------------------------------------
-- Both profiles are `audit_logs.actor_profile_id` for real recorded actions
-- (AUTH_LOGIN, AUTH_ACCESS_DENIED, AUTH_PASSWORD_CHANGE, PAYMENT_RECORD —
-- the rehearsal genuinely exercised those flows). `audit_logs` has UPDATE
-- and DELETE revoked from every role (System Bible Section 14), so those
-- rows can never be edited to drop the reference, and the foreign key has
-- no ON DELETE action, so deleting the profile is refused outright. This
-- is the audit trail doing exactly what it is for: nobody who ever acted
-- in the system, rehearsal or not, can be made to disappear from it.
-- Changing the FK to CASCADE or SET NULL would work mechanically, but it
-- means Postgres silently rewriting `actor_profile_id` on rows already
-- written — a real edit to a table designed to never have one. Not done
-- here; flag it to Sean instead of deciding it alone.
--
-- WHAT IS STILL TRUE
-- ----------------------------------------------------------------------------
-- B-69's move-out already did the part that mattered for the live site and
-- the ledger: both profiles are `account_status: inactive`, both
-- room_assignments are `is_active: false` with an `end_date`. Nothing
-- public shows them. What's left is two inactive rows and their one bill,
-- not reachable from anywhere a real tenant or the owner would look.
--
-- Original approval note, for the record: Sean asked in chat 2026-09-26 to
-- remove these outright since they're rehearsal fixtures, not real
-- tenancy history — "nonsense" in his words. Backed up first: `npm run
-- backup`, written to backups/2026-09-26T00-00-47/.
--
-- WHAT THIS TOUCHES
-- ----------------------------------------------------------------------------
-- Two profiles.full_name = 'Rehearsal Test' rows, created 2026-09-25 06:23:59
-- and 06:29:03 UTC, both already inactive, both assigned to PH:
--   9502bf06-83c0-4898-a951-933681bc3a93  (assignment f5f5fbc9-..., no bill)
--   7a8dcec3-ac68-4309-8f92-2a01a2ba8728  (assignment 065c86f2-..., one bill)
-- Neither has any monthly_income_records or payments row — read-only checks
-- before writing this confirmed 0 for both, so nothing here is real money.
--
-- WHAT THIS DOES NOT TOUCH
-- ----------------------------------------------------------------------------
-- audit_logs. UPDATE and DELETE are revoked from every role on that table
-- (System Bible Section 14) — it cannot be edited by this migration or any
-- other, on purpose. The handful of rows naming these two profiles (as actor
-- or as entity) stay exactly as they are: a permanent record that a
-- rehearsal happened, not a tenancy.
--
-- Scoped to these two exact IDs. Never a blanket "everyone inactive" delete.
-- =============================================================================

BEGIN;

-- Fail loudly instead of silently deleting nothing, if the IDs or their
-- shape have changed since this was written.
DO $$
DECLARE
  found_count integer;
BEGIN
  SELECT count(*) INTO found_count
  FROM profiles
  WHERE id IN ('9502bf06-83c0-4898-a951-933681bc3a93', '7a8dcec3-ac68-4309-8f92-2a01a2ba8728')
    AND full_name = 'Rehearsal Test';

  IF found_count <> 2 THEN
    RAISE EXCEPTION 'Expected exactly 2 "Rehearsal Test" profiles with these IDs, found %. Aborting — check what changed before re-running.', found_count;
  END IF;
END $$;

DELETE FROM bills
WHERE tenant_profile_id IN ('9502bf06-83c0-4898-a951-933681bc3a93', '7a8dcec3-ac68-4309-8f92-2a01a2ba8728');

DELETE FROM payments
WHERE tenant_profile_id IN ('9502bf06-83c0-4898-a951-933681bc3a93', '7a8dcec3-ac68-4309-8f92-2a01a2ba8728');

DELETE FROM room_assignments
WHERE tenant_profile_id IN ('9502bf06-83c0-4898-a951-933681bc3a93', '7a8dcec3-ac68-4309-8f92-2a01a2ba8728');

DELETE FROM notifications
WHERE recipient_profile_id IN ('9502bf06-83c0-4898-a951-933681bc3a93', '7a8dcec3-ac68-4309-8f92-2a01a2ba8728');

DELETE FROM profiles
WHERE id IN ('9502bf06-83c0-4898-a951-933681bc3a93', '7a8dcec3-ac68-4309-8f92-2a01a2ba8728');

COMMIT;

-- Verify: both statements below should return 0 rows.
-- SELECT * FROM profiles WHERE full_name = 'Rehearsal Test';
-- SELECT * FROM room_assignments ra JOIN rooms r ON r.id = ra.room_id WHERE r.room_number = 'PH' AND ra.is_active;
