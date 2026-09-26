-- =============================================================================
-- 053_permanently_delete_rehearsal_tenant.sql — actually remove the two
-- "Rehearsal Test" profiles, where 052 could not
-- =============================================================================
-- Sean's explicit decision, 2026-09-26, after 052 failed and the reason was
-- explained to him: deleting either profile is refused by
-- audit_logs_actor_profile_id_fkey, because both are the recorded actor on
-- real audit rows (AUTH_LOGIN, AUTH_ACCESS_DENIED, AUTH_PASSWORD_CHANGE,
-- PAYMENT_RECORD - the rehearsal genuinely exercised those flows). His
-- words: "i just want those test accounts deleted permanently because
-- things are getting real."
--
-- Backed up again immediately before this: `npm run backup`.
--
-- THE TRADE, STATED PLAINLY
-- ----------------------------------------------------------------------------
-- The only way to delete a profile that audit_logs still names is to let the
-- 7 audit rows referencing these two profiles have their `actor_profile_id`
-- set to NULL when the profile goes - "someone did this, we no longer know
-- who" instead of "we cannot remove this account because someone once used
-- it." That is a real, permanent loss of information on those 7 rows
-- specifically. It is scoped to exactly those two profiles, for exactly as
-- long as this migration is deleting them, and reverted immediately after -
-- see below. No other profile's audit trail is ever affected, and the
-- constraint audit_logs relies on for every other account is unchanged
-- once this finishes.
--
-- HOW
-- ----------------------------------------------------------------------------
-- 1. Confirm the constraint is still exactly what it was when 052 hit it
--    (FOREIGN KEY (actor_profile_id) REFERENCES profiles(id), no ON DELETE
--    action) - if someone already changed it, stop rather than guess.
-- 2. Swap it to ON DELETE SET NULL, just long enough to do the delete.
-- 3. Delete bills, payments, room_assignments and notifications scoped to
--    the two profile IDs (payments and notifications are empty for both,
--    kept for safety against future rows appearing before this runs).
-- 4. Delete the two profiles. The 7 audit_logs rows naming them as actor
--    go to actor_profile_id = NULL; the rows themselves are untouched and
--    permanent, same as every other audit row (System Bible Section 14).
-- 5. Put the constraint back to exactly its original definition, so the
--    next profile delete anywhere in the system is refused again, same as
--    it always has been.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  found_count integer;
  current_def text;
BEGIN
  SELECT count(*) INTO found_count
  FROM profiles
  WHERE id IN ('9502bf06-83c0-4898-a951-933681bc3a93', '7a8dcec3-ac68-4309-8f92-2a01a2ba8728')
    AND full_name = 'Rehearsal Test';

  IF found_count <> 2 THEN
    RAISE EXCEPTION 'Expected exactly 2 "Rehearsal Test" profiles with these IDs, found %. Aborting.', found_count;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO current_def
  FROM pg_constraint
  WHERE conname = 'audit_logs_actor_profile_id_fkey';

  IF current_def IS DISTINCT FROM 'FOREIGN KEY (actor_profile_id) REFERENCES profiles(id)' THEN
    RAISE EXCEPTION 'audit_logs_actor_profile_id_fkey is not the expected definition (got: %). Something already changed it - stopping rather than guessing how to restore it.', current_def;
  END IF;
END $$;

-- Loosen, just for this transaction.
ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_actor_profile_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_profile_id_fkey
  FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

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

-- Put it back exactly as it was. Every other profile in the system is
-- refused a delete the same way it always has been, the moment this commits.
ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_actor_profile_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_actor_profile_id_fkey
  FOREIGN KEY (actor_profile_id) REFERENCES profiles(id);

-- Confirm the restore worked and nothing is left of the two profiles,
-- before this is allowed to commit.
DO $$
DECLARE
  remaining integer;
  restored_def text;
BEGIN
  SELECT count(*) INTO remaining
  FROM profiles
  WHERE id IN ('9502bf06-83c0-4898-a951-933681bc3a93', '7a8dcec3-ac68-4309-8f92-2a01a2ba8728');

  IF remaining <> 0 THEN
    RAISE EXCEPTION 'Expected 0 profiles remaining, found %. Aborting.', remaining;
  END IF;

  SELECT pg_get_constraintdef(oid) INTO restored_def
  FROM pg_constraint
  WHERE conname = 'audit_logs_actor_profile_id_fkey';

  IF restored_def IS DISTINCT FROM 'FOREIGN KEY (actor_profile_id) REFERENCES profiles(id)' THEN
    RAISE EXCEPTION 'Constraint did not restore to its original definition (got: %). Aborting rather than leaving it loosened.', restored_def;
  END IF;
END $$;

COMMIT;

-- Verify after running:
-- SELECT * FROM profiles WHERE full_name = 'Rehearsal Test';                              -- 0 rows
-- SELECT actor_profile_id, action, created_at FROM audit_logs
--   WHERE id IN (SELECT id FROM audit_logs WHERE actor_profile_id IS NULL)
--   ORDER BY created_at DESC LIMIT 10;                                                     -- the 7 rows, actor now NULL
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'audit_logs_actor_profile_id_fkey';                                    -- back to no ON DELETE action
