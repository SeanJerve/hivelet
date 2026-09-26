-- =============================================================================
-- 052_remove_rehearsal_test_tenant.sql — delete the two "Rehearsal Test"
-- profiles created during the 2026-09-25 QA rehearsal, and what they touched
-- =============================================================================
-- Approved by Sean 2026-09-26, in chat, after B-69 (BLOCKED_FOR_SEAN.md) was
-- already worked around by moving both profiles out (account_status =
-- 'inactive', room_assignments.is_active = false, end_date set). This
-- migration removes them outright rather than leaving them inactive: they
-- are not real tenancy history, they are rehearsal fixtures, and Sean's own
-- words were "remove it since it's nonsense."
--
-- Backed up first: `npm run backup`, written to backups/2026-09-26T00-00-47/.
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
