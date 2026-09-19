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

/**
 * THE SAME SHAPE, ON THE READ SIDE.
 *
 * `const { data: room } = await db.from('rooms')...` with `error` left behind is
 * the write defect's twin: on a failed query `room` is `undefined`, which is
 * exactly what "no such row" looks like. The call site cannot tell a broken
 * request from an empty result, and every one of these sits in front of a
 * decision.
 *
 * A sweep on 2026-09-19 found 21 of them and eight were acting on the answer:
 * the duplicate-income guard wrote the same receipt into the ledger twice, the
 * unpaid-bill lookup raised a second bill for a period already billed, the unit
 * code behind the water model fell to '' and billed a Linda fixed-charge unit
 * per occupant, the occupant count fell to 1, vacate never freed the unit, and
 * the webhook attached a payment to nobody. Those eight are fixed.
 *
 * The remaining 13 are counted, not failed. Unlike a write, a read that
 * discards its error is often harmless or actively safe - `tenant.ts` checks
 * ticket ownership this way and a failed read yields 404, which is the correct
 * answer to give. Failing all of them would force `error` to be taken thirteen
 * times where it changes nothing, and a check that demands meaningless edits
 * gets silenced.
 *
 * So this is a ratchet. The census may fall freely; it may not rise. A new one
 * is a new decision made against an answer nobody checked, and it has to be
 * argued for by lowering the number here on purpose.
 */
const BARE_READ_BASELINE = 13;

let readsExamined = 0;
let readsTakingError = 0;
const bareReads = [];

/**
 * WHAT THIS CHECK ACTUALLY EXAMINED, AND A REFUSAL TO PASS ON NOTHING.
 *
 * Proved on 2026-09-17 by copying this script somewhere `../src` was an empty
 * directory. It scanned **zero files** and printed:
 *
 *     OK    every write declares what failure means
 *     ALL CHECKS PASSED                                     (exit 0)
 *
 * That is the worst failure a check can have. It guards every database write in
 * the system, and it was capable of reporting them all safe while having read
 * none of them - if `src` were renamed, moved, or the walk broke on a future
 * Node, nothing would have said so.
 *
 * The floor is `> 0` rather than a number. A hardcoded "at least 30 files" is
 * itself a claim with a date on it, and this project has been bitten four times
 * today by exactly that. The COUNT is printed instead, so a drop from 32 to 3 is
 * visible to a person even though it is legal to the machine.
 */
const scanned = walk(SRC).sort();

if (scanned.length === 0) {
  console.log('SILENT WRITES - every database write must declare what failure means\n');
  console.log(`  FAIL  no source files found under ${path.relative(root, SRC)}`);
  console.log('        This check examined NOTHING, so it proves nothing. Either the');
  console.log('        directory moved, or the walk is broken. It is not a pass.');
  process.exit(1);
}

for (const file of scanned) {
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

    // Not a write. It is still a database call whose failure is invisible, so
    // it goes to the read census below rather than being ignored.
    if (!WRITE.test(stmt)) {
      if (/\.rpc\s*\(/.test(stmt)) return;
      readsExamined++;
      const rTarget = bind[1];
      if (!rTarget || !rTarget.startsWith('{')) return;
      if (/\berror\b/.test(rTarget)) {
        readsTakingError++;
        return;
      }
      const rTable = /\.from\(\s*['"]([^'"]+)/.exec(stmt);
      bareReads.push({
        file: path.relative(root, file).replace(/\\/g, '/'),
        line: i + 1,
        table: rTable ? rTable[1] : '?',
        shape: rTarget.replace(/\s+/g, ' '),
      });
      return;
    }

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
  console.log(`  OK    every write declares what failure means (${scanned.length} source files read)`);
  console.log('        (discarded, destructured without `error`, and captured-but-');
  console.log('         never-examined results all fail this check)');
} else {
  for (const f of findings) {
    console.log(`  FAIL  ${f.file}:${f.line}  ${f.op} on ${f.table} - ${f.why}`);
  }
  console.log(
    `\n${findings.length} write(s) do not say what failure means.\n` +
      'Destructure `error`, or pass the call through assertWritten / warnIfWriteFailed\n' +
      '(src/utils/checkedWrite.ts) so the intent on failure is explicit.'
  );
}

console.log('\nREAD CENSUS - a failed query must not read as an empty result\n');
console.log(
  `  ${readsExamined} read(s) examined, ${readsTakingError} take \`error\`, ` +
    `${bareReads.length} do not (ratchet: ${BARE_READ_BASELINE})`
);

const readsOverBudget = bareReads.length > BARE_READ_BASELINE;

if (bareReads.length > 0) {
  for (const r of bareReads) {
    console.log(`  ${readsOverBudget ? 'FAIL' : 'note'}  ${r.file}:${r.line}  ${r.table} - ${r.shape}`);
  }
}

if (readsOverBudget) {
  console.log(
    `\nThe census rose from ${BARE_READ_BASELINE} to ${bareReads.length}.\n` +
      'A read that discards `error` cannot tell a broken query from an empty\n' +
      'result, so whatever it decides next is decided on an answer nobody\n' +
      'checked. Destructure `error` and say what failure means - or, if this one\n' +
      'genuinely fails closed, lower BARE_READ_BASELINE deliberately and say why.'
  );
} else if (bareReads.length < BARE_READ_BASELINE) {
  console.log(
    `\n  note: down from ${BARE_READ_BASELINE}. Lower BARE_READ_BASELINE to ` +
      `${bareReads.length} to keep the ratchet tight.`
  );
}

if (findings.length > 0 || readsOverBudget) process.exit(1);

console.log('\nALL CHECKS PASSED');
process.exit(0);
