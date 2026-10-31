-- 086 - indexes for the audit trail and for a tenant's receipts
--
-- Sean, 31 Oct 2026, asked whether the columns the app filters by are indexed. Most are. Read from
-- pg_indexes and pg_stat_user_tables the same day, the gaps worth closing are these two tables:
--
--   audit_logs held 19,076 rows with no index but its primary key, and is read newest first (the
--   Activity page, the owner's recent actions, the login failure count in routes/auth.ts). Measured
--   13.5 ms and 3.7 ms, each reading the whole table, and the table only grows: migration 002
--   revokes DELETE on it.
--
--   monthly_income_records is read by tenant_profile_id on every tenant's live check
--   (live_version) and their payments page, and that foreign key has no index.
--
-- The tables are small, so this saves milliseconds, not seconds. Indexes only: no row changes.
-- Verify:
--   SELECT indexname FROM pg_indexes
--    WHERE indexname IN ('idx_audit_logs_created', 'idx_audit_logs_actor_created', 'idx_income_tenant');
--   -- three rows

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs (actor_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_income_tenant ON monthly_income_records (tenant_profile_id);
