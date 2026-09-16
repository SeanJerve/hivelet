-- ============================================================================
-- 023  Deactivate three duplicate profiles created by the 2026-08-27 import
--
-- NOT YET APPLIED. The sandbox refuses UPDATE statements against `profiles`
-- (three attempts across two sessions, "Modify Shared Resources"). Run this by
-- hand. It is the whole change.
--
-- ----------------------------------------------------------------------------
-- WHAT WAS THOUGHT TO BE WRONG
-- ----------------------------------------------------------------------------
-- Three rows in `profiles` carry an invoice number glued onto the name:
--
--     Mireel Fatima ParcareyINV.#5223
--     Nikki ProllamanteINV#5212
--     Ron Juliene DominguinoINV.#5227
--
-- This was carried as a cosmetic data-quality item, and the planned fix was to
-- strip the invoice number from each name.
--
-- ----------------------------------------------------------------------------
-- WHAT IS ACTUALLY WRONG — and why that fix would have made it WORSE
-- ----------------------------------------------------------------------------
-- These are not the residents' records with a typo. They are DUPLICATES. Each
-- of the three people already has a separate, correct profile:
--
--   person                    real profile                       this row
--   ------------------------  ---------------------------------  ---------------
--   Mireel Fatima Parcarey    1 tenancy, 26 income rows          0 and 0
--   Nikki Prollamante         1 tenancy, 10 income rows          0 and 0
--   Ron Juliene Dominguino    1 tenancy, 31 income rows          0 and 0
--
-- The duplicates have ZERO of everything: no tenancy ever, no income row, no
-- bill, no payment, no ticket. They carry their own fabricated email, derived
-- from the corrupted name -
--
--     mireel.fatima.parcareyinv5223@gmail.com
--
-- - and their own phone number, different from the real person's. Which is why
-- `check:ledger`'s BR-026 duplicate test passes: the duplication is by PERSON,
-- not by identifier, and nothing was looking for that.
--
-- **Stripping the invoice number would have turned three obviously broken rows
-- into three profiles indistinguishable from the real residents.** The corrupted
-- name is the only thing currently marking them as artifacts. They are left
-- exactly as they are, for that reason.
--
-- ----------------------------------------------------------------------------
-- WHY IT IS A SECURITY ITEM, NOT A TIDINESS ONE
-- ----------------------------------------------------------------------------
-- All three are `account_status = 'active'` and all three have a
-- `password_hash`. They can sign in.
--
-- Their `password_changed_at` is 2026-09-13 12:27:35 - the same instant as every
-- other account - so they carry the shared tenant literal, which has been in
-- this repository's git history since 2026-08-25.
--
-- So: three working logins into the product, on a publicly known password,
-- belonging to nobody, that no one is counting. `resolveTenantScope()` returns
-- an empty scope for them, so there is nothing of anyone else's to see - but an
-- authenticated session is an authenticated session, and these three were not
-- on anybody's list.
--
-- They also inflate the tenant count: `GET /admin/tenants` returns 44 rows and
-- `check:ledger` reports 43 tenants, three of whom are not people.
--
-- ----------------------------------------------------------------------------
-- WHY DEACTIVATE RATHER THAN DELETE
-- ----------------------------------------------------------------------------
--   * It is reversible - one column, and the previous value is recorded here.
--   * It is sufficient: `authService` rejects a non-active account at BOTH
--     sign-in (`:108`) and token verification (`:216`), so existing tokens die
--     too, not just new logins.
--   * Deletion would destroy the evidence of what the import did, and these rows
--     are the only record that it happened.
--
-- The guards in the WHERE clause are not decoration. If any of these rows has
-- since acquired a tenancy or a ledger entry, it is not the artifact this
-- migration describes, and the statement will correctly skip it.
--
-- BEFORE: all three `account_status = 'active'`, verified 2026-09-17.
-- TO REVERSE: set the same three ids back to 'active'.
-- ============================================================================

UPDATE public.profiles
   SET account_status = 'inactive',
       updated_at     = now()
 WHERE id IN (
         '123229d3-bc44-48a5-b101-a8e207fa015f',  -- Mireel Fatima ParcareyINV.#5223
         '11528c89-b3f0-4ede-814a-5730f7041c61',  -- Nikki ProllamanteINV#5212
         '5ab0c29a-d443-4d5c-b138-e84633bc8d43'   -- Ron Juliene DominguinoINV.#5227
       )
   AND account_status = 'active'
   AND NOT EXISTS (SELECT 1 FROM public.room_assignments      a WHERE a.tenant_profile_id = profiles.id)
   AND NOT EXISTS (SELECT 1 FROM public.monthly_income_records m WHERE m.tenant_profile_id = profiles.id)
   AND NOT EXISTS (SELECT 1 FROM public.bills                  b WHERE b.tenant_profile_id = profiles.id)
   AND NOT EXISTS (SELECT 1 FROM public.payments               p WHERE p.tenant_profile_id = profiles.id)
RETURNING id, full_name, account_status;

-- Expect exactly THREE rows back. Fewer means one of them has acquired records
-- since 2026-09-17 and needs looking at rather than deactivating.

-- Then confirm the count the administrator sees:
--   SELECT COUNT(*) FROM public.profiles WHERE role = 'tenant' AND account_status = 'active';
-- Expect 39, down from 42. (43 tenant rows exist; one is already inactive.)
--
-- ----------------------------------------------------------------------------
-- A FOURTH ACCOUNT MATCHES THE SAME SHAPE AND MUST BE LEFT ALONE
-- ----------------------------------------------------------------------------
-- Querying for "active tenant-role account with no tenancy and no ledger rows"
-- returns FOUR, not three. The fourth is
--
--     John Lloyd Cuario  <luydcuario@gmail.com>  created 2026-08-21
--
-- - a team member's own account, carrying role 'tenant' because that is what the
-- portal needs to be exercised. It is not an import artifact and it is not in
-- the statement above.
--
-- Worth stating because the obvious query finds it, and a later sweep that
-- deactivates "all accounts with no tenancy" would lock out the database
-- administrator. `check:ledger` prints all four every run, each with which kind
-- it is.
