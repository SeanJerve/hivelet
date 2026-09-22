# CONTINUE HERE — handoff for the next machine

**Last updated:** 2026-09-22.
**Branch:** `main`. Everything described here is committed and pushed.
**Read this first, then `docs/claude_pipeline/CONTINUE_HERE.md` for pipeline detail.**

> [!IMPORTANT]
> **Working on Loyd's machine, without the database or the Adyen keys?
> Read [`HANDOFF_TO_LOYD.md`](HANDOFF_TO_LOYD.md) instead of this file first.**
>
> It says what you can run (13 of the twenty suites on a bare clone, and one that goes green
> while skipping half of itself), what you must not touch, and what the actual job is — which is
> **`CLIENT_MEETING_QUESTIONS.md`**, answerable by asking Mrs. Da Silva directly. That is the
> biggest blocker in the project and the one thing Sean cannot do from his side.

---

## 0.0 What 2026-09-22 produced

> [!IMPORTANT]
> **The consultation happened that afternoon and went well.** The adviser's direction afterwards
> was: **document what was built, and do not push the payment gateway further — what was reached
> is already good.**
>
> That ruling settles the one item this day could not close on its own. The integration is built,
> configured and correct; a live GCash checkout in Adyen's TEST environment came back Refused, and
> the cause traces to an account-side gap on Adyen's end rather than to anything in this
> repository. **Do not spend more time on it.** `BLOCKED_FOR_SEAN.md`'s **B-52** carries the full
> evidence and the one operational fact that outlives the ruling: a quick tunnel takes a new
> hostname every restart, so a later demonstration still needs `RESTART_THE_TUNNEL.md` followed.
>
> The work from here is consolidation and documentation, not new building.

**A pre-consultation audit, a real security fix, a payment-reachability bug that meant nobody
could actually test GCash, and a full motion pass across every screen — 25 commits, `check:all`
20/20 both before the session and now.**

### The security fix: every onboarded tenant got the same public password

`POST /admin/tenants` hashed the literal `'Hivelet@Tenant2026'` for every tenant it onboarded —
a string sitting in 21 commits of this repo's own history and previously found live in a shipped
`frontend/dist` bundle (`docs/13_AUDIT_JUDGEMENT_LOG.md` §9). Fixed same-day once Sean picked the
remedy ("random password and force a change on login"): `generateTemporaryPassword.ts` issues a
real one-time password per tenant (`crypto.randomInt`, unambiguous character set), and it is now
shown to the admin exactly once, in a non-dismissible reveal modal with copy-to-clipboard, right
after onboarding — the "not yet surfaced in the UI" gap the fix shipped with that morning is
closed. The forced-change half needs `database/migrations/048_must_change_password.sql` applied;
everything for it is written and wired but deliberately inert until then. Full detail, including
the exact two lines to restore afterward, is `BLOCKED_FOR_SEAN.md`'s **B-53**.

### The bug that meant a live GCash payment could not be tested at all

A resident's dashboard showed the current period as "Settled" with no way to pay unless a `bills`
row already happened to exist for them — and almost none do, because bills are raised on demand
(deliberate, see `docs/13_AUDIT_JUDGEMENT_LOG.md` §3). Fixed in `3f50678`/`64cf0e4`: both the
tenant payments screen and the Overview tile now offer "Pay with GCash" for the current period
regardless, and the checkout handler resolves-or-creates the bill server-side. Found and fixed
specifically because Sean asked to actually see a live GCash payment go through before the
consultation.

**What that live attempt found, and where it stands.** Chased a CORS failure to `.env`'s
`ADYEN_CLIENT_KEY` pointing at a credential that never had `localhost` allow-listed (a different,
correct credential already did — same account, confirmed by matching API key suffix); fixed by
switching credentials and confirmed via a fresh incognito session. Added shopper identity
(`shopperReference`, `shopperEmail`) to the checkout session (`765d2b5`) on the theory it was a
risk-engine block — it was not the fix. **The payment itself came back "Refused," and the
attempt never appears in Adyen's own Payment list or API logs at all.** Ruled out CORS, missing
shopper data, stale browser state, and fraud/velocity blocking one at a time; what's left points
at GCash not being among Adyen's documented TEST-credential payment methods — an account-side gap
on Adyen's end, not something fixable from this codebase. Needs Adyen support, not more debugging
here.

### Everything else, briefly

| | |
| :--- | :--- |
| **Pre-consultation audit** (`3608386`, `bfd8edc`) | Filter-label/badge mismatches, a cross-modal status disagreement (Under Maintenance read as red in one screen, amber in another), a hardcoded ×200 water preview where the live rate helper already existed elsewhere, an Adyen modal reading a bill field at the wrong nesting depth so every payment tile showed "Monthly dues" instead of the actual unit, a keyboard-unreachable ticket-expand control, "you have none" shown for a filtered-to-zero result that actually had records |
| **Billing edge case** (`e86ada2`) | A unit with `current_price = 0` could still raise a real bill — the zero-rent guard checked the wrong total. Latent, not live; no occupied unit holds `0` today |
| **`/privacy` page** (`1e55eb2`) | Closes **B-50**. Grounded only in verified facts; unconfirmed items (retention period, DPA registration) are flagged in source comments for Sean/the owner |
| **Full motion pass** (`9dfe370`, `56c145f`, `e3e5e87`, and this session's own follow-up sweep `7def23d`…`7dd8e77`) | Every dropdown, graph, header entry, switch, loading state, notification, alert, page transition and table now animates with a real reveal instead of popping in — grounded in the `emil-design-eng` and `impeccable` skills' decision framework (frequency → purpose → easing → duration), not decoration for its own sake. `OccupancyArc`/`SegmentBar` had no actual motion implemented despite being cited as the reference quality. One deliberate non-fix: `AdyenPaymentModal`'s state panels were NOT given a shared crossfade after tracing a `nextTick()` timing dependency that a shared transition would break |
| **Accessibility** (`7774418`) | `prefers-reduced-transparency` now has a real fallback on the app's two `backdrop-filter` surfaces, distinct from `prefers-reduced-motion` |
| **Apple-design pass** (`3933271`) | Tracking on four stat figures that had none, one asymmetric modal transition (entered with a scale, left without one), two kicker-above-heading violations removed |
| **`check:ledger` ratchet fix** (`388ee70`) | Migration 047's deletions (five confirmed-fake profiles) cascaded four `room_assignments` rows out of existence; the check's hardcoded count needed lowering to match. Also surfaced that `luydcuario@gmail.com` was one of the five removed — confirmed by name with Sean before deletion, not an oversight |

### What still needs a person

`BLOCKED_FOR_SEAN.md` is current as of this session. The two live ones: **B-53**'s migration 048
(random passwords are live and visible now; the forced-change half waits on this), and **B-52**
(the `cloudflared` tunnel — start it and repoint the Adyen webhook before demonstrating a payment;
the one already running this session will not survive a restart). Everything from **B-29** through
**B-49** in that file predates today and is unchanged.

---

## 0.0a What 2026-09-19 produced

**A functional audit found nineteen defects, six of them on the paths the owner's money takes,
and not one of them produced an error, a failing suite or a console warning.** The twenty
suites passed before the session and pass after it — which is the point. Each defect sat in a
gap the suites are known not to cover.

**The full record is `docs/AUDIT_2026-09-19_FUNCTIONAL.md`.** Every claim in it names the
evidence it was checked against. The five worth knowing without opening it:

| | |
| :--- | :--- |
| **Editing a ledger row rewrote who paid it** | The form has no contact field and sent one anyway, recomputed from whoever occupies that unit *today*. **402 of 937 rows were exposed** — 396 whose contact differs from the current tenant, 6 on units with no tenant at all |
| **The cash form's unit dropdown rendered blank and posted to `1A`** | The seed carries lowercase unit codes, `fetchRooms()` uppercases them, and a `<select>` matches by strict equality. Same defect on the onboarding form, where it also silently dropped `?unit=PH` |
| **The check for outstanding repairs could never find any** | It filtered on `'Open'`, which is the frontend's word for `'Submitted'` and not a value of `ticket_status_type`. PostgreSQL answers `22P02`; the error was swallowed and the null read as "nothing open", so resolving one ticket cleared a unit with others outstanding. **Rehearsal step 21 would have passed on it** |
| **Vacate would deactivate an administrator** | And there is exactly one admin row. `authService` refuses an inactive account, so recovery meant editing the database |
| **`/auth/register` was public, unthrottled and inserting live active profiles** | Missed because `rateLimit.ts` claimed inquiries were *"the only genuinely open write"* — a census that had enumerated one route file |

### The money now files under the month it is for

`year`/`month` came from the **date paid**. Her book files by the month the rent is **for** —
where the two disagree, **216 rows follow the period and 50 follow the payment date**. Arrears
paid in October for August were landing in October while August still looked unpaid. Corrected,
and it is the basis the multi-month work below depends on.

### Three migrations, two applied

**`028`** (unit codes unique ignoring case) and **`029`** (`record_income_for_months`) were
applied on 2026-09-19 and read back from the catalogue. **`027` was refused again** — it is the
one that DELETEs, and the environment blocks a destructive statement against a shared database
however it is authorised. Its guard still returns exactly 2. **The two junk tickets, one titled
with a slur, are still on the owner's overview.**

`029` turns on what Sean asked for directly: *"we should follow her way and have a way to
accommodate that."* A receipt covering several months is now **one ledger row per month**, which
is how her book already holds arrears (`OR#4895` across four rows). Single-month recording is
untouched.

### Two things that are now mechanisms rather than sentences

- **`check:endpoints` censuses every route file** and names the four writes reachable without a
  token, with what guards each instead. Mutation-tested four ways, including "a guard that only
  appears in a comment". It exists because the claim it replaces was a census of one file.
- **The public site has one shared outage component.** Both public pages used to answer an
  unreachable listing differently — one said "ring the landlady", the other listed all 33 units
  as Available. Sean's call: be honest and point them at her.

### What still needs a person

`BLOCKED_FOR_SEAN.md` is the queue and it is current. The short version: **`B-05`** (apply
`027`), **`B-14`** (the rehearsal's steps 7-26, the rotated admin password, and one test
enquiry left on her board), **`B-15`** (one question for the owner — can a month be rent with no
water at all; 38 rows in her book say yes and the server cannot write one), and **`B-18`**
(the audit trail is 88% our own test runs; left alone deliberately while in development).

**The admin password was rotated for real** by rehearsal step 5 — the one step nothing could
ever test, because it burns the credential every suite signs in with. `credentials/creds.txt`
has the new value and it is gitignored, so the other machine has to be told.

---

## 0.0b What 2026-09-18 produced

**The interface was rebuilt, a privacy defect was closed, and two verification suites turned out
to have been lying — one of them for five days.**

### The redesign landed

Roughly twenty commits from the design side: a workspace design system, every admin and resident
screen moved onto it, the public site rebuilt with real photographs, one shared table component,
one dialog, one status pill, and pagination so long lists stop running off the page.

**The screen contract held through all of it** — it went from 59 to 60 calls with **30 writes
unchanged**. A read was added and no write was lost, which is the thing that document exists to
prove. Read the totals off its own footer; every figure quoted elsewhere has gone stale at least
once.

### The privacy defect, and the half of it that is still open

**A clean frontend build was shipping 33 residents’ email addresses** in a chunk served at 200.
Closed from the design side in `ba3b82a`: the roster moved to the gitignored
`credentials/demo-accounts.json`, injected by the vite plugin and `null` in a build, and
**`check:secrets` was hardened to scan tracked files rather than only the build** — which is the
half that would have caught it in the repository.

> **`B-10` is the part that is not fixed and is not a code change.** The repository is **public**
> — confirmed, not assumed: an unauthenticated `api.github.com` request returns `"private":
> false`. The tracked tree is down to 11 noted addresses from 19, but **the history still holds
> the 33**, because the roster file was gutted rather than erased. Making the repository private
> is the only option that touches what is already published.

### Two suites that were not checking what they claimed

| | |
| :--- | :--- |
| **`verify:rbac`** | Had **not signed in successfully since 13 September** — it hardcoded the passwords burned in that rotation, so every sign-in returned 401. Worse, *“deactivated tenant CANNOT sign in”* was still counted, and a dead password makes it fail for the wrong reason. **21 passed / 3 failed → 53 passed / 0 failed.** It now discovers its accounts |
| **`check:api`** | Was silently running **58 of 76**. The missing 18 included the assertion that a tenant cannot reach admin data. It needs `database/seeded-tenant-credentials.json`, gitignored and sent separately |
| **`check:billing`** | Passed all 39 assertions and exited **127** on a libuv teardown crash, so `check:all` called it FAILED. Fixed |

**Nineteen suites now, and all nineteen pass.**

### The owner answered, and one answer closed OD-04

Two rounds, recorded in `CLIENT_ANSWERS_2026-09-17.md`. **OD-04 closed:** *“the labeled advance is
actually the deposit”* — one sentence that resolved five days of apparent contradiction. Both her
earlier answers were true; a **label** had been taken for a **definition**, and the figure in the
system was correct throughout. The grace period settled the same way (late on day one, a week of
forbearance before she presses), and rent and water stay one combined bill because her own report
is one row per unit per month.

### Needs a person, and nothing here can do it

1. **`TESTING_REHEARSAL.md` — 0 of 26 steps ticked.** No write path in this system has ever been
   used by a human being. It blocks Chapter 4’s Table 4.5, the ISO evaluation, and the defense.
2. **Migration `027`** (`B-05`). Two junk tickets sit on the owner’s dispatch board **right now**,
   one titled with a slur. Confirmed visible in the running product, not just in the queue.
3. **`B-10`** — repository visibility, and whether the residents are told.
4. **Mrs. Da Silva** — the seven receipts and five accounting habits in
   `CLIENT_MEETING_QUESTIONS.md` §§ 1–2 are still untouched.

**The full task board is `PROGRESS_REPORT.md`.** The functional audit behind most of the above is
`docs/AUDIT_2026-09-18_FUNCTIONAL.md`.

---

## 0.1 What 2026-09-17 produced, and what it needs from a person

**Three documents were written that day and are the ones to open first:**

| | |
| :--- | :--- |
| **`CLIENT_MEETING_QUESTIONS.md`** | Everything Mrs. Da Silva must decide, in one sitting, with a place to write each answer. Built from her records — which made it **shorter**: four of nine "open decisions" turned out to be **already built and cited by number in `backend/src`**, and one question's premise was wrong. |
| **`TESTING_REHEARSAL.md`** | 26 steps, about forty minutes, exercising every write path once. **No write path has ever been used by a person.** Runs on `PH`, the only vacant unit, with a fake tenant. Every writing step carries an Undo. |
| **`docs/SCREEN_CONTRACT.md`** | For the redesign: every screen, every call it makes, which ones **write**. Generated by `npm run contract`, so it cannot drift. Rebuild a screen, check it against its row. |

**Needs a person, and cannot be done from here:**

1. **`database/migrations/023`** — **not applied.** Three profiles are **duplicates** of real
   residents, carrying **working passwords on the shared literal**, with no tenancy and no ledger
   row. The sandbox refuses `UPDATE` on `profiles` (three attempts, two sessions). One statement.
   *Do not strip the invoice numbers from their names — that was the original plan and it would
   make them indistinguishable from the real residents.*
2. **Rotate `Hivelet@Admin2026` and `Hivelet@Tenant2026`.** In the GitHub history since
   2026-08-25. **There is now a change-password screen** (A-12) — before 2026-09-17 there was no
   way to change a password from inside the product at all.
3. **Run the rehearsal**, including the one step nothing here could: a change-password **success**,
   which rotates a credential every check in `check:api` signs in with.

**Applied — three migrations:**

- **`022`** — `current_user_role()` returned `'admin'` to any caller it could not identify, which
  was every caller. Inert today (0 policies reference it) and a trap for whoever writes the first
  one. It returns `NULL` now, which fails closed in both spellings.
- **`024`** — a unique index on `transaction_reference`, in `payments` and
  `monthly_income_records`. The webhook's idempotency was a read-then-write, and Adyen retries
  *while the first attempt is still running*: two handlers read "not found" and both insert, and
  the property is paid once and credited twice. **The handler changed with it** — `23505` now
  returns `duplicate` (HTTP 200) rather than `failed` (HTTP 500), because Adyen retries on 500 and
  the index would otherwise have created a notification that can never be acknowledged.
- **`025`** — wording, and an honesty fix. A `system_settings` row was labelled in a framing
  BR-035 forbids, and it implied a configurable rate that does not exist:
  `fifty_percent_share` is `GENERATED ALWAYS AS (rent_amount / 2.0)`, so the divisor is in
  the column definition and **no code reads that row at all**. Kept rather than deleted, and
  it now says so.

**The money defects found and fixed that day**, all verified against the live rows:

| | |
| :--- | :--- |
| the dashboard projected **₱12,800** of water a month against a real **₱6,400** | `occupants` was mapped `Math.min(capacity, 2)` — invented from room size — while the real tenancy figure sat unused two lines below |
| the cash form could pre-fill a rent **₱2,000 wrong** | it read the hardcoded seed price, and **30 of 33 no longer match the database**. It now refuses to pre-fill when the data is not live, and says why |
| a bill due the 20th was not overdue until **08:00 on the 21st** | the cutoff was built in UTC for a UTC+8 property — an unlegislated grace, where **OD-16 says there is none** |
| a resident's **income CSV** would shift every column after a quote in a name | the sibling expense export had escaped correctly all along |
| a **verified payment could be rejected**, and the money stayed booked | the payment read Rejected, the bill reopened to Due, `verified_at` was wiped — and the income row **stayed**. She would have chased rent already paid. Verify was guarded; Reject, twelve lines below, was a bare `.eq('id', …)` |
| a failed expense fetch would have shown **the year's takings as profit** | `expenseRecords` starts empty, NOI subtracts it from gross. **₱3,745,419.51** of 2025 costs would have silently become ₱0. Its three sibling loaders all raise a fetch-failed flag; this one did not |

**The suites were sixteen by the end of that day** (**eighteen as of 18 Sep**). New that day: **`check:canon`** (the locked wording is enforced,
not just written down) and **`check:reports`** (both workbooks agree with the database, month by
month, every year — 68 assertions). `check:api` went from **57 to 75**.

**Every check runs from the repo root** as of that day — `npm run check:ledger` used to fail with
"Missing script" from the one directory a person types in.

**Read the summary table, not the tail.** Twice that day a red check was committed past because
`| tail` showed the end of a different suite:

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

---

## 0. If you are Claude on a new machine, read this box first

Five rules that are not negotiable on this project. Breaking any of them causes real damage.

1. **The Supabase database is LIVE and holds the owner's real financial records.**
   Never `DROP`, never wipe, never truncate. All schema change is a new numbered
   migration in `database/migrations/`.
2. **Ask the catalogue, not a document.** Never edit
   `database/FULL_DATABASE_SCHEMA.sql`; it does not describe this database. **Eight business
   rules were recorded wrongly and six of those took their evidence from that file.**
   `database/live_schema.csv` is better but has itself been wrong — on 2026-09-14 it
   rendered both `GENERATED ALWAYS` columns as ordinary `DEFAULT`s, which is exactly the
   misreading behind the `0.00` story. Query `information_schema`, `pg_index`,
   `pg_constraint` and `pg_trigger` through the Supabase MCP. Documents are a hypothesis.
3. **Verify before you report.** A "defect" about generated columns storing `0.00` was
   repeated in nine documents and recorded as two business-rule violations. It was never
   true, and the remediation it proposed would have broken every income-record write.
   Check claims against the database, not against the documents.
4. **BR-035 wording is locked.** `fifty_percent_share` is described **only** as a
   system-computed figure equal to half the row's Rent Amount, retained for ledger parity
   with the historical spreadsheet. Never name a party, recipient, purpose or destination.
   Never write "co-ownership", "co-owner", "50/50", "owner share" or "landlady share".
5. **Adyen with GCash is committed.** It is configured and working. Do not describe the
   payment gateway as a mock, a simulator, or "pending consultation" anywhere.

Other standing constraints: **no 2% rent escalation** of any kind (it appears in no
business rule — the owner sets rates by hand); the property is **33 units, not 32**.

---

## 0.4 FASTEST PATH — Loyd's machine, one file, five minutes

**If Sean has sent you a file called `loyd.env`, do this and skip section 1.**

```bash
git clone https://github.com/SeanJerve/hivelet.git
cd hivelet
npm run install:all
npm run hooks:install
# put the file Sean sent at the repository root and rename it:
#   loyd.env  ->  .env      (root, beside package.json - NOT in backend/)
```

That file already contains all sixteen variables, correct and complete, including
the Supabase project URL, the shared publishable key, the secret key named **`loyd`**
in Supabase (yours alone — if it leaks Sean deletes that one key and nobody else is
touched), and every Adyen value.

**Change two lines before your first run:**

1. `JWT_SECRET` — generate your own. The command is in a comment directly above it:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
   Tokens are signed and verified by the same backend, so it does not need to match
   anyone else's.
2. `ADYEN_HMAC_KEY` — yours, from the second Adyen webhook you create (see below).
   **Do not keep Sean's.** His key belongs to his webhook; using it here makes every
   notification fail signature verification, which looks exactly like a broken
   integration and is miserable to debug.

**Then:**

```bash
npm run dev:backend      # :5000
npm run dev:frontend     # :5173
```

**Prove it works — three checks, in this order:**

```bash
# 1. the database is reachable AND the lockdown is genuinely in force.
#    "enforced" is the ONLY passing value; "unverified" means your publishable
#    key was rejected before it reached PostgreSQL, so nothing was tested.
curl -s http://localhost:5000/api/health

# 2. 30 endpoint, RBAC and input checks. Needs credentials/creds.txt - ask Sean for it.
cd backend && npm run check:api

# 3. the HMAC implementation, 23 checks, no network needed
npm run check:adyen
```

If all three pass you are fully set up. Two common stumbles:

- **`check:api` fails immediately** → `credentials/creds.txt` is missing. It is
  gitignored; Sean has to send it. The scripts read the first `Email:`/`Password:`
  pair as the administrator and the **last** `Password:` as the shared tenant one.
- **`rlsLockdown` says `unverified`** → the publishable key is wrong or stale.

**One thing a pasted key cannot give you:** ask Sean to add you to the **Supabase
project** as well. `.mcp.json` points the Supabase MCP at the project and it
authenticates against *your own* Supabase account, so without membership your Claude
cannot query the live catalogue — and checking claims against the database rather
than the documents is rule 3 above. It is the difference between verifying and
guessing.

**The Adyen webhook is not optional.** It is the only thing in the system that writes
an online payment. Until you have created your own and pointed it at your own tunnel,
a tenant can complete a GCash payment at Adyen and nothing will ever reach the
ledger — with no error anywhere. See "Two people cannot share one webhook" below.

---

## 0.5 What CANNOT come from this document — Sean must hand these over

This file is committed to a **public** repository, so it holds no secrets and no
access. Reading it is not enough to run the system. These **seven** things pass
person-to-person, and nothing in the repo can substitute for them.

| # | What | Why the doc cannot do it |
| :-- | :--- | :--- |
| 1 | **Supabase project access.** Invite the teammate at Supabase → Project Settings → Team. | Without membership he cannot open the API page at all, so "create your own secret key" is impossible. Either invite him, or send him a key you created for him. |
| 2 | **Adyen Customer Area access**, or the four values directly: `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_CLIENT_KEY`, and an HMAC key. | Same reason. The API key is only visible once, at creation. |
| 3 | **`credentials/creds.txt`** | Gitignored, and `npm run check:api` fails without it. |
| 4 | **`.env`**, or at least the Supabase and Adyen values. `JWT_SECRET` he should generate himself. | Gitignored by design. |
| 5 | **A second Adyen webhook** — see the warning below. | Requires clicking in the Adyen Customer Area. |
| 6 | **`credentials/demo-accounts.json`** — the demo sign-in roster | Gitignored since 2026-09-18, because it holds 34 real residents' names, addresses and units and the build was shipping them. **Absent, the sign-in panel simply does not render** — no error, no warning. That is how it looked on Loyd's machine until the file was put in place. |
| 7 | **`database/seeded-tenant-credentials.json`** | Gitignored. **Absent, `check:api` reports `58 passed, 0 failed` instead of 76** — it skips all 8 `/tenant/*` checks and both RBAC isolation assertions, and counts none of them as failures. The only sign is one line reading `TENANT (none found) - token FAILED`. |

> **Items 6 and 7 fail silently, which is what makes them worth listing.** A missing `.env`
> stops the backend and you know within seconds. These two leave a working system that is quietly
> doing less than it reports — a sign-in panel that is simply absent, and a suite that says
> `0 failed` having skipped a quarter of itself. **Check the totals, not the zeros.**

### The 16 variables, sorted by how much care each needs

All sixteen are read by the backend; none is decorative. What differs is the damage
each does if it leaks.

**Tier A — not secrets. Post these in the group chat freely.**

| Variable | Value | Why it is safe |
| :--- | :--- | :--- |
| `PORT` | `5000` | — |
| `NODE_ENV` | `development` | — |
| `JWT_EXPIRES_IN` | `7d` | — |
| `CLIENT_URL` | `http://localhost:5173` | — |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | — |
| `ADYEN_ENVIRONMENT` | `TEST` | — |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Identifies the project; authorises nothing. |
| `ADYEN_MERCHANT_ACCOUNT` | e.g. `HiveletECOM` | An identifier, not a credential. |
| `ADYEN_CLIENT_KEY` | `test_…` | **Designed** to ship inside browser JavaScript. Restricted by allowed origins, so it is useless from anywhere else. |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Publishable by design, and in this project it is powerless besides: migration 002 leaves it with no grant on any table. Verify with the health check — `enforced` means it genuinely cannot read. |

**Tier B — each person generates their own. Never share, never copy.**

| Variable | How |
| :--- | :--- |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |

Each machine signs and verifies its own tokens, so they do not need to match. Sharing
one only widens the blast radius if a laptop is lost.

**Tier C — real secrets. These are the ones to be careful with.**

| Variable | What it lets the holder do |
| :--- | :--- |
| `SUPABASE_SECRET_KEY` | **Bypasses row-level security completely.** Read and write every row in the live ledger — 937 income records and the owner's real financial history. The most dangerous value in the project. |
| `ADYEN_API_KEY` | Create checkout sessions against the merchant account. |
| `ADYEN_HMAC_KEY` | Forge a notification our webhook would accept as genuine, which is the one path that writes a payment. |
| `ADYEN_WEBHOOK_USER` / `ADYEN_WEBHOOK_PASSWORD` | Reach the webhook handler. Less severe than the HMAC key, since HMAC still has to verify. |

### Is a group chat good enough for Tier C?

Honestly: it is the weak point, and worth two minutes of care rather than pretending
otherwise. A group chat is a **persistent, searchable, cloud-backed** log. The
credentials that leaked in this project leaked because they sat somewhere durable that
later became visible.

Four things that reduce the risk without slowing anyone down:

1. **Issue one Supabase secret key per person, named for them.** Then a single leak is
   revoked by deleting that one key, instead of rotating everything and breaking every
   teammate mid-defense. This is the single biggest improvement available.
2. **Send Tier C in one message, and delete it once each person confirms they have it.**
   Deletion is imperfect, but a message that is gone cannot be found by someone scrolling
   the history in six months.
3. **Never screenshot a key.** Screenshots land in camera rolls and sync to cloud
   backups, which is exactly how the earlier exposure outlived the file it came from.
4. **Revoke everything after the defense.** Supabase → delete the keys; Adyen → revoke the
   API credential. It takes a minute and closes the whole thing out.

**One value the teammate does NOT need from you:** if he creates his own second Adyen
webhook (see below), he generates his **own** `ADYEN_HMAC_KEY` and
`ADYEN_WEBHOOK_PASSWORD`. Only `ADYEN_API_KEY` has to be shared.

### A message you can paste, with the blanks marked

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_<paste>
SUPABASE_SECRET_KEY=sb_secret_<paste - YOUR OWN key, not a shared one>

JWT_SECRET=<generate your own, do not use mine>
JWT_EXPIRES_IN=7d

ADYEN_API_KEY=<paste>
ADYEN_MERCHANT_ACCOUNT=<paste>
ADYEN_CLIENT_KEY=test_<paste>
ADYEN_ENVIRONMENT=TEST

ADYEN_HMAC_KEY=<from YOUR OWN webhook, generated when you create it>
ADYEN_WEBHOOK_USER=<choose one, set the same value in Adyen>
ADYEN_WEBHOOK_PASSWORD=<choose one, set the same value in Adyen>

PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

Save it as `.env` at the repository root — not in `backend/`, which is not read.

### Two people cannot share one webhook

An Adyen webhook points at exactly **one** URL. If both machines run their own
Cloudflare tunnel, only the machine named in the webhook receives notifications —
the other will complete a GCash payment at Adyen and see nothing appear in the
ledger, with no error anywhere.

Two ways out, and the second is better:

- **Take turns.** Whoever is demonstrating edits the webhook URL to their tunnel.
- **Create a second Standard webhook** in Adyen, pointing at the second tunnel.
  **It gets its OWN HMAC key.** That key must go in *that machine's* `ADYEN_HMAC_KEY`.
  Copying Sean's key into the teammate's `.env` makes every notification fail
  signature verification, which looks exactly like a broken integration.

### The tunnel URL changes every restart

> **Step-by-step runbook: `RESTART_THE_TUNNEL.md` at the repository root.**
>
> **`cloudflared` IS installed now** — version `2026.9.1`, verified 2026-09-16. This box
> said it was not, which was true when written and is no longer. The `winget` line in
> the runbook is only needed on a machine that has never had it.
>
> **Starting the tunnel is only half the job, and the other half cannot be automated.**
> A new tunnel gets a **new random URL**, and Adyen still points at the dead one until
> somebody pastes the new address into the dashboard by hand. So starting a tunnel
> without doing that leaves a public door open to this laptop that nothing is using.
> Start it when you are about to demonstrate a payment, not before.


`cloudflared tunnel --url http://localhost:5000` gets a **new random address each
time it starts** — after a reboot, a power cut, or closing the terminal. The old
URL stops resolving and Adyen's notifications go nowhere.

**After any restart: copy the new URL and update it in Adyen** (Developers →
Webhooks → your webhook → Server configuration), then press **Test** and confirm
a 200. Two minutes, and the payment demo silently does not work without it.

Check the tunnel is actually carrying traffic:

```bash
TUNNEL=https://your-tunnel.trycloudflare.com

# 200 = the API is reachable from the internet
curl -s -o /dev/null -w "%{http_code}\n" "$TUNNEL/api/health"

# 401 = correct: the endpoint is alive and refusing an unsigned call
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' "$TUNNEL/api/public/payments/adyen/webhook"
```

On Windows the first run raises a **Windows Defender Firewall** prompt for
`cloudflared.exe`. Allow it — the tunnel cannot accept the return connection
otherwise. It is asked once per machine.

---

## 1. What a fresh environment needs

You asked what to set up beyond the Supabase MCP and Adyen. Here is the complete list.
Items marked **SECRET** are gitignored and must be transferred out of band — never by
commit, and never pasted into a chat that is logged.

### 1.1 Prerequisites

| Thing | Notes |
| :--- | :--- |
| Node.js 22.x | `node --version`. The repo is tested on v22.16.0. |
| Git | `npm run hooks:install` after cloning — installs the pre-commit secret scanner. |

### 1.2 Install

```bash
git clone https://github.com/SeanJerve/hivelet.git
cd hivelet
npm run install:all        # installs backend/ and frontend/
npm run hooks:install      # REQUIRED - blocks commits containing secrets
```

### 1.3 `.env` at the repository root — **SECRET**

Copy `.env.example` to `.env` and fill it in. There is only ONE `.env`, at the root;
`backend/.env` does not exist and is not read.

| Variable | Where it comes from | Required? |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase → Project Settings → API. Not a secret. | **Yes** |
| `SUPABASE_PUBLISHABLE_KEY` | Same page, `sb_publishable_…`. Deliberately powerless — it holds no grant on any table. Used only by the health check. | **Yes** |
| `SUPABASE_SECRET_KEY` | Same page, `sb_secret_…`. **Bypasses RLS entirely.** Server-only. Never let it reach a browser, a build, or a screenshot. | **Yes** |
| `JWT_SECRET` | Generate your own: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` | **Yes** |
| `JWT_EXPIRES_IN` | `7d` | Yes |
| `ADYEN_API_KEY` | Adyen Customer Area → Developers → API credentials | **Yes** — see §1.4 |
| `ADYEN_MERCHANT_ACCOUNT` | e.g. `HiveletECOM` | **Yes** |
| `ADYEN_CLIENT_KEY` | `test_…`. Safe in the browser; must have your origin allow-listed. | **Yes** |
| `ADYEN_ENVIRONMENT` | `TEST` | Yes |
| `ADYEN_HMAC_KEY` | Generated when you create the webhook. Hex string. | **Yes** |
| `ADYEN_WEBHOOK_USER` / `ADYEN_WEBHOOK_PASSWORD` | Basic Auth on the webhook. Optional but recommended; HMAC applies either way. | Recommended |
| `PORT` | `5000` | Yes |
| `CLIENT_URL` | `http://localhost:5173` | Yes |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` | Yes |

> **On the Supabase keys.** Both teammates should hold **their own** secret key, not a
> shared one, so a single leak can be revoked without breaking everyone. Supabase →
> Project Settings → API → create a new secret key per person.
>
> **History note.** Live keys and the JWT secret were committed to this public repo
> between 2026-08-25 and 2026-09-13. Everything has been rotated and the legacy JWT keys
> disabled, but **git history still contains the old values** — that was a deliberate
> decision (rotation is the remediation; rewriting history would break every clone and
> change nothing about a three-week exposure). Do not be alarmed to find them there. Do
> not reuse them.

### 1.4 Adyen — committed, with GCash

GCash is enabled on the test merchant account and **verified working**:

```bash
# confirms which methods the account actually offers
curl -s -X POST https://checkout-test.adyen.com/v71/paymentMethods \
  -H "x-api-key: $ADYEN_API_KEY" -H "Content-Type: application/json" \
  -d '{"merchantAccount":"'"$ADYEN_MERCHANT_ACCOUNT"'","countryCode":"PH","amount":{"currency":"PHP","value":100000},"channel":"Web"}'
# -> scheme (Cards), gcash (GCash)
```

**The webhook is the only thing that writes an online payment.** Set it up or online
payments will never appear in the ledger:

1. Adyen Customer Area → Developers → Webhooks → **Standard webhook**.
2. URL: your public tunnel address + `/api/public/payments/adyen/webhook`.
3. **Generate an HMAC key**, paste it into `ADYEN_HMAC_KEY`.
4. Set Basic Auth to the same user/password as `ADYEN_WEBHOOK_USER` / `_PASSWORD`.
5. Press **Test** in the Adyen UI and confirm a 200.

A local server is not reachable from Adyen, so you need a tunnel while developing:

```bash
cloudflared tunnel --url http://localhost:5000
```

The tunnel URL changes every restart — update the webhook URL in Adyen each time.

> **If Adyen is not configured**, `isLiveConfigured()` is false and a local development
> checkout page serves instead. That page is **refused with 404 in any environment where
> Adyen *is* configured** — it writes a payment and is unauthenticated by necessity, so it
> must not coexist with the real gateway.

### 1.5 Supabase MCP

Already in `.mcp.json`, pointing at project `xeynbzcoywogcaesyhkw`. The MCP needs your own
Supabase auth — approve it when Claude first calls it. Used heavily for verifying claims
against the live catalogue.

### 1.6 `credentials/creds.txt` — **SECRET**, gitignored

Holds the admin login and the shared demo-tenant password. **The test scripts read it**,
so `npm run check:api` fails without it. Ask for it directly; do not commit it.

Format the scripts expect:

```
Email:     admin@hivelet.ph
Password:  <admin password>
...
Password:  <shared tenant password>
```

(The first `Email:`/`Password:` pair is the admin; the **last** `Password:` is the tenant one.)

> All 44 demo passwords were rotated on 2026-09-13 because the old ones had been public.
> If a teammate's saved password stops working, that is why.

### 1.7 Run it

```bash
npm run dev:backend      # :5000
npm run dev:frontend     # :5173
```

Health check — **`enforced` is the only passing value**:

```bash
curl -s http://localhost:5000/api/health | grep -o '"rlsLockdown":"[a-z]*"'
```

`unverified` means your publishable key was rejected before it reached PostgreSQL, so the
lockdown was never actually tested. That is exactly what a stale key looks like.

---

## 2. Verification suites — run these before trusting anything

```bash
# All eighteen, one command, from the repository root. ~75 seconds.
npm run check:all
```

It prints every suite's own output in full, then a summary table, and exits non-zero if
any of them failed. Five need the backend running (`npm run dev:backend`) because they
make real HTTP calls; the runner says so if they cannot connect.

> [!IMPORTANT]
> **Read the summary table, not the tail.** `| tail` shows the end of whichever suite ran
> last, which twice let a red check be committed past. Use:
> ```bash
> npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
> ```

**Every one of these runs from the repository root** — the `cd` below is only there to show
which workspace owns it. Before 2026-09-17, `npm run check:ledger` from the root failed with
"Missing script", which is the command two documents tell people to type.

```bash
cd backend  && npm run check:api        # 75 endpoint, RBAC, perimeter, export and input checks
            npm run check:adyen       # 29 HMAC signature checks
            npm run check:billing     # water / grace / period / receipt-allocation arithmetic
            npm run check:writes      # no database write discards its result
            npm run check:columns     # every table/column/filter/write key in backend/src exists
            npm run check:fields      # every snake_case field the frontend reads is one the API sends
            npm run check:endpoints   # every route has a caller, or a stated reason it has none
            npm run check:ledger      # arithmetic and plausibility over the owner's live money
            npm run check:reports     # 68 assertions: both workbooks agree with the database,
                                      #   month by month, every year in the ledger
cd frontend && npm run check:tokens     # design tokens resolve to the right colours
            npm run check:reachable  # every source file is reachable from main.ts
            npm run check:liveness   # no screen presents cached, seeded or empty shared state
                                      #   as a live figure, and no hardcoded money fallback has
                                      #   drifted from the rate it stands in for
cd ..       && npm run check:rules      # the BR register agrees with itself
            npm run check:matrix     # the traceability matrix agrees with itself
            npm run check:copies     # the filming copies match the documents of record
            npm run check:canon      # the locked wording is enforced, not just written down
            npm run check:secrets    # nothing secret is staged
            npm run check:secrets    # scans for committed credentials
            npm run backup            # snapshot the live database before risky work
```

`check:matrix` was added on 2026-09-15, last of the ten. The Summary Counts table in the
traceability matrix claimed a **Total of 44** while enumerating **43** — FR-013 had been moved
out of MISSING the day before and never added to any other row, so it fell out of the one
table a panel adds up. Three places in that document gave three different answers about the
same 44 rows. All of it is arithmetic, and none of it was visible to a reader. The check reads
the status vocabulary from the document's own §1.3 rather than hardcoding it, and it was made
to fail against five separate mutations before it was trusted.

`check:columns` and `check:fields` were added the same day and both read the live schema at
runtime, so neither can go stale. They exist because two broken column names had survived
every other suite: `POST /admin/inquiries/:id/messages` selected columns `inquiries` does not
have and reported it as "Inquiry not found", and the matching GET ordered by a column
`inquiry_messages` does not have and returned a 500 — between them, the whole enquiry
conversation feature was dead. The frontend twin is quieter still: a wrong field name there
is `undefined`, with no error at all, so every occupied unit was labelled "Active Resident"
and the Audit Trail showed "null" for every change it had recorded.

All of these passed at handoff: **53 / 23 / all / all / all / all / clean**.

Two of them are worth knowing about before you run them:

- **`check:api` posts `1e999` at three money columns** and asserts each is refused. That
  is a real request against whatever backend is running. A rejected request writes
  nothing, so it is safe — and if one were ever *accepted*, the suite says so rather than
  leaving a poisoned row behind for someone to find in a report months later.
- **`check:billing` needs no database for the BR-013 half.** `allocateReceipt()` is pure
  arithmetic, so the 12 checks over it — conservation, the `CHECK (amount > 0)` dust
  floor, oldest-first ordering — run anywhere.

---

## 3. What changed overnight (2026-09-13 → 14)

Ten commits. The ones that matter:

### Payments
- **A real Adyen payment created two rows.** The browser wrote one under a locally
  invented reference; the webhook wrote another under the gateway's `pspReference`, which
  its duplicate check matches on — so it could never recognise the first. The browser path
  was also forgeable: any tenant could POST their own session id and place an unpaid row
  in the verification queue. **The webhook is now the sole writer.** The browser return
  asks our server, which asks Adyen server-to-server (`GET /v71/sessions/{id}?sessionResult=…`).
- The browser cannot be fixed by sending the reference: Adyen Web v6 whitelists exactly
  seven keys into `onPaymentCompleted` and `pspReference` is not one. Verified by reading
  the shipped bundle.
- A failed Adyen call no longer falls through to the local page — an outage used to become
  a `Pending Verification` payment the owner could reasonably have approved.

### Ledger integrity
- **Cash could be recorded with nothing written to the books.** The on-site modal skipped
  the POST if the unit did not match, swallowed the error if it threw, then marked the unit
  settled and said "posted to the ledger".
- **OR numbers were invented** on both sides from `Math.random()`. All 937 real rows carry
  numbers from the owner's receipt book (`OR#4627`); a 4-digit random collides at even odds
  after ~100 entries. Both sides now require it.
- The income **create** route bypassed the shared `money` validator. `z.number()` rejects
  NaN but **accepts `Infinity`**, and PostgreSQL sorts Infinity above every numeric, so
  `CHECK (rent_amount >= 0)` passed it — poisoning both generated columns and every `SUM`.

### Business rules — the last four, closed 2026-09-14
- **BR-013. A partial payment used to vanish as a debt.** The settlement loop paid only
  bills it could cover in full; the first it could not broke the loop, and the leftover was
  written with `bill_id = NULL`. Nothing ever summed those rows back in, so a tenant paying
  3,000 against a 5,000 bill had the cash recorded, the bill still reading 5,000, and
  nothing connecting the two — permanently. **13 of the 15 live payments already have
  `bill_id` NULL.** `'Partially Paid'` had been in the enum the whole time, written by
  nothing and read by nothing. `billingService.allocateReceipt()` now settles each bill
  against its outstanding balance; 12 checks in `check:billing` cover it.
- **Two things that would have broken on the first partial payment.** Neither was reachable
  before, because nothing ever wrote that status. `TenantOverviewView` whitelisted
  Pending/Due/Overdue, so a partially paid bill fell through and the tenant saw nothing
  outstanding while still owing. And the **Adyen charge came from `total_amount`**, so a
  partially paid bill would have been charged in full a second time. Both fixed; the charge
  is now derived from the balance and the modal shows the figure it will charge.
- **BR-047. `FULL_DATABASE_SCHEMA.sql` lied again** — this is the cleanest example of rule 2
  in the whole audit. It describes `property_area` as VARCHAR(100) free text with no CHECK
  and no lookup table, and two documents recorded BR-047 as blocked on that basis. The live
  database has it as the **enum `property_area_type`** with a **seeded six-row lookup**,
  from migrations 008 and 012. 0 of 1,327 rows are off it. Trigger
  `trg_update_expense_total` already held the reconciliation identity. Migration **019**
  closes the one real hole: expense creation was two round trips, so a rejected allocation
  left an entry carrying a total with nothing underneath it.
- **BR-019 was never blocked either.** The register said it waited on OD-01; that conflated
  which totals the report *shows* with whether a correction *reaches* them. There are 0
  views, 0 materialized views and no aggregate table — every report figure is derived on
  read. Nothing can go stale.
- **BR-046 is the one that genuinely waits on the owner** — see §4.

**49 rules: 42 enforced, 4 partial, 2 schema only, 1 not enforced, 0 violated.**

Four more rules moved after the four above, and for the same reason each time: the
evidence in the register cited `FULL_DATABASE_SCHEMA.sql`, which does not describe
this database. **BR-041** (the property areas are an enum with a seeded lookup, not
free text), **BR-026** and **BR-008** (the register read `idx_room_assignments_room_active`
and missed `idx_single_active_assignment_per_room`, which is the partial unique index
it said did not exist), and **BR-030** (CSV export exists - client-side, which is not
`backend/src`, which is the only place it looked).

`npm run check:rules` now validates the register against itself, because it drifted six
times in one session and none of it was visible while reading. **BR-039 had no status
cell at all** - the row ended mid-sentence, so the table rendered a column short while
the summary still counted it. That predates the session.

### Security
- **The RLS self-check passed while misconfigured.** It treated any probe error as proof of
  lockdown, and "Invalid API key" looks identical to "permission denied" at HTTP 401. A
  rotated-out key reported a green padlock. Now a three-state verdict
  (`enforced` / `exposed` / `unverified`), asserted by `check:api`.
- **The tenant portal was writing false intrusion attempts into the audit log.**
  `systemState.ts` fired six admin-only requests on every page load regardless of role;
  each refusal was audited. **2,104 of 2,224 audit rows are this bug**, and the table is
  append-only so they are permanent. Fixed; the view now opens on the 120 real events.

### Documents
- **Withdrew a defect that was never real.** "`fifty_percent_share` / `remitted_amount`
  store 0.00" appeared in nine places and marked **BR-035 and BR-038 as Violated**. Both
  columns are `GENERATED ALWAYS AS … STORED` — PostgreSQL derives them and *rejects* any
  write naming them. All 937 rows are correct. **Violation count is now 1, not 5.**
- Recounted everything else. Correct as written: 21 tables / RLS forced / zero policies,
  33 units, floors 11-11-10-1, ₱3,432,990.47 personal at 58.95%.
  Corrected: 158 → **164** database calls, `admin.ts` 2,056 → **2,263** lines,
  5 → **9** services, "20 tables" → **21**. **"39 permissions" was itself wrong and
  survived this recount** — `rbac.ts`'s `PERMISSIONS` object (lines 38-89) holds
  exactly **35**, matching `docs/claude_pipeline/outputs/PHASE1_ARCHITECTURE_AND_PATTERN.md`,
  which had it right all along. Found 2026-09-15 while spot-verifying this same line.

### Interface
- ~20 fabrications removed. The audit log invented four entries attributed to the owner on
  any API failure; the profile form pre-filled a fake emergency contact that would save on
  submit; a payment with no status displayed as **VERIFIED**.
- Design tokens were dead code — 1,879 hex literals, zero token uses, and `--primary` was
  not the primary button's colour. 1,786 converted with provably zero visual change.
- Figures were being cut in half at 390px, hidden by `overflow-x: hidden`. Zero clipping
  across all 12 routes now, zero console errors.
- All nine diagrams re-rendered at 3,900–5,400px (they were ~800px — that is the blur).

---

## 3.9 What needs a person, not a commit — as at 2026-09-16

*The overnight audit of 2026-09-15/16 closed everything it could close. What is left needs
somebody's decision or somebody's permission, and it is gathered here because it was otherwise
spread across seven rows of a register, a session report and the output of a check. Each line
says whose call it is.*

### Before the defense — a fact about the data, not a defect

**No ledger row has been written by the application. Not one, in either ledger.** Every
figure in the system arrived in the migration of **2026-08-28**:

| Table | Rows | Written by the app since | Newest row |
| :--- | ---: | ---: | :--- |
| `monthly_income_records` | 937 | **0** | 2026-08-28 |
| `monthly_expense_entries` | 1,262 | **0** | 2026-08-28 |
| `payments` | 15 | **0** | 2026-08-25 |
| `bills` | 2 | **0** | 2026-08-21 |
| `maintenance_tickets` | 5 | **0** | 2026-08-26 |

*(`notifications` and `audit_logs` DO have newer rows — those came from this audit's own
probing, not from use.)*

Two consequences worth knowing **before** someone notices them on the day:

1. **The income ledger stops at July 2026.** August and September collections are not in
   the system, so the dashboard correctly shows **₱0 for the current month** and
   *"0 collections recorded this month"*. That is the data being absent, not the figure
   being wrong — but it is what a panel would see on an unprepared demo.
2. **The write paths have been proven by the suites and never used in anger.** They are
   exercised by `check:api`, `check:billing` and `check:writes`, and several real defects
   in them were found and fixed during this audit — but no real collection has ever been
   recorded through the interface.

**And no unit has a photograph.** `room_photos` holds **0 rows** across all 33 units, so the public listing shows every unit without an image. Not a defect — the upload path works and writes to `room_photos` correctly — simply unused, like the rest of the write surface. Worth a decision before anyone demonstrates the public site.

Neither is a fault. Both are worth deciding about: either record August and September
before the defense, or be ready to say plainly that the ledger is complete through July
and the system has been in read-only use since migration.

### Mrs. Da Silva's — these are her records and her accounting policy

| | What she needs to decide | Where the detail is |
| :--- | :--- | :--- |
| **Seven receipts** | Two carry impossible dates (`OR#4839` is dated **1900-01-17**, the Excel epoch — a cell that never parsed; `INVOICE#5120` is dated a year in the future). Three have a rent period ending the day *before* it starts. Two receipt numbers are used twice — and **`OR#4813` is against two different tenants on the same day**, ₱8,000 and ₱9,000, which cannot both be right. **Nothing has been written to any of them.** | `npm run check:ledger` prints all seven every run; **A-16** |
| **₱35,228 of penthouse upkeep** | Filed under non-rental *Other Expenses / Personal*, so it sits outside Net Operating Income. That is a classification choice, not a defect. | session report |
| **Where Linda's fixed water belongs** | The same money now lands in different columns depending on when the row was written — `water_payment` on a new row, `linda_water_charge` on the 62 migrated ones. Because `remitted_amount` is generated as `rent + water_payment`, a new row counts that money as **hers** and an old one does not. BR-040 says it is Linda's. | **FR-036**, now PARTIAL |
| **OD-07** | Does an expense category's running cumulative reset at the calendar year? It decides stored column versus computed window, so it is a schema decision. **BR-046** cannot be enforced until it is answered. | §4 row 3 |

### Sean's — engineering calls with a real-world consequence

| | What it is | Where |
| :--- | :--- | :--- |
| **Three names carrying invoice numbers** | `profiles.full_name` holds *"Mireel Fatima ParcareyINV.#5223"* and two others. Traced and safe — all three invoice numbers already exist in the ledger against the clean name. The three `UPDATE` statements are written. **The sandbox refuses them**, twice, so they need to be run by a person. | session report |
| **Refresh the `VIDEO PRESENTATION DOCS` copies before filming** | That folder is **gitignored** (`.gitignore:61`, `VIDEO PRESENTATION DOCS/*`), and only four files in it are tracked. The rest are **derived copies** of the Phase 1–3 outputs, and they do not travel with the repository — a clone on another machine gets the canonical documents but **not these**. Three of them were corrected on this disk on 2026-09-16 (the security answer in `01_SCRIPT_defense_pack.md`, and the `entity_type` claim in `04a` and `04b`) and **those corrections are local only**. Regenerate the copies from `docs/claude_pipeline/outputs/` before filming, or film from the canonical documents. | `.gitignore:61` |
| **Rotate the admin and tenant passwords** | `Hivelet@Admin2026` and `Hivelet@Tenant2026` were in the **built bundle** served by the login page, and have been in this repository's **git history since 2026-08-25** — the same window the JWT secret was exposed in. The code is fixed and the bundle re-verified clean, but **removing it from HEAD does not remove it from history.** Treat both as burned. | **A-18** |
| **Decide on the vite upgrade** | `npm audit` reports **4 advisories** across vite 5.4.21 and esbuild 0.21.5 — all **devDependencies, none shipped**. Two are Windows-specific: an NTLMv2 hash disclosure via UNC paths, and a `server.fs.deny` bypass. `host: true` in `vite.config.ts` binds every interface, so while `npm run dev` runs **anyone on the same wifi can reach it**. The fix is **vite 8, a major upgrade** — not something to run days before a defense. Until then, do not leave the dev server running on an untrusted network. | `frontend/vite.config.ts` |
| **`current_user_role()` fails open** | `SECURITY DEFINER`, returns `'admin'` when it cannot identify the caller — which is always, because `auth_user_id` is NULL on all 45 profiles. **Harmless today**: no RLS policies call it and the public roles cannot execute it. **Fix it before the first policy is ever written**, or the natural way to enable RLS grants admin to everyone. | **A-14** |
| **An administrator bills screen, or none** | `GET /admin/bills` exists, applies the FR-013 overdue overlay, and **nothing calls it**. Either build the screen or retire the endpoint and say plainly that balances are read from the income ledger. | **A-11** |
| ~~**A change-password screen**~~ | **DONE 2026-09-17, and seen working.** `ChangePasswordModal.vue`, reached from the account menu by **both** roles. Opened in a browser and driven: the three rules tick live as you type, *"The two passwords do not match"* appears, and the submit button stays disabled until everything is satisfied. A wrong *current* password shows against its field instead of risking the session — `isAuthFailure` excluded `INVALID_CREDENTIALS`, a trap that had never fired only because nothing has ever called `setAuthFailureHandler`. Six `check:api` assertions cover the failure paths. **Only the success path is unverified** — running it rotates a credential the suite signs in with, so it needs one manual run. | **A-12** |
| **Five superseded endpoints** | Delete them or wire them. An endpoint nothing calls is an untested surface that still answers. | **A-13** |

*Nothing in either table is a blocker for the defense. Everything that could be fixed without
one of these decisions has been.*

---

## 4. What to do next

In the order I would take them.

| # | Task | Why |
| :-- | :--- | :--- |
| ~~1~~ | ~~**Confirm the Adyen webhook end to end on the new machine.**~~ **DONE 2026-09-15.** Tunnel live, webhook `WBHK4295722322C95PZ9WML8ZQ3MK3` repointed at it with Basic Auth, HMAC key proven against a real signature — a signed notification sent through the public tunnel returned `200 [accepted]`. See `PASTE_THIS_IN_CLAUDE_APP.md`. **Still open:** an actual GCash payment through the tenant portal UI, which would write a real `Pending Verification` row — needs Sean present, since it writes to the live database. | — |
| ~~2~~ | ~~**BR-039** — the API does not enforce that advance rent equals the rent at move-in.~~ **DONE 2026-09-14.** The API now derives advance rent from the unit's `current_price` by default, accepts a supplied figure that differs, and audits the divergence with both numbers. Recorded as **Partial by design**, not Violated — see `docs/13_AUDIT_JUDGEMENT_LOG.md` §3.1 and the crosswalk's own BR-039 entry, which records the same-day close. This row had gone stale: it called BR-039 "the last remaining genuine violation" in a document that states, four lines above it, that Violated stands at 0. | — |
| ~~3~~ | ~~**No transaction boundary anywhere in `backend/src`.**~~ **DONE 2026-09-14.** Migration `018` added `settle_verified_payment()`; the payment, its bill and the income row now commit together or not at all. supabase-js still cannot open a transaction, so any NEW multi-step write must follow the same database-function pattern. | — |
| ~~4~~ | ~~**No Overdue transition.**~~ **DONE 2026-09-14.** `billingService.isOverdue()` is wired into both bill endpoints, which return `effective_status` derived from the due date. FR-013 is IMPLEMENTED; BR-011 is Enforced. | — |
| 3 | **Ask the owner one question (OD-07).** Does each expense category's running cumulative total reset at the start of a calendar year, or run indefinitely? | The only thing standing between **BR-046** and enforced. It decides whether the cumulative is a stored column or a computed window, so it is a schema decision — and answering it ourselves would be inventing the owner's accounting policy. |
| ~~4~~ | ~~**BR-049** — Excel export.~~ **DONE 2026-09-14.** `GET /api/admin/reports/income.xlsx` and `/expenses.xlsx` build both ledgers in their documented layouts. The open decisions they touch (OD-01, OD-05, OD-06, OD-07) are printed on the sheet rather than assumed. | — |
| 5 | **Service extraction.** **144 of 184** database calls still sit in route handlers (78%); `admin.ts` is **3,033** lines. Six of the planned services still do not exist. *(These read 131 of 164 and 2,263 lines until 2026-09-16 — re-measured, and the ratio has improved by two points while the absolute count grew, which is what partial extraction against continued feature work looks like.)* | The architecture's stated target. Not required for the defense. |
| 6 | Tell teammates the demo passwords changed, and have each create their own Supabase secret key. | Housekeeping from the credential rotation. |

**Every database write must say what failure means.** supabase-js does not throw —
every call resolves to `{ data, error }`, so a bare `await db.from(...).update(...)` is
indistinguishable from success. A sweep found **23** of them; one left a *rejected*
payment's bill still reading Paid, and one meant account lockout never engaged. Use
`assertWritten` or `warnIfWriteFailed` (`src/utils/checkedWrite.ts`), or destructure
`error` yourself. `npm run check:writes` fails the build if you don't.

**Every multi-step write must be a database function.** supabase-js cannot open a
transaction, so three migrations now exist for exactly this reason — `010` (expense
allocations, update), `018` (payment settlement), `019` (expense creation) and `020`
(rate change history, as a trigger). If you add a
write that touches more than one table, follow the pattern rather than chaining awaits.

**Do not** "fix" `fifty_percent_share` or `remitted_amount` by adding them to an INSERT.
That was proposed in the old traceability matrix and would break every write.

---

## 4.4 Read the judgement log before you change anything

`docs/13_AUDIT_JUDGEMENT_LOG.md`.

This document records what is **true**. That one records **why the judgements went
the way they did**, which is the part that does not survive a new session. A
reader can see that BR-033 derives the rent period; they cannot see that a
supplied value is still honoured *on purpose*, and would reasonably "fix" that by
rejecting it — breaking real entry, because 937 rows were migrated with periods
from the owner's own book.

It also carries the four defect sweeps that found more than rule-by-rule reading
did, a fifth worth running that has not been, the traps that cost real time, and
the standing reason nothing was ever written to production to test anything.

---

## 4.5 The iteration record

`docs/12_ITERATION_HISTORY.md` — the agile iteration history, written for the capstone
professor and panel rather than for a developer.

It sets the boundary where the commit history actually puts it: **Iteration 1**,
construction, 95 commits to `1438595`; **Iteration 2**, verification and correction, 87
commits from `cc10d98`; **Iteration 3**, consolidation, planned and gated on a single
client consultation. It carries the dated client decisions, the panel recommendation in
its corrected form, the 22 errata, and what each iteration changed.

**If you add work, add it there too** — an iteration record written after the fact is
worth much less than one kept as you go.

---

## 5. Where things live

| What | Where |
| :--- | :--- |
| Defense script (6 sections) | `docs/claude_pipeline/outputs/PHASE3_DEFENSE_PACK.md` |
| Panel recommendation register | `docs/claude_pipeline/outputs/PHASE3_PANEL_RECOMMENDATION_REGISTER.md` |
| ERD + data dictionary | `docs/claude_pipeline/outputs/PHASE2_ERD_AND_DATA_DICTIONARY.md` |
| 3NF proof | `docs/claude_pipeline/outputs/PHASE2_NORMALIZATION_PROOF.md` |
| Security / RLS posture | `docs/claude_pipeline/outputs/PHASE2_SECURITY_AND_RLS.md` |
| Business-rule crosswalk | `docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md` |
| Errata against the submitted module | `docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md` |
| Paste-ready Mermaid for all diagrams | `docs/diagrams/DIAGRAM_SOURCE.md` |
| Rendered PNGs | `docs/diagrams/rendered/` |
| Migrations (21, apply in order) | `database/migrations/` |
| Live schema — **the source of truth** | `database/live_schema.csv` |

**Live baseline at handoff**, so you can tell whether anything moved:
15 payments · 937 income records · 1,327 expense allocations · 33 rooms · 5 clusters ·
45 profiles · 2 bills · 21 tables.
