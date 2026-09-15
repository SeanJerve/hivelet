# AUDIT JUDGEMENT LOG

**For:** whoever picks this project up next — most likely Claude in a new session.
**Written:** 2026-09-15, at the end of the Iteration 2 audit.
**Read this after `CONTINUE_HERE.md`, not instead of it.**

---

## Why this document exists

`CONTINUE_HERE.md` records **what is true**. The business rule crosswalk records
**what holds and where**. The migrations record **what changed**.

None of them record **why a judgement went one way rather than the other**, and
that is the part that does not survive a new session. A reader can see that
BR-033 now derives the rent period; they cannot see that a supplied value is
still honoured *on purpose*, and would reasonably "fix" that by rejecting it.

So this is the reasoning. It is not a summary of the work — it is the set of
decisions a fresh reader would otherwise have to re-derive or, worse, silently
reverse.

---

## 1. The one thing to internalise

**Eight business rules were recorded wrongly. Six of those eight had taken their
evidence from `database/FULL_DATABASE_SCHEMA.sql`.**

That file does not describe this database. It has been wrong about the property
area type, about which indexes exist, about generated columns, about foreign key
actions. Every one of those errors led somewhere: a rule marked blocked that was
already enforced, a rule marked unguarded that had a unique index protecting it,
a "defect" about `0.00` that was repeated across nine documents and logged as two
violations that never existed.

The project's rule 2 says to trust `database/live_schema.csv` instead. **On
2026-09-14 that file was wrong too** — it rendered both `GENERATED ALWAYS`
columns as ordinary `DEFAULT` expressions, which is precisely the misreading
behind the `0.00` story. It is corrected now, and `database/README.md` carries
the query to regenerate it.

**So the actual rule is narrower than rule 2 as written:** ask the catalogue.
`information_schema`, `pg_index`, `pg_constraint`, `pg_trigger`, through the
Supabase MCP. Documents are a hypothesis; the catalogue is the answer.

A concrete instance worth copying: the register said BR-026's active-relationship
half was unguarded, citing `idx_room_assignments_room_active` as a plain index.
It is. But the catalogue also holds
`idx_single_active_assignment_per_room` — `UNIQUE (room_id) WHERE is_active =
true` — which makes the thing impossible rather than unlikely. The register had
read the wrong index and nobody had looked.

---

## 2. Defect classes that paid off, and how to run them again

Four sweeps found far more than rule-by-rule reading did. Each is worth repeating
after any significant feature work.

| Sweep | What it looks for | Found |
| :--- | :--- | :--- |
| **Silent writes** | `await db.from(...).update(...)` with no `error` destructured | **23**. One left a *rejected* payment's bill reading Paid; one meant account lockout never engaged. Now guarded by `npm run check:writes` |
| **Swallowed errors** | `catch {}` and `.catch(() => {})` | 15, of which most were deliberate and **one was serious**: a failed load rendered "All Remittances Verified" |
| **Fabricated data** | Invented values presented as real | The ticket replies signed in the owner's name, `DEMO_TENANT`, `PAYMENT_HISTORY`, an auto-assigned plumber |
| **Hardcoded business constants** | Peso amounts, rates and dates in source | The water rate (third and fourth time), `CURRENT_YEAR = 2026`, a 242,000 forecast fallback, LF quoted at ₱200 when it is ₱400 |

Two observations about running them:

**Most hits are fine.** In the swallowed-error sweep, 14 of 15 were correct and
documented. The value is not in the count — it is in reading each one and asking
what the screen says when it fires. Do not mass-fix a sweep's output.

**The dangerous ones are silent by construction.** Not one of the eight
correctness defects produced an error a user would see. Cash was collected and
confirmed with nothing written. A partial payment was recorded and the debt left
standing. A security check reported green while testing nothing. That is the
argument for automated verification, stated better than any principle.

### A fifth sweep worth doing, not yet done

**Empty versus unknown, across every view.** Two instances were fixed — the
verification queue and the dashboard's pending figure. The pattern is: a fetch
fails, state stays at its initial value, and a zero or an empty list renders as a
*fact*. `AdminOverviewView`, `CategoryRoomsView` and `TenantPortalView` all have
silent catches around fetches that feed figures. They were judged lower
consequence and left. They are still worth reading.

---

## 3. Judgement calls a fresh reader might reverse

These are deliberate. Changing them is allowed — but do it knowingly.

### 3.1 Derive by default, let the human disagree, record that they did

**BR-033** (rent period), **BR-034** (occupant count) and **BR-039** (advance
rent) all follow one posture: the system computes the correct value, pre-fills it,
**accepts a different one**, and writes the divergence to the audit log with both
figures.

Why not just reject the divergent value? Because the owner has reasons the system
does not know. 937 rows were migrated with periods from her own book. A tenant may
genuinely have agreed a different advance rent. A roommate may have left before
the tenancy was updated. **Refusing her figure would make the system wrong more
often than she is.** BR-036 takes the same posture on a mismatched water entry —
warn and record, never quietly overwrite the human.

If you tighten any of these into a hard rejection, you will break real entry.

### 3.2 Two ways to handle a failed write, chosen per site

`src/utils/checkedWrite.ts` has `assertWritten` (throw) and `warnIfWriteFailed`
(log and continue). The split is not stylistic:

- A notification insert that fails **after a settlement has committed** must not
  throw. Throwing reports a successful payment as an error and invites the
  administrator to record it a second time.
- `registerFailedAttempt` warns rather than throws because it runs inside the
  failed-login path: a 500 there would break the "invalid credentials" response
  *and* hand a caller a way to distinguish a real account from a missing one.
- The inquiry thread seed warns because `inquiries.message` is `NOT NULL` and
  already holds the text — a failure costs the thread view, not the message.

`check:writes` enforces that a choice was made. It does not enforce which.

### 3.3 Open client decisions are shown, never guessed

Three decisions surfaced while building the Excel exports. All three are printed
on the sheet rather than resolved:

- **OD-01** — the workbook emits per-month grand subtotals **and** a year-to-date
  line, each labelled, with a note that which belongs at the foot of the page is
  still open. Picking one would invent her answer; omitting both would drop a
  figure she uses.
- **OD-07** — the category cumulative accumulates within the exported year and
  says so. This is the one question keeping **BR-046** unenforced.
- **OD-06** — dates follow her spreadsheet's `D-MMM-YY` rather than the
  `DD/MM/YYYY` described verbally, noted on the sheet.

**Do not close these in code.** They close in a conversation with Mrs. Da Silva.

### 3.4 Nothing was written to production to test anything

Every probe against the live database either **fails by design** (a rejected
write persists nothing) or **is reverted and verified reverted**:

- The `1e999` poisoning probes in `check:api` post real requests. A refused
  request writes nothing, and row counts were confirmed unchanged afterwards. If
  one were ever *accepted*, the suite says so rather than leaving a poisoned row
  for someone to find in a report months later.
- The migration `020` trigger probe changes a rate and changes it back inside one
  transaction, then asserts the history rows it created are gone.
- The rate-change end-to-end test raised unit 1a 4,500 → 5,000 and back, then
  deleted both history rows and confirmed 0 rows, 33 rooms, ₱181,700 total rent.

**Do not seed test data into this database.** `audit_logs` is append-only —
2,104 of its rows are permanent litter from a bug already fixed. Anything you
write there stays.

### 3.5 Linda is excluded from grand totals on purpose

LF and LB bill on fixed charges and their money is **remitted directly to Linda**,
not pooled. Every grand subtotal excludes them; they get their own section and
their own year line. A "total" that quietly omitted a section would be the kind
someone reconciles against and cannot make balance.

Their retired electricity charge (migration `017`) still shows for historical
months. Those rows are real money already collected. Only new records omit it.

### 3.6 Bills are raised on demand, and that is correct

There is no scheduled bill generator, and BR-010 is still Enforced. Derivation is
right in both bill-creating paths. Collection happens **in person**, so a nightly
generator would raise bills for tenants the owner has already been paid by.
"Overdue" is derived on read for the same reason.

If you add a scheduler, you are changing how this business works, not fixing a gap.

---

## 4. Traps that cost real time

**Generated columns.** `fifty_percent_share` and `remitted_amount` are
`GENERATED ALWAYS AS ... STORED`. PostgreSQL **rejects any write naming them**.
Never add them to an INSERT. A previous traceability matrix proposed exactly that
and it would have broken every income write.

**`'Open'` is a frontend alias for the database's `'Submitted'`.**
`ticket_status_type` has four values and `'Open'` is not one of them; the backend
translates. Two tracker stages were keyed to statuses that could never arrive, so
they were permanently unreachable — one of them claiming the owner had reviewed a
request.

**Bash heredocs in this environment eat backslashes.** `'\\n'` inside a
`<<'EOF'` heredoc arrives as a literal newline and will break a JS or Python
string. This cost several rounds. Use the Write tool for anything containing
escapes, or `chr(92)`.

**A Python script that asserts at the end discards everything.** If you build up
a string, assert, then write at the end, a failing assertion throws away all the
successful edits too. Write incrementally or accept the retry.

**`git checkout --` discards uncommitted work.** I reverted a test edit this way
and lost an hour of uncommitted crosswalk corrections. Test destructive things on
a **copy**; `scripts/check-br-crosswalk.mjs` takes an optional path argument for
exactly this reason.

**`admin.ts` is ~2,600 lines** and line numbers in older documents are stale.
Anchor edits on surrounding text, never on a line number from a document.

---

## 5. What is left, and why

| | Item | Why it is still open |
| :-- | :--- | :--- |
| 1 | **OD-07** and eight other client decisions | A conversation with Mrs. Da Silva, not code. OD-07 alone keeps BR-046 unenforced. They should be gathered into **one** consultation |
| 2 | **Adyen webhook, end to end** | Needs a tunnel and someone watching. The webhook is the sole writer, so if it is not working, online payments silently never record |
| 3 | **Service extraction** | 137 of 173 database calls sit in route handlers. The architecture's stated target; not required for the defense |
| 4 | **BR-020** | Would need a `room_id` on expense allocations, and her own workbook allocates by Property Area, not by room. Arguably out of scope rather than unfinished |
| 5 | **BR-025** | Waits on OD-04 — deposit disposition on move-out |
| 6 | **Team roles disagree across documents** | Repository says Sean is System Architect / Full-Stack and Loyd is Database Administrator; the presentation script says Sean is DBA. Eljohn and Vince have no role recorded. **The team's to settle, not Claude's** |
| ~~7~~ | ~~**The four remaining Supabase secret keys**~~ | **Closed.** `loyd` rotated 2026-09-14; `eljohn`, `kiel` and `bins` deleted 2026-09-15 |

**Four rules are Partial and each is a decision, not an omission** — see §3.6 and
the crosswalk rows. Do not treat the count as a backlog.

---

## 6. How to work on this project

Distilled from what actually worked over the audit.

1. **Check the catalogue before you believe a document.** Including this one.
2. **Verify against live data, then say what you verified.** Every fix in this
   audit names the figures it was checked against. "It typechecks" is not
   verification — one regression got through tsc and was caught only in a browser
   pass.
3. **Run the suites before and after.** Seven of them, listed in
   `CONTINUE_HERE.md` §2. They exist because this codebase's defects are silent.
4. **Make the fix impossible to undo by accident.** Where an invariant must hold
   regardless of the caller, put it in the database — that is why `020` is a
   trigger and not a service method. Three migrations (`010`, `018`, `019`) exist
   solely because the client library cannot open a transaction.
5. **Write the reasoning down as you go.** Every commit message here explains the
   failure mode, not just the change. That is what made this document short.
6. **Do not invent a value to fill a gap.** This project has been bitten four
   times by exactly that — OR numbers, emergency contacts, ticket replies, a
   forecast. Where there is no basis, show nothing and say why.
