# Hivelet audit — session report, 2026-09-15

> **This is a dated snapshot of one working session, not a statement of current state.**
> It was accurate when written and will go stale the moment work continues — which is the
> exact failure this session spent its time correcting elsewhere, so it is labelled rather
> than left to be mistaken for live truth. The durable homes for this material are
> `docs/13_AUDIT_JUDGEMENT_LOG.md` (the reasoning and the failure modes) and the individual
> commits named below (the evidence). If those disagree with this file, they are right.

> **LATEST - commit `7124861`: your tenant directory was counting a prospect as a resident.**
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

**58 commits on `main`. Working tree clean.** The last few - from `b11652d` onward - are committed locally but **not yet pushed**: the push was blocked here and needs you to run it (`git push origin main`).
Backend up on :5000, `rlsLockdown: "enforced"`, all seven verification suites green
(`check:api` 53/53 · `check:adyen` 23/23 · `check:billing` · `check:writes` · `check:rules`
· `check:secrets` · `check:tokens`).

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
