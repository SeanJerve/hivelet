-- =============================================================================
-- 080 - the application cannot empty the audit trail
-- =============================================================================
-- Found 2026-10-07 writing docs/PROJECT_DOCUMENTS/05 from the catalogue:
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND table_name = 'audit_logs';
-- service_role (the API's role) holds INSERT, REFERENCES, SELECT, TRIGGER and
-- TRUNCATE. UPDATE and DELETE were taken away so the trail cannot be edited,
-- and Chapter 4 says so, but TRUNCATE empties the whole table in one statement.
-- Nothing in the application calls it and Supabase's REST interface does not
-- offer it; a direct SQL connection with the service key could. This takes it
-- away. postgres (the owner of the table, used for migrations) keeps it.
--
-- Changes no row. Idempotent: revoking a privilege not held is a no-op.
--
-- Verify: the query above lists service_role without TRUNCATE.
-- =============================================================================
REVOKE TRUNCATE ON TABLE public.audit_logs FROM service_role;
REVOKE TRUNCATE ON TABLE public.audit_logs FROM anon, authenticated;
