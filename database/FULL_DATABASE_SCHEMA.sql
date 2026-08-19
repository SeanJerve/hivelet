-- =============================================================================
-- HIVELET (FE GALANG DA SILVA BOARDING HOUSE MANAGEMENT SYSTEM)
-- COMPLETE MASTER DATABASE SCHEMA & MIGRATION SCRIPT (IDEMPOTENT & ROBUST)
-- =============================================================================
-- @systemBibleRef  docs/01_SYSTEM_BIBLE.md (All Sections)
-- @architectureRef docs/04_ARCHITECTURE.md
-- @databaseDesign docs/05_DATABASE_DESIGN.md
-- @businessRules   docs/02_BUSINESS_RULES.md (BR-001 through BR-049)
--
-- HOW TO RUN IN SUPABASE:
--   1. Open your Supabase Project Dashboard.
--   2. Go to "SQL Editor" -> Click "New query".
--   3. Paste this entire script and click "Run".
--   4. Works on both BRAND NEW databases and PRE-EXISTING tables.
-- =============================================================================

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. CLUSTERS (Canonical Property Grouping - BR-032 / 09_MONTHLY_INCOME_REPORT.md)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clusters (
  code          VARCHAR(50) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.clusters (code, name, display_order)
VALUES
  ('BH', 'BH (Main Rooms)', 1),
  ('Back Apartment', 'Back Apartment', 2),
  ('Penthouse', 'Penthouse', 3),
  ('Front Apartment', 'Front Apartment', 4),
  ('Linda', 'Linda Special Units', 5)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, display_order = EXCLUDED.display_order;

-- =============================================================================
-- 2. PROFILES (Users, Identities & RBAC - System Bible §4, §19, §20)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   VARCHAR(255) UNIQUE NOT NULL,
  password_hash           VARCHAR(255),
  full_name               VARCHAR(150) NOT NULL,
  phone_number            VARCHAR(50),
  emergency_contact_name  VARCHAR(150),
  emergency_contact_phone VARCHAR(50),
  occupation              VARCHAR(100),
  facebook_url            VARCHAR(255),
  role                    VARCHAR(50) NOT NULL DEFAULT 'tenant',
  account_status          VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login_at           TIMESTAMPTZ,
  failed_login_count      INTEGER NOT NULL DEFAULT 0,
  locked_until            TIMESTAMPTZ,
  password_changed_at     TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all RBAC columns exist on pre-existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash           VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_login_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_login_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_changed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS emergency_contact_name  VARCHAR(150),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS occupation              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS facebook_url            VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role                    VARCHAR(50) NOT NULL DEFAULT 'tenant',
  ADD COLUMN IF NOT EXISTS account_status          VARCHAR(50) NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles (role, account_status);

-- =============================================================================
-- 3. ROOMS (33 Canonical Rentable Units - System Bible §5, §6, §7)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_code       VARCHAR(50) NOT NULL REFERENCES public.clusters(code) ON UPDATE CASCADE,
  room_number        VARCHAR(20) UNIQUE NOT NULL,
  floor              INTEGER NOT NULL DEFAULT 1,
  room_type          VARCHAR(50) NOT NULL DEFAULT 'Studio',
  capacity           INTEGER NOT NULL DEFAULT 1,
  base_price         NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  current_price      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  description        TEXT,
  operational_status VARCHAR(50) NOT NULL DEFAULT 'Available',
  visibility_status  VARCHAR(50) NOT NULL DEFAULT 'Published',
  is_linda_unit      BOOLEAN NOT NULL DEFAULT FALSE,
  available_from     DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on pre-existing rooms table
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS cluster_code       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS floor              INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS room_type          VARCHAR(50) NOT NULL DEFAULT 'Studio',
  ADD COLUMN IF NOT EXISTS capacity           INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_price         NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS current_price      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS operational_status VARCHAR(50) NOT NULL DEFAULT 'Available',
  ADD COLUMN IF NOT EXISTS visibility_status  VARCHAR(50) NOT NULL DEFAULT 'Published',
  ADD COLUMN IF NOT EXISTS is_linda_unit      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS available_from     DATE;

-- =============================================================================
-- 4. ROOM PHOTOS (Public Catalog Room Imagery - Migration 004 / FR-003)
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_room_photos_room ON public.room_photos (room_id, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_photos_one_primary ON public.room_photos (room_id) WHERE is_primary;

-- =============================================================================
-- 5. ROOM PRICE HISTORY (2% Annual Price Increase Rule - 05_DATABASE_DESIGN.md)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.room_price_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  previous_price NUMERIC(10, 2) NOT NULL,
  new_price      NUMERIC(10, 2) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason         TEXT,
  created_by     UUID REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_room ON public.room_price_history (room_id);

-- =============================================================================
-- 6. ROOM ASSIGNMENTS (Occupancy & Tenancy Relationships - System Bible §8)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.room_assignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  tenant_profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date         DATE NOT NULL,
  end_date           DATE,
  anniversary_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  deposit_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  occupant_count     INTEGER NOT NULL DEFAULT 1,
  is_primary_contact BOOLEAN NOT NULL DEFAULT TRUE,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist on pre-existing room_assignments
ALTER TABLE public.room_assignments
  ADD COLUMN IF NOT EXISTS anniversary_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS deposit_amount     NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS occupant_count     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_primary_contact BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_room_assignments_tenant_active ON public.room_assignments (tenant_profile_id, is_active);
CREATE INDEX IF NOT EXISTS idx_room_assignments_room_active ON public.room_assignments (room_id, is_active);

-- =============================================================================
-- 7. INQUIRIES & MESSAGES (Public Prospective Inquiries - System Bible §9, §16)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.inquiries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  prospect_name       VARCHAR(150) NOT NULL,
  prospect_email      VARCHAR(255) NOT NULL,
  prospect_phone      VARCHAR(50) NOT NULL,
  message             TEXT NOT NULL,
  status              VARCHAR(50) NOT NULL DEFAULT 'Pending',
  converted_tenant_id UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_room ON public.inquiries (room_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries (status);

CREATE TABLE IF NOT EXISTS public.inquiry_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id   UUID NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES public.profiles(id),
  sender_name  VARCHAR(150) NOT NULL,
  message_body TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry ON public.inquiry_messages (inquiry_id);

-- =============================================================================
-- 8. BILLS & PAYMENTS (Resident Portal & Adyen Gateway - System Bible §10, §12)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bills (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id               UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  tenant_profile_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bill_type             VARCHAR(50) NOT NULL DEFAULT 'Rent',
  billing_period_start  DATE NOT NULL DEFAULT CURRENT_DATE,
  billing_period_end    DATE NOT NULL DEFAULT CURRENT_DATE,
  rent_amount           NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  water_amount          NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_amount          NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  due_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  grace_period_end_date DATE,
  status                VARCHAR(50) NOT NULL DEFAULT 'Due',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_tenant ON public.bills (tenant_profile_id);
CREATE INDEX IF NOT EXISTS idx_bills_room ON public.bills (room_id);
CREATE INDEX IF NOT EXISTS idx_bills_status_due ON public.bills (status, due_date);

CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id               UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  room_id               UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  tenant_profile_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount                NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_method        VARCHAR(50) NOT NULL DEFAULT 'Cash',
  payment_source        VARCHAR(100),
  verification_status   VARCHAR(50) NOT NULL DEFAULT 'Verified',
  transaction_reference VARCHAR(150),
  paid_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at           TIMESTAMPTZ,
  verified_by           UUID REFERENCES public.profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments (tenant_profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_room ON public.payments (room_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON public.payments (bill_id);

-- =============================================================================
-- 9. MONTHLY INCOME RECORDS (Landlady Income Ledger - 09_MONTHLY_INCOME_REPORT.md)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_income_records (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id                  UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  tenant_profile_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignment_id            UUID REFERENCES public.room_assignments(id) ON DELETE SET NULL,
  year                     INTEGER NOT NULL,
  month                    INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  date_paid                DATE NOT NULL,
  contact_name             VARCHAR(150) NOT NULL,
  invoice_number           VARCHAR(100),
  rent_period_start        DATE,
  rent_period_end          DATE,
  rent_amount              NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  fifty_percent_share      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  occupants                INTEGER NOT NULL DEFAULT 1,
  water_payment            NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  gbg_fee                  NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  remitted_amount          NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_method           VARCHAR(50) NOT NULL DEFAULT 'Cash',
  transaction_reference    VARCHAR(120),
  is_linda_billing         BOOLEAN NOT NULL DEFAULT FALSE,
  linda_electricity_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  linda_water_charge       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  verification_status      VARCHAR(50) NOT NULL DEFAULT 'Verified',
  voided_at                TIMESTAMPTZ,
  voided_by                UUID REFERENCES public.profiles(id),
  void_reason              TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist before creating indexes
ALTER TABLE public.monthly_income_records
  ADD COLUMN IF NOT EXISTS transaction_reference    VARCHAR(120),
  ADD COLUMN IF NOT EXISTS is_linda_billing         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS linda_electricity_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS linda_water_charge       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS gbg_fee                  NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS fifty_percent_share      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS voided_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by                UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason              TEXT;

CREATE INDEX IF NOT EXISTS idx_income_active ON public.monthly_income_records (year, month) WHERE voided_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_income_room ON public.monthly_income_records (room_id);

-- =============================================================================
-- 10. EXPENSE CATEGORIES & LEDGER (10_MONTHLY_EXPENSES_REPORT.md / BR-043, BR-044)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.fixed_expense_categories (
  code          VARCHAR(20) PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  parent_code   VARCHAR(20) REFERENCES public.fixed_expense_categories(code),
  display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.fixed_expense_categories (code, name, parent_code, display_order)
VALUES
  ('1', 'Supplies', NULL, 1),
  ('2', 'Taxes and Licenses', NULL, 2),
  ('3', 'Janitorial and Messengerial Services', NULL, 3),
  ('4', 'Depreciation', NULL, 4),
  ('5', 'Professional Fees', NULL, 5),
  ('6', 'Salaries: Michelle', NULL, 6),
  ('6a', 'PhilHealth', '6', 7),
  ('6b', 'SSS', '6', 8),
  ('6c', 'Allowances', '6', 9),
  ('7', 'Communication, Light, and Water', NULL, 10),
  ('8', 'Repairs and Maintenance', NULL, 11),
  ('9', 'Fuel and Oil', NULL, 12),
  ('10', 'Others', NULL, 13)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.monthly_expense_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date   DATE NOT NULL,
  or_supplier    VARCHAR(200) NOT NULL,
  category_code  VARCHAR(20) NOT NULL REFERENCES public.fixed_expense_categories(code),
  total_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  voided_at      TIMESTAMPTZ,
  voided_by      UUID REFERENCES public.profiles(id),
  void_reason    TEXT,
  created_by     UUID REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist on pre-existing monthly_expense_entries
ALTER TABLE public.monthly_expense_entries
  ADD COLUMN IF NOT EXISTS voided_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_by   UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_expense_active ON public.monthly_expense_entries (expense_date) WHERE voided_at IS NULL;

CREATE TABLE IF NOT EXISTS public.expense_property_allocations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_entry_id UUID NOT NULL REFERENCES public.monthly_expense_entries(id) ON DELETE CASCADE,
  property_area    VARCHAR(100) NOT NULL,
  amount           NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allocations_entry ON public.expense_property_allocations (expense_entry_id);

-- =============================================================================
-- 11. MAINTENANCE TICKETS & MESSAGES (System Bible §15, §16 / FR-021..FR-025)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  tenant_profile_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               VARCHAR(200) NOT NULL,
  description         TEXT NOT NULL,
  category            VARCHAR(100) NOT NULL,
  priority            VARCHAR(50) NOT NULL DEFAULT 'Medium',
  status              VARCHAR(50) NOT NULL DEFAULT 'Submitted',
  assigned_technician VARCHAR(160),
  resolved_at         TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  closed_by           UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure assigned_technician exists on pre-existing maintenance_tickets
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS assigned_technician VARCHAR(160),
  ADD COLUMN IF NOT EXISTS closed_by           UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS closed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_tenant ON public.maintenance_tickets (tenant_profile_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_room ON public.maintenance_tickets (room_id);

CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  file_url   TEXT NOT NULL,
  file_type  VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket ON public.ticket_attachments (ticket_id);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES public.profiles(id),
  message_body TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON public.ticket_messages (ticket_id);

-- =============================================================================
-- 12. NOTIFICATIONS, AUDIT TRAIL & SYSTEM SETTINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                VARCHAR(200) NOT NULL,
  message              TEXT NOT NULL,
  type                 VARCHAR(50) NOT NULL,
  priority             VARCHAR(50) NOT NULL DEFAULT 'Medium',
  is_read              BOOLEAN NOT NULL DEFAULT FALSE,
  related_entity_type  VARCHAR(50),
  related_entity_id    UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_profile_id, is_read);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action           VARCHAR(100) NOT NULL,
  entity_type      VARCHAR(100) NOT NULL,
  entity_id        VARCHAR(100) NOT NULL,
  previous_values  JSONB,
  new_values       JSONB,
  ip_address       VARCHAR(50),
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key           VARCHAR(80) PRIMARY KEY,
  value         TEXT NOT NULL,
  value_type    VARCHAR(20) NOT NULL DEFAULT 'number',
  label         VARCHAR(160) NOT NULL,
  description   TEXT,
  business_rule VARCHAR(20),
  updated_by    UUID REFERENCES public.profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.system_settings (key, value, value_type, label, description, business_rule)
VALUES
  ('water_rate_per_occupant', '200', 'number', 'Standard water rate per occupant', 'Monthly water charge per registered occupant, in PHP.', 'BR-014'),
  ('linda_lf_water_charge', '400', 'number', 'Linda Front (LF) fixed water charge', 'Flat monthly water charge for unit LF, remitted directly to Linda.', 'BR-040'),
  ('linda_lb_water_charge', '200', 'number', 'Linda Back (LB) fixed water charge', 'Flat monthly water charge for unit LB, remitted directly to Linda.', 'BR-040'),
  ('linda_lb_electricity_charge', '325', 'number', 'Linda Back (LB) fixed electricity charge', 'Flat monthly electricity charge for unit LB.', 'BR-040'),
  ('grace_period_days', '7', 'number', 'Payment grace period (days)', 'Days after due date before overdue.', 'BR-012'),
  ('revenue_share_percent', '50', 'number', 'Revenue share percentage', 'Share of gross rent recorded on each monthly income entry.', 'BR-035')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 13. SEED THE 33 CANONICAL UNITS (09_MONTHLY_INCOME_REPORT.md / canonicalUnits.ts)
-- =============================================================================
-- Note: room_type values match room_type_enum ('Studio', 'One-bedroom', 'Two-bedroom', 'Three-bedroom')
INSERT INTO public.rooms (room_number, cluster_code, floor, room_type, capacity, base_price, current_price, operational_status, visibility_status, is_linda_unit, description)
VALUES
  ('1a', 'BH', 1, 'Studio', 2, 4500, 4500, 'Available', 'Published', FALSE, 'Quiet 1st Floor BH Studio Unit near main entrance.'),
  ('1b', 'BH', 1, 'Studio', 2, 4500, 4500, 'Available', 'Published', FALSE, 'Cozy ground floor Studio unit with tiled bath.'),
  ('1c', 'BH', 1, 'One-bedroom', 3, 6000, 6000, 'Available', 'Published', FALSE, 'Renovated 1-Bedroom unit with private kitchen submeter.'),
  ('1d', 'BH', 1, 'Studio', 2, 4500, 4500, 'Available', 'Published', FALSE, 'Standard 1st Floor Studio Unit.'),
  ('1e', 'BH', 1, 'Studio', 2, 4500, 4500, 'Available', 'Published', FALSE, 'Freshly painted Studio unit.'),
  ('1f', 'BH', 1, 'Two-bedroom', 4, 8000, 8000, 'Available', 'Published', FALSE, 'Spacious 2-Bedroom unit for family or room sharing.'),
  ('1g', 'BH', 1, 'Studio', 2, 4500, 4500, 'Available', 'Published', FALSE, 'Studio unit near courtyard access.'),
  ('1h', 'BH', 1, 'Studio', 2, 4500, 4500, 'Available', 'Published', FALSE, 'End hallway Studio unit.'),

  ('2a', 'BH', 2, 'Studio', 2, 4600, 4600, 'Available', 'Published', FALSE, '2nd Floor Studio with window balcony view.'),
  ('2b', 'BH', 2, 'Studio', 2, 4600, 4600, 'Available', 'Published', FALSE, 'Quiet 2nd Floor Studio.'),
  ('2c', 'BH', 2, 'Studio', 2, 4600, 4600, 'Available', 'Published', FALSE, 'Well ventilated Studio unit.'),
  ('2d', 'BH', 2, 'One-bedroom', 3, 6200, 6200, 'Available', 'Published', FALSE, 'Available 1-Bedroom unit on 2nd Floor.'),
  ('2e', 'BH', 2, 'Studio', 2, 4600, 4600, 'Available', 'Published', FALSE, 'Standard 2nd floor Studio.'),
  ('2f', 'BH', 2, 'Studio', 2, 4600, 4600, 'Available', 'Published', FALSE, 'Compact 2nd Floor Studio.'),
  ('2g', 'BH', 2, 'Two-bedroom', 4, 8200, 8200, 'Available', 'Published', FALSE, 'Large 2-Bedroom unit on 2nd floor.'),

  ('3a', 'BH', 3, 'Studio', 2, 4700, 4700, 'Available', 'Published', FALSE, 'Top floor high ceiling Studio.'),
  ('3b', 'BH', 3, 'Studio', 2, 4700, 4700, 'Available', 'Published', FALSE, '3rd Floor Studio unit.'),
  ('3c', 'BH', 3, 'Studio', 2, 4700, 4700, 'Available', 'Published', FALSE, 'Quiet 3rd Floor Studio.'),
  ('3d', 'BH', 3, 'Studio', 2, 4700, 4700, 'Available', 'Published', FALSE, 'Standard 3rd Floor Studio.'),
  ('3e', 'BH', 3, 'Studio', 2, 4700, 4700, 'Available', 'Published', FALSE, '3rd Floor Studio unit.'),
  ('3f', 'BH', 3, 'Studio', 2, 4700, 4700, 'Available', 'Published', FALSE, 'Available 3rd Floor Studio.'),
  ('3g', 'BH', 3, 'Three-bedroom', 5, 10000, 10000, 'Available', 'Published', FALSE, 'Premium 3-Bedroom family unit.'),

  ('B1F', 'Back Apartment', 1, 'One-bedroom', 3, 6500, 6500, 'Available', 'Published', FALSE, 'Ground floor Back Apartment 1-Bedroom.'),
  ('B2F', 'Back Apartment', 2, 'One-bedroom', 3, 6500, 6500, 'Available', 'Published', FALSE, '2nd Floor Front Back Apartment.'),
  ('B2B', 'Back Apartment', 2, 'One-bedroom', 3, 6500, 6500, 'Available', 'Published', FALSE, '2nd Floor Rear Back Apartment.'),
  ('B3F', 'Back Apartment', 3, 'One-bedroom', 3, 6800, 6800, 'Available', 'Published', FALSE, 'Available 3rd Floor Back Apartment.'),
  ('B3B', 'Back Apartment', 3, 'One-bedroom', 3, 6800, 6800, 'Available', 'Published', FALSE, '3rd Floor Rear Back Apartment.'),

  ('PH', 'Penthouse', 3, 'Three-bedroom', 5, 12000, 12000, 'Available', 'Published', FALSE, 'Penthouse Master Suite on top level (BR-032).'),

  ('F1', 'Front Apartment', 1, 'Two-bedroom', 4, 8500, 8500, 'Available', 'Published', FALSE, 'Front Apartment 1st Floor 2-Bedroom.'),
  ('F2F', 'Front Apartment', 2, 'Two-bedroom', 4, 8500, 8500, 'Available', 'Published', FALSE, 'Front Apartment 2nd Floor Front.'),
  ('F2B', 'Front Apartment', 2, 'Two-bedroom', 4, 8500, 8500, 'Available', 'Published', FALSE, 'Available Front Apartment 2nd Floor Back.'),

  ('LF', 'Linda', 1, 'One-bedroom', 3, 5000, 5000, 'Available', 'Published', TRUE, 'Linda Front Special Unit (Gayon) - Fixed Rates BR-040.'),
  ('LB', 'Linda', 1, 'One-bedroom', 2, 4800, 4800, 'Available', 'Published', TRUE, 'Linda Back Special Unit (Jaye Casia) - Fixed Rates BR-040.')
ON CONFLICT (room_number) DO NOTHING;

-- =============================================================================
-- 14. SEED RBAC USERS (DEVELOPMENT / DEFENSE DEMO CREDENTIALS)
-- =============================================================================
INSERT INTO public.profiles (id, email, password_hash, full_name, phone_number, role, account_status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@hivelet.ph', '$2a$12$L3h2PeffvWzk55Ib.KLT6egtU6gdG0VqxZCujhQCl8WW30aek7FU.', 'Mrs. Fe Galang Da Silva', '09171234567', 'admin', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'mark.cruz@gmail.com', '$2a$12$rjbLOeEdh1Um9x2uX6BeEe1tScu6dsiz0WjiVgx5wlng5LarrGdPC', 'Mark Cruz', '09181234567', 'tenant', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'sean.jerve@gmail.com', '$2a$12$/IARQqPw7cohJL8dEhzYUO5mQm/oRzpzLtlZdExWQBxyMhIyVyW..', 'Sean Jerve', '09191234567', 'tenant', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'john.lloyd@gmail.com', '$2a$12$UtX3bdkZetJ7j6P5MdBPtuJ6MNysPmZGERu.rV7Hb62DLL0KXewpi', 'John Lloyd', '09201234567', 'tenant', 'active'),
  ('55555555-5555-5555-5555-555555555555', 'jaye.casia@gmail.com', '$2a$12$8/A5qIMI.AFx0JXWPo/ZhOSaMDWF8EDrxT7.cfnBNadcz//.dmQny', 'Jaye Casia', '09211234567', 'tenant', 'active'),
  ('66666666-6666-6666-6666-666666666666', 'miguel.ramos@gmail.com', '$2a$12$KEQsAqipGvBzA4GwV3sSi.A2Fm4lCRJ3OPPUM/YKx.gJ8RvoqgGD2', 'Miguel Ramos', '09221234567', 'tenant', 'inactive'),
  ('77777777-7777-7777-7777-777777777777', 'rhea.mendoza@gmail.com', NULL, 'Rhea Mendoza', '09231234567', 'prospect', 'active')
ON CONFLICT (id) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    account_status = EXCLUDED.account_status;

-- =============================================================================
-- 15. RLS LOCKDOWN & DATABASE SECURITY BOUNDARY (002_rbac_rls_lockdown.sql)
-- =============================================================================
DO $$
DECLARE
  t TEXT;
  app_tables TEXT[] := ARRAY[
    'profiles',
    'clusters',
    'rooms',
    'room_photos',
    'room_price_history',
    'room_assignments',
    'inquiries',
    'inquiry_messages',
    'bills',
    'payments',
    'monthly_income_records',
    'fixed_expense_categories',
    'monthly_expense_entries',
    'expense_property_allocations',
    'maintenance_tickets',
    'ticket_attachments',
    'ticket_messages',
    'notifications',
    'audit_logs',
    'system_settings'
  ];
BEGIN
  FOREACH t IN ARRAY app_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('ALTER TABLE public.%I FORCE  ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END
$$;

-- Revoke direct browser-facing access (Express backend connects via service_role)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;

-- Make audit_logs strictly append-only
REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.audit_logs FROM anon, authenticated, service_role;

COMMIT;
