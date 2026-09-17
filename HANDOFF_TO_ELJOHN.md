# Handoff — Eljohn, Systems Analyst & QA — 2026-09-17

**Written for Eljohn ("Eljon") and for whoever is working alongside him.** Two jobs in one seat:
**QA**, which is proving the system does what the documents claim, and **analyst**, which is
getting the questions only Mrs. Da Silva can answer out of her head and onto paper.

> [!IMPORTANT]
> **Role note.** The submitted Module 02 answer sheet
> (`CAPSTONE ACTS/Module 02 - System Construction and Development.md`) records **Eljohn Paulo C.
> Loterte — Frontend Developer / UI/UX Designer** and **Kiel Hedrix V. Relos — Quality Assurance
> / Systems Analyst**. The split assigned on 2026-09-17 is the other way round. The answer sheet
> is a **submitted** deliverable naming who did which requirement, so it needs a dated amendment
> rather than a quiet edit. **That is Vince's item** (`HANDOFF_TO_VINCE.md` § 5).

---

## 0. The five rules, and the one that binds QA hardest

`CLAUDE.md` at the repository root has all five. This is the one for your seat:

> **Verify before you report, and say what you verified against.** "It typechecks" is not
> verification. `vue-tsc --noEmit` exits 0 on a component that does not exist — tested here, not
> assumed.

And the standing reason it is written that way: a "defect" about generated columns storing
`0.00` was **repeated in nine documents and recorded as two business-rule violations.** It was
never true, and the remediation it proposed would have broken every income-record write.

**The database is LIVE** — 937 income rows, 1,327 expense allocations, 33 units, 32 occupied,
no staging copy. Every change to schema **or data** is a new numbered migration in
`database/migrations/`. `025` is the latest; number yours from `026`. Never an ad-hoc `UPDATE`,
and `npm run backup` before the first data change of a session.

---

## 1. Seventeen suites, and what runs on which machine

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

| You have | Suites that run |
| :--- | ---: |
| a bare clone, `npm install` | **11** |
| **+ `.env`** | **14** (adds `columns` `fields` `ledger`) |
| **+ backend running, + `credentials/creds.txt`** | **17** (adds `api` `reports`) |

The full list, in the order `check:all` runs them: `secrets` `rules` `matrix` `copies` `canon`
`tokens` `reachable` `liveness` `writes` `columns` `fields` `endpoints` `ledger` `reports`
`adyen` `billing` `api`.

---

## 2. Three ways a green run lies, all of them already paid for

This is the most useful thing in this document. **A suite that exits 0 is not the same as a suite
that ran.**

### 2.1 `| tail` shows the wrong suite

`check:all` prints every suite's own output in full, then a summary table. Piping to `tail` shows
the end of **whichever suite ran last**, not the verdict. **A red check has been committed past
that way twice.** Always `grep -E "^  (pass|FAIL)"`.

### 2.2 `check:liveness` runs 4 of its 7 rules without a backend — and still exits 0

It prints `note:` lines saying what it skipped. **Read the notes, not the exit code.** A green
liveness on a machine with no backend is not the check Sean runs.

### 2.3 `check:api` silently skips the tenant half of itself

This one is worth understanding line by line, because nothing in `CONTINUE_HERE.md` mentions it.

`backend/scripts/check-api-contract.mjs` discovers a tenant login by reading
**`database/seeded-tenant-credentials.json`** — gitignored, and **absent on this machine as of
2026-09-17** (checked). With the file missing, `seeded` is `[]`, the login loop never runs, and
both of these blocks are gated behind `if (tenantToken)` with **no `else`**:

- the **8 `/tenant/*` endpoint checks**, and
- the **1 isolation check** — *a tenant must not reach admin data*, which is the single assertion
  proving RBAC holds.

Skipped checks are **not counted as failures**. The only thing in the output that says a third of
the suite did not run is one line:

```
TENANT (none found) - token FAILED
```

The full run recorded on 2026-09-17 was **75/75**. So: **read the total, not just the zero.** A
lower total with `0 failed` means checks were skipped, not passed. If the tenant line says
`none found`, ask Sean for `database/seeded-tenant-credentials.json` — and **do not commit it**.

> The generalisable form, and it is the recurring lesson of this project: **an absent input that
> disables an assertion looks exactly like an assertion that passed.** When you write a check,
> make a missing precondition *fail*, or at minimum make it print a count that does not add up.

---

## 3. The rehearsal — the biggest open QA item in the project

**`TESTING_REHEARSAL.md`. 26 steps, about forty minutes, every write path exercised once.**

> **No write path in this system has ever been used by a human being.** Not once. All 937 income
> rows and 1,262 expense entries came from the 2026-08-28 migration.

It is queued as **B-04** in `BLOCKED_FOR_SEAN.md`, assigned 2026-09-17, and it is blocked on
nothing technical — it needs a person, a browser and forty minutes.

How to run it so the result is evidence:

- It runs on **`PH` (Penthouse, ₱12,000)** — the only unit of the 33 not currently occupied — with
  a made-up tenant. No real resident, receipt or expense is touched.
- **Every writing step is marked ✍ and carries an Undo.** Do them in order; the undos run in
  reverse at the end.
- `npm run check:all` **before and after**. A suite green before and red after tells you exactly
  what the rehearsal broke.
- **Tick the boxes in the file as you go and commit them.** A half-filled sheet is still
  evidence; an unfilled one is not.
- **Step 18 — the garbage fee.** Type a **non-zero** GBG figure. Until 2026-09-17 that number was
  collected at the counter, added to the total, printed on the receipt and recorded as **₱0.00**.
  It is wired now and **no human has ever entered one.**
- **Step 23b** should show em dashes rather than ₱0.00 with the backend stopped. That is the
  liveness principle from § 2 rendered on a screen.
- **A step that fails is the point of doing this.** Better now than in front of the panel.

Two stale things in that file to fix while you are in it — QA work in its own right: it says
**"Fifteen green"** and *"covered by fifteen verification suites"*. **There are seventeen.**

---

## 4. `check:ledger` and the seven pinned receipts

`check:ledger` re-derives the whole ledger — every `remitted_amount` and every 50% figure against
its formula, on all 937 rows. Seven entries **cannot be right as written**, and rather than
silencing them it **pins them by receipt number** and prints all seven on every run.

| Receipt | What is wrong |
| :--- | :--- |
| **OR#4839** | `date_paid` is **1900-01-17** — the Excel epoch, so the source cell never parsed. Room 2g, ₱6,500 |
| **INVOICE#5120** | `date_paid` is **2027-02-26**, against a 2026 rent period. Reads as a mistyped year. Room 1c, ₱8,000 |
| **OR#4757** | rent period ends the day before it starts: 2024-08-03 → 2024-08-02. Room 1h |
| **OR#4775** | same shape: 2024-08-30 → 2024-08-29. Room 2b |
| **OR#4872** | same shape: 2025-02-03 → 2025-02-02. Room 1h |
| **OR#4774** | one receipt number against **two rooms** (3f, 3g), same tenant, twelve days apart |
| **OR#4813** | one receipt number against **two different tenants** on the same day. Two people cannot share one official receipt |

**The check is waiting for the receipt book, not for a fix.** Its own header says why: correcting
one means knowing what it should say, which is hers to tell us and not ours to infer. Three look
like an off-by-one and one looks like a mistyped year — and *looking like* something is exactly
how this project has gone wrong before.

The loop, once an answer exists: `npm run backup` → look the receipt up and **ask her** → write
`database/migrations/026_...sql` with the evidence in the header (what the paper says, who
confirmed it) → apply → `npm run check:ledger`. **It will FAIL**, saying the row is pinned but now
reads clean. That failure is the confirmation. Delete the line from `KNOWN` in
`backend/scripts/check-ledger-integrity.mjs` and commit it **with** the migration. If it does not
fail, the correction did not land.

**Anything not on the list of seven that becomes anomalous fails the run immediately** — so a typo
entered tonight is caught on the next run while the historical seven wait for an answer.

---

## 5. Defect classes worth re-running, and calls you must not "fix"

**`docs/13_AUDIT_JUDGEMENT_LOG.md` is your reading.** Two sections do opposite jobs:

**§ 2 — defect classes that paid off, and how to run them again.** Ten recorded sweeps. The
highest-yield ones to re-run against new code:

- *asking what is REACHABLE* (the ninth sweep — and it was wrong four times on the way, which is
  itself the lesson),
- *the code, not the documents* (the seventh),
- *what a register does when nobody reads it against the code* (the eighth),
- *a comment that explains why something is safe is a claim with an expiry date* (the tenth).

That last one is the house rule, and it generalises past comments:

> **A comment explaining why something is safe encodes a precondition.** When the code around it
> changes, the precondition can fail silently and the comment will keep asserting the conclusion.
> Read them as claims with a date on them, and check the date.

**§ 3 — judgement calls a fresh reader might reverse. Read this before filing anything as a bug.**
These look wrong and are deliberate, and each says why: bills raised on demand rather than by a
scheduler (3.6); the receipt guard being code-only (3.6b); **Linda excluded from grand totals**
(3.5); the lockout message enumerating accounts (3.8); which multi-table writes are atomic and
what the other twelve do instead (3.7); nothing ever written to production to test anything (3.4).

---

## 6. Writing a new check

Two rules, both learned the hard way:

1. **Mutation-test it.** Break each shape it claims to catch, in a real file, confirm it fails,
   and revert in a `finally`. **A check that has never failed on purpose has not been verified.**
2. **Make it narrow and say so.** `check:rules` deliberately validates the crosswalk *against
   itself* — status cells present, row and summary agreeing, no status outside the legend — and
   explicitly does **not** judge whether a status is correct. Knowing what a check does not claim
   is what stops it being cited as proof of something else.

---

## 7. The analyst half — what only a person can settle

**`CLIENT_MEETING_QUESTIONS.md`** is the single biggest blocker in the project. It is written to
be answerable in one sitting, with a place to write each answer, and organised so nothing needs a
technical explanation first.

| § | |
| :-- | :--- |
| **1** | the seven receipts above |
| **2** | five things about how she keeps the books — the ₱20 garbage fee stopping after June 2025, August and September 2026 missing entirely, penthouse spending filed in three places none of which is the Penthouse, Linda's water column, and **₱2,560,641 booked as non-rental in 2025** |
| **3** | three quick confirmations where a sensible default is already chosen |
| **3b** | four things her public website tells strangers. Two check out. **Two exist nowhere but that page** — "₱12.50 / kWh" and "readings are recorded on the 25th". **No check can ever verify them** |
| **4** | Sean's calls, not hers |

**How to record an answer:** in her words, next to the question, and **never paraphrase a
number**. If she says something that contradicts a document, **write down both and flag it** — the
contradiction is the finding. *Resolving it by picking one is how this project got eight business
rules wrong.*

The authoritative list of what is genuinely unresolved is
**`docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md`** (OD-xx). **Not**
`docs/08_OPEN_DECISIONS.md` — despite the filename, everything in that file is *closed*, and it
carries a banner saying so. **OD-04 needs a schema migration once it is answered.**

---

## 8. When something is out of reach

`BLOCKED_FOR_SEAN.md` is **a queue, not a discussion**. Five fields, and the rule for filling them
in is that Sean reads your entry **cold, possibly at midnight**: what is blocked, what you were
doing, what you already finished, the smallest concrete action, and how he will know it worked.

**Never stop working because of one of these.** Record it and move on. Currently open: **B-02**
(migration `023` — three duplicate profiles holding working passwords; written, reviewed, one
statement, needs applying — **do not strip the invoice numbers from the names**), **B-03** (one
shared Adyen webhook, so only one machine can receive at a time; **never generate a new HMAC
key**), and **B-04** (the rehearsal, § 3). **B-01 is closed** — do not rotate the demo passwords
again; doing so breaks `check:api`, `check:reports` and three others on whichever machine still
holds the old `creds.txt`.

---

## 9. Where everything else is written down

| | |
| :--- | :--- |
| `docs/13_AUDIT_JUDGEMENT_LOG.md` | § 2 the defect classes, § 3 the deliberate calls, § 4 traps that cost real time |
| `TESTING_REHEARSAL.md` | the 26 steps, and "What this rehearsal cannot tell you" |
| `docs/02_BUSINESS_RULES.md` | the canonical register. `check:rules` keeps the crosswalk honest with itself |
| `docs/SCREEN_CONTRACT.md` | every screen, every call, which ones write. Generated by `npm run contract` |
| `CLIENT_MEETING_QUESTIONS.md` | everything the owner must decide |
| `CONTINUE_HERE.md` § 0.0 | what the last working day produced and what it needs from a person |
| `CLAUDE.md` | the five rules |

**Two standing facts documents here have been wrong about:** the property is **33 units, not 32**
(32 occupied), and **no "2% annual increase" rule exists** — the owner sets rates by hand and only
the change history is kept. `check:canon` fails the build on either.
