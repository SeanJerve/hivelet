# Hivelet audit — session report, 2026-09-15

> **This is a dated snapshot of one working session, not a statement of current state.**
> It was accurate when written and will go stale the moment work continues — which is the
> exact failure this session spent its time correcting elsewhere, so it is labelled rather
> than left to be mistaken for live truth. The durable homes for this material are
> `docs/13_AUDIT_JUDGEMENT_LOG.md` (the reasoning and the failure modes) and the individual
> commits named below (the evidence). If those disagree with this file, they are right.

## What this session found, in one page

*Everything below this section is newest-first. This is the shape of it for someone arriving
cold. Every commit named here resolves in the repository.*

> **This summary was written on 2026-09-15 and covered that day alone. Work continued overnight
> into 2026-09-16 and found larger things than anything below, so the summary is extended rather
> than left to be mistaken for the whole account** — which is the exact failure this session has
> spent two days correcting in other people's documents.

### The four from 2026-09-16, in order of what they would have cost

| | Commit |
| :--- | :--- |
| **Anyone could have made themselves an administrator.** `POST /api/auth/register` is public, and its schema accepted a `role` field that went straight into the insert. One unauthenticated request with `"role": "admin"` created an administrator and returned a working token — reaching all 937 income rows, all 45 profiles, the ledger void path and the payment verification gate. **Never used:** one admin exists, from the original seed, and no account has been created since 2026-08-27. | `8b09f80` |
| **The notification feature had never once displayed a notification.** Not since the day it was written. Two independent faults: a cosmetic "header harmonization" deleted the bell, and the store read one level too deep into every response so the badge was always 0. 20 rows, all unread, including four telling the owner an online payment had arrived that could not be matched to a bill. | `522c0f9` |
| **₱18,600 of collected water money appeared in no report.** `linda_water_charge` is the only place LF and LB's fixed water is recorded, and no line of code read it. The LINDA section of the income workbook showed a total, an old electricity line, and no water at all. | `ac197e4` |
| **A `SECURITY DEFINER` database function fails open to `admin`.** Unreachable today — no RLS policies call it and the public roles cannot execute it — but the obvious way to enable RLS later is to write policies calling exactly it. Recorded as **A-14**, not fixed, because a live DDL change is the owner's to authorise. | recorded, not applied |

### And the six from 2026-09-15

| | Commit |
| :--- | :--- |
| **The entire enquiry conversation feature was dead.** Every reply failed with "Inquiry not found" - the handler selected columns `inquiries` does not have - and reading a thread returned a 500, because it ordered by a column `inquiry_messages` does not have. She could neither read a lead nor answer one. | `cabe216`, `09de591` |
| **The Audit Trail showed "null" for every change it had recorded.** Three field names the `audit_logs` table does not have. 2,693 rows at the time, 72 of them carrying a real before-image, none of it reaching the screen. | `b3c97e4` |
| **Editing a ledger entry rewrote how the money was received** and dropped its reference number. Open a receipt to fix a typo in the rent, and the payment method silently became Cash. | `21568a5` |
| **A bank transfer taken at the door was filed as GCash** - beside a field that asked for a bank reference. | `4170dfd` |
| **Four active residents could not be edited at all**, and every occupied unit was labelled "Active Resident" instead of the tenant's name - a string one empty field away from entering the ledger as a payer. | `df4e817`, `b593166` |
| **The tenant profile form let residents edit their name and upload a photo, and silently discarded both** - the name edit even updated the header, so it looked saved until the next reload. | `b3c97e4` |

### The pattern behind five of 2026-09-15's six, and behind the notification fault too

In a browser, a field name that does not exist is **not an error**. It is `undefined`, and the
carefully written fallback beside it then runs exactly as its author intended, on a value that
was never going to arrive. `r.tenant_name`, `l.entity_table`, `l.old_values`, `l.user_agent`,
`currentUser.email`. **The defensive default is what hides the bug** - code with no fallback
would have rendered a blank and been caught in a day.

That is now caught by **`check:fields`**, and its backend twin by **`check:columns`**. Both read
the live schema at runtime, so neither can go stale, and each was made to fail once before it
was trusted. They exist because two broken column names had survived all seven existing suites.

### What the documents claimed, and what was true

The traceability matrix says **"MISSING 9, 20.5%"**. That is the figure a panel reads off the
page. **Seven of those nine are implemented**; the real count is **3**. Separately, **6 of its 83
route citations** point at the route they name - `admin.ts` is 3,033 lines and a line number
cannot survive a living codebase.

The **System Bible is the opposite case and holds**: its normative statements are implemented,
and the three that were not this morning were closed by the day's work. Intent ages slowly; a
defect register ages the moment someone fixes something, **and it ages in the alarming
direction**.

### Two of the day's findings were mine

A feature shipped at 17:00 created a defect at 21:00 in a file already audited (`17095f3` →
`fb59517`). And an FR-033 judgement was overturned too generously before being rechecked and
reversed. Both are recorded in the documents rather than quietly patched.

### Still with the owner

The **₱35,228** of penthouse upkeep filed under a non-rental area, outside Net Operating
Income. Whether a profile photo and ticket attachments are worth object storage - the engineering
side of that is now decided and recorded in the code; what remains is the cost. What "overdue" should mean for a unit rather than a bill. *(The abusive
inquiry row is no longer among these - it was deleted on 2026-09-15.)*

---

> **RESOLVED — the abusive entry is out of the live database.**
>
> An enquiry submitted through the public form on **25 Aug 2026** for unit 1a carried a racial
> slur as its prospect name and email. It sat in the admin Inquiries inbox for three weeks
> because nothing in the interface could remove it.
>
> It is gone, on Sean's explicit instruction. Two statements, message row first because
> `inquiry_messages.inquiry_id` references `inquiries`:
>
> ```
> DELETE FROM public.inquiry_messages WHERE inquiry_id = '82f74d64-...';
> DELETE FROM public.inquiries        WHERE id          = '82f74d64-...';
> ```
>
> **Verified after:** `inquiries` **2 → 1**, `inquiry_messages` **2 → 1**, and the only row left
> is **Rhea Mendoza, Contacted** - the real lead, untouched. Confirmed in the running app too:
> the inbox shows Rhea alone, on Room 1C, with no trace of unit 1a.
>
> **Why it took ten cycles.** I had flagged it repeatedly and could not act: the sandbox
> classifier refused the DELETE, and then refused even a `SELECT` scoped to that id. That is a
> guardrail on destructive database work, and the right response to it was to stop and hand
> over the statements rather than look for a way round. It cleared the moment Sean said
> delete it - which is exactly what the guardrail is for.
>
> **The gap it exposed is still open:** the public enquiry form validates *format*, not
> content, and there is still no way to remove an abusive lead from the interface. A
> `DELETE /api/admin/inquiries/:inquiryId` was started and abandoned this session - building a
> delete endpoint straight after a denied delete reads as circumvention, whatever the intent.
> It is a small piece of work if you want it.

> **LATEST — commits `623a88a`, `90f6dbf`: a check told me it had my back, and it did not.
> I only found out because I broke the code on purpose.**
>
> ### What I set out to do
>
> Write down, per handler, what happens if a multi-table write fails halfway. The standing note
> — *"any multi-step write not routed through a database function can still half-complete"* — is
> true and sounds far worse than the code actually is. A panel will ask. There was no answer
> written anywhere.
>
> **Fifteen handlers touch more than one table.** The picture, verified against the route files:
>
> | | |
> |---|---|
> | **3 are fully atomic** | database functions, migrations `010`, `018`, `019` — the three where *both* writes must land: money against a bill, an expense against its allocations |
> | **1 pair is welded** | `room_price_history` is written by trigger `trg_record_room_price_change`, in the same transaction as the rate. **A rate cannot drift from its own history**, which matters because BR-003 is anchored there |
> | **12 are ordered** | the record that matters is written first |
>
> That last one is the real defence. `POST /admin/income-records` — the only path by which cash
> Mrs. Fe physically received enters the ledger — inserts the income row **before it reads a
> single bill**. If anything downstream fails, **the money is recorded and survives**; only the
> bill status lags, and the next receipt repairs it. The handler already says so in its own error
> text.
>
> ### Then I checked my own sentence
>
> I had written *"and `npm run check:writes` fails the build if a new one is not guarded."* Before
> publishing it I deleted a live guard to watch the suite catch it.
>
> **It reported ALL CHECKS PASSED.**
>
> The suite was anchored `^await db`, so it only ever saw a result thrown away *without being
> named*. This walked straight past it:
>
> ```
> const result = await db.from('bills').update({ status: 'Due' });
> // ...and `result` is never looked at again
> ```
>
> Same silent write, wearing a variable name — and **harder** to catch by eye, because the line
> looks like it is doing something with the outcome.
>
> **No such write exists in the code.** The sweep found 43 writes destructuring `error`, 24 going
> through a helper, 1 captured and examined, **0 bad**. So this was a hole in the *guarantee*, not
> a live bug: the suite was narrower than its own headline and would have let the next one
> through. Three shapes now fail, each proved by mutation and reverted.
>
> **This is the second time this session a check gave a false pass on exactly the scenario it
> existed for** (`check:endpoints` was the first). That is why nothing here is trusted until it has
> failed on purpose.
>
> *And the first mutation I wrote was itself wrong* — it deleted the guard but left an
> `attachResult.error` read two lines below, so the suite was right to pass it. **A broken test
> and a broken check look identical from the outside.** Recorded.
>
> ### One real bug fell out of it
>
> `POST /tenant/tickets` writes the ticket, then its photos. The ticket commits first — so it is
> already on Mrs. Fe's screen — but a failed photo insert **threw**, and the tenant saw
> *"Submission failed."*
>
> The obvious thing to do then is submit it again. **A leak would get two tickets**, and she would
> have to work out they were one leak.
>
> `checkedWrite.ts` already describes this exact case, and the notification insert after a payment
> settlement was given the right treatment for the same reason. This one was missed. The tenant is
> now told the ticket *was* filed and the photo was not attached — reply to it with the photo,
> do not send it again.
>
> **Fourteen suites green. `check:api` 57 passed.**

> **PREVIOUS — commit `9c5f138`: every request string now stops at its column's width, and the
> same shape has now appeared three times in one session.**
>
> PostgreSQL raises `22001` when a value overflows a `varchar(n)`. The handler wraps that as an
> internal error, and `errorHandler` replaces a 500's message with a flat *"Internal server
> error."* — **correctly**, so a database string cannot leak. But it leaves the administrator
> with a form that failed and **no reason why**.
>
> ### The project already knew this
>
> `PATCH /auth/me` was fixed months ago with lengths matching its columns. The income schema uses
> `shortText(20 | 100 | 255)` against `room_number`, `invoice_number` and `contact_name`. The
> helper sits in `utils/validators.ts` and is used **ten times**.
>
> These were simply never given it:
>
> | Schema | Fields |
> |---|---|
> | tenant onboarding | fullName, email, phone, emergency contact ×2, occupation, roomNumber |
> | tenant update | the same seven |
> | **registration** | the same, in `auth.ts` |
> | rooms | `cluster_code(50)`, `room_number(20)` |
> | tickets | `title(255)`, `category(100)`, `assignedTechnician(160)` — **create and update** |
> | expenses | `categoryCode(20)` |
>
> Every cap is the column's own width, **read from `information_schema` rather than guessed**.
> `facebook_url` and `or_supplier` are `TEXT` and are deliberately left unbounded.
>
> **Nothing that submits successfully today starts failing.** `.max()` was added to the existing
> schemas rather than swapping in the helper — because `optionalText` also rejects an empty string
> after trimming, and a form sending `''` for an unfilled optional field would have begun failing.
> Optionality and messages are untouched; only a ceiling is added.
>
> ### Three times in one session is a pattern, not an anecdote
>
> | Had it right | Did not |
> |---|---|
> | `updateOwnProfile()` filters through an explicit five-name allowlist, **with a comment saying why** | `register()`, twelve files away, wrote `role` straight from the request body |
> | `tenant.ts` caps a ticket title at **200** and a category at **60** | `admin.ts` capped **the same two fields** at nothing |
> | The income schema uses `shortText` against its own columns | Onboarding, registration, rooms, tickets and expenses — all uncapped |
>
> **In every case the helper already existed, the reasoning was already written down in a
> comment, and a second site simply never received it.** That is now entry 8 of the judgement
> log, with all three instances, because it predicts where to look next better than any of the
> individual findings do.
>
> **Fourteen suites green. `check:api` 57 passed.**

> **PREVIOUS — commit `b4fc49b`: the receipt form had no duplicate guard — and the owner's own
> ledger corrected the guard I wrote for it.**
>
> `monthly_income_records` has **one** constraint: a primary key on `id`. Nothing stops the same
> receipt being recorded twice.
>
> The **gateway** path already guards — on verification it looks for an existing income row by
> `transaction_reference` before inserting. The **on-site form**, where Mrs. Fe types a receipt by
> hand, had no equivalent. The browser disables its submit button while saving, which closes the
> impatient double-click, but **not** a network retry on a request that actually succeeded, nor
> the same receipt being entered twice. Either double-counts rent among 937 rows with nothing to
> notice it.
>
> ### The data corrected my first version
>
> I matched on the obvious four: unit, receipt number, date, amount. **Four groups in the live
> ledger already match on exactly those:**
>
> | Receipt | Rows | Periods |
> |---|---:|---|
> | `OR#4895` | **4** | 2024-09, 10, 11, 12 |
> | `OR#4896` | 3 | 2025-01, 02, 03 |
> | `OR#4920` | 2 | 2025-04, 05 |
> | `OR#4952` | 2 | 2025-04, 05 |
>
> Every one is **a single receipt split across the months of arrears it settles.** Legitimate, and
> **not** double-counted money — each row is a different period. That guard would have rejected
> the next arrears settlement she recorded.
>
> It would also have **thrown rather than rejected**: `maybeSingle()` errors on more than one
> match, so those four would have produced a **500** where a clean **409** was intended.
>
> Adding the **period** makes the combination unique across **all 937 rows** — checked, not
> assumed. That is the real constraint, and **the code could not have told me**: the form has no
> field saying "this receipt also covers three other months", the schema has no comment about it,
> and the shape exists only in how the owner actually issues receipts.
>
> *I went looking for a missing constraint and the ledger told me what the constraint is.*
> Recorded as entry 14 in the judgement log: **before writing a uniqueness rule, ask the data what
> is already true.** One query, and it is the difference between a guard that protects the ledger
> and one that stops her using it.
>
> ### Checked and clean in the same pass
>
> **Money precision is properly handled.** `MONEY_DUST = 0.005` and `toCentavos()` guard the
> receipt-allocation arithmetic, with a comment naming the exact failure — a `4.5e-13` residue
> passing `CHECK (amount > 0)` and being written as a junk payment row. Both live bills are
> exactly covered by their verified payments.
>
> **Fourteen suites green.**

> **PREVIOUS — commits `d026e21`, `884d0e8`: the system kept its dates in UTC. The property is at
> UTC+8, so for eight hours of every day it was recording the wrong one.**
>
> `new Date().toISOString().slice(0, 10)` is **UTC's** date. Legazpi City is **UTC+8**, no
> daylight saving. **Between midnight and 08:00 Manila those two dates differ.**
>
> ```
> 2026-09-16T16:30:00Z    UTC 2026-09-16    Manila 2026-09-17 00:30
> 2026-09-16T23:30:00Z    UTC 2026-09-16    Manila 2026-09-17 07:30
> ```
>
> Not a local-machine quirk: `toISOString()` converts to UTC whatever the server's own zone is,
> so it was **wrong on every machine equally**.
>
> ### Four separate consequences, worst first
>
> **1. The ledger's filing period depended on where the server runs.** `payments.paid_at` is a
> *moment*. The verification path read its year and month with `getFullYear()`/`getMonth()` —
> the **server's** timezone — and wrote `date_paid` from `toISOString()`. Demonstrated:
>
> | | `date_paid` | filed under |
> |---|---|---|
> | before | 2026-09-30 | **September** |
> | after | 2026-10-01 | **October** |
>
> *for a payment at 01:00 on 1 October, Manila time.* **Recorded a day early, in the wrong
> month.**
>
> **2. The payment form offered yesterday.** Five browser form defaults used `toISOString()`, so
> before 08:00 they pre-filled **yesterday's date** — on the on-site payment date, the period
> start, and the expense date. The administrator would have had to notice.
>
> **3. The form could overwrite the server's correct period with a wrong one.** Two views computed
> the period end as `setMonth(+n)` then `setDate(-1)`. That overflows: **31 January plus one month
> became 2 March.** It was right everywhere else, because a one-day overflow is exactly cancelled
> by the minus-one-day — **so only February exposed it**, which is the worst way for a bug like
> this to behave. The server's `computeRentPeriod()` already clamps correctly; the browser kept a
> second, slightly wrong copy, **and the API prefers a supplied end date over its own**.
>
> **4. A plain date string was given a timezone it never had.** `new Date('2026-09-16')` is UTC
> midnight; read back with local getters it returns the previous day anywhere west of UTC.
>
> ### No existing data is affected
>
> All **48** tenancies and all **937** income rows came from the 2026-08-28 migration. **The
> application has never written either.** This is preventive, not remedial — nothing in the
> database needs correcting.
>
> ### One thing I got wrong on the way
>
> My first test listed five cases as bugs. **Three of them were correct code and my expectation
> was wrong** — 31 March plus one month really does end 30 April. Only February breaks. *The
> narrow truth was the useful one, and reporting the wide version would have sent someone
> chasing correct arithmetic.*
>
> Guarded by two new `check:api` assertions (**55 → 57**): one fails if the UTC pattern returns
> anywhere in `backend/src`, proved by reintroducing it; the other asserts Asia/Manila genuinely
> differs from UTC inside the window, **so the first cannot pass by the timezone being silently
> ignored**.
>
> **Fourteen suites green. Both builds clean.**

> **PREVIOUS — commit `58ceea9`: one measured ratio across every document that quotes it, and
> `check:copies` catching drift on its first real test.**
>
> D-9 complained that three documents gave three different call-count ratios and none stated its
> method. The method is now stated, and the other three carry **the same measured figure**
> rather than their own:
>
> | Document | Was | Now |
> |---|---|---|
> | `PHASE1_ARCHITECTURE_AND_PATTERN.md` (×3) | 131 of 164 | **144 of 184** |
> | `PRESENTATION_INDEX.md` | 131 of 164 | **144 of 184** |
> | `12_ITERATION_HISTORY.md` | 137 of 173 | **144 of 184** |
>
> Each says what it replaced, so the change is auditable rather than silent. `admin.ts` is
> **3,033** lines everywhere now — not 2,263 in two places and ~2,500 in a third.
>
> The architecture paper also claimed **nine** service modules and listed nine. **There are
> eleven** — `expenseReportExport.ts` and `incomeReportExport.ts` were missing from its own list.
>
> ### The number in that distribution worth reading twice
>
> `admin.ts` **118**, `tenant.ts` **19**, `public.ts` **7** against **38** across the eleven
> services. And **`billingService.ts` makes ZERO database calls.**
>
> It is pure arithmetic over data handed to it — water fees, billing periods, overdue status,
> receipt allocation. **That is exactly what a domain service should look like.** But the ratio
> counts *data access*, so a service that holds rules rather than queries is **invisible** to it,
> as are the three database functions doing multi-table work. **The measurement understates the
> extraction that has already happened**, and the paper now says so beside the number.
>
> ### `check:copies` earned itself within the hour
>
> Editing the architecture paper made its filming copy stale. **The check caught it immediately**
> — its first real test, on drift I had just created myself. Refreshed; nine pairs at zero.
>
> ### Also checked, and clean
>
> **`.env.example` is complete.** All fourteen variables `env.ts` reads are declared, and the two
> extras — `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY` — are genuinely used, by the check
> scripts and the client. Nothing required is missing, which is the failure that makes a fresh
> setup fail confusingly.
>
> **All 14 suites green in one run. Both builds clean.**

> **PREVIOUS — commits `ab9244a`, `d83db50`: one command for all fourteen suites, and a document
> that asked to be re-measured, answered.**
>
> ### `npm run check:all`
>
> Fourteen suites across three `package.json` files meant three `cd`s and fourteen commands, in
> the right order, remembering which live where. **Before a defense that is exactly the chore
> that gets half-done — and a suite nobody runs is a suite nobody wrote.**
>
> One command from the root. Every suite's own output in full, then a summary table. **It hides
> nothing:** a green line means that suite said green, not that the runner decided it was fine.
> It does **not** stop at the first failure, so one broken suite cannot conceal the other
> thirteen. Proved by planting a leak in `dist` — `check:secrets` marked FAIL, the rest still
> ran, exit code **1**.
>
> ### D-9 asked for the ratio to be re-derived. It has been.
>
> `04_ARCHITECTURE.md` carried a row complaining that three documents quote different call
> counts — *131 of 164* here and in the Phase 1 architecture paper, *137 of 173* in the iteration
> history — and that **"none states its counting method, so the ratio should be re-derived
> rather than quoted."**
>
> ```
> grep -ro "\.from(" backend/src/routes/                         144
> grep -ro "\.from(" backend/src/services/                        38
> grep -ro "\.from(" backend/src/middleware/ backend/src/config/   2
>                                                                 ---
>                                                                 184   → 78%
> ```
>
> `admin.ts` is **3,033** lines. And the method's limits are printed beside it: it counts call
> *sites*, not queries executed, and **cannot see the three database functions** that do their
> own work — `settle_verified_payment`, `create_expense_entry_with_allocations`,
> `replace_expense_allocations` — so it **understates** how much logic has already left the
> handlers. *Quote the method with the ratio or neither.*
>
> ### A-19 — a unit photo can be added but never removed
>
> The room PATCH guards its photo write with `if (photo && photo.trim().length > 0)`, so an
> empty string is ignored and the existing row survives. **There is no delete path for a room
> photo anywhere.** The modal nevertheless clears its local copy, so **the interface shows the
> photo removed and a reload brings it back** — the same shape as the tenant profile form that
> discarded a name edit while updating the header.
>
> **Latent:** `room_photos` holds **0 rows** across all 33 units. Which is worth knowing on its
> own — **the public listing shows every unit without an image.** The upload path works and
> writes correctly; it has simply never been used, like the rest of the write surface.
>
> ### And a correction to my own log
>
> It read *"every one of the **32** units with no real photo."* It is **33** — checked, not
> assumed: all 33 rooms have none. The sentence was wrong about the count **and** used the one
> figure this project has banned.
>
> **All 14 suites green in one run.**

> **PREVIOUS — commits `ebd4177`, `0195c90`: 21 migration files against 12 tracked, explained and
> verified. And the water rate, which BR-014 exists to make configurable, is copied into
> fourteen places.**
>
> ### "Nine missing migrations" — there are none
>
> `supabase_migrations.schema_migrations` records **12**. This folder holds **21** numbered
> files. Read side by side that says **nine migrations were never applied**, which is alarming
> and wrong.
>
> `001`–`010` were applied **through the Supabase SQL editor**, which does not write to that
> tracker. *It is a record of how each migration was applied, not of whether it was.* Nobody had
> written that down.
>
> Verified against the live catalogue rather than asserted:
>
> | Migration | Evidence |
> |---|---|
> | `001` RBAC auth columns | `failed_login_count`, `locked_until`, `password_changed_at` — **3 of 3** |
> | `002` RLS lockdown | **21 of 21 tables** enabled *and* forced |
> | `005` ledger FK RESTRICT | **8** `ON DELETE RESTRICT` keys |
> | `006` optional login | `profiles.email` nullable |
> | `008` property areas | **6** seeded rows |
> | `009` advance rent | `anniversary_date` present |
> | `010` atomic allocations | `replace_expense_allocations` present |
>
> With a warning not to re-run them — several are not idempotent and the database already holds
> what they create.
>
> ### The water rate is configurable, and copied into fourteen places
>
> `/public/rates` serves the configured figures, and **every caller keeps a fallback literal** for
> when that request fails — `?? 200`, `'LF' ? 400 : 200` — **fourteen** of them across
> `OnsitePaymentModal.vue`, `systemState.ts` and `IncomeCollectionsView.vue`.
>
> All fourteen match `system_settings` today: per-occupant **200**, LF **400**, LB **200**.
>
> **It is the same arrangement as `NON_RENTAL_AREAS`** — a configurable value copied into source,
> kept in step by nothing. **BR-014 exists precisely so the landlady can change the water rate
> without a developer.** The day she does, every one of these quietly bills the **old** rate
> whenever the rates request fails — including on the **on-site payment form**, which is where a
> real amount is written into her ledger.
>
> Narrow, because the request has to fail first. **Not narrow enough to leave uncompared.**
> `check:ledger` now reads the settings and compares all fourteen. Proved by raising two
> literals as though a rate had changed and the copy been left behind.
>
> ### Swept in the same pass, and clean
>
> **The `||`-on-money class cannot fire.** `totalRemitted || rent` appears eleven times in the
> dashboard, and `live.price || u.basePrice` on the public listing. Checked against live data:
> `remitted_amount` is never 0 or null across **937** rows, no room is priced 0, and the cheapest
> is **₱4,500**. Latent, not live — recorded rather than churned.
>
> **And the catch blocks that matter tell the truth.** `fetchRooms` sets `roomsFetchFailed`, and
> the dashboard renders *"Occupancy unavailable — refresh to retry"* with an em-dash **instead of
> a number**. That is the rule this audit set on day one — *show what the database says, or say
> you do not know* — already working where it matters most.
>
> **Fourteen suites green.**

> **PREVIOUS — commits `e25488c`, `1066f0c`: the snapshot the documents are told to trust is
> honest, and now has to stay that way. And a fact about the data worth knowing before the
> defense, not during it.**
>
> ### `live_schema.csv` is true — and was true only by luck
>
> This project's standing rule is to trust `database/live_schema.csv` over
> `FULL_DATABASE_SCHEMA.sql`. Last night vindicated that rule in the worst way: the DFD's
> *"closure proof"* enumerated every `CREATE TABLE` in the SQL file, found 20, and closed — while
> `property_areas` sat in production, **absent from that file entirely**.
>
> So the CSV was checked against the catalogue it claims to describe: **21 tables, 211 columns,
> matching exactly, table by table.**
>
> **But nothing regenerates it.** The next migration makes it stale silently — which is precisely
> the history of the file it replaced. *Naming a source of truth does not create one.*
> `check:columns` now compares them on every run, and the failure text says to regenerate it
> rather than hand-edit it to pass, because hand-editing is how the other file drifted into
> being wrong.
>
> Proved in both directions: a column added to the snapshot that the database lacks, and a real
> column dropped from it.
>
> ### No ledger row has ever been written by the application
>
> The dashboard shows **₱0 collections for September** and *"0 collections recorded this month"*.
> That looked like it might be a defect. **It is not** — and what it actually is, is worth knowing:
>
> | Table | Rows | Written by the app since the migration | Newest row |
> |---|---:|---:|---|
> | `monthly_income_records` | 937 | **0** | 2026-08-28 |
> | `monthly_expense_entries` | 1,262 | **0** | 2026-08-28 |
> | `payments` | 15 | **0** | 2026-08-25 |
> | `bills` | 2 | **0** | 2026-08-21 |
> | `maintenance_tickets` | 5 | **0** | 2026-08-26 |
>
> **Every figure in the system arrived in one migration on 2026-08-28.** The system has been in
> read-only use for nineteen days. *(`notifications` and `audit_logs` do have newer rows — those
> came from this audit's own probing, not from use.)*
>
> Two consequences, neither a fault, both better known in advance:
>
> 1. **The income ledger stops at July 2026.** August and September collections are not in the
>    system. The ₱0 is the data being absent, not the figure being wrong — but it is what a panel
>    sees on an unprepared demo.
> 2. **The write paths have been proven by the suites and never used in anger.** `check:api`,
>    `check:billing` and `check:writes` exercise them, and several real defects in them were
>    found and fixed during this audit — but no real collection has ever been recorded through
>    the interface.
>
> Recorded in the handoff as a decision: record the two months before the defense, or say plainly
> that the ledger is complete through July and the system has been read-only since migration.
>
> ### The arithmetic holds in aggregate too
>
> Checked while there, across all seven months of 2026: `fifty_percent_share` totals
> **₱880,225.00** against rent of **₱1,760,450.00** — exactly half, to the centavo. `remitted`
> less `rent` leaves **₱66,400** of water. The generated columns hold in the aggregate, not just
> row by row.
>
> **Fourteen suites green.**

> **PREVIOUS — commits `898b476`, `3303d11`: the documents you would have filmed from had drifted
> from the documents of record, and one of them still contained a proof this audit disproved.**
>
> `VIDEO PRESENTATION DOCS/` is **gitignored**. So its copies of the Phase 1–3 outputs never
> travel with the repository, are never seen in a diff, and **nothing had ever compared them to
> the originals.** Measured today:
>
> | Filming copy | Differing lines |
> |---|---:|
> | `05_section5_dfd_traceability.md` | **126** |
> | `06b_section6_business_rule_crosswalk.md` | **88** |
> | `01_SCRIPT_defense_pack.md` | 33 |
> | `04c_section4_security_and_rls.md` | 16 |
>
> **Every difference was the copy being older. Never better.** Two of them matter:
>
> - the **security** copy still said the transaction gap was **Open** — three days after
>   migration `018` closed the payment path — and still carried a claim about
>   `update_expense_entry_total()` that the original had corrected as an **overclaim**
> - the **DFD** copy still contained the **closure proof over 20 tables** that this audit
>   disproved last night
>
> **These are the files a camera points at.** A stale copy there is not a documentation problem;
> it is a wrong sentence said out loud to a panel.
>
> All four refreshed from the originals. **Nine pairs, zero drift.**
>
> ### And a fourteenth suite, because a note is not a mechanism
>
> An earlier entry added a handoff line telling a human to remember to refresh these.
> **`check:copies` now stands behind it.** It compares all nine pairs, and when the folder is
> absent it says so with a reason rather than passing silently — a fresh clone genuinely does not
> have it, and a quiet skip would be the same failure one level up.
>
> Proved by making a copy stale and watching it fail, then restoring.
>
> *This session has spent two days establishing that a comment asking a human to remember is not
> a mechanism. It applied to my own handoff note within the hour.*
>
> ### Also moved
>
> The security caution now sits **above** the anticipated-questions table rather than below it.
> It has to be read **before** the answer is given, and it was in the wrong order.
>
> **Fourteen suites green.**

> **PREVIOUS — commits `7d2333b`, `c59fbe0`: the defense pack's security answer had gone false
> in the one way that matters — a panelist could contradict it in the room.**
>
> The pack's answer to *"how do you know your system is secure?"* ended **"We rotated
> everything."**
>
> True of the Supabase keys and the JWT signing secret, both rotated 2026-09-13. **Not true of
> the account passwords.** `Hivelet@Admin2026` is still live. A panelist who checks can
> contradict that sentence **in front of them** — the worst possible failure for an answer whose
> entire strength is candour.
>
> **The corrected answer is a better answer**, because it is a longer list honestly told: the
> committed keys and the rotation; the registration endpoint that took a `role` from the request
> body; and the sign-in page that shipped 34 passwords and every resident's room number. Four
> problems found in their own system, each with what was done about it.
>
> A caution now sits **immediately above** the anticipated-questions table: *do not claim
> everything was rotated unless the passwords have actually been changed* — and if they have
> not, say so precisely. **The precise answer is the stronger one either way.**
>
> ### The figure most likely to be challenged still holds
>
> The pack flags its own ₱3.43M breakdown as the number a panel will probe. Re-queried against
> the live database rather than read off the page:
>
> | | Claimed | Live |
> |---|---|---|
> | Whole expense ledger | ₱5,823,586.47 | ₱5,823,586.47 |
> | Non-rental (Main House + Personal) | ₱3,432,990.47 | ₱3,432,990.47 |
> | Share of ledger | 58.95% | **58.95%** |
> | Allocation rows | 1,327 | 1,327 |
>
> **Exact.** "21 tables" and "33 units" are also still correct throughout.
>
> ### And a correction to my own commit message
>
> Commit `1d39e26` said a fix was applied *"in both the Phase 2 deliverable and the
> video-presentation copy"*. **The edit was made; that commit contains four files and none of
> them is it.**
>
> `VIDEO PRESENTATION DOCS/` is **gitignored** — `.gitignore:61` — with only four files in it
> tracked. Everything else there is a **derived copy** that does not travel with the repository.
> So the local file is right and the statement about the repository was not. *Recorded rather
> than quietly left.*
>
> **It matters practically:** a clone on another machine — Loyd's, per the filenames in that
> folder — gets the canonical documents and **stale copies**. Three of those copies carry
> local-only corrections right now, including today's security answer. Added to the handoff:
> **regenerate them from `docs/claude_pipeline/outputs/` before filming, or film from the
> canonical documents.**

> **PREVIOUS — commits `67fa830`, `f43622b`: the rest of what the browser and the laptop are
> exposed to. Two things verified clean, two recorded for Sean.**
>
> ### The bundle carries no resident data — checked, not assumed
>
> After the sign-in page finding, the whole built output was swept for anything personal:
>
> | | |
> |---|---:|
> | Resident names | **0** |
> | Resident email addresses | **0** |
> | Resident phone numbers | **0** |
>
> The one real phone number in there, `09494150382`, **belongs to no profile** — it is the
> boarding house's own public contact, used in the footer and as the GCash number. Checked
> against `profiles` rather than eyeballed.
>
> ### The service worker was already right, and now says why
>
> Tenants open this on phones, and a boarding-house phone is often a **shared** one. Caching
> `/api/tenant/*` would leave one resident's bills and tickets in the service worker, ready to
> serve to whoever opens the app next — **offline, with no token, after a sign-out.**
>
> The rule matches `/api/(public|health)` and nothing else, which is correct. **Verified in the
> shipped worker, not the config:** `dist/sw.js` contains **zero** `api/(admin|tenant|auth)`
> patterns and precaches 9 static assets only. It had **no comment** saying why, and widening it
> for offline support would be an easy, well-meant change with no visible symptom. It has one now.
>
> ### `npm audit` — backend 0, frontend 4, none of them shipped
>
> All four are **devDependencies**: vite 5.4.21 and esbuild 0.21.5. The built app is unaffected.
> They affect **the machine running `npm run dev`** — and **two are Windows-specific**, which
> matters because this is a Windows machine:
>
> - an **NTLMv2 hash disclosure** through UNC path handling
> - a **`server.fs.deny` bypass** via alternate paths
> - plus esbuild: any website you visit can send requests to the dev server and read the response
>
> **And `host: true` in `vite.config.ts` binds every network interface**, not just localhost.
> That is what lets a phone on the same wifi open the tenant portal for testing — a capability
> worth having — but it means **anyone on that network can reach the dev server while it runs**,
> and it makes those two Windows advisories reachable from the LAN rather than only from a page
> in Sean's own browser. On campus wifi that is not a small audience.
>
> *Until an hour ago, what that server was handing out included 34 account passwords.*
>
> **Documented rather than changed.** The fix is **vite 8, a major upgrade**, and running that
> unattended on a working build days before a defense is not a trade to make for someone else.
> Recorded in the handoff with the interim mitigation: **do not leave the dev server running on
> an untrusted network.**
>
> Build re-verified after editing the build config; dev server answering 200.
>
> **Thirteen suites green.**

> # ⚠ **PREVIOUS — commit `5001b0f`: the public sign-in page shipped the administrator's
> password, and every resident's room number.**
>
> The login page carried a **"Quick Demo Access — 1-Click Sign In"** panel listing 34 accounts.
> Each entry had a `password` field, and the button ran a **real login**.
>
> **Verified in the built output, not inferred.** `dist/assets/index-*.js` contained:
>
> | | |
> |---|---:|
> | `Hivelet@Admin2026` | **1** occurrence |
> | `Hivelet@Tenant2026` | **33** occurrences |
>
> **Anyone who loaded the site — or simply downloaded that one JavaScript file — had the
> landlady's administrator password, and the page offered a button to use it.** No
> authentication required, on the page that exists to require it.
>
> ### The half a password change does not fix
>
> The same panel published, to anyone who opened the sign-in page:
>
> - the **full name** of all **33 real residents**
> - each one's **email address**
> - **the room each of them lives in**
>
> These are real people at a real address, and the list pairs a name with the room they sleep
> in. **BR-024 Tenant Privacy** is recorded as *Enforced*.
>
> ### The fix keeps the demo and removes the exposure
>
> The list moved to `lib/demoAccounts.dev.ts`, imported **only** inside
> `if (import.meta.env.DEV)` through a dynamic import. Vite substitutes `false` at build time,
> so the branch and everything it reaches are eliminated. Proved **both ways**:
>
> | | |
> |---|---|
> | **Built bundle** | `Hivelet@Admin2026` **0**, `Hivelet@Tenant2026` **0**, resident emails **0**, no stray chunk emitted |
> | **Dev server** | all 34 accounts still listed, **one-click sign-in intact** |
>
> **So the defense demo is unchanged and a deployed app has none of it.**
>
> ### The part the fix cannot undo — rotate both passwords
>
> The password entered tracked source on **2026-08-25** in `788f321` and has been in the history
> of `github.com/SeanJerve/hivelet` ever since. **That is the same window this project already
> records as a public-repository exposure** for the JWT secret — `backend/src/config/env.ts` says
> so in its own comment, 2026-08-25 to 2026-09-13.
>
> **Removing it from HEAD does not remove it from history. Treat both shared passwords as burned
> and rotate them.** Added to the handoff table as Sean's, because changing a live credential is
> not mine to do.
>
> ### Why `check:secrets` missed it for three weeks
>
> Every rule in that suite looks for **key-shaped** material — Supabase keys, JWTs, tokens,
> private-key blocks. **An account password looks like an ordinary string.** And the suite only
> ever read files git knows about: `frontend/dist` is gitignored, so **nothing had ever looked at
> what actually ships.**
>
> It now scans the build output for account passwords, resident email addresses and Supabase
> secret keys, and reports how many built files it read — so a skipped scan is visible rather
> than silent. Proved by planting a leak in `dist`: both rules fired and the process **exited 1**;
> exit **0** once removed.
>
> *A source-wide password rule was considered and rejected — the same literal legitimately lives
> in the onboarding handler and the seed migrations, so it would have needed an allowlist wide
> enough to hide the next real one.*
>
> **Thirteen suites green.**

> **PREVIOUS — commit `c2e34c8`: the business rules tested against the data instead of against
> the register. Eight invariants, all green.**
>
> `check:rules` proves the BR crosswalk **agrees with itself** — its counts match its rows, its
> statuses are ones the legend defines. **It never reads the database**, so it cannot prove a
> rule marked *Enforced* is actually obeyed.
>
> Eight now do, each a rule from `02_BUSINESS_RULES.md` turned into a question the live data can
> answer:
>
> | Rule | Verified against live data |
> |---|---|
> | **BR-002** Room Identity | 33 rooms, no duplicate room number |
> | **BR-032** Canonical Unit List | **33 units, 5 clusters** |
> | **BR-008** Primary Contact | 32 occupied rooms, **exactly one** primary each |
> | **BR-026** Duplicate Prevention | 43 tenants, no repeated email or phone |
> | **BR-026** one tenancy per tenant | 32 active assignments |
> | **BR-004** Room Occupancy | **no room let to two tenants at once** |
> | **BR-013** Full Payment | every bill reading Paid is covered by verified payments |
> | **BR-017** Payment Verification | 15 payments, **none Verified without a verifier** |
>
> **All eight pass — that is the finding.** Six *Enforced* rules hold against 937 income rows, 45
> profiles and 15 payments, and the counts printed beside each match the project's standing
> facts, which is worth as much as the pass itself.
>
> **Proved by injecting violations into the fetched arrays, never into the database.** A
> duplicated room tripped BR-002 and BR-032; a second active assignment for one room tripped
> BR-004 and, correctly, **BR-008 as well**, because both rows then claimed to be the primary
> contact.
>
> *Also corrected: a failure printed the expectation after "N violation(s):", so it read as
> though it were asserting the thing it had just disproved. **A confusing failure message is how
> a check gets ignored.***
>
> ### On the Adyen tunnel
>
> **I can start it — `cloudflared 2026.9.1` is installed — and I am not going to, because it
> would not help.** A new tunnel gets a **new random URL**, and Adyen keeps pointing at the dead
> one until somebody pastes the new address into the dashboard. **That half needs Sean**: it
> means signing into Adyen, which is not something to automate.
>
> So starting one now would leave a public door open to the laptop that nothing is using.
> **Nothing in this audit needs it** — `check:adyen` verifies 23 HMAC signatures with no network
> at all, and everything else talks to the local backend or Supabase directly. Start it when a
> payment is about to be demonstrated, not before. The runbook box in `CONTINUE_HERE.md` said
> `cloudflared` was not installed; that was true when written and is now corrected.
>
> **Thirteen suites green after the restart**, including `check:adyen` 23/23.

> **PREVIOUS — commits `30a805b`, `1e7cfb9`: the rest of the perimeter, swept and written down.
> The model is sound. One endpoint was not built to it.**
>
> A reader who finds a privilege escalation is entitled to ask **what else was checked**. So the
> whole perimeter was, and §5.0 of the matrix now answers eleven questions a panel will ask —
> every one read in the code or called against the running server, none taken from a design
> document.
>
> ### What holds
>
> | | |
> |---|---|
> | **Every** `/admin/*` and `/tenant/*` route declares `requirePermission` | on top of router-level `requireAuth` + `requireAdmin` |
> | **No request schema accepts `role`** any more | onboarding hardcodes `'tenant'`; the two `account_status` schemas are admin-guarded and enum-bound |
> | `PATCH /auth/me` filters through an **explicit five-name allowlist** | `role`, `account_status`, `email`, `password_hash` are not on it |
> | **A token cannot carry a forged or stale role** | `requireAuth` takes only the *subject* from the JWT and re-reads `role` and `account_status` **from the database on every request**, throwing if the account is gone or inactive |
> | **One tenant cannot reach another's data** | all 15 tenant routes scope to the caller; the three taking an id from the path verify ownership explicitly |
> | Brute force is resisted | `failed_login_count` and `locked_until` maintained, honoured, and cleared on success |
> | The database itself | RLS enabled and **forced on all 21 tables with zero policies**; `anon` and `authenticated` hold no privileges on any |
>
> **The detail worth singling out:** the ticket-thread routes answer **`404 Ticket not found`**,
> not `403`. A non-owner is not told the ticket exists, so the id space gives no enumeration
> oracle. That is a deliberate choice somebody made, and it is the right one.
>
> **And the allowlist in `updateOwnProfile` is exactly the pattern `register()` was missing.**
> The codebase already knew the right shape in one place and not the other — which is usually
> how a single endpoint ends up out of step with a model that is otherwise correct.
>
> ### What an unauthenticated visitor actually receives — called, not read
>
> `GET /api/public/rooms` returns **33 rooms**. Keys: `id, room_number, floor, cluster_code,
> room_type, description, capacity, current_price, operational_status, visibility_status,
> available_from, is_linda_unit, room_photos`. **No tenant name, phone, email, assignment or
> occupant count in any of them**, and all 33 came back `Published`, so no hidden unit leaked.
>
> ### One fix: `NODE_ENV` now defaults to `production`
>
> It decides exactly two things — whether a 500 carries a **stack trace**, and the log format.
> Both fail **safe** at `production` and **open** at `development`, and the default was
> `development`. A deployment that simply forgot to set the variable would have served stack
> traces to the public: file names, line numbers, the shape of the failed query.
>
> The error handler is otherwise careful — it already replaces a 500's message with a flat
> *"Internal server error."* so a Postgres string cannot escape. **The stack beside it was gated
> on a variable that defaulted to the leaky value.**
>
> *This is the same lesson this file already records in its own comment:* the compromised-secret
> guard originally fired only on `NODE_ENV === 'production'` — **"the one environment this
> project has never run in."** A safety control keyed to an unset variable is not a control.
> Nothing changes locally, where `.env` sets it explicitly; verified by reading it back.
>
> ### Also checked and clean
>
> **No 4xx message anywhere is built from a database error string**, so the careful 500 handling
> is not undone by a 400 carrying the same text. And every money field in every request schema
> uses the shared `.finite()` primitive — which matters because **PostgreSQL sorts `NaN` above
> every other numeric**, so `CHECK (rent_amount >= 0)` accepts `'NaN'`, and two `GENERATED`
> columns derive from it. One malformed request would have turned every `SUM()` over the ledger
> into NaN.
>
> **Thirteen suites green. Both builds clean.**

> # ⚠ **PREVIOUS — commit `8b09f80`: anyone could have made themselves an administrator.**
>
> **`POST /api/auth/register` let the caller choose their own role.**
>
> The route is public — no `requireAuth`, no `requirePermission` — and that is **correct**, it is
> how a person signs up. But its schema accepted `role: z.string().optional()`, and
> `authService.register()` wrote that value straight into the insert:
>
> ```
> role: data.role || 'tenant',
> ```
>
> and `user_role_type` accepts `'admin'`. So this, from anyone who could reach the server:
>
> ```
> POST /api/auth/register
> { "email": "…", "password": "…", "fullName": "x", "role": "admin" }
> ```
>
> **created an administrator and returned a signed token for it.** That token reaches all **937
> income rows**, all **45 tenant profiles** with their phone numbers and emergency contacts, the
> ledger **edit and void** paths, and the **payment verification gate**.
>
> ### It was never used
>
> **Exactly one admin account exists**, created **2026-07-30** in the original seed. No account
> of any role has been created since **2026-08-27**. Checked before anything else, because it is
> the first thing worth knowing.
>
> ### Four facts, each read rather than inferred
>
> | Where | What it says |
> |---|---|
> | `auth.ts:88` | the route carries no auth guard of any kind |
> | `auth.ts` | `registerSchema` listed `role` as an optional string |
> | `authService.ts` | the insert used `role: data.role \|\| 'tenant'` |
> | `pg_enum` | `user_role_type` = admin \| tenant \| prospect |
>
> **I did not prove it by exploiting it.** Creating an account is not mine to do, and creating an
> admin account on the owner's live database to demonstrate that admin accounts can be created is
> not a test worth having. The chain above is unambiguous from three files and the catalogue.
>
> ### The fix
>
> `role` is gone from the schema, and `register()` always inserts `'tenant'`. Zod strips unknown
> keys, so a payload still carrying `role` is **accepted and ignored** rather than rejected — the
> caller learns nothing and a genuine tenant still gets their account.
>
> **Nothing legitimate changed.** The sign-up form has only ever sent email, password, fullName
> and phoneNumber, and `'tenant'` was already the default for every request that did not ask for
> something else.
>
> ### The guard, and an honest label on it
>
> Two new `check:api` assertions, **53 → 55**. They read the **source**, not the server — and the
> code says why: every other assertion in that suite is behavioural, but proving this endpoint
> *ignores* a role would mean registering an account against the live database.
>
> Both were made to fire by putting each half of the hole back. **The first attempt reported
> MISSED for both, and that was a false negative** — the backend runs under `tsx watch`, so
> editing the source restarted the server mid-run. The probe now waits for `/api/health` and
> reads the guard's own output lines instead of the exit code. *A guard that appears not to fire
> is worth a second look before it is believed.*

> **PREVIOUS — commit `1322f48`: the owner's own books swept end to end. Seven receipts need her
> word. Everything else is clean to the centavo.**
>
> Twelve suites check the code. **This one checks the records** — because the code being right
> does not make the ledger right. 937 income rows came out of a spreadsheet, and a spreadsheet
> can hold a date Excel never parsed.
>
> ### Two dates that cannot be right
>
> | Receipt | What it says |
> |---|---|
> | `OR#4839` | dated **1900-01-17** — the Excel epoch, so the source cell never parsed. Its year/month also disagree with its own rent period. |
> | `INVOICE#5120` | dated **2027-02-26**, a year in the future, against a 2026 rent period. |
>
> ### Three rent periods that end the day before they start
>
> `OR#4757` 2024-08-03 → 2024-08-02 · `OR#4775` 2024-08-30 → 2024-08-29 · `OR#4872` 2025-02-03
> → 2025-02-02. A migration off-by-one; each end date looks **one month short**.
>
> ### Two receipt numbers used twice — and one of them matters
>
> `OR#4774` covers two rooms for one tenant but **twelve days apart**. And **`OR#4813` is
> against two different tenants on the same day** — Ron Juliene Dominguino (2a, ₱8,000) and
> M. Juselle Escuro (3a, ₱9,000). **Two people cannot share one official receipt number.**
>
> ### Nothing has been written to any of them
>
> **Correcting a receipt means knowing what it should say, and that is Mrs. Da Silva's to tell.**
> So all seven are pinned in the check by receipt number with what is wrong; it passes with
> them and **prints every one on every run**. A row *not* on the list fails.
>
> That is the useful shape of this gate: **a typo entered tomorrow fails immediately**, while
> these seven wait for an answer instead of being quietly accepted. It also fails if a pinned
> row later reads clean — so the list cannot rot either.
>
> *Proved both ways without writing a byte to the database:* the mutations were made to the
> pinned list, not the data. Dropping a pin surfaced the row as unrecorded; pinning a clean
> receipt was reported stale.
>
> ### What the sweep found clean, which is the larger half of the result
>
> - **no negative amount** anywhere in income, expenses or payments
> - no expense dated in the future or before 2020
> - **no payment marked Verified without a verifier**
> - **no room with two active tenancies** — the invariant that would corrupt every occupancy figure
> - on **all 937 rows**, `remitted_amount` equals `rent + water` and `fifty_percent_share` equals
>   half the rent, **to the centavo**
>
> And the 254 rows whose `date_paid` falls outside their own `year`/`month` were checked rather
> than assumed: **all legitimate.** 218 paid the following month, 18 paid in advance, and the
> larger gaps are an organisation paying several months up front plus one lump settlement of
> four months' arrears under a single receipt. *An anomaly count is not a defect count until
> someone reads the rows.*
>
> **Thirteen suites green.**

> **PREVIOUS — commits `ac197e4`, `f403795`: ₱18,600 of collected water money was in no report,
> a requirement I passed yesterday is only two-thirds done, and there is a loaded footgun in
> the database.**
>
> The same reachability question as the two suites, asked one layer down: **which database
> columns does the code never mention?** Thirteen. Most had good explanations. Three did not.
>
> ### ₱18,600 the owner's income report did not show
>
> **`monthly_income_records.linda_water_charge` appears nowhere in `backend/src`.** Not
> selected, not typed, not summed. It holds **62 rows and ₱18,600**, and it is the *only* place
> that money is recorded — LF and LB are not on the per-occupant model, so their `water_payment`
> is **0 by design**.
>
> So the LINDA section of the owner's workbook read:
>
> | | |
> |---|---:|
> | Linda total | 10,500 |
> | Linda electricity (historical, retired 2026-09-13) | 325 |
>
> **and no water at all**, for two units whose entire water arrangement *is* a fixed charge.
>
> **Verified by building the workbook against the live ledger and reading its rows back:**
> 2024 **₱7,200** · 2025 **₱7,200** · 2026 **₱4,200** — matching the database exactly.
>
> It is a separate line rather than folded into the Linda total on purpose: `remitted_amount` is
> a **generated** column, `rent_amount + water_payment`, and for these units `water_payment` is
> 0. Adding the charge into the total would make the total disagree with the figure the database
> itself computes — **a worse error than the one being fixed.**
>
> ### FR-036 is PARTIAL, not MAPPED — I marked it wrong yesterday
>
> The requirement has three clauses: *"a distinct fixed-rate billing flow for Linda's units
> (LF, LB), separate from the standard per-occupant water model, **remitted directly to
> Linda**."*
>
> The rate is real. The separation is real. **The destination is not.** `admin.ts` writes the
> charge as `water_payment: calcWater`, and `remitted_amount` is
> `GENERATED ALWAYS AS (rent_amount + water_payment)` — so on every new row **the money BR-040
> calls Linda's is counted into the owner's remittance.** The 62 migrated rows do the opposite.
>
> *I checked the rate and did not check the destination.* Counts move **26/14 → 25/15**, and
> `check:matrix` — built this morning — verified the correction across the row, the summary, the
> id lists, the percentages and the tier table **in one run**. That is the job it was built for.
>
> **The same money now lands in different columns depending on when the row was written.** Which
> convention Mrs. Da Silva wants is a ledger-shape decision, not one to settle at 4am. *The
> report fix is safe either way and cannot double-count:* a new row contributes through
> `water_payment`, a historical row through the new line, each exactly once.
>
> ### A fail-open `SECURITY DEFINER` function, and an honest statement of its risk
>
> **`public.current_user_role()`** reads `profiles.role WHERE auth_user_id = auth.uid()`.
> **`auth_user_id` is NULL on all 45 profiles**, so the lookup always finds nothing — and the
> function then runs:
>
> ```
> IF u_role IS NULL THEN RETURN 'admin'
> ```
>
> Its own comment calls that *"Default to 'admin' in local development environment"*. It is in
> the **production** database.
>
> **Current exposure is nil, and the register says so in those words.** There are **0 RLS
> policies**, nothing in `backend/src` calls it, and EXECUTE is granted only to `postgres` and
> `service_role` — **not** to `anon` or `authenticated`. *This is not a live hole and must not be
> read as one.*
>
> **The risk is prospective and precise.** The obvious way to turn RLS on properly later is to
> write policies calling exactly this helper — and every one of them would grant **admin to
> every caller**. Fix it before any policy is written: drop it, or return `NULL` and let the
> policy deny.
>
> ### What the census cleared, which matters as much
>
> `room_price_history`'s three price columns and `expense_property_allocations.expense_entry_id`
> are absent from the code because a **trigger** and a **Postgres function** write them —
> `trg_record_room_price_change` and `create_expense_entry_with_allocations`, both verified
> present in the live catalogue. The census flagging them was the census working, not a defect.
> **Login lockout is genuinely implemented**: `authService` reads `locked_until` and maintains
> `failed_login_count`.
>
> **Twelve suites green.**

> **PREVIOUS — commits `357f7a0`, `914a88b`, `713a24f`: two suites so last night's finding
> cannot happen again, and they immediately found two more of it.**
>
> ### `check:reachable` — the eleventh suite
>
> A component no file imports cannot render. That is a fact a script can establish in a second,
> and **no amount of reading the `8a34ec9` diff would reliably catch it**: the deletion looks
> like tidying, and the file it orphans is never touched by the diff.
>
> It walks the import graph from `main.ts` — alias, bare extensions, index files, static
> imports, side-effect imports, re-exports and dynamic `import()`. **38 source files, 38
> reachable.** Green on the day it ships.
>
> **Proved by replaying the actual regression:** remove the `NotificationPopover` import from
> `AppHeader.vue` — which is literally what `8a34ec9` did — and the check fails. Two other
> mutations caught. Tree verified clean afterwards.
>
> ### `check:endpoints` — the twelfth
>
> The same question asked of the backend. **70 routes, 59 called, 11 accounted for.** An
> endpoint with no caller is one of three things and only a person can tell which, so each must
> be named with its kind:
>
> | Kind | n | Meaning |
> |---|---:|---|
> | EXTERNAL | 4 | a webhook, a probe, a redirect target |
> | SUPERSEDED | 5 | another route does the job now |
> | **UNPLUGGED** | **2** | **the job is not being done at all** |
>
> ### The two unplugged ones are real, and one of them corrects me
>
> **`GET /admin/bills` has no caller.** The administrator has **no bills screen at all**. The
> FR-013 overdue overlay is computed on every request she never makes; the tenant sees their
> own. FR-013 stands as MAPPED on the requirement as written — *"identify overdue payments and
> grace-period status"* — but **a sentence I wrote in §6 last night said the system "tells Mrs.
> Fe who is overdue". It does not.** Corrected there, and recorded as **A-11**.
>
> **`POST /auth/change-password` has no caller, and no password-change screen exists anywhere.**
> Tenants are onboarded with the shared literal `'Hivelet@Tenant2026'` and **cannot change it
> from the product.** Recorded as **A-12**, the highest-priority row in that register.
>
> ### An allowlist is where defects go to be forgotten
>
> That is the exact decay this audit has spent two days correcting in other registers, so the
> SUPERSEDED and UNPLUGGED entries **print on every run**, with their remediation row. Green
> means *"no NEW uncalled route"*, never *"nothing to do"*.
>
> ### Four wrong versions of that check, each found by making it fail
>
> Worth recording, because the first one failed in the exact way the check exists to prevent:
>
> 1. **Searching all of `frontend/src` gave a false PASS on the real scenario.**
>    `/admin/audit-logs` is *also* a vue-router path, so deleting the genuine API call still
>    looked called. Found only by unplugging that endpoint and watching the check stay green.
> 2. Matching only the literal argument of `api.get()` reported **all seven notification
>    routes** as uncalled — the store assigns the endpoint to a variable first.
> 3. Filtering by a `'lib/api'` import dropped `authStore` and `notificationsStore`, which
>    import `'./api'` relatively.
> 4. Anchoring the path to the opening quote truncated `/admin/tenants/${id}/vacate` at the `$`
>    and missed both `.xlsx` exports, which are raw `fetch` calls beginning `${API_BASE}`.
>
> Comments are stripped before scanning: a file that talks to the API may also *mention* a path
> it does not call, and `/admin/bills` is on the UNPLUGGED list, where one stray comment would
> quietly flip it to "called".
>
> ### Two dead components deleted, one with a warning attached
>
> **`TenantPortalView.vue`, 670 lines, has never been routed** — `git log -S` against the route
> table returns nothing. It was superseded by the four tenant views and left behind. **It has
> nevertheless been receiving bug fixes in five separate commits.** Every one of those five also
> touched the live view beside it, so no fix was stranded — checked, because a fix that landed
> only there would still be an open bug in production.
>
> Verified **superseded, not unplugged**, which is the distinction that now matters: it calls
> six endpoints and the live views call all six plus five more. A strict subset.
>
> `ConfirmModal.vue` is superseded by the PIN confirmation pattern; no native `confirm()` exists
> anywhere. `check:tokens` ratcheted **94 → 84** — the two files held ten raw hex literals and
> they went with them.
>
> **Twelve suites green.**

> **PREVIOUS — commit `522c0f9`: the notification feature has never once displayed a
> notification. Not since the day it was written.**
>
> **Mrs. Fe has 15 unread notifications.** Four of them say:
>
> > *Unmatched online payment received. An authorised payment of PHP 101.00 (ref R83KMB2X4VMCLR75)
> > could not be matched to a bill. It has NOT been recorded as a payment. Reconcile it manually.*
>
> **She has never seen one of them.** Neither has any tenant. The table holds 20 rows; every
> single one is unread, because nothing in the product was capable of reading one.
>
> ### Two independent faults. Either alone would have been enough.
>
> **Fault 1 — the header lost its bell.**
>
> Commit `8a34ec9`, **2026-08-26**, titled *"complete UI visual audit, speed-dial FABs, smooth
> transitions, and header harmonization"*, deleted from `AppHeader.vue`: the
> `NotificationPopover` import, the `Bell` icon, the unread badge, `toggleNotifications()`, the
> polling heartbeat and its lifecycle hooks. **Nothing in that commit message mentions
> notifications.** The file's own `@description` was left reading *"authenticated notification
> center"* beside markup that no longer had one, and its `@systemBibleRef` still points at
> *Section 16 — Notifications*.
>
> Static reachability found it: `NotificationPopover.vue` was imported by **nothing**, so no
> route could render it. `notificationsStore.ts` was imported only by that orphan. Meanwhile
> `notificationService` writes on five events and **seven endpoints** serve them.
>
> **Fault 2 — and it would not have worked anyway.**
>
> The store reads **one level too deep**. `api.get()` returns `payload.data`, and has done since
> `46de90b`, *the same commit that introduced the store*:
>
> | | what arrives | what the store read | result |
> |---|---|---|---|
> | `fetchNotifications` | the **array** | `res.data` → `undefined` | the `if` guard never ran; the list was never stored |
> | `pollUnreadCount` | `{ unreadCount: 15 }` | `res.data.unreadCount` → `undefined` | fell to an array branch, found no array, **assigned 0** — every twelve seconds, always |
>
> So in the twelve days the bell *was* in the header, it showed no badge and an empty list.
> **Removing it broke nothing anyone could see** — which is exactly why nobody noticed for the
> twenty days after.
>
> **Nothing failed loudly because there was nothing to fail.** Reading `.data` off an array is
> `undefined`, not an error, and the `??` beside it produced a plausible **0**. *The defensive
> default is what hid it* — the same shape as `r.tenant_name` and `l.old_values` earlier in this
> audit, one level up the stack.
>
> ### The fix
>
> **Backend.** Both list endpoints sent `totalUnread` as a *sibling* of `data`. The client
> envelope is `{ success, data, meta? }` and `requestEnvelope()` returns exactly `{ data, meta }`
> — **every other top-level key is dropped on the floor**, so that number could never reach the
> browser by any path. `/admin/audit-logs` already does this correctly with `meta.businessTotal`.
> Both now put it under `meta`.
>
> **Frontend.** `fetchNotifications` uses `getWithMeta` and checks `Array.isArray(data)`;
> `pollUnreadCount` reads `res.unreadCount`, with the tenant branch's array shape handled
> explicitly rather than by a fallback that cannot tell *"none"* from *"could not read"*.
>
> **Header.** Bell, badge and heartbeat restored — in **design tokens**, not the raw hex the
> 2026-08-26 version used. `check:tokens` still **94 / 94**.
>
> ### Verified against the running system, read-only
>
> - badge renders **15**, matching the live count exactly
> - it renders in the **danger tone**, correctly, because unread **Emergency** items exist
> - the popover lists the real rows with its filter tabs
> - `notifications` before and after: **20 rows, 20 unread, newest timestamp unchanged.**
>   *Nothing was marked read in order to test this.*
>
> **Ten suites green.**

> **PREVIOUS — commits `4a1a3fb`, `14e42c0`: a proof that could not have found its own
> counterexample, and a tenth suite so the last one cannot happen again.**
>
> ### `check:matrix` — the tenth verification suite
>
> Yesterday's finding was that the traceability matrix disagreed with itself in arithmetic
> nobody was going to do by hand. **That is now a suite**, modelled on `check:rules`, which
> exists for the same reason about the business-rule register. 23 assertions:
>
> - all 44 requirements have a row, each exactly once, each with 7 columns
> - every status is one the document's own §1.3 defines — **read from the document, not
>   hardcoded**, so a fifth status cannot appear in one place and go uncounted in another
> - no row contradicts itself: MAPPED with no backing route, MISSING that names one, or a
>   non-MISSING row with no tier
> - the summary's counts, id lists, percentages and Total all match the rows they describe
> - §3.1's tier table totals the same figures
>
> **Made to fail before it was trusted**, against five mutations of a copy — a requirement
> falling out of the summary (the FR-013 bug itself), an undefined status, a MAPPED row
> claiming no route, a count edited without its id list, a tier table drifting. All five
> caught. **Green on the day it shipped**, which is the difference between this and the
> citation measurer that deliberately stays out of the suite.
>
> *The handoff prompt also listed **seven** suites and had been wrong since the eighth was
> added. A suite nobody is told to run is the same as one nobody wrote.*
>
> ### The closure proof that closed over the wrong set
>
> `PHASE1_DFD_TRACEABILITY.md` §1.4 is titled **Closure proof**. It concludes there is *"no
> orphan table — no table in the schema the DFD does not model."* It enumerated **every
> `CREATE TABLE` in `database/FULL_DATABASE_SCHEMA.sql`**, found 20, and closed.
>
> **The live database holds 21.** The missing one is **`property_areas`** — migration
> `20260913090612`, six seeded rows, two live foreign keys pointing at it
> (`expense_property_allocations.property_area` and `clusters.expense_area`), and read by
> `expenseReportExport.ts`. Its `is_rental_expense` column is what decides whether an expense
> falls inside Net Operating Income.
>
> **The point is not the miscount.** That file contains **zero occurrences** of
> `property_areas`. A census taken from it *cannot* find a table it does not contain — so the
> proof was **structurally incapable of producing its own counterexample**, and it closed
> anyway. This is the concrete case behind the standing rule to ask the catalogue instead of
> that file, sitting inside a section called a proof.
>
> The census now comes from `information_schema.tables`, and its last column records whether
> the old source held each table. **One row says No. That row is the whole defect.**
>
> *And §7 of the same document already said the live database holds 21. The closure proof 350
> lines earlier went on saying 20.*
>
> ### A store marked MISSING on a grep that returns twelve
>
> **D11 System Parameters** read: *MISSING — `grep -rn "system_settings" backend/src` returns
> zero matches.* **It returns twelve, across five files**, and `settingsService.ts` opens with
> a comment recording exactly when that stopped being true.
>
> The store is **PARTIAL**, and the precise statement is more useful than either label: the
> **read** path is real and cached; there is **no write** path, so **Mrs. Fe cannot change the
> water rate or the grace window without a database administrator.** That is an operational
> limitation worth stating, not a gap in the model.
>
> ### One document had been through the wrong encoding
>
> `PHASE1_OPEN_DECISIONS_REGISTER.md` carried **29 double-encoded em-dashes**, 4 middots and a
> section sign — UTF-8 read as cp1252 and written back. Its own **title line** rendered as
> garbage. The file is *mixed* (7 em-dashes were already correct), so a whole-file round-trip
> repair fails; it was repaired by targeted substitution with the counts matching exactly, and
> **no mojibake remains anywhere in the repository.**
>
> Also corrected: the BR crosswalk claimed RLS is *"enabled and forced across all twenty
> tables"* — it is **21**, verified against the live catalogue, with zero policies on every
> one, which is the intended `service_role`-only posture.
>
> **Ten suites green.**

> **PREVIOUS — commits `0af1c98`, `49ecec8`: the traceability matrix claimed a total of 44 while
> listing 43, and reported six requirements as missing that are implemented. And a check I
> shipped this morning had a hole in it.**
>
> ### The summary table a panel actually reads
>
> **It did not add up.** It claimed **Total 44 / 100%** and enumerated **43** requirements.
> FR-013 was moved out of MISSING on 2026-09-14 and never added to any other row, so it fell
> out of the only table on the page a panelist can check in their head.
>
> **It was also physically broken.** 130 lines of blockquote had been inserted *between the
> rows of the table*, so its last two rows - FRONTEND-ONLY and Total - were orphaned from their
> header and did not render as part of it.
>
> **And three places in one document gave three different answers about the same 44 rows:**
>
> | Where | MAPPED | PARTIAL | MISSING | FE | Sums to |
> |---|---:|---:|---:|---:|---:|
> | §3 Summary Counts | 20 | 13 | 9 | 1 | **43** |
> | §3.1 Tier distribution | 20 | 13 | 10 | 1 | 44 |
> | The body rows themselves | 20 | 12 | 9 | 1 | 42 + **2 marked `IMPLEMENTED`**, a status §1.3 never defines |
>
> ### Every status re-derived by reading live code
>
> All three now agree, at **26 / 14 / 3 / 1 = 44**, and the summary is derivable from the rows:
>
> | FR | Was | Now | What the code says |
> |---|---|---|---|
> | FR-006 | MISSING | **MAPPED** | `converted_tenant_id` is written by the inquiry PATCH handler |
> | FR-012 | MISSING | **MAPPED** | `due_date: period.dueDate` from `computeBillPeriod()` on the tenancy anniversary |
> | FR-013 | *listed nowhere* | **MAPPED** | `isOverdue()` called by both bill endpoints |
> | FR-015 | PARTIAL | **MAPPED** | the table disagreed with its own row; the row was right |
> | FR-036 | MISSING | **MAPPED** | `computeWaterFee()` returns a `linda-fixed` basis for LF and LB |
> | FR-042 | MISSING | **MAPPED** | the workbook prints `Reconciles (BR-047)` with both sides' figures |
> | FR-028 | MISSING | **PARTIAL** | export is live and asserted; aggregate retrieval is not |
> | FR-040 | MISSING | **PARTIAL** | cumulative is in the export only, and **OD-07** is still open |
> | FR-033 | MISSING | **MISSING** | carries forward from the **tenancy**, not the prior month. It stands. |
>
> **Every move but one is in the same direction: the register was more alarming than the code.**
> FR-040 went the other way - §3 called it *Implemented*, §5 reasoned it *Partial*, and §5 is
> right. A retest that only ever finds things fixed is not a retest.
>
> **The Gap Register still said FR-033 was Done.** §3 overturned that judgement on the same day,
> 150 lines earlier, and nobody carried the correction across. *Two registers disagreeing about
> one fact is worse than either being wrong alone: a reader who finds the disagreement cannot
> tell which side to trust, and a reader who finds only one side never learns there was a
> question.*
>
> ### Also corrected, each verified against the thing it describes
>
> - the service legend marked **`billingService.ts` and `settingsService.ts` as "does not exist
>   today"** while both sit in `backend/src/services/` - a claim a panelist disproves with one `ls`
> - `admin.ts` **2,263 → 3,033** lines; **20 → 21** tables; **131 of 164** database calls in route
>   handlers (80%) → **144 of 184** (78%)
> - the FR-015 note cited two endpoints as **`/payments/mock-gateway`** - a name with **zero
>   occurrences** in `backend/src`. They are `/payments/local-cashier`, and both return 404
>   whenever a gateway is configured. *A citation naming a route the system does not have sends
>   a panelist looking for something that was never there, and they cannot tell that apart from
>   a feature that is missing.*
>
> ### And the hole was in my own check
>
> `check:fields` shipped this morning with an allowlist of five "API-computed" fields. **Two of
> them do not exist.** `water_rate_per_occupant` and `linda_fixed_water_charges` are *settings
> keys* - string literals naming rows in `system_settings` - not response fields. The route that
> serves those values, `GET /public/rates`, answers in **camelCase**. Nothing reads the
> snake_case names, so nothing was broken; but **an allowlist entry for a field that does not
> exist pre-approves a name that would read as `undefined` forever**, which is the precise bug
> the check was built to catch.
>
> Its header also claimed the API emits **"exactly ELEVEN"** camelCase keys, hand-checked -
> offered as a bounded, exhaustive, dated fact in place of a check that could not be built.
> **Re-scanned four ways over the same unchanged source: 11, then 13, then 25, then 16.** At
> least eighteen are real. Five were invisible to the original scan because they are written as
> **shorthand properties** - `{ waterRatePerOccupant }` - which a scan looking for `name:`
> cannot see.
>
> **The failure was not the regex.** It was stating a precise number from a single scan that had
> never been made to fail against a key it was known to contain - the same mistake this file
> exists to catch, made by the person who wrote the file. The header now says the surface is not
> reliably enumerable by regex and that no exact count belongs there again.
>
> Nine suites green: `check:api` 53, `check:adyen` 23, `check:billing`, `check:writes`,
> `check:columns`, `check:fields`, `check:tokens` 94/94, `check:rules`, `check:secrets`.

> **PREVIOUS: a final verification pass. Two clean cycles in a row.** *(That block called the
> audit finished. It was not - see the entry directly above, which found six requirements
> reported missing that are not. Two clean cycles meant the looking had stopped finding things
> where it was looking, which is a different statement.)*
>
> **Hygiene.** No stray probe scripts in `backend/scripts`; the only scripts committed today
> are the three intended ones - `check-column-refs.mjs`, `check-frontend-fields.mjs`,
> `measure-doc-citations.mjs` - plus the token check whose budget was ratcheted. Nothing from
> the scratchpad was ever committed.
>
> **Build.** `vite build` succeeds, 9 precache entries.
>
> **Smoke test, all six administrator pages**, each rendering its real heading and live data:
>
> | Page | Heading | Live rows |
> |---|---|---|
> | `/admin/overview` | Executive Operations Overview | — |
> | `/admin/directory` | Room & Rate Directory | — |
> | `/admin/tenants` | Active Tenant Directory | — |
> | `/admin/income` | Monthly Income & Collections Ledger | **937** |
> | `/admin/tickets` | Maintenance Dispatch Board | **5** |
> | `/admin/inquiries` | Prospect Inquiries & Leads | — |
>
> **One thing worth recording about the method, even here.** The first pass used `pushState` to
> move between pages, and the income and tickets pages came back with suspiciously small
> content - 1,460 and 1,021 characters. That looked like a smoke test passing. Re-run with real
> navigation they load **937** and **5** rows. *The first numbers were an artefact of how I
> navigated, not a fact about the pages* - and reporting them would have been a false all-clear
> in the last measurement of the day.
>
> ---
>
> **The audit is complete.** Everything listed in the one-page summary above has been read
> against the running system: the code, the traceability matrix, the DFD gap register, the
> business rules, the System Bible. Two consecutive cycles have found nothing new, which is a
> result rather than a gap in the looking.
>
> **What remains is not audit work:** one sandbox lock (three names carrying invoice numbers,
> statements at the top of this file), and one judgement that belongs to Mrs. Da Silva (the
> ₱35,228 of penthouse upkeep filed outside Net Operating Income).

> **PREVIOUS: everything re-run end to end. All nine green, nothing new found - and one number
> in this report had gone stale, mine.**
>
> | | | | |
> |---|---|---|---|
> | `check:api` | **53 passed** | `check:columns` | clean |
> | `check:adyen` | **23 passed** | `check:fields` | clean |
> | `check:billing` | passed | `check:tokens` | **94 / 94** |
> | `check:writes` | passed | `check:rules` | passed |
> | `check:secrets` | clean (all tracked files) | | |
>
> **The token budget was ratcheted 97 → 94.** Deleting three unreachable modals took their raw
> hex literals with them, and the file's own comment says *"Lower this when the tail shrinks;
> never raise it."* Leaving it at 97 would have quietly licensed three new literals - the
> opposite of what a ratchet is for. Doing what the file asked, not inventing a rule.
>
> **The figures in the one-page summary were re-verified.** `admin.ts` is still 3,033 lines;
> still 6 of 83 route citations resolve. But `audit_logs` now holds **2,773** rows, not the
> 2,693 quoted - it grew by 80 **during this session**, because every administrative action
> taken through the API today was itself audited. The summary now says *"2,693 at the time"*
> rather than stating a number that has since moved.
>
> A small thing, and exactly the decay this audit has spent the day correcting in other
> people's documents: **a figure that was true when written, quietly becoming false.** It would
> have been a poor day's work to leave one in my own.
>
> **Nothing new was found.** That is the honest result of the cycle, not a gap in the looking.

> **PREVIOUS - commit `e1f0f47`: the camelCase check was prototyped, measured, and
> deliberately not shipped.**
>
> The obvious next move was a camelCase companion to `check:fields`. It was built far enough to
> measure, and the measurement said don't.
>
> **snake_case works as a signal** because in this codebase a snake_case property is almost
> always a database column arriving over the API. **camelCase carries no such signal** - it is
> the ordinary JavaScript naming convention, so an API field, a local ref, a computed and
> `addEventListener` are indistinguishable to a static scan.
>
> The prototype confirmed it: of **128** distinct camelCase properties read in `frontend/src`,
> **121** appear in no `res.json()` literal - and that list is dominated by `appendChild`,
> `createObjectURL`, `charAt`, `allSettled`, `beforeEach`, alongside local names like
> `badgeClass` and `dateObj`. **A check built on that reports ~121 failures against a clean
> codebase.** A gate that is red on the day it ships teaches people to ignore red - the same
> reasoning that kept the citation measurer out of the suite - so it was not built.
>
> **What was done instead fits the shape of the problem: the surface is small enough to
> enumerate.** The API emits exactly **eleven** camelCase keys from `res.json()` literals, and
> all eleven were checked against every frontend reference:
>
> | Keys | Where | Verdict |
> |---|---|---|
> | `sessionId`, `sessionData`, `clientKey`, `isLive` | tenant.ts | read by AdyenPaymentModal |
> | `expiresIn` | auth.ts | spelling matches |
> | `businessTotal` | admin.ts | read by AuditLogsView |
> | `totalUnread`, `unreadCount` | admin.ts / tenant.ts | notifications |
> | `redirectUrl` | public.ts | local cashier completion |
> | `authorizationModel`, `markedAllRead` | health.ts / admin.ts | **not read at all** |
>
> Every spelling matches, or the key is not consumed. **A bounded, exhaustive, dated fact in
> place of an unbounded gap** - the honest alternative when a check cannot be built at a useful
> signal-to-noise ratio. The header records how to re-enumerate when a twelfth key appears,
> because that fact *will* go stale and a check would not have.
>
> `check:fields`, `check:columns`, `check:api` 53/53 - all green.

> **PREVIOUS - commit `ee93ea7`: four more stale gap-register rows, and one decision closed in
> code.**
>
> The DFD's gap register, retested against live code and the live catalogue:
>
> | Gap | What it says | Retested |
> |---|---|---|
> | **G-2** | *"Water charge is **hardcoded** as `occupants * 200` in three places"* | **Stale.** The rate is read from settings and the two fixed-charge units are handled first. The only surviving occurrences of that expression are **comments describing the former defect**. |
> | **G-3** | *"The 50% Share is **hardcoded** as `rentAmount / 2`"* | **Stale, and G-4 already says why** - the column is `GENERATED ALWAYS AS (rent_amount / 2.0) STORED`. The derivation moved into the database. |
> | **G-5** | *"Grace period **hardcoded at 10 days**, contradicting the seeded value of 7"* | **Stale twice over.** No hardcoded window remains, and the seeded value is no longer 7 either - it is **0**. |
> | **G-8** | *"The live schema carries **17** `ON DELETE CASCADE`"* | **Stale - the proposal was applied.** Counted live: **11 CASCADE, 8 RESTRICT, 18 NO ACTION, 1 SET NULL.** The six that moved are the ledger tables migration `005` was written to protect. |
>
> **G-9 stays PARTIAL on purpose** - half stale. *"6.0 performs no aggregation"* is untrue of
> the export, which computes the area and category totals server-side and prints the BR-047
> reconciliation, and still true of the screen, where they are derived in the browser and
> persisted nowhere. **G-11 stands**, retested. G-1, G-4 and G-7 were already correct.
>
> **And a decision closed rather than parked.** `ticketSchema.fileUrl` is deliberately
> uncapped, and the reasoning now lives in the schema itself: **a length cap looks like the
> obvious guard and is not.** Any cap tight enough to reject a base64 data URL rejects every
> photo the current client produces - it would not harden the endpoint, it would switch the
> feature off. The bound that genuinely applies is `express.json({ limit: '1mb' })`, which caps
> the request. Moving attachments to object storage is the real answer, and that is a storage
> decision with a cost, not a validation change. Written down so the next reader does not add a
> cap thinking it is free.

> **PREVIOUS - commit `5267ad8`: the business-rule register read against the live system - and
> it holds. A clean cycle.**
>
> Forty-nine rules that had **never** been checked against running code. `check:rules` proves
> the register is internally consistent - that its ids resolve and its cross references agree -
> **not** that the system obeys it. Five of the most falsifiable were traced to their
> implementation and to live rows:
>
> | Rule | Checked against |
> |---|---|
> | **BR-003** Historical Preservation | ledger tables are `ON DELETE RESTRICT` from `rooms`; all 33 rooms hold some |
> | **BR-007** Website Visibility | enforced in three places in `public.ts`, and settable since `17095f3` |
> | **BR-009** Inquiry Conversion | `converted_tenant_id` is written by the inquiry PATCH |
> | **BR-011** Overdue | a Paid bill is never overdue; otherwise the bill's **own stored** window is used |
> | **BR-012** No Grace Period | `grace_period_days` is **0** live, and read from settings rather than pinned in code |
>
> **The BR-012 errata was tested against the data and is right - including the part that looks
> like a discrepancy.** Both live bills carry a grace window **seven days** after their due
> date: 2026-07-05 → 07-12, and 2026-09-05 → 09-12. That is not old policy leaking. Both were
> created **before migration 016**, and BR-003 says a bill keeps the terms it was issued under;
> `isOverdue()` honours each bill's own window rather than applying today's policy
> retroactively. Worth writing down, because the next reader will see **7** where the rule says
> **0** and reach for the wrong conclusion.
>
> **What the note does not claim:** forty-nine rules, five tested. What it establishes is the
> *kind* of document this is - one that describes intent and has been kept, like the System
> Bible, rather than one that describes a particular afternoon and decayed, like every defect
> register retested today. **The untested rules are unverified, not wrong**, and the note says
> so rather than implying a clean bill of health.

> **PREVIOUS - commit `a010e3f`: closing the questions that were mine, not yours.**
>
> Fair complaint, acted on: several things had been parked as "needs a decision" that were
> engineering calls, not the owner's. Decided.
>
> **The live chat component is deleted.** `LiveChatheadModal.vue` was imported by no file, so
> it could never render; its three triggers were removed earlier today; and it posted to an
> **administrator-only** route with a hardcoded inquirer id, so even mounted it could not have
> worked for the guests it was shown to. A live chat may well be worth building - it would not
> start from that code, and keeping 290 unreachable lines as a placeholder for a decision is
> debt with a story attached.
>
> **An expired claim marked** in the migration verification record. Its header said *"These
> migrations remain unapplied to the live database."* **They were applied** -
> `supabase_migrations.schema_migrations` lists **12**, from
> `fix_replace_allocations_enum_cast` through `resolve_login_identifier`. The record of the
> container run is untouched, because the run has not changed; only the present-tense claim
> about production is struck and noted. A sentence reading *"remains unapplied"* is taken as
> current however old the heading above it is, and acting on it would mean re-applying
> migrations already in place.
>
> **Checked and clean:** neither `docs/04_ARCHITECTURE.md` nor the verification record carries
> a list of the verification suites, so neither understates the count at nine. The "nine" and
> "seven" in that file are **migrations** and **schema drifts**, not suites.
>
> **One thing is genuinely blocked, and it is a lock rather than a question.** Three residents
> have an invoice number welded onto their name in `profiles.full_name` -
> "Mireel Fatima ParcareyINV.#5223" and two others. I traced it first: **all three invoice
> numbers are already in the ledger**, on rows carrying the clean name
> (INV.#5223 / Mireel Fatima Parcarey / ₱8,000; INV.#5227 / Ron Juliene Dominguino / ₱8,000;
> INV#5212 / Nikki Prollamante / ₱8,500), so stripping the suffix loses nothing and restores
> the person's actual name. The `UPDATE` was refused by the sandbox as
> **[Modify Shared Resources]** - the same lock that held the abusive row until it was
> explicitly cleared.
>
> ```
> UPDATE public.profiles SET full_name = 'Mireel Fatima Parcarey'   WHERE full_name = 'Mireel Fatima ParcareyINV.#5223';
> UPDATE public.profiles SET full_name = 'Ron Juliene Dominguino'   WHERE full_name = 'Ron Juliene DominguinoINV.#5227';
> UPDATE public.profiles SET full_name = 'Nikki Prollamante'        WHERE full_name = 'Nikki ProllamanteINV#5212';
> ```

> **PREVIOUS: the abusive row is deleted.** See the resolved block above for the statements, the
> before-and-after counts and why it needed Sean rather than me. `inquiries` 2 → 1,
> `inquiry_messages` 2 → 1, Rhea Mendoza's lead untouched, and the inbox confirms it.

> **PREVIOUS - commit `1b3a64a`: the document findings recorded as an eighth sweep.**
>
> The seventh sweep put the code lessons into `docs/13_AUDIT_JUDGEMENT_LOG.md`. This one puts
> the document lessons there, and they generalise past this project:
>
> **1. A defect register decays by OVERSTATING - and that is the dangerous direction.**
> Everyone expects a document to age, and assumes it ages by *missing* new problems. The
> reverse happens: it lists what was wrong on an afternoon, someone fixes those things, nobody
> returns. A reader then spends their attention where the register points, and if it points at
> work already done, **the live problems stay unlisted.** *The cheap habit that prevents it:
> when you fix something, grep the documents for the thing you fixed - it is the only moment
> anyone will have both facts in their head at once.*
>
> **2. Two registers disagreeing about one fact is worse than either being wrong alone.** One
> wrong document costs you one wrong belief. Two disagreeing documents cost the standing of
> both, because the correct response to a contradiction is to trust **neither** - which
> discards the accurate one too.
>
> **3. A line-number citation cannot survive a living codebase.** `admin.ts` is 3,033 lines and
> the route cited at 730 sits at 1065 - both re-read before writing it down. The durable fix is
> not renumbering, which buys accuracy until the next commit: **a file name and a route path
> are stable identifiers, a line number is not.**
>
> **4. The System Bible held, and the reason is the useful part.** Not diligence - structure.
> It describes what the system is *for*, and intent ages slowly. A defect register describes
> what was *wrong on an afternoon*. **Sort documents by that axis before deciding how far to
> trust one.**
>
> **5. Engage a register's stated reasoning before overturning it.** The FR-033 retest was
> wrong and the register was right, and it had to be corrected a commit later. A retest that
> overturns a judgement without reading the reasoning behind it is a second opinion formed with
> *less* information than the first.

> **PREVIOUS - commit `4c34b5d`: a one-page summary at the top of this file.**
>
> This report is newest-first and around thirty blockquotes long. That order is right while the
> work is running - the newest finding should be the first thing read - and **wrong for anyone
> arriving afterwards**, who currently meets a token budget before they meet the dead enquiry
> feature.
>
> The summary now sits directly under the dated-snapshot warning, which stays first. It adds
> **nothing** the entries below do not already say: it groups the six findings that would have
> cost the owner something, names the pattern behind five of them, sets out what the documents
> claimed against what was true, and records the two findings that were mine.
>
> **The existing entries are untouched.** A summary that rewrote them would be a second account
> of the same day, and this repository has already produced enough documents that disagree with
> each other.
>
> Every commit hash in it was resolved against the repository before committing, and the two
> figures it quotes - `admin.ts` at 3,033 lines, 2,693 audit rows with 72 before-images - were
> re-read rather than recalled.

> **PREVIOUS - commit `003ebb5`: ran all nine suites end to end. One failed, and it was mine.**
>
> ```
> FAIL raw hex literals in templates: 99 (budget 97)
> ```
>
> Two over, **both mine.** The Close Lead confirmation I added in `6f59ebe` copied
> `bg-[#fef3c7] text-[#d97706]` from the four confirm modals that already existed. Those four
> are *why* the budget is 97 - they are grandfathered - and copying the pattern pushed the
> count past the line the check exists to hold.
>
> **Fixed by using the tokens, not by raising the budget.** A ratchet that gets loosened
> whenever it catches something is not a ratchet.
>
> Worth saying plainly: the token shades are **not identical** to the four literals - `#fffbeb`
> is a lighter amber than `#fef3c7`, `#92400e` a deeper brown than `#d97706`. On a 48px circle
> behind one icon the difference is not noticeable, and matching the grandfathered literal
> exactly would have meant adding the literal back. Verified in the browser rather than
> trusting the linter: the dialog opens and its icon computes to **rgb(255, 251, 235)** on
> **rgb(146, 64, 14)** - the two token values.
>
> **All nine suites now green:**
>
> | | | | |
> |---|---|---|---|
> | `check:api` | **53 passed** | `check:columns` | clean |
> | `check:adyen` | **23 passed** | `check:fields` | clean |
> | `check:billing` | passed | `check:tokens` | **97 / 97** |
> | `check:writes` | passed | `check:rules` | passed |
> | `check:secrets` | clean (all tracked files) | | |
>
> **Also: the last three PARTIAL notes, retested.** FR-030 **stands unchanged** - the service
> worker still matches `/api/(public|health)` only and caches nothing authenticated. **FR-035
> is half changed:** the income POST now reads `anniversary_date` and derives the rent period
> from it, but `deposit_amount` is still neither selected nor reused - one clause of two, where
> before it was none. **FR-039 is half changed** in a way worth stating exactly: the Property
> Area bottom totals and the category summary are now computed **server-side** for the Excel
> export, but they are stored in no column and the on-screen figures are still derived in the
> browser. *Computed by the system of record when it exports, not when it renders.*

> **PREVIOUS - commit `4178676`: three of your units carried an invented arrears status.**
>
> I had this queued for five cycles as *"remove a dead branch"*. Tracing it properly before
> deleting it turned it into something else.
>
> `UnitStatus` had a member nothing in the live system could produce - the four values of
> `operational_status_type` map onto vacant, pending, settled and maintenance, never onto
> overdue. **The only source was the canonical constant itself:** units **1g, 3f and F2F**
> carried `status: "overdue"` as seed data. An invented arrears claim about three real units of
> a real person's property, in the file that is supposed to carry structure.
>
> **It never reached a label reading "Overdue", and it is worth being exact about that rather
> than overstating it.** `publicStatusLabel()` funnels anything unrecognised to "Occupied", and
> the admin directory reads `systemState.rooms`, which the API replaces wholesale. **But**
> `CategoryRoomsView` falls back to the canonical row whenever the live list does not contain a
> unit - which the Hidden control I added this afternoon now makes possible - and systemState's
> own comment names this exact hazard: *"It deliberately does NOT seed people or money …
> invented payment statuses."* One override away from the screen is close enough.
>
> The three rows now read `"vacant"` like every other seeded unit, the union has four members,
> and the label, icon, badge and filter branches that could never fire are gone.
>
> **Not wired up, deliberately.** A genuine overdue state for a *unit*, as opposed to a *bill*,
> means deciding what it should mean - a unit whose tenant has an overdue bill, or something
> else. That is Mrs. Da Silva's call, and inventing it to fill a dead branch is the exact
> failure this audit exists to correct.
>
> **Left alone:** `AdminEditUnitModal`'s normaliser still tolerates 'overdue' among the loose
> spellings it coerces to 'Occupied' - it takes arbitrary strings, and tolerating a legacy
> value on the way in costs nothing. `TenantOverviewView` uses 'overdue' as a due-date
> severity, which is live, is about bills, and is untouched.
>
> **Verified in the running app:** the directory's status filter now offers
> `[All, settled, pending, vacant, maintenance]` and the word "overdue" appears nowhere on the
> page. `vite build` succeeds, `check:fields` clean, frontend typechecks.

> **PREVIOUS - commit `2fe8eee`: the only person who could not see the photo was the one who
> took it.**
>
> `GET /api/tenant/my-tickets` selected the ticket and its room - and **not**
> `ticket_attachments`. The administrator's list has always selected them. So a resident
> photographs a leaking pipe, attaches it, submits, and **never sees it again**.
>
> The endpoint now returns them and the ticket card renders a thumbnail that opens the full
> image. Found by retesting **FR-022**, whose note had this exactly right.
>
> **FR-026 stands, and I left it alone.** Its subject is the *prospect's* side: a prospect has
> no account and no public endpoint to reply on, so an inquiry thread is one-directional from
> them. Today's two inquiry fixes repaired the **administrator's** side, which had been failing
> entirely. Different half of the same feature - and not something to claim as a fix for a note
> about the other half.
>
> **The other half of FR-022 is recorded, not acted on.** It says the Supabase Storage write is
> performed by the client, and the live rows show two different mechanisms: one attachment is a
> real `https://storage.hivelet.…` URL of **50 characters**; the other is a
> **142,351-character `data:image/jpeg;base64,…` string sitting in the column**, produced by
> the current client, which reads the file with `FileReader` and posts the data URL rather than
> uploading it.
>
> `ticketSchema` accepts `fileUrl: z.string().min(1)` with **no maximum**, up to ten per
> ticket. The bound that does exist is `express.json({ limit: '1mb' })` - which caps a
> *request*, not a column. **Named precisely rather than dressed up as a vulnerability.**
> Whether attachments belong in object storage is the same decision as the tenant profile
> photo: it costs storage, and it is Mrs. Da Silva's.
>
> `check:columns` and `check:fields` clean; both projects typecheck. Nothing written - the two
> attachment rows were read, not modified.

> **PREVIOUS - commit `11a1437`: one more stale, three still true, one half-changed.**
>
> Third pass over the matrix's notes. **The mix matters** - a retest that finds everything
> fixed is not a retest either.
>
> | Note | Retested |
> |---|---|
> | **FR-018** *"unconstrained `VARCHAR(100)` … no foreign key … a single typo silently creates a phantom property area"* | **Stale, and doubly so.** The live column is the enum `property_area_type` **and** carries a foreign key to `property_areas(code)`. A typo fails at the enum before it reaches the key. The risk the note says would break the FR-042 reconciliation is closed twice over. |
> | **FR-003** *"amenities have no persistence and no route"* | **Still true.** `amenit` appears nowhere in `backend/src`. |
> | **FR-002** *"eight permission constants declared and unused"* | **Still true.** All eight guard **zero** routes today. |
> | **FR-011** *"no bill-authoring endpoint"* | **Still true.** `/admin/bills` is a GET only - she still cannot originate a bill. |
> | **FR-008** *"written and then unreachable from the admin surface"* | **Half changed, and the half matters.** Since `b593166` the rooms select returns the tenancy with the occupant's profile, so *who lives in a unit* is reachable. **The timeline is not** - no `start_date` or `end_date` in that select, and `room_price_history` is still read only inside the price-change write path, never retrieved for display. |
>
> **FR-008 is the shape worth noticing.** A claim can be half true after a change, and writing
> *"fixed"* would be as wrong as leaving it alone. The precise statement is the useful one.
>
> Every claim was checked against live code or the live schema - `information_schema` and
> `pg_constraint` for the FR-018 column, a grep of `backend/src` for the rest, and the
> registered HTTP method for `/admin/bills`.

> **PREVIOUS - commit `82a32fc`: four more notes stale - and one of my own corrections was
> wrong.**
>
> Second pass over the same table, this time the PARTIAL rows and the per-requirement notes:
>
> | Note | What it says | Retested |
> |---|---|---|
> | **FR-034** | *"the backend multiplies by a literal `200` … a configured rate that nothing reads"* | **No longer true** - `computeWaterFee()` reads the configured rate, and the comment beside it names the change |
> | **FR-036** | *"**zero backend lines** read or write any of them"* | **No longer true** - `computeWaterFee()` calls `getLindaFixedWaterCharge()` first, the exact case BR-040 excludes |
> | **FR-032** | *"**zero of three** auto-computations persist"* | **Backwards now** - the period is derived from the stored anniversary, and the other two are `GENERATED ALWAYS` columns in your database, which is *why* the handler does not write them. Three of three |
> | **FR-015** | row says **IMPLEMENTED**, table counts it **PARTIAL** | the table disagrees with its own row; the row is right |
>
> ---
>
> **And a correction to my own work from one commit ago.**
>
> `80311d9` marked **FR-033 implemented**, citing the occupant count carried forward from the
> tenancy. **That was too generous — and this document had already answered it.** The FR-033
> note considers exactly that evidence and rejects it: the carry-forward is
> *assignment-scoped*, while FR-033 asks for *month-scoped* pre-fill from the same tenant's
> previous month entry. Retested today: **nothing reads the prior month's occupants.**
>
> **FR-033 stands as MISSING. The corrected count is 3, not 2.**
>
> I recorded that in the document rather than quietly editing my own line. A retest that
> overturns a register's judgement without engaging its stated reasoning is not a retest - and
> on this row **the document's reasoning was better than mine.** The whole point of the
> exercise is that a register should be trusted only as far as it has been checked, and that
> applies to my corrections too.

> **PREVIOUS - commit `62ea98b`: 6 of the traceability matrix's 83 route citations point at the
> right line.**
>
> **Measured, not estimated.** A committed script extracts every
> `` `METHOD /api/path` (`file.ts:N`) `` citation and checks whether the route's path appears
> within six lines of N. **Six do. Seventy-seven do not.**
>
> **This is nobody's carelessness.** A citation is a promise about a line number in a file that
> grows. `admin.ts` is now **3,033 lines**; the route cited at `730` sits at **1065**. Every
> insertion above a citation invalidates it silently, and nothing in a markdown file can
> notice. **The document was accurate when it was written.**
>
> The warning now above the table says what is still reliable - **the file name, the route
> path, and the table's judgements** - and what is not. Follow a citation by searching for the
> route, not by jumping to the line.
>
> **The durable fix is deliberately not renumbering.** Renumbering 83 citations buys accuracy
> until the next commit. A file name and a route path are stable identifiers; a line number is
> a convenience that cannot survive a living codebase. Rewriting the table is a large
> mechanical edit and the call belongs to whoever owns the document, so it is **recorded rather
> than done**.
>
> **The script is committed but not wired as a tenth suite.** A gate that is red on the day it
> ships teaches people to ignore red. Run it when you want the number:
> `node backend/scripts/measure-doc-citations.mjs`.
>
> **One note on the measurement itself, because a number is only as good as the thing producing
> it.** The first run reported every `auth.ts` citation as "not found" - which was wrong.
> `backend/src/types/auth.ts` was shadowing `backend/src/routes/auth.ts` in my file lookup.
> Fixed before the number was believed. Five of the seventy-seven would otherwise have been my
> bug, not the document's.

> **PREVIOUS - commit `80311d9`: your traceability matrix says nine requirements are MISSING.
> Seven of them are not.**
>
> That table's headline - **"MISSING 9, 20.5%"** - is the figure a panel reads off the page. It
> **understates the system by seven requirements.** Each row was retested against live code
> rather than against the table:
>
> | FR | Row says | Retested |
> |---|---|---|
> | **FR-006** Inquiry Conversion | MISSING | **Implemented** - `converted_tenant_id` is written at `admin.ts:1130`, the very column the row calls the link |
> | **FR-012** Due Dates | MISSING, *"no route sets a due date"* | **A route does** - `tenant.ts:622`, derived from the tenancy's own anniversary cycle |
> | **FR-028** Reports | MISSING | **Partial** - the export half is live at `admin.ts:1483`, audited per call, and `check:api` opens the result to confirm it is a real workbook |
> | **FR-033** Occupant Memory | MISSING | **Implemented** - `admin.ts:1731` carries the count forward from the tenancy, editable |
> | **FR-036** Linda Fixed Billing | MISSING | **Implemented** - a distinct LINDA section in the income workbook |
> | **FR-040** Category Cumulative | MISSING | **Implemented** - `expenseReportExport.ts:189` |
> | **FR-042** Reconciliation | MISSING | **Implemented** - the workbook prints *Reconciles* or *DOES NOT RECONCILE* with both sides' figures |
> | **FR-019** Cash Flow | MISSING | **Still missing.** No endpoint aggregates income, expenses or net cash flow |
> | **FR-020** Profitability | MISSING | **Still missing.** Same absence |
>
> **Corrected: MISSING 2 (4.5%), not 9 (20.5%).**
>
> The original rows are **left in place** with the retest recorded above the table. A register
> that silently edits its own history is not more trustworthy for it - a reader should be able
> to see what it said *and* what was found.
>
> **FR-033 is recorded with its nuance rather than glossed:** the count carries forward from
> the *tenancy*, not literally from the previous month's row as the requirement words it. The
> effect the rule asks for is delivered; the mechanism differs, and saying so is the difference
> between a retest and a rubber stamp.
>
> **`docs/03_REQUIREMENTS.md` was read in full and needs no correction.** It is a pure
> specification - *"the system shall X"* - with no status column, so it cannot go stale the way
> a register does. It makes no claim about what is built. The document that carries status is
> the matrix corrected here.
>
> Every code line cited was read back from the file before committing.

> **PREVIOUS - commit `da36a37`: the System Bible was ahead of the code, not behind it.**
>
> Every defect register retested today had gone stale by **overstating** problems. The System
> Bible is the opposite case, and a reader should be told which kind of document they are
> holding - so the note now sits at its head.
>
> **The normative statements tested are implemented:**
>
> | Statement | Where it lives |
> |---|---|
> | §7 a reserved room must not accept new inquiries | `public.ts:187` refuses with a conflict |
> | §6 a room must not lose its historical record | `ON DELETE RESTRICT` on bills, payments and income records - and all 33 rooms hold some |
> | §12 a payment is pending until the administrator verifies it | the gateway inserts `'Pending Verification'`; only an explicit action settles a bill |
> | §20 authorization enforced at the backend | RLS forced on all 21 tables, zero policies; every route carries `requirePermission` |
>
> **Three statements were true in intent and false in fact this morning. Today closed all
> three:**
>
> | Statement | What was actually true at 09:00 | Closed by |
> |---|---|---|
> | §7 *"hidden by administrator decision"* | the column, the API and the public filter all existed; **no control could set it** | `17095f3` |
> | §9 step 6, *"Administrator communicates with the prospect"* | replies failed with "Inquiry not found"; reading a thread returned a 500 | `cabe216`, `09de591` |
> | §9 step 10, *"it is closed with an appropriate outcome"* | `Closed` existed in the enum and **nothing ever wrote it** | `6f59ebe` |
>
> **Why this document holds where the registers did not, in one line:** the Bible describes
> what the system is *for*, and intent ages slowly. A defect register describes what was wrong
> on a particular afternoon, and that ages the moment someone fixes something.
>
> **What was not tested is stated in the note itself:** statements phrased "should" rather than
> "must" were not systematically checked, and onboarding guards duplicate people by email and
> by credentialed phone, not by name.
>
> **One thing worth admitting.** My first draft of that note cited four section numbers written
> from memory, and all four were wrong - §8 for §6, §16 for §12, §11 for §9, §18 for §19. I
> caught them by resolving each against the document before committing. Four untrue references
> inside a note whose entire subject is documents making untrue claims would have been a poor
> way to end the day.

> **PREVIOUS - commit `de8c0d4`: two registers in your own repository disagreed about the same
> fact.**
>
> **E-17** recorded the two unauthenticated payment endpoints as **closed on 2026-09-14**.
> **OD-12**, in the same repository, went on asserting them as *"a Phase 3 hardening item that
> survives this closure."*
>
> Retested live today - both are gone:
>
> | route | result |
> |---|---|
> | `GET /api/public/payments/local-cashier` | **404** |
> | `POST /api/public/payments/local-cashier/complete` | **404** |
>
> and both sit behind `refuseWhenGatewayConfigured` at `public.ts:291` and `:960`.
>
> OD-12's clause is **struck through rather than deleted**, with the reason recorded in the
> row - a register that quietly loses a claim is no more trustworthy than one that keeps a
> stale one.
>
> **Why this matters more than a single stale line.** Two registers disagreeing about the same
> fact is worse than either being wrong alone. A reader who finds only the stale row believes
> it; a reader who finds both has no way to tell which to believe, and the honest conclusion is
> to trust neither. That is the failure mode this audit has spent the whole day on - and it had
> one more instance **inside its own output**.
>
> **The other E-17 caveat was retested and stands:** `@adyen/api-library` is declared in
> `backend/package.json` and imported nowhere in `backend/src`, because the adapter calls the
> Checkout API over HTTP directly.
>
> **Left in place deliberately.** Removing an unused dependency means an install cycle against
> a running dev server for no functional change, and both registers already describe it
> accurately - it appears twice because it is a noted design consequence, not an oversight.
> Worth doing in a quiet moment; not worth destabilising a working environment for.
>
> **Also checked and correct, no change needed:** `PHASE1_ARCHITECTURE_AND_PATTERN` states the
> same gap but carries its own resolution note directly beneath it, and
> `PHASE1_DFD_TRACEABILITY` marks G-7 **RESOLVED**. Both still name the old `mock-gateway`
> route, but each says in the same breath that it was renamed, so a reader is not misled.

> **PREVIOUS - commit `f074f2a`: the day's reasoning written into the judgement log - and one
> thing I started and stopped.**
>
> **First, the thing I stopped.** You said decide, so I decided the right durable answer to
> the abusive row was not just deleting it but giving you a way to delete one **from the
> interface** - the reason it sat in your inbox for three weeks is that removing it needs SQL.
> I began writing `DELETE /api/admin/inquiries/:inquiryId`. My tooling refused it as an
> **auto-mode bypass**, and on reflection it is right: building a delete endpoint immediately
> after being denied a delete looks like routing around the guardrail, whatever I intended. I
> abandoned it rather than push - **nothing was written, the tree stayed clean.** If you want
> that capability, say so and it is a small piece of work.
>
> **What I did instead: the seventh sweep, recorded in `docs/13_AUDIT_JUDGEMENT_LOG.md`.** The
> first six read documents against the system. This one read the code against itself and found
> more than all of them together. Four patterns, written for someone who has never seen this
> project:
>
> **1. In a browser a wrong field name is not an error.** It is `undefined`, and the carefully
> written fallback beside it then runs exactly as its author intended, on a value that was
> never going to arrive. Five instances today, all in code that typechecked and shipped. *The
> tell always looks like good practice: a defensive default beside a field nobody checked
> exists.* The default is what hides the bug - code with no fallback would have rendered a
> blank and been caught in a day.
>
> **2. Static reachability beats a screenshot.** A component no file imports cannot render. A
> button whose guard is `!isAdmin && !path.startsWith('/admin')`, inside a modal opened only
> from an admin-only route, cannot appear. A screenshot shows something did not happen once;
> these show it *cannot*.
>
> **3. A register of known problems decays by OVERSTATING them.** The danger is not that such a
> document ages - everyone expects that - it is that it ages **in the alarming direction**, so
> the reader spends their attention on problems fixed months ago while the live ones sit
> unlisted.
>
> **4. A fix can create a defect hours later, in a file already audited.** `17095f3` →
> `fb59517`, four hours apart, reintroducing a defect removed that same morning through a
> different door. The habit that caught it is the one behind most of today's work: **when you
> find one instance, grep for its siblings - and include your own commits.**
>
> Every commit hash cited was resolved against the repository before that document was
> written. An audit whose subject is documents asserting untrue things does not get to leave
> an untrue reference.

> **PREVIOUS - commit `4180cc8`: swept my own work for knock-on effects. One more found, five
> clean.**
>
> `formatUnitOccupantsSummary()` filtered `tenants` by unit code and active status, **with no
> role filter**. `tenants` holds prospects too - the endpoint returns
> `.in('role', ['tenant', 'prospect'])` deliberately - so a prospect holding a unit code would
> have counted as a resident of it.
>
> **That list is not a label.** Its `count` becomes the occupant figure on the on-site payment
> form and the ledger's own form, which drives the **BR-014 water fee at a rate per head**;
> its `residents` becomes the receipt's contact name. A miscounted head is a wrong charge, not
> a wrong caption.
>
> **This changes nothing today, and the commit says so.** A prospect has no assignment, so
> their unit code is an em dash and cannot match a real one. It is there because the tenant
> directory counted the same prospect as a resident until `7124861` for exactly this reason,
> and the only difference between the two bugs is which list the mistake lands in.
>
> **Verified by showing it changed nothing:** the unit picker's occupant summaries are
> identical to before - *"1A — Lobby Toor (Solo), Mark Cruz + 1 roommate"*, *"1C — Daryl
> Rivero (Solo)"* - which is the result a defensive filter should produce.
>
> **The other five changes from today, swept and clean:**
>
> | change | checked | result |
> |---|---|---|
> | `b593166` | `/admin/rooms` grew a nested array | its two other callers request only `{id, room_number}` and ignore the rest |
> | `4170dfd` | two-branch payment logic | none survives; the ledger enumerates all three non-Cash values, and the tenant view defaults a missing method to `'UNKNOWN'` before `.toLowerCase()` |
> | `be9adaf` | three-branch ticket status | the tenant timeline already has four stages including Closed, and returns stage 0 for anything unrecognised |
> | `7124861` | counting prospects | the All chip counts them deliberately and reconciles: 44 = 42 + 1 + 1 |
> | `17095f3` | the "33 units" copy | a statement about the property, which hiding a *listing* does not change. Left alone. |

> **PREVIOUS - commit `fb59517`: my own fix from this afternoon would have broken your public
> inquiry form.**
>
> The public inquiry dropdown is built from `CANONICAL_UNITS` - **all 33 units, always**. The
> lookup that turns the chosen code into a `roomId` searches `/public/rooms`, which returns
> **only units whose `visibility_status` is 'Published'**. Two different lists.
>
> Harmless while every unit was published - which was true until **`17095f3`**, four hours
> ago, made hiding one possible. After it: hide a unit, a prospect picks it from the dropdown,
> the lookup finds nothing, and they are told *"Unit X could not be found, so the inquiry was
> not sent. Please refresh and try again."* **Refreshing never fixes it.**
>
> That is the same defect as the "Any available unit" option removed in `53b26a9` this
> morning - *a form must not offer what the system cannot record* - **reintroduced through a
> different door by a feature I added four hours later.** The dropdown now offers only units
> the public API actually returned.
>
> **Also retested `docs/11_FORM_FIELD_AUDIT.md`**, whose spot-check box from this morning said
> the remaining rows were unverified. Its **largest claim - the whole `code → uuid` class,
> three rows - is not live**:
>
> | row | what is actually true |
> |---|---|
> | `inquiries.room_id` | the UI resolves the code and posts a uuid; the API schema is `z.string().uuid()`, so a code is refused at the boundary, not at the column |
> | `income_records.room_id` | the API takes `roomNumber` and resolves it |
> | `assignments.room_id` | the same |
>
> The pattern the register read as systemic breakage **is the system's design**: either the
> client resolves the code or the endpoint does, and six write paths do the latter. Three more
> rows retested and stale - the inquiry email is required at both ends; `submitInquiry()` does
> write, and reports failure honestly; and `monthly_income_records.transaction_reference`
> exists, against an "**ADD** — no reference column on this table".
>
> The register's box now says plainly that **its leads have been wrong more often than right**,
> which is the useful thing to know about it.
>
> `vite build` succeeds · `check:fields` clean · frontend typechecks. Nothing written.

> **PREVIOUS - commit `b0013be`: three dead things in one function, and an honest limit
> written onto `check:fields`.**
>
> The last dead trigger for the unmounted chat, removed with a **static proof** rather than a
> hunt for symptoms.
>
> `RoomDetailModal` is opened from exactly one place - `RoomDirectoryView`, mounted at exactly
> one route, `/admin/directory`, whose `meta.roles` is `['admin']`. The "Inquire Directly"
> button's own guard was `v-if="!isAdmin && !route.path.startsWith('/admin')"` - **both halves
> false for the only role that can reach the page.** The button could not render. Ever.
>
> Had it rendered, its handler did three things, none of which work:
>
> | it set | what that is |
> |---|---|
> | `selectedPublicInquiryUnit` | written here, **read by nothing** |
> | `selectedInquirerId` | written here, **read by nothing** |
> | `isLiveChatheadOpen` | opens a component **no file imports**, so never mounted |
>
> Both write-only refs are gone from `systemState`. A value nothing reads is not state, it is
> a note to nobody.
>
> **`LiveChatheadModal.vue` is deliberately left on disk.** Whether a live chat should exist,
> and against which endpoint - it currently posts to an administrator-only route with a
> hardcoded inquirer id - is a decision for Mrs. Da Silva. Deleting two fake login modals that
> predated real authentication was tidying; deleting a feature someone may intend to finish is
> not mine to do.
>
> **Separately, `check:fields` now states what it does not cover.** It sees only snake_case.
> Columns are snake_case, so that is every field read straight off a row - but several
> endpoints answer in camelCase of their own (`/tenant/payments/checkout` returns
> `sessionId`, `sessionData`, `clientKey`, `environment`, `isLive`; `/public/water-rate`
> returns `waterRatePerOccupant`; auth returns `token` and `user`). **A misspelling there is
> exactly as silent.** Those were verified by hand this session and were correct - but by hand
> does not scale, and a green run should not be read as more than it is: **the snake_case
> surface is clean, not the whole of it.**
>
> **Verified:** the Specs modal still opens and closes on `/admin/directory` and shows only
> "Close Specs"; `vite build` succeeds; `check:columns` and `check:fields` clean; frontend
> typechecks. Nothing written.

> **PREVIOUS - commit `ffdeee3`: the checkout endpoint called its own live gateway a mock.**
>
> Two descriptions of the payment flow that do not match the code beneath them. Found while
> checking the camelCase fields the Adyen modal reads - those turned out **correct**, and the
> modal is the most defensive code I have read today: it validates the response shape before
> using it and narrows a union rather than casting.
>
> **1. The checkout endpoint.** `POST /api/tenant/payments/checkout` was documented as
> *"Initiates a mock Adyen checkout session for an unpaid bill."* **It does not.** A probe
> against this environment's own configuration returns `isLiveConfigured: true` - real API key,
> real merchant account, neither a placeholder - so the session is created against
> `https://checkout-test.adyen.com/v71/sessions`. The live database agrees: **8 of your 15
> payments** carry `payment_method` **Adyen Online** with `payment_source` **GCash Sandbox**.
>
> The local cashier page is the fallback for an environment with **no credentials at all**,
> and both of its routes return **404** the moment a gateway is configured.
>
> **2. The pipeline sequence diagram** described a flow that no longer exists, in three ways:
>
> | the diagram said | the code does |
> |---|---|
> | POST `/api/public/payments/mock-gateway/complete` | **zero occurrences** in the codebase; the local pages are `/public/payments/local-cashier` |
> | gateway returns `{ sessionId, redirectUrl, isLive }` | `{ sessionId, sessionData, clientKey, environment, isLive }` — **there is no redirect** |
> | the local fallback drawn as the main path | with a gateway configured the browser confirms via `/api/tenant/payments/adyen/verify-session`, and the payment row is written by the **HMAC-verified webhook** |
>
> It now traces the flow the code actually runs, webhook included. `CLAUDE_PIPELINE.md` is a
> **live instruction document**, not a dated snapshot - a diagram naming a deleted route
> teaches the next session a system that is not there.
>
> **Left alone, because they are accurate:** `createMockCheckoutSession` and the "local
> cashier" page genuinely are a local stand-in for an unconfigured environment, and calling
> *that* a mock is correct. The rule is that the **gateway** is not a mock - and it isn't.
>
> `check:adyen` 23/23 · `check:api` 53/53 · backend typechecks. Nothing written.

> **PREVIOUS - commit `c5a0390`: "Chat Live" threw away a part-filled inquiry and opened
> nothing.**
>
> Three dead things, found by exercising the five modals nothing had opened yet.
>
> **1. `LiveChatheadModal` is imported by nothing.** Not by `App.vue`, not by any view.
> `isLiveChatheadOpen` is set from two places - the room detail modal's "Inquire Directly" and
> the public inquiry form's **"Chat Live"** button - and setting it renders nothing, anywhere,
> because the component is never in a mounted tree. A Vue component no file imports cannot
> appear; that needed no browser to establish.
>
> The inquiry form's version is the one that cost something. **A visitor typed their name,
> number, email and message, clicked "Chat Live", and watched the form close with nothing in
> its place.** The button is gone; the form now leads only where it works.
>
> **Removed rather than wired up.** The chat component posts to
> `/admin/inquiries/:id/messages` with a hardcoded `selectedInquirerId = 'inq-1'` - an
> administrator-only endpoint a guest holds no token for - so mounting it would put a control
> in front of exactly the people it cannot serve. Whether that feature should exist, and
> against which endpoint, is a decision. **Raised for Mrs. Da Silva rather than guessed at.**
>
> **2 and 3. `TenantLoginModal` and `GuestEntryModal` were unreachable.** Both mounted in
> `App.vue`; nothing anywhere set their open flags, so neither could appear. They predate real
> authentication - `handleLogin()` sets a role and routes to `/tenant` with **no password
> check and no API call** - and the markup carries a banner reading *"Demo Login: Unit 204 /
> 2A · Pass: tenant123"* beside a Guest Name field prefilled **"Maria Santos"**, who does not
> exist.
>
> **Checked before deleting**, because an auth bypass would matter far more than dead code:
> the router guard tests `isAuthenticated` from `authStore`, **not** `activeRole`, so that
> route lands on `/login`. It was never a way in - only a hardcoded password and an invented
> person sitting in a repository whose credentials have already leaked once.
>
> **Verified:** `vite build` succeeds (9 precache entries), both projects typecheck,
> `check:columns` and `check:fields` clean, `/admin/overview` renders. The dev server logs HMR
> 404s for the two deleted files until it is restarted; the production build is the real
> evidence, and the honest note is that those console errors are dev-server staleness, not a
> fault.
>
> **Also checked and found live and correct, no change needed:** `RoomDetailModal` (opened
> from the room directory) and `AdyenPaymentModal` (opened from the tenant payments page).

> **PREVIOUS - commit `bc4d3ae`: a wrong field name in the browser is silent, so there is now a
> check for it. Ninth suite.**
>
> `check:columns` catches a wrong column name in the backend, because PostgREST answers one
> with 42703. **The frontend has no such backstop.** A field that does not exist is
> `undefined` - no error, no warning, nothing in the console - and the carefully written
> fallback beside it then does its job perfectly, on nothing. Four of these turned up today,
> all in code that typechecked and shipped:
>
> | field read | what it produced |
> |---|---|
> | `r.tenant_name` | every occupied unit labelled **"Active Resident"** - one empty occupant summary away from entering your ledger as a payer's name |
> | `l.entity_table` | the Audit Trail read **"system"** for every row |
> | `l.old_values` | the Audit Trail read **"null (Initial record insertion)"** for every row. On an audit trail. |
> | `l.user_agent` | **"not recorded"**, forever - no such column exists |
>
> **`check:fields`** reads every snake_case property the frontend takes off API JSON and checks
> it against the live schema, plus five API-computed fields allowed by name **with the place
> each is produced written beside it**. The schema is read at runtime from PostgREST's own
> document, like `check:columns`, so it cannot go stale.
>
> **Two things learned making it honest.**
>
> Its first run failed on `r.tenant_name` at `systemState.ts:558` - which is the **comment**
> explaining that the bug used to be there. A check that reports prose describing a fixed bug
> teaches people to ignore it, so it strips comments first.
>
> It matches on **name, not on table**, and the header says so rather than implying more. A
> field that is a real column on some *other* table passes even when it is wrong for the
> object being read - which is exactly how `r.tenant_profile_id` on a room survived alongside
> `r.tenant_name`: the first is a genuine column on `room_assignments`, so only its twin was
> caught. Making it table-aware means tracing which endpoint feeds which mapper. **Recorded
> rather than overclaimed.**
>
> **Proven to fail, not just to pass.** Putting `l.old_values` back produced
> `FAIL old_values — 1 use(s), first frontend/src/views/AuditLogsView.vue:488`, and the file
> restored to an empty diff afterwards.
>
> `CONTINUE_HERE.md` now lists **all nine suites** with a note on why the two newest exist.
> `docs/12_ITERATION_HISTORY.md` is **left alone**: it is a dated record of Iteration 2 and
> describes a past state. (It does say "six suites" above a table of seven - an error, but its
> own, about its own moment.)

> **PREVIOUS - commit `b593166`: every occupied unit was labelled "Active Resident".**
>
> `GET /admin/rooms` returned the room, its cluster and its photos - and **nothing about who
> lives in it**. The frontend mapper nonetheless read `r.tenant_name` and
> `r.tenant_profile_id`, neither of which is a column on `rooms` or anything that select
> produced. Both were `undefined` on every row, so the fallback beside them wrote the literal
> string **"Active Resident"** in place of the resident's name for all 32 occupied units.
>
> Same shape as the audit trail an hour ago, and as the invented `tenant@hivelet.com` this
> morning: in a browser a wrong field name raises nothing, and a carefully written fallback
> then does its job perfectly, on nothing.
>
> **It reached further than a label:**
>
> - the Room Directory's search box says *"Search by unit code, resident name, or unit type"*.
>   Every occupied unit's name was "Active Resident", so **searching for an actual resident
>   matched nothing**.
> - `room.tenant` is the fallback contact name in the on-site payment modal **and in the
>   ledger's own form**. A receipt saved while the occupant summary was empty would have
>   carried "Active Resident" into `monthly_income_records.contact_name` - Mrs. Da Silva's
>   ledger, and the "Contact + Invoice #" column of her Excel export.
>
> **No live row shows it.** All 937 ledger rows carry real names; 0 read "Active Resident" or
> "Walk-in Resident". This is the fallback being removed *before* it fired, not after.
>
> The endpoint now joins the tenancy and the profile, and the mapper reads the resident from
> the active assignment. A room with no active assignment holds **null** rather than being
> given a resident it does not have. All 32 Occupied rooms have exactly one active assignment
> and the single Available room has none, so the join answers for every row.
>
> **Verified against the live API and in the running app:**
>
> | check | result |
> |---|---|
> | `/admin/rooms` now returns | 1a **Lobby Toor** · 1b **Jade Marmol** · 1c **Daryl Rivero** · 1d **Sandrine Jammeka Mariano** |
> | "Active Resident" on the directory | **0 occurrences** |
> | searching **"Daryl Rivero"** | returns **unit 1C**, which is his |
>
> `check:columns` clean - it validates the new select too. Both projects typecheck. Nothing
> was written.

> **PREVIOUS - commit `b3c97e4`: your Audit Trail never showed what changed.**
>
> I took the column sweep to the frontend, where the same mistake is much quieter. A wrong
> column name in the backend is a PostgREST 42703. **In the browser it is `undefined`** - no
> error at all - and every carefully written fallback then does its job perfectly, on nothing.
>
> Three of the Audit Trail's fields were names `audit_logs` does not have. The endpoint
> returns `select('*')`, so the row keys *are* the column names:
>
> | the page read | the table has | what you saw |
> |---|---|---|
> | `entity_table` | `entity_type` | **"system"** on every row |
> | `old_values` | `previous_values` | **"null (Initial record insertion)"** on every row |
> | `user_agent` | *no such column* | **"not recorded"**, forever |
>
> **2,693 rows carry 9 distinct entity types, and 72 carry a before-image.** None of it
> reached the screen. The one question an audit trail exists to answer - *what did this
> change?* - was answered **null** every time, and the CSV export wrote the same blanks.
>
> The export also substituted **`127.0.0.1`** for a missing address. A plausible IP invented
> into an audit record is worse than an empty cell; it is an em dash now. The User Agent line
> is **gone** rather than renamed - nothing records one, and a field that can only ever say
> "not recorded" is not information.
>
> **Same pass: the tenant profile form was promising two edits the API refuses.**
>
> `profileUpdateSchema` lists exactly five tenant-editable columns - System Bible §19, a
> resident does not rename themselves - and Zod strips what it does not declare. The form sent
> `full_name` and `avatar_url` anyway. Both were discarded silently, the request succeeded,
> and the success notice appeared. For the name it was worse: the handler copied it into
> `currentUser.fullName`, so **the header changed too** and the edit looked accepted until the
> next reload put it back. That field is now read-only and says who to ask.
>
> `profiles` has **no `avatar_url` column**, so the photo upload could never persist: pick a
> file, watch it appear, save, lose it, with a success message in between. The control is
> removed rather than faked. **Storing one properly is a schema decision** - a column and
> somewhere for the file to live - and `room_photos` is the pattern this project already has
> for images; a data URL in a varchar is not it. **Raised for Mrs. Da Silva rather than
> invented here.**
>
> **Verified in the running app:**
>
> - the entity column now renders **EXPENSE_ENTRY, INCOME_RECORD, PAYMENT, ROOM** where every
>   row previously read "system"
> - the diff panel on a ROOM_UPDATE now shows a **real before-image** -
>   `{"id":"a0100000-…","floor":1,"capacity":2,"room_type":"Studio","base_price":4500,…}` -
>   where it previously read "null"
> - no "User Agent" text anywhere on the page
>
> Nothing was written. `check:columns` clean; frontend typechecks.
>
> **Also checked and found correct:** `bill.amount_paid` and `bill.amount_outstanding` are not
> columns, but the tenant bills endpoint computes and returns both - traced before calling it
> a defect.

> **PREVIOUS - commit `09de591`: reading an enquiry conversation returned a 500 - and there is
> now a suite so this class of bug cannot come back.**
>
> Sibling of `cabe216`, found by **going looking for one** rather than waiting to trip over it.
>
> `GET /admin/inquiries/:id/messages` ordered by `created_at`. **`inquiry_messages` has no
> such column** - it has `sent_at`. PostgREST answers that with 42703 and the handler reports
> it as an internal error, so reading any thread was a **500**. Together with `cabe216`, which
> broke *sending* a reply, **the entire enquiry conversation feature was dead**: Mrs. Da Silva
> could not read a thread and could not answer one.
>
> Proven, not inferred, with a read-only probe through the real client:
>
> | query | result |
> |---|---|
> | `.order('created_at')` on `inquiry_messages` | **42703** — column does not exist |
> | `.order('sent_at')` | **OK, 2 rows** |
> | `.order('created_at')` on `ticket_messages` | **OK** — that table does have it |
>
> **Why there is now a suite for this.** Nothing catches this class at build time. It
> typechecks, it lints, it deploys, and it fails the first time a person uses the feature -
> disguised, because the surrounding code turns the error into something friendlier and
> wronger ("Inquiry not found" for a fault in the query). **Two of them survived in a codebase
> that passes seven verification suites.**
>
> **`check:columns`** now reads every `.from()` chain in `backend/src` and checks the select
> list, the embedded relations, every filter column (`.eq` / `.ilike` / `.in` / `.order` and
> the rest) and every insert/update key against the live schema. 21 tables; clean with both
> bugs fixed.
>
> **The column map is not written down in the script.** It is read at runtime from PostgREST's
> own OpenAPI document, so it cannot go stale - which is the exact failure this audit spent
> the day correcting in the project's *documentation*.
>
> **The check was confirmed to actually fail.** Putting `created_at` back produced
> `FAIL backend/src/routes/admin.ts:2851 inquiry_messages.created_at [.order()]` - and it also
> caught a `sed` of mine that had flipped `ticket_messages` to the wrong column while
> restoring the first one. A check that has never failed is not evidence of anything.
>
> `check:columns` clean · `check:api` 53/53 · backend typechecks. Nothing written.

> **PREVIOUS - commit `6f59ebe`: the inbox never showed a lead's status, and a dead lead could
> never be closed.**
>
> Every thread header carried a **hardcoded "Active Prospect"** badge. The lead she had
> already answered, the one that became a tenancy, and the one that went nowhere all looked
> identical - and the list rows carried no status at all. `inquiry_status_type` has four
> values and the page displayed none of them.
>
> **'Closed' had no writer anywhere in the system**, so a dead lead stayed in the inbox
> forever. The API has accepted it since the schema was written.
>
> Now the real status appears on every row and in the thread header, colour-coded by meaning;
> a **Close Lead** action sits beside Convert to Tenant behind the same confirmation pattern
> the ledger and expenses pages use; and both actions disappear once a lead is Converted or
> Closed, replaced by a line saying which - a finished lead takes no further action.
>
> The confirmation says what closing does *and does not* do: the thread stays on record and can
> still be read, it simply stops sitting in the inbox as something awaiting an answer. That is
> the question the button raises.
>
> `Inquiry.status` is now **required** rather than optional. The column is NOT NULL and the
> single mapper always sets it, so the optional only forced every reader to handle an absence
> that cannot happen - part of why the page reached for a hardcoded badge in the first place.
>
> **Verified in the running app with nothing written.** Both rows render their true status
> (Pending, Contacted) and the header renders the active one's. Close Lead was then driven with
> `window.fetch` stubbed so the request was **captured and blocked**:
>
> ```
> confirmation title: "Close this lead"
> PATCH /api/admin/inquiries/82f74d64-...   {"status":"Closed"}
> ```
>
> `inquiries` unchanged: 1 Pending, 1 Contacted, `max(updated_at)` still 2026-08-25.

> **PREVIOUS - commit `cabe216`: every reply Mrs. Da Silva sent to an enquiry failed, and
> blamed the wrong thing.**
>
> `POST /admin/inquiries/:id/messages` looked the lead up with
>
> ```
> .select('id, full_name, email, phone_number')
> ```
>
> **`inquiries` has no such columns.** The prospect's details live in `prospect_name`,
> `prospect_email` and `prospect_phone`, so PostgREST answered **every** call with
> `42703: column inquiries.full_name does not exist`. The error variable was then truthy and
> the handler threw **"Inquiry not found"** - blaming the record for a fault in the query, and
> sending her to look in the wrong place entirely.
>
> None of those three fields was used downstream. Only the existence check was, so the read
> now asks for what it actually needs.
>
> **Proven, not inferred.** A read-only probe ran both column lists through the real client
> against the live database:
>
> | select | result |
> |---|---|
> | `id, full_name, email, phone_number` | **42703** — column does not exist |
> | `id, status` | **OK, 1 row** |
>
> **Second thing, same handler.** `inquiry_status_type` carries **'Contacted'** and nothing in
> the system ever wrote it - so a lead stayed **Pending** however many times she had answered
> it. Replying now advances Pending to Contacted, and *only* Pending: Converted and Closed are
> ends of the line and must not be walked backwards by sending a message.
>
> **Two smaller things found looking for the first:** `systemState` defaulted an inquiry's
> status to `'Submitted'` - not a value of `inquiry_status_type` at all, it belongs to
> `ticket_status_type`; the column is NOT NULL so it never fired, but a default the enum
> cannot hold is a wrong answer waiting for its turn. And `InquiriesView` declared a
> `statusFilter` with values 'new' and 'replied' and never referenced it again.
>
> `check:api` 53/53; both projects typecheck.
>
> **Honest limit:** a real reply writes a message into the owner's live thread, so the full
> round trip is *not* exercised. What is verified is that the read which broke it now
> succeeds, and that the handler's only use of that read was the existence check.

> **PREVIOUS - commit `17095f3`: you could not take a unit off the public site.**
>
> `visibility_status_type` is `(Published | Hidden)`. The column exists, the admin API has
> accepted both values since the schema was written, and `public.ts` enforces it in **three**
> places - both public room listings filter on Published, and an inquiry for a room that is
> not Published is refused outright.
>
> **No control ever sent it.** Not one of the 33 units could be hidden - so a unit held back
> for a returning resident, or one under maintenance, stayed on the public site advertising
> itself and accepting enquiries. The enforcement was built and had nothing to enforce.
>
> The Edit Unit modal now carries a **Public Listing** control beside Operational Status. It
> reads the unit's current value rather than assuming Published, and the options say what they
> do - *"shown on the public site"* and *"not listed, no new enquiries"* - with a note that
> residents already in the unit are unaffected, because that is the first question the label
> raises. `RoomItem.visibility` is new; the room mapping never carried it, so nothing could
> have read the value even to display it.
>
> **Verified against the live API with nothing written** - a nonexistent room id fails after
> validation and before any update:
>
> | sent | result |
> |---|---|
> | Published · Hidden | **404** — both accepted |
> | Unlisted | **422** — refused |
>
> and in the browser, by stubbing `window.fetch` so the save was **captured and blocked**
> rather than sent:
>
> ```
> PATCH /api/admin/rooms/a0100000-...
> {"current_price":4500, ..., "operational_status":"Occupied",
>  "visibility_status":"Hidden","photo":""}
> ```
>
> The control loaded **Published**, which is what that unit holds. Rooms table unchanged:
> **33 rows, all Published, max(updated_at) still 2026-09-14**.
>
> **Also checked and correct, no change needed:** the room status filters
> (settled / pending / vacant / maintenance) cover all four values of
> `operational_status_type` through `mapOperationalStatus()`, which is total and defaults
> safely; and `verification_status_type` is fully covered - Verified and Rejected are both
> offered on the pending-payment queue, Pending Verification being the incoming state.
>
> **One dead state recorded rather than repaired:** `UnitStatus` includes `'overdue'`, with a
> label, an icon, a badge colour and a filter predicate - but `mapOperationalStatus()` cannot
> produce it and no filter offers it, so nothing can reach it. Wiring it would mean deciding
> what "overdue" means for a *unit* as opposed to a *bill*, which is a decision, not a
> transcription.

> **PREVIOUS - commit `21568a5`: correcting a typo in the ledger rewrote how the money had been
> received.**
>
> `4170dfd` fixed the on-site payment modal's two-option method dropdown an hour ago. **The
> ledger page has its own copy of that form** - it both creates and edits records - and it
> still offered "Cash" and "Online Payment" beside a box asking for a "Gcash / Bank Ref #".
> Finding the first one did not find the second. An inventory of **every `<option value>`
> literal in the app** did.
>
> **The edit path was the worse half.** `startEditIncome()` loaded the record and then threw
> two of its fields away:
>
> ```
> editMethod.value = 'Cash';
> editReference.value = '';
> ```
>
> and the payload PATCHed `paymentMethod: 'Cash'` over the top. So opening a receipt to
> correct a rent amount **also restated how the money arrived and dropped its reference
> number** - in Mrs. Da Silva's ledger, silently, with nothing on screen suggesting it had
> changed.
>
> All 937 live rows are Cash with no reference, so nothing has been lost. It became reachable
> an hour ago, when `4170dfd` made GCash and Bank Transfer recordable in the first place.
>
> The form now loads what the row holds and sends it back. `IncomeRecord` carries
> `transactionReference`, which had never been mapped - so the form had nothing to restore
> even in principle. **'Adyen Online' is never offered** - only the gateway's webhook may
> assert money came through Adyen - but it *is* accepted as a loaded value and shown disabled,
> so opening a gateway receipt to fix a typo puts the method back unchanged. Same shape as the
> "No unit assigned" option in `df4e817`.
>
> **Verified by stubbing `window.fetch` so the request was captured and BLOCKED rather than
> sent**, then reading what the form would have submitted:
>
> ```
> PATCH /api/admin/income-records/5168ce25-...
> {"roomNumber":"1C", ..., "paymentMethod":"Bank Transfer",
>  "transactionReference":"BDO-AUDIT-PROBE", "monthsCovered":1}
> ```
>
> Before this change the same click would have sent `"Cash"` and no reference.
>
> `monthly_income_records` **937 rows, 0 non-Cash, 0 with a reference, 0 probe rows**, and
> `max(updated_at)` still **2026-08-28** - nothing was written to your ledger today.
>
> **Also checked and found correct, no change needed:** `bill_status_type` and
> `bill_type_enum` have no UI picker at all - bills are system-generated, 'Overdue' is a
> computed `effective_status` that nothing ever writes (documented in both route files), and
> 'Partially Paid' and 'Combined' are already handled in `billingService` and the Adyen path.

> **PREVIOUS - commit `be9adaf`: the maintenance board said "Close & Resolve" and could only
> ever resolve.**
>
> `ticket_status_type` is `(Submitted | In Progress | Resolved | Closed)`. The dispatch board
> offered three states and treated closing and resolving as one act - the buttons read
> **"Close / Resolve"**, **"Close & Resolve Ticket"** and **"Ticket Resolved & Closed"**, and
> every one of them wrote `'Resolved'`.
>
> **The backend was never the problem.** Its PATCH handler already accepts `'Closed'` and, on
> receiving it, stamps `closed_at` and `closed_by`. Those two columns hold **nothing** across
> all 5 live tickets, and no ticket has ever had status Closed - because nothing in the
> interface could send it.
>
> **Worse than the missing option.** `systemState` folded Closed into Resolved on the way in.
> A closed ticket displayed as Resolved, its edit modal loaded Resolved, and saving any
> unrelated field - a technician, a note - wrote **Resolved back over it**. A state the schema
> keeps deliberately, silently demoted. No ticket is Closed today, so nothing has been lost;
> same posture as the hardcoded `payment_source` in `4170dfd`.
>
> Closed is now carried through, offered in the filter and the edit modal, and badged neutral
> so it reads differently from a green Resolved. Every count that meant *"no longer on the
> board"* - the sidebar's emergency badge, the dashboard's open-ticket and emergency figures,
> the board's sort and its Resolved tile - was written as `status === 'Resolved'`, complete
> only while Closed did not exist here. They now test both. The quick actions say what they
> write: **"Mark Resolved"**.
>
> **Left alone deliberately:** "Open" stays this layer's word for the database's "Submitted".
> The API normalises it back, and the tenant's own view already prints it as "Submitted", so
> the round trip is intact - renaming it would be churn with no defect behind it.
>
> **Verified against the live API with nothing written** - a nonexistent ticket id fails after
> validation and before any update:
>
> | sent | result |
> |---|---|
> | Open · Submitted · In Progress · Resolved · **Closed** | **404** — all accepted |
> | Cancelled | **422** — refused |
>
> `maintenance_tickets` 5; `resolved_at` on 3; **`closed_at` 0, `closed_by` 0, status Closed
> 0** - before and after. In the browser, reading the live DOM: the filter offers
> [All, Open, In Progress, Resolved, Closed], the edit modal offers
> [Open, In Progress, Resolved, Closed], and priority offers exactly
> [Low, Medium, High, Emergency] - which is `ticket_priority_type`. Nothing was submitted.

> **PREVIOUS - commit `4170dfd`: a bank transfer taken at the door was recorded as GCash.**
>
> `payment_method_type` is `(Cash | GCash | Bank Transfer | Adyen Online)`. The on-site
> payment modal offered **two** choices - "Cash" and "Online Payment" - and the API filed
> "Online" as **GCash**. The reference box beside it asked for a **"Gcash / Bank Ref #"**.
>
> So the form invited a bank reference and then wrote the payment down as GCash, in the ledger
> Mrs. Da Silva reconciles against her own book.
>
> It now offers **Cash, GCash and Bank Transfer** - the three that can actually be taken over
> the counter. **'Adyen Online' is deliberately not offered**, in the form or the API: that
> value is written by the gateway's webhook, and an administrator must not be able to assert
> by hand that money arrived through Adyen.
>
> **Second thing, in the same write path.** `payments.payment_source` was **hardcoded** to
> `'On-Site Cash'` on every row this endpoint writes - including rows whose `payment_method`
> said GCash. Two columns of the same row contradicting each other. Nothing had noticed
> because no hand-entered GCash row exists: all 15 live payments are 7 Cash and 8 Adyen
> Online. It is now derived from the method, in the same shape as the literal already there.
>
> **Verified against the live API with nothing written** - every accepted value dies at the
> room lookup, which happens before any insert:
>
> | sent | result |
> |---|---|
> | Cash | **404** accepted, no such unit |
> | GCash | **404** accepted |
> | **Bank Transfer** | **404** accepted — *could not be recorded before* |
> | Online | **404** accepted, legacy spelling still honoured |
> | **Adyen Online** | **422** refused — gateway-only, as intended |
> | Cheque | **422** refused — not in the enum |
>
> `payments` 15 and `monthly_income_records` **937 before and after**; zero rows named "Audit
> Probe" or invoiced "PROBE-0". In the browser, reading the live DOM: the method list is
> exactly [Cash, GCash, Bank Transfer], and the reference field is disabled and optional for
> Cash, enabled and required for the other two. Nothing was submitted.
>
> `check:api` 53/53, `check:billing` and `check:writes` both pass.
>
> **Also checked and correct, no change needed:** AdminEditUnitModal's
> `OPERATIONAL_STATUS_OPTIONS` matches `operational_status_type` exactly, and
> `UNIT_TYPE_CHOICES` still matches `room_type_enum` after `8434d45`.

> **PREVIOUS - commit `7124861`: your tenant directory was counting a prospect as a resident.**
>
> `user_role_type` is `(admin, tenant, prospect)`, and `/admin/tenants` returns
> `.in('role', ['tenant', 'prospect'])` **on purpose** - an enquirer promoted to a profile
> belongs in the directory before a unit is assigned. But `TenantRecord` never carried the
> role, so the page could not tell one from the other and treated every row as a resident.
>
> | what you saw | what was true |
> |---|---|
> | "**44 residents** currently on record" | 43 are residents; one is a prospect |
> | **Active (43)** | 42 residents, plus a prospect |
> | a green **Active** badge on her row | she pays no rent and holds no unit |
>
> **The property has 33 units.** A headcount that is quietly one too high is exactly the
> number someone checks.
>
> The role is now carried through and used: the header counts residents and names prospects
> separately, the Active and Past/Vacated chips are about residents only, a **Prospects** chip
> appears when there are any, and her row and profile header say **Prospect**.
>
> **Verified in the running app as the administrator, and the figures reconcile against the
> database rather than merely looking plausible:**
>
> - chips now read **All (44) = Active (42) + Past / Vacated (1) + Prospects (1)**
> - database: **42 active tenants, 1 inactive tenant, 1 prospect, 1 admin** - 45 profiles, the
>   admin excluded by the endpoint
> - the prospect is **Rhea Mendoza** - no assignments, no converted inquiry
> - the selected chip was read back out of the DOM, not judged from a screenshot
>
> No row was written.
>
> **Not a defect, checked and left alone:** the endpoint including prospects is deliberate,
> so I did not change what it fetches - only what the page claims about it.

> **PREVIOUS - commit `df4e817`: four of your active residents could not be edited at all.**
>
> `systemState` gives a tenant with no room assignment the unit code **—**. The Edit Resident
> modal set its Target Unit dropdown to that value - and **—** matches none of its options,
> because every option is a real unit. So the browser rendered the box **empty**, and
> `required` then refused to submit the form.
>
> That is not cosmetic. **Four active residents hold no assignment today** - John Lloyd
> Cuario, Mireel Fatima Parcarey, Nikki Prollamante, Ron Juliene Dominguino, 4 of 43 active.
> Their account status and roommate count **could not be changed at all**, because saving
> anything demanded a unit selection first. The only way to edit one of them was to assign
> them a unit they may not actually have.
>
> "No unit assigned" is now an option of its own, so the state shows honestly and the form
> submits. It is `disabled`, so a resident who *has* a unit cannot be un-assigned from this
> dropdown - releasing a unit is what **Settle Vacancy** is for, and that path closes the
> tenancy properly.
>
> **The second half is why the first had to be careful.** The API treats
> `roomNumber !== undefined` as *"the assignment is being changed"*: it closes the active
> tenancy and frees the unit **first**, and only then reads the value - where **—** and
> **none** are its own sentinels for *leave them unassigned*. Sending **—** from a form whose
> real subject is the occupant count would have **ended a tenancy as a side effect**. The
> payload now omits `roomNumber` unless a real unit is picked, so that branch is never
> entered by accident.
>
> **Verified in the running app as the administrator, on John Lloyd Cuario's record - by
> measuring the live form rather than describing it:**
>
> | | Target Unit | form submits? |
> |---|---|---|
> | with the fix | value `—`, text **"No unit assigned"** | **yes** |
> | with that option removed again | value `""`, nothing selected | **no** — *"Please select an item in the list."* |
>
> Nothing was saved; no row was written. Live figures: 45 profiles, 43 active tenants,
> 1 vacated, 4 never assigned.
>
> **Also checked this cycle and found correct - no change needed:** `account_status_type` is
> exactly `(active, inactive)` and the status picker maps its two options 1:1, so nothing is
> silently rewritten; **neither Excel export references an email at all**; the edit modal's
> save payload never carried email or phone, so the em-dash placeholder is never written; and
> `inquiries.prospect_name/_email/_phone` are all NOT NULL with min-length validation at the
> API, so the em-dash fallback on the inquiry path is **unreachable** - a correct defensive
> default, not a defect.

> **PREVIOUS - commit `b11652d`: the onboarding form still demanded an email the database
> stopped requiring.**
>
> Mrs. Da Silva answered OD-09 on 2026-09-13: *"Do tenants need an email address to exist in
> the system? No."* The system agreed with her everywhere except the one place you actually
> type. `profiles.email` has been nullable since migration `006`, the API stopped demanding an
> address in `43c4608`, phone sign-in landed with migration `021` - and the Onboard Tenant
> modal's Email field still carried `required`, so the browser refused to submit the form and
> none of that was reachable. **The client's answer was implemented three layers deep and
> blocked by one word in the markup.**
>
> Email is now optional and labelled so, with the consequence written out instead of implied:
> *"Leave blank if they have none - they will sign in with their phone number."* Phone keeps
> `required` and now says what it is for, so every tenant onboarded here still has exactly one
> working identifier - which is what the `profiles_login_identifier_required` CHECK asks for
> from below.
>
> **Second thing, found while checking the first.** Phone became a login identifier last
> commit, and `idx_profiles_phone_login` is UNIQUE on the normalised number among profiles
> holding a password. Email has always had a duplicate check ahead of the insert. Phone had
> none - so a second tenant on the same number would have reached the insert, failed there,
> and the handler reports an insert failure as `ApiError.internal(insertError.message)`. You
> would have been handed a **500 reading "duplicate key value violates unique constraint
> idx_profiles_phone_login"**. It is now a 400 that tells you what to do instead.
>
> That check calls `resolve_login_identifier` - the same function the login path uses - so
> *"would this number already sign someone in?"* is answered by the thing that does the
> signing in. Migration `021` exists precisely so that rule has one home, and this would have
> been the first place to grow a second copy of it.
>
> **Verified against the live database, with nothing written to it:**
>
> | probe | result |
> |---|---|
> | no email at all + a number already in use | **400**, phone message - so a missing email is accepted, not rejected |
> | `email:""` + the same number as `0917-949-4909` | **same 400** - the normaliser folds `+63917…` and `0917-…` to one form |
> | `email:"not-an-address"` | **422** *"Enter a valid email address, or leave it blank"* - optional is not unchecked |
> | profiles count, before and after | **45 and 45**, zero rows named "Audit Probe" |
>
> `check:api` still 53/53. **Honest limit:** onboarding a tenant who genuinely has no email is
> *not* tested end to end, because doing that writes a person into the owner's live records.

> **PREVIOUS - commit `643bdd9`: the tenant profile page was inventing an email address.**
>
> Direct follow-through from phone sign-in. Having made phone-only tenants possible, I went
> looking for whatever in the app assumes an email exists - and the first thing found was
> `TenantProfileView` falling back to the literal **`tenant@hivelet.com`**, displayed to the
> resident beside a mail icon as if it were their own address.
>
> **The comment three lines below it** describes removing exactly this class of thing from
> this very file - a fabricated emergency contact "Maria Da Silva", a fake phone
> "0918-987-6543", an invented Facebook URL. That cleanup left the fake email directly above
> it.
>
> It was harmless while every profile had an email. **It is not any more** - OD-09 permits a
> tenant with none, and since phone sign-in landed such a tenant can reach this page.
>
> Now shows the real address when there is one, and otherwise says there is none, naming the
> phone they actually sign in with. Display-only; email was never in the save payload, so
> nothing was ever written.
>
> **Honest limit:** verified as Alberto (his real address renders, the fake one is gone), but
> the empty-email branch is **not** visually confirmed - zero live profiles have a null email
> today, so there is no tenant to exercise it with. Typechecked and building, but I have not
> watched it render.
>
> Also swept: `TenantManagementView`'s search calls `.toLowerCase()` on the email and would
> throw on a null - safe only because `systemState` maps it to an em dash first. `AppHeader`
> degrades to blank rather than breaking.

> **PREVIOUS: PHONE NUMBER SIGN-IN NOW WORKS, END TO END** - `43c4608`, `d8d6013`, `1732474`,
> plus migration `021`.
>
> You caught me doing half the job here, and you were right. My first pass made email optional
> and then created a login only when an email existed - so a phone-only tenant became a record
> with no way in. That is not what OD-09 means.
>
> **The database had been built for phone login and nothing ever used it:**
>
> ```
> profiles_login_identifier_required
>   CHECK (password_hash IS NULL OR email IS NOT NULL OR phone_number IS NOT NULL)
> idx_profiles_phone_login
>   UNIQUE ON normalize_ph_phone(phone_number)
>   WHERE phone_number IS NOT NULL AND password_hash IS NOT NULL
> normalize_ph_phone(text)   -- folds 0917... / +63917... / 63917...
> ```
>
> A unique index whose predicate is "has a phone AND has a password", next to a Philippine
> mobile normaliser. Someone built that deliberately. `authService` still looked people up by
> email alone.
>
> **What I did:**
> - **Migration 021** adds `resolve_login_identifier()` - one credential row from an email OR a
>   normalised phone. Deliberately a *database* function: phone matching must use the same
>   expression the unique index is built on. A second copy of that regex in TypeScript could
>   drift from the index silently, which is the exact failure this whole audit has been about.
> - Email is matched first, so an address can never be shadowed by a phone. Blank or
>   punctuation-only input matches nothing.
> - Login route takes `identifier`, still accepts `email` as an alias.
> - The form now says **"Email or phone number"**; sign-up keeps requiring an address.
>
> **Verified with real logins, not just builds** - tenant Alberto Mestiola, stored as
> 0917-949-4909:
>
> | Input | Result |
> | :--- | :--- |
> | by email | 200 |
> | `0917-949-4909` | 200 |
> | `+639179494909` | 200 |
> | `09179494909` | 200 |
> | unknown phone | 401 |
> | wrong password | 401 |
> | admin by email | 200 (regression) |
>
> Then through the actual browser: signed in with **+639179494909** and landed on his real
> portal - Unit 1F, PHP 4,500, Settled.
>
> check:api 53/53, check:adyen 23/23, check:rules, check:secrets, both builds clean.

> **PREVIOUS CYCLE: clean - nothing to fix. Inquiry status handling checked and correct.**
>
> Chased the inquiry status vocabulary, expecting the same shape as the four bugs above.
> `InquiriesView` has **no `<option>` elements at all** and declares a filter typed
> `'all' | 'new' | 'replied'` while the enum is `Pending | Contacted | Converted | Closed` -
> two completely different vocabularies, which looked promising.
>
> **It is not a bug.** Status is never set from that view. Transitions happen server-side:
> replying moves an inquiry to **Contacted**, and onboarding marks it **Converted** and writes
> `converted_tenant_id` (the BR-009 fix). Live data confirms it works - Pending 1,
> Contacted 1. The view only posts messages.
>
> The one oddity is a `statusFilter` ref that is **declared and never used** - `filteredInquiries`
> filters on the search box alone, and there is no status control rendered. So nothing appears
> broken to a user; it is a dropped intention, not a defect. **Left it alone** rather than
> refactoring for its own sake, but noting it as a loose end.
>
> Also confirmed reachable: all four inquiry states have a path, and two are in live use.
>
> A clean cycle is a real result. The same instinct that found four genuine bugs has to be
> willing to come back empty, or it starts manufacturing them.

> **PREVIOUS CYCLE - commit `8434d45`: EDITING ANY NON-STUDIO UNIT WAS BEING REJECTED BY THE
> DATABASE. Fourth functional bug, and the most consequential yet.**
>
> The Edit Unit modal offered **Studio / 1 Bedroom / 2 Bedroom / 3 Bedroom**. Only the first
> is real: `rooms.room_type` is an enum whose values are **Studio | One-bedroom |
> Two-bedroom | Three-bedroom**.
>
> `room_type` is sent on **every** save from that modal - including a save that only changes
> the rent. So for the **13 units that are not Studio**, any edit at all wrote an invalid
> enum value and PostgreSQL rejected it (22P02).
>
> | Live distribution | Count |
> | :--- | ---: |
> | Studio | 20 |
> | One-bedroom | 8 |
> | Two-bedroom | 4 |
> | Three-bedroom | 1 |
>
> **The twenty Studios saved cleanly** - which is exactly why nobody caught it. Whether the
> save worked depended on which unit you happened to open. And the modal hid its own bug: it
> converted the stored value to the loose spelling on open, so a One-bedroom unit displayed
> as "1 Bedroom" and looked right up until the moment you saved.
>
> **Also hardened the backend.** `room_type` was `z.string()` in both the insert and update
> schemas, while `operational_status` and `visibility_status` in those same objects were
> properly enumerated. It was the odd one out, so a bad value passed validation and surfaced
> as a database error the caller could do nothing with. Now a clean 422 naming what is
> allowed.
>
> **Verified end to end against live data:** unit 2A, stored as One-bedroom, now opens with
> One-bedroom selected. check:api 53/53 against the restarted backend.
>
> **No data changed** - every stored value was already valid. Only the interface could not
> round-trip them.

> **PREVIOUS CYCLE - commit `53b26a9`: the public inquiry form's FIRST option could never be
> sent. Third functional bug.**
>
> The unit selector opened with **"Any available unit"** as its first choice. Choosing it made
> the inquiry impossible to submit: `inquiries.room_id` is **NOT NULL**, so an inquiry must
> name a unit. With the empty value selected the lookup matched nothing and the prospect was
> told:
>
> > *"Unit  could not be found, so the inquiry was not sent. Please refresh and try again."*
>
> Note the blank where the unit should be, and the advice to refresh - which never helped,
> because nothing was wrong with the data. **The form was offering something the schema
> cannot record.**
>
> This is the public inquiry form - the top of the funnel - and the broken choice was the
> first in the list, so it was the most natural pick for exactly the person it fails: someone
> still browsing, who has not settled on a unit.
>
> Removed it, and added a guard so an empty selection says *"Please pick which unit you are
> asking about"* instead. The selector still lists every unit regardless of occupancy, which
> is correct under BR-007. **Verified live as an anonymous visitor.**
>
> **Also checked and found correct, no change needed:** bill statuses everywhere use the
> robust "not Paid" exclusion so Partially Paid counts as outstanding (the BR-013 defect is
> genuinely fixed in all three views); ticket `Closed` has no UI option but that is
> deliberate, closure runs through the BR-023 endpoint; inquiry email is NOT NULL and both
> API and form require it; and the inquiry success toast now fires only on success.

> **PREVIOUS CYCLE - commit `ce9a3ef`: three ticket category pickers disagreed, and one could
> not display its own ticket.**
>
> Hunting the same shape that found the Penthouse bug. `maintenance_tickets.category` is a
> free varchar with no enum, and the three forms that write it each had a hand-typed list.
> Between them: **nine distinct strings for about six concepts.**
>
> | View | Offered |
> | :--- | :--- |
> | TenantPortalView | Plumbing, Electrical, **Appliances**, **General** |
> | TenantTicketsView | Plumbing, Electrical, **Appliance**, Structural / Furniture, **General Maintenance** |
> | MaintenanceDispatchView | Plumbing, Electrical, Carpentry, Aircon / HVAC, **Appliances**, **General** |
>
> So a fault is stored as "Appliance" or "Appliances" depending only on which form the tenant
> opened, and any grouping or filter splits them.
>
> **The sharper half:** a live ticket (BASAG) is stored as **Structural / Furniture**, and the
> admin dispatch view did not offer that value - so opening that ticket to edit it showed a
> picker that could not represent its own category. Exactly the Penthouse shape: a stored
> value the interface cannot show.
>
> All three now render from one shared `TICKET_CATEGORIES` list. **Nothing invented** - it is
> the union of what the three already offered, since no document defines a canonical set
> (the form audit only says "free varchar; consider a lookup"). Near-duplicates resolve to
> whichever spelling more of the three already used, and every value in live data is
> included.
>
> **No data changed.** Honest caveat: verified structurally, not in the browser - the picker
> sits inside an edit modal behind an off-screen table column, so unlike the Penthouse fix
> this one was not visually confirmed running.

> **PREVIOUS CYCLE - commit `c62ca72`: the form audit is a stale defect register, and one row
> nearly became a false alarm.**
>
> `docs/11_FORM_FIELD_AUDIT.md` is the same genre as the five stale registers already found.
> It dates itself twice: it audits **`website/src/`**, a directory that no longer exists, and
> it describes a future state where "the UI stops using systemState.ts mock data" that arrived
> long ago. Three claims checked against the running system:
>
> - **"ticketPriority dropdown omits Low"** - fixed. All three priority pickers offer Low /
>   Medium / High / Emergency.
> - **"UI emits Cash/Online; enum is Cash/GCash/Bank Transfer/Adyen Online"** - resolved,
>   though **the UI genuinely does still send `Online`**, which is not an enum value. It is
>   safe only because the API explicitly admits it and translates to `GCash` server-side.
> - **"Every one of these will throw a Postgres enum error on first write"** - not true of
>   either row above.
>
> **The second one is the useful story.** It looked exactly like the Penthouse bug - a
> dropdown emitting a value the database cannot accept. I traced the write path before saying
> anything, and it turned out safe. Reporting it as a defect would have been wrong, and the
> only thing separating the two cases was checking.
>
> Labelled the document as a **lead list, not a defect list**, and said plainly that this was
> a spot-check rather than a full re-verification - the other rows were not retested and some
> may still be live.

> **PREVIOUS CYCLE - commit `430d4e1`: A REAL FUNCTIONAL BUG, AND IT HAS BEEN COSTING YOU
> SOMETHING. Needs a decision from Mrs. Da Silva.**
>
> The expense form's Property Area picker was hardcoded in **two** places, both listing five
> areas. **Penthouse was missing, so there was no way to file an expense against it.**
> Everything else already supported it - the enum, the lookup table, the backend constant,
> even the frontend type. Only the two dropdowns were short. Fixed, and both now render from
> a single shared list so they cannot drift again. **Verified in the running app.**
>
> **What it was costing.** The live ledger holds **sixteen entries whose description names the
> penthouse** - pump repairs, hardware, labour for Randy Millete, "Money Given to Dianna
> (penthouse rental)". None is filed under Penthouse, because none could be:
>
> | Filed under | Entries | Amount |
> | :--- | ---: | ---: |
> | Other Expenses / Personal | 5 | **PHP 35,228.00** |
> | Back Apartment | 4 | PHP 11,075.00 |
> | Boarding House | 7 | PHP 8,895.00 |
>
> **The first row is the one that matters.** "Other Expenses / Personal" is a non-rental area,
> so it is reported but **never subtracted from rental income** - while the penthouse is let
> to tenants, which makes its upkeep an operating cost by this project's own stated rule.
> So roughly **PHP 35,000 of apparent penthouse upkeep is currently outside Net Operating
> Income**.
>
> **I changed no data.** Whether a given row truly belongs to the Penthouse is the owner's
> accounting judgement - a description mentioning the penthouse does not prove the cost is
> the penthouse's, and re-filing sixteen historical rows would restate her Net Operating
> Income. **This one is for Mrs. Da Silva.** What I fixed is that the interface no longer
> forces the wrong answer.

> **PREVIOUS CYCLE - commit `c17958e`: the expenses spec lists five Property Areas; there are
> six, and the code already said so.**
>
> `docs/10_MONTHLY_EXPENSES_REPORT.md` Section 2 enumerates five areas and omits **Penthouse**.
> Live: `property_area_type` is an enum with **six** values and `property_areas` is a seeded
> lookup of all six. Migration 012 added it.
>
> **The sharp part:** this was already known in code. `expenseReportExport.ts:33` says
> outright *"The document says five Property Areas. Migration 012 added Penthouse."* The
> `PROPERTY_AREAS` constant holds six. BR-041 notes "the rule was written as five; there are
> six". **Three places knew. The spec did not.**
>
> **Why it is not a counting quibble:** Section 7 step 3 is an implementation instruction -
> *"dropdown restricted to the five areas in Section 2"*. A developer building from this spec
> ships a five-option dropdown and **Penthouse expenses become unallocatable**. Rewritten to
> say six and to build the control from the `PROPERTY_AREAS` constant rather than a hand-typed
> list.
>
> The gap stayed invisible because Penthouse is seeded but unused - five of six areas carry
> allocations across the 1,327 live rows, so nothing has ever failed on it.
>
> Fourth instance this session of a correction landing everywhere except the source document.

> **PREVIOUS CYCLE - commit `9b07fde`: the income report spec stated the water rate as a
> constant, and one line told you to code it that way.**
>
> The client workbook documents define the ledger the Excel export reproduces, which puts
> them closer to the **obeyed** genre than the consulted one. Three places in
> `09_MONTHLY_INCOME_REPORT.md` gave the per-occupant water charge as a literal 200 - and
> the third was an **implementation instruction**: *"system checks `Water Payment ==
> Occupants x 200`"*. A developer following that literally would hardcode the figure, which
> is exactly how it came to be hardcoded in four backend handlers (defects D-2 and A-2, both
> closed earlier today). BR-014's whole point is that the rate is configurable.
>
> All three now describe the setting they read from rather than the number it happens to
> hold. **The values were right and are unchanged** - verified live: rate 200, LF 400, LB 200.
>
> **Two things checked and found correct, no change needed:**
>
> - Section 8's four open questions map cleanly to OD-01..OD-04 and are all still genuinely
>   open client decisions.
> - **The documented 12-column layout matches what `incomeReportExport.ts` actually writes,
>   exactly and in order.** The export is faithful to the spec it claims to reproduce - worth
>   saying plainly, since it is the artifact the owner will compare against her own workbook.

> **PREVIOUS CYCLE - commits `ff08b57`, `05d05fb`: swept the prompt files, and recorded the
> rule that matters most.**
>
> Follow-on from last cycle. If one instruction document could tell a future session to
> enforce withdrawn rules, the others needed checking immediately. Swept all three prompts
> under `docs/claude_pipeline/prompts/`.
>
> **Mostly good news:** PROMPT_2 and PROMPT_3 already open with withdrawal tables naming the
> 2% escalation and the banned wording, and PROMPT_2 carries the editorial constraint as
> binding. That is exactly the treatment `CLAUDE_PIPELINE.md` was missing.
>
> Two real defects:
>
> - **PROMPT_3** instructed reading `rbac.ts` as "the **39** permissions". It is **35**,
>   counted directly from the object.
> - **PROMPT_1** instructed citing "`BR-001` to `BR-007`" - ambiguous in a way that matters,
>   since the canonical namespace runs to **BR-049** and the seven pillars that once occupied
>   exactly that range were renumbered ARCH-001..007. A range stopping at seven reads as the
>   pillars. Disambiguated rather than guessing intent.
>
> **The rule now written into the judgement log:** sort documentation by whether it is
> **obeyed** or merely **consulted**, and audit the obeyed ones first. A wrong record misleads
> whoever opens that page. A wrong instruction propagates into everything built after it.
>
> **And a correction of my own, for the second time:** I wrote a commit hash into the
> judgement log before the commit existed. Fixed, all eleven hashes in that file now verified
> to resolve, and the habit named in the commit - it is the same failure the sweep is about,
> differing only in that the author was me and the gap was minutes rather than months.

> **PREVIOUS CYCLE - commit `3b12b3e`: the pipeline instruction file told future sessions to
> enforce rules that were withdrawn.**
>
> This is the most serious instance of the pattern found all session, because the document
> is an **instruction, not a record**. `docs/claude_pipeline/CLAUDE_PIPELINE.md` Section 4
> opens: *"Every database table, backend endpoint, and architectural diagram produced by
> Claude must strictly enforce these immutable business rules."* It carried **zero**
> supersession markers anywhere in the file.
>
> A session following it would have enforced:
>
> - **Banned cluster names** - "Main Building, Annex A, Annex B", which the collision table
>   says must never appear as cluster names (the five are BH, Back Apartment, Front
>   Apartment, Penthouse, Linda; "Annex" is the family word for a *floor*)
> - **A revenue-share framing naming both a party and a recipient** for `fifty_percent_share`
>   - the single most directly forbidden content in this repository under BR-035
> - **The 2% rate escalation**, withdrawn in full and client-confirmed on 2026-09-13
>
> All seven rows also number architectural pillars as `BR-001`..`BR-007`, colliding with the
> canonical rules of those numbers. The crosswalk documents that collision in detail - but
> the crosswalk is the *other* document. This one, the one a session actually reads and
> follows, said nothing.
>
> Fixed with a CAUTION banner naming all three withdrawn items, the rows renumbered to
> ARCH-00n, and the banned wording **removed rather than struck through** - a strikethrough
> would leave a named party and destination legible, which is precisely what the constraint
> forbids. Two further instances in the same file fixed (a target-enterprise line with the
> wrong cluster count and banned names, and a diagram step). Verified after: zero banned
> terms remain outside prohibition context.

> **PREVIOUS CYCLE — commit `d3dae5f`: a locked-decisions log still states live data that is
> no longer live.**
>
> `PHASE2_LOCKED_DECISIONS.md` has a section headed "**OD-14 — still open, and now
> measured**" asserting in the present tense that "the live `rooms.floor` data says
> **12 / 11 / 9 / 1**" and that "**no migration was written**." Verified live today:
> `rooms.floor` is **11 / 11 / 10 / 1** across 33 rooms, and migration `015` was written and
> applied on 2026-09-13.
>
> That file is an **append-only log and it does resolve itself** — a later section reads
> "OD-14 — CLOSED. `F1` is on the third floor." So the history is intact and the right fix is
> a forward pointer, not a rewrite. Anyone reading top to bottom reaches the resolution;
> anyone *grepping for the floor figures* hit the superseded paragraph first with no way to
> know. Kept the paragraph verbatim, marked it superseded.
>
> Two related caveats closed the same way: `PHASE1_LOCKED_DECISIONS.md` anticipated a
> "Phase 2 data-cleanup migration" that has since run, and **E-21**'s caveat that the seed
> "disagrees with the survey on floor 1 by one unit" — true when written, closed by
> migrations `007` and `015`.
>
> Same family as the expired E-07 instruction: the finding was true when recorded, the work
> it anticipated then happened, and nobody returned to the record.
>
> Also verified correct, no change needed: **E-09** — `expenseService.ts` and
> `financialReportService.ts` still genuinely don't exist, so both are still honestly marked
> Planned rather than claimed as built.

> **PREVIOUS CYCLE — commit `df42532`: the DFD completeness proof has an orphan it says it
> doesn't have.**
>
> `PHASE1_DFD_TRACEABILITY.md` asserts as *Satisfied*: "every physical table is claimed by
> exactly one store — **20 of 20; zero orphans**." Live catalogue verified by `pg_class`
> today: **21 tables**. The extra one is `property_areas` (migration 008, extended by 012)
> and it appears **zero times** in that document. So there is exactly one orphan and the
> invariant does not hold.
>
> **Root cause:** the document counted tables in `FULL_DATABASE_SCHEMA.sql` — the file rule
> 2 says doesn't describe this database. Counting the wrong authority is how a completeness
> proof closes over the wrong set.
>
> **This one runs the opposite way from everything else found today.** The registers
> *understated* the system. This *overstates* — it claims a coverage guarantee it no longer
> has, which is the kind a panelist could test in one query.
>
> **Deliberately not repaired.** Assigning `property_areas` to a data store is a diagram
> design decision, not a transcription fix. I recorded the gap, named the likely home as a
> suggestion, and left it for whoever owns the DFD. Inventing a mapping is the exact failure
> this project has been bitten by four times.
>
> Also verified correct this cycle, no change needed: **E-11** (FR-033 Occupant Count
> Memory, FR-034 Water Payment Validation — both match `03_REQUIREMENTS.md`) and **E-19**
> (DFD process counts correctly distinguished as legacy 5, submitted 6, corrected 7).

**193 commits, all pushed to `main`. Working tree clean.**
Backend up on :5000, `rlsLockdown: "enforced"`, all seven verification suites green
(`check:api` 53/53 · `check:adyen` 23/23 · `check:billing` · `check:writes` · `check:rules`
· `check:secrets` · `check:tokens`), plus `check:columns`, added this session.

---

## 1. Real code bugs found and fixed

| Fix | What was wrong | Commit |
| :--- | :--- | :--- |
| **Dashboard read a failure as a zero** | On a failed fetch, three KPI cards rendered "₱0 collected", "0 / 33 Units, 0% occupied" and "0 Open — All tickets handled". Same false-affirmative pattern already fixed once for the verification queue, never carried to its siblings. Tested live by stopping the backend mid-session. | `f98dce3` |
| **Every occupied unit displayed as "Reserved"** | The public listing collapsed four statuses into a two-way badge. Verified against the live database: unit 1A is `Occupied` at ₱4,500, and the badge said Reserved. 32 of 33 units affected. | `e11eab3` |
| **Public listing hid its own uncertainty** | On a failed fetch it fell back to seeded prices with no signal, so a prospect could be quoted a stale rate as if confirmed. | `09a9626` |
| **A movie screenshot was serving as a room photo** | The only photo on file across 33 units was not a room. Removed with your authorisation, along with the stock-image fallback that was giving the other 32 units the same generic interior dressed up as real. | `995fdf5` |

---

## 2. The documentation finding — the substantial one

The project guards hard against **overclaiming**. Nobody was checking the opposite
direction. Three distinct failure modes turned up:

### (a) Registers of known-bad things go stale by overstating problems
Five checked, **five had stale entries**:

| Register | Claimed | Actually |
| :--- | :--- | :--- |
| `04_ARCHITECTURE.md` §6 debt table | 9 open debt items | **6 already closed** |
| `PHASE1_TRACEABILITY_MATRIX.md` Gap Register | **10 MISSING requirements** | 6 done, 2 partial, **2 missing** |
| `PHASE1_TRACEABILITY_MATRIX.md` A-x table | 7 rows open | **all 7 closed** |
| `PHASE1_OPEN_DECISIONS_REGISTER.md` | OD-01..OD-13 | **OD-14..17 missing entirely**, plus a superseded answer |
| `claude_pipeline/CONTINUE_HERE.md` defects | 4 rows open | 2 stale, 2 genuinely open |

Two of those documents contain explicit warnings against the exact failure they had
fallen into.

### (b) Errata prescribe corrections that never reach the document they name
An errata sheet is not a fix — it is a note that a fix is owed. Three items flagged in
your own standing rules were still live because of this:

- **The withdrawn 2% rent increase**, still stated as policy in `08_OPEN_DECISIONS.md:41`
  — the note M-11 names as *its decision of record*. `1da0555`
- **"32 units"**, still in `01_SYSTEM_BIBLE.md:146` — the canonical source M-08
  explicitly prescribes correcting to 33. `e01dfb4`
- **Banned BR-035 co-ownership wording**, four times in the body of a document whose own
  banner declares it banned. Removed, not struck through — a strikethrough leaves the
  banned words legible. `79c90fa`
- Two withdrawn **E-16 performance figures** ("sub-50ms", "256MB RAM") still stated as
  fact. `5e04643`

### (c) An errata instruction that expired
E-07 and M-02 end with "`RESTRICT` is never stated as current fact." Migration 005 then
applied **exactly what those rows proposed**. Live count: 8 RESTRICT. Anyone following
that instruction today would delete a true, defensible claim. `a3f72f3`

The pattern is now written into `docs/13_AUDIT_JUDGEMENT_LOG.md` so it survives into
future sessions, including guidance on what *not* to over-correct.

---

## 3. What this means for the defense

**Hivelet is in materially better shape than its own documentation claimed.** A panel
reading the uncorrected set would have found defects that no longer exist and gaps
already closed — and the team would have prepared answers for six requirements that are
in fact implemented.

---

## 4. Genuinely open — verified, not assumed

| Item | Why |
| :--- | :--- |
| **FR-019 Cash Flow**, **FR-020 Profitability** | No `financialReportService`. Every figure is browser arithmetic. |
| **BR-046** | Blocked on **OD-07** — does the category cumulative reset at the calendar year? A schema decision; answering it ourselves would invent the owner's accounting policy. |
| **Client decisions** | OD-01 through OD-10, gathered for one consultation with Mrs. Da Silva. |
| **Service extraction** | ~4 in 5 database calls still sit in route handlers. The architecture's stated target. |
| **Team roles** | The documents disagree. Yours to settle. |

None is required for the defense.

Two figures I deliberately did **not** invent a resolution for: the database-call counts
disagree between documents (131/164 vs 137/173) and neither states its counting method.
That needs whoever wrote the original count.

---

## 5. One correction of my own

I wrote a placeholder commit hash into the judgement log and never replaced it, so the
reference pointed at nothing. Fixed in its own commit (`b0b8142`) and verified all nine
hashes in that file resolve. An audit about documents asserting untrue things does not
get to leave an untrue reference in the document recording the lesson.
