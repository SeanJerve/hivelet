# CLAUDE TASK PROMPT 3: BACKEND DOMAIN SERVICES & API IMPLEMENTATION
## Context: Capstone Project 2 - Backend Engineering & Business Logic Hardening
### Target: Bicol University College of Science (BUCS) | Group 4

---

> [!IMPORTANT]
> **Reconciled against locked canon and the live codebase on 2026-09-13.**
> This prompt was authored before the Phase 1 alignment and before Phase 2 touched the database.
> It contradicted settled decisions in six places and made four factual claims about the codebase
> that are not true. Those passages are corrected below.
>
> **`PHASE1_LOCKED_DECISIONS.md` and `PHASE2_LOCKED_DECISIONS.md` outrank this file.** If anything
> here still disagrees with them, the locked decisions win - report the conflict rather than
> following this prompt.
>
> ### Contradictions of locked canon, corrected
>
> | # | This prompt originally said | Canon |
> | :-- | :--- | :--- |
> | 1 | "33 units across **Main Building, Annex A, and Annex B**" | Those are **not** cluster names and must never appear. The five clusters are **BH (22), Back Apartment (5), Front Apartment (3), Penthouse (1), Linda (2)**. In the family's usage "Annex" denotes a *floor*. |
> | 2 | "Record **2% annual price adjustments** in `room_price_history`" | **No 2% automation of any kind** (locked decision 7). The administrator sets rates manually; every change is recorded with its author and effective date. |
> | 3 | "the exact **50% revenue share split**" | **BR-035 editorial constraint (binding).** `fifty_percent_share` is described **only** as a system-computed figure equal to half the row's Rent Amount, retained for ledger parity with the historical spreadsheet. Never model a party, recipient, purpose or destination. |
> | 4 | "If **mock/sandbox** ... redirect to `/api/public/payments/mock-gateway`" | Adyen is committed and a developer sandbox is configured (locked decision 6). The fallback gateway **code** stays in the codebase but **no "mock"/"simulator" language appears in any narrative or document**. |
> | 5 | "**STRICT FRONTEND PROHIBITION**" | **No longer applies.** The owner granted full authority over frontend, backend and migrations on 2026-09-13. Keep this phase backend-focused by preference, not by prohibition. |
> | 6 | "all business rules (**BR-001 to BR-007**)" | Two different namespaces. `docs/02_BUSINESS_RULES.md` holds **BR-001 ... BR-049**; the pipeline's seven pillars are **ARCH-001 ... ARCH-007** and are never written with a `BR-` prefix. |
>
> ### Factual errors about the codebase, corrected
>
> | # | This prompt assumed | Actually |
> | :-- | :--- | :--- |
> | A | `backend/src/services/` already holds `billingService`, `paymentService`, `occupancyService`, `ticketService` | **None of those four exist.** The directory holds `adyenService`, `auditService`, `authService`, `notificationService`, `scopeService`. They are to be **created**, not audited. |
> | B | Routes are `/auth`, `/rooms`, `/bills`, `/payments`, `/tickets`, `/reports`, `/audit` | Routes are organised **by role, not by resource**: `admin.ts`, `tenant.ts`, `public.ts`, `auth.ts`, `health.ts`, `index.ts`. |
> | C | Authorisation is `requireRole('admin')` / `requireRole('tenant')` | The system uses **`requirePermission`** against a **39-permission** model in `backend/src/config/rbac.ts`. `requireRole` exists but nothing uses it except `requireAdmin`. **Do not regress to role checks** - the `:own` scopes are what enforce tenant isolation (BR-024). |
> | D | "the **6** Level 1 DFD processes" | Phase 1 modernised the legacy lab DFD to **7 processes and 12 data stores**. Reconcile against `PHASE1_DFD_TRACEABILITY.md`, not the lab images. |
>
> ### Schema facts this prompt predates - read before writing a single INSERT
>
> - **`monthly_income_records.fifty_percent_share` and `.remitted_amount` are `GENERATED ALWAYS AS ... STORED`.** PostgreSQL **rejects** any INSERT or UPDATE that names them. The instruction below to "insert ... the exact 50% revenue share split" is not merely off-message, it would raise an error. **Omit both columns from every write.**
> - **`rooms.base_rate` does not exist.** The columns are `rooms.base_price` (original listed rate) and `rooms.current_price` (rate in force).
> - **Enum values are title-case, not upper-case.** `bill_status_type` = `Pending, Due, Overdue, Paid, Partially Paid`; `verification_status_type` = `Verified, Pending Verification, Rejected`; `ticket_status_type` = `Submitted, In Progress, Resolved, Closed`; `ticket_priority_type` = `Emergency, High, Medium, Low`. There is no `OPEN` status and no `PENDING_VERIFICATION` spelling.
> - **supabase-js cannot open a transaction.** Any multi-row write that must be atomic needs a database function, as `replace_expense_allocations(uuid, jsonb)` does for expense allocations (migrations `010`/`013`). This is defect 7 and it is the main correctness risk in this phase.
> - **The Property Areas are six**, not five: `Boarding House`, `Main House`, `Front Apartment`, `Back Apartment`, `Penthouse`, `Other Expenses / Personal`. Only `Main House` and `Other Expenses / Personal` are non-rental.
>
> ### Open questions that gate this phase
>
> - **OD-16 blocks `billingService`.** `system_settings.grace_period_days = 7` and BR-012 describe a grace window; OD-03's answer says late payment is not accepted at all. These may describe different things. **`billingService` cannot be specified until this is settled.**
> - **OD-18 - the Linda fixed electricity charge is on the wrong unit.** `system_settings.linda_lb_electricity_charge = 325` names **LB**, but 31 months of ledger data and the owner's own spreadsheet both charge **LF** (and LB never). The **water** settings are correct (`LF` P400, `LB` P200). Do not wire the electricity setting into billing until the client confirms which unit pays it.
> - **OD-02** (garbage fee timing) and **OD-10** (tenant-submitted payments, `payment:submit:own`) remain open.

---

### ROLE & DIRECTIVES FOR CLAUDE
You are the **Lead Backend Engineer & API Integration Specialist** for Group 4 (Hivelet).
Your task is to implement, refactor, audit, and harden Hivelet's **Express.js API Routes, Zod Validation Schemas, Business Domain Services, and Audit Logging**.

> [!NOTE]
> **Backend-focused by preference, not by prohibition.**
> The owner granted full authority over frontend, backend and migrations on 2026-09-13, so the
> original "STRICT FRONTEND PROHIBITION" no longer applies. Keep the bulk of this phase in
> `backend/` and `database/migrations/` because that is where the work is; change frontend files
> when a backend change requires it, and say so.

---

### BACKGROUND & SOURCE DOCUMENTS
Before implementing or modifying backend code, inspect:
1. `backend/src/server.ts` (API entry point, Helmet security headers, CORS origins).
2. `backend/src/routes/` (Current route controllers: `/auth`, `/rooms`, `/bills`, `/payments`, `/tickets`, `/reports`, `/audit`).
3. `backend/src/services/` (Current domain services: `billingService`, `paymentService`, `occupancyService`, `ticketService`, `auditService`, `adyenService`).
4. `backend/src/middleware/` - `requireAuth`, `optionalAuth`, and the RBAC guard actually in use, **`requirePermission(...)`**, plus the centralised error handler.
5. `docs/02_BUSINESS_RULES.md` - **the canonical rule namespace, BR-001 ... BR-049.** `docs/01_SYSTEM_BIBLE.md` is background only, and several of its numbers are superseded errata (it says 32 units; the answer is 33, and its "2% price history" is retired canon).
6. `docs/claude_pipeline/outputs/PHASE1_DFD_TRACEABILITY.md` - align services against the modernised **7 processes and 12 data stores**, not the 5-and-6 of the legacy lab images in `reference_dfds/`.
7. `database/live_schema.csv` - **the source of truth for the schema.** Not `FULL_DATABASE_SCHEMA.sql`.
8. `backend/src/config/rbac.ts` - the 39 permissions and their role mappings.

---

### REQUIRED TASKS FOR CLAUDE

#### 0. Pre-Generation Clarification & Alignment Check (MANDATORY)
> [!IMPORTANT]
> **STOP AND ASK FIRST IF UNCLEAR:**
> Before creating or modifying backend services, routes, or middleware:
> - Review all API contracts, route parameters, payment flows, and business formulas.
> - If ANY business rule, state transition, billing edge case (e.g. partial month move-ins, water rate adjustments), or role permission is ambiguous or not yet finalized, **initiate a conversation with the user first**.
> - Propose clear engineering solutions, ask for confirmation, and proceed only after reaching explicit alignment.

#### 1. Core Financial & Business Domain Services
Implement and verify the following service logic strictly on the backend:
* **Billing Calculation (`billingService.ts`):**
  - Base rent calculated from `rooms.current_price` (the rate in force). `rooms.base_price` is the original listed rate and is **not** what a tenant is billed. There is no `base_rate` column.
  - **Dynamic Water Rate Calculation:** Fetch `water_rate_per_occupant` from `system_settings` at request time (fallback to 200/head if the setting is missing). Water fee = active headcount x the configured rate. Also respect the Linda **water** overrides (`linda_lf_water_charge` 400, `linda_lb_water_charge` 200) per `BR-040`. **DO NOT hardcode 200** - this is defect 2, currently hardcoded at `admin.ts:910, 1103, 1243` and `tenant.ts:440`.
    > **Do not wire `linda_lb_electricity_charge` into billing yet (OD-18).** It names LB, but the ledger charges LF in 31 of 31 months and LB in none, and the owner's spreadsheet agrees with the ledger. The water settings are correct; the electricity one is disputed.
  - Total monthly bill: $\text{total} = \text{base\_rent} + \text{water\_fee}$.
  - Support for multi-occupant units and automated generation on tenant move-in anniversary dates.
* **Payment Settlement & Verification (`paymentService.ts` / `admin.ts`):**
  - **Cash Settlement (Primary):** Admin directly records on-site cash payments, setting status immediately to `VERIFIED` and bill status to `PAID`.
  - **GCash Settlement (Digital Alternative):** Tenant submits 13-digit GCash reference number and receipt proof image URL, creating a `PENDING_VERIFICATION` payment entry in the Admin verification queue.
  - **Admin Verification Gate (`PATCH /api/admin/payments/:paymentId/verify`):** When the administrator approves, update the payment to `Verified`, update the bill to `Paid`, insert an entry into `monthly_income_records`, and log an immutable audit event.
    > **The income row must NOT name `fifty_percent_share` or `remitted_amount`.** Both are `GENERATED ALWAYS AS ... STORED` in production - PostgreSQL maintains them and **rejects any write that names them**. Insert `rent_amount` and `water_payment`; the two derived figures appear by themselves. `fifty_percent_share` is a system-computed figure equal to half the row's Rent Amount, retained for ledger parity with the historical spreadsheet (BR-035) - describe it that way and no other way.
    > These four steps span multiple tables and **supabase-js cannot open a transaction**. Do this in a database function, the way `replace_expense_allocations` does, or a failure mid-sequence leaves a verified payment with no income row.
* **Hybrid Decoupled Payment Adapter (`adyenService.ts`):**
  - Check `isLiveConfigured()` based on `ADYEN_API_KEY` and `ADYEN_MERCHANT_ACCOUNT` in `.env`.
  - If live, call official Adyen v71 Sessions API (`https://checkout-test.adyen.com/v71/sessions`).
  - A fallback session path exists in the codebase for offline evaluation. It stays, and it is **never described as a mock or simulator in any document, diagram or defense narrative** (locked decision 6).
  - On payment completion, insert the payment with `verification_status: 'Pending Verification'` (`BR-017`), notify the administrator, and record an audit log. **NEVER** set the bill to `Paid` on a gateway redirect - only the administrator's verification does that.
  - **Both fallback endpoints currently carry no authentication middleware at all** (`public.ts:202`, `:853`) - defect 8. Every other route in that file declares a permission. Fix this in the same pass.

* **Occupancy & Inquiry Conversion (`occupancyService.ts`):**
  - Enforce the canonical **33 units across five clusters**: BH (22), Back Apartment (5), Front Apartment (3), Penthouse (1), Linda (2). Floors are **11 / 11 / 10 / 1**. "Main Building / Annex A / Annex B" are **not** cluster names and must never appear.
  - Handle conversion of public inquiries into approved tenant profiles and `room_assignments`.
  - Record **manual** rate changes in `room_price_history`, with the administrator who made them and an effective date (ARCH-004). **No automatic escalation of any kind** - the 2% figure is retired canon and must not be implemented or mentioned.
* **Maintenance Ticketing Lifecycle (`ticketService.ts`):**
  - Priorities are the `ticket_priority_type` enum: `Emergency`, `High`, `Medium`, `Low` - title-case, exactly as stored.
  - Status lifecycle is the `ticket_status_type` enum: `Submitted` -> `In Progress` -> `Resolved` -> `Closed`. **There is no `OPEN` status.**
  - Ensure tenant can only create tickets for their assigned room; Admin can assign technicians and record notes.

#### 2. Security, Authentication & Role-Based Access Control (RBAC)
* Enforce JWT authentication on all protected routes (`authenticateJwt` middleware).
* Enforce authorisation through the **39-permission model** in `backend/src/config/rbac.ts`, using `requirePermission(...)`:
  - Administrator actions declare what they need - `requirePermission(PERMISSIONS.PAYMENT_VERIFY)`, `ROOM_MANAGE`, `AUDIT_READ`.
  - Tenant isolation comes from the **`:own` scopes** (`bill:read:own`, `payment:read:own`), whose handlers filter by the caller's own `tenant_profile_id` (BR-024).
  - **Do not regress to role checks.** `requireRole` exists in `middleware/auth.ts` but nothing uses it except `requireAdmin`; the permission model is the mechanism this architecture defends at the panel.
* Never expose the Supabase `service_role` key to the client.

#### 3. Zod Input Validation & Error Handling
* Validate every incoming request body, query parameter, and route parameter using strongly-typed Zod schemas (`z.object({...})`).
* Return descriptive, structured validation errors with HTTP 400 Bad Request.
* Use centralized error handling (`ApiError`) so unhandled exceptions do not leak stack traces or database connection strings in production.

#### 4. Immutable Audit Trail Logging
* For EVERY mutating operation (create, update, delete, verify, approve, reject):
  - Call `auditService.logAction({ ... })`.
  - Record `user_id`, `action`, `entity_type`, `entity_id`, `old_values` (JSON snapshot), `new_values` (JSON snapshot), `ip_address`, and `user_agent`.

---

### VERIFICATION & QUALITY STANDARDS
Before concluding any implementation:
1. Run `npm run build` in `backend` to ensure strict TypeScript compilation with zero errors.
2. Run `npx vue-tsc --noEmit` in `frontend` if any frontend file was touched.
3. Annotate implemented rules with JSDoc headers citing the **`BR-001` ... `BR-049`** namespace in `docs/02_BUSINESS_RULES.md`, which is canonical. The seven pipeline pillars are **`ARCH-001` ... `ARCH-007`** and are never cited with a `BR-` prefix.
4. `database/FULL_DATABASE_SCHEMA.sql` is **not** an accurate description of production - seven differences are known. Read `database/live_schema.csv`, and test any migration against `database/migrations/_TEST_FIXTURE_production_drift.sql`.
