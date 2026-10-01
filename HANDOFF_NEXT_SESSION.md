# Handoff: what Sean asked for, what is done, what is left

Written 2026-10-01 by Sean's Claude, for whichever Claude picks up next (Lloyd's machine). Sean's
session ran out of room. **The site goes to professional QA testers and technical evaluators next, so
everything below "Left to do" has to be finished, not noted.**

**Sean, 2026-10-01: "address everything".** That means the items below and anything else you find: design problems, backend and logic problems, wrong wording. Fix it, verify it, commit it. Only real-world facts go to Sean.

Read `CLAUDE.md` first. Its five rules apply to everything here.

---

## 0. Start here

1. `git pull`. If `database/migrations/071_loydtest_is_the_evaluation_account.sql` is not in the tree,
   Sean's last commit did not get pushed. Ask Sean to push it. The migration is **already applied** to the
   live database. Only the file is missing.
2. The next migration number is **072** (Lloyd's 070, voiding the walkthrough expenses, was **applied 1 Oct 07:40** through the Supabase MCP connection on Lloyd's machine, B-91). Check `database/migrations/` anyway.
3. Lanes: `docs/` and `frontend/src/` are this machine's. `backend/src/` and `database/migrations/` are
   Sean's. If something below needs a backend change, keep it small, pull first, and commit it on its own.
4. Do **not** run `check:all`, `check:api` or `check:relations`. They sign in as the owner and write to
   her Activity log. Run the suites that do not sign in: `check:canon`, `check:rules`, `check:endpoints`,
   `check:writes`, `check:fields`, `check:columns`, `check:ledger`, plus the frontend build.
5. Claude cannot type passwords or sign in. Anything that needs a signed-in person goes to a person. Say
   exactly what to click.

---

## 1. What Sean asked for (30 Sep, after the testing day), and where each stands

| # | Sean's instruction | Status |
| :- | :- | :- |
| 1 | Change every tenant's email to a placeholder | **Done**, migration 067. 32 tenants now read `tenant-<10 hex>@hivelet.invalid`. The old emails are kept in that migration's audit row. |
| 2 | At first sign-in, force tenants to change **both** email and password | **Done**. `/auth/me` and login return `mustCompleteContact`. `App.vue` opens the forced modal until both are set. |
| 3 | Tenants change their own email, phone and password any time. The admin never touches those. The **name** is the admin's and never changes on the tenant side | **Done**. Tenant profile edits them. Admin Tenants shows email and phone read-only for existing tenants. |
| 4 | Everything updates in **real time** on admin and tenant, no refreshing | **Done**. `GET /api/live/version` (migration 068, SQL function `live_version`) every 5 s while the tab is visible. `frontend/src/lib/live.ts` reloads the shared lists plus each page's `useLiveRefresh` loader, quietly (no skeletons). **Not yet proven on two real devices**, see 3.6. |
| 5 | The notification sound on important events, admin **and** tenant | **Done**. `frontend/src/lib/sounds.ts`: `notify` for new notifications, `success` on every success toast, `problem` on every error toast. |
| 6 | Fix wrong totals, and make the screens easier to read and navigate (the landlady could not tell which figure was which, it felt crowded), tenant side too | **Partly done.** Totals no longer include the garbage fee, and tenant amounts show the remitted amount only. **The readability pass has not been done.** See 3.2. |
| 7 | GCash sandbox is fine | Nothing to do. Adyen with GCash is committed, configured and working. |
| 8 | Remove the **garbage fee** entirely: front end, back end, database, data | **Done in code and database** (066: column gone, 531 rows, ₱10,620; Remitted unchanged at ₱8,222,900.00). Monthly Income export is now 11 columns. **The docs still describe it**, see 3.4. |
| 9 | No "OR" anywhere. It is "invoice", written INV, and optional because not every payment has one | **Done on screens and in the database** (066: `invoice_number` nullable, 548 values rewritten as `INV#…`, 317 blanks; expenses use `invoice_supplier`). `normalizeInvoiceNumber` turns "OR#4726", "4726" or "invoice 4726" into `INV#4726`. **Some code comments still say OR**, see 3.5. |
| 10 | After recording income, guide her to what was recorded and what changed. The occupants recorded (water = occupants × ₱200) become the tenancy's rule, instantly | **Done**. `OnsitePaymentModal.vue`: occupants field, water computed and read-only, invoice optional. After saving, a "Payment recorded" panel with **See it in Monthly Income**, which opens that month and highlights the row. The backend updates the tenancy's occupant count when this payment is its latest period and audits it. |

Also done in the same stretch: Michelle as the admin's name (063), a greeting that follows the time of
day, the inquiry reply-back module (065: a private link plus a reference code, no sign-up), floor plans
that always load, badges that clear once seen and a dot on the bell, the PWA update fix, the trailer video.

**The evaluation account.** `loydtest` is the tenant account the evaluators will use. 069 wrongly switched
it off. 071 switched it back on and changed nothing else. It has no email on file, so at first sign-in it
is asked for an email and a new password. That is the feature, not a fault. It has **no unit** yet. **Sean decided (B-92): the evaluators use loydtest,
and it goes into PH.** A person does the move-in from Tenants (Claude cannot sign in). The admin account
is ready as it is.

---

## 2. What must not change

- The admin is **Michelle** (Lloyd's mother). The business keeps its name, but never present Mrs. Fe
  Galang Da Silva as the person to contact.
- 33 units, 32 of them occupied. With `loydtest` active, the admin's tenant count reads 33 against 32
  tenancies. That is expected for the evaluation (B-92).
- The **50% Share** wording is locked (CLAUDE.md rule 4). Copy it, do not rephrase it.
- Words on screens: **Tenant**, not Resident. **All**, not Every. One name per page. No decorative badges.
  Icons borderless and revealed on hover.
- No real-looking email addresses in anything that gets built (the pre-commit hook blocks them). Use
  `you@email.com`.
- Never repoint the Adyen webhook or generate a new HMAC key.

---

## 3. Left to do, in this order

> **Status, 1 Oct 2026 (Lloyd's Claude; each item's commit says what it was checked against):**
>
> | Item | State |
> | :--- | :--- |
> | 3.1 A-30 | **Fixed** (af2aab9): income loader's silent-empty path; reproduced and fixed against a stub API. Re-test once on the owner's laptop |
> | 3.2 Readability and totals | **Done for the labels**: Overview totals say "Rent and water …", for which month or year, Linda's included; Monthly Income's Remitted says rent + water; Monthly Income and Expenses each open with one line naming the period and the units counted. Totals checked against SQL per year (2024 3,211,000; 2025 3,048,400; 2026 1,963,500, all equal). Layout at 375 px: no overflow. A deeper "less on screen" redesign is not done |
> | 3.3 O-12 | **Mitigated** (70713f0). Re-test on the Infinix GT20 |
> | 3.4 Garbage fee and OR in docs | **Done** (8516cd5): BR-037 retired, BR-036 met by construction, 09 report 11 columns, live docs and Chapters 4/5 say invoice. History files untouched |
> | 3.5 OR in comments | **Done** (80eb831), backend comments committed on their own |
> | 3.6 Live updates on two devices | **Needs people** |
> | 3.7 Leftovers | **Done**: slips say phone sign-in (7588048), SCREEN_CONTRACT regenerated, CONTINUE_HERE 0.0 and HANDOFF_TO_QA §0 written |
> | 3.7b Not entered | **Done** (f1e99be): tenant screens, check:ledger (F2F August listed per B-89), manual, Chapter 4 |
> | New: acknowledgement receipts | **Done in code** (dd9e305); **migration 072 not applied** (B-93) |
> | 070 | **Applied** 1 Oct 07:40 (B-91) |

### 3.1 A-30: Overview money tiles show ₱0 offline (testing-day FAIL)

**FIXED 1 Oct (Lloyd's Claude, commit af2aab9).** Cause: `fetchIncomeRecords` read `res?.data || []`, so
an answer that was not a list became zero records with the failure flag still false; the other loaders
already treat that as failed. Reproduced with the old line against a stub API (banner beside ₱0, exactly
the testing-day picture) and gone with the fix. The other Overview figures, archive years and "Expected
each month" are all guarded by their flags; the tenant pages throw on a failed request. Re-test A-30 on
the owner's laptop once to close it.

Test A-30 in `docs/TESTING_DAY/results/A_ADMIN_Lloyd.md`: with the Overview open, disconnect, reload.
Expected: money tiles show "—", never ₱0. Seen: ₱0, plus the "Some figures could not be loaded. Try again"
banner.

Where: `frontend/src/views/AdminOverviewView.vue`. Each tile already swaps to `UnavailableNote` when its
`*FetchFailed` flag is set (`incomeRecordsFetchFailed`, `roomsFetchFailed` and so on, from `lib/systemState.ts`).
The banner appearing means **some** flag was true. The ₱0 tiles mean **the income flag was not**. So
find out why an offline reload leaves `incomeRecordsFetchFailed` false with an empty list. Suspects: the
service worker answering `/api` from cache or with an empty body, or the loader clearing its flag and
returning early. Reproduce with DevTools Offline and a real reload. Overriding `window.fetch` after the
page has loaded did not reproduce it.

Fix so that every peso figure on the Overview shows "—" whenever its source did not load. The same goes
for the archive-year tiles and "Expected each month". Then check the tenant Overview and Payments pages
for the same fault.

### 3.2 Readability and totals (Sean's instruction 6)

Screens: Monthly Income (`IncomeCollectionsView.vue`), Overview (`AdminOverviewView.vue`), and the tenant
Overview and Payments (`TenantOverviewView.vue`, `TenantPaymentsView.vue`).

- **Every total says what it adds up.** "Rent + water collected in September", not "Total". The landlady
  could not tell figures apart.
- **Check every total against the database** with read-only SQL: sums of `remitted_amount` and so on, for
  the same month and filters. Write down what you compared. A total that disagrees is a bug to fix, not a
  label to soften.
- **Less on screen.** Put the one figure she acts on first, and push secondary figures one level down.
  Don't add new colours, components or radii. Use the existing tokens, `OverviewTile`, `StatusPill` and
  `PillSelect`.
- Check at 375 px and at desktop width, with nothing overflowing.

### 3.3 O-12: the 45-second "cannot tell if it saved" message is late on Android (testing-day FAIL)

**Update 1 Oct (Lloyd's Claude): mitigated** in `lib/api.ts` (deadline re-checked on `visibilitychange`),
B-90. What is left is a re-test on the Infinix GT20.

`docs/TESTING_DAY/results/O_OFFLINE_Sean.md`, row O-12: on Android Chrome the message came after 60 to 80
seconds, not within 45. iPhone was on time. Find the save deadline (search `frontend/src/lib/api.ts` for
the 45 s timer). The likely cause is a timer that starts late or is throttled. Anchor it to when the
request starts, and let the check fire on the deadline even if the tab was briefly in the background.

### 3.4 The docs still describe the garbage fee

Around 14 files still mention it: `docs/02_BUSINESS_RULES.md` (BR-037), `docs/09_MONTHLY_INCOME_REPORT.md`
(the GBG column, now removed, so the export has 11 columns), `04_ARCHITECTURE`, `08_OPEN_DECISIONS`,
`11_FORM_FIELD_AUDIT`, `CODE_DOCUMENTATION`, and others (`grep -rli "garbage\|gbg" docs *.md`). Mark
BR-037 **retired by migration 066**, with the date and the figures above, instead of deleting it. Keep
`npm run check:rules` passing. Iteration history and audit logs are history, so leave their past tense
alone and add a line where needed.

Do the same for "OR" and "receipt number" in the docs. The term is now **invoice (INV)** and it is optional.

### 3.5 "OR" left in code comments

These are not visible to users, but Sean said none anywhere. Rewrite these comments to say invoice and
`INV#…` (the data now reads `INV#4895` and so on):

- `frontend/src/components/modals/OnsitePaymentModal.vue:481`
- `frontend/src/lib/systemState.ts`: around 568, 574 and 1043
- `frontend/src/views/TenantTicketsView.vue:316`
- `backend/src/routes/admin.ts`: 2537, 2783-2784, 2853, 2870-2871 (Sean's lane: comments only, commit on its own)

Leave alone: `invoiceNumber.ts` (it names "OR#4726" as an **input** it converts). Also leave the uses of
OR as the word "or" in `TenantManagementView.vue:1535` and `admin.ts:737` and `:869`.

### 3.6 Prove the live updates on two devices (needs people)

Admin signed in on one device, `loydtest` on another. Record a payment, reply to a repair, and reply to an
inquiry. Each should appear on the other device within about 5 seconds, with no refresh, and the tenant
should hear the notification sound. Write the result into `docs/TESTING_DAY/results/N_NEW_TODAY_unassigned.md`.

### 3.7 Small leftovers

- `scripts/reset-tenant-accounts.mjs` prints each tenant's email on the sign-in slips. Those are now
  placeholders, so the slip should say that the tenant sets their own email at first sign-in and sign in
  with the phone number, if phone sign-in is supported. Check `authService` before claiming it is.
- Regenerate `docs/SCREEN_CONTRACT.md` (`npm run contract`) after any screen change.
- Update `CONTINUE_HERE.md` section 0.0 with 066-071, live updates, invoices, and the evaluation account.
  Add the evaluation account and what testers will see to `HANDOFF_TO_QA.md`.

### 3.7b A missing payment always means "not entered yet" (Sean, 2026-10-01)

The system shows a payment as soon as it is entered. So no screen, check, export or document may call a
month with no payment missing, unpaid, owed or overdue because of the ledger alone. It reads **Not entered**.
Search the frontend, `check-ledger-integrity.mjs` and the docs for such wording and fix it. Bills a tenant
actually owes are a different thing, and they keep their Due status.

### 3.8 Unfilled testing-day result files (needs people, not Claude)

**Update 1 Oct (Lloyd's Claude): all filled** and cross-checked against the Activity log (read-only); rows
the log contradicted became NT, and each file says what changed. PR is NT throughout (nobody recorded
the prospect); N-01 and the real-phone rows of N-02/N-03 are NT. Chapter 4 Tables 10, 11, 11C, 11D and
§4.4.8 are filled from them. Don't make up results for the NT rows; re-run them if they are needed.

---

## 4. Decisions only Sean or the owner can make (in `BLOCKED_FOR_SEAN.md`)

- **B-92, decided**: loydtest goes into PH for the evaluation. A person does the move-in from Tenants.
- **B-89, decided**: F2F August is not entered yet. Missing always means not entered (3.7b).
- **064**, the expense-date correction: written and tested, not applied. Apply or not.
- `CLIENT_MEETING_QUESTIONS.md` for everything the owner decides.

---

## 5. How to report back

Commit in small pieces with real messages, and pull before every push. For each item above, say what you
changed and **what you checked it against** (a query, a screenshot at a stated width, a suite's summary
line). "It builds" is not a check. Anything you cannot reach goes into `BLOCKED_FOR_SEAN.md` with enough
detail to act on cold. Then move to the next item.
