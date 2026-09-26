// Test for migration 054. From database/:
//   npm i --no-save @electric-sql/pglite && node test-054-void.mjs
// Runs migration 054 unchanged inside PGlite (PostgreSQL in WebAssembly) against
// scratch tables typed as live_schema.csv records them. Nothing leaves this machine.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
};

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TYPE bill_status_type AS ENUM ('Pending','Due','Overdue','Paid','Partially Paid');
  CREATE TYPE payment_method_type AS ENUM ('Cash','GCash','Bank Transfer','Adyen Online');
  CREATE TYPE verification_status_type AS ENUM ('Verified','Pending Verification','Rejected');
  CREATE TABLE bills (
    id uuid PRIMARY KEY, total_amount numeric(10,2) NOT NULL,
    status bill_status_type NOT NULL DEFAULT 'Pending', updated_at timestamptz DEFAULT now());
  CREATE TABLE payments (
    id uuid PRIMARY KEY, bill_id uuid NULL REFERENCES bills(id), amount numeric(10,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_type NOT NULL DEFAULT 'Cash',
    transaction_reference varchar(255), verification_status verification_status_type NOT NULL DEFAULT 'Verified',
    verified_by uuid, verified_at timestamptz);
  CREATE UNIQUE INDEX idx_adyen_ref ON payments (transaction_reference) WHERE payment_method = 'Adyen Online';
  CREATE TABLE monthly_income_records (
    id uuid PRIMARY KEY, rent_amount numeric(10,2) NOT NULL, water_payment numeric(10,2) NOT NULL DEFAULT 0,
    remitted_amount numeric(10,2) GENERATED ALWAYS AS (rent_amount + water_payment) STORED,
    payment_method payment_method_type NOT NULL DEFAULT 'Cash', transaction_reference varchar(120),
    voided_at timestamptz, voided_by uuid, void_reason text);
`);
await db.exec(readFileSync(new URL('./migrations/054_void_income_reverses_gcash_settlement.sql', import.meta.url), 'utf8'));

const ADMIN = '00000000-0000-4000-8000-0000000000ad', OTHER = '00000000-0000-4000-8000-0000000000ae';
const u = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
await db.exec(`
  -- 1. A GCash settlement of a whole bill.
  INSERT INTO bills VALUES ('${u(1)}', 6900, 'Paid');
  INSERT INTO payments VALUES ('${u(11)}', '${u(1)}', 6900, 'Adyen Online', 'PSP1', 'Verified', '${ADMIN}', now());
  INSERT INTO monthly_income_records (id, rent_amount, water_payment, payment_method, transaction_reference)
    VALUES ('${u(21)}', 6700, 200, 'Adyen Online', 'PSP1');
  -- 2. A bill paid 3,000 cash and 3,900 GCash.
  INSERT INTO bills VALUES ('${u(2)}', 6900, 'Paid');
  INSERT INTO payments VALUES ('${u(12)}', '${u(2)}', 3000, 'Cash', 'OR#1', 'Verified', '${ADMIN}', now());
  INSERT INTO payments VALUES ('${u(13)}', '${u(2)}', 3900, 'Adyen Online', 'PSP2', 'Verified', '${ADMIN}', now());
  INSERT INTO monthly_income_records (id, rent_amount, water_payment, payment_method, transaction_reference)
    VALUES ('${u(22)}', 3900, 0, 'Adyen Online', 'PSP2');
  -- 3. An on-site cash receipt applied to a bill.
  INSERT INTO bills VALUES ('${u(3)}', 6900, 'Paid');
  INSERT INTO payments VALUES ('${u(14)}', '${u(3)}', 6900, 'Cash', 'OR#2', 'Verified', '${ADMIN}', now());
  INSERT INTO monthly_income_records (id, rent_amount, water_payment, payment_method, transaction_reference)
    VALUES ('${u(23)}', 6700, 200, 'Cash', 'OR#2');
`);
const one = async (sql) => (await db.query(sql)).rows[0];
const voidIt = async (id, by = ADMIN) =>
  (await one(`SELECT public.void_income_record('${id}', '${by}', 'Chargeback') AS r`)).r;

const r1 = await voidIt(u(21));
check('GCash void: the result names the payment and the reopened bill',
  [r1.payment_id, r1.bill_status, r1.already_voided], [u(11), 'Due', false]);
check('GCash void: the income row is voided, attributed and reasoned',
  Object.values(await one(`SELECT voided_at IS NOT NULL a, voided_by::text b, void_reason c FROM monthly_income_records WHERE id='${u(21)}'`)),
  [true, ADMIN, 'Chargeback']);
check('GCash void: the payment no longer counts',
  (await one(`SELECT verification_status::text s FROM payments WHERE id='${u(11)}'`)).s, 'Rejected');
check('GCash void: who verified it is kept',
  (await one(`SELECT verified_by::text v FROM payments WHERE id='${u(11)}'`)).v, ADMIN);
check('GCash void: the bill is Due again', (await one(`SELECT status::text s FROM bills WHERE id='${u(1)}'`)).s, 'Due');

const r2 = await voidIt(u(22));
check('part-GCash void: the bill keeps the cash and reads Partially Paid', r2.bill_status, 'Partially Paid');
check('part-GCash void: the cash payment is untouched',
  (await one(`SELECT verification_status::text s FROM payments WHERE id='${u(12)}'`)).s, 'Verified');

const r3 = await voidIt(u(23));
check('on-site void: only the income row changes', [r3.payment_id, r3.bill_status], [null, null]);
check('on-site void: the cash payment is untouched',
  (await one(`SELECT verification_status::text s FROM payments WHERE id='${u(14)}'`)).s, 'Verified');
check('on-site void: the bill is untouched', (await one(`SELECT status::text s FROM bills WHERE id='${u(3)}'`)).s, 'Paid');

const again = await voidIt(u(21), OTHER);
check('a second void changes nothing', again.already_voided, true);
check('and does not overwrite who voided it first',
  (await one(`SELECT voided_by::text b FROM monthly_income_records WHERE id='${u(21)}'`)).b, ADMIN);

let refused = null;
try { await voidIt(u(99)); } catch (e) { refused = String(e.message); }
check('an unknown row is refused', /not found/.test(refused ?? ''), true);
check('anon cannot execute it',
  (await one(`SELECT has_function_privilege('anon','public.void_income_record(uuid,uuid,text)','EXECUTE') p`)).p, false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
