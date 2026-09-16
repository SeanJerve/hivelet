# Hivelet — Phase 1 Requirements Traceability Matrix (FR-001 – FR-044)

**Project:** Hivelet — Web-Based Boarding House Management & Financial Operations System
**Client:** Fe Galang Da Silva Boarding House, Legazpi City
**Course:** Bicol University College of Science — IT 124 Capstone Project 2, **Group 4**
**Adviser:** Dr. Jayvee Christopher Vibar
**Panel:** Dr. Aris J. Ordonez (Chair), Prof. Ryan A. Rodriguez, Prof. Laarni D. Pancho
**Team:** Sean Jerve Ll. Rebancos (System Architect / Full-Stack) · John Lloyd M. Cuario (Database Administrator / Data Analyst) · Eljohn Paulo C. Loterte (Frontend / UI-UX) · Victor Noel A. Napay (Backend / Integration) · Kiel Hedrix V. Relos (QA / Systems Analyst)

---

## 1. Purpose and Method

This matrix is the single verifiable bridge between the 44 functional requirements in `docs/03_REQUIREMENTS.md` and the code that is actually deployed. Every row was produced by reading the requirement text, then reading the route modules `backend/src/routes/admin.ts` (2,263 lines when this matrix was written; **3,033** on 2026-09-15), `tenant.ts`, `public.ts`, `auth.ts`, `health.ts`, the service modules in `backend/src/services/` (five at the time of writing; **eleven** as of 2026-09-15), the permission table `backend/src/config/rbac.ts`, and the **21** table definitions in `database/live_schema.csv`, which is the source of truth for this project — `database/FULL_DATABASE_SCHEMA.sql` has been wrong about the live schema more than once and is not to be trusted. Every `file:line` citation below was confirmed by opening that line **on the day it was written**, and that is now the weakest sentence in this document. Measured 2026-09-15: **6 of the 83 route citations still land on the route they name.** A line number is a promise about a file that grows, and nothing in a markdown document can notice when it breaks. **Follow a citation by searching for the route path or the identifier beside it, never by jumping to the line.** The file names, the route paths and the judgements are unaffected; only the line numbers rotted. See the box under §3.0.

The matrix is deliberately unflattering where the code is unfinished. A traceability matrix that reports only successes is not evidence; it is marketing. The MISSING rows — **3** as verified on 2026-09-15, 10 as originally written — are consolidated in the **Gap Register** (§5) with a disposition for each, so that no panelist can surface a gap on defense day that the group has not already surfaced first.

### 1.1 Architectural frame

All tier assignments refer to the project's canonical architecture:

> **Layered Client-Server Architecture Structured as a Modular Monolith with a Pluggable Payment Gateway Adapter**

| Tier | Name | Technology |
|---|---|---|
| Tier 1 | Presentation | Vue 3 + Vite + Pinia + vue-router + vite-plugin-pwa |
| Tier 2 | API & Security Perimeter | Node.js + Express + TypeScript; Helmet, CORS origin lock, JWT bearer auth, `requireRole` guards, centralized `ApiError` |
| Tier 3 | Domain Service Layer (Modular Monolith) | `backend/src/services/` |
| Tier 4 | Data Persistence | PostgreSQL 16 on Supabase — **21** tables, UUID surrogate PKs, RLS forced with zero policies, `service_role` containment |
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

Tier 3 contained **five real modules** when this matrix was written. It contains **eleven** on 2026-09-15, and the legend below was rebuilt that day by listing the directory rather than by amending the previous list. **Two entries had to move from planned to implemented: `billingService.ts` and `settingsService.ts` were marked *does not exist today* while sitting in the repository** — a claim a panelist can disprove with one `ls`, and the most direct kind of error a legend can carry.

| Marker | Component | Status |
|---|---|---|
| `[I]` | `authService.ts`, `auditService.ts`, `scopeService.ts`, `notificationService.ts`, `adyenService.ts`, `adyenWebhook.ts`, `adyenWebhookHandler.ts`, **`billingService.ts`**, **`settingsService.ts`**, `expenseReportExport.ts`, `incomeReportExport.ts` | **Implemented** — all eleven present in `backend/src/services/`, verified by directory listing 2026-09-15 |
| `[P3]` | `paymentService.ts`, `occupancyService.ts`, `ticketService.ts`, `inquiryService.ts`, `expenseService.ts`, `financialReportService.ts` | **Planned (Phase 3)** — six remain; none exists in the repository today |

A `[P3]` marker still appearing beside a service name in a row's Named Component column means *the logic is in the route handler and is destined for that service*, which is why a MAPPED row may name one. It has never meant the requirement is unimplemented.

The reason for the extraction backlog is stated plainly, re-measured 2026-09-15: **144 of 184 database calls (78%) sit inside route handlers**, and `backend/src/routes/admin.ts` alone is **3,033** lines. The figures this replaces were 131 of 164 (80%) and 2,263 lines; the ratio has improved by two points while the absolute count grew, which is what partial extraction against continued feature work looks like. Where a row's Named Component reads `admin.ts` rather than a service, that is the honest answer, not an omission.

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
| FR-006 | Inquiry Conversion | Tier 2 | `routes/admin.ts` → `inquiryService.ts` `[P3]` | `PATCH /api/admin/inquiries/:inquiryId` (`routes/admin.ts`) — writes `converted_tenant_id` | `inquiries`, `profiles` | **MAPPED** (verified 2026-09-15) |

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
| FR-012 | Due Dates | Tier 3 | `billingService.computeBillPeriod()` `[I]` | `POST /api/tenant/payments/checkout` (`routes/tenant.ts`) — writes `due_date: period.dueDate` and `grace_period_end_date`, both derived from the tenancy anniversary (BR-033) | `bills.due_date`, `bills.grace_period_end_date`, `room_assignments.anniversary_date`, `system_settings` | **MAPPED** (verified 2026-09-15) |
| FR-013 | Overdue Monitoring | Tier 3 | `billingService.isOverdue()` | `GET /api/tenant/my-bills`, `GET /api/admin/bills` — both return `effective_status` | `bills.status`, `bills.due_date`, `bills.grace_period_end_date` | **MAPPED** (closed 2026-09-14) |
| FR-014 | Manual Payments | Tier 2 / Tier 4 | `routes/admin.ts` → `paymentService.ts` `[P3]` | `POST /api/admin/income-records` (`admin.ts:1065`) | `monthly_income_records`, `payments`, `bills`, `rooms`, `room_assignments`, `audit_logs` | **MAPPED** |
| FR-015 | Online Payments | Tier 5 / Tier 2 | `adyenService.ts` `[I]` | `POST /api/tenant/payments/checkout` (`tenant.ts:379`); `POST /api/tenant/payments/adyen/verify-session` (`tenant.ts:514`); `POST /api/public/payments/adyen/webhook` (signature-verified; the only writer of an online payment) | `bills`, `payments`, `room_assignments`, `rooms`, `profiles`, `notifications` | **MAPPED** (verified 2026-09-15) |
| FR-016 | Payment Verification | Tier 2 / Tier 4 | `routes/admin.ts` → `paymentService.ts` `[P3]` | `PATCH /api/admin/payments/:paymentId/verify` (`admin.ts:836`); `GET /api/admin/payments` (`admin.ts:807`); `GET /api/tenant/my-payments` (`tenant.ts:94`) | `payments`, `bills`, `monthly_income_records`, `profiles`, `room_assignments`, `notifications`, `audit_logs` | **MAPPED** |
| FR-017 | Financial Corrections | Tier 2 / Tier 3 | `auditService.ts` `[I]` + `routes/admin.ts` | `PATCH /api/admin/income-records/:id` (`admin.ts:1211`); `DELETE /api/admin/income-records/:id` (`admin.ts:1290`); `PATCH /api/admin/expense-entries/:id` (`admin.ts:1434`); `DELETE /api/admin/expense-entries/:id` (`admin.ts:1496`) | `monthly_income_records`, `monthly_expense_entries`, `audit_logs` | **MAPPED** |
| FR-031 | Monthly Income Report Layout | Tier 1 / Tier 4 | `IncomeCollectionsView.vue` + `routes/admin.ts` → `financialReportService.ts` `[P3]` | `GET /api/admin/income-records` (`admin.ts:1013`) returns flat rows joined to `rooms(cluster_code)` | `monthly_income_records`, `rooms` | **PARTIAL** |
| FR-032 | Guided Monthly Payment Entry | Tier 2 / Tier 4 | `routes/admin.ts` → `billingService.ts` `[P3]` | `POST /api/admin/income-records` (`admin.ts:1065`) | `monthly_income_records`, `rooms`, `room_assignments` | **PARTIAL** |
| FR-033 | Occupant Count Memory | — | none | none (no previous-month lookup) | `monthly_income_records.occupants` (read by no prefill path) | **MISSING** |
| FR-034 | Water Payment Validation | Tier 1 / Tier 2 | `IncomeCollectionsView.vue` + `routes/admin.ts` → `settingsService.ts` `[P3]` | `POST /api/admin/income-records` (`admin.ts:1065`), which recomputes water at `admin.ts:1103` | `monthly_income_records.water_payment` | **PARTIAL** |
| FR-036 | Linda Fixed Billing Flow | Tier 3 | `billingService.computeWaterFee()` over `settingsService.getLindaFixedWaterCharge()` `[I]` | `POST /api/admin/income-records` (`routes/admin.ts`); `GET /api/public/rates` (`routes/public.ts`) — returns a `linda-fixed` water basis for LF and LB | `rooms.is_linda_unit`, `monthly_income_records.is_linda_billing` / `linda_water_charge` / `linda_electricity_charge`, `system_settings` | **PARTIAL** (two of three clauses; see §3.0) |

**FR-011 — what is incomplete.** Both read paths exist and the `bills` table is fully modelled. There is **no bill-authoring endpoint**: no `POST /api/admin/bills`, no `PATCH`, no `DELETE`, and the declared `BILL_MANAGE` permission (`rbac.ts:63`) guards no route. A bill comes into existence only as an incidental side effect of a tenant pressing checkout with no unpaid bill on file (`tenant.ts:445`). The administrator cannot originate the monthly rent-and-water bill that the requirement presumes.

**FR-012 — why MISSING.** `bills.due_date` is `NOT NULL DEFAULT CURRENT_DATE` in the schema (`FULL_DATABASE_SCHEMA.sql:221`), and exactly one line in the entire backend writes it: `due_date: new Date(Date.now() + 5 * 86400000)` at `tenant.ts:452` — five days after whatever moment the tenant clicked checkout, identical for every tenant and unrelated to anything. BR-010 requires the due date to derive from the move-in date; `room_assignments.start_date` and `anniversary_date` are never consulted. There is no administrative route to set or adjust a due date. The requirement asks for *individual* due dates; the system produces one arbitrary uniform offset.

**FR-013 — CLOSED 2026-09-14.** It was MISSING for a real reason: nothing ever transitioned a bill from `Due` to `Overdue`. No handler, no scheduled job, no trigger. The literal `'Overdue'` appeared once in `backend/src`, as a filter value it could never match, and `billingService.isOverdue()` had been written to answer exactly this question and was then called by **nothing at all**.

It is called now, by both `GET /api/tenant/my-bills` and `GET /api/admin/bills`, which return an `effective_status` field beside the stored `status`.

**Derived on read, not stored, and deliberately so.** Being overdue is a function of a date and the clock. A stored flag is wrong from the moment the clock passes it until some job catches up; a derived one is correct every time it is asked, needs no scheduler, and — because nothing is written — cannot corrupt a ledger row. `status` is left exactly as stored beside it: the two differing is the honest difference between what the database holds and what is true today, and collapsing them would make the stored column look maintained when it is not.

Verified against the live API with a probe bill dated 45 days past due, deleted afterwards: `status` `Due`, `effective_status` `Overdue`, and zero future-dated bills wrongly flagged.

The grace window it measures against was closed separately on 2026-09-13: `computeBillPeriod()` reads `grace_period_days` through `settingsService`, and migration `016` set it to **0** per OD-16, so `grace_period_end_date` equals `due_date`.

**FR-014 — how it works.** The handler resolves the unit by case-insensitive room number (`admin.ts:1084`), finds the active assignment (`admin.ts:1094`), inserts the ledger row (`admin.ts:1112`), then walks the tenant's unpaid bills oldest-first and settles each one it can fully cover, writing a matching `payments` row with `payment_source: 'On-Site Cash'` (`admin.ts:1157`) and posting any residue as an unlinked payment (`admin.ts:1180`). On-site in-person cash settlement is the **primary** settlement method, matching Mrs. Fe's daily routine; Adyen GCash is the optional digital alternative.

> **~~Disclosed defect against FR-014 and FR-032.~~ WITHDRAWN 2026-09-13.** This entry claimed both columns retain a `DEFAULT 0.00` because neither appears in either INSERT. They have no default: both are `GENERATED ALWAYS AS … STORED`, so PostgreSQL computes them on every write and **rejects** an INSERT or UPDATE that names them. Their absence from the payload is required, not an omission. All 937 live rows hold correct values. See `PHASE2_ERD_AND_DATA_DICTIONARY.md` section 6, which verifies this against all 937 live rows. FR-032 is **IMPLEMENTED**.

**FR-015 — what is incomplete, and what is not.** The group obtained and configured an **Adyen developer sandbox account** and implemented the GCash checkout flow against it through a decoupled adapter. `adyenService.isLiveConfigured()` (`adyenService.ts:42`) auto-selects sandbox or live credentials, and the sandbox path POSTs to `https://checkout-test.adyen.com/v71/sessions` (`adyenService.ts:61`) — **correct behaviour for a sandbox account, not a defect.** Commercial live processing additionally requires SEC/DTI business underwriting, which is outside the scope of an academic capstone. **This note held the row at PARTIAL on two caveats. Re-read 2026-09-15, one stands and one had dissolved, and the row is now MAPPED.** (a) **Stands:** `@adyen/api-library` is declared in `backend/package.json` and imported by nothing — the adapter calls the Checkout API over HTTP directly. That is an unused dependency to remove, not a gap in the requirement. (b) **Gone, and the route names in it never existed:** this caveat called the two gateway-return endpoints `/api/public/payments/mock-gateway` and `.../complete`. **There are zero occurrences of `mock-gateway` in `backend/src`.** The routes are `GET /api/public/payments/local-cashier` and `POST /api/public/payments/local-cashier/complete`, both behind `refuseWhenGatewayConfigured`, which returns **404 whenever Adyen is configured** — asserted by `npm run check:api`. The completion token is single-use and can only write `'Pending Verification'`, so even a forged call creates a row for a human to reject. *A citation that names a route by a name the system does not use sends a panelist looking for something that was never there, and they cannot tell that from a feature that is missing.* The administrator's sovereign verification gate is intact: per BR-017, gateway completion inserts the payment as `'Pending Verification'` (`adyenService.ts:212`) and never auto-settles a bill.

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
| FR-040 | Expense Category Cumulative Totals | Tier 3 | `expenseReportExport.ts` `[I]` | `GET /api/admin/reports/expenses.xlsx` (`routes/admin.ts`) | `monthly_expense_entries`, `fixed_expense_categories`, `property_areas` | **PARTIAL** (export only; **OD-07** open, so **BR-046** is not enforced) |
| FR-041 | Fixed Expense Category Dropdown | Tier 2 / Tier 4 | `routes/admin.ts` → `expenseService.ts` `[P3]` | `GET /api/admin/expense-categories` (`admin.ts:1531`) | `fixed_expense_categories` | **MAPPED** |
| FR-042 | Expense/Category Reconciliation Check | Tier 3 | `expenseReportExport.ts` `[I]` | `GET /api/admin/reports/expenses.xlsx` (`routes/admin.ts`) — prints `Reconciles (BR-047)` or `DOES NOT RECONCILE (BR-047)` with both sides' figures | `monthly_expense_entries`, `fixed_expense_categories`, `property_areas` | **MAPPED** (verified 2026-09-15) |

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
| FR-028 | Reports | Tier 3 | `incomeReportExport.ts` + `expenseReportExport.ts` `[I]` | `GET /api/admin/reports/income.xlsx`, `GET /api/admin/reports/expenses.xlsx` (`routes/admin.ts`) | `monthly_income_records`, `room_assignments`, `monthly_expense_entries`, `fixed_expense_categories`, `property_areas` | **PARTIAL** (server-generated export is live; no aggregate retrieval, and `REPORT_EXPORT` still guards no route) |
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

**Verified 2026-09-15.** Every status below was re-derived by reading live code, and the
table sums to 44. It did not before: the reading it replaces enumerated 43 requirements while
its total row claimed 44, because FR-013 was removed from the MISSING list on 2026-09-14 and
never added to any other. §3.0 sets out every move and the evidence for it.

| Status | Count | Share of 44 | FR IDs |
|---|---:|---:|---|
| **MAPPED** | **25** | 56.8% | FR-001, FR-002, FR-004, FR-005, FR-006, FR-007, FR-009, FR-010, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-021, FR-023, FR-024, FR-025, FR-027, FR-029, FR-037, FR-038, FR-041, FR-042, FR-043 |
| **PARTIAL** | **15** | 34.1% | FR-003, FR-008, FR-011, FR-018, FR-022, FR-026, FR-028, FR-030, FR-031, FR-032, FR-034, FR-035, FR-036, FR-039, FR-040 |
| **MISSING** | **3** | 6.8% | FR-019, FR-020, FR-033 |
| **FRONTEND-ONLY** | **1** | 2.3% | FR-044 |
| **Total** | **44** | 100% | — |

### 3.0 What this table read before, and what moved

*The rows are not silently rewritten. A register that edits its own history is not more
trustworthy for it, so the previous reading is kept here beside the evidence that changed it.*

| | MAPPED | PARTIAL | MISSING | FRONTEND-ONLY | Enumerated |
|---|---:|---:|---:|---:|---:|
| As written, through 2026-09-14 | 20 | 13 | 9 | 1 | **43** of 44 |
| Verified 2026-09-15 | **26** | **14** | **3** | **1** | **44** of 44 |
| Verified 2026-09-16 | **25** | **15** | **3** | **1** | **44** of 44 |

| Requirement | Was | Now | Evidence, read 2026-09-15 |
| :--- | :--- | :--- | :--- |
| **FR-013** Overdue Monitoring | listed nowhere | **MAPPED** | Closed 2026-09-14 and dropped out of the table instead of moving into it. `isOverdue()` is called by both bill endpoints and surfaced as `effective_status`. |
| **FR-015** Online Payments | PARTIAL in this table, **IMPLEMENTED** in its own row | **MAPPED** | The table disagreed with its own row; the row is right. `adyenService.ts`, three routes, signature-verified webhook. |
| **FR-006** Inquiry Conversion | MISSING | **MAPPED** | `patch.converted_tenant_id = parsed.data.convertedTenantId` in the inquiry PATCH handler — the column the row itself calls the link. |
| **FR-012** Due Dates | MISSING | **MAPPED** | `due_date: period.dueDate` from `computeBillPeriod(assignment.anniversary_date)` — derived from the tenancy anniversary (BR-033), not a constant. |
| **FR-036** Linda Fixed Billing | MISSING | **PARTIAL** | Two of the requirement's three clauses. `computeWaterFee()` calls `getLindaFixedWaterCharge()` and returns a `linda-fixed` basis, so the *fixed rate* and the *separation from the per-occupant model* are both real. **The third clause — *“remitted directly to Linda”* — is not.** `admin.ts` writes the charge as `water_payment: calcWater`, and `remitted_amount` is `GENERATED ALWAYS AS (rent_amount + water_payment)`, so on every new row the money BR-040 says is Linda's is counted into the owner's remittance. The 62 migrated rows do the opposite: `water_payment` 0, the figure in `linda_water_charge`. *Marked MAPPED here on 2026-09-15 and corrected on 2026-09-16 — the rate was checked and the destination was not.* |
| **FR-040** Expense Category Cumulative | MISSING | **PARTIAL** | `expenseReportExport.ts` keeps a running cumulative per category across the months of the year. **Not MAPPED, and §5 is why:** the cumulative exists in the Excel export only — not on screen, not persisted — and **OD-07** (does it reset at the calendar year?) is undecided, which is what leaves **BR-046** the one business rule still Not enforced. An earlier pass in this section read it *Implemented*; §5 engaged the reasoning and §5 is right. |
| **FR-042** Expense/Category Reconciliation | MISSING | **MAPPED** | The workbook prints `Reconciles (BR-047)` or `DOES NOT RECONCILE (BR-047)` with both sides' figures. |
| **FR-028** Reports | MISSING | **PARTIAL** | The export half is live and asserted — `GET /api/admin/reports/income.xlsx` and its expenses twin, opened by `npm run check:api` to confirm a real workbook. Server-side report *retrieval* remains absent. |
| **FR-033** Occupant Count Memory | MISSING | **MISSING** | Retested twice. `carriedOccupants = assign?.occupant_count` carries forward from the **tenancy**, not from the previous month's `monthly_income_records` row. Assignment-scoped, where FR-033 asks for month-scoped. It stands. |
| **FR-019** Cash Flow, **FR-020** Profitability | MISSING | **MISSING** | No route aggregates income, expenses or net position. `ANALYTICS_VIEW` still guards nothing. |

**The direction of the error is the point.** Every one of these moves is in the same direction:
the table was *more alarming than the code*. A defect register that goes out of date does not
drift randomly — it ages by overstating, because someone fixes the defect and nobody goes back
to the register. The reader then spends their attention on work already done.

#### The evidence blocks behind those moves

*These are the working notes from the retests, kept in full and in the order they were made,
including one correction to a correction. They sit below the table rather than inside it —
until 2026-09-15 they were interleaved between the table's rows, which split it in two and
left its last two rows orphaned from their header.*

> [!WARNING]
> **Measured 2026-09-15: 6 of this table's 83 route citations point at the route they name.**
>
> A citation like `` (`admin.ts:730`) `` is a promise about a line number in a file that grows.
> `admin.ts` is now past 2,900 lines; the route cited at 730 sits at 1065. Every insertion
> above a citation invalidates it silently, and nothing in a markdown file can notice - **the
> document was accurate when it was written.**
>
> Run `node backend/scripts/measure-doc-citations.mjs` for the current number and the full
> list. It is deliberately **not** one of the verification suites: a gate that is red on the
> day it ships teaches people to ignore red.
>
> **What *is* a suite, as of 2026-09-15, is `npm run check:matrix`.** It does not check the line
> numbers — it checks that this document agrees with itself: that all 44 requirements have a
> row, that every status is one §1.3 defines, that the Summary Counts table's counts, id lists,
> percentages and Total match the rows they describe, that §3.1's tier table totals the same,
> and that no row is marked MAPPED while claiming it has no backing route. Green on the day it
> shipped, which is the whole difference.
>
> **What is still reliable here: the file name, the route path, the table's judgements.** What
> is not: the line numbers. Follow a citation by searching for the route, not by jumping to the
> line.
>
> **The durable fix is not renumbering.** Renumbering 83 citations buys accuracy until the next
> commit. A file name and a route path are stable identifiers; a line number is a convenience
> that cannot survive a living codebase. Recorded rather than done - rewriting the table is a
> large mechanical edit and the call belongs to whoever owns this document.

> [!IMPORTANT]
> **Retested 2026-09-15: seven of the nine MISSING rows are stale. Two are real.**
>
> Each was checked against live code, not against this table. The headline figure a panel
> reads - *"MISSING 9, 20.5%"* - **understates the system by seven requirements.**
>
> | FR | Row says | Retested against the code |
> | :--- | :--- | :--- |
> | **FR-006** Inquiry Conversion | MISSING | **Implemented.** The Convert to Tenant action carries the prospect's details into onboarding, and `converted_tenant_id` is written by `PATCH /admin/inquiries/:id` (`admin.ts:1130`) - the column the row itself calls the link. |
> | **FR-012** Due Dates | MISSING, *"no route sets a due date"* | **A route does.** `tenant.ts:622` sets `due_date: period.dueDate` when a bill is raised, derived from the tenancy's own anniversary cycle - which is what "individual" means here. |
> | **FR-028** Reports | MISSING | **Partial, not missing.** The export half is live and asserted: `GET /api/admin/reports/income.xlsx` (`admin.ts:1483`) and its expenses twin, audited on each call, and `npm run check:api` opens the result to confirm it is a real workbook. "Live reports" remains a fair reading of the dashboards. |
> | **FR-033** Occupant Count Memory | MISSING | **Implemented, with a nuance worth keeping.** `admin.ts:1731` carries the occupant count forward **from the tenancy**, editable by the administrator - not literally from the previous month's row as FR-033 words it. The effect the rule asks for is delivered; the mechanism differs. |
> | **FR-036** Linda Fixed Billing | MISSING | **Implemented.** `linda_electricity_charge` and `linda_water_charge` are carried through `incomeReportExport.ts`, which renders a distinct LINDA section for the fixed charges remitted directly to her. |
> | **FR-040** Expense Category Cumulative | MISSING | **Implemented.** `expenseReportExport.ts:189` keeps a running cumulative per category across the months of the year (OD-07). |
> | **FR-042** Expense/Category Reconciliation | MISSING | **Implemented.** The workbook prints `Reconciles (BR-047)` or `DOES NOT RECONCILE (BR-047)` with both sides' figures (`expenseReportExport.ts:293`). |
> | **FR-019** Cash Flow | MISSING | **Still MISSING.** No endpoint aggregates income, expenses or net cash flow; there is no `financialReportService`. |
> | **FR-020** Profitability Analytics | MISSING | **Still MISSING.** Same absence, and `ANALYTICS_VIEW` still guards no route. |
>
> **Corrected counts: MISSING 2 (4.5%), not 9 (20.5%).**
>
> ---
>
> **Second pass, the PARTIAL rows and the per-requirement notes. Four more are stale, and one
> of my own corrections above was wrong.**
>
> | Note | What it says | Retested 2026-09-15 |
> | :--- | :--- | :--- |
> | **FR-034** | *"the backend multiplies by a literal `200` … a configured rate that nothing reads"* | **No longer true.** `computeWaterFee()` in `billingService.ts` reads the configured rate, and the comment beside it names the change: *"Previously `occupants * 200`, which could not be changed without a deploy."* |
> | **FR-036** | *"**Zero backend lines** read or write any of them … `occupants * 200` applies to every unit, LF and LB included"* | **No longer true.** `computeWaterFee()` calls `getLindaFixedWaterCharge(roomNumber)` first and returns a `linda-fixed` basis when it matches - the exact case BR-040 excludes from the per-occupant model. |
> | **FR-032** | *"the rent period arrives from the client … the 50% share and the remitted amount are computed and then discarded. **Zero of three** auto-computations persist"* | **Backwards now.** The period is derived by `computeRentPeriod()` from the stored anniversary (BR-033). The other two are `GENERATED ALWAYS` columns in the live database - `fifty_percent_share` as `rent_amount / 2.0` and `remitted_amount` as `rent_amount + water_payment` - which is *why* the handler does not write them. Three of three. |
> | **FR-015** | row reads **IMPLEMENTED**; the coverage table counts it under **PARTIAL** | **The table disagrees with its own row.** The row is right. Its note also still cites the `mock-gateway` endpoints as unauthenticated; both are `local-cashier` now and return 404 whenever a gateway is configured. |
>
> **And a correction to my own work, one section above.**
>
> The MISSING retest marked **FR-033 implemented**, citing the occupant count carried forward
> from the tenancy. **That was too generous, and this document had already answered it.** The
> FR-033 note considers exactly that evidence and rejects it: the carry-forward is
> *assignment-scoped*, and FR-033 asks for *month-scoped* pre-fill from the same tenant's
> previous month entry. Retested today: **nothing reads the prior month's
> `monthly_income_records.occupants`.** FR-033 stands as **MISSING**, and the corrected count
> above should read **MISSING 3, not 2**.
>
> *Recorded rather than quietly edited. A retest that overturns a register's judgement without
> engaging its stated reasoning is not a retest - and this document's reasoning was better than
> mine.*
>
> ---
>
> **Third pass. One more stale, three confirmed still accurate, one half-changed.**
>
> The mix matters: a retest that finds everything fixed is not a retest either.
>
> | Note | Retested 2026-09-15 |
> | :--- | :--- |
> | **FR-018** *"`expense_property_allocations.property_area` is an unconstrained `VARCHAR(100)` … no foreign key … no `CHECK` enumeration. A single typo silently creates a phantom property area"* | **Stale, and doubly so.** The live column is the enum `property_area_type` **and** carries `FOREIGN KEY (property_area) REFERENCES property_areas(code) ON UPDATE CASCADE ON DELETE RESTRICT`. A typo fails at the enum before it reaches the key. The risk this note says "would break the FR-042 reconciliation" is closed twice over. |
> | **FR-003** *"amenities have no persistence and no route"* | **Still true.** The string `amenit` appears nowhere in `backend/src`; the lists on the public site remain a hardcoded client constant. PARTIAL stands. |
> | **FR-002** *"eight permission constants are declared and unused"* | **Still true.** `BILL_MANAGE`, `PAYMENT_RECORD`, `PAYMENT_CORRECT`, `INCOME_LEDGER_WRITE`, `EXPENSE_LEDGER_WRITE`, `ANALYTICS_VIEW`, `REPORT_EXPORT`, `TICKET_CLOSE` - each guards **zero** routes today. |
> | **FR-011** *"there is no bill-authoring endpoint"* | **Still true.** `/admin/bills` is registered `router.get` only; no POST, PATCH or DELETE. |
> | **FR-008** *"`GET /api/admin/rooms` selects only `clusters` and `room_photos` … the data is written and then unreachable from the admin surface"* | **Half changed, and the half matters.** Since `b593166` that select also returns `room_assignments` with the occupant's profile, so *who lives in a unit* is now reachable. **The timeline is not:** the embedded select carries no `start_date` or `end_date`, and `room_price_history` is still read only inside the price-change write path - to attribute the row it has just written - never retrieved for display. The occupancy history and the price history remain unreachable. |
>
> *FR-008 is the shape worth noticing: a claim can be half true after a change, and saying
> "fixed" would be as wrong as leaving it. The precise statement is the useful one.*
>
> ---
>
> **Fourth pass: FR-022 and FR-026.**
>
> **FR-026 stands.** Its subject is the *prospect's* side - a prospect has no account and no
> public endpoint to reply on, so the inquiry thread is one-directional from them. The two
> inquiry fixes made on 2026-09-15 (`cabe216`, `09de591`) repaired the **administrator's** side,
> which had been failing entirely. Different half of the same feature; the note is untouched.
>
> **FR-022 was half right, and the wrong half has been fixed.**
>
> *"`GET /api/tenant/my-tickets` does not select `ticket_attachments`, so a tenant cannot see
> the photo they themselves attached"* - **true, and now closed.** The administrator's list had
> always selected attachments; the tenant's never did, so the only person who could not see the
> photo was the one who took it. Both the endpoint and the ticket card now return and render
> it.
>
> *"No upload endpoint exists … the Tier 5 Supabase Storage write is performed by the client"* -
> **true as far as it goes, and the live rows show two different mechanisms.** Of the two
> attachments in the database, one is a real `https://storage.hivelet.…` URL of 50 characters;
> the other is a **142,351-character `data:image/jpeg;base64,…` string stored in the column**,
> produced by the current client, which reads the file with `FileReader` and posts the data URL
> rather than uploading it. `ticketSchema` accepts `fileUrl: z.string().min(1)` with **no
> maximum** and up to ten attachments.
>
> The bound that exists is `express.json({ limit: '1mb' })`, which caps a request rather than a
> column - worth naming precisely rather than raising an alarm it does not deserve. Whether
> attachments should go to object storage is the same decision as the tenant profile photo:
> it costs storage, and it is Mrs. Da Silva's.
>
> ---
>
> **Fifth pass, the last three PARTIAL notes. One stands, two are half changed.**
>
> | Note | Retested 2026-09-15 |
> | :--- | :--- |
> | **FR-030** *"the `NetworkFirst` rule matches `/api/(public|health)` only … no authenticated resource is available offline"* | **Stands, unchanged.** The rule in `frontend/vite.config.ts` is still `/\/api\/(public|health)/i` with a 3-second timeout, a 30-entry cap and a one-hour expiry. Nothing authenticated is cached. |
> | **FR-035** *"`POST /api/admin/income-records` resolves the active assignment but selects only `id, tenant_profile_id`; it never reads `anniversary_date` or `deposit_amount`"* | **Half changed.** That select now reads `id, tenant_profile_id, anniversary_date, occupant_count`, and the anniversary is used by `computeRentPeriod()` to derive the rent period (BR-033). **`deposit_amount` is still neither selected nor reused.** One clause of two, where before it was none of two. |
> | **FR-039** *"each Property Area's monthly bottom total and each category's 'this month' total are computed by no route and stored in no column"* | **Half changed, in a way worth stating exactly.** Both are now computed **server-side**, in `expenseReportExport.ts`, for the Excel export - area bottom totals and the category summary, with the BR-047 reconciliation printed beside them. They are still **stored in no column**, and the figures **on screen** are still derived in `ExpensesLedgerView`. So: computed by the system of record when it exports, not when it renders. |
>
> *Two of these three moved from "not done" to "half done". Recording the half rather than the
> headline is the whole value of a retest - "computed server-side for the export but not for
> the screen, and persisted nowhere" is a sentence someone can act on. "Fixed" is not.* The rows above are left in place rather
> than rewritten, so a reader can see what the table said and what was found - a register that
> silently edits its own history is not more trustworthy for it.
>
> *This is the same decay found in every other register retested that day: they age by
> **overstating** what is wrong. The danger is not that a defect register goes out of date -
> everyone expects that - it is that it goes out of date in the alarming direction, so the
> reader spends their attention on work already done.*
### 3.1 Distribution by tier of primary ownership

| Tier | MAPPED | PARTIAL | MISSING | FRONTEND-ONLY |
|---|---:|---:|---:|---:|
| Tier 1 Presentation | 0 | 3 | 0 | 1 |
| Tier 2 API & Security Perimeter | 9 | 6 | 0 | 0 |
| Tier 3 Domain Service Layer | 8 | 3 | 0 | 0 |
| Tier 4 Data Persistence | 7 | 3 | 0 | 0 |
| Tier 5 External Integration Boundary | 1 | 0 | 0 | 0 |
| *No tier — requirement unimplemented* | 0 | 0 | 3 | 0 |
| **Total** | **25** | **15** | **3** | **1** |

**Single-owner allocation rule.** The table above counts each of the 44 requirements **exactly once**, under the tier that owns its *primary* logic today; a row whose Tier column names two tiers is allocated to one of them, never to both, which is why the tier lines sum to 25 / 15 / 3 / 1 and not to a larger number. The rule has to be stated because Tier 3 is where a panelist counting rows would otherwise disagree with the table. **FR-029 Audit Logs** is the standing exception: its Named Component is `auditService.ts`, but it is counted under Tier 4, because what that requirement delivers is the durable `audit_logs` record and `auditService` is the cross-cutting writer serving every process rather than the owner of this one row. FR-021, by the same rule, is counted under Tier 3, because `scopeService` performs the ownership check the requirement itself specifies.

**Tier 3 has nearly doubled, and that is the number here worth reading twice.** It owned **five** MAPPED rows when this matrix was written — FR-001, FR-010 (`authService`), FR-017 (`auditService`), FR-021 (`scopeService`), FR-027 (`notificationService`). It owns **eight** today: FR-012 and FR-013 (`billingService.computeBillPeriod()` and `.isOverdue()`) and FR-042 (`expenseReportExport`) have joined it, with FR-028, FR-036 and FR-040 as its three PARTIAL rows. **None of those four moved because a requirement changed.** They moved because `billingService.ts`, `settingsService.ts`, `expenseReportExport.ts` and `incomeReportExport.ts` were extracted from the route handlers and now exist. The extraction backlog is not a plan any more — it has started, and the tier table is where that shows up first.

The concentration of MAPPED rows in Tier 2 remains the numerical expression of the route-handler figure: **144 of 184 database calls (78%)** still sit inside route handlers, measured 2026-09-15. Phase 3 extraction moves further rows from the Tier 2 line to the Tier 3 line without changing a single status.

### 3.2 Reconciliation against the verified Phase 1 totals

The per-row assignments above sum to **25 / 15 / 3 / 1**, and to 44. No row was reclassified to force the total; each status was derived from the code first and the totals were checked afterwards. **The totals are checked, not asserted** — the reading this replaces asserted a total of 44 while enumerating 43, which is the arithmetic a panelist can do in their head from the FR ID column.

The three judgement calls a panelist is most likely to probe are stated openly. Note that all three are calls that hold a row **down**, not up:

1. **FR-033 is MISSING, not PARTIAL,** even though the administrator does see an occupant count pre-filled. The carry-forward is `assign?.occupant_count` — from the **tenancy**, which is assignment-scoped. FR-033 asks for the figure from *the same tenant's previous month entry*, which is month-scoped, and nothing reads `monthly_income_records.occupants` of a prior month. This row was marked implemented once during the 2026-09-15 retests and put back; the distinction is the requirement, not a technicality.
2. **FR-040 is PARTIAL, not MAPPED,** even though a running cumulative demonstrably appears in the expenses workbook. It exists in the export only — not on screen and not persisted — and **OD-07**, whether it resets at the calendar year, is still open. That decision is what chooses between a stored column and a computed window, and until it is made **BR-046** cannot be enforced.
3. **FR-044 is FRONTEND-ONLY, not MAPPED,** even though the feature demonstrably works in the browser. The status describes where the behaviour lives, not whether it satisfies the user.

*FR-012, FR-013 and FR-036 were the three calls stated here until 2026-09-15 — and FR-036 is back among the PARTIAL rows, for a reason the original note did not give, each held down to MISSING on the same principle — schema without a code path is not delivery. All three now have the code path, and §3.0 carries the evidence. The principle did not change; the code did.*

---

## 4. Systemic Findings Behind the Gaps

Four defects explain most of the PARTIAL and MISSING rows. All are Phase 2 and Phase 3 work, not Phase 1 fixes, and are recorded here so that the matrix reads as a diagnosis rather than a list of accidents.

| # | Finding | Evidence | Rows affected |
|---|---|---|---|
| 1 | ~~**`system_settings` is seeded correctly and read by zero lines of backend code.**~~ **CLOSED 2026-09-13.** **CLOSED 2026-09-13.** `services/settingsService.ts` is a typed cached reader over the table and `services/billingService.ts` applies the values through it. No hardcoded rate or grace window remains in `backend/src`. | `services/settingsService.ts`, `services/billingService.ts` | FR-013, FR-034, FR-036 |
| 2 | ~~**Two derived financial columns are computed and then dropped.**~~ **WITHDRAWN 2026-09-13 — never a defect.** Both are `GENERATED ALWAYS AS … STORED`; PostgreSQL maintains them and refuses any write naming them, so their absence from the INSERTs is required. All 937 rows are correct. See `PHASE2_ERD_AND_DATA_DICTIONARY.md` section 6, which verifies this against all 937 live rows. Per BR-035 the 50% share is exactly half of the row's Rent Amount, system-computed and never entered manually, with water, GBG fee and deposit excluded from it; per BR-038 the Remitted Amount is Rent Amount + Water Payment. Both figures are carried over from Column 6 of the landlady's existing source spreadsheet and are retained so that the digital ledger reconciles line-for-line with her historical records. | `admin.ts:1102`–`admin.ts:1128` | FR-031, FR-032 |
| 3 | **No aggregation layer exists.** No endpoint returns a subtotal, a total, a rollforward or a reconciliation. Every derived figure is computed in the browser. | No aggregate route in any of the five route modules; `ANALYTICS_VIEW` (`rbac.ts:75`) and `REPORT_EXPORT` (`rbac.ts:76`) guard nothing | FR-019, FR-020, FR-028, FR-031, FR-039, FR-040, FR-042, FR-044 |
| 4 | ~~**No transaction boundary exists.**~~ **CLOSED 2026-09-14.** Both multi-table writes the row named now run inside database functions, each of which executes in one implicit transaction: `replace_expense_allocations()` (migration `010`) for the expense header plus allocations, and `settle_verified_payment()` (migration `018`) for the payment, its bill and the income row. Proved by rejecting the ledger row mid-call - the payment stayed Pending Verification and the bill stayed Due. supabase-js still cannot open a transaction, so this is a pattern to follow rather than a capability gained. | `database/migrations/018_atomic_payment_settlement.sql` | — |

**No performance figure is asserted anywhere in this matrix.** Claims of "256MB RAM", "sub-50ms response" and "100% data consistency" that appear in previously submitted documents are unsubstantiated; they are omitted here rather than repeated, and any comparable property is stated as a design target when it is stated at all.

---

## 5. Gap Register — The 10 Requirements Recorded MISSING in Phase 1

> **Status as at 2026-09-15, verified against live code. Six of these ten are no longer
> missing, and only FR-013 below is struck through to say so.** This heading and the ten
> rows under it are kept as the Phase 1 record; read them with this box.
>
> | FR | Row says | Verified 2026-09-15 |
> | :--- | :--- | :--- |
> | **FR-012** Due Dates | bills carry an arbitrary 5-day offset (`tenant.ts:452`) | **Done.** Zero 5-day offsets remain in `backend/src`; both bill-creating paths derive the date through `billingService.computeBillPeriod()` (7 call sites). BR-010 Enforced. |
> | **FR-013** Overdue Monitoring | already struck **DONE 2026-09-14** | **Done.** Unchanged. |
> | **FR-033** Occupant Count Memory | the count is retyped every month | **Still missing — this cell read *Done* until 2026-09-15 and was wrong.** What exists is `carriedOccupants = assign?.occupant_count`, a carry-forward from the **tenancy** (BR-034), which is assignment-scoped. FR-033 asks for the same tenant's **previous month entry**, and nothing reads a prior `monthly_income_records.occupants`. The register's own FR-033 row had already considered this evidence and rejected it; the retest that marked it Done had not read that reasoning. |
> | **FR-036** Linda Fixed Billing | LF and LB billed occupants × 200 | **Done.** Both take their fixed charges from `system_settings` through `billingService`; live values LF 400, LB 200. BR-040. |
> | **FR-042** Reconciliation Check | nothing proves the expense ledger balances | **Done.** Trigger `trg_update_expense_total` makes the two sides one figure; migration `019` closed the creation hole. Live: 0 of 1,262 entries disagree with their allocations, grand total ₱5,823,586.47. BR-047 Enforced. The row's supporting claim that `property_area` is free text is also stale — it is the enum `property_area_type`. |
> | **FR-006** Inquiry Conversion | prospect details are retyped at onboarding | **Done.** The carry-over existed; what was missing was the write-back, and `inquiries.converted_tenant_id` is now written. BR-009 Enforced. |
> | **FR-040** Cumulative Totals | year-to-date view is lost | **Partial.** The Excel export carries a running cumulative and labels it. What is still open is **OD-07** — whether it resets at the calendar year — which decides stored column versus computed window. This is the one genuinely client-gated item, and **BR-046** is the one rule still Not enforced. |
> | **FR-028** Reports | no server-side report existence | **Partial, and satisfied in the narrowed sense this row proposed.** `GET /api/admin/reports/income.xlsx` and `/expenses.xlsx` are server-generated report retrieval (BR-049). No other server-side reporting exists. |
> | **FR-019** Cash Flow | no server-side net position | **Still missing.** No `financialReportService`; every figure is still browser arithmetic. |
> | **FR-020** Profitability Analytics | trend views not reproducible server-side | **Still missing.** Same cause as FR-019. |
>
> So the honest count today is **three missing, two partial, five done** — not ten missing.
>
> *That line read **two missing … six done** until 2026-09-15, counting FR-033 as done. Both
> this box and §3.0 made the same mistake about the same row on the same day, in two places
> 150 lines apart, and only one of them was corrected at the time. **Two registers disagreeing
> about one fact is worse than either being wrong alone** — a reader who finds the
> disagreement cannot tell which side to trust, and a reader who finds only one side never
> learns there was a question. They are now corrected together.*
> Recorded here rather than by rewriting the rows, because the rows are the Phase 1
> artifact and their consequence statements are what the sequencing argument below rests on.

This is the section that prevents a panelist from discovering a gap on stage. Each entry states the gap, its business consequence against the legacy manual baseline, and a **single confirmed disposition.** The owner confirmed on 2026-09-13 that **all ten are implemented in Phase 3**; none is de-scoped. The group's position on each is fixed before the defense, not improvised during it.

| # | FR | Canonical Name | Consequence if left as-is | Confirmed Disposition |
|---|---|---|---|---|
| 1 | **FR-012** | Due Dates | Every bill carries the same arbitrary 5-day offset from checkout time (`tenant.ts:452`). BR-010 (due date derives from move-in) and BR-011 (overdue begins the day after the due date) cannot be evaluated at all. | **Implement in Phase 3.** Highest priority of the ten. Derive `due_date` from `room_assignments.start_date` inside the extracted `billingService.ts`. Blocks FR-011 and FR-013. |
| 2 | ~~**FR-013** Overdue Monitoring~~ | **DONE 2026-09-14.** Status is computed on read, exactly as this row proposed — `billingService.isOverdue()` against `due_date` and the stored grace window, surfaced as `effective_status` on both bill endpoints. The hardcoded 10-day window was corrected separately and `grace_period_days` is now 0 per OD-16. | — |
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

### 5.0 The authorization perimeter, swept end to end on 2026-09-16

*This section exists because §5.1 row **A-17** records a privilege escalation, and a reader who
finds one is entitled to ask what else was checked. The answer is the whole perimeter, and
everything below was read in the code rather than taken from a design document.*

| Question a panel will ask | Answer, verified |
| :--- | :--- |
| Does every administrator and tenant route carry a permission guard? | **Yes.** Every `/admin/*` and `/tenant/*` route declares `requirePermission`, on top of the router-level `router.use('/admin', requireAuth, requireAdmin)` and `router.use('/tenant', requireAuth)`. The only routes with no permission guard are the six auth endpoints and three public payment endpoints, each checked individually below. |
| Are the unguarded routes safe? | **Yes.** `POST /auth/login` and `POST /auth/register` are public because they must be. `GET`/`PATCH /auth/me`, `POST /auth/change-password` and `POST /auth/logout` all carry `requireAuth`. The two `local-cashier` routes return **404 whenever a gateway is configured** and can only write `Pending Verification`; the Adyen webhook is HMAC-verified and asserted by `check:adyen`. |
| Can a request set its own role anywhere? | **No, since 2026-09-16.** `POST /api/auth/register` could until that date — see **A-17**. No request schema in `backend/src` accepts a `role` field today. Tenant onboarding hardcodes `role: 'tenant'`; the two `account_status` schemas are admin-guarded and constrained to an enum of two values. |
| Can a tenant edit a privileged column on their own profile? | **No.** `PATCH /auth/me` passes through `updateOwnProfile`, which filters against an explicit five-name allowlist — `phone_number`, `emergency_contact_name`, `emergency_contact_phone`, `occupation`, `facebook_url`. `role`, `account_status`, `email` and `password_hash` are not on it. **This is the pattern `register()` was missing:** the codebase already knew the right shape in one place and not the other. |
| Can a token carry a forged or stale role? | **No.** `requireAuth` takes only the **subject** from the JWT and calls `resolveAuthUser(payload.sub)`, which re-reads `role` and `account_status` **from the database on every single request**, throwing if the account is gone or not `active`. A deactivated tenant loses access on their next call; a role cannot be asserted by the token. |
| Is brute force resisted? | **Yes.** `authService` maintains `failed_login_count` and honours `locked_until`, refusing a locked account with the remaining minutes, and clears both on a successful sign-in. |
| Can one tenant reach another tenant's data? | **No.** All **15** `/tenant/*` routes scope to the caller. The three that take an id from the path are the ones that matter, and each verifies ownership explicitly: both ticket-thread routes load the ticket and compare `tenant_profile_id` to the caller before touching `ticket_messages`, and `markAsRead` filters on `id` **and** `recipient_profile_id` together. **The ticket routes answer `404 Ticket not found`, not `403`** — so a non-owner is not told the ticket exists, and the id space cannot be enumerated for an oracle. |
| Can an error response leak the database? | **No.** `errorHandler` replaces the message on any status ≥ 500 with a flat *“Internal server error.”*, precisely so a Postgres string cannot escape; every 401 and 403 is audited on the way out. Checked further: **no 4xx message anywhere in `backend/src` is built from a database error string**, so the careful 500 handling is not undone by a 400 carrying the same text. Stack traces are gated on `NODE_ENV`, whose default was moved from `development` to **`production`** on 2026-09-16 so that an environment which forgets to set it fails safe — commit `30a805b`. |
| What does an unauthenticated visitor actually receive? | **Rooms and nothing else — verified by calling it, not by reading the select.** `GET /api/public/rooms` returned 33 rooms whose keys are `id, room_number, floor, cluster_code, room_type, description, capacity, current_price, operational_status, visibility_status, available_from, is_linda_unit, room_photos`. **No tenant name, phone, email, assignment or occupant count appears in any of them**, and all 33 came back `Published`, so no hidden unit leaked. |
| Can a malformed amount poison the ledger? | **No.** Every money field in every request schema uses the shared `money` primitive — `.finite()`, `≥ 0`, `≤ 99,999,999.99`, two decimals. That matters more than it reads: **PostgreSQL sorts `NaN` above every other numeric**, so a `CHECK (rent_amount >= 0)` accepts `'NaN'` — and `fifty_percent_share` and `remitted_amount` are GENERATED from it, so one malformed request would turn every `SUM()` over the ledger into NaN. `z.number()` alone rejects NaN but accepts `Infinity`, which has the same property. |
| What holds the database itself? | RLS is **enabled and forced on all 21 tables with zero policies**, and `anon` / `authenticated` hold no privileges on any of them. Express with the `service_role` key is the only path in. |

**One latent item is open and is recorded as A-14, not here:** `public.current_user_role()` is
`SECURITY DEFINER` and returns `'admin'` when it cannot identify the caller, which is always.
It is unreachable today — no policies call it and the public roles cannot execute it — and it
must be fixed before the first RLS policy is ever written.

### 5.1 Beyond the FR matrix — additional remediation carried into Phase 2 and Phase 3

Not every incompleteness the Phase 1 audit surfaced carries an FR number. At the group’s request, those that do
not are registered here rather than left scattered across notes, so that the Gap Register is the one place a
panelist has to read. Every row below is a defect already established in
`docs/claude_pipeline/PHASE1_LOCKED_DECISIONS.md`; none is a new finding, and each carries the phase that owns it
and a one-line remediation.

> **Status as at 2026-09-15, verified against live code and the live catalogue.** A-1, A-5 and
> A-7 are struck below. **All seven of the then-remaining rows are also closed or superseded**, and
> the rows are kept as the Phase 1 record rather than rewritten:
>
> | Row | Verified 2026-09-15 |
> | :--- | :--- |
> | **A-2** water rate hardcoded as `200` in four places | **Closed.** Zero occurrences of `occupants * 200` remain in `backend/src`; the rate comes from `system_settings` through `billingService.computeWaterFee()`. |
> | **A-3** share divisor hardcoded as `rentAmount / 2` | **Closed.** The two write sites are gone. The column is `GENERATED ALWAYS AS (rent_amount / 2.0) STORED` and cannot be written at all. One export-only fallback remains at `incomeReportExport.ts:290`. |
> | **A-4** grace period hardcoded at 10 days | **Closed, and the premise moved.** It is not 10 and it is not the seeded 7: **OD-16** settled that this property grants no grace period, and migration `016` set `grace_period_days` to **0**. `billingService` reads it. |
> | **A-6** foreign keys 17 CASCADE / 4 SET NULL / 0 RESTRICT | **Closed by `005`, and recounted.** Live: **8 RESTRICT / 11 CASCADE / 18 NO ACTION / 1 SET NULL**. The eighth RESTRICT is `clusters_expense_area_fkey`, added by `012` after the earlier counts were taken. |
> | **A-8** two unauthenticated payment endpoints | **Superseded — the route names in this row no longer exist.** Zero occurrences of `mock-gateway`; they are `/public/payments/local-cashier` and `/…/complete`, and both return **404 whenever Adyen is configured**, asserted by `npm run check:api`. |
> | **A-9** `PH` seeded `floor = 3` | **Closed by `007`.** Live: `PH` is on floor **4**. |
> | **A-10** `rooms.floor` contradicts the survey | **Closed by `015`.** Live distribution is **11 / 11 / 10 / 1** across 33 rooms, matching the owner's survey exactly. |

| # | Defect | Evidence | Phase | Remediation |
|---|---|---|---|---|
| A-1 | ~~`system_settings` is read by zero lines of code~~ **CLOSED** | `services/settingsService.ts` owns it; `billingService.ts` consumes it | **Done (2026-09-13)** | `settingsService.ts` was built and every parameter read routes through it. |
| A-2 | **Water rate hardcoded** as the literal `200` in four places instead of read from settings | `admin.ts:910`, `admin.ts:1103`, `admin.ts:1243`, `tenant.ts:440` | **Phase 3** | Read `system_settings.water_rate_per_occupant` (seeded 200, `FULL_DATABASE_SCHEMA.sql:454`) through `settingsService.ts` and delete all four literals. |
| A-3 | **50% share divisor hardcoded** as `rentAmount / 2` at two call sites rather than derived once | `admin.ts:911`, `admin.ts:1102` | **Phase 3** | Compute the BR-035 share once inside `billingService.ts` from `system_settings.revenue_share_percent` (seeded 50, `FULL_DATABASE_SCHEMA.sql:459`). |
| A-4 | **Grace period hardcoded at 10 days**, contradicting the seeded 7 and BR-012 | `tenant.ts:453` writes `now + 10 days`; `system_settings.grace_period_days = 7` (`FULL_DATABASE_SCHEMA.sql:458`) | **Phase 3** | Correct `tenant.ts:453` to read the seeded value; delivered together with FR-013. |
| A-5 | ~~`fifty_percent_share` and `remitted_amount` are computed but never written~~ **WITHDRAWN** | `is_generated = 'ALWAYS'` for both in `information_schema.columns`; all 937 rows correct | **Withdrawn** | Nothing to do, and the remediation this row proposed — adding both columns to the INSERT payloads — **would have broken every write**, because PostgreSQL rejects an INSERT naming a generated column. See `PHASE2_ERD_AND_DATA_DICTIONARY.md` section 6, which verifies this against all 937 live rows. |
| A-6 | **Foreign-key posture on the ledger tables** is 17 `ON DELETE CASCADE`, 4 `SET NULL`, 0 `RESTRICT` | Counted in `database/FULL_DATABASE_SCHEMA.sql`; for example `monthly_income_records.room_id … ON DELETE CASCADE` (`:257`) | **Phase 2** | Apply the proposed migration `005_ledger_fk_restrict.sql`, moving `room_id` / `tenant_profile_id` on `bills`, `payments` and `monthly_income_records` to `RESTRICT`. `RESTRICT` is a proposal and is never stated as current fact. |
| A-7 | ~~No transaction boundary exists~~ **CLOSED** | `settle_verified_payment()` and `replace_expense_allocations()`, both plpgsql, both one implicit transaction | **Done (2026-09-14)** | Done exactly as this row proposed - the multi-table verification write and the expense header-plus-allocations write are each wrapped in a single transaction. |
| A-8 | **Two payment endpoints are unauthenticated** | `GET /api/public/payments/mock-gateway` (`public.ts:201`); `POST /api/public/payments/mock-gateway/complete` (`public.ts:852`) | **RESOLVED (Phase 3)** | Both are closed wherever a gateway is configured; the webhook that replaced them is signature-verified. See the note under G-7 in `PHASE1_DFD_TRACEABILITY.md`. |
| A-9 | **The penthouse floor value.** `PH` is seeded `floor = 3`; the owner confirms it occupies its own rooftop level directly above floor 3 | `FULL_DATABASE_SCHEMA.sql:499` | **Phase 2** | Incremental migration sets `PH` to level 4. `database/FULL_DATABASE_SCHEMA.sql` is not edited in place. |
| A-10 | **`rooms.floor` reconciliation.** The seeded per-unit `floor` values were populated for development rather than surveyed | Same seed block as A-9 | **Phase 2** | Data-cleanup migration reconciles each unit’s `floor` to the owner’s survey, which is authoritative for the published per-floor tally. |

| **A-11** | **`GET /api/admin/bills` is called by nothing.** The endpoint exists, applies `isOverdue()` and returns `effective_status` per FR-013 — and no file in `frontend/src` requests it. **The administrator has no bills screen at all.** The overdue overlay built for her is computed on every call she never makes; the tenant sees their own on `/tenant/my-bills`. | Zero occurrences of `/admin/bills` in `frontend/src`, verified 2026-09-16 | **Phase 3** | Add an administrator bills view, or state plainly that outstanding balances are read from the income ledger and retire the endpoint. FR-013 is satisfied as written — *“identify overdue payments and grace-period status”* — but nobody should read that status as “she is told”. |
| **A-12** | **`POST /api/auth/change-password` is called by nothing, and no password-change UI exists.** Tenants are onboarded with the shared literal `'Hivelet@Tenant2026'`. There is no screen, anywhere in the product, by which a resident or the administrator can change a password. | Zero matches for `change-password`, `newPassword` or `currentPassword` in `frontend/src`, verified 2026-09-16 | **Phase 3 — highest of these rows** | Add a change-password form for both roles against the existing endpoint. Until then every resident account shares one password that cannot be changed from the product. |
| **A-13** | **Five endpoints are superseded rather than unplugged**, recorded so nobody restores them by mistake: `PATCH /admin/tenants/:profileId/status` (the view uses the generic `PATCH /admin/tenants/:id`), `PATCH /admin/tickets/:ticketId/close` (the dispatch board uses the generic ticket PATCH, which stamps `resolved_at` and `closed_at` correctly — the dead route sets `status: 'Resolved'` while stamping `closed_at`, conflating two states), `GET /public/clusters` and `GET /public/rooms/:roomId` (the public site calls only `GET /public/rooms`), and `POST /admin/rooms/:roomId/photo` (AdminEditUnitModal sends a photo **URL** through the generic unit PATCH — there is no file upload anywhere in the product, and object storage is a Phase 3 item). | Route census against `frontend/src`, 2026-09-16 | **Phase 3** | Delete the four, or wire them. Leaving an endpoint that nothing calls is an untested surface that still answers. |

| **A-14** | **`public.current_user_role()` is `SECURITY DEFINER` and fails OPEN to `admin`.** It reads `profiles.role WHERE auth_user_id = auth.uid()`; **`auth_user_id` is NULL on all 45 profiles**, so the lookup always finds nothing, and the function then executes `IF u_role IS NULL THEN RETURN 'admin'` — its own comment calls this *"Default to 'admin' in local development environment"*, in the production database. **Current exposure is nil and this row must not be read as a live hole:** there are **0 RLS policies**, nothing in `backend/src` calls it, and EXECUTE is granted only to `postgres` and `service_role`, not to `anon` or `authenticated`. The risk is entirely prospective, and precise: the obvious way to “turn RLS on properly” later is to write policies calling exactly this helper, and every one of them would grant **admin to every caller**. | `pg_get_functiondef`, `pg_policies`, `information_schema.routine_privileges`, verified 2026-09-16 | **Phase 2 — before any RLS policy is written** | Either drop the function, or make it fail closed: return `NULL` and let the policy deny. Leave `auth_user_id` unpopulated — it is a leftover of a Supabase-Auth design this system replaced with backend-enforced JWT, and populating it would make the fail-open path live. |
| **A-15** | **Columns the application never touches.** A census of every live column against `backend/src`, 2026-09-16. Three groups. **Written elsewhere, correctly absent from the code:** `room_price_history.previous_price` / `new_price` / `effective_date` (trigger `trg_record_room_price_change`) and `expense_property_allocations.expense_entry_id` (function `create_expense_entry_with_allocations`) — both verified present in the live catalogue. **Genuinely unused:** `profiles.auth_user_id` (see A-14), `clusters.expense_area` (a live foreign key into `property_areas` that no code reads, so cluster-to-expense-area routing is schema only), `monthly_income_records.is_linda_billing` (never written, never read — 62 migrated rows carry it), `system_settings.value_type` / `business_rule` / `updated_by` (documentation columns, and `updated_by` has no write path because nothing updates a setting — see D11), `property_areas.notes`, `ticket_attachments.uploaded_at` (default only). **Was unused, now read:** `monthly_income_records.linda_water_charge`, which held ₱18,600 that no report displayed until 2026-09-16. | Column census against `information_schema.columns`, 2026-09-16 | **Phase 3** | None of these is urgent. They are recorded because an unused column is the quiet half of the same question A-11 to A-13 ask about routes, and one of them turned out to be hiding real money. |

| **A-16** | **Seven receipts in the owner's own books need her word before anyone edits them.** A full arithmetic and plausibility sweep of the live ledger on 2026-09-16 — 937 income rows, 1,262 expense entries — found these and nothing else. **Two dates that cannot be right:** `OR#4839` is dated **1900-01-17**, the Excel epoch, so the source cell never parsed (its year/month also disagree with its own rent period); `INVOICE#5120` is dated **2027-02-26**, a year in the future, against a 2026 rent period. **Three rent periods that end the day before they start** — `OR#4757` (2024-08-03 to 2024-08-02), `OR#4775`, `OR#4872` — a migration off-by-one, where the end looks one month short. **Two receipt numbers used twice:** `OR#4774` across two rooms for one tenant but twelve days apart, and **`OR#4813` against two different tenants on the same day** — Ron Juliene Dominguino (2a, ₱8,000) and M. Juselle Escuro (3a, ₱9,000). Two people cannot share one official receipt. | `npm run check:ledger`, which pins all seven and prints them on every run | **Owner's decision, then Phase 2** | **Do not infer these.** Correcting a receipt means knowing what it should say, which is Mrs. Da Silva's to tell. Nothing has been written to any of them. |
| | **What the same sweep found clean, which is the larger half of the result.** No negative amount anywhere in income, expenses or payments. No expense dated in the future or before 2020. No payment marked Verified without a verifier. **No room with two active tenancies** — the invariant that would corrupt every occupancy figure. And on all 937 rows, `remitted_amount` equals `rent_amount + water_payment` and `fifty_percent_share` equals half the rent, to the centavo. | — | — | The 254 rows whose `date_paid` falls outside their own `year`/`month` were checked and are **legitimate**: 218 paid the following month, 18 paid in advance, and the larger gaps are an organisation paying several months up front and one lump settlement of four months' arrears under a single receipt. |

| **A-17** | **`POST /api/auth/register` let the caller choose their own role, including `admin`. FIXED 2026-09-16, commit `8b09f80`.** The route is public — no `requireAuth`, no `requirePermission`, correctly so, it is how someone signs up. Its schema accepted `role: z.string().optional()`, and `authService.register()` wrote that value straight into the insert as `role: data.role || 'tenant'`. `user_role_type` accepts `'admin'`. An unauthenticated request carrying `"role": "admin"` therefore created an administrator and returned a signed token for it — reaching all 937 income rows, all 45 profiles with their phone numbers and emergency contacts, the ledger edit and void paths, and the payment verification gate. **It was never used:** exactly one admin exists, created 2026-07-30 in the original seed, and no account of any role has been created since 2026-08-27. | `auth.ts` route and schema, `authService.ts` insert, `pg_enum`, and a role census of `profiles` — all read 2026-09-16 | **Closed** | `role` removed from the schema; `register()` always inserts `'tenant'`. Zod strips unknown keys, so a payload still carrying `role` is ignored rather than rejected. Nothing legitimate changed — the sign-up form has only ever sent email, password, fullName and phoneNumber. Guarded by two new `check:api` assertions, 53 → 55, each made to fire by putting half the hole back. |

| **A-18** | **The public sign-in page shipped the administrator's password and every resident's room number. Code fixed 2026-09-16, commit `5001b0f` — but the credential still needs rotating.** The login page carried a *"Quick Demo Access — 1-Click Sign In"* panel of 34 accounts, each with a `password` field, and the button performed a real login. **Verified in the built output, not inferred:** `dist/assets/index-*.js` held `Hivelet@Admin2026` once and `Hivelet@Tenant2026` 33 times. The same panel published the **full name, email address and room number of all 33 real residents** — the half that a password change does not fix, against **BR-024 Tenant Privacy**, recorded Enforced. **The fix does not un-publish it:** the password entered tracked source on **2026-08-25** in `788f321` and has been in the history of `github.com/SeanJerve/hivelet` since — the same window this project already records as a public-repository exposure for the JWT secret (`backend/src/config/env.ts`, 2026-08-25 to 2026-09-13). | `dist` grep before and after; `git log -S` on `LoginView.vue`; the built bundle re-scanned clean | **Rotate the passwords — Sean** | The account list now lives in `lib/demoAccounts.dev.ts`, imported only inside `if (import.meta.env.DEV)`. Bundle re-verified: **0** occurrences of either password, **0** resident emails, no stray chunk. The dev server still lists all 34 with one-click sign-in, so the defense demo is unchanged. `check:secrets` now scans the **build output**, which nothing had ever done because `dist` is gitignored. |

**The distinction in A-11 to A-13 is the one that matters, and it is the same one `check:reachable` records for components.** An endpoint nothing calls is either **superseded** — something else does the job — or **unplugged**, meaning the job is not being done at all. A-13 is the first kind, all five of them. A-11 and A-12 are the second, and they were found the same week as the notification centre, which was the third instance of it.

Four further routes are called by something other than the browser and are correctly absent from `frontend/src`: `GET /api/health` (operations), `POST /api/public/payments/adyen/webhook` (Adyen), and the two `/public/payments/local-cashier` gateway-return routes (browser navigation, and 404 whenever a gateway is configured).

These seventeen are not FR failures and are therefore not counted in the 25 / 15 / 3 / 1 totals of §3. They are carried
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

The 15 PARTIAL and 3 MISSING rows are equally part of the honest account. **Two of the three this paragraph named are now delivered**, and it is corrected rather than quietly dropped: the system now *identifies* overdue and grace-period status, which is what FR-013 asks for — `isOverdue()` is called by both bill endpoints and surfaced as `effective_status` (FR-013, closed 2026-09-14). **It does not yet tell Mrs. Fe, and an earlier draft of this sentence said it did.** Nothing in `frontend/src` calls `GET /admin/bills`: the administrator has no bills screen, so the overlay is computed on her side and never asked for. The tenant sees their own. FR-013 stands as MAPPED on the requirement as written — *“identify overdue payments and grace-period status”* — and the missing administrator surface is recorded in §5.1 rather than hidden inside that status, and it *does* bill LF and LB at the fixed rate BR-040 sets (FR-036, `computeWaterFee()` over the seeded `linda_*` settings) — though **not yet to the right destination**: a new Linda row writes the charge into `water_payment`, which the generated `remitted_amount` then counts as the owner's, where BR-040 says it is Linda's. What remains true is the third and largest: **the system still does not compute its own net position** (FR-019), nor its profitability trend (FR-020), and it does not remember an occupant count from one month to the next (FR-033). Those three are the Phase 3 sequence, and FR-019 is the one that most directly touches her daily routine.

---

*Prepared for IT 124 Capstone Project 2 — Group 4, Bicol University College of Science. Phase 1 posture: **supersede and errata**. Every `file:line` citation in this document was verified against the working tree at the time of writing.*
