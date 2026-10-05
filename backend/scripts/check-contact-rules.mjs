/**
 * Targeted test for the emergency contact number rule (services/contactDetails.ts, emergencyPhone).
 *
 * Run from backend/:  npm run build && node scripts/check-contact-rules.mjs
 *
 * The technical evaluators (3 Oct 2026) asked for number validation. The tenant's own number had
 * it; the emergency contact's was any string up to 50 characters on every route that takes one,
 * and one on file had ten digits. What this holds the rule to:
 *   - blank is allowed (the contact is optional), and a Philippine mobile in any spacing or +63 form
 *   - anything else is refused, with the same sentence the screens show
 *   - the tenant's own route refuses it under the column's name, so My details can say it
 *     under the field
 *   - no route in src/routes still takes the number as a bare string
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

Object.assign(process.env, {
  JWT_SECRET: process.env.JWT_SECRET || 'check-contact-rules-placeholder-secret-0123456789',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://placeholder.invalid',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'placeholder',
});

const { emergencyPhone, ownProfileUpdateSchema } = await import('../dist/services/contactDetails.js');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(actual)}\n        want ${JSON.stringify(expected)}`);
}

const MSG = 'Enter a Philippine mobile number, for example 0917 123 4567.';
const ok = (v) => emergencyPhone.safeParse(v).success;

check('blank is allowed', [ok(''), ok('   ')], [true, true]);
check('a mobile in any spacing, or +63', [ok('09171234567'), ok('0917 123 4567'), ok('0917-123-4567'), ok('+63 917 123 4567')], [true, true, true, true]);
check('ten digits, a dash, a name, a landline are refused',
  [ok('0978 617 111'), ok('-'), ok('Mama'), ok('(054) 473 1234')], [false, false, false, false]);
check('the refusal says what to type', emergencyPhone.safeParse('0978617111').error?.issues?.[0]?.message, MSG);

const own = ownProfileUpdateSchema.strict().safeParse({ emergency_contact_phone: '0978 617 111' });
check("the tenant's own route refuses it under the column's name",
  own.success ? null : own.error.flatten().fieldErrors.emergency_contact_phone, [MSG]);
check("and still takes a cleared one", ownProfileUpdateSchema.strict().safeParse({ emergency_contact_phone: null }).success, true);

// No route may take the number as a bare string again.
const routes = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'routes');
const bare = [];
for (const f of fs.readdirSync(routes).filter((n) => n.endsWith('.ts'))) {
  const src = fs.readFileSync(path.join(routes, f), 'utf8');
  for (const m of src.matchAll(/(emergencyContactPhone|emergency_contact_phone)\s*:\s*z\./g)) bare.push(`${f}: ${m[0]}`);
}
check('no route takes an emergency number as a bare string', bare, []);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
