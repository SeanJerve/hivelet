/**
 * @file 20260801000000_security_hardening.sql
 * @description DB-first security hardening pass found while auditing the schema against
 *              docs/DATABASE_SPECIFICATION.md before wiring real authentication into the frontend.
 * @rationale current_user_role() previously defaulted to 'admin' whenever no profile row matched
 *            auth.uid() -- which is also true for every anonymous/unauthenticated request. That
 *            meant every RLS policy checking current_user_role() = 'admin' was satisfied by anyone,
 *            defeating the DB-first security model entirely. This migration closes that and two
 *            related gaps (self role escalation, open ticket thread policies) without altering any
 *            table shape from the original schema migration.
 */

-- ==============================================================================
-- 0. TABLE-LEVEL GRANTS (this Supabase CLI version no longer auto-exposes new public
--    tables to anon/authenticated -- see api.auto_expose_new_tables in config.toml).
--    Without these grants PostgREST returns 42501 "permission denied" before RLS is
--    even evaluated, regardless of policy correctness. RLS policies (already defined
--    in the schema migration, tightened further below) remain the actual access gate;
--    these grants only restore the table-level visibility every policy assumes.
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

-- ==============================================================================
-- 1. DENY-BY-DEFAULT ROLE RESOLUTION (was defaulting to 'admin')
-- ==============================================================================
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role_type AS $$
DECLARE
    u_role user_role_type;
BEGIN
    SELECT role INTO u_role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
    IF u_role IS NULL THEN
        -- Deny-by-default: no matching profile (including anonymous requests, where
        -- auth.uid() is NULL) resolves to the lowest-privilege role, never admin.
        RETURN 'prospect'::user_role_type;
    END IF;
    RETURN u_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. PREVENT SELF-ESCALATION VIA THE "own row" PROFILES POLICY
-- ==============================================================================
-- policy_admin_all_profiles grants FOR ALL (incl. UPDATE) to auth_user_id = auth.uid(),
-- so a signed-in tenant could otherwise UPDATE their own role/account_status. Guard it
-- with a trigger instead of narrowing the policy, so normal self-service field edits
-- (phone, emergency contact, occupation, facebook_url -- FR-010) keep working untouched.
CREATE OR REPLACE FUNCTION prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- service_role is only ever used by the backend's tenant-onboarding endpoint, which
    -- already requires an admin-authenticated caller (requireAdmin middleware) before it
    -- touches this table -- so it's a legitimate, already-authorized escape hatch here.
    IF current_user = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.account_status IS DISTINCT FROM OLD.account_status)
       AND current_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Only an administrator may change role or account_status.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_profile_privilege_escalation();

-- ==============================================================================
-- 2B. TENANT READ ACCESS TO THEIR OWN ROOM ASSIGNMENT
-- ==============================================================================
-- The schema migration only ever granted policy_admin_room_assignments (admin-only),
-- so an active tenant had no way to see their own room/occupant_count/anniversary_date
-- -- breaking the Tenant Portal despite the System Bible explicitly requiring tenants
-- be able to "view relevant room and account information" (Section 4).
DROP POLICY IF EXISTS policy_room_assignments_tenant_read ON room_assignments;
CREATE POLICY policy_room_assignments_tenant_read ON room_assignments FOR SELECT USING (
    tenant_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

-- A tenant must be able to see their OWN assigned room even if it's since been marked
-- Hidden from public marketing (visibility_status governs public listing, not tenant access).
DROP POLICY IF EXISTS policy_rooms_tenant_read_own ON rooms;
CREATE POLICY policy_rooms_tenant_read_own ON rooms FOR SELECT USING (
    id IN (
        SELECT room_id FROM room_assignments
        WHERE tenant_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        AND is_active = TRUE
    )
);

-- ==============================================================================
-- 3. SCOPE TICKET ATTACHMENTS & MESSAGES TO THE OWNING TENANT (BR-024)
-- ==============================================================================
-- Previously USING (true) FOR ALL -- any authenticated or anonymous caller could read
-- or write any tenant's maintenance ticket photos/messages.
DROP POLICY IF EXISTS policy_ticket_attachments_all ON ticket_attachments;

CREATE POLICY policy_ticket_attachments_select ON ticket_attachments FOR SELECT USING (
    current_user_role() = 'admin' OR EXISTS (
        SELECT 1 FROM maintenance_tickets mt
        JOIN profiles p ON p.id = mt.tenant_profile_id
        WHERE mt.id = ticket_attachments.ticket_id AND p.auth_user_id = auth.uid()
    )
);

CREATE POLICY policy_ticket_attachments_insert ON ticket_attachments FOR INSERT WITH CHECK (
    current_user_role() = 'admin' OR EXISTS (
        SELECT 1 FROM maintenance_tickets mt
        JOIN profiles p ON p.id = mt.tenant_profile_id
        WHERE mt.id = ticket_attachments.ticket_id AND p.auth_user_id = auth.uid()
    )
);

CREATE POLICY policy_ticket_attachments_admin_delete ON ticket_attachments FOR DELETE USING (
    current_user_role() = 'admin'
);

DROP POLICY IF EXISTS policy_ticket_messages_all ON ticket_messages;

CREATE POLICY policy_ticket_messages_select ON ticket_messages FOR SELECT USING (
    current_user_role() = 'admin' OR EXISTS (
        SELECT 1 FROM maintenance_tickets mt
        JOIN profiles p ON p.id = mt.tenant_profile_id
        WHERE mt.id = ticket_messages.ticket_id AND p.auth_user_id = auth.uid()
    )
);

CREATE POLICY policy_ticket_messages_insert ON ticket_messages FOR INSERT WITH CHECK (
    current_user_role() = 'admin' OR EXISTS (
        SELECT 1 FROM maintenance_tickets mt
        JOIN profiles p ON p.id = mt.tenant_profile_id
        WHERE mt.id = ticket_messages.ticket_id AND p.auth_user_id = auth.uid()
    )
);

-- ==============================================================================
-- 4. TICKET PHOTO STORAGE BUCKET (FR-022)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-photos', 'ticket-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Object paths are expected as "<ticket_id>/<filename>" so ownership can be checked
-- from the path itself without an extra join table.
DROP POLICY IF EXISTS policy_ticket_photos_select ON storage.objects;
CREATE POLICY policy_ticket_photos_select ON storage.objects FOR SELECT USING (
    bucket_id = 'ticket-photos' AND (
        current_user_role() = 'admin' OR EXISTS (
            SELECT 1 FROM maintenance_tickets mt
            JOIN profiles p ON p.id = mt.tenant_profile_id
            WHERE mt.id::text = (storage.foldername(name))[1] AND p.auth_user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS policy_ticket_photos_insert ON storage.objects;
CREATE POLICY policy_ticket_photos_insert ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'ticket-photos' AND (
        current_user_role() = 'admin' OR EXISTS (
            SELECT 1 FROM maintenance_tickets mt
            JOIN profiles p ON p.id = mt.tenant_profile_id
            WHERE mt.id::text = (storage.foldername(name))[1] AND p.auth_user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS policy_ticket_photos_admin_delete ON storage.objects;
CREATE POLICY policy_ticket_photos_admin_delete ON storage.objects FOR DELETE USING (
    bucket_id = 'ticket-photos' AND current_user_role() = 'admin'
);
