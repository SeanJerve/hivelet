# Handoff — QA and Systems Analysis (Eljohn)

**Eljohn Paulo C. Loterte.** The repository still records you as Frontend / UI-UX and Kiel as
QA — **you and Kiel have swapped**, confirmed 17 Sep. Kiel owns the interface now; you own
whether any of this actually works.

Hivelet runs the **Fe Galang Da Silva Boarding House**. The database is live: **937 income rows,
1,327 expense allocations, 33 units with 32 occupied.** The boarding house's books are in it, and
Michelle runs them as the administrator. There is no staging copy.

---

## 0. For the professional testers and technical evaluators (2026-10-01)

- **Tenant account for evaluation: `loydtest`**, login ID **HV-86225**, in unit `PH` (migrations 071,
  073, 075). The team hands over its one-time password (Tenants > Edit > Reset password shows a new
  one). At first sign-in it asks for an email, a mobile number and a new password: that is the
  feature (every tenant gives their own), not a fault. The admin account is Michelle's and is used
  only with her or the team present.
- **What a tester will see:**
  - Payments: a month with no payment entered reads **Not entered**, never overdue. Only a bill
    actually raised is Due.
  - Invoice numbers read `INV#…`, or **Acknowledgement receipt** for a slip with no number.
  - Water is worked out from the occupants and never typed.
  - Pages update within a few seconds without a refresh (they check every 2 s while visible).
- **GCash** runs on Adyen's test account: no real money moves. Reject any GCash payment in the
  To verify queue.
- **Do not** run active scanners, password guessing or form-filling spiders against the live site.
  It holds real records, and five wrong passwords lock an account for 15 minutes.

## 0a. Re-test on a real phone: the 1 Oct evening changes

Mostly frontend, on `main` (`ed54996` on 1 Oct; the 2 Oct rows below up to `1a0d3d1`), and
was checked only in headless Chrome with touch emulation (375×812, 320×640) against a local build.
**None of it has been tried on a real phone.** Read-only checks; the
only writes are the ones the steps name.

| What | How to check it | Pass |
| :--- | :--- | :--- |
| **Overview + button** (`QuickActionsFab`) | Admin Overview on a phone, below 768 px wide | A green **+** sits bottom right; tap it: Record payment, Record expense, Move someone in/out rise above it and the + turns to an X. Tap outside, the X, or pick one: it closes. The last tile is not hidden under it. From 768 px there is no + and the three are header buttons |
| **Year word** | Tap "2026 ⌄" beside the date | The year menu opens fully on screen; picking 2025 shows the archive and **Back to 2026** |
| **Filters** | Each list: Rooms and rates, Tenants, Monthly Income, Monthly Expenses, Repairs, Inquiries, tenant Payments, tenant Repairs | Changing a choice in the dialog changes nothing behind it until **Apply filters**; X or the backdrop throws the choice away; **Reset** only resets the dialog. After Apply, the button shows a count and the line under the bar names the filters, with **Clear**. Search still works at 320 px |
| **Show as** (2 Oct) | Rooms and rates, Tenants, Monthly Income (the lists drawn two ways) > **Filters** | **Show as** sits at the top of the dialog (By cluster / As a list); there is no separate switch on the bar. It too waits for **Apply filters** |
| **Month card, year beside it** (2 Oct evening) | Monthly Income and Monthly Expenses, freshly opened | The dark card is this month: "Received, October 2026" (rent, water, 50% Share) / "Spent, October 2026" (utilities, repairs and cleaning). Beside it, "Where it came from, 2026" / "Where it landed, 2026": the year's total and a bar by cluster / by area. **Filters** > **Month** moves the dark card to that month; **Filters** > **Year** > **All years** turns the side card to every year. No "These figures are for..." line. A month just begun can read ₱0 with "Nothing entered yet" |
| **Download dialog** (2 Oct) | **Download** on Monthly Income, Monthly Expenses, and Tenants' history | A dialog asks **Month** (month and year), **Year** or **All**, opening on what the screen shows, and names the file before you press. Names: "Monthly Income March 2026 only - MI032026" (a ledger's single month ends in "only"), "Monthly Income 2025 - MI2025", this year's named for the current month as before, "Monthly Income All Years - MIALL"; tenant history "Tenant History June 2025 - TH062025" (no "only"). Arrow keys move between Month / Year / All |
| **Pull to refresh** (changed 2 Oct) | Installed app (home-screen icon) only, at the top of a page | Pulling down turns the green hexagon with the pull; release past the threshold and it keeps turning until the data is back, with grey skeletons over the figures meanwhile. The page refreshes **in place**: no blank page, no full-screen loader, scroll position kept. On the public pages and the sign-in page (2 Oct evening) there are no skeletons: the page stays as it is while the hexagon turns, then reloads whole. Not inside an open dialog, not on a sideways table swipe. In a browser tab, the browser's own pull-down is used instead |
| **Order** (2 Oct) | **Filters** on every list: Rooms and rates, Tenants, Monthly Income, Monthly Expenses, Repairs, Inquiries | An **Order** choice: By unit / By name (A to Z) / Newest first / Oldest first, as fits the list (Repairs adds **Most urgent first**; Tenants by name or by unit). Units sort 1a, 1b … 2a, not 1a, 10, 2a. Waits for **Apply filters** like the rest |
| **Group by** (2 Oct) | Monthly Income > **Filters** > **Group by** | **Cluster** (default), **Unit**, **Tenant (A to Z)**. Choosing Unit or Tenant switches to the grouped view; totals do not change, only the grouping |
| **Boarding House** (2 Oct) | Overview "Units by cluster", Rooms and rates, Tenants, Monthly Income filters and tables, downloaded income workbook | The 22 main rooms read **Boarding House** everywhere; no stray "BH" a person can read (`BH` remains the stored code). The workbook subtotal reads "Boarding House (Main Rooms) subtotal" |
| **Floor plan in the unit editor** (2 Oct) | Rooms and rates > pencil on a unit with no photograph | The picture is labelled **Floor plan** and is the same image the public unit page shows; **Replace photo** is offered. No eye (preview) button on unit cards or rows |
| **Delete** (2 Oct) | Inquiries: **Delete** on an inquiry. Repairs: the bin beside **Manage**, or Manage > **Delete repair**. **Use a test entry you created yourself** | A confirmation names the entry and says it cannot be undone; Cancel leaves it; confirming removes it from the list and it does not come back on reload. **This writes to the live database**: only on your own test entry. Inquiry delete exercised on the live site by the team, 2 Oct evening |
| **Download cancel** (2 Oct) | Chrome or Edge on a computer: **Download**, then **Cancel** in the Save window | Nothing is said (no "Report downloaded"); saving says **Report downloaded**. On a phone the message is **Download started** |
| **Workbook look** (2 Oct, backend) | Open the downloaded Monthly Income, Monthly Expenses and Tenant History workbooks | Income: cluster subtotals light blue, GRAND SUBTOTAL red with white type, acknowledgement receipts read **ACK**, no Linda note lines or OD-01 note. Expenses: each month's TOTAL light blue (ledger columns only), YEAR TOTAL red with white type, no OD-05/06/07 note at the foot. Tenant History (one month): **ACK** in the Invoice column. Figures unchanged |
| **Page titles** (2 Oct evening) | Open several pages in browser tabs; then the installed app | Each tab reads the page's name and "· Hivelet" ("Monthly Income · Hivelet", "Page not found · Hivelet"); the landing page reads "Hivelet". In the installed app every page is "Hivelet" alone |
| **No skeleton on landing / sign-in** (2 Oct) | Reload the landing page and the sign-in page | The real page by about 100 ms; no grey placeholder bars over the hero. Signed-in pages still show skeletons while their data loads |
| **Offline** (tenant and admin; widened 2 Oct) | Installed app, signed in. Online, open each main screen once (admin: Overview, Tenants, Monthly Income, Monthly Expenses, Repairs, Inquiries; tenant: Overview, Payments, Repairs, My details) and the bell. Then airplane mode, close the app fully and reopen it on each screen | Under the "No connection" bar, ONE line **"Saved figures from <time>"**; every screen shows its names and figures (admin: this year's money, the tenant list, both ledgers, repairs, inquiries; tenant: rent, balance, due, receipts, requests, details) and the bell its notifications and unread count, with no "could not be loaded". Not offered: the Overview's + and header actions, **Pay with GCash**, **Mark all read**; greyed ("Needs a connection"): Record payment, Record expense, Move someone in, Send request (it reads "Sending needs a connection"), Save, and since 2 Oct (`03f4bbb`) **Save reply**, **Close inquiry** and the buttons in Manage this repair / Log a repair. Airplane mode off: the line goes and the screens reload by themselves within a few seconds. Signing out removes the saved copy (reopen offline: "could not be loaded", nothing old); another person signing in sees none of it. Essential figures, names and notifications only: no photos, no repair or inquiry conversations (an inquiry opened offline shows its first message and "The replies already on record could not be loaded": expected, not a defect). **Machine run 2 Oct** (production build + service worker, stub API, 375 px): admin 24/25, the one being that expected inquiry line; tenant 15/15. **On the live site, 2 Oct evening** (fresh headless Chromium, no sign-in): the worker installs and controls the page, then offline with a cold reload `/`, `/login`, `/rooms`, and the deep links `/admin` and `/tenant` all come from the worker (to the sign-in page, as nobody was signed in). An installed app that showed Chrome's own "You're offline" page before the challenge was lifted needs **one online open** (wait about 10 s, close) to take the current worker |
| **Loader** (rule set 2 Oct evening) | Clear site data, open the site; reload the landing page, the sign-in page and a signed-in screen; then leave it 30+ minutes and open it again (the installed app too) | The hexagon turns in the middle, on the page's own background (light, or dark in the dark theme), on the first visit, on opening after 30+ minutes away, and on reloading a public page or the sign-in page. Reloading an admin or tenant screen during a visit shows no hexagon: that screen's skeletons instead. No dark green field anywhere. Checked on the build in 8 cases (first visit, back within 30 min on admin/tenant/landing/sign-in, away 2 h on admin and on `/`) |
| **Back button** | Open Record payment (or the unit editor, or the phone menu), press the phone's Back | The page goes back and the dialog or drawer is gone with it; the page scrolls normally |
| **Toast tap** | Cause any message (a refused save, Signed in) | One tap on the message closes it, and the next tap reaches the button that was under it |
| **Notifications** | The bell | One header line: filter icon, refresh icon, X; **Mark all read** at the bottom |
| **Ping** | Save something; have a second device change something | One ping per save, one per change from the other device; none for Signed in |
| **Dark mode** (added 2 Oct) | Initials > Appearance > Dark, then reload; set System and switch the phone's own dark setting; public pages: sun/moon at the foot | Dark from the first frame (no white flash, loader dark too); the choice survives a reload; System follows the phone without a reload; every screen and dialog readable |

**B-94: the challenge is off as of the evening of 2 Oct** (checked from a cloud session: `/`,
`/public`, `/sw.js`, `/api/health`, `/api/public/rates` and all 64 precache files answer 200 with no
`x-vercel-mitigated` header). If it comes back: since about 22:30 on 1 Oct every request to
`hivelet.vercel.app`, `/api` included, could land on Vercel's **"We're verifying your browser"**
checkpoint (`BLOCKED_FOR_SEAN.md` B-94). A tester's first visit will show it for a few seconds; that is Vercel, not Hivelet, and it
is not a finding against the system. **The risk is the Adyen webhook**, which cannot pass a browser
check: until the Vercel owner turns the challenge off or exempts the webhook path, do not treat a
GCash payment that never reaches To verify as a Hivelet defect. Note the time and tell Sean.

---

## 1. The one sentence that defines your job

> **Eighteen automated suites pass. No human being has ever clicked through this system.**

Every claim made about Hivelet this week was verified through the API or against the database.
Not one write path — recording a payment, raising a bill, closing a ticket, vacating a tenant —
has been exercised by a person through the interface.

That gap is exactly what testing week measures, and it is yours to close.

---

## 2. Start here: `TESTING_REHEARSAL.md`

26 steps, about forty minutes, **every write path once**. It runs on `PH`, the only vacant unit,
with a fake tenant, and every writing step carries an Undo.

**Tick the boxes in the file as you go and commit them.** A half-filled sheet is evidence; an
unfilled one is not.

Three steps matter more than the rest:

| Step | Why |
| :--- | :--- |
| **19** | Records the same receipt twice. It must be **refused**. If it accepts, the ledger can double-count and the duplicate guard is broken |
| **23b** | With the dashboard open, **stop the backend** and reload. Every money tile must show **—**, never ₱0.00, and Net Operating Income must not equal Gross Inflow. Before 17 Sep it showed a whole year's takings as profit |
| **18** | Records an on-site collection. Set the **occupants** and check the water is occupants × ₱200 (it is computed, not typed); the invoice number is optional. The garbage fee was removed on 30 Sep (066) |

**Read "What this rehearsal cannot tell you" at the end.** It is the honest list of what forty
minutes does not cover — concurrency, volume, and a completed GCash payment.

---

## 3. What the suites do and do not prove

```bash
npm run check:all 2>&1 | grep -E "^  (pass|FAIL)"
```

**Read that summary table, not the tail.** `| tail` shows the end of whichever suite ran last, and
a red check has been committed past that way twice.

| | |
| :--- | :--- |
| `check:api` | 76 endpoint, RBAC, perimeter and input checks. **Performs no writes** — deliberately safe against production |
| `check:ledger` | Arithmetic and plausibility over the live money. Re-derives every remitted amount and 50% figure on all 937 rows |
| `check:reports` | 490 assertions. Both workbooks against the database, month by month, every year |
| `check:billing` | Water, period and receipt-allocation arithmetic |
| `check:adyen` | 29 HMAC signature checks, no network |
| `check:writes` | No database write discards its result |
| `check:columns` `check:fields` `check:endpoints` | Schema, field and route reachability |
| `check:canon` `check:rules` `check:matrix` `check:copies` | Wording and register consistency |
| `check:tokens` `check:reachable` `check:liveness` | The interface. Kiel's lane, but they are yours to run |

**How many run depends on what you have, and `CLAUDE.md` holds those figures** — read them there
rather than from this paragraph, which said "twelve / fifteen / all eighteen" while three other
documents gave three further answers and the runner itself said nineteen. The authority is the
`SUITES` array in `scripts/check-all.mjs`; everything else is a copy, and the copies drifted.

`.env` and `credentials/creds.txt` are what unlock the fuller tiers. Neither comes down with a
pull; ask Sean for both. `creds.txt` also powers the one-click demo sign-in buttons on the local
login page.

> `check:liveness` runs **4 of its 7 rules without a backend and still exits 0**, printing `note:`
> lines about what it skipped. Read the notes, not the exit code.

---

## 4. The lesson most useful to a QA lead here

**A check can pass having examined nothing.**

Proved on 17 Sep by copying two suites somewhere their input tree was empty. Both went green:

```
check:writes   exit 0   "every write declares what failure means"   — having read ZERO files
check:canon    exit 0   "the locked wording stays locked"           — having read ZERO files
```

Those guard every database write and the locked wording respectively. Both now refuse to pass on
an empty scan and report what they read — *"(32 source files read)"*, *"623 files read"*.

**Point this at anything you are handed.** The question is never "did it pass" but "what did it
examine, and would it have said the same having examined nothing".

**There was a live example of exactly that, in `check:api`. It is fixed, and it will come back on
any machine that lacks one gitignored file — so the shape is worth keeping in mind.**

The suite discovers a tenant login by reading **`database/seeded-tenant-credentials.json`** —
gitignored, and absent on at least one machine. With the file missing, the login loop never runs,
and two blocks sit behind `if (tenantToken)` with **no `else`**: the **8 `/tenant/*` endpoint
checks**, and the **1 isolation check** — *a tenant must not reach admin data*, which is the
single assertion proving RBAC holds.

**Skipped checks are not counted as failures.** The only thing in the output that says a third of
the suite did not run is one line:

```
TENANT (none found) - token FAILED
```

So **read the total, not just the zero.** A lower total with `0 failed` means checks were skipped,
not passed. If that line says `none found`, ask Sean for the file — and **do not commit it.**

**Measured on 2026-09-18:** without the file the suite reported **58 passed, 0 failed**; with it,
**76 passed, 0 failed**. Eighteen checks were not running, and one of them was the assertion that
proves a tenant cannot reach admin data.

*The generalisable form: an absent input that disables an assertion looks exactly like an
assertion that passed.* When you write a check, make a missing precondition **fail**, or at
minimum print a count that does not add up.

**The companion discipline: mutation testing.** A check that has never failed on purpose has not
been verified. Break each shape it claims to catch in a real file, confirm it fails, revert in a
`finally`. Three times on 17 Sep the *plumbing* of a mutation test was wrong rather than the rule
— once it inferred "caught" from an exit code that a server restart had produced. **Assert on the
specific message, not the exit code.**

---

## 5. The seven receipts, and why they are pinned rather than fixed

> **Update 2026-09-28.** Sean decided on 2026-09-26 that historical records stay exactly as she
> wrote them (`CLIENT_MEETING_QUESTIONS.md` § 1, closed), so nobody is taking these to her now.
> `check:ledger` pins **five** today, reported every run so they are never mistaken for the
> system's own errors. The mechanism below is unchanged; only the "waiting for an answer" is gone.

`check:ledger` found seven entries in the owner's books that **cannot be right as written** — two
impossible dates, three rent periods ending the day before they start, two invoice numbers used
twice. It pins them by invoice number and prints all seven on every run.

Its header says why: *"correcting one means knowing what it should say, which is hers to tell us,
not ours to infer."*

**Anything not on that list of seven fails the run immediately.** So a typo entered during your
rehearsal is caught on the next run, while the historical seven wait for an answer. Loyd is
putting them to his mother; when one is corrected, `check:ledger` **fails** saying the row is
pinned but now reads clean. **That failure is the confirmation the fix landed.**

---

## 5b. The systems-analysis half of the title

Your role is **QA and Systems Analysis**, and the second half is not test work. It is getting what
only Mrs. Da Silva knows out of her head and onto paper, and keeping the record of it honest.

**The authoritative list of what is genuinely unresolved is
`docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md` (OD-xx).** **Not**
`docs/08_OPEN_DECISIONS.md` — despite its filename, everything in that file is *closed*, and it
carries a banner saying so.

**`CLIENT_MEETING_QUESTIONS.md`** is the sheet for her: the seven receipts, five accounting
habits, three quick confirmations, and four things her public website tells strangers that nobody
has confirmed.

**Two rounds of answers came back on 17 Sep and are recorded in `CLIENT_ANSWERS_2026-09-17.md`**,
which also carries the findings still open — the grace period (resolved: late on day one, with a
week before she presses), the deposit (**contested**, see below), rent and water paid separately,
and the fact that **nothing in the system tells a resident their rent is due or late.**

> **The one to know about: `OD-04` is CONTESTED, not settled.** The owner described the move-in
> sum one way on 13 Sep — cited in live code at `backend/src/routes/admin.ts:800` **with that
> date** — and differently on 17 Sep. **Both answers are recorded and neither is discarded.** One
> question separates them, written up at `PHASE1_OPEN_DECISIONS_REGISTER.md` § 1.5. **Nothing is
> to be designed or built from either until it is asked.**

**How to record an answer**, and this is the part that has cost this project most:

- **In her words, next to the question. Never paraphrase a number.**
- **If she contradicts something written down, write down both and flag it.** The contradiction
  is the finding. *Resolving it by picking one is how eight business rules were recorded wrongly.*
- **Say how you know.** A relayed, dictated answer and a minuted one are not the same evidence,
  and the record should say which it is.

---

## 6. Where to look when something is odd

| | |
| :--- | :--- |
| `docs/13_AUDIT_JUDGEMENT_LOG.md` **§ 3** | **Read before reporting a bug.** Several things that look wrong are deliberate and say why: bills raised on demand, the receipt guard being code-only, Linda excluded from grand totals, the lockout message that enumerates accounts |
| § 2 of the same file | The defect classes worth re-running, and the ten sweeps that found them |
| `docs/SCREEN_CONTRACT.md` | Every screen, every call, which ones write. **Read the totals off its own footer** — it is generated, so a figure quoted elsewhere goes stale |
| `docs/02_BUSINESS_RULES.md` | The rules themselves |
| `BLOCKED_FOR_SEAN.md` | The queue. **Add to it rather than stopping** |

**The recurring lesson**, and it applies to test plans as much as code:

> A comment explaining why something is safe encodes a precondition. When the code around it
> changes, the precondition can fail silently and the comment keeps asserting the conclusion.
> **Read them as claims with a date on them, and check the date.** On 17 Sep that caught four
> "open" items that were already done, and one comment that was exactly backwards.

---

## 7. Working here

- **Never stop because something is out of reach.** Write it into `BLOCKED_FOR_SEAN.md` with
  enough detail to act on cold, and move on.
- **Pull before you start and before every push.** Three accounts share this repository: backend
  and database, `frontend/src/` (Kiel), documentation (Vince). You range across all of it — so
  pull often.
- **Report what you verified against, not that you verified.** "It typechecks" is not
  verification; `vue-tsc` exits 0 on a component that does not exist.
- **Ask rather than decide.** A failing test is a question until someone confirms what the
  behaviour should be.

**Start by running `npm run check:all`, then open `TESTING_REHEARSAL.md` and do it.**
