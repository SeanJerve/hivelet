# CLAUDE TASK PROMPT 2: DATABASE ARCHITECTURE, 3NF SCHEMA & ERD
## Context: Capstone Project 2 — System Design Refinement & Database Defense
### Target: Bicol University College of Science (BUCS) | Group 4 (DBA: John Lloyd Cuario)

---

### ROLE & DIRECTIVES FOR CLAUDE
You are the **Lead Database Administrator & Data Architect** for Group 4 (Hivelet), collaborating directly with DBA John Lloyd Cuario.
Your task is to audit, refine, and produce the comprehensive **Database Architecture, Third Normal Form (3NF) Relational Schema, Data Dictionary, and Crow's Foot Entity-Relationship Diagram (ERD)**.

> [!CAUTION]
> **STRICT FRONTEND PROHIBITION:**
> You are working exclusively on the relational schema, SQL migrations, Supabase RLS policies, seed scripts, and database documentation.
> **DO NOT modify, refactor, or generate frontend files (`frontend/`, `website/`).**

---

### BACKGROUND & SOURCE DOCUMENTS
Before analyzing or generating database artifacts, inspect:
1. `docs/01_SYSTEM_BIBLE.md` (33 units, 3 clusters, ₱200/head water, 50% revenue share, 2% rate history, room-centric logic).
2. `docs/05_DATABASE_DESIGN.md` (Active schema documentation).
3. `docs/module_01_submission/03_DATABASE_SCHEMA_AND_DATA_DICTIONARY.md` (Detailed data dictionary and schema breakdown).
4. `database/` directory (Active SQL schema, migrations, and seed scripts).
5. `docs/claude_pipeline/diagrams/reference_dfds/` (Check data stores $D_1$ to $D_6$ in `DFD.png` and ensure all data flows are backed by concrete physical tables).

---

### REQUIRED TASKS FOR CLAUDE

#### 0. Pre-Generation Clarification & Alignment Check (MANDATORY)
> [!IMPORTANT]
> **STOP AND ASK FIRST IF UNCLEAR:**
> Before outputting the final ERD or Data Dictionary:
> - Review all entity definitions, cardinalities, foreign key cascades, and column types.
> - If any relationship, constraint, dynamic parameter (such as water rates or payment references), or attribute is ambiguous or not yet finalized, **initiate a conversation with John Lloyd Cuario (DBA) / the user first**.
> - Outline the questions, suggest standard database modeling options, and obtain alignment before finalizing the ERD or writing schema migrations.

#### 1. 3NF Normalization Audit & Verification
Formally demonstrate that the 20 relational tables satisfy **Third Normal Form (3NF)**:
* **1NF:** All attributes contain atomic scalar values (no repeating groups or multi-valued columns).
* **2NF:** All non-key attributes are fully functionally dependent on the primary key (no partial dependencies on composite keys).
* **3NF:** No non-key attribute is transitively dependent on another non-key attribute (e.g., remaining billing balances or 50% revenue shares are computed via atomic services or dynamic queries rather than stored redundantly).

#### 2. Crow's Foot Entity-Relationship Diagram (ERD) in Mermaid
Generate or update the comprehensive Crow's Foot ERD using Mermaid syntax (`erDiagram`).
Ensure the ERD captures:
1. **Core Domains:**
   - **Identity & RBAC:** `profiles` (Admin, Tenant, System roles, bcrypt hash, failed login lockout).
   - **Property Catalog & Clusters:** `clusters` (Main, Annex A, Annex B), `rooms` (33 units), `room_photos`, `room_price_history` (2% annual adjustment logs).
   - **Tenancy & Leases:** `room_assignments` (active/past leases, move-in/move-out dates, headcount).
   - **Inquiries:** `inquiries`, `inquiry_messages` (public visitor leads, unit preferences, status).
   - **Billing & Settlement:** `bills` (rent + dynamic water charge), `payments` (supports on-site cash and optional Adyen Online GCash, `verification_status` ENUM ('Pending Verification', 'Verified', 'Rejected'), `transaction_reference`, `payment_method`, `payment_source`, `proof_receipt_url`).
   - **Co-Ownership & Financials:** `monthly_income_records` (gross, expenses, net income, 50% co-owner share, water payments, Linda water charges), `fixed_expense_categories` (1..10 standardized categories), `monthly_expense_entries`, `expense_property_allocations`.
   - **Maintenance Operations:** `maintenance_tickets` (priority, status, assigned technician), `ticket_attachments`, `ticket_messages`.
   - **Governance & Dynamic Parameters:** `audit_logs` (immutable event ledger with JSONB state diffs), `system_settings` (dynamic `water_rate_per_occupant` configurable parameter, plus Linda flat rates `linda_lf_water_charge` and `linda_lb_water_charge`).
2. **Exact Crow's Foot Cardinalities:**
   - `||--o{` (One-to-zero-or-many)
   - `||--|{` (One-to-one-or-many)
   - `||--||` (One-to-one)
3. **Primary & Foreign Key Definitions:**
   - Surrogate UUID primary keys (`PK`).
   - Explicit Foreign Keys (`FK`) with defined cascade behaviors (`ON DELETE RESTRICT` for ledgers/bills/payments to prevent accidental deletion of financial history; `ON DELETE CASCADE` for transient photos/attachments).

#### 3. Data Dictionary & Attribute Specifications
Provide the formal data dictionary table for key entities (`rooms`, `bills`, `payments`, `monthly_income_records`, `audit_logs`):
- Field Name
- Data Type & Precision (e.g., `UUID`, `VARCHAR(255)`, `DECIMAL(12,2)`, `TIMESTAMPTZ`, `JSONB`)
- Nullability & Defaults
- Constraints (`CHECK`, `UNIQUE`, `FOREIGN KEY`)
- Business Description & Reference to System Bible (`BR-001` to `BR-007`)

#### 4. Security & RLS Policy Enforcement
Document the database security posture:
- Supabase Row Level Security (RLS) policies ensuring public `anon` key is strictly locked out.
- Express backend accesses data exclusively via `service_role` under strict application-level RBAC.

---

### DELIVERABLE FORMAT
Output your findings with:
1. Complete, copy-pasteable Mermaid `erDiagram` code block.
2. Formatted Markdown tables for the Data Dictionary.
3. 3NF normalization proofs and cardinalities explained in clear academic prose suitable for capstone defense.
