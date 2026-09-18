# Functional audit — 2026-09-18

**Scope:** every feature, component and screen across the admin workspace, the resident portal and
the public site, after Sean's redesign (21 commits over 17–18 Sep). **Function only — no design
judgements.** Run against the live system on Loyd's machine at commit `03c7f1e`.

> [!IMPORTANT]
> **Read-only. Nothing was written to the owner's records.**
> The database holds Mrs. Da Silva's real books with no staging copy, and `docs/13` § 3.4 records
> the standing decision that nothing is written to production to test it. Every read endpoint was
> exercised; **the 25 write endpoints were deliberately not invoked.** Logins write an audit row,
> as `check:api` already does on every run. Where a gap can only be closed by a write, it is named
> below rather than performed — that is what `TESTING_REHEARSAL.md` is for.

---

## Verdict

**The system works, and the build does not.** 35 of 35 read endpoints respond correctly, all twelve
authenticated screens render with **zero console errors and zero failed requests**, and the security
perimeter holds. **Three real defects were found.** One ships live resident data to the browser
(**D-0**), one shows a resident a money figure that contradicts the rule printed beside it (**D-1**),
and one makes a passing suite report failure (**D-2**). Everything else is minor.

| | |
| :--- | :--- |
| **Privacy** | **D-0 — the build ships 34 residents' email addresses.** Highest priority here |
| **Verification suites** | 15 of 17 pass on a built tree. `check:secrets` **correctly fails** (D-0); `check:billing` is a **false red** (D-2) |
| **`check:api`** | Was silently running **58 of 76**. Now **76 of 76** — see D-3 |
| **Read endpoints** | **35 / 35**, including both report exports |
| **Screens** | 8 admin, 4 resident, 4 public — all render, no console errors |
| **Security perimeter** | Holds at API and in the router |
| **Defects** | **D-0 privacy**, **D-1 money-facing**, **D-2 tooling**, plus six minor |

---

## 1. What was verified working

### 1.1 Verification suites, by real exit code

Run individually, capturing each suite's own exit status rather than a pipeline's:

```
rules 0 · matrix 0 · copies 0 · canon 0 · tokens 0 · reachable 0 · liveness 0 · writes 0
columns 0 · fields 0 · endpoints 0 · ledger 0 · reports 0 · adyen 0 · api 0
secrets 1    ← correct: the built bundle carries resident data (D-0)
billing 127  ← false red: passes every assertion, then crashes on exit (D-2)
```

`check:tokens` needed a build first; after `npm run build:frontend` it passes, with raw hex
literals at **16 against a budget of 16**.

### 1.2 The build

`npm run build:frontend` — **typecheck and build clean**, 2,320 modules transformed, no errors.

> [!WARNING]
> **The bundle is not clean. See D-0 — it is the most serious finding in this audit, and I got it
> wrong first time round.** An earlier draft of this section said `check:secrets` had passed
> against the fresh build. It had not: **the secrets suite ran before the build existed**, and
> exited 0 having scanned no build output at all. It said so in its own output — *"(no build output
> present — run the frontend build to scan what ships)"* — and **I read the exit code instead of
> the note.** That is the failure mode `CLAUDE.md` warns about for `check:liveness`, applied to a
> different suite by the person who wrote the warning into two handoffs the day before.

### 1.3 Every read endpoint in the screen contract

All 23 reads, plus parameterised routes with ids resolved from live rows, plus both binary exports:

| | |
| :--- | :--- |
| `/public/rooms` **33 rows** · `/public/rates` object | matches the canonical 33 units |
| `/admin/tenants` **44** · `/admin/rooms` **33** · `/admin/bills` **2** · `/admin/payments` **15** | |
| `/admin/income-records` **937** · `/admin/expense-entries` **1262** · `/admin/expense-categories` **13** | matches the documented ledger exactly |
| `/admin/tickets` **5** · `/admin/inquiries` **1** · `/admin/audit-logs` **100** · `/admin/notifications` **15** | |
| `/admin/reports/income.xlsx` **25,327 B** · `/admin/reports/expenses.xlsx` **16,946 B** | real spreadsheet bytes, correct content type |
| all 8 `/tenant/*` routes | resident sees 1 room, 12 income records, 0 bills |

**Two bills against 32 tenancies is correct**, not a gap — bills are raised on demand
(`docs/13` § 3.6), which the owner confirmed on 17 Sep.

### 1.4 Security perimeter

| Test | Result |
| :--- | :--- |
| Tenant token → 5 admin endpoints, including the income report | **403** on all five |
| No token → admin and tenant endpoints | **401** on all three |
| `check:api` isolation: *a tenant must not reach admin data* | **passes** |
| `check:api` isolation: *must not reach another tenant's data* | **passes** |
| Signed-in resident navigating to `/admin/income` in the browser | **redirected to `/tenant`** |

**Those two isolation assertions had not been running.** See D-3.

### 1.5 Screens

Every screen walked through the router, capturing console errors, failed requests, and rendered
content. **All twelve authenticated screens: zero console errors, zero failed requests.**

- **Admin** — Overview, Room & Rate Directory, Residents, Income & Collections, Monthly Expenses,
  Maintenance Dispatch, Prospect Inquiries, System Audit Trail. Income renders **4,488** peso
  figures and Expenses **3,057**; Residents paginates 44 records at 10 per page with working
  Everyone / Living here / Moved out / Prospects filters that sum correctly (44 / 39 / 4 / 1).
- **Resident** — Unit Overview, Payment & Billing, Maintenance Tickets, My Profile. All render;
  see **D-1**.
- **Public** — landing, category, category units, enquiry form. All render, no errors.

### 1.6 Failure-state machinery

The load-bearing "never present a fallback as a fact" behaviour is **present and wired**: four
`*FetchFailed` flags in `systemState.ts`, set on failure (`:636`, `:812`, `:883`, `:933`), cleared
when each loader starts (`:532`, `:761`, `:824`, `:894`), and `AdminOverviewView` imports all four
and renders `UnavailableNote` from them.

> **I could not exercise this end to end and am not claiming I did.** Patching `fetch` in the page
> does not re-run a loader whose store is already populated, so my in-page attempt proved nothing.
> **Step 23b of the rehearsal — stop the backend, reload — remains the real test.**

### 1.7 Adyen

**Configured, not reachable.** All seven variables are set and `ADYEN_ENVIRONMENT=TEST`, which is
Adyen's developer sandbox. `check:adyen` passes offline. **No `cloudflared` process is running on
this machine**, so Adyen cannot deliver a notification here, and the webhook points at whichever
machine claimed it last — that is **B-03 coordination, not a setup gap.**

The three payment write routes — `POST /tenant/payments/checkout`,
`POST /tenant/payments/adyen/verify-session`, `PATCH /admin/payments/:id/verify` — were
**deliberately not invoked**, as each creates or alters a payment record.

---

## 2. Defects

### D-0 — The production build ships 34 residents' email addresses · **privacy, BR-024**

**A clean `npm run build:frontend` emits `frontend/dist/assets/demoAccounts.dev-CmTmdIki.js`,
4,998 bytes, containing the email addresses of 34 real residents.** `check:secrets` fails on it and
names every one.

**What is and is not exposed — checked, not assumed:**

| | |
| :--- | :--- |
| **34 real resident email addresses** | **in the shipped chunk** |
| The administrator's password | **not present** — tested against the live value |
| The shared tenant password | **not present** — same test |
| Is the chunk reachable? | **Yes.** Its filename is written into the built entry chunk `index-6JCxG2DS.js`, and it is served — `GET /assets/demoAccounts.dev-CmTmdIki.js` returns **200** |
| Is the panel rendered in production? | Almost certainly not — the guard holds at runtime |

**So the guard prevents display, not distribution.** Nobody sees the list in the interface; anyone
can fetch the file.

**The source says this cannot happen.** `LoginView.vue:92-94`:

> *"`import.meta.env.DEV` becomes `false` at build time, so this branch and the module it reaches
> are eliminated. In a built app `demoAccounts` stays empty and the panel below does not render at
> all."*

The first half of that sentence is **not true of the current build**. The branch may be eliminated;
**the module it reaches is not.** This is the judgement log's own lesson in its purest form — *a
comment explaining why something is safe encodes a precondition, and the precondition can fail
silently while the comment keeps asserting the conclusion.*

**Was it always like this?** No. `TESTING_REHEARSAL.md` records that a clean rebuild on
**2026-09-17** carried no passwords and no resident addresses, *"checked both by the suite and by
hand."* It does today. The likely trigger is `b403e77`, *"fix(login): one-click demo sign-in reads
passwords from creds.txt"*, which changed how that module is produced — **but confirming the cause
belongs to whoever owns the build config**, and I am not asserting it.

**Raised as B-09.** Priority above everything else in this audit: it is live resident data in the
artifact the browser receives, and **BR-024 Tenant Privacy** is the rule it breaches.

> **`check:secrets` is not at fault and needs no change.** It caught this the moment a build
> existed to scan, and when none existed it said so plainly. See § 1.2 for how I missed that.

### D-1 — A resident is shown a bill that does not exist, with water at ₱0 · **money-facing**

**The resident portal shows, for a tenant with no bill on file:**

> **Latest bill** — Rent **₱4,500** · Water · *1 registered occupant* · **₱0**
> *Water is charged at ₱200 for each registered occupant every month.*

**The screen contradicts itself.** It states the rule, states the occupant count, and then prints a
figure that the rule cannot produce. Verified against live data rather than inferred: unit `1F` has
`occupant_count = 1` and `current_price = 4500`, and `/public/rates` returns
`waterRatePerOccupant: 200`. **1 × ₱200 = ₱200, not ₱0.** The tenant has **0 bills**, so there is
no bill to display at all.

**Cause, in `frontend/src/views/TenantOverviewView.vue`:**

| | |
| :--- | :--- |
| `:195` | when no bill exists, **rent falls back** to `activeRoom.rooms.current_price` |
| `:52` | **water has no equivalent fallback** and keeps its initial `0` |
| `:458` | the "No bill is on file yet" guard requires **both** `baseRent` and `waterFee` to be falsy — so once rent falls back, the guard can never fire |

**Why the checks did not catch it.** `check:liveness` asserts that loaders raise a flag, that flags
are rendered, and that hardcoded rate fallbacks equal the configured rate. **All true here.** It
does not assert that a *derived* money figure agrees with the rule printed beside it, and no check
does.

**Two ways to fix, and the choice is not mine.** Either compute `waterFee = occupants × rate` on
the same fallback path, or — better, and consistent with the project's own doctrine — **do not
present a bill that was never raised**: make the guard test whether a bill exists rather than
whether its numbers are zero. The second is the honest one; a bill nobody issued is not a bill.

**Not patched.** `frontend/src/` is being actively rebuilt, and the correct fix changes what a
resident is told. Raised as **B-07**.

### D-2 — `check:billing` passes every assertion and reports failure · **tooling**

39 assertions pass, it prints **`ALL CHECKS PASSED`**, and then exits **127** on a libuv teardown
assertion:

```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94
```

**Reproducible on all three runs.** Zero `FAIL` lines in the output. So `npm run check:all` reports
`FAIL check:billing` on Windows while every billing rule it guards is satisfied.

**Why this matters more than it looks.** This project's doctrine is *read the summary table*. A
suite that is permanently red for a reason unrelated to its assertions **teaches people to read
past red** — and a red check has already been committed past twice here for a different reason.

Raised as **B-08**. It is a Node/libuv teardown issue on Windows, most likely an open handle at
exit, not a defect in the billing rules.

---

## 3. Minor findings

| # | Finding |
| :-- | :--- |
| **m-1** | **The slur ticket is live on the dispatch board.** Migration `027` (B-05) is not a data tidy-up — the two junk tickets on Unit 1A are **visible in the product right now**, under *To dispatch*, one of them titled with the slur. This raises B-05's priority |
| **m-2** | **No 404.** An unknown path redirects to `/public` when signed out and to `/admin/overview` when signed in. A mistyped URL silently becomes the dashboard |
| **m-3** | ~~The first-visit viewing prompt does not close on `Escape`~~ — **withdrawn 2026-09-18. Not established, and probably not true.** See § Fourth pass |
| **m-4** | **Clearing site data does not end the session until reload.** In-memory auth survives, so the admin shell keeps rendering and `/login` bounces back to `/admin/overview`. A real sign-out is unaffected |
| **m-5** | `/category/:slug` and `/category/:slug/units` render **identical output** — two routes, one result |
| **m-6** | `NotificationsStore` logs an unhandled `Failed to load notifications` console error when the token disappears mid-session |

---

## 4. One question, not a defect

Unit `1F` carries `deposit_amount` **₱6,500** against a `current_price` of **₱4,500**, and the
residents table labels that column **"Advance rent"**. BR-039 sets the sum equal to the rent **at
move-in** (2026-07-01), so a later rate reduction would explain it honestly — `room_price_history`
would settle it in one query.

**Worth checking because the two figures appear on different screens**: the administrator sees
₱6,500 against that resident, and the resident sees ₱4,500 as their rent. Both can be correct and
still confuse someone reading them side by side. This also touches the **OD-04** work closed on
2026-09-18.

---

## 5. What this audit could not cover

- **Every write path.** 25 write endpoints, untested by design. `TESTING_REHEARSAL.md` is the
  instrument for those, it has never been run, and it is the largest remaining gap in the project.
- **A completed online payment.** Requires a tunnel and the shared webhook (B-03).
- **The failure states under a genuinely dead backend** — rehearsal step 23b.
- **Concurrency and volume.** Single operator, single session throughout.

---

# Second pass — re-audited and fixed, 2026-09-18

Re-run in full after pulling six further commits (`e53cbdd`). **All three defects reproduced exactly**, nothing new was broken, and the new `check:components` suite passes. Then fixed.

## All 18 suites now pass

```
secrets 0 · rules 0 · matrix 0 · copies 0 · canon 0 · writes 0 · columns 0 · fields 0 · endpoints 0
ledger 0 · reports 0 · adyen 0 · billing 0 · api 0 · tokens 0 · reachable 0 · components 0 · liveness 0
```

Endpoints re-swept: **35 / 35**. All eight admin screens re-walked: zero console errors, zero failed requests, now paginated as intended.

## D-0 — fixed, and it was worse than first reported

**The roster was not only in the bundle. It was tracked in git, and the repository is public** — an unauthenticated `api.github.com` request returns `"private": false`. **40 distinct real email addresses appear in tracked files**, 33 of them beside each resident's name and unit number.

**The cause was not the type import.** Removing it changed nothing: the chunk was emitted from the dynamic `import()` itself. **Rollup emits a dynamically-imported chunk while building the module graph, which happens before the dead branch is eliminated** — so `if (import.meta.env.DEV)` could never have prevented it. The comment asserting otherwise had been wrong since it was written.

**The fix is substitution, not elimination** — see the note at the end of this file: Sean landed the same fix independently and his is the one in the tree. The roster now lives in the gitignored `credentials/demo-accounts.json`; `vite.config.ts` reads it when serving and substitutes it through `define` as `__DEMO_ACCOUNTS__`, and a build substitutes `null`. **There is no module, so there is no chunk.** This mirrors the `__DEMO_PASSWORDS__` pattern that was already there and already working.

| Verified after the fix | |
| :--- | :--- |
| `demoAccounts` chunk in `dist` | **gone** |
| Any email address anywhere in `dist` | **none** |
| `check:secrets` | **exit 0**, *having scanned 6 built files* — it examined the build, not nothing |
| Dev sign-in panel | **34 buttons**, and signing in still works |
| `frontend/src/lib/demoAccounts.dev.ts` | removed from the working tree |

**What this does not fix: the history.** The file is readable in every commit that contained it. That is **B-10**, and it is a decision — repository visibility, whether to rewrite history against `AGENTS.md`'s warning, and whether the residents are told. **Not mine to take.**

**A handover follows from it:** `credentials/demo-accounts.json` travels person-to-person like `creds.txt`. Without it the demo panel does not render; nothing else changes.

## D-1 — fixed

`TenantOverviewView` now carries `hasBill`, set from the bills response rather than inferred from whether the amounts happen to be zero, and the panel asks that question instead. **Both branches verified:** no bill → *"No bill is on file yet."*; one bill stubbed into the response → the panel renders its own **₱4,500 rent and ₱400 water**.

## D-2 — fixed and mutation-tested

`process.exit()` → `process.exitCode`. The Supabase pool `billingService` opens was still closing when the process was torn down. Now **exit 0 in about four seconds**. Mutation-tested as the project requires: one expectation broken → **exit 1** and `1 CHECK(S) FAILED`; reverted → exit 0.

## One thing my own fix broke, and what it showed

`check:reachable` went red on the new types file, because my doc comment **quoted a literal import line** and the check scans source text for import specifiers without exempting comments. I reworded the comment rather than relax the check: **that strictness is what stops a commented-out import being quietly uncommented later.** Worth knowing when writing comments in this codebase.

## Also repaired

`CLAUDE.md`'s *Where things are written down* table — an earlier edit of mine inserted a paragraph between two rows, which ended the table early and orphaned the five rows below it.

---

# Note on D-0: Sean fixed it independently, and his is the one in the tree

While I was fixing D-0, Sean pushed **`ba3b82a` — *"take 33 residents out of the repository, not just out of dist"*** — the same diagnosis and broadly the same design, arrived at separately. My version was discarded rather than merged; **his is canonical** and it is wider than mine was:

- the roster moved to the gitignored **`credentials/demo-accounts.json`**, read by the vite plugin and substituted through `define`, exactly as `__DEMO_PASSWORDS__` already was;
- `demoAccounts.dev.ts` **kept but gutted** — it merges `__DEMO_ACCOUNTS__` with `__DEMO_PASSWORDS__`, both `null` in a build. The chunk is still emitted and is now **empty of personal data**, which is what matters;
- **`scripts/check-secrets.mjs` hardened (+93 lines)** so it scans *tracked files*, not only the build. That is the better half of the fix: it is what would have caught this in the repository rather than in `dist`.

**Verified on his tree:** no email address anywhere in `dist`, `check:secrets` exits 0, the dev panel still offers 34 buttons and signs in, and **all 18 suites pass**.

Two things follow. **`credentials/demo-accounts.json` must be sent machine-to-machine like `creds.txt`** — without it the panel silently does not render, which is exactly what happened on this machine until the file was put in place. And **the git history is still untouched** — that remains **B-10**, and it is a decision rather than a change.

*Worth recording plainly: two people fixed the same privacy defect within an hour of each other without knowing it. That is the cost of not claiming an item in the queue before starting on it.*

---

# Third pass — `verify:rbac` had been dead since 13 September

Not in the original audit because **`verify:rbac` is not one of the 18 suites** and `check:all` does not run it. It was found while doing the mechanical half of **B-10**, and it was the most valuable thing in this pass.

## It could not sign in at all

`database/verify-rbac.mjs` hardcoded `Hivelet@Admin2026` and `Hivelet@Tenant2026`. **Those were rotated on 2026-09-13**, so from that day every sign-in returned 401:

```
before   21 passed, 3 failed     ← all three failures were 401s
after    53 passed, 0 failed
```

**The quiet half is worse than the loud half.** The assertion *"deactivated tenant CANNOT sign in"* was still being counted — and a burned password makes it fail for the wrong reason. The account was refused because the password was dead, not because the account was deactivated. **An assertion that cannot tell those two apart is not checking BR-025 at all**, and it had been in that state for five days.

## And a second assertion that could not see what it was testing

With sign-in working, one check failed: *tenant CANNOT self-promote to admin via PATCH /auth/me*. **The system is correct** — verified independently: the PATCH returns **422**, and **zero profiles hold `role = 'admin'`** afterwards.

**The assertion was wrong.** It read `escalate.payload?.data?.role`, and that endpoint does not echo `role` at all, so the field read `undefined` and the check reported a privilege-escalation failure that had not happened.

> **The direction that matters is the other one.** Had the endpoint replied with a polite `role: 'tenant'` while writing something else, **the old assertion would have passed on the echo and never looked at the account.** An escalation check has to read the state after the attempt, not the reply to it. It now re-reads `/auth/me` and asserts on the stored role.

**Mutation-tested**, as this project requires: inverted to expect `admin`, it fails with *role reads tenant* — so it is genuinely reading the role rather than passing vacuously.

## Both fixes also removed real addresses from the repository

The script now **discovers** its accounts — passwords from the gitignored `creds.txt`, and one active plus one deactivated resident found through the admin API. It names nobody in source, and it keeps working when the roster changes.

`database/README.md`'s *Seeded credentials* table went the same way: it listed the two burned passwords beside six addresses, four of them residents'. Replaced with a pointer to `creds.txt` and `demo-accounts.json`.

| B-10 noted addresses | |
| :--- | ---: |
| before | **19** |
| after | **11** |

**The 11 that remain are the ones that should not be touched by a script:** six in `FULL_DATABASE_SCHEMA.sql`, which **CLAUDE.md rule 2 forbids editing**; two inside dated records of what happened, where a stand-in would alter the record; and three team accounts that are not residents'. **All 18 suites pass, and `verify:rbac` exits 0.**

---

# Fourth pass — exercising the controls, and withdrawing a finding

The first audit checked that screens **render**. It never touched the controls on them. This pass
drove search, filters, pagination and modals across the admin screens. **Two real defects, both
fixed; two suspicions that were my own testing artifacts; and one finding withdrawn.**

## Fixed

| | |
| :--- | :--- |
| **"8 of 626 entrys"** | `ShowMore.vue` pluralised by appending a bare `s`. Correct for *payment* and *row*, wrong for *entry* — on the income ledger and the audit trail. Now handles consonant + y → *-ies* and sibilants → *-es*, leaving *days* alone because *day* is vowel + y |
| **`Every year` listed twice** | Both options carried `value="All"`: `yearsList` already begins with `All`, and the template added a hardcoded option above it |

## Verified working, and worth recording because nobody had tested them

Residents: search matches across **name, unit and phone**, with a real empty state
(*“Nobody matches…”*); the four filters return **44 / 39 / 4 / 1**, matching the totals; pagination
runs **10 → 20 → 44** and **resets to the first page when the filter or the search changes**, which
is the behaviour you want. Income ledger: cluster, month and year filters compose correctly
(**626 → 230** for 2024 → **22** for Linda), and the empty state renders.

## Three things that looked like defects and were not

**Recording these because the checking is the point, and because each one would have been a false
report in a document the group relies on.**

1. **Month buttons reading `JJan`.** A responsive pair — one `<span>` for narrow screens, one for
   wide, only ever one visible. `textContent` concatenates regardless of CSS. The pane reports
   `viewportWidth: 0` when hidden, so everything resolves to the mobile variant.
2. **The income ledger appearing to have no empty state.** It has one. My search pattern looked
   for `no match` and the text reads *“No collection **matches** what you have asked for”*.
3. **`Escape` not closing modals.** My first test dispatched the event on `document`, which never
   reaches a listener bound inside the dialog. Dispatched from the focused element, the admin
   `WsModal` **does** close.

## m-3 withdrawn: Escape on the public prompt

`BookViewingPrompt` is a **native `<dialog>`** and Escape-to-close is the browser's own behaviour,
not a JS listener. Checked, and every one of these says the component is correct:

- `:modal` returns **true** — it is genuinely in the top layer
- content outside it is **inert**; focus is contained inside
- `@cancel` only records the dismissal and **never calls `preventDefault()`**
- real key events **do** reach the page — a listener logged `Escape` and `a`

**And the dialog still did not close.** The most likely explanation is not a defect in the
component but a limit of the tooling: closing a modal `<dialog>` on Escape is a user-agent action,
and injected key events do not reliably drive user-agent actions even when the DOM event arrives.

**So it is withdrawn rather than confirmed.** It needs a person pressing the key on the public
landing page — ten seconds during the rehearsal. **What I can say is that the code is right; what
I cannot say is that the behaviour works.** Those are different claims and this audit should not
conflate them.
