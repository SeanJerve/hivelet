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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

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

/**
 * Files where a match is expected and harmless.
 *
 * `docs/` USED TO BE ON THIS LIST, and should not have been. The reason given
 * was that documents discuss the leak and would quote the compromised values -
 * but exempting the whole tree meant a real key pasted into any of ~200
 * documents would never be seen. A mutation confirmed it: an `sb_secret_...`
 * dropped into `docs/04_ARCHITECTURE.md` was the only one of eight test cases
 * the scanner missed.
 *
 * Removing it costs nothing. Scanned on 2026-09-16, `docs/` contains **zero**
 * matches for any of the seven rules - not even the published JWT secret, which
 * the documents describe by name rather than by quoting. So the exemption was
 * protecting nothing and hiding everything.
 */
const ALLOWLIST = [
  /^scripts\/check-secrets\.mjs$/,
  /^\.githooks\//,
  /^database\/migrations\/.*\.sql$/,
  /^backend\/src\/config\/env\.ts$/,
  // Vendored third-party tool skills, not our source. Two files there show a
  // `-----BEGIN RSA PRIVATE KEY-----` header as an illustration.
  /^\.agent\//,
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

/**
 * THE BUILD OUTPUT, WHICH IS NOT TRACKED AND SO WAS NEVER SCANNED
 * ---------------------------------------------------------------
 * Everything above reads files git knows about. `frontend/dist` is gitignored,
 * so nothing here ever looked at what actually ships - and on 2026-09-16 what
 * shipped was the landlady's administrator password.
 *
 * `LoginView.vue` held a "Quick Demo Access" panel with 34 accounts, each with
 * its password, rendered as one-click sign-in buttons on the PUBLIC login page.
 * `dist/assets/index-*.js` contained `Hivelet@Admin2026` once and
 * `Hivelet@Tenant2026` thirty-three times. It also published the name, email
 * and **room number** of all 33 real residents.
 *
 * Every rule above would have missed it, and did, for as long as it existed:
 * they look for key-shaped material - Supabase keys, JWTs, tokens - and an
 * account password looks like an ordinary string.
 *
 * So this scans what is served, not what is committed. A password belongs in
 * `backend/src` (it is the onboarding default) and in the dev-only account
 * module; it must never reach the browser bundle.
 */
const BUILD_DIRS = ['frontend/dist'];

const SHIPPED_RULES = [
  {
    name: 'Account password in the built bundle',
    re: /Hivelet@(?:Admin|Tenant)\d{4}/g,
    why: 'Anyone who loads the site, or just downloads the JS, has this credential.'
  },
  {
    name: 'Resident email address in the built bundle',
    re: /[a-z][a-z.]{3,}@gmail\.com/g,
    why: 'Personal data for a real resident. BR-024 Tenant Privacy.'
  },
  {
    name: 'Supabase secret key in the built bundle',
    re: /sb_secret_[A-Za-z0-9_-]{8,}/g,
    why: 'Bypasses row-level security. Must never leave the server.'
  }
];

function walkBuild(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walkBuild(p));
    else if (/\.(js|css|html|json|map|txt)$/i.test(e)) out.push(p);
  }
  return out;
}

const shipped = [];
let scannedBuild = 0;

for (const dir of BUILD_DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of walkBuild(dir)) {
    scannedBuild += 1;
    let text;
    try {
      if (statSync(file).size > 20_000_000) continue;
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const rule of SHIPPED_RULES) {
      rule.re.lastIndex = 0;
      const seen = new Set();
      let m;
      while ((m = rule.re.exec(text)) !== null) {
        if (seen.has(m[0])) continue;
        seen.add(m[0]);
        shipped.push({ file: file.split(path.sep).join('/'), rule, sample: m[0].slice(0, 24) });
      }
    }
  }
}

if (findings.length === 0 && shipped.length === 0) {
  const built = scannedBuild
    ? `, ${scannedBuild} built file(s)`
    : ' (no build output present - run the frontend build to scan what ships)';
  console.log(`check-secrets: clean (${ALL ? 'all tracked files' : 'staged files'}${built})`);
  process.exit(0);
}

if (shipped.length) {
  console.error('\n  CREDENTIAL OR PERSONAL DATA FOUND IN THE BUILD OUTPUT\n');
  for (const s of shipped) {
    console.error(`  ${s.file}`);
    console.error(`    ${s.rule.name}  (${s.sample}...)`);
    console.error(`    ${s.rule.why}\n`);
  }
  console.error('  This is what the browser receives. Anything here is public.\n');
  if (findings.length === 0) process.exit(1);
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
