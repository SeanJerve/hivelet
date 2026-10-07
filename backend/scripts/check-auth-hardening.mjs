#!/usr/bin/env node
/**
 * check-auth-hardening: the sign-in protections a common "vibe-coded login" checklist names, held
 * in place (Sean, 2026-10-07). Static reads of the server's source, plus one live call to the
 * breached-password service. Run from backend/: `node scripts/check-auth-hardening.mjs`.
 *
 *   1. The admin router is gated on the SERVER (requireAuth + requireAdmin on the whole router).
 *   2. Public sign-up is refused unless ALLOW_PUBLIC_SIGNUP is set, and is rate-limited anyway.
 *   3. Failed sign-ins are counted per address (and per account in the database, authService).
 *   4. Failed password changes are counted, so a held session cannot guess the current password.
 *   5. The server enforces the password rules: 10 characters, a letter, a number.
 *   6. A new password is checked against Pwned Passwords before it is saved, and the check
 *      really answers (a known-breached password is found; a random one is not).
 *
 * Mutation-tested 2026-10-07: each static shape was broken in the real file and the check failed.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => fs.readFileSync(path.join(here, '..', 'src', p), 'utf8');
const auth = src('routes/auth.ts');
const admin = src('routes/admin.ts');
const authService = src('services/authService.ts');

let failed = 0;
const ok = (name) => console.log(`  OK    ${name}`);
const fail = (name, why) => { failed++; console.log(`  FAIL  ${name} - ${why}`); };
const check = (name, cond, why) => (cond ? ok(name) : fail(name, why));

check('1 admin router gated on the server',
  /router\.use\(\s*'\/admin'\s*,\s*requireAuth\s*,[^)]*requireAdmin\s*\)/.test(admin),
  "routes/admin.ts no longer has router.use('/admin', requireAuth, ..., requireAdmin)");

const registerBlock = auth.slice(auth.indexOf("'/auth/register'"), auth.indexOf("'/auth/register'") + 1200);
check('2 public sign-up refused unless switched on',
  /config\.allowPublicSignup/.test(registerBlock) && /ApiError\.forbidden/.test(registerBlock),
  'the /auth/register handler no longer refuses when allowPublicSignup is off');
check('2 sign-up rate-limited',
  /rateLimit\(\s*\{\s*max:\s*\d+/.test(registerBlock),
  'the /auth/register route lost its rateLimit');

const loginBlock = auth.slice(auth.indexOf("'/auth/login'"), auth.indexOf("'/auth/login'") + 900);
check('3 failed sign-ins counted per address',
  /loginFailures,/.test(loginBlock) && /loginFailures\.record\(req\)/.test(loginBlock),
  '/auth/login no longer applies and records loginFailures');
check('3 failed sign-ins counted per account',
  /failed_login_count/.test(authService) && /locked_until/.test(authService),
  'authService no longer tracks failed_login_count / locked_until');

const changeBlock = auth.slice(auth.indexOf("'/auth/change-password'"), auth.indexOf("'/auth/change-password'") + 2600);
check('4 failed password changes counted',
  /passwordChangeFailures,/.test(changeBlock) && /passwordChangeFailures\.record\(req\)/.test(changeBlock),
  '/auth/change-password no longer applies and records passwordChangeFailures');

const schema = auth.slice(auth.indexOf('const passwordSchema'), auth.indexOf('const passwordSchema') + 500);
check('5 password rules enforced by the server',
  /\.min\(10/.test(schema) && /\[A-Za-z\]/.test(schema) && /\[0-9\]/.test(schema),
  'passwordSchema no longer requires 10 characters, a letter and a number');

const breachAt = changeBlock.indexOf('timesBreached(parsed.data.newPassword)');
const saveAt = changeBlock.indexOf('changeOwnPassword(');
check('6 new password checked for breaches before it is saved',
  breachAt > 0 && saveAt > 0 && breachAt < saveAt,
  'change-password does not call timesBreached(newPassword) before changeOwnPassword');

// Live: the service answers, so the check is real rather than always failing open. The same call
// as utils/breachedPassword.ts (k-anonymity: only five hex characters of the SHA-1 are sent).

async function timesBreached(pw) {
  const h = crypto.createHash('sha1').update(pw, 'utf8').digest('hex').toUpperCase();
  try {
    const r = await fetch(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' } });
    if (!r.ok) return null;
    const line = (await r.text()).split(/\r?\n/).find((l) => l.startsWith(h.slice(5) + ':'));
    return line ? Number(line.trim().split(':')[1]) || 0 : 0;
  } catch { return null; }
}
const known = await timesBreached('Password123');
const random = await timesBreached(crypto.randomUUID() + 'x9');
if (known === null) console.log('  note  6 Pwned Passwords could not be reached; the server fails open (the rules still apply)');
else check('6 breached-password service answers', known > 0 && random === 0,
  `expected Password123 found (got ${known}) and a random password not (got ${random})`);

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
