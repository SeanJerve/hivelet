# HIVELET â€” PHASE 1 OPEN DECISIONS REGISTER

**Web-Based Boarding House Management & Financial Operations System**
Client: Fe Galang Da Silva Boarding House, Legazpi City
Bicol University â€” College of Science â€” IT 124 Capstone Project 2 â€” **Group 4**

| | |
| --- | --- |
| **Adviser** | Dr. Jayvee Christopher Vibar |
| **Panel** | Dr. Aris J. Ordonez (Chair), Prof. Ryan A. Rodriguez, Prof. Laarni D. Pancho |
| **Team** | Sean Jerve Ll. Rebancos (System Architect / Full-Stack) Â· John Lloyd M. Cuario (Database Administrator / Data Analyst) Â· Eljohn Paulo C. Loterte (Frontend / UI-UX) Â· Victor Noel A. Napay (Backend / Integration) Â· Kiel Hedrix V. Relos (QA / Systems Analyst) |
| **Artifact** | Phase 1 corrected artifact. Companion: `docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md` |

---

## 0. Read this before opening `docs/08_OPEN_DECISIONS.md`

> **`docs/08_OPEN_DECISIONS.md` is misleadingly titled. It is not a register of open decisions.**
>
> Its filename says *open decisions*; its H1 at `docs/08_OPEN_DECISIONS.md:1` reads
> **"HIVELET RESOLVED & FINALIZED SYSTEM DECISIONS"**, and its nine sections are a record of
> decisions already **closed** â€” the on-site cash payment policy, the water billing relationship,
> export formats, ticket administration, notification priorities, tenant reactivation, and the
> room rent adjustment workflow. Anyone who opens that file looking for the project's unresolved
> questions will find none, conclude that none exist, and build on an assumption the client has
> never confirmed.
>
> **The file is also internally contradicted by the documents it defers to.** Section 9
> (`docs/08_OPEN_DECISIONS.md:43-44`) states that *"Monthly Income Report running totals, GBG
> garbage fee timing, and deposit reconciliation workflows are implemented according to
> `09_MONTHLY_INCOME_REPORT.md` and `10_MONTHLY_EXPENSES_REPORT.md`."* All three of those items are
> listed in `09_MONTHLY_INCOME_REPORT.md` **Section 8, "Open Questions"** â€” running totals at
> `:133`, GBG timing at `:134`, deposit reconciliation at `:136` â€” under the preamble *"These are
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

### 1.1 Income ledger â€” sourced from `docs/09_MONTHLY_INCOME_REPORT.md` Section 8

| ID | Item | Source | Owner | What it blocks | Gate |
| --- | --- | --- | --- | --- | --- |
| **OD-01** | **Income running-total scope.** The source spreadsheet's bottom-of-page total (e.g. `1,179,150`) far exceeds a single month's grand subtotal (e.g. `232,350`), implying a year-to-date running total across all months on the sheet rather than a per-month figure. Confirm whether Hivelet's report shows per-month totals only, year-to-date totals, or both. | `docs/09_MONTHLY_INCOME_REPORT.md:133` | **Client decision** â€” Mrs. Fe Galang Da Silva; elicited and minuted by Kiel Hedrix V. Relos (QA / Systems Analyst) | The Monthly Income Report footer layout; the Excel export required by **BR-049** / **FR-044**; the aggregate contract of the planned `financialReportService.ts`. **BR-019** (Report Recalculation) cannot be specified until the totals being recalculated are defined. | **Phase 2** |
| **OD-02** | **GBG fee timing.** Confirm what determines *which* month's entry carries the annual garbage fee â€” a fixed calendar month, the unit's anniversary month, or the administrator's discretion. | `docs/09_MONTHLY_INCOME_REPORT.md:134` | **Client decision**; modelled by Victor Noel A. Napay (Backend / Integration) | Any write to `monthly_income_records.gbg_fee` (`database/FULL_DATABASE_SCHEMA.sql:271`). The column exists and the token `gbg` appears **zero times** in `backend/src` â€” **BR-037** is currently *Schema only*. An anniversary-month answer additionally couples the fee to `room_assignments.anniversary_date` (`:158`) and changes the planned `billingService.ts` signature. | **Phase 3** |
| **OD-03** | **Mid-cycle vacancy proration.** Confirm how Rent Amount, Water Payment and Remitted Amount are handled when a tenant vacates partway through a billing period. | `docs/09_MONTHLY_INCOME_REPORT.md:135` | **Client decision**; arithmetic owned by Sean Jerve Ll. Rebancos (System Architect) | The **BR-038** Remitted Amount formula and the **BR-035** derived half-of-rent arithmetic for a partial month. Also blocks the vacate handler (`backend/src/routes/admin.ts:671-723`), which today ends the assignment and frees the unit without generating any final or prorated ledger row. | **Phase 3** |
| **OD-04** | **Deposit refund or forfeiture on move-out.** Confirm whether and how a stored deposit is reconciled, refunded or forfeited when a tenant vacates. Ties directly to **BR-025** Tenant Deactivation. | `docs/09_MONTHLY_INCOME_REPORT.md:136` | **Client decision**; schema owned by John Lloyd M. Cuario (Database Administrator) | A schema gap, not just a code gap. `room_assignments.deposit_amount` (`database/FULL_DATABASE_SCHEMA.sql:159`) has no disposition column â€” no `deposit_refunded_amount`, no `deposit_forfeited_amount`, no settlement date. The vacate endpoint (`backend/src/routes/admin.ts:692-708`) deactivates the account and frees the unit with no deposit settlement step at all, so **BR-025** is recorded as *Partial* in the crosswalk. A refund answer requires a Phase 2 migration before any Phase 3 code. | **Phase 2** |

### 1.2 Expense ledger â€” sourced from `docs/10_MONTHLY_EXPENSES_REPORT.md` Section 8

| ID | Item | Source | Owner | What it blocks | Gate |
| --- | --- | --- | --- | --- | --- |
| **OD-05** | **"Main House" expense area scope.** Confirm what "Main House Expenses" refers to â€” it has no corresponding unit cluster in `09_MONTHLY_INCOME_REPORT.md`. | `docs/10_MONTHLY_EXPENSES_REPORT.md:122` | **Client decision**; reconciled against the property model by John Lloyd M. Cuario (Database Administrator) | Constraining **BR-041**. `expense_property_allocations.property_area VARCHAR(100) NOT NULL` (`database/FULL_DATABASE_SCHEMA.sql:353`) is free text with no CHECK constraint and no lookup table, and the API writes whatever string arrives (`backend/src/routes/admin.ts:1409`). A lookup table cannot be seeded until the five area names are settled â€” and "Main House" is the one that does not map to any of the five clusters fixed by **BR-032**. Also blocks **BR-047** reconciliation, which sums by Property Area. | **Phase 2** |
| **OD-06** | **Date format.** The spreadsheet shows `D-MMM-YY` (matching the Income report), while the verbal description of the feature stated `DD/MM/YYYY`. Confirm which is authoritative for entry and for display. | `docs/10_MONTHLY_EXPENSES_REPORT.md:123` | **Client decision**; implemented by Eljohn Paulo C. Loterte (Frontend / UI-UX) | Presentation and export only â€” storage is unaffected, since `monthly_expense_entries.expense_date` and `monthly_income_records.date_paid` are both `DATE` (`database/FULL_DATABASE_SCHEMA.sql:330`, `:262`). It does block the **BR-049** Excel export layout and every date picker in the admin forms, and a mid-project change would invalidate screenshots already prepared for the defense. | **Phase 2** |
| **OD-07** | **Cumulative reset.** Confirm whether the category cumulative column ever resets â€” for example at the start of a calendar year â€” or runs indefinitely. | `docs/10_MONTHLY_EXPENSES_REPORT.md:124` | **Client decision**; modelled by John Lloyd M. Cuario (Database Administrator) | **BR-046** Expense Category Totals, currently *Not enforced*: `fixed_expense_categories` (`database/FULL_DATABASE_SCHEMA.sql:304-309`) has no cumulative column and no roll-forward code exists in `backend/src`. Whether the cumulative is a stored column or a computed window depends entirely on the reset answer, which makes this a schema decision. | **Phase 2** |
| **OD-08** | **Category edits.** Confirm whether the fixed category list may ever be edited or extended by the administrator, or is permanently hardcoded. | `docs/10_MONTHLY_EXPENSES_REPORT.md:125` | **Client decision**; RBAC owned by Sean Jerve Ll. Rebancos (System Architect) | **BR-043** Fixed Expense Category List. Thirteen rows are seeded at `database/FULL_DATABASE_SCHEMA.sql:311-326` and served read-only at `GET /api/admin/expense-categories` (`backend/src/routes/admin.ts:1531-1533`); no write endpoint exists. An "editable" answer requires a new write endpoint and the `settings:manage` permission that `docs/11_FORM_FIELD_AUDIT.md:340` already flags as *to be added*. It also determines whether the `parent_code` self-reference (`:307`) must support user-created sub-lines beyond the seeded `6a` / `6b` / `6c`. | **Phase 2** |

### 1.3 Forms, identity and access â€” sourced from `docs/11_FORM_FIELD_AUDIT.md` Section 7

| ID | Item | Source | Owner | What it blocks | Gate |
| --- | --- | --- | --- | --- | --- |
| **OD-10** | **Tenant-submitted payments.** Form F-12 lets a tenant record a payment awaiting verification, which fits **FR-015** and **BR-017**, but the RBAC matrix grants tenants no payment-write permission and no endpoint exists. Confirm whether the form stays. | `docs/11_FORM_FIELD_AUDIT.md:319-325` | **Client decision on policy**; implemented by Victor Noel A. Napay (Backend / Integration) | If the form stays it needs a new `payment:submit:own` permission added to `backend/src/config/rbac.ts` and a scoped endpoint that forces `verification_status = 'Pending Verification'` â€” the same guarantee the Adyen adapter already makes at `backend/src/services/adyenService.ts:202`. Note that `payments.verification_status` defaults to `'Verified'` (`database/FULL_DATABASE_SCHEMA.sql:240`), so any tenant-facing insert path that omits the field would silently self-verify and breach **BR-017**. If the form goes, F-12 is struck from the form inventory and the UI-UX documentation. | **Phase 3** |

### 1.4 Additional items surfaced during Phase 1 verification (all three now closed)

All three items surfaced in this category during Phase 1 verification, **OD-11**, **OD-12** and **OD-13**, were closed by owner confirmation on 2026-09-13 and now appear in Section 2 with their resolutions. Their identifiers are retained there so that cross-references from the sibling artifacts continue to resolve. Nothing in this category remains open.

---

## 2. Items that are closed â€” do not reopen them

These were genuinely ambiguous in the submitted documents and are now settled, by the Phase 1 canon
or by the owner confirmations of 2026-09-13.
They appear here so that no one mistakes a stale document for an open question, and each is carried
on the Phase 1 errata sheet.

| Former question | Resolution | Evidence |
| --- | --- | --- |
| **OD-09: Tenant email nullability.** `profiles.email` is `NOT NULL UNIQUE` and doubles as the login identifier, but the landlady onboards tenants who may not have an email address. | **Resolved 2026-09-13 by the owner: every tenant is a record; a portal login is optional on top of it.** `email` becomes nullable, `phone_number` becomes an alternate login identifier, and a tenant record may exist with no credentials at all (administrator-managed billing, cash settlement, printed receipt). A login may be enabled later for an existing tenant without creating a duplicate record, preserving **BR-026** / **BR-027**. Phase 2 must convert the uniqueness constraint to a **partial unique index** so multiple NULL emails remain legal. | `database/FULL_DATABASE_SCHEMA.sql` (`profiles.email`); `docs/11_FORM_FIELD_AUDIT.md` Section 7.1. Recorded in `docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md` Section 7b. |
| **Unit count: 32 or 33?** Raised at `docs/11_FORM_FIELD_AUDIT.md:313-318`, which observed that **BR-032** and System Bible Â§5 both say 32 while the canonical enumeration yields 33. | **33 rentable units, 5 clusters.** BH (Main Rooms) 22, Back Apartment 5, Front Apartment 3, Penthouse 1, Linda 2. The per-floor tally is settled as well, at 11 / 11 / 10 / 1 across three residential floors plus a rooftop penthouse level (see the **OD-13** row below). The prose "32" is an arithmetic error in the narrative, not a data error. | Five cluster rows seeded at `database/FULL_DATABASE_SCHEMA.sql:32-38`; the 33 units seeded from `:466`. Errata target: `docs/01_SYSTEM_BIBLE.md:146`. |
| **Cluster naming: "Main Building / Annex A / Annex B"?** Used at `docs/claude_pipeline/CLAUDE_PIPELINE.md:140`. | **Not cluster names, and they must never appear as such.** The canonical clusters are BH (Main Rooms), Back Apartment, Front Apartment, Penthouse, Linda. In the family's own usage "Annex" denotes a **floor** â€” "Annex A" is the first floor. | `database/FULL_DATABASE_SCHEMA.sql:32-38`; **BR-032**. |
| **Grace period: 7 days or 10?** The seed says 7; the code writes 10. | **Seven days**, per **BR-012** and the seeded parameter. The 10-day value in code is a defect, not an alternative policy. | `system_settings.grace_period_days = '7'` (`database/FULL_DATABASE_SCHEMA.sql:458`) against the hardcoded `now + 10 days` at `backend/src/routes/tenant.ts:453`. Remedied in Phase 3 by the `billingService.ts` extraction. |
| **Water rate: is PHP 200 fixed?** | **No â€” it is configurable, with 200 as the seeded default.** Water = registered occupants x `system_settings.water_rate_per_occupant`. Linda's units LF and LB are excluded from the per-occupant model entirely and use fixed per-unit charges per **BR-040**. | `database/FULL_DATABASE_SCHEMA.sql:454` (rate), `:455-457` (Linda charges: LF water PHP 400, LB water PHP 200, LB electricity PHP 325). Hardcoded today at `backend/src/routes/admin.ts:910`, `:1103`, `:1243` â€” a Phase 3 defect, not an open question. |
| **Adyen: is the gateway "Pending Consultation"?** That framing appears at `docs/module_01_submission/01_ACTIVITIES_AND_FINAL_ASSESSMENT.md:65` and `:217`, `06_DESIGN_JUSTIFICATION_AND_TRACEABILITY.md:23`, and `07_GROUP_PRESENTATION_SCRIPT_AND_SLIDES.md:143`, `:147`. | **Superseded.** The group obtained and configured an Adyen developer sandbox account and implemented the GCash checkout flow against it through a decoupled adapter that auto-selects sandbox or live credentials. Commercial live processing additionally requires SEC/DTI business underwriting, which is outside the scope of an academic capstone. Because the account is a developer sandbox account, the adapter posting to `checkout-test.adyen.com` is **correct behaviour, not a defect**. On-site in-person cash settlement remains the primary method, and the administrator retains the sovereign verification gate of **BR-017**. | `backend/src/services/adyenService.ts:37` (adapter), `:202` (`'Pending Verification'` insert). Honest caveat retained: `@adyen/api-library` is declared in `backend/package.json` but not imported; the adapter calls the Checkout API over HTTP directly. |
| **Does `docs/08_OPEN_DECISIONS.md` Section 9 close the income-ledger questions?** | **No.** Section 9 (`:43-44`) asserts that running totals, GBG timing and deposit reconciliation "are implemented according to" `09` and `10`. Those three documents list all three items as unresolved. Section 9 is struck; **OD-01**, **OD-02** and **OD-04** above are the live items. | `docs/08_OPEN_DECISIONS.md:43-44` against `docs/09_MONTHLY_INCOME_REPORT.md:133`, `:134`, `:136`. |
| **OD-11 â€” should the proposed automatic rate-adjustment feature be promoted to a canonical business rule?** Raised against `docs/08_OPEN_DECISIONS.md:41`, the decision note that created it; every other mention in the repository restates that note rather than establishing a rule. | **Closed 2026-09-13. The feature is out of scope.** The owner confirms she simply edits the room rate herself when she decides to change it: there is no automatic increase and no system-generated recommendation. Room rates are **set manually by the administrator**, and every change is recorded in `room_price_history` with its effective date and the administrator who made it. The pillar is redefined as **ARCH-004 Rate Change History**, anchored to canonical **BR-003** *Historical Preservation*; the table keeps its full justification, only the automation is gone. | A repository-wide search of `docs/02_BUSINESS_RULES.md` for "2%", "annual", "escalat" and "adjust" returns **zero** matches, so the removal contradicts no canonical business rule. The decision of record was `docs/08_OPEN_DECISIONS.md:40-41`, carried forward by `docs/claude_pipeline/CLAUDE_PIPELINE.md:143`; the remaining mentions â€” `docs/05_DATABASE_DESIGN.md:64`, the schema section comment at `database/FULL_DATABASE_SCHEMA.sql:134`, and the descriptive restatements across the Module 01 submission set â€” repeat it rather than establish it. Schema retained: `database/FULL_DATABASE_SCHEMA.sql:136-145` (`effective_date` at `:141`, `created_by` at `:143`). Errata: **E-18**, **E-20**. |
| **OD-12 â€” is the in-repository fallback gateway retained, or removed in favour of Adyen alone?** Raised against `backend/src/routes/public.ts:198-202` and `:852-853`. | **Closed 2026-09-13. Adyen is the documented payment story, and the only one.** The group obtained and configured an Adyen developer sandbox account and implemented the GCash checkout flow against it through a decoupled adapter that selects sandbox or live credentials. The fallback gateway code stays in the codebase purely as an offline contingency and is never presented as the demonstrated flow in any artifact. Commercial live processing additionally requires SEC/DTI business underwriting, which is outside the scope of an academic capstone. On-site in-person cash settlement remains the **primary** settlement method, with Adyen GCash as the optional digital alternative and the administrator's sovereign verification gate (**BR-017**) intact. | `backend/src/services/adyenService.ts:37` (adapter), `:42-50` (credential selection), `:61` (Checkout session POST), `:202` (`'Pending Verification'` insert). Because the account is a developer sandbox account, posting to `checkout-test.adyen.com` is **correct behaviour, not a defect**. Two caveats stand: `@adyen/api-library` is declared in `backend/package.json` but never imported, because the adapter calls the Checkout API over HTTP directly; and the two payment endpoints cited opposite carry neither `optionalAuth` nor `requirePermission`, a **Phase 3** hardening item that survives this closure. Errata: **E-17**. |
| **OD-13 â€” what is the per-floor unit distribution?** Raised against the `floor` values seeded at `database/FULL_DATABASE_SCHEMA.sql:468-506`. | **Closed 2026-09-13 by owner survey. Floor 1 = 11, floor 2 = 11, floor 3 = 10, floor 4 (rooftop penthouse) = 1, total 33.** The building form is **three residential floors plus a rooftop penthouse level**; `PH` occupies its own rooftop level directly above floor 3 and is the only penthouse. This tally is owner-confirmed canon and is published as settled wherever a floor figure appears. | Honest caveat, carried here and on the errata sheet (**E-21**) and nowhere else: the seeded per-unit `rooms.floor` values were populated for development rather than surveyed, and once `PH` is corrected from `floor = 3` (`:499`) to level 4 the seed yields **12 / 11 / 9 / 1**, which disagrees with the survey on floor 1 by one unit. **The owner's survey is authoritative for the published tally.** Reconciling the individual `rooms.floor` values is a **Phase 2 data-cleanup task**, applied as an incremental migration and never by editing the master schema file. It is a scheduled task, not an open question. |

---

## 3. Summary

| Gate | Count | Items |
| --- | --- | --- |
| **Phase 2** (schema, migration, specification) | 6 | OD-01, OD-04, OD-05, OD-06, OD-07, OD-08 |
| **Phase 3** (service extraction and implementation) | 3 | OD-02, OD-03, OD-10 |
| | **10** | |

**Critical path.** Four items require a database migration and therefore gate everything downstream
of them: **OD-04** (deposit reconciliation on move-out), 
**OD-04** (deposit disposition columns), **OD-05** (the Property Area lookup table and CHECK
constraint), and **OD-07** (whether the category cumulative is stored or computed). All ten
remaining items require a decision from Mrs. Fe Galang Da Silva rather than from the development
team; they should be gathered into a single client consultation rather than raised piecemeal. The
three items closed on 2026-09-13 (**OD-11**, **OD-12** and **OD-13**) are recorded in Section 2.

**What this register is not.** None of the ten items above is a defect. The defects identified
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