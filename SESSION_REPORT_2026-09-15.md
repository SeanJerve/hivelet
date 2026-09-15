# Hivelet audit — session report, 2026-09-15

> **This is a dated snapshot of one working session, not a statement of current state.**
> It was accurate when written and will go stale the moment work continues — which is the
> exact failure this session spent its time correcting elsewhere, so it is labelled rather
> than left to be mistaken for live truth. The durable homes for this material are
> `docs/13_AUDIT_JUDGEMENT_LOG.md` (the reasoning and the failure modes) and the individual
> commits named below (the evidence). If those disagree with this file, they are right.

> **NEEDS YOU, NOT ME — there is an abusive entry in the live inquiries table.**
>
> One of the two live inquiries was submitted through the public enquiry form on **25 Aug
> 2026** for **unit 1a**, and its `prospect_name` and `prospect_email` are a **racial slur**.
> It is `status = 'Pending'`, it has one message on its thread carrying the same name, and it
> **renders in the admin Inquiries inbox** - which means it would appear on screen in a
> capstone demo.
>
> Row id `82f74d64-724d-4c2e-b436-f6271f3b1992`, plus its one `inquiry_messages` row.
>
> **I have not touched it.** Deleting rows from the owner's live database is yours to
> authorise, and this is her data. Say the word and I will remove both rows in one
> transaction; or delete them yourself. It is the only inquiry that is not Rhea Mendoza's, so
> there is no risk of losing a real lead.
>
> Worth knowing either way: the public enquiry form validates format, not content. Nothing
> stops the next one.

> **LATEST - commit `de8c0d4`: two registers in your own repository disagreed about the same
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

**92 commits, all pushed to `main`. Working tree clean.**
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
