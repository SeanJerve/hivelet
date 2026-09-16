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
 *
 * WHAT IT MISSED UNTIL 2026-09-16
 * ------------------------------
 * The original matcher was anchored `^await db`, so it only ever saw the form
 * where the result is thrown away without being named. This passed it:
 *
 *     const result = await db.from('bills').update({ status: 'Due' });
 *     // ... and `result` is never looked at again
 *
 * That is the same silent write wearing a variable name, and it is the harder
 * one to spot by eye, because the line looks like it is doing something with the
 * outcome. Proved by deliberately deleting a live `warnIfWriteFailed` call: the
 * suite still reported ALL CHECKS PASSED.
 *
 * Three shapes now fail:
 *   1. `await db...` with the result discarded outright
 *   2. `const { data } = await db...` - destructured, but not `error`
 *   3. `const r = await db...` where `r.error` is never read and `r` is never
 *      handed to assertWritten / warnIfWriteFailed
 *
 * A sweep at the time of this change found 0 of all three: 43 writes destructure
 * `error`, 24 go through a helper, 1 is captured and examined.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');

const WRITE = /\.(insert|update|delete|upsert)\s*\(/;
/** `await db...`, or `const x = await db...` / `const { a, b } = await db...`. */
const DB_AWAIT = /^(?:(?:const|let)\s+(\{[^}]*\}|[A-Za-z0-9_$]+)\s*=\s*)?await\s+db\b/;
const WRAPPED = /(assertWritten|warnIfWriteFailed)\s*\(/;
/** How far ahead to look for the captured result being examined. */
const EXAMINE_WINDOW = 40;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** A single backslash, kept out of the template literals below for legibility. */
const BS = String.fromCharCode(92);

const findings = [];

for (const file of walk(SRC).sort()) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, i) => {
    const bind = DB_AWAIT.exec(line.trim());
    if (!bind) return;

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

    const target = bind[1];
    let why;

    if (!target) {
      why = 'result discarded';
    } else if (target.startsWith('{')) {
      // Destructured. `error` must be among what was taken.
      if (/\berror\b/.test(target)) return;
      why = 'destructured ' + target.replace(/\s+/g, ' ') + ' - `error` not taken';
    } else {
      // Captured under a name. It has to be examined for this to mean anything.
      const rest = lines.slice(i + 1, i + 1 + EXAMINE_WINDOW).join('\n');
      const reads = new RegExp(BS + 'b' + target + BS + 's*' + BS + '.' + BS + 's*error' + BS + 'b');
      const hands = new RegExp(
        '(assertWritten|warnIfWriteFailed)' + BS + 's*' + BS + '(' + BS + 's*' + target + BS + 'b'
      );
      if (reads.test(rest) || hands.test(rest)) return;
      why = 'captured as `' + target + '` and never examined';
    }

    const op = WRITE.exec(stmt)[1];
    const table = /\.from\(\s*['"]([^'"]+)/.exec(stmt);
    findings.push({
      file: path.relative(root, file).replace(/\\/g, '/'),
      line: i + 1,
      op,
      table: table ? table[1] : '?',
      why,
    });
  });
}

console.log('SILENT WRITES - every database write must declare what failure means\n');

if (findings.length === 0) {
  console.log('  OK    every write declares what failure means');
  console.log('        (discarded, destructured without `error`, and captured-but-');
  console.log('         never-examined results all fail this check)');
  console.log('\nALL CHECKS PASSED');
  process.exit(0);
}

for (const f of findings) {
  console.log(`  FAIL  ${f.file}:${f.line}  ${f.op} on ${f.table} - ${f.why}`);
}
console.log(
  `\n${findings.length} write(s) do not say what failure means.\n` +
    'Destructure `error`, or pass the call through assertWritten / warnIfWriteFailed\n' +
    '(src/utils/checkedWrite.ts) so the intent on failure is explicit.'
);
process.exit(1);
