-- =============================================================================
-- Migration 004 — Schema Gaps Found by the Form Audit
-- =============================================================================
-- @auditRef       docs/11_FORM_FIELD_AUDIT.md §4
-- @systemBibleRef Section 5 (Property Model), Section 15 (Maintenance)
-- @businessRules  BR-014, BR-036, BR-040 (rates), BR-044 (split allocation)
-- @requirements   FR-022 Attachments, FR-032 Guided Payment Entry
--
-- Adds the storage the existing forms need but the schema does not yet have.
-- Apply AFTER 001-003. Idempotent; safe to re-run.
--
-- NOT included here: `profiles.email` nullability. That is open decision §7.1
-- in the audit — it changes the onboarding form as well, so it needs a
-- deliberate answer rather than a silent default.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. room_photos
--    System Bible Section 5 lists photos as room information, and the public
--    catalogue is meant to show them (FR-003). The admin unit form already has
--    a photo field writing to a `photo` string that has nowhere to go.
--    Modelled as a table, not a column, because a room has many photos.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  caption       VARCHAR(255),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by   UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_photos_room
  ON public.room_photos (room_id, display_order);

-- At most one primary photo per room — the catalogue card needs a single,
-- unambiguous thumbnail.
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_photos_one_primary
  ON public.room_photos (room_id)
  WHERE is_primary;

COMMENT ON TABLE public.room_photos IS
  'Room imagery for the public catalogue. See docs/11_FORM_FIELD_AUDIT.md F-10/F-11.';

-- -----------------------------------------------------------------------------
-- 2. system_settings
--    The water rate (BR-014), the Linda fixed rates (BR-040) and the grace
--    period (BR-012) are currently hardcoded in the frontend, and the System
--    Configuration screen writes them nowhere. Storing them makes the rules
--    auditable and lets the administrator adjust them without a redeploy.
--
--    Typed as text + a value_type discriminator so one table serves numeric,
--    boolean and string settings without a column per rule.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  key           VARCHAR(80) PRIMARY KEY,
  value         TEXT NOT NULL,
  value_type    VARCHAR(20) NOT NULL DEFAULT 'number'
                  CHECK (value_type IN ('number', 'string', 'boolean')),
  label         VARCHAR(160) NOT NULL,
  description   TEXT,
  business_rule VARCHAR(20),
  updated_by    UUID REFERENCES public.profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.system_settings IS
  'Administrator-adjustable business parameters. Admin-only (System Bible Section 4).';

INSERT INTO public.system_settings (key, value, value_type, label, description, business_rule)
VALUES
  ('water_rate_per_occupant', '200', 'number',
   'Standard water rate per occupant',
   'Monthly water charge per registered occupant, in PHP.', 'BR-014'),
  ('linda_lf_water_charge', '400', 'number',
   'Linda Front (LF) fixed water charge',
   'Flat monthly water charge for unit LF, remitted directly to Linda.', 'BR-040'),
  ('linda_lb_water_charge', '200', 'number',
   'Linda Back (LB) fixed water charge',
   'Flat monthly water charge for unit LB, remitted directly to Linda.', 'BR-040'),
  ('linda_lb_electricity_charge', '325', 'number',
   'Linda Back (LB) fixed electricity charge',
   'Flat monthly electricity charge for unit LB.', 'BR-040'),
  ('grace_period_days', '7', 'number',
   'Payment grace period (days)',
   'Days after the due date before a payment is seriously overdue.', 'BR-012'),
  ('revenue_share_percent', '50', 'number',
   'Revenue share percentage',
   'Share of gross rent recorded on each monthly income entry.', 'BR-035')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. monthly_income_records.transaction_reference
--    The payment form captures a GCash reference number with nowhere to store
--    it. `payments` has `transaction_reference`; the income ledger does not.
-- -----------------------------------------------------------------------------
ALTER TABLE public.monthly_income_records
  ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(120);

COMMENT ON COLUMN public.monthly_income_records.transaction_reference IS
  'GCash/bank reference for non-cash remittances. NULL for cash (FR-032).';

-- -----------------------------------------------------------------------------
-- 4. maintenance_tickets.assigned_technician
--    Both the admin dispatch table and the tenant portal display an assigned
--    technician. System Bible Section 15: the administrator should be able to
--    "assign or track resolution".
--
--    Free text rather than a FK: technicians are outside contractors, not
--    system users, and Section 3 excludes staff account management.
-- -----------------------------------------------------------------------------
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS assigned_technician VARCHAR(160);

COMMENT ON COLUMN public.maintenance_tickets.assigned_technician IS
  'Outside contractor handling the ticket. Not a system user (System Bible Section 3).';

-- -----------------------------------------------------------------------------
-- 5. Soft-delete support (BR-003 Historical Preservation)
--    Three UI actions currently hard-delete: deleteTenant, deleteIncomeRecord
--    and deleteExpenseItem. System Bible Section 14 requires that financial
--    history "never silently disappear", so the records must survive removal
--    and simply stop counting toward active totals.
-- -----------------------------------------------------------------------------
ALTER TABLE public.monthly_income_records
  ADD COLUMN IF NOT EXISTS voided_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by    UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason  TEXT;

ALTER TABLE public.monthly_expense_entries
  ADD COLUMN IF NOT EXISTS voided_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by    UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason  TEXT;

COMMENT ON COLUMN public.monthly_income_records.voided_at IS
  'Set instead of deleting. Voided rows are excluded from active totals but retained (BR-003).';

-- Active-row lookups are the common case; index them.
CREATE INDEX IF NOT EXISTS idx_income_active
  ON public.monthly_income_records (year, month)
  WHERE voided_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_expense_active
  ON public.monthly_expense_entries (expense_date)
  WHERE voided_at IS NULL;

-- -----------------------------------------------------------------------------
-- 6. Apply the migration-002 security posture to the new tables.
--    New tables must not silently become anon-readable.
-- -----------------------------------------------------------------------------
ALTER TABLE public.room_photos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_photos      FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.system_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings  FORCE  ROW LEVEL SECURITY;

REVOKE ALL ON public.room_photos     FROM anon, authenticated;
REVOKE ALL ON public.system_settings FROM anon, authenticated;

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- SELECT key, value, label, business_rule FROM public.system_settings ORDER BY key;
--
-- SELECT table_name, column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND (
--     (table_name = 'monthly_income_records'  AND column_name IN ('transaction_reference','voided_at'))
--     OR (table_name = 'maintenance_tickets'  AND column_name = 'assigned_technician')
--     OR (table_name = 'monthly_expense_entries' AND column_name = 'voided_at')
--   )
-- ORDER BY table_name, column_name;
