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

### ~~B-59 — a frontend bug could have re-shifted an income date by a day on any edit since B-27's fix~~ — **RESOLVED 2026-09-23, confirmed clean**

> **Conclusively ruled out, not just unobserved.** The open question below was whether the
> `PATCH /admin/income-records/:id` route — the one `startEditIncome` fed a corrupted date into on
> every save — had ever actually run against a row still in today's live ledger. It has not, and
> the audit trail proves it rather than merely failing to show it:
>
> ```sql
> SELECT
>   (SELECT COUNT(*) FROM monthly_income_records WHERE voided_at IS NULL) AS active_live_rows,
>   (SELECT COUNT(*) FROM monthly_income_records mir
>      WHERE mir.voided_at IS NULL
>        AND EXISTS (SELECT 1 FROM audit_logs al WHERE al.action = 'PAYMENT_CORRECT' AND al.entity_id = mir.id)
>   ) AS active_rows_ever_corrected;
> -- 937, 0
> ```
>
> Every `entity_id` the `PAYMENT_CORRECT` action has ever touched (38 distinct rows, all of
> history) was cross-checked against the live table directly: **37 no longer exist at all** — test
> fixtures from `check:api`/rehearsal, since removed — and the **one that does** is the exact B-56
> row above, created and voided **the same session, four minutes apart**. Zero of the 937 rows
> presently in the ledger have ever been through this route. `TESTING_REHEARSAL.md`'s own note
> corroborates it independently: only the checkout path (B-54) has been used by a real person
> against real data so far; every other write path, this one included, has not.
>
> **Nothing to migrate.** The code fix (below, already shipped) closes the path going forward; no
> row needs correcting because none was ever touched. Original entry kept for the reasoning.

- **What I was doing:** auditing forms/alerts per Sean's request, following up on a background
  agent's finding that income and tenant records format bare `date` columns
  (`new Date(inc.date_paid).toLocaleDateString(...)`, no `timeZone`) the same way
  `fetchExpenseRecords` already found and fixed for expenses — UTC midnight parsed, then
  displayed in the *viewer's* local zone, one day early for anyone west of Manila.
- **What I already did.** Fixed the display bug (added `formatDateOnly` to
  `frontend/src/lib/propertyDate.ts`, used it in `fetchIncomeRecords`/`fetchTenants` in
  `frontend/src/lib/systemState.ts`) and a second, worse bug it uncovered:
  `IncomeCollectionsView.vue`'s `startEditIncome` re-parsed the *already-shifted display string*
  (`new Date(r.datePaid)`) rather than a raw ISO value, and wrote that back through `propertyDate()`
  on **every edit** — correcting a typo in Rent Amount, on a browser set west of UTC+8, would have
  silently shifted that row's `date_paid` back a day, whatever field the admin thought she was
  changing. Added `IncomeRecord.rawDate` (the untouched `YYYY-MM-DD`) and pointed the edit dialog
  at that instead. Verified live: a US-Eastern browser previously read a Feb 1 payment as "Jan 31,
  2026"; with the fix, every viewer reads it as "Feb 1, 2026" regardless of zone. `vue-tsc
  --noEmit`, `npm run build`, and `check:all` all pass.
- **Why this needs Sean and isn't just closed.** This is the *exact* symptom `database/migrations/
  032_correct_imported_date_paid.sql` (B-27) fixed once already — "every imported payment date was
  a day early" — except B-27's cause was the *import script*; this one is the *edit dialog*, still
  live in `main` from whenever `startEditIncome` was written until this fix lands. Every date it
  corrected on 2026-09-19 was a candidate for silent re-corruption by any edit since, from any
  admin browser not set to `Asia/Manila`.
- **What I checked, read-only, before writing this.** Queried `audit_logs` for `action =
  'PAYMENT_CORRECT'` where `previous_values->>'date_paid' IS DISTINCT FROM
  new_values->>'date_paid'`. Almost every hit clusters into tight bursts of several rows a few
  seconds apart on 2026-09-19 and 2026-09-22 (one burst's last row lands at **10:01:07.777675 UTC
  on 2026-09-22**, the exact timestamp B-56 already documented as the rehearsal void) — the
  signature of `check:api`/rehearsal exercising this route against scratch rows, not a person
  editing the real ledger. Two older rows, both on **2026-08-25** (`old_date → new_date` genuinely
  one day earlier: `2026-08-25→2026-08-24`, `2026-06-15→2026-06-14`), do show the real shift — but
  that predates the live import itself (**2026-08-28**, per B-27), so it reads as dev-phase testing
  on pre-production data, not the 937-row ledger. **I found no audit row I can point to as a real
  admin edit re-shifting a live date since 2026-09-19** — but a SELECT against `audit_logs` proves
  absence of evidence, not absence of the bug: an edit that happened to leave `date_paid`
  unchanged (touching only rent/water/invoice, with `datePaid` sent back unchanged in the payload)
  would show identical `old_date`/`new_date` in this same query and be invisible to it.
- **What Sean needs to do.** The same reconciliation B-27 already ran once: compare every live
  `monthly_income_records.date_paid` against her original spreadsheet (still in the repo, same
  source B-27 used), for rows whose `updated_at` is later than their `created_at` — those are the
  ones an edit could have touched. If any disagree by exactly one day, that is this bug, and the
  fix is the same shape as `032_correct_imported_date_paid.sql`: a new numbered migration, backed
  up first, correcting only the mismatched rows.
- **How to know it worked:** every edited row's `date_paid` matches her sheet, the same table B-27
  printed (`matching her sheet` / `still one day early`) comes back all-937/all-zero again.
- **Raised:** 2026-09-23 by Claude (frontend audit session)

---

### ~~B-56 — a receipt recorded during today's testing is in her live ledger, and it moved her total~~ — **RESOLVED 2026-09-22, voided**

> **Closed the right way, and quickly.** The row was **voided at 10:01:07 UTC**, four minutes and
> nineteen seconds after it was created — someone ran the create-then-void cycle, which is exactly
> what `voided_at` is for and what TESTING_REHEARSAL asks for.
>
> **Verified afterwards:** the ledger reads **937 live rows / ₱8,086,250.00** again, the standing
> figures, and `check:ledger` is **green** with both ratchets back at their baselines — BR-033 at
> 16 and BR-014 at 3, the values they held before the row appeared. Nothing needs doing.
>
> **Worth keeping for two reasons.** First, it is the first time the void path has been exercised
> by a person against live data, which is evidence for Chapter 4 alongside B-54. Second, it is the
> clearest demonstration yet of why the ratchets exist: nobody told this session the data had
> changed, and a suite that had passed four times running went red for exactly the right reason,
> then green again when the row was voided. The original entry is kept below.

#### The original finding

**⚠ `check:ledger` was RED because of this row, and I deliberately did not make it green.** Bumping
the two ratchets would have hidden a real change in her financial data behind a passing build,
which is the exact failure CLAUDE.md warns about.

- **What appeared.** One new `monthly_income_records` row, written **2026-09-22 09:56:48 UTC**
  (≈17:56 Manila), while styles were being edited on the other machine. Nothing in this session
  wrote it — every query I ran was a SELECT.

  | | |
  | :--- | :--- |
  | id | `256a35d7-271d-4789-b5b0-667ea3c183ac` |
  | unit | **1a** |
  | receipt number | **`OR#123333333`** |
  | period | 2026-09-22 → 2026-10-21 |
  | occupants | **3** |
  | rent / water | ₱8,000 + ₱600 |
  | **remitted** | **₱8,600.00** |
  | payer | "Lobby Toor, Mark Cruz" |
  | method | Cash |

- **It moved her reported income.** Measured both ways: the ledger now totals **₱8,094,850** across
  **938** live rows; excluding this one row it totals **₱8,086,250** across 937 — which is exactly
  the standing figure quoted throughout this repository. So the row accounts for the whole
  difference, to the peso.
- **Three things say it is a test, not a real receipt:**
  1. `OR#123333333` is not a number from her sequence, which runs like `OR#4895` and `INV#5227`.
  2. It bills **3 occupants** where 1a's active assignment records **1** — that is the BR-014
     ratchet moving 3 → 4.
  3. Its period starts **on the day it was entered** (the 22nd) rather than on 1a's cycle, which
     the bill raised this morning shows running the 7th to the 6th — that is the BR-033 ratchet
     moving 16 → 17.
- **But I am not assuming.** Recording a receipt *is* a rehearsal step, so this may be exactly the
  test it looks like and entirely intended. **What it must not be is forgotten**, because it is
  currently indistinguishable from real money in her Monthly Income Report.
- **What Sean needs to decide:** was this a test? If yes, it should be **voided** — `voided_at`
  exists precisely so the ledger keeps the row and drops it from every total, which is what B-35
  used and is better here than a delete. Say the word and I will stage it as a numbered migration
  naming that one id. **I have not touched it**, because a live financial row is not mine to
  change.
- **Until then, do not quote ₱8,086,250 or "937 rows"** without checking which of the two figures
  you mean. Both are currently true of different things.
- **The wider point, worth keeping:** the ratchets did their job. Nobody told this session the data
  had changed; a check that had passed four times in a row went red, and it went red for the right
  reason. That is the argument for them, made better than any principle.
- **Raised:** 2026-09-22 by Claude, caught by `check:ledger` during post-consultation consolidation.

### ~~B-58 — ⚠ two of the five profiles marked for deletion must not be deleted~~ — **APPLIED 2026-09-23**

> **050 applied, and the two exclusions held.** Verified against the live tables afterwards:
> profiles **40 → 34**, while active tenancies stayed **32**, units **33**, income **937 rows** and
> the remitted total **₱8,086,250.00**. Jaye Casia is active in LB with 31 receipts and ₱170,500;
> Mark Cruz is deactivated with all **902** audit rows intact. Sean confirmed Jaz was a dummy.

**Read this before deleting anything in the Supabase dashboard.**

You asked to delete five — Mark Cruz, Jaz, Jaye Casia, Miguel Ramos, Rhea Mendoza — after Supabase
refused with a foreign key error from `audit_logs`. Checked all five against the live tables.
**Three are inert. Two are not.**

- **❌ JAYE CASIA IS A CURRENT, PAYING RESIDENT.** `55555555-…`. One **active** tenancy, living in
  **LB** right now; **31 live income rows** carrying **₱170,500.00**; billed ₱5,500 a month, most
  recently July 2026 (`N/A-LB-7-2026`). Deleting her removes someone who currently occupies a unit
  and destroys ₱170,500 of the owner's financial record. **B-43 reached the same conclusion
  independently on 2026-09-20** — hers was one of the two names found on the public website, and
  that entry records her as a current, active resident.
- **❌ MARK CRUZ HOLDS THE AUDIT TRAIL.** `22222222-…`, the id in your error. No money (0 income
  rows), but **13 payments** and **902 `audit_logs` rows as actor** — which is exactly what the
  refusal was about. **That refusal is the database working correctly.** `audit_logs` is
  append-only by grant: `service_role` has INSERT, SELECT, REFERENCES, TRIGGER, TRUNCATE and **not
  DELETE**, established in B-41.
  - **Do not accept Supabase's offer to "set an on delete behavior" on that constraint.** CASCADE
    destroys the 902 rows *and* makes every future profile delete quietly destroy audit history;
    SET NULL keeps the rows and erases who did it, which is the column that made them worth
    keeping. B-41 settled this when 276 false audit rows were found and deliberately left standing:
    an audit log you edit when its contents are inconvenient is not an audit log.
  - **Migration 049 already deactivates him**, which takes his access away and removes him from the
    resident list without touching one audit row. That is almost certainly what was wanted.
- **✅ The three that are genuinely safe** — Jaz, Miguel Ramos, Rhea Mendoza. Every foreign key
  counted live: 0 income, 0 payments, 0 bills, 0 tickets, 0 messages, 0 notifications, 0 audit
  rows. Only 3 `room_assignments` rows between them, which the migration deletes alongside.
- **What Sean needs to do:** apply `database/migrations/050_three_dummy_profiles.sql` instead of
  deleting from the dashboard. It refuses to delete any of the three if something has come to
  reference them since it was written, and it verifies afterwards that Jaye Casia is untouched and
  still housed.
- **How to know it worked:** the migration's first SELECT returns 0 rows, the second still shows
  Jaye Casia active in LB with 31 rows and ₱170,500.00, and the ledger still reads **937 rows /
  ₱8,086,250.00** with `profiles` down by exactly three.
- **Raised:** 2026-09-22 by Claude, after Sean hit the constraint in Supabase.

### ~~B-57 — two residents who moved out can still sign in~~ — **APPLIED 2026-09-23**

> **049 applied.** No tenant who has moved out can sign in any more — the live count of active
> tenant profiles with no active tenancy is **0**. Jaz was then deleted outright by 050, which also
> carried off the `room_assignments` row this entry noted as having no `end_date`.

- **Your rule, 2026-09-22:** moving a tenant out should take their account and site access away
  automatically, while their records stay.
- **The application already does exactly that**, and it is stronger than it looks:
  `POST /admin/tenants/:profileId/vacate` writes `account_status = 'inactive'`, and
  `resolveAuthUser()` re-reads that column on **every authenticated request** — so a resident moved
  out through the interface loses the portal on their **next tap**, not at their next sign-in. A
  token already in their phone stops working. Verified by reading both, not assumed.
- **These two predate that path.** Their tenancies were closed by the bulk import of 2026-08-25
  rather than by the Vacate button, and that import closed the assignment without touching the
  profile. Read from the live tables on 2026-09-22 — every `role = 'tenant'`, `account_status =
  'active'` profile with **no** active assignment:

  | | | | |
  | :--- | :--- | :--- | :--- |
  | **Jaz** | jaz@gmail.com | formerly **1d** | assignment carries no end date |
  | **Mark Cruz** | mark.cruz@gmail.com | formerly **1a** | ended 2026-08-25 |

  Both units are lived in by somebody else now — 1d by Sandrine Jammeka Mariano, 1a by Lobby Toor —
  so these are not residents between tenancies.
- **It also closes a second thing.** A moved-out resident with an active account can file a
  maintenance ticket against the unit they left, and it lands on the dispatch board attributed to
  that unit — reading as a complaint from whoever lives there now. Deactivating stops it, because
  the request never gets past `resolveAuthUser`.
- **What Sean needs to do:** read and apply
  `database/migrations/049_two_moved_out_residents_can_still_sign_in.sql`. It touches
  `account_status` and **nothing else** — no row is deleted, no record detached, both names stay on
  every receipt and ticket they appear on, and the ledger totals do not move. Fully reversible. It
  names the two ids explicitly rather than matching a pattern, and refuses to touch either one if a
  tenancy has been given back since it was written.
- **How to know it worked:** the migration's own first verification SELECT returns **0 rows**, and
  the second still reads **937 live income rows / ₱8,086,250.00**.
- **One thing deliberately not done:** Jaz's assignment has no `end_date` and this does not invent
  one. It is one of the four rows `check:ledger` already pins as import debris. Nobody knows which
  day it was, and writing a guess into her records to tidy a column is the thing this project keeps
  refusing to do.
- **Raised:** 2026-09-22 by Claude, acting on Sean's move-out rule.

### B-55 — four things a services-layer audit found · **Sean answered 2026-09-22; two now fixed, one deferred by his decision**

> **Asked directly, in plain terms, and answered:**
>
> - **Part-payments (item 1) — "leave it for now".** Deliberately deferred, not forgotten. It
>   cannot happen today because the checkout amount is server-derived from the outstanding
>   balance, and closing it needs a migration against the live database. The analysis below stands
>   for whenever that is wanted.
> - **Months covered (item 3) — "refuse and tell me".** **Done.** The edit now refuses a change
>   with a message naming the way round it (void and re-enter), instead of returning 200 and
>   dropping the field. Only a *change* is refused: the screen sends the current value on every
>   edit, so refusing its presence would have broken editing outright — checked against
>   `IncomeCollectionsView`, which resets the field to 1 when the dialog opens.
> - **Rent period (item 2) — "yes, use their own date".** **Done.** It now derives the cycle from
>   the tenancy's `anniversary_date` through `computeRentPeriod`, the same helper the receipt path
>   uses. Where there is genuinely no tenancy on file — a payment settled after one ended — it
>   anchors on the day the money was actually paid, which is still a guess but a self-consistent
>   one that can be explained to her, which a fixed 26th never could.
> - **Item 4 (the two minor ones) — still open**, untouched and unimportant.

#### The original findings

Three of the audit's findings were fixed the same day (commits `94cd28e` and `7dd6727`: the
month-end anniversary off-by-one, `year`/`month` not following an edited rent period, and an
occupants floor). **These four are left, each for a stated reason.** Every one below was verified
against the live catalogue or live source by me, not taken on report.

**1. `settle_verified_payment` marks a bill Paid no matter how much was paid. Needs a migration.**

- Read from `pg_get_functiondef`, not from any schema file. The whole of its bill handling is:

  ```sql
  IF v_payment.bill_id IS NOT NULL THEN
    UPDATE bills SET status = 'Paid', updated_at = NOW() WHERE id = v_payment.bill_id;
  ```

  There is no comparison against `total_amount` anywhere in the function.
- **`allocateReceipt` gets this right** and writes `'Partially Paid'`, which is a real value of
  `bill_status_type` (`Pending | Due | Overdue | Paid | Partially Paid`, read from `pg_enum`). So
  the two settlement paths disagree with each other about the same situation.
- **Latent, not live.** The checkout amount is server-derived from the outstanding balance, so a
  short payment needs a tampered amount or a race to arrive. Nothing in the live data shows it
  having happened.
- **Why I did not fix it:** it is a Postgres function, so the fix is a numbered migration against
  the live database, which is yours to apply. Say the word and I will stage it.

**2. A hardcoded 26th–25th cycle overrides the tenant's actual anniversary.**
`backend/src/routes/admin.ts:1833`. When a verified payment has no bill, the rent period falls back
to a literal `if (d >= 26)` → 26th-to-25th window. BR-033 says the cycle runs from the tenant's
anniversary. The assignment is read two lines earlier but selects only `id, occupant_count`, so the
anniversary is not even fetched. **Measured against the live table: 19 of 32 tenancies anchor on
the 1st**, and the rest on the 3rd, 7th, 9th, 13th, 21st or 28th — so 26–25 is wrong for
effectively all of them. Reached when the gateway logs a bill-creation failure and leaves
`bill_id` null. Not fixed here because it needs the select widened and a decision about what to do
when there is genuinely no assignment to read.

**3. `monthsCovered` is accepted when editing a receipt, reported as saved, and dropped.**
`admin.ts` destructures it on the PATCH path and never uses it, and
`IncomeCollectionsView.vue:754` **does send it** — I checked, so this is reachable, not theoretical.
An administrator changing "months covered" from 1 to 3 is told it saved and nothing happens. The
same shape as the `gbgFee` defect that schema's own comment already documents. **Not fixed because
it needs your decision, not a patch:** either honour it (re-split the row across months, the way
`record_income_for_months` does on create) or refuse it with a message. Silently dropping it is the
only option that is certainly wrong. Note that simply removing it from the schema would break
editing outright, since the schema is `.strict()` and the frontend sends the field.

**4. Two minor ones, recorded so they are not rediscovered.**
- `OnsitePaymentModal.vue:398` formats the confirmation date with `toLocaleDateString` and no
  `timeZone`, so it is correct only because the browser happens to be in Manila. Left alone because
  the interface is the other machine's lane and styles were being edited there at the time.
- `billingService.ts:36` computes `waterBasis` and documents it as being "for the audit log", but
  no caller reads it. Either wire it up or drop the claim.

- **Raised:** 2026-09-22 by Claude, post-consultation consolidation.

### B-54 — the first bill this system ever raised for real · nothing to fix, but you should know it is there

- **Not a defect.** This is a footprint entry, the same discipline B-35 used, plus the first real
  evidence that a money path works end to end.
- **What happened.** During the live GCash attempt on 2026-09-22, `POST /tenant/payments/checkout`
  raised a bill on demand, which is the designed behaviour (see `docs/13_AUDIT_JUDGEMENT_LOG.md`
  § 3.6 — bills are raised on demand, deliberately, not by a scheduler). It is the first time any
  write path in this system has been driven by a person rather than by the import.
- **The row**, read from the live table rather than inferred:

  | | |
  | :--- | :--- |
  | id | `880799ef-0162-49ec-9a51-c3506669b49a` |
  | unit | **1a** |
  | period | 2026-09-07 → 2026-10-06 |
  | total | **₱8,200.00** |
  | status | **Due** — the payment came back Refused, so nothing was ever recorded against it |
  | created | 2026-09-22 04:57 UTC |

- **It is arithmetically right.** ₱8,000 is 1a's live `current_price`, and ₱200 is BR-014 water for
  its one occupant. The figure was not typed anywhere; `computeBillAmounts()` produced it.
- **It is not a duplicate, and it does not invent an obligation.** Checked before writing this:
  unit 1a has **zero** September income rows, and the newest period she has recorded for it is
  **2026-07-07**. So the tenant genuinely does owe that period, and her ledger does not already say
  otherwise. B-34's `idx_one_bill_per_tenant_per_period` also makes a second bill for the same
  period impossible, so her own workflow cannot collide with it.
- **My recommendation: leave it.** Unlike B-35's 37 rows, this is not litter — it is a correct bill
  for a real tenancy, produced by the real code path. Deleting a true obligation to tidy up would be
  the wrong instinct, and `bills` has no voided state to soften it with.
- **What you might want to do anyway:** nothing technical. Just be ready to say what it is if she
  asks why unit 1a shows an outstanding September bill when she has not written one — the honest
  answer is that the portal raised it when the tenant opened the payment screen, which is what it
  is supposed to do.
- **Why it is worth keeping in view:** it is citable evidence for Chapter 4. A money path ran
  against live data, on demand, and produced the right number to the centavo.
- **Raised:** 2026-09-22 by Claude, verified against the live `bills`, `rooms` and
  `monthly_income_records` tables.

### ~~B-53 — every tenant the admin panel onboards gets a publicly-known password~~ — **CLOSED 2026-09-23, both halves**

> **Migration 048 applied, and the code that was waiting on it is live.** The three lines that had
> been deliberately left inert are restored:
>
> - `resolveAuthUser()` reads the real column instead of hardcoding `false`. **This is the one that
>   took the site down on 2026-09-22** when it referenced the column before the migration existed —
>   it runs on every authenticated request. Verified this time in the other order: column confirmed
>   present in `information_schema` **first**, then the code, then the backend restarted and probed
>   (`/api/health` 200, `/api/auth/me` 401 rather than 500), then `check:api`, which signs in as a
>   real tenant and exercises the whole path, passed.
> - `changeOwnPassword()` clears the flag, which is what lets a resident out of the gate.
> - `POST /admin/tenants` sets it, gated on `passwordHash !== null` so a prospect with no login is
>   never flagged for a password they do not have.
>
> `live_schema.csv` regenerated from the catalogue rather than hand-edited to pass — `check:columns`
> caught the drift and said so in those words. 24 tables, 235 columns, matching.
>
> **Nothing existing was gated retroactively:** all 34 profiles read `must_change_password = false`.
> The flag applies to tenants onboarded from here on.
>
> The reveal modal's copy was corrected in the same commit — it had said signing in "does not yet
> prompt them to change it", which was true when written and is now the opposite of what happens.

- **Half 1 — CLOSED, shipped 2026-09-22.** `POST /admin/tenants` no longer hashes the literal
  `'Hivelet@Tenant2026'`. You said "1 [random per-tenant password] and force password change on
  login I think is best" and this half is option 1: `backend/src/utils/generateTemporaryPassword.ts`
  generates a real one-time password per tenant (`crypto.randomInt`, unambiguous character set — no
  0/O/1/l/I, since this gets read aloud and typed once), the response carries it back once as
  `temporaryPassword` for the admin to relay in person, and the bcrypt hash itself is no longer
  echoed in that same response either (`password_hash` was leaking via `.select('*')` — found while
  fixing this, closed at the same time). **Now surfaced in the UI, shipped 2026-09-22 same day.**
  `TenantManagementView.vue` shows it once, right after onboarding, in a non-dismissible modal (no
  Escape, no backdrop click — the password only ever exists on that screen, so an accidental close
  before it is copied cannot be undone) with a copy-to-clipboard button. Its copy is deliberately
  honest about half 2 below being inactive — it says signing in does not yet prompt a password
  change, rather than promising the option 2 behavior before it exists.
- **Half 2 — STAGED, not active.** Forcing a change on first login (your option 2) needs a new
  column, so it can't ship instantly the way half 1 could. Everything for it is written and ready:
  - `database/migrations/048_must_change_password.sql` — adds `profiles.must_change_password` and
    extends `resolve_login_identifier()` to return it. **Not applied to the live database.**
  - The application code (`AuthUser.mustChangePassword`, a mandatory non-dismissible
    `ChangePasswordModal` mounted in `App.vue`, `authStore`'s `clearMustChangePassword`) is fully
    wired and currently inert — `resolveAuthUser()` and `login()` both hardcode/coalesce it to
    `false` on purpose, and the two write sites that would set/clear the real column
    (`admin.ts`'s onboarding insert, `authService.ts`'s `changeOwnPassword`) deliberately do
    **not** write it yet — each has a comment marking the exact line to restore. Writing to a
    column that doesn't exist yet would have failed the whole insert/update (onboarding, or every
    password change in the app) the moment it ran — a worse outcome than shipping half of this
    today, which is why it's split this way rather than held back entirely.
- **What Sean needs to do to finish half 2:**
  1. Apply migration 048 (Supabase SQL editor, same as every other migration in this project).
  2. Restore the two commented-out write lines — `backend/src/routes/admin.ts` (search
     `must_change_password: passwordHash !== null,` in the comment right above `profileValues`)
     and `backend/src/services/authService.ts`'s `changeOwnPassword` (search
     `must_change_password: false,` in the comment right above the `.update()` call).
  3. Update the credential-reveal modal's copy to match — `frontend/src/views/TenantManagementView.vue`,
     search `does not yet prompt them to change it` — once the two lines above are restored, that
     sentence is wrong in the other direction and should say the opposite: signing in with it DOES
     prompt a change. Same class of stale-precondition comment CLAUDE.md warns about, just in
     UI copy instead of code.
  4. Run `npm run check:all` — `check:columns` will now pass with the restored writes; it was
     exactly what caught this needing to be staged in the first place when I tried it live.
- **Not the same as the closed B-01/B-49 items** (specific seeded demo credentials, already
  rotated). Also not the same as the shared demo password every current account carries from
  `scripts/rotate-demo-passwords.mjs` — that's a separate, deliberate testing convenience.
- **How to know half 1 worked:** onboard a fresh test tenant and confirm the password shown is
  random, not `Hivelet@Tenant2026`.
- **Raised:** 2026-09-22 by Claude, security sweep ahead of the consultation. Half 1 shipped the
  same day once you picked the option.

### ~~B-52 — no cloudflared tunnel is running; a real GCash payment would currently vanish~~ — **SETTLED 2026-09-22**

> **The consultation happened, and the adviser ruled this sufficient.** His direction afterwards
> was to document what was built rather than push the gateway any further. So this is no longer
> gating anything. Two operational facts from it survive the ruling, because they describe how the
> thing behaves rather than whether to pursue it.
>
> **A tunnel is running now.** Started during the 2026-09-22 session and verified end to end:
> the `trycloudflare.com` hostname answered **200** on `/api/health` from the public internet, with
> `localhost:5000` answering 200 locally. The original entry's premise — that no `cloudflared`
> process was running — stopped being true that day.
>
> **It will not survive a restart.** A quick tunnel takes a new hostname every time it starts and
> Adyen can point at only one. If anyone demonstrates a payment later, the tunnel has to be started
> again and the webhook repointed, per `RESTART_THE_TUNNEL.md`. Nothing warns you when this is
> wrong — the notification simply never arrives, which is the whole reason this entry existed.
>
> **The live click-through was attempted, and what happened is worth recording**, because nobody
> had ever done it. A real GCash checkout against Adyen's TEST environment came back **Refused**,
> and the attempt does not appear in Adyen's own Payment list or API logs at all. Ruled out one at
> a time: a CORS failure (real, and fixed — `ADYEN_CLIENT_KEY` pointed at a credential that never
> had `localhost` allow-listed, while a different credential on the same account already did);
> missing shopper identity (added; not the cause); stale browser state (retried in a fresh private
> window); and velocity or fraud blocking (same retry rules it out). What remains points at GCash
> not being among the payment methods Adyen documents for TEST credentials — an account-side gap
> on Adyen's end, outside this repository. The integration itself is built, configured and correct;
> the remaining step belongs to Adyen. That is where the adviser's ruling landed.
>
> **The original entry is kept below, because the verification work in it is the evidence.**

#### The original finding

- **Blocked on:** you (or whoever demonstrates a payment) starting the tunnel and repointing the
  Adyen webhook, per `RESTART_THE_TUNNEL.md`, before showing a live GCash checkout.
- **What it is:** a pre-consultation audit checked the whole payment path end to end. The code is
  right — traced line by line: the checkout amount is the bill's outstanding balance, not its
  total; the webhook is the sole writer of an online payment; the browser return path only asks
  Adyen server-to-server and trusts nothing the client sends; all 39 HMAC checks in `check:adyen`
  pass. But as of this audit (2026-09-22), **no `cloudflared` process is running on this machine**.
  If the Adyen dashboard's webhook still points at an old tunnel address, a resident could complete
  a real GCash payment in Adyen's TEST environment and it would never reach this backend — no
  error anywhere, exactly as `RESTART_THE_TUNNEL.md` warns.
- **What Sean needs to do:** run `cloudflared tunnel --url http://localhost:5000`, copy the new
  URL into the Adyen dashboard's webhook config, press Test, confirm a 401 (not 200 — a 401 there
  means the endpoint is alive and correctly refusing an unsigned call). Do this before demonstrating
  a payment at the consultation.
- **The one thing this audit could not verify at all**, because it requires signing in as a tenant
  (blocked in this environment): that the Adyen Drop-in SDK actually mounts in a real browser, that
  the GCash redirect completes, and that a fired webhook produces a correct `payments` row. The code
  path for all of that is verified; the live click-through is not, and per `HANDOFF_TO_QA.md` it
  never has been by anyone.
- **How to know it worked:** `curl` the tunnel's `/api/health` returns 200 from the public internet,
  and a test notification from the Adyen dashboard returns 401 rather than timing out.
- **Raised:** 2026-09-22 by Claude, pre-consultation audit session

### ~~B-50 — no privacy policy page exists yet, and the enquiry form used to carry its whole burden~~ — **CLOSED 2026-09-22, stale entry corrected 2026-09-23**

> **This was actually done the same day it was raised** (`1e55eb2`, "add /privacy, closing B-50")
> and this entry simply never got marked. Caught while sweeping the queue for stale items.
> `frontend/src/views/PrivacyPolicyView.vue` exists, the router serves it at `/privacy`
> (`router/index.ts:54`), and `InquireView.vue:286` links to it by name from the enquiry form's
> short notice — the exact two conditions the original entry's own "how to know it worked" named.
> Grounded in verified facts only: no auto-confirmation goes out, GCash credentials never reach
> this system, an enquiry is stored for the landlady only. Nothing further needed unless the owner
> wants its wording changed.
>
> The original entry is kept below for the reasoning, same as every other closed item in this file.

#### The original finding

- **Blocked on:** you saying what the policy should actually promise. Writing the page's content is
  a decision about the business, not a design task
- **What it is:** the enquiry form (`InquireView.vue`) used to state, inline, at the point of
  filling in the form: where a submission is stored, that only the landlady reads it, and that it
  is not passed to anyone else. That is real information a prospect deserves, but a form is the
  wrong place to carry the whole promise - it competes with the fields for attention, and it is the
  only place on the site that made it. You asked today (21 Sep) to cut it down to the one fact that
  changes what someone does with the form right now (no auto-confirmation goes out, so leave a
  reachable number or address) and said the fuller account belongs on a privacy policy page
- **What I already did:** shortened the inline text as asked. Nothing about what the system
  actually does with an enquiry changed - it still saves to the landlady's portal only, still
  sends no email or SMS. The promise itself is just no longer written down anywhere on the site
- **What Sean needs to do:** decide what the policy should say (what is collected, why, who sees
  it, how long it is kept, whether anything is ever shared with GCash/Adyen for payment purposes)
  and either write it or tell me to draft it from an answer to those questions. Once it exists as
  its own page, the enquiry form's short line should link to it by name
- **How to know it worked:** a `/privacy` route (or wherever it lands) resolves to a real page, and
  `InquireView.vue`'s short notice links to it instead of just naming it in a comment
- **Raised:** 2026-09-21 by Claude, design-audit session

### ~~B-49 — the admin password in `creds.txt` does not open the admin account~~ — **RESOLVED 2026-09-21**

> **Sean ran it himself**, from the repo root: `node scripts/rotate-demo-passwords.mjs`. That
> script was already sitting in this repository for exactly this - it gives the administrator a
> fresh unique password, gives every tenant/prospect account one shared password, clears
> `failed_login_count` and `locked_until` on all 44 accounts, and rewrites `credentials/creds.txt`
> in place. **44/44 updated.** Verified straight after: the mechanically-extracted admin
> credential from the new `creds.txt` posts to `/api/auth/login` and returns `success: true,
> role: "admin"`, with a token. The `HiveletAdmin-Rehearsal01` value this entry was originally
> about is gone along with everything else it replaced; whatever caused it to stop matching the
> live hash no longer matters, because there is a new one that is confirmed to work.
>
> **Send the new `credentials/creds.txt` to Loyd** the same out-of-band way as always - it never
> syncs through git - and re-run `npm run check:all`; `check:api` and `check:relations` were the
> only two suites failing on this and should both clear now.

- **Blocked on:** a Secret-Store Write. This agent is hard-blocked from typing or generating a
  password, the same category B-14 hit trying to run the rehearsal's own password-change step.
  It cannot fix this itself under any authorization
- **What it is:** `credentials/creds.txt` on this machine reads Password: `HiveletAdmin-Rehearsal01`
  for `admin@hivelet.ph`, and says plainly it is the value B-14 set on 2026-09-19. It is not.
  Signing in with exactly that value returns `401 INVALID_CREDENTIALS` — checked three ways: by
  hand against the running backend, by the same regex `check:api` uses to read the file, and by
  posting the parsed result straight to `/api/auth/login`. All three fail the same way
- **Ruled out:** a lockout. A locked account gets its own `429 ACCOUNT_LOCKED` response
  (`authService.ts` checks the lock before the password on purpose); this is the plain
  wrong-password branch. Ruled out a typo on my end too — the mechanical extraction and the
  hand-typed attempt failed identically
- **Confirms this is not a later, undocumented rotation:** `audit_logs` holds exactly **one**
  `AUTH_PASSWORD_CHANGE` row ever, at `2026-09-19 00:05:11 UTC` — the one B-14 already describes.
  Nothing has touched the admin's password since. So the live hash has been sitting still, and the
  value written into `creds.txt` on 2026-09-19 either was not what actually got typed into the
  change-password form that day, or was edited afterward. Either way, the current file is wrong
  and there is no tracked copy anywhere to recover the right one from — B-14 says outright the new
  value "lives only there, never in a tracked file"
- **Why it cannot wait:** `check:api` and `check:relations` both fail on this right now (`46
  passed, 1 failed - admin login failed`, and `Could not sign in`), and — the part that actually
  matters — **nobody can sign in to the admin account on this machine either**, including for
  tomorrow's consultation
- **UPDATE, same day:** Sean confirmed Loyd's machine signs in fine, right now, with whatever is
  in **Loyd's** local `credentials/creds.txt`. That settles which of the two remedies below is
  right — there is nothing to recover or reset, because a working copy of the file already exists.
  It is ONE shared live database, so a password that opens the admin account on Loyd's machine
  opens it everywhere; the only reason it fails here is that `creds.txt` is gitignored on
  purpose (never synced by `git pull`, by design — see "Working here" in `CLAUDE.md`) and this
  machine's copy is simply the stale one
- **What Sean needs to do — now just one step:** copy `credentials/creds.txt` from Loyd's machine
  to this one (the whole file, or at minimum its `admin@hivelet.ph` / `Password:` line), the same
  out-of-band channel B-14 already used to send it the first time. Nothing to generate, nothing to
  run against the database
- **The reset path stays written below only as a fallback**, for the day neither machine has a
  working copy left:
  1. If anyone remembers the password actually typed into the change-password form on 19 Sep, put
     it into `credentials/creds.txt` directly
  2. Otherwise it needs a real reset. That is a live-data write (a password hash), so it is not
     mine to run ad hoc — say the word and I will stage it as a numbered migration the same way
     `034` was staged, generate the hash on a machine that is not blocked from doing so, and hand
     you the exact `UPDATE` for the SQL editor plus the new value for `creds.txt`. I cannot
     generate the hash myself even to prepare the file — ask me the moment you are ready and tell
     me what you want the new password to be, or tell me to pick one
- **How to know it worked:** `node -e` style extraction of `creds.txt` followed by a direct
  `POST /api/auth/login` returns a token. `check:api` and `check:relations` both read the
  admin credential from the same file, so both should clear once it is right — they were the
  only two `check:all` suites failing on it this run
- **Raised:** 2026-09-21 by Claude, design-audit session

### ~~B-48 — three residents in her list who never lived here~~ — **APPLIED 2026-09-23**

> **046 applied.** The three INV import duplicates are gone. The three real residents kept
> everything: Mireel Fatima Parcarey **26** receipts, Nikki Prollamante **10**, Ron Juliene
> Dominguino **31**, all active and all still housed.
>
> **Its own footer figures were stale** and should not be quoted: it says "profiles 45 → 42",
> written before migration 047 removed five test residents. The real movement was 40 → 34 once 050
> ran in the same sitting.

- **Blocked on:** you saying go. It deletes live rows, so I have not run it.
- **What it is:** the import of 2026-08-27 ran twice, about thirty seconds apart. The first pass
  read her name column with the receipt number still attached and created three profiles called
  **Ron Juliene DominguinoINV.#5227**, **Nikki ProllamanteINV#5212** and
  **Mireel Fatima ParcareyINV.#5223**. The second pass created the clean records, which are the
  ones holding everything — 31, 10 and 26 receipts, and an active tenancy each.
- **They are completely inert.** `profiles` is referenced by **18 foreign-key columns across 15
  tables**, read from `pg_constraint` rather than any schema file. All 18 counted **zero** against
  these three ids. No money, no tenancy, no correspondence, no audit history.
- **What it costs to leave them:** three confusing names in her resident list, under the vacated
  filter, for people who never rented anything. Nothing more. There is no urgency here.
- **What Sean needs to do:** read `database/migrations/046_three_residents_who_never_lived_here.sql`
  and apply it if you agree. It refuses to run if anything has come to reference them since it was
  written — a migration that deletes what it expected to be inert should check that it still is, on
  the day it runs rather than the day it was written.
- **How to know it worked:** `profiles` goes 45 → 42, tenants 43 → 40, **active tenants stays 39**,
  income rows stay **937** and the remitted total stays **₱8,086,250**. The queries are at the foot
  of the migration.
- **If you would rather keep them,** say so and I will close this. They are harmless; it is a
  tidiness call about what her screen shows, not a correctness one.
- **Raised:** 2026-09-20 by Claude

### B-45 — can a resident pay the rest of a bill while the first part is still unchecked?

- **Blocked on:** her decision, then a small backend change. It is a question about how she wants
  to work, not a bug.
- **What it is:** BR-013 lets a resident pay a bill in parts. The online checkout does not. The
  guard in `tenant.ts` refuses the **whole** bill the moment anything on it is awaiting her
  verification — `pendingOnBill()` sums those rows and throws on anything above zero.
- **So:** a resident who pays ₱2,000 of a ₱6,900 bill through GCash cannot pay the remaining
  ₱4,900 until she has checked the first payment. The screen now says so in words rather than
  offering a button that would fail, so nothing is broken — it is just a rule nobody chose.
- **What Sean needs to do:** ask her. *"If somebody sends part of their rent through GCash and
  you have not checked it yet, should they be able to send the rest straight away, or wait until
  you have confirmed the first one?"*
- **If she says yes:** the guard compares `alreadySent` against zero and should compare it against
  the amount outstanding instead. One condition, in `tenant.ts`, plus a button on the bill.
- **If she says wait:** nothing to do. The screen already explains it.
- **Raised:** 2026-09-20 by Claude

### B-46 — reopening a repair does not take the unit off the listing again

- **Blocked on:** a decision about how she wants this to behave. Deliberately **not** changed.
- **What it is:** raising an Emergency repair marks a unit Under Maintenance, and resolving it
  puts the unit back. Reopening a resolved ticket does neither — the unit stays Available and
  keeps taking public enquiries while the repair is open again.
- **Why I left it:** the symmetric fix would move a unit off the public listing without her
  pressing anything, and she can already do it by hand from the unit editor. Changing what the
  public site shows, unprompted, is her call rather than mine.
- **What Sean needs to do:** ask her. *"If a repair gets reopened, should the unit come off the
  website again by itself, or would you rather do that yourself?"*
- **How to know it worked:** reopen a ticket on a vacant unit and check `/public/rooms`.
- **Raised:** 2026-09-20 by Claude

### B-47 — a resident is never told their repair was attended to

- **Blocked on:** her decision. It is a missing feature, not a defect, and it may be deliberate.
- **What it is:** there are exactly three maintenance notifications in the system — she is told
  when a ticket is raised and when a resident comments, and a resident is told when **she**
  comments. Nothing tells a resident that their ticket was dispatched, resolved or closed. They
  find out by opening the portal.
- **Why it might be fine:** it is a 33-unit boarding house and she sees these people. A message
  saying "your leak is fixed" may be less useful than her saying so.
- **What Sean needs to do:** ask her. *"When you mark a repair as done, should the resident get a
  notice about it in the app, or do you just tell them?"*
- **If she wants it:** one `notificationService.notify` in the ticket PATCH handler in `admin.ts`,
  fired on the transitions into Resolved and Closed.
- **Raised:** 2026-09-20 by Claude

### B-29 — the rate card · **ANSWERED AND APPLIED 2026-09-20 — migration 045**

> **She gave all 33 rates. They are in.** The Penthouse now advertises at ₱30,000, and a
> tenant-raised bill charges the right rent for **30 of 30** non-Linda units — the rent shortfall
> is **₱0**, down from ₱89,650 a month.
>
> **Every rate is corroborated by her own receipts**, checked before writing: 24 of 33 match the
> rent that unit most commonly shows in the ledger, the other 9 match its most recent receipt
> exactly, and **none contradicts her book**. The nine are the units where she has raised the rate
> recently, so the common figure still reflects the older one — 1g, 1h, 2b, 2c, 2e, 3d, 3f, 3g,
> F2F.
>
> The total uplift is **₱113,150 a month**, which is the figure this entry derived from the ledger
> *before she was asked*. Her answer reproduces the audit's own number.
>
> **`room_price_history` now holds its first 31 real rows**, written by migration 020's trigger
> and stamped with where the numbers came from. `created_by` is deliberately NULL: nobody clicked
> this in the application, and putting a name against a keystroke that never happened would be a
> small lie in the one table whose job is attribution.
>
> The original entry is kept below, because the reasoning is what made the question answerable.

#### The original finding

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

- **☝ ADDED 2026-09-19, and it is the sharpest edge on this item: point 3 is the GCash
  amount.** `GET /tenant/bills` and the Adyen path build the bill from `current_price` plus
  water, so the rate card is not only what a prospect is *shown* — it is what a resident is
  *charged* when they pay through the portal. Measured against what each unit actually pays:

  | | |
  | :--- | :--- |
  | non-Linda units under-charged by a tenant-raised bill | **29 of 30** |
  | charged correctly | **0** |
  | total per month | **₱91,850** |
  | average per unit | **₱3,062** |
  | worst | **F1** — system ₱6,700, her figure ₱13,000 |

  Of that shortfall **₱89,650 is the rate card** and ₱2,200 is a second, separate defect in the
  headcount the water is billed on (**B-33**). Nobody has been under-charged yet, because no
  tenant has paid through the portal — the whole ledger is imported. **The first one to pay
  online pays about half.** That moves this from "the advert is wrong" to "the till is wrong",
  and it is why her answer on rates is the thing the rehearsal waits on.

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

### B-33 — every tenancy said one occupant · **037 APPLIED 2026-09-19 — 3 still need her**

- **What is wrong.** `room_assignments.occupant_count` reads **1** on all 32 active tenancies —
  one distinct value across the property. The **third** column found this way, after
  `anniversary_date` (B-32) and `start_date` (B-11). All three are uniform defaults the bulk
  import wrote and nothing since has corrected.
- **Her ledger disagrees for 16 of the 32**, measured against the most recent month she recorded:
  fourteen units last billed water for **two** occupants and two for **three**.
- **Where it costs money, and where it does not.** It does **not** touch the receipts she writes
  on site — that form takes `occupants` as a typed field, so her ledger stays right. It decides
  the bill a **tenant** raises: `GET /tenant/bills` and the Adyen path both read this column and
  hand it to `computeBillAmounts()`. **₱2,200 a month** of water, across 15 units — small only
  next to the rate card in the same bill (B-29).
- **☑ APPLIED 2026-09-19.** Migration **037** corrected the **13** units whose last
  twelve recorded months agree unanimously, or whose current figure has held unbroken for 8+
  months. Twelve more are already right at 1.
- **☐ SEVEN NEED HER**, because each changed within the last four months and a change that
  recent is as likely to be real as a slip: **1h, B3B, B3F** (rose or fell to 2 in the last 2–4
  months) and **2e, 3b, 3d, 3g** (dropped to 1 very recently). Four of the seven already hold
  the value her newest row shows, so leaving them costs nothing today. Histories are in the
  migration.
- **Read before running 037.** Occupancy is the one fact in all of this that legitimately
  changes month to month, and it is the one she maintains by hand — her own answer, 2026-09-17
  Q6: *"also to edit the number of occupants in each apartment. We already have that."* The
  newest ledger row is **July 2026** and today is September, so these are two-month-old records,
  not a live count. Better than 1-for-everyone, which is wrong for 16 units — but **confirm them
  with her.** It is 32 numbers and one sitting.
- **Worth her knowing separately:** **1b and 1f each hold 3 people in a 2-person unit**, and
  have for eleven straight months. That is a fact about the property rather than an error, and
  the receipt path already writes an audit row when a payment is recorded over capacity.
- **A check guards it.** `check:ledger` compares every stored headcount against that unit's most
  recent billed one. **The ratchet came down 16 → 3 when 037 was applied**, and is mutation-tested
  at the new level: tightening it by one fails.
- **Raised:** 2026-09-19

### B-34 — two taps on "Pay" could raise the same bill twice · **CLOSED 2026-09-19 — 038 applied**

- **The defect.** A bill is raised **on demand**, by two paths — `POST /tenant/payments/checkout`
  and the Adyen notification handler. Each reads the tenant's bills, finds nothing unpaid, and
  inserts. There is no transaction around the pair, because **supabase-js cannot open one**, so
  two requests that interleave both see "no unpaid bills" and both insert. A resident who
  double-taps Pay gets two bills for the same month.
- **The same defect, in the same shape, as the double-click that recorded one receipt five
  times** — fixed by migration 033 with a unique index, because an index is the only guard that
  holds when the check and the write cannot be atomic.
- **It has not happened.** `bills` holds **two** rows, both Paid, no duplicates — checked before
  writing the migration. No tenant has ever paid through the portal. This goes in **before** the
  rehearsal rather than after it.
- **☑ Code half is done.** Both insert sites now recognise the collision and re-read the bill
  the other request just created, which is the honest outcome: the tenant wanted a bill for this
  period and there is one. `billAlreadyRaised()` matches on the **index name**, not on 23505
  alone, so a different unique violation is still a real error — unit-tested against eight
  shapes including the receipt index and a right-name-wrong-code case.
- **☑ APPLIED 2026-09-19.** `idx_one_bill_per_tenant_per_period` confirmed present in
  `pg_indexes`. Nothing further.
- **Raised and fixed:** 2026-09-19

### B-35 — I left 37 test rows in her live database · **CLOSED 2026-09-19 — 039 applied, 0 remain**

- **Mine, not hers.** Testing the write paths meant using them, and there is no staging copy. All
  37 were created on **2026-09-19** by this audit.
- **The proof they are all mine:** *her ledger has never had a voided row.* Every one of the **35
  voided income records** is dated today and named after the probe that made it — TEST, EDGE,
  CAP, RACE, MM, HARD, PP, PROTO. The single **voided expense entry** reads *"FUNCTIONAL TEST …
  - edited"*. Checked against every voided row in both tables, not sampled.
- **Nothing is in any total.** They are voided, so the ledger reads **937 live rows and
  ₱8,086,250.00** with them present, exactly as it did before. This is litter, not liability.
- **The one that actually shows is the enquiry.** `inquiries` has no voided state, so *"REHEARSAL
  Test / QA audit test enquiry, safe to ignore/delete"* is sitting in her Inquiries screen as
  **Pending**, looking like somebody who wants a unit.
- **☑ APPLIED 2026-09-19.** Verified afterwards: 0 voided income, 0 voided expenses, 0 test
  enquiries, and the ledger unchanged at **937 rows / ₱8,086,250.00 remitted**. Ran from its own
  file rather than the combined one — it names 37
  UUIDs and they should not be retyped. Every row is named by **id and nothing else**: no pattern
  on the invoice number, no date range. A pattern can widen; a list of UUIDs cannot. Each DELETE
  also carries `AND voided_at IS NOT NULL` as belt and braces.
- **Checked before writing it:** `monthly_income_records` has **no inbound foreign keys** at all,
  and `expense_property_allocations` is **ON DELETE CASCADE** — both read from `pg_constraint`,
  so nothing dangles. Afterwards both void counts read 0 and the ledger total is unchanged.
- **Why a hard delete, when the first rule is never to delete:** that rule is about *her* data.
  These are debris from testing her system, and leaving them voided-but-present means every
  future reader has to work out what they are.
- **The lesson worth keeping:** a functional audit of write paths against a live database leaves
  a footprint, and the footprint has to be removed by the same discipline as everything else — a
  numbered migration with exact ids, not a quick DELETE. **Check this queue for a cleanup entry
  before assuming the database is clean.**
- **Raised:** 2026-09-19

### B-36 — an overpayment could not be recorded · **CLOSED 2026-09-19 — 040 applied**

- **The shortest version:** a resident owing ₱5,000 who hands over ₱6,000 **cannot be recorded**.
  The request fails halfway — her ledger shows ₱6,000 arrived, the tenant's account shows ₱5,000.
- **Why.** Migration 024 made `transaction_reference` UNIQUE on `payments` and on
  `monthly_income_records`, titled *"One gateway reference, one payment"*. It was right about
  Adyen: retries read-then-insert, and only an index can refuse the second write. It did not look
  at the two paths that write that column for **her** money, and both write one reference across
  **several rows on purpose**:
  - `POST /admin/income-records` sets `reference = transactionReference || invoiceNumber` — never
    null — then inserts **one payment row per allocation step**. BR-013 makes more than one step
    whenever a receipt does not exactly match a bill, and **an overpayment alone is enough**:
    the plan is [against the bill] + [the remainder as an advance].
  - `record_income_for_months` inserts one income row per month, all carrying the same reference.
    A three-month receipt with a typed reference is refused on the second row.
- **The two failure modes are not equally bad.** The income path is a Postgres function, so it
  rolls back whole and she simply cannot enter the receipt. **The payment loop is JavaScript, so
  it fails partway** — the income row is already saved and part of the money is already applied.
  The handler's own message admits it: *"The income record was saved, but 1,000.00 of it could
  not be applied to this tenant's account."*
- **This is a contradiction, not a bug.** One receipt number across several rows is not an edge
  case — it is how her book is kept, and `admin.ts` states it as settled fact from the 937
  imported rows: *"`OR#4895` across four rows, `OR#4896` across three."* The database was told to
  forbid the exact shape the ledger is built on.
- **Why nothing caught it:** `transaction_reference` is NULL on all 937 imported rows, and no
  receipt has ever been recorded through the application by a person.
- **☑ APPLIED 2026-09-19.** Confirmed in `pg_indexes`: both new indexes carry
  `payment_method = 'Adyen Online'` in their predicate and the two unscoped ones are gone. An
  overpayment can now be recorded. It re-created both indexes scoped to
  `payment_method = 'Adyen Online'`. **Adyen idempotency is untouched** — a retried pspReference
  still cannot create a second row.
- **The predicate is exact, not approximate.** `payment_method_type` is (Cash | GCash | Bank
  Transfer | Adyen Online); the admin path maps everything to the first three and cannot produce
  the fourth. Both Adyen insert sites write `'Adyen Online'` literally, and
  `settle_verified_payment` carries the payment's own method onto the income row — read out of
  migration 018's **source**, not out of a comment about it.
- **What is given up, plainly:** two different hand-entered receipts may now share a typed
  reference. That was never what 024 guarded, and it is legitimate — one GCash transfer can pay
  two months. Her receipt **numbering** is still guarded by `idx_one_receipt_per_unit_per_month`.
- **No check guards this, and that is deliberate.** I wrote one and removed it: these scripts read
  through PostgREST, which does not expose `pg_indexes`, so the rule could only ever print "not
  checked" — and a permanently dead check is worse than none, because it looks like coverage in
  the summary table. The assertion lives in 040's own verification SELECTs instead.
- **Raised:** 2026-09-19

### B-37 — eleven write routes have no automated exercise, and the rehearsal IS their test plan

- **Not a defect, a measured fact** — recorded because it changes what the rehearsal is FOR, and
  because two of the eleven are money paths I changed on 2026-09-19.
- **The measurement.** Of the write routes in `admin.ts` and `tenant.ts`, `check:api` touches none
  of these eleven:

  | | |
  | :--- | :--- |
  | **money** | `PATCH`/`DELETE /admin/income-records/:id`, `PATCH`/`DELETE /admin/expense-entries/:id` |
  | payment | `/tenant/payments/checkout`, `/tenant/payments/adyen/verify-session` |
  | messaging | `/admin/inquiries/:id/messages`, `/admin/tickets/:id/messages`, `/tenant/tickets` |
  | notifications | the four mark-as-read routes |

- **Why, and it is a good reason.** `check:api`'s writes are **poison probes designed to be
  refused** — an Infinity into a money column, a string where a number belongs. It asserts a 400
  and says so in terms: *"failure is visible as a created row and is reported here rather than
  silently leaving one behind."* It never creates a row on success. **There is no staging
  database**, so genuinely exercising an edit or a void means writing to her records and cleaning
  up afterwards — which is exactly the thing that left 37 rows behind (B-35).
- **So the gap is structural, not an oversight**, and closing it with more automated writes would
  make the litter problem worse, not better.
- **What actually covers them: `TESTING_REHEARSAL.md`.** Those 26 steps are not a formality — for
  these eleven routes they are **the only test that will ever run**. Worth saying to Eljohn in
  those words.
- **☐ Two steps deserve adding**, because both paths changed on 2026-09-19 and neither has been
  fired by anything:
  - **edit an expense entry's allocations** and confirm the total on screen matches their sum.
    The handler no longer writes `total_expenses` at all — the database derives it, via
    `replace_expense_allocations` and `trg_update_expense_total`. Verified those two own it by
    reading `pg_proc` and `pg_trigger`; **not** verified by firing the route.
  - **void a record, then try to void it again.** Expect a refusal naming the date it was first
    voided. This one I did fire against live, as a no-op, on a row of my own.
- **Raised:** 2026-09-19

#### What I could and could not prove about tenant privacy (BR-024), 2026-09-19

Signed in as six residents using the shared demo password and tried to make each one see
another's records. **Read-only — this wrote nothing.**

| | |
| :--- | :--- |
| **income records** | **PROVEN.** 31, 26 and 31 rows for three residents, and **every single row carries the caller's own profile id.** Real data, real test. |
| admin routes | **PROVEN.** All six refused a tenant token with **403**, and the administrator reads the same route with 200 — so it is scope, not a dead route. |
| bills | **NOT PROVEN — zero rows exist for any resident.** |
| payments | **NOT PROVEN — zero rows.** |
| ticket conversations | **NOT PROVEN — no resident has a ticket.** |

**The cross-tenant ticket read is the one I most wanted and could not run.** It is the
classic leak in a portal like this, and `tenant.ts` looks right — it returns 404 rather than 403
so a resident cannot even probe whether someone else's ticket exists — but *looks right* is not
the same as *was refused*.

> **A methodological note worth keeping.** My first version of this probe compared two residents'
> responses and called them scoped if they **differed** — and counted "both empty" as a pass. Six
> routes reported green while proving nothing at all. The second version asserts that every row
> returned carries the caller's profile id, and reports NOT TESTED where there are no rows. Four
> honest results beat fifteen hollow ones. **A test that cannot fail is not evidence.**

**☐ For the rehearsal:** once a bill, a payment and a ticket exist, re-run this. Those three are
the untested half of BR-024, and they only become testable after a person has used the system.

### B-38 — Linda's water landed in the wrong column · **CLOSED 2026-09-19 — 041 applied**

- **What is wrong.** BR-040 puts LF and LB on a fixed monthly water charge, and her ledger keeps
  it in its own column — all **26 historical Linda rows** read `water_payment = 0`,
  `linda_water_charge = 200 or 400`, `is_linda_billing = true`.
- **Nothing in `backend/src` has ever written those last two columns.** Grep returns them only in
  `incomeReportExport.ts`, which *reads* them. `computeWaterFee()` correctly returns the fixed
  amount with `basis: 'linda-fixed'` — and **all three callers discard the basis** and write the
  figure into `water_payment` like anyone else's.
- **Why it does not stay a tidiness problem:**
  - `remitted_amount` is **GENERATED** as `rent_amount + water_payment` (read from
    `pg_attribute`), so Linda's water would be folded into a figure **nobody can correct by
    hand**.
  - The Monthly Income Report builds Linda's separate line from `linda_water_charge`. That line
    would read **zero** while the money sat in the ordinary totals — and the entire point of the
    Linda section is that she is kept **out** of those.
  - A row recorded through the form would not resemble any of the 26 rows already in her book.
- **The comment that should have protected it was the thing that hid it.**
  `incomeReportExport.ts` says in terms: *"remitted_amount is a GENERATED column … and for these
  units water_payment is 0."* True of the imported data, false of anything the application would
  have written. That is the exact failure CLAUDE.md names — a comment asserting a precondition
  the surrounding code stopped maintaining.
- **☑ APPLIED 2026-09-19.** Confirmed from `pg_trigger`: `trg_route_linda_water` fires BEFORE
  INSERT OR UPDATE OF the four relevant columns. Ledger unchanged — 937 rows, ₱8,086,250.00
  remitted — and `check:ledger` reports 0 misfiled.
- **Why a trigger, and not fixing the callers.** I wrote the caller-by-caller version first and
  threw it away. There are **four** write paths — the single-month insert,
  `record_income_for_months`, `settle_verified_payment`, and the ledger edit — and two of them
  are Postgres functions with fixed column lists. **`settle_verified_payment` made the point: its
  INSERT names its columns explicitly and silently ignores any extra key, so the obvious code fix
  there does nothing at all.** Checked in its source, not assumed. Five places that must all
  remember one rule, and a sixth the next time someone adds a write path. The trigger makes it
  true by construction, which is already how this database treats derived money —
  `remitted_amount` is generated, and `trg_update_expense_total` keeps an expense equal to its
  allocations.
- **It moves money between columns and never creates or destroys it**, and it handles the reverse
  case too: a receipt edited *off* a Linda unit cannot keep a stale charge.
- **Nothing changes today.** All 972 rows already satisfy it — verified before writing the
  trigger — so it guards future writes rather than correcting past ones.
- **A check now guards it, and this one can actually run**, unlike the index-shape check I
  deleted: the rule is about rows, which PostgREST serves. Mutation-tested by treating unit 1a as
  a Linda unit, which correctly flags all 31 of its rows.
- **Raised:** 2026-09-19

### ~~B-39 — rate-change attribution claimed the newest row, not the row it caused~~ — **CLOSED 2026-09-23; 042 is moot**

> **Nothing left to run.** The four litter rows this entry asked 042 to delete were the
> `PH 12,000 → 12,001` pair and its reverse, twice. Checked live on 2026-09-23: **no row anywhere
> in `room_price_history` carries 12,001.** The table holds **31** rows and every one is a genuine
> rate from migration 045 - including the real `PH 12,000 → 30,000`, which is the Penthouse
> correction B-29 existed for.
>
> The code half was fixed at the time and is unchanged. 042 can be left unapplied: its target is
> gone.

- **Why this one matters now:** **B-29 is about to put up to 31 real rate changes through this
  path in a single sitting.** BR-003's whole value is an honest record of who changed a rate and
  when. This is the code that writes it.
- **What was wrong.** After changing a unit's price, the handler read *"the latest history row
  for this room"* and stamped its own `created_by` on it. Correct when changes are spaced out;
  wrong for two changes to the **same unit** in quick succession — both read the same newest row,
  so one administrator's attribution overwrites the other's and a second row is left with nobody
  against it.
- **☑ Fixed.** It now matches the **exact transition** — `previous_price` and `new_price` are
  NOT NULL on that table, so the trigger always records it — **and** `created_by IS NULL`. The
  trigger writes the row unattributed and this is the only thing that fills it in, so an
  unattributed row is by definition unclaimed: two concurrent changes take two different rows,
  and re-running can never overwrite an attribution already there.
- **The live data is the defect's own shape.** The four rows in that table are two *identical*
  transitions repeated — `PH 12,000 → 12,001` twice and the reverse twice. Sequentially they
  attributed correctly, which is why nothing was damaged; concurrently they are exactly the
  collision described above.
- **☐ You run: migration 042**, and this is my litter again. Those four rows came from verifying
  that migration 020's trigger fires — a change and a revert, twice. **PH's rate never actually
  changed**, and it sits at 12,000 today exactly where it started.
  - Leaving them is worse than the income test rows were: those were voided and outside every
    total. **There is no voided state here — a row in this table is a claim that a rate
    changed**, and right now it claims the Penthouse changed price four times in one day.
  - The real changes are about to land. They should not open with four that are noise.
  - Named by id, not by a pattern: a pattern on the reason string would also match every genuine
    change she makes next week, because that is the string the code writes.
- **Worth keeping in view:** this table held **zero** rows before 2026-09-19. No rate has ever
  been changed through the system, which is why the rate card is still the seeded value — the
  root of B-29.
- **Raised and fixed:** 2026-09-19

### B-40 — unit 2f has three months with no receipt, and three unused receipt numbers to match

- **For the client meeting, not for you** — added to `CLIENT_MEETING_QUESTIONS.md` § 2g in her
  words. Recorded here because it is a ledger finding and belongs with the other six.
- **What it is.** 2f, France Sacueza, ₱6,500 + ₱200 water, paid every month on a 9th-to-8th cycle
  — **except 9 Nov – 8 Dec 2025, 9 Dec – 8 Jan, and 9 Jan – 8 Feb 2026.** Unbroken either side,
  same person, same rent, same cycle.
- **The evidence that makes it answerable.** Receipt numbers run continuously through that window:
  of the **106 consecutive numbers 5030–5135, exactly three are unused — 5063, 5090, 5106** — and
  each sits on the date a 2f payment would fall. Same technique as the pinned receipts in
  `check:ledger`, and the fit is tighter here: three gaps, three numbers, three matching dates.
- **Framed as a question, deliberately.** Your 2026-09-19 ruling on the garbage fee applies
  unchanged: the ledger records what she entered, a blank means nothing was entered, and **this
  must not be put to her as uncollected income.** The evidence points at three receipts written
  and never transcribed.
- **Every other gap is explained, which is what makes these three stand out.** 61 months across
  16 units have no receipt; **58 have a different resident before and after** — a move-out and a
  move-in. Only these three have the same name on both sides.
- **☑ A check guards it.** `check:ledger` prints the three on every run and fails if a fourth
  appears. Mutation-tested: removing one from the known list fails and names the resident.
- **Raised:** 2026-09-19

### B-41 — I put an audit block in the wrong function and wrote 276 false records · **fixed; 043 applied**

- **Mine, and the worst mistake I have made on this project.** On 2026-09-19 I added a
  `TENANT_CREATE` audit row so a public self-registration would leave a record of the account
  coming into existence. **I put it in `login()` instead of `register()`.**
- **What it did.** Between 09:02 and 14:58 that day, **every successful sign-in wrote a row saying
  the account had just been self-registered** — 276 of them, across 7 accounts. Every one is
  false: none of those accounts was created that day, and `ALLOW_PUBLIC_SIGNUP` is `false`, so no
  account *could* have been self-registered.
- **Found by a subagent audit of the services layer**, not by me and not by any of the 20 suites.
  `check:writes` had just been taught to assert that every write route leaves a trail — it does
  not, and cannot, assert that the trail says something **true**.
- **☑ Code fixed and verified behaviourally**, not just by reading: signed in and watched
  `TENANT_CREATE` hold at 284 while `AUTH_LOGIN` went 1687 → 1688.
- **☑ Migration 043 applied — and it deletes nothing.**
  - `service_role` holds INSERT, SELECT, REFERENCES, TRIGGER and TRUNCATE on `audit_logs` and
    **not DELETE** — read from `information_schema.role_table_grants`. The append-only guarantee
    is enforced at the grant level, not merely intended. Removing those rows would mean reaching
    past it with the `postgres` role.
  - **And it should not be done even though it could be.** An audit log you edit when its
    contents are inconvenient is not an audit log. These rows are embarrassing rather than
    dangerous, which is exactly the case where the temptation is strongest and the principle
    matters most.
  - So 043 does what a ledger does with an error: **posts a correction and leaves the original
    entries standing.** One `AUDIT_CORRECTION` row naming the cause, the exact window, the count
    and how to find them — in the same table, at the same authority, so a reader who meets the
    276 finds the explanation without needing to open this file.
- **The lesson, and it is not "be careful".** Every sentence of that comment block describes
  `register()`. All of it read perfectly well sitting in `login()`. **A comment can be entirely
  true about the code it describes and silent about where that code is.** The comment now names
  its own function and says what happened when it did not.
- **Raised, fixed and corrected:** 2026-09-19 / 2026-09-20

### B-42 — the audit trail's IP address is only as true as `trust proxy`

- **Improved, not solved, and the difference matters** because the audit row is the *only*
  durable record for an unmatched online payment.
- **What was wrong.** `clientIp()` read `X-Forwarded-For` itself and took the **leftmost** entry —
  whatever the caller typed. On the two unauthenticated payment routes (the Adyen webhook and the
  local cashier) that made the only identity in the trail a value the sender chose. It also
  bypassed `app.set('trust proxy', 1)` entirely, because it ran first and always won.
- **☑ Fixed to ask Express**, so `trust proxy` is the single place that decides. Measured against
  the running server rather than assumed:

  | request | recorded |
  | :--- | :--- |
  | no proxy header | `::ffff:127.0.0.1` — the real socket |
  | one spoofed `X-Forwarded-For` | `203.0.113.9` |
  | a chain of three | `192.0.2.1` — the **rightmost**, not the attacker's first |

  The old code returned the attacker's value in **all three**. Hop counting defeats the chain.
- **☐ What is left is yours, and it is a deployment decision.** `trust proxy` is set to `1`, so
  Express believes exactly one proxy is in front. A **direct** request carrying a single XFF
  header still has that header believed. That is only correct while every real request genuinely
  arrives through exactly one proxy.
  - With `cloudflared` that holds for tunnel traffic.
  - The API is also reachable directly on `localhost:5000`, where it does not.
- **The honest reading of the column:** it records *what the chain reported*, not *where the
  request came from*. Do not treat it as proof in any investigation. If that is not good enough,
  the fix is to pin `trust proxy` to the tunnel's address rather than a hop count — one line, but
  it needs to match how the machine is actually exposed, which only you can say.
- **Raised and partly fixed:** 2026-09-20

### B-43 — two residents' names were on the public website · **FIXED AND APPLIED 2026-09-20**

- **Tell her about this one.** It was live, it was visible to anyone, and it is the kind of thing
  a resident would mind.
- **What was public.** `rooms.description` is served by `GET /api/public/rooms` — no token, no
  login — and rendered on the public site. Two of the 33 descriptions named the person living in
  the unit:

  | unit | what the website said |
  | :--- | :--- |
  | **LB** | `Linda Back Unit (Jaye Casia) - Fixed Rate Billing` |
  | **LF** | `Linda Front Unit (Gayon) - Fixed Rate Billing` |

  Both `Published`. **Both people are current, active residents** — checked against
  `room_assignments`, not inferred from the text.
- **☑ Migration 044 applied**, after `npm run backup`. Both now describe the unit rather than its
  occupant, using the interface's own words for that structure — *"the separate two-storey
  structure beside the red gate"* — and drop "Fixed Rate Billing", which is internal vocabulary
  the public FAQ already explains properly. **Billing is untouched:** BR-040 and migration 041's
  trigger read `rooms.is_linda_unit`, not this sentence.
- **Verified end to end**, not just in the database: pulled all 131 names, emails and phone
  numbers from `profiles` and searched the actual bytes `/public/rooms` returns. **Nothing
  identifying any resident appears in the payload.**
- **How it was found, because the method is the point.** Not by reviewing the route — **the route
  is correct.** Its column allowlist says so in terms: *"Columns a public visitor may see. Note
  the absence of any tenant linkage"*, and there is no join to a tenant anywhere in it.
  > **The leak was not in the query. It was in the data** — a name typed into a field that
  > happens to be public. Reading the endpoint would never have found it. Searching the response
  > for real identifiers did, in one pass.
- **☑ A check now guards it.** `check:ledger` compares every Published description against every
  name on file. Mutation-tested: forcing a match reports the unit and the name it found.
- **Raised, fixed and applied:** 2026-09-20

### B-44 — her three remaining answers, and the one follow-up left

**Answered 2026-09-20, relayed by Sean.**

- **The anniversary is the MOVE-IN DAY.** Her words: *"the day of each tenant starts is when the
  tenant moves in — if the tenant pays on the 1st day of the month but moves in on the 3rd, his
  due date is on every 3rd day of the month."*
  - **This is a rule, not sixteen answers**, and it settles the principle rather than the
    remaining units. `room_assignments.start_date` is still the import placeholder for all 32, so
    the system does not hold anybody's move-in day.
  - **But it validates the derivation.** If the anniversary is the move-in day, then the day her
    receipts run from IS that day — which is exactly what migration 035 read them for. It also
    explains the sixteen: a unit whose day CHANGED mid-history changed residents, and the new
    day is the new tenant's move-in.
  - **☐ Still open:** the month-end ones (3c, B3B, 2g, 3d, 1e) are not explained by this rule.
    A tenant who moved in on the 31st has no 31st in February, and her book shows exactly that
    drift. Worth one question: *"for these, is the rent day the last day of the month?"*
- **Headcount — she asked which seven.** They are **1h, 2e, 3b, 3d, 3g, B3B, B3F**, listed with
  their last twelve months in the client sheet. Her answer — *"1b and 1f are correct, as long as
  the record is accurate"* — points at her book, and her book shows a clear recent change in all
  seven. **☐ One confirmation needed:** are those seven real moves, or entry slips?
- **⚠ Worth checking, and I have NOT acted on it.** She added: *"water is charged 200 per head
  staying on one unit **regardless of the apartment type**."* Read strictly that includes LF and
  LB, which BR-040 bills a FIXED charge. It may be no conflict at all — LF is ₱400 with 2
  occupants and LB ₱200 with 1, which is 200 a head either way, so the "fixed" charges may simply
  BE the per-head figure for their current occupancy. **If that is right, the fixed-charge rule is
  a coincidence and would break the moment someone moves in or out of a Linda unit.** BR-040 is
  confirmed separately and the ledger has billed those two a fixed amount for 26 months, so
  nothing has been changed on one ambiguous sentence. **☐ Ask her directly: if a third person
  moved into LF, would the water go up?**
- **☑ The label is settled.** *"leave it as deposit."* Her screen now says **Deposit** in the four
  places she reads it — the table heading, both detail panels and the onboarding form. The stored
  figure is unchanged; it was never the number in question (B-31).
- **Raised:** 2026-09-20

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

#### A second question for the same sitting · **added 2026-09-20**

**If she has resumed it, one more thing needs settling: on a receipt covering several months, is
the ₱20 charged once, or once per month?**

- **BR-037 says per unit per MONTH**, which reads as ₱60 on a three-month receipt.
- **The system says once.** `record_income_for_months` writes
  `CASE WHEN is_first THEN p_gbg_fee ELSE 0 END`, and the on-site form tells her so in as many
  words: *"× 3, plus the garbage fee once"*. Code and interface agree with each other and
  disagree with the rule.
- **Her book has exactly ONE case**, and it charged per month: `OR#4920`, unit 1d, one payment on
  2025-04-29 covering April and May, **₱20 on each row**.
- **It looked like three.** Two other multi-row receipts carry ₱40 — `OR#4726` and `OR#4772` —
  and both are already pinned in `check:ledger` as **receipt-numbering errors**: their two rows
  have *different payment dates*, so they are two separate monthly payments that happen to share
  a number, not one receipt covering two months. Counting them would have turned n=1 into a
  confident n=3.
- **Nothing has been changed.** One row is not enough to overrule a deliberate-looking interface
  statement, the sum in dispute is ₱20 a month, and she is not charging it at all today. But if
  she resumes, the system will under-charge a multi-month receipt and nothing will say so.
- **Ask it plainly:** *"if someone pays three months at once, is the garbage ₱20 or ₱60?"*
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

### ~~B-30 — this machine's `.env` still holds the legacy keys you disabled on 13 September~~ — **RESOLVED 2026-09-19**

> Renumbered from B-12 on 2026-09-19. Two different items carried that number: this one and
> the open electricity question further down. The open one keeps B-12 because
> `CLIENT_CONFIRMATION.md` cites it and that sheet goes to the owner.

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

### B-20 — unit F1 says floor 3, and its own description says 1st Floor · **ANSWERED, migration ready to run**

- **What it was:** `rooms` held `floor = 3` for unit **F1** (Front Apartment) while the same row's
  `description` read **"Front Apartment 1st Floor"**. The only one of the 33 published units whose
  description disagreed with its floor. Sean's own floor-plan export named it
  `FRONT1STFLOOR-F1.svg`, agreeing independently.
- **Sean's answer, 2026-09-19:** *"it's a separate building that consists of 3 units. F1 is 1st
  floor of that building, up it is 2 units which are the F2F and F2B."* So the Front Apartment is
  its own two-storey building. `floor` is the floor WITHIN a building, not a property-wide level.
  F2F and F2B are already correct at `floor = 2`; only F1 was wrong.
- **☑ Already done in the interface.** The category page's floor stack was drawing every floor on
  the PROPERTY, so it told somebody looking at F2F they were on the second of four levels of a
  building that has two. It groups by `cluster_code` now: the Back Apartment reads 3 levels, the
  Front Apartment 2. Verified on the live page.
- **☐ What is left for you — one migration, one row, one column.**
  `database/migrations/034_f1_is_on_the_first_floor_of_the_front_apartment.sql`. Run
  `npm run backup` first, as with any change to live data. It carries its own verification: the
  second SELECT should return **0 rows**, meaning every published unit's description now agrees
  with its floor. The undo is in the header.
- **Until it runs**, the Front Apartment stack reads "3rd Floor / 2nd Floor" instead of
  "2nd Floor / 1st Floor" — the count is right, one label is not.
- **Raised:** 2026-09-19. **Answered:** 2026-09-19.

### B-12 — the public FAQ quoted an electricity rate the system does not hold · **CLOSED 2026-09-19**

> Sean confirmed the page is correct as it stands: every unit has its own meter, the tenant pays
> their own electricity, and the boarding house bills nothing for it. No rate and no reading day
> belong on the site. Nothing further to do.

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

### B-31 — OD-04 is settled. I was wrong about what that means for the code · **corrected 2026-09-19**

> **I raised this earlier today saying the onboarding logic collects half of what it should and
> that `deposit_amount` is understated by a month's rent on every tenancy. I checked the live
> rows afterwards and that was wrong. Do not double anything.**

- **The answer, from Sean on 2026-09-19:** *"yes two months total, one month for rent and the
  other is the deposit"*, and *"when the tenant leaves, that deposit money will be used to cover
  expenses in fixing/maintaining the apartment that the tenant used."*
- **What the live data says.** Measured `deposit_amount` against the rent each unit ACTUALLY
  charges — its most common `rent_amount` across the ledger, not the rate card, which understates
  by about 1.6x and was what made my first reading look plausible:

  | | |
  | :--- | :--- |
  | exactly one month | **20** of 32 |
  | within 8% of one month | a further **9** |
  | two months | **0** |
  | zero | 0 |

  Every one of the 32 tenancies holds **one month**. The column has never held two. Had I
  "fixed" the code to write `rent * 2`, the next 32 tenancies would have disagreed with all 32
  existing ones.
- **So the code is right and needs no change.** `rentAtMoveIn` writes one month; that matches
  every historical row.
- **☐ WHAT IS ACTUALLY LEFT, and it is naming, not arithmetic.** Two months are collected. One
  of them sits in `deposit_amount`. The other is the first month's rent, which shows up as an
  ordinary income receipt. Both are recorded — but the system calls the stored one **advance
  rent**, and your answer says the money held against repairs is the **deposit**. Those are
  different obligations and the label is on the wrong one:
  - `frontend/src/views/TenantManagementView.vue` prints "Advance rent" in four places she sees:
    the table header, two detail panels and the onboarding form label.
  - `database/migrations/009_...sql` put a **live column comment** on
    `room_assignments.deposit_amount` reading *"ADVANCE RENT, not a refundable security deposit
    … No separate damage or security deposit is collected by this business … Do not build a
    refund or forfeiture workflow against this column."* Your answer contradicts every clause of
    that. **Migration 036 was APPLIED 2026-09-19** — the comment is replaced. The catalogue is
    the thing CLAUDE.md tells people to trust over the docs, so a wrong comment there is worse
    than a wrong document.
  - `backend/src/routes/admin.ts` asserted the same thing in three code comments dated
    2026-09-13. Those I have corrected, because a comment is not money.
- **A second correction, and the more embarrassing one.** I first wrote here and in the public
  FAQ that *"whether anything is returned has not been confirmed"*. **It has.** She answered it
  on 2026-09-17 — `CLIENT_ANSWERS_2026-09-17.md` Q7: *"whatever is left of that entire expenses
  will be refunded to the tenant. If it's 6500 and the expenses is 6400, the 100 pesos will
  still be given back."* `docs/02_BUSINESS_RULES.md` **BR-039 has carried that since the 18th**,
  marks the opposite reading retired, and states the rest of what I spent this session deriving
  from the live rows — that the labelled advance IS the deposit, and that the first month's rent
  is a separate income row. Vince had it right a day before I looked.
  - **Why I missed it:** I worked from Sean's chat message and the code comments, and reached
    for the database instead of the rule register. CLAUDE.md names that register as the
    authority and names the stale-comment trap in the same breath. **The comments I was reading
    were the very ones BR-039 had already retired.**
  - Corrected in the FAQ, migration 036 and the `admin.ts` comments. The FAQ states the refund
    **with the condition attached** — repairs come out of it first — because "refundable" on its
    own makes a prospect expect the whole sum back.
- **What is genuinely still open, and it is small:** does the money get called *deposit* on her
  screen from now on? `TenantManagementView.vue` says "Advance rent" in four places. BR-039 says
  the owner's own word is "advance" and that the word is a label, not a definition — so she may
  well want it left. I have renamed nothing she looks at; it is her word for her money, and
  Kiel's lane besides.
- **Not open, but worth knowing:** there is still no disposition column — nothing records what
  was refunded or when. BR-039 says settlement is manual **by choice** (repairs go in as
  category 8 expenses, the refund is her own entry), so this is not a gap to close without
  asking. It is what BR-025's *Partial* status rests on, and it is entangled with B-11's
  missing move-out dates.
- **Raised:** 2026-09-19. **Corrected twice the same day.**

### B-32 — every tenancy billed on the 1st · **035 APPLIED 2026-09-19 — 16 still need her**

- **What is wrong.** `room_assignments.anniversary_date` is `2026-07-01` for **all 32** active
  tenancies — one distinct value across the whole property. It is the bulk import's placeholder,
  the same invented `2026-07-01` migration 032 already caught in `date_paid`.
- **Why that matters.** BR-033 runs the rent cycle from that column, and `computeBillPeriod()`
  reads **only its day-of-month**. So the system believes every resident's month starts on the
  1st. Her ledger disagrees: across 937 rows the period starts on the 1st in 122 and on **23
  other days** in the remaining 815. Unit 1a has run from the **7th for 31 consecutive months**;
  B2F the 21st, LB the 25th, LF the 13th, B2B the 3rd — each unbroken across its whole history.
- **Nothing is damaged yet, and that is luck.** All 937 rows came from the import; no receipt
  has ever been recorded through the app by a person. **The first one will be wrong** — a
  receipt for 1a gets stamped 1 Oct–31 Oct when that resident's month runs 7 Oct–6 Nov. And the
  divergence warning is inverted: type the *correct* dates and the system files an audit note
  against you.
- **☑ APPLIED 2026-09-19.** Migration **035** settled the **16** units whose own
  ledger is unambiguous — most recent period start is also the usual one, unbroken 8+ months,
  not a month-end cycle. 13 of those change; 2a, 3e and F1 really are on the 1st. Only the DAY
  moves; the year and month stay at the 2026-07 placeholder, because the day is the only part
  the system reads and the only part her book can evidence. `start_date` is untouched (B-11).
- **☐ SIXTEEN NEED HER, and the ledger cannot settle them:**
  - **3c, B3B** — tracked the **last day of each month** (31st, 30th, 28th in February) and then
    stuck on 28 from March 2026. Probably month-end, which BR-033 would store as day 31.
    "Probably" is not enough to write into her records.
  - **2g, 3d, 1e** — the same month-end drift, less cleanly.
  - **1b, 1g, 1h, 2c, 2e, 2f, 3b, 3f, 3g, B3F, F2F** — the cycle moved in the last year. Either
    the resident changed or the day was renegotiated; her book cannot say which.
  - The per-unit history for all sixteen is in `database/migrations/035_...sql`.
- **A check guards it.** `check:ledger` compares every anniversary day against that unit's most
  recent period. **The ratchet came down 29 → 16 when 035 was applied**, and is mutation-tested
  at the new level: tightening it by one fails. Drop it further as she answers.
- **Why no check caught this for months:** they test the system against itself, and the wrong
  value was uniform. It took comparing against her book.
- **Raised:** 2026-09-19

### B-13 — the FAQ asked new tenants for two months' money · **ANSWERED 2026-09-19: two months was right.** See B-31

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
  running app with the backend returning 500 (B-30).

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

### B-60 — the privacy policy cannot say where the database is stored

- **Blocked on:** the Supabase project's region, and where the production site will be hosted
- **What I was doing:** rebuilding `/privacy` against the RA 10173 notice elements (2026-09-24)
- **What I already did:** `PrivacyPolicyView.vue` names Supabase as the database host and says
  nothing about its location, because nothing in the repository records it
- **What Sean needs to do:** read the region in Supabase (Project Settings, General). If it is
  outside the Philippines, add one sentence to the Supabase bullet under "Who else receives it"
  saying the records are stored in that region, outside the Philippines
- **How to know it worked:** the bullet names a region that matches the dashboard
- **Raised:** 2026-09-24 by Claude, legal documents pass

> **Region found, 2026-09-24 (Loyd's machine): AWS `ap-northeast-2`, Seoul, South Korea. That
> is outside the Philippines, so the sentence is needed.** How it was found: the database host
> resolves to `2406:da12:1f1:…`, and AWS's published `ip-ranges.json` lists `2406:da12::/36` as
> ap-northeast-2. This is inferred from DNS, not read off the dashboard, so glance at Project
> Settings → General before the sentence goes public. Production hosting is still undecided
> (`DEPLOYMENT_PLAN.md` § 1), and the API host's region belongs in the same bullet once chosen.

> **Done, 2026-09-24 (frontend).** Sean confirmed the region on the Supabase dashboard the same
> day (ap-northeast-2, Seoul). `/privacy`, "Who else receives it", Supabase bullet now says the
> records are kept on servers in Seoul, South Korea, outside the Philippines. **Still open:** the
> API host's region belongs in the same bullet once it is chosen (the frontend goes on Vercel).

### B-61 — unfixed findings from the 2026-09-24 frontend hardening pass

- **Blocked on:** session time. Five agents found these on 2026-09-24 in a harness that runs the
  real app against mocked API replies. They were stopped before fixing them. Every item below was
  reproduced in that harness. None of them has been fixed yet.
- **Fix first (live data):** `TenantManagementView.saveEdit` always sends `roomNumber`, even when
  the unit did not change. The PATCH in `backend/src/routes/admin.ts` then closes the tenancy and
  opens a new one dated today, which shifts that resident's move-in and anniversary dates and every
  rent period after them. Send `roomNumber` only when it changed, and check the live tenancies for
  any row that was reopened by an edit. That second part is a read-only SQL query, and any repair
  is a migration.
- **Admin:**
  - `AdminEditUnitModal` has rent `step="100"`, so unit 1D (₱7,250) cannot be saved. Use `step="any"`.
  - Expenses: the confirm dialog uses a red "Delete entry" button to record entries, and says
    "these 1 expense entries".
  - Expenses: after a partial save failure the saved entries stay in the form, and Save records
    them twice.
  - Income: Reject runs with no confirmation, and the panel says "Loading the verification queue"
    while a verify is saving. The edit form's Unit field shows "3D" instead of the listed option.
  - `peso()` rounds centavos away: ₱4,955.50 shows as ₱4,956.
  - Overview "Try again" shows ₱0 tiles while it reloads.
  - The move-in form defaults to 1A, which is occupied, with a ₱0 deposit. Converting an enquiry
    fills the deposit from stale built-in rates.
  - Maintenance: a failed save still says "Ticket Resolved". Enter in the reply box can double-send.
  - Enquiries: the empty state says "Nothing matches what you have typed" when nothing was typed.
  - The audit "Downloads" chip is named "export", but its workbook holds business events.
  - At 1904px the residents table is 1,468px wide, with a 509px name column. The workspace may want
    a max-width again (App.vue).
- **Resident portal:**
  - "Settled" says the next rent is due one cycle late, and can show a date in the past.
  - The Pay button still shows while a payment waits for verification, and opening it gets a 409.
  - Closing the payment modal drops focus to the page body.
  - The GCash return notice is a 4-second toast, and raw Adyen errors reach residents.
  - Tickets show "0 open · 0 resolved" while loading. There is no confirmation at 375px after
    sending. Closed tickets still offer a reply box.
  - Profile: a failed load shows a blank form that says "Everything here is saved", with no retry.
  - ChangePasswordModal shows raw 5xx text, and a 422 does not say which field is wrong.
  - `lib/api.ts`: the network-error message tells residents to "Check that the API is running".
- **Shared:**
  - The mobile sidebar has no focus trap and does not close on Escape.
  - Notifications: a failed load reads "Nothing here" (`notificationsStore.ts` needs a failure
    flag), and its buttons are 28px.
  - WsModal focuses the first input on open, which pulls up the phone keyboard. It still vanishes
    on close; it needs a leaving copy, because a `<Transition>` cannot run there.
  - PillSelect options are 34px tall and cut off at 320px.
  - Toasts: each item is its own live region, and under reduced motion they lose their fade.
  - `index.css`: a stray `.press,` on the `.row-action` rule makes `.press` animate opacity only.
    Move `.press` to the `.press-plate` selector.
  - `AppHeader.vue`: the wordmark and nav links need `min-h-11`, and the menu button needs
    `aria-expanded`.
  - `PublicGuestView`: `cheapestRent` should return null until the live listing loads. While
    loading, the FAQ quotes the fallback ₱4,500.
- **Legal pages, still to add:** privacy and terms links on LoginView (under the "Accounts are
  created" note), a privacy link on TenantProfileView, and `/terms#payments` on
  TenantPaymentsView. The router's `scrollBehavior` should honour `to.hash`.
- **Side effect to know about:** harness pages that Vite reloaded into the real app sent about
  ten `GET /api/auth/me` calls with a fake token. Each was refused with 401 TOKEN_INVALID and
  logged as an `audit_logs` row on 2026-09-24. Nothing else was written. Leave the rows; the log
  is append-only.
- **How to know it worked:** each item is re-measured in the browser, and `check:all` stays 20/20.
- **Raised:** 2026-09-24 by Claude, frontend hardening pass

### B-62 — three frontend changes the deployment needs

- **Blocked on:** the frontend lane (`frontend/`), and for the last item the hosting decision in
  `DEPLOYMENT_PLAN.md` § 1
- **What I was doing:** planning the production deployment from the backend side (2026-09-24)
- **What Sean needs to do:**
  1. **Make a production build fail when `VITE_API_BASE_URL` is unset.** `frontend/src/lib/api.ts:11`
     falls back to `http://localhost:5000/api`, so a build made without it deploys cleanly and
     then every visitor's browser calls its own machine. That looks like "the API is down" and
     nothing says why. A check in `vite.config.ts` when `mode === 'production'` is enough
  2. **Add `frontend/public/_headers`** for Cloudflare Pages. The draft, including a report-only
     CSP that allows the Adyen Drop-in, is in `DEPLOYMENT_PLAN.md` § 4. Switch the CSP from
     report-only to enforcing once a TEST payment has run clean under it
  3. **Absolute `og:image`** in `frontend/index.html`, once the domain is known (§ 1)
- **How to know it worked:** `vite build` with the variable unset exits non-zero; the production
  site's response headers show HSTS and the CSP; a shared link previews with the image
- **Raised:** 2026-09-24 by Claude, deployment plan

### B-63 — backend audit 2026-09-24: what is fixed, and three decisions that are yours

- **Blocked on:** Sean's decisions below; nothing is broken while they wait
- **Fixed and pushed today (backend, Loyd's machine):** B-61's backend half (an edit no longer
  closes and reopens a tenancy); a refused unit move no longer ends the tenancy first; tenant
  edits no longer copy the password hash into `audit_logs` or the response; PATCH on an
  administrator's profile is refused; an `_` in an onboarding email no longer matches a different
  person; refused requests are budgeted so they cannot flood `audit_logs`; change-password is
  limited to 10 wrong guesses per 15 minutes. Each commit message carries its evidence
- **Decisions for Sean:**
  1. **16 old `audit_logs` rows hold bcrypt hashes** (TENANT_UPDATE, 2026-08-19..25, 7 profiles).
     Checked read-only: 5 of the 7 profiles no longer exist, and **none of the 16 hashes is a
     current password**, so nothing live is exposed. Redacting them means a migration that
     UPDATEs an append-only table (`previous_values - 'password_hash'`, same for `new_values`),
     against the B-41 principle. Leaving them is defensible; say which
  2. **`must_change_password` is enforced only in the browser.** Anyone holding an issued
     temporary password can use the API without changing it. A server gate (428 on everything
     but `/auth/me`, change-password and logout) is written up but NOT applied, because the
     screens behind the modal would then show load errors until a reload: the frontend needs to
     reload its data after the change succeeds. Apply both halves together
  3. **Changing a password does not end existing sessions** (7-day tokens). Rejecting tokens
     issued before `password_changed_at` is a small backend change, but it signs the resident out
     of their other devices, and change-password would then need to return a fresh token for
     the current one. Frontend and backend together
- **Still being fixed in parallel (branches, not yet merged):** money (pay-this-period charging a
  period already paid in person; verify booking the bill's full amount instead of the payment),
  input validation (non-UUID ids giving 500s, query numbers, attachment URL scheme) and Adyen
  (a second checkout while the webhook is late; HMAC escaping; return-URL check; production
  boot without keys)
- **Correction to the brief:** "a refused request writes nothing" was not true here. Every
  401/403 wrote a permanent audit row (10,673 of 16,422 rows). Budgeted now, not removed
- **Raised:** 2026-09-24 by Claude, backend audit

### B-64 — Sean's decisions on B-63, and what each lane still owes (2026-09-24)

- **Sean's decisions, 2026-09-24:**
  1. The 16 old `audit_logs` rows holding bcrypt hashes are **left as they are**. None is a current
     password, and the log stays append-only.
  2. **Enforce `must_change_password` on the server: yes.** The frontend half is pushed (3fc5993).
     After a forced change the app reloads once, so the screens behind the dialog fetch again.
     Loyd applies the server gate he wrote up (428 on everything but `/auth/me`, change-password
     and logout).
  3. **A password change ends other sessions: yes.** The frontend half is pushed (3fc5993). The
     contract: `POST /auth/change-password` returns `{ data: { token } }` with a fresh token for
     this device, and the app stores it when present. Loyd rejects tokens issued before
     `password_changed_at` and returns that token.
  4. **Hosting: free first, frontend on Vercel.** `frontend/vercel.json` holds the SPA rewrite, the
     security headers (the CSP is report-only) and the cache rules. A build on Vercel or in CI now
     fails without `VITE_API_BASE_URL`; a local build only warns. The API host is Loyd's choice
     on a free tier, and DEPLOYMENT_PLAN.md § 1 should be updated to match.
- **Backend (Loyd's lane), still owed:**
  - The retention rules on `/privacy` (CLIENT_MEETING_QUESTIONS 3c) need a deletion step before the
    site goes public: an enquiry that never became a tenancy is deleted six months after its last
    message, and a former resident's contact details one month after move-out. The enquiry rows
    in `audit_logs` keep the person's name and IP address, and the step has to reconcile that.
  - The audit workbook route builds only three trails (business, sign-ins, everything) and
    silently builds "business" for anything else, so the Downloads chip's workbook lists business
    events. See `backend/src/routes/admin.ts` around line 2130 and
    `backend/src/services/auditTrailExport.ts`.
  - Once the API host is chosen, narrow the CSP's `connect-src` in `frontend/vercel.json`. It
    allows any https address for now.
- **Frontend (Sean's lane), small leftovers:**
  - `AppSidebar.vue`: the mobile drawer has no `id`, so the header's toggle has no
    `aria-controls` yet.
  - A cross-page link to `/public#faqs` lands too high, because the room list loads after the
    scroll and pushes the section down.
  - `CONTINUE_HERE.md:141` and a comment in `inquiryRules.ts` still describe the old
    network-error wording and "retention unset".
  - Dialogs (WsModal) still vanish on close instead of fading.
  - B-61's other frontend items are fixed and pushed. The commit messages from 6ca3485 to
    3fc5993 carry the evidence. Most were checked by typecheck and `check:all` rather than in a
    browser, so re-check them in the rehearsal.
- **Raised:** 2026-09-24 by Claude, frontend hardening pass

> **Update, 2026-09-24 (later, Sean's machine):** two B-64 frontend leftovers are done. 
> Dialogs now fade out on close (e7a93b7), and the admin and resident screens keep their 1600px 
> cap while the public site stays full width (af18081). The workspace mobile drawer now has 
> `aria-controls` (252bd7a), and `/public#faqs` lands on its section (252bd7a). Both browser 
> verification passes confirmed every B-61 frontend fix on screen, with the API mocked.
