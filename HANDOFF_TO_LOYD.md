# Handoff — Loyd's machine, 2026-09-17

**Written for the agent working on Loyd's side, and for Loyd.** Sean holds the Adyen keys and
the admin login, and owns every write to the live database. He stays the reviewer of record:
nothing here is finished until he has checked it.

---

## 0. The boundary

A `git pull` gives you the whole codebase and **none of the keys** — `.env` and
`credentials/creds.txt` are gitignored. Sean may separately send you database credentials; he
holds the Adyen keys and the admin login either way.

**Whatever you are given, the rule is the same: you do not write to this database.**

It holds the owner's real financial records — **937 income rows, 1,327 expense allocations, 33
units, 32 of them occupied** — and it is live. The reason is not distrust, it is that
**code changes are reviewable and database changes are not.** Sean checks your work in a diff.
There is no diff for a row you changed, so a mistake there is invisible until the owner notices
her own ledger is wrong.

**If you have read-only access, use it properly.** Reading the catalogue —
`information_schema`, `pg_index`, `pg_constraint`, `pg_trigger`, `pg_proc` — is the *correct*
way to answer a question about the schema, and the reason this matters is in the next section.

**If a change to the data is genuinely needed, write it down and hand it to Sean.** That includes
correcting the seven bad receipts: the owner says what they *should* be, you record her answer,
Sean writes it. Never the other way round.

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

`npm run check:all` from the repository root. **Eleven of the seventeen suites run completely on
your machine with nothing but `npm install`:**

`check:canon` · `check:rules` · `check:matrix` · `check:copies` · `check:secrets` ·
`check:adyen` · `check:billing` · `check:writes` · `check:tokens` · `check:reachable` ·
`check:endpoints`

**Five cannot run at all** without Sean's `.env`, his backend, or both — they will fail, and that
failure is not your fault and not a defect:

`check:api` · `check:columns` · `check:fields` · `check:ledger` · `check:reports`

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

## 2. The actual job, and it is the most valuable thing left

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

| Safe on your side | Needs Sean |
| :--- | :--- |
| Wording, labels, help text, documentation | **Any change to the 937 income rows or the 1,327 allocations** |
| Frontend behaviour and layout | Any migration (they are numbered, `025` is the latest) |
| Answers recorded in the sheet and in `docs/` | Anything needing a figure read from the database |
| Open decisions written up with her reasoning | Correcting the seven receipts — she says what they *should* be; Sean writes it |

---

## 3. The redesign lane

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

## 4. Not yours — Sean's, and still open

Sean's, regardless of what access you have been given:

1. **Rotate the two demo passwords.** In GitHub history since 25 August. There is a
   change-password screen now.
2. **Apply `database/migrations/023`.** Three duplicate profiles holding working passwords. One
   statement. *Do not strip the invoice numbers from the names.*
3. **Run `TESTING_REHEARSAL.md`** — 26 steps, about forty minutes, every write path once. No
   write path has ever been used by a person. Runs on `PH`, the only vacant unit.
4. **Anything that writes to the live ledger**, whoever asks for it.

> [!NOTE]
> **If you were sent read-only database credentials**, they are for *answering questions* —
> reading the catalogue, checking a figure before you quote it to the owner. Two of the five
> suites above still will not run, because `check:columns`, `check:fields`, `check:ledger` and
> `check:reports` authenticate to Supabase's REST API with a service key, which is a different
> thing from a Postgres login.

---

## 5. Working alongside Sean without colliding

Two agents on one repository. Keep to lanes and this stays boring:

| | Loyd's side | Sean's side |
| :--- | :--- | :--- |
| **Files** | `docs/`, `CLIENT_MEETING_QUESTIONS.md`, `frontend/src/` | `backend/src/`, `database/migrations/`, the live data |
| **Shared, so pull first** | `CONTINUE_HERE.md`, `SESSION_REPORT_*.md`, `docs/13_AUDIT_JUDGEMENT_LOG.md` | same |

Pull before you start and before every push. Commit in small pieces with real messages — the
history here is the reasoning, and it is worth more than the diff.

---

## 6. Where everything else is written down

| | |
| :--- | :--- |
| **`CONTINUE_HERE.md`** | Start here. Section 0.0 is what today produced and what it needs from a person |
| **`docs/13_AUDIT_JUDGEMENT_LOG.md`** | The reasoning, the defect classes worth re-running, and the calls a fresh reader might reverse. **Section 3 is the one to read before changing anything that looks wrong** — several things that look like bugs are deliberate and say why |
| **`SESSION_REPORT_2026-09-15.md`** | Newest first. A dated snapshot, not current state |
| **`TESTING_REHEARSAL.md`** | For Sean, but read "What this rehearsal cannot tell you" |
| **`docs/02_BUSINESS_RULES.md`** | The rules themselves. `check:rules` keeps the register honest with itself |

**Two standing facts** that documents in this repository have been wrong about, both corrected
and both easy to reintroduce: the property is **33 units, not 32**, and there is **no annual rate
escalation** anywhere — the owner sets rates by hand and only the change history is kept.
`check:canon` fails the build on either.
