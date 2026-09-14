# HIVELET — PHASE 1 BUSINESS RULE CROSSWALK

**Web-Based Boarding House Management & Financial Operations System**
Client: Fe Galang Da Silva Boarding House, Legazpi City
Bicol University — College of Science — IT 124 Capstone Project 2 — **Group 4**

| | |
| --- | --- |
| **Adviser** | Dr. Jayvee Christopher Vibar |
| **Panel** | Dr. Aris J. Ordonez (Chair), Prof. Ryan A. Rodriguez, Prof. Laarni D. Pancho |
| **Team** | Sean Jerve Ll. Rebancos (System Architect / Full-Stack) · John Lloyd M. Cuario (Database Administrator / Data Analyst) · Eljohn Paulo C. Loterte (Frontend / UI-UX) · Victor Noel A. Napay (Backend / Integration) · Kiel Hedrix V. Relos (QA / Systems Analyst) |
| **Artifact** | Phase 1 corrected artifact — supersedes the `BR-001 .. BR-007` numbering in `docs/claude_pipeline/CLAUDE_PIPELINE.md:140-146` |

---

## 0. Why this document exists

Two independent rule registers grew inside this repository under the same `BR-` prefix.
`docs/02_BUSINESS_RULES.md` defines forty-nine numbered business rules. A later planning
document, `docs/claude_pipeline/CLAUDE_PIPELINE.md`, introduced seven "architectural pillars"
and also labelled them `BR-001` through `BR-007`. The two sets collide head-on: canonical
`BR-003` is Historical Preservation, while the pillar set's `BR-003` addressed the derived
half-of-rent ledger column. A citation of "BR-003" in a submitted document is therefore
ambiguous, and at least four published citations are already wrong because of it.

This crosswalk resolves the collision permanently:

1. **`docs/02_BUSINESS_RULES.md` (BR-001 .. BR-049) is the one canonical `BR-` namespace.**
   Every business-rule citation in every Hivelet artifact resolves against it and nothing else.
2. **The seven pillars are renumbered `ARCH-001 .. ARCH-007`** and reclassified as
   *architectural pillars*, not business rules. They never again carry a `BR-` prefix.
3. Each pillar is re-expressed below as a set of *real* canonical BR citations, so the
   architectural argument survives the renumbering intact.

Section 1 is the canonical register with verified enforcement evidence. Section 2 is the pillar
crosswalk. Section 3 is the collision table. Section 4 is the misattribution register from which
the Phase 1 errata sheet is drawn.

**Evidence convention.** Every `file:line` reference below was read at the cited line. Database
references point at `database/FULL_DATABASE_SCHEMA.sql`; code references point at `backend/src/`.
Peso amounts are written `PHP`.

---

## 1. Canonical business rule register — BR-001 .. BR-049

**Status legend**

| Status | Meaning |
| --- | --- |
| **Enforced** | A verified schema constraint or code path makes the rule hold at runtime today. |
| **Partial** | Enforced on some paths or at one layer only; a reachable path bypasses it. |
| **Schema only** | Columns or seed rows exist and are correct; no code reads or writes them yet. |
| **Not enforced** | No constraint and no code path implements the rule today. |
| **Violated** | Code exists and actively contradicts the rule. |

### 1.1 Property, rooms and occupancy — BR-001 .. BR-008

| ID | Name | Rule | Enforcement locus (verified) | Status |
| --- | --- | --- | --- | --- |
| **BR-001** | Single Property Scope | Hivelet manages exactly one property, the Fe Galang Da Silva Boarding House. | Enforced structurally by the absence of a `properties` table — `clusters` (`FULL_DATABASE_SCHEMA.sql:26`) is the root of the location hierarchy and `rooms.cluster_code` (`:87`) is its only parent key. No property discriminator exists to be mis-set. | Enforced |
| **BR-002** | Room Identity | Each unit is uniquely identified by room number within its floor context. The building form is **three residential floors plus a rooftop penthouse level**; the owner-confirmed per-floor distribution (2026-09-13) is **floor 1 = 11, floor 2 = 11, floor 3 = 10, floor 4 (rooftop penthouse, `PH`) = 1 — 33 units in total**. | `rooms.room_number VARCHAR(20) UNIQUE NOT NULL` (`FULL_DATABASE_SCHEMA.sql:88`) plus `rooms.floor INTEGER NOT NULL DEFAULT 1` (`:89`). | Enforced |
| **BR-003** | Historical Preservation | Records are not silently deleted because a room, tenant, payment, inquiry or expense went inactive. | Soft-delete columns exist and are used: `monthly_income_records.voided_at / voided_by / void_reason` (`FULL_DATABASE_SCHEMA.sql:279-281`), written by `DELETE /api/admin/income-records/:id`, which issues an `UPDATE`, not a `DELETE` (`backend/src/routes/admin.ts:1303-1310`). `profiles.account_status` (`:56`) and `rooms.operational_status` (`:95`) carry the tenant and unit soft states. **Counter-evidence:** `DELETE /api/admin/rooms/:roomId` issues a physical `.delete()` (`backend/src/routes/admin.ts:283`), and the seventeen `ON DELETE CASCADE` foreign keys propagate that removal into dependent ledger rows. **CLOSED 2026-09-14, after two further findings.** (1) `DELETE /api/admin/rooms/:roomId` was an unguarded hard DELETE. The ledger survives it - migration `005` moved `bills`, `payments` and `monthly_income_records` to `ON DELETE RESTRICT`, and all 33 rooms hold ledger rows, which is why nothing was lost - but `room_price_history`, `room_assignments`, `inquiries` and `room_photos` all `CASCADE` from `rooms`, so a room without ledger rows took its whole history with it silently. The route now refuses to delete a room holding any record and names what it is protecting; it also logged the deletion as `ROOM_UPDATE`, so the one surviving record said the room had been edited rather than destroyed. (2) The `room_price_history` insert discarded its result - no `error` was destructured - and ran after `rooms` had already been updated, so a rejected insert left the new rate live and no record of the old one. Migration `020` moves the row to an AFTER UPDATE trigger on `rooms`, so a rate cannot be changed without being recorded by any write path; the route keeps only attribution. Verified end to end against the live database: the trigger fired, the route attributed both rows, and the probe was reverted to zero rows and PHP 181,700 total rent. | **Enforced** |
| **BR-004** | Room Occupancy | A room is occupied when the administrator records an active tenant relationship for it. | `room_assignments.is_active BOOLEAN NOT NULL DEFAULT TRUE` (`FULL_DATABASE_SCHEMA.sql:162`); assignment created at `backend/src/routes/admin.ts:409-418` and the unit flipped to `Occupied` at `:426`. | Enforced |
| **BR-005** | Room Availability | The administrator returns a room to availability, may mark it under maintenance, and may set an expected availability date. | Status vocabulary pinned at the API edge by `z.enum(['Available','Reserved','Occupied','Under Maintenance'])` (`backend/src/routes/admin.ts:56`, `:114`); `rooms.available_from DATE` (`FULL_DATABASE_SCHEMA.sql:98`); release paths at `admin.ts:532` and `:701`; maintenance flip at `:1638`. | Enforced |
| **BR-006** | Reservation | A reserved room must not accept new public inquiries while the reservation stands. | `backend/src/routes/public.ts:145-150` rejects the inquiry with a 409 when `room.operational_status === 'Reserved'`. | Enforced |
| **BR-007** | Website Visibility | Operational status and public visibility are separate axes; a unit may stay listed while reserved or under maintenance. | Two independent columns — `rooms.operational_status` (`FULL_DATABASE_SCHEMA.sql:95`) and `rooms.visibility_status` (`:96`) — with the public catalog filtering on visibility alone (`backend/src/routes/public.ts:141-143`; doctrine note at `:38-44`). | Enforced |
| **BR-008** | Primary Contact | A room has one primary accountable contact for official communication and transactions. | `room_assignments.is_primary_contact BOOLEAN NOT NULL DEFAULT TRUE`, surfaced at `backend/src/routes/tenant.ts:53`. Previously recorded as resting on "administrator discipline" because no partial unique index restricts a room to one primary contact. **CORRECTED 2026-09-14: it does not need one.** `idx_single_active_assignment_per_room` - `UNIQUE (room_id) WHERE is_active = true`, present in the live catalogue - permits a room **one active assignment**, and `is_primary_contact` lives on that assignment. At most one active primary contact per room therefore falls out of the index, transitively. Live data: **0** rooms with more than one active assignment and **0** with more than one active primary contact, across 32 active assignments. | **Enforced** |

### 1.2 Tenancy lifecycle and inquiries — BR-009, BR-024 .. BR-027

| ID | Name | Rule | Enforcement locus (verified) | Status |
| --- | --- | --- | --- | --- |
| **BR-009** | Inquiry Conversion | Conversion reuses stored prospect information rather than forcing retyping; conversion does not guarantee tenancy. | `inquiries.converted_tenant_id UUID REFERENCES profiles(id)` (`FULL_DATABASE_SCHEMA.sql:189`) and the `Converted` status value (`backend/src/routes/admin.ts:745`). The conversion endpoint itself only flips status (`admin.ts:748-785`); no prospect-to-onboarding field carry-over is implemented, so the "no retyping" clause is unmet. | Partial |
| **BR-024** | Tenant Privacy | A tenant reaches only the records they are authorized to reach. | Row scoping in `backend/src/services/scopeService.ts:28` (`resolveTenantScope`) and `:55` (`assertRoomInScope`); identity gate `requireSelfOrAdmin` at `backend/src/middleware/auth.ts:146`; every `*:read:all` permission withheld from the tenant role with the reason recorded inline (`backend/src/config/rbac.ts:117`). | Enforced |
| **BR-025** | Tenant Deactivation | On a settled departure the tenant account goes inactive; history remains. | `POST /api/admin/tenants/:profileId/vacate` ends the assignments (`backend/src/routes/admin.ts:692-696`), frees the unit (`:701`) and sets `account_status = 'inactive'` (`:708`); `backend/src/services/authService.ts:90` then refuses that account's next login. Deposit reconciliation on departure is unimplemented — see `PHASE1_OPEN_DECISIONS_REGISTER.md`, item **OD-04**. | Partial |
| **BR-026** | Duplicate Prevention | No duplicate person records and no duplicate active account relationships. | `profiles.email VARCHAR(255) UNIQUE NOT NULL` plus a pre-insert existence check returning 400 (`backend/src/routes/admin.ts:359-367`). The active-relationship half was recorded as unguarded, on the evidence that `idx_room_assignments_room_active` is a plain index. **CORRECTED 2026-09-14: that is the wrong index.** The live catalogue also holds `idx_single_active_assignment_per_room` - `CREATE UNIQUE INDEX ... ON room_assignments (room_id) WHERE (is_active = true)` - which makes two concurrent active assignments for one room impossible at the database level, not merely unlikely. `expense_property_allocations` carries the same protection as `UNIQUE (expense_entry_id, property_area)`. Live data: **0** duplicate emails, **0** rooms with two active assignments, **0** duplicate area allocations. | **Enforced** |
| **BR-027** | Returning Tenant | A returning tenant re-links to their existing record instead of spawning a duplicate. | The reassignment path detects a prior inactive profile (`backend/src/routes/admin.ts:550-560`) and carries the previous deposit and occupant count forward into the new assignment (`:571-572`, written at `:581-582`). | Enforced |

### 1.3 Billing, payment and settlement — BR-010 .. BR-019, BR-038, BR-039

| ID | Name | Rule | Enforcement locus (verified) | Status |
| --- | --- | --- | --- | --- |
| **BR-010** | Due Date | The monthly due date derives from the move-in date and the billing relationship. | Carrier columns exist — `room_assignments.anniversary_date` (`FULL_DATABASE_SCHEMA.sql:158`), `bills.due_date` (`:221`) — and onboarding seeds the anniversary from the move-in date (`backend/src/routes/admin.ts:415`). No scheduled generator derives a due date from it; the one bill-creating path hardcodes `now + 5 days` (`backend/src/routes/tenant.ts:452`). | Partial |
| **BR-011** | Overdue | A payment is overdue beginning the day after its due date. | `bills.status` carried an `Overdue` value that was read but never written - no handler, job or trigger transitioned a bill into it. **ENFORCED 2026-09-14:** `billingService.isOverdue()` is called by `GET /tenant/my-bills` and `GET /admin/bills`, which return `effective_status`. Derived on read rather than stored, because being overdue is a function of the clock and a stored flag is wrong until a job catches up. Verified with a probe bill 45 days past due. | **Enforced** |
| **BR-012** | Grace Period | A one-week grace period may apply; grace must be distinguishable from overdue. | The only code setting `bills.grace_period_end_date` wrote `now + 10 days`, contradicting both the seeded 7 and the rule. **CLOSED 2026-09-13:** `billingService.computeBillPeriod()` reads `grace_period_days` through `settingsService`, and migration `016` set that value to **0** per OD-16 — the owner confirmed this property grants no grace period, so `grace_period_end_date` equals `due_date`. The rule's "may apply" is honoured: a grace window is one settings row away, and today it is deliberately zero. | **Enforced** |
| **BR-013** | Full Payment | Full payment is the expected workflow; partial payment is an explicitly recorded exception. | The settlement loop paid only bills it could cover in FULL; the first it could not broke the loop and the leftover was written with `bill_id = NULL`. Nothing ever summed those unlinked rows back in, so a tenant paying 3,000 against a 5,000 bill had the cash recorded, the bill still reading 5,000, and nothing connecting the two - permanently. `'Partially Paid'` was in `bill_status_type` the whole time, written by nothing and read by nothing. **ENFORCED 2026-09-14:** `billingService.allocateReceipt()` settles each bill against its OUTSTANDING balance, links the payment to the bill it pays down, and marks an uncleared bill `'Partially Paid'`. Money becomes an unlinked advance only once every open bill is settled. The gateway now charges the balance too (`tenant.ts outstandingOnBill()`), so a partially paid bill is not taken in full a second time. 12 checks in `npm run check:billing`, including conservation and the `CHECK (amount > 0)` dust floor. | **Enforced** |
| **BR-014** | Water Fee | Water is charged per registered occupant at the configured rate. | Configured at `system_settings.water_rate_per_occupant = '200'`. At the time of writing that row was read by zero lines of `backend/src` and the rate was hardcoded as `occupants * 200` in three admin handlers. **CLOSED 2026-09-13.** `services/settingsService.ts` is a typed cached reader over the table and `services/billingService.ts` applies the values through it. No hardcoded rate or grace window remains in `backend/src`. `computeWaterFee()` reads the rate, and units LF and LB take their fixed charges (BR-040) through the same service. PHP 200 is the seeded default of a configurable parameter, and it is now genuinely configurable. | **Enforced** |
| **BR-015** | Electricity | Electricity flows through the private electric company; Hivelet records but does not generate it. | Correct by omission — no electricity billing engine exists. The only electricity column is the Linda exception carrier `monthly_income_records.linda_electricity_charge` (`FULL_DATABASE_SCHEMA.sql:277`). | Enforced |
| **BR-016** | Online Payment | GCash online payment is optional, delivered through Adyen, and follows the verification workflow. | Decoupled adapter `backend/src/services/adyenService.ts:37`; tenant checkout entry point `POST /api/tenant/payments/checkout` (`backend/src/routes/tenant.ts:379-380`); business-rule header at `adyenService.ts:6`. | Enforced |
| **BR-017** | Payment Verification | An online payment stays pending until the administrator confirms it. | `payments.verification_status` (`FULL_DATABASE_SCHEMA.sql:240`); the adapter inserts `'Pending Verification'` explicitly (`backend/src/services/adyenService.ts:202`); the sovereign admin gate is `PATCH /api/admin/payments/:paymentId/verify` behind `PAYMENT_VERIFY` (`backend/src/routes/admin.ts:836-838`). The column default is `'Verified'` — correct for on-site cash, but unforgiving of any future insert path that omits the field. | Enforced |
| **BR-018** | Payment Correction | A financial correction writes an audit record holding previous and updated values. | `audit_logs.previous_values JSONB` / `new_values JSONB` (`FULL_DATABASE_SCHEMA.sql:434-435`); writer `recordAudit` (`backend/src/services/auditService.ts:78`) and its request-bound wrapper `auditFromRequest` (`:104`), invoked on every ledger mutation. | Enforced |
| **BR-019** | Report Recalculation | A confirmed correction must propagate into active reports and analytics. | Previously recorded as blocked on OD-01. It is not: OD-01 settles which totals the report *shows* (per-month or year-to-date), which is a different question from whether a correction reaches them. **ENFORCED BY CONSTRUCTION, verified 2026-09-14:** the database holds **0 views, 0 materialized views and no summary or aggregate table** — 21 base tables, none of them a cached total. Every figure in `IncomeCollectionsView`, `ExpensesLedgerView` and `AdminOverviewView` is a Vue `computed()` over `reduce()` on raw rows, and all three read the same shared `reactive` store (`systemState.ts:231`). An edit calls `fetchIncomeRecords()` and a void mutates that store, so both views re-derive at once. There is nothing cached to go stale — the rule holds the way BR-015 does, by there being no mechanism that could break it. | **Enforced** |
| **BR-038** | Remitted Amount Formula | Remitted Amount = Rent Amount + Water Payment, system-computed, never typed. | Carrier column `monthly_income_records.remitted_amount` (`FULL_DATABASE_SCHEMA.sql:272`). **CORRECTED 2026-09-13.** An earlier revision recorded this as Violated on the reasoning that the column is absent from the INSERT payload. Both columns are `GENERATED ALWAYS AS ... STORED` in the live database - `fifty_percent_share` as `(rent_amount / 2.0)` and `remitted_amount` as `(rent_amount + water_payment)`, confirmed from `information_schema.columns` where `is_generated = 'ALWAYS'` for both. PostgreSQL derives them on every write and **rejects any INSERT or UPDATE that names them**, so their absence from the INSERT payload is required, not an omission. Verified across all 937 live rows: none is zero and none disagrees with its formula. The rule is satisfied by the strongest available mechanism: the value cannot be typed, cannot drift from the formula, and cannot be overridden by application code. | **Enforced** |
| **BR-039** | Deposit Equals Initial Rent | The deposit is set once at onboarding, equal to the rent in effect at move-in. | Carrier column `room_assignments.deposit_amount` (`FULL_DATABASE_SCHEMA.sql:159`). Carrier column `room_assignments.deposit_amount`. **CLOSED 2026-09-14.** Three changes, in order. The reassignment fallback that computed `current_price * 2` behind a hardcoded `4500` floor is gone — it invented money that was never collected and wrote it into a financial record. The onboarding form pre-fills the field from the unit's **live** price so the administrator sees and confirms the figure. And the API no longer writes `depositAmount || 0.00`, which recorded a tenancy with no advance rent at all whenever the field was omitted: the unit's `current_price` is now the source, so the rule is what happens by default. | **Partial** |

**Recorded as Partial, not Enforced, on purpose.** A supplied figure that differs from the rent is still accepted — the owner may genuinely have agreed a part-payment or a discount, and refusing it would make the system wrong about the world rather than right about the rule. The divergence is written to `audit_logs` with both numbers, so it is attributable instead of silent. That is the posture BR-036 already takes on a mismatched water entry: warn and record, never quietly overwrite the human.

Verified against the live API on a vacant unit, all probe rows removed afterwards: field omitted → the unit rent; sent as `0` → the unit rent; sent as `7777` → honoured **and** audited with `rent_at_move_in` beside `advance_rent_recorded`.

*(OD-04: this sum is ADVANCE RENT. The business collects no separate refundable security deposit, and the field is labelled accordingly.)* | **Partial** |

### 1.4 The landlady's income ledger — BR-029 .. BR-037, BR-040

| ID | Name | Rule | Enforcement locus (verified) | Status |
| --- | --- | --- | --- | --- |
| **BR-029** | Current Month Dashboard | Financial dashboard statistics default to the current month. | **Partly addressed 2026-09-14.** The original evidence pointed at the endpoint having no default, which is true but is the wrong remedy: `systemState` fetches that route unfiltered and the income ledger needs all 937 rows, so defaulting the API to the current month would break the ledger rather than fix the rule. The rule is about dashboard *statistics*. The dashboard's headline financial card now leads with the current month - "Collections · Sep 2026", with the count of collections recorded and the fiscal year to date kept beneath, since the chart below is built on the annual figure. Derived from records already in memory, so it costs no request. **Partial**, not Enforced: the twelve-month chart and the operating cash-flow rows are still year-scoped by design, and those are financial statistics too. | **Partial** |
| **BR-030** | Exportability | Important business records must be exportable for use outside Hivelet. | Previously recorded as "no CSV, XLSX or export handler exists anywhere in `backend/src`". True, and the wrong place to look - the export is client-side, where the rows already are. **CORRECTED 2026-09-14:** three ledgers export to CSV, each building a `Blob` and downloading it - income (`IncomeCollectionsView.vue:457`, BOM-prefixed so Excel reads UTF-8 correctly), expenses (`ExpensesLedgerView.vue:567`) and the audit log (`AuditLogsView.vue:226`). The income export carries the full documented column set. Records leave the system in a format Excel opens, which is what this rule asks. **BR-049 is the separate, stricter rule** and remains Partial: it asks for the documented *layout* - grouping, subtotals, the footer - which CSV cannot carry. | **Enforced** |
| **BR-031** | Online Authority | The server is authoritative; cached or offline client data must never override it. | Enforced by construction: the PWA runtime cache is scoped to `GET /api/public` and `/api/health` only (`frontend/vite.config.ts:64-65`, `NetworkFirst`). No write is queued offline, so no cached value can outrank a server record. | Enforced |
| **BR-032** | Canonical Unit List | The rentable units are fixed and grouped into five clusters. | Five cluster rows seeded at `FULL_DATABASE_SCHEMA.sql:32-38` — BH (Main Rooms), Back Apartment, Penthouse, Front Apartment, Linda — with the 33 units seeded from `:466`. Exposed at `GET /api/public/clusters` (`backend/src/routes/public.ts:88-89`). Canonical figures: **33 units, 5 clusters** (BH 22, Back Apartment 5, Front Apartment 3, Penthouse 1, Linda 2). | Enforced |
| **BR-033** | Rent Period Derivation | "Rent For" derives from the stored anniversary date and the current cycle; it is not typed per entry. | Carrier columns `monthly_income_records.rent_period_start / rent_period_end` (`FULL_DATABASE_SCHEMA.sql:265-266`). Derivation exists only on the gateway-verification path (`backend/src/routes/admin.ts:921-931`); the manual entry path writes client-supplied values straight through (`:1126-1127`). **CLOSED 2026-09-14.** The manual path did not merely accept a client-supplied value - the form **defaulted the period start to the DATE PAID** (`IncomeCollectionsView.vue:355`), and both dates were required. A tenant on a 13th-of-the-month cycle paying on the 20th had the period recorded as starting on the 20th, so the ledger's "Rent For" column drifted off the cycle one receipt at a time. `billingService.computeRentPeriod()` now derives the span from the stored anniversary, extending `computeBillPeriod()` across `monthsCovered` with the same month-length clamping - three months from 31 January ends 29 April, never an impossible 31 April. The two dates are optional; omitted, they are derived. A supplied value is still honoured, because the 937 migrated rows carry periods from the owner's own book and a back-dated correction is legitimate - but a divergence from the derived cycle is written to the audit log with both spans, the same posture BR-039 takes on advance rent. Six checks in `npm run check:billing`. | **Enforced** |
| **BR-034** | Occupant Count Carries Forward | A unit's occupant count defaults to the previous month's value for the same tenant and is editable. | `room_assignments.occupant_count` (`FULL_DATABASE_SCHEMA.sql:160`); carry-forward implemented on reassignment (`backend/src/routes/admin.ts:572`). The monthly entry path reads the live assignment (`:1094-1098`) rather than the prior month's ledger row, so month-over-month memory is assignment-scoped, not ledger-scoped. | Partial |
| **BR-035** | 50% Share Is Derived | The "50% Share" figure is exactly half of that row's Rent Amount, computed by the system and never entered manually. Water, GBG fee and deposit are excluded from it. | Carrier column `monthly_income_records.fifty_percent_share` (`FULL_DATABASE_SCHEMA.sql:268`), with the divisor held configurably at `system_settings.revenue_share_percent = '50'` (`:459`). **CORRECTED 2026-09-13.** An earlier revision recorded this as Violated because the identifier never appears in an INSERT or UPDATE. It cannot: Both columns are `GENERATED ALWAYS AS ... STORED` in the live database - `fifty_percent_share` as `(rent_amount / 2.0)` and `remitted_amount` as `(rent_amount + water_payment)`, confirmed from `information_schema.columns` where `is_generated = 'ALWAYS'` for both. PostgreSQL derives them on every write and **rejects any INSERT or UPDATE that names them**, so their absence from the INSERT payload is required, not an omission. Verified across all 937 live rows: none is zero and none disagrees with its formula. BR-035's requirement that the figure is "computed by the system and never entered manually" is enforced by the database itself. | **Enforced** |
| **BR-036** | Water Payment Validation | Water Payment must equal Occupants x the configured rate; a mismatch warns before saving rather than being silently accepted. | **CORRECTED 2026-09-14.** The original evidence said no comparison exists. Two do, in the on-site payment modal and the income-ledger edit: a figure below the occupant baseline is refused, and one that is not a whole multiple of the rate is refused — both before saving, both naming the expected figure, which is what the rule asks for. A related defect **was** found and fixed on the same date: the modal hardcoded the rate as `200` in six places and the Linda charges as `400`/`200`, so the landlady could change her rate and the form would go on validating against the old one. Both now come from `GET /api/public/rates`, which reads `system_settings`. **Partial**, not Enforced: the check is client-side, so a direct API request bypasses it. | **Partial** |
| **BR-037** | Garbage Fee Frequency | The GBG fee is charged once per year per unit, not every month. | Carrier column `monthly_income_records.gbg_fee` (`FULL_DATABASE_SCHEMA.sql:271`). The token `gbg` appears zero times in `backend/src`. | Schema only |
| **BR-040** | Linda's Fixed Billing Exception | Units LF and LB are excluded from the per-occupant water model and billed on fixed per-unit charges. | Flag `rooms.is_linda_unit` (`FULL_DATABASE_SCHEMA.sql:97`); carriers `monthly_income_records.is_linda_billing / linda_electricity_charge / linda_water_charge` (`:275-277`); three seeded parameters — `linda_lf_water_charge` PHP 400, `linda_lb_water_charge` PHP 200, `linda_lb_electricity_charge` PHP 325 (`:455-457`). No route branches on `is_linda_unit`, so an LF or LB entry still runs the per-occupant path. | Schema only |

### 1.5 The landlady's expense ledger — BR-020, BR-041 .. BR-047

| ID | Name | Rule | Enforcement locus (verified) | Status |
| --- | --- | --- | --- | --- |
| **BR-020** | Expense Allocation | Expenses support categories and may be assigned to a room where applicable. | Category side enforced by `monthly_expense_entries.category_code` (`FULL_DATABASE_SCHEMA.sql:332`). The room side has no column: `expense_property_allocations` allocates to a `property_area` string (`:353`) and holds no `room_id`. The "may be assigned to a room" clause is unimplementable against the current schema. | Partial |
| **BR-041** | Expense Property Areas | Every expense allocates to one or more fixed Property Areas. **Note: the rule was written as "five"; there are six** - migration `012` added Penthouse. | Previously recorded as free-text `VARCHAR(100)` with "no CHECK constraint, no lookup table", and the five-area list as "documentary, not constrained". **That came from `FULL_DATABASE_SCHEMA.sql` and is wrong about the live database. CORRECTED 2026-09-14:** `property_area` is the **enum `property_area_type`**; `property_areas` is a **seeded lookup of all six areas** whose own `code` column is that same enum; migrations `008` and `012` did this. An invalid area is refused by the type system, not by convention. A second constraint, `UNIQUE (expense_entry_id, property_area)`, stops one entry allocating to the same area twice. Live data: **0 of 1,327** allocations are off the lookup; five of the six areas are in use, Penthouse seeded and not yet used. | **Enforced** |
| **BR-042** | One Category Per Expense Entry | An entry carries exactly one category even when split across areas. | Structurally guaranteed: `monthly_expense_entries.category_code` is a single `NOT NULL` foreign key (`FULL_DATABASE_SCHEMA.sql:332`) and the allocation child table carries no category column. | Enforced |
| **BR-043** | Fixed Expense Category List | The expense category list is fixed and system-wide. | Thirteen rows seeded in `fixed_expense_categories` (`FULL_DATABASE_SCHEMA.sql:311-326`), including the Salaries: Michelle parent (`6`) with PhilHealth, SSS and Allowances children (`6a`, `6b`, `6c`) modelled through the `parent_code` self-reference (`:307`). Served at `GET /api/admin/expense-categories` (`backend/src/routes/admin.ts:1531-1533`). | Enforced |
| **BR-044** | Split Expense Allocation | One entry may allocate across several areas without duplicating date, supplier or category. | 1:N child table `expense_property_allocations` (`FULL_DATABASE_SCHEMA.sql:350-356`); the parent is inserted once (`backend/src/routes/admin.ts:1393-1400`) and the allocations inserted as a batch (`:1406-1416`). | Enforced |
| **BR-045** | Expense Row Total Is Derived | An entry's Total Expenses is the sum of its allocations, computed by the system. | Computed by reduction at `backend/src/routes/admin.ts:1389`, written at `:1398`, and recomputed on amendment at `:1459`. | Enforced |
| **BR-046** | Expense Category Totals | Each category keeps a this-month total and a running cumulative total, both system-computed. | The this-month total is derivable today (`SUM(total_expenses)` grouped by `category_code` over the month). The **cumulative** is not, and the obstacle is genuinely not code: **OD-07** asks whether it resets at the start of a calendar year or runs indefinitely, and that answer decides whether it is a stored column or a computed window. Implementing either without it would be inventing a policy on the owner's behalf. Re-checked 2026-09-14 and still blocked — this is the one rule of the four that genuinely waits on the client. | Not enforced |
| **BR-047** | Expense Category Reconciliation | The sum of category this-month totals must equal the sum of Property Area bottom totals for the same month. | Previously recorded as blocked on OD-05 and as having "no reconciliation assertion at any layer". Both were stale. **ENFORCED, verified 2026-09-14:** `property_area` is the enum `property_area_type`, not free text, and `property_areas` is a seeded lookup of all six areas — migrations **008** and **012** did this, so OD-05's premise no longer holds and "Main House" is a first-class value. **0** of 1,327 allocations are off the lookup. The identity itself is held by trigger `trg_update_expense_total`, which recomputes `monthly_expense_entries.total_expenses` as `SUM(amount)` of that entry's allocations on every allocation INSERT, DELETE and UPDATE — so the two sides are one figure, not two that agree. The one hole was an entry created with a non-zero total whose allocation insert then failed: the trigger never fires, and the entry keeps a total with nothing underneath it. Migration **019** closes it — creation is now one transaction that seeds the total at zero, requires at least one allocation, and derives the total from the rows. Live data: **31 of 31 months reconcile at 5,823,586.47 with zero variance**, and **0** entries have no allocation. | **Enforced** |

### 1.6 Maintenance, security and reporting — BR-021 .. BR-023, BR-028, BR-048, BR-049

| ID | Name | Rule | Enforcement locus (verified) | Status |
| --- | --- | --- | --- | --- |
| **BR-021** | Ticket Priority | Priority levels are Emergency, High, Medium, Low. | Pinned at the API edge by `z.enum(['Emergency','High','Medium','Low'])` on tenant submission (`backend/src/routes/tenant.ts:159`) and on the admin paths (`backend/src/routes/admin.ts:1573`, `:1656`). The column `maintenance_tickets.priority VARCHAR(50)` (`FULL_DATABASE_SCHEMA.sql:370`) carries no CHECK constraint, so the vocabulary holds only for traffic passing through Express — which, given `service_role` containment, is all of it. | Enforced |
| **BR-022** | Ticket Visibility | A new ticket is visible to the administrator immediately on successful submission. | The tenant submission handler writes the ticket in `Submitted` state with the rule cited inline (`backend/src/routes/tenant.ts:196-197`) and raises the administrator notification in the same request (`:223`); the admin queue reads live rows with no staging state (`backend/src/routes/admin.ts:1549-1551`). | Enforced |
| **BR-023** | Ticket Closure | The administrator holds final authority to close a ticket. | Dedicated permission `TICKET_CLOSE` (`backend/src/config/rbac.ts:84`), explicitly withheld from the tenant role (`:120`); the only closing endpoint is `PATCH /api/admin/tickets/:ticketId/close` (`backend/src/routes/admin.ts:1761-1763`) behind the admin-only router guard. | Enforced |
| **BR-028** | Auditability | Important administrative and financial actions must be traceable. | `audit_logs` (`FULL_DATABASE_SCHEMA.sql:428-439`) written through `recordAudit` (`backend/src/services/auditService.ts:78`). Immutability is enforced in the database, not by convention: `REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC` and `... FROM anon, authenticated, service_role` (`FULL_DATABASE_SCHEMA.sql:572-573`) strip update and delete privileges from the very role the backend connects as. | Enforced |
| **BR-048** | Admin-Only Authorship of Income/Expense Ledgers | Only the administrator may create or edit Monthly Income and Monthly Expenses entries; tenants and visitors have no access. | Router-level gate `router.use('/admin', requireAuth, requireAdmin)` (`backend/src/routes/admin.ts:28`); the four ledger permissions are declared under an explicit BR-048 heading (`backend/src/config/rbac.ts:70-75`) and deliberately absent from the tenant grant, with the reason recorded inline (`:118`). | Enforced |
| **BR-049** | Excel Export of Income/Expense Reports | Both ledgers must export to an Excel-compatible spreadsheet reproducing the documented layouts. | Previously recorded as "no spreadsheet generation exists in `backend/src`" and marked Not enforced, while the summary table counted it Partial. **Partial is right, corrected 2026-09-14.** Both ledgers DO export, client-side - `IncomeCollectionsView.vue:457` (BOM-prefixed CSV, full documented column set) and `ExpensesLedgerView.vue:567`. Excel opens both, which satisfies **BR-030**. What is unmet is this rule's stricter half: reproducing the documented *layout* - the cluster grouping, the subtotal rows and the footer - which CSV cannot express. That needs real spreadsheet generation, and it is the remaining gap. | **Partial** |

### 1.7 Register roll-up

| Status | Count | Rules |
| --- | --- | --- |
| **Enforced** | 37 | BR-001, BR-002, BR-003, BR-004, BR-005, BR-006, BR-007, BR-008, BR-011, BR-012, BR-013, BR-014, BR-015, BR-016, BR-017, BR-018, BR-019, BR-021, BR-022, BR-023, BR-024, BR-026, BR-027, BR-028, BR-030, BR-031, BR-032, BR-033, BR-035, BR-038, BR-041, BR-042, BR-043, BR-044, BR-045, BR-047, BR-048 |
| **Partial** | 9 | BR-009, BR-010, BR-020, BR-025, BR-029, BR-034, BR-036, BR-039, BR-049 |
| **Schema only** | 2 | BR-037, BR-040 |
| **Not enforced** | 1 | BR-046 — blocked on OD-07 (does the category cumulative reset at the year boundary?), a client decision, not a code gap |
| **Violated** | **0** | — |
| | **49** | |

*Recounted 2026-09-14. This table read **5 Violated** on 2026-09-12 and **1** on 2026-09-13.*

**What happened to the other four, recorded honestly rather than quietly deleted.**

Two were never violations at all. **BR-035** and **BR-038** were marked Violated on the reasoning
that `fifty_percent_share` and `remitted_amount` never appear in an INSERT. They cannot: both are
`GENERATED ALWAYS AS … STORED`, so PostgreSQL derives them and rejects any write naming them. All
937 live rows are correct. The remediation this crosswalk originally proposed — adding both columns
to the INSERT payloads — would have broken every income-record write in the system. That is worth
saying out loud, because it is the clearest argument for verifying a finding against the database
before acting on it.

Two were real and are now closed. **BR-012** and **BR-014** shared one root cause: `system_settings`
held six correctly seeded parameter rows that **zero lines** of `backend/src` read, while route
handlers carried literal constants — a 10-day grace window against a seeded 7, and a hardcoded
PHP 200 water rate in three handlers. `services/settingsService.ts` and `services/billingService.ts`
close both. There is no hardcoded rate left in the backend, and `grace_period_days` is now **0**
rather than 7, per OD-16 and migration `016`, because the owner confirmed the property grants no
grace period.

**BR-039 was the last one, and it closed on 2026-09-14.** The rule says the advance rent equals the
rent in effect at move-in. The API used to write `depositAmount || 0.00`, so an onboarding that
omitted the figure recorded a tenancy with no advance rent at all, and one that sent any figure had
it accepted unexamined. The unit's `current_price` is now the source, so the rule is what happens by
default.

It is carried as **Partial rather than Enforced**, deliberately. A supplied figure that differs is
still accepted, because the owner may genuinely have agreed a part-payment, and refusing it would
make the system wrong about the world rather than right about the rule. The divergence is audited
with both numbers instead. Calling that "Enforced" would overstate it.

**There are now no Violated rules.** That is worth saying plainly, and worth saying carefully: the
count fell from 5 to 0 in two days, but two of those five were never violations at all — they were
our own misreading of a generated column — and the three real ones were closed by building
`settingsService`, `billingService`, and the change above. The number moved because the work was
done and because the record was corrected, and those are different things.

The architectural root of all of this is unchanged: **131 of 164 database calls (80%) still sit
inside route handlers** rather than behind a service boundary, with `backend/src/routes/admin.ts`
running to 2,263 lines.

---

## 2. Architectural pillar crosswalk — ARCH-001 .. ARCH-007

The seven items previously numbered `BR-001 .. BR-007` in `docs/claude_pipeline/CLAUDE_PIPELINE.md`
are renumbered `ARCH-001 .. ARCH-007`. They are **architectural pillars** — statements about how the
system is built — and are never cited with a `BR-` prefix again. Each pillar below lists the
canonical business rules it actually implements.

| Pillar | Name | Canonical BR citations | What the pillar asserts architecturally |
| --- | --- | --- | --- |
| **ARCH-001** | Room-Centric Tenancy | **BR-001**, **BR-002**, **BR-003**, **BR-032** | The room, not the tenant, is the primary operational entity. Tenancy is modelled as a time-bounded `room_assignments` relationship between a unit and a profile, so a unit's financial history survives every change of occupant. |
| **ARCH-002** | Dynamic Utility Water | **BR-014**, **BR-034**, **BR-036**, **BR-040** | The per-occupant water rate is a stored parameter, not a constant: `water_amount = registered_occupants x system_settings.water_rate_per_occupant`, with the Linda units carved out to fixed per-unit charges. |
| **ARCH-003** | 50% Share Ledger Parity | **BR-035** | The income ledger reproduces Column 6 of the landlady's existing source spreadsheet as a system-derived figure — exactly half of that row's Rent Amount — retained so the digital ledger reconciles line-for-line with her historical records. Water, GBG fee and deposit are excluded from the arithmetic. |
| **ARCH-004** | Rate Change History | **BR-003** | Room rates are set **manually by the administrator**. Every change is preserved rather than overwritten: `room_price_history` (`FULL_DATABASE_SCHEMA.sql:136-145`) records the previous rate (`:139`), the new administrator-set rate (`:140`), the date the new rate takes effect (`:141`), the stated reason (`:142`) and the administrator who made the change — `created_by` (`:143`). A bill raised under an earlier rate therefore stays reconcilable against the rate then in force. No automatic and no recommended rate change exists in scope. |
| **ARCH-005** | Hybrid Gateway Adapter | **BR-016**, **BR-017** | On-site in-person cash settlement is the primary method, matching Mrs. Fe's daily routine. Adyen GCash is an optional digital alternative reached through a decoupled adapter that auto-selects sandbox or live credentials, and the administrator retains a sovereign verification gate — gateway completion inserts a payment as `Pending Verification` and never auto-settles a bill. |
| **ARCH-006** | Backend Security Boundary | **BR-006**, **BR-048** | Express is the sole security perimeter. The Supabase `service_role` key never leaves the server; RLS is enabled and forced across all twenty tables (`FULL_DATABASE_SCHEMA.sql:558-559`) and the `anon` and `authenticated` roles are stripped of schema access entirely (`:566-569`). |
| **ARCH-007** | Immutable Audit Trail | **BR-018**, **BR-028** | Critical administrative, financial and tenancy actions append a record to `audit_logs` carrying actor, action, entity, before-image and after-image JSONB, IP address and user agent — with `UPDATE` and `DELETE` revoked from every role including `service_role` (`FULL_DATABASE_SCHEMA.sql:572-573`). |

### 2.1 Notes the panel may probe

- **ARCH-004 was re-anchored, and the question the panel would have asked is now closed.** As
  first drafted this pillar described an automatic rate-increase feature whose decision of record
  was `docs/08_OPEN_DECISIONS.md:41` — a planning note, never a business rule. Every other mention
  in the repository restates that note: `docs/05_DATABASE_DESIGN.md:64`, the schema section comment
  at `FULL_DATABASE_SCHEMA.sql:134`, and descriptive passages across the Module 01 submission set.
  A repository-wide search of the canonical register `docs/02_BUSINESS_RULES.md` for `2%`,
  `annual`, `escalat` and `adjust` returns **zero matches**: the feature had no canonical anchor to
  rest on, so withdrawing it contradicts no canonical rule. The client has since confirmed that she
  simply edits a room's rate herself when she decides to change it. The automation is therefore
  **out of scope**, and the pillar is re-anchored to canonical **BR-003 Historical Preservation**
  as **Rate Change History**: rates are administrator-set, and `room_price_history` preserves each
  change with its effective date and its author. The table keeps its full justification; only the
  automation is gone. Recorded as closed in `PHASE1_OPEN_DECISIONS_REGISTER.md`, item **OD-11**.
- **ARCH-002 has no implementation owner today.** The parameter row exists and is correct; no code
  reads it. Phase 1 diagrams therefore add an explicit configuration-maintenance flow into data
  store **D11 System Parameters**, so the pillar has a visible owner on the DFD rather than an
  implied one.
- **ARCH-006 and canonical BR-006 are easy to confuse.** Cite **ARCH-006** for the security
  perimeter argument and **BR-006** for the rule that a reserved room stops accepting inquiries.

---

## 3. Collision table — BR-001 .. BR-007

For each colliding identifier this table places the canonical meaning beside the superseded pillar
meaning, so that no future editor reading an old slide deck or planning note silently re-imports the
wrong definition.

| ID | **Canonical meaning — `docs/02_BUSINESS_RULES.md` (authoritative)** | **Superseded meaning — `CLAUDE_PIPELINE.md:140-146` (withdrawn)** | Correct replacement citation |
| --- | --- | --- | --- |
| **BR-001** | **Single Property Scope.** Hivelet manages one property: the Fe Galang Da Silva Boarding House. (`02_BUSINESS_RULES.md:5-7`) | Room-Centric Tenancy — units carry unique IDs and leases bind to specific rooms. Additionally described the property as spanning "Main Building, Annex A, Annex B", which are **not** cluster names in this system. (`CLAUDE_PIPELINE.md:140`) | Pillar sense to **ARCH-001**. Cluster names to **BR-032** — BH (Main Rooms), Back Apartment, Front Apartment, Penthouse, Linda. |
| **BR-002** | **Room Identity.** Each room is a unique unit identified by room number and floor context. (`:9-11`) | Dynamic Utility Water Calculation — water read from `system_settings.water_rate_per_occupant`, never hardcoded, with Linda per-unit overrides. (`CLAUDE_PIPELINE.md:141`) | Pillar sense to **ARCH-002**, resting on **BR-014**, **BR-036**, **BR-040**. |
| **BR-003** | **Historical Preservation.** Records are not silently deleted when a room, tenant, payment, inquiry or expense goes inactive. (`:13-15`) | A gloss on the derived half-of-rent ledger column that attached a meaning to that figure beyond its arithmetic. **That gloss is withdrawn in full and must not be reintroduced in any artifact.** (`CLAUDE_PIPELINE.md:142`) | Arithmetic sense to **ARCH-003** / **BR-035**, stated as a system-derived figure equal to exactly half of the row's Rent Amount and nothing further. Preservation sense to canonical **BR-003**. |
| **BR-004** | **Room Occupancy.** A room is occupied when the administrator identifies an active tenant relationship for it. (`:17-19`) | An automatic rate-increase tracking pillar — price changes recorded in `room_price_history`. (`CLAUDE_PIPELINE.md:143`) **The automatic-increase half is withdrawn in full — it is out of scope, and no canonical rule ever carried it — and must not be reintroduced in any artifact.** | Pillar sense to **ARCH-004 Rate Change History**, resting on canonical **BR-003**. The surviving assertion is the record-keeping one: rates are administrator-set, and each change is preserved in `room_price_history`. |
| **BR-005** | **Room Availability.** The administrator controls the vacancy process: mark available, mark under maintenance, set an expected availability date. (`:21-28`) | Hybrid Decoupled Payment Gateway Architecture — cash primary, Adyen GCash optional, sandbox/live auto-switch, sovereign admin verification gate. (`CLAUDE_PIPELINE.md:144`) | Pillar sense to **ARCH-005**, resting on **BR-016**, **BR-017**. |
| **BR-006** | **Reservation.** A reserved room must not accept new public inquiries while the reservation is active. (`:30-32`) | Backend-Enforced Security Boundary — Express as sole perimeter, `service_role` server-side only, RLS denying anon access, JWT role checks on every protected route. (`CLAUDE_PIPELINE.md:145`) | Pillar sense to **ARCH-006**, resting on **BR-006** and **BR-048**. Canonical BR-006 survives *inside* that pillar, which is precisely why the two are confusable — cite the pillar for the perimeter, the BR for the inquiry block. |
| **BR-007** | **Website Visibility.** Operational status and website visibility are separate; a room may stay publicly visible while under maintenance or reserved. (`:34-38`) | Immutable Audit Trail — append-only `audit_logs` with actor, action, entity, before/after JSONB, IP address and user agent. (`CLAUDE_PIPELINE.md:146`) | Pillar sense to **ARCH-007**, resting on **BR-018**, **BR-028**. |

### 3.1 Additional stale assertion carried in the superseded block

`CLAUDE_PIPELINE.md:140` describes the property as "33 units across Main Building, Annex A, Annex B".
The unit **count** is correct; the **grouping** is not. Hivelet's five clusters are BH (Main Rooms),
Back Apartment, Front Apartment, Penthouse and Linda, seeded at `FULL_DATABASE_SCHEMA.sql:32-38` and
fixed by BR-032. The family's own word "Annex" refers to a **floor**, not a cluster — "Annex A" is
the first floor. The strings "Main Building", "Annex A" and "Annex B" must not appear as cluster
names in any Hivelet artifact.

---

## 4. Misattribution register

Known incorrect or stale citations in submitted and in-repository documents. Each row names the
exact location, the claim as written, why it is wrong, and the correction. This register is the
source for the Phase 1 errata sheet handed to the panel.

| # | Location | Claim as written | Why it is wrong | Correction |
| --- | --- | --- | --- | --- |
| **M-01** | `docs/module_01_submission/DEEP_TECHNICAL_ARCHITECTURE_AND_DATABASE_ANALYSIS.md:109` | Heading: `` `room_price_history` Table (BR-048 2% Annual Escalation) `` | Canonical **BR-048 is Admin-Only Authorship of Income/Expense Ledgers** (`02_BUSINESS_RULES.md:226-228`). It has nothing to do with rates. The feature the heading names is not a canonical business rule at all — searching `02_BUSINESS_RULES.md` for `2%`, `annual`, `escalat` and `adjust` returns zero matches — and it has since been removed from scope entirely; see row **M-11**. | Retitle to `room_price_history` Table (**ARCH-004** Rate Change History, canonical **BR-003**). **`backend/src/config/rbac.ts:5-6` already cites BR-048 correctly**, as does `backend/src/routes/admin.ts:7` — the code is right and the document is wrong. |
| **M-02** | `docs/module_01_submission/DEEP_TECHNICAL_ARCHITECTURE_AND_DATABASE_ANALYSIS.md:41` | "foreign key ON DELETE RESTRICT constraints" listed as a delivered Tier-4 property | The live schema contains **17 `ON DELETE CASCADE`, 4 `ON DELETE SET NULL`, and 0 `ON DELETE RESTRICT`** clauses. `bills.room_id` (`FULL_DATABASE_SCHEMA.sql:213`), `payments.room_id` (`:235`) and `monthly_income_records.room_id` (`:257`) all cascade. | State RESTRICT as a **Phase 2 proposal** — migration `005_ledger_fk_restrict.sql`, moving `bills` / `payments` / `monthly_income_records` `room_id` and `tenant_profile_id` to RESTRICT. Soft-delete already exists (`profiles.account_status:56`, `rooms.operational_status:95`), so RESTRICT is safe to adopt. Never present it as current fact. |
| **M-03** | `docs/module_01_submission/03_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md:26` | "Critical financial and audit entities (`bills`, `payments`, `monthly_income_records`) enforce `ON DELETE RESTRICT` or `SET NULL` ... per Capstone Rule BR-003" | The same false RESTRICT claim as M-02. The BR-003 citation is *apt in intent* — Historical Preservation is the right rule — but the mechanism described does not exist. "Capstone Rule BR-003" is also nonstandard phrasing; the namespace term is "business rule". | Rewrite to describe the **current** cascade posture honestly, cite **BR-003** for the intent, and point at migration `005_ledger_fk_restrict.sql` as the Phase 2 remedy. |
| **M-04** | `docs/module_01_submission/05_UI_UX_DESIGN_REFINEMENT.md:64` | A helper-tooltip row citing "(`BR-035`, `BR-048`)" for two tooltips: one glossing the derived half-of-rent ledger column with a meaning beyond its arithmetic, and one describing "the 2% annual increase recommendation". *(The withdrawn phrase is referred to here rather than reproduced, per the BR-035 editorial standard in Section 5.4.)* | Two errors in one cell. (a) **BR-048 is Admin-Only Ledger Authorship**, not the annual increase — the same misattribution as M-01. (b) The gloss attaches to the BR-035 figure a meaning that canonical BR-035 (`02_BUSINESS_RULES.md:168-170`) does not carry: BR-035 states only that the figure is exactly half of the Rent Amount and is system-computed. | Cite **BR-035** for the derived-figure tooltip. The second tooltip needs no replacement citation because it has no replacement feature — the rate-increase recommendation is out of scope (row **M-11**); a rate tooltip, if one is wanted at all, explains **ARCH-004 Rate Change History** (canonical **BR-003**): the administrator sets the rate and `room_price_history` preserves the change. Restate the BR-035 tooltip in neutral arithmetic and ledger-parity terms only; the withdrawn wording is struck and must not be reintroduced. |
| **M-05** | `docs/module_01_submission/05_UI_UX_DESIGN_REFINEMENT.md:60` | Heuristic 6 cites `BR-009` for the monthly-payment form pre-filling tenant name, registered occupant count and base rent | **BR-009 is Inquiry Conversion** (`02_BUSINESS_RULES.md:46-50`) and governs reuse of *prospect* data at conversion time, not recall of *tenant* data on a monthly ledger entry. | Cite **BR-034** (Occupant Count Carries Forward) for the occupant pre-fill and **BR-033** (Rent Period Derivation) for the period pre-fill. The requirement-level anchor is **FR-033 Occupant Count Memory** (`docs/03_REQUIREMENTS.md:101`). |
| **M-06** | `docs/claude_pipeline/CLAUDE_PIPELINE.md:140-146` | Seven architectural pillars numbered `BR-001` .. `BR-007` | Direct namespace collision with canonical BR-001 .. BR-007 (Section 3 above). Every one of the seven identifiers means something different in the canonical register. | Renumber to **ARCH-001 .. ARCH-007** and reclassify as architectural pillars. Section 2 of this document is the authoritative replacement mapping. |
| **M-07** | `docs/claude_pipeline/CLAUDE_PIPELINE.md:140` | "33 units across Main Building, Annex A, Annex B" | The count is right, the grouping is not. The five canonical clusters are seeded at `FULL_DATABASE_SCHEMA.sql:32-38`. In the family's own usage "Annex" denotes a **floor**, not a cluster. | Cite **BR-032**: BH (Main Rooms) 22, Back Apartment 5, Front Apartment 3, Penthouse 1, Linda 2 — 33 units, 5 clusters. |
| **M-08** | `docs/01_SYSTEM_BIBLE.md:146` | "32 total rooms/units" | The canonical enumeration in BR-032 yields **33**: BH 22 (1a-1h = 8, 2a-2g = 7, 3a-3g = 7) + Back Apartment 5 + Front Apartment 3 + Penthouse 1 + Linda 2. The seeded database holds 33 (`FULL_DATABASE_SCHEMA.sql:466` onward). `docs/11_FORM_FIELD_AUDIT.md:313-318` already flagged the discrepancy. | Correct the prose to **33**. The arithmetic error is in the narrative, not in the data. |
| **M-09** | Design-justification documents glossing FR-033 as "Monthly Expense Layout" and FR-034 as "Expense Cluster Breakdown" | `docs/03_REQUIREMENTS.md` is canonical for FR meanings and reads **FR-033 Occupant Count Memory** (`:101`) and **FR-034 Water Payment Validation** (`:104`). | The alternate glosses predate the requirements consolidation and now point at entirely different requirements. | Use the `03_REQUIREMENTS.md` meanings. FR-034 pairs with **BR-036**; FR-033 pairs with **BR-034**. |
| **M-10** | Submitted traceability matrix | Matrix rows stop at FR-034 while the defense narrative promises coverage through FR-044 | The verified requirement set is **44 functional requirements — 20 fully mapped, 13 partial, 10 missing, 1 frontend-only**. A matrix ending at FR-034 omits ten requirements the defense claims are traced, including **FR-043 Admin-Only Income/Expense Entry** (`docs/03_REQUIREMENTS.md:131`) and **FR-044 Excel Export of Income/Expense Reports** (`:134`). | Extend the matrix to FR-044 and carry the honest 20 / 13 / 10 / 1 split. FR-044 maps to **BR-049**, which Section 1.6 records as **Not enforced** — no export handler exists in `backend/src`. |
| **M-11** | `docs/module_01_submission/DEEP_TECHNICAL_ARCHITECTURE_AND_DATABASE_ANALYSIS.md:109`; `docs/08_OPEN_DECISIONS.md` section 8 (`:41`) | Both describe an automatic annual rent-increase feature — the submitted heading at `DEEP_TECHNICAL…md:109`, and the planning note at `08_OPEN_DECISIONS.md:41` that is its decision of record — every other mention in the repository, including `docs/05_DATABASE_DESIGN.md:64` and the schema section comment at `FULL_DATABASE_SCHEMA.sql:134`, restates that note rather than establishing a rule. | The feature is **formally out of scope**. The client confirmed on 2026-09-13 that she edits a room's rate manually when she decides to change it; there is no automatic increase and no recommendation. Searching the canonical register `docs/02_BUSINESS_RULES.md` for `2%`, `annual`, `escalat` and `adjust` returns **zero matches**, so the feature never was a canonical business rule and withdrawing it contradicts none. | State the surviving behaviour instead: rate changes are **administrator-initiated**, and every change is historically recorded in `room_price_history` (`FULL_DATABASE_SCHEMA.sql:136-145`) with its effective date and its author — **ARCH-004 Rate Change History**, canonical **BR-003**. *This row is separate from **M-01**, which records a different error in the same heading — the BR-048 misattribution — and both stand.* |

### 4.1 Citations verified correct — do not "fix" these

| Location | Citation | Verdict |
| --- | --- | --- |
| `backend/src/config/rbac.ts:5-6` | `BR-024 Tenant Privacy, BR-023 Ticket Closure, BR-048 Admin-Only Authorship of Income/Expense Ledgers` | **Correct.** The RBAC module is the one place in the repository that has always cited BR-048 with its true meaning. It is the reference standard against which M-01 and M-04 are judged wrong. |
| `backend/src/routes/admin.ts:5-7` | `BR-017, BR-018, BR-023, BR-028, BR-048` | **Correct** for every rule listed. |
| `backend/src/routes/public.ts:5` | `BR-006 Reservation, BR-007 Website Visibility` | **Correct**, and both are genuinely enforced in that file (`:145-150`, `:141-143`). |
| `backend/src/services/adyenService.ts:6` | `BR-016 (Online Payment), BR-017 (Payment Verification)` | **Correct**; the adapter inserts `'Pending Verification'` at `:202` exactly as BR-017 requires. |
| `backend/src/services/auditService.ts:5` | `BR-018 Payment Correction, BR-028 Auditability` | **Correct.** |
| `backend/src/services/scopeService.ts:5` | `BR-024 Tenant Privacy, BR-003 Historical Preservation` | **Correct**, including the subtle BR-003 use noted at `:22-26` — a former tenant retains read access to their own historical rows without gaining sight of the room's current occupant. |
| `FULL_DATABASE_SCHEMA.sql:454-459` | `business_rule` column values `BR-014`, `BR-040`, `BR-012`, `BR-035` on the six seeded parameters | **Correct.** The seed data carries the most accurate BR mapping in the repository; the defect is that no code reads it. |

---

## 5. Rules of use

1. **One namespace.** A `BR-nnn` citation resolves against `docs/02_BUSINESS_RULES.md` and nothing
   else. An architectural pillar is cited as `ARCH-nnn`. The two prefixes never mix.
2. **No new BR numbers in Phase 1.** BR-050 and beyond are reserved for Phase 2, after the items in
   `PHASE1_OPEN_DECISIONS_REGISTER.md` are closed with the client.
3. **Status honesty.** When an artifact asserts that a rule is enforced, it cites the enforcing
   `file:line`. Where Section 1 records **Not enforced**, **Schema only** or **Violated**, no
   artifact may claim otherwise; the correct framing is a named Phase 2 or Phase 3 work item.
4. **BR-035 editorial standard.** The derived half-of-rent column is described in arithmetic and
   ledger-parity terms only: exactly half of that row's Rent Amount, system-computed, never entered
   manually, excluding water, GBG fee and deposit, and retained so the digital ledger reconciles
   line-for-line with the landlady's existing source spreadsheet. Statements about the figure's
   purpose, recipient or destination appear in no Hivelet artifact.

---

*Phase 1 corrected artifact. Supersedes the `BR-001 .. BR-007` numbering in
`docs/claude_pipeline/CLAUDE_PIPELINE.md:140-146`. Companion artifact:
`docs/claude_pipeline/outputs/PHASE1_OPEN_DECISIONS_REGISTER.md`.*
