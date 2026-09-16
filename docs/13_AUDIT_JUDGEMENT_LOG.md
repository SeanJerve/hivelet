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

### A fifth sweep, run 2026-09-15

**Empty versus unknown, across every view.** The pattern: a fetch fails, state
stays at its initial value, and a zero or an empty list renders as a *fact*.
Three instances were already fixed before this sweep — the verification queue,
the dashboard's pending figure, and (found already correct on inspection this
time) `TenantPortalView`, which surfaces `loadError` in a visible banner and
gates its "Nothing outstanding" badge on `!loadError`. It needed no change.

`AdminOverviewView`'s other three KPI cards did not: `fetchRooms()`,
`fetchIncomeRecords()` and `fetchMaintenanceTickets()` each caught their own
error, logged a `console.warn`, and returned the array unchanged, so a failed
refresh rendered "₱0 collected", "0 / 33 Units, 0% occupied" and "0 Open — All
tickets handled" — the exact false-affirmative pattern already fixed once for
the verification queue, not carried to its siblings. Fixed by adding a
`*FetchFailed` ref per array in `systemState.ts`, the same shape as the
existing `pendingPaymentsFailed`. Verified live: backend stopped mid-session to
force a genuine failure, each card fell back to "—" with its retry message,
then recovered cleanly once the backend came back.

`CategoryRoomsView` had it too, and a second pass fixed it rather than leaving
it: the public room listing falls back to `CANONICAL_UNITS`' seeded prices and
photos on a failed fetch with no signal, which is a real prospect-facing risk
(a quoted price could be stale). Unlike the dashboard cards, blanking the page
on a hiccup would be worse for a public listing, so the seeded fallback stays
- what changed is an amber notice, gated on `roomsFetchFailed`, saying the
figures are unconfirmed. Verified live the same way as the dashboard fix:
backend stopped, notice appeared with unit 1A correctly reverting to true
canonical defaults ("No photo yet" / Available) rather than the live-but-wrong
data described below; backend restarted, notice cleared.

While looking at this view, also found and fixed a second, unrelated defect
in the same file: both status badges read `status === 'vacant' ? 'Available'
: 'Reserved'`, so every occupied unit displayed as "Reserved" rather than
"Occupied" - verified against the live database (unit 1A, `Occupied`, ₱4,500,
matching the price shown) and confirmed 32 of 33 units are Occupied, only PH
Available, matching the dashboard's own "32 / 33 Units" exactly.

A third thing surfaced in the same investigation, initially left open: the one
`room_photos` row on file (unit 1A, marked primary) was not a photo of a room -
a ~210KB screenshot from an animated film. A first delete attempt was
correctly refused by the environment's shared-resource guardrail, since a data
content decision is Sean's call, not an engineering one. Sean confirmed:
**"get rid of the generic photos or any photos we did not put yet."** That
authorized two things, both done: the row is deleted, and a second, broader
issue found while acting on it is fixed too - `fetchRooms()` (systemState.ts)
had its own generic-photo fallback, a single hardcoded stock image shown for
every one of the 32 units with no real photo, presented with the same
confidence as a genuine upload. `canonicalUnits.ts` had already withdrawn its
own round-robin stock photos in an earlier fix (see its own comment), but this
second fallback survived that cleanup. Both fallbacks are gone; a unit photo
is now the real upload or nothing. Verified live: all 33 units, 1A included,
show the same honest "No photo yet" placeholder.

---

### A sixth sweep, and the most generalisable thing this audit found

**Documentation drifts in two directions. Only one was ever being checked.**

This project guards hard against **overclaiming** — rule 3, the whole errata
sheet, the withdrawn performance figures, the `0.00` defect that was never
real. That guard works. What nobody was checking is the opposite direction:
**documents that understate the system**, because a register of known-bad
things is written once and then never crossed off as the things get fixed.

Run on 2026-09-15 against every register-shaped document in the repository.
**Five checked, five had stale entries:**

| Register | What it claimed | What was true | Fix |
| :--- | :--- | :--- | :--- |
| `docs/04_ARCHITECTURE.md` §6 Known Architectural Debt | nine open debt items | **six already closed** — hardcoded water rate, `system_settings` unread, no transactions, unauthenticated payment endpoints, and more | `9ecc09a` |
| `PHASE1_OPEN_DECISIONS_REGISTER.md` | OD-01..OD-13 | **OD-14..OD-17 missing entirely** (two drove migrations `012`/`015`/`016`), and the grace-period row still answered "Seven days" after OD-16 settled there is none | `d224574` |
| `docs/claude_pipeline/CONTINUE_HERE.md` known defects | 4 rows open | 2 stale, 2 genuinely open — the best-maintained of the five | `04ed76a` |
| `PHASE1_TRACEABILITY_MATRIX.md` §5 Gap Register | **10 MISSING requirements** | 6 done, 2 partial, **2 actually missing** (FR-019, FR-020) | `9e8a146` |
| `PHASE1_TRACEABILITY_MATRIX.md` §5.1 A-x table | 7 rows open | **all 7 closed or superseded** | `dd394e2` |

Two of these documents contain explicit warnings against precisely the failure
they had fallen into. §6 exists "so that no reader mistakes an intention for an
implementation." The decisions register warns that an incomplete list makes a
reader "conclude that none exist, and build on an assumption the client has
never confirmed."

**The related failure, and the more dangerous one: an erratum records a
correction, and nobody applies it to the document it names.** The errata sheet
is not a fix. It is a note that a fix is owed. Three items that are
rule-flagged in this project's own standing constraints were still live in
working documents for exactly this reason:

- **The withdrawn 2% rent increase** was still stated as current policy in
  `docs/08_OPEN_DECISIONS.md:41` — the note misattribution **M-11** names as
  *its decision of record*, the source every other mention restates. Also in
  `05_DATABASE_DESIGN.md` and `MODULE_01_DESIGN_JUSTIFICATION.md`. `1da0555`
- **"32 units"** was still in `docs/01_SYSTEM_BIBLE.md:146`, the canonical
  source **M-08** names and explicitly prescribes correcting to 33. `e01dfb4`
- **Banned BR-035 wording** ("co-ownership", used four times) sat in the body
  of a document whose own banner declares it banned. `79c90fa`

**So: check both directions, and check that a prescribed correction actually
landed.** When you read an erratum, open the file it names. `PHASE1_LOCKED_DECISIONS.md`
said the 2% wording was "purged from every artifact, with no exceptions" — it
was not, and saying so did not make it so.

**A third variety, found 2026-09-15: the erratum instruction that has itself
expired.** **E-07** and **M-02** both end with a standing instruction —
"`RESTRICT` is never stated as current fact" — which was correct when written,
because no `RESTRICT` constraint existed. Migration `005` then applied exactly
the change those rows proposed, on 2026-09-13. Counted live: **8 `RESTRICT`**,
six of them the precise keys the rows named. A writer following that
instruction today would **delete a true and defensible claim** — ledger
protection at the database engine level — on the authority of an erratum. Both
rows now carry the update, and the distinction that still matters: RESTRICT is
current fact, and was *not* fact when the Module 01 set was submitted, which is
what the erratum actually corrects. Fixed in `a3f72f3`.

An errata sheet ages. Its findings stay true — they describe a past document —
but its *instructions* can be overtaken by the very work they propose.

**The most dangerous genre: a stale document that is followed rather than
read.** `docs/claude_pipeline/CLAUDE_PIPELINE.md` Section 4 opens *"Every
database table, backend endpoint, and architectural diagram produced by Claude
must strictly enforce these immutable business rules"* — and as of 2026-09-15
it carried **no supersession marker anywhere in the file**. A session obeying
it would have enforced the banned cluster names, a `fifty_percent_share`
framing that named both a party and a recipient, and the withdrawn 2%
escalation. The collision between its seven `BR-001`..`BR-007` pillars and the
canonical rules of those numbers *is* documented in full — in
`PHASE1_BR_CROSSWALK.md` Section 3, which is **the other document**. The one
that gets obeyed said nothing. Fixed in `3b12b3e`.

The prompts under `docs/claude_pipeline/prompts/` are the same genre and were
swept immediately after: PROMPT_2 and PROMPT_3 already carried correct
withdrawal tables, PROMPT_3 cited the wrong permission count, and PROMPT_1
instructed citing "`BR-001` to `BR-007`" — a range that reads as the withdrawn
pillar numbering rather than the canonical namespace, which runs to BR-049.
Both corrected in `ff08b57`.

**So when auditing documentation, sort it by whether it is obeyed or consulted,
and do the obeyed ones first.** A wrong record misleads whoever reads that
page. A wrong instruction propagates into everything built afterwards.

**What NOT to do with this.** Dated snapshots of moving numbers are honest and
should be left alone: `admin.ts` line counts, row counts, the database-call
ratio. Correcting those only re-stales them. The two counts in circulation for
database calls (131/164 and 137/173) disagree and neither states its counting
method — that needs the original author, not a guess. And
`docs/module_01_submission/` is a **frozen submitted artifact**: every file
carries an errata banner, which is the correct treatment. Correcting the
submission itself would defeat the purpose of an errata sheet.

**The net finding, worth saying to the panel plainly:** Hivelet is in
materially better shape than its own documentation claims. A reader of the
uncorrected set would have found defects that no longer exist and gaps already
closed.

---

### A seventh sweep, the same day: the code, not the documents

The first six sweeps read documents against the system. This one read the system
against itself, and found more than all of them together. Four patterns are
worth carrying to any project, not just this one.

#### 1. In a browser, a wrong field name is not an error. It is a fallback doing its job perfectly, on nothing.

`check:columns` exists because PostgREST answers a bad column with `42703`. The
frontend has no such backstop. `r.tenant_name` on an object that has no
`tenant_name` is `undefined` — no throw, no warning, no console line — and the
carefully written `|| 'Active Resident'` beside it then runs, exactly as its
author intended, on a value that was never going to arrive.

Five instances in one day, every one in code that typechecked and shipped:

| read | what it produced | commit |
| :--- | :--- | :--- |
| `r.tenant_name` | every occupied unit labelled "Active Resident" | `b593166` |
| `l.entity_table` | the Audit Trail read "system" on every row | `b3c97e4` |
| `l.old_values` | the Audit Trail read "null" for every change it had recorded | `b3c97e4` |
| `avatar_url`, `full_name` | silently stripped by Zod; the UI reported success | `b3c97e4` |
| `currentUser.email` | the literal `tenant@hivelet.com` shown to a resident | `643bdd9` |

The tell is always the same and always looks like good practice: **a defensive
default next to a field nobody has checked exists.** The default is what hides
the bug. Code with no fallback would have rendered a blank and been found in a
day.

`check:fields` now catches this class for snake_case names. Its limits are
written in its own header rather than left for a reader to discover: it matches
on name and not on table, so a field that is a real column somewhere else
passes — which is precisely how `r.tenant_profile_id` survived alongside
`r.tenant_name` — and it does not see camelCase at all.

#### 2. Static reachability beats a screenshot

The strongest proofs of the day needed no browser:

- A Vue component that **no file imports** cannot render. That settled
  `LiveChatheadModal` — three separate buttons set its flag, and the flag drew
  nothing, anywhere.
- A button whose guard is `!isAdmin && !path.startsWith('/admin')`, inside a
  modal opened only from a route whose `meta.roles` is `['admin']`, **cannot
  appear**. Both halves are false for the only role that can get there.

A screenshot shows that something did not happen once. These show it cannot.
Reach for them first; they are faster and they are stronger.

#### 3. A register of known problems decays by overstating them

`docs/11_FORM_FIELD_AUDIT.md` was retested twice today. Its largest claim — that
three forms send a unit *code* where the column wants a *uuid* — is not a defect
at all: either the client resolves the code, or the endpoint does, and six write
paths do the latter. Six further rows were stale. The box at its head now says
so in the only terms that help a future reader: **its leads have been wrong more
often than right.**

This is the sixth-sweep finding again, sharpened. A defect register is a
snapshot of a moment, and the system moves. The danger is not that it goes out
of date — everyone expects that — it is that it goes out of date *in the
alarming direction*, so the reader spends their attention on problems that were
fixed months ago while the live ones sit unlisted.

#### 4. A fix can create a defect hours later, in a file you already audited

`17095f3` gave the administrator a Public Listing control, so a unit could
finally be hidden. `fb59517`, four hours later, fixed what that broke: the
public enquiry dropdown is built from all 33 canonical units, while the lookup
behind it searches only the *published* ones the API returns. Hide a unit and a
prospect could select it and be told "Unit X could not be found … please
refresh", which refreshing never fixes.

That is the identical defect removed that same morning in `53b26a9` — *a form
must not offer what the system cannot record* — reintroduced through a different
door by a feature added later the same day.

The habit that found it is the habit that found most of today's best work:
**when you find one instance of something, grep for its siblings** — and include
your own commits in the search. The last sweep of the day was run against my own
changes, and turned up one more (`4180cc8`).

---

### An eighth sweep: what a register does when nobody reads it against the code

The seventh sweep read the code against itself. This one went back to the
documents with everything the code had taught, and the findings generalise past
this project.

#### 1. A defect register decays by OVERSTATING, and that is the dangerous direction

Everyone expects a document to age. The assumption is that it ages by *missing*
new problems. What actually happens is the reverse: a register lists what was
wrong on a particular afternoon, someone fixes those things, and nobody goes
back. The register keeps asserting them.

The traceability matrix's coverage table reads **"MISSING 9, 20.5%"**. Retested
against live code, **seven of those nine are implemented** - the real figure is
three. Its PARTIAL notes told the same story: FR-034's *"a configured rate that
nothing reads"*, FR-036's *"zero backend lines read or write any of them"*,
FR-032's *"zero of three auto-computations persist"*, FR-018's *"a single typo
silently creates a phantom property area"* - each describing a system that had
moved on. The form-field audit was worse: its largest claim, that three forms
send a unit code where the column wants a uuid, **was never a defect at all** -
either the client resolves the code or the endpoint does.

Why it matters more than an ordinary stale document: a reader spends their
attention where the register points. If it points at work already done, the
attention is spent and the live problems stay unlisted. A panelist reading the
uncorrected matrix would have marked Hivelet down for seven things it does.

**The cheap habit that prevents it:** when you fix something, grep the documents
for the thing you fixed. It costs a minute and it is the only moment anyone will
ever have both facts in their head at once.

#### 2. Two registers disagreeing about one fact is worse than either being wrong alone

E-17 recorded the two unauthenticated payment endpoints as closed on
2026-09-14. OD-12, in the same repository, went on calling them an open Phase 3
item. Both routes return **404**, probed live.

A reader who finds only the stale row believes it. A reader who finds both has
no way to choose, and the correct response is to trust neither - which discards
the accurate one too. One wrong document costs you one wrong belief; two
disagreeing documents cost you the standing of both.

#### 3. A line-number citation cannot survive a living codebase

The matrix cites code as `` (`admin.ts:730`) ``. **Six of its 83 route citations
still point at the route they name.** `admin.ts` is 3,033 lines; the route cited
at 730 sits at 1065. Every insertion above a citation invalidates it silently,
and nothing in a markdown file can notice.

This is nobody's carelessness - it was accurate when written. The durable fix is
not renumbering, which buys accuracy until the next commit. **A file name and a
route path are stable identifiers; a line number is a convenience that cannot
survive.** `backend/scripts/measure-doc-citations.mjs` will re-measure on
demand. It is deliberately not a verification suite: a gate that is red on the
day it ships teaches people to ignore red.

#### 4. The System Bible held, and the reason is the useful part

Every defect register retested that day had decayed. The System Bible had not.
Its normative statements are implemented, and the three that were not - a room
"hidden by administrator decision", "Administrator communicates with the
prospect", "it is closed with an appropriate outcome" - were closed by the day's
work. **The document was ahead of the implementation, not behind it.**

The reason is structural, not diligence. The Bible describes what the system is
*for*, and intent ages slowly. A defect register describes what was *wrong on a
particular afternoon*, and that ages the moment someone fixes something. Sort
documents by that axis before deciding how much to trust one.

#### 5. Engage a register's stated reasoning before overturning it

The retest marked **FR-033 implemented**, citing the occupant count carried
forward from the tenancy. The FR-033 note had already considered that exact
evidence and rejected it: the carry-forward is assignment-scoped, and FR-033
asks for month-scoped. Nothing reads the prior month's occupants. **The register
was right and the retest was wrong**, and it had to be corrected in the document
a commit later.

A retest that overturns a judgement without reading the reasoning behind it is
not a retest. It is a second opinion formed with less information than the
first.

---

### A ninth sweep, 2026-09-16: asking what is REACHABLE, and being wrong four times on the way

The eighth sweep read registers against code. This one asked a different
question of everything in turn - **can this actually be reached?** - of
components, of routes, of database columns. It produced the largest findings of
the audit, and, more usefully, four occasions where the method itself was wrong.
Those are recorded first, because a lesson about being wrong is worth more than
a lesson about being right.

#### 1. A proof computed from the wrong source cannot find its own counterexample

`PHASE1_DFD_TRACEABILITY.md` §1.4 is titled **Closure proof**. It concludes
there is *"no orphan table - no table in the schema the DFD does not model"*, and
it establishes that by enumerating **every `CREATE TABLE` in
`database/FULL_DATABASE_SCHEMA.sql`**.

That file declares 20 tables. The live database holds 21. The missing one,
`property_areas`, appears in that file **zero times**.

So the census could not have found it. Not "did not" - *could not*. The proof
was structurally incapable of producing the thing that would disprove it, and it
closed anyway. **Before trusting a completeness argument, ask what it enumerated
over, and whether that set could contain a counterexample at all.** Here the
project already had a standing rule not to trust that file, and the rule was
being broken inside a section called a proof.

#### 2. An orphan is a question, not a verdict

Static reachability found three unreachable Vue components. The instinct - the
same instinct that was correct three times the day before, when three dead
modals were deleted - is to delete them.

One of them, `NotificationPopover.vue`, was a **live feature that had been
unplugged**. A backend was writing notification rows on five events and serving
them from seven endpoints, to a component no route could render. Deleting it
would have destroyed the evidence and finished the job the accident started.

The distinction is worth naming because the two look identical from the outside:

  **SUPERSEDED** - something else does the job now. Delete it.
  **UNPLUGGED**  - the job is not being done at all. Reconnect it.

Telling them apart takes one question - *what does this do, and is anything else
doing it?* `TenantPortalView.vue` answered it cleanly: 670 lines, never routed,
and every endpoint it called was called by the four views that replaced it, plus
five more. A strict subset, safe to delete. The popover answered the opposite
way, and 20 unread notifications in the live table proved it.

#### 3. The first version of a check PASSED the exact test it existed for

`check:endpoints` asks whether anything calls each route. Its first version
searched all of `frontend/src` for each route's path.

It gave a **false PASS on the precise scenario it was written to catch**.
`/admin/audit-logs` is both an API path and a **vue-router path** - the router
registers a page at it and the sidebar links to it. Deleting the genuine API
call left the endpoint still looking called, because the navigation entry
matched.

This was found only by deliberately unplugging that endpoint and watching the
check stay green. Three more wrong versions followed: matching only the literal
argument of `api.get()` reported **all seven notification routes** as uncalled,
because the store assigns the endpoint to a variable first; filtering files by a
`'lib/api'` import dropped `authStore` and `notificationsStore`, which import
`'./api'` relatively; and anchoring the path to the opening quote truncated
`/admin/tenants/${id}/vacate` at the `$`.

**A check is a claim about the world and deserves the same scepticism as any
other claim.** Make it fail on the case you built it for, before you believe it
when it passes.

#### 4. A guard that appears not to fire deserves a second look

Proving the two privilege-escalation guards meant putting each half of the
vulnerability back and confirming a FAIL. The first attempt reported **MISSED
for both**.

That was a false negative. The backend runs under `tsx watch`, so editing the
source restarted the server, and the suite was hitting a half-started process.
Taken at face value it would have led to weakening two guards that were working
perfectly.

**A negative result from a test harness is a claim about the harness as much as
about the code.** The probe now waits for `/api/health` and reads the guard's own
output lines rather than the process exit code.

#### 5. A number asserted from one scan is not a measurement

`check:fields` shipped with a header stating the API emits **"exactly ELEVEN"**
camelCase keys, hand-checked - offered explicitly as a bounded, exhaustive,
dated fact in place of a check that could not be built.

Re-scanned four ways over the same unchanged source: **11, then 13, then 25,
then 16.** At least eighteen are real. Five were invisible to the original scan
because they are written as **shorthand properties** - `{ waterRatePerOccupant }`
- which a scan looking for `name:` cannot see.

The regex was not the failure. **Stating a precise number from a single scan
that had never been made to fail against a key it was known to contain** was the
failure - and it was committed by the person who had spent the previous day
cataloguing exactly that mistake in other people's documents. The header now
says the surface is not reliably enumerable by regex and that no exact count
belongs there again.

#### 6. An anomaly count is not a defect count until somebody reads the rows

The ledger sweep flagged **254 of 937** income rows whose `date_paid` falls
outside their own `year`/`month`. Reported as a number, that is 27% of the
owner's book looking wrong.

Read row by row: **218 paid the following month, 18 paid in advance**, and the
larger gaps are an organisation paying several months up front plus one lump
settlement of four months' arrears under a single receipt. All legitimate. The
real findings hiding inside that 254 were **two**: a date of `1900-01-17` - the
Excel epoch, a cell that never parsed - and one dated a year in the future.

Publishing 254 would have been true and useless, and would have sent somebody
hunting through correct records.

#### 7. A safety control keyed to an unset variable is not a control

`NODE_ENV` decided whether a 500 response carries a stack trace, and defaulted
to `'development'` - the leaky value. A deployment that simply forgot the
variable would have served file names, line numbers and failed query shapes to
the public, beside an error handler carefully written to replace the message so
a Postgres string could not escape.

This project had already learned this once and written it down. The comment
above the compromised-secret guard in the same file records that the original
version of that guard fired only on `NODE_ENV === 'production'` - **"the one
environment this project has never run in."** The lesson was recorded and the
adjacent control still had the same shape.

#### 8. The codebase usually knows the right pattern already, somewhere

`POST /api/auth/register` accepted `role` from the request body and wrote it
into the insert, on a public route. Anyone could have made themselves an
administrator.

Twelve files away, `updateOwnProfile()` filters a tenant's own profile edit
through an explicit five-name allowlist, with a comment explaining that `role`
and `account_status` are stripped *"rather than trusted from the request body"*.

**The right shape was already in the repository.** One endpoint was written
without it. That is the usual way a single route ends up out of step with a
model that is otherwise correct - not because nobody knew better, but because
the knowledge lived in a different file and nothing compared the two. It is also
why `check:api` now asserts the fix statically: the next person to add a field
to that schema will not have read this paragraph.

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

**`admin.ts` is long and getting longer — 2,873 lines as measured 2026-09-15**,
and line numbers in older documents are stale. Anchor edits on surrounding text,
never on a line number from a document. This sentence previously read "~2,600
lines" with no date, which had itself gone stale by about 270 lines — the exact
failure mode it exists to warn about. Every figure of this kind in the repository
is a dated snapshot, not a standing fact: the architecture documents say 2,263
"Recounted 2026-09-13", and `docs/12_ITERATION_HISTORY.md` says ~2,500 with no
date. Treat all three as history and measure it yourself.

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
