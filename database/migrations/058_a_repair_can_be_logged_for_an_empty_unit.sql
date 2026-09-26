-- =============================================================================
-- 058 - a repair can be logged for an empty unit (B-28)
-- =============================================================================
-- NOT APPLIED by the author. One statement; safe to run twice.
--
-- `maintenance_tickets.tenant_profile_id` is NOT NULL because the table was
-- designed around the tenant portal, where a repair always has the tenant who
-- raised it. Since "Log a repair" (B-22) the owner files repairs herself, and
-- the one unit she is most likely to repair is the empty one she is getting
-- ready to let: the penthouse. With the column NOT NULL the server has to
-- refuse that ("That unit has no tenant on record").
--
-- Sean's decision, 2026-09-26: allow it. A repair to an empty unit is filed
-- with no tenant. Nothing else changes: every existing row keeps its tenant,
-- a tenant still only sees repairs filed against them, and the code tells no
-- one when a tenant-less repair is commented on or finished.
--
-- The backend handles both states: before this runs, a repair for an empty
-- unit is refused with the same clear message as before; after, it is saved.
-- =============================================================================

ALTER TABLE maintenance_tickets ALTER COLUMN tenant_profile_id DROP NOT NULL;

-- Check afterwards:
-- SELECT is_nullable FROM information_schema.columns
--  WHERE table_name = 'maintenance_tickets' AND column_name = 'tenant_profile_id';   -- YES
