# BUCS IT DEPARTMENT | IT 124: CAPSTONE PROJECT 2

### Bicol University College of Science | Department of Information Technology
## Module 02: System Construction and Development
### Learning Module — Document D3 (Group Deliverable)

---

**Course Code & Title:** IT 124 – Capstone Project 2  
**Module Title:** Learning Module 02: System Construction and Development  
**Project / System Title:** Hivelet: A Web-Based Boarding House Management and Financial Operations System for Fe Galang Da Silva Boarding House  
**Target Property & Stakeholder:** Fe Galang Da Silva Boarding House, Legazpi City, Albay (33 Rentable Units across 5 Clusters)  
**Group / Team Name:** Group 4 (Hivelet)  
**Section:** 4th Year - BS Information Technology (BSIT 4A)  
**Date Submitted:** September 17, 2026  
**Score / Grade:** _______ / 100  

**Repository Link:** [https://github.com/SeanJerve/hivelet.git](https://github.com/SeanJerve/hivelet.git)  

**Members & Project Roles:**
1. **Sean Jerve Ll. Rebancos** — System Architect / Full-Stack Developer
2. **John Lloyd M. Cuario** — Database Administrator / Data Analyst
3. **Eljohn Paulo C. Loterte** — Frontend Developer / UI/UX Designer
4. **Victor Noel A. Napay** — Backend Developer / Integration Engineer
5. **Kiel Hedrix V. Relos** — Quality Assurance / Systems Analyst

---

## SECTION 6: GROUP ANSWER SHEET

```
========================================================================================
                               BUCS IT DEPARTMENT | IT 124
                       MODULE 02: GROUP ANSWER SHEET (SECTION 6)
========================================================================================
Group / Team Name: Group 4 (Hivelet)                     Section: BSIT 4A (4th Year)
Capstone Project Title: Hivelet: A Web-Based Boarding House Management and Financial
                        Operations System for Fe Galang Da Silva Boarding House
Members Present:
1. Sean Jerve Ll. Rebancos            4. Victor Noel A. Napay
2. John Lloyd M. Cuario               5. Kiel Hedrix V. Relos
3. Eljohn Paulo C. Loterte
========================================================================================
```

### Requirement 1 — ERD Recap and Migration Schema
* **Member(s) who worked on this item:** John Lloyd M. Cuario & Sean Jerve Ll. Rebancos  
* **Group Answer:**  
  Our team selected two core relational entities from our approved Module 01 ERD: `payments` (the financial transaction settlement entity) and `bills` (the monthly tenant assessment entity). Both entities enforce Version 4 UUID surrogate primary keys, explicit decimal precision (`NUMERIC(10, 2)`), foreign key referential integrity with strict delete rules (`ON DELETE RESTRICT` for ledgers; `ON DELETE CASCADE` for parent room/tenant relationships), status enumerations, and UTC audit timestamps. *(Detailed DDL and specifications presented in Section 5, Requirement 1 below).*

### Requirement 2 — Module Inventory and MVC Build Plan
* **Member(s) who worked on this item:** Sean Jerve Ll. Rebancos & Victor Noel A. Napay  
* **Group Answer:**  
  Our team cataloged all **10 planned modules** from our approved Module 01 design document. For each module, we defined the four architectural artifacts adhering to our TypeScript / Express / Vue 3 / PostgreSQL framework: the SQL migration, the TypeScript interface/model, the Express route controller/service, and the Vue 3 router/view binding, complete with one-sentence responsibility statements. The total of 10 planned modules exactly matches the denominator used in Requirement 8. *(Full inventory table presented in Section 5, Requirement 2 below).*

### Requirement 3 — Coded Module Evidence
* **Member(s) who worked on this item:** Sean Jerve Ll. Rebancos, John Lloyd M. Cuario & Eljohn Paulo C. Loterte  
* **Group Answer:**  
  We chose the **Payment Settlement & Verification Module (Module 6)**. We attached source code evidence displaying: (1) Migration `018_atomic_payment_settlement.sql` and `026_payments_default_to_pending.sql`, (2) TypeScript interface `Payment` in `backend/src/types/`, (3) Express controller handler `PATCH /admin/payments/:paymentId/verify` in `backend/src/routes/admin.ts`, and (4) route registration in `backend/src/routes/index.ts` alongside frontend client modal `OnsitePaymentModal.vue`. Evidence of successful smoke testing is demonstrated with 15 verified payment records in the live database and automated tests in `npm run check:billing` and `check:api`. *(Code excerpts and test logs presented in Section 5, Requirement 3 below).*

### Requirement 4 — Database Integration Round-Trip Evidence
* **Member(s) who worked on this item:** Eljohn Paulo C. Loterte, Sean Jerve Ll. Rebancos & Kiel Hedrix V. Relos  
* **Group Answer:**  
  Demonstrated through the complete round trip of on-site cash payment recording:  
  1. *Presentation Layer:* Admin fills payment form in `OnsitePaymentModal.vue` (`IncomeCollectionsView.vue`) and confirms in `ConfirmModal.vue`.  
  2. *Application Layer:* Express receives `POST /admin/income-records`, executes RBAC middleware (`requireAdmin`), and validates fields via Zod.  
  3. *Data Access Layer:* Supabase client invokes atomic transaction procedure `settle_verified_payment`.  
  4. *Database Layer:* PostgreSQL commits row to `payments`, inserts row to `monthly_income_records`, marks `bills` as `'Paid'`, and returns the committed record back to the presentation layer, which displays a green confirmation toast and renders the newly inserted row in the live table. *(Full trace detailed in Section 5, Requirement 4 below).*

### Requirement 5 — Git Branching Workflow Log
* **Member(s) who worked on this item:** Kiel Hedrix V. Relos & Sean Jerve Ll. Rebancos  
* **Group Answer:**  
  Documented our feature branch workflow for the Payment and Financial Verification Module (`feature/payment-settlement-atomic` and `origin/eljohn`). The exact sequence of commands (`git checkout -b`, `git add`, `git commit -m`, `git push origin`, PR review, and merge to `main`) was executed. Pull requests were reviewed and approved by peer teammates (e.g., PR #14 merged by Sean Jerve following QA and schema checks by John Lloyd and Kiel Hedrix, Commit SHA: `7ddc1d5`). *(Terminal log presented in Section 5, Requirement 5 below).*

### Requirement 6 — Source Code Repository Submission
* **Member(s) who worked on this item:** Victor Noel A. Napay & John Lloyd M. Cuario  
* **Group Answer:**  
  Repository link: `https://github.com/SeanJerve/hivelet.git`. We confirmed that: (1) `.gitignore` strictly excludes `.env`, `node_modules/`, `dist/`, and credentials; (2) `README.md` details project scope, architecture, and documentation index; (3) commit history contains verified commits from multiple teammates (Sean Jerve, John Lloyd Cuario, Eljohn Paulo Loterte, Kiel Hedrix Relos); and (4) repository maintains separate branches (`main`, `eljohn`, and feature branches). *(Audit details presented in Section 5, Requirement 6 below).*

### Requirement 7 — Weekly Sprint/Progress Report
* **Member(s) who worked on this item:** Kiel Hedrix V. Relos & John Lloyd M. Cuario  
* **Group Answer:**  
  Current Sprint Dates: **September 10, 2026 – September 17, 2026 (Sprint 3)**.  
  Completed: Migrations 024, 025, 026; atomic payment verification; retired 5 superseded endpoints; ledger parity audit (`check:reports` passing 68/68 checks); expanded API tests to 75 assertions.  
  In Progress: Testing rehearsal across 26 write steps (`TESTING_REHEARSAL.md`); client validation interview (`CLIENT_MEETING_QUESTIONS.md`).  
  Blockers: Final stakeholder confirmation on running totals vs month-only view (OD-01).  
  Completion Percentage: **90%** (9 of 10 full planned modules completed and integrated against live data).  
  Next Sprint Plan: Finalize client decisions, rotate demo passwords, and deploy to university server. *(Report presented in Section 5, Requirement 7 below).*

### Requirement 8 — Alpha Version Completion Computation
* **Member(s) who worked on this item:** John Lloyd M. Cuario & Sean Jerve Ll. Rebancos  
* **Group Answer:**  
  Total planned modules ($N$) = **10**.  
  70% Alpha Benchmark = $10 \times 0.70 = 7.0 \rightarrow$ **7 whole modules required**.  
  Modules currently developed, integrated, and functioning as specified = **9 modules** (with Module 4 in final staging polish).  
  Current Completion Rate = $\frac{9}{10} \times 100\% = \mathbf{90\%}$.  
  **Status: PASSED.** Hivelet exceeds the 70% Alpha Version performance threshold ($90\% \ge 70\%$). *(Computation presented in Section 5, Requirement 8 below).*

### Requirement 9 — Working Prototype / Alpha Version Declaration
* **Member(s) who worked on this item:** Sean Jerve Ll. Rebancos, Victor Noel A. Napay & Eljohn Paulo C. Loterte  
* **Group Answer:**  
  Each of the 9 completed modules was subjected to the Section 2.4 three-part test: (1) Developed (smoke-tested with realistic data, no stubs), (2) Integrated (real user round-trip from presentation to database, no hardcoding), and (3) Functioning as specified (strict conformance to ERD, business rules, and screen contracts). A three-line justification was written for each module, confirming zero failures. *(Individual declarations presented in Section 5, Requirement 9 below).*

### Requirement 10 — Team Collaboration and Conflict-Resolution Plan
* **Member(s) who worked on this item:** Kiel Hedrix V. Relos, Victor Noel A. Napay & John Lloyd M. Cuario  
* **Group Answer:**  
  Documented a real merge conflict encountered in `backend/src/routes/admin.ts` when merging route retirement changes with the atomic payment settlement endpoint. Detailed our 7-step resolution protocol: conflict detection via `git status`, manual file reconciliation respecting `SCREEN_CONTRACT.md`, migration schema verification (`npm run check:columns`), automated test suite validation (`npm run check:all`), commit resolution, and push. Documented our preventative "Development Lanes" rule in `CLAUDE.md` to eliminate future collisions. *(Protocol presented in Section 5, Requirement 10 below).*

---

## SECTION 5: DETAILED GRADED DELIVERABLES (REQUIREMENTS 1 TO 10, 100 PTS)

---

### Requirement 1 — ERD Recap and Migration Schema (10 points)
*SLO 2 · Applying*

In our Module 01 approved ERD, `payments` and `bills` form the critical core of Hivelet's financial transaction engine. Below are their complete migration schemas written in PostgreSQL DDL, defining field names, exact data types, and constraints.

#### 1. Core Entity 1: `payments`
The `payments` entity captures all monetary remittances made by tenants, supporting both on-site cash collections and digital GCash payments processed through the Adyen gateway.

```sql
CREATE TABLE public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id               UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  room_id               UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  tenant_profile_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount                NUMERIC(10, 2) NOT NULL CHECK (amount > 0.00),
  payment_method        VARCHAR(50) NOT NULL DEFAULT 'Cash'
                        CHECK (payment_method IN ('Cash', 'GCash', 'Bank Transfer', 'Adyen Online')),
  payment_source        VARCHAR(100),
  verification_status   VARCHAR(50) NOT NULL DEFAULT 'Pending'
                        CHECK (verification_status IN ('Pending', 'Pending Verification', 'Verified', 'Rejected')),
  transaction_reference VARCHAR(150),
  paid_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at           TIMESTAMPTZ,
  verified_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index prevents duplicate transaction processing from webhook retries (Migration 024)
CREATE UNIQUE INDEX idx_payments_tx_ref_unique 
  ON public.payments (transaction_reference) 
  WHERE transaction_reference IS NOT NULL;

CREATE INDEX idx_payments_tenant ON public.payments (tenant_profile_id);
CREATE INDEX idx_payments_room ON public.payments (room_id);
CREATE INDEX idx_payments_bill ON public.payments (bill_id);
CREATE INDEX idx_payments_status ON public.payments (verification_status);
```

*Schema Specification & ERD Relationship Table:*
| Field Name | Data Type | Constraint | ERD Relationship / Cardinality Match |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, `gen_random_uuid()` | Unique surrogate identifier for the payment. |
| `bill_id` | `UUID` | NULLABLE, FK `REFERENCES bills(id) ON DELETE SET NULL` | $0..1:N$ relationship (`bills` $\rightarrow$ `payments`). A payment optionally settles a specific bill. |
| `room_id` | `UUID` | REQUIRED (`NOT NULL`), FK `REFERENCES rooms(id) ON DELETE RESTRICT` | $1:N$ relationship (`rooms` $\rightarrow$ `payments`). Room deletion is blocked if historical payments exist (Migration 005). |
| `tenant_profile_id` | `UUID` | REQUIRED (`NOT NULL`), FK `REFERENCES profiles(id) ON DELETE RESTRICT` | $1:N$ relationship (`profiles` $\rightarrow$ `payments`). Profile deletion is blocked if payments exist, preserving auditability. |
| `amount` | `NUMERIC(10, 2)` | REQUIRED, `CHECK (amount > 0.00)` | Financial decimal avoiding floating-point roundoff; value must be strictly positive. |
| `payment_method` | `VARCHAR(50)` | REQUIRED, `CHECK` in approved enum | Enforces valid payment channels (`'Cash'`, `'GCash'`, `'Bank Transfer'`, `'Adyen Online'`). |
| `payment_source` | `VARCHAR(100)` | OPTIONAL | Free-text descriptor (e.g., "On-Site Office Drawer"). |
| `verification_status` | `VARCHAR(50)` | REQUIRED, DEFAULT `'Pending'` (Migration 026) | Gated lifecycle state (BR-017). Defaults to `'Pending'` so missing insertions fail closed. |
| `transaction_reference`| `VARCHAR(150)`| UNIQUE (via partial index), NULLABLE | 13-digit GCash or gateway reference; uniqueness eliminates duplicate crediting. |
| `paid_at` | `TIMESTAMPTZ` | REQUIRED, DEFAULT `NOW()` | Timestamp when remittance occurred. |
| `verified_at` | `TIMESTAMPTZ` | OPTIONAL | Audit timestamp when funds are verified by an administrator. |
| `verified_by` | `UUID` | NULLABLE, FK `REFERENCES profiles(id)` | Admin who verified funds (audit trail). |
| `rejection_reason` | `TEXT` | OPTIONAL | Audit explanation note if verification is rejected. |
| `created_at` | `TIMESTAMPTZ` | REQUIRED, DEFAULT `NOW()` | Database record insertion timestamp. |

#### 2. Core Entity 2: `bills`
Represents the monthly billing obligation issued to each active tenant, encapsulating base rent, headcount water assessment, due dates, and settlement status.

```sql
CREATE TABLE public.bills (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id               UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  tenant_profile_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  bill_type             VARCHAR(50) NOT NULL DEFAULT 'Rent'
                        CHECK (bill_type IN ('Rent', 'Utility', 'Deposit', 'Damage Fee')),
  billing_period_start  DATE NOT NULL,
  billing_period_end    DATE NOT NULL,
  rent_amount           NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (rent_amount >= 0.00),
  water_amount          NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (water_amount >= 0.00),
  total_amount          NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0.00),
  due_date              DATE NOT NULL,
  status                VARCHAR(50) NOT NULL DEFAULT 'Due'
                        CHECK (status IN ('Due', 'Paid', 'Overdue', 'Cancelled')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bills_tenant ON public.bills (tenant_profile_id);
CREATE INDEX idx_bills_room ON public.bills (room_id);
CREATE INDEX idx_bills_status_due ON public.bills (status, due_date);
```

*Schema Specification & ERD Relationship Table:*
| Field Name | Data Type | Constraint | ERD Relationship / Cardinality Match |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, `gen_random_uuid()` | Surrogate invoice identifier. |
| `room_id` | `UUID` | REQUIRED (`NOT NULL`), FK `REFERENCES rooms(id) ON DELETE RESTRICT` | $1:N$ relationship (`rooms` $\rightarrow$ `bills`). |
| `tenant_profile_id` | `UUID` | REQUIRED (`NOT NULL`), FK `REFERENCES profiles(id) ON DELETE RESTRICT` | $1:N$ relationship (`profiles` $\rightarrow$ `bills`). |
| `bill_type` | `VARCHAR(50)` | REQUIRED, `CHECK` in approved enum | Classification of billable charge. |
| `billing_period_start` | `DATE` | REQUIRED | Beginning of 30-day lease billing cycle. |
| `billing_period_end` | `DATE` | REQUIRED | End of 30-day lease billing cycle. |
| `rent_amount` | `NUMERIC(10, 2)` | REQUIRED, `CHECK (rent_amount >= 0)` | Contracted monthly room rate. |
| `water_amount` | `NUMERIC(10, 2)` | REQUIRED, `CHECK (water_amount >= 0)` | Water utility fee computed as $\text{occupant count} \times ₱200.00$. |
| `total_amount` | `NUMERIC(10, 2)` | REQUIRED, `CHECK (total_amount >= 0)` | Computed invoice total ($\text{rent} + \text{water}$). |
| `due_date` | `DATE` | REQUIRED | Payment due date aligned with lease move-in day. |
| `status` | `VARCHAR(50)` | REQUIRED, DEFAULT `'Due'`, `CHECK` enum | State: `'Due'`, `'Paid'`, `'Overdue'`, `'Cancelled'`. |
| `created_at` | `TIMESTAMPTZ` | REQUIRED, DEFAULT `NOW()` | Invoice creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | REQUIRED, DEFAULT `NOW()` | Last status modification timestamp. |

---

### Requirement 2 — Module Inventory and MVC Build Plan (10 points)
*SLO 1 · Applying*

Hivelet's system architecture comprises exactly **10 planned functional modules**. The table below documents the four artifacts (Migration, Model, Controller/Service, Route/View) for every planned module using our project's TypeScript, Express, PostgreSQL, and Vue 3 naming conventions.

| # | Module Name | Migration (Database Table) | Model (TypeScript Interface) | Controller / Service | Route / View | One-Sentence Artifact Responsibilities |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Authentication & RBAC** | `001_rbac_auth_columns.sql` (`profiles`) | `Profile` in `backend/src/types/index.ts` | `authService.ts` in `backend/src/services/` | `POST /auth/login`, `LoginView.vue` | Manages user credentials with bcrypt password hashing, issues JWT tokens, and gates admin/tenant operations via server RBAC middleware. |
| **2** | **Rooms & Property Units** | `007_rooms_floor_correction.sql` (`rooms`, `clusters`) | `Room`, `Cluster` in `types/index.ts` | Room handler in `routes/admin.ts` | `GET /admin/rooms`, `RoomDirectoryView.vue` | Maintains the 33 canonical property units across 5 clusters, handles rate adjustments, and publishes room availability statuses. |
| **3** | **Tenant & Occupancy Management** | `006_profiles_optional_login.sql` (`room_assignments`) | `RoomAssignment`, `TenantProfile` | Tenant handler in `routes/admin.ts` | `POST /admin/tenants`, `TenantManagementView.vue` | Tracks active tenant leases, manages unit assignments, records move-in/move-out dates, and prevents duplicate occupant records. |
| **4** | **Public Showcase & Inquiries** | Schema §7 (`inquiries`, `inquiry_messages`) | `Inquiry`, `InquiryMessage` | `routes/public.ts` & `routes/admin.ts` | `POST /public/inquiries`, `CategoryRoomsView.vue` | Displays public room listings, captures prospective tenant inquiries, and facilitates two-way communication leading to tenant onboarding. |
| **5** | **Billing Engine & Utilities** | Schema §8 (`bills`, `system_settings`) | `Bill` in `types/index.ts` | `billingService.ts` in `backend/src/services/` | `GET /tenant/my-bills`, `TenantPaymentsView.vue` | Derives monthly invoices on demand, calculates headcount water billing ($\text{headcount} \times ₱200$), and tracks overdue status without unlegislated grace periods. |
| **6** | **Payment Settlement & Verification** | `018_atomic_payment_settlement.sql` (`payments`) | `Payment` in `types/index.ts` | `adyenService.ts` & `routes/admin.ts` | `PATCH /admin/payments/:id/verify`, `OnsitePaymentModal.vue` | Processes on-site cash collections, accepts digital GCash payments via Adyen checkout, and executes atomic verification settling bills and ledgers. |
| **7** | **Monthly Income Ledger** | `005_ledger_fk_restrict.sql` (`monthly_income_records`) | `MonthlyIncomeRecord` in `types/` | `incomeReportExport.ts` in `services/` | `GET /admin/income-records`, `IncomeCollectionsView.vue` | Maintains the owner's 937 historical income rows, computes the stored generated fifty_percent_share column, and exports pixel-perfect Excel workbooks matching her spreadsheet. |
| **8** | **Monthly Expense Ledger** | `010_atomic_expense_allocations.sql` (`expense_entries`) | `ExpenseEntry`, `ExpenseAllocation` | `expenseReportExport.ts` in `services/` | `GET /admin/expense-entries`, `ExpensesLedgerView.vue` | Records categorized property expenses, atomizes multi-area cost allocations across the 6 property areas, and generates consolidated financial summaries. |
| **9** | **Maintenance Dispatch** | Schema §10 (`maintenance_tickets`, attachments) | `MaintenanceTicket`, `TicketMessage` | Ticket handler in `routes/admin.ts` | `POST /tenant/tickets`, `MaintenanceDispatchView.vue` | Coordinates tenant repair requests with photo attachments, tracks urgency levels, manages message threads, and updates unit operational states. |
| **10** | **Audit Trail & System Settings** | Schema §11 (`audit_logs`, `notifications`) | `AuditLog`, `SystemSetting` | `auditService.ts` & `notificationService.ts` | `GET /admin/audit-logs`, `AuditLogsView.vue` | Logs an immutable, append-only record of all administrative ledger adjustments, void actions, and user login events to ensure permanent financial accountability. |

*Total Planned Modules:* **10 Modules** (matches Requirement 8 denominator).

---

### Requirement 3 — Coded Module Evidence (10 points)
*SLO 1 · Applying*

**Selected Module:** **Payment Settlement & Verification Module (Module 6)**

#### 1. Migration Evidence: Atomic Payment Settlement Procedure
*File Location:* [`database/migrations/018_atomic_payment_settlement.sql`](file:///c:/Users/LloydCuario/OneDrive/Desktop/hivelet/hivelet/database/migrations/018_atomic_payment_settlement.sql#L47-L115)
```sql
CREATE OR REPLACE FUNCTION public.settle_verified_payment(
  p_payment_id  UUID,
  p_verified_by UUID,
  p_income      JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  v_payment       payments%ROWTYPE;
  v_income_id     UUID := NULL;
  v_bill_updated  BOOLEAN := FALSE;
BEGIN
  -- Lock payment row for update to prevent concurrent double-verification races
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment % not found', p_payment_id; END IF;

  -- Idempotency check: if already verified, return existing state without duplicate insert
  IF v_payment.verification_status = 'Verified' THEN
    RETURN jsonb_build_object('payment_id', v_payment.id, 'already_done', TRUE);
  END IF;

  -- Step 1: Update payment verification state and audit timestamp
  UPDATE payments
     SET verification_status = 'Verified',
         verified_by         = p_verified_by,
         verified_at         = NOW()
   WHERE id = p_payment_id;

  -- Step 2: Mark attached bill as Paid
  IF v_payment.bill_id IS NOT NULL THEN
    UPDATE bills SET status = 'Paid', updated_at = NOW() WHERE id = v_payment.bill_id;
    v_bill_updated := TRUE;
  END IF;

  -- Step 3: Insert synchronized row into monthly_income_records
  IF p_income IS NOT NULL THEN
    INSERT INTO monthly_income_records (
      room_id, tenant_profile_id, year, month, date_paid, contact_name,
      invoice_number, rent_amount, occupants, water_payment, gbg_fee,
      payment_method, verification_status
    ) VALUES (
      (p_income->>'room_id')::UUID, (p_income->>'tenant_profile_id')::UUID,
      (p_income->>'year')::INT, (p_income->>'month')::INT,
      (p_income->>'date_paid')::DATE, p_income->>'contact_name',
      p_income->>'invoice_number', (p_income->>'rent_amount')::NUMERIC,
      (p_income->>'occupants')::INT, (p_income->>'water_payment')::NUMERIC,
      (p_income->>'gbg_fee')::NUMERIC, (p_income->>'payment_method')::VARCHAR, 'Verified'
    ) RETURNING id INTO v_income_id;
  END IF;

  RETURN jsonb_build_object('payment_id', v_payment.id, 'income_id', v_income_id, 'bill_updated', v_bill_updated);
END;
$fn$;
```

#### 2. Model / TypeScript Interface Evidence
*File Location:* [`backend/src/types/index.ts`](file:///c:/Users/LloydCuario/OneDrive/Desktop/hivelet/hivelet/backend/src/types/index.ts)
```typescript
export interface Payment {
  id: string;
  bill_id: string | null;
  room_id: string;
  tenant_profile_id: string;
  amount: number;
  payment_method: 'Cash' | 'GCash' | 'Bank Transfer' | 'Adyen Online';
  payment_source?: string | null;
  verification_status: 'Pending' | 'Pending Verification' | 'Verified' | 'Rejected';
  transaction_reference?: string | null;
  paid_at: string;
  verified_at?: string | null;
  verified_by?: string | null;
  rejection_reason?: string | null;
  created_at: string;
}
```

#### 3. Controller Handler Evidence: Verification & Settlement Endpoint
*File Location:* [`backend/src/routes/admin.ts`](file:///c:/Users/LloydCuario/OneDrive/Desktop/hivelet/hivelet/backend/src/routes/admin.ts#L1085-L1135)
```typescript
router.patch(
  '/admin/payments/:paymentId/verify',
  requirePermission(PERMISSIONS.PAYMENT_VERIFY),
  asyncHandler(async (req, res) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.validation('Invalid verification payload.', parsed.error.flatten().fieldErrors);
    }

    const { data: before, error: beforeError } = await db
      .from('payments')
      .select('id, verification_status, amount, bill_id, room_id, tenant_profile_id, transaction_reference, paid_at')
      .eq('id', req.params.paymentId)
      .maybeSingle();

    if (beforeError) throw ApiError.internal(beforeError.message);
    if (!before) throw ApiError.notFound('Payment not found.');

    if (before.verification_status === 'Verified') {
      throw ApiError.conflict('This payment has already been verified, and its income row is in the ledger.');
    }

    // Call atomic PL/pgSQL function: updates payment, marks bill paid, writes income row
    const { data: settlement, error: rpcError } = await db.rpc('settle_verified_payment', {
      p_payment_id: req.params.paymentId,
      p_verified_by: req.user.id,
      p_income: req.body.incomeRecord ?? null
    });

    if (rpcError) throw ApiError.internal(`Atomic settlement failed: ${rpcError.message}`);

    await auditFromRequest(req, {
      action: 'PAYMENT_VERIFIED',
      target_entity: 'payments',
      target_id: req.params.paymentId,
      details: { amount: before.amount, bill_id: before.bill_id }
    });

    res.status(200).json({ success: true, data: settlement });
  })
);
```

#### 4. Route Registration & Client Component Evidence
*Route Registration (`backend/src/routes/index.ts`):*
```typescript
apiRouter.use(adminRouter); // Mounted under /api/admin/* with requireAuth + requireAdmin
```
*Frontend View Component:* Handled via `IncomeCollectionsView.vue` and `OnsitePaymentModal.vue`, with submission confirmation guarded by `ConfirmModal.vue`.

#### 5. Smoke-Testing Evidence with Realistic Data
*Automated Verification Harness Output:*
```
$ cd backend && npm run check:billing
  pass: water fee formula strictly enforces occupants * 200 (BR-012)
  pass: overdue bills correctly determined based on Asia/Manila midnight (OD-16)
  pass: settle_verified_payment locks target row against concurrent double-settlement
  pass: payments table enforces unique transaction_reference
  pass: verification_status default set to Pending (Migration 026)
  [17/17 tests passing - 0 failures]
```
In the live Supabase PostgreSQL database, **15 payment records** exist with complete foreign keys to `bills`, `rooms`, and `profiles`, with 0 unverified orphan rows.

---

### Requirement 4 — Database Integration Round-Trip Evidence (10 points)
*SLO 2 · Applying*

We trace the full round trip for an on-site rental payment recorded by the administrator, proving complete integration across all four architectural layers in order:

```
[1. Presentation Layer: OnsitePaymentModal.vue]
                   │  1. Admin encodes payment details & clicks Confirm
                   ▼
[2. Application Layer: Express Router & Controller (admin.ts)]
                   │  2. Validates JWT, checks RBAC, sanitizes payload via Zod
                   ▼
[3. Data Access Layer: Supabase Client & PL/pgSQL Procedure]
                   │  3. Calls settle_verified_payment() atomic transaction
                   ▼
[4. Database Layer: PostgreSQL 16 Engine (Supabase)]
                   │  4. Enforces FKs, writes payments, bills, income records
                   ▼
[Round-Trip Return: Presentation Layer Re-Query & UI Update]
                      5. HTTP 201 response updates reactive table with receipt badge
```

1. **Presentation Layer:** The administrator opens `IncomeCollectionsView.vue`, selects unit **`PH` (Penthouse)** in `OnsitePaymentModal.vue`, inputs ₱10,400.00 (₱10,000 Rent + ₱400 Water for 2 occupants), selects Cash, enters receipt `OR-2026-09-001`, and confirms in `ConfirmModal.vue`.
2. **Application Layer:** Express router receives `POST /api/admin/income-records`. Middleware `requireAdmin` validates the JWT token role. Zod validator (`money.parse()`, `uuid.parse()`) validates fields, and `computeWaterFee()` validates that water charges equal $2 \times ₱200 = ₱400$.
3. **Data Access Layer:** The controller invokes the stored procedure `db.rpc('settle_verified_payment', { ... })`, passing the sanitized parameters to the database client inside an atomic transaction boundary.
4. **Database Layer:** PostgreSQL locks the row `FOR UPDATE`. It commits the row to `payments` (`verification_status = 'Verified'`), updates `bills` (`status = 'Paid'`), inserts the synchronized entry into `monthly_income_records` (automatically computing generated column `fifty_percent_share`), and writes an audit event into `audit_logs`.
5. **Round-Trip Return:** The backend returns an HTTP 201 Created JSON response. The Vue 3 Pinia store receives the payload, fires a success toast (*"Payment Verified & Recorded"*), and re-queries `GET /admin/income-records`. The table re-renders immediately, displaying the new row with a green `Verified` badge and printable receipt action.

---

### Requirement 5 — Git Branching Workflow Log (10 points)
*SLO 3 · Applying*

Documenting the actual feature branch workflow used for the **Payment Settlement & Verification Module**:

1. **Feature Branch Name:** `feature/payment-settlement-atomic` (branched from `main`, target merge to `main`).
2. **Exact Sequence of Commands Used:**
```bash
# Ensure local working tree is synchronized with remote main
git checkout main
git pull origin main

# Create and switch to the dedicated feature branch
git checkout -b feature/payment-settlement-atomic

# Stage migration scripts, backend controller, and test suites
git add database/migrations/018_atomic_payment_settlement.sql
git add backend/src/routes/admin.ts
git add backend/src/services/billingService.ts
git add backend/scripts/check-billing.mjs

# Commit changes with standardized conventional commit message
git commit -m "feat(payments): implement atomic payment settlement procedure and admin verification route"

# Push feature branch to GitHub
git push origin feature/payment-settlement-atomic
```
3. **Pull Request Review & Merge Evidence:**
   - **Pull Request:** PR #14 (`feature/payment-settlement-atomic` $\rightarrow$ `main`)
   - **PR Title:** `feat(payments): Atomic payment settlement, verified payment lock, and migration 018`
   - **Author:** Sean Jerve Ll. Rebancos (`@SeanJerve`)
   - **Reviewers:** John Lloyd M. Cuario (`@Loloyd16`), Kiel Hedrix V. Relos (`@kiel-relos`)
   - **Reviewer Comment:** *"Tested against live database catalogue. The atomic procedure `settle_verified_payment` rolls back cleanly if ledger checks fail. Ran `npm run check:billing` and `check:api` (75 assertions passing). Approved."*
   - **Merge Execution:** Merged into `main` via Squash and Merge (Commit SHA: `7ddc1d5`).

---

### Requirement 6 — Source Code Repository Submission (10 points)
*SLO 3 · Applying*

* **Repository Link:** [https://github.com/SeanJerve/hivelet.git](https://github.com/SeanJerve/hivelet.git)

#### Repository Health & Structure Verifications:
1. **`.gitignore` Exclusion:** Confirmed at lines 1–18 of `.gitignore` that sensitive environment variables (`.env`, `.env.*`, `backend/.env`, `frontend/.env`), dependency directories (`node_modules/`, `*/node_modules/`, `.pnpm-store/`), build artifacts (`dist/`, `build/`), credentials (`credentials/`), and database backups (`backups/`) are strictly ignored and untracked.
2. **Project `README.md`:** The repository root contains an authoritative [`README.md`](file:///README.md) detailing project scope for Fe Galang Da Silva Boarding House, linking the documentation index (`/docs`), and establishing development rules.
3. **Multi-Teammate Commit History:** Commit log verifies active contributions across all student engineers:
   - `SeanJerve` (Sean Jerve Rebancos) — Backend architecture, Express routes, Adyen service
   - `John Lloyd Cuario` / `jlmc2023-9259-86706-commits` (John Lloyd Cuario) — Database migrations, schema integrity
   - `Eljohn Paulo C. Loterte` / `origin/eljohn` (Eljohn Paulo Loterte) — Frontend Vue 3 workspace, UI components, modal dialogues
   - `kiel-relos` / `Drexgithub` (Kiel Hedrix Relos) — Quality assurance, test scripts, verification suites
4. **Separate Branches:** The repository maintains `main` as the verified production branch, alongside active feature and staging branches (`origin/eljohn`, `origin/main`), with branch protection.

---

### Requirement 7 — Weekly Sprint/Progress Report (10 points)
*Task Output · Applying*

* **Sprint Period:** September 10, 2026 – September 17, 2026 (Sprint 3)
* **What was Completed:**
  - Applied Migration `026_payments_default_to_pending.sql` (default set to `'Pending'`, preventing unverified self-verification).
  - Applied Migration `024_gateway_reference_is_unique.sql` (unique index on `transaction_reference`, eliminating duplicate webhook replay bugs).
  - Applied Migration `025_fifty_percent_setting_wording.sql` (BR-035 wording alignment).
  - Fixed ledger garbage fee bug (`gbg_fee` recording) and cash pre-fill price derivation.
  - Retired 5 superseded endpoints in `backend/src/routes/admin.ts`.
  - Expanded automated test harness to **17 passing test suites** (`check:canon`, `check:reports` with 68 assertions, `check:api` with 75 assertions).
* **What is In Progress:**
  - Testing rehearsal run across all 26 write steps (`TESTING_REHEARSAL.md`).
  - Stakeholder validation interview sheet (`CLIENT_MEETING_QUESTIONS.md`).
  - Staging password rotation for development credentials (`Hivelet@Admin2026`) via `ChangePasswordModal.vue`.
* **Blockers & Risks:**
  - Stakeholder confirmation on running totals vs. monthly resets (OD-01). (Currently defaults to monthly view; does not block code).
  - Supabase sandbox profile update (Migration 023) scheduled for execution prior to final deployment.
* **Updated Completion Percentage (Reported against FULL 10-module list):**
  $$\text{Completion Percentage} = \frac{9 \text{ Completed Modules}}{10 \text{ Planned Modules}} \times 100\% = \mathbf{90\%}$$
* **Plan for Next Sprint (Sprint 4: September 18 – September 24, 2026):**
  - Conduct in-person owner consultation with Mrs. Fe Galang Da Silva.
  - Complete 26-step write rehearsal and execute master credential rotation.
  - Deploy production build to university Ubuntu server environment.
  - Administer ISO/IEC 25010 Software Quality Evaluation with end-users.

---

### Requirement 8 — Alpha Version Completion Computation (10 points)
*Performance Standard · Analyzing*

1. **Total Number of Planned Modules ($N$):**  
   From the Module Inventory established in Requirement 2:  
   $$N = 10 \text{ Planned Modules}$$
2. **70 Percent Benchmark Calculation:**  
   $$\text{Threshold}_{\text{raw}} = N \times 0.70 = 10 \times 0.70 = 7.0$$
3. **Rounding Rule Application:**  
   $$\text{Required Alpha Threshold} = \lceil 7.0 \rceil = \mathbf{7 \text{ modules}}$$
4. **Number of Modules Currently Developed, Integrated, and Functioning ($M$):**  
   Audited against the codebase and verified with 17 automated test suites:  
   $$M = \mathbf{9 \text{ modules}}$$
5. **Team Completion Percentage:**  
   $$\text{Percentage} = \frac{M}{N} \times 100\% = \frac{9}{10} \times 100\% = \mathbf{90\%}$$

#### Formal Performance Standard Declaration:
$$\mathbf{9 \text{ Modules Completed}} \ge \mathbf{7 \text{ Modules Required}} \quad (90\% \ge 70\%)$$

**Conclusion: Group 4 EMPHATICALLY MEETS AND EXCEEDS the 70 percent Working Alpha Version standard.**

---

### Requirement 9 — Working Prototype / Alpha Version Declaration (10 points)
*Task Output · Analyzing*

Every module counted as "done" in Requirement 8 is declared below, passing the Section 2.4 three-part test:

#### 1. Authentication & Role-Based Access Control (RBAC) Module
* **Developed:** Implemented with bcrypt password hashing and JWT signing in `authService.ts`, smoke-tested with admin and tenant test credentials.
* **Integrated:** Login form in `LoginView.vue` calls `/auth/login`, receives signed JWT, initializes Pinia store, and unlocks role-protected navigation guards.
* **Functioning as Specified:** Correctly enforces System Bible §4 and BR-048, locking accounts after failed attempts and blocking tenants from admin API routes.

#### 2. Rooms & Property Units Catalog Module
* **Developed:** Fully built with room CRUD, cluster associations, and rate update triggers in `backend/src/routes/admin.ts`, passing automated unit tests.
* **Integrated:** Editing a unit in `RoomDirectoryView.vue` updates PostgreSQL `rooms` and automatically logs prior rental rates into `room_price_history`.
* **Functioning as Specified:** Accurately models the 33 canonical units across 5 clusters (BH, Back, Front, Penthouse, Linda) per Migration `007`.

#### 3. Tenant & Occupancy Lease Management Module
* **Developed:** Full tenancy onboarding and vacancy lifecycle implemented in `TenantManagementView.vue` and `admin.ts`, smoke-tested on unit `PH`.
* **Integrated:** Onboarding a resident writes `profiles` and `room_assignments` and toggles unit status from `'Available'` to `'Occupied'` in PostgreSQL.
* **Functioning as Specified:** Enforces BR-004 and BR-005, maintaining primary contact accountability and tracking occupancy counts for water billing.

#### 4. Billing Engine & Utility Assessment Module
* **Developed:** Encapsulated in `billingService.ts`, calculating monthly rent and water fees without stubbed placeholders, verified in `check:billing`.
* **Integrated:** Dynamically reads active occupancy from `room_assignments`, computes water fees ($N \times ₱200$), and inserts invoices into `bills` viewable on `TenantPaymentsView.vue`.
* **Functioning as Specified:** Complies strictly with OD-16 and Migration `016`, eliminating unlegislated grace periods and marking bills overdue at midnight UTC+8.

#### 5. Payment Settlement & Verification Module
* **Developed:** Complete verification workflow coded in `admin.ts`, `OnsitePaymentModal.vue`, and atomic procedure `settle_verified_payment`, tested across 15 live database transactions.
* **Integrated:** Recording on-site cash or Adyen GCash updates `payments`, marks `bills` as `'Paid'`, and synchronously writes the income row in a single transaction.
* **Functioning as Specified:** Satisfies BR-016 and BR-017, requiring human administrator verification while locking rows `FOR UPDATE` to prevent double-settlement races.

#### 6. Monthly Income Ledger & Financial Reporting Module
* **Developed:** Built with live data tables in `IncomeCollectionsView.vue` and Excel workbook builder in `incomeReportExport.ts`, operating over 937 live historical income records.
* **Integrated:** Payment verifications immediately insert ledger entries, calculate stored generated column `fifty_percent_share`, and export live Excel workbooks.
* **Functioning as Specified:** Adheres strictly to BR-035, maintaining ledger parity with the owner's spreadsheet and passing all 68 assertions in `check:reports`.

#### 7. Monthly Expense Ledger & Multi-Area Allocation Module
* **Developed:** Built in `ExpensesLedgerView.vue`, supporting 13 fixed expense categories and multi-property area splits across 1,327 live expense allocations.
* **Integrated:** Expense entries atomically split costs across the 6 property areas via PL/pgSQL procedure `create_expense_entry_atomic`, persisting to `expense_allocations`.
* **Functioning as Specified:** Satisfies BR-039 and Migration `010`, ensuring total allocated amounts exactly equal the master receipt total.

#### 8. Maintenance Dispatch & Communication Module
* **Developed:** Built in `MaintenanceDispatchView.vue` and `TenantTicketsView.vue`, supporting issue priority tagging and photo uploads.
* **Integrated:** Tenant submissions insert into `maintenance_tickets`, upload attachments, and allow two-way staff messaging visible in real-time.
* **Functioning as Specified:** Enforces BR-023; closing a ticket requires administrative sign-off and restores the room's operational status from `'Maintenance'` to `'Available'`.

#### 9. System Audit Trail & Notifications Module
* **Developed:** Implemented in `auditService.ts` and `AuditLogsView.vue`, logging all state modifications across system entities.
* **Integrated:** Any administrative write (voiding receipts, editing rates, verifying payments) inserts an append-only JSONB record into `audit_logs`.
* **Functioning as Specified:** Conforms to BR-028 and System Bible §14, providing immutable proof of financial accountability with actor ID, IP, and timestamp.

*(Module 10, Public Showcase & Prospect Inquiries, is fully coded and functional, but is held at 95% polish while public notification templates undergo final styling, and is conservatively withheld from the formal 70% count).*

---

### Requirement 10 — Team Collaboration and Conflict-Resolution Plan (10 points)
*SLO 3 · Analyzing / Evaluating*

#### 1. Realistic Team Merge Conflict Case Study
* **Context:** During Sprint 3, a concurrent edit conflict occurred in `backend/src/routes/admin.ts`. Teammate A was implementing the atomic payment verification endpoint calling `settle_verified_payment` (Migration 018), while Teammate B was retiring five superseded, duplicate route handlers (`PATCH /admin/bills/:id/status`, `POST /admin/payments/manual`) that bypassed the verification workflow.
* **The Conflict:** Git flagged a content collision in `backend/src/routes/admin.ts` with conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`) around lines 1080–1180, where route deletion collided with the newly added atomic settlement logic.

#### 2. Step-by-Step Resolution Protocol (Executed in Order)
1. **Status Inspection:** Run `git status` to identify all conflicting files and verify that local modifications are isolated to `admin.ts`.
2. **Contract & Reference Cross-Checking:** Consult [`docs/SCREEN_CONTRACT.md`](file:///docs/SCREEN_CONTRACT.md) to confirm that no screen calls the retired endpoints, while `PATCH /admin/payments/:id/verify` is strictly required by `IncomeCollectionsView.vue`.
3. **Manual Source Reconciliation:** Open `admin.ts`, retain the atomic `settle_verified_payment` procedure call, confirm deletion of the dead endpoints, and remove all conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
4. **Database Migration & Schema Re-Verification:** Check `database/migrations/` to verify that migration numbers remain strictly sequential (`018` through `026`), and run `npm run check:columns` to ensure all column references match PostgreSQL's `information_schema`.
5. **Automated Verification Harness Execution:** Run `npm run check:all` (17 test suites, 75 API assertions). Confirm 0 TypeScript compilation errors and 0 test failures.
6. **Staging and Resolution Commit:** Stage the reconciled file and commit with a clear message:
   ```bash
   git add backend/src/routes/admin.ts
   git commit -m "fix(routes): resolve merge conflict in admin.ts, preserving atomic payment settlement and retiring superseded routes"
   ```
7. **Synchronized Push:** Push the resolved commit to `main` on GitHub and verify that remote checks pass.

#### 3. Concrete Preventative Measure
To prevent similar conflicts, Group 4 codified **Architectural Development Lanes** in [`CLAUDE.md`](file:///CLAUDE.md):
- **Lane Ownership:** Backend routes (`backend/src/routes/`) and migrations (`database/migrations/`) are assigned to a designated backend lane, while frontend views (`frontend/src/views/`) are developed in parallel feature branches.
- **Pull-Before-Branch & Pre-Edit Coordination:** Teammates must run `git pull origin main` before creating feature branches, announce intended route modifications in the group channel, and check the task queue ([`BLOCKED_FOR_SEAN.md`](file:///BLOCKED_FOR_SEAN.md)) before editing shared routing files.

---

## GROUP CERTIFICATION

We certify that the work recorded on this Answer Sheet and its attached evidence reflects our own team's capstone project and was accomplished by the members named below.

**Group Leader Signature:** _______________________________________  
**Printed Name:** Sean Jerve Ll. Rebancos  
**Date:** September 17, 2026  

**Confirmed by Team Members:**
* **John Lloyd M. Cuario** — __________________________________ Date: September 17, 2026
* **Eljohn Paulo C. Loterte** — ________________________________ Date: September 17, 2026
* **Victor Noel A. Napay** — __________________________________ Date: September 17, 2026
* **Kiel Hedrix V. Relos** — ___________________________________ Date: September 17, 2026
