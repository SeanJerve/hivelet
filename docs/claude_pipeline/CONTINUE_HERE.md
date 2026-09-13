# CONTINUE HERE — Hivelet Claude Pipeline Handoff

**Last session: 2026-09-13. Phase 1 COMPLETE. Phase 2 IN PROGRESS — migrations part-applied.**

> ### Exact state of the live Supabase database
>
> | Migration | Status |
> | :--- | :--- |
> | `005_ledger_fk_restrict` | **APPLIED** |
> | `006_profiles_optional_login` | **APPLIED** |
> | `007_rooms_floor_correction` | **APPLIED** — `PH` is on level 4 |
> | `008_property_areas_lookup` | **NOT APPLIED** — rolled back twice, now fixed |
> | `009_advance_rent_and_whole_month_billing` | **NOT APPLIED** |
> | `010_atomic_expense_allocations` | **NOT APPLIED** |
>
> **Next action: run `database/migrations/APPLY_PHASE2.sql`.** It is idempotent — `005`–`007`
> re-apply as no-ops and it continues from `008`. The Supabase MCP server is authenticated and
> connected, so a session that has its tools can apply and verify this directly.
>
> ### Read this before trusting the schema file
>
> **`database/FULL_DATABASE_SCHEMA.sql` does NOT describe the live database.** Two undocumented
> differences have been found, each by a migration failing in production after passing every local
> test — `rooms_floor_check` (broke `007`, SQLSTATE 23514) and the `property_area_type` enum (broke
> `008`, SQLSTATE 42883, and falsified that migration's stated premise). Neither appears anywhere in
> this repository.
>
> Two found by accident means the count is not two. **`database/live_schema.csv` (407 rows, exported
> 2026-09-13) is the source of truth for the schema**, not the `.sql` file. Every known difference is
> reproduced in `database/migrations/_TEST_FIXTURE_production_drift.sql`; a migration not tested
> against that fixture has not been tested. Full account in `database/migrations/VERIFICATION.md`.
>
> ### Scope has widened since Phase 1
>
> The owner granted full authority on 2026-09-13: **frontend changes, backend changes and applying
> migrations to Supabase are all in scope now.** The Phase 1 "frontend is READ-ONLY" constraint no
> longer applies. Frontend fixes have already been made and are committed.
>
> Seven open decisions were closed — see `PHASE2_LOCKED_DECISIONS.md`, binding canon alongside
> `PHASE1_LOCKED_DECISIONS.md`. Three new questions opened (OD-14 floor-1 count, OD-15 Penthouse and
> Linda have no expense area, OD-16 grace period vs no-late-payment); OD-02 and OD-10 remain.
>
> The ERD, data dictionary and 3NF proof — the main Phase 2 deliverables — are **still to be
> produced**, and must be built from `live_schema.csv`.

This file exists so a new Claude session, on any machine, can pick up exactly where the last one
stopped. Claude's conversation history and its memory files are stored per-machine and do **not**
travel with the repository — this document and the artifacts beside it are what carry over.

---

## How to resume in a new environment

1. Clone or pull the repository, then open it so the working directory is the folder containing
   `backend/`, `database/` and `docs/`.
2. Start Claude and paste the prompt below.

### Paste this prompt

```
You are Claude, Principal Backend Architect, Systems Modeling Specialist, and Lead Database Engineer
for Hivelet Group 4 (Fe Galang Da Silva Boarding House, Bicol University Capstone Project 2).

Read these in order before doing anything else:
1. docs/claude_pipeline/CONTINUE_HERE.md            <- current state and what to do next
2. docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md  <- settled decisions; binding canon
3. docs/claude_pipeline/PHASE2_LOCKED_DECISIONS.md  <- Phase 2 closures; binding canon
4. database/migrations/VERIFICATION.md              <- what is verified, and two schema-drift failures
5. docs/claude_pipeline/CLAUDE_PIPELINE.md          <- the master pipeline spec

Constraints that still apply:
- The Supabase database is LIVE. Never DROP or wipe. Never edit database/FULL_DATABASE_SCHEMA.sql.
  All schema changes are incremental migrations in database/migrations/.
- Do NOT trust database/FULL_DATABASE_SCHEMA.sql. It has been wrong about the live schema twice.
  database/live_schema.csv is the source of truth.
- STEP 0 applies: stop and ask me before producing final artifacts if anything is ambiguous.
  Ask about real-world facts only - make the engineering calls yourself.

No longer a constraint: the frontend is NOT read-only any more. I granted full authority over
frontend, backend and applying migrations to Supabase.

First: apply database/migrations/APPLY_PHASE2.sql (idempotent; 005-007 are already live, it
continues from 008) and verify the result. The Supabase MCP server is authenticated, so use it.

Then continue Phase 2 with docs/claude_pipeline/prompts/PROMPT_2_ERD_AND_DATABASE.md. Its remaining
deliverables are the Crow's Foot ERD, the data dictionary and the 3NF proof - all built from
database/live_schema.csv, not from the schema file.
```

---

## What Phase 1 produced

| File | What it is |
| :--- | :--- |
| `docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md` | **Read this first.** Every settled decision, the full defect register, and the editorial constraints. Binding canon. |
| `docs/claude_pipeline/outputs/PHASE1_ARCHITECTURE_AND_PATTERN.md` | The flagship defense: canonical pattern, five-tier decomposition, Four-Part Justification, alternatives, as-built vs to-be |
| `docs/claude_pipeline/outputs/PHASE1_DFD_TRACEABILITY.md` | Legacy lab DFD → modern DFD → physical tables and backend components |
| `docs/claude_pipeline/outputs/PHASE1_TRACEABILITY_MATRIX.md` | FR-001…FR-044 with route and table evidence, plus the Gap Register |
| `docs/claude_pipeline/outputs/PHASE1_BR_CROSSWALK.md` | BR-001…BR-049 register, ARCH-001…ARCH-007 pillars, collision table |
| `docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md` | What is genuinely still open, and what is closed |
| `docs/claude_pipeline/outputs/PHASE1_MODULE01_ERRATA.md` | The errata sheet to hand the panel |
| `docs/04_ARCHITECTURE.md` | Rewritten baseline with real pinned versions |
| `docs/diagrams/*.mmd` (+ `.txt` mirrors) | Architecture, Level 0 DFD, Level 1 DFD, ERD, payment sequence |

All diagrams were rendered under `mermaid@11.17.2` and parse cleanly. Roughly 400 `file:line`
citations were machine-verified against the files they cite.

---

## Decisions already locked — do not reopen

Full detail lives in `PHASE1_LOCKED_DECISIONS.md`. Summary:

1. **Property model.** 33 units, 5 clusters, three residential floors plus a rooftop penthouse level.
   Floors **11 / 11 / 10 / 1**. "Main Building / Annex A / Annex B" are **not** cluster names —
   "Annex" is the family's word for a *floor*.
2. **Errata posture.** Supersede the submitted Module 01 pack and hand the panel an errata sheet.
3. **Business rules.** `docs/02_BUSINESS_RULES.md` (BR-001…BR-049) is the one canonical namespace.
   The pipeline's seven pillars are **ARCH-001…ARCH-007**, never `BR-`.
4. **Pattern.** *Layered Client–Server Architecture Structured as a Modular Monolith with a Pluggable
   Payment Gateway Adapter.* Exactly five tiers. Tier 1 is Vue 3, not React.
5. **BR-035 `fifty_percent_share`.** Describe **only** as a system-computed figure equal to half the
   row's Rent Amount, retained for ledger parity with the landlady's historical spreadsheet. Never
   model a party or recipient; never state or imply any purpose, destination or external use. This is
   a hard editorial constraint, not a style preference.
6. **Adyen.** Committed. A developer sandbox account is configured and the GCash flow runs against it.
   No "mock", "simulator" or "Pending Consultation" language survives anywhere. The fallback gateway
   code stays in the codebase but never appears in the narrative.
7. **Rate changes (ARCH-004 Rate Change History).** No 2% automation of any kind. The administrator
   sets rates manually; every change is recorded in `room_price_history`.
8. **Tenant identity.** Every tenant is a record; a portal login is **optional**. `profiles.email`
   becomes nullable, `phone_number` becomes an alternate login identifier, and a tenant may exist
   with no credentials (administrator-managed billing).
9. **Scope.** All 10 MISSING functional requirements are implemented in Phase 3. Nothing de-scoped.

---

## Phase 2 — what is done and what remains

**Done and committed** (migrations are written; **none has been applied to any database**):

| Migration | What it does | Decision |
| :--- | :--- | :--- |
| `005_ledger_fk_restrict.sql` | Six ledger FKs → `ON DELETE RESTRICT`. Locates constraints by column, not assumed name. Touches zero rows. | Phase 1 handoff |
| `006_profiles_optional_login.sql` | `profiles.email` nullable; drops the redundant raw-email unique constraint; `phone_number` as alternate login identifier, unique on digits and scoped to credentialed rows. | OD-09 |
| `007_rooms_floor_correction.sql` | `PH` → rooftop level 4. Corrects **only** `PH`. | OD-13 |
| `008_property_areas_lookup.sql` | Five-row `property_areas` lookup + FK; marks Main House and Other/Personal **non-rental**. | OD-05 |
| `009_advance_rent_and_whole_month_billing.sql` | `COMMENT`s only. `deposit_amount` is advance rent, not a deposit; rent is never prorated. | OD-04, OD-03 |

Also done: `PROMPT_2_ERD_AND_DATABASE.md` reconciled to locked canon (it predated Phase 1 alignment and
contradicted it in five places), and `PHASE2_LOCKED_DECISIONS.md` written.

**One correction to the Phase 1 handoff, for the record.** It said the email uniqueness constraint
"must become a partial unique index so multiple NULLs remain legal". That reasoning is wrong —
PostgreSQL `UNIQUE` already permits multiple NULLs (`NULLS DISTINCT`), so dropping `NOT NULL` was the
only change required. The partial index is kept for efficiency and intent, not correctness.

**Remaining Phase 2 deliverables** — the substance of `PROMPT_2_ERD_AND_DATABASE.md`, none started:

1. The Crow's Foot ERD in Mermaid, covering all 20 tables plus `property_areas` (21).
2. The formal data dictionary for `rooms`, `bills`, `payments`, `monthly_income_records`, `audit_logs`.
3. The written 1NF / 2NF / 3NF proof.
4. The RLS and security posture write-up.

**`005`–`009` are verified.** They were applied in order to a throwaway PostgreSQL 16 loaded with the
real schema, then re-applied to confirm idempotency, and their behaviour was exercised case by case —
full record in `database/migrations/VERIFICATION.md`. Verification caught and fixed a real defect in
`006` (phone normalisation did not fold the `+63` prefix, so one human number could hold two logins).

**Read the risk section of that record before applying `008` to Supabase.** It turns a silent bad
write into a hard error, and `backend/src/routes/admin.ts:1471-1477` deletes an entry's allocations
before inserting replacements with no transaction — so a rejected insert loses them.

---

## Known defects — established, not yet fixed

State these honestly; never claim any as already fixed.

> **Status note.** Defects **6**, **9** and **10** now have migrations written for them (`005`, `007`).
> Written is not applied. Until someone runs them against the database, all three are still live
> defects and must be described that way.

| # | Defect | Evidence | Phase |
| :-- | :--- | :--- | :-- |
| 1 | `system_settings` holds 6 correctly seeded keys, read by **zero** lines of backend code | — | 3 |
| 2 | Water rate hardcoded `occupants * 200` | `admin.ts:910, 1103, 1243`; `tenant.ts:440` | 3 |
| 3 | Share divisor hardcoded `rentAmount / 2` | `admin.ts:911, 1102` | 3 |
| 4 | Grace period hardcoded to 10 days, contradicting seeded `grace_period_days = 7` and BR-012 | `tenant.ts:453` | 3 |
| 5 | `fifty_percent_share` / `remitted_amount` computed but **never written** — every row stores `0.00` | `admin.ts:911` | 3 |
| 6 | Foreign keys are 17 CASCADE / 4 SET NULL / **0 RESTRICT** | schema | 2 |
| 7 | No `BEGIN`/`COMMIT` transaction anywhere in `backend/src` — atomicity is a design target | — | 3 |
| 8 | Two payment endpoints unauthenticated | `routes/public.ts` | 3 |
| 9 | `PH` seeded as `floor = 3`; it is a rooftop level above floor 3 | `FULL_DATABASE_SCHEMA.sql:499` | 2 |
| 10 | `rooms.floor` values populated for development, not surveyed | `FULL_DATABASE_SCHEMA.sql:466`+ | 2 |
| 11 | Supabase Storage is **not** referenced by any backend code — a design target, not an integration | — | 3 |

---

## Still genuinely open

See `PHASE1_OPEN_DECISIONS_REGISTER.md` for the full register with owners and gates. The items most
likely to block Phase 2 are income running-total scope, GBG fee timing, mid-cycle vacancy proration,
and deposit refund or forfeiture on move-out.
