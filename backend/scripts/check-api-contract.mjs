/**
 * End-to-end smoke test of every endpoint the frontend actually calls.
 *
 * Run with `npm run check:api` from `backend/` while the server is running.
 * Logs in for real, exercises the read endpoints of both roles, and reports any
 * that fail. It performs NO writes - this is safe to run against production.
 *
 * Exists because "the frontend works" was being asserted rather than tested, and
 * two calls turned out to be 404ing into silent fallbacks: GET /tenant/tickets
 * (the route is /tenant/my-tickets) and POST /admin/inquiries/:id/reply (it is
 * /messages). Both had been invisible because the UI swallowed the failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const BASE = process.env.API_BASE || 'http://127.0.0.1:5000/api';

// Credentials come from the gitignored local file, never from source.
const credsPath = path.join(root, 'credentials', 'creds.txt');
if (!fs.existsSync(credsPath)) {
  console.error('credentials/creds.txt not found - cannot run the contract check.');
  process.exit(1);
}
const creds = fs.readFileSync(credsPath, 'utf8');
const adminEmail = creds.match(/Email:\s*(\S+)/)?.[1];
const adminPass = creds.match(/Password:\s*(\S+)/)?.[1];
const tenantPass = [...creds.matchAll(/Password:\s*(\S+)/g)].at(-1)?.[1];

let pass = 0, fail = 0;
const failures = [];

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data?.token ?? j?.token ?? null;
}

async function check(label, pathname, token) {
  const r = await fetch(`${BASE}${pathname}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  const ok = r.status >= 200 && r.status < 300;
  let shape = '';
  if (ok) {
    try {
      const j = await r.json();
      const d = j?.data ?? j;
      shape = Array.isArray(d) ? `${d.length} rows` : typeof d === 'object' ? 'object' : String(d).slice(0, 20);
    } catch { shape = 'non-json'; }
  }
  ok ? pass++ : (fail++, failures.push(`${label} ${pathname} -> ${r.status}`));
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${String(r.status).padEnd(4)} ${pathname.padEnd(42)} ${shape}`);
}

console.log(`API: ${BASE}\n`);

/**
 * The security posture is a claim the system makes about itself, so assert it
 * rather than reading past it.
 *
 * `enforced` is the ONLY passing value. It means the publishable key reached
 * PostgreSQL and PostgreSQL refused it. `unverified` means the key was rejected
 * at the gateway and the probe proved nothing - which is what an environment
 * still holding a rotated-out key looks like, and which the old boolean field
 * reported as a green padlock.
 */
async function checkLockdown() {
  const r = await fetch(`${BASE}/health`);
  const j = await r.json().catch(() => ({}));
  const verdict = j?.security?.rlsLockdown;
  const ok = verdict === 'enforced';
  ok ? pass++ : (fail++, failures.push(`rlsLockdown is "${verdict}", expected "enforced"`));
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${''.padEnd(4)} ${'rlsLockdown verdict'.padEnd(42)} ${verdict}`);
}

// ---- public -------------------------------------------------------------
console.log('PUBLIC (no token)');
await check('public', '/health', null);
await checkLockdown();
await check('public', '/public/rooms', null);
await check('public', '/public/clusters', null);
await check('public', '/public/rates', null);

// ---- admin --------------------------------------------------------------
const adminToken = await login(adminEmail, adminPass);
console.log(`\nADMIN (${adminEmail}) - token ${adminToken ? 'issued' : 'FAILED'}`);
if (!adminToken) { fail++; failures.push('admin login failed'); }
else {
  for (const p of [
    '/auth/me', '/admin/rooms', '/admin/tenants', '/admin/bills', '/admin/payments',
    '/admin/income-records', '/admin/expense-entries', '/admin/expense-categories',
    '/admin/tickets', '/admin/inquiries', '/admin/audit-logs', '/admin/notifications'
  ]) await check('admin', p, adminToken);
}

// ---- tenant -------------------------------------------------------------
let tenantEmail = null, tenantToken = null;
const seededPath = path.join(root, 'database', 'seeded-tenant-credentials.json');
const seeded = fs.existsSync(seededPath)
  ? JSON.parse(fs.readFileSync(seededPath, 'utf8'))
  : [];
for (const entry of seeded) {
  const t = await login(entry.email, entry.password ?? tenantPass);
  if (t) { tenantEmail = entry.email; tenantToken = t; break; }
}
console.log(`\nTENANT (${tenantEmail ?? 'none found'}) - token ${tenantToken ? 'issued' : 'FAILED'}`);
if (tenantToken) {
  for (const p of [
    '/auth/me', '/tenant/my-rooms', '/tenant/my-bills', '/tenant/my-payments',
    '/tenant/my-income-records', '/tenant/my-tickets', '/tenant/my-notifications',
    '/tenant/my-profile'
  ]) await check('tenant', p, tenantToken);
}

// ---- isolation ----------------------------------------------------------
if (tenantToken) {
  console.log('\nISOLATION (a tenant must not reach admin data)');
  const r = await fetch(`${BASE}/admin/tenants`, { headers: { Authorization: `Bearer ${tenantToken}` } });
  const blocked = r.status === 401 || r.status === 403;
  blocked ? pass++ : (fail++, failures.push(`tenant reached /admin/tenants -> ${r.status}`));
  console.log(`  ${blocked ? 'OK  ' : 'FAIL'} ${r.status}  tenant calling /admin/tenants`);
}

console.log(`\n${pass} passed, ${fail} failed`);
for (const f of failures) console.log('  - ' + f);
process.exit(fail === 0 ? 0 : 1);
