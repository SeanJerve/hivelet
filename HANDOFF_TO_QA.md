# Handoff — QA and Systems Analysis (Eljohn)

**Eljohn Paulo C. Loterte.** The repository still records you as Frontend / UI-UX and Kiel as
QA — **you and Kiel have swapped**, confirmed 17 Sep. Kiel owns the interface now; you own
whether any of this actually works.

Hivelet runs the **Fe Galang Da Silva Boarding House**. The database is live: **937 income rows,
1,327 expense allocations, 33 units with 32 occupied.** Mrs. Da Silva keeps her books in it.
There is no staging copy.

---

## 1. The one sentence that defines your job

> **Eighteen automated suites pass. No human being has ever clicked through this system.**

Every claim made about Hivelet this week was verified through the API or against the database.
Not one write path — recording a payment, raising a bill, closing a ticket, vacating a tenant —
has been exercised by a person through the interface.

That gap is exactly what testing week measures, and it is yours to close.

---

## 2. Start here: `TESTING_REHEARSAL.md`

27 steps, about forty minutes, **every write path once**. It runs on `PH`, the only vacant unit,
with a fake tenant, and every writing step carries an Undo.

**Tick the boxes in the file as you go and commit them.** A half-filled sheet is evidence; an
unfilled one is not.

Three steps matter more than the rest:

| Step | Why |
| :--- | :--- |
| **19** | Records the same receipt twice. It must be **refused**. If it accepts, the ledger can double-count and the duplicate guard is broken |
| **23b** | With the dashboard open, **stop the backend** and reload. Every money tile must show **—**, never ₱0.00, and Net Operating Income must not equal Gross Inflow. Before 17 Sep it showed a whole year's takings as profit |
| **18** | Records an on-site collection. **Type a non-zero garbage fee.** Until 17 Sep that number was collected, added to the total, printed on the receipt and recorded as ₱0.00. It is wired now and nobody has ever entered one |

**Read "What this rehearsal cannot tell you" at the end.** It is the honest list of what forty
minutes does not cover — concurrency, volume, and a completed GCash payment.

---

## 3. What the suites do and do not prove

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

**Read that summary table, not the tail.** `| tail` shows the end of whichever suite ran last, and
a red check has been committed past that way twice.

| | |
| :--- | :--- |
| `check:api` | 76 endpoint, RBAC, perimeter and input checks. **Performs no writes** — deliberately safe against production |
| `check:ledger` | Arithmetic and plausibility over the live money. Re-derives every remitted amount and 50% figure on all 937 rows |
| `check:reports` | 490 assertions. Both workbooks against the database, month by month, every year |
| `check:billing` | Water, period and receipt-allocation arithmetic |
| `check:adyen` | 29 HMAC signature checks, no network |
| `check:writes` | No database write discards its result |
| `check:columns` `check:fields` `check:endpoints` | Schema, field and route reachability |
| `check:canon` `check:rules` `check:matrix` `check:copies` | Wording and register consistency |
| `check:tokens` `check:reachable` `check:liveness` | The interface. Kiel's lane, but they are yours to run |

**Twelve run on a bare clone. Fifteen with `.env`. All eighteen with the backend up and
`credentials/creds.txt`.** Neither file comes down with a pull; ask Sean for both. `creds.txt`
also powers the one-click demo sign-in buttons on the local login page.

> `check:liveness` runs **4 of its 7 rules without a backend and still exits 0**, printing `note:`
> lines about what it skipped. Read the notes, not the exit code.

---

## 4. The lesson most useful to a QA lead here

**A check can pass having examined nothing.**

Proved on 17 Sep by copying two suites somewhere their input tree was empty. Both went green:

```
check:writes   exit 0   "every write declares what failure means"   — having read ZERO files
check:canon    exit 0   "the locked wording stays locked"           — having read ZERO files
```

Those guard every database write and the locked wording respectively. Both now refuse to pass on
an empty scan and report what they read — *"(32 source files read)"*, *"623 files read"*.

**Point this at anything you are handed.** The question is never "did it pass" but "what did it
examine, and would it have said the same having examined nothing".

**There was a live example of exactly that, in `check:api`. It is fixed, and it will come back on
any machine that lacks one gitignored file — so the shape is worth keeping in mind.**

The suite discovers a tenant login by reading **`database/seeded-tenant-credentials.json`** —
gitignored, and absent on at least one machine. With the file missing, the login loop never runs,
and two blocks sit behind `if (tenantToken)` with **no `else`**: the **8 `/tenant/*` endpoint
checks**, and the **1 isolation check** — *a tenant must not reach admin data*, which is the
single assertion proving RBAC holds.

**Skipped checks are not counted as failures.** The only thing in the output that says a third of
the suite did not run is one line:

```
TENANT (none found) - token FAILED
```

So **read the total, not just the zero.** A lower total with `0 failed` means checks were skipped,
not passed. If that line says `none found`, ask Sean for the file — and **do not commit it.**

**Measured on 2026-09-18:** without the file the suite reported **58 passed, 0 failed**; with it,
**76 passed, 0 failed**. Eighteen checks were not running, and one of them was the assertion that
proves a tenant cannot reach admin data.

*The generalisable form: an absent input that disables an assertion looks exactly like an
assertion that passed.* When you write a check, make a missing precondition **fail**, or at
minimum print a count that does not add up.

**The companion discipline: mutation testing.** A check that has never failed on purpose has not
been verified. Break each shape it claims to catch in a real file, confirm it fails, revert in a
`finally`. Three times on 17 Sep the *plumbing* of a mutation test was wrong rather than the rule
— once it inferred "caught" from an exit code that a server restart had produced. **Assert on the
specific message, not the exit code.**

---

## 5. The seven receipts, and why they are pinned rather than fixed

`check:ledger` found seven entries in the owner's books that **cannot be right as written** — two
impossible dates, three rent periods ending the day before they start, two receipt numbers used
twice. It pins them by receipt number and prints all seven on every run.

Its header says why: *"correcting one means knowing what it should say, which is hers to tell us,
not ours to infer."*

**Anything not on that list of seven fails the run immediately.** So a typo entered during your
rehearsal is caught on the next run, while the historical seven wait for an answer. Loyd is
putting them to his mother; when one is corrected, `check:ledger` **fails** saying the row is
pinned but now reads clean. **That failure is the confirmation the fix landed.**

---

## 5b. The systems-analysis half of the title

Your role is **QA and Systems Analysis**, and the second half is not test work. It is getting what
only Mrs. Da Silva knows out of her head and onto paper, and keeping the record of it honest.

**The authoritative list of what is genuinely unresolved is
`docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md` (OD-xx).** **Not**
`docs/08_OPEN_DECISIONS.md` — despite its filename, everything in that file is *closed*, and it
carries a banner saying so.

**`CLIENT_MEETING_QUESTIONS.md`** is the sheet for her: the seven receipts, five accounting
habits, three quick confirmations, and four things her public website tells strangers that nobody
has confirmed.

**Two rounds of answers came back on 17 Sep and are recorded in `CLIENT_ANSWERS_2026-09-17.md`**,
which also carries the findings still open — the grace period (resolved: late on day one, with a
week before she presses), the deposit (**contested**, see below), rent and water paid separately,
and the fact that **nothing in the system tells a resident their rent is due or late.**

> **The one to know about: `OD-04` is CONTESTED, not settled.** The owner described the move-in
> sum one way on 13 Sep — cited in live code at `backend/src/routes/admin.ts:800` **with that
> date** — and differently on 17 Sep. **Both answers are recorded and neither is discarded.** One
> question separates them, written up at `PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5. **Nothing is
> to be designed or built from either until it is asked.**

**How to record an answer**, and this is the part that has cost this project most:

- **In her words, next to the question. Never paraphrase a number.**
- **If she contradicts something written down, write down both and flag it.** The contradiction
  is the finding. *Resolving it by picking one is how eight business rules were recorded wrongly.*
- **Say how you know.** A relayed, dictated answer and a minuted one are not the same evidence,
  and the record should say which it is.

---

## 6. Where to look when something is odd

| | |
| :--- | :--- |
| `docs/13_AUDIT_JUDGEMENT_LOG.md` **§ 3** | **Read before reporting a bug.** Several things that look wrong are deliberate and say why: bills raised on demand, the receipt guard being code-only, Linda excluded from grand totals, the lockout message that enumerates accounts |
| § 2 of the same file | The defect classes worth re-running, and the ten sweeps that found them |
| `docs/SCREEN_CONTRACT.md` | Every screen, every call, which ones write. **Read the totals off its own footer** — it is generated, so a figure quoted elsewhere goes stale |
| `docs/02_BUSINESS_RULES.md` | The rules themselves |
| `BLOCKED_FOR_SEAN.md` | The queue. **Add to it rather than stopping** |

**The recurring lesson**, and it applies to test plans as much as code:

> A comment explaining why something is safe encodes a precondition. When the code around it
> changes, the precondition can fail silently and the comment keeps asserting the conclusion.
> **Read them as claims with a date on them, and check the date.** On 17 Sep that caught four
> "open" items that were already done, and one comment that was exactly backwards.

---

## 7. Working here

- **Never stop because something is out of reach.** Write it into `BLOCKED_FOR_SEAN.md` with
  enough detail to act on cold, and move on.
- **Pull before you start and before every push.** Three accounts share this repository: backend
  and database, `frontend/src/` (Kiel), documentation (Vince). You range across all of it — so
  pull often.
- **Report what you verified against, not that you verified.** "It typechecks" is not
  verification; `vue-tsc` exits 0 on a component that does not exist.
- **Ask rather than decide.** A failing test is a question until someone confirms what the
  behaviour should be.

**Start by running `npm run check:all`, then open `TESTING_REHEARSAL.md` and do it.**
