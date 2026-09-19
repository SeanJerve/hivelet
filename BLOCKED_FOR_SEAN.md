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

### B-29 — the public site advertises the penthouse at ₱12,000. It last let for ₱30,000

- **Blocked on:** the owner, and nobody else. She sets rates by hand; nothing here may guess one.
- **This is the highest-value thing in this file.** It is not a bug. Every figure is doing
  exactly what it was told. The rate card was never updated after the units were seeded, and
  the public website reads it out.

- **What a prospect sees right now**, from `/public/rooms`, checked live:

  | | |
  | :--- | :--- |
  | unit | **PH** — the only one showing as free |
  | advertised at | **₱12,000** |
  | it last let for | **₱30,000** (Oct 2024) |

- **It is the whole property, not one unit.** Comparing each unit's `current_price` against
  what its resident last actually paid:

  | type | units | rate card | actually paid | average gap |
  | :--- | ---: | :--- | :--- | ---: |
  | Three-bedroom | 1 | 12,000 | 30,000 | **+18,000** |
  | One-bedroom | 8 | 5,000–6,500 | 5,000–12,600 | +3,238 |
  | Studio | 20 | 4,500–4,900 | 6,000–8,500 | +2,913 |
  | Two-bedroom | 4 | 7,500–8,000 | 8,000–12,000 | +2,750 |

  **31 of 33 units disagree. Residents pay 162% of the rate card on average** — ₱113,150 a
  month more than the system says the property costs to rent.

- **Why it happened, and the evidence it was never anyone's decision:** `room_price_history`
  held **zero rows** before 2026-09-19, and all 33 units still have `current_price = base_price`
  — the seeded value. No rate has ever been changed through the system. Migration 020's trigger
  works (verified today: a change and its revert both wrote history rows), it has simply never
  had a rate change to record.

- **Three things read this figure, so it is not cosmetic:**
  1. **The public site.** PH is the one unit available, so it is the one anyone enquires about,
     at less than half what it last let for.
  2. **BR-039.** Advance rent at move-in *is* `current_price`. The next resident's advance would
     be set from the wrong number.
  3. **Any bill raised for a unit** takes its rent from there.

- **What to ask her:** what is each unit's rate today? The ledger already implies it — the last
  rent actually paid for each — so the quickest version of the question is to show her that list
  and ask "are these right?".
- **Do not infer the rates from the ledger and write them in.** A rent paid may include something
  agreed for that month. She sets rates; the system records them. That is the standing rule in
  CLAUDE.md and it is the right one here.
- **Once she answers**, changing each rate through the edit-unit dialog writes the BR-003 history
  row automatically — so the change is dated and attributable, which is exactly what that trigger
  is for.
- **Raised:** 2026-09-19

### B-28 — a repair cannot be recorded for an empty unit

- **Blocked on:** a schema decision that belongs with the repair form nobody has built yet
  (B-22). Nothing is broken today; the failure is now legible instead of a 500.
- **What happens:** `maintenance_tickets.tenant_profile_id` is **NOT NULL** — checked in
  `information_schema`, not assumed. The table was designed around the tenant portal, where a
  repair always has the resident who raised it. The admin path has no such guarantee: it read
  the active tenancy and inserted whatever it found, and for a unit with nobody in it that is
  `null`.
- **Found by testing it, 2026-09-19**, not by reading:

  | request | result |
  | :--- | :--- |
  | `POST /admin/tickets` for **PH** (vacant) | **500 "Internal server error."** |
  | the same request for **1a** (occupied) | **201** |

- **Why it matters.** PH is the one vacant unit *and* the one being made ready to let — which
  is exactly when repairs get logged. And when the form in B-22 is built, this is the first
  thing that would break.
- **Fixed as far as is honest:** it now refuses with a clear message — *"That unit has no
  resident on record. A repair is filed against the resident of the unit, and this one has
  nobody in it."* — instead of a bare 500.
- **The real question, for whoever builds the form:** should `tenant_profile_id` be nullable? A
  repair to an empty flat genuinely has no tenant, so arguably yes. Relaxing it changes what a
  ticket means and wants deciding alongside the interface, not bolted onto a handler nothing
  calls.
- **Do not solve it by attaching the administrator as the reporter.** That invents an
  attribution, which is the defect class this audit has spent the day removing.
- **Raised:** 2026-09-19

### B-27 — every imported payment date was a day early · **APPLIED 2026-09-19**

- **Blocked on:** the same permission refusal that stopped 031. The SQL is in
  `database/migrations/032_correct_imported_date_paid.sql`; running it is a copy-paste.
- **The finding.** Her original spreadsheet is in the repository, and every row of
  `monthly_income_records` was created in one import on **2026-08-28** — nothing has ever
  been entered through the application — so the sheet is the source for all 937 rows.

  | | |
  | :--- | ---: |
  | spreadsheet rows read | 931 |
  | matched to a ledger row | 929 |
  | ledger date **exactly one day early** | **929** |
  | ledger date matching the sheet | **0** |
  | any other offset | 0 |

  **Not one row in the ledger carries the date she wrote.** Every one is a day early, across
  2024, 2025 and 2026 alike.

- **It is our bug, not hers.** The Excel cells hold exact UTC midnight — checked,
  `2024-01-27T00:00:00.000Z`, no offset applied — so the importer read each as local midnight
  and formatted it in a zone behind UTC, losing a day. The same defect `propertyDate.ts` and
  `propertyClock.ts` exist to prevent, one layer earlier than either of them guards.
- **The rent periods are fine** and are not touched. Those were parsed from text
  ("Jun.29-Jul.28/24") and are correct — which is why nothing about rent cycles, overdue or
  the month a row is filed under changes.
- **Six rows are a different problem.** Their Date Paid cell was never stored as a date at all,
  because of a typo, and the import defaulted them to the 1st:

  | unit | her cell | imported as | she wrote |
  | :--- | :--- | :--- | :--- |
  | B2F | `31-Maay-24` | 2024-05-01 | 2024-05-31 |
  | B2B | `21-Maay-24` | 2024-05-01 | 2024-05-21 |
  | F2F | `4-Maay-24` | 2024-05-01 | 2024-05-04 |
  | 3e | `13--Mar-26` | 2026-03-01 | 2026-03-13 |
  | F2B | `30--Apr-26` | 2026-04-01 | 2026-04-30 |
  | F1 | *(blank)* | 2026-07-01 | **nothing** |

  "Maay" for May, and a doubled hyphen twice. **The last one she never filled in**, so 032
  leaves it at the invented 2026-07-01 rather than replacing one invented date with another.
  It is pinned in `check:ledger` for her to answer.

- **APPLIED 2026-09-19.** Backup first: `backups/2026-09-19T09-09-30`. 929 dates shifted a day
  forward, 5 set from the text cells, 3 left alone. Measured after:

  | | |
  | :--- | ---: |
  | live rows | 937 |
  | remitted total | **8,086,250.00** — unchanged |
  | dates in the future | 0 |
  | dates before the ledger starts | 0 |
  | rows backed up in `date_paid_import_backup_032` | 934 |

  And the point of it, re-measured against her spreadsheet afterwards:

  | | before | after |
  | :--- | ---: | ---: |
  | **matching her sheet** | **0** | **929** |
  | still one day early | 929 | **0** |

  Undo is at the bottom of the migration; the old value of every changed row is kept.

- **Why it was worth doing now rather than later.** Every payment recorded through the app from
  here on is dated correctly. Today the wrong rows were all of them and fixable in one
  statement; once she starts using the system the ledger becomes a mix.
- **Raised:** 2026-09-19

### B-26 — five receipt numbers were mistyped, and the book says what each should be

- **Blocked on:** her receipt book, for two of the five. The other three are as good as proven
  but still touch her records, so they wait with the rest.
- **Sean asked the right question first:** could one receipt legitimately cover two payments?
  **Yes, and four of them do.** Those are correct and must never be "fixed":

  | receipt | unit | rows | all paid | covers |
  | :--- | :--- | ---: | :--- | :--- |
  | OR#4895 | 1f | 4 | 2025-03-23 | Sep–Dec 2024, ₱26,000 |
  | OR#4896 | 1f | 3 | 2025-03-23 | Jan–Mar 2025, ₱19,500 |
  | OR#4920 | 1d | 2 | 2025-04-28 | Apr–May 2025 |
  | OR#4952 | 1f | 2 | 2025-06-08 | Apr–May 2025 |

  Unit 1f cleared **seven months of arrears in one visit** on 23 March 2025; the book simply
  rolled to the next number partway through. `record_income_for_months` writes exactly this
  shape, so it is the system's own output as well as hers.

- **What separates those from a slip:** a real multi-month receipt is written once, so every
  row carries the **same** `date_paid`. A number appearing against two different payment dates
  was written on two different days, and one receipt cannot be.
- **`check:ledger` now tests that.** It already allowed one receipt across several months and
  refused it across several rooms; it could not see a receipt spanning two days. The new rule
  found **INV#5165**, which nothing had ever flagged.
- **And the book itself says where each belongs.** There are only **ten unused numbers in the
  entire book** (4621–5047, about 427 receipts), and one sits at the right date for every
  single anomaly:

  | the row | paid | unused number sitting at that date |
  | :--- | :--- | :--- |
  | OR#4726, 2nd row — 1b, Jade Marmol | 2024-07-26 | **OR#4743**, between receipts dated 07-26 and 07-28 |
  | OR#4772, 2nd row — 2f, Sancueza France | 2024-09-25 | **OR#4779**, between 09-11 and 09-26 |
  | OR#4774, the 3f row | 2024-08-22 | **OR#4762**, between 08-21 and 08-28 |
  | OR#4813, one of its two rows | 2024-11-01 | **OR#4812**, between two receipts *both* dated 11-01 |
  | INV#5165, 2nd row — 1a, Lobby Toor | 2026-06-02 | **INV#5189**, between 06-01 and 06-02 |

  Five anomalies, five gaps, each at the right date. That is the signature of a number
  mistyped as one already used, leaving its own unused.

- **Three can be assigned on this evidence alone** — OR#4726, OR#4772 and INV#5165. In each,
  both rows are genuine consecutive months of one tenancy in one room; only the number on the
  second is wrong, and exactly one unused number sits at its payment date.

- **Two need her book:**

  **OR#4813** — Ron Juliene Dominguino (2a, ₱8,200) and M. Juselle Escuro (3a, ₱9,800), both
  paid 1 November 2024. One of them is OR#4812. Which one cannot be read from the data: they
  were paid the same day, so nothing in the ledger breaks the tie.

  **OR#4774** — worse than a number. Its **3g** row is right: Jayson Anonuevo, 31st
  anniversary, ₱6,500, unbroken either side. Its **3f** row is that row over again — same
  tenant, same ₱6,500, same period — and 3f is **Pallavi Ravichandran at ₱6,000 on the 18th**.
  It matches neither the room nor the rate it is filed under. **And 3f really is missing a
  month:** Pallavi has no receipt at all for 18 Aug – 17 Sep 2024. So either that row is a
  duplicate that should not exist, or it is Pallavi's missing month entered with the wrong
  tenant, rate and period. Those are very different corrections and only her book decides.

- **Nothing here is money missing.** Every amount is a plausible month's rent at the rate then
  in force, and the ledger totals ₱8,086,250.00 either way. What is wrong is which piece of
  paper each row claims to be.
- **Raised:** 2026-09-19

### B-25 — `check:columns` tells you to regenerate a file nothing can regenerate

- **Blocked on:** a way for a script to run SQL. Not urgent; recorded so the next person does
  not spend the time I did discovering it cannot be done.
- **What the check says when it fails:**

  > Regenerate database/live_schema.csv from the live catalogue.
  > Do NOT hand-edit it to pass - that is how the other schema file went wrong.

  There is no such script. `scripts/` has a backup, a handful of checks and two refreshers,
  and none of them writes `live_schema.csv`. So the only way past that check has always been
  the exact hand-edit it warns against — and CLAUDE.md records what that cost: **six of eight
  wrongly-recorded business rules took their evidence from a schema file nobody could
  regenerate.**
- **Why I could not write one.** I tried. Scripts reach the database through **PostgREST**,
  which serves rows and an OpenAPI document. That is enough for two of the file's ten sections
  — columns, and foreign keys from the FK notes. It cannot see CHECK constraints, PK/UNIQUE
  definitions, indexes, function signatures, triggers, or RLS. There is no `DATABASE_URL` in
  `.env` and no `pg` client installed on either side.
- **A generator that refreshed one section of ten and left nine stale, under a name promising
  a full refresh, would be its own lie.** I deleted the one I had written rather than ship it.
- **What it would take:** a `DATABASE_URL` (Supabase Settings → Database → Connection string)
  and `npm i pg` in the root. The ten queries are straightforward — `pg_constraint`,
  `pg_indexes`, `pg_proc`, `pg_trigger`, `pg_class.relrowsecurity`, and
  `information_schema.columns`. An hour's work once the connection exists.
- **Until then:** the snapshot is updated by hand from the catalogue, never from memory and
  never from `FULL_DATABASE_SCHEMA.sql`, and the change is shown in the commit so it can be
  read against the migration that caused it.
- **Raised:** 2026-09-19

### B-24 — going live on Adyen needs a merchant prefix nobody has yet

- **Blocked on:** nothing today. This is a note for whenever real money is meant to move, so
  the switch is not thrown by someone who thinks one line in `.env` does it.
- **What was wrong:** `config.adyen.environment` reads `ADYEN_ENVIRONMENT` and defaults to
  `TEST` — and **nothing in the codebase read it.** Checked by grep across backend and
  frontend: no reference anywhere. The host and the value reported to the browser were both
  written out as literals, in four places in `adyenService.ts`.
- **Why that mattered:** setting `ADYEN_ENVIRONMENT=LIVE`, restarting, and seeing no error is
  exactly what going live looks like. Every checkout would still have gone to the test host and
  reported success — money never taken, recorded as taken.
- **Fixed as far as it honestly can be.** The host is one constant now, the reported value comes
  from the setting, and anything other than `TEST` refuses to reach Adyen at all with a message
  saying what is missing. Verified: `TEST`, `test`, ` Test `, and empty are allowed; `LIVE`,
  `live` and `PRODUCTION` are refused with nothing charged.
- **What is actually needed to go live:** a live Adyen account posts to its own
  merchant-specific endpoint, `https://{prefix}-checkout-live.adyenpayments.com`, where the
  prefix is issued per account. That prefix is not configured here and cannot be guessed. Adyen
  issues it in the Customer Area alongside the live API key and client key.
- **The gateway is configured and working** against Adyen's test environment with GCash, and
  that is not in question here — only what happens the day someone means to leave it.
- **Raised:** 2026-09-19

### B-23 — no garbage fee has been recorded since July 2025 · **partly answered 2026-09-19**

- **Answered by Sean:** the rule follows her, not the other way round. BR-037 has been
  corrected to say **PHP 20 per unit per month**, which is what her ledger has always shown.
  The old wording — *"once per year per unit"* — was an assumption nobody checked, and it had
  spread into `09_MONTHLY_INCOME_REPORT.md` and `11_FORM_FIELD_AUDIT.md` as well. All three
  now match the data.
- **Still open, and stated flatly because that is all the data supports:** the last recorded
  garbage fee is in **June 2025**. Every month since reads ₱0.00.

  | | |
  | :--- | :--- |
  | months with a garbage fee recorded | 18 (Jan 2024 – Jun 2025) |
  | average in a month where one was recorded | ₱590 |
  | months since with nothing recorded | 14 (Jul 2025 – Aug 2026) |

- **This is not a finding about money.** Nothing here shows a fee was due and not collected.
  The ledger records what she entered; a blank means nothing was entered, and she may simply
  have stopped charging it. **Do not present it to her as uncollected income** — Sean's call,
  2026-09-19, and the right one: the system has no way to know what should have been charged.
- **What to ask, as a question and not a finding:** is the garbage fee still being charged?
- **Nothing to fix in the data.** 531 rows carry a fee and they are all hers.
- **Raised:** 2026-09-19

### B-22 — the landlady cannot log a repair she is told about in person

- **Blocked on:** Kiel, or your say-so. The endpoint exists and works; what is missing is a form,
  and a form is design. I have not invented one.
- **What is there:** `POST /admin/tickets` is written, guarded by `TICKET_MANAGE`, audited, and
  able to mark a unit Under Maintenance. **Nothing in the interface calls it.** The dispatch
  screen can list, assign, comment on, resolve and delete tickets — every verb except create.
- **What that means day to day:** the only way a repair enters the system is a resident filing it
  through the tenant portal (`POST /tenant/tickets`). If she notices a broken pipe herself, or a
  resident texts her or stops her on the stairs — which with 32 occupied units is most of how
  this actually happens — there is nowhere to put it.
- **`check:endpoints` does not catch it.** The vue-router path `/admin/tickets` collides with the
  API path, so the check sees the route as reached and the unplugged POST is invisible to it.
- **What I did do:** hardened the handler so it is safe whenever it is wired up. It used to fall
  back to `.from('rooms').select('id').limit(1)` — an arbitrary unit — when the unit could not be
  resolved, which would have attached a stranger as the reporter and could have marked their
  occupied flat Under Maintenance over a typo. Both misses are 400s now (commit `e5a7023`).
- **What it needs:** a "Log a repair" control on the dispatch screen opening a form with unit,
  title, description, category, priority, technician, and the "mark this unit under maintenance"
  checkbox the endpoint already accepts. `TICKET_CATEGORIES` and `TECHNICIANS` in `systemState`
  are the lists to use.
- **Raised:** 2026-09-19

### B-21 — 58 income rows were filed under a year their rent period did not fall in · **APPLIED 2026-09-19**

- **Blocked on:** the owner. This is her own book disagreeing with itself, and the data cannot
  say which half is right. I have not written a correcting migration and will not guess.
- **The measurement**, taken 2026-09-19 against `monthly_income_records` (937 rows):

  | | rows | rent involved |
  | :--- | ---: | ---: |
  | `rent_period_start` year disagrees with the `year` column | **58** | |
  | — of those, period is exactly **one year ahead** | 48 | |
  | rows where the **month** also disagrees | 30 | |

  It is not scattered noise. It splits cleanly in two:

  **Group A — 48 December rows whose period is a year ahead.** 27 rows filed `year=2024,
  month=12` carry periods in **Dec 2025 – Jan 2026** (₱220,250); 21 filed `year=2025, month=12`
  carry periods in **Dec 2026 – Jan 2027** (₱175,750). Unit 2a makes the pattern plain: an
  unbroken ₱8,000 monthly run from Jan 2024 to Jul 2026, every row paid at the end of its own
  month — except the December 2024 one, which is paid 1 Jan 2025 and claims the period
  **1–31 Dec 2025**, the same period as its genuine Dec 2025 row.

  **Group B — 10 non-December rows whose period is a year behind.** Seven of them are one
  unit's consecutive Jan–Jul run at ₱10,000 filed under 2026 with periods in 2025.

- **Why it matters now:** 21 rows currently carry rent periods in **Dec 2026 – Jan 2027**, about
  fifteen months in the future. Anything reading "what period is this receipt for" — the
  `Rent For` column on the exported report, and the rent-cycle arithmetic under BR-033 — reads
  those. The ledger's own month grouping is unaffected, because it groups on the `month` column.

- **CORRECTION, 2026-09-19.** I first reported that the fix would create a new duplicate. That
  was wrong, and it came from a sloppier definition of the affected set — one that mixed in the
  ten non-December rows and missed some December ones. Measured properly, against the two groups
  as they actually are:

  | | before | after |
  | :--- | ---: | ---: |
  | rows whose period year disagrees with `year` | 58 | **0** |
  | duplicate (unit, period) pairs | 14 | **2** |
  | duplicates newly created | — | **0** |

  The correction resolves twelve of the fourteen duplicates and creates none. The two that
  remain are a different defect: unit **3e** (month=3, paid 2024-04-05) and unit **PH**
  (month=10, paid 2024-11-10) each have a period that was never advanced to the next month.
  Their `month` column says which month they belong to; the exact day depends on the tenancy
  anniversary and should be confirmed before anything is written.

- **Every receipt in all fourteen pairs is exactly one month's rent** for that unit at the rate
  then in force. Nothing was ever paid twice — only the period label was wrong. Eleven of the
  fourteen are this same year-drift; three are the period failing to advance.

- **Sean confirmed the reading, 2026-09-19:** a December receipt paid in early January is the
  December that has just finished. The data agrees and rules out the alternative — all 48
  December rows cover exactly one month (29–32 days, ₱5,000–₱12,000), so none is a prepayment
  of the year ahead, and **43 of the 48 are their unit's only December row for that year**.

- **APPLIED 2026-09-19 on Sean's instruction**, after `npm run backup` wrote
  `backups/2026-09-19T08-06-43` (14,829 rows, 21 tables). Measured before and after:

  | | before | after |
  | :--- | ---: | ---: |
  | rows | 937 | 937 |
  | rent total | 7,772,250.00 | 7,772,250.00 |
  | water total | 314,000.00 | 314,000.00 |
  | garbage total | 10,620.00 | 10,620.00 |
  | **remitted total** | **8,086,250.00** | **8,086,250.00** |
  | period year disagrees with `year` | 58 | **0** |
  | impossible payment dates | 1 | **0** |
  | duplicate (unit, period) pairs | 14 | **2** |

  **Not one peso moved.** Only period labels and two payment dates changed. The 58 old values
  are in `rent_period_drift_backup_030`, so it is reversible from the database as well as from
  the file backup — the undo statement is at the bottom of the migration.

- **Still open, and not touched by 030:** the two remaining duplicate pairs. Unit **3e**
  (month=3, paid 2024-04-05) and unit **PH** (month=10, paid 2024-11-10) each carry a period
  that was never advanced to the next month. Their `month` column says which month they belong
  to, but the correct day follows the tenancy anniversary and should be confirmed with her
  before anything is written.

- **What I did instead:** `database/migrations/DIAGNOSTIC_rent_period_year_drift.sql` — read-only,
  writes nothing. Five queries: the scope, the two groups, every affected row listed for reading
  against her book, the duplicates that already exist, and the handful of out-of-range payment
  dates. Run it and the answer is on one screen.

- **The two odd payment dates, looked into properly on 2026-09-19:**

  **Unit 1c, Daryl Rivero — `2027-02-26`.** A year typo, and the surrounding rows prove it. He
  pays within a day or two of each period start: 2026-01-25 for a period starting 2026-01-26,
  2026-03-28 for 2026-03-26, 2026-04-26 for 2026-04-26. The stored day and month already match
  his period start exactly. **It is 2026-02-26.** Migration 030 corrects it.

  **Unit 2g, Sheena Mae Guianan, OR#4839 — `1900-01-17`.** Not a typo: that is **Excel's epoch
  showing through**. Excel counts days from 1 January 1900, so a cell holding the bare number
  `17` renders as 17 January 1900. The DAY survived as 17; the month and year were lost on
  import.

  **The receipt book pins the rest.** Receipts are written in order — 425 of the 434
  consecutive pairs in this ledger run in date order — and OR#4839 sits between two receipts
  four days apart:

  | receipt | unit | who | paid |
  | :--- | :--- | :--- | :--- |
  | OR#4838 | 2d | Joan Rejuso | **14 December 2024** |
  | OR#4839 | 2g | Sheena Mae Guianan | ??? |
  | OR#4840 | 2f | France Sacueza | **18 December 2024** |

  The 17th is the only date in that window. Six things agree and none disagree: the surviving
  day, the receipt before, the receipt after, her corrected rent period (9 Dec 2024 – 8 Jan
  2025, which contains it), her payment habit (her five other receipts land one day early to
  eighteen days late; the 17th is eight days in), and the gap in her ledger, which is exactly
  December 2024.

  Migration 030 now sets it to **17 December 2024**, as its own statement that can be dropped
  on its own if she says otherwise. It is still a date nobody wrote down.

  The other four out-of-range dates are genuine late-December payments for a January period and
  are correct as they stand.

- **What to ask her:** for a December receipt paid in early January, which does she mean — the
  December just gone, or the one coming? That single answer settles all 48 of Group A.
- **Raised:** 2026-09-19

### B-18 — every `check:all` writes ~45 permanent rows into the owner's audit trail

- **Blocked on:** your judgement. Nothing here is a bug, and the fix is not obvious enough for
  me to pick one on your behalf — it trades a security record against a readable one
- **The measurement**, taken 2026-09-19 against the live table:

  | | rows | |
  | :--- | ---: | :--- |
  | `AUTH_ACCESS_DENIED` | **6,770** | mostly `check:api` deliberately probing endpoints it must be refused by |
  | `LEDGER_EXPORT` | **1,581** | `check:reports` exporting workbooks, first seen 2026-09-14 |
  | `AUTH_LOGIN` | **1,201** | four suites sign in on every run |
  | everything a person actually did | **134** | |

  **88% of the trail is machine traffic**, and `audit_logs` is append-only by design — migration
  002 revokes `DELETE` from every role, so none of it can ever be removed. On this one day my
  own runs added **368 denied, 160 exports and 81 sign-ins**
- **Already fixed, and separately:** the *view* no longer counts downloads as events "done to
  the records", so the administrator's default tab went from 1,715 rows (92% exports) to the
  **134** real ones. That makes the screen honest. It does not stop the table growing
- **Why it is worth a decision rather than a shrug:** the trail is FR-029 and BR-028 — the
  record that important operations are traceable. A panel may well open it. Right now its
  contents are overwhelmingly our own test runs, and the ratio gets worse every working day
- **Three options, and I would not pick one for you:**
  1. **Accept it and say so.** The view already filters; the noise is just storage. Cheapest,
     and defensible out loud
  2. **Stop auditing a refusal that came from a suite.** Needs the suites to authenticate as a
     distinguishable principal, and that is a hole worth thinking hard about — an attacker who
     could set it would turn off the audit trail
  3. **Make `check:reports` stop exporting through the HTTP route**, or export once per run
     rather than per assertion. Narrowest of the three, and it removes 1,581 of the rows
- **What NOT to do:** delete rows. Append-only is deliberate, `DELETE` is revoked, and the
  permanence is the point of an audit trail
- **How to know it is settled:** either a line in the defense pack saying plainly what the
  trail contains and why, or the export count stops climbing on a `check:all` run
- **Raised:** 2026-09-19 by Claude, functional-audit session

---

### ~~B-17 — apply `database/migrations/028`: unit codes are unique only by case~~ — **APPLIED 2026-09-19**

> **Applied by Claude on your instruction.** `idx_rooms_room_number_lower` exists as
> `UNIQUE (lower(room_number))`; the collision guard passed with 0, and nothing else moved -
> 33 rooms, 937 income rows. `1A` can no longer be created beside `1a`, at the database level
> as well as in the handler.


- **Blocked on:** it is a live schema change, so it is yours — the same way `023` and `027` are.
  **The code half is already in and pushed**; this is the database backstop
- **What is wrong:** `rooms_room_number_key` is `UNIQUE (room_number)` on the raw text — read
  out of `pg_index`, not from a document — so it is **case sensitive**. The live table is mixed
  case and always has been: **22 lowercase** (`1a`..`3g`) and **11 uppercase** (`B1F`, `F1`,
  `LB`, `LF`, `PH`, …). So `'1A'` can be inserted while `'1a'` exists, and the property has two
  rows for one unit
- **Why it is not tidiness:** **six** lookups in `backend/src` find a unit with
  `.ilike('room_number', …)`, so both rows match — and the one on the money path,
  `POST /admin/income-records`, uses `maybeSingle()`, which **errors on more than one row**. A
  duplicate breaks the only route that records cash for that unit, as a **500** with nothing on
  screen to explain it. Same shape the judgement log records for the receipt guard
- **And it is reachable by doing the obvious thing.** Every screen displays unit codes
  uppercased (`fetchRooms` uppercases them), so an administrator adding a unit types the case
  she has been shown
- **What I already did:**
  - `POST /admin/rooms` now refuses a case-insensitive collision with a clean **409** naming
    the unit that already exists. Verified the mechanism read-only: `ilike '1A'` returns the
    existing `1a`, `ilike 'PH'` returns `PH`, an exact `= '1A'` returns **0 rows** (which is
    why the current index does not stop it), and a genuinely new code is unaffected
  - Wrote **`028_unique_room_number_ignoring_case.sql`**. It aborts with a named count if any
    case-collision already exists, then creates `UNIQUE (lower(room_number))`
  - **Checked before writing it: 0 collisions today**, so it builds cleanly
  - It does **not** rewrite the 22 lowercase codes. Their case is how they were migrated and
    documents quote them that way; normalising them is a decision about her data, not a
    constraint
- **This is not a new idea in this schema — it is the pattern `profiles` already uses twice.**
  Read out of `pg_index`: `idx_profiles_email_lower` is `UNIQUE (lower(email))` and
  `idx_profiles_phone_login` is `UNIQUE (normalize_ph_phone(phone_number))`. "One row per person
  however the identifier is spelled" is already enforced in the database for an email and a
  phone number; `rooms.room_number` is the one identifier that never got it, and it is the one
  an administrator types most often
- **What Sean needs to do:** re-run the collision query in the migration's header, then apply
  the file the same way as `023` and `027`
- **How to know it worked:** the migration raises
  `028: unit codes are now unique ignoring case (33 rooms)`, and
  `select indexdef from pg_indexes where indexname = 'idx_rooms_room_number_lower'` returns it
- **One thing to know if the code guard is ever removed:** a `23505` from this index would
  surface as a 500 from `ApiError.internal`. It would then need a 23505 branch, the way the
  Adyen webhook got one in `024` — judgement log entry 20
- **Raised:** 2026-09-19 by Claude, functional-audit session

---

### ~~B-16 — during an outage, two public pages tell a prospect opposite things~~ — **SETTLED 2026-09-19**

> **Sean's call, asked directly:** *"we should be honest and tell them we cant show right now and
> have a page or a component telling them ... and telling to contact directly."*
>
> Built as one shared component, `components/public/AvailabilityUnavailable.vue`, used by **both**
> pages so they cannot drift apart again. It shows no unit list, no rates and no counts - the
> seed is 33 always-vacant units at rates where 30 of 33 no longer match - and instead says we
> cannot show it right now, that this is **not** the same as having nothing free, and gives her
> number, a link to leave a message, and a retry.
>
> **Verified against a simulated outage in the browser, backend untouched:** the landing page no
> longer lists a single unit as Available, the category page reads *"which studio units are
> free"*, and with the fetch restored both return to normal.


- **Blocked on:** your call, and it is `frontend/src/` — the design account's lane, and
  `PublicGuestView.vue` had uncommitted work in it when this session started. Not something to
  reach across for mid-redesign, which is the same reason B-01 was written down rather than
  patched
- **How it was found:** `/public/rooms` was made to return 500 **in the browser only** (a
  `window.fetch` override on the page, backend untouched, restored afterwards), which is a way
  to exercise these paths without stopping a server two other sessions are using
- **B-01's fix is real and works.** The four category plates print *"Availability could not be
  loaded"* and no number. The standfirst drops its *"Rents start at ₱4,500"* sentence rather
  than quoting the seed. Both confirmed against a genuine failure
- **What disagrees:** with the same call failing,
  - **`/category/studio`** shows nothing and says *"The units could not be loaded. This is not
    the same as having nothing free. Reload the page, and if it keeps happening, ring the
    landlady … and she will tell you what is available."* — which is as good as this gets
  - **`/public`**, further down the same page whose plates just refused to state availability,
    lists the **seed**: all 33 units, every one **"Available"**, at seeded rates, under a notice
    saying the figures may be out of date
- **So a prospect during one outage is told both that availability cannot be determined and
  that 33 units are free**, on the same page. The judgement log's own line applies: two records
  disagreeing about one fact costs the standing of both
- **Worth knowing before deciding:** the seeded fallback *was* a deliberate decision (judgement
  log, fifth sweep: *"blanking the page on a hiccup would be worse for a public listing … what
  changed is an amber notice"*). But `CategoryRoomsView` no longer behaves that way — it blanks
  honestly now. **The recorded reasoning describes a state that has since been superseded**, so
  this is not simply overturning a live decision
- **The narrow version, if you want one:** the status cell is the only field that is *knowably*
  wrong rather than merely stale — the seed says vacant for all 33, which is never true. Rate,
  floor and type being out of date is what the notice already covers
- **How to know it worked:** with `/public/rooms` failing, no public page states a unit is
  available
- **Raised:** 2026-09-19 by Claude, functional-audit session

---

### ~~B-19 — apply `database/migrations/029` to turn on multi-month receipts~~ — **APPLIED 2026-09-19**

> **Applied by Claude on your instruction ("try it now yourself").** `record_income_for_months`
> reads back from `pg_proc` with all thirteen arguments, and the ledger is unchanged at 937 rows
> - installing a function writes no data. A multi-month receipt now records one row per month.
> The 501 branch in the handler stays, because it is what an environment without this migration
> should answer.


- **Blocked on:** applying it. A live schema change, so yours, same as `023` and `027`
- **Why it exists:** Sean, 2026-09-19 — *"we should follow her way and have a way to accommodate
  that."* Her way is **one ledger row per month**: `OR#4895` runs across four rows, `OR#4896`
  three, each with one month of rent and one month of water. There is no row in the 937 holding
  several months. The form's "months covered" field used to produce exactly that one wrong shape
- **What is already in and working without the migration:** single-month recording, unchanged —
  which is every collection this interface has ever made. The form now treats rent and water as
  **per month**, multiplies only the *total handed over*, and says on screen how many entries it
  will create
- **What the migration adds:** `record_income_for_months(...)`, which writes the N rows in one
  transaction. It is a database function for the reason `010`, `018` and `019` are: supabase-js
  cannot open a transaction, and a loop that writes three months and fails on the second leaves
  her having collected three months with one in the books
- **Until it is applied,** a receipt covering more than one month is refused with a **501**
  naming this migration and saying plainly that nothing was written. It cannot half-record
- **Also corrected alongside it, and this one is live now:** `year`/`month` were taken from the
  **date paid**. Her book files by the month the rent is **for** — where the two disagree, **216
  rows follow the period and 50 follow the payment date**. So arrears paid in October for August
  were being filed as October, landing the money in the wrong month of her report while August
  still looked unpaid
- **What Sean needs to do:** apply the file, the same way as `023` and `027`
- **How to know it worked:** it raises `029: record_income_for_months is installed`; a two-month
  receipt then produces **two** ledger rows sharing one receipt number, each with one month of
  rent and water, and the garbage fee on the first only (BR-037)
- **Raised:** 2026-09-19 by Claude, functional-audit session

---

### B-15 — the on-site form can ask for water the ledger will never record

- **Blocked on:** Mrs. Da Silva. Two of the three parts are hers to settle, and the judgement
  log's standing rule is not to invent her accounting policy
- **The root cause, and it is one thing:** the on-site payment form presents **water as an
  input**, and the server treats it as **derived**. `POST /admin/income-records` writes
  `water_payment: calcWater`, from `computeWaterFee(roomNumber, occupants)` — and there is no
  water field in the payload the modal sends, nor in `incomeRecordSchema` at all. Whatever is
  typed in that box is discarded. The schema's own comment says so in passing, about the
  garbage fee: *"Unlike water it is NOT derived"*
- **Three ways that surfaced, all latent — no collection has ever been recorded through the
  interface, so none has ever fired:**
  1. **Multi-month receipts.** The form multiplied the water baseline by `monthsCovered` and
     put it in *"Total handed over"*. `computeWaterFee` takes no month count, so a three-month
     receipt asked the resident for three months of water and recorded one. **Fixed in code** —
     the form now shows one month, because that is what the books keep
  2. **Any figure above the baseline** passed the check silently and was then replaced. BR-036
     asks the system to *"warn before saving rather than silently accepting"*, and it was
     silently accepting in the one direction nobody tested. **Fixed in code** — it now warns
     and names the figure the ledger will keep
  3. **Zero water cannot be recorded at all** for a non-Linda unit. The form explicitly allows
     ₱0 (*"unless it is ₱0"*), `occupants` is `min(1)`, and `computeWaterFee` always returns
     `heads x rate`. **Not fixed — this one needs her**
- **Checked against the live ledger, not reasoned about:**
  - **All 837** non-Linda rows with water record exactly `occupants x rate`. **None** records a
    multiple of it. So the server and her book already agree, and the form was the odd one out
  - **100 rows carry zero water** — 62 Linda (theirs sits in `linda_water_charge`, FR-036), and
    **38 non-Linda**, across 2024-2026. So zero-water rows are a real shape in her book that
    this form cannot produce
- **Question 1 is ANSWERED and built.** Sean, 2026-09-19: *"we should follow her way and have a
  way to accommodate that."* A multi-month receipt now becomes one ledger row per month, which
  is what her book already does. See **`B-19`** — the code is in and the migration that switches
  it on is waiting to be applied
- **What is still open, and still needs her:**
  - *Are there months where a unit pays rent and no water at all?* There are **38** such rows in
    her book, and the form offers ₱0 — but `occupants` is `min(1)` and the fee is `heads × rate`,
    so the server cannot write a zero. Until she answers, the form warns rather than pretending
- **How to know it worked:** she answers, and a multi-month collection entered through the form
  produces rows whose shape matches the 937 already there
- **Raised:** 2026-09-19 by Claude, functional-audit session

---

### B-14 — admin password rotated for real; rehearsal steps 7-26 still need a human

- **Blocked on:** nothing technical for the password — it is done. Steps 7-26 are blocked on a
  person, same as B-04 always was, but for a sharper reason now: **this agent cannot type a
  password into a browser form at all.** It is a hard-blocked action category
  (`Secret-Store Writes`), not a judgement call, and it does not lift for an authorized
  internal test account. It fired mid-rehearsal, after steps 1-6 were already run live.
- **What I was doing:** the functional audit asked for — `TESTING_REHEARSAL.md` steps 1-6,
  live, in a real browser, against the live database. `npm run backup` first
  (`backups/2026-09-19T00-01-15/`).
- **What actually happened, all verified against the running app and its network calls:**
  - Public enquiry from unit `PH` → `POST /api/public/inquiries` → **201**.
  - Admin sign-in, wrong-password rejection (*"That is not your current password."*, stayed
    signed in), then a **real** password change → `POST /api/auth/change-password` → **200**.
    Signed out, confirmed the session actually ended.
  - This is the one step `HANDOFF_TO_QA.md` §2 says nothing could ever test before, because it
    burns the credential every check signs in with. It is now tested, and the credential is
    burned on purpose.
- **The admin password is rotated. `credentials/creds.txt` is updated in place** (gitignored,
  not in this diff — the new value lives only there, never in a tracked file). **Anyone running
  `check:api`, `check:billing`, or signing in as admin on another machine needs it**, same
  out-of-band channel as always. The password this replaced is burned, same as the 13 Sep one.
- **One row I left behind, and it is on her board.** Step 3 files a real enquiry, and step 20 is
  the Undo for it — so stopping at step 6 leaves it open. It is
  **`1e21ef75-4dc6-49c0-8505-3068e36e833e`**, prospect **"REHEARSAL Test"**, unit **PH**, status
  **Pending**, raised 2026-09-19 00:03 UTC, with its one thread message and one notification.
  Close it through **Prospect Inquiries** (which is step 20 doing its job), or delete the row.
  **Not deleted from here:** that is a live-data change, and on this project those are a
  numbered migration and yours, not an ad-hoc `DELETE`.
- **Nothing else moved.** Counted against the session's own backup
  (`backups/2026-09-19T00-01-15/`): income **937**, expense entries **1,262**, allocations
  **1,327**, payments **15**, bills **2**, rooms **33**, profiles **45**, assignments **48** —
  all unchanged. **No money was written.** The deltas are the enquiry (+1), its message (+1),
  its notification (+1), and `audit_logs` +218 from five `check:all` runs and the sign-ins,
  which is append-only and expected.
- **What Sean needs to do:**
  1. Send the new admin password to whoever else has `creds.txt` (Loyd's machine, teammates).
  2. Run — or assign — `TESTING_REHEARSAL.md` steps 7-26 in a real browser, signed in with the
     new password. Nothing about the doc changed; it is exactly as ready as it was.
  3. Close or delete the REHEARSAL Test enquiry above.
- **Also re-confirmed live, unrelated to the block:** the two junk maintenance tickets from
  **B-05** (`asd`, and one titled with a slur) are still sitting on `1A`, still `Submitted`,
  still visible on the administrator's own overview under "Open repair requests" — migration
  `027` is written and still not applied. Nothing new here; just confirming it is still true
  today rather than assuming last week's note still holds.
- **How to know it worked:** `check:all` continues to pass with the new password (it discovers
  credentials from `creds.txt` rather than hardcoding them, since the 17 Sep fix); a manual
  sign-in with the value now in `creds.txt` succeeds.
- **Raised:** 2026-09-19 by Claude, functional-audit session

### ~~B-12 — this machine's `.env` still holds the legacy keys you disabled on 13 September~~ — **RESOLVED 2026-09-19**

> [!NOTE]
> **The keys arrived and the database is reachable from this machine.** Kiel pasted the current
> pair, they went into `.env`, the `tsx watch` child was respawned to re-read it, and:
>
> - `GET /api/health` -> 200, `"status":"online"`, database **connected**, rlsLockdown
>   **enforced** - "the public key reached PostgreSQL and was refused", which is migration 002
>   still holding.
> - `GET /api/public/rooms` -> **33 rows**: Studio 20, One-bedroom 8, Two-bedroom 4,
>   Three-bedroom 1. One Available, and it is `PH`.
> - `check:all` **17 of 19** on this machine. The two left are `check:relations` and
>   `check:api`, both waiting on `credentials/creds.txt`, which has never been here.
> - `check:liveness` runs all seven rules for the first time here, including the one that
>   could only SKIP before: *"the advertised starting rent is the cheapest unit - PHP 4,500/mo,
>   matching the cheapest of 33 units (7 of them at it)"*.
>
> **Two things did not go away with it, and both are Kiel's machine rather than yours:**
>
> 1. **The secret key was pasted into `.env.example` first** - the tracked template, and the
>    same file whose leaked legacy keys started all of this. It was moved into `.env` and the
>    template restored to its `sb_secret_your_key_here` placeholders before anything was
>    staged, so nothing entered git. It was then shown in a screenshot in a chat window. Not a
>    public leak, but the value has been somewhere it should not have been twice in one evening:
>    **rotating it is the cautious call, and cheap** - new secret key, into `.env`, revoke the
>    old.
> 2. **The pre-commit secret scanner was not installed here** (`core.hooksPath` unset), which
>    is why nothing objected to step 1. `npm run hooks:install`. Mutation-tested the same
>    evening: a staged `sb_secret_…` of realistic shape is refused with "COMMIT BLOCKED", while
>    one containing the word "fake" is correctly excused as a placeholder
>    (`check-secrets.mjs:121`).
>
> The detail below is the record of the diagnosis and is left as it was.



> [!NOTE]
> **Corrected an hour after it was raised, and the correction is the useful part.**
> This entry first said "Supabase has disabled this project's legacy API keys", as though the
> platform had done it on a schedule. It did not. **You** disabled them, deliberately, on
> 2026-09-13, because the legacy pair had been sitting in `.env.example` in a public repository
> since 2026-08-25 and there is no reset for a legacy key any more - migrating and disabling was
> the remediation. It is written down in `backend/src/config/env.ts:104-112`.
>
> So this is not a fault. It is the remediation working exactly as intended on a machine that
> never received the new keys. **Do not re-enable the legacy keys to fix it** - that restores a
> credential that is in a public repository's history.

- **Blocked on:** the `sb_secret_…` key. It has to be copied out of the Supabase dashboard and
  sent out of band; nothing in the repository can supply it, and it must not be committed.
- **What I was doing:** rebuilding the public category pages on the design machine, and
  verifying them against the running app rather than against a typecheck.
- **The symptom, measured 2026-09-19 with `npm run dev:backend` up on this machine:**
  ```
  GET /api/health        -> 503  {"database":{"status":"disconnected"}}
  GET /api/public/rooms  -> 500  ApiError: Legacy API keys are disabled
                                 (backend/src/routes/public.ts:65)
  GET /api/public/rates  -> 200
  ```
  The process boots and the settings endpoint answers from its own defaults; everything that
  reads a table is refused by Supabase's gateway before it reaches PostgreSQL. Both public
  pages then show their honest states - the landing says availability could not be loaded, the
  category page shows nothing and says so - which is the first time those paths have been seen
  working against a real failure rather than a simulated one.
- **The cause, not inferred:** `.env` on this machine defines `SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY`, and both values are legacy JWTs (they begin `eyJ`). The project
  stopped accepting that shape on 13 September. The file was last touched here on 17 September
  and still carries the pre-migration pair.
- **NOT a rename, and my first version of this entry said it might be.** `config/env.ts:124` and
  `:131` read `either('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY')` and
  `either('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY')` - precisely so a stale `.env` does
  not break the boot. The backend is reading the key it is given. The key is the problem, and
  there is nothing to change in `backend/src`.
- **What Sean needs to do:** Supabase dashboard -> Project Settings -> API Keys, copy the
  **secret key** (`sb_secret_…`) and the **publishable key** (`sb_publishable_…`), and send a
  `.env` that sets `SUPABASE_SECRET_KEY` and `SUPABASE_PUBLISHABLE_KEY` - the same channel
  `credentials/creds.txt` travels by, since both are gitignored and neither comes down with a
  pull. (`.env.example` is already correct - it names `SUPABASE_PUBLISHABLE_KEY` and
  `SUPABASE_SECRET_KEY` with `sb_` placeholders, checked 2026-09-19 - so a machine set up from
  it today would ask for the right two. This one predates that.)
- **How to know it worked:** `GET /api/health` returns 200 with `"status":"connected"` and the
  boot log reads "Supabase connected (service_role)" followed by the RLS lockdown line;
  `/api/public/rooms` returns 33 rows; `/public` shows real counts on the four category plates
  instead of "Availability could not be loaded"; `/category/studio` lists 20 units; and
  `check:all` goes from **14 passing to 17** on this machine. The last two, `check:api` and
  `check:relations`, additionally need `credentials/creds.txt`, which has never been here - so
  19 of 19 is still only reachable on yours.
- **Raised:** 2026-09-19 by the design account (Kiel's machine)

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

### B-20 — unit F1 says floor 3, and its own description says 1st Floor

- **What it is:** `rooms` holds `floor = 3` for unit **F1** (Front Apartment), and the same row's
  `description` reads **"Front Apartment 1st Floor"**. One of the two is wrong and only the owner
  knows which.
- **How it was found:** the public unit row now prints the floor label directly above the
  description, so the page said "3rd Floor" and "Front Apartment 1st Floor" about the same unit
  in adjacent lines. Checked against all 33 published rows: F1 is the ONLY one whose description
  disagrees with its `floor`. Every other row agrees - 1st, 2nd, 3rd and Penthouse, unanimously.
- **Why I did not fix it:** it is live data, and it is not a formatting question. If `floor` is
  wrong then F1 sits on the wrong floor everywhere in the application - the directory, the floor
  stack on the category page, and any floor plan drawn later. If the description is wrong it is a
  typo. Guessing picks one and hides the other.
- **What to ask her:** is F1 on the 1st floor or the 3rd?
- **Then:** a numbered migration in `database/migrations/` correcting whichever field she names.
  One row, one column. Do not touch the other 32.
- **Raised:** 2026-09-19

### B-12 — the public FAQ quoted an electricity rate the system does not hold · **mostly answered**

> **She had already answered this, and the answer was stronger than the question.**
> `CLIENT_ANSWERS_2026-09-17.md` Q5: *"No, the electricity is not a feature or a part of the scope
> in our system. Every unit has its own electric meter which is paid separately by each tenant, and
> also is not recorded in the income or even expenses."*
>
> So the page was not merely quoting an unverifiable rate - it was describing a billing
> arrangement **that does not exist**. The boarding house does not bill for electricity at all.
> The answer now says each unit has its own meter, the tenant pays separately, and it is not part
> of the rent.
>
> **What is left is a confirmation, not a question**, because that answer was relayed and dictated
> rather than minuted and is now being used to change what the public site says about money. It is
> on `CLIENT_CONFIRMATION.md` § 1 as a yes/no with a fallback if she does in fact collect it.

- **Blocked on:** the owner. Two of these are house facts nobody has written down, not code
- **What was wrong:** the landing page's FAQ answered *"How is electricity metered and billed?"*
  with **"Readings are recorded on the 25th of every month and billed at actual consumption rate
  (₱12.50 / kWh)"** — a price and a date quoted to prospective tenants on a public page
- **Checked rather than assumed:**
  - `system_settings` holds **five** keys — `grace_period_days`, `linda_lb_water_charge`,
    `linda_lf_water_charge`, `revenue_share_percent`, `water_rate_per_occupant`. **None is an
    electricity rate.**
  - `information_schema.tables` has **no** table matching `%meter%`, `%electric%`, `%reading%` or
    `%utility%`. The system records no meter reading anywhere, so nothing produces a bill "at
    actual consumption rate"
- **This does not make it false.** She may well read the meters by hand on the 25th and charge
  ₱12.50. It makes it **unverifiable from here**, and an electricity rate is the kind of number
  that moves — quoting a stale one to somebody deciding where to live is the harm
- **What the page says now:** that each unit has its own submeter and you are billed for what it
  shows, then asks them to get the rate and the reading day from her. No figure, no date
- **What Sean needs to do:** ask her two things — *what do you charge per kWh, and when do you
  read the meters?* If the answers are stable, they belong in `system_settings` beside the water
  rate, not in page copy
- **How to know it worked:** the FAQ quotes a rate again, and it comes from the API
- **Raised:** 2026-09-19 by the design side, while auditing the public site

---

### B-13 — the FAQ asked new tenants for two months' money; OD-04 says nobody knows

> **On `CLIENT_CONFIRMATION.md` § 2**, written out with both of her answers, the question that separates them, and the evidence that does not decide it.

- **Blocked on:** **OD-04, which is CONTESTED.** This is not mine to settle and the register says
  so in terms
- **What was wrong:** the public FAQ answered the move-in question with **"1 month advance rent
  and 1 month security deposit"** — two months of somebody's money, stated as fact to a person
  deciding whether they can afford to live here
- **Neither client answer says that.** Both describe **one** month:
  - **2026-09-13**, cited in live code at `admin.ts:800` — advance rent, and *"this business
    collects no separate damage or security sum"*
  - **2026-09-17**, relayed — the same money **is** a deposit: held, spent on repairs at move-out,
    the remainder refunded (₱6,500 held, ₱6,400 of repairs, ₱100 back)
  - The decisions register: *"Do not build from either."* The FAQ was not built from either — it
    asserted **both at once**, which is the one reading nobody gave
- **What the page says now:** a valid ID, the registration form, and one month of rent up front —
  which is what the system actually records under BR-039 and is uncontested — then asks them to
  confirm the total with her, and says plainly that what is held and how it is settled is hers to
  explain
- **What Sean needs to do:** ask the question already drafted in the register § 1.5. Until then
  the page should keep stating no total
- **How to know it worked:** OD-04 closes, and the FAQ can state the move-in sum plainly
- **Raised:** 2026-09-19 by the design side, while auditing the public site

---

### B-10 — resident and team email addresses in tracked documents · **CLOSED 2026-09-19, accepted by Sean**

> **Sean read the remaining eleven on 19 Sep and accepted them.** Recorded here with what they
> actually are, because the count on its own overstates the exposure and the next person to read
> this queue should not have to work that out again.
>
> | What | How many | What it actually is |
> | :--- | :--- | :--- |
> | `mireel.fatima.parcareyinv5223@gmail.com` | 2 | **A fabricated address**, quoted in a session report and in the judgement log as *evidence of a defect*. Not a real person's address at all |
> | `database/FULL_DATABASE_SCHEMA.sql:515-520` | 6 | Seed `INSERT` fixtures. The phone numbers beside them are sequential inventions - 09181234567, 09191234567, 09201234567 - and the passwords are bcrypt hashes of the burned `Hivelet@Tenant2026` |
> | `mark.cruz@gmail.com` in `docs/superpowers/**` | 3 | Adyen test instructions, quoted beside that same burned password |
>
> **Four of the addresses do match live `profiles` rows** - Mark Cruz, Jaye Casia, Miguel Ramos and
> Rhea Mendoza - because the live database was seeded from that block. Two more are team members'
> own (`sean.jerve@`, `john.lloyd@`).
>
> **Editing the files would not have helped much.** These sit in git history and stay readable in
> old commits whatever the working tree says. The only action that closes that is making the
> repository private, which was offered on 19 Sep and declined for now. It remains the thing to do
> if the exposure ever stops being acceptable.
>
> `check:secrets` still lists all eleven on every run. That is deliberate: accepted is not the same
> as forgotten, and that list is how a later reader finds them.


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
- **The state you asked for now exists, 2026-09-19 — confirm it is the one you wanted.** You
  offered two acceptable outcomes: suppress the counts, or show them with an explicit
  "availability unavailable" state. The second is implemented. The plates no longer print a
  vacancy figure they cannot verify; with `/public/rooms` unreachable each one reads
  **"Availability could not be loaded"** and prints no number at all. Verified against the
  running app with the backend returning 500 (B-12).

  Two things changed underneath it. The plates now group units by `room_type` rather than by
  the first character of the unit code, so they agree with the category page your `e1d6e68`
  corrected - until 2026-09-19 the landing still advertised the old three categories and their
  old counts. And the seed can no longer masquerade as a count: its `room_type` strings are
  the wrong ones, so grouping it matches nothing, which is why the state above is a sentence
  rather than a row of zeros. **If you want suppression instead - no line at all - say so; it
  is one `v-if`.**

### B-05 — Apply `database/migrations/027` to remove two test repair tickets · **CLOSED 2026-09-19 — do not run it**

> **Both tickets are already gone, and 027 must NOT be run now.** Checked on 2026-09-19:
> neither `ff4f757f-…` nor `9e49c691-…` exists in `maintenance_tickets` any more. Somebody
> removed them by another route.
>
> The migration's guard requires both rows to exist AND still read `Submitted`. It now finds
> **0** and would raise *"expected 2 guarded test tickets, found 0"* — harmless, it deletes
> nothing, but it reads as a failure and would send the next person looking for a fault that
> is not there.
>
> `maintenance_tickets` now holds **3 rows, all Resolved**, and all three are test data too:
> "Water Pipe Leak under Sink" (1a, reported by the test resident Mark Cruz), "Bed Frame Slat
> Loose" and "BASAG" (both 1b, reported by Sean). **No real repair has ever been recorded in
> this system** — which is B-22, the missing form, seen from the other end.
>
> Whether those last three should go before the client sees the system is a separate decision
> and has no migration written for it.


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
