# HIVELET — PHASE 1 OPEN DECISIONS REGISTER

**Web-Based Boarding House Management & Financial Operations System**
Client: Fe Galang Da Silva Boarding House, Legazpi City
Bicol University — College of Science — IT 124 Capstone Project 2 — **Group 4**

| | |
| --- | --- |
| **Adviser** | Dr. Jayvee Christopher Vibar |
| **Panel** | Dr. Aris J. Ordonez (Chair), Prof. Ryan A. Rodriguez, Prof. Laarni D. Pancho |
| **Team** | Sean Jerve Ll. Rebancos (System Architect / Full-Stack) · John Lloyd M. Cuario (Database Administrator / Data Analyst) · Eljohn Paulo C. Loterte (Frontend / UI-UX) · Victor Noel A. Napay (Backend / Integration) · Kiel Hedrix V. Relos (QA / Systems Analyst) |
| **Artifact** | Phase 1 corrected artifact. Companion: `docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md` |

---

## 0. Read this before opening `docs/08_OPEN_DECISIONS.md`

> **`docs/08_OPEN_DECISIONS.md` is misleadingly titled. It is not a register of open decisions.**
>
> Its filename says *open decisions*; its H1 at `docs/08_OPEN_DECISIONS.md:1` reads
> **"HIVELET RESOLVED & FINALIZED SYSTEM DECISIONS"**, and its nine sections are a record of
> decisions already **closed** — the on-site cash payment policy, the water billing relationship,
> export formats, ticket administration, notification priorities, tenant reactivation, and the
> room rent adjustment workflow. Anyone who opens that file looking for the project's unresolved
> questions will find none, conclude that none exist, and build on an assumption the client has
> never confirmed.
>
> **The file is also internally contradicted by the documents it defers to.** Section 9
> (`docs/08_OPEN_DECISIONS.md:43-44`) states that *"Monthly Income Report running totals, GBG
> garbage fee timing, and deposit reconciliation workflows are implemented according to
> `09_MONTHLY_INCOME_REPORT.md` and `10_MONTHLY_EXPENSES_REPORT.md`."* All three of those items are
> listed in `09_MONTHLY_INCOME_REPORT.md` **Section 8, "Open Questions"** — running totals at
> `:133`, GBG timing at `:134`, deposit reconciliation at `:136` — under the preamble *"These are
> not resolved by this document and must not be silently assumed during implementation."*
> Section 9 defers three unanswered questions to a document that explicitly declines to answer them.
>
> **This register is the authoritative list of what is genuinely open.** `docs/08_OPEN_DECISIONS.md`
> should be renamed to `08_CLOSED_DECISIONS.md` in Phase 2, with its Section 9 struck and replaced by
> a pointer to this file. Until it is renamed, the mismatch is carried as an item on the Phase 1
> errata sheet.

**Gating convention used below**

| Gate | Meaning |
| --- | --- |
| **Phase 2** | Must be answered before the schema, migration or specification work of Phase 2 can be finalized. A wrong guess here costs a migration. |
| **Phase 3** | Must be answered before the corresponding service is extracted from the route handlers and implemented. A wrong guess here costs code, not schema. |

---

## 1. Open decisions register

> [!IMPORTANT]
> **Reconciled against the code and the live ledger on 2026-09-17**, before putting anything to
> the client.
>
> **Four of these were already decided and built.** OD-03, OD-04, OD-05 and OD-06 are each cited
> by number in `backend/src` — the register had simply never been read back against the code.
> They are struck through below with their evidence. *Putting a settled question to a client wastes
> the one meeting you get.*
>
> **One question's premise was wrong.** OD-02 asked which month carries "the annual garbage fee".
> Counting the live rows shows it is **₱20 per unit per month**, not annual — and that it stopped
> after June 2025. The question is rewritten below to ask the thing that actually needs answering.
>
> What genuinely remains for the owner: **OD-01, OD-02 (as rewritten), OD-07, OD-08, OD-10**, plus
> the ledger items gathered in `CLIENT_MEETING_QUESTIONS.md`.

### 1.1 Income ledger — sourced from `docs/09_MONTHLY_INCOME_REPORT.md` Section 8

| ID | Item | Source | Owner | What it blocks | Gate |
| --- | --- | --- | --- | --- | --- |
| **OD-01** | **Income running-total scope.** The source spreadsheet's bottom-of-page total (e.g. `1,179,150`) far exceeds a single month's grand subtotal (e.g. `232,350`), implying a year-to-date running total across all months on the sheet rather than a per-month figure. Confirm whether Hivelet's report shows per-month totals only, year-to-date totals, or both. | `docs/09_MONTHLY_INCOME_REPORT.md:133` | **Client decision** — Mrs. Fe Galang Da Silva; elicited and minuted by Kiel Hedrix V. Relos (QA / Systems Analyst) | The Monthly Income Report footer layout; the Excel export required by **BR-049** / **FR-044**; the aggregate contract of the planned `financialReportService.ts`. ~~**BR-019** (Report Recalculation) cannot be specified until the totals being recalculated are defined.~~ **Withdrawn 2026-09-14** - this conflated two questions. OD-01 settles which totals the report *shows*; BR-019 asks whether a correction reaches them. It does, by construction: the database holds 0 views, 0 materialized views and no aggregate table, and every report figure is derived on read from raw rows. OD-01 still governs the report footer and the BR-049 / FR-044 Excel export, and remains open for those. | **Phase 2** |
| **OD-02** | **GBG fee — the question was wrong, 2026-09-17.** This asked which month carries *the annual garbage fee*. **It is not annual.** Counted over the live ledger: **₱20 on every unit every month** — 357 of 366 rows in 2024, 174 across Jan–Jun 2025, every one of them exactly ₱20. The real question is that it **stopped after June 2025** and has been absent for fifteen consecutive months. Was that deliberate? | `docs/09_MONTHLY_INCOME_REPORT.md:134` | **Client decision**; modelled by Victor Noel A. Napay (Backend / Integration) | Any write to `monthly_income_records.gbg_fee` (`database/FULL_DATABASE_SCHEMA.sql:271`). The column exists and the token `gbg` appears **zero times** in `backend/src` — **BR-037** is currently *Schema only*. An anniversary-month answer additionally couples the fee to `room_assignments.anniversary_date` (`:158`) and changes the planned `billingService.ts` signature. | **Phase 3** |
| ~~**OD-03**~~ | **Mid-cycle vacancy proration.** Confirm how Rent Amount, Water Payment and Remitted Amount are handled when a tenant vacates partway through a billing period. | `docs/09_MONTHLY_INCOME_REPORT.md:135` | **Client decision**; arithmetic owned by Sean Jerve Ll. Rebancos (System Architect) | The **BR-038** Remitted Amount formula and the **BR-035** derived half-of-rent arithmetic for a partial month. Also blocks the vacate handler (`backend/src/routes/admin.ts:671-723`), which today ends the assignment and frees the unit without generating any final or prorated ledger row. | **CLOSED 2026-09-17 — already built.** Rent is **never prorated**: a tenant leaving mid-month owes the whole month and nothing is refunded. Stated and cited at `backend/src/services/billingService.ts:80-81`, and again at `:142` for the collection window. |
| ~~**OD-04**~~ | **Deposit refund or forfeiture on move-out.** Confirm whether and how a stored deposit is reconciled, refunded or forfeited when a tenant vacates. Ties directly to **BR-025** Tenant Deactivation. | `docs/09_MONTHLY_INCOME_REPORT.md:136` | **Client decision**; schema owned by John Lloyd M. Cuario (Database Administrator) | A schema gap, not just a code gap. `room_assignments.deposit_amount` (`database/FULL_DATABASE_SCHEMA.sql:159`) has no disposition column — no `deposit_refunded_amount`, no `deposit_forfeited_amount`, no settlement date. The vacate endpoint (`backend/src/routes/admin.ts:692-708`) deactivates the account and frees the unit with no deposit settlement step at all, so **BR-025** is recorded as *Partial* in the crosswalk. A refund answer requires a Phase 2 migration before any Phase 3 code. | **CLOSED 2026-09-17 — already built.** The move-in sum is **advance rent, not a refundable security deposit**. Cited at `backend/src/routes/admin.ts:661`; the column is `room_assignments.deposit_amount`, `NOT NULL DEFAULT 0.00`, `CHECK (>= 0)`. |

### 1.2 Expense ledger — sourced from `docs/10_MONTHLY_EXPENSES_REPORT.md` Section 8

| ID | Item | Source | Owner | What it blocks | Gate |
| --- | --- | --- | --- | --- | --- |
| ~~**OD-05**~~ | **"Main House" expense area scope.** Confirm what "Main House Expenses" refers to — it has no corresponding unit cluster in `09_MONTHLY_INCOME_REPORT.md`. | `docs/10_MONTHLY_EXPENSES_REPORT.md:122` | **Client decision**; reconciled against the property model by John Lloyd M. Cuario (Database Administrator) | Constraining **BR-041**. ~~`expense_property_allocations.property_area VARCHAR(100) NOT NULL` (`database/FULL_DATABASE_SCHEMA.sql:353`) is free text with no CHECK constraint and no lookup table~~ - **stale, corrected 2026-09-14.** That is what `FULL_DATABASE_SCHEMA.sql` says; it is not what the live database holds. `property_area` is the **enum `property_area_type`**, `property_areas` is a **seeded lookup of all six areas**, and its `code` column is that same enum. Migrations **008** and **012** did this. **0 of 1,327** allocation rows are off the lookup - an invalid area is rejected by the type system, not by convention. A textbook case for rule 2: trust `live_schema.csv` and the catalogue, never `FULL_DATABASE_SCHEMA.sql`. A lookup table cannot be seeded until the five area names are settled — and "Main House" is the one that does not map to any of the five clusters fixed by **BR-032**. ~~Also blocks **BR-047** reconciliation, which sums by Property Area.~~ **No longer blocking.** "Main House" is a first-class enum value and a seeded lookup row, so BR-047 needs no further naming decision - it is now **Enforced**. What remains genuinely open is narrower and unchanged: "Main House" maps to no unit cluster under BR-032, so the owner should still confirm what it covers. That constrains **BR-041**, not the reconciliation. | **CLOSED 2026-09-13 by the owner, verified 2026-09-17.** "Main House" is **her own residence** — a non-rental area. Cited at `backend/src/config/propertyAreas.ts:29`, and `npm run check:ledger` proves the backend list, the frontend list and `property_areas.is_rental_expense` still agree every run. |
| ~~**OD-06**~~ | **Date format.** The spreadsheet shows `D-MMM-YY` (matching the Income report), while the verbal description of the feature stated `DD/MM/YYYY`. Confirm which is authoritative for entry and for display. | `docs/10_MONTHLY_EXPENSES_REPORT.md:123` | **Client decision**; implemented by Eljohn Paulo C. Loterte (Frontend / UI-UX) | Presentation and export only — storage is unaffected, since `monthly_expense_entries.expense_date` and `monthly_income_records.date_paid` are both `DATE` (`database/FULL_DATABASE_SCHEMA.sql:330`, `:262`). It does block the **BR-049** Excel export layout and every date picker in the admin forms, and a mid-project change would invalidate screenshots already prepared for the defense. | **CLOSED 2026-09-17 — resolved by following her own sheet.** `D-MMM-YY`, the format her spreadsheet already shows and the income report already uses. `backend/src/services/expenseReportExport.ts:71`. |
| ~~**OD-07**~~ **CLOSED 2026-09-17 — the implementation answers it, and the answer is verified.** The expense report computes the cumulative as a running window that **restarts each January**, and `check:reports` now asserts the entire chain — every month of 2024, 2025 and 2026 equals the previous month plus its own, and the year-end figures match `monthly_expense_entries` read directly. The note opposite that *"no roll-forward code exists in backend/src"* was true when written and is not now: `expenseReportExport.ts` carries it. It is a computed window, not a stored column, so this was never the schema decision it was filed as. Dropped from the client sheet on Sean's call rather than spending her time confirming what the build already proves. **Original question:** **Cumulative reset.** Confirm whether the category cumulative column ever resets — for example at the start of a calendar year — or runs indefinitely. | `docs/10_MONTHLY_EXPENSES_REPORT.md:124` | **Client decision**; modelled by John Lloyd M. Cuario (Database Administrator) | **BR-046** Expense Category Totals, currently *Not enforced*: `fixed_expense_categories` (`database/FULL_DATABASE_SCHEMA.sql:304-309`) has no cumulative column and no roll-forward code exists in `backend/src`. Whether the cumulative is a stored column or a computed window depends entirely on the reset answer, which makes this a schema decision. | **Phase 2** |
| **OD-08** | **Category edits.** Confirm whether the fixed category list may ever be edited or extended by the administrator, or is permanently hardcoded. | `docs/10_MONTHLY_EXPENSES_REPORT.md:125` | **Client decision**; RBAC owned by Sean Jerve Ll. Rebancos (System Architect) | **BR-043** Fixed Expense Category List. Thirteen rows are seeded at `database/FULL_DATABASE_SCHEMA.sql:311-326` and served read-only at `GET /api/admin/expense-categories` (`backend/src/routes/admin.ts:1531-1533`); no write endpoint exists. An "editable" answer requires a new write endpoint and the `settings:manage` permission that `docs/11_FORM_FIELD_AUDIT.md:340` already flags as *to be added*. It also determines whether the `parent_code` self-reference (`:307`) must support user-created sub-lines beyond the seeded `6a` / `6b` / `6c`. | **Phase 2** |

### 1.3 Forms, identity and access — sourced from `docs/11_FORM_FIELD_AUDIT.md` Section 7

| ID | Item | Source | Owner | What it blocks | Gate |
| --- | --- | --- | --- | --- | --- |
| **OD-10** | **Tenant-submitted payments.** Form F-12 lets a tenant record a payment awaiting verification, which fits **FR-015** and **BR-017**, but the RBAC matrix grants tenants no payment-write permission and no endpoint exists. Confirm whether the form stays. | `docs/11_FORM_FIELD_AUDIT.md:319-325` | **Client decision on policy**; implemented by Victor Noel A. Napay (Backend / Integration) | If the form stays it needs a new `payment:submit:own` permission added to `backend/src/config/rbac.ts` and a scoped endpoint that forces `verification_status = 'Pending Verification'` — the same guarantee the Adyen adapter already makes at `backend/src/services/adyenService.ts:202`. Note that `payments.verification_status` defaults to `'Verified'` (`database/FULL_DATABASE_SCHEMA.sql:240`), so any tenant-facing insert path that omits the field would silently self-verify and breach **BR-017**. If the form goes, F-12 is struck from the form inventory and the UI-UX documentation. | **Phase 3** |

### 1.4 Additional items surfaced during Phase 1 verification (all three now closed)

All three items surfaced in this category during Phase 1 verification, **OD-11**, **OD-12** and **OD-13**, were closed by owner confirmation on 2026-09-13 and now appear in Section 2 with their resolutions. Their identifiers are retained there so that cross-references from the sibling artifacts continue to resolve. Nothing in this category remains open.

---

## 2. Items that are closed — do not reopen them

These were genuinely ambiguous in the submitted documents and are now settled, by the Phase 1 canon
or by the owner confirmations of 2026-09-13.
They appear here so that no one mistakes a stale document for an open question, and each is carried
on the Phase 1 errata sheet.

| Former question | Resolution | Evidence |
| --- | --- | --- |
| **OD-09: Tenant email nullability.** `profiles.email` is `NOT NULL UNIQUE` and doubles as the login identifier, but the landlady onboards tenants who may not have an email address. | **Resolved 2026-09-13 by the owner: every tenant is a record; a portal login is optional on top of it.** `email` becomes nullable, `phone_number` becomes an alternate login identifier, and a tenant record may exist with no credentials at all (administrator-managed billing, cash settlement, printed receipt). A login may be enabled later for an existing tenant without creating a duplicate record, preserving **BR-026** / **BR-027**. Phase 2 must convert the uniqueness constraint to a **partial unique index** so multiple NULL emails remain legal. | `database/FULL_DATABASE_SCHEMA.sql` (`profiles.email`); `docs/11_FORM_FIELD_AUDIT.md` Section 7.1. Recorded in `docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md` Section 7b. |
| **Unit count: 32 or 33?** Raised at `docs/11_FORM_FIELD_AUDIT.md:313-318`, which observed that **BR-032** and System Bible §5 both say 32 while the canonical enumeration yields 33. | **33 rentable units, 5 clusters.** BH (Main Rooms) 22, Back Apartment 5, Front Apartment 3, Penthouse 1, Linda 2. The per-floor tally is settled as well, at 11 / 11 / 10 / 1 across three residential floors plus a rooftop penthouse level (see the **OD-13** row below). The prose "32" is an arithmetic error in the narrative, not a data error. | Five cluster rows seeded at `database/FULL_DATABASE_SCHEMA.sql:32-38`; the 33 units seeded from `:466`. Errata target: `docs/01_SYSTEM_BIBLE.md:146`. |
| **Cluster naming: "Main Building / Annex A / Annex B"?** Used at `docs/claude_pipeline/CLAUDE_PIPELINE.md:140`. | **Not cluster names, and they must never appear as such.** The canonical clusters are BH (Main Rooms), Back Apartment, Front Apartment, Penthouse, Linda. In the family's own usage "Annex" denotes a **floor** — "Annex A" is the first floor. | `database/FULL_DATABASE_SCHEMA.sql:32-38`; **BR-032**. |
| **Grace period: 7 days or 10?** The seed says 7; the code writes 10. | ~~**Seven days**, per **BR-012** and the seeded parameter.~~ **Superseded by OD-16 below — the answer is neither.** The owner confirmed on 2026-09-13 that this property grants **no grace period at all**; migration `016` set the setting to **0**. The 7 was introduced during the original build and was never a rule of this business. The 10-day value in code was a defect either way, and is gone. | Live 2026-09-15: `system_settings.grace_period_days = '0'`, its own `description` column recording the same history. `billingService.computeBillPeriod()` reads it. |
| **Water rate: is PHP 200 fixed?** | **No — it is configurable, with 200 as the seeded default.** Water = registered occupants x `system_settings.water_rate_per_occupant`. Linda's units LF and LB are excluded from the per-occupant model entirely and use fixed per-unit charges per **BR-040**. | `database/FULL_DATABASE_SCHEMA.sql:454` (rate), `:455-457` (Linda charges: LF water PHP 400, LB water PHP 200, LB electricity PHP 325). Hardcoded today at `backend/src/routes/admin.ts:910`, `:1103`, `:1243` — a Phase 3 defect, not an open question. |
| **Adyen: is the gateway "Pending Consultation"?** That framing appears at `docs/module_01_submission/01_ACTIVITIES_AND_FINAL_ASSESSMENT.md:65` and `:217`, `06_DESIGN_JUSTIFICATION_AND_TRACEABILITY.md:23`, and `07_GROUP_PRESENTATION_SCRIPT_AND_SLIDES.md:143`, `:147`. | **Superseded.** The group obtained and configured an Adyen developer sandbox account and implemented the GCash checkout flow against it through a decoupled adapter that auto-selects sandbox or live credentials. Commercial live processing additionally requires SEC/DTI business underwriting, which is outside the scope of an academic capstone. Because the account is a developer sandbox account, the adapter posting to `checkout-test.adyen.com` is **correct behaviour, not a defect**. On-site in-person cash settlement remains the primary method, and the administrator retains the sovereign verification gate of **BR-017**. | `backend/src/services/adyenService.ts:37` (adapter), `:202` (`'Pending Verification'` insert). Honest caveat retained: `@adyen/api-library` is declared in `backend/package.json` but not imported; the adapter calls the Checkout API over HTTP directly. |
| **Does `docs/08_OPEN_DECISIONS.md` Section 9 close the income-ledger questions?** | **No.** Section 9 (`:43-44`) asserts that running totals, GBG timing and deposit reconciliation "are implemented according to" `09` and `10`. Those three documents list all three items as unresolved. Section 9 is struck; **OD-01**, **OD-02** and **OD-04** above are the live items. | `docs/08_OPEN_DECISIONS.md:43-44` against `docs/09_MONTHLY_INCOME_REPORT.md:133`, `:134`, `:136`. |
| **OD-11 — should the proposed automatic rate-adjustment feature be promoted to a canonical business rule?** Raised against `docs/08_OPEN_DECISIONS.md:41`, the decision note that created it; every other mention in the repository restates that note rather than establishing a rule. | **Closed 2026-09-13. The feature is out of scope.** The owner confirms she simply edits the room rate herself when she decides to change it: there is no automatic increase and no system-generated recommendation. Room rates are **set manually by the administrator**, and every change is recorded in `room_price_history` with its effective date and the administrator who made it. The pillar is redefined as **ARCH-004 Rate Change History**, anchored to canonical **BR-003** *Historical Preservation*; the table keeps its full justification, only the automation is gone. | A repository-wide search of `docs/02_BUSINESS_RULES.md` for "2%", "annual", "escalat" and "adjust" returns **zero** matches, so the removal contradicts no canonical business rule. The decision of record was `docs/08_OPEN_DECISIONS.md:40-41`, carried forward by `docs/claude_pipeline/CLAUDE_PIPELINE.md:143`; the remaining mentions — `docs/05_DATABASE_DESIGN.md:64`, the schema section comment at `database/FULL_DATABASE_SCHEMA.sql:134`, and the descriptive restatements across the Module 01 submission set — repeat it rather than establish it. Schema retained: `database/FULL_DATABASE_SCHEMA.sql:136-145` (`effective_date` at `:141`, `created_by` at `:143`). Errata: **E-18**, **E-20**. |
| **OD-12 — is the in-repository fallback gateway retained, or removed in favour of Adyen alone?** Raised against `backend/src/routes/public.ts:198-202` and `:852-853`. | **Closed 2026-09-13. Adyen is the documented payment story, and the only one.** The group obtained and configured an Adyen developer sandbox account and implemented the GCash checkout flow against it through a decoupled adapter that selects sandbox or live credentials. The fallback gateway code stays in the codebase purely as an offline contingency and is never presented as the demonstrated flow in any artifact. Commercial live processing additionally requires SEC/DTI business underwriting, which is outside the scope of an academic capstone. On-site in-person cash settlement remains the **primary** settlement method, with Adyen GCash as the optional digital alternative and the administrator's sovereign verification gate (**BR-017**) intact. | `backend/src/services/adyenService.ts:37` (adapter), `:42-50` (credential selection), `:61` (Checkout session POST), `:202` (`'Pending Verification'` insert). Because the account is a developer sandbox account, posting to `checkout-test.adyen.com` is **correct behaviour, not a defect**. One caveat stands: `@adyen/api-library` is declared in `backend/package.json` but never imported anywhere in `backend/src/`, because the adapter calls the Checkout API over HTTP directly. Retested 2026-09-15 and still true - it is a declared dependency with no importer, left in place rather than removed because removing it means an install cycle for no functional change, and both registers describe it accurately. ~~and the two payment endpoints cited opposite carry neither `optionalAuth` nor `requirePermission`, a **Phase 3** hardening item that survives this closure~~ - **withdrawn 2026-09-15: this contradicted E-17 in the same repository.** E-17 recorded the gap as closed on 2026-09-14; this row went on asserting it. Both routes now sit behind `refuseWhenGatewayConfigured` (`public.ts:291` and `:960`) and were probed live today: `GET /api/public/payments/local-cashier` **404**, `POST /api/public/payments/local-cashier/complete` **404**. *Two registers disagreeing about the same fact is worse than either being wrong alone - a reader has no way to tell which one to believe.* Errata: **E-17**. |
| **OD-13 — what is the per-floor unit distribution?** Raised against the `floor` values seeded at `database/FULL_DATABASE_SCHEMA.sql:468-506`. | **Closed 2026-09-13 by owner survey. Floor 1 = 11, floor 2 = 11, floor 3 = 10, floor 4 (rooftop penthouse) = 1, total 33.** The building form is **three residential floors plus a rooftop penthouse level**; `PH` occupies its own rooftop level directly above floor 3 and is the only penthouse. This tally is owner-confirmed canon and is published as settled wherever a floor figure appears. | Honest caveat, carried here and on the errata sheet (**E-21**) and nowhere else: the seeded per-unit `rooms.floor` values were populated for development rather than surveyed, and once `PH` is corrected from `floor = 3` (`:499`) to level 4 the seed yields **12 / 11 / 9 / 1**, which disagrees with the survey on floor 1 by one unit. **The owner's survey is authoritative for the published tally.** Reconciling the individual `rooms.floor` values is a **Phase 2 data-cleanup task**, applied as an incremental migration and never by editing the master schema file. It is a scheduled task, not an open question. |
| **OD-14 — is `F1` on floor 1 or floor 3?** The floor-1 tally contradicted the owner's survey: with `LF` and `LB` confirmed on floor 1, twelve units encoded floor 1 against a surveyed eleven. | **Closed 2026-09-13 by the owner's building-by-building breakdown. `F1` is on the third floor.** Migration `015_correct_front_apartment_floor` moved it; the distribution is 11 / 11 / 10 / 1. | Live 2026-09-15: floor counts are 11 / 11 / 10 / 1 across 33 rooms. Full account in `PHASE2_LOCKED_DECISIONS.md`, second addendum. |
| **OD-15 — does the Penthouse book to its own expense area, and where does Linda book?** | **Closed 2026-09-13 by the owner. The Penthouse gets its own expense category; Linda books to Back Apartment.** Migration `012` implements it, taking the Property Areas from five to six. | `property_area_type` holds six values; live 2026-09-15: five in use across 1,327 allocations, Penthouse seeded and not yet used. **BR-041** carries the same note. |
| **OD-16 — does this property grant a grace period on rent?** | **Closed 2026-09-13 by the owner: no grace period at all.** Migration `016` set `grace_period_days` to **0**, superseding the seeded 7, which was introduced during the original build and was never a rule of this business. **BR-012**'s "a grace period *may* apply" is honoured — a grace window is one settings row away, and today it is deliberately zero. | Live 2026-09-15: `system_settings.grace_period_days = '0'`. Supersedes the "Seven days" row above. |
| **OD-17 — is `LF` a Linda unit or a Front Apartment unit?** Opened during Phase 2 once `LF` and `LB` were placed on floor 1. | **Closed 2026-09-13. The clusters were already right; the *label* was the problem.** `LF` and `LB` are Linda units and bill on fixed charges (**BR-040**); the naming, not the data, had implied otherwise. | Live 2026-09-15: `rooms.is_linda_unit` agrees with `cluster_code = 'Linda'` on all 33 rooms, 0 exceptions. |

---

## 3. Summary

| Gate | Count | Items |
| --- | --- | --- |
| **Phase 2** (schema, migration, specification) | 6 | OD-01, OD-04, OD-05, OD-06, OD-07, OD-08 |
| **Phase 3** (service extraction and implementation) | 3 | OD-02, OD-03, OD-10 |
| | **9** | |

**Critical path.** Three items require a database migration and therefore gate everything
downstream of them: **OD-04** (deposit disposition columns for reconciliation on move-out),
**OD-05** (what "Main House" covers) and **OD-07** (whether the category cumulative is stored or
computed).

> **Corrected 2026-09-14, three times over.** This paragraph said *four* items and listed
> **OD-04** twice under two different descriptions; the summary above totalled **10** against a
> table of nine rows. There are **nine** open items.
>
> It also claimed OD-05 gates "the Property Area lookup table and CHECK constraint". **That table
> exists, and has since migrations `008` and `012`:** `property_area` is the enum
> `property_area_type`, `property_areas` is a seeded lookup of all six areas whose own `code`
> column is that same enum, and **0 of 1,327** allocation rows are off it. What OD-05 actually
> gates is narrower - "Main House" maps to no unit cluster under **BR-032**, so the owner should
> confirm what it covers. That constrains what **BR-041** *means*, not whether it is enforced.

All nine remaining items require a decision from Mrs. Fe Galang Da Silva rather than from the
development team; they should be gathered into a single client consultation rather than raised
piecemeal. The three items closed on 2026-09-13 (**OD-11**, **OD-12** and **OD-13**) are recorded
in Section 2.

**What this register is not.** None of the nine items above is a defect. The defects identified
against the codebase have known remedies and are tracked elsewhere. Their status as of
**2026-09-13**:

| Defect | Status |
| :--- | :--- |
| The six seeded `system_settings` rows read by zero lines of backend code, and the hardcoded water rate and grace period | **Closed.** `settingsService.ts` and `billingService.ts`; `grace_period_days` is now 0 per OD-16 and migration `016` |
| The derived money columns "computed and then dropped before the INSERT" | **Withdrawn — never a defect.** `fifty_percent_share` and `remitted_amount` are `GENERATED ALWAYS AS … STORED`; PostgreSQL derives them and rejects any write naming them. All 937 live rows are correct |
| The two unguarded payment endpoints in `public.ts` | **Closed.** Both refuse to serve wherever a gateway is configured; the webhook that replaced them is HMAC-verified |
| The absence of any `BEGIN` / `COMMIT` transaction in `backend/src` | **Still open.** supabase-js cannot open a transaction; `replace_expense_allocations` is a database function for exactly that reason |

They are registered in the Gap Register of `PHASE1_TRACEABILITY_MATRIX.md`, Section 5.1, with a
phase and a one-line remediation each, and carry their verified `file:line` evidence in
`PHASE1_BR_CROSSWALK.md` Section 1. They are not here. This register holds only questions whose answers the group does not have.

---

*Phase 1 corrected artifact. Supersedes `docs/08_OPEN_DECISIONS.md` Section 9. Companion artifact:
`docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md`.*