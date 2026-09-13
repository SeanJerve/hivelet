# CLAUDE TASK PROMPT 3: BACKEND DOMAIN SERVICES & API IMPLEMENTATION
## Context: Capstone Project 2 — Backend Engineering & Business Logic Hardening
### Target: Bicol University College of Science (BUCS) | Group 4

---

### ROLE & DIRECTIVES FOR CLAUDE
You are the **Lead Backend Engineer & API Integration Specialist** for Group 4 (Hivelet).
Your task is to implement, refactor, audit, and harden Hivelet's **Express.js API Routes, Zod Validation Schemas, Business Domain Services, and Audit Logging**.

> [!CAUTION]
> **STRICT FRONTEND PROHIBITION:**
> You are working purely on backend code in `backend/` and database migrations.
> **DO NOT modify, refactor, or generate frontend files (`frontend/`, `website/`).**
> You may inspect `frontend/src/` as a READ-ONLY reference to verify endpoint routes, request bodies, query params, and response status codes.

---

### BACKGROUND & SOURCE DOCUMENTS
Before implementing or modifying backend code, inspect:
1. `backend/src/server.ts` (API entry point, Helmet security headers, CORS origins).
2. `backend/src/routes/` (Current route controllers: `/auth`, `/rooms`, `/bills`, `/payments`, `/tickets`, `/reports`, `/audit`).
3. `backend/src/services/` (Current domain services: `billingService`, `paymentService`, `occupancyService`, `ticketService`, `auditService`, `adyenService`).
4. `backend/src/middleware/` (Auth middleware, RBAC guards `requireRole('admin')` / `requireRole('tenant')`, error handler).
5. `docs/01_SYSTEM_BIBLE.md` (Numerical rules: 33 rooms, ₱200/head water fee, 50% revenue share split, 2% price history, grace periods).
6. `docs/claude_pipeline/diagrams/reference_dfds/` (Confirm your services align with the 6 Level 1 DFD processes).

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
  - Base rent calculated from `rooms.base_rate`.
  - **Dynamic Water Rate Calculation:** Fetch `water_rate_per_occupant` dynamically from `system_settings` (fallback to ₱200/head if setting not found). Formula: $\text{water\_fee} = \text{active\_headcount} \times \text{water\_rate\_per\_occupant}$. Also respect Linda room overrides (`linda_lf_water_charge` at ₱400, `linda_lb_water_charge` at ₱200 remitted to Linda per `BR-040`). **DO NOT hardcode 200.**
  - Total monthly bill: $\text{total} = \text{base\_rent} + \text{water\_fee}$.
  - Support for multi-occupant units and automated generation on tenant move-in anniversary dates.
* **Payment Settlement & Verification (`paymentService.ts` / `admin.ts`):**
  - **Cash Settlement (Primary):** Admin directly records on-site cash payments, setting status immediately to `VERIFIED` and bill status to `PAID`.
  - **GCash Settlement (Digital Alternative):** Tenant submits 13-digit GCash reference number and receipt proof image URL, creating a `PENDING_VERIFICATION` payment entry in the Admin verification queue.
  - **Admin Verification Gate (`PATCH /api/admin/payments/:paymentId/verify`):** When admin approves, updates payment to `Verified`, updates bill to `Paid`, automatically computes and inserts an entry into `monthly_income_records` (recording rent, dynamic water deduction, and the exact 50% revenue share split), and logs an immutable audit event.
* **Hybrid Decoupled Payment Adapter (`adyenService.ts`):**
  - Check `isLiveConfigured()` based on `ADYEN_API_KEY` and `ADYEN_MERCHANT_ACCOUNT` in `.env`.
  - If live, call official Adyen v71 Sessions API (`https://checkout-test.adyen.com/v71/sessions`).
  - If mock/sandbox (or offline evaluation), generate in-memory session tokens with redirect to `/api/public/payments/mock-gateway?sessionId=...`.
  - On payment complete (`POST /api/public/payments/mock-gateway/complete`), insert payment record with `verification_status: 'Pending Verification'` (`BR-017`), alert admin via notification, and record audit log. NEVER automatically set bill to 'Paid' upon gateway redirect.

* **Occupancy & Inquiry Conversion (`occupancyService.ts`):**
  - Enforce canonical 33 units across Main Building, Annex A, and Annex B.
  - Handle conversion of public inquiries into approved tenant profiles and `room_assignments`.
  - Record 2% annual price adjustments in `room_price_history`.
* **Maintenance Ticketing Lifecycle (`ticketService.ts`):**
  - Support priorities: `LOW`, `MEDIUM`, `HIGH`, `EMERGENCY`.
  - Support status lifecycle: `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`.
  - Ensure tenant can only create tickets for their assigned room; Admin can assign technicians and record notes.

#### 2. Security, Authentication & Role-Based Access Control (RBAC)
* Enforce JWT authentication on all protected routes (`authenticateJwt` middleware).
* Enforce strict role authorization:
  - Admin-only routes: `requireRole('admin')` for approving payments, adjusting room rates, recording expenses, viewing audit logs, and managing users.
  - Tenant-only routes: `requireRole('tenant')` ensuring tenants can only access their own bills, payment history, and maintenance tickets (`verifyResourceOwnership`).
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
2. Confirm no code changes were made to `frontend/` or `website/`.
3. Check that all business rules (`BR-001` to `BR-007`) are annotated with JSDoc headers referencing `docs/01_SYSTEM_BIBLE.md`.
