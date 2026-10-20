#!/usr/bin/env node
// The complete data dictionary, for the Appendices (course guide Q4.3.3-4: "the complete dictionary
// belongs in the Appendices"; Chapter 4's Table 7A is the extract).
//
//   node scripts/manuscript/build-data-dictionary.mjs     (needs .env: SUPABASE_URL, SUPABASE_SECRET_KEY)
//     -> docs/FINAL MANUSCRIPT/APPENDIX_N_DATA_DICTIONARY.md
//
// Read from the LIVE database, never from database/FULL_DATABASE_SCHEMA.sql (CLAUDE.md, rule 2): the
// PostgREST OpenAPI document gives every table's columns with type, length, default, whether it is
// required, its keys and the allowed values of each enumerated type. Two facts it does not carry are
// stated here and were read from information_schema on 12 Oct 2026: which columns are generated, and
// that the three *_backup_0NN tables are copies kept from data corrections.
//
// Descriptions are written here, not copied from the column comments, because two of those comments
// still describe Linda's water as a fixed charge, which the owner corrected on 20 Sep 2026 (client
// sheet 2d). A column with no entry in DESC gets a generic description from its name; the script
// lists those at the end so a new column is noticed. No sample values: rows hold tenants' personal
// data, and Table 7A gives a worked sample for the table the owner reads most.
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(repo, '.env') });
const URL_ = process.env.SUPABASE_URL; const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) { console.error('SUPABASE_URL / SUPABASE_SECRET_KEY are not set (.env).'); process.exit(2); }
const res = await fetch(`${URL_}/rest/v1/`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
if (!res.ok) { console.error(`could not read the schema (HTTP ${res.status})`); process.exit(2); }
const spec = await res.json();
const defs = spec.definitions || spec.components?.schemas || {};

// information_schema.columns, is_generated = ALWAYS (12 Oct 2026).
const GENERATED = {
  'monthly_income_records.fifty_percent_share': 'rent_amount / 2.0',
  'monthly_income_records.remitted_amount': 'rent_amount + water_payment',
};

const TABLES = {
  rooms: ['Property', 'One row per rentable unit: 33 units in five clusters.'],
  clusters: ['Property', 'The five clusters (Boarding House, Back Apartment, Front Apartment, Penthouse, Linda) and the expense area each books its costs to.'],
  property_areas: ['Property', 'The parts of the property an expense can be split across, and whether each counts as a rental cost.'],
  room_photos: ['Property', 'Photographs and floor plans of each unit, one marked primary.'],
  room_price_history: ['Property', 'Every change of a unit\'s rate, written by a database trigger.'],
  profiles: ['People', 'Everyone with a record: the administrator, tenants, and visitors recorded from an inquiry.'],
  room_assignments: ['People', 'Tenancies: who occupies which unit, from when, with how many occupants.'],
  monthly_income_records: ['Money', 'The owner\'s Monthly Income ledger, one row per receipt per month covered (Chapter 4, Table 7A).'],
  monthly_expense_entries: ['Money', 'The owner\'s Monthly Expenses ledger: one row per expense.'],
  expense_property_allocations: ['Money', 'How each expense is split across property areas; the parts add up to the expense.'],
  fixed_expense_categories: ['Money', 'The owner\'s expense categories (the thirteen numbered lines, with sub-lines), and any she adds.'],
  bills: ['Money', 'Bills raised for a tenancy: rent and water for one whole month.'],
  payments: ['Money', 'Payments made against bills, online with GCash through Adyen or recorded by the owner, with their verification.'],
  system_settings: ['Money', 'Values the owner can change without a new release, such as the water rate per occupant.'],
  maintenance_tickets: ['Requests', 'Repair requests, from submission to closing.'],
  ticket_messages: ['Requests', 'Notes added to a repair request by the tenant or the owner.'],
  ticket_attachments: ['Requests', 'Photographs attached to a repair request.'],
  inquiries: ['Requests', 'Questions sent from the public site about a unit.'],
  inquiry_messages: ['Requests', 'The conversation on an inquiry between the visitor and the owner.'],
  notifications: ['System', 'In-app notices to one person, each linked to the record it is about.'],
  audit_logs: ['System', 'Every administrator action and sign-in event, with the values before and after. The application can add rows and read them, but cannot change, delete or empty the table.'],
  copied_period_backup_031: ['Backup', 'A copy of rent periods before the correction made by migration 031. No client role can read it.'],
  date_paid_import_backup_032: ['Backup', 'A copy of imported payment dates before the correction made by migration 032. No client role can read it.'],
  rent_period_drift_backup_030: ['Backup', 'A copy of rent periods before the correction made by migration 030. No client role can read it.'],
};

const DESC = {
  rooms: {
    room_number: 'The unit\'s code, as the owner writes it (unique regardless of capitals)', floor: 'Building level: 1 to 3 residential, 4 the rooftop penthouse', cluster_code: 'The cluster the unit belongs to',
    room_type: 'Kind of unit (studio, one-bedroom and so on)', description: 'Text shown on the public site', capacity: 'Most occupants the unit is meant for',
    base_price: 'The rate the unit was first set up with', current_price: 'The rate in effect now, set by the owner', operational_status: 'Available, Occupied, Reserved or under maintenance',
    visibility_status: 'Whether the unit is listed on the public site', available_from: 'When a unit becoming free can be moved into', is_linda_unit: 'True for the two Linda units, whose money is kept separately (BR-040)',
  },
  clusters: { code: 'Short code of the cluster', name: 'Name shown on screens', display_order: 'Order on screens and reports', expense_area: 'The property area this cluster\'s costs are booked to' },
  property_areas: { code: 'The area', name: 'Name shown on screens', is_rental_expense: 'False for the owner\'s own residence and personal costs, which are not deducted from rental income', display_order: 'Order on screens and reports', notes: 'Notes on what the area covers' },
  room_photos: { file_url: 'Where the image is kept', caption: 'Caption shown with it', display_order: 'Order in the unit\'s gallery', is_primary: 'The photo shown first', uploaded_by: 'Who added it' },
  room_price_history: { previous_price: 'The rate before the change', new_price: 'The rate after it', effective_date: 'When the new rate applies', reason: 'Why, if given', created_by: 'Who made the change' },
  profiles: {
    auth_user_id: 'Link to a sign-in account of the hosting service, where one exists', email: 'Not used since 20 October 2026: nobody signs in with or gives an email (unique when present)', full_name: 'Full name',
    phone_number: 'Philippine mobile number (unique when given)', emergency_contact_name: 'Emergency contact', emergency_contact_phone: 'Emergency contact\'s number', occupation: 'Occupation, optional',
    facebook_url: 'Facebook profile, optional', role: 'admin, tenant, prospect or guest', account_status: 'active, or inactive once a tenant has moved out',
    password_hash: 'The password as a bcrypt hash; the password itself is never stored', last_login_at: 'Last successful sign-in', failed_login_count: 'Failed sign-ins in a row; five lock the account',
    locked_until: 'While in the future, sign-in is refused', password_changed_at: 'When the password last changed; earlier sessions end', must_change_password: 'True until a new tenant, or one whose password was reset, sets their own',
    login_id: 'Short sign-in ID given to a tenant (unique)',
  },
  room_assignments: {
    room_id: 'The unit', tenant_profile_id: 'The tenant', start_date: 'Move-in date (not recorded in the owner\'s workbook for transferred tenancies)', end_date: 'Move-out date, once moved out',
    anniversary_date: 'The day of the month rent runs from', deposit_amount: 'The deposit held: one month, set against repairs at move-out (BR-039)', occupant_count: 'Occupants; water is ₱200 for each',
    is_primary_contact: 'Whether this tenant is the unit\'s contact', is_active: 'True while the tenancy runs; only one per unit (unique index)',
  },
  monthly_income_records: {
    room_id: 'The unit', tenant_profile_id: 'The tenant credited', assignment_id: 'The tenancy credited', year: 'Year of the month the rent is for', month: 'Month the rent is for (1 to 12)',
    date_paid: 'Date the money was received', contact_name: 'Name as written on the receipt', invoice_number: 'The owner\'s invoice number (INV#…), an acknowledgement receipt, or none; never made up by the system',
    rent_period_start: 'First day the payment covers', rent_period_end: 'Last day it covers', rent_amount: 'Rent received for the period',
    fifty_percent_share: 'A system-computed figure equal to half that row\'s Rent Amount, kept for ledger parity with the owner\'s historical spreadsheet (BR-035)',
    occupants: 'Occupants the water was charged for', water_payment: 'Water received', remitted_amount: 'Rent plus water (BR-038)', is_linda_billing: 'True for a Linda unit\'s row',
    linda_electricity_charge: 'Historical only: a flat electricity charge retired on 13 September 2026; old rows kept as collected', linda_water_charge: 'A Linda unit\'s water, ₱200 per occupant, recorded here and kept out of the remitted amount (BR-040)',
    payment_method: 'Cash, GCash or bank transfer', verification_status: 'Verified, Pending Verification or Rejected; only Verified counts as paid', transaction_reference: 'The gateway\'s or bank\'s reference (recorded once)',
    voided_at: 'When the receipt was voided; a voided receipt leaves every total', voided_by: 'Who voided it', void_reason: 'Why',
  },
  monthly_expense_entries: { expense_date: 'Date of the expense', invoice_supplier: 'Invoice or supplier, as the owner writes it', category_code: 'Expense category', total_expenses: 'Total, kept equal to its allocations by a trigger (BR-045)', created_by: 'Who recorded it', voided_at: 'When voided', voided_by: 'Who voided it', void_reason: 'Why' },
  expense_property_allocations: { expense_entry_id: 'The expense', property_area: 'The area this part is for (one part per area)', amount: 'The part\'s amount' },
  fixed_expense_categories: { code: 'Category code (1 to 13, with sub-lines such as 6a)', name: 'Name shown on screens and reports', parent_code: 'The line a sub-line belongs to', display_order: 'Order on the ledger and in the download' },
  bills: {
    room_id: 'The unit', tenant_profile_id: 'The tenant billed', bill_type: 'Rent and water together, as the owner bills them', billing_period_start: 'First day of the whole month billed', billing_period_end: 'Last day of it',
    rent_amount: 'The whole month\'s rent; never prorated', water_amount: 'Occupants × the water rate', total_amount: 'Rent plus water', due_date: 'Due date; overdue from the next day',
    grace_period_end_date: 'Equal to the due date: there is no grace period', status: 'Pending, Paid, Overdue and so on', checkout_opened_at: 'When a GCash checkout was opened on the bill; another is refused for 15 minutes',
  },
  payments: {
    bill_id: 'The bill paid, where one exists', room_id: 'The unit', tenant_profile_id: 'The tenant', amount: 'Amount paid', payment_method: 'Cash, GCash or bank transfer', payment_source: 'Where it came from (on site, or online through Adyen with GCash)',
    verification_status: 'Pending Verification until the owner verifies or rejects it', transaction_reference: 'The gateway reference (recorded once)', paid_at: 'When it was paid', verified_at: 'When the owner verified it', verified_by: 'Who verified it',
  },
  system_settings: { key: 'Name of the setting', value: 'Its value', value_type: 'How the value is read (number, text)', label: 'Name shown to the owner', description: 'What it does', business_rule: 'The business rule it serves', updated_by: 'Who last changed it' },
  maintenance_tickets: {
    room_id: 'The unit', tenant_profile_id: 'The tenant who reported it; empty for a repair the owner logged for an empty unit', title: 'Short title', description: 'What is wrong', category: 'Kind of repair',
    priority: 'Low, Medium, High or Urgent', status: 'Submitted, In Progress, Resolved or Closed', resolved_at: 'When marked done', closed_at: 'When closed', closed_by: 'Who closed it (the owner, or the tenant who cancelled)', assigned_technician: 'Who was sent',
  },
  ticket_messages: { ticket_id: 'The repair request', sender_id: 'Who wrote it', message_body: 'The note' },
  ticket_attachments: { ticket_id: 'The repair request', file_url: 'Where the photo is kept', file_type: 'JPEG or PNG only' },
  inquiries: {
    room_id: 'The unit asked about', prospect_name: 'Visitor\'s name', prospect_email: 'Kept on inquiries from before 20 October 2026; no longer asked', prospect_phone: 'Visitor\'s Philippine mobile number', message: 'The question',
    status: 'Pending, answered, closed or converted', converted_tenant_id: 'The tenant record it became, if the visitor moved in', access_token_hash: 'SHA-256 of the secret in the visitor\'s private link; the secret itself is never stored',
    reference_code: 'Short code that, with the visitor\'s phone number, opens the conversation',
  },
  inquiry_messages: { inquiry_id: 'The inquiry', sender_id: 'The owner, when she wrote it; empty for the visitor', sender_name: 'Name shown on the message', message_body: 'The message', sent_at: 'When it was sent' },
  notifications: { recipient_profile_id: 'Who it is for', title: 'Title', message: 'Text', type: 'Kind of notice', priority: 'How prominently it is shown', is_read: 'Whether it has been opened', related_entity_type: 'Kind of record it is about', related_entity_id: 'The record it opens' },
  audit_logs: { actor_profile_id: 'Who acted', action: 'What was done (for example PAYMENT_VERIFY)', entity_type: 'Kind of record', entity_id: 'The record', previous_values: 'Values before', new_values: 'Values after', ip_address: 'Address the request came from' },
};

const generic = (t, c) => {
  if (c === 'id') return 'Primary key';
  if (c === 'room_id') return 'The unit';
  if (c === 'created_at') return 'When the row was created';
  if (c === 'updated_at') return 'When it last changed';
  if (c === 'uploaded_at') return 'When it was added';
  if (c === 'corrected_at') return 'When the correction was made';
  if (/^(old|new)_/.test(c)) return `The ${c.startsWith('old') ? 'value before' : 'value after'} the correction (${c.replace(/^(old|new)_/, '').replace(/_/g, ' ')})`;
  if (TABLES[t]?.[0] === 'Backup') return 'Copied from the corrected row';
  return null;
};

const typeOf = (p) => {
  const f = p.format || p.type || '';
  const enumText = p.enum ? ` (${p.enum.join(', ')})` : '';
  let short = f.replace('timestamp with time zone', 'timestamptz').replace('character varying', 'varchar').replace('public.', '');
  if (p.maxLength) short += `(${p.maxLength})`;
  // Every numeric column is numeric(10,2) in information_schema (12 Oct 2026); the OpenAPI
  // document does not carry precision, so NUMERIC_COLUMNS below holds that reading to account.
  if (short === 'numeric') short = 'numeric(10,2)';
  return [short, enumText];
};
const keyOf = (t, c, p, d) => {
  const k = [];
  if (/Primary Key/.test(p.description || '')) k.push('PK');
  const fk = /<fk table='([^']+)' column='([^']+)'/.exec(p.description || '');
  if (fk) k.push(`FK ${fk[1]}.${fk[2]}`);
  if (GENERATED[`${t}.${c}`]) k.push(`Generated: ${GENERATED[`${t}.${c}`]}`);
  return k.join('; ');
};

// numeric columns counted in information_schema on 12 Oct 2026, all (10,2): a new one fails the run.
const NUMERIC_COLUMNS = 17;
const order = Object.keys(TABLES);
const missingTables = Object.keys(defs).filter((t) => !TABLES[t]);
const unknownCols = [];
let out = `# APPENDIX N: DATA DICTIONARY\n\n` +
  `> **TEAM NOTE (delete before pasting).** Generated ${new Date().toISOString().slice(0, 10)} by \`node scripts/manuscript/build-data-dictionary.mjs\`\n` +
  `> from the live database's own schema; rerun it after any migration. Letter N follows Appendix M; confirm the\n` +
  `> letters with the adviser. Chapter 4's Table 7A is the extract of this dictionary for the Monthly Income table.\n\n` +
  `This appendix lists every table and column of the Hivelet database as it stands in the live system, with the\n` +
  `type and length of each column, whether a value is required, its default, and the keys that link the tables.\n` +
  `PK marks a primary key and FK a foreign key, with the table and column it refers to; a generated column is\n` +
  `computed by the database from the columns named and cannot be written. Allowed values of an enumerated type\n` +
  `are listed beside it. No sample values are given, because the rows hold tenants' personal data.\n`;
let group = '';
for (const t of order) {
  const d = defs[t]; if (!d) continue;
  const [g, what] = TABLES[t];
  if (g !== group) { out += `\n## ${g}\n`; group = g; }
  const req = new Set(d.required || []);
  out += `\n### ${t}\n\n${what}\n\n| Column | Type | Required | Default | Key | Description |\n| :--- | :--- | :---: | :--- | :--- | :--- |\n`;
  for (const [c, p] of Object.entries(d.properties || {})) {
    const [ty, en] = typeOf(p);
    let desc = DESC[t]?.[c] ?? generic(t, c);
    if (!desc) { unknownCols.push(`${t}.${c}`); desc = c.replace(/_/g, ' '); }
    const def = p.default !== undefined ? String(p.default).replace(/\|/g, '/').slice(0, 30) : '';
    out += `| ${c} | ${ty}${en} | ${req.has(c) ? 'Yes' : ''} | ${def} | ${keyOf(t, c, p, d)} | ${desc} |\n`;
  }
}
const file = path.join(repo, 'docs', 'FINAL MANUSCRIPT', 'APPENDIX_N_DATA_DICTIONARY.md');
fs.writeFileSync(file, out);
const cols = order.reduce((a, t) => a + Object.keys(defs[t]?.properties || {}).length, 0);
console.log(`${order.filter((t) => defs[t]).length} tables, ${cols} columns -> docs/FINAL MANUSCRIPT/APPENDIX_N_DATA_DICTIONARY.md`);
if (missingTables.length) console.log('tables in the database with no description here: ' + missingTables.join(', '));
if (unknownCols.length) console.log('columns described from their name only: ' + unknownCols.join(', '));
const numerics = order.reduce((a, t) => a + Object.values(defs[t]?.properties || {}).filter((p) => p.format === 'numeric').length, 0);
if (numerics !== NUMERIC_COLUMNS) { console.log(`numeric columns: ${numerics}, expected ${NUMERIC_COLUMNS}; check their precision in information_schema and update NUMERIC_COLUMNS`); process.exitCode = 1; }
if (missingTables.length) process.exitCode = 1;
