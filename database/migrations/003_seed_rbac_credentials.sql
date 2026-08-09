-- =============================================================================
-- Migration 003 — Seed RBAC Credentials (DEVELOPMENT / DEFENSE DEMO ONLY)
-- =============================================================================
-- @systemBibleRef  Section 4 (Users), Section 19 (Account Lifecycle)
-- @businessRules   BR-024 Tenant Privacy, BR-025 Tenant Deactivation
-- @requirements    FR-001 Authentication, FR-002 Role-Based Access
--
-- Attaches bcrypt password hashes (cost 12) to the seeded profiles so the three
-- roles from System Bible Section 4 can be demonstrated end to end.
--
--   ROLE      EMAIL                    PASSWORD             EXPECTED BEHAVIOUR
--   -------   ----------------------   ------------------   -------------------------
--   admin     admin@hivelet.ph         Hivelet@Admin2026    full administrative access
--   tenant    mark.cruz@gmail.com      Hivelet@Tenant2026   own room/bills/tickets only
--   tenant    sean.jerve@gmail.com     Hivelet@Tenant2026   own room/bills/tickets only
--   tenant    john.lloyd@gmail.com     Hivelet@Tenant2026   own room/bills/tickets only
--   tenant    jaye.casia@gmail.com     Hivelet@Tenant2026   own room/bills/tickets only
--   tenant    miguel.ramos@gmail.com   Hivelet@Tenant2026   DENIED — account_status
--                                                           is 'inactive' (BR-025)
--
-- Rhea Mendoza (role = 'prospect') is intentionally given NO password. A
-- prospect is a public visitor who submitted an inquiry; System Bible Section 4
-- grants that class no account access, so the profile exists for inquiry
-- linkage only and cannot authenticate.
--
-- !! BEFORE DEPLOYING TO THE UNIVERSITY SERVER !!
-- Rotate every one of these passwords. They are published in this repository
-- and must never guard real tenant data.
-- =============================================================================

BEGIN;

UPDATE public.profiles AS p
SET password_hash       = v.hash,
    password_changed_at = NOW(),
    failed_login_count  = 0,
    locked_until        = NULL
FROM (VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, '$2a$12$L3h2PeffvWzk55Ib.KLT6egtU6gdG0VqxZCujhQCl8WW30aek7FU.'), -- admin@hivelet.ph      / Hivelet@Admin2026
  ('22222222-2222-2222-2222-222222222222'::uuid, '$2a$12$rjbLOeEdh1Um9x2uX6BeEe1tScu6dsiz0WjiVgx5wlng5LarrGdPC'), -- mark.cruz@gmail.com   / Hivelet@Tenant2026
  ('33333333-3333-3333-3333-333333333333'::uuid, '$2a$12$/IARQqPw7cohJL8dEhzYUO5mQm/oRzpzLtlZdExWQBxyMhIyVyW..'), -- sean.jerve@gmail.com  / Hivelet@Tenant2026
  ('44444444-4444-4444-4444-444444444444'::uuid, '$2a$12$UtX3bdkZetJ7j6P5MdBPtuJ6MNysPmZGERu.rV7Hb62DLL0KXewpi'), -- john.lloyd@gmail.com  / Hivelet@Tenant2026
  ('55555555-5555-5555-5555-555555555555'::uuid, '$2a$12$8/A5qIMI.AFx0JXWPo/ZhOSaMDWF8EDrxT7.cfnBNadcz//.dmQny'), -- jaye.casia@gmail.com  / Hivelet@Tenant2026
  ('66666666-6666-6666-6666-666666666666'::uuid, '$2a$12$KEQsAqipGvBzA4GwV3sSi.A2Fm4lCRJ3OPPUM/YKx.gJ8RvoqgGD2')  -- miguel.ramos@gmail.com/ Hivelet@Tenant2026 (inactive)
) AS v(profile_id, hash)
WHERE p.id = v.profile_id;

-- A prospect never authenticates (System Bible Section 4: the public visitor
-- "cannot access private tenant information").
UPDATE public.profiles
SET password_hash = NULL
WHERE role = 'prospect';

COMMIT;

-- =============================================================================
-- VERIFICATION — password_hash must be non-null for admin/tenant, null for
-- prospect. The hash itself is never selected back by the application.
-- =============================================================================
-- SELECT email, role, account_status,
--        (password_hash IS NOT NULL) AS can_authenticate
-- FROM public.profiles
-- ORDER BY role, email;
