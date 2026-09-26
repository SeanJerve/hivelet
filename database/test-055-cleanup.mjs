// Runs DIAGNOSTIC_test_data_before_055, 055 and 056 unchanged in PGlite, against
// scratch tables shaped like the live ones. Nothing leaves this machine.
// Run from database/:  npm i --no-save @electric-sql/pglite && node test-055-cleanup.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const M = new URL('./migrations/', import.meta.url).pathname;
const diag = readFileSync(M + 'DIAGNOSTIC_test_data_before_055.sql', 'utf8');
const m055 = readFileSync(M + '055_remove_gcash_test_payments_and_demo_records.sql', 'utf8');
const m056 = readFileSync(M + '056_inv5182_rent_period_typo.sql', 'utf8');
let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
};
const MARK = '22222222-2222-2222-2222-222222222222';
async function fresh() {
  const db = new PGlite();
  await db.exec(`
    CREATE TYPE payment_method_type AS ENUM ('Cash','GCash','Bank Transfer','Adyen Online');
    CREATE TYPE verification_status_type AS ENUM ('Verified','Pending Verification','Rejected');
    CREATE TYPE notification_type AS ENUM ('Payment','Maintenance','Inquiry','Billing','Chat','System');
    CREATE TYPE bill_status_type AS ENUM ('Pending','Due','Overdue','Paid','Partially Paid');
    CREATE TABLE profiles (id uuid PRIMARY KEY, full_name text);
    CREATE TABLE rooms (id uuid PRIMARY KEY, room_number text);
    CREATE TABLE room_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE, room_id uuid REFERENCES rooms(id));
    CREATE TABLE bills (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_profile_id uuid REFERENCES profiles(id), room_id uuid REFERENCES rooms(id), total_amount numeric,
      status bill_status_type DEFAULT 'Due', updated_at timestamptz);
    CREATE TABLE payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_profile_id uuid REFERENCES profiles(id), room_id uuid REFERENCES rooms(id),
      bill_id uuid REFERENCES bills(id), amount numeric, payment_method payment_method_type, verification_status verification_status_type,
      transaction_reference text, paid_at timestamptz DEFAULT now());
    CREATE TABLE monthly_income_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid REFERENCES rooms(id), tenant_profile_id uuid REFERENCES profiles(id),
      assignment_id uuid REFERENCES room_assignments(id), year int, month int, date_paid date, contact_name text, invoice_number text,
      rent_period_start date, rent_period_end date, rent_amount numeric, water_payment numeric,
      remitted_amount numeric GENERATED ALWAYS AS (rent_amount + water_payment) STORED,
      payment_method payment_method_type DEFAULT 'Cash', transaction_reference text, voided_at timestamptz);
    CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient_profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
      title text, type notification_type, related_entity_type text, related_entity_id uuid);
    CREATE TABLE audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_profile_id uuid REFERENCES profiles(id), action text, entity_type text,
      entity_id uuid, new_values jsonb, ip_address text, created_at timestamptz DEFAULT now());

    INSERT INTO profiles VALUES ('${MARK}','Mark Cruz'),
      ('00000000-0000-0000-0000-00000000000a','Lobby Toor'), ('00000000-0000-0000-0000-00000000000b','Sandrine'),
      ('00000000-0000-0000-0000-00000000000c','Alexa'), ('00000000-0000-0000-0000-00000000000d','Alejandro Delarosa'), ('00000000-0000-0000-0000-0000000000ad','Admin');
    INSERT INTO rooms VALUES ('10000000-0000-0000-0000-0000000001a1','1a'),('10000000-0000-0000-0000-0000000001d1','1d'),('10000000-0000-0000-0000-0000000002c1','2c'),('10000000-0000-0000-0000-0000000003d1',' 3d ');
    INSERT INTO room_assignments (id, tenant_profile_id, room_id) VALUES
      ('20000000-0000-0000-0000-00000000000e','${MARK}','10000000-0000-0000-0000-0000000001a1'),
      ('20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000001a1'),
      ('20000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-0000000001d1');
    INSERT INTO bills (id, tenant_profile_id, room_id, total_amount) VALUES
      ('30000000-0000-0000-0000-00000000000e','${MARK}','10000000-0000-0000-0000-0000000001a1',6700),
      ('30000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-0000000001d1',7450);
    INSERT INTO bills (id, tenant_profile_id, room_id, total_amount, status) VALUES
      ('30000000-0000-0000-0000-0000000001a1','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000001a1',8200,'Paid'),
      ('30000000-0000-0000-0000-0000000002c1','00000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-0000000002c1',8500,'Paid');
    INSERT INTO payments (id, tenant_profile_id, room_id, bill_id, amount, payment_method, verification_status, transaction_reference) VALUES
      ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-0000000001d1','30000000-0000-0000-0000-00000000000b',7450,'Adyen Online','Rejected','NDQW3Z5ZQL8MNB75'),
      ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-0000000001d1','30000000-0000-0000-0000-00000000000b',7450,'Adyen Online','Rejected','D87VR96ZQL8MNB75'),
      ('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-0000000002c1',NULL,8200,'Adyen Online','Rejected','X8200'),
      ('40000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-0000000002c1','30000000-0000-0000-0000-0000000002c1',8500,'Cash','Verified','INV#5222'),
      ('40000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000001a1','30000000-0000-0000-0000-0000000001a1',4100,'Cash','Verified','OR#TEST1'),
      ('40000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-0000000001a1','30000000-0000-0000-0000-0000000001a1',4100,'Cash','Verified','OR#TEST1'),
      ('40000000-0000-0000-0000-000000000005','${MARK}','10000000-0000-0000-0000-0000000001a1','30000000-0000-0000-0000-00000000000e',6700,'Cash','Pending Verification',NULL);
    INSERT INTO monthly_income_records (room_id, tenant_profile_id, assignment_id, year, month, date_paid, contact_name, invoice_number, rent_period_start, rent_period_end, rent_amount, water_payment) VALUES
      ('10000000-0000-0000-0000-0000000001a1','00000000-0000-0000-0000-00000000000a','20000000-0000-0000-0000-00000000000a',2026,7,'2026-08-05','Lobby Toor','INV#5235','2026-07-07','2026-08-06',8000,200),
      ('10000000-0000-0000-0000-0000000003d1','00000000-0000-0000-0000-00000000000d',NULL,2026,5,'2026-05-29','Alejandro Delarosa','INV#5182','2026-05-01','2026-05-31',8500,200),
      ('10000000-0000-0000-0000-0000000002c1','00000000-0000-0000-0000-00000000000c',NULL,2026,7,'2026-07-30','Alexa','INV#5222','2026-07-30','2026-08-29',8500,0);
    INSERT INTO monthly_income_records (room_id, tenant_profile_id, year, month, date_paid, contact_name, invoice_number, rent_period_start, rent_period_end, rent_amount, water_payment, voided_at) VALUES
      ('10000000-0000-0000-0000-0000000001a1','00000000-0000-0000-0000-00000000000a',2026,9,'2026-09-22','Lobby Toor','OR#TEST1','2026-08-07','2026-09-06',8000,200,'2026-09-22T09:04:00Z');
    INSERT INTO notifications (recipient_profile_id, title, type, related_entity_type, related_entity_id) VALUES
      ('00000000-0000-0000-0000-0000000000ad','Online payment awaiting verification','Payment','PAYMENT','40000000-0000-0000-0000-000000000001'),
      ('00000000-0000-0000-0000-00000000000b','Payment Verification Declined','Payment',NULL,NULL),
      ('00000000-0000-0000-0000-0000000000ad','Online payment: a refund did not go through','Payment','PAYMENT',NULL),
      ('00000000-0000-0000-0000-0000000000ad','New Maintenance Ticket (High)','Maintenance','TICKET',NULL),
      ('${MARK}','Anything for Mark','System',NULL,NULL),
      ('00000000-0000-0000-0000-00000000000c','Rent receipt recorded','Payment',NULL,NULL);
  `);
  return db;
}
const rows = async (db, q) => (await db.query(q)).rows;

// --- the diagnostic reads, and writes nothing
let db = await fresh();
const d = await rows(db, diag);
const sec = (s) => d.filter((r) => r.section.startsWith(s));
check('diagnostic: 3 GCash payments, the demo cash one and the voided receipt\'s two listed to remove', sec('1 REMOVE').map((r) => r.detail.split(' ')[0]).sort(), ['Adyen', 'Adyen', 'Adyen', 'Cash', 'Cash', 'Cash']);
check('diagnostic: the voided receipt listed to remove', sec('2 REMOVE').map((r) => r.status), ['OR#TEST1']);
check("diagnostic: 1a's bill listed as going back from Paid", sec('8').map((r) => [r.section, r.unit]), [['8 BILL back from Paid', '1a']]);
check('diagnostic: the real cash payment is listed as staying', sec('5 STAYS').map((r) => [r.who, r.amount, r.status]), [['Cash', '1', 'Verified']]);
check('diagnostic: nothing blocks', sec('6').length, 0);
check('diagnostic: INV#5182 shown as it stands', sec('7')[0]?.status, '2026-05-01 to 2026-05-31');
check('diagnostic: changed nothing', (await rows(db, 'SELECT count(*)::int n FROM payments'))[0].n, 7);

// --- 055
await db.exec(m055);
check('055: only the real cash payment is left', (await rows(db, 'SELECT id::text FROM payments')).map((r) => r.id), ['40000000-0000-0000-0000-000000000004']);
check("055: real tenants' bills stay, the demo bill goes", (await rows(db, 'SELECT id::text FROM bills')).map((r) => r.id).sort(), ['30000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-0000000001a1', '30000000-0000-0000-0000-0000000002c1']);
check("055: Mark Cruz's 1a tenancy goes, Lobby Toor's stays", (await rows(db, 'SELECT id::text FROM room_assignments ORDER BY id')).map((r) => r.id), ['20000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000b']);
check('055: the real ledger is untouched, the voided test receipt is gone', (await rows(db, 'SELECT invoice_number FROM monthly_income_records ORDER BY invoice_number')).map((r) => r.invoice_number), ['INV#5182', 'INV#5222', 'INV#5235']);
check("055: 1a's real bill is Due again", (await rows(db, "SELECT status::text s FROM bills WHERE id = '30000000-0000-0000-0000-0000000001a1'"))[0].s, 'Due');
check("055: a bill paid by a real payment stays Paid", (await rows(db, "SELECT status::text s FROM bills WHERE id = '30000000-0000-0000-0000-0000000002c1'"))[0].s, 'Paid');
check('055: only test notifications go', (await rows(db, 'SELECT title FROM notifications ORDER BY title')).map((r) => r.title), ['New Maintenance Ticket (High)', 'Rent receipt recorded']);
const a = (await rows(db, "SELECT new_values FROM audit_logs WHERE action = 'AUDIT_CORRECTION'"))[0]?.new_values;
check('055: writes one record of what it removed', a?.counts, { bills: 1, payments: 6, notifications: 4, room_assignments: 1, bills_back_to_due: 1, monthly_income_records: 1 });
check('055: the record names the references', [...(a?.references ?? [])].sort(), ['D87VR96ZQL8MNB75', 'NDQW3Z5ZQL8MNB75', 'OR#TEST1', 'OR#TEST1', 'X8200']);
check('055: profiles are kept', (await rows(db, 'SELECT count(*)::int n FROM profiles'))[0].n, 6);
await db.exec(m055);
check('055 run twice: nothing more removed, nothing breaks', (await rows(db, 'SELECT count(*)::int n FROM payments'))[0].n, 1);
check('055 run twice: no second, empty record', (await rows(db, "SELECT count(*)::int n FROM audit_logs WHERE entity_type = 'PAYMENT'"))[0].n, 1);

// --- 056
await db.exec(m056);
check('056: INV#5182 now 15 May to 14 June, still filed May', (await rows(db, "SELECT rent_period_start::text s, rent_period_end::text e, month FROM monthly_income_records WHERE invoice_number='INV#5182'"))[0], { s: '2026-05-15', e: '2026-06-14', month: 5 });
check('056: its money did not move', (await rows(db, "SELECT remitted_amount::int r FROM monthly_income_records WHERE invoice_number='INV#5182'"))[0].r, 8700);
await db.exec(m056);
check('056 run twice: no second correction record', (await rows(db, "SELECT count(*)::int n FROM audit_logs WHERE entity_type='INCOME_RECORD'"))[0].n, 1);

// --- 055 refuses when something real depends on a removal
db = await fresh();
await db.exec(`UPDATE monthly_income_records SET assignment_id = '20000000-0000-0000-0000-00000000000e' WHERE invoice_number = 'INV#5235'`);
const blockedDiag = (await rows(db, diag)).filter((r) => r.section.startsWith('6'));
check('diagnostic: shows the blocking row', blockedDiag.map((r) => [r.section, r.amount]), [['6 BLOCK real ledger row on a demo tenancy', '1']]);
let err = '';
try { await db.exec(m055); } catch (e) { err = e.message; }
check('055: refuses, naming the table and column', /monthly_income_records\.assignment_id/.test(err), true);
await db.exec('ROLLBACK').catch(() => {});
check('055: refused means nothing deleted', (await rows(db, 'SELECT count(*)::int n FROM payments'))[0].n, 7);

// --- 056 refuses a row that is neither as imported nor as corrected
db = await fresh();
await db.exec(`UPDATE monthly_income_records SET rent_period_start = '2026-05-02' WHERE invoice_number = 'INV#5182'`);
err = '';
try { await db.exec(m056); } catch (e) { err = e.message; }
check('056: refuses a row it does not recognise', /expected exactly one INV#5182/.test(err), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
