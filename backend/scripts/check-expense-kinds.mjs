/**
 * Targeted test for the owner adding her own kind of expense
 * (owner, 2026-10-12: "Keep the 13, but she should also have the ability to add
 * her own"; POST /admin/expense-categories).
 *
 * Run from backend/:  npm run build && node scripts/check-expense-kinds.mjs
 *
 * Drives the real handler. The database client is a stub answering from the
 * thirteen rows below (the live table's, from the anonymised fixture) and
 * recording what it is asked to write, so nothing is read or written anywhere.
 * What it holds the route to:
 *   - a name is required, trimmed, 2 to 60 characters, spaces collapsed
 *   - a name already in the list, in any case or spacing, is refused (409)
 *   - the new row is numbered after her codes ("11") and placed after the 13
 *   - parent_code is null: a kind of her own is a line of its own
 *   - the write is audited as EXPENSE_CATEGORY_CREATE with the row
 *   - losing a race for the number (23505) is a 409 "try again", not a 500
 *   - the route is gated by a permission, and nothing renames or deletes a kind
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-expense-kinds-placeholder-secret-0123456789',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { db } = await import('../dist/config/db.js');
const { default: adminRouter } = await import('../dist/routes/admin.js');
const { nextCategorySlot, BUILT_IN_CATEGORY_CODES } = await import('../dist/services/expenseCategories.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const THIRTEEN = [
  ['1', 'Supplies', null], ['2', 'Taxes and Licenses', null], ['3', 'Janitorial and Messengerial Services', null],
  ['4', 'Depreciation', null], ['5', 'Professional Fees', null], ['6', 'Salaries: Michelle', null],
  ['6a', 'PhilHealth', '6'], ['6b', 'SSS', '6'], ['6c', 'Allowances', '6'],
  ['7', 'Communication, Light, and Water', null], ['8', 'Repairs and Maintenance', null],
  ['9', 'Fuel and Oil', null], ['10', 'Others', null],
].map(([code, name, parent_code], i) => ({ code, name, parent_code, display_order: i + 1 }));

let rows;        // what the table holds
let insertError; // what the insert answers with, if anything
let writes;      // everything written

db.from = (table) => {
  const calls = [];
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') {
        return (resolve) => {
          const names = calls.map((c) => c[0]);
          const arg = (name) => calls.find((c) => c[0] === name)?.[1];
          for (const n of ['update', 'delete', 'upsert']) {
            if (names.includes(n)) writes.push({ table, op: n });
          }
          if (names.includes('insert')) {
            const row = arg('insert')[0];
            writes.push({ table, op: 'insert', row });
            if (table === 'fixed_expense_categories') {
              if (insertError) return resolve({ data: null, error: insertError });
              rows.push(row);
              return resolve({ data: { ...row }, error: null });
            }
            return resolve({ data: null, error: null });
          }
          if (table === 'fixed_expense_categories') return resolve({ data: rows.map((r) => ({ ...r })), error: null });
          return resolve({ data: null, error: null });
        };
      }
      return (...args) => { calls.push([prop, args]); return chain; };
    },
  });
  return chain;
};

const layer = adminRouter.stack.find((l) => l.route?.path === '/admin/expense-categories' && l.route.methods.post);
check('POST /admin/expense-categories exists', Boolean(layer), true);
check('behind a permission check as well as the handler', layer?.route.stack.length, 2);
const handler = layer.route.stack.at(-1).handle;

const others = adminRouter.stack.filter((l) => /^\/admin\/expense-categories/.test(l.route?.path ?? ''));
check('no rename or delete of a kind (the 13 stay as they are)', others.some((l) => l.route.methods.patch || l.route.methods.put || l.route.methods.delete), false);

function add(body, { race = false, existing = THIRTEEN } = {}) {
  rows = existing.map((r) => ({ ...r }));
  insertError = race ? { code: '23505', message: 'duplicate key value violates unique constraint "fixed_expense_categories_pkey"' } : null;
  writes = [];
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    const req = {
      params: {}, body, headers: {}, ip: '127.0.0.1', socket: {},
      user: { profileId: '00000000-4000-4000-8000-0000000000aa', role: 'admin' }, get: () => undefined,
    };
    handler(req, res, (err) => resolve({ status: err?.statusCode ?? 500, error: String(err?.message ?? err) }));
  });
}
const inserted = (table) => writes.filter((w) => w.op === 'insert' && w.table === table).map((w) => w.row);

let r = await add({ name: '  Internet   and  cable ' });
check('a new kind is added', r.status, 201);
check('trimmed, spaces collapsed, numbered 11, after the 13, a line of its own', r.payload?.data,
  { code: '11', name: 'Internet and cable', parent_code: null, display_order: 14 });
check('one row written to the table', inserted('fixed_expense_categories').length, 1);
check('audited as EXPENSE_CATEGORY_CREATE with the row', inserted('audit_logs').map((a) => [a.action, a.entity_type, a.new_values?.code]),
  [['EXPENSE_CATEGORY_CREATE', 'EXPENSE_CATEGORY', '11']]);
check('nothing updated or deleted', writes.filter((w) => w.op !== 'insert').length, 0);

r = await add({ name: 'Pest control' }, { existing: [...THIRTEEN, { code: '11', name: 'Internet and cable', parent_code: null, display_order: 14 }] });
check('the next one is 12, after the one she added', [r.status, r.payload?.data?.code, r.payload?.data?.display_order], [201, '12', 15]);

for (const [label, body] of [
  ['no name', {}],
  ['an empty name', { name: '' }],
  ['only spaces', { name: '    ' }],
  ['one character', { name: 'x' }],
  ['61 characters', { name: 'x'.repeat(61) }],
  ['a number instead of text', { name: 42 }],
  ['a control character', { name: 'Gas\u0000bill' }],
]) {
  r = await add(body);
  check(`refused: ${label}`, [r.status, inserted('fixed_expense_categories').length], [422, 0]);
}
r = await add({ name: 'x'.repeat(61) });
check('the refusal names the field and the limit', /^Name: .*60 characters/.test(r.error), true);
r = await add({ name: 'ab' });
check('two characters is enough', r.status, 201);
r = await add({ name: 'y'.repeat(60) });
check('sixty characters is enough', r.status, 201);

for (const name of ['Supplies', 'fuel and oil', '  REPAIRS   and maintenance ', 'philhealth']) {
  r = await add({ name });
  check(`refused as already there: "${name}"`, [r.status, inserted('fixed_expense_categories').length], [409, 0]);
}
r = await add({ name: 'sss' });
check('and says which one to choose', /"SSS" is already a kind of expense \(6b\)/.test(r.error), true);

r = await add({ name: 'Pest control' }, { race: true });
check('losing the race for a number is a 409 to try again, not a 500', [r.status, /try again/.test(r.error)], [409, true]);
check('and nothing is audited', inserted('audit_logs').length, 0);

check('the slot never reuses a built-in number', nextCategorySlot([]).code, '11');
check('the slot skips lettered codes', nextCategorySlot([{ code: '6c', display_order: 9 }, { code: '10', display_order: 13 }]).code, '11');
check('the 13 built-in codes', BUILT_IN_CATEGORY_CODES.length, 13);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
