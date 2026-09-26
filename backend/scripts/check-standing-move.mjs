/**
 * Targeted test for docs/FINAL_REVIEW.md F11: a room move must not wipe a
 * tenant's arrears. Standing counts from the start of their continuous stay,
 * not from the day the current tenancy began.
 *
 * Run from backend/:  npm run build && node scripts/check-standing-move.mjs
 *
 * Drives the real `readStanding`. The database client is replaced by a stub
 * answering from the fixtures below, so nothing is read or written anywhere.
 */
Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-standing-placeholder-secret-0123456789ab',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { db } = await import('../dist/config/db.js');
const { readStanding } = await import('../dist/services/standingService.js');
const { propertyToday } = await import('../dist/utils/propertyClock.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const today = propertyToday();
const paidThrough = addDays(today, -40);          // a month and more behind

let tenancies = [];
let latestEnd = paidThrough;
db.from = (table) => {
  const calls = [];
  const chain = new Proxy(() => {}, {
    get: (_t, prop) => prop === 'then'
      ? (resolve) => {
          const names = calls.map((c) => c[0]);
          if (table === 'room_assignments' && names.includes('maybeSingle')) {
            const active = tenancies.find((t) => t.is_active);
            return resolve({ data: { ...active, rooms: { room_number: '2b', current_price: 6700 } }, error: null });
          }
          if (table === 'room_assignments') return resolve({ data: tenancies, error: null });
          if (table === 'monthly_income_records') return resolve({ data: [{ rent_period_end: latestEnd }], error: null });
          return resolve({ data: [], error: null });   // system_settings
        }
      : (...args) => { calls.push([prop, args]); return chain; },
  });
  return chain;
};

// Moved from 2A to 2B TODAY, owing since `paidThrough`.
tenancies = [
  { id: 'new', room_id: '2b', start_date: today, end_date: null, is_active: true, occupant_count: 1 },
  { id: 'old', room_id: '2a', start_date: '2024-01-01', end_date: today, is_active: false, occupant_count: 1 },
];
let s = await readStanding('tenant-x');
check('after a room move, what was owed before it is still owed',
  s?.owedPeriods[0]?.start, addDays(paidThrough, 1));
check('and reads overdue', s?.status, 'overdue');

// Same, but the old tenancy ended the day BEFORE the new one began: still one stay.
tenancies[1].end_date = addDays(today, -1);
s = await readStanding('tenant-x');
check('a move where the old tenancy ended the day before is still one stay',
  s?.owedPeriods[0]?.start, addDays(paidThrough, 1));

// Left for a while and came back: a fresh start, as before.
tenancies[1].end_date = addDays(today, -90);
latestEnd = addDays(today, -100);
s = await readStanding('tenant-x');
check('a tenant who left and came back later starts fresh', s?.owedPeriods[0]?.start, today);

// No move at all: unchanged.
tenancies = [{ id: 'only', room_id: '2b', start_date: '2025-01-01', end_date: null, is_active: true, occupant_count: 1 }];
latestEnd = paidThrough;
s = await readStanding('tenant-x');
check('a tenant who never moved is counted as before', s?.owedPeriods[0]?.start, addDays(paidThrough, 1));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
