# Blocked — needs Sean's setup

**A queue, not a discussion.** Anything Loyd's side could not finish because of what his machine
or credentials cannot reach goes here, in enough detail that Sean can pull, read one entry, and
act without asking a question.

**Never stop working because of one of these.** Record it, move to the next thing, come back if
Sean clears it. The point of this file is that nobody waits.

---

## How to add one

Copy the block. Keep it short, and make it **actionable without context**: Sean will read this
cold, possibly at midnight, after a day of his own work.

```markdown
### B-00 — one line saying what it is

- **Blocked on:** the specific thing that is missing (Adyen keys, the tunnel, a decision, …)
- **What I was doing:** the task, in one sentence
- **What I already did:** files touched, migrations written, anything ready to go
- **What Sean needs to do:** the smallest concrete action, ideally a command
- **How to know it worked:** the check, or the figure that should change
- **Raised:** YYYY-MM-DD by whom
```

**If the work is ready and only the *applying* is blocked, say so and commit the work.** A
migration that is written, reviewed and just not applied is a good entry. A vague "the payment
thing did not work" is not.

---

## Open

### B-11 — 16 ended tenancies do not record when they ended

- **Blocked on:** a backfill migration, which is live data and therefore yours
- **The code is not the problem.** All three places that deactivate a tenancy write
  `end_date: propertyToday()`, and have since `d026e21` on 2026-09-16
- **The rows predate it and were never backfilled.** Every inactive tenancy in the database has
  `end_date` null — **16 of them, across 8 profiles, and not one exception.** Verified through the
  admin API on 2026-09-18
- **It reaches real residents, not only test rows.** the resident who left Linda's **LB** — nothing
  records when; the deactivated tenant **BR-025** is argued from has a tenancy from
  2024-05-01, no end date
- **Why it matters beyond tidiness:** **OD-04's deposit settlement needs a move-out date.** The
  owner spends the held sum on repairs "as early as the room is ready" — which is a date nobody
  can currently produce for any past tenancy. It also leaves BR-003 unable to say when a unit
  became vacant
- **What I already did:** wrote `check:relations` (new, nineteenth suite). It pins the count at
  **16**, prints it every run, and **fails if it grows** — a new undated tenancy means the fixed
  path was bypassed. Mutation-tested both ways
- **What you need to do:** a migration setting `end_date` on those 16. **The honest value is not
  `today()`** — these ended at various points in the past. If the real date cannot be recovered,
  writing one that looks precise is worse than leaving null; consider the tenancy's last
  income-record period as the evidence, and say in the migration header which it was
- **How to know it worked:** `npm run check:relations` reports a lower count and says the baseline
  can come down; then lower `UNDATED_BASELINE` in the same commit
- **Related, and cheaper:** the rehearsal now asserts this on the way through — vacating the test
  tenant should produce **the first correctly-dated row this system has ever had**, because no
  write path has been exercised by a person since the fix landed
- **Raised:** 2026-09-18 by Claude, on Loyd's machine

---

> **Two entries are both numbered `B-01`** — the open one below, and the closed demo-password one
> further down. Left as they are rather than renumbered, in case the new one is already referenced
> somewhere. Worth settling before a third appears, since this queue is referred to by number.

### B-09 — the production build ships 34 residents' email addresses · **CLOSED 2026-09-18**

> **Closed by the design side the same day it was raised, and the fix is not the one the entry
> asks for.** Read this note before the original below, which is kept in full because its
> reasoning is right even where its conclusion was incomplete.
>
> **The chunk does not reproduce on current `main`.** A clean `npm run build:frontend` at
> `e53cbdd` emits two assets, `index-*.js` and `index-*.css`, and neither contains a resident's
> name or address. `check:secrets --all` passes on the built output. Whatever produced
> `demoAccounts.dev-CmTmdIki.js` is not in the tree now, and I have not established what did —
> the same restraint the entry itself shows about `b403e77`.
>
> **The larger breach was real, and was never about the bundler.**
> `frontend/src/lib/demoAccounts.dev.ts` held 33 real residents' names, email addresses and room
> numbers as a literal array, **in a tracked file, in a public repository.** Whether Rollup
> eliminated the module only ever decided whether a visitor to the *site* could read the list.
> Anyone who opened the *repository* could read it either way, and had been able to for weeks.
> That is the BR-024 exposure, and it is bigger than the one the chunk represents.
>
> **What changed.** The list moved to the gitignored `credentials/demo-accounts.json`, handed to
> the dev server by `vite.config.ts` exactly as `creds.txt` already was. So a built app now
> carries no resident data for two independent reasons, and only one of them is the bundler:
> the define is `null` for any `command !== 'serve'`, **and there is nothing in the tracked
> source for a bundler to include.** The second does not depend on tree-shaking behaving the way
> a comment claims.
>
> **Verified:** `grep` for resident names and `@gmail.com` across `frontend/src` and
> `frontend/dist` returns nothing; the demo panel still lists 34 accounts on the dev server and
> one-click sign-in still lands on `/admin/overview`.
>
> **You still need to send `credentials/demo-accounts.json`** to any machine that should have the
> demo panel, alongside `creds.txt`. Without it the panel simply does not appear, which is correct
> for a machine that was never sent the credentials.
>
> **A check now covers it.** `check:secrets` gained a resident-address rule — see B-10.

<details>
<summary>The original entry, as raised</summary>

### ~~B-09 — the open duplicate of the entry above~~ — **folded in, 2026-09-18**

> This was a second, still-open copy of B-09 carrying the original diagnosis. It has been
> replaced by this line rather than left standing: **two entries under one number, one closed and
> one open, is how a queue read by number stops being trusted.** The closed entry above holds the
> resolution, and `docs/AUDIT_2026-09-18_FUNCTIONAL.md` § D-0 holds the detail it used to carry.

---

</details>

### B-10 — 20 resident and team email addresses in tracked documents and fixtures

- **Blocked on:** a judgement about documents and seed fixtures, which belongs to whoever owns
  them — not something a scanner should force at commit time
- **What is wrong:** `check:secrets` now has a rule for a resident's email address. It finds **20
  more** outside the login panel, in prose and in database fixtures. They are listed on every run
  rather than failing it, the same way `check:endpoints` reports its unplugged route, so they
  cannot be forgotten:

  | Where | How many | What they are |
  | :--- | :--- | :--- |
  | `database/README.md` | 6 | the seed credentials table |
  | `database/verify-rbac.mjs` | 2 | RBAC test fixtures |
  | `docs/13_AUDIT_JUDGEMENT_LOG.md` | 1 | quoted inside an audit note |
  | `docs/superpowers/**` | 4 | Adyen design and plan documents |
  | `SESSION_REPORT_2026-09-15.md` | 1 | quoted in a session report |
  | others in `docs/` | 6 | quoted in records of what happened |

- **Not all of them are residents'.** `sean.jerve@`, `john.lloyd@` and `mark.cruz@` are team and
  test accounts. `luydcuario@gmail.com` is the database administrator's own and is excluded by the
  rule outright — `backend/scripts/check-ledger-integrity.mjs` says so on the line above it and
  ends the note with *"LEAVE IT"*. A scanner that overrules that is one people route around.
- **The ones that are residents':** `jaye.casia@`, `miguel.ramos@`, `rhea.mendoza@`,
  `mireel.fatima.parcarey@`. Four real people, in a public repository.
- **What Sean needs to decide:** whether those four are replaced with `resident-a@example.com`
  style stand-ins in the documents, or whether the repository is made private. Replacing them in
  `database/README.md` and `verify-rbac.mjs` is mechanical; replacing them inside an audit note
  changes a record of what happened, which is the part that needs a person.
- **What NOT to do:** do not edit `database/FULL_DATABASE_SCHEMA.sql` — CLAUDE.md rule 2. Its six
  matches are in that file and it is already known to be wrong about this database.
- **How to know it worked:** `npm run check:secrets` prints a shorter NOTED list. It is designed
  not to fail on these, so the number in the list is the measure.
- **Raised:** 2026-09-18 by the design side, while closing B-09

> **Two things added 2026-09-18 from the QA side, both verified rather than assumed.**
>
> **1. The repository is public — confirmed, not inferred.** An unauthenticated request to
> `api.github.com/repos/SeanJerve/hivelet` returns **200** with `"private": false` and
> `"visibility": "public"`. Worth having on the record, because every option below is priced
> against it.
>
> **2. The count above is of the *current tree*. The history holds more.** `demoAccounts.dev.ts`
> was gutted in `ba3b82a`, not erased: **33 residents' names, addresses and unit numbers remain
> readable in every commit that carried them**, and GitHub serves those. So replacing the four
> remaining addresses in documents cleans the tree and leaves the larger set where it is.
>
> **Which makes the choice sharper than it looks.** Substituting stand-ins is mechanical and
> worth doing, but only **making the repository private** takes effect on what is already
> published. A history rewrite would reach further and is the one option `AGENTS.md` warns
> against — the Lovable sync rewrites with it — and it still does not reach forks, clones or
> GitHub's caches. **I have not attempted one and would not without being asked.**

> **Update, same day, from the QA side: 19 → 11.** The mechanical half is done, and it fell out
> of fixing `verify:rbac`:
>
> - **`database/README.md`** — the *Seeded credentials* table listed the two burned passwords
>   beside six addresses, four of them residents'. Replaced with a pointer to `creds.txt` and
>   `demo-accounts.json`. **−6**
> - **`database/verify-rbac.mjs`** — names nobody now. It reads passwords from `creds.txt` and
>   **discovers** one active and one deactivated resident through the admin API, so it also
>   survives a roster change. **−2**
>
> **The 11 left are the ones a script should not touch:** six in `FULL_DATABASE_SCHEMA.sql`,
> which **CLAUDE.md rule 2 forbids editing**; two inside dated records, where a stand-in would
> alter an account of what happened; and three team accounts that are not residents'. **The
> decision stays exactly where you put it** — stand-ins in those two records, or making the
> repository private.


### ~~B-07 — a resident with no bill is shown one, with water at ₱0~~ — **FIXED 2026-09-18**

> `TenantOverviewView` now carries `hasBill`, taken from the bills response itself rather than
> inferred from whether the amounts happen to be zero, and the panel asks that instead.
> **Verified both ways:** a resident with no bill sees *"No bill is on file yet."*, and with a
> bill stubbed into the response the panel renders its own **₱4,500 rent and ₱400 water**.


- **Blocked on:** a judgement about what a resident is told, plus `frontend/src/` being actively
  rebuilt. Not mine to patch mid-redesign
- **What is wrong:** the resident portal shows *"Latest bill — Rent ₱4,500 · Water · 1 registered
  occupant · **₱0**"* to a tenant with **no bill on file**, directly above the sentence *"Water is
  charged at ₱200 for each registered occupant every month."* **The screen contradicts itself.**
- **Verified against live data, not inferred:** unit `1F` has `occupant_count = 1`,
  `current_price = 4500`, `/public/rates` returns `waterRatePerOccupant: 200`, and
  `/tenant/my-bills` returns **0 rows**
- **Cause** — `frontend/src/views/TenantOverviewView.vue`:
  - `:195` with no bill, **rent falls back** to the unit's `current_price`
  - `:52` **water has no fallback** and keeps its initial `0`
  - `:458` the *"No bill is on file yet"* guard needs **both** figures falsy, so once rent falls
    back it can never fire
- **Why no check caught it:** `check:liveness` asserts loaders raise flags, flags are rendered, and
  hardcoded rate fallbacks equal the configured rate — **all true here**. Nothing asserts that a
  *derived* figure agrees with the rule printed beside it
- **What you need to decide:** compute `waterFee = occupants × rate` on that path, or — better, and
  what the project's own doctrine argues for — **stop presenting a bill that was never raised** by
  testing whether a bill exists rather than whether its numbers are zero
- **How to know it worked:** a resident with no bill sees *"No bill is on file yet"*, and a resident
  with one sees the bill's own rent and water
- **Raised:** 2026-09-18 by Claude, on Loyd's machine. Full detail: `docs/AUDIT_2026-09-18_FUNCTIONAL.md` § D-1

---

### ~~B-08 — `check:billing` passes everything and still reports failure on Windows~~ — **FIXED 2026-09-18**

> `process.exit()` replaced with `process.exitCode`. The Supabase pool `billingService` opens was
> still closing when the process was torn down, which tripped the libuv assertion. Now exits **0**
> in about four seconds. **Mutation-tested on this tree**: one expectation broken → exit **1**;
> reverted → exit **0**.


- **Blocked on:** nothing; it wants twenty minutes from whoever knows the suite
- **What happens:** 39 assertions pass, it prints **`ALL CHECKS PASSED`**, then exits **127** on
  `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94`.
  **Reproduced on three consecutive runs**, zero `FAIL` lines in the output
- **Effect:** `npm run check:all` reports `FAIL check:billing` on Windows while every billing rule
  it guards is satisfied
- **Why it matters more than it looks:** the doctrine here is *read the summary table*. A suite
  that is permanently red for a reason unrelated to its assertions **teaches people to read past
  red**, and a red check has already been committed past twice on this project
- **Likely cause:** an open handle at exit — a timer or socket not closed before the process ends.
  Not a defect in the billing rules
- **How to know it worked:** `npm run check:billing; echo $?` prints `0`
- **Raised:** 2026-09-18 by Claude, on Loyd's machine

---

### B-06 — two comments call the deposit "not a refundable security deposit". It is one

> [!NOTE]
> **Reduced 2026-09-18, an hour after it was raised, and the figure is fine.** The owner: *"The
> labeled advance is actually the deposit."* **Advance is her word for the held sum; a deposit is
> what it does.** So `deposit_amount` holds the right money, **`56c49c0`'s 1× default is correct**
> (the held sum equals one month's rent — BR-039), and the `current_price * 2` default you removed
> would have doubled it. **No migration, no second column, no settlement engine** — the repairs and
> the refund are expense entries she writes by hand.
>
> **All that is left is two wrong sentences in comments.** The detail below is kept because it is
> the record of how it looked before her last answer. Full reconciliation:
> `PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5.
>
> **What you actually need to do:** correct `admin.ts:577-594` and `:800`, which say *"ADVANCE
> RENT, not a refundable security deposit … this business collects no separate damage or security
> sum (OD-04, confirmed 2026-09-13)"*. **Both halves are contradicted**: it is refundable, and it
> is the damage sum. The data check proposed below is no longer needed.

- **Blocked on:** your call, not access. It is `backend/src/`, it was your change, and it wants a
  decision before the next onboarding rather than a patch from this side
- **What happened:** commit `56c49c0` made `deposit_amount` default to `rooms.current_price` —
  **1× rent** — reasoning *"OD-04 makes that definitional: this sum is ADVANCE RENT, not a
  refundable security deposit."* **Asked on 2026-09-18 whether the move-out repair money is the
  same money as the move-in month's rent, the owner said: *"It's not the same money — it will be
  different."*** So there is a deposit, separate from the advance
- **The uncomfortable part:** the default `56c49c0` replaced was `current_price * 2`, which the
  code describes as *"the familiar one-month-advance-plus-one-month-deposit arrangement, which
  invented a figure that was never collected."* **On her answer, that is the arrangement she
  runs** — so the 2× default may have been right, and was removed on a reading she has since
  contradicted
- **What I already did:**
  - Worked the consequences through in `PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5, including why
    **BR-039 as written survives**: *a tenant's **deposit** … **equal to** the Rent Amount* is a
    deposit the size of one month's rent, not a sum that **is** the rent. The 14 Sep
    reinterpretation is the deviation, not the rule
  - Established the blast radius. The deposit is **Column 12** and is **excluded from Column 10,
    Remitted Amount**, so **no owner-facing total moves**. `check:ledger` passes on 937 rows;
    `check:reports` still agrees with both workbooks. **A modelling error, not money going astray**
    — but it lands on the next onboarding, and Q10 says a vacated unit re-lets within days
  - Left `backend/src/` untouched. Two comments there — `admin.ts:577-594` and `:800` — now assert
    something the owner has contradicted, including *"this business collects no separate damage or
    security sum (OD-04, confirmed 2026-09-13)"*
- **What you need to decide:** whether `room_assignments` carries a **second** figure for the
  advance, and what the onboarding default becomes. Then correct those two comments — they are the
  judgement log's own lesson made flesh: a comment explaining why something is safe, carrying a
  date that has now passed
- **What would narrow it without asking her again:** `deposit_amount` against each unit's price
  across the 32 live tenancies. Clustering at **1×** points one way; any at **2×** the other.
  Read-only, and **not run — it needs approval for a production read**
- **The one question still hers**, written out in § 1.5: does a tenant hand over **two** amounts at
  move-in, or just the deposit and their first month as normal
- **How to know it is settled:** BR-039's crosswalk status is re-argued deliberately rather than
  inherited, and an onboarding on `PH` records what she actually collects
- **Raised:** 2026-09-18 by Claude, on Loyd's machine

---

### B-01 — the public landing shows every unit as vacant when `/public/rooms` fails

- **Blocked on:** a decision that is not the design account's to make — this is what a screen
  computes, not how it looks, so per `HANDOFF_TO_DESIGN.md` § 1 it was written down instead of
  reached across for.
- **What I was doing:** rebuilding the public landing's category section. The counts are
  unchanged from the cards that stood there; the redesign only made them legible.
- **What I already did:** nothing to the data path. The category plates read the same
  expression the old cards did: `liveUnits.filter(c.match).filter(u => u.status === 'vacant')`.
- **The defect:** `rooms` is seeded from `CANONICAL_UNITS`, whose `status` is vacant for all 33
  units (`frontend/src/lib/systemState.ts:287`). `fetchRooms()` sets `roomsFetchFailed = true`
  on failure (same file, ~636) **but the seed stays in `rooms`**, and `PublicGuestView` never
  reads that flag. With the backend down the page told me *"10 vacant of 10 units"*, *"15 vacant
  of 15 units"*, *"8 vacant of 8 units"* — 33 of 33 free, on a property that is 32 occupied.
  This is the failure path of the same defect the comment at `PublicGuestView.vue` ~line 121
  says was fixed: the source now fetches live, the *fallback* still publishes the seed silently.
- **What Sean needs to do:** decide what a prospective boarder should see when the room list
  cannot be reached — suppress the counts, or show them with an explicit "availability
  unavailable" state. Either is a small change in `PublicGuestView.vue`; the design account can
  implement the state once the call is made.
- **How to know it worked:** stop the backend, load `/public`. The page must not claim a
  vacancy it cannot verify. With the backend up, the three counts should sum to 1 vacant of 33,
  not 33 of 33.
- **Raised:** 2026-09-17 by the design account (Kiel's machine)

### B-05 — Apply `database/migrations/027` to remove two test repair tickets

- **Blocked on:** Claude Code's safety check refused the live-database change on 2026-09-18,
  although Sean had authorised it in chat. Applying it needs a person.
- **What I was doing:** removing two junk tickets on unit 1A from the live database. Both still read
  Submitted, so they sat on the landlady's overview as open repair requests. One title is a slur.
- **What I already did:**
  - Ran `npm run backup`. The folder is `backups/2026-09-17T17-20-27/` (UTC).
  - Read `pg_constraint`: both foreign keys into `maintenance_tickets` cascade, and neither ticket
    has an attachment or message.
  - Read `pg_trigger`: the table has no triggers.
  - Wrote `027_remove_test_maintenance_tickets.sql`. It identifies the rows by id plus a title
    hash, so the slur is not in the repository, and it aborts unless exactly those two rows match.
    It also removes the one notification that points at a removed ticket. `audit_logs` is left
    alone on purpose.
- **What Sean needs to do:** apply the file's contents to the live database, the same way as
  023. Paste it into the Supabase SQL editor, or approve the `apply_migration` call when asked.
- **How to know it worked:**
  - The migration raises the notice `027: removed 2 test tickets and 1 notification`.
  - `select count(*) from maintenance_tickets` goes from **5 to 3**.
  - The admin overview's *Open repair requests* tile reads *No repair requests are open*.
- **Raised:** 2026-09-18 by Claude, on Sean's machine

---

## The ones already known, carried over

### ~~B-01 · 17 Sep — Rotate the two demo passwords~~ — **CLOSED, it was already done**

> **Dated in its heading because the number was reused.** The open `B-01` further up is the
> landing-page fault, and that one keeps the bare number: it is cited in `HANDOFF_TO_DESIGN.md`,
> in `PROGRESS_REPORT.md`, and in a code comment at `PublicGuestView.vue:402`. This entry is
> closed and nothing points at it, so it is the one that moves.

**Do not rotate them again.** Doing so would break `check:api`, `check:reports` and three others
on whichever machine still holds the old `creds.txt`, for no gain.

This sat on the list because `Hivelet@Admin2026` and `Hivelet@Tenant2026` are in the public
history. They are — **16 and 21 commits** respectively, and they always will be. What nobody had
checked is whether that still matters. It does not:

| Checked 2026-09-17 | |
| :--- | :--- |
| the **current** passwords in `credentials/creds.txt` | **0 commits** contain either. They were never committed |
| the **old** admin password, tried against the live login | **401 `INVALID_CREDENTIALS`** |
| the **old** tenant password, same | **401 `INVALID_CREDENTIALS`** |
| `check:api` afterwards | **75/75**, which also reset the failed-login counter those two attempts raised |

So the rotation happened on **2026-09-13**, `creds.txt` records it, and the leaked pair opens
nothing. The exposure is historical and closed.

*The lesson is the one from the judgement log, applied to a task list rather than a comment: a
TODO is a claim with a date on it too. This one had been true, stopped being true, and would have
cost an hour and a broken teammate's setup before anyone noticed.*

### ~~B-02 — Apply `database/migrations/023`~~ — **APPLIED 2026-09-17**

Three duplicate profiles from the 27 Aug import were `active` and held a working password on the
shared literal. Applied on Sean's instruction, after `npm run backup` and after re-verifying all
four of the migration's own guards: **0 room assignments, 0 income rows, 0 bills, 0 payments** on
each.

| Read back after applying | |
| :--- | :--- |
| `Mireel Fatima ParcareyINV.#5223` | **inactive** |
| `Nikki ProllamanteINV#5212` | **inactive** |
| `Ron Juliene DominguinoINV.#5227` | **inactive** |

Nothing else moved: active profiles **44 → 41**, active tenancies still **32**, income rows still
**937**, `check:ledger` reports no anomaly and all seven pinned rows are still pinned.

*The invoice numbers stay in the names. Stripping them was the original plan and would have made
these three indistinguishable from the real residents.*

### B-03 — The Adyen webhook is shared, so only one machine can receive at a time

- **Blocked on:** coordination, not access. **Both machines have the keys.** There is one webhook
  registered with Adyen, and it can point at exactly one tunnel
- **What I was doing:** n/a until someone tests a real GCash payment
- **What I already did:** `check:adyen` runs anywhere (29 HMAC checks, no network), so signature
  handling stays covered on both machines regardless
- **What is needed:** whoever is testing starts `cloudflared tunnel --url http://localhost:5000`
  and repoints the webhook at their own URL. **The address changes on every restart** — a reboot,
  a power cut, or closing the terminal — and when it does, payments silently go nowhere. Say in
  the group chat when you take it
- **How to know it worked:** a real payment produces a `Pending Verification` row and the webhook
  handler logs it
- **Never:** generate a new HMAC key unless you are deliberately creating a *second* webhook.
  Adyen issues that key and keeps its own copy to sign with, so a different value makes every
  notification fail verification — indistinguishable from a broken integration, and horrible to
  debug
- **Raised:** 2026-09-17

> **Standing note on this one:** the gateway is **configured and working** against Adyen's
> developer sandbox with GCash. It is not a mock, not a simulator, and not pending a decision.
> `check:canon` fails the build on any document that says otherwise.

### B-04 — Run `TESTING_REHEARSAL.md`

- **Blocked on:** nothing technical — it just needs a person, about forty minutes, and a real
  browser
- **What I was doing:** 26 steps that exercise **every write path once**. No write path in this
  system has ever been used by a human being
- **What I already did:** the document is written, every writing step carries an Undo, and it
  runs on `PH`, the only vacant unit
- **Assigned 2026-09-17: Loyd, tonight.** He has full access and is already in the repository.
  Tick the boxes in the file as you go and commit them — a half-filled sheet is still evidence,
  an unfilled one is not
- **Do the garbage fee while you are in there.** Step 18 records an on-site collection; type a
  **non-zero** GBG figure. Until today that number was collected, added to the total, printed on
  the receipt and recorded as **₱0.00**. It is wired now and **no human has ever entered one**
- **How to know it worked:** the sheet is filled in, and step 23b in particular shows em dashes
  rather than ₱0.00 with the backend stopped
- **Raised:** 2026-09-17
