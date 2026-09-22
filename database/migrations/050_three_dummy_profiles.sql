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
