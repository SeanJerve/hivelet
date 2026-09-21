-- 047 — five profiles on the Residents list that are not real people
--
-- NOT YET APPLIED. This deletes live rows across five tables. Run
-- `npm run backup` first, as with any change to live data.
--
-- WHAT THEY ARE
-- -------------
-- Sean confirmed by name, on 2026-09-21, looking at the live Residents screen:
-- these five are test accounts, not residents of the property. Two carry
-- fixed, sequential-looking ids (`33333333-...`, `44444444-...`) and a small
-- history that reads like early development seed data (a resolved
-- maintenance ticket, two cash payments, an assignment dated back to
-- 2025-01-15) rather than anything typed in five minutes ago:
--
--   Sean Jerve          33333333-3333-3333-3333-333333333333
--   John Lloyd          44444444-4444-4444-4444-444444444444
--
-- The other three carry ordinary random ids and were created through the
-- live "Move someone in" form on 2026-08-25, holding nothing but the
-- assignment rows that onboarding itself writes:
--
--   NIGGA                a8305b4f-c98a-4241-be13-ff507826b2ba
--   Cayla cAstil          318cfbc2-7180-45ac-aaa0-6e4c49054c1c
--   John Lloyd Cuario     99ef1471-cbf0-4d21-9701-8e173b07e222
--
-- `John Lloyd Cuario` is registered to luydcuario@gmail.com, the email on
-- the chat session that found these - asked directly whether that was a
-- real account worth keeping, Sean said no, delete it with the rest.
--
-- Whichever of the two kinds each one is, none of the five are a resident
-- the owner would recognise, and this property's Residents screen is read
-- by her - and, from 2026-09-22, by a consultation. Regardless of a name's
-- own history, none of it is real money: nothing among these five appears in
-- `monthly_income_records`, checked before this was written.
--
-- WHAT ELSE HAS TO GO WITH THEM, AND WHY THE ORDER MATTERS
-- ----------------------------------------------------------
-- `room_assignments.tenant_profile_id` and `notifications.recipient_profile_id`
-- both cascade, so deleting a profile removes its own assignment rows and
-- notifications on its own - checked against `information_schema` before
-- writing this, not assumed. `payments.tenant_profile_id`,
-- `bills.tenant_profile_id`, `maintenance_tickets.tenant_profile_id` and
-- `audit_logs.actor_profile_id` do NOT cascade (RESTRICT / NO ACTION), so a
-- profile holding any of those blocks its own deletion until they are
-- resolved first. Only one of the five holds any:
--
--   Sean Jerve — 2 payments (Verified, ₱4,900 and ₱4,500 cash, both dated
--   2026-08-25), 1 bill, 1 maintenance ticket ("Bed Frame Slat Loose",
--   Resolved), and 18 `audit_logs` rows naming this profile as the actor.
--   `payments.bill_id` sets itself null on a bill's deletion, so the
--   payments are removed first, then the bill, then the ticket (its own
--   attachments and messages cascade), then the profile.
--
-- THE AUDIT ROWS ARE NOT DELETED
-- -------------------------------
-- `audit_logs` is append-only on purpose - `DELETE` is revoked from every
-- role (migration 002), and the permanence is the point of an audit trail,
-- the same reasoning behind B-18 in BLOCKED_FOR_SEAN.md refusing to touch it
-- even to reduce noise. Removing 18 real rows of history to make a profile
-- deletable would be exactly the shortcut that rule exists to rule out.
-- `actor_profile_id` is nullable, so those 18 rows are kept - action, target,
-- timestamp, everything - and only the dangling reference to a profile about
-- to stop existing is cleared. The row still says what happened; it stops
-- being able to say who, the same way it already would for an action nobody
-- was signed in for.
--
-- The other four profiles have nothing outside `room_assignments`, so a
-- plain delete of the profile is enough for them.
--
-- HOW TO RUN IT
-- -------------
-- `npm run backup` first. Then the statements below, in order.
--
-- UNDO
-- ----
-- None available from within this file - a DELETE cannot be reversed without
-- the backup taken above. Restore the five rows and their dependents from
-- that backup if this turns out to be wrong. The `audit_logs` UPDATE below
-- is reversible on its own (the old `actor_profile_id` values are in that
-- same backup) for as long as it might matter.

-- Sean Jerve's audit history: keep the rows, clear the actor reference.
UPDATE audit_logs
SET    actor_profile_id = NULL
WHERE  actor_profile_id = '33333333-3333-3333-3333-333333333333';

-- Sean Jerve's three remaining RESTRICT-guarded dependents, in dependency order.
DELETE FROM payments WHERE tenant_profile_id = '33333333-3333-3333-3333-333333333333';
DELETE FROM bills WHERE tenant_profile_id = '33333333-3333-3333-3333-333333333333';
DELETE FROM maintenance_tickets WHERE tenant_profile_id = '33333333-3333-3333-3333-333333333333';

-- The five profiles themselves. room_assignments and notifications for each
-- cascade automatically.
DELETE FROM profiles WHERE id IN (
  '33333333-3333-3333-3333-333333333333', -- Sean Jerve
  '44444444-4444-4444-4444-444444444444', -- John Lloyd
  'a8305b4f-c98a-4241-be13-ff507826b2ba', -- NIGGA
  '318cfbc2-7180-45ac-aaa0-6e4c49054c1c', -- Cayla cAstil
  '99ef1471-cbf0-4d21-9701-8e173b07e222'  -- John Lloyd Cuario
);

-- Expect: 0 rows. All five gone, and nothing left holding a payment, bill,
-- ticket or assignment against any of them.
SELECT id, full_name FROM profiles WHERE id IN (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  'a8305b4f-c98a-4241-be13-ff507826b2ba',
  '318cfbc2-7180-45ac-aaa0-6e4c49054c1c',
  '99ef1471-cbf0-4d21-9701-8e173b07e222'
);
