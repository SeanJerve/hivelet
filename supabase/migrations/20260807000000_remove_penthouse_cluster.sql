/**
 * @file 20260807000000_remove_penthouse_cluster.sql
 * @description Corrects the property's canonical unit count from 33 to 32 units by removing the
 *              Penthouse cluster and its single 'PH' room.
 * @rationale The capstone manuscript (docs/reference/manuscript.txt) and docs/01_SYSTEM_BIBLE.md both
 *            define Fe Galang Da Silva Boarding House as a 32-unit property. The original schema
 *            migration and seed data incorrectly included a 5th "Penthouse" cluster with a 'PH' unit,
 *            producing 33 units -- an internal inconsistency against the manuscript, which is the
 *            academic authority for this project (see CAPSTONE_ALIGNMENT_PROTOCOL.md). Resolved as a
 *            documented decision in docs/08_OPEN_DECISIONS.md.
 * @innovations The PH room has zero dependent rows across room_assignments, bills, payments,
 *              monthly_income_records, inquiries, maintenance_tickets, and audit_logs, so this is a
 *              clean DELETE with no cascading cleanup required.
 */

DELETE FROM rooms WHERE room_number = 'PH';
DELETE FROM clusters WHERE code = 'Penthouse';

UPDATE clusters SET display_order = 3 WHERE code = 'Front Apartment';
UPDATE clusters SET display_order = 4 WHERE code = 'Linda';
