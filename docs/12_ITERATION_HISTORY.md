# HIVELET — ITERATION HISTORY

**Project:** Hivelet — A Web-Based Apartment Management System for Fe Galang Da Silva Boarding House
**Client:** Mrs. Fe Galang Da Silva, proprietor — Legazpi City, Albay
**Team:** Bicol University Group 4 — IT 124 Capstone Project 2
**Method:** Agile, three planned iterations
**This document covers:** Iteration 1 (complete), Iteration 2 (complete), Iteration 3 (planned)
**Last updated:** 2026-09-14

---

## 0. How to read this document

This is the iteration record for an agile project. It exists so that a reader can see
not only *what* the system does, but **how the team's understanding of it changed** —
which is the thing an iterative method is supposed to produce and the thing a single
final report usually hides.

Three conventions are used throughout, and they matter:

| Convention | Meaning |
| :--- | :--- |
| **Recorded** | Backed by an artefact in this repository — a commit, a migration, a database query, a dated register entry. Every such claim names its evidence. |
| **Client-settled** | Confirmed by Mrs. Da Silva on a stated date. These are decisions the team does not have standing to make. |
| **Open** | Genuinely unresolved. Listed as such rather than filled in with a plausible assumption. |

**Nothing in this document is inferred from memory.** Where a conversation happened but
no minute survives, that is stated plainly rather than reconstructed. Section 2 marks
exactly where that applies.

### Why the iteration boundary falls where it does

The boundary is not arbitrary and is not a calendar convenience. It is visible in the
commit history:

| | Iteration 1 | gap | Iteration 2 |
| :--- | :--- | :--- | :--- |
| **Dates** | 2026-07-24 → 2026-08-28 | 2026-08-29 → 2026-09-11 | 2026-09-12 → 2026-09-14 |
| **Commits** | 95 | 0 | 87 |
| **First** | `8100c83` | — | `cc10d98` |
| **Last** | `1438595` | — | `0d29e77` |

The fourteen-day gap is the Module 01 preparation and submission window. Iteration 2
opens with the submission documents entering the repository (`cc10d98`) and immediately
becomes something different in character from Iteration 1 — see Section 4.

---

## 1. The three iterations at a glance

| | **Iteration 1** | **Iteration 2** | **Iteration 3** |
| :--- | :--- | :--- | :--- |
| **Name** | Construction | Verification and Correction | Consolidation |
| **Status** | Complete | Complete | Planned |
| **Goal** | Build a working system against the client's existing paper and spreadsheet workflow | Establish that what was built and what was documented are the same thing, and correct where they are not | Close the client-gated decisions and extract the service layer |
| **Dominant activity** | Feature development | Audit, correction, regression-proofing | Elicitation, then implementation |
| **Commits** | 95 | 87 | — |
| **Entry condition** | Client workflow documented | Module 01 submitted | Nine client decisions answered |
| **Exit condition** | A demonstrable system | Every claim traceable to evidence | — |

The shape of the project is worth stating directly, because it is the central lesson of
the engagement: **Iteration 1 built the system; Iteration 2 discovered that a
substantial part of what the team believed about that system was not true.** Neither
iteration was wasted, and the second was not a failure of the first. It was the
verification pass that an iterative method exists to make room for.

---

## 2. Client engagement record

This section is the documented interaction with the client and with the proposal panel.

> **A necessary caveat, stated once.** The team did not keep verbatim minutes of every
> client conversation. What follows is the set of client decisions for which a dated,
> evidenced record exists in this repository. Where a conversation is known to have
> happened but no minute survives, it is not reconstructed here. **If the team holds
> written or recorded minutes, they should be attached to this document as an appendix**
> — that is the one gap in this record, and it is a process gap, not a factual dispute.

### 2.1 The client's existing system — the requirements baseline

The client does not operate from nothing. She keeps a spreadsheet workbook with two
tabs, and that workbook is the authoritative statement of how this business runs:

| Source | What it establishes | Documented at |
| :--- | :--- | :--- |
| **Monthly Income Report** tab | The income ledger's columns, the cluster grouping, OR numbering from her physical receipt book, the footer totals | `docs/09_MONTHLY_INCOME_REPORT.md` |
| **Monthly Expenses Report** tab | A fixed thirteen-line chart of accounts, and the Property Areas across which one expense may be split | `docs/10_MONTHLY_EXPENSES_REPORT.md` |

**937 income rows and 1,327 expense allocations were migrated from this workbook** and
are live in the system today. Every OR number in the ledger (`OR#4627` and so on) comes
from her receipt book. This is why the system does not invent reference numbers — a
point Iteration 2 had to enforce twice (Section 4.3).

### 2.2 Client decisions on record

All confirmed by Mrs. Da Silva. Each is carried on the Phase 1 errata sheet or the open
decisions register, with evidence.

| Date | Question | What the client settled | Consequence |
| :--- | :--- | :--- | :--- |
| 2026-09-13 | Do tenants need an email address to exist in the system? | **No.** Every tenant is a record; a portal login is optional and separate. | `profiles` decoupled record from login. Closed **OD-09**. |
| 2026-09-13 | Should the system recommend or apply an annual rent increase? | **No.** She edits the room rate herself when she decides to change it. | The automatic rate-adjustment feature was **removed from scope entirely**. `room_price_history` is retained — every manual change is still recorded with the previous rate, the new rate, the effective date and who made it. Closed **OD-11**; errata **E-20**. |
| 2026-09-13 | What is the building's actual shape and unit distribution? | **Three residential floors plus a rooftop penthouse level.** Floor 1 = 11, floor 2 = 11, floor 3 = 10, floor 4 (rooftop penthouse) = 1. **33 units total.** | Settled the 32-vs-33 contradiction that ran through the submitted documents. Closed **OD-13**; errata **E-01**, **E-21**. |
| 2026-09-13 | Does this property grant a grace period on rent? | **No grace period.** | `system_settings.grace_period_days` set to **0** by migration `016`. The rule's "a grace period *may* apply" is honoured — a grace window is one settings row away, and today it is deliberately zero. **BR-012**. |
| Capstone 1 proposal | How are payments collected? | **Cash only**, collected on site. | Recorded in the proposal manuscript. This is the fact that shaped the entire payment discussion below. |

**Two client-settled facts are worth drawing out**, because they are the kind of thing a
development team gets wrong by assuming:

- **The water charge is not a flat fee.** It is registered occupants × a configurable
  rate, seeded at PHP 200. Two units — **LF** and **LB** — are outside that model
  entirely and carry a fixed charge. A system that hardcoded 200 would have been wrong
  about two of the client's units and unable to change the rate without a redeployment.
  Iteration 1 hardcoded it in three handlers; Iteration 2 moved it to settings.
- **The owner sets rates by hand.** There is no escalation of any kind anywhere in this
  system. See the 2026-09-13 row above.

### 2.3 The proposal panel's recommendation

Recorded separately because it came from the **panel**, not the client, and because it
was misreported in the submitted documents in a way that took three corrections to get
right (errata **E-22**).

**The recorded sequence, in order:**

1. The Capstone 1 proposal recorded **cash only**. There was no online payment in scope.
2. At the proposal defense, the panel made **one** recommendation: **explore an online
   payment integration, specifically evaluating Adyen for GCash.** That is the whole of
   it.
3. The team raised that the client accepts cash only.
4. The discussion settled on exploring it as an **optional** feature, so that it is
   available if she changes her mind.
5. The manuscript was revised afterwards to match — which is why Adyen appears exactly
   once in its sixty-one pages.

Three framings of this are **wrong** and are recorded here so that they are not
reintroduced:

| Wrong framing | Why it is wrong |
| :--- | :--- |
| That the panel instructed the team to keep the architecture from becoming dependent on an unconfirmed external service | The panel did not say this. The sentence was composed afterwards, blending the recommendation with the team's own reasoning, and downstream documents then treated it as an instruction. |
| That the proposal already defined online payment as optional | It did not. The proposal recorded cash only. The optional framing came *after* the defense. |
| That the team decided on the optional framing by itself | It was what the discussion settled on, not a unilateral team decision. |

**Current status:** Adyen with GCash is committed, configured against a developer
sandbox, and working. On-site cash remains the primary settlement method, and the
administrator holds a sovereign verification gate (**BR-017**) — a completed gateway
payment is inserted as *Pending Verification* and never auto-settles a bill.

### 2.4 What is still waiting on the client

**Nine decisions.** None of them is a development question; all nine require Mrs. Da
Silva. They should be gathered into **one consultation** rather than raised piecemeal,
and that consultation is the entry condition for Iteration 3.

| ID | Question | Gates |
| :--- | :--- | :--- |
| **OD-01** | Do the report totals show per-month figures, year-to-date, or both? | The Monthly Income Report footer; the Excel export (**BR-049**) |
| **OD-02** | When is the garbage fee charged? | Billing cycle |
| **OD-03** | How is a mid-cycle vacancy prorated? | Billing |
| **OD-04** | Is advance rent refunded or forfeited on move-out? | **Schema** — deposit disposition columns |
| **OD-05** | What does the "Main House" expense area cover? | **BR-041**. It maps to no unit cluster under BR-032 |
| **OD-06** | Which date format does she want on reports? | Presentation |
| **OD-07** | Does a category's cumulative total reset at the calendar year, or run indefinitely? | **Schema** — decides whether the cumulative is a stored column or a computed window. This is the **only** business rule still unenforced (**BR-046**) |
| **OD-08** | May expense categories be edited, or is the thirteen-line chart fixed? | Expense ledger |
| **OD-10** | May tenants submit their own payment records? | Payment workflow |

Three items on this list — **OD-04**, **OD-05** and **OD-07** — require a database
migration once answered, so they gate everything downstream of them.

---

## 3. Iteration 1 — Construction

**2026-07-24 → 2026-08-28 · 95 commits**

### 3.1 What was delivered

A working, demonstrable system, built with AI-assisted development against the client's
documented workflow. By the close of the iteration it had:

- A Vue 3 frontend with admin and tenant portals, and a public-facing site
- An Express/TypeScript backend on Supabase PostgreSQL
- Four-role RBAC (`guest`, `prospect`, `tenant`, `admin`) over an explicit permission
  matrix, with row-level security forced on every table
- The income and expense ledgers, reproducing the client's spreadsheet layout
- **937 income rows and 1,327 expense allocations migrated** from her workbook
- Maintenance ticketing, inquiries, notifications and an audit trail
- 4 numbered migrations · 5 backend services

**This was a real system with real data in it, and it still is.** Iteration 2 did not
rebuild it. It corrected it.

### 3.2 What Iteration 1 got wrong, and why

The defects found in Iteration 2 share a single cause, and naming that cause precisely
is the point of recording them:

> **Claims were written down as facts without being checked against the thing they
> described.** Not carelessly — plausibly. Each was the sort of statement that is true
> of a system like this one, written by someone reasoning about what the code
> *should* do rather than reading what it *did*.

That is a **process** defect, not a tooling defect and not an individual's. AI-assisted
development is fast at producing both code and confident prose about code, and Iteration
1 had no step that made the prose answer to the code. Iteration 2's substantive change
was to introduce that step.

The result was **22 documented errata**, of which these are representative:

| # | The claim | What was actually true |
| :--- | :--- | :--- |
| **E-08** | "All four updates execute inside an atomic database transaction (`BEGIN … COMMIT`)" | A repository-wide search for `BEGIN`, `COMMIT` and `ROLLBACK` returned **zero matches**. No transaction was opened anywhere in the backend. |
| **E-16** | "under 256MB of RAM", "sub-50ms indexed queries", "100% data consistency" | **No benchmark, profiling run or load test existed.** All three figures were withdrawn. |
| **E-10** | Tier 3 listed four services by name | **None of the four existed.** The directory held five different files. |
| **E-07** | "`ON DELETE RESTRICT` constraints protect the ledger" | Counted directly: **17 CASCADE, 4 SET NULL, 0 RESTRICT.** |
| **E-13** | The service worker caches tenant statements and admin directories for offline use | The only API cache rule matched `/api/(public|health)`. **Neither tenant nor admin data was ever cached.** |
| **E-14** | RBAC is a two-role admin/tenant check | **Four roles over a named permission matrix.** The description understated the system. |
| **E-01** | "32 rentable units" | **33**, seeded and client-confirmed. The figure 32 survived in 30 places. |
| **E-04/E-05** | "4-TIER" banner; "3-Tier Web Application" | The document beneath the banner enumerated **five** tiers. |

**E-16 deserves particular note**, because it is the most instructive: three specific
numeric performance claims, none of which had ever been measured. The correction was not
to measure them — it was to withdraw them and adopt a standing rule that **no numeric
performance claim is made until it has been measured.**

### 3.3 Defects in the code, not only the documents

Iteration 2 also found defects in behaviour. These are attributed to Iteration 1 only in
the sense that that is when they were written; several are subtle enough that they would
survive most review. They are recorded in full in Section 4.3.

---

## 4. Iteration 2 — Verification and Correction

**2026-09-12 → 2026-09-14 · 87 commits** — 32 `fix`, 32 `docs`, 13 `feat`, 4 `security`,
3 `test`

### 4.1 What changed about how the team works

Four standing rules came out of this iteration. They are carried at the top of
`CONTINUE_HERE.md` because they are the iteration's most durable output:

1. **The live database holds the client's real financial records.** Never drop, wipe or
   truncate. All schema change is a new numbered migration.
2. **`database/FULL_DATABASE_SCHEMA.sql` is not the database.** It has been wrong about
   the live schema repeatedly. `database/live_schema.csv` and the catalogue itself are
   the sources of truth.
3. **Verify before reporting.** A "defect" about generated columns storing `0.00` was
   repeated across nine documents and logged as two business-rule violations. **It was
   never true**, and the remediation it proposed would have broken every income write.
4. **Every multi-step write is a database function.** The client library cannot open a
   transaction, so chained writes commit one at a time.

Rule 2 earned its place: **six** business rules were recorded as blocked or unenforced on
evidence taken from that file, and all six were wrong about the live database.

### 4.2 Verification made permanent

Iteration 1 had **no** automated checks. Iteration 2 ends with six suites, 100+ assertions:

| Suite | What it holds |
| :--- | :--- |
| `check:api` | 46 endpoint, RBAC-isolation, perimeter and input checks — including posting `1e999` at three money columns to prove Infinity is refused, and proving every admin and tenant route refuses a caller with no token |
| `check:adyen` | 23 HMAC signature checks, no network required |
| `check:billing` | Water, grace, period and receipt-allocation arithmetic — 12 of them over **BR-013** alone |
| `check:tokens` | Design tokens resolve to the exact colours they replaced |
| `check:rules` | The business-rule register agrees with itself |
| `check:writes` | No database write discards its result |
| `check:secrets` | Scans for committed credentials; installed as a pre-commit hook |

### 4.3 Correctness defects found and closed

Each was verified against the live database and each is covered by a regression check.

| Defect | Why it mattered |
| :--- | :--- |
| **A partial payment vanished as a debt.** The settlement loop paid only bills it could cover in full; the leftover was written unlinked to any bill, and nothing ever summed it back in. A tenant paying ₱3,000 against a ₱5,000 bill had the cash recorded, the bill still reading ₱5,000, and nothing connecting the two — permanently. | **13 of 15 live payments** already had no bill attached. The ledger was right about the cash and wrong about the debt. **BR-013** |
| **A real gateway payment created two rows**, under two different references, so the duplicate check could never match them. The browser path was also forgeable. | The webhook is now the sole writer, and the browser return is verified server-to-server. |
| **Cash could be recorded with nothing written to the books.** The on-site form skipped the write if the unit did not match, swallowed the error if it threw, then reported success. | Money collected, nothing in the ledger, and a confirmation on screen. |
| **Receipt numbers were invented** from `Math.random()` on both sides. | All 937 real rows carry numbers from the client's receipt book. A four-digit random collides at even odds after about a hundred entries. Both sides now require a real number. |
| **The security self-check passed while misconfigured.** Any probe error counted as proof of lockdown, and "invalid key" is indistinguishable from "permission denied" at HTTP 401. | A rotated-out key reported a green padlock. Replaced with a three-state verdict. |
| **The tenant portal wrote false intrusion attempts into the audit log** — six admin-only requests on every page load, each refusal audited. | **2,104 of 2,224 audit rows were this bug**, and the table is append-only, so they are permanent. |
| **`NaN` and `Infinity` could reach money columns.** JSON has no Infinity literal, but `1e999` parses to one, and PostgreSQL sorts it above every numeric — so a `CHECK (x >= 0)` passes it, and on a generated column every subsequent `SUM` returns Infinity. | Found in **five** schemas across the iteration, including `rooms.current_price`, which becomes the advance rent, every bill, and every income total. |
| **Expense creation was two round trips.** A rejected allocation left an entry carrying a total with nothing underneath it. | Exactly the imbalance **BR-047** forbids. Closed by migration `019`. |
| **Deleting a room destroyed its history.** The delete was unguarded, and four tables cascade from `rooms` — including `room_price_history`, the table **BR-003** is anchored to. It was also logged as `ROOM_UPDATE`, so the one surviving record said the room had been *edited*. | The ledger itself survives, because migration `005` made it `RESTRICT` and every one of the 33 rooms holds ledger rows — which is why nothing was lost. A room without them did not survive. |
| **A rate change could go unrecorded.** The `room_price_history` insert discarded its result and ran *after* the rate had already changed, so a rejected insert left the new rate live and no record that the old one existed. | This is the claim that replaced the withdrawn escalation feature — that every manual change is preserved. Migration `020` moved the row to a database trigger, so it now holds regardless of write path. |
| **23 database writes discarded their result.** supabase-js does not throw, so `await db.from('bills').update(...)` is indistinguishable from success. | One was the payment **rejection** path: decline a payment, and the bill could still read Paid. One was the lockout counter — while it fails, account lockout never engages. `check:writes` now fails the build on any write that does not say what failure means. |
| **The rent period came from the date paid.** A tenant on a 13th-of-the-month cycle paying on the 20th had the period recorded as starting on the 20th. | The ledger's "Rent For" column — the one the owner reads to know what a payment was for — drifted off the cycle one receipt at a time. **BR-033** |
| **The dashboard's year was a literal.** `CURRENT_YEAR = 2026`, while the month beside it came from the clock. | On 1 January the entire dashboard would have read zero — collections, run rate, cash flow — with no error and no empty state. |
| **A failed load of the verification queue claimed everything was verified.** The error was caught, the list left empty, and the empty state rendered a green shield reading "All Remittances Verified". | Not a missing error message: an affirmative false statement. Empty and unknown are different, and the screen now says which. |
| **The tenant ticket view put words in the owner's mouth.** Two messages were fabricated and attributed to Landlady Fe — "I have assigned a handyman and they will visit soon" on any In Progress ticket. | She never wrote either, and because they were seeded before the fetch and only replaced when it returned rows, a ticket with no replies showed an invented reply indefinitely. The same defect as the invented OR numbers and the fabricated emergency contacts. |
| **`live_schema.csv` — the file rule 2 points at — was wrong.** It rendered both `GENERATED ALWAYS` columns as ordinary `DEFAULT` expressions. | A reader following the project's own rule correctly would have reached the wrong conclusion. This is exactly the misreading that produced the "0.00 defect". |

### 4.4 The business rule register, rebuilt

| | End of Iteration 1 | End of Iteration 2 |
| :--- | ---: | ---: |
| Enforced | not assessed | **42** |
| Partial | not assessed | 4 |
| Schema only | not assessed | 2 |
| Not enforced | not assessed | **1** (OD-07, client-gated) |
| **Violated** | not assessed | **0** |

**Eight rules moved because the register was wrong about the system, not because the
system changed** — BR-008, BR-009, BR-010, BR-019, BR-026, BR-030, BR-041 and BR-047. In
six of the eight the evidence had been taken from `FULL_DATABASE_SCHEMA.sql`, which does
not describe this database. Five more moved because code changed: BR-003, BR-013, BR-033,
BR-034 and BR-036.

Three structural defects were also found *in the register itself*: a rule with no status
cell at all, a rule whose row and summary disagreed, and three rules carrying a status the
legend never defined. `check:rules` now prevents all three.

### 4.5 Iteration 2 in numbers

| | Iteration 1 | Iteration 2 |
| :--- | ---: | ---: |
| Numbered migrations | 4 | **20** |
| Backend services | 5 | 9 |
| Automated check suites | **0** | **7** |
| Pipeline analysis documents | 0 | 12 |
| Documented errata | 0 | **22** |
| Business rules assessed | 0 | **49** |

---

## 5. Iteration 3 — Consolidation

**Planned.** Entry condition: the nine client decisions in Section 2.4 are answered.

### 5.1 Scope

| # | Item | Note |
| :--- | :--- | :--- |
| 1 | **One client consultation** covering all nine open decisions | The gating activity. Three of the nine require a migration once answered. |
| 2 | **BR-046** — category cumulative totals | Unblocked by **OD-07**. The last unenforced rule. |
| ~~3~~ | ~~**BR-049** — Excel export~~ **DONE 2026-09-14.** Both ledgers now build real `.xlsx` files in their documented layouts, and the three open decisions they touch (OD-01, OD-05, OD-06) are shown on the sheet rather than assumed. | — |
| 4 | **Service extraction** | **137 of 173** database calls still sit in route handlers (79%), and `admin.ts` is ~2,500 lines. Six planned services do not yet exist. This is the architecture's stated target. |
| 5 | **Deposit reconciliation on move-out** | Unblocked by **OD-04**. |
| 6 | **Two unauthenticated payment endpoints** on the public router | Carried as a hardening item since Phase 1. |
| 7 | **Reconcile per-unit `floor` values** to the client's survey | The published tally is client-confirmed; the seeded per-unit values were populated for development and disagree by one unit on floor 1. A data migration, never an edit to the master schema file. |

### 5.2 One documentation inconsistency to settle

The repository records team roles as:

- **Sean Jerve Ll. Rebancos** — System Architect / Full-Stack
- **John Lloyd M. Cuario** — Database Administrator / Data Analyst
- **Kiel Hedrix V. Relos** — QA / Systems Analyst

The Module 01 presentation script assigns **Sean** the Database Administrator role. Both
cannot be right, and the module's Group Identification table requires a name *and* a
role. **The team should settle this and make every document agree.** Two members —
Eljohn and Vince — have no role recorded anywhere in the repository.

---

## 6. What an examiner should take from this record

Three things, stated plainly:

**The second iteration was not remedial work.** It was the verification pass. A method
that builds first and checks later produces exactly this shape, and the alternative —
checking nothing — does not remove the defects, it only removes the record of them.

**The most dangerous defects were silent.** Not one of the eight in Section 4.3 produced
an error message a user would see. Cash was collected and confirmed with nothing written
to the books. A partial payment was recorded and the debt left standing. A security
check reported green while testing nothing. This is the argument for automated
verification stated better than any general principle could state it.

**The remaining gap is elicitation, not engineering.** The one unenforced business rule
and three of the seven Iteration 3 items are waiting on a conversation with the client,
not on code. That is the correct place for a capstone project to be, and filling those
gaps with plausible assumptions would have been the easier and worse choice.

**A note on the four rules still Partial**, so that the count is not mistaken for unfinished
work: **BR-020** would need a `room_id` on expense allocations, and the client's own
workbook allocates by Property Area rather than by room; **BR-025** waits on OD-04;
**BR-029** keeps the twelve-month chart year-scoped deliberately; and **BR-039** accepts an
advance rent that diverges from the unit's rent, because the owner may genuinely have
agreed one, and records the divergence. Each is a decision, not an omission.

---

## 7. Evidence index

| Claim area | Where to verify it |
| :--- | :--- |
| Iteration boundaries, commit counts | `git log` — 95 commits to `1438595`, 87 from `cc10d98` |
| The 22 errata | `docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md` |
| Client decisions, open and closed | `docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md` |
| All 49 business rules with evidence | `docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md` — validated by `npm run check:rules` |
| The panel recommendation | `docs/claude_pipeline/outputs/PHASE3_PANEL_RECOMMENDATION_REGISTER.md` |
| The client's source workbook | `docs/09_MONTHLY_INCOME_REPORT.md`, `docs/10_MONTHLY_EXPENSES_REPORT.md` |
| Schema change history | `database/migrations/001…019` |
| Live schema — the source of truth | `database/live_schema.csv`, and the catalogue itself |
| Standing rules and current state | `CONTINUE_HERE.md` |
