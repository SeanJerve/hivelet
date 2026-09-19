-- 043 — 276 audit rows say an account was created when somebody merely signed in
--
-- ONE INSERT. Nothing is deleted, nothing is altered.
--
-- WHAT HAPPENED
-- -------------
-- On 2026-09-19 a `TENANT_CREATE` audit block was added so that a public
-- self-registration would leave a record of the account coming into existence.
-- It was placed in `login()` instead of `register()`.
--
-- Between 09:02 and 14:58 that day, every successful sign-in therefore wrote:
--
--     action      TENANT_CREATE
--     entity_type PROFILE
--     actor       the person signing in
--     note        "Self-registered through the public sign-up endpoint."
--
-- 276 of them, across 7 accounts. Every one is false. None of those accounts
-- was created that day, and `ALLOW_PUBLIC_SIGNUP` is false, so no account could
-- have been self-registered at all.
--
-- The code is fixed: the block now sits in `register()`, verified by signing in
-- and watching the count stay put while AUTH_LOGIN still incremented.
--
-- WHY THE ROWS ARE NOT BEING DELETED
-- ----------------------------------
-- Because they cannot be, and because they should not be.
--
-- `service_role` holds INSERT, SELECT, REFERENCES, TRIGGER and TRUNCATE on this
-- table and NOT DELETE - read from `information_schema.role_table_grants`. The
-- append-only guarantee is real and enforced at the grant level, not merely
-- intended. Removing these would mean reaching past it with the `postgres` role.
--
-- And the guarantee is the whole value of the table. An audit log you edit when
-- its contents are inconvenient is not an audit log, however good the reason.
-- These rows are embarrassing rather than dangerous, which is exactly the case
-- where the temptation is strongest and the principle matters most.
--
-- So this does what any ledger does with an error: it POSTS A CORRECTION and
-- leaves the original entries standing. A reader who meets those 276 rows finds
-- the explanation in the same table, written at the same level of authority,
-- rather than in a document they may never open.
--
-- HOW TO FIND THEM AGAIN
-- ----------------------
--     SELECT * FROM audit_logs
--     WHERE action = 'TENANT_CREATE' AND entity_type = 'PROFILE'
--       AND new_values->>'note' = 'Self-registered through the public sign-up endpoint.'
--       AND created_at::date = DATE '2026-09-19';
--
-- HOW TO RUN IT
-- -------------
-- Safe any time. It inserts one row and reads two counts back. Idempotent by
-- the guard below: running it twice inserts nothing the second time.

BEGIN;

INSERT INTO audit_logs (action, entity_type, entity_id, new_values, ip_address)
SELECT 'AUDIT_CORRECTION',
       'AUDIT_LOG',
       '00000000-0000-0000-0000-000000000000',
       jsonb_build_object(
         'note',        'CORRECTION. The 276 TENANT_CREATE/PROFILE rows written on 2026-09-19 between 09:02 and 14:58 UTC are FALSE. They record an account creation for what was only a sign-in.',
         'cause',       'A TENANT_CREATE audit block intended for register() was placed in login(), so every successful sign-in wrote one. Fixed the same day; the block now sits in register().',
         'scope',       'action=TENANT_CREATE, entity_type=PROFILE, new_values.note="Self-registered through the public sign-up endpoint.", created_at on 2026-09-19',
         'false_rows',  276,
         'accounts',    7,
         'not_deleted', 'Deliberate. service_role holds no DELETE on this table and the append-only guarantee is the point of it. An error in a ledger is corrected by a new entry, not by removing the old one.',
         'reference',   'migration 043, BLOCKED_FOR_SEAN.md B-41'
       ),
       NULL
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs WHERE action = 'AUDIT_CORRECTION' AND entity_type = 'AUDIT_LOG'
);

COMMIT;

-- Expect: 1 correction row, and the 276 still present and untouched.
SELECT (SELECT count(*) FROM audit_logs WHERE action = 'AUDIT_CORRECTION') AS correction_rows,
       (SELECT count(*) FROM audit_logs
         WHERE action = 'TENANT_CREATE' AND entity_type = 'PROFILE'
           AND new_values->>'note' = 'Self-registered through the public sign-up endpoint.') AS false_rows_still_there;
