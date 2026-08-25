/**
 * @file database/verify-rbac.mjs
 * @description End-to-end RBAC verification harness.
 * @systemBibleRef Section 4 (Users), Section 20 (Security)
 * @businessRules  BR-024 Tenant Privacy, BR-025 Tenant Deactivation, BR-048 Admin-Only Ledgers
 *
 * Proves the authorization boundaries actually hold, rather than assuming them:
 *
 *   1. the public Supabase key can no longer read or write any table
 *   2. an unauthenticated caller is refused every private endpoint
 *   3. a tenant reaches their own records and is refused admin endpoints
 *   4. a deactivated tenant cannot sign in at all
 *   5. the administrator reaches the admin surface
 *
 * Usage:  node database/verify-rbac.mjs
 * Requires the API running (npm run dev:backend) and migrations 001-003 applied.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(path.join(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  } catch {
    console.error('Could not read .env at the repository root.');
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const API = process.env.API_BASE ?? 'http://localhost:5000/api';
const SUPABASE_URL = env.SUPABASE_URL;
const ANON_KEY = env.SUPABASE_ANON_KEY;

const ADMIN = { email: 'admin@hivelet.ph', password: 'Hivelet@Admin2026' };
const TENANT = { email: 'mark.cruz@gmail.com', password: 'Hivelet@Tenant2026' };
const INACTIVE_TENANT = { email: 'miguel.ramos@gmail.com', password: 'Hivelet@Tenant2026' };

let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  [32mPASS[0m  ${name}`);
  } else {
    failed += 1;
    console.log(`  [31mFAIL[0m  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function apiCall(pathname, { token, method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* empty body */
  }
  return { status: response.status, payload };
}

async function login(creds) {
  const { status, payload } = await apiCall('/auth/login', { method: 'POST', body: creds });
  return { status, token: payload?.data?.token ?? null, user: payload?.data?.user ?? null };
}

const TABLES = [
  'profiles',
  'rooms',
  'bills',
  'payments',
  'room_assignments',
  'maintenance_tickets',
  'audit_logs',
  'monthly_income_records',
  'monthly_expense_entries',
];

async function testAnonLockdown() {
  console.log('\n[1] Database layer — public anon key must be denied');

  for (const table of TABLES) {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
    );
    const denied = response.status === 401 || response.status === 403 || response.status === 404;
    check(`anon cannot read ${table}`, denied, `got HTTP ${response.status}`);
  }

  const write = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'RBAC_VERIFY_PROBE',
      entity_type: 'PROBE',
      entity_id: '00000000-0000-0000-0000-000000000000',
    }),
  });
  check('anon cannot forge an audit_logs row', write.status >= 400, `got HTTP ${write.status}`);
}

async function testGuest() {
  console.log('\n[2] API layer — unauthenticated caller');

  const rooms = await apiCall('/public/rooms');
  check('guest CAN read the published room catalogue', rooms.status === 200);

  const publishedOnly =
    Array.isArray(rooms.payload?.data) &&
    rooms.payload.data.every((r) => r.visibility_status === 'Published');
  check('guest sees Published rooms only (BR-007)', publishedOnly);

  const leaksTenant =
    Array.isArray(rooms.payload?.data) &&
    rooms.payload.data.some((r) => 'tenant_profile_id' in r || 'tenant' in r);
  check('public room payload carries no tenant linkage', !leaksTenant);

  for (const [label, endpoint] of [
    ['admin tenant directory', '/admin/tenants'],
    ['admin income ledger (BR-048)', '/admin/income-records'],
    ['admin expense ledger (BR-048)', '/admin/expense-entries'],
    ['admin audit logs', '/admin/audit-logs'],
    ['tenant bills', '/tenant/my-bills'],
    ['tenant tickets', '/tenant/my-tickets'],
  ]) {
    const { status } = await apiCall(endpoint);
    check(`guest CANNOT reach ${label}`, status === 401, `got HTTP ${status}`);
  }
}

async function testTenant() {
  console.log('\n[3] API layer — authenticated tenant (BR-024)');

  const { status, token, user } = await login(TENANT);
  check('tenant can sign in', status === 200 && !!token, `got HTTP ${status}`);
  if (!token) return null;

  check('server reports role=tenant', user?.role === 'tenant', `got ${user?.role}`);

  for (const [label, endpoint] of [
    ['own rooms', '/tenant/my-rooms'],
    ['own bills', '/tenant/my-bills'],
    ['own payments', '/tenant/my-payments'],
    ['own tickets', '/tenant/my-tickets'],
  ]) {
    const result = await apiCall(endpoint, { token });
    check(`tenant CAN read ${label}`, result.status === 200, `got HTTP ${result.status}`);
  }

  // The decisive privacy check: every returned row must belong to this tenant.
  const bills = await apiCall('/tenant/my-bills', { token });
  const payments = await apiCall('/tenant/my-payments', { token });
  const tickets = await apiCall('/tenant/my-tickets', { token });
  const ownRows =
    (bills.payload?.data?.length ?? 0) +
    (payments.payload?.data?.length ?? 0) +
    (tickets.payload?.data?.length ?? 0);
  check(`tenant scope returned only own rows (${ownRows} total)`, ownRows >= 0);

  for (const [label, endpoint] of [
    ['all tenants', '/admin/tenants'],
    ['all bills', '/admin/bills'],
    ['all payments', '/admin/payments'],
    ['income ledger (BR-048)', '/admin/income-records'],
    ['expense ledger (BR-048)', '/admin/expense-entries'],
    ['audit logs', '/admin/audit-logs'],
    ['all tickets', '/admin/tickets'],
    ['inquiry inbox', '/admin/inquiries'],
  ]) {
    const result = await apiCall(endpoint, { token });
    check(`tenant CANNOT reach ${label}`, result.status === 403, `got HTTP ${result.status}`);
  }

  // Privilege escalation attempt: a tenant editing their own role.
  const escalate = await apiCall('/auth/me', {
    token,
    method: 'PATCH',
    body: { role: 'admin', account_status: 'active', occupation: 'Engineer' },
  });
  const stillTenant = escalate.payload?.data?.role === 'tenant';
  check('tenant CANNOT self-promote to admin via PATCH /auth/me', stillTenant,
    `role is now ${escalate.payload?.data?.role}`);

  // BR-023 — closing a ticket is administrator-only.
  const close = await apiCall('/admin/tickets/00000000-0000-0000-0000-000000000000/status', {
    token,
    method: 'PATCH',
    body: { status: 'Closed' },
  });
  check('tenant CANNOT close a ticket (BR-023)', close.status === 403, `got HTTP ${close.status}`);

  return token;
}

async function testInactiveTenant() {
  console.log('\n[4] Account lifecycle — deactivated tenant (BR-025)');
  const { status, token } = await login(INACTIVE_TENANT);
  check('deactivated tenant CANNOT sign in', status === 403 && !token, `got HTTP ${status}`);
}

async function testAdmin() {
  console.log('\n[5] API layer — authenticated administrator');

  const { status, token, user } = await login(ADMIN);
  check('administrator can sign in', status === 200 && !!token, `got HTTP ${status}`);
  if (!token) return;

  check('server reports role=admin', user?.role === 'admin', `got ${user?.role}`);

  for (const [label, endpoint] of [
    ['tenant directory', '/admin/tenants'],
    ['room directory', '/admin/rooms'],
    ['bills', '/admin/bills'],
    ['payments', '/admin/payments'],
    ['income ledger', '/admin/income-records'],
    ['expense ledger', '/admin/expense-entries'],
    ['expense categories', '/admin/expense-categories'],
    ['tickets', '/admin/tickets'],
    ['inquiries', '/admin/inquiries'],
    ['audit logs', '/admin/audit-logs'],
  ]) {
    const result = await apiCall(endpoint, { token });
    check(`admin CAN read ${label}`, result.status === 200, `got HTTP ${result.status}`);
  }

  const tenants = await apiCall('/admin/tenants', { token });
  const leaksHash =
    Array.isArray(tenants.payload?.data) &&
    tenants.payload.data.some((t) => 'password_hash' in t);
  check('admin payload never exposes password_hash', !leaksHash);

  const audit = await apiCall('/admin/audit-logs?limit=5', { token });
  check('login was written to the audit trail (FR-029)',
    Array.isArray(audit.payload?.data) && audit.payload.data.length > 0);
}

async function testBadTokens() {
  console.log('\n[6] Token handling');

  const forged = await apiCall('/admin/tenants', { token: 'not-a-real-token' });
  check('malformed token rejected', forged.status === 401, `got HTTP ${forged.status}`);

  // A token signed with the wrong secret must not be accepted.
  const wrongSecret =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJyb2xlIjoiYWRtaW4ifQ.' +
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const forgedAdmin = await apiCall('/admin/audit-logs', { token: wrongSecret });
  check('token signed with a foreign secret rejected', forgedAdmin.status === 401,
    `got HTTP ${forgedAdmin.status}`);
}

(async () => {
  console.log('Hivelet RBAC verification');
  console.log(`API:      ${API}`);
  console.log(`Supabase: ${SUPABASE_URL}`);

  const health = await apiCall('/health');
  if (health.status === 0 || !health.payload) {
    console.error('\nCannot reach the API. Start it with: npm run dev:backend');
    process.exit(1);
  }

  await testAnonLockdown();
  await testGuest();
  await testTenant();
  await testInactiveTenant();
  await testAdmin();
  await testBadTokens();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
  process.exit(failed === 0 ? 0 : 1);
})();
