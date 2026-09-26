/**
 * Targeted test for docs/FINAL_REVIEW.md F9 and F10: a receipt belongs to the
 * tenancy that covered the period it pays for, because a tenant's standing and
 * open bills are read by `tenant_profile_id`. F9 is the edit that moves a row
 * to another unit; F10 is a new receipt for a period before the current tenancy.
 *
 * Run from backend/:  npm run build && node scripts/check-income-edit.mjs
 *
 * Drives the real PATCH /admin/income-records/:id handler. The database client
 * is replaced by a stub that answers from the fixtures below and records the
 * update it is asked to make, so nothing is read or written anywhere, and the
 * environment values are placeholders that only let the config load.
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-income-edit-placeholder-secret-0123456789',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { db } = await import('../dist/config/db.js');
const { default: adminRouter } = await import('../dist/routes/admin.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const ROOM_2A = '00000000-0000-4000-8000-00000000002a';
const ROOM_2B = '00000000-0000-4000-8000-00000000002b';
const TENANT_X = '00000000-0000-4000-8000-0000000000aa';   // lives in 2A
const TENANT_Y = '00000000-0000-4000-8000-0000000000bb';   // lives in 2B, and paid
const TENANT_Z = '00000000-0000-4000-8000-0000000000cc';   // lived in 2B before Y
const ROW = '00000000-0000-4000-8000-000000000123';

const before = {
  id: ROW, room_id: ROOM_2A, tenant_profile_id: TENANT_X, assignment_id: null,
  year: 2026, month: 9, date_paid: '2026-09-01', rent_period_start: '2026-09-01',
  rent_period_end: '2026-09-30', rent_amount: 6700, occupants: 1, water_payment: 200,
  invoice_number: 'OR#9001', contact_name: 'Y', voided_at: null,
};
const tenanciesOf2B = [
  { id: 'a-y', tenant_profile_id: TENANT_Y, start_date: '2026-03-01', end_date: null, is_active: true },
  { id: 'a-z', tenant_profile_id: TENANT_Z, start_date: '2025-01-01', end_date: '2026-02-28', is_active: false },
];

let updateSent = null;
let insertedIncome = null;
let billsReadFor = [];
let billUpdates = [];
const Y_OPEN_BILL = { id: 'bill-y-sep', total_amount: 6900, status: 'Due' };
function answer(table, calls) {
  const names = calls.map((c) => c[0]);
  const eqValue = (col) => calls.find((c) => c[0] === 'eq' && c[1][0] === col)?.[1][1];
  if (table === 'monthly_income_records' && names.includes('insert')) {
    insertedIncome = calls.find((c) => c[0] === 'insert')[1][0];
    return { data: { id: 'new-row', ...insertedIncome }, error: null };
  }
  if (table === 'monthly_income_records' && names.includes('limit')) return { data: [], error: null };
  if (table === 'bills' && names.includes('update')) {
    billUpdates.push(eqValue('id'));
    return { data: null, error: null };
  }
  if (table === 'bills') {
    const who = eqValue('tenant_profile_id');
    billsReadFor.push(who);
    return { data: who === TENANT_Y ? [Y_OPEN_BILL] : [], error: null };
  }
  if (table === 'payments') return { data: [], error: null };
  if (table === 'room_assignments' && names.includes('maybeSingle')) {
    return { data: { id: 'a-y', tenant_profile_id: TENANT_Y, anniversary_date: '2026-03-01', occupant_count: 1 }, error: null };
  }
  if (table === 'monthly_income_records' && names.includes('update')) {
    updateSent = calls.find((c) => c[0] === 'update')[1][0];
    return { data: { ...before, ...updateSent }, error: null };
  }
  if (table === 'monthly_income_records') return { data: before, error: null };
  if (table === 'rooms' && names.includes('ilike')) {
    const code = String(calls.find((c) => c[0] === 'ilike')[1][1]).toLowerCase();
    return { data: code === '2b' ? { id: ROOM_2B, capacity: 2 } : code === '2a' ? { id: ROOM_2A, capacity: 2 } : null, error: null };
  }
  if (table === 'rooms') {
    const id = calls.find((c) => c[0] === 'eq')?.[1][1];
    return { data: { room_number: id === ROOM_2B ? '2b' : '2a' }, error: null };
  }
  if (table === 'room_assignments') return { data: tenanciesOf2B, error: null };
  if (table === 'system_settings') return { data: [], error: null };
  return { data: null, error: null };   // audit_logs and anything else
}
db.from = (table) => {
  const calls = [];
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => prop === 'then'
      ? (resolve) => resolve(answer(table, calls))
      : (...args) => { calls.push([prop, args]); return chain; },
  });
  return chain;
};

let rpcAnswer = null;
let rpcCalls = [];
db.rpc = async (fn, args) => { rpcCalls.push([fn, args]); return rpcAnswer; };

const routeHandler = (path, method) =>
  adminRouter.stack.find((l) => l.route?.path === path && l.route.methods[method]).route.stack.at(-1).handle;

async function patch(body) {
  updateSent = null;
  return call(routeHandler('/admin/income-records/:id', 'patch'), { id: ROW }, body);
}

async function post(body) {
  insertedIncome = null; billsReadFor = []; billUpdates = [];
  return call(routeHandler('/admin/income-records', 'post'), {}, body);
}

function call(handler, params, body) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    const req = {
      params, body, headers: {}, ip: '127.0.0.1', socket: {},
      user: { profileId: '00000000-0000-4000-8000-0000000000ad', role: 'admin' }, role: 'admin',
      get: () => undefined,
    };
    handler(req, res, (err) => resolve({ status: err?.statusCode ?? 500, error: String(err?.message ?? err) }));
  });
}

const moved = await patch({ roomNumber: '2B', occupants: 1, monthsCovered: 1 });
check('the edit succeeds', moved.status, 200);
check('the row moves to 2B', updateSent?.room_id, ROOM_2B);
check('and to the tenant of 2B who covered that period', updateSent?.tenant_profile_id, TENANT_Y);
check('and to that tenancy', updateSent?.assignment_id, 'a-y');

const movedBack = await patch({ roomNumber: '2B', occupants: 1, dateCoveredStart: '2025-06-01', monthsCovered: 1 });
check('a period from before the current tenancy goes to the tenant who held it then',
  updateSent?.tenant_profile_id, TENANT_Z);

const sameUnit = await patch({ roomNumber: '2A', occupants: 1, rentAmount: 6500, monthsCovered: 1 });
check('an edit that keeps the unit does not touch the tenant', 'tenant_profile_id' in (updateSent ?? {}), false);
check('and still saves', sameUnit.status, 200);

// F10. Z left 2B at the end of February owing January; Y has lived there since
// March and has an open September bill. Z pays January in cash.
const arrears = await post({
  roomNumber: '2B', datePaid: '2026-09-26', contactName: 'Z', invoiceNumber: 'OR#9100',
  rentAmount: 6700, gbgFee: 0, occupants: 1, paymentMethod: 'Cash', monthsCovered: 1,
  dateCoveredStart: '2026-01-01', dateCoveredEnd: '2026-01-31',
});
check('the arrears receipt is recorded', arrears.status, 201);
check('it is credited to Z, who held 2B in January', insertedIncome?.tenant_profile_id, TENANT_Z);
check('and to Z\'s tenancy', insertedIncome?.assignment_id, 'a-z');
check('its money is applied to Z\'s bills, not Y\'s', billsReadFor, [TENANT_Z]);
check('Y\'s open September bill is left alone', billUpdates.includes(Y_OPEN_BILL.id), false);

// And an ordinary receipt for the current period still goes to Y and pays Y's bill.
const current = await post({
  roomNumber: '2B', datePaid: '2026-09-26', contactName: 'Y', invoiceNumber: 'OR#9101',
  rentAmount: 6700, gbgFee: 0, occupants: 1, paymentMethod: 'Cash', monthsCovered: 1,
  dateCoveredStart: '2026-09-01', dateCoveredEnd: '2026-09-30',
});
check('a current receipt is recorded', current.status, 201);
check('and credited to Y', insertedIncome?.tenant_profile_id, TENANT_Y);
check('and settles Y\'s open bill', billUpdates.includes(Y_OPEN_BILL.id), true);

// The live data that corrected this rule (2026-09-26): in 1a the seeded demo
// tenant's tenancy runs 2025-06-05 to 2026-08-25 and OVERLAPS the real tenant's,
// which starts 2026-07-01 though she has paid 1a since 2024. Overlapping
// tenancies mean the dates cannot be trusted, so the receipt stays with the
// current tenant, as it always did.
const savedTenancies = tenanciesOf2B.splice(0, tenanciesOf2B.length,
  { id: 'a-real', tenant_profile_id: TENANT_Y, start_date: '2026-07-01', end_date: null, is_active: true },
  { id: 'a-demo', tenant_profile_id: TENANT_Z, start_date: '2025-06-05', end_date: '2026-08-25', is_active: false });
const overlapping = await post({
  roomNumber: '2B', datePaid: '2026-02-02', contactName: 'Y', invoiceNumber: 'OR#9102',
  rentAmount: 6700, gbgFee: 0, occupants: 1, paymentMethod: 'Cash', monthsCovered: 1,
  dateCoveredStart: '2026-01-07', dateCoveredEnd: '2026-02-06',
});
check('overlapping tenancies: the receipt is recorded', overlapping.status, 201);
check('overlapping tenancies: it stays with the current tenant', insertedIncome?.tenant_profile_id, TENANT_Y);
tenanciesOf2B.splice(0, tenanciesOf2B.length, ...savedTenancies);

// B-71 / F2. Voiding goes through void_income_record (migration 054) when it exists.
async function voidRow() {
  updateSent = null; rpcCalls = [];
  return call(routeHandler('/admin/income-records/:id', 'delete'), { id: ROW }, {});
}
rpcAnswer = { data: { already_voided: false, payment_id: 'pay-1', bill_id: 'bill-1', bill_status: 'Due' }, error: null };
const viaFunction = await voidRow();
check('a void goes through void_income_record', rpcCalls.map((c) => c[0]), ['void_income_record']);
check('with the row and the administrator', [rpcCalls[0]?.[1].p_income_id, rpcCalls[0]?.[1].p_voided_by],
  [ROW, '00000000-0000-4000-8000-0000000000ad']);
check('and writes nothing else itself', updateSent, null);
check('and reports success', viaFunction.status, 200);

rpcAnswer = { data: { already_voided: true }, error: null };
check('a row voided a moment ago by someone else is a 409', (await voidRow()).status, 409);

rpcAnswer = { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
const fallback = await voidRow();
check('before migration 054 is applied, the plain void still works', fallback.status, 200);
check('and sets voided_at itself', Boolean(updateSent?.voided_at), true);

rpcAnswer = { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };
check('any other database error is a 500, not a silent plain void', (await voidRow()).status, 500);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
