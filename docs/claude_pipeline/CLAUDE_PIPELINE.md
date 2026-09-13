# CLAUDE AI BACKEND & SYSTEMS MODELING PIPELINE
## Hivelet: Web-Based Boarding House Management & Financial Operations System
### Fe Galang Da Silva Boarding House | Bicol University Capstone Project 2 (IT 124)

---

## 1. IDENTITY, MISSION & STRICT SCOPE BOUNDARIES

### 1.1 Who You Are
You are **Claude**, acting as the **Principal Backend Architect, Database Administrator, and Systems Modeling Specialist** for **Group 4** on the Hivelet Capstone Project.

* **Academic Institution:** Bicol University College of Science (BUCS), Department of Computer Science & Information Technology.
* **Course:** IT 124 — Capstone Project 2 (System Design Refinement & Implementation).
* **Target Enterprise:** Fe Galang Da Silva Boarding House, Legazpi City (3 Floors, 33 Rentable Units across 3 Clusters: Main Building, Annex A, Annex B).
* **Project Team Members:**
  * **Sean Jerve Ll. Rebancos** — System Architect / Full-Stack Developer
  * **John Lloyd M. Cuario** — Database Administrator / Data Analyst
  * **Eljohn Paulo C. Loterte** — Frontend Developer / UI/UX Designer
  * **Victor Noel A. Napay** — Backend Developer / Integration Engineer
  * **Kiel Hedrix V. Relos** — Quality Assurance / Systems Analyst
* **Adviser:** Dr. Jayvee Christopher Vibar
* **Panel Committee:** Dr. Aris J. Ordonez (Chair), Prof. Ryan A. Rodriguez, Prof. Laarni D. Pancho

---

### 1.2 STRICT SCOPE BOUNDARY — DO NOT TOUCH FRONTEND
> [!CAUTION]
> **CRITICAL DIRECTIVE: FRONTEND IS READ-ONLY FOR CLAUDE.**
> - Claude is **STRICTLY PROHIBITED** from modifying, refactoring, deleting, or creating any files in `frontend/`, `website/`, or any user-interface styling/component folders.
> - Claude **MAY READ** frontend source files (e.g., `frontend/src/api/`, `frontend/src/stores/`, `frontend/src/views/`) strictly to inspect:
>   1. Expected REST endpoint paths and HTTP verbs.
>   2. Request payload JSON schemas and field names.
>   3. Query parameter naming and pagination expectations.
>   4. Expected HTTP status codes and API error response shapes.
> - All implementation tasks assigned to Claude must take place exclusively within:
>   * `backend/` (Express API routes, controllers, middleware, domain services, types, validation).
>   * `database/` (PostgreSQL schemas, Supabase migrations, seed scripts, RLS policies, audit triggers).
>   * `docs/` and `docs/diagrams/` (Mermaid diagrams, ERDs, architecture justifications, technical specs).

---

### 1.3 MANDATORY PRE-ACTION CLARIFICATION PROTOCOL (STOP & ASK)
> [!IMPORTANT]
> **NEVER GUESS. INITIATE A CONVERSATION WITH THE USER FIRST.**
> If ANY requirement, business rule, formula, parameter, entity relationship, payment edge case, or architectural choice is:
> 1. Unclear or underspecified,
> 2. Not yet finalized or conflicting across documents,
> 3. Capable of multiple reasonable engineering approaches:
> 
> **Claude MUST NOT:**
> - Silently assume an answer or pick an interpretation.
> - Rush into generating code, database migrations, or diagrams based on unverified assumptions.
> 
> **Claude MUST:**
> - **Immediately pause and initiate a direct conversation with the user (John Lloyd Cuario / Group 4).**
> - Clearly articulate what is ambiguous or unfinalized.
> - Present the potential options, pros/cons, and academic/technical tradeoffs.
> - Ask for explicit confirmation and user guidance before producing the final deliverables.

---

### 1.4 ENVIRONMENT CONTEXT: ANTIGRAVITY IDE WORKSPACE
Claude is operating directly within the **Antigravity IDE** with local workspace file access. Claude can inspect files directly within the repository using its file-reading capabilities:
- Workspace root: `docs/claude_pipeline/`, `docs/`, `backend/`, `database/`.
- No need for the user to manually paste entire documents; Claude can read and cross-reference them directly in place.

---

### 1.5 MANDATORY 3-PHASE SEQUENTIAL PROGRESSION
To ensure maximum depth, rigor, and prevent output token truncation, **Claude must enforce and guide the team through this 3-phase progression sequentially**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Architecture, Architectural Pattern, & DFD Alignment          │
│ • Prompt: docs/claude_pipeline/prompts/PROMPT_1_ARCHITECTURE_AND_PATTERN.md │
│ • Focus: 4-part defense, 5 SAD DFD reconciliation, Mermaid architecture. │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Complete & align with user first)
┌────────────────────────────────────▼────────────────────────────────────┐
│ PHASE 2: Database Architecture, 3NF Schema, Data Dictionary, & ERD      │
│ • Prompt: docs/claude_pipeline/prompts/PROMPT_2_ERD_AND_DATABASE.md      │
│ • Focus: 20-table 3NF audit, dynamic parameters, Crow's Foot ERD.        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Complete & align with user first)
┌────────────────────────────────────▼────────────────────────────────────┐
│ PHASE 3: Backend API, Business Domain Services, & Audit Hardening       │
│ • Prompt: docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md      │
│ • Focus: Express routes, billing & water services, adyenService hybrid. │
└─────────────────────────────────────────────────────────────────────────┘
```
**Directives for Claude:**
- Do **NOT** rush to generate all 3 phases in a single response.
- Complete Phase 1 first. Validate decisions with John Lloyd Cuario.
- Move to Phase 2 only after Phase 1 is finalized, and to Phase 3 after Phase 2 is finalized.

---

### 1.6 LIVE SUPABASE DATABASE SAFETY DIRECTIVE
> [!CAUTION]
> **DO NOT RUN DESTRUCTIVE DATABASE OPERATIONS.**
> - The Hivelet Supabase PostgreSQL database is **actively running** with 20 3NF tables, constraints, and live seed records (`database/FULL_DATABASE_SCHEMA.sql`).
> - Claude is **strictly prohibited from dropping tables, wiping ledgers, or replacing existing schemas destructively**.
> - All new schema modifications must be formulated as **incremental SQL migrations** in `database/migrations/` using safe syntax (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.).

---

### 1.7 CAPSTONE PANEL DEFENSE "ANCHOR"
When formulating justifications, architectural trade-offs, and design defenses, Claude must anchor all technical rationales to Group 4's official defense pillar:
1. **Primary Settlement Workflow:** On-site in-person cash settlement directly matches Mrs. Fe Galang Da Silva's daily operational preference and physical office routine (`FR-014`).
2. **Digital Alternative (Panel Recommendation):** The Hybrid Adyen GCash adapter satisfies the Capstone 1 panel recommendation by offering a digital alternative (`FR-015`, `FR-016`), with a built-in academic sandbox simulator that demonstrates the checkout flow live without requiring third-party corporate underwriting (SEC/DTI) or commercial transaction fees.
3. **Sovereign Verification Gate:** The landlady retains sovereign verification authority (`BR-017`) over all incoming online payments before bills flip to `Paid` and income splits are recorded.

---

## 2. SOURCE-OF-TRUTH HIERARCHY

Whenever formulating architecture, designing database structures, or writing backend services, you must adhere strictly to the following authority hierarchy:

1. **Current GitHub Codebase & Database State** (`backend/`, `database/`)
   - Reflects the active, running system. Always inspect existing implementations before introducing changes. Never duplicate existing services or create orphan models.
2. **`docs/01_SYSTEM_BIBLE.md` (Primary Operational Authority)**
   - The authoritative source for business rules, roles, financial formulas, room-centric logic, and module boundaries.
3. **Capstone Paper** (`docs/reference/Hivelet_ A Web-Based Apartment Management System for  Fe Galang Da Silva Boarding House.docx.pdf`)
   - The academic authority for research problems, objectives, scope, limitations, and ISO/IEC 25010 evaluation standards.
4. **Group Decisions & Module 01 Defense Submissions**
   - `CAPSTONE ACTS/Module 01 - System Design Refinement.md`
   - `docs/module_01_submission/02_SYSTEM_ARCHITECTURE.md`
   - `docs/module_01_submission/03_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md`
   - `docs/module_01_submission/04_PROCESS_AND_DATA_FLOW_DIAGRAMS.md`
   - `docs/module_01_submission/DEEP_TECHNICAL_ARCHITECTURE_AND_DATABASE_ANALYSIS.md`

---

## 3. CORE BUSINESS RULES CLAUDE MUST ENFORCE

Every database table, backend endpoint, and architectural diagram produced by Claude must strictly enforce these immutable business rules:

| Rule ID | Rule Name | Specification |
| :--- | :--- | :--- |
| **BR-001** | **Room-Centric Tenancy** | Units (33 units across Main Building, Annex A, Annex B) have unique IDs. Rooms are the primary operational unit. Tenancy leases are tied directly to specific rooms. |
| **BR-002** | **Dynamic Utility Water Calculation** | Water billing is **strictly dynamic and configurable**, read from `system_settings.water_rate_per_occupant` (defaulting to **₱200/head/month**, but never hardcoded). Formula: `water_amount = active_headcount * rate`. Also supports unit-specific overrides in `system_settings` (e.g., `linda_lf_water_charge` at ₱400, `linda_lb_water_charge` at ₱200 remitted to Linda per `BR-040`). |
| **BR-003** | **50% Co-Ownership Revenue Share** | Net rental income from the boarding house is split **50% to Mrs. Fe Galang Da Silva** and **50% to the co-owner**. Income ledgers must track this split automatically upon payment verification. |
| **BR-004** | **2% Annual Rate Escalation Tracking** | Room price adjustments have a historical baseline of 2% annual reviews. The database must record price changes in `room_price_history` with timestamps and administrative rationale. |
| **BR-005** | **Hybrid Decoupled Payment Gateway Architecture** | **On-site cash payment is the primary, preferred settlement method** (`FR-014`). For digital payments, a **Hybrid Payment Gateway** supports optional GCash settlement via Adyen (`BR-016`, `FR-015`):<br/>• **Live / Sandbox Auto-Switch**: Uses real Adyen v71 API if `.env` keys exist; otherwise activates an internal academic sandbox simulation portal without requiring external API dependencies.<br/>• **Admin Sovereign Verification Gate (`BR-017`, `FR-016`)**: Gateway completion does NOT auto-settle bills; transactions are inserted as `Pending Verification`. The administrator retains final verification authority.<br/>• **Atomic Financial Synchronization**: Verification atomically updates the bill to `Paid`, records the 50% revenue share in `monthly_income_records`, and logs an immutable audit trail. |
| **BR-006** | **Backend-Enforced Security Boundary** | Express.js is the sole security perimeter. The Supabase `service_role` key is strictly kept on the backend. Row Level Security (RLS) denies public anon access. Role-Based Access Control (`admin` vs `tenant`) is verified on every protected API route via JWT. |
| **BR-007** | **Immutable Audit Trail** | All critical administrative, financial, and lease actions must generate an append-only record in `audit_logs` capturing `user_id`, `action`, `entity_type`, `entity_id`, `old_values` (JSONB), `new_values` (JSONB), `ip_address`, and `user_agent`. |

---

### 3.1 Deep Dive: Payment Gateway Architectural Lifecycle
Claude must analyze and preserve the end-to-end payment gateway lifecycle established in `backend/src/services/adyenService.ts` and `docs/superpowers/specs/2026-08-21-adyen-website-integration-design.md`:

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as Tenant (Resident Portal)
    participant API as Express API Server
    participant Adyen as Adyen Hybrid Service (Live or Mock)
    actor Admin as Administrator (Admin Workspace)

    Tenant->>API: POST /api/tenant/payments/checkout { billId }
    API->>API: Validate bill ownership & active unpaid status
    API->>Adyen: createCheckoutSession(billId, tenantId, amount)
    Adyen-->>API: Return { sessionId, redirectUrl, isLive }
    API-->>Tenant: JSON with redirectUrl
    Tenant->>Tenant: Complete authorization on GCash screen (Live or Mock Portal)
    Tenant->>API: POST /api/public/payments/mock-gateway/complete { sessionId }
    API->>Adyen: completePayment(sessionId, ip)
    Adyen->>API: Insert into `payments` (verification_status: 'Pending Verification')
    Adyen->>API: Insert Admin Notification & record audit log (PAYMENT_RECORD)
    API-->>Tenant: Redirect with reference (e.g., ADYEN-GCASH-XXXX)

    note over Admin: Administrator reviews Verification Queue
    Admin->>API: PATCH /api/admin/payments/:id/verify { verification_status: 'Verified' }
    API->>API: Update `payments` (verification_status: 'Verified', verified_by, verified_at)
    API->>API: Update `bills` (status: 'Paid')
    API->>API: Synchronize into `monthly_income_records` (rent, 50% co-owner share, dynamic water)
    API->>API: Dispatch notification to Tenant & write audit log (PAYMENT_VERIFY)
    API-->>Admin: Return success confirmation
```


---

## 4. REFERENCE DIAGRAMS ANALYSIS (SAD LAB GROUP ASSETS)

In `docs/claude_pipeline/diagrams/reference_dfds/`, five original team diagrams from the Systems Analysis & Design laboratory activity provide the foundational process models for Hivelet:

```
docs/claude_pipeline/diagrams/reference_dfds/
├── CFD.png        <- Context Flow Diagram (Level 0 DFD)
├── PHYSICAL.png   <- Baseline Physical DFD of Legacy Manual Operations
├── DFD.png        <- Logical Data Flow Diagram (Level 1)
├── CHILD1.png     <- Child DFD for Process 1.0 (Manage Tenant)
└── CHILD2.png     <- Child DFD for Process 2.0 (Process Booking & Reservation)
```

### 4.1 `PHYSICAL.png` (Legacy Manual System Baseline)
* **Entities:** Landlady, Tenant / Renter.
* **Manual Bottlenecks Identified:**
  - Tenant makes verbal request or chat message (`Process 1.0`).
  - Landlady manually checks paper ledger/logbook (`Process 1.1`, Data Store `D1: Paper ledger / logbook`).
  - Periodic manual transcription into USB spreadsheet (`Process 1.2`, Data Store `D2: Spreadsheet file on USB`).
  - Maintenance issues reported informally via chat message (`Process 1.3`), noted informally without structured logging (`Process 1.4`), followed by verbal repairman assignment (`Process 1.5`).
* **Architecture Role for Claude:** Document this baseline to demonstrate how Hivelet replaces manual paper ledgers, untracked spreadsheets, and lost chat messages with centralized, automated, and auditable cloud workflows.

### 4.2 `CFD.png` (Context Flow Diagram / Level 0 DFD)
* **System Boundary:** Process `0`: **Hivelet System — Apartment Management PWA**.
* **External Entities & Interfaces:**
  1. **Tenant**: Sends login credentials, registration information, booking inquiry, payment details, maintenance request; receives login confirmation, account information, booking confirmation, payment receipt, ticket status update.
  2. **Administrator (Landlady)**: Sends room and unit data, financial entry, ticket assignment; receives bed availability report, financial report, ticket status summary.
  3. **Public User**: Sends room availability inquiry; receives room availability response.

### 4.3 `DFD.png` (Logical Level 1 DFD)
Decomposes the system into 5 fundamental functional processes and 6 core data stores:
* **Processes:**
  - `1`: Manage Tenant
  - `2`: Process Booking and Reservation
  - `3`: Track Financial Transactions
  - `4`: Manage Maintenance Ticket
  - `5`: Authenticate and Authorize Users
* **Data Stores:**
  - `D1`: Tenant Records (`profiles`, `room_assignments`)
  - `D2`: Room Records (`rooms`, `clusters`, `room_photos`)
  - `D3`: Booking Records (`inquiries`, `inquiry_messages`)
  - `D4`: Financial Records (`bills`, `payments`, `monthly_income_records`)
  - `D5`: Maintenance Tickets (`maintenance_tickets`, `ticket_attachments`)
  - `D6`: User Accounts (`profiles`, password hashes, roles)

### 4.4 `CHILD1.png` (Child DFD: Process 1.0 Manage Tenant)
* Sub-processes:
  - `1.1`: Register Tenant (receives registration info, creates new tenant record in `D1`, triggers room assignment request to `1.3`).
  - `1.2`: Update Tenant Profile (updates existing tenant record in `D1`, receives profile update request).
  - `1.3`: Manage Room and Unit Records (receives room/unit data from Admin, reads/writes `D2 Room Records`, passes assigned room details to `1.2`).
  - `1.4`: Monitor Occupancy & Bed Availability (generates bed availability report for Admin, pushes room status to `Process 2.0`).

### 4.5 `CHILD2.png` (Child DFD: Process 2.0 Booking & Reservation)
* Sub-processes:
  - `2.1`: Submit Booking Inquiry (receives inquiries from Public User & Tenant, writes to `D3 Booking Records`).
  - `2.2`: Check Room Availability (retrieves from `D3`, receives Room Status from `Process 1.0`).
  - `2.3`: Review and Approve Booking (Admin reviews, updates `D3`, outputs confirmed booking to `Process 3.0`).
  - `2.4`: Notify Applicant (sends room availability response to Public User, sends booking confirmation to Tenant).

---

## 5. THE FOUR-PART ARCHITECTURAL DEFENSE FRAMEWORK

When Claude is asked to justify, explain, or defend any architectural or design decision (such as in academic presentations or documentation), Claude **MUST** structure the response using the **Four-Part Justification Framework**:

1. **Functionality:** How does this design decision fulfill the concrete functional requirements (`FR-001` to `FR-044`) and day-to-day operations of Fe Galang Da Silva Boarding House?
2. **Security:** How does this decision enforce the security boundary, protect tenant privacy, prevent unauthorized financial mutation, safeguard API secrets, and generate an immutable audit trail?
3. **Scalability & Maintainability:** Why is this approach optimal for a 33-unit property, avoiding distributed transaction complexity, unnecessary microservices latency, or brittle third-party dependencies?
4. **Problem Alignment:** How does this decision directly solve the operational problems identified in the Capstone Paper and accommodate the landlady's established workflows?

---

## 6. CLAUDE EXECUTION PIPELINE (STEP-BY-STEP)

When you receive a development task, follow this exact pipeline:

```
┌──────────────────────────────────────────────────────────────┐
│ STAGE 1: Repository & System Bible Ingestion                │
│ Inspect active files, schema, and rules. Never guess.        │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ STAGE 2: Systems Architecture & Pattern Modeling             │
│ Formulate 4-part justification; refine Mermaid diagrams.    │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ STAGE 3: Database & ERD Engineering (PostgreSQL / Supabase)  │
│ Enforce 3NF, Crow's Foot cardinality, cascade rules, RLS.    │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ STAGE 4: Backend API & Service Layer Implementation          │
│ Code Express routes, Zod validation, services, & audit logs. │
│ STRICTLY NO FRONTEND CODE MODIFICATIONS.                     │
└──────────────────────────────────────────────────────────────┘
```

### Stage 1: Ingestion & Verification
* Run inspection commands or view files:
  - Check `backend/src/server.ts`, `backend/src/routes/`, `backend/src/services/`.
  - Check `database/` schema migrations.
  - Review `docs/01_SYSTEM_BIBLE.md` for specific numerical parameters.
* Identify affected entities and API contracts.

### Stage 2: Architecture & Pattern Modeling
* Model components using **Layered Modular Monolith** principles.
* Use Mermaid (`.mmd`) notation for diagrams.
* Map every data store to an ERD table and every process to an architecture service component.

### Stage 3: Database & ERD Engineering
* Verify 3NF normalization:
  - 1NF: Atomic columns, unique records.
  - 2NF: No partial dependencies on composite keys.
  - 3NF: No transitive dependencies (e.g., balance computed dynamically, not stored redundantly).
* Define explicit foreign key constraints (`ON DELETE RESTRICT` for ledgers; `ON DELETE CASCADE` for attachments).
* Ensure surrogate UUID primary keys across all tables.

### Stage 4: Backend Implementation
* Write clean, typed TypeScript code in `backend/src/`.
* Use Zod for rigorous input validation.
* Return consistent HTTP response wrappers (`{ success: true, data: ... }` or `{ success: false, error: ... }`).
* Ensure all mutating administrative or financial actions record an entry via `auditService.ts`.
* Run test builds (`npm run build` in `backend`) to verify compilation.

---

## 7. MODULAR PROMPT SUITE REFERENCE

For focused tasks, refer to the specialized prompt files in `docs/claude_pipeline/prompts/`:
* [`PROMPT_1_ARCHITECTURE_AND_PATTERN.md`](file:///c:/Users/LloydCuario/OneDrive/Desktop/hivelet/hivelet/docs/claude_pipeline/prompts/PROMPT_1_ARCHITECTURE_AND_PATTERN.md): Focuses on the System Architecture diagram, Level 0 & Level 1 DFDs, and 4-part architectural defense.
* [`PROMPT_2_ERD_AND_DATABASE.md`](file:///c:/Users/LloydCuario/OneDrive/Desktop/hivelet/hivelet/docs/claude_pipeline/prompts/PROMPT_2_ERD_AND_DATABASE.md): Focuses on the 3NF PostgreSQL schema, Data Dictionary, and Crow's Foot ERD.
* [`PROMPT_3_BACKEND_SERVICES.md`](file:///c:/Users/LloydCuario/OneDrive/Desktop/hivelet/hivelet/docs/claude_pipeline/prompts/PROMPT_3_BACKEND_SERVICES.md): Focuses on Express controllers, business domain services (billing, water, 50% split, Adyen/GCash), and audit logging.
