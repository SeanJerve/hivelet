/**
 * Targeted test for BLOCKED_FOR_SEAN.md B-47: a tenant is told when their
 * repair is done, once, and only on the way into done.
 *
 * Run from backend/:  npm run build && node scripts/check-ticket-done.mjs
 *
 * Drives the real PATCH /admin/tickets/:ticketId handler. The database client
 * is a stub answering from the fixture below and recording the notifications
 * it is asked to write, so nothing is read or written anywhere.
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-ticket-done-placeholder-secret-0123456789ab',
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

const TICKET = '00000000-0000-4000-8000-000000000071';
const TENANT = '00000000-0000-4000-8000-0000000000aa';
let before;
let notifications = [];

db.from = (table) => {
  const calls = [];
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => {
      if (prop === 'then') {
        return (resolve) => {
          const names = calls.map((c) => c[0]);
          if (table === 'notifications' && names.includes('insert')) {
            notifications.push(calls.find((c) => c[0] === 'insert')[1][0]);
            return resolve({ data: { id: 'n1' }, error: null });
          }
          if (table === 'maintenance_tickets' && names.includes('update')) {
            const patch = calls.find((c) => c[0] === 'update')[1][0];
            return resolve({ data: { ...before, ...patch, rooms: { id: 'r3d', room_number: '3d' } }, error: null });
          }
          if (table === 'maintenance_tickets' && names.includes('maybeSingle')) return resolve({ data: before, error: null });
          if (table === 'maintenance_tickets') return resolve({ data: [], error: null });       // nothing else open
          if (table === 'room_assignments') return resolve({ data: { id: 'a1' }, error: null });
          if (table === 'rooms' && names.includes('update')) return resolve({ data: null, error: null });
          if (table === 'rooms') return resolve({ data: { operational_status: 'Occupied' }, error: null });
          return resolve({ data: null, error: null });                                          // audit_logs
        };
      }
      return (...args) => { calls.push([prop, args]); return chain; };
    },
  });
  return chain;
};

const handler = adminRouter.stack
  .find((l) => l.route?.path === '/admin/tickets/:ticketId' && l.route.methods.patch).route.stack.at(-1).handle;

function patch(from, to, tenant = TENANT) {
  before = { id: TICKET, title: 'Leaking faucet', status: from, room_id: 'r3d', tenant_profile_id: tenant,
             resolved_at: null, closed_at: null, rooms: { id: 'r3d', room_number: '3d', operational_status: 'Occupied' } };
  notifications = [];
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, payload }); return this; },
    };
    const req = {
      params: { ticketId: TICKET }, body: { status: to }, headers: {}, ip: '127.0.0.1', socket: {},
      user: { profileId: '00000000-0000-4000-8000-0000000000ad', role: 'admin' }, get: () => undefined,
    };
    handler(req, res, (err) => resolve({ status: err?.statusCode ?? 500, error: String(err?.message ?? err) }));
  });
}

let r = await patch('Submitted', 'Resolved');
check('marking a repair resolved succeeds', r.status, 200);
check('and tells the tenant, once', notifications.map((n) => [n.recipient_profile_id, n.title]), [[TENANT, 'Your repair is done']]);
check('naming the repair and the unit, and how to reply', notifications[0]?.message,
  '"Leaking faucet" in unit 3D has been marked resolved. If something is still wrong, reply on the repair.');
check('linked to the repair, so the notification opens it', [notifications[0]?.related_entity_type, notifications[0]?.related_entity_id], ['TICKET', TICKET]);

await patch('In Progress', 'Closed');
check('closing an open repair tells them too, without offering a reply', notifications[0]?.message,
  '"Leaking faucet" in unit 3D has been marked closed. If something is still wrong, report it again.');

await patch('Resolved', 'Closed');
check('Resolved to Closed does not tell them twice', notifications.length, 0);

await patch('Resolved', 'Resolved');
check('saving a resolved repair again does not tell them again', notifications.length, 0);

await patch('Submitted', 'In Progress');
check('sending a technician is not "done"', notifications.length, 0);

r = await patch('Submitted', 'Resolved', null);
check('a repair with no tenant (an empty unit) tells nobody, and still saves', [r.status, notifications.length], [200, 0]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
