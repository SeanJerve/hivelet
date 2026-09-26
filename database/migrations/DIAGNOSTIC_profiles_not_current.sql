-- =============================================================================
-- DIAGNOSTIC - every tenant or prospect account that is NOT a current tenant,
-- and what each one has on record. READ ONLY. Changes nothing.
-- =============================================================================
-- Why: the Tenants page lists these under "Moved out" (inactive accounts) or
-- as prospects. Mark Cruz, a demo account with no tenancy since 055, is one
-- of them. This shows the rest, so each can be called real or test before
-- anything is written.
--
-- How to read a row: a real former tenant has receipts (income_rows) and
-- usually tenancies. A test account typically has none, or only audit rows
-- from sign-ins, and a name or email that gives it away.
-- =============================================================================

SELECT p.full_name,
       p.role::text                AS role,
       p.account_status::text      AS status,
       coalesce(p.email, '')       AS email,
       to_char(p.created_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS created,
       (SELECT count(*) FROM room_assignments a WHERE a.tenant_profile_id = p.id)       AS tenancies,
       (SELECT count(*) FROM monthly_income_records i WHERE i.tenant_profile_id = p.id) AS income_rows,
       (SELECT count(*) FROM maintenance_tickets t WHERE t.tenant_profile_id = p.id)    AS repairs,
       (SELECT count(*) FROM audit_logs l WHERE l.actor_profile_id = p.id)              AS audit_rows,
       p.id
FROM profiles p
WHERE p.role::text IN ('tenant', 'prospect')
  AND NOT EXISTS (
        SELECT 1 FROM room_assignments a
        WHERE a.tenant_profile_id = p.id AND a.is_active)
ORDER BY income_rows, p.created_at;
