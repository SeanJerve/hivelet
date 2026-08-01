/**
 * @file seed.sql
 * @description Official Supabase CLI Local Seed Dataset for Hivelet (Fe Galang Da Silva Boarding House).
 * @systemBibleRef docs/01_SYSTEM_BIBLE.md, docs/02_BUSINESS_RULES.md, docs/09_MONTHLY_INCOME_REPORT.md, docs/10_MONTHLY_EXPENSES_REPORT.md
 * @rationale Populates realistic, auditable test data across all 33 canonical room units, 5 clusters,
 *            10 expense categories, landlady income ledger, multi-area split expenses, bills, 
 *            Adyen GCash pending payments, maintenance tickets, and immutable audit logs.
 */

-- Clear existing seed data safely
TRUNCATE audit_logs, notifications, ticket_messages, ticket_attachments, maintenance_tickets,
         expense_property_allocations, monthly_expense_entries, fixed_expense_categories,
         payments, bills, monthly_income_records, inquiry_messages, inquiries,
         room_assignments, room_price_history, rooms, clusters, profiles RESTART IDENTITY CASCADE;

-- ==============================================================================
-- 1. SEED CANONICAL CLUSTERS
-- ==============================================================================
INSERT INTO clusters (code, name, display_order) VALUES
('BH', 'Boarding House (Main Rooms)', 1),
('Back Apartment', 'Back Apartment', 2),
('Penthouse', 'Penthouse', 3),
('Front Apartment', 'Front Apartment', 4),
('Linda', 'Linda Units', 5);

-- ==============================================================================
-- 2. SEED PROFILES (Admin, Tenants, Prospects)
-- ==============================================================================
INSERT INTO profiles (id, auth_user_id, email, full_name, phone_number, emergency_contact_name, emergency_contact_phone, occupation, role, account_status) VALUES
-- Administrator / Landlady
('11111111-1111-1111-1111-111111111111', NULL, 'admin@hivelet.ph', 'Fe Galang Da Silva', '09171234567', 'Boarding House Office', '09171234567', 'Property Owner / Landlady', 'admin', 'active'),

-- Active Tenants
('22222222-2222-2222-2222-222222222222', NULL, 'mark.cruz@gmail.com', 'Mark Anthony Cruz', '09189876543', 'Elena Cruz (Mother)', '09181112222', 'Software Engineer', 'tenant', 'active'),
('33333333-3333-3333-3333-333333333333', NULL, 'sean.jerve@gmail.com', 'Sean Jerve', '09192223333', 'Roberto Jerve (Father)', '09193334444', 'College Student', 'tenant', 'active'),
('44444444-4444-4444-4444-444444444444', NULL, 'john.lloyd@gmail.com', 'John Lloyd Santos', '09203334444', 'Clarissa Santos (Sister)', '09204445555', 'Graphic Designer', 'tenant', 'active'),
('55555555-5555-5555-5555-555555555555', NULL, 'jaye.casia@gmail.com', 'Jaye Casia (Linda Tenant)', '09214445555', 'Mariano Casia (Father)', '09215556666', 'Accountant', 'tenant', 'active'),

-- Historical / Vacated Tenant
('66666666-6666-6666-6666-666666666666', NULL, 'miguel.ramos@gmail.com', 'Miguel Ramos', '09225556666', 'Teresa Ramos (Mother)', '09226667777', 'Former Student', 'tenant', 'inactive'),

-- Prospective Tenant
('77777777-7777-7777-7777-777777777777', NULL, 'rhea.mendoza@gmail.com', 'Rhea Mendoza', '09236667777', NULL, NULL, 'Prospective Tenant', 'prospect', 'active');

-- ==============================================================================
-- 3. SEED 33 CANONICAL ROOM UNITS
-- ==============================================================================
INSERT INTO rooms (id, room_number, floor, cluster_code, room_type, description, capacity, base_price, current_price, operational_status, visibility_status, is_linda_unit) VALUES
-- BH Cluster (Main Rooms: 1a-1h, 2a-2g, 3a-3g) - 22 Units
('a0100000-0000-0000-0000-000000000001', '1a', 1, 'BH', 'Studio', '1st Floor Studio with private bathroom & cabinets', 2, 4500.00, 4500.00, 'Occupied', 'Published', false),
('a0100000-0000-0000-0000-000000000002', '1b', 1, 'BH', 'Studio', '1st Floor Studio unit near common hallway', 2, 4500.00, 4500.00, 'Occupied', 'Published', false),
('a0100000-0000-0000-0000-000000000003', '1c', 1, 'BH', 'Studio', '1st Floor Studio unit with bed frame', 2, 4500.00, 4500.00, 'Available', 'Published', false),
('a0100000-0000-0000-0000-000000000004', '1d', 1, 'BH', 'Studio', '1st Floor Studio unit', 2, 4500.00, 4500.00, 'Available', 'Published', false),
('a0100000-0000-0000-0000-000000000005', '1e', 1, 'BH', 'Studio', '1st Floor Studio unit', 2, 4500.00, 4500.00, 'Under Maintenance', 'Published', false),
('a0100000-0000-0000-0000-000000000006', '1f', 1, 'BH', 'Studio', '1st Floor Studio unit', 2, 4500.00, 4500.00, 'Available', 'Published', false),
('a0100000-0000-0000-0000-000000000007', '1g', 1, 'BH', 'Studio', '1st Floor Studio unit', 2, 4500.00, 4500.00, 'Reserved', 'Published', false),
('a0100000-0000-0000-0000-000000000008', '1h', 1, 'BH', 'Studio', '1st Floor Studio corner unit', 2, 4800.00, 4800.00, 'Occupied', 'Published', false),

('a0200000-0000-0000-0000-000000000001', '2a', 2, 'BH', 'One-bedroom', '2nd Floor One-bedroom unit with balcony access', 3, 5500.00, 5500.00, 'Occupied', 'Published', false),
('a0200000-0000-0000-0000-000000000002', '2b', 2, 'BH', 'Studio', '2nd Floor Studio unit', 2, 4600.00, 4600.00, 'Available', 'Published', false),
('a0200000-0000-0000-0000-000000000003', '2c', 2, 'BH', 'Studio', '2nd Floor Studio unit', 2, 4600.00, 4600.00, 'Available', 'Published', false),
('a0200000-0000-0000-0000-000000000004', '2d', 2, 'BH', 'Studio', '2nd Floor Studio unit', 2, 4600.00, 4600.00, 'Available', 'Published', false),
('a0200000-0000-0000-0000-000000000005', '2e', 2, 'BH', 'Studio', '2nd Floor Studio unit', 2, 4600.00, 4600.00, 'Available', 'Published', false),
('a0200000-0000-0000-0000-000000000006', '2f', 2, 'BH', 'Studio', '2nd Floor Studio unit', 2, 4600.00, 4600.00, 'Available', 'Published', false),
('a0200000-0000-0000-0000-000000000007', '2g', 2, 'BH', 'Studio', '2nd Floor Studio corner unit', 2, 4800.00, 4800.00, 'Available', 'Published', false),

('a0300000-0000-0000-0000-000000000001', '3a', 3, 'BH', 'One-bedroom', '3rd Floor One-bedroom spacious unit', 3, 5800.00, 5800.00, 'Available', 'Published', false),
('a0300000-0000-0000-0000-000000000002', '3b', 3, 'BH', 'Studio', '3rd Floor Studio unit', 2, 4700.00, 4700.00, 'Available', 'Published', false),
('a0300000-0000-0000-0000-000000000003', '3c', 3, 'BH', 'Studio', '3rd Floor Studio unit', 2, 4700.00, 4700.00, 'Available', 'Published', false),
('a0300000-0000-0000-0000-000000000004', '3d', 3, 'BH', 'Studio', '3rd Floor Studio unit', 2, 4700.00, 4700.00, 'Available', 'Published', false),
('a0300000-0000-0000-0000-000000000005', '3e', 3, 'BH', 'Studio', '3rd Floor Studio unit', 2, 4700.00, 4700.00, 'Available', 'Published', false),
('a0300000-0000-0000-0000-000000000006', '3f', 3, 'BH', 'Studio', '3rd Floor Studio unit', 2, 4700.00, 4700.00, 'Available', 'Published', false),
('a0300000-0000-0000-0000-000000000007', '3g', 3, 'BH', 'Studio', '3rd Floor Studio corner unit', 2, 4900.00, 4900.00, 'Available', 'Published', false),

-- Back Apartment Cluster (5 Units)
('b0100000-0000-0000-0000-000000000001', 'B1F', 1, 'Back Apartment', 'One-bedroom', 'Back Apartment 1st Floor Front Unit', 3, 6000.00, 6000.00, 'Occupied', 'Published', false),
('b0200000-0000-0000-0000-000000000001', 'B2F', 2, 'Back Apartment', 'One-bedroom', 'Back Apartment 2nd Floor Front Unit', 3, 6200.00, 6200.00, 'Available', 'Published', false),
('b0200000-0000-0000-0000-000000000002', 'B2B', 2, 'Back Apartment', 'One-bedroom', 'Back Apartment 2nd Floor Back Unit', 3, 6200.00, 6200.00, 'Available', 'Published', false),
('b0300000-0000-0000-0000-000000000001', 'B3F', 3, 'Back Apartment', 'Two-bedroom', 'Back Apartment 3rd Floor Front Unit', 4, 7500.00, 7500.00, 'Available', 'Published', false),
('b0300000-0000-0000-0000-000000000002', 'B3B', 3, 'Back Apartment', 'Two-bedroom', 'Back Apartment 3rd Floor Back Unit', 4, 7500.00, 7500.00, 'Available', 'Published', false),

-- Penthouse Cluster (1 Unit)
('c0300000-0000-0000-0000-000000000001', 'PH', 3, 'Penthouse', 'Three-bedroom', 'Penthouse Top Floor Executive Suite', 5, 12000.00, 12000.00, 'Available', 'Published', false),

-- Front Apartment Cluster (3 Units)
('d0100000-0000-0000-0000-000000000001', 'F1', 1, 'Front Apartment', 'One-bedroom', 'Front Apartment 1st Floor', 3, 6500.00, 6500.00, 'Available', 'Published', false),
('d0200000-0000-0000-0000-000000000001', 'F2F', 2, 'Front Apartment', 'Two-bedroom', 'Front Apartment 2nd Floor Front', 4, 8000.00, 8000.00, 'Available', 'Published', false),
('d0200000-0000-0000-0000-000000000002', 'F2B', 2, 'Front Apartment', 'Two-bedroom', 'Front Apartment 2nd Floor Back', 4, 8000.00, 8000.00, 'Available', 'Published', false),

-- Linda Cluster (2 Units) - BR-040 Fixed Billing Units
('e0100000-0000-0000-0000-000000000001', 'LF', 1, 'Linda', 'One-bedroom', 'Linda Front Unit (Gayon) - Fixed Rate Billing', 3, 5000.00, 5000.00, 'Available', 'Published', true),
('e0100000-0000-0000-0000-000000000002', 'LB', 1, 'Linda', 'One-bedroom', 'Linda Back Unit (Jaye Casia) - Fixed Rate Billing', 3, 5000.00, 5000.00, 'Occupied', 'Published', true);

-- ==============================================================================
-- 4. SEED FIXED EXPENSE CATEGORIES (BR-043, 10_MONTHLY_EXPENSES_REPORT.md)
-- ==============================================================================
INSERT INTO fixed_expense_categories (code, name, parent_code, display_order) VALUES
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
('10', 'Others', NULL, 13);

-- ==============================================================================
-- 5. SEED ROOM ASSIGNMENTS (Occupancy History)
-- ==============================================================================
INSERT INTO room_assignments (id, room_id, tenant_profile_id, start_date, anniversary_date, deposit_amount, occupant_count, is_primary_contact, is_active) VALUES
-- Mark Anthony Cruz in Room 1a
('10100000-0000-0000-0000-000000000001', 'a0100000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '2025-06-05', '2025-06-05', 4500.00, 2, true, true),

-- Sean Jerve in Room 1b
('10100000-0000-0000-0000-000000000002', 'a0100000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '2025-08-10', '2025-08-10', 4500.00, 2, true, true),

-- John Lloyd Santos in Room 2a
('10200000-0000-0000-0000-000000000001', 'a0200000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', '2025-01-15', '2025-01-15', 5500.00, 3, true, true),

-- Jaye Casia in Linda Unit LB
('10500000-0000-0000-0000-000000000001', 'e0100000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '2025-03-01', '2025-03-01', 5000.00, 2, true, true),

-- Miguel Ramos (Inactive Former Tenant in Room 1c)
('10100000-0000-0000-0000-000000000099', 'a0100000-0000-0000-0000-000000000003', '66666666-6666-6666-6666-666666666666', '2024-05-01', '2024-05-01', 4500.00, 1, false, false);

-- ==============================================================================
-- 6. SEED MONTHLY INCOME REPORT LEDGER (BR-031 to BR-040)
-- ==============================================================================
INSERT INTO monthly_income_records (room_id, tenant_profile_id, assignment_id, year, month, date_paid, contact_name, invoice_number, rent_period_start, rent_period_end, rent_amount, occupants, water_payment, gbg_fee, is_linda_billing, linda_electricity_charge, linda_water_charge, payment_method, verification_status) VALUES
-- June 2026 Payments (Standard Rent + ₱200/head water)
('a0100000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '10100000-0000-0000-0000-000000000001', 2026, 6, '2026-06-05', 'Mark Anthony Cruz', 'INV-2026-0601', '2026-06-05', '2026-07-04', 4500.00, 2, 400.00, 0.00, false, 0.00, 0.00, 'Cash', 'Verified'),
('a0100000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '10100000-0000-0000-0000-000000000002', 2026, 6, '2026-06-10', 'Sean Jerve', 'INV-2026-0602', '2026-06-10', '2026-07-09', 4500.00, 2, 400.00, 0.00, false, 0.00, 0.00, 'GCash', 'Verified'),
('a0200000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', '10200000-0000-0000-0000-000000000001', 2026, 6, '2026-06-15', 'John Lloyd Santos', 'INV-2026-0603', '2026-06-15', '2026-07-14', 5500.00, 3, 600.00, 500.00, false, 0.00, 0.00, 'Cash', 'Verified'),

-- Linda Unit LB Billing Exception (BR-040: Fixed Electricity ₱325 + Fixed Water ₱200)
('e0100000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555', '10500000-0000-0000-0000-000000000001', 2026, 6, '2026-06-01', 'Jaye Casia (Linda)', 'INV-LINDA-0601', '2026-06-01', '2026-06-30', 5000.00, 2, 200.00, 0.00, true, 325.00, 200.00, 'Cash', 'Verified');

-- ==============================================================================
-- 7. SEED MONTHLY EXPENSES LEDGER & SPLIT ALLOCATIONS (BR-041 to BR-047)
-- ==============================================================================
-- Entry 1: Electric Bill split across Boarding House and Main House
INSERT INTO monthly_expense_entries (id, expense_date, or_supplier, category_code, created_by) VALUES
('e1111111-1111-1111-1111-111111111111', '2026-06-04', 'Electricbill (May26)', '7', '11111111-1111-1111-1111-111111111111');

INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) VALUES
('e1111111-1111-1111-1111-111111111111', 'Boarding House', 14964.13),
('e1111111-1111-1111-1111-111111111111', 'Main House', 5688.67);

-- Entry 2: Hardware Supplies for Boarding House repairs
INSERT INTO monthly_expense_entries (id, expense_date, or_supplier, category_code, created_by) VALUES
('e2222222-2222-2222-2222-222222222222', '2026-06-12', 'Wilcon Depot (bh plumbing repair)', '8', '11111111-1111-1111-1111-111111111111');

INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) VALUES
('e2222222-2222-2222-2222-222222222222', 'Boarding House', 3450.00);

-- Entry 3: Caretaker Salary for Michelle with PhilHealth subline
INSERT INTO monthly_expense_entries (id, expense_date, or_supplier, category_code, created_by) VALUES
('e3333333-3333-3333-3333-333333333333', '2026-06-15', 'Caretaker Salary: Michelle', '6', '11111111-1111-1111-1111-111111111111');

INSERT INTO expense_property_allocations (expense_entry_id, property_area, amount) VALUES
('e3333333-3333-3333-3333-333333333333', 'Boarding House', 8000.00);

-- ==============================================================================
-- 8. SEED BILLS AND PAYMENTS
-- ==============================================================================
INSERT INTO bills (id, room_id, tenant_profile_id, bill_type, billing_period_start, billing_period_end, rent_amount, water_amount, total_amount, due_date, grace_period_end_date, status) VALUES
('b1111111-1111-1111-1111-111111111111', 'a0100000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Combined', '2026-07-05', '2026-08-04', 4500.00, 400.00, 4900.00, '2026-07-05', '2026-07-12', 'Paid'),
('b2222222-2222-2222-2222-222222222222', 'a0100000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Combined', '2026-07-10', '2026-08-09', 4500.00, 400.00, 4900.00, '2026-07-10', '2026-07-17', 'Pending');

INSERT INTO payments (bill_id, room_id, tenant_profile_id, amount, payment_method, payment_source, verification_status, transaction_reference, paid_at, verified_at, verified_by) VALUES
('b1111111-1111-1111-1111-111111111111', 'a0100000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 4900.00, 'Cash', 'On-Site Cash', 'Verified', 'CASH-REC-001', '2026-07-05 10:30:00+08', '2026-07-05 10:30:00+08', '11111111-1111-1111-1111-111111111111'),
('b2222222-2222-2222-2222-222222222222', 'a0100000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 4900.00, 'Adyen Online', 'Adyen Gateway', 'Pending Verification', 'ADYEN-GCASH-998822', '2026-07-10 14:15:00+08', NULL, NULL);

-- ==============================================================================
-- 9. SEED MAINTENANCE TICKETS & ATTACHMENTS
-- ==============================================================================
INSERT INTO maintenance_tickets (id, room_id, tenant_profile_id, title, description, category, priority, status, created_at) VALUES
('91111111-1111-1111-1111-111111111111', 'a0100000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Water Pipe Leak under Sink', 'Emergency leak discovered under kitchen sink causing water pooling on floor.', 'Plumbing', 'Emergency', 'In Progress', '2026-07-28 08:30:00+08'),
('92222222-2222-2222-2222-222222222222', 'a0100000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Bed Frame Slat Loose', 'One wood slat on the bed frame is loose and squeaks.', 'Carpentry', 'Low', 'Submitted', '2026-07-29 19:00:00+08');

INSERT INTO ticket_attachments (ticket_id, file_url, file_type) VALUES
('91111111-1111-1111-1111-111111111111', 'https://storage.hivelet.ph/tickets/leak_photo1.jpg', 'image/jpeg');

INSERT INTO ticket_messages (ticket_id, sender_id, message_body) VALUES
('91111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Please fix as soon as possible, turned off main valve for now.'),
('91111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Caretaker Michelle has been dispatched to repair the pipe.');

-- ==============================================================================
-- 10. SEED PUBLIC INQUIRIES
-- ==============================================================================
INSERT INTO inquiries (id, room_id, prospect_name, prospect_email, prospect_phone, message, status) VALUES
('81111111-1111-1111-1111-111111111111', 'a0100000-0000-0000-0000-000000000003', 'Rhea Mendoza', 'rhea.mendoza@gmail.com', '09236667777', 'Inquiring if Room 1c is available for move-in next month for 2 persons.', 'Pending');

INSERT INTO inquiry_messages (inquiry_id, sender_id, sender_name, message_body) VALUES
('81111111-1111-1111-1111-111111111111', NULL, 'Rhea Mendoza', 'Inquiring if Room 1c is available for move-in next month for 2 persons.');

-- ==============================================================================
-- 11. SEED IMMUTABLE AUDIT LOGS (BR-018, BR-028)
-- ==============================================================================
INSERT INTO audit_logs (actor_profile_id, action, entity_type, entity_id, previous_values, new_values, ip_address) VALUES
('11111111-1111-1111-1111-111111111111', 'INITIALIZE_CANONICAL_ROOMS', 'ROOM', 'a0100000-0000-0000-0000-000000000001', NULL, '{"room_number": "1a", "cluster": "BH", "price": 4500}'::jsonb, '127.0.0.1'),
('11111111-1111-1111-1111-111111111111', 'RECORD_INCOME_PAYMENT', 'INCOME_RECORD', 'a0100000-0000-0000-0000-000000000001', NULL, '{"amount": 4500, "water": 400, "tenant": "Mark Anthony Cruz"}'::jsonb, '127.0.0.1');
