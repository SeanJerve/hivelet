# CONTINUE HERE — Hivelet Claude Pipeline Handoff

**Last session: 2026-09-13. Phase 1 is COMPLETE and verified. Phase 2 has not started.**

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

Read these three files in order before doing anything else:
1. docs/claude_pipeline/CONTINUE_HERE.md      <- current state and what to do next
2. docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md  <- every settled decision; treat as binding canon
3. docs/claude_pipeline/CLAUDE_PIPELINE.md    <- the master pipeline spec

Constraints that still apply:
- frontend/ and website/ are STRICTLY READ-ONLY. Backend, database and docs only.
- The Supabase database is live. Never DROP or wipe. Never edit database/FULL_DATABASE_SCHEMA.sql.
  All schema changes are incremental migrations in database/migrations/.
- STEP 0 applies: stop and ask me before producing final artifacts if anything is ambiguous.

Phase 1 is finished. Begin Phase 2 using docs/claude_pipeline/prompts/PROMPT_2_ERD_AND_DATABASE.md.
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

## Phase 2 starts here

Use `docs/claude_pipeline/prompts/PROMPT_2_ERD_AND_DATABASE.md`. Three decisions carry straight in:

- **`profiles.email` → nullable**, with the uniqueness constraint converted to a **partial unique
  index** so multiple NULLs remain legal.
- **`005_ledger_fk_restrict.sql`** — move `bills`, `payments` and `monthly_income_records`
  (`room_id`, `tenant_profile_id`) from `ON DELETE CASCADE` to `RESTRICT`. Safe: soft-delete already
  exists via `profiles.account_status` and `rooms.operational_status`, and the migration touches zero
  rows. Keep CASCADE for genuine child records (`room_photos`, `ticket_attachments`,
  `inquiry_messages`, `ticket_messages`, `expense_property_allocations`).
- **`rooms.floor` reconciliation** — correct `PH` to the rooftop level and align the per-unit floor
  values to the owner-confirmed 11 / 11 / 10 / 1.

---

## Known defects — established, not yet fixed

State these honestly; never claim any as already fixed.

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
