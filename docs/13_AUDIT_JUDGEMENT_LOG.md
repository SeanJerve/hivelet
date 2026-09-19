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
every one of the 33 units with no real photo, presented with the same
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

**It happened three times in one session, which is what makes it a pattern rather
than an anecdote:**

| The place that had it right | The place that did not |
| :--- | :--- |
| `updateOwnProfile()` filters a profile edit through an explicit five-name allowlist, with a comment saying why | `register()`, twelve files away, wrote `role` straight from the request body |
| `tenant.ts` caps a ticket title at `max(200)` and a category at `max(60)` | `admin.ts` capped the same two fields at nothing |
| The income schema uses `shortText(20 \| 100 \| 255)` against its own columns, and `PATCH /auth/me` was fixed months earlier | Onboarding, registration, rooms, tickets and expenses were all uncapped |

In every case the helper already existed, the reasoning was already written down
in a comment, and a second site simply never received it.

**The right shape was already in the repository.** One endpoint was written
without it. That is the usual way a single route ends up out of step with a
model that is otherwise correct - not because nobody knew better, but because
the knowledge lived in a different file and nothing compared the two. It is also
why `check:api` now asserts the fix statically: the next person to add a field
to that schema will not have read this paragraph.

---

#### 9. Check what SHIPS, not what is committed

`check:secrets` had been green for weeks. It reads files git knows about, and
`frontend/dist` is gitignored - so **nothing had ever looked at what the browser
actually receives.**

What it received was the landlady's administrator password. The login page
carried a demo panel of 34 accounts, each with its password, rendered as
one-click sign-in buttons; `dist/assets/index-*.js` held `Hivelet@Admin2026`
once and `Hivelet@Tenant2026` thirty-three times, plus the name, email and
**room number** of every real resident.

Two separate blind spots, and both are general:

  **The rules looked for key-SHAPED material** - Supabase keys, JWTs, tokens,
  private-key blocks. An account password is an ordinary string and matched
  nothing.

  **The scope was the repository, not the artifact.** Scanning source answers
  "did we commit a secret". It does not answer "did we publish one", and those
  are different questions with different answers.

#### 10. A fix to HEAD does not undo a publication

Removing the passwords fixed the bundle. It did not fix the exposure: the
literal entered tracked source on 2026-08-25 and has been in the repository's
history ever since - the same window this project already records as a public
exposure for its JWT secret.

**The only remedy for a published credential is rotation.** A commit that
removes it is housekeeping, not containment, and reporting it as containment
would be the more dangerous error. Recorded as A-18 with the rotation left to
the person who owns the accounts.

#### 11. A note asking a human to remember is not a mechanism - including mine

On finding that `VIDEO PRESENTATION DOCS/` is gitignored and its copies had
drifted from the documents of record - the DFD copy by **126 lines**, still
containing the closure proof disproved the night before - the first action was a
handoff line telling someone to refresh them before filming.

That is exactly the arrangement this sweep spent its earlier entries condemning:
`NON_RENTAL_AREAS` in two files with *"Keep the two in step"*, and nothing
keeping them in step. **The note was written, read back, and replaced with
`check:copies` within the hour.**

The lesson is not "write checks". It is that **the instinct to write the note
survives even in someone actively cataloguing why notes fail**, so the question
has to be asked deliberately every time: *is there a mechanism here, or only a
sentence?*

#### 12. A designated source of truth still needs a mechanism behind it

This project's standing rule is to trust `database/live_schema.csv` over
`FULL_DATABASE_SCHEMA.sql`. Checked against the catalogue: **21 tables, 211
columns, matching exactly.** The rule is sound and the file is currently honest.

But nothing regenerates it. It is right by luck, and the next migration makes it
wrong silently - which is precisely the history of the file it replaced. Naming
a source of truth does not create one; **the naming is a decision, the checking
is what makes it true.** `check:columns` now compares them every run.

#### 13. An answer can go false while nobody touches it

The defense pack answered *"how do you know your system is secure?"* with a
candid account ending **"We rotated everything."** True when written: the keys
and the signing secret had been rotated.

Then the meaning of *everything* changed. The account passwords were found still
live, and still published. Nobody edited that sentence; **the world moved under
it**, and it became a claim a panelist could disprove in the room - the worst
possible failure for an answer whose entire value is candour.

Prose that asserts completeness - *everything*, *all*, *none remaining* - is the
most fragile kind, because it makes a promise about a set whose membership is
not fixed. The corrected answer enumerates instead, which cannot rot the same
way.

---

#### 14. The data knows the constraint better than the code does

`monthly_income_records` has one constraint - a primary key. Nothing stops the
same receipt being recorded twice, and the on-site form had no application guard
either, though the gateway path beside it does.

Writing that guard, the obvious criteria came straight from the form: same unit,
same receipt number, same date, same amount. **Four groups in the live ledger
match on exactly those four** - `OR#4895` across four rows, `OR#4896` three,
`OR#4920` and `OR#4952` two apiece. Every one is a single receipt split across
the months of arrears it settles. Legitimate, and the guard would have rejected
the next one.

It would also have thrown rather than rejected, because `maybeSingle()` errors on
more than one match: a 500 where a clean 409 was intended.

Adding the **period** makes it unique across all 937 rows. That is the real
constraint, and **the code could not have told me** - the form has no field that
says "this receipt also covers three other months", the schema has no comment
about it, and the shape only exists in how the owner actually issues receipts.

**Before writing a uniqueness rule, ask the data what is already true.** It is
cheap, it takes one query, and it is the difference between a guard that
protects the ledger and one that blocks the owner from using it.

#### 15. A check is worthless until it has failed on purpose - three times over

This is the most transferable thing in this document, and it took three
instances in one session to state it properly.

**A verification suite that passes proves nothing about the suite.** It proves
the code did not trip the particular string the suite happens to look for. The
only way to learn what a check actually covers is to break the code deliberately
and watch it fail - and every time that was done here, the check turned out to be
narrower than its own headline said.

| Suite | Headline it claimed | What it actually saw |
| :--- | :--- | :--- |
| `check:endpoints` | every route has a caller | **Gave a false pass on `/admin/audit-logs`** - a vue-router page path collided with the API path, so an unplugged endpoint read as called. Four wrong versions followed. |
| `check:writes` | *"every database write must declare what failure means"* | Only writes thrown away **without being named**. `const r = await db...update(...)` with `r` never read walked straight through. |
| `check:columns` | *"every table, column, filter and write key must exist"* | Not bulk inserts - `.insert(rows.map(a => ({...})))` never matched. Not the column lists inside joins - it read `rooms:room_id (...)` as reaching a table called `room_id`, found that was a column of the parent, and skipped the list. |

Two of those three were found **while writing a sentence claiming the suite had
it covered**. The sentence was the prompt to test the claim, and the claim was
wrong both times. That is worth more than either fix.

**None of the three was hiding a live bug.** The codebase was clean underneath
every hole: 0 unguarded writes, 0 bad columns in any join. So the damage was
entirely to the *guarantee* - each suite would have let the NEXT one through
while reporting all clear, which is worse than having no suite at all, because a
green check stops people looking.

**And the mutation can be the broken thing.** The first attempt at testing
`check:writes` deleted a `warnIfWriteFailed` call but left an
`attachResult.error` read two lines below. The suite passed it, correctly - the
result *was* still examined. From the outside that is indistinguishable from the
check being broken. **When a mutation is not caught, check the mutation before
blaming the check.**

**How to run this on any check here:** pick every distinct shape the thing you
are checking can be written in - not one example of it - then break each shape in
a real source file, run the suite, and revert in a `finally`. `check:columns` has
seven such shapes; two of them were invisible. Write the list of shapes down in
the suite's header, because that list *is* the guarantee.

---

#### 16. Before correcting a document, ask whether it is a record or a specification

I found the banned BR-035 wording, the withdrawn 2% escalation and the retired
retired "32 units" figure alive in **nine** documents under `docs/module_01_submission/`,
and started writing the patch to fix all of them.

**That would have been wrong, and badly so.** Those documents are what the group
actually submitted. The errata sheet's own preamble says why they stay as they
are:

> *"We publish corrected artifacts and this sheet together rather than silently
> reissuing the documents."*

Rewriting a submitted document to match today's facts destroys exactly the thing
that posture buys: a panel can hold the submission in one hand and the errata in
the other and see that the group found its own errors. A silently corrected
document proves nothing, and if anyone kept a copy of the original it looks far
worse than the error did.

**The test that separates them** is not what a document says, it is what it is
FOR:

| | |
| :--- | :--- |
| **A record** | says what was true, or believed, at a moment. Submitted coursework, a dated plan with its steps checked off, an errata row, a git commit. **Correct it with a banner, never with an edit.** |
| **A specification** | says what should be true now. `AGENTS.md`, `UI_DESIGN_SPECIFICATION.md`, the code. **Correct it in place, immediately.** |

The same four banned phrases were in both kinds, and the right action was
opposite in each. Four live specifications were corrected; nineteen records were
given banners and left alone.

**And the instruction files were the urgent half.** `.agents/AGENTS.md` and
`AI_DEVELOPMENT_WORKFLOW.md` both told the next contributor to document a *"2%
annual price increase history"* that does not exist. A retired framing in an
instruction file **reproduces itself** - it is not a stale sentence, it is a
sentence that writes more stale sentences. That is why they were the worst of the
four and why `check:canon` now guards them.

*Related: the same distinction is why `database/FULL_DATABASE_SCHEMA.sql` is
never edited. It is a record of a schema, and the live database is the
specification.*

---

#### 17. The tidy-up was the only thing marking the defect

Three profiles carried an invoice number glued onto the name -
`Mireel Fatima ParcareyINV.#5223` and two more. It sat on the remediation list
for days as a **data tidy**, and the fix was written and waiting: strip the
invoice number from each name.

**That fix would have destroyed the evidence.**

They are not the residents' records with a typo. They are **duplicates**. Each of
those three people already has a separate, complete profile - 26, 10 and 31
income rows, an active tenancy. The three on the list have **zero of
everything**: no tenancy ever, no income row, no bill, no payment, no ticket.

Strip the invoice number and you get three profiles **indistinguishable from the
real residents**. The corruption in the name was the only thing marking them as
artifacts of the 2026-08-27 import. The tidy-up would have hidden the defect
perfectly, and left it in place.

**And it was not cosmetic at all.** All three are `active`, all three hold a
`password_hash` set at the same instant as every other account, and that is the
shared tenant literal published in this repository's history since 2026-08-25.
Three working logins into the product, belonging to nobody, that nothing was
counting.

**Why every check passed.** `check:ledger`'s BR-026 test proves no two profiles
share an email or a phone. The duplicates carry their own fabricated email,
derived from the corrupted name -
`mireel.fatima.parcareyinv5223@gmail.com` - and their own phone number. **The
duplication is by PERSON; the check was looking at IDENTIFIERS.** A uniqueness
constraint cannot see a second record for the same human being.

#### The transferable part

**When a defect is described as cosmetic, ask what the cosmetic flaw is
attached to.** The reasoning that filed this as tidy-up went: *the name looks
wrong, so fix the name.* Nobody asked why the name looked wrong. One query -
"what else does this row have?" - answered it, and the answer was "nothing,
which is the point".

The same question is worth asking of anything on a list as **formatting,
naming, or tidy-up**:

| Ask | Because |
| :--- | :--- |
| What does this row/file/field look like **next to its neighbours**? | The duplicates are obvious the moment you put them beside the real profiles. |
| Would the fix make it **harder to notice** if I am wrong? | Here, yes, completely - and that alone should have stopped it. |
| Is the ugly thing **load-bearing**? | The corrupted name was the marker. So was `env.ts`'s `mock_` prefix, which turned out to be the sentinel `isLiveConfigured()` tests for - nearly renamed for tidiness the same day. |

*Two "cosmetic" items in one session where the tidy version was the wrong one.
That is a pattern, not a coincidence.*

---

#### 18. Read the failure, not the tail

Twice on 2026-09-17 I committed past a **red** check, and both times the check
was right.

| What I ran | What I read | What was actually there |
| :--- | :--- | :--- |
| `check:all` after editing `PHASE3_DEFENSE_PACK.md` | the last lines, which end with a hint about starting the backend | `check:copies` had failed **because of that same commit** — the filming copy was now a line behind |
| `check:all` after writing a report entry | *"ALL CHECKS PASSED"* — from a **different suite** further up | `check:canon` had failed on my own prose, which wrote `32-unit` bare |

Both commits carried the words **"All 16 suites green."** Neither was.

**The mechanism is the same in both, and it is not carelessness about whether
the suite passed — it is carelessness about WHERE THE ANSWER IS.** `check:all`
prints each suite's full output and then a summary table. Piping it through
`tail` shows the end of the last suite, or the runner's closing advice, and both
of those look reassuring while a failure sits fifty lines above.

**The fix is mechanical, and it is what the runner already offers:**

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

That prints one line per suite and nothing else. There is nowhere for a failure
to hide in it. `tail` is for reading a single suite; the **summary table** is for
reading a run.

#### Why this belongs in a judgement log rather than being quietly fixed

Because the whole standard on this project is that a claim gets checked — and
**"the suite is green" is a claim like any other.** Entry 15 says a check is
worthless until it has failed on purpose; this is the other half. A check that
fails on purpose and is then *not read* is worth exactly as little.

*The second of the two was `check:canon` catching its own author for the third
time in a day, on prose that was **about** the ban. That check has now found more
defects in my writing than in anyone else's.*

---

#### 19. Ask which screens trust shared state without checking whether it is live

One question produced **three money findings in a row** on 2026-09-17:

> *Which views read `rooms` / `tenants` without checking whether the fetch
> succeeded?*

Eight views read `rooms`. **Two** check `roomsFetchFailed`. The other six trust
it unconditionally — and `rooms` is **seeded from `canonicalUnits.ts`** so the
page has something to render before the API answers.

| What was trusted | What it actually held |
| :--- | :--- |
| the unit's **price** | a hardcoded snapshot. **30 of 33 no longer match the database**, by up to ₱2,000 |
| the unit's **occupant count** | `Math.min(capacity, 2)` — a number invented from how big the room is |

**Both feed the on-site cash form**, whose contents become the rent and the water
in the owner's ledger. The occupant count is worse than the price, because the
form *refuses* any water figure below `occupants × rate` — so a phantom second
occupant does not just suggest an overcharge, **it enforces one**.

And the invented count was not confined to the failure case. It was the mapping
on the **successful** path too: `activeRoomAssignment` was fetched, and used two
lines below for the resident's name, while `occupants` came from capacity. On
the owner's dashboard that projected **₱12,800 of water a month against a real
₱6,400** — exactly double, because most units house one person and every one of
them was counted as two.

#### Why this shape is worth hunting deliberately

A fallback is **invisible when it is right**, and every one of these was right
once. `basePrice` matched the database the day it was written. `min(capacity, 2)`
was a fair guess when nobody had entered real headcounts. They decay silently,
because nothing fails — the page renders, the form fills, the number looks like a
fact.

**The tell is a value that has two possible sources and no way to say which one
it came from.** Wherever you find that, ask:

| Ask | On this project |
| :--- | :--- |
| Is there a flag saying the data is not live? | `roomsFetchFailed` existed already; six of eight views ignored it |
| Does the fallback feed a **number a person will act on**? | rent and water, straight into the ledger |
| Would being wrong look like anything? | no — a filled field reads as a fact |

**The fix is almost never a better guess.** It is refusing to guess, and saying
so where the guess used to be: *"Live unit rates could not be loaded. Type the
amount from the receipt."* A blank field with a reason is a working form. A blank
field without one is a bug report.

---

#### 20. A constraint changes what the code must handle

Migration `024` put a unique index on `transaction_reference`, because
`adyenWebhookHandler`'s idempotency was a **read followed by a write** and Adyen
retries *while the first attempt is still running* — two handlers read "not
found" at the same moment and both insert.

The index was the easy half. **The half that would have caused an outage was
what the code then had to do with it.**

A unique violation came back as `outcome: 'failed'`. `failed` makes the route
answer **500**. **Adyen retries on 500.** So the index would have converted a
harmless duplicate into a notification that can never be acknowledged and never
stops arriving — strictly worse than the double-credit it was added to prevent.

`23505` now returns `duplicate`, which answers 200.

**The general rule:** adding a constraint does not only forbid something. It
introduces a **new error your code has never seen**, on a path that previously
could not fail. Before applying one, ask:

| | |
| :--- | :--- |
| What error does this raise, and where does it surface? | `23505`, from an insert that used to be infallible |
| What does the caller do with it today? | returned `failed` → HTTP 500 |
| Is that the right thing? | no — and for a retrying caller, catastrophically not |

*I would have shipped the index without the handler change if I had stopped at
"the migration applied cleanly".*

---

### A tenth sweep, 2026-09-17: a comment that explains why something is safe is a claim with an expiry date

This sweep started somewhere dull — *which state-changing endpoints write no
audit row?* — and the first answer was wrong in a way worth recording before
the findings.

#### 1. Scan at the wrong layer and everything looks missing

Grepping the route bodies for `auditFromRequest` reported **nine** unaudited
write endpoints, including the Adyen webhook and `POST /auth/login`. Both are
audited. They call `recordAudit` **inside their service**, one layer down from
where I was looking.

Of the nine, four were notification-read endpoints (fairly audited as noise),
one was dead in production (`refuseWhenGatewayConfigured` returns 404 while
Adyen is configured, which it is), and the rest were fine. **A completeness scan
is only as good as its idea of where the thing being counted is allowed to
live.** The same error as the ninth sweep's closure proof, in a smaller costume.

A second pass on the same question found something real but minor:
`ROOM_STATUS_CHANGE`, `BILL_CREATE` and `BILL_UPDATE` are declared in
`AuditAction` and **emitted by nothing**. Not a defect — there is no
bill-create or bill-edit feature; bills only change status as a consequence of a
payment, which is audited. But the enum advertises capability the system does
not have, which is worth knowing before a panel reads it as a feature list.

#### 2. The finding: a guard on one transition, and none on its sibling

`PATCH /admin/payments/:id/verify` handles three transitions. **Verify** goes
through `settle_verified_payment`, which takes `FOR UPDATE` on the payment row
and re-reads the status before doing anything — genuinely idempotent, confirmed
by reading the body out of `pg_proc` rather than trusting the comment that
claimed it.

**Reject**, in the `else` twelve lines below, was a bare `.eq('id', …)`. It
never looked at where the payment already stood. So a **verified** payment could
be rejected, and only three of the four records moved: the payment read
Rejected, the bill reopened to Due, `verified_at` and `verified_by` were nulled
— and **the income row stayed**. The owner chases rent she has already been
paid, and the record of who banked it is gone.

> **The lens:** *when one transition out of a state is carefully guarded, ask
> what guards the other transitions out of that same state.* A guard tends to be
> written where the author was thinking hardest, which is rarely the whole
> surface.

#### 3. And the reason it was left unguarded was written down, and had expired

Above that branch is a comment saying rejection *"touches no ledger row, so
there is nothing to tear"*. **That was true when it was written.** It stopped
being true when migration `018` moved settlement into
`settle_verified_payment`, which writes the `monthly_income_records` row. From
then on there *was* a ledger row to tear, and the comment went on explaining why
there wasn't.

> **The lens, and the most generalisable thing in this sweep:** *a comment that
> explains why something is safe encodes a precondition. When the code around it
> changes, the precondition can fail silently — and the comment will keep
> asserting the conclusion.* A comment justifying an ABSENCE is more dangerous
> than one describing a presence, because there is no code next to it to
> contradict it.
>
> Read them as claims with a date on them, and check the date.

#### 4. A check can be green precisely because of the thing it is meant to catch

`check:canon` excuses a banned phrase inside quotes. That is right for prose:
quoting a phrase is how you forbid it, and every register here is written that
way.

**In code the same rule inverts.** Quotes are string delimiters, so a quoted
banned phrase is not a citation — it is the literal text a user reads. The
exemption was therefore strongest exactly where the wording was most live, and
the check sat green over the toast an administrator reads **every time she
verifies a payment**, and over a label seeded into a `system_settings` row still
in the live database.

> **The lens:** *an exemption rule carries an assumption about the medium it was
> written for. Ask whether the same syntax means something different somewhere
> else it will run.* Here `"` meant "I am quoting this in order to ban it" in
> `.md` and "this is the value" in `.ts`, `.vue` and `.sql` — opposite meanings,
> one regex.

The fix is code-aware: in prose, quotes may excuse; in code, only a **comment**
may, because a comment explaining the ban is a citation and an executable or
data line never is. Mutation tested across all seven shapes.

#### 5. A number that must be re-measured should not live next to frozen prose

The session report published **271 commits**. `git` says **486**. The figure sat
inside a *dated historical section* — beside *"seven verification suites"* and
*"`check:api` 53/53"*, neither true for days — and was being incremented each
session instead of measured.

> **The lens:** *a live figure embedded in a frozen snapshot will be maintained
> as if the snapshot were live, and will drift.* Either re-measure it where it
> is read, or freeze it with the prose around it. Doing neither produces a
> number that is wrong and looks maintained.

#### 6. What was declined, and why

The obvious place for a regression test on the reject guard is `check:api`. It
was **not** put there. That suite's header promises it *"performs NO writes -
this is safe to run against production"*, and a probe that corrupts a live
payment whenever the guard is broken is a check whose failure mode is the
disaster it exists to detect. The behavioural test went into
`TESTING_REHEARSAL.md` instead, to be run by a human on a payment they created.

> *A test that is only safe while the code under test is correct is not a safety
> net. It is a second copy of the risk.*

#### 7. A check that sums two things it is meant to keep apart is blind to the only rule

Found later the same day, in `check:reports`. Linda's two units are billed under
a different rule set and are **excluded from the grand subtotal on purpose**
(§ 3.5). The checker read `GRAND SUBTOTAL` and `Linda total`, **added them
together**, and compared the pair against the month's receipts.

That passes whether or not Linda is in the right half. A misallocation between
the two **cancels out** — and the separation is the entire rule.

Demonstrated rather than argued. Moving `LF` out of the Linda section and into
the Back Apartment cluster:

| | |
| :--- | :--- |
| the split assertion | **FAIL** — `JANUARY grand (no Linda)` 248,250.00 against 243,250.00, LF's ₱5,000 moved |
| the whole-month total | **unchanged**, so the old check could never have seen it |

> **The lens:** *a check that adds two figures it is supposed to keep separate
> can only tell you the money still exists, not that it is in the right place.*
> Whenever a rule is about WHICH BUCKET something belongs in, assert the buckets,
> never the total — the total is exactly the statistic that is invariant under
> the error.

The same pass also found the expense workbook's category summary and its running
cumulative had never been checked at all. Both were correct; `check:reports`
went from 68 assertions to 192.

---

---

### An eleventh sweep, 2026-09-19: a system can be perfectly consistent with a mistake it made at the door

Twenty suites passed. 937 income rows agreed with their own totals, their own
periods, their own generated columns. `check:ledger` read every row and found
nothing. And **not one payment date in the ledger was the date the owner wrote.**

Every one was a day early. All of them, across 2024, 2025 and 2026 alike.

#### 1. Why nothing could see it

Every check in this project compares the system against itself: the frontend
against the API, the API against the catalogue, the register against the code,
the totals against their parts. All of that was true. The import had shifted
`date_paid` by a day on the way in, and a uniform shift leaves every internal
relationship intact. The ledger was **self-consistent and wrong**.

It became visible the moment it was compared against something outside itself —
the owner's original spreadsheet, which was sitting in the repository the whole
time at `INCOME AND EXPENSES PAST RECORDS/`. Matching on (unit, rent amount)
rather than receipt number, because the receipt column has four spellings and
311 rows carry no number at all:

    spreadsheet rows read                931
    matched to a ledger row              929
    ledger date EXACTLY one day early    929
    ledger date matching the sheet         0

Zero. Not a single row.

The cause is ordinary: the Excel cells hold exact UTC midnight — checked,
`2024-01-27T00:00:00.000Z`, no offset applied — so the importer read each as
local midnight and formatted it in a zone behind UTC. It is the same defect
`propertyDate.ts` and `propertyClock.ts` were written to prevent, one layer
earlier than either of them guards. **The guards were built for the doors that
had already been broken through.**

**The lesson to carry:** a check that compares a system to itself can only find
inconsistency. It cannot find a wrong number that was wrong before it arrived.
At least once, compare against the source the data came from — and notice when
that source is sitting in the repository unopened.

`rent_period_start` was untouched, because it was parsed from text
("Jun.29-Jul.28/24") rather than a date cell. The two halves of the same row came
in through different doors and only one of them was broken.

#### 2. Six rows failed differently, and said so

Exactly six money rows had a Date Paid cell Excel never stored as a date, so the
import defaulted them to the 1st of the month:

    B2F  "31-Maay-24"    2024-05-01 -> 2024-05-31
    B2B  "21-Maay-24"    2024-05-01 -> 2024-05-21
    F2F  "4-Maay-24"     2024-05-01 -> 2024-05-04
    3e   "13--Mar-26"    2026-03-01 -> 2026-03-13
    F2B  "30--Apr-26"    2026-04-01 -> 2026-04-30
    F1   (blank)         2026-07-01 -> nothing

"Maay" for May, and a doubled hyphen twice. Five were recoverable because the
typo is still legible. The sixth she never filled in, so it was **left at the
invented date rather than moved to a second invented one** — replacing a guess
with a better guess is still a guess, and it is pinned for her instead.

A seventh, `1900-01-17`, was not a typo at all: Excel counts days from 1 January
1900, so a cell holding the bare number `17` renders as 17 January 1900. The DAY
survived; the month and year were never in the cell. Her receipt book supplied
the rest — OR#4838 was paid on the 14th and OR#4840 on the 18th, and the one
between them is OR#4839.

#### 3. Removing the button is not closing the door

The sign-in screen dropped "No account yet? Create one" earlier the same day,
with a comment saying exactly why: *"let anyone on the internet make an account
against a live boarding house."* Right, and the button went.

`POST /auth/register` stayed open. A `profiles` row inserted there carries role
`tenant` and `account_status` `active`, and `/admin/tenants` returns
`.in('role', ['tenant', 'prospect'])` — so a stranger registering appeared in the
owner's Active Tenants list. The endpoint census in `check-endpoint-reach.mjs`
still described it as *"public by necessity"*, which had quietly stopped being
true.

**A decision recorded in one layer is not enforced in another.** When an
interface removes a way in, check whether anything still answers on that path.

#### 4. A check that demands a change and then rejects every version of it

`check:columns` refused a new table with *"Regenerate `live_schema.csv` ... Do
NOT hand-edit it to pass."* Adding the table to the snapshot did not help. The
parser was

    /Columns,([a-z_]+)\.([a-z_]+)/

and identifiers may contain digits. `rent_period_drift_backup_030.id` did not
match **at all**, so the table read as absent however carefully the snapshot
described it. Worse, `some_table.col_2` matched as `some_table.col_`, silently
truncating at the digit and reporting both a missing column and an invented
orphan.

It had never fired because no identifier in this database had a digit until that
migration. **The worst failure shape for a check is not a false negative — it is
demanding an action and then refusing every form of it**, because the only way
past is the hand-edit it warns against.

Relatedly: the message tells you to regenerate a file **nothing can regenerate**.
No such script exists, and it cannot be written with what this repo has —
scripts reach the database through PostgREST, which cannot see triggers, RLS,
CHECK constraints or function signatures, and there is no `DATABASE_URL` or `pg`
client. A generator refreshing one section of ten under a name promising a full
refresh would be its own lie, so it was deleted rather than shipped. B-25.

#### 5. Testing found what reading did not

`POST /admin/tickets` had been read closely that morning and hardened — an
arbitrary-room fallback removed, two silent misses turned into 400s. It was
still broken, and only exercising it showed how:

    POST /admin/tickets for PH  (vacant)    500 "Internal server error."
    the same request for 1a     (occupied)  201

`maintenance_tickets.tenant_profile_id` is NOT NULL. The table was designed
around the tenant portal, where a repair always has the resident who raised it.
The admin path has no such guarantee, and for a unit with nobody in it the insert
carried `null`.

Reading the handler shows the value being assigned. It does not show the
constraint at the other end. **Read the schema the write lands in, or run the
write.**

#### 6. The same trap as the tenth sweep, walked into again

The tenth sweep recorded, in this document: *"grepping the route bodies for
`auditFromRequest` reported nine unaudited write endpoints... they call
`recordAudit` inside their service, one layer down from where I was looking."*

This sweep ran the same scan and got the same nine, for the same reason, and
additionally missed that `authService` writes to `audit_logs` **directly**
without any helper. The correction found one real gap — `register()` recorded
only `AUTH_LOGIN`, so a brand-new profile appeared in the trail as somebody
signing in, with nothing saying an account had come into existence.

Recording a trap does not disarm it. The note was read and the mistake was made
anyway. If there is a defence it is the habit, not the document: **when a
completeness scan reports a suspiciously round number of gaps, assume the scan
is wrong before the system is.**

#### 7. A check that had never seen the ordinary case

Exercising the expense path end to end - create, edit, void - made `check:ledger`
fail on the spot:

    FAIL  no allocation without its entry - 1 violation(s)

The database was fine. `expense_property_allocations` had **zero** rows pointing
at a missing entry, confirmed in SQL. The check fetched live entries
(`voided_at=is.null`) and **all** allocations, then called any allocation whose
entry was not in that list an orphan - so every allocation belonging to a voided
expense looked dangling.

It had never fired because this ledger had never had a voided expense. Voiding a
receipt entered wrongly is an ordinary thing to do; it would have gone off the
first time the owner did it, on data that was correct.

**A check that has only ever seen the happy path has not been verified against
the unhappy one.** Mutation-testing proves a check fails when the thing it names
is broken. It does not prove the check is still right when a normal, untested
state of the system appears - and this project has now met that twice in a day,
counting the identifier regex above.

#### 8. The finding that is not a bug at all

The public site advertises the penthouse at **₱12,000**. It last let for
**₱30,000**.

Every figure is doing what it was told. `rooms.current_price` was never updated
after the units were seeded: `room_price_history` held **zero rows**, and all 33
units still had `current_price = base_price`. **31 of 33 disagree with what the
resident last actually paid; residents pay 162% of the rate card on average.**

Three things read that figure — the public site, BR-039's advance rent at
move-in, and any bill raised for a unit. Nothing is broken and nothing can be
fixed here: the owner sets rates by hand, and inferring them from the ledger
would be guessing at her business. B-29.

**A system faithfully reporting a stale number is harder to catch than a system
computing a wrong one**, because every internal check agrees with it.

---

### A twelfth sweep, 2026-09-19: the rare shapes, and a guard that could never have worked

The happy paths were exercised and passed, so this sweep went looking for the
shapes that only turn up occasionally — arrears settled in one lump, a period
starting on a day the next month does not have, a headcount above what the unit
holds, and a double-click.

#### 1. The arithmetic that broke once was checked properly this time

`periodEnd` was fixed months ago after `setMonth(getMonth() + n)` overflowed —
**31 January plus one month became 2 March**. Its server-side twin,
`monthlySpansFrom`, had never been tested at the boundaries, so it was, as a pure
function with no database in the way:

    31 Jan 2026, 1 month   -> 31 Jan .. 27 Feb     (Feb has 28)
    31 Jan 2024, 1 month   -> 31 Jan .. 28 Feb     (Feb has 29)
    31 Dec 2025, 1 month   -> 31 Dec .. 30 Jan     (crosses the year)
    29 Feb 2024, 1 month   -> 29 Feb .. 28 Mar     (from a leap day)
    12 months from a 31st  -> 12 spans, contiguous, no gap or overlap

All correct. Worth recording as a negative result: **the thing most likely to be
wrong was right**, and an hour spent proving that is not wasted, because the next
person does not have to wonder.

#### 2. A guard that reads and then writes cannot win a race

`POST /admin/income-records` refuses a duplicate receipt by SELECTing for one and
then INSERTing. Two requests that arrive together both pass the SELECT before
either INSERTs.

Fired at the live API simultaneously:

    2 identical receipts at once  ->  {"201": 2},  2 rows written
    5 identical receipts at once  ->  {"201": 5},  5 rows written

That is a double-click on "Record payment", or a retry after a timeout where the
first request actually succeeded. One rent payment recorded five times, inflating
her income by a figure nothing would reconcile against.

**No amount of application code fixes this.** A read followed by a write is racy
by construction unless it holds a lock, and supabase-js cannot open a
transaction. The guarantee has to live where the rows do. Migration 033 adds

    UNIQUE (room_id, invoice_number, year, month) WHERE voided_at IS NULL

which permits what the ledger genuinely contains — OR#4895 settling Sep to Dec
2024 on four rows, differing by month — and refuses the same month twice under
the same number, which is only ever the same payment recorded again. Re-run
afterwards: `{"201": 1, "409": 4}`, one row.

Note the shape of the fix as much as the fix. **The guard I had added that
morning was the same racy shape as the one it strengthened** — the reasoning was
about which duplicates to catch, and never about whether the check could be
outrun. Ask of any check-then-act: *what happens if two of these arrive at the
same millisecond?*

#### 3. A field that is stored, displayed, and checked against nothing

`rooms.capacity` is validated on create and edit, and shown to the public —
*"Room for up to 5 people"* is on the category page. Nothing ever compared it to
anything. A receipt recording **nine** occupants of PH, which holds five, was
accepted in silence and charged 9 × 200 = 1,800 of water.

Both readings are real: nine people may genuinely be in there, and the ledger
records what happened rather than what the room card says. But a 9 typed where 2
was meant overcharges a resident 1,400 with nothing anywhere to notice.

Resolved the way this codebase already resolves that tension — BR-036 on a
mismatched water figure, BR-039 on an advance rent that differs from the rent:
**accept, and attribute.** The audit row carries the capacity, the headcount and
the water charged, so the divergence is answerable later instead of invisible.

**When a field is displayed but never compared, it is decoration.** Worth
grepping for others.

#### 4. What held up

Recorded because a sweep that only lists failures misrepresents the system:

  - **Arrears in one visit.** Three months on one receipt writes three rows, one
    month of rent each, filed under three distinct months, periods contiguous —
    and the garbage fee charged **once**, not three times, which is BR-037
    working.
  - **Money at the edges.** Negative, `1e999`, larger than the system records,
    and three decimal places are all refused with the field named. One centavo
    and zero are accepted, which is right: a concession month is a real thing.
  - **Text at the edges.** Whitespace-only and 300 characters refused; an
    apostrophe, Baybayin script and an emoji all stored and read back exactly.
  - **Isolation.** A resident gets 403 on the ledger, the register and the audit
    trail, 404 on another resident's repair, and **cannot promote themselves to
    admin** — the role field is stripped and they stay a tenant.

---

### A thirteenth sweep, 2026-09-19: hostile input, replayed money, and three tests that were wrong before the system was

This sweep attacked the system rather than exercising it: forged tokens,
replayed settlements, payload shapes chosen to break something. Two real defects,
several clean negatives worth recording, and three of my own tests that reported
a failure the system did not have.

#### 1. Authentication held against everything

Ten attempts, all refused:

  - signed with the wrong secret
  - `alg: none`, unsigned
  - expired an hour ago
  - a valid signature for a profile that does not exist
  - no token, an empty bearer, a string that is not a JWT
  - a payload genuinely altered under the original signature
  - one character changed in the signature
  - **a tenant's profile id with `role: "admin"` inside a correctly signed token**

That last one is the one that matters. The API reads the role from the database
and not from the claim, so signing a token with the real secret and a lie inside
it buys nothing.

#### 2. Two hostile payloads reached the database and came back as 500s

    10,000 allocations on one expense  ->  500 "Internal server error."
    a NUL character inside a payer's name  ->  500 "Internal server error."

Neither is dangerous; both are illegible. The array had `.min(1)` and no ceiling,
so ten thousand allocations were carried into
`create_expense_entry_with_allocations` before anything objected. And a `text`
column cannot hold a NUL, so the driver failed on encoding — a Postgres error in
the log that reads like a fault in the system rather than in the request.

Capped at 50 (there are six property areas; fifty allows an itemised bill and
still bounds the work) and NUL rejected in `shortText`, which covers every text
field at once. Both now 422 naming the field. Other C0 controls are left alone: a
stray tab in a supplier name is untidy but storable, and this validator's job is
to stop *unstorable* input, not to tidy her typing.

#### 3. Replaying a settlement does nothing, and that was already true

`PATCH /admin/payments/:id/verify` on a payment already Verified is refused, and
five of them fired simultaneously wrote no second income row and moved no money —
the ledger read 937 rows and 8,086,250.00 before and after. `settle_verified_payment`
takes `FOR UPDATE` and re-reads the status, which is the shape the income path
did *not* have and needed migration 033 to get.

#### 4. Prototype pollution is structurally impossible here, which is worth knowing

`"__proto__"` and `"constructor.prototype"` sent as real JSON keys all returned
201 and changed nothing: the rows created were ordinary, and the server answered
correctly afterwards. Zod's `.object()` strips unknown keys, every handler reads
`parsed.data`, and **nothing anywhere spreads or merges the raw `req.body`** —
grepped for `...req.body`, `Object.assign(…req.body)` and `merge(req.body)`, and
the single textual hit is a comment describing a defect that was already fixed.

Recorded as a negative result because the next person should not have to re-derive
it, and because the property that makes it safe — never touching the raw body — is
one a future handler could quietly break.

#### 5. Three tests were wrong before the system was

Worth recording as its own finding, because each nearly became a false report.

  - **"a JWT with the payload swapped after signing" returned 200.** The
    re-encoded payload was byte-identical to the original — the admin already had
    `role: admin`, so "tampering" changed nothing and the signature still matched.
    Genuinely altering the email gives 401.
  - **"`__proto__` pollution" returned 201.** The payload was built as a JS object
    literal, where `__proto__:` sets the prototype rather than creating a key, so
    `JSON.stringify` dropped it. The attack was never sent.
  - **The multi-month and month-end probes all failed with "the rent period could
    not be determined."** They supplied only `dateCoveredStart` against PH, which
    has no tenancy to derive an end from. Correct refusal; wrong test.

**A test that fails proves something is wrong with the test OR the system, and
which one is not obvious.** Each of these looked like a finding. Two would have
been reported as security defects. The discipline that caught them is the same
one this document keeps recording: before believing a result, check that the
thing you meant to do actually happened.

#### 6. My own writing tool corrupted a source file

Editing `validators.ts` through a shell heredoc to add a NUL check wrote **three
real NUL bytes into the TypeScript source** — the escape was interpreted one
layer earlier than intended, and `grep` reported the file as binary. Restored
from git and re-edited with a direct file edit instead.

The irony is the lesson: the change was about characters a database cannot store,
and the tooling used to make it could not store them either. **When a change is
about escaping, do not make it through a pipeline that escapes.**

---

### A fourteenth sweep, 2026-09-19: the ledger as the witness, and two wrong turns of my own

The thirteenth sweep attacked the system. This one asked a different question:
**where does the system disagree with her book?** Everything below came out of
that comparison, and none of it was visible to a suite, because the suites test
the system against itself.

#### 1. Every tenancy bills on the 1st. Twenty-nine of thirty-two residents do not pay on the 1st

`room_assignments.anniversary_date` holds `2026-07-01` for **all 32** active
tenancies — one distinct value across the whole property, and the same invented
import date migration 032 caught in `date_paid`.

BR-033 runs the rent cycle from that column, and `computeBillPeriod()` reads
**only its day-of-month**. So the system believes every resident's month opens
on the 1st. The ledger says the period starts on the 1st in 122 of 937 rows and
on **23 other days** in the other 815:

    1a   the 7th,  31 months unbroken        B2F  the 21st, 31 for 31
    1c   the 26th, 31 months unbroken        LB   the 25th, 31 for 31
    1d   the 9th,  31 months unbroken        LF   the 13th, 31 for 31

Nothing has been damaged, and that is luck rather than design: all 937 rows came
from the import, and **no receipt has ever been recorded through the application
by a person.** The first one will be wrong. A receipt for 1a gets stamped
1–31 Oct when that resident's month runs 7 Oct – 6 Nov.

The sharper edge is the warning. The handler files an audit note when the typed
period differs from the derived one. With the derived one wrong for 29 units,
**an administrator who types the correct dates is the one who gets flagged.** A
guard pointed at the wrong party is worse than no guard: it trains her to
distrust her own book.

Migration 035 settles the 16 units whose ledger is unambiguous. Sixteen more are
listed for her with their histories, because they either track month-end or
changed day mid-year, and the book cannot say whether the resident changed or
the arrangement did. **`check:ledger` now compares the two**, as a ratchet at 29,
since it cannot be green today without lying.

#### 2. I nearly doubled every deposit

I raised a queue item in the morning saying the onboarding logic collected half
what it should, and that `deposit_amount` was a month short on every tenancy.
It was wrong.

The mistake was the comparison. Measured against `rooms.current_price` the
deposits look like 1.3x–1.9x of a month — consistent with a two-month sum
recorded badly. Measured against **the rent each unit actually charges**, all 32
hold exactly one month: 20 to the peso, 9 more within 8%, **none at two**. The
rate card understates the real rent by about 1.6x, and that 1.6 was the whole
illusion.

**A ratio computed against the wrong denominator is not a weak finding, it is a
confident wrong one.** Had I acted on it, the next 32 tenancies would have
disagreed with all 32 that exist.

#### 3. And then I asserted something the register had already answered

Correcting that, I wrote in the public FAQ and the queue that *"whether anything
is returned has not been confirmed."*

She confirmed it on **2026-09-17**, in her own words:

> *"whatever is left of that entire expenses will be refunded to the tenant. If
> it's 6500 and the expenses is 6400, the 100 pesos will still be given back."*

`docs/02_BUSINESS_RULES.md` BR-039 has carried that since the 18th, states the
rest of what I spent the sweep deriving from live rows, and **explicitly marks
the opposite reading retired.** Vince had the whole answer a day before I looked.

I had read the code comments instead of the rule register — and the comments I
was reading were **the very ones BR-039 had retired.** This document's recurring
lesson is that a comment is a claim with a date on it. I walked into that trap
while fixing an instance of it, which is worth more as a recorded failure than
the fix is:

> **Checking a stale comment against the database proves the database. It does
> not prove the comment.** The authority for a business rule is the rule
> register, and the live catalogue is downstream of it, not a substitute. When
> the two disagree, the code comment is the least reliable of the three and is
> the one most likely to be read first.

Migration 036 corrects the live column comment, which still instructs the reader
not to build the workflow she has just described.

#### 4. What was NOT changed, deliberately

Her screen still says "Advance rent" in four places. BR-039 records that
*"advance"* is the owner's own word and that the word is a label rather than a
definition. Renaming what she reads is her call and the design lane's, so it is
raised in B-31 and not taken.

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

### 3.6b The receipt guard is code only, deliberately — and here is the work if you disagree

`POST /admin/income-records` refuses a duplicate receipt by reading first: room,
invoice number, date, amount, **year and month**. That is a read-then-write, the
same shape migration `024` had to close for the Adyen webhook, and it is
**deliberately left as code**.

**The feasibility work is done.** A unique index on those six columns would apply
cleanly: **zero colliding groups across all 937 rows**, checked 2026-09-17. The
year and month columns are what make it safe — without them it would reject the
arrears settlements, where one receipt number legitimately covers four
consecutive months on four rows.

**It was still declined, because the threat is not there.** The webhook case is
different in kind, not degree:

| | the Adyen webhook | the on-site receipt form |
| :--- | :--- | :--- |
| who calls it | a gateway that **retries by design**, concurrently, while the first attempt runs | one administrator, at a counter |
| what stops a repeat | nothing — retrying is the protocol | the submit button disables while saving; a retry arrives after the first completed, so the read catches it |
| cost of the race | the property is paid once and **credited twice** | the same, but requiring two genuinely concurrent submissions from one person |

Against that, a unique index is a **permanent refusal on the owner's own
ledger**. If a case exists that none of us thought of, she meets a rejection she
cannot work around, on the one screen where money is recorded. A hard constraint
on a live financial table wants a real threat, and this one does not have one.

**If you disagree, the index is safe to add today and the check has been run.**
What you must not do is add it without also deciding what
`POST /admin/income-records` does with `23505` — it currently throws
`ApiError.internal`, which is a **500**, where the guard beside it returns a
clean **409**. See entry 20.

### 3.7 Which multi-table writes are atomic, and what the other twelve do instead

*Written 2026-09-16. The standing note - "any multi-step write NOT routed through
a database function can still half-complete" - is true, and on its own it sounds
far worse than the code is. A panel will ask what happens if a write fails
halfway through. This is the answer, handler by handler, verified against the
route files rather than remembered.*

**Fifteen handlers touch more than one table.** `supabase-js` cannot open a
transaction, so the question is real. Four mechanisms answer it, and which one a
site uses was a decision, not an accident.

**1. Three handlers were moved into PostgreSQL functions**, each of which runs in
one implicit transaction:

| Function | Handler | Migration |
| :--- | :--- | :--- |
| `settle_verified_payment` | `PATCH /admin/payments/:paymentId/verify` | `018` |
| `create_expense_entry_with_allocations` | `POST /admin/expense-entries` | `019` |
| `replace_expense_allocations` | `PATCH /admin/expense-entries/:id` | `010`, amended by `013` |

These are the three where **both** writes must land together: money moving
against a bill, and an expense whose allocations must total it.

**2. One pair is welded by a trigger.** `room_price_history` is not written by
any handler - `trg_record_room_price_change` (migration `020`) writes it from the
`rooms` UPDATE itself, in the same transaction. **A rate change cannot leave the
rate and its history disagreeing**, which matters because BR-003 is anchored to
that table.

**3. The remaining twelve order their writes so the record that matters lands
first.** `POST /admin/income-records` is the clearest case, and the one where it
counts: it is the only path by which cash the owner physically received enters
the ledger. It inserts `monthly_income_records` **before it reads a single
bill**. If anything downstream fails, the owner's record of the money exists and
survives; only the bill status and the payment rows lag. The handler says so
itself:

> *"The income record was saved and kept, but this tenant's bills could not be
> read to settle against: ... No bill was changed."*

And the lag is self-healing rather than permanent. `allocateReceipt()` looks for
bills *"already covered by earlier payments but never re-statused"* and corrects
them on the next receipt, instead of spending new money on a debt that is already
gone.

**4. No write fails silently.** A bare `await db.from(...).update(...)` is
indistinguishable from success, because `supabase-js` resolves `{ data, error }`
and never throws. Every one of these sites is guarded - **16 `assertWritten`, 8
`warnIfWriteFailed`, 43 destructuring `error` directly** - and `npm run
check:writes` holds the line. The choice between the two helpers is itself the
documented judgement in [SS 3.2](#32); `utils/checkedWrite.ts` records why both
exist.

> **I wrote that sentence before testing it, and it was wrong.** `check:writes`
> was anchored `^await db`, so it only saw a result thrown away *without being
> named*. A result captured in a variable and then ignored -
> `const result = await db...` with `result` never read - sailed straight
> through. I found it by deleting a live `warnIfWriteFailed` call and watching
> the suite report **ALL CHECKS PASSED**.
>
> No such write existed in the codebase; the sweep found 43 destructured, 24
> wrapped, 1 captured-and-examined, 0 bad. So this was a hole in the *guarantee*,
> not a live bug - the suite was narrower than its own headline, and would have
> let the next one through. It now fails all three shapes, each proved by
> mutation. **Second time this session a suite gave a false pass on exactly the
> scenario it existed for** (see `check:endpoints`), which is why a check is not
> trusted here until it has failed on purpose.

#### What each of the twelve leaves behind on a partial failure

| Handler | If it stops midway |
| :--- | :--- |
| `POST /admin/income-records` | Income recorded; a bill may still read `Due` and payment rows may be missing. **No money is lost from the ledger**, and the next receipt corrects it. |
| `POST /admin/tenants` | A profile with no tenancy, or a tenancy with the unit not yet `Occupied`. A retry meets the duplicate email/phone guard rather than creating a second person. |
| `PATCH /admin/tenants/:profileId` | A room move can end the old tenancy before starting the new one. Every step is `assertWritten`, so it stops loudly at the failure. |
| `POST /admin/tenants/:profileId/vacate` | Tenancy ended, then unit freed, then account deactivated. A stop leaves a unit reading `Occupied` with no active assignment - wrong on the directory, not in the money. |
| four `/admin/tickets` handlers | The ticket row is always written first and the unit's `operational_status` second, under `assertWritten`. A stop costs the status, not the complaint. |
| `POST /tenant/tickets` | ~~**The one to watch.** The ticket commits, then attachments insert and *throw* on failure - so the tenant sees an error for a ticket that was in fact filed, and may file it again.~~ **FIXED in `623a88a`, verified by reading the route 2026-09-19.** The attachment insert is `warnIfWriteFailed` and sets an `attachmentWarning` returned beside the ticket; nothing throws after the ticket has committed. |
| `POST /public/inquiries` | Deliberately cannot half-fail visibly: the thread seed uses `warnIfWriteFailed` because `inquiries.message` is `NOT NULL` and already holds the text. Throwing would show a prospect an error for an inquiry that was received. |
| `POST` / `PATCH /admin/rooms` | A photo row may lag the unit. Cosmetic - and `room_photos` is empty across all 33 units today. |

#### The conclusion worth carrying

**Nothing in this list loses money, and nothing fails silently.** The three
places where a partial write would have been unrecoverable are the three that
were given database functions; the one place where a trigger was the right answer
got a trigger.

~~The single honest weak spot is `POST /tenant/tickets`, where a failed attachment
insert reports a ticket that exists as an error. It is worth fixing, and it is
worth fixing the way the others were - **not** by chaining more awaits.~~

**Closed in `623a88a`, and re-read on 2026-09-19 to confirm rather than inherit
the claim.** The attachment insert goes through `warnIfWriteFailed` and sets an
`attachmentWarning` that travels back beside the ticket, so the tenant is told
the photo did not attach *and* told not to file it again. Nothing throws once the
ticket has committed. **There is now no handler in this list that reports a
committed write as a failure.**

*Left here as a struck line rather than deleted, because this paragraph is the
one §2 of this document warns about: a defect register that keeps asserting a
problem after it is fixed sends the next reader's attention somewhere there is
nothing to find. Six of these were found in one sweep on 2026-09-15; this is the
same shape, and it was written by the same document that catalogues it.*

**What would justify a fourth database function** is a handler where the
*second* write is the one that must not be lost. None of the twelve is shaped
that way today. If one is ever written, follow migrations `010`, `018` and `019`
- and note that a `.rpc()` call is the visible sign that someone thought about it
at all.

---

### 3.8 The lockout message enumerates accounts, and that is the price of the lockout working

**Two comments in this codebase say user enumeration is prevented. A third code
path defeats both, and nobody had written that down.**

`ApiError.invalidCredentials` returns the same 401 for an unknown email as for a
wrong password, *"because distinguishing them would let an attacker enumerate
which tenants have accounts"*. `authService` checks `account_status` only after
a valid password, *"so the response cannot be used to probe which accounts
exist"*. Both are true about the paths they sit on.

**`ApiError.accountLocked` answers 429.** Only a real account can be locked. So
five wrong guesses and a sixth attempt tell a caller whether an address belongs
to a resident — for free, against every path the other two protect.

#### Why it is not simply fixed

The obvious fix is to compare the password first and reveal the lock only to
someone who got it right. **That is wrong, and `check:api` already asserts
against it.** A locked account would then answer differently for a right guess
than a wrong one, so an attacker could keep guessing *through* the lockout and
read the result each time — and the lock would stop being a brake on guessing
at all, which is the only thing it is for.

*I proposed exactly that before reading the existing reasoning. The reasoning was
right. This is the second entry in this log that exists because a comment
explaining why something is safe turned out to be worth reading rather than
overriding — see the tenth sweep, which is about the opposite case.*

#### So the real choice is narrower than it looks

You cannot have a helpful lockout message **and** no enumeration. There are only
two positions:

| | Enumeration | Lockout brakes guessing | A locked-out resident is told |
| :--- | :--- | :--- | :--- |
| **Today** — 429 with the minutes | **leaks** | yes | *"try again in 15 minutes"* |
| Generic 401 for a locked account | none | yes | **nothing at all** |

#### What was decided, and what would change it

**Kept as it is**, and the code now says so instead of claiming otherwise.

The population is 32 residents, the owner, and a handful of teammates. What
enumeration buys an attacker here is confirmation that a particular person lives
at this address — a real privacy concern about real people, but a narrow one,
and it requires six deliberate attempts per address. Against that, a resident
who mistypes their password five times and is then told *nothing* will phone the
landlady, and she has no way to see or clear a lock.

**Change it if** the account base ever stops being a closed list of known
residents — public registration, say — at which point enumeration becomes
harvesting and the trade inverts. The change is one line: return
`ApiError.invalidCredentials()` from the lock branch. Do **not** move the lock
check below the password compare; that is a different change and it is the wrong
one.

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
| 3 | **Service extraction** | **144 of 184** database calls sit in route handlers (78%), and `admin.ts` is **3,033** lines. Re-measured 2026-09-16; this row read *137 of 173* until then. The architecture's stated target; not required for the defense |
| 4 | **BR-020** | Would need a `room_id` on expense allocations, and her own workbook allocates by Property Area, not by room. Arguably out of scope rather than unfinished |
| 5 | **BR-025** | Waits on OD-04 — deposit disposition on move-out |
| 6 | **Team roles disagree across documents** | Repository says Sean is System Architect / Full-Stack and Loyd is Database Administrator; the presentation script says Sean is DBA. Eljohn and Vince have no role recorded. **The team's to settle, not Claude's** |
| ~~7~~ | ~~**The four remaining Supabase secret keys**~~ | **Closed.** `loyd` rotated 2026-09-14; `eljohn`, `kiel` and `bins` deleted 2026-09-15 |

| 8 | **Everything the overnight audit of 2026-09-15/16 could not close** | Gathered in **one place** — `CONTINUE_HERE.md` §3.9 — split by whose call it is: four decisions for Mrs. Da Silva (seven receipts, the ₱35,228 classification, where Linda's fixed water belongs, OD-07) and six for Sean (**rotate the two shared passwords**, the fail-open `current_user_role()`, an administrator bills screen or none, a change-password screen, five superseded endpoints, the vite upgrade). **Deliberately not re-listed here.** Two registers holding one list is the failure this audit found most often; the pointer cannot drift, a copy can |

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
