# CONTINUE HERE — Hivelet Claude Pipeline Handoff

**Last session: 2026-09-13. Phase 1 COMPLETE. Phase 2 COMPLETE — all four deliverables produced.**

> ### Exact state of the live Supabase database
>
> | Migration | Status |
> | :--- | :--- |
> | `005_ledger_fk_restrict` | **APPLIED** |
> | `006_profiles_optional_login` | **APPLIED** |
> | `007_rooms_floor_correction` | **APPLIED** — `PH` is on level 4 |
> | `008_property_areas_lookup` | **APPLIED** — 5 areas, 2 non-rental |
> | `009_advance_rent_and_whole_month_billing` | **APPLIED** |
> | `010_atomic_expense_allocations` | **APPLIED** |
> | `011_security_posture_corrections` | **WRITTEN, NOT APPLIED** — needs a human to run |
> | `012_penthouse_area_and_cluster_routing` | **WRITTEN, NOT APPLIED** — needs a human to run |
>
> `005`–`010` were verified individually against the live catalogue, not assumed — the evidence table
> is in the third addendum of `database/migrations/VERIFICATION.md`. **`APPLY_PHASE2.sql` does not
> need to be run again.**
>
> **`011` and `012` could not be applied from the session that wrote them** — the environment refused
> the write with `[Production Deploy]`. They are ready to run as-is.
>
> ### Two things to do first, in this order
>
> 1. **Run `database/migrations/011_security_posture_corrections.sql`.** Low risk, touches zero rows
>    of business data. Fixes a `REVOKE` that has never worked since migration `002` and brings the one
>    table missing forced RLS into line.
> 2. **Run `database/migrations/012_penthouse_area_and_cluster_routing.sql`, then** add `'Penthouse'`
>    to `PROPERTY_AREAS` in `backend/src/config/propertyAreas.ts`. **That order matters** — adding it
>    to the TypeScript list first would let the API accept a value the foreign key rejects.
>    Run `012` whole; it deliberately commits the enum change before using it, and must not be
>    wrapped in one outer transaction.
>
> ### Read this before trusting the schema file
>
> **`database/FULL_DATABASE_SCHEMA.sql` does NOT describe the live database.** Three undocumented
> differences are now known. The first two were each found by a migration failing in production
> (`rooms_floor_check`, SQLSTATE 23514; the `property_area_type` enum, SQLSTATE 42883). **The third
> was found by reading** — `fifty_percent_share` and `remitted_amount` are `GENERATED ALWAYS AS …
> STORED` columns, not the plain `DEFAULT 0.00` columns the file declares.
>
> **`database/live_schema.csv` (407 rows, exported 2026-09-13) is the source of truth**, not the
> `.sql` file. Every known difference is reproduced in
> `database/migrations/_TEST_FIXTURE_production_drift.sql`; a migration not tested against that
> fixture has not been tested.
>
> ### Defect #5 in the register below is wrong, and is corrected here
>
> It claims `fifty_percent_share` / `remitted_amount` are "computed but never written — every row
> stores `0.00`". **All 937 live rows carry correct values** — PostgreSQL generates them. The real
> defect is one line of dead code. Detail in `PHASE2_ERD_AND_DATA_DICTIONARY.md` §6.

---

## Where the project is

Phase 1 and Phase 2 are both complete. **Phase 3 is next** —
`docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md`.

This file exists so a new Claude session, on any machine, can pick up exactly where the last one
stopped. Claude's conversation history and its memory files are stored per-machine and do **not**
travel with the repository — this document and the artifacts beside it are what carry over.

### Paste this prompt

```
You are Claude, Principal Backend Architect, Systems Modeling Specialist, and Lead Database Engineer
for Hivelet Group 4 (Fe Galang Da Silva Boarding House, Bicol University Capstone Project 2).

Read these in order before doing anything else:
1. docs/claude_pipeline/CONTINUE_HERE.md            <- current state and what to do next
2. docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md  <- settled decisions; binding canon
3. docs/claude_pipeline/PHASE2_LOCKED_DECISIONS.md  <- Phase 2 closures; binding canon
4. database/migrations/VERIFICATION.md              <- what is verified, and three schema drifts
5. docs/claude_pipeline/CLAUDE_PIPELINE.md          <- the master pipeline spec

Constraints that still apply:
- The Supabase database is LIVE. Never DROP or wipe. Never edit database/FULL_DATABASE_SCHEMA.sql.
  All schema changes are incremental migrations in database/migrations/.
- Do NOT trust database/FULL_DATABASE_SCHEMA.sql. It has been wrong about the live schema three
  times. database/live_schema.csv is the source of truth.
- STEP 0 applies: stop and ask me before producing final artifacts if anything is ambiguous.
  Ask about real-world facts only - make the engineering calls yourself.

I have full authority over frontend, backend and applying migrations to Supabase.

First: apply migrations 011 and 012 (in that order), then add 'Penthouse' to PROPERTY_AREAS in
backend/src/config/propertyAreas.ts. Verify the result against the live catalogue.

Then begin Phase 3 with docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md.
```

---

## What Phase 2 produced

| File | What it is |
| :--- | :--- |
| `docs/claude_pipeline/outputs/PHASE2_ERD_AND_DATA_DICTIONARY.md` | Crow's Foot ERD over all 21 tables, cardinality justifications, FK delete policy, enum catalogue, and full data dictionaries for `rooms`, `bills`, `payments`, `monthly_income_records`, `audit_logs` |
| `docs/claude_pipeline/outputs/PHASE2_NORMALIZATION_PROOF.md` | 1NF / 2NF / 3NF proof, per-table verdict, every derived column classified by who guarantees it |
| `docs/claude_pipeline/outputs/PHASE2_SECURITY_AND_RLS.md` | RLS and security posture, three new findings, the open gaps |
| `docs/diagrams/hivelet_erd.mmd` (+ `.txt`) | The ERD source. Rendered clean under `mermaid@11.17.2` |
| `database/migrations/011_…sql`, `012_…sql` | Written, not applied — see above |

**Do not add `%%` comment lines to `hivelet_erd.mmd`.** This version of the Mermaid CLI collapses
them into the first token and the file stops parsing (`Expecting 'ER_DIAGRAM', got '%'`). Provenance
comments belong in the markdown document.

### Headline results of the normalization audit

- **1NF 20/21 · 2NF 21/21 · 3NF 20/21.**
- The one genuine 3NF violation is **`rooms.is_linda_unit`**, transitively determined by
  `cluster_code` (0 of 33 rows disagree). Fix proposed, deferred to Phase 3.
- The one 1NF weakness is **`monthly_expense_entries.or_supplier`**, which holds receipt numbers,
  supplier names, payees and date ranges in one free-text column — 797 distinct values over 1,262
  rows, including `101 Shoping mall` and `101 Shoping Mall` as separate strings. Consequence:
  **you cannot total spending by supplier.** Declared and deliberately deferred.
- `monthly_income_records.year` / `month` are **proven not derivable** from any date column (88 and
  254 counterexamples). Worth offering at the defense before being asked.

---

## Decisions already locked — do not reopen

Full detail in `PHASE1_LOCKED_DECISIONS.md` and `PHASE2_LOCKED_DECISIONS.md`. Summary:

1. **Property model.** 33 units, 5 clusters, three residential floors plus a rooftop penthouse level.
   Floors **11 / 11 / 10 / 1**, reconfirmed by the owner on 2026-09-13. "Main Building / Annex A /
   Annex B" are **not** cluster names — "Annex" is the family's word for a *floor*.
2. **Errata posture.** Supersede the submitted Module 01 pack and hand the panel an errata sheet.
3. **Business rules.** `docs/02_BUSINESS_RULES.md` (BR-001…BR-049) is the one canonical namespace.
   The pipeline's seven pillars are **ARCH-001…ARCH-007**, never `BR-`.
4. **Pattern.** *Layered Client–Server Architecture Structured as a Modular Monolith with a Pluggable
   Payment Gateway Adapter.* Exactly five tiers. Tier 1 is Vue 3, not React.
5. **BR-035 `fifty_percent_share`.** Describe **only** as a system-computed figure equal to half the
   row's Rent Amount, retained for ledger parity with the landlady's historical spreadsheet. Never
   model a party or recipient; never state or imply any purpose, destination or external use. Hard
   editorial constraint, not a style preference.
6. **Adyen.** Committed. No "mock", "simulator" or "Pending Consultation" language survives in the
   narrative. The fallback gateway code stays in the codebase but never appears in the write-up.
7. **Rate changes (ARCH-004).** No 2% automation of any kind. Manual, recorded in `room_price_history`.
8. **Tenant identity.** Every tenant is a record; a portal login is **optional**.
9. **Scope.** All 10 MISSING functional requirements are implemented in Phase 3. Nothing de-scoped.
10. **OD-15 — Penthouse gets its own expense category; Linda books to Back Apartment.** Confirmed by
    the owner 2026-09-13. Migration `012` implements it.

---

## Known defects — established, not yet fixed

State these honestly; never claim any as already fixed.

| # | Defect | Evidence | Phase |
| :-- | :--- | :--- | :-- |
| 1 | `system_settings` holds 6 correctly seeded keys, read by **zero** lines of backend code | — | 3 |
| 2 | Water rate hardcoded `occupants * 200` | `admin.ts:910, 1103, 1243`; `tenant.ts:440` | 3 |
| 3 | Share divisor hardcoded `rentAmount / 2` | `admin.ts:911, 1102` | 3 |
| 4 | Grace period hardcoded to 10 days, contradicting seeded `grace_period_days = 7` and BR-012 | `tenant.ts:453` | 3 |
| 5 | ~~`fifty_percent_share` / `remitted_amount` never written — every row stores `0.00`~~ **CORRECTED: both are `GENERATED ALWAYS AS … STORED`; all 937 rows are correct. The real defect is one line of dead code that computes a value nothing reads.** | `admin.ts:922` | 3 — trivial |
| 6 | ~~Foreign keys are 17 CASCADE / 4 SET NULL / 0 RESTRICT~~ **FIXED by `005`.** Now 7 RESTRICT / 11 CASCADE / 1 SET NULL / 19 NO ACTION | live catalogue | done |
| 7 | No `BEGIN`/`COMMIT` transaction anywhere in `backend/src`. `replace_expense_allocations` (`010`) is the only atomic multi-row write, and it is a database function because supabase-js cannot open a transaction | — | 3 |
| 8 | Two payment endpoints carry no authentication middleware at all | `public.ts:202`, `:853` | 3 |
| 9 | ~~`PH` seeded as `floor = 3`~~ **FIXED by `007`.** `PH` is on level 4 | live catalogue | done |
| 10 | `rooms.floor` values were populated for development, not surveyed — **and they contradict the owner's survey.** See OD-14 below | live catalogue | 2 → open |
| 11 | Supabase Storage is **not** referenced by any backend code — a design target, not an integration | — | 3 |
| 12 | **NEW.** `rooms.is_linda_unit` is transitively determined by `cluster_code` — the one genuine 3NF violation | `PHASE2_NORMALIZATION_PROOF.md` §4.3 | 3 |
| 13 | **NEW.** `property_areas` is the only table without forced RLS | fixed by `011`, not yet applied | 2 |
| 14 | **NEW.** Migration `002`'s `REVOKE … FROM anon, authenticated` on `current_user_role()` has never done anything — `EXECUTE` is held via `PUBLIC` | fixed by `011`, not yet applied | 2 |

---

## Still genuinely open

| ID | Item | Why it matters | Gate |
| :-- | :--- | :--- | :-- |
| **OD-14** | **Which unit's stored floor is wrong.** The database says **12 / 11 / 9 / 1**; the owner says **11 / 11 / 10 / 1**. Both total 33, and the error is symmetrical — one unit too many on the ground floor, one too few on the third — so **exactly one row's `floor` is wrong**. Ground floor as stored: `1a`–`1h`, `B1F`, `F1`, `LF`, `LB`. | The ERD and data dictionary are unaffected (neither asserts per-floor counts), but any public document stating the distribution is asserting something the data contradicts. **No migration was written: moving a row on a guess would corrupt the one artifact whose job is to describe the building truthfully.** | 2 |
| **OD-17** | **Is `LF` a Linda unit or a Front Apartment unit?** The owner said on 2026-09-13 *"there is no linda front … the linda front its an apartment"* and *"we should remove it as linda front, it should be … front apartment"* — but also that the Front Apartment *"consists of 3 units, 1 ground and 2 on the 2nd floor"*, which `F1`, `F2B` and `F2F` already satisfy. Moving `LF` in would make it 4. | `LF` is a real, separately let unit: **31 income records**, its own tenant (`Gayon LGPT`), and its own ₱400 Linda water charge — distinct from `LB`'s ₱200. It cannot simply be deleted. Its cluster decides which expense bucket its costs land in once `012` is applied. | 2 |
| **OD-02** | GBG garbage fee timing — fixed calendar month, unit anniversary month, or administrator discretion | — | 3 |
| **OD-10** | Tenant-submitted payments (form F-12) — does the form stay, and does `payment:submit:own` get added | — | 3 |
| **OD-16** | "No late payment" vs the seeded 7-day grace period | `billingService` cannot be specified until this is settled | 3 |

**OD-14 and OD-17 are one short conversation with the client.** The question that resolves both:
*walk the ground floor and the third floor, and say which units are on each.*

---

*Phase 2 complete. Next: `docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md`.*
