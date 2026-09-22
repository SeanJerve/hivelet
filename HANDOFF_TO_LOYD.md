# Handoff — Loyd's machine, 2026-09-17

**Written for the agent working on Loyd's side, and for Loyd.** Sean holds the Adyen keys. He
stays the reviewer of record: nothing here is finished until he has checked it.

**Loyd's family keeps the books.** The receipts, the notebooks and the answers are on that side,
which is why the database work belongs there too — Sean transcribing figures he cannot verify
would only add a place for them to go wrong.

---

## 0. How to change live data without it being unreviewable

A `git pull` gives you the codebase and **none of the keys** — `.env` and
`credentials/creds.txt` are gitignored. Sean sends those separately.

The database holds the owner's real financial records: **937 income rows, 1,327 expense
allocations, 33 units, 32 of them occupied.** It is live, it is her business, and there is no
staging copy.

**One rule, and it is about traceability rather than permission:**

> **Every change to live data goes in as a numbered migration in `database/migrations/`.
> Never an ad-hoc `UPDATE`.**

The reason is simple. Sean reviews your work in a diff — and *there is no diff for a row you
changed in a console*. A migration file **is** a diff: it lands in git, it says what changed and
why, it can be read six months from now, and it can be replayed. An ad-hoc UPDATE leaves the
database different and the repository identical, which is the one shape nobody can check.

`025` is the latest. Number yours from `026`.

**Before the first one, take a backup:**

```bash
npm run backup
```

It writes every row of every table to `backups/<timestamp>/`. That folder is gitignored and
**must stay that way** — it contains 45 real people's contact details.

**Three things that stay Sean's** regardless of access: the Adyen keys, the two demo password
rotations, and `migration 023` (see § 4).

### The one trap that has cost this project the most

There is a file called **`database/FULL_DATABASE_SCHEMA.sql`**. It looks authoritative. **It does
not describe this database and it has been wrong about it repeatedly** — wrong about the property
area type, about which indexes exist, about generated columns, about foreign key actions.

**Eight business rules were recorded wrongly. Six of those eight took their evidence from that
file.** One invented "defect" was repeated across nine documents.

**The only reliable answer is the catalogue** — `information_schema`, `pg_index`,
`pg_constraint`, `pg_trigger`, `pg_proc`. Documents are a hypothesis; the catalogue is the
answer.

- **With read access:** ask it. Never cite that file, and never cite
  `database/live_schema.csv` either — it was wrong about both generated columns as recently as
  14 September.
- **Without it:** make no claim about the schema at all. Not from those files, not from
  inference. Write the question down and hand it over.

`check:canon` will fail the build if you edit that file. That is intentional.

---

## 1. What you can actually run

`npm run check:all` from the repository root. What runs depends on what you have — measured by
pointing each suite at a dead port, not guessed:

| You have | Suites that run | |
| :--- | ---: | :--- |
| a bare clone, `npm install` | **11** | `canon` `rules` `matrix` `copies` `secrets` `adyen` `billing` `writes` `tokens` `reachable` `endpoints` |
| **+ Sean's `.env`** | **14** | adds `columns` `fields` `ledger` |
| **+ backend running, + `creds.txt`** | 17 → **names only 16** | adds `api` `reports` |

> [!WARNING]
> **This table is out of date and is kept only because the suites it does name are right.**
> Two things are provably wrong with it, both found 2026-09-22:
>
> 1. **It is missing four suites entirely** — `relations`, `components`, `labels` and `liveness`.
>    They were added after it was written and never added to it. Count the names: the rows total
>    **16**, and `scripts/check-all.mjs`'s `SUITES` array holds **20**.
> 2. **The bottom row disagrees with itself** — it says 17 but names 16.
>
> The tier totals here have **not** been re-measured, so they are not corrected rather than being
> replaced with fresh guesses. `CLAUDE.md` carries the figures to trust; the `SUITES` array is the
> authority behind them. If you want this table right, measure it the way its own opening line
> says it was measured — point each suite at a dead port and see which still run.

Run the backend yourself with `npm run dev:backend` once you have `.env`. **`check:ledger` is the
one you will care about most** — see § 2.

> [!WARNING]
> **`check:liveness` is the one to watch.** Without a backend it runs **4 of its 7 rules and
> still exits 0**, printing two `note:` lines about what it skipped. A green `check:liveness` on
> your machine is *not* the same check Sean runs. Read the notes, not the exit code.

Read the summary table rather than the tail — `| tail` shows the end of whichever suite ran last,
and a red check has twice been committed past that way:

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

---

## 2. The seven receipts, and the check that was written waiting for you

`check:ledger` already re-derives the whole ledger — every `remitted_amount` and every 50%
figure against its formula, on all 937 rows. It found seven entries that **cannot be right as
written**, and rather than silencing them it **pins them by receipt number** and prints all seven
on every run.

Its own header says why:

> *The seven are real entries in Mrs. Da Silva's books and correcting one means knowing what it
> should say, which is hers to tell us, not ours to infer.*

**That is the sentence this handover exists to act on.** The check has been waiting for someone
with the receipt book.

| Receipt | What is wrong |
| :--- | :--- |
| **OR#4839** | `date_paid` is **1900-01-17** — the Excel epoch, so the source cell never parsed. Its year/month (2024-12) also disagree with its rent period. Room 2g, ₱6,500 |
| **INVOICE#5120** | `date_paid` is **2027-02-26**, a year in the future, against a 2026 rent period. Reads as a mistyped year. Room 1c, ₱8,000 |
| **OR#4757** | rent period ends the day before it starts: 2024-08-03 → 2024-08-02. Room 1h |
| **OR#4775** | same shape: 2024-08-30 → 2024-08-29. Room 2b |
| **OR#4872** | same shape: 2025-02-03 → 2025-02-02. Room 1h |
| **OR#4774** | one receipt number against **two rooms** (3f and 3g), same tenant, paid twelve days apart |
| **OR#4813** | one receipt number against **two different tenants** on the same day — Ron Juliene Dominguino (2a, ₱8,000) and M. Juselle Escuro (3a, ₱9,000). Two people cannot share one official receipt |

### The workflow, and why the last step matters

1. **`npm run backup`** — once, before the first correction.
2. **Look the receipt up in the book** and ask her what it should say. Do not infer it. Three of
   these look like an off-by-one and one looks like a mistyped year, and *looking like* something
   is exactly how this project has gone wrong before.
3. **Write the correction as `database/migrations/026_...sql`**, with the evidence in the header:
   what the paper receipt says, and who confirmed it. That header is the audit trail.
4. **Apply it**, then run `npm run check:ledger`.
5. **It will FAIL** — and that failure is the confirmation you want:
   `OR#4757 is pinned as anomalous but now reads clean - remove its entry`.
   The row stopped being wrong, so its pin is stale. Delete that line from `KNOWN` in
   `backend/scripts/check-ledger-integrity.mjs` and commit it with the migration.
6. **If it does *not* fail**, your correction did not land, or did not fix what you thought.

> That loop is the useful part: the check tells you whether the fix worked, in the same breath as
> telling you the register is out of date. A row you "fixed" that is still anomalous stays pinned
> and keeps printing.

**Anything not on that list of seven that becomes anomalous fails the run immediately.** So a typo
entered tonight is caught on the next run, while the historical seven wait for an answer instead
of being quietly accepted.

---

## 3. The rest of the client conversation

**`CLIENT_MEETING_QUESTIONS.md`.** Loyd can answer most of it by asking his mother.

This is the single biggest blocker in the project. It is written to be answerable in one sitting,
with a place to write each answer, and it is organised so nothing needs a technical explanation
first. Sections:

| | |
| :--- | :--- |
| **1** | Seven receipts that cannot be right as written — two impossible dates, three rent periods ending the day before they start, two receipt numbers used twice |
| **2** | Five things about how she keeps the books — the ₱20 garbage fee stopping after June 2025, August and September 2026 missing entirely, penthouse spending filed in three places none of which is the Penthouse, Linda's water column, and **₱2,560,641 booked as non-rental in 2025** |
| **3** | Three quick confirmations where a sensible default is already chosen |
| **3b** | **Four things her public website tells strangers.** Two check out against the system. **Two exist nowhere but that page** — "₱12.50 / kWh" and "readings are recorded on the 25th". No check can ever verify them. If either is wrong, the site has been telling prospective residents the wrong thing |
| **4** | Sean's calls, not hers |

**How to record answers.** Write them into the sheet, in her words, next to the question. Do not
paraphrase a number. If she says something that contradicts a document, **write down both** and
flag it — the contradiction is the finding, and resolving it by picking one is how this project
got eight rules wrong.

**What you may implement from her answers, and what you may not:**

| Straight into the repository | Through a numbered migration |
| :--- | :--- |
| Wording, labels, help text, documentation | **Any change to the 937 income rows or the 1,327 allocations** |
| Frontend behaviour and layout | Any correction she confirms from the receipt book |
| Answers recorded in the sheet and in `docs/` | Anything that changes a figure she reads |
| Open decisions written up with her reasoning | — see § 2 for the loop, and take a backup first |

*Both columns get reviewed by Sean. The difference is only that the right-hand one has to leave a
trace he can read — which a console `UPDATE` does not.*

---

## 4. The redesign lane

Sean mentioned the frontend team is reworking the interface — different style, same functions.
Two things exist specifically to make that safe:

- **`docs/SCREEN_CONTRACT.md`** — every screen, every call it makes, which ones **write**.
  Generated by `npm run contract`, so it cannot drift. Rebuild a screen, check it against its
  row.
- **`check:reachable` now asserts that every component a template renders is imported by that
  file.** This matters more than it sounds: **Vue resolves an unknown tag to nothing.** No error,
  no build failure — the page renders and the element is simply absent, with the layout closing
  over the gap. **`vue-tsc --noEmit` exits 0 on it**; that was tested, not assumed. A moved or
  forgotten import while shifting markup between files is the easiest mistake to make and the
  hardest to see. Move markup freely; the check will catch a dropped import.

**Do not change money wording while restyling.** `check:canon` enforces the locked wording and
will fail the build. If a screen's copy has to change, read `docs/02_BUSINESS_RULES.md` BR-035
first.

---

## 5. When you hit something you cannot do

**You have the same access Sean does.** Where something genuinely is out of reach on your machine
— the Adyen keys, the webhook tunnel, a call that is his to make — the instruction is:

> **Never stop working because of it. Write it into `BLOCKED_FOR_SEAN.md`, and carry on.**

That file is a queue, not a discussion. It has a template and five fields, and the rule for
filling it in is that **Sean will read your entry cold, possibly at midnight, after a day of his
own work.** So: what is blocked, what you were doing, what you already finished, the smallest
concrete action he needs to take, and how he will know it worked.

**If the work is ready and only the applying is blocked, finish the work and commit it.** A
migration that is written, reviewed and simply not applied is a good entry. *"The payment thing
did not work"* is not.

Four are already in there — the demo password rotation, `migration 023`, Adyen, and running the
rehearsal. Read them before you start; two of them may be things you can do yourself.

**One standing fact, because documents here have been wrong about it:** the payment gateway is
**configured and working** against Adyen's developer sandbox with GCash. It is not a mock, not a
simulator, and not pending a decision. `check:canon` fails the build on any document that says
otherwise.

---

## 6. Working alongside Sean without colliding

Two agents on one repository. Keep to lanes and this stays boring:

| | Loyd's side | Sean's side |
| :--- | :--- | :--- |
| **Files** | `docs/`, `CLIENT_MEETING_QUESTIONS.md`, `frontend/src/` | `backend/src/`, `database/migrations/`, the live data |
| **Shared, so pull first** | `CONTINUE_HERE.md`, `SESSION_REPORT_*.md`, `docs/13_AUDIT_JUDGEMENT_LOG.md` | same |

Pull before you start and before every push. Commit in small pieces with real messages — the
history here is the reasoning, and it is worth more than the diff.

---

## 7. Where everything else is written down

| | |
| :--- | :--- |
| **`BLOCKED_FOR_SEAN.md`** | The queue. Add to it rather than stopping; read it before you start |
| **`CONTINUE_HERE.md`** | Section 0.0 is what today produced and what it needs from a person |
| **`docs/13_AUDIT_JUDGEMENT_LOG.md`** | The reasoning, the defect classes worth re-running, and the calls a fresh reader might reverse. **Section 3 is the one to read before changing anything that looks wrong** — several things that look like bugs are deliberate and say why |
| **`SESSION_REPORT_2026-09-15.md`** | Newest first. A dated snapshot, not current state |
| **`TESTING_REHEARSAL.md`** | For Sean, but read "What this rehearsal cannot tell you" |
| **`docs/02_BUSINESS_RULES.md`** | The rules themselves. `check:rules` keeps the register honest with itself |

**Two standing facts** that documents in this repository have been wrong about, both corrected
and both easy to reintroduce: the property is **33 units, not 32**, and there is **no annual rate
escalation** anywhere — the owner sets rates by hand and only the change history is kept.
`check:canon` fails the build on either.
