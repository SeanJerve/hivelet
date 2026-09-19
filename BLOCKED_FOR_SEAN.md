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

### B-16 — during an outage, two public pages tell a prospect opposite things

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
- **What Sean needs to ask her:**
  1. *When somebody pays three months at once, do you write one receipt line or three?* Every
     multi-month settlement in the book so far is **one row per month** (`OR#4895` across four).
     If that is the rule, `monthsCovered` on this form is the wrong model and should raise N
     rows, not one row with N months of rent on it
  2. *Are there months where a unit pays rent and no water at all?* There are 38 such rows. If
     that is deliberate, the server has to be able to write a zero
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
- **What Sean needs to do:**
  1. Send the new admin password to whoever else has `creds.txt` (Loyd's machine, teammates).
  2. Run — or assign — `TESTING_REHEARSAL.md` steps 7-26 in a real browser, signed in with the
     new password. Nothing about the doc changed; it is exactly as ready as it was.
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
