/**
 * Fails if any database write in `backend/src` discards its result.
 *
 * Run with `npm run check:writes` from `backend/`. Reads source only; touches
 * neither the database nor the network.
 *
 * WHY THIS EXISTS
 * ---------------
 * supabase-js does not throw. Every call resolves to `{ data, error }`, so
 *
 *     await db.from('bills').update({ status: 'Due' }).eq('id', billId);
 *
 * is indistinguishable from success at the call site. `await` resolves, the
 * handler continues, and the response reports that the operation worked.
 *
 * A sweep on 2026-09-14 found **23** writes in exactly that shape, and the
 * consequences were not academic:
 *
 *   - The revert above runs when an administrator REJECTS a payment. Failing
 *     silently left the payment declined and the bill still reading Paid: money
 *     not collected, debt closed, nobody chasing it.
 *   - The vacate path closed a tenancy without checking. The tenant could be
 *     marked inactive while still holding an active assignment, so the unit
 *     never freed and the next assignment to it failed on a unique index much
 *     later, nowhere near the cause.
 *   - `registerFailedAttempt` writes the lockout counter. While that write is
 *     failing, lockout never engages and an account is open to unlimited
 *     guessing — the one failure nobody would ever notice.
 *
 * Every write must therefore declare what it wants to happen on failure, by
 * destructuring `error`, or by passing through `assertWritten` (fail loudly) or
 * `warnIfWriteFailed` (log and continue, for a write secondary to one that has
 * already committed). See `src/utils/checkedWrite.ts`.
 *
 * This check does not judge WHICH of the three is right — that is a decision per
 * call site. It only insists that one of them was made.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');

const WRITE = /\.(insert|update|delete|upsert)\s*\(/;
const BARE_AWAIT = /^await\s+db\b/;
const WRAPPED = /(assertWritten|warnIfWriteFailed)\s*\(/;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const findings = [];

for (const file of walk(SRC).sort()) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    if (!BARE_AWAIT.test(line.trim())) return;

    // Already handed to a checked helper on the line above?
    for (let k = i - 1; k >= 0 && k >= i - 2; k--) {
      if (!lines[k].trim()) continue;
      if (WRAPPED.test(lines[k])) return;
      break;
    }

    // Collect the statement, up to the first line ending in a semicolon.
    const chunk = [];
    for (let j = i; j < Math.min(i + 30, lines.length); j++) {
      chunk.push(lines[j]);
      if (lines[j].trimEnd().endsWith(';')) break;
    }
    const stmt = chunk.join('\n');
    if (!WRITE.test(stmt)) return;

    const op = WRITE.exec(stmt)[1];
    const table = /\.from\(\s*['"]([^'"]+)/.exec(stmt);
    findings.push({
      file: path.relative(root, file).replace(/\\/g, '/'),
      line: i + 1,
      op,
      table: table ? table[1] : '?',
    });
  });
}

console.log('SILENT WRITES - every database write must declare what failure means\n');

if (findings.length === 0) {
  console.log('  OK    no write discards its result');
  console.log('\nALL CHECKS PASSED');
  process.exit(0);
}

for (const f of findings) {
  console.log(`  FAIL  ${f.file}:${f.line}  ${f.op} on ${f.table} - result discarded`);
}
console.log(
  `\n${findings.length} write(s) discard their result.\n` +
    'Destructure `error`, or pass the call through assertWritten / warnIfWriteFailed\n' +
    '(src/utils/checkedWrite.ts) so the intent on failure is explicit.'
);
process.exit(1);
