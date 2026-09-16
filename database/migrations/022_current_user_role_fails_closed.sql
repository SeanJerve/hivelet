-- ============================================================================
-- 022  current_user_role() must fail CLOSED
--
-- Remediation row A-14.
--
-- WHAT IT DID
-- -----------
-- The function is SECURITY DEFINER and answered like this:
--
--     SELECT role INTO u_role FROM profiles WHERE auth_user_id = auth.uid();
--     IF u_role IS NULL THEN
--         -- Default to 'admin' in local development environment
--         RETURN 'admin'::user_role_type;
--     END IF;
--
-- So a caller it could not identify was treated as an **administrator**.
--
-- And it could never identify anyone. `auth.uid()` reads the Supabase Auth JWT,
-- and this system does not use Supabase Auth - it issues its own tokens and
-- enforces RBAC in the backend. `profiles.auth_user_id` is NULL on **all 45
-- rows**, verified 2026-09-17, so the SELECT has never matched and the function
-- has only ever returned 'admin'.
--
-- WHY IT HAS NOT HURT ANYTHING
-- ----------------------------
-- Nothing calls it. Verified the same day: **0 policies** exist in `pg_policy`
-- and **0 views** reference it. RLS is forced on all 21 tables with zero
-- policies, and access is enforced by the backend's JWT and RBAC middleware
-- instead.
--
-- WHY IT IS STILL WORTH FIXING NOW
-- --------------------------------
-- It is a trap laid for whoever writes the first policy. The natural shape is
--
--     CREATE POLICY ... USING (public.current_user_role() = 'admin');
--
-- and with the old body that is `TRUE` for **every caller**, including
-- unauthenticated ones - a policy that reads like a restriction and grants
-- everything. The failure would be silent and total, and it would arrive on the
-- day someone finally did the right thing.
--
-- WHAT IT DOES NOW
-- ----------------
-- Returns **NULL** when the caller cannot be identified, rather than a role.
--
-- NULL is the correct answer here, and it is stronger than returning 'tenant':
-- in SQL, `NULL = 'admin'` is NULL, which is not TRUE, so a `USING` clause
-- built on it **denies**. `NULL <> 'admin'` is also NULL, so the inverted
-- spelling denies as well. There is no comparison against a role literal that a
-- NULL return can accidentally satisfy.
--
-- REVERSIBLE: this is a function body replacement. `pg_get_functiondef` for the
-- previous body is quoted in full above.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    u_role user_role_type;
BEGIN
    SELECT role INTO u_role
      FROM profiles
     WHERE auth_user_id = auth.uid()
     LIMIT 1;

    -- NULL, never a role. An unidentified caller gets no privileges, and every
    -- comparison against a role literal evaluates to NULL rather than TRUE.
    -- The previous body returned 'admin' here, described as a local-development
    -- default; it shipped to the live database.
    RETURN u_role;
END;
$function$;

COMMENT ON FUNCTION public.current_user_role() IS
  'Returns the caller''s role, or NULL when the caller cannot be identified. '
  'NULL is deliberate: it makes every policy comparison fail closed. A-14, '
  'migration 022. Reads auth.uid(), which this system does not populate - '
  'profiles.auth_user_id is NULL on every row - so it returns NULL today.';
