# Hivelet — Phase 1 Requirements Traceability Matrix (FR-001 – FR-044)

**Project:** Hivelet — Web-Based Boarding House Management & Financial Operations System
**Client:** Fe Galang Da Silva Boarding House, Legazpi City
**Course:** Bicol University College of Science — IT 124 Capstone Project 2, **Group 4**
**Adviser:** Dr. Jayvee Christopher Vibar
**Panel:** Dr. Aris J. Ordonez (Chair), Prof. Ryan A. Rodriguez, Prof. Laarni D. Pancho
**Team:** Sean Jerve Ll. Rebancos (System Architect / Full-Stack) · John Lloyd M. Cuario (Database Administrator / Data Analyst) · Eljohn Paulo C. Loterte (Frontend / UI-UX) · Victor Noel A. Napay (Backend / Integration) · Kiel Hedrix V. Relos (QA / Systems Analyst)

---

## 1. Purpose and Method

This matrix is the single verifiable bridge between the 44 functional requirements in `docs/03_REQUIREMENTS.md` and the code that is actually deployed. Every row was produced by reading the requirement text, then reading the route modules `backend/src/routes/admin.ts` (2,056 lines), `tenant.ts`, `public.ts`, `auth.ts`, `health.ts`, the five implemented service modules in `backend/src/services/`, the permission table `backend/src/config/rbac.ts`, and the twenty table definitions in `database/FULL_DATABASE_SCHEMA.sql`. Every `file:line` citation below was confirmed by opening that line.

The matrix is deliberately unflattering where the code is unfinished. A traceability matrix that reports only successes is not evidence; it is marketing. The 10 MISSING rows are consolidated in the **Gap Register** (§5) with a disposition for each, so that no panelist can surface a gap on defense day that the group has not already surfaced first.

### 1.1 Architectural frame

All tier assignments refer to the project's canonical architecture:

> **Layered Client-Server Architecture Structured as a Modular Monolith with a Pluggable Payment Gateway Adapter**

| Tier | Name | Technology |
|---|---|---|
| Tier 1 | Presentation | Vue 3 + Vite + Pinia + vue-router + vite-plugin-pwa |
| Tier 2 | API & Security Perimeter | Node.js + Express + TypeScript; Helmet, CORS origin lock, JWT bearer auth, `requireRole` guards, centralized `ApiError` |
| Tier 3 | Domain Service Layer (Modular Monolith) | `backend/src/services/` |
| Tier 4 | Data Persistence | PostgreSQL 16 on Supabase — 20 tables, UUID surrogate PKs, RLS, `service_role` containment |
| Tier 5 | External Integration Boundary | Adyen GCash adapter (sandbox / live), implemented; Supabase Storage, planned for Phase 3 and not implemented today |

> **Footnote on naming.** An earlier synonym, *"Isolated Payment Gateway Adapter"*, appears in `FINAL_PRESENTATION_ARCHITECTURE_AND_DATABASE_DEFENSE.md`. It denotes the same Tier 5 boundary described here. A panelist quoting the earlier slide is not being contradicted — only the label changed.

### 1.2 Column definitions

| Column | Meaning |
|---|---|
| **FR ID** | Identifier from `docs/03_REQUIREMENTS.md`, the canonical requirement namespace. |
| **Canonical Name** | The requirement's short name as written in that document. No renaming, no paraphrase. |
| **Tier** | The architectural tier that owns the requirement's primary logic today. |
| **Named Component** | The specific module that carries the behaviour, marked `[I]` implemented or `[P3]` planned. |
| **Backing Route** | HTTP method and API path, with the `file:line` where the handler is registered. |
| **Backing Table(s)** | The PostgreSQL tables the handler actually reads or writes. |
| **Status** | One of MAPPED / PARTIAL / MISSING / FRONTEND-ONLY, defined immediately below. |

### 1.3 Status vocabulary

| Status | Definition |
|---|---|
| **MAPPED** | A backing route and a backing table both exist, and the handler implements the requirement's stated behaviour. |
| **PARTIAL** | A route or a table exists but not both, **or** both exist and the implemented behaviour is materially incomplete against the requirement text. Every PARTIAL row states precisely what is missing. |
| **MISSING** | The requirement has no backend home: no route implements it and no table is written for it. |
| **FRONTEND-ONLY** | The behaviour is fully realised in Tier 1 with no Tier 2/3/4 participation. |

### 1.4 Service-layer legend

Tier 3 today contains **five real modules**. Eight further services are *planned* for Phase 3, to be extracted mechanically from route handlers. They do **not** exist in the repository, and this matrix never cites them as a backing component for a MAPPED row.

| Marker | Component | Status |
|---|---|---|
| `[I]` | `authService.ts`, `auditService.ts`, `scopeService.ts`, `notificationService.ts`, `adyenService.ts` | **Implemented** (present in `backend/src/services/`) |
| `[P3]` | `billingService.ts`, `paymentService.ts`, `occupancyService.ts`, `ticketService.ts`, `inquiryService.ts`, `settingsService.ts`, `expenseService.ts`, `financialReportService.ts` | **Planned (Phase 3)** — does not exist today |

The reason for the extraction backlog is stated plainly: **131 of 158 database calls (83%) currently sit inside route handlers**, and `backend/src/routes/admin.ts` alone is 2,056 lines. Where a row's Named Component reads `admin.ts` rather than a service, that is the honest answer, not an omission.

---

## 2. The Matrix

### Block A — Authenticate & Authorize Users (DFD Process 7.0)

| FR ID | Canonical Name | Tier | Named Component | Backing Route (file:line) | Backing Table(s) | Status |
|---|---|---|---|---|---|---|
| FR-001 | Authentication | Tier 2 / Tier 3 | `authService.ts` `[I]` | `POST /api/auth/login` (`auth.ts:33`); `POST /api/auth/register` (`auth.ts:73`); `POST /api/auth/change-password` (`auth.ts:151`); `POST /api/auth/logout` (`auth.ts:181`) | `profiles`, `audit_logs` | **MAPPED** |
| FR-002 | Role-Based Access | Tier 2 | `config/rbac.ts` + `middleware/auth.ts` `[I]` | Router-level guards `router.use('/admin', requireAuth, requireAdmin)` (`admin.ts:28`) and `router.use('/tenant', requireAuth)` (`tenant.ts:33`); effective set returned by `GET /api/auth/me` (`auth.ts:99`) | `profiles.role` | **MAPPED** |

**FR-002 note.** Authorization is layered: the router-level `requireAdmin` at `admin.ts:28` cannot be bypassed even if an individual `requirePermission` call were forgotten. Eight permission constants are nevertheless *declared and unused* — `BILL_MANAGE` (`rbac.ts:63`), `PAYMENT_RECORD` (`rbac.ts:66`), `PAYMENT_CORRECT` (`rbac.ts:68`), `INCOME_LEDGER_WRITE` (`rbac.ts:72`), `EXPENSE_LEDGER_WRITE` (`rbac.ts:74`), `ANALYTICS_VIEW` (`rbac.ts:75`), `REPORT_EXPORT` (`rbac.ts:76`), `TICKET_CLOSE` (`rbac.ts:84`). No route guards any of them; the ledger routes reuse `PAYMENT_VERIFY` instead. This does not weaken FR-002 — nothing is *under*-guarded — but it is the permission-model counterpart of several MISSING rows below.

### Block B — Manage Public Inquiries & Catalog (DFD Process 1.0)

| FR ID | Canonical Name | Tier | Named Component | Backing Route (file:line) | Backing Table(s) | Status |
|---|---|---|---|---|---|---|
| FR-003 | Public Website | Tier 2 / Tier 4 | `routes/public.ts` → `inquiryService.ts` `[P3]` | `GET /api/public/rooms` (`public.ts:45`); `GET /api/public/rooms/:roomId` (`public.ts:68`); `GET /api/public/clusters` (`public.ts:88`) | `rooms`, `room_photos`, `clusters` | **PARTIAL** |
| FR-004 | Public Inquiry | Tier 2 / Tier 4 | `routes/public.ts` → `inquiryService.ts` `[P3]` | `POST /api/public/inquiries` (`public.ts:118`) | `rooms`, `inquiries`, `inquiry_messages`, `audit_logs`, `notifications` | **MAPPED** |
| FR-005 | Inquiry Management | Tier 2 / Tier 4 | `routes/admin.ts` → `inquiryService.ts` `[P3]` | `GET /api/admin/inquiries` (`admin.ts:730`); `PATCH /api/admin/inquiries/:inquiryId` (`admin.ts:748`); `GET /api/admin/inquiries/:id/messages` (`admin.ts:1941`); `POST /api/admin/inquiries/:id/messages` (`admin.ts:1960`) | `inquiries`, `inquiry_messages` | **MAPPED** |
| FR-006 | Inquiry Conversion | — | none | none | none | **MISSING** |

**FR-003 — what is incomplete.** Property information, room information, photos and availability are all served from real tables. **Amenities are not.** The string `amenit` does not occur anywhere in `backend/src` or in `database/FULL_DATABASE_SCHEMA.sql`; the amenity lists rendered on the public site are a hardcoded client constant, `BH_AMENITIES` at `frontend/src/lib/canonicalUnits.ts:37`. One clause of a five-clause requirement has no persistence and no route.

**FR-004 — server-side enforcement.** BR-006 is enforced in the handler, not by hiding a button: a `Reserved` room is rejected with HTTP 409 (`public.ts:147`), and a non-`Published` room returns 404 (`public.ts:141`). The original message is seeded into the conversation thread at `public.ts:169` so the administrator reads it in context.

**FR-006 — why MISSING.** `inquiryStatusSchema` (`admin.ts:744`) accepts the label `'Converted'` (`admin.ts:745`), but that is a status string, not a conversion. The onboarding payload `tenantOnboardSchema` (`admin.ts:324`) has no `inquiryId` field, and `POST /api/admin/tenants` (`admin.ts:343`) never reads the `inquiries` table. There is no code path by which prospect name, email or phone captured at inquiry time is reused at onboarding. The administrator retypes it.

### Block C — Manage Tenancy & Occupancy (DFD Process 2.0)

| FR ID | Canonical Name | Tier | Named Component | Backing Route (file:line) | Backing Table(s) | Status |
|---|---|---|---|---|---|---|
| FR-007 | Room Management | Tier 2 / Tier 4 | `routes/admin.ts` → `occupancyService.ts` `[P3]` | `GET /api/admin/rooms` (`admin.ts:34`); `POST /api/admin/rooms` (`admin.ts:65`); `PATCH /api/admin/rooms/:roomId` (`admin.ts:123`); `POST /api/admin/rooms/:roomId/photo` (`admin.ts:210`); `DELETE /api/admin/rooms/:roomId` (`admin.ts:268`) | `rooms`, `room_photos`, `room_price_history`, `audit_logs` | **MAPPED** |
| FR-008 | Room History | Tier 4 | `routes/admin.ts` → `occupancyService.ts` `[P3]` | Written by `PATCH /api/admin/rooms/:roomId` (`admin.ts:185`) and by assignment closure (`admin.ts:518`, `admin.ts:693`); read only by `GET /api/tenant/my-rooms` (`tenant.ts:39`) | `room_price_history`, `room_assignments` | **PARTIAL** |
| FR-009 | Tenant Management | Tier 2 / Tier 4 | `routes/admin.ts` → `occupancyService.ts` `[P3]` | `GET /api/admin/tenants` (`admin.ts:303`); `POST /api/admin/tenants` (`admin.ts:343`); `PATCH /api/admin/tenants/:profileId` (`admin.ts:458`); `PATCH /api/admin/tenants/:profileId/status` (`admin.ts:623`); `POST /api/admin/tenants/:profileId/vacate` (`admin.ts:671`) | `profiles`, `room_assignments`, `rooms`, `audit_logs` | **MAPPED** |
| FR-010 | Tenant Profile Updates | Tier 2 / Tier 3 | `authService.ts` `[I]` | `GET /api/tenant/my-profile` (`tenant.ts:541`); `PUT /api/tenant/my-profile` (`tenant.ts:580`); `PATCH /api/auth/me` (`auth.ts:122`) | `profiles`, `audit_logs` | **MAPPED** |
| FR-035 | One-Time Onboarding Fields | Tier 4 | `routes/admin.ts` → `occupancyService.ts` `[P3]` | Captured by `POST /api/admin/tenants` (`admin.ts:415`–`admin.ts:416`); readable via `GET /api/admin/tenants` (`admin.ts:314`) and `GET /api/tenant/my-rooms` (`tenant.ts:52`) | `room_assignments.anniversary_date`, `room_assignments.deposit_amount` | **PARTIAL** |

**FR-008 — what is incomplete.** History is *preserved* correctly. Vacating a tenant sets `is_active = false` and stamps `end_date` rather than deleting the row (`admin.ts:693`), and every price change writes a `room_price_history` row with previous price, new price, effective date, reason and actor (`admin.ts:185`). What is missing is *retrieval*: `GET /api/admin/rooms` (`admin.ts:34`) selects only `clusters` and `room_photos`, so the administrator has no endpoint that returns a unit's occupancy timeline or price history. The data is written and then unreachable from the admin surface.

**FR-009 — disclosed defect.** Onboarding assigns a shared literal temporary password, `'Hivelet@Tenant2026'` (`admin.ts:371`), hashed with bcrypt cost 12 (`admin.ts:373`). The record-management behaviour the requirement asks for is fully present; the credential-issuance weakness is logged as a Phase 3 hardening item, not as an FR-009 gap.

**FR-035 — what is incomplete.** Capture-once works: `anniversary_date` and `deposit_amount` are written at onboarding and never re-prompted. **Reuse does not.** `POST /api/admin/income-records` (`admin.ts:1065`) resolves the active assignment at `admin.ts:1094` but selects only `id, tenant_profile_id`; it never reads `anniversary_date` or `deposit_amount`, and neither value appears in the INSERT at `admin.ts:1112`–`admin.ts:1128`. Half of a two-clause requirement.

### Block D — Process Billing & Payments (DFD Process 3.0)

| FR ID | Canonical Name | Tier | Named Component | Backing Route (file:line) | Backing Table(s) | Status |
|---|---|---|---|---|---|---|
| FR-011 | Billing | Tier 2 / Tier 4 | `routes/admin.ts`, `routes/tenant.ts` → `billingService.ts` `[P3]` | `GET /api/admin/bills` (`admin.ts:791`); `GET /api/tenant/my-bills` (`tenant.ts:70`); bills created only as a side effect at `tenant.ts:445` | `bills` | **PARTIAL** |
| FR-012 | Due Dates | — | none | none (no route sets a due date) | `bills.due_date` (column only) | **MISSING** |
| FR-013 | Overdue Monitoring | — | none | none (no route or job transitions a bill to Overdue) | `bills.status`, `bills.grace_period_end_date` (columns only) | **MISSING** |
| FR-014 | Manual Payments | Tier 2 / Tier 4 | `routes/admin.ts` → `paymentService.ts` `[P3]` | `POST /api/admin/income-records` (`admin.ts:1065`) | `monthly_income_records`, `payments`, `bills`, `rooms`, `room_assignments`, `audit_logs` | **MAPPED** |
| FR-015 | Online Payments | Tier 5 / Tier 2 | `adyenService.ts` `[I]` | `POST /api/tenant/payments/checkout` (`tenant.ts:379`); `POST /api/tenant/payments/adyen/verify-session` (`tenant.ts:514`); `POST /api/public/payments/adyen/webhook` (signature-verified; the only writer of an online payment) | `bills`, `payments`, `room_assignments`, `rooms`, `profiles`, `notifications` | **IMPLEMENTED** |
| FR-016 | Payment Verification | Tier 2 / Tier 4 | `routes/admin.ts` → `paymentService.ts` `[P3]` | `PATCH /api/admin/payments/:paymentId/verify` (`admin.ts:836`); `GET /api/admin/payments` (`admin.ts:807`); `GET /api/tenant/my-payments` (`tenant.ts:94`) | `payments`, `bills`, `monthly_income_records`, `profiles`, `room_assignments`, `notifications`, `audit_logs` | **MAPPED** |
| FR-017 | Financial Corrections | Tier 2 / Tier 3 | `auditService.ts` `[I]` + `routes/admin.ts` | `PATCH /api/admin/income-records/:id` (`admin.ts:1211`); `DELETE /api/admin/income-records/:id` (`admin.ts:1290`); `PATCH /api/admin/expense-entries/:id` (`admin.ts:1434`); `DELETE /api/admin/expense-entries/:id` (`admin.ts:1496`) | `monthly_income_records`, `monthly_expense_entries`, `audit_logs` | **MAPPED** |
| FR-031 | Monthly Income Report Layout | Tier 1 / Tier 4 | `IncomeCollectionsView.vue` + `routes/admin.ts` → `financialReportService.ts` `[P3]` | `GET /api/admin/income-records` (`admin.ts:1013`) returns flat rows joined to `rooms(cluster_code)` | `monthly_income_records`, `rooms` | **PARTIAL** |
| FR-032 | Guided Monthly Payment Entry | Tier 2 / Tier 4 | `routes/admin.ts` → `billingService.ts` `[P3]` | `POST /api/admin/income-records` (`admin.ts:1065`) | `monthly_income_records`, `rooms`, `room_assignments` | **PARTIAL** |
| FR-033 | Occupant Count Memory | — | none | none (no previous-month lookup) | `monthly_income_records.occupants` (read by no prefill path) | **MISSING** |
| FR-034 | Water Payment Validation | Tier 1 / Tier 2 | `IncomeCollectionsView.vue` + `routes/admin.ts` → `settingsService.ts` `[P3]` | `POST /api/admin/income-records` (`admin.ts:1065`), which recomputes water at `admin.ts:1103` | `monthly_income_records.water_payment` | **PARTIAL** |
| FR-036 | Linda Fixed Billing Flow | — | none | none (no Linda branch in any handler) | `rooms.is_linda_unit`, `monthly_income_records.is_linda_billing` / `linda_water_charge` / `linda_electricity_charge` (columns only) | **MISSING** |

**FR-011 — what is incomplete.** Both read paths exist and the `bills` table is fully modelled. There is **no bill-authoring endpoint**: no `POST /api/admin/bills`, no `PATCH`, no `DELETE`, and the declared `BILL_MANAGE` permission (`rbac.ts:63`) guards no route. A bill comes into existence only as an incidental side effect of a tenant pressing checkout with no unpaid bill on file (`tenant.ts:445`). The administrator cannot originate the monthly rent-and-water bill that the requirement presumes.

**FR-012 — why MISSING.** `bills.due_date` is `NOT NULL DEFAULT CURRENT_DATE` in the schema (`FULL_DATABASE_SCHEMA.sql:221`), and exactly one line in the entire backend writes it: `due_date: new Date(Date.now() + 5 * 86400000)` at `tenant.ts:452` — five days after whatever moment the tenant clicked checkout, identical for every tenant and unrelated to anything. BR-010 requires the due date to derive from the move-in date; `room_assignments.start_date` and `anniversary_date` are never consulted. There is no administrative route to set or adjust a due date. The requirement asks for *individual* due dates; the system produces one arbitrary uniform offset.

**FR-013 — why MISSING.** The literal `'Overdue'` occurs exactly once in `backend/src`, as a filter value in an `IN` clause at `admin.ts:1143`. No handler, no scheduled job and no database trigger ever transitions a bill from `Due` to `Overdue`. The one line that writes `grace_period_end_date` — `tenant.ts:453` — hardcodes a **10-day** window, which contradicts both BR-012 and the seeded `system_settings.grace_period_days = 7` (`FULL_DATABASE_SCHEMA.sql:458`). `GET /api/tenant/my-bills` (`tenant.ts:75`) faithfully returns a column that nothing maintains.

**FR-014 — how it works.** The handler resolves the unit by case-insensitive room number (`admin.ts:1084`), finds the active assignment (`admin.ts:1094`), inserts the ledger row (`admin.ts:1112`), then walks the tenant's unpaid bills oldest-first and settles each one it can fully cover, writing a matching `payments` row with `payment_source: 'On-Site Cash'` (`admin.ts:1157`) and posting any residue as an unlinked payment (`admin.ts:1180`). On-site in-person cash settlement is the **primary** settlement method, matching Mrs. Fe's daily routine; Adyen GCash is the optional digital alternative.

> **Disclosed defect against FR-014 and FR-032.** `fiftyPercentShare` is computed at `admin.ts:911` and `calcShare` / `calcRemitted` at `admin.ts:1102`–`admin.ts:1104`, but **neither value appears in either INSERT** (`admin.ts:942`–`admin.ts:957`; `admin.ts:1112`–`admin.ts:1128`). Both columns therefore retain their `DEFAULT 0.00`, so every `monthly_income_records` row currently stores `0.00` for `fifty_percent_share` and `remitted_amount`. This is carried as FR-032 PARTIAL and as a Phase 2 corrective, not as an FR-014 failure: the payment itself is recorded correctly.

**FR-015 — what is incomplete, and what is not.** The group obtained and configured an **Adyen developer sandbox account** and implemented the GCash checkout flow against it through a decoupled adapter. `adyenService.isLiveConfigured()` (`adyenService.ts:42`) auto-selects sandbox or live credentials, and the sandbox path POSTs to `https://checkout-test.adyen.com/v71/sessions` (`adyenService.ts:61`) — **correct behaviour for a sandbox account, not a defect.** Commercial live processing additionally requires SEC/DTI business underwriting, which is outside the scope of an academic capstone. Two honest caveats hold the row at PARTIAL: (a) `@adyen/api-library` is declared in `backend/package.json` but never imported — the adapter calls the Checkout API over HTTP directly; (b) both gateway-return endpoints, `GET /api/public/payments/mock-gateway` (`public.ts:201`) and `POST /api/public/payments/mock-gateway/complete` (`public.ts:852`), are **unauthenticated**, a Phase 3 hardening item. The administrator's sovereign verification gate is intact: per BR-017, gateway completion inserts the payment as `'Pending Verification'` (`adyenService.ts:212`) and never auto-settles a bill.

**FR-016 — how it works.** Verification is the single audited step that moves money in the model. On `Verified`, the handler marks the bill `Paid` (`admin.ts:884`), synthesises the corresponding `monthly_income_records` row if one does not already exist for the transaction reference (`admin.ts:942`), and notifies the tenant (`admin.ts:966`). On `Rejected`, it reverts the bill to `Due` (`admin.ts:978`) and notifies the tenant (`admin.ts:984`). This is BR-016/BR-017 in code.

**FR-017 — how it works.** Corrections are non-destructive. `DELETE /api/admin/income-records/:id` does not delete: it stamps `voided_at`, `voided_by` and `void_reason` (`admin.ts:1306`–`admin.ts:1308`), and the read path filters `.is('voided_at', null)` (`admin.ts:1028`). Every mutation calls `auditFromRequest` with `previousValues` and `newValues` (`admin.ts:1275`, `admin.ts:1315`), landing in `audit_logs` via `auditService.ts:85`. *Residual risk, disclosed:* voiding an income record does not reverse the `payments` rows the original POST created at `admin.ts:1157` / `admin.ts:1180`, and **no `BEGIN`/`COMMIT` block exists anywhere in `backend/src`**, so multi-table atomicity is a Phase 3 design target rather than an implemented property.

**FR-031 — what is incomplete.** `GET /api/admin/income-records` returns a flat list ordered by `date_paid` descending (`admin.ts:1029`). It performs no cluster grouping, computes no per-cluster subtotal, computes no grand total, and imposes no canonical cluster order. All of that is reconstructed in Tier 1 — the cluster order lives in `frontend/src/lib/canonicalUnits.ts:96` and the subtotal arithmetic in `frontend/src/views/IncomeCollectionsView.vue:244`–`250`. The landlady's layout is reproduced, but by the browser, not by the system of record.

**FR-032 — what is incomplete.** Of the three values the requirement says must be computed automatically: the **rent period** arrives from the client payload (`dateCoveredStart` / `dateCoveredEnd`, `incomeRecordSchema` at `admin.ts:1047`) rather than being derived; the **50% share** and the **remitted amount** are computed at `admin.ts:1102`–`admin.ts:1104` and then discarded before the INSERT. Zero of three auto-computations currently persist. The guided form itself — unit dropdown, calendar date picker, contact/invoice entry, rent amount entry — exists and posts correctly.

**FR-033 — why MISSING.** The requirement is specific: pre-fill from *the same tenant's previous month entry*. `incomeRecordSchema` (`admin.ts:1047`) makes `occupants` a required client-supplied integer. No route queries the prior month's `monthly_income_records.occupants` for a unit, and the client does not either — `IncomeCollectionsView.vue:374` falls back to a canonical-unit constant, not to history. A related but different behaviour does exist — `room_assignments.occupant_count` is carried forward across a reassignment at `admin.ts:572` — and it is deliberately **not** counted as satisfying FR-033, because it is assignment-scoped, not month-scoped.

**FR-034 — what is incomplete.** Water is **configurable in the database and hardcoded in the code**. Per BR-014 and BR-036 the charge is registered occupants × the rate held in `system_settings.water_rate_per_occupant`, seeded at **200** with `business_rule = 'BR-014'` (`FULL_DATABASE_SCHEMA.sql:454`) — a configurable parameter with 200 as its seeded default. The backend nevertheless multiplies by a literal `200` at `admin.ts:910`, `admin.ts:1103` and `admin.ts:1243`, and accepts no water-payment field at all, so it has nothing to validate — it silently recomputes and overwrites. The warn-before-save behaviour the requirement asks for exists only in Tier 1, at `IncomeCollectionsView.vue:384` and `:388`. Correct arithmetic by construction, wrong location, and a configured rate that nothing reads.

**FR-036 — why MISSING.** Every piece of the Linda model is in place except the code. `rooms.is_linda_unit` is accepted by `roomInsertSchema` (`admin.ts:48`); `monthly_income_records` carries `is_linda_billing`, `linda_electricity_charge` and `linda_water_charge` (`FULL_DATABASE_SCHEMA.sql:275`–`277`); `system_settings` seeds `linda_lf_water_charge = 400`, `linda_lb_water_charge = 200` and `linda_lb_electricity_charge = 325` against BR-040 (`FULL_DATABASE_SCHEMA.sql:455`–`457`). **Zero backend lines read or write any of them.** `admin.ts:1103` applies `occupants * 200` to every unit, LF and LB included, which is exactly the case BR-040 excludes from the per-occupant model. The fixed-per-unit branch exists only in the client, at `OnsitePaymentModal.vue:67`.

### Block E — Manage Operational Expenses (DFD Process 4.0)

| FR ID | Canonical Name | Tier | Named Component | Backing Route (file:line) | Backing Table(s) | Status |
|---|---|---|---|---|---|---|
| FR-018 | Expense Management | Tier 2 / Tier 4 | `routes/admin.ts` → `expenseService.ts` `[P3]` | `POST /api/admin/expense-entries` (`admin.ts:1378`); `GET /api/admin/expense-entries` (`admin.ts:1325`) | `monthly_expense_entries`, `expense_property_allocations`, `fixed_expense_categories` | **PARTIAL** |
| FR-037 | Monthly Expenses Ledger | Tier 2 / Tier 4 | `routes/admin.ts` → `expenseService.ts` `[P3]` | `POST /api/admin/expense-entries` (`admin.ts:1378`); `GET /api/admin/expense-entries` (`admin.ts:1325`) | `monthly_expense_entries`, `expense_property_allocations`, `fixed_expense_categories` | **MAPPED** |
| FR-038 | Split Expense Entry | Tier 2 / Tier 4 | `routes/admin.ts` → `expenseService.ts` `[P3]` | `POST /api/admin/expense-entries` (`admin.ts:1378`), fan-out insert at `admin.ts:1414`; re-allocation at `admin.ts:1471`–`admin.ts:1477` | `expense_property_allocations` | **MAPPED** |
| FR-039 | Automatic Expense Totals | Tier 2 / Tier 4 | `routes/admin.ts` → `financialReportService.ts` `[P3]` | `POST /api/admin/expense-entries` (`admin.ts:1378`), row total at `admin.ts:1389` | `monthly_expense_entries.total_expenses` | **PARTIAL** |
| FR-040 | Expense Category Cumulative Totals | — | none | none | none (no column, no rollforward) | **MISSING** |
| FR-041 | Fixed Expense Category Dropdown | Tier 2 / Tier 4 | `routes/admin.ts` → `expenseService.ts` `[P3]` | `GET /api/admin/expense-categories` (`admin.ts:1531`) | `fixed_expense_categories` | **MAPPED** |
| FR-042 | Expense/Category Reconciliation Check | — | none | none | none | **MISSING** |

**FR-018 — what is incomplete.** Categorisation is sound: `monthly_expense_entries.category_code` is a genuine foreign key to `fixed_expense_categories(code)` (`FULL_DATABASE_SCHEMA.sql:332`), so an entry cannot carry an invented category. The allocation target is not: `expense_property_allocations.property_area` is an unconstrained `VARCHAR(100)` (`FULL_DATABASE_SCHEMA.sql:353`) with no foreign key to `rooms` or `clusters` and no `CHECK` enumeration, and the handler accepts it as free text via `expenseAllocationSchema` (`admin.ts:1362`). A single typo silently creates a phantom property area, which is precisely what would break the FR-042 reconciliation the ledger depends on.

**FR-037 — how it works.** Date, OR/Supplier, one fixed category and one-or-more Property Area allocations are exactly the shape of `expenseEntrySchema` (`admin.ts:1367`), and the read path filters voided rows and paginates in 1,000-row batches (`admin.ts:1336`–`admin.ts:1355`). The ledger structure of `10_MONTHLY_EXPENSES_REPORT.md` is reproduced faithfully in the schema.

**FR-038 — how it works.** `allocations` is `z.array(...).min(1)` (`admin.ts:1371`): one submission of date, supplier and category fans out to N allocation rows in a single insert (`admin.ts:1414`). Editing replaces the allocation set wholesale — delete-then-insert at `admin.ts:1471` and `admin.ts:1477` — without re-entering the header fields. *Residual risk, disclosed:* that delete-then-insert pair is not wrapped in a transaction, so a failure between the two statements leaves an entry with a `total_expenses` header and no allocations.

**FR-039 — what is incomplete.** One of the three required totals is implemented. The **row total** is computed at `admin.ts:1389` and persisted as `total_expenses` (`admin.ts:1398`). Each **Property Area's monthly bottom total** and each **category's "this month" total** are computed by no route and stored in no column; the figures on screen are derived in `ExpensesLedgerView.vue`.

**FR-040 — why MISSING.** There is no cumulative column on `fixed_expense_categories` or `monthly_expense_entries`, no rollforward routine, and no endpoint that carries a category's running total from the previous month. The requirement has no representation anywhere in Tier 2, 3 or 4.

**FR-041 — how it works.** The thirteen fixed categories are seeded in the schema with the Salaries sub-lines intact — `6a PhilHealth`, `6b SSS`, `6c Allowances`, all with `parent_code = '6'` (`FULL_DATABASE_SCHEMA.sql:319`–`321`) — and the endpoint returns `code, name, parent_code, display_order` ordered by `display_order` (`admin.ts:1536`), which is precisely what a hierarchical dropdown needs.

**FR-042 — why MISSING.** No route, no query and no client function compares the sum of category "this month" totals against the sum of Property Area bottom totals. This is the arithmetic check that proves the digital ledger balances the way the paper one did; today nothing performs it. Combined with the free-text `property_area` noted under FR-018, this is the highest-consequence gap in the expense block.

### Block F — Process Maintenance Tickets (DFD Process 5.0)

| FR ID | Canonical Name | Tier | Named Component | Backing Route (file:line) | Backing Table(s) | Status |
|---|---|---|---|---|---|---|
| FR-021 | Maintenance Tickets | Tier 2 / Tier 3 | `scopeService.ts` `[I]` + `routes/tenant.ts` → `ticketService.ts` `[P3]` | `POST /api/tenant/tickets` (`tenant.ts:174`); `POST /api/admin/tickets` (`admin.ts:1582`) | `maintenance_tickets`, `room_assignments`, `rooms`, `audit_logs`, `notifications` | **MAPPED** |
| FR-022 | Attachments | Tier 2 / Tier 4 / Tier 5 | `routes/tenant.ts` → `ticketService.ts` `[P3]` | Written inside `POST /api/tenant/tickets` (`tenant.ts:205`); read only by `GET /api/admin/tickets` (`admin.ts:1558`) | `ticket_attachments` | **PARTIAL** |
| FR-023 | Ticket Priority | Tier 2 / Tier 4 | `routes/tenant.ts`, `routes/admin.ts` | Enum enforced by `ticketSchema` (`tenant.ts:159`) and `ticketCreateSchema` (`admin.ts:1573`) | `maintenance_tickets.priority` | **MAPPED** |
| FR-024 | Ticket Status | Tier 2 / Tier 4 | `routes/tenant.ts` → `ticketService.ts` `[P3]` | `GET /api/tenant/my-tickets` (`tenant.ts:136`) | `maintenance_tickets` | **MAPPED** |
| FR-025 | Ticket Administration | Tier 2 / Tier 4 | `routes/admin.ts` → `ticketService.ts` `[P3]` | `GET /api/admin/tickets` (`admin.ts:1549`); `PATCH /api/admin/tickets/:ticketId` (`admin.ts:1667`); `PATCH /api/admin/tickets/:ticketId/close` (`admin.ts:1761`); `DELETE /api/admin/tickets/:ticketId` (`admin.ts:1816`) | `maintenance_tickets`, `room_assignments`, `rooms`, `audit_logs` | **MAPPED** |

**FR-021 — how it works.** `tenant_profile_id` is taken from the JWT, never from the body, and the target room is checked against the caller's own assignments by `assertRoomInScope` (`tenant.ts:185`, backed by `scopeService.ts:28`). A tenant cannot file a ticket against a unit they do not occupy. The ticket opens at status `'Submitted'` (`tenant.ts:197`) and immediately notifies the administrator (`tenant.ts:223`).

**FR-022 — what is incomplete.** Attachments are inserted (`tenant.ts:205`) and are returned to the administrator (`admin.ts:1558`), but two gaps remain. First, **no upload endpoint exists**: `ticketSchema` accepts a pre-existing `fileUrl` string (`tenant.ts:161`), so the Tier 5 Supabase Storage write is performed by the client, unmediated by the API. Second, `GET /api/tenant/my-tickets` (`tenant.ts:141`) does not select `ticket_attachments`, so a tenant cannot see the photo they themselves attached.

**FR-023 — how it works.** All four priorities are enforced at the schema boundary on both entry points, and `'Emergency'` additionally drives an operational side effect: it flips the unit to `Under Maintenance` at `admin.ts:1637`.

**FR-025 — how it works.** Closure stamps `resolved_at`, `closed_at` and `closed_by` together (`admin.ts:1779`–`admin.ts:1781`), then re-checks whether any unresolved ticket remains on the unit before returning it to `Available` (`admin.ts:1790`–`admin.ts:1805`). The audit action is written as `TICKET_CLOSE` or `TICKET_STATUS_CHANGE` at `admin.ts:1747`.

### Block G — Generate Financial Reports & Analytics (DFD Process 6.0)

| FR ID | Canonical Name | Tier | Named Component | Backing Route (file:line) | Backing Table(s) | Status |
|---|---|---|---|---|---|---|
| FR-019 | Cash Flow | — | none (`financialReportService.ts` `[P3]`) | none | none (derived client-side from `monthly_income_records` + `monthly_expense_entries`) | **MISSING** |
| FR-020 | Profitability Analytics | — | none (`financialReportService.ts` `[P3]`) | none; `ANALYTICS_VIEW` (`rbac.ts:75`) guards no route | none | **MISSING** |
| FR-028 | Reports | — | none (`financialReportService.ts` `[P3]`) | none; `REPORT_EXPORT` (`rbac.ts:76`) guards no route | none | **MISSING** |
| FR-044 | Excel Export of Income/Expense Reports | Tier 1 | `IncomeCollectionsView.vue`, `ExpensesLedgerView.vue` | none — client-side `Blob` download at `IncomeCollectionsView.vue:430` and `ExpensesLedgerView.vue:452` | none | **FRONTEND-ONLY** |

**FR-019 / FR-020 — why MISSING.** The backend exposes both raw ledgers — `GET /api/admin/income-records` (`admin.ts:1013`) and `GET /api/admin/expense-entries` (`admin.ts:1325`) — and nothing else. There is no endpoint that returns income, expenses or net cash flow as an aggregate, no SQL aggregation, and no materialised view. Every figure, trend and graph on the administrator dashboard is arithmetic performed in the browser over rows the client downloaded in full. For a 33-unit property this is operationally adequate and architecturally wrong: the system of record does not know its own net position.

**FR-028 — why MISSING.** "Live reports and export capabilities" has no server-side existence. The `REPORT_EXPORT` permission was declared and then never used.

**FR-044 — why FRONTEND-ONLY.** Export is real and it works — both ledgers emit a UTF-8 BOM-prefixed CSV that Excel opens cleanly, with cluster group headers, per-group subtotals and a grand total (`IncomeCollectionsView.vue:430`–`549`; `ExpensesLedgerView.vue:452`–`560`). It is nevertheless entirely Tier 1: no route, no table, no service. Two consequences follow honestly. The output is CSV, not a native `.xlsx` workbook, so the requirement's "matching their defined layouts" holds only to the extent CSV can carry layout. And because the layout logic lives only in the browser, the export and any future server-side report would have to be kept in agreement by hand.

### Block H — Cross-Cutting Requirements

| FR ID | Canonical Name | Tier | Named Component | Backing Route (file:line) | Backing Table(s) | Status |
|---|---|---|---|---|---|---|
| FR-026 | Communication | Tier 2 / Tier 4 | `routes/admin.ts`, `routes/tenant.ts` → `inquiryService.ts` / `ticketService.ts` `[P3]` | `GET`/`POST /api/admin/inquiries/:id/messages` (`admin.ts:1941`, `admin.ts:1960`); `GET`/`POST /api/admin/tickets/:id/messages` (`admin.ts:1993`, `admin.ts:2012`); `GET`/`POST /api/tenant/tickets/:ticketId/messages` (`tenant.ts:242`, `tenant.ts:271`) | `inquiry_messages`, `ticket_messages` | **PARTIAL** |
| FR-027 | Notifications | Tier 3 | `notificationService.ts` `[I]` | `GET /api/admin/notifications` (`admin.ts:1885`); `GET /api/admin/notifications/unread-count` (`admin.ts:1910`); `PATCH /api/admin/notifications/:id/read` (`admin.ts:1919`); `POST /api/admin/notifications/mark-all-read` (`admin.ts:1928`); `GET /api/tenant/my-notifications` (`tenant.ts:326`); `PATCH /api/tenant/my-notifications/:id/read` (`tenant.ts:351`); `POST /api/tenant/my-notifications/mark-all-read` (`tenant.ts:360`) | `notifications`, `profiles` | **MAPPED** |
| FR-029 | Audit Logs | Tier 3 / Tier 4 | `auditService.ts` `[I]` | `GET /api/admin/audit-logs` (`admin.ts:1864`); written from every mutating handler via `auditFromRequest` (`auditService.ts:104`) | `audit_logs`, `profiles` | **MAPPED** |
| FR-030 | Offline-Ready Access | Tier 1 / Tier 2 | `vite-plugin-pwa` service worker | Cached GETs only: `GET /api/public/*` (`public.ts:45`, `:68`, `:88`) and `GET /api/health` (`health.ts:13`), matched by the `NetworkFirst` rule at `frontend/vite.config.ts:64` | `rooms`, `room_photos`, `clusters` (read-only cache) | **PARTIAL** |
| FR-043 | Admin-Only Income/Expense Entry | Tier 2 | `middleware/auth.ts` + `config/rbac.ts` | Router-level `requireAuth, requireAdmin` (`admin.ts:28`) over every ledger route: `admin.ts:1013`, `:1065`, `:1211`, `:1290`, `:1325`, `:1378`, `:1434`, `:1496`, `:1531` | `monthly_income_records`, `monthly_expense_entries` | **MAPPED** |

**FR-026 — what is incomplete.** Tenant↔administrator threads are complete and bidirectional on tickets. Inquiry threads are not. A prospect's original message is seeded once at `public.ts:169`; thereafter only the administrator can post, via `POST /api/admin/inquiries/:id/messages` (`admin.ts:1960`). There is no public endpoint for a prospect to reply and no account for them to log into, so the inquiry conversation the requirement calls for is one-directional from the prospect's side. The legacy baseline it replaces — chat messages noted informally, with no log — is improved on but not yet closed out.

**FR-027 — how it works.** `notificationService.notify()` (`notificationService.ts:63`) resolves the administrator recipient from `profiles` (`notificationService.ts:45`) and writes a typed, prioritised row. Events already wired: new inquiry (`public.ts:184`), new ticket (`tenant.ts:223`), payment verified (`admin.ts:966`), payment rejected (`admin.ts:984`), gateway completion (`adyenService.ts:246`).

**FR-029 — how it works.** `auditService.ts:85` writes actor, action, entity type, entity id, previous values, new values and client IP. Mutation handlers call it uniformly, including the security-relevant ones: `AUTH_PASSWORD_CHANGE` (`auth.ts:167`), `AUTH_LOGOUT` (`auth.ts:186`), `PROFILE_UPDATE` (`auth.ts:130`), `PAYMENT_VERIFY` (`admin.ts:995`), `PAYMENT_CORRECT` (`admin.ts:1275`, `:1315`), `EXPENSE_VOID` (`admin.ts:1521`). *Disclosed:* append-only behaviour per BR-028 is enforced by convention and by RLS, not yet by a database-level immutability trigger.

**FR-030 — what is incomplete, stated precisely.** The service worker's `NetworkFirst` rule matches `/api/(public|health)` only (`frontend/vite.config.ts:64`), with a 3-second network timeout, a 30-entry cap and a one-hour expiry. The app shell and static assets are precached. **No authenticated resource is available offline** — not bills, not payments, not tickets, not the ledgers. This row is PARTIAL rather than satisfied because the requirement's own wording ("limited offline-ready access to cached resources and safe previously available data") is met only for the public catalogue half; the group does not claim offline capability beyond it.

**FR-043 — how it works.** This is the strongest row in the matrix and the one BR-048 depends on. The guard is not per-route and therefore not forgettable: `router.use('/admin', requireAuth, requireAdmin)` at `admin.ts:28` sits above every handler in the file, so a tenant token cannot reach a ledger route even if an individual `requirePermission` call were omitted. Per-route permissions remain as a documented second barrier. `backend/src/config/rbac.ts:5-6` cites BR-048 correctly as *Admin-Only Authorship of Income/Expense Ledgers* (the identifier itself is on `:6`).

---

## 3. Summary Counts

| Status | Count | Share of 44 | FR IDs |
|---|---:|---:|---|
| **MAPPED** | **20** | 45.5% | FR-001, FR-002, FR-004, FR-005, FR-007, FR-009, FR-010, FR-014, FR-016, FR-017, FR-021, FR-023, FR-024, FR-025, FR-027, FR-029, FR-037, FR-038, FR-041, FR-043 |
| **PARTIAL** | **13** | 29.5% | FR-003, FR-008, FR-011, FR-015, FR-018, FR-022, FR-026, FR-030, FR-031, FR-032, FR-034, FR-035, FR-039 |
| **MISSING** | **10** | 22.7% | FR-006, FR-012, FR-013, FR-019, FR-020, FR-028, FR-033, FR-036, FR-040, FR-042 |
| **FRONTEND-ONLY** | **1** | 2.3% | FR-044 |
| **Total** | **44** | 100% | — |

### 3.1 Distribution by tier of primary ownership

| Tier | MAPPED | PARTIAL | MISSING | FRONTEND-ONLY |
|---|---:|---:|---:|---:|
| Tier 1 Presentation | 0 | 3 | 0 | 1 |
| Tier 2 API & Security Perimeter | 8 | 6 | 0 | 0 |
| Tier 3 Domain Service Layer | 5 | 0 | 0 | 0 |
| Tier 4 Data Persistence | 7 | 3 | 0 | 0 |
| Tier 5 External Integration Boundary | 0 | 1 | 0 | 0 |
| *No tier — requirement unimplemented* | 0 | 0 | 10 | 0 |

**Single-owner allocation rule.** The table above counts each of the 44 requirements **exactly once**, under the tier that owns its *primary* logic today; a row whose Tier column names two tiers is allocated to one of them, never to both, which is why the tier lines sum to 20 / 13 / 10 / 1 and not to a larger number. The rule has to be stated because Tier 3 is where a panelist counting rows would otherwise disagree with the table: **six** MAPPED rows name a Tier-3 service in their Named Component column — FR-001 and FR-010 (`authService.ts`), FR-017 and FR-029 (`auditService.ts`), FR-021 (`scopeService.ts`) and FR-027 (`notificationService.ts`) — while the Tier 3 line reports **five**. The row allocated elsewhere is **FR-029 Audit Logs**, counted under Tier 4: what that requirement delivers is the durable `audit_logs` record, and `auditService.ts:85` is the cross-cutting writer serving every process rather than the owner of this one row. FR-021, by the same rule, is counted under Tier 3, because `scopeService.ts:28` performs the ownership check the requirement itself specifies.

Tier 3 therefore owns five MAPPED rows and no PARTIAL rows, which is the expected signature of a service layer that is small but correct. The concentration of MAPPED rows in Tier 2 rather than Tier 3 is the direct numerical expression of the 83% route-handler figure: the domain logic exists and works, but it lives one tier lower than the architecture says it should. Phase 3 extraction moves rows from the Tier 2 line to the Tier 3 line without changing a single status.

### 3.2 Reconciliation against the verified Phase 1 totals

The per-row assignments above sum to **20 / 13 / 10 / 1**, matching the verified Phase 1 totals exactly. No row was reclassified to force the total; each status was derived from the code first and the totals were checked afterwards. The three judgement calls a panelist is most likely to probe are stated openly:

1. **FR-012 and FR-013 are MISSING, not PARTIAL,** even though `bills.due_date` and `bills.grace_period_end_date` exist as columns. A column that exactly one line writes with a constant, which no administrative route can set and which no logic consumes, is schema, not implementation. Classifying them PARTIAL would credit the system with behaviour it does not perform.
2. **FR-036 is MISSING, not PARTIAL,** despite four dedicated columns and three seeded settings keys. Zero backend lines read or write any of them, and `admin.ts:1103` actively applies the wrong rule to LF and LB. Infrastructure without a code path is not partial delivery.
3. **FR-044 is FRONTEND-ONLY, not MAPPED,** even though the feature demonstrably works in the browser. The status describes where the behaviour lives, not whether it satisfies the user.

---

## 4. Systemic Findings Behind the Gaps

Four defects explain most of the PARTIAL and MISSING rows. All are Phase 2 and Phase 3 work, not Phase 1 fixes, and are recorded here so that the matrix reads as a diagnosis rather than a list of accidents.

| # | Finding | Evidence | Rows affected |
|---|---|---|---|
| 1 | **`system_settings` is seeded correctly and read by zero lines of backend code.** Six keys with correct values and `business_rule` tags exist (`FULL_DATABASE_SCHEMA.sql:441`–`461`); the string `system_settings` does not occur anywhere in `backend/src`. | Hardcoded `occupants * 200` at `admin.ts:910`, `:1103`, `:1243`; hardcoded 10-day grace at `tenant.ts:453` against the seeded 7 | FR-013, FR-034, FR-036 |
| 2 | **Two derived financial columns are computed and then dropped.** `fifty_percent_share` and `remitted_amount` are calculated (`admin.ts:911`, `:1102`–`:1104`) but absent from both INSERTs (`admin.ts:942`–`:956`, `:1112`–`:1128`), so every row stores `0.00`. Per BR-035 the 50% share is exactly half of the row's Rent Amount, system-computed and never entered manually, with water, GBG fee and deposit excluded from it; per BR-038 the Remitted Amount is Rent Amount + Water Payment. Both figures are carried over from Column 6 of the landlady's existing source spreadsheet and are retained so that the digital ledger reconciles line-for-line with her historical records. | `admin.ts:1102`–`admin.ts:1128` | FR-031, FR-032 |
| 3 | **No aggregation layer exists.** No endpoint returns a subtotal, a total, a rollforward or a reconciliation. Every derived figure is computed in the browser. | No aggregate route in any of the five route modules; `ANALYTICS_VIEW` (`rbac.ts:75`) and `REPORT_EXPORT` (`rbac.ts:76`) guard nothing | FR-019, FR-020, FR-028, FR-031, FR-039, FR-040, FR-042, FR-044 |
| 4 | **No transaction boundary exists.** `BEGIN`/`COMMIT` appears nowhere in `backend/src`. Multi-table writes — income record plus payments plus bill status; expense header plus allocations — are sequential and independently failable. Atomicity is a Phase 3 design target, not an implemented property. | `admin.ts:1112`–`admin.ts:1190`; `admin.ts:1471`–`admin.ts:1477` | FR-017, FR-038 (residual risk) |

**No performance figure is asserted anywhere in this matrix.** Claims of "256MB RAM", "sub-50ms response" and "100% data consistency" that appear in previously submitted documents are unsubstantiated; they are omitted here rather than repeated, and any comparable property is stated as a design target when it is stated at all.

---

## 5. Gap Register — The 10 MISSING Requirements

This is the section that prevents a panelist from discovering a gap on stage. Each entry states the gap, its business consequence against the legacy manual baseline, and a **single confirmed disposition.** The owner confirmed on 2026-09-13 that **all ten are implemented in Phase 3**; none is de-scoped. The group's position on each is fixed before the defense, not improvised during it.

| # | FR | Canonical Name | Consequence if left as-is | Confirmed Disposition |
|---|---|---|---|---|
| 1 | **FR-012** | Due Dates | Every bill carries the same arbitrary 5-day offset from checkout time (`tenant.ts:452`). BR-010 (due date derives from move-in) and BR-011 (overdue begins the day after the due date) cannot be evaluated at all. | **Implement in Phase 3.** Highest priority of the ten. Derive `due_date` from `room_assignments.start_date` inside the extracted `billingService.ts`. Blocks FR-011 and FR-013. |
| 2 | **FR-013** | Overdue Monitoring | No bill ever becomes Overdue. The single clearest advantage over the paper ledger — knowing today who is late — does not exist. The grace window in code (10 days) contradicts both the seeded value (7) and BR-012. | **Implement in Phase 3.** Compute status on read in `billingService.ts` from `due_date + system_settings.grace_period_days`; correct `tenant.ts:453`. Depends on FR-012. |
| 3 | **FR-033** | Occupant Count Memory | The administrator retypes the occupant count every month for all 33 units. Because water is occupants × rate, a mistyped count silently mis-bills the tenant. | **Implement in Phase 3.** Low cost, high daily value: one indexed query on `monthly_income_records (room_id, year, month)` returning the prior month's `occupants` as a pre-fill the administrator can override, per FR-033's "editable" clause. |
| 4 | **FR-036** | Linda Fixed Billing Flow | Units LF and LB are billed occupants × 200, which is the rule BR-040 explicitly excludes them from. Two of 33 units are billed by the wrong model today. Columns and settings keys already exist. | **Implement in Phase 3.** A correctness defect, not a feature request. Branch on `rooms.is_linda_unit` in the extracted `billingService.ts` and read the three seeded `linda_*` keys instead of the literal 200. |
| 5 | **FR-042** | Expense/Category Reconciliation Check | Nothing proves the expense ledger balances. Combined with the free-text `property_area` noted under FR-018, a typo can silently unbalance a month with no detection. | **Implement in Phase 3.** Constrain `property_area` to a validated set, then add one comparison endpoint in `expenseService.ts`. This is the check that makes the digital ledger trustworthy to the client. |
| 6 | **FR-040** | Expense Category Cumulative Totals | Each month's category figures start from zero; the year-to-date view the landlady's paper ledger provides is lost. | **Implement in Phase 3.** A single window-function query in `financialReportService.ts` over `monthly_expense_entries`; requires no schema change. |
| 7 | **FR-019** | Cash Flow | The system of record cannot state its own net position. Every figure is browser arithmetic over a full table download. | **Implement in Phase 3.** One aggregate endpoint in `financialReportService.ts`, guarded by the already-declared `ANALYTICS_VIEW` (`rbac.ts:75`). |
| 8 | **FR-020** | Profitability Analytics | Trend and profitability views cannot be reproduced, cited or exported server-side; two clients could legitimately disagree about the same month. | **Implement in Phase 3,** immediately after FR-019 and sharing its aggregate. |
| 9 | **FR-028** | Reports | "Live reports and export capabilities" has no server-side existence; `REPORT_EXPORT` (`rbac.ts:76`) guards nothing. FR-044 already delivers the export half from Tier 1. | **Narrow the scope and implement the remainder in Phase 3.** Re-state FR-028 as *server-generated report retrieval*, satisfied by the FR-019/FR-020 aggregate endpoints, and let FR-044 own export. Record the narrowing on the errata sheet. |
| 10 | **FR-006** | Inquiry Conversion | The administrator retypes prospect name, email and phone at onboarding, reintroducing exactly the transcription error the system was built to remove. Lowest business impact of the ten: inquiries are infrequent. | **Implement in Phase 3.** The earlier recommendation to de-scope is **withdrawn** (owner decision, 2026-09-13); nothing in the matrix is de-scoped. Add an `inquiryId` to `tenantOnboardSchema` (`admin.ts:324`) so `POST /api/admin/tenants` (`admin.ts:343`) reads the originating `inquiries` row and pre-fills name, email and phone; the `'Converted'` status (`admin.ts:745`) then records the outcome of a real conversion instead of standing in for one. Sequenced last of the ten by dependency, not by importance. |

**Disposition summary: all 10 implemented in Phase 3** — one of them, FR-028, with a narrowed scope (re-stated as *server-generated report retrieval*). **None is de-scoped.**

Recommended Phase 3 sequencing, by dependency rather than by number: **FR-012 → FR-013** (billing dates must exist before overdue can be computed), then **FR-036 → FR-033** (correct the billing rule before optimising its inputs), then **FR-019 → FR-020 → FR-028** (one aggregate serves all three), then **FR-042 → FR-040** (constrain the allocation vocabulary before totalling over it), and finally **FR-006** (inquiry conversion depends on none of the others and touches the administrator’s month least often, so it is sequenced last rather than dropped).

### 5.1 Beyond the FR matrix — additional remediation carried into Phase 2 and Phase 3

Not every incompleteness the Phase 1 audit surfaced carries an FR number. At the group’s request, those that do
not are registered here rather than left scattered across notes, so that the Gap Register is the one place a
panelist has to read. Every row below is a defect already established in
`docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md`; none is a new finding, and each carries the phase that owns it
and a one-line remediation.

| # | Defect | Evidence | Phase | Remediation |
|---|---|---|---|---|
| A-1 | **`system_settings` is read by zero lines of code.** Six keys are seeded with correct values and `business_rule` tags, and nothing consumes them | `grep -rn "system_settings" backend/src` returns no matches; seed at `FULL_DATABASE_SCHEMA.sql:441`–`461` | **Phase 3** | Extract `settingsService.ts` and route every parameter read through it, giving the System Parameters store a code owner. |
| A-2 | **Water rate hardcoded** as the literal `200` in four places instead of read from settings | `admin.ts:910`, `admin.ts:1103`, `admin.ts:1243`, `tenant.ts:440` | **Phase 3** | Read `system_settings.water_rate_per_occupant` (seeded 200, `FULL_DATABASE_SCHEMA.sql:454`) through `settingsService.ts` and delete all four literals. |
| A-3 | **50% share divisor hardcoded** as `rentAmount / 2` at two call sites rather than derived once | `admin.ts:911`, `admin.ts:1102` | **Phase 3** | Compute the BR-035 share once inside `billingService.ts` from `system_settings.revenue_share_percent` (seeded 50, `FULL_DATABASE_SCHEMA.sql:459`). |
| A-4 | **Grace period hardcoded at 10 days**, contradicting the seeded 7 and BR-012 | `tenant.ts:453` writes `now + 10 days`; `system_settings.grace_period_days = 7` (`FULL_DATABASE_SCHEMA.sql:458`) | **Phase 3** | Correct `tenant.ts:453` to read the seeded value; delivered together with FR-013. |
| A-5 | **`fifty_percent_share` and `remitted_amount` are computed but never written**, so every `monthly_income_records` row stores `0.00` | Computed at `admin.ts:911` and `admin.ts:1102`–`:1104`; absent from both INSERTs (`admin.ts:942`–`:956`, `admin.ts:1112`–`:1128`) | **Phase 3** | Add both columns to the two INSERT payloads as the services are extracted, and backfill the existing rows alongside that change. |
| A-6 | **Foreign-key posture on the ledger tables** is 17 `ON DELETE CASCADE`, 4 `SET NULL`, 0 `RESTRICT` | Counted in `database/FULL_DATABASE_SCHEMA.sql`; for example `monthly_income_records.room_id … ON DELETE CASCADE` (`:257`) | **Phase 2** | Apply the proposed migration `005_ledger_fk_restrict.sql`, moving `room_id` / `tenant_profile_id` on `bills`, `payments` and `monthly_income_records` to `RESTRICT`. `RESTRICT` is a proposal and is never stated as current fact. |
| A-7 | **No transaction boundary exists.** `BEGIN`/`COMMIT` appears nowhere in `backend/src` | Repository-wide grep for transaction control returns nothing | **Phase 3** | Wrap the multi-table verification write and the expense header-plus-allocations write in a single transaction as the services are extracted. |
| A-8 | **Two payment endpoints are unauthenticated** | `GET /api/public/payments/mock-gateway` (`public.ts:201`); `POST /api/public/payments/mock-gateway/complete` (`public.ts:852`) | **RESOLVED (Phase 3)** | Both are closed wherever a gateway is configured; the webhook that replaced them is signature-verified. See the note under G-7 in `PHASE1_DFD_TRACEABILITY.md`. |
| A-9 | **The penthouse floor value.** `PH` is seeded `floor = 3`; the owner confirms it occupies its own rooftop level directly above floor 3 | `FULL_DATABASE_SCHEMA.sql:499` | **Phase 2** | Incremental migration sets `PH` to level 4. `database/FULL_DATABASE_SCHEMA.sql` is not edited in place. |
| A-10 | **`rooms.floor` reconciliation.** The seeded per-unit `floor` values were populated for development rather than surveyed | Same seed block as A-9 | **Phase 2** | Data-cleanup migration reconciles each unit’s `floor` to the owner’s survey, which is authoritative for the published per-floor tally. |

These ten are not FR failures and are therefore not counted in the 20 / 13 / 10 / 1 totals of §3. They are carried
here because a defect that has an owner and a phase is a plan, and a defect that has neither is a surprise.

---

## 6. Errata — Coverage of the Previously Submitted Matrix

**The traceability matrix in the previously submitted documentation stops at FR-034, while the defense package promises coverage through FR-044.** Ten requirements — FR-035 through FR-044 — were specified in `docs/03_REQUIREMENTS.md` but never traced to an implementation. This document closes that gap and supersedes the earlier matrix in full.

Five further corrections belong to this matrix and are carried on the Phase 1 errata sheet the group hands the panel, listed below under the identifiers that sheet assigns them so a panelist can look each one up there directly:

| # | Stale statement | Location | Correction |
|---|---|---|---|
| E-12 | Traceability matrix terminates at FR-034 | previously submitted matrix | Superseded. All 44 requirements, FR-001 – FR-044, are traced above. |
| E-11 | FR-033 described as "Monthly Expense Layout"; FR-034 described as "Expense Cluster Breakdown" | design-justification documents | `docs/03_REQUIREMENTS.md` is canonical: **FR-033 = Occupant Count Memory**, **FR-034 = Water Payment Validation**. The expense-layout meanings are stale and are not used anywhere in this matrix. |
| E-18 | "BR-048 2% Annual Escalation" | `DEEP_TECHNICAL...md:109` | **Misattribution of the identifier.** Canonical **BR-048 is Admin-Only Ledger Authorship**, cited correctly at `backend/src/config/rbac.ts:5-6` and traced here as FR-043. Whatever rate behaviour that sentence intended, BR-048 is not it. Whether the behaviour itself is in scope is a separate question, answered at **E-20**; both rows stand. |
| E-07 | "ON DELETE RESTRICT" described as current behaviour | `DEEP_TECHNICAL...md:41` | False today. The live schema carries **17 `ON DELETE CASCADE`, 4 `SET NULL`, 0 `RESTRICT`** — including `monthly_income_records.room_id ... ON DELETE CASCADE` (`FULL_DATABASE_SCHEMA.sql:257`), directly under the ledger this matrix traces. Phase 2 **proposes** migration `005_ledger_fk_restrict.sql` to move `bills`, `payments` and `monthly_income_records` `room_id` / `tenant_profile_id` to `RESTRICT`. Soft-delete already exists (`profiles.account_status`, `rooms.operational_status`), so `RESTRICT` is safe. It must never be stated as current fact. |
| E-20 | A 2% annual rate-escalation feature described as system behaviour | `DEEP_TECHNICAL...md:109`; `docs/08_OPEN_DECISIONS.md` §8 | **Formally out of scope** (owner decision, 2026-09-13). There is no automatic 2% increase and no advisory recommendation of one. The client edits a unit’s rate manually whenever she decides to change it, and the system’s obligation is to preserve that change, not to propose it. Architectural pillar **ARCH-004 is accordingly redefined as Rate Change History**, mapping to canonical **BR-003 Historical Preservation**: `admin.ts:185` writes a `room_price_history` row carrying previous price, new price, effective date, reason and the administrator who made the change. A repository-wide search of `docs/02_BUSINESS_RULES.md` for "2%", "annual", "escalat" and "adjust" returns zero matches, so removing the feature contradicts no canonical business rule. This row is separate from, and does not replace, the **E-18** misattribution. |

One naming note, for completeness rather than correction: the seven `CLAUDE_PIPELINE.md` "pillars" are renumbered **ARCH-001 … ARCH-007** and are architectural pillars, never business rules. `docs/02_BUSINESS_RULES.md` (BR-001 … BR-049) is the one canonical BR namespace, and every BR citation in this matrix draws from it.

---

## 7. Problem Alignment — What This Matrix Replaces

The baseline against which every row should be read is the legacy manual process documented in `PHYSICAL.png`: a **paper ledger/logbook** (D1), a **spreadsheet file carried on a USB stick** (D2), **verbal** rental and payment requests, **chat-message maintenance reports noted informally with no log**, and **verbal repairman assignment**.

Measured against that baseline, the 20 MAPPED rows are the substantive replacement: the paper logbook becomes `monthly_income_records` and `monthly_expense_entries` with void-not-delete correction and a complete `audit_logs` trail (FR-014, FR-017, FR-029, FR-037); the verbal maintenance request becomes a scoped, prioritised, photo-bearing ticket with a closure record and an accountable owner (FR-021 – FR-025); the USB spreadsheet becomes a role-guarded database that only the administrator may author (FR-043).

The 13 PARTIAL and 10 MISSING rows are equally part of the honest account. The system does not yet tell Mrs. Fe who is overdue (FR-013), does not yet bill LF and LB by the rule she actually applies (FR-036), and does not yet compute its own net position (FR-019). Those are the three that most directly touch her daily routine, and they are the first three in the Phase 3 sequence for that reason.

---

*Prepared for IT 124 Capstone Project 2 — Group 4, Bicol University College of Science. Phase 1 posture: **supersede and errata**. Every `file:line` citation in this document was verified against the working tree at the time of writing.*
