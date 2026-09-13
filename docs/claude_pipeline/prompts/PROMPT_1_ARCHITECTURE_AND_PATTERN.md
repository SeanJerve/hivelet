# CLAUDE TASK PROMPT 1: ARCHITECTURAL PATTERN & SYSTEM ARCHITECTURE
## Context: Capstone Project 2 — System Design Refinement & Defense
### Target: Bicol University College of Science (BUCS) | Group 4

---

### ROLE & DIRECTIVES FOR CLAUDE
You are the **Principal Systems Architect** for Group 4 (Hivelet).
Your task is to analyze, finalize, and defend Hivelet's **System Architecture**, **Architectural Pattern**, and **Data Flow Diagrams (DFDs)**.

> [!CAUTION]
> **STRICT FRONTEND PROHIBITION:**
> You are working purely on system architecture, backend service design, and database modeling.
> **DO NOT modify, refactor, or generate frontend files (`frontend/`, `website/`).**

---

### BACKGROUND & SOURCE DOCUMENTS
Before answering or generating artifacts, examine the following source documents:
1. `docs/01_SYSTEM_BIBLE.md` (System rules, 33 units, 3 clusters, ₱200/head water, 50% split).
2. `docs/04_ARCHITECTURE.md` (Current architectural baseline).
3. `docs/module_01_submission/02_SYSTEM_ARCHITECTURE.md` & `DEEP_TECHNICAL_ARCHITECTURE_AND_DATABASE_ANALYSIS.md` (Engineering tradeoffs & defense).
4. `CAPSTONE ACTS/Module 01 - System Design Refinement.md` (Panel recommendations and Module 01 exam questions).
5. The 5 reference DFD images in `docs/claude_pipeline/diagrams/reference_dfds/`:
   - `PHYSICAL.png` (Legacy manual baseline: paper ledgers, USB spreadsheets, verbal requests).
   - `CFD.png` (Context Flow Diagram: Process 0.0 with Tenant, Administrator, and Public User).
   - `DFD.png` (Level 1 DFD: Processes 1 to 5, Data Stores D1 to D6).
   - `CHILD1.png` (Process 1.0 Child DFD: Registration, Profile Update, Room & Unit management, Occupancy).
   - `CHILD2.png` (Process 2.0 Child DFD: Inquiry submission, Availability check, Review/Approve, Notification).

---

### REQUIRED TASKS FOR CLAUDE

#### 0. Pre-Generation Clarification & Alignment Check (MANDATORY)
> [!IMPORTANT]
> **STOP AND ASK FIRST IF UNCLEAR:**
> Before outputting the final architecture diagram or defense:
> - Review all incoming requirements and source files.
> - If any architectural tier, external integration boundary, payment adapter state, or requirement is ambiguous, unfinalized, or conflicting, **initiate a conversation with the user immediately**.
> - Present the ambiguity clearly along with available design options and tradeoffs, and ask for the user's guidance before generating the finalized deliverables.

#### 1. Architectural Pattern Formalization & 4-Part Defense
Formalize Hivelet's pattern: **Layered Client-Server Architecture Structured as a Modular Monolith with Pluggable Gateway Adapter**.
Provide the complete academic defense structured strictly across the **Four-Part Justification Framework**:
* **Functionality:** Support for 33 units, **dynamic utility water calculation** (configurable via `system_settings`, defaulting to ₱200/head, avoiding rigid hardcoded business rules), 50% revenue share split, multi-cluster management, and on-site cash recording alongside optional GCash via Adyen.
* **Security:** Express backend security perimeter, Supabase `service_role` containment, RLS lockdown against anon key, bcrypt JWT authentication, role guards (`requireRole('admin')`), sovereign admin payment verification gate (`BR-017` / `FR-016`), and immutable audit logging.
* **Scalability & Tradeoffs:** Defend why a **Modular Monolith** is superior to microservices for a 33-unit property (eliminates distributed 2-phase commits, network latency, and operational overhead while maintaining atomic ACID database transactions for billing, payment verification, and revenue splits).
* **Problem Alignment:** Resolves the manual logbook and USB spreadsheet vulnerabilities from `PHYSICAL.png`, supports the landlady's primary cash preference, and integrates a **Hybrid Payment Gateway** (auto-switching between live Adyen v71 API and a local academic sandbox simulator) without business underwriting delays or vendor lock-in.


#### 2. Mermaid Architecture Diagram Update
Generate or refine the complete Mermaid architecture diagram (`graph TB`) covering:
1. **Tier 1: Presentation Tier (PWA & Client SPA)** (Read-only offline cache, Tenant Portal, Admin Control Center, Public Directory).
2. **Tier 2: API & Security Boundary (Node.js / Express)** (Helmet, CORS, JWT Validator, Route Controllers).
3. **Tier 3: Domain Service Layer (Modular Monolith)** (Billing & Share Service, Payment Verification Service, Occupancy Service, Ticketing Service, Inquiry Service, Audit Trail Service).
4. **Tier 4: Data Persistence Tier (PostgreSQL / Supabase)** (3NF normalized tables: `rooms`, `profiles`, `bills`, `payments`, `monthly_income_records`, `audit_logs`).
5. **Tier 5: External Integration Layer** (Decoupled Adyen sandbox/live adapter, Supabase Storage for room & ticket media).

#### 3. DFD Traceability Reconciliation
Demonstrate 100% traceability between:
- Every data store in `DFD.png` ($D_1$ to $D_6$) and the modernized 12 data stores in `docs/diagrams/hivelet_dfd_level1.mmd` to the exact physical tables in PostgreSQL.
- Every process in `DFD.png` (1.0 to 5.0) and Level 1 DFD (1.0 to 6.0) to its corresponding backend service in `backend/src/services/`.

---

### DELIVERABLE FORMAT
Output your analysis with:
1. Clear markdown headings and summary tables.
2. Complete, valid Mermaid code blocks (`mermaid ... `).
3. Specific references to requirements (`FR-001` to `FR-044`, `BR-001` to `BR-007`).
