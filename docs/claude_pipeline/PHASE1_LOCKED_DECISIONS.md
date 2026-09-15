# PHASE 1 — LOCKED DECISIONS (Group 4)

Decisions confirmed by John Lloyd M. Cuario on 2026-09-13 during the Phase 1 STEP 0 alignment.
These are settled. Every Phase 1, 2 and 3 artifact must agree with this file.

---

## 1. Property model — CORRECTED

**33 rentable units · 5 clusters.**

| Cluster code | Units | Unit codes |
| :--- | :--- | :--- |
| BH (Main Rooms) | 22 | 1a–1h, 2a–2g, 3a–3g |
| Back Apartment | 5 | B1F, B2F, B2B, B3F, B3B |
| Front Apartment | 3 | F1, F2F, F2B |
| Penthouse | 1 | PH |
| Linda | 2 | LF, LB |

**Building form: three residential floors plus a rooftop penthouse level.**

**CONFIRMED (owner, 2026-09-13):** `PH` sits on its own rooftop level directly above floor 3, and it is
the only penthouse. The seed stores `floor = 3` for `PH` (`database/FULL_DATABASE_SCHEMA.sql:499`),
which is **wrong** — this is a live data defect, remedied by an incremental migration in Phase 2, never
by editing the master schema file.

**Per-floor distribution — SETTLED (owner, 2026-09-13). Publish this tally:**

| Level | Units | Note |
| :--- | :--- | :--- |
| Floor 1 | 11 | |
| Floor 2 | 11 | |
| Floor 3 | 10 | |
| Floor 4 | 1 | Rooftop penthouse level — `PH`, the only penthouse |
| **Total** | **33** | |

This is owner-confirmed canon and is **not** open, pending or unconfirmed. Every artifact that states a
floor figure states **11 / 11 / 10 / 1**. See **OD-13**, now closed.

The seeded per-unit `rooms.floor` values were populated for development rather than surveyed, and with
`PH` corrected to level 4 they yield 12 / 11 / 9 / 1 — one unit out on floor 1. **The owner's survey is
authoritative for the published tally**; reconciling the individual `rooms.floor` values is a Phase 2
data-cleanup migration (known defect 11 below).

> **RESOLVED 2026-09-15 — the Phase 2 migration this paragraph anticipates was written and
> applied.** Migration `015_correct_front_apartment_floor` moved `F1` to floor 3 on
> 2026-09-13, closing **OD-14**. Verified live 2026-09-15: `rooms.floor` is **11 / 11 / 10 / 1**
> across 33 rooms, matching the owner's survey exactly, with `PH` alone on level 4. There is
> no longer any disagreement between the stored values and the published tally, so the caveat
> above — and the two places it says carry it in full — describe a gap that is closed. That caveat is carried in full in exactly two places —
`PHASE1_OPEN_DECISIONS_REGISTER.md` and `PHASE1_MODULE01_ERRATA.md` — and is not repeated in the other
artifacts, which simply publish the settled tally. `database/FULL_DATABASE_SCHEMA.sql` is never edited.

- **"Main Building", "Annex A", "Annex B" are NOT cluster names** and must never appear in any artifact.
  The family uses *"Annex"* to mean **floor** (Annex A = 1st floor). `CLAUDE_PIPELINE.md` §1.1 is stale.
- `docs/01_SYSTEM_BIBLE.md:146` says "32 total rooms/units" — stale. The live seed has 33. Errata item.

## 2. Errata posture — SUPERSEDE + ERRATA SHEET

Phase 1 publishes corrected artifacts **plus** a one-page errata list handed to the panel.
Deliverable: `docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md`.

## 3. Business rule namespace — `02_BUSINESS_RULES.md` IS CANONICAL

`docs/02_BUSINESS_RULES.md` (**BR-001 … BR-049**) is the one authoritative BR namespace.
The seven `CLAUDE_PIPELINE.md` "pillars" are renumbered **ARCH-001 … ARCH-007** and are architectural
pillars — never cited with a `BR-` prefix.

| Pillar | Name | Canonical BR citations |
| :--- | :--- | :--- |
| ARCH-001 | Room-Centric Tenancy | BR-001, BR-002, BR-003, BR-032 |
| ARCH-002 | Dynamic Utility Water | BR-014, BR-034, BR-036, BR-040 |
| ARCH-003 | 50% Share Ledger Parity | BR-035 |
| ARCH-004 | Rate Change History | BR-003 |
| ARCH-005 | Hybrid Gateway Adapter | BR-016, BR-017 |
| ARCH-006 | Backend Security Boundary | BR-006, BR-048 |
| ARCH-007 | Immutable Audit Trail | BR-018, BR-028 |

Rationale: the database seed's `business_rule` tags, `backend/src/config/rbac.ts:5` and
`scopeService.ts` already cite the canonical IDs — smallest blast radius.

**ARCH-004 — REDEFINED, NOT DELETED (owner, 2026-09-13).** The pillar formerly read "Annual Rate Review
(advisory)" and described an automatic 2% rent increase. The client confirmed she simply **edits the room
rate manually** when she decides to change it: there is no automatic increase and no recommendation, and
the feature is **out of scope**. A repository-wide search of the canonical register
`docs/02_BUSINESS_RULES.md` for `2%`, `annual`, `escalat` and `adjust` returns **zero matches** — the rule
never existed canonically. Its decision of record is `docs/08_OPEN_DECISIONS.md` section 8, carried
forward by `CLAUDE_PIPELINE.md:143`; every other mention in the repository restates that note rather
than establishing a rule, so removing it contradicts nothing. The pillar is re-anchored to canonical **BR-003
Historical Preservation** and is named **Rate Change History** byte-identically in every artifact: rates are
set manually by the administrator, and every change is recorded in `room_price_history`
(`FULL_DATABASE_SCHEMA.sql:136-145`) with its effective date (`:141`) and the administrator who made it
(`created_by`, `:143`). The table keeps its full justification; only the automation is gone.

Purged from every artifact, with no exceptions: "2%", "advisory annual rate", "annual rate review",
"escalation", "Legal escalation start date", "Adjusted rate (2% annual increase)". The only places the old
wording may still be **quoted** are the misattribution register and the errata sheet, where quoting the
defective source text is the whole point of the record. `PHASE1_OPEN_DECISIONS_REGISTER.md` item **OD-11**
is **CLOSED** on this resolution, and a dedicated errata row records the out-of-scoping — separate from,
and additional to, the existing BR-048 misattribution row; both stand.

## 4. Architectural pattern — ONE CANONICAL STRING

> **Layered Client-Server Architecture Structured as a Modular Monolith with a Pluggable Payment Gateway Adapter**

**Exactly five tiers.** Any "4-TIER" or "3-Tier Web Application" wording is an errata item.
*"Isolated Payment Gateway Adapter"* is footnoted as an earlier synonym so a panelist quoting the old
slide is not contradicted.

Tier 1 Presentation is **Vue 3 + Vite + Pinia + vue-router + vite-plugin-pwa** — **not React**.

## 5. Tier 3 services — TARGET ARCHITECTURE, HONESTLY MARKED

- **Implemented today (5):** `adyenService`, `auditService`, `authService`, `notificationService`, `scopeService`
- **Planned, extracted in Phase 3 (8):** `billingService`, `paymentService`, `occupancyService`,
  `ticketService`, `inquiryService`, `settingsService`, `expenseService`, `financialReportService`

Every diagram and table must visually distinguish planned from implemented. 131 of 164 DB calls (80%)
currently sit in route handlers; `backend/src/routes/admin.ts` alone is 2,263 lines.

## 6. BR-035 `fifty_percent_share` — EDITORIAL CONSTRAINT

Defined **only** as: a system-computed figure equal to exactly half the row's Rent Amount, retained so
the digital ledger reconciles line-for-line with Column 6 of the landlady's historical spreadsheet.
Water, GBG fee and deposit are excluded from it.

**Do not** model a co-owner/owner/party entity. **Do not** use the terms "co-ownership", "co-owner" or
"50/50". **Do not** state, imply or speculate about any purpose, recipient or external use for this
figure in any artifact. State the arithmetic and stop.

## 7. Adyen posture — COMMIT FULLY TO ADYEN

The group **obtained and configured an Adyen developer sandbox account** and implemented the GCash checkout
flow against it through a decoupled adapter that selects sandbox or live credentials. All *"Pending
Consultation"* framing is superseded and removed.

**The simulated checkout leaves the narrative entirely (owner, 2026-09-13).** The in-repository fallback
gateway code **remains in the codebase** as an offline contingency, but it is **absent from the documented
story**: no artifact uses the words "mock gateway", "mock", "simulator", "simulation", "academic sandbox",
"academic simulation" or "fallback portal", and none frames a simulated checkout as the demonstrated flow.
The word *sandbox* stays where it means the **Adyen developer sandbox** — that is the real, committed
integration and is named plainly. A route or endpoint whose path literally contains `mock-gateway` is a real
code path and may still be cited accurately as a `file:line` fact where an artifact describes current code;
it is never presented as the payment story. `PHASE1_OPEN_DECISIONS_REGISTER.md` item **OD-12** is **CLOSED**
on this resolution.

Commercial live processing additionally requires SEC/DTI business underwriting — outside academic scope.
Because the account is a developer sandbox account, `adyenService.ts` POSTing to `checkout-test.adyen.com`
is **correct behaviour, not a defect**.

On-site in-person cash settlement remains the **primary** method (Mrs. Fe's daily routine); Adyen GCash
is the optional digital alternative, and the administrator retains the sovereign verification gate
(**BR-017**) — gateway completion inserts a payment as `Pending Verification` and never auto-settles a bill.

Honest caveats retained, both of them: `@adyen/api-library` is declared in `backend/package.json` but not
imported — the adapter calls the Checkout API over HTTP directly; and **two payment endpoints are currently
unauthenticated**, a Phase 3 hardening item (known defect 8 below).

## 7b. Tenant identity and login — CONFIRMED 2026-09-13

**Every tenant is a record; a portal login is optional on top of it.**

- `profiles.email` becomes **nullable**. It is currently `NOT NULL UNIQUE` and doubles as the login
  identifier, which would force the administrator to invent fake addresses for tenants who have none.
- `phone_number` becomes an **alternate login identifier**, usable in place of email.
- A tenant record may exist with **no credentials at all** — administrator-managed. Mrs. Fe creates the
  tenant from name plus phone, bills them, records their cash payment and issues the receipt. That
  tenant never opens the site. This is the paper ledger made digital on the administrator's side only.
- A login can be enabled later for an existing tenant **without creating a duplicate record**, which
  preserves BR-026 / BR-027 (no duplicate profiles) and the reactivation rule in §7 of
  `docs/08_OPEN_DECISIONS.md`.

This closes **OD-09**, which the Phase 1 audit flagged as the single highest-leverage open item.
Phase 2 designs the ERD around it; the uniqueness constraint must become a **partial unique index** so
that multiple NULL emails remain legal.
## 8. Data flow diagrams

- **Level 0:** four external entities — Public Visitor/Prospect, Active Tenant, Administrator, and
  **Payment Gateway (Adyen GCash — Sandbox/Live)** with a redirect-out / authorization-result-in pair.
- **Level 1:** **7 processes / 12 data stores.** Process **7.0 Authenticate & Authorize Users** is
  **restored** (the modernized draft had deleted the legacy lab DFD's Process 5). This fixes a
  Level 0 → Level 1 balancing failure: "Authentication Credentials" crossed the boundary at Level 0 and
  landed nowhere at Level 1. 7.0 maps to the real `authService.ts` (388 lines).
- Return flows added so D5, D6, D9, D10 and D12 stop being write-only.
- Legacy source-image defects noted, not hidden: `CHILD1.png` labels **both** 1.3 and 1.4 "Manage Room
  and Unit Records" (1.4 is functionally the occupancy monitor); `DFD.png` misspells "Autheticate";
  `CHILD2.png` misspells "Respoonse".

---

## Known defects — deferred to Phase 2 / Phase 3, never stated as fixed

| # | Defect | Evidence | Phase |
| :-- | :--- | :--- | :-- |
| 1 | `system_settings` holds 6 correctly seeded keys, read by **zero** lines of backend code | — | 3 |
| 2 | Water rate hardcoded `occupants * 200` | `admin.ts:910, 1103, 1243` | 3 |
| 3 | Share hardcoded `rentAmount / 2` | `admin.ts:911, 1102` | 3 |
| 4 | Grace period hardcoded to 10 days, contradicting seeded `grace_period_days = 7` and BR-012 | `tenant.ts:453` | 3 |
| 5 | ~~`fifty_percent_share` / `remitted_amount` computed but **never written** — every row stores `0.00`~~ **WITHDRAWN 2026-09-13.** Both are `GENERATED ALWAYS AS … STORED`; PostgreSQL maintains them and rejects any write naming them. All 937 live rows are correct. The residual issue is one unused variable at `admin.ts:922`. See `PHASE2_ERD_AND_DATA_DICTIONARY.md` section 6, which verifies this against all 937 live rows. | `information_schema.columns` | **Withdrawn** |
| 6 | FKs are 17 CASCADE / 4 SET NULL / **0 RESTRICT**; `DEEP_TECHNICAL…md:41` claims RESTRICT | schema | 2 — migration `005_ledger_fk_restrict.sql` |
| 7 | No `BEGIN`/`COMMIT` transaction anywhere in `backend/src` — atomicity is a design target, not a fact | — | 3 |
| 8 | Two payment endpoints unauthenticated | `routes/public.ts` | 3 |
| 9 | Unsubstantiated performance claims (256MB, sub-50ms, 100% consistency) | submitted docs | omit / label as targets |
| 10 | `PH` seeded as `floor = 3`; the owner confirms it is a rooftop level **above** floor 3 | `FULL_DATABASE_SCHEMA.sql:499` | 2 — incremental migration, not a schema-file edit |
| 11 | Seeded per-unit `rooms.floor` values were populated for development, not surveyed; corrected for `PH` they yield 12 / 11 / 9 / 1 against the owner's authoritative 11 / 11 / 10 / 1 — one unit out on floor 1 | `FULL_DATABASE_SCHEMA.sql:466` onward | 2 — data-cleanup migration reconciling `rooms.floor` to the survey; the published tally does not change |

Soft-delete already exists (`profiles.account_status`, `rooms.operational_status`), so the Phase 2
RESTRICT migration is safe and touches zero rows.

## Verified requirement coverage

44 functional requirements: **20 MAPPED · 13 PARTIAL · 10 MISSING · 1 FRONTEND-ONLY.**
`docs/03_REQUIREMENTS.md` is canonical for FR meanings (FR-033 = Occupant Count Memory,
FR-034 = Water Payment Validation). The submitted matrix stopped at FR-034 while the defense promised
FR-044 — errata item.

**Scope decision — NOTHING IS DE-SCOPED (owner, 2026-09-13).** All **10 MISSING** functional requirements
will be implemented in **Phase 3**. The earlier recommendation to de-scope **FR-006 Inquiry Conversion** is
**WITHDRAWN**; FR-006 is implemented in Phase 3 like the other nine, and the recommended sequencing includes
it. **FR-028 Reports** keeps its narrowed scope note but is implemented, not dropped. The Gap Register
disposition column and its summary line read **all 10 implemented in Phase 3**.

The owner additionally asked that every other incompleteness found during the audit be recorded in the same
place. The Gap Register therefore carries a labelled section, *"Beyond the FR matrix — additional
remediation carried into Phase 2 and Phase 3"*, listing the ten defects at rows **1–8** and **10–11** of the
table above — each with a phase and a one-line remediation. Row 9 (unsubstantiated performance claims) is
handled as an errata/labelling item, not a Gap Register entry, and no defect outside that list is invented.
