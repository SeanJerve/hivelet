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
> | `011_security_posture_corrections` | **APPLIED** — 21 of 21 tables under forced RLS |
> | `012_penthouse_area_and_cluster_routing` | **APPLIED** — 6 areas, every cluster routed |
> | `013_fix_replace_allocations_enum_cast` | **APPLIED** — the broken expense edit works again |
> | `014_codify_production_only_objects` | **APPLIED** — a no-op in production, as intended |
> | `015_correct_front_apartment_floor` | **APPLIED** — floors are now 11 / 11 / 10 / 1, closing OD-14 |
>
> `005`–`010` were verified individually against the live catalogue, not assumed — the evidence table
> is in the third addendum of `database/migrations/VERIFICATION.md`. **`APPLY_PHASE2.sql` does not
> need to be run again.**
>
> **Everything is applied. Nothing is pending.** `005`-`014` are all live, verified against the
> catalogue rather than assumed:
>
> | Check | Live value |
> | :--- | :--- |
> | Tables under forced RLS | **21 of 21** |
> | `anon` can execute `current_user_role()` | **false** |
> | Our functions with a mutable `search_path` | **none** |
> | Extension functions altered by `011` | **0** |
> | Property areas | **6, of which 4 rental** |
> | Clusters routing nowhere | **0** |
> | BR-044 unique key / BR-045 trigger | both present |
> | Row counts (entries / allocations / rooms) | **1,262 / 1,327 / 33** — unchanged |
> | Floor distribution | **11 / 11 / 10 / 1** — matches the survey |
>
> ### The expense-edit bug is fixed
>
> `PATCH /api/admin/expense-entries/:id` had been returning 500 on every allocation edit since the
> atomic-allocation code shipped: migration `010`'s `replace_expense_allocations()` inserted uncast
> `text` into the `property_area_type` enum column, raising `42804` on every call. It failed safely —
> the transaction rolled back and entries kept their allocations — but the feature did not work.
>
> `013` repairs it by reading the column's real type from the catalogue and casting to it. **Verified
> against production**, not just in a container: a self-cleaning test created an entry, replaced its
> allocations across two areas, confirmed a non-canonical label is refused with the originals intact,
> then deleted itself. Row counts came back to exactly 1,262 / 1,327.
>
> `backend/src/config/propertyAreas.ts` and `frontend/src/lib/systemState.ts` now carry the sixth
> area, `Penthouse` — updated **after** `012`, not before. Both type-check clean.
>
> ### Read this before trusting the schema file
>
> **`database/FULL_DATABASE_SCHEMA.sql` does NOT describe the live database.** **SEVEN** undocumented
> differences are now known — the fixture previously claimed to hold "every known difference" and held
> two. The worst are: the schema file contains **zero `CREATE TYPE` statements** while production
> defines **13 enum types across 17 columns**; and `update_expense_entry_total()` with its trigger —
> the object that makes BR-045 true — **exists only in the production database** and in no file in
> this repository. Restore production from the repo and expense totals silently stop tracking their
> allocations. All seven are now reproduced by `_TEST_FIXTURE_production_drift.sql`.
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
4. database/migrations/VERIFICATION.md              <- what is verified, and seven schema drifts
5. docs/claude_pipeline/CLAUDE_PIPELINE.md          <- the master pipeline spec

Constraints that still apply:
- The Supabase database is LIVE. Never DROP or wipe. Never edit database/FULL_DATABASE_SCHEMA.sql.
  All schema changes are incremental migrations in database/migrations/.
- Do NOT trust database/FULL_DATABASE_SCHEMA.sql. It has been wrong about the live schema in seven
  known ways. database/live_schema.csv is the source of truth, and
  database/migrations/_TEST_FIXTURE_production_drift.sql reproduces all seven locally.
- STEP 0 applies: stop and ask me before producing final artifacts if anything is ambiguous.
  Ask about real-world facts only - make the engineering calls yourself.

I have full authority over frontend, backend and applying migrations to Supabase.

Migrations 005-015 are all applied and verified - there is no database work pending.
The floor distribution is 11 / 11 / 10 / 1 and OD-14 and OD-17 are closed.

Begin Phase 3 with docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md. That prompt has
already been reconciled to locked canon - read its banner first; it lists six contradictions and
four false claims about the codebase that were corrected, and the schema facts that would otherwise
make its INSERT instructions fail.

OD-16 gates billingService specifically. Everything else in Phase 3 can proceed without it.
```

---

## What Phase 2 produced

| File | What it is |
| :--- | :--- |
| `docs/claude_pipeline/outputs/PHASE2_ERD_AND_DATA_DICTIONARY.md` | Crow's Foot ERD over all 21 tables, cardinality justifications, FK delete policy, enum catalogue, and full data dictionaries for `rooms`, `bills`, `payments`, `monthly_income_records`, `audit_logs` |
| `docs/claude_pipeline/outputs/PHASE2_NORMALIZATION_PROOF.md` | 1NF / 2NF / 3NF proof, per-table verdict, every derived column classified by who guarantees it |
| `docs/claude_pipeline/outputs/PHASE2_SECURITY_AND_RLS.md` | RLS and security posture, three new findings, the open gaps |
| `docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md` | **Reconciled to canon.** Six contradictions and four false claims about the codebase corrected before Phase 3 starts |
| `docs/diagrams/hivelet_erd.mmd` (+ `.txt`) | The ERD source. Rendered clean under `mermaid@11.17.2` |
| `database/migrations/011_…sql` … `014_…sql` | Tested against a production-like database over three passes, then **applied to production and verified** |
| `database/migrations/_TEST_FIXTURE_production_drift.sql` | Rewritten: now reproduces all **seven** known drifts, not two |

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
| 10 | ~~`rooms.floor` values were populated for development and contradict the survey~~ **FIXED by `015`.** `F1` moved to floor 3; the distribution is 11 / 11 / 10 / 1 | live catalogue | done |
| 11 | Supabase Storage is **not** referenced by any backend code — a design target, not an integration | — | 3 |
| 12 | **NEW.** `rooms.is_linda_unit` is transitively determined by `cluster_code` — the one genuine 3NF violation | `PHASE2_NORMALIZATION_PROOF.md` §4.3 | 3 |
| 13 | ~~`property_areas` is the only table without forced RLS~~ **FIXED by `011`.** 21 of 21 forced | live catalogue | done |
| 14 | ~~Migration `002`'s `REVOKE` on `current_user_role()` has never done anything~~ **FIXED by `011`.** Also worth knowing: that function **fails open**, returning `'admin'` when it cannot identify the caller. Nothing consults it (zero policies), but it is now revoked from `PUBLIC` | live catalogue | done |
| 15 | ~~`replace_expense_allocations()` inserts uncast `text` into an enum column, so every expense-entry allocation edit 500s~~ **FIXED by `013`**, verified against production | live catalogue | done |
| 16 | ~~BR-045's trigger and BR-044's unique key existed **only in the production database**~~ **FIXED by `014`.** Both are now created by a migration, so a rebuilt database gets them | live catalogue | done |
| 17 | **NEW.** The Linda fixed electricity charge is attributed to `LB` in `system_settings` and was shown that way in the UI; 31 months of ledger data and the owner's spreadsheet both say it is `LF`. UI corrected; the setting deliberately left alone. See OD-18 | `monthly_income_records`; source workbook | 3 |

---

## Still genuinely open

**OD-14 and OD-17 are closed.** The client gave a building-by-building breakdown on 2026-09-13 which
settled both — full account in `PHASE2_LOCKED_DECISIONS.md`, second addendum.

| ID | Item | Why it matters | Gate |
| :-- | :--- | :--- | :-- |
| **OD-18** | **The Linda fixed electricity charge is recorded against the wrong unit.** `system_settings.linda_lb_electricity_charge = 325` says **LB**. The ledger says **LF**: charged in 31 of 31 months (min ₱325, max ₱2,285.76), while LB is charged in **0 of 31**. The owner's spreadsheet agrees with the ledger. | The setting is read by zero lines of backend code today (defect 1), so nothing is mis-billing yet — but it would the moment `billingService` is wired up in Phase 3. | 3 |
| **OD-02** | GBG garbage fee timing — fixed calendar month, unit anniversary month, or administrator discretion | — | 3 |
| **OD-10** | Tenant-submitted payments (form F-12) — does the form stay, and does `payment:submit:own` get added | — | 3 |
| **OD-16** | "No late payment" vs the seeded 7-day grace period | `billingService` cannot be specified until this is settled | 3 |

**One thing to eyeball on the next walk-through.** Migration `015` places `F1` on the **third** floor.
That is forced by arithmetic once both Linda units sit on the ground floor, but the code `F1` reads
like "Front, floor 1", so it is the single inference in the whole floor correction. `rooms.floor` is
display-only — if it is wrong it is a label, not money.

---

*Phase 2 complete. Next: `docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md`.*
