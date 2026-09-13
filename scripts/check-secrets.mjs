#!/usr/bin/env node
/**
 * Scans for credentials that must never be committed.
 *
 * Exists because three real secrets - the Supabase service_role key, the anon key
 * and the JWT signing secret - sat in `.env.example` in a public repository from
 * 2026-08-25 to 2026-09-13. The file's own header said "never commit it" about
 * `.env` while holding the live values itself. Nothing caught it for three weeks,
 * because nothing was looking.
 *
 * Two ways to run it:
 *   node scripts/check-secrets.mjs            scan files staged for commit
 *   node scripts/check-secrets.mjs --all      scan every tracked file
 *
 * Wired as a pre-commit hook by `npm run hooks:install`.
 *
 * Exit code 1 means something was found. It is meant to be annoying.
 */
import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const ALL = process.argv.includes('--all');

/** Patterns that indicate real credential material, not a placeholder. */
const RULES = [
  {
    name: 'Supabase secret key',
    re: /sb_secret_[A-Za-z0-9_-]{8,}/g,
    why: 'Bypasses row-level security. Reads and writes every row in every table.'
  },
  {
    name: 'Supabase legacy JWT key (anon or service_role)',
    re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    why: 'A signed Supabase key. service_role bypasses RLS entirely.'
  },
  {
    name: 'Supabase personal access token',
    re: /sbp_[A-Za-z0-9]{20,}/g,
    why: 'Controls the Supabase account, not just this project.'
  },
  {
    name: 'Known-compromised JWT secret',
    re: /hivelet_super_secret_jwt_key_2026_capstone/g,
    why: 'Published publicly. Anyone holding it can mint a token claiming any role.'
  },
  {
    name: 'Private key block',
    re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
    why: 'A private key has no business in source control.'
  },
  {
    name: 'AWS access key id',
    re: /\bAKIA[0-9A-Z]{16}\b/g,
    why: 'AWS credential.'
  },
  {
    name: 'Adyen live API key',
    re: /\bAQE[A-Za-z0-9+/]{40,}/g,
    why: 'Payment gateway credential.'
  }
];

/** Files where a match is expected and harmless - documentation ABOUT the leak. */
const ALLOWLIST = [
  /^scripts\/check-secrets\.mjs$/,
  /^\.githooks\//,
  /^docs\//,
  /^database\/migrations\/.*\.sql$/,
  /^backend\/src\/config\/env\.ts$/,
  /^\.agent\//,   // vendored tool skills - third-party docs, not our source
  /^\.agents\//
];

/**
 * Words that mark a match as an obvious placeholder rather than a live value.
 * A scanner that cries wolf gets switched off, so this matters more than it looks.
 */
const PLACEHOLDER = /your|here|example|placeholder|replace|xxx|dummy|fake|redacted|todo|<|\.\.\./i;

function tracked() {
  const cmd = ALL
    ? 'git ls-files'
    : 'git diff --cached --name-only --diff-filter=ACM';
  return execSync(cmd, { encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(Boolean);
}

const findings = [];

for (const file of tracked()) {
  if (ALLOWLIST.some(re => re.test(file))) continue;

  let text;
  try {
    if (statSync(file).size > 2_000_000) continue;
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // deleted, binary, or unreadable
  }

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      if (PLACEHOLDER.test(m[0])) continue;

      // Also skip a match whose whole line reads as commentary about secrets
      // rather than a secret - an example inside a guide, say.
      const lineStart = text.lastIndexOf('\n', m.index) + 1;
      const lineEnd = text.indexOf('\n', m.index);
      const whole = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      if (PLACEHOLDER.test(whole)) continue;

      const line = text.slice(0, m.index).split('\n').length;
      findings.push({ file, line, rule, sample: m[0].slice(0, 12) });
    }
  }
}

if (findings.length === 0) {
  console.log(`check-secrets: clean (${ALL ? 'all tracked files' : 'staged files'})`);
  process.exit(0);
}

console.error('\n  COMMIT BLOCKED - credential material found\n');
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}`);
  console.error(`    ${f.rule.name}  (${f.sample}...)`);
  console.error(`    ${f.rule.why}\n`);
}
console.error('  If this is a placeholder, make it obviously fake (e.g. sb_secret_your_key_here).');
console.error('  If it is real: do NOT commit. Move it to .env, which is gitignored.');
console.error('  If it has already been pushed, the value is burned - rotate it.\n');
process.exit(1);
