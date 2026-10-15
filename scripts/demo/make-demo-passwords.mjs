#!/usr/bin/env node
/**
 * Makes the passwords for the DEMO copy's sign-in accounts (never the live site's).
 *
 * Writes the plain passwords to credentials/demo-evaluator-accounts.txt, which is
 * gitignored, and prints only their bcrypt hashes - the hashes are what
 * scripts/demo/demo-seed.sql takes, so a password never passes through the SQL,
 * the database logs or the chat that ran it.
 *
 * Run:  node scripts/demo/make-demo-passwords.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Rounds match backend/src/config/env.ts (auth.bcryptRounds).
const ROUNDS = 12;

// Same login identifiers demo-seed.sql gives these profiles.
const accounts = [
  { key: 'owner', role: 'Owner (admin) - keep for the team', login: 'owner.demo@example.com' },
  { key: 'admin1', role: 'Evaluator, owner side', login: 'evaluator1@example.com' },
  { key: 'admin2', role: 'Evaluator, owner side', login: 'evaluator2@example.com' },
  { key: 'admin3', role: 'Evaluator, owner side', login: 'evaluator3@example.com' },
  { key: 'tenant1', role: 'Tenant, unit 1a (paid up)', login: 'HV-10001' },
  { key: 'tenant2', role: 'Tenant, unit 2b (October rent overdue)', login: 'HV-10002' },
  { key: 'tenant3', role: 'Tenant, unit B2B (open maintenance tickets)', login: 'HV-10003' }
];

// No 0/O, 1/l/I: these get read aloud and retyped.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
const word = (n) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const lines = [
  'Hivelet DEMO copy - evaluator sign-ins. Fake data only; NOT the live site.',
  `Made ${new Date().toISOString()}. Send privately, one account per evaluator.`,
  ''
];
const hashes = {};
for (const a of accounts) {
  const password = `Demo-${word(4)}-${word(4)}`;
  hashes[a.key] = bcrypt.hashSync(password, ROUNDS);
  if (!bcrypt.compareSync(password, hashes[a.key])) throw new Error(`hash check failed for ${a.key}`);
  lines.push(`${a.role}\n  sign in with: ${a.login}\n  password:     ${password}\n`);
}
// Every other demo tenant gets a hash of a password nobody was ever shown.
hashes.unusable = bcrypt.hashSync(word(32), ROUNDS);

const out = path.join(root, 'credentials', 'demo-evaluator-accounts.txt');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join('\n'));
console.log(JSON.stringify(hashes, null, 2));
console.error(`passwords written to ${path.relative(root, out)} (gitignored)`);
