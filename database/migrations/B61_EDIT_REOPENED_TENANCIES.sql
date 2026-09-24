-- =============================================================================
-- B61_EDIT_REOPENED_TENANCIES.sql — tenancies an edit closed and reopened
-- =============================================================================
-- READ-ONLY. Changes nothing. Not a migration, so it carries no number.
-- Run in the Supabase SQL Editor.
--
-- WHY. Until 2026-09-24, PATCH /api/admin/tenants/:profileId treated any
-- roomNumber in the body as a move, and the edit form sends roomNumber on every
-- save. Editing a resident's phone number therefore closed their tenancy and
-- opened a new one on the SAME unit, start_date and anniversary_date = that day.
-- Every rent period derived from those dates moved with them. (B-61)
--
-- THE SIGNATURE. Same resident, same unit, one row closed on day D and the next
-- opened on day D. A genuine move changes the unit, so it never matches.
-- `edits_that_day` counts TENANT_UPDATE audit rows for that resident on D, in
-- Manila time; a match with 0 edits was made some other way.
--
-- RESULT ON 2026-09-24 (run through the API, read-only): ONE row.
--   unit 1a, profile 22222222-… (Mark Cruz, the seeded demo tenant)
--   2025-06-05 closed 2026-08-25, reopened 2026-08-25, occupants 2 -> 3,
--   1 TENANT_UPDATE that day. 0 income rows; deactivated by migration 049.
-- No real resident matches. The last TENANT_UPDATE of any kind is 2026-08-25,
-- before the 2026-08-27 import that created the live tenancies, so no live
-- tenancy has been through the edit form since. Nothing to repair.
-- =============================================================================

SELECT
  r.room_number                         AS unit,
  c.tenant_profile_id,
  c.id                                  AS closed_tenancy,
  c.start_date                          AS original_start,
  c.anniversary_date                    AS original_anniversary,
  c.end_date                            AS closed_on,
  o.id                                  AS reopened_tenancy,
  o.start_date                          AS reopened_start,
  o.anniversary_date                    AS reopened_anniversary,
  o.is_active                           AS reopened_is_active,
  c.deposit_amount                      AS closed_deposit,
  o.deposit_amount                      AS reopened_deposit,
  c.occupant_count                      AS closed_occupants,
  o.occupant_count                      AS reopened_occupants,
  (SELECT count(*)
     FROM audit_logs a
    WHERE a.action = 'TENANT_UPDATE'
      AND a.entity_id::text = c.tenant_profile_id::text
      AND (a.created_at AT TIME ZONE 'Asia/Manila')::date = c.end_date
  )                                     AS edits_that_day
FROM room_assignments c
JOIN room_assignments o
  ON  o.tenant_profile_id = c.tenant_profile_id
  AND o.room_id           = c.room_id
  AND o.id               <> c.id
  AND o.start_date        = c.end_date
JOIN rooms r ON r.id = c.room_id
WHERE c.is_active = false
ORDER BY c.end_date DESC;

-- Corroboration, also read-only: every TENANT_UPDATE by Manila day. If a day
-- after 2026-09-24 appears here with a match above, the fix did not hold.
SELECT (created_at AT TIME ZONE 'Asia/Manila')::date AS day, count(*) AS tenant_updates
  FROM audit_logs
 WHERE action = 'TENANT_UPDATE'
 GROUP BY 1
 ORDER BY 1;
