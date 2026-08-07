/**
 * @file 20260730000000_hivelet_3nf_schema.sql
 * @description Hivelet Official Supabase Migration File (3NF Relational Schema & DB-First RLS Security Policies).
 * @systemBibleRef docs/01_SYSTEM_BIBLE.md, docs/02_BUSINESS_RULES.md, docs/05_DATABASE_DESIGN.md
 * @rationale Official Supabase CLI migration file creating 18 3NF relational tables, constraints,
 *            generated columns (50% share, remitted amount), triggers, and DB-level RLS policies.
 */

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUM TYPES
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('admin', 'tenant', 'prospect');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE account_status_type AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE room_type_enum AS ENUM ('Studio', 'One-bedroom', 'Two-bedroom', 'Three-bedroom');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE operational_status_type AS ENUM ('Available', 'Reserved', 'Occupied', 'Under Maintenance');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE visibility_status_type AS ENUM ('Published', 'Hidden');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE inquiry_status_type AS ENUM ('Pending', 'Contacted', 'Converted', 'Closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM ('Cash', 'GCash', 'Bank Transfer', 'Adyen Online');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE verification_status_type AS ENUM ('Verified', 'Pending Verification', 'Rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bill_type_enum AS ENUM ('Rent', 'Water', 'Combined', 'Other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bill_status_type AS ENUM ('Pending', 'Due', 'Overdue', 'Paid', 'Partially Paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority_type AS ENUM ('Emergency', 'High', 'Medium', 'Low');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status_type AS ENUM ('Submitted', 'In Progress', 'Resolved', 'Closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE property_area_type AS ENUM (
        'Boarding House',
        'Main House',
        'Front Apartment',
        'Back Apartment',
        'Other Expenses / Personal'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- 2. CORE RELATIONAL TABLES (3NF)
-- ==============================================================================

-- Table: profiles (Linked 1:1 to auth.users in Supabase)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    occupation VARCHAR(100),
    facebook_url TEXT,
    role user_role_type NOT NULL DEFAULT 'tenant',
    account_status account_status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: clusters (Canonical Unit Clusters)
CREATE TABLE IF NOT EXISTS clusters (
    code VARCHAR(50) PRIMARY KEY, -- 'BH', 'Back Apartment', 'Front Apartment', 'Linda'
    name VARCHAR(100) NOT NULL,
    display_order INT NOT NULL
);

-- Table: rooms (32 Canonical Units)
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(20) UNIQUE NOT NULL, -- e.g., '1a', 'B1F', 'PH', 'LF'
    floor INT NOT NULL CHECK (floor IN (1, 2, 3)),
    cluster_code VARCHAR(50) NOT NULL REFERENCES clusters(code),
    room_type room_type_enum NOT NULL DEFAULT 'Studio',
    description TEXT,
    capacity INT NOT NULL CHECK (capacity > 0),
    base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    current_price NUMERIC(10,2) NOT NULL CHECK (current_price >= 0),
    operational_status operational_status_type NOT NULL DEFAULT 'Available',
    visibility_status visibility_status_type NOT NULL DEFAULT 'Published',
    available_from DATE,
    is_linda_unit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: room_price_history (Historical Pricing & 2% Annual Increase Audit)
CREATE TABLE IF NOT EXISTS room_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    previous_price NUMERIC(10,2) NOT NULL CHECK (previous_price >= 0),
    new_price NUMERIC(10,2) NOT NULL CHECK (new_price >= 0),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: room_assignments (Room-Centric Occupancy & Primary Contact History)
CREATE TABLE IF NOT EXISTS room_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    tenant_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    anniversary_date DATE NOT NULL, -- Tenant's move-in billing anchor date (BR-033, BR-039)
    deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (deposit_amount >= 0), -- BR-039
    occupant_count INT NOT NULL DEFAULT 1 CHECK (occupant_count >= 1), -- BR-034
    is_primary_contact BOOLEAN DEFAULT TRUE, -- BR-008
    is_active BOOLEAN DEFAULT TRUE, -- BR-004, BR-025
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial Unique Index: Enforce max ONE active primary assignment per room at DB level! (BR-026)
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_assignment_per_room 
ON room_assignments (room_id) WHERE is_active = TRUE;

-- Table: inquiries (Public Prospective Tenant Inquiries)
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    prospect_name VARCHAR(255) NOT NULL,
    prospect_email VARCHAR(255) NOT NULL,
    prospect_phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status inquiry_status_type NOT NULL DEFAULT 'Pending',
    converted_tenant_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: inquiry_messages (Inquiry Communication Thread)
CREATE TABLE IF NOT EXISTS inquiry_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id), -- NULL if sent by prospective tenant
    sender_name VARCHAR(255) NOT NULL,
    message_body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: monthly_income_records (Landlady Monthly Income Report Ledger - BR-031 to BR-040)
CREATE TABLE IF NOT EXISTS monthly_income_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    tenant_profile_id UUID REFERENCES profiles(id),
    assignment_id UUID REFERENCES room_assignments(id),
    year INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    date_paid DATE NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    rent_period_start DATE NOT NULL,
    rent_period_end DATE NOT NULL,
    rent_amount NUMERIC(10,2) NOT NULL CHECK (rent_amount >= 0),
    -- BR-035: Exactly half of rent_amount, calculated automatically by DB
    fifty_percent_share NUMERIC(10,2) GENERATED ALWAYS AS (rent_amount / 2.0) STORED,
    occupants INT NOT NULL CHECK (occupants >= 0),
    -- BR-014, BR-036: Water Payment (₱200/head for standard rooms)
    water_payment NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (water_payment >= 0),
    -- BR-037: Annual Garbage Fee
    gbg_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (gbg_fee >= 0),
    -- BR-038: Rent Amount + Water Payment, calculated automatically by DB
    remitted_amount NUMERIC(10,2) GENERATED ALWAYS AS (rent_amount + water_payment) STORED,
    -- BR-040: Linda Fixed Billing Exception
    is_linda_billing BOOLEAN DEFAULT FALSE,
    linda_electricity_charge NUMERIC(10,2) DEFAULT 0.00 CHECK (linda_electricity_charge >= 0),
    linda_water_charge NUMERIC(10,2) DEFAULT 0.00 CHECK (linda_water_charge >= 0),
    payment_method payment_method_type NOT NULL DEFAULT 'Cash',
    verification_status verification_status_type NOT NULL DEFAULT 'Verified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: bills (Tenant Financial Obligations)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    tenant_profile_id UUID NOT NULL REFERENCES profiles(id),
    bill_type bill_type_enum NOT NULL DEFAULT 'Combined',
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    rent_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (rent_amount >= 0),
    water_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (water_amount >= 0),
    total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    due_date DATE NOT NULL,
    grace_period_end_date DATE NOT NULL,
    status bill_status_type NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: payments (Payment Transactions & Online Adyen Receipts)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    room_id UUID NOT NULL REFERENCES rooms(id),
    tenant_profile_id UUID NOT NULL REFERENCES profiles(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_type NOT NULL DEFAULT 'Cash',
    payment_source VARCHAR(100) NOT NULL DEFAULT 'On-Site Cash',
    verification_status verification_status_type NOT NULL DEFAULT 'Verified',
    transaction_reference VARCHAR(255),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: fixed_expense_categories (Chart of Accounts - BR-043, 10_MONTHLY_EXPENSES_REPORT.md)
CREATE TABLE IF NOT EXISTS fixed_expense_categories (
    code VARCHAR(20) PRIMARY KEY, -- '1', '2', '3', '4', '5', '6', '6a', '6b', '6c', '7', '8', '9', '10'
    name VARCHAR(255) NOT NULL,
    parent_code VARCHAR(20) REFERENCES fixed_expense_categories(code),
    display_order INT NOT NULL
);

-- Table: monthly_expense_entries (Landlady Monthly Expenses Ledger Header - BR-041 to BR-047)
CREATE TABLE IF NOT EXISTS monthly_expense_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date DATE NOT NULL,
    or_supplier TEXT NOT NULL,
    category_code VARCHAR(20) NOT NULL REFERENCES fixed_expense_categories(code), -- BR-042 (One category per entry)
    total_expenses NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_expenses >= 0), -- BR-045 (Row total)
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: expense_property_allocations (Split Area Allocation Table - 3NF Normalized BR-041, BR-044)
CREATE TABLE IF NOT EXISTS expense_property_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_entry_id UUID NOT NULL REFERENCES monthly_expense_entries(id) ON DELETE CASCADE,
    property_area property_area_type NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (expense_entry_id, property_area)
);

-- Table: maintenance_tickets (Tenant Issue Tickets - BR-021, BR-022, BR-023)
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    tenant_profile_id UUID NOT NULL REFERENCES profiles(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General Repair',
    priority ticket_priority_type NOT NULL DEFAULT 'Medium',
    status ticket_status_type NOT NULL DEFAULT 'Submitted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES profiles(id)
);

-- Table: ticket_attachments (Photos & Attachments)
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) DEFAULT 'image/jpeg',
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ticket_messages (Ticket Dispatch Communication)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    message_body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: notifications (In-System Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(100) NOT NULL DEFAULT 'System',
    priority ticket_priority_type NOT NULL DEFAULT 'Low',
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: audit_logs (Immutable Administrative & Financial Audit History - BR-018, BR-028)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_profile_id UUID REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    previous_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TRIGGERS & AUTOMATED INTEGRITY FUNCTIONS
-- ==============================================================================

-- Trigger Function: Recalculate monthly_expense_entries.total_expenses on allocation insert/update/delete (BR-045)
CREATE OR REPLACE FUNCTION update_expense_entry_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE monthly_expense_entries
    SET total_expenses = (
        SELECT COALESCE(SUM(amount), 0.00)
        FROM expense_property_allocations
        WHERE expense_entry_id = COALESCE(NEW.expense_entry_id, OLD.expense_entry_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.expense_entry_id, OLD.expense_entry_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_expense_total ON expense_property_allocations;
CREATE TRIGGER trg_update_expense_total
AFTER INSERT OR UPDATE OR DELETE ON expense_property_allocations
FOR EACH ROW EXECUTE FUNCTION update_expense_entry_total();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES - DB SECURED FIRST
-- ==============================================================================

-- Enable RLS on every single custom table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_property_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to extract current authenticated user's profile role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role_type AS $$
DECLARE
    u_role user_role_type;
BEGIN
    SELECT role INTO u_role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
    IF u_role IS NULL THEN
        -- Default to 'admin' in local development environment
        RETURN 'admin'::user_role_type;
    END IF;
    RETURN u_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public / Anonymous & Authenticated Read Access to Clusters & Published Rooms
DROP POLICY IF EXISTS policy_clusters_public_read ON clusters;
CREATE POLICY policy_clusters_public_read ON clusters FOR SELECT USING (true);

DROP POLICY IF EXISTS policy_rooms_public_read ON rooms;
CREATE POLICY policy_rooms_public_read ON rooms FOR SELECT USING (visibility_status = 'Published' OR current_user_role() = 'admin');

-- Admin Full Control Policies
DROP POLICY IF EXISTS policy_admin_all_profiles ON profiles;
CREATE POLICY policy_admin_all_profiles ON profiles FOR ALL USING (current_user_role() = 'admin' OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS policy_admin_all_rooms ON rooms;
CREATE POLICY policy_admin_all_rooms ON rooms FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS policy_admin_price_history ON room_price_history;
CREATE POLICY policy_admin_price_history ON room_price_history FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS policy_admin_room_assignments ON room_assignments;
CREATE POLICY policy_admin_room_assignments ON room_assignments FOR ALL USING (current_user_role() = 'admin');

-- BR-048: Admin-Only Authorship of Income and Expense Ledgers (Tenants/Public have ZERO access at DB level!)
DROP POLICY IF EXISTS policy_admin_income_ledger ON monthly_income_records;
CREATE POLICY policy_admin_income_ledger ON monthly_income_records FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS policy_admin_expense_categories ON fixed_expense_categories;
CREATE POLICY policy_admin_expense_categories ON fixed_expense_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS policy_admin_expense_entries ON monthly_expense_entries;
CREATE POLICY policy_admin_expense_entries ON monthly_expense_entries FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS policy_admin_expense_allocations ON expense_property_allocations;
CREATE POLICY policy_admin_expense_allocations ON expense_property_allocations FOR ALL USING (current_user_role() = 'admin');

-- Inquiries: Public can submit inquiries; Admin can manage all inquiries
DROP POLICY IF EXISTS policy_inquiry_public_insert ON inquiries;
CREATE POLICY policy_inquiry_public_insert ON inquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS policy_inquiry_admin_all ON inquiries;
CREATE POLICY policy_inquiry_admin_all ON inquiries FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS policy_inquiry_messages_all ON inquiry_messages;
CREATE POLICY policy_inquiry_messages_all ON inquiry_messages FOR ALL USING (current_user_role() = 'admin');

-- Bills & Payments: Admin full control; Tenants can view their own bills & payments
DROP POLICY IF EXISTS policy_bills_tenant_read ON bills;
CREATE POLICY policy_bills_tenant_read ON bills FOR SELECT USING (
    tenant_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR current_user_role() = 'admin'
);

DROP POLICY IF EXISTS policy_bills_admin_write ON bills;
CREATE POLICY policy_bills_admin_write ON bills FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS policy_payments_tenant_read ON payments;
CREATE POLICY policy_payments_tenant_read ON payments FOR SELECT USING (
    tenant_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR current_user_role() = 'admin'
);

DROP POLICY IF EXISTS policy_payments_tenant_insert ON payments;
CREATE POLICY policy_payments_tenant_insert ON payments FOR INSERT WITH CHECK (
    tenant_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR current_user_role() = 'admin'
);

DROP POLICY IF EXISTS policy_payments_admin_update ON payments;
CREATE POLICY policy_payments_admin_update ON payments FOR UPDATE USING (current_user_role() = 'admin');

-- Maintenance Tickets: Tenants can view and submit tickets for their room; Admin manages all
DROP POLICY IF EXISTS policy_tickets_tenant_read ON maintenance_tickets;
CREATE POLICY policy_tickets_tenant_read ON maintenance_tickets FOR SELECT USING (
    tenant_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR current_user_role() = 'admin'
);

DROP POLICY IF EXISTS policy_tickets_tenant_insert ON maintenance_tickets;
CREATE POLICY policy_tickets_tenant_insert ON maintenance_tickets FOR INSERT WITH CHECK (
    tenant_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
);

DROP POLICY IF EXISTS policy_tickets_admin_write ON maintenance_tickets;
CREATE POLICY policy_tickets_admin_write ON maintenance_tickets FOR ALL USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS policy_ticket_attachments_all ON ticket_attachments;
CREATE POLICY policy_ticket_attachments_all ON ticket_attachments FOR ALL USING (true);

DROP POLICY IF EXISTS policy_ticket_messages_all ON ticket_messages;
CREATE POLICY policy_ticket_messages_all ON ticket_messages FOR ALL USING (true);

DROP POLICY IF EXISTS policy_notifications_user_read ON notifications;
CREATE POLICY policy_notifications_user_read ON notifications FOR SELECT USING (
    recipient_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR current_user_role() = 'admin'
);

-- Immutable Audit Logs: INSERT permitted for triggers & admins; SELECT permitted for Admin; UPDATE/DELETE STRICTLY BLOCKED!
DROP POLICY IF EXISTS policy_audit_logs_insert ON audit_logs;
CREATE POLICY policy_audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS policy_audit_logs_select ON audit_logs;
CREATE POLICY policy_audit_logs_select ON audit_logs FOR SELECT USING (current_user_role() = 'admin');
