/**
 * Authentication under attack. Tokens that are expired, tampered, signed with
 * the wrong key, or belong to an account that has since been switched off.
 *
 * Read-only against the API. Writes nothing. Temporary.
 */
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
const creds = fs.readFileSync(path.join(process.cwd(), '..', 'credentials', 'creds.txt'), 'utf8');
const BASE = process.env.API_BASE || 'http://127.0.0.1:5000/api';
const SECRET = process.env.JWT_SECRET;

const login = async (id, pw) => {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: id, password: pw }),
  });
  const j = await r.json().catch(() => ({}));
  return j?.data?.token ?? null;
};
const good = await login(creds.match(/Email:\s*(\S+)/)[1], creds.match(/Password:\s*(\S+)/)[1]);
if (!good) { console.error('sign-in failed'); process.exit(1); }

let pass = 0, fail = 0;
const note = (what, ok, detail) => {
  if (ok === true) pass++; else if (ok === false) fail++;
  console.log(`  ${ok === true ? 'PASS' : ok === false ? 'FAIL' : 'note'}  ${what.padEnd(56)} ${detail ?? ''}`);
};
const probe = async (token) => {
  const r = await fetch(`${BASE}/admin/income-records`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return r.status;
};

const claims = jwt.decode(good);
console.log(`\ntoken claims: role=${claims.role}, exp in ${Math.round((claims.exp - Date.now() / 1000) / 86400)} days\n`);

console.log('TOKENS THAT MUST NOT WORK');

// 1. A token signed with a different secret - the classic forgery.
const bare = { profileId: claims.profileId, role: claims.role, email: claims.email };
const forged = jwt.sign(bare, 'not-the-real-secret', { expiresIn: '7d' });
note('signed with the wrong secret', (await probe(forged)) === 401, `${await probe(forged)}`);

// 2. `alg: none` - the classic JWT bypass.
const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({ ...claims, role: 'admin' })).toString('base64url');
note('alg:none, unsigned', (await probe(`${header}.${payload}.`)) === 401, `${await probe(`${header}.${payload}.`)}`);

// 3. Expired.
const expired = jwt.sign({ profileId: claims.profileId, role: claims.role, email: claims.email }, SECRET, { expiresIn: '-1h' });
note('expired an hour ago', (await probe(expired)) === 401, `${await probe(expired)}`);

// 4. Correctly signed, but the role inside says admin when the account is a tenant.
//    The API must trust the DATABASE, not the claim.
const tenants = await (await fetch(`${BASE}/admin/tenants`, { headers: { Authorization: `Bearer ${good}` } })).json();
const aTenant = (tenants?.data ?? []).find((t) => t.role === 'tenant' && t.email?.includes('@'));
if (aTenant) {
  const escalated = jwt.sign({ profileId: aTenant.id, role: 'admin', email: aTenant.email }, SECRET, { expiresIn: '1h' });
  const st = await probe(escalated);
  note('a TENANT id with role:admin forged into a valid signature', st === 403 || st === 401,
    `${st} — the API must read the role from the database, not the token`);
}

// 5. A token for a profile that does not exist.
const ghost = jwt.sign({ profileId: '00000000-0000-0000-0000-000000000000', role: 'admin', email: 'ghost@nowhere.invalid' }, SECRET, { expiresIn: '1h' });
note('a valid signature for a profile that does not exist', [401, 403].includes(await probe(ghost)), `${await probe(ghost)}`);

// 6. Structural nonsense.
for (const [label, t] of [
  ['no token at all', null],
  ['an empty bearer', ''],
  ['not a JWT at all', 'banana'],
  ['a JWT with the payload swapped after signing',
    (() => { const p = good.split('.'); p[1] = Buffer.from(JSON.stringify({ ...claims, role: 'admin', profileId: claims.profileId })).toString('base64url'); return p.join('.'); })()],
]) {
  note(label, (await probe(t)) === 401, `${await probe(t)}`);
}

console.log('\nTHE REAL TOKEN STILL WORKS');
note('the genuine admin token', (await probe(good)) === 200, `${await probe(good)}`);

console.log(`\n  ${pass} passed, ${fail} failed`);
