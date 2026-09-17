# Handoff — Vince, Documentation — 2026-09-17

**Written for Victor Noel "Vince" Napay and for whoever is working alongside him.** On most
projects documentation is the thing written after the work. **Here it is the work that has gone
wrong most often**, and it is the only part of this project with checks that fail the build.

**Eight business rules were recorded wrongly. Six of those eight took their evidence from a file
that looked authoritative and was not.** One invented "defect" was repeated across **nine
documents** and recorded as two rule violations; it was never true, and the remediation it
proposed would have broken every income-record write. That is the history you are inheriting, and
it is why this seat matters.

---

## 0. The rule that governs everything you write

> **Documents are a hypothesis. The catalogue is the answer.**

Never cite **`database/FULL_DATABASE_SCHEMA.sql`** — it does not describe this database and has
been wrong about it repeatedly: the property area type, which indexes exist, generated columns,
foreign key actions. `check:canon` **fails the build if you edit it**, deliberately. Never cite
`database/live_schema.csv` either; as recently as 2026-09-14 it rendered both `GENERATED ALWAYS`
columns as ordinary `DEFAULT`s, which is the exact misreading behind the `0.00` story.

Ask `information_schema`, `pg_index`, `pg_constraint`, `pg_trigger`, `pg_proc` through the
Supabase MCP. **Without database access, make no claim about the schema at all** — not from those
files, not by inference. Write the question down and hand it over.

The same principle, in the form you will use twenty times a day: **say what you verified against,
and give it a date.**

---

## 1. Four checks read documents and fail the build

This is unusual and it is the point. Run from the repository root; all four run on a bare clone.

| | What it validates | What it caught |
| :--- | :--- | :--- |
| `check:rules` | `PHASE1_BR_CROSSWALK.md` **against itself** | In one audit session the crosswalk drifted six times, three ways, all silent: a row lost its status cell entirely (BR-039 ended mid-sentence, so the table rendered a column short and the rule had no status — while the summary still counted it); a row and the summary disagreed (BR-049); and three rows used `Satisfied`, a status the legend does not define, which got counted as Enforced |
| `check:matrix` | `PHASE1_TRACEABILITY_MATRIX.md` **against itself** | The Summary Counts table — *the one table a panel adds up* — claimed a **Total of 44** and enumerated **43**. FR-013 had moved off MISSING and was never added anywhere else. Three places gave three different answers about the same 44 rows |
| `check:canon` | no live document carries a retired or banned framing | On 2026-09-16 retired framings sat in **four live specification files**, two of which instruct the next contributor what to write |
| `check:copies` | the filming copies match the documents of record | See § 6 |

**`check:rules` is deliberately narrow** — it asks only whether the document agrees with itself,
never whether a status is *correct*. Knowing what a check does not claim is what stops it being
cited as proof of something else.

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

**Read the summary table, not the tail.** `| tail` shows the end of whichever suite ran last, and
a red check has been committed past that way twice.

---

## 2. The locked wording

`check:canon` enforces four settled things across every tracked document, `.vue` template and
instruction file:

1. **BR-035.** `fifty_percent_share` is described **only** as a system-computed figure equal to
   half that row's Rent Amount, kept for ledger parity with the owner's historical spreadsheet.
   **Never name a party, recipient, purpose or destination.** Never "co-ownership", "co-owner",
   "50/50", "owner share" or "landlady share".
2. **No rate escalation of any kind.** The former "2% annual increase" was **withdrawn in full**,
   client-confirmed 2026-09-13 (errata **E-20**, misattribution **M-11**). The owner sets rates by
   hand; only the change history is kept, in `room_price_history`, held by an `AFTER UPDATE`
   trigger since migration `020`.
3. **The property is 33 units, not 32** — 5 clusters (BH 22, Back Apartment 5, Front Apartment 3,
   Penthouse 1, Linda 2), on 3 residential floors plus a rooftop penthouse level: **11 / 11 / 10 /
   1**. Corrected 2026-09-15 as errata **E-01**, misattribution **M-08**.
4. **The payment gateway is configured and working** against Adyen's developer sandbox with
   GCash. Never "mock", never "simulator", never "pending consultation".

> An instruction file is the worst possible place for a retired framing, because it tells the
> next person to reintroduce it. That is why `.agents/AGENTS.md`,
> `AI_DEVELOPMENT_WORKFLOW.md` and the two UI specification files are all in scope for this check.

---

## 3. Which document is the authority — and which are labelled fakes

The single most useful thing you can maintain is a correct answer to "which file do I believe?"

| Document | Standing |
| :--- | :--- |
| `docs/01_SYSTEM_BIBLE.md` | **Canonical** for the property model. The rest of the repository defers to it |
| `docs/02_BUSINESS_RULES.md` | **Canonical** register of the rules themselves |
| `docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md` | **The authoritative list of what is genuinely unresolved** (OD-xx) |
| `docs/SCREEN_CONTRACT.md` | **Generated** by `npm run contract` from `frontend/src`. Never hand-edit; it exists precisely so it cannot drift |
| `docs/08_OPEN_DECISIONS.md` | **Misnamed.** Everything in it is *closed*. It carries a banner saying so, and two struck sections. **See § 4 — the rename is your first concrete task** |
| `docs/11_FORM_FIELD_AUDIT.md` | **Historical defect register, substantially stale.** It audits `website/src/`, a directory that no longer exists. Every row spot-checked on 2026-09-15 was already resolved. Labelled, not deleted |
| `SESSION_REPORT_*.md` | **A dated snapshot, not current state.** Newest first |
| `CONTINUE_HERE.md` | Where the project stands. § 0.0 first |
| `database/FULL_DATABASE_SCHEMA.sql`, `database/live_schema.csv` | **Never cite either.** See § 0 |

**A wrong filename nobody has time to change is still worth labelling.** That banner convention —
struck text rather than deletion, with the reason and the date — is the house style. Keep it.

---

## 4. Your first three concrete tasks

**1. Rename `08_OPEN_DECISIONS.md` to `08_CLOSED_DECISIONS.md` and strike Section 9.**
Prescribed by the open-decisions register's Section 0 for Phase 2. Checked 2026-09-15: not done.
Its banner is standing in for the rename. The file's own H1 already says "RESOLVED & FINALIZED",
so anyone opening it looking for unresolved questions finds none and concludes none exist.
Update every inbound reference in the same commit.

**2. Fix the suite count wherever it is stale.** `TESTING_REHEARSAL.md` says **"Fifteen green"**
and *"covered by fifteen verification suites"*. `check-all.mjs`'s own header still says
**"fourteen suites"**. **There are seventeen.** This is exactly the class of drift that
`check:matrix` was written for, in files no check covers.

**3. The role attributions — see § 5.** Do this one before the next submission, not after.

---

## 5. The role discrepancy, and how to record it properly

The submitted Module 02 answer sheet
(`CAPSTONE ACTS/Module 02 - System Construction and Development.md`) records:

| Member | Role as submitted |
| :--- | :--- |
| Sean Jerve Ll. Rebancos | System Architect / Full-Stack Developer |
| John Lloyd M. Cuario | Database Administrator / Data Analyst |
| **Eljohn Paulo C. Loterte** | **Frontend Developer / UI/UX Designer** |
| **Victor Noel A. Napay** | **Backend Developer / Integration Engineer** |
| **Kiel Hedrix V. Relos** | **Quality Assurance / Systems Analyst** |

The split assigned on **2026-09-17** is different: **Kiel on UI/UX, Eljohn on analyst and QA,
Vince on documentation.** The same five names appear in `PHASE1_MODULE01_ERRATA.md`'s header
block, and the filming script assigns sections by speaker (§4 Eljohn, §5 Vince, §6 Kiel).

**This is a documentation problem, and it is yours.** The answer sheet is a **submitted**
deliverable that names who did which requirement, item by item — Requirement 3 credits Eljohn,
Requirement 5 credits Kiel, and so on. A silent edit makes the submitted and current versions
disagree with nothing to explain why.

**Do it the way this project already handles corrections:** publish the corrected artifact **and**
a dated note together, never a quiet reissue. Give it an errata number in the existing sequence,
state the roles as submitted, state the roles in force and from what date, and say plainly that
this supersedes rather than corrects — the same treatment E-20 and E-21 received for decisions the
owner confirmed after submission. Then check whether the per-requirement attributions still
describe who actually did the work; where they do, **leave them**, because they are a record of
what happened, not of who holds the title now.

---

## 6. Filming, and the copies that drift

**`docs/PRESENTATION_INDEX.md`** is one page so nobody hunts through folders while recording. Two
directories hold nearly all of it: `docs/claude_pipeline/outputs/` (12 documents) and
`docs/diagrams/rendered/` (20 files). Diagram sources are `.mmd` / `.drawio` under
`docs/diagrams/`, with `DIAGRAM_SOURCE.md` alongside them.

- **Film from** `docs/claude_pipeline/outputs/PHASE3_FILMING_SCRIPT.md` — word for word, with
  stage directions and per-section timings. §1–2 Loyd, §3 Sean, §4 Eljohn, **§5 Vince**, §6 Kiel.
- **The one reference to open if you open only one:** `PHASE3_DEFENSE_PACK.md` — the six-section
  script, the slide-asset table, the anticipated-questions table, and a short "two things not to
  say" list.

> [!WARNING]
> **`VIDEO PRESENTATION DOCS/` is gitignored** (`.gitignore:61`), so its copies never travel with
> the repository and are never reviewed in a diff. Measured on 2026-09-16 they had drifted badly —
> **126 differing lines** in the DFD traceability copy, 88 in the crosswalk, 33 in the defense
> pack. **Every difference was the copy being older**, including a security copy still calling the
> transaction gap Open three days after migration `018` closed it.

```bash
npm run check:copies      # catches the drift
npm run refresh:copies    # fixes it — copies files, changes nothing else
```

Four files in that folder **are** tracked, because losing them would mean losing work: the
entry-point note, `filming-script.html`, and the two setup guides. Leave the ignore rules alone.

---

## 7. How to write here

- **Every claim names its evidence** — a commit, a migration, a query, a dated register entry.
  `docs/12_ITERATION_HISTORY.md` § 0 defines the three words the whole repository uses:
  **Recorded** (backed by an artefact), **Client-settled** (confirmed by Mrs. Da Silva on a stated
  date), **Open** (genuinely unresolved, and listed as such rather than filled in with a plausible
  assumption).
- **Nothing is inferred from memory.** Where a conversation happened but no minute survives, say
  so plainly rather than reconstructing it.
- **Never paraphrase a number**, and when a source contradicts a document, **write down both and
  flag it.** The contradiction is the finding. *Resolving it by picking one is how this project
  got eight rules wrong.*
- **Struck, not deleted.** A wrong section that someone may have read stays visible with a reason
  and a date.
- **Commit in small pieces with real messages.** The history here is the reasoning and is worth
  more than the diff.

---

## 8. Lanes, and the queue

| | |
| :--- | :--- |
| **Your lane** | `docs/`, `CAPSTONE ACTS/`, `VIDEO PRESENTATION DOCS/`, the root `*.md` files |
| **Not your lane** | `backend/src/`, `database/migrations/`, the live data |
| **Shared — pull first, every time** | `CONTINUE_HERE.md`, `SESSION_REPORT_*.md`, `docs/13_AUDIT_JUDGEMENT_LOG.md` |

Pull before you start and before every push.

**Never stop because something is out of reach.** `BLOCKED_FOR_SEAN.md` is **a queue, not a
discussion** — five fields, written so Sean can read it **cold, possibly at midnight**: what is
blocked, what you were doing, what you already finished, the smallest concrete action, and how he
will know it worked.

---

## 9. Where everything else is written down

| | |
| :--- | :--- |
| `docs/PRESENTATION_INDEX.md` | where every filming asset lives |
| `docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md` | 21 corrections, and the format to follow for a new one |
| `docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md` | the real open list (OD-xx) |
| `docs/13_AUDIT_JUDGEMENT_LOG.md` | § 3 especially — several things that look like bugs are deliberate and say why |
| `docs/12_ITERATION_HISTORY.md` | the agile record, and the three conventions above |
| `CLAUDE.md` | the five rules |
| `CONTINUE_HERE.md` § 0.0 | what the last working day produced and what it needs from a person |
